import { Sfx } from "./sfx";

// roundRect is missing on older browsers — a single throw would kill the whole
// game loop and leave a blank screen, so polyfill it defensively.
if (typeof CanvasRenderingContext2D !== "undefined" && !CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function (
    this: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number | DOMPointInit | (number | DOMPointInit)[] = 0
  ) {
    const rad = typeof r === "number" ? r : 0;
    const rr = Math.max(0, Math.min(rad, Math.abs(w) / 2, Math.abs(h) / 2));
    this.moveTo(x + rr, y);
    this.lineTo(x + w - rr, y);
    this.arcTo(x + w, y, x + w, y + rr, rr);
    this.lineTo(x + w, y + h - rr);
    this.arcTo(x + w, y + h, x + w - rr, y + h, rr);
    this.lineTo(x + rr, y + h);
    this.arcTo(x, y + h, x, y + h - rr, rr);
    this.lineTo(x, y + rr);
    this.arcTo(x, y, x + rr, y, rr);
    this.closePath();
    return this as unknown as DOMRect;
  } as unknown as typeof CanvasRenderingContext2D.prototype.roundRect;
}

export const W = 420;
export const H = 760;

const CX = W / 2;
const CY = 262;
const R = 100; // wheel radius
const GUNY = 596; // muzzle top
const TAU = Math.PI * 2;
const THR = 0.115; // angular collision threshold (rad)
const FONT = "Bungee, Impact, 'Arial Black', sans-serif";

export type GameState = "menu" | "playing" | "failing" | "clear" | "over";
export type Weapon = "keris" | "blackhole" | "yoyo" | "diamond" | "crystal";
export interface UISnap {
  state: GameState;
  level: number;
  score: number;
  best: number;
  weapon: Weapon;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  h: number;
  s: number;
  l: number;
  g: number;
  d: number;
  tr: number;
  tw: boolean;
  ax: number;
  ay: number;
  pull: number;
}
interface Pin {
  a: number;
  hue: number;
  seed: number;
  flash: number;
  spin: number;
}
interface Rocket {
  y: number;
  x: number;
  hue: number;
  seed: number;
  age: number;
  phase: number; // 0 = flying, 1 = yoyo spinning at impact
  spinT: number;
}
interface Debris {
  kind: "rocket" | "wedge" | "shard";
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vr: number;
  hue: number;
  a0: number;
  life: number;
  seed: number;
}
interface Glow {
  x: number;
  y: number;
  hue: number;
  life: number;
  max: number;
  r: number;
}
interface Ring {
  x: number;
  y: number;
  hue: number;
  life: number;
  max: number;
  r: number;
  impl?: boolean;
}
interface FloatText {
  x: number;
  y: number;
  text: string;
  hue: number;
  life: number;
}
interface VoidFx {
  x: number;
  y: number;
  hue: number;
  life: number;
  max: number;
  r: number;
  popped: boolean;
}
interface CrystalFx {
  x: number;
  y: number;
  life: number;
  max: number;
  seed: number;
  popped: boolean;
}
interface YoyoString {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  life: number;
  max: number;
  hue: number;
}
interface StarFlash {
  x: number;
  y: number;
  life: number;
  max: number;
  r: number;
  rot: number;
  spd: number;
  hue: number;
}

const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const hsl = (h: number, s: number, l: number, a = 1) => `hsla(${((h % 360) + 360) % 360},${s}%,${l}%,${a})`;
const angDiff = (a: number, b: number) => {
  let d = (a - b) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return d;
};

function starPath(ctx: CanvasRenderingContext2D, r: number) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const rr = i % 2 === 0 ? r : r * 0.45;
    const a = (i * Math.PI) / 5 - Math.PI / 2;
    const x = Math.cos(a) * rr;
    const y = Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

// ---------------------------------------------------------------------------
// Bullet painters — nose at x=0 facing -x, body extends toward +x.
// ---------------------------------------------------------------------------

// Wavy luk blade along +x. len = length, wid = max width.
function kerisBlade(ctx: CanvasRenderingContext2D, len: number, wid: number, seed: number) {
  const luks = 3;
  const STEPS = 26;
  const cx = (t: number) => Math.sin(t * Math.PI * luks + seed) * wid * 0.34 * (0.25 + 0.75 * t);
  const wdt = (t: number) => wid * (0.1 + 0.9 * Math.pow(t, 0.65));
  const g = ctx.createLinearGradient(0, 0, len, 0);
  g.addColorStop(0, "#fff6d8");
  g.addColorStop(0.3, "#ffd75e");
  g.addColorStop(0.65, "#ff9d3d");
  g.addColorStop(1, "#d63a2a");
  ctx.fillStyle = g;
  ctx.strokeStyle = "rgba(120,30,15,0.9)";
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  for (let i = 0; i <= STEPS; i++) {
    const t = i / STEPS;
    const x = t * len;
    const y = cx(t) - wdt(t) / 2;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  for (let i = STEPS; i >= 0; i--) {
    const t = i / STEPS;
    ctx.lineTo(t * len, cx(t) + wdt(t) / 2);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // pamor (damascene) wavy lines
  ctx.strokeStyle = "rgba(255,255,240,0.65)";
  ctx.lineWidth = 1.1;
  for (const off of [-0.16, 0.14]) {
    ctx.beginPath();
    for (let i = 0; i <= STEPS; i++) {
      const t = 0.08 + (i / STEPS) * 0.86;
      const x = t * len;
      const y = cx(t) + off * wid;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  // golden tip
  ctx.fillStyle = "#fffbe8";
  ctx.beginPath();
  ctx.arc(1.5, cx(0.02), Math.max(1.2, wid * 0.09), 0, TAU);
  ctx.fill();
}

function drawKerisBullet(ctx: CanvasRenderingContext2D, t: number, seed: number, flash: number) {
  const halo = ctx.createRadialGradient(20, 0, 2, 20, 0, 44);
  halo.addColorStop(0, `rgba(255,200,90,${0.4 + 0.15 * Math.sin(t * 9 + seed)})`);
  halo.addColorStop(1, "rgba(255,140,40,0)");
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(20, 0, 44, 0, TAU);
  ctx.fill();
  kerisBlade(ctx, 44, 13, seed);
  if (flash > 0) {
    ctx.fillStyle = `rgba(255,250,230,${Math.min(1, flash) * 0.75})`;
    ctx.beginPath();
    ctx.ellipse(22, 0, 24, 9, 0, 0, TAU);
    ctx.fill();
  }
}

function drawBlackBullet(ctx: CanvasRenderingContext2D, hue: number, r: number, t: number, seed: number) {
  // light-bending halo
  const halo = ctx.createRadialGradient(0, 0, r * 0.4, 0, 0, r * 3);
  halo.addColorStop(0, hsl(hue, 100, 60, 0.5));
  halo.addColorStop(0.5, hsl(hue + 25, 100, 55, 0.18));
  halo.addColorStop(1, hsl(hue + 40, 100, 55, 0));
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(0, 0, r * 3, 0, TAU);
  ctx.fill();
  // distorted light arcs
  ctx.save();
  ctx.rotate(t * 1.4 + seed);
  ctx.strokeStyle = "rgba(255,255,255,0.5)";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.arc(0, 0, r * 1.9, 0.2, 1.5);
  ctx.stroke();
  ctx.strokeStyle = hsl(hue + 50, 100, 72, 0.55);
  ctx.beginPath();
  ctx.arc(0, 0, r * 1.9, Math.PI + 0.2, Math.PI + 1.5);
  ctx.stroke();
  ctx.restore();
  // accretion ring (tilted)
  ctx.save();
  ctx.rotate(-0.35);
  ctx.scale(1, 0.45);
  ctx.strokeStyle = hsl(hue, 100, 60, 0.9);
  ctx.lineWidth = r * 0.3;
  ctx.beginPath();
  ctx.arc(0, 0, r * 1.4, 0, TAU);
  ctx.stroke();
  ctx.strokeStyle = hsl(hue + 45, 100, 78, 0.95);
  ctx.lineWidth = Math.max(1.2, r * 0.12);
  ctx.beginPath();
  ctx.arc(0, 0, r * 1.4, Math.PI * 0.9, Math.PI * 2.0);
  ctx.stroke();
  const k1 = t * 4.5 + seed;
  ctx.fillStyle = "#fff";
  for (const a of [k1, k1 + (TAU / 3), k1 + (TAU * 2) / 3]) {
    ctx.beginPath();
    ctx.arc(Math.cos(a) * r * 1.4, Math.sin(a) * r * 1.4, Math.max(1, r * 0.14), 0, TAU);
    ctx.fill();
  }
  ctx.restore();
  // event horizon
  const eg = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.1, 0, 0, r);
  eg.addColorStop(0, "#070213");
  eg.addColorStop(1, "#000");
  ctx.fillStyle = eg;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = hsl(hue + 60, 100, 80, 0.95);
  ctx.lineWidth = 2;
  ctx.stroke();
}

function drawYoyoBullet(
  ctx: CanvasRenderingContext2D,
  hue: number,
  r: number,
  t: number,
  seed: number,
  spin: number
) {
  const halo = ctx.createRadialGradient(0, 0, r * 0.3, 0, 0, r * 2.6);
  halo.addColorStop(0, hsl(hue, 100, 62, 0.4));
  halo.addColorStop(1, hsl(hue + 60, 100, 55, 0));
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(0, 0, r * 2.6, 0, TAU);
  ctx.fill();
  ctx.save();
  ctx.rotate(t * spin + seed * 3);
  // two-tone spinning halves
  const g = ctx.createLinearGradient(-r, -r, r, r);
  g.addColorStop(0, hsl(hue, 100, 58));
  g.addColorStop(0.5, hsl(hue + 60, 100, 62));
  g.addColorStop(1, hsl(hue, 100, 50));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.9)";
  ctx.lineWidth = 2;
  ctx.stroke();
  // spin stripes
  ctx.strokeStyle = "rgba(255,255,255,0.75)";
  ctx.lineWidth = 2.4;
  for (let i = 0; i < 3; i++) {
    const a = (i * TAU) / 3;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(a) * r * 0.92, Math.sin(a) * r * 0.92);
    ctx.stroke();
  }
  ctx.restore();
  // axle cap
  const cg = ctx.createRadialGradient(-2, -2, 1, 0, 0, r * 0.42);
  cg.addColorStop(0, "#ffffff");
  cg.addColorStop(0.6, hsl(hue + 30, 90, 70));
  cg.addColorStop(1, hsl(hue + 30, 90, 45));
  ctx.fillStyle = cg;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.4, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.35)";
  ctx.lineWidth = 1.2;
  ctx.stroke();
}

function drawDiamondBullet(
  ctx: CanvasRenderingContext2D,
  r: number,
  t: number,
  seed: number,
  flash = 0
) {
  const halo = ctx.createRadialGradient(0, 0, r * 0.3, 0, 0, r * 2.8);
  halo.addColorStop(0, "rgba(200,235,255,0.55)");
  halo.addColorStop(1, "rgba(140,200,255,0)");
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(0, 0, r * 2.8, 0, TAU);
  ctx.fill();
  // faceted gem: crown + pavilion
  const tw = 0.5 + 0.5 * Math.sin(t * 6 + seed * 5);
  const pts: [number, number][] = [
    [-0.72, -0.42],
    [-0.28, -0.62],
    [0.28, -0.62],
    [0.72, -0.42],
    [1, 0.12],
    [0, 1],
    [-1, 0.12],
  ];
  const x = (i: number) => pts[i][0] * r;
  const y = (i: number) => pts[i][1] * r;
  const facets: [number[], string][] = [
    [[0, 1, 5, 6], "#e8f6ff"],
    [[1, 2, 5], "#ffffff"],
    [[2, 3, 4, 5], "#c4e6ff"],
    [[0, 6, 4, 3], "#9fd4ff"],
  ];
  for (const [idx, col] of facets) {
    ctx.fillStyle = col;
    ctx.beginPath();
    for (let j = 0; j < idx.length; j++) {
      if (j === 0) ctx.moveTo(x(idx[0]), y(idx[0]));
      else ctx.lineTo(x(idx[j]), y(idx[j]));
    }
    ctx.closePath();
    ctx.fill();
  }
  ctx.strokeStyle = "rgba(255,255,255,0.95)";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  pts.forEach(([px, py], i) => {
    if (i === 0) ctx.moveTo(px * r, py * r);
    else ctx.lineTo(px * r, py * r);
  });
  ctx.closePath();
  ctx.stroke();
  // facet lines
  ctx.strokeStyle = "rgba(120,170,220,0.8)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x(1), y(1));
  ctx.lineTo(x(5), y(5));
  ctx.moveTo(x(2), y(2));
  ctx.lineTo(x(5), y(5));
  ctx.moveTo(x(0), y(0));
  ctx.lineTo(x(6), y(6));
  ctx.moveTo(x(3), y(3));
  ctx.lineTo(x(4), y(4));
  ctx.stroke();
  // sparkle cross
  const sa = 0.5 + 0.5 * tw;
  ctx.strokeStyle = `rgba(255,255,255,${sa})`;
  ctx.lineWidth = 1.6;
  const sr = r * (0.9 + tw * 0.5);
  ctx.beginPath();
  ctx.moveTo(-sr, 0);
  ctx.lineTo(sr, 0);
  ctx.moveTo(0, -sr * 0.7);
  ctx.lineTo(0, sr * 0.7);
  ctx.stroke();
  if (flash > 0) {
    ctx.fillStyle = `rgba(255,255,255,${Math.min(1, flash) * 0.7})`;
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.1, 0, TAU);
    ctx.fill();
  }
}

function drawCrystalBullet(
  ctx: CanvasRenderingContext2D,
  t: number,
  seed: number,
  flash = 0,
  scale = 1
) {
  const L = 46 * scale;
  const Wd = 13 * scale;
  const halo = ctx.createRadialGradient(L * 0.4, 0, 2, L * 0.4, 0, 40 * scale);
  halo.addColorStop(0, `rgba(255,150,220,${0.35 + 0.12 * Math.sin(t * 7 + seed)})`);
  halo.addColorStop(0.6, `rgba(120,220,255,${0.18})`);
  halo.addColorStop(1, "rgba(150,120,255,0)");
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(L * 0.4, 0, 40 * scale, 0, TAU);
  ctx.fill();
  // pointed shard: tip at x=-8 (facing -x), base at +x
  const tipX = -8 * scale;
  const baseX = L;
  const g = ctx.createLinearGradient(tipX, 0, baseX, 0);
  g.addColorStop(0, "rgba(255,235,250,0.98)");
  g.addColorStop(0.35, "rgba(255,150,215,0.92)");
  g.addColorStop(0.65, "rgba(130,220,255,0.9)");
  g.addColorStop(1, "rgba(150,120,255,0.85)");
  ctx.fillStyle = g;
  ctx.strokeStyle = "rgba(255,255,255,0.9)";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(tipX, 0);
  ctx.lineTo(baseX * 0.35, -Wd / 2);
  ctx.lineTo(baseX, -Wd * 0.28);
  ctx.lineTo(baseX, Wd * 0.28);
  ctx.lineTo(baseX * 0.35, Wd / 2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // inner light core
  ctx.strokeStyle = "rgba(255,255,255,0.85)";
  ctx.lineWidth = 1.8 * scale;
  ctx.beginPath();
  ctx.moveTo(tipX + 2, 0);
  ctx.lineTo(baseX - 4, 0);
  ctx.stroke();
  // facet shimmer
  ctx.strokeStyle = "rgba(255,255,255,0.5)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(baseX * 0.45, -Wd * 0.32);
  ctx.lineTo(baseX * 0.7, 0);
  ctx.lineTo(baseX * 0.45, Wd * 0.32);
  ctx.stroke();
  if (flash > 0) {
    ctx.fillStyle = `rgba(255,255,255,${Math.min(1, flash) * 0.6})`;
    ctx.beginPath();
    ctx.ellipse(L * 0.45, 0, L * 0.55, 10 * scale, 0, 0, TAU);
    ctx.fill();
  }
}

export class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private bg: HTMLCanvasElement;
  private px = 1;
  private raf = 0;
  private last = 0;
  private time = 0;
  private sfx: Sfx;
  private onUI: (s: UISnap) => void;

  state: GameState = "menu";
  weapon: Weapon = "keris";
  level = 1;
  score = 0;
  best = 0;

  private ammo = 0;
  private queue: number[] = [];
  private shotIdx = 0;
  private stuckCount = 0;
  private pins: Pin[] = [];
  private flying: Rocket[] = [];
  private rot = 0;
  private levelT = 0;
  private spinScale = 1;
  private wheelScale = 1;
  private wheelVisible = true;
  private wheelHue = 45;
  private jolt = 0;
  private pulse = 0;
  private cooldown = 0;
  private recoil = 0;
  private loadP = 1;
  private shake = 0;
  private flash = 0;
  private flashHue = 0;
  private bannerT = 0;
  private ambientT = 1;
  private wpulse = 0;
  private wpullX = 0;
  private wpullY = 0;

  private particles: Particle[] = [];
  private debris: Debris[] = [];
  private glows: Glow[] = [];
  private rings: Ring[] = [];
  private texts: FloatText[] = [];
  private voids: VoidFx[] = [];
  private crystals: CrystalFx[] = [];
  private strings: YoyoString[] = [];
  private starflashes: StarFlash[] = [];
  private timers: { t: number; fn: () => void }[] = [];
  private stars = Array.from({ length: 110 }, () => ({
    x: Math.random() * W,
    y: Math.random() * (H - 120),
    r: rnd(0.4, 1.7),
    ph: Math.random() * TAU,
    sp: rnd(0.8, 3),
  }));

  constructor(canvas: HTMLCanvasElement, sfx: Sfx, onUI: (s: UISnap) => void) {
    this.canvas = canvas;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D tidak didukung di browser ini.");
    this.ctx = ctx;
    this.bg = document.createElement("canvas");
    this.sfx = sfx;
    this.onUI = onUI;
    try {
      this.best = Number(localStorage.getItem("gunhit-best") || 0);
    } catch {
      this.best = 0;
    }
    this.setupLevel(3, true);
    this.setScale(1, 1);
    this.emitUI();
  }

  run() {
    this.last = performance.now();
    const loop = (now: number) => {
      this.raf = requestAnimationFrame(loop);
      try {
        const dt = Math.min((now - this.last) / 1000, 1 / 30);
        this.last = now;
        this.update(dt);
        this.render();
      } catch (err) {
        console.error("[gunhit] frame error (loop continues):", err);
      }
    };
    this.raf = requestAnimationFrame(loop);
  }

  destroy() {
    cancelAnimationFrame(this.raf);
  }

  setScale(scale: number, dpr: number) {
    const s = Number.isFinite(scale) && scale > 0 ? scale : 1;
    const d = Number.isFinite(dpr) && dpr > 0 ? Math.min(dpr, 2.5) : 1;
    this.px = Math.max(0.1, s * d);
    this.canvas.width = Math.max(1, Math.round(W * this.px));
    this.canvas.height = Math.max(1, Math.round(H * this.px));
    this.bg.width = Math.max(1, Math.round(W * this.px));
    this.bg.height = Math.max(1, Math.round(H * this.px));
    this.paintBackground();
  }

  private emitUI() {
    this.onUI({ state: this.state, level: this.level, score: this.score, best: this.best, weapon: this.weapon });
  }

  private wheelHueFor(w: Weapon, level: number): number {
    if (w === "keris") return 42 + ((level * 7) % 14);
    if (w === "blackhole") return 235 + ((level * 37) % 80);
    if (w === "yoyo") return (level * 53) % 360;
    if (w === "diamond") return 205 + ((level * 11) % 15);
    return 295 + ((level * 17) % 40); // crystal
  }

  setWeapon(w: Weapon) {
    if (this.weapon !== w) {
      this.weapon = w;
      for (let i = 0; i < this.queue.length; i++) this.queue[i] = this.ammoHue(i);
      if (this.state === "menu") {
        for (const p of this.pins) {
          p.hue = this.pinHue();
          p.flash = 0;
          p.spin = 0;
        }
        this.wheelHue = this.wheelHueFor(w, this.level);
      }
      this.particles = [];
      this.glows = [];
      this.rings = [];
      this.texts = [];
      this.debris = [];
      this.voids = [];
      this.crystals = [];
      this.strings = [];
      this.starflashes = [];
      this.wpulse = 0;
      this.wpullX = 0;
      this.wpullY = 0;
    }
    this.emitUI();
  }

  private ammoHue(i: number): number {
    if (this.weapon === "blackhole") return 215 + ((i * 53) % 105);
    if (this.weapon === "yoyo") return (i * 61) % 360;
    if (this.weapon === "diamond") return 198 + ((i * 13) % 22);
    if (this.weapon === "crystal") return 285 + ((i * 41) % 90);
    return 38 + ((i * 17) % 22); // keris gold
  }

  private pinHue(): number {
    if (this.weapon === "blackhole") return rnd(210, 320);
    if (this.weapon === "yoyo") return rnd(0, 360);
    if (this.weapon === "diamond") return rnd(195, 220);
    if (this.weapon === "crystal") return rnd(280, 375);
    return rnd(32, 58);
  }

  // ------------------------------------------------------------ game flow
  startGame() {
    this.sfx.start();
    this.score = 0;
    this.level = 1;
    this.setupLevel(1);
    this.state = "playing";
    this.emitUI();
  }

  private setupLevel(level: number, demo = false) {
    this.level = level;
    const table = [0, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7];
    const pre = table[Math.min(level - 1, table.length - 1)];
    const total = Math.min(6 + Math.floor(level * 0.8), 14);
    this.ammo = total;
    this.shotIdx = 0;
    this.stuckCount = 0;
    this.flying = [];
    this.pins = [];
    this.levelT = 0;
    this.spinScale = 1;
    this.wheelScale = 0.15;
    this.wheelVisible = true;
    this.wheelHue = this.wheelHueFor(this.weapon, level);
    this.rot = rnd(0, TAU);
    this.cooldown = 0;
    this.loadP = 0;
    this.wpullX = 0;
    this.wpullY = 0;
    this.queue = Array.from({ length: total }, (_, i) => this.ammoHue(i));

    let guard = 0;
    while (this.pins.length < pre && guard++ < 200) {
      const a = rnd(0, TAU);
      if (this.pins.every((p) => Math.abs(angDiff(p.a, a)) > 0.6)) {
        this.pins.push({ a, hue: this.pinHue(), seed: rnd(0, 10), flash: 0, spin: 0 });
      }
    }
    if (demo) this.ammo = 0;
  }

  private omega(): number {
    if (this.state === "menu") return 1.0;
    const L = this.level;
    const t = this.levelT;
    const s = Math.min(1.1 + L * 0.13, 3.3);
    const dir = L % 2 === 0 ? 1 : -1;
    const p = L === 1 ? 0 : (L - 2) % 5;
    switch (p) {
      case 0:
        return dir * s;
      case 1:
        return dir * s * (0.35 + 0.9 * Math.abs(Math.sin(t * 1.1)));
      case 2:
        return s * 1.2 * Math.sin(t * 1.0 + 0.5);
      case 3:
        return dir * s * (1 + 0.6 * Math.sin(t * 2.6));
      default:
        return s * 1.1 * Math.tanh(Math.sin(t * 1.4) * 4);
    }
  }

  fire() {
    if (this.state !== "playing" || this.ammo <= 0 || this.cooldown > 0 || this.wheelScale < 0.7) return;
    const hue = this.queue[this.shotIdx];
    this.shotIdx++;
    this.ammo--;
    this.flying.push({ y: GUNY - 24, x: CX, hue, seed: rnd(0, 10), age: 0, phase: 0, spinT: 0 });
    this.cooldown = 0.14;
    this.recoil = 1;
    this.loadP = 0;
    const w = this.weapon;
    this.sfx.shoot(w);
    this.shake = Math.max(this.shake, w === "blackhole" ? 3.5 : w === "yoyo" ? 2.5 : w === "diamond" ? 3 : w === "crystal" ? 3 : 4);

    if (w === "keris") {
      // golden slash burst from the hidden barrel
      for (let i = 0; i < 20; i++) {
        const a = -Math.PI / 2 + rnd(-0.5, 0.5);
        const sp = rnd(2.5, 8);
        this.spawn(CX + rnd(-8, 8), GUNY - 26, Math.cos(a) * sp, Math.sin(a) * sp, {
          life: rnd(0.25, 0.55),
          size: rnd(1.3, 2.6),
          h: rnd(32, 55),
          s: 100,
          l: i % 4 === 0 ? 90 : 65,
          g: 0.06,
          d: 0.93,
        });
      }
      this.glows.push({ x: CX, y: GUNY - 26, hue: 46, life: 0.3, max: 0.3, r: 80 });
      this.rings.push({ x: CX, y: GUNY - 26, hue: 46, life: 0.35, max: 0.35, r: 44 });
    } else if (w === "blackhole") {
      for (let i = 0; i < 16; i++) {
        const a = rnd(0, TAU);
        const rr = rnd(14, 44);
        const sx = CX + Math.cos(a) * rr;
        const sy = GUNY - 18 + Math.sin(a) * rr * 0.7;
        this.spawn(sx, sy, -Math.cos(a) * rnd(2, 4.5), -Math.sin(a) * rnd(2, 4.5), {
          life: rnd(0.2, 0.4),
          size: rnd(1.4, 2.4),
          h: hue + rnd(-25, 25),
          l: 75,
          g: 0,
          d: 0.93,
          ax: CX,
          ay: GUNY - 18,
          pull: 5,
        });
      }
      this.glows.push({ x: CX, y: GUNY - 20, hue, life: 0.25, max: 0.25, r: 80 });
      this.rings.push({ x: CX, y: GUNY - 18, hue: hue + 40, life: 0.35, max: 0.35, r: 46, impl: true });
    } else if (w === "yoyo") {
      // springy launch puff + string snap sparkle
      for (let i = 0; i < 14; i++) {
        const a = -Math.PI / 2 + rnd(-0.6, 0.6);
        const sp = rnd(2, 7);
        this.spawn(CX + rnd(-8, 8), GUNY - 20, Math.cos(a) * sp, Math.sin(a) * sp, {
          life: rnd(0.25, 0.5),
          size: rnd(1.3, 2.4),
          h: hue + rnd(-40, 40),
          s: 100,
          l: 68,
          g: 0.08,
          d: 0.93,
        });
      }
      this.glows.push({ x: CX, y: GUNY - 22, hue, life: 0.28, max: 0.28, r: 70 });
      this.rings.push({ x: CX, y: GUNY - 22, hue: hue + 60, life: 0.32, max: 0.32, r: 40 });
    } else if (w === "diamond") {
      for (let i = 0; i < 18; i++) {
        const a = -Math.PI / 2 + rnd(-0.5, 0.5);
        const sp = rnd(2.5, 9);
        this.spawn(CX + rnd(-7, 7), GUNY - 22, Math.cos(a) * sp, Math.sin(a) * sp, {
          life: rnd(0.25, 0.55),
          size: rnd(1.2, 2.3),
          h: i % 3 === 0 ? 0 : rnd(195, 220),
          s: i % 3 === 0 ? 0 : 85,
          l: i % 3 === 0 ? 96 : 76,
          g: 0.04,
          d: 0.93,
        });
      }
      this.starflashes.push({ x: CX, y: GUNY - 24, life: 0.35, max: 0.35, r: 26, rot: rnd(0, TAU), spd: 2, hue: 210 });
      this.glows.push({ x: CX, y: GUNY - 22, hue: 205, life: 0.3, max: 0.3, r: 85 });
    } else {
      // crystal — soft rainbow shimmer burst
      for (let i = 0; i < 22; i++) {
        const a = -Math.PI / 2 + rnd(-0.55, 0.55);
        const sp = rnd(2, 8);
        this.spawn(CX + rnd(-8, 8), GUNY - 22, Math.cos(a) * sp, Math.sin(a) * sp, {
          life: rnd(0.3, 0.65),
          size: rnd(1.3, 2.5),
          h: 285 + rnd(0, 110),
          s: 95,
          l: 72,
          g: 0.03,
          d: 0.94,
        });
      }
      this.glows.push({ x: CX, y: GUNY - 22, hue: 300, life: 0.35, max: 0.35, r: 90 });
      this.rings.push({ x: CX, y: GUNY - 22, hue: 320, life: 0.4, max: 0.4, r: 50 });
    }
    this.wpulse = Math.min(1, this.wpulse + 0.4);
  }

  private collide(): boolean {
    const down = Math.PI / 2;
    const thr = this.weapon === "yoyo" ? 0.13 : THR;
    for (const p of this.pins) {
      if (Math.abs(angDiff(p.a + this.rot, down)) < thr) return true;
    }
    return false;
  }

  private stick(r: Rocket) {
    const a = Math.PI / 2 - this.rot;
    const w = this.weapon;
    this.pins.push({ a, hue: r.hue, seed: r.seed, flash: 1, spin: w === "yoyo" ? 1 : 0 });
    this.stuckCount++;
    this.score++;
    this.jolt = 1;
    this.pulse = 1;
    this.sfx.hit(w, this.stuckCount - 1);
    this.shake = Math.max(this.shake, w === "blackhole" ? 6 : 4.5);
    const bx = CX;
    const by = CY + R + 8;

    if (w === "keris") {
      this.flash = 0.2;
      this.flashHue = 46;
      this.kerisBurst(bx, by, 1);
      this.texts.push({ x: bx + rnd(-30, 30), y: by + 34, text: "+1", hue: 46, life: 0.9 });
    } else if (w === "blackhole") {
      this.flash = 0.25;
      this.flashHue = r.hue;
      this.voidBurst(bx, by + 18, r.hue, 0.85);
      // wheel gets tugged toward the impact point
      const dx = bx - CX;
      const dy = by + 18 - CY;
      const d = Math.hypot(dx, dy) || 1;
      this.wpullX += (dx / d) * 9;
      this.wpullY += (dy / d) * 9;
      this.texts.push({ x: bx + rnd(-30, 30), y: by + 30, text: "+1", hue: r.hue, life: 0.9 });
    } else if (w === "yoyo") {
      this.flash = 0.18;
      this.flashHue = r.hue;
      this.yoyoBurst(bx, by, r.hue, 1);
      this.texts.push({ x: bx + rnd(-30, 30), y: by + 32, text: "+1", hue: r.hue, life: 0.9 });
    } else if (w === "diamond") {
      this.flash = 0.22;
      this.flashHue = 205;
      this.diamondBurst(bx, by, 1);
      this.texts.push({ x: bx + rnd(-30, 30), y: by + 32, text: "+1", hue: 205, life: 0.9 });
    } else {
      this.flash = 0.2;
      this.flashHue = 305;
      this.crystalBloom(bx, by, 1);
      this.texts.push({ x: bx + rnd(-30, 30), y: by + 32, text: "+1", hue: 305, life: 0.9 });
    }
    this.wpulse = Math.min(1, this.wpulse + 0.55);
    this.emitUI();
  }

  private failRocket(r: Rocket) {
    this.state = "failing";
    const w = this.weapon;
    this.sfx.fail(w);
    this.shake = 20;
    this.flash = 0.7;
    this.flashHue = w === "keris" ? 42 : w === "blackhole" ? 280 : w === "yoyo" ? r.hue : w === "diamond" ? 205 : 300;
    const px = CX;
    const py = Math.max(r.y, CY + R);
    this.debris.push({
      kind: "rocket",
      x: px,
      y: py + 20,
      vx: rnd(-260, 260),
      vy: 380,
      rot: Math.PI / 2,
      vr: rnd(-12, 12),
      hue: r.hue,
      a0: 0,
      life: 2.5,
      seed: r.seed,
    });
    if (w === "keris") {
      this.kerisBurst(px, py, 1.2);
    } else if (w === "blackhole") {
      this.voidBurst(px, py, 280, 1.0);
      this.glows.push({ x: px, y: py, hue: 275, life: 0.5, max: 0.5, r: 130 });
    } else if (w === "yoyo") {
      this.yoyoBurst(px, py, r.hue, 1.2);
    } else if (w === "diamond") {
      this.diamondBurst(px, py, 1.2);
    } else {
      this.crystalBloom(px, py, 1.2);
    }
    for (const o of this.flying) {
      if (o === r) continue;
      this.debris.push({
        kind: "rocket",
        x: CX,
        y: o.y,
        vx: rnd(-200, 200),
        vy: 200,
        rot: Math.PI / 2,
        vr: rnd(-10, 10),
        hue: o.hue,
        a0: 0,
        life: 2.2,
        seed: o.seed,
      });
    }
    this.flying = [];
    if (this.score > this.best) {
      this.best = this.score;
      try {
        localStorage.setItem("gunhit-best", String(this.best));
      } catch {
        /* ignore */
      }
    }
    this.at(1.15, () => {
      this.state = "over";
      this.emitUI();
    });
    this.emitUI();
  }

  private clearLevel() {
    this.state = "clear";
    this.bannerT = 0;
    const w = this.weapon;
    this.sfx.clear(w);
    this.flash = 0.55;
    this.flashHue = w === "keris" ? 44 : w === "blackhole" ? 270 : w === "yoyo" ? (this.time * 120) % 360 : w === "diamond" ? 205 : 305;
    this.shake = 14;
    this.wheelVisible = false;
    this.score += 3;
    if (this.score > this.best) {
      this.best = this.score;
      try {
        localStorage.setItem("gunhit-best", String(this.best));
      } catch {
        /* ignore */
      }
    }
    const N = 10;
    const scatter = w === "blackhole" ? 0.4 : 1;
    for (let i = 0; i < N; i++) {
      const a0 = (i * TAU) / N;
      const am = a0 + TAU / N / 2;
      this.debris.push({
        kind: "wedge",
        x: CX,
        y: CY,
        vx: Math.cos(am) * rnd(120, 320) * scatter,
        vy: Math.sin(am) * rnd(120, 320) * scatter - 220 * scatter,
        rot: 0,
        vr: rnd(-4, 4),
        hue: this.wheelHue + i * 12,
        a0,
        life: 2.2,
        seed: i,
      });
    }
    for (const p of this.pins) {
      const wa = p.a + this.rot;
      this.debris.push({
        kind: "rocket",
        x: CX + Math.cos(wa) * (R + 18),
        y: CY + Math.sin(wa) * (R + 18),
        vx: Math.cos(wa) * rnd(200, 420) * scatter,
        vy: Math.sin(wa) * rnd(200, 420) * scatter - 200 * scatter,
        rot: wa,
        vr: rnd(-8, 8),
        hue: p.hue,
        a0: 0,
        life: 2.2,
        seed: p.seed,
      });
    }
    this.pins = [];
    if (w === "keris") {
      this.kerisBurst(CX, CY, 1.8);
      this.kerisBurst(CX - 60, CY + 30, 1.0);
      this.kerisBurst(CX + 60, CY + 30, 1.0);
      this.glows.push({ x: CX, y: CY, hue: 44, life: 0.9, max: 0.9, r: 280 });
    } else if (w === "blackhole") {
      this.voids.push({ x: CX, y: CY, hue: 270, life: 2.1, max: 2.1, r: 150, popped: false });
      this.voids.push({ x: CX, y: CY, hue: 300, life: 1.4, max: 1.4, r: 90, popped: false });
      this.rings.push({ x: CX, y: CY, hue: 270, life: 1.1, max: 1.1, r: 330, impl: true });
      this.rings.push({ x: CX, y: CY, hue: 275, life: 0.9, max: 0.9, r: 280 });
      this.glows.push({ x: CX, y: CY, hue: 275, life: 1.2, max: 1.2, r: 300 });
      for (let i = 0; i < 110; i++) {
        const a = rnd(0, TAU);
        const rr = rnd(120, 300);
        const sx = CX + Math.cos(a) * rr;
        const sy = CY + Math.sin(a) * rr * 0.8;
        const sp = rnd(3, 7);
        this.spawn(sx, sy, -Math.cos(a) * sp - Math.sin(a) * sp * 0.9, -Math.sin(a) * sp + Math.cos(a) * sp * 0.9, {
          life: rnd(0.7, 1.4),
          size: rnd(1.6, 2.8),
          h: 215 + rnd(0, 105),
          l: 70,
          g: 0,
          d: 0.955,
          ax: CX,
          ay: CY,
          pull: 6,
        });
      }
    } else if (w === "yoyo") {
      for (let i = 0; i < 5; i++) {
        this.at(i * 0.18, () => {
          const a = rnd(0, TAU);
          this.yoyoBurst(CX + Math.cos(a) * 60, CY + Math.sin(a) * 60, rnd(0, 360), 1.2);
          this.shake = Math.max(this.shake, 6);
        });
      }
      this.glows.push({ x: CX, y: CY, hue: 40, life: 0.9, max: 0.9, r: 280 });
    } else if (w === "diamond") {
      this.diamondBurst(CX, CY, 1.9);
      this.diamondBurst(CX - 70, CY + 30, 1.1);
      this.diamondBurst(CX + 70, CY + 30, 1.1);
      this.starflashes.push({ x: CX, y: CY, life: 0.9, max: 0.9, r: 60, rot: 0, spd: 1.5, hue: 210 });
      this.glows.push({ x: CX, y: CY, hue: 205, life: 0.9, max: 0.9, r: 300 });
    } else {
      this.crystalBloom(CX, CY, 1.9);
      this.crystalBloom(CX - 70, CY + 30, 1.1);
      this.crystalBloom(CX + 70, CY + 30, 1.1);
      this.glows.push({ x: CX, y: CY, hue: 300, life: 0.9, max: 0.9, r: 300 });
    }
    this.wpulse = 1;

    for (let i = 0; i < 6; i++) {
      this.at(0.3 + i * 0.3 + rnd(0, 0.1), () => this.skyShow(rnd(0.85, 1.2)));
    }
    this.at(2.5, () => {
      this.setupLevel(this.level + 1);
      this.state = "playing";
      this.emitUI();
    });
    this.emitUI();
  }

  private at(t: number, fn: () => void) {
    this.timers.push({ t, fn });
  }

  // ------------------------------------------------------------ particles
  private spawn(x: number, y: number, vx: number, vy: number, o: Partial<Particle>) {
    if (this.particles.length > 3600) return;
    const life = o.life ?? 1.2;
    this.particles.push({
      x,
      y,
      vx,
      vy,
      life,
      max: life,
      size: o.size ?? 2,
      h: o.h ?? 0,
      s: o.s ?? 100,
      l: o.l ?? 60,
      g: o.g ?? 0.05,
      d: o.d ?? 0.96,
      tr: o.tr ?? 2.5,
      tw: o.tw ?? true,
      ax: o.ax ?? 0,
      ay: o.ay ?? 0,
      pull: o.pull ?? 0,
    });
  }

  // KERIS impact — gold sparks + thin mystic aura rings
  private kerisBurst(x: number, y: number, scale = 1) {
    const n = Math.round(46 * scale);
    for (let i = 0; i < n; i++) {
      const a = rnd(0, TAU);
      const sp = rnd(2, 6.5) * scale;
      const bright = Math.random() < 0.3;
      this.spawn(x, y, Math.cos(a) * sp, Math.sin(a) * sp, {
        life: rnd(0.5, 1.0),
        size: rnd(1.4, 2.6),
        h: bright ? rnd(46, 56) : rnd(28, 46),
        s: 100,
        l: bright ? 88 : rnd(58, 70),
        g: 0.05,
        d: 0.955,
        tr: 2.6,
      });
    }
    // rising embers
    for (let i = 0; i < Math.round(10 * scale); i++) {
      this.spawn(x + rnd(-14, 14), y + rnd(-4, 8), rnd(-0.6, 0.6), rnd(-2.5, -1), {
        life: rnd(0.6, 1.1),
        size: rnd(1.1, 1.9),
        h: rnd(38, 52),
        s: 100,
        l: 66,
        g: -0.015,
        d: 0.97,
      });
    }
    this.spawn(x, y, 0, 0, { life: 0.2, size: 20 * scale, h: 48, l: 92, d: 1, g: 0, tr: 0, tw: false });
    this.rings.push({ x, y, hue: 46, life: 0.5, max: 0.5, r: 95 * scale });
    this.rings.push({ x, y, hue: 32, life: 0.65, max: 0.65, r: 130 * scale });
    this.glows.push({ x, y, hue: 44, life: 0.45, max: 0.45, r: 120 * scale + 20 });
  }

  // BLACK HOLE impact — void sucks particles, then soft burst
  private voidBurst(x: number, y: number, hue: number, scale = 1) {
    const h = 215 + ((((hue - 215) % 105) + 105) % 105);
    this.voids.push({ x, y, hue: h, life: 0.9, max: 0.9, r: 60 * scale + 16, popped: false });
    this.rings.push({ x, y, hue: h, life: 0.5, max: 0.5, r: 135 * scale, impl: true });
    this.glows.push({ x, y, hue: h, life: 0.6, max: 0.6, r: 140 * scale + 20 });
    const n = Math.round(48 * scale);
    for (let i = 0; i < n; i++) {
      const a = rnd(0, TAU);
      const rr = rnd(70, 160) * scale;
      const sx = x + Math.cos(a) * rr;
      const sy = y + Math.sin(a) * rr;
      const sp = rnd(3.5, 6.5);
      this.spawn(sx, sy, -Math.cos(a) * sp - Math.sin(a) * sp * 0.9, -Math.sin(a) * sp + Math.cos(a) * sp * 0.9, {
        life: rnd(0.45, 0.75),
        size: rnd(1.6, 2.6),
        h: h + rnd(-30, 30),
        l: 70,
        g: 0,
        d: 0.94,
        ax: x,
        ay: y,
        pull: 6,
      });
    }
  }

  private voidSoftBurst(x: number, y: number, hue: number, scale: number) {
    this.spawn(x, y, 0, 0, { life: 0.22, size: 20 * scale, h: hue + 45, s: 70, l: 92, d: 1, g: 0, tr: 0, tw: false });
    this.glows.push({ x, y, hue: hue + 40, life: 0.35, max: 0.35, r: 110 * scale });
    const m = Math.round(30 * scale);
    const dir = Math.random() < 0.5 ? 1 : -1;
    for (let i = 0; i < m; i++) {
      const a = rnd(0, TAU);
      const sp = rnd(2.5, 5.5) * scale;
      this.spawn(
        x + Math.cos(a) * 10,
        y + Math.sin(a) * 10,
        Math.cos(a) * sp * 0.45 - Math.sin(a) * sp * dir,
        Math.sin(a) * sp * 0.45 + Math.cos(a) * sp * dir,
        {
          life: rnd(0.6, 1.1),
          size: rnd(1.5, 2.4),
          h: hue + rnd(-25, 35),
          l: 68,
          g: 0,
          d: 0.958,
          ax: x,
          ay: y,
          pull: 1.2,
        }
      );
    }
    this.rings.push({ x, y, hue: hue + 30, life: 0.4, max: 0.4, r: 90 * scale });
    this.shake = Math.max(this.shake, 5 * scale);
  }

  // YOYO impact — colorful sparks + fast spin handled by pin.spin
  private yoyoBurst(x: number, y: number, hue: number, scale = 1) {
    const n = Math.round(52 * scale);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU;
      const sp = rnd(2.5, 6) * scale;
      this.spawn(x, y, Math.cos(a) * sp, Math.sin(a) * sp, {
        life: rnd(0.5, 0.95),
        size: rnd(1.5, 2.6),
        h: hue + (i / n) * 160,
        s: 100,
        l: 66,
        g: 0.05,
        d: 0.955,
        tr: 2.6,
      });
    }
    this.spawn(x, y, 0, 0, { life: 0.2, size: 20 * scale, h: 0, s: 0, l: 96, d: 1, g: 0, tr: 0, tw: false });
    this.rings.push({ x, y, hue, life: 0.45, max: 0.45, r: 95 * scale });
    this.rings.push({ x, y, hue: hue + 80, life: 0.55, max: 0.55, r: 125 * scale });
    this.glows.push({ x, y, hue, life: 0.45, max: 0.45, r: 130 * scale + 20 });
  }

  // DIAMOND impact — shard debris + star flash
  private diamondBurst(x: number, y: number, scale = 1) {
    for (let i = 0; i < Math.round(8 * scale); i++) {
      const a = rnd(0, TAU);
      const sp = rnd(150, 380) * scale;
      this.debris.push({
        kind: "shard",
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 160 * scale,
        rot: rnd(0, TAU),
        vr: rnd(-12, 12),
        hue: rnd(195, 220),
        a0: rnd(3, 6) * scale,
        life: rnd(0.9, 1.6),
        seed: rnd(0, 10),
      });
    }
    for (let i = 0; i < Math.round(26 * scale); i++) {
      const a = rnd(0, TAU);
      const sp = rnd(2.5, 7.5) * scale;
      const white = Math.random() < 0.4;
      this.spawn(x, y, Math.cos(a) * sp, Math.sin(a) * sp, {
        life: rnd(0.4, 0.85),
        size: rnd(1.2, 2.2),
        h: white ? 0 : rnd(195, 215),
        s: white ? 0 : 85,
        l: white ? 97 : 78,
        g: 0.05,
        d: 0.955,
        tr: 2.8,
      });
    }
    this.starflashes.push({ x, y, life: 0.55, max: 0.55, r: 34 * scale, rot: rnd(0, TAU), spd: 2.5, hue: 208 });
    this.rings.push({ x, y, hue: 208, life: 0.45, max: 0.45, r: 100 * scale });
    this.glows.push({ x, y, hue: 205, life: 0.45, max: 0.45, r: 140 * scale + 20 });
  }

  // CRYSTAL impact — crystals grow briefly, then shatter
  private crystalBloom(x: number, y: number, scale = 1) {
    this.crystals.push({ x, y, life: 0.95, max: 0.95, seed: rnd(0, 10), popped: false });
    for (let i = 0; i < Math.round(20 * scale); i++) {
      const a = rnd(0, TAU);
      const sp = rnd(1.5, 5) * scale;
      this.spawn(x, y, Math.cos(a) * sp, Math.sin(a) * sp, {
        life: rnd(0.5, 1.0),
        size: rnd(1.4, 2.4),
        h: 285 + rnd(0, 110),
        s: 95,
        l: 72,
        g: 0.02,
        d: 0.955,
      });
    }
    this.glows.push({ x, y, hue: 305, life: 0.5, max: 0.5, r: 130 * scale + 20 });
    this.rings.push({ x, y, hue: 315, life: 0.5, max: 0.5, r: 100 * scale });
  }

  private crystalShatter(x: number, y: number, scale: number) {
    for (let i = 0; i < Math.round(7 * scale); i++) {
      const a = rnd(0, TAU);
      const sp = rnd(140, 360) * scale;
      this.debris.push({
        kind: "shard",
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 180 * scale,
        rot: rnd(0, TAU),
        vr: rnd(-14, 14),
        hue: 285 + rnd(0, 110),
        a0: rnd(2.5, 5) * scale,
        life: rnd(0.8, 1.5),
        seed: rnd(0, 10),
      });
    }
    this.starflashes.push({ x, y, life: 0.45, max: 0.45, r: 28 * scale, rot: rnd(0, TAU), spd: 3, hue: 310 });
    for (let i = 0; i < 12; i++) {
      const a = rnd(0, TAU);
      const sp = rnd(2, 6);
      this.spawn(x, y, Math.cos(a) * sp, Math.sin(a) * sp, {
        life: rnd(0.4, 0.8),
        size: rnd(1.2, 2.1),
        h: 290 + rnd(0, 100),
        s: 95,
        l: 75,
        g: 0.05,
        d: 0.95,
      });
    }
    this.shake = Math.max(this.shake, 3 * scale);
  }

  private skyShow(scale: number) {
    const w = this.weapon;
    this.sfx.sky(w);
    if (w === "keris") {
      this.kerisBurst(rnd(60, W - 60), rnd(80, 320), scale * 0.9);
    } else if (w === "blackhole") {
      this.voidBurst(rnd(60, W - 60), rnd(80, 320), rnd(215, 320), scale);
      this.shake = Math.max(this.shake, 2);
    } else if (w === "yoyo") {
      this.yoyoBurst(rnd(60, W - 60), rnd(80, 320), rnd(0, 360), scale);
    } else if (w === "diamond") {
      this.diamondBurst(rnd(60, W - 60), rnd(80, 320), scale * 0.9);
    } else {
      this.crystalBloom(rnd(60, W - 60), rnd(80, 320), scale);
    }
  }

  private drawVoids() {
    const ctx = this.ctx;
    for (const v of this.voids) {
      const k = Math.max(0, v.life / v.max);
      const p = 1 - k;
      const r = v.r * (0.25 + 0.75 * Math.min(1, p * 3.2));
      const a = k < 0.65 ? k / 0.65 : 1;
      const lh = ctx.createRadialGradient(v.x, v.y, r * 0.9, v.x, v.y, r * 1.9);
      lh.addColorStop(0, hsl(v.hue, 100, 65, 0.35 * a));
      lh.addColorStop(0.5, hsl(v.hue + 30, 100, 60, 0.12 * a));
      lh.addColorStop(1, hsl(v.hue, 100, 55, 0));
      ctx.fillStyle = lh;
      ctx.beginPath();
      ctx.arc(v.x, v.y, r * 1.9, 0, TAU);
      ctx.fill();
      const g = ctx.createRadialGradient(v.x, v.y, 0, v.x, v.y, r);
      g.addColorStop(0, `rgba(0,0,4,${0.97 * a})`);
      g.addColorStop(0.72, `rgba(6,1,20,${0.94 * a})`);
      g.addColorStop(0.88, hsl(v.hue, 100, 60, 0.9 * a));
      g.addColorStop(1, hsl(v.hue, 100, 55, 0));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(v.x, v.y, r, 0, TAU);
      ctx.fill();
      ctx.save();
      ctx.translate(v.x, v.y);
      ctx.save();
      ctx.rotate(-0.35);
      ctx.scale(1, 0.42);
      ctx.strokeStyle = hsl(v.hue, 100, 58, 0.75 * a);
      ctx.lineWidth = Math.max(2, r * 0.22);
      ctx.beginPath();
      ctx.arc(0, 0, r * 1.12, 0, TAU);
      ctx.stroke();
      ctx.strokeStyle = hsl(v.hue + 45, 100, 80, 0.9 * a);
      ctx.lineWidth = Math.max(1.2, r * 0.08);
      ctx.beginPath();
      ctx.arc(0, 0, r * 1.12, Math.PI * 0.9, Math.PI * 2.0);
      ctx.stroke();
      ctx.restore();
      ctx.rotate(this.time * 7);
      ctx.strokeStyle = `rgba(255,255,255,${0.8 * a})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.88, 0, Math.PI * 1.1);
      ctx.stroke();
      ctx.strokeStyle = hsl(v.hue + 50, 100, 75, 0.85 * a);
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.88, Math.PI, Math.PI * 2.1);
      ctx.stroke();
      ctx.restore();
    }
  }

  private drawCrystals() {
    const ctx = this.ctx;
    for (const c of this.crystals) {
      const k = Math.max(0, c.life / c.max);
      const grow = 1 - k; // 0 -> 1
      const sc = grow < 0.45 ? grow / 0.45 : 1;
      const ease = 1 - Math.pow(1 - sc, 3);
      const a = k < 0.3 ? k / 0.3 : 1;
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.globalAlpha = a;
      for (let i = 0; i < 5; i++) {
        const an = c.seed + (i * TAU) / 5;
        const len = (14 + (i % 3) * 9) * ease;
        if (len <= 0.5) continue;
        const hue = 285 + ((i * 37 + c.seed * 20) % 110);
        ctx.save();
        ctx.rotate(an);
        const g = ctx.createLinearGradient(0, 0, len, 0);
        g.addColorStop(0, hsl(hue, 90, 72, 0.95));
        g.addColorStop(0.6, hsl(hue + 20, 95, 64, 0.9));
        g.addColorStop(1, hsl(hue + 45, 95, 58, 0.75));
        ctx.fillStyle = g;
        ctx.strokeStyle = "rgba(255,255,255,0.85)";
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(len * 0.72, -4.5 * ease - 0.5);
        ctx.lineTo(len, 0);
        ctx.lineTo(len * 0.72, 4.5 * ease + 0.5);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.strokeStyle = "rgba(255,255,255,0.7)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(2, 0);
        ctx.lineTo(len * 0.9, 0);
        ctx.stroke();
        ctx.restore();
      }
      // heart glow
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      const hg = ctx.createRadialGradient(0, 0, 0, 0, 0, 26 * ease + 4);
      hg.addColorStop(0, `rgba(255,190,235,${0.6 * a})`);
      hg.addColorStop(1, "rgba(150,120,255,0)");
      ctx.fillStyle = hg;
      ctx.beginPath();
      ctx.arc(0, 0, 26 * ease + 4, 0, TAU);
      ctx.fill();
      ctx.restore();
      ctx.restore();
    }
  }

  private drawStrings() {
    const ctx = this.ctx;
    for (const s of this.strings) {
      const k = Math.max(0, s.life / s.max);
      const wob = Math.sin(this.time * 22 + s.x0) * 6 * k;
      const mx = (s.x0 + s.x1) / 2 + wob;
      const my = (s.y0 + s.y1) / 2;
      ctx.strokeStyle = hsl(s.hue, 90, 72, 0.85 * k);
      ctx.lineWidth = 2 * k + 0.6;
      ctx.beginPath();
      ctx.moveTo(s.x0, s.y0);
      ctx.quadraticCurveTo(mx, my, s.x1, s.y1);
      ctx.stroke();
      ctx.strokeStyle = `rgba(255,255,255,${0.5 * k})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(s.x0, s.y0);
      ctx.quadraticCurveTo(mx, my, s.x1, s.y1);
      ctx.stroke();
    }
  }

  private drawStarFlashes() {
    const ctx = this.ctx;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const s of this.starflashes) {
      const k = Math.max(0, s.life / s.max);
      const r = s.r * (0.6 + 0.4 * k);
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(s.rot + (1 - k) * s.spd);
      for (let i = 0; i < 4; i++) {
        const a = (i * TAU) / 4;
        const len = r * (i % 2 === 0 ? 1 : 0.45);
        const g = ctx.createLinearGradient(0, 0, Math.cos(a) * len, Math.sin(a) * len);
        g.addColorStop(0, `rgba(255,255,255,${0.95 * k})`);
        g.addColorStop(0.5, hsl(s.hue, 90, 80, 0.7 * k));
        g.addColorStop(1, hsl(s.hue, 90, 70, 0));
        ctx.strokeStyle = g;
        ctx.lineWidth = (i % 2 === 0 ? 5 : 3) * k + 0.8;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(a) * len, Math.sin(a) * len);
        ctx.stroke();
      }
      ctx.fillStyle = `rgba(255,255,255,${0.9 * k})`;
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.22, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }

  // ------------------------------------------------------------ update
  private update(dt: number) {
    this.time += dt;
    const f = dt * 60;

    for (let i = this.timers.length - 1; i >= 0; i--) {
      const t = this.timers[i];
      t.t -= dt;
      if (t.t <= 0) {
        this.timers.splice(i, 1);
        t.fn();
      }
    }

    this.levelT += dt;
    if (this.state === "failing" || this.state === "over") this.spinScale += (0.12 - this.spinScale) * Math.min(1, dt * 2.2);
    if (this.wheelVisible) this.rot += this.omega() * this.spinScale * dt;
    this.wheelScale += (1 - this.wheelScale) * Math.min(1, dt * 9);
    this.jolt = Math.max(0, this.jolt - dt * 7);
    this.pulse = Math.max(0, this.pulse - dt * 6);
    this.cooldown = Math.max(0, this.cooldown - dt);
    this.recoil = Math.max(0, this.recoil - dt * 6);
    this.loadP = Math.min(1, this.loadP + dt * 7);
    this.shake = Math.max(0, this.shake - dt * 30);
    this.flash = Math.max(0, this.flash - dt * 1.8);
    this.wpulse = Math.max(0, this.wpulse - dt * 2.2);
    this.wpullX *= 1 - Math.min(1, dt * 3.5);
    this.wpullY *= 1 - Math.min(1, dt * 3.5);
    this.bannerT += dt;

    const w = this.weapon;

    for (const p of this.pins) {
      p.flash = Math.max(0, p.flash - dt * 3.5);
      p.spin = Math.max(0, p.spin - dt * 1.6);
      if (Math.random() < 0.05 * f) {
        const wa = p.a + this.rot;
        if (w === "blackhole") {
          const ox = CX + Math.cos(wa) * (R + 2);
          const oy = CY + Math.sin(wa) * (R + 2);
          const a = rnd(0, TAU);
          this.spawn(ox + Math.cos(a) * 12, oy + Math.sin(a) * 12, -Math.sin(a) * 1.6, Math.cos(a) * 1.6, {
            life: rnd(0.35, 0.6),
            size: 1.5,
            h: p.hue + rnd(-20, 20),
            l: 78,
            g: 0,
            d: 0.94,
            ax: ox,
            ay: oy,
            pull: 2,
          });
        } else if (w === "keris") {
          const rr = R + 26;
          this.spawn(CX + Math.cos(wa) * rr, CY + Math.sin(wa) * rr, rnd(-0.4, 0.4), rnd(-1, -0.2), {
            life: rnd(0.4, 0.8),
            size: rnd(1.1, 1.9),
            h: rnd(36, 54),
            s: 100,
            l: 68,
            g: -0.01,
            d: 0.96,
          });
        } else if (w === "yoyo") {
          const rr = R + 16;
          const sx = CX + Math.cos(wa) * rr;
          const sy = CY + Math.sin(wa) * rr;
          const a = rnd(0, TAU);
          this.spawn(sx, sy, Math.cos(a) * rnd(0.5, 1.6), Math.sin(a) * rnd(0.5, 1.6), {
            life: rnd(0.35, 0.7),
            size: rnd(1.1, 1.9),
            h: p.hue + rnd(-50, 50),
            s: 100,
            l: 70,
            g: 0,
            d: 0.95,
          });
        } else if (w === "diamond") {
          const rr = R + 14;
          this.spawn(CX + Math.cos(wa) * rr + rnd(-6, 6), CY + Math.sin(wa) * rr + rnd(-6, 6), rnd(-0.3, 0.3), rnd(-0.8, -0.2), {
            life: rnd(0.4, 0.8),
            size: rnd(1, 1.8),
            h: Math.random() < 0.4 ? 0 : rnd(198, 218),
            s: Math.random() < 0.4 ? 0 : 85,
            l: 88,
            g: -0.01,
            d: 0.96,
          });
        } else {
          const rr = R + 24;
          this.spawn(CX + Math.cos(wa) * rr, CY + Math.sin(wa) * rr, rnd(-0.4, 0.4), rnd(-0.9, -0.2), {
            life: rnd(0.5, 0.9),
            size: rnd(1.1, 2),
            h: 285 + rnd(0, 110),
            s: 95,
            l: 74,
            g: -0.008,
            d: 0.96,
          });
        }
      }
    }

    // flying projectiles
    for (let i = this.flying.length - 1; i >= 0; i--) {
      const r = this.flying[i];
      const speed = w === "yoyo" ? 1250 : 1500;
      if (!(w === "yoyo" && r.phase === 1)) {
        r.y -= speed * dt;
        r.x = CX + (w === "yoyo" ? Math.sin(r.age * 9 + r.seed * 5) * 2 : 0);
      }
      r.age += dt;

      // trails
      if (w === "keris") {
        for (let k = 0; k < 3; k++) {
          this.spawn(CX + rnd(-5, 5), r.y + 24 + rnd(0, 16), rnd(-0.7, 0.7), rnd(2, 4.5), {
            life: rnd(0.22, 0.5),
            size: rnd(1.3, 2.4),
            h: k === 0 ? rnd(48, 56) : rnd(28, 48),
            s: 100,
            l: k === 0 ? 88 : 64,
            g: 0.02,
            d: 0.92,
            tr: 2.8,
          });
        }
      } else if (w === "blackhole") {
        for (let k = 0; k < 3; k++) {
          const a = rnd(0, TAU);
          const rr = rnd(8, 20);
          this.spawn(
            CX + Math.cos(a) * rr,
            r.y + Math.sin(a) * rr * 0.7,
            -Math.sin(a) * rnd(1.5, 3),
            Math.cos(a) * rnd(1, 2) + rnd(1.5, 3.5),
            {
              life: rnd(0.3, 0.6),
              size: rnd(1.4, 2.4),
              h: r.hue + rnd(-25, 25),
              l: 70,
              g: 0,
              d: 0.93,
              ax: CX,
              ay: r.y,
              pull: 2.5,
            }
          );
        }
      } else if (w === "yoyo") {
        for (let k = 0; k < 2; k++) {
          this.spawn(r.x + rnd(-6, 6), r.y + 16 + rnd(0, 12), rnd(-0.8, 0.8), rnd(1.5, 3.5), {
            life: rnd(0.2, 0.45),
            size: rnd(1.3, 2.3),
            h: r.hue + k * 55 + rnd(-15, 15),
            s: 100,
            l: 68,
            g: 0.05,
            d: 0.92,
          });
        }
        if (r.phase === 1) {
          // spinning at impact: fast colorful sparks
          for (let k = 0; k < 3; k++) {
            const a = rnd(0, TAU);
            const sp = rnd(2, 5.5);
            this.spawn(r.x, r.y, Math.cos(a) * sp, Math.sin(a) * sp, {
              life: rnd(0.25, 0.5),
              size: rnd(1.3, 2.3),
              h: r.hue + rnd(0, 160),
              s: 100,
              l: 68,
              g: 0.04,
              d: 0.93,
            });
          }
          r.spinT -= dt;
          if (r.spinT <= 0) {
            // string snaps back, yoyo stays stuck
            this.strings.push({ x0: CX, y0: GUNY - 10, x1: r.x, y1: r.y, life: 0.4, max: 0.4, hue: r.hue });
            this.flying.splice(i, 1);
            this.stick(r);
            if (this.ammo === 0 && this.flying.length === 0 && this.state === "playing") {
              this.clearLevel();
            }
            continue;
          }
        }
      } else if (w === "diamond") {
        for (let k = 0; k < 2; k++) {
          this.spawn(CX + rnd(-5, 5), r.y + 16 + rnd(0, 14), rnd(-0.6, 0.6), rnd(2, 4), {
            life: rnd(0.2, 0.45),
            size: rnd(1.2, 2.1),
            h: k === 0 ? 0 : rnd(198, 218),
            s: k === 0 ? 0 : 85,
            l: k === 0 ? 97 : 78,
            g: 0.03,
            d: 0.92,
          });
        }
      } else {
        // crystal rainbow trail
        for (let k = 0; k < 3; k++) {
          this.spawn(CX + rnd(-5, 5) + (k - 1) * 3, r.y + 22 + rnd(0, 18), rnd(-0.6, 0.6), rnd(2, 4.5), {
            life: rnd(0.25, 0.55),
            size: rnd(1.3, 2.4),
            h: 280 + ((r.y * 1.2 + k * 45 + this.time * 120) % 130),
            s: 95,
            l: 72,
            g: 0.01,
            d: 0.93,
            tr: 3,
          });
        }
      }

      if (w === "yoyo" && r.phase === 1) continue;
      if (r.y <= CY + R + 40 && this.state === "playing") {
        if (this.collide()) {
          this.flying.splice(i, 1);
          this.failRocket(r);
          break;
        }
      }
      if (r.y <= CY + R - 2) {
        if (w === "yoyo") {
          // yoyo reaches the wheel: spin in place with elastic string, then stick
          r.phase = 1;
          r.spinT = 0.5;
          r.y = CY + R - 2;
          this.sfx.hit("yoyo-spin", 0);
        } else {
          this.flying.splice(i, 1);
          this.stick(r);
          if (this.ammo === 0 && this.flying.length === 0 && this.state === "playing") {
            this.clearLevel();
          }
        }
      } else if (w === "yoyo" && r.phase === 0 && this.state !== "playing" && this.state !== "clear") {
        // safety: never leave a yoyo hanging outside play
      }
    }

    // ambient show on menu / game over
    if (this.state === "menu" || this.state === "over") {
      this.ambientT -= dt;
      if (this.ambientT <= 0) {
        this.skyShow(rnd(0.85, 1.1));
        this.ambientT = rnd(1.1, 2.0);
      }
    }

    // blackhole idle: particles sucked into the muzzle
    if (w === "blackhole" && this.state !== "failing" && this.state !== "over" && Math.random() < 0.6 * f) {
      const a = rnd(0, TAU);
      const rr = rnd(26, 60);
      const sx = CX + Math.cos(a) * rr;
      const sy = GUNY - 18 + Math.sin(a) * rr * 0.7;
      this.spawn(sx, sy, -Math.cos(a) * 2.5, -Math.sin(a) * 2.5, {
        life: rnd(0.3, 0.6),
        size: rnd(1.2, 2),
        h: 215 + rnd(0, 105),
        l: 74,
        g: 0,
        d: 0.94,
        ax: CX,
        ay: GUNY - 18,
        pull: 4,
      });
    }
    // keris idle: faint gold motes rising around the blade
    if (w === "keris" && this.state !== "failing" && this.state !== "over" && Math.random() < 0.35 * f) {
      this.spawn(CX + rnd(-50, 50), rnd(GUNY - 60, H - 80), rnd(-0.2, 0.2), rnd(-0.8, -0.25), {
        life: rnd(0.8, 1.5),
        size: rnd(0.9, 1.8),
        h: rnd(36, 54),
        s: 100,
        l: 68,
        g: -0.008,
        d: 0.99,
        tr: 1.4,
      });
    }
    // diamond idle: occasional glints
    if (w === "diamond" && this.state !== "failing" && this.state !== "over" && Math.random() < 0.3 * f) {
      this.spawn(CX + rnd(-60, 60), rnd(GUNY - 40, H - 60), rnd(-0.3, 0.3), rnd(-0.7, -0.2), {
        life: rnd(0.5, 1.0),
        size: rnd(0.9, 1.7),
        h: Math.random() < 0.5 ? 0 : 208,
        s: Math.random() < 0.5 ? 0 : 85,
        l: 90,
        g: -0.008,
        d: 0.99,
        tr: 1.4,
      });
    }
    // crystal idle: soft rainbow motes
    if (w === "crystal" && this.state !== "failing" && this.state !== "over" && Math.random() < 0.45 * f) {
      this.spawn(CX + rnd(-90, 90), rnd(GUNY - 70, H - 50), rnd(-0.3, 0.3), rnd(-0.8, -0.2), {
        life: rnd(0.8, 1.5),
        size: rnd(1, 2),
        h: 285 + rnd(0, 110),
        s: 95,
        l: 74,
        g: -0.008,
        d: 0.99,
        tr: 1.5,
      });
    }

    // particles (+ black-hole void suction)
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      const dr = Math.pow(p.d, f);
      p.vx *= dr;
      p.vy *= dr;
      if (p.pull > 0) {
        const pk = p.pull * f * 0.0012;
        p.vx += (p.ax - p.x) * pk;
        p.vy += (p.ay - p.y) * pk;
      }
      if (this.voids.length > 0) {
        for (const v of this.voids) {
          const dx = v.x - p.x;
          const dy = v.y - p.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < 62500 && d2 > 36) {
            const d = Math.sqrt(d2);
            const s = (1 - d / 250) * (v.life / v.max) * f * 0.055;
            p.vx += (dx / d) * s;
            p.vy += (dy / d) * s;
            p.vx += (-dy / d) * s * 0.35;
            p.vy += (dx / d) * s * 0.35;
          } else if (d2 <= 36) {
            p.life = Math.min(p.life, 0.08);
          }
        }
      }
      p.vy += p.g * f;
      p.x += p.vx * f;
      p.y += p.vy * f;
      p.life -= dt;
      if (p.life <= 0) {
        this.particles[i] = this.particles[this.particles.length - 1];
        this.particles.pop();
      }
    }

    // debris
    for (let i = this.debris.length - 1; i >= 0; i--) {
      const d = this.debris[i];
      d.vy += 1300 * dt;
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      d.rot += d.vr * dt;
      d.life -= dt;
      if (d.life <= 0 || d.y > H + 100) this.debris.splice(i, 1);
    }

    for (let i = this.glows.length - 1; i >= 0; i--) {
      this.glows[i].life -= dt;
      if (this.glows[i].life <= 0) this.glows.splice(i, 1);
    }
    for (let i = this.rings.length - 1; i >= 0; i--) {
      this.rings[i].life -= dt;
      if (this.rings[i].life <= 0) this.rings.splice(i, 1);
    }
    for (let i = this.voids.length - 1; i >= 0; i--) {
      const v = this.voids[i];
      v.life -= dt;
      if (!v.popped && v.life / v.max < 0.55) {
        v.popped = true;
        this.voidSoftBurst(v.x, v.y, v.hue, v.r / 70);
      }
      if (v.life <= 0) this.voids.splice(i, 1);
    }
    for (let i = this.crystals.length - 1; i >= 0; i--) {
      const c = this.crystals[i];
      c.life -= dt;
      if (!c.popped && c.life / c.max < 0.42) {
        c.popped = true;
        this.crystalShatter(c.x, c.y, 1);
      }
      if (c.life <= 0) this.crystals.splice(i, 1);
    }
    for (let i = this.strings.length - 1; i >= 0; i--) {
      this.strings[i].life -= dt;
      if (this.strings[i].life <= 0) this.strings.splice(i, 1);
    }
    for (let i = this.starflashes.length - 1; i >= 0; i--) {
      this.starflashes[i].life -= dt;
      if (this.starflashes[i].life <= 0) this.starflashes.splice(i, 1);
    }
    for (let i = this.texts.length - 1; i >= 0; i--) {
      const t = this.texts[i];
      t.life -= dt;
      t.y -= 38 * dt;
      if (t.life <= 0) this.texts.splice(i, 1);
    }
  }

  // ------------------------------------------------------------ render
  private paintBackground() {
    const c = this.bg.getContext("2d");
    if (!c) return;
    c.setTransform(this.px, 0, 0, this.px, 0, 0);
    const g = c.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#04010f");
    g.addColorStop(0.45, "#12062e");
    g.addColorStop(0.8, "#2a0f4a");
    g.addColorStop(1, "#4a1747");
    c.fillStyle = g;
    c.fillRect(0, 0, W, H);
    const hz = c.createRadialGradient(W / 2, H, 10, W / 2, H, 420);
    hz.addColorStop(0, "rgba(255,120,160,0.25)");
    hz.addColorStop(1, "rgba(255,120,160,0)");
    c.fillStyle = hz;
    c.fillRect(0, 0, W, H);
    let x = -10;
    let seed = 7;
    const rr = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
    while (x < W + 10) {
      const w = 22 + rr() * 34;
      const h = 40 + rr() * 110;
      c.fillStyle = "#0b0420";
      c.fillRect(x, H - h, w, h);
      c.fillStyle = "rgba(255,210,120,0.55)";
      for (let wy = H - h + 8; wy < H - 6; wy += 11) {
        for (let wx = x + 4; wx < x + w - 5; wx += 8) {
          if (rr() > 0.72) c.fillRect(wx, wy, 3, 4);
        }
      }
      x += w + 1 + rr() * 4;
    }
  }

  private render() {
    const ctx = this.ctx;
    ctx.setTransform(this.px, 0, 0, this.px, 0, 0);
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
    ctx.drawImage(this.bg, 0, 0, W, H);

    for (const s of this.stars) {
      const a = 0.35 + 0.65 * Math.abs(Math.sin(this.time * s.sp + s.ph));
      ctx.fillStyle = `rgba(255,255,255,${a * 0.85})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, TAU);
      ctx.fill();
    }

    ctx.save();
    if (this.shake > 0) ctx.translate(rnd(-1, 1) * this.shake, rnd(-1, 1) * this.shake);

    const w = this.weapon;
    // ---- per-weapon atmosphere ----
    if (w === "blackhole") {
      const dk = ctx.createLinearGradient(0, 0, 0, H);
      dk.addColorStop(0, "rgba(2,0,10,0.35)");
      dk.addColorStop(1, "rgba(8,2,24,0.3)");
      ctx.fillStyle = dk;
      ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = "lighter";
      const na = 0.12 + 0.03 * Math.sin(this.time * 0.7);
      const neb1 = ctx.createRadialGradient(CX - 120, 200, 0, CX - 120, 200, 260);
      neb1.addColorStop(0, `rgba(110,30,200,${na})`);
      neb1.addColorStop(1, "rgba(90,30,180,0)");
      ctx.fillStyle = neb1;
      ctx.fillRect(0, 0, W, H);
      const neb2 = ctx.createRadialGradient(CX + 130, 420, 0, CX + 130, 420, 280);
      neb2.addColorStop(0, `rgba(20,110,220,${na})`);
      neb2.addColorStop(1, "rgba(20,90,200,0)");
      ctx.fillStyle = neb2;
      ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = "source-over";
    } else if (w === "keris") {
      const kg = ctx.createLinearGradient(0, 0, 0, H);
      kg.addColorStop(0, "rgba(40,20,5,0.22)");
      kg.addColorStop(0.6, "rgba(80,50,10,0.1)");
      kg.addColorStop(1, "rgba(60,25,8,0.24)");
      ctx.fillStyle = kg;
      ctx.fillRect(0, 0, W, H);
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = 0.06 + 0.02 * Math.sin(this.time * 1.1);
      ctx.fillStyle = "#ffd98a";
      for (let i = 0; i < 2; i++) {
        const bx = 80 + i * 200 + Math.sin(this.time * 0.4 + i * 2.2) * 22;
        ctx.beginPath();
        ctx.moveTo(bx, -10);
        ctx.lineTo(bx + 46, -10);
        ctx.lineTo(bx + 110, H);
        ctx.lineTo(bx + 44, H);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    } else if (w === "yoyo") {
      const yg = ctx.createLinearGradient(0, 0, 0, H);
      yg.addColorStop(0, "rgba(60,10,60,0.2)");
      yg.addColorStop(0.6, "rgba(20,20,80,0.08)");
      yg.addColorStop(1, "rgba(80,20,40,0.2)");
      ctx.fillStyle = yg;
      ctx.fillRect(0, 0, W, H);
      ctx.save();
      ctx.globalAlpha = 0.5;
      for (let i = 0; i < 14; i++) {
        const px = (i * 97 + 31) % W;
        const py = (i * 211 + 60) % (H - 100);
        const tw = 0.3 + 0.7 * Math.abs(Math.sin(this.time * 2 + i * 1.1));
        ctx.fillStyle = hsl((i * 47 + this.time * 20) % 360, 100, 70, 0.35 * tw);
        ctx.beginPath();
        ctx.arc(px, py, 2.2, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
    } else if (w === "diamond") {
      const dg = ctx.createLinearGradient(0, 0, 0, H);
      dg.addColorStop(0, "rgba(30,60,100,0.22)");
      dg.addColorStop(0.6, "rgba(40,80,130,0.08)");
      dg.addColorStop(1, "rgba(20,40,80,0.24)");
      ctx.fillStyle = dg;
      ctx.fillRect(0, 0, W, H);
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = 0.07 + 0.02 * Math.sin(this.time * 1.2);
      ctx.fillStyle = "#d8f0ff";
      const bx = 60 + Math.sin(this.time * 0.35) * 60;
      ctx.beginPath();
      ctx.moveTo(bx, -10);
      ctx.lineTo(bx + 70, -10);
      ctx.lineTo(bx + 150, H);
      ctx.lineTo(bx + 50, H);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    } else {
      // crystal aurora
      const ag = ctx.createLinearGradient(0, 0, 0, H);
      ag.addColorStop(0, "rgba(50,10,70,0.25)");
      ag.addColorStop(0.5, "rgba(20,40,90,0.12)");
      ag.addColorStop(1, "rgba(60,10,60,0.28)");
      ctx.fillStyle = ag;
      ctx.fillRect(0, 0, W, H);
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      for (let i = 0; i < 3; i++) {
        const hue = 285 + i * 40 + this.time * 12;
        ctx.globalAlpha = 0.07 + 0.02 * Math.sin(this.time * 1.3 + i * 2);
        ctx.fillStyle = hsl(hue % 360, 100, 62);
        const bx = 40 + i * 120 + Math.sin(this.time * 0.45 + i * 2.1) * 34;
        ctx.beginPath();
        ctx.moveTo(bx, -10);
        ctx.lineTo(bx + 52, -10);
        ctx.lineTo(bx + 130, H);
        ctx.lineTo(bx + 48, H);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }

    // glows
    ctx.globalCompositeOperation = "lighter";
    for (const g of this.glows) {
      const k = g.life / g.max;
      const rad = g.r * (1.3 - 0.3 * k);
      const gr = ctx.createRadialGradient(g.x, g.y, 0, g.x, g.y, rad);
      gr.addColorStop(0, hsl(g.hue, 100, 60, 0.38 * k));
      gr.addColorStop(1, hsl(g.hue, 100, 50, 0));
      ctx.fillStyle = gr;
      ctx.fillRect(g.x - rad, g.y - rad, rad * 2, rad * 2);
    }
    ctx.globalCompositeOperation = "source-over";

    this.drawWheel();
    this.drawDebris();
    this.drawGun();
    this.drawAmmo();
    this.drawFlying();
    this.drawVoids();
    this.drawCrystals();
    this.drawStrings();
    this.drawStarFlashes();

    // particles
    ctx.globalCompositeOperation = "lighter";
    ctx.lineCap = "round";
    for (const p of this.particles) {
      const k = Math.max(0, p.life / p.max);
      let a = Math.pow(k, 0.7);
      if (p.tw && k < 0.6) a *= 0.55 + Math.random() * 0.45;
      const l = k > 0.88 ? Math.min(95, p.l + 25) : p.l - (1 - k) * 12;
      const size = p.size * (0.45 + 0.55 * k);
      ctx.strokeStyle = hsl(p.h, p.s, l, a);
      ctx.lineWidth = size * 1.6;
      ctx.beginPath();
      ctx.moveTo(p.x - p.vx * p.tr, p.y - p.vy * p.tr);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      if (size > 2.1 && a > 0.2) {
        ctx.fillStyle = hsl(p.h, p.s, 70, a * 0.18);
        ctx.beginPath();
        ctx.arc(p.x, p.y, size * 3.2, 0, TAU);
        ctx.fill();
      }
    }
    // rings
    for (const r of this.rings) {
      const k = r.life / r.max;
      if (r.impl) {
        const rad = Math.max(2, r.r * k);
        ctx.strokeStyle = hsl(r.hue, 100, 72, 0.85 * (1 - k * 0.4));
        ctx.lineWidth = 1.5 + 3.5 * (1 - k);
        ctx.beginPath();
        ctx.arc(r.x, r.y, rad, 0, TAU);
        ctx.stroke();
        ctx.strokeStyle = `rgba(255,255,255,${0.5 * (1 - k)})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(r.x, r.y, Math.max(1, rad - 3), 0, TAU);
        ctx.stroke();
      } else {
        ctx.strokeStyle = hsl(r.hue, 100, 70, 0.7 * k);
        ctx.lineWidth = 3 * k + 0.5;
        ctx.beginPath();
        ctx.arc(r.x, r.y, r.r * (1 - k * k) + 4, 0, TAU);
        ctx.stroke();
      }
    }
    ctx.globalCompositeOperation = "source-over";

    // floating texts
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (const t of this.texts) {
      const k = Math.min(1, t.life / 0.5);
      ctx.font = `700 22px ${FONT}`;
      ctx.fillStyle = hsl(t.hue, 100, 78, k);
      ctx.shadowColor = hsl(t.hue, 100, 60, k);
      ctx.shadowBlur = 12;
      ctx.fillText(t.text, t.x, t.y);
    }
    ctx.shadowBlur = 0;

    ctx.restore();

    this.drawHUD();

    // weapon vignette
    if (this.wpulse > 0) {
      const hue = w === "keris" ? 44 : w === "blackhole" ? 270 : w === "yoyo" ? (this.time * 120) % 360 : w === "diamond" ? 208 : 305;
      const vg = ctx.createRadialGradient(CX, CY, 60, CX, CY, 430);
      vg.addColorStop(0, hsl(hue, 100, 60, 0));
      vg.addColorStop(1, hsl(hue, 100, 60, 0.4 * this.wpulse));
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, W, H);
    }
    if (this.flash > 0) {
      ctx.fillStyle = hsl(this.flashHue, 100, 70, Math.min(0.45, this.flash * 0.45));
      ctx.fillRect(0, 0, W, H);
    }
  }

  private drawFlying() {
    const ctx = this.ctx;
    const w = this.weapon;
    for (const r of this.flying) {
      ctx.save();
      if (w === "keris") {
        ctx.translate(CX, r.y);
        ctx.rotate(Math.PI / 2 + r.age * 9 + r.seed * 2);
        drawKerisBullet(ctx, this.time, r.seed, 0);
      } else if (w === "blackhole") {
        ctx.translate(CX, r.y);
        drawBlackBullet(ctx, r.hue, 12, this.time, r.seed);
      } else if (w === "yoyo") {
        // elastic string from gun to yoyo
        const mx = CX;
        const my = GUNY - 10;
        const wob = Math.sin(this.time * 18 + r.seed * 4) * (r.phase === 1 ? 7 : 3);
        const qx = (mx + r.x) / 2 + wob;
        const qy = (my + r.y) / 2;
        ctx.strokeStyle = hsl(r.hue, 85, 75, 0.9);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(mx, my);
        ctx.quadraticCurveTo(qx, qy, r.x, r.y + 12);
        ctx.stroke();
        ctx.strokeStyle = "rgba(255,255,255,0.55)";
        ctx.lineWidth = 0.9;
        ctx.beginPath();
        ctx.moveTo(mx, my);
        ctx.quadraticCurveTo(qx, qy, r.x, r.y + 12);
        ctx.stroke();
        ctx.translate(r.x, r.y);
        drawYoyoBullet(ctx, r.hue, 13, this.time, r.seed, r.phase === 1 ? 26 : 9);
      } else if (w === "diamond") {
        ctx.translate(CX, r.y);
        ctx.rotate(Math.sin(r.age * 3 + r.seed) * 0.2);
        drawDiamondBullet(ctx, 12, this.time, r.seed, 0);
      } else {
        ctx.translate(CX + Math.sin(r.age * 8 + r.seed * 4) * 2, r.y);
        ctx.rotate(Math.PI / 2 + Math.sin(r.age * 6 + r.seed) * 0.1);
        drawCrystalBullet(ctx, this.time, r.seed, 0, 1);
      }
      ctx.restore();
    }
  }

  private drawWheel() {
    if (!this.wheelVisible) return;
    const ctx = this.ctx;
    const w = this.weapon;
    const hue = this.wheelHue;
    const s = this.wheelScale * (1 + this.pulse * 0.035);
    const cy = CY + this.jolt * 7 + this.wpullY;
    const cx = CX + this.wpullX;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(s, s);

    ctx.globalCompositeOperation = "lighter";
    const og = ctx.createRadialGradient(0, 0, R * 0.8, 0, 0, R + 85);
    og.addColorStop(0, hsl(hue, 100, 55, 0.3 + this.pulse * 0.25));
    og.addColorStop(1, hsl(hue, 100, 55, 0));
    ctx.fillStyle = og;
    ctx.beginPath();
    ctx.arc(0, 0, R + 85, 0, TAU);
    ctx.fill();
    ctx.globalCompositeOperation = "source-over";

    // stuck projectiles
    ctx.save();
    ctx.rotate(this.rot);
    for (const p of this.pins) {
      ctx.save();
      ctx.rotate(p.a);
      if (w === "keris") {
        ctx.translate(R - 4, 0);
        const jig = Math.sin(this.time * 7 + p.seed * 8) * 0.012;
        ctx.rotate(jig);
        drawKerisBullet(ctx, this.time, p.seed, p.flash);
      } else if (w === "blackhole") {
        ctx.translate(R + 2, 0);
        drawBlackBullet(ctx, p.hue, 11.5, this.time, p.hue * 0.7);
        if (p.flash > 0) {
          ctx.fillStyle = `rgba(255,255,255,${p.flash * 0.5})`;
          ctx.beginPath();
          ctx.arc(0, 0, 12.5, 0, TAU);
          ctx.fill();
        }
      } else if (w === "yoyo") {
        ctx.translate(R + 4, 0);
        drawYoyoBullet(ctx, p.hue, 12.5, this.time, p.seed, 2 + p.spin * 22);
      } else if (w === "diamond") {
        ctx.translate(R + 2, 0);
        drawDiamondBullet(ctx, 11.5, this.time, p.seed, p.flash);
      } else {
        ctx.translate(R - 4, 0);
        drawCrystalBullet(ctx, this.time, p.seed, p.flash, 0.9);
      }
      ctx.restore();
    }
    ctx.restore();

    // rim
    const rim = ctx.createLinearGradient(-R, -R, R, R);
    if (w === "keris") {
      rim.addColorStop(0, "#8a5a1a");
      rim.addColorStop(0.5, "#ffd75e");
      rim.addColorStop(1, "#7a3a12");
    } else if (w === "blackhole") {
      const drift = this.time * 22;
      rim.addColorStop(0, hsl(252 + Math.sin(drift * 0.05) * 22, 95, 58));
      rim.addColorStop(0.35, hsl(285, 100, 64));
      rim.addColorStop(0.65, hsl(210, 100, 62));
      rim.addColorStop(1, hsl(320 + Math.cos(drift * 0.05) * 18, 95, 60));
    } else if (w === "yoyo") {
      const flow = this.time * 50;
      rim.addColorStop(0, hsl(flow % 360, 100, 60));
      rim.addColorStop(0.5, hsl((flow + 140) % 360, 100, 60));
      rim.addColorStop(1, hsl((flow + 260) % 360, 100, 60));
    } else if (w === "diamond") {
      rim.addColorStop(0, "#e8f6ff");
      rim.addColorStop(0.5, "#9fd4ff");
      rim.addColorStop(1, "#5a8fc0");
    } else {
      rim.addColorStop(0, "#ff9ed9");
      rim.addColorStop(0.5, "#7ad7ff");
      rim.addColorStop(1, "#b46bff");
    }
    ctx.fillStyle = rim;
    ctx.beginPath();
    ctx.arc(0, 0, R + 6, 0, TAU);
    ctx.fill();

    // disc
    const dg = ctx.createRadialGradient(-R * 0.35, -R * 0.4, 6, 0, 0, R);
    if (w === "keris") {
      dg.addColorStop(0, "#3a2410");
      dg.addColorStop(0.55, "#241408");
      dg.addColorStop(1, "#120a04");
    } else if (w === "blackhole") {
      dg.addColorStop(0, "#22104a");
      dg.addColorStop(0.5, "#120626");
      dg.addColorStop(0.82, "#070213");
      dg.addColorStop(1, "#030109");
    } else if (w === "yoyo") {
      dg.addColorStop(0, "#3d1a5e");
      dg.addColorStop(0.55, "#25104a");
      dg.addColorStop(1, "#120826");
    } else if (w === "diamond") {
      dg.addColorStop(0, "#2a4a6e");
      dg.addColorStop(0.55, "#1a2f4d");
      dg.addColorStop(1, "#0c1626");
    } else {
      dg.addColorStop(0, "#3d1a55");
      dg.addColorStop(0.55, "#231040");
      dg.addColorStop(1, "#100722");
    }
    ctx.fillStyle = dg;
    ctx.beginPath();
    ctx.arc(0, 0, R, 0, TAU);
    ctx.fill();

    // rotating decoration
    ctx.save();
    ctx.rotate(this.rot);
    ctx.lineCap = "round";
    if (w === "keris") {
      // batik arcs + red gems
      for (let i = 0; i < 12; i++) {
        const a0 = (i * TAU) / 12 + 0.07;
        const a1 = ((i + 1) * TAU) / 12 - 0.07;
        ctx.strokeStyle = i % 2 ? "rgba(255,215,94,0.9)" : "rgba(200,120,50,0.85)";
        ctx.lineWidth = i % 2 ? 7 : 4;
        ctx.beginPath();
        ctx.arc(0, 0, R * 0.78, a0, a1);
        ctx.stroke();
      }
      for (let i = 0; i < 8; i++) {
        const a = (i * TAU) / 8;
        ctx.fillStyle = "#e23a2e";
        ctx.strokeStyle = "#ffd75e";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(Math.cos(a) * R * 0.6, Math.sin(a) * R * 0.6, 4, 0, TAU);
        ctx.fill();
        ctx.stroke();
      }
      for (let i = 0; i < 24; i++) {
        const a = (i * TAU) / 24;
        ctx.fillStyle = "rgba(255,230,160,0.85)";
        ctx.beginPath();
        ctx.arc(Math.cos(a) * R * 0.92, Math.sin(a) * R * 0.92, 1.8, 0, TAU);
        ctx.fill();
      }
    } else if (w === "blackhole") {
      for (let i = 0; i < 12; i++) {
        const a0 = (i * TAU) / 12 + 0.07;
        const a1 = ((i + 1) * TAU) / 12 - 0.07;
        const dh = 225 + (i % 4) * 26;
        ctx.strokeStyle = hsl(dh, 95, 62, 0.95);
        ctx.lineWidth = 9;
        ctx.beginPath();
        ctx.arc(0, 0, R * 0.8, a0, a1);
        ctx.stroke();
        ctx.strokeStyle = hsl(dh + 40, 95, 72, 0.55);
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, R * 0.64, a0 + 0.05, a1 - 0.05);
        ctx.stroke();
      }
      for (let i = 0; i < 24; i++) {
        const a = (i * TAU) / 24;
        ctx.fillStyle = hsl(225 + (i % 6) * 16, 100, 76, 0.9);
        ctx.beginPath();
        ctx.arc(Math.cos(a) * R * 0.92, Math.sin(a) * R * 0.92, 2.1, 0, TAU);
        ctx.fill();
      }
      for (let arm = 0; arm < 2; arm++) {
        ctx.strokeStyle = arm === 0 ? "rgba(170,120,255,0.5)" : "rgba(90,170,255,0.45)";
        ctx.lineWidth = 5;
        ctx.beginPath();
        for (let s = 0; s <= 40; s++) {
          const u = s / 40;
          const a = arm * Math.PI + u * 3.4 + this.time * 0.35;
          const rr = 46 + u * 34;
          const px = Math.cos(a) * rr;
          const py = Math.sin(a) * rr;
          if (s === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();
      }
    } else if (w === "yoyo") {
      // candy pinwheel
      for (let i = 0; i < 12; i++) {
        const a0 = (i * TAU) / 12 + 0.04;
        const a1 = ((i + 1) * TAU) / 12 - 0.04;
        ctx.strokeStyle = hsl(i * 30, 100, 62, 0.95);
        ctx.lineWidth = 10;
        ctx.beginPath();
        ctx.arc(0, 0, R * 0.78, a0, a1);
        ctx.stroke();
      }
      ctx.strokeStyle = "rgba(255,255,255,0.6)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, R * 0.78 - 7, 0, TAU);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, R * 0.78 + 7, 0, TAU);
      ctx.stroke();
      for (let i = 0; i < 12; i++) {
        const a = (i * TAU) / 12;
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.arc(Math.cos(a) * R * 0.55, Math.sin(a) * R * 0.55, 3, 0, TAU);
        ctx.fill();
        ctx.fillStyle = hsl(i * 30, 100, 60, 0.9);
        ctx.beginPath();
        ctx.arc(Math.cos(a) * R * 0.55, Math.sin(a) * R * 0.55, 1.8, 0, TAU);
        ctx.fill();
      }
    } else if (w === "diamond") {
      // icy facet rings
      for (const [rr, lw, al] of [[80, 8, 0.9], [64, 5, 0.75], [50, 3, 0.6]] as const) {
        for (let i = 0; i < 12; i++) {
          const a0 = (i * TAU) / 12 + 0.05;
          const a1 = ((i + 1) * TAU) / 12 - 0.05;
          ctx.strokeStyle = i % 2 ? `rgba(255,255,255,${al})` : `rgba(150,210,255,${al})`;
          ctx.lineWidth = lw;
          ctx.beginPath();
          ctx.arc(0, 0, rr, a0, a1);
          ctx.stroke();
        }
      }
      for (let i = 0; i < 16; i++) {
        const a = (i * TAU) / 16;
        const tw = 0.4 + 0.6 * Math.abs(Math.sin(this.time * 4 + i));
        ctx.fillStyle = `rgba(255,255,255,${tw})`;
        ctx.beginPath();
        ctx.arc(Math.cos(a) * R * 0.9, Math.sin(a) * R * 0.9, 1.8, 0, TAU);
        ctx.fill();
      }
    } else {
      // crystal geode rings
      for (const [rr, lw, off] of [[80, 9, 0], [64, 6, 50], [50, 3.5, 100]] as const) {
        for (let i = 0; i < 12; i++) {
          const a0 = (i * TAU) / 12 + 0.05;
          const a1 = ((i + 1) * TAU) / 12 - 0.05;
          ctx.strokeStyle = hsl(285 + off + i * 9 + this.time * 10, 95, 65, 0.9);
          ctx.lineWidth = lw;
          ctx.beginPath();
          ctx.arc(0, 0, rr, a0, a1);
          ctx.stroke();
        }
      }
      for (let q = 0; q < 4; q++) {
        const sa = this.time * 1.4 + (q * TAU) / 4;
        const px = Math.cos(sa) * R * 0.9;
        const py = Math.sin(sa) * R * 0.9;
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(sa + Math.PI / 2);
        ctx.fillStyle = hsl(295 + q * 25, 95, 70, 0.95);
        ctx.beginPath();
        ctx.moveTo(-4, 0);
        ctx.lineTo(0, -2.6);
        ctx.lineTo(4.5, 0);
        ctx.lineTo(0, 2.6);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
    }
    // twinkling rim lights
    for (let i = 0; i < 28; i++) {
      const a = (i * TAU) / 28;
      const tw = 0.4 + 0.6 * Math.abs(Math.sin(this.time * 5 + i * 0.7));
      ctx.fillStyle = `rgba(255,255,255,${tw})`;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * (R + 3), Math.sin(a) * (R + 3), 1.5, 0, TAU);
      ctx.fill();
    }
    if (w === "blackhole") {
      for (let q = 0; q < 5; q++) {
        const sa = -this.time * (2.2 + (q % 2) * 0.7) + (q * TAU) / 5;
        const rad = q % 2 === 0 ? R + 13 : R + 21;
        ctx.fillStyle = q === 0 ? "#fff" : hsl(255 + q * 18, 100, 72, 0.95);
        ctx.beginPath();
        ctx.arc(Math.cos(sa) * rad, Math.sin(sa) * rad, q === 0 ? 2.6 : 1.7, 0, TAU);
        ctx.fill();
      }
      ctx.strokeStyle = hsl(270, 100, 65, 0.4);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, R + 13, 0, TAU);
      ctx.stroke();
    }
    ctx.restore();

    // center hub
    const cg = ctx.createRadialGradient(-6, -8, 2, 0, 0, R * 0.42);
    if (w === "keris") {
      cg.addColorStop(0, "#4a2c10");
      cg.addColorStop(1, "#1c0f05");
    } else if (w === "yoyo") {
      cg.addColorStop(0, "#6e2a8e");
      cg.addColorStop(1, "#2a0f45");
    } else if (w === "diamond") {
      cg.addColorStop(0, "#3d6a99");
      cg.addColorStop(1, "#12263d");
    } else if (w === "crystal") {
      cg.addColorStop(0, "#5e2a7a");
      cg.addColorStop(1, "#1c0b30");
    } else {
      cg.addColorStop(0, "#2d1763");
      cg.addColorStop(1, "#0a0520");
    }
    ctx.fillStyle = cg;
    ctx.beginPath();
    ctx.arc(0, 0, R * 0.42, 0, TAU);
    ctx.fill();
    ctx.strokeStyle =
      w === "keris"
        ? "#ffd75e"
        : w === "yoyo"
          ? hsl((this.time * 80) % 360, 100, 68, 0.95)
          : w === "diamond"
            ? "#e8f6ff"
            : w === "crystal"
              ? hsl(300 + Math.sin(this.time * 2) * 25, 95, 72, 0.95)
              : hsl(195, 100, 70, 0.95);
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    if (this.state === "menu") {
      ctx.save();
      ctx.rotate(Math.sin(this.time * 2) * 0.15);
      starPath(ctx, 24);
      ctx.fillStyle = "#ffd75e";
      ctx.shadowColor = "#ffb300";
      ctx.shadowBlur = 14;
      ctx.fill();
      ctx.restore();
    } else {
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.font = `700 9px ${FONT}`;
      ctx.fillText("STAGE", 0, -17);
      ctx.fillStyle = "#fff";
      ctx.shadowColor =
        w === "keris"
          ? "rgba(255,190,80,0.95)"
          : w === "yoyo"
            ? hsl((this.time * 90) % 360, 100, 65, 0.95)
            : w === "diamond"
              ? "rgba(200,235,255,0.95)"
              : w === "crystal"
                ? "rgba(220,150,255,0.95)"
                : "rgba(80,200,255,0.95)";
      ctx.shadowBlur = 14;
      ctx.font = `700 30px ${FONT}`;
      ctx.fillText(String(this.level), 0, 7);
    }
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  private drawDebris() {
    const ctx = this.ctx;
    const w = this.weapon;
    for (const d of this.debris) {
      const a = Math.min(1, d.life / 0.6);
      ctx.save();
      ctx.globalAlpha = a;
      ctx.translate(d.x, d.y);
      ctx.rotate(d.rot);
      if (d.kind === "rocket") {
        if (w === "keris") {
          ctx.translate(-22, 0);
          drawKerisBullet(ctx, this.time, d.seed, 0);
        } else if (w === "blackhole") {
          drawBlackBullet(ctx, d.hue, 11, this.time, d.seed);
        } else if (w === "yoyo") {
          drawYoyoBullet(ctx, d.hue, 12, this.time, d.seed, 6);
        } else if (w === "diamond") {
          drawDiamondBullet(ctx, 11, this.time, d.seed, 0);
        } else if (w === "crystal") {
          ctx.translate(-23, 0);
          drawCrystalBullet(ctx, this.time, d.seed, 0, 1);
        }
      } else if (d.kind === "shard") {
        const s = d.a0 || 4;
        ctx.fillStyle = hsl(d.hue, 90, 72);
        ctx.strokeStyle = "rgba(255,255,255,0.85)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-s, 0);
        ctx.lineTo(0, -s * 0.6);
        ctx.lineTo(s, 0);
        ctx.lineTo(0, s * 0.6);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, R, d.a0, d.a0 + TAU / 10);
        ctx.closePath();
        const g = ctx.createRadialGradient(0, 0, 0, 0, 0, R);
        if (w === "keris") {
          g.addColorStop(0, "#3a2410");
          g.addColorStop(1, "#120a04");
        } else if (w === "yoyo") {
          g.addColorStop(0, "#3d1a5e");
          g.addColorStop(1, "#120826");
        } else if (w === "diamond") {
          g.addColorStop(0, "#2a4a6e");
          g.addColorStop(1, "#0c1626");
        } else if (w === "crystal") {
          g.addColorStop(0, "#3d1a55");
          g.addColorStop(1, "#100722");
        } else {
          g.addColorStop(0, "#3a2278");
          g.addColorStop(1, "#150a38");
        }
        ctx.fillStyle = g;
        ctx.fill();
        ctx.strokeStyle =
          w === "keris" ? "#ffd75e" : w === "yoyo" ? hsl(d.hue, 100, 65) : w === "diamond" ? "#cfeaff" : w === "crystal" ? hsl(d.hue, 95, 72) : hsl(d.hue, 100, 65);
        ctx.lineWidth = 4;
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  private drawGun() {
    const w = this.weapon;
    if (w === "keris") return this.drawKerisGun();
    if (w === "blackhole") return this.drawBHGun();
    if (w === "yoyo") return this.drawYoyoGun();
    if (w === "diamond") return this.drawDiamondGun();
    return this.drawCrystalGun();
  }

  // ---- KERIS GUN: luk blade, carved hilt, gold sheath, hidden barrel ----
  private drawKerisGun() {
    const ctx = this.ctx;
    const oy = this.recoil * 15;
    const live = this.state === "playing" && this.ammo > 0;
    const tipY = GUNY - 26;

    // mystic aura behind (pulsing)
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const pulse = 0.22 + 0.08 * Math.sin(this.time * 2.4) + this.recoil * 0.3;
    const gg = ctx.createRadialGradient(CX, GUNY + 80, 10, CX, GUNY + 80, 140);
    gg.addColorStop(0, `rgba(255,190,80,${pulse})`);
    gg.addColorStop(1, "rgba(255,150,50,0)");
    ctx.fillStyle = gg;
    ctx.fillRect(CX - 140, GUNY - 60, 280, 280);
    ctx.restore();

    ctx.save();
    ctx.translate(0, oy);

    // hilt (carved dark wood + gold rings + red gem)
    const hiltG = ctx.createLinearGradient(CX - 16, 0, CX + 16, 0);
    hiltG.addColorStop(0, "#3a1e0c");
    hiltG.addColorStop(0.5, "#7a4a1e");
    hiltG.addColorStop(1, "#2a1406");
    ctx.fillStyle = hiltG;
    ctx.strokeStyle = "rgba(20,10,4,0.9)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(CX - 15, GUNY + 118, 30, 46, 8);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = "rgba(255,215,120,0.6)";
    ctx.lineWidth = 1.4;
    for (const hy of [GUNY + 128, GUNY + 140, GUNY + 152]) {
      ctx.beginPath();
      ctx.moveTo(CX - 13, hy);
      ctx.quadraticCurveTo(CX, hy + 3, CX + 13, hy);
      ctx.stroke();
    }
    ctx.fillStyle = "#e23a2e";
    ctx.beginPath();
    ctx.arc(CX, GUNY + 134, 4.5, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    ctx.beginPath();
    ctx.arc(CX - 1.4, GUNY + 132.6, 1.3, 0, TAU);
    ctx.fill();

    // gold sheath (sarung)
    const shG = ctx.createLinearGradient(CX - 30, 0, CX + 30, 0);
    shG.addColorStop(0, "#8a5a1a");
    shG.addColorStop(0.4, "#ffd75e");
    shG.addColorStop(0.6, "#ffe9a8");
    shG.addColorStop(1, "#7a4d14");
    ctx.fillStyle = shG;
    ctx.strokeStyle = "rgba(60,32,8,0.9)";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(CX - 20, GUNY + 66);
    ctx.lineTo(CX + 20, GUNY + 66);
    ctx.lineTo(CX + 30, GUNY + 100);
    ctx.quadraticCurveTo(CX + 32, GUNY + 116, CX + 22, GUNY + 122);
    ctx.lineTo(CX - 22, GUNY + 122);
    ctx.quadraticCurveTo(CX - 32, GUNY + 116, CX - 30, GUNY + 100);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // engraved curves
    ctx.strokeStyle = "rgba(120,60,10,0.7)";
    ctx.lineWidth = 1.3;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(CX - 16, GUNY + 78 + i * 10);
      ctx.quadraticCurveTo(CX, GUNY + 82 + i * 10, CX + 16, GUNY + 78 + i * 10);
      ctx.stroke();
    }

    // luk blade pointing up
    ctx.save();
    ctx.translate(CX, tipY);
    ctx.rotate(Math.PI / 2);
    kerisBlade(ctx, 108, 20, 1.7);
    // slow shimmer sweeping along the blade
    const sweep = ((this.time * 45) % 130) - 10;
    const sg = ctx.createLinearGradient(sweep - 14, 0, sweep + 14, 0);
    sg.addColorStop(0, "rgba(255,255,255,0)");
    sg.addColorStop(0.5, "rgba(255,255,255,0.55)");
    sg.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = sg;
    ctx.fillRect(sweep - 14, -12, 28, 24);
    ctx.restore();

    // hidden barrel glow at the tip
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const mg = ctx.createRadialGradient(CX, tipY, 0, CX, tipY, 24);
    mg.addColorStop(0, `rgba(255,220,140,${0.5 + this.recoil * 0.45})`);
    mg.addColorStop(1, "rgba(255,160,60,0)");
    ctx.fillStyle = mg;
    ctx.fillRect(CX - 26, tipY - 26, 52, 52);
    ctx.restore();
    ctx.fillStyle = "#2a1406";
    ctx.beginPath();
    ctx.arc(CX, tipY, 4.5, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = "#ffd75e";
    ctx.lineWidth = 2;
    ctx.stroke();

    // shoot slash arc
    if (this.recoil > 0.25) {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.strokeStyle = `rgba(255,215,120,${this.recoil * 0.9})`;
      ctx.lineWidth = 4 * this.recoil + 1;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.arc(CX, tipY - 6, 30 + (1 - this.recoil) * 26, -Math.PI * 0.85, -Math.PI * 0.15);
      ctx.stroke();
      ctx.strokeStyle = `rgba(255,255,255,${this.recoil * 0.7})`;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(CX, tipY - 6, 24 + (1 - this.recoil) * 26, -Math.PI * 0.8, -Math.PI * 0.2);
      ctx.stroke();
      ctx.restore();
    }

    // loaded energy blade preview (spinning)
    if (live) {
      const e = 1 - Math.pow(1 - this.loadP, 3);
      const py = tipY - 30 + (1 - e) * 36 + Math.sin(this.time * 3) * 2;
      ctx.save();
      ctx.translate(CX, py);
      ctx.rotate(Math.PI / 2 + this.time * 5);
      ctx.scale(0.62, 0.62);
      drawKerisBullet(ctx, this.time, 4.4, 0);
      ctx.restore();
    }
    ctx.restore();
  }

  // ---- BLACK HOLE GUN ----
  private drawBHGun() {
    const ctx = this.ctx;
    const oy = this.recoil * 16;
    const nextHue = this.queue[this.shotIdx] ?? 265;
    const live = this.state === "playing" && this.ammo > 0;

    if (live) {
      const e = 1 - Math.pow(1 - this.loadP, 3);
      const tipY = GUNY - 38 + (1 - e) * 42 + oy + Math.sin(this.time * 3.2) * 2.5;
      if (e < 1) {
        for (let i = 0; i < 2; i++) {
          const rr = 16 + (1 - e) * (30 + i * 16);
          ctx.strokeStyle = hsl(nextHue + i * 30, 100, 70, (1 - e) * (0.7 - i * 0.25));
          ctx.lineWidth = 2.5 - i * 0.7;
          ctx.beginPath();
          ctx.arc(CX, tipY, rr, this.time * (3 + i * 2), this.time * (3 + i * 2) + Math.PI * 1.5);
          ctx.stroke();
        }
      }
      ctx.save();
      ctx.translate(CX, tipY);
      drawBlackBullet(ctx, nextHue, 12, this.time, 4.2);
      ctx.restore();
    }

    ctx.save();
    ctx.translate(0, oy);
    ctx.globalCompositeOperation = "lighter";
    const gg = ctx.createRadialGradient(CX, GUNY + 100, 10, CX, GUNY + 100, 130);
    gg.addColorStop(0, hsl(nextHue, 100, 55, 0.3));
    gg.addColorStop(1, hsl(nextHue, 100, 55, 0));
    ctx.fillStyle = gg;
    ctx.fillRect(CX - 140, GUNY - 40, 280, 270);
    ctx.globalCompositeOperation = "source-over";

    const bodyG = ctx.createLinearGradient(CX - 50, 0, CX + 50, 0);
    bodyG.addColorStop(0, "#150826");
    bodyG.addColorStop(0.35, "#3d1a72");
    bodyG.addColorStop(0.65, "#2a1258");
    bodyG.addColorStop(1, "#0d0518");
    ctx.fillStyle = bodyG;
    ctx.beginPath();
    ctx.moveTo(CX - 24, GUNY + 70);
    ctx.lineTo(CX + 24, GUNY + 70);
    ctx.lineTo(CX + 52, GUNY + 100);
    ctx.quadraticCurveTo(CX + 58, GUNY + 150, CX + 44, GUNY + 165);
    ctx.lineTo(CX - 44, GUNY + 165);
    ctx.quadraticCurveTo(CX - 58, GUNY + 150, CX - 52, GUNY + 100);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = hsl(nextHue, 100, 65);
    ctx.lineWidth = 2.5;
    ctx.shadowColor = hsl(nextHue, 100, 60);
    ctx.shadowBlur = 14;
    ctx.stroke();
    ctx.shadowBlur = 0;

    for (const sx of [-1, 1]) {
      const hx = CX + sx * 40;
      const hy = GUNY + 125;
      ctx.globalCompositeOperation = "lighter";
      const cg2 = ctx.createRadialGradient(hx, hy, 0, hx, hy, 20);
      cg2.addColorStop(0, hsl(nextHue + sx * 40, 100, 60, 0.5));
      cg2.addColorStop(1, hsl(nextHue + sx * 40, 100, 60, 0));
      ctx.fillStyle = cg2;
      ctx.fillRect(hx - 20, hy - 20, 40, 40);
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = "#000";
      ctx.beginPath();
      ctx.arc(hx, hy, 9, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = hsl(nextHue + sx * 40, 100, 65);
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.strokeStyle = "rgba(255,255,255,0.9)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(hx, hy, 9, this.time * 5 * sx, this.time * 5 * sx + Math.PI * 0.7);
      ctx.stroke();
    }

    const bg = ctx.createLinearGradient(CX - 15, 0, CX + 15, 0);
    bg.addColorStop(0, "#0b0b18");
    bg.addColorStop(0.35, "#343a5e");
    bg.addColorStop(0.55, "#12122a");
    bg.addColorStop(1, "#07070f");
    ctx.fillStyle = bg;
    ctx.fillRect(CX - 15, GUNY, 30, 92);
    ctx.strokeStyle = hsl(nextHue, 90, 55, 0.6);
    ctx.lineWidth = 1.5;
    ctx.strokeRect(CX - 15, GUNY, 30, 92);
    for (let i = 0; i < 6; i++) {
      const cyc = (this.time * 64 + i * 17) % 92;
      const by = GUNY + 86 - cyc;
      const sway = Math.sin(this.time * 6 + i * 1.1) * 6;
      ctx.fillStyle = hsl(nextHue + i * 12, 100, 62);
      ctx.beginPath();
      ctx.arc(CX - 7 + sway * 0.5, by, 3.4, 0, TAU);
      ctx.arc(CX + 7 - sway * 0.5, by, 3.4, 0, TAU);
      ctx.fill();
    }

    // muzzle gravity rings
    ctx.save();
    ctx.translate(CX, GUNY - 2);
    ctx.globalCompositeOperation = "lighter";
    const mg = ctx.createRadialGradient(0, 0, 0, 0, 0, 48);
    mg.addColorStop(0, hsl(nextHue, 100, 62, 0.6));
    mg.addColorStop(1, hsl(nextHue, 100, 60, 0));
    ctx.fillStyle = mg;
    ctx.fillRect(-48, -34, 96, 68);
    ctx.globalCompositeOperation = "source-over";
    ctx.strokeStyle = hsl(nextHue - 15, 90, 42);
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.ellipse(0, 0, 27, 11.5, 0, 0, TAU);
    ctx.stroke();
    ctx.strokeStyle = hsl(nextHue, 100, 62);
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.ellipse(0, 0, 24, 10, 0, 0, TAU);
    ctx.stroke();
    ctx.fillStyle = "#000";
    ctx.beginPath();
    ctx.ellipse(0, 0, 19, 7.2, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.9)";
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.ellipse(0, 0, 21.5, 8.8, 0, this.time * 5, this.time * 5 + Math.PI * 0.75);
    ctx.stroke();
    ctx.strokeStyle = hsl(nextHue + 55, 100, 80, 0.95);
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(0, 0, 24, 10, 0, -this.time * 4, -this.time * 4 + Math.PI * 0.9);
    ctx.stroke();
    ctx.restore();

    if (this.recoil > 0) {
      ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = hsl(nextHue + 40, 100, 75, this.recoil * 0.85);
      ctx.beginPath();
      ctx.ellipse(CX, GUNY - 4, 30, 14, 0, 0, TAU);
      ctx.fill();
      ctx.globalCompositeOperation = "source-over";
    }

    const gy = GUNY + 130;
    ctx.globalCompositeOperation = "lighter";
    const sg = ctx.createRadialGradient(CX, gy, 0, CX, gy, 30);
    sg.addColorStop(0, hsl(nextHue, 100, 65, 0.7));
    sg.addColorStop(1, hsl(nextHue, 100, 60, 0));
    ctx.fillStyle = sg;
    ctx.fillRect(CX - 32, gy - 32, 64, 64);
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = "#000";
    ctx.beginPath();
    ctx.arc(CX, gy, 11, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = hsl(nextHue, 100, 68);
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();
  }

  // ---- YOYO GUN: chunky toy body + big swinging yoyo wheel ----
  private drawYoyoGun() {
    const ctx = this.ctx;
    const oy = this.recoil * 12;
    const nextHue = this.queue[this.shotIdx] ?? 20;
    const live = this.state === "playing" && this.ammo > 0;
    const bob = Math.sin(this.time * 2.6) * 4;
    const spinBoost = 3 + this.recoil * 22;

    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const gg = ctx.createRadialGradient(CX, GUNY + 90, 10, CX, GUNY + 90, 130);
    gg.addColorStop(0, hsl(nextHue, 100, 60, 0.2 + this.recoil * 0.25));
    gg.addColorStop(1, hsl(nextHue, 100, 60, 0));
    ctx.fillStyle = gg;
    ctx.fillRect(CX - 140, GUNY - 50, 280, 280);
    ctx.restore();

    ctx.save();
    ctx.translate(0, oy);

    // toy body
    const bodyG = ctx.createLinearGradient(CX - 50, 0, CX + 50, 0);
    bodyG.addColorStop(0, "#0e6e8e");
    bodyG.addColorStop(0.4, "#22b8dd");
    bodyG.addColorStop(0.6, "#7de9ff");
    bodyG.addColorStop(1, "#0a4a66");
    ctx.fillStyle = bodyG;
    ctx.strokeStyle = "#08354d";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(CX - 24, GUNY + 78);
    ctx.lineTo(CX + 24, GUNY + 78);
    ctx.lineTo(CX + 50, GUNY + 106);
    ctx.quadraticCurveTo(CX + 56, GUNY + 150, CX + 42, GUNY + 165);
    ctx.lineTo(CX - 42, GUNY + 165);
    ctx.quadraticCurveTo(CX - 56, GUNY + 150, CX - 50, GUNY + 106);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // polka dots
    for (let i = 0; i < 8; i++) {
      const px = CX - 30 + (i % 4) * 20;
      const py = GUNY + 128 + Math.floor(i / 4) * 18;
      ctx.fillStyle = hsl((i * 55 + this.time * 30) % 360, 100, 72, 0.85);
      ctx.beginPath();
      ctx.arc(px, py, 4, 0, TAU);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.beginPath();
      ctx.arc(px - 1.2, py - 1.2, 1.2, 0, TAU);
      ctx.fill();
    }

    // launcher cup (muzzle)
    ctx.fillStyle = "#ff9d2e";
    ctx.strokeStyle = "#7a3c00";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(CX - 16, GUNY + 40, 32, 16, 6);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#7a3c00";
    ctx.beginPath();
    ctx.ellipse(CX, GUNY + 44, 11, 5, 0, 0, TAU);
    ctx.fill();

    // BIG yoyo wheel on the front (bobbing + spinning)
    const wy = GUNY + 92 + bob;
    ctx.save();
    ctx.translate(CX, wy);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const wg = ctx.createRadialGradient(0, 0, 4, 0, 0, 44);
    wg.addColorStop(0, hsl(nextHue, 100, 65, 0.35));
    wg.addColorStop(1, hsl(nextHue, 100, 60, 0));
    ctx.fillStyle = wg;
    ctx.fillRect(-46, -46, 92, 92);
    ctx.restore();
    ctx.save();
    ctx.rotate(this.time * spinBoost);
    const yg = ctx.createLinearGradient(-30, -30, 30, 30);
    yg.addColorStop(0, hsl(nextHue, 100, 55));
    yg.addColorStop(0.5, hsl(nextHue + 70, 100, 62));
    yg.addColorStop(1, hsl(nextHue + 140, 100, 55));
    ctx.fillStyle = yg;
    ctx.beginPath();
    ctx.arc(0, 0, 30, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255,0.8)";
    ctx.lineWidth = 3;
    for (let i = 0; i < 3; i++) {
      const a = (i * TAU) / 3;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(a) * 27, Math.sin(a) * 27);
      ctx.stroke();
    }
    ctx.restore();
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(0, 0, 10, 0, TAU);
    ctx.fill();
    ctx.fillStyle = hsl(nextHue, 100, 55);
    ctx.beginPath();
    ctx.arc(0, 0, 6, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.beginPath();
    ctx.arc(-2, -2, 2, 0, TAU);
    ctx.fill();
    ctx.restore();
    // string from cup down to the big wheel
    ctx.strokeStyle = "rgba(255,255,255,0.7)";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(CX, GUNY + 50);
    ctx.quadraticCurveTo(CX + Math.sin(this.time * 5) * 4, (GUNY + 50 + wy - 28) / 2, CX, wy - 28);
    ctx.stroke();

    // recoil flash ring
    if (this.recoil > 0.2) {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.strokeStyle = hsl(nextHue, 100, 70, this.recoil * 0.8);
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(CX, GUNY - 6, 20 + (1 - this.recoil) * 26, 0, TAU);
      ctx.stroke();
      ctx.restore();
    }

    // loaded yoyo preview (bobbing, string attached)
    if (live) {
      const e = 1 - Math.pow(1 - this.loadP, 3);
      const py = GUNY - 34 + (1 - e) * 40 + Math.sin(this.time * 3.4) * 2.5;
      ctx.strokeStyle = hsl(nextHue, 85, 75, 0.9);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(CX, GUNY + 40);
      ctx.quadraticCurveTo(CX + Math.sin(this.time * 9) * 5, (GUNY + 40 + py) / 2, CX, py + 11);
      ctx.stroke();
      ctx.save();
      ctx.translate(CX, py);
      drawYoyoBullet(ctx, nextHue, 11, this.time, 6.1, 7);
      ctx.restore();
    }
    ctx.restore();
  }

  // ---- DIAMOND GUN: faceted gem body, periodic shine sweep ----
  private drawDiamondGun() {
    const ctx = this.ctx;
    const oy = this.recoil * 14;
    const live = this.state === "playing" && this.ammo > 0;
    const sweep = ((this.time * 130) % 340) - 90;

    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const gg = ctx.createRadialGradient(CX, GUNY + 100, 10, CX, GUNY + 100, 130);
    gg.addColorStop(0, `rgba(190,230,255,${0.22 + this.recoil * 0.3})`);
    gg.addColorStop(1, "rgba(150,210,255,0)");
    ctx.fillStyle = gg;
    ctx.fillRect(CX - 140, GUNY - 50, 280, 280);
    ctx.restore();

    ctx.save();
    ctx.translate(0, oy);

    // chrome pedestal
    const pedG = ctx.createLinearGradient(CX - 50, 0, CX + 50, 0);
    pedG.addColorStop(0, "#3a4a66");
    pedG.addColorStop(0.35, "#a8c4e8");
    pedG.addColorStop(0.55, "#eef6ff");
    pedG.addColorStop(1, "#2c3850");
    ctx.fillStyle = pedG;
    ctx.strokeStyle = "#10182b";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(CX - 24, GUNY + 70);
    ctx.lineTo(CX + 24, GUNY + 70);
    ctx.lineTo(CX + 52, GUNY + 100);
    ctx.quadraticCurveTo(CX + 58, GUNY + 150, CX + 44, GUNY + 165);
    ctx.lineTo(CX - 44, GUNY + 165);
    ctx.quadraticCurveTo(CX - 58, GUNY + 150, CX - 52, GUNY + 100);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // stacked faceted diamond plates
    for (let layer = 0; layer < 3; layer++) {
      const ly = GUNY + 148 - layer * 26;
      const lw = 34 - layer * 6;
      const lh = 22;
      ctx.save();
      ctx.translate(CX, ly);
      const fg = ctx.createLinearGradient(-lw, 0, lw, 0);
      fg.addColorStop(0, "#7fb2e8");
      fg.addColorStop(0.4, "#ffffff");
      fg.addColorStop(0.6, "#cfeaff");
      fg.addColorStop(1, "#6a9fd0");
      ctx.fillStyle = fg;
      ctx.strokeStyle = "#e8f6ff";
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(-lw, 0);
      ctx.lineTo(-lw * 0.5, -lh / 2);
      ctx.lineTo(lw * 0.5, -lh / 2);
      ctx.lineTo(lw, 0);
      ctx.lineTo(0, lh / 2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = "rgba(110,160,210,0.8)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-lw * 0.5, -lh / 2);
      ctx.lineTo(0, lh / 2);
      ctx.moveTo(lw * 0.5, -lh / 2);
      ctx.lineTo(0, lh / 2);
      ctx.moveTo(-lw, 0);
      ctx.lineTo(lw, 0);
      ctx.stroke();
      ctx.restore();
    }
    // periodic shine sweep
    ctx.save();
    ctx.beginPath();
    ctx.rect(CX - 60, GUNY + 60, 120, 110);
    ctx.clip();
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.save();
    ctx.translate(CX + sweep, GUNY + 115);
    ctx.rotate(0.4);
    ctx.fillRect(-8, -70, 16, 140);
    ctx.fillStyle = "rgba(255,255,255,0.2)";
    ctx.fillRect(12, -70, 6, 140);
    ctx.restore();
    ctx.restore();

    // crystal barrel
    ctx.fillStyle = "rgba(200,230,255,0.25)";
    ctx.strokeStyle = "rgba(255,255,255,0.7)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(CX - 14, GUNY + 2, 28, 60, 8);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.fillRect(CX - 10, GUNY + 8, 4, 48);

    // diamond ring muzzle
    ctx.save();
    ctx.translate(CX, GUNY - 2);
    for (let i = 0; i < 8; i++) {
      const a = (i * TAU) / 8 + this.time * 0.8;
      const px = Math.cos(a) * 21;
      const py = Math.sin(a) * 8.5;
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(Math.PI / 4);
      const dg2 = ctx.createLinearGradient(-4, -4, 4, 4);
      dg2.addColorStop(0, "#fff");
      dg2.addColorStop(1, "#9fd4ff");
      ctx.fillStyle = dg2;
      ctx.fillRect(-4, -4, 8, 8);
      ctx.restore();
    }
    const ap = ctx.createRadialGradient(0, 0, 0, 0, 0, 15);
    ap.addColorStop(0, "#ffffff");
    ap.addColorStop(0.6, "rgba(200,235,255,0.9)");
    ap.addColorStop(1, "rgba(120,170,220,0.2)");
    ctx.fillStyle = ap;
    ctx.beginPath();
    ctx.ellipse(0, 0, 15, 6, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
    if (this.recoil > 0.12) {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = `rgba(255,255,255,${this.recoil * 0.75})`;
      ctx.beginPath();
      ctx.ellipse(CX, GUNY - 6, 28, 13, 0, 0, TAU);
      ctx.fill();
      ctx.restore();
    }

    // loaded diamond preview (slow spin)
    if (live) {
      const e = 1 - Math.pow(1 - this.loadP, 3);
      const py = GUNY - 40 + (1 - e) * 42 + Math.sin(this.time * 3.2) * 2;
      ctx.save();
      ctx.translate(CX, py);
      ctx.rotate(Math.sin(this.time * 1.8) * 0.2);
      drawDiamondBullet(ctx, 11, this.time, 8.8, 0);
      ctx.restore();
    }
    ctx.restore();
  }

  // ---- CRYSTAL GUN: grown translucent crystal cluster ----
  private drawCrystalGun() {
    const ctx = this.ctx;
    const oy = this.recoil * 14;
    const live = this.state === "playing" && this.ammo > 0;
    const pulse = 0.5 + 0.5 * Math.sin(this.time * 2.2);

    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const gg = ctx.createRadialGradient(CX, GUNY + 90, 10, CX, GUNY + 90, 135);
    gg.addColorStop(0, `rgba(220,140,255,${0.2 + pulse * 0.12 + this.recoil * 0.3})`);
    gg.addColorStop(1, "rgba(150,120,255,0)");
    ctx.fillStyle = gg;
    ctx.fillRect(CX - 140, GUNY - 50, 280, 280);
    ctx.restore();

    ctx.save();
    ctx.translate(0, oy);

    // dark rock base
    const rockG = ctx.createLinearGradient(CX - 50, 0, CX + 50, 0);
    rockG.addColorStop(0, "#241a38");
    rockG.addColorStop(0.5, "#3d2a5e");
    rockG.addColorStop(1, "#160d28");
    ctx.fillStyle = rockG;
    ctx.strokeStyle = "#0c0618";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(CX - 30, GUNY + 118);
    ctx.lineTo(CX + 30, GUNY + 118);
    ctx.lineTo(CX + 50, GUNY + 145);
    ctx.quadraticCurveTo(CX + 52, GUNY + 160, CX + 40, GUNY + 165);
    ctx.lineTo(CX - 40, GUNY + 165);
    ctx.quadraticCurveTo(CX - 52, GUNY + 160, CX - 50, GUNY + 145);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // grown crystal cluster (center tall + sides tilted)
    const crystals: [number, number, number, number, number][] = [
      [0, 0, 120, 30, 300], // dx, tilt, len, wid, hue
      [-34, 0.5, 74, 22, 325],
      [34, -0.5, 74, 22, 190],
      [-58, 0.85, 48, 16, 270],
      [58, -0.85, 48, 16, 210],
    ];
    for (const [dx, tilt, len, wid, hue] of crystals) {
      ctx.save();
      ctx.translate(CX + dx, GUNY + 128);
      ctx.rotate(tilt);
      const breathe = 1 + pulse * 0.03;
      ctx.scale(breathe, breathe);
      const g = ctx.createLinearGradient(0, 0, 0, -len);
      g.addColorStop(0, hsl(hue, 85, 45, 0.95));
      g.addColorStop(0.55, hsl(hue + 15, 95, 62, 0.88));
      g.addColorStop(0.85, hsl(hue + 40, 100, 78, 0.9));
      g.addColorStop(1, "rgba(255,255,255,0.95)");
      ctx.fillStyle = g;
      ctx.strokeStyle = "rgba(255,255,255,0.8)";
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(-wid / 2, 0);
      ctx.lineTo(-wid / 2, -len * 0.72);
      ctx.lineTo(0, -len);
      ctx.lineTo(wid / 2, -len * 0.72);
      ctx.lineTo(wid / 2, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      // inner light vein
      ctx.strokeStyle = `rgba(255,255,255,${0.5 + pulse * 0.35})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, -6);
      ctx.lineTo(0, -len * 0.85);
      ctx.stroke();
      // facet edge
      ctx.strokeStyle = "rgba(255,255,255,0.45)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-wid / 2, -len * 0.3);
      ctx.lineTo(0, -len * 0.55);
      ctx.lineTo(wid / 2, -len * 0.3);
      ctx.stroke();
      ctx.restore();
    }
    // orbiting mini shards
    for (let q = 0; q < 3; q++) {
      const sa = this.time * (1.2 + q * 0.3) + (q * TAU) / 3;
      const ox = CX + Math.cos(sa) * 62;
      const oy2 = GUNY + 80 + Math.sin(sa) * 40;
      ctx.save();
      ctx.translate(ox, oy2);
      ctx.rotate(sa);
      ctx.fillStyle = hsl(290 + q * 30, 95, 70, 0.9);
      ctx.beginPath();
      ctx.moveTo(-5, 0);
      ctx.lineTo(0, -2.4);
      ctx.lineTo(5, 0);
      ctx.lineTo(0, 2.4);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // emitter glow at the tallest tip
    const tipY = GUNY + 128 - 120;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const mg = ctx.createRadialGradient(CX, tipY, 0, CX, tipY, 30);
    mg.addColorStop(0, `rgba(255,220,250,${0.55 + this.recoil * 0.4})`);
    mg.addColorStop(1, "rgba(200,130,255,0)");
    ctx.fillStyle = mg;
    ctx.fillRect(CX - 32, tipY - 32, 64, 64);
    ctx.restore();
    if (this.recoil > 0.12) {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.strokeStyle = hsl(310, 100, 75, this.recoil * 0.8);
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(CX, tipY, 16 + (1 - this.recoil) * 30, 0, TAU);
      ctx.stroke();
      ctx.restore();
    }

    // loaded shard preview
    if (live) {
      const e = 1 - Math.pow(1 - this.loadP, 3);
      const py = tipY - 34 + (1 - e) * 40 + Math.sin(this.time * 3) * 2.5;
      ctx.save();
      ctx.translate(CX, py);
      ctx.rotate(Math.PI / 2 + Math.sin(this.time * 2) * 0.15);
      ctx.scale(0.66, 0.66);
      drawCrystalBullet(ctx, this.time, 5.5, 0, 1);
      ctx.restore();
    }
    ctx.restore();
  }

  private drawAmmo() {
    if (this.state === "menu") return;
    const ctx = this.ctx;
    const w = this.weapon;
    const total = this.queue.length;
    for (let k = 0; k < total; k++) {
      const used = k < this.shotIdx;
      const y = 742 - (total - 1 - k) * 22;
      ctx.save();
      ctx.globalAlpha = used ? 0.18 : 1;
      if (w === "keris") {
        ctx.translate(8, y - 12);
        ctx.scale(0.55, 0.55);
        drawKerisBullet(ctx, this.time, k * 1.4, 0);
      } else if (w === "blackhole") {
        ctx.translate(26, y - 12);
        drawBlackBullet(ctx, used ? 250 : this.queue[k], 6.5, this.time, k * 1.7);
      } else if (w === "yoyo") {
        ctx.translate(26, y - 12);
        drawYoyoBullet(ctx, used ? 200 : this.queue[k], 7.5, this.time, k * 1.6, 4);
      } else if (w === "diamond") {
        ctx.translate(26, y - 12);
        drawDiamondBullet(ctx, 7, this.time, k * 1.5, 0);
      } else {
        ctx.translate(6, y - 12);
        ctx.scale(0.5, 0.5);
        drawCrystalBullet(ctx, this.time, k * 1.6, 0, 1);
      }
      ctx.restore();
    }
  }

  private drawHUD() {
    if (this.state === "menu") return;
    const ctx = this.ctx;
    const w = this.weapon;
    ctx.save();
    ctx.textBaseline = "alphabetic";
    ctx.textAlign = "left";
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.font = `700 11px ${FONT}`;
    ctx.fillText("SCORE", 20, 30);
    ctx.fillStyle = "#fff";
    ctx.shadowColor = "#ff5fd2";
    ctx.shadowBlur = 12;
    ctx.font = `700 32px ${FONT}`;
    ctx.fillText(String(this.score), 20, 64);
    ctx.textAlign = "right";
    ctx.shadowBlur = 0;
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.font = `700 11px ${FONT}`;
    ctx.fillText("BEST", W - 20, 30);
    ctx.fillStyle = "#ffd75e";
    ctx.shadowColor = "#ffb300";
    ctx.shadowBlur = 10;
    ctx.font = `700 24px ${FONT}`;
    ctx.fillText(String(this.best), W - 20, 58);
    ctx.restore();

    if (this.state === "clear") {
      const t = this.bannerT;
      const sc = t < 0.35 ? 0.4 + 0.6 * Math.pow(t / 0.35, 0.6) * (1 + 0.25 * Math.sin((t / 0.35) * Math.PI)) : 1;
      const a = t > 2.1 ? Math.max(0, 1 - (t - 2.1) / 0.4) : 1;
      ctx.save();
      ctx.globalAlpha = a;
      ctx.translate(CX, 330);
      ctx.scale(sc, sc);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = `700 46px ${FONT}`;
      const g = ctx.createLinearGradient(-140, -20, 140, 20);
      if (w === "keris") {
        g.addColorStop(0, "#ffe9a8");
        g.addColorStop(0.5, "#ffd75e");
        g.addColorStop(1, "#ff8a3d");
        ctx.shadowColor = "rgba(255,190,80,0.95)";
      } else if (w === "blackhole") {
        g.addColorStop(0, "#b46bff");
        g.addColorStop(0.5, "#7ad7ff");
        g.addColorStop(1, "#f0e6ff");
        ctx.shadowColor = "rgba(140,80,255,0.95)";
      } else if (w === "yoyo") {
        g.addColorStop(0, "#ff5f8f");
        g.addColorStop(0.5, "#ffd75e");
        g.addColorStop(1, "#5fe7ff");
        ctx.shadowColor = "rgba(255,150,120,0.95)";
      } else if (w === "diamond") {
        g.addColorStop(0, "#ffffff");
        g.addColorStop(0.5, "#bfe6ff");
        g.addColorStop(1, "#7ab8ff");
        ctx.shadowColor = "rgba(200,235,255,0.95)";
      } else {
        g.addColorStop(0, "#ffb0e6");
        g.addColorStop(0.5, "#8adcff");
        g.addColorStop(1, "#c77dff");
        ctx.shadowColor = "rgba(220,150,255,0.95)";
      }
      ctx.shadowBlur = 24;
      ctx.fillStyle = g;
      ctx.fillText("STAGE CLEAR!", 0, 0);
      ctx.shadowBlur = 0;
      ctx.font = `700 18px ${FONT}`;
      ctx.fillStyle = "#fff";
      ctx.fillText("BONUS +3", 0, 40);
      ctx.restore();
    }
  }
}
