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
const PL = 46; // rocket length
const GUNY = 596; // muzzle top
const TAU = Math.PI * 2;
const THR = 0.115; // angular collision threshold (rad)
const FONT = "Bungee, Impact, 'Arial Black', sans-serif";

export type GameState = "menu" | "playing" | "failing" | "clear" | "over";
export type Weapon = "firework" | "blackhole" | "shark" | "bamboo" | "soaker" | "rainbow" | "bazooka" | "rpg";
export interface UISnap {
  state: GameState;
  level: number;
  score: number;
  best: number;
  weapon: Weapon;
}

type BurstType = "peony" | "ring" | "star" | "heart" | "spiral" | "crackle" | "rainbow" | "willow";
const IMPACT_TYPES: BurstType[] = ["peony", "ring", "star", "heart", "spiral", "crackle", "rainbow"];
const SKY_TYPES: BurstType[] = ["peony", "ring", "star", "heart", "spiral", "crackle", "rainbow", "willow"];

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
  crackle: boolean;
  ax: number;
  ay: number;
  pull: number;
}
interface Pin {
  a: number;
  hue: number;
  flash: number;
  bite: number;
  seed: number;
}
interface Rocket {
  y: number;
  hue: number;
  age: number;
  open: number;
  seed: number;
}
interface BubbleFx {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  r: number;
}
interface LeapShark {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  t: number;
  dur: number;
  hue: number;
  size: number;
  flip: boolean;
}
interface BiteMark {
  a: number;
  life: number;
  max: number;
}
interface SkyRocket {
  x: number;
  y: number;
  vx: number;
  vy: number;
  hue: number;
  type: BurstType;
  scale: number;
}
interface Debris {
  kind: "rocket" | "wedge" | "shard" | "clod";
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vr: number;
  hue: number;
  a0: number;
  life: number;
  hot?: number;
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
interface Jet {
  x: number;
  y: number;
  hue: number;
  life: number;
  max: number;
  len: number;
  wid: number;
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
}
interface RainbowBeam {
  x: number;
  y: number;
  life: number;
  max: number;
  len: number;
  wid: number;
  seed: number;
}
interface Fireball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  r: number;
  hot: number; // 1 = white-yellow newborn, 0 = deep red dying
  seed: number;
}
interface SmokePuff {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  r: number;
  grow: number;
  dark: number; // 0 = light gray, 1 = near-black soot
  seed: number;
}
interface MuzzleFlash {
  x: number;
  y: number;
  life: number;
  max: number;
  r: number;
  seed: number;
  style: "bazooka" | "rpg";
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

// Rocket drawn with its nose at x=0 pointing toward -x, body extends toward +x (length PL)
function drawRocketShape(ctx: CanvasRenderingContext2D, hue: number, flash = 0) {
  // stick
  ctx.strokeStyle = "#e6c27a";
  ctx.lineWidth = 2.6;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(30, 0);
  ctx.lineTo(PL, 0);
  ctx.stroke();
  // fins
  ctx.fillStyle = hsl(hue, 85, 38);
  ctx.beginPath();
  ctx.moveTo(24, -4.5);
  ctx.lineTo(36, -10.5);
  ctx.lineTo(36, -4.5);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(24, 4.5);
  ctx.lineTo(36, 10.5);
  ctx.lineTo(36, 4.5);
  ctx.closePath();
  ctx.fill();
  // body
  const g = ctx.createLinearGradient(0, -5.5, 0, 5.5);
  g.addColorStop(0, hsl(hue, 90, 74));
  g.addColorStop(0.5, hsl(hue, 90, 52));
  g.addColorStop(1, hsl(hue, 90, 32));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.roundRect(11, -5.5, 24, 11, 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.fillRect(18, -5.5, 2.6, 11);
  ctx.fillRect(25, -5.5, 2.6, 11);
  // nose
  ctx.fillStyle = hsl(hue + 35, 100, 62);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(6, -5.5, 12, -5.5);
  ctx.lineTo(12, 5.5);
  ctx.quadraticCurveTo(6, 5.5, 0, 0);
  ctx.closePath();
  ctx.fill();
  if (flash > 0) {
    ctx.fillStyle = `rgba(255,255,255,${Math.min(1, flash) * 0.85})`;
    ctx.beginPath();
    ctx.roundRect(0, -6, 36, 12, 3);
    ctx.fill();
  }
}

// Beautiful shark, nose/mouth at x=0 facing -x, tail extends toward +x (length ~72 = 2x gun).
// open: 0 = mouth shut, 1 = jaws wide open. t = time (tail wag + life), seed = variation.
function drawShark(
  ctx: CanvasRenderingContext2D,
  hue: number,
  open: number,
  t: number,
  seed: number,
  flash = 0
) {
  const wag = Math.sin(t * 11 + seed * 7) * 3.5;
  const breathe = Math.sin(t * 3 + seed * 3) * 0.6;
  const o = Math.max(0, Math.min(1, open));
  const line = "rgba(8,30,55,0.85)";

  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  // ---- tail fin (behind body) ----
  ctx.fillStyle = hsl(hue, 60, 36);
  ctx.strokeStyle = line;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(58, -2 + wag * 0.3);
  ctx.quadraticCurveTo(66, -8 + wag, 73, -14 + wag * 1.4);
  ctx.quadraticCurveTo(70, -6 + wag * 0.8, 68, 0 + wag * 0.4);
  ctx.quadraticCurveTo(70, 5 + wag * 0.4, 72, 10 + wag * 0.6);
  ctx.quadraticCurveTo(65, 8 + wag * 0.4, 59, 4);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // ---- body ----
  const bodyG = ctx.createLinearGradient(0, -14, 0, 12);
  bodyG.addColorStop(0, hsl(hue, 65, 46));
  bodyG.addColorStop(0.45, hsl(hue, 60, 58));
  bodyG.addColorStop(0.75, hsl(Math.min(hue + 10, 220), 45, 80));
  bodyG.addColorStop(1, hsl(205, 50, 93));
  ctx.fillStyle = bodyG;
  ctx.strokeStyle = line;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, 1); // nose tip
  ctx.quadraticCurveTo(10, -11, 30, -12); // head top
  ctx.quadraticCurveTo(48, -12.5, 60, -3 + wag * 0.3); // back to tail base
  ctx.lineTo(60, 5); // tail base
  ctx.quadraticCurveTo(45, 11, 28, 10.5); // belly
  ctx.quadraticCurveTo(12, 10, 3, 5.5); // toward mouth
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // ---- belly shine ----
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.beginPath();
  ctx.ellipse(32, 5.5, 17, 3.2, 0.02, 0, TAU);
  ctx.fill();
  // top highlight
  ctx.strokeStyle = "rgba(255,255,255,0.5)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(10, -8.5);
  ctx.quadraticCurveTo(24, -11.5, 40, -10.5);
  ctx.stroke();

  // ---- spots ----
  ctx.fillStyle = hsl(hue, 55, 72, 0.8);
  for (const [sx, sy, sr] of [[38, -6, 1.7], [45, -4.5, 1.4], [31, -7.5, 1.3]] as const) {
    ctx.beginPath();
    ctx.arc(sx, sy, sr, 0, TAU);
    ctx.fill();
  }

  // ---- dorsal fin ----
  const finG = ctx.createLinearGradient(0, -24, 0, -8);
  finG.addColorStop(0, hsl(hue, 65, 34));
  finG.addColorStop(1, hsl(hue, 60, 48));
  ctx.fillStyle = finG;
  ctx.strokeStyle = line;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(34, -11);
  ctx.quadraticCurveTo(38, -22, 47, -25);
  ctx.quadraticCurveTo(45, -18, 46, -11);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // ---- pectoral fin ----
  ctx.fillStyle = hsl(hue, 60, 40);
  ctx.beginPath();
  ctx.moveTo(30, 8);
  ctx.quadraticCurveTo(36, 13 + breathe, 44, 15 + breathe);
  ctx.quadraticCurveTo(38, 11, 36, 7);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // ---- gills ----
  ctx.strokeStyle = "rgba(8,30,55,0.5)";
  ctx.lineWidth = 1.6;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(25 + i * 3.4, -4);
    ctx.quadraticCurveTo(27 + i * 3.4, 0, 25 + i * 3.4, 4.5);
    ctx.stroke();
  }

  // ---- MOUTH ----
  const hingeX = 21;
  const hingeY = 5.5;
  if (o > 0.03) {
    // open mouth interior
    const tipX = 2 + o * 5;
    const tipY = 4 + o * 17;
    ctx.fillStyle = "#7a1020";
    ctx.beginPath();
    ctx.moveTo(2, 3);
    ctx.quadraticCurveTo(12, 5.5, hingeX, hingeY);
    ctx.lineTo(tipX, tipY);
    ctx.quadraticCurveTo(9, 7 + o * 6, 2, 3);
    ctx.closePath();
    ctx.fill();
    // tongue
    ctx.fillStyle = "#e2607a";
    ctx.beginPath();
    ctx.ellipse(11 + o * 2, 7 + o * 7, 4.5, 2.4, 0.35, 0, TAU);
    ctx.fill();
    // upper teeth (pointing down)
    ctx.fillStyle = "#fff";
    ctx.strokeStyle = line;
    ctx.lineWidth = 1;
    const teeth = 4;
    for (let i = 0; i < teeth; i++) {
      const tx = 4 + i * 4.4;
      const ty = 3.4 + i * 0.55;
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.lineTo(tx + 2.4, ty + 0.4);
      ctx.lineTo(tx + 1.1, ty + 3.6 + o * 1.5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    // lower jaw
    ctx.fillStyle = hsl(205, 45, 88);
    ctx.strokeStyle = line;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(hingeX, hingeY);
    ctx.lineTo(tipX, tipY);
    ctx.quadraticCurveTo(tipX - 1, tipY + 2.6, tipX - 4, tipY + 1.5);
    ctx.lineTo(hingeX - 2, hingeY + 3);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // lower teeth (pointing up)
    ctx.fillStyle = "#fff";
    for (let i = 0; i < 3; i++) {
      const f = 0.25 + i * 0.28;
      const tx = hingeX + (tipX - hingeX) * f;
      const ty = hingeY + 2.5 + (tipY - hingeY) * f;
      ctx.beginPath();
      ctx.moveTo(tx - 1.6, ty);
      ctx.lineTo(tx + 1.6, ty - 0.6);
      ctx.lineTo(tx - 0.2, ty - 3.4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  } else {
    // closed mouth — sly smile
    ctx.strokeStyle = line;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(2, 3.5);
    ctx.quadraticCurveTo(11, 6.5, 20, 5.5);
    ctx.stroke();
  }

  // ---- eye (fierce + cute) ----
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(11.5, -4.5, 3.4, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = line;
  ctx.lineWidth = 1.2;
  ctx.stroke();
  const lookX = -o * 1.2;
  ctx.fillStyle = "#0a1a30";
  ctx.beginPath();
  ctx.arc(11 + lookX, -4.4, 1.9, 0, TAU);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(10.4 + lookX, -5, 0.8, 0, TAU);
  ctx.fill();
  // angry brow
  ctx.strokeStyle = line;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(6.5, -9.5);
  ctx.lineTo(15, -7.5);
  ctx.stroke();

  if (flash > 0) {
    ctx.fillStyle = `rgba(255,255,255,${Math.min(1, flash) * 0.7})`;
    ctx.beginPath();
    ctx.ellipse(32, 0, 34, 13, 0, 0, TAU);
    ctx.fill();
  }
}

// Singularity orb for the black-hole gun, centred on (0,0)
function drawOrb(ctx: CanvasRenderingContext2D, hue: number, r: number, t: number, seed: number) {
  // ---- deep gravitational lensing halo (two layers) ----
  const halo = ctx.createRadialGradient(0, 0, r * 0.5, 0, 0, r * 3.4);
  halo.addColorStop(0, hsl(hue, 100, 60, 0.55));
  halo.addColorStop(0.45, hsl(hue + 25, 100, 55, 0.2));
  halo.addColorStop(1, hsl(hue + 40, 100, 55, 0));
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(0, 0, r * 3.4, 0, TAU);
  ctx.fill();
  // faint outer einstein ring
  ctx.strokeStyle = hsl(hue + 30, 100, 70, 0.28);
  ctx.lineWidth = Math.max(1, r * 0.07);
  ctx.beginPath();
  ctx.arc(0, 0, r * 2.5, 0, TAU);
  ctx.stroke();
  // ---- accretion disk: wide faint band + hot thin band ----
  ctx.save();
  ctx.rotate(-0.35);
  ctx.scale(1, 0.45);
  ctx.strokeStyle = hsl(hue - 20, 95, 45, 0.55);
  ctx.lineWidth = r * 0.52;
  ctx.beginPath();
  ctx.arc(0, 0, r * 1.45, 0, TAU);
  ctx.stroke();
  ctx.strokeStyle = hsl(hue, 100, 62, 0.95);
  ctx.lineWidth = r * 0.3;
  ctx.beginPath();
  ctx.arc(0, 0, r * 1.38, 0, TAU);
  ctx.stroke();
  // doppler-bright side (one side burns white-hot)
  ctx.strokeStyle = hsl(hue + 45, 100, 80, 0.95);
  ctx.lineWidth = Math.max(1.4, r * 0.14);
  ctx.beginPath();
  ctx.arc(0, 0, r * 1.38, Math.PI * 0.95, Math.PI * 1.95);
  ctx.stroke();
  ctx.strokeStyle = "rgba(255,255,255,0.9)";
  ctx.lineWidth = Math.max(1, r * 0.07);
  ctx.beginPath();
  ctx.arc(0, 0, r * 1.38, Math.PI * 1.2, Math.PI * 1.7);
  ctx.stroke();
  // racing hotspots on the disk
  const k1 = t * 4.5 + seed;
  ctx.fillStyle = "#fff";
  for (const a of [k1, k1 + (TAU / 3), k1 + (TAU * 2) / 3]) {
    ctx.beginPath();
    ctx.arc(Math.cos(a) * r * 1.38, Math.sin(a) * r * 1.38, Math.max(1.1, r * 0.15), 0, TAU);
    ctx.fill();
  }
  ctx.restore();
  // ---- event horizon: abyssal black with hawking shimmer rim ----
  const eg = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.1, 0, 0, r);
  eg.addColorStop(0, "#05010f");
  eg.addColorStop(0.7, "#020108");
  eg.addColorStop(1, "#000");
  ctx.fillStyle = eg;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, TAU);
  ctx.fill();
  const shim = 0.75 + 0.25 * Math.sin(t * 9 + seed * 5);
  ctx.strokeStyle = hsl(hue + 60, 100, 82, 0.95 * shim + 0.05);
  ctx.lineWidth = 2.2;
  ctx.stroke();
  // double photon ring
  ctx.strokeStyle = "rgba(255,255,255,0.75)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.85, 0, TAU);
  ctx.stroke();
  ctx.strokeStyle = hsl(hue + 40, 100, 75, 0.6);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.68, 0, TAU);
  ctx.stroke();
  // inner swirls (counter-rotating)
  ctx.strokeStyle = hsl(hue, 100, 70, 0.85);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.5, t * 5 + seed, t * 5 + seed + Math.PI * 1.2);
  ctx.stroke();
  ctx.strokeStyle = hsl(hue + 70, 100, 78, 0.7);
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.32, -t * 7 + seed * 2, -t * 7 + seed * 2 + Math.PI);
  ctx.stroke();
  // orbiting light motes bent around the well
  for (let q = 0; q < 2; q++) {
    const sa = t * 2.6 + seed + q * Math.PI;
    ctx.fillStyle = q === 0 ? "#fff" : hsl(hue + 55, 100, 78, 0.95);
    ctx.beginPath();
    ctx.arc(Math.cos(sa) * r * 1.9, Math.sin(sa) * r * 1.9, q === 0 ? 1.7 : 1.3, 0, TAU);
    ctx.fill();
  }
}

// Round river stone for the bamboo cannon. hue shifts tint slightly (gray/brown/moss).
function drawStone(ctx: CanvasRenderingContext2D, hue: number, r: number, t: number, seed: number, flash = 0) {
  const spin = t * 2.2 + seed * 3;
  ctx.save();
  ctx.rotate(spin * 0.35);
  // soft shadow glow for readability
  const halo = ctx.createRadialGradient(0, 0, r * 0.4, 0, 0, r * 2.1);
  halo.addColorStop(0, "rgba(255,200,130,0.22)");
  halo.addColorStop(1, "rgba(255,200,130,0)");
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(0, 0, r * 2.1, 0, TAU);
  ctx.fill();
  // lumpy rock silhouette (deterministic by seed)
  ctx.beginPath();
  const lumps = 9;
  for (let i = 0; i <= lumps; i++) {
    const a = (i / lumps) * TAU;
    const wob = 1 + 0.1 * Math.sin(seed * 12.9 + i * 2.4) + 0.05 * Math.sin(seed * 5.1 + i * 5.2);
    const rr = r * wob;
    const x = Math.cos(a) * rr;
    const y = Math.sin(a) * rr * 0.92;
    if (i === 0) ctx.moveTo(x, y);
    else {
      const pa = ((i - 1) / lumps) * TAU;
      const mx = (Math.cos(pa) + Math.cos(a)) * 0.5 * rr;
      const my = (Math.sin(pa) + Math.sin(a)) * 0.5 * rr * 0.92;
      ctx.quadraticCurveTo(Math.cos(pa) * rr, Math.sin(pa) * rr * 0.92, mx, my);
    }
  }
  ctx.closePath();
  const g = ctx.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.15, 0, 0, r * 1.25);
  g.addColorStop(0, hsl(hue, 14, 72));
  g.addColorStop(0.55, hsl(hue, 12, 52));
  g.addColorStop(1, hsl(hue, 14, 32));
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = "rgba(25,18,12,0.85)";
  ctx.lineWidth = 2;
  ctx.stroke();
  // top-left highlight
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.beginPath();
  ctx.ellipse(-r * 0.32, -r * 0.42, r * 0.34, r * 0.2, -0.5, 0, TAU);
  ctx.fill();
  // cracks
  ctx.strokeStyle = "rgba(20,14,10,0.55)";
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.moveTo(-r * 0.15, -r * 0.1);
  ctx.lineTo(r * 0.25, r * 0.05);
  ctx.lineTo(r * 0.1, r * 0.42);
  ctx.moveTo(r * 0.02, -r * 0.02);
  ctx.lineTo(-r * 0.35, r * 0.3);
  ctx.stroke();
  // speckles
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  for (let i = 0; i < 4; i++) {
    const a = seed + i * 1.7;
    ctx.beginPath();
    ctx.arc(Math.cos(a) * r * 0.45, Math.sin(a * 1.3) * r * 0.4, 1.2, 0, TAU);
    ctx.fill();
  }
  // moss patch
  ctx.fillStyle = "rgba(110,170,70,0.75)";
  ctx.beginPath();
  ctx.ellipse(r * 0.42, -r * 0.34, r * 0.24, r * 0.16, 0.4, 0, TAU);
  ctx.fill();
  ctx.restore();
  if (flash > 0) {
    ctx.fillStyle = `rgba(255,255,255,${Math.min(1, flash) * 0.65})`;
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.05, 0, TAU);
    ctx.fill();
  }
}

// Glossy water blob for the super soaker. Wobbles like jelly.
function drawDrop(ctx: CanvasRenderingContext2D, hue: number, r: number, t: number, seed: number, flash = 0) {
  const wob = Math.sin(t * 9 + seed * 6) * 0.09;
  // aqua halo
  const halo = ctx.createRadialGradient(0, 0, r * 0.4, 0, 0, r * 2.6);
  halo.addColorStop(0, hsl(hue, 100, 62, 0.4));
  halo.addColorStop(1, hsl(hue, 100, 55, 0));
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(0, 0, r * 2.6, 0, TAU);
  ctx.fill();
  ctx.save();
  ctx.scale(1 + wob, 1 - wob);
  // droplet body (round bottom, soft point on top)
  const g = ctx.createRadialGradient(-r * 0.35, -r * 0.3, r * 0.15, 0, 0, r * 1.3);
  g.addColorStop(0, hsl(hue, 95, 78));
  g.addColorStop(0.45, hsl(hue, 95, 62));
  g.addColorStop(1, hsl(hue + 12, 90, 42));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(0, -r * 1.35);
  ctx.bezierCurveTo(r * 0.75, -r * 0.5, r * 0.95, -r * 0.1, r * 0.95, r * 0.32);
  ctx.bezierCurveTo(r * 0.95, r * 0.85, r * 0.5, r * 1.1, 0, r * 1.1);
  ctx.bezierCurveTo(-r * 0.5, r * 1.1, -r * 0.95, r * 0.85, -r * 0.95, r * 0.32);
  ctx.bezierCurveTo(-r * 0.95, -r * 0.1, -r * 0.75, -r * 0.5, 0, -r * 1.35);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.75)";
  ctx.lineWidth = 1.6;
  ctx.stroke();
  // glossy highlight
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.beginPath();
  ctx.ellipse(-r * 0.34, r * 0.1, r * 0.16, r * 0.34, -0.25, 0, TAU);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.95)";
  ctx.beginPath();
  ctx.arc(r * 0.3, -r * 0.5, r * 0.11, 0, TAU);
  ctx.fill();
  // inner sparkle
  const tw = 0.5 + 0.5 * Math.sin(t * 6 + seed * 9);
  ctx.fillStyle = `rgba(255,255,255,${0.35 + 0.35 * tw})`;
  ctx.beginPath();
  ctx.arc(r * 0.12, r * 0.45, r * 0.13, 0, TAU);
  ctx.fill();
  ctx.restore();
  if (flash > 0) {
    ctx.fillStyle = `rgba(255,255,255,${Math.min(1, flash) * 0.6})`;
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.15, 0, TAU);
    ctx.fill();
  }
}

// Rainbow laser bolt: nose/tip at x=0 facing -x, energy tail extends toward +x (length ~64).
// Flowing spectrum bands + white-hot core + prism crystal tip.
function drawRainbowBolt(
  ctx: CanvasRenderingContext2D,
  t: number,
  seed: number,
  flash = 0,
  scale = 1
) {
  const L = 64 * scale;
  const flow = t * 320 + seed * 140;
  ctx.lineCap = "round";
  // outer rainbow aura
  for (let i = 0; i < 3; i++) {
    const wdt = (10 - i * 2.6) * scale;
    const grad = ctx.createLinearGradient(0, 0, L, 0);
    for (let s = 0; s <= 6; s++) {
      grad.addColorStop(s / 6, hsl(flow + s * 60 + i * 22, 100, 60, 0.28 - i * 0.07));
    }
    ctx.strokeStyle = grad;
    ctx.lineWidth = wdt + 4 * scale;
    ctx.beginPath();
    ctx.moveTo(2, 0);
    ctx.lineTo(L, 0);
    ctx.stroke();
  }
  // spectrum bands (6 flowing stripes)
  for (let b = 0; b < 6; b++) {
    const yy = (-7.5 + b * 3) * scale;
    const grad = ctx.createLinearGradient(0, 0, L, 0);
    for (let s = 0; s <= 5; s++) {
      grad.addColorStop(s / 5, hsl(flow + b * 24 + s * 72, 100, 62, 0.95));
    }
    ctx.strokeStyle = grad;
    ctx.lineWidth = 2.6 * scale;
    ctx.beginPath();
    ctx.moveTo(4, yy);
    ctx.lineTo(L - 2, yy * 0.4);
    ctx.stroke();
  }
  // white-hot laser core
  const core = ctx.createLinearGradient(0, 0, L, 0);
  core.addColorStop(0, "rgba(255,255,255,0.95)");
  core.addColorStop(0.7, "rgba(255,255,255,0.85)");
  core.addColorStop(1, "rgba(255,255,255,0)");
  ctx.strokeStyle = core;
  ctx.lineWidth = 3.4 * scale;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(L, 0);
  ctx.stroke();
  // crackling arcs around the bolt
  ctx.lineWidth = 1.2 * scale;
  for (let i = 0; i < 3; i++) {
    const a0 = t * 9 + seed * 4 + (i * TAU) / 3;
    const mx = L * 0.45 + Math.cos(a0) * 6 * scale;
    const my = Math.sin(a0) * 9 * scale;
    ctx.strokeStyle = hsl(flow + i * 120, 100, 75, 0.8);
    ctx.beginPath();
    ctx.moveTo(L * 0.25, 0);
    ctx.quadraticCurveTo(mx, my, L * 0.65, 0);
    ctx.stroke();
  }
  // prism crystal tip (nose)
  const tipG = ctx.createLinearGradient(-8 * scale, 0, 10 * scale, 0);
  tipG.addColorStop(0, "#ffffff");
  tipG.addColorStop(0.5, hsl(flow, 100, 72));
  tipG.addColorStop(1, hsl(flow + 120, 100, 65));
  ctx.fillStyle = tipG;
  ctx.strokeStyle = "rgba(255,255,255,0.9)";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-9 * scale, 0);
  ctx.lineTo(2 * scale, -6.5 * scale);
  ctx.lineTo(9 * scale, 0);
  ctx.lineTo(2 * scale, 6.5 * scale);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // tip sparkle
  const tw = 0.5 + 0.5 * Math.sin(t * 12 + seed * 8);
  ctx.fillStyle = `rgba(255,255,255,${0.5 + 0.5 * tw})`;
  ctx.beginPath();
  ctx.arc(0, 0, (2 + tw * 1.6) * scale, 0, TAU);
  ctx.fill();
  if (flash > 0) {
    ctx.fillStyle = `rgba(255,255,255,${Math.min(1, flash) * 0.7})`;
    ctx.beginPath();
    ctx.ellipse(L * 0.45, 0, L * 0.55, 11 * scale, 0, 0, TAU);
    ctx.fill();
  }
}

// Bazooka rocket: nose at x=0 pointing toward -x, tail extends toward +x (length ~58).
// Realistic 2D: weathered olive-drab steel, copper shaped-charge cone, rivets,
// stencil star, blinking tracer + layered sustainer flame with mach diamonds.
function drawBazookaShell(
  ctx: CanvasRenderingContext2D,
  hue: number,
  t: number,
  seed: number,
  flash = 0,
  exhaust = 0
) {
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  const line = "rgba(18,20,9,0.92)";
  const flick = Math.sin(t * 43 + seed * 9) * 0.5 + Math.sin(t * 61 + seed * 4) * 0.3;

  // ---- exhaust back-glow halo (under everything) ----
  if (exhaust > 0.01) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const halo = ctx.createRadialGradient(62, 0, 2, 62, 0, 34);
    halo.addColorStop(0, `rgba(255,200,110,${0.5 * exhaust})`);
    halo.addColorStop(0.5, `rgba(255,130,40,${0.22 * exhaust})`);
    halo.addColorStop(1, "rgba(255,110,30,0)");
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(62, 0, 34, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  // ---- tail fins with thickness + shadow ----
  for (const s of [-1, 1]) {
    // shadow side
    ctx.fillStyle = "rgba(12,14,6,0.55)";
    ctx.beginPath();
    ctx.moveTo(39, s * 4);
    ctx.lineTo(55, s * 12.5);
    ctx.lineTo(57.5, s * 12.5);
    ctx.lineTo(47, s * 4);
    ctx.closePath();
    ctx.fill();
    const fg = ctx.createLinearGradient(40, 0, 56, s * 12);
    fg.addColorStop(0, "#55652c");
    fg.addColorStop(0.55, "#3d4a20");
    fg.addColorStop(1, "#242b12");
    ctx.fillStyle = fg;
    ctx.strokeStyle = line;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(38, s * 4);
    ctx.lineTo(54, s * 11);
    ctx.lineTo(57, s * 11);
    ctx.lineTo(46, s * 4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // worn yellow tip edge
    ctx.strokeStyle = "#e8c832";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(54, s * 11);
    ctx.lineTo(57, s * 11);
    ctx.stroke();
    ctx.fillStyle = "rgba(255,255,240,0.35)";
    ctx.beginPath();
    ctx.moveTo(40, s * 4.5);
    ctx.lineTo(50, s * 9.5);
    ctx.lineTo(48.5, s * 9.5);
    ctx.lineTo(39, s * 4.5);
    ctx.closePath();
    ctx.fill();
  }

  // ---- exhaust nozzle: steel ring + dark bore + hot throat ----
  const nozG = ctx.createLinearGradient(0, -5, 0, 5);
  nozG.addColorStop(0, "#5a5a64");
  nozG.addColorStop(0.45, "#2b2b30");
  nozG.addColorStop(1, "#121214");
  ctx.fillStyle = nozG;
  ctx.strokeStyle = line;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.roundRect(50, -4.8, 9.5, 9.6, 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#060608";
  ctx.beginPath();
  ctx.ellipse(59.5, 0, 2.2, 3.4, 0, 0, TAU);
  ctx.fill();
  if (exhaust > 0.01) {
    ctx.fillStyle = `rgba(255,${170 + Math.round(flick * 30)},80,${0.95 * exhaust})`;
    ctx.beginPath();
    ctx.ellipse(59.5, 0, 1.4, 2.4, 0, 0, TAU);
    ctx.fill();
  }

  // ---- main tube body: brushed olive steel ----
  const bodyG = ctx.createLinearGradient(0, -6.5, 0, 6.5);
  bodyG.addColorStop(0, "#a8b862");
  bodyG.addColorStop(0.22, "#7c8c44");
  bodyG.addColorStop(0.45, "#59682e");
  bodyG.addColorStop(0.72, "#39421e");
  bodyG.addColorStop(1, "#202613");
  ctx.fillStyle = bodyG;
  ctx.strokeStyle = line;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(14, -6.5, 38, 13, 2.5);
  ctx.fill();
  ctx.stroke();
  // cylindrical top light + bottom bounce
  ctx.fillStyle = "rgba(255,255,225,0.42)";
  ctx.fillRect(16, -5.6, 34, 1.8);
  ctx.fillStyle = "rgba(255,220,150,0.12)";
  ctx.fillRect(16, 3.2, 34, 2.2);
  // brushed-metal streaks
  ctx.strokeStyle = "rgba(20,24,10,0.28)";
  ctx.lineWidth = 0.8;
  for (let i = 0; i < 3; i++) {
    const yy = -2.5 + i * 2.4 + Math.sin(seed * 5 + i) * 0.5;
    ctx.beginPath();
    ctx.moveTo(16, yy);
    ctx.lineTo(50, yy);
    ctx.stroke();
  }
  // battle-wear scratches
  ctx.strokeStyle = "rgba(230,235,200,0.5)";
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.moveTo(20 + (seed % 6), -4);
  ctx.lineTo(24 + (seed % 6), 2);
  ctx.moveTo(44, 1);
  ctx.lineTo(47, 4.5);
  ctx.stroke();
  // red warhead band with shading
  const bandG = ctx.createLinearGradient(0, -6.5, 0, 6.5);
  bandG.addColorStop(0, "#e0484e");
  bandG.addColorStop(0.5, "#a01e24");
  bandG.addColorStop(1, "#5e1115");
  ctx.fillStyle = bandG;
  ctx.fillRect(30, -6.5, 5, 13);
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.fillRect(30, -6.5, 5, 2.2);
  // yellow stencil stripe + star with drop shadow
  ctx.fillStyle = "#e8c832";
  ctx.fillRect(42, -6.5, 3, 13);
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.fillRect(42, 2.5, 3, 4);
  ctx.save();
  ctx.translate(22.6, 0.7);
  ctx.scale(0.55, 0.55);
  starPath(ctx, 7);
  ctx.fillStyle = "rgba(10,12,5,0.5)";
  ctx.fill();
  ctx.restore();
  ctx.save();
  ctx.translate(22, 0);
  ctx.scale(0.55, 0.55);
  starPath(ctx, 7);
  ctx.fillStyle = "rgba(242,242,218,0.95)";
  ctx.fill();
  ctx.restore();
  // rivets with specular dots
  for (const rx of [17, 49]) {
    for (const ry of [-3.5, 3.5]) {
      ctx.fillStyle = "#1c1e10";
      ctx.beginPath();
      ctx.arc(rx, ry, 1.2, 0, TAU);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,230,0.7)";
      ctx.beginPath();
      ctx.arc(rx - 0.35, ry - 0.35, 0.45, 0, TAU);
      ctx.fill();
    }
  }

  // ---- copper shaped-charge cone with specular sweep ----
  const noseG = ctx.createLinearGradient(0, -7.5, 0, 7.5);
  noseG.addColorStop(0, "#ffd9a0");
  noseG.addColorStop(0.3, "#e8934a");
  noseG.addColorStop(0.6, "#a05a1a");
  noseG.addColorStop(1, "#5e2f0c");
  ctx.fillStyle = noseG;
  ctx.strokeStyle = line;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-1, 0);
  ctx.quadraticCurveTo(5, -7.5, 15, -6.5);
  ctx.lineTo(15, 6.5);
  ctx.quadraticCurveTo(5, 7.5, -1, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // cone specular streak
  ctx.strokeStyle = "rgba(255,240,215,0.75)";
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(3, -4.5);
  ctx.quadraticCurveTo(8, -5.2, 12.5, -5);
  ctx.stroke();
  // cone base ring
  ctx.fillStyle = "#3a3a40";
  ctx.fillRect(13.5, -6.5, 2.2, 13);
  // nose fuse tip: steel + glass dot
  const fuseG = ctx.createRadialGradient(-2, -1, 0.4, -1.5, 0, 2.8);
  fuseG.addColorStop(0, "#ffffff");
  fuseG.addColorStop(0.6, "#b8b8c4");
  fuseG.addColorStop(1, "#5a5a66");
  ctx.fillStyle = fuseG;
  ctx.strokeStyle = line;
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.arc(-1.5, 0, 2.5, 0, TAU);
  ctx.fill();
  ctx.stroke();

  // tracer light with halo
  const tw = 0.5 + 0.5 * Math.sin(t * 9 + seed * 6);
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const tg = ctx.createRadialGradient(37.5, 0, 0, 37.5, 0, 6);
  tg.addColorStop(0, hsl(hue, 100, 62, 0.55 * (0.4 + 0.6 * tw)));
  tg.addColorStop(1, hsl(hue, 100, 60, 0));
  ctx.fillStyle = tg;
  ctx.beginPath();
  ctx.arc(37.5, 0, 6, 0, TAU);
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = hsl(hue, 100, 62, 0.6 + 0.4 * tw);
  ctx.beginPath();
  ctx.arc(37.5, 0, 1.8, 0, TAU);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.beginPath();
  ctx.arc(37.1, -0.4, 0.6, 0, TAU);
  ctx.fill();

  // ---- sustainer exhaust: 3-layer flame + mach diamonds + smoke root ----
  if (exhaust > 0.01) {
    const fl = 17 + flick * 5;
    const wob = Math.sin(t * 55 + seed * 7) * 1.4;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    // outer tongue (deep orange, translucent)
    const outer = ctx.createLinearGradient(59, 0, 59 + fl + 14, 0);
    outer.addColorStop(0, `rgba(255,150,50,${0.75 * exhaust})`);
    outer.addColorStop(0.55, `rgba(255,110,25,${0.45 * exhaust})`);
    outer.addColorStop(1, "rgba(255,70,15,0)");
    ctx.fillStyle = outer;
    ctx.beginPath();
    ctx.moveTo(59, -5.2);
    ctx.quadraticCurveTo(59 + fl * 0.55, -5.5 + wob, 59 + fl + 12, wob * 1.4);
    ctx.quadraticCurveTo(59 + fl * 0.55, 5.5 + wob, 59, 5.2);
    ctx.closePath();
    ctx.fill();
    // mid tongue (gold)
    const mid = ctx.createLinearGradient(59, 0, 59 + fl * 0.72, 0);
    mid.addColorStop(0, `rgba(255,240,180,${0.95 * exhaust})`);
    mid.addColorStop(0.6, `rgba(255,205,90,${0.8 * exhaust})`);
    mid.addColorStop(1, "rgba(255,160,50,0)");
    ctx.fillStyle = mid;
    ctx.beginPath();
    ctx.moveTo(59, -3.2);
    ctx.quadraticCurveTo(59 + fl * 0.4, -3.4 + wob * 0.6, 59 + fl * 0.72, wob * 0.8);
    ctx.quadraticCurveTo(59 + fl * 0.4, 3.4 + wob * 0.6, 59, 3.2);
    ctx.closePath();
    ctx.fill();
    // white-hot core
    ctx.fillStyle = `rgba(255,255,255,${0.95 * exhaust})`;
    ctx.beginPath();
    ctx.ellipse(62.5, wob * 0.3, 5.5, 2.4, 0, 0, TAU);
    ctx.fill();
    // mach diamonds
    ctx.fillStyle = `rgba(220,240,255,${0.85 * exhaust})`;
    for (let i = 0; i < 2; i++) {
      const dx = 66 + i * 6 + flick * 1.5;
      const dw = 2.6 - i * 0.8;
      ctx.beginPath();
      ctx.moveTo(dx - dw, 0);
      ctx.lineTo(dx, -1.5);
      ctx.lineTo(dx + dw, 0);
      ctx.lineTo(dx, 1.5);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
    // smoke root wisp (normal blending, gray)
    ctx.fillStyle = `rgba(150,148,142,${0.4 * exhaust})`;
    ctx.beginPath();
    ctx.ellipse(59 + fl + 10, wob * 1.4, 7, 4.5, 0, 0, TAU);
    ctx.fill();
  }
  if (flash > 0) {
    ctx.fillStyle = `rgba(255,255,255,${Math.min(1, flash) * 0.7})`;
    ctx.beginPath();
    ctx.roundRect(-2, -7, 61, 14, 4);
    ctx.fill();
  }
}

// RPG-7 grenade: fat shaped-charge warhead at nose (x=0, facing -x), skinny booster
// stick extends toward +x (length ~60). Realistic 2D: rusted onion warhead, heat-tinted
// booster, 4-blade fins with depth, piezo spike + long booster jet with mach diamonds.
function drawRpgGrenade(
  ctx: CanvasRenderingContext2D,
  hue: number,
  t: number,
  seed: number,
  flash = 0,
  exhaust = 0
) {
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  const line = "rgba(22,12,5,0.92)";
  const flick = Math.sin(t * 47 + seed * 8) * 0.5 + Math.sin(t * 67 + seed * 3) * 0.3;

  if (exhaust > 0.01) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const halo = ctx.createRadialGradient(63, 0, 2, 63, 0, 38);
    halo.addColorStop(0, `rgba(210,240,255,${0.45 * exhaust})`);
    halo.addColorStop(0.45, `rgba(255,190,100,${0.25 * exhaust})`);
    halo.addColorStop(1, "rgba(255,130,40,0)");
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(63, 0, 38, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  // ---- far fins (dark, behind) for 4-blade depth ----
  ctx.fillStyle = "rgba(16,30,14,0.85)";
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(47, s * 2);
    ctx.lineTo(57, s * 8);
    ctx.lineTo(59, s * 8);
    ctx.lineTo(51, s * 2);
    ctx.closePath();
    ctx.fill();
  }
  // ---- near fins ----
  for (const s of [-1, 1]) {
    ctx.fillStyle = "rgba(10,18,8,0.5)";
    ctx.beginPath();
    ctx.moveTo(44, s * 3);
    ctx.lineTo(58, s * 13.5);
    ctx.lineTo(61, s * 13.5);
    ctx.lineTo(50, s * 3);
    ctx.closePath();
    ctx.fill();
    const fg = ctx.createLinearGradient(44, 0, 60, s * 13);
    fg.addColorStop(0, "#4d7f40");
    fg.addColorStop(0.6, "#2c5222");
    fg.addColorStop(1, "#162b12");
    ctx.fillStyle = fg;
    ctx.strokeStyle = line;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(44, s * 3);
    ctx.lineTo(58, s * 12);
    ctx.lineTo(61, s * 12);
    ctx.lineTo(50, s * 3);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = "#d8ef9a";
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(58, s * 12);
    ctx.lineTo(61, s * 12);
    ctx.stroke();
    ctx.fillStyle = "rgba(220,255,200,0.3)";
    ctx.beginPath();
    ctx.moveTo(46, s * 3.4);
    ctx.lineTo(54, s * 9.5);
    ctx.lineTo(52.5, s * 9.5);
    ctx.lineTo(45, s * 3.4);
    ctx.closePath();
    ctx.fill();
  }

  // ---- booster nozzle with heat tint ----
  const nozG = ctx.createLinearGradient(0, -4, 0, 4);
  nozG.addColorStop(0, "#5a5a64");
  nozG.addColorStop(0.5, "#2e2e34");
  nozG.addColorStop(1, "#101014");
  ctx.fillStyle = nozG;
  ctx.strokeStyle = line;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.roundRect(52, -3.8, 8.5, 7.6, 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#07070a";
  ctx.beginPath();
  ctx.ellipse(60.5, 0, 2, 2.8, 0, 0, TAU);
  ctx.fill();
  if (exhaust > 0.01) {
    ctx.fillStyle = `rgba(200,235,255,${0.95 * exhaust})`;
    ctx.beginPath();
    ctx.ellipse(60.5, 0, 1.3, 2, 0, 0, TAU);
    ctx.fill();
  }

  // ---- skinny booster stick with heat discoloration ----
  const stickG = ctx.createLinearGradient(0, -4, 0, 4);
  stickG.addColorStop(0, "#8cc45a");
  stickG.addColorStop(0.4, "#55883a");
  stickG.addColorStop(0.75, "#334f22");
  stickG.addColorStop(1, "#1c3013");
  ctx.fillStyle = stickG;
  ctx.strokeStyle = line;
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.roundRect(26, -4, 28, 8, 2.5);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,0.34)";
  ctx.fillRect(28, -3, 24, 1.6);
  // heat tint near nozzle (blued steel)
  if (exhaust > 0.01) {
    ctx.fillStyle = `rgba(90,120,255,${0.35 * exhaust})`;
    ctx.fillRect(46, -4, 8, 8);
    ctx.fillStyle = `rgba(180,110,255,${0.25 * exhaust})`;
    ctx.fillRect(42, -4, 5, 8);
  }
  // red arming band + white stripe
  const armG = ctx.createLinearGradient(0, -4, 0, 4);
  armG.addColorStop(0, "#f05048");
  armG.addColorStop(0.5, "#b02820");
  armG.addColorStop(1, "#5e130e");
  ctx.fillStyle = armG;
  ctx.fillRect(44, -4, 4.5, 8);

  // ---- FAT onion warhead: rusted steel with speckle + specular ----
  const warG = ctx.createLinearGradient(0, -11, 0, 11);
  warG.addColorStop(0, "#f2c88e");
  warG.addColorStop(0.3, "#c98a48");
  warG.addColorStop(0.6, "#8a5527");
  warG.addColorStop(0.85, "#54300f");
  warG.addColorStop(1, "#331b08");
  ctx.fillStyle = warG;
  ctx.strokeStyle = line;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-1, 0);
  ctx.quadraticCurveTo(4, -10.8, 14, -10.8);
  ctx.quadraticCurveTo(24, -10.2, 27, -4);
  ctx.lineTo(27, 4);
  ctx.quadraticCurveTo(24, 10.2, 14, 10.8);
  ctx.quadraticCurveTo(4, 10.8, -1, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // big soft specular
  ctx.fillStyle = "rgba(255,244,220,0.5)";
  ctx.beginPath();
  ctx.ellipse(11, -5.8, 6.5, 2.8, -0.4, 0, TAU);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.beginPath();
  ctx.ellipse(9, -6.2, 2.6, 1.1, -0.4, 0, TAU);
  ctx.fill();
  // rust speckle (deterministic)
  ctx.fillStyle = "rgba(60,30,10,0.5)";
  for (let i = 0; i < 7; i++) {
    const a = seed * 3 + i * 2.3;
    const px = 8 + Math.cos(a) * 9;
    const py = Math.sin(a * 1.4) * 6.5;
    if (px > 1 && px < 25 && Math.abs(py) < 9) {
      ctx.beginPath();
      ctx.arc(px, py, 0.7 + (i % 3) * 0.4, 0, TAU);
      ctx.fill();
    }
  }
  // lathe rings
  ctx.strokeStyle = "rgba(50,28,10,0.55)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(14, -10.2);
  ctx.quadraticCurveTo(17, 0, 14, 10.2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(21, -8.6);
  ctx.quadraticCurveTo(23.5, 0, 21, 8.6);
  ctx.stroke();
  // base collar ring
  ctx.fillStyle = "#3c3c38";
  ctx.fillRect(25.5, -4.5, 2.5, 9);
  ctx.fillStyle = "rgba(255,255,255,0.3)";
  ctx.fillRect(25.5, -4.5, 2.5, 1.6);

  // standoff spike + piezo tip with glint
  const spikeG = ctx.createLinearGradient(0, -2, 0, 2);
  spikeG.addColorStop(0, "#e8e8f0");
  spikeG.addColorStop(0.5, "#a8a8b4");
  spikeG.addColorStop(1, "#55555e");
  ctx.fillStyle = spikeG;
  ctx.strokeStyle = line;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.roundRect(-6.5, -1.8, 7.5, 3.6, 1.5);
  ctx.fill();
  ctx.stroke();
  const tipG = ctx.createRadialGradient(-7, -0.6, 0.3, -6.5, 0, 2.2);
  tipG.addColorStop(0, "#ffffff");
  tipG.addColorStop(0.7, "#c4c4d0");
  tipG.addColorStop(1, "#6a6a76");
  ctx.fillStyle = tipG;
  ctx.beginPath();
  ctx.arc(-6.5, 0, 2.1, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = line;
  ctx.lineWidth = 1.1;
  ctx.stroke();

  // tracer light with halo
  const tw = 0.5 + 0.5 * Math.sin(t * 10 + seed * 7);
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const tg = ctx.createRadialGradient(33, 0, 0, 33, 0, 5.5);
  tg.addColorStop(0, hsl(hue, 100, 64, 0.55 * (0.4 + 0.6 * tw)));
  tg.addColorStop(1, hsl(hue, 100, 60, 0));
  ctx.fillStyle = tg;
  ctx.beginPath();
  ctx.arc(33, 0, 5.5, 0, TAU);
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = hsl(hue, 100, 64, 0.6 + 0.4 * tw);
  ctx.beginPath();
  ctx.arc(33, 0, 1.7, 0, TAU);
  ctx.fill();

  // ---- booster jet: long blue-white core + orange sheath + mach diamonds ----
  if (exhaust > 0.01) {
    const fl = 23 + flick * 6;
    const wob = Math.sin(t * 58 + seed * 6) * 1.2;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    // outer sheath
    const outer = ctx.createLinearGradient(60, 0, 60 + fl + 14, 0);
    outer.addColorStop(0, `rgba(255,170,70,${0.7 * exhaust})`);
    outer.addColorStop(0.5, `rgba(255,120,35,${0.45 * exhaust})`);
    outer.addColorStop(1, "rgba(255,80,20,0)");
    ctx.fillStyle = outer;
    ctx.beginPath();
    ctx.moveTo(60, -4.4);
    ctx.quadraticCurveTo(60 + fl * 0.55, -4.6 + wob, 60 + fl + 12, wob * 1.3);
    ctx.quadraticCurveTo(60 + fl * 0.55, 4.6 + wob, 60, 4.4);
    ctx.closePath();
    ctx.fill();
    // blue-white core jet
    const core = ctx.createLinearGradient(60, 0, 60 + fl * 0.8, 0);
    core.addColorStop(0, `rgba(255,255,255,${0.98 * exhaust})`);
    core.addColorStop(0.4, `rgba(205,240,255,${0.9 * exhaust})`);
    core.addColorStop(1, "rgba(140,200,255,0)");
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.moveTo(60, -2.6);
    ctx.quadraticCurveTo(60 + fl * 0.45, -2.8 + wob * 0.5, 60 + fl * 0.8, wob * 0.7);
    ctx.quadraticCurveTo(60 + fl * 0.45, 2.8 + wob * 0.5, 60, 2.6);
    ctx.closePath();
    ctx.fill();
    // mach diamonds chain
    ctx.fillStyle = `rgba(235,250,255,${0.9 * exhaust})`;
    for (let i = 0; i < 3; i++) {
      const dx = 65 + i * 5.5 + flick * 1.2;
      const dw = 2.4 - i * 0.55;
      ctx.beginPath();
      ctx.moveTo(dx - dw, wob * 0.4);
      ctx.lineTo(dx, -1.3);
      ctx.lineTo(dx + dw, wob * 0.4);
      ctx.lineTo(dx, 1.3);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
    ctx.fillStyle = `rgba(160,158,152,${0.38 * exhaust})`;
    ctx.beginPath();
    ctx.ellipse(60 + fl + 11, wob * 1.3, 7.5, 4.5, 0, 0, TAU);
    ctx.fill();
  }
  if (flash > 0) {
    ctx.fillStyle = `rgba(255,255,255,${Math.min(1, flash) * 0.7})`;
    ctx.beginPath();
    ctx.ellipse(26, 0, 34, 11, 0, 0, TAU);
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
  weapon: Weapon = "firework";
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
  private wheelHue = 280;
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
  private hueBase = rnd(0, 360);
  private voidPulse = 0;

  private particles: Particle[] = [];
  private sky: SkyRocket[] = [];
  private debris: Debris[] = [];
  private glows: Glow[] = [];
  private rings: Ring[] = [];
  private texts: FloatText[] = [];
  private voids: VoidFx[] = [];
  private jets: Jet[] = [];
  private bubbles: BubbleFx[] = [];
  private leaps: LeapShark[] = [];
  private biteMarks: BiteMark[] = [];
  private aquaPulse = 0;
  private cannonPulse = 0;
  private beams: RainbowBeam[] = [];
  private rainbowPulse = 0;
  private fireballs: Fireball[] = [];
  private smokes: SmokePuff[] = [];
  private flashes: MuzzleFlash[] = [];
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

  // ------------------------------------------------------------ lifecycle
  run() {
    this.last = performance.now();
    const loop = (now: number) => {
      // schedule first so a single bad frame can never kill the loop (blank screen)
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
    if (w === "blackhole") return 235 + ((level * 37) % 80);
    if (w === "shark") return 198 + ((level * 13) % 22);
    if (w === "bamboo") return 95 + ((level * 17) % 30);
    if (w === "soaker") return 190 + ((level * 11) % 20);
    if (w === "rainbow") return (level * 67) % 360;
    if (w === "bazooka") return 75 + ((level * 19) % 25);
    if (w === "rpg") return 18 + ((level * 23) % 22);
    return (level * 47 + 280) % 360;
  }

  setWeapon(w: Weapon) {
    if (this.weapon !== w) {
      this.weapon = w;
      this.hueBase = rnd(0, 360);
      for (let i = 0; i < this.queue.length; i++) this.queue[i] = this.ammoHue(i);
      if (this.state === "menu") {
        for (const p of this.pins) {
          p.hue = this.pinHue();
          p.bite = 0;
        }
        this.wheelHue = this.wheelHueFor(w, this.level);
      }
      // wipe all live fx so nothing leaks between weapons
      this.sky = [];
      this.voids = [];
      this.jets = [];
      this.particles = [];
      this.glows = [];
      this.rings = [];
      this.texts = [];
      this.debris = [];
      this.bubbles = [];
      this.leaps = [];
      this.biteMarks = [];
      this.beams = [];
      this.fireballs = [];
      this.smokes = [];
      this.flashes = [];
      this.voidPulse = 0;
      this.aquaPulse = 0;
      this.cannonPulse = 0;
      this.rainbowPulse = 0;
    }
    this.emitUI();
  }

  private ammoHue(i: number): number {
    if (this.weapon === "blackhole") return 215 + ((i * 53) % 105);
    if (this.weapon === "shark") return 192 + ((i * 37) % 30);
    if (this.weapon === "bamboo") return 20 + ((i * 29) % 40);
    if (this.weapon === "soaker") return 190 + ((i * 23) % 25);
    if (this.weapon === "rainbow") return (i * 47) % 360;
    if (this.weapon === "bazooka") return [45, 90, 140, 200, 280, 0][i % 6];
    if (this.weapon === "rpg") return [15, 45, 120, 190, 265, 320][i % 6];
    return (this.hueBase + i * 41) % 360;
  }

  private pinHue(): number {
    if (this.weapon === "blackhole") return rnd(210, 320);
    if (this.weapon === "shark") return rnd(190, 222);
    if (this.weapon === "bamboo") return rnd(18, 60);
    if (this.weapon === "soaker") return rnd(188, 214);
    if (this.weapon === "rainbow") return rnd(0, 360);
    if (this.weapon === "bazooka") return [45, 90, 140, 200, 280, 0][Math.floor(rnd(0, 6))];
    if (this.weapon === "rpg") return [15, 45, 120, 190, 265, 320][Math.floor(rnd(0, 6))];
    return rnd(0, 360);
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
    this.hueBase = rnd(0, 360);
    this.queue = Array.from({ length: total }, (_, i) => this.ammoHue(i));

    let guard = 0;
    while (this.pins.length < pre && guard++ < 200) {
      const a = rnd(0, TAU);
      if (this.pins.every((p) => Math.abs(angDiff(p.a, a)) > 0.6)) {
        this.pins.push({ a, hue: this.pinHue(), flash: 0, bite: 0, seed: rnd(0, 10) });
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
    this.flying.push({ y: GUNY - 22, hue, age: 0, open: 0, seed: rnd(0, 10) });
    this.cooldown = 0.11;
    this.recoil = 1;
    this.loadP = 0;
    const bh = this.weapon === "blackhole";
    const sh = this.weapon === "shark";
    const bb = this.weapon === "bamboo";
    const sq = this.weapon === "soaker";
    const rb = this.weapon === "rainbow";
    const bz = this.weapon === "bazooka";
    const rp = this.weapon === "rpg";
    this.shake = Math.max(this.shake, bh ? 3.5 : sh ? 4 : bb ? 7 : sq ? 3 : rb ? 4 : bz ? 10 : rp ? 9 : 2.5);
    if (bz) {
      this.sfx.shootBazooka();
      const mx = CX;
      const my = GUNY - 14;
      // star-shaped muzzle flash + fireball (no shockwave lines, no firework rings)
      this.spawnMuzzle(mx, my, 52, "bazooka");
      this.spawnFireball(mx, my - 8, 0, -60, 26, 0.4, 1);
      this.spawnFireball(mx - 10, my - 4, -40, -30, 16, 0.35, 0.8);
      this.spawnFireball(mx + 10, my - 4, 40, -30, 16, 0.35, 0.8);
      // forward fire cone — dense, layered, no twinkle
      for (let i = 0; i < 40; i++) {
        const a = -Math.PI / 2 + rnd(-0.5, 0.5);
        const sp = rnd(4, 14);
        const white = Math.random() < 0.25;
        this.spawn(mx + rnd(-10, 10), my, Math.cos(a) * sp, Math.sin(a) * sp, {
          life: rnd(0.22, 0.55),
          size: rnd(1.8, 3.6),
          h: white ? 52 : rnd(14, 46),
          s: white ? 65 : 100,
          l: white ? 90 : rnd(56, 70),
          g: 0.02,
          d: 0.92,
          tr: 2.8,
          tw: false,
        });
      }
      // REAL backblast — smoke + flame venting DOWNWARD behind the tube
      for (let i = 0; i < 14; i++) {
        const side = i % 2 === 0 ? -1 : 1;
        this.spawnSmoke(
          mx + side * rnd(10, 22),
          my + rnd(50, 90),
          side * rnd(40, 130),
          rnd(60, 190),
          rnd(9, 16),
          rnd(1.0, 1.8),
          rnd(0.4, 0.85)
        );
      }
      for (let i = 0; i < 16; i++) {
        const a = Math.PI / 2 + rnd(-0.65, 0.65);
        const sp = rnd(3, 9);
        this.spawn(mx + rnd(-8, 8), my + 60, Math.cos(a) * sp, Math.sin(a) * sp, {
          life: rnd(0.25, 0.55),
          size: rnd(1.6, 3.0),
          h: rnd(15, 45),
          s: 100,
          l: rnd(55, 68),
          g: -0.02,
          d: 0.92,
          tw: false,
        });
      }
      // thick muzzle smoke billowing up + out
      for (let i = 0; i < 10; i++) {
        const a = rnd(0, TAU);
        this.spawnSmoke(
          mx + Math.cos(a) * 12,
          my + Math.sin(a) * 8,
          Math.cos(a) * rnd(20, 70),
          Math.sin(a) * rnd(20, 60) - 40,
          rnd(10, 18),
          rnd(1.1, 2.0),
          rnd(0.35, 0.8)
        );
      }
      // hot embers with gravity (no firework crackle/twinkle)
      for (let i = 0; i < 14; i++) {
        const a = -Math.PI / 2 + rnd(-0.9, 0.9);
        const sp = rnd(2, 7);
        this.spawn(mx + rnd(-8, 8), my + rnd(-4, 6), Math.cos(a) * sp, Math.sin(a) * sp, {
          life: rnd(0.35, 0.75),
          size: rnd(1.1, 1.8),
          h: rnd(30, 48),
          s: 100,
          l: 62,
          g: 0.14,
          d: 0.94,
          tr: 2.6,
          tw: false,
          crackle: false,
        });
      }
      // ground dust kicked around the mount
      for (let i = 0; i < 8; i++) {
        const side = Math.random() < 0.5 ? -1 : 1;
        this.spawnSmoke(mx + side * rnd(30, 60), H - 46, side * rnd(30, 80), rnd(-30, -8), rnd(8, 14), rnd(0.9, 1.5), 0.25);
      }
      this.glows.push({ x: mx, y: my, hue: 36, life: 0.4, max: 0.4, r: 140 });
      this.glows.push({ x: mx, y: my, hue: 15, life: 0.5, max: 0.5, r: 190 });
      this.flash = Math.max(this.flash, 0.22);
      this.flashHue = 38;
      this.cannonPulse = Math.min(1, this.cannonPulse + 0.65);
      // lingering smoke column
      this.at(0.18, () => {
        for (let i = 0; i < 5; i++) {
          this.spawnSmoke(mx + rnd(-14, 14), my + rnd(-6, 30), rnd(-10, 10), rnd(-50, -20), rnd(10, 16), rnd(1.2, 1.9), rnd(0.5, 0.9));
        }
      });
      return;
    }
    if (rp) {
      this.sfx.shootRpg();
      const mx = CX;
      const my = GUNY - 14;
      // sharp diamond muzzle flash + hot jet (no shockwave lines, no firework rings)
      this.spawnMuzzle(mx, my, 46, "rpg");
      this.spawnFireball(mx, my - 10, 0, -80, 22, 0.38, 1);
      // narrow piercing fire cone with blue-white core streaks
      for (let i = 0; i < 36; i++) {
        const a = -Math.PI / 2 + rnd(-0.34, 0.34);
        const sp = rnd(5, 14);
        const core = Math.random() < 0.35;
        this.spawn(mx + rnd(-6, 6), my, Math.cos(a) * sp, Math.sin(a) * sp, {
          life: rnd(0.22, 0.55),
          size: rnd(1.5, 3.0),
          h: core ? 198 : rnd(20, 48),
          s: core ? 70 : 100,
          l: core ? 90 : rnd(60, 70),
          g: 0.03,
          d: 0.92,
          tr: 3.2,
          tw: false,
        });
      }
      // backblast jets downward (twin streaks)
      for (let i = 0; i < 12; i++) {
        const side = i % 2 === 0 ? -1 : 1;
        this.spawnSmoke(
          mx + side * rnd(8, 18),
          my + rnd(55, 95),
          side * rnd(50, 140),
          rnd(70, 200),
          rnd(8, 14),
          rnd(0.9, 1.6),
          rnd(0.4, 0.8)
        );
      }
      for (let i = 0; i < 12; i++) {
        const a = Math.PI / 2 + rnd(-0.5, 0.5);
        const sp = rnd(4, 10);
        this.spawn(mx + rnd(-6, 6), my + 62, Math.cos(a) * sp, Math.sin(a) * sp, {
          life: rnd(0.2, 0.45),
          size: rnd(1.4, 2.6),
          h: i % 3 === 0 ? 200 : rnd(20, 45),
          s: i % 3 === 0 ? 65 : 100,
          l: i % 3 === 0 ? 88 : 65,
          g: -0.02,
          d: 0.92,
          tw: false,
        });
      }
      // muzzle smoke + booster haze
      for (let i = 0; i < 8; i++) {
        const a = rnd(0, TAU);
        this.spawnSmoke(
          mx + Math.cos(a) * 10,
          my + Math.sin(a) * 7,
          Math.cos(a) * rnd(25, 75),
          Math.sin(a) * rnd(20, 55) - 45,
          rnd(9, 15),
          rnd(1.0, 1.8),
          rnd(0.35, 0.75)
        );
      }
      for (let i = 0; i < 12; i++) {
        const a = -Math.PI / 2 + rnd(-0.8, 0.8);
        const sp = rnd(2, 7);
        this.spawn(mx + rnd(-6, 6), my + rnd(-4, 4), Math.cos(a) * sp, Math.sin(a) * sp, {
          life: rnd(0.3, 0.6),
          size: 1.4,
          h: rnd(38, 52),
          s: 100,
          l: 68,
          g: 0.12,
          d: 0.93,
          tr: 2.6,
          tw: false,
          crackle: false,
        });
      }
      this.glows.push({ x: mx, y: my, hue: 32, life: 0.36, max: 0.36, r: 125 });
      this.glows.push({ x: mx, y: my, hue: 200, life: 0.3, max: 0.3, r: 90 });
      this.flash = Math.max(this.flash, 0.2);
      this.flashHue = 32;
      this.cannonPulse = Math.min(1, this.cannonPulse + 0.6);
      this.at(0.16, () => {
        for (let i = 0; i < 4; i++) {
          this.spawnSmoke(mx + rnd(-12, 12), my + rnd(-4, 28), rnd(-10, 10), rnd(-55, -22), rnd(9, 15), rnd(1.1, 1.8), rnd(0.5, 0.85));
        }
      });
      return;
    }
    if (rb) {
      this.sfx.shootRainbow();
      // prismatic muzzle blast — full spectrum cone
      for (let i = 0; i < 36; i++) {
        const a = -Math.PI / 2 + rnd(-0.45, 0.45);
        const sp = rnd(3, 11);
        this.spawn(CX + rnd(-8, 8), GUNY - 16, Math.cos(a) * sp, Math.sin(a) * sp, {
          life: rnd(0.25, 0.6),
          size: rnd(1.4, 2.8),
          h: (i / 36) * 360 + rnd(-12, 12),
          s: 100,
          l: i % 6 === 0 ? 92 : rnd(58, 70),
          g: 0.04,
          d: 0.92,
        });
      }
      // instant laser beam flash up the barrel line
      this.beams.push({ x: CX, y: GUNY - 60, life: 0.3, max: 0.3, len: 190, wid: 15, seed: rnd(0, 10) });
      this.spawn(CX, GUNY - 18, 0, 0, { life: 0.18, size: 24, h: 0, s: 0, l: 96, d: 1, g: 0, tr: 0, tw: false });
      this.glows.push({ x: CX, y: GUNY - 20, hue: (this.time * 120) % 360, life: 0.32, max: 0.32, r: 100 });
      this.rings.push({ x: CX, y: GUNY - 18, hue: 0, life: 0.38, max: 0.38, r: 56 });
      this.rings.push({ x: CX, y: GUNY - 18, hue: 140, life: 0.45, max: 0.45, r: 72 });
      this.rainbowPulse = Math.min(1, this.rainbowPulse + 0.45);
      return;
    }
    if (bb) {
      this.sfx.shootBamboo();
      // big bamboo DUAR — fire cone + smoke + embers
      for (let i = 0; i < 30; i++) {
        const a = -Math.PI / 2 + rnd(-0.55, 0.55);
        const sp = rnd(3, 11);
        const fire = Math.random() < 0.55;
        this.spawn(CX + rnd(-10, 10), GUNY - 16, Math.cos(a) * sp, Math.sin(a) * sp, {
          life: rnd(0.25, 0.6),
          size: rnd(1.5, 3.2),
          h: fire ? rnd(18, 48) : rnd(0, 12),
          s: fire ? 100 : 60,
          l: fire ? rnd(55, 70) : rnd(70, 88),
          g: fire ? 0.02 : -0.03,
          d: 0.92,
        });
      }
      // gray smoke puffs drifting up
      for (let i = 0; i < 10; i++) {
        this.spawn(CX + rnd(-14, 14), GUNY - 18, rnd(-1, 1), rnd(-2.5, -0.8), {
          life: rnd(0.7, 1.3),
          size: rnd(2.5, 4.5),
          h: 30,
          s: 12,
          l: rnd(45, 65),
          g: -0.02,
          d: 0.97,
          tr: 1.2,
          tw: false,
        });
      }
      this.spawn(CX, GUNY - 18, 0, 0, { life: 0.18, size: 24, h: 35, s: 100, l: 80, d: 1, g: 0, tr: 0, tw: false });
      this.glows.push({ x: CX, y: GUNY - 20, hue: 32, life: 0.32, max: 0.32, r: 100 });
      this.rings.push({ x: CX, y: GUNY - 18, hue: 35, life: 0.4, max: 0.4, r: 60 });
      this.cannonPulse = Math.min(1, this.cannonPulse + 0.5);
      return;
    }
    if (sq) {
      this.sfx.shootSoaker();
      // pressurized water jet cone + foam + bubbles
      for (let i = 0; i < 28; i++) {
        const a = -Math.PI / 2 + rnd(-0.32, 0.32);
        const sp = rnd(4, 11);
        this.spawn(CX + rnd(-6, 6), GUNY - 16, Math.cos(a) * sp, Math.sin(a) * sp, {
          life: rnd(0.3, 0.6),
          size: rnd(1.4, 2.6),
          h: rnd(190, 210),
          s: 95,
          l: rnd(62, 86),
          g: 0.12,
          d: 0.93,
        });
      }
      for (let i = 0; i < 12; i++) {
        this.spawnBubble(CX + rnd(-12, 12), GUNY - 14 + rnd(-6, 6), rnd(-1.5, 1.5), rnd(-5, -1.5), rnd(1.8, 4.2));
      }
      this.spawn(CX, GUNY - 18, 0, 0, { life: 0.15, size: 18, h: 200, s: 90, l: 90, d: 1, g: 0, tr: 0, tw: false });
      this.glows.push({ x: CX, y: GUNY - 20, hue: 200, life: 0.28, max: 0.28, r: 80 });
      this.rings.push({ x: CX, y: GUNY - 18, hue: 200, life: 0.32, max: 0.32, r: 48 });
      this.aquaPulse = Math.min(1, this.aquaPulse + 0.3);
      return;
    }
    if (sh) {
      this.sfx.shootShark();
      // water cannon blast
      for (let i = 0; i < 26; i++) {
        const a = -Math.PI / 2 + rnd(-0.5, 0.5);
        const sp = rnd(3, 10);
        this.spawn(CX + rnd(-8, 8), GUNY - 16, Math.cos(a) * sp, Math.sin(a) * sp, {
          life: rnd(0.3, 0.65),
          size: rnd(1.4, 2.8),
          h: rnd(188, 212),
          s: rnd(70, 100),
          l: rnd(60, 85),
          g: 0.14,
          d: 0.93,
        });
      }
      // foam + bubbles bursting from the jaws
      for (let i = 0; i < 10; i++) {
        this.spawnBubble(CX + rnd(-16, 16), GUNY - 14 + rnd(-6, 6), rnd(-1.5, 1.5), rnd(-5, -1.5), rnd(2, 5));
      }
      this.spawn(CX, GUNY - 18, 0, 0, { life: 0.16, size: 20, h: 200, s: 90, l: 88, d: 1, g: 0, tr: 0, tw: false });
      this.glows.push({ x: CX, y: GUNY - 20, hue: 200, life: 0.3, max: 0.3, r: 85 });
      this.rings.push({ x: CX, y: GUNY - 18, hue: 200, life: 0.35, max: 0.35, r: 52 });
      this.aquaPulse = Math.min(1, this.aquaPulse + 0.35);
      return;
    }
    if (bh) {
      this.sfx.shootBH();
      // collapsing sparks into the muzzle
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
      this.spawn(CX, GUNY - 18, 0, 0, { life: 0.16, size: 18, h: hue + 50, s: 80, l: 90, d: 1, g: 0, tr: 0, tw: false });
      this.glows.push({ x: CX, y: GUNY - 20, hue, life: 0.25, max: 0.25, r: 80 });
      this.rings.push({ x: CX, y: GUNY - 18, hue: hue + 40, life: 0.35, max: 0.35, r: 46 });
    } else {
      this.sfx.shoot();
      // muzzle flash
      for (let i = 0; i < 22; i++) {
        const a = -Math.PI / 2 + rnd(-0.55, 0.55);
        const sp = rnd(2, 8);
        this.spawn(CX, GUNY - 18, Math.cos(a) * sp, Math.sin(a) * sp, {
          life: rnd(0.25, 0.55),
          size: rnd(1.2, 2.6),
          h: hue + rnd(-25, 25),
          l: 65,
          g: 0.12,
          d: 0.92,
        });
      }
      this.spawn(CX, GUNY - 18, 0, 0, { life: 0.14, size: 16, h: hue, l: 85, d: 1, g: 0, tr: 0, tw: false });
      this.glows.push({ x: CX, y: GUNY - 20, hue, life: 0.25, max: 0.25, r: 70 });
      this.rings.push({ x: CX, y: GUNY - 18, hue, life: 0.3, max: 0.3, r: 38 });
    }
  }

  private collide(): boolean {
    const down = Math.PI / 2;
    // wider projectiles need a slightly bigger threshold
    const w = this.weapon;
    const thr =
      w === "shark" ? 0.135 : w === "bamboo" ? 0.13 : w === "soaker" ? 0.12 : w === "rainbow" ? 0.12 : w === "bazooka" ? 0.13 : w === "rpg" ? 0.135 : THR;
    for (const p of this.pins) {
      if (Math.abs(angDiff(p.a + this.rot, down)) < thr) return true;
    }
    return false;
  }

  private stick(r: Rocket) {
    const a = Math.PI / 2 - this.rot;
    this.pins.push({ a, hue: r.hue, flash: 1, bite: 1, seed: r.seed });
    this.stuckCount++;
    this.score++;
    this.jolt = 1;
    this.pulse = 1;
    const bh = this.weapon === "blackhole";
    const sh = this.weapon === "shark";
    const bb = this.weapon === "bamboo";
    const sq = this.weapon === "soaker";
    const rb = this.weapon === "rainbow";
    const bz = this.weapon === "bazooka";
    const rp = this.weapon === "rpg";
    this.shake = Math.max(this.shake, bh ? 6 : sh ? 8 : bb ? 9 : sq ? 5 : rb ? 6 : bz ? 12 : rp ? 11 : 4.5);
    if (bz) {
      // SHELL SLAMS into armor — fireball + smoke + shrapnel (no shock lines/rings)
      this.sfx.hitBazooka(this.stuckCount - 1);
      this.flash = 0.3;
      this.flashHue = 35;
      const bx = CX;
      const by = CY + R + 6;
      this.warheadBurst(bx, by, 1.05, "bazooka");
      this.biteMarks.push({ a, life: 2.0, max: 2.0 });
      this.spawnShrapnel(bx, by, 5, 0.9, false);
      const word = this.stuckCount % 4 === 0 ? "BOOM!" : "+1";
      this.texts.push({ x: bx + rnd(-30, 30), y: by + 36, text: word, hue: 40, life: 0.9 });
      this.emitUI();
      return;
    }
    if (rp) {
      // GRENADE PIERCES steel — jet + fire + smoke (no shock lines/rings)
      this.sfx.hitRpg(this.stuckCount - 1);
      this.flash = 0.3;
      this.flashHue = 28;
      const bx = CX;
      const by = CY + R + 6;
      this.warheadBurst(bx, by, 1.05, "rpg");
      this.biteMarks.push({ a, life: 2.0, max: 2.0 });
      this.spawnShrapnel(bx, by, 5, 0.9, true);
      const word = this.stuckCount % 4 === 0 ? "KABOOM!" : "+1";
      this.texts.push({ x: bx + rnd(-30, 30), y: by + 36, text: word, hue: 25, life: 0.9 });
      this.emitUI();
      return;
    }
    if (rb) {
      // LASER LODGES into the prism board — spectrum shatter
      this.sfx.hitRainbow(this.stuckCount - 1);
      this.flash = 0.22;
      this.flashHue = (this.time * 140) % 360;
      const bx = CX;
      const by = CY + R + 6;
      this.rainbowBurst(bx, by, 0.95);
      this.biteMarks.push({ a, life: 1.4, max: 1.4 });
      this.beams.push({ x: bx, y: by - 40, life: 0.35, max: 0.35, len: 170, wid: 12, seed: rnd(0, 10) });
      const word = this.stuckCount % 4 === 0 ? "ZAP!" : "+1";
      this.texts.push({ x: bx + rnd(-30, 30), y: by + 32, text: word, hue: (this.stuckCount * 47) % 360, life: 0.9 });
      this.emitUI();
      return;
    }
    if (bb) {
      // STONE SLAMS into the wood — dust, chips, cracks
      this.sfx.hitBamboo(this.stuckCount - 1);
      this.flash = 0.2;
      this.flashHue = 32;
      const bx = CX;
      const by = CY + R + 6;
      this.stoneBurst(bx, by, 0.9);
      this.biteMarks.push({ a, life: 1.4, max: 1.4 });
      this.rings.push({ x: bx, y: by, hue: 35, life: 0.4, max: 0.4, r: 85 });
      const word = this.stuckCount % 4 === 0 ? "DUK!" : "+1";
      this.texts.push({ x: bx + rnd(-30, 30), y: by + 32, text: word, hue: 35, life: 0.9 });
      this.emitUI();
      return;
    }
    if (sq) {
      // WATER BLOB splats and sticks, wobbling
      this.sfx.hitSoaker(this.stuckCount - 1);
      this.flash = 0.18;
      this.flashHue = 200;
      const bx = CX;
      const by = CY + R + 10;
      this.splashBurst(bx, by, 202, 0.85);
      this.rings.push({ x: bx, y: by, hue: 200, life: 0.4, max: 0.4, r: 75 });
      const word = this.stuckCount % 4 === 0 ? "BYUR!" : "+1";
      this.texts.push({ x: bx + rnd(-30, 30), y: by + 32, text: word, hue: 200, life: 0.9 });
      this.emitUI();
      return;
    }
    if (sh) {
      // HARD BITE — the shark slams its jaws shut on the board and hangs on
      this.sfx.hitShark(this.stuckCount - 1);
      this.flash = 0.22;
      this.flashHue = 200;
      const bx = CX;
      const by = CY + R + 8;
      this.splashBurst(bx, by, 200, 0.95);
      this.biteMarks.push({ a, life: 1.4, max: 1.4 });
      this.rings.push({ x: bx, y: by, hue: 200, life: 0.4, max: 0.4, r: 80 });
      const word = this.stuckCount % 4 === 0 ? "CHOMP!" : "+1";
      this.texts.push({ x: bx + rnd(-30, 30), y: by + 34, text: word, hue: 200, life: 0.9 });
      this.emitUI();
      return;
    }
    if (bh) {
      this.sfx.hitBH(this.stuckCount - 1);
      this.flash = 0.25;
      this.flashHue = r.hue;
      const by = CY + R + 26;
      this.voidBurst(CX, by, r.hue, 0.8);
      this.rings.push({ x: CX, y: by, hue: r.hue + 40, life: 0.45, max: 0.45, r: 95 });
      this.texts.push({ x: CX + rnd(-30, 30), y: by + 30, text: "+1", hue: r.hue, life: 0.9 });
    } else {
      this.sfx.hit(this.stuckCount - 1);
      const bx = CX;
      const by = CY + R + PL * 0.65;
      const type = IMPACT_TYPES[Math.floor(Math.random() * IMPACT_TYPES.length)];
      this.burst(bx, by, r.hue, type, 0.72);
      this.burst(bx, CY + R + 4, r.hue + 60, "peony", 0.35);
      this.rings.push({ x: bx, y: by, hue: r.hue, life: 0.45, max: 0.45, r: 90 });
      this.texts.push({ x: bx + rnd(-30, 30), y: by + 26, text: "+1", hue: r.hue, life: 0.9 });
    }
    this.emitUI();
  }

  private failRocket(r: Rocket) {
    this.state = "failing";
    const bh = this.weapon === "blackhole";
    const sh = this.weapon === "shark";
    const bb = this.weapon === "bamboo";
    const sq = this.weapon === "soaker";
    const rb = this.weapon === "rainbow";
    const bz = this.weapon === "bazooka";
    const rp = this.weapon === "rpg";
    if (bh) this.sfx.failBH();
    else if (sh) this.sfx.failShark();
    else if (bb) this.sfx.failBamboo();
    else if (sq) this.sfx.failSoaker();
    else if (rb) this.sfx.failRainbow();
    else if (bz) this.sfx.failBazooka();
    else if (rp) this.sfx.failRpg();
    else this.sfx.fail();
    this.shake = 20;
    this.flash = 0.7;
    this.flashHue = bh ? 300 : sh ? 200 : bb ? 30 : sq ? 200 : rb ? (this.time * 140) % 360 : bz ? 35 : rp ? 25 : 355;
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
    });
    if (bh) {
      // unstable singularity collapse — pure implosion, no fireworks
      this.voidBurst(px, py, 280, 1.0);
      this.jets.push({ x: px, y: py, hue: 285, life: 0.55, max: 0.55, len: 230, wid: 16 });
      this.rings.push({ x: px, y: py, hue: 275, life: 0.6, max: 0.6, r: 210, impl: true });
      this.glows.push({ x: px, y: py, hue: 275, life: 0.6, max: 0.6, r: 150 });
      this.voidPulse = 1;
    } else if (sh) {
      // sharks collide mid-air — huge splash, both tumble into the deep
      this.splashBurst(px, py, 200, 1.3);
      for (let i = 0; i < 12; i++) {
        this.spawnBubble(px + rnd(-20, 20), py + rnd(-14, 14), rnd(-2, 2), rnd(-4, -1), rnd(2, 5));
      }
      this.rings.push({ x: px, y: py, hue: 200, life: 0.55, max: 0.55, r: 170 });
      this.aquaPulse = 1;
    } else if (bb) {
      // stones smash — dust explosion + fire + chips
      this.stoneBurst(px, py, 1.4);
      for (let i = 0; i < 16; i++) {
        const a = rnd(0, TAU);
        const sp = rnd(2, 7);
        this.spawn(px, py, Math.cos(a) * sp, Math.sin(a) * sp, {
          life: rnd(0.3, 0.6),
          size: rnd(1.5, 2.6),
          h: rnd(18, 45),
          s: 100,
          l: 60,
          g: 0.05,
          d: 0.93,
        });
      }
      this.rings.push({ x: px, y: py, hue: 32, life: 0.55, max: 0.55, r: 180 });
      this.cannonPulse = 1;
    } else if (sq) {
      // blobs collide — big cartoon splash
      this.splashBurst(px, py, 202, 1.3);
      for (let i = 0; i < 14; i++) {
        this.spawnBubble(px + rnd(-22, 22), py + rnd(-14, 14), rnd(-2, 2), rnd(-4, -1), rnd(2, 5));
      }
      this.rings.push({ x: px, y: py, hue: 200, life: 0.55, max: 0.55, r: 170 });
      this.aquaPulse = 1;
    } else if (rb) {
      // lasers collide — spectrum detonation + beam flare
      this.rainbowBurst(px, py, 1.4);
      this.beams.push({ x: px, y: py - 30, life: 0.55, max: 0.55, len: 300, wid: 17, seed: rnd(0, 10) });
      this.rings.push({ x: px, y: py, hue: 300, life: 0.55, max: 0.55, r: 190 });
      this.rainbowPulse = 1;
    } else if (bz) {
      // shells collide mid-air — fireball + smoke + shrapnel (no shock lines/rings)
      this.warheadBurst(px, py, 1.6, "bazooka");
      this.cannonPulse = 1;
      this.shake = Math.max(this.shake, 26);
      // burning wreckage rains down + secondary blast
      this.spawnShrapnel(px, py, 10, 1.2, false);
      this.at(0.22, () => {
        this.warheadBurst(px + rnd(-30, 30), py + rnd(10, 50), 0.9, "bazooka");
        this.shake = Math.max(this.shake, 8);
      });
      this.at(0.45, () => {
        for (let i = 0; i < 6; i++) {
          this.spawnSmoke(px + rnd(-30, 30), py + rnd(-10, 30), rnd(-14, 14), rnd(-70, -30), rnd(12, 20), rnd(1.4, 2.2), rnd(0.6, 1));
        }
      });
    } else if (rp) {
      // grenades collide — fire + jet + smoke (no shock lines/rings)
      this.warheadBurst(px, py, 1.6, "rpg");
      this.cannonPulse = 1;
      this.shake = Math.max(this.shake, 26);
      this.spawnShrapnel(px, py, 10, 1.2, true);
      this.at(0.2, () => {
        this.warheadBurst(px + rnd(-28, 28), py + rnd(8, 46), 0.9, "rpg");
        this.shake = Math.max(this.shake, 8);
      });
      this.at(0.42, () => {
        for (let i = 0; i < 6; i++) {
          this.spawnSmoke(px + rnd(-28, 28), py + rnd(-10, 28), rnd(-14, 14), rnd(-70, -30), rnd(11, 19), rnd(1.3, 2.1), rnd(0.6, 1));
        }
      });
    } else {
      this.burst(px, py, 0, "peony", 0.6, 20);
      this.burst(px, py, 45, "ring", 0.5, 20);
      this.glows.push({ x: px, y: py, hue: 0, life: 0.5, max: 0.5, r: 120 });
    }
    // any other flying rockets also tumble
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
    const bh = this.weapon === "blackhole";
    const sh = this.weapon === "shark";
    const bb = this.weapon === "bamboo";
    const sq = this.weapon === "soaker";
    const rb = this.weapon === "rainbow";
    const bz = this.weapon === "bazooka";
    const rp = this.weapon === "rpg";
    if (bh) {
      this.sfx.clearBH();
      this.flash = 0.55;
      this.flashHue = 270;
    } else if (sh) {
      this.sfx.clearShark();
      this.flash = 0.5;
      this.flashHue = 200;
    } else if (bb) {
      this.sfx.clearBamboo();
      this.flash = 0.55;
      this.flashHue = 32;
    } else if (sq) {
      this.sfx.clearSoaker();
      this.flash = 0.5;
      this.flashHue = 200;
    } else if (rb) {
      this.sfx.clearRainbow();
      this.flash = 0.5;
      this.flashHue = (this.time * 140) % 360;
    } else if (bz) {
      this.sfx.clearBazooka();
      this.flash = 0.6;
      this.flashHue = 35;
    } else if (rp) {
      this.sfx.clearRpg();
      this.flash = 0.6;
      this.flashHue = 28;
    } else {
      this.sfx.clear();
      this.flash = 0.5;
      this.flashHue = this.wheelHue;
    }
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
    // wheel breaks apart — black hole: slow scatter, then consumed by the void
    const N = 10;
    const scatter = bh ? 0.4 : 1;
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
        hue:
          bh ? 240 + i * 8
          : sh ? 26 + (i % 3) * 6
          : bb ? 90 + (i % 3) * 10
          : sq ? 195 + (i % 3) * 8
          : rb ? (i * 36) % 360
          : bz ? 80 + (i % 3) * 8
          : rp ? 20 + (i % 3) * 8
          : this.wheelHue + i * 20,
        a0,
        life: 2.2,
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
      });
    }
    this.pins = [];
    if (bh) {
      // SUPERMASSIVE EVENT — the wheel is devoured, jets erupt
      this.voids.push({ x: CX, y: CY, hue: 270, life: 2.1, max: 2.1, r: 150 });
      this.voids.push({ x: CX, y: CY, hue: 300, life: 1.4, max: 1.4, r: 90 });
      this.rings.push({ x: CX, y: CY, hue: 270, life: 1.1, max: 1.1, r: 330, impl: true });
      this.rings.push({ x: CX, y: CY, hue: 305, life: 0.9, max: 0.9, r: 270, impl: true });
      this.rings.push({ x: CX, y: CY, hue: 275, life: 0.9, max: 0.9, r: 280 });
      this.jets.push({ x: CX, y: CY, hue: 275, life: 1.3, max: 1.3, len: 430, wid: 26 });
      this.glows.push({ x: CX, y: CY, hue: 275, life: 1.2, max: 1.2, r: 300 });
      this.voidPulse = 1;
      // everything spirals into the maw
      for (let i = 0; i < 130; i++) {
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
      // delayed quasar flash + jet particles
      this.at(0.35, () => {
        this.jets.push({ x: CX, y: CY, hue: 300, life: 0.8, max: 0.8, len: 390, wid: 14 });
        for (let i = 0; i < 60; i++) {
          const up = i % 2 === 0;
          this.spawn(CX + rnd(-8, 8), CY + rnd(-10, 10), rnd(-0.7, 0.7), (up ? -1 : 1) * rnd(7, 14), {
            life: rnd(0.5, 1.0),
            size: rnd(1.4, 2.4),
            h: 270 + rnd(-30, 45),
            s: 80,
            l: 85,
            g: 0,
            d: 0.97,
            tr: 3.5,
          });
        }
        this.shake = Math.max(this.shake, 10);
      });
    } else if (sh) {
      // SHARK FRENZY — the board bursts into a giant geyser, sharks leap for joy
      this.splashBurst(CX, CY, 200, 1.9);
      this.splashBurst(CX - 60, CY + 40, 205, 1.0);
      this.splashBurst(CX + 60, CY + 40, 195, 1.0);
      for (let i = 0; i < 30; i++) {
        this.spawnBubble(CX + rnd(-90, 90), CY + rnd(-60, 60), rnd(-2, 2), rnd(-4.5, -1), rnd(2, 6));
      }
      this.rings.push({ x: CX, y: CY, hue: 200, life: 0.8, max: 0.8, r: 260 });
      this.glows.push({ x: CX, y: CY, hue: 200, life: 0.9, max: 0.9, r: 280 });
      this.aquaPulse = 1;
      this.launchLeap(1.15);
      this.at(0.4, () => this.launchLeap(0.95));
      this.at(0.8, () => this.launchLeap(1.05));
    } else if (bb) {
      // BAMBOO VICTORY — the board erupts in fire, smoke and flying stones
      this.stoneBurst(CX, CY, 1.9);
      this.stoneBurst(CX - 70, CY + 30, 1.0);
      this.stoneBurst(CX + 70, CY + 30, 1.0);
      for (let i = 0; i < 40; i++) {
        const a = rnd(0, TAU);
        const sp = rnd(2, 8);
        this.spawn(CX, CY, Math.cos(a) * sp, Math.sin(a) * sp, {
          life: rnd(0.5, 1.0),
          size: rnd(1.6, 2.8),
          h: rnd(15, 50),
          s: 100,
          l: rnd(55, 68),
          g: 0.04,
          d: 0.955,
        });
      }
      this.rings.push({ x: CX, y: CY, hue: 32, life: 0.8, max: 0.8, r: 260 });
      this.glows.push({ x: CX, y: CY, hue: 32, life: 0.9, max: 0.9, r: 290 });
      this.cannonPulse = 1;
      this.launchBambooSky(1.15);
      this.at(0.45, () => this.launchBambooSky(1.0));
    } else if (sq) {
      // WATER PARTY — mega geyser + rain + bubbles
      this.splashBurst(CX, CY, 202, 1.9);
      this.splashBurst(CX - 70, CY + 40, 205, 1.1);
      this.splashBurst(CX + 70, CY + 40, 197, 1.1);
      for (let i = 0; i < 34; i++) {
        this.spawnBubble(CX + rnd(-100, 100), CY + rnd(-60, 60), rnd(-2, 2), rnd(-4.5, -1), rnd(2, 6));
      }
      // rainbow sparkle droplets
      for (let i = 0; i < 30; i++) {
        const a = (i / 30) * TAU;
        const sp = rnd(2.5, 5);
        this.spawn(CX, CY, Math.cos(a) * sp, Math.sin(a) * sp, {
          life: rnd(0.6, 1.0),
          size: 2,
          h: 185 + (i / 30) * 60,
          s: 95,
          l: 72,
          g: 0.05,
          d: 0.96,
        });
      }
      this.rings.push({ x: CX, y: CY, hue: 200, life: 0.8, max: 0.8, r: 260 });
      this.glows.push({ x: CX, y: CY, hue: 200, life: 0.9, max: 0.9, r: 280 });
      this.aquaPulse = 1;
      this.launchSoakerSky(1.15);
      this.at(0.5, () => this.launchSoakerSky(1.0));
    } else if (rb) {
      // RAINBOW SUPERNOVA — triple spectrum bursts + cross beams
      this.rainbowBurst(CX, CY, 1.9);
      this.rainbowBurst(CX - 70, CY + 30, 1.0);
      this.rainbowBurst(CX + 70, CY + 30, 1.0);
      this.beams.push({ x: CX, y: CY, life: 1.1, max: 1.1, len: 460, wid: 24, seed: rnd(0, 10) });
      this.beams.push({ x: CX - 80, y: CY + 20, life: 0.9, max: 0.9, len: 340, wid: 14, seed: rnd(0, 10) });
      this.beams.push({ x: CX + 80, y: CY + 20, life: 0.9, max: 0.9, len: 340, wid: 14, seed: rnd(0, 10) });
      this.glows.push({ x: CX, y: CY, hue: 0, life: 0.9, max: 0.9, r: 300 });
      this.rainbowPulse = 1;
      this.launchRainbowSky(1.15);
      this.at(0.45, () => this.launchRainbowSky(1.0));
    } else if (bz) {
      // BAZOOKA BARRAGE — rolling ground detonations, fire + smoke only (no lines/rings/sky fireworks)
      this.shake = Math.max(this.shake, 22);
      this.flash = Math.max(this.flash, 0.65);
      this.flashHue = 36;
      this.warheadBurst(CX, CY, 2.1, "bazooka");
      this.glows.push({ x: CX, y: CY, hue: 32, life: 1.0, max: 1.0, r: 320 });
      this.cannonPulse = 1;
      // chain detonations marching outward + mushroom column
      const spots: [number, number, number, number][] = [
        [-78, 38, 1.15, 0.16],
        [78, 38, 1.15, 0.3],
        [-40, -52, 0.95, 0.44],
        [44, -48, 0.95, 0.58],
        [0, 66, 1.0, 0.72],
      ];
      for (const [dx, dy, sc, dt] of spots) {
        this.at(dt, () => {
          this.warheadBurst(CX + dx, CY + dy, sc, "bazooka");
          this.shake = Math.max(this.shake, 8);
        });
      }
      this.at(0.25, () => {
        for (let i = 0; i < 10; i++) {
          this.spawnSmoke(CX + rnd(-50, 50), CY + rnd(-20, 40), rnd(-16, 16), rnd(-95, -45), rnd(16, 26), rnd(1.6, 2.6), rnd(0.6, 1));
        }
        this.spawnFireball(CX, CY - 70, 0, -60, 30, 0.8, 0.7);
      });
      this.launchBazookaGround(1.15);
      this.at(0.45, () => this.launchBazookaGround(1.0));
      this.at(0.9, () => this.launchBazookaGround(0.9));
    } else if (rp) {
      // RPG BLITZ — rapid ground strikes, fire + jet + smoke (no lines/rings/sky fireworks)
      this.shake = Math.max(this.shake, 22);
      this.flash = Math.max(this.flash, 0.65);
      this.flashHue = 28;
      this.warheadBurst(CX, CY, 2.1, "rpg");
      this.glows.push({ x: CX, y: CY, hue: 30, life: 1.0, max: 1.0, r: 320 });
      this.cannonPulse = 1;
      const spots: [number, number, number, number][] = [
        [-80, 30, 1.1, 0.14],
        [80, 30, 1.1, 0.26],
        [0, -60, 1.0, 0.38],
        [-45, 60, 0.9, 0.52],
        [45, 60, 0.9, 0.64],
      ];
      for (const [dx, dy, sc, dt] of spots) {
        this.at(dt, () => {
          this.warheadBurst(CX + dx, CY + dy, sc, "rpg");
          this.shake = Math.max(this.shake, 7);
        });
      }
      this.at(0.22, () => {
        for (let i = 0; i < 8; i++) {
          this.spawnSmoke(CX + rnd(-46, 46), CY + rnd(-24, 36), rnd(-14, 14), rnd(-90, -40), rnd(14, 24), rnd(1.5, 2.4), rnd(0.6, 1));
        }
      });
      this.launchRpgGround(1.15);
      this.at(0.45, () => this.launchRpgGround(1.0));
      this.at(0.9, () => this.launchRpgGround(0.9));
    } else {
      this.burst(CX, CY, this.wheelHue, "rainbow", 1.5, 0);
      this.burst(CX, CY, this.wheelHue + 120, "ring", 1.3, 0);
      this.burst(CX, CY, 45, "willow", 1.4, 0);
      this.rings.push({ x: CX, y: CY, hue: this.wheelHue, life: 0.8, max: 0.8, r: 260 });
      this.glows.push({ x: CX, y: CY, hue: this.wheelHue, life: 0.9, max: 0.9, r: 260 });
    }

    // finale — per weapon sky show
    if (bh) {
      for (let i = 0; i < 7; i++) {
        this.at(0.3 + i * 0.28 + rnd(0, 0.1), () => this.launchVoidSky(rnd(0.8, 1.2)));
      }
    } else if (sh) {
      for (let i = 0; i < 4; i++) {
        this.at(0.5 + i * 0.45 + rnd(0, 0.1), () => this.launchLeap(rnd(0.85, 1.15)));
      }
    } else if (bb) {
      for (let i = 0; i < 5; i++) {
        this.at(0.4 + i * 0.38 + rnd(0, 0.1), () => this.launchBambooSky(rnd(0.85, 1.15)));
      }
    } else if (sq) {
      for (let i = 0; i < 5; i++) {
        this.at(0.4 + i * 0.38 + rnd(0, 0.1), () => this.launchSoakerSky(rnd(0.85, 1.15)));
      }
    } else if (rb) {
      for (let i = 0; i < 5; i++) {
        this.at(0.4 + i * 0.38 + rnd(0, 0.1), () => this.launchRainbowSky(rnd(0.85, 1.15)));
      }
    } else if (bz) {
      // ground barrage finale — no sky fireworks
      for (let i = 0; i < 6; i++) {
        this.at(0.35 + i * 0.32 + rnd(0, 0.1), () => this.launchBazookaGround(rnd(0.85, 1.2)));
      }
    } else if (rp) {
      // ground barrage finale — no sky fireworks
      for (let i = 0; i < 6; i++) {
        this.at(0.35 + i * 0.32 + rnd(0, 0.1), () => this.launchRpgGround(rnd(0.85, 1.2)));
      }
    } else {
      for (let i = 0; i < 9; i++) {
        this.at(0.15 + i * 0.22 + rnd(0, 0.1), () => this.launchSky(rnd(1.0, 1.35)));
      }
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

  // ------------------------------------------------------------ fireworks
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
      crackle: o.crackle ?? false,
      ax: o.ax ?? 0,
      ay: o.ay ?? 0,
      pull: o.pull ?? 0,
    });
  }

  private burst(x: number, y: number, hue: number, type: BurstType, scale = 1, hueJitter = 25) {
    const speed = 5.2 * scale;
    const cnt = Math.max(0.5, scale);
    const life = () => rnd(1.0, 1.6) * (0.7 + scale * 0.3);
    this.glows.push({ x, y, hue, life: 0.5, max: 0.5, r: 90 * scale + 30 });
    this.spawn(x, y, 0, 0, { life: 0.22, size: 22 * scale, h: hue, l: 92, d: 1, g: 0, tr: 0, tw: false });

    const jh = () => rnd(-hueJitter, hueJitter);

    switch (type) {
      case "peony": {
        const n = Math.round(80 * cnt);
        for (let i = 0; i < n; i++) {
          const a = rnd(0, TAU);
          const sp = speed * (0.7 + 0.3 * Math.random());
          this.spawn(x, y, Math.cos(a) * sp, Math.sin(a) * sp, {
            life: life(),
            size: rnd(1.6, 2.6),
            h: hue + jh(),
            g: 0.035,
            d: 0.955,
          });
        }
        for (let i = 0; i < n * 0.45; i++) {
          const a = rnd(0, TAU);
          const sp = speed * 0.42 * (0.4 + Math.random() * 0.6);
          this.spawn(x, y, Math.cos(a) * sp, Math.sin(a) * sp, {
            life: life() * 0.8,
            size: 1.8,
            h: hue + 150,
            l: 72,
            g: 0.035,
            d: 0.955,
          });
        }
        break;
      }
      case "ring": {
        const n = Math.round(56 * cnt);
        const off = rnd(0, TAU);
        for (let i = 0; i < n; i++) {
          const a = off + (i / n) * TAU;
          this.spawn(x, y, Math.cos(a) * speed, Math.sin(a) * speed, {
            life: life(),
            size: 2.4,
            h: hue + jh() * 0.3,
            g: 0.02,
            d: 0.958,
          });
        }
        const m = Math.round(30 * cnt);
        for (let i = 0; i < m; i++) {
          const a = off + (i / m) * TAU;
          this.spawn(x, y, Math.cos(a) * speed * 0.55, Math.sin(a) * speed * 0.55, {
            life: life() * 0.85,
            size: 2,
            h: hue + 120,
            l: 70,
            g: 0.02,
            d: 0.958,
          });
        }
        break;
      }
      case "star": {
        const n = Math.round(110 * cnt);
        const off = rnd(0, TAU);
        for (let i = 0; i < n; i++) {
          const seg = (i / n) * 10;
          const k = Math.floor(seg);
          const f = seg - k;
          const a1 = (k * Math.PI) / 5 - Math.PI / 2 + off;
          const a2 = ((k + 1) * Math.PI) / 5 - Math.PI / 2 + off;
          const r1 = k % 2 === 0 ? 1 : 0.42;
          const r2 = (k + 1) % 2 === 0 ? 1 : 0.42;
          const vx = Math.cos(a1) * r1 * (1 - f) + Math.cos(a2) * r2 * f;
          const vy = Math.sin(a1) * r1 * (1 - f) + Math.sin(a2) * r2 * f;
          this.spawn(x, y, vx * speed * 1.05, vy * speed * 1.05, {
            life: life(),
            size: 2.3,
            h: hue + jh() * 0.3,
            l: 66,
            g: 0.015,
            d: 0.957,
          });
        }
        break;
      }
      case "heart": {
        const n = Math.round(70 * cnt);
        const hh = rnd(325, 360);
        for (let i = 0; i < n; i++) {
          const t = (i / n) * TAU;
          const hx = 16 * Math.pow(Math.sin(t), 3);
          const hy = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
          const k = (speed * 1.05) / 17;
          this.spawn(x, y, hx * k, hy * k, {
            life: life(),
            size: 2.5,
            h: hh + rnd(-8, 8),
            l: 64,
            g: 0.015,
            d: 0.957,
          });
        }
        break;
      }
      case "spiral": {
        const n = Math.round(100 * cnt);
        const off = rnd(0, TAU);
        for (let i = 0; i < n; i++) {
          const a = off + i * 0.34;
          const sp = speed * (0.15 + 0.85 * (i / n));
          this.spawn(x, y, Math.cos(a) * sp, Math.sin(a) * sp, {
            life: life(),
            size: 2.2,
            h: hue + (i / n) * 90,
            g: 0.02,
            d: 0.957,
          });
        }
        break;
      }
      case "crackle": {
        const n = Math.round(70 * cnt);
        for (let i = 0; i < n; i++) {
          const a = rnd(0, TAU);
          const sp = speed * (0.55 + 0.45 * Math.random());
          this.spawn(x, y, Math.cos(a) * sp, Math.sin(a) * sp, {
            life: rnd(0.9, 1.3),
            size: 2.4,
            h: hue + jh(),
            l: 68,
            g: 0.03,
            d: 0.955,
            crackle: true,
          });
        }
        break;
      }
      case "rainbow": {
        const n = Math.round(90 * cnt);
        for (let i = 0; i < n; i++) {
          const a = (i / n) * TAU;
          const sp = speed * (0.75 + 0.25 * Math.random());
          this.spawn(x, y, Math.cos(a) * sp, Math.sin(a) * sp, {
            life: life(),
            size: 2.3,
            h: hue + (i / n) * 360,
            l: 62,
            g: 0.03,
            d: 0.955,
          });
        }
        break;
      }
      case "willow": {
        const n = Math.round(80 * cnt);
        for (let i = 0; i < n; i++) {
          const a = rnd(0, TAU);
          const sp = speed * rnd(0.35, 1);
          this.spawn(x, y, Math.cos(a) * sp, Math.sin(a) * sp, {
            life: rnd(1.8, 2.8),
            size: 1.7,
            h: rnd(36, 50),
            s: 95,
            l: 66,
            g: 0.045,
            d: 0.972,
            tr: 4,
          });
        }
        break;
      }
    }
  }

  // Black-hole impact: matter spirals in, singularity flashes, jets erupt. Zero fireworks.
  private voidBurst(x: number, y: number, hue: number, scale = 1) {
    const h = 215 + ((((hue - 215) % 105) + 105) % 105); // clamp to the cosmic band
    this.voids.push({ x, y, hue: h, life: 0.85, max: 0.85, r: 62 * scale + 18 });
    this.rings.push({ x, y, hue: h, life: 0.5, max: 0.5, r: 130 * scale, impl: true });
    this.rings.push({ x, y, hue: h + 40, life: 0.55, max: 0.55, r: 110 * scale });
    this.glows.push({ x, y, hue: h, life: 0.6, max: 0.6, r: 140 * scale + 20 });
    this.voidPulse = Math.min(1, this.voidPulse + 0.6 * scale);
    // accretion inflow — matter spiralling into the well
    const n = Math.round(52 * scale);
    for (let i = 0; i < n; i++) {
      const a = rnd(0, TAU);
      const rr = rnd(70, 160) * scale;
      const sx = x + Math.cos(a) * rr;
      const sy = y + Math.sin(a) * rr;
      const sp = rnd(3.5, 6.5);
      const swirl = 0.9;
      this.spawn(sx, sy, -Math.cos(a) * sp - Math.sin(a) * sp * swirl, -Math.sin(a) * sp + Math.cos(a) * sp * swirl, {
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
    // collapse flash + relativistic jets (delayed)
    this.at(0.15, () => {
      // hot core flash
      this.spawn(x, y, 0, 0, { life: 0.22, size: 20 * scale, h: h + 45, s: 70, l: 92, d: 1, g: 0, tr: 0, tw: false });
      this.glows.push({ x, y, hue: h + 40, life: 0.35, max: 0.35, r: 110 * scale });
      // bipolar jets
      this.jets.push({ x, y, hue: h, life: 0.5, max: 0.5, len: 200 * scale, wid: 13 * scale });
      for (let i = 0; i < Math.round(26 * scale); i++) {
        const up = i % 2 === 0;
        this.spawn(x + rnd(-6, 6), y + rnd(-8, 8), rnd(-0.6, 0.6), (up ? -1 : 1) * rnd(6, 12) * scale, {
          life: rnd(0.4, 0.8),
          size: rnd(1.4, 2.3),
          h: h + rnd(-20, 40),
          s: 85,
          l: 84,
          g: 0,
          d: 0.965,
          tr: 3.5,
        });
      }
      // tangential ejecta — curved shreds orbiting outward, never a radial firework shell
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
            h: h + rnd(-25, 35),
            l: 68,
            g: 0,
            d: 0.958,
            ax: x,
            ay: y,
            pull: 1.2,
          }
        );
      }
      this.rings.push({ x, y, hue: h + 30, life: 0.4, max: 0.4, r: 90 * scale });
      this.shake = Math.max(this.shake, 5 * scale);
    });
  }

  private drawVoids() {
    const ctx = this.ctx;
    for (const v of this.voids) {
      const k = Math.max(0, v.life / v.max);
      const p = 1 - k;
      const r = v.r * (0.25 + 0.75 * Math.min(1, p * 3.2));
      const a = k < 0.65 ? k / 0.65 : 1;
      // gravitational lensing halo (light bending around the void)
      const lh = ctx.createRadialGradient(v.x, v.y, r * 0.9, v.x, v.y, r * 1.9);
      lh.addColorStop(0, hsl(v.hue, 100, 65, 0.35 * a));
      lh.addColorStop(0.5, hsl(v.hue + 30, 100, 60, 0.12 * a));
      lh.addColorStop(1, hsl(v.hue, 100, 55, 0));
      ctx.fillStyle = lh;
      ctx.beginPath();
      ctx.arc(v.x, v.y, r * 1.9, 0, TAU);
      ctx.fill();
      // event horizon — pure darkness
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
      // tilted accretion disk with doppler-bright side
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
      ctx.strokeStyle = `rgba(255,255,255,${0.65 * a})`;
      ctx.lineWidth = Math.max(1, r * 0.045);
      ctx.beginPath();
      ctx.arc(0, 0, r * 1.12, Math.PI * 1.15, Math.PI * 1.75);
      ctx.stroke();
      ctx.restore();
      // photon ring — racing light
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

  private drawJets() {
    const ctx = this.ctx;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const j of this.jets) {
      const k = Math.max(0, j.life / j.max);
      const flick = 0.85 + 0.15 * Math.sin(this.time * 40 + j.x);
      const wdt = j.wid * (0.4 + 0.6 * k) * flick;
      const half = (j.len * (0.35 + 0.65 * k)) / 2;
      for (const dir of [-1, 1]) {
        const y0 = j.y;
        const y1 = j.y + dir * half;
        const g = ctx.createLinearGradient(0, y0, 0, y1);
        g.addColorStop(0, `rgba(255,255,255,${0.85 * k})`);
        g.addColorStop(0.25, hsl(j.hue + 40, 100, 75, 0.55 * k));
        g.addColorStop(1, hsl(j.hue, 100, 60, 0));
        ctx.fillStyle = g;
        ctx.fillRect(j.x - wdt, Math.min(y0, y1), wdt * 2, half);
        ctx.fillStyle = `rgba(255,255,255,${0.5 * k})`;
        ctx.fillRect(j.x - wdt * 0.3, Math.min(y0, y1), wdt * 0.6, half);
      }
      // bright core
      ctx.fillStyle = `rgba(255,255,255,${0.9 * k})`;
      ctx.beginPath();
      ctx.arc(j.x, j.y, wdt * 0.7, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  private launchSky(scale = 1.1) {
    const x0 = rnd(50, W - 50);
    const y0 = H - 110;
    const ty = rnd(70, 330);
    const tx = rnd(50, W - 50);
    const a = 700;
    const dist = y0 - ty;
    const vy = -Math.sqrt(2 * a * dist);
    const tt = -vy / a;
    this.sky.push({
      x: x0,
      y: y0,
      vx: (tx - x0) / tt,
      vy,
      hue: rnd(0, 360),
      type: SKY_TYPES[Math.floor(Math.random() * SKY_TYPES.length)],
      scale,
    });
    this.sfx.skyLaunch();
  }

  // a void tears open in the sky, devours light, then collapses with jets
  private launchVoidSky(scale = 1.0) {
    const x = rnd(50, W - 50);
    const y = rnd(60, 330);
    const hue = 215 + rnd(0, 105);
    this.sfx.voidOpen();
    // warning shimmer — light bending inward
    for (let i = 0; i < 26; i++) {
      const a = rnd(0, TAU);
      const rr = rnd(50, 115);
      this.spawn(x + Math.cos(a) * rr, y + Math.sin(a) * rr, -Math.cos(a) * 2.5, -Math.sin(a) * 2.5, {
        life: rnd(0.4, 0.7),
        size: 1.6,
        h: hue + rnd(-20, 20),
        l: 72,
        g: 0,
        d: 0.95,
        ax: x,
        ay: y,
        pull: 4,
      });
    }
    this.voidPulse = Math.min(1, this.voidPulse + 0.3 * scale);
    this.at(0.32, () => {
      this.voidBurst(x, y, hue, scale);
      this.sfx.voidBoom(scale);
      this.shake = Math.max(this.shake, 3);
    });
  }

  // ------------------------------------------------------------ shark fx
  private spawnBubble(x: number, y: number, vx: number, vy: number, r: number) {
    if (this.bubbles.length > 320) return;
    const life = rnd(0.7, 1.6);
    this.bubbles.push({ x, y, vx, vy, life, max: life, r });
  }

  // watery explosion — droplets with gravity, foam and bubbles. No fireworks.
  private splashBurst(x: number, y: number, hue: number, scale = 1) {
    const h = 188 + ((((hue - 188) % 26) + 26) % 26);
    // droplets — mostly upward cone
    const n = Math.round(42 * scale);
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + rnd(-1.15, 1.15);
      const sp = rnd(2.5, 8.5) * scale;
      this.spawn(x + rnd(-6, 6), y + rnd(-4, 4), Math.cos(a) * sp, Math.sin(a) * sp, {
        life: rnd(0.5, 1.0),
        size: rnd(1.5, 2.8),
        h: h + rnd(-12, 18),
        s: rnd(75, 100),
        l: rnd(58, 80),
        g: 0.22,
        d: 0.96,
        tr: 2,
      });
    }
    // white foam
    for (let i = 0; i < Math.round(16 * scale); i++) {
      const a = rnd(0, TAU);
      const sp = rnd(1, 4.5) * scale;
      this.spawn(x, y, Math.cos(a) * sp, Math.sin(a) * sp - 2, {
        life: rnd(0.4, 0.8),
        size: rnd(1.6, 2.6),
        h: 205,
        s: 45,
        l: 94,
        g: 0.16,
        d: 0.94,
      });
    }
    // bubbles
    for (let i = 0; i < Math.round(14 * scale); i++) {
      const a = rnd(0, TAU);
      this.spawnBubble(
        x + Math.cos(a) * rnd(4, 20),
        y + Math.sin(a) * rnd(4, 14),
        Math.cos(a) * rnd(0.5, 2),
        rnd(-3.5, -1),
        rnd(1.8, 4.6)
      );
    }
    this.glows.push({ x, y, hue: 200, life: 0.45, max: 0.45, r: 120 * scale + 20 });
    this.rings.push({ x, y, hue: 200, life: 0.45, max: 0.45, r: 100 * scale });
    this.aquaPulse = Math.min(1, this.aquaPulse + 0.5 * scale);
  }

  // stone impact — dust cloud, rock chips, wood splinters. No fireworks.
  private stoneBurst(x: number, y: number, scale = 1) {
    // dust cloud — tan/brown puffs
    const n = Math.round(30 * scale);
    for (let i = 0; i < n; i++) {
      const a = rnd(0, TAU);
      const sp = rnd(1.5, 6) * scale;
      this.spawn(x + rnd(-5, 5), y + rnd(-4, 4), Math.cos(a) * sp, Math.sin(a) * sp - 1.5, {
        life: rnd(0.5, 1.0),
        size: rnd(1.8, 3.2),
        h: rnd(22, 42),
        s: rnd(30, 55),
        l: rnd(42, 62),
        g: 0.1,
        d: 0.94,
        tr: 1.6,
        tw: false,
      });
    }
    // rock chips — fast gray shards
    for (let i = 0; i < Math.round(18 * scale); i++) {
      const a = -Math.PI / 2 + rnd(-1.2, 1.2);
      const sp = rnd(3, 9) * scale;
      this.spawn(x, y, Math.cos(a) * sp, Math.sin(a) * sp, {
        life: rnd(0.4, 0.8),
        size: rnd(1.4, 2.4),
        h: rnd(20, 45),
        s: 18,
        l: rnd(50, 70),
        g: 0.25,
        d: 0.96,
        tr: 2.2,
      });
    }
    // wood splinters — warm orange streaks
    for (let i = 0; i < Math.round(12 * scale); i++) {
      const a = rnd(0, TAU);
      const sp = rnd(2, 6) * scale;
      this.spawn(x, y, Math.cos(a) * sp, Math.sin(a) * sp, {
        life: rnd(0.4, 0.7),
        size: rnd(1.5, 2.3),
        h: rnd(24, 36),
        s: 80,
        l: 52,
        g: 0.2,
        d: 0.95,
      });
    }
    // hot impact flash
    this.spawn(x, y, 0, 0, { life: 0.2, size: 20 * scale, h: 40, s: 100, l: 75, d: 1, g: 0, tr: 0, tw: false });
    this.glows.push({ x, y, hue: 32, life: 0.45, max: 0.45, r: 120 * scale + 20 });
    this.rings.push({ x, y, hue: 35, life: 0.4, max: 0.4, r: 95 * scale });
    this.cannonPulse = Math.min(1, this.cannonPulse + 0.5 * scale);
  }

  // bamboo finale — a stone arcs up and bursts into fire + smoke flower
  private launchBambooSky(scale = 1.0) {
    const x = rnd(60, W - 60);
    const y = rnd(80, 300);
    // rising tracer embers
    for (let i = 0; i < 18; i++) {
      this.spawn(x + rnd(-8, 8), y + 60 + i * 7, rnd(-0.5, 0.5), rnd(-3, -1.5), {
        life: rnd(0.4, 0.8),
        size: rnd(1.4, 2.4),
        h: rnd(20, 45),
        s: 100,
        l: 62,
        g: -0.02,
        d: 0.96,
      });
    }
    this.at(0.3, () => {
      this.stoneBurst(x, y, scale);
      // fire flower petals
      for (let i = 0; i < Math.round(26 * scale); i++) {
        const a = rnd(0, TAU);
        const sp = rnd(2, 6.5) * scale;
        this.spawn(x, y, Math.cos(a) * sp, Math.sin(a) * sp, {
          life: rnd(0.5, 0.9),
          size: rnd(1.6, 2.6),
          h: rnd(15, 50),
          s: 100,
          l: rnd(55, 68),
          g: 0.04,
          d: 0.955,
        });
      }
      this.sfx.bambooSkyBoom(scale);
      this.shake = Math.max(this.shake, 3);
    });
  }

  // soaker finale — a water geyser erupts from below
  private launchSoakerSky(scale = 1.0) {
    const x = rnd(50, W - 50);
    const y = rnd(H - 260, H - 120);
    this.sfx.soakerGeyser();
    for (let i = 0; i < Math.round(34 * scale); i++) {
      this.spawn(x + rnd(-10, 10), y, rnd(-1.5, 1.5), rnd(-9, -4) * scale, {
        life: rnd(0.5, 1.0),
        size: rnd(1.5, 2.7),
        h: rnd(190, 210),
        s: 95,
        l: rnd(62, 84),
        g: 0.2,
        d: 0.965,
        tr: 2.4,
      });
    }
    for (let i = 0; i < Math.round(12 * scale); i++) {
      this.spawnBubble(x + rnd(-14, 14), y + rnd(-30, 0), rnd(-1, 1), rnd(-4, -1.5), rnd(1.8, 4.4));
    }
    this.glows.push({ x, y: y - 40, hue: 200, life: 0.5, max: 0.5, r: 110 * scale });
    this.aquaPulse = Math.min(1, this.aquaPulse + 0.3 * scale);
  }

  // rainbow laser impact — spectrum ring + prism shards + white-hot core
  private rainbowBurst(x: number, y: number, scale = 1) {
    const base = this.time * 90;
    // spectrum shell — hue follows launch angle for a true rainbow ring
    const n = Math.round(64 * scale);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + rnd(-0.04, 0.04);
      const sp = rnd(2.5, 6.5) * scale;
      this.spawn(x, y, Math.cos(a) * sp, Math.sin(a) * sp, {
        life: rnd(0.55, 1.0),
        size: rnd(1.6, 2.6),
        h: base + (i / n) * 360,
        s: 100,
        l: 64,
        g: 0.03,
        d: 0.955,
        tr: 2.6,
      });
    }
    // white-hot core flash + prism shards
    this.spawn(x, y, 0, 0, { life: 0.22, size: 22 * scale, h: 0, s: 0, l: 97, d: 1, g: 0, tr: 0, tw: false });
    for (let i = 0; i < Math.round(14 * scale); i++) {
      const a = rnd(0, TAU);
      const sp = rnd(1.5, 4) * scale;
      this.spawn(x, y, Math.cos(a) * sp, Math.sin(a) * sp, {
        life: rnd(0.4, 0.8),
        size: rnd(1.8, 2.6),
        h: 0,
        s: 0,
        l: 95,
        g: 0.02,
        d: 0.95,
      });
    }
    // chromatic shockwave rings
    this.rings.push({ x, y, hue: base % 360, life: 0.45, max: 0.45, r: 95 * scale });
    this.rings.push({ x, y, hue: (base + 130) % 360, life: 0.55, max: 0.55, r: 125 * scale });
    this.glows.push({ x, y, hue: base % 360, life: 0.45, max: 0.45, r: 130 * scale + 20 });
    this.glows.push({ x, y, hue: (base + 180) % 360, life: 0.35, max: 0.35, r: 90 * scale });
    this.rainbowPulse = Math.min(1, this.rainbowPulse + 0.5 * scale);
  }

  // rainbow finale — an aurora beam rains down and shatters into spectrum
  private launchRainbowSky(scale = 1.0) {
    const x = rnd(60, W - 60);
    const y = rnd(90, 300);
    this.sfx.rainbowSky();
    // warning shimmer — converging spectrum streaks
    for (let i = 0; i < 22; i++) {
      const a = rnd(0, TAU);
      const rr = rnd(60, 120);
      this.spawn(x + Math.cos(a) * rr, y + Math.sin(a) * rr, -Math.cos(a) * 2.5, -Math.sin(a) * 2.5, {
        life: rnd(0.35, 0.6),
        size: 1.7,
        h: this.time * 90 + i * 16,
        s: 100,
        l: 68,
        g: 0,
        d: 0.94,
        ax: x,
        ay: y,
        pull: 4,
      });
    }
    this.beams.push({ x, y: y + 60, life: 0.7, max: 0.7, len: 260 * scale, wid: 13 * scale, seed: rnd(0, 10) });
    this.at(0.3, () => {
      this.rainbowBurst(x, y, scale);
      this.shake = Math.max(this.shake, 3);
    });
  }

  // ---------- realistic war explosion FX helpers ----------
  private spawnFireball(x: number, y: number, vx: number, vy: number, r: number, life: number, hot: number) {
    if (this.fireballs.length > 90) return;
    this.fireballs.push({ x, y, vx, vy, life, max: life, r, hot, seed: rnd(0, 10) });
  }

  private spawnSmoke(x: number, y: number, vx: number, vy: number, r: number, life: number, dark: number) {
    if (this.smokes.length > 140) return;
    this.smokes.push({ x, y, vx, vy, life, max: life, r, grow: r * rnd(1.6, 2.4), dark, seed: rnd(0, 10) });
  }

  private spawnMuzzle(x: number, y: number, r: number, style: "bazooka" | "rpg") {
    if (this.flashes.length > 16) return;
    this.flashes.push({ x, y, life: 0.16, max: 0.16, r, seed: rnd(0, 10), style });
  }

  private spawnShrapnel(x: number, y: number, n: number, scale: number, hot: boolean) {
    for (let i = 0; i < n; i++) {
      const shard = Math.random() < 0.45;
      const a = rnd(0, TAU);
      const sp = rnd(180, hot ? 520 : 440) * scale;
      this.debris.push({
        kind: shard ? "shard" : "clod",
        x: x + rnd(-4, 4),
        y: y + rnd(-4, 4),
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 160 * scale,
        rot: rnd(0, TAU),
        vr: rnd(-14, 14),
        hue: shard ? rnd(30, 50) : rnd(18, 32),
        a0: rnd(2.5, 5.5) * scale,
        life: rnd(0.9, 1.7),
        hot: shard ? 1 : 0.4,
      });
    }
  }

  // REALISTIC warhead detonation — blinding flash, rolling fireball, thick dark
  // smoke, dust wall, shrapnel + dirt. NO shockwave lines, NO rings,
  // NO firework crackle/twinkle — pure military explosion.
  // "bazooka" = big round orange blast; "rpg" = hotter white core + piercing jet.
  private warheadBurst(x: number, y: number, scale = 1, style: "bazooka" | "rpg" = "bazooka") {
    const hot = style === "rpg";
    const s = Math.max(0.6, scale);

    // 1) blinding core flash + fire light
    this.flashes.push({ x, y, life: 0.22, max: 0.22, r: (hot ? 74 : 68) * s, seed: rnd(0, 10), style });
    this.spawn(x, y, 0, 0, { life: 0.16, size: 30 * s, h: 48, s: 100, l: 92, d: 1, g: 0, tr: 0, tw: false });
    this.glows.push({ x, y, hue: hot ? 30 : 36, life: 0.55, max: 0.55, r: 170 * s + 30 });
    this.glows.push({ x, y, hue: 15, life: 0.7, max: 0.7, r: 220 * s + 40 });

    // 2) layered fireballs — 1 big core + chaotic satellites (biased upward, rolling)
    this.spawnFireball(x, y, rnd(-12, 12), rnd(-28, -8), 36 * s, 0.65, 1);
    const sats = Math.round((hot ? 7 : 6) * s);
    for (let i = 0; i < sats; i++) {
      const a = rnd(0, TAU);
      const d = rnd(8, 30) * s;
      this.spawnFireball(
        x + Math.cos(a) * d,
        y + Math.sin(a) * d * 0.7 - 6 * s,
        Math.cos(a) * rnd(25, 95) * s,
        Math.sin(a) * rnd(25, 90) * s - 55 * s,
        rnd(13, 23) * s,
        rnd(0.45, 0.78),
        rnd(0.5, 0.9)
      );
    }

    // 3) flame tongues — chaotic, upward-rolling, no twinkle
    const n = Math.round((hot ? 48 : 44) * s);
    for (let i = 0; i < n; i++) {
      const a = rnd(0, TAU);
      const upward = Math.sin(a) < 0 ? 1.25 : 0.7;
      const sp = rnd(2, hot ? 8.5 : 7.5) * s * upward;
      const white = Math.random() < 0.2;
      this.spawn(x + rnd(-6, 6), y + rnd(-4, 4), Math.cos(a) * sp, Math.sin(a) * sp - 1.2 * s, {
        life: rnd(0.3, 0.7),
        size: rnd(1.8, 3.4),
        h: white ? rnd(48, 55) : rnd(10, 42),
        s: white ? 70 : 100,
        l: white ? 88 : rnd(54, 66),
        g: 0.03,
        d: 0.93,
        tr: 2.2,
        tw: false,
      });
    }

    // 4) RPG shaped-charge jet — searing lance punching upward
    if (hot) {
      for (let i = 0; i < Math.round(28 * s); i++) {
        const a = -Math.PI / 2 + rnd(-0.3, 0.3);
        const sp = rnd(6, 14) * s;
        const core = i % 3 === 0;
        this.spawn(x + rnd(-5, 5), y - 4, Math.cos(a) * sp, Math.sin(a) * sp, {
          life: rnd(0.35, 0.75),
          size: rnd(1.5, 2.7),
          h: core ? 195 : rnd(32, 52),
          s: core ? 75 : 100,
          l: core ? 90 : 70,
          g: 0.015,
          d: 0.94,
          tr: 3.4,
          tw: false,
        });
      }
      // jet fireballs riding the lance
      for (let i = 0; i < 3; i++) {
        this.spawnFireball(x + rnd(-6, 6), y - 18 - i * 22 * s, rnd(-8, 8), rnd(-90, -50), 15 * s, 0.5, 0.85);
      }
    }

    // 5) thick dark smoke — billowing, long-lived (the real "shockwave" is dust)
    const ns = Math.round(20 * s);
    for (let i = 0; i < ns; i++) {
      const a = rnd(0, TAU);
      const sp = rnd(14, 70) * s;
      this.spawnSmoke(
        x + Math.cos(a) * rnd(6, 20) * s,
        y + Math.sin(a) * rnd(6, 16) * s,
        Math.cos(a) * sp,
        Math.sin(a) * sp - 55 * s,
        rnd(10, 20) * s,
        rnd(1.2, 2.3),
        rnd(0.45, 1)
      );
    }
    // low dust wall rolling outward along the ground
    for (let i = 0; i < Math.round(8 * s); i++) {
      const side = Math.random() < 0.5 ? -1 : 1;
      this.spawnSmoke(
        x + side * rnd(10, 40) * s,
        y + rnd(6, 22) * s,
        side * rnd(50, 130) * s,
        rnd(-18, 6),
        rnd(11, 19) * s,
        rnd(1.0, 1.8),
        0.35
      );
    }

    // 6) shrapnel + burning dirt clods (real physics debris)
    this.spawnShrapnel(x, y, Math.round(10 * s), s, hot);

    // 7) heavy embers with gravity (no crackle pops, no twinkle)
    for (let i = 0; i < Math.round(22 * s); i++) {
      const a = rnd(0, TAU);
      const sp = rnd(2.5, 8) * s;
      this.spawn(x, y, Math.cos(a) * sp, Math.sin(a) * sp, {
        life: rnd(0.45, 1.0),
        size: rnd(1.1, 1.9),
        h: rnd(28, 48),
        s: 100,
        l: 62,
        g: 0.2,
        d: 0.955,
        tr: 2.8,
        tw: false,
        crackle: false,
      });
    }

    // 8) delayed secondary cook-off pops + rising smoke column
    this.at(0.14, () => {
      this.spawnFireball(x + rnd(-14, 14), y + rnd(-10, 10), rnd(-10, 10), rnd(-50, -20), 18 * s, 0.45, 0.6);
      for (let i = 0; i < Math.round(10 * s); i++) {
        const a = rnd(0, TAU);
        const sp = rnd(1.5, 5) * s;
        this.spawn(x, y, Math.cos(a) * sp, Math.sin(a) * sp, {
          life: rnd(0.3, 0.6),
          size: rnd(1.5, 2.6),
          h: rnd(15, 45),
          s: 100,
          l: 60,
          g: 0.04,
          d: 0.94,
          tw: false,
        });
      }
      this.shake = Math.max(this.shake, 3.5 * s);
    });
    this.at(0.3, () => {
      for (let i = 0; i < Math.round(6 * s); i++) {
        this.spawnSmoke(x + rnd(-18, 18), y + rnd(-8, 14), rnd(-12, 12), rnd(-70, -30), rnd(12, 20) * s, rnd(1.4, 2.2), rnd(0.6, 1));
      }
    });

    this.shake = Math.max(this.shake, (hot ? 7 : 6.5) * s);
    this.flash = Math.max(this.flash, 0.32 * Math.min(s, 1.3));
    this.flashHue = hot ? 30 : 36;
    this.cannonPulse = Math.min(1, this.cannonPulse + 0.6 * s);
  }

  // bazooka ground barrage — artillery impacts along the ground, NOT sky fireworks.
  // Dirt fountain + fire + rolling smoke, zero rings/shock lines.
  private launchBazookaGround(scale = 1.0) {
    const x = rnd(40, W - 40);
    const y = rnd(H - 150, H - 60);
    // incoming whistle dirt puff first
    for (let i = 0; i < 6; i++) {
      this.spawn(x + rnd(-8, 8), y + rnd(-6, 6), rnd(-1, 1), rnd(-2, -0.5), {
        life: rnd(0.3, 0.5),
        size: rnd(1.4, 2.2),
        h: rnd(25, 40),
        s: 40,
        l: 50,
        g: 0.1,
        d: 0.94,
        tw: false,
      });
    }
    this.at(0.18, () => {
      this.warheadBurst(x, y, scale, "bazooka");
      // tall dirt fountain
      for (let i = 0; i < 8; i++) {
        this.debris.push({
          kind: "clod",
          x: x + rnd(-6, 6),
          y,
          vx: rnd(-120, 120),
          vy: rnd(-560, -260) * scale,
          rot: rnd(0, TAU),
          vr: rnd(-10, 10),
          hue: rnd(20, 32),
          a0: rnd(3, 6) * scale,
          life: rnd(1.0, 1.8),
          hot: 0.7,
        });
      }
      this.sfx.bazookaSkyBoom(scale);
      this.shake = Math.max(this.shake, 4);
    });
  }

  // rpg ground barrage — low rapid impacts, fire + jet + smoke. No sky fireworks.
  private launchRpgGround(scale = 1.0) {
    const x = rnd(40, W - 40);
    const y = rnd(H - 150, H - 60);
    for (let i = 0; i < 6; i++) {
      this.spawn(x + rnd(-8, 8), y + rnd(-6, 6), rnd(-1, 1), rnd(-2.5, -0.8), {
        life: rnd(0.25, 0.45),
        size: rnd(1.3, 2.1),
        h: rnd(28, 45),
        s: 60,
        l: 55,
        g: 0.1,
        d: 0.94,
        tw: false,
      });
    }
    this.at(0.16, () => {
      this.warheadBurst(x, y, scale, "rpg");
      for (let i = 0; i < 7; i++) {
        this.debris.push({
          kind: i % 2 ? "clod" : "shard",
          x: x + rnd(-6, 6),
          y,
          vx: rnd(-140, 140),
          vy: rnd(-520, -240) * scale,
          rot: rnd(0, TAU),
          vr: rnd(-12, 12),
          hue: rnd(22, 40),
          a0: rnd(2.5, 5) * scale,
          life: rnd(0.9, 1.6),
          hot: 0.8,
        });
      }
      this.sfx.rpgSkyBoom(scale);
      this.shake = Math.max(this.shake, 4);
    });
  }

  private drawBeams() {
    const ctx = this.ctx;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const b of this.beams) {
      const k = Math.max(0, b.life / b.max);
      const flick = 0.85 + 0.15 * Math.sin(this.time * 42 + b.seed * 9);
      const wdt = b.wid * (0.4 + 0.6 * k) * flick;
      const half = (b.len * (0.35 + 0.65 * k)) / 2;
      // 5 spectrum layers side by side
      for (let i = -2; i <= 2; i++) {
        const hue = (this.time * 160 + b.seed * 60 + i * 42 + 360) % 360;
        const g = ctx.createLinearGradient(0, b.y - half, 0, b.y + half);
        g.addColorStop(0, hsl(hue, 100, 62, 0));
        g.addColorStop(0.5, hsl(hue, 100, 65, 0.6 * k));
        g.addColorStop(1, hsl(hue, 100, 62, 0));
        ctx.fillStyle = g;
        ctx.fillRect(b.x + i * wdt * 0.42 - wdt * 0.24, b.y - half, wdt * 0.48, half * 2);
      }
      // white-hot spine
      const cg = ctx.createLinearGradient(0, b.y - half, 0, b.y + half);
      cg.addColorStop(0, "rgba(255,255,255,0)");
      cg.addColorStop(0.5, `rgba(255,255,255,${0.85 * k})`);
      cg.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = cg;
      ctx.fillRect(b.x - wdt * 0.14, b.y - half, wdt * 0.28, half * 2);
      // bright core
      ctx.fillStyle = `rgba(255,255,255,${0.9 * k})`;
      ctx.beginPath();
      ctx.arc(b.x, b.y, wdt * 0.55, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  // a shark leaps across the sky along a parabola, then splashes down
  private launchLeap(size = 1) {
    const fromLeft = Math.random() < 0.5;
    const x0 = fromLeft ? rnd(-50, 30) : rnd(W - 30, W + 50);
    const x1 = fromLeft ? rnd(W - 30, W + 50) : rnd(-50, 30);
    const yB = rnd(H - 190, H - 90);
    this.leaps.push({
      x0,
      y0: yB,
      x1,
      y1: yB + rnd(-30, 30),
      t: 0,
      dur: rnd(1.1, 1.5),
      hue: rnd(192, 220),
      size,
      flip: !fromLeft,
    });
    this.sfx.sharkLeap();
  }

  private drawBubbles() {
    const ctx = this.ctx;
    for (const b of this.bubbles) {
      const k = Math.max(0, b.life / b.max);
      const a = Math.min(1, k * 2) * 0.8;
      ctx.strokeStyle = `rgba(180,230,255,${a})`;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, TAU);
      ctx.stroke();
      ctx.fillStyle = `rgba(220,245,255,${a * 0.35})`;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, TAU);
      ctx.fill();
      ctx.fillStyle = `rgba(255,255,255,${a})`;
      ctx.beginPath();
      ctx.arc(b.x - b.r * 0.32, b.y - b.r * 0.32, Math.max(0.6, b.r * 0.22), 0, TAU);
      ctx.fill();
    }
  }

  // ------- realistic war FX rendering -------
  private drawSmokes() {
    const ctx = this.ctx;
    ctx.save();
    for (const s of this.smokes) {
      const k = Math.max(0, s.life / s.max);
      const fadeIn = Math.min(1, (1 - k) * 6 + 0.25);
      const a = Math.min(1, k * 1.6) * fadeIn;
      const wob = Math.sin(this.time * 3 + s.seed * 8) * s.r * 0.08;
      // dark sooty core
      const g = ctx.createRadialGradient(s.x + wob, s.y, 0, s.x + wob, s.y, s.r);
      const base = 52 - s.dark * 30;
      g.addColorStop(0, `rgba(${base + 26},${base + 8},${base - 8},${0.5 * a})`);
      g.addColorStop(0.55, `rgba(${base},${base - 12},${base - 18},${0.34 * a})`);
      g.addColorStop(1, `rgba(${base - 18},${base - 24},${base - 26},0)`);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(s.x + wob, s.y, s.r, 0, TAU);
      ctx.fill();
      // hot underlit rim while young (fire still lighting the smoke)
      if (k > 0.55) {
        const hg = ctx.createRadialGradient(s.x, s.y + s.r * 0.3, 0, s.x, s.y + s.r * 0.3, s.r * 0.75);
        hg.addColorStop(0, `rgba(255,140,50,${0.4 * (k - 0.55) * 2 * a})`);
        hg.addColorStop(1, "rgba(255,120,40,0)");
        ctx.fillStyle = hg;
        ctx.beginPath();
        ctx.arc(s.x, s.y + s.r * 0.3, s.r * 0.75, 0, TAU);
        ctx.fill();
      }
      // pale top lit by sky
      const tg = ctx.createRadialGradient(s.x - s.r * 0.3, s.y - s.r * 0.35, 0, s.x - s.r * 0.3, s.y - s.r * 0.35, s.r * 0.55);
      tg.addColorStop(0, `rgba(200,195,185,${0.22 * a})`);
      tg.addColorStop(1, "rgba(200,195,185,0)");
      ctx.fillStyle = tg;
      ctx.beginPath();
      ctx.arc(s.x - s.r * 0.3, s.y - s.r * 0.35, s.r * 0.55, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  private drawFireballs() {
    const ctx = this.ctx;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const fb of this.fireballs) {
      const k = Math.max(0, fb.life / fb.max);
      const fl = 0.85 + 0.15 * Math.sin(this.time * 47 + fb.seed * 11);
      const r = fb.r * fl;
      // outer red-orange envelope
      let g = ctx.createRadialGradient(fb.x, fb.y, 0, fb.x, fb.y, r);
      g.addColorStop(0, `rgba(255,240,200,${0.85 * k})`);
      g.addColorStop(0.3, `rgba(255,190,80,${0.7 * k})`);
      g.addColorStop(0.62, `rgba(255,110,30,${0.5 * k})`);
      g.addColorStop(0.85, `rgba(200,50,15,${0.28 * k})`);
      g.addColorStop(1, "rgba(150,30,10,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(fb.x, fb.y, r, 0, TAU);
      ctx.fill();
      // licking flame blobs around the rim
      for (let i = 0; i < 5; i++) {
        const a = fb.seed + i * 1.256 + this.time * (3 + i * 0.4);
        const bx = fb.x + Math.cos(a) * r * 0.72;
        const by = fb.y + Math.sin(a) * r * 0.72;
        const br = r * (0.28 + 0.12 * Math.sin(this.time * 9 + i * 2 + fb.seed));
        const bg = ctx.createRadialGradient(bx, by, 0, bx, by, br);
        bg.addColorStop(0, `rgba(255,220,140,${0.7 * k})`);
        bg.addColorStop(0.6, `rgba(255,130,40,${0.4 * k})`);
        bg.addColorStop(1, "rgba(255,90,20,0)");
        ctx.fillStyle = bg;
        ctx.beginPath();
        ctx.arc(bx, by, br, 0, TAU);
        ctx.fill();
      }
      // white-hot heart while young
      if (fb.hot > 0.3 && k > 0.35) {
        const ck = Math.min(1, k * 1.4) * fb.hot;
        const cg = ctx.createRadialGradient(fb.x, fb.y, 0, fb.x, fb.y, r * 0.42);
        cg.addColorStop(0, `rgba(255,255,255,${0.95 * ck})`);
        cg.addColorStop(0.5, `rgba(255,245,215,${0.75 * ck})`);
        cg.addColorStop(1, "rgba(255,230,170,0)");
        ctx.fillStyle = cg;
        ctx.beginPath();
        ctx.arc(fb.x, fb.y, r * 0.42, 0, TAU);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  private drawFlashes() {
    const ctx = this.ctx;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const f of this.flashes) {
      const k = Math.max(0, f.life / f.max);
      const r = f.r * (0.7 + 0.3 * k);
      // star spikes
      const spikes = f.style === "rpg" ? 6 : 8;
      for (let i = 0; i < spikes; i++) {
        const a = f.seed + (i * TAU) / spikes;
        const len = r * (i % 2 === 0 ? 1 : 0.55);
        const g = ctx.createLinearGradient(f.x, f.y, f.x + Math.cos(a) * len, f.y + Math.sin(a) * len);
        g.addColorStop(0, `rgba(255,255,255,${0.9 * k})`);
        g.addColorStop(0.4, f.style === "rpg" ? `rgba(200,235,255,${0.7 * k})` : `rgba(255,225,150,${0.7 * k})`);
        g.addColorStop(1, "rgba(255,140,40,0)");
        ctx.strokeStyle = g;
        ctx.lineWidth = (i % 2 === 0 ? 7 : 4) * k + 1;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(f.x, f.y);
        ctx.lineTo(f.x + Math.cos(a) * len, f.y + Math.sin(a) * len);
        ctx.stroke();
      }
      // core orb
      const cg = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, r * 0.55);
      cg.addColorStop(0, `rgba(255,255,255,${0.98 * k})`);
      cg.addColorStop(0.45, f.style === "rpg" ? `rgba(215,242,255,${0.85 * k})` : `rgba(255,240,200,${0.85 * k})`);
      cg.addColorStop(1, "rgba(255,170,70,0)");
      ctx.fillStyle = cg;
      ctx.beginPath();
      ctx.arc(f.x, f.y, r * 0.55, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  private drawLeaps() {
    const ctx = this.ctx;
    for (const l of this.leaps) {
      const u = Math.min(1, Math.max(0, l.t / l.dur));
      const peak = 260 * l.size + 90;
      const x = l.x0 + (l.x1 - l.x0) * u;
      const y = l.y0 + (l.y1 - l.y0) * u - peak * 4 * u * (1 - u);
      const dx = l.x1 - l.x0;
      const dy = l.y1 - l.y0 - peak * 4 * (1 - 2 * u);
      const ang = Math.atan2(dy, dx);
      // drip trail
      if (Math.random() < 0.7) {
        this.spawn(x + rnd(-6, 6), y + rnd(0, 8), rnd(-1, 1), rnd(1, 3), {
          life: rnd(0.3, 0.6),
          size: rnd(1.3, 2.2),
          h: rnd(190, 210),
          s: 90,
          l: 75,
          g: 0.2,
          d: 0.95,
        });
      }
      ctx.save();
      ctx.translate(x, y);
      // drawShark faces -x; rotate so -x aligns with travel direction
      ctx.rotate(ang + Math.PI);
      if (l.flip) ctx.scale(1, -1);
      ctx.scale(l.size, l.size);
      drawShark(ctx, l.hue, 0.85, this.time * 1.4, l.x0 * 0.13, 0);
      ctx.restore();
    }
  }

  // ------------------------------------------------------------ update
  private update(dt: number) {
    this.time += dt;
    const f = dt * 60;

    // timers
    for (let i = this.timers.length - 1; i >= 0; i--) {
      const t = this.timers[i];
      t.t -= dt;
      if (t.t <= 0) {
        this.timers.splice(i, 1);
        t.fn();
      }
    }

    // wheel
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
    this.voidPulse = Math.max(0, this.voidPulse - dt * 2.4);
    this.aquaPulse = Math.max(0, this.aquaPulse - dt * 2.2);
    this.cannonPulse = Math.max(0, this.cannonPulse - dt * 2.2);
    this.rainbowPulse = Math.max(0, this.rainbowPulse - dt * 2.2);
    this.bannerT += dt;

    const bh = this.weapon === "blackhole";
    const sh = this.weapon === "shark";
    const bb = this.weapon === "bamboo";
    const sq = this.weapon === "soaker";
    const rb = this.weapon === "rainbow";
    const bz = this.weapon === "bazooka";
    const rp = this.weapon === "rpg";

    for (const p of this.pins) {
      p.flash = Math.max(0, p.flash - dt * 3.5);
      p.bite = Math.max(0, p.bite - dt * 2.2);
      if (Math.random() < 0.05 * f) {
        const wa = p.a + this.rot;
        if (bh) {
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
        } else if (sh) {
          // biting sharks drip + blow little bubbles
          const rr = R + 34;
          const sx = CX + Math.cos(wa) * rr;
          const sy = CY + Math.sin(wa) * rr;
          if (Math.random() < 0.6) {
            this.spawnBubble(sx + rnd(-10, 10), sy + rnd(-8, 8), rnd(-0.4, 0.4), rnd(-1.2, -0.4), rnd(1.5, 3.2));
          } else {
            this.spawn(sx + rnd(-8, 8), sy + rnd(0, 8), rnd(-0.5, 0.5), rnd(1, 2.5), {
              life: rnd(0.3, 0.6),
              size: rnd(1.2, 2),
              h: rnd(190, 210),
              s: 90,
              l: 78,
              g: 0.2,
              d: 0.95,
            });
          }
        } else if (bb) {
          // embedded stones shed tiny dust motes
          const rr = R + 14;
          this.spawn(CX + Math.cos(wa) * rr, CY + Math.sin(wa) * rr, rnd(-0.4, 0.4), rnd(-0.6, 0.2), {
            life: rnd(0.5, 0.9),
            size: rnd(1.2, 2),
            h: rnd(25, 40),
            s: 35,
            l: 55,
            g: -0.01,
            d: 0.96,
            tr: 1.2,
            tw: false,
          });
        } else if (sq) {
          // stuck water blobs drip + bubble
          const rr = R + 14;
          const sx = CX + Math.cos(wa) * rr;
          const sy = CY + Math.sin(wa) * rr;
          if (Math.random() < 0.5) {
            this.spawnBubble(sx + rnd(-8, 8), sy + rnd(-6, 6), rnd(-0.4, 0.4), rnd(-1.2, -0.4), rnd(1.4, 3));
          } else {
            this.spawn(sx + rnd(-6, 6), sy + rnd(0, 6), rnd(-0.4, 0.4), rnd(1, 2.4), {
              life: rnd(0.3, 0.55),
              size: rnd(1.2, 2),
              h: rnd(192, 208),
              s: 95,
              l: 76,
              g: 0.2,
              d: 0.95,
            });
          }
        } else if (rb) {
          // lodged laser bolts emit spectrum sparkles
          const rr = R + 30;
          const sx = CX + Math.cos(wa) * rr;
          const sy = CY + Math.sin(wa) * rr;
          const a = rnd(0, TAU);
          this.spawn(sx, sy, Math.cos(a) * rnd(0.5, 1.8), Math.sin(a) * rnd(0.5, 1.8), {
            life: rnd(0.4, 0.8),
            size: rnd(1.2, 2.1),
            h: this.time * 120 + rnd(0, 360),
            s: 100,
            l: 70,
            g: 0,
            d: 0.95,
          });
        } else if (bz || rp) {
          // lodged warheads smoulder — embers + thin smoke wisps (no twinkle)
          const rr = R + 30;
          const sx = CX + Math.cos(wa) * rr;
          const sy = CY + Math.sin(wa) * rr;
          if (Math.random() < 0.55) {
            this.spawn(sx + rnd(-6, 6), sy + rnd(-6, 6), rnd(-0.5, 0.5), rnd(-1.2, -0.2), {
              life: rnd(0.4, 0.8),
              size: rnd(1.1, 1.9),
              h: rnd(20, 45),
              s: 100,
              l: 58,
              g: -0.01,
              d: 0.96,
              tw: false,
            });
          } else {
            this.spawn(sx + rnd(-6, 6), sy + rnd(-4, 4), rnd(-0.4, 0.4), rnd(-0.8, -0.1), {
              life: rnd(0.6, 1.1),
              size: rnd(1.8, 3.0),
              h: 40,
              s: 10,
              l: 50,
              g: -0.015,
              d: 0.96,
              tr: 1.2,
              tw: false,
            });
          }
        } else {
          const rr = R - 6 + PL;
          this.spawn(CX + Math.cos(wa) * rr, CY + Math.sin(wa) * rr, rnd(-0.6, 0.6), rnd(-0.6, 0.6), {
            life: rnd(0.4, 0.8),
            size: 1.5,
            h: p.hue + rnd(-20, 20),
            l: 75,
            g: 0.04,
            d: 0.96,
          });
        }
      }
    }

    // flying projectiles
    for (let i = this.flying.length - 1; i >= 0; i--) {
      const r = this.flying[i];
      r.y -= 1500 * dt;
      r.age += dt;
      // the shark opens its jaws wide as it nears the board
      if (sh) {
        const dist = r.y - (CY + R);
        const target = dist < 190 ? Math.min(1, (190 - dist) / 110) : 0;
        const speed = target > r.open ? 7 : 3.5;
        r.open += Math.max(-dt * speed, Math.min(dt * speed, target - r.open));
      }
      // trail
      if (bz) {
        // bazooka sustainer — roaring orange core + thick smoke ribbon + sparks
        const tx = CX + Math.sin(r.age * 8 + r.seed * 3) * 1.5;
        for (let k = 0; k < 4; k++) {
          const core = k < 2;
          this.spawn(tx + rnd(-5, 5), r.y + 26 + rnd(0, 16), rnd(-0.7, 0.7), rnd(2.5, 5.5), {
            life: rnd(0.2, 0.48),
            size: core ? rnd(2.0, 3.4) : rnd(1.5, 2.6),
            h: core ? rnd(38, 52) : rnd(15, 40),
            s: 100,
            l: core ? rnd(68, 82) : rnd(56, 66),
            g: 0.02,
            d: 0.9,
            tr: 3,
            tw: false,
          });
        }
        // dense lingering smoke ribbon (real smoke puffs)
        if (Math.random() < 0.85) {
          this.spawnSmoke(
            tx + rnd(-7, 7),
            r.y + rnd(30, 52),
            rnd(-14, 14),
            rnd(20, 60),
            rnd(8, 14),
            rnd(0.9, 1.6),
            rnd(0.35, 0.75)
          );
        }
        if (Math.random() < 0.5) {
          this.spawn(tx + rnd(-4, 4), r.y + rnd(20, 34), rnd(-1.2, 1.2), rnd(1.5, 3.5), {
            life: rnd(0.25, 0.55),
            size: rnd(1.1, 1.7),
            h: rnd(35, 48),
            s: 100,
            l: 64,
            g: 0.12,
            d: 0.93,
            tr: 2.6,
            tw: false,
            crackle: false,
          });
        }
      } else if (rp) {
        // RPG booster — searing blue-white jet + orange sheath + smoke corkscrew
        const tx = CX + Math.sin(r.age * 9 + r.seed * 5) * 2;
        for (let k = 0; k < 4; k++) {
          const core = k === 0;
          const mid = k === 1;
          this.spawn(tx + rnd(-4, 4), r.y + 26 + rnd(0, 16), rnd(-0.7, 0.7), rnd(2.5, 5.5), {
            life: rnd(0.2, 0.48),
            size: core ? rnd(2.0, 3.0) : rnd(1.4, 2.5),
            h: core ? 200 : mid ? 48 : rnd(20, 45),
            s: core ? 70 : 100,
            l: core ? 90 : mid ? 80 : rnd(60, 70),
            g: 0.02,
            d: 0.9,
            tr: 3.4,
            tw: false,
          });
        }
        if (Math.random() < 0.8) {
          const swirl = Math.sin(r.age * 14 + r.seed * 6) * 8;
          this.spawnSmoke(tx + swirl * 0.4 + rnd(-5, 5), r.y + rnd(30, 50), swirl * 0.8 + rnd(-8, 8), rnd(25, 65), rnd(7, 12), rnd(0.8, 1.5), rnd(0.35, 0.7));
        }
        if (Math.random() < 0.4) {
          this.spawn(tx + rnd(-4, 4), r.y + rnd(20, 32), rnd(-1, 1), rnd(1.5, 3), {
            life: rnd(0.25, 0.5),
            size: 1.3,
            h: 195,
            s: 70,
            l: 86,
            g: 0.05,
            d: 0.93,
            tr: 3.6,
            tw: false,
            crackle: false,
          });
        }
      } else if (rb) {
        // rainbow laser streak — spectrum ribbon + white core glints
        for (let k = 0; k < 4; k++) {
          this.spawn(CX + rnd(-5, 5) + (k - 1.5) * 3, r.y + 20 + rnd(0, 22), rnd(-0.6, 0.6), rnd(2, 5), {
            life: rnd(0.22, 0.5),
            size: rnd(1.5, 2.7),
            h: this.time * 260 + r.y * 1.5 + k * 45,
            s: 100,
            l: k === 1 ? 90 : 64,
            g: 0,
            d: 0.92,
            tr: 3,
          });
        }
        if (Math.random() < 0.5) {
          this.spawn(CX + rnd(-4, 4), r.y + rnd(-6, 10), 0, 0, {
            life: 0.18,
            size: 8,
            h: 0,
            s: 0,
            l: 96,
            d: 1,
            g: 0,
            tr: 0,
            tw: false,
          });
        }
      } else if (bb) {
        // stone rips upward — fire streak + smoke + dust
        for (let k = 0; k < 3; k++) {
          const fire = k < 2;
          this.spawn(CX + rnd(-6, 6), r.y + 14 + rnd(0, 14), rnd(-0.8, 0.8), rnd(1.5, 4), {
            life: rnd(0.2, 0.5),
            size: rnd(1.4, 2.6),
            h: fire ? rnd(20, 45) : 32,
            s: fire ? 100 : 15,
            l: fire ? rnd(58, 72) : 55,
            g: fire ? 0.02 : -0.01,
            d: 0.92,
          });
        }
        if (Math.random() < 0.4) {
          this.spawn(CX + rnd(-8, 8), r.y + rnd(10, 26), rnd(-0.6, 0.6), rnd(0.5, 2), {
            life: rnd(0.5, 0.9),
            size: rnd(2, 3.4),
            h: 30,
            s: 12,
            l: 55,
            g: -0.015,
            d: 0.96,
            tr: 1.2,
            tw: false,
          });
        }
      } else if (sq) {
        // water blob streams droplets + bubbles
        for (let k = 0; k < 3; k++) {
          this.spawn(CX + rnd(-7, 7), r.y + 14 + rnd(0, 14), rnd(-1, 1), rnd(2, 5), {
            life: rnd(0.25, 0.5),
            size: rnd(1.4, 2.5),
            h: rnd(190, 210),
            s: 95,
            l: k === 0 ? 90 : 70,
            g: 0.12,
            d: 0.92,
          });
        }
        if (Math.random() < 0.5) {
          this.spawnBubble(CX + rnd(-10, 10), r.y + rnd(8, 30), rnd(-1, 1), rnd(-0.5, 1.5), rnd(1.5, 3.2));
        }
      } else if (sh) {
        // watery wake + bubbles streaming off the shark
        for (let k = 0; k < 3; k++) {
          const side = k - 1;
          this.spawn(CX + side * rnd(6, 14), r.y + 34 + rnd(0, 16), side * rnd(0.5, 1.8), rnd(2, 5), {
            life: rnd(0.25, 0.55),
            size: rnd(1.4, 2.6),
            h: rnd(188, 212),
            s: rnd(75, 100),
            l: k === 1 ? 90 : 68,
            g: 0.1,
            d: 0.92,
          });
        }
        if (Math.random() < 0.55) {
          this.spawnBubble(CX + rnd(-14, 14), r.y + rnd(10, 40), rnd(-1, 1), rnd(-0.5, 1.5), rnd(1.6, 3.6));
        }
      } else if (bh) {
        // singularity rips upward — accretion spiral + stretched starlight + lens glints
        for (let k = 0; k < 4; k++) {
          const a = rnd(0, TAU);
          const rr = rnd(10, 26);
          this.spawn(
            CX + Math.cos(a) * rr,
            r.y + Math.sin(a) * rr * 0.7,
            -Math.sin(a) * rnd(2, 4),
            Math.cos(a) * rnd(1, 2) + rnd(2, 4.5),
            {
              life: rnd(0.3, 0.65),
              size: rnd(1.4, 2.6),
              h: r.hue + rnd(-30, 30),
              s: 100,
              l: k === 0 ? 88 : 68,
              g: 0,
              d: 0.93,
              ax: CX,
              ay: r.y,
              pull: 3.2,
              tr: 3,
            }
          );
        }
        // stretched star streaks bending past the orb
        if (Math.random() < 0.55) {
          const side = Math.random() < 0.5 ? -1 : 1;
          this.spawn(CX + side * rnd(18, 34), r.y + rnd(-14, 14), -side * rnd(1, 2.5), rnd(2, 4), {
            life: rnd(0.3, 0.55),
            size: 1.6,
            h: 0,
            s: 0,
            l: 92,
            g: 0,
            d: 0.94,
            ax: CX,
            ay: r.y,
            pull: 2,
            tr: 4,
          });
        }
        if (Math.random() < 0.6) {
          this.spawn(CX + rnd(-3, 3), r.y + rnd(-3, 3), 0, 0, {
            life: 0.2,
            size: 10,
            h: r.hue + 60,
            s: 70,
            l: 93,
            d: 1,
            g: 0,
            tr: 0,
            tw: false,
          });
        }
      } else {
        for (let k = 0; k < 3; k++) {
          this.spawn(CX + rnd(-2, 2), r.y + PL + rnd(0, 10), rnd(-0.6, 0.6), rnd(1, 3.5), {
            life: rnd(0.2, 0.5),
            size: rnd(1.5, 2.8),
            h: r.hue + rnd(-25, 25),
            l: k === 0 ? 90 : 62,
            g: 0.02,
            d: 0.93,
          });
        }
      }
      if (r.y <= CY + R + PL * 0.9 && this.state === "playing") {
        if (this.collide()) {
          this.flying.splice(i, 1);
          this.failRocket(r);
          // flying list gets cleared in failRocket
          break;
        }
      }
      if (r.y <= CY + R - 2) {
        this.flying.splice(i, 1);
        this.stick(r);
        if (this.ammo === 0 && this.flying.length === 0 && this.state === "playing") {
          this.clearLevel();
        }
      }
    }

    // sky rockets
    for (let i = this.sky.length - 1; i >= 0; i--) {
      const s = this.sky[i];
      s.vy += 700 * dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      for (let k = 0; k < 2; k++) {
        this.spawn(s.x, s.y, rnd(-0.5, 0.5), rnd(0.5, 2), {
          life: rnd(0.3, 0.7),
          size: 1.8,
          h: 38 + rnd(-10, 10),
          l: 70,
          g: 0.02,
          d: 0.94,
        });
      }
      if (s.vy > -40) {
        this.sky.splice(i, 1);
        this.burst(s.x, s.y, s.hue, s.type, s.scale, 30);
        this.sfx.boom(s.scale);
        this.shake = Math.max(this.shake, 2);
      }
    }

    // ambient show on menu / game over — per weapon
    // NOTE: bazooka/rpg use distant ground rumble, never sky fireworks.
    if (this.state === "menu" || this.state === "over") {
      this.ambientT -= dt;
      if (this.ambientT <= 0) {
        if (bh) this.launchVoidSky(rnd(0.8, 1.15));
        else if (sh) this.launchLeap(rnd(0.8, 1.1));
        else if (bb) this.launchBambooSky(rnd(0.8, 1.1));
        else if (sq) this.launchSoakerSky(rnd(0.85, 1.1));
        else if (rb) this.launchRainbowSky(rnd(0.8, 1.1));
        else if (bz) this.launchBazookaGround(rnd(0.6, 0.85));
        else if (rp) this.launchRpgGround(rnd(0.6, 0.85));
        else this.launchSky(rnd(0.9, 1.2));
        this.ambientT = sh || bb || sq || rb || bz || rp ? rnd(1.4, 2.4) : rnd(0.7, 1.5);
      }
    }

    // black-hole cosmic dust rising around the gun
    if (bh && this.state !== "failing" && this.state !== "over" && Math.random() < 0.4 * f) {
      this.spawn(CX + rnd(-90, 90), rnd(GUNY - 60, H - 60), rnd(-0.3, 0.3), rnd(-0.9, -0.25), {
        life: rnd(0.9, 1.8),
        size: rnd(1, 2.1),
        h: rnd(215, 305),
        l: 72,
        g: -0.008,
        d: 0.995,
        tr: 1.5,
      });
    }

    // shark: bubbles always rising around the gun, like we're underwater
    if (sh && this.state !== "failing" && this.state !== "over" && Math.random() < 0.5 * f) {
      this.spawnBubble(
        CX + rnd(-110, 110),
        rnd(GUNY - 70, H - 40),
        rnd(-0.3, 0.3),
        rnd(-1.4, -0.5),
        rnd(1.5, 4)
      );
    }

    // bamboo: embers + fireflies drift around the cannon
    if (bb && this.state !== "failing" && this.state !== "over" && Math.random() < 0.45 * f) {
      const ember = Math.random() < 0.5;
      this.spawn(CX + rnd(-110, 110), rnd(GUNY - 80, H - 40), rnd(-0.3, 0.3), rnd(-0.8, -0.2), {
        life: rnd(0.8, 1.6),
        size: rnd(1, 2),
        h: ember ? rnd(20, 45) : rnd(55, 75),
        s: ember ? 100 : 90,
        l: ember ? 62 : 60,
        g: -0.01,
        d: 0.99,
        tr: 1.6,
      });
    }

    // soaker: mist + tiny bubbles float around the gun
    if (sq && this.state !== "failing" && this.state !== "over" && Math.random() < 0.5 * f) {
      if (Math.random() < 0.5) {
        this.spawnBubble(CX + rnd(-100, 100), rnd(GUNY - 60, H - 40), rnd(-0.3, 0.3), rnd(-1.2, -0.4), rnd(1.4, 3.4));
      } else {
        this.spawn(CX + rnd(-100, 100), rnd(GUNY - 60, H - 40), rnd(-0.3, 0.3), rnd(-0.7, -0.2), {
          life: rnd(0.7, 1.4),
          size: rnd(1, 1.9),
          h: rnd(192, 208),
          s: 85,
          l: 78,
          g: -0.008,
          d: 0.995,
          tr: 1.5,
        });
      }
    }

    // rainbow: spectrum motes drift up around the cannon
    if (rb && this.state !== "failing" && this.state !== "over" && Math.random() < 0.55 * f) {
      this.spawn(CX + rnd(-110, 110), rnd(GUNY - 80, H - 40), rnd(-0.3, 0.3), rnd(-0.9, -0.25), {
        life: rnd(0.8, 1.6),
        size: rnd(1, 2.1),
        h: this.time * 100 + rnd(0, 360),
        s: 100,
        l: 68,
        g: -0.008,
        d: 0.995,
        tr: 1.6,
      });
    }

    // bazooka / rpg: embers + cordite smoke curl around the launcher
    if ((bz || rp) && this.state !== "failing" && this.state !== "over" && Math.random() < 0.5 * f) {
      if (Math.random() < 0.55) {
        this.spawn(CX + rnd(-105, 105), rnd(GUNY - 70, H - 40), rnd(-0.3, 0.3), rnd(-0.9, -0.25), {
          life: rnd(0.7, 1.4),
          size: rnd(1, 2),
          h: rnd(18, 50),
          s: 100,
          l: 62,
          g: -0.01,
          d: 0.99,
          tr: 1.6,
        });
      } else {
        this.spawn(CX + rnd(-95, 95), rnd(GUNY - 50, H - 50), rnd(-0.25, 0.25), rnd(-0.6, -0.15), {
          life: rnd(0.9, 1.6),
          size: rnd(2, 3.4),
          h: 40,
          s: 8,
          l: 48,
          g: -0.012,
          d: 0.985,
          tr: 1.2,
          tw: false,
        });
      }
    }

    // blackhole: faint star streaks warp past in the upper sky
    if (bh && this.state !== "failing" && this.state !== "over" && Math.random() < 0.12 * f) {
      const sx = rnd(0, W);
      this.spawn(sx, rnd(-10, 200), (CX - sx) * 0.004, rnd(1.5, 3), {
        life: rnd(0.5, 0.9),
        size: 1.4,
        h: 0,
        s: 0,
        l: 88,
        g: 0,
        d: 0.99,
        tr: 5,
        tw: false,
      });
    }

    // particles
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
      // active voids devour nearby particles
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
            // slight orbital curve
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
        if (p.crackle) {
          for (let k = 0; k < 3; k++) {
            const a = rnd(0, TAU);
            const sp = rnd(0.8, 2.2);
            this.spawn(p.x, p.y, Math.cos(a) * sp, Math.sin(a) * sp, {
              life: rnd(0.2, 0.45),
              size: 1.3,
              h: 50,
              s: 40,
              l: 92,
              g: 0.02,
              d: 0.92,
              tr: 1,
            });
          }
        }
        this.particles[i] = this.particles[this.particles.length - 1];
        this.particles.pop();
      }
    }

    // debris — voids drag fragments back in and consume them
    for (let i = this.debris.length - 1; i >= 0; i--) {
      const d = this.debris[i];
      const isFrag = d.kind === "shard" || d.kind === "clod";
      d.vy += (isFrag ? 1650 : 1300) * dt;
      d.vx *= isFrag ? 1 - 0.35 * dt : 1;
      if (this.voids.length > 0) {
        for (const v of this.voids) {
          const dx = v.x - d.x;
          const dy = v.y - d.y;
          const dist = Math.hypot(dx, dy) || 1;
          if (dist < 320 && dist > 8) {
            const s = (1 - dist / 320) * (v.life / v.max) * 2600 * dt;
            d.vx += (dx / dist) * s;
            d.vy += (dy / dist) * s;
          } else if (dist <= 8) {
            d.life = Math.min(d.life, 0.15);
          }
        }
        const spd = Math.hypot(d.vx, d.vy);
        if (spd > 900) {
          d.vx = (d.vx / spd) * 900;
          d.vy = (d.vy / spd) * 900;
        }
      }
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      d.rot += d.vr * dt;
      d.life -= dt;
      if ((d.kind === "shard" || d.kind === "clod") && d.hot !== undefined) {
        d.hot = Math.max(0, d.hot - dt * 1.8);
        // bounce once off the bottom of the screen like real debris
        if (d.y > H - 30 && d.vy > 0) {
          d.y = H - 30;
          d.vy *= -0.35;
          d.vx *= 0.7;
          d.vr *= 0.6;
          if (Math.abs(d.vy) > 60 && Math.random() < 0.5) {
            this.spawn(d.x, d.y, rnd(-1, 1), rnd(-2, -0.5), {
              life: rnd(0.25, 0.5),
              size: 1.3,
              h: rnd(35, 52),
              s: 100,
              l: 66,
              g: 0.1,
              d: 0.93,
            });
          }
        }
        // hot shards shed dull sparks (no twinkle)
        if (d.kind === "shard" && (d.hot ?? 0) > 0.25 && Math.random() < 0.35) {
          this.spawn(d.x, d.y, rnd(-0.8, 0.8), rnd(-0.5, 1), {
            life: rnd(0.2, 0.4),
            size: 1.2,
            h: rnd(32, 46),
            s: 100,
            l: 62,
            g: 0.1,
            d: 0.93,
            tr: 2.2,
            tw: false,
          });
        }
      }
      if (d.kind === "rocket" && Math.random() < 0.5) {
        if (bh) {
          this.spawn(d.x, d.y, rnd(-0.8, 0.8), rnd(-0.8, 0.8), {
            life: rnd(0.25, 0.5),
            size: 1.7,
            h: 215 + rnd(0, 105),
            l: 74,
            g: 0,
            d: 0.93,
          });
        } else if (sh) {
          if (Math.random() < 0.5) {
            this.spawnBubble(d.x + rnd(-8, 8), d.y + rnd(-8, 8), rnd(-1, 1), rnd(-2, -0.5), rnd(1.6, 3.4));
          } else {
            this.spawn(d.x, d.y, rnd(-1, 1), rnd(0, 2), {
              life: rnd(0.25, 0.5),
              size: 1.7,
              h: rnd(190, 210),
              s: 90,
              l: 75,
              g: 0.15,
              d: 0.93,
            });
          }
        } else if (bb) {
          this.spawn(d.x, d.y, rnd(-1, 1), rnd(-1, 1), {
            life: rnd(0.25, 0.5),
            size: 1.7,
            h: rnd(22, 40),
            s: 45,
            l: 55,
            g: 0.08,
            d: 0.93,
          });
        } else if (sq) {
          if (Math.random() < 0.5) {
            this.spawnBubble(d.x + rnd(-8, 8), d.y + rnd(-8, 8), rnd(-1, 1), rnd(-2, -0.5), rnd(1.5, 3));
          } else {
            this.spawn(d.x, d.y, rnd(-1, 1), rnd(0, 2), {
              life: rnd(0.25, 0.5),
              size: 1.6,
              h: rnd(192, 208),
              s: 95,
              l: 76,
              g: 0.15,
              d: 0.93,
            });
          }
        } else if (rb) {
          this.spawn(d.x, d.y, rnd(-1.2, 1.2), rnd(-1, 1.5), {
            life: rnd(0.25, 0.5),
            size: 1.7,
            h: this.time * 140 + rnd(0, 360),
            s: 100,
            l: 66,
            g: 0.05,
            d: 0.93,
          });
        } else if (bz || rp) {
          // tumbling warheads trail fire + smoke (no twinkle)
          if (Math.random() < 0.6) {
            this.spawn(d.x, d.y, rnd(-1, 1), rnd(-0.5, 1.5), {
              life: rnd(0.25, 0.5),
              size: 1.7,
              h: rnd(16, 42),
              s: 100,
              l: 58,
              g: 0.04,
              d: 0.93,
              tw: false,
            });
          } else {
            this.spawn(d.x, d.y, rnd(-0.8, 0.8), rnd(-1, 0.5), {
              life: rnd(0.4, 0.8),
              size: 2.2,
              h: 40,
              s: 9,
              l: 50,
              g: -0.01,
              d: 0.95,
              tr: 1.2,
              tw: false,
            });
          }
        } else {
          this.spawn(d.x, d.y, rnd(-1, 1), rnd(-1, 1), {
            life: rnd(0.2, 0.4),
            size: 1.6,
            h: d.hue + rnd(-20, 20),
            l: 68,
            g: 0.02,
            d: 0.93,
          });
        }
      }
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
      this.voids[i].life -= dt;
      if (this.voids[i].life <= 0) this.voids.splice(i, 1);
    }
    for (let i = this.jets.length - 1; i >= 0; i--) {
      this.jets[i].life -= dt;
      if (this.jets[i].life <= 0) this.jets.splice(i, 1);
    }
    for (let i = this.beams.length - 1; i >= 0; i--) {
      this.beams[i].life -= dt;
      if (this.beams[i].life <= 0) this.beams.splice(i, 1);
    }
    // war fireballs — expand fast, rise, cool from white to deep red
    for (let i = this.fireballs.length - 1; i >= 0; i--) {
      const fb = this.fireballs[i];
      fb.vy -= 60 * dt;
      fb.vx *= 1 - 1.6 * dt;
      fb.vy *= 1 - 1.2 * dt;
      fb.x += fb.vx * dt;
      fb.y += fb.vy * dt;
      fb.r += 46 * dt * Math.max(0.3, fb.life / fb.max);
      fb.life -= dt;
      if (fb.life <= 0) this.fireballs.splice(i, 1);
    }
    // war smoke — billow up, expand, fade slowly
    for (let i = this.smokes.length - 1; i >= 0; i--) {
      const s = this.smokes[i];
      s.vy -= 26 * dt;
      s.vx *= 1 - 0.9 * dt;
      s.vy *= 1 - 0.7 * dt;
      s.vx += Math.sin(this.time * 2.2 + s.seed * 7 + s.y * 0.02) * 14 * dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      const growK = 1 - s.life / s.max;
      s.r += (s.grow - s.r) * Math.min(1, dt * (1.2 - growK * 0.6));
      s.life -= dt;
      if (s.life <= 0) this.smokes.splice(i, 1);
    }
    for (let i = this.flashes.length - 1; i >= 0; i--) {
      this.flashes[i].life -= dt;
      if (this.flashes[i].life <= 0) this.flashes.splice(i, 1);
    }
    // bubbles float up with a wobble
    for (let i = this.bubbles.length - 1; i >= 0; i--) {
      const b = this.bubbles[i];
      b.vy -= 1.6 * dt;
      b.vx += Math.sin(this.time * 6 + b.y * 0.08) * 0.5 * dt;
      b.x += b.vx * f * 0.9;
      b.y += b.vy * f * 0.9;
      b.life -= dt;
      if (b.life <= 0 || b.y < -12) this.bubbles.splice(i, 1);
    }
    // leaping celebration sharks
    for (let i = this.leaps.length - 1; i >= 0; i--) {
      const l = this.leaps[i];
      l.t += dt;
      if (l.t >= l.dur) {
        this.splashBurst(l.x1, Math.min(l.y1, H - 60), l.hue, 0.8 * l.size);
        this.leaps.splice(i, 1);
      }
    }
    for (let i = this.biteMarks.length - 1; i >= 0; i--) {
      this.biteMarks[i].life -= dt;
      if (this.biteMarks[i].life <= 0) this.biteMarks.splice(i, 1);
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
    // horizon haze
    const hz = c.createRadialGradient(W / 2, H, 10, W / 2, H, 420);
    hz.addColorStop(0, "rgba(255,120,160,0.25)");
    hz.addColorStop(1, "rgba(255,120,160,0)");
    c.fillStyle = hz;
    c.fillRect(0, 0, W, H);
    // skyline
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

    // stars
    for (const s of this.stars) {
      const a = 0.35 + 0.65 * Math.abs(Math.sin(this.time * s.sp + s.ph));
      ctx.fillStyle = `rgba(255,255,255,${a * 0.85})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, TAU);
      ctx.fill();
    }

    ctx.save();
    if (this.shake > 0) ctx.translate(rnd(-1, 1) * this.shake, rnd(-1, 1) * this.shake);

    // deep-space nebula + gravitational warping for the black-hole gun
    if (this.weapon === "blackhole") {
      // darker cosmos base
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
      // magenta heart glow near the wheel
      const neb3 = ctx.createRadialGradient(CX, CY, 0, CX, CY, 220);
      neb3.addColorStop(0, `rgba(200,40,180,${na * 0.7})`);
      neb3.addColorStop(1, "rgba(200,40,180,0)");
      ctx.fillStyle = neb3;
      ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = "source-over";
      // warped light arcs bending around the scene (gravitational lensing)
      ctx.save();
      ctx.strokeStyle = "rgba(160,130,255,0.10)";
      ctx.lineWidth = 2;
      for (let i = 0; i < 3; i++) {
        const rr = 190 + i * 46 + Math.sin(this.time * 0.8 + i * 2) * 6;
        ctx.beginPath();
        ctx.arc(CX, CY, rr, Math.PI * 0.15 + this.time * 0.05 * (i + 1), Math.PI * 0.85 + this.time * 0.05 * (i + 1));
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(CX, CY, rr, Math.PI * 1.15 - this.time * 0.04 * (i + 1), Math.PI * 1.85 - this.time * 0.04 * (i + 1));
        ctx.stroke();
      }
      ctx.restore();
    }

    // underwater tint + god rays for the shark gun
    if (this.weapon === "shark") {
      const wg = ctx.createLinearGradient(0, 0, 0, H);
      wg.addColorStop(0, "rgba(8,40,90,0.28)");
      wg.addColorStop(0.6, "rgba(10,80,140,0.16)");
      wg.addColorStop(1, "rgba(6,30,70,0.34)");
      ctx.fillStyle = wg;
      ctx.fillRect(0, 0, W, H);
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = 0.1 + 0.03 * Math.sin(this.time * 0.9);
      ctx.fillStyle = "#9fdcff";
      for (let i = 0; i < 3; i++) {
        const bx = 60 + i * 130 + Math.sin(this.time * 0.4 + i * 2) * 18;
        ctx.beginPath();
        ctx.moveTo(bx, -10);
        ctx.lineTo(bx + 44, -10);
        ctx.lineTo(bx + 110, H);
        ctx.lineTo(bx + 40, H);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
      // seabed glow at the bottom
      const sg = ctx.createLinearGradient(0, H - 90, 0, H);
      sg.addColorStop(0, "rgba(20,120,170,0)");
      sg.addColorStop(1, "rgba(20,140,190,0.22)");
      ctx.fillStyle = sg;
      ctx.fillRect(0, H - 90, W, 90);
    }

    // warm jungle dusk for the bamboo cannon
    if (this.weapon === "bamboo") {
      const jg = ctx.createLinearGradient(0, 0, 0, H);
      jg.addColorStop(0, "rgba(20,60,25,0.3)");
      jg.addColorStop(0.55, "rgba(60,70,20,0.14)");
      jg.addColorStop(1, "rgba(120,60,15,0.26)");
      ctx.fillStyle = jg;
      ctx.fillRect(0, 0, W, H);
      // fire glow from below
      const fg = ctx.createRadialGradient(CX, H, 20, CX, H, 380);
      const flick = 0.16 + 0.03 * Math.sin(this.time * 7) + 0.02 * Math.sin(this.time * 13);
      fg.addColorStop(0, `rgba(255,140,40,${flick})`);
      fg.addColorStop(1, "rgba(255,140,40,0)");
      ctx.fillStyle = fg;
      ctx.fillRect(0, 0, W, H);
      // bamboo silhouettes on the sides
      ctx.fillStyle = "rgba(25,70,30,0.5)";
      for (const [sx, sw, lean] of [[-14, 16, 0.06], [W - 2, 16, -0.06]] as const) {
        ctx.save();
        ctx.translate(sx, H);
        ctx.rotate(lean);
        ctx.fillRect(0, -H * 0.75, sw, H * 0.75);
        ctx.fillStyle = "rgba(40,110,45,0.5)";
        for (let i = 0; i < 5; i++) {
          ctx.fillRect(-3, -H * 0.72 + i * 110, sw + 6, 7);
        }
        ctx.fillStyle = "rgba(25,70,30,0.5)";
        ctx.restore();
      }
    }

    // bright pool-party tint for the super soaker
    if (this.weapon === "soaker") {
      const pg = ctx.createLinearGradient(0, 0, 0, H);
      pg.addColorStop(0, "rgba(40,140,220,0.2)");
      pg.addColorStop(0.6, "rgba(60,180,240,0.1)");
      pg.addColorStop(1, "rgba(20,100,180,0.24)");
      ctx.fillStyle = pg;
      ctx.fillRect(0, 0, W, H);
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = 0.08 + 0.025 * Math.sin(this.time * 1.1);
      ctx.fillStyle = "#d8f4ff";
      for (let i = 0; i < 2; i++) {
        const bx = 90 + i * 190 + Math.sin(this.time * 0.5 + i * 2.4) * 16;
        ctx.beginPath();
        ctx.moveTo(bx, -10);
        ctx.lineTo(bx + 60, -10);
        ctx.lineTo(bx + 110, H);
        ctx.lineTo(bx + 30, H);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }

    // prismatic aurora for the rainbow laser gun
    if (this.weapon === "rainbow") {
      const ag = ctx.createLinearGradient(0, 0, 0, H);
      ag.addColorStop(0, "rgba(30,10,60,0.25)");
      ag.addColorStop(0.5, "rgba(20,30,90,0.12)");
      ag.addColorStop(1, "rgba(40,10,70,0.28)");
      ctx.fillStyle = ag;
      ctx.fillRect(0, 0, W, H);
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      // sweeping aurora ribbons
      for (let i = 0; i < 3; i++) {
        const hue = (this.time * 40 + i * 120) % 360;
        ctx.globalAlpha = 0.07 + 0.02 * Math.sin(this.time * 1.3 + i * 2);
        ctx.fillStyle = hsl(hue, 100, 60);
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
      // faint giant rainbow arc behind the wheel
      ctx.save();
      ctx.globalAlpha = 0.16;
      ctx.lineWidth = 9;
      for (let i = 0; i < 6; i++) {
        ctx.strokeStyle = hsl((this.time * 30 + i * 60) % 360, 100, 62);
        ctx.beginPath();
        ctx.arc(CX, CY + 190, 250 - i * 9, Math.PI * 1.12, Math.PI * 1.88);
        ctx.stroke();
      }
      ctx.restore();
    }

    // smoky battlefield dusk for the bazooka
    if (this.weapon === "bazooka") {
      const wg = ctx.createLinearGradient(0, 0, 0, H);
      wg.addColorStop(0, "rgba(30,28,18,0.32)");
      wg.addColorStop(0.55, "rgba(70,55,25,0.16)");
      wg.addColorStop(1, "rgba(120,60,18,0.3)");
      ctx.fillStyle = wg;
      ctx.fillRect(0, 0, W, H);
      // burning horizon glow
      const fg = ctx.createRadialGradient(CX, H, 20, CX, H, 400);
      const flick = 0.18 + 0.035 * Math.sin(this.time * 6) + 0.02 * Math.sin(this.time * 11);
      fg.addColorStop(0, `rgba(255,130,35,${flick})`);
      fg.addColorStop(1, "rgba(255,130,35,0)");
      ctx.fillStyle = fg;
      ctx.fillRect(0, 0, W, H);
      // sweeping searchlights
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = 0.07 + 0.02 * Math.sin(this.time * 0.9);
      ctx.fillStyle = "#ffe9b8";
      for (let i = 0; i < 2; i++) {
        const bx = 70 + i * 200 + Math.sin(this.time * 0.4 + i * 2.6) * 40;
        ctx.beginPath();
        ctx.moveTo(bx, H);
        ctx.lineTo(bx + 34, H);
        ctx.lineTo(bx - 60 + (i === 0 ? 60 : -60), 0);
        ctx.lineTo(bx - 90 + (i === 0 ? 60 : -60), 0);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
      // sandbag silhouettes at the bottom corners
      ctx.fillStyle = "rgba(88,70,40,0.85)";
      for (const sx of [0, 1]) {
        const bx = sx === 0 ? 8 : W - 68;
        for (let r = 0; r < 2; r++) {
          for (let c = 0; c < 3; c++) {
            ctx.beginPath();
            ctx.ellipse(bx + 10 + c * 20 + (r % 2) * 10, H - 14 - r * 14, 11, 7.5, 0, 0, TAU);
            ctx.fill();
          }
        }
      }
    }

    // desert-storm combat haze for the RPG
    if (this.weapon === "rpg") {
      const dg = ctx.createLinearGradient(0, 0, 0, H);
      dg.addColorStop(0, "rgba(80,40,20,0.3)");
      dg.addColorStop(0.55, "rgba(140,80,35,0.14)");
      dg.addColorStop(1, "rgba(90,45,20,0.3)");
      ctx.fillStyle = dg;
      ctx.fillRect(0, 0, W, H);
      // dust sun glow
      const sg = ctx.createRadialGradient(CX + 110, 150, 10, CX + 110, 150, 260);
      const sa = 0.14 + 0.03 * Math.sin(this.time * 0.8);
      sg.addColorStop(0, `rgba(255,190,110,${sa})`);
      sg.addColorStop(1, "rgba(255,190,110,0)");
      ctx.fillStyle = sg;
      ctx.fillRect(0, 0, W, H);
      // drifting dust sheets
      ctx.save();
      ctx.globalAlpha = 0.08 + 0.02 * Math.sin(this.time * 1.2);
      ctx.fillStyle = "#e8c890";
      for (let i = 0; i < 2; i++) {
        const yy = 200 + i * 220 + Math.sin(this.time * 0.5 + i * 2) * 24;
        ctx.beginPath();
        ctx.ellipse(CX + Math.sin(this.time * 0.3 + i * 3) * 40, yy, 190, 26, 0, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
      // distant tracer streaks arcing across the sky
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      for (let i = 0; i < 3; i++) {
        const tt = (this.time * 0.25 + i * 0.37) % 1;
        const tx = 30 + tt * (W - 60);
        const ty = 90 + i * 46 + Math.sin(tt * 6 + i) * 14;
        const grad = ctx.createLinearGradient(tx - 46, ty + 10, tx, ty);
        grad.addColorStop(0, "rgba(255,150,60,0)");
        grad.addColorStop(1, "rgba(255,200,120,0.7)");
        ctx.strokeStyle = grad;
        ctx.lineWidth = 2;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(tx - 46, ty + 10);
        ctx.lineTo(tx, ty);
        ctx.stroke();
        ctx.fillStyle = "rgba(255,240,210,0.9)";
        ctx.beginPath();
        ctx.arc(tx, ty, 1.8, 0, TAU);
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

    // flying projectiles
    if (this.weapon === "blackhole") {
      for (const r of this.flying) {
        ctx.save();
        ctx.translate(CX, r.y);
        drawOrb(ctx, r.hue, 12.5, this.time, 2.3);
        ctx.restore();
      }
    } else if (this.weapon === "bazooka") {
      for (const r of this.flying) {
        const wig = Math.sin(r.age * 12 + r.seed * 5) * 0.03;
        ctx.save();
        ctx.translate(CX + Math.sin(r.age * 8 + r.seed * 3) * 1.5, r.y);
        ctx.rotate(Math.PI / 2 + wig);
        drawBazookaShell(ctx, r.hue, this.time, r.seed, 0, 1);
        ctx.restore();
      }
    } else if (this.weapon === "rpg") {
      for (const r of this.flying) {
        const wig = Math.sin(r.age * 13 + r.seed * 4) * 0.04;
        ctx.save();
        ctx.translate(CX + Math.sin(r.age * 9 + r.seed * 5) * 2, r.y);
        ctx.rotate(Math.PI / 2 + wig);
        drawRpgGrenade(ctx, r.hue, this.time, r.seed, 0, 1);
        ctx.restore();
      }
    } else if (this.weapon === "rainbow") {
      for (const r of this.flying) {
        ctx.save();
        ctx.translate(CX + Math.sin(r.age * 11 + r.seed * 4) * 2, r.y);
        ctx.rotate(Math.PI / 2);
        drawRainbowBolt(ctx, this.time, r.seed, 0, 1);
        ctx.restore();
      }
    } else if (this.weapon === "bamboo") {
      for (const r of this.flying) {
        ctx.save();
        ctx.translate(CX, r.y);
        drawStone(ctx, r.hue, 13.5, this.time + r.age * 2, r.seed, 0);
        ctx.restore();
      }
    } else if (this.weapon === "soaker") {
      for (const r of this.flying) {
        ctx.save();
        ctx.translate(CX + Math.sin(r.age * 10 + r.seed * 4) * 2.5, r.y);
        drawDrop(ctx, r.hue, 12, this.time, r.seed, 0);
        ctx.restore();
      }
    } else if (this.weapon === "shark") {
      for (const r of this.flying) {
        const wig = Math.sin(r.age * 14 + r.seed * 5) * 0.06;
        ctx.save();
        ctx.translate(CX + Math.sin(r.age * 9 + r.seed * 4) * 3, r.y);
        ctx.rotate(Math.PI / 2 + wig);
        drawShark(ctx, r.hue, Math.max(r.open, 0.12), this.time, r.seed, 0);
        ctx.restore();
      }
    } else {
      for (const r of this.flying) {
        ctx.save();
        ctx.translate(CX, r.y);
        ctx.rotate(Math.PI / 2);
        drawRocketShape(ctx, r.hue);
        ctx.restore();
      }
    }

    this.drawVoids();
    this.drawJets();
    this.drawLeaps();
    this.drawBeams();
    this.drawSmokes();

    // particles on top, additive
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
    // sky rocket heads
    for (const s of this.sky) {
      ctx.fillStyle = "rgba(255,230,160,0.95)";
      ctx.beginPath();
      ctx.arc(s.x, s.y, 2.6, 0, TAU);
      ctx.fill();
    }
    // shock rings (expanding) + implosion rings (collapsing into the void)
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
    this.drawFireballs();
    this.drawFlashes();
    this.drawBubbles();

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

    // black-hole gravity vignette
    if (this.voidPulse > 0) {
      const vg = ctx.createRadialGradient(CX, CY, 40, CX, CY, 430);
      vg.addColorStop(0, "rgba(12,2,30,0)");
      vg.addColorStop(1, `rgba(10,1,28,${0.6 * this.voidPulse})`);
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, W, H);
    }

    // shark splash vignette — water closes in from the edges
    if (this.aquaPulse > 0) {
      const ag = ctx.createRadialGradient(CX, CY, 60, CX, CY, 430);
      ag.addColorStop(0, "rgba(10,90,150,0)");
      ag.addColorStop(1, `rgba(20,130,200,${0.5 * this.aquaPulse})`);
      ctx.fillStyle = ag;
      ctx.fillRect(0, 0, W, H);
    }

    // bamboo cannon heat vignette — fire glows in from the edges
    if (this.cannonPulse > 0) {
      const cg2 = ctx.createRadialGradient(CX, CY, 60, CX, CY, 430);
      cg2.addColorStop(0, "rgba(150,60,10,0)");
      cg2.addColorStop(1, `rgba(255,130,30,${0.45 * this.cannonPulse})`);
      ctx.fillStyle = cg2;
      ctx.fillRect(0, 0, W, H);
    }

    // rainbow prism vignette — shifting spectrum closes in from the edges
    if (this.rainbowPulse > 0) {
      for (let i = 0; i < 3; i++) {
        const hue = (this.time * 120 + i * 120) % 360;
        const rg = ctx.createRadialGradient(CX, CY, 90 + i * 40, CX, CY, 430);
        rg.addColorStop(0, hsl(hue, 100, 60, 0));
        rg.addColorStop(1, hsl(hue, 100, 60, 0.22 * this.rainbowPulse));
        ctx.fillStyle = rg;
        ctx.fillRect(0, 0, W, H);
      }
    }

    // screen flash
    if (this.flash > 0) {
      ctx.fillStyle = hsl(this.flashHue, 100, 70, Math.min(0.45, this.flash * 0.45));
      ctx.fillRect(0, 0, W, H);
    }
  }

  private drawWheel() {
    if (!this.wheelVisible) return;
    const ctx = this.ctx;
    const hue = this.wheelHue;
    const s = this.wheelScale * (1 + this.pulse * 0.035);
    const cy = CY + this.jolt * 7;
    ctx.save();
    ctx.translate(CX, cy);
    ctx.scale(s, s);

    // glow
    ctx.globalCompositeOperation = "lighter";
    const og = ctx.createRadialGradient(0, 0, R * 0.8, 0, 0, R + 85);
    og.addColorStop(0, hsl(hue, 100, 55, 0.3 + this.pulse * 0.25));
    og.addColorStop(1, hsl(hue, 100, 55, 0));
    ctx.fillStyle = og;
    ctx.beginPath();
    ctx.arc(0, 0, R + 85, 0, TAU);
    ctx.fill();
    ctx.globalCompositeOperation = "source-over";

    const shW = this.weapon === "shark";
    const bbW = this.weapon === "bamboo";
    const sqW = this.weapon === "soaker";
    const rwW = this.weapon === "rainbow";
    const bzW = this.weapon === "bazooka";
    const rpW = this.weapon === "rpg";
    // stuck projectiles
    ctx.save();
    ctx.rotate(this.rot);
    for (const p of this.pins) {
      ctx.save();
      ctx.rotate(p.a);
      if (this.weapon === "blackhole") {
        ctx.translate(R + 2, 0);
        drawOrb(ctx, p.hue, 11.5, this.time, p.hue * 0.7);
        if (p.flash > 0) {
          ctx.fillStyle = `rgba(255,255,255,${p.flash * 0.65})`;
          ctx.beginPath();
          ctx.arc(0, 0, 12.5, 0, TAU);
          ctx.fill();
        }
        // orbiting sparks
        for (let q = 0; q < 2; q++) {
          const sa = this.time * 3.2 + p.hue + q * Math.PI;
          ctx.fillStyle = q === 0 ? "#fff" : hsl(p.hue + 50, 100, 75, 0.95);
          ctx.beginPath();
          ctx.arc(Math.cos(sa) * 17, Math.sin(sa) * 17, q === 0 ? 2 : 1.6, 0, TAU);
          ctx.fill();
        }
      } else if (shW) {
        // shark clamped onto the board, tail wiggling, jaws snapping shut on bite
        const wig = Math.sin(this.time * 6 + p.seed * 8) * 0.028 * (0.4 + p.bite);
        ctx.rotate(wig);
        ctx.translate(R - 3, 0);
        const snap = Math.sin(Math.min(1, p.bite) * Math.PI) * 0.4;
        const idle = Math.max(0, Math.sin(this.time * 1.6 + p.seed * 9)) * 0.07;
        drawShark(ctx, p.hue, 0.16 + snap + idle, this.time, p.seed, p.flash);
      } else if (bbW) {
        // stone embedded in the wood, half-buried
        ctx.translate(R + 2, 0);
        drawStone(ctx, p.hue, 13, this.time * 0.3, p.seed, p.flash);
        // wooden splinter ring around fresh impacts
        if (p.bite > 0.15) {
          ctx.strokeStyle = `rgba(255,235,200,${p.bite * 0.8})`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(0, 0, 15 + (1 - p.bite) * 8, 0, TAU);
          ctx.stroke();
        }
      } else if (sqW) {
        // water blob stuck on the board, wobbling
        ctx.translate(R + 4, 0);
        ctx.rotate(-Math.PI / 2);
        const squash = 1 + Math.sin(this.time * 7 + p.seed * 8) * 0.06 + p.bite * 0.15;
        ctx.scale(squash, 1 / squash);
        drawDrop(ctx, p.hue, 11.5, this.time, p.seed, p.flash);
      } else if (rwW) {
        // rainbow laser bolt lodged tip-first, humming with spectrum energy
        ctx.translate(R - 4, 0);
        const jig = Math.sin(this.time * 10 + p.seed * 9) * 0.012;
        ctx.rotate(jig);
        const pop = 1 + p.bite * 0.25;
        ctx.scale(pop, pop);
        drawRainbowBolt(ctx, this.time, p.seed, p.flash, 1);
      } else if (bzW) {
        // bazooka shell rammed nose-first into armor — crater + molten rim + smoke
        const sink = (1 - Math.min(1, p.bite * 1.6)) * 2;
        ctx.translate(R - 5 - sink, 0);
        const jig = Math.sin(this.time * 9 + p.seed * 8) * 0.014 * (0.4 + p.bite);
        ctx.rotate(jig);
        // scorched crater behind the shell (cools from white to black)
        const ck = Math.min(1, p.bite * 1.4);
        ctx.fillStyle = `rgba(8,6,4,${0.55 + 0.35 * ck})`;
        ctx.beginPath();
        ctx.ellipse(-3, 0, 11, 8.5, 0, 0, TAU);
        ctx.fill();
        if (p.bite > 0.05) {
          ctx.save();
          ctx.globalCompositeOperation = "lighter";
          const mg = ctx.createRadialGradient(-3, 0, 0, -3, 0, 13);
          mg.addColorStop(0, `rgba(255,240,210,${0.7 * ck})`);
          mg.addColorStop(0.45, `rgba(255,160,60,${0.5 * ck})`);
          mg.addColorStop(1, "rgba(255,110,30,0)");
          ctx.fillStyle = mg;
          ctx.beginPath();
          ctx.arc(-3, 0, 13, 0, TAU);
          ctx.fill();
          ctx.restore();
          // bent armor lips
          ctx.strokeStyle = `rgba(200,190,150,${0.5 + 0.4 * ck})`;
          ctx.lineWidth = 2;
          for (const s of [-1, 1]) {
            ctx.beginPath();
            ctx.moveTo(-8, s * 6);
            ctx.quadraticCurveTo(-13, s * 9, -17, s * 8);
            ctx.stroke();
          }
        }
        drawBazookaShell(ctx, p.hue, this.time, p.seed, p.flash, 0);
        if (p.bite > 0.12) {
          ctx.strokeStyle = `rgba(255,190,110,${p.bite * 0.7})`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(-2, 0, 13 + (1 - p.bite) * 12, 0, TAU);
          ctx.stroke();
        }
      } else if (rpW) {
        // RPG grenade pierced deep — star-shaped breach + white-hot jet hole
        const sink = (1 - Math.min(1, p.bite * 1.6)) * 3;
        ctx.translate(R - 7 - sink, 0);
        const jig = Math.sin(this.time * 8 + p.seed * 7) * 0.014 * (0.4 + p.bite);
        ctx.rotate(jig);
        const ck = Math.min(1, p.bite * 1.5);
        // jagged breach
        ctx.fillStyle = `rgba(10,6,4,${0.6 + 0.35 * ck})`;
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * TAU + p.seed;
          const rr = 9 + (i % 2) * 4.5;
          const px = -3 + Math.cos(a) * rr;
          const py = Math.sin(a) * rr * 0.8;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        if (p.bite > 0.05) {
          ctx.save();
          ctx.globalCompositeOperation = "lighter";
          const mg = ctx.createRadialGradient(-4, 0, 0, -4, 0, 12);
          mg.addColorStop(0, `rgba(255,255,255,${0.8 * ck})`);
          mg.addColorStop(0.4, `rgba(200,235,255,${0.55 * ck})`);
          mg.addColorStop(1, "rgba(255,150,60,0)");
          ctx.fillStyle = mg;
          ctx.beginPath();
          ctx.arc(-4, 0, 12, 0, TAU);
          ctx.fill();
          ctx.restore();
          // peeled steel petals
          ctx.strokeStyle = `rgba(215,190,150,${0.55 + 0.35 * ck})`;
          ctx.lineWidth = 2;
          for (let i = 0; i < 4; i++) {
            const a = p.seed + (i * TAU) / 4;
            ctx.beginPath();
            ctx.moveTo(-3 + Math.cos(a) * 8, Math.sin(a) * 7);
            ctx.lineTo(-3 + Math.cos(a) * 15, Math.sin(a) * 12);
            ctx.stroke();
          }
        }
        drawRpgGrenade(ctx, p.hue, this.time, p.seed, p.flash, 0);
        if (p.bite > 0.12) {
          ctx.strokeStyle = `rgba(220,240,255,${p.bite * 0.6})`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(-4, 0, 14 + (1 - p.bite) * 12, 0, TAU);
          ctx.stroke();
        }
      } else {
        ctx.translate(R - 6, 0);
        drawRocketShape(ctx, p.hue, p.flash);
      }
      ctx.restore();
    }
    ctx.restore();

    const bhW = this.weapon === "blackhole";
    // rim per weapon
    const rim = ctx.createLinearGradient(-R, -R, R, R);
    if (bhW) {
      // animated plasma rim — hues drift through the cosmic band
      const drift = this.time * 22;
      rim.addColorStop(0, hsl(252 + Math.sin(drift * 0.05) * 22, 95, 58));
      rim.addColorStop(0.35, hsl(285, 100, 64));
      rim.addColorStop(0.65, hsl(210, 100, 62));
      rim.addColorStop(1, hsl(320 + Math.cos(drift * 0.05) * 18, 95, 60));
    } else if (rwW) {
      const flow = this.time * 45;
      rim.addColorStop(0, hsl(flow, 100, 62));
      rim.addColorStop(0.25, hsl(flow + 90, 100, 62));
      rim.addColorStop(0.5, hsl(flow + 180, 100, 62));
      rim.addColorStop(0.75, hsl(flow + 270, 100, 62));
      rim.addColorStop(1, hsl(flow + 360, 100, 62));
    } else if (shW) {
      rim.addColorStop(0, "#9c6a33");
      rim.addColorStop(0.5, "#c08a45");
      rim.addColorStop(1, "#7c4f22");
    } else if (bbW) {
      rim.addColorStop(0, "#5da24a");
      rim.addColorStop(0.5, "#8fd06a");
      rim.addColorStop(1, "#3c7a2e");
    } else if (sqW) {
      rim.addColorStop(0, "#ff9d2e");
      rim.addColorStop(0.5, "#ffd23e");
      rim.addColorStop(1, "#ff7b1c");
    } else if (bzW) {
      rim.addColorStop(0, "#6b7a38");
      rim.addColorStop(0.5, "#9aa856");
      rim.addColorStop(1, "#3a4420");
    } else if (rpW) {
      rim.addColorStop(0, "#a85a30");
      rim.addColorStop(0.5, "#d88a4a");
      rim.addColorStop(1, "#6e3418");
    } else {
      rim.addColorStop(0, hsl(hue, 95, 68));
      rim.addColorStop(0.5, hsl(hue + 70, 95, 60));
      rim.addColorStop(1, hsl(hue + 140, 95, 66));
    }
    ctx.fillStyle = rim;
    ctx.beginPath();
    ctx.arc(0, 0, R + 6, 0, TAU);
    ctx.fill();

    // disc per weapon
    const dg = ctx.createRadialGradient(-R * 0.35, -R * 0.4, 6, 0, 0, R);
    if (bhW) {
      dg.addColorStop(0, "#22104a");
      dg.addColorStop(0.5, "#120626");
      dg.addColorStop(0.82, "#070213");
      dg.addColorStop(1, "#030109");
    } else if (rwW) {
      dg.addColorStop(0, "#241a4d");
      dg.addColorStop(0.55, "#161036");
      dg.addColorStop(1, "#0a071f");
    } else if (shW) {
      dg.addColorStop(0, "#0e4a7d");
      dg.addColorStop(0.55, "#0a3560");
      dg.addColorStop(1, "#062544");
    } else if (bbW) {
      dg.addColorStop(0, "#6b4a22");
      dg.addColorStop(0.55, "#4a3013");
      dg.addColorStop(1, "#2b1a08");
    } else if (sqW) {
      dg.addColorStop(0, "#1e9fd8");
      dg.addColorStop(0.55, "#1577ab");
      dg.addColorStop(1, "#0b4d70");
    } else if (bzW) {
      dg.addColorStop(0, "#4a5232");
      dg.addColorStop(0.55, "#333a22");
      dg.addColorStop(1, "#1c2012");
    } else if (rpW) {
      dg.addColorStop(0, "#5a3a26");
      dg.addColorStop(0.55, "#3d2716");
      dg.addColorStop(1, "#201309");
    } else {
      dg.addColorStop(0, "#43287f");
      dg.addColorStop(0.55, "#1d0f45");
      dg.addColorStop(1, "#0b0620");
    }
    ctx.fillStyle = dg;
    ctx.beginPath();
    ctx.arc(0, 0, R, 0, TAU);
    ctx.fill();

    // rotating decoration
    ctx.save();
    ctx.rotate(this.rot);
    ctx.lineCap = "round";
    if (shW) {
      // ship's wheel — 8 wooden handles
      for (let i = 0; i < 8; i++) {
        const a = (i * TAU) / 8;
        ctx.save();
        ctx.rotate(a);
        const hg = ctx.createLinearGradient(0, 0, 86, 0);
        hg.addColorStop(0, "#8a5a2b");
        hg.addColorStop(0.5, "#b57e3e");
        hg.addColorStop(1, "#7c4f22");
        ctx.fillStyle = hg;
        ctx.strokeStyle = "rgba(40,20,8,0.8)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(30, -5, 62, 10, 5);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "#e8c37a";
        ctx.beginPath();
        ctx.arc(94, 0, 6, 0, TAU);
        ctx.fill();
        ctx.strokeStyle = "rgba(40,20,8,0.8)";
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
      }
      // rope ring
      ctx.strokeStyle = "#d9b36a";
      ctx.lineWidth = 5;
      ctx.setLineDash([7, 5]);
      ctx.beginPath();
      ctx.arc(0, 0, R * 0.68, 0, TAU);
      ctx.stroke();
      ctx.setLineDash([]);
      // wave arcs
      for (let i = 0; i < 8; i++) {
        const a0 = (i * TAU) / 8 + 0.12;
        const a1 = ((i + 1) * TAU) / 8 - 0.12;
        ctx.strokeStyle = i % 2 ? "rgba(140,220,255,0.85)" : "rgba(255,255,255,0.7)";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(0, 0, R * 0.52, a0, a1);
        ctx.stroke();
      }
      // bubbles pinned on the board
      for (let i = 0; i < 16; i++) {
        const a = (i * TAU) / 16 + 0.2;
        const rr = R * 0.84;
        const bx = Math.cos(a) * rr;
        const by = Math.sin(a) * rr;
        const br = 2 + (i % 3);
        ctx.strokeStyle = "rgba(190,235,255,0.85)";
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(bx, by, br, 0, TAU);
        ctx.stroke();
        ctx.fillStyle = "rgba(255,255,255,0.9)";
        ctx.beginPath();
        ctx.arc(bx - br * 0.3, by - br * 0.3, br * 0.3, 0, TAU);
        ctx.fill();
      }
      // wood plank seams on the rim
      ctx.strokeStyle = "rgba(50,28,10,0.7)";
      ctx.lineWidth = 2;
      for (let i = 0; i < 12; i++) {
        const a = (i * TAU) / 12;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * (R - 2), Math.sin(a) * (R - 2));
        ctx.lineTo(Math.cos(a) * (R + 6), Math.sin(a) * (R + 6));
        ctx.stroke();
      }
      // brass bolts
      for (let i = 0; i < 8; i++) {
        const a = (i * TAU) / 8 + TAU / 16;
        ctx.fillStyle = "#f0d080";
        ctx.strokeStyle = "rgba(60,35,10,0.9)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(Math.cos(a) * (R + 2), Math.sin(a) * (R + 2), 3.2, 0, TAU);
        ctx.fill();
        ctx.stroke();
      }
    } else if (bbW) {
      // woven bamboo target — radial slats + rattan rings
      for (let i = 0; i < 12; i++) {
        const a = (i * TAU) / 12;
        ctx.save();
        ctx.rotate(a);
        const wg = ctx.createLinearGradient(0, 0, 88, 0);
        wg.addColorStop(0, i % 2 ? "#a8763a" : "#c08d4a");
        wg.addColorStop(1, i % 2 ? "#7c5a26" : "#96682f");
        ctx.fillStyle = wg;
        ctx.strokeStyle = "rgba(45,28,10,0.7)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(28, -4.5, 64, 9, 4);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
      // rattan rings
      for (const [rr, lw] of [[66, 6], [46, 4]] as const) {
        ctx.strokeStyle = "#5da24a";
        ctx.lineWidth = lw;
        ctx.beginPath();
        ctx.arc(0, 0, rr, 0, TAU);
        ctx.stroke();
        ctx.strokeStyle = "rgba(220,255,200,0.5)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(0, 0, rr, 0, TAU);
        ctx.stroke();
      }
      // bamboo nodes on the rim
      for (let i = 0; i < 12; i++) {
        const a = (i * TAU) / 12 + TAU / 24;
        ctx.fillStyle = "#d8ef9a";
        ctx.strokeStyle = "rgba(40,70,20,0.8)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(Math.cos(a) * (R - 1), Math.sin(a) * (R - 1), 4, 0, TAU);
        ctx.fill();
        ctx.stroke();
      }
      // leaves tucked on the rim
      for (let i = 0; i < 6; i++) {
        const a = (i * TAU) / 6 + 0.3;
        ctx.save();
        ctx.rotate(a);
        ctx.translate(R + 2, 0);
        ctx.rotate(0.5);
        ctx.fillStyle = "rgba(90,180,70,0.9)";
        ctx.beginPath();
        ctx.ellipse(8, 0, 10, 3.4, 0, 0, TAU);
        ctx.fill();
        ctx.restore();
      }
    } else if (sqW) {
      // pool float target — striped life ring
      for (let i = 0; i < 12; i++) {
        const a0 = (i * TAU) / 12 + 0.04;
        const a1 = ((i + 1) * TAU) / 12 - 0.04;
        ctx.strokeStyle = i % 2 ? "#ffffff" : "#ff6a3d";
        ctx.lineWidth = 11;
        ctx.beginPath();
        ctx.arc(0, 0, R * 0.8, a0, a1);
        ctx.stroke();
      }
      ctx.strokeStyle = "rgba(255,255,255,0.6)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, R * 0.8 - 7, 0, TAU);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, R * 0.8 + 7, 0, TAU);
      ctx.stroke();
      // wave arcs
      for (let i = 0; i < 8; i++) {
        const a0 = (i * TAU) / 8 + 0.14;
        const a1 = ((i + 1) * TAU) / 8 - 0.14;
        ctx.strokeStyle = i % 2 ? "rgba(255,255,255,0.85)" : "rgba(160,230,255,0.85)";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(0, 0, R * 0.55, a0, a1);
        ctx.stroke();
      }
      // bubbles on the board
      for (let i = 0; i < 14; i++) {
        const a = (i * TAU) / 14 + 0.35;
        const rr = R * 0.93;
        const bx = Math.cos(a) * rr;
        const by = Math.sin(a) * rr;
        const br = 1.8 + (i % 3);
        ctx.strokeStyle = "rgba(230,250,255,0.9)";
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(bx, by, br, 0, TAU);
        ctx.stroke();
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.arc(bx - br * 0.3, by - br * 0.3, br * 0.3, 0, TAU);
        ctx.fill();
      }
    } else if (rwW) {
      // PRISM TARGET — flowing spectrum rings + orbiting crystal shards
      const flow = this.time * 55;
      for (const [rr, lw, off] of [[80, 10, 0], [64, 6, 60], [50, 3.5, 120]] as const) {
        for (let i = 0; i < 12; i++) {
          const a0 = (i * TAU) / 12 + 0.05;
          const a1 = ((i + 1) * TAU) / 12 - 0.05;
          ctx.strokeStyle = hsl(flow + off + i * 30, 100, 63, 0.95);
          ctx.lineWidth = lw;
          ctx.beginPath();
          ctx.arc(0, 0, rr, a0, a1);
          ctx.stroke();
        }
      }
      // white prism dividers
      ctx.strokeStyle = "rgba(255,255,255,0.55)";
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 6; i++) {
        const a = (i * TAU) / 6;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * 44, Math.sin(a) * 44);
        ctx.lineTo(Math.cos(a) * 88, Math.sin(a) * 88);
        ctx.stroke();
      }
      // orbiting crystal shards
      for (let q = 0; q < 4; q++) {
        const sa = this.time * (1.6 + q * 0.35) + (q * TAU) / 4;
        const rad = R * 0.92;
        const px = Math.cos(sa) * rad;
        const py = Math.sin(sa) * rad;
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(sa + Math.PI / 2);
        const shard = ctx.createLinearGradient(-4, 0, 5, 0);
        shard.addColorStop(0, "#fff");
        shard.addColorStop(0.5, hsl(flow + q * 90, 100, 70));
        shard.addColorStop(1, hsl(flow + q * 90 + 80, 100, 62));
        ctx.fillStyle = shard;
        ctx.beginPath();
        ctx.moveTo(-4.5, 0);
        ctx.lineTo(0, -3);
        ctx.lineTo(5, 0);
        ctx.lineTo(0, 3);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
      // twinkling spectrum dots
      for (let i = 0; i < 18; i++) {
        const a = (i * TAU) / 18;
        const tw2 = 0.4 + 0.6 * Math.abs(Math.sin(this.time * 4 + i * 0.9));
        ctx.fillStyle = hsl(flow + i * 20, 100, 72, tw2);
        ctx.beginPath();
        ctx.arc(Math.cos(a) * (R + 2), Math.sin(a) * (R + 2), 2, 0, TAU);
        ctx.fill();
      }
    } else if (bzW) {
      // ARMORED TARGET — riveted steel rings + hazard ticks + crosshair
      for (const [rr, lw, col] of [[80, 7, "#5a6234"], [64, 4, "#7a8452"], [50, 2.5, "#9aa856"]] as const) {
        ctx.strokeStyle = col;
        ctx.lineWidth = lw;
        ctx.beginPath();
        ctx.arc(0, 0, rr, 0, TAU);
        ctx.stroke();
        ctx.strokeStyle = "rgba(255,255,230,0.25)";
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(0, 0, rr, 0, TAU);
        ctx.stroke();
      }
      // rivets around the steel rings
      for (let i = 0; i < 16; i++) {
        const a = (i * TAU) / 16;
        ctx.fillStyle = "#c8c890";
        ctx.strokeStyle = "rgba(20,22,10,0.8)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(Math.cos(a) * 80, Math.sin(a) * 80, 2.4, 0, TAU);
        ctx.fill();
        ctx.stroke();
      }
      // hazard ticks on the rim (yellow/black)
      for (let i = 0; i < 24; i++) {
        const a0 = (i * TAU) / 24;
        const a1 = ((i + 0.5) * TAU) / 24;
        ctx.strokeStyle = i % 2 ? "#1c1c14" : "#e8c832";
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.arc(0, 0, R - 3, a0, a1);
        ctx.stroke();
      }
      // crosshair reticle
      ctx.strokeStyle = "rgba(240,240,210,0.55)";
      ctx.lineWidth = 1.6;
      for (const a of [0, Math.PI / 2, Math.PI, (Math.PI * 3) / 2]) {
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * 46, Math.sin(a) * 46);
        ctx.lineTo(Math.cos(a) * 60, Math.sin(a) * 60);
        ctx.stroke();
      }
      ctx.strokeStyle = "rgba(240,240,210,0.4)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, 30, 0, TAU);
      ctx.stroke();
      // camo splotches
      ctx.fillStyle = "rgba(60,70,32,0.55)";
      for (let i = 0; i < 6; i++) {
        const a = i * 1.7 + 0.4;
        ctx.beginPath();
        ctx.ellipse(Math.cos(a) * 70, Math.sin(a) * 70, 9, 5, a, 0, TAU);
        ctx.fill();
      }
    } else if (rpW) {
      // STEEL BUNKER TARGET — rust rings + red star + shell stripes
      for (const [rr, lw, col] of [[80, 8, "#8a4a26"], [64, 5, "#b5692f"], [50, 3, "#d8955a"]] as const) {
        ctx.strokeStyle = col;
        ctx.lineWidth = lw;
        ctx.beginPath();
        ctx.arc(0, 0, rr, 0, TAU);
        ctx.stroke();
        ctx.strokeStyle = "rgba(255,230,190,0.35)";
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(0, 0, rr, 0, TAU);
        ctx.stroke();
      }
      // shell-casing stripes radiating out
      for (let i = 0; i < 12; i++) {
        const a = (i * TAU) / 12;
        ctx.save();
        ctx.rotate(a);
        const sg = ctx.createLinearGradient(56, 0, 76, 0);
        sg.addColorStop(0, "#c8a03a");
        sg.addColorStop(1, "#7a5a18");
        ctx.fillStyle = sg;
        ctx.strokeStyle = "rgba(40,24,8,0.7)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(56, -2.5, 20, 5, 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
      // red star emblem ring
      for (let i = 0; i < 4; i++) {
        const a = (i * TAU) / 4 + TAU / 8;
        ctx.save();
        ctx.translate(Math.cos(a) * 70, Math.sin(a) * 70);
        ctx.rotate(a);
        starPath(ctx, 6);
        ctx.fillStyle = "rgba(208,48,40,0.85)";
        ctx.fill();
        ctx.strokeStyle = "rgba(60,12,8,0.8)";
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();
      }
      // armor bolts on the rim
      for (let i = 0; i < 12; i++) {
        const a = (i * TAU) / 12 + TAU / 24;
        ctx.fillStyle = "#d8b878";
        ctx.strokeStyle = "rgba(50,28,10,0.85)";
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.arc(Math.cos(a) * (R - 1), Math.sin(a) * (R - 1), 3.4, 0, TAU);
        ctx.fill();
        ctx.stroke();
      }
    } else {
      const N = 12;
      for (let i = 0; i < N; i++) {
        const a0 = (i * TAU) / N + 0.07;
        const a1 = ((i + 1) * TAU) / N - 0.07;
        const dh = bhW ? 225 + (i % 4) * 26 : hue + i * 30;
        ctx.strokeStyle = hsl(dh, 95, 62, 0.95);
        ctx.lineWidth = 9;
        ctx.beginPath();
        ctx.arc(0, 0, R * 0.8, a0, a1);
        ctx.stroke();
        ctx.strokeStyle = bhW ? hsl(dh + 40, 95, 72, 0.55) : hsl(hue + i * 30 + 180, 95, 70, 0.55);
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, R * 0.64, a0 + 0.05, a1 - 0.05);
        ctx.stroke();
      }
      for (let i = 0; i < 24; i++) {
        const a = (i * TAU) / 24;
        ctx.fillStyle = bhW ? hsl(225 + (i % 6) * 16, 100, 76, 0.9) : hsl(hue + i * 15, 100, 75, 0.9);
        ctx.beginPath();
        ctx.arc(Math.cos(a) * R * 0.92, Math.sin(a) * R * 0.92, 2.1, 0, TAU);
        ctx.fill();
      }
      // galaxy spiral arms swirling into the dark core (black-hole style)
      if (bhW) {
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
        // star dust on the disc
        for (let i = 0; i < 14; i++) {
          const a = i * 2.4 + 0.4;
          const rr = 50 + ((i * 37) % 34);
          const tw3 = 0.3 + 0.7 * Math.abs(Math.sin(this.time * 3 + i * 1.3));
          ctx.fillStyle = `rgba(255,255,255,${tw3 * 0.8})`;
          ctx.beginPath();
          ctx.arc(Math.cos(a) * rr, Math.sin(a) * rr, 1.1, 0, TAU);
          ctx.fill();
        }
      }
    }
    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    ctx.lineWidth = 1;
    for (let i = 0; i < 6; i++) {
      const a = (i * TAU) / 6;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * R * 0.34, Math.sin(a) * R * 0.34);
      ctx.lineTo(Math.cos(a) * R * 0.57, Math.sin(a) * R * 0.57);
      ctx.stroke();
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
    // photon rings orbiting the wheel in black-hole mode
    if (bhW) {
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
      ctx.strokeStyle = hsl(200, 100, 65, 0.25);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(0, 0, R + 21, 0, TAU);
      ctx.stroke();
    }
    // impact cracks where sharks / stones slammed the board
    if (shW || bbW) {
      for (const m of this.biteMarks) {
        const k = Math.max(0, m.life / m.max);
        ctx.save();
        ctx.rotate(m.a);
        ctx.strokeStyle = bbW ? `rgba(255,230,180,${0.9 * k})` : `rgba(255,255,255,${0.85 * k})`;
        ctx.lineWidth = 2;
        ctx.lineCap = "round";
        // splintered cracks fanning from the impact point
        ctx.beginPath();
        ctx.moveTo(R - 8, 0);
        ctx.lineTo(R - 22, -7);
        ctx.moveTo(R - 8, 0);
        ctx.lineTo(R - 24, 2);
        ctx.moveTo(R - 8, 0);
        ctx.lineTo(R - 20, 9);
        ctx.stroke();
        if (bbW) {
          // stone crater dent
          ctx.fillStyle = `rgba(20,12,5,${0.9 * k})`;
          ctx.beginPath();
          ctx.ellipse(R - 2, 0, 9, 7, 0, 0, TAU);
          ctx.fill();
          ctx.strokeStyle = `rgba(255,220,160,${0.7 * k})`;
          ctx.lineWidth = 1.5;
          ctx.stroke();
        } else {
          // teeth dents on the rim
          ctx.fillStyle = `rgba(30,15,5,${0.9 * k})`;
          for (const dy of [-9, -3, 3, 9]) {
            ctx.beginPath();
            ctx.moveTo(R + 5, dy - 2.5);
            ctx.lineTo(R - 3, dy);
            ctx.lineTo(R + 5, dy + 2.5);
            ctx.closePath();
            ctx.fill();
          }
        }
        ctx.restore();
      }
    }
    // wet ring where water blobs splatted (soaker mode)
    if (sqW) {
      for (const m of this.biteMarks) {
        const k = Math.max(0, m.life / m.max);
        ctx.save();
        ctx.rotate(m.a);
        ctx.strokeStyle = `rgba(190,240,255,${0.8 * k})`;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.ellipse(R - 2, 0, 11, 8, 0, 0, TAU);
        ctx.stroke();
        ctx.restore();
      }
    }
    // prismatic scorch star where lasers lodged (rainbow mode)
    if (rwW) {
      for (const m of this.biteMarks) {
        const k = Math.max(0, m.life / m.max);
        ctx.save();
        ctx.rotate(m.a);
        for (let i = 0; i < 6; i++) {
          const a = (i * TAU) / 6;
          ctx.strokeStyle = hsl(i * 60 + this.time * 60, 100, 68, 0.85 * k);
          ctx.lineWidth = 2;
          ctx.lineCap = "round";
          ctx.beginPath();
          ctx.moveTo(R - 4 + Math.cos(a) * 3, Math.sin(a) * 3);
          ctx.lineTo(R - 4 + Math.cos(a) * (10 + 6 * k), Math.sin(a) * (10 + 6 * k));
          ctx.stroke();
        }
        ctx.fillStyle = `rgba(255,255,255,${0.9 * k})`;
        ctx.beginPath();
        ctx.arc(R - 4, 0, 3.5, 0, TAU);
        ctx.fill();
        ctx.restore();
      }
    }
    // blast scorch + molten cracks where warheads hit (bazooka / rpg)
    if (bzW || rpW) {
      for (const m of this.biteMarks) {
        const k = Math.max(0, m.life / m.max);
        const heat = Math.min(1, k * 1.6);
        const flick = 0.75 + 0.25 * Math.sin(this.time * 31 + m.a * 9);
        ctx.save();
        ctx.rotate(m.a);
        // wide soot wash
        const soot = ctx.createRadialGradient(R - 2, 0, 2, R - 2, 0, 26);
        soot.addColorStop(0, `rgba(10,7,5,${0.85 * k})`);
        soot.addColorStop(0.55, `rgba(20,14,9,${0.55 * k})`);
        soot.addColorStop(1, "rgba(25,18,12,0)");
        ctx.fillStyle = soot;
        ctx.beginPath();
        ctx.arc(R - 2, 0, 26, 0, TAU);
        ctx.fill();
        // deep punched crater
        ctx.fillStyle = `rgba(6,4,3,${0.95 * k})`;
        ctx.beginPath();
        ctx.ellipse(R - 2, 0, 10.5, 8, 0, 0, TAU);
        ctx.fill();
        // molten rim — flickering, cools over time
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        const rim = ctx.createRadialGradient(R - 2, 0, 2, R - 2, 0, 13);
        rim.addColorStop(0, `rgba(255,250,235,${0.85 * heat * flick})`);
        rim.addColorStop(0.45, rpW ? `rgba(255,170,90,${0.7 * heat * flick})` : `rgba(255,200,115,${0.7 * heat * flick})`);
        rim.addColorStop(1, "rgba(255,110,30,0)");
        ctx.fillStyle = rim;
        ctx.beginPath();
        ctx.arc(R - 2, 0, 13, 0, TAU);
        ctx.fill();
        ctx.restore();
        ctx.strokeStyle = rpW ? `rgba(255,165,85,${0.8 * k})` : `rgba(255,205,120,${0.8 * k})`;
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.ellipse(R - 2, 0, 11, 8.6, 0, 0, TAU);
        ctx.stroke();
        // glowing stress cracks with hot roots fading outward
        ctx.lineCap = "round";
        const cracks: [number, number][] = [[-8, -26], [1, -29], [9, -25]];
        for (const [dy, dx2] of cracks) {
          const grad = ctx.createLinearGradient(R - 10, 0, R + dx2, dy);
          grad.addColorStop(0, `rgba(255,240,215,${0.85 * heat * flick})`);
          grad.addColorStop(0.5, `rgba(255,${rpW ? 150 : 180},80,${0.6 * heat})`);
          grad.addColorStop(1, `rgba(120,60,25,${0.25 * k})`);
          ctx.strokeStyle = grad;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(R - 10, 0);
          ctx.quadraticCurveTo(R - 19, dy * 0.6, R + dx2, dy);
          ctx.stroke();
        }
        // cooling ember dots around the crater
        for (let i = 0; i < 4; i++) {
          const a = m.a * 3 + i * 1.7 + this.time * 0.4;
          const ex = R - 2 + Math.cos(a) * (14 + (i % 3) * 3);
          const ey = Math.sin(a) * (11 + (i % 2) * 3);
          const tw = 0.4 + 0.6 * Math.abs(Math.sin(this.time * 6 + i * 2.1 + m.a * 5));
          ctx.fillStyle = `rgba(255,${140 + Math.round(tw * 60)},70,${tw * heat})`;
          ctx.beginPath();
          ctx.arc(ex, ey, 1.3, 0, TAU);
          ctx.fill();
        }
        ctx.restore();
      }
    }
    ctx.restore();

    // center hub (upright)
    const cg = ctx.createRadialGradient(-6, -8, 2, 0, 0, R * 0.42);
    if (bbW) {
      cg.addColorStop(0, "#334d1f");
      cg.addColorStop(1, "#182a0f");
    } else if (sqW) {
      cg.addColorStop(0, "#ff8c3d");
      cg.addColorStop(1, "#c85a12");
    } else if (shW) {
      cg.addColorStop(0, "#6b4218");
      cg.addColorStop(1, "#3a220c");
    } else if (rwW) {
      cg.addColorStop(0, "#3a2a6e");
      cg.addColorStop(1, "#120b30");
    } else if (bzW) {
      cg.addColorStop(0, "#565e30");
      cg.addColorStop(1, "#262b14");
    } else if (rpW) {
      cg.addColorStop(0, "#6e3a1e");
      cg.addColorStop(1, "#33190b");
    } else {
      cg.addColorStop(0, "#2d1763");
      cg.addColorStop(1, "#0a0520");
    }
    ctx.fillStyle = cg;
    ctx.beginPath();
    ctx.arc(0, 0, R * 0.42, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = bbW
      ? "#d8ef9a"
      : sqW
        ? "#e8fbff"
        : shW
          ? "#f0d080"
          : rwW
            ? hsl((this.time * 70) % 360, 100, 70, 0.95)
            : bzW
              ? "#e8c832"
              : rpW
                ? "#ff9d5a"
                : bhW
                  ? hsl(195, 100, 70, 0.95)
                  : hsl(hue + 40, 100, 70, 0.9);
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
      ctx.shadowColor = bbW
        ? "rgba(150,230,100,0.95)"
        : sqW
          ? "rgba(150,230,255,0.95)"
          : shW
            ? "rgba(120,220,255,0.95)"
            : rwW
              ? hsl((this.time * 90) % 360, 100, 65, 0.95)
              : bzW
                ? "rgba(232,200,50,0.95)"
                : rpW
                  ? "rgba(255,150,80,0.95)"
                  : bhW
                    ? "rgba(80,200,255,0.95)"
                    : hsl(hue + 40, 100, 60);
      ctx.shadowBlur = 14;
      ctx.font = `700 30px ${FONT}`;
      ctx.fillText(String(this.level), 0, 7);
    }
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  private drawDebris() {
    const ctx = this.ctx;
    for (const d of this.debris) {
      const a = Math.min(1, d.life / 0.6);
      ctx.save();
      ctx.globalAlpha = a;
      ctx.translate(d.x, d.y);
      ctx.rotate(d.rot);
      if (d.kind === "rocket") {
        if (this.weapon === "blackhole") {
          drawOrb(ctx, d.hue, 11, this.time, d.hue);
        } else if (this.weapon === "shark") {
          // tumbling shark, mouth agape
          ctx.translate(-36, 0);
          drawShark(ctx, d.hue, 0.7, this.time, d.hue * 0.3, 0);
        } else if (this.weapon === "bamboo") {
          drawStone(ctx, d.hue, 13, this.time, d.hue * 0.5, 0);
        } else if (this.weapon === "soaker") {
          ctx.rotate(-Math.PI / 2);
          drawDrop(ctx, d.hue, 11.5, this.time, d.hue * 0.5, 0);
        } else if (this.weapon === "rainbow") {
          ctx.translate(-32, 0);
          drawRainbowBolt(ctx, this.time, d.hue * 0.4, 0, 1);
        } else if (this.weapon === "bazooka") {
          ctx.translate(-29, 0);
          drawBazookaShell(ctx, d.hue, this.time, d.hue * 0.5, 0, 0.35);
        } else if (this.weapon === "rpg") {
          ctx.translate(-30, 0);
          drawRpgGrenade(ctx, d.hue, this.time, d.hue * 0.5, 0, 0.35);
        } else {
          ctx.translate(-PL / 2, 0);
          drawRocketShape(ctx, d.hue);
        }
      } else if (d.kind === "shard") {
        // glowing-hot twisted shrapnel
        const s = d.a0 || 4;
        const hot = d.hot ?? 0;
        ctx.fillStyle = hot > 0.4 ? `rgba(255,${120 + Math.round(hot * 80)},60,1)` : "#3a3a40";
        ctx.strokeStyle = "rgba(10,10,10,0.9)";
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(-s, -s * 0.6);
        ctx.lineTo(s * 0.2, -s * 1.1);
        ctx.lineTo(s, s * 0.3);
        ctx.lineTo(-s * 0.3, s);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        if (hot > 0.15) {
          ctx.save();
          ctx.globalCompositeOperation = "lighter";
          ctx.fillStyle = `rgba(255,170,70,${hot * 0.7})`;
          ctx.beginPath();
          ctx.arc(0, 0, s * 1.6, 0, TAU);
          ctx.fill();
          ctx.restore();
        }
      } else if (d.kind === "clod") {
        // burning dirt clod
        const s = d.a0 || 4;
        const hot = d.hot ?? 0;
        ctx.fillStyle = hot > 0.3 ? "#5a3418" : "#3a2412";
        ctx.strokeStyle = "rgba(15,8,4,0.9)";
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.ellipse(0, 0, s, s * 0.75, 0.3, 0, TAU);
        ctx.fill();
        ctx.stroke();
        if (hot > 0.2) {
          ctx.fillStyle = `rgba(255,130,40,${hot * 0.6})`;
          ctx.beginPath();
          ctx.arc(-s * 0.2, -s * 0.2, s * 0.45, 0, TAU);
          ctx.fill();
        }
      } else {
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, R, d.a0, d.a0 + TAU / 10);
        ctx.closePath();
        const g = ctx.createRadialGradient(0, 0, 0, 0, 0, R);
        if (this.weapon === "shark") {
          g.addColorStop(0, "#0e4a7d");
          g.addColorStop(1, "#062544");
        } else if (this.weapon === "bamboo") {
          g.addColorStop(0, "#6b4a22");
          g.addColorStop(1, "#3a2410");
        } else if (this.weapon === "soaker") {
          g.addColorStop(0, "#1a7ab5");
          g.addColorStop(1, "#0a4a75");
        } else if (this.weapon === "rainbow") {
          g.addColorStop(0, "#2a2058");
          g.addColorStop(1, "#100b2c");
        } else if (this.weapon === "bazooka") {
          g.addColorStop(0, "#4a5232");
          g.addColorStop(1, "#1c2012");
        } else if (this.weapon === "rpg") {
          g.addColorStop(0, "#5a3a26");
          g.addColorStop(1, "#201309");
        } else {
          g.addColorStop(0, "#3a2278");
          g.addColorStop(1, "#150a38");
        }
        ctx.fillStyle = g;
        ctx.fill();
        ctx.strokeStyle =
          this.weapon === "shark"
            ? "#c08a45"
            : this.weapon === "bamboo"
              ? "#8fd06a"
              : this.weapon === "soaker"
                ? "#ffd23e"
                : this.weapon === "rainbow"
                  ? hsl(d.hue, 100, 68)
                  : this.weapon === "bazooka"
                    ? "#9aa856"
                    : this.weapon === "rpg"
                      ? "#d88a4a"
                      : hsl(d.hue, 100, 65);
        ctx.lineWidth = 4;
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  private drawGun() {
    if (this.weapon === "blackhole") {
      this.drawBHGun();
      return;
    }
    if (this.weapon === "shark") {
      this.drawSharkGun();
      return;
    }
    if (this.weapon === "bamboo") {
      this.drawBambooGun();
      return;
    }
    if (this.weapon === "soaker") {
      this.drawSoakerGun();
      return;
    }
    if (this.weapon === "rainbow") {
      this.drawRainbowGun();
      return;
    }
    if (this.weapon === "bazooka") {
      this.drawBazookaGun();
      return;
    }
    if (this.weapon === "rpg") {
      this.drawRpgGun();
      return;
    }
    const ctx = this.ctx;
    const oy = this.recoil * 16;
    const nextHue = this.queue[this.shotIdx] ?? this.hueBase;
    const live = this.state === "playing" && this.ammo > 0;

    // loaded rocket peeking out of barrel
    if (live) {
      const e = 1 - Math.pow(1 - this.loadP, 3);
      const tipY = GUNY - 22 + (1 - e) * 46 + oy;
      ctx.save();
      ctx.translate(CX, tipY);
      ctx.rotate(Math.PI / 2);
      drawRocketShape(ctx, nextHue);
      ctx.restore();
    }

    ctx.save();
    ctx.translate(0, oy);

    // glow behind gun
    ctx.globalCompositeOperation = "lighter";
    const gg = ctx.createRadialGradient(CX, GUNY + 100, 10, CX, GUNY + 100, 120);
    gg.addColorStop(0, hsl(nextHue, 100, 55, 0.25));
    gg.addColorStop(1, hsl(nextHue, 100, 55, 0));
    ctx.fillStyle = gg;
    ctx.fillRect(CX - 130, GUNY - 30, 260, 260);
    ctx.globalCompositeOperation = "source-over";

    // body (base)
    const bodyG = ctx.createLinearGradient(CX - 50, 0, CX + 50, 0);
    bodyG.addColorStop(0, "#3a1d6e");
    bodyG.addColorStop(0.35, "#7a47c9");
    bodyG.addColorStop(0.65, "#5a30a3");
    bodyG.addColorStop(1, "#2a1456");
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
    ctx.strokeStyle = "#ffd75e";
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // side shells
    for (const sx of [-1, 1]) {
      const hx = CX + sx * 40;
      const hy = GUNY + 125;
      ctx.fillStyle = hsl(nextHue + sx * 70, 90, 55);
      ctx.beginPath();
      ctx.arc(hx, hy, 9, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.7)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.beginPath();
      ctx.arc(hx - 3, hy - 3, 2.4, 0, TAU);
      ctx.fill();
    }

    // barrel
    const bg = ctx.createLinearGradient(CX - 18, 0, CX + 18, 0);
    bg.addColorStop(0, "#2b2b4a");
    bg.addColorStop(0.3, "#9aa3d6");
    bg.addColorStop(0.5, "#e8ecff");
    bg.addColorStop(0.75, "#6c74a8");
    bg.addColorStop(1, "#23233f");
    ctx.fillStyle = bg;
    ctx.fillRect(CX - 17, GUNY, 34, 92);

    // rainbow bands (cycling)
    for (let i = 0; i < 4; i++) {
      const by = GUNY + 18 + i * 16;
      const bh = hsl(this.time * 90 + i * 55, 100, 60);
      ctx.fillStyle = bh;
      ctx.fillRect(CX - 17, by, 34, 6);
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.fillRect(CX - 17, by, 34, 2);
    }

    // muzzle ring
    const mg = ctx.createLinearGradient(CX - 25, 0, CX + 25, 0);
    mg.addColorStop(0, "#a8741a");
    mg.addColorStop(0.4, "#ffe58a");
    mg.addColorStop(1, "#9c6a14");
    ctx.fillStyle = mg;
    ctx.beginPath();
    ctx.roundRect(CX - 25, GUNY - 7, 50, 17, 5);
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.35)";
    ctx.lineWidth = 1;
    ctx.stroke();
    // muzzle glow when recoiling
    if (this.recoil > 0) {
      ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = hsl(nextHue, 100, 70, this.recoil * 0.8);
      ctx.beginPath();
      ctx.ellipse(CX, GUNY - 6, 26, 12, 0, 0, TAU);
      ctx.fill();
      ctx.globalCompositeOperation = "source-over";
    }

    // collar
    ctx.fillStyle = mg;
    ctx.beginPath();
    ctx.roundRect(CX - 28, GUNY + 66, 56, 12, 4);
    ctx.fill();

    // core gem
    const gy = GUNY + 130;
    ctx.globalCompositeOperation = "lighter";
    const cg = ctx.createRadialGradient(CX, gy, 0, CX, gy, 26);
    cg.addColorStop(0, hsl(nextHue, 100, 70, 0.9));
    cg.addColorStop(1, hsl(nextHue, 100, 60, 0));
    ctx.fillStyle = cg;
    ctx.fillRect(CX - 28, gy - 28, 56, 56);
    ctx.globalCompositeOperation = "source-over";
    ctx.save();
    ctx.translate(CX, gy);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = hsl(nextHue, 100, 62);
    ctx.fillRect(-9, -9, 18, 18);
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.strokeRect(-9, -9, 18, 18);
    ctx.restore();

    // little stars on the body
    ctx.fillStyle = "#ffd75e";
    for (const [sx, sy, r] of [
      [-22, 92, 4],
      [22, 92, 4],
      [0, 152, 3],
    ] as const) {
      ctx.save();
      ctx.translate(CX + sx, GUNY + sy);
      starPath(ctx, r);
      ctx.fill();
      ctx.restore();
    }

    ctx.restore();
  }

  private drawSharkGun() {
    const ctx = this.ctx;
    const oy = this.recoil * 18;
    const nextHue = this.queue[this.shotIdx] ?? 205;
    const live = this.state === "playing" && this.ammo > 0;
    const jawOpen = 0.22 + this.recoil * 0.78;

    // aqua glow behind gun
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const gg = ctx.createRadialGradient(CX, GUNY + 100, 10, CX, GUNY + 100, 130);
    gg.addColorStop(0, `rgba(40,160,220,${0.28 + this.recoil * 0.25})`);
    gg.addColorStop(1, "rgba(40,160,220,0)");
    ctx.fillStyle = gg;
    ctx.fillRect(CX - 140, GUNY - 50, 280, 280);
    ctx.restore();

    ctx.save();
    ctx.translate(0, oy);

    // ---- coral rock base ----
    const rockG = ctx.createLinearGradient(CX - 55, 0, CX + 55, 0);
    rockG.addColorStop(0, "#0d3a52");
    rockG.addColorStop(0.4, "#16607f");
    rockG.addColorStop(0.6, "#12506b");
    rockG.addColorStop(1, "#082a3d");
    ctx.fillStyle = rockG;
    ctx.beginPath();
    ctx.moveTo(CX - 24, GUNY + 70);
    ctx.lineTo(CX + 24, GUNY + 70);
    ctx.lineTo(CX + 52, GUNY + 100);
    ctx.quadraticCurveTo(CX + 58, GUNY + 150, CX + 44, GUNY + 165);
    ctx.lineTo(CX - 44, GUNY + 165);
    ctx.quadraticCurveTo(CX - 58, GUNY + 150, CX - 52, GUNY + 100);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#e8c37a";
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // seaweed swaying on the base
    for (const [wx, ww, wh, ph] of [[-46, 7, 42, 0], [-34, 5, 30, 2], [36, 6, 38, 4], [47, 5, 28, 1]] as const) {
      const sway = Math.sin(this.time * 2.2 + ph) * 6;
      ctx.strokeStyle = "#3fae6a";
      ctx.lineWidth = ww;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(CX + wx, GUNY + 162);
      ctx.quadraticCurveTo(CX + wx + sway, GUNY + 162 - wh * 0.6, CX + wx + sway * 1.6, GUNY + 162 - wh);
      ctx.stroke();
      ctx.strokeStyle = "rgba(180,255,210,0.5)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(CX + wx, GUNY + 162);
      ctx.quadraticCurveTo(CX + wx + sway, GUNY + 162 - wh * 0.6, CX + wx + sway * 1.6, GUNY + 162 - wh);
      ctx.stroke();
    }
    // pink coral branches
    ctx.strokeStyle = "#ff7eb0";
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    for (const sx of [-1, 1]) {
      const bx = CX + sx * 44;
      const by = GUNY + 158;
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.quadraticCurveTo(bx + sx * 6, by - 14, bx + sx * 2, by - 24);
      ctx.moveTo(bx + sx * 3, by - 12);
      ctx.quadraticCurveTo(bx + sx * 10, by - 16, bx + sx * 12, by - 22);
      ctx.stroke();
      ctx.fillStyle = "#ffb3cf";
      ctx.beginPath();
      ctx.arc(bx + sx * 2, by - 25, 3, 0, TAU);
      ctx.arc(bx + sx * 12, by - 23, 2.4, 0, TAU);
      ctx.fill();
    }
    // shells on the base
    for (const [sx, sy] of [[-20, 152], [22, 155]] as const) {
      ctx.fillStyle = "#f3d9a8";
      ctx.strokeStyle = "rgba(90,50,20,0.8)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(CX + sx, GUNY + sy, 6, Math.PI, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = "rgba(150,90,40,0.7)";
      ctx.lineWidth = 1;
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.moveTo(CX + sx, GUNY + sy);
        ctx.lineTo(CX + sx + i * 4, GUNY + sy - 5.4);
        ctx.stroke();
      }
    }

    // ---- shark-skin barrel ----
    const skinG = ctx.createLinearGradient(CX - 18, 0, CX + 18, 0);
    skinG.addColorStop(0, "#274f6b");
    skinG.addColorStop(0.35, "#5e92b5");
    skinG.addColorStop(0.55, "#7fb6d9");
    skinG.addColorStop(1, "#1d3a52");
    ctx.fillStyle = skinG;
    ctx.fillRect(CX - 17, GUNY + 12, 34, 80);
    // gill slits
    ctx.strokeStyle = "rgba(10,30,50,0.75)";
    ctx.lineWidth = 2.4;
    for (const sx of [-1, 1]) {
      for (let i = 0; i < 3; i++) {
        const gy = GUNY + 34 + i * 9;
        ctx.beginPath();
        ctx.moveTo(CX + sx * 8, gy);
        ctx.quadraticCurveTo(CX + sx * 14, gy + 2, CX + sx * 15, gy + 5);
        ctx.stroke();
      }
    }
    // water shine sweeping up the barrel
    for (let i = 0; i < 3; i++) {
      const cyc = (this.time * 60 + i * 30) % 80;
      const by = GUNY + 86 - cyc;
      ctx.fillStyle = "rgba(200,240,255,0.5)";
      ctx.fillRect(CX - 17, by, 34, 3);
    }
    // barnacles
    ctx.fillStyle = "#d8e4ea";
    for (const [bx, by2] of [[-15, 66], [14, 52], [-13, 44]] as const) {
      ctx.beginPath();
      ctx.arc(CX + bx, GUNY + by2, 2.2, 0, TAU);
      ctx.fill();
      ctx.fillStyle = "#8ba3ad";
      ctx.beginPath();
      ctx.arc(CX + bx, GUNY + by2, 1, 0, TAU);
      ctx.fill();
      ctx.fillStyle = "#d8e4ea";
    }

    // side fins
    for (const sx of [-1, 1]) {
      ctx.fillStyle = "#3d6f93";
      ctx.strokeStyle = "rgba(8,30,55,0.85)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(CX + sx * 16, GUNY + 60);
      ctx.quadraticCurveTo(CX + sx * 34, GUNY + 66, CX + sx * 40, GUNY + 82);
      ctx.quadraticCurveTo(CX + sx * 28, GUNY + 80, CX + sx * 16, GUNY + 76);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    // ---- GIANT JAWS (the muzzle) ----
    // mouth interior (dark, visible when open)
    ctx.fillStyle = "#5e0a1a";
    ctx.beginPath();
    ctx.ellipse(CX, GUNY + 8, 20, 5 + jawOpen * 13, 0, 0, TAU);
    ctx.fill();

    // upper jaw dome (behind the loaded shark)
    const domeG = ctx.createLinearGradient(0, GUNY - 22, 0, GUNY + 14);
    domeG.addColorStop(0, "#6fa2c4");
    domeG.addColorStop(0.6, "#487a9e");
    domeG.addColorStop(1, "#33597a");
    ctx.fillStyle = domeG;
    ctx.strokeStyle = "rgba(8,30,55,0.9)";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(CX - 27, GUNY + 14);
    ctx.quadraticCurveTo(CX - 24, GUNY - 12, CX, GUNY - 20);
    ctx.quadraticCurveTo(CX + 24, GUNY - 12, CX + 27, GUNY + 14);
    ctx.quadraticCurveTo(CX, GUNY + 4, CX - 27, GUNY + 14);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // dome shine
    ctx.strokeStyle = "rgba(255,255,255,0.45)";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(CX - 14, GUNY - 10);
    ctx.quadraticCurveTo(CX - 6, GUNY - 16, CX + 4, GUNY - 16.5);
    ctx.stroke();
    // furious eyes
    for (const sx of [-1, 1]) {
      const ex = CX + sx * 15;
      const ey = GUNY - 2;
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(ex, ey, 4.6, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = "rgba(8,30,55,0.9)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = jawOpen > 0.5 ? "#c00f2e" : "#0a1a30";
      ctx.beginPath();
      ctx.arc(ex - sx * 1, ey + 0.5, 2.4, 0, TAU);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(ex - sx * 1.6, ey - 0.2, 0.9, 0, TAU);
      ctx.fill();
      // angry brow
      ctx.strokeStyle = "rgba(8,30,55,0.9)";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(ex + sx * 5.5, ey - 7.5);
      ctx.lineTo(ex - sx * 4.5, ey - 4.5);
      ctx.stroke();
    }

    // loaded shark leaping out of the jaws
    if (live) {
      const e = 1 - Math.pow(1 - this.loadP, 3);
      const tipY = GUNY - 40 + (1 - e) * 52 + Math.sin(this.time * 3.4) * 2;
      if (e < 1) {
        ctx.strokeStyle = `rgba(150,225,255,${(1 - e) * 0.8})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(CX, tipY, 13 + (1 - e) * 24, 0, TAU);
        ctx.stroke();
      }
      ctx.save();
      ctx.translate(CX, tipY);
      ctx.rotate(Math.PI / 2);
      ctx.scale(0.62, 0.62);
      drawShark(ctx, nextHue, 0.3 + Math.sin(this.time * 2.4) * 0.12, this.time, 3.7, 0);
      ctx.restore();
    }

    // upper teeth (hanging down)
    ctx.fillStyle = "#fff";
    ctx.strokeStyle = "rgba(8,30,55,0.9)";
    ctx.lineWidth = 1.2;
    for (let i = 0; i < 5; i++) {
      const tx = CX - 17 + i * 8.5;
      const edgeY = GUNY + 8 - Math.abs(i - 2) * 1.6;
      ctx.beginPath();
      ctx.moveTo(tx - 3.4, edgeY);
      ctx.lineTo(tx + 3.4, edgeY);
      ctx.lineTo(tx, edgeY + 8.5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    // lower jaw (snaps open on fire)
    const hingeY = GUNY + 13;
    const tipJawY = hingeY + 6 + jawOpen * 24;
    const jawG = ctx.createLinearGradient(0, hingeY, 0, tipJawY + 8);
    jawG.addColorStop(0, "#e9f4fa");
    jawG.addColorStop(1, "#9fc3d8");
    ctx.fillStyle = jawG;
    ctx.strokeStyle = "rgba(8,30,55,0.9)";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(CX - 25, hingeY);
    ctx.quadraticCurveTo(CX - 12, tipJawY + 4, CX, tipJawY);
    ctx.quadraticCurveTo(CX + 12, tipJawY + 4, CX + 25, hingeY);
    ctx.quadraticCurveTo(CX, hingeY + 9, CX - 25, hingeY);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // lower teeth (pointing up)
    ctx.fillStyle = "#fff";
    ctx.lineWidth = 1.2;
    for (let i = 0; i < 4; i++) {
      const f = i / 3;
      const tx = CX - 15 + f * 30;
      const ty = hingeY + 5 + Math.sin(f * Math.PI) * jawOpen * 12;
      ctx.beginPath();
      ctx.moveTo(tx - 3, ty + 4);
      ctx.lineTo(tx + 3, ty + 4);
      ctx.lineTo(tx, ty - 4.5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    // recoil water flash in the mouth
    if (this.recoil > 0.15) {
      ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = `rgba(160,225,255,${this.recoil * 0.75})`;
      ctx.beginPath();
      ctx.ellipse(CX, GUNY + 8, 24, 8 + jawOpen * 12, 0, 0, TAU);
      ctx.fill();
      ctx.globalCompositeOperation = "source-over";
    }

    // rope collar
    ctx.strokeStyle = "#d9b36a";
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(CX - 27, GUNY + 68);
    ctx.lineTo(CX + 27, GUNY + 68);
    ctx.stroke();
    ctx.strokeStyle = "rgba(90,55,20,0.8)";
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 9; i++) {
      const rx = CX - 24 + i * 6;
      ctx.beginPath();
      ctx.moveTo(rx, GUNY + 65);
      ctx.lineTo(rx + 3, GUNY + 71);
      ctx.stroke();
    }

    // pearl in a clam (the core)
    const py = GUNY + 122;
    ctx.globalCompositeOperation = "lighter";
    const pg = ctx.createRadialGradient(CX, py, 0, CX, py, 30);
    pg.addColorStop(0, "rgba(190,240,255,0.65)");
    pg.addColorStop(1, "rgba(190,240,255,0)");
    ctx.fillStyle = pg;
    ctx.fillRect(CX - 32, py - 32, 64, 64);
    ctx.globalCompositeOperation = "source-over";
    // clam bottom
    ctx.fillStyle = "#c9a06a";
    ctx.strokeStyle = "rgba(70,40,15,0.9)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(CX, py + 7, 17, 8, 0, 0, Math.PI);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // pearl
    const pearlG = ctx.createRadialGradient(CX - 3, py - 4, 1, CX, py, 10);
    pearlG.addColorStop(0, "#ffffff");
    pearlG.addColorStop(0.6, "#d8f0ff");
    pearlG.addColorStop(1, "#8fc4e8");
    ctx.fillStyle = pearlG;
    ctx.beginPath();
    ctx.arc(CX, py - 1 + Math.sin(this.time * 2.5) * 1.5, 8, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.beginPath();
    ctx.arc(CX - 2.5, py - 4 + Math.sin(this.time * 2.5) * 1.5, 2.2, 0, TAU);
    ctx.fill();
    // clam top (slightly open, animated)
    const clamOpen = 0.5 + Math.sin(this.time * 1.8) * 0.12;
    ctx.fillStyle = "#a8814f";
    ctx.beginPath();
    ctx.ellipse(CX, py - 9 - clamOpen * 4, 15, 6, 0, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }

  private drawBambooGun() {
    const ctx = this.ctx;
    const oy = this.recoil * 20;
    const nextHue = this.queue[this.shotIdx] ?? 38;
    const live = this.state === "playing" && this.ammo > 0;

    // warm glow behind the cannon
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const gg = ctx.createRadialGradient(CX, GUNY + 90, 10, CX, GUNY + 90, 135);
    gg.addColorStop(0, `rgba(255,150,60,${0.22 + this.recoil * 0.3})`);
    gg.addColorStop(1, "rgba(255,150,60,0)");
    ctx.fillStyle = gg;
    ctx.fillRect(CX - 140, GUNY - 60, 280, 280);
    ctx.restore();

    ctx.save();
    ctx.translate(0, oy);

    // ---- wooden carriage (A-frame stand) ----
    ctx.fillStyle = "#5a3a1c";
    ctx.strokeStyle = "rgba(30,16,6,0.9)";
    ctx.lineWidth = 2.5;
    for (const sx of [-1, 1]) {
      // leg
      ctx.save();
      ctx.translate(CX + sx * 30, GUNY + 118);
      ctx.rotate(sx * 0.42);
      ctx.beginPath();
      ctx.roundRect(-8, -10, 16, 62, 6);
      ctx.fill();
      ctx.stroke();
      // wood grain
      ctx.strokeStyle = "rgba(40,22,8,0.6)";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(-2, -4);
      ctx.lineTo(-2, 44);
      ctx.moveTo(3, -4);
      ctx.lineTo(3, 44);
      ctx.stroke();
      ctx.strokeStyle = "rgba(30,16,6,0.9)";
      ctx.lineWidth = 2.5;
      ctx.restore();
      // rattan lashing where leg meets the tube
      ctx.fillStyle = "#a0713a";
      ctx.beginPath();
      ctx.roundRect(CX + sx * 22 - 7, GUNY + 78, 14, 16, 4);
      ctx.fill();
      ctx.strokeStyle = "rgba(60,35,12,0.9)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.strokeStyle = "rgba(70,42,14,0.8)";
      ctx.lineWidth = 1.2;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(CX + sx * 22 - 7, GUNY + 82 + i * 5);
        ctx.lineTo(CX + sx * 22 + 7, GUNY + 82 + i * 5);
        ctx.stroke();
      }
    }
    // base beam
    const beamG = ctx.createLinearGradient(0, GUNY + 148, 0, GUNY + 166);
    beamG.addColorStop(0, "#7a5228");
    beamG.addColorStop(1, "#4a2f14");
    ctx.fillStyle = beamG;
    ctx.strokeStyle = "rgba(30,16,6,0.9)";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(CX - 62, GUNY + 148, 124, 17, 7);
    ctx.fill();
    ctx.stroke();
    // brass studs on the beam
    for (const bx of [-48, -24, 0, 24, 48]) {
      ctx.fillStyle = "#f0d080";
      ctx.beginPath();
      ctx.arc(CX + bx, GUNY + 156.5, 2.8, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = "rgba(60,35,10,0.9)";
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // ---- giant bamboo tube ----
    const tubeG = ctx.createLinearGradient(CX - 22, 0, CX + 22, 0);
    tubeG.addColorStop(0, "#3f7a2c");
    tubeG.addColorStop(0.3, "#7cc24f");
    tubeG.addColorStop(0.5, "#a8e07e");
    tubeG.addColorStop(0.72, "#5da24a");
    tubeG.addColorStop(1, "#2c5a1e");
    ctx.fillStyle = tubeG;
    ctx.fillRect(CX - 21, GUNY + 6, 42, 88);
    // vertical fibre streaks
    ctx.strokeStyle = "rgba(30,70,18,0.45)";
    ctx.lineWidth = 1.4;
    for (const fx of [-13, -5, 5, 13]) {
      ctx.beginPath();
      ctx.moveTo(CX + fx, GUNY + 10);
      ctx.quadraticCurveTo(CX + fx + 1.5, GUNY + 50, CX + fx, GUNY + 90);
      ctx.stroke();
    }
    // shine
    ctx.fillStyle = "rgba(255,255,255,0.28)";
    ctx.fillRect(CX - 9, GUNY + 10, 5, 80);
    // leaf sprig painted on the tube
    ctx.fillStyle = "#2f8f3a";
    ctx.strokeStyle = "rgba(15,60,20,0.8)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(CX - 11, GUNY + 44, 6, 2.6, -0.5, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(CX + 11, GUNY + 62, 6, 2.6, 0.5, 0, TAU);
    ctx.fill();
    ctx.stroke();

    // node rings (bamboo joints) with rattan binding
    for (const ny of [GUNY + 24, GUNY + 56, GUNY + 88]) {
      ctx.fillStyle = "#d9e8a8";
      ctx.fillRect(CX - 21, ny - 2, 42, 4);
      ctx.fillStyle = "#8a5f2e";
      ctx.fillRect(CX - 24, ny - 7, 48, 11);
      ctx.strokeStyle = "rgba(50,28,8,0.9)";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(CX - 24, ny - 7, 48, 11);
      // rope X stitches
      ctx.strokeStyle = "rgba(60,36,12,0.85)";
      ctx.lineWidth = 1.3;
      for (let i = 0; i < 6; i++) {
        const rx = CX - 20 + i * 8;
        ctx.beginPath();
        ctx.moveTo(rx, ny - 7);
        ctx.lineTo(rx + 4, ny + 4);
        ctx.moveTo(rx + 4, ny - 7);
        ctx.lineTo(rx, ny + 4);
        ctx.stroke();
      }
    }

    // fuse hole on the side with a live spark
    ctx.fillStyle = "#1a0e04";
    ctx.beginPath();
    ctx.arc(CX + 21, GUNY + 70, 4, 0, TAU);
    ctx.fill();
    const spark = 0.6 + 0.4 * Math.sin(this.time * 23);
    ctx.fillStyle = `rgba(255,${140 + Math.round(80 * spark)},40,${0.5 + 0.4 * spark})`;
    ctx.beginPath();
    ctx.arc(CX + 21, GUNY + 70, 2.2 * spark + 0.8, 0, TAU);
    ctx.fill();
    if (Math.random() < 0.3) {
      this.spawn(CX + 24, GUNY + 68, rnd(0.5, 1.8), rnd(-1.5, -0.3), {
        life: rnd(0.3, 0.6),
        size: 1.3,
        h: rnd(25, 45),
        s: 100,
        l: 65,
        g: -0.01,
        d: 0.95,
      });
    }

    // ---- muzzle: open bamboo mouth ----
    // lip ring
    ctx.fillStyle = "#c9e79a";
    ctx.strokeStyle = "rgba(35,70,20,0.95)";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(CX, GUNY + 2, 25, 11, 0, 0, TAU);
    ctx.fill();
    ctx.stroke();
    // dark hollow
    ctx.fillStyle = "#120a04";
    ctx.beginPath();
    ctx.ellipse(CX, GUNY + 2, 18, 7.5, 0, 0, TAU);
    ctx.fill();
    // ember glow inside after firing
    if (this.recoil > 0.05) {
      ctx.globalCompositeOperation = "lighter";
      const eg = ctx.createRadialGradient(CX, GUNY + 2, 0, CX, GUNY + 2, 22);
      eg.addColorStop(0, `rgba(255,180,70,${this.recoil * 0.9})`);
      eg.addColorStop(1, "rgba(255,120,30,0)");
      ctx.fillStyle = eg;
      ctx.beginPath();
      ctx.ellipse(CX, GUNY + 2, 24, 12, 0, 0, TAU);
      ctx.fill();
      ctx.globalCompositeOperation = "source-over";
    }

    // loaded stone hovering over the mouth
    if (live) {
      const e = 1 - Math.pow(1 - this.loadP, 3);
      const tipY = GUNY - 30 + (1 - e) * 40 + Math.sin(this.time * 3) * 2;
      if (e < 1) {
        ctx.strokeStyle = `rgba(255,200,120,${(1 - e) * 0.8})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(CX, tipY, 15 + (1 - e) * 22, 0, TAU);
        ctx.stroke();
      }
      ctx.save();
      ctx.translate(CX, tipY);
      drawStone(ctx, nextHue, 13, this.time, 2.2, 0);
      ctx.restore();
    }

    // carved tribal band on the base beam
    ctx.fillStyle = "#f0d080";
    for (let i = 0; i < 7; i++) {
      const tx = CX - 45 + i * 15;
      ctx.save();
      ctx.translate(tx, GUNY + 156.5);
      ctx.rotate(Math.PI / 4);
      ctx.fillRect(-2.2, -2.2, 4.4, 4.4);
      ctx.restore();
    }

    ctx.restore();
  }

  private drawSoakerGun() {
    const ctx = this.ctx;
    const oy = this.recoil * 14;
    const nextHue = this.queue[this.shotIdx] ?? 200;
    const live = this.state === "playing" && this.ammo > 0;

    // bubbly glow behind the gun
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const gg = ctx.createRadialGradient(CX, GUNY + 100, 10, CX, GUNY + 100, 130);
    gg.addColorStop(0, `rgba(70,200,255,${0.24 + this.recoil * 0.25})`);
    gg.addColorStop(1, "rgba(70,200,255,0)");
    ctx.fillStyle = gg;
    ctx.fillRect(CX - 140, GUNY - 50, 280, 280);
    ctx.restore();

    ctx.save();
    ctx.translate(0, oy);

    // ---- chunky toy body ----
    const bodyG = ctx.createLinearGradient(CX - 50, 0, CX + 50, 0);
    bodyG.addColorStop(0, "#e06a00");
    bodyG.addColorStop(0.4, "#ff9d2e");
    bodyG.addColorStop(0.6, "#ffc44d");
    bodyG.addColorStop(1, "#b34d00");
    ctx.fillStyle = bodyG;
    ctx.strokeStyle = "#7a3200";
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
    // body shine
    ctx.fillStyle = "rgba(255,255,255,0.3)";
    ctx.beginPath();
    ctx.roundRect(CX - 38, GUNY + 104, 10, 44, 5);
    ctx.fill();

    // wave decal sticker
    ctx.save();
    ctx.beginPath();
    ctx.rect(CX - 34, GUNY + 128, 68, 22);
    ctx.clip();
    ctx.fillStyle = "#2ea8dd";
    ctx.beginPath();
    ctx.moveTo(CX - 34, GUNY + 150);
    for (let x = -34; x <= 34; x += 4) {
      ctx.lineTo(CX + x, GUNY + 140 + Math.sin((x + this.time * 30) * 0.25) * 3);
    }
    ctx.lineTo(CX + 34, GUNY + 150);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.beginPath();
    ctx.moveTo(CX - 34, GUNY + 150);
    for (let x = -34; x <= 34; x += 4) {
      ctx.lineTo(CX + x, GUNY + 145 + Math.sin((x + this.time * 30) * 0.25 + 1) * 2.5);
    }
    ctx.lineTo(CX + 34, GUNY + 150);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = "#0d5a80";
    ctx.lineWidth = 2;
    ctx.strokeRect(CX - 34, GUNY + 128, 68, 22);
    // lightning bolt logo
    ctx.fillStyle = "#ffe93e";
    ctx.strokeStyle = "#7a5200";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(CX + 2, GUNY + 78);
    ctx.lineTo(CX - 8, GUNY + 96);
    ctx.lineTo(CX - 1, GUNY + 96);
    ctx.lineTo(CX - 4, GUNY + 106);
    ctx.lineTo(CX + 7, GUNY + 88);
    ctx.lineTo(CX, GUNY + 88);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // ---- translucent water tank ----
    const tankX = CX - 32;
    const tankY = GUNY + 26;
    const tankW = 64;
    const tankH = 34;
    ctx.fillStyle = "rgba(190,235,255,0.35)";
    ctx.strokeStyle = "#0d5a80";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(tankX, tankY, tankW, tankH, 9);
    ctx.fill();
    ctx.stroke();
    // water inside (level bobs)
    const wl = tankY + 9 + Math.sin(this.time * 2.6) * 1.6;
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(tankX + 2, tankY + 2, tankW - 4, tankH - 4, 7);
    ctx.clip();
    const waterG = ctx.createLinearGradient(0, wl, 0, tankY + tankH);
    waterG.addColorStop(0, "rgba(90,210,255,0.9)");
    waterG.addColorStop(1, "rgba(20,140,220,0.95)");
    ctx.fillStyle = waterG;
    ctx.beginPath();
    ctx.moveTo(tankX, tankY + tankH);
    ctx.lineTo(tankX, wl);
    for (let x = 0; x <= tankW; x += 4) {
      ctx.lineTo(tankX + x, wl + Math.sin((x + this.time * 40) * 0.2) * 1.8);
    }
    ctx.lineTo(tankX + tankW, tankY + tankH);
    ctx.closePath();
    ctx.fill();
    // bubbles in the tank
    for (let i = 0; i < 3; i++) {
      const bph = (this.time * 0.5 + i * 0.37) % 1;
      const bx2 = tankX + 12 + i * 20 + Math.sin(this.time * 3 + i * 4) * 3;
      const by2 = tankY + tankH - 5 - bph * (tankH - 14);
      ctx.strokeStyle = "rgba(255,255,255,0.8)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(bx2, by2, 1.6 + i * 0.5, 0, TAU);
      ctx.stroke();
    }
    ctx.restore();
    // tank shine
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.beginPath();
    ctx.roundRect(tankX + 6, tankY + 5, 6, tankH - 10, 3);
    ctx.fill();
    // tank cap
    ctx.fillStyle = "#ffd23e";
    ctx.strokeStyle = "#7a5200";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(CX + 22, tankY - 9, 18, 12, 3);
    ctx.fill();
    ctx.stroke();

    // ---- pump handle (slides when firing) ----
    const pumpY = GUNY + 8 + this.recoil * 10;
    ctx.fillStyle = "#2ea8dd";
    ctx.strokeStyle = "#0d5a80";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(CX - 34, pumpY, 20, 16, 6);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.fillRect(CX - 30, pumpY + 3, 12, 3);
    // pump rod
    ctx.fillStyle = "#d7ecf7";
    ctx.fillRect(CX - 16, pumpY + 5, 16, 6);

    // ---- nozzle cone ----
    const nozG = ctx.createLinearGradient(CX - 14, 0, CX + 14, 0);
    nozG.addColorStop(0, "#c25e00");
    nozG.addColorStop(0.5, "#ffd23e");
    nozG.addColorStop(1, "#c25e00");
    ctx.fillStyle = nozG;
    ctx.strokeStyle = "#7a3200";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(CX - 13, GUNY + 26);
    ctx.lineTo(CX - 7, GUNY - 6);
    ctx.lineTo(CX + 7, GUNY - 6);
    ctx.lineTo(CX + 13, GUNY + 26);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // nozzle tip ring
    ctx.fillStyle = "#ff5a5a";
    ctx.beginPath();
    ctx.roundRect(CX - 10, GUNY - 14, 20, 10, 4);
    ctx.fill();
    ctx.strokeStyle = "#7a1010";
    ctx.lineWidth = 2;
    ctx.stroke();
    // water glint at the tip
    ctx.fillStyle = "rgba(150,225,255,0.9)";
    ctx.beginPath();
    ctx.ellipse(CX, GUNY - 9, 5.5, 3, 0, 0, TAU);
    ctx.fill();
    // recoil spray flash
    if (this.recoil > 0.15) {
      ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = `rgba(150,220,255,${this.recoil * 0.7})`;
      ctx.beginPath();
      ctx.ellipse(CX, GUNY - 12, 20, 12, 0, 0, TAU);
      ctx.fill();
      ctx.globalCompositeOperation = "source-over";
    }

    // loaded water blob jiggling over the nozzle
    if (live) {
      const e = 1 - Math.pow(1 - this.loadP, 3);
      const tipY = GUNY - 42 + (1 - e) * 40 + Math.sin(this.time * 3.4) * 2;
      if (e < 1) {
        ctx.strokeStyle = `rgba(150,225,255,${(1 - e) * 0.8})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(CX, tipY, 14 + (1 - e) * 22, 0, TAU);
        ctx.stroke();
      }
      ctx.save();
      ctx.translate(CX, tipY);
      drawDrop(ctx, nextHue, 11.5, this.time, 5.1, 0);
      ctx.restore();
    }

    // trigger guard + trigger
    ctx.strokeStyle = "#7a3200";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(CX - 40, GUNY + 118, 12, -0.4, Math.PI + 0.4);
    ctx.stroke();
    ctx.fillStyle = "#ffe93e";
    ctx.strokeStyle = "#7a5200";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(CX - 44, GUNY + 110 + this.recoil * 3, 8, 14, 3);
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }

  private drawRainbowGun() {
    const ctx = this.ctx;
    const oy = this.recoil * 14;
    const flow = this.time * 70;
    const live = this.state === "playing" && this.ammo > 0;

    // prismatic aura behind the cannon
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < 3; i++) {
      const hue = (flow + i * 120) % 360;
      const gg = ctx.createRadialGradient(CX, GUNY + 100, 10, CX, GUNY + 100, 130 - i * 22);
      gg.addColorStop(0, hsl(hue, 100, 60, 0.16 + this.recoil * 0.12));
      gg.addColorStop(1, hsl(hue, 100, 60, 0));
      ctx.fillStyle = gg;
      ctx.fillRect(CX - 140, GUNY - 50, 280, 280);
    }
    ctx.restore();

    // loaded laser bolt hovering over the muzzle
    if (live) {
      const e = 1 - Math.pow(1 - this.loadP, 3);
      const tipY = GUNY - 46 + (1 - e) * 44 + Math.sin(this.time * 3.6) * 2;
      if (e < 1) {
        ctx.strokeStyle = hsl((flow + 180) % 360, 100, 70, (1 - e) * 0.8);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(CX, tipY, 13 + (1 - e) * 24, 0, TAU);
        ctx.stroke();
      }
      ctx.save();
      ctx.translate(CX, tipY + oy * 0.4);
      ctx.rotate(Math.PI / 2);
      drawRainbowBolt(ctx, this.time, 7.7, 0, 0.62);
      ctx.restore();
    }

    ctx.save();
    ctx.translate(0, oy);

    // ---- chrome pedestal ----
    const pedG = ctx.createLinearGradient(CX - 50, 0, CX + 50, 0);
    pedG.addColorStop(0, "#3a3f66");
    pedG.addColorStop(0.35, "#aab4e8");
    pedG.addColorStop(0.55, "#eef1ff");
    pedG.addColorStop(1, "#2c3050");
    ctx.fillStyle = pedG;
    ctx.strokeStyle = "#10122b";
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
    // spectrum trim line around the pedestal
    ctx.lineWidth = 3;
    for (let i = 0; i < 8; i++) {
      ctx.strokeStyle = hsl(flow + i * 45, 100, 62, 0.9);
      ctx.beginPath();
      ctx.arc(CX, GUNY + 128, 40 - i * 0.4, Math.PI * (0.15 + i * 0.0875), Math.PI * (0.15 + (i + 1) * 0.0875));
      ctx.stroke();
    }

    // ---- giant crystal prism core ----
    const py = GUNY + 122;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const pg = ctx.createRadialGradient(CX, py, 0, CX, py, 44);
    pg.addColorStop(0, hsl(flow % 360, 100, 65, 0.5));
    pg.addColorStop(1, hsl(flow % 360, 100, 60, 0));
    ctx.fillStyle = pg;
    ctx.fillRect(CX - 46, py - 46, 92, 92);
    ctx.restore();
    // prism triangle (slowly breathing)
    const breathe = 1 + Math.sin(this.time * 2.4) * 0.04;
    ctx.save();
    ctx.translate(CX, py);
    ctx.scale(breathe, breathe);
    const prism = ctx.createLinearGradient(-16, 0, 16, 0);
    prism.addColorStop(0, hsl(flow % 360, 90, 65));
    prism.addColorStop(0.5, "#ffffff");
    prism.addColorStop(1, hsl((flow + 160) % 360, 90, 62));
    ctx.fillStyle = prism;
    ctx.strokeStyle = "rgba(255,255,255,0.95)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -19);
    ctx.lineTo(16, 10);
    ctx.lineTo(-16, 10);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // inner facet light
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.beginPath();
    ctx.moveTo(0, -12);
    ctx.lineTo(7, 6);
    ctx.lineTo(-7, 6);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // ---- glass laser barrel with flowing spectrum ----
    // glass tube
    ctx.fillStyle = "rgba(200,225,255,0.22)";
    ctx.strokeStyle = "rgba(255,255,255,0.65)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(CX - 16, GUNY + 2, 32, 66, 8);
    ctx.fill();
    ctx.stroke();
    // flowing spectrum inside
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(CX - 14, GUNY + 4, 28, 62, 6);
    ctx.clip();
    for (let i = 0; i < 5; i++) {
      const cyc = (this.time * 90 + i * 19) % 78;
      const by = GUNY + 62 - cyc;
      ctx.fillStyle = hsl((this.time * 130 + i * 72) % 360, 100, 60, 0.95);
      ctx.fillRect(CX - 14, by, 28, 7);
      ctx.fillStyle = "rgba(255,255,255,0.6)";
      ctx.fillRect(CX - 14, by, 28, 2);
    }
    ctx.restore();
    // tube shine
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.fillRect(CX - 12, GUNY + 8, 4, 54);

    // focusing coil rings around the barrel
    for (let i = 0; i < 3; i++) {
      const ry = GUNY + 16 + i * 20;
      const hue = (flow + i * 120) % 360;
      ctx.strokeStyle = hsl(hue, 100, 62, 0.95);
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.ellipse(CX, ry, 22, 7, 0, 0, TAU);
      ctx.stroke();
      ctx.strokeStyle = "rgba(255,255,255,0.8)";
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.ellipse(CX, ry, 18, 5.4, 0, this.time * 3 + i * 2, this.time * 3 + i * 2 + Math.PI * 0.9);
      ctx.stroke();
    }

    // side prism pods
    for (const sx of [-1, 1]) {
      const hx = CX + sx * 40;
      const hy = GUNY + 84;
      const hue = (flow + (sx > 0 ? 130 : 250)) % 360;
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      const pod = ctx.createRadialGradient(hx, hy, 0, hx, hy, 20);
      pod.addColorStop(0, hsl(hue, 100, 62, 0.55));
      pod.addColorStop(1, hsl(hue, 100, 60, 0));
      ctx.fillStyle = pod;
      ctx.fillRect(hx - 20, hy - 20, 40, 40);
      ctx.restore();
      // little diamond crystal
      ctx.save();
      ctx.translate(hx, hy + Math.sin(this.time * 3 + sx) * 1.5);
      ctx.rotate(Math.PI / 4);
      const dg2 = ctx.createLinearGradient(-7, -7, 7, 7);
      dg2.addColorStop(0, "#fff");
      dg2.addColorStop(0.5, hsl(hue, 100, 68));
      dg2.addColorStop(1, hsl((hue + 60) % 360, 100, 60));
      ctx.fillStyle = dg2;
      ctx.fillRect(-7, -7, 14, 14);
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(-7, -7, 14, 14);
      ctx.restore();
    }

    // ---- muzzle: prism emitter ring ----
    ctx.save();
    ctx.translate(CX, GUNY - 2);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const mg = ctx.createRadialGradient(0, 0, 0, 0, 0, 42);
    mg.addColorStop(0, hsl(flow % 360, 100, 65, 0.6));
    mg.addColorStop(1, hsl(flow % 360, 100, 60, 0));
    ctx.fillStyle = mg;
    ctx.fillRect(-42, -30, 84, 60);
    ctx.restore();
    // spectrum emitter ring (segmented)
    for (let i = 0; i < 12; i++) {
      ctx.strokeStyle = hsl((this.time * 90 + i * 30) % 360, 100, 64, 0.95);
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.ellipse(0, 0, 24, 10, 0, (i * TAU) / 12, ((i + 0.85) * TAU) / 12);
      ctx.stroke();
    }
    ctx.strokeStyle = "rgba(255,255,255,0.9)";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.ellipse(0, 0, 19, 7.6, 0, 0, TAU);
    ctx.stroke();
    // bright aperture
    const ap = ctx.createRadialGradient(0, 0, 0, 0, 0, 17);
    ap.addColorStop(0, "#ffffff");
    ap.addColorStop(0.6, hsl((flow + 40) % 360, 100, 72));
    ap.addColorStop(1, "rgba(20,10,40,0.9)");
    ctx.fillStyle = ap;
    ctx.beginPath();
    ctx.ellipse(0, 0, 17, 6.6, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
    // recoil flash
    if (this.recoil > 0.12) {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = hsl((flow + 60) % 360, 100, 72, this.recoil * 0.7);
      ctx.beginPath();
      ctx.ellipse(CX, GUNY - 6, 30, 14, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = `rgba(255,255,255,${this.recoil * 0.7})`;
      ctx.beginPath();
      ctx.ellipse(CX, GUNY - 6, 16, 8, 0, 0, TAU);
      ctx.fill();
      ctx.restore();
    }

    ctx.restore();
  }

  private drawBazookaGun() {
    const ctx = this.ctx;
    const oy = this.recoil * 22;
    const nextHue = this.queue[this.shotIdx] ?? 45;
    const live = this.state === "playing" && this.ammo > 0;

    // hot battlefield glow behind the launcher
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const gg = ctx.createRadialGradient(CX, GUNY + 90, 10, CX, GUNY + 90, 140);
    gg.addColorStop(0, `rgba(255,140,50,${0.2 + this.recoil * 0.35})`);
    gg.addColorStop(1, "rgba(255,140,50,0)");
    ctx.fillStyle = gg;
    ctx.fillRect(CX - 140, GUNY - 60, 280, 280);
    ctx.restore();

    ctx.save();
    ctx.translate(0, oy);

    // ground shadow + blast scorch that deepens as you fire
    ctx.fillStyle = "rgba(0,0,0,0.42)";
    ctx.beginPath();
    ctx.ellipse(CX, GUNY + 168, 74, 10, 0, 0, TAU);
    ctx.fill();
    const scorchA = 0.25 + this.cannonPulse * 0.45;
    const scorch = ctx.createRadialGradient(CX, GUNY + 160, 4, CX, GUNY + 160, 66);
    scorch.addColorStop(0, `rgba(12,8,5,${scorchA})`);
    scorch.addColorStop(0.6, `rgba(20,14,8,${scorchA * 0.6})`);
    scorch.addColorStop(1, "rgba(25,18,10,0)");
    ctx.fillStyle = scorch;
    ctx.beginPath();
    ctx.ellipse(CX, GUNY + 160, 66, 12, 0, 0, TAU);
    ctx.fill();
    // ammo crate with spare shells (left of the mount)
    ctx.save();
    ctx.translate(CX - 88, GUNY + 148);
    ctx.fillStyle = "#6b4a22";
    ctx.strokeStyle = "rgba(28,16,6,0.9)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(-22, -22, 44, 30, 3);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = "rgba(40,24,8,0.7)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-22, -12);
    ctx.lineTo(22, -12);
    ctx.moveTo(-22, -2);
    ctx.lineTo(22, -2);
    ctx.stroke();
    ctx.fillStyle = "rgba(240,235,210,0.8)";
    ctx.font = "700 7px Rubik, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("60MM", 0, 3);
    for (let i = 0; i < 3; i++) {
      const sx = -12 + i * 12;
      ctx.fillStyle = "#4c5a26";
      ctx.strokeStyle = "rgba(15,17,8,0.9)";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.roundRect(sx - 4, -34, 8, 14, 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#b5651d";
      ctx.beginPath();
      ctx.moveTo(sx - 4, -34);
      ctx.lineTo(sx, -39);
      ctx.lineTo(sx + 4, -34);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    // ---- tripod mount ----
    ctx.fillStyle = "#3a3a40";
    ctx.strokeStyle = "rgba(12,12,14,0.9)";
    ctx.lineWidth = 2.5;
    for (const sx of [-1, 1]) {
      ctx.save();
      ctx.translate(CX + sx * 26, GUNY + 122);
      ctx.rotate(sx * 0.5);
      ctx.beginPath();
      ctx.roundRect(-7, -8, 14, 60, 6);
      ctx.fill();
      ctx.stroke();
      // leg ridges
      ctx.strokeStyle = "rgba(15,15,18,0.7)";
      ctx.lineWidth = 1.2;
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.moveTo(-7, 4 + i * 11);
        ctx.lineTo(7, 4 + i * 11);
        ctx.stroke();
      }
      ctx.strokeStyle = "rgba(12,12,14,0.9)";
      ctx.lineWidth = 2.5;
      ctx.restore();
      // pivot joint
      ctx.fillStyle = "#5a5a64";
      ctx.beginPath();
      ctx.arc(CX + sx * 20, GUNY + 84, 6, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = "rgba(12,12,14,0.9)";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = "#c8c8d2";
      ctx.beginPath();
      ctx.arc(CX + sx * 20, GUNY + 84, 2, 0, TAU);
      ctx.fill();
    }
    // base plate
    const plateG = ctx.createLinearGradient(0, GUNY + 150, 0, GUNY + 166);
    plateG.addColorStop(0, "#565656");
    plateG.addColorStop(1, "#2c2c30");
    ctx.fillStyle = plateG;
    ctx.strokeStyle = "rgba(12,12,14,0.9)";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(CX - 58, GUNY + 150, 116, 15, 6);
    ctx.fill();
    ctx.stroke();
    // hazard chevrons on the plate
    for (let i = 0; i < 7; i++) {
      ctx.fillStyle = i % 2 ? "#1c1c14" : "#e8c832";
      ctx.save();
      ctx.beginPath();
      ctx.rect(CX - 52 + i * 15, GUNY + 152, 15, 11);
      ctx.clip();
      ctx.translate(CX - 52 + i * 15 + 7.5, GUNY + 157.5);
      ctx.rotate(0.5);
      ctx.fillRect(-9, -3, 18, 6);
      ctx.restore();
    }

    // ---- fat olive launch tube ----
    const tubeG = ctx.createLinearGradient(CX - 24, 0, CX + 24, 0);
    tubeG.addColorStop(0, "#33391e");
    tubeG.addColorStop(0.3, "#6b7a38");
    tubeG.addColorStop(0.5, "#9aa856");
    tubeG.addColorStop(0.72, "#4c5a26");
    tubeG.addColorStop(1, "#232817");
    ctx.fillStyle = tubeG;
    ctx.strokeStyle = "rgba(15,17,8,0.95)";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(CX - 22, GUNY + 4, 44, 92, 6);
    ctx.fill();
    ctx.stroke();
    // tube shine
    ctx.fillStyle = "rgba(255,255,225,0.28)";
    ctx.fillRect(CX - 12, GUNY + 10, 6, 80);
    // cooling vents
    ctx.fillStyle = "rgba(12,14,6,0.85)";
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.roundRect(CX - 16, GUNY + 30 + i * 12, 9, 5, 2);
      ctx.fill();
      ctx.beginPath();
      ctx.roundRect(CX + 7, GUNY + 30 + i * 12, 9, 5, 2);
      ctx.fill();
    }
    // white stencil star + text
    ctx.save();
    ctx.translate(CX, GUNY + 78);
    starPath(ctx, 9);
    ctx.fillStyle = "rgba(240,240,215,0.92)";
    ctx.fill();
    ctx.strokeStyle = "rgba(20,22,10,0.8)";
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.restore();
    ctx.fillStyle = "rgba(240,240,215,0.75)";
    ctx.font = "700 7px Rubik, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("M-9A1", CX, GUNY + 56);
    // red warning band
    ctx.fillStyle = "#c0272d";
    ctx.fillRect(CX - 22, GUNY + 40, 44, 6);
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.fillRect(CX - 22, GUNY + 40, 44, 2);

    // iron sights
    ctx.fillStyle = "#22242a";
    ctx.strokeStyle = "rgba(10,10,12,0.9)";
    ctx.lineWidth = 1.6;
    // rear sight ring
    ctx.beginPath();
    ctx.arc(CX - 26, GUNY + 34, 5, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#9be86a";
    ctx.beginPath();
    ctx.arc(CX - 26, GUNY + 34, 1.6, 0, TAU);
    ctx.fill();
    // front post
    ctx.fillStyle = "#22242a";
    ctx.fillRect(CX + 21, GUNY + 18, 4, 14);
    ctx.fillStyle = "#ff5a4a";
    ctx.beginPath();
    ctx.arc(CX + 23, GUNY + 16, 2.2, 0, TAU);
    ctx.fill();

    // pistol grip + trigger
    ctx.fillStyle = "#4a2f18";
    ctx.strokeStyle = "rgba(20,12,4,0.9)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(CX + 24, GUNY + 66, 12, 30, 5);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = "rgba(30,18,6,0.7)";
    ctx.lineWidth = 1.2;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(CX + 25, GUNY + 74 + i * 7);
      ctx.lineTo(CX + 35, GUNY + 74 + i * 7);
      ctx.stroke();
    }
    ctx.strokeStyle = "#1c1c20";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(CX + 18, GUNY + 62, 9, -0.3, Math.PI + 0.3);
    ctx.stroke();
    ctx.fillStyle = "#c8c8d2";
    ctx.fillRect(CX + 15, GUNY + 56 + this.recoil * 3, 4, 10);

    // ---- muzzle: flared blast bell ----
    ctx.fillStyle = "#3d4525";
    ctx.strokeStyle = "rgba(15,17,8,0.95)";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(CX - 22, GUNY + 8);
    ctx.lineTo(CX - 28, GUNY - 6);
    ctx.lineTo(CX + 28, GUNY - 6);
    ctx.lineTo(CX + 22, GUNY + 8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // muzzle rim
    ctx.fillStyle = "#20240f";
    ctx.beginPath();
    ctx.ellipse(CX, GUNY - 6, 28, 10, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = "#9aa856";
    ctx.lineWidth = 2.5;
    ctx.stroke();
    // dark bore with carbon scoring
    ctx.fillStyle = "#0a0a08";
    ctx.beginPath();
    ctx.ellipse(CX, GUNY - 6, 20, 6.8, 0, 0, TAU);
    ctx.fill();
    // carbon scoring ring around the muzzle (wears with heat)
    ctx.strokeStyle = `rgba(12,10,8,${0.5 + this.recoil * 0.4})`;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.ellipse(CX, GUNY - 6, 24, 8.6, 0, 0, TAU);
    ctx.stroke();
    // layered heat: white core -> orange -> dull red rim, cooling with recoil
    if (this.recoil > 0.04) {
      const heat = this.recoil;
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      const eg = ctx.createRadialGradient(CX, GUNY - 6, 0, CX, GUNY - 6, 26);
      eg.addColorStop(0, `rgba(255,245,220,${heat * 0.95})`);
      eg.addColorStop(0.4, `rgba(255,190,90,${heat * 0.85})`);
      eg.addColorStop(0.75, `rgba(255,120,35,${heat * 0.5})`);
      eg.addColorStop(1, "rgba(200,60,15,0)");
      ctx.fillStyle = eg;
      ctx.beginPath();
      ctx.ellipse(CX, GUNY - 6, 24, 10, 0, 0, TAU);
      ctx.fill();
      ctx.restore();
      // glowing muzzle rim while hot
      ctx.strokeStyle = `rgba(255,${140 + Math.round(heat * 60)},70,${heat * 0.9})`;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.ellipse(CX, GUNY - 6, 21, 7.4, 0, 0, TAU);
      ctx.stroke();
    }
    // heat smoke wisps + sparks curling off the muzzle
    if (Math.random() < 0.3 + this.recoil * 0.5) {
      if (Math.random() < 0.55) {
        this.spawnSmoke(CX + rnd(-12, 12), GUNY - 12, rnd(-8, 8), rnd(-30, -12), rnd(7, 12), rnd(0.9, 1.6), 0.55);
      } else {
        this.spawn(CX + rnd(-14, 14), GUNY - 10, rnd(-0.6, 0.6), rnd(-1.8, -0.5), {
          life: rnd(0.3, 0.6),
          size: 1.4,
          h: rnd(25, 50),
          s: 100,
          l: 65,
          g: -0.01,
          d: 0.95,
        });
      }
    }

    // loaded shell hovering over the muzzle
    if (live) {
      const e = 1 - Math.pow(1 - this.loadP, 3);
      const tipY = GUNY - 44 + (1 - e) * 46 + Math.sin(this.time * 3.1) * 2;
      if (e < 1) {
        ctx.strokeStyle = `rgba(255,200,110,${(1 - e) * 0.8})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(CX, tipY, 15 + (1 - e) * 22, 0, TAU);
        ctx.stroke();
      }
      ctx.save();
      ctx.translate(CX, tipY);
      ctx.rotate(Math.PI / 2);
      ctx.scale(0.72, 0.72);
      drawBazookaShell(ctx, nextHue, this.time, 3.3, 0, 0);
      ctx.restore();
    }

    ctx.restore();
  }

  private drawRpgGun() {
    const ctx = this.ctx;
    const oy = this.recoil * 20;
    const nextHue = this.queue[this.shotIdx] ?? 30;
    const live = this.state === "playing" && this.ammo > 0;

    // dusty combat glow behind the launcher
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const gg = ctx.createRadialGradient(CX, GUNY + 90, 10, CX, GUNY + 90, 135);
    gg.addColorStop(0, `rgba(255,160,70,${0.2 + this.recoil * 0.32})`);
    gg.addColorStop(1, "rgba(255,160,70,0)");
    ctx.fillStyle = gg;
    ctx.fillRect(CX - 140, GUNY - 60, 280, 280);
    ctx.restore();

    ctx.save();
    ctx.translate(0, oy);

    // ground shadow + dust scorch
    ctx.fillStyle = "rgba(0,0,0,0.4)";
    ctx.beginPath();
    ctx.ellipse(CX, GUNY + 164, 66, 9, 0, 0, TAU);
    ctx.fill();
    const scorchA = 0.2 + this.cannonPulse * 0.4;
    const scorch = ctx.createRadialGradient(CX, GUNY + 156, 4, CX, GUNY + 156, 60);
    scorch.addColorStop(0, `rgba(15,10,6,${scorchA})`);
    scorch.addColorStop(1, "rgba(25,18,10,0)");
    ctx.fillStyle = scorch;
    ctx.beginPath();
    ctx.ellipse(CX, GUNY + 156, 60, 11, 0, 0, TAU);
    ctx.fill();
    // grenade crate with fat warheads (right of the mount)
    ctx.save();
    ctx.translate(CX + 86, GUNY + 148);
    ctx.fillStyle = "#5a4020";
    ctx.strokeStyle = "rgba(26,15,6,0.9)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(-20, -20, 40, 28, 3);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = "rgba(38,22,8,0.7)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-20, -10);
    ctx.lineTo(20, -10);
    ctx.moveTo(-20, 0);
    ctx.lineTo(20, 0);
    ctx.stroke();
    ctx.fillStyle = "rgba(240,235,210,0.8)";
    ctx.font = "700 6px Rubik, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("PG-7V", 0, 5);
    for (let i = 0; i < 2; i++) {
      const sx = -9 + i * 18;
      ctx.fillStyle = "#b5793a";
      ctx.strokeStyle = "rgba(25,14,6,0.9)";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(sx, -32);
      ctx.quadraticCurveTo(sx + 5, -28, sx + 5, -24);
      ctx.lineTo(sx + 5, -20);
      ctx.lineTo(sx - 5, -20);
      ctx.lineTo(sx - 5, -24);
      ctx.quadraticCurveTo(sx - 5, -28, sx, -32);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#4a7a2c";
      ctx.fillRect(sx - 2, -20, 4, 4);
      ctx.fillStyle = "#b5793a";
    }
    ctx.restore();

    // ---- bipod stand ----
    ctx.fillStyle = "#46463e";
    ctx.strokeStyle = "rgba(14,12,8,0.9)";
    ctx.lineWidth = 2.5;
    for (const sx of [-1, 1]) {
      ctx.save();
      ctx.translate(CX + sx * 24, GUNY + 124);
      ctx.rotate(sx * 0.55);
      ctx.beginPath();
      ctx.roundRect(-6, -6, 12, 54, 5);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
      // rubber foot
      ctx.fillStyle = "#1c1c1c";
      ctx.beginPath();
      ctx.ellipse(CX + sx * 40, GUNY + 158, 9, 4, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = "#46463e";
    }
    // saddle clamp holding the tube
    ctx.fillStyle = "#5a5a52";
    ctx.strokeStyle = "rgba(14,12,8,0.9)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(CX - 20, GUNY + 96, 40, 14, 5);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#c8c8b8";
    for (const sx of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(CX + sx * 14, GUNY + 103, 2.4, 0, TAU);
      ctx.fill();
    }

    // ---- long slim launch tube ----
    const tubeG = ctx.createLinearGradient(CX - 15, 0, CX + 15, 0);
    tubeG.addColorStop(0, "#2a2a26");
    tubeG.addColorStop(0.35, "#6a6a60");
    tubeG.addColorStop(0.55, "#8f8f82");
    tubeG.addColorStop(1, "#1e1e1a");
    ctx.fillStyle = tubeG;
    ctx.strokeStyle = "rgba(12,10,6,0.95)";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(CX - 14, GUNY + 2, 28, 96, 5);
    ctx.fill();
    ctx.stroke();
    // tube shine
    ctx.fillStyle = "rgba(255,255,245,0.3)";
    ctx.fillRect(CX - 9, GUNY + 8, 4, 84);
    // heat discoloration creeping down from the muzzle after firing
    if (this.recoil > 0.06) {
      const heatH = 34 * this.recoil;
      const heatG = ctx.createLinearGradient(0, GUNY + 2, 0, GUNY + 2 + heatH);
      heatG.addColorStop(0, `rgba(120,140,255,${0.5 * this.recoil})`);
      heatG.addColorStop(0.5, `rgba(200,130,255,${0.35 * this.recoil})`);
      heatG.addColorStop(1, "rgba(200,130,255,0)");
      ctx.fillStyle = heatG;
      ctx.fillRect(CX - 14, GUNY + 2, 28, heatH);
    }
    // stencil markings
    ctx.fillStyle = "rgba(240,235,210,0.8)";
    ctx.font = "700 7px Rubik, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("RPG-7V", CX, GUNY + 66);
    ctx.fillText("▲ 40mm", CX, GUNY + 76);

    // ---- wooden heat guard (signature RPG look) ----
    const woodG = ctx.createLinearGradient(CX - 19, 0, CX + 19, 0);
    woodG.addColorStop(0, "#6e3f1c");
    woodG.addColorStop(0.5, "#a86a32");
    woodG.addColorStop(1, "#5a3316");
    ctx.fillStyle = woodG;
    ctx.strokeStyle = "rgba(30,16,6,0.9)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(CX - 18, GUNY + 30, 36, 34, 7);
    ctx.fill();
    ctx.stroke();
    // wood grain
    ctx.strokeStyle = "rgba(50,26,8,0.6)";
    ctx.lineWidth = 1.2;
    for (const gx of [-10, -3, 4, 11]) {
      ctx.beginPath();
      ctx.moveTo(CX + gx, GUNY + 34);
      ctx.quadraticCurveTo(CX + gx + 1.5, GUNY + 47, CX + gx, GUNY + 60);
      ctx.stroke();
    }
    // metal bands on the wood
    ctx.fillStyle = "#3a3a36";
    for (const by of [GUNY + 32, GUNY + 58]) {
      ctx.fillRect(CX - 18, by, 36, 4);
      ctx.fillStyle = "rgba(255,255,255,0.25)";
      ctx.fillRect(CX - 18, by, 36, 1.4);
      ctx.fillStyle = "#3a3a36";
    }

    // optical drum sight
    ctx.fillStyle = "#2c2c28";
    ctx.strokeStyle = "rgba(10,10,8,0.9)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(CX - 24, GUNY + 22, 9, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#7ab648";
    ctx.beginPath();
    ctx.arc(CX - 24, GUNY + 22, 4.5, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = "rgba(10,20,8,0.9)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(CX - 24, GUNY + 18);
    ctx.lineTo(CX - 24, GUNY + 26);
    ctx.moveTo(CX - 28, GUNY + 22);
    ctx.lineTo(CX - 20, GUNY + 22);
    ctx.stroke();
    ctx.fillStyle = "#3a3a36";
    ctx.fillRect(CX - 18, GUNY + 20, 6, 4);

    // pistol grip + trigger
    ctx.fillStyle = "#5a3a20";
    ctx.strokeStyle = "rgba(24,14,4,0.9)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(CX + 16, GUNY + 68, 11, 28, 5);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = "#1a1a18";
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(CX + 10, GUNY + 64, 8, -0.3, Math.PI + 0.3);
    ctx.stroke();
    ctx.fillStyle = "#d8d8d0";
    ctx.fillRect(CX + 7, GUNY + 58 + this.recoil * 2.5, 4, 9);

    // ---- flared blast nozzle (bell) ----
    ctx.fillStyle = "#4a4a44";
    ctx.strokeStyle = "rgba(12,10,6,0.95)";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(CX - 14, GUNY + 6);
    ctx.lineTo(CX - 21, GUNY - 8);
    ctx.lineTo(CX + 21, GUNY - 8);
    ctx.lineTo(CX + 14, GUNY + 6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#24241f";
    ctx.beginPath();
    ctx.ellipse(CX, GUNY - 8, 21, 8.5, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = "#a8a89c";
    ctx.lineWidth = 2.2;
    ctx.stroke();
    ctx.fillStyle = "#080806";
    ctx.beginPath();
    ctx.ellipse(CX, GUNY - 8, 14, 5.4, 0, 0, TAU);
    ctx.fill();
    // carbon scoring around the bell
    ctx.strokeStyle = `rgba(10,9,7,${0.45 + this.recoil * 0.35})`;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(CX, GUNY - 8, 18, 7, 0, 0, TAU);
    ctx.stroke();
    // layered booster heat: blue-white throat -> orange bell
    if (this.recoil > 0.04) {
      const heat = this.recoil;
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      const eg = ctx.createRadialGradient(CX, GUNY - 8, 0, CX, GUNY - 8, 24);
      eg.addColorStop(0, `rgba(235,250,255,${heat * 0.9})`);
      eg.addColorStop(0.35, `rgba(190,235,255,${heat * 0.7})`);
      eg.addColorStop(0.7, `rgba(255,180,80,${heat * 0.6})`);
      eg.addColorStop(1, "rgba(255,120,30,0)");
      ctx.fillStyle = eg;
      ctx.beginPath();
      ctx.ellipse(CX, GUNY - 8, 21, 9, 0, 0, TAU);
      ctx.fill();
      ctx.restore();
      ctx.strokeStyle = `rgba(200,235,255,${heat * 0.75})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(CX, GUNY - 8, 15, 6, 0, 0, TAU);
      ctx.stroke();
    }
    // booster smoke wisps curling off the bell
    if (Math.random() < 0.3 + this.recoil * 0.5) {
      if (Math.random() < 0.55) {
        this.spawnSmoke(CX + rnd(-10, 10), GUNY - 12, rnd(-8, 8), rnd(-32, -12), rnd(7, 12), rnd(0.9, 1.6), 0.55);
      } else {
        this.spawn(CX + rnd(-10, 10), GUNY - 12, rnd(-0.6, 0.6), rnd(-1.8, -0.5), {
          life: rnd(0.3, 0.55),
          size: 1.3,
          h: rnd(30, 50),
          s: 100,
          l: 68,
          g: -0.01,
          d: 0.95,
        });
      }
    }

    // loaded grenade with fat warhead hovering over the muzzle
    if (live) {
      const e = 1 - Math.pow(1 - this.loadP, 3);
      const tipY = GUNY - 46 + (1 - e) * 46 + Math.sin(this.time * 3.3) * 2;
      if (e < 1) {
        ctx.strokeStyle = `rgba(255,190,110,${(1 - e) * 0.8})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(CX, tipY, 15 + (1 - e) * 22, 0, TAU);
        ctx.stroke();
      }
      ctx.save();
      ctx.translate(CX, tipY);
      ctx.rotate(Math.PI / 2);
      ctx.scale(0.72, 0.72);
      drawRpgGrenade(ctx, nextHue, this.time, 4.4, 0, 0);
      ctx.restore();
    }

    ctx.restore();
  }

  private drawBHGun() {
    const ctx = this.ctx;
    const oy = this.recoil * 16;
    const nextHue = this.queue[this.shotIdx] ?? 265;
    const live = this.state === "playing" && this.ammo > 0;

    // charging singularity floating above the muzzle
    if (live) {
      const e = 1 - Math.pow(1 - this.loadP, 3);
      const tipY = GUNY - 38 + (1 - e) * 42 + oy + Math.sin(this.time * 3.2) * 2.5;
      if (e < 1) {
        // converging collapse rings while charging
        for (let i = 0; i < 2; i++) {
          const rr = 16 + (1 - e) * (30 + i * 16);
          ctx.strokeStyle = hsl(nextHue + i * 30, 100, 70, (1 - e) * (0.7 - i * 0.25));
          ctx.lineWidth = 2.5 - i * 0.7;
          ctx.beginPath();
          ctx.arc(CX, tipY, rr, this.time * (3 + i * 2), this.time * (3 + i * 2) + Math.PI * 1.5);
          ctx.stroke();
        }
      } else {
        // fully charged: thin photon halo breathing
        ctx.strokeStyle = `rgba(255,255,255,${0.25 + 0.15 * Math.sin(this.time * 5)})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(CX, tipY, 17 + Math.sin(this.time * 5) * 1.5, 0, TAU);
        ctx.stroke();
      }
      ctx.save();
      ctx.translate(CX, tipY);
      drawOrb(ctx, nextHue, 12, this.time, 4.2);
      ctx.restore();
      // infalling sparks spiralling into the charged orb
      if (Math.random() < 0.6) {
        const a = rnd(0, TAU);
        const rr = rnd(22, 38);
        this.spawn(
          CX + Math.cos(a) * rr,
          tipY + Math.sin(a) * rr,
          -Math.cos(a) * 3 - Math.sin(a) * 2,
          -Math.sin(a) * 3 + Math.cos(a) * 2,
          {
            life: rnd(0.25, 0.45),
            size: 1.6,
            h: nextHue + rnd(-20, 30),
            l: 76,
            g: 0,
            d: 0.93,
            ax: CX,
            ay: tipY,
            pull: 5,
          }
        );
      }
    }

    ctx.save();
    ctx.translate(0, oy);

    // cosmic glow behind gun
    ctx.globalCompositeOperation = "lighter";
    const gg = ctx.createRadialGradient(CX, GUNY + 100, 10, CX, GUNY + 100, 130);
    gg.addColorStop(0, hsl(nextHue, 100, 55, 0.3));
    gg.addColorStop(1, hsl(nextHue, 100, 55, 0));
    ctx.fillStyle = gg;
    ctx.fillRect(CX - 140, GUNY - 40, 280, 270);
    ctx.globalCompositeOperation = "source-over";

    // obsidian base
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

    // containment coils
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
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(hx, hy, 2, 0, TAU);
      ctx.fill();
    }

    // dark barrel
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

    // twin helical energy streams spiralling up into the muzzle
    for (let i = 0; i < 6; i++) {
      const cyc = (this.time * 64 + i * 17) % 92;
      const by = GUNY + 86 - cyc;
      const sway = Math.sin(this.time * 6 + i * 1.1) * 6;
      ctx.fillStyle = hsl(nextHue + i * 12, 100, 62);
      ctx.beginPath();
      ctx.arc(CX - 7 + sway * 0.5, by, 3.4, 0, TAU);
      ctx.arc(CX + 7 - sway * 0.5, by, 3.4, 0, TAU);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.65)";
      ctx.beginPath();
      ctx.arc(CX - 7 + sway * 0.5, by, 1.3, 0, TAU);
      ctx.arc(CX + 7 - sway * 0.5, by, 1.3, 0, TAU);
      ctx.fill();
    }

    // muzzle: grand event-horizon gate with double photon rings
    ctx.save();
    ctx.translate(CX, GUNY - 2);
    ctx.globalCompositeOperation = "lighter";
    const mg = ctx.createRadialGradient(0, 0, 0, 0, 0, 48);
    mg.addColorStop(0, hsl(nextHue, 100, 62, 0.6));
    mg.addColorStop(0.6, hsl(nextHue + 30, 100, 55, 0.25));
    mg.addColorStop(1, hsl(nextHue, 100, 60, 0));
    ctx.fillStyle = mg;
    ctx.fillRect(-48, -34, 96, 68);
    ctx.globalCompositeOperation = "source-over";
    // outer accretion lip
    ctx.strokeStyle = hsl(nextHue - 15, 90, 42);
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.ellipse(0, 0, 27, 11.5, 0, 0, TAU);
    ctx.stroke();
    // main horizon ring
    ctx.strokeStyle = hsl(nextHue, 100, 62);
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.ellipse(0, 0, 24, 10, 0, 0, TAU);
    ctx.stroke();
    // abyss
    ctx.fillStyle = "#000";
    ctx.beginPath();
    ctx.ellipse(0, 0, 19, 7.2, 0, 0, TAU);
    ctx.fill();
    // twin photon arcs racing opposite ways
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
    // doppler hot spot
    const hot = this.time * 4;
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(Math.cos(hot) * 24, Math.sin(hot) * 10, 2.2, 0, TAU);
    ctx.fill();
    ctx.restore();

    // recoil flash
    if (this.recoil > 0) {
      ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = hsl(nextHue + 40, 100, 75, this.recoil * 0.85);
      ctx.beginPath();
      ctx.ellipse(CX, GUNY - 4, 30, 14, 0, 0, TAU);
      ctx.fill();
      ctx.globalCompositeOperation = "source-over";
    }

    // collar
    ctx.fillStyle = "#0d0518";
    ctx.beginPath();
    ctx.roundRect(CX - 26, GUNY + 66, 52, 12, 4);
    ctx.fill();
    ctx.strokeStyle = hsl(nextHue, 100, 65);
    ctx.lineWidth = 2;
    ctx.stroke();

    // singularity core
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
    ctx.strokeStyle = "rgba(255,255,255,0.9)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(CX, gy, 6.5, -this.time * 4, -this.time * 4 + Math.PI * 1.2);
    ctx.stroke();

    // neon diamonds
    ctx.fillStyle = hsl(nextHue, 100, 70);
    for (const [sx, sy, r] of [
      [-22, 92, 4],
      [22, 92, 4],
      [0, 152, 3],
    ] as const) {
      ctx.save();
      ctx.translate(CX + sx, GUNY + sy);
      ctx.rotate(Math.PI / 4 + this.time * 0.8);
      ctx.fillRect(-r, -r, r * 2, r * 2);
      ctx.restore();
    }

    // captured debris orbiting the whole cannon
    for (let q = 0; q < 4; q++) {
      const sa = this.time * (0.9 + q * 0.22) + (q * TAU) / 4;
      const rad = 74 + (q % 2) * 14;
      const ox = CX + Math.cos(sa) * rad;
      const oy2 = GUNY + 110 + Math.sin(sa) * rad * 0.62;
      ctx.fillStyle = q % 2 ? hsl(nextHue + 40, 90, 68, 0.9) : "rgba(255,255,255,0.9)";
      ctx.beginPath();
      ctx.arc(ox, oy2, q % 2 ? 2 : 1.5, 0, TAU);
      ctx.fill();
    }
    ctx.strokeStyle = hsl(nextHue, 90, 60, 0.22);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(CX, GUNY + 110, 74, 46, 0, 0, TAU);
    ctx.stroke();

    ctx.restore();
  }

  private drawAmmo() {
    if (this.state === "menu") return;
    const ctx = this.ctx;
    const total = this.queue.length;
    for (let k = 0; k < total; k++) {
      const used = k < this.shotIdx;
      const y = 742 - (total - 1 - k) * 22;
      ctx.save();
      ctx.globalAlpha = used ? 0.18 : 1;
      if (this.weapon === "blackhole") {
        ctx.translate(26, y - 12);
        drawOrb(ctx, used ? 250 : this.queue[k], 6.5, this.time, k * 1.7);
      } else if (this.weapon === "shark") {
        ctx.translate(6, y - 12);
        ctx.scale(0.5, 0.5);
        drawShark(ctx, used ? 220 : this.queue[k], 0.25, this.time, k * 1.3, 0);
      } else if (this.weapon === "bamboo") {
        ctx.translate(26, y - 12);
        drawStone(ctx, used ? 30 : this.queue[k], 7, this.time * 0.4, k * 1.9, 0);
      } else if (this.weapon === "soaker") {
        ctx.translate(26, y - 12);
        drawDrop(ctx, used ? 210 : this.queue[k], 7, this.time, k * 1.7, 0);
      } else if (this.weapon === "rainbow") {
        ctx.translate(4, y - 12);
        ctx.scale(0.55, 0.55);
        drawRainbowBolt(ctx, this.time, k * 1.7, 0, 1);
      } else if (this.weapon === "bazooka") {
        ctx.translate(2, y - 12);
        ctx.scale(0.5, 0.5);
        drawBazookaShell(ctx, this.queue[k], this.time, k * 1.5, 0, 0);
      } else if (this.weapon === "rpg") {
        ctx.translate(4, y - 12);
        ctx.scale(0.5, 0.5);
        drawRpgGrenade(ctx, this.queue[k], this.time, k * 1.5, 0, 0);
      } else {
        ctx.translate(26, y - 12);
        ctx.rotate(Math.PI / 2);
        ctx.scale(0.62, 0.62);
        drawRocketShape(ctx, used ? 250 : this.queue[k]);
      }
      ctx.restore();
    }
  }

  private drawHUD() {
    if (this.state === "menu") return;
    const ctx = this.ctx;
    ctx.save();
    ctx.textBaseline = "alphabetic";
    // score
    ctx.textAlign = "left";
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.font = `700 11px ${FONT}`;
    ctx.fillText("SCORE", 20, 30);
    ctx.fillStyle = "#fff";
    ctx.shadowColor = "#ff5fd2";
    ctx.shadowBlur = 12;
    ctx.font = `700 32px ${FONT}`;
    ctx.fillText(String(this.score), 20, 64);
    // best
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

    // clear banner
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
      if (this.weapon === "blackhole") {
        g.addColorStop(0, "#b46bff");
        g.addColorStop(0.5, "#7ad7ff");
        g.addColorStop(1, "#f0e6ff");
        ctx.shadowColor = "rgba(140,80,255,0.95)";
      } else if (this.weapon === "shark") {
        g.addColorStop(0, "#5fe7ff");
        g.addColorStop(0.5, "#2ea8dd");
        g.addColorStop(1, "#f0fbff");
        ctx.shadowColor = "rgba(60,180,240,0.95)";
      } else if (this.weapon === "bamboo") {
        g.addColorStop(0, "#ffb02e");
        g.addColorStop(0.5, "#ff7b1c");
        g.addColorStop(1, "#fff3d6");
        ctx.shadowColor = "rgba(255,140,40,0.95)";
      } else if (this.weapon === "soaker") {
        g.addColorStop(0, "#ffe93e");
        g.addColorStop(0.5, "#5fe7ff");
        g.addColorStop(1, "#ffffff");
        ctx.shadowColor = "rgba(90,210,255,0.95)";
      } else if (this.weapon === "rainbow") {
        g.addColorStop(0, "#ff5f5f");
        g.addColorStop(0.25, "#ffd75e");
        g.addColorStop(0.5, "#5fff8f");
        g.addColorStop(0.75, "#5fb8ff");
        g.addColorStop(1, "#c77dff");
        ctx.shadowColor = "rgba(255,120,200,0.95)";
      } else if (this.weapon === "bazooka") {
        g.addColorStop(0, "#ffe27a");
        g.addColorStop(0.5, "#ff9d2e");
        g.addColorStop(1, "#ff5a2e");
        ctx.shadowColor = "rgba(255,140,40,0.95)";
      } else if (this.weapon === "rpg") {
        g.addColorStop(0, "#ffd0a0");
        g.addColorStop(0.5, "#ff8a3d");
        g.addColorStop(1, "#d03028");
        ctx.shadowColor = "rgba(255,120,50,0.95)";
      } else {
        g.addColorStop(0, "#ffe27a");
        g.addColorStop(0.5, "#ff6ad5");
        g.addColorStop(1, "#7ad7ff");
        ctx.shadowColor = "rgba(255,120,220,0.9)";
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
