import {
  P,
  TAU,
  clamp,
  emissionCount,
  lerp,
  lightning,
  metal,
  pick,
  rnd,
  roundRect,
  withAlpha,
  audio,
} from "./core";
import type { Beam, Bullet, GameAPI, Weapon, WeaponDrawState } from "./types";
import { drawWeaponMark } from "./marks";
import {
  drawMartianTripod,
  drawProtonPack,
  drawRepulsorHand,
} from "./signatureModels";
import { predatorShoulder } from "./predator";
import { FIRE_SPECS, fireMotion, firingMuzzleOffset } from "./fireMotion";
import {
  catchDisc,
  discharge,
  firePulse,
  fireStream,
  signatureImpact,
} from "./signatureFx";

/* ============================ shared helpers ============================ */

const gunmetal = (ctx: CanvasRenderingContext2D, y0: number, y1: number) =>
  metal(ctx, y0, y1, "#8d95a3", "#2f353f", "#0e1116");
const blacksteel = (ctx: CanvasRenderingContext2D, y0: number, y1: number) =>
  metal(ctx, y0, y1, "#5d646f", "#20242b", "#07080b");
function wood(ctx: CanvasRenderingContext2D, y0: number, y1: number) {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, "#c98a4b");
  g.addColorStop(0.4, "#9a5a28");
  g.addColorStop(0.75, "#6f3b17");
  g.addColorStop(1, "#3d1e0a");
  return g;
}

function bar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  fill: string | CanvasGradient,
  r = 2,
) {
  roundRect(ctx, x, y, w, h, r);
  ctx.fillStyle = fill;
  ctx.fill();
}

function outline(ctx: CanvasRenderingContext2D, a = 0.5, w = 1) {
  ctx.strokeStyle = `rgba(0,0,0,${a})`;
  ctx.lineWidth = w;
  ctx.stroke();
}

function emissive(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  color: string,
  a = 1,
) {
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, withAlpha("#ffffff", 0.95 * a));
  g.addColorStop(0.3, withAlpha(color, 0.8 * a));
  g.addColorStop(1, withAlpha(color, 0));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
  ctx.restore();
}

function rivet(ctx: CanvasRenderingContext2D, x: number, y: number, r = 2) {
  const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, 0.2, x, y, r);
  g.addColorStop(0, "#eef2f7");
  g.addColorStop(0.38, "#8c96a4");
  g.addColorStop(1, "#252b34");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.55)";
  ctx.lineWidth = 0.7;
  ctx.stroke();
  ctx.strokeStyle = "rgba(20,26,34,0.75)";
  ctx.lineWidth = 0.55;
  ctx.beginPath();
  ctx.moveTo(x - r * 0.45, y);
  ctx.lineTo(x + r * 0.45, y);
  ctx.stroke();
}

function glowingRivet(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  color: string,
  pulse: number,
) {
  ctx.fillStyle = "#101722";
  ctx.beginPath();
  ctx.arc(x, y, r + 1.5, 0, TAU);
  ctx.fill();
  ctx.fillStyle = withAlpha(color, 0.45 + pulse * 0.45);
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
  emissive(ctx, x, y, r * 3.4, color, 0.25 + pulse * 0.42);
}

/* ------------------------------ fx recipes ------------------------------ */

function muzzleFlash(
  api: GameAPI,
  x: number,
  y: number,
  a: number,
  o: {
    color: string;
    color2: string;
    size: number;
    sparks?: number;
    smoke?: number;
    casing?: boolean;
  },
) {
  const { particles: ps } = api;
  ps.push(
    P({
      type: "flash",
      x,
      y,
      size: o.size,
      color: o.color,
      color2: o.color2,
      life: 0.1,
    }),
  );
  ps.push(
    P({
      type: "ring",
      x,
      y,
      size: o.size * 0.95,
      size2: o.size * 0.18,
      color: o.color,
      width: 4.5,
      life: 0.13,
    }),
  );
  // flame petals forward
  for (let i = 0; i < 7; i++) {
    const sp = rnd(220, 620);
    const ang = a + rnd(-0.34, 0.34);
    ps.push(
      P({
        type: "fire",
        x: x + Math.cos(a) * rnd(0, 14),
        y: y + Math.sin(a) * rnd(0, 14),
        vx: Math.cos(ang) * sp,
        vy: Math.sin(ang) * sp,
        size: o.size * rnd(0.3, 0.6),
        size2: o.size * 0.12,
        color: o.color,
        color2: o.color2,
        life: rnd(0.07, 0.16),
        drag: 0.86,
      }),
    );
  }
  for (let i = 0; i < (o.sparks ?? 10); i++) {
    const ang = a + rnd(-0.6, 0.6);
    const sp = rnd(260, 900);
    ps.push(
      P({
        type: "spark",
        x,
        y,
        vx: Math.cos(ang) * sp,
        vy: Math.sin(ang) * sp,
        color: pick(["#fff3c4", "#ffb347", "#ffe9a8"]),
        life: rnd(0.12, 0.34),
        grav: 420,
        drag: 0.93,
        width: 1.8,
      }),
    );
  }
  for (let i = 0; i < (o.smoke ?? 5); i++) {
    const ang = a + rnd(-0.5, 0.5);
    ps.push(
      P({
        type: "smoke",
        x: x + Math.cos(a) * 8,
        y: y + Math.sin(a) * 8,
        vx: Math.cos(ang) * rnd(30, 140),
        vy: Math.sin(ang) * rnd(30, 140) - 20,
        size: rnd(26, 52),
        size2: 6,
        color: "#9aa3ad",
        life: rnd(0.5, 1.1),
        drag: 0.94,
      }),
    );
  }
  if (o.casing) {
    const side = a - Math.PI / 2;
    api.particles.push(
      P({
        type: "casing",
        x,
        y,
        vx: Math.cos(side) * rnd(90, 190) - Math.cos(a) * 40,
        vy: Math.sin(side) * rnd(90, 190) - 160,
        size: 4.2,
        rot: rnd(TAU),
        spin: rnd(-18, 18),
        grav: 900,
        life: 1.2,
        drag: 0.995,
      }),
    );
  }
}

function energyMuzzle(
  api: GameAPI,
  x: number,
  y: number,
  a: number,
  color: string,
  color2: string,
  size = 46,
) {
  api.particles.push(
    P({ type: "flash", x, y, size, color, color2, life: 0.12 }),
  );
  api.particles.push(
    P({
      type: "ring",
      x,
      y,
      size: size * 0.9,
      size2: 3,
      color,
      width: 4,
      life: 0.2,
    }),
  );
  for (let i = 0; i < 10; i++) {
    const ang = a + rnd(-0.5, 0.5);
    api.particles.push(
      P({
        type: "spark",
        x,
        y,
        vx: Math.cos(ang) * rnd(200, 620),
        vy: Math.sin(ang) * rnd(200, 620),
        color,
        life: rnd(0.12, 0.3),
        drag: 0.9,
        width: 1.6,
      }),
    );
  }
  for (let i = 0; i < 3; i++) {
    api.particles.push(
      P({
        type: "bolt",
        x,
        y,
        rot: a + rnd(-0.9, 0.9),
        size: rnd(16, 34),
        color,
        life: 0.1,
        width: 1.6,
      }),
    );
  }
}

function woodChips(
  api: GameAPI,
  x: number,
  y: number,
  a: number,
  n = 12,
  power = 1,
) {
  for (let i = 0; i < n; i++) {
    const ang = a + Math.PI + rnd(-1.1, 1.1);
    api.particles.push(
      P({
        type: "shard",
        x,
        y,
        vx: Math.cos(ang) * rnd(100, 420) * power,
        vy: Math.sin(ang) * rnd(100, 420) * power - 60,
        size: rnd(2.4, 6.5),
        color: pick(["#8a5a2b", "#a9713a", "#6b4320"]),
        color2: "#d6a66b",
        rot: rnd(TAU),
        spin: rnd(-20, 20),
        grav: 1100,
        life: rnd(0.6, 1.3),
        drag: 0.99,
      }),
    );
  }
  for (let i = 0; i < 4; i++) {
    api.particles.push(
      P({
        type: "smoke",
        x,
        y,
        vx: rnd(-50, 50),
        vy: rnd(-90, -10),
        size: rnd(18, 34),
        size2: 4,
        color: "#c7b299",
        life: rnd(0.4, 0.9),
      }),
    );
  }
}

function kineticImpact(
  api: GameAPI,
  x: number,
  y: number,
  a: number,
  power = 1,
  color = "#ffd27d",
) {
  api.particles.push(
    P({
      type: "flash",
      x,
      y,
      size: 34 * power,
      color,
      color2: "#ff8a3c",
      life: 0.09,
    }),
  );
  for (let i = 0; i < 18 * power; i++) {
    const ang = a + Math.PI + rnd(-1.4, 1.4);
    api.particles.push(
      P({
        type: "spark",
        x,
        y,
        vx: Math.cos(ang) * rnd(150, 900) * power,
        vy: Math.sin(ang) * rnd(150, 900) * power,
        color: pick(["#fff6d0", "#ffcf6b", "#ff9b3d"]),
        life: rnd(0.15, 0.5),
        grav: 900,
        drag: 0.93,
        width: 1.9,
      }),
    );
  }
  woodChips(api, x, y, a, Math.round(10 * power), power);
  api.particles.push(
    P({
      type: "ring",
      x,
      y,
      size: 46 * power,
      size2: 6,
      color: "#ffd9a0",
      width: 3,
      life: 0.3,
    }),
  );
}

function electroImpact(
  api: GameAPI,
  x: number,
  y: number,
  a: number,
  color: string,
  color2: string,
) {
  api.particles.push(
    P({ type: "flash", x, y, size: 56, color, color2, life: 0.14 }),
  );
  for (let i = 0; i < 10; i++) {
    api.particles.push(
      P({
        type: "bolt",
        x,
        y,
        rot: rnd(TAU),
        size: rnd(24, 68),
        color,
        life: rnd(0.1, 0.26),
        width: 2,
      }),
    );
  }
  for (let i = 0; i < 22; i++) {
    const ang = rnd(TAU);
    api.particles.push(
      P({
        type: "spark",
        x,
        y,
        vx: Math.cos(ang) * rnd(120, 700),
        vy: Math.sin(ang) * rnd(120, 700),
        color: pick([color, "#ffffff", color2]),
        life: rnd(0.14, 0.42),
        drag: 0.9,
        grav: 300,
        width: 2,
      }),
    );
  }
  for (let i = 0; i < 3; i++)
    api.particles.push(
      P({
        type: "ring",
        x,
        y,
        size: rnd(60, 110),
        size2: 4,
        color,
        width: 2.4,
        life: rnd(0.25, 0.45),
      }),
    );
  woodChips(api, x, y, a, 6, 0.7);
}

function fireImpact(api: GameAPI, x: number, y: number, a: number) {
  api.particles.push(
    P({
      type: "flash",
      x,
      y,
      size: 70,
      color: "#ffb13c",
      color2: "#ff3d00",
      life: 0.16,
    }),
  );
  for (let i = 0; i < 26; i++) {
    const ang = a + Math.PI + rnd(-1.5, 1.5);
    api.particles.push(
      P({
        type: "fire",
        x,
        y,
        vx: Math.cos(ang) * rnd(60, 420),
        vy: Math.sin(ang) * rnd(60, 420) - 90,
        size: rnd(22, 48),
        size2: 5,
        color: "#ff7a18",
        color2: "#b31200",
        life: rnd(0.3, 0.75),
        drag: 0.9,
      }),
    );
  }
  for (let i = 0; i < 24; i++) {
    const ang = rnd(TAU);
    api.particles.push(
      P({
        type: "ember",
        x,
        y,
        vx: Math.cos(ang) * rnd(60, 380),
        vy: Math.sin(ang) * rnd(60, 380) - 120,
        size: rnd(1.4, 3),
        color: "#ffd27a",
        color2: "#ff5500",
        life: rnd(0.6, 1.5),
        grav: 260,
        drag: 0.96,
      }),
    );
  }
  for (let i = 0; i < 6; i++)
    api.particles.push(
      P({
        type: "smoke",
        x,
        y,
        vx: rnd(-80, 80),
        vy: rnd(-160, -40),
        size: rnd(40, 80),
        size2: 10,
        color: "#4b4038",
        life: rnd(0.9, 1.8),
      }),
    );
}

function plasmaImpact(
  api: GameAPI,
  x: number,
  y: number,
  color: string,
  color2: string,
  power = 1,
) {
  api.particles.push(
    P({ type: "flash", x, y, size: 80 * power, color, color2, life: 0.18 }),
  );
  for (let i = 0; i < 3; i++)
    api.particles.push(
      P({
        type: "ring",
        x,
        y,
        size: (70 + i * 40) * power,
        size2: 5,
        color,
        width: 3.4,
        life: 0.3 + i * 0.12,
      }),
    );
  for (let i = 0; i < 26; i++) {
    const ang = rnd(TAU);
    api.particles.push(
      P({
        type: "spark",
        x,
        y,
        vx: Math.cos(ang) * rnd(140, 820) * power,
        vy: Math.sin(ang) * rnd(140, 820) * power,
        color: pick([color, "#ffffff", color2]),
        life: rnd(0.2, 0.5),
        drag: 0.92,
        grav: 200,
        width: 2.2,
      }),
    );
  }
  for (let i = 0; i < 12; i++) {
    const ang = rnd(TAU);
    api.particles.push(
      P({
        type: "ember",
        x,
        y,
        vx: Math.cos(ang) * rnd(50, 260),
        vy: Math.sin(ang) * rnd(50, 260),
        size: rnd(1.6, 3.4),
        color,
        color2,
        life: rnd(0.4, 1),
        grav: 320,
      }),
    );
  }
}

function burnImpact(
  api: GameAPI,
  x: number,
  y: number,
  color: string,
  color2: string,
) {
  api.particles.push(
    P({ type: "flash", x, y, size: 64, color, color2, life: 0.2 }),
  );
  for (let i = 0; i < 16; i++) {
    const ang = rnd(TAU);
    api.particles.push(
      P({
        type: "ember",
        x,
        y,
        vx: Math.cos(ang) * rnd(40, 300),
        vy: Math.sin(ang) * rnd(40, 300) - 60,
        size: rnd(1.2, 2.8),
        color,
        color2,
        life: rnd(0.5, 1.3),
        grav: 300,
        drag: 0.95,
      }),
    );
  }
  for (let i = 0; i < 6; i++)
    api.particles.push(
      P({
        type: "smoke",
        x,
        y,
        vx: rnd(-50, 50),
        vy: rnd(-140, -30),
        size: rnd(30, 60),
        size2: 8,
        color: "#5a5048",
        life: rnd(0.8, 1.6),
      }),
    );
}

/* ============================== projectiles ============================== */

function trailPath(
  ctx: CanvasRenderingContext2D,
  b: Bullet,
  color: string,
  w: number,
  alpha = 1,
) {
  if (b.trail.length < 2) return;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (let pass = 0; pass < 2; pass++) {
    ctx.beginPath();
    for (let i = 0; i < b.trail.length; i++) {
      const p = b.trail[i];
      i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y);
    }
    ctx.strokeStyle = withAlpha(color, (pass === 0 ? 0.18 : 0.5) * alpha);
    ctx.lineWidth = pass === 0 ? w * 3 : w;
    ctx.stroke();
  }
  ctx.restore();
}

function drawDiscTrail(ctx: CanvasRenderingContext2D, b: Bullet) {
  if (b.trail.length < 2) return;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (let i = 1; i < b.trail.length; i++) {
    const a = b.trail[i - 1];
    const z = b.trail[i];
    const age = i / (b.trail.length - 1);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(z.x, z.y);
    ctx.strokeStyle = withAlpha("#22d3ee", 0.32 * age);
    ctx.lineWidth = 1 + 7 * age;
    ctx.stroke();
    ctx.strokeStyle = withAlpha("#d9ffff", 0.12 * age);
    ctx.lineWidth = 0.8 + 1.5 * age;
    ctx.stroke();
  }
  ctx.restore();
}

/* ================================ WEAPONS ================================ */

/* ---------------------------------- BOW --------------------------------- */
const bow: Weapon = {
  id: "bow",
  name: "Longbow Recurve",
  tag: "ARROW · CHARGE",
  accent: "#c8a165",
  accent2: "#6ee7b7",
  mode: "projectile",
  cooldown: 0.28,
  charged: true,
  recoilAmt: 15,
  len: 110,
  muzzle: [78, 0],
  iconScale: 0.62,
  markSize: 26,
  draw(ctx, s) {
    const ch = clamp(s.charge, 0, 1);
    const c = s.cycle !== undefined ? s.cycle : clamp((s.shotAge ?? 1) / 0.35, 0, 1);
    const chPow = Math.pow(ch, 0.75);
    const tremble = ch > 0.85 ? Math.sin(s.t * 50) * 1.8 * (ch - 0.85) : 0;
    const vib = ch < 0.02 && c < 1 ? Math.exp(-c * 7) * Math.sin(c * 96) * 8 * (1 - c) : 0;
    const pull = -72 * chPow + vib + tremble;
    const limbFlex = 14 * chPow;
    const limbX = -14 - limbFlex;
    // limbs
    const limb = (dir: number) => {
      ctx.beginPath();
      ctx.moveTo(4, 0);
      ctx.bezierCurveTo(
        16 - ch * 4,
        34 * dir,
        10 - limbFlex,
        62 * dir,
        limbX,
        84 * dir,
      );
      ctx.strokeStyle = "#3a2412";
      ctx.lineWidth = 9;
      ctx.lineCap = "round";
      ctx.stroke();
      const g = ctx.createLinearGradient(0, 0, -14, 84 * dir);
      g.addColorStop(0, "#d9a85f");
      g.addColorStop(0.5, "#a9742f");
      g.addColorStop(1, "#6a4216");
      ctx.strokeStyle = g;
      ctx.lineWidth = 6;
      ctx.stroke();
      ctx.strokeStyle = "rgba(255,224,170,0.5)";
      ctx.lineWidth = 1.4;
      ctx.stroke();
      // limb tip
      ctx.fillStyle = "#c9b48a";
      ctx.beginPath();
      ctx.arc(limbX, 84 * dir, 3.6, 0, TAU);
      ctx.fill();
      // limb collars
      ctx.strokeStyle = "rgba(247,220,169,0.7)";
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(3, 27 * dir, 4.2, -Math.PI * 0.35, Math.PI * 0.35);
      ctx.stroke();
    };
    limb(-1);
    limb(1);
    // riser / grip
    const rg = ctx.createLinearGradient(-6, 0, 12, 0);
    rg.addColorStop(0, "#2b1a0c");
    rg.addColorStop(0.5, "#7a4f23");
    rg.addColorStop(1, "#3d260f");
    bar(ctx, -5, -28, 14, 56, rg, 6);
    outline(ctx, 0.5);
    bar(ctx, -3, -10, 9, 22, "rgba(20,20,20,0.75)", 4);
    ctx.strokeStyle = "rgba(231,196,132,0.5)";
    ctx.lineWidth = 1;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(-2, -8 + i * 5);
      ctx.lineTo(5, -7 + i * 5);
      ctx.stroke();
    }
    // arrow rest
    ctx.fillStyle = "#d6b98a";
    ctx.fillRect(7, -3, 10, 3);
    // string
    ctx.strokeStyle = "rgba(240,245,255,0.92)";
    ctx.lineWidth = 1.7;
    ctx.beginPath();
    ctx.moveTo(limbX, -84);
    ctx.quadraticCurveTo(pull, -4, pull, 0);
    ctx.quadraticCurveTo(pull, 4, limbX, 84);
    ctx.stroke();

    // Reload animation just like Slide 6:
    // Arrow is absent while c <= 0.42 after release.
    // At c > 0.42, a new arrow smoothly slides in from behind and fades onto the string!
    const smoothStep = (a: number, b: number, x: number) => {
      const u = clamp((x - a) / (b - a), 0, 1);
      return u * u * (3 - 2 * u);
    };
    const showArrow = c > 0.42 || ch > 0.01;
    const slide = ch > 0.01 ? 0 : (1 - smoothStep(0.42, 0.66, c)) * 34;
    const aAlpha = ch > 0.01 ? 1 : smoothStep(0.42, 0.52, c);

    if (showArrow) {
      ctx.save();
      ctx.globalAlpha = aAlpha;
      ctx.translate(slide, -1.5);
      const tip = 92 + pull;
      const sg = ctx.createLinearGradient(0, -2, 0, 2);
      sg.addColorStop(0, "#f4e3c3");
      sg.addColorStop(0.5, "#c9a46a");
      sg.addColorStop(1, "#7d5a2c");
      bar(ctx, pull, -2, tip - pull - 12, 3.4, sg, 1.6);
      // broadhead
      ctx.beginPath();
      ctx.moveTo(tip, 0);
      ctx.lineTo(tip - 16, -7.5);
      ctx.lineTo(tip - 11, 0);
      ctx.lineTo(tip - 16, 7.5);
      ctx.closePath();
      const hg = ctx.createLinearGradient(tip - 16, -7, tip, 7);
      hg.addColorStop(0, "#f8fbff");
      hg.addColorStop(0.5, "#b9c6d6");
      hg.addColorStop(1, "#5e6a7a");
      ctx.fillStyle = hg;
      ctx.fill();
      outline(ctx, 0.5, 0.8);
      // fletching
      for (const d of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(pull + 4, 0);
        ctx.quadraticCurveTo(pull + 14, 9 * d, pull + 26, 2 * d);
        ctx.lineTo(pull + 10, 0);
        ctx.closePath();
        ctx.fillStyle = d < 0 ? "#e23b3b" : "#f0f3f7";
        ctx.fill();
      }
      ctx.restore();
    }
    if (ch > 0.05) {
      emissive(ctx, 92 + pull, -1.5, 10 + ch * 16, "#8ef7c0", ch * 0.7);
    }
  },
  fire(api, x, y, a, charge) {
    const power = lerp(1400, 3200, charge);
    audio.play("bow");
    api.shake(7 + charge * 9);
    api.bullets.push(
      makeBullet({
        x,
        y,
        a,
        speed: power,
        weapon: bow,
        kind: "arrow",
        size: 10,
        trailMax: 10,
        draw(ctx, b) {
          trailPath(ctx, b, "#bfe9ff", 2, 0.5);
          ctx.save();
          ctx.translate(b.x, b.y);
          ctx.rotate(b.angle);
          ctx.save();
          ctx.globalCompositeOperation = "lighter";
          const gg = ctx.createLinearGradient(-70, 0, 10, 0);
          gg.addColorStop(0, "rgba(160,255,210,0)");
          gg.addColorStop(1, "rgba(160,255,210,0.5)");
          ctx.fillStyle = gg;
          ctx.fillRect(-70, -2.6, 80, 5.2);
          ctx.restore();
          const sg = ctx.createLinearGradient(0, -2, 0, 2);
          sg.addColorStop(0, "#f6e7c8");
          sg.addColorStop(0.5, "#c0a06a");
          sg.addColorStop(1, "#6f4e24");
          bar(ctx, -52, -1.8, 54, 3.6, sg, 1.6);
          ctx.beginPath();
          ctx.moveTo(14, 0);
          ctx.lineTo(-2, -7.5);
          ctx.lineTo(3, 0);
          ctx.lineTo(-2, 7.5);
          ctx.closePath();
          const hg = ctx.createLinearGradient(-2, -7, 14, 7);
          hg.addColorStop(0, "#ffffff");
          hg.addColorStop(0.5, "#c3d2e2");
          hg.addColorStop(1, "#67727f");
          ctx.fillStyle = hg;
          ctx.fill();
          for (const d of [-1, 1]) {
            ctx.beginPath();
            ctx.moveTo(-50, 0);
            ctx.quadraticCurveTo(-40, 9 * d, -26, 2 * d);
            ctx.lineTo(-42, 0);
            ctx.closePath();
            ctx.fillStyle = d < 0 ? "#ef4444" : "#f1f5f9";
            ctx.fill();
          }
          ctx.restore();
        },
      }),
    );
    // release puff
    for (let i = 0; i < 8; i++)
      api.particles.push(
        P({
          type: "spark",
          x,
          y,
          vx: Math.cos(a + rnd(-1, 1)) * rnd(60, 260),
          vy: Math.sin(a + rnd(-1, 1)) * rnd(60, 260),
          color: "#d7fbe8",
          life: rnd(0.1, 0.25),
          width: 1.2,
        }),
      );
    api.particles.push(
      P({
        type: "ring",
        x,
        y,
        size: 40,
        size2: 4,
        color: "#9af5c8",
        width: 2,
        life: 0.22,
      }),
    );
  },
  onImpact(api, x, y, a) {
    audio.play("hit");
    kineticImpact(api, x, y, a, 1.4, "#d8ffe9");
    api.shake(14);
    api.hitstop(0.06);
  },
  drawMark: drawWeaponMark,
};

/* --------------------------- generic firearm art --------------------------- */

function drawAK(ctx: CanvasRenderingContext2D, s: WeaponDrawState) {
  const r = s.recoil;
  const cycle = r * 13;
  ctx.save();
  ctx.translate(-r * 9, 0);
  // stock
  bar(ctx, -78, -16, 54, 20, wood(ctx, -16, 6), 4);
  outline(ctx, 0.45);
  bar(ctx, -52, -4, 34, 16, wood(ctx, -4, 12), 3);
  ctx.save();
  ctx.strokeStyle = "rgba(255,218,164,0.24)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-72, -12);
  ctx.quadraticCurveTo(-51, -7, -29, -12);
  ctx.moveTo(-68, -7);
  ctx.quadraticCurveTo(-52, -1, -36, -6);
  ctx.stroke();
  ctx.restore();
  // receiver
  bar(ctx, -30, -18, 86, 26, blacksteel(ctx, -18, 10), 3);
  outline(ctx, 0.5);
  // dust cover lines
  ctx.strokeStyle = "rgba(255,255,255,0.12)";
  ctx.lineWidth = 1;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(-22, -14 + i * 4);
    ctx.lineTo(44, -14 + i * 4);
    ctx.stroke();
  }
  // cycling bolt, ejection port and receiver fasteners
  bar(ctx, 7, -12, 31, 8, "#090c10", 1.5);
  bar(ctx, 10 - cycle, -11, 22, 5, gunmetal(ctx, -11, -6), 1.5);
  bar(ctx, 30 - cycle, -16, 8, 6, gunmetal(ctx, -16, -10), 2);
  rivet(ctx, -22, -13, 1.7);
  rivet(ctx, 47, -13, 1.7);
  // selector drum and fire selector
  ctx.beginPath();
  ctx.arc(-4, -1, 5, 0, TAU);
  ctx.fillStyle = "#11161c";
  ctx.fill();
  ctx.strokeStyle = "#7d8793";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-4, -1);
  ctx.lineTo(4, -6 + r * 2);
  ctx.stroke();
  rivet(ctx, -4, -1, 2.3);
  // serial plate / stamped insignia
  bar(ctx, 34, -8, 15, 6, "#141920", 1.4);
  ctx.strokeStyle = "rgba(255,188,92,0.65)";
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.moveTo(37, -5);
  ctx.lineTo(41, -5);
  ctx.lineTo(43, -7);
  ctx.stroke();
  // magazine (curved)
  ctx.beginPath();
  ctx.moveTo(-4, 6);
  ctx.quadraticCurveTo(2, 44, 22, 48);
  ctx.quadraticCurveTo(30, 40, 24, 6);
  ctx.closePath();
  ctx.fillStyle = metal(ctx, 6, 48, "#6a4f2a", "#45321a", "#241a0d");
  ctx.fill();
  outline(ctx, 0.6);
  ctx.strokeStyle = "rgba(255,255,255,0.1)";
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.moveTo(0 + i * 1.2, 14 + i * 8);
    ctx.lineTo(25, 12 + i * 8);
    ctx.stroke();
  }
  // grip
  ctx.save();
  ctx.translate(-14, 6);
  ctx.rotate(0.28);
  bar(ctx, -6, 0, 15, 34, wood(ctx, 0, 34), 5);
  outline(ctx, 0.5);
  ctx.restore();
  // handguard
  bar(ctx, 56, -14, 46, 22, wood(ctx, -14, 8), 4);
  outline(ctx, 0.45);
  ctx.strokeStyle = "rgba(38,19,8,0.65)";
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.moveTo(61 + i * 7, -11);
    ctx.lineTo(61 + i * 7, 5);
    ctx.stroke();
  }
  ctx.strokeStyle = "rgba(255,220,165,0.32)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(60, -11);
  ctx.lineTo(96, -11);
  ctx.stroke();
  bar(ctx, 56, -22, 40, 9, blacksteel(ctx, -22, -13), 3);
  // gas tube
  bar(ctx, 46, -24, 58, 6, gunmetal(ctx, -24, -18), 2);
  // barrel
  bar(ctx, 100, -11, 48, 9, gunmetal(ctx, -11, -2), 2);
  // front sight
  bar(ctx, 132, -24, 7, 16, blacksteel(ctx, -24, -8), 2);
  bar(ctx, 128, -26, 15, 5, blacksteel(ctx, -26, -21), 2);
  // muzzle brake
  bar(ctx, 146, -13, 16, 13, gunmetal(ctx, -13, 0), 2);
  ctx.fillStyle = "#05070a";
  ctx.beginPath();
  ctx.ellipse(161, -6.5, 2.4, 4.6, 0, 0, TAU);
  ctx.fill();
  // vented slant brake highlights and bayonet lug
  ctx.fillStyle = "rgba(220,230,240,0.4)";
  ctx.fillRect(149, -12, 1.2, 4);
  ctx.fillRect(155, -12, 1.2, 4);
  bar(ctx, 121, -14, 7, 4, "#454b53", 1.5);
  // rear sight
  bar(ctx, 30, -24, 18, 7, blacksteel(ctx, -24, -17), 2);
  rivet(ctx, 33, -20, 1.2);
  ctx.restore();
}

function drawRifleBody(
  ctx: CanvasRenderingContext2D,
  s: WeaponDrawState,
  electro: boolean,
) {
  const r = s.recoil;
  const glow = electro ? (Math.sin(s.t * 7) * 0.5 + 0.5) * 0.5 + 0.5 : 0;
  ctx.save();
  ctx.translate(-r * 10, 0);
  // stock + chassis
  ctx.beginPath();
  ctx.moveTo(-92, -14);
  ctx.lineTo(-30, -16);
  ctx.lineTo(-30, 8);
  ctx.lineTo(-54, 10);
  ctx.lineTo(-62, 24);
  ctx.lineTo(-76, 24);
  ctx.lineTo(-80, 8);
  ctx.lineTo(-92, 6);
  ctx.closePath();
  ctx.fillStyle = metal(ctx, -16, 24, "#59616e", "#272c34", "#0d1014");
  ctx.fill();
  outline(ctx, 0.6);
  ctx.strokeStyle = "rgba(255,255,255,0.12)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-88, -8);
  ctx.lineTo(-50, -8);
  ctx.moveTo(-76, 14);
  ctx.lineTo(-66, 14);
  ctx.stroke();
  // cheek riser
  bar(
    ctx,
    -70,
    -22,
    34,
    9,
    metal(ctx, -22, -13, "#4b525d", "#22262d", "#0b0e12"),
    3,
  );
  ctx.strokeStyle = "rgba(255,255,255,0.16)";
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.moveTo(-66 + i * 6, -20);
    ctx.lineTo(-66 + i * 6, -15);
    ctx.stroke();
  }
  // receiver
  bar(
    ctx,
    -32,
    -18,
    92,
    26,
    metal(ctx, -18, 8, "#8993a1", "#343b46", "#11151b"),
    3,
  );
  outline(ctx, 0.62, 1.2);
  // inset ejection port and animated bolt handle
  bar(ctx, 2, -11, 30, 9, "#090c11", 1.5);
  bar(ctx, 5 - r * 13, -10, 22, 6, gunmetal(ctx, -10, -4), 1.5);
  bar(ctx, 27 - r * 13, -18, 9, 7, gunmetal(ctx, -18, -11), 2);
  rivet(ctx, -25, -13, 1.7);
  rivet(ctx, 52, -13, 1.7);
  // engraved receiver line and selector
  ctx.strokeStyle = "rgba(220,230,240,0.28)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-20, -6);
  ctx.lineTo(47, -6);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(-5, 3, 4, 0, TAU);
  ctx.fillStyle = "#14191f";
  ctx.fill();
  ctx.strokeStyle = "#91a0b0";
  ctx.beginPath();
  ctx.moveTo(-5, 3);
  ctx.lineTo(2, -1);
  ctx.stroke();
  // bolt handle
  bar(ctx, 16, -22, 20, 7, gunmetal(ctx, -22, -15), 3);
  ctx.beginPath();
  ctx.arc(37, -19, 4.6, 0, TAU);
  ctx.fillStyle = "#7b8392";
  ctx.fill();
  // magazine
  bar(ctx, 2, 6, 22, 34, metal(ctx, 6, 40, "#4a515c", "#262b33", "#101317"), 3);
  // grip
  ctx.save();
  ctx.translate(-18, 6);
  ctx.rotate(0.22);
  bar(
    ctx,
    -7,
    0,
    16,
    34,
    metal(ctx, 0, 34, "#434a55", "#20242b", "#0b0e12"),
    5,
  );
  outline(ctx, 0.5);
  ctx.restore();
  // scope
  bar(
    ctx,
    -6,
    -44,
    76,
    18,
    metal(ctx, -44, -26, "#5b636f", "#262b33", "#0c0f13"),
    8,
  );
  outline(ctx, 0.6);
  // adjustable ocular housing and objective glass
  bar(
    ctx,
    -14,
    -47,
    17,
    24,
    metal(ctx, -47, -23, "#8893a1", "#38404a", "#10151c"),
    6,
  );
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const rearLens = ctx.createLinearGradient(-13, -46, -5, -24);
  rearLens.addColorStop(0, "rgba(180,235,255,0.72)");
  rearLens.addColorStop(1, "rgba(30,80,160,0.12)");
  ctx.fillStyle = rearLens;
  roundRect(ctx, -12, -44, 6, 18, 3);
  ctx.fill();
  ctx.restore();
  bar(
    ctx,
    60,
    -47,
    16,
    24,
    metal(ctx, -47, -23, "#6c7482", "#2c323b", "#0d1014"),
    5,
  );
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const lens = ctx.createLinearGradient(68, -46, 76, -24);
  lens.addColorStop(0, "rgba(120,220,255,0.75)");
  lens.addColorStop(1, "rgba(30,80,160,0.2)");
  ctx.fillStyle = lens;
  roundRect(ctx, 68, -45, 7, 20, 3);
  ctx.fill();
  // subtle illuminated reticle
  ctx.strokeStyle = "rgba(170,240,255,0.72)";
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(69, -36 + Math.sin(s.t * 1.7) * 1.4);
  ctx.lineTo(75, -36 + Math.sin(s.t * 1.7) * 1.4);
  ctx.moveTo(72, -41);
  ctx.lineTo(72, -31);
  ctx.stroke();
  ctx.restore();
  // scope mounting rings
  for (const rx of [2, 42]) {
    bar(
      ctx,
      rx,
      -32,
      12,
      18,
      metal(ctx, -32, -14, "#aab3c0", "#525b68", "#1b2029"),
      3,
    );
    outline(ctx, 0.6, 1.1);
    ctx.fillStyle = "rgba(255,255,255,0.18)";
    ctx.fillRect(rx + 1, -31, 10, 2);
  }
  // compact top rail and rear backup sight
  bar(ctx, -1, -27, 73, 3, blacksteel(ctx, -27, -24), 1);
  bar(ctx, -3, -34, 8, 7, gunmetal(ctx, -34, -27), 1.5);
  // handguard rail
  bar(
    ctx,
    58,
    -14,
    74,
    20,
    metal(ctx, -14, 6, "#4e5660", "#23282f", "#0b0e12"),
    3,
  );
  ctx.strokeStyle = "rgba(0,0,0,0.5)";
  for (let i = 0; i < 9; i++) {
    ctx.beginPath();
    ctx.moveTo(62 + i * 8, -13);
    ctx.lineTo(62 + i * 8, 5);
    ctx.stroke();
  }
  // barrel
  bar(ctx, 130, -10, 46, 9, gunmetal(ctx, -10, -1), 2);
  if (!electro) {
    // muzzle brake
    bar(ctx, 170, -13, 20, 15, gunmetal(ctx, -13, 2), 3);
    ctx.fillStyle = "#05070a";
    for (let i = 0; i < 2; i++) ctx.fillRect(174 + i * 7, -12, 3, 6);
    ctx.beginPath();
    ctx.ellipse(189, -5.5, 2.6, 5, 0, 0, TAU);
    ctx.fill();
    // muzzle vents and threaded collar
    ctx.strokeStyle = "rgba(220,230,240,0.42)";
    ctx.lineWidth = 1;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(173 + i * 5, -7);
      ctx.lineTo(173 + i * 5, -3);
      ctx.stroke();
    }
  } else {
    // tesla coil emitter
    for (let i = 0; i < 4; i++) {
      const x = 140 + i * 14;
      bar(
        ctx,
        x,
        -16,
        7,
        20,
        metal(ctx, -16, 4, "#7dd3fc", "#0e7490", "#082f49"),
        3,
      );
      glowingRivet(ctx, x + 3.5, -6, 2.8, "#38bdf8", glow);
    }
    bar(ctx, 196, -12, 12, 13, gunmetal(ctx, -12, 1), 3);
    emissive(ctx, 203, -6, 16 + glow * 8, "#67e8f9", 0.9 * glow);
    // arcs between coils
    for (let i = 0; i < 3; i++) {
      if (Math.sin(s.t * 13 + i * 2.1) > 0.3)
        lightning(
          ctx,
          143 + i * 14,
          -8,
          157 + i * 14,
          -8,
          6,
          "#a5f3fc",
          s.t + i,
          1.2,
          5,
        );
    }
    // energy cell
    bar(
      ctx,
      -4,
      8,
      26,
      30,
      metal(ctx, 8, 38, "#0ea5e9", "#075985", "#0c1a24"),
      4,
    );
    emissive(ctx, 9, 22, 14 + glow * 6, "#38bdf8", 0.6 * glow);
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = `rgba(224,242,254,${0.2 + glow * 0.65})`;
      ctx.fillRect(0, 13 + i * 7, 19, 2);
    }
  }
  ctx.restore();
}

function drawMP5(
  ctx: CanvasRenderingContext2D,
  s: WeaponDrawState,
  electro: boolean,
) {
  const r = s.recoil;
  const cycle = r * 11;
  const glow = electro ? (Math.sin(s.t * 9) * 0.5 + 0.5) * 0.5 + 0.5 : 0;
  const acc = "#c084fc";
  ctx.save();
  ctx.translate(-r * 7, 0);
  // retractable stock
  bar(ctx, -78, -12, 10, 20, blacksteel(ctx, -12, 8), 3);
  bar(ctx, -70, -9, 44, 5, gunmetal(ctx, -9, -4), 2);
  bar(ctx, -70, 2, 44, 5, gunmetal(ctx, 2, 7), 2);
  // receiver tube
  bar(
    ctx,
    -30,
    -16,
    86,
    24,
    metal(ctx, -16, 8, "#96a0ae", "#39414c", "#12161c"),
    5,
  );
  outline(ctx, 0.6, 1.3);
  // ejection port and reciprocating bolt
  bar(ctx, 2, -9, 26, 8, "#090c10", 1.5);
  bar(ctx, 5 - cycle, -8, 19, 5, gunmetal(ctx, -8, -3), 1.5);
  rivet(ctx, -23, -12, 1.6);
  rivet(ctx, 49, -12, 1.6);
  ctx.strokeStyle = "rgba(255,255,255,0.22)";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-24, -13);
  ctx.lineTo(50, -13);
  ctx.stroke();
  // ejection port
  bar(ctx, 6, -9, 22, 8, "#0b0e13", 2);
  // cocking handle tube
  bar(
    ctx,
    20 - cycle,
    -24,
    48,
    10,
    metal(ctx, -24, -14, "#8f99a7", "#333a44", "#11151a"),
    4,
  );
  outline(ctx, 0.5, 1);
  bar(ctx, 30 - cycle, -27, 9, 8, gunmetal(ctx, -27, -19), 2);
  // grip
  ctx.save();
  ctx.translate(-16, 6);
  ctx.rotate(0.26);
  bar(
    ctx,
    -7,
    0,
    16,
    32,
    metal(ctx, 0, 32, "#3f444c", "#1d2127", "#090b0e"),
    5,
  );
  outline(ctx, 0.5);
  ctx.restore();
  // trigger guard
  ctx.strokeStyle = "#2a2f36";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(2, 10, 9, 0, Math.PI);
  ctx.stroke();
  // magazine (straight, slight curve)
  bar(
    ctx,
    14,
    6,
    17,
    42,
    metal(ctx, 6, 48, "#474e58", "#23272e", "#0d1014"),
    3,
  );
  ctx.strokeStyle = "rgba(255,255,255,0.14)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(18, 12);
  ctx.lineTo(18, 43);
  ctx.moveTo(26, 12);
  ctx.lineTo(26, 43);
  ctx.stroke();
  // handguard
  bar(
    ctx,
    56,
    -14,
    52,
    22,
    metal(ctx, -14, 8, "#7c8694", "#333a44", "#111519"),
    6,
  );
  outline(ctx, 0.6, 1.3);
  ctx.strokeStyle = "rgba(255,255,255,0.16)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(60, -10);
  ctx.lineTo(104, -10);
  ctx.stroke();
  // cooling ribs across the handguard
  ctx.strokeStyle = "rgba(8,12,18,0.65)";
  ctx.lineWidth = 1.7;
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.moveTo(64 + i * 8, -6);
    ctx.lineTo(64 + i * 8, 5);
    ctx.stroke();
  }
  // barrel / muzzle
  bar(ctx, 104, -11, 26, 9, gunmetal(ctx, -11, -2), 2);
  if (!electro) {
    bar(ctx, 126, -13, 14, 13, gunmetal(ctx, -13, 0), 3);
    ctx.fillStyle = "#05070a";
    ctx.beginPath();
    ctx.ellipse(139, -6.5, 2.2, 4.4, 0, 0, TAU);
    ctx.fill();
  } else {
    for (let i = 0; i < 3; i++) {
      const x = 108 + i * 12;
      bar(
        ctx,
        x,
        -15,
        6,
        18,
        metal(ctx, -15, 3, "#e9d5ff", "#7e22ce", "#2e1065"),
        3,
      );
      emissive(ctx, x + 3, -6, 8 + glow * 4, acc, 0.5 * glow);
    }
    bar(ctx, 144, -12, 11, 12, gunmetal(ctx, -12, 0), 3);
    emissive(ctx, 150, -6, 14 + glow * 7, acc, 0.85 * glow);
    if (Math.sin(s.t * 15) > 0.2)
      lightning(ctx, 112, -7, 148, -7, 5, "#e9d5ff", s.t, 1.1, 6);
    bar(
      ctx,
      -6,
      -24,
      22,
      10,
      metal(ctx, -24, -14, "#a855f7", "#6b21a8", "#2e1065"),
      3,
    );
    emissive(ctx, 5, -19, 11 + glow * 5, acc, 0.6 * glow);
  }
  // sights
  bar(ctx, 96, -22, 6, 10, blacksteel(ctx, -22, -12), 2);
  // hooded front sight and drum rear sight
  ctx.strokeStyle = "#11161c";
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.arc(98.5, -22, 5, Math.PI, TAU);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(-26, -16, 6, Math.PI * 0.15, Math.PI * 0.85);
  ctx.stroke();
  rivet(ctx, -26, -16, 1.8);
  ctx.restore();
}

/* --------------------------------- AK-47 -------------------------------- */
function bulletWeapon(cfg: {
  id: string;
  name: string;
  tag: string;
  accent: string;
  accent2: string;
  cooldown: number;
  recoilAmt: number;
  muzzle: [number, number];
  muzzleKick?: Weapon["muzzleKick"];
  iconScale: number;
  markSize: number;
  speed: number;
  bulletLen: number;
  bulletR: number;
  tracer: string;
  flashSize: number;
  sound: string;
  power: number;
  draw: (ctx: CanvasRenderingContext2D, s: WeaponDrawState) => void;
}): Weapon {
  const w: Weapon = {
    id: cfg.id,
    name: cfg.name,
    tag: cfg.tag,
    accent: cfg.accent,
    accent2: cfg.accent2,
    mode: "projectile",
    cooldown: cfg.cooldown,
    recoilAmt: cfg.recoilAmt,
    len: 180,
    muzzle: cfg.muzzle,
    muzzleKick: cfg.muzzleKick,
    iconScale: cfg.iconScale,
    markSize: cfg.markSize,
    draw: cfg.draw,
    fire(api, x, y, a) {
      audio.play(cfg.sound);
      muzzleFlash(api, x, y, a, {
        color: "#ffd98a",
        color2: "#ff6a00",
        size: cfg.flashSize,
        sparks: 12,
        smoke: 5,
        casing: true,
      });
      api.flash(cfg.accent, 0.1);
      api.bullets.push(
        makeBullet({
          x,
          y,
          a,
          speed: cfg.speed,
          weapon: w,
          kind: "slug",
          size: cfg.bulletR,
          trailMax: 8,
          draw(ctx, b) {
            trailPath(ctx, b, cfg.tracer, cfg.bulletR * 0.9, 0.85);
            ctx.save();
            ctx.translate(b.x, b.y);
            ctx.rotate(b.angle);
            // hot tracer tail
            ctx.save();
            ctx.globalCompositeOperation = "lighter";
            const tg = ctx.createLinearGradient(-cfg.bulletLen * 5, 0, 0, 0);
            tg.addColorStop(0, withAlpha(cfg.tracer, 0));
            tg.addColorStop(1, withAlpha(cfg.tracer, 0.75));
            ctx.fillStyle = tg;
            ctx.fillRect(
              -cfg.bulletLen * 5,
              -cfg.bulletR * 0.7,
              cfg.bulletLen * 5,
              cfg.bulletR * 1.4,
            );
            ctx.restore();
            // jacketed bullet body
            const L = cfg.bulletLen,
              R = cfg.bulletR;
            ctx.beginPath();
            ctx.moveTo(L, 0);
            ctx.quadraticCurveTo(L * 0.3, -R, -L * 0.45, -R);
            ctx.lineTo(-L, -R * 0.92);
            ctx.lineTo(-L, R * 0.92);
            ctx.lineTo(-L * 0.45, R);
            ctx.quadraticCurveTo(L * 0.3, R, L, 0);
            ctx.closePath();
            const bg = ctx.createLinearGradient(0, -R, 0, R);
            bg.addColorStop(0, "#ffe9b0");
            bg.addColorStop(0.35, "#d6a33c");
            bg.addColorStop(0.6, "#9a6a1d");
            bg.addColorStop(1, "#5a3a0d");
            ctx.fillStyle = bg;
            ctx.fill();
            ctx.strokeStyle = "rgba(40,24,6,0.6)";
            ctx.lineWidth = 0.7;
            ctx.stroke();
            emissive(ctx, -L * 0.9, 0, R * 3.4, cfg.tracer, 0.9);
            ctx.restore();
          },
        }),
      );
      api.shake(cfg.recoilAmt * 0.7);
    },
    onImpact(api, x, y, a) {
      audio.play("hit");
      kineticImpact(api, x, y, a, cfg.power, cfg.tracer);
      api.shake(6 * cfg.power);
      api.hitstop(0.03);
    },
    drawMark: drawWeaponMark,
  };
  return w;
}

const ak47 = bulletWeapon({
  id: "ak47",
  name: "AK-47 Kalashnikov",
  tag: "7.62×39 · AUTO",
  accent: "#ffb347",
  accent2: "#8b5a2b",
  cooldown: 0.17,
  recoilAmt: 9,
  muzzle: [164, -6],
  muzzleKick: { x: 9 },
  iconScale: 0.46,
  markSize: 20,
  speed: 2100,
  bulletLen: 9,
  bulletR: 3.4,
  tracer: "#ffb347",
  flashSize: 54,
  sound: "rifle",
  power: 1,
  draw: drawAK,
});

const rifle = bulletWeapon({
  id: "rifle",
  name: "Marksman Rifle",
  tag: ".308 · BOLT",
  accent: "#86efac",
  accent2: "#166534",
  cooldown: 0.42,
  recoilAmt: 14,
  muzzle: [192, -5],
  muzzleKick: { x: 10 },
  iconScale: 0.42,
  markSize: 24,
  speed: 2900,
  bulletLen: 12,
  bulletR: 4,
  tracer: "#b6f7c4",
  flashSize: 66,
  sound: "rifle",
  power: 1.35,
  draw: (ctx, s) => drawRifleBody(ctx, s, false),
});

const beretta = bulletWeapon({
  id: "beretta92",
  name: "Beretta 92FS",
  tag: "9mm · SEMI",
  accent: "#cbd5e1",
  accent2: "#64748b",
  cooldown: 0.22,
  recoilAmt: 8,
  muzzle: [78, -16],
  muzzleKick: { x: 13 },
  iconScale: 0.74,
  markSize: 17,
  speed: 1700,
  bulletLen: 7,
  bulletR: 3,
  tracer: "#ffd9a0",
  flashSize: 44,
  sound: "pistol",
  power: 0.8,
  draw: (ctx, s) => {
    const r = s.recoil;
    ctx.save();
    // frame
    ctx.beginPath();
    ctx.moveTo(-26, -6);
    ctx.lineTo(60, -6);
    ctx.lineTo(60, 6);
    ctx.lineTo(10, 8);
    ctx.lineTo(2, 20);
    ctx.lineTo(-22, 66);
    ctx.lineTo(-40, 64);
    ctx.lineTo(-30, 10);
    ctx.closePath();
    ctx.fillStyle = metal(ctx, -8, 66, "#6b7280", "#2b3038", "#0c0f13");
    ctx.fill();
    outline(ctx, 0.6);
    // frame rails and dust cover seam
    ctx.strokeStyle = "rgba(220,228,238,0.36)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-25, 6);
    ctx.lineTo(57, 4);
    ctx.moveTo(-19, 10);
    ctx.lineTo(4, 12);
    ctx.stroke();
    // grip panel
    ctx.save();
    ctx.translate(-26, 36);
    ctx.rotate(-0.26);
    bar(
      ctx,
      -8,
      -22,
      16,
      42,
      metal(ctx, -22, 20, "#3b3f46", "#1b1e23", "#0a0c0f"),
      4,
    );
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      ctx.moveTo(-7, -18 + i * 6);
      ctx.lineTo(7, -16 + i * 6);
      ctx.stroke();
    }
    ctx.strokeStyle = "rgba(0,0,0,0.42)";
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.moveTo(-6, -15 + i * 6);
      ctx.lineTo(6, -13 + i * 6);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(0, -3, 3, 0, TAU);
    ctx.fillStyle = "#9ca3af";
    ctx.fill();
    ctx.restore();
    // trigger + guard
    ctx.strokeStyle = "#30353d";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(-2, 18, 12, -0.2, Math.PI + 0.4);
    ctx.stroke();
    ctx.fillStyle = "#9ca3af";
    bar(ctx, -6, 10, 4, 12, "#aab1ba", 2);
    // safety / decocker levers
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(54, side * 5 - 9, 3.2, 0, TAU);
      ctx.fillStyle = "#aab2bd";
      ctx.fill();
      ctx.strokeStyle = "rgba(10,12,16,0.7)";
      ctx.lineWidth = 0.8;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(54, side * 5 - 9);
      ctx.lineTo(61, side * 5 - 12 + r * 2);
      ctx.stroke();
    }
    // slide (recoils)
    ctx.save();
    ctx.translate(-r * 13, 0);
    bar(
      ctx,
      -34,
      -24,
      112,
      20,
      metal(ctx, -24, -4, "#8d95a3", "#333942", "#13161b"),
      3,
    );
    outline(ctx, 0.6);
    // open slide cut (Beretta signature)
    ctx.fillStyle = "#0b0e12";
    roundRect(ctx, 6, -22, 46, 10, 3);
    ctx.fill();
    // exposed barrel
    bar(
      ctx,
      10,
      -20,
      68,
      7,
      metal(ctx, -20, -13, "#aeb6c2", "#5a626d", "#2a2f36"),
      2,
    );
    // serrations
    ctx.strokeStyle = "rgba(0,0,0,0.55)";
    ctx.lineWidth = 1.6;
    for (let i = 0; i < 7; i++) {
      ctx.beginPath();
      ctx.moveTo(-30 + i * 4, -22);
      ctx.lineTo(-32 + i * 4, -6);
      ctx.stroke();
    }
    // slide serrations, cocking shoulders and front bevel
    ctx.strokeStyle = "rgba(235,240,247,0.24)";
    ctx.lineWidth = 0.9;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(48 + i * 4, -21);
      ctx.lineTo(46 + i * 4, -7);
      ctx.stroke();
    }
    ctx.strokeStyle = "rgba(0,0,0,0.5)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-24, -5);
    ctx.lineTo(72, -5);
    ctx.stroke();
    // sights
    bar(ctx, -30, -28, 7, 5, "#1b1f25", 1);
    bar(ctx, 70, -28, 6, 5, "#1b1f25", 1);
    ctx.fillStyle = "#e2e8f0";
    ctx.fillRect(71, -27, 2, 2);
    // muzzle
    ctx.fillStyle = "#05070a";
    ctx.beginPath();
    ctx.ellipse(78, -16, 2.4, 4, 0, 0, TAU);
    ctx.fill();
    // muzzle crown and guide rod
    ctx.strokeStyle = "#bac2cc";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(78, -16, 3.1, -Math.PI / 2, Math.PI / 2);
    ctx.stroke();
    ctx.restore();
    // hammer
    bar(ctx, -36, -14, 8, 9, "#4b5159", 3);
    ctx.restore();
  },
});

const mp5 = bulletWeapon({
  id: "mp5",
  name: "MP5 SMG",
  tag: "9mm · 800 RPM",
  accent: "#93c5fd",
  accent2: "#1e3a8a",
  cooldown: 0.09,
  recoilAmt: 5,
  muzzle: [142, -6],
  muzzleKick: { x: 7 },
  iconScale: 0.52,
  markSize: 15,
  speed: 1900,
  bulletLen: 6,
  bulletR: 2.6,
  tracer: "#ffd88a",
  flashSize: 40,
  sound: "smg",
  power: 0.65,
  draw: (ctx, s) => drawMP5(ctx, s, false),
});

/* ------------------------- energy bolt weapons ------------------------- */

function boltWeapon(cfg: {
  id: string;
  name: string;
  tag: string;
  accent: string;
  accent2: string;
  cooldown: number;
  recoilAmt: number;
  muzzle: [number, number];
  muzzleKick?: Weapon["muzzleKick"];
  iconScale: number;
  markSize: number;
  speed: number;
  size: number;
  sound: string;
  draw: (ctx: CanvasRenderingContext2D, s: WeaponDrawState) => void;
}): Weapon {
  const C = cfg.accent,
    C2 = cfg.accent2;
  const w: Weapon = {
    id: cfg.id,
    name: cfg.name,
    tag: cfg.tag,
    accent: C,
    accent2: C2,
    mode: "projectile",
    cooldown: cfg.cooldown,
    recoilAmt: cfg.recoilAmt,
    len: 190,
    muzzle: cfg.muzzle,
    muzzleKick: cfg.muzzleKick,
    iconScale: cfg.iconScale,
    markSize: cfg.markSize,
    draw: cfg.draw,
    fire(api, x, y, a) {
      audio.play(cfg.sound);
      energyMuzzle(api, x, y, a, C, C2, cfg.size * 7);
      api.flash(C, 0.14);
      api.bullets.push(
        makeBullet({
          x,
          y,
          a,
          speed: cfg.speed,
          weapon: w,
          kind: "bolt",
          size: cfg.size,
          trailMax: 12,
          update(b, dt, g) {
            for (let i = 0, n = emissionCount(dt, 36); i < n; i++)
              g.particles.push(
                P({
                  type: "bolt",
                  x: b.x + rnd(-6, 6),
                  y: b.y + rnd(-6, 6),
                  rot: rnd(TAU),
                  size: rnd(8, 20),
                  color: C,
                  life: 0.09,
                  width: 1.2,
                }),
              );
            for (let i = 0, n = emissionCount(dt, 48); i < n; i++)
              g.particles.push(
                P({
                  type: "glow",
                  x: b.x - Math.cos(b.angle) * 8,
                  y: b.y - Math.sin(b.angle) * 8,
                  size: cfg.size * 2.2,
                  size2: 1,
                  color: C,
                  color2: C2,
                  life: 0.22,
                  vx: rnd(-30, 30),
                  vy: rnd(-30, 30),
                }),
              );
          },
          draw(ctx, b, t) {
            trailPath(ctx, b, C, cfg.size * 1.1, 0.9);
            ctx.save();
            ctx.translate(b.x, b.y);
            ctx.rotate(b.angle);
            ctx.globalCompositeOperation = "lighter";
            // elongated plasma core
            const L = cfg.size * 3.4;
            const g = ctx.createLinearGradient(-L, 0, L * 0.6, 0);
            g.addColorStop(0, withAlpha(C, 0));
            g.addColorStop(0.5, withAlpha(C, 0.75));
            g.addColorStop(1, "#ffffff");
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.ellipse(0, 0, L, cfg.size * 0.95, 0, 0, TAU);
            ctx.fill();
            emissive(ctx, cfg.size, 0, cfg.size * 4.5, C, 0.95);
            // crackling rings
            for (let i = 0; i < 3; i++) {
              const ph = t * 14 + i * 2;
              ctx.strokeStyle = withAlpha(C2, 0.5 + 0.4 * Math.sin(ph));
              ctx.lineWidth = 1.4;
              ctx.beginPath();
              ctx.ellipse(
                -i * cfg.size * 1.4,
                0,
                cfg.size * 0.6,
                cfg.size * (1.3 + 0.3 * Math.sin(ph)),
                0,
                0,
                TAU,
              );
              ctx.stroke();
            }
            ctx.restore();
          },
        }),
      );
      api.shake(cfg.recoilAmt * 0.5);
    },
    onImpact(api, x, y, a) {
      audio.play("electro");
      electroImpact(api, x, y, a, C, C2);
      api.shake(9);
      api.flash(C, 0.2);
      api.hitstop(0.04);
    },
    drawMark: drawWeaponMark,
  };
  return w;
}

const rifleElectro = boltWeapon({
  id: "rifleElectro",
  name: "Tesla Rifle ELECTRO",
  tag: "ARC COIL · 50kV",
  accent: "#38bdf8",
  accent2: "#a5f3fc",
  cooldown: 0.5,
  recoilAmt: 12,
  muzzle: [206, -6],
  muzzleKick: { x: 10 },
  iconScale: 0.4,
  markSize: 30,
  speed: 1500,
  size: 7,
  sound: "electro",
  draw: (ctx, s) => drawRifleBody(ctx, s, true),
});

const mp5Electro = boltWeapon({
  id: "mp5Electro",
  name: "MP5 ELECTRO",
  tag: "ION BURST · 650 RPM",
  accent: "#c084fc",
  accent2: "#f0abfc",
  cooldown: 0.14,
  recoilAmt: 6,
  muzzle: [154, -6],
  muzzleKick: { x: 7 },
  iconScale: 0.5,
  markSize: 22,
  speed: 1800,
  size: 5,
  sound: "electro",
  draw: (ctx, s) => drawMP5(ctx, s, true),
});

/* ------------------------------ beam helper ------------------------------ */

function makeBeam(
  o: Partial<Beam> & { weapon: Weapon; draw: Beam["draw"] },
): Beam {
  return {
    x: 0,
    y: 0,
    angle: 0,
    age: 0,
    duration: 0.3,
    len: 1200,
    hitX: 0,
    hitY: 0,
    hit: false,
    ...o,
  };
}

let nextBulletId = 1;

function makeBullet(o: {
  x: number;
  y: number;
  a: number;
  speed: number;
  weapon: Weapon;
  kind: string;
  size: number;
  trailMax?: number;
  life?: number;
  spin?: number;
  returning?: number;
  hitCd?: number;
  discSpin?: number;
  wallBounces?: number;
  noStick?: boolean;
  data?: Record<string, number>;
  update?: Bullet["update"];
  draw: Bullet["draw"];
}): Bullet {
  return {
    id: nextBulletId++,
    x: o.x,
    y: o.y,
    vx: Math.cos(o.a) * o.speed,
    vy: Math.sin(o.a) * o.speed,
    angle: o.a,
    spin: o.spin ?? 0,
    age: 0,
    life: o.life ?? 3,
    size: o.size,
    dead: false,
    kind: o.kind,
    weapon: o.weapon,
    trail: [],
    trailMax: o.trailMax ?? 8,
    data: o.data ?? {},
    returning: o.returning,
    hitCd: o.hitCd,
    discSpin: o.discSpin,
    wallBounces: o.wallBounces,
    noStick: o.noStick,
    update: o.update,
    draw: o.draw,
  };
}

/* ------------------------------ SNIPER BEAM ------------------------------ */
const sniperBeam: Weapon = {
  id: "sniperBeam",
  name: "Railgun Sniper BEAM",
  tag: "HITSCAN · PHOTON LANCE",
  accent: "#7dd3fc",
  accent2: "#e0f2fe",
  mode: "beam",
  cooldown: 0.85,
  recoilAmt: 18,
  len: 230,
  muzzle: [228, -8],
  muzzleKick: { x: 14 },
  iconScale: 0.36,
  markSize: 26,
  draw(ctx, s) {
    const r = s.recoil;
    const pulse = 0.5 + 0.5 * Math.sin(s.t * 5);
    ctx.save();
    ctx.translate(-r * 14, 0);
    // chassis
    ctx.beginPath();
    ctx.moveTo(-104, -16);
    ctx.lineTo(-34, -20);
    ctx.lineTo(-34, 10);
    ctx.lineTo(-62, 12);
    ctx.lineTo(-70, 28);
    ctx.lineTo(-86, 28);
    ctx.lineTo(-90, 10);
    ctx.lineTo(-104, 8);
    ctx.closePath();
    ctx.fillStyle = metal(ctx, -20, 28, "#64748b", "#1e293b", "#070b10");
    ctx.fill();
    outline(ctx, 0.6);
    // skeleton stock cutouts and cheek support
    ctx.fillStyle = "#080d14";
    roundRect(ctx, -99, -8, 18, 10, 3);
    ctx.fill();
    ctx.strokeStyle = "rgba(203,213,225,0.24)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-88, 18);
    ctx.lineTo(-72, 18);
    ctx.moveTo(-98, -12);
    ctx.lineTo(-86, -12);
    ctx.stroke();
    bar(
      ctx,
      -36,
      -22,
      110,
      30,
      metal(ctx, -22, 8, "#7a879b", "#28303c", "#0a0e14"),
      6,
    );
    outline(ctx, 0.6);
    // glowing core line
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const cg = ctx.createLinearGradient(-30, 0, 220, 0);
    cg.addColorStop(0, withAlpha("#38bdf8", 0.1));
    cg.addColorStop(1, withAlpha("#7dd3fc", 0.8));
    ctx.fillStyle = cg;
    ctx.fillRect(-30, -4, 250, 3);
    ctx.fillStyle = "rgba(226,244,255,0.42)";
    ctx.fillRect(-24, 3, 208, 1.2);
    ctx.restore();
    // receiver fasteners and selector plate
    rivet(ctx, -26, -15, 1.7);
    rivet(ctx, 58, -15, 1.7);
    bar(ctx, -4, -10, 20, 9, "#0b1017", 2);
    bar(ctx, 0, -9, 12 - r * 9, 5, gunmetal(ctx, -9, -4), 1);
    // grip
    ctx.save();
    ctx.translate(-22, 8);
    ctx.rotate(0.2);
    bar(
      ctx,
      -8,
      0,
      17,
      36,
      metal(ctx, 0, 36, "#424a57", "#1d222a", "#090c10"),
      5,
    );
    ctx.restore();
    // scope
    bar(
      ctx,
      -10,
      -50,
      92,
      20,
      metal(ctx, -50, -30, "#6b7687", "#242b35", "#0a0e13"),
      9,
    );
    bar(
      ctx,
      76,
      -54,
      18,
      28,
      metal(ctx, -54, -26, "#7c8698", "#2a323d", "#0b0f15"),
      6,
    );
    bar(
      ctx,
      -17,
      -47,
      13,
      24,
      metal(ctx, -47, -23, "#8896a8", "#354052", "#0b1018"),
      5,
    );
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const ocular = ctx.createLinearGradient(-15, -45, -8, -25);
    ocular.addColorStop(0, "rgba(207,250,254,0.72)");
    ocular.addColorStop(0.55, "rgba(56,189,248,0.4)");
    ocular.addColorStop(1, "rgba(8,47,73,0.1)");
    ctx.fillStyle = ocular;
    roundRect(ctx, -15, -45, 6, 20, 3);
    ctx.fill();
    ctx.strokeStyle = `rgba(186,230,253,${0.45 + pulse * 0.4})`;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(-14, -35);
    ctx.lineTo(-10, -35);
    ctx.moveTo(-12, -38);
    ctx.lineTo(-12, -32);
    ctx.stroke();
    ctx.restore();
    emissive(ctx, 86, -40, 12, "#67e8f9", 0.5 + pulse * 0.4);
    // rail barrel with focusing rings
    bar(
      ctx,
      74,
      -12,
      150,
      14,
      metal(ctx, -12, 2, "#5b6778", "#222a35", "#0a0e14"),
      4,
    );
    for (let i = 0; i < 5; i++) {
      const x = 96 + i * 26;
      bar(
        ctx,
        x,
        -20,
        9,
        28,
        metal(ctx, -20, 8, "#93c5fd", "#1d4ed8", "#0b1a33"),
        3,
      );
      glowingRivet(ctx, x + 4, -6, 2.5, "#38bdf8", pulse);
    }
    // bipod
    ctx.strokeStyle = "#2b323c";
    ctx.lineWidth = 6;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(150, 2);
    ctx.lineTo(130, 43);
    ctx.moveTo(150, 2);
    ctx.lineTo(174, 43);
    ctx.stroke();
    rivet(ctx, 150, 3, 4);
    bar(ctx, 122, 40, 17, 5, blacksteel(ctx, 40, 45), 2.5);
    bar(ctx, 168, 40, 17, 5, blacksteel(ctx, 40, 45), 2.5);
    ctx.strokeStyle = "rgba(203,213,225,0.4)";
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(130, 36);
    ctx.lineTo(139, 17);
    ctx.moveTo(174, 36);
    ctx.lineTo(164, 17);
    ctx.stroke();
    // emitter
    bar(
      ctx,
      212,
      -16,
      22,
      22,
      metal(ctx, -16, 6, "#9fb3c8", "#334155", "#0e1420"),
      4,
    );
    emissive(ctx, 230, -6, 20 + pulse * 10, "#bae6fd", 0.75);
    ctx.restore();
  },
  fire(api, x, y, a) {
    audio.play("sniper");
    const hs = api.hitscan(x, y, a);
    const len = hs.hit ? hs.dist : 1600;
    energyMuzzle(api, x, y, a, "#bae6fd", "#38bdf8", 70);
    api.flash("#cfefff", 0.35);
    api.shake(22);
    api.hitstop(0.07);
    // shockwave cones along barrel
    for (let i = 0; i < 3; i++)
      api.particles.push(
        P({
          type: "shock",
          x: x + Math.cos(a) * i * 26,
          y: y + Math.sin(a) * i * 26,
          rot: a,
          size: 120 + i * 40,
          size2: 10,
          color: "#e0f2fe",
          width: 3,
          life: 0.3 + i * 0.07,
        }),
      );
    api.beams.push(
      makeBeam({
        weapon: sniperBeam,
        x,
        y,
        angle: a,
        len,
        duration: 0.42,
        hit: hs.hit,
        hitX: hs.x,
        hitY: hs.y,
        tick(bm, dt, g) {
          for (
            let i = 0, n = emissionCount(dt, 40 * (1 - bm.age / bm.duration));
            i < n;
            i++
          ) {
            const d = rnd(0, bm.len);
            g.particles.push(
              P({
                type: "spark",
                x: bm.x + Math.cos(bm.angle) * d + rnd(-3, 3),
                y: bm.y + Math.sin(bm.angle) * d + rnd(-3, 3),
                vx: Math.cos(bm.angle + Math.PI / 2) * rnd(-180, 180),
                vy: Math.sin(bm.angle + Math.PI / 2) * rnd(-180, 180),
                color: "#e0f2fe",
                life: rnd(0.15, 0.4),
                width: 1.4,
                grav: 150,
              }),
            );
          }
        },
        draw(ctx, bm) {
          const k = 1 - bm.age / bm.duration;
          const x1 = bm.x + Math.cos(bm.angle) * bm.len;
          const y1 = bm.y + Math.sin(bm.angle) * bm.len;
          ctx.save();
          ctx.globalCompositeOperation = "lighter";
          const w = 16 * k * k + 2;
          const g = ctx.createLinearGradient(bm.x, bm.y, x1, y1);
          g.addColorStop(0, withAlpha("#7dd3fc", 0.1 * k));
          g.addColorStop(0.3, withAlpha("#bae6fd", 0.75 * k));
          g.addColorStop(1, withAlpha("#ffffff", 0.9 * k));
          ctx.strokeStyle = g;
          ctx.lineWidth = w * 2.6;
          ctx.lineCap = "round";
          ctx.beginPath();
          ctx.moveTo(bm.x, bm.y);
          ctx.lineTo(x1, y1);
          ctx.stroke();
          ctx.strokeStyle = withAlpha("#ffffff", 0.95 * k);
          ctx.lineWidth = Math.max(0.8, w * 0.42);
          ctx.stroke();
          // spiral ionisation
          ctx.strokeStyle = withAlpha("#38bdf8", 0.55 * k);
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          for (let i = 0; i <= 60; i++) {
            const t2 = i / 60;
            const px = lerp(bm.x, x1, t2);
            const py = lerp(bm.y, y1, t2);
            const off = Math.sin(t2 * 26 - bm.age * 30) * (10 * k);
            const nx = -Math.sin(bm.angle),
              ny = Math.cos(bm.angle);
            i
              ? ctx.lineTo(px + nx * off, py + ny * off)
              : ctx.moveTo(px + nx * off, py + ny * off);
          }
          ctx.stroke();
          ctx.restore();
        },
      }),
    );
    if (hs.hit) {
      api.registerHit(hs.x, hs.y, sniperBeam);
    }
  },
  onImpact(api, x, y) {
    plasmaImpact(api, x, y, "#bae6fd", "#38bdf8", 1.3);
    woodChips(api, x, y, 0, 14, 1.2);
    api.shake(16);
  },
  drawMark: drawWeaponMark,
};

/* ----------------------------- DRAGON BREATH ----------------------------- */
const dragonBreath: Weapon = {
  id: "dragonBreath",
  name: "Dragon Breath Cannon",
  tag: "INFERNO CONE · MYTHIC",
  accent: "#ff7a18",
  accent2: "#ffcf4d",
  mode: "beam",
  cooldown: 0.9,
  recoilAmt: 16,
  len: 210,
  muzzle: [196, -6],
  muzzleKick: { x: 12 },
  iconScale: 0.42,
  markSize: 38,
  draw(ctx, s) {
    const r = s.recoil;
    const breathe = 0.5 + 0.5 * Math.sin(s.t * 3.2);
    const flick = 0.55 + 0.45 * Math.sin(s.t * 12);
    ctx.save();
    ctx.translate(-r * 12, 0);

    const scaleSkin = (
      x0: number,
      y0: number,
      x1: number,
      y1: number,
      step: number,
    ) => {
      ctx.save();
      ctx.clip();
      for (let y = y0, row = 0; y < y1; y += step * 0.7, row++) {
        for (let x = x0 + (row % 2) * step * 0.5; x < x1; x += step) {
          ctx.beginPath();
          ctx.arc(x, y, step * 0.58, Math.PI * 0.08, Math.PI * 0.92);
          ctx.strokeStyle = "rgba(255,196,120,0.22)";
          ctx.lineWidth = 1.1;
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(x, y - 1, step * 0.58, Math.PI * 1.1, Math.PI * 1.9);
          ctx.strokeStyle = "rgba(60,10,6,0.25)";
          ctx.stroke();
        }
      }
      ctx.restore();
    };

    /* ---------------- wing guard (drawn behind the body) ---------------- */
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(8, -18);
    ctx.quadraticCurveTo(28, -92, 104, -104);
    ctx.quadraticCurveTo(84, -74, 96, -58);
    ctx.quadraticCurveTo(70, -62, 64, -40);
    ctx.quadraticCurveTo(46, -46, 30, -16);
    ctx.closePath();
    const wg = ctx.createLinearGradient(10, -100, 70, -10);
    wg.addColorStop(0, "#f97316");
    wg.addColorStop(0.35, "#b91c1c");
    wg.addColorStop(0.75, "#7f1d1d");
    wg.addColorStop(1, "#3b0a0a");
    ctx.fillStyle = wg;
    ctx.fill();
    ctx.strokeStyle = "rgba(20,4,2,0.7)";
    ctx.lineWidth = 2;
    ctx.stroke();
    // wing finger bones
    ctx.strokeStyle = "rgba(253,224,160,0.6)";
    ctx.lineWidth = 2.4;
    ctx.lineCap = "round";
    for (const [ex, ey] of [
      [100, -100],
      [92, -60],
      [62, -42],
    ] as number[][]) {
      ctx.beginPath();
      ctx.moveTo(14, -20);
      ctx.quadraticCurveTo((ex + 14) / 2 - 6, (ey - 20) / 2 - 16, ex, ey);
      ctx.stroke();
    }
    ctx.restore();

    /* --------------------------- body + neck --------------------------- */
    ctx.beginPath();
    ctx.moveTo(-118, 0);
    ctx.bezierCurveTo(-100, -22, -64, -30, -24, -29);
    ctx.lineTo(116, -28);
    ctx.lineTo(116, 24);
    ctx.lineTo(-24, 25);
    ctx.bezierCurveTo(-62, 25, -94, 20, -118, 13);
    ctx.closePath();
    const bodyg = ctx.createLinearGradient(0, -30, 0, 26);
    bodyg.addColorStop(0, "#ef4444");
    bodyg.addColorStop(0.3, "#b91c1c");
    bodyg.addColorStop(0.62, "#7f1d1d");
    bodyg.addColorStop(0.82, "#8a4a12");
    bodyg.addColorStop(1, "#f0c069");
    ctx.fillStyle = bodyg;
    ctx.fill();
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(-118, 0);
    ctx.bezierCurveTo(-100, -22, -64, -30, -24, -29);
    ctx.lineTo(116, -28);
    ctx.lineTo(116, 24);
    ctx.lineTo(-24, 25);
    ctx.bezierCurveTo(-62, 25, -94, 20, -118, 13);
    ctx.closePath();
    scaleSkin(-120, -30, 120, 12, 11);
    ctx.restore();
    ctx.strokeStyle = "rgba(25,5,3,0.75)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-118, 0);
    ctx.bezierCurveTo(-100, -22, -64, -30, -24, -29);
    ctx.lineTo(116, -28);
    ctx.moveTo(116, 24);
    ctx.lineTo(-24, 25);
    ctx.bezierCurveTo(-62, 25, -94, 20, -118, 13);
    ctx.stroke();

    // golden belly plates
    for (let i = 0; i < 11; i++) {
      const x = -104 + i * 20;
      ctx.beginPath();
      roundRect(ctx, x, 12, 17, 11, 4);
      const pg = ctx.createLinearGradient(0, 12, 0, 23);
      pg.addColorStop(0, "#fde68a");
      pg.addColorStop(0.6, "#d9a441");
      pg.addColorStop(1, "#8a5a12");
      ctx.fillStyle = pg;
      ctx.fill();
      ctx.strokeStyle = "rgba(60,30,4,0.5)";
      ctx.lineWidth = 0.9;
      ctx.stroke();
    }

    // spine spikes
    for (let i = 0; i < 9; i++) {
      const x = -106 + i * 22;
      const h = 12 + Math.sin(i * 0.7) * 4 + i * 0.7;
      const base = i < 3 ? -18 - i * 3 : -27;
      ctx.beginPath();
      ctx.moveTo(x, base + 4);
      ctx.quadraticCurveTo(x + 4, base - h, x + 14, base - 1);
      ctx.closePath();
      const sg = ctx.createLinearGradient(x, base - h, x, base);
      sg.addColorStop(0, "#fff3cd");
      sg.addColorStop(0.5, "#e0a63c");
      sg.addColorStop(1, "#7c2d12");
      ctx.fillStyle = sg;
      ctx.fill();
      ctx.strokeStyle = "rgba(40,12,2,0.6)";
      ctx.lineWidth = 0.9;
      ctx.stroke();
    }

    // tail tip fin
    ctx.beginPath();
    ctx.moveTo(-112, -4);
    ctx.quadraticCurveTo(-148, -30, -156, -2);
    ctx.quadraticCurveTo(-146, 10, -114, 12);
    ctx.closePath();
    const tf = ctx.createLinearGradient(-156, -20, -112, 12);
    tf.addColorStop(0, "#fb923c");
    tf.addColorStop(0.6, "#9a1b1b");
    tf.addColorStop(1, "#4c0f0f");
    ctx.fillStyle = tf;
    ctx.fill();
    ctx.strokeStyle = "rgba(25,5,3,0.7)";
    ctx.lineWidth = 1.6;
    ctx.stroke();

    /* ------------------------------ grip ------------------------------ */
    ctx.save();
    ctx.translate(-34, 22);
    ctx.rotate(0.22);
    ctx.beginPath();
    ctx.moveTo(-11, 0);
    ctx.quadraticCurveTo(-14, 26, -6, 44);
    ctx.lineTo(12, 42);
    ctx.quadraticCurveTo(14, 20, 10, 0);
    ctx.closePath();
    const gg = ctx.createLinearGradient(-12, 0, 14, 40);
    gg.addColorStop(0, "#8a3b12");
    gg.addColorStop(0.5, "#5c2409");
    gg.addColorStop(1, "#2a0f03");
    ctx.fillStyle = gg;
    ctx.fill();
    ctx.strokeStyle = "rgba(20,6,2,0.8)";
    ctx.lineWidth = 1.6;
    ctx.stroke();
    // claws on grip
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(-10, 8 + i * 12);
      ctx.quadraticCurveTo(-22, 12 + i * 12, -24, 20 + i * 12);
      ctx.quadraticCurveTo(-14, 16 + i * 12, -9, 16 + i * 12);
      ctx.closePath();
      const cg2 = ctx.createLinearGradient(-24, 0, -8, 0);
      cg2.addColorStop(0, "#fff6dd");
      cg2.addColorStop(1, "#b78b4a");
      ctx.fillStyle = cg2;
      ctx.fill();
    }
    ctx.restore();

    // trigger guard
    ctx.strokeStyle = "#3b1706";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(-18, 28, 15, -0.35, Math.PI + 0.1);
    ctx.stroke();

    /* ------------------------------ head ------------------------------ */
    ctx.save();
    ctx.translate(112, -2);

    // back horns (behind skull)
    for (const [hy, hl, hc] of [
      [-18, 70, -22],
      [-10, 54, -4],
    ] as number[][]) {
      ctx.beginPath();
      ctx.moveTo(-2, hy);
      ctx.quadraticCurveTo(-hl * 0.55, hy + hc - 10, -hl, hy + hc);
      ctx.quadraticCurveTo(-hl * 0.5, hy + hc + 8, 2, hy + 10);
      ctx.closePath();
      const hgx = ctx.createLinearGradient(0, hy, -hl, hy + hc);
      hgx.addColorStop(0, "#6b3310");
      hgx.addColorStop(0.45, "#d9b27a");
      hgx.addColorStop(1, "#fffaf0");
      ctx.fillStyle = hgx;
      ctx.fill();
      ctx.strokeStyle = "rgba(40,16,2,0.6)";
      ctx.lineWidth = 1.2;
      ctx.stroke();
      // horn ridges
      ctx.strokeStyle = "rgba(80,40,10,0.4)";
      ctx.lineWidth = 1;
      for (let i = 1; i < 5; i++) {
        const t2 = i / 5;
        ctx.beginPath();
        ctx.moveTo(-hl * t2, hy + hc * t2 - 6 * (1 - t2));
        ctx.lineTo(-hl * t2 + 4, hy + hc * t2 + 8 * (1 - t2));
        ctx.stroke();
      }
    }

    // ---- mouth interior glow (behind jaws) ----
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const mg = ctx.createRadialGradient(58, 0, 2, 58, 0, 52 + breathe * 14);
    mg.addColorStop(0, `rgba(255,252,220,${0.85 * (0.6 + breathe * 0.4)})`);
    mg.addColorStop(0.3, `rgba(255,160,40,${0.6 + breathe * 0.2})`);
    mg.addColorStop(0.65, "rgba(220,60,0,0.3)");
    mg.addColorStop(1, "rgba(160,20,0,0)");
    ctx.fillStyle = mg;
    ctx.beginPath();
    ctx.arc(58, 0, 52 + breathe * 14, 0, TAU);
    ctx.fill();
    ctx.restore();

    // ---- lower jaw ----
    ctx.save();
    ctx.rotate(0.07 + breathe * 0.04);
    ctx.beginPath();
    ctx.moveTo(-10, 4);
    ctx.bezierCurveTo(24, 18, 56, 16, 84, 6);
    ctx.lineTo(80, 15);
    ctx.bezierCurveTo(52, 30, 16, 30, -10, 20);
    ctx.closePath();
    const ljg = ctx.createLinearGradient(0, 4, 0, 30);
    ljg.addColorStop(0, "#b91c1c");
    ljg.addColorStop(0.45, "#7f1d1d");
    ljg.addColorStop(1, "#c58a31");
    ctx.fillStyle = ljg;
    ctx.fill();
    ctx.strokeStyle = "rgba(25,5,3,0.8)";
    ctx.lineWidth = 1.7;
    ctx.stroke();
    // lower teeth
    ctx.fillStyle = "#fffaf0";
    for (let i = 0; i < 7; i++) {
      const tx = 2 + i * 11;
      const th = 8 + (i % 2) * 4;
      ctx.beginPath();
      ctx.moveTo(tx, 11);
      ctx.lineTo(tx + 6, 11);
      ctx.lineTo(tx + 3, 11 - th);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    // ---- upper skull ----
    ctx.beginPath();
    ctx.moveTo(-14, -26);
    ctx.bezierCurveTo(16, -40, 54, -36, 76, -22);
    ctx.quadraticCurveTo(92, -16, 94, -8);
    ctx.lineTo(78, -2);
    ctx.bezierCurveTo(52, 2, 16, 4, -14, 2);
    ctx.closePath();
    const skg = ctx.createLinearGradient(0, -40, 0, 6);
    skg.addColorStop(0, "#fda4a4");
    skg.addColorStop(0.22, "#dc2626");
    skg.addColorStop(0.6, "#991b1b");
    skg.addColorStop(1, "#4a0d0d");
    ctx.fillStyle = skg;
    ctx.fill();
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(-14, -26);
    ctx.bezierCurveTo(16, -40, 54, -36, 76, -22);
    ctx.quadraticCurveTo(92, -16, 94, -8);
    ctx.lineTo(78, -2);
    ctx.bezierCurveTo(52, 2, 16, 4, -14, 2);
    ctx.closePath();
    scaleSkin(-16, -38, 96, 2, 9);
    ctx.restore();
    ctx.strokeStyle = "rgba(25,5,3,0.85)";
    ctx.lineWidth = 1.8;
    ctx.stroke();

    // upper teeth
    ctx.fillStyle = "#fffaf0";
    for (let i = 0; i < 8; i++) {
      const tx = -2 + i * 11;
      const th = 9 + (i % 2) * 5;
      ctx.beginPath();
      ctx.moveTo(tx, -1);
      ctx.lineTo(tx + 6, -1);
      ctx.lineTo(tx + 3, -1 + th);
      ctx.closePath();
      ctx.fill();
    }
    // fang
    ctx.beginPath();
    ctx.moveTo(70, -2);
    ctx.lineTo(79, -3);
    ctx.lineTo(74, 14);
    ctx.closePath();
    ctx.fill();

    // brow ridge
    ctx.beginPath();
    ctx.moveTo(2, -26);
    ctx.quadraticCurveTo(26, -38, 50, -27);
    ctx.quadraticCurveTo(26, -30, 4, -19);
    ctx.closePath();
    const brg = ctx.createLinearGradient(0, -38, 0, -18);
    brg.addColorStop(0, "#fde68a");
    brg.addColorStop(1, "#b45309");
    ctx.fillStyle = brg;
    ctx.fill();

    // cheek spike
    ctx.beginPath();
    ctx.moveTo(6, -6);
    ctx.lineTo(-18, 2);
    ctx.lineTo(6, 4);
    ctx.closePath();
    ctx.fillStyle = "#e7c98a";
    ctx.fill();

    // eye
    ctx.beginPath();
    ctx.ellipse(22, -17, 9, 6.4, -0.16, 0, TAU);
    const eg = ctx.createRadialGradient(20, -18, 1, 22, -17, 10);
    eg.addColorStop(0, "#fffbe6");
    eg.addColorStop(0.45, "#fbbf24");
    eg.addColorStop(1, "#b45309");
    ctx.fillStyle = eg;
    ctx.fill();
    ctx.strokeStyle = "rgba(40,12,2,0.8)";
    ctx.lineWidth = 1.3;
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(24, -17, 2.1, 5.2, -0.16, 0, TAU);
    ctx.fillStyle = "#190700";
    ctx.fill();
    emissive(ctx, 22, -17, 15 + flick * 6, "#fbbf24", 0.5);

    // nostril + smoke wisp
    ctx.fillStyle = "rgba(30,8,0,0.75)";
    ctx.beginPath();
    ctx.ellipse(80, -13, 3.6, 2.4, 0.35, 0, TAU);
    ctx.fill();

    // hot breath at the muzzle
    emissive(ctx, 84, -4, 22 + breathe * 10, "#ff9c2a", 0.55 + breathe * 0.25);
    ctx.restore();

    ctx.restore();
  },
  fire(api, x, y, a) {
    audio.play("fire");
    api.flash("#ff8c2b", 0.26);
    api.shake(14);
    const hs = api.hitscan(x, y, a);
    api.beams.push(
      makeBeam({
        weapon: dragonBreath,
        x,
        y,
        angle: a,
        len: hs.hit ? hs.dist : 900,
        duration: 0.75,
        hit: hs.hit,
        hitX: hs.x,
        hitY: hs.y,
        tick(bm, dt, g) {
          const k = clamp(1 - bm.age / bm.duration, 0, 1);
          const n = emissionCount(dt, 360 * k);
          for (let i = 0; i < n; i++) {
            const spread = rnd(-0.26, 0.26) * (0.4 + rnd());
            const sp = rnd(420, 1150);
            const ang = bm.angle + spread;
            g.particles.push(
              P({
                type: "fire",
                x: bm.x + Math.cos(bm.angle) * rnd(0, 20) + rnd(-6, 6),
                y: bm.y + Math.sin(bm.angle) * rnd(0, 20) + rnd(-6, 6),
                vx: Math.cos(ang) * sp,
                vy: Math.sin(ang) * sp - 40,
                size: rnd(26, 62),
                size2: 6,
                color: pick(["#ff9a1f", "#ff6a00", "#ffd166"]),
                color2: "#8c1a00",
                life: rnd(0.3, 0.62),
                drag: 0.9,
              }),
            );
          }
          for (let i = 0, n = emissionCount(dt, 90 * k); i < n; i++) {
            const ang = bm.angle + rnd(-0.3, 0.3);
            g.particles.push(
              P({
                type: "ember",
                x: bm.x,
                y: bm.y,
                vx: Math.cos(ang) * rnd(300, 900),
                vy: Math.sin(ang) * rnd(300, 900),
                size: rnd(1.2, 2.8),
                color: "#ffe08a",
                color2: "#ff4d00",
                life: rnd(0.5, 1.3),
                grav: 240,
                drag: 0.96,
              }),
            );
          }
          for (let i = 0, n = emissionCount(dt, 8 * k); i < n; i++)
            g.particles.push(
              P({
                type: "smoke",
                x: bm.x + Math.cos(bm.angle) * rnd(40, 240),
                y: bm.y + Math.sin(bm.angle) * rnd(40, 240),
                vx: rnd(-60, 60),
                vy: rnd(-120, -20),
                size: rnd(40, 90),
                size2: 14,
                color: "#3a2b22",
                life: rnd(0.8, 1.7),
              }),
            );
        },
        draw(ctx, bm) {
          const k = clamp(1 - bm.age / bm.duration, 0, 1);
          ctx.save();
          ctx.globalCompositeOperation = "lighter";
          ctx.translate(bm.x, bm.y);
          ctx.rotate(bm.angle);
          const L = bm.len;
          const g = ctx.createLinearGradient(0, 0, L, 0);
          g.addColorStop(0, `rgba(255,255,220,${0.8 * k})`);
          g.addColorStop(0.25, `rgba(255,170,40,${0.5 * k})`);
          g.addColorStop(1, `rgba(200,40,0,0)`);
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.moveTo(0, -10 * k);
          ctx.quadraticCurveTo(L * 0.5, -L * 0.17 * k, L, -L * 0.2 * k);
          ctx.lineTo(L, L * 0.2 * k);
          ctx.quadraticCurveTo(L * 0.5, L * 0.17 * k, 0, 10 * k);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        },
      }),
    );
    if (hs.hit) api.registerHit(hs.x, hs.y, dragonBreath);
  },
  onImpact(api, x, y, a) {
    fireImpact(api, x, y, a);
    api.shake(10);
  },
  drawMark: drawWeaponMark,
};

/* --------------------------------- PHASER -------------------------------- */
const phaser: Weapon = {
  id: "phaser",
  name: "Phaser Type-II",
  tag: "STAR TREK · NADION BEAM",
  accent: "#fb923c",
  accent2: "#fde68a",
  mode: "beam",
  cooldown: 0.6,
  recoilAmt: 4,
  len: 120,
  muzzle: [104, -8],
  muzzleKick: { x: 3 },
  iconScale: 0.74,
  markSize: 22,
  draw(ctx, s) {
    const pulse = 0.5 + 0.5 * Math.sin(s.t * 6);
    ctx.save();
    ctx.translate(-s.recoil * 3, 0);
    // body shell
    ctx.beginPath();
    ctx.moveTo(-54, 2);
    ctx.quadraticCurveTo(-58, -20, -28, -24);
    ctx.lineTo(62, -22);
    ctx.quadraticCurveTo(96, -20, 100, -6);
    ctx.quadraticCurveTo(96, 6, 62, 8);
    ctx.lineTo(0, 12);
    ctx.quadraticCurveTo(-30, 26, -50, 20);
    ctx.closePath();
    const bg = ctx.createLinearGradient(0, -26, 0, 24);
    bg.addColorStop(0, "#cbd5e1");
    bg.addColorStop(0.35, "#64748b");
    bg.addColorStop(0.7, "#334155");
    bg.addColorStop(1, "#0f172a");
    ctx.fillStyle = bg;
    ctx.fill();
    outline(ctx, 0.6, 1.4);
    // ergonomic swept grip under the emitter body
    ctx.beginPath();
    ctx.moveTo(-8, 8);
    ctx.lineTo(18, 8);
    ctx.lineTo(28, 42);
    ctx.quadraticCurveTo(13, 50, -5, 42);
    ctx.closePath();
    ctx.fillStyle = metal(ctx, 8, 50, "#64748b", "#253244", "#090d16");
    ctx.fill();
    outline(ctx, 0.65, 1.3);
    ctx.strokeStyle = "rgba(226,232,240,0.2)";
    ctx.lineWidth = 1.1;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(1 + i * 4, 18 + i * 2);
      ctx.lineTo(8 + i * 4, 39 + i * 1.4);
      ctx.stroke();
    }
    // trigger guard
    ctx.strokeStyle = "#111827";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-1, 12);
    ctx.quadraticCurveTo(12, 24, 22, 12);
    ctx.stroke();
    ctx.strokeStyle = "rgba(226,232,240,0.42)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-2, -4);
    ctx.lineTo(-31, -2);
    ctx.stroke();
    // top insert
    ctx.beginPath();
    ctx.moveTo(-24, -18);
    ctx.lineTo(60, -17);
    ctx.quadraticCurveTo(80, -16, 84, -8);
    ctx.lineTo(-20, -6);
    ctx.closePath();
    ctx.fillStyle = "#1e293b";
    ctx.fill();
    // control strip
    for (let i = 0; i < 4; i++) {
      const on = i / 4 <= pulse;
      bar(ctx, -14 + i * 13, -15, 9, 5, on ? "#fbbf24" : "#475569", 2);
    }
    // phase selector dial and moving charge indicator
    ctx.beginPath();
    ctx.arc(2, -14, 5.2, 0, TAU);
    ctx.fillStyle = "#0b1220";
    ctx.fill();
    ctx.strokeStyle = "rgba(251,191,36,0.9)";
    ctx.lineWidth = 1.1;
    ctx.stroke();
    ctx.strokeStyle = "#fef3c7";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(2, -14);
    ctx.lineTo(
      2 + Math.cos(pulse * 2.4) * 3.3,
      -14 + Math.sin(pulse * 2.4) * 3.3,
    );
    ctx.stroke();
    bar(ctx, 34, -16, 30, 7, "#0ea5e9", 3);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = `rgba(56,189,248,${0.25 + pulse * 0.3})`;
    roundRect(ctx, 34, -16, 30, 7, 3);
    ctx.fill();
    ctx.restore();
    // emitter crystal
    ctx.beginPath();
    ctx.moveTo(88, -16);
    ctx.lineTo(104, -11);
    ctx.lineTo(104, -3);
    ctx.lineTo(88, 2);
    ctx.closePath();
    const eg = ctx.createLinearGradient(88, 0, 104, 0);
    eg.addColorStop(0, "#7c2d12");
    eg.addColorStop(1, "#fdba74");
    ctx.fillStyle = eg;
    ctx.fill();
    ctx.strokeStyle = "rgba(255,237,213,0.8)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(98, -12);
    ctx.lineTo(101, -7);
    ctx.lineTo(98, -2);
    ctx.stroke();
    emissive(ctx, 102, -7, 14 + pulse * 7, "#fb923c", 0.7);
    // emitter aperture shutters contract and open with the charge pulse
    ctx.save();
    ctx.translate(101, -7);
    const aperture = 2 + pulse * 2.1;
    ctx.strokeStyle = `rgba(255,237,213,${0.6 + pulse * 0.4})`;
    ctx.lineWidth = 1;
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * TAU + s.t * 0.45;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * aperture, Math.sin(a) * aperture);
      ctx.lineTo(Math.cos(a) * 7, Math.sin(a) * 7);
      ctx.stroke();
    }
    ctx.restore();
    // grip ridges
    ctx.strokeStyle = "rgba(0,0,0,0.5)";
    ctx.lineWidth = 2;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(-46 + i * 7, 4);
      ctx.lineTo(-50 + i * 7, 18);
      ctx.stroke();
    }
    ctx.restore();
  },
  fire(api, x, y, a) {
    audio.play("laser");
    const hs = api.hitscan(x, y, a);
    energyMuzzle(api, x, y, a, "#fb923c", "#fde68a", 40);
    api.flash("#ffb062", 0.18);
    api.shake(5);
    api.beams.push(
      makeBeam({
        weapon: phaser,
        x,
        y,
        angle: a,
        len: hs.hit ? hs.dist : 1400,
        duration: 0.55,
        hit: hs.hit,
        hitX: hs.x,
        hitY: hs.y,
        tick(bm, dt, g) {
          for (let i = 0, n = emissionCount(dt, bm.hit ? 24 : 0); i < n; i++) {
            g.particles.push(
              P({
                type: "star",
                x: bm.hitX + rnd(-16, 16),
                y: bm.hitY + rnd(-16, 16),
                size: rnd(4, 10),
                color: "#ffd9a0",
                life: rnd(0.15, 0.4),
                width: 1.3,
              }),
            );
          }
        },
        draw(ctx, bm) {
          const k = clamp(
            Math.min(bm.age * 14, 1) * (1 - Math.pow(bm.age / bm.duration, 3)),
            0,
            1,
          );
          const x1 = bm.x + Math.cos(bm.angle) * bm.len;
          const y1 = bm.y + Math.sin(bm.angle) * bm.len;
          ctx.save();
          ctx.globalCompositeOperation = "lighter";
          ctx.lineCap = "round";
          ctx.strokeStyle = `rgba(249,115,22,${0.22 * k})`;
          ctx.lineWidth = 22 * k;
          ctx.beginPath();
          ctx.moveTo(bm.x, bm.y);
          ctx.lineTo(x1, y1);
          ctx.stroke();
          ctx.strokeStyle = `rgba(251,146,60,${0.75 * k})`;
          ctx.lineWidth = 9 * k;
          ctx.stroke();
          ctx.strokeStyle = `rgba(254,240,180,${0.95 * k})`;
          ctx.lineWidth = 3.4 * k;
          ctx.stroke();
          ctx.strokeStyle = `rgba(255,255,255,${0.95 * k})`;
          ctx.lineWidth = 1.3 * k;
          ctx.stroke();
          ctx.restore();
        },
      }),
    );
    if (hs.hit) api.registerHit(hs.x, hs.y, phaser);
  },
  onImpact(api, x, y) {
    burnImpact(api, x, y, "#fb923c", "#fde68a");
    plasmaImpact(api, x, y, "#fdba74", "#fb923c", 0.7);
    api.shake(7);
  },
  drawMark: drawWeaponMark,
};

/* ------------------------------ ENERGY SWORD ----------------------------- */
const energySword: Weapon = {
  id: "energySword",
  name: "Energy Sword",
  tag: "PLASMA SLASH · MELEE ARC",
  accent: "#38f6ff",
  accent2: "#a78bfa",
  mode: "projectile",
  cooldown: 0.5,
  recoilAmt: 10,
  len: 150,
  muzzle: [150, 0],
  muzzleKick: { rotation: -1.1 },
  iconScale: 0.6,
  markSize: 34,
  draw(ctx, s) {
    const pulse = 0.5 + 0.5 * Math.sin(s.t * 9);
    const swing = s.recoil;
    const bladeTip = 158 + 3 * Math.sin(s.t * 5.5);
    const bladeFlicker = 0.94 + 0.06 * Math.sin(s.t * 31);
    ctx.save();
    ctx.rotate(-swing * 1.1);

    /* ---------------- hilt ---------------- */
    ctx.beginPath();
    ctx.moveTo(-66, -11);
    ctx.quadraticCurveTo(-76, 0, -66, 12);
    ctx.lineTo(-8, 20);
    ctx.quadraticCurveTo(14, 22, 24, 12);
    ctx.lineTo(34, 0);
    ctx.lineTo(24, -13);
    ctx.quadraticCurveTo(14, -23, -8, -21);
    ctx.closePath();
    const hg = ctx.createLinearGradient(0, -24, 0, 22);
    hg.addColorStop(0, "#e2e8f0");
    hg.addColorStop(0.3, "#94a3b8");
    hg.addColorStop(0.6, "#475569");
    hg.addColorStop(1, "#0f172a");
    ctx.fillStyle = hg;
    ctx.fill();
    outline(ctx, 0.7, 1.6);

    // grip wrap
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      roundRect(ctx, -60 + i * 10, -14, 7, 28, 3);
      ctx.fillStyle = i % 2 ? "#1e293b" : "#334155";
      ctx.fill();
    }
    // energy cell
    ctx.beginPath();
    ctx.arc(-14, 0, 11, 0, TAU);
    const cg = ctx.createRadialGradient(-16, -3, 1, -14, 0, 12);
    cg.addColorStop(0, "#f5d0fe");
    cg.addColorStop(0.5, "#a855f7");
    cg.addColorStop(1, "#4c1d95");
    ctx.fillStyle = cg;
    ctx.fill();
    emissive(ctx, -14, 0, 18 + pulse * 7, "#c084fc", 0.65);

    // emitter prongs
    for (const d of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(18, d * 6);
      ctx.quadraticCurveTo(40, d * 16, 48, d * 10);
      ctx.quadraticCurveTo(40, d * 6, 26, d * 2);
      ctx.closePath();
      const pg = ctx.createLinearGradient(18, 0, 50, d * 14);
      pg.addColorStop(0, "#cbd5e1");
      pg.addColorStop(0.6, "#64748b");
      pg.addColorStop(1, "#1e293b");
      ctx.fillStyle = pg;
      ctx.fill();
      outline(ctx, 0.6, 1.2);
    }

    /* ---------------- twin plasma blades ---------------- */
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const d of [-1, 1]) {
      for (let pass = 0; pass < 4; pass++) {
        const w = [26, 15, 7, 2.6][pass];
        const alpha = [0.13, 0.28, 0.55, 0.98][pass] * (0.85 + pulse * 0.15);
        ctx.beginPath();
        ctx.moveTo(40, d * 8);
        ctx.bezierCurveTo(
          74,
          d * (16 + w * 0.7),
          122,
          d * (24 + w * 0.5),
          bladeTip,
          d * 34,
        );
        ctx.bezierCurveTo(
          126,
          d * (16 + w * 0.1),
          84,
          d * (8 + w * 0.1),
          42,
          d * 2,
        );
        ctx.closePath();
        const bgd = ctx.createLinearGradient(40, 0, 158, d * 34);
        bgd.addColorStop(0, `rgba(220,255,255,${alpha * bladeFlicker})`);
        bgd.addColorStop(
          0.45,
          `rgba(86,246,255,${alpha * 0.95 * bladeFlicker})`,
        );
        bgd.addColorStop(1, `rgba(167,139,250,${alpha * 0.75 * bladeFlicker})`);
        ctx.fillStyle = bgd;
        ctx.fill();
      }
      // crisp inner edge and small energized blade runes
      ctx.beginPath();
      ctx.moveTo(47, d * 5);
      ctx.bezierCurveTo(84, d * 12, 126, d * 22, bladeTip - 3, d * 31);
      ctx.strokeStyle = `rgba(245,255,255,${0.68 + pulse * 0.25})`;
      ctx.lineWidth = 1.4;
      ctx.stroke();
      for (let i = 0; i < 5; i++) {
        const x = 66 + i * 16;
        const y = d * (8 + i * 3.4);
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(d * 0.34);
        ctx.fillStyle = `rgba(220,255,255,${0.45 + 0.4 * Math.sin(s.t * 12 + i)})`;
        roundRect(ctx, -3.2, -1.2, 6.4, 2.4, 1.2);
        ctx.fill();
        ctx.restore();
      }
    }
    // base flare where blades meet
    emissive(ctx, 44, 0, 34 + pulse * 10, "#67e8f9", 0.85);
    emissive(ctx, bladeTip - 8, -32, 14, "#a5f3fc", 0.6 * pulse);
    emissive(ctx, bladeTip - 8, 32, 14, "#a5f3fc", 0.6 * pulse);
    // A sharp glint travels from the emitter toward the tips.
    const glintX = 52 + ((s.t * 70) % Math.max(1, bladeTip - 56));
    for (const d of [-1, 1]) {
      const glintY = d * lerp(6, 29, (glintX - 52) / (bladeTip - 52));
      ctx.strokeStyle = `rgba(255,255,255,${0.45 + pulse * 0.4})`;
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(glintX - 4, glintY);
      ctx.lineTo(glintX + 4, glintY);
      ctx.moveTo(glintX, glintY - 3);
      ctx.lineTo(glintX, glintY + 3);
      ctx.stroke();
    }
    ctx.restore();
    ctx.restore();
  },
  fire(api, x, y, a) {
    audio.play("sword");
    energyMuzzle(api, x, y, a, "#67e8f9", "#a78bfa", 46);
    api.shake(8);
    api.bullets.push(
      makeBullet({
        x,
        y,
        a,
        speed: 1250,
        weapon: energySword,
        kind: "crescent",
        size: 24,
        trailMax: 6,
        update(b, dt, g) {
          for (let i = 0, n = emissionCount(dt, 30); i < n; i++)
            g.particles.push(
              P({
                type: "glow",
                x: b.x + rnd(-14, 14),
                y: b.y + rnd(-14, 14),
                size: 16,
                size2: 1,
                color: "#67e8f9",
                color2: "#a78bfa",
                life: 0.3,
              }),
            );
        },
        draw(ctx, b, t) {
          ctx.save();
          ctx.translate(b.x, b.y);
          ctx.rotate(b.angle + Math.sin(t * 18) * 0.06);
          ctx.globalCompositeOperation = "lighter";
          for (let pass = 0; pass < 3; pass++) {
            const w = [26, 13, 5][pass];
            const al = [0.2, 0.5, 1][pass];
            ctx.beginPath();
            ctx.arc(-18, 0, 34, -1.0, 1.0);
            ctx.strokeStyle = `rgba(${pass === 2 ? "235,255,255" : "90,230,255"},${al})`;
            ctx.lineWidth = w * 0.5;
            ctx.lineCap = "round";
            ctx.stroke();
          }
          emissive(ctx, 14, 0, 26, "#a78bfa", 0.6);
          ctx.restore();
        },
      }),
    );
  },
  onImpact(api, x, y, a) {
    audio.play("hit");
    plasmaImpact(api, x, y, "#67e8f9", "#a78bfa", 1.1);
    woodChips(api, x, y, a, 12, 1);
    api.shake(12);
    api.hitstop(0.05);
  },
  drawMark: drawWeaponMark,
};

/* ------------------------------ PLASMACASTER ----------------------------- */
const plasmacaster: Weapon = {
  id: "plasmacaster",
  name: "Plasmacaster",
  tag: "PREDATOR · SHOULDER CANNON",
  accent: "#60a5fa",
  accent2: "#c4b5fd",
  mode: "projectile",
  cooldown: 0.75,
  recoilAmt: 12,
  impactForce: FIRE_SPECS.plasmacaster.force,
  len: 150,
  muzzle: [122, -14],
  iconScale: 0.6,
  markSize: 32,
  draw(ctx, s) {
    const pulse = 0.5 + 0.5 * Math.sin(s.t * 4.5);
    const motion = fireMotion("plasmacaster", s.shotAge);
    const slide = firingMuzzleOffset("plasmacaster", s.shotAge);
    ctx.save();
    // shoulder mount base
    ctx.beginPath();
    ctx.moveTo(-64, 20);
    ctx.quadraticCurveTo(-72, -6, -40, -12);
    ctx.lineTo(-6, -14);
    ctx.lineTo(-6, 22);
    ctx.closePath();
    ctx.fillStyle = metal(ctx, -16, 24, "#9aa5b1", "#3f4753", "#141922");
    ctx.fill();
    outline(ctx, 0.6, 1.2);
    // bio-mech plates
    ctx.fillStyle = "#6b7280";
    for (let i = 0; i < 3; i++)
      bar(
        ctx,
        -56 + i * 16,
        -6,
        12,
        20,
        metal(ctx, -6, 14, "#b9c2cd", "#5b6472", "#222935"),
        3,
      );
    // articulated arm
    ctx.save();
    ctx.translate(-10, -6);
    ctx.rotate(-0.18 - motion.charge * 0.08 + motion.kick * 0.1);
    bar(
      ctx,
      0,
      -8,
      56,
      16,
      metal(ctx, -8, 8, "#aab4c0", "#49525f", "#1b212b"),
      5,
    );
    outline(ctx, 0.55);
    ctx.beginPath();
    ctx.arc(0, 0, 10, 0, TAU);
    ctx.fillStyle = "#6b7484";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(56, 0, 9, 0, TAU);
    ctx.fill();
    ctx.restore();
    // cannon housing
    ctx.save();
    ctx.translate(48 + slide.x, -14);
    ctx.beginPath();
    ctx.moveTo(-14, -18);
    ctx.lineTo(44, -22);
    ctx.quadraticCurveTo(70, -14, 70, 0);
    ctx.quadraticCurveTo(70, 14, 44, 20);
    ctx.lineTo(-14, 16);
    ctx.closePath();
    const cg = ctx.createLinearGradient(0, -22, 0, 20);
    cg.addColorStop(0, "#cbd5e1");
    cg.addColorStop(0.4, "#6b7280");
    cg.addColorStop(0.75, "#374151");
    cg.addColorStop(1, "#111827");
    ctx.fillStyle = cg;
    ctx.fill();
    outline(ctx, 0.65, 1.4);
    // The cooling plates lift while the capacitor fills, then clamp after the shot.
    for (let i = 0; i < 4; i++) {
      const x = -7 + i * 12;
      const lift = motion.charge * (3 + i * 0.5) + motion.vent * 2;
      bar(ctx, x, -25 - lift, 8, 6, gunmetal(ctx, -25 - lift, -19 - lift), 1.5);
      ctx.strokeStyle = withAlpha("#9ad9ff", 0.16 + motion.charge * 0.65);
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(x + 2, -22 - lift);
      ctx.lineTo(x + 6, -22 - lift);
      ctx.stroke();
    }
    // tribal etching
    ctx.strokeStyle = "rgba(220,235,255,0.25)";
    ctx.lineWidth = 1.2;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(-6, -12 + i * 9);
      ctx.lineTo(24, -14 + i * 9);
      ctx.lineTo(30, -8 + i * 9);
      ctx.stroke();
    }
    // twin emitters
    for (const d of [-1, 1]) {
      bar(
        ctx,
        52,
        d * 7 - 4,
        22,
        8,
        metal(ctx, -4, 4, "#93c5fd", "#1d4ed8", "#0b1b33"),
        3,
      );
      emissive(
        ctx,
        72,
        d * 7,
        10 + pulse * 3 + motion.charge * 13 + motion.kick * 8,
        "#60a5fa",
        0.4 + motion.charge * 0.5 + motion.kick * 0.3,
      );
    }
    emissive(
      ctx,
      66,
      0,
      16 + pulse * 5 + motion.charge * 15,
      "#93c5fd",
      0.4 + motion.charge * 0.5,
    );
    if (motion.vent > 0.01) {
      ctx.strokeStyle = withAlpha("#b0cee5", motion.vent * 0.25);
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(2 + i * 10, -24);
        ctx.bezierCurveTo(
          -5 + i * 10,
          -32,
          12 + i * 10,
          -38,
          2 + i * 10,
          -49 - motion.vent * 8,
        );
        ctx.stroke();
      }
    }
    // The targeting diodes belong to the casing, not disconnected dots in empty space.
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < 3; i++) {
      const ox = 36 + Math.cos((i * TAU) / 3) * 3.8,
        oy = -11 + Math.sin((i * TAU) / 3) * 3.8;
      ctx.fillStyle = `rgba(255,40,40,${0.5 + pulse * 0.5})`;
      ctx.beginPath();
      ctx.arc(ox, oy, 1.4, 0, TAU);
      ctx.fill();
      emissive(ctx, ox, oy, 4.5, "#ff6861", 0.25 + pulse * 0.2);
    }
    ctx.restore();
    ctx.restore();
    ctx.restore();
  },
  fire(api, x, y, a) {
    firePulse(plasmacaster, api, x, y, a, "caster");
  },
  onImpact(api, x, y, a) {
    signatureImpact(plasmacaster, api, x, y, a);
  },
  drawMark: drawWeaponMark,
};

/* ----------------------------- IDENTITY DISC ----------------------------- */
const identityDisc: Weapon = {
  id: "identityDisc",
  name: "Identity Disc",
  tag: "TRON · HOMING RICOCHET · 1.5 RPS",
  accent: "#22d3ee",
  accent2: "#e0ffff",
  mode: "projectile",
  cooldown: 0.67,
  damage: 17,
  returnDamage: 12,
  recoilAmt: 3,
  impactForce: FIRE_SPECS.identityDisc.force,
  len: 90,
  muzzle: [44, -2],
  iconScale: 0.82,
  markSize: 28,
  draw(ctx, s) {
    const pulse = 0.5 + 0.5 * Math.sin(s.t * 4);
    const motion = fireMotion("identityDisc", s.shotAge, s.catchAge);
    const released = Boolean(
      s.discInFlight && (s.shotAge ?? 100) >= FIRE_SPECS.identityDisc.release,
    );
    ctx.save();

    /* ---------------- armored forearm ---------------- */
    ctx.beginPath();
    ctx.moveTo(-82, -20);
    ctx.quadraticCurveTo(-40, -28, -4, -26);
    ctx.lineTo(10, -20);
    ctx.lineTo(10, 20);
    ctx.lineTo(-4, 26);
    ctx.quadraticCurveTo(-40, 28, -82, 20);
    ctx.closePath();
    const ag = ctx.createLinearGradient(0, -28, 0, 28);
    ag.addColorStop(0, "#5b6472");
    ag.addColorStop(0.3, "#2b3340");
    ag.addColorStop(0.7, "#161b23");
    ag.addColorStop(1, "#05070b");
    ctx.fillStyle = ag;
    ctx.fill();
    outline(ctx, 0.75, 1.6);

    // plate seams
    ctx.strokeStyle = "rgba(0,0,0,0.6)";
    ctx.lineWidth = 1.6;
    for (const x of [-56, -30]) {
      ctx.beginPath();
      ctx.moveTo(x, -26);
      ctx.lineTo(x + 4, 26);
      ctx.stroke();
    }

    // glowing circuit lines
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = `rgba(34,211,238,${0.55 + pulse * 0.35})`;
    ctx.lineWidth = 2.6;
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(-76, -12);
    ctx.lineTo(-20, -12);
    ctx.lineTo(-8, -2);
    ctx.lineTo(-20, 10);
    ctx.lineTo(-76, 10);
    ctx.stroke();
    ctx.strokeStyle = `rgba(165,243,252,${0.3 + pulse * 0.3})`;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-68, -20);
    ctx.lineTo(-44, -20);
    ctx.moveTo(-68, 19);
    ctx.lineTo(-44, 19);
    ctx.stroke();
    ctx.restore();

    /* ---------------- hand gripping the disc ---------------- */
    // palm behind the disc
    ctx.beginPath();
    roundRect(ctx, 2, -22, 34, 44, 12);
    ctx.fillStyle = metal(ctx, -22, 22, "#4b5563", "#232a34", "#0b0f14");
    ctx.fill();
    outline(ctx, 0.7, 1.4);

    // The disc leaves the cradle while airborne and returns only when caught.
    if (released) {
      ctx.save();
      ctx.translate(44, -2);
      ctx.beginPath();
      ctx.arc(0, 0, 15, 0, TAU);
      ctx.fillStyle = "#07141a";
      ctx.fill();
      ctx.strokeStyle = `rgba(34,211,238,${0.65 + pulse * 0.3})`;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(0, 0, 12, 0, TAU);
      ctx.stroke();
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * TAU + s.t * 0.5;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * 4, Math.sin(a) * 4);
        ctx.lineTo(Math.cos(a) * 10, Math.sin(a) * 10);
        ctx.stroke();
      }
      emissive(ctx, 0, 0, 20, "#22d3ee", 0.32 + pulse * 0.28);
      ctx.restore();
    } else {
      ctx.save();
      ctx.translate(44, -2);
      ctx.rotate(s.t * 1.2 + motion.charge * 18);
      drawDiscShape(ctx, 42, pulse);
      if (motion.catch > 0.01)
        emissive(ctx, 0, 0, 53, "#8cf6ff", motion.catch * 0.65);
      ctx.restore();
    }

    // fingers curling over the disc rim
    for (const d of [-1, 1]) {
      ctx.save();
      const release = released ? 1 - motion.catch : motion.charge * -0.35;
      ctx.translate(30 + release * 5, d * (17 + release * 4));
      ctx.rotate(d * (0.5 + release * 0.16));
      ctx.beginPath();
      roundRect(ctx, 0, -7, 26, 14, 6);
      ctx.fillStyle = metal(ctx, -7, 7, "#64748b", "#2b3340", "#0d1218");
      ctx.fill();
      outline(ctx, 0.7, 1.3);
      ctx.beginPath();
      roundRect(ctx, 20, -6.5, 14, 13, 6);
      ctx.fillStyle = metal(ctx, -7, 7, "#7c8798", "#39414e", "#11161d");
      ctx.fill();
      outline(ctx, 0.7, 1.2);
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = `rgba(34,211,238,${0.35 + pulse * 0.3})`;
      roundRect(ctx, 4, -1.4, 18, 2.8, 1.4);
      ctx.fill();
      ctx.restore();
      ctx.restore();
    }
    ctx.restore();
  },
  fire(api, x, y, a) {
    audio.play("disc-windup");
    api.bullets.push(
      makeBullet({
        x,
        y,
        a,
        speed: 0,
        life: 3.4,
        weapon: identityDisc,
        kind: "disc",
        size: 26,
        trailMax: 22,
        data: { wheelHits: 0, lastDamage: 17, launched: 0, launchAngle: a },
        returning: 0.55,
        hitCd: 0,
        discSpin: 0,
        update(b, dt, g) {
          if (!b.data.launched) {
            const muzzle = g.muzzleFor("identityDisc");
            if (muzzle) {
              b.x = muzzle.x;
              b.y = muzzle.y;
              b.data.launchAngle = muzzle.angle;
            }
            b.trail.length = 0;
            if (b.age < FIRE_SPECS.identityDisc.release) return;
            b.data.launched = 1;
            b.vx = Math.cos(b.data.launchAngle) * 1150;
            b.vy = Math.sin(b.data.launchAngle) * 1150;
            audio.play("disc");
            discharge(g, b.x, b.y, b.data.launchAngle, "#75edf7", 32);
            g.shake(2);
          }
          b.returning = (b.returning ?? 0) - dt;
          b.hitCd = Math.max(0, (b.hitCd ?? 0) - dt);
          b.discSpin = (b.discSpin ?? 0) + dt * 26;

          if (b.age >= b.life) {
            b.dead = true;
            g.particles.push(
              P({
                type: "ring",
                x: b.x,
                y: b.y,
                size: 42,
                size2: 3,
                color: "#22d3ee",
                width: 2,
                life: 0.25,
              }),
            );
            return;
          }

          if ((b.returning ?? 0) <= 0) {
            const dx = g.anchorX - b.x;
            const dy = g.anchorY - b.y;
            const distance = Math.hypot(dx, dy);
            if (distance < 40) {
              b.dead = true;
              b.data.caught = 1;
              return;
            }
            const targetAngle = Math.atan2(dy, dx);
            const targetSpeed = 1150 * 0.85;
            const turn = 1 - Math.exp(-dt * 3);
            b.vx = lerp(b.vx, Math.cos(targetAngle) * targetSpeed, turn);
            b.vy = lerp(b.vy, Math.sin(targetAngle) * targetSpeed, turn);
          }

          for (let i = 0, n = emissionCount(dt, 30); i < n; i++)
            g.particles.push(
              P({
                type: "glow",
                x: b.x + rnd(-10, 10),
                y: b.y + rnd(-10, 10),
                size: 14,
                size2: 1,
                color: "#22d3ee",
                color2: "#0e7490",
                life: 0.25,
              }),
            );
        },
        draw(ctx, b, t) {
          if (!b.data.launched) return;
          drawDiscTrail(ctx, b);
          ctx.save();
          ctx.translate(b.x, b.y);
          const flight = Math.atan2(b.vy, b.vx);
          ctx.rotate(flight);
          ctx.scale(1, 0.42);
          ctx.rotate(-flight + (b.discSpin ?? t * 26));
          drawDiscShape(ctx, 28, 0.5 + 0.5 * Math.sin(t * 8));
          ctx.restore();
        },
      }),
    );
  },
  onImpact(api, x, y, a) {
    signatureImpact(identityDisc, api, x, y, a);
  },
  drawMark: drawWeaponMark,
  onReturn: catchDisc,
};

function drawDiscShape(
  ctx: CanvasRenderingContext2D,
  r: number,
  pulse: number,
) {
  // dark body
  const g = ctx.createRadialGradient(0, 0, r * 0.3, 0, 0, r);
  g.addColorStop(0, "rgba(10,14,20,0.2)");
  g.addColorStop(0.72, "#111827");
  g.addColorStop(0.86, "#0b1014");
  g.addColorStop(1, "rgba(10,15,20,0.1)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, TAU);
  ctx.fill();
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  // Soft cyan halo and three hard-surface concentric emissive tracks.
  const halo = ctx.createRadialGradient(0, 0, r * 0.52, 0, 0, r * 1.42);
  halo.addColorStop(0, `rgba(34,211,238,${0.12 + pulse * 0.12})`);
  halo.addColorStop(0.55, `rgba(34,211,238,${0.07 + pulse * 0.08})`);
  halo.addColorStop(1, "rgba(34,211,238,0)");
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(0, 0, r * 1.42, 0, TAU);
  ctx.fill();
  // outer ring
  ctx.strokeStyle = `rgba(34,211,238,${0.75 + pulse * 0.25})`;
  ctx.lineWidth = r * 0.11;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.9, 0, TAU);
  ctx.stroke();
  ctx.strokeStyle = "rgba(224,255,255,0.95)";
  ctx.lineWidth = Math.max(1.2, r * 0.045);
  ctx.stroke();
  ctx.strokeStyle = `rgba(165,243,252,${0.42 + pulse * 0.44})`;
  ctx.lineWidth = Math.max(1, r * 0.035);
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.72, 0, TAU);
  ctx.stroke();
  // inner circuitry
  ctx.strokeStyle = `rgba(103,232,249,${0.5 + pulse * 0.3})`;
  ctx.lineWidth = Math.max(1, r * 0.05);
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.52, 0, TAU);
  ctx.stroke();
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * r * 0.52, Math.sin(a) * r * 0.52);
    ctx.lineTo(Math.cos(a) * r * 0.86, Math.sin(a) * r * 0.86);
    ctx.stroke();
  }
  ctx.fillStyle = `rgba(224,255,255,${0.7 + pulse * 0.25})`;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU;
    ctx.beginPath();
    ctx.arc(
      Math.cos(a) * r * 0.8,
      Math.sin(a) * r * 0.8,
      Math.max(1.2, r * 0.04),
      0,
      TAU,
    );
    ctx.fill();
  }
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.22, 0, TAU);
  ctx.fillStyle = "#06141a";
  ctx.fill();
  ctx.strokeStyle = `rgba(224,255,255,${0.75 + pulse * 0.2})`;
  ctx.lineWidth = Math.max(1.4, r * 0.06);
  ctx.stroke();
  const core = ctx.createRadialGradient(
    -r * 0.08,
    -r * 0.08,
    0.5,
    0,
    0,
    r * 0.2,
  );
  core.addColorStop(0, "#ffffff");
  core.addColorStop(0.42, "#67e8f9");
  core.addColorStop(1, "rgba(34,211,238,0)");
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.2, 0, TAU);
  ctx.fill();
  ctx.restore();
}

/* ------------------------------ PROTON PACK ------------------------------ */
const protonPack: Weapon = {
  id: "protonPack",
  name: "Proton Pack Wand",
  tag: "GHOSTBUSTERS · PARTICLE STREAM",
  accent: "#fde047",
  accent2: "#f87171",
  mode: "beam",
  cooldown: 1.0,
  recoilAmt: 10,
  impactForce: FIRE_SPECS.protonPack.force,
  len: 170,
  muzzle: [168, -8],
  iconScale: 0.52,
  markSize: 34,
  draw: drawProtonPack,
  fire(api, x, y, a) {
    fireStream(protonPack, api, x, y, a, "proton");
  },
  onImpact(api, x, y, a) {
    signatureImpact(protonPack, api, x, y, a);
  },
  drawMark: drawWeaponMark,
};

/* --------------------------------- TRIPOD -------------------------------- */
const tripod: Weapon = {
  id: "tripod",
  name: "Tripod Heat-Ray",
  tag: "WAR OF THE WORLDS · MARTIAN",
  accent: "#c5e899",
  accent2: "#f0dfac",
  mode: "beam",
  cooldown: 1.1,
  recoilAmt: 14,
  impactForce: FIRE_SPECS.tripod.force,
  len: 190,
  muzzle: [111, -39],
  iconScale: 0.46,
  markSize: 40,
  draw: drawMartianTripod,
  fire(api, x, y, a) {
    fireStream(tripod, api, x, y, a, "martian");
  },
  onImpact(api, x, y, a) {
    signatureImpact(tripod, api, x, y, a);
  },
  drawMark: drawWeaponMark,
};

/* ------------------------------ IRON MAN HAND ---------------------------- */
const repulsor: Weapon = {
  id: "repulsor",
  name: "Repulsor Gauntlet",
  tag: "IRON MAN · PALM BLAST",
  accent: "#bae6fd",
  accent2: "#60a5fa",
  mode: "projectile",
  cooldown: 0.55,
  recoilAmt: 12,
  impactForce: FIRE_SPECS.repulsor.force,
  len: 110,
  muzzle: [44, 0],
  iconScale: 0.78,
  markSize: 30,
  draw: drawRepulsorHand,
  fire(api, x, y, a) {
    firePulse(repulsor, api, x, y, a, "repulsor");
  },
  onImpact(api, x, y, a) {
    signatureImpact(repulsor, api, x, y, a);
  },
  drawMark: drawWeaponMark,
};

export const WEAPONS: Weapon[] = [
  bow,
  ak47,
  rifle,
  rifleElectro,
  mp5,
  mp5Electro,
  sniperBeam,
  dragonBreath,
  beretta,
  phaser,
  energySword,
  plasmacaster,
  identityDisc,
  protonPack,
  tripod,
  repulsor,
  predatorShoulder,
];

/** A restrained idle pose gives every weapon a living, hand-held feel. */
export function getWeaponPose(
  weapon: Weapon,
  t: number,
  selected = true,
  shotAge = 100,
  catchAge = 100,
) {
  const phase =
    weapon.id
      .split("")
      .reduce((n, char) => (n * 31 + char.charCodeAt(0)) % 997, 17) / 997;
  const strength = selected ? 1 : 0.45;
  const shot = fireMotion(weapon.id, shotAge, catchAge);
  return {
    x: Math.sin(t * 1.25 + phase * 8) * 1.1 * strength + shot.x,
    y: Math.sin(t * 2.05 + phase * 11) * 1.35 * strength + shot.y,
    rotation: Math.sin(t * 1.1 + phase * 6) * 0.006 * strength + shot.rotation,
  };
}

// Keep the idle pose consistent between the arena and catalog previews.
for (const weapon of WEAPONS) {
  const drawArt = weapon.draw;
  weapon.draw = (ctx, state) => {
    const pose = getWeaponPose(
      weapon,
      state.t,
      state.selected ?? true,
      state.shotAge,
      state.catchAge,
    );
    ctx.save();
    ctx.translate(pose.x, pose.y);
    ctx.rotate(pose.rotation);
    drawArt(ctx, state);
    ctx.restore();
  };
}
