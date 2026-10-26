import type { WeaponId } from '../weapons';
import { SET_SEVEN_BY_SLIDE1_ID, SET_SEVEN_SETS } from '../setSevenArt';

/** These two have been retired to their original art AND shot only. */
export const FIXED_CLASSIC_WEAPONS = ['plasma', 'laser'] as const satisfies readonly WeaponId[];
export type FixedClassicWeapon = (typeof FIXED_CLASSIC_WEAPONS)[number];

/** Only guns with an actual design choice appear in the DESAIN tab. */
export const EDITABLE_WEAPONS = [
  'dragon', 'diamond', 'rainbow', 'meteor', 'golden',
  'moonbeam', 'chicken', 'honey', 'cricket', 'fish',
  'electro', 'blackhole', 'slingshot', 'blowgun', 'shotgun',
  'soaker', 'snowball', 'sniper', 'flamethrower', 'bubble',
  'bamboo', 'banana', 'harpoon', 'confetti', 'seed',
  'pizza', 'minigun', 'crossbow', 'gravity', 'coconut',
  'angklung', 'bee', 'sakura', 'firework', 'keris',
  'storm', 'pencil', 'sandal', 'paintball', 'wand',
  'shark', 'ghost', 'ufo', 'rpg', 'bazooka',
  'freeze', 'railgun', 'magnet', 'shrink', 'grow',
  'pirate', 'card', 'holy', 'unicorn', 'obliterator',
  'coingun', 'photon_saber', 'gauntlet_cannon', 'ruby', 'emerald',
  'sapphire', 'crystal', 'beerifle', 'buster', 'pulse_rifle',
  'cryo_blaster', 'hyperdrive', 'quantum_destabilizer', 'blaster',
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
 * Slide-7 SET 2..5 weapons. Their newest design is slide 7's own artwork
 * (`setSevenArt.drawSetSevenGun`), which becomes the default; the slide-1
 * silhouette they had before stays pickable as its own card.
 */
export const SET_SEVEN_DESIGN_WEAPONS = [
  'snowball', 'sniper', 'flamethrower', 'bubble', 'bamboo',
  'banana', 'harpoon', 'chicken', 'confetti', 'seed',
  'pizza', 'minigun', 'crossbow', 'dragon', 'gravity',
  'honey', 'coconut', 'angklung', 'bee', 'sakura',
  'firework', 'keris', 'moonbeam', 'storm', 'pencil',
  'sandal', 'paintball', 'wand', 'shark', 'ghost',
  'ufo', 'rainbow', 'meteor', 'diamond', 'fish',
  'rpg', 'cricket', 'electro', 'bazooka', 'freeze',
  'railgun', 'magnet', 'shrink', 'grow', 'pirate',
  'card', 'holy', 'unicorn', 'obliterator', 'coingun',
  'photon_saber', 'gauntlet_cannon', 'ruby', 'emerald', 'sapphire',
  'crystal', 'beerifle', 'buster', 'pulse_rifle', 'cryo_blaster',
  'hyperdrive', 'quantum_destabilizer', 'blaster',
] as const satisfies readonly WeaponId[];
export type SetSevenDesignWeapon = (typeof SET_SEVEN_DESIGN_WEAPONS)[number];

export function isSetSevenDesignWeapon(id: WeaponId | 'old'): id is SetSevenDesignWeapon {
  return (SET_SEVEN_DESIGN_WEAPONS as readonly string[]).includes(id);
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
const NO_LATEST_DESIGN = [
  'honey', 'cricket', 'fish', 'electro', 'slingshot',
  'blowgun', 'shotgun', 'soaker', 'snowball', 'sniper',
  'flamethrower', 'bubble', 'bamboo', 'banana', 'harpoon',
  'confetti', 'seed', 'pizza', 'minigun', 'crossbow',
  'gravity', 'coconut', 'angklung', 'bee', 'sakura',
  'firework', 'keris', 'storm', 'pencil', 'sandal',
  'paintball', 'wand', 'shark', 'ghost', 'ufo',
  'rpg', 'bazooka', 'freeze', 'railgun', 'magnet',
  'shrink', 'grow', 'pirate', 'card', 'holy',
  'unicorn', 'obliterator', 'coingun', 'photon_saber', 'gauntlet_cannon',
  'ruby', 'emerald', 'sapphire', 'crystal', 'beerifle',
  'buster', 'pulse_rifle', 'cryo_blaster', 'hyperdrive', 'quantum_destabilizer',
  'blaster',
] as const;

/**
 * Guns whose "Sebelumnya" art is NOT a separate silhouette: slide 1 only ever
 * drew them one way, and that drawing is the gun's normal renderer. They are
 * excluded from `drawOriginalGun` so nothing is duplicated.
 */
export const NO_SEPARATE_ORIGINAL = [
  'snowball', 'sniper', 'flamethrower', 'bubble', 'bamboo',
  'banana', 'harpoon', 'confetti', 'seed', 'pizza',
  'minigun', 'crossbow', 'gravity', 'coconut', 'angklung',
  'bee', 'sakura', 'firework', 'keris', 'storm',
  'pencil', 'sandal', 'paintball', 'wand', 'shark',
  'ghost', 'ufo', 'rpg', 'bazooka', 'freeze',
  'railgun', 'magnet', 'shrink', 'grow', 'pirate',
  'card', 'holy', 'unicorn', 'obliterator', 'coingun',
  'photon_saber', 'gauntlet_cannon', 'ruby', 'emerald', 'sapphire',
  'crystal', 'beerifle', 'buster', 'pulse_rifle', 'cryo_blaster',
  'hyperdrive', 'quantum_destabilizer', 'blaster',
] as const;
export type OriginalDesignWeapon = Exclude<VariantWeapon, (typeof NO_SEPARATE_ORIGINAL)[number]>;
export function hasSeparateOriginal(id: VariantWeapon): id is OriginalDesignWeapon {
  return !(NO_SEPARATE_ORIGINAL as readonly string[]).includes(id);
}
export type LatestDesignWeapon = Exclude<EditableWeapon, (typeof NO_LATEST_DESIGN)[number]>;
export const VARIANT_WEAPONS = [...EDITABLE_WEAPONS, ...FIXED_CLASSIC_WEAPONS] as const;
export type VariantWeapon = (typeof VARIANT_WEAPONS)[number];

export type GunVariant = 'original' | 'current' | 'latest' | 'set1' | 'set7';
export const GUN_VARIANTS: readonly { id: GunVariant; label: string }[] = [
  { id: 'original', label: 'Sebelumnya' },
  { id: 'current', label: 'Sekarang' },
  { id: 'latest', label: 'Terbaru' },
];
/** The slide-7 SET 1 design card (newest for its six weapons). */
export const SET_ONE_VARIANT: { id: GunVariant; label: string } = { id: 'set1', label: 'Set 1' };
/** The slide-7 SET 2..5 design card; the number is the weapon's own set. */
export function setSevenVariant(id: SetSevenDesignWeapon): { id: GunVariant; label: string } {
  return { id: 'set7', label: `Set ${SET_SEVEN_SETS[SET_SEVEN_BY_SLIDE1_ID[id]]}` };
}
export type GunEffect = 'original' | 'new' | 'set7';
export const GUN_EFFECTS: readonly { id: GunEffect; label: string }[] = [
  { id: 'original', label: 'Sebelumnya' },
  { id: 'new', label: 'Baru' },
];
/** The slide-7 shot card of SET 2..5, labelled with the weapon's own set. */
export function setSevenEffect(id: SetSevenDesignWeapon): { id: GunEffect; label: string } {
  return { id: 'set7', label: `Set ${SET_SEVEN_SETS[SET_SEVEN_BY_SLIDE1_ID[id]]}` };
}

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
  // SET 2..5 weapons: the slide-1 silhouette(s) they already had, plus slide
  // 7's own artwork as the newest card (and the default).
  if (isSetSevenDesignWeapon(id)) {
    const card = setSevenVariant(id);
    // HONEY already had a second silhouette ("Sekarang"), keep it.
    if (id === 'honey') return [...GUN_VARIANTS.slice(0, 2), card];
    // Three genuine slide-1 designs: keep all of them, slide 7 last.
    if (supportsLatestDesign(id as LatestDesignWeapon)) return [...GUN_VARIANTS, card];
    // Guns whose slide-1 art is a separate "Sebelumnya" design (CRICKET, FISH,
    // ELECTRO) keep both slide-1 cards and gain slide 7 as the newest.
    if (!(NO_SEPARATE_ORIGINAL as readonly string[]).includes(id)) {
      return [...GUN_VARIANTS.slice(0, 2), card];
    }
    // Every other ported gun only ever had one slide-1 look.
    return [GUN_VARIANTS[0], card];
  }
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
  if (isFixedClassicGun(id)) return GUN_EFFECTS.slice(0, 1);
  // Slide 7's own shot is a third card for SET 2..5: the two slide-1 effects
  // stay pickable, and slide 7 is the newest (and the default).
  if (isSetSevenDesignWeapon(id)) return [...GUN_EFFECTS, setSevenEffect(id)];
  return GUN_EFFECTS;
}

// User-requested loadouts. A new save key makes these take effect even for a
// player whose earlier choices were stored in v1; further picks persist in v2.
const DEFAULT_DESIGNS: Record<EditableWeapon, GunVariant> = {
  dragon: 'set7', diamond: 'set7', rainbow: 'set7', meteor: 'set7', golden: 'set1',
  moonbeam: 'set7', chicken: 'set7', honey: 'set7', cricket: 'set7', fish: 'set7',
  electro: 'set7', blackhole: 'set1', slingshot: 'set1', blowgun: 'set1', shotgun: 'set1',
  soaker: 'set1', snowball: 'set7', sniper: 'set7', flamethrower: 'set7', bubble: 'set7',
  bamboo: 'set7', banana: 'set7', harpoon: 'set7', confetti: 'set7', seed: 'set7',
  pizza: 'set7', minigun: 'set7', crossbow: 'set7', gravity: 'set7', coconut: 'set7',
  angklung: 'set7', bee: 'set7', sakura: 'set7', firework: 'set7', keris: 'set7',
  storm: 'set7', pencil: 'set7', sandal: 'set7', paintball: 'set7', wand: 'set7',
  shark: 'set7', ghost: 'set7', ufo: 'set7', rpg: 'set7', bazooka: 'set7',
  freeze: 'set7', railgun: 'set7', magnet: 'set7', shrink: 'set7', grow: 'set7',
  pirate: 'set7', card: 'set7', holy: 'set7', unicorn: 'set7', obliterator: 'set7',
  coingun: 'set7', photon_saber: 'set7', gauntlet_cannon: 'set7', ruby: 'set7', emerald: 'set7',
  sapphire: 'set7', crystal: 'set7', beerifle: 'set7', buster: 'set7', pulse_rifle: 'set7',
  cryo_blaster: 'set7', hyperdrive: 'set7', quantum_destabilizer: 'set7', blaster: 'set7',
};
const DEFAULT_EFFECTS: Record<EditableWeapon, GunEffect> = {
  dragon: 'set7', diamond: 'set7', rainbow: 'set7', meteor: 'set7', golden: 'new',
  moonbeam: 'set7', chicken: 'set7', honey: 'set7', cricket: 'set7', fish: 'set7',
  electro: 'set7', blackhole: 'new', slingshot: 'new', blowgun: 'new', shotgun: 'new',
  soaker: 'new', snowball: 'set7', sniper: 'set7', flamethrower: 'set7', bubble: 'set7',
  bamboo: 'set7', banana: 'set7', harpoon: 'set7', confetti: 'set7', seed: 'set7',
  pizza: 'set7', minigun: 'set7', crossbow: 'set7', gravity: 'set7', coconut: 'set7',
  angklung: 'set7', bee: 'set7', sakura: 'set7', firework: 'set7', keris: 'set7',
  storm: 'set7', pencil: 'set7', sandal: 'set7', paintball: 'set7', wand: 'set7',
  shark: 'set7', ghost: 'set7', ufo: 'set7', rpg: 'set7', bazooka: 'set7',
  freeze: 'set7', railgun: 'set7', magnet: 'set7', shrink: 'set7', grow: 'set7',
  pirate: 'set7', card: 'set7', holy: 'set7', unicorn: 'set7', obliterator: 'set7',
  coingun: 'set7', photon_saber: 'set7', gauntlet_cannon: 'set7', ruby: 'set7', emerald: 'set7',
  sapphire: 'set7', crystal: 'set7', beerifle: 'set7', buster: 'set7', pulse_rifle: 'set7',
  cryo_blaster: 'set7', hyperdrive: 'set7', quantum_destabilizer: 'set7', blaster: 'set7',
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
