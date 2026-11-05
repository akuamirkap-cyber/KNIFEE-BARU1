/**
 * One trigger rhythm for the whole arsenal.
 *
 * Reported: half the guns felt like they had stopped responding — the orbital
 * beacon waited 1,7 s between pulls, the singularity 1,4 s, the bazooka 0,85 s
 * — while the acid spitter fired 4,5 times a second. Every layer (slide 1's own
 * table, and slides 2/6/7/9/11 handing their own interval back through
 * `shootInner`) now passes the same ceiling at the trigger pull, so no gun ever
 * makes the player wait longer than 0,2 s. Guns that were already faster keep
 * their own rhythm.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { Canvas, createCanvas, Path2D } from '@napi-rs/canvas';

const env = globalThis as unknown as Record<string, unknown> & { window: Record<string, unknown> };
env.window = Object.assign(env.window ?? {}, {
  setTimeout, clearTimeout, setInterval: () => 0, clearInterval: () => undefined,
  addEventListener: () => undefined, removeEventListener: () => undefined,
  devicePixelRatio: 1, innerWidth: 420, innerHeight: 760, matchMedia: () => ({ matches: false }),
});
env.HTMLCanvasElement = Canvas;
env.Path2D = Path2D;
env.document = {
  createElement: (tag: string) => (tag === 'canvas' ? createCanvas(64, 64) : { style: {} }),
  addEventListener: () => undefined, removeEventListener: () => undefined,
} as unknown as Document;
env.Image = class {
  width = 1; height = 1;
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  set src(_value: string) { /* no artwork in a headless run */ }
};
Object.defineProperty(env, 'navigator', {
  value: { hardwareConcurrency: 8, deviceMemory: 4, maxTouchPoints: 1 }, configurable: true,
});
delete (env as { AudioContext?: unknown }).AudioContext;

const { Game, makeLevel } = await import('../src/games/gunhit/game/Game.ts');
const { WEAPONS } = await import('../src/games/gunhit/game/weapons.ts');

/** The ceiling, in seconds. Nothing may wait longer than this between pulls. */
const CEILING = 0.2;

const canvas = createCanvas(630, 1140) as unknown as HTMLCanvasElement;
(canvas as unknown as { style: unknown }).style = {};
(canvas as unknown as { addEventListener: () => void }).addEventListener = () => undefined;
(canvas as unknown as { removeEventListener: () => void }).removeEventListener = () => undefined;
(canvas as unknown as { getBoundingClientRect: () => DOMRect }).getBoundingClientRect =
  () => ({ left: 0, top: 0, width: 420, height: 760 }) as DOMRect;

const game = new Game(canvas, { onGameOver: () => {}, onStageChange: () => {} } as never) as unknown as Record<string, any>;
game.dpr = 1;
game.level = makeLevel(3);
game.state = 'play';

/** The cooldown the trigger was actually armed with after one shot. */
function armedCooldown(id: string): number {
  game.state = 'play';
  game.setWeapon(id);
  game.cooldown = 0;
  game.reloadT = 0;
  game.ammoLeft = 999;
  game.choosingBuff = false;
  game.shoot();
  return game.cooldown;
}

test('no gun in the arsenal waits longer than a fifth of a second', () => {
  const slow: string[] = [];
  for (const weapon of WEAPONS as { id: string; cooldown: number }[]) {
    const armed = armedCooldown(weapon.id);
    if (armed > CEILING + 1e-9) slow.push(`${weapon.id}: ${armed.toFixed(3)}s`);
  }
  assert.deepEqual(slow, [], `masih ada senjata yang menunggu lebih dari ${CEILING}s`);
});

test('the guns that were already fast keep their own rhythm', () => {
  // Each of these is below the ceiling on its own layer, so the cap leaves it
  // exactly as authored — AK-47, nail gun, the SMGs, the laser and the buster.
  const fast = ['ak47', 'nail', 'mp5', 'ion_smg', 'laser', 'mega_buster', 'acid'];
  for (const id of fast) {
    const armed = armedCooldown(id);
    assert.ok(armed <= CEILING + 1e-9, `${id} should stay fast, got ${armed}`);
    assert.ok(armed > 0, `${id} must still arm a cooldown`);
  }
  // The acid spitter is the reference the player named: it keeps that pace (its
  // slide-11 skin lands it on the ceiling instead).
  assert.ok(armedCooldown('acid') <= 0.22, `acid ${armedCooldown('acid')}`);
  // The nail gun and the ion SMG are the fastest two, and stay so.
  assert.ok(armedCooldown('nail') < 0.1);
  assert.ok(armedCooldown('ion_smg') < 0.1);
});

test('the slow guns come down to the ceiling exactly', () => {
  for (const id of ['orbital_beacon', 'singularity', 'helios_flare', 'heat_ray', 'railgun', 'bazooka', 'meteor']) {
    const armed = armedCooldown(id);
    assert.ok(Math.abs(armed - CEILING) < 1e-9, `${id} should be ${CEILING}s, got ${armed}`);
  }
});

test('five seconds of holding the heaviest gun really fires it again and again', () => {
  game.state = 'play';
  game.setWeapon('orbital_beacon');
  game.cooldown = 0;
  game.reloadT = 0;
  game.choosingBuff = false;
  let shots = 0;
  for (let i = 0; i < 300; i++) {
    game.ammoLeft = 999;
    game.state = 'play';
    if (game.cooldown <= 0) { game.shoot(); shots++; }
    game.update(1 / 60);
  }
  assert.ok(shots >= 20, `the beacon fired ${shots} times in five seconds`);
});
