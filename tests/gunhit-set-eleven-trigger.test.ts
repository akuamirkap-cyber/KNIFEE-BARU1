import test from 'node:test';
import assert from 'node:assert/strict';

import { installCanvasShim } from './supportCanvas';
import { installSilentAudio } from '../tools/supportAudioSilent';

/**
 * Slide 7 (`games/game-8`, "Knife-Hit Arsenal FX") on slide 1: the trigger of
 * its guns — fire rate, holding, a tap that comes early, the clock during its
 * hit-stop — and the order its layers are painted in must be slide 7's own.
 * Only the "Slide 7" card does this; the other cards of the same guns keep
 * slide 1's behaviour untouched.
 */
installCanvasShim();
const g = globalThis as unknown as Record<string, unknown> & { window: Record<string, unknown> };
g.window = Object.assign(g.window ?? {}, {
  setTimeout, clearTimeout,
  setInterval: () => 0, clearInterval: () => undefined,
  addEventListener: () => undefined, removeEventListener: () => undefined,
  devicePixelRatio: 1, innerWidth: 420, innerHeight: 760,
});
installSilentAudio();

const gradient = { addColorStop: () => undefined };
const ctx = new Proxy({ canvas: { width: 420, height: 760 } } as Record<string, unknown>, {
  get(target, prop) {
    const name = String(prop);
    if (name === 'canvas') return target.canvas;
    if (name === 'createLinearGradient' || name === 'createRadialGradient'
      || name === 'createConicGradient' || name === 'createPattern') return () => gradient;
    if (name === 'measureText') return () => ({ width: 8 });
    if (name === 'getImageData') return () => ({ data: new Uint8ClampedArray(4) });
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

const { Game } = await import('../src/games/gunhit/game/Game.ts');
const variants = await import('../src/games/gunhit/game/art/gunVariants.ts');
const { SET_ELEVEN_IDS, SLIDE1_ID_FOR_ELEVEN, elevenWeapon } = await import('../src/games/gunhit/game/setElevenArt.ts');
const { getWeapon } = await import('../src/games/gunhit/game/weapons.ts');
const { setElevenMuted } = await import('../src/games/gunhit/game/setElevenFx.ts');
setElevenMuted(true);

let shots = 0;
const events = {
  onGameOver: () => undefined, onStageChange: () => undefined, onStageCleared: () => undefined,
  onShotFired: () => { shots++; }, onBossDefeated: () => undefined,
};

const DT = 1 / 60;

/** Math.random, seeded, so every run plays the same stage. */
function seeded<T>(seed: number, run: () => T): T {
  const saved = Math.random;
  let s = seed >>> 0;
  Math.random = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  try {
    return run();
  } finally {
    Math.random = saved;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Live = any;

/** A live stage 1 with `weapon` on the given card, past the intro. */
function stage(weapon: string, effect: 'set11' | 'original' = 'set11'): Live {
  variants.setGunEffect(weapon as never, effect as never);
  const game = new Game(canvas as unknown as HTMLCanvasElement, events as never) as Live;
  game.startAtLevel(1);
  game.setWeapon(weapon);
  for (let i = 0; i < 120 && game.state === 'intro'; i++) game.update(DT);
  for (let i = 0; i < 20; i++) game.update(DT);
  return game;
}

/** One tap of the trigger. */
function tap(game: Live) {
  game.press();
  game.holding = false;
}

/** A tap and the frame after it: slide 7's shot leaves inside its next update. */
function tapFire(game: Live) {
  tap(game);
  game.update(DT);
}

function run(game: Live, seconds: number) {
  const n = Math.round(seconds / DT);
  for (let i = 0; i < n; i++) game.update(DT);
}

/** Slide 7's guns that fire shot by shot (no channel beam, no charged release). */
const PLAIN = SET_ELEVEN_IDS.filter((id) => {
  const w = elevenWeapon(id);
  const sga = SLIDE1_ID_FOR_ELEVEN[id];
  return !w.channel && !w.onRelease
    && variants.getGunEffectOptions(sga as never).some(option => option.id === 'set11');
});

/* ── fire rate ───────────────────────────────────────────────────────────── */

test('every plain Slide 7 gun recharges on slide 7’s own cooldown; its other card keeps slide 1’s', () => {
  assert.ok(PLAIN.length >= 15, `plain guns: ${PLAIN.length}`);
  for (const id of PLAIN) {
    const sga = SLIDE1_ID_FOR_ELEVEN[id];
    const game = stage(sga);
    tap(game);
    assert.equal(game.projs.length, 0, `${sga}: nothing leaves inside the input handler`);
    game.update(DT);
    assert.ok(game.projs.length > 0, `${sga} fired on the next frame`);
    assert.ok(Math.abs(game.cooldown - elevenWeapon(id).cooldown) < 1e-9,
      `${sga}: ${elevenWeapon(id).cooldown} s as on slide 7 (got ${game.cooldown})`);
  }
  const rail = stage('railgun', 'original');
  tap(rail);
  assert.ok(Math.abs(rail.cooldown - getWeapon('railgun').cooldown) < 1e-9, 'Sebelumnya: slide 1’s own railgun pace');
});

test('the Mega Buster recharges on slide 7’s 0.13 s after a charged release', () => {
  const game = stage('mega_buster');
  game.press();
  assert.equal(game.charging, true, 'the buster charges on slide 1’s charge clock');
  run(game, 0.5);
  game.holding = false;
  game.releaseScope();
  assert.ok(game.projs.length > 0, 'released: it fires');
  assert.ok(Math.abs(game.cooldown - 0.13) < 1e-9, `cooldown ${game.cooldown}`);
});

test('a Slide 7 channel beam keeps one round a press: slide 7’s 0.1 s is only its burn tick', () => {
  seeded(3, () => {
    const game = stage('heat_ray');
    shots = 0;
    game.press();
    assert.equal(shots, 1);
    assert.ok(Math.abs(game.cooldown - getWeapon('heat_ray').cooldown) < 1e-9, `cooldown ${game.cooldown}`);
    run(game, 1);
    assert.equal(shots, 1, 'holding the beam does not stack rounds on the wheel');
    game.holding = false;
  });
});

/* ── holding and tapping ─────────────────────────────────────────────────── */

test('held, a plain Slide 7 gun keeps firing on its own cooldown; Sebelumnya stays semi-automatic', () => {
  seeded(11, () => {
    const game = stage('pistol');
    shots = 0;
    game.press();
    run(game, 0.5);
    game.holding = false;
    assert.equal(game.state, 'play');
    // Beretta: 0.19 s → shots at 0, 0.2, 0.4 s (one 60 fps frame of rounding).
    assert.equal(shots, 3, `the Beretta repeats while held (shots ${shots})`);

    const classic = stage('pistol', 'original');
    shots = 0;
    classic.press();
    run(classic, 0.5);
    classic.holding = false;
    assert.equal(shots, 1, 'the Sebelumnya pistol fires once per press');
  });
});

test('the held Slide 7 bow and rifle repeat at slide 7’s pace, with no slide-1 draw or scope', () => {
  seeded(5, () => {
    const bow = stage('longbow');
    shots = 0;
    bow.press();
    assert.equal(bow.charging, false, 'no slide-1 draw-to-charge');
    run(bow, 0.7);
    bow.holding = false;
    assert.equal(shots, 2, `the bow looses again after 0.62 s (shots ${shots})`);

    const rifle = stage('sniper');
    shots = 0;
    rifle.press();
    assert.equal(rifle.aiming, false, 'no slide-1 scope');
    run(rifle, 0.36);
    rifle.holding = false;
    assert.equal(shots, 3, `the rifle cycles every 0.15 s (shots ${shots})`);
  });
});

test('a Slide 7 tap up to 0.22 s early fires the moment the gun is ready; an earlier one is dropped', () => {
  seeded(9, () => {
    const game = stage('railgun');
    shots = 0;
    tapFire(game);
    assert.equal(shots, 1);
    // Its hit-stop slows the recharge, so wait on the cooldown itself.
    while (game.cooldown > 0.35) game.update(DT);
    tapFire(game); // 0.35 s left: too early to be remembered
    run(game, 0.6);
    assert.equal(shots, 1, 'a tap 0.35 s early is dropped');
    assert.ok(game.cooldown <= 0, 'though the rail is ready by now');
    tapFire(game);
    assert.equal(shots, 2, 'ready: the tap fires on the next frame');
    while (game.cooldown > 0.15) game.update(DT);
    tapFire(game); // 0.15 s left: remembered
    assert.equal(shots, 2, 'not yet');
    run(game, 0.2);
    assert.equal(shots, 3, 'it fires as soon as the rail has recharged');
    assert.equal(game.state, 'play');
  });
});

/* ── slide 7's clock ─────────────────────────────────────────────────────── */

test('during slide 7’s hit-stop its cooldown and its screen shake run at 12 %', () => {
  const game = stage('ak47');
  tapFire(game);
  const cd = game.cooldown;
  assert.ok(Math.abs(cd - 0.1) < 1e-9, `the AK fired (cooldown ${cd})`);
  game.elevenStop = 0.1;
  game.shake = 20;
  game.update(DT);
  assert.ok(Math.abs(cd - game.cooldown - DT * 0.12) < 1e-9, `cooldown ran ${cd - game.cooldown}`);
  assert.ok(Math.abs(game.shake - 20 * Math.exp(-DT * 0.12 * 11)) < 1e-6, `shake ${game.shake}`);
  game.elevenStop = 0;
  game.shake = 20;
  game.update(DT);
  assert.ok(Math.abs(game.shake - 20 * Math.exp(-DT * 11)) < 1e-6, 'after it: slide 7’s e^-11t');

  const classic = stage('ak47', 'original');
  classic.shake = 20;
  classic.update(DT);
  assert.ok(Math.abs(classic.shake - 20 * Math.exp(-DT * 9)) < 1e-6, 'Sebelumnya keeps slide 1’s own e^-9t');
});

/* ── paint order ─────────────────────────────────────────────────────────── */

test('slide 7 paints its wheel marks, sights and beam, its rounds, the gun, then its bursts', () => {
  seeded(4, () => {
    const game = stage('ak47');
    tapFire(game);
    game.update(DT);
    const order: string[] = [];
    const fx = game.s11State;
    fx.drawWheel = () => { order.push('marks'); };
    fx.drawOverlay = () => { order.push('sights'); };
    fx.drawBeam = () => { order.push('beam'); };
    fx.drawShot = () => { order.push('round'); };
    fx.draw = () => { order.push('bursts'); };
    game.drawGunNow = () => { order.push('gun'); };
    game.render();
    const at = (k: string) => order.indexOf(k);
    for (const k of ['marks', 'sights', 'beam', 'round', 'gun', 'bursts']) assert.ok(at(k) >= 0, `${k} painted (${order})`);
    assert.ok(at('marks') < at('sights') && at('sights') < at('beam') && at('beam') < at('round')
      && at('round') < at('gun') && at('gun') < at('bursts'), order.join(' → '));
  });
});

test('slide 5 paints its marks with the wheel and its beams, sparks and rounds under its gun', () => {
  seeded(4, () => {
    variants.setGunEffect('ak47' as never, 'set9' as never);
    const game = new Game(canvas as unknown as HTMLCanvasElement, events as never) as Live;
    game.startAtLevel(1);
    game.setWeapon('ak47');
    for (let i = 0; i < 140; i++) game.update(DT);
    tap(game);
    game.update(DT);
    const order: string[] = [];
    const fx = game.s9State;
    fx.drawWheel = () => { order.push('marks'); };
    fx.draw = () => { order.push('layer'); };
    fx.drawShot = () => { order.push('round'); };
    game.drawGunNow = () => { order.push('gun'); };
    game.render();
    const at = (k: string) => order.indexOf(k);
    for (const k of ['marks', 'layer', 'round', 'gun']) assert.ok(at(k) >= 0, `${k} painted (${order})`);
    assert.ok(at('marks') < at('layer') && at('layer') < at('round') && at('round') < at('gun'), order.join(' → '));
  });
});

/* ── the shoulder caster and the buster, live ────────────────────────────── */



test('the Slide 7 buster releases its mid blast from 0.45 s and its full blast from 1.2 s held', () => {
  const levels: number[] = [];
  for (const held of [0.3, 0.5, 1.1, 1.3]) {
    const game = stage('mega_buster');
    const fx = game.s11;
    const fire = fx.fire.bind(fx);
    fx.fire = (x: number, y: number, c = 0) => { levels.push(c); return fire(x, y, c); };
    game.press();
    run(game, held);
    game.holding = false;
    game.releaseScope();
  }
  assert.deepEqual(levels, [0, 1, 1, 2]);
  const classic = stage('mega_buster', 'original');
  classic.press();
  run(classic, 1.1);
  classic.holding = false;
  classic.releaseScope();
  assert.equal(classic.chargeLevel, 0, 'reset after the shot');
});
