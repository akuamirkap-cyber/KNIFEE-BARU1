import type { WeaponTheme } from './types';
import type { GunRenderParams } from './weapons';

export type SpecialId = 'rainbow' | 'water' | 'snow';

export const SPECIAL_THEMES: Record<SpecialId, WeaponTheme> = {
  rainbow: {
    id: 'rainbow',
    kind: 'rainbow',
    rarity: 'MYTHIC',
    rarityColor: '#f0abfc',
    short: 'RAINBOW',
    name: 'PRISMA RAY GUN',
    subtitle: 'Retro Rainbow Ray Blaster',
    tag: 'SPECTRUM BURST',
    armorPrimary: '#f5efff',
    armorSecondary: '#d9cdf2',
    armorDark: '#6b5a8e',
    armorHighlight: '#ffffff',
    trimMetal: '#f5c542',
    plasmaCore: '#ffffff',
    plasmaMid: '#f472b6',
    plasmaOuter: '#a855f7',
    plasmaGlowRgba: 'rgba(244, 114, 182, ',
    laserSightRgba: 'rgba(255, 255, 255, ',
    muzzleFlashHex: '#fbcfe8',
    spikeBody: '#ede9fe',
    spikeBlade: '#f472b6',
  },
  water: {
    id: 'water',
    kind: 'water',
    rarity: 'LEGENDARY',
    rarityColor: '#38bdf8',
    short: 'WATER',
    name: 'TSUNAMI SOAKER',
    subtitle: 'Legendary Hydro-Pressure Water Gun',
    tag: 'TIDAL SURGE',
    armorPrimary: '#1d4e7a',
    armorSecondary: '#123456',
    armorDark: '#071a2c',
    armorHighlight: '#6cb6e8',
    trimMetal: '#d9a441',
    plasmaCore: '#e0f7ff',
    plasmaMid: '#22d3ee',
    plasmaOuter: '#0369a1',
    plasmaGlowRgba: 'rgba(34, 211, 238, ',
    laserSightRgba: 'rgba(103, 232, 249, ',
    muzzleFlashHex: '#a5f3fc',
    spikeBody: '#0e4a6e',
    spikeBlade: '#67e8f9',
  },
  snow: {
    id: 'snow',
    kind: 'snow',
    rarity: 'LEGENDARY',
    rarityColor: '#bae6fd',
    short: 'SNOW',
    name: 'FROSTBITE BLUNDERBUSS',
    subtitle: 'Glacial Snowball Launcher',
    tag: 'ABSOLUTE ZERO',
    armorPrimary: '#8fb3d1',
    armorSecondary: '#5b7a99',
    armorDark: '#1b2a3a',
    armorHighlight: '#eaf6ff',
    trimMetal: '#cbd5e1',
    plasmaCore: '#ffffff',
    plasmaMid: '#7dd3fc',
    plasmaOuter: '#3b82f6',
    plasmaGlowRgba: 'rgba(125, 211, 252, ',
    laserSightRgba: 'rgba(186, 230, 253, ',
    muzzleFlashHex: '#e0f2fe',
    spikeBody: '#dbeafe',
    spikeBlade: '#7dd3fc',
  },
};

// ============================================================================
// SHARED HELPERS
// ============================================================================
export const SPECTRUM = ['#ff3b5c', '#ff8a1f', '#ffd60a', '#3ddc84', '#22b8ff', '#5b6cff', '#b14cff'];

function pr(n: number): number {
  const s = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
  return s - Math.floor(s);
}

export function hsl(h: number, s = 100, l = 62, a = 1): string {
  return `hsla(${((h % 360) + 360) % 360}, ${s}%, ${l}%, ${a})`;
}

function spectrumConic(ctx: CanvasRenderingContext2D, start: number, x: number, y: number, r: number) {
  const cols = [...SPECTRUM, SPECTRUM[0]];
  if (typeof ctx.createConicGradient === 'function') {
    const g = ctx.createConicGradient(start, x, y);
    cols.forEach((c, i) => g.addColorStop(i / (cols.length - 1), c));
    return g;
  }
  const g = ctx.createLinearGradient(x - r, y - r, x + r, y + r);
  cols.forEach((c, i) => g.addColorStop(i / (cols.length - 1), c));
  return g;
}

/** 4-point twinkle star with soft glow (additive) */
export function drawTwinkle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  color: string,
  alpha = 1,
  rot = 0
) {
  if (alpha <= 0.01 || r <= 0.2) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = Math.min(1, alpha);
  ctx.translate(x, y);
  ctx.rotate(rot);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 1.3);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.3, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, r * 1.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    const rr = i % 2 === 0 ? r : r * 0.2;
    const px = Math.sin(a) * rr;
    const py = -Math.cos(a) * rr;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** Six-arm fractal snowflake */
export function drawSnowflake(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  rot: number,
  color: string,
  alpha = 1,
  lw = 1.2
) {
  if (alpha <= 0.01) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.globalAlpha = Math.min(1, alpha);
  ctx.strokeStyle = color;
  ctx.lineWidth = lw;
  ctx.lineCap = 'round';
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    ctx.rotate(Math.PI / 3);
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -r);
    ctx.moveTo(0, -r * 0.52);
    ctx.lineTo(r * 0.26, -r * 0.74);
    ctx.moveTo(0, -r * 0.52);
    ctx.lineTo(-r * 0.26, -r * 0.74);
    ctx.moveTo(0, -r * 0.26);
    ctx.lineTo(r * 0.16, -r * 0.4);
    ctx.moveTo(0, -r * 0.26);
    ctx.lineTo(-r * 0.16, -r * 0.4);
  }
  ctx.stroke();
  ctx.restore();
}

function drawCloud(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, time: number) {
  const puffs: [number, number, number][] = [
    [-15, 4, 10],
    [-4, -5, 13],
    [10, -3, 11],
    [19, 5, 8],
    [3, 7, 11],
    [-12, 9, 8],
  ];
  ctx.save();
  ctx.translate(x, y + Math.sin(time * 1.6 + x) * 1.5);
  ctx.scale(s, s);
  ctx.fillStyle = '#b8a6ef';
  for (const [px, py, r] of puffs) {
    ctx.beginPath();
    ctx.arc(px + 1.5, py + 3.5, r, 0, Math.PI * 2);
    ctx.fill();
  }
  const g = ctx.createLinearGradient(0, -18, 0, 20);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(1, '#e9e3fb');
  ctx.fillStyle = g;
  for (const [px, py, r] of puffs) {
    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalCompositeOperation = 'lighter';
  const gl = ctx.createRadialGradient(0, 0, 4, 0, 0, 34);
  gl.addColorStop(0, 'rgba(255, 220, 250, 0.25)');
  gl.addColorStop(1, 'rgba(255, 220, 250, 0)');
  ctx.fillStyle = gl;
  ctx.beginPath();
  ctx.arc(0, 0, 34, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function goldGrad(ctx: CanvasRenderingContext2D, x1: number, x2: number) {
  const g = ctx.createLinearGradient(x1, 0, x2, 0);
  g.addColorStop(0, '#7a5310');
  g.addColorStop(0.35, '#fff1b8');
  g.addColorStop(0.55, '#f5c542');
  g.addColorStop(1, '#6b470c');
  return g;
}

function brassGrad(ctx: CanvasRenderingContext2D, x1: number, x2: number) {
  const g = ctx.createLinearGradient(x1, 0, x2, 0);
  g.addColorStop(0, '#5c3d0e');
  g.addColorStop(0.35, '#ffe2a0');
  g.addColorStop(0.6, '#d9a441');
  g.addColorStop(1, '#4a300a');
  return g;
}

function star5(ctx: CanvasRenderingContext2D, ro: number, ri: number, points = 5) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const a = (i * Math.PI) / points;
    const r = i % 2 === 0 ? ro : ri;
    const px = Math.sin(a) * r;
    const py = -Math.cos(a) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

function drawGripStrut(ctx: CanvasRenderingContext2D, fill: string | CanvasGradient, stroke: string) {
  ctx.fillStyle = fill;
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(15, 48);
  ctx.lineTo(36, 56);
  ctx.lineTo(44, 82);
  ctx.lineTo(22, 82);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

function gauntletPath(ctx: CanvasRenderingContext2D) {
  ctx.beginPath();
  ctx.moveTo(18, 58);
  ctx.lineTo(43, 62);
  ctx.quadraticCurveTo(52, 70, 49, 80);
  ctx.lineTo(46, 88);
  ctx.lineTo(19, 86);
  ctx.closePath();
}

// ============================================================================
// 🌈 PRISMA AURORA — RAINBOW GUN
// ============================================================================
function drawRainbowGun(ctx: CanvasRenderingContext2D, p: GunRenderParams) {
  const { x, y, scale, time, recoil, muzzleFlash, ammoLeft, ammoTotal, overdrivePrimed: od } = p;
  const charge = p.charge ?? 1;
  const H = time * 90;
  const energy = Math.min(1.5, 0.5 + charge * 0.5 + recoil * 0.7 + (od ? 0.5 : 0));
  const slide = recoil * 14;
  const flick = Math.floor(time * 26);

  ctx.save();
  ctx.translate(x, y + recoil * 15 * scale);
  ctx.scale(scale, scale);

  // 1. AURORA AURA + SPECTRUM GOD RAYS
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let k = 0; k < 3; k++) {
    const ax = Math.cos(time * 0.8 + k * 2.1) * 22;
    const ay = -30 + Math.sin(time * 1.1 + k) * 12;
    const r = od ? 160 : 125;
    const g = ctx.createRadialGradient(ax, ay, 0, ax, ay, r);
    g.addColorStop(0, hsl(H + k * 120, 100, 60, 0.2 * energy));
    g.addColorStop(1, hsl(H + k * 120, 100, 60, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(ax, ay, r, 0, Math.PI * 2);
    ctx.fill();
  }
  for (let r = 0; r < 14; r++) {
    const a = (r / 14) * Math.PI * 2 + time * 0.3;
    const len = 180 + Math.sin(time * 2 + r) * 25;
    const g = ctx.createRadialGradient(0, 0, 10, 0, 0, len);
    g.addColorStop(0, hsl(r * 26 + H, 100, 65, 0.15 * energy));
    g.addColorStop(1, hsl(r * 26 + H, 100, 65, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, len, a - 0.06, a + 0.06);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  // 2. SERAPH WINGS (rainbow-tipped feathers, flare on recoil)
  for (const side of [-1, 1]) {
    ctx.save();
    ctx.scale(side, 1);
    ctx.translate(22, -22);
    const flap = Math.sin(time * 2.6) * 0.06 + recoil * 0.24 + (od ? 0.08 : 0);
    for (let f = 4; f >= 0; f--) {
      const L = 108 - f * 11;
      const th = 0.28 + f * 0.26 + flap * (1 + f * 0.2);
      ctx.save();
      ctx.rotate(th);
      const fg = ctx.createLinearGradient(0, 0, 0, -L);
      fg.addColorStop(0, '#ffffff');
      fg.addColorStop(0.5, '#f7f2ff');
      fg.addColorStop(1, hsl(H + f * 50, 95, 72));
      ctx.fillStyle = fg;
      ctx.strokeStyle = 'rgba(110, 85, 165, 0.6)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-3, 0);
      ctx.quadraticCurveTo(12, -L * 0.45, 0, -L);
      ctx.quadraticCurveTo(-7, -L * 0.5, -3, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      // Barbs
      ctx.strokeStyle = 'rgba(150, 120, 200, 0.35)';
      ctx.lineWidth = 0.7;
      for (let b = 1; b < 6; b++) {
        const by = -L * (b / 6.5);
        ctx.beginPath();
        ctx.moveTo(1, by);
        ctx.lineTo(7, by - 6);
        ctx.stroke();
      }
      // Gold quill
      ctx.strokeStyle = 'rgba(245, 197, 66, 0.9)';
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.moveTo(-1.5, 0);
      ctx.quadraticCurveTo(3, -L * 0.5, 0, -L + 3);
      ctx.stroke();
      // Glowing rim
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = hsl(H + f * 50, 100, 65, 0.75);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-3, 0);
      ctx.quadraticCurveTo(12, -L * 0.45, 0, -L);
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }

  // 3. REAL RAINBOW ARCH rising from cloud to cloud
  const archR = 78 + recoil * 7 + Math.sin(time * 2) * 1.5;
  const bandW = 4.5;
  ctx.save();
  for (let i = 0; i < 7; i++) {
    ctx.strokeStyle = SPECTRUM[i];
    ctx.lineWidth = bandW + 0.7;
    ctx.globalAlpha = 0.93;
    ctx.beginPath();
    ctx.arc(0, 20, archR - i * bandW, Math.PI, Math.PI * 2);
    ctx.stroke();
  }
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 7; i++) {
    ctx.strokeStyle = SPECTRUM[i];
    ctx.lineWidth = bandW * 2.6;
    ctx.globalAlpha = 0.17 * energy;
    ctx.beginPath();
    ctx.arc(0, 20, archR - i * bandW, Math.PI, Math.PI * 2);
    ctx.stroke();
  }
  const sw = Math.PI + ((time * 0.5) % 1) * Math.PI;
  ctx.strokeStyle = '#ffffff';
  ctx.globalAlpha = 0.5;
  ctx.lineWidth = bandW * 7.5;
  ctx.beginPath();
  ctx.arc(0, 20, archR - 3 * bandW, sw - 0.07, sw + 0.07);
  ctx.stroke();
  ctx.restore();

  // 4. CLOUDS at the rainbow's feet
  for (const side of [-1, 1]) {
    drawCloud(ctx, side * (archR - 14), 24, 1.05 + recoil * 0.18, time + side);
  }

  // 5. PEARL GRIPS + WHITE SILK GAUNTLETS with gold cuffs
  for (const side of [-1, 1]) {
    ctx.save();
    ctx.scale(side, 1);
    const sg = ctx.createLinearGradient(15, 48, 44, 82);
    sg.addColorStop(0, '#ffffff');
    sg.addColorStop(1, '#cfc2ee');
    drawGripStrut(ctx, sg, '#8b7bb0');
    const gg = ctx.createLinearGradient(18, 56, 48, 88);
    gg.addColorStop(0, '#ffffff');
    gg.addColorStop(0.6, '#efeaf9');
    gg.addColorStop(1, '#c9bce6');
    ctx.fillStyle = gg;
    ctx.strokeStyle = '#7d6ca6';
    ctx.lineWidth = 1.5;
    gauntletPath(ctx);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = goldGrad(ctx, 19, 47);
    ctx.fillRect(19, 82, 28, 5);
    for (let k = 0; k < 3; k++) {
      ctx.fillStyle = SPECTRUM[(k * 2 + (side > 0 ? 0 : 1)) % 7];
      ctx.beginPath();
      ctx.arc(26 + k * 7, 67 + k * 1.4, 2.2, 0, Math.PI * 2);
      ctx.fill();
      drawTwinkle(ctx, 26 + k * 7, 67 + k * 1.4, 3.5, SPECTRUM[k * 2], 0.4 + 0.4 * Math.sin(time * 4 + k));
    }
    ctx.restore();
  }

  // 6. CRYSTAL PRISM BARREL with flowing spectrum light
  ctx.save();
  ctx.translate(0, slide);
  const colPath = () => {
    ctx.beginPath();
    ctx.moveTo(-11, -104);
    ctx.lineTo(11, -104);
    ctx.lineTo(17, -96);
    ctx.lineTo(19, -30);
    ctx.lineTo(-19, -30);
    ctx.lineTo(-17, -96);
    ctx.closePath();
  };
  const cg = ctx.createLinearGradient(-19, 0, 19, 0);
  cg.addColorStop(0, 'rgba(190, 170, 250, 0.9)');
  cg.addColorStop(0.3, 'rgba(255, 255, 255, 0.97)');
  cg.addColorStop(0.55, 'rgba(232, 222, 255, 0.85)');
  cg.addColorStop(1, 'rgba(150, 130, 215, 0.92)');
  ctx.fillStyle = cg;
  ctx.strokeStyle = '#7c6aa8';
  ctx.lineWidth = 1.4;
  colPath();
  ctx.fill();
  ctx.stroke();

  ctx.save();
  colPath();
  ctx.clip();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 7; i++) {
    const bx = -10.5 + i * 3;
    const off = (time * 1.2 + i * 0.08) % 1;
    const g = ctx.createLinearGradient(0, -30, 0, -104);
    g.addColorStop(0, SPECTRUM[i]);
    g.addColorStop(off, '#ffffff');
    g.addColorStop(Math.min(1, off + 0.12), SPECTRUM[i]);
    g.addColorStop(1, SPECTRUM[i]);
    ctx.globalAlpha = 0.5 + 0.35 * Math.min(1, energy);
    ctx.fillStyle = g;
    ctx.fillRect(bx, -104, 3, 74);
  }
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 0.7;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-12, -100);
  ctx.lineTo(-14, -30);
  ctx.moveTo(12, -100);
  ctx.lineTo(14, -30);
  ctx.moveTo(-17, -96);
  ctx.lineTo(0, -80);
  ctx.lineTo(17, -96);
  ctx.stroke();
  ctx.restore();

  for (const ry of [-99, -70, -42]) {
    const w = ry < -90 ? 17 : ry < -60 ? 18.5 : 19.5;
    ctx.fillStyle = goldGrad(ctx, -w, w);
    ctx.fillRect(-w, ry, w * 2, 4);
    ctx.fillStyle = hsl(H + ry * 3, 100, 65);
    ctx.beginPath();
    ctx.arc(0, ry + 2, 2.2, 0, Math.PI * 2);
    ctx.fill();
  }

  // Rotating crystal star crown
  ctx.save();
  ctx.translate(0, -112);
  ctx.rotate(time * 0.8);
  ctx.fillStyle = spectrumConic(ctx, time * 2, 0, 0, 16);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1.3;
  star5(ctx, 16, 6.5, 6);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(0, 0, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  drawTwinkle(ctx, 0, -112, 14 + Math.sin(time * 6) * 3, hsl(H), 0.8);
  ctx.restore();

  // 7. PEARL RECEIVER with iridescent shimmer & gold filigree
  const bodyPath = () => {
    ctx.beginPath();
    ctx.roundRect(-32, -34, 64, 100, 20);
  };
  const bg = ctx.createLinearGradient(-32, 0, 32, 0);
  bg.addColorStop(0, '#bcaee0');
  bg.addColorStop(0.3, '#ffffff');
  bg.addColorStop(0.6, '#f3ecff');
  bg.addColorStop(1, '#a998d6');
  ctx.fillStyle = bg;
  ctx.strokeStyle = '#6f5e9c';
  ctx.lineWidth = 2;
  bodyPath();
  ctx.fill();
  ctx.stroke();
  ctx.save();
  bodyPath();
  ctx.clip();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.2;
  ctx.fillStyle = spectrumConic(ctx, time * 0.6, 0, 10, 60);
  ctx.fillRect(-34, -36, 68, 104);
  ctx.restore();

  ctx.strokeStyle = goldGrad(ctx, -28, 28);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(-27, -29, 54, 90, 15);
  ctx.stroke();
  // Filigree curls
  ctx.lineWidth = 1.2;
  for (const sx of [-1, 1]) {
    for (const sy of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(sx * 22, 16 + sy * 38);
      ctx.quadraticCurveTo(sx * 14, 16 + sy * 40, sx * 15, 16 + sy * 32);
      ctx.quadraticCurveTo(sx * 17, 16 + sy * 28, sx * 20, 16 + sy * 31);
      ctx.stroke();
    }
  }

  // 8. PRISM HEART — white light splits into the spectrum
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 3;
  ctx.globalAlpha = 0.85;
  ctx.beginPath();
  ctx.moveTo(0, 64);
  ctx.lineTo(0, 26);
  ctx.stroke();
  for (let i = 0; i < 7; i++) {
    ctx.strokeStyle = SPECTRUM[i];
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.6 + 0.4 * Math.min(1, energy);
    ctx.beginPath();
    ctx.moveTo(0, -20);
    ctx.lineTo(-12 + i * 4, -36);
    ctx.stroke();
  }
  ctx.restore();

  const gemV: [number, number][] = [
    [0, -22],
    [18, -8],
    [14, 14],
    [0, 26],
    [-14, 14],
    [-18, -8],
  ];
  ctx.save();
  ctx.translate(0, 2);
  const gemPulse = 1 + recoil * 0.12 + Math.sin(time * 5) * 0.03;
  ctx.scale(gemPulse, gemPulse);
  ctx.translate(0, -2);
  ctx.beginPath();
  gemV.forEach(([gx, gy], i) => (i === 0 ? ctx.moveTo(gx, gy) : ctx.lineTo(gx, gy)));
  ctx.closePath();
  ctx.fillStyle = spectrumConic(ctx, time * 1.3, 0, 2, 24);
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1.6;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (const [gx, gy] of gemV) {
    ctx.moveTo(0, 2);
    ctx.lineTo(gx, gy);
  }
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.beginPath();
  ctx.moveTo(0, -14);
  ctx.lineTo(9, -6);
  ctx.lineTo(0, 0);
  ctx.lineTo(-9, -6);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const gemGlow = ctx.createRadialGradient(0, 2, 0, 0, 2, 40);
  gemGlow.addColorStop(0, `rgba(255,255,255,${0.35 * energy})`);
  gemGlow.addColorStop(0.4, hsl(H, 100, 65, 0.25 * energy));
  gemGlow.addColorStop(1, hsl(H, 100, 65, 0));
  ctx.fillStyle = gemGlow;
  ctx.beginPath();
  ctx.arc(0, 2, 40, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  drawTwinkle(ctx, 8, -10, 6 + Math.sin(time * 7) * 2, '#ffffff', 0.9, time);

  // 9. AMMO: row of tiny spectrum gems
  const n = Math.min(12, Math.max(1, ammoTotal));
  const lit = Math.round((ammoLeft / Math.max(1, ammoTotal)) * n);
  const spacing = Math.min(7, 46 / n);
  for (let i = 0; i < n; i++) {
    const gx = -((n - 1) * spacing) / 2 + i * spacing;
    const on = i < lit;
    ctx.save();
    ctx.translate(gx, 47);
    ctx.fillStyle = on ? SPECTRUM[i % 7] : 'rgba(120,100,160,0.35)';
    ctx.beginPath();
    ctx.moveTo(0, -3.5);
    ctx.lineTo(2.6, 0);
    ctx.lineTo(0, 3.5);
    ctx.lineTo(-2.6, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    if (on) drawTwinkle(ctx, gx, 47, 3.2, SPECTRUM[i % 7], 0.35 + 0.3 * Math.sin(time * 6 + i));
  }

  // 10. ORBITING STARS + RISING SPARKLE DUST
  for (let k = 0; k < 6; k++) {
    const a = time * 1.6 + (k / 6) * Math.PI * 2;
    const sx = Math.cos(a) * (44 + recoil * 14);
    const sy = -62 + Math.sin(a) * 11 - recoil * 18;
    drawTwinkle(ctx, sx, sy, 4.5 + Math.sin(time * 5 + k) * 1.8, hsl(H + k * 60), 0.9, time * 2 + k);
  }
  for (let i = 0; i < 16; i++) {
    const t = (time * 0.35 + pr(i)) % 1;
    const px = (pr(i * 3.1) - 0.5) * 140 + Math.sin(time * 2 + i) * 5;
    const py = 50 - t * 180;
    drawTwinkle(ctx, px, py, 2 + pr(i * 5) * 2.5, hsl(H + i * 40), Math.sin(t * Math.PI) * 0.85, t * 6);
  }

  // 11. OVERDRIVE: rotating spectrum halo crown
  if (od) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.translate(0, -112 + slide);
    for (let i = 0; i < 7; i++) {
      ctx.save();
      ctx.rotate(time * (1.2 + i * 0.25) * (i % 2 ? -1 : 1));
      ctx.strokeStyle = SPECTRUM[i];
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(0, 0, 22 + i * 3.2, 0, Math.PI * 0.7);
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }

  // 12. MUZZLE FLASH — Spectrum supernova
  if (muzzleFlash > 0.01) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.translate(0, -116 + slide);
    const mf = Math.min(1, muzzleFlash * 1.3);
    const fs = 0.75 + muzzleFlash * 0.8 + (od ? 0.3 : 0);
    ctx.globalAlpha = mf;
    ctx.scale(fs, fs);
    const bloom = ctx.createRadialGradient(0, -18, 0, 0, -18, 100);
    bloom.addColorStop(0, '#ffffff');
    bloom.addColorStop(0.25, hsl(H, 100, 75));
    bloom.addColorStop(0.6, hsl(H + 120, 100, 60, 0.4));
    bloom.addColorStop(1, hsl(H + 240, 100, 60, 0));
    ctx.fillStyle = bloom;
    ctx.beginPath();
    ctx.arc(0, -18, 100, 0, Math.PI * 2);
    ctx.fill();

    for (let i = 0; i < 7; i++) {
      const r = 14 + (1 - muzzleFlash) * 75 + i * 5;
      ctx.strokeStyle = SPECTRUM[i];
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(0, -10, r, r * 0.38, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.save();
    ctx.translate(0, -16);
    ctx.rotate(time * 3);
    for (let r = 0; r < 14; r++) {
      ctx.rotate((Math.PI * 2) / 14);
      ctx.fillStyle = SPECTRUM[r % 7];
      const len = (r % 2 === 0 ? 95 : 55) * (0.8 + pr(flick + r) * 0.4);
      ctx.beginPath();
      ctx.moveTo(-4, 0);
      ctx.lineTo(0, -len);
      ctx.lineTo(4, 0);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    const lance = ctx.createLinearGradient(0, -150, 0, 6);
    lance.addColorStop(0, 'rgba(0,0,0,0)');
    lance.addColorStop(0.4, hsl(H, 100, 70));
    lance.addColorStop(1, '#ffffff');
    ctx.fillStyle = lance;
    ctx.beginPath();
    ctx.moveTo(0, -150);
    ctx.quadraticCurveTo(18, -50, 9, 6);
    ctx.lineTo(-9, 6);
    ctx.quadraticCurveTo(-18, -50, 0, -150);
    ctx.fill();
    ctx.restore();
    for (let i = 0; i < 6; i++) {
      drawTwinkle(
        ctx,
        (pr(flick + i * 3) - 0.5) * 110,
        -150 + slide - pr(flick * 2 + i) * 70,
        6 + pr(i + flick) * 6,
        SPECTRUM[i],
        mf
      );
    }
  }

  ctx.restore();
}

// ============================================================================
// 🌊 TSUNAMI LEVIATHAN — WATER GUN
// ============================================================================
function drawWaterGun(ctx: CanvasRenderingContext2D, p: GunRenderParams) {
  const { x, y, scale, time, recoil, muzzleFlash, ammoLeft, ammoTotal, overdrivePrimed: od } = p;
  const charge = p.charge ?? 1;
  const slide = recoil * 12;
  const level = ammoTotal > 0 ? Math.max(0.04, ammoLeft / ammoTotal) : 1;
  const energy = Math.min(1.5, 0.5 + charge * 0.5 + recoil * 0.7 + (od ? 0.5 : 0));
  const flick = Math.floor(time * 26);

  ctx.save();
  ctx.translate(x, y + recoil * 15 * scale);
  ctx.scale(scale, scale);

  // 1. ABYSSAL AURA + UNDERWATER CAUSTICS
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const aura = ctx.createRadialGradient(0, -25, 8, 0, -25, od ? 160 : 125);
  aura.addColorStop(0, `rgba(34, 211, 238, ${0.28 * energy})`);
  aura.addColorStop(0.5, `rgba(14, 165, 233, ${0.08 * energy})`);
  aura.addColorStop(1, 'rgba(14, 165, 233, 0)');
  ctx.fillStyle = aura;
  ctx.beginPath();
  ctx.arc(0, -25, od ? 160 : 125, 0, Math.PI * 2);
  ctx.fill();
  for (let k = 0; k < 6; k++) {
    ctx.beginPath();
    for (let xx = -120; xx <= 120; xx += 8) {
      const yy = -130 + k * 34 + Math.sin(xx * 0.05 + time * 1.8 + k * 1.3) * 7 + Math.sin(xx * 0.11 - time * 2.4) * 3;
      if (xx === -120) ctx.moveTo(xx, yy);
      else ctx.lineTo(xx, yy);
    }
    const cgA = ctx.createLinearGradient(-120, 0, 120, 0);
    cgA.addColorStop(0, 'rgba(103, 232, 249, 0)');
    cgA.addColorStop(0.5, `rgba(103, 232, 249, ${0.08 * energy})`);
    cgA.addColorStop(1, 'rgba(103, 232, 249, 0)');
    ctx.strokeStyle = cgA;
    ctx.lineWidth = 7;
    ctx.stroke();
    const cgB = ctx.createLinearGradient(-120, 0, 120, 0);
    cgB.addColorStop(0, 'rgba(224, 247, 255, 0)');
    cgB.addColorStop(0.5, `rgba(224, 247, 255, ${0.16 * energy})`);
    cgB.addColorStop(1, 'rgba(224, 247, 255, 0)');
    ctx.strokeStyle = cgB;
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }
  ctx.restore();

  // 2. DEEP-SEA DIVER GLOVES
  for (const side of [-1, 1]) {
    ctx.save();
    ctx.scale(side, 1);
    drawGripStrut(ctx, '#0b2235', '#6cb6e8');
    const gg = ctx.createLinearGradient(18, 56, 48, 88);
    gg.addColorStop(0, '#2b5d7f');
    gg.addColorStop(0.6, '#163a55');
    gg.addColorStop(1, '#0a1f30');
    ctx.fillStyle = gg;
    ctx.strokeStyle = '#04101a';
    ctx.lineWidth = 1.8;
    gauntletPath(ctx);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = brassGrad(ctx, 19, 47);
    ctx.fillRect(19, 81, 28, 5);
    for (let k = 0; k < 4; k++) {
      ctx.fillStyle = '#ffe2a0';
      ctx.beginPath();
      ctx.arc(22 + k * 7, 83.5, 1.1, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = 'rgba(165, 243, 252, 0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(22, 64);
    ctx.quadraticCurveTo(34, 62, 44, 70);
    ctx.stroke();
    ctx.restore();
  }

  // 3. SIDE GLASS PRESSURE TANKS (water level = ammo!) + SHARK FINS + COIL TUBES
  for (const side of [-1, 1]) {
    ctx.save();
    ctx.scale(side, 1);
    ctx.translate(recoil * 3, recoil * 6);

    // Shark dorsal fin
    const fg = ctx.createLinearGradient(56, -50, 76, 10);
    fg.addColorStop(0, '#6cb6e8');
    fg.addColorStop(0.4, '#1d4e7a');
    fg.addColorStop(1, '#071a2c');
    ctx.fillStyle = fg;
    ctx.strokeStyle = '#04101a';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(56, 14);
    ctx.quadraticCurveTo(60, -22, 80, -52);
    ctx.quadraticCurveTo(70, -14, 74, 6);
    ctx.quadraticCurveTo(66, 12, 56, 14);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = 'rgba(165, 243, 252, 0.7)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(59, 8);
    ctx.quadraticCurveTo(62, -20, 78, -48);
    ctx.stroke();

    // Coiled glass tube from tank top to barrel
    const tubePath = () => {
      ctx.beginPath();
      ctx.moveTo(46, -54);
      ctx.bezierCurveTo(48, -80, 30, -78, 15, -84 + slide * 0.5);
    };
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#04101a';
    ctx.lineWidth = 8;
    tubePath();
    ctx.stroke();
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = '#0ea5e9';
    ctx.lineWidth = 5;
    tubePath();
    ctx.stroke();
    ctx.strokeStyle = '#e0f7ff';
    ctx.lineWidth = 2.4;
    ctx.setLineDash([3, 9]);
    ctx.lineDashOffset = -time * 55;
    tubePath();
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    // Tank glass
    const tx = 35;
    const tw = 22;
    const tTop = -52;
    const tBot = 30;
    ctx.fillStyle = 'rgba(4, 18, 31, 0.92)';
    ctx.beginPath();
    ctx.roundRect(tx, tTop, tw, tBot - tTop, 10);
    ctx.fill();

    ctx.save();
    ctx.beginPath();
    ctx.roundRect(tx, tTop, tw, tBot - tTop, 10);
    ctx.clip();
    const waterY = tBot - level * (tBot - tTop - 6);
    const slosh = recoil * 4 * side;
    ctx.beginPath();
    ctx.moveTo(tx, tBot + 2);
    for (let xx = tx; xx <= tx + tw; xx += 2) {
      const wy = waterY + Math.sin(xx * 0.45 + time * 5 * side) * 1.6 + ((xx - tx) / tw - 0.5) * slosh;
      ctx.lineTo(xx, wy);
    }
    ctx.lineTo(tx + tw, tBot + 2);
    ctx.closePath();
    const wg = ctx.createLinearGradient(0, waterY, 0, tBot);
    wg.addColorStop(0, '#a5f3fc');
    wg.addColorStop(0.15, '#22d3ee');
    wg.addColorStop(1, '#0c4a6e');
    ctx.fillStyle = wg;
    ctx.fill();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = 'rgba(224,247,255,0.9)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (let xx = tx; xx <= tx + tw; xx += 2) {
      const wy = waterY + Math.sin(xx * 0.45 + time * 5 * side) * 1.6 + ((xx - tx) / tw - 0.5) * slosh;
      if (xx === tx) ctx.moveTo(xx, wy);
      else ctx.lineTo(xx, wy);
    }
    ctx.stroke();
    for (let i = 0; i < 7; i++) {
      const t = (time * (0.5 + pr(i) * 0.4) + pr(i + side * 10)) % 1;
      const by = tBot - 2 - t * (tBot - waterY);
      const bx = tx + 4 + pr(i * 2.3) * (tw - 8) + Math.sin(time * 3 + i) * 1.5;
      ctx.strokeStyle = 'rgba(224,247,255,0.8)';
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.arc(bx, by, 1 + pr(i * 7) * 1.6, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();

    // Glass shine + level ticks
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    ctx.beginPath();
    ctx.roundRect(tx + 3, tTop + 6, 4, tBot - tTop - 12, 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(165,243,252,0.45)';
    ctx.lineWidth = 0.8;
    for (let k = 1; k < 6; k++) {
      const ly = tTop + k * ((tBot - tTop) / 6);
      ctx.beginPath();
      ctx.moveTo(tx + tw - 6, ly);
      ctx.lineTo(tx + tw - 2, ly);
      ctx.stroke();
    }
    ctx.strokeStyle = '#6cb6e8';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.roundRect(tx, tTop, tw, tBot - tTop, 10);
    ctx.stroke();

    // Brass end caps
    ctx.fillStyle = brassGrad(ctx, 33, 59);
    ctx.strokeStyle = '#3d2706';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(33, tTop - 4, 26, 7, 3);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.roundRect(33, tBot - 3, 26, 7, 3);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  // 4. BARREL + PUMP + POSEIDON TRIDENT HEAD
  ctx.save();
  ctx.translate(0, slide);
  const barrelPath = () => {
    ctx.beginPath();
    ctx.moveTo(-13, -96);
    ctx.lineTo(13, -96);
    ctx.lineTo(16, -30);
    ctx.lineTo(-16, -30);
    ctx.closePath();
  };
  const bgr = ctx.createLinearGradient(-16, 0, 16, 0);
  bgr.addColorStop(0, '#071a2c');
  bgr.addColorStop(0.3, '#2c6b9c');
  bgr.addColorStop(0.45, '#8fd0f5');
  bgr.addColorStop(0.65, '#1d4e7a');
  bgr.addColorStop(1, '#071a2c');
  ctx.fillStyle = bgr;
  ctx.strokeStyle = '#030c15';
  ctx.lineWidth = 1.6;
  barrelPath();
  ctx.fill();
  ctx.stroke();

  // Water window running up the barrel
  ctx.fillStyle = '#03101b';
  ctx.beginPath();
  ctx.roundRect(-5, -92, 10, 58, 5);
  ctx.fill();
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(-5, -92, 10, 58, 5);
  ctx.clip();
  const ww = ctx.createLinearGradient(0, -92, 0, -34);
  ww.addColorStop(0, '#a5f3fc');
  ww.addColorStop(1, '#0369a1');
  ctx.fillStyle = ww;
  ctx.globalAlpha = 0.6 + 0.4 * Math.min(1, energy);
  ctx.fillRect(-5, -92, 10, 58);
  ctx.globalCompositeOperation = 'lighter';
  for (let k = 0; k < 6; k++) {
    const yy = -34 - ((time * (od ? 150 : 90) + k * 11) % 60);
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.beginPath();
    ctx.ellipse(Math.sin(yy * 0.3 + time * 4) * 1.5, yy, 1.4, 3, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  for (const by of [-94, -66, -36]) {
    ctx.fillStyle = brassGrad(ctx, -17, 17);
    ctx.fillRect(-16, by, 32, 4);
  }

  // Super-soaker pump forend (slides extra on recoil)
  ctx.save();
  ctx.translate(0, recoil * 9);
  const pg = ctx.createLinearGradient(-21, 0, 21, 0);
  pg.addColorStop(0, '#04121e');
  pg.addColorStop(0.35, '#1f5f8e');
  pg.addColorStop(0.5, '#4ea3d6');
  pg.addColorStop(1, '#04121e');
  ctx.fillStyle = pg;
  ctx.strokeStyle = '#020a12';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.roundRect(-21, -62, 42, 20, 6);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = 'rgba(0,0,0,0.6)';
  ctx.lineWidth = 1.6;
  for (let r = 0; r < 4; r++) {
    ctx.beginPath();
    ctx.moveTo(-18, -58 + r * 4.5);
    ctx.lineTo(18, -58 + r * 4.5);
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(165,243,252,0.35)';
  ctx.lineWidth = 0.8;
  for (let r = 0; r < 4; r++) {
    ctx.beginPath();
    ctx.moveTo(-18, -57 + r * 4.5);
    ctx.lineTo(18, -57 + r * 4.5);
    ctx.stroke();
  }
  ctx.restore();

  // Trident: side prongs
  for (const side of [-1, 1]) {
    ctx.save();
    ctx.scale(side, 1);
    ctx.fillStyle = brassGrad(ctx, 8, 28);
    ctx.strokeStyle = '#3d2706';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(7, -92);
    ctx.quadraticCurveTo(24, -96, 24, -112);
    ctx.lineTo(27, -130);
    ctx.lineTo(20, -116);
    ctx.lineTo(15, -118);
    ctx.lineTo(18, -108);
    ctx.quadraticCurveTo(16, -100, 7, -99);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const tg = ctx.createRadialGradient(27, -128, 0, 27, -128, 12);
    tg.addColorStop(0, '#ffffff');
    tg.addColorStop(0.35, '#22d3ee');
    tg.addColorStop(1, 'rgba(34,211,238,0)');
    ctx.fillStyle = tg;
    ctx.globalAlpha = 0.6 + 0.4 * Math.sin(time * 5 + side);
    ctx.beginPath();
    ctx.arc(27, -128, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.restore();
  }
  // Center nozzle
  ctx.fillStyle = brassGrad(ctx, -9, 9);
  ctx.strokeStyle = '#3d2706';
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.moveTo(-6, -96);
  ctx.lineTo(-6, -114);
  ctx.lineTo(-10, -121);
  ctx.lineTo(10, -121);
  ctx.lineTo(6, -114);
  ctx.lineTo(6, -96);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#03101b';
  ctx.beginPath();
  ctx.ellipse(0, -121, 8, 2.4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = `rgba(103, 232, 249, ${0.6 + 0.4 * Math.min(1, energy)})`;
  ctx.beginPath();
  ctx.ellipse(0, -121, 6, 1.6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.restore();

  // 5. RECEIVER HULL with brass rivets
  const recPath = () => {
    ctx.beginPath();
    ctx.moveTo(-22, -34);
    ctx.lineTo(22, -34);
    ctx.lineTo(32, -16);
    ctx.lineTo(32, 50);
    ctx.lineTo(20, 68);
    ctx.lineTo(-20, 68);
    ctx.lineTo(-32, 50);
    ctx.lineTo(-32, -16);
    ctx.closePath();
  };
  const rg = ctx.createLinearGradient(-32, 0, 32, 0);
  rg.addColorStop(0, '#061523');
  rg.addColorStop(0.25, '#163f63');
  rg.addColorStop(0.5, '#2a6a9a');
  rg.addColorStop(0.75, '#163f63');
  rg.addColorStop(1, '#061523');
  ctx.fillStyle = rg;
  ctx.strokeStyle = '#020a12';
  ctx.lineWidth = 2;
  recPath();
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = 'rgba(108,182,232,0.7)';
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.moveTo(-29, 46);
  ctx.lineTo(-29, -15);
  ctx.lineTo(-20, -31);
  ctx.lineTo(20, -31);
  ctx.lineTo(29, -15);
  ctx.lineTo(29, 46);
  ctx.stroke();
  for (const [rx, ry] of [
    [-26, -14],
    [26, -14],
    [-27, 10],
    [27, 10],
    [-27, 34],
    [27, 34],
    [-16, 62],
    [16, 62],
  ]) {
    ctx.fillStyle = '#ffe2a0';
    ctx.beginPath();
    ctx.arc(rx, ry, 1.7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#7a5310';
    ctx.beginPath();
    ctx.arc(rx + 0.5, ry + 0.5, 0.8, 0, Math.PI * 2);
    ctx.fill();
  }

  // 6. PORTHOLE: whirlpool vortex + golden koi
  const pcy = 4;
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, pcy, 19, 0, Math.PI * 2);
  ctx.clip();
  const deep = ctx.createRadialGradient(0, pcy, 0, 0, pcy, 20);
  deep.addColorStop(0, '#7dd3fc');
  deep.addColorStop(0.35, '#0284c7');
  deep.addColorStop(1, '#03111e');
  ctx.fillStyle = deep;
  ctx.fillRect(-20, pcy - 20, 40, 40);
  ctx.globalCompositeOperation = 'lighter';
  for (let k = 0; k < 4; k++) {
    ctx.save();
    ctx.translate(0, pcy);
    ctx.rotate(time * (2 + recoil * 8 + (od ? 3 : 0)) + (k * Math.PI) / 2);
    ctx.beginPath();
    for (let t = 0; t <= 1; t += 0.05) {
      const r = 2 + t * 17;
      const a = t * 4.2;
      const px = Math.cos(a) * r;
      const py = Math.sin(a) * r;
      if (t === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.strokeStyle = 'rgba(165, 243, 252, 0.45)';
    ctx.lineWidth = 1.3;
    ctx.stroke();
    ctx.restore();
  }
  ctx.globalCompositeOperation = 'source-over';
  // Golden koi swimming laps
  const fa = time * 1.5;
  const fx = Math.cos(fa) * 10;
  const fy = pcy + Math.sin(fa) * 7;
  ctx.save();
  ctx.translate(fx, fy);
  ctx.rotate(fa + Math.PI / 2);
  const wag = Math.sin(time * 14) * 0.4;
  ctx.fillStyle = '#fbbf24';
  ctx.beginPath();
  ctx.ellipse(0, 0, 4.4, 2.1, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.translate(-4, 0);
  ctx.rotate(wag);
  ctx.fillStyle = '#f97316';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(-4, -2.6);
  ctx.lineTo(-4, 2.6);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(2.2, -0.6, 0.7, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // Bubbles
  for (let i = 0; i < 5; i++) {
    const t = (time * 0.7 + pr(i * 9)) % 1;
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.arc(-10 + pr(i * 4) * 20, pcy + 16 - t * 32, 0.9 + pr(i) * 1.2, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(255,255,255,0.2)';
  ctx.beginPath();
  ctx.ellipse(-7, pcy - 8, 6, 3, -0.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle = brassGrad(ctx, -22, 22);
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(0, pcy, 21, 0, Math.PI * 2);
  ctx.stroke();
  for (let b = 0; b < 8; b++) {
    const a = (b / 8) * Math.PI * 2;
    ctx.fillStyle = '#3d2706';
    ctx.beginPath();
    ctx.arc(Math.cos(a) * 21, pcy + Math.sin(a) * 21, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const pgl = ctx.createRadialGradient(0, pcy, 10, 0, pcy, 34);
  pgl.addColorStop(0, `rgba(34,211,238,${0.25 * energy})`);
  pgl.addColorStop(1, 'rgba(34,211,238,0)');
  ctx.fillStyle = pgl;
  ctx.beginPath();
  ctx.arc(0, pcy, 34, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // 7. PRESSURE GAUGE
  ctx.save();
  ctx.translate(0, 45);
  ctx.fillStyle = brassGrad(ctx, -11, 11);
  ctx.beginPath();
  ctx.arc(0, 0, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f1f5f9';
  ctx.beginPath();
  ctx.arc(0, 0, 8.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#ef4444';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, 6.5, -0.3, 0.75);
  ctx.stroke();
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 0.8;
  for (let k = 0; k < 7; k++) {
    const a = Math.PI * 0.75 + (k / 6) * Math.PI * 1.5;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * 5.5, Math.sin(a) * 5.5);
    ctx.lineTo(Math.cos(a) * 7.5, Math.sin(a) * 7.5);
    ctx.stroke();
  }
  const needle =
    Math.PI * 0.75 +
    Math.min(1, charge * 0.75 + recoil * 0.35 + (od ? 0.25 : 0)) * Math.PI * 1.5 +
    Math.sin(time * 40) * 0.04;
  ctx.strokeStyle = '#dc2626';
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(Math.cos(needle) * 7, Math.sin(needle) * 7);
  ctx.stroke();
  ctx.fillStyle = '#1e293b';
  ctx.beginPath();
  ctx.arc(0, 0, 1.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // 8. HYDROKINETIC DROPLETS ORBITING THE TRIDENT
  const orbitY = -108 + slide - recoil * 10;
  const orbR = 34 + recoil * 14 + (od ? 8 : 0);
  for (let k = 0; k < 8; k++) {
    const a = time * 2.2 + (k / 8) * Math.PI * 2;
    const dx = Math.cos(a) * orbR;
    const dy = orbitY + Math.sin(a) * 9;
    ctx.save();
    ctx.translate(dx, dy);
    ctx.rotate(a + Math.PI);
    const dg = ctx.createLinearGradient(-3, 0, 3, 0);
    dg.addColorStop(0, '#0ea5e9');
    dg.addColorStop(0.5, '#cffafe');
    dg.addColorStop(1, '#0284c7');
    ctx.fillStyle = dg;
    ctx.globalAlpha = Math.sin(a) > 0 ? 1 : 0.55;
    ctx.beginPath();
    ctx.moveTo(0, -6);
    ctx.quadraticCurveTo(4, 0, 0, 4);
    ctx.quadraticCurveTo(-4, 0, 0, -6);
    ctx.fill();
    ctx.restore();
  }

  // 9. MUZZLE FLASH — Tidal splash crown
  if (muzzleFlash > 0.01) {
    const mf = Math.min(1, muzzleFlash * 1.3);
    const fs = 0.75 + muzzleFlash * 0.8 + (od ? 0.3 : 0);
    ctx.save();
    ctx.translate(0, -121 + slide);
    ctx.scale(fs, fs);
    ctx.globalAlpha = mf;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const bloom = ctx.createRadialGradient(0, -16, 0, 0, -16, 95);
    bloom.addColorStop(0, '#ffffff');
    bloom.addColorStop(0.3, '#67e8f9');
    bloom.addColorStop(0.65, 'rgba(14,165,233,0.4)');
    bloom.addColorStop(1, 'rgba(14,165,233,0)');
    ctx.fillStyle = bloom;
    ctx.beginPath();
    ctx.arc(0, -16, 95, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Water jet column
    const jet = ctx.createLinearGradient(0, -150, 0, 4);
    jet.addColorStop(0, 'rgba(165,243,252,0)');
    jet.addColorStop(0.35, 'rgba(103,232,249,0.9)');
    jet.addColorStop(1, '#ffffff');
    ctx.fillStyle = jet;
    ctx.beginPath();
    ctx.moveTo(-8, 2);
    for (let yy = 0; yy >= -150; yy -= 10) {
      ctx.lineTo(-8 - (1 - yy / -150) * 4 + Math.sin(yy * 0.2 + time * 30) * 2.5, yy);
    }
    for (let yy = -150; yy <= 0; yy += 10) {
      ctx.lineTo(8 + (1 - yy / -150) * 4 + Math.sin(yy * 0.2 + time * 30 + 1) * 2.5, yy);
    }
    ctx.closePath();
    ctx.fill();

    // Crown splash teardrops
    for (let i = 0; i < 14; i++) {
      const a = Math.PI + (i / 13) * Math.PI;
      const len = 26 + pr(flick + i) * 26 + (1 - muzzleFlash) * 30;
      ctx.save();
      ctx.translate(Math.cos(a) * 10, Math.sin(a) * 6);
      ctx.rotate(a + Math.PI / 2);
      const dg = ctx.createLinearGradient(0, 0, 0, -len);
      dg.addColorStop(0, '#ffffff');
      dg.addColorStop(1, '#22d3ee');
      ctx.fillStyle = dg;
      ctx.beginPath();
      ctx.moveTo(-2.4, 0);
      ctx.quadraticCurveTo(-3, -len * 0.7, 0, -len);
      ctx.quadraticCurveTo(3, -len * 0.7, 2.4, 0);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#e0f7ff';
      ctx.beginPath();
      ctx.arc(0, -len - 4, 2.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    // Foam + mist ring
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    for (let i = 0; i < 7; i++) {
      ctx.beginPath();
      ctx.arc((i - 3) * 5, -2 + Math.abs(i - 3) * 1.2, 5 - Math.abs(i - 3) * 0.6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = 'rgba(207,250,254,0.9)';
    ctx.lineWidth = 2.2 * muzzleFlash + 0.6;
    ctx.beginPath();
    const rr = 16 + (1 - muzzleFlash) * 70;
    ctx.ellipse(0, -4, rr, rr * 0.3, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  ctx.restore();
}

// ============================================================================
// ❄️ FROSTBITE AVALANCHE — SNOWBALL GUN
// ============================================================================
function snowCap(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, bumps: number) {
  ctx.fillStyle = '#b9d6ee';
  for (let i = 0; i <= bumps; i++) {
    const t = i / bumps;
    ctx.beginPath();
    ctx.arc(x1 + (x2 - x1) * t + 0.8, y1 + (y2 - y1) * t + 1.2, 3.4 + pr(i + x1) * 1.6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#ffffff';
  for (let i = 0; i <= bumps; i++) {
    const t = i / bumps;
    ctx.beginPath();
    ctx.arc(x1 + (x2 - x1) * t, y1 + (y2 - y1) * t, 3.4 + pr(i + x1) * 1.6, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawSnowGun(ctx: CanvasRenderingContext2D, p: GunRenderParams) {
  const { x, y, scale, time, recoil, muzzleFlash, ammoLeft, ammoTotal, overdrivePrimed: od } = p;
  const charge = p.charge ?? 1;
  const slide = recoil * 14;
  const energy = Math.min(1.5, 0.5 + charge * 0.5 + recoil * 0.7 + (od ? 0.5 : 0));
  const flick = Math.floor(time * 26);

  ctx.save();
  ctx.translate(x, y + recoil * 15 * scale);
  ctx.scale(scale, scale);

  // 1. GLACIAL AURA + GIANT ROTATING SNOWFLAKE SIGIL
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const aura = ctx.createRadialGradient(0, -25, 8, 0, -25, od ? 160 : 125);
  aura.addColorStop(0, `rgba(186, 230, 253, ${0.26 * energy})`);
  aura.addColorStop(0.5, `rgba(59, 130, 246, ${0.07 * energy})`);
  aura.addColorStop(1, 'rgba(59,130,246,0)');
  ctx.fillStyle = aura;
  ctx.beginPath();
  ctx.arc(0, -25, od ? 160 : 125, 0, Math.PI * 2);
  ctx.fill();
  drawSnowflake(ctx, 0, -30, 100, time * 0.15, 'rgba(186,230,253,1)', 0.16 * energy, 3.5);
  drawSnowflake(ctx, 0, -30, 60, -time * 0.25, 'rgba(224,242,254,1)', 0.14 * energy, 2);
  ctx.restore();

  // 2. RED KNIT MITTENS
  for (const side of [-1, 1]) {
    ctx.save();
    ctx.scale(side, 1);
    drawGripStrut(ctx, '#2a3f55', '#cbd5e1');
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(18, 60);
    ctx.quadraticCurveTo(30, 54, 42, 60);
    ctx.quadraticCurveTo(54, 66, 50, 78);
    ctx.lineTo(46, 86);
    ctx.lineTo(19, 86);
    ctx.quadraticCurveTo(14, 72, 18, 60);
    ctx.closePath();
    const mg = ctx.createLinearGradient(18, 56, 50, 88);
    mg.addColorStop(0, '#f87171');
    mg.addColorStop(0.5, '#dc2626');
    mg.addColorStop(1, '#7f1d1d');
    ctx.fillStyle = mg;
    ctx.fill();
    ctx.strokeStyle = '#450a0a';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.clip();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    for (let k = 0; k <= 8; k++) {
      const px = 17 + k * 4;
      const py = 70 + (k % 2 === 0 ? -2 : 2);
      if (k === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    for (let k = 0; k < 4; k++) {
      ctx.beginPath();
      ctx.arc(22 + k * 7, 64, 1, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    // Fluffy cuff
    ctx.fillStyle = '#ffffff';
    for (let k = 0; k < 6; k++) {
      ctx.beginPath();
      ctx.arc(20 + k * 5, 86 + (k % 2) * 1.2, 3.4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // 3. ICE CRYSTAL SIDE PODS with snow caps & hanging icicles
  for (const side of [-1, 1]) {
    ctx.save();
    ctx.scale(side, 1);
    ctx.translate(recoil * 4, recoil * 8);
    const podPts: [number, number][] = [
      [31, -98],
      [43, -84],
      [45, -46],
      [60, -28],
      [64, 14],
      [52, 40],
      [30, 44],
      [27, -28],
      [31, -48],
    ];
    const podPath = () => {
      ctx.beginPath();
      podPts.forEach(([px, py], i) => (i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)));
      ctx.closePath();
    };
    const ig = ctx.createLinearGradient(28, -98, 64, 44);
    ig.addColorStop(0, 'rgba(240, 249, 255, 0.97)');
    ig.addColorStop(0.35, 'rgba(165, 210, 245, 0.93)');
    ig.addColorStop(0.75, 'rgba(70, 125, 190, 0.94)');
    ig.addColorStop(1, 'rgba(30, 60, 110, 0.96)');
    ctx.fillStyle = ig;
    ctx.strokeStyle = '#e0f2fe';
    ctx.lineWidth = 1.5;
    podPath();
    ctx.fill();
    ctx.stroke();

    ctx.save();
    podPath();
    ctx.clip();
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(31, -48);
    ctx.lineTo(60, -28);
    ctx.moveTo(27, -28);
    ctx.lineTo(64, 14);
    ctx.moveTo(30, 44);
    ctx.lineTo(45, -46);
    ctx.moveTo(43, -84);
    ctx.lineTo(31, -48);
    ctx.stroke();
    // Frozen bubbles
    for (let b = 0; b < 6; b++) {
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.arc(34 + pr(b * 3 + side) * 24, -30 + pr(b * 5) * 60, 0.8 + pr(b) * 1.4, 0, Math.PI * 2);
      ctx.stroke();
    }
    // Shimmer sweep
    ctx.globalCompositeOperation = 'lighter';
    const sx = ((time * 0.45 + (side > 0 ? 0 : 0.5)) % 1) * 140 - 40;
    const sg = ctx.createLinearGradient(sx - 14, -100, sx + 14, 50);
    sg.addColorStop(0, 'rgba(255,255,255,0)');
    sg.addColorStop(0.5, 'rgba(255,255,255,0.5)');
    sg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = sg;
    ctx.fillRect(20, -100, 50, 150);
    ctx.restore();

    // Glowing snowflake rune
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    drawSnowflake(ctx, 48, 2, 8, time * 0.8 * side, '#7dd3fc', 0.6 + 0.4 * Math.sin(time * 3 + side), 2.4);
    drawSnowflake(ctx, 48, 2, 8, time * 0.8 * side, '#ffffff', 0.9, 0.9);
    ctx.restore();

    // Snow caps
    snowCap(ctx, 45, -46, 60, -28, 5);
    snowCap(ctx, 31, -98, 43, -84, 3);

    // Hanging icicles
    for (let k = 0; k < 4; k++) {
      const ix = 33 + k * 5.5;
      const iy = 43.5 - k * 0.7;
      const len = 8 + pr(k + 3) * 10 + Math.sin(time * 2 + k) * 0.6;
      const icg = ctx.createLinearGradient(0, iy, 0, iy + len);
      icg.addColorStop(0, 'rgba(240,249,255,0.95)');
      icg.addColorStop(1, 'rgba(125,211,252,0.6)');
      ctx.fillStyle = icg;
      ctx.beginPath();
      ctx.moveTo(ix - 2.2, iy);
      ctx.lineTo(ix + 2.2, iy);
      ctx.lineTo(ix, iy + len);
      ctx.closePath();
      ctx.fill();
      const dripT = (time * 0.6 + pr(k)) % 1;
      if (dripT > 0.75) {
        drawTwinkle(ctx, ix, iy + len, 3, '#bae6fd', (dripT - 0.75) * 4);
      }
    }
    ctx.restore();
  }

  // 4. FROSTED LAUNCHER BARREL + ICE-SHARD CROWN
  ctx.save();
  ctx.translate(0, slide);
  const barrelPath = () => {
    ctx.beginPath();
    ctx.moveTo(-15, -100);
    ctx.lineTo(15, -100);
    ctx.lineTo(18, -30);
    ctx.lineTo(-18, -30);
    ctx.closePath();
  };
  const bgr = ctx.createLinearGradient(-18, 0, 18, 0);
  bgr.addColorStop(0, '#1b2a3a');
  bgr.addColorStop(0.25, '#5b7a99');
  bgr.addColorStop(0.45, '#eaf6ff');
  bgr.addColorStop(0.65, '#7aa3c7');
  bgr.addColorStop(1, '#1b2a3a');
  ctx.fillStyle = bgr;
  ctx.strokeStyle = '#0d1824';
  ctx.lineWidth = 1.6;
  barrelPath();
  ctx.fill();
  ctx.stroke();
  // Frost creeping down from muzzle
  ctx.save();
  barrelPath();
  ctx.clip();
  const fr = ctx.createLinearGradient(0, -100, 0, -40);
  fr.addColorStop(0, 'rgba(255,255,255,0.65)');
  fr.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = fr;
  ctx.fillRect(-20, -100, 40, 70);
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  for (let i = 0; i < 26; i++) {
    ctx.beginPath();
    ctx.arc((pr(i) - 0.5) * 34, -100 + pr(i * 2.7) * 70, 0.5 + pr(i * 3) * 0.9, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  // Bore slot with snowball travelling up as the gun recharges
  ctx.fillStyle = '#081320';
  ctx.beginPath();
  ctx.roundRect(-7, -98, 14, 64, 7);
  ctx.fill();
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(-7, -98, 14, 64, 7);
  ctx.clip();
  ctx.globalCompositeOperation = 'lighter';
  const bore = ctx.createLinearGradient(0, -98, 0, -34);
  bore.addColorStop(0, `rgba(125,211,252,${0.5 * energy})`);
  bore.addColorStop(1, 'rgba(59,130,246,0.1)');
  ctx.fillStyle = bore;
  ctx.fillRect(-7, -98, 14, 64);
  ctx.globalCompositeOperation = 'source-over';
  const sbY = -38 - charge * 52;
  const sbg = ctx.createRadialGradient(-2, sbY - 2, 0, 0, sbY, 6.5);
  sbg.addColorStop(0, '#ffffff');
  sbg.addColorStop(0.7, '#e3f1fc');
  sbg.addColorStop(1, '#9fc2e0');
  ctx.fillStyle = sbg;
  ctx.beginPath();
  ctx.arc(0, sbY, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // Silver frost rings
  for (const ry of [-92, -66, -40]) {
    const w = ry < -80 ? 16 : ry < -60 ? 17 : 18.5;
    const sg = ctx.createLinearGradient(-w, 0, w, 0);
    sg.addColorStop(0, '#475569');
    sg.addColorStop(0.4, '#ffffff');
    sg.addColorStop(1, '#64748b');
    ctx.fillStyle = sg;
    ctx.fillRect(-w, ry, w * 2, 4);
    drawTwinkle(ctx, -w + ((time * 20 + ry) % (w * 2)), ry + 2, 3, '#e0f2fe', 0.7);
  }
  // Ice shard crown
  for (let i = 0; i < 7; i++) {
    const t = i / 6 - 0.5;
    const bx = t * 26;
    const tipX = t * 46;
    const tipY = -100 - (17 + pr(i + 1) * 11) - (1 - Math.abs(t) * 2) * 6;
    const sg = ctx.createLinearGradient(bx, -100, tipX, tipY);
    sg.addColorStop(0, 'rgba(147,197,253,0.9)');
    sg.addColorStop(1, 'rgba(240,249,255,0.98)');
    ctx.fillStyle = sg;
    ctx.strokeStyle = '#f0f9ff';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(bx - 3.2, -99);
    ctx.lineTo(tipX, tipY);
    ctx.lineTo(bx + 3.2, -99);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  snowCap(ctx, -16, -100, 16, -100, 7);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const cg = ctx.createRadialGradient(0, -110, 0, 0, -110, 26);
  cg.addColorStop(0, `rgba(224,242,254,${0.55 * energy})`);
  cg.addColorStop(1, 'rgba(125,211,252,0)');
  ctx.fillStyle = cg;
  ctx.beginPath();
  ctx.arc(0, -110, 26, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.restore();

  // 5. STEEL RECEIVER with frost patches and snow on the shoulders
  const recPath = () => {
    ctx.beginPath();
    ctx.moveTo(-22, -34);
    ctx.lineTo(22, -34);
    ctx.lineTo(32, -16);
    ctx.lineTo(32, 50);
    ctx.lineTo(20, 68);
    ctx.lineTo(-20, 68);
    ctx.lineTo(-32, 50);
    ctx.lineTo(-32, -16);
    ctx.closePath();
  };
  const rg = ctx.createLinearGradient(-32, 0, 32, 0);
  rg.addColorStop(0, '#1b2a3a');
  rg.addColorStop(0.25, '#4f6d8c');
  rg.addColorStop(0.5, '#a9c6e0');
  rg.addColorStop(0.75, '#4f6d8c');
  rg.addColorStop(1, '#1b2a3a');
  ctx.fillStyle = rg;
  ctx.strokeStyle = '#0d1824';
  ctx.lineWidth = 2;
  recPath();
  ctx.fill();
  ctx.stroke();
  ctx.save();
  recPath();
  ctx.clip();
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  for (let i = 0; i < 40; i++) {
    const fx = (pr(i * 1.7) - 0.5) * 64;
    const fy = -34 + pr(i * 4.1) * 102;
    if (Math.abs(fx) > 20 || fy > 40) {
      ctx.beginPath();
      ctx.arc(fx, fy, 0.6 + pr(i) * 1.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
  snowCap(ctx, -24, -34, -12, -34, 3);
  snowCap(ctx, 12, -34, 24, -34, 3);

  // Snowball drum (count = ammo left)
  const dcy = 4;
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, dcy, 20, 0, Math.PI * 2);
  ctx.clip();
  const dg = ctx.createRadialGradient(0, dcy, 2, 0, dcy, 22);
  dg.addColorStop(0, '#1e3a5f');
  dg.addColorStop(1, '#07111c');
  ctx.fillStyle = dg;
  ctx.fillRect(-22, dcy - 22, 44, 44);
  const balls = Math.min(8, Math.max(0, ammoLeft));
  const drumA = time * 0.6 + recoil * 1.4;
  for (let i = 0; i < 8; i++) {
    const a = drumA + (i / 8) * Math.PI * 2;
    const bx = Math.cos(a) * 12.5;
    const by = dcy + Math.sin(a) * 12.5;
    if (i < balls) {
      const bgd = ctx.createRadialGradient(bx - 1.5, by - 1.5, 0, bx, by, 5.5);
      bgd.addColorStop(0, '#ffffff');
      bgd.addColorStop(0.7, '#e3f1fc');
      bgd.addColorStop(1, '#93b8d8');
      ctx.fillStyle = bgd;
    } else {
      ctx.fillStyle = 'rgba(80,110,150,0.35)';
    }
    ctx.beginPath();
    ctx.arc(bx, by, 5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalCompositeOperation = 'lighter';
  drawSnowflake(ctx, 0, dcy, 6.5, -time * 1.4, '#7dd3fc', 0.9, 2.2);
  drawSnowflake(ctx, 0, dcy, 6.5, -time * 1.4, '#ffffff', 1, 0.8);
  const fg = ctx.createRadialGradient(0, dcy, 12, 0, dcy, 21);
  fg.addColorStop(0, 'rgba(255,255,255,0)');
  fg.addColorStop(1, 'rgba(255,255,255,0.35)');
  ctx.fillStyle = fg;
  ctx.fillRect(-22, dcy - 22, 44, 44);
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = 'rgba(255,255,255,0.2)';
  ctx.beginPath();
  ctx.ellipse(-7, dcy - 9, 7, 3, -0.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  const rimG = ctx.createLinearGradient(-22, 0, 22, 0);
  rimG.addColorStop(0, '#475569');
  rimG.addColorStop(0.4, '#f8fafc');
  rimG.addColorStop(1, '#475569');
  ctx.strokeStyle = rimG;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(0, dcy, 21, 0, Math.PI * 2);
  ctx.stroke();
  for (let b = 0; b < 6; b++) {
    const a = (b / 6) * Math.PI * 2 + Math.PI / 6;
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.arc(Math.cos(a) * 21, dcy + Math.sin(a) * 21, 1.3, 0, Math.PI * 2);
    ctx.fill();
  }

  // Ice-crystal ammo pips
  const n = Math.min(12, Math.max(1, ammoTotal));
  const lit = Math.round((ammoLeft / Math.max(1, ammoTotal)) * n);
  const spacing = Math.min(7, 46 / n);
  for (let i = 0; i < n; i++) {
    const gx = -((n - 1) * spacing) / 2 + i * spacing;
    const on = i < lit;
    ctx.fillStyle = on ? '#e0f2fe' : 'rgba(80,110,150,0.4)';
    ctx.beginPath();
    ctx.moveTo(gx, 43);
    ctx.lineTo(gx + 2.4, 47);
    ctx.lineTo(gx, 51);
    ctx.lineTo(gx - 2.4, 47);
    ctx.closePath();
    ctx.fill();
    if (on) drawTwinkle(ctx, gx, 47, 3, '#7dd3fc', 0.3 + 0.3 * Math.sin(time * 5 + i));
  }

  // 6. FROST BREATH from side vents
  for (const side of [-1, 1]) {
    for (let k = 0; k < 4; k++) {
      const t = (time * 0.7 + k * 0.25) % 1;
      const px = side * (34 + t * 32);
      const py = 16 - t * 14;
      const r = 4 + t * 12;
      const mgd = ctx.createRadialGradient(px, py, 0, px, py, r);
      mgd.addColorStop(0, `rgba(240,249,255,${(1 - t) * 0.4})`);
      mgd.addColorStop(1, 'rgba(240,249,255,0)');
      ctx.fillStyle = mgd;
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 7. GENTLE SNOWFALL around the gun
  for (let i = 0; i < 20; i++) {
    const t = (time * 0.22 + pr(i)) % 1;
    const fx = (pr(i * 7) - 0.5) * 180 + Math.sin(time * 1.3 + i) * 7;
    const fy = -160 + t * 250;
    drawSnowflake(ctx, fx, fy, 2 + pr(i * 3) * 2.2, time + i, '#ffffff', Math.sin(t * Math.PI) * 0.85, 0.9);
  }

  // OVERDRIVE: blizzard flakes orbiting the muzzle
  if (od) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let k = 0; k < 8; k++) {
      const a = time * 2.4 + (k / 8) * Math.PI * 2;
      drawSnowflake(ctx, Math.cos(a) * 36, -112 + slide + Math.sin(a) * 10, 5, time * 3, '#bae6fd', 0.95, 1.4);
    }
    ctx.restore();
  }

  // 8. MUZZLE FLASH — Avalanche burst
  if (muzzleFlash > 0.01) {
    const mf = Math.min(1, muzzleFlash * 1.3);
    const fs = 0.75 + muzzleFlash * 0.8 + (od ? 0.3 : 0);
    ctx.save();
    ctx.translate(0, -118 + slide);
    ctx.scale(fs, fs);
    ctx.globalAlpha = mf;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const bloom = ctx.createRadialGradient(0, -16, 0, 0, -16, 95);
    bloom.addColorStop(0, '#ffffff');
    bloom.addColorStop(0.3, '#bae6fd');
    bloom.addColorStop(0.65, 'rgba(59,130,246,0.35)');
    bloom.addColorStop(1, 'rgba(59,130,246,0)');
    ctx.fillStyle = bloom;
    ctx.beginPath();
    ctx.arc(0, -16, 95, 0, Math.PI * 2);
    ctx.fill();
    for (let r = 0; r < 12; r++) {
      const a = (r / 12) * Math.PI * 2 + flick * 0.1;
      const len = (r % 2 === 0 ? 70 : 42) * (0.8 + pr(flick + r) * 0.4);
      ctx.save();
      ctx.translate(0, -14);
      ctx.rotate(a);
      const sg = ctx.createLinearGradient(0, 0, 0, -len);
      sg.addColorStop(0, '#ffffff');
      sg.addColorStop(1, 'rgba(125,211,252,0)');
      ctx.fillStyle = sg;
      ctx.beginPath();
      ctx.moveTo(-4, 0);
      ctx.lineTo(0, -len);
      ctx.lineTo(4, 0);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    drawSnowflake(ctx, 0, -18, 34 + (1 - muzzleFlash) * 30, time * 2, '#ffffff', mf, 3);
    ctx.restore();
    // Snow puff cloud
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2;
      const rr = 10 + (1 - muzzleFlash) * 26;
      const px = Math.cos(a) * rr;
      const py = -14 + Math.sin(a) * rr * 0.6;
      const pg = ctx.createRadialGradient(px, py, 0, px, py, 14);
      pg.addColorStop(0, 'rgba(255,255,255,0.95)');
      pg.addColorStop(0.6, 'rgba(235,245,255,0.7)');
      pg.addColorStop(1, 'rgba(235,245,255,0)');
      ctx.fillStyle = pg;
      ctx.beginPath();
      ctx.arc(px, py, 14, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = 'rgba(186,230,253,0.95)';
    ctx.lineWidth = 2.4 * muzzleFlash + 0.6;
    const rr = 18 + (1 - muzzleFlash) * 70;
    ctx.beginPath();
    ctx.ellipse(0, -6, rr, rr * 0.3, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  ctx.restore();
}

export function drawSpecialGun(ctx: CanvasRenderingContext2D, p: GunRenderParams) {
  if (p.theme.kind === 'rainbow') drawRainbowGun(ctx, p);
  else if (p.theme.kind === 'water') drawWaterGun(ctx, p);
  else drawSnowGun(ctx, p);
}

// ============================================================================
// PROJECTILES (tip y=-35 into the wheel, tail y=+32 outside)
// ============================================================================
export function drawSpecialProjectile(
  ctx: CanvasRenderingContext2D,
  theme: WeaponTheme,
  opts: { scale?: number; isOverdrive?: boolean; flash?: number; inFlight?: boolean; time?: number }
) {
  const { scale = 1, isOverdrive = false, flash = 0, inFlight = false, time = 0 } = opts;
  ctx.save();
  ctx.scale(scale, scale);

  if (theme.kind === 'rainbow') {
    // ---------- PRISM LANCE ----------
    if (inFlight) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const len = isOverdrive ? 180 : 115;
      for (let i = 0; i < 7; i++) {
        const g = ctx.createLinearGradient(0, 14, 0, 14 + len);
        g.addColorStop(0, SPECTRUM[i]);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.strokeStyle = g;
        ctx.lineWidth = isOverdrive ? 3.6 : 2.6;
        ctx.beginPath();
        for (let s = 0; s <= 14; s++) {
          const yy = 14 + (s / 14) * len;
          const xx = (-7.5 + i * 2.5) * (1 + (s / 14) * 0.6) + Math.sin(yy * 0.08 - time * 22) * (s / 14) * 6;
          if (s === 0) ctx.moveTo(xx, yy);
          else ctx.lineTo(xx, yy);
        }
        ctx.stroke();
      }
      const tb = ctx.createRadialGradient(0, -30, 0, 0, -30, 26);
      tb.addColorStop(0, '#ffffff');
      tb.addColorStop(0.35, hsl(time * 300));
      tb.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = tb;
      ctx.beginPath();
      ctx.arc(0, -30, 26, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    const sg = ctx.createLinearGradient(0, -35, 0, 22);
    SPECTRUM.forEach((c, i) => sg.addColorStop(i / 6, c));
    ctx.fillStyle = sg;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(0, -35);
    ctx.lineTo(7.5, -14);
    ctx.lineTo(4, -10);
    ctx.lineTo(4, 22);
    ctx.lineTo(-4, 22);
    ctx.lineTo(-4, -10);
    ctx.lineTo(-7.5, -14);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(0, -33);
    ctx.lineTo(0, 20);
    ctx.stroke();
    ctx.restore();
    ctx.save();
    ctx.translate(0, 24);
    ctx.rotate(time * 3);
    const stG = ctx.createRadialGradient(0, 0, 0, 0, 0, 10);
    stG.addColorStop(0, '#ffffff');
    stG.addColorStop(0.5, '#fff1b8');
    stG.addColorStop(1, '#f5c542');
    ctx.fillStyle = stG;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    star5(ctx, 9.5, 4.2, 5);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    drawTwinkle(ctx, 0, 24, 9 + Math.sin(time * 8) * 2, hsl(time * 200), 0.6);
  } else if (theme.kind === 'water') {
    // ---------- HYDRO JAVELIN ----------
    if (inFlight) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const len = isOverdrive ? 170 : 105;
      const tg = ctx.createLinearGradient(0, 12, 0, 12 + len);
      tg.addColorStop(0, '#e0f7ff');
      tg.addColorStop(0.2, '#22d3ee');
      tg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = tg;
      ctx.beginPath();
      ctx.moveTo(-8, 14);
      for (let s = 0; s <= 10; s++) {
        const yy = 14 + (s / 10) * len;
        ctx.lineTo(-8 * (1 - s / 10) + Math.sin(yy * 0.1 - time * 25) * 2, yy);
      }
      for (let s = 10; s >= 0; s--) {
        const yy = 14 + (s / 10) * len;
        ctx.lineTo(8 * (1 - s / 10) + Math.sin(yy * 0.1 - time * 25 + 1) * 2, yy);
      }
      ctx.closePath();
      ctx.fill();
      for (let k = 0; k < 3; k++) {
        const t = (time * 6 + k / 3) % 1;
        ctx.strokeStyle = `rgba(224,247,255,${(1 - t) * 0.8})`;
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        ctx.ellipse(0, 18 + t * len * 0.7, 6 + t * 10, 2 + t * 2, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      const tb = ctx.createRadialGradient(0, -28, 0, 0, -28, 24);
      tb.addColorStop(0, '#ffffff');
      tb.addColorStop(0.35, '#22d3ee');
      tb.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = tb;
      ctx.beginPath();
      ctx.arc(0, -28, 24, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    // Brass tail fins
    ctx.fillStyle = brassGrad(ctx, -10, 10);
    ctx.strokeStyle = '#3d2706';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-4, 18);
    ctx.lineTo(-11, 30);
    ctx.lineTo(-4, 27);
    ctx.lineTo(4, 27);
    ctx.lineTo(11, 30);
    ctx.lineTo(4, 18);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    const dropPath = () => {
      ctx.beginPath();
      ctx.moveTo(0, -36);
      ctx.bezierCurveTo(10, -14, 10.5, 10, 0, 24);
      ctx.bezierCurveTo(-10.5, 10, -10, -14, 0, -36);
      ctx.closePath();
    };
    const wg = ctx.createLinearGradient(-10, 0, 10, 0);
    wg.addColorStop(0, 'rgba(3,105,161,0.95)');
    wg.addColorStop(0.35, 'rgba(103,232,249,0.9)');
    wg.addColorStop(0.55, 'rgba(224,247,255,0.97)');
    wg.addColorStop(1, 'rgba(14,116,144,0.95)');
    ctx.fillStyle = wg;
    ctx.strokeStyle = '#a5f3fc';
    ctx.lineWidth = 1.2;
    dropPath();
    ctx.fill();
    ctx.stroke();
    ctx.save();
    dropPath();
    ctx.clip();
    ctx.globalCompositeOperation = 'lighter';
    for (let k = 0; k < 3; k++) {
      ctx.strokeStyle = 'rgba(255,255,255,0.4)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let yy = -32; yy <= 22; yy += 3) {
        const xx = Math.sin(yy * 0.25 + time * 12 + k * 2) * 5;
        if (yy === -32) ctx.moveTo(xx, yy);
        else ctx.lineTo(xx, yy);
      }
      ctx.stroke();
    }
    for (let b = 0; b < 4; b++) {
      const t = (time * 1.2 + b * 0.25) % 1;
      ctx.strokeStyle = 'rgba(255,255,255,0.8)';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.arc(Math.sin(b * 2 + time * 3) * 3.5, 18 - t * 44, 1.1 + (b % 2) * 0.6, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.beginPath();
    ctx.ellipse(-3.6, -6, 1.5, 12, 0.08, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // ---------- FROST ICICLE + SNOWBALL ----------
    if (inFlight) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const len = isOverdrive ? 160 : 100;
      const tg = ctx.createLinearGradient(0, 18, 0, 18 + len);
      tg.addColorStop(0, 'rgba(255,255,255,0.9)');
      tg.addColorStop(0.3, 'rgba(186,230,253,0.5)');
      tg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = tg;
      ctx.beginPath();
      ctx.moveTo(-11, 20);
      ctx.lineTo(11, 20);
      ctx.lineTo(4, 18 + len);
      ctx.lineTo(-4, 18 + len);
      ctx.closePath();
      ctx.fill();
      for (let k = 0; k < 5; k++) {
        const t = (time * 3 + k / 5) % 1;
        drawSnowflake(ctx, Math.sin(k * 2.3 + time * 4) * (6 + t * 10), 24 + t * len * 0.8, 3 + t * 2, time * 4 + k, '#ffffff', 1 - t, 1);
      }
      const tb = ctx.createRadialGradient(0, -28, 0, 0, -28, 24);
      tb.addColorStop(0, '#ffffff');
      tb.addColorStop(0.35, '#7dd3fc');
      tb.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = tb;
      ctx.beginPath();
      ctx.arc(0, -28, 24, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    const ig = ctx.createLinearGradient(-7, 0, 7, 0);
    ig.addColorStop(0, 'rgba(59,130,246,0.95)');
    ig.addColorStop(0.4, 'rgba(224,247,255,0.98)');
    ig.addColorStop(0.6, '#ffffff');
    ig.addColorStop(1, 'rgba(96,165,250,0.95)');
    ctx.fillStyle = ig;
    ctx.strokeStyle = '#f0f9ff';
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(0, -36);
    ctx.lineTo(7, -4);
    ctx.lineTo(4.5, 10);
    ctx.lineTo(-4.5, 10);
    ctx.lineTo(-7, -4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(0, -34);
    ctx.lineTo(1.5, 8);
    ctx.stroke();
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const ib = ctx.createRadialGradient(0, -10, 0, 0, -10, 14);
    ib.addColorStop(0, `rgba(125,211,252,${isOverdrive ? 0.8 : 0.45})`);
    ib.addColorStop(1, 'rgba(125,211,252,0)');
    ctx.fillStyle = ib;
    ctx.beginPath();
    ctx.ellipse(0, -10, 9, 22, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    // Packed snowball
    const sb = ctx.createRadialGradient(-3.5, 13, 0, 0, 18, 12);
    sb.addColorStop(0, '#ffffff');
    sb.addColorStop(0.6, '#e6f3ff');
    sb.addColorStop(1, '#a9cbe8');
    ctx.fillStyle = sb;
    ctx.strokeStyle = 'rgba(140,175,210,0.85)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, 18, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = 'rgba(150,185,215,0.55)';
    for (let i = 0; i < 7; i++) {
      ctx.beginPath();
      ctx.arc((pr(i) - 0.5) * 14, 18 + (pr(i * 3) - 0.5) * 14, 0.9 + pr(i * 5) * 0.8, 0, Math.PI * 2);
      ctx.fill();
    }
    drawTwinkle(ctx, -4, 14, 3.5 + Math.sin(time * 9) * 1.2, '#e0f2fe', 0.8);
  }

  if (flash > 0.01) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = flash;
    const fg = ctx.createRadialGradient(0, -10, 0, 0, -10, 22);
    fg.addColorStop(0, '#ffffff');
    fg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = fg;
    ctx.beginPath();
    ctx.arc(0, -10, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}
