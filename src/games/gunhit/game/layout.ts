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

/**
 * The weapon package: 20% smaller than the 1.08x rig that was tuned before it.
 */
export const GUN_PACKAGE_SCALE = 0.8;

/**
 * The board-side packages — the wheel it shoots at (rim gems, coins and
 * everything buried in it), the boss head, the Diamond Breaker rock and the
 * treasure chest — are 10% smaller, not 20% (corrected request).
 *
 * The board's radius is the single knob behind all four: gems, coins, knives
 * and the boss' artwork are radius-derived, so they shrink together instead of
 * drifting apart piece by piece.
 */
export const BOARD_PACKAGE_SCALE = 0.9;

/** The weapon rig itself. */
export const GAMEPLAY_GUN_SCALE = 1.08 * GUN_PACKAGE_SCALE; // 0.864

/** The ordinary wheel's radius, kept here so the muzzle gap stays measurable. */
const WHEEL_RADIUS = 106;
/** Muzzle Y the 1.08x rig used: the gap it left is the one that grows. */
const PREVIOUS_GUN_Y = H - Math.round(185 * 1.08); // 560

/**
 * The weapon also stands 20% farther from whatever it shoots at.
 *
 * The gap is muzzle tip -> nearest rim, so shrinking the board on its own would
 * already open it a little; growing it by a fifth on top is what the request
 * asks for. `GUN_Y` is solved from that gap instead of an art-extent rule, then
 * held above the arm's own reach (muzzle 600 + arm 160 = 760) so the shorter
 * rig is never cut off by the bottom edge.
 */
export const GUN_GAP_GROWTH = 1.2;
/** How far this rig's arm reaches below its muzzle (`185 * scale`). */
const RIG_FOOT = Math.round(185 * GAMEPLAY_GUN_SCALE); // 160
export const GUN_Y = Math.min(
  // The bottom of the screen wins: a muzzle lower than this would cut the grip
  // off, so the gap keeps 1.19x instead of a clipped 1.2x.
  H - RIG_FOOT,
  CY + Math.round(WHEEL_RADIUS * BOARD_PACKAGE_SCALE)
    + Math.round((PREVIOUS_GUN_Y - (CY + WHEEL_RADIUS)) * GUN_GAP_GROWTH),
); // 600
/**
 * How far the landscape presentation lifts the weapon rig in world space.
 *
 * Landscape turns the world on its side, so world Y becomes screen X and the
 * gun's grip would otherwise sit flush against — and slightly past — the left
 * edge of the screen. Lifting the rig by this many world units moves it right
 * on screen without changing the weapon, its scale or its firing lane.
 */
export const LAND_GUN_LIFT = 30;

/**
 * Landscape presentation.
 *
 * The engine simulates in its original portrait world (W x H) and never learns
 * about the screen it is shown on. In landscape mode the same world is laid on
 * its side: the display canvas swaps to H x W and the world is rotated 90°
 * clockwise around the top-left of the display.
 *
 * That single rotation buys every part of the requested layout at once, because
 * world "up" becomes screen "right":
 *
 *   world (x, y)  ->  display (H - y, x)
 *
 *   gun   (CX, GUN_Y)  ->  (H - GUN_Y, CX)      bottom-centre -> left-centre
 *   wheel (CX, CY)     ->  (H - CY, CX)         top-centre    -> right-centre
 *   muzzle direction (0, -1) -> (1, 0)          up            -> right
 *   world top edge y = 0     -> display x = H   enemies spawn there, so they
 *                                                  arrive from the RIGHT
 */
export const LAND_W = H; // 760 — landscape display width
export const LAND_H = W; // 420 — landscape display height

/** Canvas backing-store / CSS size for the given orientation. */
export function displaySize(orientation: 'portrait' | 'landscape'): { w: number; h: number } {
  return orientation === 'landscape' ? { w: LAND_W, h: LAND_H } : { w: W, h: H };
}

/**
 * World -> display mapping, expressed as the six values `setTransform` takes
 * (a, b, c, d, e, f) already multiplied by the pixel scale `k`. Portrait is the
 * identity; landscape is the 90° clockwise rotation described above.
 */
export function worldTransform(
  orientation: 'portrait' | 'landscape',
  k: number,
): [number, number, number, number, number, number] {
  if (orientation !== 'landscape') return [k, 0, 0, k, 0, 0];
  return [0, k, -k, 0, H * k, 0];
}

/**
 * Inverse of `worldTransform`: display pixels -> world coordinates. `nx`/`ny`
 * are normalised display coordinates in 0..1, which is what a pointer event
 * gives once it is divided by the element's bounding rect.
 */
export function displayToWorld(
  orientation: 'portrait' | 'landscape',
  nx: number,
  ny: number,
): { x: number; y: number } {
  if (orientation !== 'landscape') return { x: nx * W, y: ny * H };
  // display X = H - y  ->  y = H - nx * H
  // display Y = x      ->  x = ny * W
  return { x: ny * W, y: (1 - nx) * H };
}

