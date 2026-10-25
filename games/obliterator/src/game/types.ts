export type WeaponId =
  | 'bfg'
  | 'crucible'
  | 'maykr'
  | 'overlord'
  | 'rainbow'
  | 'water'
  | 'snow'
  | 'rifle'
  | 'banana'
  | 'beehive'
  | 'bubble'
  | 'confetti'
  | 'crystal';

export type WeaponKind =
  | 'obliterator'
  | 'rainbow'
  | 'water'
  | 'snow'
  | 'revolver'
  | 'pistol'
  | 'shotgun'
  | 'rifle'
  | 'banana'
  | 'beehive'
  | 'bubble'
  | 'confetti'
  | 'crystal';

export interface WeaponTheme {
  id: WeaponId;
  kind?: WeaponKind;
  rarity?: string;
  rarityColor?: string;
  short?: string;
  name: string;
  subtitle: string;
  tag: string;
  // Chassis metallic tones
  armorPrimary: string;
  armorSecondary: string;
  armorDark: string;
  armorHighlight: string;
  trimMetal: string;
  // Energy & plasma colors
  plasmaCore: string;
  plasmaMid: string;
  plasmaOuter: string;
  plasmaGlowRgba: string;
  laserSightRgba: string;
  muzzleFlashHex: string;
  // Spike accent
  spikeBody: string;
  spikeBlade: string;
}

export type GamePhase = 'title' | 'playing' | 'shattering' | 'gameover';

export interface EmbeddedSpike {
  id: number;
  /** Angle in radians on the target's local coordinate system */
  localAngle: number;
  weaponId: WeaponId;
  isPreSpawned: boolean;
  embedAnim: number; // 1.0 down to 0.0 spring settle on impact
  flash: number;
  age?: number; // seconds since embedding — crystal shards grow with this!
}

export interface ArgentCell {
  id: number;
  localAngle: number;
  collected: boolean;
  pulseOffset: number;
}

export interface FlyingBolt {
  id: number;
  x: number;
  y: number;
  vy: number;
  weaponId: WeaponId;
  isOverdrive: boolean;
  ricocheted: boolean;
  vx: number;
  rot: number;
  vRot: number;
  alpha: number;
  startY?: number;
  missed?: boolean;
}

export interface ShatterShard {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vRot: number;
  radius: number;
  startAngle: number;
  sweepAngle: number;
  colorMain: string;
  colorRim: string;
  glowColor: string;
  life: number;
  maxLife: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
  gravity: number;
  drag: number;
  type:
    | 'spark'
    | 'smoke'
    | 'ring'
    | 'ember'
    | 'lightning'
    | 'shell'
    | 'ellipse'
    | 'streak'
    | 'glow'
    | 'star'
    | 'drop'
    | 'bubble'
    | 'flake'
    | 'casing'
    | 'trail'
    | 'ripple'
    | 'shard'
    | 'rainbowArc'
    | 'confetti'
    | 'frostRing'
    | 'shock';
  kind?: WeaponKind;
  rot?: number;
  vRot?: number;
  x2?: number;
  y2?: number;
  seed?: number;
  grow?: number;
}

export interface FloatingText {
  id: number;
  x: number;
  y: number;
  vy: number;
  text: string;
  color: string;
  scale: number;
  life: number;
  maxLife: number;
}

export interface CoreTheme {
  name: string;
  isBoss: boolean;
  baseColor: string;
  innerColor: string;
  rimColor: string;
  glowHex: string;
  glowRgba?: string; // "rgba(r, g, b, " prefix for alpha blending
  toothCount: number;
}

export interface HudSnapshot {
  phase: GamePhase;
  score: number;
  bestScore: number;
  stage: number;
  bestStage: number;
  ammoLeft: number;
  ammoTotal: number;
  argentGems: number;
  overdriveCharge: number; // 0 to 100
  overdrivePrimed: boolean;
  combo: number;
  selectedWeapon: WeaponId;
  inspectMode: boolean;
  muted: boolean;
  coreName: string;
  isBoss: boolean;
  isSpecial: boolean;
}
