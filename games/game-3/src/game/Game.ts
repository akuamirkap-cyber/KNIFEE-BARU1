import { Sfx } from './sfx';

export type Status = 'playing' | 'win' | 'lose';
export type WeaponId = 'xeno' | 'dora' | 'pred' | 'void';
export interface GameState {
  weapon: WeaponId;
  ammo: number;
  total: number;
  hits: number;
  status: Status;
}

export const ACID = { core: '#f4ff9a', glow: '#b6ff1a', deep: '#3f8a00' };
export const AIR = { core: '#ffffff', glow: '#9fdcff', deep: '#1b8fe6' };
export const VOID = { core: '#fff1d6', glow: '#ff9a3c', deep: '#7a2bff', violet: '#b06cff' };
export const PLASMA = { core: '#ffffff', glow: '#6fd3ff', deep: '#1a5cff', hot: '#dff6ff', laser: '#ff1e1e' };
export const DORA = { blue: '#1ca0e8', blueDark: '#0f6fb0', red: '#e5322d', yellow: '#ffd23a' };

const TAU = Math.PI * 2;
const rand = (a: number, b: number) => a + Math.random() * (b - a);
const pick = <T,>(arr: T[]) => arr[(Math.random() * arr.length) | 0];
const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const norm = (a: number) => ((a % TAU) + TAU) % TAU;
const angDiff = (a: number, b: number) => {
  const d = Math.abs(norm(a) - norm(b));
  return d > Math.PI ? TAU - d : d;
};
function hexRgb(h: string) {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function rgba(h: string, a: number) {
  const [r, g, b] = hexRgb(h);
  return `rgba(${r},${g},${b},${a})`;
}
function prng(seed: number) {
  let s = seed * 9301 + 49297;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}
const glowCache = new Map<string, HTMLCanvasElement>();
function glowSprite(hex: string) {
  let c = glowCache.get(hex);
  if (c) return c;
  c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, rgba(hex, 1));
  gr.addColorStop(0.18, rgba(hex, 0.8));
  gr.addColorStop(0.45, rgba(hex, 0.25));
  gr.addColorStop(1, rgba(hex, 0));
  g.fillStyle = gr;
  g.fillRect(0, 0, 128, 128);
  glowCache.set(hex, c);
  return c;
}
// metaball field sprite: alpha = (1-d^2)^2
let blobSpriteC: HTMLCanvasElement | null = null;
function blobSprite() {
  if (blobSpriteC) return blobSpriteC;
  const S = 64;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d')!;
  const img = g.createImageData(S, S);
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const dx = (x + 0.5) / (S / 2) - 1, dy = (y + 0.5) / (S / 2) - 1;
      const d2 = dx * dx + dy * dy;
      const v = d2 >= 1 ? 0 : Math.pow(1 - d2, 2);
      const i = (y * S + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = 255;
      img.data[i + 3] = Math.round(v * 255);
    }
  g.putImageData(img, 0, 0);
  blobSpriteC = c;
  return c;
}

interface Particle {
  x: number; y: number; vx: number; vy: number; life: number; max: number; size: number;
  color: string; kind: string; g: number; drag: number; add: boolean; rot: number; vr: number; grow: number; data?: any;
}
interface Projectile { x: number; y: number; vy: number; t: number; trail: { x: number; y: number }[]; startY: number; wob: number; w: WeaponId; lastEcho: number }
interface SubBlob { d: number; s: number; r: number; ph: number }
interface Stuck { a: number; kind: 'knife' | 'acid' | 'air' | 'plasma' | 'void'; age: number; seed: number; blobs: SubBlob[]; dripT: number; drip: number }
interface Decal { a: number; age: number; pts: number[]; seed: number; kind: 'acid' | 'air' | 'plasma' | 'void' }
interface Blob { x: number; y: number; r: number }
interface Bounce { x: number; y: number; vx: number; vy: number; rot: number; vr: number; life: number }
interface Shard { a0: number; a1: number; x: number; y: number; vx: number; vy: number; rot: number; vr: number; base: number }

export class Game {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  W = 0; H = 0; dpr = 1;
  R = 130; cx = 0; cy = 0; gx = 0; gy = 0; my = 0;
  weapon: WeaponId = 'xeno';
  particles: Particle[] = [];
  projectiles: Projectile[] = [];
  stuck: Stuck[] = [];
  decals: Decal[] = [];
  bounces: Bounce[] = [];
  shards: Shard[] = [];
  blobs: Blob[] = [];
  rot = 0; time = 0; bump = 0; wheelFlash = 0; wheelAlive = true;
  ammo = 8; total = 8; hits = 0; status: Status = 'playing';
  shake = 0; recoil = 0; glow = 0; jaw = 0; cooldown = 0;
  charge = -1; chargeDur = 0.55; servo = 0; heat = 0;
  collapse = -1; collapseDur = 1.6; ringSpin = 0;
  endTimer = -1; endStatus: Status = 'playing'; explodeTimer = -1;
  wheelImg: HTMLCanvasElement | null = null;
  bg: HTMLCanvasElement | null = null;
  vignette: HTMLCanvasElement | null = null;
  twinkles: { x: number; y: number; s: number; p: number }[] = [];
  // fluid layer
  fs = 0.4; fw = 0; fh = 0;
  fc!: HTMLCanvasElement; fctx!: CanvasRenderingContext2D;
  oc!: HTMLCanvasElement; octx!: CanvasRenderingContext2D;
  out!: ImageData;
  raf = 0; last = 0;
  sfx = new Sfx();
  onState: (s: GameState) => void;

  constructor(canvas: HTMLCanvasElement, onState: (s: GameState) => void) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.onState = onState;
    this.fc = document.createElement('canvas');
    this.fctx = this.fc.getContext('2d', { willReadFrequently: true })!;
    this.oc = document.createElement('canvas');
    this.octx = this.oc.getContext('2d')!;
    this.resize();
    this.restart();
    this.last = performance.now();
    const loop = (t: number) => {
      const dt = Math.min(0.033, (t - this.last) / 1000);
      this.last = t;
      this.update(dt);
      this.draw();
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  destroy() { cancelAnimationFrame(this.raf); }
  setWeapon(w: WeaponId) { this.weapon = w; this.glow = 0.6; this.charge = -1; this.cooldown = 0; this.emit(); }
  emit() { this.onState({ weapon: this.weapon, ammo: this.ammo, total: this.total, hits: this.hits, status: this.status }); }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.dpr = dpr;
    this.W = window.innerWidth;
    this.H = window.innerHeight;
    this.canvas.width = this.W * dpr;
    this.canvas.height = this.H * dpr;
    this.canvas.style.width = this.W + 'px';
    this.canvas.style.height = this.H + 'px';
    const R = Math.round(Math.max(85, Math.min(this.W * 0.3, this.H * 0.16, 150)));
    this.R = R;
    this.cx = this.W / 2;
    this.cy = Math.max(R + 80, this.H * 0.3);
    this.gx = this.W / 2;
    this.gy = this.H - 150;
    this.my = this.gy - 80;
    // fluid res (cap pixel count)
    this.fs = Math.min(0.45, Math.sqrt(150000 / (this.W * this.H)));
    this.fw = Math.ceil(this.W * this.fs);
    this.fh = Math.ceil(this.H * this.fs);
    this.fc.width = this.oc.width = this.fw;
    this.fc.height = this.oc.height = this.fh;
    this.out = this.octx.createImageData(this.fw, this.fh);
    this.buildWheel();
    this.buildBg();
  }

  restart() {
    this.particles = []; this.projectiles = []; this.stuck = []; this.decals = [];
    this.bounces = []; this.shards = [];
    this.ammo = this.total; this.hits = 0; this.status = 'playing';
    this.wheelAlive = true; this.endTimer = -1; this.explodeTimer = -1; this.charge = -1; this.heat = 0; this.collapse = -1;
    this.rot = Math.random() * TAU;
    const a0 = Math.random() * TAU;
    [a0, a0 + TAU / 3 + rand(-0.3, 0.3), a0 + (2 * TAU) / 3 + rand(-0.3, 0.3)].forEach((a) => {
      this.stuck.push({ a: norm(a), kind: 'knife', age: 20, seed: Math.random() * 1000, blobs: [], dripT: 1, drip: 0 });
    });
    this.emit();
  }

  // ---------- wooden target wheel ----------
  buildWheel() {
    const R = this.R;
    const S = (R + 16) * 2;
    const c = document.createElement('canvas');
    c.width = S * this.dpr; c.height = S * this.dpr;
    const g = c.getContext('2d')!;
    g.scale(this.dpr, this.dpr);
    g.translate(S / 2, S / 2);
    // bark
    const bark = g.createRadialGradient(0, 0, R * 0.85, 0, 0, R);
    bark.addColorStop(0, '#6b4a2a'); bark.addColorStop(0.6, '#3d2814'); bark.addColorStop(1, '#1e1208');
    g.beginPath(); g.arc(0, 0, R, 0, TAU); g.fillStyle = bark; g.fill();
    const r0 = prng(3);
    for (let i = 0; i < 70; i++) {
      const a = r0() * TAU;
      g.save(); g.rotate(a);
      g.fillStyle = `rgba(0,0,0,${0.2 + r0() * 0.4})`;
      g.fillRect(R * 0.9, -1.5, R * 0.1, 2 + r0() * 3);
      g.restore();
    }
    // wood face
    const face = g.createRadialGradient(-R * 0.25, -R * 0.25, R * 0.05, 0, 0, R * 0.9);
    face.addColorStop(0, '#e6c48c'); face.addColorStop(0.6, '#c9a066'); face.addColorStop(1, '#9a7240');
    g.beginPath(); g.arc(0, 0, R * 0.9, 0, TAU); g.fillStyle = face; g.fill();
    // growth rings (wobbly)
    const r1 = prng(11);
    for (let k = 1; k < 16; k++) {
      const rr = (k / 16) * R * 0.88;
      g.beginPath();
      for (let i = 0; i <= 64; i++) {
        const a = (i / 64) * TAU;
        const w = rr + Math.sin(a * 3 + k) * rr * 0.03 + Math.sin(a * 7 + k * 2) * rr * 0.015;
        i ? g.lineTo(Math.cos(a) * w, Math.sin(a) * w) : g.moveTo(Math.cos(a) * w, Math.sin(a) * w);
      }
      g.closePath();
      g.strokeStyle = `rgba(90,55,20,${0.18 + r1() * 0.25})`;
      g.lineWidth = k % 3 === 0 ? 2.2 : 1;
      g.stroke();
    }
    // radial cracks
    for (let i = 0; i < 5; i++) {
      const a = r1() * TAU;
      g.save(); g.rotate(a);
      g.beginPath(); g.moveTo(R * 0.2, 0);
      let x = R * 0.2, y = 0;
      while (x < R * 0.85) { x += rand(8, 16); y += rand(-3, 3); g.lineTo(x, y); }
      g.strokeStyle = 'rgba(40,20,5,0.55)'; g.lineWidth = 1.4; g.stroke();
      g.restore();
    }
    // target paint rings
    const paint = (r: number, w: number, col: string, a: number) => {
      g.beginPath(); g.arc(0, 0, r, 0, TAU); g.strokeStyle = rgba(col, a); g.lineWidth = w; g.stroke();
    };
    paint(R * 0.7, 10, '#b3341f', 0.55);
    paint(R * 0.45, 8, '#b3341f', 0.5);
    paint(R * 0.82, 3, '#2a1a0a', 0.5);
    // center metal hub
    const hub = g.createRadialGradient(-3, -3, 0, 0, 0, R * 0.13);
    hub.addColorStop(0, '#9aa3b2'); hub.addColorStop(0.7, '#3a404b'); hub.addColorStop(1, '#1b1e25');
    g.beginPath(); g.arc(0, 0, R * 0.13, 0, TAU); g.fillStyle = hub; g.fill();
    g.beginPath(); g.arc(0, 0, R * 0.06, 0, TAU); g.fillStyle = '#111318'; g.fill();
    g.beginPath(); g.arc(0, 0, R * 0.03, 0, TAU); g.fillStyle = '#e8f6ff'; g.fill();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU;
      g.beginPath(); g.arc(Math.cos(a) * R * 0.1, Math.sin(a) * R * 0.1, 1.8, 0, TAU); g.fillStyle = '#d8dde6'; g.fill();
    }
    // sheen
    const sh = g.createLinearGradient(-R, -R, R * 0.4, R * 0.4);
    sh.addColorStop(0, 'rgba(255,255,255,0.14)'); sh.addColorStop(0.5, 'rgba(255,255,255,0)');
    g.beginPath(); g.arc(0, 0, R, 0, TAU); g.fillStyle = sh; g.fill();
    this.wheelImg = c;
  }

  buildBg() {
    const W = this.W, H = this.H;
    const c = document.createElement('canvas');
    c.width = W * this.dpr; c.height = H * this.dpr;
    const g = c.getContext('2d')!;
    g.scale(this.dpr, this.dpr);
    const lg = g.createLinearGradient(0, 0, 0, H);
    lg.addColorStop(0, '#07061a'); lg.addColorStop(0.55, '#0b0d26'); lg.addColorStop(1, '#0a1a1a');
    g.fillStyle = lg; g.fillRect(0, 0, W, H);
    const neb = (x: number, y: number, r: number, col: string, a: number) => {
      const gr = g.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, rgba(col, a)); gr.addColorStop(1, rgba(col, 0));
      g.fillStyle = gr; g.fillRect(0, 0, W, H);
    };
    neb(W * 0.2, H * 0.2, W * 0.6, '#2a1a6a', 0.4);
    neb(W * 0.85, H * 0.4, W * 0.5, '#0c3a4a', 0.35);
    neb(W * 0.5, H * 0.95, W * 0.7, '#1a4a10', 0.35);
    for (let i = 0; i < (W * H) / 2600; i++) {
      g.fillStyle = `rgba(255,255,255,${Math.random() * 0.6})`;
      const s = Math.random() < 0.95 ? 1 : 1.8;
      g.fillRect(Math.random() * W, Math.random() * H, s, s);
    }
    // organic hive ribs at the bottom corners
    g.strokeStyle = 'rgba(40,60,70,0.35)'; g.lineWidth = 6; g.lineCap = 'round';
    for (let i = 0; i < 7; i++) {
      g.beginPath(); g.moveTo(-20, H - i * 70 - 30); g.quadraticCurveTo(W * 0.2, H - i * 70 - 90, W * 0.12, H + 20); g.stroke();
      g.beginPath(); g.moveTo(W + 20, H - i * 70 - 30); g.quadraticCurveTo(W * 0.8, H - i * 70 - 90, W * 0.88, H + 20); g.stroke();
    }
    // floor mist
    const fg = g.createLinearGradient(0, H - 160, 0, H);
    fg.addColorStop(0, 'rgba(60,120,30,0)'); fg.addColorStop(1, 'rgba(60,120,30,0.25)');
    g.fillStyle = fg; g.fillRect(0, H - 160, W, 160);
    this.bg = c;

    const v = document.createElement('canvas');
    v.width = W; v.height = H;
    const vg = v.getContext('2d')!;
    const gr = vg.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.8);
    gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,0.75)');
    vg.fillStyle = gr; vg.fillRect(0, 0, W, H);
    this.vignette = v;
    this.twinkles = Array.from({ length: 40 }, () => ({ x: Math.random() * W, y: Math.random() * H * 0.8, s: rand(0.8, 2), p: Math.random() * TAU }));
  }

  // ---------- particles ----------
  add(o: Partial<Particle> & { x: number; y: number }) {
    if (this.particles.length > 2600) return;
    this.particles.push({ vx: 0, vy: 0, life: 0, max: 1, size: 4, color: '#ffffff', kind: 'ember', g: 0, drag: 0, add: true, rot: 0, vr: 0, grow: 0, ...o });
  }
  /** acid droplet: lives in the fluid layer. size = radius */
  drop(x: number, y: number, vx: number, vy: number, r: number, max = 1.2, g = 1000) {
    this.add({ x, y, vx, vy, kind: 'acid', size: r, max, g, drag: 0.15, add: false, data: 0 });
  }
  burst(x: number, y: number, n: number, base: number, spread: number, smin: number, smax: number, o: Partial<Particle>, colors?: string[]) {
    for (let i = 0; i < n; i++) {
      const a = base + rand(-spread, spread);
      const s = rand(smin, smax);
      this.add({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, ...o, color: colors ? pick(colors) : o.color, max: (o.max ?? 1) * rand(0.6, 1.3) });
    }
  }

  // ---------- input ----------
  fire() {
    this.sfx.ensure();
    if (this.status !== 'playing' || this.ammo <= 0 || this.cooldown > 0 || !this.wheelAlive || this.endTimer >= 0) return;
    this.ammo--;
    const x = this.gx, y = this.my;
    if (this.weapon === 'dora') { this.fireAir(x, y); this.emit(); return; }
    if (this.weapon === 'pred') { this.startCharge(); this.emit(); return; }
    if (this.weapon === 'void') { this.fireVoid(x, y - 80); this.emit(); return; }
    this.cooldown = 0.3;
    this.recoil = 1; this.glow = 1; this.jaw = 1;
    this.projectiles.push({ x, y, vy: -1650, t: 0, trail: [], startY: y, wob: Math.random() * TAU, w: 'xeno', lastEcho: y });
    // viscous spit stream behind the glob (slower -> stretches and breaks into droplets)
    for (let i = 0; i < 16; i++) {
      const k = i / 16;
      this.drop(x + rand(-3, 3), y + k * 10, rand(-25, 25), -1650 * (0.45 + k * 0.5), rand(2.5, 6.5) * (1 - k * 0.5) + 1.5, rand(0.7, 1.2), 900);
    }
    // fine mist
    for (let i = 0; i < 10; i++) this.drop(x + rand(-6, 6), y, rand(-120, 120), rand(-900, -300), rand(1.2, 2.2), rand(0.4, 0.8), 1200);
    this.add({ x, y, kind: 'flash', size: 80, color: ACID.glow, max: 0.2 });
    this.add({ x, y, kind: 'ring', size: 8, grow: 220, color: ACID.glow, max: 0.3 });
    for (let i = 0; i < 6; i++) this.add({ x: x + rand(-14, 14), y, vx: rand(-40, 40), vy: rand(-90, -30), kind: 'smoke', size: rand(10, 20), grow: 30, color: '#9bd13a', add: false, max: rand(0.8, 1.4), data: 0.3 });
    this.sfx.spit();
    this.shake = Math.max(this.shake, 3);
    this.emit();
  }

  /** Black Hole Shooter: launches a micro-singularity */
  fireVoid(x: number, y: number) {
    this.cooldown = 0.42;
    this.recoil = 1; this.glow = 1;
    this.projectiles.push({ x, y, vy: -1500, t: 0, trail: [], startY: y, wob: Math.random() * TAU, w: 'void', lastEcho: y });
    this.add({ x, y, kind: 'flash', size: 140, color: VOID.deep, max: 0.3 });
    this.add({ x, y, kind: 'flash', size: 60, color: VOID.core, max: 0.14 });
    this.add({ x, y, kind: 'ring', size: 90, grow: -260, color: VOID.violet, max: 0.3 });
    this.add({ x, y, kind: 'ring', size: 10, grow: 360, color: VOID.glow, max: 0.3 });
    this.add({ x, y, kind: 'flare', size: 240, color: VOID.violet, max: 0.25 });
    for (let i = 0; i < 6; i++) this.bolt(x, y, rand(30, 70), rand(0, TAU), VOID.violet, rand(0.1, 0.2));
    this.burst(x, y, 30, -Math.PI / 2, Math.PI, 150, 500, { kind: 'spark', size: 1.6, drag: 3, max: 0.35 }, [VOID.core, VOID.glow, VOID.violet]);
    for (let i = 0; i < 8; i++) this.add({ x: x + rand(-16, 16), y: y + 10, vx: rand(-40, 40), vy: rand(-30, 30), kind: 'smoke', size: rand(14, 26), grow: 36, color: '#2a1050', add: false, max: rand(0.8, 1.3), data: 0.5 });
    this.sfx.voidShot();
    this.shake = Math.max(this.shake, 8);
  }

  /** suck particles toward (x,y) with radius r and strength k */
  gravity(x: number, y: number, r: number, k: number, dt: number) {
    for (const p of this.particles) {
      if (p.kind === 'text' || p.kind === 'flash' || p.kind === 'ring' || p.kind === 'ringE' || p.kind === 'speed' || p.kind === 'flare' || p.kind === 'star' || p.kind === 'bolt') continue;
      const dx = x - p.x, dy = y - p.y;
      const d2 = dx * dx + dy * dy;
      if (d2 > r * r || d2 < 1) continue;
      const d = Math.sqrt(d2);
      const f = (k * (1 - d / r) * 1800) / Math.max(20, d);
      p.vx += (dx / d) * f * dt * 60;
      p.vy += (dy / d) * f * dt * 60;
      // spiral
      p.vx += (-dy / d) * f * 0.5 * dt * 60;
      p.vy += (dx / d) * f * 0.5 * dt * 60;
      if (d < 10) p.life = p.max;
    }
  }

  /** Predator caster: core charge-up, then plasma release */
  startCharge() {
    this.charge = 0;
    this.cooldown = this.chargeDur + 0.35;
    this.sfx.charge(this.chargeDur);
  }

  releasePlasma() {
    const x = this.gx, y = this.my - 68;
    this.charge = -1;
    this.recoil = 1; this.glow = 1; this.heat = 1;
    this.projectiles.push({ x, y, vy: -2600, t: 0, trail: [], startY: y, wob: Math.random() * TAU, w: 'pred', lastEcho: y });
    this.add({ x, y, kind: 'flash', size: 170, color: PLASMA.glow, max: 0.22 });
    this.add({ x, y, kind: 'flash', size: 80, color: '#ffffff', max: 0.12 });
    this.add({ x, y, kind: 'ring', size: 10, grow: 420, color: PLASMA.glow, max: 0.3 });
    this.add({ x, y, kind: 'ringE', size: 8, grow: 300, color: '#ffffff', max: 0.28 });
    this.add({ x, y, kind: 'flare', size: 220, color: PLASMA.glow, max: 0.22 });
    for (let i = 0; i < 6; i++) this.bolt(x, y, rand(30, 70), -Math.PI / 2 + rand(-1.4, 1.4), i % 2 ? '#ffffff' : PLASMA.glow, rand(0.1, 0.2));
    this.burst(x, y, 26, -Math.PI / 2, 1.3, 200, 700, { kind: 'spark', size: 1.8, drag: 4, max: 0.3 }, ['#ffffff', PLASMA.glow, PLASMA.hot]);
    for (let i = 0; i < 6; i++) this.add({ x: x + rand(-16, 16), y: y + 10, vx: rand(-50, 50), vy: rand(-40, 20), kind: 'smoke', size: rand(12, 22), grow: 34, color: '#3a4a60', add: false, max: rand(0.7, 1.2), data: 0.4 });
    this.sfx.plasma();
    this.shake = Math.max(this.shake, 10);
  }

  bolt(x: number, y: number, len: number, ang: number, color: string, max = 0.18) {
    const pts: number[] = [0, 0];
    const segs = 7;
    for (let i = 1; i <= segs; i++) {
      const d = (i / segs) * len;
      const off = i === segs ? 0 : rand(-len * 0.2, len * 0.2);
      pts.push(Math.cos(ang) * d - Math.sin(ang) * off, Math.sin(ang) * d + Math.cos(ang) * off);
    }
    this.add({ x, y, kind: 'bolt', color, max, data: pts });
  }

  /** Doraemon Air Cannon: DOKAN! */
  fireAir(x: number, y0: number) {
    this.cooldown = 0.34;
    this.recoil = 1; this.glow = 1; this.jaw = 1;
    const y = y0 - 70; // muzzle of the barrel
    this.projectiles.push({ x, y: y + 20, vy: -2100, t: 0, trail: [], startY: y, wob: Math.random() * TAU, w: 'dora', lastEcho: y });
    // muzzle: cartoon puff ring + shock rings + DOKAN text
    this.add({ x, y, kind: 'flash', size: 120, color: '#ffffff', max: 0.16 });
    this.add({ x, y, kind: 'ringE', size: 14, grow: 420, color: '#ffffff', max: 0.3 });
    this.add({ x, y, kind: 'ringE', size: 8, grow: 260, color: AIR.glow, max: 0.36 });
    for (let i = 0; i < 14; i++) {
      const a = rand(0, TAU);
      const sp = rand(90, 260);
      this.add({ x: x + Math.cos(a) * 14, y: y + 6 + Math.sin(a) * 6, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.5 + 30, kind: 'puff', size: rand(12, 22), grow: 26, color: '#ffffff', add: false, drag: 3.2, max: rand(0.5, 0.9), rot: rand(0, TAU), vr: rand(-2, 2) });
    }
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + rand(-0.5, 0.5);
      this.add({ x, y, vx: Math.cos(a) * rand(500, 900), vy: Math.sin(a) * rand(500, 900), kind: 'wind', size: rand(14, 30), color: '#ffffff', max: rand(0.18, 0.3), drag: 1 });
    }
    this.add({ x: x + 54, y: y - 30, vx: 20, vy: -60, kind: 'text', size: 34, color: DORA.yellow, max: 0.7, rot: -0.18, data: 'DOKAN!' });
    this.sfx.dokan();
    this.shake = Math.max(this.shake, 9);
  }

  // ---------- update ----------
  update(dt: number) {
    this.time += dt;
    if (this.wheelAlive) {
      const speed = 1.5 + 1.1 * Math.sin(this.time * 0.75) + 0.35 * Math.sin(this.time * 2.1);
      this.rot += speed * dt;
    }
    this.bump *= Math.pow(0.0005, dt);
    this.wheelFlash = Math.max(0, this.wheelFlash - dt * 5);
    this.shake *= Math.pow(0.002, dt);
    this.recoil *= Math.pow(0.0008, dt);
    this.glow = Math.max(0, this.glow - dt * 2.5);
    this.jaw = Math.max(0, this.jaw - dt * 2.4);
    this.cooldown -= dt;
    this.heat = Math.max(0, this.heat - dt * 0.5);
    this.ringSpin += dt * (1 + this.glow * 6 + (this.weapon === 'void' && this.cooldown > 0 ? 2 : 0));
    if (this.collapse >= 0) {
      this.collapse += dt / this.collapseDur;
      const k = clamp(this.collapse);
      const cx = this.cx, cy = this.cy - this.bump;
      this.gravity(cx, cy, 700, 2.5 + k * 3, dt);
      for (const sh of this.shards) {
        const dx = cx - sh.x, dy = cy - sh.y, d = Math.hypot(dx, dy) || 1;
        const f = (900 + k * 2600) / Math.max(30, d) * 60 * dt;
        sh.vx += (dx / d) * f - sh.vy * 0.02; sh.vy += (dy / d) * f + sh.vx * 0.02;
        sh.vx *= 1 - dt * 1.5; sh.vy *= 1 - dt * 1.5;
        sh.vr += dt * 6;
      }
      for (const b of this.bounces) {
        const dx = cx - b.x, dy = cy - b.y, d = Math.hypot(dx, dy) || 1;
        const f = (900 + k * 2600) / Math.max(30, d) * 60 * dt;
        b.vx += (dx / d) * f; b.vy += (dy / d) * f - 1800 * dt; b.vx *= 1 - dt * 1.5; b.vy *= 1 - dt * 1.5;
      }
      if (Math.random() < 0.9) {
        const a = rand(0, TAU), d = rand(200, 420);
        this.add({ x: cx + Math.cos(a) * d, y: cy + Math.sin(a) * d, vx: -Math.sin(a) * 300, vy: Math.cos(a) * 300, kind: 'ember', size: rand(1, 2.5), color: pick([VOID.core, VOID.glow, VOID.violet, '#ffffff']), max: rand(0.8, 1.4) });
      }
      this.shake = Math.max(this.shake, 4 + k * 8);
      if (this.collapse >= 1) {
        this.collapse = -1;
        this.shards = []; this.bounces = [];
        this.add({ x: cx, y: cy, kind: 'flash', size: 700, color: '#ffffff', max: 0.35 });
        this.add({ x: cx, y: cy, kind: 'flash', size: 500, color: VOID.violet, max: 0.6 });
        this.add({ x: cx, y: cy, kind: 'ring', size: 10, grow: 1400, color: '#ffffff', max: 0.5 });
        this.add({ x: cx, y: cy, kind: 'ring', size: 10, grow: 900, color: VOID.glow, max: 0.6 });
        this.add({ x: cx, y: cy, kind: 'flare', size: 1000, color: VOID.violet, max: 0.5 });
        for (let i = 0; i < 20; i++) this.bolt(cx, cy, rand(120, 320), rand(0, TAU), i % 2 ? '#ffffff' : VOID.violet, 0.35);
        this.burst(cx, cy, 140, 0, Math.PI, 300, 1400, { kind: 'spark', size: 2.2, drag: 2, max: 0.9 }, ['#ffffff', VOID.core, VOID.glow, VOID.violet]);
        this.shake = 30;
      }
    }
    const servoT = this.charge >= 0 ? 1 : (this.weapon === 'pred' && this.status === 'playing' && this.wheelAlive ? 0.35 : 0);
    this.servo += (servoT - this.servo) * Math.min(1, dt * 7);
    if (this.charge >= 0) {
      this.charge += dt / this.chargeDur;
      const cx = this.gx, cy = this.my - 68;
      // ions sucked into the core
      if (Math.random() < 0.9) {
        const a = rand(0, TAU), d = rand(40, 90);
        const px = cx + Math.cos(a) * d, py = cy + Math.sin(a) * d;
        this.add({ x: px, y: py, vx: -Math.cos(a) * d * 4, vy: -Math.sin(a) * d * 4, kind: 'spark', size: 1.4, color: pick(['#ffffff', PLASMA.glow]), max: 0.25 });
      }
      if (Math.random() < this.charge * 0.5) this.bolt(cx, cy, rand(14, 34), rand(0, TAU), PLASMA.glow, 0.08);
      if (this.charge >= 1) this.releasePlasma();
    }

    const hitY = this.cy - this.bump + this.R;
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.t += dt;
      p.y += p.vy * dt;
      p.trail.unshift({ x: p.x + Math.sin(p.t * 30 + p.wob) * 2, y: p.y });
      if (p.trail.length > 12) p.trail.pop();
      if (p.w === 'dora') {
        while (p.lastEcho - p.y > 44) {
          p.lastEcho -= 44;
          this.add({ x: p.x, y: p.lastEcho, kind: 'ringE', size: 26, grow: 90, color: '#ffffff', max: 0.32 });
        }
        if (Math.random() < 0.8) this.add({ x: p.x + rand(-26, 26), y: p.y + rand(10, 40), vx: rand(-30, 30), vy: rand(150, 320), kind: 'wind', size: rand(10, 24), color: '#ffffff', max: rand(0.15, 0.3) });
        if (Math.random() < 0.3) this.add({ x: p.x + rand(-30, 30), y: p.y + rand(0, 30), vx: rand(-80, 80), vy: rand(60, 160), kind: 'puff', size: rand(5, 10), grow: 10, color: '#ffffff', add: false, drag: 2, max: rand(0.3, 0.5), rot: rand(0, TAU), vr: rand(-3, 3) });
      } else if (p.w === 'void') {
        this.gravity(p.x, p.y, 170, 1.2, dt);
        // infalling matter: spawn on a ring and let gravity pull it in
        for (let k = 0; k < 3; k++) {
          const a = rand(0, TAU), d = rand(60, 150);
          this.add({ x: p.x + Math.cos(a) * d, y: p.y + Math.sin(a) * d, vx: -Math.sin(a) * 160, vy: Math.cos(a) * 160, kind: 'ember', size: rand(0.9, 2), color: pick([VOID.core, VOID.glow, VOID.violet, '#ffffff']), max: rand(0.5, 0.9) });
        }
        if (Math.random() < 0.4) this.bolt(p.x, p.y, rand(20, 50), rand(0, TAU), VOID.violet, 0.1);
        while (p.lastEcho - p.y > 70) { p.lastEcho -= 70; this.add({ x: p.x, y: p.lastEcho, kind: 'ring', size: 60, grow: -120, color: VOID.violet, max: 0.4 }); }
      } else if (p.w === 'pred') {
        if (Math.random() < 0.9) this.add({ x: p.x + rand(-8, 8), y: p.y + rand(10, 60), vx: rand(-120, 120), vy: rand(40, 200), kind: 'spark', size: 1.5, color: pick(['#ffffff', PLASMA.glow, PLASMA.hot]), max: rand(0.2, 0.4), drag: 3 });
        if (Math.random() < 0.5) this.bolt(p.x, p.y + rand(0, 40), rand(16, 40), rand(0, TAU), PLASMA.glow, 0.08);
        while (p.lastEcho - p.y > 60) { p.lastEcho -= 60; this.add({ x: p.x, y: p.lastEcho, kind: 'ringE', size: 10, grow: 120, color: PLASMA.glow, max: 0.25 }); }
        if (Math.random() < 0.4) this.add({ x: p.x + rand(-10, 10), y: p.y + 40, vx: rand(-20, 20), vy: rand(-10, 30), kind: 'smoke', size: rand(8, 16), grow: 30, color: '#4a6a90', add: false, max: 0.7, data: 0.25 });
      } else
      // shed droplets from the stream
      if (Math.random() < 0.7) this.drop(p.x + rand(-7, 7), p.y + rand(10, 40), rand(-70, 70), rand(-200, 100), rand(1.5, 3.5), rand(0.5, 1), 1100);
      if (p.w === 'xeno' && Math.random() < 0.3) this.add({ x: p.x + rand(-6, 6), y: p.y + 20, vx: rand(-20, 20), vy: rand(-20, 20), kind: 'smoke', size: rand(6, 12), grow: 20, color: '#b6ff3a', add: false, max: 0.8, data: 0.18 });
      if (p.y <= hitY) {
        p.y = hitY;
        this.projectiles.splice(i, 1);
        this.resolveHit(p);
      }
    }

    // stuck items
    for (const s of this.stuck) {
      s.age += dt;
      if (!this.wheelAlive || s.kind === 'knife') continue;
      const a = s.a + this.rot;
      const cosA = Math.cos(a), sinA = Math.sin(a);
      if (s.kind === 'void') {
        const bx = this.cx + cosA * (this.R + 10), by = this.cy - this.bump + sinA * (this.R + 10);
        this.gravity(bx, by, 60, 0.5, dt);
        if (Math.random() < dt * 20) { const an = rand(0, TAU), d = rand(25, 55); this.add({ x: bx + Math.cos(an) * d, y: by + Math.sin(an) * d, vx: -Math.sin(an) * 90, vy: Math.cos(an) * 90, kind: 'ember', size: rand(0.7, 1.4), color: pick([VOID.glow, VOID.violet, '#ffffff']), max: rand(0.5, 0.9) }); }
        if (Math.random() < dt * 2) this.bolt(bx, by, rand(10, 24), rand(0, TAU), VOID.violet, 0.1);
        continue;
      }
      if (s.kind === 'plasma') {
        const bx = this.cx + cosA * (this.R + 6), by = this.cy - this.bump + sinA * (this.R + 6);
        const hot = clamp(1 - s.age / 6);
        if (Math.random() < dt * (2 + hot * 6)) this.bolt(bx, by, rand(10, 26), a + rand(-1.5, 1.5), PLASMA.glow, 0.1);
        if (Math.random() < dt * (3 + hot * 12)) this.add({ x: bx + rand(-6, 6), y: by + rand(-6, 6), vx: rand(-30, 30), vy: rand(-80, -20), kind: 'ember', size: rand(1, 2.2), color: pick(['#ffb060', '#ff7030', PLASMA.glow]), max: rand(0.4, 0.9), drag: 1 });
        if (Math.random() < dt * (2 + hot * 6)) this.add({ x: bx + rand(-6, 6), y: by, vx: rand(-10, 10), vy: rand(-50, -20), kind: 'smoke', size: rand(6, 12), grow: 22, color: '#303a48', add: false, max: rand(1, 1.8), data: 0.4 });
        continue;
      }
      if (s.kind === 'air') {
        if (Math.random() < dt * 10) {
          const bx = this.cx + cosA * (this.R + 14), by = this.cy - this.bump + sinA * (this.R + 14);
          const ta = a + Math.PI / 2;
          this.add({ x: bx + rand(-10, 10), y: by + rand(-10, 10), vx: Math.cos(ta) * rand(60, 140) * (Math.random() < 0.5 ? 1 : -1), vy: Math.sin(ta) * rand(60, 140), kind: 'wind', size: rand(6, 14), color: '#ffffff', max: rand(0.25, 0.45), drag: 2 });
        }
        continue;
      }
      // drip grows then detaches, falling in world-down
      s.dripT -= dt;
      const bx = this.cx + cosA * (this.R + 8), by = this.cy - this.bump + sinA * (this.R + 8);
      if (s.dripT <= 0) {
        s.drip += dt * 14;
        if (s.drip > 12) {
          this.drop(bx + rand(-4, 4), by + 6, rand(-10, 10), 30, rand(3, 4.2), 1.8, 1100);
          s.drip = 0;
          s.dripT = rand(0.8, 2.2);
        }
      }
      if (Math.random() < dt * 5) this.add({ x: bx + rand(-8, 8), y: by - 4, vx: rand(-15, 15), vy: rand(-45, -15), kind: 'smoke', size: rand(6, 12), grow: 18, color: '#a8e04a', add: false, max: rand(1, 1.8), data: 0.22 });
      if (Math.random() < dt * 6) this.add({ x: bx + rand(-10, 10), y: by + rand(-10, 10), vx: 0, vy: -10, kind: 'bubble', size: rand(1, 2.5), grow: 5, color: ACID.core, max: rand(0.3, 0.7) });
    }
    for (const d of this.decals) {
      d.age += dt;
      if (d.kind === 'acid' && this.wheelAlive && Math.random() < dt * 3) {
        const a = d.a + this.rot;
        const x = this.cx + Math.cos(a) * (this.R - 14), y = this.cy - this.bump + Math.sin(a) * (this.R - 14);
        this.add({ x: x + rand(-8, 8), y: y + rand(-8, 8), vx: rand(-10, 10), vy: rand(-40, -15), kind: 'smoke', size: rand(5, 10), grow: 15, color: '#c8ff5a', add: false, max: rand(0.8, 1.4), data: 0.18 });
      }
    }

    for (let i = this.bounces.length - 1; i >= 0; i--) {
      const b = this.bounces[i];
      b.life -= dt; b.vy += 1800 * dt; b.x += b.vx * dt; b.y += b.vy * dt; b.rot += b.vr * dt;
      if (b.life <= 0 || b.y > this.H + 100) this.bounces.splice(i, 1);
    }
    for (const s of this.shards) { s.vy += 1300 * dt; s.x += s.vx * dt; s.y += s.vy * dt; s.rot += s.vr * dt; }

    const ps = this.particles;
    for (let i = ps.length - 1; i >= 0; i--) {
      const p = ps[i];
      p.life += dt;
      if (p.life >= p.max || p.y > this.H + 60) { ps[i] = ps[ps.length - 1]; ps.pop(); continue; }
      if (p.drag) { const k = Math.max(0, 1 - p.drag * dt); p.vx *= k; p.vy *= k; }
      p.vy += p.g * dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.rot += p.vr * dt;
      p.size = Math.max(0, p.size + p.grow * dt);
    }

    if (this.explodeTimer >= 0) { this.explodeTimer -= dt; if (this.explodeTimer < 0) this.explodeWheel(); }
    if (this.endTimer >= 0) { this.endTimer -= dt; if (this.endTimer < 0) { this.status = this.endStatus; this.emit(); } }
  }

  resolveHit(p: Projectile) {
    const local = norm(Math.PI / 2 - this.rot);
    const x = p.x, y = p.y;
    for (const s of this.stuck) {
      if (angDiff(s.a, local) < (s.kind === 'knife' ? 0.17 : 0.22)) {
        if (p.w === 'void') {
          this.voidImpact(x, y, 1.3);
          if (s.kind === 'knife') {
            const a = s.a + this.rot;
            this.stuck.splice(this.stuck.indexOf(s), 1);
            // knife gets crushed & flung into orbit
            this.bounces.push({ x: this.cx + Math.cos(a) * (this.R + 10), y: this.cy - this.bump + Math.sin(a) * (this.R + 10), vx: rand(-500, 500), vy: rand(-700, -300), rot: a, vr: rand(-30, 30), life: 2.5 });
            this.sfx.clang();
          }
          this.sfx.voidHit();
          this.shake = 18;
          this.endStatus = 'lose';
          this.endTimer = 1.1;
          return;
        }
        if (p.w === 'pred') {
          this.plasmaImpact(x, y, 1.3);
          if (s.kind === 'knife') {
            const a = s.a + this.rot;
            this.stuck.splice(this.stuck.indexOf(s), 1);
            this.bounces.push({ x: this.cx + Math.cos(a) * (this.R + 10), y: this.cy - this.bump + Math.sin(a) * (this.R + 10), vx: rand(-300, 300), vy: rand(-900, -500), rot: a, vr: rand(-20, 20), life: 2.5 });
            this.sfx.clang();
          }
          this.sfx.plasmaHit();
          this.shake = 18;
          this.endStatus = 'lose';
          this.endTimer = 1.1;
          return;
        }
        if (p.w === 'dora') {
          // blast knocks the obstacle away -> fail
          this.airBlast(x, y, 1.3);
          if (s.kind === 'knife') {
            const a = s.a + this.rot;
            this.stuck.splice(this.stuck.indexOf(s), 1);
            this.bounces.push({ x: this.cx + Math.cos(a) * (this.R + 10), y: this.cy - this.bump + Math.sin(a) * (this.R + 10), vx: rand(-200, 200), vy: rand(-900, -600), rot: a, vr: rand(-18, 18), life: 2.5 });
            this.sfx.clang();
          } else this.sfx.thud();
          this.add({ x: x + 40, y: y - 40, vx: 0, vy: -50, kind: 'text', size: 30, color: '#ff4a4a', max: 0.9, rot: 0.15, data: 'GAGAL!' });
          this.shake = 16;
          this.endStatus = 'lose';
          this.endTimer = 1.1;
          return;
        }
        // acid splashes off the obstacle -> fail
        this.splash(x, y + 10, 1.4);
        this.add({ x, y, kind: 'flash', size: 90, color: '#ffffff', max: 0.15 });
        this.add({ x, y, kind: 'ring', size: 6, grow: 300, color: '#ffffff', max: 0.25 });
        this.burst(x, y, 24, Math.PI / 2, 1.5, 200, 700, { kind: 'spark', size: 2, drag: 3, g: 900, max: 0.5 }, ['#ffffff', '#fff2b0', ACID.glow]);
        if (s.kind === 'knife') this.sfx.clang(); else this.sfx.splat();
        this.shake = 14;
        this.endStatus = 'lose';
        this.endTimer = 1.1;
        return;
      }
    }
    if (p.w === 'void') {
      this.stuck.push({ a: local, kind: 'void', age: 0, seed: Math.random() * 1000, blobs: [], dripT: 0, drip: 0 });
      this.decals.push({ a: local, age: 0, pts: Array.from({ length: 14 }, () => rand(0.8, 1.2)), seed: Math.random() * 1000, kind: 'void' });
      this.hits++;
      this.bump = -10; // pulled toward the shooter
      this.wheelFlash = 0.7;
      this.shake = Math.max(this.shake, 14);
      this.voidImpact(x, y, 1);
      this.sfx.voidHit();
      if (this.hits >= this.total) this.explodeTimer = 0.5;
      this.emit();
      return;
    }
    if (p.w === 'pred') {
      this.stuck.push({ a: local, kind: 'plasma', age: 0, seed: Math.random() * 1000, blobs: [], dripT: 0, drip: 0 });
      this.decals.push({ a: local, age: 0, pts: Array.from({ length: 14 }, () => rand(0.75, 1.25)), seed: Math.random() * 1000, kind: 'plasma' });
      this.hits++;
      this.bump = 14;
      this.wheelFlash = 1;
      this.shake = Math.max(this.shake, 15);
      this.plasmaImpact(x, y, 1);
      this.sfx.plasmaHit();
      if (this.hits >= this.total) this.explodeTimer = 0.5;
      this.emit();
      return;
    }
    if (p.w === 'dora') {
      this.stuck.push({ a: local, kind: 'air', age: 0, seed: Math.random() * 1000, blobs: [], dripT: 0, drip: 0 });
      this.decals.push({ a: local, age: 0, pts: Array.from({ length: 12 }, () => rand(0.6, 1.3)), seed: Math.random() * 1000, kind: 'air' });
      this.hits++;
      this.bump = 18;
      this.wheelFlash = 0.8;
      this.shake = Math.max(this.shake, 13);
      this.airBlast(x, y, 1);
      this.sfx.thud();
      if (this.hits >= this.total) this.explodeTimer = 0.5;
      this.emit();
      return;
    }
    const blobs: SubBlob[] = [
      { d: 5, s: 0, r: 11, ph: rand(0, TAU) },
      { d: 13, s: rand(-3, 3), r: 8, ph: rand(0, TAU) },
      { d: 1, s: rand(6, 10), r: 6, ph: rand(0, TAU) },
      { d: 1, s: rand(-10, -6), r: 6, ph: rand(0, TAU) },
      { d: 20, s: rand(-2, 2), r: 4.5, ph: rand(0, TAU) },
    ];
    this.stuck.push({ a: local, kind: 'acid', age: 0, seed: Math.random() * 1000, blobs, dripT: rand(0.5, 1.5), drip: 0 });
    const pts = Array.from({ length: 16 }, () => rand(0.7, 1.25));
    this.decals.push({ a: local, age: 0, pts, seed: Math.random() * 1000, kind: 'acid' });
    this.hits++;
    this.bump = 8;
    this.wheelFlash = 1;
    this.shake = Math.max(this.shake, 7);
    this.splash(x, y, 1);
    this.sfx.splat();
    if (this.hits >= this.total) this.explodeTimer = 0.5;
    this.emit();
  }

  /** singularity bite: implosion (inward rings), then violet/orange burst, wood pulled in */
  voidImpact(x: number, y: number, k: number) {
    this.add({ x, y, kind: 'ring', size: 240 * k, grow: -700, color: VOID.violet, max: 0.3 });
    this.add({ x, y, kind: 'ring', size: 160 * k, grow: -500, color: '#ffffff', max: 0.28 });
    this.add({ x, y, kind: 'flash', size: 200 * k, color: VOID.deep, max: 0.45 });
    this.add({ x, y, kind: 'flash', size: 110 * k, color: VOID.glow, max: 0.3 });
    this.add({ x, y, kind: 'flash', size: 50 * k, color: '#ffffff', max: 0.15 });
    this.add({ x, y, kind: 'flare', size: 320 * k, color: VOID.violet, max: 0.3 });
    this.add({ x, y, kind: 'ring', size: 8, grow: 600 * k, color: VOID.glow, max: 0.4 });
    this.add({ x, y, kind: 'ringE', size: 10, grow: 460 * k, color: '#ffffff', max: 0.35 });
    for (let i = 0; i < 10; i++) this.bolt(x, y, rand(40, 120) * k, rand(0, TAU), i % 2 ? '#ffffff' : VOID.violet, rand(0.12, 0.3));
    // wood pulled in then spat out
    for (let i = 0; i < 40 * k; i++) {
      const a = rand(0, TAU), d = rand(40, 140);
      this.add({ x: x + Math.cos(a) * d, y: y + Math.sin(a) * d, vx: -Math.cos(a) * 500 - Math.sin(a) * 200, vy: -Math.sin(a) * 500 + Math.cos(a) * 200, kind: 'ash', size: rand(3, 7), color: pick(['#d9b47a', '#8a5a2a', '#1c1410']), add: false, vr: rand(-20, 20), g: 0, drag: 0.4, max: rand(0.5, 0.9) });
    }
    this.burst(x, y, 50 * k, 0, Math.PI, 250, 900, { kind: 'spark', size: 1.8, drag: 2.5, max: 0.5 }, ['#ffffff', VOID.core, VOID.glow, VOID.violet]);
    for (let i = 0; i < 24 * k; i++) { const a = rand(0, TAU), d = rand(30, 90); this.add({ x: x + Math.cos(a) * d, y: y + Math.sin(a) * d, vx: -Math.sin(a) * 300, vy: Math.cos(a) * 300, kind: 'ember', size: rand(1, 2.4), color: pick([VOID.glow, VOID.violet, '#ffffff']), max: rand(0.6, 1.1) }); }
    for (let i = 0; i < 12; i++) this.add({ x: x + rand(-24, 24), y: y + rand(0, 14), vx: rand(-80, 80), vy: rand(-40, 60), kind: 'smoke', size: rand(16, 32), grow: 40, color: '#22103f', add: false, max: rand(1.2, 2.2), drag: 1.5, data: 0.6 });
  }

  /** plasma detonation: blinding core flash, triple shockwave, lightning web, molten sparks, smoke */
  plasmaImpact(x: number, y: number, k: number) {
    const down = Math.PI / 2;
    this.add({ x, y, kind: 'flash', size: 260 * k, color: PLASMA.deep, max: 0.4 });
    this.add({ x, y, kind: 'flash', size: 170 * k, color: PLASMA.glow, max: 0.3 });
    this.add({ x, y, kind: 'flash', size: 90 * k, color: '#ffffff', max: 0.16 });
    this.add({ x, y, kind: 'flare', size: 360 * k, color: PLASMA.glow, max: 0.3 });
    this.add({ x, y, kind: 'star', size: 120 * k, color: '#ffffff', max: 0.2 });
    [[520, 0.34, PLASMA.glow], [760, 0.46, '#ffffff'], [1000, 0.6, PLASMA.deep]].forEach(([g, m, col]) =>
      this.add({ x, y, kind: 'ring', size: 8, grow: (g as number) * k, color: col as string, max: m as number }));
    this.add({ x, y, kind: 'ringE', size: 14, grow: 600 * k, color: '#ffffff', max: 0.35 });
    for (let i = 0; i < 12; i++) this.bolt(x, y, rand(50, 140) * k, down + rand(-1.7, 1.7), i % 2 ? '#ffffff' : PLASMA.glow, rand(0.12, 0.3));
    for (let i = 0; i < 5; i++) this.bolt(x, y, rand(40, 90), -down + rand(-0.8, 0.8), PLASMA.glow, rand(0.1, 0.2));
    this.burst(x, y, 60 * k, down, 1.5, 300, 1000, { kind: 'spark', size: 2, drag: 3, g: 500, max: 0.5 }, ['#ffffff', PLASMA.glow, PLASMA.hot]);
    // molten wood embers (orange) mixed with ion sparks
    this.burst(x, y, 30 * k, down, 1.6, 80, 420, { kind: 'ember', size: 2.2, drag: 1.5, g: 200, max: 1.2 }, ['#ffb060', '#ff7030', '#ffd27a']);
    for (let i = 0; i < 12; i++) this.add({ x: x + rand(-40, 40), y: y + rand(-10, 40), kind: 'star', size: rand(12, 26), color: '#e8fdff', max: rand(0.2, 0.4) });
    for (let i = 0; i < 14; i++) this.add({ x: x + rand(-24, 24), y: y + rand(0, 14), vx: rand(-90, 90), vy: rand(-30, 60), kind: 'smoke', size: rand(18, 34), grow: 44, color: '#2a3442', add: false, max: rand(1.2, 2.2), drag: 1.5, data: 0.6 });
    for (let i = 0; i < 20; i++) this.add({ x, y, vx: rand(-380, 380), vy: rand(-480, 80), kind: 'ash', size: rand(3, 7), color: pick(['#1c1410', '#4a3020', '#d9b47a']), add: false, vr: rand(-16, 16), g: 1000, max: rand(0.8, 1.5), data: Math.random() < 0.5 });
  }

  /** compressed-air slam: cartoon puff ring, manga speed lines, wood dust & splinters */
  airBlast(x: number, y: number, k: number) {
    this.add({ x, y, kind: 'flash', size: 160 * k, color: '#ffffff', max: 0.2 });
    this.add({ x, y, kind: 'ring', size: 10, grow: 700 * k, color: '#ffffff', max: 0.32 });
    this.add({ x, y, kind: 'ring', size: 6, grow: 420 * k, color: AIR.glow, max: 0.4 });
    this.add({ x, y, kind: 'ringE', size: 20, grow: 520 * k, color: '#ffffff', max: 0.35 });
    this.add({ x, y, kind: 'speed', size: 240 * k, color: '#ffffff', max: 0.28, data: Math.random() * 1000 });
    this.add({ x, y, kind: 'star', size: 90 * k, color: '#fff4a0', max: 0.22 });
    // puff ring expanding outward (hugging the wheel then rolling away)
    const n = Math.round(22 * k);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + rand(-0.1, 0.1);
      const sp = rand(220, 420) * k;
      this.add({ x: x + Math.cos(a) * 10, y: y + Math.sin(a) * 6, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.6 + 40, kind: 'puff', size: rand(14, 26), grow: 30, color: '#ffffff', add: false, drag: 3, max: rand(0.6, 1.1), rot: rand(0, TAU), vr: rand(-3, 3) });
    }
    for (let i = 0; i < 10; i++) this.add({ x: x + rand(-20, 20), y: y + rand(-5, 10), vx: rand(-60, 60), vy: rand(-40, 40), kind: 'puff', size: rand(22, 40), grow: 36, color: '#f4f8ff', add: false, drag: 2.5, max: rand(0.9, 1.4), rot: rand(0, TAU), vr: rand(-1.5, 1.5) });
    // wood dust + splinters
    for (let i = 0; i < 14; i++) this.add({ x: x + rand(-20, 20), y: y + rand(-10, 5), vx: rand(-120, 120), vy: rand(-60, 60), kind: 'smoke', size: rand(12, 24), grow: 26, color: '#a67c4a', add: false, max: rand(0.8, 1.4), data: 0.45 });
    for (let i = 0; i < 26; i++) this.add({ x, y, vx: rand(-420, 420), vy: rand(-520, 100), kind: 'ash', size: rand(3, 8), color: pick(['#d9b47a', '#9a6a36', '#5a3a1a']), add: false, vr: rand(-18, 18), g: 1100, max: rand(0.8, 1.6) });
    this.burst(x, y, 30, Math.PI / 2, Math.PI, 300, 800, { kind: 'wind', size: 18, max: 0.3, drag: 1.5 }, ['#ffffff']);
    this.add({ x: x + 60 * (Math.random() < 0.5 ? 1 : -1), y: y - 50, vx: 0, vy: -70, kind: 'text', size: 40 * k, color: DORA.yellow, max: 0.8, rot: rand(-0.25, 0.25), data: pick(['DOKAN!', 'BAM!', 'DUARR!']) });
  }

  /** acid splash: flattening pancake + fan of droplets + vapor + bubbles */
  splash(x: number, y: number, k: number) {
    const down = Math.PI / 2;
    this.add({ x, y, kind: 'flash', size: 110 * k, color: ACID.glow, max: 0.28 });
    this.add({ x, y, kind: 'flash', size: 50, color: '#ffffff', max: 0.12 });
    this.add({ x, y, kind: 'ring', size: 8, grow: 260 * k, color: ACID.glow, max: 0.3 });
    // pancake: blobs sliding sideways along the rim then falling
    for (let i = 0; i < 10; i++) {
      const side = i % 2 ? 1 : -1;
      this.drop(x + side * i * 2, y + 2, side * rand(90, 420) * k, rand(-60, 20), rand(4, 8), rand(0.5, 0.9), 1300);
    }
    // main fan of drops (bounce downward/sideways)
    for (let i = 0; i < 48 * k; i++) {
      const a = down + rand(-1.55, 1.55);
      const s = rand(120, 640) * k;
      this.drop(x, y, Math.cos(a) * s, Math.sin(a) * s, rand(1.8, 5.2), rand(0.7, 1.4), 1100);
    }
    // sprays upward (ricochet over the rim)
    for (let i = 0; i < 10; i++) this.drop(x + rand(-10, 10), y, rand(-240, 240), rand(-420, -120), rand(1.5, 3.2), rand(0.5, 1), 1100);
    for (let i = 0; i < 18; i++) this.add({ x: x + rand(-20, 20), y: y + rand(0, 10), vx: rand(-50, 50), vy: rand(-90, -20), kind: 'smoke', size: rand(12, 26), grow: 30, color: pick(['#8fc23a', '#c8ff5a', '#5a7a2a']), add: false, max: rand(1.4, 2.6), data: 0.4 });
    for (let i = 0; i < 14; i++) this.add({ x: x + rand(-18, 18), y: y + rand(-6, 6), vx: rand(-20, 20), vy: rand(-30, 10), kind: 'bubble', size: rand(1.5, 4), grow: 6, color: ACID.core, max: rand(0.3, 0.8) });
    this.burst(x, y, 14, down, 1.6, 100, 400, { kind: 'spark', size: 1.5, drag: 3, g: 700, max: 0.4 }, ['#ffffff', ACID.core]);
  }

  explodeWheel() {
    this.wheelAlive = false;
    const cx = this.cx, cy = this.cy - this.bump;
    const n = 12;
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * TAU, a1 = ((i + 1) / n) * TAU;
      const mid = (a0 + a1) / 2 + this.rot;
      const s = rand(260, 620);
      this.shards.push({ a0, a1, x: cx, y: cy, vx: Math.cos(mid) * s, vy: Math.sin(mid) * s - 250, rot: 0, vr: rand(-6, 6), base: this.rot });
    }
    for (const s of this.stuck) {
      const a = s.a + this.rot;
      const x = cx + Math.cos(a) * (this.R + 10), y = cy + Math.sin(a) * (this.R + 10);
      if (s.kind === 'knife') this.bounces.push({ x, y, vx: Math.cos(a) * rand(300, 600), vy: Math.sin(a) * rand(300, 600) - 300, rot: a, vr: rand(-10, 10), life: 3 });
      else for (let i = 0; i < 8; i++) this.drop(x, y, Math.cos(a) * rand(100, 500) + rand(-100, 100), Math.sin(a) * rand(100, 500) - 200, rand(3, 7), 1.6);
    }
    this.stuck = [];
    this.add({ x: cx, y: cy, kind: 'flash', size: 420, color: ACID.glow, max: 0.5 });
    this.add({ x: cx, y: cy, kind: 'flash', size: 200, color: '#ffffff', max: 0.25 });
    this.add({ x: cx, y: cy, kind: 'ring', size: 20, grow: 900, color: ACID.glow, max: 0.5 });
    this.burst(cx, cy, 120, 0, Math.PI, 300, 1300, { kind: 'spark', size: 2.4, drag: 2, g: 500, max: 0.9 }, ['#ffffff', ACID.glow, '#ffd27a']);
    for (let i = 0; i < 90; i++) { const a = rand(0, TAU), s = rand(150, 850); this.drop(cx, cy, Math.cos(a) * s, Math.sin(a) * s, rand(2.5, 7), rand(1, 1.8)); }
    for (let i = 0; i < 30; i++) this.add({ x: cx + rand(-40, 40), y: cy + rand(-40, 40), vx: rand(-200, 200), vy: rand(-200, 200), kind: 'smoke', size: rand(25, 55), grow: 60, color: '#6a8a3a', add: false, max: rand(1.5, 2.8), drag: 2, data: 0.5 });
    // wood splinters
    for (let i = 0; i < 40; i++) this.add({ x: cx, y: cy, vx: rand(-500, 500), vy: rand(-700, 200), kind: 'ash', size: rand(4, 10), color: pick(['#c9a066', '#8a5a2a', '#5a3a1a']), add: false, vr: rand(-15, 15), g: 900, max: rand(1.5, 2.5) });
    if (this.weapon === 'void') {
      this.collapse = 0;
      this.sfx.voidCollapse();
      this.add({ x: cx, y: cy, kind: 'ring', size: 500, grow: -900, color: VOID.violet, max: 0.6 });
      this.add({ x: cx, y: cy, kind: 'flash', size: 400, color: VOID.deep, max: 0.8 });
      this.endTimer = this.collapseDur + 0.9;
      this.endStatus = 'win';
      this.shake = 14;
      return;
    }
    if (this.weapon === 'pred') {
      this.add({ x: cx, y: cy, kind: 'flash', size: 600, color: PLASMA.glow, max: 0.6 });
      this.add({ x: cx, y: cy, kind: 'flare', size: 900, color: PLASMA.glow, max: 0.45 });
      for (let i = 0; i < 18; i++) this.bolt(cx, cy, rand(120, 280), rand(0, TAU), i % 2 ? '#ffffff' : PLASMA.glow, 0.35);
      this.burst(cx, cy, 80, 0, Math.PI, 300, 1200, { kind: 'ember', size: 2.6, drag: 1.5, g: 500, max: 1.4 }, ['#ffb060', '#ff7030', PLASMA.glow]);
    }
    if (this.weapon === 'dora') {
      for (let i = 0; i < 40; i++) { const a = rand(0, TAU), s = rand(200, 700); this.add({ x: cx, y: cy, vx: Math.cos(a) * s, vy: Math.sin(a) * s, kind: 'puff', size: rand(20, 44), grow: 40, color: '#ffffff', add: false, drag: 2.2, max: rand(1, 1.8), rot: rand(0, TAU), vr: rand(-2, 2) }); }
      this.add({ x: cx, y: cy, kind: 'speed', size: 520, color: '#ffffff', max: 0.5, data: 7 });
      this.add({ x: cx, y: cy - 40, vx: 0, vy: -60, kind: 'text', size: 64, color: DORA.yellow, max: 1.4, rot: -0.12, data: 'DOKAAAN!!' });
    }
    this.shake = 28;
    this.sfx.explode();
    this.endStatus = 'win';
    this.endTimer = 1.4;
  }

  // ---------- fluid (metaball) layer ----------
  collectBlobs() {
    const B: Blob[] = [];
    for (const p of this.projectiles) {
      // squashed head + tapered viscous tail
      B.push({ x: p.x, y: p.y, r: 13 });
      B.push({ x: p.x, y: p.y + 9, r: 11 });
      B.push({ x: p.x + Math.sin(p.t * 40) * 1.5, y: p.y + 19, r: 8.5 });
      p.trail.forEach((tp, i) => {
        if (i < 2) return;
        const k = i / p.trail.length;
        B.push({ x: tp.x + Math.sin(i * 1.7 + p.t * 25) * k * 3, y: tp.y + 24 + i * 3, r: 7.5 * (1 - k) + 1.5 });
      });
    }
    for (const p of this.particles) {
      if (p.kind !== 'acid') continue;
      const k = p.life / p.max;
      const r = p.size * (k < 0.75 ? 1 : 1 - (k - 0.75) / 0.25);
      if (r < 0.6) continue;
      B.push({ x: p.x, y: p.y, r });
      // velocity streak (teardrop)
      const sp = Math.hypot(p.vx, p.vy);
      if (sp > 150 && r > 1.5) {
        const f = Math.min(0.03, 6 / sp);
        B.push({ x: p.x - p.vx * f, y: p.y - p.vy * f, r: r * 0.65 });
      }
    }
    if (this.wheelAlive) {
      const t = this.time;
      for (const s of this.stuck) {
        if (s.kind !== 'acid') continue;
        const a = s.a + this.rot;
        const ca = Math.cos(a), sa = Math.sin(a);
        const cy = this.cy - this.bump;
        const sag = Math.min(1, s.age / 1.2);
        for (const b of s.blobs) {
          const wob = Math.sin(t * 3 + b.ph) * 1.2;
          const d = this.R + b.d * (0.6 + 0.4 * sag) + wob;
          const sd = b.s + Math.cos(t * 2.5 + b.ph) * 0.8;
          B.push({ x: this.cx + ca * d - sa * sd, y: cy + sa * d + ca * sd, r: b.r });
        }
        if (s.drip > 0) {
          const bx = this.cx + ca * (this.R + 8), by = cy + sa * (this.R + 8);
          B.push({ x: bx, y: by + s.drip * 0.5, r: 3.5 });
          B.push({ x: bx, y: by + s.drip, r: 3 + s.drip * 0.12 });
        }
      }
    }
    this.blobs = B;
  }

  renderFluid() {
    const f = this.fctx, s = this.fs, fw = this.fw, fh = this.fh;
    f.setTransform(1, 0, 0, 1, 0, 0);
    f.clearRect(0, 0, fw, fh);
    if (!this.blobs.length) return false;
    f.globalCompositeOperation = 'lighter';
    const spr = blobSprite();
    for (const b of this.blobs) {
      const r = b.r * 1.6 * s;
      if (r < 0.4) continue;
      f.drawImage(spr, b.x * s - r, b.y * s - r, r * 2, r * 2);
    }
    const img = f.getImageData(0, 0, fw, fh);
    const d = img.data, o = this.out.data;
    const T = 92;
    const inv = 1 / (255 - T);
    const w4 = fw * 4;
    for (let i = 0, n = d.length; i < n; i += 4) {
      const a = d[i + 3];
      if (a < T) { o[i + 3] = 0; continue; }
      const v = (a - T) * inv;
      const aa = i >= w4 ? d[i - w4 + 3] : 0;
      const hl = clamp((a - aa - 26) / 70);
      let r: number, g: number, b: number;
      if (v < 0.16) { const k = v / 0.16; r = lerp(48, 128, k); g = lerp(104, 208, k); b = lerp(0, 8, k); }
      else if (v < 0.6) { const k = (v - 0.16) / 0.44; r = lerp(128, 190, k); g = lerp(208, 255, k); b = lerp(8, 40, k); }
      else { const k = (v - 0.6) / 0.4; r = lerp(190, 248, k); g = 255; b = lerp(40, 170, k); }
      const h = hl * 0.75;
      o[i] = r + (255 - r) * h; o[i + 1] = g + (255 - g) * h; o[i + 2] = b + (255 - b) * h;
      o[i + 3] = v < 0.08 ? 150 + (v / 0.08) * 105 : 255;
    }
    this.octx.putImageData(this.out, 0, 0);
    return true;
  }

  // ---------- drawing ----------
  glowAt(x: number, y: number, r: number, color: string, a: number) {
    if (a <= 0.003 || r <= 0) return;
    const c = this.ctx;
    c.globalAlpha = Math.min(1, a);
    c.drawImage(glowSprite(color), x - r, y - r, r * 2, r * 2);
    c.globalAlpha = 1;
  }

  draw() {
    const c = this.ctx;
    const W = this.W, H = this.H;
    c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    c.globalCompositeOperation = 'source-over';
    if (this.bg) c.drawImage(this.bg, 0, 0, W, H);
    c.globalCompositeOperation = 'lighter';
    for (const t of this.twinkles) {
      const a = 0.4 + 0.6 * Math.abs(Math.sin(this.time * 1.5 + t.p));
      this.glowAt(t.x, t.y, t.s * 4, '#bcd4ff', a * 0.6);
    }
    c.globalCompositeOperation = 'source-over';

    c.save();
    if (this.shake > 0.2) c.translate(rand(-1, 1) * this.shake, rand(-1, 1) * this.shake);

    c.globalCompositeOperation = 'lighter';
    const dora = this.weapon === 'dora', pred = this.weapon === 'pred', vd = this.weapon === 'void';
    this.glowAt(this.cx, this.cy, this.R * 2.3, dora ? '#1b4a8a' : pred ? '#0f3a8a' : vd ? '#3a1070' : '#2a6a10', 0.18 + this.wheelFlash * 0.2);
    this.glowAt(this.gx, this.gy - 40, 240, dora ? AIR.glow : pred ? PLASMA.glow : vd ? VOID.violet : ACID.glow, 0.08 + this.glow * 0.25);
    c.globalCompositeOperation = 'source-over';

    if (this.status === 'playing' && this.wheelAlive) {
      c.save();
      c.setLineDash([3, 10]);
      c.lineDashOffset = -this.time * 40;
      c.strokeStyle = rgba(dora ? AIR.glow : pred ? PLASMA.glow : vd ? VOID.violet : ACID.glow, pred ? 0.08 : 0.18);
      c.lineWidth = 2;
      c.beginPath(); c.moveTo(this.gx, this.my - 10); c.lineTo(this.gx, this.cy + this.R + 8); c.stroke();
      c.restore();
    }

    this.drawParticles(false);
    if (this.wheelAlive) this.drawWheel();
    for (const s of this.shards) this.drawShard(s);
    for (const b of this.bounces) {
      c.save(); c.translate(b.x, b.y); c.rotate(b.rot); c.globalAlpha = clamp(b.life * 2);
      this.drawKnife(b.rot - this.rot, 20);
      c.restore();
    }
    c.globalAlpha = 1;

    if (vd) { this.drawVoidGun(); this.drawSingularities(); if (this.collapse >= 0) this.drawCollapse(); } else if (dora) { this.drawAirRings(); this.drawCannon(); } else if (pred) { this.drawCaster(); this.drawPlasmaBolts(); this.drawTriLaser(); } else this.drawHead();

    // ---- acid fluid layer ----
    this.collectBlobs();
    const has = this.renderFluid();
    if (has) {
      // under-glow
      c.globalCompositeOperation = 'lighter';
      let n = 0;
      for (const b of this.blobs) {
        if (b.r < 3) continue;
        if (++n > 160) break;
        this.glowAt(b.x, b.y, b.r * 3.2, '#7dff00', 0.16 + 0.1 * Math.min(1, b.r / 10));
      }
      c.globalCompositeOperation = 'source-over';
      c.imageSmoothingEnabled = true;
      c.drawImage(this.oc, 0, 0, W, H);
      // inner hot glow on big blobs
      c.globalCompositeOperation = 'lighter';
      for (const p of this.projectiles) {
        this.glowAt(p.x, p.y + 4, 34, '#eaff6a', 0.55);
        this.glowAt(p.x - 3, p.y - 3, 9, '#ffffff', 0.9);
      }
      c.globalCompositeOperation = 'source-over';
    }

    this.drawParticles(true);
    this.drawParticles(false, true);
    c.restore();
    if (this.vignette) c.drawImage(this.vignette, 0, 0, W, H);
  }

  drawWheel() {
    const c = this.ctx;
    const R = this.R;
    const img = this.wheelImg!;
    const S = (R + 16) * 2;
    c.save();
    c.translate(this.cx, this.cy - this.bump);
    this.glowAt(6, 14, R * 1.25, '#000000', 0.7);
    c.rotate(this.rot);
    c.drawImage(img, -S / 2, -S / 2, S, S);
    c.save();
    c.beginPath(); c.arc(0, 0, R - 0.5, 0, TAU); c.clip();
    for (const d of this.decals) this.drawDecal(d);
    c.restore();
    if (this.wheelFlash > 0) {
      c.globalCompositeOperation = 'lighter';
      c.globalAlpha = this.wheelFlash * 0.2;
      c.beginPath(); c.arc(0, 0, R, 0, TAU); c.fillStyle = '#c8ff80'; c.fill();
      c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
    }
    for (const s of this.stuck) {
      if (s.kind === 'acid') continue;
      c.save(); c.rotate(s.a); c.translate(R, 0);
      if (s.kind === 'knife') this.drawKnife(s.a, s.age); else if (s.kind === 'plasma') this.drawPlasmaScar(s); else if (s.kind === 'void') this.drawVoidRift(s); else this.drawAirVortex(s);
      c.restore();
    }
    c.restore();
  }

  drawShard(s: Shard) {
    const c = this.ctx;
    const R = this.R;
    const S = (R + 16) * 2;
    c.save();
    c.translate(s.x, s.y);
    if (this.collapse >= 0) {
      const d = Math.hypot(s.x - this.cx, s.y - (this.cy - this.bump));
      const sc = clamp(d / 160, 0.05, 1) * (1 - clamp(this.collapse) * 0.6);
      c.scale(sc, sc);
    }
    c.rotate(s.base + s.rot);
    c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, R, s.a0, s.a1); c.closePath();
    c.save(); c.clip();
    c.drawImage(this.wheelImg!, -S / 2, -S / 2, S, S);
    for (const d of this.decals) this.drawDecal(d);
    c.restore();
    c.strokeStyle = 'rgba(80,45,15,0.9)'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(s.a0) * R, Math.sin(s.a0) * R); c.moveTo(0, 0); c.lineTo(Math.cos(s.a1) * R, Math.sin(s.a1) * R); c.stroke();
    c.restore();
  }

  /** knife in rim frame: blade embedded (-x), handle outward (+x) */
  drawKnife(_a: number, _age: number) {
    const c = this.ctx;
    // blade
    const bg = c.createLinearGradient(0, -5, 0, 5);
    bg.addColorStop(0, '#f4f7fb'); bg.addColorStop(0.45, '#aeb8c6'); bg.addColorStop(0.55, '#7d8796'); bg.addColorStop(1, '#4a525e');
    c.fillStyle = bg;
    c.beginPath(); c.moveTo(-44, 0); c.lineTo(-30, -5.5); c.lineTo(2, -5.5); c.lineTo(2, 5.5); c.lineTo(-30, 5.5); c.closePath(); c.fill();
    c.strokeStyle = 'rgba(20,24,30,0.7)'; c.lineWidth = 0.8; c.stroke();
    c.strokeStyle = 'rgba(255,255,255,0.7)'; c.beginPath(); c.moveTo(-40, -0.5); c.lineTo(0, -3); c.stroke();
    // bolster
    const gg = c.createLinearGradient(0, -8, 0, 8);
    gg.addColorStop(0, '#ffe39a'); gg.addColorStop(0.5, '#c9962e'); gg.addColorStop(1, '#6b4a10');
    c.fillStyle = gg; c.beginPath(); c.roundRect(1, -8, 7, 16, 2); c.fill();
    // handle
    const hg = c.createLinearGradient(0, -6, 0, 6);
    hg.addColorStop(0, '#9a5a2a'); hg.addColorStop(0.5, '#6a3a16'); hg.addColorStop(1, '#3a1e0a');
    c.fillStyle = hg; c.beginPath(); c.roundRect(8, -6, 30, 12, 4); c.fill();
    c.strokeStyle = 'rgba(0,0,0,0.5)'; c.lineWidth = 1; c.stroke();
    c.fillStyle = 'rgba(255,255,255,0.15)'; c.fillRect(10, -4.5, 26, 2);
    for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(14 + i * 9, 0, 1.6, 0, TAU); c.fillStyle = '#e8d8a0'; c.fill(); }
    c.fillStyle = gg; c.beginPath(); c.roundRect(37, -7, 6, 14, 3); c.fill();
  }

  /** corroded hole in wood (wheel frame) */
  drawDecal(d: Decal) {
    const c = this.ctx;
    const t = this.time;
    c.save();
    c.rotate(d.a);
    c.translate(this.R - 14, 0);
    const age = d.age;
    if (d.kind === 'air') { this.drawDent(d); c.restore(); return; }
    if (d.kind === 'plasma') { this.drawPlasmaCrater(d); c.restore(); return; }
    if (d.kind === 'void') { this.drawVoidScorch(d); c.restore(); return; }
    const ease = 1 - Math.pow(1 - clamp(age / 2.5), 3);
    const sc = 0.5 + 0.5 * ease + Math.min(age, 14) * 0.012;
    const path = (k: number) => {
      c.beginPath();
      const n = d.pts.length;
      for (let i = 0; i <= n; i++) {
        const an = (i / n) * TAU;
        const rr = 15 * sc * k * d.pts[i % n];
        const x = Math.cos(an) * rr, y = Math.sin(an) * rr;
        i === 0 ? c.moveTo(x, y) : c.lineTo(x, y);
      }
      c.closePath();
    };
    // scorched wood halo
    const st = c.createRadialGradient(0, 0, 0, 0, 0, 40 * sc);
    st.addColorStop(0, 'rgba(30,20,5,0.8)'); st.addColorStop(0.5, 'rgba(60,40,10,0.45)'); st.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = st; c.beginPath(); c.arc(0, 0, 40 * sc, 0, TAU); c.fill();
    // char rim
    path(1.22); c.fillStyle = 'rgba(25,14,4,0.95)'; c.fill();
    // hole: deep black with greenish acid pooling
    path(1);
    const hg = c.createRadialGradient(0, 0, 0, 0, 0, 15 * sc);
    hg.addColorStop(0, '#0a1a02'); hg.addColorStop(0.6, '#030702'); hg.addColorStop(1, '#1c2e04');
    c.fillStyle = hg; c.fill();
    // bubbling acid inside
    c.globalCompositeOperation = 'lighter';
    const pulse = 0.55 + 0.3 * Math.sin(t * 5 + d.seed);
    const pool = c.createRadialGradient(0, 0, 0, 0, 0, 12 * sc);
    pool.addColorStop(0, rgba('#c8ff3a', 0.55 * pulse)); pool.addColorStop(1, rgba('#4f8f00', 0));
    path(0.85); c.fillStyle = pool; c.fill();
    path(1); c.strokeStyle = rgba('#b6ff1a', pulse); c.lineWidth = 2.2; c.stroke();
    path(1.1); c.strokeStyle = rgba('#f4ff9a', pulse * 0.4); c.lineWidth = 1; c.stroke();
    this.glowAt(0, 0, 30 * sc, '#9aff00', 0.22 + 0.15 * pulse);
    const r = prng(d.seed);
    for (let i = 0; i < 7; i++) {
      const an = r() * TAU, rr = r() * 10 * sc;
      const br = Math.max(0, 1.2 + 1.8 * Math.sin(t * 6 + i * 2.1 + d.seed));
      c.beginPath(); c.arc(Math.cos(an) * rr, Math.sin(an) * rr, br, 0, TAU);
      c.strokeStyle = rgba('#f4ff9a', 0.85); c.lineWidth = 1; c.stroke();
    }
    c.globalCompositeOperation = 'source-over';
    c.restore();
  }

  // ---------- xenomorph head (side profile like a long glossy teardrop, jaws opening up-right) ----------
  drawHead() {
    const c = this.ctx;
    const t = this.time;
    c.save();
    // local frame: throat/mouth center sits at the muzzle point (gx, my)
    c.translate(this.gx - 32, this.my + 74 + this.recoil * 10);
    const jaw = clamp(this.jaw);
    const open = 0.5 + 0.32 * Math.pow(jaw, 0.7); // lower jaw swing (rad)
    const ext = 14 + 66 * Math.pow(jaw, 0.6); // inner jaw extension
    const breath = Math.sin(t * 1.4);
    const H = { x: 32, y: 16 }; // jaw hinge
    const UT = { x: 12, y: -104 }; // upper jaw tip
    const base = Math.atan2(UT.y - H.y, UT.x - H.x); // closed jaw direction
    const ja = base + open; // lower jaw direction
    const bis = base + open / 2; // mouth bisector
    const JL = 126; // lower jaw length
    const LT = { x: H.x + Math.cos(ja) * JL, y: H.y + Math.sin(ja) * JL };

    // ---- green light cone above mouth (spit glow) ----
    if (this.glow > 0.02) {
      c.save();
      c.globalCompositeOperation = 'lighter';
      const cone = c.createLinearGradient(0, -60, 0, -360);
      cone.addColorStop(0, rgba('#9dff1a', 0.35 * this.glow));
      cone.addColorStop(1, rgba('#9dff1a', 0));
      c.fillStyle = cone;
      c.beginPath(); c.moveTo(14, -60); c.lineTo(50, -60); c.lineTo(70, -360); c.lineTo(-6, -360); c.closePath(); c.fill();
      c.restore();
    }

    // ---- hoses on the back ----
    c.lineCap = 'round';
    for (let i = 0; i < 4; i++) {
      const x0 = 36 + i * 5, y0 = 110 + i * 18;
      const path = () => { c.beginPath(); c.moveTo(x0, y0); c.bezierCurveTo(86 + i * 9, 130 + i * 12, 74 + i * 11, 230, 64 + i * 9, 320); };
      path(); c.strokeStyle = '#04060a'; c.lineWidth = 10; c.stroke();
      path(); c.strokeStyle = '#1a222d'; c.lineWidth = 6; c.stroke();
      path(); c.strokeStyle = 'rgba(150,175,210,0.28)'; c.lineWidth = 1.5; c.stroke();
    }

    // ---- segmented neck under the dome ----
    for (let i = 0; i < 6; i++) {
      const y = 222 + i * 15;
      const g = c.createLinearGradient(-50, 0, 50, 0);
      g.addColorStop(0, '#0a0e14'); g.addColorStop(0.45, '#3a4556'); g.addColorStop(1, '#070a0f');
      c.fillStyle = g;
      c.beginPath(); c.ellipse(-2, y, 52 - i, 9, 0, 0, TAU); c.fill();
      c.strokeStyle = 'rgba(0,0,0,0.7)'; c.lineWidth = 1.2; c.stroke();
    }

    // ---- dome / cranium ----
    const domePath = () => {
      c.beginPath();
      c.moveTo(-56, 236);
      c.bezierCurveTo(-80, 130, -74, 20, -48, -56);
      c.bezierCurveTo(-38, -88, -22, -108, -4, -113);
      c.bezierCurveTo(6, -116, 15, -112, UT.x, UT.y);
      c.quadraticCurveTo(16, -40, 26, 10);
      c.bezierCurveTo(42, 60, 54, 140, 50, 236);
      c.closePath();
    };
    const dome = c.createLinearGradient(-76, 0, 54, 0);
    dome.addColorStop(0, '#03040a'); dome.addColorStop(0.28, '#131922'); dome.addColorStop(0.5, '#46536c');
    dome.addColorStop(0.64, '#19202b'); dome.addColorStop(1, '#04060a');
    domePath(); c.fillStyle = dome; c.fill();
    c.strokeStyle = 'rgba(0,0,0,0.9)'; c.lineWidth = 1.5; c.stroke();
    // ribs on the lower half
    c.save(); domePath(); c.clip();
    for (let i = 0; i < 9; i++) {
      const y = 88 + i * 17;
      c.beginPath(); c.moveTo(-80, y); c.quadraticCurveTo(-12, y - 12, 60, y + 4);
      c.strokeStyle = 'rgba(0,0,0,0.55)'; c.lineWidth = 2.2; c.stroke();
      c.beginPath(); c.moveTo(-80, y - 2); c.quadraticCurveTo(-12, y - 14, 60, y + 2);
      c.strokeStyle = 'rgba(160,185,220,0.2)'; c.lineWidth = 1.2; c.stroke();
    }
    // long gloss highlight
    c.fillStyle = 'rgba(190,210,240,0.13)';
    c.beginPath(); c.ellipse(-20, 40, 9, 120, 0.08, 0, TAU); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.22)';
    c.beginPath(); c.ellipse(-26, -40, 3.5, 40, 0.12, 0, TAU); c.fill();
    // rim light along the left edge
    c.beginPath(); c.moveTo(-54, 200); c.bezierCurveTo(-76, 120, -70, 20, -44, -56);
    c.strokeStyle = 'rgba(170,200,240,0.3)'; c.lineWidth = 2; c.stroke();
    c.restore();

    // ---- mouth interior (V between upper tooth line and lower jaw) ----
    const mouthPath = () => { c.beginPath(); c.moveTo(H.x - 4, H.y); c.lineTo(UT.x, UT.y); c.lineTo(LT.x, LT.y); c.closePath(); };
    mouthPath(); c.fillStyle = '#0b0507'; c.fill();
    c.save(); mouthPath(); c.clip();
    const mg = c.createRadialGradient(H.x, H.y - 20, 0, H.x, H.y - 20, 150);
    mg.addColorStop(0, rgba('#c8ff3a', 0.75)); mg.addColorStop(0.45, rgba('#5fbf00', 0.35)); mg.addColorStop(1, rgba('#1a4a00', 0));
    c.fillStyle = mg; c.fillRect(-40, -260, 260, 300);
    // throat ridges
    c.strokeStyle = 'rgba(0,0,0,0.5)'; c.lineWidth = 2;
    for (let i = 1; i < 6; i++) { c.beginPath(); c.arc(H.x, H.y, i * 16, base - 0.2, ja + 0.2); c.stroke(); }
    c.restore();
    c.globalCompositeOperation = 'lighter';
    this.glowAt(H.x + 6, H.y - 50, 60 + this.glow * 40, '#7dff00', 0.35 + this.glow * 0.6);
    c.globalCompositeOperation = 'source-over';

    // ---- inner (pharyngeal) jaw along the bisector ----
    c.save();
    c.translate(H.x + 2, H.y - 4);
    c.rotate(bis + Math.PI / 2);
    const ig = c.createLinearGradient(-8, 0, 8, 0);
    ig.addColorStop(0, '#15101a'); ig.addColorStop(0.5, '#4d3d4a'); ig.addColorStop(1, '#100b12');
    c.fillStyle = ig;
    c.beginPath(); c.roundRect(-7.5, -ext - 2, 15, ext + 24, 6); c.fill();
    c.strokeStyle = 'rgba(0,0,0,0.7)'; c.lineWidth = 1; c.stroke();
    c.strokeStyle = 'rgba(255,255,255,0.1)';
    for (let i = 0; i < 6; i++) { c.beginPath(); c.moveTo(-6, -ext + 6 + i * 9); c.lineTo(6, -ext + 6 + i * 9); c.stroke(); }
    c.fillStyle = 'rgba(200,255,80,0.35)'; c.fillRect(-1.2, -ext, 2.4, ext + 10);
    // tiny toothed mouth
    c.fillStyle = '#2a1a22'; c.beginPath(); c.roundRect(-10, -ext - 12, 20, 12, 4); c.fill();
    c.fillStyle = '#eef1f6';
    for (let i = -3; i <= 3; i++) { c.beginPath(); c.moveTo(i * 2.7 - 1.1, -ext - 12); c.lineTo(i * 2.7, -ext - 19); c.lineTo(i * 2.7 + 1.1, -ext - 12); c.fill(); }
    c.globalCompositeOperation = 'lighter';
    this.glowAt(0, -ext - 14, 14, ACID.glow, 0.5 + this.glow * 0.5);
    c.globalCompositeOperation = 'source-over';
    c.restore();

    // ---- upper teeth (along the dome's right edge) ----
    const ux = UT.x - (H.x - 6), uy = UT.y - (H.y - 6);
    const ul = Math.hypot(ux, uy);
    const udx = ux / ul, udy = uy / ul; // along line (toward tip)
    const unx = -udy, uny = udx; // normal pointing right (into mouth)
    const upperTips: { x: number; y: number }[] = [];
    // gum strip
    c.strokeStyle = '#1c1216'; c.lineWidth = 5;
    c.beginPath(); c.moveTo(H.x - 6, H.y - 6); c.lineTo(UT.x, UT.y); c.stroke();
    for (let i = 0; i < 11; i++) {
      const k = 0.06 + (i / 11) * 0.9;
      const bx = (H.x - 6) + udx * ul * k, by = (H.y - 6) + udy * ul * k;
      const len = 8 + Math.sin(i * 1.4) * 2.5 + (i > 7 ? 3 : 0);
      const tip = { x: bx + unx * len + udx * 2, y: by + uny * len + udy * 2 };
      upperTips.push(tip);
      c.beginPath(); c.moveTo(bx - udx * 3, by - udy * 3); c.lineTo(tip.x, tip.y); c.lineTo(bx + udx * 3, by + udy * 3); c.closePath();
      c.fillStyle = '#eef1f6'; c.fill(); c.strokeStyle = 'rgba(0,0,0,0.35)'; c.lineWidth = 0.6; c.stroke();
    }

    // ---- lower jaw (mandible) swinging to the right ----
    const cj = Math.cos(ja), sj = Math.sin(ja);
    const lowerTips: { x: number; y: number }[] = [];
    c.save();
    c.translate(H.x, H.y);
    c.rotate(ja + Math.PI / 2); // local -y runs along the jaw
    const lg = c.createLinearGradient(-14, 0, 16, 0);
    lg.addColorStop(0, '#0b0f15'); lg.addColorStop(0.42, '#3d4a5e'); lg.addColorStop(0.6, '#161c26'); lg.addColorStop(1, '#04060a');
    c.fillStyle = lg;
    c.beginPath();
    c.moveTo(-13, 8); c.lineTo(-10, -62); c.quadraticCurveTo(-8, -116, 0, -JL - 2);
    c.quadraticCurveTo(11, -116, 15, -62); c.lineTo(17, 8); c.closePath();
    c.fill(); c.strokeStyle = 'rgba(0,0,0,0.9)'; c.lineWidth = 1.4; c.stroke();
    // gloss
    c.fillStyle = 'rgba(190,210,240,0.14)'; c.beginPath(); c.ellipse(4, -60, 3, 48, 0, 0, TAU); c.fill();
    // ribs near base
    c.strokeStyle = 'rgba(0,0,0,0.5)'; c.lineWidth = 1.5;
    for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(-12, -4 - i * 10); c.lineTo(16, -6 - i * 10); c.stroke(); }
    // gum + teeth on the inner (left) edge
    c.strokeStyle = '#1c1216'; c.lineWidth = 4;
    c.beginPath(); c.moveTo(-10, -4); c.lineTo(-6, -112); c.stroke();
    for (let i = 0; i < 11; i++) {
      const y = -12 - i * 9.2;
      const ex = -10 + (i / 11) * 3.5;
      const len = 8 + Math.cos(i * 1.2) * 2.5 + (i < 2 ? 4 : 0);
      c.beginPath(); c.moveTo(ex, y + 3); c.lineTo(ex - len, y - 1); c.lineTo(ex, y - 3); c.closePath();
      c.fillStyle = '#eef1f6'; c.fill(); c.strokeStyle = 'rgba(0,0,0,0.35)'; c.lineWidth = 0.6; c.stroke();
      // tooth tip in head-local coords: local (ex-len, y-1) rotated by (ja+PI/2)
      const lx = ex - len, ly = y - 1;
      const cr = Math.cos(ja + Math.PI / 2), sr = Math.sin(ja + Math.PI / 2);
      lowerTips.push({ x: H.x + lx * cr - ly * sr, y: H.y + lx * sr + ly * cr });
    }
    c.restore();

    // ---- acid strings stretched between the jaws ----
    c.lineCap = 'round';
    for (let i = 1; i < 10; i += 2) {
      const a = upperTips[i], b = lowerTips[Math.min(lowerTips.length - 1, i)];
      if (!a || !b) continue;
      const sag = 10 + i * 2 + Math.sin(t * 3 + i) * 3;
      const mx = (a.x + b.x) / 2, my = Math.max(a.y, b.y) + sag;
      c.strokeStyle = rgba('#c8ff3a', 0.6); c.lineWidth = 1 + (i % 3) * 0.4;
      c.beginPath(); c.moveTo(a.x, a.y); c.quadraticCurveTo(mx, my, b.x, b.y); c.stroke();
      c.globalCompositeOperation = 'lighter';
      this.glowAt(mx, my - sag * 0.3, 6, '#b6ff1a', 0.55);
      c.globalCompositeOperation = 'source-over';
    }
    // strings from inner jaw tip to the lower teeth (like the reference)
    const ijTip = { x: H.x + 2 + Math.cos(bis) * (ext + 12), y: H.y - 4 + Math.sin(bis) * (ext + 12) };
    for (let i = 2; i < 8; i += 2) {
      const b = lowerTips[i];
      c.strokeStyle = rgba('#d8ff5a', 0.5); c.lineWidth = 1;
      c.beginPath(); c.moveTo(ijTip.x, ijTip.y); c.quadraticCurveTo((ijTip.x + b.x) / 2, Math.max(ijTip.y, b.y) + 8, b.x, b.y); c.stroke();
    }

    // ---- drool from the jaw tips ----
    c.globalCompositeOperation = 'lighter';
    const dr = (t * 0.7) % 1;
    this.glowAt(LT.x - 4, LT.y + 10 + dr * 46, 5, '#b6ff1a', 1 - dr);
    this.glowAt(UT.x + 8, UT.y + 12 + ((t * 0.55 + 0.4) % 1) * 46, 4, '#b6ff1a', 0.7);
    // saliva sheen on the lower teeth
    this.glowAt(H.x + cj * 60, H.y + sj * 60, 30, '#7dff00', 0.18 + breath * 0.04);
    c.globalCompositeOperation = 'source-over';
    c.restore();
  }

  // ---------- Doraemon Air Cannon (空気砲) ----------
  drawCannon() {
    const c = this.ctx;
    const t = this.time;
    const rc = this.recoil;
    c.save();
    c.translate(this.gx, this.my + 80 + rc * 26); // barrel bottom-center sits here
    const W = 34; // barrel half width
    const L = 150; // barrel length
    const muzzleRy = 13;

    // ---- Doraemon peeking from bottom-left ----
    c.save();
    c.translate(-118 + rc * 6, 62 + rc * 4);
    const bob = Math.sin(t * 2) * 2;
    // body (partly below screen)
    c.fillStyle = DORA.blue;
    c.beginPath(); c.ellipse(0, 150 + bob, 78, 80, 0, 0, TAU); c.fill();
    c.fillStyle = '#ffffff';
    c.beginPath(); c.ellipse(0, 158 + bob, 52, 56, 0, 0, TAU); c.fill(); // belly
    c.strokeStyle = '#111'; c.lineWidth = 1.6;
    c.beginPath(); c.arc(0, 150 + bob, 34, 0.15, Math.PI - 0.15); c.stroke(); // pocket
    // collar + bell
    c.fillStyle = DORA.red;
    c.beginPath(); c.roundRect(-70, 76 + bob, 140, 12, 6); c.fill();
    const bell = c.createRadialGradient(-4, 90 + bob, 2, 0, 96 + bob, 13);
    bell.addColorStop(0, '#fff2a0'); bell.addColorStop(0.7, DORA.yellow); bell.addColorStop(1, '#b8860b');
    c.fillStyle = bell; c.beginPath(); c.arc(0, 96 + bob, 13, 0, TAU); c.fill();
    c.strokeStyle = '#8a6508'; c.lineWidth = 1.5;
    c.beginPath(); c.moveTo(-12, 93 + bob); c.lineTo(12, 93 + bob); c.moveTo(0, 100 + bob); c.lineTo(0, 108 + bob); c.stroke();
    c.beginPath(); c.arc(0, 100 + bob, 2.5, 0, TAU); c.fillStyle = '#5a4008'; c.fill();
    // head
    const hg = c.createRadialGradient(-24, -30 + bob, 10, 0, 0 + bob, 84);
    hg.addColorStop(0, '#5bc4ff'); hg.addColorStop(0.6, DORA.blue); hg.addColorStop(1, DORA.blueDark);
    c.fillStyle = hg; c.beginPath(); c.arc(0, 0 + bob, 82, 0, TAU); c.fill();
    c.fillStyle = '#ffffff'; c.beginPath(); c.ellipse(0, 14 + bob, 66, 58, 0, 0, TAU); c.fill(); // face
    // eyes
    const squint = rc > 0.45;
    c.fillStyle = '#ffffff'; c.strokeStyle = '#111'; c.lineWidth = 2;
    for (const sx of [-1, 1]) {
      c.beginPath(); c.ellipse(sx * 17, -28 + bob, 17, 22, 0, 0, TAU); c.fill(); c.stroke();
      if (squint) { c.beginPath(); c.moveTo(sx * 8, -30 + bob); c.lineTo(sx * 26, -22 + bob); c.lineWidth = 3; c.stroke(); c.lineWidth = 2; }
      else { c.fillStyle = '#111'; c.beginPath(); c.ellipse(sx * 11, -22 + bob, 4.5, 6, 0, 0, TAU); c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.arc(sx * 12.5, -24 + bob, 1.6, 0, TAU); c.fill(); c.fillStyle = '#ffffff'; }
    }
    // nose
    const ng = c.createRadialGradient(-3, -4 + bob, 1, 0, 0 + bob, 10);
    ng.addColorStop(0, '#ff8a7a'); ng.addColorStop(1, '#c81e14');
    c.fillStyle = ng; c.beginPath(); c.arc(0, -2 + bob, 10, 0, TAU); c.fill();
    c.strokeStyle = '#111'; c.lineWidth = 1.8;
    c.beginPath(); c.moveTo(0, 8 + bob); c.lineTo(0, 40 + bob); c.stroke(); // philtrum
    // mouth (grin when firing)
    c.beginPath();
    if (rc > 0.45) c.ellipse(0, 36 + bob, 30, 16, 0, 0, Math.PI); else c.arc(0, 10 + bob, 42, 0.35, Math.PI - 0.35);
    c.stroke();
    if (rc > 0.45) { c.fillStyle = '#b01818'; c.beginPath(); c.ellipse(0, 36 + bob, 28, 14, 0, 0, Math.PI); c.fill(); }
    // whiskers
    c.lineWidth = 1.6;
    for (const sx of [-1, 1]) for (let i = -1; i <= 1; i++) {
      c.beginPath(); c.moveTo(sx * 18, 14 + i * 11 + bob); c.lineTo(sx * 58, 10 + i * 16 + bob); c.stroke();
    }
    c.restore();

    // ---- arm (blue sleeve) from Doraemon's shoulder into the back of the tube ----
    c.lineCap = 'round';
    const armPath = () => { c.beginPath(); c.moveTo(-66, 150 + rc * 4); c.quadraticCurveTo(-34, 120, -4, 34); };
    armPath(); c.strokeStyle = DORA.blueDark; c.lineWidth = 40; c.stroke();
    armPath(); c.strokeStyle = DORA.blue; c.lineWidth = 32; c.stroke();
    // wrist cuff + round white hand (inside the tube's back)
    c.fillStyle = '#ffffff'; c.beginPath(); c.arc(-2, 26, 22, 0, TAU); c.fill();
    c.strokeStyle = 'rgba(0,0,0,0.25)'; c.lineWidth = 1.5; c.stroke();

    // ---- barrel body ----
    const body = c.createLinearGradient(-W, 0, W, 0);
    body.addColorStop(0, '#0a0b0e'); body.addColorStop(0.22, '#2a2d34'); body.addColorStop(0.42, '#5b6170');
    body.addColorStop(0.5, '#6f7685'); body.addColorStop(0.62, '#3a3e48'); body.addColorStop(1, '#07080a');
    c.fillStyle = body;
    c.beginPath(); c.rect(-W, -L, W * 2, L); c.fill();
    // back rim (bottom ellipse)
    c.beginPath(); c.ellipse(0, 0, W + 3, muzzleRy + 1, 0, 0, Math.PI); c.fillStyle = '#15171c'; c.fill();
    c.beginPath(); c.ellipse(0, 0, W + 3, muzzleRy + 1, 0, 0, TAU); c.strokeStyle = '#0a0b0e'; c.lineWidth = 3; c.stroke();
    // decorative bands
    const band = (y: number, h: number) => {
      const g = c.createLinearGradient(-W, 0, W, 0);
      g.addColorStop(0, '#050608'); g.addColorStop(0.45, '#8a909c'); g.addColorStop(0.55, '#a0a6b2'); g.addColorStop(1, '#050608');
      c.fillStyle = g; c.fillRect(-W - 3, y, W * 2 + 6, h);
      c.beginPath(); c.ellipse(0, y, W + 3, muzzleRy, 0, Math.PI, TAU); c.fillStyle = '#2b2f37'; c.fill();
      c.beginPath(); c.ellipse(0, y + h, W + 3, muzzleRy, 0, 0, Math.PI); c.fillStyle = '#0b0c10'; c.fill();
    };
    band(-26, 8);
    band(-L + 22, 10);
    // specular stripe
    c.fillStyle = 'rgba(255,255,255,0.18)'; c.fillRect(-W * 0.2, -L + 4, 5, L - 8);
    c.fillStyle = 'rgba(255,255,255,0.06)'; c.fillRect(W * 0.35, -L + 4, 3, L - 8);

    // ---- muzzle (flared ring + dark bore) ----
    const my = -L;
    const flare = c.createLinearGradient(-W - 6, 0, W + 6, 0);
    flare.addColorStop(0, '#0a0b0e'); flare.addColorStop(0.4, '#6c7280'); flare.addColorStop(0.55, '#8c93a0'); flare.addColorStop(1, '#0a0b0e');
    c.fillStyle = flare;
    c.beginPath(); c.moveTo(-W, my + 14); c.lineTo(-W - 6, my); c.lineTo(W + 6, my); c.lineTo(W, my + 14); c.closePath(); c.fill();
    const rim = c.createLinearGradient(-W - 6, 0, W + 6, 0);
    rim.addColorStop(0, '#2a2d34'); rim.addColorStop(0.5, '#c9ced8'); rim.addColorStop(1, '#2a2d34');
    c.beginPath(); c.ellipse(0, my, W + 6, muzzleRy + 2, 0, 0, TAU); c.fillStyle = rim; c.fill();
    const bore = c.createRadialGradient(0, my + 2, 2, 0, my, W);
    bore.addColorStop(0, '#000000'); bore.addColorStop(0.7, '#0c0d11'); bore.addColorStop(1, '#2a2d34');
    c.beginPath(); c.ellipse(0, my, W, muzzleRy - 1, 0, 0, TAU); c.fillStyle = bore; c.fill();
    // inner bore rings
    c.strokeStyle = 'rgba(255,255,255,0.1)'; c.lineWidth = 1;
    c.beginPath(); c.ellipse(0, my + 1, W * 0.7, (muzzleRy - 1) * 0.7, 0, 0, TAU); c.stroke();
    c.beginPath(); c.ellipse(0, my + 2, W * 0.4, (muzzleRy - 1) * 0.4, 0, 0, TAU); c.stroke();
    // iron sight on top of the barrel (front)
    c.fillStyle = '#1c1f26'; c.beginPath(); c.roundRect(-4, my + 8, 8, 12, 1.5); c.fill();
    c.fillStyle = '#9aa1ad'; c.fillRect(-1.2, my + 9, 2.4, 6);
    // air shimmer inside bore when charged
    c.globalCompositeOperation = 'lighter';
    const e = 0.2 + this.glow * 0.9;
    this.glowAt(0, my, 40 + this.glow * 40, AIR.glow, e * 0.6);
    this.glowAt(0, my, 14, '#ffffff', e * 0.8);
    // recoil smoke puff at muzzle
    if (rc > 0.1) this.glowAt(0, my - 10, 60 * rc, '#ffffff', rc * 0.35);
    c.globalCompositeOperation = 'source-over';
    c.restore();
  }

  /** flying compressed-air vortex ring with refraction */
  drawAirRings() {
    const c = this.ctx;
    for (const p of this.projectiles) {
      if (p.w !== 'dora') continue;
      const x = p.x, y = p.y;
      const rx = 40, ry = 16;
      // refraction: magnify what's behind the ring
      c.save();
      c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, TAU); c.clip();
      const d = this.dpr, m = 1.14;
      c.drawImage(this.canvas, (x - rx) * d, (y - ry) * d, rx * 2 * d, ry * 2 * d, x - rx * m, y - ry * m, rx * 2 * m, ry * 2 * m);
      c.restore();
      c.save();
      c.beginPath(); c.ellipse(x, y + 8, rx * 0.6, ry * 0.6, 0, 0, TAU); c.clip();
      c.drawImage(this.canvas, (x - rx * 0.6) * d, (y + 8 - ry * 0.6) * d, rx * 1.2 * d, ry * 1.2 * d, x - rx * 0.6 * 0.9, y + 8 - ry * 0.6 * 0.9, rx * 1.2 * 0.9, ry * 1.2 * 0.9);
      c.restore();
      // torus body: translucent white with highlights
      c.save();
      c.globalCompositeOperation = 'lighter';
      this.glowAt(x, y, 70, AIR.glow, 0.25);
      c.restore();
      const wob = Math.sin(p.t * 40) * 1.5;
      c.lineCap = 'round';
      c.strokeStyle = 'rgba(255,255,255,0.22)'; c.lineWidth = 12;
      c.beginPath(); c.ellipse(x, y, rx + wob, ry, 0, 0, TAU); c.stroke();
      c.strokeStyle = 'rgba(255,255,255,0.85)'; c.lineWidth = 3;
      c.beginPath(); c.ellipse(x, y, rx + wob, ry, 0, 0, TAU); c.stroke();
      c.strokeStyle = 'rgba(159,220,255,0.7)'; c.lineWidth = 1.5;
      c.beginPath(); c.ellipse(x, y, rx + 8 + wob, ry + 4, 0, 0, TAU); c.stroke();
      c.strokeStyle = 'rgba(255,255,255,0.5)'; c.lineWidth = 1.5;
      c.beginPath(); c.ellipse(x, y, rx - 9, ry - 5, 0, 0, TAU); c.stroke();
      // vortex curls spinning around the torus
      for (let i = 0; i < 6; i++) {
        const a = p.t * 18 + (i / 6) * TAU;
        const px = x + Math.cos(a) * rx, py = y + Math.sin(a) * ry;
        c.strokeStyle = 'rgba(255,255,255,0.7)'; c.lineWidth = 2;
        c.beginPath(); c.arc(px, py, 6, a, a + 3.5); c.stroke();
      }
      // speed lines trailing
      c.strokeStyle = 'rgba(255,255,255,0.35)'; c.lineWidth = 2;
      for (let i = 0; i < 7; i++) {
        const lx = x + (i - 3) * 13 + Math.sin(p.t * 50 + i) * 2;
        const len = 30 + (3 - Math.abs(i - 3)) * 18;
        c.beginPath(); c.moveTo(lx, y + 14); c.lineTo(lx, y + 14 + len); c.stroke();
      }
    }
  }

  /** residual spinning air vortex stuck at the rim (rim frame: +x outward) */
  drawAirVortex(s: Stuck) {
    const c = this.ctx;
    const t = this.time;
    const pop = 1 + Math.max(0, 0.6 - s.age) * 1.2;
    c.save();
    c.translate(10, 0);
    c.scale(pop, pop);
    c.globalCompositeOperation = 'lighter';
    this.glowAt(6, 0, 30, AIR.glow, 0.35);
    c.globalCompositeOperation = 'source-over';
    c.lineCap = 'round';
    // rotating torus ring (seen edge-on, rotating around outward axis)
    for (let k = 0; k < 3; k++) {
      const ph = t * 6 + k * 2.1 + s.seed;
      const ry = 16 - k * 3, rxx = 5 + Math.abs(Math.sin(ph)) * 3;
      c.strokeStyle = `rgba(255,255,255,${0.85 - k * 0.22})`;
      c.lineWidth = 2.5 - k * 0.6;
      c.beginPath(); c.ellipse(4 + k * 6, 0, rxx, ry, 0, 0, TAU); c.stroke();
    }
    // curls
    for (let i = 0; i < 4; i++) {
      const a = t * 5 + (i / 4) * TAU + s.seed;
      const px = 8 + Math.cos(a) * 6, py = Math.sin(a) * 17;
      c.strokeStyle = 'rgba(200,235,255,0.8)'; c.lineWidth = 1.6;
      c.beginPath(); c.arc(px, py, 4, a, a + 3.6); c.stroke();
    }
    // small impact star at the rim
    const sa = Math.max(0, 1 - s.age / 0.5);
    if (sa > 0) {
      c.fillStyle = rgba('#fff4a0', sa);
      c.beginPath();
      for (let i = 0; i < 16; i++) { const an = (i / 16) * TAU; const r = i % 2 ? 6 : 16 * (1 + s.age * 2); i ? c.lineTo(-4 + Math.cos(an) * r, Math.sin(an) * r) : c.moveTo(-4 + r, 0); }
      c.closePath(); c.fill();
    }
    c.restore();
  }

  /** compressed wood dent with radial cracks (wheel frame, already translated to rim-14) */
  drawDent(d: Decal) {
    const c = this.ctx;
    const r = prng(d.seed);
    const grow = 1 - Math.pow(1 - clamp(d.age / 0.25), 2);
    c.save();
    c.scale(grow, grow);
    // crushed fibers (darker, concave shading)
    const g = c.createRadialGradient(-4, 0, 0, 0, 0, 26);
    g.addColorStop(0, 'rgba(60,35,10,0.95)'); g.addColorStop(0.55, 'rgba(90,55,20,0.6)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g;
    c.beginPath();
    const n = d.pts.length;
    for (let i = 0; i <= n; i++) { const an = (i / n) * TAU; const rr = 22 * d.pts[i % n]; i ? c.lineTo(Math.cos(an) * rr, Math.sin(an) * rr) : c.moveTo(rr, 0); }
    c.closePath(); c.fill();
    // highlight rim on the far side (light from top-left)
    c.strokeStyle = 'rgba(255,230,180,0.35)'; c.lineWidth = 1.5;
    c.beginPath(); c.arc(0, 0, 20, 0.6, 2.6); c.stroke();
    // radial cracks
    c.lineCap = 'round';
    for (let i = 0; i < 9; i++) {
      const a = r() * TAU;
      let x = Math.cos(a) * 6, y = Math.sin(a) * 6;
      c.beginPath(); c.moveTo(x, y);
      const segs = 3 + Math.floor(r() * 3);
      for (let k = 0; k < segs; k++) { x += Math.cos(a + (r() - 0.5) * 0.9) * (8 + r() * 8); y += Math.sin(a + (r() - 0.5) * 0.9) * (8 + r() * 8); c.lineTo(x, y); }
      c.strokeStyle = 'rgba(35,18,4,0.9)'; c.lineWidth = 2.2 - (i % 3) * 0.5; c.stroke();
      c.strokeStyle = 'rgba(240,210,150,0.35)'; c.lineWidth = 0.8; c.stroke();
    }
    // splinter flaps
    c.fillStyle = '#d9b47a';
    for (let i = 0; i < 5; i++) {
      const a = r() * TAU, rr = 14 + r() * 8;
      c.save(); c.translate(Math.cos(a) * rr, Math.sin(a) * rr); c.rotate(a);
      c.beginPath(); c.moveTo(0, -2); c.lineTo(9 + r() * 6, 0); c.lineTo(0, 2); c.closePath(); c.fill();
      c.restore();
    }
    c.restore();
  }

  // ---------- Black Hole Shooter ----------
  /** draws a lensed black hole at (x,y): background is warped around the horizon, accretion disc, photon ring */
  drawBlackHole(x: number, y: number, r: number, t: number, intensity = 1) {
    const c = this.ctx;
    const d = this.dpr;
    const can = this.canvas;
    const lens = r * 3.2;
    // gravitational lensing: sample backdrop in rings and pull inward (stronger near horizon)
    const steps = 6;
    for (let i = steps; i >= 1; i--) {
      const ro = (lens * i) / steps;
      const ri = (lens * (i - 1)) / steps;
      const k = i / steps; // 1 = outer
      const mag = 1 + (1 - k) * (1 - k) * 0.9 * intensity; // inner rings magnified more
      c.save();
      c.beginPath(); c.arc(x, y, ro, 0, TAU); c.arc(x, y, Math.max(0, ri), 0, TAU, true); c.clip();
      const sx = Math.max(0, (x - ro * mag) * d), sy = Math.max(0, (y - ro * mag) * d);
      const sw = Math.min(can.width - sx, ro * 2 * mag * d), sh = Math.min(can.height - sy, ro * 2 * mag * d);
      if (sw > 0 && sh > 0) {
        c.translate(x, y); c.rotate((1 - k) * 0.35 * intensity); c.translate(-x, -y);
        c.drawImage(can, sx, sy, sw, sh, x - ro, y - ro, ro * 2, ro * 2);
      }
      c.restore();
    }
    // accretion disc (tilted ellipse), additive
    c.save();
    c.translate(x, y);
    c.globalCompositeOperation = 'lighter';
    this.glowAt(0, 0, r * 4.2, VOID.deep, 0.35 * intensity);
    c.rotate(-0.35);
    const discR = r * 2.4, discE = 0.32;
    // back half of disc (behind the hole)
    const disc = (from: number, to: number, alpha: number) => {
      for (let i = 0; i < 3; i++) {
        const rr = discR * (0.72 + i * 0.16);
        const g = c.createLinearGradient(-rr, 0, rr, 0);
        g.addColorStop(0, rgba(VOID.violet, 0));
        g.addColorStop(0.25, rgba(VOID.glow, alpha * 0.8));
        g.addColorStop(0.5, rgba(VOID.core, alpha));
        g.addColorStop(0.75, rgba(VOID.glow, alpha * 0.8));
        g.addColorStop(1, rgba(VOID.violet, 0));
        c.strokeStyle = g; c.lineWidth = r * (0.5 - i * 0.1);
        c.beginPath(); c.ellipse(0, 0, rr, rr * discE, 0, from, to); c.stroke();
      }
      // doppler bright spot rotating
      const a = t * 5;
      if ((a % TAU) >= from && (a % TAU) <= to) {
        const px = Math.cos(a) * discR * 0.88, py = Math.sin(a) * discR * 0.88 * discE;
        this.glowAt(px, py, r * 0.9, '#ffffff', alpha);
      }
    };
    disc(Math.PI, TAU, 0.9 * intensity);
    c.restore();
    // event horizon (pure black) with thin photon ring
    c.save();
    c.translate(x, y);
    c.globalCompositeOperation = 'source-over';
    const hg = c.createRadialGradient(0, 0, r * 0.6, 0, 0, r * 1.25);
    hg.addColorStop(0, '#000000'); hg.addColorStop(0.8, '#000000'); hg.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = hg; c.beginPath(); c.arc(0, 0, r * 1.25, 0, TAU); c.fill();
    c.globalCompositeOperation = 'lighter';
    c.strokeStyle = rgba(VOID.core, 0.95 * intensity); c.lineWidth = 1.6;
    c.beginPath(); c.arc(0, 0, r * 1.02, 0, TAU); c.stroke();
    c.strokeStyle = rgba(VOID.glow, 0.5 * intensity); c.lineWidth = 4;
    c.beginPath(); c.arc(0, 0, r * 1.08, 0, TAU); c.stroke();
    // front half of disc
    c.rotate(-0.35);
    disc(0, Math.PI, 0.95 * intensity);
    // lensed top arc (light from the back of the disc bent over the top)
    c.strokeStyle = rgba(VOID.glow, 0.55 * intensity); c.lineWidth = r * 0.22;
    c.beginPath(); c.ellipse(0, 0, r * 1.4, r * 1.4, 0, Math.PI + 0.4, TAU - 0.4); c.stroke();
    c.strokeStyle = rgba(VOID.core, 0.6 * intensity); c.lineWidth = r * 0.08;
    c.beginPath(); c.ellipse(0, 0, r * 1.32, r * 1.32, 0, Math.PI + 0.5, TAU - 0.5); c.stroke();
    c.restore();
  }

  drawSingularities() {
    for (const p of this.projectiles) {
      if (p.w !== 'void') continue;
      const pulse = 1 + Math.sin(p.t * 30) * 0.06;
      this.drawBlackHole(p.x, p.y, 16 * pulse, p.t + p.wob, 1);
      // relativistic jets along travel axis
      const c = this.ctx;
      c.save(); c.globalCompositeOperation = 'lighter';
      const jet = (dir: number) => {
        const g = c.createLinearGradient(0, p.y, 0, p.y + dir * 110);
        g.addColorStop(0, rgba('#ffffff', 0.9)); g.addColorStop(0.3, rgba(VOID.violet, 0.5)); g.addColorStop(1, rgba(VOID.deep, 0));
        c.fillStyle = g;
        c.beginPath(); c.moveTo(p.x - 4, p.y); c.lineTo(p.x - 1, p.y + dir * 110); c.lineTo(p.x + 1, p.y + dir * 110); c.lineTo(p.x + 4, p.y); c.closePath(); c.fill();
      };
      jet(1); jet(-1);
      c.restore();
    }
  }

  drawCollapse() {
    const k = clamp(this.collapse);
    const cx = this.cx, cy = this.cy - this.bump;
    const r = 10 + Math.sin(k * Math.PI) * 60 + k * 20;
    this.drawBlackHole(cx, cy, r, this.time, 1 + k);
    const c = this.ctx;
    c.save(); c.globalCompositeOperation = 'lighter';
    // infalling streaks
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * TAU + this.time * 2;
      const d0 = 120 + ((i * 37 + this.time * 500) % 300);
      const d1 = d0 - 50;
      c.strokeStyle = rgba(i % 2 ? VOID.glow : VOID.violet, 0.5); c.lineWidth = 1.5;
      c.beginPath(); c.moveTo(cx + Math.cos(a) * d0, cy + Math.sin(a) * d0); c.lineTo(cx + Math.cos(a + 0.15) * d1, cy + Math.sin(a + 0.15) * d1); c.stroke();
    }
    c.restore();
  }

  /** the shooter: a ring-accelerator cannon with a contained singularity core */
  drawVoidGun() {
    const c = this.ctx;
    const t = this.time;
    const rc = this.recoil;
    const spin = this.ringSpin;
    c.save();
    c.translate(this.gx, this.my - 80 + rc * 16); // origin = muzzle focus
    const metal = (x0: number, x1: number, dark = false) => {
      const g = c.createLinearGradient(x0, 0, x1, 0);
      if (dark) { g.addColorStop(0, '#0a0810'); g.addColorStop(0.45, '#2a2238'); g.addColorStop(0.55, '#352b46'); g.addColorStop(1, '#07060b'); }
      else { g.addColorStop(0, '#120f1a'); g.addColorStop(0.18, '#4a4060'); g.addColorStop(0.42, '#b8aed0'); g.addColorStop(0.52, '#e8e2f6'); g.addColorStop(0.72, '#6a5f84'); g.addColorStop(1, '#0d0b14'); }
      return g;
    };
    const edge = (a = 0.9) => { c.strokeStyle = `rgba(0,0,0,${a})`; c.lineWidth = 1.5; c.stroke(); };
    const seg = (y0: number, y1: number, hw: number, r = 4, dark = false) => { c.beginPath(); c.roundRect(-hw, y0, hw * 2, y1 - y0, r); c.fillStyle = metal(-hw, hw, dark); c.fill(); edge(); };
    const groove = (y: number, hw: number) => {
      c.strokeStyle = 'rgba(0,0,0,0.75)'; c.lineWidth = 2; c.beginPath(); c.moveTo(-hw, y); c.lineTo(hw, y); c.stroke();
      c.strokeStyle = 'rgba(255,255,255,0.25)'; c.lineWidth = 1; c.beginPath(); c.moveTo(-hw + 2, y + 2); c.lineTo(hw - 2, y + 2); c.stroke();
    };
    const vLine = (x: number, y0: number, y1: number, a: number) => {
      c.globalCompositeOperation = 'lighter';
      c.strokeStyle = rgba(VOID.violet, a); c.lineWidth = 2; c.beginPath(); c.moveTo(x, y0); c.lineTo(x, y1); c.stroke();
      c.globalCompositeOperation = 'source-over';
    };

    // ---- base: anti-grav pedestal ----
    c.beginPath(); c.moveTo(-90, 330); c.lineTo(-70, 280); c.lineTo(70, 280); c.lineTo(90, 330); c.closePath(); c.fillStyle = metal(-90, 90, true); c.fill(); edge();
    seg(262, 284, 44, 6);
    groove(272, 44);
    // floating stabilizer rings around the stem
    for (let i = 0; i < 3; i++) {
      const y = 246 - i * 16 + Math.sin(t * 2 + i) * 2;
      c.strokeStyle = rgba(VOID.violet, 0.6); c.lineWidth = 2;
      c.beginPath(); c.ellipse(0, y, 34 - i * 4, 8 - i, 0, 0, TAU); c.stroke();
    }
    // stem
    seg(150, 262, 16, 5);
    groove(180, 16); groove(230, 16);
    vLine(0, 155, 258, 0.6 + 0.3 * Math.sin(t * 8));
    // cables
    c.lineCap = 'round';
    for (let i = 0; i < 4; i++) {
      const sx = -14 - i * 2, ex = -44 - i * 9;
      const p = () => { c.beginPath(); c.moveTo(sx, 160); c.bezierCurveTo(sx - 26, 190, ex - 6, 230, ex, 280); };
      p(); c.strokeStyle = '#06050a'; c.lineWidth = 7; c.stroke();
      p(); c.strokeStyle = i === 1 ? '#5a1a8a' : '#241d30'; c.lineWidth = 4.5; c.stroke();
      p(); c.strokeStyle = 'rgba(255,255,255,0.18)'; c.lineWidth = 1; c.stroke();
    }

    // ---- containment chamber: spherical core housing ----
    c.save(); c.translate(0, 112);
    const sg = c.createRadialGradient(-14, -14, 4, 0, 0, 46);
    sg.addColorStop(0, '#cfc6e4'); sg.addColorStop(0.5, '#4a3f64'); sg.addColorStop(1, '#0d0a14');
    c.beginPath(); c.arc(0, 0, 46, 0, TAU); c.fillStyle = sg; c.fill(); edge();
    // window into the core (contained mini black hole)
    c.beginPath(); c.arc(0, 0, 28, 0, TAU); c.fillStyle = '#05030a'; c.fill();
    c.strokeStyle = '#a89cc8'; c.lineWidth = 3; c.stroke();
    c.save(); c.beginPath(); c.arc(0, 0, 26, 0, TAU); c.clip();
    c.globalCompositeOperation = 'lighter';
    this.glowAt(0, 0, 30, VOID.deep, 0.8);
    c.rotate(spin * 1.5);
    for (let i = 0; i < 3; i++) {
      c.strokeStyle = rgba(i === 1 ? VOID.core : VOID.glow, 0.8); c.lineWidth = 2.5 - i * 0.5;
      c.beginPath(); c.ellipse(0, 0, 18 - i * 4, (18 - i * 4) * 0.4, i * 1.1, 0, TAU); c.stroke();
    }
    c.restore();
    c.fillStyle = '#000'; c.beginPath(); c.arc(0, 0, 7, 0, TAU); c.fill();
    c.globalCompositeOperation = 'lighter';
    c.strokeStyle = VOID.core; c.lineWidth = 1.2; c.beginPath(); c.arc(0, 0, 7.5, 0, TAU); c.stroke();
    c.globalCompositeOperation = 'source-over';
    // frame struts over the window
    c.strokeStyle = '#1a1424'; c.lineWidth = 4;
    for (let i = 0; i < 3; i++) { const a = (i / 3) * TAU + 0.5; c.beginPath(); c.moveTo(Math.cos(a) * 27, Math.sin(a) * 27); c.lineTo(Math.cos(a) * 46, Math.sin(a) * 46); c.stroke(); }
    // bolts
    for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; const x = Math.cos(a) * 40, y = Math.sin(a) * 40; const g = c.createRadialGradient(x - 1, y - 1, 0, x, y, 2.6); g.addColorStop(0, '#fff'); g.addColorStop(1, '#2a2238'); c.fillStyle = g; c.beginPath(); c.arc(x, y, 2.6, 0, TAU); c.fill(); }
    c.restore();

    // ---- barrel: ring accelerator ----
    seg(-4, 70, 14, 3);
    groove(20, 14); groove(44, 14);
    vLine(0, 0, 66, 0.5 + this.glow * 0.5);
    // side conduits
    for (const sx of [-1, 1]) { c.beginPath(); c.roundRect(sx * 22 - 5, 10, 10, 56, 4); c.fillStyle = metal(sx * 22 - 5, sx * 22 + 5, true); c.fill(); edge(); }
    // floating accelerator rings (spin + bob), larger toward the muzzle
    for (let i = 0; i < 5; i++) {
      const y = 62 - i * 17 + Math.sin(t * 3 + i * 1.3) * 1.5;
      const rw = 18 + i * 5, rh = rw * 0.3;
      const rot = spin * (1 + i * 0.3) + i;
      c.save(); c.translate(0, y);
      // back half
      c.strokeStyle = '#1a1424'; c.lineWidth = 6; c.beginPath(); c.ellipse(0, 0, rw, rh, 0, Math.PI, TAU); c.stroke();
      c.strokeStyle = metal(-rw, rw); c.lineWidth = 4; c.beginPath(); c.ellipse(0, 0, rw, rh, 0, Math.PI, TAU); c.stroke();
      // energy node orbiting
      c.globalCompositeOperation = 'lighter';
      const nx = Math.cos(rot) * rw, ny = Math.sin(rot) * rh;
      this.glowAt(nx, ny, 7 + this.glow * 6, VOID.violet, 0.9);
      this.glowAt(nx, ny, 2.5, '#ffffff', 1);
      c.strokeStyle = rgba(VOID.violet, 0.35 + this.glow * 0.5); c.lineWidth = 1.5; c.beginPath(); c.ellipse(0, 0, rw + 2, rh + 1, 0, 0, TAU); c.stroke();
      c.globalCompositeOperation = 'source-over';
      // front half
      c.strokeStyle = '#1a1424'; c.lineWidth = 6; c.beginPath(); c.ellipse(0, 0, rw, rh, 0, 0, Math.PI); c.stroke();
      c.strokeStyle = metal(-rw, rw); c.lineWidth = 4; c.beginPath(); c.ellipse(0, 0, rw, rh, 0, 0, Math.PI); c.stroke();
      c.restore();
    }
    // muzzle focus: 4 prongs converging + contained micro-hole
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * TAU + Math.PI / 4;
      c.save(); c.translate(Math.cos(a) * 26, Math.sin(a) * 9); c.rotate(Math.atan2(-Math.sin(a) * 9, -Math.cos(a) * 26));
      c.beginPath(); c.moveTo(0, -4); c.lineTo(14, -1.5); c.lineTo(14, 1.5); c.lineTo(0, 4); c.closePath(); c.fillStyle = metal(0, 14); c.fill(); edge();
      c.restore();
    }
    c.globalCompositeOperation = 'lighter';
    const idle = 0.5 + 0.5 * Math.sin(t * 2.5);
    const e = 0.35 + idle * 0.15 + this.glow;
    this.glowAt(0, -2, 40 + this.glow * 50, VOID.deep, e * 0.6);
    this.glowAt(0, -2, 16 + this.glow * 20, VOID.violet, e);
    c.globalCompositeOperation = 'source-over';
    // tiny idle black hole at the focus
    c.fillStyle = '#000'; c.beginPath(); c.arc(0, -2, 5 + this.glow * 4, 0, TAU); c.fill();
    c.globalCompositeOperation = 'lighter';
    c.strokeStyle = rgba(VOID.core, 0.9); c.lineWidth = 1.3; c.beginPath(); c.arc(0, -2, 5.5 + this.glow * 4, 0, TAU); c.stroke();
    c.save(); c.translate(0, -2); c.rotate(-0.35);
    c.strokeStyle = rgba(VOID.glow, 0.8); c.lineWidth = 2; c.beginPath(); c.ellipse(0, 0, 12 + this.glow * 8, 4 + this.glow * 2, 0, 0, TAU); c.stroke();
    c.restore();
    c.globalCompositeOperation = 'source-over';
    c.restore();
  }

  /** rim marker: a small rift (torn space) with a black core and violet edges */
  drawVoidRift(s: Stuck) {
    const c = this.ctx;
    const t = this.time;
    const pop = 1 + Math.max(0, 0.4 - s.age) * 1.5;
    c.save();
    c.translate(10, 0);
    c.scale(pop, pop);
    c.globalCompositeOperation = 'lighter';
    this.glowAt(0, 0, 30, VOID.deep, 0.6);
    this.glowAt(0, 0, 14, VOID.violet, 0.5 + 0.3 * Math.sin(t * 6 + s.seed));
    c.globalCompositeOperation = 'source-over';
    // rift: jagged black slit
    c.beginPath(); c.moveTo(-6, -14); c.quadraticCurveTo(8, -6, 4, 0); c.quadraticCurveTo(10, 8, -4, 15); c.quadraticCurveTo(-1, 4, -7, 0); c.quadraticCurveTo(-2, -6, -6, -14); c.closePath();
    c.fillStyle = '#000'; c.fill();
    c.globalCompositeOperation = 'lighter';
    c.strokeStyle = rgba(VOID.violet, 0.9); c.lineWidth = 1.5; c.stroke();
    c.strokeStyle = rgba(VOID.core, 0.6); c.lineWidth = 0.7; c.stroke();
    // orbiting debris ring
    const rr = 16 + Math.sin(t * 3 + s.seed) * 2;
    c.strokeStyle = rgba(VOID.glow, 0.6); c.lineWidth = 1.2;
    c.beginPath(); c.ellipse(0, 0, rr, rr * 0.35, t * 0.7 + s.seed, 0, TAU); c.stroke();
    for (let i = 0; i < 3; i++) {
      const a = t * 4 + (i / 3) * TAU + s.seed;
      this.glowAt(Math.cos(a) * rr, Math.sin(a) * rr * 0.35, 3, '#ffffff', 0.8);
    }
    c.restore();
  }

  /** wood sucked into a point: spiral grain distortion, dark center, violet scorch */
  drawVoidScorch(d: Decal) {
    const c = this.ctx;
    const t = this.time;
    const grow = 1 - Math.pow(1 - clamp(d.age / 0.35), 2);
    c.save();
    c.scale(grow, grow);
    const halo = c.createRadialGradient(0, 0, 0, 0, 0, 40);
    halo.addColorStop(0, 'rgba(0,0,0,0.95)'); halo.addColorStop(0.35, 'rgba(20,8,40,0.7)'); halo.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = halo; c.beginPath(); c.arc(0, 0, 40, 0, TAU); c.fill();
    // spiral grain pulled inward
    c.lineCap = 'round';
    const r = prng(d.seed);
    for (let i = 0; i < 7; i++) {
      const a0 = r() * TAU;
      c.beginPath();
      for (let k = 0; k <= 12; k++) { const rr = 6 + k * 2.6; const a = a0 + k * 0.22; k ? c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : c.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); }
      c.strokeStyle = 'rgba(30,14,6,0.9)'; c.lineWidth = 1.8; c.stroke();
      c.strokeStyle = rgba(VOID.violet, 0.3); c.lineWidth = 0.8; c.stroke();
    }
    // black pit
    c.beginPath();
    const n = d.pts.length;
    for (let i = 0; i <= n; i++) { const an = (i / n) * TAU; const rr = 9 * d.pts[i % n]; i ? c.lineTo(Math.cos(an) * rr, Math.sin(an) * rr) : c.moveTo(rr, 0); }
    c.closePath(); c.fillStyle = '#000'; c.fill();
    c.globalCompositeOperation = 'lighter';
    const pulse = 0.5 + 0.5 * Math.sin(t * 5 + d.seed);
    c.strokeStyle = rgba(VOID.violet, 0.5 + pulse * 0.4); c.lineWidth = 1.5; c.stroke();
    this.glowAt(0, 0, 22, VOID.deep, 0.3 + pulse * 0.2);
    c.restore();
  }

  // ---------- Predator Shoulder Plasma Caster ----------
  /** aim point on the wheel's bottom rim (world) */
  aimPoint() { return { x: this.cx, y: this.cy - this.bump + this.R }; }

  drawCaster() {
    const c = this.ctx;
    const t = this.time;
    const rc = this.recoil;
    const ch = this.charge >= 0 ? clamp(this.charge) : 0;
    const sv = this.servo;
    c.save();
    c.translate(this.gx, this.my - 60 + rc * 14); // origin = muzzle

    // ---- helpers ----
    const metal = (x0: number, x1: number, tone = 0) => {
      const g = c.createLinearGradient(x0, 0, x1, 0);
      if (tone === 1) { g.addColorStop(0, '#0d1014'); g.addColorStop(0.4, '#363d47'); g.addColorStop(0.55, '#454d58'); g.addColorStop(1, '#0a0c10'); }
      else if (tone === 2) { g.addColorStop(0, '#2a2f37'); g.addColorStop(0.5, '#6b747f'); g.addColorStop(1, '#1a1e24'); }
      else { g.addColorStop(0, '#171b21'); g.addColorStop(0.16, '#525a66'); g.addColorStop(0.4, '#bfc7d0'); g.addColorStop(0.52, '#e9edf2'); g.addColorStop(0.72, '#737c88'); g.addColorStop(1, '#101316'); }
      return g;
    };
    const edge = (a = 0.9, w = 1.5) => { c.strokeStyle = `rgba(0,0,0,${a})`; c.lineWidth = w; c.stroke(); };
    const poly = (pts: number[][], fill: CanvasGradient | string) => {
      c.beginPath(); pts.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]))); c.closePath(); c.fillStyle = fill; c.fill(); edge();
    };
    const seg = (y0: number, y1: number, hw: number, r = 3, tone = 0) => {
      c.beginPath(); c.roundRect(-hw, y0, hw * 2, y1 - y0, r); c.fillStyle = metal(-hw, hw, tone); c.fill(); edge();
    };
    const groove = (y: number, hw: number, x = 0) => {
      c.strokeStyle = 'rgba(0,0,0,0.75)'; c.lineWidth = 2; c.beginPath(); c.moveTo(x - hw, y); c.lineTo(x + hw, y); c.stroke();
      c.strokeStyle = 'rgba(255,255,255,0.3)'; c.lineWidth = 1; c.beginPath(); c.moveTo(x - hw + 2, y + 2); c.lineTo(x + hw - 2, y + 2); c.stroke();
    };
    const rivet = (x: number, y: number, r = 2.4) => {
      const g = c.createRadialGradient(x - r * 0.4, y - r * 0.4, 0, x, y, r);
      g.addColorStop(0, '#ffffff'); g.addColorStop(0.55, '#8c949e'); g.addColorStop(1, '#1f2328');
      c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
    };
    const hexBolt = (x: number, y: number, r: number) => {
      c.beginPath(); for (let k = 0; k < 6; k++) { const an = (k / 6) * TAU; k ? c.lineTo(x + Math.cos(an) * r, y + Math.sin(an) * r) : c.moveTo(x + r, y); } c.closePath();
      c.fillStyle = metal(x - r, x + r, 2); c.fill(); edge(0.8, 1);
      c.beginPath(); c.arc(x, y, r * 0.4, 0, TAU); c.fillStyle = '#0c0e12'; c.fill();
    };
    const vents = (x: number, y: number, n: number, w: number, h: number, gap: number, glow: number) => {
      for (let i = 0; i < n; i++) {
        c.fillStyle = '#04060a'; c.beginPath(); c.roundRect(x + i * (w + gap), y, w, h, 1.5); c.fill();
        if (glow > 0.02) { c.globalCompositeOperation = 'lighter'; this.glowAt(x + i * (w + gap) + w / 2, y + h / 2, h * 0.7, '#ff8030', glow); c.globalCompositeOperation = 'source-over'; }
      }
    };

    // ================= HEAVY MOUNT =================
    // shoulder armor plate (wide, angular)
    poly([[-100, 300], [-84, 250], [-40, 236], [40, 236], [84, 250], [100, 300]], metal(-100, 100));
    poly([[-66, 300], [-56, 262], [56, 262], [66, 300]], metal(-66, 66, 1));
    c.strokeStyle = 'rgba(255,255,255,0.09)'; c.lineWidth = 1;
    for (let r = 0; r < 3; r++) for (let i = -4; i <= 4; i++) {
      const hx = i * 12 + (r % 2) * 6, hy = 272 + r * 10.5;
      c.beginPath(); for (let k = 0; k < 6; k++) { const an = (k / 6) * TAU + 0.52; k ? c.lineTo(hx + Math.cos(an) * 5.2, hy + Math.sin(an) * 5.2) : c.moveTo(hx + Math.cos(an) * 5.2, hy + Math.sin(an) * 5.2); } c.closePath(); c.stroke();
    }
    [-88, -50, 50, 88].forEach((x) => hexBolt(x, 250, 4));
    // lower turret block
    seg(214, 240, 34, 5, 1);
    groove(222, 34); rivet(-26, 232); rivet(26, 232);
    // big servo ring (turntable) with teeth
    c.save(); c.translate(0, 214);
    const dg = c.createRadialGradient(-6, -6, 2, 0, 0, 24);
    dg.addColorStop(0, '#d6dce3'); dg.addColorStop(0.6, '#5c646f'); dg.addColorStop(1, '#1b1e24');
    c.beginPath(); c.arc(0, 0, 24, 0, TAU); c.fillStyle = dg; c.fill(); edge();
    c.save(); c.rotate(sv * 1.2 + rc * 0.8 + t * 0.15 * sv);
    c.fillStyle = '#272c34';
    for (let i = 0; i < 14; i++) { c.save(); c.rotate((i / 14) * TAU); c.fillRect(19, -3, 7, 6); c.restore(); }
    c.restore();
    c.beginPath(); c.arc(0, 0, 9, 0, TAU); c.fillStyle = '#121519'; c.fill();
    c.globalCompositeOperation = 'lighter';
    this.glowAt(16, -14, 7, PLASMA.laser, 0.6 + 0.4 * Math.sin(t * (sv > 0.6 ? 20 : 4)));
    c.globalCompositeOperation = 'source-over';
    c.restore();

    const lift = -sv * 6 + rc * 8;
    // thick riser arm + hydraulic piston
    poly([[-16, 216], [-13, 176 + lift], [13, 176 + lift], [16, 216]], metal(-16, 16));
    groove(200, 14);
    c.beginPath(); c.moveTo(26, 218); c.lineTo(22, 184 + lift); c.strokeStyle = '#0b0d10'; c.lineWidth = 14; c.stroke();
    c.beginPath(); c.moveTo(26, 218); c.lineTo(22, 184 + lift); c.strokeStyle = metal(16, 32); c.lineWidth = 10; c.stroke();
    c.beginPath(); c.moveTo(24, 204 + rc * 3); c.lineTo(22, 184 + lift); c.strokeStyle = '#eef1f5'; c.lineWidth = 5; c.stroke();
    // yoke (U-bracket) plates that hold the receiver -- behind cannon
    for (const sx of [-1, 1]) {
      poly([[sx * 46, 118 + lift], [sx * 36, 108 + lift], [sx * 30, 176 + lift], [sx * 14, 180 + lift], [sx * 48, 176 + lift]], metal(sx * 48, sx * 14, 2));
    }
    // cables / hoses
    c.lineCap = 'round';
    for (let i = 0; i < 5; i++) {
      const sx = -22 - i * 4, ex = -50 - i * 8;
      const p = () => { c.beginPath(); c.moveTo(sx, 170 + lift); c.bezierCurveTo(sx - 22, 196, ex - 4, 212, ex, 262); };
      p(); c.strokeStyle = '#06080a'; c.lineWidth = 8; c.stroke();
      p(); c.strokeStyle = i === 1 ? '#6a1a1a' : i === 3 ? '#1e2a3a' : '#262b33'; c.lineWidth = 5; c.stroke();
      p(); c.strokeStyle = 'rgba(255,255,255,0.2)'; c.lineWidth = 1.2; c.stroke();
    }

    // ================= CANNON BODY (bulky side profile, pointing up) =================
    c.save();
    c.translate(0, lift);
    c.rotate(Math.sin(t * 0.9) * 0.008 * sv);

    // rear exhaust block
    seg(176, 196, 26, 4, 1);
    vents(-20, 179, 5, 6, 14, 2.5, this.heat * 0.9);

    // receiver: wide armored box with bevelled facets
    poly([[-36, 104], [-40, 118], [-40, 170], [-32, 178], [32, 178], [40, 170], [40, 118], [36, 104]], metal(-40, 40));
    // facet shading
    poly([[-40, 118], [-28, 118], [-28, 170], [-32, 178], [-40, 170]], 'rgba(0,0,0,0.28)');
    poly([[28, 118], [40, 118], [40, 170], [32, 178], [28, 170]], 'rgba(255,255,255,0.08)');
    groove(112, 36); groove(170, 32);
    [-34, 34].forEach((x) => { rivet(x, 124); rivet(x, 164); });
    // iconic side drum
    c.save(); c.translate(-6, 142);
    const pg = c.createRadialGradient(-10, -10, 2, 0, 0, 30);
    pg.addColorStop(0, '#f2f4f7'); pg.addColorStop(0.35, '#aab2bc'); pg.addColorStop(0.75, '#555d68'); pg.addColorStop(1, '#1a1e24');
    c.beginPath(); c.arc(0, 0, 30, 0, TAU); c.fillStyle = pg; c.fill(); edge();
    c.strokeStyle = 'rgba(0,0,0,0.55)'; c.lineWidth = 1.5;
    [25, 18, 11].forEach((r) => { c.beginPath(); c.arc(0, 0, r, 0, TAU); c.stroke(); });
    c.strokeStyle = 'rgba(255,255,255,0.22)'; c.lineWidth = 1;
    [24, 17].forEach((r) => { c.beginPath(); c.arc(0, 0, r, 0, TAU); c.stroke(); });
    for (let i = 0; i < 8; i++) { const an = (i / 8) * TAU; rivet(Math.cos(an) * 21.5, Math.sin(an) * 21.5, 2); }
    c.save(); c.rotate(t * (0.4 + ch * 6) * (0.3 + sv));
    c.strokeStyle = 'rgba(0,0,0,0.6)'; c.lineWidth = 2.6;
    for (let i = 0; i < 3; i++) { c.save(); c.rotate((i / 3) * TAU); c.beginPath(); c.moveTo(0, -5); c.lineTo(0, -15); c.stroke(); c.restore(); }
    c.restore();
    c.beginPath(); c.arc(0, 0, 6, 0, TAU); c.fillStyle = '#090b0e'; c.fill();
    c.globalCompositeOperation = 'lighter';
    this.glowAt(0, 0, 10 + ch * 10, PLASMA.glow, 0.5 + ch * 0.5);
    this.glowAt(0, 0, 3.5, '#ffffff', 0.6 + ch * 0.4);
    c.globalCompositeOperation = 'source-over';
    c.restore();
    // right-side capacitor cylinder
    c.beginPath(); c.roundRect(26, 98, 18, 70, 6); c.fillStyle = metal(26, 44); c.fill(); edge();
    [110, 126, 142, 158].forEach((y) => groove(y, 8, 35));
    c.beginPath(); c.ellipse(35, 98, 9, 4, 0, Math.PI, TAU); c.fillStyle = '#aab2bc'; c.fill(); edge();

    // cooling fin stack (wide)
    seg(70, 104, 20, 2, 1);
    for (let i = 0; i < 7; i++) { c.beginPath(); c.roundRect(-30, 72 + i * 4.6, 60, 2.8, 1); c.fillStyle = metal(-30, 30); c.fill(); }
    c.strokeStyle = 'rgba(0,0,0,0.75)'; c.lineWidth = 1.2; c.strokeRect(-30, 71, 60, 33);

    // main barrel shroud: hexagonal-faceted, wide
    poly([[-24, 10], [-24, 72], [24, 72], [24, 10]], metal(-24, 24));
    poly([[-24, 10], [-14, 10], [-14, 72], [-24, 72]], 'rgba(0,0,0,0.3)');
    poly([[14, 10], [24, 10], [24, 72], [14, 72]], 'rgba(255,255,255,0.06)');
    [24, 38, 52].forEach((y) => groove(y, 24));
    // shroud vent slots (blue inner glow)
    for (let i = 0; i < 3; i++) {
      c.fillStyle = '#04060a'; c.beginPath(); c.roundRect(-5, 14 + i * 14, 10, 8, 2); c.fill();
      c.globalCompositeOperation = 'lighter';
      this.glowAt(0, 18 + i * 14, 8, PLASMA.glow, 0.35 + ch * 0.6 + (0.2 * Math.sin(t * 6 + i)) * ch);
      c.globalCompositeOperation = 'source-over';
    }
    // side rails on the shroud
    for (const sx of [-1, 1]) {
      c.beginPath(); c.roundRect(sx * 30 - 4, 16, 8, 50, 2); c.fillStyle = metal(sx * 30 - 4, sx * 30 + 4, 2); c.fill(); edge();
      for (let y = 22; y < 62; y += 10) { c.fillStyle = 'rgba(0,0,0,0.6)'; c.fillRect(sx * 30 - 2.5, y, 5, 2); }
    }

    // heavy muzzle: flared collar + big bore
    poly([[-24, 12], [-30, 2], [30, 2], [24, 12]], metal(-30, 30));
    c.beginPath(); c.ellipse(0, 2, 30, 11, 0, 0, TAU); c.fillStyle = metal(-30, 30); c.fill(); edge();
    // notched muzzle ring
    c.fillStyle = '#1a1e24';
    for (let i = 0; i < 10; i++) { const an = (i / 10) * TAU; c.beginPath(); c.arc(Math.cos(an) * 27, 2 + Math.sin(an) * 9.5, 2.2, 0, TAU); c.fill(); }
    c.beginPath(); c.ellipse(0, 2, 20, 7.5, 0, 0, TAU); c.fillStyle = '#2a2f37'; c.fill(); edge(0.8, 1);
    const bore = c.createRadialGradient(0, 3, 1, 0, 2, 17);
    bore.addColorStop(0, '#000000'); bore.addColorStop(0.75, '#05070b'); bore.addColorStop(1, '#2a2f37');
    c.beginPath(); c.ellipse(0, 2, 17, 6.2, 0, 0, TAU); c.fillStyle = bore; c.fill();
    c.strokeStyle = 'rgba(255,255,255,0.12)'; c.lineWidth = 1;
    c.beginPath(); c.ellipse(0, 2.5, 11, 4, 0, 0, TAU); c.stroke();

    // ---- tri-laser targeting pod: boxy unit on the left of the barrel ----
    c.beginPath(); c.roundRect(-36, 40, 12, 10, 2); c.fillStyle = metal(-36, -24, 1); c.fill(); edge();
    poly([[-66, 22], [-58, 16], [-36, 16], [-34, 24], [-34, 70], [-40, 78], [-62, 78], [-66, 70]], metal(-66, -34, 1));
    poly([[-66, 22], [-58, 16], [-58, 78], [-62, 78], [-66, 70]], 'rgba(0,0,0,0.3)');
    c.strokeStyle = 'rgba(0,0,0,0.65)'; c.lineWidth = 1.2;
    for (let y = 52; y < 74; y += 5) { c.beginPath(); c.moveTo(-62, y); c.lineTo(-38, y); c.stroke(); }
    rivet(-60, 28, 1.8); rivet(-40, 28, 1.8); rivet(-60, 46, 1.8); rivet(-40, 46, 1.8);
    // lens cowl
    poly([[-64, 16], [-60, 6], [-40, 6], [-36, 16]], metal(-64, -36, 2));
    c.beginPath(); c.roundRect(-60, 8, 20, 14, 3); c.fillStyle = '#160808'; c.fill(); edge(0.7, 1);
    const emit = [[-55, 17], [-45, 17], [-50, 11]];
    for (const [ex, ey] of emit) {
      c.beginPath(); c.arc(ex, ey, 2.8, 0, TAU); c.fillStyle = '#3a0000'; c.fill();
      c.globalCompositeOperation = 'lighter';
      this.glowAt(ex, ey, 8, PLASMA.laser, 0.9);
      this.glowAt(ex, ey, 2.4, '#ffffff', 0.9);
      c.globalCompositeOperation = 'source-over';
    }

    // ---- coolant line along the barrel ----
    c.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 5; i++) {
      const yy = 14 + ((i * 11 + (t * 70 * (0.3 + ch)) % 54) % 54);
      this.glowAt(9, yy, 4, PLASMA.glow, 0.25 + ch * 0.6);
    }
    // ---- plasma core at the muzzle ----
    const coreY = -8;
    const idle = 0.5 + 0.5 * Math.sin(t * 3);
    const e = 0.22 + idle * 0.1 + ch * 1.1 + this.glow * 0.6;
    const flick = 1 + (ch > 0 ? Math.sin(t * 90) * 0.12 * ch : 0);
    this.glowAt(0, coreY, (34 + ch * 80) * flick, PLASMA.deep, e * 0.6);
    this.glowAt(0, coreY, (18 + ch * 34) * flick, PLASMA.glow, e);
    this.glowAt(0, coreY, (7 + ch * 14) * flick, '#ffffff', Math.min(1, e));
    if (ch > 0.15) {
      for (let i = 0; i < 4; i++) {
        if (Math.random() > ch * 0.9) continue;
        const a0 = rand(0, TAU);
        let x = Math.cos(a0) * 18, y = 2 + Math.sin(a0) * 7;
        c.beginPath(); c.moveTo(x, y);
        for (let k = 0; k < 4; k++) { x += (0 - x) * 0.35 + rand(-5, 5); y += (coreY - y) * 0.35 + rand(-5, 5); c.lineTo(x, y); }
        c.lineTo(0, coreY);
        c.strokeStyle = rgba(PLASMA.glow, 0.6); c.lineWidth = 3; c.stroke();
        c.strokeStyle = '#ffffff'; c.lineWidth = 1.2; c.stroke();
      }
      const rr = (1 - ((t * 2.5) % 1)) * 70 + 10;
      c.strokeStyle = rgba(PLASMA.glow, 0.5 * ch); c.lineWidth = 1.5;
      c.beginPath(); c.ellipse(0, coreY, rr, rr * 0.45, 0, 0, TAU); c.stroke();
    }
    if (this.glow > 0) this.glowAt(0, coreY + 6, 40 * this.glow, '#ffffff', this.glow * 0.4);
    c.globalCompositeOperation = 'source-over';
    c.restore(); // cannon
    c.restore();
  }

  /** three red targeting lasers converging on the aim point */
  drawTriLaser() {
    if (!this.wheelAlive || this.status !== 'playing') return;
    const c = this.ctx;
    const t = this.time;
    const ch = this.charge >= 0 ? clamp(this.charge) : 0;
    const ap = this.aimPoint();
    // emitter pod world position (matches drawCaster transform roughly)
    const lift = -this.servo * 6 + this.recoil * 8;
    const ex = this.gx - 50, ey = this.my - 60 + this.recoil * 14 + lift + 15;
    const jitter = () => (Math.random() - 0.5) * (1.2 - ch);
    const spreadR = 10 + (1 - ch) * 14 + Math.sin(t * 2) * 2;
    c.save();
    c.globalCompositeOperation = 'lighter';
    // dust-scatter beams (faint)
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * TAU - Math.PI / 2 + t * 0.6;
      const dx = ap.x + Math.cos(a) * spreadR + jitter(), dy = ap.y + 8 + Math.sin(a) * spreadR * 0.45 + jitter();
      const g = c.createLinearGradient(ex, ey, dx, dy);
      g.addColorStop(0, rgba(PLASMA.laser, 0.45)); g.addColorStop(0.5, rgba(PLASMA.laser, 0.12)); g.addColorStop(1, rgba(PLASMA.laser, 0.5));
      c.strokeStyle = g; c.lineWidth = 1.2 + ch * 0.6;
      const eo = [[-5, 2], [5, 2], [0, -4]][i];
      c.beginPath(); c.moveTo(ex + eo[0], ey + eo[1]); c.lineTo(dx, dy); c.stroke();
      // dots on the wood
      this.glowAt(dx, dy, 9 + ch * 4, PLASMA.laser, 0.9);
      this.glowAt(dx, dy, 3, '#ffffff', 0.9);
      c.fillStyle = '#ff5050'; c.beginPath(); c.arc(dx, dy, 1.6, 0, TAU); c.fill();
    }
    // triangle linking the dots (lock-on)
    c.strokeStyle = rgba(PLASMA.laser, 0.25 + ch * 0.5); c.lineWidth = 1;
    c.beginPath();
    for (let i = 0; i <= 3; i++) { const a = (i / 3) * TAU - Math.PI / 2 + t * 0.6; const x = ap.x + Math.cos(a) * spreadR, y = ap.y + 8 + Math.sin(a) * spreadR * 0.45; i ? c.lineTo(x, y) : c.moveTo(x, y); }
    c.stroke();
    // lock reticle while charging
    if (ch > 0) {
      c.strokeStyle = rgba(PLASMA.laser, ch * 0.8); c.lineWidth = 1.5;
      const r = 26 - ch * 10;
      c.beginPath(); c.ellipse(ap.x, ap.y + 8, r, r * 0.45, 0, 0, TAU); c.stroke();
      for (let i = 0; i < 4; i++) { const a = (i / 4) * TAU + t * 3; c.beginPath(); c.moveTo(ap.x + Math.cos(a) * r * 0.8, ap.y + 8 + Math.sin(a) * r * 0.36); c.lineTo(ap.x + Math.cos(a) * r * 1.3, ap.y + 8 + Math.sin(a) * r * 0.58); c.stroke(); }
    }
    c.restore();
  }

  /** flying plasma bolt: blinding white core, blue sheath, electric arcs, ion tail */
  drawPlasmaBolts() {
    const c = this.ctx;
    for (const p of this.projectiles) {
      if (p.w !== 'pred') continue;
      const x = p.x, y = p.y;
      const t = p.t;
      c.save();
      c.globalCompositeOperation = 'lighter';
      // ion tail
      const len = Math.min(260, p.startY - y + 40);
      const tg = c.createLinearGradient(0, y, 0, y + len);
      tg.addColorStop(0, rgba('#ffffff', 0.9)); tg.addColorStop(0.25, rgba(PLASMA.glow, 0.6)); tg.addColorStop(1, rgba(PLASMA.deep, 0));
      c.fillStyle = tg;
      c.beginPath(); c.moveTo(x - 12, y); c.quadraticCurveTo(x - 6, y + len * 0.5, x - 1.5, y + len); c.lineTo(x + 1.5, y + len); c.quadraticCurveTo(x + 6, y + len * 0.5, x + 12, y); c.closePath(); c.fill();
      // wobbling plasma filaments in the tail
      c.lineWidth = 1.2;
      for (let k = 0; k < 3; k++) {
        c.strokeStyle = rgba(k ? PLASMA.glow : '#ffffff', 0.6);
        c.beginPath(); c.moveTo(x, y);
        for (let yy = 0; yy < len * 0.7; yy += 10) c.lineTo(x + Math.sin(yy * 0.12 + t * 60 + k * 2) * (3 + yy * 0.06), y + yy);
        c.stroke();
      }
      // glow stack
      this.glowAt(x, y, 90, PLASMA.deep, 0.7);
      this.glowAt(x, y, 50, PLASMA.glow, 1);
      this.glowAt(x, y, 24, '#ffffff', 1);
      // elongated core
      c.save(); c.translate(x, y); c.scale(1, 1.6);
      this.glowAt(0, 0, 18, '#ffffff', 1);
      c.restore();
      c.fillStyle = '#ffffff';
      c.beginPath(); c.ellipse(x, y, 7, 13, 0, 0, TAU); c.fill();
      // electric arcs around the bolt
      for (let i = 0; i < 4; i++) {
        const a = rand(0, TAU);
        c.beginPath(); c.moveTo(x, y);
        let px = x, py = y;
        for (let k = 0; k < 4; k++) { px += Math.cos(a) * 7 + rand(-5, 5); py += Math.sin(a) * 7 + rand(-5, 5); c.lineTo(px, py); }
        c.strokeStyle = rgba(PLASMA.glow, 0.7); c.lineWidth = 2.5; c.stroke();
        c.strokeStyle = '#ffffff'; c.lineWidth = 1; c.stroke();
      }
      // spinning corona ring
      c.strokeStyle = rgba(PLASMA.hot, 0.8); c.lineWidth = 1.5;
      c.beginPath(); c.ellipse(x, y, 20, 7, 0, 0, TAU); c.stroke();
      c.beginPath(); c.ellipse(x, y + 4, 14 + Math.sin(t * 40) * 3, 5, 0, 0, TAU); c.stroke();
      c.restore();
    }
  }

  /** rim marker: glowing molten gouge with arcing residue (rim frame: +x outward) */
  drawPlasmaScar(s: Stuck) {
    const c = this.ctx;
    const t = this.time;
    const hot = clamp(1 - s.age / 6);
    const pop = 1 + Math.max(0, 0.4 - s.age) * 1.5;
    c.save();
    c.scale(pop, pop);
    // charred spur of wood pushed outward
    c.beginPath(); c.moveTo(-6, -9); c.lineTo(14, -6); c.lineTo(26, -1); c.lineTo(28, 1); c.lineTo(16, 6); c.lineTo(-6, 9); c.closePath();
    const g = c.createLinearGradient(-6, 0, 28, 0);
    g.addColorStop(0, hot > 0.3 ? '#3a1a08' : '#1a110a'); g.addColorStop(1, '#0a0806');
    c.fillStyle = g; c.fill();
    c.globalCompositeOperation = 'lighter';
    // molten veins
    c.strokeStyle = rgba('#ff7a20', 0.5 + hot * 0.5); c.lineWidth = 1.4; c.lineCap = 'round';
    c.beginPath(); c.moveTo(-4, 0); c.lineTo(6, -2); c.lineTo(14, 1); c.lineTo(22, 0); c.stroke();
    c.strokeStyle = rgba('#ffe0a0', hot); c.lineWidth = 0.7; c.stroke();
    this.glowAt(2, 0, 14 + hot * 16, '#ff7a20', 0.3 + hot * 0.6);
    // blue plasma residue pulsing
    const pulse = 0.6 + 0.4 * Math.sin(t * 14 + s.seed);
    this.glowAt(0, 0, 22, PLASMA.glow, (0.2 + hot * 0.5) * pulse);
    this.glowAt(0, 0, 8, '#ffffff', hot * pulse);
    // small arcs
    if (Math.random() < 0.4 + hot * 0.5) {
      c.beginPath(); let x = 0, y = 0; c.moveTo(x, y);
      const a = rand(0, TAU);
      for (let k = 0; k < 4; k++) { x += Math.cos(a) * 5 + rand(-4, 4); y += Math.sin(a) * 5 + rand(-4, 4); c.lineTo(x, y); }
      c.strokeStyle = rgba(PLASMA.glow, 0.8); c.lineWidth = 2; c.stroke();
      c.strokeStyle = '#ffffff'; c.lineWidth = 0.8; c.stroke();
    }
    c.restore();
  }

  /** molten crater in the wood: white-hot center cooling to char, radial burn rays, blue residue */
  drawPlasmaCrater(d: Decal) {
    const c = this.ctx;
    const t = this.time;
    const age = d.age;
    const hot = clamp(1 - age / 5);
    const grow = 1 - Math.pow(1 - clamp(age / 0.3), 2);
    const r = prng(d.seed);
    c.save();
    c.scale(grow, grow);
    // scorched halo
    const halo = c.createRadialGradient(0, 0, 0, 0, 0, 44);
    halo.addColorStop(0, 'rgba(10,6,2,0.95)'); halo.addColorStop(0.5, 'rgba(30,16,5,0.7)'); halo.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = halo; c.beginPath(); c.arc(0, 0, 44, 0, TAU); c.fill();
    // burn rays
    c.lineCap = 'round';
    for (let i = 0; i < 12; i++) {
      const a = r() * TAU, l = 18 + r() * 22;
      c.beginPath(); c.moveTo(Math.cos(a) * 8, Math.sin(a) * 8); c.lineTo(Math.cos(a) * l, Math.sin(a) * l);
      c.strokeStyle = 'rgba(15,8,2,0.85)'; c.lineWidth = 1.5 + r() * 2.5; c.stroke();
    }
    // crater bowl
    const path = (k: number) => {
      c.beginPath();
      const n = d.pts.length;
      for (let i = 0; i <= n; i++) { const an = (i / n) * TAU; const rr = 17 * k * d.pts[i % n]; i ? c.lineTo(Math.cos(an) * rr, Math.sin(an) * rr) : c.moveTo(rr, 0); }
      c.closePath();
    };
    path(1.15); c.fillStyle = '#120a04'; c.fill();
    path(1);
    const bowl = c.createRadialGradient(0, 0, 0, 0, 0, 17);
    bowl.addColorStop(0, hot > 0 ? `rgb(${lerp(20, 255, hot)},${lerp(10, 240, hot)},${lerp(5, 200, hot)})` : '#140a05');
    bowl.addColorStop(0.5, hot > 0 ? rgba('#ff7a20', 0.4 + hot * 0.6) : 'rgba(40,20,8,1)');
    bowl.addColorStop(1, '#0a0603');
    c.fillStyle = bowl; c.fill();
    // glass-like cooled plasma sheen
    c.globalCompositeOperation = 'lighter';
    this.glowAt(0, 0, 30, '#ff7a20', hot * 0.9);
    this.glowAt(0, 0, 14, '#ffffff', Math.pow(hot, 2));
    const pulse = 0.5 + 0.5 * Math.sin(t * 10 + d.seed);
    this.glowAt(0, 0, 24, PLASMA.glow, (0.12 + hot * 0.35) * pulse);
    path(1.02); c.strokeStyle = rgba(PLASMA.glow, 0.25 + hot * 0.6); c.lineWidth = 1.5; c.stroke();
    // residual micro arcs
    if (Math.random() < 0.15 + hot * 0.4) {
      const a = r() * TAU + t;
      c.beginPath(); c.moveTo(0, 0);
      let x = 0, y = 0;
      for (let k = 0; k < 4; k++) { x += Math.cos(a) * 5 + rand(-4, 4); y += Math.sin(a) * 5 + rand(-4, 4); c.lineTo(x, y); }
      c.strokeStyle = '#ffffff'; c.lineWidth = 1; c.stroke();
    }
    c.restore();
  }

  drawParticles(additive: boolean, front = false) {
    const c = this.ctx;
    c.globalCompositeOperation = additive ? 'lighter' : 'source-over';
    for (const p of this.particles) {
      if (p.kind === 'acid') continue;
      const isFront = p.kind === 'puff' || p.kind === 'text';
      if (front !== isFront) continue;
      if (!front && p.add !== additive) continue;
      const k = p.life / p.max;
      const a = 1 - k;
      switch (p.kind) {
        case 'ember':
          this.glowAt(p.x, p.y, p.size * 4, p.color, a);
          break;
        case 'spark': {
          const l = 0.035;
          c.strokeStyle = rgba(p.color, a); c.lineWidth = p.size * (0.4 + a * 0.8); c.lineCap = 'round';
          c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(p.x - p.vx * l, p.y - p.vy * l); c.stroke();
          this.glowAt(p.x, p.y, p.size * 4, p.color, a * 0.5);
          break;
        }
        case 'smoke': {
          const op = (p.data as number) || 0.55;
          const fade = Math.min(1, k * 6) * a;
          this.glowAt(p.x, p.y, p.size, p.color, fade * op);
          break;
        }
        case 'flash':
          this.glowAt(p.x, p.y, p.size * (0.7 + k * 0.5), p.color, a * a);
          break;
        case 'ring':
          if (p.size <= 0.5) break;
          c.strokeStyle = rgba(p.color, a * 0.9); c.lineWidth = 1 + a * 4;
          c.beginPath(); c.arc(p.x, p.y, p.size, 0, TAU); c.stroke();
          break;
        case 'bubble':
          c.strokeStyle = rgba(p.color, a * 0.9); c.lineWidth = 1;
          c.beginPath(); c.arc(p.x, p.y, p.size, 0, TAU); c.stroke();
          c.fillStyle = rgba('#ffffff', a * 0.6); c.beginPath(); c.arc(p.x - p.size * 0.3, p.y - p.size * 0.3, p.size * 0.25, 0, TAU); c.fill();
          break;
        case 'bolt': {
          const pts = p.data as number[];
          c.lineJoin = 'round';
          c.beginPath();
          for (let i = 0; i < pts.length; i += 2) i === 0 ? c.moveTo(p.x + pts[i], p.y + pts[i + 1]) : c.lineTo(p.x + pts[i], p.y + pts[i + 1]);
          c.strokeStyle = rgba(p.color, a * 0.5); c.lineWidth = 6; c.stroke();
          c.strokeStyle = rgba('#ffffff', a); c.lineWidth = 1.4; c.stroke();
          break;
        }
        case 'flare': {
          const g = c.createLinearGradient(p.x - p.size, 0, p.x + p.size, 0);
          g.addColorStop(0, rgba(p.color, 0)); g.addColorStop(0.5, rgba('#ffffff', a)); g.addColorStop(1, rgba(p.color, 0));
          c.fillStyle = g; c.fillRect(p.x - p.size, p.y - 1.5 * a - 0.5, p.size * 2, 3 * a + 1);
          const g2 = c.createLinearGradient(0, p.y - p.size * 0.4, 0, p.y + p.size * 0.4);
          g2.addColorStop(0, rgba(p.color, 0)); g2.addColorStop(0.5, rgba('#ffffff', a * 0.7)); g2.addColorStop(1, rgba(p.color, 0));
          c.fillStyle = g2; c.fillRect(p.x - 1 - a, p.y - p.size * 0.4, 2 + a * 2, p.size * 0.8);
          break;
        }
        case 'ringE':
          c.strokeStyle = rgba(p.color, a * 0.9); c.lineWidth = 1 + a * 2.5;
          c.beginPath(); c.ellipse(p.x, p.y, p.size, p.size * 0.38, 0, 0, TAU); c.stroke();
          break;
        case 'star': {
          const s = p.size * (0.4 + a * 0.6);
          c.fillStyle = rgba(p.color, a);
          c.beginPath();
          for (let i = 0; i < 16; i++) { const an = (i / 16) * TAU + 0.2; const r = i % 2 ? s * 0.28 : s; i ? c.lineTo(p.x + Math.cos(an) * r, p.y + Math.sin(an) * r) : c.moveTo(p.x + Math.cos(an) * r, p.y + Math.sin(an) * r); }
          c.closePath(); c.fill();
          break;
        }
        case 'wind': {
          const sp = Math.hypot(p.vx, p.vy) || 1;
          const ux = p.vx / sp, uy = p.vy / sp;
          const len = p.size * (0.6 + a);
          c.strokeStyle = rgba(p.color, a * 0.8); c.lineWidth = 1.6; c.lineCap = 'round';
          c.beginPath(); c.moveTo(p.x, p.y);
          c.quadraticCurveTo(p.x - ux * len * 0.5 - uy * 6, p.y - uy * len * 0.5 + ux * 6, p.x - ux * len, p.y - uy * len); c.stroke();
          break;
        }
        case 'speed': {
          const r = prng(p.data as number);
          const R0 = p.size * (0.25 + k * 0.5), R1 = p.size * (0.6 + k * 0.6);
          c.strokeStyle = rgba(p.color, a * 0.8); c.lineCap = 'round';
          for (let i = 0; i < 28; i++) {
            const an = (i / 28) * TAU + r() * 0.2;
            const l0 = R0 + r() * p.size * 0.2, l1 = R1 + r() * p.size * 0.3;
            c.lineWidth = 1 + r() * 2.5;
            c.beginPath(); c.moveTo(p.x + Math.cos(an) * l0, p.y + Math.sin(an) * l0); c.lineTo(p.x + Math.cos(an) * l1, p.y + Math.sin(an) * l1); c.stroke();
          }
          break;
        }
        case 'puff': {
          const fade = Math.min(1, k * 5) * Math.min(1, a * 2.5);
          c.save(); c.translate(p.x, p.y); c.rotate(p.rot);
          c.globalAlpha = fade;
          const s = p.size;
          const lobes = [[0, 0, 1], [-0.55, 0.15, 0.7], [0.55, 0.1, 0.72], [0.1, -0.5, 0.65], [-0.2, 0.45, 0.6]];
          c.fillStyle = 'rgba(120,150,190,0.45)';
          for (const [lx, ly, lr] of lobes) { c.beginPath(); c.arc(lx * s + 3, ly * s + 4, lr * s, 0, TAU); c.fill(); }
          c.fillStyle = p.color;
          for (const [lx, ly, lr] of lobes) { c.beginPath(); c.arc(lx * s, ly * s, lr * s, 0, TAU); c.fill(); }
          c.fillStyle = 'rgba(255,255,255,0.9)';
          c.beginPath(); c.arc(-s * 0.25, -s * 0.3, s * 0.4, 0, TAU); c.fill();
          c.restore();
          c.globalAlpha = 1;
          break;
        }
        case 'text': {
          const pop = k < 0.15 ? 1.6 - (k / 0.15) * 0.6 : 1;
          const al = k > 0.7 ? 1 - (k - 0.7) / 0.3 : 1;
          c.save(); c.translate(p.x, p.y); c.rotate(p.rot); c.scale(pop, pop);
          c.globalAlpha = al;
          c.font = `italic 900 ${p.size}px Impact, 'Arial Black', sans-serif`;
          c.textAlign = 'center'; c.textBaseline = 'middle';
          c.lineJoin = 'round';
          c.strokeStyle = '#1a0a00'; c.lineWidth = p.size * 0.28; c.strokeText(p.data as string, 0, 0);
          c.strokeStyle = '#ffffff'; c.lineWidth = p.size * 0.14; c.strokeText(p.data as string, 0, 0);
          const tg = c.createLinearGradient(0, -p.size / 2, 0, p.size / 2);
          tg.addColorStop(0, '#fff6b0'); tg.addColorStop(0.5, p.color); tg.addColorStop(1, '#ff7a00');
          c.fillStyle = tg; c.fillText(p.data as string, 0, 0);
          c.restore();
          c.globalAlpha = 1;
          break;
        }
        case 'ash':
          c.save(); c.translate(p.x, p.y); c.rotate(p.rot);
          c.fillStyle = rgba(p.color, a * 0.95);
          c.fillRect(-p.size / 2, -p.size / 5, p.size, p.size / 2.5);
          c.restore();
          break;
      }
    }
    c.globalCompositeOperation = 'source-over';
    c.globalAlpha = 1;
  }
}
