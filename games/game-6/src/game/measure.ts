import type { Weapon } from './types';

export interface BBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

const cache = new Map<string, BBox>();

/** Renders the weapon once offscreen and measures its painted bounds. */
export function measureWeapon(weapon: Weapon): BBox {
  const hit = cache.get(weapon.id);
  if (hit) return hit;
  const W = 900,
    H = 560;
  const cv = document.createElement('canvas');
  cv.width = W;
  cv.height = H;
  const ctx = cv.getContext('2d', { willReadFrequently: true })!;
  ctx.translate(W / 2, H / 2);
  (weapon.drawIcon ?? weapon.draw)(ctx, { t: 0.3, recoil: 0, charge: 0.35, cycle: 1, icon: true });
  const data = ctx.getImageData(0, 0, W, H).data;
  let minX = W,
    minY = H,
    maxX = 0,
    maxY = 0,
    found = false;
  for (let y = 0; y < H; y += 2) {
    for (let x = 0; x < W; x += 2) {
      if (data[(y * W + x) * 4 + 3] > 12) {
        found = true;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  const box: BBox = found
    ? { x: minX - W / 2, y: minY - H / 2, w: maxX - minX, h: maxY - minY }
    : { x: -80, y: -30, w: 160, h: 60 };
  cache.set(weapon.id, box);
  return box;
}
