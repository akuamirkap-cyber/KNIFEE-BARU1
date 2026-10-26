import type { WeaponId } from '../weapons';
import { getGunVariant, isFixedClassicGun, supportsGunVariants, type GunVariant, type VariantWeapon } from './gunVariants';

export interface GunMetrics {
  totalLen: number;
  centerOffsetY: number;
  centerOffsetX: number;
  span: number;
}

// Measured actual bounding box of every gun from muzzle (cx, y0)
// centerOffsetY = vertical distance from muzzle (y0) to the visual center
// centerOffsetX = horizontal distance from barrel line (cx) to center of mass
// span = maximum overall dimension (diagonal/length) used for auto-scale
export const GUN_METRICS: Partial<Record<WeaponId, Partial<GunMetrics>>> = {
  pistol: { totalLen: 172, centerOffsetY: 84, centerOffsetX: 22, span: 185 },
  ak47: { totalLen: 265, centerOffsetY: 130, centerOffsetX: 24, span: 270 },
  nail: { totalLen: 168, centerOffsetY: 74, centerOffsetX: 24, span: 182 },
  crossbow: { totalLen: 225, centerOffsetY: 110, centerOffsetX: 0, span: 230 },
  plasma: { totalLen: 225, centerOffsetY: 106, centerOffsetX: 12, span: 245 },
  laser: { totalLen: 192, centerOffsetY: 94, centerOffsetX: 2, span: 198 },
  fish: { totalLen: 158, centerOffsetY: 78, centerOffsetX: 0, span: 168 },
  rpg: { totalLen: 226, centerOffsetY: 110, centerOffsetX: 4, span: 230 },
  cricket: { totalLen: 160, centerOffsetY: 77, centerOffsetX: 4, span: 190 },
  electro: { totalLen: 180, centerOffsetY: 88, centerOffsetX: 2, span: 192 },
  bazooka: { totalLen: 270, centerOffsetY: 132, centerOffsetX: 12, span: 275 },
  freeze: { totalLen: 182, centerOffsetY: 82, centerOffsetX: 10, span: 192 },
  golden: { totalLen: 180, centerOffsetY: 86, centerOffsetX: 17, span: 210 },
  blackhole: { totalLen: 174, centerOffsetY: 84, centerOffsetX: 2, span: 180 },
  slingshot: { totalLen: 176, centerOffsetY: 88, centerOffsetX: 0, span: 184 },
  blowgun: { totalLen: 290, centerOffsetY: 145, centerOffsetX: 5, span: 295 },
  shotgun: { totalLen: 226, centerOffsetY: 113, centerOffsetX: 6, span: 224 },
  soaker: { totalLen: 164, centerOffsetY: 75, centerOffsetX: -1, span: 174 },
  snowball: { totalLen: 202, centerOffsetY: 98, centerOffsetX: -3, span: 208 },
  sniper: { totalLen: 236, centerOffsetY: 114, centerOffsetX: -3, span: 242 },
  flamethrower: { totalLen: 186, centerOffsetY: 74, centerOffsetX: 8, span: 192 },
  bamboo: { totalLen: 210, centerOffsetY: 100, centerOffsetX: 4, span: 230 },
  banana: { totalLen: 175, centerOffsetY: 78, centerOffsetX: 9, span: 185 },
  bubble: { totalLen: 166, centerOffsetY: 80, centerOffsetX: 2, span: 174 },
  harpoon: { totalLen: 265, centerOffsetY: 130, centerOffsetX: 14, span: 270 },
  chicken: { totalLen: 194, centerOffsetY: 91, centerOffsetX: 2, span: 198 },
  confetti: { totalLen: 184, centerOffsetY: 80, centerOffsetX: 0, span: 188 },
  seed: { totalLen: 178, centerOffsetY: 88, centerOffsetX: -4, span: 184 },
  pizza: { totalLen: 182, centerOffsetY: 76, centerOffsetX: 6, span: 188 },
  minigun: { totalLen: 235, centerOffsetY: 115, centerOffsetX: 0, span: 240 },
  railgun: { totalLen: 214, centerOffsetY: 106, centerOffsetX: 0, span: 218 },
  magnet: { totalLen: 154, centerOffsetY: 74, centerOffsetX: 4, span: 162 },
  shrink: { totalLen: 165, centerOffsetY: 80, centerOffsetX: 14, span: 170 },
  grow: { totalLen: 165, centerOffsetY: 80, centerOffsetX: 14, span: 170 },
  pirate: { totalLen: 192, centerOffsetY: 86, centerOffsetX: 0, span: 196 },
  card: { totalLen: 160, centerOffsetY: 78, centerOffsetX: 14, span: 165 },
  dragon: { totalLen: 185, centerOffsetY: 82, centerOffsetX: 0, span: 240 },
  gravity: { totalLen: 170, centerOffsetY: 82, centerOffsetX: 16, span: 175 },
  honey: { totalLen: 204, centerOffsetY: 100, centerOffsetX: 2, span: 208 },
  coconut: { totalLen: 225, centerOffsetY: 110, centerOffsetX: 14, span: 230 },
  angklung: { totalLen: 185, centerOffsetY: 92, centerOffsetX: 12, span: 190 },
  bee: { totalLen: 170, centerOffsetY: 82, centerOffsetX: 16, span: 175 },
  yoyo: { totalLen: 186, centerOffsetY: 93, centerOffsetX: 14, span: 205 },
  sakura: { totalLen: 170, centerOffsetY: 82, centerOffsetX: 14, span: 175 },
  acid: { totalLen: 170, centerOffsetY: 82, centerOffsetX: 16, span: 175 },
  keris: { totalLen: 208, centerOffsetY: 102, centerOffsetX: 0, span: 215 },
  firework: { totalLen: 185, centerOffsetY: 90, centerOffsetX: 14, span: 190 },
  anchor: { totalLen: 220, centerOffsetY: 108, centerOffsetX: 14, span: 225 },
  shark: { totalLen: 180, centerOffsetY: 88, centerOffsetX: 16, span: 185 },
  ghost: { totalLen: 186, centerOffsetY: 92, centerOffsetX: 2, span: 196 },
  ufo: { totalLen: 194, centerOffsetY: 86, centerOffsetX: 2, span: 204 },
  rainbow: { totalLen: 188, centerOffsetY: 90, centerOffsetX: 2, span: 196 },
  meteor: { totalLen: 178, centerOffsetY: 78, centerOffsetX: 3, span: 184 },
  diamond: { totalLen: 165, centerOffsetY: 80, centerOffsetX: 0, span: 170 },
  moonbeam: { totalLen: 198, centerOffsetY: 88, centerOffsetX: 0, span: 204 },
  storm: { totalLen: 172, centerOffsetY: 76, centerOffsetX: 2, span: 178 },
  pencil: { totalLen: 180, centerOffsetY: 88, centerOffsetX: 8, span: 185 },
  sandal: { totalLen: 165, centerOffsetY: 80, centerOffsetX: 12, span: 170 },
  paintball: { totalLen: 175, centerOffsetY: 85, centerOffsetX: 18, span: 185 },
  wand: { totalLen: 202, centerOffsetY: 94, centerOffsetX: 0, span: 210 },
  ruby: { totalLen: 184, centerOffsetY: 92, centerOffsetX: 12, span: 192 },
  emerald: { totalLen: 165, centerOffsetY: 80, centerOffsetX: 14, span: 170 },
  sapphire: { totalLen: 234, centerOffsetY: 116, centerOffsetX: 12, span: 242 },
  crystal: { totalLen: 192, centerOffsetY: 88, centerOffsetX: 2, span: 202 },
  beerifle: { totalLen: 300, centerOffsetY: 148, centerOffsetX: 16, span: 305 },
  buster: { totalLen: 170, centerOffsetY: 82, centerOffsetX: 10, span: 175 },
  holy: { totalLen: 175, centerOffsetY: 85, centerOffsetX: 16, span: 180 },
  unicorn: { totalLen: 175, centerOffsetY: 85, centerOffsetX: 16, span: 180 },
  obliterator: { totalLen: 225, centerOffsetY: 110, centerOffsetX: 16, span: 230 },
  coingun: { totalLen: 170, centerOffsetY: 82, centerOffsetX: 16, span: 175 },
  blaster: { totalLen: 185, centerOffsetY: 90, centerOffsetX: 16, span: 190 },
  // ---------------------------------------------------------- SCI-FI
  photon_saber: { totalLen: 240, centerOffsetY: 120, centerOffsetX: 8, span: 245 },
  gauntlet_cannon: { totalLen: 196, centerOffsetY: 100, centerOffsetX: 0, span: 204 },
  pulse_rifle: { totalLen: 240, centerOffsetY: 118, centerOffsetX: 14, span: 245 },
  cryo_blaster: { totalLen: 158, centerOffsetY: 72, centerOffsetX: -5, span: 168 },
  hyperdrive: { totalLen: 166, centerOffsetY: 78, centerOffsetX: 8, span: 174 },
  quantum_destabilizer: { totalLen: 195, centerOffsetY: 94, centerOffsetX: 12, span: 200 },
  // ---------------------------------------------------------- ELEMENTAL ARSENAL (slide 7)
  xeno: { totalLen: 420, centerOffsetY: 180, centerOffsetX: -13, span: 135 },
  dora: { totalLen: 300, centerOffsetY: 80, centerOffsetX: 0, span: 165 },
  pred: { totalLen: 310, centerOffsetY: 86, centerOffsetX: -15, span: 200 },
};

// Variant-specific centers also keep the three comparison cards at the same
// apparent size. The rest of the arsenal retains its existing metrics.
const VARIANT_METRICS: Record<VariantWeapon, { original: GunMetrics; latest?: GunMetrics }> = {
  plasma: {
    original: { totalLen: 180, centerOffsetY: 85, centerOffsetX: 15, span: 195 },
    latest: { totalLen: 180, centerOffsetY: 88, centerOffsetX: 9, span: 211 },
  },
  laser: {
    original: { totalLen: 192, centerOffsetY: 94, centerOffsetX: 2, span: 198 },
    latest: { totalLen: 180, centerOffsetY: 88, centerOffsetX: 9, span: 212 },
  },
  chicken: {
    original: { totalLen: 185, centerOffsetY: 88, centerOffsetX: 13, span: 203 },
    latest: { totalLen: 194, centerOffsetY: 91, centerOffsetX: 2, span: 198 },
  },
  dragon: {
    original: { totalLen: 175, centerOffsetY: 85, centerOffsetX: 16, span: 195 },
    latest: { totalLen: 180, centerOffsetY: 88, centerOffsetX: 8, span: 218 },
  },
  diamond: {
    original: { totalLen: 165, centerOffsetY: 80, centerOffsetX: 14, span: 190 },
    latest: { totalLen: 180, centerOffsetY: 87, centerOffsetX: 11, span: 210 },
  },
  rainbow: {
    original: { totalLen: 188, centerOffsetY: 90, centerOffsetX: 2, span: 196 },
    latest: { totalLen: 180, centerOffsetY: 87, centerOffsetX: 9, span: 210 },
  },
  meteor: {
    original: { totalLen: 178, centerOffsetY: 78, centerOffsetX: 3, span: 184 },
    latest: { totalLen: 180, centerOffsetY: 87, centerOffsetX: 9, span: 210 },
  },
  golden: {
    original: { totalLen: 170, centerOffsetY: 80, centerOffsetX: 22, span: 185 },
    latest: { totalLen: 180, centerOffsetY: 87, centerOffsetX: 10, span: 210 },
  },
  blackhole: {
    original: { totalLen: 174, centerOffsetY: 84, centerOffsetX: 2, span: 180 },
    latest: { totalLen: 174, centerOffsetY: 84, centerOffsetX: 2, span: 180 },
  },
  moonbeam: {
    original: { totalLen: 198, centerOffsetY: 88, centerOffsetX: 0, span: 204 },
    latest: { totalLen: 175, centerOffsetY: 86, centerOffsetX: 0, span: 204 },
  },
  honey: {
    original: { totalLen: 204, centerOffsetY: 100, centerOffsetX: 2, span: 208 },
  },
  cricket: {
    original: { totalLen: 95, centerOffsetY: 45, centerOffsetX: 12, span: 110 },
  },
  fish: {
    original: { totalLen: 210, centerOffsetY: 104, centerOffsetX: 18, span: 230 },
  },
  electro: {
    original: { totalLen: 215, centerOffsetY: 105, centerOffsetX: 18, span: 230 },
  },
};

export function getGunMetrics(id: WeaponId, variant: GunVariant = getGunVariant(id)): GunMetrics {
  const effectiveVariant = isFixedClassicGun(id) ? 'original'
    : id === 'honey' && variant === 'latest' ? 'current' : variant;
  const m = supportsGunVariants(id) && effectiveVariant !== 'current'
    ? VARIANT_METRICS[id][effectiveVariant] : GUN_METRICS[id];
  return {
    totalLen: m?.totalLen ?? 175,
    centerOffsetY: m?.centerOffsetY ?? 85,
    centerOffsetX: m?.centerOffsetX ?? 16,
    span: m?.span ?? 180,
  };
}
