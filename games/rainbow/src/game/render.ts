import {
  TAU,
  hsl,
  rainbowGradient,
  conicRainbow,
  ringPath,
  rr,
  px,
  py,
  clamp,
} from "./utils";

export interface BoltView {
  a: number;
  hue: number;
  perfect: boolean;
  born: number;
}
export interface WheelView {
  cx: number;
  cy: number;
  r: number;
  angle: number;
  sweetA: number;
  sweetHalf: number;
  flash: number;
  boss: boolean;
  t: number;
  bolts: BoltView[];
  charge: number;
  alive: boolean;
  alpha: number;
  /** decaying elastic impact wobble */
  ripple: number;
  ripplePhase: number;
  /** quick scale pop on impact */
  pulse: number;
}
export interface ParticleView {
  x: number;
  y: number;
  vx: number;
  vy: number;
  g: number;
  life: number;
  t: number;
  size: number;
  hue: number;
  rot: number;
  spin: number;
  /** spark | shard | ring | star | ray | flare | prism | ember | confetti */
  kind: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
  /** extra thickness / length used by rays */
  w?: number;
}
export interface PopupView {
  x: number;
  y: number;
  text: string;
  sub: string;
  t: number;
  life: number;
  hue: number;
}

/* ------------------------------------------------------------------ */
/* background                                                          */
/* ------------------------------------------------------------------ */

let starSeed = 987654321;
const srand = () => ((starSeed = (starSeed * 1664525 + 1013904223) >>> 0) / 4294967296);
const STARS = Array.from({ length: 70 }, () => ({
  x: srand(),
  y: srand(),
  s: 0.4 + srand() * 1.7,
  p: srand() * TAU,
  h: srand() * 360,
}));

const BLOBS = [
  { x: 0.2, y: 0.16, r: 300, h: 290, sp: 0.13 },
  { x: 0.85, y: 0.32, r: 340, h: 190, sp: -0.09 },
  { x: 0.5, y: 0.78, r: 420, h: 330, sp: 0.07 },
];

export function drawBackground(ctx: CanvasRenderingContext2D, W: number, H: number, t: number) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "#080412");
  g.addColorStop(0.42, "#0d0620");
  g.addColorStop(0.75, "#0a0518");
  g.addColorStop(1, "#050310");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // aurora blobs
  ctx.globalCompositeOperation = "lighter";
  for (const b of BLOBS) {
    const bx = b.x * W + Math.sin(t * b.sp) * 60;
    const by = b.y * H + Math.cos(t * b.sp * 1.3) * 40;
    const rg = ctx.createRadialGradient(bx, by, 0, bx, by, b.r);
    const hue = b.h + t * 12;
    rg.addColorStop(0, hsl(hue, 95, 58, 0.2));
    rg.addColorStop(0.45, hsl(hue + 50, 95, 45, 0.08));
    rg.addColorStop(1, hsl(hue + 90, 95, 40, 0));
    ctx.fillStyle = rg;
    ctx.fillRect(bx - b.r, by - b.r, b.r * 2, b.r * 2);
  }

  // stars
  for (const s of STARS) {
    const tw = 0.45 + 0.55 * Math.sin(t * 1.7 + s.p);
    ctx.fillStyle = hsl(s.h + t * 20, 90, 78, 0.5 * tw);
    ctx.beginPath();
    ctx.arc(s.x * W, s.y * H, s.s, 0, TAU);
    ctx.fill();
  }
  ctx.globalCompositeOperation = "source-over";

  // vignette
  const v = ctx.createRadialGradient(W / 2, H * 0.45, H * 0.2, W / 2, H * 0.5, H * 0.78);
  v.addColorStop(0, "rgba(0,0,0,0)");
  v.addColorStop(1, "rgba(0,0,0,0.75)");
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, W, H);
}

/** full-screen impact flash */
export function drawFlash(ctx: CanvasRenderingContext2D, W: number, H: number, k: number, hue: number) {
  if (k <= 0.01) return;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, hsl(hue + 60, 100, 60, 0.16 * k));
  g.addColorStop(0.42, `rgba(255,255,255,${0.34 * k})`);
  g.addColorStop(0.62, hsl(hue, 100, 62, 0.2 * k));
  g.addColorStop(1, hsl(hue + 140, 100, 58, 0.14 * k));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

/** red crash vignette */
export function drawFailFlash(ctx: CanvasRenderingContext2D, W: number, H: number, k: number) {
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const g = ctx.createRadialGradient(W / 2, H * 0.35, H * 0.1, W / 2, H * 0.45, H * 0.75);
  g.addColorStop(0, "rgba(255,40,60,0)");
  g.addColorStop(1, `rgba(255,30,60,${0.55 * k})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

/* ------------------------------------------------------------------ */
/* the rotating target wheel                                           */
/* ------------------------------------------------------------------ */

export function drawWheel(ctx: CanvasRenderingContext2D, v: WheelView) {
  const { cx, cy, r, angle, t } = v;
  const ringW = 24;

  ctx.save();
  ctx.globalAlpha = v.alpha;

  // ---------- elastic impact wobble (squash & stretch) ----------
  {
    const pop = 1 + v.pulse * 0.055;
    const w = Math.pow(v.ripple, 0.65) * 0.05;
    const q = Math.sin(v.ripplePhase);
    ctx.translate(cx, cy);
    ctx.rotate(v.ripple * 0.035 * Math.sin(v.ripplePhase * 0.7 + 1));
    ctx.scale(pop * (1 + w * q), pop * (1 - w * q));
    ctx.translate(-cx, -cy);
  }

  // ---------- outer aura ----------
  ctx.globalCompositeOperation = "lighter";
  const aura = ctx.createRadialGradient(cx, cy, r * 0.7, cx, cy, r * 2.05);
  const pulse = 0.5 + 0.5 * Math.sin(t * 2.2);
  aura.addColorStop(0, hsl(t * 60, 100, 60, 0.16 + 0.06 * pulse));
  aura.addColorStop(0.5, hsl(t * 60 + 90, 100, 55, 0.09));
  aura.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = aura;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 2.05, 0, TAU);
  ctx.fill();
  ctx.globalCompositeOperation = "source-over";

  // ---------- inner disc ----------
  const id = ctx.createRadialGradient(cx, cy - r * 0.35, r * 0.05, cx, cy, r - ringW);
  id.addColorStop(0, "#241a3d");
  id.addColorStop(0.55, "#150e28");
  id.addColorStop(1, "#0a0616");
  ctx.fillStyle = id;
  ctx.beginPath();
  ctx.arc(cx, cy, r - ringW, 0, TAU);
  ctx.fill();

  // faint conic sheen on the disc
  const sheen = conicRainbow(ctx, cx, cy, -angle * 1.5 + t * 0.2, 0.13, 55);
  if (sheen) {
    ctx.fillStyle = sheen;
    ctx.beginPath();
    ctx.arc(cx, cy, r - ringW, 0, TAU);
    ctx.fill();
  }

  // rotating tick marks inside the disc (makes spin readable)
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-angle);
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * TAU;
    const inner = r - ringW - 6;
    ctx.strokeStyle = i % 4 === 0 ? "rgba(255,255,255,0.32)" : "rgba(255,255,255,0.12)";
    ctx.lineWidth = i % 4 === 0 ? 2.5 : 1.5;
    ctx.beginPath();
    ctx.moveTo(Math.sin(a) * inner, Math.cos(a) * inner);
    ctx.lineTo(Math.sin(a) * (inner - (i % 4 === 0 ? 13 : 7)), Math.cos(a) * (inner - (i % 4 === 0 ? 13 : 7)));
    ctx.stroke();
  }
  ctx.restore();

  // ---------- rainbow ring ----------
  const cg = conicRainbow(ctx, cx, cy, angle, 1, 56);
  ringPath(ctx, cx, cy, r, r - ringW);
  if (cg) {
    ctx.fillStyle = cg;
    ctx.fill("evenodd");
  } else {
    const n = 48;
    for (let i = 0; i < n; i++) {
      const a0 = angle + (i / n) * TAU;
      ctx.beginPath();
      ctx.arc(cx, cy, r, a0, a0 + TAU / n + 0.02);
      ctx.arc(cx, cy, r - ringW, a0 + TAU / n + 0.02, a0, true);
      ctx.closePath();
      ctx.fillStyle = hsl((a0 - angle) * 57 + t * 20, 100, 56);
      ctx.fill();
    }
  }

  // ring bevel shading
  const bev = ctx.createRadialGradient(cx, cy, r - ringW, cx, cy, r);
  bev.addColorStop(0, "rgba(0,0,0,0.55)");
  bev.addColorStop(0.35, "rgba(255,255,255,0.16)");
  bev.addColorStop(0.7, "rgba(0,0,0,0.25)");
  bev.addColorStop(1, "rgba(255,255,255,0.3)");
  ringPath(ctx, cx, cy, r, r - ringW);
  ctx.fillStyle = bev;
  ctx.fill("evenodd");

  // rim strokes
  ctx.strokeStyle = "rgba(255,255,255,0.55)";
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, TAU);
  ctx.stroke();
  ctx.strokeStyle = "rgba(255,255,255,0.22)";
  ctx.beginPath();
  ctx.arc(cx, cy, r - ringW, 0, TAU);
  ctx.stroke();

  // ---------- boss crown ----------
  if (v.boss) {
    ctx.save();
    ctx.strokeStyle = "rgba(255,225,150,0.5)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, r + 20, 0, TAU);
    ctx.stroke();
    for (let i = 0; i < 10; i++) {
      const a = angle + (i / 10) * TAU;
      ctx.save();
      ctx.translate(px(cx, r + 2, a), py(cy, r + 2, a));
      ctx.rotate(-a);
      ctx.beginPath();
      ctx.moveTo(-8, 0);
      ctx.lineTo(8, 0);
      ctx.lineTo(0, 22);
      ctx.closePath();
      const sg = ctx.createLinearGradient(0, 0, 0, 22);
      sg.addColorStop(0, hsl(t * 60 + i * 36, 100, 72, 0.95));
      sg.addColorStop(1, hsl(t * 60 + i * 36 + 60, 100, 55, 0.15));
      ctx.fillStyle = sg;
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.5)";
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }

  // ---------- core ----------
  const coreR = r * 0.36;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const coreGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR * 2.1);
  coreGlow.addColorStop(0, hsl(t * 70, 100, 80, 0.55));
  coreGlow.addColorStop(0.4, hsl(t * 70 + 80, 100, 60, 0.22));
  coreGlow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = coreGlow;
  ctx.beginPath();
  ctx.arc(cx, cy, coreR * 2.1, 0, TAU);
  ctx.fill();
  ctx.restore();

  const cg2 = conicRainbow(ctx, cx, cy, -angle * 2 + t, 1, 62);
  ctx.beginPath();
  ctx.arc(cx, cy, coreR, 0, TAU);
  if (cg2) {
    ctx.fillStyle = cg2;
    ctx.fill();
  } else {
    ctx.fillStyle = hsl(t * 70, 90, 60);
    ctx.fill();
  }
  const coreShade = ctx.createRadialGradient(cx - coreR * 0.3, cy - coreR * 0.4, 0, cx, cy, coreR);
  coreShade.addColorStop(0, "rgba(255,255,255,0.85)");
  coreShade.addColorStop(0.45, "rgba(255,255,255,0.1)");
  coreShade.addColorStop(1, "rgba(0,0,0,0.6)");
  ctx.fillStyle = coreShade;
  ctx.fill();

  // damage cracks
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-angle);
  const dmg = clamp(v.charge, 0, 1);
  const cracks = Math.floor(dmg * 7);
  ctx.strokeStyle = "rgba(0,0,0,0.55)";
  ctx.lineWidth = 2;
  for (let i = 0; i < cracks; i++) {
    const a = (i / 7) * TAU + 0.4;
    ctx.beginPath();
    ctx.moveTo(Math.sin(a) * coreR * 0.15, Math.cos(a) * coreR * 0.15);
    ctx.lineTo(Math.sin(a + 0.35) * coreR * 0.6, Math.cos(a + 0.35) * coreR * 0.6);
    ctx.lineTo(Math.sin(a - 0.2) * coreR * 0.95, Math.cos(a - 0.2) * coreR * 0.95);
    ctx.stroke();
  }
  ctx.restore();

  // ---------- sweet spot ----------
  if (v.alive) {
    const sa = angle + v.sweetA;
    const sp = 0.5 + 0.5 * Math.sin(t * 4);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = hsl(48, 100, 62, 0.35 + 0.25 * sp);
    ctx.lineWidth = 12;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.arc(
      cx,
      cy,
      r - ringW / 2,
      Math.PI / 2 - (sa + v.sweetHalf),
      Math.PI / 2 - (sa - v.sweetHalf)
    );
    ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255,0.85)";
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();

    // gem markers
    for (const off of [-v.sweetHalf, v.sweetHalf]) {
      const a = sa + off;
      const gx = px(cx, r - ringW / 2, a);
      const gy = py(cy, r - ringW / 2, a);
      ctx.save();
      ctx.translate(gx, gy);
      ctx.rotate(-a);
      ctx.fillStyle = hsl(50, 100, 70, 0.95);
      ctx.beginPath();
      ctx.moveTo(0, -7);
      ctx.lineTo(5, 0);
      ctx.lineTo(0, 7);
      ctx.lineTo(-5, 0);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }

  // ---------- holy energy seals left by landed pulses ----------
  for (const b of v.bolts) {
    const grow = clamp((v.t - b.born) / 0.16, 0, 1);
    const sealR = r - ringW * 0.5;
    const a = angle + b.a;
    const sx = px(cx, sealR, a);
    const sy = py(cy, sealR, a);
    const breathe = 0.84 + 0.16 * Math.sin(t * 5.5 + b.a * 4);
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(-a);
    ctx.scale(grow, grow);
    ctx.globalCompositeOperation = "lighter";

    const halo = ctx.createRadialGradient(0, 0, 0, 0, 0, b.perfect ? 24 : 18);
    halo.addColorStop(0, "rgba(255,255,255,0.95)");
    halo.addColorStop(0.2, hsl(b.perfect ? 48 : b.hue, 100, 82, 0.9));
    halo.addColorStop(0.55, hsl(b.hue + 70, 100, 62, 0.32 * breathe));
    halo.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(0, 0, b.perfect ? 24 : 18, 0, TAU);
    ctx.fill();

    // Soft angel wings follow the target curve; nothing protrudes like a spike.
    for (const side of [-1, 1]) {
      ctx.save();
      ctx.scale(side, 1);
      const wing = ctx.createLinearGradient(4, 0, 19, 0);
      wing.addColorStop(0, "rgba(255,255,255,0.9)");
      wing.addColorStop(1, hsl(b.hue + 80, 100, 72, 0));
      ctx.fillStyle = wing;
      ctx.beginPath();
      ctx.moveTo(3, -1);
      ctx.quadraticCurveTo(12, -9, 20, -5);
      ctx.quadraticCurveTo(12, -1, 5, 3);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    ctx.fillStyle = "rgba(255,255,255,0.98)";
    ctx.beginPath();
    ctx.arc(0, 0, b.perfect ? 5.5 : 4.2, 0, TAU);
    ctx.fill();
    ctx.rotate(t * 1.8 + b.a);
    ctx.strokeStyle = hsl(b.perfect ? 48 : b.hue + 30, 100, 82, 0.8);
    ctx.lineWidth = b.perfect ? 2.2 : 1.4;
    ctx.setLineDash([3, 5]);
    ctx.beginPath();
    ctx.arc(0, 0, b.perfect ? 14 : 10, 0, TAU);
    ctx.stroke();
    ctx.setLineDash([]);
    if (b.perfect) {
      ctx.strokeStyle = hsl(50, 100, 75, 0.5 + 0.4 * Math.sin(t * 6 + b.a * 3));
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, 19 + 2 * Math.sin(t * 6), 0, TAU);
      ctx.stroke();
    }
    ctx.restore();
  }

  // ---------- hit flash ----------
  if (v.flash > 0.01) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = `rgba(255,255,255,${0.75 * v.flash})`;
    ctx.lineWidth = 10 * v.flash + 2;
    ctx.beginPath();
    ctx.arc(cx, cy, r + 16 * (1 - v.flash) + 6, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }

  ctx.restore();
}

/* ------------------------------------------------------------------ */
/* flying bullet + trail                                               */
/* ------------------------------------------------------------------ */

export interface BulletView {
  x: number;
  y: number;
  hue: number;
  weapon: "rainbow" | "blackhole";
  trail: { x: number; y: number }[];
}

export function drawBullet(ctx: CanvasRenderingContext2D, b: BulletView, t: number, len: number) {
  const pulseY = b.y - len + 8;
  const pts = [
    ...b.trail.map((p) => ({ x: p.x, y: p.y - len + 8 })),
    { x: b.x, y: pulseY },
  ];
  const n = pts.length;
  ctx.save();

  // ---------- BLACK HOLE PROJECTILE ----------
  if (b.weapon === "blackhole") {
    ctx.globalCompositeOperation = "lighter";
    const bh = 0.5 + 0.5 * Math.sin(t * 6);

    // Dark matter trail: bending streaks flowing toward the orb
    if (n > 1) {
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < n; i++) {
        const p = pts[i];
        const bend = Math.sin((i / n) * Math.PI * 2 + t * 3) * 6;
        ctx.lineTo(p.x + bend, p.y);
      }
      const tg = ctx.createLinearGradient(pts[0].x, pts[0].y, pts[n - 1].x, pts[n - 1].y);
      tg.addColorStop(0, "rgba(20,15,30,0)");
      tg.addColorStop(0.3, `hsla(270, 100%, 40%, 0.55)`);
      tg.addColorStop(0.6, `hsla(200, 100%, 55%, 0.45)`);
      tg.addColorStop(1, `hsla(190, 100%, 65%, 0.6)`);
      ctx.strokeStyle = tg;
      ctx.lineWidth = 5 + bh * 3;
      ctx.lineCap = "round";
      ctx.stroke();

      // secondary dark stream
      ctx.beginPath();
      ctx.moveTo(pts[0].x + 4, pts[0].y + 2);
      for (let i = 1; i < n; i++) {
        const p = pts[i];
        const bend = Math.cos((i / n) * Math.PI * 2 + t * 2) * 4;
        ctx.lineTo(p.x + bend, p.y + 1);
      }
      const tg2 = ctx.createLinearGradient(pts[0].x, pts[0].y, pts[n - 1].x, pts[n - 1].y);
      tg2.addColorStop(0, "rgba(10,8,20,0)");
      tg2.addColorStop(0.4, `hsla(290, 100%, 50%, 0.35)`);
      tg2.addColorStop(1, `hsla(260, 100%, 45%, 0.3)`);
      ctx.strokeStyle = tg2;
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }

    // Gravitational lensing rings (Einstein rings)
    const lensR = 16 + bh * 5;
    for (let i = 0; i < 3; i++) {
      const ringR = lensR - i * 3.5;
      if (ringR <= 0) continue;
      ctx.save();
      ctx.translate(b.x, pulseY);
      ctx.rotate(t * (1 + i * 0.7));
      ctx.strokeStyle = `hsla(${190 + i * 50}, 100%, 65%, ${0.35 + bh * 0.3})`;
      ctx.lineWidth = i === 0 ? 2.5 : 1.2;
      ctx.setLineDash(i === 0 ? [5, 6] : [2, 5]);
      ctx.beginPath();
      ctx.arc(0, 0, ringR, 0, TAU);
      ctx.stroke();
      ctx.restore();
    }

    // Event horizon: black sphere
    ctx.save();
    ctx.translate(b.x, pulseY);
    const ehR = 10 + bh * 2;
    const eh = ctx.createRadialGradient(0, 0, 0, 0, 0, ehR);
    eh.addColorStop(0, "#040308");
    eh.addColorStop(0.45, "#0a080f");
    eh.addColorStop(1, "#020204");
    ctx.fillStyle = eh;
    ctx.beginPath();
    ctx.arc(0, 0, ehR, 0, TAU);
    ctx.fill();
    ctx.restore();

    // Accretion disk: spinning colorful ring around event horizon
    const diskR = ehR + 7;
    ctx.save();
    ctx.translate(b.x, pulseY);
    ctx.rotate(t * 2.5);
    ctx.beginPath();
    ctx.arc(0, 0, diskR, 0, TAU);
    ctx.arc(0, 0, ehR + 1.5, TAU, 0, true);
    ctx.closePath();
    const diskG = ctx.createLinearGradient(-diskR, 0, diskR, 0);
    diskG.addColorStop(0, `hsla(260, 100%, 50%, 0)`);
    diskG.addColorStop(0.25, `hsla(290, 100%, 60%, 0.8)`);
    diskG.addColorStop(0.5, `hsla(190, 100%, 70%, 0.9)`);
    diskG.addColorStop(0.75, `hsla(270, 100%, 65%, 0.8)`);
    diskG.addColorStop(1, `hsla(250, 100%, 55%, 0)`);
    ctx.fillStyle = diskG;
    ctx.fill();
    ctx.restore();

    // Inner bright ring (photon sphere)
    ctx.save();
    ctx.translate(b.x, pulseY);
    ctx.rotate(-t * 1.8);
    ctx.strokeStyle = `hsla(190, 100%, 80%, ${0.7 + bh * 0.3})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, diskR - 2, 0, TAU);
    ctx.stroke();
    ctx.restore();

    // Singularity core flash
    const coreGlow = ctx.createRadialGradient(b.x, pulseY, 0, b.x, pulseY, 14 + bh * 4);
    coreGlow.addColorStop(0, "rgba(255,255,255,1)");
    coreGlow.addColorStop(0.25, `hsla(${b.hue + 40}, 100%, 85%, 0.9)`);
    coreGlow.addColorStop(0.6, `hsla(${b.hue + 130}, 100%, 60%, 0.4)`);
    coreGlow.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = coreGlow;
    ctx.beginPath();
    ctx.arc(b.x, pulseY, 14 + bh * 4, 0, TAU);
    ctx.fill();

    ctx.restore();
    return;
  }

  // ---------- RAINBOW PROJECTILE (original) ----------
  ctx.globalCompositeOperation = "lighter";

  // A continuous spectral beam trails only the moving pulse, never the aim path.
  if (n > 1) {
    const tail = pts[0];
    const head = pts[n - 1];
    const trace = () => {
      ctx.beginPath();
      ctx.moveTo(tail.x, tail.y);
      for (let i = 1; i < n; i++) {
        const p = pts[i];
        ctx.lineTo(p.x, p.y);
      }
    };
    const spectrum = (alpha: number, light: number) => {
      const g = ctx.createLinearGradient(tail.x, tail.y, head.x, head.y);
      g.addColorStop(0, hsl(335 + t * 18, 100, light, 0));
      g.addColorStop(0.08, hsl(345 + t * 18, 100, light, alpha * 0.45));
      g.addColorStop(0.22, hsl(22 + t * 18, 100, light, alpha * 0.7));
      g.addColorStop(0.36, hsl(54 + t * 18, 100, light + 5, alpha * 0.85));
      g.addColorStop(0.52, hsl(125 + t * 18, 100, light, alpha));
      g.addColorStop(0.68, hsl(185 + t * 18, 100, light + 4, alpha));
      g.addColorStop(0.84, hsl(235 + t * 18, 100, light + 5, alpha));
      g.addColorStop(1, hsl(285 + t * 18, 100, light + 8, alpha));
      return g;
    };

    // Wide bloom, saturated beam body, then a white-hot energy filament.
    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.shadowBlur = 24;
    ctx.shadowColor = hsl(b.hue + t * 30, 100, 72, 0.85);
    trace();
    ctx.strokeStyle = spectrum(0.24, 58);
    ctx.lineWidth = 24;
    ctx.stroke();
    ctx.shadowBlur = 12;
    trace();
    ctx.strokeStyle = spectrum(0.92, 61);
    ctx.lineWidth = 9;
    ctx.stroke();
    trace();
    const core = ctx.createLinearGradient(tail.x, tail.y, head.x, head.y);
    core.addColorStop(0, "rgba(255,255,255,0)");
    core.addColorStop(0.28, "rgba(255,255,255,0.32)");
    core.addColorStop(0.72, "rgba(255,255,255,0.82)");
    core.addColorStop(1, "rgba(255,255,255,1)");
    ctx.strokeStyle = core;
    ctx.lineWidth = 2.5 + Math.sin(t * 20) * 0.5;
    ctx.stroke();
    ctx.restore();

    // Travelling light nodes make the beam feel pulsed instead of static.
    for (let i = 0; i < 3; i++) {
      const p = (t * 3.2 + i / 3) % 1;
      const idx = p * (n - 1);
      const i0 = Math.floor(idx);
      const i1 = Math.min(n - 1, i0 + 1);
      const f = idx - i0;
      const nx = pts[i0].x + (pts[i1].x - pts[i0].x) * f;
      const ny = pts[i0].y + (pts[i1].y - pts[i0].y) * f;
      const ng = ctx.createRadialGradient(nx, ny, 0, nx, ny, 10);
      ng.addColorStop(0, "rgba(255,255,255,0.95)");
      ng.addColorStop(0.3, hsl(310 - p * 300 + t * 18, 100, 78, 0.75));
      ng.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = ng;
      ctx.beginPath();
      ctx.arc(nx, ny, 10, 0, TAU);
      ctx.fill();
    }
  }

  // A breathing round aura forms the holy pulse body.
  const beat = 0.5 + 0.5 * Math.sin(t * 18);
  const auraR = 29 + beat * 5;
  const aura = ctx.createRadialGradient(b.x, pulseY, 0, b.x, pulseY, auraR);
  aura.addColorStop(0, "rgba(255,255,255,1)");
  aura.addColorStop(0.12, "rgba(255,255,245,0.98)");
  aura.addColorStop(0.3, hsl(b.hue + 45, 100, 84, 0.82));
  aura.addColorStop(0.58, hsl(b.hue + 120, 100, 66, 0.34));
  aura.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = aura;
  ctx.beginPath();
  ctx.arc(b.x, pulseY, auraR, 0, TAU);
  ctx.fill();

  // Soft angel wings flare with every pulse.
  for (const side of [-1, 1]) {
    ctx.save();
    ctx.translate(b.x, pulseY);
    ctx.scale(side, 1);
    const wing = ctx.createLinearGradient(4, 0, 36, 0);
    wing.addColorStop(0, "rgba(255,255,255,0.92)");
    wing.addColorStop(0.45, hsl(b.hue + 70, 100, 86, 0.48));
    wing.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = wing;
    ctx.beginPath();
    ctx.moveTo(4, -3);
    ctx.quadraticCurveTo(18, -20 - beat * 4, 37, -10);
    ctx.quadraticCurveTo(25, -3, 8, 5);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(6, 1);
    ctx.quadraticCurveTo(19, 11 + beat * 3, 31, 7);
    ctx.quadraticCurveTo(18, 15, 5, 7);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // Two opposing halo rings make the projectile read as holy energy.
  for (let i = 0; i < 2; i++) {
    const dir = i === 0 ? 1 : -1;
    ctx.save();
    ctx.translate(b.x, pulseY);
    ctx.rotate(t * (2.6 + i) * dir);
    ctx.strokeStyle = hsl(b.hue + 70 + i * 95, 100, 84, 0.7);
    ctx.lineWidth = i === 0 ? 2 : 1.2;
    ctx.setLineDash(i === 0 ? [7, 4] : [2, 5]);
    ctx.beginPath();
    ctx.ellipse(0, 0, 17 + i * 5, 7 + i * 3, 0, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }

  const core = ctx.createRadialGradient(b.x - 3, pulseY - 4, 0, b.x, pulseY, 12);
  core.addColorStop(0, "rgba(255,255,255,1)");
  core.addColorStop(0.35, "rgba(255,255,242,1)");
  core.addColorStop(0.7, hsl(b.hue + 35, 100, 86, 0.96));
  core.addColorStop(1, hsl(b.hue + 100, 100, 65, 0));
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.arc(b.x, pulseY, 12 + beat * 2, 0, TAU);
  ctx.fill();

  ctx.restore();
}

/* ------------------------------------------------------------------ */
/* THE RAINBOW GUN                                                     */
/* ------------------------------------------------------------------ */

export interface GunView {
  x: number;
  muzzleY: number;
  t: number;
  recoil: number;
  flash: number;
  ammo: number;
  shots: number;
  ready: boolean;
  hue: number;
  weapon: "rainbow" | "blackhole" | "yoyo";
}

export function drawGun(ctx: CanvasRenderingContext2D, v: GunView) {
  if (v.weapon === "blackhole") {
    drawBlackHoleGun(ctx, v);
    return;
  }
  const { t, hue } = v;
  const rec = v.recoil;
  const pulse = 0.5 + 0.5 * Math.sin(t * 3.2);

  ctx.save();
  ctx.translate(v.x, v.muzzleY + rec * 22);
  ctx.scale(0.91 + rec * 0.025, 1 - rec * 0.018);

  // Broad aura follows the receiver instead of forming a tall glow column.
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const rearGlow = ctx.createRadialGradient(-5, 145, 8, -5, 145, 145);
  rearGlow.addColorStop(0, hsl(hue + 35, 100, 67, 0.16 + pulse * 0.05));
  rearGlow.addColorStop(0.45, hsl(hue + 145, 100, 57, 0.07));
  rearGlow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = rearGlow;
  ctx.fillRect(-160, -15, 320, 310);
  ctx.restore();

  // Mechanical holy wings make the silhouette grand and visibly rainbow.
  for (const side of [-1, 1]) {
    ctx.save();
    ctx.scale(side, 1);
    for (let i = 0; i < 4; i++) {
      const rootY = 112 + i * 15;
      const tipX = 88 - i * 7;
      const tipY = 91 + i * 24;
      ctx.beginPath();
      ctx.moveTo(36, rootY);
      ctx.quadraticCurveTo(64, rootY - 15, tipX, tipY);
      ctx.quadraticCurveTo(83 - i * 5, tipY + 20, 42, rootY + 15);
      ctx.closePath();
      const feather = ctx.createLinearGradient(35, rootY, tipX, tipY);
      feather.addColorStop(0, hsl(hue + i * 48, 100, 58, 0.24));
      feather.addColorStop(0.42, hsl(hue + 55 + i * 48, 100, 68, 0.9));
      feather.addColorStop(0.72, hsl(hue + 120 + i * 48, 100, 62, 0.72));
      feather.addColorStop(1, hsl(hue + 180 + i * 48, 100, 70, 0.08));
      ctx.fillStyle = feather;
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.5)";
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.strokeStyle = hsl(hue + 60 + i * 54, 100, 80, 0.55 + pulse * 0.25);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(43, rootY + 3);
      ctx.quadraticCurveTo(68, rootY - 5, tipX - 8, tipY + 5);
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }

  // Rear stock: asymmetric silhouette makes the weapon read like a railgun.
  ctx.beginPath();
  ctx.moveTo(-34, 166);
  ctx.lineTo(-58, 181);
  ctx.lineTo(-72, 221);
  ctx.lineTo(-66, 252);
  ctx.lineTo(-43, 258);
  ctx.lineTo(-18, 207);
  ctx.lineTo(-13, 174);
  ctx.closePath();
  const stock = ctx.createLinearGradient(-72, 170, -15, 245);
  stock.addColorStop(0, "#151126");
  stock.addColorStop(0.42, "#35294c");
  stock.addColorStop(0.72, "#1a1429");
  stock.addColorStop(1, "#090711");
  ctx.fillStyle = stock;
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.globalCompositeOperation = "screen";
  ctx.globalAlpha = 0.62;
  ctx.fillStyle = rainbowGradient(ctx, -72, 185, -20, 250, t + 0.3, 1, 60, 100, 250);
  ctx.fillRect(-76, 165, 66, 100);
  ctx.restore();
  ctx.strokeStyle = rainbowGradient(ctx, -70, 180, -24, 256, t + 0.1, 0.9, 68, 100, 220);
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Stock cutout and rainbow status strip.
  ctx.beginPath();
  ctx.moveTo(-46, 194);
  ctx.lineTo(-58, 218);
  ctx.lineTo(-55, 239);
  ctx.lineTo(-43, 241);
  ctx.lineTo(-29, 204);
  ctx.closePath();
  ctx.fillStyle = "#080610";
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.12)";
  ctx.stroke();
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.strokeStyle = rainbowGradient(ctx, -60, 205, -34, 238, t, 0.8, 67);
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-58, 217);
  ctx.lineTo(-48, 235);
  ctx.lineTo(-37, 208);
  ctx.stroke();
  ctx.restore();

  // Angled pistol grip, deliberately offset from the bore axis.
  ctx.beginPath();
  ctx.moveTo(7, 180);
  ctx.lineTo(35, 178);
  ctx.lineTo(48, 257);
  ctx.lineTo(39, 273);
  ctx.lineTo(13, 270);
  ctx.lineTo(3, 202);
  ctx.closePath();
  const grip = ctx.createLinearGradient(3, 0, 48, 0);
  grip.addColorStop(0, "#0b0912");
  grip.addColorStop(0.35, "#312641");
  grip.addColorStop(0.55, "#514064");
  grip.addColorStop(1, "#0a0710");
  ctx.fillStyle = grip;
  ctx.fill();
  ctx.strokeStyle = "rgba(225,215,255,0.42)";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.save();
  ctx.clip();
  for (let i = 0; i < 6; i++) {
    ctx.strokeStyle = i % 2 ? "rgba(255,255,255,0.13)" : "rgba(0,0,0,0.55)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(4, 205 + i * 12);
    ctx.lineTo(47, 194 + i * 12);
    ctx.stroke();
  }
  ctx.restore();
  rr(ctx, 19, 258, 23, 8, 3);
  ctx.fillStyle = rainbowGradient(ctx, 19, 258, 42, 258, t, 0.75, 65);
  ctx.fill();

  // Animated diagonal prism inlays keep the grip colorful without making it tubular.
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < 4; i++) {
    const yy = 209 + i * 13;
    ctx.strokeStyle = hsl(hue + i * 72 + t * 25, 100, 72, 0.55);
    ctx.lineWidth = 2.3;
    ctx.beginPath();
    ctx.moveTo(12, yy + 5);
    ctx.lineTo(41, yy - 3);
    ctx.stroke();
  }
  ctx.restore();

  // Trigger guard and trigger sit visibly outside the receiver.
  ctx.save();
  ctx.strokeStyle = "#52466a";
  ctx.lineWidth = 7;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(14, 171);
  ctx.quadraticCurveTo(55, 174, 54, 203);
  ctx.quadraticCurveTo(51, 220, 28, 220);
  ctx.stroke();
  ctx.strokeStyle = "rgba(255,255,255,0.25)";
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.strokeStyle = hsl(hue + 40, 100, 72, 0.85);
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(28, 180);
  ctx.quadraticCurveTo(38, 190, 31, 203);
  ctx.stroke();
  ctx.restore();

  // Main armored receiver, wide and angular.
  ctx.beginPath();
  ctx.moveTo(-37, 98);
  ctx.lineTo(-55, 119);
  ctx.lineTo(-53, 166);
  ctx.lineTo(-34, 193);
  ctx.lineTo(30, 193);
  ctx.lineTo(51, 169);
  ctx.lineTo(54, 123);
  ctx.lineTo(36, 99);
  ctx.closePath();
  const receiver = ctx.createLinearGradient(-55, 110, 54, 180);
  receiver.addColorStop(0, "#11101d");
  receiver.addColorStop(0.23, "#3d3151");
  receiver.addColorStop(0.48, "#181322");
  receiver.addColorStop(0.76, "#49365c");
  receiver.addColorStop(1, "#0a0810");
  ctx.fillStyle = receiver;
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.globalCompositeOperation = "screen";
  ctx.globalAlpha = 0.76;
  ctx.fillStyle = rainbowGradient(ctx, -56, 104, 54, 190, t + 0.6, 1, 57, 100, 310);
  ctx.fillRect(-58, 96, 116, 102);
  // Dark diagonal masks keep the rainbow finish faceted and armored.
  ctx.globalCompositeOperation = "source-over";
  ctx.fillStyle = "rgba(5,3,10,0.52)";
  ctx.beginPath();
  ctx.moveTo(-10, 98);
  ctx.lineTo(17, 98);
  ctx.lineTo(39, 193);
  ctx.lineTo(14, 193);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle = rainbowGradient(ctx, -55, 105, 54, 188, t + 0.15, 1, 68, 100, 310);
  ctx.lineWidth = 3.2;
  ctx.stroke();
  ctx.strokeStyle = "rgba(255,255,255,0.48)";
  ctx.lineWidth = 1;
  ctx.stroke();

  // Bright prismatic armor facets on both cheeks of the receiver.
  for (const side of [-1, 1]) {
    ctx.save();
    ctx.scale(side, 1);
    ctx.beginPath();
    ctx.moveTo(37, 116);
    ctx.lineTo(50, 126);
    ctx.lineTo(47, 158);
    ctx.lineTo(34, 149);
    ctx.closePath();
    const cheek = ctx.createLinearGradient(32, 116, 51, 159);
    cheek.addColorStop(0, hsl(hue + 15, 100, 78, 0.95));
    cheek.addColorStop(0.45, hsl(hue + 105, 100, 60, 0.92));
    cheek.addColorStop(1, hsl(hue + 210, 100, 68, 0.35));
    ctx.fillStyle = cheek;
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.65)";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  }

  // Top and bottom armor bevels.
  ctx.beginPath();
  ctx.moveTo(-37, 98);
  ctx.lineTo(36, 99);
  ctx.lineTo(47, 113);
  ctx.lineTo(-48, 113);
  ctx.closePath();
  ctx.fillStyle = "rgba(255,255,255,0.1)";
  ctx.fill();
  ctx.strokeStyle = rainbowGradient(ctx, -45, 106, 45, 106, t, 0.9, 64);
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-45, 111);
  ctx.lineTo(45, 111);
  ctx.stroke();
  ctx.strokeStyle = "rgba(255,255,255,0.2)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-33, 188);
  ctx.lineTo(28, 188);
  ctx.stroke();

  // Receiver panel seams and mechanical screws.
  ctx.strokeStyle = "rgba(255,255,255,0.13)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-52, 129);
  ctx.lineTo(-37, 138);
  ctx.lineTo(-37, 178);
  ctx.moveTo(53, 129);
  ctx.lineTo(37, 138);
  ctx.lineTo(37, 176);
  ctx.stroke();
  for (const [sx, sy] of [[-42, 123], [42, 123], [-42, 176], [40, 175]] as const) {
    ctx.fillStyle = "rgba(210,205,235,0.52)";
    ctx.beginPath();
    ctx.arc(sx, sy, 2.2, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "rgba(0,0,0,0.7)";
    ctx.fillRect(sx - 1.2, sy - 0.4, 2.4, 0.8);
  }

  // Offset holy-energy chamber on the left side of the receiver.
  const coreX = -16;
  const coreY = 149;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const chamberGlow = ctx.createRadialGradient(coreX, coreY, 0, coreX, coreY, 35);
  chamberGlow.addColorStop(0, "rgba(255,255,255,0.42)");
  chamberGlow.addColorStop(0.42, hsl(hue + 45, 100, 64, 0.22));
  chamberGlow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = chamberGlow;
  ctx.beginPath();
  ctx.arc(coreX, coreY, 35, 0, TAU);
  ctx.fill();
  ctx.restore();
  ctx.beginPath();
  ctx.arc(coreX, coreY, 24, 0, TAU);
  ctx.fillStyle = "#07050c";
  ctx.fill();
  const chamber = conicRainbow(ctx, coreX, coreY, t * 1.7, 1, 63);
  ctx.beginPath();
  ctx.arc(coreX, coreY, 19, 0, TAU);
  ctx.fillStyle = chamber ?? hsl(hue, 100, 63);
  ctx.fill();
  const lens = ctx.createRadialGradient(coreX - 6, coreY - 7, 0, coreX, coreY, 19);
  lens.addColorStop(0, "rgba(255,255,255,0.95)");
  lens.addColorStop(0.3, "rgba(255,255,255,0.22)");
  lens.addColorStop(1, "rgba(0,0,0,0.54)");
  ctx.fillStyle = lens;
  ctx.fill();
  ctx.strokeStyle = "rgba(235,225,255,0.72)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(coreX, coreY, 23, 0, TAU);
  ctx.stroke();
  ctx.save();
  ctx.translate(coreX, coreY);
  ctx.rotate(t * 2.8);
  ctx.strokeStyle = "rgba(255,255,255,0.76)";
  ctx.lineWidth = 2.5;
  for (let i = 0; i < 3; i++) {
    ctx.rotate(TAU / 3);
    ctx.beginPath();
    ctx.arc(0, 0, 11, 0, 1.3);
    ctx.stroke();
  }
  ctx.restore();

  // Spectral conduits route energy from the chamber into the upper rail.
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < 3; i++) {
    ctx.strokeStyle = hsl(hue + i * 90 + t * 22, 100, 76, 0.48 + pulse * 0.25);
    ctx.lineWidth = 2.2 - i * 0.35;
    ctx.beginPath();
    ctx.moveTo(coreX + 4 + i * 4, coreY - 18);
    ctx.bezierCurveTo(1 + i * 8, 124, -27 + i * 8, 113, -20 + i * 8, 101);
    ctx.stroke();
  }
  ctx.restore();

  // Ammo cells on the right side make the receiver functional and asymmetric.
  const shown = Math.min(v.shots, 9);
  const rows = Math.min(shown, 6);
  rr(ctx, 13, 124, 27, 49, 6);
  ctx.fillStyle = "rgba(2,2,8,0.72)";
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.18)";
  ctx.lineWidth = 1;
  ctx.stroke();
  const litRows = v.shots ? Math.ceil((v.ammo / v.shots) * rows) : 0;
  for (let i = 0; i < rows; i++) {
    const lit = i < litRows;
    const yy = 129 + i * 7;
    rr(ctx, 18, yy, 17, 4, 2);
    ctx.fillStyle = lit ? hsl(hue + i * 42, 100, 68, 0.95) : "rgba(255,255,255,0.1)";
    ctx.fill();
    if (lit) {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.shadowBlur = 8;
      ctx.shadowColor = hsl(hue + i * 42, 100, 65);
      ctx.fill();
      ctx.restore();
    }
  }
  ctx.fillStyle = "rgba(255,255,255,0.42)";
  ctx.font = "700 6px ui-sans-serif, system-ui";
  ctx.textAlign = "center";
  ctx.fillText("PULSE", 26.5, 181);

  // Wide collar breaks the long vertical silhouette.
  ctx.beginPath();
  ctx.moveTo(-48, 93);
  ctx.lineTo(-39, 82);
  ctx.lineTo(39, 82);
  ctx.lineTo(49, 93);
  ctx.lineTo(37, 108);
  ctx.lineTo(-38, 108);
  ctx.closePath();
  const collar = ctx.createLinearGradient(-48, 0, 49, 0);
  collar.addColorStop(0, "#0a0810");
  collar.addColorStop(0.25, "#68547d");
  collar.addColorStop(0.5, "#17121f");
  collar.addColorStop(0.75, "#67517e");
  collar.addColorStop(1, "#09070f");
  ctx.fillStyle = collar;
  ctx.fill();
  ctx.strokeStyle = "rgba(235,225,255,0.5)";
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.strokeStyle = rainbowGradient(ctx, -38, 87, 38, 87, t + 0.4, 0.95, 64);
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.moveTo(-36, 87);
  ctx.lineTo(36, 87);
  ctx.stroke();
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  ctx.globalAlpha = 0.82;
  ctx.beginPath();
  ctx.moveTo(-37, 89);
  ctx.lineTo(-29, 85);
  ctx.lineTo(29, 85);
  ctx.lineTo(37, 89);
  ctx.lineTo(29, 100);
  ctx.lineTo(-30, 100);
  ctx.closePath();
  ctx.fillStyle = rainbowGradient(ctx, -37, 88, 37, 98, t + 0.9, 1, 67, 100, 260);
  ctx.fill();
  ctx.restore();

  // Short armored barrel with separated energy windows.
  ctx.beginPath();
  ctx.moveTo(-27, 31);
  ctx.lineTo(-32, 82);
  ctx.lineTo(32, 82);
  ctx.lineTo(27, 31);
  ctx.closePath();
  const barrel = ctx.createLinearGradient(-32, 0, 32, 0);
  barrel.addColorStop(0, "#08070d");
  barrel.addColorStop(0.18, "#41364f");
  barrel.addColorStop(0.43, "#16111d");
  barrel.addColorStop(0.62, "#655176");
  barrel.addColorStop(1, "#08060d");
  ctx.fillStyle = barrel;
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.globalCompositeOperation = "screen";
  ctx.globalAlpha = 0.62;
  ctx.fillStyle = rainbowGradient(ctx, -32, 34, 32, 80, t + 1.1, 1, 61, 100, 280);
  ctx.fillRect(-34, 29, 68, 56);
  ctx.restore();
  ctx.strokeStyle = rainbowGradient(ctx, -31, 34, 31, 80, t + 0.5, 0.95, 70, 100, 260);
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Segmented rainbow rail, not a single long glowing shaft.
  for (let i = 0; i < 4; i++) {
    const yy = 39 + i * 10;
    rr(ctx, -17, yy, 34, 6, 2);
    ctx.fillStyle = "#05040a";
    ctx.fill();
    rr(ctx, -14, yy + 1.3, 28, 3.4, 1.5);
    ctx.fillStyle = rainbowGradient(ctx, -14, yy, 14, yy, t + i * 0.18, 0.9, 68, 100, 170);
    ctx.fill();
  }
  ctx.strokeStyle = "rgba(255,255,255,0.14)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-23, 35);
  ctx.lineTo(-26, 76);
  ctx.moveTo(23, 35);
  ctx.lineTo(26, 76);
  ctx.stroke();

  // Side capacitor pods give the barrel a broad mechanical profile.
  for (const side of [-1, 1]) {
    ctx.save();
    ctx.scale(side, 1);
    ctx.beginPath();
    ctx.moveTo(27, 43);
    ctx.lineTo(42, 49);
    ctx.lineTo(47, 70);
    ctx.lineTo(34, 81);
    ctx.lineTo(29, 74);
    ctx.closePath();
    const pod = ctx.createLinearGradient(27, 46, 47, 77);
    pod.addColorStop(0, "#171020");
    pod.addColorStop(0.28, hsl(hue + 40, 100, 62, 0.95));
    pod.addColorStop(0.58, hsl(hue + 135, 100, 56, 0.9));
    pod.addColorStop(1, "#100b19");
    ctx.fillStyle = pod;
    ctx.fill();
    ctx.strokeStyle = "rgba(225,215,250,0.38)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    for (let i = 0; i < 3; i++) {
      ctx.strokeStyle = hsl(hue + 100 + i * 45, 100, 73, 0.4 + pulse * 0.35);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(34, 53 + i * 7);
      ctx.lineTo(42, 55 + i * 7);
      ctx.stroke();
    }
    ctx.restore();
  }

  // Flat, forked muzzle assembly with a hexagonal emitter.
  ctx.beginPath();
  ctx.moveTo(-37, 31);
  ctx.lineTo(-39, 13);
  ctx.lineTo(-28, 0);
  ctx.lineTo(-12, 0);
  ctx.lineTo(-9, 18);
  ctx.lineTo(9, 18);
  ctx.lineTo(12, 0);
  ctx.lineTo(28, 0);
  ctx.lineTo(39, 13);
  ctx.lineTo(37, 31);
  ctx.closePath();
  const muzzle = ctx.createLinearGradient(-39, 0, 39, 0);
  muzzle.addColorStop(0, "#09070e");
  muzzle.addColorStop(0.24, "#5c496d");
  muzzle.addColorStop(0.48, "#15101d");
  muzzle.addColorStop(0.76, "#604b72");
  muzzle.addColorStop(1, "#08060d");
  ctx.fillStyle = muzzle;
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.globalCompositeOperation = "screen";
  ctx.globalAlpha = 0.72;
  ctx.fillStyle = rainbowGradient(ctx, -39, 5, 39, 27, t + 0.2, 1, 62, 100, 300);
  ctx.fillRect(-42, -2, 84, 36);
  ctx.restore();
  ctx.strokeStyle = rainbowGradient(ctx, -39, 4, 39, 30, t + 0.75, 1, 72, 100, 300);
  ctx.lineWidth = 2.4;
  ctx.stroke();

  // Crown crystals frame the bore with a colorful, unmistakably magical profile.
  for (const side of [-1, 1]) {
    ctx.save();
    ctx.scale(side, 1);
    ctx.beginPath();
    ctx.moveTo(31, 20);
    ctx.lineTo(48, -8);
    ctx.lineTo(57, 4);
    ctx.lineTo(45, 28);
    ctx.closePath();
    const crystal = ctx.createLinearGradient(34, 22, 55, -7);
    crystal.addColorStop(0, hsl(hue + 210, 100, 56, 0.35));
    crystal.addColorStop(0.32, hsl(hue + 135, 100, 70, 0.95));
    crystal.addColorStop(0.68, hsl(hue + 55, 100, 79, 0.98));
    crystal.addColorStop(1, "rgba(255,255,255,0.76)");
    ctx.fillStyle = crystal;
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.72)";
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255,0.42)";
    ctx.beginPath();
    ctx.moveTo(45, 21);
    ctx.lineTo(48, -5);
    ctx.stroke();
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const gemGlow = ctx.createRadialGradient(53, -2, 0, 53, -2, 12);
    gemGlow.addColorStop(0, "rgba(255,255,255,0.98)");
    gemGlow.addColorStop(0.25, hsl(hue + 70, 100, 80, 0.8));
    gemGlow.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = gemGlow;
    ctx.beginPath();
    ctx.arc(53, -2, 12, 0, TAU);
    ctx.fill();
    ctx.restore();
    ctx.restore();
  }

  // Horizontal muzzle brake sells the gun silhouette.
  rr(ctx, -48, 24, 96, 10, 3);
  ctx.fillStyle = rainbowGradient(ctx, -48, 24, 48, 34, t + 0.45, 0.85, 54, 100, 290);
  ctx.fill();
  rr(ctx, -45, 26, 90, 6, 2);
  const brakeShade = ctx.createLinearGradient(-45, 0, 45, 0);
  brakeShade.addColorStop(0, "rgba(0,0,0,0.7)");
  brakeShade.addColorStop(0.18, "rgba(255,255,255,0.08)");
  brakeShade.addColorStop(0.5, "rgba(0,0,0,0.35)");
  brakeShade.addColorStop(0.82, "rgba(255,255,255,0.08)");
  brakeShade.addColorStop(1, "rgba(0,0,0,0.7)");
  ctx.fillStyle = brakeShade;
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.38)";
  ctx.stroke();
  for (const x of [-39, -30, 30, 39]) {
    rr(ctx, x - 3, 26, 6, 5, 1);
    ctx.fillStyle = "rgba(0,0,0,0.9)";
    ctx.fill();
  }

  // Hexagonal holy emitter at the bore.
  ctx.save();
  ctx.translate(0, 10);
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = -Math.PI / 2 + (i / 6) * TAU;
    const x = Math.cos(a) * 14;
    const y = Math.sin(a) * 12;
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = "#050309";
  ctx.fill();
  ctx.strokeStyle = rainbowGradient(ctx, -14, 0, 14, 0, t, 1, 72);
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.globalCompositeOperation = "lighter";
  const ready = v.ready ? 0.72 + pulse * 0.28 : 0.28;
  const emitter = ctx.createRadialGradient(0, 0, 0, 0, 0, 13);
  emitter.addColorStop(0, `rgba(255,255,255,${ready})`);
  emitter.addColorStop(0.3, hsl(hue + 45, 100, 82, ready * 0.8));
  emitter.addColorStop(1, hsl(hue + 130, 100, 60, 0));
  ctx.fillStyle = emitter;
  ctx.beginPath();
  ctx.arc(0, 0, 13, 0, TAU);
  ctx.fill();
  ctx.restore();

  // Small sight sits off-axis, another recognizable firearm cue.
  ctx.beginPath();
  ctx.moveTo(-34, 37);
  ctx.lineTo(-49, 29);
  ctx.lineTo(-51, 12);
  ctx.lineTo(-44, 8);
  ctx.lineTo(-39, 27);
  ctx.closePath();
  ctx.fillStyle = "#292035";
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.35)";
  ctx.stroke();
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.fillStyle = hsl(hue + 80, 100, 76, 0.9);
  ctx.beginPath();
  ctx.arc(-47, 10, 3.5, 0, TAU);
  ctx.fill();
  ctx.restore();

  // Orbiting holy stars add premium magical detail without changing the gun silhouette.
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < 7; i++) {
    const a = t * (0.7 + (i % 3) * 0.16) + i * 2.31;
    const radius = 63 + (i % 3) * 13;
    const sx = Math.cos(a) * radius;
    const sy = 125 + Math.sin(a) * radius * 0.58;
    const twinkle = 0.45 + 0.55 * Math.abs(Math.sin(t * 5 + i * 1.7));
    const size = 2 + twinkle * 3;
    ctx.strokeStyle = hsl(hue + i * 52, 100, 86, 0.36 + twinkle * 0.5);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(sx - size, sy);
    ctx.lineTo(sx + size, sy);
    ctx.moveTo(sx, sy - size);
    ctx.lineTo(sx, sy + size);
    ctx.stroke();
  }
  ctx.restore();

  ctx.restore();

  // Muzzle flash remains centered at the actual bore.
  if (v.flash > 0.01) {
    const f = v.flash;
    ctx.save();
    ctx.translate(v.x, v.muzzleY + 2);
    ctx.globalCompositeOperation = "lighter";
    const flash = ctx.createRadialGradient(0, 0, 0, 0, 0, 35 + f * 68);
    flash.addColorStop(0, `rgba(255,255,255,${0.98 * f})`);
    flash.addColorStop(0.2, hsl(hue + 40, 100, 82, 0.82 * f));
    flash.addColorStop(0.55, hsl(hue + 140, 100, 63, 0.34 * f));
    flash.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = flash;
    ctx.beginPath();
    ctx.arc(0, 0, 35 + f * 68, 0, TAU);
    ctx.fill();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU + t;
      const length = 28 + f * (55 + (i % 2) * 28);
      ctx.save();
      ctx.rotate(a);
      const ray = ctx.createLinearGradient(0, 0, 0, -length);
      ray.addColorStop(0, hsl(hue + i * 55, 100, 85, 0.78 * f));
      ray.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = ray;
      ctx.beginPath();
      ctx.moveTo(-3 - f * 3, 0);
      ctx.lineTo(0, -length);
      ctx.lineTo(3 + f * 3, 0);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    ctx.strokeStyle = hsl(hue + 60, 100, 86, 0.65 * f);
    ctx.lineWidth = 3 + f * 3;
    ctx.beginPath();
    ctx.arc(0, 0, 15 + (1 - f) * 65, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }
}

/* ------------------------------------------------------------------ */
/* THE BLACK HOLE GUN                                                 */
/* ------------------------------------------------------------------ */

function bhGradient(
  ctx: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  _t: number,
  alpha: number
) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  g.addColorStop(0, `hsla(260, 100%, 40%, ${alpha * 0.9})`);
  g.addColorStop(0.22, `hsla(290, 100%, 55%, ${alpha * 0.85})`);
  g.addColorStop(0.42, `hsla(190, 100%, 65%, ${alpha * 0.75})`);
  g.addColorStop(0.62, `hsla(270, 100%, 60%, ${alpha * 0.85})`);
  g.addColorStop(0.82, `hsla(310, 100%, 70%, ${alpha * 0.7})`);
  g.addColorStop(1, `hsla(250, 100%, 45%, ${alpha * 0.9})`);
  return g;
}

export function drawBlackHoleGun(ctx: CanvasRenderingContext2D, v: GunView) {
  const { hue, recoil, flash, ammo, shots, ready } = v;
  const { t } = v;
  const rec = recoil;
  const pulse = 0.5 + 0.5 * Math.sin(t * 2.6);
  const accretion = 0.5 + 0.5 * Math.sin(t * 4 + pulse);

  ctx.save();
  ctx.translate(v.x, v.muzzleY + rec * 24);
  ctx.scale(0.88 + rec * 0.02, 1 - rec * 0.015);

  // ---------- void aura ----------
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const voidGlow = ctx.createRadialGradient(0, 130, 6, 0, 130, 200);
  voidGlow.addColorStop(0, `hsla(270, 100%, 35%, ${0.12 + pulse * 0.06})`);
  voidGlow.addColorStop(0.4, `hsla(200, 100%, 40%, ${0.05 + pulse * 0.03})`);
  voidGlow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = voidGlow;
  ctx.fillRect(-150, -20, 300, 320);
  ctx.restore();

  // ---------- rear gravitational lensing ring ----------
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.strokeStyle = `hsla(200, 100%, 60%, ${0.35 + pulse * 0.25})`;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, 152, 34 + Math.sin(t * 3) * 2, 0, TAU);
  ctx.stroke();
  ctx.strokeStyle = `hsla(290, 100%, 65%, ${0.25 + pulse * 0.2})`;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(0, 152, 26 + Math.sin(t * 3 + 1) * 2, 0, TAU);
  ctx.stroke();
  ctx.restore();

  // ---------- accretion wing bands ----------
  for (const side of [-1, 1]) {
    ctx.save();
    ctx.scale(side, 1);
    for (let i = 0; i < 5; i++) {
      const rootY = 110 + i * 13;
      const tipX = 82 - i * 6;
      const tipY = 88 + i * 22;
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.beginPath();
      ctx.moveTo(34, rootY);
      ctx.quadraticCurveTo(58, rootY - 14, tipX, tipY);
      ctx.quadraticCurveTo(78 - i * 4, tipY + 18, 40, rootY + 14);
      ctx.closePath();
      const band = bhGradient(ctx, 34, rootY, tipX, tipY, t, 0.85);
      ctx.fillStyle = band;
      ctx.fill();
      ctx.restore();

      // bright accretion edge
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.strokeStyle = `hsla(${190 + i * 40}, 100%, 75%, ${0.6 + accretion * 0.4})`;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(40, rootY + 2);
      ctx.quadraticCurveTo(64, rootY - 6, tipX - 4, tipY + 2);
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }

  // ---------- obsidian stock ----------
  ctx.beginPath();
  ctx.moveTo(-32, 162);
  ctx.lineTo(-56, 176);
  ctx.lineTo(-70, 216);
  ctx.lineTo(-64, 247);
  ctx.lineTo(-41, 253);
  ctx.lineTo(-16, 203);
  ctx.lineTo(-11, 170);
  ctx.closePath();
  const stock = ctx.createLinearGradient(-70, 170, -15, 240);
  stock.addColorStop(0, "#0a080f");
  stock.addColorStop(0.3, "#241a30");
  stock.addColorStop(0.6, "#161024");
  stock.addColorStop(1, "#08060c");
  ctx.fillStyle = stock;
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.globalCompositeOperation = "screen";
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = bhGradient(ctx, -70, 175, -20, 245, t + 0.4, 1);
  ctx.fillRect(-74, 160, 64, 100);
  ctx.restore();
  ctx.strokeStyle = `hsla(270, 60%, 50%, 0.4)`;
  ctx.lineWidth = 2;
  ctx.stroke();

  // ---------- pistol grip ----------
  ctx.beginPath();
  ctx.moveTo(6, 176);
  ctx.lineTo(34, 174);
  ctx.lineTo(47, 251);
  ctx.lineTo(38, 266);
  ctx.lineTo(12, 263);
  ctx.lineTo(2, 198);
  ctx.closePath();
  const grip = ctx.createLinearGradient(2, 0, 47, 0);
  grip.addColorStop(0, "#0a080f");
  grip.addColorStop(0.35, "#2a1e38");
  grip.addColorStop(0.55, "#181226");
  grip.addColorStop(1, "#0a070f");
  ctx.fillStyle = grip;
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.18)";
  ctx.lineWidth = 1.5;
  ctx.stroke();
  for (let i = 0; i < 6; i++) {
    ctx.strokeStyle = i % 2 ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.5)";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(3, 201 + i * 11);
    ctx.lineTo(45, 190 + i * 11);
    ctx.stroke();
  }
  rr(ctx, 18, 252, 21, 7, 2.5);
  ctx.fillStyle = bhGradient(ctx, 18, 252, 41, 252, t, 0.8);
  ctx.fill();

  // ---------- trigger guard & trigger ----------
  ctx.save();
  ctx.strokeStyle = "#4a3c58";
  ctx.lineWidth = 6;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(12, 168);
  ctx.quadraticCurveTo(52, 170, 50, 198);
  ctx.quadraticCurveTo(47, 214, 26, 214);
  ctx.stroke();
  ctx.strokeStyle = "rgba(255,255,255,0.2)";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.strokeStyle = `hsla(190, 100%, 70%, ${0.8 + pulse * 0.2})`;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(26, 176);
  ctx.quadraticCurveTo(36, 184, 29, 198);
  ctx.stroke();
  ctx.restore();

  // ---------- main void receiver ----------
  ctx.beginPath();
  ctx.moveTo(-36, 94);
  ctx.lineTo(-54, 114);
  ctx.lineTo(-52, 160);
  ctx.lineTo(-34, 186);
  ctx.lineTo(30, 186);
  ctx.lineTo(50, 162);
  ctx.lineTo(53, 118);
  ctx.lineTo(36, 94);
  ctx.closePath();
  const receiver = ctx.createLinearGradient(-54, 108, 53, 178);
  receiver.addColorStop(0, "#0a080f");
  receiver.addColorStop(0.22, "#1a1228");
  receiver.addColorStop(0.48, "#0a080f");
  receiver.addColorStop(0.76, "#221630");
  receiver.addColorStop(1, "#08060c");
  ctx.fillStyle = receiver;
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.globalCompositeOperation = "screen";
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = bhGradient(ctx, -56, 102, 54, 184, t + 0.7, 1);
  ctx.fillRect(-58, 92, 114, 96);
  ctx.restore();
  ctx.strokeStyle = "rgba(255,255,255,0.12)";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // receiver accent rings
  ctx.beginPath();
  ctx.moveTo(-36, 94);
  ctx.lineTo(36, 94);
  ctx.lineTo(47, 108);
  ctx.lineTo(-47, 108);
  ctx.closePath();
  ctx.fillStyle = "rgba(255,255,255,0.04)";
  ctx.fill();
  ctx.strokeStyle = bhGradient(ctx, -44, 100, 44, 100, t, 0.9);
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-44, 106);
  ctx.lineTo(44, 106);
  ctx.stroke();

  // ---------- singularity chamber (left side) ----------
  const coreX = -15;
  const coreY = 144;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const chamberGlow = ctx.createRadialGradient(coreX, coreY, 0, coreX, coreY, 38);
  chamberGlow.addColorStop(0, "rgba(255,255,255,0.45)");
  chamberGlow.addColorStop(0.3, `hsla(190, 100%, 60%, ${0.3 + pulse * 0.2})`);
  chamberGlow.addColorStop(0.6, `hsla(290, 100%, 50%, ${0.2 + pulse * 0.15})`);
  chamberGlow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = chamberGlow;
  ctx.beginPath();
  ctx.arc(coreX, coreY, 38, 0, TAU);
  ctx.fill();
  ctx.restore();

  ctx.beginPath();
  ctx.arc(coreX, coreY, 22, 0, TAU);
  ctx.fillStyle = "#05040a";
  ctx.fill();
  const chamber = bhGradient(ctx, coreX, coreY, coreX + 14, coreY, t * 1.5, 1);
  ctx.beginPath();
  ctx.arc(coreX, coreY, 17, 0, TAU);
  ctx.fillStyle = chamber;
  ctx.fill();
  const lens = ctx.createRadialGradient(coreX - 5, coreY - 6, 0, coreX, coreY, 17);
  lens.addColorStop(0, "rgba(255,255,255,0.95)");
  lens.addColorStop(0.3, "rgba(255,255,255,0.2)");
  lens.addColorStop(1, "rgba(0,0,0,0.55)");
  ctx.fillStyle = lens;
  ctx.fill();
  ctx.strokeStyle = "rgba(235,245,255,0.7)";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(coreX, coreY, 21, 0, TAU);
  ctx.stroke();
  ctx.save();
  ctx.translate(coreX, coreY);
  ctx.rotate(t * 2.4);
  ctx.strokeStyle = "rgba(255,255,255,0.7)";
  ctx.lineWidth = 2;
  for (let i = 0; i < 3; i++) {
    ctx.rotate(TAU / 3);
    ctx.beginPath();
    ctx.arc(0, 0, 10, 0, 1.2);
    ctx.stroke();
  }
  ctx.restore();

  // ---------- ammo void cells (right side) ----------
  const shown = Math.min(shots, 9);
  const rows = Math.min(shown, 6);
  rr(ctx, 12, 118, 26, 48, 5);
  ctx.fillStyle = "rgba(2,2,8,0.75)";
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.1)";
  ctx.lineWidth = 1;
  ctx.stroke();
  const litRows = shots ? Math.ceil((ammo / shots) * rows) : 0;
  for (let i = 0; i < rows; i++) {
    const lit = i < litRows;
    const yy = 123 + i * 6.5;
    rr(ctx, 17, yy, 16, 3.5, 1.5);
    ctx.fillStyle = lit ? `hsla(${190 + i * 45}, 100%, 70%, 0.95)` : "rgba(255,255,255,0.06)";
    ctx.fill();
    if (lit) {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.shadowBlur = 7;
      ctx.shadowColor = `hsla(${190 + i * 45}, 100%, 65%, 0.9)`;
      ctx.fill();
      ctx.restore();
    }
  }

  // ---------- void collar ----------
  ctx.beginPath();
  ctx.moveTo(-47, 88);
  ctx.lineTo(-38, 78);
  ctx.lineTo(38, 78);
  ctx.lineTo(48, 88);
  ctx.lineTo(36, 102);
  ctx.lineTo(-37, 102);
  ctx.closePath();
  const collar = ctx.createLinearGradient(-48, 0, 49, 0);
  collar.addColorStop(0, "#08060c");
  collar.addColorStop(0.25, "#2a1e38");
  collar.addColorStop(0.5, "#0a080f");
  collar.addColorStop(0.75, "#2a1e38");
  collar.addColorStop(1, "#08060c");
  ctx.fillStyle = collar;
  ctx.fill();
  ctx.strokeStyle = bhGradient(ctx, -38, 82, 38, 82, t + 0.5, 0.95);
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.moveTo(-36, 87);
  ctx.lineTo(36, 87);
  ctx.stroke();

  // ---------- short void barrel ----------
  ctx.beginPath();
  ctx.moveTo(-26, 29);
  ctx.lineTo(-31, 78);
  ctx.lineTo(31, 78);
  ctx.lineTo(26, 29);
  ctx.closePath();
  const barrel = ctx.createLinearGradient(-31, 0, 31, 0);
  barrel.addColorStop(0, "#05040a");
  barrel.addColorStop(0.18, "#1a1228");
  barrel.addColorStop(0.43, "#08060c");
  barrel.addColorStop(0.62, "#2a1e38");
  barrel.addColorStop(1, "#05040a");
  ctx.fillStyle = barrel;
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.globalCompositeOperation = "screen";
  ctx.globalAlpha = 0.45;
  ctx.fillStyle = bhGradient(ctx, -31, 32, 31, 76, t + 1.2, 1);
  ctx.fillRect(-33, 27, 68, 52);
  ctx.restore();
  ctx.strokeStyle = `hsla(200, 80%, 60%, 0.45)`;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // segmented accretion rails
  for (let i = 0; i < 4; i++) {
    const yy = 37 + i * 10;
    rr(ctx, -16, yy, 32, 5, 2);
    ctx.fillStyle = "#020206";
    ctx.fill();
    rr(ctx, -13, yy + 1.2, 26, 3, 1.2);
    ctx.fillStyle = bhGradient(ctx, -13, yy, 13, yy, t + i * 0.2, 0.95);
    ctx.fill();
  }
  ctx.strokeStyle = "rgba(255,255,255,0.1)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-22, 33);
  ctx.lineTo(-25, 72);
  ctx.moveTo(22, 33);
  ctx.lineTo(25, 72);
  ctx.stroke();

  // ---------- void capacitor pods ----------
  for (const side of [-1, 1]) {
    ctx.save();
    ctx.scale(side, 1);
    ctx.beginPath();
    ctx.moveTo(26, 41);
    ctx.lineTo(41, 46);
    ctx.lineTo(46, 66);
    ctx.lineTo(33, 76);
    ctx.lineTo(28, 69);
    ctx.closePath();
    const pod = ctx.createLinearGradient(26, 44, 46, 74);
    pod.addColorStop(0, "#0e0a18");
    pod.addColorStop(0.28, `hsla(${hue + 40}, 100%, 60%, 0.95)`);
    pod.addColorStop(0.58, `hsla(${hue + 135}, 100%, 55%, 0.9)`);
    pod.addColorStop(1, "#0a0812");
    ctx.fillStyle = pod;
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.3)";
    ctx.lineWidth = 1.2;
    ctx.stroke();
    for (let i = 0; i < 3; i++) {
      ctx.strokeStyle = `hsla(${hue + 100 + i * 45}, 100%, 75%, ${0.45 + accretion * 0.35})`;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(33, 51 + i * 6.5);
      ctx.lineTo(41, 52 + i * 6.5);
      ctx.stroke();
    }
    ctx.restore();
  }

  // ---------- event horizon muzzle ----------
  ctx.beginPath();
  ctx.moveTo(-36, 29);
  ctx.lineTo(-38, 12);
  ctx.lineTo(-27, 0);
  ctx.lineTo(-11, 0);
  ctx.lineTo(-8, 16);
  ctx.lineTo(8, 16);
  ctx.lineTo(11, 0);
  ctx.lineTo(27, 0);
  ctx.lineTo(38, 12);
  ctx.lineTo(36, 29);
  ctx.closePath();
  const muzzle = ctx.createLinearGradient(-38, 0, 38, 0);
  muzzle.addColorStop(0, "#040308");
  muzzle.addColorStop(0.24, "#1a1228");
  muzzle.addColorStop(0.48, "#08060c");
  muzzle.addColorStop(0.76, "#221630");
  muzzle.addColorStop(1, "#040308");
  ctx.fillStyle = muzzle;
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.45)";
  ctx.lineWidth = 1.4;
  ctx.stroke();

  // muzzle brake (dark with spectral slits)
  rr(ctx, -47, 22, 94, 9, 2.5);
  ctx.fillStyle = "#0a080f";
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.25)";
  ctx.stroke();
  for (const x of [-38, -28, 28, 38]) {
    rr(ctx, x - 2.5, 24, 5, 4, 1);
    ctx.fillStyle = "#040308";
    ctx.fill();
  }

  // ---------- hexagonal event horizon emitter ----------
  ctx.save();
  ctx.translate(0, 8);
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = -Math.PI / 2 + (i / 6) * TAU;
    const x = Math.cos(a) * 13;
    const y = Math.sin(a) * 11;
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = "#040308";
  ctx.fill();
  ctx.strokeStyle = bhGradient(ctx, -13, 0, 13, 0, t, 1);
  ctx.lineWidth = 3;
  ctx.stroke();

  // singularity core pulse
  ctx.globalCompositeOperation = "lighter";
  const readyGlow = ready ? 0.8 + pulse * 0.2 : 0.3;
  const emitterGlow = ctx.createRadialGradient(0, 0, 0, 0, 0, 12);
  emitterGlow.addColorStop(0, `rgba(255,255,255,${readyGlow})`);
  emitterGlow.addColorStop(0.3, `hsla(${hue + 40}, 100%, 80%, ${readyGlow * 0.85})`);
  emitterGlow.addColorStop(1, `hsla(${hue + 140}, 100%, 55%, 0)`);
  ctx.fillStyle = emitterGlow;
  ctx.beginPath();
  ctx.arc(0, 0, 12, 0, TAU);
  ctx.fill();
  ctx.restore();

  // ---------- off-axis sight ----------
  ctx.beginPath();
  ctx.moveTo(-33, 35);
  ctx.lineTo(-48, 27);
  ctx.lineTo(-50, 11);
  ctx.lineTo(-43, 7);
  ctx.lineTo(-38, 25);
  ctx.closePath();
  ctx.fillStyle = "#1a1028";
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.25)";
  ctx.stroke();
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.fillStyle = `hsla(${hue + 80}, 100%, 75%, 0.9)`;
  ctx.beginPath();
  ctx.arc(-46, 9, 3.5, 0, TAU);
  ctx.fill();
  ctx.restore();

  // ---------- orbiting dark matter stars ----------
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < 7; i++) {
    const a = t * (0.6 + (i % 3) * 0.14) + i * 2.1;
    const radius = 60 + (i % 3) * 12;
    const sx = Math.cos(a) * radius;
    const sy = 122 + Math.sin(a) * radius * 0.55;
    const twinkle = 0.4 + 0.6 * Math.abs(Math.sin(t * 4.5 + i * 1.5));
    const size = 1.5 + twinkle * 2.5;
    ctx.strokeStyle = `hsla(${hue + i * 48}, 100%, 85%, ${0.3 + twinkle * 0.55})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(sx - size, sy);
    ctx.lineTo(sx + size, sy);
    ctx.moveTo(sx, sy - size);
    ctx.lineTo(sx, sy + size);
    ctx.stroke();
  }
  ctx.restore();

  ctx.restore();

  // ---------- black hole muzzle flash ----------
  if (flash > 0.01) {
    const f = flash;
    ctx.save();
    ctx.translate(v.x, v.muzzleY + 2);
    ctx.globalCompositeOperation = "lighter";
    const flashGlow = ctx.createRadialGradient(0, 0, 0, 0, 0, 30 + f * 60);
    flashGlow.addColorStop(0, `rgba(255,255,255,${0.95 * f})`);
    flashGlow.addColorStop(0.2, `hsla(${hue + 40}, 100%, 75%, ${0.8 * f})`);
    flashGlow.addColorStop(0.55, `hsla(${hue + 140}, 100%, 55%, ${0.3 * f})`);
    flashGlow.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = flashGlow;
    ctx.beginPath();
    ctx.arc(0, 0, 30 + f * 60, 0, TAU);
    ctx.fill();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU + t;
      const length = 26 + f * (50 + (i % 2) * 24);
      ctx.save();
      ctx.rotate(a);
      const ray = ctx.createLinearGradient(0, 0, 0, -length);
      ray.addColorStop(0, `hsla(${hue + i * 50}, 100%, 80%, ${0.75 * f})`);
      ray.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = ray;
      ctx.beginPath();
      ctx.moveTo(-2.5 - f * 2.5, 0);
      ctx.lineTo(0, -length);
      ctx.lineTo(2.5 + f * 2.5, 0);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    ctx.strokeStyle = `hsla(${hue + 60}, 100%, 85%, ${0.6 * f})`;
    ctx.lineWidth = 2.5 + f * 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, 14 + (1 - f) * 58, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }
}

/* ------------------------------------------------------------------ */
/* particles + popups                                                 */
/* ------------------------------------------------------------------ */

export function drawParticles(ctx: CanvasRenderingContext2D, ps: ParticleView[]) {
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (const p of ps) {
    const k = 1 - p.t / p.life;
    if (p.kind === 4) {
      // ray streak
      const x2 = p.x - p.vx * 0.055;
      const y2 = p.y - p.vy * 0.055;
      const g = ctx.createLinearGradient(p.x, p.y, x2, y2);
      g.addColorStop(0, hsl(p.hue, 100, 92, k));
      g.addColorStop(0.35, hsl(p.hue, 100, 68, 0.6 * k));
      g.addColorStop(1, hsl(p.hue + 40, 100, 55, 0));
      ctx.strokeStyle = g;
      ctx.lineWidth = Math.max(0.5, (p.w ?? 6) * k);
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    } else if (p.kind === 5) {
      // lingering flare
      const r = p.size * (1 + (1 - k) * 0.8);
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
      g.addColorStop(0, `rgba(255,255,255,${0.8 * k})`);
      g.addColorStop(0.28, hsl(p.hue, 100, 72, 0.55 * k));
      g.addColorStop(0.62, hsl(p.hue + 70, 100, 60, 0.2 * k));
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, TAU);
      ctx.fill();
    } else if (p.kind === 6) {
      // prismatic chromatic ring
      const r = p.size * (1 + (1 - k) * 3.4);
      const bands = [
        [0, 0.9],
        [120, 1],
        [215, 1.1],
      ];
      for (const [hue, sc] of bands) {
        ctx.strokeStyle = hsl(hue, 100, 62, 0.5 * k);
        ctx.lineWidth = 3.2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r * sc, 0, TAU);
        ctx.stroke();
      }
    } else if (p.kind === 7) {
      // ember with tail
      const fl = 0.45 + 0.55 * Math.abs(Math.sin(p.t * 34 + p.rot * 9));
      ctx.strokeStyle = hsl(p.hue, 100, 62, 0.7 * k);
      ctx.lineWidth = Math.max(0.4, p.size * 0.9 * k);
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x - p.vx * 0.05, p.y - p.vy * 0.05);
      ctx.stroke();
      ctx.fillStyle = hsl(p.hue, 100, 90, k * fl);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (0.6 + 0.5 * fl) * k + 0.3, 0, TAU);
      ctx.fill();
    } else if (p.kind === 8) {
      // confetti
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = hsl(p.hue, 100, 68, k);
      ctx.fillRect(-p.size * 0.3, -p.size, p.size * 0.6, p.size * 2);
      ctx.fillStyle = `rgba(255,255,255,${0.5 * k})`;
      ctx.fillRect(-p.size * 0.3, -p.size, p.size * 0.6, p.size * 0.5);
      ctx.restore();
    } else if (p.kind === 0) {
      ctx.fillStyle = hsl(p.hue, 100, 60, 0.22 * k);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * 2.6 * k, 0, TAU);
      ctx.fill();
      ctx.fillStyle = hsl(p.hue, 100, 85, k);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * k, 0, TAU);
      ctx.fill();
    } else if (p.kind === 1) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = hsl(p.hue, 100, 68, 0.9 * k);
      ctx.beginPath();
      ctx.moveTo(0, -p.size * 2);
      ctx.lineTo(p.size * 0.7, p.size);
      ctx.lineTo(-p.size * 0.7, p.size);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    } else if (p.kind === 2) {
      ctx.strokeStyle = hsl(p.hue, 100, 72, 0.8 * k);
      ctx.lineWidth = 3 * k + 0.5;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (1 + (1 - k) * 2.4), 0, TAU);
      ctx.stroke();
    } else {
      const s = p.size * (1 + k);
      ctx.strokeStyle = hsl(p.hue, 100, 80, k);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(p.x - s, p.y);
      ctx.lineTo(p.x + s, p.y);
      ctx.moveTo(p.x, p.y - s);
      ctx.lineTo(p.x, p.y + s);
      ctx.stroke();
    }
  }
  ctx.restore();
}

export function drawPopups(ctx: CanvasRenderingContext2D, ps: PopupView[]) {
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (const p of ps) {
    const k = clamp(p.t / p.life, 0, 1);
    const grow = k < 0.25 ? 0.4 + 2.6 * k : 1.1 - 0.1 * (k - 0.25);
    const alpha = k > 0.7 ? 1 - (k - 0.7) / 0.3 : 1;
    ctx.save();
    ctx.translate(p.x, p.y - k * 46);
    ctx.scale(grow, grow);
    ctx.globalAlpha = alpha;
    ctx.font = "900 30px ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif";
    ctx.lineWidth = 7;
    ctx.strokeStyle = "rgba(8,3,16,0.85)";
    ctx.strokeText(p.text, 0, 0);
    ctx.fillStyle = rainbowGradient(ctx, -90, 0, 90, 0, p.t * 3 + p.hue, 1, 72);
    ctx.fillText(p.text, 0, 0);
    if (p.sub) {
      ctx.font = "800 15px ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif";
      ctx.lineWidth = 5;
      ctx.strokeStyle = "rgba(8,3,16,0.8)";
      ctx.strokeText(p.sub, 0, 26);
      ctx.fillStyle = "rgba(255,255,255,0.92)";
      ctx.fillText(p.sub, 0, 26);
    }
    ctx.restore();
  }
  ctx.restore();
}
