/**
 * PERFECT SHOT — v2 projectile catalogue.
 *
 * The whole weapon system of Perfect Shot, reduced to what the gameplay reads:
 * a draw time, a colour and the silhouette that flies to the wheel. Everything
 * else about a weapon (art, shop rows, rarity, upgrade curves) belongs to the
 * host project, not to the run.
 */

export type Shape = 'knife' | 'arrow' | 'bullet' | 'disc' | 'spark';

export interface Weapon {
  /** Stable id; the host stores this in its own save. */
  id: string;
  /** Display name, already localised by the host if it wants. */
  name: string;
  /** Seconds between two shots. */
  cooldown: number;
  /** Silhouette that flies to the wheel and stays stuck in it. */
  shape: Shape;
  /** `r,g,b` — the glow, the trail and the stuck knife all use it. */
  rgb: string;
}

export const WEAPONS: readonly Weapon[] = [
  { id: 'knife', name: 'Knife', cooldown: 0.26, shape: 'knife', rgb: '235,240,255' },
  { id: 'arrow', name: 'Arrow', cooldown: 0.32, shape: 'arrow', rgb: '255,230,180' },
  { id: 'bullet', name: 'Bullet', cooldown: 0.19, shape: 'bullet', rgb: '255,206,120' },
  { id: 'disc', name: 'Disc', cooldown: 0.42, shape: 'disc', rgb: '40,230,255' },
  { id: 'plasma', name: 'Plasma', cooldown: 0.52, shape: 'spark', rgb: '150,215,255' },
];

/** Fall back to the first weapon for an id the host does not know. */
export function weaponById(id: string | null | undefined): Weapon {
  return WEAPONS.find((w) => w.id === id) ?? WEAPONS[0];
}
