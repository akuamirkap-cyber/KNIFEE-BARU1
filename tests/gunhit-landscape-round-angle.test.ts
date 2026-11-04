import test from 'node:test';
import assert from 'node:assert/strict';
import { installCanvasShim } from './supportCanvas';
import { installSilentAudio } from '../tools/supportAudioSilent';

/**
 * Player report: in landscape only the pistol and the AK-47 pointed their shots
 * the right way — every other weapon's round (and its tail) left the leaning
 * barrel pointing straight across the screen.
 *
 * Two separate causes, both checked here on the real drawing calls:
 *
 *   1. The classic round was turned by `atan2(vx, weapon.speed)` instead of the
 *      round's own velocity, so a lean was read from the base speed and came
 *      out mirrored.
 *   2. Rounds painted by a ported slide (slide 3's own renderer covers most of
 *      the arsenal) were never turned at all, because those layers author their
 *      art for an upright muzzle.
 */
installCanvasShim();
installSilentAudio();

const env = globalThis as any;
env.window = Object.assign(env.window ?? {}, {
  setTimeout, clearTimeout, setInterval: () => 0, clearInterval: () => undefined,
  addEventListener: () => undefined, removeEventListener: () => undefined, devicePixelRatio: 1,
  requestAnimationFrame: () => 0, cancelAnimationFrame: () => undefined,
});
env.requestAnimationFrame = () => 0;
env.cancelAnimationFrame = () => undefined;
const store: Record<string, string> = {};
env.localStorage = {
  getItem: (k: string) => store[k] ?? null,
  setItem: (k: string, v: string) => { store[k] = String(v); },
  removeItem: (k: string) => { delete store[k]; },
  clear: () => { for (const k of Object.keys(store)) delete store[k]; },
};

type Op = { op: 'translate' | 'rotate'; a: number; b: number };
const ops: Op[] = [];
const gradient = { addColorStop: () => undefined };
const ctx = new Proxy({} as any, {
  get: (_t, prop) => {
    const name = String(prop);
    if (name === 'canvas') return { width: 760, height: 420 };
    if (name === 'createLinearGradient' || name === 'createRadialGradient'
      || name === 'createConicGradient' || name === 'createPattern') return () => gradient;
    if (name === 'measureText') return () => ({ width: 8 });
    if (name === 'getImageData') return () => ({ data: new Uint8ClampedArray(4) });
    if (name === 'getTransform') return () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 });
    if (name === 'translate') return (a: number, b: number) => { ops.push({ op: 'translate', a, b }); };
    if (name === 'rotate') return (a: number) => { ops.push({ op: 'rotate', a, b: 0 }); };
    return () => undefined;
  },
  set: () => true,
});
const canvas = {
  width: 760, height: 420, style: {},
  getContext: () => ctx,
  addEventListener: () => undefined,
  removeEventListener: () => undefined,
  getBoundingClientRect: () => ({ left: 0, top: 0, width: 760, height: 420 }),
};

const { Game } = await import('../src/games/gunhit/game/Game.ts');
const EVENTS = { onGameOver() {}, onStageChange() {}, onStageCleared() {}, onShotFired() {}, onBossDefeated() {} };

/** A landscape stage whose barrel is leaning well off the screen's horizontal. */
function leaningRun(weapon: string): any {
  const game = new Game(canvas as never, EVENTS as never) as any;
  game.setOrientation('landscape');
  game.active = true;
  game.setWeapon(weapon);
  game.startAtLevel(1);
  for (let i = 0; i < 240 && game.state === 'intro'; i++) game.update(1 / 60);
  game.aimPointer = { x: 700, y: 40 };
  for (let i = 0; i < 24; i++) game.update(1 / 60);
  game.state = 'play';
  game.cooldown = 0;
  game.ammoLeft = 40;
  return game;
}

/** The rotation the drawing applies right after anchoring at `(x, y)`. */
function rotationAt(x: number, y: number): number | null {
  for (let i = 0; i < ops.length - 1; i++) {
    const op = ops[i];
    if (op.op !== 'translate') continue;
    if (Math.abs(op.a - x) > 0.01 || Math.abs(op.b - y) > 0.01) continue;
    const next = ops[i + 1];
    if (next.op === 'rotate') return next.a;
    return null;
  }
  return null;
}

/** Fire, let the round fly a few frames, then record one drawn frame. */
function flightFrame(game: any, frames = 6) {
  game.shoot();
  for (let i = 0; i < frames && game.projs.length; i++) game.update(1 / 60);
  const p = game.projs[0];
  assert.ok(p, 'the shot is in flight');
  ops.length = 0;
  game.state = 'play';
  game.render();
  return p;
}

const flightAngle = (p: any) => Math.atan2(p.vx, -p.vy);

test('a classic round leans with its own flight, not with the weapon base speed', () => {
  for (const weapon of ['shotgun', 'crossbow', 'nail'] as const) {
    const game = leaningRun(weapon);
    const tilt = game.getGunTilt();
    assert.ok(Math.abs(tilt) > 0.1, `${weapon}: the barrel is leaning (${tilt})`);
    const p = flightFrame(game);
    assert.ok(Math.abs(p.vx) > 1, `${weapon}: the round is really flying off-axis`);
    const drawn = rotationAt(p.x, p.y);
    assert.ok(drawn !== null, `${weapon}: the round is painted somewhere`);
    assert.ok(Math.abs(drawn - flightAngle(p)) < 1e-6,
      `${weapon}: the round points along its tracer (drawn ${drawn}, flight ${flightAngle(p)})`);
    // The old rule read `weapon.speed` as the vertical speed, which mirrored the
    // lean and scaled it by the base speed. Both halves show up here.
    const legacy = -Math.atan2(p.vx, game.weapon.speed);
    assert.ok(Math.abs(drawn - legacy) > 0.02, `${weapon}: the base-speed angle is gone`);
    game.destroy();
  }
});

test('rounds a ported slide paints are turned onto the flight line too', () => {
  // Slide 3's own renderer draws most of the arsenal; it never turned its art.
  for (const weapon of ['keris', 'snowball', 'fish'] as const) {
    const game = leaningRun(weapon);
    assert.ok(Math.abs(game.getGunTilt()) > 0.1, `${weapon}: the barrel is leaning`);
    const p = flightFrame(game);
    assert.ok(p.setSeven, `${weapon}: slide 3 carries this round`);
    const drawn = rotationAt(p.x, p.y);
    assert.ok(drawn !== null, `${weapon}: the carried round is turned`);
    assert.ok(Math.abs(drawn - flightAngle(p)) < 1e-6,
      `${weapon}: the carried round follows its flight (drawn ${drawn})`);
    game.destroy();
  }
});

test('slide 11 keeps turning its own tracer: it is not turned twice', () => {
  const game = leaningRun('ak47');
  assert.ok(game.setElevenLive, 'the AK-47 runs slide 11');
  const p = flightFrame(game);
  assert.ok(p.setEleven, 'slide 11 carries the round');
  // Slide 11 aims its own art from `carry()`; a second rotation here would
  // double the lean.
  assert.equal(rotationAt(p.x, p.y), null, 'the carrier adds no rotation of its own');
  game.destroy();
});

test('an upright stage turns a round only by its own spread', () => {
  const portrait = new Game(canvas as never, EVENTS as never) as any;
  portrait.active = true;
  portrait.setWeapon('shotgun');
  portrait.startAtLevel(1);
  for (let i = 0; i < 240 && portrait.state === 'intro'; i++) portrait.update(1 / 60);
  portrait.state = 'play';
  portrait.cooldown = 0;
  portrait.ammoLeft = 40;
  const p = flightFrame(portrait, 3);
  const drawn = rotationAt(p.x, p.y);
  assert.ok(drawn !== null, 'the portrait round is painted');
  assert.ok(Math.abs(drawn - flightAngle(p)) < 1e-6,
    `portrait rounds follow their (near straight) path too (${drawn})`);
  assert.ok(Math.abs(drawn) < 0.25, 'a straight-up stage barely turns its rounds');
  portrait.destroy();
});
