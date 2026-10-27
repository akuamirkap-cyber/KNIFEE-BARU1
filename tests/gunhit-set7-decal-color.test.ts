import test from 'node:test';
import assert from 'node:assert/strict';
import { installCanvasShim } from './supportCanvas';

/**
 * Slide-7 decals, painted through slide 1's wheel face.
 *
 * `PaintShot` (Paintball) calls `addDecal({ kind: 'goo', c: ['rgba(120,12,24,0.95)', …] })`
 * — *finished* CSS colours. The port wrapped them again into
 * `rgba(${c[0]},0.45)`, which produces `rgba(rgba(120,12,24,0.95),0.45)`; a real
 * canvas throws a `SyntaxError` from `addColorStop` on that, inside `update()`,
 * so the frame died half-painted and every later effect on that wheel was lost.
 * These tests make the canvas as strict as a browser (invalid colour throws) and
 * drive the real decal path.
 */

const restore = installCanvasShim();
const { SetSevenFx } = await import('../src/games/gunhit/game/setSevenFx.ts');

const CSS_COLOR = /^(#[0-9a-f]{3,8}|rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*(,\s*[\d.]+\s*)?\))$/i;

/** A context whose gradients reject anything a browser would reject. */
function strictContext() {
  const stops: { inner: string[]; outer: string[] }[] = [];
  const ctx = {
    canvas: { width: 256, height: 256 },
    globalAlpha: 1,
    globalCompositeOperation: 'source-over',
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    save() {}, restore() {}, beginPath() {}, closePath() {}, clip() {}, fill() {}, stroke() {},
    moveTo() {}, lineTo() {}, arc() {}, ellipse() {}, rect() {}, translate() {}, rotate() {}, scale() {},
    quadraticCurveTo() {}, bezierCurveTo() {}, fillRect() {}, strokeRect() {}, clearRect() {}, setTransform() {},
    createLinearGradient: () => ({ addColorStop() {} }),
    createRadialGradient: () => {
      const record = { inner: [] as string[], outer: [] as string[] };
      stops.push(record);
      return {
        addColorStop(offset: number, color: string) {
          if (!CSS_COLOR.test(color)) {
            throw new SyntaxError(`The value provided ('${color}') could not be parsed as a color.`);
          }
          (offset === 0 ? record.inner : record.outer).push(color);
        },
      };
    },
  };
  return { ctx: ctx as unknown as CanvasRenderingContext2D, stops };
}

/** A slide-7 host whose wheel has radius 100 and paints into `ctx`. */
function host(ctx: CanvasRenderingContext2D) {
  const fx = new SetSevenFx({
    shake: () => {},
    hitStop: () => {},
    flash: () => {},
    paintWheel: (draw) => (draw as (c: CanvasRenderingContext2D) => void)(ctx),
    wheelImpact: () => {},
    wheel: () => ({ x: 210, y: 300, R: 100, angle: 0 }),
  });
  fx.syncWheel();
  return fx;
}

const GOO = {
  kind: 'goo',
  angle: 1.2, t: 0, seed: 0.3, blob: [0, 0, 4, 2], next: 0.15,
  c: ['rgba(120,12,24,0.95)', 'rgba(236,52,64,0.97)', 'rgba(255,140,150,0.95)'],
  drip: '236,52,64',
  dripData: '120,12,24',
};

test('a goo decal with finished CSS colours does not throw', () => {
  const { ctx, stops } = strictContext();
  // Exactly what PaintShot.hit() hands over for a red shot.
  assert.doesNotThrow(() => host(ctx).addDecal(GOO as never));
  assert.equal(stops.length, 1, 'one stain was painted');
  assert.deepEqual(stops[0].inner, ['rgba(236,52,64,0.55)'], 'the stain keeps the shot colour');
  assert.deepEqual(stops[0].outer, ['rgba(236,52,64,0)']);
});

test('bare triplets and hex still work, and a bad colour falls back instead of throwing', () => {
  const { ctx, stops } = strictContext();
  const mk = () => host(ctx);
  const decal = (extra: Record<string, unknown>) => ({ kind: 'goo', angle: 0.5, t: 0, seed: 0, blob: [0, 0, 4, 2], next: 0.15, ...extra });

  mk().addDecal(decal({ c: ['190,130,20', '255,226,110', '255,244,190'] }) as never);
  mk().addDecal(decal({ c: ['#1f2937', '#22c55e', '#bbf7d0'] }) as never);
  // Something the canvas would refuse must degrade to the fallback stain.
  assert.doesNotThrow(() => mk().addDecal(decal({ c: ['not-a-color'] }) as never));

  assert.deepEqual(stops[0].inner, ['rgba(255,226,110,0.55)'], 'bare triplet is wrapped once');
  assert.deepEqual(stops[1].inner, ['rgba(34,197,94,0.55)'], 'hex is converted, not wrapped');
  assert.deepEqual(stops[2].inner, ['rgba(190,130,20,0.45)'], 'unparsable colour uses the fallback');
});

restore();
