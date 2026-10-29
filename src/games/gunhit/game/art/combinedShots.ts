import { drawProjectile } from './projectiles';

/**
 * These are visual layers only. The caller owns exactly one projectile and one
 * collision; never run a second weapon's fire/hit recipe here.
 */
export function drawIronmanCombo(
  c: CanvasRenderingContext2D, x: number, y: number, time: number, drawGauntletFour: () => void,
) {
  // Effect 4 supplies the flying glove, exhaust, impact and wheel mark. Put
  // effect 2's red/gold repulsor face over it, keeping the glove and fire visible.
  drawGauntletFour();
  c.save();
  c.translate(x, y - 29);
  c.scale(1.15, 1.15);
  c.globalAlpha *= 0.88;
  drawProjectile(c, 'gauntlet_cannon', 46, time, 0, false, 'new');
  c.restore();
}

/** Effect 3 keeps its CrystalShot collision and growth, but flies as effect 2. */
export function drawCrystalEffectTwo(c: CanvasRenderingContext2D, x: number, y: number, time: number) {
  c.save();
  c.translate(x, y - 4);
  drawProjectile(c, 'crystal', 44, time, 0, false, 'new');
  c.restore();
}
