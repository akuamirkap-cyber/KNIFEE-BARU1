import { WeaponId, WeaponTheme } from './types';
import { SPECIAL_THEMES, drawSpecialProjectile } from './specialWeapons';
import { CRYSTAL_THEME, RIFLE_THEME, TOY_THEMES, drawGunBullet, drawSideGun } from './guns';
import { isFirearm } from './trails';

export const WEAPON_THEMES: Record<WeaponId, WeaponTheme> = {
  bfg: {
    id: 'bfg',
    name: 'BFG-9900 OBLITERATOR',
    subtitle: 'UAC Heavy Argent Siege Cannon',
    tag: 'ARGENT PLASMA',
    kind: 'obliterator',
    rarity: 'EPIC',
    rarityColor: '#4ade80',
    short: 'BFG',
    armorPrimary: '#4b574c',
    armorSecondary: '#2a312b',
    armorDark: '#111512',
    armorHighlight: '#93a894',
    trimMetal: '#d4a24c',
    plasmaCore: '#ffffff',
    plasmaMid: '#4ade80',
    plasmaOuter: '#16a34a',
    plasmaGlowRgba: 'rgba(74, 222, 128, ',
    laserSightRgba: 'rgba(74, 222, 128, ',
    muzzleFlashHex: '#86efac',
    spikeBody: '#343e35',
    spikeBlade: '#4ade80',
  },
  crucible: {
    id: 'crucible',
    name: 'HELLFIRE JUDGE',
    subtitle: 'Demonic .666 Magnum Revolver',
    tag: 'HELLFIRE CORE',
    kind: 'revolver',
    rarity: 'LEGENDARY',
    rarityColor: '#fb7185',
    short: 'REVOLVER',
    armorPrimary: '#472f34',
    armorSecondary: '#24171a',
    armorDark: '#100a0b',
    armorHighlight: '#9c6871',
    trimMetal: '#e0602a',
    plasmaCore: '#fff7ed',
    plasmaMid: '#fb7185',
    plasmaOuter: '#e11d48',
    plasmaGlowRgba: 'rgba(244, 63, 94, ',
    laserSightRgba: 'rgba(251, 113, 133, ',
    muzzleFlashHex: '#fda4af',
    spikeBody: '#361f24',
    spikeBlade: '#f43f5e',
  },
  maykr: {
    id: 'maykr',
    name: 'M1911 LEGACY',
    subtitle: 'Full-Size .45 ACP Combat Pistol · Real-World Classic',
    tag: '.45 LEGACY',
    kind: 'pistol',
    rarity: 'COMMON',
    rarityColor: '#a1a1aa',
    short: 'PISTOL',
    armorPrimary: '#46525f',
    armorSecondary: '#2b333d',
    armorDark: '#12161c',
    armorHighlight: '#9fb2c4',
    trimMetal: '#c9a24a',
    plasmaCore: '#f8fafc',
    plasmaMid: '#7fb3ff',
    plasmaOuter: '#1d4ed8',
    plasmaGlowRgba: 'rgba(127, 179, 255, ',
    laserSightRgba: 'rgba(127, 179, 255, ',
    muzzleFlashHex: '#fbbf24',
    spikeBody: '#2b333d',
    spikeBlade: '#7fb3ff',
  },
  overlord: {
    id: 'overlord',
    name: 'MAGMA SUPER SHOTGUN',
    subtitle: 'Molten Double-Barrel Sawed-Off',
    tag: 'MOLTEN SURGE',
    kind: 'shotgun',
    rarity: 'EPIC',
    rarityColor: '#fb923c',
    short: 'SHOTGUN',
    armorPrimary: '#4a423e',
    armorSecondary: '#262220',
    armorDark: '#110f0d',
    armorHighlight: '#a0918a',
    trimMetal: '#f59e0b',
    plasmaCore: '#fef9c3',
    plasmaMid: '#fb923c',
    plasmaOuter: '#ea580c',
    plasmaGlowRgba: 'rgba(251, 146, 60, ',
    laserSightRgba: 'rgba(251, 146, 60, ',
    muzzleFlashHex: '#fdba74',
    spikeBody: '#362e2b',
    spikeBlade: '#fb923c',
  },
  ...SPECIAL_THEMES,
  rifle: RIFLE_THEME,
  ...TOY_THEMES,
  crystal: CRYSTAL_THEME,
};

export const WEAPON_ORDER: WeaponId[] = [
  'bfg',
  'crucible',
  'maykr',
  'overlord',
  'rifle',
  'banana',
  'beehive',
  'bubble',
  'confetti',
  'crystal',
  'rainbow',
  'water',
  'snow',
];

export interface GunRenderParams {
  x: number;
  y: number;
  scale: number;
  time: number;
  recoil: number; // 0..1
  muzzleFlash: number; // 0..1
  heat: number; // 0..1
  ammoLeft: number;
  ammoTotal: number;
  overdrivePrimed: boolean;
  theme: WeaponTheme;
  charge?: number; // 0..1 — reactor re-charging after each shot
  peelOpen?: number; // 0..1 — Banana Gun peel opening amount
  fleshFill?: number; // 0..1 — Banana Gun flesh refill amount
}

// ============================================================================
// LIGHTNING HELPERS (shared with engine)
// ============================================================================

export function pseudoRandom(n: number): number {
  const s = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
  return s - Math.floor(s);
}

export function traceLightning(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  segs: number,
  amp: number,
  seed: number
) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  for (let i = 1; i < segs; i++) {
    const t = i / segs;
    const env = Math.sin(t * Math.PI);
    const off = (pseudoRandom(seed * 7.13 + i * 3.71) - 0.5) * 2 * amp * env;
    ctx.lineTo(x1 + dx * t + nx * off, y1 + dy * t + ny * off);
  }
  ctx.lineTo(x2, y2);
}

export function strokeLightning(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: string,
  width: number,
  segs: number,
  amp: number,
  seed: number,
  alpha = 1
) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.globalAlpha = alpha * 0.5;
  ctx.strokeStyle = color;
  ctx.lineWidth = width * 3;
  traceLightning(ctx, x1, y1, x2, y2, segs, amp, seed);
  ctx.stroke();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = width;
  traceLightning(ctx, x1, y1, x2, y2, segs, amp, seed);
  ctx.stroke();
  ctx.restore();
}

// ============================================================================
// RUNE GLYPHS (Sentinel / Argent runes)
// ============================================================================
const RUNES: number[][][][] = [
  [[[-1, 1], [0, -1], [1, 1]], [[-0.55, 0.2], [0.55, 0.2]]],
  [[[0, -1], [0, 1]], [[-1, -0.2], [0, -1], [1, -0.2]], [[-0.6, 0.6], [0.6, 0.6]]],
  [[[-1, -1], [1, 1]], [[1, -1], [-1, 1]], [[-1, 0], [1, 0]]],
  [[[-1, 0], [0, -1], [1, 0], [0, 1], [-1, 0]], [[0, -0.45], [0, 0.45]]],
  [[[-1, -1], [-1, 1], [1, 1]], [[0, -1], [0, 0.3]], [[1, -1], [1, -0.2]]],
];

function drawRune(
  ctx: CanvasRenderingContext2D,
  idx: number,
  x: number,
  y: number,
  s: number,
  color: string,
  alpha: number
) {
  const rune = RUNES[idx % RUNES.length];
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const pass of [0, 1]) {
    ctx.globalAlpha = alpha * (pass === 0 ? 0.45 : 1);
    ctx.strokeStyle = pass === 0 ? color : '#ffffff';
    ctx.lineWidth = pass === 0 ? 3 : 1;
    for (const line of rune) {
      ctx.beginPath();
      line.forEach(([px, py], i) => {
        if (i === 0) ctx.moveTo(x + px * s, y + py * s);
        else ctx.lineTo(x + px * s, y + py * s);
      });
      ctx.stroke();
    }
  }
  ctx.restore();
}

// ============================================================================
// VERTICAL LASER SIGHT
// ============================================================================
export function drawVerticalLaserSight(
  ctx: CanvasRenderingContext2D,
  x: number,
  muzzleY: number,
  targetBottomY: number,
  theme: WeaponTheme,
  time: number,
  overdrivePrimed: boolean
) {
  if (muzzleY <= targetBottomY + 8) return;

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const baseAlpha = overdrivePrimed ? 0.75 : 0.32;

  // Wide soft beam
  const wide = ctx.createLinearGradient(x - 10, 0, x + 10, 0);
  wide.addColorStop(0, `${theme.laserSightRgba}0)`);
  wide.addColorStop(0.5, `${theme.laserSightRgba}${baseAlpha * 0.35})`);
  wide.addColorStop(1, `${theme.laserSightRgba}0)`);
  ctx.fillStyle = wide;
  ctx.fillRect(x - 10, targetBottomY, 20, muzzleY - targetBottomY);

  const grad = ctx.createLinearGradient(x, muzzleY, x, targetBottomY);
  grad.addColorStop(0, `${theme.laserSightRgba}${baseAlpha})`);
  grad.addColorStop(0.6, `${theme.laserSightRgba}${baseAlpha * 0.45})`);
  grad.addColorStop(1, `${theme.laserSightRgba}${baseAlpha})`);
  ctx.strokeStyle = theme.kind === 'rainbow' ? `hsl(${(time * 140) % 360}, 100%, 70%)` : grad;
  ctx.lineWidth = overdrivePrimed ? 4 : 1.8;
  ctx.beginPath();
  ctx.moveTo(x, muzzleY);
  ctx.lineTo(x, targetBottomY);
  ctx.stroke();

  // Energy pulses travelling up the beam
  const span = muzzleY - targetBottomY;
  for (let i = 0; i < 4; i++) {
    const t = ((time * (overdrivePrimed ? 1.6 : 0.9) + i / 4) % 1);
    const py = muzzleY - t * span;
    ctx.globalAlpha = Math.sin(t * Math.PI) * (overdrivePrimed ? 1 : 0.7);
    ctx.fillStyle = theme.plasmaCore;
    ctx.beginPath();
    ctx.ellipse(x, py, overdrivePrimed ? 3 : 2, overdrivePrimed ? 10 : 6, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Impact reticle on the wheel
  ctx.globalAlpha = 0.95;
  const pulse = 0.78 + 0.22 * Math.sin(time * 12);
  const rg = ctx.createRadialGradient(x, targetBottomY + 2, 0, x, targetBottomY + 2, 14 * pulse);
  rg.addColorStop(0, '#ffffff');
  rg.addColorStop(0.35, theme.plasmaMid);
  rg.addColorStop(1, `${theme.plasmaGlowRgba}0)`);
  ctx.fillStyle = rg;
  ctx.beginPath();
  ctx.arc(x, targetBottomY + 2, 14 * pulse, 0, Math.PI * 2);
  ctx.fill();

  // Rotating bracket reticle
  ctx.save();
  ctx.translate(x, targetBottomY + 2);
  ctx.rotate(time * 2.4);
  ctx.strokeStyle = theme.plasmaMid;
  ctx.lineWidth = 1.6;
  for (let k = 0; k < 4; k++) {
    ctx.rotate(Math.PI / 2);
    ctx.beginPath();
    ctx.arc(0, 0, 11, -0.35, 0.35);
    ctx.stroke();
  }
  ctx.restore();

  ctx.restore();
}

// ============================================================================
// ORBITAL ENERGY RING (pseudo-3D ellipse with back & front halves)
// ============================================================================
function drawOrbitRing(
  ctx: CanvasRenderingContext2D,
  cy: number,
  rx: number,
  ry: number,
  theme: WeaponTheme,
  time: number,
  idx: number,
  half: 'back' | 'front',
  intensity: number
) {
  const start = half === 'back' ? Math.PI : 0;
  const end = half === 'back' ? Math.PI * 2 : Math.PI;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const a = Math.min(1, intensity) * (half === 'back' ? 0.35 : 1);

  ctx.globalAlpha = a * 0.55;
  ctx.strokeStyle = theme.plasmaMid;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.ellipse(0, cy, rx, ry, 0, start, end);
  ctx.stroke();

  ctx.globalAlpha = a;
  ctx.strokeStyle = theme.plasmaCore;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.ellipse(0, cy, rx, ry, 0, start, end);
  ctx.stroke();

  // Orbiting energy nodes
  for (let k = 0; k < 3; k++) {
    const ang = time * (3.5 + idx * 1.3) * (idx % 2 === 0 ? 1 : -1) + k * 2.094;
    const s = Math.sin(ang);
    const inFront = s > 0;
    if (inFront !== (half === 'front')) continue;
    const nx = Math.cos(ang) * rx;
    const ny = cy + s * ry;
    const g = ctx.createRadialGradient(nx, ny, 0, nx, ny, 7);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.4, theme.plasmaMid);
    g.addColorStop(1, `${theme.plasmaGlowRgba}0)`);
    ctx.globalAlpha = a;
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(nx, ny, 7, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/**
 * Renders the ultra-detailed 2D DOOM OBLITERATOR pointing straight UP.
 * Muzzle tip at ~ y - 118 * scale.
 */
export function drawObliteratorGun(ctx: CanvasRenderingContext2D, p: GunRenderParams) {
  const {
    x,
    y,
    scale,
    time,
    recoil,
    muzzleFlash,
    heat,
    ammoLeft,
    ammoTotal,
    overdrivePrimed,
    theme,
    charge = 1,
  } = p;

  if (theme.kind && theme.kind !== 'obliterator') {
    drawSideGun(ctx, p);
    return;
  }

  const flick = Math.floor(time * 26);
  const energy = Math.min(1.5, 0.45 + charge * 0.55 + recoil * 0.7 + (overdrivePrimed ? 0.45 : 0));

  ctx.save();
  ctx.translate(x, y + recoil * 15 * scale);
  ctx.scale(scale, scale);

  const barrelSlide = recoil * 14;
  const prongSlide = recoil * 9;
  const prongFlare = recoil * 6 + (overdrivePrimed ? Math.sin(time * 18) * 1.8 : 0);

  // ==========================================================================
  // 1. ADDITIVE REACTOR AURA + ROTATING GOD RAYS
  // ==========================================================================
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const auraR = overdrivePrimed ? 150 : 115;
  const aura = ctx.createRadialGradient(0, -20, 8, 0, -20, auraR);
  aura.addColorStop(0, `${theme.plasmaGlowRgba}${0.3 * energy})`);
  aura.addColorStop(0.5, `${theme.plasmaGlowRgba}${0.08 * energy})`);
  aura.addColorStop(1, `${theme.plasmaGlowRgba}0)`);
  ctx.fillStyle = aura;
  ctx.beginPath();
  ctx.arc(0, -20, auraR, 0, Math.PI * 2);
  ctx.fill();

  for (let r = 0; r < 10; r++) {
    const a = (r / 10) * Math.PI * 2 + time * 0.4;
    const spread = 0.07 + 0.03 * Math.sin(time * 3 + r);
    const len = 175 + Math.sin(time * 2.2 + r * 1.7) * 30;
    const g = ctx.createRadialGradient(0, 2, 12, 0, 2, len);
    g.addColorStop(0, `${theme.plasmaGlowRgba}${0.14 * energy})`);
    g.addColorStop(1, `${theme.plasmaGlowRgba}0)`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, 2);
    ctx.arc(0, 2, len, a - spread, a + spread);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  // Orbit ring geometry (launch upward + expand on recoil!)
  const rings = [0, 1, 2].map((i) => ({
    cy: -50 - i * 22 - recoil * (16 + i * 14),
    rx: 30 - i * 2 + recoil * (10 + i * 6) + Math.sin(time * 4 + i) * 1.2,
    ry: 6.5 - i * 0.6 + recoil * 2,
  }));
  const ringIntensity = 0.35 + charge * 0.5 + recoil * 0.8 + (overdrivePrimed ? 0.5 : 0);

  // ==========================================================================
  // 2. BACK HALVES OF ORBITAL RINGS
  // ==========================================================================
  rings.forEach((r, i) => drawOrbitRing(ctx, r.cy, r.rx, r.ry, theme, time, i, 'back', ringIntensity));

  // ==========================================================================
  // 3. PRAETOR GAUNTLETS ON TWIN GRIPS
  // ==========================================================================
  for (const side of [-1, 1]) {
    ctx.save();
    ctx.scale(side, 1);

    ctx.fillStyle = '#181a1f';
    ctx.strokeStyle = theme.armorHighlight;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(15, 48);
    ctx.lineTo(36, 56);
    ctx.lineTo(44, 82);
    ctx.lineTo(22, 82);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    const gloveGrad = ctx.createLinearGradient(18, 54, 48, 88);
    gloveGrad.addColorStop(0, '#56634f');
    gloveGrad.addColorStop(0.55, '#2b332a');
    gloveGrad.addColorStop(1, '#121512');
    ctx.fillStyle = gloveGrad;
    ctx.strokeStyle = '#08090b';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(18, 58);
    ctx.lineTo(43, 62);
    ctx.lineTo(50, 76);
    ctx.lineTo(46, 88);
    ctx.lineTo(19, 86);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Armored knuckle plates
    for (let k = 0; k < 3; k++) {
      const kg = ctx.createLinearGradient(0, 63, 0, 70);
      kg.addColorStop(0, '#fde68a');
      kg.addColorStop(1, theme.trimMetal);
      ctx.fillStyle = kg;
      ctx.beginPath();
      ctx.roundRect(23 + k * 7, 63 + k * 1.5, 5, 6, 1.5);
      ctx.fill();
    }
    // Wrist glow strip
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.6 + 0.3 * Math.sin(time * 5);
    ctx.fillStyle = theme.plasmaMid;
    ctx.fillRect(22, 79, 20, 2);
    ctx.restore();

    ctx.restore();
  }

  // ==========================================================================
  // 4. CURVED RIBBED PLASMA HOSES WITH PUMPING ENERGY
  // ==========================================================================
  for (const side of [-1, 1]) {
    ctx.save();
    ctx.scale(side, 1);
    const hy = -62 + barrelSlide * 0.4;
    const hosePath = () => {
      ctx.beginPath();
      ctx.moveTo(46, 8);
      ctx.bezierCurveTo(66, -10, 64, -50, 22, hy);
    };

    ctx.lineCap = 'round';
    ctx.strokeStyle = '#08090c';
    ctx.lineWidth = 12;
    hosePath();
    ctx.stroke();

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const hoseGrad = ctx.createLinearGradient(58, 8, 24, -62);
    hoseGrad.addColorStop(0, theme.plasmaOuter);
    hoseGrad.addColorStop(0.5, theme.plasmaMid);
    hoseGrad.addColorStop(1, theme.plasmaCore);
    ctx.strokeStyle = hoseGrad;
    ctx.lineWidth = 6.5;
    hosePath();
    ctx.stroke();

    // Travelling bright energy packets
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.setLineDash([6, 22]);
    ctx.lineDashOffset = -time * (overdrivePrimed ? 120 : 70);
    hosePath();
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    ctx.lineCap = 'butt';
    ctx.strokeStyle = '#15171a';
    ctx.lineWidth = 9;
    ctx.setLineDash([2.6, 7.6]);
    ctx.lineDashOffset = 0;
    hosePath();
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = theme.trimMetal;
    ctx.fillRect(19, hy - 5, 7, 10);
    ctx.fillStyle = '#fff3';
    ctx.fillRect(19, hy - 5, 7, 2);
    ctx.restore();
  }

  // ==========================================================================
  // 5. CENTRAL HEAVY BARREL + MUZZLE BRAKE CROWN
  // ==========================================================================
  ctx.save();
  ctx.translate(0, barrelSlide);

  const barrelGrad = ctx.createLinearGradient(-22, 0, 22, 0);
  barrelGrad.addColorStop(0, theme.armorDark);
  barrelGrad.addColorStop(0.2, theme.armorSecondary);
  barrelGrad.addColorStop(0.36, theme.armorHighlight);
  barrelGrad.addColorStop(0.6, theme.armorPrimary);
  barrelGrad.addColorStop(0.85, theme.armorSecondary);
  barrelGrad.addColorStop(1, theme.armorDark);

  const barrelPath = () => {
    ctx.beginPath();
    ctx.moveTo(-14, -102);
    ctx.lineTo(14, -102);
    ctx.lineTo(18, -88);
    ctx.lineTo(18, -56);
    ctx.lineTo(22, -48);
    ctx.lineTo(22, -26);
    ctx.lineTo(-22, -26);
    ctx.lineTo(-22, -48);
    ctx.lineTo(-18, -56);
    ctx.lineTo(-18, -88);
    ctx.closePath();
  };
  const crownPath = () => {
    ctx.beginPath();
    ctx.moveTo(-20, -119);
    ctx.lineTo(-8, -119);
    ctx.lineTo(-6, -111);
    ctx.lineTo(6, -111);
    ctx.lineTo(8, -119);
    ctx.lineTo(20, -119);
    ctx.lineTo(24, -109);
    ctx.lineTo(17, -98);
    ctx.lineTo(-17, -98);
    ctx.lineTo(-24, -109);
    ctx.closePath();
  };

  ctx.fillStyle = barrelGrad;
  ctx.strokeStyle = '#08090c';
  ctx.lineWidth = 1.8;
  barrelPath();
  ctx.fill();
  ctx.stroke();
  crownPath();
  ctx.fill();
  ctx.stroke();

  // Heavy metal collars
  for (const cy of [-92, -66, -40]) {
    const cg = ctx.createLinearGradient(-21, 0, 21, 0);
    cg.addColorStop(0, '#2a2a2e');
    cg.addColorStop(0.35, '#fef3c7');
    cg.addColorStop(0.5, theme.trimMetal);
    cg.addColorStop(1, '#3a2a10');
    ctx.fillStyle = cg;
    const w = cy < -56 ? 20 : 24;
    ctx.fillRect(-w, cy, w * 2, 4);
  }

  // Brake exhaust slots
  for (const side of [-1, 1]) {
    ctx.fillStyle = '#07080a';
    ctx.fillRect(side * 18 - 3, -115, 6, 5);
    ctx.fillRect(side * 17 - 3, -107, 6, 4.5);
  }

  // Central open rail slot
  ctx.fillStyle = '#06070a';
  ctx.fillRect(-6.5, -113, 13, 85);

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const coreRail = ctx.createLinearGradient(-5, 0, 5, 0);
  coreRail.addColorStop(0, theme.plasmaOuter);
  coreRail.addColorStop(0.5, theme.plasmaCore);
  coreRail.addColorStop(1, theme.plasmaOuter);
  ctx.fillStyle = coreRail;
  ctx.globalAlpha = 0.6 + 0.4 * Math.min(1, energy);
  ctx.fillRect(-3.8, -113, 7.6, 83);

  // Accelerator coil pulses running UP
  for (let c = 0; c < 8; c++) {
    const cy = -34 - c * 10;
    const wave = Math.sin(time * (overdrivePrimed ? 26 : 15) - c * 0.85);
    ctx.globalAlpha = (0.35 + 0.65 * Math.max(0, wave)) * Math.min(1, energy);
    ctx.fillStyle = wave > 0.2 ? '#ffffff' : theme.plasmaMid;
    ctx.fillRect(-11, cy, 22, 2.6);
  }

  // Brake slot glow
  ctx.globalAlpha = 0.5 + recoil * 0.5;
  ctx.fillStyle = theme.plasmaMid;
  for (const side of [-1, 1]) {
    ctx.fillRect(side * 16 - 2, -114, 4, 3);
    ctx.fillRect(side * 15 - 2, -106, 4, 2.5);
  }

  // HEAT: barrel glows molten orange-white after rapid fire
  if (heat > 0.05) {
    const hg = ctx.createLinearGradient(0, -119, 0, -30);
    hg.addColorStop(0, `rgba(255, 220, 160, ${heat * 0.7})`);
    hg.addColorStop(0.4, `rgba(251, 120, 40, ${heat * 0.45})`);
    hg.addColorStop(1, 'rgba(200, 40, 0, 0)');
    ctx.globalAlpha = 1;
    ctx.fillStyle = hg;
    crownPath();
    ctx.fill();
    barrelPath();
    ctx.fill();
  }
  ctx.restore();

  // Bevel highlights
  ctx.strokeStyle = theme.armorHighlight;
  ctx.globalAlpha = 0.8;
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.moveTo(-13, -100);
  ctx.lineTo(-13, -30);
  ctx.moveTo(13, -100);
  ctx.lineTo(13, -30);
  ctx.moveTo(-19, -117);
  ctx.lineTo(-9, -117);
  ctx.moveTo(9, -117);
  ctx.lineTo(19, -117);
  ctx.stroke();
  ctx.globalAlpha = 1;

  // Muzzle jaw arc
  strokeLightning(ctx, -9, -116, 9, -116, theme.plasmaMid, 1.3, 5, 4, flick, 0.6 + 0.4 * Math.min(1, energy));

  ctx.restore();

  // ==========================================================================
  // 6. HYDRAULIC SHAFTS + OUTER TUNING-FORK SIEGE PODS
  // ==========================================================================
  for (const side of [-1, 1]) {
    ctx.save();
    ctx.scale(side, 1);

    const chrome = ctx.createLinearGradient(25, 0, 35, 0);
    chrome.addColorStop(0, '#4b4b52');
    chrome.addColorStop(0.5, '#ffffff');
    chrome.addColorStop(1, '#232327');
    ctx.fillStyle = chrome;
    ctx.fillRect(26, -34, 8, 34 + prongSlide);

    ctx.translate(prongFlare * 0.5, prongSlide);

    const podGrad = ctx.createLinearGradient(28, -96, 62, 40);
    podGrad.addColorStop(0, theme.armorHighlight);
    podGrad.addColorStop(0.3, theme.armorPrimary);
    podGrad.addColorStop(0.78, theme.armorSecondary);
    podGrad.addColorStop(1, theme.armorDark);

    ctx.fillStyle = podGrad;
    ctx.strokeStyle = '#08090c';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(31, -98);
    ctx.lineTo(42, -86);
    ctx.lineTo(43, -44);
    ctx.lineTo(58, -26);
    ctx.lineTo(62, 16);
    ctx.lineTo(50, 40);
    ctx.lineTo(29, 44);
    ctx.lineTo(27, -28);
    ctx.lineTo(31, -48);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Armor panel seams
    ctx.strokeStyle = 'rgba(0,0,0,0.55)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(29, -30);
    ctx.lineTo(56, -24);
    ctx.moveTo(30, 20);
    ctx.lineTo(61, 18);
    ctx.stroke();

    ctx.strokeStyle = theme.armorHighlight;
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(33, -94);
    ctx.lineTo(40, -85);
    ctx.lineTo(41, -42);
    ctx.lineTo(55, -24);
    ctx.lineTo(58, 14);
    ctx.stroke();

    // Glowing inner blade
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const bladeG = ctx.createLinearGradient(30, -96, 30, -52);
    bladeG.addColorStop(0, '#ffffff');
    bladeG.addColorStop(0.3, theme.spikeBlade);
    bladeG.addColorStop(1, theme.plasmaOuter);
    ctx.fillStyle = bladeG;
    ctx.globalAlpha = 0.7 + 0.3 * Math.min(1, energy);
    ctx.beginPath();
    ctx.moveTo(30.5, -96);
    ctx.lineTo(35, -90);
    ctx.lineTo(35, -52);
    ctx.lineTo(30.5, -56);
    ctx.closePath();
    ctx.fill();
    // blade bloom
    const bb = ctx.createRadialGradient(32, -94, 0, 32, -94, 16);
    bb.addColorStop(0, theme.plasmaCore);
    bb.addColorStop(0.4, `${theme.plasmaGlowRgba}0.6)`);
    bb.addColorStop(1, `${theme.plasmaGlowRgba}0)`);
    ctx.fillStyle = bb;
    ctx.beginPath();
    ctx.arc(32, -94, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Circuit trace with flowing energy
    ctx.save();
    ctx.strokeStyle = '#07080a';
    ctx.lineWidth = 2.6;
    const trace = () => {
      ctx.beginPath();
      ctx.moveTo(38.5, -80);
      ctx.lineTo(38.5, -48);
      ctx.lineTo(50, -34);
      ctx.lineTo(57, -6);
    };
    trace();
    ctx.stroke();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = theme.plasmaMid;
    ctx.lineWidth = 1.2;
    ctx.globalAlpha = 0.5;
    trace();
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = '#ffffff';
    ctx.setLineDash([3, 12]);
    ctx.lineDashOffset = time * 40;
    trace();
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    // Rune glyph
    drawRune(
      ctx,
      side > 0 ? 1 : 3,
      49,
      2,
      3.2,
      theme.plasmaMid,
      0.55 + 0.45 * Math.sin(time * 3 + side)
    );

    // Heat-sink louvers
    for (let v = 0; v < 3; v++) {
      const vy = -18 + v * 7;
      ctx.fillStyle = '#08090c';
      ctx.beginPath();
      ctx.moveTo(33, vy);
      ctx.lineTo(44, vy + 2.5);
      ctx.lineTo(44, vy + 5.5);
      ctx.lineTo(33, vy + 3);
      ctx.closePath();
      ctx.fill();
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = Math.min(1, 0.4 + heat * 0.6 + recoil * 0.4);
      ctx.fillStyle = heat > 0.55 ? '#fb923c' : theme.plasmaMid;
      ctx.fillRect(34, vy + 1.2, 9, 1.6);
      ctx.restore();
    }

    // Hazard stripes
    ctx.save();
    ctx.beginPath();
    ctx.rect(33, 26, 19, 10);
    ctx.clip();
    ctx.fillStyle = '#eab308';
    ctx.fillRect(33, 26, 19, 10);
    ctx.fillStyle = '#18181b';
    for (let h = -2; h < 6; h++) {
      ctx.beginPath();
      ctx.moveTo(30 + h * 7, 26);
      ctx.lineTo(34 + h * 7, 26);
      ctx.lineTo(30 + h * 7, 36);
      ctx.lineTo(26 + h * 7, 36);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
    ctx.strokeStyle = '#08090c';
    ctx.lineWidth = 1.2;
    ctx.strokeRect(33, 26, 19, 10);

    // Hex bolts
    for (const [bx, by] of [
      [36, -40],
      [54, -20],
      [58, 10],
      [46, 39],
    ]) {
      ctx.fillStyle = '#121214';
      ctx.beginPath();
      ctx.arc(bx, by, 2.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = theme.armorHighlight;
      ctx.beginPath();
      ctx.arc(bx - 0.6, by - 0.6, 1, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  // ==========================================================================
  // 7. RECEIVER + REACTOR WITH SPINNING TURBINE
  // ==========================================================================
  const recGrad = ctx.createLinearGradient(-32, 0, 32, 0);
  recGrad.addColorStop(0, theme.armorDark);
  recGrad.addColorStop(0.18, theme.armorSecondary);
  recGrad.addColorStop(0.45, theme.armorPrimary);
  recGrad.addColorStop(0.55, theme.armorHighlight);
  recGrad.addColorStop(0.82, theme.armorSecondary);
  recGrad.addColorStop(1, theme.armorDark);

  ctx.fillStyle = recGrad;
  ctx.strokeStyle = '#08090c';
  ctx.lineWidth = 2;
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
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = theme.armorHighlight;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-29, 46);
  ctx.lineTo(-29, -15);
  ctx.lineTo(-20, -31);
  ctx.lineTo(20, -31);
  ctx.lineTo(29, -15);
  ctx.lineTo(29, 46);
  ctx.stroke();

  // Reactor bezel (gold)
  const bezelG = ctx.createLinearGradient(-22, -22, 22, 26);
  bezelG.addColorStop(0, '#fef3c7');
  bezelG.addColorStop(0.4, theme.trimMetal);
  bezelG.addColorStop(1, '#3d2a0c');
  ctx.fillStyle = '#060709';
  ctx.strokeStyle = bezelG;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(-21, -21, 42, 46, 10);
  ctx.fill();
  ctx.stroke();

  // Copper coils
  for (const side of [-1, 1]) {
    for (let c = 0; c < 5; c++) {
      const cy = -15 + c * 8;
      ctx.fillStyle = theme.trimMetal;
      ctx.fillRect(side * 21 - 4, cy, 8, 5);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const lit = Math.sin(time * 10 - c * 1.2) > 0.3;
      ctx.globalAlpha = lit ? 0.9 : 0.35;
      ctx.fillStyle = lit ? theme.plasmaMid : '#fef08a';
      ctx.fillRect(side * 21 - 2.5, cy + 1.5, 5, 1.8);
      ctx.restore();
    }
  }

  ctx.save();
  ctx.beginPath();
  ctx.roundRect(-18.5, -18.5, 37, 41, 8);
  ctx.clip();

  const coreY = 2;
  // Backlight inside chamber
  const back = ctx.createRadialGradient(0, coreY, 0, 0, coreY, 26);
  back.addColorStop(0, theme.plasmaOuter);
  back.addColorStop(1, '#050608');
  ctx.fillStyle = back;
  ctx.fillRect(-20, -20, 40, 44);

  // Spinning turbine blades
  ctx.save();
  ctx.translate(0, coreY);
  ctx.rotate(time * (4 + recoil * 30 + (overdrivePrimed ? 10 : 0)));
  for (let b = 0; b < 7; b++) {
    ctx.rotate((Math.PI * 2) / 7);
    ctx.fillStyle = theme.armorDark;
    ctx.strokeStyle = theme.plasmaMid;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(3, -2);
    ctx.quadraticCurveTo(13, -11, 21, -4);
    ctx.lineTo(19, 2);
    ctx.quadraticCurveTo(11, -3, 3, 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();

  // Plasma orb (additive)
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const orbPulse = 1 + 0.14 * Math.sin(time * 9) + recoil * 0.35 + (overdrivePrimed ? 0.15 : 0);
  const orbR = 13 * orbPulse * (0.7 + 0.3 * charge);
  const orbGrad = ctx.createRadialGradient(0, coreY, 0, 0, coreY, orbR * 1.7);
  orbGrad.addColorStop(0, '#ffffff');
  orbGrad.addColorStop(0.25, theme.plasmaCore);
  orbGrad.addColorStop(0.5, theme.plasmaMid);
  orbGrad.addColorStop(1, `${theme.plasmaGlowRgba}0)`);
  ctx.fillStyle = orbGrad;
  ctx.beginPath();
  ctx.arc(0, coreY, orbR * 1.7, 0, Math.PI * 2);
  ctx.fill();

  // Counter-rotating containment rings
  ctx.strokeStyle = theme.plasmaCore;
  ctx.lineWidth = 1.3;
  for (let r = 0; r < 3; r++) {
    ctx.save();
    ctx.translate(0, coreY);
    ctx.rotate(time * (r % 2 === 0 ? 3.6 : -2.8) + r * 1.4);
    ctx.scale(1, 0.45 + r * 0.2);
    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    ctx.arc(0, 0, 9 + r * 3.5, 0, Math.PI * 1.3);
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();

  // Lightning filaments from orb to coils
  for (let a = 0; a < 3; a++) {
    const ang = time * 5.5 + a * 2.1;
    strokeLightning(
      ctx,
      0,
      coreY,
      Math.cos(ang) * 20,
      coreY + Math.sin(ang) * 20,
      theme.plasmaMid,
      0.9,
      4,
      4,
      flick + a * 13,
      0.85
    );
  }

  // Glass shine
  ctx.globalAlpha = 0.22;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(-17, -19);
  ctx.lineTo(-5, -19);
  ctx.lineTo(-12, 23);
  ctx.lineTo(-17, 23);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.restore();

  // Reactor cage bars
  ctx.fillStyle = theme.armorSecondary;
  ctx.fillRect(-21, 0, 6, 3);
  ctx.fillRect(15, 0, 6, 3);

  // ==========================================================================
  // 8. AMMO CAPACITOR SPINE
  // ==========================================================================
  const displayPips = Math.min(12, Math.max(1, ammoTotal));
  const activePips = Math.round((ammoLeft / Math.max(1, ammoTotal)) * displayPips);
  const spineStartY = 30;
  const spineHeight = 28;
  const pipStep = spineHeight / displayPips;

  ctx.fillStyle = '#07080b';
  ctx.strokeStyle = '#2a2a30';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(-10.5, spineStartY - 2, 21, spineHeight + 4, 4);
  ctx.fill();
  ctx.stroke();

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < displayPips; i++) {
    const isLit = displayPips - 1 - i < activePips;
    const py = spineStartY + i * pipStep;
    const hh = Math.max(1.8, pipStep - 1.3);
    if (isLit) {
      ctx.globalAlpha = 0.85 + 0.15 * Math.sin(time * 8 + i);
      ctx.fillStyle = overdrivePrimed ? '#ffffff' : theme.plasmaMid;
    } else {
      ctx.globalAlpha = 0.25;
      ctx.fillStyle = '#3f3f46';
    }
    ctx.fillRect(-7.5, py, 15, hh);
  }
  ctx.restore();

  // Rear rune emblem
  drawRune(ctx, 0, 0, -27, 3, theme.plasmaMid, 0.5 + 0.5 * Math.min(1, energy));

  // ==========================================================================
  // 9. FRONT HALVES OF ORBITAL RINGS
  // ==========================================================================
  rings.forEach((r, i) => drawOrbitRing(ctx, r.cy, r.rx, r.ry, theme, time, i, 'front', ringIntensity));

  // ==========================================================================
  // 10. PRONG-TIP → MUZZLE ENERGY TENDRILS
  // ==========================================================================
  const tendrilAlpha = Math.min(1, 0.25 + charge * 0.45 + recoil * 0.6 + (overdrivePrimed ? 0.5 : 0));
  if (pseudoRandom(flick) < 0.75 || overdrivePrimed) {
    for (const side of [-1, 1]) {
      const tx = side * (32 + prongFlare * 0.5);
      const ty = -96 + prongSlide;
      strokeLightning(
        ctx,
        tx,
        ty,
        side * 8,
        -114 + barrelSlide,
        theme.plasmaMid,
        overdrivePrimed ? 1.6 : 1.1,
        6,
        overdrivePrimed ? 7 : 5,
        flick * 3 + side * 17,
        tendrilAlpha
      );
    }
  }

  // ==========================================================================
  // 11. MUZZLE TARGETING HALO (rotating dashed ellipse)
  // ==========================================================================
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.translate(0, -126 + barrelSlide - recoil * 10);
  ctx.globalAlpha = Math.min(1, 0.25 + charge * 0.5 + (overdrivePrimed ? 0.4 : 0));
  ctx.strokeStyle = theme.plasmaMid;
  ctx.lineWidth = 1.6;
  ctx.setLineDash([5, 6]);
  ctx.lineDashOffset = -time * 30;
  ctx.beginPath();
  ctx.ellipse(0, 0, 26 + recoil * 16, 6 + recoil * 4, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.ellipse(0, -6, 14 + recoil * 10, 3.5, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // ==========================================================================
  // 12. SPECTACULAR ADDITIVE MUZZLE FLASH
  // ==========================================================================
  if (muzzleFlash > 0.01) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.translate(0, -119 + barrelSlide);
    const mf = Math.min(1, muzzleFlash * 1.3);
    const fs = 0.75 + muzzleFlash * 0.8 + (overdrivePrimed ? 0.3 : 0);
    ctx.globalAlpha = mf;
    ctx.scale(fs, fs);

    const bloom = ctx.createRadialGradient(0, -20, 0, 0, -20, 95);
    bloom.addColorStop(0, '#ffffff');
    bloom.addColorStop(0.25, theme.muzzleFlashHex);
    bloom.addColorStop(0.6, `${theme.plasmaGlowRgba}0.45)`);
    bloom.addColorStop(1, `${theme.plasmaGlowRgba}0)`);
    ctx.fillStyle = bloom;
    ctx.beginPath();
    ctx.arc(0, -20, 95, 0, Math.PI * 2);
    ctx.fill();

    // Rotating star rays
    ctx.save();
    ctx.translate(0, -16);
    ctx.rotate(time * 3 + flick * 0.4);
    for (let r = 0; r < 12; r++) {
      const len = r % 2 === 0 ? 92 : 50;
      const wdt = r % 2 === 0 ? 5 : 3;
      ctx.rotate((Math.PI * 2) / 12);
      ctx.fillStyle = r % 3 === 0 ? '#ffffff' : theme.plasmaMid;
      ctx.beginPath();
      ctx.moveTo(-wdt, 0);
      ctx.lineTo(0, -len * (0.8 + pseudoRandom(flick + r) * 0.4));
      ctx.lineTo(wdt, 0);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    // Central plasma lance
    const lance = ctx.createLinearGradient(0, -140, 0, 6);
    lance.addColorStop(0, `${theme.plasmaGlowRgba}0)`);
    lance.addColorStop(0.4, theme.plasmaMid);
    lance.addColorStop(1, '#ffffff');
    ctx.fillStyle = lance;
    ctx.beginPath();
    ctx.moveTo(0, -140);
    ctx.quadraticCurveTo(18, -50, 9, 6);
    ctx.lineTo(-9, 6);
    ctx.quadraticCurveTo(-18, -50, 0, -140);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(0, -95);
    ctx.quadraticCurveTo(6, -30, 4, 4);
    ctx.lineTo(-4, 4);
    ctx.quadraticCurveTo(-6, -30, 0, -95);
    ctx.fill();

    // Brake side jets
    for (const dir of [-1, 1]) {
      ctx.fillStyle = theme.plasmaMid;
      ctx.beginPath();
      ctx.moveTo(dir * 12, 6);
      ctx.lineTo(dir * 78, -18);
      ctx.lineTo(dir * 58, 8);
      ctx.lineTo(dir * 14, 16);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(dir * 12, 7);
      ctx.lineTo(dir * 50, -6);
      ctx.lineTo(dir * 16, 13);
      ctx.closePath();
      ctx.fill();
    }

    // Expanding hex shockwave
    const hexR = 18 + (1 - muzzleFlash) * 60;
    ctx.globalAlpha = mf * 0.9;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5 * muzzleFlash + 0.5;
    ctx.beginPath();
    for (let k = 0; k <= 6; k++) {
      const a = (k / 6) * Math.PI * 2 + Math.PI / 6;
      const px = Math.cos(a) * hexR;
      const py = -14 + Math.sin(a) * hexR * 0.45;
      if (k === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();

    ctx.restore();
  }

  ctx.restore();
}

/**
 * High-detail plasma harpoon spike pointing UP. Tip y=-35, fins y=+32.
 */
export function drawObliteratorSpike(
  ctx: CanvasRenderingContext2D,
  theme: WeaponTheme,
  options: {
    scale?: number;
    isOverdrive?: boolean;
    isPreSpawned?: boolean;
    flash?: number;
    inFlight?: boolean;
    time?: number;
  } = {}
) {
  const {
    scale = 1,
    isOverdrive = false,
    isPreSpawned = false,
    flash = 0,
    inFlight = false,
    time = 0,
  } = options;

  if (theme.kind && theme.kind !== 'obliterator' && !isPreSpawned) {
    if (isFirearm(theme.kind)) {
      drawGunBullet(ctx, theme, options);
    } else {
      drawSpecialProjectile(ctx, theme, options);
    }
    return;
  }

  ctx.save();
  ctx.scale(scale, scale);

  const bladeHex = isOverdrive ? '#ffffff' : isPreSpawned ? '#f59e0b' : theme.spikeBlade;
  const glowColor = isOverdrive ? theme.plasmaMid : isPreSpawned ? '#ea580c' : theme.plasmaMid;

  if (inFlight) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const tailLen = isOverdrive ? 160 : 95;
    const tailGrad = ctx.createLinearGradient(0, 10, 0, 10 + tailLen);
    tailGrad.addColorStop(0, '#ffffff');
    tailGrad.addColorStop(0.15, glowColor);
    tailGrad.addColorStop(0.5, `${theme.plasmaGlowRgba}0.35)`);
    tailGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = tailGrad;
    ctx.beginPath();
    ctx.moveTo(-9, 12);
    ctx.lineTo(9, 12);
    ctx.lineTo(0, 12 + tailLen + Math.sin(time * 40) * 10);
    ctx.closePath();
    ctx.fill();

    // Tip bloom
    const tb = ctx.createRadialGradient(0, -30, 0, 0, -30, 26);
    tb.addColorStop(0, '#ffffff');
    tb.addColorStop(0.35, glowColor);
    tb.addColorStop(1, `${theme.plasmaGlowRgba}0)`);
    ctx.fillStyle = tb;
    ctx.beginPath();
    ctx.arc(0, -30, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Fins
  ctx.fillStyle = isPreSpawned ? '#3f2c22' : theme.spikeBody;
  ctx.strokeStyle = '#08090c';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-4.5, 10);
  ctx.lineTo(-12, 25);
  ctx.lineTo(-8.5, 32);
  ctx.lineTo(-3, 27);
  ctx.lineTo(3, 27);
  ctx.lineTo(8.5, 32);
  ctx.lineTo(12, 25);
  ctx.lineTo(4.5, 10);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Shaft
  const shaftGrad = ctx.createLinearGradient(-6, 0, 6, 0);
  shaftGrad.addColorStop(0, '#18181b');
  shaftGrad.addColorStop(0.5, isPreSpawned ? '#78716c' : theme.armorHighlight);
  shaftGrad.addColorStop(1, '#18181b');
  ctx.fillStyle = shaftGrad;
  ctx.beginPath();
  ctx.moveTo(0, -35);
  ctx.lineTo(10, -14);
  ctx.lineTo(5, -11);
  ctx.lineTo(5.5, 28);
  ctx.lineTo(-5.5, 28);
  ctx.lineTo(-5, -11);
  ctx.lineTo(-10, -14);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Blade
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = bladeHex;
  ctx.beginPath();
  ctx.moveTo(0, -34);
  ctx.lineTo(7, -15);
  ctx.lineTo(2.4, -13);
  ctx.lineTo(2.4, 23);
  ctx.lineTo(-2.4, 23);
  ctx.lineTo(-2.4, -13);
  ctx.lineTo(-7, -15);
  ctx.closePath();
  ctx.fill();
  // Blade bloom
  ctx.globalAlpha = 0.35 + 0.15 * Math.sin(time * 10);
  const bl = ctx.createRadialGradient(0, -8, 0, 0, -8, 22);
  bl.addColorStop(0, glowColor);
  bl.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = bl;
  ctx.beginPath();
  ctx.ellipse(0, -8, 12, 30, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(0, 24, 3.2, 0, Math.PI * 2);
  ctx.fill();

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
