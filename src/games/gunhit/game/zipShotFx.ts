/**
 * The zip weapons' own shot (`svg-weapons-with-glow-animation.zip`, "Skin 3").
 *
 * The zip draws every round as a faceted crystal: a white crown, an ice-blue
 * pavilion and a big faceted crystal at the muzzle. Slide 2 already paints that
 * exact gem for its Diamond Gun (`drawSlide2DiamondBullet`), so that is reused
 * here instead of a second copy. The zip's own muzzle flash is a CSS animation
 * on its SVG (`ZipWeaponOverlay` restarts it per shot), so no canvas copy is
 * needed either.
 *
 * Kept in its own module, importing nothing but the slide-2 gem painter, so the
 * menu, the arsenal cards and the engine all read the same look without any of
 * them dragging the others in.
 */
import { drawSlide2DiamondBullet } from './diamondSlideFx';

/** True when the equipped weapon fires the zip's faceted crystal round. */
export function isZipShot(id: string | null | undefined, effect: string): boolean {
  return effect === 'zip' && (id === 'diamond' || id === 'blaster' || id === 'paintball' || id === 'shark' || id === 'heat_ray');
}

/**
 * The zip's round, drawn tip-up like every other projectile sprite: the gem's
 * pavilion points along the flight, its halo is the zip's ice-blue glow.
 */
export function drawZipCrystalRound(
  c: CanvasRenderingContext2D,
  len: number,
  t: number,
  seed = 0,
  flash = 0,
  embedded = false,
): void {
  c.save();
  // The gem is authored ~46 px tall; every screen asks for its own round size.
  const r = Math.max(7, Math.min(16, len * 0.34));
  c.translate(0, r * 0.55);
  if (!embedded) c.rotate(Math.sin(t * 3 + seed) * 0.2);
  drawSlide2DiamondBullet(c, r, t, seed, flash);
  c.restore();
}
