/**
 * Canvas geometry for Game A, kept out of the engine on purpose: the menu draws
 * the live weapon preview with exactly these numbers, and importing them from
 * `Game.ts` would drag the whole engine (art, FX, ported slides) into the first
 * chunk instead of its own lazily loaded one.
 */
export const W = 420;
export const H = 760;
export const CX = W / 2;
export const BASE_WHEEL_CY = 255;
export const CY = Math.round(BASE_WHEEL_CY * (1 - 0.28)); // 28% higher wheel position (184)
export const SPECIAL_CY = CY; // Bonus / Special stage wheel sits at the same vertical position as the normal wheel.

export function initialGameplayWheelCenterY(boss = false, special = false) {
  if (special) return SPECIAL_CY;
  return boss ? CY + 36 : CY;
}

export const GAMEPLAY_GUN_SCALE = 1.08; // -10% from 1.2x (1.2 * 0.9 = 1.08)
export const GUN_Y = H - Math.round(185 * GAMEPLAY_GUN_SCALE); // muzzle tip raised so +20% gun never clips bottom
