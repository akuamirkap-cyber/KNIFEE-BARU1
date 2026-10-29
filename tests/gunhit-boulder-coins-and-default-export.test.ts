import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { installCanvasShim } from './supportCanvas';
import { installSilentAudio } from '../tools/supportAudioSilent';
import { Game } from '../src/games/gunhit/game/Game';
import { WEAPONS } from '../src/games/gunhit/game/weapons';
import {
  UNIQUE_EDITABLE_WEAPONS,
  clearAllMarkedGunDefaults,
  formatWeaponDefaultsExport,
  getGunEffect,
  getGunEffectOptions,
  getGunSkinAndEffectPosition,
  getGunVariant,
  getGunVariantOptions,
  getMarkedGunDefault,
  getWeaponDefaultExportEntries,
  isCurrentSelectionMarkedDefault,
  isGunDefaultMarked,
  markGunDefault,
  setGunEffect,
  setGunVariant,
  unmarkGunDefault,
} from '../src/games/gunhit/game/art/gunVariants';

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
});
installSilentAudio();

function makeMockCanvas() {
  const calls: string[] = [];
  const grad = { addColorStop: () => {} };
  const ctx = new Proxy(
    {},
    {
      get: (_t, prop) => {
        if (
          prop === 'createLinearGradient' ||
          prop === 'createRadialGradient' ||
          prop === 'createConicGradient'
        ) {
          return () => grad;
        }
        if (prop === 'measureText') return () => ({ width: 24 });
        if (prop === 'getTransform') return () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 });
        return (...args: unknown[]) => {
          if (prop === 'drawImage' || prop === 'arc') {
            calls.push(`${String(prop)}:${args.length}`);
          }
        };
      },
      set: () => true,
    },
  );
  const canvas = {
    width: 420,
    height: 750,
    style: {},
    getBoundingClientRect: () => ({ width: 420, height: 750, left: 0, top: 0 }),
    getContext: () => ctx,
    addEventListener: () => {},
    removeEventListener: () => {},
  };
  return { canvas: canvas as unknown as HTMLCanvasElement, calls };
}

test('Diamond boulder stage restores coins stuck on the rock and collects them on shot or chunk shatter', () => {
  const { canvas } = makeMockCanvas();
  const game = new Game(canvas, {}) as unknown as {
    startSpecialStage: (mode: 'boulder' | 'bonus' | 'treasure') => void;
    level: { mode: string; radius: number };
    state: string;
    rot: number;
    coins: number;
    score: number;
    targetY: number;
    bonusCoins: { angle: number; radius: number; lx: number; ly: number; taken: boolean }[];
    rock: { remaining: number; shatterAll: () => { id: number; x: number; y: number }[] } | null;
    centerDiamondCollected: boolean;
    stepSpecialProjectile: (p: { x: number; y: number; vx: number; vy: number }) => { res: string };
    detachRockCells: (cells: { id: number; x: number; y: number }[]) => void;
    drawBonusRing: (c: unknown, r: number) => void;
    render: () => void;
  };

  game.startSpecialStage('boulder');
  assert.equal(game.level.mode, 'boulder');
  assert.ok(game.rock, 'boulder stage creates DiamondRock');
  assert.equal(game.bonusCoins.length, 48, 'boulder stage builds all 48 coins stuck on the rock');

  let ringDraws = 0;
  const origDrawRing = game.drawBonusRing.bind(game);
  game.drawBonusRing = (c: unknown, r: number) => {
    ringDraws++;
    return origDrawRing(c, r);
  };
  game.render();
  assert.equal(ringDraws, 1, 'boulder stage renders the rock coin ring');

  // Shooting directly through an untaken coin in boulder collects +2 coins AND still hits the rock underneath.
  game.state = 'play';
  game.rot = 0;
  const sc = game.level.radius / 196;
  const firstCoin = game.bonusCoins[0];
  const shotX = 210 + firstCoin.lx * sc;
  const shotY = game.targetY + firstCoin.ly * sc;
  const startCoins = game.coins;
  const res = game.stepSpecialProjectile({ x: shotX, y: shotY, vx: 0, vy: -2600 });
  assert.equal(res.res, 'hit');
  assert.equal(firstCoin.taken, true, 'coin struck on the boulder is collected');
  assert.ok(game.coins >= startCoins + 2, 'coin awards at least +2 coins');
  assert.equal(game.state, 'play', 'collecting a coin does not prematurely end boulder stage');

  // Shattering the boulder pops & collects any remaining coins attached to broken stone chunks.
  game.centerDiamondCollected = true;
  const broken = game.rock!.shatterAll();
  game.detachRockCells(broken);
  assert.equal(
    game.bonusCoins.every((c) => c.taken),
    true,
    'shattering all rock chunks detaches and collects every remaining coin stuck on the rock',
  );
});

test('per-weapon default skin + effect marking and bulk export work independently across weapons', () => {
  const prevFish = [getGunVariant('fish'), getGunEffect('fish')] as const;
  const prevGolden = [getGunVariant('golden'), getGunEffect('golden')] as const;
  const prevPistol = [getGunVariant('pistol'), getGunEffect('pistol')] as const;

  try {
    clearAllMarkedGunDefaults();

    // User example: Fish Gun has 3 skins & 3 effects -> select skin #2 ('current') and effect #3 ('set7')
    const fishSkins = getGunVariantOptions('fish');
    const fishEffects = getGunEffectOptions('fish');
    assert.equal(fishSkins.length, 3);
    assert.equal(fishEffects.length, 3);

    const markedFish = markGunDefault('fish', fishSkins[1].id, fishEffects[2].id);
    assert.deepEqual(markedFish, { variant: 'current', effect: 'set7' });
    assert.equal(isGunDefaultMarked('fish'), true);
    assert.equal(isCurrentSelectionMarkedDefault('fish'), true);
    assert.deepEqual(getMarkedGunDefault('fish'), { variant: 'current', effect: 'set7' });

    const fishPos = getGunSkinAndEffectPosition('fish');
    assert.equal(fishPos.skinNo, 2);
    assert.equal(fishPos.skinTotal, 3);
    assert.equal(fishPos.effectNo, 3);
    assert.equal(fishPos.effectTotal, 3);

    // Independent settings on other weapons: Golden Gun -> skin #1, effect #1; Pistol -> skin #2, effect #4
    const goldenSkins = getGunVariantOptions('golden');
    const goldenEffects = getGunEffectOptions('golden');
    markGunDefault('golden', goldenSkins[0].id, goldenEffects[0].id);

    const pistolSkins = getGunVariantOptions('pistol');
    const pistolEffects = getGunEffectOptions('pistol');
    markGunDefault('pistol', pistolSkins[1].id, pistolEffects[3].id);

    const markedEntries = getWeaponDefaultExportEntries('marked_only', WEAPONS);
    assert.equal(markedEntries.length, 3);

    const exportMarked = formatWeaponDefaultsExport('marked_only', WEAPONS);
    assert.match(exportMarked, /fish \| .* \| skin=2\/3\(current:Sekarang\) \| efek=3\/3\(set7:Slide 3\) \| ★DEFAULT/);
    assert.match(exportMarked, /golden \| .* \| skin=1\/4\(original:Sebelumnya\) \| efek=1\/2\(original:Sebelumnya\) \| ★DEFAULT/);
    assert.match(exportMarked, /pistol \| .* \| skin=2\/2\(set9:Slide 4\) \| efek=4\/4\(set11:Slide 5\) \| ★DEFAULT/);

    const exportAll = formatWeaponDefaultsExport('all', WEAPONS);
    const allEntries = getWeaponDefaultExportEntries('all', WEAPONS);
    assert.equal(allEntries.length, UNIQUE_EDITABLE_WEAPONS.length);
    assert.ok(exportAll.includes('fish |'));

    unmarkGunDefault('golden');
    assert.equal(isGunDefaultMarked('golden'), false);
    assert.equal(isGunDefaultMarked('fish'), true);
  } finally {
    clearAllMarkedGunDefaults();
    setGunVariant('fish', prevFish[0]);
    setGunEffect('fish', prevFish[1]);
    setGunVariant('golden', prevGolden[0]);
    setGunEffect('golden', prevGolden[1]);
    setGunVariant('pistol', prevPistol[0]);
    setGunEffect('pistol', prevPistol[1]);
  }
});

test('Arsenal and GunVariantPicker expose default marking and bulk export controls', () => {
  const arsenalSrc = readFileSync('src/games/gunhit/components/Arsenal.tsx', 'utf8');
  const pickerSrc = readFileSync('src/games/gunhit/components/GunVariantPicker.tsx', 'utf8');
  const modalSrc = readFileSync('src/games/gunhit/components/DefaultExportModal.tsx', 'utf8');

  assert.ok(arsenalSrc.includes('DefaultExportModal'), 'Arsenal mounts DefaultExportModal');
  assert.ok(arsenalSrc.includes('markGunDefault'), 'Arsenal supports one-tap default marking');
  assert.ok(pickerSrc.includes('SKIN NO.'), 'GunVariantPicker numbers skins starting at 1');
  assert.ok(pickerSrc.includes('EFEK #'), 'GunVariantPicker numbers shot effects starting at 1');
  assert.ok(pickerSrc.includes('TANDAI SEBAGAI DEFAULT'), 'GunVariantPicker lets player mark default');
  assert.ok(modalSrc.includes('COPY DATA MASSAL'), 'DefaultExportModal provides bulk copy button');
});
