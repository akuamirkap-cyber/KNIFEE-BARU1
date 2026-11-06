/** Original Gun Hit / PERFECT SHOT portrait geometry; no other stages are included. */
export const W = 420;
export const H = 760;
export const CX = W / 2;
export const CY = 154;
export const GUN_Y = 552;
export const GAMEPLAY_GUN_SCALE = 1.08 * 1.037;
export const TAU = Math.PI * 2;
export const LEVEL_COUNT = 1;
export const WEAPON_COUNT = 1;
export const TITLE = 'PERFECT SHOT';
export type Orientation = 'portrait' | 'landscape';
export function worldTransform(orientation: Orientation, k: number): [number, number, number, number, number, number] {
  return orientation === 'portrait' ? [k, 0, 0, k, 0, 0] : [0, k, -k, 0, H * k, 0];
}

export function displaySize(orientation: Orientation): { w: number; h: number } { return orientation === 'portrait' ? { w: W, h: H } : { w: H, h: W }; }
