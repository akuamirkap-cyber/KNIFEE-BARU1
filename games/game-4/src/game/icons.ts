import { makeCanvas } from './core';
import { drawWeapon } from './weaponArt';
import { WEAPON_MAP, newAnim, type WeaponId } from './weapons';

const cache = new Map<WeaponId, string>();

/**
 * Renders a card icon straight from the in-game weapon artwork:
 * draw the weapon big, find its bounding box, then fit it into a square with a soft accent glow.
 */
export function renderWeaponIcon(id: WeaponId, size = 256): string {
  const hit = cache.get(id);
  if (hit) return hit;
  const S = 760;
  const big = makeCanvas(S, S);
  const g = big.getContext('2d', { willReadFrequently: true })!;
  g.translate(S / 2, S / 2);
  g.rotate(Math.PI / 4); // point up-right like the reference cards
  drawWeapon(g, id, newAnim(), 0.35);
  g.setTransform(1, 0, 0, 1, 0, 0);
  const data = g.getImageData(0, 0, S, S).data;
  let x0 = S;
  let y0 = S;
  let x1 = 0;
  let y1 = 0;
  for (let y = 0; y < S; y += 2) {
    for (let x = 0; x < S; x += 2) {
      if (data[(y * S + x) * 4 + 3] > 24) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  const out = makeCanvas(size, size);
  const o = out.getContext('2d')!;
  const accent = WEAPON_MAP[id].accent;
  const glow = o.createRadialGradient(size / 2, size / 2, 4, size / 2, size / 2, size * 0.5);
  glow.addColorStop(0, `${accent}55`);
  glow.addColorStop(1, `${accent}00`);
  o.fillStyle = glow;
  o.fillRect(0, 0, size, size);
  if (x1 > x0 && y1 > y0) {
    const bw = x1 - x0 + 2;
    const bh = y1 - y0 + 2;
    const s = Math.min((size * 0.84) / bw, (size * 0.84) / bh, 1.7);
    const dw = bw * s;
    const dh = bh * s;
    o.imageSmoothingQuality = 'high';
    o.drawImage(big, x0, y0, bw, bh, (size - dw) / 2, (size - dh) / 2, dw, dh);
  }
  const url = out.toDataURL('image/png');
  cache.set(id, url);
  return url;
}
