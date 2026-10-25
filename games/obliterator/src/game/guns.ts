import type { WeaponTheme } from './types';
import type { GunRenderParams } from './weapons';
import { SPECTRUM, drawSnowflake, drawTwinkle, hsl } from './specialWeapons';

/**
 * REAL GUN SILHOUETTES (side view) floating, barrel pointing straight UP.
 *
 * Drawing happens in a local "side-view" frame:
 *   +X = along the barrel (muzzle at x = 118)
 *   +Y = down toward the grip
 * mapped so that +X → UP and +Y → LEFT.
 * Bore line is y = 0, so bullets leave exactly from screen-center.
 */

type C2D = CanvasRenderingContext2D;
type Pt = [number, number];
type Fill = string | CanvasGradient;

function pr(n: number): number {
  const s = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
  return s - Math.floor(s);
}

function lin(ctx: C2D, x0: number, y0: number, x1: number, y1: number, stops: [number, string][]) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  for (const [o, c] of stops) g.addColorStop(o, c);
  return g;
}

function metalY(ctx: C2D, y0: number, y1: number, hi: string, mid: string, dark: string) {
  return lin(ctx, 0, y0, 0, y1, [
    [0, dark],
    [0.14, hi],
    [0.42, mid],
    [0.86, dark],
    [1, dark],
  ]);
}

function gold(ctx: C2D, x0: number, y0: number, x1: number, y1: number) {
  return lin(ctx, x0, y0, x1, y1, [
    [0, '#6b470c'],
    [0.35, '#fff1b8'],
    [0.55, '#f5c542'],
    [1, '#7a5310'],
  ]);
}

function wood(ctx: C2D, x0: number, x1: number) {
  return lin(ctx, x0, 0, x1, 0, [
    [0, '#170d06'],
    [0.3, '#5b3a1e'],
    [0.6, '#43290f'],
    [1, '#120a04'],
  ]);
}

function steel(ctx: C2D, y0: number, y1: number) {
  return metalY(ctx, y0, y1, '#aebfd2', '#4a5866', '#161c23');
}

function poly(ctx: C2D, pts: number[]) {
  ctx.beginPath();
  ctx.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
  ctx.closePath();
}

function paint(ctx: C2D, fill: Fill, stroke?: string, lw = 1.5) {
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lw;
    ctx.stroke();
  }
}

function capsule(ctx: C2D, a: Pt, b: Pt, w: number, fill: string, outline: string, hi?: string) {
  ctx.save();
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(a[0], a[1]);
  ctx.lineTo(b[0], b[1]);
  ctx.strokeStyle = outline;
  ctx.lineWidth = w + 2.6;
  ctx.stroke();
  ctx.strokeStyle = fill;
  ctx.lineWidth = w;
  ctx.stroke();
  if (hi) {
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const l = Math.hypot(dx, dy) || 1;
    const nx = (dy / l) * w * 0.22;
    const ny = (-dx / l) * w * 0.22;
    ctx.beginPath();
    ctx.moveTo(a[0] + nx, a[1] + ny);
    ctx.lineTo(b[0] + nx, b[1] + ny);
    ctx.globalAlpha = 0.45;
    ctx.strokeStyle = hi;
    ctx.lineWidth = w * 0.3;
    ctx.stroke();
  }
  ctx.restore();
}

function glowDot(ctx: C2D, x: number, y: number, r: number, color: string, alpha = 1) {
  if (alpha <= 0.01) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = Math.min(1, alpha);
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.3, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function aura(ctx: C2D, x: number, y: number, r: number, rgba: string, E: number) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(x, y, 6, x, y, r);
  g.addColorStop(0, `${rgba}${0.24 * E})`);
  g.addColorStop(0.5, `${rgba}${0.07 * E})`);
  g.addColorStop(1, `${rgba}0)`);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function spectrumFill(ctx: C2D, start: number, x: number, y: number, r: number): Fill {
  const cols = [...SPECTRUM, SPECTRUM[0]];
  if (typeof ctx.createConicGradient === 'function') {
    const g = ctx.createConicGradient(start, x, y);
    cols.forEach((c, i) => g.addColorStop(i / (cols.length - 1), c));
    return g;
  }
  const g = ctx.createLinearGradient(x - r, y - r, x + r, y + r);
  cols.forEach((c, i) => g.addColorStop(i / (cols.length - 1), c));
  return g;
}

function rune(ctx: C2D, x: number, y: number, s: number, k: number, color: string, alpha: number) {
  const shapes: number[][][] = [
    [[0, -1, 0, 1], [0, -1, 0.7, -0.3], [0, 0, 0.7, 0.6]],
    [[-0.6, -1, 0.6, 1], [0.6, -1, -0.6, 1], [-0.8, 0, 0.8, 0]],
    [[0, -1, 0, 1], [-0.7, -0.5, 0.7, -0.5], [-0.5, 0.5, 0.5, 0.9]],
    [[-0.7, 1, 0, -1], [0, -1, 0.7, 1], [-0.4, 0.2, 0.4, 0.2]],
  ];
  const sh = shapes[k % shapes.length];
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineCap = 'round';
  for (const pass of [0, 1]) {
    ctx.globalAlpha = Math.min(1, alpha) * (pass === 0 ? 0.5 : 1);
    ctx.strokeStyle = pass === 0 ? color : '#ffffff';
    ctx.lineWidth = pass === 0 ? 3 : 0.9;
    ctx.beginPath();
    for (const [x0, y0, x1, y1] of sh) {
      ctx.moveTo(x + x0 * s, y + y0 * s);
      ctx.lineTo(x + x1 * s, y + y1 * s);
    }
    ctx.stroke();
  }
  ctx.restore();
}

function ammoPips(
  ctx: C2D,
  x0: number,
  y: number,
  ammoLeft: number,
  ammoTotal: number,
  step: number,
  color: (i: number) => string,
  time: number
) {
  const n = Math.min(12, Math.max(1, ammoTotal));
  const lit = Math.round((ammoLeft / Math.max(1, ammoTotal)) * n);
  for (let i = 0; i < n; i++) {
    const x = x0 + i * step;
    const on = i < lit;
    ctx.fillStyle = on ? color(i) : 'rgba(70,70,80,0.5)';
    ctx.beginPath();
    ctx.roundRect(x - 1.6, y - 2.4, 3.2, 4.8, 1.2);
    ctx.fill();
    if (on) glowDot(ctx, x, y, 4.5, color(i), 0.4 + 0.25 * Math.sin(time * 6 + i));
  }
}

function triggerGuard(ctx: C2D, x0: number, y0: number, x1: number, depth: number, col: Fill, dark: string) {
  ctx.save();
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.quadraticCurveTo(x0 - 6, y0 + depth, x0 + (x1 - x0) * 0.45, y0 + depth);
  ctx.quadraticCurveTo(x1 + 4, y0 + depth, x1, y0);
  ctx.strokeStyle = dark;
  ctx.lineWidth = 7;
  ctx.stroke();
  ctx.strokeStyle = col;
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.restore();
}

function trigger(ctx: C2D, x: number, y: number, pull: number, col: Fill, dark: string) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-pull * 0.35);
  ctx.beginPath();
  ctx.moveTo(-2, 0);
  ctx.quadraticCurveTo(5, 6, 1, 15);
  ctx.lineTo(-2, 14);
  ctx.quadraticCurveTo(1, 7, -5, 1);
  ctx.closePath();
  paint(ctx, col, dark, 1);
  ctx.restore();
}

// ============================================================================
// MUZZLE FX
// ============================================================================
interface FlashCols {
  core: string;
  mid: string;
  rgba: string;
  rainbow?: boolean;
}

function gunFlash(ctx: C2D, mx: number, my: number, mf: number, c: FlashCols, time: number, size = 1) {
  if (mf <= 0.01) return;
  const flick = Math.floor(time * 30);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.translate(mx, my);
  const fs = (0.7 + mf * 0.8) * size;
  ctx.scale(fs, fs);
  ctx.globalAlpha = Math.min(1, mf * 1.3);

  const bloom = ctx.createRadialGradient(18, 0, 0, 18, 0, 85);
  bloom.addColorStop(0, '#ffffff');
  bloom.addColorStop(0.28, c.mid);
  bloom.addColorStop(0.62, `${c.rgba}0.35)`);
  bloom.addColorStop(1, `${c.rgba}0)`);
  ctx.fillStyle = bloom;
  ctx.beginPath();
  ctx.arc(18, 0, 85, 0, Math.PI * 2);
  ctx.fill();

  for (let i = 0; i < 11; i++) {
    const ang = (i / 10 - 0.5) * 2.2;
    const len = (i % 2 === 0 ? 100 : 58) * (0.7 + pr(flick + i) * 0.6) * (1 - Math.abs(ang) * 0.25);
    ctx.save();
    ctx.rotate(ang);
    ctx.fillStyle = c.rainbow ? SPECTRUM[i % 7] : i % 3 === 0 ? '#ffffff' : c.mid;
    ctx.beginPath();
    ctx.moveTo(0, -4.5);
    ctx.lineTo(len, 0);
    ctx.lineTo(0, 4.5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  for (const d of [-1, 1]) {
    ctx.fillStyle = c.mid;
    ctx.beginPath();
    ctx.moveTo(-6, d * 4);
    ctx.lineTo(4, d * 34 * (0.8 + pr(flick + d) * 0.4));
    ctx.lineTo(10, d * 4);
    ctx.closePath();
    ctx.fill();
  }
  const core = ctx.createRadialGradient(10, 0, 0, 10, 0, 30);
  core.addColorStop(0, '#ffffff');
  core.addColorStop(0.5, c.core);
  core.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.ellipse(12, 0, 32, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2.5 * mf + 0.5;
  const r = 10 + (1 - mf) * 55;
  ctx.beginPath();
  ctx.ellipse(6, 0, r * 0.3, r, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function odRings(ctx: C2D, mx: number, color: (k: number) => string, time: number) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let k = 0; k < 3; k++) {
    const x = mx + 6 + k * 11 + Math.sin(time * 6 + k) * 2;
    const ry = 16 + k * 5 + Math.sin(time * 8 + k) * 2;
    ctx.strokeStyle = color(k);
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.ellipse(x, 0, ry * 0.28, ry, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }
  ctx.restore();
}

// ============================================================================
// 🔥 HELLFIRE JUDGE — demonic magnum revolver (crucible)
// ============================================================================
function drawRevolver(ctx: C2D, p: GunRenderParams, E: number) {
  const { time, recoil, muzzleFlash, overdrivePrimed: od, theme: th, heat } = p;
  const used = Math.max(0, p.ammoTotal - p.ammoLeft);

  aura(ctx, 40, 0, od ? 150 : 120, th.plasmaGlowRgba, E);

  // GRIP (birdshead, obsidian with hellfire veins)
  const gripPath = () => {
    ctx.beginPath();
    ctx.moveTo(-46, 10);
    ctx.lineTo(-12, 14);
    ctx.quadraticCurveTo(-16, 54, -32, 96);
    ctx.quadraticCurveTo(-44, 110, -64, 100);
    ctx.quadraticCurveTo(-62, 58, -54, 22);
    ctx.closePath();
  };
  gripPath();
  paint(
    ctx,
    lin(ctx, -66, 0, -12, 0, [
      [0, '#12090a'],
      [0.45, '#3a1a1d'],
      [0.7, '#2a1214'],
      [1, '#0e0607'],
    ]),
    '#050203',
    1.6
  );
  ctx.save();
  gripPath();
  ctx.clip();
  ctx.globalCompositeOperation = 'lighter';
  for (let k = 0; k < 4; k++) {
    ctx.strokeStyle = th.plasmaOuter;
    ctx.globalAlpha = 0.55 * (0.6 + 0.4 * Math.sin(time * 3 + k));
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    let x = -50 + k * 7;
    ctx.moveTo(x, 18);
    for (let yy = 26; yy <= 104; yy += 9) {
      x += (pr(k * 13 + yy) - 0.6) * 7;
      ctx.lineTo(x, yy);
    }
    ctx.stroke();
  }
  ctx.restore();
  ctx.beginPath();
  ctx.arc(-38, 58, 8.5, 0, Math.PI * 2);
  paint(ctx, '#1a0b0c', th.trimMetal, 1.8);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = th.plasmaMid;
  ctx.globalAlpha = 0.6 + 0.4 * Math.sin(time * 4);
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  for (let i = 0; i <= 5; i++) {
    const a = -Math.PI / 2 + ((i * 2) % 5) * ((Math.PI * 2) / 5);
    const px = -38 + Math.cos(a) * 6;
    const py = 58 + Math.sin(a) * 6;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();
  ctx.restore();
  ctx.beginPath();
  ctx.arc(-56, 104, 4, 0, Math.PI * 2);
  ctx.strokeStyle = th.trimMetal;
  ctx.lineWidth = 1.6;
  ctx.stroke();

  // FRAME
  poly(ctx, [-52, -8, -40, -20, 40, -20, 40, 22, 2, 24, -8, 22, -48, 18]);
  paint(ctx, metalY(ctx, -20, 24, '#7a6a6c', '#3e3033', '#140c0d'), '#060304', 1.6);
  ctx.fillStyle = '#080405';
  ctx.beginPath();
  ctx.roundRect(-8, -17, 44, 39, 4);
  ctx.fill();

  // CYLINDER (rotates one chamber per shot)
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(-6, -16, 40, 36, 6);
  ctx.clip();
  ctx.fillStyle = metalY(ctx, -16, 20, '#a5959a', '#4a3a3d', '#160d0e');
  ctx.fillRect(-6, -16, 40, 36);
  const phi = (used - recoil) * (Math.PI / 3);
  for (let k = 0; k < 6; k++) {
    const t = phi + (k * Math.PI) / 3;
    const c = Math.cos(t);
    if (c <= 0.05) continue;
    const yy = 2 + Math.sin(t) * 15;
    const hh = 6.5 * c;
    ctx.fillStyle = 'rgba(8,4,5,0.85)';
    ctx.beginPath();
    ctx.roundRect(2, yy - hh / 2, 24, hh, hh / 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,200,200,0.18)';
    ctx.fillRect(4, yy + hh / 2 - 1, 20, 1);
  }
  for (let k = 0; k < 6; k++) {
    const t = phi + (k * Math.PI) / 3 + Math.PI / 6;
    const c = Math.cos(t);
    if (c <= 0) continue;
    rune(ctx, 14, 2 + Math.sin(t) * 15, 2.8 * c, k, th.plasmaMid, c * (0.45 + 0.4 * E));
  }
  ctx.restore();
  ctx.beginPath();
  ctx.roundRect(-6, -16, 40, 36, 6);
  ctx.strokeStyle = '#060304';
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.beginPath();
  ctx.roundRect(-42, -22, 84, 6, 2);
  paint(ctx, metalY(ctx, -22, -16, '#b0a0a2', '#4a3a3d', '#140c0d'), '#060304', 1.2);

  // BARREL
  ctx.beginPath();
  ctx.rect(38, -16, 76, 6);
  paint(ctx, metalY(ctx, -16, -10, '#9a8a8c', '#3e3033', '#140c0d'), '#060304', 1.1);
  ctx.fillStyle = '#060304';
  for (let x = 44; x < 108; x += 9) ctx.fillRect(x, -15, 5, 3.5);
  ctx.beginPath();
  ctx.rect(34, -10, 80, 19);
  paint(ctx, metalY(ctx, -10, 9, '#c8b8ba', '#584649', '#140c0d'), '#060304', 1.4);
  ctx.beginPath();
  ctx.moveTo(36, 9);
  ctx.lineTo(102, 9);
  ctx.quadraticCurveTo(110, 9, 110, 13.5);
  ctx.quadraticCurveTo(110, 18, 102, 18);
  ctx.lineTo(36, 18);
  ctx.closePath();
  paint(ctx, metalY(ctx, 9, 18, '#8a7a7c', '#3a2c2f', '#120a0b'), '#060304', 1.2);
  ammoPips(ctx, 42, 13.5, p.ammoLeft, p.ammoTotal, 5.2, () => th.plasmaMid, time);
  ctx.beginPath();
  ctx.roundRect(112, -13, 6, 24, 1.5);
  paint(ctx, metalY(ctx, -13, 11, '#d8c8ca', '#5a484b', '#140c0d'), '#060304', 1.1);
  for (let k = 0; k < 4; k++) {
    const a = 0.25 + 0.75 * Math.max(0, Math.sin(time * 5 - k * 0.9));
    rune(ctx, 52 + k * 15, 0, 4, k + 1, th.plasmaMid, a * Math.min(1.2, E));
  }
  if (heat > 0.05) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = lin(ctx, 118, 0, 40, 0, [
      [0, `rgba(255,200,140,${heat * 0.75})`],
      [0.5, `rgba(255,70,30,${heat * 0.4})`],
      [1, 'rgba(255,40,0,0)'],
    ]);
    ctx.fillRect(34, -16, 84, 34);
    ctx.restore();
  }
  poly(ctx, [106, -16, 108, -24, 114, -24, 114, -16]);
  paint(ctx, '#1a0b0c');
  glowDot(ctx, 111, -20, 4, '#ef4444', 0.95);

  if (muzzleFlash > 0.02) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = muzzleFlash;
    for (const d of [-1, 1]) {
      ctx.fillStyle = lin(ctx, 35, 0, 35, d * 40, [
        [0, '#ffffff'],
        [0.3, th.muzzleFlashHex],
        [1, 'rgba(0,0,0,0)'],
      ]);
      ctx.beginPath();
      ctx.moveTo(32, d * 6);
      ctx.lineTo(35, d * 40 * (0.6 + muzzleFlash * 0.6));
      ctx.lineTo(38, d * 6);
      ctx.fill();
    }
    ctx.restore();
  }

  // HAMMER (clean rounded spur)
  ctx.save();
  ctx.translate(-40, -13);
  ctx.rotate(-0.5 * (1 - recoil) + 0.25 * recoil);
  ctx.beginPath();
  ctx.roundRect(-17, -6, 19, 10, 4);
  paint(ctx, metalY(ctx, -6, 4, '#b0a0a2', '#4a3a3d', '#140c0d'), '#060304', 1.2);
  ctx.beginPath();
  ctx.arc(-16, -1, 3.2, 0, Math.PI * 2);
  paint(ctx, metalY(ctx, -4.2, 2.2, '#d8c8ca', '#5a484b', '#140c0d'), '#060304', 1);
  ctx.restore();

  // Frame bevel light
  ctx.strokeStyle = 'rgba(255,235,235,0.22)';
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.moveTo(-38, -19);
  ctx.lineTo(36, -19);
  ctx.stroke();

  triggerGuard(ctx, -6, 22, 26, 22, metalY(ctx, 22, 44, '#9a8a8c', '#4a3a3d', '#140c0d'), '#060304');
  trigger(ctx, 8, 24, recoil, '#584649', '#060304');

  for (let i = 0; i < 10; i++) {
    const t = (time * 0.5 + pr(i)) % 1;
    glowDot(ctx, -20 + t * 150, (pr(i * 3) - 0.5) * 60 + Math.sin(time * 3 + i) * 4, 3 + pr(i * 5) * 2.5, th.plasmaMid, Math.sin(t * Math.PI) * 0.7);
  }

  if (od) odRings(ctx, 118, () => th.plasmaMid, time);
  gunFlash(ctx, 118, 0, muzzleFlash, { core: '#fff7ed', mid: '#fb923c', rgba: th.plasmaGlowRgba }, time, 1.1);
}

// ============================================================================
// 🔫 M1911 LEGACY — real-world .45 Combat Pistol (maykr, COMMON)
// ============================================================================
function drawPistol(ctx: C2D, p: GunRenderParams, E: number) {
  const { time, recoil, muzzleFlash, overdrivePrimed: od, theme: th } = p;
  const s = recoil * 16;

  aura(ctx, 40, 0, od ? 150 : 115, th.plasmaGlowRgba, E * 0.85);

  // SLIDE (blued steel, recoils back)
  ctx.save();
  ctx.translate(-s, 0);
  const slidePath = () => {
    ctx.beginPath();
    ctx.moveTo(-34, -13);
    ctx.lineTo(100, -13);
    ctx.quadraticCurveTo(113, -13, 113, -6);
    ctx.lineTo(113, 4);
    ctx.lineTo(-34, 4);
    ctx.closePath();
  };
  slidePath();
  paint(ctx, steel(ctx, -13, 4), '#05080c', 1.6);
  // Rear serrations
  ctx.strokeStyle = 'rgba(5,8,12,0.8)';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  for (let x = -30; x <= -14; x += 3.2) {
    ctx.moveTo(x, -10);
    ctx.lineTo(x, 1);
  }
  ctx.stroke();
  // Front bevel + slide crown line
  ctx.strokeStyle = 'rgba(200,220,240,0.5)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-30, -11.5);
  ctx.lineTo(96, -11.5);
  ctx.stroke();
  // Front sight post
  poly(ctx, [94, -13, 95, -19.5, 100.5, -19.5, 100.5, -13]);
  paint(ctx, '#0b0f14');
  glowDot(ctx, 97.5, -16.5, 3, '#fbbf24', 0.9);
  // Rear sight notches
  ctx.fillStyle = '#05080c';
  ctx.fillRect(-32, -16, 4, 3.5);
  ctx.fillRect(-22, -16, 4, 3.5);
  // Ejection port + exposed barrel lug when cycling
  ctx.beginPath();
  ctx.roundRect(28, -9, 26, 8, 2);
  paint(ctx, '#07090c');
  if (recoil > 0.35) {
    ctx.beginPath();
    ctx.roundRect(30, -14.5, 22, 6.5, 1.6);
    paint(ctx, gold(ctx, 30, -14.5, 30, -8), '#3d2706', 0.8);
  }
  // Slide rail
  ctx.fillStyle = '#0b0f14';
  ctx.fillRect(36, 4, 70, 2);
  ctx.restore();

  // BARREL SLIVER ahead of the frame + polished muzzle
  ctx.beginPath();
  ctx.rect(58, 3, 48, 4);
  paint(ctx, metalY(ctx, 3, 7, '#aebfd2', '#4a5866', '#161c23'), '#05080c', 1);
  ctx.fillStyle = '#c9ccd2';
  ctx.beginPath();
  ctx.arc(106, 5, 1.9, 0, Math.PI * 2);
  ctx.fill();

  // FRAME (front strap + dust cover)
  poly(ctx, [-34, 4, 58, 4, 58, 10, 42, 14, 8, 14, 4, 10, -34, 10]);
  paint(ctx, metalY(ctx, 4, 14, '#8b9aa9', '#3a444f', '#12161c'), '#05080c', 1.4);
  ctx.strokeStyle = 'rgba(220,235,250,0.28)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-30, 5.5);
  ctx.lineTo(54, 5.5);
  ctx.stroke();
  // Trigger guard (rounded 1911 loop)
  triggerGuard(ctx, 6, 12, 42, 20, metalY(ctx, 12, 32, '#9fb0c2', '#3a444f', '#10151b'), '#05080c');
  trigger(ctx, 22, 14, recoil, '#22262c', '#05080c');

  // BEAVERTAIL
  capsule(ctx, [-34, 6], [-46, 1], 9, '#3a444f', '#05080c', '#9fb0c2');
  // Hammer spur
  poly(ctx, [-36, 2, -48, -6, -50, -2, -38, 8]);
  paint(ctx, metalY(ctx, -6, 8, '#8b9aa9', '#3a444f', '#10151b'), '#05080c', 1.1);

  // WALNUT GRIP (sloped back, checkered)
  const gripPath = () => {
    ctx.beginPath();
    ctx.moveTo(-36, 10);
    ctx.lineTo(4, 10);
    ctx.quadraticCurveTo(-2, 52, -16, 96);
    ctx.quadraticCurveTo(-26, 108, -46, 104);
    ctx.quadraticCurveTo(-50, 102, -52, 94);
    ctx.quadraticCurveTo(-46, 52, -36, 10);
    ctx.closePath();
  };
  gripPath();
  paint(ctx, wood(ctx, -52, 4), '#0a0502', 1.6);
  ctx.save();
  gripPath();
  ctx.clip();
  // Diamond checkering pattern
  ctx.strokeStyle = 'rgba(0,0,0,0.4)';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  for (let k = -8; k < 14; k++) {
    ctx.moveTo(-56 + k * 6, 12);
    ctx.lineTo(-20 + k * 6, 110);
    ctx.moveTo(-20 + k * 6, 12);
    ctx.lineTo(-56 + k * 6, 110);
  }
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.07)';
  for (let i = 0; i < 60; i++) {
    ctx.beginPath();
    ctx.arc(-52 + pr(i) * 56, 12 + pr(i * 3.1) * 94, 0.8, 0, Math.PI * 2);
    ctx.fill();
  }
  // Finger grooves on the front edge
  ctx.strokeStyle = 'rgba(0,0,0,0.55)';
  ctx.lineWidth = 1.4;
  for (const yy of [34, 56, 78]) {
    ctx.beginPath();
    ctx.arc(10, yy, 6, Math.PI * 0.35, Math.PI * 0.85);
    ctx.stroke();
  }
  ctx.restore();
  // Silver grip pins
  for (const [px, py] of [
    [-30, 22],
    [-38, 50],
    [-44, 78],
  ]) {
    glowDot(ctx, px, py, 3, '#c9ccd2', 0.8);
    ctx.fillStyle = '#1c2126';
    ctx.beginPath();
    ctx.arc(px, py, 1.2, 0, Math.PI * 2);
    ctx.fill();
  }
  // Mag base pad
  ctx.beginPath();
  ctx.roundRect(-52, 102, 38, 8, 3);
  paint(ctx, metalY(ctx, 102, 110, '#8b9aa9', '#3a444f', '#10151b'), '#05080c', 1.1);
  glowDot(ctx, -33, 106, 3.5, '#c9a24a', 0.85);

  ammoPips(ctx, -30, 6.5, p.ammoLeft, p.ammoTotal, 4.4, () => th.plasmaMid, time);

  if (od) odRings(ctx, 118, () => th.plasmaMid, time);
  gunFlash(ctx, 118, 0, muzzleFlash, { core: '#f8fafc', mid: th.muzzleFlashHex, rgba: 'rgba(251, 191, 36, ' }, time, 1);
}

// ============================================================================
// 💥 MAGMA SUPER SHOTGUN — double-barrel sawed-off (overlord)
// ============================================================================
function drawShotgun(ctx: C2D, p: GunRenderParams, E: number) {
  const { time, recoil, muzzleFlash, overdrivePrimed: od, theme: th, heat } = p;

  aura(ctx, 40, 10, od ? 155 : 125, th.plasmaGlowRgba, E);

  // GRIP
  const gripPts = [-50, 18, -8, 18, -24, 98, -32, 106, -66, 104, -72, 96];
  poly(ctx, gripPts);
  paint(
    ctx,
    lin(ctx, -72, 0, -8, 0, [
      [0, '#140c08'],
      [0.4, '#3d2619'],
      [0.7, '#2c1a10'],
      [1, '#120a06'],
    ]),
    '#050302',
    1.6
  );
  ctx.save();
  poly(ctx, gripPts);
  ctx.clip();
  ctx.strokeStyle = 'rgba(0,0,0,0.45)';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  for (let k = -12; k < 20; k++) {
    ctx.moveTo(-80 + k * 5, 20);
    ctx.lineTo(-40 + k * 5, 110);
    ctx.moveTo(-40 + k * 5, 20);
    ctx.lineTo(-80 + k * 5, 110);
  }
  ctx.stroke();
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = '#fb923c';
  ctx.globalAlpha = 0.45 + 0.25 * Math.sin(time * 3);
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.moveTo(-30, 22);
  ctx.lineTo(-36, 50);
  ctx.lineTo(-32, 64);
  ctx.lineTo(-44, 96);
  ctx.stroke();
  ctx.restore();
  poly(ctx, [-30, 102, -68, 99, -70, 106, -32, 110]);
  paint(ctx, gold(ctx, -70, 99, -30, 110), '#3d2706', 1);

  // RECEIVER
  poly(ctx, [-54, -10, -42, -16, 16, -16, 16, 32, -4, 32, -12, 26, -52, 22]);
  paint(ctx, metalY(ctx, -16, 32, '#a89888', '#4a423e', '#141210'), '#060504', 1.6);
  // Crisp bevel highlight along the receiver top
  ctx.strokeStyle = 'rgba(255,238,220,0.3)';
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.moveTo(-40, -14.5);
  ctx.lineTo(14, -14.5);
  ctx.stroke();
  ctx.strokeStyle = gold(ctx, -50, 0, 10, 20);
  ctx.lineWidth = 1;
  for (const cx of [-32, -10]) {
    ctx.beginPath();
    for (let t = 0; t < 12; t += 0.3) {
      const r = 1 + t * 0.6;
      const px = cx + Math.cos(t) * r;
      const py = 19 + Math.sin(t) * r * 0.6;
      if (t === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(12, 27, 4, 0, Math.PI * 2);
  paint(ctx, gold(ctx, 8, 23, 16, 31), '#3d2706', 1);
  for (let k = 0; k < 2; k++) {
    const y = -8 + k * 10;
    ctx.beginPath();
    ctx.roundRect(-42, y, 24, 8, 2);
    paint(ctx, lin(ctx, 0, y, 0, y + 8, [[0, '#fca5a5'], [0.35, '#dc2626'], [1, '#450a0a']]), '#2a0505', 0.9);
    ctx.beginPath();
    ctx.roundRect(-18, y - 0.5, 8, 9, 1.2);
    paint(ctx, gold(ctx, -18, y, -18, y + 9), '#3d2706', 0.8);
  }
  poly(ctx, [-46, -16, -30, -16, -26, -22, -42, -24]);
  paint(ctx, metalY(ctx, -24, -16, '#c8b8a8', '#5a4f48', '#141210'), '#060504', 1);

  // BARRELS (over/under — top bore is the firing line)
  ctx.beginPath();
  ctx.roundRect(14, 10, 104, 18, 3);
  paint(ctx, metalY(ctx, 10, 28, '#b0a090', '#4a3f39', '#120e0c'), '#050403', 1.4);
  ctx.beginPath();
  ctx.roundRect(14, -9, 104, 19, 3);
  paint(ctx, metalY(ctx, -9, 10, '#c8b4a4', '#56493f', '#120e0c'), '#050403', 1.4);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const by of [0, 19]) {
    ctx.strokeStyle = lin(ctx, 24, 0, 116, 0, [
      [0, '#7c2d12'],
      [0.5, '#fb923c'],
      [1, '#fef9c3'],
    ]);
    ctx.globalAlpha = Math.min(1, 0.35 + heat * 0.6 + 0.25 * E) * (0.8 + 0.2 * Math.sin(time * 9 + by));
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    let yy = by;
    ctx.moveTo(24, yy);
    for (let x = 30; x <= 110; x += 6) {
      yy = by + (pr(x + by) - 0.5) * 8;
      ctx.lineTo(x, yy);
    }
    ctx.stroke();
  }
  if (heat > 0.05) {
    ctx.globalAlpha = 1;
    ctx.fillStyle = lin(ctx, 118, 0, 30, 0, [
      [0, `rgba(255,220,150,${heat * 0.7})`],
      [0.5, `rgba(251,100,30,${heat * 0.35})`],
      [1, 'rgba(200,40,0,0)'],
    ]);
    ctx.fillRect(14, -9, 104, 37);
  }
  ctx.restore();
  for (const bx of [44, 84]) {
    ctx.beginPath();
    ctx.roundRect(bx, -11, 6, 41, 2);
    paint(ctx, gold(ctx, bx, -11, bx + 6, 30), '#3d2706', 1);
  }
  ctx.beginPath();
  ctx.roundRect(112, -11, 6, 41, 2);
  paint(ctx, metalY(ctx, -11, 30, '#d8c4b4', '#5a4f48', '#141210'), '#060504', 1.1);
  glowDot(ctx, 118, 0, 10, th.plasmaMid, 0.3 * E);
  glowDot(ctx, 118, 19, 10, th.plasmaMid, 0.3 * E);
  ctx.beginPath();
  ctx.arc(110, -11, 2.2, 0, Math.PI * 2);
  paint(ctx, '#fde68a');
  ammoPips(ctx, 22, 19, p.ammoLeft, p.ammoTotal, 6.6, () => '#fb923c', time);

  // FOREND
  ctx.beginPath();
  ctx.roundRect(22, 28, 50, 10, 5);
  paint(ctx, lin(ctx, 0, 28, 0, 38, [[0, '#6b4220'], [0.5, '#3d2619'], [1, '#140c08']]), '#050302', 1.2);
  ctx.strokeStyle = 'rgba(255,220,180,0.25)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(25, 29.5);
  ctx.lineTo(69, 29.5);
  ctx.stroke();

  triggerGuard(ctx, -6, 30, 22, 18, metalY(ctx, 30, 48, '#a89888', '#4a423e', '#141210'), '#060504');
  trigger(ctx, 3, 31, recoil, '#5a4f48', '#060504');
  trigger(ctx, 12, 31, recoil * 0.6, '#5a4f48', '#060504');

  if (od) odRings(ctx, 118, () => th.plasmaMid, time);
  const cols = { core: '#fef9c3', mid: '#fb923c', rgba: th.plasmaGlowRgba };
  gunFlash(ctx, 118, 0, muzzleFlash, cols, time, 1.3);
  gunFlash(ctx, 118, 19, muzzleFlash * 0.85, cols, time + 0.5, 1);
}

// ============================================================================
// 🎯 M4A1 CARBINE — real-world 5.56 NATO rifle (rifle, COMMON)
// ============================================================================
export const RIFLE_THEME: WeaponTheme = {
  id: 'rifle',
  kind: 'rifle',
  rarity: 'COMMON',
  rarityColor: '#a1a1aa',
  short: 'RIFLE',
  name: 'M4A1 CARBINE',
  subtitle: '5.56 NATO Select-Fire Carbine · Real-World Icon',
  tag: '5.56 TRACER',
  armorPrimary: '#343b41',
  armorSecondary: '#21262b',
  armorDark: '#0d1013',
  armorHighlight: '#8494a1',
  trimMetal: '#4b545c',
  plasmaCore: '#f5f9ff',
  plasmaMid: '#93c5fd',
  plasmaOuter: '#2563eb',
  plasmaGlowRgba: 'rgba(147, 197, 253, ',
  laserSightRgba: 'rgba(147, 197, 253, ',
  muzzleFlashHex: '#fdba74',
  spikeBody: '#2b2f33',
  spikeBlade: '#93c5fd',
};

function matte(ctx: C2D, y0: number, y1: number, hi = '#78838d', mid = '#2c3136', dark = '#0c0e10') {
  return metalY(ctx, y0, y1, hi, mid, dark);
}

function drawRifle(ctx: C2D, p: GunRenderParams, E: number) {
  const { time, recoil, muzzleFlash, overdrivePrimed: od, theme: th, heat } = p;
  const s = recoil * 15;

  aura(ctx, 30, 0, od ? 170 : 130, th.plasmaGlowRgba, E * 0.8);

  // COLLAPSIBLE STOCK — two buffer rods + butt pad (toward screen-bottom)
  capsule(ctx, [-50, -2], [-120, 2], 4, '#3a4148', '#0a0c0e', '#8494a1');
  capsule(ctx, [-50, 8], [-120, 12], 4, '#3a4148', '#0a0c0e', '#8494a1');
  ctx.beginPath();
  ctx.roundRect(-138, -6, 18, 30, 4);
  paint(ctx, matte(ctx, -6, 24, '#6b757e', '#252a2f', '#0b0d0f'), '#050608', 1.4);
  ctx.strokeStyle = 'rgba(0,0,0,0.5)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  for (let x = -134; x < -124; x += 3.4) {
    ctx.moveTo(x, -4);
    ctx.lineTo(x, 22);
  }
  ctx.stroke();

  // RECEIVER
  poly(ctx, [-54, -16, 40, -16, 40, 14, -6, 14, -14, 22, -52, 22]);
  paint(ctx, matte(ctx, -16, 22), '#050608', 1.5);
  ctx.strokeStyle = 'rgba(210,225,240,0.22)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-50, -14.5);
  ctx.lineTo(36, -14.5);
  ctx.stroke();
  // Flat-top Picatinny rail
  ctx.fillStyle = '#08090b';
  for (let x = -50; x < 36; x += 5) ctx.fillRect(x, -19, 3.4, 3);
  ctx.fillStyle = '#2c3136';
  for (let x = -50; x < 36; x += 5) ctx.fillRect(x, -18.6, 3.4, 1);
  // Ejection port + bolt handle (cycles on recoil)
  ctx.beginPath();
  ctx.roundRect(0, -11, 22, 9, 2);
  paint(ctx, '#060708');
  if (recoil > 0.35) {
    ctx.beginPath();
    ctx.roundRect(2, -15.5, 18, 5.5, 1.5);
    paint(ctx, matte(ctx, -15.5, -10, '#8494a1', '#3a4148', '#0b0d0f'), '#050608', 0.8);
  }
  ctx.save();
  ctx.translate(-s * 0.5, 0);
  capsule(ctx, [10, 6], [10, 16], 4, '#454d55', '#0a0c0e', '#8494a1');
  ctx.beginPath();
  ctx.arc(10, 17, 4.4, 0, Math.PI * 2);
  paint(ctx, matte(ctx, 12, 21), '#050608', 0.9);
  ctx.restore();
  // Front sight post
  poly(ctx, [26, -16, 27, -23, 33, -23, 34, -16]);
  paint(ctx, '#1a1e22');
  ctx.fillStyle = '#050608';
  ctx.fillRect(28, -23, 4, 3);
  // Selector switch
  ctx.beginPath();
  ctx.arc(-16, 6, 2.6, 0, Math.PI * 2);
  paint(ctx, '#1a1e22');
  ctx.fillStyle = '#eab308';
  ctx.beginPath();
  ctx.arc(-16, 6, 1.1, 0, Math.PI * 2);
  ctx.fill();
  ammoPips(ctx, -46, 10, p.ammoLeft, p.ammoTotal, 4.6, () => th.plasmaMid, time);

  // HANDGUARD (hex texture + M-LOK slots)
  ctx.save();
  ctx.translate(-s * 0.4, 0);
  poly(ctx, [40, -15, 96, -12, 96, 11, 40, 13]);
  paint(ctx, matte(ctx, -15, 13, '#6b757e', '#252a2f', '#0b0d0f'), '#050608', 1.5);
  ctx.save();
  ctx.clip();
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  for (let hx = 42; hx < 96; hx += 8) {
    for (let hy = -12; hy < 12; hy += 8) {
      ctx.beginPath();
      ctx.arc(hx + ((hy / 8) % 2) * 4, hy, 3.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
  ctx.fillStyle = '#060708';
  for (const [sx, sy] of [
    [46, -12],
    [64, -12],
    [82, -12],
    [55, 8],
    [73, 8],
  ]) {
    ctx.beginPath();
    ctx.roundRect(sx, sy, 10, 3.6, 1.8);
    ctx.fill();
  }
  // Muzzle: barrel + 3-prong flash hider
  ctx.beginPath();
  ctx.rect(96, -4.5, 14, 9);
  paint(ctx, matte(ctx, -4.5, 4.5, '#8494a1', '#3a4148', '#0b0d0f'), '#050608', 1);
  ctx.beginPath();
  ctx.roundRect(110, -8.5, 8, 17, 2);
  paint(ctx, matte(ctx, -8.5, 8.5), '#050608', 1.2);
  ctx.fillStyle = '#040506';
  ctx.fillRect(111.5, -6.5, 2.2, 13);
  ctx.fillRect(114.5, -6.5, 2.2, 13);
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(118, -8.5);
  ctx.lineTo(118, 8.5);
  ctx.stroke();
  if (muzzleFlash > 0.04) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = muzzleFlash;
    for (const d of [-1, 1]) {
      ctx.fillStyle = th.muzzleFlashHex;
      ctx.beginPath();
      ctx.moveTo(112, d * 9);
      ctx.lineTo(114, d * 30 * (0.6 + muzzleFlash * 0.6));
      ctx.lineTo(116.5, d * 9);
      ctx.fill();
    }
    ctx.restore();
  }
  if (heat > 0.05) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = lin(ctx, 118, 0, 96, 0, [
      [0, `rgba(147,197,253,${heat * 0.5})`],
      [1, 'rgba(37,99,235,0)'],
    ]);
    ctx.fillRect(96, -12, 22, 24);
    ctx.restore();
  }
  ctx.restore();

  // MAGAZINE (curved 5.56, count = ammo)
  const magPath = () => {
    ctx.beginPath();
    ctx.moveTo(-2, 14);
    ctx.lineTo(20, 14);
    ctx.quadraticCurveTo(28, 40, 34, 58);
    ctx.lineTo(12, 64);
    ctx.quadraticCurveTo(6, 42, -2, 14);
    ctx.closePath();
  };
  magPath();
  paint(ctx, lin(ctx, -2, 0, 34, 0, [[0, '#0d0f11'], [0.4, '#2f343a'], [1, '#0d0f11']]), '#050608', 1.4);
  ctx.save();
  magPath();
  ctx.clip();
  ctx.strokeStyle = 'rgba(147,197,253,0.5)';
  ctx.lineWidth = 1;
  const n = Math.min(10, Math.max(1, p.ammoTotal));
  const lit = Math.round((p.ammoLeft / Math.max(1, p.ammoTotal)) * n);
  for (let i = 0; i < n; i++) {
    const t = i / Math.max(1, n - 1);
    ctx.globalAlpha = i < lit ? 0.9 : 0.15;
    ctx.beginPath();
    ctx.moveTo(4 + t * 10, 18 + t * 40);
    ctx.lineTo(16 + t * 12, 18 + t * 40);
    ctx.stroke();
  }
  ctx.restore();
  ctx.beginPath();
  ctx.roundRect(10, 58, 26, 6, 2);
  paint(ctx, matte(ctx, 58, 64), '#050608', 0.9);

  // PISTOL GRIP
  poly(ctx, [-24, 22, -6, 22, -12, 62, -18, 68, -34, 64, -28, 26]);
  paint(ctx, lin(ctx, -34, 0, -6, 0, [[0, '#0a0c0e'], [0.45, '#31363c'], [1, '#0a0c0e']]), '#040506', 1.4);
  ctx.save();
  ctx.clip();
  ctx.fillStyle = 'rgba(255,255,255,0.05)';
  for (let i = 0; i < 40; i++) {
    ctx.beginPath();
    ctx.arc(-32 + pr(i) * 26, 24 + pr(i * 2.7) * 42, 0.7, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  // Buttpad of grip
  ctx.beginPath();
  ctx.roundRect(-35, 62, 20, 6, 2);
  paint(ctx, matte(ctx, 62, 68), '#050608', 0.9);

  triggerGuard(ctx, -8, 22, 8, 16, matte(ctx, 22, 38), '#050608');
  trigger(ctx, 0, 23, recoil, '#3d444b', '#050608');

  if (od) odRings(ctx, 118, () => th.plasmaMid, time);
  gunFlash(ctx, 118, 0, muzzleFlash, { core: '#f5f9ff', mid: th.muzzleFlashHex, rgba: 'rgba(147, 197, 253, ' }, time, 1.15);
}

// ============================================================================
// 🍌 TOY GUNS — Banana / Bee Hive / Bubble / Confetti (all COMMON)
// ============================================================================
export const TOY_THEMES: Record<'banana' | 'beehive' | 'bubble' | 'confetti', WeaponTheme> = {
  banana: {
    id: 'banana',
    kind: 'banana',
    rarity: 'COMMON',
    rarityColor: '#fbbf24',
    short: 'BANANA',
    name: 'BANANA GUN',
    subtitle: 'Boing! The Splat-Proof Fruit Blaster',
    tag: 'FRUIT SPLAT',
    armorPrimary: '#fde047',
    armorSecondary: '#fbbf24',
    armorDark: '#713f12',
    armorHighlight: '#fef9c3',
    trimMetal: '#854d0e',
    plasmaCore: '#fffbeb',
    plasmaMid: '#fde047',
    plasmaOuter: '#ca8a04',
    plasmaGlowRgba: 'rgba(253, 224, 71, ',
    laserSightRgba: 'rgba(253, 224, 71, ',
    muzzleFlashHex: '#fde047',
    spikeBody: '#a16207',
    spikeBlade: '#fde047',
  },
  beehive: {
    id: 'beehive',
    kind: 'beehive',
    rarity: 'COMMON',
    rarityColor: '#f59e0b',
    short: 'BEE HIVE',
    name: 'BEE HIVE GUN',
    subtitle: 'Bzzzt! Honeycomb Swarm Blaster',
    tag: 'SWARM ZZZT',
    armorPrimary: '#facc15',
    armorSecondary: '#a16207',
    armorDark: '#1c1403',
    armorHighlight: '#fef08a',
    trimMetal: '#713f12',
    plasmaCore: '#fffbeb',
    plasmaMid: '#fbbf24',
    plasmaOuter: '#b45309',
    plasmaGlowRgba: 'rgba(251, 191, 36, ',
    laserSightRgba: 'rgba(251, 191, 36, ',
    muzzleFlashHex: '#fde68a',
    spikeBody: '#3f2d05',
    spikeBlade: '#fbbf24',
  },
  bubble: {
    id: 'bubble',
    kind: 'bubble',
    rarity: 'COMMON',
    rarityColor: '#f9a8d4',
    short: 'BUBBLE',
    name: 'BUBBLE GUN',
    subtitle: 'Ploop! Iridescent Bubble Blaster',
    tag: 'SOAP POP',
    armorPrimary: '#f9a8d4',
    armorSecondary: '#f472b6',
    armorDark: '#831843',
    armorHighlight: '#fce7f3',
    trimMetal: '#22d3ee',
    plasmaCore: '#fdf2f8',
    plasmaMid: '#f9a8d4',
    plasmaOuter: '#db2777',
    plasmaGlowRgba: 'rgba(249, 168, 212, ',
    laserSightRgba: 'rgba(249, 168, 212, ',
    muzzleFlashHex: '#fbcfe8',
    spikeBody: '#be185d',
    spikeBlade: '#f9a8d4',
  },
  confetti: {
    id: 'confetti',
    kind: 'confetti',
    rarity: 'COMMON',
    rarityColor: '#f472b6',
    short: 'CONFETTI',
    name: 'CONFETTI CANNON',
    subtitle: 'Pop! Party Popper Blaster',
    tag: 'PARTY POP',
    armorPrimary: '#ef4444',
    armorSecondary: '#b91c1c',
    armorDark: '#450a0a',
    armorHighlight: '#fecaca',
    trimMetal: '#eab308',
    plasmaCore: '#fff1f2',
    plasmaMid: '#f472b6',
    plasmaOuter: '#db2777',
    plasmaGlowRgba: 'rgba(244, 114, 182, ',
    laserSightRgba: 'rgba(244, 114, 182, ',
    muzzleFlashHex: '#fbcfe8',
    spikeBody: '#9f1239',
    spikeBlade: '#f472b6',
  },
};

// 🍌 BANANA GUN — curved banana blaster with a cute face
function drawBananaGun(ctx: C2D, p: GunRenderParams) {
  const { time, recoil, muzzleFlash, theme: th } = p;
  const s = recoil * 15;

  // GRIP (black rubber, under the belly)
  poly(ctx, [2, 12, 24, 14, 14, 62, 8, 68, -8, 64, -2, 16]);
  paint(ctx, lin(ctx, -8, 0, 24, 0, [[0, '#0b0d0f'], [0.45, '#2b3138'], [1, '#0b0d0f']]), '#040507', 1.4);
  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  for (let i = 0; i < 24; i++) {
    ctx.beginPath();
    ctx.arc(-4 + pr(i) * 22, 18 + pr(i * 2.7) * 44, 0.8, 0, Math.PI * 2);
    ctx.fill();
  }
  triggerGuard(ctx, -4, 16, 12, 14, '#1c2126', '#040507');
  trigger(ctx, 3, 17, recoil, '#fde047', '#5c3a0e');

  ctx.save();
  ctx.translate(-s * 0.5, 0);
  // THE BANANA (crescent, tip forward at ~118)
  const bananaPath = () => {
    ctx.beginPath();
    ctx.moveTo(118, -14);
    ctx.quadraticCurveTo(46, -30, -52, -20);
    ctx.quadraticCurveTo(-62, -18, -60, -8);
    ctx.quadraticCurveTo(-58, 8, -44, 12);
    ctx.quadraticCurveTo(30, 34, 104, 2);
    ctx.quadraticCurveTo(116, -2, 118, -14);
    ctx.closePath();
  };
  const open = p.peelOpen ?? 0;
  const fill = p.fleshFill ?? 1;
  // Hinge at the REAR (stem end) so the two halves fan out into a clean V,
  // exactly like a banana peeled from the nose — never an X!
  const pivotX = -46;
  const pivotY = -2;

  // One half of the peel (shape + shading), used by both flaps
  const drawPeelHalf = () => {
    bananaPath();
    paint(
      ctx,
      lin(ctx, -60, 0, 118, 0, [
        [0, '#6b4310'],
        [0.08, '#d9a622'],
        [0.3, '#f4cf52'],
        [0.55, '#fae27e'],
        [0.8, '#e9c243'],
        [0.95, '#9c6410'],
        [1, '#5c3a0e'],
      ]),
      '#8a5a1a',
      1.5
    );
    ctx.save();
    bananaPath();
    ctx.clip();
    // Brown ripening speckles (subtle, like a real ripe banana)
    ctx.fillStyle = 'rgba(120,72,20,0.32)';
    for (let i = 0; i < 16; i++) {
      const bx = -48 + pr(i * 1.3) * 156;
      ctx.beginPath();
      ctx.arc(bx, -14 + pr(i * 3.7) * 32, 0.7 + pr(i) * 1.1, 0, Math.PI * 2);
      ctx.fill();
    }
    // Soft top shine (normal blend)
    ctx.fillStyle = 'rgba(255,251,235,0.4)';
    ctx.beginPath();
    ctx.moveTo(110, -13);
    ctx.quadraticCurveTo(40, -27, -46, -18);
    ctx.quadraticCurveTo(40, -16.5, 110, -9);
    ctx.closePath();
    ctx.fill();
    // Bottom occlusion for roundness
    ctx.fillStyle = 'rgba(90,55,15,0.35)';
    ctx.beginPath();
    ctx.moveTo(104, 1);
    ctx.quadraticCurveTo(30, 30, -44, 10);
    ctx.quadraticCurveTo(30, 34, 104, 4);
    ctx.closePath();
    ctx.fill();
    // Natural crease ridge along the center
    ctx.strokeStyle = 'rgba(146,92,18,0.45)';
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(108, -7);
    ctx.quadraticCurveTo(30, 3, -46, 2);
    ctx.stroke();
    ctx.restore();
  };

  // A peel flap clipped to its half, rotating open around the pivot
  const drawFlap = (side: 1 | -1) => {
    ctx.save();
    ctx.translate(pivotX, pivotY);
    ctx.rotate(side * open * 0.52);
    ctx.translate(-pivotX, -pivotY);
    ctx.beginPath();
    if (side === 1) ctx.rect(-85, -75, 210, 73);
    else ctx.rect(-85, -2, 210, 85);
    ctx.clip();
    drawPeelHalf();
    if (side === 1) {
      // Inner side of the peel: proper cream (bright near the cut edge)
      if (open > 0.02) {
        const inGrad = ctx.createLinearGradient(0, -2, 0, -30);
        inGrad.addColorStop(0, `rgba(253,247,222,${0.95 * open})`);
        inGrad.addColorStop(1, `rgba(250,238,190,${0.8 * open})`);
        ctx.fillStyle = inGrad;
        ctx.fillRect(-85, -75, 210, 73);
      }
      // Green stem (rear, attached to the top flap)
      poly(ctx, [-62, -16, -74, -12, -72, -2, -60, -2]);
      paint(ctx, lin(ctx, -74, 0, -60, 0, [[0, '#3f6212'], [0.5, '#84cc16'], [1, '#4d7c0f']]), '#1a2e05', 1.2);
      // CUTE FACE (moves with the flap)
      ctx.fillStyle = '#3f2d05';
      ctx.beginPath();
      ctx.arc(34, -9, 3.4, 0, Math.PI * 2);
      ctx.arc(54, -7, 3.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(33, -10.2, 1.1, 0, Math.PI * 2);
      ctx.arc(53, -8.2, 1.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#3f2d05';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(44, -4, 7, 0.3, Math.PI - 0.3);
      ctx.stroke();
      // Subtle blush
      ctx.fillStyle = 'rgba(240,140,80,0.25)';
      ctx.beginPath();
      ctx.arc(25, -6, 3.4, 0, Math.PI * 2);
      ctx.arc(63, -4, 3.4, 0, Math.PI * 2);
      ctx.fill();
    }
    // Crisp split seam along the cut edge
    if (open > 0.02) {
      ctx.strokeStyle = `rgba(122,82,20,${0.65 * open})`;
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(-44, side === 1 ? -2.4 : -1.6);
      ctx.quadraticCurveTo(30, side === 1 ? -3.4 : -0.6, 102, side === 1 ? -2.2 : -1.8);
      ctx.stroke();
    }
    ctx.restore();
  };

  // Hollow interior of the peel (visible when open)
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(-38, -8);
  ctx.quadraticCurveTo(30, -15, 96, -9);
  ctx.lineTo(96, 5);
  ctx.quadraticCurveTo(30, 11, -38, 4);
  ctx.closePath();
  ctx.fillStyle = `rgba(84,54,16,${0.2 + 0.55 * open})`;
  ctx.fill();
  ctx.restore();

  // THE BANANA FLESH — cream colored, refills while the peel closes
  if (fill > 0.02) {
    const fh = 12 * fill;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(-36, -2 - fh);
    ctx.quadraticCurveTo(30, -8 - fh * 0.8, 94, -2 - fh * 0.75);
    ctx.lineTo(94, -2 + fh * 0.75);
    ctx.quadraticCurveTo(30, 4 + fh * 0.8, -36, -2 + fh);
    ctx.closePath();
    const fgrad = ctx.createLinearGradient(0, -2 - fh, 0, -2 + fh);
    fgrad.addColorStop(0, '#f0e2ad');
    fgrad.addColorStop(0.45, '#fffdf2');
    fgrad.addColorStop(1, '#e6d7a2');
    ctx.fillStyle = fgrad;
    ctx.fill();
    ctx.strokeStyle = '#cdbd85';
    ctx.lineWidth = 1;
    ctx.stroke();
    // Longitudinal flesh ridges
    ctx.strokeStyle = 'rgba(196,172,104,0.55)';
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(-30, -2 - fh * 0.42);
    ctx.quadraticCurveTo(30, -7 - fh * 0.4, 88, -2 - fh * 0.36);
    ctx.moveTo(-30, -2 + fh * 0.42);
    ctx.quadraticCurveTo(30, 3 + fh * 0.4, 88, -2 + fh * 0.36);
    ctx.stroke();
    // Tiny seed dots near the muzzle end
    ctx.fillStyle = 'rgba(122,92,32,0.5)';
    for (const sy of [-0.35, 0, 0.35]) {
      ctx.beginPath();
      ctx.arc(86, -2 + fh * sy, 1, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // Peel flaps: bottom half first, top half (with face) on top
  drawFlap(-1);
  drawFlap(1);

  // Brown tip ring (muzzle)
  ctx.beginPath();
  ctx.arc(113, -6, 5, 0, Math.PI * 2);
  paint(ctx, '#422006', '#291703', 1);
  // Soft natural tip highlight (no glow)
  ctx.fillStyle = 'rgba(250,232,160,0.6)';
  ctx.beginPath();
  ctx.arc(112, -5, 3, 0, Math.PI * 2);
  ctx.fill();
  // Ammo: banana-slice pips on the belly
  ammoPips(ctx, 74, 8, p.ammoLeft, p.ammoTotal, 5, () => '#fde047', time);
  ctx.restore();

  gunFlash(ctx, 116, -6, muzzleFlash, { core: '#fffbeb', mid: th.muzzleFlashHex, rgba: th.plasmaGlowRgba }, time, 1);
  if (muzzleFlash > 0.02) {
    // Peeling skin shards flying
    ctx.save();
    ctx.translate(120, -6);
    for (let i = 0; i < 5; i++) {
      const a = (i / 4 - 0.5) * 1.8;
      ctx.save();
      ctx.rotate(a);
      ctx.globalAlpha = muzzleFlash;
      ctx.fillStyle = i % 2 ? '#fde047' : '#fef9c3';
      ctx.beginPath();
      ctx.moveTo(0, -3);
      ctx.quadraticCurveTo(14, -6 + i * 2, 24, 2);
      ctx.quadraticCurveTo(12, 4, 0, 3);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }
}

// 🐝 BEE HIVE GUN — striped blaster with a live dome hive on top
function drawBeeHiveGun(ctx: C2D, p: GunRenderParams) {
  const { time, recoil, muzzleFlash, theme: th } = p;
  const s = recoil * 15;

  // GRIP (black with honey dot)
  poly(ctx, [-14, 16, 8, 16, 0, 62, -6, 68, -24, 64, -20, 20]);
  paint(ctx, lin(ctx, -24, 0, 8, 0, [[0, '#0b0d0f'], [0.45, '#2b3138'], [1, '#0b0d0f']]), '#040507', 1.4);
  // Printed honeycomb badge (not a glow)
  ctx.strokeStyle = '#fbbf24';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  for (let h = 0; h <= 6; h++) {
    const ha = (h / 6) * Math.PI * 2;
    if (h === 0) ctx.moveTo(-9 + Math.cos(ha) * 5, 40 + Math.sin(ha) * 5);
    else ctx.lineTo(-9 + Math.cos(ha) * 5, 40 + Math.sin(ha) * 5);
  }
  ctx.stroke();
  ctx.fillStyle = 'rgba(251,191,36,0.5)';
  ctx.beginPath();
  ctx.arc(-9, 40, 1.8, 0, Math.PI * 2);
  ctx.fill();
  triggerGuard(ctx, -10, 18, 8, 14, '#1c2126', '#040507');
  trigger(ctx, -2, 19, recoil, '#facc15', '#422006');

  // BARREL (black tube with honeycomb band)
  ctx.save();
  ctx.translate(-s * 0.5, 0);
  ctx.beginPath();
  ctx.roundRect(34, -8, 74, 16, 4);
  paint(ctx, metalY(ctx, -8, 8, '#4b5563', '#1f2937', '#0b0f14'), '#04060a', 1.4);
  ctx.beginPath();
  ctx.roundRect(96, -10, 22, 20, 3);
  paint(ctx, metalY(ctx, -10, 10, '#5b6472', '#262f3a', '#0b0f14'), '#04060a', 1.4);
  // Hex band
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(96, -10, 22, 20, 3);
  ctx.clip();
  ctx.strokeStyle = 'rgba(250,204,21,0.8)';
  ctx.lineWidth = 1;
  for (let hx = 98; hx < 118; hx += 5) {
    for (let hy = -9; hy < 10; hy += 5) {
      ctx.beginPath();
      for (let k = 0; k <= 6; k++) {
        const a = (k / 6) * Math.PI * 2 + Math.PI / 6;
        const px = hx + Math.cos(a) * 2.6;
        const py = hy + Math.sin(a) * 2.6;
        if (k === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
    }
  }
  ctx.restore();
  // Natural muzzle rim highlight
  ctx.strokeStyle = 'rgba(253,230,138,0.7)';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.arc(116, 0, 6.5, 0, Math.PI * 2);
  ctx.stroke();

  // BODY (yellow-black striped, chunky)
  const bodyPath = () => {
    ctx.beginPath();
    ctx.roundRect(-46, -18, 84, 34, 12);
  };
  bodyPath();
  paint(ctx, metalY(ctx, -18, 16, '#fef08a', '#facc15', '#854d0e'), '#422006', 1.8);
  ctx.save();
  bodyPath();
  ctx.clip();
  ctx.fillStyle = '#1c1403';
  for (let x = -38; x < 40; x += 15) {
    ctx.beginPath();
    ctx.roundRect(x, -20, 7, 38, 3);
    ctx.fill();
  }
  // Soft plastic gloss (normal blend)
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.beginPath();
  ctx.ellipse(-4, -11, 30, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.12)';
  ctx.beginPath();
  ctx.ellipse(0, 12, 34, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // Rivets
  for (const rx of [-38, 28]) {
    ctx.fillStyle = '#422006';
    ctx.beginPath();
    ctx.arc(rx, 12, 1.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.arc(rx - 0.5, 11.5, 0.8, 0, Math.PI * 2);
    ctx.fill();
  }
  ammoPips(ctx, -40, 8, p.ammoLeft, p.ammoTotal, 4.8, () => '#fde68a', time);
  ctx.restore();

  // HIVE DOME (on the gun's side, translucent amber with bees inside)
  ctx.save();
  ctx.translate(-14, -42);
  ctx.beginPath();
  ctx.ellipse(0, 0, 20, 26, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(251,191,36,0.16)';
  ctx.fill();
  // Hex lattice inside the dome
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(0, 0, 19, 25, 0, 0, Math.PI * 2);
  ctx.clip();
  ctx.strokeStyle = 'rgba(251,191,36,0.32)';
  ctx.lineWidth = 1;
  for (let hx = -18; hx < 20; hx += 8) {
    for (let hy = -24; hy < 26; hy += 8) {
      ctx.beginPath();
      for (let k = 0; k <= 6; k++) {
        const a = (k / 6) * Math.PI * 2 + Math.PI / 6;
        const px = hx + Math.cos(a) * 4;
        const py = hy + Math.sin(a) * 4;
        if (k === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
    }
  }
  // Buzzing bees circling inside
  for (let k = 0; k < 3; k++) {
    const a = time * (1.6 + k * 0.5) + k * 2.1;
    const bx = Math.cos(a) * 10;
    const by = Math.sin(a) * 14;
    ctx.fillStyle = '#fde047';
    ctx.beginPath();
    ctx.ellipse(bx, by, 3, 2, a, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1c1403';
    ctx.fillRect(bx - 1, by - 1.6, 1, 3.2);
    ctx.globalAlpha = 0.6 + 0.4 * Math.sin(time * 40 + k);
    ctx.fillStyle = 'rgba(224,242,254,0.9)';
    ctx.beginPath();
    ctx.ellipse(bx - 1, by - 3, 2.4, 1.2, a, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  ctx.restore();
  // Dome rim + connector
  ctx.beginPath();
  ctx.ellipse(-14, -42, 20, 26, 0, 0, Math.PI * 2);
  ctx.strokeStyle = '#713f12';
  ctx.lineWidth = 2.6;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(254,240,138,0.6)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.beginPath();
  ctx.roundRect(-22, -22, 16, 8, 3);
  paint(ctx, metalY(ctx, -22, -14, '#5b6472', '#262f3a', '#0b0f14'), '#04060a', 1);
  ctx.restore();

  gunFlash(ctx, 118, 0, muzzleFlash, { core: '#fffbeb', mid: th.muzzleFlashHex, rgba: th.plasmaGlowRgba }, time, 1);
}

// 🫧 BUBBLE GUN — pastel blaster with a big glossy bubble nozzle
function drawBubbleGun(ctx: C2D, p: GunRenderParams) {
  const { time, recoil, muzzleFlash, theme: th } = p;
  const s = recoil * 13;

  // GRIP (cyan pump)
  poly(ctx, [-14, 16, 8, 16, 2, 60, -4, 66, -22, 62, -18, 20]);
  paint(ctx, metalY(ctx, 16, 66, '#a5f3fc', '#22d3ee', '#155e75'), '#04303a', 1.5);
  ctx.strokeStyle = 'rgba(0,40,50,0.4)';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  for (let k = 0; k < 5; k++) {
    ctx.moveTo(-16, 26 + k * 8);
    ctx.lineTo(6, 26 + k * 8);
  }
  ctx.stroke();
  triggerGuard(ctx, -10, 18, 8, 14, '#0e7490', '#04303a');
  trigger(ctx, -2, 19, recoil, '#f9a8d4', '#831843');

  ctx.save();
  ctx.translate(-s * 0.5, 0);
  // BODY (pastel pink, round & chubby)
  const bodyPath = () => {
    ctx.beginPath();
    ctx.roundRect(-50, -16, 92, 32, 15);
  };
  bodyPath();
  paint(ctx, metalY(ctx, -16, 16, '#fce7f3', '#f9a8d4', '#9d174d'), '#831843', 1.8);
  ctx.save();
  bodyPath();
  ctx.clip();
  // Soft plastic gloss (normal blend)
  ctx.fillStyle = 'rgba(255,255,255,0.38)';
  ctx.beginPath();
  ctx.ellipse(-8, -9, 32, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(131,24,67,0.18)';
  ctx.beginPath();
  ctx.ellipse(0, 10, 36, 4.5, 0, 0, Math.PI * 2);
  ctx.fill();
  // Cyan side buttons
  for (const bx of [18, 30]) {
    ctx.beginPath();
    ctx.arc(bx, 6, 4, 0, Math.PI * 2);
    paint(ctx, metalY(ctx, 2, 10, '#cffafe', '#22d3ee', '#155e75'), '#0e4a56', 1);
  }
  ctx.restore();
  // Cyan neck
  ctx.beginPath();
  ctx.roundRect(40, -10, 20, 20, 4);
  paint(ctx, metalY(ctx, -10, 10, '#a5f3fc', '#22d3ee', '#155e75'), '#04303a', 1.4);
  ammoPips(ctx, -42, 8, p.ammoLeft, p.ammoTotal, 4.8, () => '#f9a8d4', time);

  // BIG GLOSSY BUBBLE NOZZLE
  const nb = 21 + Math.sin(time * 3) * 1.2;
  ctx.save();
  ctx.translate(92, 0);
  const ng = ctx.createRadialGradient(-6, -8, 2, 0, 0, nb + 4);
  ng.addColorStop(0, 'rgba(255,255,255,0.75)');
  ng.addColorStop(0.45, 'rgba(216,180,254,0.3)');
  ng.addColorStop(0.8, 'rgba(125,211,252,0.22)');
  ng.addColorStop(1, 'rgba(249,168,212,0.65)');
  ctx.fillStyle = ng;
  ctx.beginPath();
  ctx.arc(0, 0, nb, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.globalCompositeOperation = 'lighter';
  for (const [a0, col] of [
    [1.2, 'rgba(244,114,182,0.6)'],
    [3.1, 'rgba(125,211,252,0.6)'],
    [4.9, 'rgba(163,230,53,0.5)'],
  ] as [number, string][]) {
    ctx.strokeStyle = col;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.arc(0, 0, nb - 3, a0, a0 + 1);
    ctx.stroke();
  }
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.beginPath();
  ctx.ellipse(-8, -9, 4.5, 2.6, -0.5, 0, Math.PI * 2);
  ctx.fill();
  // Inner soap solution core (grows with charge, plain white)
  const ch = p.charge ?? 1;
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.beginPath();
  ctx.arc(0, 2, 6 * ch + 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(219,39,119,0.4)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();
  ctx.restore();

  // Ambient bubbles rising
  for (let i = 0; i < 6; i++) {
    const t = (time * 0.4 + pr(i)) % 1;
    const bx = -70 + pr(i * 2.3) * 190;
    const by = 30 - t * 70;
    ctx.strokeStyle = `rgba(249,168,212,${(1 - t) * 0.7})`;
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.arc(bx, by, 2 + pr(i * 5) * 3, 0, Math.PI * 2);
    ctx.stroke();
  }

  gunFlash(ctx, 118, 0, muzzleFlash, { core: '#fdf2f8', mid: th.muzzleFlashHex, rgba: th.plasmaGlowRgba }, time, 1);
}

// 🎉 CONFETTI CANNON — party popper blaster
function drawConfettiCannon(ctx: C2D, p: GunRenderParams) {
  const { time, recoil, muzzleFlash, theme: th } = p;
  const s = recoil * 13;

  // GRIP
  poly(ctx, [-6, 14, 16, 14, 10, 58, 4, 64, -14, 60, -12, 18]);
  paint(ctx, lin(ctx, -14, 0, 16, 0, [[0, '#0b0d0f'], [0.45, '#2b3138'], [1, '#0b0d0f']]), '#040507', 1.4);
  glowDot(ctx, 1, 36, 7, '#f472b6', 0.85);
  triggerGuard(ctx, -12, 16, 4, 14, '#1c2126', '#040507');
  trigger(ctx, -4, 17, recoil, '#f472b6', '#831843');

  ctx.save();
  ctx.translate(-s * 0.5, 0);
  // TUBE (party cone tapering to the muzzle)
  const conePath = () => {
    ctx.beginPath();
    ctx.moveTo(-58, -20);
    ctx.lineTo(96, -8);
    ctx.lineTo(96, 8);
    ctx.lineTo(-58, 20);
    ctx.closePath();
  };
  conePath();
  paint(ctx, lin(ctx, -58, 0, 96, 0, [[0, '#7f1d1d'], [0.3, '#ef4444'], [0.7, '#dc2626'], [1, '#991b1b']]), '#450a0a', 1.8);
  ctx.save();
  conePath();
  ctx.clip();
  // White diagonal party stripes
  ctx.strokeStyle = 'rgba(255,255,255,0.6)';
  ctx.lineWidth = 6;
  ctx.beginPath();
  for (let x = -70; x < 110; x += 26) {
    ctx.moveTo(x, 26);
    ctx.lineTo(x + 20, -26);
  }
  ctx.stroke();
  // Soft top highlight + bottom shading (paper-party-popper feel)
  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  ctx.fillRect(-58, -19, 154, 8);
  ctx.fillStyle = 'rgba(69,10,10,0.25)';
  ctx.fillRect(-58, 9, 154, 9);
  ctx.restore();
  // Gold collar bands
  for (const bx of [-30, 70]) {
    ctx.beginPath();
    const t = (bx + 58) / 154;
    const hh = 20 - t * 12;
    ctx.fillStyle = gold(ctx, bx, 0, bx + 8, 0);
    ctx.fillRect(bx, -hh, 8, hh * 2);
    ctx.strokeStyle = '#713f12';
    ctx.lineWidth = 0.8;
    ctx.strokeRect(bx, -hh, 8, hh * 2);
  }
  // Muzzle rim (gold)
  ctx.beginPath();
  ctx.roundRect(94, -9, 10, 18, 3);
  paint(ctx, gold(ctx, 94, 0, 104, 0), '#713f12', 1.2);
  // Natural dark bore inside the gold rim
  ctx.fillStyle = '#2b0a0a';
  ctx.beginPath();
  ctx.ellipse(103, 0, 3.6, 5.5, 0, 0, Math.PI * 2);
  ctx.fill();
  // Ribbed rear cap
  ctx.beginPath();
  ctx.roundRect(-70, -23, 13, 46, 4);
  paint(ctx, metalY(ctx, -23, 23, '#52525b', '#27272a', '#0a0a0c'), '#040406', 1.4);
  ctx.strokeStyle = 'rgba(255,255,255,0.15)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let y = -18; y < 22; y += 5) {
    ctx.moveTo(-68, y);
    ctx.lineTo(-59, y);
  }
  ctx.stroke();
  // Confetti peeking from the cap
  for (let i = 0; i < 4; i++) {
    ctx.fillStyle = SPECTRUM[(i * 2 + 1) % 7];
    ctx.save();
    ctx.translate(-70 - i * 3, -14 + i * 9);
    ctx.rotate(time * 3 + i);
    ctx.fillRect(-3, -1.5, 6, 3);
    ctx.restore();
  }
  ammoPips(ctx, 26, 12, p.ammoLeft, p.ammoTotal, 5, () => '#f9a8d4', time);
  ctx.restore();

  gunFlash(ctx, 118, 0, muzzleFlash, { core: '#fff1f2', mid: th.muzzleFlashHex, rgba: th.plasmaGlowRgba }, time, 1.1);
  if (muzzleFlash > 0.02) {
    // Instant confetti burst
    ctx.save();
    ctx.globalAlpha = muzzleFlash;
    for (let i = 0; i < 14; i++) {
      const a = (i / 13 - 0.5) * 2.4;
      const len = 26 + pr(Math.floor(time * 30) + i) * 30;
      ctx.save();
      ctx.translate(122, 0);
      ctx.rotate(a);
      ctx.fillStyle = SPECTRUM[i % 7];
      ctx.fillRect(len, -2, 8, 4);
      ctx.restore();
    }
    ctx.restore();
  }
}

// ============================================================================
// 🌈 PRISMA RAY GUN — retro rainbow ray blaster
// ============================================================================
function drawRayGun(ctx: C2D, p: GunRenderParams, E: number) {
  const { time, recoil, muzzleFlash, overdrivePrimed: od, theme: th } = p;
  const H = time * 90;

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let k = 0; k < 3; k++) {
    const ax = 30 + Math.cos(time * 0.8 + k * 2.1) * 26;
    const ay = Math.sin(time * 1.1 + k) * 18;
    const r = od ? 160 : 130;
    const g = ctx.createRadialGradient(ax, ay, 0, ax, ay, r);
    g.addColorStop(0, hsl(H + k * 120, 100, 60, 0.2 * E));
    g.addColorStop(1, hsl(H + k * 120, 100, 60, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(ax, ay, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // Fins
  poly(ctx, [-26, -14, -60, -44, -66, -38, -46, -12]);
  paint(ctx, gold(ctx, -66, -44, -26, -12), '#5c3d0e', 1.2);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = hsl(H, 100, 65);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-60, -44);
  ctx.lineTo(-66, -38);
  ctx.stroke();
  ctx.restore();
  poly(ctx, [-46, -7, -72, -12, -72, 12, -46, 7]);
  paint(ctx, gold(ctx, -72, -12, -72, 12), '#5c3d0e', 1.2);

  // GRIP (pearl)
  const gripPath = () => {
    ctx.beginPath();
    ctx.moveTo(-40, 12);
    ctx.lineTo(-8, 12);
    ctx.quadraticCurveTo(-12, 58, -26, 98);
    ctx.quadraticCurveTo(-44, 112, -62, 98);
    ctx.quadraticCurveTo(-54, 54, -40, 12);
    ctx.closePath();
  };
  gripPath();
  paint(
    ctx,
    lin(ctx, -62, 0, -8, 0, [
      [0, '#a998d6'],
      [0.4, '#ffffff'],
      [0.7, '#efe8fb'],
      [1, '#b8a8e0'],
    ]),
    '#6f5e9c',
    1.6
  );
  ctx.save();
  gripPath();
  ctx.clip();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.22;
  ctx.fillStyle = spectrumFill(ctx, time * 0.7, -36, 60, 50);
  ctx.fillRect(-70, 10, 70, 110);
  ctx.restore();
  ctx.save();
  ctx.translate(-34, 60);
  poly(ctx, [0, -8, 6, 0, 0, 8, -6, 0]);
  paint(ctx, spectrumFill(ctx, time * 2, 0, 0, 8), '#ffffff', 1.2);
  ctx.restore();
  drawTwinkle(ctx, -34, 60, 8 + Math.sin(time * 6) * 2, hsl(H), 0.7, time);
  ctx.beginPath();
  ctx.arc(-46, 104, 6, 0, Math.PI * 2);
  paint(ctx, gold(ctx, -52, 98, -40, 110), '#5c3d0e', 1);

  // BODY
  const bodyPath = () => {
    ctx.beginPath();
    ctx.moveTo(-50, 0);
    ctx.bezierCurveTo(-50, -26, -6, -30, 26, -19);
    ctx.quadraticCurveTo(50, -12, 56, 0);
    ctx.quadraticCurveTo(50, 12, 26, 19);
    ctx.bezierCurveTo(-6, 30, -50, 26, -50, 0);
    ctx.closePath();
  };
  bodyPath();
  paint(ctx, metalY(ctx, -28, 28, '#ffffff', '#efe8fb', '#8f7fc0'), '#6f5e9c', 1.8);
  ctx.save();
  bodyPath();
  ctx.clip();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.28;
  ctx.fillStyle = spectrumFill(ctx, time * 0.6, 0, 0, 60);
  ctx.fillRect(-52, -30, 110, 60);
  ctx.globalAlpha = 0.6;
  const sx = ((time * 0.5) % 1) * 160 - 60;
  ctx.fillStyle = lin(ctx, sx - 10, 0, sx + 10, 0, [
    [0, 'rgba(255,255,255,0)'],
    [0.5, 'rgba(255,255,255,0.8)'],
    [1, 'rgba(255,255,255,0)'],
  ]);
  ctx.fillRect(sx - 10, -30, 20, 60);
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
  for (const bx of [-26, 18]) {
    ctx.fillStyle = gold(ctx, bx, -30, bx + 4, 30);
    ctx.fillRect(bx, -30, 4, 60);
  }
  ctx.restore();
  ammoPips(ctx, -40, -11, p.ammoLeft, p.ammoTotal, 5, (i) => SPECTRUM[i % 7], time);
  for (let k = 0; k < 3; k++) {
    const px = -36 + k * 20;
    ctx.beginPath();
    ctx.arc(px, 10, 4.5, 0, Math.PI * 2);
    paint(ctx, '#1a1033', '#f5c542', 1.2);
    glowDot(ctx, px, 10, 8, hsl(H + k * 60), 0.9);
  }

  // DOME
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(-8, -20, 22, 20, 0, Math.PI, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  const dg = ctx.createRadialGradient(-8, -26, 2, -8, -22, 24);
  dg.addColorStop(0, '#3b1d6b');
  dg.addColorStop(1, '#120a26');
  ctx.fillStyle = dg;
  ctx.fillRect(-32, -42, 48, 24);
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = spectrumFill(ctx, time * 2.2, -8, -24, 22);
  ctx.beginPath();
  ctx.arc(-8, -24, 16, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.restore();
  for (let k = 0; k < 4; k++) {
    const a = time * 1.6 + k * 1.6;
    drawTwinkle(ctx, -8 + Math.cos(a) * 11, -26 + Math.sin(a) * 6, 3 + Math.sin(time * 5 + k), '#ffffff', 0.9, a);
  }
  ctx.beginPath();
  ctx.ellipse(-8, -20, 22, 20, 0, Math.PI, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(-8, -20, 16, 15, 0, Math.PI * 1.15, Math.PI * 1.45);
  ctx.strokeStyle = 'rgba(255,255,255,0.6)';
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.beginPath();
  ctx.roundRect(-32, -22, 48, 4, 2);
  paint(ctx, gold(ctx, -32, -22, -32, -18), '#5c3d0e', 0.8);
  ctx.strokeStyle = gold(ctx, -10, -54, -6, -40);
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-8, -40);
  ctx.lineTo(-8, -54);
  ctx.stroke();
  drawTwinkle(ctx, -8, -57, 6 + Math.sin(time * 7) * 2, hsl(H + 200), 1, time);

  // BARREL + RINGS
  poly(ctx, [52, -9, 104, -5, 104, 5, 52, 9]);
  paint(ctx, metalY(ctx, -9, 9, '#ffffff', '#d9d0ef', '#7a6aa8'), '#5c4d8a', 1.4);
  for (let k = 0; k < 3; k++) {
    const x = 62 + k * 15;
    const ry = 21 - k * 4;
    const pulse = 1 + 0.12 * Math.sin(time * 8 - k * 1.2) + recoil * 0.3;
    ctx.save();
    ctx.translate(x, 0);
    ctx.scale(1, pulse);
    ctx.beginPath();
    ctx.ellipse(0, 0, 4, ry, 0, 0, Math.PI * 2);
    paint(ctx, lin(ctx, 0, -ry, 0, ry, [[0, '#fff1b8'], [0.5, '#f5c542'], [1, '#7a5310']]), '#5c3d0e', 1.2);
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = hsl(H + k * 90, 100, 65);
    ctx.globalAlpha = Math.min(1, 0.8 * E);
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.ellipse(0, 0, 6, ry + 2.5, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
  poly(ctx, [104, -7, 114, -3, 114, 3, 104, 7]);
  paint(ctx, spectrumFill(ctx, time * 3, 109, 0, 8), '#ffffff', 1);
  glowDot(ctx, 115, 0, 16 + Math.sin(time * 6) * 3, hsl(H), 0.9);
  drawTwinkle(ctx, 116, 0, 9, hsl(H + 180), 0.9, time);

  triggerGuard(ctx, -6, 18, 26, 20, gold(ctx, -6, 18, 26, 38), '#5c3d0e');
  trigger(ctx, 9, 20, recoil, '#ffffff', '#6f5e9c');

  for (let i = 0; i < 12; i++) {
    const t = (time * 0.35 + pr(i)) % 1;
    drawTwinkle(
      ctx,
      -40 + t * 190,
      (pr(i * 3.1) - 0.5) * 110 + Math.sin(time * 2 + i) * 5,
      2 + pr(i * 5) * 2.5,
      hsl(H + i * 40),
      Math.sin(t * Math.PI) * 0.85,
      t * 6
    );
  }

  if (od) odRings(ctx, 118, (k) => SPECTRUM[k * 2], time);
  gunFlash(ctx, 118, 0, muzzleFlash, { core: '#ffffff', mid: hsl(H, 100, 72), rgba: th.plasmaGlowRgba, rainbow: true }, time, 1.1);
  if (muzzleFlash > 0.02) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = muzzleFlash;
    for (let i = 0; i < 7; i++) {
      const r = 10 + (1 - muzzleFlash) * 40 + i * 3;
      ctx.strokeStyle = SPECTRUM[i];
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(124, 0, r * 0.3, r, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }
}

// ============================================================================
// 🌊 TSUNAMI SOAKER — legendary pressure water gun
// ============================================================================
function drawSoaker(ctx: C2D, p: GunRenderParams, E: number) {
  const { time, recoil, muzzleFlash, overdrivePrimed: od, theme: th } = p;
  const level = p.ammoTotal > 0 ? Math.max(0.05, p.ammoLeft / p.ammoTotal) : 1;

  aura(ctx, 30, -10, od ? 155 : 125, th.plasmaGlowRgba, E);

  // GRIP (ribbed rubber)
  const gripPts = [-48, 16, -10, 16, -24, 98, -32, 104, -64, 102, -68, 94];
  poly(ctx, gripPts);
  paint(
    ctx,
    lin(ctx, -68, 0, -10, 0, [
      [0, '#061523'],
      [0.45, '#1f5482'],
      [0.7, '#163f63'],
      [1, '#061523'],
    ]),
    '#020a12',
    1.6
  );
  ctx.save();
  poly(ctx, gripPts);
  ctx.clip();
  for (let k = 0; k < 8; k++) {
    const y = 26 + k * 10;
    ctx.strokeStyle = 'rgba(0,0,0,0.45)';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(-80, y);
    ctx.lineTo(0, y - 3);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(108,182,232,0.3)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(-80, y + 1.6);
    ctx.lineTo(0, y - 1.4);
    ctx.stroke();
  }
  ctx.restore();
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = th.plasmaMid;
  ctx.globalAlpha = 0.7;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-12, 20);
  ctx.lineTo(-25, 94);
  ctx.stroke();
  ctx.restore();

  // PUMP
  ctx.save();
  ctx.translate(-recoil * 11, 0);
  ctx.fillStyle = steel(ctx, 24, 28);
  ctx.fillRect(18, 24, 60, 4);
  ctx.beginPath();
  ctx.roundRect(26, 18, 50, 16, 7);
  paint(ctx, metalY(ctx, 18, 34, '#4ea3d6', '#1f5f8e', '#04121e'), '#020a12', 1.4);
  ctx.strokeStyle = 'rgba(0,0,0,0.55)';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  for (let x = 32; x < 72; x += 6) {
    ctx.moveTo(x, 20);
    ctx.lineTo(x, 32);
  }
  ctx.stroke();
  ctx.restore();

  // BODY
  const bodyPath = () => {
    ctx.beginPath();
    ctx.moveTo(-54, -6);
    ctx.quadraticCurveTo(-54, -14, -44, -14);
    ctx.lineTo(60, -14);
    ctx.quadraticCurveTo(76, -12, 80, -6);
    ctx.lineTo(80, 8);
    ctx.quadraticCurveTo(76, 16, 60, 18);
    ctx.lineTo(-6, 20);
    ctx.lineTo(-12, 24);
    ctx.lineTo(-48, 20);
    ctx.quadraticCurveTo(-54, 18, -54, 10);
    ctx.closePath();
  };
  bodyPath();
  paint(ctx, metalY(ctx, -14, 24, '#7cc4f0', '#1d4e7a', '#071a2c'), '#020a12', 1.8);
  ctx.save();
  bodyPath();
  ctx.clip();
  ctx.globalCompositeOperation = 'lighter';
  for (const [yy, col, a] of [
    [5, '#22d3ee', 0.7],
    [10, '#e0f7ff', 0.5],
  ] as [number, string, number][]) {
    ctx.strokeStyle = col;
    ctx.globalAlpha = a;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    for (let x = -54; x <= 80; x += 3) {
      const y = yy + Math.sin(x * 0.18 + time * 4) * 2.2;
      if (x === -54) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.restore();
  ctx.fillStyle = gold(ctx, 0, -6, 0, -3);
  ctx.fillRect(-44, -6, 120, 2.5);

  // NOZZLE
  poly(ctx, [80, -8, 106, -5, 106, 5, 80, 8]);
  paint(ctx, metalY(ctx, -8, 8, '#b9e6ff', '#3b82b6', '#0a2a44'), '#020a12', 1.2);
  ctx.beginPath();
  ctx.roundRect(104, -8, 14, 16, 3);
  paint(ctx, gold(ctx, 104, -8, 104, 8), '#3d2706', 1.1);
  ctx.fillStyle = '#03101b';
  ctx.beginPath();
  ctx.ellipse(117.5, 0, 1.6, 4.5, 0, 0, Math.PI * 2);
  ctx.fill();
  glowDot(ctx, 118, 0, 9, '#22d3ee', 0.5 + 0.4 * E);

  // WATER TANK
  const tx0 = -44;
  const tx1 = 52;
  const ty0 = -52;
  const ty1 = -20;
  ctx.fillStyle = gold(ctx, -20, -22, -14, -14);
  ctx.fillRect(-20, -22, 6, 9);
  ctx.fillRect(36, -22, 6, 9);
  ctx.fillStyle = 'rgba(4,18,31,0.92)';
  ctx.beginPath();
  ctx.roundRect(tx0, ty0, tx1 - tx0, ty1 - ty0, 15);
  ctx.fill();
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(tx0, ty0, tx1 - tx0, ty1 - ty0, 15);
  ctx.clip();
  const wx = tx0 + level * (tx1 - tx0);
  const slosh = recoil * 6;
  const surfX = (yy: number) => wx + Math.sin(yy * 0.4 + time * 5) * 1.8 + ((yy - (ty0 + ty1) / 2) / 16) * slosh;
  ctx.beginPath();
  ctx.moveTo(tx0 - 2, ty0 - 2);
  for (let yy = ty0; yy <= ty1; yy += 2) ctx.lineTo(surfX(yy), yy);
  ctx.lineTo(tx0 - 2, ty1 + 2);
  ctx.closePath();
  ctx.fillStyle = lin(ctx, tx0, 0, wx, 0, [
    [0, '#0c4a6e'],
    [0.85, '#22d3ee'],
    [1, '#a5f3fc'],
  ]);
  ctx.fill();
  ctx.strokeStyle = 'rgba(224,247,255,0.9)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  for (let yy = ty0; yy <= ty1; yy += 2) {
    if (yy === ty0) ctx.moveTo(surfX(yy), yy);
    else ctx.lineTo(surfX(yy), yy);
  }
  ctx.stroke();
  for (let i = 0; i < 7; i++) {
    const t = (time * (0.5 + pr(i) * 0.4) + pr(i + 9)) % 1;
    const bx = tx0 + 4 + t * Math.max(0, wx - tx0 - 8);
    const by = ty0 + 5 + pr(i * 2.3) * (ty1 - ty0 - 10);
    ctx.strokeStyle = 'rgba(224,247,255,0.8)';
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.arc(bx, by, 1 + pr(i * 7) * 1.6, 0, Math.PI * 2);
    ctx.stroke();
  }
  const rx = (wx - tx0) / 2 - 8;
  if (rx > 6) {
    const cx = tx0 + (wx - tx0) / 2;
    const fa = time * 1.4;
    const fx = cx + Math.cos(fa) * rx;
    const fy = (ty0 + ty1) / 2 + Math.sin(fa) * 6;
    ctx.save();
    ctx.translate(fx, fy);
    ctx.rotate(Math.atan2(Math.cos(fa) * 6, -Math.sin(fa) * rx));
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.ellipse(0, 0, 4.6, 2.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.save();
    ctx.translate(-4.2, 0);
    ctx.rotate(Math.sin(time * 14) * 0.4);
    ctx.fillStyle = '#f97316';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-4, -2.6);
    ctx.lineTo(-4, 2.6);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(2.3, -0.6, 0.7, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  ctx.beginPath();
  ctx.roundRect(tx0 + 10, ty0 + 4, tx1 - tx0 - 20, 4, 2);
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle = '#6cb6e8';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.roundRect(tx0, ty0, tx1 - tx0, ty1 - ty0, 15);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(165,243,252,0.5)';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  for (let k = 1; k < 8; k++) {
    const lx = tx0 + k * ((tx1 - tx0) / 8);
    ctx.moveTo(lx, ty1 - 5);
    ctx.lineTo(lx, ty1 - 1);
  }
  ctx.stroke();
  for (const cx of [tx0 - 4, tx1 - 3]) {
    ctx.beginPath();
    ctx.roundRect(cx, ty0 - 2, 7, ty1 - ty0 + 4, 3);
    paint(ctx, gold(ctx, cx, ty0, cx, ty1), '#3d2706', 1);
  }

  // Pressure gauge
  ctx.save();
  ctx.translate(-36, 3);
  ctx.beginPath();
  ctx.arc(0, 0, 9.5, 0, Math.PI * 2);
  paint(ctx, gold(ctx, -9, -9, 9, 9), '#3d2706', 1);
  ctx.beginPath();
  ctx.arc(0, 0, 7.2, 0, Math.PI * 2);
  paint(ctx, '#f1f5f9');
  ctx.strokeStyle = '#ef4444';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.arc(0, 0, 5.4, -0.3, 0.75);
  ctx.stroke();
  const charge = p.charge ?? 1;
  const needle =
    Math.PI * 0.75 + Math.min(1, charge * 0.75 + recoil * 0.35 + (od ? 0.25 : 0)) * Math.PI * 1.5 + Math.sin(time * 40) * 0.04;
  ctx.strokeStyle = '#dc2626';
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(Math.cos(needle) * 6, Math.sin(needle) * 6);
  ctx.stroke();
  ctx.restore();

  triggerGuard(ctx, -6, 22, 24, 18, metalY(ctx, 22, 40, '#4ea3d6', '#1f5f8e', '#04121e'), '#020a12');
  trigger(ctx, 8, 23, recoil, '#fbbf24', '#3d2706');

  for (let k = 0; k < 8; k++) {
    const a = time * 2.4 + (k / 8) * Math.PI * 2;
    const dx = 110 + Math.cos(a) * 7;
    const dy = Math.sin(a) * (26 + recoil * 12);
    ctx.save();
    ctx.globalAlpha = Math.cos(a) > 0 ? 1 : 0.5;
    ctx.translate(dx, dy);
    ctx.fillStyle = lin(ctx, -3, 0, 3, 0, [[0, '#0ea5e9'], [0.5, '#cffafe'], [1, '#0284c7']]);
    ctx.beginPath();
    ctx.moveTo(6, 0);
    ctx.quadraticCurveTo(0, 4, -4, 0);
    ctx.quadraticCurveTo(0, -4, 6, 0);
    ctx.fill();
    ctx.restore();
  }

  if (od) odRings(ctx, 118, () => '#22d3ee', time);
  gunFlash(ctx, 118, 0, muzzleFlash, { core: '#e0f7ff', mid: '#67e8f9', rgba: th.plasmaGlowRgba }, time, 1);
  if (muzzleFlash > 0.02) {
    const flick = Math.floor(time * 30);
    ctx.save();
    ctx.translate(118, 0);
    ctx.globalAlpha = Math.min(1, muzzleFlash * 1.3);
    ctx.fillStyle = lin(ctx, 0, 0, 150, 0, [
      [0, '#ffffff'],
      [0.4, 'rgba(103,232,249,0.9)'],
      [1, 'rgba(165,243,252,0)'],
    ]);
    ctx.beginPath();
    ctx.moveTo(0, -7);
    for (let x = 0; x <= 150; x += 10) ctx.lineTo(x, -7 - (x / 150) * 4 + Math.sin(x * 0.2 + time * 30) * 2.5);
    for (let x = 150; x >= 0; x -= 10) ctx.lineTo(x, 7 + (x / 150) * 4 + Math.sin(x * 0.2 + time * 30 + 1) * 2.5);
    ctx.closePath();
    ctx.fill();
    for (let i = 0; i < 12; i++) {
      const a = (i / 11 - 0.5) * 2.6;
      const len = 22 + pr(flick + i) * 26 + (1 - muzzleFlash) * 30;
      ctx.save();
      ctx.rotate(a);
      ctx.fillStyle = lin(ctx, 0, 0, len, 0, [[0, '#ffffff'], [1, '#22d3ee']]);
      ctx.beginPath();
      ctx.moveTo(0, -2.3);
      ctx.quadraticCurveTo(len * 0.7, -3, len, 0);
      ctx.quadraticCurveTo(len * 0.7, 3, 0, 2.3);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#e0f7ff';
      ctx.beginPath();
      ctx.arc(len + 4, 0, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }
}

// ============================================================================
// ❄️ FROSTBITE BLUNDERBUSS — glacial snowball launcher
// ============================================================================
function drawSnowGun(ctx: C2D, p: GunRenderParams, E: number) {
  const { time, recoil, muzzleFlash, overdrivePrimed: od, theme: th } = p;
  const charge = p.charge ?? 1;

  aura(ctx, 40, 0, od ? 155 : 125, th.plasmaGlowRgba, E);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  drawSnowflake(ctx, 40, 0, 95, time * 0.15, '#bae6fd', 0.14 * E, 3.5);
  ctx.restore();

  // WOODEN STOCK GRIP
  const gripPath = () => {
    ctx.beginPath();
    ctx.moveTo(-48, 10);
    ctx.lineTo(-10, 14);
    ctx.quadraticCurveTo(-14, 56, -28, 98);
    ctx.quadraticCurveTo(-44, 110, -66, 100);
    ctx.quadraticCurveTo(-62, 56, -56, 20);
    ctx.closePath();
  };
  gripPath();
  paint(
    ctx,
    lin(ctx, -66, 0, -10, 0, [
      [0, '#3a2210'],
      [0.4, '#8b5a2b'],
      [0.7, '#6b4220'],
      [1, '#2e1a0c'],
    ]),
    '#1a0e05',
    1.6
  );
  ctx.save();
  gripPath();
  ctx.clip();
  ctx.strokeStyle = 'rgba(30,15,5,0.45)';
  ctx.lineWidth = 1;
  for (let k = 0; k < 7; k++) {
    ctx.beginPath();
    ctx.moveTo(-60 + k * 7, 10);
    ctx.bezierCurveTo(-50 + k * 5, 40, -62 + k * 6, 70, -54 + k * 5, 110);
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  for (let i = 0; i < 26; i++) {
    ctx.beginPath();
    ctx.arc(-14 - pr(i) * 10 - (pr(i * 2) * 60 * 0.25), 14 + pr(i * 3.7) * 86, 0.6 + pr(i * 5) * 1, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  drawSnowflake(ctx, -38, 58, 7.5, time * 0.6, '#7dd3fc', 0.8, 2.4);
  drawSnowflake(ctx, -38, 58, 7.5, time * 0.6, '#ffffff', 1, 0.9);
  ctx.restore();
  ctx.beginPath();
  ctx.arc(-50, 104, 6, 0, Math.PI * 2);
  paint(ctx, metalY(ctx, 98, 110, '#eaf6ff', '#7aa3c7', '#1b2a3a'), '#0d1824', 1);

  // RECEIVER / LOCK
  ctx.beginPath();
  ctx.roundRect(-52, -14, 72, 32, 9);
  paint(ctx, metalY(ctx, -14, 18, '#eaf6ff', '#7aa3c7', '#1b2a3a'), '#0d1824', 1.6);
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  for (let i = 0; i < 24; i++) {
    ctx.beginPath();
    ctx.arc(-50 + pr(i) * 68, -12 + pr(i * 2.2) * 28, 0.5 + pr(i * 3) * 0.9, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.save();
  ctx.translate(-46, -14);
  ctx.rotate(-0.4 + recoil * 0.55);
  poly(ctx, [0, 0, -4, -8, -12, -12, -10, -6, -3, 3]);
  paint(ctx, metalY(ctx, -12, 3, '#eaf6ff', '#7aa3c7', '#1b2a3a'), '#0d1824', 1);
  poly(ctx, [-12, -12, -16, -20, -9, -15]);
  paint(ctx, 'rgba(186,230,253,0.95)', '#ffffff', 0.8);
  ctx.restore();
  glowDot(ctx, -58, -30, 7, '#7dd3fc', 0.6 + 0.3 * Math.sin(time * 4));

  // BARREL
  ctx.beginPath();
  ctx.rect(18, -10, 72, 20);
  paint(ctx, metalY(ctx, -10, 10, '#eaf6ff', '#7aa3c7', '#1b2a3a'), '#0d1824', 1.4);
  ctx.fillStyle = lin(ctx, 90, 0, 40, 0, [[0, 'rgba(255,255,255,0.6)'], [1, 'rgba(255,255,255,0)']]);
  ctx.fillRect(18, -10, 72, 20);
  ctx.fillStyle = '#081320';
  ctx.beginPath();
  ctx.roundRect(24, -4.5, 60, 9, 4.5);
  ctx.fill();
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = `rgba(125,211,252,${0.35 * E})`;
  ctx.fillRect(24, -4.5, 60, 9);
  ctx.restore();
  const sbX = 30 + charge * 48;
  const sbg = ctx.createRadialGradient(sbX - 1.5, -1.5, 0, sbX, 0, 5);
  sbg.addColorStop(0, '#ffffff');
  sbg.addColorStop(1, '#a9cbe8');
  ctx.fillStyle = sbg;
  ctx.beginPath();
  ctx.arc(sbX, 0, 4.2, 0, Math.PI * 2);
  ctx.fill();
  for (const bx of [36, 64]) {
    ctx.fillStyle = metalY(ctx, -12, 12, '#eaf6ff', '#7aa3c7', '#1b2a3a');
    ctx.fillRect(bx, -12, 5, 24);
    drawTwinkle(ctx, bx + 2.5, -12 + ((time * 22 + bx) % 24), 3, '#e0f2fe', 0.7);
  }

  // SNOWBALL DRUM
  const dcx = 56;
  const dcy = 30;
  ctx.save();
  ctx.beginPath();
  ctx.arc(dcx, dcy, 19, 0, Math.PI * 2);
  ctx.clip();
  const dgr = ctx.createRadialGradient(dcx, dcy, 2, dcx, dcy, 20);
  dgr.addColorStop(0, '#1e3a5f');
  dgr.addColorStop(1, '#07111c');
  ctx.fillStyle = dgr;
  ctx.fillRect(dcx - 20, dcy - 20, 40, 40);
  const balls = Math.min(8, Math.max(0, p.ammoLeft));
  const drumA = time * 0.6 + recoil * 1.4;
  for (let i = 0; i < 8; i++) {
    const a = drumA + (i / 8) * Math.PI * 2;
    const bx = dcx + Math.cos(a) * 11.5;
    const by = dcy + Math.sin(a) * 11.5;
    if (i < balls) {
      const bg = ctx.createRadialGradient(bx - 1.5, by - 1.5, 0, bx, by, 5);
      bg.addColorStop(0, '#ffffff');
      bg.addColorStop(0.7, '#e3f1fc');
      bg.addColorStop(1, '#93b8d8');
      ctx.fillStyle = bg;
    } else {
      ctx.fillStyle = 'rgba(80,110,150,0.35)';
    }
    ctx.beginPath();
    ctx.arc(bx, by, 4.6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  ctx.beginPath();
  ctx.arc(dcx, dcy, 20, 0, Math.PI * 2);
  ctx.strokeStyle = metalY(ctx, dcy - 20, dcy + 20, '#eaf6ff', '#7aa3c7', '#1b2a3a');
  ctx.lineWidth = 3.5;
  ctx.stroke();
  const ca = time * 1.2 + recoil * 3;
  const kx = dcx + Math.cos(ca) * 13;
  const ky = dcy + Math.sin(ca) * 13;
  capsule(ctx, [dcx, dcy], [kx, ky], 3.2, '#cbd5e1', '#1b2a3a');
  ctx.beginPath();
  ctx.arc(kx, ky, 3.4, 0, Math.PI * 2);
  paint(ctx, '#dc2626', '#4a0b0b', 0.8);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  drawSnowflake(ctx, dcx, dcy, 5.5, -time * 1.4, '#7dd3fc', 0.9, 2);
  ctx.restore();

  // BELL MUZZLE
  poly(ctx, [88, -10, 106, -17, 118, -25, 118, 25, 106, 17, 88, 10]);
  paint(ctx, metalY(ctx, -25, 25, '#ffffff', '#9cc3e3', '#2a4a6a'), '#0d1824', 1.5);
  ctx.fillStyle = '#06101c';
  ctx.beginPath();
  ctx.ellipse(118, 0, 3.5, 22, 0, 0, Math.PI * 2);
  ctx.fill();
  glowDot(ctx, 118, 0, 22, '#7dd3fc', 0.45 + 0.35 * E);
  for (const d of [-1, 1]) {
    for (const t of [0.25, 0.5, 0.75, 0.95]) {
      const ex = 88 + t * 30;
      const ey = d * (10 + t * 15);
      const len = 8 + pr(t * 10 + d) * 12 + Math.sin(time * 2 + t * 5) * 0.6;
      ctx.fillStyle = lin(ctx, ex, 0, ex - len, 0, [[0, 'rgba(240,249,255,0.95)'], [1, 'rgba(125,211,252,0.55)']]);
      ctx.beginPath();
      ctx.moveTo(ex, ey - 2);
      ctx.lineTo(ex - len, ey);
      ctx.lineTo(ex, ey + 2);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = '#ffffff';
    for (let k = 0; k < 4; k++) {
      ctx.beginPath();
      ctx.arc(110 + k * 2.5, d * (21 + k * 1.2), 3.4 - k * 0.3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  triggerGuard(ctx, -6, 18, 22, 20, metalY(ctx, 18, 38, '#eaf6ff', '#7aa3c7', '#1b2a3a'), '#0d1824');
  trigger(ctx, 8, 20, recoil, '#cbd5e1', '#1b2a3a');

  for (let i = 0; i < 16; i++) {
    const t = (time * 0.22 + pr(i)) % 1;
    drawSnowflake(ctx, 150 - t * 240, (pr(i * 7) - 0.5) * 170 + Math.sin(time * 1.3 + i) * 7, 2 + pr(i * 3) * 2.2, time + i, '#ffffff', Math.sin(t * Math.PI) * 0.85, 0.9);
  }

  if (od) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let k = 0; k < 8; k++) {
      const a = time * 2.4 + (k / 8) * Math.PI * 2;
      drawSnowflake(ctx, 126 + Math.cos(a) * 8, Math.sin(a) * 34, 5, time * 3, '#bae6fd', 0.95, 1.4);
    }
    ctx.restore();
  }
  gunFlash(ctx, 118, 0, muzzleFlash, { core: '#ffffff', mid: '#bae6fd', rgba: th.plasmaGlowRgba }, time, 1.1);
  if (muzzleFlash > 0.02) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, muzzleFlash * 1.3);
    for (let i = 0; i < 9; i++) {
      const a = (i / 8 - 0.5) * 2.4;
      const rr = 14 + (1 - muzzleFlash) * 30;
      const px = 124 + Math.cos(a) * rr;
      const py = Math.sin(a) * rr;
      const pg = ctx.createRadialGradient(px, py, 0, px, py, 15);
      pg.addColorStop(0, 'rgba(255,255,255,0.95)');
      pg.addColorStop(0.6, 'rgba(235,245,255,0.7)');
      pg.addColorStop(1, 'rgba(235,245,255,0)');
      ctx.fillStyle = pg;
      ctx.beginPath();
      ctx.arc(px, py, 15, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalCompositeOperation = 'lighter';
    drawSnowflake(ctx, 132, 0, 30 + (1 - muzzleFlash) * 26, time * 2, '#ffffff', muzzleFlash, 3);
    ctx.restore();
  }
}

// ============================================================================
// 💎 PRISM CRYSTAL GUN — luminescent geode shard launcher (crystal, LEGENDARY)
// ============================================================================
export const CRYSTAL_THEME: WeaponTheme = {
  id: 'crystal',
  kind: 'crystal',
  rarity: 'LEGENDARY',
  rarityColor: '#67e8f9',
  short: 'CRYSTAL',
  name: 'PRISM CRYSTAL GUN',
  subtitle: 'Luminescent Geode Shard Launcher',
  tag: 'LIVING GEODE',
  armorPrimary: '#2a3540',
  armorSecondary: '#1b242e',
  armorDark: '#0c1218',
  armorHighlight: '#7f97a8',
  trimMetal: '#a5f3fc',
  plasmaCore: '#ffffff',
  plasmaMid: '#67e8f9',
  plasmaOuter: '#0891b2',
  plasmaGlowRgba: 'rgba(103, 232, 249, ',
  laserSightRgba: 'rgba(103, 232, 249, ',
  muzzleFlashHex: '#cffafe',
  spikeBody: '#1b242e',
  spikeBlade: '#a5f3fc',
};

/** Growth curve: shards pop in at 0.5 scale and crystallize up to ~1.14 */
export function crystalGrowth(age: number): number {
  const t = Math.min(1, age / 1.7);
  const e = 1 - Math.pow(1 - t, 3);
  const pop = 1 + Math.sin(Math.min(1, age / 0.5) * Math.PI) * 0.1;
  return 0.5 + 0.64 * e * pop;
}

function miniCrystal(ctx: C2D, s: number, time: number, seed: number) {
  if (s <= 0.02) return;
  ctx.save();
  ctx.scale(s, s);
  const g = ctx.createLinearGradient(0, -20, 0, 4);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.4, '#a5f3fc');
  g.addColorStop(1, '#0e7490');
  ctx.fillStyle = g;
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.moveTo(0, -20);
  ctx.lineTo(4.5, -8);
  ctx.lineTo(3.5, 3);
  ctx.lineTo(-3.5, 3);
  ctx.lineTo(-4.5, -8);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.globalAlpha = 0.4 + 0.3 * Math.sin(time * 6 + seed);
  ctx.strokeStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(0, -19);
  ctx.lineTo(0, 2);
  ctx.stroke();
  ctx.restore();
}

/**
 * A LIVING GEODE SHARD embedded in the wheel.
 * It GROWS with age, sprouts satellite crystals, shimmers, pulses, and sparkles.
 * Local frame: base at (0, +10) sinking into the wheel, tip pointing up.
 */
export function drawCrystalShard(
  ctx: C2D,
  opts: { g: number; time: number; seed: number }
) {
  const { g, time, seed } = opts;
  ctx.save();
  ctx.scale(g, g);
  const pulse = 1 + 0.035 * Math.sin(time * 5 + seed);
  ctx.scale(pulse, pulse);

  // Ambient crystal glow
  ctx.globalCompositeOperation = 'lighter';
  const gl = ctx.createRadialGradient(0, -12, 1, 0, -12, 30);
  gl.addColorStop(0, 'rgba(255,255,255,0.8)');
  gl.addColorStop(0.35, 'rgba(103,232,249,0.4)');
  gl.addColorStop(1, 'rgba(103,232,249,0)');
  ctx.fillStyle = gl;
  ctx.beginPath();
  ctx.arc(0, -12, 30, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalCompositeOperation = 'source-over';

  // Satellite crystals sprout once the main shard is ~60% grown
  const sat = Math.max(0, Math.min(1, (g - 0.74) / 0.36));
  for (const [rotA, dx, sc, sd] of [
    [-0.62, -7, 0.5, 1.3],
    [0.58, 7, 0.55, 2.1],
    [-0.95, -11, 0.38, 3.4],
  ] as [number, number, number, number][]) {
    ctx.save();
    ctx.translate(dx, 6);
    ctx.rotate(rotA);
    ctx.translate(0, 4);
    miniCrystal(ctx, sat * sc * 1.8, time, seed + sd);
    ctx.restore();
  }

  // MAIN SHARD — tall luminous kite crystal
  const body = () => {
    ctx.beginPath();
    ctx.moveTo(0, -34);
    ctx.lineTo(7.5, -14);
    ctx.lineTo(6, 4);
    ctx.lineTo(0, 10);
    ctx.lineTo(-6, 4);
    ctx.lineTo(-7.5, -14);
    ctx.closePath();
  };
  const bg = ctx.createLinearGradient(0, -34, 0, 10);
  bg.addColorStop(0, '#ffffff');
  bg.addColorStop(0.25, '#cffafe');
  bg.addColorStop(0.6, '#67e8f9');
  bg.addColorStop(1, '#0e7490');
  ctx.fillStyle = bg;
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.lineWidth = 0.9;
  body();
  ctx.fill();
  ctx.stroke();

  // Facet lines
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.moveTo(0, -33);
  ctx.lineTo(0, 9);
  ctx.moveTo(0, -33);
  ctx.lineTo(5.5, -6);
  ctx.lineTo(4.5, 7);
  ctx.moveTo(0, -33);
  ctx.lineTo(-5.5, -6);
  ctx.lineTo(-4.5, 7);
  ctx.stroke();

  // Inner white-hot core + shimmer band sweeping up
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  body();
  ctx.clip();
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(0, -30);
  ctx.lineTo(0, 6);
  ctx.stroke();
  const shY = 8 - ((time * 26 + seed * 13) % 46);
  const shG = ctx.createLinearGradient(0, shY - 7, 0, shY + 7);
  shG.addColorStop(0, 'rgba(255,255,255,0)');
  shG.addColorStop(0.5, 'rgba(255,255,255,0.75)');
  shG.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = shG;
  ctx.fillRect(-9, shY - 8, 18, 16);
  ctx.restore();
  ctx.globalCompositeOperation = 'source-over';

  // Base geode: dark ring + tiny base crystals
  ctx.fillStyle = '#0c1218';
  ctx.beginPath();
  ctx.ellipse(0, 9, 8, 3.4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(165,243,252,0.7)';
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.ellipse(0, 9, 8, 3.4, 0, 0, Math.PI * 2);
  ctx.stroke();
  for (const [bx, bsc, bs] of [
    [-9, 0.3, 4.2],
    [9, 0.32, 5.1],
    [-4, 0.22, 6],
  ] as [number, number, number][]) {
    ctx.save();
    ctx.translate(bx, 10);
    miniCrystal(ctx, Math.min(1, sat + 0.4) * bsc * 2.2, time, seed + bs);
    ctx.restore();
  }

  // Tip sparkle + orbiting crystal dust
  drawTwinkle(ctx, 0, -35, 5 + 1.6 * Math.sin(time * 7 + seed), '#ffffff', 0.95, time * 2 + seed);
  ctx.globalCompositeOperation = 'lighter';
  for (let k = 0; k < 2; k++) {
    const a = time * 2.4 + seed + k * Math.PI;
    ctx.globalAlpha = 0.8;
    ctx.fillStyle = '#a5f3fc';
    ctx.beginPath();
    ctx.arc(Math.cos(a) * 12, -18 + Math.sin(a) * 8, 1.1, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Fully-grown shards breathe a soft ring from the tip
  if (g > 1.05) {
    const ph = (time * 0.55 + seed * 0.13) % 1;
    ctx.globalAlpha = (1 - ph) * 0.5;
    ctx.strokeStyle = '#a5f3fc';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(0, -30, 6 + ph * 16, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  ctx.restore();
}

// 💎 The gun itself: geode ore body, breathing crystal cluster, prism barrel
function drawCrystalGun(ctx: C2D, p: GunRenderParams) {
  const { time, recoil, muzzleFlash, theme: th } = p;
  const s = recoil * 13;

  // Soft crystal aura
  aura(ctx, 30, -4, 120, th.plasmaGlowRgba, 0.9);

  // GRIP (dark slate with a crystal fleck)
  poly(ctx, [-14, 16, 8, 16, 2, 60, -4, 66, -22, 62, -18, 20]);
  paint(
    ctx,
    lin(ctx, -22, 0, 8, 0, [[0, '#0c1218'], [0.45, '#2a3540'], [1, '#131c24']]),
    '#06090c',
    1.4
  );
  ctx.save();
  ctx.translate(-7, 40);
  ctx.rotate(0.35);
  miniCrystal(ctx, 0.55, time, 2);
  ctx.restore();
  triggerGuard(ctx, -10, 18, 8, 14, '#22d3ee', '#06222b');
  trigger(ctx, -2, 19, recoil, '#67e8f9', '#0e3a46');

  ctx.save();
  ctx.translate(-s * 0.5, 0);

  // BODY — dark geode ore block with luminous veins
  const bodyPath = () => {
    ctx.beginPath();
    ctx.roundRect(-48, -18, 88, 36, 9);
  };
  bodyPath();
  paint(ctx, metalY(ctx, -18, 18, '#4a5a68', '#242f39', '#0c1218'), '#06090c', 1.8);
  ctx.save();
  bodyPath();
  ctx.clip();
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = 'rgba(103,232,249,0.55)';
  ctx.lineWidth = 1.1;
  const veins: number[][] = [
    [-44, 12, -20, 2, 4, -8, 20, -2],
    [-40, -12, -14, -4, 10, 6, 34, 10],
    [-30, -16, -8, 8, 18, 14, 36, 4],
  ];
  for (const v of veins) {
    ctx.globalAlpha = 0.5 + 0.3 * Math.sin(time * 2 + v[0]);
    ctx.beginPath();
    ctx.moveTo(v[0], v[1]);
    for (let i = 2; i < v.length; i += 2) ctx.lineTo(v[i], v[i + 1]);
    ctx.stroke();
  }
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = 'rgba(165,243,252,0.5)';
  for (let i = 0; i < 18; i++) {
    ctx.beginPath();
    ctx.arc(-44 + pr(i * 1.7) * 80, -14 + pr(i * 3.1) * 28, 0.7 + pr(i) * 0.9, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // THE EMBEDDED GEODE CLUSTER (breathing)
  const breathe = 1 + 0.04 * Math.sin(time * 3);
  ctx.save();
  ctx.translate(-6, 0);
  ctx.scale(breathe, breathe);
  ctx.globalCompositeOperation = 'lighter';
  const bed = ctx.createRadialGradient(0, -6, 2, 0, -6, 30);
  bed.addColorStop(0, 'rgba(255,255,255,0.75)');
  bed.addColorStop(0.4, 'rgba(103,232,249,0.4)');
  bed.addColorStop(1, 'rgba(103,232,249,0)');
  ctx.fillStyle = bed;
  ctx.beginPath();
  ctx.arc(0, -6, 30, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalCompositeOperation = 'source-over';
  for (const [rotA, dx, dy, sc, sd] of [
    [-0.4, -10, 2, 0.85, 1.1],
    [0.35, 10, 2, 0.9, 2.2],
    [0, 0, -6, 1.25, 3.3],
  ] as [number, number, number, number, number][]) {
    ctx.save();
    ctx.translate(dx, dy);
    ctx.rotate(rotA);
    ctx.scale(sc, sc);
    const g = ctx.createLinearGradient(0, -30, 0, 6);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.3, '#cffafe');
    g.addColorStop(0.65, '#67e8f9');
    g.addColorStop(1, '#0e7490');
    ctx.fillStyle = g;
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(0, -30);
    ctx.lineTo(6.5, -12);
    ctx.lineTo(5, 4);
    ctx.lineTo(0, 8);
    ctx.lineTo(-5, 4);
    ctx.lineTo(-6.5, -12);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.moveTo(0, -29);
    ctx.lineTo(0, 7);
    ctx.stroke();
    ctx.restore();
    void sd;
  }
  ctx.restore();

  // Twinkling stars drifting around the cluster
  for (let k = 0; k < 3; k++) {
    const a = time * 0.9 + k * 2.1;
    drawTwinkle(
      ctx,
      -6 + Math.cos(a) * 30,
      -8 + Math.sin(a) * 20,
      3 + Math.sin(time * 4 + k * 2) * 1.4,
      '#cffafe',
      0.55 + 0.35 * Math.sin(time * 3 + k),
      a
    );
  }

  // BARREL — translucent crystal prism tube
  const barrel = () => {
    ctx.beginPath();
    ctx.moveTo(40, -8);
    ctx.lineTo(98, -10);
    ctx.lineTo(98, 10);
    ctx.lineTo(40, 8);
    ctx.closePath();
  };
  barrel();
  ctx.fillStyle = 'rgba(165,243,252,0.32)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.75)';
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.4)';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  for (const fx of [52, 66, 80, 92]) {
    ctx.moveTo(fx, -9.4);
    ctx.lineTo(fx, 9.4);
  }
  ctx.stroke();
  // Inner light core (brighter when recharged)
  const ch = p.charge ?? 1;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.35 + 0.55 * ch;
  ctx.strokeStyle = '#a5f3fc';
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(42, 0);
  ctx.lineTo(96, 0);
  ctx.stroke();
  ctx.restore();
  // Muzzle: flared crystal mouth
  ctx.beginPath();
  ctx.moveTo(98, -10);
  ctx.lineTo(114, -16);
  ctx.lineTo(118, -13);
  ctx.lineTo(118, 13);
  ctx.lineTo(114, 16);
  ctx.lineTo(98, 10);
  ctx.closePath();
  ctx.fillStyle = 'rgba(207,250,254,0.5)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.lineWidth = 1.4;
  ctx.stroke();
  for (const sy of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(112, sy * 14);
    ctx.lineTo(119, sy * 20);
    ctx.lineTo(116, sy * 11);
    ctx.closePath();
    ctx.fillStyle = '#cffafe';
    ctx.fill();
    ctx.stroke();
  }
  glowDot(ctx, 117, 0, 11, th.plasmaMid, 0.35 + 0.4 * ch);
  // Top antenna crystal
  ctx.save();
  ctx.translate(-18, -16);
  ctx.rotate(-0.35);
  miniCrystal(ctx, 0.5, time, 8.8);
  ctx.restore();

  // Ammo: cyan diamond pips
  ammoPips(ctx, -42, 12, p.ammoLeft, p.ammoTotal, 4.6, () => '#a5f3fc', time);

  ctx.restore();

  // Muzzle flash: luminous star + shard rays
  gunFlash(ctx, 118, 0, muzzleFlash, { core: '#ffffff', mid: th.muzzleFlashHex, rgba: th.plasmaGlowRgba }, time, 1);
  if (muzzleFlash > 0.02) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = muzzleFlash;
    for (let i = 0; i < 6; i++) {
      const a = (i / 5 - 0.5) * 1.6;
      ctx.save();
      ctx.translate(120, 0);
      ctx.rotate(a);
      ctx.fillStyle = i % 2 ? '#a5f3fc' : '#ffffff';
      ctx.beginPath();
      ctx.moveTo(0, -1.6);
      ctx.lineTo(26 + (1 - muzzleFlash) * 18, 0);
      ctx.lineTo(0, 1.6);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }
}

// ============================================================================
// DISPATCH
// ============================================================================
export function drawSideGun(ctx: C2D, p: GunRenderParams) {
  const charge = p.charge ?? 1;
  const E = Math.min(1.5, 0.5 + charge * 0.5 + p.recoil * 0.7 + (p.overdrivePrimed ? 0.5 : 0));
  ctx.save();
  ctx.translate(p.x, p.y + p.recoil * 14 * p.scale);
  ctx.scale(p.scale, p.scale);
  // Soft floor shadow anchoring the hovering gun (stays put while the gun bobs)
  ctx.save();
  ctx.translate(0, 150);
  ctx.scale(1, 0.24);
  const shG = ctx.createRadialGradient(0, 0, 10, 0, 0, 215);
  shG.addColorStop(0, 'rgba(0,0,0,0.5)');
  shG.addColorStop(0.55, 'rgba(0,0,0,0.25)');
  shG.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = shG;
  ctx.beginPath();
  ctx.arc(0, 0, 215, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // Gentle floating bob (no hands — weapons hover)
  ctx.translate(0, Math.sin(p.time * 1.6) * 3);
  ctx.transform(0, -1, -1, 0, 0, 0);
  ctx.translate(-30, 40);
  ctx.rotate(-p.recoil * 0.06);
  ctx.translate(30, -40);

  switch (p.theme.kind) {
    case 'revolver':
      drawRevolver(ctx, p, E);
      break;
    case 'shotgun':
      drawShotgun(ctx, p, E);
      break;
    case 'rainbow':
      drawRayGun(ctx, p, E);
      break;
    case 'water':
      drawSoaker(ctx, p, E);
      break;
    case 'snow':
      drawSnowGun(ctx, p, E);
      break;
    case 'rifle':
      drawRifle(ctx, p, E);
      break;
    case 'banana':
      drawBananaGun(ctx, p);
      break;
    case 'beehive':
      drawBeeHiveGun(ctx, p);
      break;
    case 'bubble':
      drawBubbleGun(ctx, p);
      break;
    case 'confetti':
      drawConfettiCannon(ctx, p);
      break;
    case 'crystal':
      drawCrystalGun(ctx, p);
      break;
    default:
      drawPistol(ctx, p, E);
  }
  ctx.restore();
}

// ============================================================================
// BULLETS (screen-space, pointing UP: tip y=-36 into the wheel, base y=+30)
// ============================================================================
export function drawGunBullet(
  ctx: C2D,
  theme: WeaponTheme,
  opts: { scale?: number; isOverdrive?: boolean; flash?: number; inFlight?: boolean; time?: number }
) {
  const { scale = 1, isOverdrive = false, flash = 0, inFlight = false, time = 0 } = opts;
  const kind = theme.kind;
  const tip = kind === 'shotgun' ? '#fb923c' : theme.plasmaMid;
  ctx.save();
  ctx.scale(scale, scale);

  if (inFlight) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const len = isOverdrive ? 170 : 110;
    ctx.fillStyle = lin(ctx, 0, 10, 0, 10 + len, [
      [0, '#ffffff'],
      [0.18, tip],
      [1, 'rgba(0,0,0,0)'],
    ]);
    ctx.beginPath();
    ctx.moveTo(-7, 14);
    ctx.lineTo(7, 14);
    ctx.lineTo(0, 14 + len);
    ctx.closePath();
    ctx.fill();
    for (let k = 0; k < 3; k++) {
      const t = (time * 7 + k / 3) % 1;
      ctx.strokeStyle = tip;
      ctx.globalAlpha = (1 - t) * 0.7;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.ellipse(0, 22 + t * len * 0.6, 5 + t * 10, 1.5 + t * 2, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    const tb = ctx.createRadialGradient(0, -28, 0, 0, -28, 24);
    tb.addColorStop(0, '#ffffff');
    tb.addColorStop(0.35, tip);
    tb.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = tb;
    ctx.beginPath();
    ctx.arc(0, -28, 24, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  if (kind === 'banana') {
    // Flying BANANA FLESH — cream, tapered, launched from the peel
    ctx.beginPath();
    ctx.moveTo(-7, 26);
    ctx.quadraticCurveTo(-13, -4, -5, -26);
    ctx.quadraticCurveTo(-1, -35, 3, -33);
    ctx.quadraticCurveTo(10, -17, 9, 5);
    ctx.quadraticCurveTo(8, 21, 1, 30);
    ctx.closePath();
    paint(ctx, lin(ctx, -12, 0, 10, 0, [[0, '#dccf9a'], [0.3, '#f7efc9'], [0.55, '#fffdf2'], [0.8, '#f3e9bd'], [1, '#d8ca94']]), '#c9b877', 1.1);
    // Longitudinal flesh ridges
    ctx.strokeStyle = 'rgba(190,166,100,0.6)';
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(-4, 22);
    ctx.quadraticCurveTo(-8, -6, -2, -26);
    ctx.moveTo(3, 24);
    ctx.quadraticCurveTo(7, -6, 4, -27);
    ctx.stroke();
    // Tiny seed dots
    ctx.fillStyle = 'rgba(122,92,32,0.5)';
    for (const [sx, sy] of [[1, -12], [0, 0], [2, 12]]) {
      ctx.beginPath();
      ctx.arc(sx, sy, 0.9, 0, Math.PI * 2);
      ctx.fill();
    }
    // Little brown peel nub where the flesh was torn off
    ctx.fillStyle = '#8a5a1a';
    ctx.beginPath();
    ctx.arc(-1, 30, 2.6, 0, Math.PI * 2);
    ctx.fill();
    // Soft highlight
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(-5, 20);
    ctx.quadraticCurveTo(-10, -4, -4, -22);
    ctx.stroke();
  } else if (kind === 'beehive') {
    // Busy little bee projectile
    const flap = Math.sin(time * 40);
    // Wings (behind)
    ctx.save();
    ctx.globalAlpha = 0.75;
    ctx.fillStyle = 'rgba(224,242,254,0.85)';
    ctx.beginPath();
    ctx.ellipse(-7, -14 + flap * 3, 8, 4.5, -0.6 - flap * 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(7, -14 + flap * 3, 8, 4.5, 0.6 + flap * 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    // Body
    ctx.beginPath();
    ctx.ellipse(0, 0, 9.5, 13, 0, 0, Math.PI * 2);
    paint(ctx, lin(ctx, -9, 0, 9, 0, [[0, '#3f2d05'], [0.3, '#fde047'], [0.6, '#facc15'], [1, '#713f12']]), '#422006', 1.2);
    // Stripes
    ctx.strokeStyle = '#1c1403';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-8.5, -4);
    ctx.lineTo(8.5, -4);
    ctx.moveTo(-9, 2);
    ctx.lineTo(9, 2);
    ctx.stroke();
    // Head + eyes
    ctx.beginPath();
    ctx.arc(0, -15, 5.5, 0, Math.PI * 2);
    paint(ctx, '#2b2109', '#0f0a02', 1);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(-2, -16, 1.4, 0, Math.PI * 2);
    ctx.arc(2, -16, 1.4, 0, Math.PI * 2);
    ctx.fill();
    // Stinger
    ctx.fillStyle = '#713f12';
    ctx.beginPath();
    ctx.moveTo(-2, 13);
    ctx.lineTo(0, 20);
    ctx.lineTo(2, 13);
    ctx.closePath();
    ctx.fill();
  } else if (kind === 'bubble') {
    // Big glossy iridescent soap bubble
    const wob = 1 + Math.sin(time * 10) * 0.05;
    ctx.save();
    ctx.scale(wob, 2 - wob);
    const bg = ctx.createRadialGradient(-4, -12, 2, 0, -8, 16);
    bg.addColorStop(0, 'rgba(255,255,255,0.5)');
    bg.addColorStop(0.5, 'rgba(186,230,253,0.22)');
    bg.addColorStop(0.85, 'rgba(147,197,253,0.16)');
    bg.addColorStop(1, 'rgba(125,211,252,0.45)');
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.arc(0, -8, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(224,242,254,0.9)';
    ctx.lineWidth = 1.4;
    ctx.stroke();
    // Iridescent film sheen
    ctx.globalCompositeOperation = 'lighter';
    for (const [a0, col] of [
      [2.4, 'rgba(249,168,212,0.55)'],
      [4.2, 'rgba(125,211,252,0.55)'],
      [5.4, 'rgba(163,230,53,0.4)'],
    ] as [number, string][]) {
      ctx.strokeStyle = col;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, -8, 12.5, a0, a0 + 0.9);
      ctx.stroke();
    }
    ctx.globalCompositeOperation = 'source-over';
    // Highlights
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.beginPath();
    ctx.ellipse(-6, -14, 3.4, 2, -0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    ctx.ellipse(5, -2, 1.6, 1, 0.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.globalAlpha = 1;
  } else if (kind === 'confetti') {
    // Spinning party pinwheel shot
    ctx.save();
    ctx.translate(0, -4);
    ctx.rotate(time * 14);
    for (let k = 0; k < 4; k++) {
      ctx.rotate(Math.PI / 2);
      ctx.fillStyle = SPECTRUM[(k + 2) % 7];
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(14, -4, 16, -14);
      ctx.quadraticCurveTo(6, -14, 0, 0);
      ctx.fill();
    }
    ctx.beginPath();
    ctx.arc(0, 0, 3.6, 0, Math.PI * 2);
    paint(ctx, gold(ctx, -3, -3, 3, 3), '#713f12', 0.8);
    ctx.restore();
  } else if (kind === 'crystal') {
    // Luminous crystal shard bullet
    const cbody = () => {
      ctx.beginPath();
      ctx.moveTo(0, -32);
      ctx.lineTo(7, -12);
      ctx.lineTo(5, 18);
      ctx.lineTo(0, 24);
      ctx.lineTo(-5, 18);
      ctx.lineTo(-7, -12);
      ctx.closePath();
    };
    const cg = ctx.createLinearGradient(0, -32, 0, 24);
    cg.addColorStop(0, '#ffffff');
    cg.addColorStop(0.3, '#cffafe');
    cg.addColorStop(0.65, '#67e8f9');
    cg.addColorStop(1, '#0e7490');
    ctx.fillStyle = cg;
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 1;
    cbody();
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.moveTo(0, -31);
    ctx.lineTo(0, 23);
    ctx.moveTo(0, -31);
    ctx.lineTo(5, -4);
    ctx.lineTo(4, 16);
    ctx.moveTo(0, -31);
    ctx.lineTo(-5, -4);
    ctx.lineTo(-4, 16);
    ctx.stroke();
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const cl = ctx.createRadialGradient(0, -10, 0, 0, -10, 24);
    cl.addColorStop(0, 'rgba(255,255,255,0.8)');
    cl.addColorStop(0.4, 'rgba(103,232,249,0.4)');
    cl.addColorStop(1, 'rgba(103,232,249,0)');
    ctx.fillStyle = cl;
    ctx.beginPath();
    ctx.arc(0, -10, 24, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    drawTwinkle(ctx, 0, -33, 4 + Math.sin(time * 9) * 1.5, '#ffffff', 0.9, time * 2);
  } else if (kind === 'rifle') {
    // 5.56×45 slim cartridge, blue tracer paint
    ctx.beginPath();
    ctx.roundRect(-4.4, -4, 8.8, 32, 1.4);
    paint(ctx, gold(ctx, -4.4, 0, 4.4, 0), '#3d2706', 0.9);
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(-4.4, 24, 8.8, 1.4);
    ctx.beginPath();
    ctx.moveTo(-3.8, -4);
    ctx.quadraticCurveTo(-4, -24, 0, -36);
    ctx.quadraticCurveTo(4, -24, 3.8, -4);
    ctx.closePath();
    paint(ctx, lin(ctx, -4, 0, 4, 0, [[0, '#1e3a8a'], [0.45, '#3b82f6'], [1, '#1e3a8a']]), '#172554', 0.9);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = '#93c5fd';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(0, -34);
    ctx.lineTo(0, -6);
    ctx.stroke();
    ctx.restore();
    glowDot(ctx, 0, -33, 9, '#93c5fd', 0.85);
  } else if (kind === 'pistol') {
    // .45 ACP: brass case + semi-jacketed lead bullet
    ctx.beginPath();
    ctx.roundRect(-5.5, -6, 11, 34, 1.6);
    paint(ctx, gold(ctx, -5.5, 0, 5.5, 0), '#3d2706', 1);
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(-5.5, 24, 11, 1.6);
    ctx.beginPath();
    ctx.moveTo(-4.8, -6);
    ctx.quadraticCurveTo(-5, -24, 0, -36);
    ctx.quadraticCurveTo(5, -24, 4.8, -6);
    ctx.closePath();
    paint(ctx, lin(ctx, -5, 0, 5, 0, [[0, '#3f4750'], [0.45, '#8b98a5'], [1, '#3f4750']]), '#20262c', 0.9);
    glowDot(ctx, 0, -32, 9, theme.plasmaMid, 0.8);
  } else if (kind === 'shotgun') {
    ctx.beginPath();
    ctx.roundRect(-8, -10, 16, 30, 2);
    paint(
      ctx,
      lin(ctx, -8, 0, 8, 0, [
        [0, '#5a0e0e'],
        [0.35, '#ef4444'],
        [0.6, '#b91c1c'],
        [1, '#450a0a'],
      ]),
      '#2a0505',
      1.1
    );
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    for (let k = 0; k < 5; k++) ctx.fillRect(-8, -6 + k * 5, 16, 1);
    ctx.beginPath();
    ctx.roundRect(-8.5, 18, 17, 12, 1.5);
    paint(ctx, gold(ctx, -8.5, 0, 8.5, 0), '#3d2706', 1);
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(-8.5, 26, 17, 1.2);
    ctx.beginPath();
    ctx.moveTo(-7, -10);
    ctx.quadraticCurveTo(-7, -30, 0, -36);
    ctx.quadraticCurveTo(7, -30, 7, -10);
    ctx.closePath();
    const sg = ctx.createRadialGradient(-2, -24, 0, 0, -20, 16);
    sg.addColorStop(0, '#fff7cc');
    sg.addColorStop(0.45, '#fb923c');
    sg.addColorStop(1, '#7c2d12');
    paint(ctx, sg, '#431407', 1);
    ctx.strokeStyle = 'rgba(67,20,7,0.6)';
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    for (let k = 0; k < 3; k++) {
      ctx.moveTo(-5 + k * 4, -12);
      ctx.lineTo(-3 + k * 4, -24);
    }
    ctx.stroke();
    glowDot(ctx, 0, -24, 14, '#fb923c', 0.45 + 0.25 * Math.sin(time * 9));
  } else {
    const rev = kind === 'revolver';
    ctx.beginPath();
    ctx.roundRect(-6.5, -8, 13, 34, 1.5);
    paint(
      ctx,
      rev
        ? lin(ctx, -6.5, 0, 6.5, 0, [
            [0, '#4a300a'],
            [0.35, '#e8b860'],
            [0.6, '#b07a28'],
            [1, '#3d2706'],
          ])
        : gold(ctx, -6.5, 0, 6.5, 0),
      '#3d2706',
      1
    );
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(-6.5, 21, 13, 2);
    ctx.beginPath();
    ctx.roundRect(-7.3, 23.5, 14.6, 4, 1);
    paint(ctx, gold(ctx, -7.3, 0, 7.3, 0), '#3d2706', 0.8);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(-6.5, -6, 13, 1);
    ctx.beginPath();
    ctx.moveTo(-6, -8);
    ctx.quadraticCurveTo(-6.5, -26, 0, -36);
    ctx.quadraticCurveTo(6.5, -26, 6, -8);
    ctx.closePath();
    paint(
      ctx,
      rev
        ? lin(ctx, -6, 0, 6, 0, [
            [0, '#1a0a0b'],
            [0.45, '#8f2222'],
            [1, '#2a0f10'],
          ])
        : lin(ctx, -6, 0, 6, 0, [
            [0, '#8a8478'],
            [0.45, '#ffffff'],
            [1, '#bdb6a8'],
          ]),
      rev ? '#0c0405' : '#4a463e',
      1
    );
    if (rev) {
      rune(ctx, 0, -18, 3.5, 1, theme.plasmaMid, 0.6 + 0.4 * Math.sin(time * 6));
      rune(ctx, 0, 8, 3.2, 3, theme.plasmaMid, 0.45);
    } else {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = theme.plasmaMid;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(-6, -12);
      ctx.lineTo(6, -12);
      ctx.stroke();
      ctx.restore();
      ctx.strokeStyle = '#7a5310';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let k = 0; k < 3; k++) {
        ctx.moveTo(-4, 4 + k * 4);
        ctx.lineTo(0, 1 + k * 4);
        ctx.lineTo(4, 4 + k * 4);
      }
      ctx.stroke();
    }
    glowDot(ctx, 0, -33, 9, tip, 0.85);
  }

  if (flash > 0.01) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = flash;
    const fg = ctx.createRadialGradient(0, -10, 0, 0, -10, 22);
    fg.addColorStop(0, '#ffffff');
    fg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = fg;
    ctx.beginPath();
    ctx.arc(0, -10, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}
