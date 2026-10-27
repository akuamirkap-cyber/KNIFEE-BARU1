import test from 'node:test';
import assert from 'node:assert/strict';
import { installCanvasShim } from './supportCanvas';

/**
 * Slide-3 decals (`games/game-4`), on slide 1's wheel.
 *
 * `PaintShot` (Paintball) calls `addDecal({ kind: 'goo', c: ['rgba(120,12,24,0.95)', …] })`
 * — *finished* CSS colours. An old port baked every decal into the wheel face
 * as a radial stain, re-wrapping those colours into `rgba(rgba(…),0.45)`; a real
 * canvas throws on that inside `update()`. Slide 1 now keeps the decal and
 * draws it with slide 3's own `drawDecals()` (the blob, its highlights, its
 * drips off the turning rim), which uses the colours exactly as handed over.
 * These tests make the canvas as strict as a browser (an invalid colour throws)
 * and drive the real decal path.
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

/** A slide-3 host whose wheel has radius 100. */
function host() {
  const fx = new SetSevenFx({
    shake: () => {},
    paintWheel: () => {},
    wheel: () => ({ x: 210, y: 300, R: 100, angle: 0 }),
  });
  fx.syncWheel();
  return fx;
}

/** A strict context that also records every fill colour it was given. */
function recordingContext() {
  const strict = strictContext();
  const fills: string[] = [];
  const ctx = new Proxy(strict.ctx as unknown as Record<string, unknown>, {
    set(target, prop, value) {
      if (prop === 'fillStyle' && typeof value === 'string') {
        if (!CSS_COLOR.test(value)) throw new SyntaxError(`bad fill ${value}`);
        fills.push(value);
      }
      target[prop as string] = value;
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;
  return { ctx, fills, stops: strict.stops };
}

const GOO = {
  kind: 'goo',
  angle: 1.2, t: 0, seed: 0.3, blob: [0, 0, 4, 2, 2, 4], next: 0.15,
  c: ['rgba(120,12,24,0.95)', 'rgba(236,52,64,0.97)', 'rgba(255,140,150,0.95)'],
  drip: '236,52,64',
  dripData: '120,12,24',
};

test('a goo decal with finished CSS colours lives on the wheel and is drawn by slide 3 itself', () => {
  const fx = host();
  assert.doesNotThrow(() => fx.addDecal(GOO as never));
  assert.equal(fx.decals.length, 1, 'the decal stays on the wheel (slide 3 draws it every frame)');
  const { ctx, fills } = recordingContext();
  fx.update(0.25);
  assert.doesNotThrow(() => fx.drawFace(ctx, 100));
  // Slide 3's own three-layer blob, in the colours the shot handed over.
  for (const c of GOO.c) assert.ok(fills.includes(c), `the blob is painted in ${c}`);
  // …and it drips off the rim in the shot's own colour.
  for (let i = 0; i < 30; i++) fx.update(1 / 60);
  assert.ok(fx.particles.list.some((p) => (p as { color?: string }).color === '236,52,64'), 'goo drips in its own colour');
});

test('wet and poison stains use slide 3’s own colours, and nothing sticks to the rock', () => {
  const fx = host();
  fx.addDecal({ kind: 'wet', angle: 0.5, t: 0, seed: 0, blob: [0, 0, 4, 2, 2, 4], next: 0.15 } as never);
  fx.addDecal({ kind: 'poison', angle: 2, t: 0, seed: 0 } as never);
  const { ctx, fills, stops } = recordingContext();
  fx.update(0.3);
  assert.doesNotThrow(() => fx.drawFace(ctx, 100));
  assert.ok(fills.some((f) => f.startsWith('rgba(55,28,10,')), 'the wet stain darkens the wood');
  assert.ok(stops.some((s) => s.inner.includes('rgba(40,110,25,0.5)')), 'poison is its own green glow');
  // A slide-3 round that bursts on the rock or the chest leaves no decal.
  const rock = host();
  rock.special = true;
  rock.addDecal(GOO as never);
  assert.equal(rock.decals.length, 0);
});

restore();
