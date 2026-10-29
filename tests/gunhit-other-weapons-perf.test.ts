import test from 'node:test';
import assert from 'node:assert/strict';
import { Canvas, createCanvas } from '@napi-rs/canvas';
import { drawSnowflake } from '../games/game-4/src/game/shapes2';
import { drawBee, drawPetal } from '../games/game-4/src/game/shapes4';
import { drawPlayingCard } from '../games/game-4/src/game/shapes6';
import { K } from '../games/game-4/src/game/particles';
import { SnowballShot } from '../games/game-4/src/game/projectiles2';
import { BeeSwarm, SakuraShot } from '../games/game-4/src/game/projectiles4';
import { CardShot, FreezeBeam } from '../games/game-4/src/game/projectiles6';
import { CryoShot } from '../games/game-4/src/game/projectiles7';
import { drawWeapon2 } from '../games/game-4/src/game/weaponArt2';
import { newAnim } from '../games/game-4/src/game/weapons';
import { SLIDE_THREE_PARTICLE_BUDGET, SetSevenFx } from '../src/games/gunhit/game/setSevenFx';
import { drawForestFireflies } from '../src/games/gunhit/game/art/forestFireflies';
import { drawProjectileExtra4 } from '../src/games/gunhit/game/art/projectiles5';
import { cssColor, drawFxParticle, type Particle } from '../src/games/gunhit/game/fx';

// Exercise both the browser sprite path and the real-vector fallback in Skia.
const env = globalThis as unknown as Record<string, unknown>;
const oldDocument = env.document;
const oldCanvas = env.HTMLCanvasElement;
env.document = { createElement: () => createCanvas(64, 64) };
test.after(() => {
  if (oldDocument === undefined) delete env.document; else env.document = oldDocument;
  if (oldCanvas === undefined) delete env.HTMLCanvasElement; else env.HTMLCanvasElement = oldCanvas;
});
const browser = (on: boolean) => { env.HTMLCanvasElement = on ? Canvas : undefined; };
const ctx2d = (ctx: unknown) => ctx as CanvasRenderingContext2D;
const TAU = Math.PI * 2;

function visibleDifference(a: Uint8ClampedArray, b: Uint8ClampedArray, backdrop = [20, 46, 56]) {
  let sum = 0, visible = 0;
  for (let i = 0; i < a.length; i += 4) {
    if (![0, 1, 2].some((k) => Math.abs(a[i + k] - backdrop[k]) > 2 || Math.abs(b[i + k] - backdrop[k]) > 2)) continue;
    visible++;
    for (let k = 0; k < 3; k++) sum += Math.abs(a[i + k] - b[i + k]);
  }
  return { pixels: visible, mean: sum / Math.max(1, visible * 3) };
}

function renderArt(cached: boolean, draw: (c: CanvasRenderingContext2D) => void) {
  browser(cached);
  const canvas = createCanvas(260, 260);
  const c = canvas.getContext('2d');
  c.fillStyle = '#142e38'; c.fillRect(0, 0, 260, 260);
  c.translate(130, 130); c.rotate(0.31); c.scale(4, 4);
  draw(ctx2d(c));
  return c.getImageData(0, 0, 260, 260).data;
}

function oldSnowflake(c: CanvasRenderingContext2D, s: number) {
  c.lineCap = 'round';
  for (let i = 0; i < 6; i++) {
    c.save(); c.rotate(i * TAU / 6); c.beginPath();
    c.moveTo(0, 0); c.lineTo(s, 0);
    c.moveTo(s * 0.58, 0); c.lineTo(s * 0.84, s * 0.3);
    c.moveTo(s * 0.58, 0); c.lineTo(s * 0.84, -s * 0.3);
    c.moveTo(s * 0.3, 0); c.lineTo(s * 0.46, s * 0.18);
    c.moveTo(s * 0.3, 0); c.lineTo(s * 0.46, -s * 0.18);
    c.stroke(); c.restore();
  }
}

test('snowflakes retain all six arms with one stroke rather than six', () => {
  for (const alpha of [1, 0.5]) {
    const paint = (fn: (c: CanvasRenderingContext2D, size: number) => void) => renderArt(false, (c) => {
      c.globalAlpha = alpha; c.strokeStyle = '#d9f5ff'; c.lineWidth = 0.7; fn(c, 13);
    });
    const diff = visibleDifference(paint(oldSnowflake), paint(drawSnowflake));
    assert.ok(diff.pixels > 700, 'the entire snowflake remains visible');
    assert.ok(diff.mean < 5, `the batched flake matches its original geometry (${diff.mean.toFixed(2)}/255)`);
  }
  const canvas = createCanvas(120, 120), c = canvas.getContext('2d');
  let strokes = 0, lines = 0, moves = 0;
  const stroke = c.stroke.bind(c), lineTo = c.lineTo.bind(c), moveTo = c.moveTo.bind(c);
  c.stroke = (...args: Parameters<typeof c.stroke>) => { strokes++; return stroke(...args); };
  c.lineTo = (x: number, y: number) => { lines++; lineTo(x, y); };
  c.moveTo = (x: number, y: number) => { moves++; moveTo(x, y); };
  drawSnowflake(ctx2d(c), 10);
  assert.equal(strokes, 1);
  assert.equal(lines, 30, 'six arms, each with its four branches');
  assert.equal(moves, 30, 'each separate segment has its own starting point');
});

test('cached petals, four card suits and bee bodies preserve their vector artwork', () => {
  const samples: Array<[string, (c: CanvasRenderingContext2D) => void, number]> = [
    ['sakura', (c) => drawPetal(c, 7.6, '#fff0f6', '#ffb7d1'), 12],
    ...[0, 1, 2, 3].map((suit): [string, (c: CanvasRenderingContext2D) => void, number] =>
      [`card suit ${suit}`, (c) => drawPlayingCard(c, suit, 1.3), 12]),
    ['bee, wings raised', (c) => drawBee(c, 1.35, -0.8), 14],
    ['bee, wings lowered', (c) => drawBee(c, 1.35, 0.8), 14],
  ];
  for (const [name, draw, tolerance] of samples) {
    const diff = visibleDifference(renderArt(false, draw), renderArt(true, draw));
    assert.ok(diff.pixels > 300, `${name} remains visible`);
    assert.ok(diff.mean < tolerance, `${name} matches its detailed vector art (${diff.mean.toFixed(2)}/255)`);
  }
  const up = renderArt(true, (c) => drawBee(c, 1.35, -0.8));
  const down = renderArt(true, (c) => drawBee(c, 1.35, 0.8));
  assert.ok(visibleDifference(up, down).mean > 10, 'bee wings continue to flap, not a frozen sprite');
});

test('snow cannon reuses its shaded snowballs without freezing recoil or its glowing crystal', () => {
  const render = (cached: boolean, slide: number, time: number) => {
    browser(cached);
    const canvas = createCanvas(500, 500), c = canvas.getContext('2d');
    c.fillStyle = '#142e38'; c.fillRect(0, 0, 500, 500); c.translate(250, 70); c.scale(1.8, 1.8);
    const anim = newAnim(); anim.slide = slide; anim.fireT = 0.2;
    drawWeapon2(ctx2d(c), 'snowball', anim, time);
    return c.getImageData(0, 0, 500, 500).data;
  };
  for (const slide of [0, 0.8]) {
    const diff = visibleDifference(render(false, slide, 0.3), render(true, slide, 0.3));
    assert.ok(diff.pixels > 10_000, 'the entire cannon stays visible');
    assert.ok(diff.mean < 4, `cached snowballs keep their original shading (${diff.mean.toFixed(2)}/255)`);
  }
  assert.ok(visibleDifference(render(true, 0, 0.2), render(true, 0.8, 0.8)).mean > 1,
    'the hopper, recoil and crystal remain animated');
  browser(true);
  const canvas = createCanvas(500, 500), c = canvas.getContext('2d'), ctx = ctx2d(c);
  const anim = newAnim(); anim.slide = 0.4;
  drawWeapon2(ctx, 'snowball', anim, 0.3); // warm sprite
  let radials = 0, images = 0;
  const radial = c.createRadialGradient.bind(c), image = c.drawImage.bind(c);
  c.createRadialGradient = (...args: Parameters<typeof c.createRadialGradient>) => { radials++; return radial(...args); };
  c.drawImage = (...args: Parameters<typeof c.drawImage>) => { images++; return image(...args); };
  drawWeapon2(ctx, 'snowball', anim, 0.3);
  assert.equal(radials, 0, 'the moving hopper and snow lumps reuse the same shaded sprite');
  assert.ok(images >= 17, 'all shaded snowballs are still drawn');
});

test('warm static sprites avoid recreating per-particle gradients and card details', () => {
  browser(true);
  const canvas = createCanvas(260, 260), c = canvas.getContext('2d'), ctx = ctx2d(c);
  drawPetal(ctx, 8); drawPlayingCard(ctx, 2, 1); drawBee(ctx, 1, 0);
  let gradients = 0, fills = 0, strokes = 0, images = 0;
  const lin = c.createLinearGradient.bind(c), radial = c.createRadialGradient.bind(c);
  const fill = c.fill.bind(c), stroke = c.stroke.bind(c), image = c.drawImage.bind(c);
  c.createLinearGradient = (...args: Parameters<typeof c.createLinearGradient>) => { gradients++; return lin(...args); };
  c.createRadialGradient = (...args: Parameters<typeof c.createRadialGradient>) => { gradients++; return radial(...args); };
  c.fill = (...args: Parameters<typeof c.fill>) => { fills++; return fill(...args); };
  c.stroke = (...args: Parameters<typeof c.stroke>) => { strokes++; return stroke(...args); };
  c.drawImage = (...args: Parameters<typeof c.drawImage>) => { images++; return image(...args); };
  for (let i = 0; i < 25; i++) {
    drawPetal(ctx, 8); drawPlayingCard(ctx, 2, 1); drawBee(ctx, 1, Math.sin(i));
  }
  assert.equal(gradients, 0, 'warm sprites do not create gradients on the main canvas');
  assert.equal(images, 75, 'each petal, card and bee body reuses its sprite');
  assert.equal(fills, 25, 'only the animated bee wings need a fill');
  assert.equal(strokes, 25, 'the wings retain their outline');
});

function oldFireflies(c: CanvasRenderingContext2D, dust: Array<{ x: number; y: number; s: number }>, time: number) {
  for (const d of dust) {
    const pulse = 0.4 + 0.6 * Math.sin(time * 2.5 + d.x);
    c.fillStyle = `rgba(250,204,21,${0.28 * pulse})`;
    c.beginPath(); c.arc(d.x, d.y, d.s * 2.8, 0, TAU); c.fill();
    c.fillStyle = `rgba(254,240,138,${0.9 * pulse})`;
    c.beginPath(); c.arc(d.x, d.y, d.s * 0.9, 0, TAU); c.fill();
  }
}

test('forest fireflies keep their individual pulse and disconnected halos with far fewer fills', () => {
  const dust = Array.from({ length: 45 }, (_, i) => ({ x: 10 + (i % 9) * 29, y: 10 + Math.floor(i / 9) * 29, s: 1.8 }));
  for (const time of [0, 1.7, 4.3]) {
    const paint = (fn: typeof oldFireflies) => {
      const canvas = createCanvas(280, 160), c = canvas.getContext('2d');
      c.fillStyle = '#142e38'; c.fillRect(0, 0, 280, 160);
      fn(ctx2d(c), dust, time);
      return c.getImageData(0, 0, 280, 160).data;
    };
    const diff = visibleDifference(paint(oldFireflies), paint(drawForestFireflies));
    assert.ok(diff.pixels > 300);
    assert.ok(diff.mean < 4, `fine opacity steps preserve the golden pulse (${diff.mean.toFixed(2)}/255)`);
  }
  const canvas = createCanvas(280, 160), c = canvas.getContext('2d');
  let fills = 0, arcs = 0, last = '', disconnected = true;
  const fill = c.fill.bind(c), move = c.moveTo.bind(c), arc = c.arc.bind(c);
  c.fill = (...args: Parameters<typeof c.fill>) => { fills++; return fill(...args); };
  c.moveTo = (x: number, y: number) => { last = 'move'; move(x, y); };
  c.arc = (...args: Parameters<typeof c.arc>) => { if (last !== 'move') disconnected = false; last = 'arc'; arcs++; arc(...args); };
  drawForestFireflies(ctx2d(c), dust, 1.7);
  assert.ok(fills <= 32, `at most two fills per brightness bin, not 90 (${fills})`);
  assert.ok(arcs > 40, 'both the aura and the core of visible fireflies remain');
  assert.ok(disconnected, 'each halo starts a new sub-path, no connecting web');
});

function puffReference(c: CanvasRenderingContext2D, p: Particle) {
  const a = Math.max(0, p.life / p.max), t = 1 - a;
  const fade = Math.min(1, t * 5) * Math.min(1, a * 2.5);
  c.save(); c.translate(p.x, p.y); c.rotate(p.rot); c.globalAlpha = fade;
  const s = p.size;
  const lobes = [[0, 0, 1], [-0.55, 0.15, 0.7], [0.55, 0.1, 0.72], [0.1, -0.5, 0.65], [-0.2, 0.45, 0.6]];
  c.fillStyle = 'rgba(120,150,190,0.45)';
  for (const [x, y, r] of lobes) { c.beginPath(); c.arc(x * s + 3, y * s + 4, r * s, 0, TAU); c.fill(); }
  c.fillStyle = cssColor(p.color);
  for (const [x, y, r] of lobes) { c.beginPath(); c.arc(x * s, y * s, r * s, 0, TAU); c.fill(); }
  c.fillStyle = 'rgba(255,255,255,0.9)'; c.beginPath(); c.arc(-s * 0.25, -s * 0.3, s * 0.4, 0, TAU); c.fill(); c.restore();
}

test('Dora clouds keep translucent overlap and highlights while opaque bodies batch', () => {
  const puff: Particle = { kind: 'puff', x: 70, y: 70, vx: 0, vy: 0, life: 1, max: 1, size: 18, color: '255,255,255', rot: 0, vr: 0, g: 0 };
  for (const life of [1, 0.7, 0.35, 0.1]) {
    puff.life = life;
    const paint = (draw: (c: CanvasRenderingContext2D, p: Particle) => void) => {
      const canvas = createCanvas(140, 140), c = canvas.getContext('2d');
      c.fillStyle = '#142e38'; c.fillRect(0, 0, 140, 140);
      draw(ctx2d(c), puff);
      return c.getImageData(0, 0, 140, 140).data;
    };
    const diff = visibleDifference(paint(puffReference), paint((c, p) => drawFxParticle(c, p, 0)));
    assert.ok(diff.mean < 1.5, `cloud stays layered at life ${life} (${diff.mean.toFixed(2)}/255)`);
  }
  const canvas = createCanvas(140, 140), c = canvas.getContext('2d');
  const fill = c.fill.bind(c); let fills = 0;
  c.fill = (...args: Parameters<typeof c.fill>) => { fills++; return fill(...args); };
  puff.life = 0.7; drawFxParticle(ctx2d(c), puff, 0);
  assert.equal(fills, 7, 'five shadows, one opaque cloud silhouette and one highlight');
  fills = 0; puff.life = 0.2; drawFxParticle(ctx2d(c), puff, 0);
  assert.equal(fills, 11, 'separate translucent lobes preserve their overlapping depth');
});

test('Dora vortex keeps its motion and additive speed lines using six strokes', () => {
  const paint = (time: number) => {
    const canvas = createCanvas(200, 240), c = canvas.getContext('2d');
    c.fillStyle = '#142e38'; c.fillRect(0, 0, 200, 240); c.translate(100, 40);
    let strokes = 0;
    const stroke = c.stroke.bind(c);
    c.stroke = (...args: Parameters<typeof c.stroke>) => { strokes++; return stroke(...args); };
    drawProjectileExtra4(ctx2d(c), 'dora', 50, time, false);
    return { pixels: c.getImageData(0, 0, 200, 240).data, strokes };
  };
  const a = paint(0.05), b = paint(0.11);
  assert.equal(a.strokes, 6, 'four rings, one path of curls, one path of speed lines');
  assert.ok(visibleDifference(a.pixels, b.pixels).mean > 3, 'the vortex and trailing lines continue to animate');
});

test('heavy projectile trails keep their 60 Hz density at 30, 60 and 120 Hz', () => {
  const originalRandom = Math.random;
  Math.random = () => 0.1; // every optional emitter fires, making counts deterministic
  try {
    const scenarios = [
      ['snowball', (fx: SetSevenFx) => new SnowballShot(fx.g, 210, 500)],
      ['bee', (fx: SetSevenFx) => new BeeSwarm(fx.g, 210, 500)],
      ['sakura', (fx: SetSevenFx) => new SakuraShot(fx.g, 210, 500)],
      ['card', (fx: SetSevenFx) => new CardShot(fx.g, 210, 500, 1)],
      ['cryo', (fx: SetSevenFx) => new CryoShot(fx.g, 210, 500)],
    ] as const;
    for (const [name, make] of scenarios) {
      const emit = (hz: number) => {
        const fx = new SetSevenFx(), shot = make(fx);
        for (let i = 0; i < hz; i++) shot.trail(1 / hz);
        return fx.particles.list.length;
      };
      assert.equal(emit(30), 180, `${name}: the original three types of trail remain`);
      assert.equal(emit(60), 180, `${name}: 60 Hz density is unchanged`);
      for (const hz of [90, 120, 144]) {
        assert.equal(emit(hz), 180, `${name}: a ${hz} Hz display no longer multiplies particles`);
      }
      const fx = new SetSevenFx(), shot = make(fx);
      shot.trail(0);
      assert.equal(fx.particles.list.length, 0, `${name}: no emission while time is stopped`);
    }
    const beamCount = (hz: number) => {
      const fx = new SetSevenFx();
      const beam = new FreezeBeam(fx.g, 210, 500);
      beam.fired = true; beam.mode = 'hit'; beam.endY = 280;
      for (let i = 0; i < hz * 0.3; i++) beam.update(1 / hz);
      return fx.particles.list.length;
    };
    assert.equal(beamCount(30), beamCount(60), 'freeze beam retains its sparks, snow and mist at 30 Hz');
    assert.equal(beamCount(120), beamCount(60), 'freeze beam no longer doubles those particles at 120 Hz');

    const travel = (hz: number) => {
      const fx = new SetSevenFx(), shot = new SnowballShot(fx.g, 210, 500);
      for (let i = 0; i < hz * 0.1; i++) shot.update(1 / hz);
      return { y: shot.y, rot: shot.rot };
    };
    for (const hz of [30, 120]) {
      assert.ok(Math.abs(travel(hz).y - travel(60).y) < 1e-8, 'projectile movement remains frame-rate independent');
      assert.ok(Math.abs(travel(hz).rot - travel(60).rot) < 1e-8, 'snowball rotation still advances every update');
    }
  } finally {
    Math.random = originalRandom;
  }
});

test('other slide-3 weapons cap only old cosmetics, never callbacks or custom artwork', () => {
  for (const weapon of ['snowball', 'sakura', 'bee', 'rpg'] as const) {
    const fx = new SetSevenFx(); fx.weaponId = weapon;
    const faded = fx.particles.add({ k: K.STAR, life: 0.2, max: 1 });
    let died = false;
    const protectedParticles = [
      fx.particles.add({ k: K.SPARK, life: 1, die: () => { died = true; } }),
      fx.particles.add({ k: K.SPARK, life: 1, target: { x: 200, y: 200 } }),
      fx.particles.add({ k: K.SPARK, life: 1, data: { important: true } }),
      fx.particles.add({ k: K.SPARK, life: 1, draw: () => {} }),
      fx.particles.add({ k: K.CUSTOM, life: 1 }),
      fx.particles.add({ k: K.RING, life: 1 }),
      fx.particles.add({ k: K.GLOW, life: 1 }),
    ];
    let newest = faded;
    for (let i = 0; i < SLIDE_THREE_PARTICLE_BUDGET + 50; i++) newest = fx.particles.add({ k: K.STAR, life: 1, x: i });
    fx.update(0);
    assert.equal(fx.particles.list.length, SLIDE_THREE_PARTICLE_BUDGET);
    assert.ok(!fx.particles.list.includes(faded), `${weapon}: faded debris goes first`);
    for (const p of [...protectedParticles, newest]) assert.ok(fx.particles.list.includes(p), `${weapon}: protected/fresh particle survives`);
    assert.equal(died, false);
    // A hit may create its burst after update; draw must trim before painting.
    for (let i = 0; i < 30; i++) fx.particles.add({ k: K.SMOKE, life: 1 });
    fx.particles.draw = () => {};
    fx.draw({} as CanvasRenderingContext2D);
    assert.equal(fx.particles.list.length, SLIDE_THREE_PARTICLE_BUDGET);
    assert.ok(protectedParticles.every((p) => fx.particles.list.includes(p)));
  }
  const protectedOnly = new SetSevenFx(); protectedOnly.weaponId = 'sakura';
  for (let i = 0; i < SLIDE_THREE_PARTICLE_BUDGET + 5; i++) protectedOnly.particles.add({ k: K.CUSTOM, life: 1 });
  protectedOnly.update(0);
  assert.equal(protectedOnly.particles.list.length, SLIDE_THREE_PARTICLE_BUDGET + 5, 'protected art may exceed the best-effort limit');
});
