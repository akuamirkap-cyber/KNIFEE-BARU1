import test from 'node:test';
import assert from 'node:assert/strict';
import { installCanvasShim } from './supportCanvas';

/**
 * Slide-7's particle layer is what actually paints SET 2..5 on slide 1, and it
 * used to draw every droplet and every spark with its own path: Paintball (66
 * droplets a hit, eight hits a second) asked the canvas for ~1000 fills a
 * second from the droplet layer alone, which is the "ngelag pas nembak" of that
 * gun. These tests pin the batching contract down — same dots on screen, a
 * handful of paths.
 */

const restore = installCanvasShim();
const { K, Particles } = await import('../games/game-4/src/game/particles.ts');

interface Recorded {
  counts: Record<string, number>;
  /** Operation sequence, so path continuity can be checked. */
  ops: string[];
  ellipses: { x: number; y: number; rx: number; ry: number; rot: number }[];
  arcs: { x: number; y: number; r: number }[];
  lines: { x1: number; y1: number; x2: number; y2: number }[];
  fills: string[];
  strokes: { style: string; width: number }[];
}

function recorder() {
  const rec: Recorded = { counts: {}, ops: [], ellipses: [], arcs: [], lines: [], fills: [], strokes: [] };
  let fillStyle = '';
  let strokeStyle = '';
  let lineWidth = 1;
  let last = { x: 0, y: 0 };
  const bump = (op: string) => { rec.counts[op] = (rec.counts[op] ?? 0) + 1; };
  const ctx = {
    canvas: { width: 420, height: 760 },
    globalAlpha: 1,
    globalCompositeOperation: 'source-over',
    lineCap: 'butt',
    lineJoin: 'miter',
    get fillStyle() { return fillStyle; },
    set fillStyle(v: string) { fillStyle = v; },
    get strokeStyle() { return strokeStyle; },
    set strokeStyle(v: string) { strokeStyle = v; },
    get lineWidth() { return lineWidth; },
    set lineWidth(v: number) { lineWidth = v; },
    save: () => bump('save'),
    restore: () => bump('restore'),
    beginPath: () => bump('beginPath'),
    closePath: () => bump('closePath'),
    translate: () => bump('translate'),
    rotate: () => bump('rotate'),
    scale: () => bump('scale'),
    clip: () => bump('clip'),
    moveTo: (x: number, y: number) => { bump('moveTo'); rec.ops.push(`moveTo ${x.toFixed(2)} ${y.toFixed(2)}`); last = { x, y }; },
    lineTo: (x: number, y: number) => { bump('lineTo'); rec.lines.push({ x1: last.x, y1: last.y, x2: x, y2: y }); last = { x, y }; },
    arc: (x: number, y: number, r: number) => { bump('arc'); rec.ops.push('arc'); rec.arcs.push({ x, y, r }); },
    ellipse: (x: number, y: number, rx: number, ry: number, rot: number) => {
      bump('ellipse');
      rec.ops.push('ellipse');
      rec.ellipses.push({ x, y, rx, ry, rot });
    },
    quadraticCurveTo: () => bump('quadraticCurveTo'),
    bezierCurveTo: () => bump('bezierCurveTo'),
    rect: () => bump('rect'),
    fillRect: () => bump('fillRect'),
    strokeRect: () => bump('strokeRect'),
    clearRect: () => bump('clearRect'),
    fill: () => { bump('fill'); rec.fills.push(fillStyle); },
    stroke: () => { bump('stroke'); rec.strokes.push({ style: strokeStyle, width: lineWidth }); },
    drawImage: () => bump('drawImage'),
    fillText: () => bump('fillText'),
    strokeText: () => bump('strokeText'),
    createLinearGradient: () => ({ addColorStop: () => {} }),
    createRadialGradient: () => ({ addColorStop: () => {} }),
    measureText: () => ({ width: 8 }),
  };
  return { ctx: ctx as unknown as CanvasRenderingContext2D, rec };
}

const droplet = (i: number, color: string, life = 1, size = 3, data?: string) => ({
  k: K.DROP,
  x: 100 + (i % 40) * 5,
  y: 200 + (i % 17) * 7,
  vx: (i % 7) - 3,
  vy: 120 + (i % 11) * 20,
  life,
  max: 1,
  size,
  color,
  data,
});

test('a paintball-sized droplet layer collapses into a handful of fills', () => {
  const ps = new Particles();
  const palette = ['244,63,94', '250,204,21', '34,211,238', '168,85,247', '74,222,128'];
  for (let i = 0; i < 400; i++) ps.add(droplet(i, palette[i % palette.length], 0.05 + (i % 20) / 20));

  const { ctx, rec } = recorder();
  ps.draw(ctx, false);

  assert.equal(rec.ellipses.length, 400, 'every live droplet is still painted');
  assert.ok((rec.counts.fill ?? 0) <= 40, `expected batched fills, got ${rec.counts.fill}`);
  assert.ok((rec.counts.stroke ?? 0) <= 40, `expected batched outlines, got ${rec.counts.stroke}`);
  assert.equal(rec.counts.save, undefined, 'batching needs no save/restore per droplet');
  assert.equal(rec.counts.translate, undefined, 'ellipse() carries the angle itself');
});

test('droplets keep their stretch, angle, colour and gloss', () => {
  const ps = new Particles();
  ps.add(droplet(0, '244,63,94', 1, 4));
  const { ctx, rec } = recorder();
  ps.draw(ctx, false);

  assert.equal(rec.ellipses.length, 1);
  const e = rec.ellipses[0];
  assert.equal(e.x, 100);
  // Whatever the velocity, the droplet is stretched along its own heading.
  assert.ok(Math.abs(e.rot - Math.atan2(120, -3)) < 1e-9, 'angle follows the velocity');
  assert.equal(e.ry, 4, 'the cross-section keeps the droplet size');
  assert.ok(e.rx > e.ry, 'stretched, never squashed');
  assert.equal(rec.arcs.length, 1, 'one gloss speck on a 4px droplet');
  assert.ok(rec.fills.some((f) => f.startsWith('rgba(244,63,94,')), 'body keeps the shot colour');
  assert.ok(rec.fills.some((f) => f === 'rgba(255,255,255,0.9)'), 'gloss is white');
});

test('sub-pixel gloss is skipped, faded droplets are not drawn', () => {
  const ps = new Particles();
  ps.add(droplet(0, '244,63,94', 1, 1.2));   // too small for a gloss speck
  ps.add(droplet(1, '244,63,94', 0.005, 4)); // almost gone
  const { ctx, rec } = recorder();
  ps.draw(ctx, false);

  assert.equal(rec.ellipses.length, 1, 'only the visible droplet is painted');
  assert.equal(rec.arcs.length, 0, 'no invisible gloss');
});

test('every batched droplet starts its own sub-path (no paint web)', () => {
  // A canvas joins the current point to an arc's start when a subpath is open,
  // so chaining ellipses filled the lines between droplets: that web of
  // triangles was the "paintball effect glitch". Each shape must be preceded by
  // its own moveTo.
  const ps = new Particles();
  for (let i = 0; i < 60; i++) ps.add(droplet(i, '244,63,94', 1, 4));
  const { ctx, rec } = recorder();
  ps.draw(ctx, false);

  const shapes = rec.ops.filter((o) => o === 'ellipse' || o === 'arc');
  assert.equal(shapes.length, 120, '60 droplet bodies + 60 gloss dots');
  for (let i = 0; i < rec.ops.length; i++) {
    if (rec.ops[i] !== 'ellipse' && rec.ops[i] !== 'arc') continue;
    assert.ok(rec.ops[i - 1]?.startsWith('moveTo'), `shape ${i} must be a fresh sub-path, got ${rec.ops[i - 1]}`);
  }
});

test('sparks batch into one stroke per colour + alpha + width', () => {
  const ps = new Particles();
  for (let i = 0; i < 300; i++) {
    ps.add({
      k: K.SPARK,
      x: 50 + (i % 30) * 4,
      y: 300 + (i % 13) * 6,
      vx: 40,
      vy: -80,
      life: 0.05 + (i % 10) / 10,
      max: 1,
      size: 2,
      color: i % 2 ? '255,255,255' : '150,230,255',
      len: 0.03,
    });
  }
  const { ctx, rec } = recorder();
  ps.draw(ctx, false);

  assert.equal(rec.lines.length, 300, 'every spark is still a line');
  assert.ok((rec.counts.stroke ?? 0) <= 40, `expected batched strokes, got ${rec.counts.stroke}`);
});

test('additive and back-layer droplets keep their own render pass', () => {
  const ps = new Particles();
  ps.add(droplet(0, '244,63,94', 1, 4));
  ps.add({ ...droplet(1, '244,63,94', 1, 4), add: true });
  ps.add({ ...droplet(2, '244,63,94', 1, 4), back: true });

  const front = recorder();
  ps.draw(front.ctx, false);
  assert.equal(front.rec.ellipses.length, 2, 'the plain droplet (batched) + the additive one (own pass)');
  assert.equal(front.rec.counts.save, 1, 'only the additive droplet pays for save/restore');

  const rear = recorder();
  ps.draw(rear.ctx, true);
  assert.equal(rear.rec.ellipses.length, 1, 'the back-layer droplet is drawn by its own pass');
  assert.equal(rear.rec.counts.save, 1);
});

restore();
