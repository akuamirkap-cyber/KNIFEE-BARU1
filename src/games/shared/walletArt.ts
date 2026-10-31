/**
 * The wallet artwork used across the app's menus, drawn on a 2D canvas so the
 * gameplay HUD and the in-game pickups can wear the *same* coin as the
 * collection screen instead of a second, unrelated design.
 *
 * The shapes are the two icons the armory wallet already shows:
 *  - `Coins` (Lucide): two overlapping coins, a "1" and a diagonal shine,
 *    inside the amber badge (`from-yellow-300 to-amber-500`, `border-amber-200/60`).
 *  - `DiamondSprite`: the project's own faceted diamond (`drawBreakerDiamond`),
 *    which the wallet renders at 76 % of its box.
 */
type C = CanvasRenderingContext2D;

const TAU = Math.PI * 2;

/** Lucide `coins`: two circles, the small "1" tick and the highlight slash. */
export function drawWalletCoinsGlyph(c: C, size: number, color: string, lineWidth: number) {
  const k = size / 24;
  c.save();
  c.translate(-size / 2, -size / 2);
  c.scale(k, k);
  c.strokeStyle = color;
  c.lineWidth = lineWidth / k;
  c.lineCap = 'round';
  c.lineJoin = 'round';
  // <circle cx="8" cy="8" r="6" />
  c.beginPath();
  c.arc(8, 8, 6, 0, TAU);
  c.stroke();
  // <path d="M18.09 10.37A6 6 0 1 1 10.34 18" />
  c.beginPath();
  c.arc(16, 16, 6, -1.215, 2.801);
  c.stroke();
  // <path d="M7 6h1v4" />
  c.beginPath();
  c.moveTo(7, 6);
  c.lineTo(8, 6);
  c.lineTo(8, 10);
  c.stroke();
  // <path d="m16.71 13.88.7.71-2.82 2.82" />
  c.beginPath();
  c.moveTo(16.71, 13.88);
  c.lineTo(17.41, 14.59);
  c.lineTo(14.59, 17.41);
  c.stroke();
  c.restore();
}

/**
 * The armory's coin badge: a `yellow-300 → amber-500` disc with the
 * `amber-200/60` rim and the dark amber `Coins` glyph.
 */
export function drawWalletCoin(c: C, x: number, y: number, r: number, spin = 1, glowing = false) {
  c.save();
  c.translate(x, y);
  if (glowing) {
    const halo = c.createRadialGradient(0, 0, r * 0.4, 0, 0, r * 1.9);
    halo.addColorStop(0, 'rgba(253,224,71,0.42)');
    halo.addColorStop(1, 'rgba(253,224,71,0)');
    c.fillStyle = halo;
    c.beginPath();
    c.arc(0, 0, r * 1.9, 0, TAU);
    c.fill();
  }
  // The classic coin flip: the badge turns on its own axis.
  c.scale(Math.max(0.08, spin), 1);
  const face = c.createLinearGradient(0, -r, 0, r);
  face.addColorStop(0, '#fde047');
  face.addColorStop(0.55, '#fbbf24');
  face.addColorStop(1, '#f59e0b');
  c.beginPath();
  c.arc(0, 0, r, 0, TAU);
  c.fillStyle = face;
  c.fill();
  c.lineWidth = Math.max(1, r * 0.1);
  c.strokeStyle = 'rgba(253,230,138,0.6)';
  c.stroke();
  // Soft top-left sheen, the badge's `shadow` in the wallet.
  c.beginPath();
  c.arc(0, 0, r * 0.82, Math.PI * 1.06, Math.PI * 1.72);
  c.strokeStyle = 'rgba(255,255,255,0.5)';
  c.lineWidth = Math.max(1, r * 0.14);
  c.stroke();
  drawWalletCoinsGlyph(c, r * 1.34, '#451a03', Math.max(1, r * 0.15));
  c.restore();
}
