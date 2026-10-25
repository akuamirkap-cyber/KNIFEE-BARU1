// Core math helpers + high quality particle system for the 2D ballistics FX lab.

export const VW = 1280;
export const VH = 720;

export const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const rand = (a: number, b: number) => a + Math.random() * (b - a);
export const randInt = (a: number, b: number) => Math.floor(rand(a, b + 1));
export const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
export const TAU = Math.PI * 2;

export function angleDiff(a: number, b: number) {
  let d = (a - b) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return d;
}

/** Ray vs circle intersection. Returns distance along dir (or -1). */
export function rayCircle(
  ox: number,
  oy: number,
  dx: number,
  dy: number,
  cx: number,
  cy: number,
  r: number,
): number {
  const mx = ox - cx;
  const my = oy - cy;
  const b = mx * dx + my * dy;
  const c = mx * mx + my * my - r * r;
  if (c > 0 && b > 0) return -1;
  const disc = b * b - c;
  if (disc < 0) return -1;
  const t = -b - Math.sqrt(disc);
  return t < 0 ? -1 : t;
}

export type PKind =
  | 'flash'
  | 'spark'
  | 'smoke'
  | 'ember'
  | 'ring'
  | 'shard'
  | 'casing'
  | 'bolt'
  | 'text'
  | 'flame'
  | 'plasma'
  | 'slash'
  | 'glow'
  | 'debris'
  | 'streak'
  | 'mote'
  | 'acid'
  | 'bubble'
  | 'spike'
  | 'voidhole'
  | 'arcweb'
  | 'crystal'
  | 'tickring'
  | 'nano'
  | 'snowflake'
  | 'frost'
  | 'wavefront'
  | 'ghost';

export interface Particle {
  kind: PKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  size2: number;
  color: string;
  color2?: string;
  rot: number;
  vrot: number;
  grav: number;
  drag: number;
  add: boolean;
  seed: number;
  text?: string;
  data?: number;
}

/** additive heat tint helper: hot -> cool */
function heat(hex: string, t: number) {
  // t: 1 = fresh/hottest, 0 = dying/coolest
  if (t > 0.72) return '#ffffff';
  if (t > 0.45) return hex;
  return hexA(mix(hex, '#ff2a00', 0.55), 1);
}

export function mix(a: string, b: string, k: number) {
  const pa = parseHex(a);
  const pb = parseHex(b);
  const r = Math.round(lerp(pa[0], pb[0], k));
  const g = Math.round(lerp(pa[1], pb[1], k));
  const bl = Math.round(lerp(pa[2], pb[2], k));
  return `rgb(${r},${g},${bl})`;
}

export function parseHex(hex: string): [number, number, number] {
  if (hex.startsWith('rgb')) {
    const m = hex.match(/[\d.]+/g) ?? ['255', '255', '255'];
    return [+m[0], +m[1], +m[2]];
  }
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export class Particles {
  list: Particle[] = [];
  max = 2200;

  spawn(p: Partial<Particle> & { kind: PKind; x: number; y: number }) {
    if (this.list.length > this.max) this.list.splice(0, 80);
    this.list.push({
      vx: 0,
      vy: 0,
      life: 0.5,
      max: 0.5,
      size: 6,
      size2: 6,
      color: '#fff',
      rot: 0,
      vrot: 0,
      grav: 0,
      drag: 1,
      add: true,
      seed: Math.random() * 1000,
      ...p,
    } as Particle);
  }

  clear() {
    this.list.length = 0;
  }

  update(dt: number) {
    const l = this.list;
    for (let i = l.length - 1; i >= 0; i--) {
      const p = l[i];
      p.life -= dt;
      if (p.life <= 0) {
        l.splice(i, 1);
        continue;
      }
      // buoyant smoke rises, sparks fall
      p.vy += p.grav * dt;
      const d = Math.pow(p.drag, dt * 60);
      p.vx *= d;
      p.vy *= d;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vrot * dt;
      if (p.kind === 'smoke' || p.kind === 'mote') {
        // curl drift
        p.vx += Math.sin(p.seed + p.y * 0.02 + this.t * 1.6) * 26 * dt;
      }
      const floor = VH - 72;
      if (p.kind === 'casing' || p.kind === 'debris' || p.kind === 'shard' || p.kind === 'spark') {
        if (p.y > floor) {
          p.y = floor;
          if (Math.abs(p.vy) > 40) {
            p.vy *= -0.36;
            p.vx *= 0.74;
            p.vrot *= 0.55;
            this.onBounce?.(p);
          } else {
            p.vy = 0;
            p.vx *= 0.86;
            p.vrot *= 0.8;
            p.grav = 0;
          }
        }
      }
    }
  }

  t = 0;
  /** called when a hot particle ricochets off the floor */
  onBounce: ((p: Particle) => void) | null = null;

  draw(ctx: CanvasRenderingContext2D) {
    ctx.globalCompositeOperation = 'lighter';
    for (const p of this.list) if (p.add) this.drawOne(ctx, p);
    ctx.globalCompositeOperation = 'source-over';
    for (const p of this.list) if (!p.add) this.drawOne(ctx, p);
    ctx.globalCompositeOperation = 'source-over';
  }

  private drawOne(ctx: CanvasRenderingContext2D, p: Particle) {
    const t = p.life / p.max; // 1 -> 0
    const e = t * t; // eased
    ctx.save();
    switch (p.kind) {
      /* ---------------------------------------- muzzle flash: hot core */
      case 'flash': {
        const r = p.size * (0.55 + (1 - t) * 0.75);
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, Math.max(0.5, r));
        g.addColorStop(0, `rgba(255,255,255,${0.98 * e})`);
        g.addColorStop(0.18, `rgba(255,246,214,${0.9 * t})`);
        g.addColorStop(0.45, hexA(p.color, 0.7 * t));
        g.addColorStop(1, hexA(p.color, 0));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, TAU);
        ctx.fill();
        // horizontal anamorphic streak
        if (r > 34) {
          const sw = r * 3.4;
          const sg = ctx.createLinearGradient(p.x - sw, p.y, p.x + sw, p.y);
          sg.addColorStop(0, hexA(p.color, 0));
          sg.addColorStop(0.5, `rgba(255,255,255,${0.35 * t})`);
          sg.addColorStop(1, hexA(p.color, 0));
          ctx.fillStyle = sg;
          ctx.fillRect(p.x - sw, p.y - r * 0.06, sw * 2, r * 0.12);
        }
        break;
      }
      case 'plasma':
      case 'glow': {
        const r = p.size * (0.45 + (1 - t) * 0.85);
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, Math.max(0.5, r));
        g.addColorStop(0, `rgba(255,255,255,${0.95 * e})`);
        g.addColorStop(0.22, hexA(p.color, 0.8 * t));
        g.addColorStop(0.6, hexA(p.color, 0.24 * t));
        g.addColorStop(1, hexA(p.color, 0));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, TAU);
        ctx.fill();
        break;
      }
      /* ------------------------------- motion blurred ballistic sparks */
      case 'spark': {
        const sp = Math.hypot(p.vx, p.vy);
        const len = clamp(sp * 0.03, 5, 60) * (0.45 + t * 0.75);
        const rad = Math.max(1.6, p.size2 * 3.2);
        ctx.translate(p.x, p.y);
        ctx.rotate(Math.atan2(p.vy, p.vx));
        // head glow
        const hg = ctx.createRadialGradient(0, 0, 0, 0, 0, rad);
        hg.addColorStop(0, `rgba(255,255,255,${0.95 * e})`);
        hg.addColorStop(0.35, hexA(heat(p.color, t), 0.65 * t));
        hg.addColorStop(1, hexA(p.color, 0));
        ctx.fillStyle = hg;
        ctx.beginPath();
        ctx.arc(0, 0, rad, 0, TAU);
        ctx.fill();
        // tapered streak
        const sg = ctx.createLinearGradient(-len, 0, 2, 0);
        sg.addColorStop(0, hexA(heat(p.color, t * 0.7), 0));
        sg.addColorStop(0.5, hexA(heat(p.color, t), 0.5 * t));
        sg.addColorStop(1, `rgba(255,255,255,${0.95 * e})`);
        ctx.fillStyle = sg;
        const w0 = Math.max(0.35, p.size2 * 0.42);
        const w1 = Math.max(0.55, p.size2 * t);
        ctx.beginPath();
        ctx.moveTo(-len, -w0);
        ctx.lineTo(-0.5, -w1);
        ctx.lineTo(-0.5, w1);
        ctx.lineTo(-len, w0);
        ctx.closePath();
        ctx.fill();
        break;
      }
      /* ------------------------------------------- thin light streaks */
      case 'streak': {
        const len = p.size;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        const g = ctx.createLinearGradient(0, 0, len, 0);
        g.addColorStop(0, hexA(p.color, 0));
        g.addColorStop(0.6, hexA(p.color, 0.5 * t));
        g.addColorStop(1, `rgba(255,255,255,${0.9 * e})`);
        ctx.strokeStyle = g;
        ctx.lineWidth = Math.max(0.5, p.size2 * t);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(len, 0);
        ctx.stroke();
        break;
      }
      /* ------------------------------------------------- muzzle spike */
      case 'spike': {
        const len = p.size * (0.3 + (1 - t) * 1.1);
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        const g = ctx.createLinearGradient(0, 0, len, 0);
        g.addColorStop(0, `rgba(255,255,255,${0.9 * e})`);
        g.addColorStop(0.35, hexA(p.color, 0.75 * t));
        g.addColorStop(1, hexA(p.color, 0));
        ctx.fillStyle = g;
        const w = Math.max(0.5, p.size2 * t);
        ctx.beginPath();
        ctx.moveTo(0, -w);
        ctx.lineTo(len, 0);
        ctx.lineTo(0, w);
        ctx.closePath();
        ctx.fill();
        break;
      }
      /* ------------------------------------------------------ embers */
      case 'ember': {
        const f = 0.55 + 0.45 * Math.sin(p.seed + p.life * 46);
        const c = heat(p.color, t);
        const rad = Math.max(0.8, p.size * t * 2.6);
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, rad);
        g.addColorStop(0, `rgba(255,255,255,${0.85 * e * f})`);
        g.addColorStop(0.35, hexA(c, 0.75 * t * f));
        g.addColorStop(1, hexA(c, 0));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(p.x, p.y, rad, 0, TAU);
        ctx.fill();
        break;
      }
      /* ------------------------------------------------------- flames */
      case 'flame': {
        const r = p.size * (0.3 + (1 - t) * 1.05);
        const g = ctx.createRadialGradient(p.x, p.y - r * 0.15, 0, p.x, p.y, Math.max(0.5, r));
        g.addColorStop(0, `rgba(255,255,244,${0.92 * e})`);
        g.addColorStop(0.22, `rgba(255,224,140,${0.85 * t})`);
        g.addColorStop(0.52, hexA(p.color, 0.62 * t));
        g.addColorStop(0.8, hexA(mix(p.color, '#8a1200', 0.5), 0.2 * t));
        g.addColorStop(1, 'rgba(80,10,0,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.ellipse(p.x, p.y - r * 0.1, r, r * 1.25, p.rot, 0, TAU);
        ctx.fill();
        break;
      }
      /* --------------------------------------------------- volumetric smoke */
      case 'smoke': {
        const grow = 1 + (1 - t) * (p.data ?? 2);
        const r = p.size * grow;
        const a = 0.3 * Math.sin(Math.PI * clamp(t * 1.15, 0, 1));
        ctx.globalAlpha = 1;
        const g = ctx.createRadialGradient(p.x - r * 0.18, p.y - r * 0.22, 0, p.x, p.y, r);
        g.addColorStop(0, hexA(p.color2 ?? '#e8eef5', a * 0.5));
        g.addColorStop(0.42, hexA(p.color, a));
        g.addColorStop(1, hexA(p.color, 0));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, TAU);
        ctx.fill();
        // darker core for density
        const g2 = ctx.createRadialGradient(p.x + r * 0.1, p.y + r * 0.14, 0, p.x, p.y, r * 0.62);
        g2.addColorStop(0, hexA(mix(p.color, '#000000', 0.55), a * 0.7));
        g2.addColorStop(1, hexA(p.color, 0));
        ctx.fillStyle = g2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r * 0.62, 0, TAU);
        ctx.fill();
        break;
      }
      /* --------------------------------------------------- dust motes */
      case 'mote': {
        const a = 0.3 * Math.sin(Math.PI * clamp(t, 0, 1));
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, Math.max(0.5, p.size));
        g.addColorStop(0, hexA(p.color, a));
        g.addColorStop(1, hexA(p.color, 0));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, TAU);
        ctx.fill();
        break;
      }
      case 'ring': {
        const r = p.size2 * (1 - e * 0.9) + p.size;
        ctx.strokeStyle = hexA(p.color, 0.9 * t);
        ctx.lineWidth = Math.max(0.4, (p.data ?? 4) * t);
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, TAU);
        ctx.stroke();
        ctx.strokeStyle = `rgba(255,255,255,${0.5 * t})`;
        ctx.lineWidth = Math.max(0.3, (p.data ?? 4) * t * 0.3);
        ctx.beginPath();
        ctx.arc(p.x, p.y, r * 1.005, 0, TAU);
        ctx.stroke();
        break;
      }
      case 'shard': {
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.globalAlpha = clamp(t * 1.7, 0, 1);
        const g = ctx.createLinearGradient(-p.size, -p.size2, p.size, p.size2);
        g.addColorStop(0, mix(p.color, '#ffffff', 0.55));
        g.addColorStop(0.5, p.color);
        g.addColorStop(1, mix(p.color, '#000000', 0.6));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(-p.size, -p.size2);
        ctx.lineTo(p.size, -p.size2 * 0.5);
        ctx.lineTo(p.size * 0.6, p.size2);
        ctx.lineTo(-p.size * 0.7, p.size2 * 0.8);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,.25)';
        ctx.lineWidth = 0.8;
        ctx.stroke();
        break;
      }
      case 'debris': {
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.globalAlpha = clamp(t * 2.1, 0, 1);
        const g = ctx.createLinearGradient(-p.size, 0, p.size, 0);
        g.addColorStop(0, mix(p.color, '#ffffff', 0.5));
        g.addColorStop(1, mix(p.color, '#000000', 0.55));
        ctx.fillStyle = g;
        ctx.fillRect(-p.size, -p.size * 0.5, p.size * 2, p.size);
        break;
      }
      case 'casing': {
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        const g = ctx.createLinearGradient(0, -3, 0, 3);
        g.addColorStop(0, '#fff3c4');
        g.addColorStop(0.28, '#e5c263');
        g.addColorStop(0.62, '#b3872a');
        g.addColorStop(1, '#6f4d0c');
        ctx.fillStyle = g;
        ctx.fillRect(-7, -2.6, 14, 5.2);
        // rim + primer
        ctx.fillStyle = '#f0d79a';
        ctx.fillRect(4.2, -3.1, 4.2, 6.2);
        ctx.fillStyle = 'rgba(255,255,255,.75)';
        ctx.fillRect(-7, -2.6, 14, 1);
        ctx.fillStyle = 'rgba(0,0,0,.45)';
        ctx.fillRect(-7, 1.4, 14, 1.2);
        break;
      }
      case 'bolt': {
        ctx.strokeStyle = hexA(p.color, 0.9 * t);
        ctx.lineWidth = p.size2 * t;
        ctx.lineCap = 'round';
        ctx.beginPath();
        let x = p.x;
        let y = p.y;
        ctx.moveTo(x, y);
        const segs = 5;
        for (let i = 0; i < segs; i++) {
          x += Math.cos(p.rot) * (p.size / segs) + rand(-6, 6);
          y += Math.sin(p.rot) * (p.size / segs) + rand(-6, 6);
          ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.strokeStyle = `rgba(255,255,255,${0.85 * e})`;
        ctx.lineWidth = Math.max(0.5, p.size2 * t * 0.35);
        ctx.stroke();
        break;
      }
      case 'slash': {
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        const a0 = -p.size2 * 0.5;
        const a1 = p.size2 * 0.5;
        const rad = p.data ?? 60;
        const g = ctx.createRadialGradient(0, 0, rad * 0.72, 0, 0, rad * 1.18);
        g.addColorStop(0, hexA(p.color, 0));
        g.addColorStop(0.55, hexA(p.color, 0.85 * t));
        g.addColorStop(0.8, `rgba(255,255,255,${0.9 * e})`);
        g.addColorStop(1, hexA(p.color, 0));
        ctx.strokeStyle = g;
        ctx.lineWidth = p.size * t * 1.25;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(0, 0, rad, a0, a1);
        ctx.stroke();
        break;
      }
      /* --------- gravitational singularity: black core, lensing rim ---- */
      case 'voidhole': {
        const r = p.size * (0.55 + (1 - t) * 0.7);
        // photon ring (bright, drawn first so the core sits on top)
        ctx.globalCompositeOperation = 'lighter';
        const rg = ctx.createRadialGradient(p.x, p.y, r * 0.7, p.x, p.y, r * 2.4);
        rg.addColorStop(0, hexA('#ffffff', 0.85 * t));
        rg.addColorStop(0.28, hexA(p.color, 0.7 * t));
        rg.addColorStop(0.6, hexA(p.color2 ?? p.color, 0.3 * t));
        rg.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = rg;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r * 2.4, 0, TAU);
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
        // the event horizon itself — truly black
        const eg = ctx.createRadialGradient(p.x, p.y, r * 0.2, p.x, p.y, r);
        eg.addColorStop(0, 'rgba(2,0,6,1)');
        eg.addColorStop(0.82, 'rgba(4,1,10,0.98)');
        eg.addColorStop(1, 'rgba(10,4,22,0.4)');
        ctx.fillStyle = eg;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, TAU);
        ctx.fill();
        // accretion disk, drawn as a squashed tilted ellipse over the core
        // (spins faster as it collapses)
        const age = (p.max - p.life) / Math.max(0.001, p.max);
        ctx.globalCompositeOperation = 'lighter';
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot + age * 9);
        const dg = ctx.createRadialGradient(0, 0, r * 0.9, 0, 0, r * 2.1);
        dg.addColorStop(0, `rgba(255,255,255,${0.6 * t})`);
        dg.addColorStop(0.3, hexA(p.color, 0.55 * t));
        dg.addColorStop(1, hexA(p.color2 ?? p.color, 0));
        ctx.fillStyle = dg;
        ctx.save();
        ctx.scale(1, 0.28);
        ctx.beginPath();
        ctx.arc(0, 0, r * 2.05, 0, TAU);
        ctx.arc(0, 0, r * 0.92, 0, TAU, true);
        ctx.fill();
        ctx.restore();
        ctx.restore();
        ctx.globalCompositeOperation = p.add ? 'lighter' : 'source-over';
        break;
      }
      /* ------------- crawling electric web: forks radiating outward ---- */
      case 'arcweb': {
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        const arms = 3 + Math.floor(p.data ?? 3);
        for (let i = 0; i < arms; i++) {
          const a = (i / arms) * TAU + p.seed;
          const L = p.size * (0.6 + Math.random() * 0.7);
          ctx.strokeStyle = hexA(p.color, 0.55 * t);
          ctx.lineWidth = Math.max(1, p.size2 * 3 * t);
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(0, 0);
          let cx = 0;
          let cy = 0;
          for (let k = 1; k <= 4; k++) {
            const f = k / 4;
            cx = Math.cos(a) * L * f + rand(-7, 7) * (1 - f * 0.4);
            cy = Math.sin(a) * L * f + rand(-7, 7) * (1 - f * 0.4);
            ctx.lineTo(cx, cy);
          }
          ctx.stroke();
          ctx.strokeStyle = `rgba(255,255,255,${0.9 * e})`;
          ctx.lineWidth = Math.max(0.6, p.size2 * t);
          ctx.stroke();
          // sub-fork
          if (Math.random() < 0.6) {
            const fa = a + rand(-0.7, 0.7);
            ctx.strokeStyle = hexA(p.color, 0.4 * t);
            ctx.lineWidth = Math.max(0.8, p.size2 * 2 * t);
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(cx + Math.cos(fa) * L * 0.4, cy + Math.sin(fa) * L * 0.4);
            ctx.stroke();
          }
        }
        break;
      }
      /* ------- faceted crystal shard: internal refraction + specular ---- */
      case 'crystal': {
        const L = p.size * 3.2;
        const W = p.size;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        // outer facet
        const g = ctx.createLinearGradient(0, -W, 0, W);
        g.addColorStop(0, hexA(p.color, 0.95 * t));
        g.addColorStop(0.34, `rgba(255,255,255,${0.95 * e})`);
        g.addColorStop(0.62, hexA(p.color2 ?? p.color, 0.8 * t));
        g.addColorStop(1, hexA(p.color, 0.25 * t));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(L, 0);
        ctx.lineTo(L * 0.2, -W);
        ctx.lineTo(-L, -W * 0.28);
        ctx.lineTo(-L * 0.72, 0);
        ctx.lineTo(-L, W * 0.28);
        ctx.lineTo(L * 0.2, W);
        ctx.closePath();
        ctx.fill();
        // internal refracted edge
        ctx.strokeStyle = `rgba(255,255,255,${0.7 * e})`;
        ctx.lineWidth = Math.max(0.5, W * 0.18);
        ctx.beginPath();
        ctx.moveTo(L * 0.85, 0);
        ctx.lineTo(-L * 0.6, 0);
        ctx.stroke();
        // glow bloom
        ctx.globalCompositeOperation = 'lighter';
        const bg = ctx.createRadialGradient(0, 0, 0, 0, 0, L * 0.9);
        bg.addColorStop(0, hexA(p.color2 ?? p.color, 0.4 * t));
        bg.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = bg;
        ctx.beginPath();
        ctx.arc(0, 0, L * 0.9, 0, TAU);
        ctx.fill();
        break;
      }
      /* ---- clock tick ring: expanding dashed ring with radial ticks --- */
      case 'tickring': {
        const r = p.size2 * (1 - e * 0.9) + p.size;
        const ticks = Math.max(4, Math.round(p.data ?? 12));
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot + (1 - t) * 1.4);
        ctx.strokeStyle = hexA(p.color, 0.85 * t);
        ctx.lineWidth = Math.max(0.6, 2.4 * t);
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, TAU);
        ctx.stroke();
        for (let i = 0; i < ticks; i++) {
          const a = (i / ticks) * TAU;
          const inner = r * (i % 2 === 0 ? 0.84 : 0.93);
          ctx.strokeStyle = hexA(i % 2 === 0 ? '#ffffff' : p.color2 ?? p.color, 0.8 * t);
          ctx.lineWidth = Math.max(0.5, (i % 2 === 0 ? 3 : 1.6) * t);
          ctx.beginPath();
          ctx.moveTo(Math.cos(a) * inner, Math.sin(a) * inner);
          ctx.lineTo(Math.cos(a) * r * 1.06, Math.sin(a) * r * 1.06);
          ctx.stroke();
        }
        ctx.restore();
        break;
      }
      /* --------- nanite bot: bright mote with a short chem trail ------- */
      case 'nano': {
        const sp = Math.hypot(p.vx, p.vy);
        const tl = clamp(sp * 0.045, 2, 20);
        ctx.translate(p.x, p.y);
        ctx.rotate(Math.atan2(p.vy, p.vx));
        // chem trail
        const tg = ctx.createLinearGradient(-tl, 0, 0, 0);
        tg.addColorStop(0, hexA(p.color, 0));
        tg.addColorStop(1, hexA(p.color, 0.75 * t));
        ctx.fillStyle = tg;
        ctx.beginPath();
        ctx.moveTo(-tl, -p.size * 0.4);
        ctx.lineTo(0, -p.size * 0.7);
        ctx.lineTo(0, p.size * 0.7);
        ctx.lineTo(-tl, p.size * 0.4);
        ctx.closePath();
        ctx.fill();
        // hot body
        const bg = ctx.createRadialGradient(0, 0, 0, 0, 0, p.size * 3.4);
        bg.addColorStop(0, `rgba(255,255,255,${0.95 * e})`);
        bg.addColorStop(0.3, hexA(p.color, 0.85 * t));
        bg.addColorStop(1, hexA(p.color, 0));
        ctx.fillStyle = bg;
        ctx.beginPath();
        ctx.arc(0, 0, p.size * 3.4, 0, TAU);
        ctx.fill();
        // some bots show a hex chassis
        if ((p.seed | 0) % 3 === 0) {
          ctx.strokeStyle = `rgba(255,255,255,${0.8 * t})`;
          ctx.lineWidth = 0.9;
          ctx.beginPath();
          for (let i = 0; i < 6; i++) {
            const a = (i / 6) * TAU + p.rot;
            const rr2 = p.size * 1.5;
            if (i === 0) ctx.moveTo(Math.cos(a) * rr2, Math.sin(a) * rr2);
            else ctx.lineTo(Math.cos(a) * rr2, Math.sin(a) * rr2);
          }
          ctx.closePath();
          ctx.stroke();
        }
        break;
      }
      /* ------- six-fold dendrite snowflake: real ice crystallography ---- */
      case 'snowflake': {
        const R = p.size * 3;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        // soft ice halo
        const hg = ctx.createRadialGradient(0, 0, 0, 0, 0, R * 1.8);
        hg.addColorStop(0, hexA(p.color, 0.55 * t));
        hg.addColorStop(0.4, hexA(p.color, 0.22 * t));
        hg.addColorStop(1, hexA(p.color, 0));
        ctx.fillStyle = hg;
        ctx.beginPath();
        ctx.arc(0, 0, R * 1.8, 0, TAU);
        ctx.fill();
        // solid six-fold dendrite
        ctx.globalCompositeOperation = 'source-over';
        for (let k = 0; k < 6; k++) {
          const a = (k / 6) * TAU;
          ctx.save();
          ctx.rotate(a);
          const gg = ctx.createLinearGradient(0, 0, R, 0);
          gg.addColorStop(0, `rgba(255,255,255,${0.98 * t})`);
          gg.addColorStop(0.55, hexA(p.color, 0.9 * t));
          gg.addColorStop(1, hexA(p.color2 ?? '#cbe9ff', 0.35 * t));
          ctx.strokeStyle = gg;
          ctx.lineWidth = Math.max(0.7, R * 0.16 * t);
          ctx.lineCap = 'round';
          // main spine
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(R, 0);
          ctx.stroke();
          // two side barbs per arm
          for (const bp of [0.38, 0.66]) {
            const bx = R * bp;
            const bl = R * (1 - bp) * 0.82;
            ctx.lineWidth = Math.max(0.5, R * 0.12 * t);
            ctx.beginPath();
            ctx.moveTo(bx, 0);
            ctx.lineTo(bx + bl * 0.62, -bl);
            ctx.moveTo(bx, 0);
            ctx.lineTo(bx + bl * 0.62, bl);
            ctx.stroke();
          }
          // tip needle
          ctx.lineWidth = Math.max(0.4, R * 0.09 * t);
          ctx.beginPath();
          ctx.moveTo(R * 0.82, 0);
          ctx.lineTo(R * 1.22, 0);
          ctx.stroke();
          ctx.restore();
        }
        // centre plate
        ctx.fillStyle = `rgba(255,255,255,${0.9 * t})`;
        ctx.beginPath();
        ctx.arc(0, 0, R * 0.22, 0, TAU);
        ctx.fill();
        // glint
        ctx.globalCompositeOperation = p.add ? 'lighter' : 'source-over';
        break;
      }
      /* ------------------------- sublimation mist / cold vapour ---------- */
      case 'frost': {
        const grow = 1 + (1 - t) * (p.data ?? 2.2);
        const r = p.size * grow;
        const a = 0.4 * Math.sin(Math.PI * clamp(t * 1.1, 0, 1));
        const g = ctx.createRadialGradient(p.x - r * 0.2, p.y - r * 0.24, 0, p.x, p.y, r);
        g.addColorStop(0, `rgba(255,255,255,${a * 0.85})`);
        g.addColorStop(0.4, hexA(p.color, a * 0.7));
        g.addColorStop(1, hexA(p.color, 0));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, TAU);
        ctx.fill();
        // tiny glitter specks inside the mist
        ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 3; i++) {
          const sa = p.seed + i * 2.1;
          const sd = r * 0.55;
          ctx.fillStyle = `rgba(255,255,255,${0.5 * t})`;
          ctx.beginPath();
          ctx.arc(p.x + Math.cos(sa) * sd, p.y + Math.sin(sa) * sd, Math.max(0.4, r * 0.05), 0, TAU);
          ctx.fill();
        }
        ctx.globalCompositeOperation = 'source-over';
        break;
      }
      /* ---- pressure wavefront: compression arc with a rarefaction tail - */
      case 'wavefront': {
        const r = p.size2 * (1 - e * 0.86) + p.size;
        const span = (p.data ?? 1.6) * (0.35 + t * 0.65);
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        // outer compression front (bright, thin)
        const g0 = ctx.createRadialGradient(0, 0, r * 0.86, 0, 0, r * 1.14);
        g0.addColorStop(0, hexA(p.color, 0));
        g0.addColorStop(0.55, hexA(p.color, 0.75 * t));
        g0.addColorStop(0.82, `rgba(255,255,255,${0.95 * e})`);
        g0.addColorStop(1, hexA(p.color, 0));
        ctx.strokeStyle = g0;
        ctx.lineWidth = Math.max(1.4, r * 0.3 * t);
        ctx.beginPath();
        ctx.arc(0, 0, r, -span, span);
        ctx.stroke();
        // inner rarefaction (faint, wide) — the trough behind the peak
        ctx.strokeStyle = hexA(p.color2 ?? p.color, 0.3 * t);
        ctx.lineWidth = Math.max(1, r * 0.2 * t);
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.72, -span * 0.85, span * 0.85);
        ctx.stroke();
        ctx.restore();
        break;
      }
      /* ------- quantum ghost: translucent probability amplitude ---------- */
      case 'ghost': {
        const r = p.size * (0.6 + (1 - t) * 0.6);
        const fade = t * t * (p.data ?? 1);
        // interference halo
        const g = ctx.createRadialGradient(p.x, p.y, r * 0.3, p.x, p.y, r * 2.1);
        g.addColorStop(0, hexA(p.color, 0.42 * fade));
        g.addColorStop(0.5, hexA(p.color, 0.14 * fade));
        g.addColorStop(1, hexA(p.color, 0));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r * 2.1, 0, TAU);
        ctx.fill();
        // hollow probability shell with a collapsing rim
        ctx.strokeStyle = hexA(p.color, 0.7 * fade);
        ctx.lineWidth = Math.max(0.7, r * 0.24 * t);
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, TAU);
        ctx.stroke();
        ctx.strokeStyle = `rgba(255,255,255,${0.55 * fade})`;
        ctx.lineWidth = Math.max(0.4, r * 0.1 * t);
        ctx.beginPath();
        ctx.arc(p.x, p.y, r * 1.18, 0, TAU);
        ctx.stroke();
        // phase stripes
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.strokeStyle = hexA(p.color, 0.3 * fade);
        ctx.lineWidth = Math.max(0.5, r * 0.1 * t);
        for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          ctx.ellipse(0, 0, r * (0.4 + i * 0.22), r * 0.98, 0, 0, TAU);
          ctx.stroke();
        }
        ctx.restore();
        break;
      }
      /* ---- corrosive acid droplet: glowing bile with a hot meniscus ---- */
      case 'acid': {
        const sp = Math.hypot(p.vx, p.vy);
        const stretch = clamp(1 + sp * 0.0016, 1, 2.4);
        const r = Math.max(1, p.size * (0.6 + t * 0.7));
        ctx.translate(p.x, p.y);
        ctx.rotate(Math.atan2(p.vy, p.vx));
        // caustic glow
        const gg = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 4);
        gg.addColorStop(0, `rgba(255,255,220,${0.9 * e})`);
        gg.addColorStop(0.22, hexA(p.color, 0.8 * t));
        gg.addColorStop(0.55, hexA(p.color2 ?? p.color, 0.3 * t));
        gg.addColorStop(1, hexA(p.color, 0));
        ctx.fillStyle = gg;
        ctx.beginPath();
        ctx.arc(0, 0, r * 4, 0, TAU);
        ctx.fill();
        // droplet body, stretched by surface tension under acceleration
        ctx.globalCompositeOperation = 'source-over';
        const bg = ctx.createRadialGradient(-r * 0.3, -r * 0.35, 0, 0, 0, r * 1.25);
        bg.addColorStop(0, '#fbffe8');
        bg.addColorStop(0.32, p.color);
        bg.addColorStop(0.78, p.color2 ?? p.color);
        bg.addColorStop(1, mix(p.color2 ?? p.color, '#0f2405', 0.6));
        ctx.fillStyle = bg;
        ctx.beginPath();
        ctx.ellipse(0, 0, r * stretch, r, 0, 0, TAU);
        ctx.fill();
        // bright meniscus highlight
        ctx.fillStyle = `rgba(255,255,255,${0.8 * t})`;
        ctx.beginPath();
        ctx.ellipse(-r * 0.35, -r * 0.3, r * 0.42, r * 0.28, 0, 0, TAU);
        ctx.fill();
        break;
      }
      /* ------------------------------------ fizzing acid gas bubble ---- */
      case 'bubble': {
        const r = p.size * (0.5 + (1 - t) * 1.1);
        ctx.globalCompositeOperation = 'lighter';
        const g = ctx.createRadialGradient(p.x, p.y, r * 0.2, p.x, p.y, r * 1.5);
        g.addColorStop(0, hexA(p.color2 ?? '#eaffb0', 0.75 * t));
        g.addColorStop(0.4, hexA(p.color, 0.45 * t));
        g.addColorStop(1, hexA(p.color, 0));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r * 1.5, 0, TAU);
        ctx.fill();
        // thin popped shell
        ctx.strokeStyle = `rgba(240,255,200,${0.55 * t})`;
        ctx.lineWidth = Math.max(0.5, r * 0.16);
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, TAU);
        ctx.stroke();
        ctx.globalCompositeOperation = 'source-over';
        break;
      }
      case 'text': {
        ctx.globalAlpha = clamp(t * 1.5, 0, 1);
        const sc = 1 + (1 - t) * 0.18;
        ctx.translate(p.x, p.y);
        ctx.scale(sc, sc);
        ctx.font = `900 ${p.size}px ui-sans-serif, system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.lineWidth = 5;
        ctx.strokeStyle = 'rgba(0,0,0,0.65)';
        ctx.strokeText(p.text ?? '', 0, 0);
        ctx.fillStyle = p.color;
        ctx.fillText(p.text ?? '', 0, 0);
        break;
      }
    }
    ctx.restore();
  }
}



export function hexA(hex: string, a: number) {
  const [r, g, b] = parseHex(hex);
  return `rgba(${r},${g},${b},${clamp(a, 0, 1)})`;
}

/** Multi-stop metal shader gradient. */
export function metal(
  ctx: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  base = '#3b4048',
  hi = '#8b939f',
  lo = '#15181d',
) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  g.addColorStop(0, hi);
  g.addColorStop(0.28, mix(base, '#ffffff', 0.12));
  g.addColorStop(0.55, base);
  g.addColorStop(1, lo);
  return g;
}

export function rr(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const rad = Math.min(Math.abs(r), Math.abs(w) / 2, Math.abs(h) / 2);
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

/** soft inner bevel stroke, gives parts a machined edge */
export function bevel(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  strength = 1,
) {
  ctx.save();
  rr(ctx, x + 0.5, y + 0.5, w - 1, h - 1, r);
  ctx.strokeStyle = `rgba(255,255,255,${0.22 * strength})`;
  ctx.lineWidth = 1;
  ctx.stroke();
  rr(ctx, x + 0.5, y + 1.5, w - 1, h - 2, r);
  ctx.strokeStyle = `rgba(0,0,0,${0.3 * strength})`;
  ctx.stroke();
  ctx.restore();
}

/** pre-rendered film grain tile */
export function makeGrain(size = 128, alpha = 26) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d')!;
  const img = g.createImageData(size, size);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 128 + (Math.random() * 2 - 1) * 110;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = alpha;
  }
  g.putImageData(img, 0, 0);
  return c;
}
