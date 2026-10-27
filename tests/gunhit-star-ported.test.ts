import test from 'node:test';
import assert from 'node:assert/strict';

import { installCanvasShim } from './supportCanvas';
import { installSilentAudio } from '../tools/supportAudioSilent';

/**
 * The star item (Diamond Breaker, Harta Karun, boss rounds) has to work for the
 * imported guns too — slide 7's SET 1..7, slide 2, slide 9 and slide 11 — not
 * only for slide 1's own weapons. This file pins the two cards a player can feel
 * on a ported gun (`double` = two barrels, `mini`/`giant` = round size), the
 * trigger-rate cards, and the pickup itself.
 */
installCanvasShim();
const g = globalThis as unknown as Record<string, unknown> & { window: Record<string, unknown> };
g.window = Object.assign(g.window ?? {}, {
  setTimeout, clearTimeout,
  setInterval: () => 0, clearInterval: () => undefined,
  addEventListener: () => undefined, removeEventListener: () => undefined,
  devicePixelRatio: 1, innerWidth: 420, innerHeight: 760,
});
// `startSpecialStage()` unlocks every ported synthesizer; Node has no Web Audio.
installSilentAudio();

const gradient = { addColorStop: () => undefined };
const ctx = new Proxy({ canvas: { width: 420, height: 760 } } as Record<string, unknown>, {
  get(target, prop) {
    const name = String(prop);
    if (name === 'canvas') return target.canvas;
    if (name === 'createLinearGradient' || name === 'createRadialGradient' || name === 'createPattern') {
      return () => gradient;
    }
    if (name === 'measureText') return () => ({ width: 8 });
    return () => undefined;
  },
  set(target, prop, value) { target[String(prop)] = value; return true; },
}) as unknown as CanvasRenderingContext2D;

const canvas = {
  width: 420, height: 760, style: {},
  getContext: () => ctx,
  addEventListener: () => undefined,
  removeEventListener: () => undefined,
  getBoundingClientRect: () => ({ left: 0, top: 0, width: 420, height: 760 }),
};

const { Game, makeLevel } = await import('../src/games/gunhit/game/Game.ts');
const variants = await import('../src/games/gunhit/game/art/gunVariants.ts');

const events = {
  onGameOver: () => undefined, onStageChange: () => undefined, onStageCleared: () => undefined,
  onShotFired: () => undefined, onBossDefeated: () => undefined,
};

type AnyGame = Record<string, any>;

function newGame(weapon: string, effect: string, opts: { mode?: 'boulder' | 'treasure'; level?: number; twin?: boolean } = {}) {
  variants.setGunEffect(weapon as never, effect as never);
  const game = new Game(canvas as unknown as HTMLCanvasElement, events as never) as unknown as AnyGame;
  if (opts.mode) game.startSpecialStage(opts.mode);
  else game.level = makeLevel(opts.level ?? 3);
  game.state = 'play';
  game.setWeapon(weapon);
  game.cooldown = 0;
  game.reloadT = 0;
  game.ammoLeft = 40;
  game.snowLoaded = 6;
  if (opts.twin) game.twinGuns = true;
  return game;
}

function pump(game: AnyGame, frames: number) {
  for (let i = 0; i < frames; i++) {
    if (game.state !== 'play') break;
    game.update(1 / 60);
  }
}

const stuckRounds = (game: AnyGame) => game.items.filter((i: { type: string }) => i.type === 'bullet').length;

/** One representative gun per imported layer, plus the two delayed ones. */
const LAYERS: { weapon: string; effect: string }[] = [
  { weapon: 'sniper', effect: 'set7' },
  { weapon: 'firework', effect: 'set2' },
  { weapon: 'pistol', effect: 'set9' },
  { weapon: 'pistol', effect: 'set11' },
];

test('the double card really fires the second barrel of every imported layer', () => {
  for (const { weapon, effect } of LAYERS) {
    const single = newGame(weapon, effect);
    single.shoot();
    const oneBarrel = single.projs.length;

    const twin = newGame(weapon, effect, { twin: true });
    twin.shoot();
    assert.equal(twin.projs.length, oneBarrel * 2, `${weapon}:${effect} must fire from both barrels`);
    assert.deepEqual(
      twin.projs.map((p: AnyGame) => Math.round(p.x)).sort((a: number, b: number) => a - b),
      [180, 240],
      `${weapon}:${effect} keeps one round per barrel`,
    );

    // …and each barrel carries its layer's own round, not an empty carrier.
    const real = twin.projs.filter((p: AnyGame) => p.setSeven || p.setNine || p.setEleven || p.setTwo || p.setOne);
    assert.equal(real.length, twin.projs.length, `${weapon}:${effect} gave every barrel a real round`);

    pump(twin, 120);
    assert.ok(stuckRounds(twin) >= 2, `${weapon}:${effect} must stick both rounds`);
  }
});

test('a twin shot fans a burst across lanes instead of stacking rounds in one lane', () => {
  // The Sapphire Shotgun fires three pellets per trigger; doubled that is six
  // rounds. Two of them sharing a lane flew into each other, the shot was lost
  // and the stage ended on the first trigger pull.
  const game = newGame('sapphire', 'set7', { twin: true });
  game.shoot();
  assert.equal(game.projs.length, 6);
  const lanes = new Set(game.projs.map((p: AnyGame) => `${Math.round(p.x)}/${Math.round(p.vx)}`));
  assert.equal(lanes.size, 6, 'every pellet needs its own lane');
  pump(game, 120);
  assert.notEqual(game.state, 'fail', 'no pellet may collide with its sibling');
});

test('a barrel the layer has no round for still flies out', () => {
  // Emerald charges its round after the trigger, and one charge only makes one
  // round: the second barrel used to wait at the muzzle forever (invisible, no
  // hit, never gone).
  const game = newGame('emerald', 'set7', { twin: true });
  game.shoot();
  assert.equal(game.projs.length, 2);
  pump(game, 150);
  assert.equal(game.projs.length, 0, 'no carrier may stay frozen at the muzzle');
  assert.equal(stuckRounds(game), 2);
  assert.equal(game.s7.shots.length, 0, 'no round may be left behind for the next trigger');
});

test('the star appears in both special modes and its card applies to a ported gun', () => {
  for (const mode of ['boulder', 'treasure'] as const) {
    const game = newGame('sniper', 'set7', { mode });
    game.starTimer = 0;
    game.update(1 / 60);
    const star = game.star;
    assert.ok(star, `${mode} must spawn the star`);
    assert.equal(game.tryTapStar(star.x, star.y), true);
    assert.equal(game.choosingBuff, true, 'the pickup opens the buff choice');
    assert.equal(game.projs.length, 0, 'the pickup clears the rounds in the air');

    // Play is paused while the card is open — for ported guns too.
    game.shoot();
    assert.equal(game.projs.length, 0);

    game.applyBuff('double');
    assert.equal(game.choosingBuff, false);
    assert.equal(game.hasTwinGuns, true);
    game.cooldown = 0;
    game.shoot();
    assert.equal(game.projs.length, 2, `${mode}: the doubled ported gun must fire both barrels`);
  }
});

test('the pickup also wipes the rounds the imported layers were painting', () => {
  // Slide 11 never advances a carried round, so a round whose carrier was
  // dropped stayed painted — frozen in mid-air — for the rest of the stage.
  for (const { weapon, effect } of [{ weapon: 'pistol', effect: 'set11' }, { weapon: 'pistol', effect: 'set9' }]) {
    const game = newGame(weapon, effect, { mode: 'boulder' });
    game.starTimer = 0;
    game.update(1 / 60);
    game.shoot();
    game.update(1 / 60);
    const star = game.star;
    assert.ok(star, 'star still flying');
    const layerRounds = () => (effect === 'set11' ? game.s11.raw.projs : game.s9.bullets).length;
    assert.ok(layerRounds() > 0, `${weapon}:${effect} is carrying a round`);
    assert.equal(game.tryTapStar(star.x, star.y), true);
    assert.equal(layerRounds(), 0, `${weapon}:${effect} must not keep a frozen round`);
  }
});

test('the star cards still reach the ported trigger interval', () => {
  for (const { weapon, effect } of LAYERS) {
    const plain = newGame(weapon, effect, { mode: 'treasure' });
    plain.ammoLeft = 40;
    plain.shoot();
    const base = plain.cooldown;
    assert.ok(base > 0);

    const rapid = newGame(weapon, effect, { mode: 'treasure' });
    rapid.choosingBuff = true;
    rapid.applyBuff('rapid');
    rapid.ammoLeft = 40;
    rapid.shoot();
    assert.ok(Math.abs(rapid.cooldown - base / 2) < 1e-9, `${weapon}:${effect} must fire twice as fast`);
  }
});

test('mini and giant reach the imported round in flight, not only the stuck one', () => {
  const scaleCalls: number[] = [];
  const recorder = new Proxy({ canvas: { width: 420, height: 760 } } as Record<string, unknown>, {
    get(target, prop) {
      const name = String(prop);
      if (name === 'canvas') return target.canvas;
      if (name === 'scale') return (x: number) => { scaleCalls.push(x); };
      if (name === 'createLinearGradient' || name === 'createRadialGradient' || name === 'createPattern') {
        return () => gradient;
      }
      if (name === 'measureText') return () => ({ width: 8 });
      return () => undefined;
    },
    set(target, prop, value) { target[String(prop)] = value; return true; },
  }) as unknown as CanvasRenderingContext2D;

  for (const [buff, expected] of [['mini', 0.65], ['giant', 1.8]] as const) {
    for (const { weapon, effect } of LAYERS) {
      const game = newGame(weapon, effect, { mode: 'treasure' });
      game.choosingBuff = true;
      game.applyBuff(buff);
      game.ammoLeft = 40;
      game.cooldown = 0;
      game.shoot();
      const proj = game.projs[0];
      assert.ok(proj, `${weapon}:${effect} fired`);
      scaleCalls.length = 0;
      game.drawCarriedRound(recorder, proj, () => undefined);
      assert.deepEqual(scaleCalls, [expected], `${weapon}:${effect} ${buff} must scale its own round art`);
    }
  }
});
