import type { WeaponId } from '../weapons';
import { SET_SEVEN_BY_SLIDE1_ID, SET_SEVEN_SETS } from '../setSevenArt';
import { SET_NINE_NEW_WEAPONS, isNineNewWeapon } from '../setNineArt';
import { SET_ELEVEN_BY_SLIDE1_ID, SET_ELEVEN_NEW_IDS, SET_ELEVEN_NEW_WEAPONS } from '../setElevenArt';
import { SET_TWO_IDS, SET_TWO_BY_SLIDE1_ID } from '../setTwoArt';
import { SET_SIX_SLIDE1_IDS, type SixSlide1Id } from '../setSixArt';

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
  // Slide 9 (games/game-6): the eight slide-1 guns it updates and the nine
  // weapons it added that slide 1 never had.
  'pistol', 'ak47', 'pred', 'sniper', 'railgun',
  'dragon', 'photon_saber', 'gauntlet_cannon',
  'longbow', 'mp5', 'tesla_rifle', 'ion_smg', 'phaser',
  'yautja', 'identity_disc', 'proton_pack', 'heat_ray',
  // Slide 11 (games/game-8): the XENOMORPH it shares with slide 1 plus the ten
  // weapons slide 1 never had.
  'xeno',
  'mega_buster', 'harmonic_disruptor', 'absolute_zero', 'helios_flare',
  'chrono_rifle', 'orbital_beacon', 'helix_pulsar', 'singularity',
  'prism_lance', 'nano_swarm',
] as const satisfies readonly WeaponId[];

/**
 * Slide-6 (`games/game-2` / Weapon Wheel Hit) weapons. Slide 6 is the original
 * `Weapon Wheel Hit`, and its three beam weapons share their name with guns
 * slide 1 already has (through slide 9), so slide 6 adds one more design and
 * one more shot card to those three — it never adds a new gun.
 */
export const SET_SIX_DESIGN_WEAPONS = SET_SIX_SLIDE1_IDS as readonly WeaponId[];
export type SetSixDesignWeapon = SixSlide1Id;

export function isSetSixDesignWeapon(id: WeaponId | 'old'): id is SetSixDesignWeapon {
  return (SET_SIX_DESIGN_WEAPONS as readonly string[]).includes(id);
}

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
 * Slide-9 (`games/game-6`) weapons. Their newest design is slide 9's own
 * artwork (`setNineArt.drawSetNineGun`), which becomes the default; whatever
 * the gun looked like before stays pickable on its own card. The nine guns
 * slide 1 never had (`longbow`, `mp5`, `tesla_rifle`, `ion_smg`, `phaser`,
 * `yautja`, `identity_disc`, `proton_pack`, `heat_ray`) only have this card.
 */
export const SET_NINE_DESIGN_WEAPONS = [
  'pistol', 'ak47', 'pred', 'sniper', 'railgun',
  'dragon', 'photon_saber', 'gauntlet_cannon',
  'longbow', 'mp5', 'tesla_rifle', 'ion_smg', 'phaser',
  'yautja', 'identity_disc', 'proton_pack', 'heat_ray',
] as const satisfies readonly WeaponId[];
export type SetNineDesignWeapon = (typeof SET_NINE_DESIGN_WEAPONS)[number];

export function isSetNineDesignWeapon(id: WeaponId | 'old'): id is SetNineDesignWeapon {
  return (SET_NINE_DESIGN_WEAPONS as readonly string[]).includes(id);
}

/**
 * Slide-11 (`games/game-8`) weapons. Slide 11 is the newest layer, so its own
 * artwork and shot are the default for the seventeen guns it updates, and the
 * only card for the ten guns it adds. Everything older stays pickable.
 */
export const SET_ELEVEN_DESIGN_WEAPONS = [
  ...new Set([...Object.keys(SET_ELEVEN_BY_SLIDE1_ID), ...SET_ELEVEN_NEW_IDS]),
] as readonly WeaponId[];
export type SetElevenDesignWeapon = (typeof SET_ELEVEN_DESIGN_WEAPONS)[number];

export function isSetElevenDesignWeapon(id: WeaponId | 'old'): id is SetElevenDesignWeapon {
  return (SET_ELEVEN_DESIGN_WEAPONS as readonly string[]).includes(id);
}

/**
 * Slide 2 (`games/fireworkgun`) weapons. Slide 2 is the oldest layer of the
 * hub, so its artwork and its shots are offered as an EXTRA card on the eight
 * guns slide 1 already had; every other card stays exactly as it was.
 */
export const SET_TWO_DESIGN_WEAPONS = [
  // BLACK HOLE already wears slide 2's cannon as its "Terbaru" card, so it only
  // gains the slide-2 SHOT; a second identical design card would be a dud.
  ...new Set(Object.keys(SET_TWO_BY_SLIDE1_ID).filter((id) => id !== 'blackhole')),
] as readonly WeaponId[];
export type SetTwoDesignWeapon = (typeof SET_TWO_DESIGN_WEAPONS)[number];

export function isSetTwoDesignWeapon(id: WeaponId | 'old'): id is SetTwoDesignWeapon {
  return (SET_TWO_DESIGN_WEAPONS as readonly string[]).includes(id);
}

/**
 * Guns that gain slide 2's own SHOT as a new card. BLACK HOLE is left out: its
 * "Baru" shot already IS slide 2's collapsing singularity, so a second card
 * would do exactly the same thing.
 */
export const SET_TWO_EFFECT_WEAPONS = [...SET_TWO_DESIGN_WEAPONS] as readonly WeaponId[];
export type SetTwoEffectWeapon = (typeof SET_TWO_EFFECT_WEAPONS)[number];

export function isSetTwoEffectWeapon(id: WeaponId | 'old'): id is SetTwoEffectWeapon {
  return (SET_TWO_EFFECT_WEAPONS as readonly string[]).includes(id);
}

/** True when this gun carries a slide-11 update (its green NEW badge). */
export function hasSlide11Update(id: string): boolean {
  return (SET_ELEVEN_DESIGN_WEAPONS as readonly string[]).includes(id);
}

/** True for the ten slide-1 guns that only exist because of slide 11. */
export function isElevenOnlyWeapon(id: WeaponId | 'old'): boolean {
  return (SET_ELEVEN_NEW_IDS as readonly string[]).includes(id);
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
  'pistol', 'ak47', 'pred', 'longbow', 'mp5', 'tesla_rifle', 'ion_smg',
  'phaser', 'yautja', 'identity_disc', 'proton_pack', 'heat_ray',
  'xeno', 'mega_buster', 'harmonic_disruptor', 'absolute_zero', 'helios_flare',
  'chrono_rifle', 'orbital_beacon', 'helix_pulsar', 'singularity', 'prism_lance',
  'nano_swarm',
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
  'pistol', 'ak47', 'pred', 'longbow', 'mp5', 'tesla_rifle', 'ion_smg',
  'phaser', 'yautja', 'identity_disc', 'proton_pack', 'heat_ray',
  'xeno', 'mega_buster', 'harmonic_disruptor', 'absolute_zero', 'helios_flare',
  'chrono_rifle', 'orbital_beacon', 'helix_pulsar', 'singularity', 'prism_lance',
  'nano_swarm',
] as const;
export type OriginalDesignWeapon = Exclude<VariantWeapon, (typeof NO_SEPARATE_ORIGINAL)[number]>;
export function hasSeparateOriginal(id: VariantWeapon): id is OriginalDesignWeapon {
  return !(NO_SEPARATE_ORIGINAL as readonly string[]).includes(id);
}
export type LatestDesignWeapon = Exclude<EditableWeapon, (typeof NO_LATEST_DESIGN)[number]>;
export const VARIANT_WEAPONS = [...EDITABLE_WEAPONS, ...FIXED_CLASSIC_WEAPONS] as const;
export type VariantWeapon = (typeof VARIANT_WEAPONS)[number];

export type GunVariant = 'original' | 'current' | 'latest' | 'set1' | 'set2' | 'set6' | 'set7' | 'set9' | 'set11';
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
/** The slide-2 design card: slide 2's own artwork for the eight guns it shares. */
export const SET_TWO_VARIANT: { id: GunVariant; label: string } = { id: 'set2', label: 'Slide 2' };
/** The slide-9 design card (newest for every ported slide-9 gun). */
export const SET_NINE_VARIANT: { id: GunVariant; label: string } = { id: 'set9', label: 'Slide 9' };
/** The slide-11 design card (newest for every ported slide-11 gun). */
export const SET_ELEVEN_VARIANT: { id: GunVariant; label: string } = { id: 'set11', label: 'Slide 11' };
/** The slide-6 design card: slide 6's own artwork for the three guns it shares. */
export const SET_SIX_VARIANT: { id: GunVariant; label: string } = { id: 'set6', label: 'Slide 6' };
export type GunEffect = 'original' | 'new' | 'set2' | 'set6' | 'set7' | 'set9' | 'set11';
export const GUN_EFFECTS: readonly { id: GunEffect; label: string }[] = [
  { id: 'original', label: 'Sebelumnya' },
  { id: 'new', label: 'Baru' },
];
/** The slide-7 shot card of SET 2..5, labelled with the weapon's own set. */
export function setSevenEffect(id: SetSevenDesignWeapon): { id: GunEffect; label: string } {
  return { id: 'set7', label: `Set ${SET_SEVEN_SETS[SET_SEVEN_BY_SLIDE1_ID[id]]}` };
}
/** The slide-2 shot card: slide 2's own round, muzzle, burst and sounds. */
export const SET_TWO_EFFECT: { id: GunEffect; label: string } = { id: 'set2', label: 'Slide 2' };
/** The slide-9 shot card: slide 9's own projectile, burst and sounds. */
export const SET_NINE_EFFECT: { id: GunEffect; label: string } = { id: 'set9', label: 'Slide 9' };
/** The slide-11 shot card: slide 11's own round, burst and sounds. */
export const SET_ELEVEN_EFFECT: { id: GunEffect; label: string } = { id: 'set11', label: 'Slide 11' };
/** The slide-6 shot card: slide 6's own beam, muzzle burst and scorch mark. */
export const SET_SIX_EFFECT: { id: GunEffect; label: string } = { id: 'set6', label: 'Slide 6' };

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

/**
 * True when the gun gained slide 7's own artwork and shot (SET 1..7). The
 * arsenal marks these with a green "NEW" badge so the updated guns are easy to
 * find among the 80.
 */
export function hasSlide7Update(id: WeaponId | 'old'): boolean {
  return isSetOneDesignWeapon(id) || isSetSevenDesignWeapon(id);
}

/** Which slide-7 set an updated gun came from (1 for the first batch). */
export function slide7UpdateSet(id: WeaponId | 'old'): number | null {
  if (isSetOneDesignWeapon(id)) return 1;
  if (isSetSevenDesignWeapon(id)) return SET_SEVEN_SETS[SET_SEVEN_BY_SLIDE1_ID[id]];
  return null;
}

/**
 * True when the gun gained slide 6's own artwork and shot. The arsenal marks
 * these with the green "NEW" badge too.
 */
export function hasSlide6Update(id: WeaponId | 'old'): boolean {
  return isSetSixDesignWeapon(id);
}

/**
 * True when the gun gained slide 9's own artwork and shot (the 17 ported
 * weapons). The arsenal marks these with the green "NEW" badge.
 */
export function hasSlide9Update(id: WeaponId | 'old'): boolean {
  return isSetNineDesignWeapon(id);
}

export function isTwoCardGun(id: WeaponId | 'old'): boolean {
  return (TWO_CARD_WEAPONS as readonly string[]).includes(id);
}

function baseGunVariantOptions(id: VariantWeapon) {
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
  if (!(NO_LATEST_DESIGN as readonly string[]).includes(id)) return GUN_VARIANTS;
  // A gun with no separate "Sebelumnya" art only ever had ONE slide-1 look:
  // both cards would draw the same gun, so it gets a single honest card.
  if ((NO_SEPARATE_ORIGINAL as readonly string[]).includes(id)) return GUN_VARIANTS.slice(0, 1);
  return GUN_VARIANTS.slice(0, 2);
}
/**
 * Every design card a gun offers. Slide-9 weapons keep the cards they already
 * had and gain slide 9's own artwork as the newest one; the nine guns that only
 * exist because of slide 9 have that single card.
 */
/**
 * File slide 6's card where it belongs by age: the hub's slides are exported
 * out of order, but a gun's cards read oldest → newest, so slide 6 sits before
 * slide 7/9/11's cards (and before slide 2's, which is appended last because
 * slide 2 is a full stage export older than every gun on this list).
 */
function withSixCard<T extends { id: string }>(cards: readonly T[], card: T): T[] {
  const later = ['set2', 'set7', 'set9', 'set11'];
  const at = cards.findIndex((o) => later.includes(o.id));
  const list = [...cards];
  list.splice(at < 0 ? list.length : at, 0, card);
  return list;
}

export function getGunVariantOptions(id: VariantWeapon): readonly { id: GunVariant; label: string }[] {
  const cards = isSetTwoDesignWeapon(id)
    ? [...getGunVariantOptionsBeforeSetTwo(id), SET_TWO_VARIANT]
    : getGunVariantOptionsBeforeSetTwo(id);
  // Slide 6 is the oldest board in the hub, so its artwork is an EXTRA card on
  // the three guns it shares — exactly what slide 2 got. It is filed where it
  // belongs by age (before slide 7/9/11's cards), and the card the player
  // already picked stays the default.
  return isSetSixDesignWeapon(id) ? withSixCard(cards, SET_SIX_VARIANT) : cards;
}

/** The design cards a gun had before slide 2 was exported. */
function getGunVariantOptionsBeforeSetTwo(id: VariantWeapon) {
  if (isSetElevenDesignWeapon(id)) {
    if (isElevenOnlyWeapon(id)) return [SET_ELEVEN_VARIANT];
    return [...getGunVariantOptionsBeforeEleven(id), SET_ELEVEN_VARIANT];
  }
  if (!isSetNineDesignWeapon(id)) return baseGunVariantOptions(id);
  if (isNineNewWeapon(id)) return [SET_NINE_VARIANT];
  const hadSeven = SET_SEVEN_DESIGN_WEAPONS.includes(id as SetSevenDesignWeapon);
  const before = hadSeven
    ? baseGunVariantOptions(id)
    // `baseGunVariantOptions` already answers for SET 1 / SET 2..5 guns; for
    // PISTOL, AK-47 and the PREDATOR caster slide 1 only ever had one look.
    : [GUN_VARIANTS[0]] as const;
  return [...before, SET_NINE_VARIANT];
}

export function getGunEffectOptions(id: VariantWeapon): readonly { id: GunEffect; label: string }[] {
  const cards = isSetTwoEffectWeapon(id) && !isFixedClassicGun(id)
    ? [...getGunEffectOptionsBeforeSetTwo(id), SET_TWO_EFFECT]
    : getGunEffectOptionsBeforeSetTwo(id);
  return isSetSixDesignWeapon(id) ? withSixCard(cards, SET_SIX_EFFECT) : cards;
}

/** The shot cards a gun had before slide 2 was exported. */
function getGunEffectOptionsBeforeSetTwo(id: VariantWeapon) {
  if (isSetElevenDesignWeapon(id)) {
    if (isElevenOnlyWeapon(id)) return [SET_ELEVEN_EFFECT];
    return [...getGunEffectOptionsBeforeEleven(id), SET_ELEVEN_EFFECT];
  }
  if (isSetNineDesignWeapon(id)) {
    if (isNineNewWeapon(id)) return [SET_NINE_EFFECT];
    return [...getGunEffectOptionsBase(id), SET_NINE_EFFECT];
  }
  return getGunEffectOptionsBase(id);
}

/** The design cards a gun had before slide 11 (slide 9 included). */
function getGunVariantOptionsBeforeEleven(id: VariantWeapon) {
  if (isSetNineDesignWeapon(id)) {
    // A gun slide 9 introduced has no slide-1 silhouette: its first card is
    // slide 9's own artwork, exactly as before slide 11 existed.
    if (isNineNewWeapon(id)) return [SET_NINE_VARIANT];
    const hadSeven = SET_SEVEN_DESIGN_WEAPONS.includes(id as SetSevenDesignWeapon);
    const before = hadSeven ? baseGunVariantOptions(id) : [GUN_VARIANTS[0]] as const;
    return [...before, SET_NINE_VARIANT];
  }
  return baseGunVariantOptions(id);
}

/** The effect cards a gun had before slide 11 (slide 9 included). */
function getGunEffectOptionsBeforeEleven(id: VariantWeapon) {
  if (isSetNineDesignWeapon(id)) {
    if (isNineNewWeapon(id)) return [SET_NINE_EFFECT];
    return [...getGunEffectOptionsBase(id), SET_NINE_EFFECT];
  }
  return getGunEffectOptionsBase(id);
}

function getGunEffectOptionsBase(id: VariantWeapon) {
  if (isFixedClassicGun(id)) return GUN_EFFECTS.slice(0, 1);
  // Slide 7's own shot is a third card for SET 2..5: the two slide-1 effects
  // stay pickable, and slide 7 is the newest (and the default).
  if (isSetSevenDesignWeapon(id)) return [...GUN_EFFECTS, setSevenEffect(id)];
  return GUN_EFFECTS;
}

// User-requested loadouts. A new save key makes these take effect even for a
// player whose earlier choices were stored in v1; further picks persist in v2.
const DEFAULT_DESIGNS: Record<EditableWeapon, GunVariant> = {
  dragon: 'set11', diamond: 'set7', rainbow: 'set7', meteor: 'set7', golden: 'set1',
  moonbeam: 'set7', chicken: 'set7', honey: 'set7', cricket: 'set7', fish: 'set7',
  electro: 'set7', blackhole: 'set1', slingshot: 'set1', blowgun: 'set1', shotgun: 'set1',
  soaker: 'set1', snowball: 'set7', sniper: 'set11', flamethrower: 'set7', bubble: 'set7',
  bamboo: 'set7', banana: 'set7', harpoon: 'set7', confetti: 'set7', seed: 'set7',
  pizza: 'set7', minigun: 'set7', crossbow: 'set7', gravity: 'set7', coconut: 'set7',
  angklung: 'set7', bee: 'set7', sakura: 'set7', firework: 'set7', keris: 'set7',
  storm: 'set7', pencil: 'set7', sandal: 'set7', paintball: 'set7', wand: 'set7',
  shark: 'set7', ghost: 'set7', ufo: 'set7', rpg: 'set7', bazooka: 'set7',
  freeze: 'set7', railgun: 'set11', magnet: 'set7', shrink: 'set7', grow: 'set7',
  pirate: 'set7', card: 'set7', holy: 'set7', unicorn: 'set7', obliterator: 'set7',
  coingun: 'set7', photon_saber: 'set11', gauntlet_cannon: 'set11', ruby: 'set7', emerald: 'set7',
  sapphire: 'set7', crystal: 'set7', beerifle: 'set7', buster: 'set7', pulse_rifle: 'set7',
  cryo_blaster: 'set7', hyperdrive: 'set7', quantum_destabilizer: 'set7', blaster: 'set7',
  // Slide 9: its own artwork is the newest design of the eight guns it updates,
  // and the only design of the nine guns it added.
  pistol: 'set11', ak47: 'set11', pred: 'set11',
  longbow: 'set11', mp5: 'set11', tesla_rifle: 'set11', ion_smg: 'set11', phaser: 'set11',
  yautja: 'set9', identity_disc: 'set11', proton_pack: 'set11', heat_ray: 'set11',
  // Slide 11 is the newest layer: its own art/shot is the default for the
  // seventeen guns it updates and the only card of the ten guns it adds.
  mega_buster: 'set11',
  harmonic_disruptor: 'set11',
  absolute_zero: 'set11',
  helios_flare: 'set11',
  chrono_rifle: 'set11',
  orbital_beacon: 'set11',
  helix_pulsar: 'set11',
  singularity: 'set11',
  prism_lance: 'set11',
  nano_swarm: 'set11', xeno: 'set11',
};

// FIREWORK LAUNCHER keeps slide 2's celebrated fireworks as its default effect
// (explicit request): the SET 4 card is its artwork, not its shot.
const DEFAULT_EFFECTS: Record<EditableWeapon, GunEffect> = {
  dragon: 'set11', diamond: 'set7', rainbow: 'set7', meteor: 'set7', golden: 'new',
  moonbeam: 'set7', chicken: 'set7', honey: 'set7', cricket: 'set7', fish: 'set7',
  electro: 'set7', blackhole: 'new', slingshot: 'new', blowgun: 'new', shotgun: 'new',
  soaker: 'new', snowball: 'set7', sniper: 'set11', flamethrower: 'set7', bubble: 'set7',
  bamboo: 'set7', banana: 'set7', harpoon: 'set7', confetti: 'set7', seed: 'set7',
  pizza: 'set7', minigun: 'set7', crossbow: 'set7', gravity: 'set7', coconut: 'set7',
  angklung: 'set7', bee: 'set7', sakura: 'set7', firework: 'new', keris: 'set7',
  storm: 'set7', pencil: 'set7', sandal: 'set7', paintball: 'set7', wand: 'set7',
  shark: 'set7', ghost: 'set7', ufo: 'set7', rpg: 'set7', bazooka: 'set7',
  freeze: 'set7', railgun: 'set11', magnet: 'set7', shrink: 'set7', grow: 'set7',
  pirate: 'set7', card: 'set7', holy: 'set7', unicorn: 'set7', obliterator: 'set7',
  coingun: 'set7', photon_saber: 'set11', gauntlet_cannon: 'set11', ruby: 'set7', emerald: 'set7',
  sapphire: 'set7', crystal: 'set7', beerifle: 'set7', buster: 'set7', pulse_rifle: 'set7',
  cryo_blaster: 'set7', hyperdrive: 'set7', quantum_destabilizer: 'set7', blaster: 'set7',
  // Slide 9: its own artwork is the newest design of the eight guns it updates,
  // and the only design of the nine guns it added.
  pistol: 'set11', ak47: 'set11', pred: 'set11',
  longbow: 'set11', mp5: 'set11', tesla_rifle: 'set11', ion_smg: 'set11', phaser: 'set11',
  yautja: 'set9', identity_disc: 'set11', proton_pack: 'set11', heat_ray: 'set11',
  // Slide 11's own shot is the newest effect of all of them.
  mega_buster: 'set11',
  harmonic_disruptor: 'set11',
  absolute_zero: 'set11',
  helios_flare: 'set11',
  chrono_rifle: 'set11',
  orbital_beacon: 'set11',
  helix_pulsar: 'set11',
  singularity: 'set11',
  prism_lance: 'set11',
  nano_swarm: 'set11', xeno: 'set11',
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
