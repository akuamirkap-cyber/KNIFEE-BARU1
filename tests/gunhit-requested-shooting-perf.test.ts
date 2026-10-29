import test from 'node:test';
import assert from 'node:assert/strict';
import { Canvas, createCanvas } from '@napi-rs/canvas';
import { K, Particles } from '../games/game-4/src/game/particles';
import { confetti } from '../games/game-4/src/game/spawn3';
import { BlackHoleShot } from '../games/game-4/src/game/projectiles';
import { ChickenShot, ConfettiShot } from '../games/game-4/src/game/projectiles3';
import { FishShot } from '../games/game-4/src/game/projectiles6';
import { SetSevenFx } from '../src/games/gunhit/game/setSevenFx';
import { SetTwoFx, advanceTwoRoundTrail, restTwoRound } from '../src/games/gunhit/game/setTwoFx';

const env = globalThis as unknown as Record<string, unknown>;
const oldDocument = env.document, oldCanvas = env.HTMLCanvasElement;
env.document = { createElement: () => createCanvas(64, 64) };
test.after(() => {
  if (oldDocument === undefined) delete env.document; else env.document = oldDocument;
  if (oldCanvas === undefined) delete env.HTMLCanvasElement; else env.HTMLCanvasElement = oldCanvas;
});
const browser = (on: boolean) => { env.HTMLCanvasElement = on ? Canvas : undefined; };
const asCtx = (ctx: unknown) => ctx as CanvasRenderingContext2D;
const TAU = Math.PI * 2;

function paintData(canvas: ReturnType<typeof createCanvas>) {
  return canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
}
function diff(a: Uint8ClampedArray, b: Uint8ClampedArray, backdrop = [20, 46, 56]) {
  let sum = 0, visible = 0;
  for (let i = 0; i < a.length; i += 4) {
    if (![0, 1, 2].some(k => Math.abs(a[i + k] - backdrop[k]) > 2 || Math.abs(b[i + k] - backdrop[k]) > 2)) continue;
    visible++;
    for (let k = 0; k < 3; k++) sum += Math.abs(a[i + k] - b[i + k]);
  }
  return { pixels: visible, mean: sum / Math.max(1, visible * 3) };
}

test('Soaker water bubbles keep their three translucent details with fewer canvas operations', () => {
  const fx = new SetTwoFx();
  fx.bubbles = Array.from({ length: 100 }, (_, i) => ({
    x: 12 + (i % 10) * 22, y: 12 + Math.floor(i / 10) * 22,
    vx: 0, vy: 0, r: 1.5 + (i % 20) * 0.19, life: 0.12 + (i % 9) * 0.1, max: 1,
  }));
  const paint = (cached: boolean) => {
    browser(cached);
    const canvas = createCanvas(230, 230), c = canvas.getContext('2d');
    c.fillStyle = '#142e38'; c.fillRect(0, 0, 230, 230);
    fx.drawBubbles(asCtx(c));
    return paintData(canvas);
  };
  const reference = paint(false), optimized = paint(true);
  const similarity = diff(reference, optimized);
  assert.ok(similarity.pixels > 2000, 'all the bubbles are still visible');
  assert.ok(similarity.mean < 18, `sprite keeps rim, fill and highlight (${similarity.mean.toFixed(2)}/255)`);
  assert.equal(fx.bubbles.length, 100, 'rendering does not discard bubbles');

  browser(true);
  const canvas = createCanvas(230, 230), c = canvas.getContext('2d');
  let strokes = 0, fills = 0, images = 0;
  const stroke = c.stroke.bind(c), fill = c.fill.bind(c), image = c.drawImage.bind(c);
  c.stroke = (...args: Parameters<typeof c.stroke>) => { strokes++; return stroke(...args); };
  c.fill = (...args: Parameters<typeof c.fill>) => { fills++; return fill(...args); };
  c.drawImage = (...args: Parameters<typeof c.drawImage>) => { images++; return image(...args); };
  fx.drawBubbles(asCtx(c));
  assert.equal(images, 100, 'each moving bubble retains its own translucent sprite');
  assert.equal(strokes + fills, 0, 'the warmed scene no longer draws three paths per bubble');

  browser(false);
  strokes = fills = images = 0;
  fx.drawBubbles(asCtx(c));
  assert.equal(images, 0, 'a non-browser context uses the full vector fallback');
  assert.equal(strokes, 100);
  assert.equal(fills, 200);
});

test('confetti batching preserves every animated paper piece and unrelated custom callbacks', () => {
  const previousRandom = Math.random;
  let seed = 9301;
  Math.random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 0x100000000; };
  try {
    const ps = new Particles();
    confetti(ps, 0, 0, 100, 0, 1, [20, 90], [3, 6], [1, 2]);
    ps.list.forEach((p, i) => {
      p.x = 12 + (i % 10) * 22; p.y = 12 + Math.floor(i / 10) * 22;
      p.life = p.max * (0.08 + (i % 10) * 0.1);
      p.rot = i * 0.37;
    });
    const render = (batched: boolean) => {
      const canvas = createCanvas(230, 230), c = canvas.getContext('2d');
      c.fillStyle = '#142e38'; c.fillRect(0, 0, 230, 230);
      if (batched) ps.draw(asCtx(c), false);
      else for (const p of ps.list) p.draw?.(asCtx(c), p);
      return paintData(canvas);
    };
    const similarity = diff(render(false), render(true));
    assert.ok(similarity.pixels > 1200, 'colored rectangles and dots still appear');
    assert.ok(similarity.mean < 18, `flutter, flips and fade resemble the original (${similarity.mean.toFixed(2)}/255)`);
    assert.equal(ps.list.length, 100, 'not one paper piece was removed');
    const moved = render(true);
    for (const p of ps.list) { p.life -= Math.min(p.life * 0.1, 0.1); p.rot += 0.5; }
    assert.ok(diff(moved, render(true)).mean > 8, 'pieces continue to rotate, flip and fade');

    // A same-colour impact burst uses a handful of fills, not a state save per piece.
    Math.random = () => 0.5;
    const burst = new Particles();
    confetti(burst, 40, 40, 100, 0, 1, [20, 90]);
    let callbackRuns = 0;
    burst.list[0].draw = () => { callbackRuns++; }; // a caller replaces one paper's art
    burst.add({ k: K.CUSTOM, draw: () => { callbackRuns++; } });
    const canvas = createCanvas(100, 100), c = canvas.getContext('2d');
    let fills = 0, restores = 0;
    const fill = c.fill.bind(c), restore = c.restore.bind(c);
    c.fill = (...args: Parameters<typeof c.fill>) => { fills++; return fill(...args); };
    c.restore = () => { restores++; restore(); };
    burst.draw(asCtx(c), false);
    assert.ok(fills <= 3 && restores <= 3, `100 pieces use shared paths (${fills} fills, ${restores} restores)`);
    assert.equal(callbackRuns, 2, 'replaced and unrelated custom drawings still execute');
  } finally { Math.random = previousRandom; }
});

test('Black Hole, Fish, Chicken and Confetti trails retain 60 Hz density at high refresh', () => {
  const previousRandom = Math.random;
  Math.random = () => 0.1;
  try {
    const cases = [
      ['blackhole', 240, (fx: SetSevenFx) => new BlackHoleShot(fx.g, 210, 500)],
      ['fish', 180, (fx: SetSevenFx) => new FishShot(fx.g, 210, 500)],
      ['chicken', 180, (fx: SetSevenFx) => new ChickenShot(fx.g, 210, 500)],
      ['confetti', 180, (fx: SetSevenFx) => new ConfettiShot(fx.g, 210, 500)],
    ] as const;
    for (const [name, expected, make] of cases) {
      for (const hz of [30, 60, 90, 120, 144]) {
        const fx = new SetSevenFx(), shot = make(fx);
        for (let i = 0; i < hz; i++) shot.trail(1 / hz);
        assert.equal(fx.particles.list.length, expected, `${name} at ${hz} Hz`);
        if (name === 'blackhole') assert.equal(fx.lensReq.length, hz, 'refraction follows every rendered frame');
      }
      const fx = new SetSevenFx(), shot = make(fx);
      shot.trail(0);
      assert.equal(fx.particles.list.length, 0, `${name} does not emit with no elapsed time`);
      shot.trail(2);
      assert.ok(fx.particles.list.length <= expected / 10, `${name} limits catch-up after a pause`);
      const afterPause = fx.particles.list.length;
      shot.trail(1 / 60);
      assert.ok(fx.particles.list.length - afterPause <= expected / 60, `${name} leaves no emission backlog`);
    }
    const fx = new SetSevenFx();
    const chicken = new ChickenShot(fx.g, 210, 500);
    chicken.age = 0.05; chicken.trail(1 / 120);
    assert.notEqual(chicken.flap, 0, 'wings still animate on the frames without an emission tick');
    assert.notEqual(chicken.rot, 0, 'rotation still updates every frame');
  } finally { Math.random = previousRandom; }
});

test('Slide 2 trails keep age and world-time emission density without changing the carrier', () => {
  for (const hz of [30, 60, 90, 120, 144]) {
    const round = restTwoRound();
    const calls: { x: number; y: number; age: number }[] = [];
    const fx = { trail: (_id: unknown, x: number, y: number) => { calls.push({ x, y, age: round.age }); } };
    for (let i = 1; i <= hz; i++) advanceTwoRoundTrail(fx as never, 'soaker', 100 + i / hz * 60, 200 - i / hz * 120, round, 1 / hz);
    assert.equal(calls.length, 60, `same 60-Hz-density trail at ${hz} Hz`);
    assert.ok(Math.abs(round.age - 1) < 1e-10, 'animation age advances by real world time');
    assert.equal(round.trailX, 160); assert.equal(round.trailY, 80);
    assert.ok(calls.every(c => Number.isFinite(c.x) && Number.isFinite(c.y) && c.age >= 0 && c.age <= 1.000001));
  }
  const round = restTwoRound();
  let calls = 0;
  const fx = { trail: () => { calls++; } };
  advanceTwoRoundTrail(fx as never, 'soaker', 0, 0, round, 0);
  assert.equal(calls, 0); assert.equal(round.age, 0);
  advanceTwoRoundTrail(fx as never, 'soaker', 0, 0, round, 10);
  assert.equal(calls, 6, 'a resumed tab cannot dump a backlog');
  advanceTwoRoundTrail(fx as never, 'soaker', 0, 0, round, 1 / 60);
  assert.equal(calls, 7);
});

/** The previous nine-ring renderer, used as a pixel-reference for the lens. */
function referenceLens(ctx: CanvasRenderingContext2D, source: HTMLCanvasElement, x: number, y: number, r: number, strength: number, time: number) {
  const m = ctx.getTransform(), k = Math.hypot(m.a, m.b) || 1;
  const size = Math.ceil(r * 2 * k);
  let sx = Math.round(m.a * (x - r) + m.c * (y - r) + m.e);
  let sy = Math.round(m.b * (x - r) + m.d * (y - r) + m.f);
  let sw = size, sh = size, dx = 0, dy = 0;
  if (sx < 0) { dx = -sx; sw += sx; sx = 0; }
  if (sy < 0) { dy = -sy; sh += sy; sy = 0; }
  if (sx + sw > source.width) sw = source.width - sx;
  if (sy + sh > source.height) sh = source.height - sy;
  if (sw <= 2 || sh <= 2) return;
  const cv = createCanvas(size, size), c = cv.getContext('2d');
  c.drawImage(source as never, sx, sy, sw, sh, dx, dy, sw, sh);
  for (let i = 1; i < 10; i++) {
    const f = i / 10;
    ctx.save(); ctx.beginPath(); ctx.arc(x, y, r * (1 - f), 0, TAU); ctx.clip();
    ctx.translate(x, y); ctx.rotate(strength * 1.2 * f * f + time * strength * 0.9 * f);
    const z = 1 + strength * 0.45 * f; ctx.scale(z, z);
    ctx.drawImage(cv as never, -r, -r, r * 2, r * 2); ctx.restore();
  }
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = `rgba(200,150,255,${(0.18 * Math.min(1, strength)).toFixed(3)})`;
  ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(x, y, r * 0.55, 0, TAU); ctx.stroke(); ctx.restore();
}

test('animated Black Hole lens reuses backing memory without changing its nine refraction rings', () => {
  browser(true);
  const fx = new SetSevenFx(); fx.time = 1.8;
  const paintBase = () => {
    const canvas = createCanvas(320, 260), c = canvas.getContext('2d');
    c.fillStyle = '#142e38'; c.fillRect(0, 0, 320, 260);
    for (let i = 0; i < 20; i++) { c.fillStyle = `hsl(${i * 18},80%,55%)`; c.fillRect(i * 16, 0, 8, 260); }
    c.scale(1.25, 1.25);
    return canvas;
  };
  let capacity = 0;
  for (const lens of [{ x: 75, y: 75, r: 45 }, { x: 8, y: 20, r: 28 }, { x: 78, y: 74, r: 31 }]) {
    const actual = paintBase(), expected = paintBase();
    fx.lensReq = [{ ...lens, s: 1.2 }];
    fx.applyLens(asCtx(actual.getContext('2d')), actual as unknown as HTMLCanvasElement);
    referenceLens(asCtx(expected.getContext('2d')), expected as unknown as HTMLCanvasElement, lens.x, lens.y, lens.r, 1.2, fx.time);
    assert.deepEqual(paintData(actual), paintData(expected), 'refraction remains pixel-identical, including edge clipping');
    const backing = (fx as unknown as { lensCanvas: HTMLCanvasElement }).lensCanvas;
    if (capacity) assert.equal(backing.width, capacity, 'shrinking radii do not reallocate the surface');
    capacity = backing.width;
  }
});
