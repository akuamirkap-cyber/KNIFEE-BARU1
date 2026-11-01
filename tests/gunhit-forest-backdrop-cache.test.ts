import test from 'node:test';
import assert from 'node:assert/strict';
import { Canvas, createCanvas } from '@napi-rs/canvas';
import { installSilentAudio } from '../tools/supportAudioSilent';

/**
 * The Grow/Shrink Ray eases `level.radius` towards `targetR` on every frame of
 * the second after a hit. While the full-screen forest backdrop was keyed on
 * that radius, one hit repainted 420x760 of sky, silhouettes and glow on every
 * single frame — the offline audit measured 35 ms per frame instead of 3 ms,
 * i.e. a slideshow on a phone. These tests lock the cache to what really is
 * static (style + raster density) and keep the glow live, so the radius can
 * move freely without touching the backdrop.
 */
const W = 420;
const H = 760;
const env = globalThis as unknown as Record<string, any>;
const previous = {
  document: env.document,
  HTMLCanvasElement: env.HTMLCanvasElement,
  window: env.window,
  Image: env.Image,
  requestAnimationFrame: env.requestAnimationFrame,
  cancelAnimationFrame: env.cancelAnimationFrame,
};

env.HTMLCanvasElement = Canvas;
env.document = {
  createElement: (tag: string) => (tag === 'canvas' ? createCanvas(64, 64) : { style: {} }),
  addEventListener: () => undefined,
  removeEventListener: () => undefined,
  visibilityState: 'visible',
};
env.Image = class {
  width = 1;
  height = 1;
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  set src(_v: string) { /* no external images here */ }
};
env.requestAnimationFrame = () => 1;
env.cancelAnimationFrame = () => undefined;
env.window = Object.assign(env.window ?? {}, {
  setTimeout, clearTimeout,
  setInterval: () => 0, clearInterval: () => undefined,
  addEventListener: () => undefined, removeEventListener: () => undefined,
  devicePixelRatio: 1.5, innerWidth: W, innerHeight: H,
  matchMedia: () => ({ matches: true }),
});
installSilentAudio();

test.after(() => {
  for (const [key, value] of Object.entries(previous)) {
    if (value === undefined) delete env[key]; else env[key] = value;
  }
});

const { Game, makeLevel } = await import('../src/games/gunhit/game/Game.ts');

function stage() {
  const cv = createCanvas(Math.round(W * 1.5), Math.round(H * 1.5)) as unknown as HTMLCanvasElement & { style: unknown };
  cv.style = {};
  (cv as unknown as Record<string, unknown>).addEventListener = () => undefined;
  (cv as unknown as Record<string, unknown>).removeEventListener = () => undefined;
  (cv as unknown as Record<string, unknown>).getBoundingClientRect = () => ({ left: 0, top: 0, width: W, height: H });
  const game = new Game(cv, { onGameOver: () => {}, onStageChange: () => {} } as never) as unknown as Record<string, any>;
  game.level = makeLevel(3);
  game.state = 'play';
  return game;
}

test('growing and shrinking the target never repaints the full-screen backdrop', () => {
  const game = stage();
  game.render();
  const backdrop = game.forestBackdrop;
  const key = game.forestBackdropKey;
  assert.ok(backdrop, 'the forest backdrop is cached');
  assert.equal(key, 'orange:2', 'the key is style + raster density only');

  const glowBefore = game.forestGlowKey;
  // Exactly what the Grow Ray and the Shrink Ray do: the radius eases towards a
  // moving target on every frame, by fractions of a pixel.
  for (let i = 0; i < 90; i++) {
    game.targetR = 106 + 30 * (0.5 + 0.5 * Math.sin(i * 0.08));
    game.level.radius += (game.targetR - game.level.radius) * 0.2;
    game.render();
    assert.equal(game.forestBackdrop, backdrop, `frame ${i}: the cached sky is reused`);
    assert.equal(game.forestBackdropKey, key, `frame ${i}: the radius never invalidates the cache`);
  }
  assert.notEqual(game.forestGlowKey, glowBefore, 'the target glow follows the radius instead');
  game.destroy?.();
});

test('a style change does rebuild the backdrop, once', () => {
  const game = stage();
  game.render();
  const first = game.forestBackdrop;
  const key = game.forestBackdropKey;
  game.bgTheme = 'forest';
  game.level = { ...game.level, style: 'knight' };
  game.render();
  assert.notEqual(game.forestBackdropKey, key, 'a new style gets its own sky');
  const rebuilt = game.forestBackdropKey;
  const before = game.forestBackdrop;
  for (let i = 0; i < 30; i++) game.render();
  assert.equal(game.forestBackdropKey, rebuilt, 'and it is cached from then on');
  assert.equal(game.forestBackdrop, before, 'the surface is reused, never reallocated');
  assert.notEqual(first, undefined);
  game.destroy?.();
});
