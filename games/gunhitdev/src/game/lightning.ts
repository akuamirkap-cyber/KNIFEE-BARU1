/* =========================================================================
   LIGHTNING GENERATOR & RENDERER (RAMPING, INDAH, ULTRA FAST 60 FPS)
   Menggunakan multi-layer additive blending (tanpa shadowBlur yang bikin lag)
   ========================================================================= */

import { rgba } from "./weapons";

export interface BoltSegment {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  thick: number;
  alpha: number;
}

/**
 * Petir zigzag ramping berkecepatan tinggi tanpa alokasi berat
 */
export function createCrispBolt(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  opts: {
    sway?: number;
    steps?: number;
    branchChance?: number;
  } = {}
): BoltSegment[] {
  const segments: BoltSegment[] = [];
  const sway = opts.sway ?? 6;
  const steps = opts.steps ?? 6;
  const branchChance = opts.branchChance ?? 0.25;

  const dx = x1 - x0;
  const dy = y1 - y0;
  const dist = Math.hypot(dx, dy) || 1;
  const nx = -dy / dist;
  const ny = dx / dist;

  let curX = x0;
  let curY = y0;

  for (let i = 1; i <= steps; i++) {
    const u = i / steps;
    const envelope = Math.sin(u * Math.PI);
    const offset = (Math.random() - 0.5) * sway * envelope * 2;
    const nextX = x0 + dx * u + nx * offset;
    const nextY = y0 + dy * u + ny * offset;

    segments.push({
      x0: curX,
      y0: curY,
      x1: nextX,
      y1: nextY,
      thick: 1.2,
      alpha: 0.95,
    });

    if (i > 1 && i < steps && Math.random() < branchChance) {
      const bLen = dist * (0.12 + Math.random() * 0.15);
      const bAngle = (Math.random() - 0.5) * 1.1;
      const cosA = Math.cos(bAngle);
      const sinA = Math.sin(bAngle);
      const vx = (dx / dist) * bLen;
      const vy = (dy / dist) * bLen;
      const bx = curX + (vx * cosA - vy * sinA);
      const by = curY + (vx * sinA + vy * cosA);

      segments.push({
        x0: curX,
        y0: curY,
        x1: bx,
        y1: by,
        thick: 0.7,
        alpha: 0.6,
      });
    }

    curX = nextX;
    curY = nextY;
  }

  return segments;
}

/**
 * Render petir ramping bercahaya indah 60 FPS (Zero shadowBlur penalty)
 */
export function renderCrispBolt(
  ctx: CanvasRenderingContext2D,
  segments: BoltSegment[],
  color = "#4deeea",
  bloomSize = 6
) {
  if (segments.length === 0) return;
  void bloomSize; // digantikan oleh additive multi-stroke layer yang jauh lebih cepat

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  // Layer 1: Aura pendar ramping lembut
  ctx.strokeStyle = rgba(color, 0.22);
  ctx.lineWidth = 4.2;
  ctx.beginPath();
  for (const s of segments) {
    ctx.moveTo(s.x0, s.y0);
    ctx.lineTo(s.x1, s.y1);
  }
  ctx.stroke();

  // Layer 2: Neon core berwarna tajam
  ctx.strokeStyle = rgba(color, 0.8);
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  for (const s of segments) {
    ctx.moveTo(s.x0, s.y0);
    ctx.lineTo(s.x1, s.y1);
  }
  ctx.stroke();

  // Layer 3: Inti putih panas jarum presisi (ramping & tajam)
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 0.85;
  ctx.beginPath();
  for (const s of segments) {
    ctx.moveTo(s.x0, s.y0);
    ctx.lineTo(s.x1, s.y1);
  }
  ctx.stroke();

  ctx.restore();
}

/**
 * Busur listrik halus di permukaan lingkaran target
 */
export function drawCircleSurfaceArc(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  startAngle: number,
  sweepAngle: number,
  seed = 0,
  glowColor = "#4deeea"
) {
  const steps = 8;
  const step = sweepAngle / steps;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.lineCap = "round";

  ctx.beginPath();
  for (let i = 0; i <= steps; i++) {
    const a = startAngle + i * step;
    const jitter = (Math.sin(i * 3.7 + seed * 11) - 0.5) * 3;
    const r = radius + jitter;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }

  // Aura halus
  ctx.strokeStyle = rgba(glowColor, 0.35);
  ctx.lineWidth = 3.0;
  ctx.stroke();

  // Inti tajam
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 0.9;
  ctx.stroke();

  ctx.restore();
}
