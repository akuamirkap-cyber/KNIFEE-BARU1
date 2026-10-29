import test from 'node:test';
import assert from 'node:assert/strict';
import { Canvas, createCanvas } from '@napi-rs/canvas';
import { K, GlowLines, Particles, Rays } from '../games/game-4/src/game/particles';
import { GoldenBullet } from '../games/game-4/src/game/projectiles';
import { drawWeapon } from '../games/game-4/src/game/weaponArt';
import { drawCasing, drawGoldBullet } from '../games/game-4/src/game/art';
import { newAnim } from '../games/game-4/src/game/weapons';
import { GOLDEN_PARTICLE_BUDGET, SetSevenFx } from '../src/games/gunhit/game/setSevenFx';

// Real Skia canvases exercise the same cached-image path as a browser; removing
// the HTMLCanvasElement marker exercises the original vector fallback.
const env = globalThis as unknown as Record<string, unknown>;
const oldDocument = env.document;
const oldCanvas = env.HTMLCanvasElement;
env.document = { createElement: () => createCanvas(64, 64) };
test.after(() => {
  if (oldDocument === undefined) delete env.document; else env.document = oldDocument;
  if (oldCanvas === undefined) delete env.HTMLCanvasElement; else env.HTMLCanvasElement = oldCanvas;
});

const browser = (on: boolean) => { env.HTMLCanvasElement = on ? Canvas : undefined; };
const asCtx = (c: unknown) => c as CanvasRenderingContext2D;

/** Average per-channel difference only where either transparent image is visible. */
function transparentDifference(a: Uint8ClampedArray, b: Uint8ClampedArray) {
  let sum = 0;
  let pixels = 0;
  for (let i = 0; i < a.length; i += 4) {
    if (!a[i + 3] && !b[i + 3]) continue;
    pixels++;
    for (let k = 0; k < 4; k++) sum += Math.abs(a[i + k] - b[i + k]);
  }
  return { pixels, mean: sum / Math.max(1, pixels * 4) };
}

function goldenPixels(cached: boolean, slide: number) {
  browser(cached);
  const canvas = createCanvas(480, 420);
  const c = canvas.getContext('2d');
  c.translate(160, 60);
  c.scale(2, 2);
  const anim = newAnim();
  anim.slide = slide;
  anim.fireT = 0.3;
  drawWeapon(asCtx(c), 'golden', anim, 0.2);
  return c.getImageData(0, 0, 480, 420).data;
}

test('cached Golden Gun preserves the detailed vector art, shine and moving slide', () => {
  let resting: Uint8ClampedArray | undefined;
  let retracted: Uint8ClampedArray | undefined;
  for (const slide of [0, 0.4, 0.8]) {
    const vector = goldenPixels(false, slide);
    const cached = goldenPixels(true, slide);
    const diff = transparentDifference(vector, cached);
    assert.ok(diff.pixels > 10_000, 'the complete golden weapon is present');
    assert.ok(diff.mean < 5, `cached art should visually match the vectors (mean ${diff.mean.toFixed(2)}/255)`);
    if (slide === 0) resting = cached;
    if (slide === 0.8) retracted = cached;
  }
  assert.ok(transparentDifference(resting!, retracted!).mean > 2, 'the slide and ejection port still animate');
});

test('cached Golden bullets and casings keep their vector artwork and bounds', () => {
  const samples = [
    (ctx: CanvasRenderingContext2D) => drawGoldBullet(ctx, 15, 6),
    (ctx: CanvasRenderingContext2D) => drawGoldBullet(ctx, 16, 6.6),
    (ctx: CanvasRenderingContext2D) => drawGoldBullet(ctx, 10, 6),
    (ctx: CanvasRenderingContext2D) => drawCasing(ctx),
  ];
  for (const draw of samples) {
    const paint = (cached: boolean) => {
      browser(cached);
      const canvas = createCanvas(220, 220);
      const ctx = canvas.getContext('2d');
      ctx.translate(110, 110);
      ctx.rotate(0.31);
      ctx.scale(5, 5);
      draw(asCtx(ctx));
      return ctx.getImageData(0, 0, 220, 220).data;
    };
    const diff = transparentDifference(paint(false), paint(true));
    assert.ok(diff.pixels > 1000, 'the entire small projectile remains visible');
    assert.ok(diff.mean < 11, `cached brass retains the original shape and colour (${diff.mean.toFixed(2)}/255)`);
  }
});

test('cached Golden Gun and its brass rounds avoid rebuilding vector gradients and grip strokes', () => {
  browser(true);
  const canvas = createCanvas(480, 420);
  const c = canvas.getContext('2d');
  const ctx = asCtx(c);
  c.translate(160, 60);
  c.scale(2, 2);
  const a = newAnim();
  a.slide = 0.7;
  a.fireT = 0.3;
  // Warm the three sprites; subsequent frames should only paint the dynamic
  // chamber, shine, recoil and muzzle heat.
  drawWeapon(ctx, 'golden', a, 0.2);
  drawGoldBullet(ctx, 16, 6.6);
  drawCasing(ctx);

  let strokes = 0, gradients = 0, images = 0;
  const origStroke = c.stroke.bind(c);
  const origGradient = c.createLinearGradient.bind(c);
  const origImage = c.drawImage.bind(c);
  (c as unknown as Record<string, unknown>).stroke = (...args: unknown[]) => { strokes++; return origStroke(...args as []); };
  (c as unknown as Record<string, unknown>).createLinearGradient = (...args: unknown[]) => { gradients++; return origGradient(...args as [number, number, number, number]); };
  (c as unknown as Record<string, unknown>).drawImage = (...args: unknown[]) => { images++; return origImage(...args as [never, number, number]); };
  drawWeapon(ctx, 'golden', a, 0.2);
  for (let i = 0; i < 20; i++) {
    drawGoldBullet(ctx, 16, 6.6);
    drawCasing(ctx);
  }
  assert.ok(strokes <= 2, `golden body no longer repaints its grip every frame (${strokes} strokes)`);
  assert.ok(gradients <= 3, `only the dynamic shine/chamber/trim gradients remain (${gradients})`);
  assert.ok(images >= 42, 'body, slide, bullets and casings reuse cached sprites');
});

function recordingContext() {
  const strokes: Array<{ composite: string; style: string; width: number }> = [];
  const segments: Array<[number, number, number, number]> = [];
  let x = 0, y = 0;
  const ctx = {
    globalAlpha: 1, globalCompositeOperation: 'source-over', lineCap: 'butt', lineJoin: 'miter',
    strokeStyle: '', fillStyle: '', lineWidth: 1,
    save() {}, restore() {}, beginPath() {}, closePath() {},
    moveTo(nx: number, ny: number) { x = nx; y = ny; },
    lineTo(nx: number, ny: number) { segments.push([x, y, nx, ny]); x = nx; y = ny; },
    stroke() { strokes.push({ composite: this.globalCompositeOperation, style: this.strokeStyle, width: this.lineWidth }); },
  };
  return { ctx: asCtx(ctx), strokes, segments };
}

test('gold sparks are batched while staying in their original additive/back passes', () => {
  const ps = new Particles();
  for (let i = 0; i < 120; i++) {
    ps.add({ k: K.SPARK, add: true, x: i * 2, y: 300, vx: 100, vy: -50, size: 2, len: 0.02, life: 1, color: '255,215,120' });
  }
  ps.add({ k: K.SPARK, add: false, x: 1, y: 2, vx: 0, vy: 10, size: 1, life: 1, color: '255,255,255' });
  ps.add({ k: K.SPARK, add: true, back: true, x: 4, y: 5, vx: 5, vy: 10, size: 2, life: 1, color: '255,215,120' });

  const front = recordingContext();
  ps.draw(front.ctx, false);
  assert.equal(front.segments.length, 121, 'every front spark still has its own disconnected line');
  assert.equal(front.strokes.length, 2, '120 gold sparks share one stroke, plus the normal spark');
  assert.equal(front.strokes[0].composite, 'source-over');
  assert.equal(front.strokes[1].composite, 'lighter');
  assert.deepEqual(front.segments[1], [0, 300, -2, 301], 'spark direction and length are preserved');

  const back = recordingContext();
  ps.draw(back.ctx, true);
  assert.equal(back.segments.length, 1, 'the rear spark is never duplicated on the front');
  assert.equal(back.strokes[0].composite, 'lighter');
});

test('gold wheel cracks retain three glow layers using three strokes, not three per crack', () => {
  const c = recordingContext();
  const cracks = Array.from({ length: 6 }, (_, i) => [i * 2, 0, i * 2 + 1, 5, i * 2 + 3, 8]);
  new GlowLines(cracks, '255,190,60', 1.3, 1.5).draw(c.ctx);
  assert.equal(c.segments.length, 12, 'all crack polylines remain present and separate');
  assert.equal(c.strokes.length, 3);
  assert.ok(c.strokes.every((s) => s.composite === 'lighter'));
  assert.ok(c.strokes[0].width > c.strokes[1].width && c.strokes[1].width > c.strokes[2].width);
});

test('cached impact rays keep their shape, colour and growth without per-ray gradients', () => {
  const rays = new Rays(200, 200, '255,210,100', 0.5, 0);
  rays.rays = [
    { a: 0, len: 100, w: 8 }, { a: 1, len: 70, w: 6 },
    { a: 2, len: 120, w: 3 }, { a: -1, len: 80, w: 7 },
  ];
  rays.age = 0.18;
  const paint = (cached: boolean) => {
    browser(cached);
    const canvas = createCanvas(400, 400);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#142e38';
    ctx.fillRect(0, 0, 400, 400);
    rays.draw(asCtx(ctx));
    return ctx.getImageData(0, 0, 400, 400).data;
  };
  const vector = paint(false);
  const cached = paint(true);
  let diff = 0, visible = 0;
  for (let i = 0; i < vector.length; i += 4) {
    const isRay = [20, 46, 56].some((base, k) => Math.abs(vector[i + k] - base) > 2 || Math.abs(cached[i + k] - base) > 2);
    if (!isRay) continue;
    visible++;
    for (let k = 0; k < 3; k++) diff += Math.abs(vector[i + k] - cached[i + k]);
  }
  assert.ok(visible > 1000, 'all four tapered rays are still visible');
  assert.ok(diff / (visible * 3) < 7, 'cached rays visually match the vector version over the game backdrop');

  const canvas = createCanvas(400, 400);
  const c = canvas.getContext('2d');
  let gradients = 0, images = 0;
  const gradient = c.createLinearGradient.bind(c);
  const image = c.drawImage.bind(c);
  (c as unknown as Record<string, unknown>).createLinearGradient = (...args: unknown[]) => { gradients++; return gradient(...args as [number, number, number, number]); };
  (c as unknown as Record<string, unknown>).drawImage = (...args: unknown[]) => { images++; return image(...args as [never, number, number]); };
  rays.draw(asCtx(c));
  assert.equal(gradients, 0);
  assert.equal(images, 4);
});

test('Golden Bullet trail density is independent of 30/60/120Hz refresh', () => {
  const counts = (hz: number) => {
    const host = new SetSevenFx();
    const shot = new GoldenBullet(host.g, 210, 500);
    for (let i = 0; i < hz; i++) shot.trail(1 / hz);
    return {
      stars: host.particles.list.filter((p) => p.k === K.STAR).length,
      embers: host.particles.list.filter((p) => p.k === K.EMBER).length,
    };
  };
  assert.deepEqual(counts(30), { stars: 40, embers: 40 });
  assert.deepEqual(counts(60), counts(30));
  assert.deepEqual(counts(120), counts(30));
});

test('Golden Gun limits only old cosmetic debris, keeping fresh bursts and important particles', () => {
  const fx = new SetSevenFx();
  fx.weaponId = 'golden';
  const faded = fx.particles.add({ k: K.STAR, life: 0.2, max: 1 });
  let died = false;
  const protectedDeath = fx.particles.add({ k: K.SPARK, life: 1, die: () => { died = true; } });
  const protectedTarget = fx.particles.add({ k: K.SPARK, life: 1, target: { x: 200, y: 200 } });
  const shell = fx.particles.add({ k: K.CUSTOM, life: 1 });
  const ring = fx.particles.add({ k: K.RING, life: 1 });
  let latest = faded;
  for (let i = 0; i < 400; i++) latest = fx.particles.add({ k: K.STAR, life: 1, max: 1, x: i });
  fx.update(0);
  assert.equal(fx.particles.list.length, GOLDEN_PARTICLE_BUDGET);
  assert.ok(!fx.particles.list.includes(faded), 'already-fading debris goes first');
  for (const p of [protectedDeath, protectedTarget, shell, ring, latest]) assert.ok(fx.particles.list.includes(p));
  assert.equal(died, false, 'a callback particle is never removed prematurely');

  // Impact work can add particles after the update. The first draw must trim
  // them before painting, rather than allowing an oversized one-frame spike.
  for (let i = 0; i < 40; i++) fx.particles.add({ k: K.STAR, life: 1 });
  let drawn = 0;
  fx.particles.draw = () => { drawn++; };
  fx.draw({} as CanvasRenderingContext2D);
  assert.equal(drawn, 1);
  assert.equal(fx.particles.list.length, GOLDEN_PARTICLE_BUDGET);
  assert.ok(fx.particles.list.includes(protectedDeath));
  protectedDeath.life = 0.001;
  fx.update(0.01);
  assert.equal(died, true, 'protected death callbacks still run at the natural expiry');

  const protectedOnly = new SetSevenFx();
  protectedOnly.weaponId = 'golden';
  for (let i = 0; i < GOLDEN_PARTICLE_BUDGET + 5; i++) protectedOnly.particles.add({ k: K.CUSTOM, life: 1 });
  protectedOnly.update(0);
  assert.equal(protectedOnly.particles.list.length, GOLDEN_PARTICLE_BUDGET + 5, 'protected particles may exceed the cosmetic target');

  const other = new SetSevenFx();
  other.weaponId = 'rpg';
  for (let i = 0; i < 400; i++) other.particles.add({ k: K.STAR, life: 1 });
  other.update(0);
  assert.equal(other.particles.list.length, 400, 'other weapons retain their original particle recipe');
});

test('Golden Gun impact keeps the golden visuals and collision but no longer freezes the world', () => {
  const fx = new SetSevenFx({
    shake: () => {}, paintWheel: () => {},
    wheel: () => ({ x: 210, y: 184, R: 100, angle: 0 }),
  });
  fx.weaponId = 'golden';
  fx.syncWheel();
  const shot = new GoldenBullet(fx.g, 210, 575);
  shot.hit(Math.PI / 2, 210, 284);
  assert.equal(fx.feel.stop, 0, 'gold impacts do not inject a 50ms gameplay freeze');
  assert.equal(fx.stuck.length, 1, 'the same gold bullet sticks to the wheel');
  assert.equal(shot.alive, false);
  assert.ok(fx.feel.rim > 0 && fx.feel.bumpV < 0, 'wheel flash and bounce remain');
  assert.ok(fx.wheelFx.length >= 2, 'glowing cracks and hotspot remain');
  for (const kind of [K.SPARK, K.STAR, K.FLAKE, K.CHIP, K.SMOKE]) {
    assert.ok(fx.particles.list.some((p) => p.k === kind), `gold burst retains particle kind ${kind}`);
  }
  fx.weaponId = 'rpg';
  fx.hitStop(0.05);
  assert.equal(fx.feel.stop, 0, 'other slide-3 impacts also keep the world moving');
});
