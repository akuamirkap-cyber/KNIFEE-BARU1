import { ArgentCell, CoreTheme, EmbeddedSpike, ShatterShard } from './types';
import { WEAPON_THEMES, drawObliteratorSpike } from './weapons';
import { crystalGrowth, drawCrystalShard } from './guns';

const NORMAL_CORES: CoreTheme[] = [
  {
    name: 'UAC FOUNDRY CORE',
    isBoss: false,
    baseColor: '#272a30',
    innerColor: '#16181d',
    rimColor: '#525866',
    glowHex: '#f97316',
    toothCount: 16,
  },
  {
    name: 'ARGENT TURBINE',
    isBoss: false,
    baseColor: '#222b26',
    innerColor: '#131a16',
    rimColor: '#4c6656',
    glowHex: '#4ade80',
    toothCount: 18,
  },
  {
    name: 'NEKRAPOL ANVIL',
    isBoss: false,
    baseColor: '#2e2225',
    innerColor: '#1a1113',
    rimColor: '#6e4951',
    glowHex: '#f43f5e',
    toothCount: 14,
  },
  {
    name: 'SENTINEL GYRO',
    isBoss: false,
    baseColor: '#2b2b27',
    innerColor: '#181815',
    rimColor: '#8c7e56',
    glowHex: '#eab308',
    toothCount: 20,
  },
];

const BOSS_CORES: CoreTheme[] = [
  {
    name: 'CYBER-TYRANT NEXUS',
    isBoss: true,
    baseColor: '#2b181b',
    innerColor: '#12080a',
    rimColor: '#dc2626',
    glowHex: '#ff2e4c',
    toothCount: 24,
  },
  {
    name: 'ICON OF SIN REACTOR',
    isBoss: true,
    baseColor: '#1e192b',
    innerColor: '#0e0b17',
    rimColor: '#9333ea',
    glowHex: '#c084fc',
    toothCount: 22,
  },
  {
    name: 'BFG OVERMIND ORB',
    isBoss: true,
    baseColor: '#14261c',
    innerColor: '#09140e',
    rimColor: '#22c55e',
    glowHex: '#86efac',
    toothCount: 26,
  },
  {
    name: 'KHAN MAYKR MATRIX',
    isBoss: true,
    baseColor: '#363228',
    innerColor: '#1c1913',
    rimColor: '#facc15',
    glowHex: '#38bdf8',
    toothCount: 28,
  },
];

// ============================================================================
// SPECIAL WHEEL VARIANTS (Knife-Hit style challenge wheels)
// ============================================================================
export type TargetVariant = 'normal' | 'boss' | 'pulse' | 'drift' | 'mines' | 'whirl' | 'orbiter' | 'duo';

export function pickTargetVariant(stage: number): TargetVariant {
  if (stage % 5 === 0) return 'boss';
  if (stage === 1) return 'normal';
  const m = (stage - 2) % 6;
  return (['pulse', 'drift', 'mines', 'whirl', 'orbiter', 'duo'] as TargetVariant[])[m];
}

export const VARIANT_CORES: Record<'pulse' | 'drift' | 'mines' | 'whirl' | 'orbiter' | 'duo', CoreTheme> = {
  pulse: { name: 'PULSAR CORE', isBoss: false, baseColor: '#17313a', innerColor: '#0d1e25', rimColor: '#2b8a9e', glowHex: '#22d3ee', glowRgba: 'rgba(34, 211, 238, ', toothCount: 18 },
  drift: { name: 'DRIFTER CORE', isBoss: false, baseColor: '#2e2917', innerColor: '#1c1910', rimColor: '#8a7a35', glowHex: '#facc15', glowRgba: 'rgba(250, 204, 21, ', toothCount: 16 },
  mines: { name: 'MINEFIELD CORE', isBoss: false, baseColor: '#2f1818', innerColor: '#1c0f0f', rimColor: '#a13333', glowHex: '#f87171', glowRgba: 'rgba(248, 113, 113, ', toothCount: 14 },
  whirl: { name: 'WHIRLPOOL CORE', isBoss: false, baseColor: '#152a1d', innerColor: '#0d1a12', rimColor: '#3f9163', glowHex: '#86efac', glowRgba: 'rgba(134, 239, 172, ', toothCount: 20 },
  orbiter: { name: 'ORBITER CORE', isBoss: false, baseColor: '#241d38', innerColor: '#150f26', rimColor: '#7c6ab8', glowHex: '#c4b5fd', glowRgba: 'rgba(196, 181, 253, ', toothCount: 18 },
  duo: { name: 'DUO-RING CORE', isBoss: false, baseColor: '#2e1c28', innerColor: '#1a1017', rimColor: '#b84c84', glowHex: '#f9a8d4', glowRgba: 'rgba(249, 168, 212, ', toothCount: 22 },
};

/** Spiked warning mine orbiting around the wheel — deflects your bolt! */
export function drawMine(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, time: number, seed: number) {
  ctx.save();
  ctx.translate(x, y);
  // Warning glow
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(0, 0, 1, 0, 0, r * 2.4);
  g.addColorStop(0, 'rgba(248,113,113,0.8)');
  g.addColorStop(0.5, 'rgba(239,68,68,0.25)');
  g.addColorStop(1, 'rgba(239,68,68,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, r * 2.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalCompositeOperation = 'source-over';
  // Spikes
  ctx.save();
  ctx.rotate(time * 2.2 + seed);
  ctx.fillStyle = '#3f3f46';
  ctx.strokeStyle = '#18181b';
  ctx.lineWidth = 1;
  for (let i = 0; i < 8; i++) {
    ctx.rotate(Math.PI / 4);
    ctx.beginPath();
    ctx.moveTo(-2.2, -r * 0.7);
    ctx.lineTo(0, -r * 1.5);
    ctx.lineTo(2.2, -r * 0.7);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
  // Body
  const bg = ctx.createRadialGradient(-r * 0.3, -r * 0.3, 1, 0, 0, r);
  bg.addColorStop(0, '#71717a');
  bg.addColorStop(0.6, '#3f3f46');
  bg.addColorStop(1, '#18181b');
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#18181b';
  ctx.lineWidth = 1.4;
  ctx.stroke();
  // Hazard stripes band
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.72, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = '#facc15';
  ctx.fillRect(-r, -r * 0.3, r * 2, r * 0.6);
  ctx.fillStyle = '#18181b';
  for (let k = -3; k < 4; k++) {
    ctx.beginPath();
    ctx.moveTo(k * r * 0.33 - r * 0.1, -r * 0.3);
    ctx.lineTo(k * r * 0.33 + r * 0.08, -r * 0.3);
    ctx.lineTo(k * r * 0.33 - r * 0.02, r * 0.3);
    ctx.lineTo(k * r * 0.33 - r * 0.22, r * 0.3);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
  // Pulsing warning eye
  const blink = 0.6 + 0.4 * Math.sin(time * 8 + seed);
  ctx.fillStyle = '#ef4444';
  ctx.shadowColor = '#ef4444';
  ctx.shadowBlur = 10 * blink;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#fecaca';
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.12, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function getCoreThemeForStage(stage: number): CoreTheme {
  if (stage % 5 === 0) {
    const bossIdx = (Math.floor(stage / 5) - 1) % BOSS_CORES.length;
    return BOSS_CORES[bossIdx];
  }
  return NORMAL_CORES[(stage - 1) % NORMAL_CORES.length];
}

/**
 * Computes angular velocity (rad/s) for any stage and elapsed wave time,
 * crafting true Knife-Hit rhythmic tension: smooth reversals, pauses, bursts!
 */
export function computeTargetAngularVelocity(stage: number, waveTime: number): number {
  const baseSpeed = Math.min(3.35, 1.55 + stage * 0.085);

  if (stage === 1) {
    // Stage 1: pure confident clockwise rotation so player immediately masters the feel
    return 1.65;
  }

  if (stage % 5 === 0) {
    // BOSS CORES: multi-harmonic surge + dramatic stop-and-reverse!
    const fastWave = Math.sin(waveTime * 1.65);
    const reverseWave = Math.cos(waveTime * 0.72);
    return baseSpeed * 1.28 * fastWave * (reverseWave >= 0 ? 1.1 : -0.95);
  }

  const pattern = stage % 4;
  if (pattern === 2) {
    // Smooth speed-up and slow-down breathing spin
    return baseSpeed * (0.75 + 0.65 * Math.sin(waveTime * 1.4));
  }
  if (pattern === 3) {
    // Classic Knife-Hit pendulum pause & reverse direction!
    return baseSpeed * 1.25 * Math.sin(waveTime * 0.95);
  }
  if (pattern === 0) {
    // Counter-clockwise burst cadence
    return -baseSpeed * (0.85 + 0.55 * Math.cos(waveTime * 1.8));
  }
  // Double-step surge with brief slow window
  const s = Math.sin(waveTime * 1.15);
  return baseSpeed * (s > -0.25 ? 1.1 : -0.85);
}

/**
 * Draws a Collectible DOOM Argent Energy Crystal Cell mounted just outside the target rim
 */
export function drawArgentCell(
  ctx: CanvasRenderingContext2D,
  cell: ArgentCell,
  targetRadius: number,
  time: number
) {
  if (cell.collected) return;

  ctx.save();
  ctx.rotate(cell.localAngle);
  // Placed at the outer perimeter of the wheel
  const dist = targetRadius + 22;
  ctx.translate(0, dist);

  const pulse = 1 + 0.14 * Math.sin(time * 8 + cell.pulseOffset);
  ctx.scale(pulse, pulse);

  // Radiant crimson-argent diamond aura
  const glow = ctx.createRadialGradient(0, 0, 2, 0, 0, 20);
  glow.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
  glow.addColorStop(0.4, 'rgba(244, 63, 94, 0.75)');
  glow.addColorStop(1, 'rgba(244, 63, 94, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 0, 20, 0, Math.PI * 2);
  ctx.fill();

  // Metallic UAC clamp base attaching cell to wheel
  ctx.fillStyle = '#27272a';
  ctx.fillRect(-6, -18, 12, 8);

  // Faceted Crimson Argent Energy Crystal
  ctx.fillStyle = '#f43f5e';
  ctx.strokeStyle = '#fda4af';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0, -13);
  ctx.lineTo(10, 0);
  ctx.lineTo(0, 14);
  ctx.lineTo(-10, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Bright white inner core facet
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(0, -7);
  ctx.lineTo(4.5, 0);
  ctx.lineTo(0, 7);
  ctx.lineTo(-4.5, 0);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

/**
 * Renders the full rotating circular target core, all embedded spikes around its perimeter,
 * collectible Argent cells, armor plating, teeth, runic rings, and progressive damage cracks.
 */
export function drawTargetCore(
  ctx: CanvasRenderingContext2D,
  params: {
    x: number;
    y: number;
    radius: number;
    rotation: number;
    core: CoreTheme;
    spikes: EmbeddedSpike[];
    cells: ArgentCell[];
    damageRatio: number; // 0.0 -> 1.0 as shots hit the wheel
    hitFlash: number; // 0.0 -> 1.0 on impact
    scalePop: number; // 1.0 + spring punch
    time: number;
    variant?: TargetVariant;
    duoSpin?: number; // absolute inner-core rotation for DUO-RING
    whirlDir?: number;
    whirlFlash?: number;
    driftDir?: number;
  }
) {
  const {
    x,
    y,
    radius,
    rotation,
    core,
    spikes,
    cells,
    damageRatio,
    hitFlash,
    scalePop,
    time,
    variant = 'normal',
    duoSpin,
    whirlDir = 1,
    whirlFlash = 0,
    driftDir = 0,
  } = params;

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scalePop, scalePop);

  // 1. Ambient Hell-Reactor Backlight Halo behind the wheel
  const haloRadius = radius * (core.isBoss ? 1.85 : 1.55);
  const halo = ctx.createRadialGradient(0, 0, radius * 0.5, 0, 0, haloRadius);
  halo.addColorStop(0, `${core.glowHex}55`);
  halo.addColorStop(0.55, `${core.glowHex}18`);
  halo.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(0, 0, haloRadius, 0, Math.PI * 2);
  ctx.fill();

  // PULSAR: expanding energy rings behind the wheel
  if (variant === 'pulse') {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 3; i++) {
      const t = (time * 0.8 + i / 3) % 1;
      ctx.globalAlpha = (1 - t) * 0.4;
      ctx.strokeStyle = core.glowHex;
      ctx.lineWidth = 2.5 * (1 - t) + 0.5;
      ctx.beginPath();
      ctx.arc(0, 0, radius * (1 + t * 0.75), 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  // DRIFTER: horizontal motion streaks (opposite the motion direction)
  if (variant === 'drift' && driftDir) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const gRgba = core.glowRgba ?? 'rgba(250, 204, 21, ';
    for (let i = 0; i < 3; i++) {
      const yy = (i - 1) * radius * 0.55;
      const len = radius * (0.75 + i * 0.2);
      const g = ctx.createLinearGradient(driftDir * 18, yy, driftDir * (18 + len), yy);
      g.addColorStop(0, `${gRgba}0)`);
      g.addColorStop(1, `${gRgba}0.4)`);
      ctx.strokeStyle = g;
      ctx.globalAlpha = 0.8;
      ctx.lineWidth = 3 - i * 0.7;
      ctx.beginPath();
      ctx.moveTo(driftDir * (18 + len), yy);
      ctx.lineTo(driftDir * 18, yy);
      ctx.stroke();
    }
    ctx.restore();
  }

  // ORBITER: dashed circular path marker
  if (variant === 'orbiter') {
    ctx.save();
    ctx.strokeStyle = core.glowHex;
    ctx.globalAlpha = 0.5;
    ctx.setLineDash([4, 7]);
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 1.22, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  ctx.rotate(rotation);

  // 2. DRAW COLLECTIBLE ARGENT CELLS AROUND PERIMETER
  for (const cell of cells) {
    drawArgentCell(ctx, cell, radius, time);
  }

  // 3. DRAW ALL EMBEDDED OBLITERATOR SPIKES FIRST (SO TIPS SINK INTO THE WHEEL!)
  // Local angle 0 means pointing DOWN in world space when rotation = 0:
  // Specifically, world bottom of target is angle = PI/2 in standard atan2, or in rotated coords:
  // A spike at localAngle has position along ray (cos(localAngle), sin(localAngle))?
  // Let's keep geometry crystal clear:
  // In local coords: we rotate by `spike.localAngle`, move outward `(0, radius + embedOffset)`,
  // and since `drawObliteratorSpike` points straight UP (tip at -Y toward center `(0,0)`!),
  // rotating by `localAngle` where `localAngle = 0` places the spike at `(0, +radius)` (BOTTOM of wheel)
  // pointing straight UP (`-Y`) right into the center `(0, 0)`!
  // That means when `rotation === 0`, `localAngle = 0` is the EXACT bottom impact point! Super clean!
  for (const spike of spikes) {
    const theme = WEAPON_THEMES[spike.weaponId] || WEAPON_THEMES.bfg;
    ctx.save();
    ctx.rotate(spike.localAngle);
    const springDepth = spike.embedAnim * 9; // Bounces slightly deeper on impact then settles
    ctx.translate(0, radius + 11 - springDepth);
    if (theme.kind === 'crystal') {
      // LIVING GEODE SHARD — grows from the impact point over time!
      const g = crystalGrowth(spike.age ?? 99);
      drawCrystalShard(ctx, { g, time, seed: spike.id * 1.7 });
      if (spike.flash > 0.01) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = spike.flash;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(0, -10, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    } else {
      drawObliteratorSpike(ctx, theme, {
        scale: 0.96,
        isPreSpawned: spike.isPreSpawned,
        flash: spike.flash,
        inFlight: false,
        time,
      });
    }
    ctx.restore();
  }

  // 3b. DUO-RING: extra outer counter-ring with its own notches
  if (variant === 'duo') {
    ctx.save();
    ctx.strokeStyle = core.glowHex;
    ctx.globalAlpha = 0.85;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(0, 0, radius + 12, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = core.rimColor;
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      ctx.save();
      ctx.rotate(a);
      ctx.beginPath();
      ctx.moveTo(radius + 6, 0);
      ctx.lineTo(radius + 12, -4);
      ctx.lineTo(radius + 12, 4);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }

  // 4. OUTER TOOTHED MECHANICAL GEAR CROWN
  ctx.fillStyle = core.rimColor;
  ctx.strokeStyle = '#090a0d';
  ctx.lineWidth = 2;
  const teeth = core.toothCount;
  ctx.beginPath();
  for (let i = 0; i < teeth; i++) {
    const a1 = (i / teeth) * Math.PI * 2;
    const a2 = ((i + 0.42) / teeth) * Math.PI * 2;
    const a3 = ((i + 0.55) / teeth) * Math.PI * 2;
    const a4 = ((i + 0.95) / teeth) * Math.PI * 2;
    const rOut = radius + (core.isBoss ? 7 : 4.5);
    const rIn = radius - 2;
    if (i === 0) {
      ctx.moveTo(Math.cos(a1) * rIn, Math.sin(a1) * rIn);
    } else {
      ctx.lineTo(Math.cos(a1) * rIn, Math.sin(a1) * rIn);
    }
    ctx.lineTo(Math.cos(a2) * rOut, Math.sin(a2) * rOut);
    ctx.lineTo(Math.cos(a3) * rOut, Math.sin(a3) * rOut);
    ctx.lineTo(Math.cos(a4) * rIn, Math.sin(a4) * rIn);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // 5. MAIN ARMORED CIRCULAR DISC BODY
  const discGrad = ctx.createRadialGradient(-radius * 0.25, -radius * 0.25, 8, 0, 0, radius);
  discGrad.addColorStop(0, core.baseColor);
  discGrad.addColorStop(0.72, core.innerColor);
  discGrad.addColorStop(1, '#090a0d');

  ctx.fillStyle = discGrad;
  ctx.beginPath();
  ctx.arc(0, 0, radius - 1.5, 0, Math.PI * 2);
  ctx.fill();

  // Metallic Rim Bevel Ring
  ctx.strokeStyle = core.rimColor;
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.arc(0, 0, radius - 5, 0, Math.PI * 2);
  ctx.stroke();

  // DUO-RING: inner core counter-rotates against the outer shell
  if (variant === 'duo' && duoSpin !== undefined) {
    ctx.save();
    ctx.rotate(duoSpin - rotation);
  }

  // 6. SEGMENTED ARMOR PLATES & BOLT RIVETS (Makes spin speed hyper-readable!)
  const plateCount = core.isBoss ? 8 : 6;
  ctx.strokeStyle = '#090a0d';
  ctx.lineWidth = 2.6;
  for (let p = 0; p < plateCount; p++) {
    const ang = (p / plateCount) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(Math.cos(ang) * (radius * 0.36), Math.sin(ang) * (radius * 0.36));
    ctx.lineTo(Math.cos(ang) * (radius - 6), Math.sin(ang) * (radius - 6));
    ctx.stroke();

    // Rivet studs flanking seam
    for (const offset of [-0.1, 0.1]) {
      const rx = Math.cos(ang + offset) * (radius - 15);
      const ry = Math.sin(ang + offset) * (radius - 15);
      ctx.fillStyle = core.rimColor;
      ctx.beginPath();
      ctx.arc(rx, ry, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 7. GLOWING RUNIC RING AROUND INNER CORE
  ctx.strokeStyle = core.glowHex;
  ctx.shadowColor = core.glowHex;
  ctx.shadowBlur = 10 + damageRatio * 12;
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.56, 0, Math.PI * 2);
  ctx.stroke();

  // Runic tick notches along the ring
  for (let r = 0; r < 12; r++) {
    const ra = (r / 12) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(Math.cos(ra) * (radius * 0.48), Math.sin(ra) * (radius * 0.48));
    ctx.lineTo(Math.cos(ra) * (radius * 0.62), Math.sin(ra) * (radius * 0.62));
    ctx.stroke();
  }
  ctx.shadowBlur = 0;

  const eyeRadius = radius * (core.isBoss ? 0.36 : 0.3);

  // 8. PROGRESSIVE ORGANIC JAGGED MAGMA FISSURES AS WHEEL NEARS OBLITERATION!
  if (damageRatio > 0.08) {
    const crackCount = Math.floor(damageRatio * 8) + 1;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowColor = core.glowHex;
    ctx.shadowBlur = 12;

    for (let c = 0; c < crackCount; c++) {
      const baseA = c * 2.39996 + 0.35;
      const len = radius * (0.38 + damageRatio * 0.56);
      const r1 = len * 0.36;
      const r2 = len * 0.68;

      // Outer colored magma glow stroke
      ctx.strokeStyle = core.glowHex;
      ctx.lineWidth = 3.2 + damageRatio * 2.2;
      ctx.globalAlpha = Math.min(0.95, 0.45 + damageRatio * 0.5);
      ctx.beginPath();
      ctx.moveTo(Math.cos(baseA) * (eyeRadius * 0.85), Math.sin(baseA) * (eyeRadius * 0.85));
      ctx.lineTo(Math.cos(baseA + 0.19) * r1, Math.sin(baseA + 0.19) * r1);
      ctx.lineTo(Math.cos(baseA - 0.14) * r2, Math.sin(baseA - 0.14) * r2);
      ctx.lineTo(Math.cos(baseA + 0.08) * len, Math.sin(baseA + 0.08) * len);
      ctx.stroke();

      // Secondary fork branch
      if (damageRatio > 0.35) {
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(Math.cos(baseA - 0.14) * r2, Math.sin(baseA - 0.14) * r2);
        ctx.lineTo(Math.cos(baseA - 0.36) * (len * 0.92), Math.sin(baseA - 0.36) * (len * 0.92));
        ctx.stroke();
      }

      // Inner white-hot core filament
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(baseA) * (eyeRadius * 0.85), Math.sin(baseA) * (eyeRadius * 0.85));
      ctx.lineTo(Math.cos(baseA + 0.19) * r1, Math.sin(baseA + 0.19) * r1);
      ctx.lineTo(Math.cos(baseA - 0.14) * r2, Math.sin(baseA - 0.14) * r2);
      ctx.stroke();
    }
    ctx.restore();
  }

  // 9. CENTRAL MOLTEN HELL-EYE / REACTOR HEART
  const eyePulse = 1 + 0.09 * Math.sin(time * 9) + damageRatio * 0.12;
  const eyeGrad = ctx.createRadialGradient(0, 0, 2, 0, 0, eyeRadius * eyePulse);
  eyeGrad.addColorStop(0, '#ffffff');
  eyeGrad.addColorStop(0.45, core.glowHex);
  eyeGrad.addColorStop(1, '#090a0d');

  ctx.fillStyle = eyeGrad;
  ctx.beginPath();
  ctx.arc(0, 0, eyeRadius, 0, Math.PI * 2);
  ctx.fill();

  // Boss Demonic Slit / UAC Tri-Spoke Core Emblem
  ctx.fillStyle = '#090a0d';
  if (core.isBoss) {
    // Fierce vertical demonic pupil slit inside boss core!
    ctx.beginPath();
    ctx.moveTo(0, -eyeRadius * 0.72);
    ctx.quadraticCurveTo(eyeRadius * 0.26, 0, 0, eyeRadius * 0.72);
    ctx.quadraticCurveTo(-eyeRadius * 0.26, 0, 0, -eyeRadius * 0.72);
    ctx.fill();
  } else {
    // Iconic tri-blade UAC reactor hub
    for (let b = 0; b < 3; b++) {
      const ba = (b / 3) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, eyeRadius * 0.78, ba, ba + 0.55);
      ctx.closePath();
      ctx.fill();
    }
  }

  // 9b. WHIRLPOOL: direction arrows + reversal flash
  if (variant === 'whirl') {
    ctx.save();
    ctx.rotate(time * 2.6 * whirlDir);
    ctx.strokeStyle = core.glowHex;
    ctx.lineWidth = 2.4;
    ctx.lineCap = 'round';
    for (let i = 0; i < 4; i++) {
      ctx.save();
      ctx.rotate((i / 4) * Math.PI * 2);
      ctx.globalAlpha = 0.85;
      ctx.beginPath();
      ctx.arc(0, 0, radius + 8, -0.28 * whirlDir, 0.28 * whirlDir);
      ctx.stroke();
      // Arrowhead
      const ax = Math.cos(0.28 * whirlDir) * (radius + 8);
      const ay = Math.sin(0.28 * whirlDir) * (radius + 8);
      ctx.fillStyle = core.glowHex;
      ctx.beginPath();
      ctx.moveTo(ax + whirlDir * 7, ay + 2);
      ctx.lineTo(ax - 3, ay - 5);
      ctx.lineTo(ax - 1, ay + 7);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
    if (whirlFlash > 0.01) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = whirlFlash * 0.55;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(0, 0, radius + 3, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  // DUO-RING: close the inner core rotation
  if (variant === 'duo' && duoSpin !== undefined) {
    ctx.restore();
  }

  // 10. IMPACT WHITE-HOT FLASH OVERLAY WHEN HIT BY BOLT
  if (hitFlash > 0.01) {
    ctx.globalAlpha = Math.min(0.65, hitFlash * 0.7);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

/**
 * Renders an exploding pie-wedge armor fragment when a circular target is OBLITERATED
 */
export function drawShatterShard(ctx: CanvasRenderingContext2D, shard: ShatterShard) {
  const alpha = Math.max(0, shard.life / shard.maxLife);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(shard.x, shard.y);
  ctx.rotate(shard.rot);

  ctx.fillStyle = shard.colorMain;
  ctx.strokeStyle = shard.glowColor;
  ctx.shadowColor = shard.glowColor;
  ctx.shadowBlur = 12 * alpha;
  ctx.lineWidth = 2.2;

  ctx.beginPath();
  ctx.moveTo(shard.radius * 0.14, 0);
  ctx.arc(0, 0, shard.radius, shard.startAngle, shard.startAngle + shard.sweepAngle);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Outer rim highlight strip on shard
  ctx.strokeStyle = shard.colorRim;
  ctx.shadowBlur = 0;
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.arc(0, 0, shard.radius - 3, shard.startAngle, shard.startAngle + shard.sweepAngle);
  ctx.stroke();

  ctx.restore();
}
