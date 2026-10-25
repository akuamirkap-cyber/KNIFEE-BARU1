import { type Ctx, TAU, dotSprite, drawSprite, glowSprite, lerp, makeBolt, polyPath, rand, smokeSprite, starSprite } from './core';

// particle kinds
export const K = {
  SPARK: 0,
  GLOW: 1,
  SMOKE: 2,
  CHIP: 3,
  STAR: 4,
  DROP: 5,
  EMBER: 6,
  CUSTOM: 7,
  FLAKE: 8,
  RING: 9,
  TEXT: 10,
  FIRE: 11,
} as const;

export interface Particle {
  k: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  size2: number;
  rot: number;
  vrot: number;
  g: number;
  drag: number;
  color: string; // "r,g,b"
  alpha: number;
  add: boolean;
  back: boolean;
  len: number;
  variant: number;
  poly: number[] | null;
  target: { x: number; y: number } | null;
  pull: number;
  draw: ((ctx: Ctx, p: Particle) => void) | null;
  seed: number;
  text: string;
  data: unknown;
  die: ((p: Particle) => void) | null;
}

export function makeParticle(o: Partial<Particle>): Particle {
  const life = o.life ?? 1;
  const size = o.size ?? 4;
  return {
    k: K.GLOW,
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    rot: 0,
    vrot: 0,
    g: 0,
    drag: 0,
    color: '255,255,255',
    alpha: 1,
    add: false,
    back: false,
    len: 0.03,
    variant: Math.floor(Math.random() * 4),
    poly: null,
    target: null,
    pull: 0,
    draw: null,
    seed: Math.random() * 100,
    text: '',
    data: null,
    die: null,
    ...o,
    life,
    max: o.max ?? life,
    size,
    size2: o.size2 ?? size,
  };
}

export class Particles {
  list: Particle[] = [];

  add(o: Partial<Particle>) {
    const p = makeParticle(o);
    this.list.push(p);
    return p;
  }

  clear() {
    this.list.length = 0;
  }

  update(dt: number) {
    const L = this.list;
    let j = 0;
    for (let i = 0; i < L.length; i++) {
      const p = L[i];
      p.life -= dt;
      if (p.life <= 0) {
        if (p.die) p.die(p);
        continue;
      }
      if (p.target) {
        const dx = p.target.x - p.x;
        const dy = p.target.y - p.y;
        const d = Math.hypot(dx, dy) || 0.001;
        if (d < 5) continue; // swallowed
        const acc = p.pull / (d * 0.012 + 0.3);
        p.vx += ((dx / d) * acc + (-dy / d) * acc * 0.5) * dt;
        p.vy += ((dy / d) * acc + (dx / d) * acc * 0.5) * dt;
      }
      if (p.drag) {
        const f = Math.exp(-p.drag * dt);
        p.vx *= f;
        p.vy *= f;
      }
      p.vy += p.g * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vrot * dt;
      L[j++] = p;
    }
    L.length = j;
  }

  draw(ctx: Ctx, back: boolean) {
    const L = this.list;
    for (let i = 0; i < L.length; i++) {
      const p = L[i];
      if (p.back === back && !p.add) drawParticle(ctx, p);
    }
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < L.length; i++) {
      const p = L[i];
      if (p.back === back && p.add) drawParticle(ctx, p);
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
  }
}

const FIRE_PAL = ['255,255,238', '255,238,160', '255,208,80', '255,158,34', '244,104,18', '196,60,10', '120,32,8', '64,16,6'];

function drawParticle(ctx: Ctx, p: Particle) {
  const t = p.life / p.max; // 1 → 0
  const age = 1 - t;
  switch (p.k) {
    case K.SPARK: {
      const a = p.alpha * Math.min(1, t * 1.8);
      ctx.strokeStyle = `rgba(${p.color},${a})`;
      ctx.lineWidth = p.size * (0.35 + 0.65 * t);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x - p.vx * p.len, p.y - p.vy * p.len);
      ctx.stroke();
      break;
    }
    case K.GLOW:
      drawSprite(ctx, glowSprite(p.color), p.x, p.y, lerp(p.size, p.size2, age), p.alpha * t);
      break;
    case K.SMOKE: {
      const s = lerp(p.size, p.size2, 1 - Math.pow(t, 1.8));
      const fade = Math.min(1, age * 7) * Math.pow(t, 0.8);
      drawSprite(ctx, smokeSprite(p.color, p.variant), p.x, p.y, s, p.alpha * fade, p.rot);
      break;
    }
    case K.CHIP: {
      if (!p.poly) break;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.globalAlpha = p.alpha * Math.min(1, t * 3);
      ctx.fillStyle = `rgb(${p.color})`;
      polyPath(ctx, p.poly);
      ctx.fill();
      ctx.strokeStyle = (p.data as string | null) || 'rgba(255,236,200,0.4)';
      ctx.lineWidth = 0.6;
      ctx.stroke();
      ctx.restore();
      ctx.globalAlpha = 1;
      break;
    }
    case K.STAR: {
      const tw = 0.55 + 0.45 * Math.sin(p.seed + age * 26);
      drawSprite(ctx, starSprite(p.color), p.x, p.y, p.size * tw * Math.min(1, t * 2.5), p.alpha * Math.min(1, t * 2), p.rot);
      break;
    }
    case K.DROP: {
      const sp = Math.hypot(p.vx, p.vy);
      const st = 1 + Math.min(sp / 260, 2.2);
      const ang = Math.atan2(p.vy, p.vx);
      const a = p.alpha * Math.min(1, t * 3);
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(ang);
      ctx.fillStyle = `rgba(${p.color},${a * 0.72})`;
      ctx.beginPath();
      ctx.ellipse(0, 0, p.size * st, p.size, 0, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = `rgba(${(p.data as string | null) || '20,70,140'},${a * 0.35})`;
      ctx.lineWidth = 0.6;
      ctx.stroke();
      ctx.fillStyle = `rgba(255,255,255,${a * 0.9})`;
      ctx.beginPath();
      ctx.arc(p.size * st * 0.3, -p.size * 0.35, p.size * 0.36, 0, TAU);
      ctx.fill();
      ctx.restore();
      break;
    }
    case K.EMBER: {
      const fl = 0.6 + 0.4 * Math.sin(p.seed + age * 38);
      drawSprite(ctx, dotSprite(p.color), p.x, p.y, p.size * (0.6 + 0.4 * t) * 2.6, p.alpha * t * fl);
      break;
    }
    case K.FLAKE: {
      const flip = Math.cos(p.seed + age * 16);
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.scale(1, Math.abs(flip) * 0.9 + 0.1);
      ctx.globalAlpha = p.alpha * Math.min(1, t * 3);
      ctx.fillStyle = flip > 0 ? '#ffe9a0' : '#b97a1c';
      ctx.beginPath();
      ctx.moveTo(-p.size, -p.size * 0.5);
      ctx.lineTo(p.size * 0.7, -p.size * 0.8);
      ctx.lineTo(p.size, p.size * 0.5);
      ctx.lineTo(-p.size * 0.6, p.size * 0.8);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      ctx.globalAlpha = 1;
      break;
    }
    case K.RING: {
      const e = 1 - Math.pow(t, 3);
      const r = lerp(p.size, p.size2, e);
      ctx.strokeStyle = `rgba(${p.color},${p.alpha * t})`;
      ctx.lineWidth = p.len * t + 0.4;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, TAU);
      ctx.stroke();
      break;
    }
    case K.TEXT: {
      ctx.globalAlpha = Math.min(1, t * 2.5);
      ctx.font = `${p.size}px "Lilita One", system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(30,10,40,0.85)';
      ctx.strokeText(p.text, p.x, p.y);
      ctx.fillStyle = `rgb(${p.color})`;
      ctx.fillText(p.text, p.x, p.y);
      ctx.globalAlpha = 1;
      break;
    }
    case K.FIRE: {
      const idx = Math.min(FIRE_PAL.length - 1, Math.floor(age * FIRE_PAL.length * 0.98));
      const sz = lerp(p.size, p.size2, Math.min(1, age * 1.6));
      const fa = p.alpha * Math.min(1, age * 12) * Math.min(1, t / 0.12);
      drawSprite(ctx, glowSprite(FIRE_PAL[idx]), p.x, p.y, sz, fa);
      if (age < 0.4) drawSprite(ctx, glowSprite('255,250,225'), p.x, p.y, sz * 0.45, fa * (1 - age / 0.4));
      break;
    }
    case K.CUSTOM:
      if (p.draw) p.draw(ctx, p);
      break;
  }
}

// ───────────────────────── FX objects ─────────────────────────
export interface FX {
  done: boolean;
  update(dt: number): void;
  draw(ctx: Ctx): void;
}

function strokePoly(ctx: Ctx, pts: number[], style: string, width: number) {
  ctx.strokeStyle = style;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
  ctx.stroke();
}

export class Lightning implements FX {
  done = false;
  age = 0;
  pts: number[][] = [];
  private regenT = 0;
  constructor(
    public x1: number,
    public y1: number,
    public x2: number,
    public y2: number,
    public life = 0.3,
    public color = '190,120,255',
    public width = 2,
    public branches = 2,
    public regen = 0.045,
  ) {
    this.gen();
  }
  gen() {
    const main = makeBolt(this.x1, this.y1, this.x2, this.y2, 0.3, 5);
    this.pts = [main];
    const n = main.length / 2;
    for (let b = 0; b < this.branches; b++) {
      const idx = 2 * Math.floor(rand(0.2, 0.75) * n);
      const bx = main[idx];
      const by = main[idx + 1];
      const ang = Math.atan2(this.y2 - this.y1, this.x2 - this.x1) + rand(-1, 1);
      const len = Math.hypot(this.x2 - this.x1, this.y2 - this.y1) * rand(0.2, 0.45);
      this.pts.push(makeBolt(bx, by, bx + Math.cos(ang) * len, by + Math.sin(ang) * len, 0.32, 4));
    }
  }
  update(dt: number) {
    this.age += dt;
    this.regenT += dt;
    if (this.regenT > this.regen) {
      this.regenT = 0;
      this.gen();
    }
    if (this.age >= this.life) this.done = true;
  }
  draw(ctx: Ctx) {
    const t = 1 - this.age / this.life;
    const fl = 0.6 + Math.random() * 0.4;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    this.pts.forEach((p, i) => {
      const m = i === 0 ? 1 : 0.55;
      strokePoly(ctx, p, `rgba(${this.color},${0.16 * t * fl})`, this.width * 6 * m);
      strokePoly(ctx, p, `rgba(${this.color},${0.55 * t * fl})`, this.width * 2.2 * m);
      strokePoly(ctx, p, `rgba(255,255,255,${0.95 * t * fl})`, this.width * 0.7 * m);
    });
    ctx.restore();
  }
}

export function flame(ctx: Ctx, ang: number, len: number, wid: number, c0: string, c1: string, c2: string, alpha = 1) {
  if (len < 1 || wid < 0.3) return;
  ctx.save();
  ctx.rotate(ang);
  const g = ctx.createLinearGradient(0, 0, len, 0);
  g.addColorStop(0, `rgba(${c0},${alpha})`);
  g.addColorStop(0.35, `rgba(${c1},${0.9 * alpha})`);
  g.addColorStop(1, `rgba(${c2},0)`);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(0, -wid * 0.45);
  ctx.quadraticCurveTo(len * 0.32, -wid, len, 0);
  ctx.quadraticCurveTo(len * 0.32, wid, 0, wid * 0.45);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

export function spike(ctx: Ctx, ang: number, len: number, wid: number, col: string, alpha = 1) {
  ctx.save();
  ctx.rotate(ang);
  const g = ctx.createLinearGradient(0, 0, len, 0);
  g.addColorStop(0, `rgba(255,255,255,${alpha})`);
  g.addColorStop(0.3, `rgba(${col},${0.85 * alpha})`);
  g.addColorStop(1, `rgba(${col},0)`);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(0, -wid / 2);
  ctx.lineTo(len, 0);
  ctx.lineTo(0, wid / 2);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

export class MuzzleFlash implements FX {
  done = false;
  age = 0;
  rot = rand(0, TAU);
  seedA = Math.random();
  constructor(public x: number, public y: number, public kind: 'gold' | 'shotgun', public life = 0.09) {}
  update(dt: number) {
    this.age += dt;
    if (this.age >= this.life) this.done = true;
  }
  draw(ctx: Ctx) {
    const t = this.age / this.life;
    const s = t < 0.3 ? 1 : 1 - (t - 0.3) / 0.7;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.translate(this.x, this.y);
    if (this.kind === 'gold') {
      drawSprite(ctx, glowSprite('255,180,50'), 0, -14, 190 * s, 0.85 * s);
      drawSprite(ctx, glowSprite('255,245,200'), 0, -8, 70 * s, s);
      for (let i = 0; i < 10; i++) {
        const a = this.rot + (i * TAU) / 10;
        const up = Math.max(0, -Math.sin(a));
        const len = (16 + up * 52 + (i % 2) * 8) * (0.6 + 0.4 * s);
        spike(ctx, a, len, (i % 2 ? 3 : 5) * s, '255,226,140', s);
      }
      flame(ctx, -Math.PI / 2, 64 * (0.7 + 0.3 * s), 13 * s, '255,255,240', '255,214,90', '255,140,20', s);
      flame(ctx, -Math.PI / 2 - 0.35, 30 * s, 7 * s, '255,255,230', '255,200,80', '255,120,20', s);
      flame(ctx, -Math.PI / 2 + 0.35, 30 * s, 7 * s, '255,255,230', '255,200,80', '255,120,20', s);
      ctx.fillStyle = `rgba(255,255,255,${s})`;
      ctx.beginPath();
      ctx.arc(0, -3, 7 * s, 0, TAU);
      ctx.fill();
    } else {
      drawSprite(ctx, glowSprite('255,130,40'), 0, -26, 300 * s, 0.85 * s);
      drawSprite(ctx, glowSprite('255,230,170'), 0, -14, 110 * s, s);
      for (let i = 0; i < 7; i++) {
        const off = (i - 3) * 0.17 + (this.seedA - 0.5) * 0.12;
        const a = -Math.PI / 2 + off;
        const len = (i === 3 ? 125 : 95 - Math.abs(i - 3) * 14 + rand(-8, 8)) * (0.7 + 0.3 * s);
        flame(ctx, a, len, (i === 3 ? 22 : 13) * s, '255,255,235', '255,196,70', '255,80,10', s);
      }
      flame(ctx, Math.PI - 0.25, 30 * s, 9 * s, '255,250,220', '255,180,60', '255,70,0', s);
      flame(ctx, 0.25, 30 * s, 9 * s, '255,250,220', '255,180,60', '255,70,0', s);
      ctx.fillStyle = `rgba(255,255,240,${s})`;
      ctx.beginPath();
      ctx.arc(0, -4, 10 * s, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }
}

export class Light implements FX {
  done = false;
  age = 0;
  constructor(public x: number, public y: number, public r: number, public color: string, public intensity: number, public life: number) {}
  update(dt: number) {
    this.age += dt;
    if (this.age >= this.life) this.done = true;
  }
  draw(ctx: Ctx) {
    const t = 1 - this.age / this.life;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    drawSprite(ctx, glowSprite(this.color), this.x, this.y, this.r * 2, this.intensity * t * t);
    ctx.restore();
  }
}

export class Rays implements FX {
  done = false;
  age = 0;
  rays: { a: number; len: number; w: number }[] = [];
  constructor(public x: number, public y: number, public color: string, public life = 0.45, n = 12, base = Math.PI / 2, spread = Math.PI, public scale = 1) {
    for (let i = 0; i < n; i++) this.rays.push({ a: base + rand(-spread, spread), len: rand(50, 120) * scale, w: rand(3, 9) * scale });
  }
  update(dt: number) {
    this.age += dt;
    if (this.age >= this.life) this.done = true;
  }
  draw(ctx: Ctx) {
    const t = this.age / this.life;
    const grow = 1 - Math.pow(1 - Math.min(1, t * 2.2), 3);
    const a = 1 - t;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.translate(this.x, this.y);
    for (const r of this.rays) {
      ctx.save();
      ctx.rotate(r.a + t * 0.25);
      const len = r.len * grow;
      const g = ctx.createLinearGradient(0, 0, len, 0);
      g.addColorStop(0, `rgba(255,255,240,${0.9 * a})`);
      g.addColorStop(0.4, `rgba(${this.color},${0.5 * a})`);
      g.addColorStop(1, `rgba(${this.color},0)`);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(0, -r.w * 0.2);
      ctx.lineTo(len, -r.w * 0.5);
      ctx.lineTo(len, r.w * 0.5);
      ctx.lineTo(0, r.w * 0.2);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }
}

/** fading tapered streak (bullet tracer after impact) */
export class Streak implements FX {
  done = false;
  age = 0;
  constructor(public x: number, public y1: number, public y2: number, public w: number, public color: string, public life: number) {}
  update(dt: number) {
    this.age += dt;
    if (this.age >= this.life) this.done = true;
  }
  draw(ctx: Ctx) {
    const t = 1 - this.age / this.life;
    const y2 = lerp(this.y1, this.y2, t);
    if (Math.abs(y2 - this.y1) < 1) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createLinearGradient(0, this.y1, 0, y2);
    g.addColorStop(0, `rgba(255,255,230,${0.95 * t})`);
    g.addColorStop(0.25, `rgba(${this.color},${0.6 * t})`);
    g.addColorStop(1, `rgba(${this.color},0)`);
    ctx.fillStyle = g;
    const w = this.w * t;
    ctx.beginPath();
    ctx.moveTo(this.x - w, this.y1);
    ctx.lineTo(this.x + w, this.y1);
    ctx.lineTo(this.x, y2);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

/** water splash sheet (crown) */
export class SplashSheet implements FX {
  done = false;
  age = 0;
  constructor(public x: number, public y: number, public ang: number, public size = 46, public life = 0.22) {}
  update(dt: number) {
    this.age += dt;
    if (this.age >= this.life) this.done = true;
  }
  draw(ctx: Ctx) {
    const t = this.age / this.life;
    const r = this.size * (1 - Math.pow(1 - t, 2.5));
    const a = 1 - t;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.ang);
    const g = ctx.createRadialGradient(0, 0, r * 0.2, 0, 0, r);
    g.addColorStop(0, `rgba(210,240,255,${0.05 * a})`);
    g.addColorStop(0.7, `rgba(170,220,255,${0.35 * a})`);
    g.addColorStop(1, `rgba(255,255,255,${0.6 * a})`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    const spread = 1.25;
    const n = 14;
    for (let i = 0; i <= n; i++) {
      const aa = -spread + (i / n) * spread * 2;
      const rr = r * (0.75 + 0.25 * Math.sin(i * 2.3 + 1.7));
      ctx.lineTo(Math.cos(aa) * rr, Math.sin(aa) * rr);
    }
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = `rgba(255,255,255,${0.55 * a})`;
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.restore();
  }
}

/** glowing polylines, used for hot cracks on the wheel (wheel-local space) */
export class GlowLines implements FX {
  done = false;
  age = 0;
  constructor(public lines: number[][], public color: string, public width: number, public life: number) {}
  update(dt: number) {
    this.age += dt;
    if (this.age >= this.life) this.done = true;
  }
  draw(ctx: Ctx) {
    const t = 1 - this.age / this.life;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const l of this.lines) {
      strokePoly(ctx, l, `rgba(${this.color},${0.25 * t})`, this.width * 4);
      strokePoly(ctx, l, `rgba(${this.color},${0.8 * t})`, this.width * 1.4);
      strokePoly(ctx, l, `rgba(255,255,230,${0.9 * t * t})`, this.width * 0.5);
    }
    ctx.restore();
  }
}

/** fading glow spot (wheel-local) */
export class GlowSpot implements FX {
  done = false;
  age = 0;
  constructor(public x: number, public y: number, public size: number, public color: string, public life: number, public intensity = 1) {}
  update(dt: number) {
    this.age += dt;
    if (this.age >= this.life) this.done = true;
  }
  draw(ctx: Ctx) {
    const t = 1 - this.age / this.life;
    const fl = 0.85 + 0.15 * Math.sin(this.age * 30 + this.x);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    drawSprite(ctx, glowSprite(this.color), this.x, this.y, this.size, this.intensity * t * fl);
    ctx.restore();
  }
}
