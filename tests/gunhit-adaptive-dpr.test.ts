import test from 'node:test';
import assert from 'node:assert/strict';
import { AdaptiveCanvasDpr } from '../src/games/gunhit/utils/adaptiveCanvasDpr';
import { installCanvasShim } from './supportCanvas';
import { installSilentAudio } from '../tools/supportAudioSilent';

function frames(quality: AdaptiveCanvasDpr, milliseconds: number, count: number): number[] {
  const changes: number[] = [];
  for (let i = 0; i < count; i++) {
    const next = quality.recordFrame(milliseconds);
    if (next !== null) changes.push(next);
  }
  return changes;
}

test('mobile quality changes only after sustained load, with a sharp floor and slow recovery', () => {
  const quality = new AdaptiveCanvasDpr();
  quality.reset(1.35, true);
  assert.deepEqual(frames(quality, 1000 / 120, 600), [], '120 Hz stays at the chosen quality');
  assert.deepEqual(frames(quality, 16.7, 400), [], 'healthy 60 Hz stays at the chosen quality');
  // One or two missed frames cannot change density on their own.
  for (let i = 0; i < 400; i++) assert.equal(quality.recordFrame(i % 20 === 0 ? 40 : 16.7), null);
  quality.pause();
  assert.deepEqual(frames(quality, 33.4, 150), [1.25, 1.15]);
  assert.deepEqual(frames(quality, 33.4, 100), [1.1]);
  assert.deepEqual(frames(quality, 33.4, 300), [], 'density cannot fall below 1.1');
  quality.pause();
  assert.deepEqual(frames(quality, 16.7, 500), [], 'a brief recovery does not cause oscillation');
  assert.deepEqual(frames(quality, 16.7, 100), [1.2], 'four healthy windows restore one step');
  assert.deepEqual(frames(quality, 16.7, 1200), [1.3, 1.35], 'density recovers up to its original ceiling');
  assert.deepEqual(frames(quality, 16.7, 800), [], 'density never exceeds the original ceiling');
});

test('pauses, huge time gaps, low-DPR screens and desktop do not spuriously change quality', () => {
  const quality = new AdaptiveCanvasDpr();
  quality.reset(1.35, true);
  assert.deepEqual(frames(quality, 33.4, 60), []);
  quality.pause();
  assert.deepEqual(frames(quality, 33.4, 60), [], 'paused windows are not combined');
  assert.equal(quality.recordFrame(5000), null, 'background-tab gaps are ignored');
  assert.deepEqual(frames(quality, 33.4, 60), []);
  quality.reset(1, true);
  assert.deepEqual(frames(quality, 45, 300), [], 'a low-DPR screen is never blurred further');
  quality.reset(2, false);
  assert.deepEqual(frames(quality, 45, 300), [], 'desktop quality remains unchanged');

  // Browser zoom can yield non-round DPR values; healthy play must neither
  // round the ceiling down nor accidentally round a recovery above it.
  quality.reset(1.3375, true);
  assert.deepEqual(frames(quality, 16.7, 700), []);
  quality.pause();
  assert.deepEqual(frames(quality, 33.4, 73), [1.24]);
  quality.pause();
  assert.deepEqual(frames(quality, 16.7, 700), [1.3375]);
});

test('repeated very long visible frames still adapt, but a single stall does not', () => {
  const quality = new AdaptiveCanvasDpr();
  quality.reset(1.5, true);
  assert.equal(quality.recordFrame(700), null);
  assert.deepEqual(frames(quality, 16.7, 145), []);
  assert.deepEqual(frames(quality, 300, 12), [1.4]);
});

test('the real game loop resizes only its backing store and continues the same shot', async () => {
  installCanvasShim();
  const env = globalThis as unknown as Record<string, any>;
  Object.assign(env.window, {
    setTimeout, clearTimeout, setInterval: () => 0, clearInterval: () => undefined,
    addEventListener: () => undefined, removeEventListener: () => undefined,
    devicePixelRatio: 3, innerWidth: 390, innerHeight: 844,
  });
  env.requestAnimationFrame = () => 1;
  env.cancelAnimationFrame = () => undefined;
  installSilentAudio();
  const grad = { addColorStop: () => undefined };
  const context = new Proxy({ canvas: { width: 420, height: 760 } } as Record<string, unknown>, {
    get(target, prop) {
      if (prop === 'canvas') return target.canvas;
      if (prop === 'createLinearGradient' || prop === 'createRadialGradient' || prop === 'createConicGradient' || prop === 'createPattern') return () => grad;
      if (prop === 'measureText') return () => ({ width: 8 });
      if (prop === 'getImageData') return () => ({ data: new Uint8ClampedArray(4) });
      return () => undefined;
    },
    set(target, prop, value) { target[String(prop)] = value; return true; },
  }) as unknown as CanvasRenderingContext2D;
  const canvas = {
    width: 420, height: 760, style: {}, getContext: () => context,
    addEventListener: () => undefined, removeEventListener: () => undefined,
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 420, height: 760 }),
  } as unknown as HTMLCanvasElement;
  const { Game } = await import('../src/games/gunhit/game/Game');
  const { setGunVariant, setGunEffect } = await import('../src/games/gunhit/game/art/gunVariants');
  setGunVariant('seed', 'original'); setGunEffect('seed', 'set7');
  const game = new Game(canvas, {} as never) as any;
  game.setWeapon('seed'); game.startAtLevel(1); game.state = 'play'; game.cooldown = 0;
  game.render();
  const backdrop = game.forestBackdrop;
  const level = game.level, ammo = game.ammoLeft, initialDpr = game.dpr, initialTime = game.time;
  game.press(); game.holding = false; game.releaseScope();
  let renders = 0;
  const render = game.render;
  game.render = () => { renders++; };
  game.active = true; game.last = 0;
  for (let i = 1; i <= 73; i++) game.loop(i * 33.4);
  game.render = render;
  assert.equal(game.dpr, Math.round((initialDpr - 0.1) * 100) / 100, 'sustained slow play changes DPR by one step');
  assert.equal(canvas.width, Math.round(420 * game.dpr));
  assert.equal(canvas.height, Math.round(760 * game.dpr));
  assert.equal(canvas.style.width, '420px'); assert.equal(canvas.style.height, '760px');
  assert.equal(game.level, level, 'the current level is not recreated');
  assert.equal(game.state, 'play');
  assert.ok(game.ammoLeft < ammo && game.score > 0, 'the shot still uses ammo and hits');
  assert.ok(game.time - initialTime > 2, 'game time continues normally');
  assert.equal(renders, 73, 'every simulation frame is immediately redrawn after any resize');
  game.render();
  assert.equal(game.forestBackdrop, backdrop, 'fractional DPR changes reuse the same full-resolution forest art');

  // Hidden tabs, intro screens and the paused power-up picker may legitimately
  // produce sparse RAFs; none of those should lower the visual quality.
  const update = game.update;
  game.update = () => undefined; game.render = () => undefined;
  game.resize();
  let now = game.last;
  const runLoop = () => { for (let i = 0; i < 80; i++) { now += 33.4; game.loop(now); } };
  env.document.visibilityState = 'hidden'; runLoop();
  assert.equal(game.dpr, initialDpr, 'hidden tabs do not affect quality');
  env.document.visibilityState = 'visible'; game.choosingBuff = true; runLoop();
  assert.equal(game.dpr, initialDpr, 'paused choice screens do not affect quality');
  game.choosingBuff = false; game.state = 'intro'; runLoop();
  assert.equal(game.dpr, initialDpr, 'intro frames do not affect quality');
  game.state = 'play'; runLoop();
  assert.equal(game.dpr, Math.round((initialDpr - 0.1) * 100) / 100, 'visible gameplay resumes monitoring');
  game.update = update; game.render = render;
  game.destroy();
});
