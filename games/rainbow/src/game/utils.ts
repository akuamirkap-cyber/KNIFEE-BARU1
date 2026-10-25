export const TAU = Math.PI * 2;

export const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const rand = (min: number, max: number) => min + Math.random() * (max - min);
export const randInt = (min: number, max: number) => Math.floor(rand(min, max + 1));
export const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

export const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
export const easeIn = (t: number) => t * t * t;
export const easeOutBack = (t: number) => {
  const c = 1.70158;
  return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2);
};

/** normalize angle to [-PI, PI] */
export const norm = (a: number) => {
  a = ((a + Math.PI) % TAU + TAU) % TAU - Math.PI;
  return a;
};
export const angDist = (a: number, b: number) => Math.abs(norm(a - b));

/** hsla color string */
export const hsl = (h: number, s: number, l: number, a = 1) =>
  `hsla(${((h % 360) + 360) % 360}, ${s}%, ${l}%, ${a})`;

/** point on circle: angle 0 = bottom, positive = counter-clockwise (screen) */
export const px = (cx: number, r: number, a: number) => cx + r * Math.sin(a);
export const py = (cy: number, r: number, a: number) => cy + r * Math.cos(a);

/** rainbow linear gradient */
export function rainbowGradient(
  ctx: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  t: number,
  alpha = 1,
  light = 58,
  sat = 95,
  spread = 360
) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  const n = 7;
  for (let i = 0; i <= n; i++) {
    const p = i / n;
    const hue = t * 45 + p * spread;
    const l = light + Math.sin(p * Math.PI) * 8;
    g.addColorStop(p, hsl(hue, sat, l, alpha));
  }
  return g;
}

/** conic rainbow gradient (native when available, segment fallback handled by caller) */
export function conicRainbow(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  t: number,
  alpha = 1,
  light = 55,
  sat = 95
): CanvasGradient | null {
  const anyCtx = ctx as unknown as {
    createConicGradient?: (start: number, x: number, y: number) => CanvasGradient;
  };
  if (!anyCtx.createConicGradient) return null;
  const g = anyCtx.createConicGradient(t, cx, cy);
  const n = 12;
  for (let i = 0; i <= n; i++) {
    const p = i / n;
    g.addColorStop(p, hsl(t * 40 + p * 360, sat, light, alpha));
  }
  return g;
}

/** fill an annulus (ring) path */
export function ringPath(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rOuter: number,
  rInner: number
) {
  ctx.beginPath();
  ctx.arc(cx, cy, rOuter, 0, TAU);
  ctx.arc(cx, cy, rInner, 0, TAU, true);
}

/** rounded rect path helper */
export function rr(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const rad = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.lineTo(x + w - rad, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rad);
  ctx.lineTo(x + w, y + h - rad);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rad, y + h);
  ctx.lineTo(x + rad, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rad);
  ctx.lineTo(x, y + rad);
  ctx.quadraticCurveTo(x, y, x + rad, y);
  ctx.closePath();
}
