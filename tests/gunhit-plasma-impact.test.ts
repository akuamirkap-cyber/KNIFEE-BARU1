import test from 'node:test';
import assert from 'node:assert/strict';
import { createCanvas } from '@napi-rs/canvas';
import { BatchableWheelLightning, K, Particles } from '../games/game-4/src/game/particles';
import { drawBatchedWheelLightning, WheelLightningCache } from '../src/games/gunhit/game/batchedWheelLightning';
import {
  GREEN_PLASMA_IMPACT, PlasmaShot, spawnPlasmaImpact, YELLOW_PLASMA_IMPACT,
  type PlasmaImpactPalette,
} from '../games/game-4/src/game/projectiles3';
import { sfx } from '../games/game-4/src/game/audio';
import type { Game } from '../games/game-4/src/game/Game';

/** Fix randomness so the only difference between the two explosions is color. */
function capture(color: Readonly<PlasmaImpactPalette>, actualShot = false) {
  const random = Math.random;
  let seed = 123;
  Math.random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  const particles = new Particles(), fx: any[] = [], wheel: any[] = [], events: unknown[][] = [];
  const canvas = createCanvas(300, 300), c = canvas.getContext('2d'); c.translate(150, 150);
  const g = {
    wheel: { R: 96 }, particles,
    wheelImpact: (...a: unknown[]) => events.push(['wheelImpact', ...a]),
    hitStop: (...a: unknown[]) => events.push(['hitStop', ...a]),
    shake: (...a: unknown[]) => events.push(['shake', ...a]),
    flashScreen: (...a: unknown[]) => events.push(['flashScreen', ...a]),
    addFX: (f: unknown) => fx.push(f), addWheelFX: (f: unknown) => wheel.push(f),
    paint: (f: (ctx: CanvasRenderingContext2D) => void) => { events.push(['paint']); f(c as unknown as CanvasRenderingContext2D); },
    landed: (...a: unknown[]) => events.push(['landed', ...a]),
  } as unknown as Game;
  const muted = sfx.muted; sfx.muted = true;
  try {
    if (actualShot) new PlasmaShot(g, 210, 500).hit(1.3, 220, 300);
    else spawnPlasmaImpact(g, 1.3, 220, 300, color);
    return { particles: particles.list, fx, wheel, events, seed, pixels: c.getImageData(0, 0, 300, 300).data };
  } finally { Math.random = random; sfx.muted = muted; }
}

const noColor = (value: unknown) => JSON.parse(JSON.stringify(value, (key, v) => key === 'color' ? '<palette>' : v));

test('yellow impact has the exact Plasma Gun rings, rays, sparks and lightning geometry', () => {
  const green = capture(GREEN_PLASMA_IMPACT), yellow = capture(YELLOW_PLASMA_IMPACT);
  assert.equal(yellow.particles.length, 86);
  assert.equal(yellow.fx.length, 6); assert.equal(yellow.wheel.length, 9);
  assert.equal(yellow.fx[1].constructor.name, 'Rays'); assert.equal(yellow.fx[1].rays.length, 12);
  assert.deepEqual(yellow.particles.filter(p => p.k === K.RING).map(p => [p.size, p.size2, p.life, p.color]), [
    [6, 140, 0.45, '255,226,65'], [4, 84, 0.28, '255,255,255'], [3, 54, 0.24, '211,155,10'],
  ]);
  assert.deepEqual(noColor(yellow.particles), noColor(green.particles));
  assert.deepEqual(noColor(yellow.fx), noColor(green.fx));
  assert.deepEqual(noColor(yellow.wheel), noColor(green.wheel));
  assert.equal(yellow.seed, green.seed, 'same particle and bolt random draws');
  assert.notDeepEqual(yellow.pixels, green.pixels, 'the Plasma scorch itself also changes to yellow');
  assert.deepEqual(yellow.events, [['paint']], 'the shared helper never scores, stops, shakes or plays sound');
});

test('the original green Plasma projectile keeps its mechanics and authored hit recipe', () => {
  const direct = capture(GREEN_PLASMA_IMPACT), shot = capture(GREEN_PLASMA_IMPACT, true);
  assert.deepEqual(shot.particles, direct.particles);
  assert.deepEqual(shot.fx, direct.fx); assert.deepEqual(shot.wheel, direct.wheel);
  assert.deepEqual(shot.pixels, direct.pixels);
  assert.equal(shot.seed, 1903378481, 'the pre-refactor seeded Plasma recipe makes exactly the same random draws');
  assert.deepEqual(shot.particles.filter(p => p.k === K.RING).map(p => p.color), ['90,255,170', '255,255,255', '30,200,110']);
  assert.deepEqual(shot.events.map(e => e[0]), ['wheelImpact', 'hitStop', 'shake', 'flashScreen', 'paint', 'landed']);
  assert.deepEqual(shot.events[0], ['wheelImpact', 9, 'rgba(170,255,200,']);
  assert.deepEqual(shot.events[1], ['hitStop', 0.07]);
  assert.deepEqual(shot.events[3], ['flashScreen', '80,255,160', 0.18]);
});

test('overlapping yellow wheel lightning batches every bolt and branch without retaining canvas state', () => {
  const bolts = Array.from({ length: 14 }, (_, i) => {
    const bolt = new BatchableWheelLightning(0, 0, 20, 20, 0.5, '255,226,65', 1.5, 2);
    bolt.pts = [
      [i, 0, i + 1, 1, i + 2, 2],
      [i, 3, i + 1, 4, i + 2, 5],
      [i, 6, i + 1, 7, i + 2, 8],
    ];
    return bolt;
  });
  const canvas = createCanvas(80, 80), real = canvas.getContext('2d');
  let moves = 0, lines = 0, strokes = 0;
  const c = new Proxy(real as unknown as CanvasRenderingContext2D, { get(target, key) {
    const value = Reflect.get(target, key, target);
    if (key === 'moveTo') return (x: number, y: number) => { moves++; target.moveTo(x, y); };
    if (key === 'lineTo') return (x: number, y: number) => { lines++; target.lineTo(x, y); };
    if (key === 'stroke') return () => { strokes++; target.stroke(); };
    return typeof value === 'function' ? value.bind(target) : value;
  }, set: (target, key, value) => Reflect.set(target, key, value, target) });
  c.globalAlpha = 0.4; c.globalCompositeOperation = 'source-over';
  const random = Math.random; Math.random = () => 0.5;
  try { drawBatchedWheelLightning(c, bolts); } finally { Math.random = random; }
  assert.equal(moves, 42, '14 main paths and 28 branch paths remain');
  assert.equal(lines, 84, 'every segment is still drawn');
  assert.equal(strokes, 6, 'shared glow/core strokes replace 126 separate strokes');
  assert.equal(c.globalAlpha, 0.4); assert.equal(c.globalCompositeOperation, 'source-over');
});

test('rapid yellow lightning reuses its clipped cache and invalidates for a new hit', () => {
  const env = globalThis as unknown as Record<string, unknown>, previous = env.document;
  let created = 0, repainted = 0;
  let baked: ReturnType<typeof createCanvas> | undefined;
  env.document = { createElement: () => {
    created++; baked = createCanvas(1, 1);
    const actual = baked.getContext('2d');
    const record = new Proxy(actual as unknown as CanvasRenderingContext2D, { get(target, key) {
      const value = Reflect.get(target, key, target);
      if (key === 'clearRect') return (x: number, y: number, w: number, h: number) => { repainted++; target.clearRect(x, y, w, h); };
      return typeof value === 'function' ? value.bind(target) : value;
    }, set: (target, key, value) => Reflect.set(target, key, value, target) });
    Object.defineProperty(baked, 'getContext', { value: () => record });
    return baked;
  } };
  try {
    const c = createCanvas(300, 300).getContext('2d') as unknown as CanvasRenderingContext2D;
    const bolts = Array.from({ length: 14 }, (_, i) => new BatchableWheelLightning(i, 0, 40, 40, 0.5, '255,226,65', 1.5, 2));
    const cache = new WheelLightningCache();
    c.globalAlpha = 0.4; c.globalCompositeOperation = 'source-over';
    cache.draw(c, bolts, 96, 0);
    assert.equal(created, 1); assert.equal(repainted, 1); assert.equal(baked!.width, 192);
    c.scale(1.05, 1.05); // a breathing/kicking wheel must not reallocate each frame
    cache.draw(c, bolts, 96, 0.03);
    assert.equal(repainted, 1); assert.equal(baked!.width, 192);
    cache.draw(c, bolts, 96, 0.08);
    assert.equal(repainted, 2, 'the flickering lightning refreshes on world time');
    bolts.push(new BatchableWheelLightning(0, 0, 20, 20, 0.5, '255,226,65', 1.5, 2));
    cache.draw(c, bolts, 96, 0.081);
    assert.equal(repainted, 3, 'a new impact is visible immediately');
    cache.clear(); cache.draw(c, bolts, 96, 0.082);
    assert.equal(repainted, 4); assert.equal(created, 1, 'stage reset reuses the canvas without retaining the old bolt');
    assert.equal(c.globalAlpha, 0.4); assert.equal(c.globalCompositeOperation, 'source-over');
  } finally { if (previous === undefined) delete env.document; else env.document = previous; }
});
