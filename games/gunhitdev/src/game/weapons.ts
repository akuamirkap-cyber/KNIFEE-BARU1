import { kerisGun } from "./keris";
/* =========================================================================
   GUN HIT — weapon definitions
   Semua visual digambar lewat kode: path, gradient, glow.
   Kontrak koordinat:
   - drawGun   : origin (0,0) = pangkal senjata (bawah), arah laras = -Y
   - drawBullet: origin (0,0) = pusat peluru, hidung mengarah -Y
   - drawMini  : origin (0,0) = pusat ikon amunisi, menghadap -Y
   ========================================================================= */

export const TAU = Math.PI * 2;

export type ParticleKind =
  | "spark"
  | "streak"
  | "ring"
  | "shard"
  | "star"
  | "crystal"
  | "suck"
  | "smoke"
  | "confetti"
  | "hole"
  | "flash"
  | "mote"
  | "debris"
  | "arc";

export interface ParticleInit {
  x: number;
  y: number;
  vx?: number;
  vy?: number;
  life?: number;
  size?: number;
  color?: string;
  kind?: ParticleKind;
  rot?: number;
  vr?: number;
  grav?: number;
  drag?: number;
  glow?: number;
  tx?: number;
  ty?: number;
  grow?: number;
  hue?: number;
  len?: number;
  thick?: number;
  data?: number;
}

export type Emit = (p: ParticleInit) => void;

export interface GunPose {
  t: number;
  recoil: number; // 0..1
  flash: number; // 0..1
  s: number;
}

export interface BulletPose {
  t: number;
  rot: number;
  speed: number;
}

export interface ImpactInfo {
  nx: number; // normal (radial, menunjuk keluar dari lingkaran)
  ny: number;
  power: number;
  last: boolean;
  mx?: number; // posisi moncong senjata (untuk efek sambaran balik)
  my?: number;
}

export interface Weapon {
  id: string;
  name: string;
  origin: string;
  tagline: string;
  desc: string;
  price: number;
  hue: string; // warna aksen utama untuk UI/glow
  hue2: string;
  muzzle: number; // jarak moncong dari pangkal (unit lokal)
  embed: number; // kedalaman tancap
  halfW: number; // setengah lebar untuk deteksi tabrakan
  bulletLen: number;
  /** pengali kecepatan peluru (petir keris melesat lebih cepat) */
  speedMul?: number;
  shake: number;
  pull: number; // tarikan ke lingkaran target (black hole)
  drawGun: (ctx: CanvasRenderingContext2D, p: GunPose) => void;
  drawBullet: (ctx: CanvasRenderingContext2D, p: BulletPose) => void;
  drawStuck?: (ctx: CanvasRenderingContext2D, p: { t: number; age: number }) => void;
  drawMini: (ctx: CanvasRenderingContext2D, p: { t: number }) => void;
  onFire: (emit: Emit, x: number, y: number, s: number) => void;
  onImpact: (emit: Emit, x: number, y: number, s: number, info: ImpactInfo) => void;
  ambient: (emit: Emit, x: number, y: number, s: number, t: number, dt: number) => void;
}

/* ------------------------------- helpers ------------------------------- */

export function rgba(hex: string, a: number) {
  const h = hex.replace("#", "");
  const n = parseInt(
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h,
    16
  );
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

export function glow(ctx: CanvasRenderingContext2D, color: string, blur: number) {
  ctx.shadowColor = color;
  ctx.shadowBlur = blur;
}
export function noGlow(ctx: CanvasRenderingContext2D) {
  ctx.shadowBlur = 0;
  ctx.shadowColor = "transparent";
}

export function starPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  spikes: number,
  outer: number,
  inner: number,
  rot = 0
) {
  ctx.beginPath();
  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = rot + (i * Math.PI) / spikes;
    const px = x + Math.cos(a) * r;
    const py = y + Math.sin(a) * r;
    i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
  }
  ctx.closePath();
}

/** Pseudo-acak stabil per (i, seed) — supaya kilat berkedip, bukan bergetar acak tiap frame. */
function jitter(i: number, seed: number) {
  const x = Math.sin(i * 127.1 + seed * 311.7) * 43758.5453;
  return x - Math.floor(x) - 0.5;
}

/**
 * Jalur petir zig-zag dari (x0,y0) ke (x1,y1).
 * Path dibiarkan terbuka di context agar bisa di-stroke berlapis (bloom + inti).
 */
export function boltPath(
  ctx: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  amp: number,
  seed: number,
  segs = 7
) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  for (let i = 1; i < segs; i++) {
    const u = i / segs;
    const taper = 1 - Math.abs(u - 0.5) * 1.5;
    const off = jitter(i, seed) * amp * 2 * Math.max(0.15, taper);
    ctx.lineTo(x0 + dx * u + nx * off, y0 + dy * u + ny * off);
  }
  ctx.lineTo(x1, y1);
}

/** Stroke petir tiga lapis: bloom berwarna, tubuh emas, inti putih panas. */
export function strokeBolt(
  ctx: CanvasRenderingContext2D,
  color: string,
  thick: number,
  alpha: number,
  blur = 0
) {
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  if (blur) glow(ctx, color, blur);
  ctx.strokeStyle = rgba(color, 0.3 * alpha);
  ctx.lineWidth = thick * 3.6;
  ctx.stroke();
  ctx.strokeStyle = rgba(color, 0.72 * alpha);
  ctx.lineWidth = thick * 1.7;
  ctx.stroke();
  ctx.strokeStyle = rgba("#ffffff", 0.96 * alpha);
  ctx.lineWidth = Math.max(0.6, thick * 0.62);
  ctx.stroke();
  noGlow(ctx);
  ctx.restore();
}

export function sparkle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, a: number, color: string) {
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = a;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.quadraticCurveTo(x + r * 0.13, y - r * 0.13, x + r, y);
  ctx.quadraticCurveTo(x + r * 0.13, y + r * 0.13, x, y + r);
  ctx.quadraticCurveTo(x - r * 0.13, y + r * 0.13, x - r, y);
  ctx.quadraticCurveTo(x - r * 0.13, y - r * 0.13, x, y - r);
  ctx.fill();
  ctx.restore();
}

function lgrad(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, stops: [number, string][]) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  for (const [o, c] of stops) g.addColorStop(o, c);
  return g;
}
function rgrad(ctx: CanvasRenderingContext2D, x: number, y: number, r0: number, r1: number, stops: [number, string][]) {
  const g = ctx.createRadialGradient(x, y, Math.max(0, r0), x, y, Math.max(0.01, r1));
  for (const [o, c] of stops) g.addColorStop(o, c);
  return g;
}

/* =====================================================================
   1. KERIS GUN (Nusantara Authentic • Halilintar Purba)
   ===================================================================== */
const keris: Weapon = kerisGun;

/* =====================================================================
   2. BLACK HOLE GUN
   ===================================================================== */

const blackhole: Weapon = {
  id: "blackhole",
  name: "BLACK HOLE GUN",
  origin: "Deep Space • Gravitasi",
  tagline: "Moncong bercincin gravitasi.",
  desc: "Rangka hitam-ungu futuristik dengan cincin akresi berputar. Pelurunya bola gelap bercincin ungu yang mendistorsi cahaya di sekitarnya.",
  price: 320,
  hue: "#b06bff",
  hue2: "#3ee0ff",
  muzzle: 150,
  embed: 9,
  halfW: 8,
  bulletLen: 30,
  shake: 7,
  pull: 9,

  drawGun(ctx, { t, recoil, flash }) {
    ctx.save();
    ctx.translate(0, recoil * 10);
    const my = -150;

    // medan gravitasi di sekeliling moncong
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = rgrad(ctx, 0, my, 2, 76, [
      [0, rgba("#b06bff", 0.3)],
      [0.4, rgba("#6d2bd9", 0.14)],
      [1, "rgba(0,0,0,0)"],
    ]);
    ctx.beginPath();
    ctx.arc(0, my, 76, 0, TAU);
    ctx.fill();
    ctx.restore();

    // ---- rangka bawah: plat gelap bersudut ----
    ctx.beginPath();
    ctx.moveTo(-26, 6);
    ctx.lineTo(-32, -34);
    ctx.lineTo(-19, -62);
    ctx.lineTo(-13, -96);
    ctx.lineTo(13, -96);
    ctx.lineTo(19, -62);
    ctx.lineTo(32, -34);
    ctx.lineTo(26, 6);
    ctx.closePath();
    ctx.fillStyle = lgrad(ctx, -30, 0, 30, -96, [
      [0, "#0a0614"],
      [0.35, "#241540"],
      [0.55, "#3a2166"],
      [0.8, "#150c26"],
      [1, "#07040e"],
    ]);
    glow(ctx, rgba("#7c3aed", 0.55), 16);
    ctx.fill();
    noGlow(ctx);
    ctx.strokeStyle = rgba("#b06bff", 0.5);
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // panel heksagonal + seam menyala
    ctx.save();
    ctx.clip();
    ctx.strokeStyle = rgba("#3ee0ff", 0.35);
    ctx.lineWidth = 1;
    for (let i = 0; i < 5; i++) {
      const yy = -12 - i * 19;
      ctx.beginPath();
      ctx.moveTo(-34, yy);
      ctx.lineTo(-8, yy - 6);
      ctx.lineTo(8, yy - 6);
      ctx.lineTo(34, yy);
      ctx.stroke();
    }
    const seam = 0.5 + 0.5 * Math.sin(t * 3);
    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = lgrad(ctx, -6, 0, 6, 0, [
      [0, "rgba(176,107,255,0)"],
      [0.5, rgba("#d7a6ff", 0.5 + seam * 0.4)],
      [1, "rgba(176,107,255,0)"],
    ]);
    ctx.fillRect(-6, -96, 12, 100);
    ctx.restore();

    // ventilasi samping
    for (let i = 0; i < 3; i++) {
      const yy = -30 - i * 14;
      ctx.fillStyle = rgba("#3ee0ff", 0.25 + 0.55 * Math.abs(Math.sin(t * 2 + i)));
      glow(ctx, "#3ee0ff", 10);
      ctx.fillRect(-30, yy, 10, 4);
      ctx.fillRect(20, yy, 10, 4);
      noGlow(ctx);
    }

    // ---- leher moncong ----
    ctx.fillStyle = lgrad(ctx, -14, -96, 14, -130, [
      [0, "#120a22"],
      [0.5, "#3b2369"],
      [1, "#0d0718"],
    ]);
    ctx.beginPath();
    ctx.moveTo(-13, -94);
    ctx.lineTo(-9, -132);
    ctx.lineTo(9, -132);
    ctx.lineTo(13, -94);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = rgba("#b06bff", 0.6);
    ctx.lineWidth = 1;
    ctx.stroke();

    // ---- cincin gravitasi ----
    ctx.save();
    ctx.translate(0, my);
    for (let i = 0; i < 3; i++) {
      const rot = t * (i % 2 === 0 ? 1.4 : -1.05) + i * 1.1;
      const rr = 20 + i * 6.5;
      ctx.save();
      ctx.rotate(rot);
      ctx.strokeStyle = i === 1 ? rgba("#3ee0ff", 0.85) : rgba("#c58bff", 0.8);
      ctx.lineWidth = 2.6 - i * 0.5;
      glow(ctx, i === 1 ? "#3ee0ff" : "#b06bff", 14);
      ctx.beginPath();
      ctx.ellipse(0, 0, rr, rr * 0.42, 0, 0, TAU);
      ctx.stroke();
      noGlow(ctx);
      ctx.restore();
    }
    // cakrawala peristiwa
    ctx.fillStyle = rgrad(ctx, 0, 0, 1, 17, [
      [0, "#000000"],
      [0.62, "#05010c"],
      [0.86, rgba("#7c3aed", 0.85)],
      [1, rgba("#3ee0ff", 0)],
    ]);
    ctx.beginPath();
    ctx.arc(0, 0, 17, 0, TAU);
    ctx.fill();
    // busur akresi
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.rotate(t * 2.2);
    ctx.strokeStyle = rgba("#ff9ef2", 0.9);
    ctx.lineWidth = 2.4;
    glow(ctx, "#ff6ee0", 16);
    ctx.beginPath();
    ctx.arc(0, 0, 12, 0.3, 2.1);
    ctx.stroke();
    ctx.strokeStyle = rgba("#7df3ff", 0.75);
    ctx.beginPath();
    ctx.arc(0, 0, 15, 3.2, 4.6);
    ctx.stroke();
    noGlow(ctx);
    ctx.restore();
    // serpihan mengorbit
    for (let i = 0; i < 4; i++) {
      const a = t * 1.9 + (i * TAU) / 4;
      const rr = 30 + Math.sin(t * 2 + i) * 4;
      ctx.save();
      ctx.translate(Math.cos(a) * rr, Math.sin(a) * rr * 0.5);
      ctx.rotate(a * 2);
      ctx.fillStyle = rgba("#d9b6ff", 0.9);
      glow(ctx, "#b06bff", 10);
      ctx.fillRect(-2.2, -2.2, 4.4, 4.4);
      noGlow(ctx);
      ctx.restore();
    }
    if (flash > 0.01) {
      ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = rgrad(ctx, 0, 0, 0, 40 * flash, [
        [0, rgba("#ffffff", flash)],
        [0.3, rgba("#b06bff", flash * 0.8)],
        [1, "rgba(62,224,255,0)"],
      ]);
      ctx.beginPath();
      ctx.arc(0, 0, 40 * flash, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
    ctx.restore();
  },

  drawBullet(ctx, { t, rot }) {
    ctx.save();
    // distorsi cahaya
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = rgrad(ctx, 0, 0, 6, 26, [
      [0, rgba("#b06bff", 0.35)],
      [0.6, rgba("#6d2bd9", 0.12)],
      [1, "rgba(0,0,0,0)"],
    ]);
    ctx.beginPath();
    ctx.arc(0, 0, 26, 0, TAU);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.rotate(rot * 0.6);
    for (let i = 0; i < 2; i++) {
      ctx.save();
      ctx.rotate(i * 1.2 + t * 6);
      ctx.strokeStyle = i ? rgba("#3ee0ff", 0.85) : rgba("#c58bff", 0.95);
      ctx.lineWidth = 2;
      glow(ctx, i ? "#3ee0ff" : "#b06bff", 12);
      ctx.beginPath();
      ctx.ellipse(0, 0, 13, 5.5, 0, 0, TAU);
      ctx.stroke();
      noGlow(ctx);
      ctx.restore();
    }
    ctx.restore();

    // inti gelap
    ctx.fillStyle = rgrad(ctx, 0, 0, 0, 8.5, [
      [0, "#000"],
      [0.7, "#0a0416"],
      [1, rgba("#8b4dff", 0.95)],
    ]);
    ctx.beginPath();
    ctx.arc(0, 0, 8.5, 0, TAU);
    ctx.fill();
    ctx.restore();
  },

  drawStuck(ctx, { t, age }) {
    const a = Math.max(0, 1 - age * 1.4);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = rgrad(ctx, 0, 0, 0, 14, [
      [0, rgba("#b06bff", 0.5 * a + 0.12)],
      [1, "rgba(0,0,0,0)"],
    ]);
    ctx.beginPath();
    ctx.arc(0, 0, 14, 0, TAU);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = "#08030f";
    ctx.beginPath();
    ctx.arc(0, 0, 6.5, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = rgba("#c58bff", 0.75);
    ctx.lineWidth = 1.4;
    glow(ctx, "#b06bff", 8);
    ctx.beginPath();
    ctx.ellipse(0, 0, 9, 4, t * 1.6, 0, TAU);
    ctx.stroke();
    noGlow(ctx);
  },

  drawMini(ctx, { t }) {
    ctx.save();
    ctx.fillStyle = rgrad(ctx, 0, 0, 0, 12, [
      [0, "#000"],
      [0.55, "#170a2c"],
      [1, rgba("#b06bff", 0.9)],
    ]);
    ctx.beginPath();
    ctx.arc(0, 0, 7, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = rgba("#3ee0ff", 0.9);
    ctx.lineWidth = 1.6;
    glow(ctx, "#3ee0ff", 8);
    ctx.beginPath();
    ctx.ellipse(0, 0, 11, 4.4, t * 2, 0, TAU);
    ctx.stroke();
    noGlow(ctx);
    ctx.restore();
  },

  onFire(emit, x, y) {
    for (let i = 0; i < 16; i++) {
      const a = Math.random() * TAU;
      const d = 26 + Math.random() * 34;
      emit({
        x: x + Math.cos(a) * d,
        y: y + Math.sin(a) * d * 0.7,
        tx: x,
        ty: y,
        life: 0.28 + Math.random() * 0.2,
        size: 1.4 + Math.random() * 2,
        color: i % 2 ? "#b06bff" : "#3ee0ff",
        kind: "suck",
        glow: 12,
      });
    }
    emit({ x, y, kind: "ring", life: 0.42, size: 30, grow: -46, color: "#8b4dff", thick: 3, glow: 18 });
    emit({ x, y, kind: "smoke", life: 0.8, size: 12, grow: 34, vy: -18, color: "#3b1e6b" });
  },

  onImpact(emit, x, y, s, _info) {
    emit({ x, y, kind: "hole", life: 0.62, size: 6, grow: 30 * s, color: "#b06bff", glow: 20, data: s });
    for (let i = 0; i < 22; i++) {
      const a = Math.random() * TAU;
      const d = 46 + Math.random() * 78;
      emit({
        x: x + Math.cos(a) * d,
        y: y + Math.sin(a) * d,
        tx: x,
        ty: y,
        life: 0.3 + Math.random() * 0.32,
        size: 1.2 + Math.random() * 2.4,
        color: i % 3 === 0 ? "#3ee0ff" : "#c58bff",
        kind: "suck",
        glow: 12,
      });
    }
    emit({ x, y, kind: "ring", life: 0.5, size: 10, grow: 90 * s, color: "#6d2bd9", thick: 2, glow: 14 });
  },

  ambient(emit, x, y, s, _t, dt) {
    if (Math.random() < dt * 22) {
      const a = Math.random() * TAU;
      const d = (46 + Math.random() * 60) * s;
      emit({
        x: x + Math.cos(a) * d,
        y: y - 150 * s + Math.sin(a) * d * 0.8,
        tx: x,
        ty: y - 150 * s,
        life: 0.45 + Math.random() * 0.4,
        size: 0.9 + Math.random() * 1.7,
        color: Math.random() < 0.5 ? "#b06bff" : "#3ee0ff",
        kind: "suck",
        glow: 10,
      });
    }
  },
};

/* =====================================================================
   3. YOYO GUN
   ===================================================================== */

function yoyoWheel(ctx: CanvasRenderingContext2D, r: number, t: number, spin: number) {
  ctx.save();
  ctx.rotate(t * spin);
  for (let i = 0; i < 8; i++) {
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, r, (i * TAU) / 8, ((i + 1) * TAU) / 8);
    ctx.closePath();
    ctx.fillStyle = i % 2 === 0 ? "#ff3d81" : "#22e3ff";
    ctx.fill();
  }
  ctx.strokeStyle = "#10131f";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, TAU);
  ctx.stroke();
  ctx.fillStyle = "#ffd93d";
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.46, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "#10131f";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = "#fff6d8";
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.17, 0, TAU);
  ctx.fill();
  // bintang decal
  ctx.fillStyle = rgba("#10131f", 0.65);
  starPath(ctx, 0, 0, 5, r * 0.34, r * 0.14, 0);
  ctx.fill();
  ctx.restore();
}

const yoyo: Weapon = {
  id: "yoyo",
  name: "YOYO GUN",
  origin: "Arcade • Mainan",
  tagline: "Melesat, berputar, kembali.",
  desc: "Roda yoyo cerah di moncong. Pelurunya yoyo yang berputar di titik tumbukan lalu meluncur balik ke senjata lewat tali elastis.",
  price: 240,
  hue: "#ff3d81",
  hue2: "#22e3ff",
  muzzle: 136,
  embed: 7,
  halfW: 8,
  bulletLen: 24,
  shake: 4.5,
  pull: 0,

  drawGun(ctx, { t, recoil, flash }) {
    ctx.save();
    ctx.translate(0, recoil * 12);
    const bob = Math.sin(t * 3.1) * 4;

    // badan
    ctx.beginPath();
    ctx.moveTo(-24, 8);
    ctx.lineTo(-28, -50);
    ctx.quadraticCurveTo(-28, -78, -14, -88);
    ctx.lineTo(14, -88);
    ctx.quadraticCurveTo(28, -78, 28, -50);
    ctx.lineTo(24, 8);
    ctx.quadraticCurveTo(0, 18, -24, 8);
    ctx.closePath();
    ctx.fillStyle = lgrad(ctx, -28, 0, 28, -88, [
      [0, "#1b2140"],
      [0.3, "#3d4b8f"],
      [0.55, "#5b6fd0"],
      [1, "#232a52"],
    ]);
    glow(ctx, rgba("#22e3ff", 0.4), 14);
    ctx.fill();
    noGlow(ctx);
    ctx.strokeStyle = "#10131f";
    ctx.lineWidth = 3.4;
    ctx.stroke();

    // blok warna
    ctx.save();
    ctx.clip();
    ctx.fillStyle = "#ff3d81";
    ctx.beginPath();
    ctx.moveTo(-30, -20);
    ctx.lineTo(30, -44);
    ctx.lineTo(30, -26);
    ctx.lineTo(-30, -2);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#ffd93d";
    ctx.beginPath();
    ctx.moveTo(-30, -62);
    ctx.lineTo(30, -76);
    ctx.lineTo(30, -66);
    ctx.lineTo(-30, -52);
    ctx.closePath();
    ctx.fill();
    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = lgrad(ctx, -20, 0, 20, 0, [
      [0, "rgba(255,255,255,0)"],
      [0.5, "rgba(255,255,255,0.22)"],
      [1, "rgba(255,255,255,0)"],
    ]);
    ctx.fillRect(-20, -90, 18, 110);
    ctx.restore();

    // baut
    ctx.fillStyle = "#e8f0ff";
    for (const [bx, by] of [
      [-18, -8],
      [18, -8],
      [-18, -80],
      [18, -80],
    ]) {
      ctx.beginPath();
      ctx.arc(bx, by, 2.6, 0, TAU);
      ctx.fill();
    }

    // sayap samping
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(s * 26, -60);
      ctx.lineTo(s * 44, -74 + bob * 0.4);
      ctx.lineTo(s * 30, -40);
      ctx.closePath();
      ctx.fillStyle = "#22e3ff";
      ctx.fill();
      ctx.strokeStyle = "#10131f";
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    // tali ke yoyo
    const wy = -118 + bob;
    ctx.strokeStyle = rgba("#fff6d8", 0.85);
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(0, -88);
    ctx.quadraticCurveTo(6 * Math.sin(t * 3.1), -104, 0, wy + 16);
    ctx.stroke();

    // roda yoyo di moncong
    ctx.save();
    ctx.translate(0, wy);
    glow(ctx, rgba("#ff3d81", 0.7), 18);
    yoyoWheel(ctx, 19, t, 5.5);
    noGlow(ctx);
    ctx.restore();

    if (flash > 0.01) {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.translate(0, wy);
      ctx.fillStyle = rgba("#fff6d8", flash * 0.8);
      starPath(ctx, 0, 0, 6, 40 * flash, 10 * flash, t * 4);
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  },

  drawBullet(ctx, { t }) {
    ctx.save();
    ctx.strokeStyle = rgba("#fff6d8", 0.4);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(0, 10);
    ctx.quadraticCurveTo(3 * Math.sin(t * 20), 34, 0, 58);
    ctx.stroke();
    yoyoWheel(ctx, 12, t, 26);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = rgrad(ctx, 0, 0, 2, 24, [
      [0, rgba("#ff3d81", 0.35)],
      [1, "rgba(34,227,255,0)"],
    ]);
    ctx.beginPath();
    ctx.arc(0, 0, 24, 0, TAU);
    ctx.fill();
    ctx.restore();
    ctx.restore();
  },

  drawStuck(ctx, { t, age }) {
    const a = Math.max(0, 1 - age * 2.2);
    ctx.save();
    ctx.rotate(t * (2 + a * 22));
    ctx.fillStyle = "#ffd93d";
    starPath(ctx, 0, 0, 5, 8 + a * 4, 3.4, 0);
    ctx.fill();
    ctx.strokeStyle = "#10131f";
    ctx.lineWidth = 1.6;
    ctx.stroke();
    ctx.restore();
    if (a > 0) {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.strokeStyle = rgba("#22e3ff", a * 0.8);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 12 + (1 - a) * 12, 0, TAU);
      ctx.stroke();
      ctx.restore();
    }
  },

  drawMini(ctx, { t }) {
    yoyoWheel(ctx, 8.5, t, 4);
  },

  onFire(emit, x, y) {
    for (let i = 0; i < 14; i++) {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.2;
      const sp = 80 + Math.random() * 200;
      emit({
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life: 0.4 + Math.random() * 0.35,
        size: 3 + Math.random() * 3.5,
        color: ["#ff3d81", "#22e3ff", "#ffd93d", "#fff6d8"][i % 4],
        kind: "confetti",
        grav: 420,
        drag: 1.1,
        vr: (Math.random() - 0.5) * 18,
        glow: 6,
      });
    }
    emit({ x, y, kind: "ring", life: 0.28, size: 8, grow: 170, color: "#ffd93d", thick: 3, glow: 12 });
  },

  onImpact(emit, x, y, s, info) {
    for (let i = 0; i < 26; i++) {
      const a = Math.random() * TAU;
      const sp = (60 + Math.random() * 330) * info.power;
      emit({
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life: 0.45 + Math.random() * 0.5,
        size: 2.6 + Math.random() * 4,
        color: ["#ff3d81", "#22e3ff", "#ffd93d", "#8affc1", "#fff6d8"][i % 5],
        kind: "confetti",
        grav: 460,
        drag: 1.05,
        vr: (Math.random() - 0.5) * 22,
        glow: 8,
      });
    }
    emit({ x, y, kind: "ring", life: 0.4, size: 8, grow: 210 * s, color: "#22e3ff", thick: 3, glow: 14 });
    emit({ x, y, kind: "ring", life: 0.6, size: 6, grow: 140 * s, color: "#ff3d81", thick: 2, glow: 12 });
    for (let i = 0; i < 2; i++)
      emit({ x, y, kind: "star", life: 0.35, size: 14 + i * 8, color: "#ffd93d", rot: i, vr: 6 });
  },

  ambient(emit, x, y, s, _t, dt) {
    if (Math.random() < dt * 4) {
      emit({
        x: x + (Math.random() - 0.5) * 44 * s,
        y: y - (110 + Math.random() * 40) * s,
        vx: (Math.random() - 0.5) * 20,
        vy: 10 + Math.random() * 20,
        life: 0.7,
        size: 2 + Math.random() * 2,
        color: ["#ff3d81", "#22e3ff", "#ffd93d"][(Math.random() * 3) | 0],
        kind: "spark",
        grav: -30,
        drag: 2,
        glow: 8,
      });
    }
  },
};

/* =====================================================================
   4. DIAMOND GUN
   ===================================================================== */

function gemPath(ctx: CanvasRenderingContext2D, w: number, h: number, crown = 0.42) {
  const cy = -h * crown;
  ctx.beginPath();
  ctx.moveTo(0, -h);
  ctx.lineTo(w * 0.62, cy);
  ctx.lineTo(w, cy * 0.55);
  ctx.lineTo(w * 0.5, 0);
  ctx.lineTo(-w * 0.5, 0);
  ctx.lineTo(-w, cy * 0.55);
  ctx.lineTo(-w * 0.62, cy);
  ctx.closePath();
}

const diamond: Weapon = {
  id: "diamond",
  name: "DIAMOND GUN",
  origin: "Prisma • Mewah",
  tagline: "Faceted, dingin, sempurna.",
  desc: "Badan berlapis berlian potongan geometris putih kebiruan. Pelurunya berlian kecil yang memantulkan cahaya dan pecah jadi kilau bintang.",
  price: 480,
  hue: "#7fd4ff",
  hue2: "#eaf6ff",
  muzzle: 162,
  embed: 10,
  halfW: 8,
  bulletLen: 30,
  shake: 5,
  pull: 0,

  drawGun(ctx, { t, recoil, flash }) {
    ctx.save();
    ctx.translate(0, recoil * 8);

    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = rgrad(ctx, 0, -86, 4, 82, [
      [0, rgba("#7fd4ff", 0.2)],
      [0.5, rgba("#b8a2ff", 0.08)],
      [1, "rgba(0,0,0,0)"],
    ]);
    ctx.beginPath();
    ctx.arc(0, -86, 82, 0, TAU);
    ctx.fill();
    ctx.restore();

    // rangka dasar metalik
    const bodyPath = (c: CanvasRenderingContext2D) => {
      c.beginPath();
      c.moveTo(-25, 8);
      c.lineTo(-30, -30);
      c.lineTo(-17, -52);
      c.lineTo(-14, -104);
      c.lineTo(14, -104);
      c.lineTo(17, -52);
      c.lineTo(30, -30);
      c.lineTo(25, 8);
      c.closePath();
    };
    bodyPath(ctx);
    ctx.fillStyle = lgrad(ctx, -30, 0, 30, -100, [
      [0, "#5d6c8c"],
      [0.3, "#c9dcf5"],
      [0.5, "#f4fbff"],
      [0.72, "#93a9cc"],
      [1, "#41506e"],
    ]);
    glow(ctx, rgba("#7fd4ff", 0.5), 16);
    ctx.fill();
    noGlow(ctx);
    ctx.save();
    ctx.clip();
    // facet geometris
    const facets: [number, number, number, number, number, number][] = [
      [-30, -4, 0, -26, -30, -46],
      [0, -26, 30, -4, 30, -46],
      [-30, -46, 0, -26, 0, -78],
      [0, -26, 30, -46, 0, -78],
      [-16, -78, 0, -78, -16, -104],
      [0, -78, 16, -78, 16, -104],
    ];
    facets.forEach((f, i) => {
      ctx.beginPath();
      ctx.moveTo(f[0], f[1]);
      ctx.lineTo(f[2], f[3]);
      ctx.lineTo(f[4], f[5]);
      ctx.closePath();
      ctx.fillStyle = rgba(i % 2 ? "#ffffff" : "#8fb6e6", 0.14 + (i % 3) * 0.09);
      ctx.fill();
      ctx.strokeStyle = rgba("#ffffff", 0.5);
      ctx.lineWidth = 0.9;
      ctx.stroke();
    });
    // sapuan kilau berkala
    const sw = ((t * 0.36) % 2.4) - 0.6;
    if (sw >= 0 && sw <= 1) {
      ctx.globalCompositeOperation = "lighter";
      ctx.save();
      ctx.translate(-60 + sw * 120, 0);
      ctx.rotate(0.35);
      ctx.fillStyle = lgrad(ctx, -16, 0, 16, 0, [
        [0, "rgba(255,255,255,0)"],
        [0.5, "rgba(255,255,255,0.8)"],
        [1, "rgba(255,255,255,0)"],
      ]);
      ctx.fillRect(-16, -140, 32, 160);
      ctx.restore();
      ctx.globalCompositeOperation = "source-over";
    }
    ctx.restore();
    bodyPath(ctx);
    ctx.strokeStyle = rgba("#ffffff", 0.75);
    ctx.lineWidth = 1.3;
    ctx.stroke();

    // kerah penyangga berlian
    ctx.beginPath();
    ctx.moveTo(-9, -102);
    ctx.lineTo(-6, -126);
    ctx.lineTo(6, -126);
    ctx.lineTo(9, -102);
    ctx.closePath();
    ctx.fillStyle = lgrad(ctx, -9, -102, 9, -126, [
      [0, "#6d7f9f"],
      [0.45, "#e8f4ff"],
      [1, "#5b6d8c"],
    ]);
    ctx.fill();
    ctx.strokeStyle = rgba("#ffffff", 0.6);
    ctx.lineWidth = 1;
    ctx.stroke();
    for (const sx of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(sx * 7, -118);
      ctx.quadraticCurveTo(sx * 17, -128, sx * 12, -140);
      ctx.strokeStyle = rgba("#dcefff", 0.85);
      ctx.lineWidth = 2.2;
      ctx.stroke();
    }

    // berlian besar di moncong
    const my = -128;
    ctx.save();
    ctx.translate(0, my);
    ctx.rotate(Math.sin(t * 0.9) * 0.07);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = rgrad(ctx, 0, -8, 0, 42, [
      [0, rgba("#ffffff", 0.5 + flash * 0.4)],
      [0.4, rgba("#7fd4ff", 0.2)],
      [1, "rgba(127,212,255,0)"],
    ]);
    ctx.beginPath();
    ctx.arc(0, -8, 42, 0, TAU);
    ctx.fill();
    ctx.restore();
    gemPath(ctx, 22, 40);
    ctx.fillStyle = lgrad(ctx, -22, -40, 22, 0, [
      [0, "#d8ecff"],
      [0.3, "#ffffff"],
      [0.52, "#8fc9f5"],
      [0.75, "#eaf7ff"],
      [1, "#5f8fc4"],
    ]);
    glow(ctx, "#aee4ff", 20);
    ctx.fill();
    noGlow(ctx);
    ctx.strokeStyle = rgba("#ffffff", 0.95);
    ctx.lineWidth = 1.2;
    ctx.stroke();
    // garis facet
    ctx.beginPath();
    ctx.moveTo(-22, -16.8);
    ctx.lineTo(22, -16.8);
    ctx.moveTo(0, -40);
    ctx.lineTo(-13.6, -16.8);
    ctx.lineTo(-11, 0);
    ctx.moveTo(0, -40);
    ctx.lineTo(13.6, -16.8);
    ctx.lineTo(11, 0);
    ctx.moveTo(-13.6, -16.8);
    ctx.lineTo(0, 0);
    ctx.lineTo(13.6, -16.8);
    ctx.strokeStyle = rgba("#6fa8dc", 0.7);
    ctx.lineWidth = 0.9;
    ctx.stroke();
    const sp = (Math.sin(t * 2.4) + 1) / 2;
    sparkle(ctx, 6, -26, 9 + sp * 5, 0.55 + sp * 0.4, "#ffffff");
    sparkle(ctx, -9, -12, 5 + (1 - sp) * 4, 0.4 + (1 - sp) * 0.4, "#d8f2ff");
    ctx.restore();

    if (flash > 0.01) {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.translate(0, my - 14);
      ctx.fillStyle = rgba("#ffffff", flash);
      starPath(ctx, 0, 0, 4, 44 * flash, 6 * flash, t * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  },

  drawBullet(ctx, { t, rot }) {
    ctx.save();
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = lgrad(ctx, 0, 0, 0, 52, [
      [0, rgba("#7fd4ff", 0.45)],
      [1, "rgba(127,212,255,0)"],
    ]);
    ctx.beginPath();
    ctx.moveTo(-5, 2);
    ctx.lineTo(5, 2);
    ctx.lineTo(1.2, 52);
    ctx.lineTo(-1.2, 52);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    ctx.rotate(rot);
    ctx.save();
    ctx.translate(0, 8);
    gemPath(ctx, 10, 26);
    ctx.fillStyle = lgrad(ctx, -10, -26, 10, 0, [
      [0, "#ffffff"],
      [0.4, "#bfe4ff"],
      [0.65, "#ffffff"],
      [1, "#6ea6dd"],
    ]);
    glow(ctx, "#aee4ff", 16);
    ctx.fill();
    noGlow(ctx);
    ctx.strokeStyle = rgba("#ffffff", 0.95);
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-10, -10.9);
    ctx.lineTo(10, -10.9);
    ctx.moveTo(0, -26);
    ctx.lineTo(0, 0);
    ctx.strokeStyle = rgba("#7fb6e8", 0.8);
    ctx.lineWidth = 0.8;
    ctx.stroke();
    ctx.restore();
    sparkle(ctx, 3, -12, 8 + Math.sin(t * 22) * 3, 0.85, "#ffffff");
    ctx.restore();
  },

  drawStuck(ctx, { t, age }) {
    const g = Math.max(0, 1 - age * 1.4);
    ctx.save();
    ctx.translate(0, 9);
    gemPath(ctx, 9, 26);
    ctx.fillStyle = lgrad(ctx, -9, -26, 9, 0, [
      [0, "#ffffff"],
      [0.42, "#cfeaff"],
      [0.7, "#8fc9f5"],
      [1, "#5f8fc4"],
    ]);
    glow(ctx, rgba("#aee4ff", 0.9), 12 + g * 10);
    ctx.fill();
    noGlow(ctx);
    ctx.strokeStyle = rgba("#ffffff", 0.95);
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-9, -10.9);
    ctx.lineTo(9, -10.9);
    ctx.moveTo(0, -26);
    ctx.lineTo(0, 0);
    ctx.strokeStyle = rgba("#7fb6e8", 0.75);
    ctx.lineWidth = 0.8;
    ctx.stroke();
    ctx.restore();
    sparkle(ctx, 3, -8, 7 + g * 6 + Math.sin(t * 6) * 1.5, 0.5 + g * 0.4, "#ffffff");
  },

  drawMini(ctx, { t }) {
    ctx.save();
    ctx.translate(0, 10);
    gemPath(ctx, 7, 18);
    ctx.fillStyle = lgrad(ctx, -7, -18, 7, 0, [
      [0, "#fff"],
      [0.5, "#bfe4ff"],
      [1, "#6ea6dd"],
    ]);
    glow(ctx, "#aee4ff", 9);
    ctx.fill();
    noGlow(ctx);
    ctx.strokeStyle = rgba("#fff", 0.9);
    ctx.lineWidth = 0.9;
    ctx.stroke();
    ctx.restore();
    sparkle(ctx, 4, -4, 4 + Math.sin(t * 5) * 2, 0.7, "#fff");
  },

  onFire(emit, x, y) {
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * 1.7;
      const sp = 100 + Math.random() * 240;
      emit({
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life: 0.3 + Math.random() * 0.3,
        size: 2 + Math.random() * 3,
        color: i % 2 ? "#ffffff" : "#7fd4ff",
        kind: "shard",
        grav: 260,
        drag: 1.6,
        vr: (Math.random() - 0.5) * 14,
        glow: 12,
      });
    }
    emit({ x, y, kind: "flash", life: 0.18, size: 34, color: "#eaf6ff", glow: 24 });
  },

  onImpact(emit, x, y, s, info) {
    for (let i = 0; i < 18; i++) {
      const a = Math.atan2(info.ny, info.nx) + (Math.random() - 0.5) * 2.8;
      const sp = (80 + Math.random() * 340) * info.power;
      emit({
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life: 0.5 + Math.random() * 0.55,
        size: 2.4 + Math.random() * 4.2,
        color: i % 3 === 0 ? "#ffffff" : i % 3 === 1 ? "#bfe4ff" : "#7fd4ff",
        kind: "shard",
        grav: 520,
        drag: 1.1,
        rot: Math.random() * TAU,
        vr: (Math.random() - 0.5) * 16,
        glow: 12,
      });
    }
    for (let i = 0; i < 6; i++)
      emit({
        x: x + (Math.random() - 0.5) * 34,
        y: y + (Math.random() - 0.5) * 34,
        kind: "star",
        life: 0.3 + Math.random() * 0.4,
        size: 9 + Math.random() * 14,
        color: "#ffffff",
        rot: Math.random() * TAU,
        vr: (Math.random() - 0.5) * 5,
      });
    emit({ x, y, kind: "ring", life: 0.42, size: 8, grow: 190 * s, color: "#eaf6ff", thick: 2, glow: 18 });
    emit({ x, y, kind: "flash", life: 0.14, size: 54 * s, color: "#ffffff", glow: 30 });
  },

  ambient(emit, x, y, s, _t, dt) {
    if (Math.random() < dt * 5) {
      emit({
        x: x + (Math.random() - 0.5) * 52 * s,
        y: y - (30 + Math.random() * 120) * s,
        kind: "star",
        life: 0.5 + Math.random() * 0.4,
        size: 4 + Math.random() * 7,
        color: Math.random() < 0.5 ? "#ffffff" : "#bfe4ff",
        rot: Math.random() * TAU,
        vr: (Math.random() - 0.5) * 3,
      });
    }
  },
};

/* =====================================================================
   5. CRYSTAL GUN
   ===================================================================== */

function crystalShard(ctx: CanvasRenderingContext2D, w: number, h: number, bend = 0) {
  ctx.beginPath();
  ctx.moveTo(0, -h);
  ctx.lineTo(w * 0.62 + bend, -h * 0.52);
  ctx.lineTo(w, -h * 0.1);
  ctx.lineTo(w * 0.42, 0);
  ctx.lineTo(-w * 0.42, 0);
  ctx.lineTo(-w, -h * 0.12);
  ctx.lineTo(-w * 0.6 + bend, -h * 0.55);
  ctx.closePath();
}

const crystal: Weapon = {
  id: "crystal",
  name: "CRYSTAL GUN",
  origin: "Guwa Cahya • Organik",
  tagline: "Tumbuh, berpendar, menembus.",
  desc: "Gugusan kristal tembus cahaya bergradasi pink-cyan-ungu. Pelurunya pecahan runcing berjejak pelangi yang menumbuhkan kristal sesaat di titik kena.",
  price: 620,
  hue: "#ff7ad9",
  hue2: "#6ff2ff",
  muzzle: 166,
  embed: 10,
  halfW: 7,
  bulletLen: 36,
  shake: 5,
  pull: 0,

  drawGun(ctx, { t, recoil, flash }) {
    ctx.save();
    ctx.translate(0, recoil * 8);
    const pulse = 0.5 + 0.5 * Math.sin(t * 2.2);

    // pendar lembut
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = rgrad(ctx, 0, -96, 4, 92, [
      [0, rgba("#ff7ad9", 0.16 + pulse * 0.12)],
      [0.45, rgba("#6ff2ff", 0.1)],
      [1, "rgba(0,0,0,0)"],
    ]);
    ctx.beginPath();
    ctx.ellipse(0, -96, 70, 96, 0, 0, TAU);
    ctx.fill();
    ctx.restore();

    // dudukan metal
    ctx.beginPath();
    ctx.moveTo(-27, 8);
    ctx.lineTo(-31, -26);
    ctx.lineTo(-19, -44);
    ctx.lineTo(19, -44);
    ctx.lineTo(31, -26);
    ctx.lineTo(27, 8);
    ctx.closePath();
    ctx.fillStyle = lgrad(ctx, -30, 0, 30, -44, [
      [0, "#241d33"],
      [0.4, "#4b3f63"],
      [0.62, "#6b5a86"],
      [1, "#1d1729"],
    ]);
    ctx.fill();
    ctx.strokeStyle = rgba("#c9a6ff", 0.55);
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.fillStyle = rgba("#6ff2ff", 0.35 + pulse * 0.4);
    glow(ctx, "#6ff2ff", 10);
    ctx.fillRect(-16, -34, 32, 3.4);
    ctx.fillRect(-11, -24, 22, 3);
    noGlow(ctx);

    // gugusan kristal
    const shards: [number, number, number, number, number][] = [
      // [offsetX, tinggi, lebar, rotasi, hueIndex]
      [-19, 62, 11, -0.34, 0],
      [18, 70, 12, 0.3, 2],
      [-8, 96, 13, -0.1, 1],
      [9, 104, 14, 0.12, 0],
      [0, 128, 16, 0, 1],
    ];
    const cols = ["#ff7ad9", "#6ff2ff", "#a97bff"];
    shards.forEach(([ox, h, w, rot, ci], i) => {
      ctx.save();
      ctx.translate(ox, -40);
      ctx.rotate(rot);
      crystalShard(ctx, w, h, Math.sin(t * 1.2 + i) * 1.5);
      const c = cols[ci];
      ctx.fillStyle = lgrad(ctx, -w, -h, w, 0, [
        [0, rgba(c, 0.9)],
        [0.35, rgba("#ffffff", 0.55)],
        [0.6, rgba(cols[(ci + 1) % 3], 0.75)],
        [1, rgba(c, 0.5)],
      ]);
      glow(ctx, c, 16);
      ctx.fill();
      noGlow(ctx);
      ctx.strokeStyle = rgba("#ffffff", 0.85);
      ctx.lineWidth = 1;
      ctx.stroke();
      // inti dalam berdenyut
      ctx.save();
      ctx.clip();
      ctx.globalCompositeOperation = "lighter";
      const g = 0.35 + 0.5 * Math.abs(Math.sin(t * 2 + i * 0.9));
      ctx.fillStyle = lgrad(ctx, 0, 0, 0, -h, [
        [0, rgba("#ffffff", 0.05)],
        [0.6, rgba("#ffffff", 0.5 * g)],
        [1, rgba(c, 0.6 * g)],
      ]);
      ctx.fillRect(-w, -h, w * 2, h);
      // garis refraksi
      ctx.strokeStyle = rgba("#ffffff", 0.35);
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, -h);
      ctx.moveTo(-w * 0.6, -h * 0.4);
      ctx.lineTo(w * 0.5, -h * 0.75);
      ctx.stroke();
      ctx.restore();
      ctx.restore();
    });

    // ujung moncong: titik cahaya
    const my = -168;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = rgrad(ctx, 0, my, 0, 20 + flash * 22, [
      [0, rgba("#ffffff", 0.85 + flash * 0.15)],
      [0.35, rgba("#6ff2ff", 0.5)],
      [0.7, rgba("#ff7ad9", 0.22)],
      [1, "rgba(0,0,0,0)"],
    ]);
    ctx.beginPath();
    ctx.arc(0, my, 20 + flash * 22, 0, TAU);
    ctx.fill();
    ctx.restore();
    sparkle(ctx, 0, my, 12 + pulse * 5, 0.7, "#ffffff");
    ctx.restore();
  },

  drawBullet(ctx, { t, rot }) {
    ctx.save();
    // jejak pelangi
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = lgrad(ctx, 0, 0, 0, 56, [
        [0, rgba(["#ff7ad9", "#6ff2ff", "#a97bff"][i], 0.4)],
        [1, "rgba(0,0,0,0)"],
      ]);
      ctx.beginPath();
      ctx.moveTo(-4 + i * 3, 4);
      ctx.lineTo(-1 + i * 3, 4);
      ctx.lineTo(-1 + i * 3 + Math.sin(t * 12 + i) * 3, 56);
      ctx.lineTo(-4 + i * 3 + Math.sin(t * 12 + i) * 3, 56);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
    ctx.rotate(rot);
    ctx.save();
    ctx.translate(0, 12);
    crystalShard(ctx, 8, 34);
    ctx.fillStyle = lgrad(ctx, -8, -34, 8, 0, [
      [0, rgba("#ffffff", 0.95)],
      [0.4, rgba("#6ff2ff", 0.9)],
      [0.75, rgba("#a97bff", 0.9)],
      [1, rgba("#ff7ad9", 0.9)],
    ]);
    glow(ctx, "#6ff2ff", 16);
    ctx.fill();
    noGlow(ctx);
    ctx.strokeStyle = rgba("#ffffff", 0.95);
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
    sparkle(ctx, 0, -16, 8 + Math.sin(t * 20) * 3, 0.8, "#ffffff");
    ctx.restore();
  },

  drawStuck(ctx, { t, age }) {
    const g = Math.max(0, 1 - age * 1.2);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = rgrad(ctx, 0, -6, 0, 16 + g * 8, [
      [0, rgba("#6ff2ff", 0.28 + g * 0.2)],
      [0.55, rgba("#ff7ad9", 0.12)],
      [1, "rgba(0,0,0,0)"],
    ]);
    ctx.beginPath();
    ctx.arc(0, -6, 16 + g * 8, 0, TAU);
    ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.translate(0, 10);
    crystalShard(ctx, 7.5, 32);
    ctx.fillStyle = lgrad(ctx, -7, -32, 7, 0, [
      [0, rgba("#ffffff", 0.95)],
      [0.4, rgba("#6ff2ff", 0.9)],
      [0.75, rgba("#a97bff", 0.9)],
      [1, rgba("#ff7ad9", 0.85)],
    ]);
    glow(ctx, rgba("#6ff2ff", 0.85), 12 + g * 8);
    ctx.fill();
    noGlow(ctx);
    ctx.strokeStyle = rgba("#ffffff", 0.9);
    ctx.lineWidth = 0.9;
    ctx.stroke();
    ctx.restore();
    if (g > 0.2) sparkle(ctx, -2, -14, 6 + Math.sin(t * 7) * 2, g * 0.7, "#ffffff");
  },

  drawMini(ctx) {
    ctx.save();
    ctx.translate(0, 12);
    crystalShard(ctx, 5.5, 22);
    ctx.fillStyle = lgrad(ctx, -5, -22, 5, 0, [
      [0, "#fff"],
      [0.45, "#6ff2ff"],
      [1, "#ff7ad9"],
    ]);
    glow(ctx, "#6ff2ff", 9);
    ctx.fill();
    noGlow(ctx);
    ctx.strokeStyle = rgba("#fff", 0.9);
    ctx.lineWidth = 0.8;
    ctx.stroke();
    ctx.restore();
  },

  onFire(emit, x, y) {
    for (let i = 0; i < 14; i++) {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * 1.8;
      const sp = 70 + Math.random() * 210;
      emit({
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life: 0.35 + Math.random() * 0.4,
        size: 1.6 + Math.random() * 2.6,
        color: ["#ff7ad9", "#6ff2ff", "#a97bff", "#ffffff"][i % 4],
        kind: "spark",
        grav: 60,
        drag: 2,
        glow: 14,
      });
    }
    emit({ x, y, kind: "ring", life: 0.35, size: 6, grow: 150, color: "#6ff2ff", thick: 2.4, glow: 16 });
  },

  onImpact(emit, x, y, s, info) {
    // kristal kecil tumbuh sesaat lalu pecah
    for (let i = 0; i < 6; i++) {
      const a = Math.atan2(info.ny, info.nx) + (i - 2.5) * 0.42;
      emit({
        x,
        y,
        kind: "crystal",
        life: 0.5 + Math.random() * 0.18,
        size: 5 + Math.random() * 8,
        rot: a + Math.PI / 2,
        color: ["#ff7ad9", "#6ff2ff", "#a97bff"][i % 3],
        grow: 26 * s,
        glow: 14,
      });
    }
    for (let i = 0; i < 18; i++) {
      const a = Math.random() * TAU;
      const sp = (60 + Math.random() * 280) * info.power;
      emit({
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life: 0.45 + Math.random() * 0.5,
        size: 1.3 + Math.random() * 2.6,
        color: ["#ff7ad9", "#6ff2ff", "#a97bff", "#ffffff"][i % 4],
        kind: "spark",
        grav: 260,
        drag: 1.4,
        glow: 14,
      });
    }
    emit({ x, y, kind: "ring", life: 0.6, size: 8, grow: 130 * s, color: "#ff7ad9", thick: 2, glow: 16 });
    emit({ x, y, kind: "ring", life: 0.9, size: 4, grow: 80 * s, color: "#6ff2ff", thick: 1.4, glow: 12 });
  },

  ambient(emit, x, y, s, _t, dt) {
    if (Math.random() < dt * 9) {
      emit({
        x: x + (Math.random() - 0.5) * 56 * s,
        y: y - (20 + Math.random() * 130) * s,
        vx: (Math.random() - 0.5) * 12,
        vy: -18 - Math.random() * 26,
        life: 1 + Math.random() * 0.9,
        size: 1 + Math.random() * 2,
        color: ["#ff7ad9", "#6ff2ff", "#a97bff"][(Math.random() * 3) | 0],
        kind: "mote",
        glow: 12,
      });
    }
  },
};

export const WEAPONS: Weapon[] = [keris, yoyo, diamond, blackhole, crystal];
export const WEAPON_MAP: Record<string, Weapon> = Object.fromEntries(WEAPONS.map((w) => [w.id, w]));
export function getWeapon(id: string): Weapon {
  return WEAPON_MAP[id] ?? keris;
}
