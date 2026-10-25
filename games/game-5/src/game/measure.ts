import type { Weapon } from "./types";
import { FIRE_SPECS, isSignature } from "./fireMotion";

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
  const cv = document.createElement("canvas");
  cv.width = W;
  cv.height = H;
  const ctx = cv.getContext("2d", { willReadFrequently: true })!;
  ctx.translate(W / 2, H / 2);
  weapon.draw(ctx, { t: 0.3, recoil: 0, charge: 0.35, icon: true });
  if (isSignature(weapon.id)) {
    const release = FIRE_SPECS[weapon.id].release;
    // The cached envelope includes anticipation, recoil and catch so animation never clips.
    for (const shotAge of [
      release * 0.55,
      release * 0.95,
      release + 0.03,
      release + 0.1,
      0.42,
      0.7,
    ]) {
      weapon.draw(ctx, {
        t: 0.3,
        recoil: 0,
        charge: 0,
        icon: true,
        shotAge,
        catchAge: 100,
        discInFlight: weapon.id === "identityDisc" && shotAge >= release,
      });
    }
    if (weapon.id === "identityDisc")
      weapon.draw(ctx, {
        t: 0.3,
        recoil: 0,
        charge: 0,
        icon: true,
        shotAge: 100,
        catchAge: 0.04,
      });
  }
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

export function rotatedWeaponBounds(weapon: Weapon, angle: number) {
  const bounds = measureWeapon(weapon);
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const flip = c < 0 ? -1 : 1;
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const x of [bounds.x, bounds.x + bounds.w]) {
    for (const y of [bounds.y, bounds.y + bounds.h]) {
      const rx = x * c - y * flip * s;
      const ry = x * s + y * flip * c;
      minX = Math.min(minX, rx);
      maxX = Math.max(maxX, rx);
      minY = Math.min(minY, ry);
      maxY = Math.max(maxY, ry);
    }
  }
  return { minX, minY, maxX, maxY };
}
