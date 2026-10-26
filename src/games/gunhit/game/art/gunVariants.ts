import type { WeaponId } from '../weapons';

/** These two have been retired to their original art AND shot only. */
export const FIXED_CLASSIC_WEAPONS = ['plasma', 'laser'] as const satisfies readonly WeaponId[];
export type FixedClassicWeapon = (typeof FIXED_CLASSIC_WEAPONS)[number];

/** Only guns with an actual design choice appear in the DESAIN tab. */
export const EDITABLE_WEAPONS = [
  'dragon', 'diamond', 'rainbow', 'meteor', 'golden', 'moonbeam', 'chicken', 'honey',
  'cricket', 'fish', 'electro',
  // Slide-2 guns: the old slide-1 art is kept as "Sebelumnya", the slide-2
  // art (and its shot) is the new default.
  'blackhole',
  // SET 1 of slide 7 (`Weapon Hit 71 Senjata`): KETAPEL, SUMPIT DAYAK,
  // SHOTGUN and SUPER SOAKER get slide 7's own art as a "Set 1" card.
  'slingshot', 'blowgun', 'shotgun', 'soaker',
] as const satisfies readonly WeaponId[];

/**
 * Slide-7 SET 1 weapons that exist on slide 1 under the same name. Their
 * newest design is the real slide-7 artwork (`setOneArt.drawSetOneGun`), so
 * they get an extra "Set 1" design card that is selected by default.
 */
export const SET_ONE_DESIGN_WEAPONS = [
  'golden', 'blackhole', 'slingshot', 'blowgun', 'shotgun', 'soaker',
] as const satisfies readonly WeaponId[];
export type SetOneDesignWeapon = (typeof SET_ONE_DESIGN_WEAPONS)[number];

export function isSetOneDesignWeapon(id: WeaponId | 'old'): id is SetOneDesignWeapon {
  return (SET_ONE_DESIGN_WEAPONS as readonly string[]).includes(id);
}
/**
 * Guns that only ever had ONE old look on slide 1, so the picker offers two
 * cards instead of three: "Sebelumnya" (slide-1 art) and "Terbaru" (slide 2).
 */
// No gun is limited to two cards any more: BLACK HOLE gained the slide-7 staff
// as a third silhouette, and the SET 1 guns gained their own card.
export const TWO_CARD_WEAPONS = [] as const satisfies readonly WeaponId[];
export type EditableWeapon = (typeof EDITABLE_WEAPONS)[number];
/** Guns whose previous/current/latest renderers are three distinct designs. */
const NO_LATEST_DESIGN = ['honey', 'cricket', 'fish', 'electro', 'slingshot', 'blowgun', 'shotgun', 'soaker'] as const;
export type LatestDesignWeapon = Exclude<EditableWeapon, (typeof NO_LATEST_DESIGN)[number]>;
export const VARIANT_WEAPONS = [...EDITABLE_WEAPONS, ...FIXED_CLASSIC_WEAPONS] as const;
export type VariantWeapon = (typeof VARIANT_WEAPONS)[number];

export type GunVariant = 'original' | 'current' | 'latest' | 'set1';
export const GUN_VARIANTS: readonly { id: GunVariant; label: string }[] = [
  { id: 'original', label: 'Sebelumnya' },
  { id: 'current', label: 'Sekarang' },
  { id: 'latest', label: 'Terbaru' },
];
/** The slide-7 SET 1 design card (newest for its six weapons). */
export const SET_ONE_VARIANT: { id: GunVariant; label: string } = { id: 'set1', label: 'Set 1' };
export type GunEffect = 'original' | 'new';
export const GUN_EFFECTS: readonly { id: GunEffect; label: string }[] = [
  { id: 'original', label: 'Sebelumnya' },
  { id: 'new', label: 'Baru' },
];

export function isFixedClassicGun(id: WeaponId | 'old'): id is FixedClassicWeapon {
  return (FIXED_CLASSIC_WEAPONS as readonly string[]).includes(id);
}
export function canChooseGunDesign(id: WeaponId | 'old'): id is EditableWeapon {
  return (EDITABLE_WEAPONS as readonly string[]).includes(id);
}
export function supportsGunVariants(id: WeaponId | 'old'): id is VariantWeapon {
  return isFixedClassicGun(id) || canChooseGunDesign(id);
}
export function supportsLatestDesign(id: VariantWeapon): id is LatestDesignWeapon {
  return !isFixedClassicGun(id) && !(NO_LATEST_DESIGN as readonly string[]).includes(id);
}

export function isTwoCardGun(id: WeaponId | 'old'): boolean {
  return (TWO_CARD_WEAPONS as readonly string[]).includes(id);
}

export function getGunVariantOptions(id: VariantWeapon) {
  if (isFixedClassicGun(id)) return GUN_VARIANTS.slice(0, 1);
  // SET 1 weapons: the slide-1 silhouette(s) plus slide 7's own artwork, which
  // is the newest design and therefore the default.
  if (isSetOneDesignWeapon(id)) {
    // GOLDEN GUN already has three genuine slide-1 designs, so it keeps all of
    // them and gains "Set 1" as a fourth card.
    if (id === 'golden') return [...GUN_VARIANTS, SET_ONE_VARIANT];
    // The BLACK HOLE cannon keeps its slide-2 look as "Terbaru" next to the
    // slide-7 staff, which is what the default now points at.
    if (id === 'blackhole') return [GUN_VARIANTS[0], GUN_VARIANTS[2], SET_ONE_VARIANT];
    // The other four only ever had one slide-1 look.
    return [GUN_VARIANTS[0], SET_ONE_VARIANT];
  }
  // Only two genuine silhouettes: the old slide-1 art and the slide-2 art.
  if (isTwoCardGun(id)) return [GUN_VARIANTS[0], GUN_VARIANTS[2]];
  // These have a previous/current comparison only; don't offer a fake third
  // card whose renderer would duplicate one of those two designs.
  return (NO_LATEST_DESIGN as readonly string[]).includes(id)
    ? GUN_VARIANTS.slice(0, 2) : GUN_VARIANTS;
}
export function getGunEffectOptions(id: VariantWeapon) {
  return isFixedClassicGun(id) ? GUN_EFFECTS.slice(0, 1) : GUN_EFFECTS;
}

// User-requested loadouts. A new save key makes these take effect even for a
// player whose earlier choices were stored in v1; further picks persist in v2.
const DEFAULT_DESIGNS: Record<EditableWeapon, GunVariant> = {
  dragon: 'original', diamond: 'latest', rainbow: 'original', meteor: 'original',
  moonbeam: 'original', chicken: 'latest', honey: 'original',
  cricket: 'current', fish: 'current', electro: 'current',
  // Slide-7 SET 1 is the newest arsenal, so its own artwork is the default for
  // the six guns slide 1 shares with it.
  golden: 'set1', blackhole: 'set1', slingshot: 'set1', blowgun: 'set1',
  shotgun: 'set1', soaker: 'set1',
};
const DEFAULT_EFFECTS: Record<EditableWeapon, GunEffect> = {
  dragon: 'new', diamond: 'new', rainbow: 'new', meteor: 'new',
  moonbeam: 'original', chicken: 'new', honey: 'new',
  cricket: 'new', fish: 'new', electro: 'new',
  // The slide-7 SET 1 shot (its muzzle recipe, trail, impact burst and its own
  // sounds) is the newest effect for these six.
  golden: 'new', blackhole: 'new', slingshot: 'new', blowgun: 'new',
  shotgun: 'new', soaker: 'new',
};

function readChoices(key: string): Record<string, unknown> | null {
  try {
    const raw = globalThis.localStorage?.getItem(key);
    if (!raw) return null;
    const value: unknown = JSON.parse(raw);
    return value && typeof value === 'object' && !Array.isArray(value)
      ? value as Record<string, unknown> : null;
  } catch { return null; /* Storage may be disabled or contain malformed JSON. */ }
}

const DESIGN_KEY = 'gunhit:gun-designs:v3';
const EFFECT_KEY = 'gunhit:shot-effects:v3';
const saved: Partial<Record<EditableWeapon, GunVariant>> = {};
const effects: Partial<Record<EditableWeapon, GunEffect>> = {};

const designsOnDisk = readChoices(DESIGN_KEY);
const effectsOnDisk = readChoices(EFFECT_KEY);
for (const id of EDITABLE_WEAPONS) {
  const design = designsOnDisk?.[id];
  if (getGunVariantOptions(id).some(option => option.id === design)) saved[id] = design as GunVariant;
  const effect = effectsOnDisk?.[id];
  if (getGunEffectOptions(id).some(option => option.id === effect)) effects[id] = effect as GunEffect;
}
// Rubber Chicken wasn't changed by this request: preserve its v1 choices
// when migrating, but supersede the old saves for the newly specified guns.
if (!designsOnDisk) {
  const chicken = readChoices('gunhit:gun-designs:v1')?.chicken;
  if (getGunVariantOptions('chicken').some(option => option.id === chicken)) saved.chicken = chicken as GunVariant;
}
if (!effectsOnDisk) {
  const chicken = readChoices('gunhit:shot-effects:v1')?.chicken;
  if (getGunEffectOptions('chicken').some(option => option.id === chicken)) effects.chicken = chicken as GunEffect;
}

/** Defaults change only the silhouette, never weapon stats or mechanics. */
export function getGunVariant(id: WeaponId): GunVariant {
  if (isFixedClassicGun(id)) return 'original';
  return canChooseGunDesign(id) ? saved[id] ?? DEFAULT_DESIGNS[id] : 'current';
}

export function setGunVariant(id: EditableWeapon, variant: GunVariant): void {
  if (!getGunVariantOptions(id).some(option => option.id === variant)) return;
  saved[id] = variant;
  try { globalThis.localStorage?.setItem(DESIGN_KEY, JSON.stringify(saved)); }
  catch { /* Continue using this session's choice if storage is unavailable. */ }
}

/** Shot appearance remains independent from the gun's physical design. */
export function getGunEffect(id: WeaponId | 'old'): GunEffect {
  if (isFixedClassicGun(id)) return 'original';
  return canChooseGunDesign(id) ? effects[id] ?? DEFAULT_EFFECTS[id] : 'new';
}

export function setGunEffect(id: EditableWeapon, effect: GunEffect): void {
  effects[id] = effect;
  try { globalThis.localStorage?.setItem(EFFECT_KEY, JSON.stringify(effects)); }
  catch { /* Continue using this session's choice if storage is unavailable. */ }
}
