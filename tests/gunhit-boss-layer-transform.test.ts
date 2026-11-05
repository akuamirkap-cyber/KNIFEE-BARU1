import test from 'node:test';
import assert from 'node:assert/strict';
import { createCanvas } from '@napi-rs/canvas';
import { installCanvasShim } from './supportCanvas';
import { installSilentAudio } from '../tools/supportAudioSilent';

installCanvasShim();
// The shim's offscreen canvases are inert; the frame is drawn for real here, so
// every `document.createElement('canvas')` becomes a canvas napi can draw from.
(globalThis as { document?: { createElement: (tag: string) => unknown } }).document!.createElement = (tag: string) => {
  if (tag !== 'canvas') return { style: {} };
  const element = createCanvas(8, 8) as unknown as Record<string, unknown>;
  element.style = {};
  return element;
};

const env = globalThis as unknown as Record<string, unknown> & { window: Record<string, unknown> };
env.window = Object.assign(env.window ?? {}, {
  setTimeout, clearTimeout, setInterval: () => 0, clearInterval: () => undefined,
  addEventListener: () => undefined, removeEventListener: () => undefined,
  devicePixelRatio: 1, innerWidth: 760, innerHeight: 420,
});
installSilentAudio();

const { Game } = await import('../src/games/gunhit/game/Game.ts');
const { GAMEPLAY_GUN_SCALE } = await import('../src/games/gunhit/game/layout.ts');

type Probe = { depth: number; minDepth: number; gunTransforms: { a: number; b: number }[] };

/**
 * A real 2D context that records the two things this bug was about: how deep the
 * save stack is (an unbalanced save/restore poisons everything drawn afterwards)
 * and which transform was live when the gameplay gun was scaled into place.
 */
function probeContext(width = 760, height = 420) {
  const surface = createCanvas(width, height);
  const real = surface.getContext('2d') as unknown as CanvasRenderingContext2D;
  const record: Probe = { depth: 0, minDepth: 0, gunTransforms: [] };
  const ctx = new Proxy(real as unknown as Record<string, unknown>, {
    get(target, prop) {
      const value = Reflect.get(target, prop);
      if (typeof value !== 'function') return value;
      const name = String(prop);
      if (name === 'save') {
        return (...args: unknown[]) => { record.depth++; return (value as Function).apply(target, args); };
      }
      if (name === 'restore') {
        return (...args: unknown[]) => { record.depth--; record.minDepth = Math.min(record.minDepth, record.depth); return (value as Function).apply(target, args); };
      }
      if (name === 'scale') {
        return (x = 1, y = 1) => {
          if (Math.abs(Math.abs(x) - GAMEPLAY_GUN_SCALE) < 1e-6 && Math.abs(Math.abs(y) - GAMEPLAY_GUN_SCALE) < 1e-6) {
            const m = (target as unknown as CanvasRenderingContext2D).getTransform();
            record.gunTransforms.push({ a: m.a, b: m.b });
          }
          return (value as Function).call(target, x, y);
        };
      }
      return (...args: unknown[]) => (value as Function).apply(target, args);
    },
    set(target, prop, val) { (target as Record<string, unknown>)[String(prop)] = val; return true; },
  }) as unknown as CanvasRenderingContext2D;
  const canvas = {
    width, height, style: {}, getContext: () => ctx,
    addEventListener: () => undefined, removeEventListener: () => undefined,
    getBoundingClientRect: () => ({ left: 0, top: 0, width, height }),
  };
  return { canvas, record };
}

function liveGame(canvas: unknown, level: number) {
  const game = new Game(canvas as never, {
    onGameOver() {}, onStageChange() {}, onStageCleared() {}, onShotFired() {}, onBossDefeated() {},
  } as never) as unknown as Record<string, any>;
  game.setOrientation('landscape');
  game.active = true;
  game.startAtLevel(level);
  for (let i = 0; i < 900 && game.state !== 'play'; i++) game.update(1 / 60);
  assert.equal(game.state, 'play', `level ${level} reached play`);
  return game;
}

test('a boss frame leaves the canvas exactly as balanced as a normal stage frame', () => {
  const boss = probeContext();
  liveGame(boss.canvas, 5).render();
  assert.equal(boss.record.depth, 0, 'every save on a boss stage is restored');
  assert.equal(boss.record.minDepth, 0);

  const plain = probeContext();
  liveGame(plain.canvas, 1).render();
  assert.equal(plain.record.depth, 0, 'every save on a normal stage is restored');
});

test('the gameplay gun keeps the stage world transform on a boss stage', () => {
  const boss = probeContext();
  liveGame(boss.canvas, 5).render();
  assert.ok(boss.record.gunTransforms.length > 0, 'the boss frame draws the gun');
  for (const m of boss.record.gunTransforms) {
    assert.ok(Math.abs(m.b) > 0.5, `landscape draws the gun through the rotated world transform (got b=${m.b.toFixed(2)})`);
  }

  const plain = probeContext();
  liveGame(plain.canvas, 1).render();
  assert.ok(plain.record.gunTransforms.length > 0);
  for (const m of plain.record.gunTransforms) assert.ok(Math.abs(m.b) > 0.5);
});
