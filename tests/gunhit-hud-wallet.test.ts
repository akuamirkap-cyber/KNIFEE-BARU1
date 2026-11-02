import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { installCanvasShim } from './supportCanvas';
import { installSilentAudio } from '../tools/supportAudioSilent';

installCanvasShim();
const g = globalThis as unknown as Record<string, unknown> & { window: Record<string, unknown> };
g.window = Object.assign(g.window ?? {}, {
  setTimeout,
  clearTimeout,
  setInterval: () => 0,
  clearInterval: () => undefined,
  addEventListener: () => undefined,
  removeEventListener: () => undefined,
  devicePixelRatio: 1,
  innerWidth: 420,
  innerHeight: 750,
  matchMedia: () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} }),
});
installSilentAudio();

interface DrawnText { text: string; x: number; y: number; font: string }

const px = (font: string) => Number(/(\d+(?:\.\d+)?)px/.exec(font)?.[1] ?? 0);

/** Renders one frame and reports every text the HUD painted, plus coin clocks. */
function probe(levelN: number, coinsValue = 42) {
  return import('../src/games/gunhit/game/Game').then(({ Game }) => {
    const texts: DrawnText[] = [];
    const coins: number[] = [];
    const state = { font: '' };
    const ctx = new Proxy({} as Record<string, unknown>, {
      get(target, prop: string) {
        if (prop === 'measureText') return (s: string) => ({ width: String(s).length * px(state.font) * 0.55 });
        if (prop === 'createLinearGradient' || prop === 'createRadialGradient') return () => ({ addColorStop: () => {} });
        if (prop === 'canvas') return canvas;
        return (...args: unknown[]) => {
          if (prop === 'strokeText' || prop === 'fillText') {
            texts.push({ text: String(args[0]), x: Number(args[1]), y: Number(args[2]), font: state.font });
          }
          return undefined;
        };
      },
      set(_t, prop: string, value) {
        if (prop === 'font') state.font = String(value);
        return true;
      },
    }) as unknown as CanvasRenderingContext2D;
    const canvas = {
      width: 420,
      height: 750,
      style: {},
      getContext: () => ctx,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 420, height: 750 }),
    } as unknown as HTMLCanvasElement;

    const game = new Game(canvas, { onGameOver: () => {} });
    const internal = game as unknown as Record<string, unknown> & {
      render: () => void;
      startAtLevel: (n: number) => void;
    };
    internal.startAtLevel(levelN);
    internal.state = 'play';
    internal.score = 7777;
    internal.coins = coinsValue;
    internal.coinPulse = 0;
    internal.time = 3.25;
    internal.drawCoin = (_c: unknown, t: number) => { coins.push(t); };
    texts.length = 0;
    internal.render();
    game.destroy();
    return { texts, coins, mode: (internal.level as { mode: string; boss: boolean }).mode, boss: (internal.level as { boss: boolean }).boss };
  });
}

test('HUD wallet: koin kanan atas seukuran skor kiri atas, dan koinnya ikut jam permainan', async () => {
  for (const levelN of [3, 5, 9]) {
    const { texts, coins, mode, boss } = await probe(levelN);
    const score = texts.find((t) => t.text === '7777');
    const wallet = texts.find((t) => t.text === '42');
    assert.ok(score, `level ${levelN}: skor digambar`);
    assert.ok(wallet, `level ${levelN}: jumlah koin digambar`);
    assert.equal(
      px(String(wallet!.font)),
      px(String(score!.font)),
      `level ${levelN} (${boss ? 'boss' : mode}): font koin = font skor`,
    );
    // The counter is right-aligned inside the canvas and leaves room for the
    // spinning coin sprite to its right (17.5 px radius + 8 px margin).
    assert.ok(wallet!.x <= 420 - 40, `level ${levelN}: jumlah koin tidak menabrak tepi kanan`);
    assert.ok(wallet!.x > 300, `level ${levelN}: jumlah koin tetap di sudut kanan`);
    // drawCoin receives the run clock, not a frozen 0 (that is what made the
    // icon look stuck).
    assert.ok(coins.length > 0, `level ${levelN}: koin HUD digambar`);
    assert.ok(
      coins.some((t) => Math.abs(t - 3.25) < 1e-6),
      `level ${levelN}: koin HUD memakai this.time (${coins.join(', ')})`,
    );
  }
});

test('HUD wallet: dompet panjang menyusut agar tidak menabrak bar HP / timer', async () => {
  const { texts, coins } = await probe(5, 98765);
  const wallet = texts.find((t) => t.text === '98765');
  const score = texts.find((t) => t.text === '7777');
  assert.ok(wallet && score);
  const size = px(String(wallet!.font));
  assert.ok(size > 0 && size <= px(String(score!.font)), 'font koin menyusut, tidak membesar');
  const width = 5 * size * 0.55;
  assert.ok(wallet!.x - width >= 316, `angka koin (kiri ${Math.round(wallet!.x - width)} px) tetap kanan bar HP (316 px)`);
  assert.ok(coins.some((t) => Math.abs(t - 3.25) < 1e-6), 'koin tetap dianimasikan saat dompet panjang');
});

test('Halaman Armory & Achievement memakai ukuran mata uang yang sama dengan menu', () => {
  const read = (p: string) => fs.readFileSync(path.join(process.cwd(), p), 'utf8');
  const menu = read('src/games/gunhit/App.tsx');
  const arsenal = read('src/games/gunhit/components/Arsenal.tsx');
  const quests = read('src/games/gunhit/components/QuestModal.tsx');

  // The menu HUD is the reference: coin 25 px / text-xl, diamond 24 px / text-lg.
  assert.ok(menu.includes('<CoinSprite size={25}') && menu.includes('<DiamondSprite size={24}'));
  for (const [name, src] of [['Arsenal', arsenal], ['QuestModal', quests]] as const) {
    assert.ok(src.includes('<CoinSprite size={25}'), `${name}: coin 25 px seperti menu`);
    assert.ok(src.includes('<DiamondSprite size={24}') || src.includes('<DiamondSprite size={24} className'),
      `${name}: diamond 24 px seperti menu`);
    assert.ok(/text-xl[^"]*tabular-nums/.test(src) || /tabular-nums[^"]*text-xl/.test(src),
      `${name}: angka coin memakai text-xl seperti menu`);
  }
});
