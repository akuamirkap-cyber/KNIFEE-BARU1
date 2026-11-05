/**
 * The stage-clear shatter, measured.
 *
 * Reported: the game stutters exactly when the enemy breaks apart. Every chunk
 * used to be re-masked and re-lit on every frame of the cinematic — two curved
 * `clip()`s, two full-artwork `drawImage`s and a light gradient per chunk, nine
 * chunks, sixty frames. The wedge artwork does not change during the burst, so
 * its two faces are baked once and blitted.
 *
 * These tests pin both halves of that: the bake produces the right picture, and
 * the burst path no longer pays for clips or gradients per chunk.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createCanvas } from '@napi-rs/canvas';
import { bakeWedgeSprite, drawExtrudedWheelFragment, Game, makeLevel } from '../src/games/gunhit/game/Game';

/** A real 2D canvas for `document.createElement('canvas')` (the bake needs one). */
function installRealCanvasDocument() {
  const previous = (globalThis as { document?: unknown }).document;
  (globalThis as { document?: unknown }).document = {
    createElement: (tag: string) => (tag === 'canvas' ? createCanvas(8, 8) : { style: {} }),
  };
  return () => {
    (globalThis as { document?: unknown }).document = previous;
  };
}

function wheelFace(size = 200): HTMLCanvasElement {
  const cv = createCanvas(size, size);
  const c = cv.getContext('2d');
  c.fillStyle = '#f97316';
  c.beginPath();
  c.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = '#fde68a';
  c.beginPath();
  c.arc(size / 2, size / 2, size / 5, 0, Math.PI * 2);
  c.fill();
  return cv as unknown as HTMLCanvasElement;
}

function pixels(cv: HTMLCanvasElement) {
  const c = (cv as unknown as { getContext: (t: string) => CanvasRenderingContext2D }).getContext('2d');
  return c.getImageData(0, 0, cv.width, cv.height).data;
}

function meanLuma(data: Uint8ClampedArray, cx: number, cy: number, w: number, radius: number) {
  let sum = 0;
  let n = 0;
  for (let y = cy - radius; y <= cy + radius; y++) {
    for (let x = cx - radius; x <= cx + radius; x++) {
      const o = (y * w + x) * 4;
      if (data[o + 3] < 200) continue;
      sum += data[o] * 0.299 + data[o + 1] * 0.587 + data[o + 2] * 0.114;
      n++;
    }
  }
  return n ? sum / n : 0;
}

function recordingCtx() {
  const calls: string[] = [];
  const gradient = { addColorStop: () => {} };
  const ctx = new Proxy({} as CanvasRenderingContext2D, {
    get: (_t, property) => {
      const name = String(property);
      if (name === 'createLinearGradient' || name === 'createRadialGradient') {
        return () => {
          calls.push(name);
          return gradient;
        };
      }
      return (..._args: unknown[]) => {
        calls.push(name);
      };
    },
    set: () => true,
  });
  return { ctx, calls };
}

test('the bake paints both faces of the wedge, the rear one in shade', () => {
  const restore = installRealCanvasDocument();
  try {
    const face = wheelFace(200);
    const sprite = bakeWedgeSprite(face, 95, 4, 0, (Math.PI * 2) / 9, '#fbbf24', 1.5);
    assert.ok(sprite, 'a wedge sprite is produced');
    assert.equal(sprite!.span, 99, 'the face spans radius + pad');
    assert.equal(sprite!.canvas.width, sprite!.px * 2, 'front and rear share one canvas');
    assert.equal(sprite!.canvas.height, sprite!.px);

    const data = pixels(sprite!.canvas);
    const w = sprite!.canvas.width;
    const h = sprite!.canvas.height;
    // A point inside the wedge, half-way out along its bisector.
    const mid = (Math.PI * 2) / 18;
    const r = 95 * 0.5;
    const frontX = Math.round(w / 4 + Math.cos(mid) * r * 1.5);
    const frontY = Math.round(h / 2 + Math.sin(mid) * r * 1.5);
    const rearX = frontX + sprite!.px;
    assert.ok(meanLuma(data, frontX, frontY, w, 4) > 40, 'the front face carries the artwork');
    assert.ok(
      meanLuma(data, rearX, frontY, w, 4) < meanLuma(data, frontX, frontY, w, 4),
      'the rear face is the same artwork in shade',
    );
    // The opposite side of the canvas is outside the wedge.
    const awayX = Math.round(w / 4 - Math.cos(mid) * r * 1.5);
    const awayY = Math.round(h / 2 - Math.sin(mid) * r * 1.5);
    assert.equal(meanLuma(data, awayX, awayY, w, 4), 0, 'the wedge is trimmed, not a full square');
  } finally {
    restore();
  }
});

test('a baked chunk costs a blit, not a clip and a gradient per frame', () => {
  const sprite = { canvas: {} as HTMLCanvasElement, px: 128, span: 99 };

  const vector = recordingCtx();
  drawExtrudedWheelFragment(vector.ctx, {} as CanvasImageSource, 95, 4, 0, (Math.PI * 2) / 9, 10, '#7a3410', '#fbbf24', 1.05, -Math.PI * 0.75);
  const baked = recordingCtx();
  drawExtrudedWheelFragment(baked.ctx, {} as CanvasImageSource, 95, 4, 0, (Math.PI * 2) / 9, 10, '#7a3410', '#fbbf24', 1.05, -Math.PI * 0.75, sprite);

  const count = (calls: string[], name: string) => calls.filter((call) => call === name).length;
  assert.equal(count(baked.calls, 'clip'), 0, 'no curved clip per chunk');
  assert.ok(count(baked.calls, 'createLinearGradient') <= 1, 'no per-chunk light gradient beyond the cached wall ramp');
  assert.equal(count(baked.calls, 'drawImage'), 2, 'both faces are blitted');
  assert.ok(count(baked.calls, 'fill') <= 5, `few fills on the baked path (${count(baked.calls, 'fill')})`);
  assert.ok(count(baked.calls, 'stroke') <= 2, `few strokes on the baked path (${count(baked.calls, 'stroke')})`);
  // The point of the exercise: the burst path is far cheaper than the vector one.
  assert.ok(baked.calls.length < vector.calls.length / 2,
    `baked ${baked.calls.length} calls vs vector ${vector.calls.length}`);
});

test('a stage prepares its nine wedges once, before the wheel breaks', () => {
  const restore = installRealCanvasDocument();
  try {
    const game = Object.create(Game.prototype) as Record<string, unknown>;
    Object.assign(game, {
      level: makeLevel(3),
      face: wheelFace(200),
      faceScale: 2,
      scale: 1,
      dpr: 1.5,
      wedgePrep: null,
    });
    const prepare = (Game.prototype as unknown as { prepareWedges: () => unknown }).prepareWedges;
    const first = prepare.call(game) as { offset: number; sprites: unknown[]; ink: unknown[] };
    const second = prepare.call(game) as typeof first;
    assert.equal(second, first, 'the prepared wedges are reused, never rebuilt');
    assert.equal(first.sprites.length, 9, 'nine chunks, each with a baked face');
    assert.equal(first.ink.length, 9);
    assert.ok(first.sprites.every(Boolean), 'every chunk has its sprite');
    assert.equal(typeof first.offset, 'number');
  } finally {
    restore();
  }
});
