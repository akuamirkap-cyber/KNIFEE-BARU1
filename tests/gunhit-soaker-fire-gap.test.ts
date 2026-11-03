import test from 'node:test';
import assert from 'node:assert/strict';
import { installCanvasShim } from './supportCanvas';
import { installSilentAudio } from '../tools/supportAudioSilent';
import { getWeapon } from '../src/games/gunhit/game/weapons';

installCanvasShim();
const env = globalThis as unknown as Record<string, unknown> & { window: Record<string, unknown> };
env.window = Object.assign(env.window ?? {}, {
  setTimeout, clearTimeout, setInterval: () => 0, clearInterval: () => undefined,
  addEventListener: () => undefined, removeEventListener: () => undefined,
  devicePixelRatio: 1, innerWidth: 760, innerHeight: 420,
});
installSilentAudio();
const gradient = { addColorStop: () => undefined };
const ctx = new Proxy({ canvas: { width: 760, height: 420 }, globalAlpha: 1 } as Record<string, unknown>, {
  get(target, prop) {
    const n = String(prop);
    if (n === 'canvas' || n === 'globalAlpha') return target[n];
    if (n === 'createLinearGradient' || n === 'createRadialGradient' || n === 'createPattern') return () => gradient;
    if (n === 'measureText') return () => ({ width: 8 });
    if (n === 'getImageData') return () => ({ data: new Uint8ClampedArray(4) });
    return () => undefined;
  },
  set(t, p, v) { t[String(p)] = v; return true; },
}) as unknown as CanvasRenderingContext2D;
const canvas = {
  width: 760, height: 420, style: {}, getContext: () => ctx,
  addEventListener: () => undefined, removeEventListener: () => undefined,
  getBoundingClientRect: () => ({ left: 0, top: 0, width: 760, height: 420 }),
};
const { Game } = await import('../src/games/gunhit/game/Game.ts');

/** A portrait game already in play with the super soaker in hand. */
function soakerGame() {
  const game = new Game(canvas as never, { onGameOver(){}, onStageChange(){}, onStageCleared(){}, onShotFired(){}, onBossDefeated(){} } as never) as any;
  game.setOrientation('portrait');
  game.active = true;
  game.startAtLevel(1);
  for (let i = 0; i < 400 && game.state !== 'play'; i++) game.update(1 / 60);
  assert.equal(game.state, 'play');
  game.setWeapon('soaker');
  game.ammoLeft = 200;
  return game;
}

test('super soaker punya jeda nyata di tiap tembakan', () => {
  const w = getWeapon('soaker');
  assert.ok(w.auto, 'soaker tetap bisa disemprot dengan menahan');
  assert.ok(w.cooldown >= 0.26, `jeda soaker ${w.cooldown}s terlalu rapat; minimal 0,26 s`);
  assert.ok(w.cooldown <= 0.5, `jeda soaker ${w.cooldown}s terlalu lambat untuk senjata semprot`);
  // Label laju di kartu senjata ikut turun, bukan tetap bintang 5.
  assert.ok(w.stats.rate <= 3, 'bintang RATE harus mencerminkan jeda baru');
});

test('menahan pelatuk soaker hanya menembak beberapa kali per detik', () => {
  const game = soakerGame();
  const times: number[] = [];
  let t = 0;
  const origShoot = game.shoot.bind(game);
  game.shoot = () => {
    const before = game.cooldown;
    origShoot();
    // A round really left the barrel when the cooldown was just re-armed.
    if (game.cooldown > before + 0.05) times.push(t);
  };
  game.holding = true;
  const step = 1 / 120;
  for (let i = 0; i < 120; i++) { // one second
    game.ammoLeft = 200;
    game.update(step);
    t += step;
  }
  game.holding = false;
  assert.ok(times.length >= 3, `soaker harus tetap menyemprot, dapat ${times.length} tembakan/detik`);
  assert.ok(times.length <= 5, `soaker terlalu cepat: ${times.length} tembakan/detik`);
  for (let i = 1; i < times.length; i++) {
    assert.ok(times[i] - times[i - 1] >= 0.26, `jeda antar tembakan ${(times[i] - times[i - 1]).toFixed(3)}s terlalu pendek`);
  }
});

test('tap beruntun tidak bisa melewati jeda soaker', () => {
  const game = soakerGame();
  game.cooldown = 0;
  game.shoot();
  const armed = game.cooldown;
  assert.ok(armed >= 0.26, `setelah satu tembakan cooldown harus ${armed}s`);
  const rounds = game.projs.length;
  // Tiga tap cepat di frame yang sama tidak menambah satu butir pun.
  game.shoot();
  game.shoot();
  game.shoot();
  assert.equal(game.projs.length, rounds, 'tap beruntun harus ditahan jeda');
});
