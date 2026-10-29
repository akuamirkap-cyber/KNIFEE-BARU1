import { TAU, drawNineRadial, metal, rng, roundRect, withAlpha } from './core';

export { metal, roundRect };

/* =========================================================================
   Art toolkit – material tones, shaded shapes and small mechanical details
   ========================================================================= */

export type Tone = readonly [string, string, string, string];

export const T = {
  steel: ['#f1f5f9', '#aab4c2', '#566170', '#1c222b'],
  gun: ['#b6c0cd', '#657080', '#303843', '#0d1117'],
  black: ['#7b8594', '#3a424e', '#1a1f26', '#050608'],
  chrome: ['#ffffff', '#d4dde8', '#7a8a9e', '#2c3644'],
  brass: ['#fff3b8', '#e6b84e', '#9c6c1c', '#4a2c08'],
  gold: ['#fffbd0', '#fbd24a', '#c08a18', '#5c3a05'],
  red: ['#ffc2c2', '#ec4040', '#a31c1c', '#3a0707'],
  wood: ['#efb978', '#b4702f', '#76401a', '#3a1a08'],
  walnut: ['#c58c55', '#84501f', '#4d2911', '#210f06'],
  bakelite: ['#8a5a44', '#4e3126', '#27180f', '#0a0503'],
  polymer: ['#59616d', '#2e343d', '#171b21', '#06080b'],
  olive: ['#a6b07a', '#65703f', '#38401f', '#13180a'],
  navy: ['#6f86b3', '#34476b', '#18233d', '#070b16'],
  copper: ['#ffd2a0', '#e08a45', '#9a4e1c', '#431c07'],
  bronze: ['#f2d49a', '#b98a45', '#6d4a1d', '#2a1807'],
  cyan: ['#e0ffff', '#46dcf0', '#0f86a8', '#053248'],
  violet: ['#f3e0ff', '#b46cf5', '#6b2bb5', '#26094f'],
  white: ['#ffffff', '#e5eaf0', '#a3adbb', '#4d5766'],
  ceramic: ['#ffffff', '#f2ece0', '#c9bfa8', '#7d7360'],
  alien: ['#c9d3c0', '#7d8a77', '#3b4637', '#10150e'],
} as const satisfies Record<string, Tone>;

const artGradCache = new WeakMap<CanvasRenderingContext2D, Map<string, CanvasGradient>>();

function cachedVGrad(
  ctx: CanvasRenderingContext2D,
  key: string,
  y0: number,
  y1: number,
  build: (g: CanvasGradient) => void,
): CanvasGradient {
  let map = artGradCache.get(ctx);
  if (!map) {
    map = new Map();
    artGradCache.set(ctx, map);
  }
  let g = map.get(key);
  if (!g) {
    g = ctx.createLinearGradient(0, y0, 0, y1);
    build(g);
    if (map.size > 768) map.clear();
    map.set(key, g);
  }
  return g;
}

/** vertical "cylinder" gradient with a bounce light along the bottom edge */
export function cyl(ctx: CanvasRenderingContext2D, y0: number, y1: number, tone: Tone) {
  const key = `c|${y0.toFixed(2)}|${y1.toFixed(2)}|${tone[0]}|${tone[3]}`;
  return cachedVGrad(ctx, key, y0, y1, (g) => {
    g.addColorStop(0, tone[0]);
    g.addColorStop(0.2, tone[1]);
    g.addColorStop(0.55, tone[2]);
    g.addColorStop(0.86, tone[3]);
    g.addColorStop(0.96, tone[2]);
    g.addColorStop(1, tone[3]);
  });
}

export interface ShapeOpt {
  hi?: number; // specular strength
  line?: number | false; // outline alpha
  lw?: number;
  brush?: boolean;
}

export function shape(
  ctx: CanvasRenderingContext2D,
  path: () => void,
  y0: number,
  y1: number,
  tone: Tone,
  o: ShapeOpt = {}
) {
  path();
  ctx.fillStyle = cyl(ctx, y0, y1, tone);
  ctx.fill();
  ctx.save();
  path();
  ctx.clip();
  const h = Math.max(1, y1 - y0);
  const hi = o.hi ?? 0.34;
  if (hi > 0) {
    const hiEnd = y0 + h * 0.4;
    ctx.fillStyle = cachedVGrad(
      ctx,
      `h|${y0.toFixed(2)}|${hiEnd.toFixed(2)}|${hi}`,
      y0,
      hiEnd,
      (g) => {
        g.addColorStop(0, `rgba(255,255,255,${hi})`);
        g.addColorStop(1, 'rgba(255,255,255,0)');
      },
    );
    ctx.fillRect(-2000, y0, 4000, h * 0.42);
  }
  const shStart = y1 - h * 0.28;
  ctx.fillStyle = cachedVGrad(
    ctx,
    `s|${shStart.toFixed(2)}|${y1.toFixed(2)}`,
    shStart,
    y1,
    (g2) => {
      g2.addColorStop(0, 'rgba(0,0,0,0)');
      g2.addColorStop(1, 'rgba(0,0,0,0.38)');
    },
  );
  ctx.fillRect(-2000, y1 - h * 0.3, 4000, h * 0.3);
  if (o.brush) {
    ctx.strokeStyle = 'rgba(255,255,255,0.075)';
    ctx.lineWidth = 0.6;
    for (let y = y0 + 1.4; y < y1; y += 2.1) {
      ctx.beginPath();
      ctx.moveTo(-2000, y);
      ctx.lineTo(4000, y);
      ctx.stroke();
    }
  }
  ctx.restore();
  if (o.line !== false) {
    path();
    ctx.strokeStyle = `rgba(0,0,0,${o.line ?? 0.7})`;
    ctx.lineWidth = o.lw ?? 1.2;
    ctx.lineJoin = 'round';
    ctx.stroke();
  }
}

export function rect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  tone: Tone,
  o?: ShapeOpt
) {
  shape(ctx, () => roundRect(ctx, x, y, w, h, r), y, y + h, tone, o);
}

export function poly(ctx: CanvasRenderingContext2D, pts: number[][], close = true) {
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  if (close) ctx.closePath();
}

export function polyShape(ctx: CanvasRenderingContext2D, pts: number[][], tone: Tone, o?: ShapeOpt) {
  const ys = pts.map((p) => p[1]);
  shape(ctx, () => poly(ctx, pts), Math.min(...ys), Math.max(...ys), tone, o);
}

export function woodShape(
  ctx: CanvasRenderingContext2D,
  path: () => void,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  tone: Tone = T.wood,
  seed = 1
) {
  shape(ctx, path, y0, y1, tone, { hi: 0.28, line: false });
  ctx.save();
  path();
  ctx.clip();
  const r = rng(Math.floor(seed * 977));
  ctx.lineCap = 'round';
  const n = Math.max(6, Math.round((y1 - y0) / 3));
  for (let i = 0; i < n; i++) {
    const yy = y0 + ((i + 0.5) / n) * (y1 - y0) + (r() - 0.5) * 3;
    ctx.beginPath();
    ctx.moveTo(x0, yy);
    ctx.bezierCurveTo(
      x0 + (x1 - x0) * 0.3,
      yy + (r() - 0.5) * 6,
      x0 + (x1 - x0) * 0.62,
      yy + (r() - 0.5) * 6,
      x1,
      yy + (r() - 0.5) * 4
    );
    ctx.strokeStyle = i % 3 === 0 ? 'rgba(255,220,170,0.2)' : `rgba(40,16,4,${0.12 + r() * 0.2})`;
    ctx.lineWidth = 0.6 + r() * 1.2;
    ctx.stroke();
  }
  ctx.restore();
  path();
  ctx.strokeStyle = 'rgba(0,0,0,0.65)';
  ctx.lineWidth = 1.2;
  ctx.lineJoin = 'round';
  ctx.stroke();
}

/* ------------------------------ small details ------------------------------ */

export function outline(ctx: CanvasRenderingContext2D, a = 0.5, w = 1) {
  ctx.strokeStyle = `rgba(0,0,0,${a})`;
  ctx.lineWidth = w;
  ctx.stroke();
}

export function emissive(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, a = 1) {
  if (r <= 0 || a <= 0) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  drawNineRadial(ctx, x, y, r, '#ffffff', color, a, 0.3, 0.95, 0.8);
  ctx.restore();
}

export function glowRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  color: string,
  a = 1
) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, withAlpha('#ffffff', 0.9 * a));
  g.addColorStop(0.5, withAlpha(color, 0.85 * a));
  g.addColorStop(1, withAlpha(color, 0.35 * a));
  ctx.fillStyle = g;
  roundRect(ctx, x, y, w, h, r);
  ctx.fill();
  ctx.fillStyle = withAlpha(color, 0.18 * a);
  roundRect(ctx, x - 3, y - 3, w + 6, h + 6, r + 3);
  ctx.fill();
  ctx.restore();
}

export function screw(ctx: CanvasRenderingContext2D, x: number, y: number, r = 2.2, ang = 0.6) {
  const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, 0, x, y, r);
  g.addColorStop(0, '#e5e9ef');
  g.addColorStop(0.6, '#7b8696');
  g.addColorStop(1, '#2a313b');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.7)';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(x - Math.cos(ang) * r * 0.8, y - Math.sin(ang) * r * 0.8);
  ctx.lineTo(x + Math.cos(ang) * r * 0.8, y + Math.sin(ang) * r * 0.8);
  ctx.stroke();
}

export function vents(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  n: number,
  color = '#05070a',
  vertical = true
) {
  ctx.fillStyle = color;
  for (let i = 0; i < n; i++) {
    if (vertical) {
      const sw = w / (n * 2 - 1);
      roundRect(ctx, x + i * sw * 2, y, sw, h, sw / 2);
    } else {
      const sh = h / (n * 2 - 1);
      roundRect(ctx, x, y + i * sh * 2, w, sh, sh / 2);
    }
    ctx.fill();
  }
}

export function ribs(
  ctx: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  n: number,
  a = 0.45,
  lw = 1.1
) {
  ctx.strokeStyle = `rgba(0,0,0,${a})`;
  ctx.lineWidth = lw;
  for (let i = 1; i <= n; i++) {
    const t = i / (n + 1);
    ctx.beginPath();
    ctx.moveTo(x0 + (x1 - x0) * t, y0);
    ctx.lineTo(x0 + (x1 - x0) * t, y1);
    ctx.stroke();
    ctx.strokeStyle = `rgba(255,255,255,${a * 0.22})`;
    ctx.beginPath();
    ctx.moveTo(x0 + (x1 - x0) * t + lw, y0);
    ctx.lineTo(x0 + (x1 - x0) * t + lw, y1);
    ctx.stroke();
    ctx.strokeStyle = `rgba(0,0,0,${a})`;
  }
}

export function checker(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, step = 4, a = 0.25) {
  ctx.lineWidth = 0.7;
  for (let k = -(y1 - y0); k < x1 - x0 + (y1 - y0); k += step) {
    ctx.strokeStyle = `rgba(0,0,0,${a})`;
    ctx.beginPath();
    ctx.moveTo(x0 + k, y0);
    ctx.lineTo(x0 + k + (y1 - y0), y1);
    ctx.stroke();
    ctx.strokeStyle = `rgba(255,255,255,${a * 0.35})`;
    ctx.beginPath();
    ctx.moveTo(x0 + k + (y1 - y0), y0);
    ctx.lineTo(x0 + k, y1);
    ctx.stroke();
  }
}

export function bez(
  p0: number[],
  p1: number[],
  p2: number[],
  p3: number[],
  u: number
): [number, number] {
  const v = 1 - u;
  const a = v * v * v,
    b = 3 * v * v * u,
    c = 3 * v * u * u,
    d = u * u * u;
  return [a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0], a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1]];
}

/** ribbon polygon around a polyline with variable width */
export function ribbon(
  ctx: CanvasRenderingContext2D,
  pts: number[][],
  wFn: (u: number) => number,
  offset = 0
) {
  const L: number[][] = [],
    R: number[][] = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[Math.max(0, i - 1)],
      b = pts[Math.min(pts.length - 1, i + 1)];
    let dx = b[0] - a[0],
      dy = b[1] - a[1];
    const l = Math.hypot(dx, dy) || 1;
    dx /= l;
    dy /= l;
    const w = wFn(i / (pts.length - 1));
    const nx = -dy,
      ny = dx;
    const cx = pts[i][0] + nx * offset * w,
      cy = pts[i][1] + ny * offset * w;
    L.push([cx + nx * w, cy + ny * w]);
    R.push([cx - nx * w, cy - ny * w]);
  }
  poly(ctx, [...L, ...R.reverse()]);
}

export const spec = (ctx: CanvasRenderingContext2D, x0: number, y: number, x1: number, a = 0.5, lw = 1.2) => {
  let map = artGradCache.get(ctx);
  if (!map) {
    map = new Map();
    artGradCache.set(ctx, map);
  }
  const key = `sp|${x0.toFixed(2)}|${x1.toFixed(2)}|${a}`;
  let g = map.get(key);
  if (!g) {
    g = ctx.createLinearGradient(x0, 0, x1, 0);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(0.2, `rgba(255,255,255,${a})`);
    g.addColorStop(0.8, `rgba(255,255,255,${a})`);
    g.addColorStop(1, 'rgba(255,255,255,0)');
    if (map.size > 768) map.clear();
    map.set(key, g);
  }
  ctx.strokeStyle = g;
  ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.moveTo(x0, y);
  ctx.lineTo(x1, y);
  ctx.stroke();
};
