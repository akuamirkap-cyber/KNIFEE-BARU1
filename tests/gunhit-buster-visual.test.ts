import test from 'node:test';
import assert from 'node:assert/strict';
import { createCanvas } from '@napi-rs/canvas';
import { BUSTER_PELLET_RADIUS, drawBusterPellet, drawBusterPelletOrb } from '../games/game-8/src/game/weapons/busterPellet';
import { drawPlasmaOrb, YELLOW_PLASMA_ORB } from '../games/game-4/src/game/shapes3';
import { drawSprite, glowSprite, TAU } from '../games/game-4/src/game/core';

const env = globalThis as unknown as Record<string, unknown>;
const oldDocument = env.document;
env.document = { createElement: () => createCanvas(1, 1) };
test.after(() => { if (oldDocument === undefined) delete env.document; else env.document = oldDocument; });
const ctx = (c: ReturnType<typeof createCanvas>) => c.getContext('2d') as unknown as CanvasRenderingContext2D;
const pixel = (c: ReturnType<typeof createCanvas>, x: number, y: number) => Array.from(c.getContext('2d').getImageData(x, y, 1, 1).data);

test('Mega Buster tap flies and sticks as the same golden, glowing animated orb', () => {
  const a = createCanvas(160, 180), b = createCanvas(160, 180), animated = createCanvas(160, 180);
  for (const cv of [a, b, animated]) {
    const c = cv.getContext('2d'); c.fillStyle = '#081520'; c.fillRect(0, 0, 160, 180);
  }
  assert.equal(BUSTER_PELLET_RADIUS, 14, 'retain the explicitly requested doubled projectile size');
  const flight = ctx(a), stuck = ctx(b);
  drawBusterPellet(flight, { x: 80, y: 55, age: 0.4 });
  drawBusterPelletOrb(stuck, 80, 55, 0.4);
  drawBusterPelletOrb(ctx(animated), 80, 55, 1.2);

  const halo = pixel(b, 110, 55), background = pixel(b, 150, 55);
  assert.ok(halo[0] > background[0] + 8 && halo[1] > background[1] + 5, `a visible yellow halo extends beyond the core: ${halo}`);
  assert.ok(halo[0] - background[0] > (halo[2] - background[2]) + 10
    && halo[1] - background[1] > (halo[2] - background[2]) + 5, 'the added glow is yellow/gold, not blue or white');
  const core = pixel(b, 80, 55);
  assert.ok(core[0] > 190 && core[1] > 140 && core[2] < core[0], `the core is a bright golden pellet: ${core}`);
  // Above the centre there is no flight trail, so both renderers share the
  // exact same core and aura. Below it, only the flying shot has a tail.
  assert.deepEqual(pixel(a, 80, 50), pixel(b, 80, 50));
  assert.ok(pixel(a, 80, 105)[0] > pixel(b, 80, 105)[0] + 8, 'only flight leaves the golden trail');
  assert.notDeepEqual(b.getContext('2d').getImageData(60, 35, 40, 40).data,
    animated.getContext('2d').getImageData(60, 35, 40, 40).data, 'orbiting filaments/glints animate');
});

test('the shared orb respects caller opacity and restores canvas state', () => {
  const cv = createCanvas(120, 120), c = ctx(cv);
  c.globalAlpha = 0.4; c.globalCompositeOperation = 'source-over';
  drawBusterPelletOrb(c, 60, 60, 0.7);
  assert.equal(c.globalAlpha, 0.4);
  assert.equal(c.globalCompositeOperation, 'source-over');
  const center = pixel(cv, 60, 60);
  assert.ok(center[3] > 0 && center[3] < 255, `a fading rock cell also fades the orb: ${center}`);
});

/** Original green Plasma renderer, recorded before introducing color palettes. */
function referenceGreenPlasma(c: CanvasRenderingContext2D, x: number, y: number, r: number, t: number, power: number) {
  c.save(); c.globalCompositeOperation = 'lighter';
  drawSprite(c, glowSprite('40,255,140'), x, y, r * 6.4, 0.6 * power);
  drawSprite(c, glowSprite('170,255,210'), x, y, r * 3, 0.5 * power);
  c.restore();
  const g = c.createRadialGradient(x - r * 0.25, y - r * 0.3, r * 0.1, x, y, r);
  g.addColorStop(0, '#ffffff'); g.addColorStop(0.35, '#c9ffdc');
  g.addColorStop(0.7, '#33e87c'); g.addColorStop(1, '#08863f');
  c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
  c.save(); c.beginPath(); c.arc(x, y, r, 0, TAU); c.clip();
  c.globalCompositeOperation = 'lighter'; c.lineCap = 'round';
  for (let k = 0; k < 3; k++) {
    c.strokeStyle = `rgba(215,255,228,${0.6 - k * 0.14})`; c.lineWidth = r * 0.2;
    const a = t * (5 + k * 1.7) + k * 2.1;
    c.beginPath(); c.arc(x + Math.cos(a) * r * 0.2, y + Math.sin(a) * r * 0.2, r * (0.42 + k * 0.17), a, a + 1.7); c.stroke();
  }
  c.restore(); c.strokeStyle = 'rgba(190,255,215,0.9)'; c.lineWidth = Math.max(0.8, r * 0.08);
  c.beginPath(); c.arc(x, y, r, 0, TAU); c.stroke();
}

test('the original green Plasma orb is pixel-identical after sharing its renderer', () => {
  for (const [r, t, power] of [[10.5, 0, 1.1], [14, 0.8, 1.1], [12, 2.4, 0.9]]) {
    const expected = createCanvas(180, 180), actual = createCanvas(180, 180);
    for (const cv of [expected, actual]) { const c = cv.getContext('2d'); c.fillStyle = '#10202c'; c.fillRect(0, 0, 180, 180); }
    referenceGreenPlasma(ctx(expected), 90, 90, r, t, power);
    drawPlasmaOrb(ctx(actual), 90, 90, r, t, power);
    assert.deepEqual(actual.getContext('2d').getImageData(0, 0, 180, 180).data,
      expected.getContext('2d').getImageData(0, 0, 180, 180).data);
  }
});

test('the yellow tap uses Plasma Gun’s three clipped swirling arcs and a crackling bolt', () => {
  const time = 0.4, x = 80, y = 70;
  const r = BUSTER_PELLET_RADIUS * (1 + 0.12 * Math.sin(time * 9));
  const actualArcs: number[][] = [], plasmaArcs: number[][] = [];
  let lines = 0;
  function recording(arcs: number[][]) {
    const c = ctx(createCanvas(180, 180));
    return new Proxy(c, { get(target, key) {
      const value = Reflect.get(target, key, target);
      if (key === 'arc') return (...args: number[]) => { arcs.push(args); (target.arc as (...n: number[]) => void)(...args); };
      if (key === 'lineTo') return (px: number, py: number) => { lines++; target.lineTo(px, py); };
      return typeof value === 'function' ? value.bind(target) : value;
    }, set: (target, key, value) => Reflect.set(target, key, value, target) });
  }
  drawBusterPelletOrb(recording(actualArcs), x, y, time);
  // Providing a sprite skips only the static core, exactly as the cached Buster
  // does; all clipped arcs and the bright rim are the real Plasma geometry.
  const blank = createCanvas(32, 32) as unknown as HTMLCanvasElement;
  drawPlasmaOrb(recording(plasmaArcs), x, y, r, time * 1.8, 1.1, YELLOW_PLASMA_ORB, blank);
  assert.equal(actualArcs.length, 5, 'one clipping circle, three swirling arcs and the outer rim');
  assert.deepEqual(actualArcs, plasmaArcs);
  assert.equal(lines, 8, 'one shared lightning path receives three glow strokes');
});
