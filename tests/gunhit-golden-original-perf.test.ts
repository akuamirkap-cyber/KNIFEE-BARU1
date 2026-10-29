import test from 'node:test';
import assert from 'node:assert/strict';
import { installCanvasShim } from './supportCanvas';
import { installSilentAudio } from '../tools/supportAudioSilent';

installCanvasShim();
const env = globalThis as unknown as Record<string, unknown> & { window: Record<string, unknown> };
env.window = Object.assign(env.window ?? {}, {
  setTimeout, clearTimeout,
  setInterval: () => 0, clearInterval: () => undefined,
  addEventListener: () => undefined, removeEventListener: () => undefined,
  devicePixelRatio: 1, innerWidth: 420, innerHeight: 760,
});
installSilentAudio();

const gradient = { addColorStop: () => undefined };
const ctx = new Proxy({ canvas: { width: 420, height: 760 } } as Record<string, unknown>, {
  get(target, prop) {
    if (prop === 'canvas') return target.canvas;
    if (prop === 'createLinearGradient' || prop === 'createRadialGradient'
      || prop === 'createConicGradient' || prop === 'createPattern') return () => gradient;
    if (prop === 'measureText') return () => ({ width: 8 });
    if (prop === 'getImageData') return () => ({ data: new Uint8ClampedArray(4) });
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
} as unknown as HTMLCanvasElement;

const { Game } = await import('../src/games/gunhit/game/Game.ts');
const { setGunEffect } = await import('../src/games/gunhit/game/art/gunVariants.ts');
const { FX } = await import('../src/games/gunhit/game/fx.ts');

test('original Golden Gun hits keep their scoring, kick and glow without a world freeze', () => {
  setGunEffect('golden', 'original');
  const game = new Game(canvas, {}) as any;
  game.setWeapon('golden');
  game.startAtLevel(1);
  game.state = 'play';
  game.stickAt(0);
  assert.equal(game.score, 2, 'the original effect still scores two points');
  assert.equal(game.stuck, 1, 'the round still sticks');
  assert.equal(game.hitStop, 0, 'the original Golden Gun no longer freezes the game on impact');
  assert.ok(game.shake > 0 && game.camY < 0 && game.tintA > 0, 'impact shake, kick and golden screen glow remain');
  assert.equal(FX.golden.hitstop, 0);
  assert.ok(FX.pistol.hitstop > 0, 'the original effect recipe remains intact');
  game.destroy();
});

test('Golden Gun and other weapons keep rock impacts responsive', () => {
  for (const weapon of ['golden', 'pistol'] as const) {
    setGunEffect(weapon, 'original');
    const game = new Game(canvas, {}) as any;
    game.setWeapon(weapon);
    game.startSpecialStage('boulder');
    game.state = 'play';
    game.rot = 0;
    const coin = game.bonusCoins[0];
    const scale = game.level.radius / 196;
    const shot = { x: 210 + coin.lx * scale, y: game.targetY + coin.ly * scale, vx: 0, vy: -2600 };
    game.bonusCoins.length = 0; // isolate the rock's own hit from coin pickups
    const result = game.stepSpecialProjectile(shot);
    assert.equal(result.res, 'hit', `${weapon} still hits the rock`);
    assert.ok(game.score > 0 && game.shake > 0, 'rock damage and impact feedback still occur');
    assert.equal(game.hitStop, 0, `${weapon} does not pause the rock stage`);
    game.destroy();
  }
});
