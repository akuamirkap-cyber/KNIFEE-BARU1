import type { WeaponId } from '../weapons';
import { getGunVariant, isFixedClassicGun, supportsGunVariants, type GunVariant, type VariantWeapon } from './gunVariants';

export interface GunMetrics {
  totalLen: number;
  centerOffsetY: number;
  centerOffsetX: number;
  span: number;
}

/**
 * Ink bounds of a gun in muzzle space (origin = muzzle, +y runs down the
 * barrel). Only the guns whose silhouette is too irregular for the rough
 * span/centre table are listed; they are measured from the renderer itself so
 * menu thumbnails can fit the WHOLE gun instead of cropping it.
 */
export interface GunInkBox {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

const GUN_INK_BOX: Partial<Record<WeaponId, GunInkBox>> = {
  // Measured at rest (no recoil/charge) from drawGun(), re-measured whenever the
  // art changes (the Air Cannon lost its arm, the Xenomorph got a real neck).
  xeno: { x0: -104, y0: -41, x1: 48, y1: 415 },
  dora: { x0: -40, y0: -85, x1: 39, y1: 102 },
  pred: { x0: -101, y0: -85, x1: 100, y1: 240 },
};

export function getGunInkBox(id: WeaponId): GunInkBox | null {
  return GUN_INK_BOX[id] ?? null;
}

export interface PreviewFit {
  scale: number;
  tx: number;
  ty: number;
}

/**
 * Fit an ink box inside a W×H preview rotated a quarter turn (how every menu
 * strip draws guns). Returns the scale and the translation that puts the box
 * corner-to-corner inside the canvas — padding included — so nothing clips.
 */
export function fitInkBoxQuarterTurn(box: GunInkBox, w: number, h: number, pad = 8): PreviewFit {
  const bw = Math.max(1, box.x1 - box.x0);
  const bh = Math.max(1, box.y1 - box.y0);
  const scale = Math.max(0.01, Math.min((w - pad * 2) / bh, (h - pad * 2) / bw));
  const cx = (box.x0 + box.x1) / 2;
  const cy = (box.y0 + box.y1) / 2;
  // rotate(90°): local (x, y) -> screen offset (-y * scale, x * scale)
  return { scale, tx: w / 2 + cy * scale, ty: h / 2 - cx * scale };
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
  // Measured silhouettes (w×h at rest): xeno 152×456, dora 79×187, pred 201×325.
  // `span` is the box diagonal after the 45° showcase rotation, i.e.
  // (w + h) / √2 — the old 135/165/200 values were far too small, so every
  // menu scaled these three up until they were cropped.
  xeno: { totalLen: 456, centerOffsetY: 187, centerOffsetX: -28, span: 430 },
  dora: { totalLen: 187, centerOffsetY: 9, centerOffsetX: -1, span: 188 },
  pred: { totalLen: 325, centerOffsetY: 78, centerOffsetX: -1, span: 372 },
};

// Variant-specific centers also keep the three comparison cards at the same
// apparent size. The rest of the arsenal retains its existing metrics.
type VariantMetrics = Partial<Record<GunVariant, GunMetrics>> & { original: GunMetrics };

const VARIANT_METRICS: Record<VariantWeapon, VariantMetrics> = {
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
    set1: { totalLen: 150, centerOffsetY: 66, centerOffsetX: 31, span: 174 }, // -17,-9..79,141
  },
  blackhole: {
    original: { totalLen: 174, centerOffsetY: 84, centerOffsetX: 2, span: 180 },
    // Measured from the slide-2 renderer (games/fireworkgun drawBHGun):
    // ink runs x -117..116, y -76..216 around the muzzle, so the 45° showcase
    // diagonal is (233 + 292) / √2 ≈ 371. The old 180 cropped the orbit ring.
    latest: { totalLen: 216, centerOffsetY: 70, centerOffsetX: 0, span: 371 },
    // Slide-7 BLACK HOLE staff: ink x -51..51, y -51..244.
    set1: { totalLen: 295, centerOffsetY: 97, centerOffsetX: 0, span: 281 },
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
  // SET 1 of slide 7. The "Set 1" numbers are measured from the real slide-7
  // renderer (`drawSetOneGun`, at rest and mid-animation) so the card shows the
  // whole weapon: ink box → diagonal span (w + h) / √2, centre = box centre.
  //                           box                      w×h    → span
  slingshot: {
    original: { totalLen: 176, centerOffsetY: 88, centerOffsetX: 0, span: 184 },
    set1: { totalLen: 179, centerOffsetY: 83, centerOffsetX: 0, span: 177 }, // -36,-7..36,172
  },
  blowgun: {
    original: { totalLen: 290, centerOffsetY: 145, centerOffsetX: 5, span: 295 },
    set1: { totalLen: 290, centerOffsetY: 105, centerOffsetX: 12, span: 257 }, // -25,-40..48,250
  },
  shotgun: {
    original: { totalLen: 226, centerOffsetY: 113, centerOffsetX: 6, span: 224 },
    set1: { totalLen: 297, centerOffsetY: 139, centerOffsetX: 9, span: 240 }, // -13,-10..30,287
  },
  soaker: {
    original: { totalLen: 164, centerOffsetY: 75, centerOffsetX: -1, span: 174 },
    set1: { totalLen: 158, centerOffsetY: 78, centerOffsetX: 5, span: 185 }, // -47,-1..56,157
  },
};

export function getGunMetrics(id: WeaponId, variant: GunVariant = getGunVariant(id)): GunMetrics {
  const effectiveVariant = isFixedClassicGun(id) ? 'original'
    : id === 'honey' && variant === 'latest' ? 'current' : variant;
  const measured = supportsGunVariants(id) && effectiveVariant !== 'current'
    ? VARIANT_METRICS[id][effectiveVariant] : undefined;
  const m = measured ?? GUN_METRICS[id];
  return {
    totalLen: m?.totalLen ?? 175,
    centerOffsetY: m?.centerOffsetY ?? 85,
    centerOffsetX: m?.centerOffsetX ?? 16,
    span: m?.span ?? 180,
  };
}
