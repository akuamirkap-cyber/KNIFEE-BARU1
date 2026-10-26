/**
 * Slide-7 (`games/game-4` / `Weapon Hit 71 Senjata`) artwork for slide 1.
 *
 * SET 2..5 share 36 weapon ids with slide 1 (only FLAMETHROWER is called
 * `flame` there), so this is a rename table, not a redraw: the art is slide 7's
 * real `drawWeapon()` (`weapons.ts` + `weaponArt.ts`), drawn at slide 1's muzzle
 * origin with slide 7's own `WeaponAnim`.
 */
import { drawWeapon } from '../../../../games/game-4/src/game/weaponArt';
import { newAnim, type WeaponAnim, type WeaponId } from '../../../../games/game-4/src/game/weapons';

/** Which slide-7 set each ported weapon comes from. */
export const SET_SEVEN_SETS = {
  snowball: 2, sniper: 2, flame: 2, bubble: 2, bamboo: 2, banana: 2,
  harpoon: 3, chicken: 3, confetti: 3, seed: 3, pizza: 3, minigun: 3,
  crossbow: 3, plasma: 3, laser: 3,
  dragon: 4, gravity: 4, honey: 4, coconut: 4, angklung: 4, bee: 4,
  sakura: 4, firework: 4, keris: 4,
  moonbeam: 5, storm: 5, pencil: 5, sandal: 5, paintball: 5, wand: 5,
  shark: 5, ghost: 5, ufo: 5, rainbow: 5, meteor: 5, diamond: 5,
} as const;

/** Which slide-7 set a ported weapon belongs to (2..5). */
export function setSevenSetOf(id: SevenId): number {
  return SET_SEVEN_SETS[id];
}

/** Slide-1 gun id -> slide-7 id (identical except `flamethrower`). */
export const SET_SEVEN_BY_SLIDE1_ID = {
  snowball: 'snowball',
  sniper: 'sniper',
  flamethrower: 'flame',
  bubble: 'bubble',
  bamboo: 'bamboo',
  banana: 'banana',
  harpoon: 'harpoon',
  chicken: 'chicken',
  confetti: 'confetti',
  seed: 'seed',
  pizza: 'pizza',
  minigun: 'minigun',
  crossbow: 'crossbow',
  plasma: 'plasma',
  laser: 'laser',
  dragon: 'dragon',
  gravity: 'gravity',
  honey: 'honey',
  coconut: 'coconut',
  angklung: 'angklung',
  bee: 'bee',
  sakura: 'sakura',
  firework: 'firework',
  keris: 'keris',
  moonbeam: 'moonbeam',
  storm: 'storm',
  pencil: 'pencil',
  sandal: 'sandal',
  paintball: 'paintball',
  wand: 'wand',
  shark: 'shark',
  ghost: 'ghost',
  ufo: 'ufo',
  rainbow: 'rainbow',
  meteor: 'meteor',
  diamond: 'diamond',
} as const satisfies Record<string, WeaponId>;

export type SevenSlide1Id = keyof typeof SET_SEVEN_BY_SLIDE1_ID;
export type SevenId = (typeof SET_SEVEN_BY_SLIDE1_ID)[SevenSlide1Id];

/** The 36 slide-7 ids of SET 2..5. */
export const SET_SEVEN_IDS = Object.values(SET_SEVEN_BY_SLIDE1_ID) as SevenId[];

/** The 36 slide-1 ids that carry a slide-7 weapon. */
export const SET_SEVEN_SLIDE1_IDS = Object.keys(SET_SEVEN_BY_SLIDE1_ID) as SevenSlide1Id[];

/** The slide-7 weapon behind a slide-1 gun, or null. */
export function setSevenIdFor(id: string): SevenId | null {
  return (SET_SEVEN_BY_SLIDE1_ID as Record<string, SevenId>)[id] ?? null;
}

/** Is this a slide-7 id of SET 2..5? */
export function isSevenId(id: string): id is SevenId {
  return id in SET_SEVEN_IDS_SET;
}

const SET_SEVEN_IDS_SET = new Set<string>(SET_SEVEN_IDS);

/** The slide-1 gun that carries a slide-7 weapon. */
export function slide1IdFor(id: SevenId): SevenSlide1Id {
  return SET_SEVEN_SLIDE1_IDS.find((k) => SET_SEVEN_BY_SLIDE1_ID[k] === id) as SevenSlide1Id;
}

/**
 * Draw slide 7's own weapon art, translated to slide 1's muzzle origin.
 * `anim` is slide 7's animation state (see `setSevenAnim.ts`).
 */
export function drawSetSevenGun(
  c: CanvasRenderingContext2D,
  id: SevenId,
  cx: number,
  y0: number,
  time: number,
  anim: WeaponAnim,
) {
  c.save();
  c.translate(cx, y0);
  drawWeapon(c, id, anim, time);
  c.restore();
}

/** Slide 7's pose at rest: menus, cards and any frame without a live gun. */
export function restSevenAnim(): WeaponAnim {
  const a = newAnim();
  a.intro = 1;
  a.fireT = 99;
  a.orb = 1;
  a.gauge = 0.92;
  a.charge = 0;
  return a;
}
