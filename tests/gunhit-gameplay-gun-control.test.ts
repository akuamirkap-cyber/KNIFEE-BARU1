import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { installCanvasShim } from './supportCanvas';
import { installSilentAudio } from '../tools/supportAudioSilent';

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
const canvas = { width: 760, height: 420, style: {}, getContext: () => ctx, addEventListener: () => undefined, removeEventListener: () => undefined, getBoundingClientRect: () => ({ left: 0, top: 0, width: 760, height: 420 }) };
const { Game } = await import('../src/games/gunhit/game/Game.ts');

test('landscape gun pose', () => {
  const game = new Game(canvas as never, { onGameOver(){}, onStageChange(){}, onStageCleared(){}, onShotFired(){}, onBossDefeated(){} } as never) as any;
  game.setOrientation('landscape');
  game.active = true; // the real game is focused; headless instances are not
  game.startAtLevel(1);
  for (let i = 0; i < 200 && game.state === 'intro'; i++) game.update(1/60);
  assert.equal(game.state, 'play');
  const base = game.getGunSlide();
  // simulate W held
  game.onKey({ code: 'KeyW', preventDefault(){}, target: null });
  for (let i = 0; i < 90; i++) game.update(1/60);
  const up = game.getGunSlide();
  game.onKeyUp({ code: 'KeyW' });
  // simulate S held
  game.onKey({ code: 'KeyS', preventDefault(){}, target: null });
  for (let i = 0; i < 120; i++) game.update(1/60);
  const down = game.getGunSlide();
  game.onKeyUp({ code: 'KeyS' });
  console.log('slide base/up/down', base, up, down);
  assert.ok(up < base, 'W raises the gun on screen (world -x)');
  assert.ok(down > up, 'S lowers it');
  assert.ok(Math.abs(down) <= 66.001 && Math.abs(up) <= 66.001, 'capped');

  // pointer above the gun -> negative tilt (barrel up on screen)
  game.aimPointer = { x: 700, y: 40 };
  for (let i = 0; i < 60; i++) game.update(1/60);
  const tiltUp = game.getGunTilt();
  game.aimPointer = { x: 700, y: 400 };
  for (let i = 0; i < 60; i++) game.update(1/60);
  const tiltDown = game.getGunTilt();
  console.log('tilt up/down', tiltUp, tiltDown);
  assert.ok(tiltUp < -0.1, 'pointer above tilts the barrel up');
  assert.ok(tiltDown > 0.1, 'pointer below tilts it down');

  // portrait keeps the gun still
  game.setOrientation('portrait');
  game.update(1/60);
  assert.equal(game.getGunSlide(), 0);
  assert.equal(game.getGunTilt(), 0);
});

test('the live game wires the landscape gun control end to end', () => {
  const src = readFileSync('src/games/gunhit/game/Game.ts', 'utf8');
  // Caps keep a slid/tilted gun inside the target's width.
  assert.match(src, /export const GUN_SLIDE_MAX = 66;/);
  assert.match(src, /export const GUN_TILT_MAX = 0\.45;/);
  // W/S only exist in landscape and never steal keys from text fields.
  assert.match(src, /this\.orientation === 'landscape' && \(e\.code === 'KeyW' \|\| e\.code === 'KeyS'\)/);
  assert.match(src, /if \(e\.code === 'KeyW'\) this\.gunSlideUp = true;\s+else this\.gunSlideDown = true;/);
  assert.match(src, /if \(e\.code === 'KeyW'\) this\.gunSlideUp = false;\s+else if \(e\.code === 'KeyS'\) this\.gunSlideDown = false;/);
  // The pointer is tracked on the canvas and mapped through the display rect.
  assert.match(src, /canvas\.addEventListener\('pointermove', this\.onPointerMove\);/);
  assert.match(src, /this\.canvas\.removeEventListener\('pointermove', this\.onPointerMove\);/);
  assert.match(src, /const dx = pointer\.x - \(H - GUN_Y\);/);
  // The gun art, its halo, its muzzle and every round follow the pose.
  assert.match(src, /c\.translate\(this\.gunX \+ ox, y0\);\s+if \(this\.gunTiltNow\) c\.rotate\(this\.gunTiltNow\);/);
  assert.match(src, /drawRgbGlowSprite\(c, this\.gunX, GUN_Y \+ entryOffset \+ 42/);
  assert.match(src, /const GX = this\.gunX;/);
  assert.match(src, /x: GX \+ plan\[i\]\.ox, originX: GX \+ plan\[i\]\.ox/);
});
