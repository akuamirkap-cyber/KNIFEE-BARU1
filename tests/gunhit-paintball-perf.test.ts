import test from 'node:test';
import assert from 'node:assert/strict';
import { drawDropParticles, type Particle } from '../src/games/gunhit/game/fx';
import { drawPreciseWeaponDecal } from '../src/games/gunhit/game/art/decalSystem';
import { getWeapon } from '../src/games/gunhit/game/weapons';

/**
 * Paintball is the game's busiest rapid-fire gun (8.3 shots a second, one
 * colour per shot, ten droplets per hit) and its droplet layer used to be one
 * `fill()` per droplet. These tests pin the batching contract down: the picture
 * has to stay the same while the call count collapses.
 */

function drop(x: number, size: number, color: string, alpha: number): Particle {
  return { x, y: 100, vx: 0, vy: -250, life: alpha, max: 1, size, color, kind: 'drop', rot: 0, vr: 0, g: 1100 };
}

/** A recording 2D context: counts the calls a real canvas would receive. */
function recorder() {
  const count: Record<string, number> = {};
  const ellipses: { x: number; y: number; rx: number; ry: number; rot: number }[] = [];
  const arcs: { x: number; y: number; r: number }[] = [];
  const fills: { style: string; alpha: number }[] = [];
  const seen: string[] = [];
  const bump = (op: string) => { count[op] = (count[op] ?? 0) + 1; seen.push(op); };
  const ctx = {
    _fillStyle: '',
    _alpha: 1,
    get fillStyle() { return this._fillStyle; },
    set fillStyle(v: string) { this._fillStyle = v; },
    get globalAlpha() { return this._alpha; },
    set globalAlpha(v: number) { this._alpha = v; },
    save: () => bump('save'),
    restore: () => bump('restore'),
    beginPath: () => bump('beginPath'),
    fill: () => { bump('fill'); fills.push({ style: ctx._fillStyle, alpha: ctx._alpha }); },
    ellipse: (x: number, y: number, rx: number, ry: number, rot: number) => {
      bump('ellipse');
      ellipses.push({ x, y, rx, ry, rot });
    },
    arc: (x: number, y: number, r: number) => { bump('arc'); arcs.push({ x, y, r }); },
  };
  return { ctx: ctx as unknown as CanvasRenderingContext2D, count, ellipses, arcs, fills, seen };
}

test('droplet layer batches one fill per colour + alpha step', () => {
  const drops = Array.from({ length: 120 }, (_, i) => drop(i * 3, 5, 'rgb(244,63,94)', (i % 8 + 1) / 16));
  const { ctx, count } = recorder();
  drawDropParticles(ctx, drops);

  assert.equal(count.ellipse, 120, 'every live droplet is still drawn');
  assert.equal(count.fill, 16, '8 droplet bodies + 8 gloss overlays, not 240 fills');
  assert.equal(count.beginPath, 16);
  assert.equal(count.save, 1);
  assert.equal(count.restore, 1);
});

test('droplets of different colours never share a fill', () => {
  const drops = [
    drop(0, 4, 'rgb(244,63,94)', 1),
    drop(20, 4, 'rgb(250,204,21)', 1),
    drop(40, 4, 'rgb(34,211,238)', 1),
  ];
  const { ctx, fills, ellipses } = recorder();
  drawDropParticles(ctx, drops);
  assert.equal(ellipses.length, 3);
  // One body fill per colour (three distinct opaque colours -> three fills).
  const bodyFills = fills.filter((f) => f.style !== 'rgba(255,255,255,0.7)');
  assert.equal(bodyFills.length, 3);
  // Bare `rgb(...)` palettes are normalised to rgba, exactly like the
  // single-particle path, so a half-transparent droplet still fades.
  assert.deepEqual(
    bodyFills.map((f) => f.style).sort(),
    ['rgba(244,63,94,1)', 'rgba(250,204,21,1)', 'rgba(34,211,238,1)'].sort(),
  );
});

test('near-invisible droplets are skipped and gloss only lands on big ones', () => {
  const drops = [
    drop(0, 2.5, 'rgb(244,63,94)', 0.02),   // faded out: skipped
    drop(10, 2.5, 'rgb(244,63,94)', 1),     // small: body only
    drop(20, 5, 'rgb(244,63,94)', 1),       // big: body + gloss
  ];
  const { ctx, ellipses, arcs, fills } = recorder();
  drawDropParticles(ctx, drops);
  assert.equal(ellipses.length, 2, 'the faded droplet is not drawn');
  assert.equal(arcs.length, 1, 'only the droplet at/above 3.4px keeps its gloss');
  assert.equal(arcs[0].r, 5 * 0.22);
  assert.equal(fills.filter((f) => f.style === 'rgba(255,255,255,0.7)').length, 1);
});

test('the droplet keeps its stretch, angle and fade', () => {
  const { ctx, ellipses, fills } = recorder();
  drawDropParticles(ctx, [drop(30, 4, '#f43f5e', 0.75)]);
  assert.equal(ellipses.length, 1);
  const e = ellipses[0];
  assert.equal(e.x, 30);
  assert.equal(e.ry, 4 * 0.7, 'height is 70% of the droplet size');
  assert.ok(Math.abs(e.rot + Math.PI / 2) < 1e-9, 'angle follows the velocity (straight up here)');
  const body = fills.find((f) => f.style !== 'rgba(255,255,255,0.7)')!;
  assert.equal(body.style, 'rgba(244,63,94,1)', 'hex colours are normalised like the single-particle path');
});

test('buckets are reused between frames without leaking stale droplets', () => {
  const { ctx, count } = recorder();
  const many = Array.from({ length: 40 }, (_, i) => drop(i * 5, 4, 'rgb(96,165,250)', 1));
  drawDropParticles(ctx, many);
  assert.equal(count.ellipse, 40);

  // Next frame only three of those droplets are alive: the shared scratch must
  // not redraw the other 37.
  count.ellipse = 0;
  count.fill = 0;
  drawDropParticles(ctx, many.slice(0, 3));
  assert.equal(count.ellipse, 3, 'no droplets carried over from the previous frame');
  assert.equal(count.fill, 2, 'one body fill + one gloss fill');

  // A frame with no droplets at all must draw nothing.
  count.ellipse = 0;
  count.fill = 0;
  drawDropParticles(ctx, []);
  assert.equal(count.ellipse, 0);
  assert.equal(count.fill, 0);
  assert.equal(count.save, 2, 'an empty frame does not even save the context');
});

test('a real paintball-sized burst costs a handful of fills', () => {
  // 8.3 shots a second x 10 droplets, five palette colours, mixed ages.
  const palette = ['rgb(244,63,94)', 'rgb(250,204,21)', 'rgb(34,211,238)', 'rgb(168,85,247)', 'rgb(74,222,128)'];
  const drops: Particle[] = [];
  for (let i = 0; i < 250; i++) {
    drops.push(drop(i % 400, 2 + (i % 5), palette[i % palette.length], ((i * 7) % 100) / 100));
  }
  const { ctx, count } = recorder();
  drawDropParticles(ctx, drops);
  assert.ok(count.ellipse >= 200, 'droplets are still drawn');
  assert.ok(count.fill <= 80, `expected batched fills, got ${count.fill}`);
  assert.equal(count.save, 1);
});

test('the splat on the wheel is the colour that was fired', () => {
  const styles: string[] = [];
  const ctx = {
    _fillStyle: '',
    get fillStyle() { return this._fillStyle; },
    set fillStyle(v: string) { this._fillStyle = v; styles.push(v); },
    globalAlpha: 1, strokeStyle: '', lineWidth: 1, lineCap: 'butt', lineJoin: 'miter', globalCompositeOperation: 'source-over',
    filter: 'none', shadowBlur: 0, shadowColor: '',
    save() {}, restore() {}, beginPath() {}, closePath() {}, clip() {}, fill() {}, stroke() {},
    arc() {}, ellipse() {}, moveTo() {}, lineTo() {}, quadraticCurveTo() {}, bezierCurveTo() {}, rect() {}, roundRect() {},
    translate() {}, rotate() {}, scale() {}, setTransform() {}, clearRect() {}, fillRect() {}, strokeRect() {},
    createLinearGradient: () => ({ addColorStop() {} }), createRadialGradient: () => ({ addColorStop() {} }),
  } as unknown as CanvasRenderingContext2D;
  const paintball = getWeapon('paintball');

  drawPreciseWeaponDecal(ctx, 106, Math.PI / 2, paintball, 'wood', 1, '250,204,21');
  assert.ok(styles.includes('rgba(250,204,21, 0.75)'), `expected the yellow shot to leave yellow paint, got ${styles.join(' ')}`);

  // Without a tint (every other weapon) the decal keeps its own colour.
  styles.length = 0;
  drawPreciseWeaponDecal(ctx, 106, Math.PI / 2, paintball, 'wood', 1);
  assert.ok(styles.includes(`rgba(${paintball.trail}, 0.75)`), 'no tint means the weapon default');
});
