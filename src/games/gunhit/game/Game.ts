import { sfx, withSfxGain } from './audio';
import { slide2Sfx } from './slide2Audio';
import { Slide2Fx } from './slide2Fx';
import {
  ambientBlackHole2,
  drawBlackHoleShot2,
  fireBlackHole2,
  launchVoidSky2,
  setSlide2GunFx,
  trailBlackHole2,
  voidBurst2,
} from './slide2Weapons';
import { isSlide23Weapon, slide23Sfx } from './slide23Sfx';
import { fireworkSfx } from './fireworkSlide2Sfx';
import { setOneSfx } from './setOneAudio';
import { silentPreview } from './previewAudio';
import { SetOneFx, type SetOneHooks, type SetOneShot } from './setOneFx';
import { fireSetOne, impactSetOne } from './setOneWeapons';
import { setOneIdFor, type SetOneId } from './setOneArt';
import { SetSevenFx, type SevenHooks } from './setSevenFx';
import { buildSevenAnim, setSevenIdFor, type SevenId } from './setSevenArt';
import { FIRE_RECIPES } from './setSevenFire';
import { updateSevenAnim } from './setSevenAnim';
import { adoptSevenRound, sevenCooldown, sevenShotSpeed } from './setSevenShot';
import { SetNineFx, unlockNineAudio, type NineHooks } from './setNineFx';
import { SetSixFx, SIX_BEAM_SPEED, type SixHooks } from './setSixFx';
import { setSixIdFor, sixCooldown, sixStateFor, type SixId } from './setSixArt';
import { setNineIdFor, type NineId } from './setNineArt';
import { SetElevenFx, setElevenMuted, unlockElevenAudio, type ElevenHooks } from './setElevenFx';
import type { Proj as ElevenProj } from '../../../../games/game-8/src/game/types';
import { setElevenIdFor, type ElevenId } from './setElevenArt';
import { SetTwoFx, twoAmmoHue, type TwoRound } from './setTwoFx';
import {
  drawSetTwoAtmosphere,
  drawSetTwoPins,
  drawSetTwoSky,
  drawSetTwoStars,
  drawSetTwoWheelGlow,
  setTwoWheelHue,
  type SetTwoPin,
} from './setTwoLook';
import { setTwoGunFx, setTwoIdFor, type TwoWeapon } from './setTwoArt';
import type { Bullet as NineBullet } from '../../../../games/game-6/src/game/types';
import { newAnim } from '../../../../games/game-4/src/game/weapons';
import { RECOIL_ROT } from '../../../../games/game-4/src/game/Game';
import { easeOutCubic } from '../../../../games/game-4/src/game/core';
import type { Projectile as SevenShot } from '../../../../games/game-4/src/game/projectiles';
import { sfx2 } from './sfx2';
import { sfx3 } from './sfx3';
import { sfx4 } from './sfx4';
import { sfx6 } from './sfx6';
import { sfx5 } from './sfx5';
import { gunState } from './art/kit';
import { FX, spawnImpact, spawnMuzzle, spawnSpeedLines, drawFxParticle, drawSmokeParticle, drawDropParticles, cssColor, type Particle, type FxSink } from './fx';
import { drawPreciseWeaponDecal } from './art/decalSystem';
import { drawGlow } from './art/glowSprite';
import { AcidFluid, type AcidStuckBlob } from './acidFluid';
import { SNOWBALL_MAG_SIZE } from './art/guns2';
import { drawMaterialTrail } from './art/projectileTrails';
import { drawClassicBeam, drawLaserBeam, drawVoidTether } from './art/beamEffects';
import { getGunEffect, getGunVariant } from './art/gunVariants';
import { drawWetSurface } from './art/waterSurface';
import { drawFace, STYLE_COLORS, type Style } from './faces';
import { drawGun, drawProjectile, WEAPONS, getWeapon, type Weapon, type WeaponId, type ProjKind } from './weapons';
import { drawStar, drawRockFragment } from './art/boulder';
import { DiamondRock, drawRockDiamond, type BrokenRockCell } from './art/diamondRock';
import { drawBonusCoin, TreasureChest } from './art/bonusArt';
import { advanceTreasureCoins, throwTreasureCoins, type TreasureCoin } from './treasureShower';
import { drawBreakerCoin } from '../../shared/coinArt';
import { getBossDef, type BossType } from './bossRoster';
import { drawBossProjectile } from './bossProjectileArt';
import { getExactBossRadius, onBossAssetsLoaded } from './bossAssetProcessor';
import {
  createFirework8State,
  drawFirework8Background,
  drawFirework8GunGlow,
  drawFirework8ParticlesAndRings,
  FIREWORK_EMBED_NOSE,
  firework8ShotHue,
  hsl,
  launchFirework8Sky,
  spawnFirework8ClearFinale,
  spawnFirework8FailBurst,
  spawnFirework8FlightSparks,
  spawnFirework8Muzzle,
  spawnFirework8StickBurst,
  updateFirework8State,
  type Firework8State,
} from './firework8fx';
import {
  createYoyoSlideState,
  drawSlide6String,
  drawSlide6Yoyo,
  drawYoyoSlideBackground,
  drawYoyoSlideGunGlow,
  drawYoyoSlideParticlesRingsAndStrings,
  spawnYoyoClearFinale,
  spawnYoyoFailBurst,
  spawnYoyoFlightSparks,
  spawnYoyoLaunch,
  spawnYoyoStickBurst,
  updateYoyoSlideState,
  yoyoAmmoHue,
  type YoyoSlideState,
} from './yoyoSlideFx';
import {
  createKerisSlideState,
  drawKerisAimGuide,
  drawKerisSlideBackground,
  drawKerisSlideMini,
  drawKerisSlideParticlesAndArcs,
  drawKerisStuckCrater,
  drawKerisSurfaceArcs,
  KERIS_GLEAM_DUR,
  spawnKerisFlightSparks,
  spawnKerisImpact,
  spawnKerisLaunch,
  updateKerisSlideState,
  type KerisSlideState,
} from './kerisSlideFx';
import {
  createDiamondSlideState,
  drawDiamondSlideBackground,
  drawDiamondSlideForeground,
  drawDiamondSlideGunGlow,
  drawSlide2DiamondBullet,
  spawnDiamondClearFinale,
  spawnDiamondFailBurst,
  spawnDiamondFlightSparks,
  spawnDiamondLaunch,
  spawnDiamondStickBurst,
  updateDiamondSlideState,
  type DiamondSlideState,
} from './diamondSlideFx';
import {
  BAZOOKA_HUES,
  BazookaSlideFx,
  drawSlide3BazookaShell,
  drawSlide3BazookaStuckCrater,
} from './bazookaSlideFx';

export const W = 420;
export const H = 760;
const CX = W / 2;
const CY = 255;
const SPECIAL_CY = 282; // Give the full-size Diamond Breaker rock room below the HUD.
const ROCK_RADIUS = 166; // ~80% of the 420px screen, as on Diamond Breaker's 480px screen.
const TWIN_SPACING = 30; // dual lebih rapat: 60px antar laras (dulu 92px)
const SINGLE_BARREL = [0] as const;
const TWIN_BARRELS = [-TWIN_SPACING, TWIN_SPACING] as const;
const CLASSIC_COIN_RADIUS = 13.5 * 1.2; // compact original coin, enlarged only 20%
const CLASSIC_DIAMOND_SCALE = 1.2;
const TOTAL_LEN = 42; // total standard bullet length
const EMBED = 21; // tertancap setengah (50% masuk ke dalam)
const L = TOTAL_LEN - EMBED; // hanya terlihat setengah (50% di luar)
const BLEN = TOTAL_LEN;
// projectile speed depends on weapon
const GUN_Y = H - 185; // muzzle tip
const TAU = Math.PI * 2;
const SPIKE_LEN = 28;
export const BOARD_OBSTACLE_SCALE = 2;
export const SPIKE_SCALE = BOARD_OBSTACLE_SCALE;

const rand = (a: number, b: number) => a + Math.random() * (b - a);

/** Keep the sandal's chunky silhouette at full size even if a mini-shot buff is active. */
export function projectileSizeMultiplier(kind: WeaponId, mini: boolean, giant: boolean) {
  if (kind === 'sandal' && mini) return giant ? 1.8 : 1;
  return mini ? 0.65 : giant ? 1.8 : 1;
}

/** Preserve the normal Nail Gun size; only the weapon's existing charge buff enlarges shots. */
export function embeddedProjectileScale(big = 0) {
  return big ? 1 + big * 0.3 : 1;
}

/** Convert each weapon's visible shot width into the rock's local hit radius. */
export function diamondCoreProjectileRadius(weaponHalf: number, shotScale: number, rockScale: number) {
  return Math.max(6, weaponHalf * shotScale / Math.max(0.1, rockScale));
}

/** Bosses turn 20% faster while keeping the same readable reversal rhythms. */
export function bossRotationSpeed(type: BossType, levelTime: number) {
  switch (type) {
    case 'knight': return (Math.floor(levelTime / 7) % 2 === 0 ? 1.65 : -1.65) * 1.2;
    case 'oni': return (Math.floor(levelTime / 5) % 2 === 0 ? -2.05 : 2.05) * 1.2;
    case 'cyborg': return 1.9 * Math.cos(levelTime * 0.82) * 1.2;
    case 'pirate': return 2.1 * Math.cos(levelTime * 0.52 + 0.3) * 1.2;
  }
}

const BOSS_RISE_HEIGHT = 58;
const BOSS_MOVE_CYCLE = 10;
const smooth01 = (value: number) => {
  const t = Math.max(0, Math.min(1, value));
  return t * t * (3 - 2 * t);
};

/** Rises smoothly, pauses at the high position, then returns and rests for strategy time. */
export function bossRiseOffset(levelTime: number) {
  const phase = ((levelTime % BOSS_MOVE_CYCLE) + BOSS_MOVE_CYCLE) % BOSS_MOVE_CYCLE;
  if (phase < 2) return 0;
  if (phase < 3.3) return BOSS_RISE_HEIGHT * smooth01((phase - 2) / 1.3);
  if (phase < 4.6) return BOSS_RISE_HEIGHT;
  if (phase < 5.9) return BOSS_RISE_HEIGHT * (1 - smooth01((phase - 4.6) / 1.3));
  return 0;
}

/** Shorter intervals make bosses fire about 30% more often without bunching shots. */
export function bossFireInterval(baseInterval: number, jitter = 0) {
  return Math.max(1.05, baseInterval * 0.7 + jitter);
}

const norm = (a: number) => ((a % TAU) + TAU) % TAU;
const angDiff = (a: number, b: number) => {
  let d = norm(a - b);
  if (d > Math.PI) d = TAU - d;
  return d;
};
const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];
/** Slide 9 flashes with any CSS colour; slide 1's tint wants an `r,g,b` triple. */
const hexToRgbTriplet = (color: string): string => {
  const hex = color.trim().match(/^#([\da-f]{3}|[\da-f]{6})$/i);
  if (hex) {
    const raw = hex[1].length === 3 ? hex[1].split('').map((ch) => ch + ch).join('') : hex[1];
    const n = parseInt(raw, 16);
    return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
  }
  const rgb = color.match(/(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/);
  return rgb ? `${rgb[1]},${rgb[2]},${rgb[3]}` : '255,255,255';
};

/**
 * Every weapon's own classic firing sound (the "Sebelumnya" / "Baru" cards).
 *
 * The `slide23Sfx.shoot(id, gain)` arms carry a level multiplier: slide 2/3
 * wrote those recipes as soft accents under their stage music, and as the only
 * voice of a slide-1 shot they were far quieter than the rest of the arsenal.
 * ×1.5–×4 brings them to the same peak band as everything else while keeping
 * their exact timbre and rhythm.
 */
export const FIRE_SFX: Record<WeaponId, () => void> = {
  pistol: sfx.shoot, ak47: sfx.shootAk, plasma: sfx.shootPlasma, laser: sfx.shootLaser,
  cricket: sfx.shootCricket, electro: sfx.shootElectro, nail: sfx.shootNail, fish: sfx.shootFish,
  crossbow: sfx.shootCrossbow, bazooka: () => slide23Sfx.shoot('bazooka'), rpg: () => slide23Sfx.shoot('rpg', 1.6), freeze: sfx.shootFreeze,
  golden: sfx.shootGolden, blackhole: () => slide23Sfx.shoot('blackhole', 2.2),
  shotgun: sfx2.shotgun, sniper: sfx2.sniper, minigun: sfx2.minigun, railgun: sfx2.railgun,
  flamethrower: sfx2.flame, slingshot: sfx2.slingshot, blowgun: sfx2.blowgun,
  bamboo: () => slide23Sfx.shoot('bamboo', 1.8), banana: sfx2.banana, magnet: sfx2.magnet, bubble: sfx2.bubble,
  shrink: sfx2.shrink, grow: sfx2.grow, harpoon: sfx2.harpoon, soaker: () => slide23Sfx.shoot('soaker', 3.2),
  snowball: sfx2.snowball, pirate: sfx2.pirate, chicken: sfx2.chicken, card: sfx2.card, confetti: sfx2.confetti,
  seed: sfx2.seed, dragon: sfx2.dragon,
  gravity: sfx2.gravity, pizza: sfx2.pizza,
  honey: sfx3.honey, coconut: sfx3.coconut, angklung: sfx3.angklung, bee: sfx3.bee, yoyo: () => slide23Sfx.shoot('yoyo', 4),
  sakura: sfx3.sakura, acid: sfx3.acid, keris: () => slide23Sfx.shoot('keris', 3.4), firework: () => fireworkSfx.shoot(), anchor: sfx3.anchor,
  shark: () => slide23Sfx.shoot('shark', 3.4), ghost: sfx3.ghost, ufo: sfx3.ufo, rainbow: () => slide23Sfx.shoot('rainbow', 4.6), meteor: sfx3.meteor, diamond: () => slide23Sfx.shoot('diamond', 1.8),
  moonbeam: sfx3.moonbeam, storm: sfx3.storm,
  obliterator: sfx4.obliterator, buster: sfx4.busterSmall, paintball: sfx4.paintball, holy: sfx4.holy, beerifle: sfx4.beeRifle,
  emerald: sfx4.emerald, ruby: sfx4.ruby, sapphire: sfx4.sapphire, crystal: () => slide23Sfx.shoot('crystal', 4), unicorn: sfx4.unicorn,
  pencil: sfx4.pencil, sandal: sfx4.sandal, wand: sfx4.wand,
  coingun: sfx5.coinGun, blaster: sfx5.blaster,
  photon_saber: sfx6.saberShoot,
  gauntlet_cannon: sfx6.gauntlet,
  pulse_rifle: sfx6.pulse, cryo_blaster: sfx6.cryo, hyperdrive: sfx6.hyper,
  quantum_destabilizer: sfx6.quantum,
  xeno: sfx6.xeno,
  dora: sfx6.dora,
  pred: sfx6.pred,
  // Slide 9 ports: their own synthesizer plays while the SET 9 effect is
  // selected; these are the classic sounds of the older effect cards.
  longbow: sfx.shootCrossbow, mp5: sfx.shootNail, tesla_rifle: sfx.shootElectro,
  ion_smg: sfx.shootElectro, phaser: sfx.shootLaser, yautja: sfx.shootPlasma,
  identity_disc: sfx2.magnet, proton_pack: sfx3.ghost, heat_ray: sfx2.flame,
  // Slide 11
  mega_buster: () => slide23Sfx.shoot('bamboo', 1.8), harmonic_disruptor: sfx2.magnet,
  absolute_zero: sfx.shootFreeze, helios_flare: sfx.shootGolden,
  chrono_rifle: sfx2.railgun, orbital_beacon: () => slide23Sfx.shoot('bazooka'),
  helix_pulsar: sfx2.minigun, singularity: () => slide23Sfx.shoot('blackhole', 2.2),
  prism_lance: sfx.shootLaser, nano_swarm: sfx2.minigun,
};
/** The per-weapon impact accent, where the weapon has one of its own. */
export const HIT_SFX: Partial<Record<WeaponId, () => void>> = {
  coingun: sfx.coin, blaster: sfx5.blasterHit,
  photon_saber: sfx6.saberHit,
  gauntlet_cannon: sfx6.gauntletHit,
  pulse_rifle: sfx6.pulseHit, cryo_blaster: sfx6.cryoHit, hyperdrive: sfx6.hyperHit,
  quantum_destabilizer: sfx6.quantumHit,
  chicken: sfx2.squeak, bubble: sfx2.pop, card: sfx2.card, snowball: sfx2.thud, soaker: sfx2.splat,
  pizza: sfx2.splat, banana: sfx2.splat, seed: sfx2.seed, slingshot: sfx2.thud, pirate: sfx2.crash,
  magnet: sfx2.metal,
  shrink: sfx2.shrink, grow: sfx2.grow, gravity: sfx2.gravity, railgun: sfx.zap,
  honey: sfx2.splat, coconut: sfx3.coconutHit, bee: sfx3.sting, yoyo: sfx3.bloop, sakura: sfx3.chime,
  acid: sfx3.sizzle, keris: sfx3.kerisStick, anchor: sfx3.clank, shark: sfx3.chomp, ghost: sfx3.wail,
  ufo: sfx.zap, rainbow: sfx3.chime, diamond: sfx3.chime, moonbeam: sfx3.chime, storm: sfx3.thunder,
  obliterator: sfx4.obliteratorHit, paintball: sfx4.paintSplat, holy: sfx4.purify, emerald: sfx3.chime, ruby: sfx2.metal,
  sapphire: sfx.ice, crystal: sfx4.shatter, unicorn: sfx4.magic, pencil: sfx4.scribble, sandal: sfx4.plak, wand: sfx4.magic,
};
/**
 * Level trim for slide 1's own recipes.
 *
 * A dozen of slide 1's sounds were written as *accents* — a unicorn's sparkle,
 * a shrink ray's whiff, a ghost's moan — mixed to sit under a bigger blast. On
 * the guns where that accent is the entire shot, they measured 0.07–0.2 peak
 * next to a 0.45 peak arsenal, which is exactly the "lirih" that made the
 * ports feel wrong. The trim keeps each recipe untouched and only lifts its
 * level into the same band as every other gun.
 */
export const FIRE_GAIN: Partial<Record<WeaponId, number>> = {
  unicorn: 6, emerald: 5.6, shrink: 3.75, ufo: 3.75, buster: 3.75, holy: 3.75,
  chicken: 3, sakura: 3, ghost: 3, wand: 3, moonbeam: 2.8, magnet: 2.5,
  seed: 2.25, bee: 2.25, laser: 1.6,
};

/** Fires a slide-1 gun's own sound at its trimmed level. */
export function playFireSfx(id: WeaponId) {
  const k = FIRE_GAIN[id] ?? 1;
  if (k === 1) FIRE_SFX[id]();
  else withSfxGain(k, FIRE_SFX[id]);
}
/**
 * Slide 2's own stage-clear and fail cheers, one voice per gun.
 *
 * Slide 1 used to answer every weapon with `slide23Sfx` — a hand-typed copy of
 * slide 2's envelopes, close but never the same. Slide 2 ships the real class,
 * so the eight imported guns now play the real thing: no re-typed gain, no
 * re-typed reverb send.
 */
const SET_TWO_CLEAR: Record<string, () => void> = {
  firework: () => slide2Sfx.clearFirework(),
  blackhole: () => slide2Sfx.clearBH(),
  shark: () => slide2Sfx.clearShark(),
  bamboo: () => slide2Sfx.clearBamboo(),
  soaker: () => slide2Sfx.clearSoaker(),
  rainbow: () => slide2Sfx.clearRainbow(),
  bazooka: () => slide2Sfx.clearBazooka(),
  rpg: () => slide2Sfx.clearRpg(),
};

const SET_TWO_FAIL: Record<string, () => void> = {
  firework: () => slide2Sfx.failFirework(),
  blackhole: () => slide2Sfx.failBH(),
  shark: () => slide2Sfx.failShark(),
  bamboo: () => slide2Sfx.failBamboo(),
  soaker: () => slide2Sfx.failSoaker(),
  rainbow: () => slide2Sfx.failRainbow(),
  bazooka: () => slide2Sfx.failBazooka(),
  rpg: () => slide2Sfx.failRpg(),
};

const PAINT = ['244,63,94', '250,204,21', '34,211,238', '168,85,247', '74,222,128', '251,146,60'];

type ItemType = 'bullet' | 'old' | 'spike' | 'coin' | 'diamond_chest';
interface AcidStuck { blobs: AcidStuckBlob[]; dripT: number; drip: number; seed: number }
interface Item { angle: number; type: ItemType; age: number; w?: WeaponId; scale?: number; vel?: number; harvested?: boolean; tint?: string; big?: number; hits?: number; hue?: number; flash?: number; acid?: AcidStuck; hideArt?: boolean; setTwo?: boolean }
interface Proj { x: number; y: number; vx: number; vy: number; originX?: number; setSix?: true; setOne?: SetOneShot; setSeven?: SevenShot; setSevenPending?: boolean; s7Ghost?: boolean; hold?: number; setNine?: NineBullet; setNinePending?: boolean; s9Ghost?: boolean; setEleven?: ElevenProj; setElevenPending?: boolean; s11Ghost?: boolean; setTwo?: TwoRound; pierced?: number; hist?: { x: number; y: number }[]; tint?: string; big?: number; mini?: boolean; giant?: boolean; hue?: number; flash?: number; spawnDelay?: number; wob?: number; lastEcho?: number; t?: number; trail?: { x: number; y: number }[] }
type StepRes = { res: 'none' | 'stick' | 'fail' | 'hit'; spike?: boolean; local?: number };
interface Light { x: number; y: number; r: number; rgb: string; life: number; max: number }
interface Fragment { x: number; y: number; vx: number; vy: number; rot: number; vr: number; a0: number; a1: number }
interface Flyer { x: number; y: number; vx: number; vy: number; rot: number; vr: number; kind: ItemType; w?: WeaponId; hue?: number }
interface Beam { x: number; y: number; life: number; max: number; rgb: string }
interface Portal { x: number; y: number; life: number; max: number; rgb: string }
interface BossProjectile { x: number; y: number; vx: number; vy: number; rot: number; type: BossType }

interface RockFragment { x: number; y: number; vx: number; vy: number; rot: number; vr: number; size: number; seed: number; life: number; max: number }
/** Coordinates and angle are local to a rock cell (or to the open chest). */
interface EmbeddedShot { x: number; y: number; angle: number; age: number; w: WeaponId; scale: number; big: number; tint?: string; cellId?: number; hue?: number; flash?: number }
interface FallingCell { id: number; cx: number; cy: number; x: number; y: number; vx: number; vy: number; rot: number; vr: number; life: number; bullets: EmbeddedShot[] }
interface Star { x: number; y: number; r: number; vx: number; baseY: number; age: number; life: number; max: number }
interface BonusCoin { angle: number; radius: number; phase: number; taken: boolean }
export type TreasureBuff = 'rapid' | 'double' | 'mini' | 'giant';
export type BuffKind = 'speed' | 'ammo' | 'power' | TreasureBuff;
export type SpecialMode = 'bonus' | 'treasure';
export type LevelMode = 'classic' | 'boulder' | 'double' | SpecialMode;

const STAGE_SECONDS: Record<'boulder' | SpecialMode, number> = { boulder: 65, bonus: 45, treasure: 10 };
const isSpecial = (mode: LevelMode): mode is 'boulder' | SpecialMode => mode === 'boulder' || mode === 'bonus' || mode === 'treasure';

/** Star power-ups are reserved for bosses and special/bonus stages. */
export function allowsStarPowerups(level: Pick<LevelCfg, 'boss' | 'mode'>) {
  return level.boss || isSpecial(level.mode);
}

type PatternName = 'constant' | 'wave' | 'pendulum' | 'stopgo' | 'jerk' | 'chaos';
const PATTERNS: Record<PatternName, (t: number, b: number, d: number) => number> = {
  constant: (_t, b, d) => b * d,
  wave: (t, b, d) => b * d * (0.3 + 1.4 * (0.5 + 0.5 * Math.sin(t * 1.5))),
  pendulum: (t, b, d) => b * 1.7 * d * Math.sin(t * 1.0),
  stopgo: (t, b, d) => {
    const p = (t % 2.0) / 2.0;
    const s = p < 0.55 ? 1.6 : p < 0.72 ? 1.6 * (1 - (p - 0.55) / 0.17) : 0.04;
    return b * d * s;
  },
  jerk: (t, b, d) => {
    const k = Math.floor(t / 1.7);
    const dd = k % 2 === 0 ? 1 : -1;
    const p = (t % 1.7) / 1.7;
    return b * d * dd * (0.5 + 1.5 * Math.pow(Math.sin(p * Math.PI), 2));
  },
  chaos: (t, b, d) => b * d * (Math.sin(t * 1.1) * 1.4 + Math.sin(t * 2.7 + 1) * 0.75 + 0.35),
};

export interface LevelCfg {
  mode: LevelMode; hp: number; maxHp: number;
  n: number; boss: boolean; ammo: number; base: number; pattern: PatternName; dir: number;
  radius: number; style: Style; name: string; old: number; spikes: number; coins: number;
}

const BOSS_NAMES = ['DARK KNIGHT', 'ONI DEMON', 'MECHA CYBORG', 'PIRATE LORD'];
const BOSS_STYLES: Style[] = ['knight', 'oni', 'cyborg', 'pirate'];
const WORLD_STYLES: Style[] = ['orange', 'wood', 'target'];
const PRAISE = ['MANTAP!', 'KEREN!', 'SEMPURNA!', 'GACOR!', 'JAGO!', 'LUAR BIASA!'];

export function makeLevel(n: number, forcedMode?: LevelMode): LevelCfg {
  const boss = n % 5 === 0;
  const world = Math.floor((n - 1) / 5);
  const base = Math.min(1.5 + n * 0.11, 4.3);
  let pattern: PatternName;
  if (n <= 2) pattern = 'constant';
  else if (boss) pattern = n === 5 ? 'wave' : n >= 15 ? pick<PatternName>(['chaos', 'jerk']) : pick<PatternName>(['jerk', 'stopgo', 'chaos']);
  else {
    const pool: PatternName[] = ['constant', 'wave', 'pendulum'];
    if (n >= 6) pool.push('stopgo');
    if (n >= 11) pool.push('jerk');
    if (n >= 16) pool.push('chaos');
    pattern = pick(pool);
  }
  const regularAmmo = Math.min(5 + Math.floor(n * 0.5), 13);
  // Double the boss shot quota so the fight can sustain exactly twice the HP without an early ammo clear.
  const ammo = boss ? (regularAmmo + 2) * 2 : regularAmmo;
  const bossIdx = Math.floor(n / 5) - 1;
  const style: Style = boss ? BOSS_STYLES[Math.max(0, bossIdx) % BOSS_STYLES.length] : WORLD_STYLES[world % WORLD_STYLES.length];
  // Boss DARK KNIGHT tampil bersih: tanpa duri jebakan & penghalang (peluru berkarat).
  const cleanKnight = boss && style === 'knight';
  const old = cleanKnight ? 0 : n < 2 ? 0 : Math.min(1 + Math.floor((n - 2) / 3), 5);
  // Boss selalu memiliki duri mematikan yang DILARANG DITEMBAK!
  const spikes = cleanKnight
    ? 0
    : boss
    ? Math.min(5, 2 + Math.floor(n / 5)) // 2 sampai 5 duri jebakan mematikan di kepala boss!
    : n < 4
    ? 0
    : Math.min(1 + Math.floor((n - 4) / 4), 4);
  const coins = (Math.random() < 0.65 ? 1 : 0) + (Math.random() < 0.3 ? 1 : 0);
  // Each five-stage boss cycle is three ordinary stages, one random special,
  // then a boss: stages 4, 9, 14... use exactly one of the three special modes.
  const mode: LevelMode = forcedMode ?? (boss ? 'classic'
    : n % 5 === 4 ? pick<LevelMode>(['boulder', 'bonus', 'treasure'])
    : 'classic');
  return {
    n, boss, ammo: isSpecial(mode) ? 12 : ammo, base, pattern, dir: Math.random() < 0.5 ? 1 : -1,
    radius: boss ? 122 : mode === 'boulder' || mode === 'bonus' ? ROCK_RADIUS : 106, style,
    name: boss ? BOSS_NAMES[Math.max(0, bossIdx) % BOSS_NAMES.length] : '',
    old: isSpecial(mode) ? 0 : old, spikes: isSpecial(mode) ? 0 : spikes, coins: isSpecial(mode) ? 0 : coins,
    mode, hp: 0, maxHp: 0, // populated from the actual number of breakable chunks
  };
}

export interface GameEvents {
  onGameOver: (score: number, level: number, coinsToBank: number, runCoins: number) => void;
  onBossDefeated?: (bossName: string, level: number, coinsEarned: number, bossType: BossType) => void;
  /** The treasure counter and saved balance both grow as each flying coin reaches the HUD. */
  onTreasureCoin?: (amount: number) => void;
  /** Bank any remaining special-stage reward at its end, exactly once. */
  onStageReward?: (mode: 'boulder' | SpecialMode, level: number, unbankedCoins: number, diamondReward: number) => void;
  /** Separate shop-diamond currency, awarded by the boulder core and small diamond pickups. */
  onDiamondCollected?: (amount: number, large: boolean, origin: { x: number; y: number }) => void;
  /** Called on successful standard-stage clears for the UI's short sunburst celebration. */
  onStageCleared?: (level: number, boss: boolean, origin: { x: number; y: number }) => void;
  /** Called whenever a new level begins so transient HUD modes can reset. */
  onStageChange?: () => void;
  onStarHit?: (treasure: boolean) => void;
  onShotFired?: (count: number) => void;
}

type State = 'idle' | 'intro' | 'play' | 'clear' | 'fail' | 'over';

export class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private events: GameEvents;
  private scale = 1;
  private dpr = 1;
  private raf = 0;
  private last = 0;
  private active = false;
  private hasRendered = false;

  state: State = 'idle';
  level: LevelCfg;
  private rot = 0;
  private levelTime = 0;
  private items: Item[] = [];
  private projs: Proj[] = [];
  private particles: Particle[] = [];
  /** Metaball acid layer (slide-7 Xenomorph Acid Spitter parity). */
  private acidFluid = new AcidFluid();
  private frags: Fragment[] = [];
  private flyers: Flyer[] = [];
  private ammoLeft = 0;
  private stuck = 0;
  score = 0;
  coins = 0;
  private combo = 0;
  private comboPop = 0;
  private lastHit = -10;
  private shake = 0;
  private flashWhite = 0;
  private flashRed = 0;
  private timeScale = 1;
  private bump = 0;
  private hitFlash = 0;
  /** game-3 wheelFlash: tints only the target, never the whole screen. */
  private wheelFlash = 0;
  private wheelFlashRgb = '200,255,128';
  private introT = 0;
  private wheelScale = 1;
  private stateT = 0;
  private recoil = 0;
  private muzzle = 0;
  private cooldown = 0;
  private face!: HTMLCanvasElement;
  private faceCtx!: CanvasRenderingContext2D;
  private faceScale = 2;
  private time = 0;
  private bannerT = 0;
  private dust: { x: number; y: number; s: number; v: number; a: number }[] = [];
  private failProjAngle = 0;
  weapon: Weapon = WEAPONS[0];
  private holding = false;
  private beams: Beam[] = [];
  private slowT = 0;
  private slowF = 0.3;
  private slowRgb = '170,230,255';
  private slowKind: 'ice' | 'water' | 'honey' | 'time' = 'ice';
  private aiming = false;
  private aimT = 0;
  private spin = 0;
  private savesLeft = 0;
  private perkCount = 0;
  private burnT = 0;
  private burnTick = 0;
  private spikeOffT = 0;
  private targetR = 0;
  private faceR = 106;
  private portals: Portal[] = [];
  private glitchT = 0;
  private rockFragments: RockFragment[] = [];
  private rockBullets: EmbeddedShot[] = [];
  private fallenCells: FallingCell[] = [];
  private chestBullets: EmbeddedShot[] = [];
  private treasureCoins: TreasureCoin[] = [];
  private stageRewardPaid = false;
  private lastCoinSound = -10;
  private coinPulse = 0;
  private rock: DiamondRock | null = null;
  private bonusCoins: BonusCoin[] = [];
  private chest: TreasureChest | null = null;
  private stageTime = 0;
  private reloadT = 0;
  private snowLoaded = SNOWBALL_MAG_SIZE;
  private stageStartCoins = 0;
  private bankedCoins = 0;
  private diamondPing = 0;
  private centerDiamondCollected = false;
  private centerDiamondHits = 0;
  private diamondHoldUntil = 0;
  private choosingBuff = false;
  private buff: 'speed' | 'ammo' | 'power' | 'double' | null = null;
  private treasureBuff: TreasureBuff | null = null;
  private twinGuns = false;
  private star: Star | null = null;
  private starTimer = 6;
  private speedMult = 1;
  private dmgMult = 1;
  private maxAmmoMult = 1;
  private bossProjs: BossProjectile[] = [];
  private bossShootTimer = 1.6;
  private bossHp = 100;
  private bossMaxHp = 100;
  private bossHpRed = 100; // Tekken-style ghost damage gauge
  private lights: Light[] = [];
  private rt = 0;
  private lastShotRT = -9;
  private charging = false;
  private chargeT = 0;
  private chargeLevel = 0;
  private chargeStage = 0;
  private lastPaint = '';
  private stretchPlayed = true;
  /** Slide-2 FX layer + per-shot hue for the ported slide-2 weapons. */
  private s2State?: Slide2Fx;
  private get s2(): Slide2Fx {
    return (this.s2State ??= new Slide2Fx());
  }
  private s2Hue = 265;
  private s2Ambient = 1.4;

  /**
   * Slide 2 `voidBurst()` at a hit point: accretion inflow, delayed collapse
   * flash, bipolar jets and tangential ejecta, plus slide 2's own hit voice.
   */
  private slide2Impact(x: number, y: number, scale = 0.8) {
    if (!this.slide2Void) return;
    voidBurst2(
      this.s2,
      x,
      y,
      this.s2Hue,
      scale,
      (amount) => { this.shake = Math.max(this.shake, amount); },
      () => slide2Sfx.voidBoom(scale),
    );
    slide2Sfx.hitBH(Math.max(0, this.perkCount));
    this.sink.light(x, y, 170, '180,120,255', 0.22);
  }

  /**
   * True when the black-hole gun must run the slide-2 void shot. The slide-2
   * cannon keeps its own shot whenever its design is the selected one; the
   * slide-7 SET 1 staff (new default) uses the SET 1 shot below.
   */
  private get slide2Void(): boolean {
    return this.weapon.id === 'blackhole' && getGunEffect('blackhole') === 'new'
      && getGunVariant('blackhole') !== 'set1';
  }

  /**
   * Slide 2 (`games/fireworkgun`) FX layer for the eight exported weapons. Its
   * own muzzle recipe, round art, trail and wheel impact all live here; slide 1
   * only decides where the round is and what it hits.
   */
  private s2wState?: SetTwoFx;
  private get s2w(): SetTwoFx {
    const fx = (this.s2wState ??= new SetTwoFx());
    fx.host = {
      shake: (amount) => { this.shake = Math.max(this.shake, amount); },
      emit: () => { /* slide 2's UI callback: slide 1 refreshes on its own */ },
    };
    return fx;
  }

  /** The slide-2 gun behind the equipped slide-1 weapon, if it has one. */
  private get setTwoId(): TwoWeapon | null {
    // Bare test harnesses drive the stage lifecycle before a weapon is set.
    return this.weapon ? setTwoIdFor(this.weapon.id) : null;
  }

  /** How many rounds of this gun have left the barrel this stage. */
  private s2ShotIdx = 0;

  /** The colour slide 2 would load into the next round of this gun. */
  private s2HueFor(id: TwoWeapon): number {
    return twoAmmoHue(id, this.s2ShotIdx, 28);
  }

  /** True when the equipped gun must fire slide 2's own shot. */
  private get setTwoLive(): boolean {
    return this.setTwoId !== null && getGunEffect(this.weapon.id) === 'set2';
  }

  /**
   * True when the scene should wear slide 2's own look: its night sky, skyline,
   * stars, per-weapon atmosphere, wheel glow and its hand-drawn stuck rounds.
   * That is the same guns that fire slide 2's shot — plus BLACK HOLE, whose
   * "Baru" shot already is slide 2's collapsing singularity.
   */
  private get setTwoLook(): boolean {
    const weapon = this.weapon;
    if (!weapon || this.setTwoId === null) return false;
    const effect = getGunEffect(weapon.id);
    return effect === 'set2' || (weapon.id === 'blackhole' && effect === 'new');
  }

  /** Plays slide 2's own clear/fail voice; false when it has none to play. */
  private setTwoVoice(kind: 'clear' | 'fail'): boolean {
    const id = this.setTwoId;
    if (!id || !this.setTwoLook) return false;
    (kind === 'clear' ? SET_TWO_CLEAR : SET_TWO_FAIL)[id]?.();
    return true;
  }

  /** Slide-7 SET 1 FX layer: its own particles, FX objects and after() timers. */
  private s1State?: SetOneFx;
  private get s1(): SetOneFx {
    return (this.s1State ??= new SetOneFx());
  }
  /** Last SET 1 shot, so special targets can replay the right impact burst. */
  private s1Last?: SetOneShot;

  /** The slide-7 SET 1 weapon behind the equipped slide-1 gun, if any. */
  private get setOneId(): SetOneId | null {
    return setOneIdFor(this.weapon.id);
  }

  /** True when the equipped gun must fire the slide-7 SET 1 shot. */
  private get setOneLive(): boolean {
    return this.setOneId !== null && getGunEffect(this.weapon.id) === 'new' && !this.slide2Void;
  }

  /** The slide-7 side effects that only the game itself can perform. */
  private s1Hooks(): SetOneHooks {
    return {
      shake: (amount) => { this.shake = Math.max(this.shake, amount); },
      hitStop: (seconds) => { this.hitStop = Math.max(this.hitStop, seconds); },
      flash: (rgb, strength) => {
        this.tintRgb = rgb;
        this.tintA = Math.max(this.tintA, strength);
      },
      paintWheel: (draw) => {
        this.faceCtx.save();
        draw(this.faceCtx);
        this.faceCtx.restore();
      },
      addWheelFx: (fx) => { this.s1.addWheel(fx); },
      wheel: () => ({ x: CX, y: this.targetY, R: this.level.radius }),
    };
  }

  /**
   * Slide-7 SET 2..5 FX layer: slide 7's own particles, FX objects, animation
   * springs and the real slide-7 shots (`projectiles2..5.ts`).
   */
  private s7State?: SetSevenFx;
  private s7Weapon?: SevenId;
  private get s7(): SetSevenFx {
    const fx = (this.s7State ??= new SetSevenFx());
    fx.setHooks(this.s7Hooks());
    fx.gunX = CX;
    fx.gunY = GUN_Y;
    return fx;
  }

  /** Last slide-7 shot, for special targets (stones/diamonds/gold). */
  private s7Last?: SevenShot;

  /**
   * Drop slide 7's own layer: its stuck rounds, particles, FX and timers all
   * belong to the level (and to the gun) that produced them, exactly like slide
   * 7 clears them on a new level or when the wheel shatters.
   */
  private resetSevenLayer() {
    this.s7State?.clear();
    this.s7Weapon = undefined;
    this.s7Last = undefined;
    this.s9State?.clear();
    this.s11State?.clear();
    this.s6State?.clear();
    this.s2wState?.clear();
    this.s2ShotIdx = 0;
  }

  /**
   * Slide-6 (`games/game-2`) layer: its own beams, muzzle bursts, chip/spark
   * particles and the scorch marks it leaves on the wheel.
   */
  private s6State?: SetSixFx;

  private get s6(): SetSixFx {
    const fx = (this.s6State ??= new SetSixFx());
    fx.setHooks(this.sixHooks());
    fx.W = W;
    fx.H = H;
    return fx;
  }

  /** The slide-6 weapon behind the equipped slide-1 gun, if any. */
  private get setSixId(): SixId | null {
    return setSixIdFor(this.weapon.id);
  }

  /** True when the equipped gun must fire slide 6's own beam. */
  private get setSixLive(): boolean {
    return this.setSixId !== null && getGunEffect(this.weapon.id) === 'set6';
  }

  /** The slide-6 side effects that need the slide-1 game to act. */
  private sixHooks(): SixHooks {
    return {
      shake: (amount) => { this.shake = Math.max(this.shake, amount * 0.55); },
      wheel: () => ({ x: CX, y: this.targetY, R: this.level.radius, angle: this.rot }),
    };
  }

  /**
   * Slide-9 (`games/game-6`) layer: its own particles, rounds, beams, entry
   * holes, timers and synthesizer.
   */
  private s9State?: SetNineFx;

  private get s9(): SetNineFx {
    const fx = (this.s9State ??= new SetNineFx());
    fx.setHooks(this.nineHooks());
    fx.W = W;
    fx.H = H;
    fx.floorY = H;
    return fx;
  }

  /** The slide-9 weapon behind the equipped slide-1 gun, if any. */
  private get setNineId(): NineId | null {
    return setNineIdFor(this.weapon.id);
  }

  /** True when the equipped gun must fire slide 9's own shot. */
  private get setNineLive(): boolean {
    return this.setNineId !== null && getGunEffect(this.weapon.id) === 'set9';
  }

  /** The slide-9 side effects that need the slide-1 game to act. */
  private nineHooks(): NineHooks {
    return {
      shake: (amount) => { this.shake = Math.max(this.shake, amount * 0.55); },
      flash: (color, strength) => {
        this.tintRgb = hexToRgbTriplet(color);
        this.tintA = Math.max(this.tintA, Math.min(0.36, strength * 0.45));
      },
      hitStop: (seconds) => { this.hitStop = Math.max(this.hitStop, Math.min(0.12, seconds)); },
      wheel: () => ({ x: CX, y: this.targetY, R: this.level.radius, angle: this.rot }),
    };
  }

  /**
   * Slide-11 (`games/game-8`) layer: its own particles, rounds, entry holes,
   * wheel marks and sound engine. Slide 11 is the newest layer, so it sits on
   * top of slide 9 for the guns both of them update.
   */
  private s11State?: SetElevenFx;

  private get s11(): SetElevenFx {
    const fx = (this.s11State ??= new SetElevenFx());
    fx.setHooks(this.elevenHooks());
    return fx;
  }

  /** The slide-11 weapon behind the equipped slide-1 gun, if any. */
  private get setElevenId(): ElevenId | null {
    return setElevenIdFor(this.weapon.id);
  }

  /** True when the equipped gun must fire slide 11's own shot. */
  private get setElevenLive(): boolean {
    return this.setElevenId !== null && getGunEffect(this.weapon.id) === 'set11';
  }

  private elevenHooks(): ElevenHooks {
    return {
      shake: (amount) => { this.shake = Math.max(this.shake, amount * 0.5); },
      flash: (color, strength) => {
        this.tintRgb = hexToRgbTriplet(color);
        this.tintA = Math.max(this.tintA, Math.min(0.36, strength * 0.45));
      },
      hitStop: (seconds) => { this.hitStop = Math.max(this.hitStop, Math.min(0.12, seconds)); },
      wheel: () => ({ x: CX, y: this.targetY, R: this.level.radius, angle: this.rot }),
    };
  }

  /** The slide-7 weapon behind the equipped slide-1 gun, if any. */
  private get setSevenId(): SevenId | null {
    return setSevenIdFor(this.weapon.id);
  }

  /** True when the equipped gun must fire slide 7's own SET 2..5 shot. */
  private get setSevenLive(): boolean {
    return this.setSevenId !== null && getGunEffect(this.weapon.id) === 'set7';
  }

  /** The slide-7 side effects that need the slide-1 game to act. */
  private s7Hooks(): SevenHooks {
    return {
      shake: (amount) => { this.shake = Math.max(this.shake, amount); },
      hitStop: (seconds) => { this.hitStop = Math.max(this.hitStop, seconds); },
      flash: (rgb, strength) => {
        this.tintRgb = rgb;
        this.tintA = Math.max(this.tintA, strength);
      },
      paintWheel: (draw, R) => {
        const c = this.faceCtx;
        c.save();
        c.beginPath();
        c.arc(0, 0, Math.max(1, R - 0.6), 0, TAU);
        c.clip();
        draw(c);
        c.restore();
      },
      wheelImpact: (power, color) => {
        this.bump = Math.max(this.bump, Math.min(1.4, power / 7));
        this.wheelFlash = Math.max(this.wheelFlash, 1);
        this.wheelFlashRgb = color.replace('rgba(', '').replace(/,\s*$/, '');
      },
      wheel: () => ({ x: CX, y: this.targetY, R: this.level.radius, angle: this.rot }),
    };
  }

  private fwState?: Firework8State;

  private getFwState(): Firework8State {
    if (!this.fwState) {
      this.fwState = createFirework8State(W, H);
    }
    return this.fwState;
  }
  private yoyoState?: YoyoSlideState;

  private getYoyoState(): YoyoSlideState {
    if (!this.yoyoState) {
      this.yoyoState = createYoyoSlideState(W, H);
    }
    return this.yoyoState;
  }
  private kerisState?: KerisSlideState;

  private getKerisState(): KerisSlideState {
    if (!this.kerisState) {
      this.kerisState = createKerisSlideState(W, H);
    }
    return this.kerisState;
  }
  private diamondState?: DiamondSlideState;

  private getDiamondState(): DiamondSlideState {
    if (!this.diamondState) {
      this.diamondState = createDiamondSlideState(W, H);
    }
    return this.diamondState;
  }
  private bazookaState?: BazookaSlideFx;

  private getBazookaState(): BazookaSlideFx {
    if (!this.bazookaState) {
      this.bazookaState = new BazookaSlideFx();
    }
    return this.bazookaState;
  }
  private hitStop = 0;
  private camY = 0;
  private tintA = 0;
  private tintRgb = '255,255,255';
  private sink: FxSink = {
    push: (p: Particle) => {
      if (this.particles.length < 1100 || p.kind === 'text') this.particles.push(p);
    },
    light: (x, y, r, rgb, life) => {
      if (this.lights.length < 24) this.lights.push({ x, y, r, rgb, life, max: life });
    },
  };

  setWeapon(id: WeaponId) {
    const changed = this.weapon?.id !== id;
    this.weapon = getWeapon(id);
    // Rounds stuck in the wheel belong to the gun that fired them.
    if (changed) this.resetSevenLayer();
    // The gun art may only spawn its charge sparks into a live FX layer, never
    // into menu thumbnails.
    setSlide2GunFx(id === 'blackhole' && getGunVariant(id) === 'latest' ? this.s2 : null);
    this.aiming = false;
    this.spin = 0;
    // A newly equipped cannon starts with no more balls than the level's
    // remaining ammo; changing guns never grants additional stage shots.
    if (id === 'snowball') this.snowLoaded = this.state === 'idle'
      ? SNOWBALL_MAG_SIZE : Math.min(SNOWBALL_MAG_SIZE, this.ammoLeft);
  }

  private get targetY() {
    if (isSpecial(this.level.mode)) return SPECIAL_CY;
    return CY - (this.level.boss ? bossRiseOffset(this.levelTime) : 0);
  }
  private get hasTwinGuns() { return this.level.mode === 'double' || this.twinGuns; }
  private get gunOffsets(): readonly number[] { return this.hasTwinGuns ? TWIN_BARRELS : SINGLE_BARREL; }

  constructor(canvas: HTMLCanvasElement, events: GameEvents) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.events = events;
    this.level = makeLevel(1);
    this.events.onStageChange?.();
    this.level.style = 'orange';
    this.buildFace();
    this.placeObstacles();
    for (let i = 0; i < 45; i++) {
      this.dust.push({ x: Math.random() * W, y: Math.random() * H, s: rand(0.6, 2.2), v: rand(6, 22), a: rand(0.1, 0.5) });
    }
    this.resize();
    window.addEventListener('resize', this.resize);
    window.addEventListener('keydown', this.onKey);
    window.addEventListener('keyup', this.onKeyUp);
    canvas.addEventListener('pointerdown', this.onPointer);
    window.addEventListener('pointerup', this.onRelease);
    window.addEventListener('pointercancel', this.onRelease);
    window.addEventListener('blur', this.onRelease);
    // Paint a still frame for inactive slides; start the simulation only on focus.
    this.render();
    this.hasRendered = true;
    onBossAssetsLoaded(() => {
      if (this.level.boss) {
        this.buildFace();
      }
    });
  }

  setActive(active: boolean) {
    if (this.active === active) return;
    this.active = active;
    if (active) {
      // Discard elapsed time while unfocused; never fast-forward a level or timer.
      this.last = performance.now();
      this.raf = requestAnimationFrame(this.loop);
    } else {
      cancelAnimationFrame(this.raf);
      this.raf = 0;
      // A held mouse/key must not resume firing when this slide is selected again.
      this.holding = false;
      this.aiming = false;
      this.charging = false;
    }
  }

  destroy() {
    this.setActive(false);
    window.removeEventListener('resize', this.resize);
    window.removeEventListener('keydown', this.onKey);
    window.removeEventListener('keyup', this.onKeyUp);
    this.canvas.removeEventListener('pointerdown', this.onPointer);
    window.removeEventListener('pointerup', this.onRelease);
    window.removeEventListener('pointercancel', this.onRelease);
    window.removeEventListener('blur', this.onRelease);
  }

  private onRelease = () => {
    this.holding = false;
    this.releaseScope();
  };

  private onKeyUp = (e: KeyboardEvent) => {
    if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'Enter') {
      this.holding = false;
      this.releaseScope();
    }
  };

  private press() {
    if (this.choosingBuff) return;
    this.holding = true;
    if (this.weapon.scope) {
      if (this.state === 'play' && this.cooldown <= 0 && this.ammoLeft > 0 && !this.aiming) {
        this.aiming = true;
        this.aimT = 0;
        sfx2.scope();
      }
      return;
    }
    if (this.weapon.spinup) {
      if (this.state === 'play' && this.spin < 0.1) sfx2.spinUp();
      return;
    }
    if (this.weapon.charge) {
      if (this.state === 'play' && this.cooldown <= 0 && this.ammoLeft > 0 && !this.charging) {
        this.charging = true;
        this.chargeT = 0;
        this.chargeStage = 0;
      }
      return;
    }
    this.shoot();
  }

  private releaseScope() {
    if (this.charging) {
      this.charging = false;
      this.chargeLevel = this.chargeT >= 1 ? 2 : this.chargeT >= 0.35 ? 1 : 0;
      this.chargeT = 0;
      this.shoot();
      this.chargeLevel = 0;
      return;
    }
    if (!this.aiming) return;
    this.aiming = false;
    this.shoot();
  }

  private resize = () => {
    this.scale = 1;
    // Cap the backing store: a 420×760 game remains crisp at 2× without
    // rasterizing the costly canvas effects at 2.5–3× on mobile devices.
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.style.width = `${W}px`;
    this.canvas.style.height = `${H}px`;
    this.canvas.width = Math.round(W * this.dpr);
    this.canvas.height = Math.round(H * this.dpr);
    this.acidFluid.resize(W, H);
    // Resizing clears the backing store. Restore a single still frame even
    // if the game is paused rather than leaving an empty thumbnail.
    if (this.hasRendered && !this.active) this.render();
  };

  private onKey = (e: KeyboardEvent) => {
    if (!this.active) return;
    if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'Enter') {
      if (this.state === 'play' || this.state === 'intro') {
        e.preventDefault();
        if (e.repeat) return;
        this.press();
      }
    }
  };

  private onPointer = (e: PointerEvent) => {
    e.preventDefault();
    // Cek tap pada bintang power-up lebih dulu
    if (this.star) {
      const rect = this.canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width * W;
      const y = (e.clientY - rect.top) / rect.height * H;
      if (this.tryTapStar(x, y)) return;
    }
    this.press();
  };

  private startRun(level: number, forcedMode?: LevelMode) {
    sfx.unlock();
    // Slide 7's own AudioContext can only start after a user gesture as well.
    setOneSfx.unlock();
    this.score = 0;
    this.coins = 0;
    this.bankedCoins = 0;
    this.particles = [];
    this.frags = [];
    this.flyers = [];
    this.loadLevel(level, forcedMode);
  }

  start() { this.startRun(1); }

  /** Start an existing SGA level directly from the level map without changing its stage rules. */
  startAtLevel(level: number) { this.startRun(Math.max(1, Math.floor(level))); }

  /** Menu shortcuts enter the same real, playable levels as the Arcade progression. */
  startSpecialStage(mode: 'boulder' | SpecialMode) { this.startRun(4, mode); }

  toIdle() {
    this.state = 'idle';
    this.snowLoaded = SNOWBALL_MAG_SIZE;
    this.level = makeLevel(1);
    this.events.onStageChange?.();
    this.level.style = 'orange';
    this.resetSevenLayer();
    this.items = [];
    this.projs = [];
    this.bossProjs = [];
    this.particles = [];
    this.frags = [];
    this.flyers = [];
    this.portals = [];
    this.lights = [];
    this.fwState = undefined;
    this.yoyoState = undefined;
    this.kerisState = undefined;
    this.diamondState = undefined;
    this.bazookaState = undefined;
    this.rock = null;
    this.chest = null;
    this.bonusCoins = [];
    this.rockBullets = [];
    this.fallenCells = [];
    this.chestBullets = [];
    this.treasureCoins = [];
    this.stageRewardPaid = false;
    this.coinPulse = 0;
    this.rockFragments = [];
    this.choosingBuff = false;
    this.twinGuns = false;
    this.star = null;
    this.flashWhite = 0;
    this.flashRed = 0;
    this.tintA = 0;
    this.shake = 0;
    this.bump = 0;
    this.wheelScale = 1;
    this.camY = 0;
    this.bannerT = 0;
    this.glitchT = 0;
    this.aiming = false;
    this.holding = false;
    this.charging = false;
    this.placeObstacles();
    this.buildFace();
    this.render();
  }

  continueAfterBoss() { this.loadLevel(this.level.n + 1); }

  startBossChallenge() { this.startRun(5); }

  applyBuff(kind: BuffKind) {
    if (!this.choosingBuff) return;
    if (!allowsStarPowerups(this.level)) {
      // Stale UI/input must never grant normal-stage star effects or leave play paused.
      this.choosingBuff = false;
      this.holding = false;
      this.aiming = false;
      this.aimT = 0;
      this.charging = false;
      this.chargeT = 0;
      this.chargeLevel = 0;
      gunState.charge = 0;
      return;
    }
    if (this.level.mode === 'treasure') {
      const treasureKinds: TreasureBuff[] = ['rapid', 'double', 'mini', 'giant'];
      this.treasureBuff = treasureKinds.includes(kind as TreasureBuff) ? kind as TreasureBuff : 'rapid';
    } else {
      const normalKinds = ['speed', 'ammo', 'power', 'double'] as const;
      const selected = normalKinds.includes(kind as typeof normalKinds[number])
        ? kind as typeof normalKinds[number] : 'speed';
      this.buff = selected;
      if (selected === 'ammo') {
        this.maxAmmoMult = 2;
        this.ammoLeft += this.level.ammo;
        if (this.weapon.id === 'snowball' && this.snowLoaded === 0 && this.reloadT === 0) this.reloadT = 0.85;
      }
      if (selected === 'power') this.dmgMult = 2;
    }
    if (kind === 'double') this.twinGuns = true;
    // Always release paused input state after a choice. This is particularly
    // important for boss fights and scoped/charged weapons interrupted by a star.
    this.choosingBuff = false;
    this.holding = false;
    this.aiming = false;
    this.aimT = 0;
    this.charging = false;
    this.chargeT = 0;
    this.chargeLevel = 0;
    gunState.charge = 0;
    sfx4.magic();
  }

  drawGunNowDirect(c: CanvasRenderingContext2D, id: WeaponId, cx: number, y0: number, t: number) {
    drawGun(c, id, cx, y0, t, 0, true);
  }

  /** Cek apakah tap mengenai bintang */
  tryTapStar(x: number, y: number): boolean {
    if (!this.star) return false;
    const s = this.star;
    if (Math.hypot(x - s.x, y - s.y) <= s.r * 1.35) {
      // The pickup moves; the weapon stays upright before and after selection.
      this.hitStar();
      return true;
    }
    return false;
  }

  private spawnFloatingStar() {
    if (!allowsStarPowerups(this.level)) return;
    const bottom = this.targetY + this.level.radius;
    const midGap = (bottom + GUN_Y) / 2;
    const baseY = Math.min(GUN_Y - 75, Math.max(bottom + 48, midGap + rand(-18, 18)));
    const fromLeft = Math.random() < 0.5;
    this.star = {
      x: fromLeft ? -40 : W + 40, y: baseY, baseY,
      vx: (fromLeft ? 1 : -1) * rand(125, 155), r: 26,
      age: 0, life: 6, max: 6,
    };
    sfx2.scope();
  }

  private hitStar() {
    if (!this.star || !allowsStarPowerups(this.level)) return;
    const s = this.star;
    this.star = null;
    this.holding = false;
    this.aiming = false;
    this.aimT = 0;
    this.charging = false;
    this.chargeT = 0;
    this.chargeLevel = 0;
    gunState.charge = 0;
    this.projs = [];
    // …and the imported layers forget the rounds slide 1 was flying. They each
    // draw their own carried round, and a carried round is never advanced by
    // its layer (slide 1 owns its position), so without this the screen the
    // star just cleared kept a round frozen in mid-air — slide 11's stayed for
    // the rest of the stage.
    this.s7.sweepCarried();
    this.s9.sweepCarried();
    this.s11.sweepCarried();
    this.choosingBuff = true;
    sfx4.magic();
    this.flashWhite = Math.max(this.flashWhite, 0.35);
    this.sink.light(s.x, s.y, 220, '250,204,21', 0.6);
    this.sink.push({ x: s.x, y: s.y, vx: 0, vy: 0, life: 0.45, max: 0.45, size: 90, color: '250,204,21', kind: 'shock', rot: 0, vr: 0, g: 0 });
    for (let i = 0; i < 30; i++) {
      const a = rand(0, TAU);
      const v = rand(150, 520);
      this.sink.push({ x: s.x, y: s.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: rand(0.4, 0.9), max: 0.9, size: rand(3, 7), color: pick(['#fde047', '#ffffff', '#fbbf24']), kind: 'star', rot: 0, vr: 0, g: 0, drag: 2 });
    }
    this.addText('★ POWER UP!', s.x, s.y - 40, '#fde047', 26);
    this.events.onStarHit?.(this.level.mode === 'treasure');
  }

  private loadLevel(n: number, forcedMode?: LevelMode) {
    this.level = makeLevel(n, forcedMode);
    this.events.onStageChange?.();
    // A new level starts with an empty wheel: no rounds stuck from the last one.
    this.resetSevenLayer();
    this.items = [];
    this.projs = [];
    // …and with a clean screen. The debris of the stage that just ended — the
    // shattered wheel's nine wedge fragments, the rounds flung out of it, the
    // clear explosion's smoke and sparks — used to keep flying over the new
    // wheel, because only `startRun()` cleared these arrays and a stage
    // auto-advance comes through here instead. On screen that reads as the new
    // wheel "pecah padahal baru sekali tembak".
    this.frags = [];
    this.flyers = [];
    this.particles = [];
    this.lights = [];
    this.beams = [];
    this.rockFragments = [];
    this.rockBullets = [];
    this.fallenCells = [];
    this.chestBullets = [];
    this.treasureCoins = [];
    this.stageRewardPaid = false;
    this.coinPulse = 0;
    this.rock = this.level.mode === 'boulder' || this.level.mode === 'bonus' ? new DiamondRock() : null;
    this.chest = this.level.mode === 'treasure' ? new TreasureChest() : null;
    this.bonusCoins = this.level.mode === 'bonus' ? this.buildBonusCoins() : [];
    this.stageTime = isSpecial(this.level.mode) ? STAGE_SECONDS[this.level.mode] : 0;
    this.stageStartCoins = this.coins;
    this.reloadT = 0;
    this.diamondPing = 0;
    this.centerDiamondCollected = false;
    this.centerDiamondHits = 0;
    this.diamondHoldUntil = 0;
    this.choosingBuff = false;
    this.buff = null;
    this.treasureBuff = null;
    this.twinGuns = false;
    this.star = null;
    // Only bosses and special/bonus stages get a star; treasure gets it early.
    this.starTimer = !allowsStarPowerups(this.level) ? Infinity
      : this.level.mode === 'treasure' ? 2.2 : 5 + Math.random() * 3;
    this.speedMult = 1;
    this.dmgMult = 1;
    this.maxAmmoMult = 1;
    this.level.maxHp = this.rock?.total ?? 0;
    this.level.hp = this.rock?.remaining ?? 0;
    this.placeObstacles();
    this.ammoLeft = this.level.ammo;
    this.snowLoaded = Math.min(SNOWBALL_MAG_SIZE, this.ammoLeft);
    this.stuck = 0;
    this.combo = 0;
    // Boss (kepala bos) tampil tegak dan TIDAK berputar seperti papan target biasa.
    this.rot = this.level.boss ? 0 : rand(0, TAU);
    this.levelTime = 0;
    this.state = 'intro';
    this.introT = 0;
    this.wheelScale = 0.15;
    this.bannerT = 1.8;
    this.timeScale = 1;
    this.slowT = 0;
    this.savesLeft = this.weapon.saves ?? 0;
    this.perkCount = 0;
    this.burnT = 0;
    this.spikeOffT = 0;
    this.targetR = 0;
    this.aiming = false;
    this.portals = [];
    this.bossProjs = [];
    this.bossShootTimer = 1.8;
    const fw = this.getFwState();
    fw.shotIdx = 0;
    fw.impactIdx = 0;
    if (this.weapon.id === 'firework') {
      for (let i = 0; i < 2; i++) launchFirework8Sky(fw, true);
    }
    const yoyo = this.getYoyoState();
    yoyo.shotIdx = 0;
    yoyo.strings = [];
    const keris = this.getKerisState();
    keris.crawlArcs = [];
    keris.thunderFlash = 0;
    const diamond = this.getDiamondState();
    diamond.shotIdx = 0;
    const bazooka = this.getBazookaState();
    bazooka.shotHueIdx = 0;
    if (this.level.boss) {
      this.bossMaxHp = this.level.ammo * 10;
      this.bossHp = this.bossMaxHp;
      this.bossHpRed = this.bossMaxHp;
    }
    if (!isSpecial(this.level.mode)) this.buildFace();
    sfx.start();
    if (this.level.boss) sfx.boss();
  }

  private buildBonusCoins(): BonusCoin[] {
    const coins: BonusCoin[] = [];
    for (const { radius, count } of [
      { radius: 96, count: 12 }, { radius: 132, count: 16 }, { radius: 168, count: 20 },
    ]) {
      for (let i = 0; i < count; i++) {
        coins.push({ angle: i * TAU / count, radius, phase: rand(0, TAU), taken: false });
      }
    }
    return coins;
  }

  private placeObstacles() {
    if (isSpecial(this.level.mode)) return;
    const place = (type: ItemType, count: number, sep: number) => {
      for (let i = 0; i < count; i++) {
        for (let t = 0; t < 300; t++) {
          const a = rand(0, TAU);
          if (this.items.every((it) => angDiff(it.angle, a) > sep)) {
            this.items.push({ angle: a, type, age: 10,
              scale: type === 'old' ? BOARD_OBSTACLE_SCALE : undefined });
            break;
          }
        }
      }
    };
    place('spike', this.level.spikes, 0.45);
    place('old', this.level.old, 0.4);
    place('coin', this.level.coins, 0.32);
    // Berlian / Diamond tertancap di arena yang butuh 2x tembakan baru jatuh!
    // (Dark Knight: penghalang berlian juga dihilangkan.)
    const cleanKnight = this.level.boss && this.level.style === 'knight';
    if (!cleanKnight && this.level.n >= 2 && Math.random() < 0.6) {
      place('diamond_chest', 1, 0.42);
    }
  }

  private buildFace() {
    const R = this.level.radius;
    const S = this.faceScale;
    const pad = this.level.boss ? 40 : 4;
    const size = (R + pad) * 2;
    const cv = document.createElement('canvas');
    cv.width = cv.height = size * S;
    const c = cv.getContext('2d')!;
    c.scale(S, S);
    c.translate(R + pad, R + pad);
    drawFace(c, R, this.level.style);
    this.face = cv;
    this.faceCtx = c;
    this.faceR = R;
  }

  private crack(a: number, tint?: string) {
    const c = this.faceCtx;
    c.save();
    drawPreciseWeaponDecal(c, this.faceR, a, this.weapon, this.level.style, this.time, tint);
    c.restore();
  }

  /**
   * Lateral speed for pellet `i` of an `n`-pellet burst, so the pellets fan out
   * and land on different angles of the wheel (the same 26 px fan slide 1 has
   * always used: `off * speed / travel`).
   *
   * Slides 7, 9 and 11 spawn every pellet in the same lane with `vx = 0`. For a
   * burst gun that meant pellets two and three flew straight into the round
   * their own sibling had just stuck into the wheel, `stepProj` reported
   * `fail`, and the stage ended on the very first trigger pull — the Sapphire
   * Shotgun did this every time, because its slide-7 look is its default one.
   */
  private pelletVx(i: number, n: number, speed: number) {
    if (n < 2) return 0;
    const travel = Math.max(1, GUN_Y - (this.targetY + this.level.radius));
    return (((i - (n - 1) / 2) * 26) * speed) / travel;
  }

  /**
   * Where each carried round of one trigger starts, and how it drifts.
   *
   * Slide 1's own guns walk `gunOffsets` (one round per barrel) and fan a burst
   * across `burst` lanes. The imported layers hand back their own rounds, whose
   * count does not have to match: a twin-barrel shotgun has six carriers for
   * three rounds, a volley gun has two rounds for one carrier. The plan keeps
   * every carrier on its own lane so two rounds can never fly into each other
   * (that collision failed the shot and ended the stage on the first trigger),
   * while a twin-barrel shot still leaves each barrel straight up, exactly the
   * way slide 1's own guns fly it.
   */
  private carrierPlan(n: number, rounds: number, speed: number) {
    const barrels = this.gunOffsets.length;
    const lanes = Math.max(n, Math.ceil(rounds / barrels));
    const plan: { ox: number; vx: number; first: boolean }[] = [];
    for (let i = 0; i < lanes * barrels; i++) {
      const barrel = i % barrels;
      const lane = Math.floor(i / barrels);
      plan.push({
        ox: this.gunOffsets[barrel] ?? 0,
        vx: this.pelletVx(lane, lanes, speed),
        first: lane === 0,
      });
    }
    return plan;
  }

  /**
   * A carrier whose round never arrives.
   *
   * Charged recipes (the emerald staff, the buster, the obliterator) build their
   * round from a charge, so the second barrel of a `double` shot cannot create a
   * second one — and a burst gun can hand back fewer rounds than slide 1 has
   * pellets. The carrier used to wait at the muzzle forever: it was invisible,
   * it never hit anything and it never went away.
   *
   * After a short grace period it becomes one of the invisible extra pellets the
   * imported guns already use (`s7Ghost` and friends) and flies out like them.
   * Returns true while the carrier should stay put.
   */
  private strandCarrier(p: Proj) {
    p.hold = (p.hold ?? 0) + 1 / 60;
    if (p.hold < 1) return true;
    if (p.setSevenPending) p.s7Ghost = (p.setSevenPending = false, true);
    else if (p.setNinePending) p.s9Ghost = (p.setNinePending = false, true);
    else if (p.setElevenPending) p.s11Ghost = (p.setElevenPending = false, true);
    return false;
  }

  /**
   * The second barrel of an imported gun.
   *
   * Slide 1's own guns fire one round per barrel — `gunOffsets` has two entries
   * while the treasure star's `double` (or the old `double` stage) is active,
   * and the classic fire loop walks them. The imported layers build exactly one
   * round per recipe, so the second barrel drew a gun that never fired: the
   * `double` card made the weapon *look* doubled while every shot, every hit
   * and the whole score still came from the left barrel alone.
   *
   * Each layer's recipe runs once more at its own muzzle. The ported voices are
   * muted for that call: slide 1 has always played a single voice per trigger,
   * so the extra barrel adds a round, not a second bang.
   */
  private fireTwinBarrel<T>(made: T[], fire: () => void, take: () => T[]) {
    if (!this.hasTwinGuns || made.length >= 2) return;
    silentPreview(() => {
      fire();
      made.push(...take());
    });
  }

  // ---------- actions ----------
  shoot() {
    if (this.state !== 'play' || this.choosingBuff) return;
    if (this.cooldown > 0 || this.ammoLeft <= 0 || this.reloadT > 0) return;
    const w = this.weapon;
    if (w.id === 'snowball' && this.snowLoaded <= 0) return;
    const n = Math.min(w.burst ?? 1, this.ammoLeft);
    this.ammoLeft -= n;
    if (w.id === 'snowball') this.snowLoaded = Math.max(0, Math.min(this.snowLoaded - n, this.ammoLeft));
    this.lastShotRT = this.rt;
    this.stretchPlayed = false;
    gunState.shots++;
    this.events?.onShotFired?.(n);
    const big = w.charge ? this.chargeLevel : 0;
    const tint = w.paint ? pick(PAINT) : undefined;
    const vx = 0; // stars never steer the weapon or its shots
    const vy = -w.speed * this.speedMult;
    const offsets = this.gunOffsets;
    const sizeBuff = { mini: this.treasureBuff === 'mini', giant: this.treasureBuff === 'giant' };
    // ── Slide 6 (`games/game-2`) ───────────────────────────────────────────
    // Slide 6's own `fire()` runs: its muzzle burst and its beam, painted from
    // the muzzle to the wheel with slide 6's own colours, wobble and lifetime.
    // Slide 6's beams are hitscan there (the trigger paints the beam and
    // resolves the hit in the same call), so slide 1's carrier crosses the
    // field at beam speed — nothing is drawn at the carrier, the beam *is* the
    // shot, and the scorch mark appears while the beam is still lit.
    const s6id = this.setSixId;
    if (s6id && this.setSixLive) {
      const fx = this.s6;
      fx.selectWeapon(s6id);
      fx.time = this.time;
      fx.syncWheel();
      const my = GUN_Y - 4;
      fx.fire(CX + (offsets[0] ?? 0), my);
      // Slide 6 shipped no audio at all (its component never opens an
      // AudioContext), so there is no voice to import: the gun keeps slide 1's
      // own fire sound instead of the export turning it silent.
      playFireSfx(w.id);
      // The second barrel of the `double` star paints slide 6's muzzle burst
      // from its own muzzle. Silent: slide 1 plays one voice per trigger.
      if (this.hasTwinGuns) {
        silentPreview(() => fx.fire(CX + (offsets[1] ?? offsets[0] ?? 0), my));
      }
      const beams = this.hasTwinGuns ? 2 : 1;
      const plan = this.carrierPlan(n, beams, SIX_BEAM_SPEED);
      for (const step of plan) {
        this.projs.push({
          x: CX + step.ox, originX: CX + step.ox, y: my,
          vx: vx + step.vx, vy: -SIX_BEAM_SPEED * this.speedMult,
          big, tint, ...sizeBuff, setSix: true,
        });
      }
      this.recoil = w.recoil;
      this.muzzle = 0.07;
      this.camY += FX[w.id].kick * 0.5;
      // Slide 6's own trigger interval (0.60 s for both the sniper and the
      // heat-ray, 0.45 s for the repulsor), plus slide 1's temporary buffs.
      this.cooldown = (sixCooldown(s6id) ?? w.cooldown)
        * (this.buff === 'speed' || this.treasureBuff === 'rapid' ? 0.5 : this.treasureBuff === 'mini' ? 0.6 : 1);
      if (isSpecial(this.level.mode) && this.ammoLeft === 0) this.reloadT = 0.65;
      return;
    }
    // ── Slide 9 (games/game-6) ─────────────────────────────────────────────
    // Slide 9's own `fire()` runs: its muzzle FX, its particles, its sounds and
    // the real slide-9 projectile or beam. Slide 1 still owns the flight, the
    // hit test and the score, so it only carries that round.
    const s9id = this.setNineId;
    if (s9id && this.setNineLive) {
      const fx = this.s9;
      fx.selectWeapon(s9id);
      fx.time = this.time;
      fx.syncWheel();
      const mx = CX + (offsets[0] ?? 0);
      const my = GUN_Y - 4;
      unlockNineAudio();
      fx.fire(mx, my, -Math.PI / 2, w.charge ? this.chargeLevel : 0);
      const made = fx.takeShots();
      this.fireTwinBarrel(made,
        () => fx.fire(CX + (offsets[1] ?? offsets[0] ?? 0), my, -Math.PI / 2, w.charge ? this.chargeLevel : 0),
        () => fx.takeShots());
      const plan = this.carrierPlan(n, made.length, w.speed);
      for (let i = 0; i < plan.length; i++) {
        const own = made[i];
        const proj: Proj = {
          x: CX + plan[i].ox, originX: CX + plan[i].ox, y: own ? own.y : my,
          vx: vx + plan[i].vx, vy, big, tint, ...sizeBuff,
        };
        if (own) proj.setNine = own;
        else if (plan[i].first) proj.setNinePending = true;
        else proj.s9Ghost = true;
        this.projs.push(proj);
      }
      this.recoil = w.recoil;
      this.muzzle = 0.07;
      this.camY += FX[w.id].kick * 0.5;
      this.cooldown = (w.spinup ? 0.3 - 0.235 * this.spin : w.cooldown)
        * (this.buff === 'speed' || this.treasureBuff === 'rapid' ? 0.5 : this.treasureBuff === 'mini' ? 0.6 : 1);
      if (isSpecial(this.level.mode) && this.ammoLeft === 0) this.reloadT = 0.65;
      else if (w.id === 'snowball' && this.snowLoaded === 0 && this.ammoLeft > 0) this.reloadT = 0.85;
      return;
    }
    // ── Slide 11 (games/game-8) ────────────────────────────────────────────
    // Slide 11 is the newest layer: its own `fire()` runs (muzzle FX, particles,
    // sound, channel beams and the real slide-11 round), and slide 1 still owns
    // the flight, the hit test and the score.
    const s11id = this.setElevenId;
    if (s11id && this.setElevenLive) {
      const fx = this.s11;
      fx.gunY = GUN_Y - 4;
      fx.selectWeapon(s11id);
      fx.syncWheel();
      const mx = CX + (offsets[0] ?? 0);
      const my = GUN_Y - 4;
      unlockElevenAudio(fx);
      fx.fire(mx, my, w.charge ? big : 0);
      const made = fx.takeShots();
      this.fireTwinBarrel(made,
        () => fx.fire(CX + (offsets[1] ?? offsets[0] ?? 0), my, w.charge ? big : 0),
        () => fx.takeShots());
      // Slide 1 flies the round at slide 11's own projectile speed, so the tail
      // keeps slide 11's spacing instead of stretching.
      const sp = made[0] ? Math.hypot(made[0].vx, made[0].vy) : Math.abs(vy);
      const plan = this.carrierPlan(n, made.length, sp);
      for (let i = 0; i < plan.length; i++) {
        const own = made[i];
        const proj: Proj = {
          x: CX + plan[i].ox, originX: CX + plan[i].ox, y: own ? own.y : my,
          vx: vx + plan[i].vx, vy: -sp,
          big, tint, ...sizeBuff,
        };
        if (own) proj.setEleven = own;
        else if (plan[i].first) proj.setElevenPending = true;
        else proj.s11Ghost = true;
        this.projs.push(proj);
      }
      this.recoil = w.recoil;
      this.muzzle = 0.07;
      this.camY += FX[w.id].kick * 0.5;
      this.cooldown = (w.spinup ? 0.3 - 0.235 * this.spin : w.cooldown)
        * (this.buff === 'speed' || this.treasureBuff === 'rapid' ? 0.5 : this.treasureBuff === 'mini' ? 0.6 : 1);
      if (isSpecial(this.level.mode) && this.ammoLeft === 0) this.reloadT = 0.65;
      else if (w.id === 'snowball' && this.snowLoaded === 0 && this.ammoLeft > 0) this.reloadT = 0.85;
      return;
    }
    // ── Slide 2 (`games/fireworkgun`) ──────────────────────────────────────
    // Slide 2's own muzzle recipe runs (flash, cone, backblast, smoke, embers,
    // its voice) and the round it hands over is its own art, flown by slide 1.
    const s2id = this.setTwoId;
    if (s2id && this.setTwoLive) {
      const fx = this.s2w;
      fx.cx = CX;
      fx.cy = this.targetY;
      fx.radius = this.level.radius;
      fx.gunY = GUN_Y;
      fx.h = H;
      slide2Sfx.unlock();
      // `fire()` also hands back the round slide 2 just loaded (its own seed),
      // so the trail and the impact wear exactly the colours slide 2 picked.
      const round = fx.fire(s2id, this.s2HueFor(s2id));
      const rounds = [round];
      // Its own recipe again for the second barrel: slide 2 hands back a fresh
      // round seed, so the two barrels do not share one trail.
      this.fireTwinBarrel(rounds, () => {
        rounds.push(fx.fire(s2id, this.s2HueFor(s2id)));
      }, () => []);
      const plan = this.carrierPlan(n, rounds.length, w.speed);
      for (let i = 0; i < plan.length; i++) {
        this.projs.push({
          x: CX + plan[i].ox, originX: CX + plan[i].ox, y: GUN_Y - 22,
          vx: vx + plan[i].vx, vy,
          big, tint, ...sizeBuff,
          setTwo: { ...(rounds[i] ?? round) },
        });
      }
      this.recoil = w.recoil;
      this.muzzle = 0.07;
      this.camY += FX[w.id].kick * 0.5;
      this.cooldown = (w.spinup ? 0.3 - 0.235 * this.spin : w.cooldown)
        * (this.buff === 'speed' || this.treasureBuff === 'rapid' ? 0.5 : this.treasureBuff === 'mini' ? 0.6 : 1);
      this.s2ShotIdx++;
      if (isSpecial(this.level.mode) && this.ammoLeft === 0) this.reloadT = 0.65;
      else if (w.id === 'snowball' && this.snowLoaded === 0 && this.ammoLeft > 0) this.reloadT = 0.85;
      return;
    }
    // ── Slide-7 SET 2..5 ───────────────────────────────────────────────────
    // Slide 7's own fire recipe runs (its muzzle FX, its particles, its sound),
    // and the shot it creates is the real slide-7 projectile: the very class
    // that paints the flight, the trail and the impact burst on slide 7. Slide 1
    // still owns the flight and the hit test, so it only carries that shot.
    const s7id = this.setSevenId;
    if (s7id && this.setSevenLive) {
      const fx = this.s7;
      if (this.s7Weapon !== s7id) {
        // A different weapon: slide 7 starts its animation from rest.
        fx.anim = newAnim();
        fx.particles.clear();
        fx.fx.length = 0;
        fx.wheelFx.length = 0;
        fx.timers.length = 0;
        fx.shots.length = 0;
        fx.stuck.length = 0;
        this.s7Weapon = s7id;
      }
      fx.weaponId = s7id;
      fx.time = this.time;
      fx.syncWheel();
      const mx = CX + (offsets[0] ?? 0);
      const my = GUN_Y - 4;
      // Slide 7 counts the shot before the recipe runs (the firework cycle
      // picks its rocket from that counter).
      fx.shotsFired++;
      FIRE_RECIPES[s7id](fx, mx, my);
      const made = fx.takeShots();
      this.fireTwinBarrel(made,
        () => FIRE_RECIPES[s7id](fx, CX + (offsets[1] ?? offsets[0] ?? 0), my),
        () => fx.takeShots());
      // The round slide 7 just launched decides how fast slide 1's carrier
      // travels: its own `vy` is the launch speed its class was built with, so
      // the flight, the trail spacing and the streak in its `draw()` all keep
      // slide 7's timing instead of slide 1's (snowball 1050 instead of 2000,
      // holy light 900 instead of an instant 14000 beam…).
      const shotSpeed = made[0] ? sevenShotSpeed(made[0], w.speed) : w.speed;
      const shotVy = -shotSpeed * this.speedMult;
      // Slide 1 still fires one round per pellet (that is how ammo, hits and
      // the score have always worked). Slide 7's real shot rides the first
      // one; the extra pellets of a burst gun stay invisible carriers.
      const plan = this.carrierPlan(n, made.length, shotSpeed);
      for (let i = 0; i < plan.length; i++) {
        const own = made[i];
        const proj: Proj = {
          x: CX + plan[i].ox, originX: CX + plan[i].ox, y: own ? own.y : my,
          vx: vx + plan[i].vx, vy: shotVy, big, tint,
          hue: undefined, ...sizeBuff,
        };
        if (own) proj.setSeven = own;
        else if (plan[i].first) proj.setSevenPending = true;
        else proj.s7Ghost = true;
        this.projs.push(proj);
      }
      this.s7Last = made[0];
      // The bookkeeping slide 1 still owns: cooldown, recoil, reloads. All the
      // visible parts (muzzle, shake, smoke, casing) are slide 7's own recipe.
      this.recoil = w.recoil;
      this.muzzle = 0.07;
      this.camY += FX[w.id].kick * 0.5;
      // Slide 7's own trigger interval: the bee fires every 0.50 s there, not
      // every 0.10 s; the obliterator every 0.80 s, not 0.95 s. Slide 1's
      // temporary buffs still apply on top, exactly like they do for its own
      // guns.
      const s7Cool = sevenCooldown(s7id);
      this.cooldown = (s7Cool ?? (w.spinup ? 0.3 - 0.235 * this.spin : w.cooldown))
        * (this.buff === 'speed' || this.treasureBuff === 'rapid' ? 0.5 : this.treasureBuff === 'mini' ? 0.6 : 1);
      if (isSpecial(this.level.mode) && this.ammoLeft === 0) this.reloadT = 0.65;
      else if (w.id === 'snowball' && this.snowLoaded === 0 && this.ammoLeft > 0) this.reloadT = 0.85;
      return;
    }
    const fw = w.id === 'firework' ? this.getFwState() : null;
    const yoyo = w.id === 'yoyo' ? this.getYoyoState() : null;
    const keris = w.id === 'keris' ? this.getKerisState() : null;
    const diamond = w.id === 'diamond' ? this.getDiamondState() : null;
    const bazooka = w.id === 'bazooka' ? this.getBazookaState() : null;
    // Slide-7 SET 1: its own muzzle recipe per barrel, and its own spawn point
    // (the slingshot throws from the pouch, the blowpipe from the mouthpiece,
    // the black-hole staff releases the orb 0.28 s after the charge).
    const setOneLive = this.setOneLive;
    const s1Spawns = setOneLive
      ? offsets.map((ox) => fireSetOne(this.s1, this.setOneId!, CX + ox, GUN_Y - 4, this.s1Hooks(), (n) => setOneSfx.play(n)))
      : null;
    let s1i = 0;
    for (const ox of offsets) {
      const s1spawn = s1Spawns ? s1Spawns[s1i++] : null;
      const shotHue = fw
        ? firework8ShotHue(this.level?.n ?? 1, fw.shotIdx++)
        : yoyo
          ? yoyoAmmoHue(yoyo.shotIdx++)
          : diamond
            ? 205 + ((diamond.shotIdx++ * 13) % 22)
            : bazooka
              ? bazooka.nextHue()
              : undefined;
      const spawnDelay = s1spawn ? s1spawn.delay
        : w.id === 'keris' ? KERIS_GLEAM_DUR : undefined;
      if (fw && shotHue !== undefined) gunState.rocketHue = shotHue;
      if (yoyo && shotHue !== undefined) gunState.yoyoHue = shotHue;
      if (bazooka && shotHue !== undefined) gunState.bazookaHue = shotHue;
      // Weapon-specific spawn Y: dora barrel extends 70px above gun base, pred muzzle at GUN_Y-72 (game-3: my-68)
      const spawnY = s1spawn ? s1spawn.y
        : w.id === 'dora' ? GUN_Y + w.recoil * 22 - 50 : w.id === 'pred' ? GUN_Y - 72 : GUN_Y - 4;
      const spawnX = s1spawn ? s1spawn.x : CX + ox;
      const isNewWeapon = w.id === 'dora' || w.id === 'xeno' || w.id === 'pred';
      const projExtra = isNewWeapon ? { wob: Math.random() * TAU, lastEcho: spawnY } : {};
      const s1State = s1spawn ? this.s1.newShot(this.setOneId!, spawnX, spawnY) : undefined;
      if (s1State) this.s1Last = s1State;
      if (n === 1) this.projs.push({ x: spawnX, originX: spawnX, y: spawnY, vx, vy, big, tint, hue: shotHue, spawnDelay, setOne: s1State, ...sizeBuff, ...projExtra });
      else {
        const travel = GUN_Y - (this.targetY + this.level.radius);
        for (let i = 0; i < n; i++) {
          const off = (i - (n - 1) / 2) * 26;
          // Multi-shot guns get their own slide-7 round each, so the pellets
          // and the stream never share an age with a sibling bullet.
          const own = s1spawn ? this.s1.newShot(this.setOneId!, spawnX, spawnY) : undefined;
          this.projs.push({ x: spawnX, originX: spawnX, y: spawnY, vx: vx + (off * w.speed) / travel, vy, big, tint, hue: shotHue, spawnDelay, setOne: own, ...sizeBuff, ...projExtra });
        }
      }
      if (fw && shotHue !== undefined) {
        spawnFirework8Muzzle(fw, CX + ox, GUN_Y - 6, shotHue);
        this.sink.light(CX + ox, GUN_Y - 6, 70, '255,180,220', 0.25);
        this.sink.push({ x: CX + ox, y: GUN_Y - 6, vx: 0, vy: 0, life: 0.3, max: 0.3, size: 38, color: '#ff80bf', kind: 'ring', rot: 0, vr: 0, g: 0 });
      }
      if (yoyo && shotHue !== undefined) {
        spawnYoyoLaunch(yoyo, CX + ox, GUN_Y - 6, shotHue);
        this.sink.light(CX + ox, GUN_Y - 6, 70, '255,160,220', 0.25);
      }
      if (keris) {
        spawnKerisLaunch(keris, CX + ox, GUN_Y - 6);
        this.sink.light(CX + ox, GUN_Y - 6, 70, '77,238,234', 0.25);
      }
      if (diamond) {
        spawnDiamondLaunch(diamond, CX + ox, GUN_Y - 6);
        this.sink.light(CX + ox, GUN_Y - 6, 75, '165,243,252', 0.28);
      }
      if (bazooka) {
        bazooka.onShoot(CX + ox, GUN_Y - 6, H);
        this.sink.light(CX + ox, GUN_Y - 6, 120, '255,150,55', 0.35);
      }
    }
    this.recoil = w.recoil;
    this.muzzle = 0.07;
    const fxp = FX[w.id];
    if (w.id !== 'firework' && w.id !== 'yoyo' && w.id !== 'keris' && w.id !== 'diamond' && w.id !== 'bazooka'
      && !(w.id === 'blackhole' && this.slide2Void) && !setOneLive) {
      for (const ox of offsets) spawnMuzzle(this.sink, fxp, w, CX + ox, GUN_Y - 6);
    }
    // Slide 2 black hole: collapsing sparks into the muzzle, cosmic hue band.
    if (w.id === 'blackhole' && this.slide2Void) {
      this.s2Hue = 215 + ((gunState.shots * 53) % 105);
      for (const ox of offsets) {
        fireBlackHole2(this.s2, CX + ox, GUN_Y - 4, this.s2Hue);
        this.sink.light(CX + ox, GUN_Y - 6, 90, '170,120,255', 0.22);
      }
    }
    this.camY += fxp.kick * 0.5;
    if (fxp.speedLines) for (const ox of offsets) {
      spawnSpeedLines(this.sink, CX + ox, this.targetY + this.level.radius + 20, GUN_Y - 30, w.trail);
    }
    this.cooldown = (w.spinup ? 0.3 - 0.235 * this.spin : w.cooldown)
      * (this.buff === 'speed' || this.treasureBuff === 'rapid' ? 0.5 : this.treasureBuff === 'mini' ? 0.6 : 1);
    if (isSpecial(this.level.mode) && this.ammoLeft === 0) this.reloadT = 0.65;
    else if (w.id === 'snowball' && this.snowLoaded === 0 && this.ammoLeft > 0) this.reloadT = 0.85;
    if (w.burstFx) {
      const b = w.burstFx;
      for (const ox of offsets) for (let i = 0; i < b.n; i++) {
        const a = rand(-Math.PI * 0.85, -Math.PI * 0.15);
        const v = rand(0.4, 1) * (b.spd ?? 200);
        this.particles.push({
          x: CX + ox + rand(-6, 6), y: GUN_Y - 4, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: rand(0.35, 0.8), max: 0.8,
          size: b.glow ? rand(3, b.size ?? 6) : rand(2, 4.5), color: pick(b.colors),
          kind: w.id === 'soaker' ? 'waterDrop' : w.id === 'snowball' ? 'snowflake' : b.glow ? 'glow' : 'chip',
          rot: rand(0, TAU), vr: rand(-12, 12), g: b.g ?? 600,
        });
      }
    }
    this.shake = Math.max(this.shake, w.shake);
    if (w.id === 'pred' && big > 0) {
      sfx6.pred();
      this.recoil = 1;
      this.shake = Math.max(this.shake, 10);
      this.camY += big * 3;
      for (const ox of offsets) {
        // flash: size 170, color PLASMA.glow, max 0.22 (game-3 releasePlasma)
        this.sink.light(CX + ox, GUN_Y - 6, 170, '111,211,255', 0.22);
        // flash: size 80, color #ffffff, max 0.12
        this.sink.light(CX + ox, GUN_Y - 6, 80, '255,255,255', 0.12);
        // ring: size 10 grow 420, color PLASMA.glow, max 0.3
        this.sink.push({ x: CX + ox, y: GUN_Y - 6, vx: 0, vy: 0, life: 0.3, max: 0.3, size: 170, color: '111,211,255', kind: 'shock', rot: 0, vr: 0, g: 0 });
        // ringE: size 8 grow 300, color #ffffff, max 0.28
        this.sink.push({ x: CX + ox, y: GUN_Y - 6, vx: 0, vy: 0, life: 0.28, max: 0.28, size: 130, color: '255,255,255', kind: 'ring', rot: 0, vr: 0, g: 0 });
        // 6 bolts: ang -PI/2 + rand(-1.4, 1.4), color i%2 ? #ffffff : PLASMA.glow (game-3)
        for (let i = 0; i < 6; i++) {
          const ang = -Math.PI / 2 + rand(-1.4, 1.4);
          const col = i % 2 ? '255,255,255' : '111,211,255';
          this.sink.push({ x: CX + ox, y: GUN_Y - 6, vx: Math.cos(ang) * rand(30, 70), vy: Math.sin(ang) * rand(30, 70), life: rand(0.1, 0.2), max: 0.2, size: 3, color: col, kind: 'bolt', rot: 0, vr: 0, g: 0 });
        }
        // 26 spark burst (game-3: kind 'spark', size 1.8, drag 4, max 0.3)
        for (let i = 0; i < 26; i++) {
          const a = rand(-Math.PI / 2, 1.3);
          const sp = rand(200, 700);
          this.sink.push({ x: CX + ox, y: GUN_Y - 6, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.3, max: 0.3, size: 1.8, color: i % 2 ? '255,255,255' : '111,211,255', kind: 'spark', rot: 0, vr: 0, g: 0, drag: 4 });
        }
        // 6 smoke: color #3a4a60, size rand(12,22) (game-3)
        for (let i = 0; i < 6; i++) {
          this.sink.push({ x: CX + ox + rand(-16, 16), y: GUN_Y - 6 + 10, vx: rand(-50, 50), vy: rand(-40, 20), life: rand(0.7, 1.2), max: 1.2, size: rand(12, 22), color: '58,74,96', kind: 'smoke', rot: 0, vr: 0, g: 0, drag: 2 });
        }
      }
    } else if (w.charge && big > 0) {
      if (big === 2) sfx4.busterBig();
      else sfx4.busterMid();
      this.recoil = big === 2 ? 2.4 : 1.4;
      this.shake = Math.max(this.shake, big === 2 ? 9 : 4);
      this.camY += big * 3;
      for (const ox of offsets) {
        const paired = offsets.length > 1;
        this.sink.light(CX + ox, GUN_Y, big === 2 ? (paired ? 220 : 320) : (paired ? 130 : 180), big === 2 ? '254,240,138' : '125,211,252', 0.25);
        this.sink.push({ x: CX + ox, y: GUN_Y - 8, vx: 0, vy: 0, life: 0.4, max: 0.4, size: big === 2 ? (paired ? 105 : 150) : (paired ? 60 : 80), color: '125,211,252', kind: 'shock', rot: 0, vr: 0, g: 0 });
      }
      if (big === 2) for (const ox of offsets) {
        spawnSpeedLines(this.sink, CX + ox, this.targetY + this.level.radius + 20, GUN_Y - 30, '254,240,138');
      }
    } else if (this.slide2Void) slide2Sfx.shootBH();
    else if (!setOneLive) playFireSfx(w.id);
    if (w.id === 'xeno') {
      for (const ox of offsets) {
        // 16 viscous droplets behind the glob (game-3 fire())
        for (let i = 0; i < 16; i++) {
          const k = i / 16;
          this.sink.push({ x: CX + ox + rand(-3, 3), y: GUN_Y - 4 - k * 12, vx: rand(-25, 25), vy: vy * (0.45 + k * 0.5), life: rand(0.7, 1.2), max: 1.2, size: rand(2.5, 6.5) * (1 - k * 0.5) + 1.5, color: '#b6ff1a', kind: 'acid', rot: 0, vr: 0, g: 900 });
        }
        // 10 fine mist (game-3: vy rand(-900, -300))
        for (let i = 0; i < 10; i++) {
          this.sink.push({ x: CX + ox + rand(-6, 6), y: GUN_Y - 4 - rand(0, 4), vx: rand(-120, 120), vy: rand(-900, -300), life: rand(0.4, 0.8), max: 0.8, size: rand(1.2, 2.2), color: '#b6ff1a', kind: 'acid', rot: 0, vr: 0, g: 1200 });
        }
        // flash + ring (game-3: flash size 80, ring size 8 grow 220).
        // The flash is a soft bloom, not a filled disc.
        this.sink.light(CX + ox, GUN_Y - 6, 80, '182,255,26', 0.2);
        this.sink.push({ x: CX + ox, y: GUN_Y - 6, vx: 0, vy: 0, life: 0.2, max: 0.2, size: 34, color: '182,255,26', kind: 'glow', rot: 0, vr: 0, g: 0 });
        this.sink.push({ x: CX + ox, y: GUN_Y - 6, vx: 0, vy: 0, life: 0.3, max: 0.3, size: 26, color: '182,255,26', kind: 'ring', rot: 0, vr: 0, g: 0 });
        // 6 smoke puffs (game-3: color #9bd13a, size rand(10,20))
        for (let i = 0; i < 6; i++) {
          this.sink.push({ x: CX + ox + rand(-14, 14), y: GUN_Y - 6, vx: rand(-40, 40), vy: rand(-90, -30), life: rand(0.8, 1.4), max: 1.4, size: rand(10, 20), color: '155,209,58', kind: 'smoke', rot: 0, vr: 0, g: 30, drag: 2 });
        }
      }
    }
    if (w.id === 'dora') {
      // Dora muzzle = y0 - 70 where y0 = GUN_Y + recoil*22 (barrel extends 150px upward from y0+80)
      const doraMuzzleY = GUN_Y + this.recoil * 22 - 70;
      for (const ox of offsets) {
        // flash + ringE (game-3 fireAir())
        this.sink.light(CX + ox, doraMuzzleY, 120, '255,255,255', 0.16);
        this.sink.push({ x: CX + ox, y: doraMuzzleY, vx: 0, vy: 0, life: 0.3, max: 0.3, size: 120, color: '255,255,255', kind: 'ring', rot: 0, vr: 0, g: 0 });
        // ringE #1: size 14, grow 420, white, max 0.3
        this.sink.push({ x: CX + ox, y: doraMuzzleY, vx: 0, vy: 0, life: 0.3, max: 0.3, size: 14, color: '255,255,255', kind: 'ringE', rot: 0, vr: 0, g: 0 });
        // ringE #2: size 8, grow 260, AIR.glow, max 0.36
        this.sink.push({ x: CX + ox, y: doraMuzzleY, vx: 0, vy: 0, life: 0.36, max: 0.36, size: 8, color: '159,220,255', kind: 'ringE', rot: 0, vr: 0, g: 0 });
        // 14 puff particles (game-3: size rand(12,22), grow 26, drag 3.2)
        for (let i = 0; i < 14; i++) {
          const a = rand(0, TAU);
          const sp = rand(90, 260);
          this.sink.push({ x: CX + ox + Math.cos(a) * 14, y: doraMuzzleY + 6 + Math.sin(a) * 6, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.5 + 30, life: rand(0.5, 0.9), max: 0.9, size: rand(12, 22), color: '#ffffff', kind: 'puff', rot: rand(0, TAU), vr: rand(-2, 2), g: 0, drag: 3.2 });
        }
        // 10 wind streaks (game-3: size rand(14,30), speed rand(500,900))
        for (let i = 0; i < 10; i++) {
          const a = -Math.PI / 2 + rand(-0.5, 0.5);
          this.sink.push({ x: CX + ox, y: doraMuzzleY, vx: Math.cos(a) * rand(500, 900), vy: Math.sin(a) * rand(500, 900), life: rand(0.18, 0.3), max: 0.3, size: rand(14, 30), color: '#ffffff', kind: 'wind', rot: 0, vr: 0, g: 0, drag: 1 });
        }
        // DOKAN! text (game-3: x+54, y-30, size 34, color #ffd23a, rot -0.18)
        this.sink.push({ x: CX + ox + 54, y: doraMuzzleY - 30, vx: 0, vy: 0, life: 0.7, max: 0.7, size: 34, color: '#ffd23a', kind: 'text', rot: -0.18, vr: 0, g: 0, text: 'DOKAN!' });
      }
      this.shake = Math.max(this.shake, 9);
    }
    if (w.id === 'slingshot') {
      sfx4.slingRelease();
      for (const ox of offsets) {
        for (const s of [-1, 1]) {
          for (let i = 0; i < 4; i++) {
            this.sink.push({ x: CX + ox + s * 24, y: GUN_Y + 6, vx: -s * rand(300, 600), vy: rand(-500, -200), life: 0.12, max: 0.12, size: rand(1, 2), color: 'rgba(255,220,200,0.9)', kind: 'streak', rot: 0, vr: 0, g: 0 });
          }
        }
        for (let i = 0; i < 6; i++) {
          this.sink.push({ x: CX + ox + rand(-10, 10), y: GUN_Y + 10, vx: rand(-80, 80), vy: rand(-60, 10), life: rand(0.4, 0.7), max: 0.7, size: rand(5, 10), color: 'rgba(210,190,160,', kind: 'smoke', rot: 0, vr: 0, g: -20, drag: 2 });
        }
        this.sink.push({ x: CX + ox, y: GUN_Y + 4, vx: 0, vy: 0, life: 0.25, max: 0.25, size: 70, color: '255,230,200', kind: 'shock', rot: 0, vr: 0, g: 0 });
      }
      this.addText('CTAK!', CX + rand(-50, 50), GUN_Y - 20, '#fde68a', 22);
    }
    if (w.id === 'obliterator') {
      this.flashWhite = Math.max(this.flashWhite, 0.2);
      this.tintA = Math.max(this.tintA, 0.25);
      this.tintRgb = '74,222,128';
    }
    if (w.casing) {
      for (const ox of offsets) {
        const side = ox < 0 ? -1 : 1; // cases eject outwards from mirrored guns
        this.particles.push({
          x: CX + ox + side * 16, y: GUN_Y + (w.ejectY ?? 48), vx: side * rand(180, 320), vy: rand(-520, -380), life: 1.1, max: 1.1,
          size: 1, color: w.casing, kind: 'shell', rot: rand(0, TAU), vr: side * rand(15, 28), g: 1600,
        });
      }
    }
    if (!w.energy && !w.noSmoke) {
      const ns = w.backblast || w.id === 'bamboo' || w.id === 'pirate' ? 10 : 4;
      for (const ox of offsets) for (let i = 0; i < ns; i++) {
        this.particles.push({
          x: CX + ox + rand(-6, 6), y: GUN_Y - 6, vx: rand(-50, 50), vy: rand(-90, -30), life: 0.5, max: 0.5,
          size: rand(6, w.backblast ? 18 : 12), color: 'rgba(200,200,200,', kind: 'smoke', rot: 0, vr: 0, g: -20,
        });
      }
    }
    if (w.backblast) {
      for (const ox of offsets) for (let i = 0; i < 14; i++) {
        this.particles.push({
          x: CX + ox + rand(-20, 20), y: H - rand(0, 30), vx: rand(-160, 160), vy: rand(-40, 80), life: rand(0.5, 1), max: 1,
          size: rand(14, 30), color: 'rgba(180,180,180,', kind: 'smoke', rot: 0, vr: 0, g: -40,
        });
        this.particles.push({
          x: CX + ox + rand(-14, 14), y: H - rand(0, 20), vx: rand(-120, 120), vy: rand(-30, 60), life: rand(0.2, 0.4), max: 0.4,
          size: rand(6, 12), color: '255,150,40', kind: 'glow', rot: 0, vr: 0, g: 0,
        });
      }
    }
    if (w.energy && w.id !== 'laser') {
      for (const ox of offsets) {
        this.particles.push({ x: CX + ox, y: GUN_Y + 10, vx: 0, vy: 0, life: 0.3, max: 0.3, size: w.id === 'cricket' ? 110 : 50, color: w.color, kind: 'ring', rot: 0, vr: 0, g: 0 });
        for (let i = 0; i < 10; i++) {
          const a = rand(0, TAU);
          const v = rand(60, 200);
          this.particles.push({
            x: CX + ox, y: GUN_Y + 6, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 60, life: rand(0.25, 0.5), max: 0.5,
            size: rand(3, 6), color: w.trail, kind: 'glow', rot: 0, vr: 0, g: 0,
          });
        }
      }
    }
    if (w.id === 'cricket') {
      this.flashWhite = Math.max(this.flashWhite, 0.25);
      this.addText('BOOM!', CX + rand(-40, 40), GUN_Y - 40, '#9fd8ff', 26);
    }
    if (w.beam) {
      const by = this.targetY + this.level.radius - 4;
      for (const ox of offsets) {
        this.beams.push({ x: CX + ox, y: by, life: 0.22, max: 0.22, rgb: w.trail });
        for (let i = 0; i < 14; i++) {
          const yy = rand(by, GUN_Y);
          this.sink.push({ x: CX + ox + rand(-3, 3), y: yy, vx: rand(-160, 160), vy: rand(-60, 60), life: rand(0.2, 0.45), max: 0.45, size: rand(2, 4.5), color: w.trail, kind: 'glow', rot: 0, vr: 0, g: 0, drag: 4 });
        }
        const starTrain = w.id === 'moonbeam' && getGunEffect(w.id) === 'new';
        for (let i = 0; i < (starTrain ? 16 : 6); i++) {
          this.sink.push({ x: CX + ox + (starTrain ? rand(-13, 13) : 0),
            y: rand(by, GUN_Y), vx: starTrain ? rand(-35, 35) : 0, vy: 0,
            life: starTrain ? 0.34 : 0.2, max: starTrain ? 0.34 : 0.2,
            size: rand(4, starTrain ? 10 : 7),
            color: starTrain ? pick(['#ffffff', '#e9ddff', '#ffeabb']) : '#ffffff',
            kind: 'star', rot: rand(0, TAU), vr: 0, g: 0 });
        }
      }
    }
  }

  /** find the local angle that is furthest from every obstacle */
  private safeAngle(): number {
    let best = 0;
    let bestD = -1;
    for (let i = 0; i < 72; i++) {
      const a = (i / 72) * TAU;
      let md = 99;
      for (const it of this.items) {
        if (it.type === 'coin') continue;
        md = Math.min(md, angDiff(a, it.angle));
      }
      if (md > bestD) {
        bestD = md;
        best = a;
      }
    }
    return best;
  }

  private worldPos(local: number, r: number) {
    const wa = local + this.rot;
    return { x: CX + Math.cos(wa) * r, y: this.targetY + Math.sin(wa) * r };
  }

  /** returns true if a save was consumed */
  private trySave(p: Proj, spike: boolean): boolean {
    const w = this.weapon;
    if (this.savesLeft <= 0 || !w.saveFx) return false;
    if (w.saveSpikeOnly && !spike) return false;
    this.savesLeft--;
    const R = this.level.radius;
    switch (w.saveFx) {
      case 'return':
      case 'mirror':
      case 'bubble': {
        this.ammoLeft++;
        if (w.saveFx === 'bubble') {
          sfx2.pop();
          this.addText('🫧 POP! AMAN', p.x, p.y + 50, '#fbcfe8', 24);
          for (let i = 0; i < 16; i++) {
            const a = rand(0, TAU);
            const v = rand(80, 260);
            this.particles.push({ x: p.x, y: p.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: rand(0.3, 0.6), max: 0.6, size: rand(2, 5), color: pick(['220,240,255', '255,200,240']), kind: 'glow', rot: 0, vr: 0, g: 0 });
          }
          this.particles.push({ x: p.x, y: p.y, vx: 0, vy: 0, life: 0.4, max: 0.4, size: 60, color: '#fbcfe8', kind: 'ring', rot: 0, vr: 0, g: 0 });
        } else {
          if (w.saveFx === 'mirror') sfx2.mirror();
          else sfx2.boomerang();
          this.addText(w.saveText ?? (w.saveFx === 'mirror' ? '🪞 MANTUL!' : '🪃 BALIK!'), p.x, p.y + 50, w.color, 24);
          this.flyers.push({ x: p.x, y: p.y + BLEN / 2, vx: rand(-120, 120), vy: 900, rot: Math.PI, vr: rand(14, 22), kind: 'bullet', w: w.id });
          for (let i = 0; i < 10; i++) {
            const a = rand(0, TAU);
            this.particles.push({ x: p.x, y: p.y, vx: Math.cos(a) * 300, vy: Math.sin(a) * 300, life: 0.25, max: 0.25, size: 2, color: pick(w.sparks), kind: 'spark', rot: 0, vr: 0, g: 0 });
          }
        }
        return true;
      }
      case 'portal':
      case 'glitch': {
        const safe = this.safeAngle();
        const rgbA = w.saveFx === 'portal' ? '59,130,246' : '255,0,85';
        const rgbB = w.saveFx === 'portal' ? '251,146,60' : '0,255,238';
        const to = this.worldPos(safe, R + 20);
        this.portals.push({ x: p.x, y: p.y, life: 0.6, max: 0.6, rgb: rgbA });
        this.portals.push({ x: to.x, y: to.y, life: 0.6, max: 0.6, rgb: rgbB });
        if (w.saveFx === 'glitch') {
          this.glitchT = 0.35;
          sfx2.glitch();
        } else sfx2.warp();
        this.addText(w.saveFx === 'portal' ? '🌌 TELEPORT!' : '👾 LAG!', CX, CY + R + 70, w.color, 26);
        this.stickAt(safe);
        return true;
      }
    }
    return false;
  }

  private applyPerks(w: Weapon, hx: number, hy: number, R: number) {
    if (w.explode) this.explodeAt(hx, hy, w.id === 'bazooka' ? 1.3 : w.id === 'bamboo' ? 1.2 : 1, w.explodeFx ?? 'fire');
    if (w.id === 'cricket') {
      this.particles.push({ x: hx, y: hy, vx: 0, vy: 0, life: 0.5, max: 0.5, size: 180, color: '#7cc8ff', kind: 'ring', rot: 0, vr: 0, g: 0 });
      this.shake = Math.max(this.shake, 12);
    }
    if (w.chain) {
      const others = this.items.filter((it) => it.type === 'bullet' || it.type === 'old').slice(0, -1);
      for (let i = others.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [others[i], others[j]] = [others[j], others[i]];
      }
      for (const it of others.slice(0, 4)) {
        const wa = it.angle + this.rot;
        this.particles.push({
          x: hx, y: hy, tx: CX + Math.cos(wa) * (R + 18), ty: this.targetY + Math.sin(wa) * (R + 18), vx: 0, vy: 0,
          life: 0.25, max: 0.25, size: 2, color: '#9be8ff', kind: 'bolt', rot: 0, vr: 0, g: 0,
        });
      }
      if (others.length) this.addText('⚡ SETRUM!', hx + rand(-50, 50), hy + 60, '#9be8ff', 20);
    }
    if (w.slow) {
      const water = w.id === 'soaker' || w.slowStyle === 'water';
      const honey = w.slowStyle === 'honey';
      if (!isSlide23Weapon(w.id)) {
        if (water || honey) sfx2.splat();
        else sfx.ice();
      }
      if (this.slowT <= 0) this.addText(w.slowText ?? '❄ BEKU!', hx + rand(-40, 40), hy + 60,
        honey ? '#ffd56c' : water ? '#93c5fd' : '#bff1ff', 24);
      this.applySlow(w.slowTime ?? 1.3, w.slowFactor ?? 0.3, w.slowRgb ?? '170,230,255',
        honey ? 'honey' : water ? 'water' : 'ice');
      // Both liquids already have their own splash and droplets in spawnImpact.
      if (w.id !== 'soaker' && w.id !== 'honey') for (let i = 0; i < 14; i++) {
        const a = rand(0, TAU);
        const v = rand(60, 260);
        this.particles.push({
          x: hx, y: hy, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: rand(0.4, 0.8), max: 0.8,
          size: rand(2, 4), color: pick(water ? ['#ffffff', '#93c5fd', '#3b82f6'] : ['#ffffff', '#d6f6ff', '#9be7ff']), kind: 'chip', rot: rand(0, TAU), vr: rand(-10, 10), g: water ? 900 : 300,
        });
      }
    }
    if (w.luckyCoin && Math.random() < w.luckyCoin) {
      this.coins++;
      sfx.coin();
      this.addText(w.luckyText ?? '+1 💰 HOKI!', hx + rand(-40, 40), hy + 50, '#ffd23f', 20);
    }
    this.applyNewPerks(w, hx, hy, R);
    if (w.id === 'fish') sfx.splash();
    if (w.pullCoins) {
      if (!isSlide23Weapon(w.id)) sfx.suck();
      const coins = this.items.filter((it) => it.type === 'coin');
      for (const it of coins) {
        const wa = it.angle + this.rot;
        const cx = CX + Math.cos(wa) * (R + 14);
        const cy = this.targetY + Math.sin(wa) * (R + 14);
        this.particles.push({
          x: cx, y: cy, tx: hx, ty: hy, vx: 0, vy: 0, life: 0.3, max: 0.3, size: 3, color: '#d8b4fe', kind: 'bolt', rot: 0, vr: 0, g: 0,
        });
        this.collectCoin(it);
      }
      if (coins.length) this.addText('🕳 SEDOT!', hx, hy + 60, '#d8b4fe', 24);
      for (let i = 0; i < 16; i++) {
        const a = rand(0, TAU);
        const d = rand(40, 90);
        this.particles.push({
          x: hx + Math.cos(a) * d, y: hy + Math.sin(a) * d, vx: -Math.cos(a) * d * 3, vy: -Math.sin(a) * d * 3, life: 0.33, max: 0.33,
          size: rand(2, 5), color: '168,85,247', kind: 'glow', rot: 0, vr: 0, g: 0,
        });
      }
    }
  }

  private explodeAt(x: number, y: number, big: number, fx: 'fire' | 'white' | 'firework' = 'fire') {
    if (fx === 'firework') {
      this.fireworkAt(x, y);
      return;
    }
    if (this.weapon.id === 'bazooka') {
      this.shake = Math.max(this.shake, 12 * big);
      this.addText('DUAR!', x + rand(-30, 30), y + 50, '#ff9f1c', 30);
      return;
    }
    const white = fx === 'white';
    if (!isSlide23Weapon(this.weapon.id)) sfx.explosion();
    this.shake = Math.max(this.shake, 12 * big);
    this.flashWhite = Math.max(this.flashWhite, white ? 0.5 : 0.3);
    for (let i = 0; i < 30 * big; i++) {
      const a = rand(0, TAU);
      const v = rand(60, 380) * big;
      this.particles.push({
        x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: rand(0.3, 0.7), max: 0.7,
        size: rand(6, 14), color: pick(white ? ['255,250,220', '255,230,150', '255,200,120'] : ['255,200,80', '255,120,30', '255,60,20']), kind: 'glow', rot: 0, vr: 0, g: -60,
      });
    }
    for (let i = 0; i < (white ? 22 : 12); i++) {
      this.particles.push({
        x: x + rand(-25, 25), y: y + rand(-20, 20), vx: rand(-110, 110), vy: rand(-130, 20), life: rand(0.8, 1.6), max: 1.6,
        size: rand(16, 34) * big, color: white ? 'rgba(245,245,245,' : 'rgba(70,70,70,', kind: 'smoke', rot: 0, vr: 0, g: -40,
      });
    }
    if (white) {
      for (let i = 0; i < 16; i++) {
        this.particles.push({ x, y, vx: rand(-300, 300), vy: rand(-350, 100), life: rand(0.5, 0.9), max: 0.9, size: rand(2, 4), color: pick(['#dc2626', '#fde047', '#ffffff']), kind: 'chip', rot: rand(0, TAU), vr: rand(-20, 20), g: 900 });
      }
    }
    this.particles.push({ x, y, vx: 0, vy: 0, life: 0.45, max: 0.45, size: 150 * big, color: white ? '#ffffff' : '#ffb347', kind: 'ring', rot: 0, vr: 0, g: 0 });
    this.addText(white ? 'DUARR!!' : 'DUAR!', x + rand(-30, 30), y + 50, white ? '#ffffff' : '#ff9f1c', white ? 36 : 30);
  }

  private fireworkAt(x: number, y: number, hue?: number) {
    if (!isSlide23Weapon(this.weapon.id)) sfx3.fireworkBoom();
    this.shake = Math.max(this.shake, 8);
    const fw = this.getFwState();
    const h = hue ?? gunState.rocketHue ?? firework8ShotHue(this.level?.n ?? 1, fw.impactIdx);
    // Slide 2 has no extra flash ring here — the burst brings its own glow + shock ring.
    spawnFirework8StickBurst(fw, x, y, h);
  }

  private applySlow(time: number, factor: number, rgb: string, kind: 'ice' | 'water' | 'honey' | 'time') {
    this.slowT = time;
    this.slowF = factor;
    this.slowRgb = rgb;
    this.slowKind = kind;
  }

  private reverseSpin(text: string, x: number, y: number) {
    this.level.dir *= -1;
    sfx2.reverse();
    this.addText(text, x, y, '#fde047', 24);
    this.particles.push({ x: CX, y: this.targetY, vx: 0, vy: 0, life: 0.5, max: 0.5, size: this.level.radius * 2.6, color: '#fde047', kind: 'ring', rot: 0, vr: 0, g: 0 });
  }

  private applyNewPerks(w: Weapon, hx: number, hy: number, R: number) {
    if (!isSlide23Weapon(w.id) && HIT_SFX[w.id]) HIT_SFX[w.id]!();
    const isPerk = (k: number) => this.perkCount > 0 && this.perkCount % k === 0;
    this.perkCount++;
    const ring = (color: string, size: number) =>
      this.particles.push({ x: hx, y: hy, vx: 0, vy: 0, life: 0.45, max: 0.45, size, color, kind: 'ring', rot: 0, vr: 0, g: 0 });

    if (w.burn) {
      if (this.burnT <= 0) this.addText(w.burnText ?? '🔥 TERBAKAR!', hx + rand(-40, 40), hy + 60, '#ff9f1c', 22);
      this.burnT = 2.6;
    }
    if (w.reverseChance && Math.random() < w.reverseChance) this.reverseSpin('🍌 TERPELESET!', hx + rand(-40, 40), hy + 70);
    if (w.reverseEvery && this.perkCount % w.reverseEvery === 0) this.reverseSpin('🌍 GRAVITASI BALIK!', hx, hy + 70);
    if (w.chronoEvery && this.perkCount % w.chronoEvery === 0) {
      sfx2.timestop();
      this.applySlow(1.2, 0, '250,220,120', 'time');
      this.addText('⏱ STOP WAKTU!', CX, this.targetY, '#fde047', 30);
      this.flashWhite = Math.max(this.flashWhite, 0.25);
    }
    if (w.spikeOff) {
      this.spikeOffT = w.spikeOff;
      for (let i = 0; i < 3; i++) {
        this.particles.push({ x: CX, y: this.targetY, vx: 0, vy: 0, life: 0.4 + i * 0.15, max: 0.4 + i * 0.15, size: R * (1.6 + i * 0.5), color: '#bef264', kind: 'ring', rot: 0, vr: 0, g: 0 });
      }
      if (this.items.some((it) => it.type === 'spike')) this.addText(w.spikeText ?? '🔊 DURI MASUK!', hx, hy + 70, w.color, 22);
    }
    if (w.pushSpikes) {
      const local = norm(Math.PI / 2 - this.rot);
      let pushed = false;
      for (const it of this.items) {
        if (it.type !== 'spike') continue;
        const d = norm(it.angle - local);
        const dd = d > Math.PI ? d - TAU : d;
        if (Math.abs(dd) < 1.3) {
          it.vel = (dd >= 0 ? 1 : -1) * 3.2;
          pushed = true;
        }
      }
      ring('#ef4444', 90);
      if (pushed) this.addText('🧲 TOLAK!', hx, hy + 70, '#fca5a5', 22);
    }
    if (w.shrink) {
      let any = false;
      for (const it of this.items) {
        if (it.type === 'bullet' || it.type === 'old') {
          if (it.w === 'sandal') continue; // keep the oversized sandal visibly chunky
          const before = it.scale ?? 1;
          it.scale = Math.max(0.45, before * 0.85);
          if (it.scale < before) any = true;
        }
      }
      for (let i = 0; i < 2; i++) this.particles.push({ x: CX, y: this.targetY, vx: 0, vy: 0, life: 0.5, max: 0.5, size: R * (2.8 - i * 0.6), color: '#4ade80', kind: 'ring', rot: 0, vr: 0, g: 0 });
      if (any) this.addText('🔬 MENGECIL!', hx, hy + 70, '#86efac', 22);
    }
    if (w.grow) {
      const base = this.level.boss ? 120 : 106;
      const before = this.targetR || this.level.radius;
      this.targetR = Math.min(base + 34, before + 6);
      if (this.targetR > before) this.addText('🔭 MEMBESAR!', hx, hy + 70, '#fdba74', 22);
      ring('#fb923c', R * 2.4);
    }
    if (w.snowman && isPerk(3)) {
      this.score += 3;
      sfx2.bloom();
      this.addText('⛄ MANUSIA SALJU +3', hx, hy + 70, '#e0f2fe', 24);
      for (let i = 0; i < 20; i++) {
        this.particles.push({ x: hx + rand(-30, 30), y: hy - rand(0, 40), vx: rand(-60, 60), vy: rand(-40, 40), life: rand(0.8, 1.4), max: 1.4, size: rand(2, 4), color: '#ffffff', kind: 'snowDust', rot: 0, vr: 0, g: 60 });
      }
    }
    if (w.breakSpike) {
      const local = norm(Math.PI / 2 - this.rot);
      const spikes = this.items.filter((it) => it.type === 'spike').sort((a, b) => angDiff(a.angle, local) - angDiff(b.angle, local));
      const sp = spikes[0];
      if (sp) {
        const p = this.worldPos(sp.angle, R + 10);
        this.items = this.items.filter((it) => it !== sp);
        this.flyers.push({ x: p.x, y: p.y, vx: rand(-200, 200), vy: -300, rot: sp.angle + this.rot - Math.PI / 2, vr: rand(-15, 15), kind: 'spike' });
        sfx2.crash();
        this.addText('🏴‍☠️ DURI HANCUR!', p.x, p.y - 20, '#e5e7eb', 22);
        for (let i = 0; i < 14; i++) {
          this.particles.push({ x: p.x, y: p.y, vx: rand(-250, 250), vy: rand(-250, 150), life: rand(0.4, 0.8), max: 0.8, size: rand(2, 5), color: pick(['#4b5563', '#9ca3af', '#ff3030']), kind: 'chip', rot: rand(0, TAU), vr: rand(-20, 20), g: 900 });
        }
      }
      for (let i = 0; i < 8; i++) {
        this.particles.push({ x: hx + rand(-15, 15), y: hy, vx: rand(-80, 80), vy: rand(-60, 40), life: rand(0.6, 1.1), max: 1.1, size: rand(12, 22), color: 'rgba(120,120,120,', kind: 'smoke', rot: 0, vr: 0, g: -30 });
      }
    }
    if (w.randomBonus !== undefined) {
      const b = Math.floor(Math.random() * (w.randomBonus + 1));
      this.score += b;
      this.addText(b > 0 ? `KWEK! +${b}` : 'kwek...', hx + rand(-40, 40), hy + 70, b >= 4 ? '#fde047' : '#ffffff', 18 + b * 2);
    }
    if (w.jackpot && Math.random() < w.jackpot) {
      this.coins += 8;
      sfx2.jackpot();
      this.addText(w.jackpotText ?? '🂡 AS! JACKPOT +8 💰', CX, this.targetY + 10, '#fde047', 26);
      this.flashWhite = Math.max(this.flashWhite, 0.3);
      for (let i = 0; i < 24; i++) {
        const a = rand(0, TAU);
        const v = rand(150, 400);
        this.particles.push({ x: hx, y: hy, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: rand(0.5, 0.9), max: 0.9, size: rand(2, 4), color: pick(['#ffd23f', '#fff1a8', '#f59e0b']), kind: 'spark', rot: 0, vr: 0, g: 300 });
      }
    }
    if (w.confetti) {
      const cc = ['#f43f5e', '#facc15', '#22d3ee', '#a855f7', '#4ade80', '#fb923c'];
      for (let i = 0; i < 30; i++) {
        const a = rand(-Math.PI * 0.95, -Math.PI * 0.05);
        const v = rand(150, 450);
        this.particles.push({ x: hx, y: hy, vx: Math.cos(a) * v * 0.8, vy: Math.sin(a) * v * -0.6 + rand(-100, 50), life: rand(0.8, 1.4), max: 1.4, size: rand(3, 6), color: pick(cc), kind: 'chip', rot: rand(0, TAU), vr: rand(-25, 25), g: 350 });
      }
    }
    if (w.bossMult && this.level.boss) {
      this.score += w.points * (w.bossMult - 1);
      this.addText(`🐉 BOSS x${w.bossMult}!`, hx + rand(-30, 30), hy + 90, '#f87171', 22);
    }
    if (w.burn || w.id === 'dragon') {
      for (let i = 0; i < 14; i++) {
        this.particles.push({ x: hx + rand(-10, 10), y: hy, vx: rand(-120, 120), vy: rand(-200, 40), life: rand(0.3, 0.6), max: 0.6, size: rand(5, 10), color: pick(['255,200,80', '255,120,30', '255,60,20']), kind: 'glow', rot: 0, vr: 0, g: -200 });
      }
    }
    if (w.rope && w.id !== 'yoyo') ring('#a5f3fc', 70);

    // ---------- wave 3 perks ----------
    if (w.notes) {
      const idx = Math.min(9, this.combo - 1);
      sfx3.note(idx);
      const noteCols = ['#fde68a', '#fca5a5', '#a5f3fc', '#bbf7d0', '#ddd6fe'];
      for (let i = 0; i < 3; i++) {
        this.particles.push({ x: hx + rand(-20, 20), y: hy, vx: rand(-60, 60), vy: rand(-160, -80), life: 1.1, max: 1.1, size: 18 + idx, color: pick(noteCols), kind: 'text', rot: 0, vr: 0, g: 0, text: pick(['♪', '♫', '♬']) });
      }
      const NAMES = ['da', 'mi', 'na', 'ti', 'la'];
      this.addText(NAMES[idx % 5].toUpperCase() + '♪', hx + rand(-40, 40), hy + 70, '#fde68a', 18 + idx * 1.5);
    }
    if (w.meltOld || (w.meltEvery && this.perkCount % w.meltEvery === 0)) {
      const local = norm(Math.PI / 2 - this.rot);
      const olds = this.items.filter((it) => it.type === 'old').sort((a, b) => angDiff(a.angle, local) - angDiff(b.angle, local));
      const o = olds[0];
      if (o) {
        const p = this.worldPos(o.angle, R + 14);
        this.items = this.items.filter((it) => it !== o);
        if (w.id === 'pencil') sfx4.erase();
        else if (w.id === 'holy') sfx4.purify();
        else sfx3.sizzle();
        const mc = w.meltColors ?? ['163,230,53', '190,242,100', '101,163,13'];
        this.addText(w.meltText ?? '🧪 MELELEH!', p.x, p.y - 20, `rgb(${mc[0]})`, 22);
        if (w.id === 'holy') {
          this.sink.push({ x: p.x, y: -20, tx: p.x, ty: p.y, vx: 0, vy: 0, life: 0.4, max: 0.4, size: 5, color: '#fef9c3', kind: 'bolt', rot: 0, vr: 0, g: 0 });
          this.sink.light(p.x, p.y, 180, '255,240,180', 0.6);
        }
        for (let i = 0; i < 18; i++) {
          this.sink.push({ x: p.x + rand(-6, 6), y: p.y + rand(-8, 8), vx: rand(-40, 40), vy: rand(-120, -30), life: rand(0.5, 1), max: 1, size: rand(3, 7), color: pick(mc), kind: 'glow', rot: 0, vr: 0, g: -60, drag: 1.5 });
        }
        for (let i = 0; i < 8; i++) {
          this.sink.push({ x: p.x, y: p.y, vx: rand(-30, 30), vy: rand(-80, -20), life: rand(0.8, 1.4), max: 1.4, size: rand(8, 16), color: `rgba(${mc[0]},`, kind: 'smoke', rot: 0, vr: 0, g: -40 });
        }
      }
    }
    if (w.abductEvery && this.perkCount % w.abductEvery === 0) {
      const targets = this.items.filter((it) => it.type === 'spike' || it.type === 'old');
      const tg = targets.length ? pick(targets) : null;
      if (tg) {
        const p = this.worldPos(tg.angle, R + 16);
        this.items = this.items.filter((it) => it !== tg);
        sfx3.abduct();
        this.addText('🛸 DICULIK!', p.x, p.y - 30, '#86efac', 24);
        this.sink.light(p.x, p.y, 180, '134,239,172', 0.8);
        for (let i = 0; i < 26; i++) {
          this.sink.push({ x: p.x + rand(-14, 14), y: p.y - rand(0, 300), vx: rand(-10, 10), vy: rand(-500, -250), life: rand(0.4, 0.9), max: 0.9, size: rand(2, 5), color: '134,239,172', kind: 'glow', rot: 0, vr: 0, g: 0 });
        }
        for (let i = 0; i < 10; i++) {
          this.sink.push({ x: p.x + rand(-16, 16), y: rand(0, p.y), vx: 0, vy: -1600, life: 0.15, max: 0.15, size: rand(1.5, 3), color: 'rgba(187,247,208,0.9)', kind: 'streak', rot: 0, vr: 0, g: 0 });
        }
        this.sink.push({ x: p.x, y: p.y, vx: 0, vy: 0, life: 0.6, max: 0.6, size: 90, color: '134,239,172', kind: 'shock', rot: 0, vr: 0, g: 0 });
        // item floats up as a shard
        this.sink.push({ x: p.x, y: p.y, vx: 0, vy: -200, life: 1, max: 1, size: 10, color: tg.type === 'spike' ? '#ff3030' : '#8b6a5a', kind: 'shard', rot: 0, vr: 8, g: -500 });
      }
    }
    if (w.trailFx === 'rainbow' && this.combo >= 3) {
      this.coins += 1;
      this.addText('🌈 COMBO PELANGI +1 💰', hx, hy + 90, '#f9a8d4', 18);
    }
    if (w.id === 'storm') {
      // lightning strike from sky
      this.sink.push({ x: hx + rand(-20, 20), y: -20, tx: hx, ty: hy, vx: 0, vy: 0, life: 0.3, max: 0.3, size: 4, color: '#dbeafe', kind: 'bolt', rot: 0, vr: 0, g: 0 });
      this.flashWhite = Math.max(this.flashWhite, 0.35);
    }
    if (w.id === 'meteor') {
      this.sink.push({ x: hx - 160, y: -40, tx: hx, ty: hy, vx: 0, vy: 0, life: 0.15, max: 0.15, size: 5, color: '#fb923c', kind: 'bolt', rot: 0, vr: 0, g: 0 });
    }

    // ---------- wave 4 perks ----------
    if (w.everyBonus && this.perkCount % w.everyBonus.n === 0) {
      this.score += w.everyBonus.pts;
      sfx2.jackpot();
      this.addText(w.everyBonus.text, CX, this.targetY + 10, '#fda4af', 28);
      this.flashWhite = Math.max(this.flashWhite, 0.2);
      for (let i = 0; i < 18; i++) {
        const a = rand(0, TAU);
        this.sink.push({ x: hx, y: hy, vx: Math.cos(a) * rand(150, 380), vy: Math.sin(a) * rand(150, 380), life: rand(0.5, 0.9), max: 0.9, size: rand(4, 8), color: pick(['#fecdd3', '#e11d48', '#ffffff', '#fde047']), kind: 'star', rot: 0, vr: 0, g: 0, drag: 2.5 });
      }
    }
    if (w.transmute && Math.random() < w.transmute) this.transmuteOne(hx, hy, R, '✨ SIM SALABIM!');
    if (w.obliterate) this.obliterateAt(hx, hy, R, w.obliterate);
    if (w.randomMagic) {
      const roll = Math.floor(Math.random() * 5);
      sfx4.magic();
      if (roll === 0) {
        this.applySlow(1.3, 0.35, '250,190,240', 'ice');
        this.addText('🦄 BEKU AJAIB!', hx, hy + 70, '#f0abfc', 22);
      } else if (roll === 1) this.reverseSpin('🦄 PUTAR BALIK!', hx, hy + 70);
      else if (roll === 2) {
        this.coins += 2;
        sfx.coin();
        this.addText('🦄 +2 💰', hx, hy + 70, '#fde047', 24);
      } else if (roll === 3) {
        this.spikeOffT = 1.8;
        this.addText('🦄 DURI HILANG!', hx, hy + 70, '#c4b5fd', 22);
      } else this.transmuteOne(hx, hy, R, '🦄 JADI KOIN!');
      const RBC = ['248,113,113', '251,146,60', '250,204,21', '74,222,128', '96,165,250', '192,132,252'];
      for (let i = 0; i < 6; i++) this.sink.push({ x: CX, y: this.targetY, vx: 0, vy: 0, life: 0.5 + i * 0.06, max: 0.5 + i * 0.06, size: R * (1.4 + i * 0.25), color: RBC[i], kind: 'shock', rot: 0, vr: 0, g: 0 });
    }
  }

  private transmuteOne(hx: number, hy: number, R: number, text: string) {
    const local = norm(Math.PI / 2 - this.rot);
    const cands = this.items.filter((it) => it.type === 'old' || it.type === 'spike').sort((a, b) => angDiff(a.angle, local) - angDiff(b.angle, local));
    const tg = cands[0];
    if (!tg) return;
    const p = this.worldPos(tg.angle, R + 14);
    tg.type = 'coin';
    tg.age = 10;
    tg.w = undefined;
    tg.scale = undefined;
    sfx4.salabim();
    this.addText(text, p.x, p.y - 24, '#f5d0fe', 22);
    this.sink.light(p.x, p.y, 140, '233,213,255', 0.5);
    this.sink.push({ x: p.x, y: p.y, vx: 0, vy: 0, life: 0.5, max: 0.5, size: 70, color: '233,213,255', kind: 'shock', rot: 0, vr: 0, g: 0 });
    for (let i = 0; i < 16; i++) {
      const a = rand(0, TAU);
      this.sink.push({ x: p.x, y: p.y, vx: Math.cos(a) * rand(80, 260), vy: Math.sin(a) * rand(80, 260), life: rand(0.5, 0.9), max: 0.9, size: rand(3, 7), color: pick(['#ffffff', '#f5d0fe', '#fde047']), kind: 'star', rot: 0, vr: 0, g: 0, drag: 2.5 });
    }
    for (let i = 0; i < 8; i++) {
      this.sink.push({ x: p.x + rand(-6, 6), y: p.y + rand(-6, 6), vx: rand(-30, 30), vy: rand(-60, 0), life: rand(0.6, 1), max: 1, size: rand(8, 14), color: 'rgba(233,213,255,', kind: 'smoke', rot: 0, vr: 0, g: -30 });
    }
    void hx;
    void hy;
  }

  private obliterateAt(hx: number, hy: number, R: number, n: number) {
    const targets = this.items.filter((it) => it.type === 'spike' || it.type === 'old');
    for (let i = targets.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [targets[i], targets[j]] = [targets[j], targets[i]];
    }
    const kill = targets.slice(0, n);
    // tendrils to everything nearby (visual), destroy chosen
    for (const it of this.items) {
      if (it.type === 'coin') continue;
      const p = this.worldPos(it.angle, R + 16);
      this.sink.push({ x: hx, y: hy, tx: p.x, ty: p.y, vx: 0, vy: 0, life: 0.45, max: 0.45, size: kill.includes(it) ? 4 : 2, color: '#86efac', kind: 'bolt', rot: 0, vr: 0, g: 0 });
    }
    for (const it of kill) {
      const p = this.worldPos(it.angle, R + 14);
      this.items = this.items.filter((x) => x !== it);
      this.flyers.push({ x: p.x, y: p.y, vx: rand(-300, 300), vy: rand(-450, -200), rot: it.angle + this.rot - Math.PI / 2, vr: rand(-20, 20), kind: it.type, w: it.w });
      this.sink.light(p.x, p.y, 160, '74,222,128', 0.5);
      this.sink.push({ x: p.x, y: p.y, vx: 0, vy: 0, life: 0.5, max: 0.5, size: 80, color: '134,239,172', kind: 'shock', rot: 0, vr: 0, g: 0 });
      for (let i = 0; i < 12; i++) {
        const a = rand(0, TAU);
        this.sink.push({ x: p.x, y: p.y, vx: Math.cos(a) * rand(100, 320), vy: Math.sin(a) * rand(100, 320), life: rand(0.4, 0.8), max: 0.8, size: rand(3, 7), color: pick(['74,222,128', '187,247,208', '255,255,255']), kind: 'glow', rot: 0, vr: 0, g: 0, drag: 2 });
      }
    }
    this.flashWhite = Math.max(this.flashWhite, 0.45);
    this.tintA = Math.max(this.tintA, 0.5);
    this.tintRgb = '74,222,128';
    this.sink.light(CX, this.targetY, R * 4, '74,222,128', 0.8);
    this.sink.push({ x: CX, y: this.targetY, vx: 0, vy: 0, life: 0.8, max: 0.8, size: R * 3.6, color: '74,222,128', kind: 'shock', rot: 0, vr: 0, g: 0 });
    this.addText(kill.length ? `☢️ ${kill.length}x DIMUSNAHKAN!` : '☢️ OBLITERATE!', CX, this.targetY - 10, '#86efac', 30);
  }

  private airBlast(x: number, y: number, k: number) {
    // Ported 100% from game-3 airBlast()
    this.sink.light(x, y, 160 * k, '255,255,255', 0.2);
    this.sink.push({ x, y, vx: 0, vy: 0, life: 0.32, max: 0.32, size: 10, color: '255,255,255', kind: 'ring', rot: 0, vr: 0, g: 0 });
    this.sink.push({ x, y, vx: 0, vy: 0, life: 0.4, max: 0.4, size: 6, color: '159,220,255', kind: 'ring', rot: 0, vr: 0, g: 0 });
    this.sink.push({ x, y, vx: 0, vy: 0, life: 0.35, max: 0.35, size: 20, color: '255,255,255', kind: 'ringE', rot: 0, vr: 0, g: 0 });
    // star burst
    this.sink.push({ x, y, vx: 0, vy: 0, life: 0.22, max: 0.22, size: 90 * k, color: '#fff4a0', kind: 'star', rot: 0, vr: 0, g: 0 });
    // manga speed lines radiating out of the slam (game-3 'speed' particle)
    this.sink.push({ x, y, vx: 0, vy: 0, life: 0.28, max: 0.28, size: 240 * k, color: '#ffffff', kind: 'speed', rot: 0, vr: 0, g: 0 });
    // 22 puff particles in a ring
    const n = Math.round(22 * k);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + rand(-0.1, 0.1);
      const sp = rand(220, 420) * k;
      this.sink.push({ x: x + Math.cos(a) * 10, y: y + Math.sin(a) * 6, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.6 + 40, life: rand(0.6, 1.1), max: 1.1, size: rand(14, 26), color: '#ffffff', kind: 'puff', rot: rand(0, TAU), vr: rand(-3, 3), g: 0, drag: 3 });
    }
    // 10 large puffs
    for (let i = 0; i < 10; i++) this.sink.push({ x: x + rand(-20, 20), y: y + rand(-5, 10), vx: rand(-60, 60), vy: rand(-40, 40), life: rand(0.9, 1.4), max: 1.4, size: rand(22, 40), color: '#f4f8ff', kind: 'puff', rot: rand(0, TAU), vr: rand(-1.5, 1.5), g: 0, drag: 2.5 });
    // wood dust + splinters
    for (let i = 0; i < 14; i++) this.sink.push({ x: x + rand(-20, 20), y: y + rand(-10, 5), vx: rand(-120, 120), vy: rand(-60, 60), life: rand(0.8, 1.4), max: 1.4, size: rand(12, 24), color: '#a67c4a', kind: 'smoke', rot: 0, vr: 0, g: 0, drag: 2 });
    // ash particles
    for (let i = 0; i < 26; i++) this.sink.push({ x, y, vx: rand(-420, 420), vy: rand(-520, 100), life: rand(0.8, 1.6), max: 1.6, size: rand(3, 8), color: pick(['#d9b47a', '#9a6a36', '#5a3a1a']), kind: 'chip', rot: 0, vr: rand(-18, 18), g: 1100, drag: 0.5 });
    // wind burst
    for (let i = 0; i < 30; i++) {
      const a = Math.PI / 2 + rand(-Math.PI, 0);
      const sp = rand(300, 800);
      this.sink.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.3, max: 0.3, size: 18, color: '#ffffff', kind: 'wind', rot: 0, vr: 0, g: 0, drag: 1.5 });
    }
    // text
    this.sink.push({ x: x + 60 * (Math.random() < 0.5 ? 1 : -1), y: y - 50, vx: 0, vy: -70, life: 0.8, max: 0.8, size: 40 * k, color: '#ffd23a', kind: 'text', rot: rand(-0.25, 0.25), vr: 0, g: 0, text: pick(['DOKAN!', 'BAM!', 'DUARR!']) });
  }

  private plasmaImpact(x: number, y: number, k: number) {
    // Ported 100% from game-3 plasmaImpact()
    const down = Math.PI / 2;
    this.sink.light(x, y, 260 * k, '10,42,74', 0.4);
    this.sink.light(x, y, 170 * k, '111,211,255', 0.3);
    this.sink.light(x, y, 90 * k, '255,255,255', 0.16);
    this.sink.push({ x, y, vx: 0, vy: 0, life: 0.3, max: 0.3, size: 360 * k, color: '111,211,255', kind: 'shock', rot: 0, vr: 0, g: 0 });
    this.sink.push({ x, y, vx: 0, vy: 0, life: 0.2, max: 0.2, size: 120 * k, color: '255,255,255', kind: 'star', rot: 0, vr: 0, g: 0 });
    [[520, 0.34, '111,211,255'], [760, 0.46, '255,255,255'], [1000, 0.6, '10,42,74']].forEach(([g, m, col]) =>
      this.sink.push({ x, y, vx: 0, vy: 0, life: m as number, max: m as number, size: 8, color: col as string, kind: 'ring', rot: 0, vr: 0, g: 0 }));
    this.sink.push({ x, y, vx: 0, vy: 0, life: 0.35, max: 0.35, size: 14, color: '255,255,255', kind: 'ringE', rot: 0, vr: 0, g: 0 });
    for (let i = 0; i < 12; i++) this.sink.push({ x, y, vx: Math.cos(down + rand(-1.7, 1.7)) * rand(50, 140) * k, vy: Math.sin(down + rand(-1.7, 1.7)) * rand(50, 140) * k, life: rand(0.12, 0.3), max: 0.3, size: 3, color: i % 2 ? '255,255,255' : '111,211,255', kind: 'bolt', rot: 0, vr: 0, g: 0 });
    for (let i = 0; i < 5; i++) this.sink.push({ x, y, vx: Math.cos(-down + rand(-0.8, 0.8)) * rand(40, 90), vy: Math.sin(-down + rand(-0.8, 0.8)) * rand(40, 90), life: rand(0.1, 0.2), max: 0.2, size: 2, color: '111,211,255', kind: 'bolt', rot: 0, vr: 0, g: 0 });
    for (let i = 0; i < 60 * k; i++) { const a = down + rand(-1.5, 1.5); const sp = rand(300, 1000); this.sink.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.5, max: 0.5, size: 2, color: pick(['255,255,255', '111,211,255', '255,122,32']), kind: 'spark', rot: 0, vr: 0, g: 500, drag: 3 }); }
    for (let i = 0; i < 30 * k; i++) { const a = down + rand(-1.6, 1.6); const sp = rand(80, 420); this.sink.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 1.2, max: 1.2, size: 2.2, color: pick(['255,176,96', '255,112,48', '255,210,122']), kind: 'glow', rot: 0, vr: 0, g: 200, drag: 1.5 }); }
    for (let i = 0; i < 12; i++) this.sink.push({ x: x + rand(-40, 40), y: y + rand(-10, 40), vx: 0, vy: 0, life: rand(0.2, 0.4), max: 0.4, size: rand(12, 26), color: '232,253,255', kind: 'star', rot: 0, vr: 0, g: 0 });
    for (let i = 0; i < 14; i++) this.sink.push({ x: x + rand(-24, 24), y: y + rand(0, 14), vx: rand(-90, 90), vy: rand(-30, 60), life: rand(1.2, 2.2), max: 2.2, size: rand(18, 34), color: '42,52,66', kind: 'smoke', rot: 0, vr: 0, g: 0, drag: 1.5 });
    for (let i = 0; i < 20; i++) this.sink.push({ x, y, vx: rand(-380, 380), vy: rand(-480, 80), life: rand(0.8, 1.5), max: 1.5, size: rand(3, 7), color: pick(['28,20,16', '74,48,32', '217,180,122']), kind: 'ash', rot: 0, vr: rand(-16, 16), g: 1000 });
  }

  private splash(x: number, y: number, k: number) {
    // Ported 100% from game-3 splash() (acid)
    const down = Math.PI / 2;
    this.sink.light(x, y, 110 * k, '182,255,26', 0.28);
    this.sink.light(x, y, 50, '255,255,255', 0.12);
    this.sink.push({ x, y, vx: 0, vy: 0, life: 0.3, max: 0.3, size: 8, color: '182,255,26', kind: 'ring', rot: 0, vr: 0, g: 0 });
    // pancake: blobs sliding sideways along the rim then falling
    for (let i = 0; i < 10; i++) {
      const side = i % 2 ? 1 : -1;
      this.sink.push({ x: x + side * i * 2, y: y + 2, vx: side * rand(90, 420) * k, vy: rand(-60, 20), life: rand(0.5, 0.9), max: 0.9, size: rand(4, 8), color: '#b6ff1a', kind: 'acid', rot: 0, vr: 0, g: 1300, drag: 0.15 });
    }
    // main fan of drops (bounce downward/sideways)
    for (let i = 0; i < 48 * k; i++) {
      const a = down + rand(-1.55, 1.55);
      const s = rand(120, 640) * k;
      this.sink.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rand(0.7, 1.4), max: 1.4, size: rand(1.8, 5.2), color: '#b6ff1a', kind: 'acid', rot: 0, vr: 0, g: 1100, drag: 0.15 });
    }
    // sprays upward (ricochet over the rim)
    for (let i = 0; i < 10; i++) this.sink.push({ x: x + rand(-10, 10), y, vx: rand(-240, 240), vy: rand(-420, -120), life: rand(0.5, 1), max: 1, size: rand(1.5, 3.2), color: '#b6ff1a', kind: 'acid', rot: 0, vr: 0, g: 1100, drag: 0.15 });
    for (let i = 0; i < 18; i++) this.sink.push({ x: x + rand(-20, 20), y: y + rand(0, 10), vx: rand(-50, 50), vy: rand(-90, -20), life: rand(1.4, 2.6), max: 2.6, size: rand(12, 26), color: pick(['143,194,58', '200,255,90', '90,122,42']), kind: 'smoke', rot: 0, vr: 0, g: 0, drag: 2 });
    for (let i = 0; i < 14; i++) this.sink.push({ x: x + rand(-18, 18), y: y + rand(-6, 6), vx: rand(-20, 20), vy: rand(-30, 10), life: rand(0.3, 0.8), max: 0.8, size: rand(1.5, 4), color: '155,209,58', kind: 'bubble', rot: 0, vr: 0, g: 0, grow: 6 });
    for (let i = 0; i < 14; i++) { const a = down + rand(-1.6, 1.6); const sp = rand(100, 400); this.sink.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.4, max: 0.4, size: 1.5, color: pick(['255,255,255', '155,209,58']), kind: 'spark', rot: 0, vr: 0, g: 700, drag: 3 }); }
  }

  /** True while the acid layer has something to composite. */
  private hasAcidLayer(): boolean {
    if (this.weapon.id === 'xeno' && this.projs.length) return true;
    for (const p of this.particles) if (p.kind === 'acid') return true;
    for (const it of this.items) if (it.acid) return true;
    return false;
  }

  /**
   * Collect every acid source as metaballs, ported 1:1 from game-3
   * collectBlobs(): flying glob (head + body + tail + sampled trail), free
   * droplets, and the blobs stuck on the wheel (sagging, wobbling + drip).
   */
  private collectAcidBlobs() {
    const fluid = this.acidFluid;
    fluid.begin();
    const t = this.time;
    // Match the transform used by render(): the wheel bobs and breathes, so the
    // acid stuck to it must ride along or it would drift off the rim.
    const wScale = (this.wheelScale ?? 1) * (1 + this.bump * 0.035);
    const cy = this.targetY + this.bump * 7;
    const R = this.level.radius * wScale;

    if (this.weapon.id === 'xeno') {
      for (const p of this.projs) {
        if (p.spawnDelay && p.spawnDelay > 0) continue;
        const pt = p.t ?? 0;
        fluid.add(p.x, p.y, 13);
        fluid.add(p.x, p.y + 9, 11);
        fluid.add(p.x + Math.sin(pt * 40) * 1.5, p.y + 19, 8.5);
        const trail = p.trail ?? [];
        for (let i = 2; i < trail.length; i++) {
          const k = i / trail.length;
          const tp = trail[i];
          fluid.add(tp.x + Math.sin(i * 1.7 + pt * 25) * k * 3, tp.y + 24 + i * 3, 7.5 * (1 - k) + 1.5);
        }
      }
    }

    for (const p of this.particles) {
      if (p.kind !== 'acid') continue;
      const k = p.life / p.max;
      const r = p.size * (k < 0.75 ? 1 : 1 - (k - 0.75) / 0.25);
      if (r < 0.6) continue;
      fluid.add(p.x, p.y, r);
      // teardrop streak along the velocity
      const sp = Math.hypot(p.vx, p.vy);
      if (sp > 150 && r > 1.5) {
        const f = Math.min(0.03, 6 / sp);
        fluid.add(p.x - p.vx * f, p.y - p.vy * f, r * 0.65);
      }
    }

    for (const it of this.items) {
      if (!it.acid || it.type !== 'bullet') continue;
      const a = it.angle + this.rot;
      const ca = Math.cos(a);
      const sa = Math.sin(a);
      const sag = Math.min(1, it.age / 1.2);
      for (const b of it.acid.blobs) {
        const wob = Math.sin(t * 3 + b.ph) * 1.2;
        const d = R + b.d * (0.6 + 0.4 * sag) + wob;
        const sd = b.s + Math.cos(t * 2.5 + b.ph) * 0.8;
        fluid.add(CX + ca * d - sa * sd, cy + sa * d + ca * sd, b.r);
      }
      if (it.acid.drip > 0) {
        const bx = CX + ca * (R + 8);
        const by = cy + sa * (R + 8);
        fluid.add(bx, by + it.acid.drip * 0.5, 3.5);
        fluid.add(bx, by + it.acid.drip, 3 + it.acid.drip * 0.12);
      }
    }
  }

  /**
   * Predator shoulder-caster tri-laser (game-3 drawTriLaser): three faint red
   * beams converge on a lock-on triangle of dots on the target, tightening into
   * a reticle while the core charges.
   */
  private drawTriLaser(c: CanvasRenderingContext2D) {
    if (this.state !== 'play' || this.weapon.id !== 'pred' || this.level.mode === 'treasure') return;
    const t = this.time;
    const ch = this.charging ? Math.min(1, this.chargeT) : 0;
    const ap = { x: CX, y: this.targetY + this.level.radius - 18 };
    const lift = -this.spin * 6 + this.recoil * 8;
    const ex = CX - 50;
    const ey = GUN_Y - 92 + this.recoil * 14 + lift + 15;
    const jitter = () => (Math.random() - 0.5) * (1.2 - ch);
    const spreadR = 10 + (1 - ch) * 14 + Math.sin(t * 2) * 2;
    c.save();
    c.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * TAU - Math.PI / 2 + t * 0.6;
      const dx = ap.x + Math.cos(a) * spreadR + jitter();
      const dy = ap.y + 8 + Math.sin(a) * spreadR * 0.45 + jitter();
      const g = c.createLinearGradient(ex, ey, dx, dy);
      g.addColorStop(0, 'rgba(255,30,30,0.45)');
      g.addColorStop(0.5, 'rgba(255,30,30,0.12)');
      g.addColorStop(1, 'rgba(255,30,30,0.5)');
      c.strokeStyle = g;
      c.lineWidth = 1.2 + ch * 0.6;
      const eo = [[-5, 2], [5, 2], [0, -4]][i];
      c.beginPath();
      c.moveTo(ex + eo[0], ey + eo[1]);
      c.lineTo(dx, dy);
      c.stroke();
      drawGlow(c, dx, dy, 9 + ch * 4, '#ff1e1e', 0.9);
      drawGlow(c, dx, dy, 3, '#ffffff', 0.9);
      c.fillStyle = '#ff5050';
      c.beginPath();
      c.arc(dx, dy, 1.6, 0, TAU);
      c.fill();
    }
    c.strokeStyle = `rgba(255,30,30,${0.25 + ch * 0.5})`;
    c.lineWidth = 1;
    c.beginPath();
    for (let i = 0; i <= 3; i++) {
      const a = (i / 3) * TAU - Math.PI / 2 + t * 0.6;
      const x = ap.x + Math.cos(a) * spreadR;
      const y = ap.y + 8 + Math.sin(a) * spreadR * 0.45;
      if (i) c.lineTo(x, y);
      else c.moveTo(x, y);
    }
    c.stroke();
    if (ch > 0) {
      c.strokeStyle = `rgba(255,30,30,${ch * 0.8})`;
      c.lineWidth = 1.5;
      const r = 26 - ch * 10;
      c.beginPath();
      c.ellipse(ap.x, ap.y + 8, r, r * 0.45, 0, 0, TAU);
      c.stroke();
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * TAU + t * 3;
        c.beginPath();
        c.moveTo(ap.x + Math.cos(a) * r * 0.8, ap.y + 8 + Math.sin(a) * r * 0.36);
        c.lineTo(ap.x + Math.cos(a) * r * 1.3, ap.y + 8 + Math.sin(a) * r * 0.58);
        c.stroke();
      }
    }
    c.restore();
  }

  private stickAt(local: number, p?: Proj) {
    const R = this.level.radius;
    const w = this.weapon;
    const big = p?.big ?? 0;
    const tint = p?.tint;
    /** SET 1 impact burst: slide 7's own recipe replaces slide 1's signature burst. */
    const s1Hit = this.setOneLive && p?.setOne ? p.setOne : null;
    /** SET 2..5 impact burst: slide 7's own `hit()` on its own round. */
    const s7Hit = this.setSevenLive && p?.setSeven ? p.setSeven : null;
    /** Slide 6 impact: its own beam burst plus the scorch mark it leaves. */
    const s6Hit = this.setSixLive && p?.setSix ? true : false;
    /** Slide 9 impact: its own `onImpact()` plus the entry hole it paints. */
    const s9Hit = this.setNineLive && p?.setNine ? p.setNine : null;
    /** Slide 11 impact: its own `onHit()` burst and its wheel embeds. */
    const s11Hit = this.setElevenLive && p?.setEleven ? p.setEleven : null;
    /** Slide 2 impact: its own `stick()` burst for the weapon that fired. */
    const s2Hit = this.setTwoLive && p?.setTwo ? p.setTwo : null;
    /**
     * A burst gun fires one round per pellet on slide 1 but exactly one on
     * slide 7 (the shotgun's nine pellets live inside that one blast). The
     * extra carriers still score — that is how slide 1 has always counted a
     * burst — but they must not leave a second bullet stuck in the wheel.
     */
    const s7GhostHit = this.setSevenLive && p?.s7Ghost ? true : false;
    // A slide-9 / slide-11 gun whose own round has not been released yet (beam
    // weapons, charged staffs, drums) still flies slide 1's carrier into the
    // wheel. That carrier must not leave a slide-1 bullet hole: the layer owns
    // the impact, exactly like it owns the shot.
    const s9Pending = this.setNineLive && p?.setNinePending ? true : false;
    const s11Pending = this.setElevenLive && p?.setElevenPending ? true : false;
    // Slide 7's own `hit()` calls `landed()`, which draws the stuck round with
    // `drawStuckItem()`; slide 1 keeps its collision entry (spikes, coins, the
    // clear counter) but must not paint a second round on top of it.
    const layerHit = !!(s6Hit || s7Hit || s7GhostHit || s9Hit || s11Hit || s9Pending || s11Pending || s2Hit);
    const hue = s2Hit ? s2Hit.hue : p?.hue ?? (w.id === 'firework' ? gunState.rocketHue : w.id === 'yoyo' ? gunState.yoyoHue : undefined);
    if (w.id === 'firework' && hue !== undefined) gunState.rocketHue = hue;
    if (w.id === 'yoyo' && hue !== undefined) gunState.yoyoHue = hue;
    this.items.push({
      angle: local,
      type: 'bullet',
      age: 0,
      w: w.id,
      big,
      tint,
      hue,
      flash: w.id === 'firework' || w.id === 'yoyo' || w.id === 'diamond' || w.id === 'bazooka' ? 1 : undefined,
      scale: big ? embeddedProjectileScale(big) : undefined,
      // Slide 9 / slide 11 / slide 2 paint their own round into the wheel, so
      // the slide-1 bullet art must not be drawn on top of it.
      hideArt: layerHit ? true : undefined,
      // Slide 2's artist draws the stuck round itself (see `setTwoLook.ts`).
      setTwo: s2Hit ? true : undefined,
    });
    this.stuck++;
    // Dora airBlast hit FX (game-3)
    if (w.id === 'dora') {
      const hp = this.worldPos(local, R);
      this.bump = Math.max(this.bump, 18);
      this.wheelFlash = Math.max(this.wheelFlash, 0.8);
      this.wheelFlashRgb = '220,242,255';
      this.shake = Math.max(this.shake, 13);
      this.airBlast(hp.x, hp.y, 1);
      sfx6.doraHit();
    }
    // Pred plasmaImpact hit FX (game-3)
    if (w.id === 'pred') {
      const hp = this.worldPos(local, R);
      this.bump = Math.max(this.bump, 14);
      this.wheelFlash = Math.max(this.wheelFlash, 1);
      this.wheelFlashRgb = '200,235,255';
      this.shake = Math.max(this.shake, 15);
      this.plasmaImpact(hp.x, hp.y, 1);
      sfx6.predHit();
    }
    // Xeno acid splash hit FX (game-3)
    if (w.id === 'xeno') {
      const hp = this.worldPos(local, R);
      this.bump = Math.max(this.bump, 8);
      this.wheelFlash = Math.max(this.wheelFlash, 1);
      this.wheelFlashRgb = '200,255,128';
      this.shake = Math.max(this.shake, 7);
      // The glob now lives in the metaball layer: five sub-blobs that sag,
      // wobble and eventually drip down the rim — exactly like slide 7.
      const stuckItem = this.items[this.items.length - 1];
      if (stuckItem) {
        stuckItem.acid = {
          blobs: [
            { d: 5, s: 0, r: 11, ph: rand(0, TAU) },
            { d: 13, s: rand(-3, 3), r: 8, ph: rand(0, TAU) },
            { d: 1, s: rand(6, 10), r: 6, ph: rand(0, TAU) },
            { d: 1, s: rand(-10, -6), r: 6, ph: rand(0, TAU) },
            { d: 20, s: rand(-2, 2), r: 4.5, ph: rand(0, TAU) },
          ],
          dripT: rand(0.5, 1.5),
          drip: 0,
          seed: Math.random() * 1000,
        };
      }
      this.splash(hp.x, hp.y, 1);
      sfx6.xenoHit();
    }
    if (this.time - this.lastHit < (w.comboWindow ?? 0.5)) this.combo++;
    else this.combo = 1;
    this.lastHit = this.time;
    let pts = w.points * (big === 2 ? 4 : big === 1 ? 2 : 1);
    if (big) {
      this.addText(big === 2 ? '⚡ FULL CHARGE x4!' : 'CHARGE x2', CX + rand(-40, 40), this.targetY + R + 60, big === 2 ? '#fde047' : '#7dd3fc', big === 2 ? 28 : 20);
      this.hitStop = Math.max(this.hitStop, big === 2 ? 0.12 : 0.04);
      if (big === 2) {
        const hp0 = this.worldPos(local, R);
        this.sink.light(hp0.x, hp0.y, 360, '254,240,138', 0.5);
        this.sink.push({ x: hp0.x, y: hp0.y, vx: 0, vy: 0, life: 0.6, max: 0.6, size: 220, color: '125,211,252', kind: 'shock', rot: 0, vr: 0, g: 0 });
        this.flashWhite = Math.max(this.flashWhite, 0.3);
      }
    }
    if (tint) {
      const hp0 = this.worldPos(local, R);
      // The droplet layer is batched into one path per colour now, so the burst
      // stays exactly as lush as it was: 22 droplets a hit used to mean ~900
      // fills a frame at 8 shots a second, and it is a handful of fills however
      // many land.
      for (let i = 0; i < 22; i++) {
        const a = rand(0, TAU);
        const v = rand(120, 520);
        this.sink.push({ x: hp0.x, y: hp0.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: rand(0.4, 0.8), max: 0.8, size: rand(2, 5), color: `rgb(${tint})`, kind: 'drop', rot: 0, vr: 0, g: 1100 });
      }
      this.sink.push({ x: hp0.x, y: hp0.y, vx: 0, vy: 0, life: 0.3, max: 0.3, size: 24, color: `rgb(${tint})`, kind: 'paintSplat', rot: rand(0, TAU), vr: 0, g: 0 });
      if (tint === this.lastPaint) {
        pts += 3;
        sfx4.match();
        this.addText('🎨 WARNA SAMA! +3', hp0.x, hp0.y + 60, `rgb(${tint})`, 22);
      }
      this.lastPaint = tint;
    }
    if (this.combo >= 2) {
      if (this.combo >= 3) pts *= 2;
      sfx.combo(this.combo);
      this.comboPop = 1;
    }
    pts *= this.dmgMult; // POWER also doubles classic points / boss damage, not only rock damage.
    this.score += pts;
    this.bump = 1;
    this.hitFlash = 1;
    this.shake = Math.max(this.shake, 6);
    if (!s1Hit && !s7Hit && !layerHit) this.crack(local, tint);
    if (isSlide23Weapon(w.id) && !layerHit) {
      const hitIdx = Math.max(0, this.stuck - 1);
      if (w.id === 'yoyo') slide23Sfx.hit('yoyo-spin', 0);
      if (w.id === 'firework') fireworkSfx.hit(hitIdx);
      else slide23Sfx.hit(w.id, hitIdx);
    } else if (!s1Hit && !s7Hit && !layerHit) {
      sfx.hit();
      if (w.energy && !w.slow && !w.pullCoins && !HIT_SFX[w.id]) sfx.zap();
    }
    const hp = this.worldPos(local, R);
    const hx = hp.x;
    const hy = hp.y;
    const cols = STYLE_COLORS[this.level.style].chips;
    if (s1Hit) impactSetOne(this.s1, s1Hit, hx, hy, local, this.s1Hooks(), (n) => setOneSfx.play(n));
    // Slide 7's own impact: cracks painted into the wheel face, the rim glow,
    // the burst, the stuck round and its sound — all from `projectiles*.ts`.
    else if (s7Hit) {
      s7Hit.hit(local, hx, hy);
      // Slide 7 keeps updating and drawing a round after it landed (the
      // shotgun's pellet shower, the minigun drum, the water jet…), so the
      // round goes back to slide 7's layer for the rest of its short life.
      this.s7.release(s7Hit);
      this.s7Last = undefined;
    }
    // Slide 6's own impact: the beam burst at the rim and the scorch it burns
    // into the wheel face, drawn with slide 6's own recipe.
    else if (s6Hit) this.s6.impact(hx, hy, local);
    // Slide 9's own impact: its burst, its sound and the entry hole it paints.
    else if (s9Hit) this.s9.impact(hx, hy, local);
    // Slide 11's own impact: its burst, its sound and the marks it leaves.
    else if (s11Hit) this.s11.impact(hx, hy, s11Hit);
    else if (s9Pending) this.s9.block(hx, hy);
    else if (s11Pending) this.s11.block(hx, hy);
    // Slide 2's own impact: the shell burst, the bite mark, the shrapnel and
    // its own hit voice, played where the round actually landed.
    else if (s2Hit) {
      const s2id = this.setTwoId;
      if (s2id) this.s2w.stick(s2id, hx, hy, s2Hit.hue, s2Hit.seed);
    }
    this.slide2Impact(hx, hy);
    this.applyPerks(w, hx, hy, R);
    if (w.id === 'yoyo') {
      spawnYoyoStickBurst(
        this.getYoyoState(),
        hx,
        hy,
        hue ?? gunState.yoyoHue,
        p?.originX ?? CX,
        GUN_Y - 10,
      );
    }
    if (w.id === 'keris') {
      spawnKerisImpact(
        this.getKerisState(),
        hx,
        hy,
        p?.originX ?? CX,
        GUN_Y - 6,
        local,
      );
    }
    if (w.id === 'diamond') {
      spawnDiamondStickBurst(this.getDiamondState(), hx, hy, 1);
    }
    if (w.id === 'bazooka') {
      this.getBazookaState().onHit(hx, hy, 1.05);
    }
    const fxp = FX[w.id];
    // Slide 9 and slide 11 spawn their own impact burst and sound, so slide 1's
    // signature burst would only stack a second explosion on top of them.
    if (w.id !== 'firework' && w.id !== 'yoyo' && w.id !== 'keris' && w.id !== 'diamond' && w.id !== 'bazooka'
      && !s1Hit && !layerHit) {
      spawnImpact(this.sink, fxp, w, hx, hy, (hx - CX) / R, (hy - this.targetY) / R, cols);
    }
    this.hitStop = Math.max(this.hitStop, fxp.hitstop);
    this.camY -= fxp.kick;
    this.shake = Math.max(this.shake, 3 + fxp.kick * 0.8);
    if (fxp.tint) {
      this.tintA = Math.max(this.tintA, fxp.tint);
      this.tintRgb = fxp.light;
    }
    if (this.level.boss) {
      const dmg = pts * 10;
      this.bossHp = Math.max(0, this.bossHp - dmg);
      if (this.bossHp <= 0 || this.stuck >= this.level.ammo) {
        this.clearLevel();
      }
    } else {
      if (this.stuck >= this.level.ammo) this.clearLevel();
    }
  }

  private collectCoin(it: Item) {
    const R = this.level.radius;
    const wa = it.angle + this.rot;
    const x = CX + Math.cos(wa) * (R + 14);
    const y = this.targetY + Math.sin(wa) * (R + 14);
    this.items = this.items.filter((i) => i !== it);
    const v = this.weapon.coinValue;
    this.coins += v;
    sfx.coin();
    this.addText(`+${v} 💰`, x, y - 10, '#ffd23f', v > 1 ? 26 : 20);
    for (let i = 0; i < 14; i++) {
      const a = rand(0, TAU);
      const v = rand(100, 320);
      this.particles.push({
        x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: rand(0.3, 0.6), max: 0.6,
        size: rand(2, 4), color: pick(['#ffd23f', '#fff1a8', '#f59e0b']), kind: 'spark', rot: 0, vr: 0, g: 300,
      });
    }
  }

  private hitDiamond(it: Item) {
    it.hits = 1;
    const R = this.level.radius;
    const wa = it.angle + this.rot;
    const x = CX + Math.cos(wa) * (R + 18);
    const y = this.targetY + Math.sin(wa) * (R + 18);
    sfx4.shatter();
    this.shake = Math.max(this.shake, 6);
    this.addText('💎 1/2 RETAK!', x, y - 12, '#67e8f9', 18);
    for (let i = 0; i < 14; i++) {
      this.particles.push({
        x, y, vx: rand(-180, 180), vy: rand(-220, 100), life: rand(0.3, 0.6), max: 0.6,
        size: rand(2, 5), color: pick(['#67e8f9', '#ffffff', '#a5f3fc']), kind: 'spark', rot: 0, vr: 0, g: 600,
      });
    }
  }

  private collectDiamond(it: Item) {
    const R = this.level.radius;
    const wa = it.angle + this.rot;
    const x = CX + Math.cos(wa) * (R + 18);
    const y = this.targetY + Math.sin(wa) * (R + 18);
    this.items = this.items.filter((i) => i !== it);
    this.coins += 5;
    this.events.onDiamondCollected?.(10, false, { x, y });
    sfx3.chime();
    sfx2.jackpot();
    this.shake = Math.max(this.shake, 8);
    this.addText('BERLIAN +10! +5 APEL', x, y - 12, '#67e8f9', 22);
    for (let i = 0; i < 26; i++) {
      const a = rand(0, TAU);
      const v = rand(120, 440);
      this.particles.push({
        x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: rand(0.5, 0.9), max: 0.9,
        size: rand(2.5, 6), color: pick(['#67e8f9', '#a5f3fc', '#ffffff', '#fde047']), kind: 'star', rot: 0, vr: 0, g: 300,
      });
    }
  }

  private fail(p: Proj) {
    // Slide 7's own "blocked" burst (the round is stopped by a stuck weapon).
    if (this.setSevenLive && p.setSeven) {
      p.setSeven.block(p.x, p.y);
      this.s7.release(p.setSeven);
    }
    if (this.setSixLive && p.setSix) this.s6.block(p.x, p.y);
    if (this.setNineLive && p.setNine) this.s9.block(p.x, p.y);
    if (this.setElevenLive && p.setEleven) this.s11.block(p.x, p.y);
    this.aiming = false;
    this.burnT = 0;
    this.state = 'fail';
    this.stateT = 0;
    this.projs = [];
    this.holding = false;
    this.beams = [];
    this.flyers.push({ x: p.x, y: p.y + BLEN / 2, vx: rand(-260, 260), vy: rand(380, 520), rot: 0, vr: rand(14, 24) * (Math.random() < 0.5 ? -1 : 1), kind: 'bullet', w: this.weapon.id, hue: p.hue });
    if (this.weapon.id === 'firework') {
      spawnFirework8FailBurst(this.getFwState(), p.x, p.y, p.hue ?? gunState.rocketHue);
    }
    if (this.weapon.id === 'yoyo') {
      spawnYoyoFailBurst(this.getYoyoState(), p.x, p.y, p.hue ?? gunState.yoyoHue);
    }
    if (this.weapon.id === 'diamond') {
      spawnDiamondFailBurst(this.getDiamondState(), p.x, p.y);
    }
    if (this.weapon.id === 'bazooka') {
      this.getBazookaState().onHit(p.x, p.y, 1.45);
    }
    // The blunt slam and the plasma detonation also fire when the shot is
    // wasted on an obstacle (game-3 resolveHit: fail branch).
    if (this.weapon.id === 'dora') this.airBlast(p.x, p.y, 1.3);
    if (this.weapon.id === 'pred') this.plasmaImpact(p.x, p.y, 1.3);
    // Acid splashes off the obstacle (game-3 resolveHit fail branch).
    if (this.weapon.id === 'xeno') {
      this.splash(p.x, p.y + 10, 1.4);
      this.sink.light(p.x, p.y, 90, '255,255,255', 0.15);
      this.sink.push({ x: p.x, y: p.y, vx: 0, vy: 0, life: 0.25, max: 0.25, size: 6, color: '255,255,255', kind: 'ring', rot: 0, vr: 0, g: 0 });
      for (let i = 0; i < 24; i++) {
        const a = Math.PI / 2 + rand(-1.5, 1.5);
        const sp = rand(200, 700);
        this.sink.push({ x: p.x, y: p.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.5, max: 0.5, size: 2, color: pick(['#ffffff', '#fff2b0', '182,255,26']), kind: 'spark', rot: 0, vr: 0, g: 900, drag: 3 });
      }
    }
    if (!this.setTwoVoice('fail')) sfx.fail(this.weapon.id);
    this.shake = 16;
    this.flashRed = 1;
    this.timeScale = 0.12;
    this.hitStop = 0.14;
    this.camY -= 10;
    this.sink.light(p.x, p.y, 180, '255,70,50', 0.5);
    this.sink.push({ x: p.x, y: p.y, vx: 0, vy: 0, life: 0.3, max: 0.3, size: 45, color: '255,60,40', kind: 'shock', rot: 0, vr: 0, g: 0 });
    for (let i = 0; i < 10; i++) {
      this.sink.push({ x: p.x, y: p.y, vx: rand(-300, 300), vy: rand(-200, 300), life: rand(0.4, 0.8), max: 0.8, size: rand(4, 8), color: pick(['#ffffff', '#ffd23f', '#9ca3af']), kind: 'shard', rot: rand(0, TAU), vr: rand(-20, 20), g: 1200 });
    }
    this.combo = 0;
    for (let i = 0; i < 26; i++) {
      const a = rand(0, TAU);
      const v = rand(200, 800);
      this.particles.push({
        x: p.x, y: p.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: rand(0.2, 0.5), max: 0.5,
        size: rand(1.5, 3), color: pick(['#ffffff', '#ffd23f', '#ff6b35']), kind: 'spark', rot: 0, vr: 0, g: 500,
      });
    }
    this.particles.push({ x: p.x, y: p.y, vx: 0, vy: 0, life: 0.4, max: 0.4, size: 70, color: '#ff3b3b', kind: 'ring', rot: 0, vr: 0, g: 0 });
    this.addText('GAGAL!', CX, this.targetY + this.level.radius + 110, '#ff4d4d', 40);
  }

  private clearLevel() {
    this.state = 'clear';
    this.events.onStageCleared?.(this.level.n, this.level.boss, { x: CX, y: this.targetY });
    this.stateT = 0;
    this.projs = [];
    const R = this.level.radius;
    const k = 9;
    const offs = rand(0, TAU);
    for (let i = 0; i < k; i++) {
      const a0 = offs + (i / k) * TAU;
      const a1 = offs + ((i + 1) / k) * TAU;
      const mid = (a0 + a1) / 2 + this.rot;
      const v = rand(260, 520);
      this.frags.push({ x: CX, y: this.targetY, vx: Math.cos(mid) * v, vy: Math.sin(mid) * v - 220, rot: this.rot, vr: rand(-6, 6), a0, a1 });
    }
    for (const it of this.items) {
      const wa = it.angle + this.rot;
      const v = rand(350, 650);
      this.flyers.push({
        x: CX + Math.cos(wa) * R, y: this.targetY + Math.sin(wa) * R, vx: Math.cos(wa) * v, vy: Math.sin(wa) * v - 200,
        rot: wa - Math.PI / 2, vr: rand(-14, 14), kind: it.type, w: it.w, hue: it.hue,
      });
    }
    if (this.weapon.id === 'firework') {
      spawnFirework8ClearFinale(this.getFwState(), CX, this.targetY, this.level?.n ?? 1);
    }
    if (this.weapon.id === 'yoyo') {
      spawnYoyoClearFinale(this.getYoyoState(), CX, this.targetY);
    }
    if (this.weapon.id === 'diamond') {
      spawnDiamondClearFinale(this.getDiamondState(), CX, this.targetY);
    }
    if (this.weapon.id === 'bazooka') {
      this.getBazookaState().onStageClear(CX, this.targetY);
    }
    // Xenomorph acid detonation: the burst soaks the arena in acid rain
    // (game-3 explodeWheel()).
    if (this.weapon.id === 'xeno') {
      for (const it of this.items) {
        if (!it.acid) continue;
        const wa = it.angle + this.rot;
        const sx = CX + Math.cos(wa) * (R + 10);
        const sy = this.targetY + Math.sin(wa) * (R + 10);
        for (let i = 0; i < 8; i++) {
          this.sink.push({ x: sx, y: sy, vx: Math.cos(wa) * rand(100, 500) + rand(-100, 100), vy: Math.sin(wa) * rand(100, 500) - 200, life: 1.6, max: 1.6, size: rand(3, 7), color: '#b6ff1a', kind: 'acid', rot: 0, vr: 0, g: 1100, drag: 0.15 });
        }
      }
      for (let i = 0; i < 90; i++) {
        const a = rand(0, TAU);
        const sp = rand(150, 850);
        this.sink.push({ x: CX, y: this.targetY, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: rand(1, 1.8), max: 1.8, size: rand(2.5, 7), color: '#b6ff1a', kind: 'acid', rot: 0, vr: 0, g: 1100, drag: 0.15 });
      }
      for (let i = 0; i < 30; i++) {
        this.sink.push({ x: CX + rand(-40, 40), y: this.targetY + rand(-40, 40), vx: rand(-200, 200), vy: rand(-200, 200), life: rand(1.5, 2.8), max: 2.8, size: rand(25, 55), color: '106,138,58', kind: 'smoke', rot: 0, vr: 0, g: 0, drag: 2 });
      }
    }
    // Air cannon detonation: a wall of cartoon puffs, manga speed lines and the
    // big DOKAAAN!! (game-3 explodeWheel dora branch).
    if (this.weapon.id === 'dora') {
      for (let i = 0; i < 40; i++) {
        const a = rand(0, TAU);
        const sp = rand(200, 700);
        this.sink.push({ x: CX, y: this.targetY, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: rand(1, 1.8), max: 1.8, size: rand(20, 44), color: '#ffffff', kind: 'puff', rot: rand(0, TAU), vr: rand(-2, 2), g: 0, drag: 2.2 });
      }
      this.sink.push({ x: CX, y: this.targetY, vx: 0, vy: 0, life: 0.5, max: 0.5, size: 520, color: '#ffffff', kind: 'speed', rot: 3.7, vr: 0, g: 0 });
      this.sink.push({ x: CX, y: this.targetY - 40, vx: 0, vy: -60, life: 1.4, max: 1.4, size: 64, color: '#ffd23a', kind: 'text', rot: -0.12, vr: 0, g: 0, text: 'DOKAAAN!!' });
    }
    // Plasma detonation: blinding core, lightning web and molten embers
    // (game-3 explodeWheel pred branch).
    if (this.weapon.id === 'pred') {
      this.sink.light(CX, this.targetY, 600, '111,211,255', 0.6);
      for (let i = 0; i < 18; i++) {
        const a = rand(0, TAU);
        this.sink.push({ x: CX, y: this.targetY, vx: Math.cos(a) * rand(120, 280), vy: Math.sin(a) * rand(120, 280), life: 0.35, max: 0.35, size: 3, color: i % 2 ? '255,255,255' : '111,211,255', kind: 'bolt', rot: 0, vr: 0, g: 0 });
      }
      for (let i = 0; i < 80; i++) {
        const a = rand(0, Math.PI);
        const sp = rand(300, 1200);
        this.sink.push({ x: CX, y: this.targetY, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 1.4, max: 1.4, size: 2.6, color: pick(['255,176,96', '255,112,48', '111,211,255']), kind: 'glow', rot: 0, vr: 0, g: 500, drag: 1.5 });
      }
    }
    this.resetSevenLayer();
    this.items = [];
    const cols = STYLE_COLORS[this.level.style].chips;
    for (let i = 0; i < 50; i++) {
      const a = rand(0, TAU);
      const v = rand(150, 750);
      this.particles.push({
        x: CX + Math.cos(a) * rand(0, R), y: this.targetY + Math.sin(a) * rand(0, R), vx: Math.cos(a) * v, vy: Math.sin(a) * v - 150,
        life: rand(0.6, 1.2), max: 1.2, size: rand(3, 7), color: pick(cols), kind: 'chip', rot: rand(0, TAU), vr: rand(-20, 20), g: 1300,
      });
    }
    for (let i = 0; i < 14; i++) {
      this.particles.push({
        x: CX + rand(-R, R) * 0.6, y: this.targetY + rand(-R, R) * 0.6, vx: rand(-60, 60), vy: rand(-60, 20), life: rand(0.6, 1.1), max: 1.1,
        size: rand(18, 34), color: 'rgba(220,220,220,', kind: 'smoke', rot: 0, vr: 0, g: -30,
      });
    }
    this.particles.push({ x: CX, y: this.targetY, vx: 0, vy: 0, life: 0.5, max: 0.5, size: R * 2.4, color: '#ffffff', kind: 'ring', rot: 0, vr: 0, g: 0 });
    if (!this.setTwoVoice('clear')) sfx.clear(this.weapon.id);
    this.shake = 18;
    this.flashWhite = 0.7;
    this.timeScale = 0.35;
    this.hitStop = 0.07;
    const lr = FX[this.weapon.id].light;
    this.sink.light(CX, this.targetY, R * 2.5, lr, 0.6);
    this.sink.push({ x: CX, y: this.targetY, vx: 0, vy: 0, life: 0.5, max: 0.5, size: R * 1.8, color: lr, kind: 'shock', rot: 0, vr: 0, g: 0 });
    const cc = STYLE_COLORS[this.level.style].chips;
    for (let i = 0; i < 18; i++) {
      const a = rand(0, TAU);
      const v = rand(250, 700);
      this.sink.push({ x: CX + Math.cos(a) * R * 0.5, y: this.targetY + Math.sin(a) * R * 0.5, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 200, life: rand(0.7, 1.2), max: 1.2, size: rand(6, 12), color: pick(cc), kind: 'shard', rot: rand(0, TAU), vr: rand(-20, 20), g: 1300 });
    }
    for (let i = 0; i < 14; i++) {
      const a = rand(0, TAU);
      this.sink.push({ x: CX, y: this.targetY, vx: Math.cos(a) * rand(100, 400), vy: Math.sin(a) * rand(100, 400), life: rand(0.5, 1), max: 1, size: rand(6, 11), color: '#ffffff', kind: 'star', rot: rand(0, TAU), vr: 0, g: 0, drag: 2.5 });
    }
    if (this.level.boss) {
      this.coins += 5;
      this.score += 5;
      this.addText('BOS KALAH! +5 💰', CX, this.targetY + 20, '#ffd23f', 28);
    } else {
      this.score += 3;
    }
  }

  private addText(text: string, x: number, y: number, color: string, size: number) {
    // Jaga area target (Y: 120..420) agar selalu bersih dan tidak terhalang teks!
    let safeY = y;
    if (safeY < 430 && safeY > 110) {
      safeY = 440;
    }
    // Bergerak turun menjauh dari target dan memudar dengan cepat
    this.particles.push({ x, y: safeY, vx: 0, vy: 25, life: 0.65, max: 0.65, size: Math.min(size, 24), color, kind: 'text', rot: 0, vr: 0, g: 0, text });
  }

  // ---------- loop ----------
  private loop = (now: number) => {
    if (!this.active) return;
    // 60 FPS during play (also on 120 Hz displays); the covered menu needs
    // only a few frames. Never spend RAF time on an unfocused slide.
    const interval = this.state === 'idle' || this.state === 'over' ? 1000 / 15 : 1000 / 60;
    if (now - this.last >= interval - 1) {
      const dt = Math.min(0.033, (now - this.last) / 1000);
      this.last = now;
      this.update(dt);
      this.render();
    }
    this.raf = requestAnimationFrame(this.loop);
  };

  private stepProj(p: Proj): StepRes {
    // A floating star can be collected by a straight shot before it reaches the target.
    if (this.state === 'play' && this.star
      && Math.hypot(p.x - this.star.x, p.y - this.star.y) < this.star.r + this.weapon.half * 0.5) {
      this.hitStar();
      return { res: 'hit' };
    }
    const isBoss = this.level.boss;
    const bType = isBoss ? (this.level.style as BossType) : null;
    const px = p.x - CX;
    const py = p.y - this.targetY;
    const worldA = Math.atan2(py, px);
    const local = norm(worldA - this.rot);
    // Exact pixel-perfect raycast radius matching the cutout silhouette of the generated boss head!
    const effectiveR = bType ? getExactBossRadius(bType, local, this.level.radius) : this.level.radius;
    const dist = Math.hypot(px, py);
    if (dist > effectiveR + L + 4) return { res: 'none' };
    if (isSpecial(this.level.mode)) return this.stepSpecialProjectile(p);
    const w = this.weapon;
    const R = effectiveR;

    // Check collision against other stuck items (bullets/spikes)
    // IMPORTANT: only check items that are sufficiently close in angle to avoid false collisions!
    // Precise, fair collision check:
    // Only triggers failure if projectile hits an existing bullet or spike near the surface
    for (const it of [...this.items]) {
      if (it.type === 'coin') continue;
      const d = angDiff(local, it.angle);
      // Tangential angular clearance threshold
      const itemR = bType ? getExactBossRadius(bType, it.angle, this.level.radius) : this.level.radius;

      if (it.type === 'bullet' || it.type === 'old') {
        const sc = it.scale ?? 1;
        const totalWeaponLen = it.type === 'old' ? BLEN : (getWeapon(it.w || 'pistol').stick + 12);
        const stickLen = (totalWeaponLen * 0.5) * sc; // hanya terlihat setengah peluru di luar target
        const otherHalf = (it.type === 'old' ? 4.5 : getWeapon(it.w || 'pistol').half) * sc;
        const myHalf = w.half * (1 + (p.big ?? 0) * 0.3);
        const contactArc = (myHalf + otherHalf) / Math.max(50, itemR);

        // Check if projectile is in the collision arc and depth of stuck bullet
        if (d < contactArc && dist <= itemR + stickLen && dist >= itemR - 8) {
          if (it.type === 'old' && (w.pierceOld || p.big === 2) && !p.pierced) {
            p.pierced = 1;
            this.items = this.items.filter((x) => x !== it);
            const wa = it.angle + this.rot;
            const pos = this.worldPos(it.angle, itemR + 15);
            this.flyers.push({ x: pos.x, y: pos.y, vx: rand(-250, 250), vy: -350, rot: wa - Math.PI / 2, vr: rand(-20, 20), kind: 'old' });
            this.addText('🧲 TEMBUS!', pos.x, pos.y - 20, '#7dd3fc', 22);
            sfx2.metal();
            continue;
          }
          return { res: 'fail', spike: false };
        }
      } else if (it.type === 'spike') {
        if (this.spikeOffT > 0 || w.phaseSpikes) continue;
        const myHalf = w.half * (1 + (p.big ?? 0) * 0.3);
        const spikeArc = (myHalf + 9 * SPIKE_SCALE) / Math.max(50, itemR);

        // Check if projectile hits the spike protruding from boss head
        if (d < spikeArc && dist <= itemR + SPIKE_LEN * SPIKE_SCALE && dist >= itemR - 4) {
          return { res: 'fail', spike: true };
        }
      }
    }
    if (dist <= R + 36) {
      for (const it of [...this.items]) {
        if (it.type !== 'coin' && it.type !== 'diamond_chest') continue;
        const targetR = bType ? getExactBossRadius(bType, it.angle, this.level.radius) : this.level.radius;
        const cp = this.worldPos(it.angle, it.type === 'coin' ? targetR + 18 : targetR + 4);
        const hitDistance = Math.hypot(p.x - cp.x, p.y - cp.y);

        if (it.type === 'coin') {
          if (hitDistance < w.coinRadius + 8) this.collectCoin(it);
        } else if (it.type === 'diamond_chest') {
          if (hitDistance < w.coinRadius + 12) {
            if ((it.hits || 0) < 1) {
              this.hitDiamond(it);
            } else {
              this.collectDiamond(it);
            }
          }
        }
      }
    }
    if (dist <= R) return { res: 'stick', local };
    return { res: 'none' };
  }

  /** Each projectile is consumed on its first rock/coin/chest collision. */
  private stepSpecialProjectile(p: Proj): StepRes {
    const mode = this.level.mode;
    const ty = this.targetY;
    if (mode === 'treasure') {
      // Same open, coin-filled chest as the 10-second Diamond Breaker round.
      if (!this.chest || Math.abs(p.x - CX) > 97 || p.y < ty - 90 || p.y > ty + 88) return { res: 'none' };
      const power = Math.max(1, this.weapon.stats.power + (p.big ?? 0) * 2);
      this.chest.hit(power);
      const reward = Math.max(1, Math.round(power * 0.48 + rand(0, 1))) * (this.treasureBuff === 'giant' ? 2 : 1);
      // The reward is not credited on impact: it physically erupts from the
      // chest, bounces on the floor, then reaches the counter in small steps.
      this.treasureCoins.push(...throwTreasureCoins(p.x, ty, reward));
      // Embedded rounds move with the rattling chest, not with the screen.
      const len = this.weapon.stick + EMBED;
      const embedded = this.makeEmbeddedShot(p, p.x - CX, 68 - len * 0.5, Math.PI / 2);
      // A new hit in the same spot knocks the previous round loose instead of
      // stacking dozens of identical sprites into one blinding column.
      for (let i = this.chestBullets.length - 1; i >= 0; i--) {
        if (Math.abs(this.chestBullets[i].x - embedded.x) < Math.max(14, this.weapon.half * 2.5)) {
          this.dislodgeChestShot(this.chestBullets.splice(i, 1)[0]);
        }
      }
      this.chestBullets.push(embedded);
      if (this.chestBullets.length > 18) this.dislodgeChestShot(this.chestBullets.shift()!);
      this.specialImpact(p.x, p.y, 'gold');
      this.burstSpecial(p.x, p.y, 'gold', 8);
      return { res: 'hit' };
    }

    const rock = this.rock;
    if (!rock) return { res: 'none' };
    const sc = this.level.radius / 196;
    const a = -this.rot;
    const dx = p.x - CX, dy = p.y - ty;
    const local = { x: (dx * Math.cos(a) - dy * Math.sin(a)) / sc, y: (dx * Math.sin(a) + dy * Math.cos(a)) / sc };

    if (mode === 'bonus') {
      // Gold rings rotate with the rock; collect a coin once, then consume the shot.
      const coin = this.bonusCoins.find(c => !c.taken && Math.hypot(local.x - Math.cos(c.angle) * c.radius, local.y - Math.sin(c.angle) * c.radius) < 16 + this.weapon.coinRadius * 0.35);
      if (coin) {
        coin.taken = true;
        const x = CX + Math.cos(coin.angle + this.rot) * coin.radius * sc;
        const y = ty + Math.sin(coin.angle + this.rot) * coin.radius * sc;
        this.coins += 2;
        this.score += 50;
        this.specialImpact(x, y, 'gold');
        this.burstSpecial(x, y, 'gold', 8);
        sfx.coin();
        if (this.bonusCoins.every(c => c.taken)) this.finishSpecialStage();
        return { res: 'hit' };
      }
    }

    const dmg = Math.round((4 + (this.weapon.points - 1) * 2 + (p.big ?? 0) * 2) * this.dmgMult);
    const splash = (mode === 'boulder' ? 43 : 32) + (this.weapon.explode ? 30 : 0);
    const projectileRadius = diamondCoreProjectileRadius(
      this.weapon.half * (1 + (p.big ?? 0) * 0.3),
      projectileSizeMultiplier(this.weapon.id, !!p.mini, !!p.giant), sc,
    );
    const hit = rock.hitAt(local, dmg, splash, projectileRadius);
    if (!hit) return { res: 'none' };
    if (hit.kind === 'diamond') {
      this.diamondPing = 1;
      // The core is collectible only in the designated boulder stage; the
      // bonus-rock round keeps its own ring-coin objective.
      if (mode !== 'boulder' || this.centerDiamondCollected) {
        this.specialImpact(p.x, p.y, 'diamond');
        this.burstSpecial(p.x, p.y, 'diamond', 8);
        sfx3.chime();
        return { res: 'hit' };
      }
      this.centerDiamondHits++;
      this.addText(`BERLIAN ${this.centerDiamondHits}/3`, p.x, p.y - 26, '#a5f3fc', 22);
      this.sink.light(p.x, p.y, 90 + this.centerDiamondHits * 20, '103,232,249', 0.35);
      this.specialImpact(p.x, p.y, 'diamond');
      this.burstSpecial(p.x, p.y, 'diamond', this.centerDiamondHits === 3 ? 28 : 10);
      sfx3.chime();
      if (this.centerDiamondHits >= 3) {
        this.centerDiamondCollected = true;
        this.diamondHoldUntil = this.time + 3.1; // let the flight + reward burst finish before the next stage
        this.events.onDiamondCollected?.(50, true, { x: p.x, y: p.y });
        this.addText('DIAMOND DIDAPAT! +50', p.x, p.y - 54, '#e0f7ff', 28);
        this.sink.light(p.x, p.y, 190, '210,240,255', 0.8);
        this.burstSpecial(p.x, p.y, 'diamond', 56);
        sfx4.shatter();
        sfx2.jackpot();
        const scattered = this.rock?.shatterAll() ?? [];
        if (scattered.length) this.detachRockCells(scattered);
        this.finishSpecialStage();
      }
      return { res: 'hit' };
    }
    this.level.hp = hit.remaining;
    this.score += 1 + hit.broken.length * 10;
    this.specialImpact(p.x, p.y, 'rock');
    this.hitStop = Math.max(this.hitStop, 0.018);
    this.shake = Math.max(this.shake, hit.broken.length ? 5 : 2);
    // Every round belongs to the exact cell it struck, including rounds that
    // break it immediately. Splash damage can knock off previously hit cells.
    const tip = 7 / sc;
    this.rockBullets.push(this.makeEmbeddedShot(p,
      local.x - Math.sin(this.rot) * tip, local.y - Math.cos(this.rot) * tip,
      Math.PI / 2 - this.rot, hit.struckId));
    if (hit.broken.length) {
      this.detachRockCells(hit.broken);
      for (const cell of hit.broken) {
        const x = CX + (cell.x * Math.cos(this.rot) - cell.y * Math.sin(this.rot)) * sc;
        const y = ty + (cell.x * Math.sin(this.rot) + cell.y * Math.cos(this.rot)) * sc;
        const outward = Math.atan2(y - ty, x - CX);
        for (let i = 0; i < 2; i++) {
          const speed = rand(130, 360);
          this.rockFragments.push({
            x, y, vx: Math.cos(outward) * speed + rand(-70, 70), vy: Math.sin(outward) * speed - rand(90, 170),
            rot: rand(0, TAU), vr: rand(-10, 10), size: rand(5, 12), seed: rand(0, 10), life: 1.3, max: 1.3,
          });
        }
        this.burstSpecial(x, y, 'rock', 3);
      }
      if (!isSlide23Weapon(this.weapon.id)) sfx4.shatter();
    } else if (!isSlide23Weapon(this.weapon.id)) sfx.hit();
    if (hit.remaining === 0 && mode === 'boulder') this.finishSpecialStage();
    return { res: 'hit' };
  }

  private dislodgeChestShot(shot: EmbeddedShot) {
    const side = shot.x < 0 ? -1 : 1;
    this.flyers.push({
      x: CX + shot.x, y: this.targetY + 15 + shot.y + BLEN / 2,
      vx: side * rand(100, 240), vy: rand(-160, 50), rot: 0, vr: side * rand(7, 14),
      kind: 'bullet', w: shot.w, hue: shot.hue,
    });
  }

  private makeEmbeddedShot(p: Proj, x: number, y: number, angle: number, cellId?: number): EmbeddedShot {
    return {
      x, y, angle, cellId, age: 0, w: this.weapon.id, big: p.big ?? 0, tint: p.tint,
      hue: p.hue ?? (this.weapon.id === 'firework' ? gunState.rocketHue : this.weapon.id === 'yoyo' ? gunState.yoyoHue : undefined),
      flash: this.weapon.id === 'firework' || this.weapon.id === 'yoyo' || this.weapon.id === 'diamond' || this.weapon.id === 'bazooka' ? 1 : undefined,
      scale: (1 + (p.big ?? 0) * 0.3) * projectileSizeMultiplier(this.weapon.id, !!p.mini, !!p.giant),
    };
  }

  private detachRockCells(cells: BrokenRockCell[]) {
    const ids = new Set(cells.map(cell => cell.id));
    const bullets = new Map<number, EmbeddedShot[]>();
    this.rockBullets = this.rockBullets.filter(shot => {
      if (shot.cellId === undefined || !ids.has(shot.cellId)) return true;
      const group = bullets.get(shot.cellId) ?? [];
      group.push(shot);
      bullets.set(shot.cellId, group);
      return false;
    });
    const sc = this.level.radius / 196;
    const rot = this.rot;
    for (const cell of cells) {
      const x = CX + (cell.x * Math.cos(rot) - cell.y * Math.sin(rot)) * sc;
      const y = this.targetY - this.bump * 9 + (cell.x * Math.sin(rot) + cell.y * Math.cos(rot)) * sc;
      const outward = Math.atan2(y - this.targetY, x - CX);
      const speed = rand(120, 290);
      this.fallenCells.push({
        id: cell.id, cx: cell.x, cy: cell.y, x, y,
        vx: Math.cos(outward) * speed + rand(-55, 55),
        vy: Math.sin(outward) * speed - rand(140, 230),
        rot, vr: rand(-7, 7), life: 1.5, bullets: bullets.get(cell.id) ?? [],
      });
    }
  }

  /** Keep the normal weapon's signature hit effect, with the correct material palette. */
  private specialImpact(x: number, y: number, material: 'rock' | 'diamond' | 'gold') {
    const w = this.weapon;
    const fx = FX[w.id];
    const dx = x - CX, dy = y - this.targetY;
    const dist = Math.hypot(dx, dy) || 1;
    const chips = material === 'rock' ? ['#aab6c6', '#627388', '#e1ebf7']
      : material === 'diamond' ? ['#a5f3fc', '#67e8f9', '#e0f2fe']
        : ['#fbbf24', '#fde68a', '#a16207'];
    const s1Special = this.setOneLive && this.s1Last ? this.s1Last : null;
    if (s1Special) {
      const theta = Math.atan2(dy, dx);
      impactSetOne(this.s1, s1Special, x, y, theta, this.s1Hooks(), (n) => setOneSfx.play(n));
    }
    this.slide2Impact(x, y);
    if (w.id !== 'firework' && w.id !== 'yoyo' && w.id !== 'keris' && w.id !== 'diamond' && w.id !== 'bazooka'
      && !s1Special) {
      spawnImpact(this.sink, fx, w, x, y, dx / dist, dy / dist, chips);
    }
    if (w.id === 'yoyo') {
      spawnYoyoStickBurst(this.getYoyoState(), x, y, gunState.yoyoHue, CX, GUN_Y - 10);
    }
    if (w.id === 'keris') {
      spawnKerisImpact(this.getKerisState(), x, y, CX, GUN_Y - 6);
    }
    if (w.id === 'diamond') {
      spawnDiamondStickBurst(this.getDiamondState(), x, y, 1);
    }
    if (w.id === 'bazooka') {
      this.getBazookaState().onHit(x, y, 1.05);
    }
    this.hitStop = Math.max(this.hitStop, fx.hitstop);
    this.camY -= fx.kick;
    this.bump = Math.max(this.bump, material === 'rock' ? 0.55 : 0.2);
    this.shake = Math.max(this.shake, 3 + fx.kick * 0.8);
    if (fx.tint) {
      this.tintA = Math.max(this.tintA, fx.tint);
      this.tintRgb = fx.light;
    }
    if (isSlide23Weapon(w.id) && !(w.id === 'blackhole' && this.slide2Void)) {
      const hitIdx = (this.perkCount = (this.perkCount || 0) + 1) - 1;
      if (w.id === 'yoyo') slide23Sfx.hit('yoyo-spin', 0);
      if (w.id === 'firework') fireworkSfx.hit(hitIdx);
      else slide23Sfx.hit(w.id, hitIdx);
    } else if (s1Special) {
      // Slide-7's impact recipe already played its own hit voice.
    } else if (HIT_SFX[w.id]) {
      HIT_SFX[w.id]!();
    } else if (w.energy && !w.slow && !w.pullCoins) {
      sfx.zap();
    }
    // Reuse the weapon's normal-stage signature effects without importing
    // classic-target perks (which would alter special-stage coin accounting).
    if (w.explode) this.explodeAt(x, y, w.id === 'bazooka' ? 1.3 : w.id === 'bamboo' ? 1.2 : 1, w.explodeFx ?? 'fire');
    if (w.id === 'cricket') {
      this.particles.push({ x, y, vx: 0, vy: 0, life: 0.5, max: 0.5, size: 180, color: '#7cc8ff', kind: 'ring', rot: 0, vr: 0, g: 0 });
      this.shake = Math.max(this.shake, 12);
    }
    if (w.id === 'storm') this.sink.push({ x, y: -20, tx: x, ty: y, vx: 0, vy: 0, life: 0.3, max: 0.3, size: 4, color: '#dbeafe', kind: 'bolt', rot: 0, vr: 0, g: 0 });
    if (w.id === 'meteor') this.sink.push({ x: x - 160, y: -40, tx: x, ty: y, vx: 0, vy: 0, life: 0.15, max: 0.15, size: 5, color: '#fb923c', kind: 'bolt', rot: 0, vr: 0, g: 0 });
    // Match the normal stage's weapon-specific flourish as well as its shared
    // impact profile. Only visual effects go here: chest coins still need to
    // fly to the counter, and obstacle perks must not invent classic targets.
    if (w.burn || w.id === 'dragon') for (let i = 0; i < 14; i++) {
      this.sink.push({ x: x + rand(-10, 10), y, vx: rand(-120, 120), vy: rand(-200, 40), life: rand(0.3, 0.6), max: 0.6,
        size: rand(5, 10), color: pick(['255,200,80', '255,120,30', '255,60,20']), kind: 'glow', rot: 0, vr: 0, g: -200 });
    }
    if (w.confetti) for (let i = 0; i < 28; i++) {
      this.sink.push({ x, y, vx: rand(-340, 340), vy: rand(-370, -80), life: rand(0.8, 1.4), max: 1.4,
        size: rand(3, 6), color: pick(['#f43f5e', '#facc15', '#22d3ee', '#a855f7', '#4ade80', '#fb923c']),
        kind: 'chip', rot: rand(0, TAU), vr: rand(-25, 25), g: 350 });
    }
    if (w.rope && w.id !== 'yoyo') this.sink.push({ x, y, vx: 0, vy: 0, life: 0.45, max: 0.45, size: 70, color: '#a5f3fc', kind: 'ring', rot: 0, vr: 0, g: 0 });
    if (w.notes) {
      sfx3.note(this.perkCount++ % 10);
      for (let i = 0; i < 3; i++) this.sink.push({ x: x + rand(-20, 20), y, vx: rand(-60, 60), vy: rand(-160, -80),
        life: 1.1, max: 1.1, size: 18, color: pick(['#fde68a', '#fca5a5', '#a5f3fc', '#bbf7d0']), kind: 'text',
        rot: 0, vr: 0, g: 0, text: pick(['♪', '♫', '♬']) });
    }
    if (w.id === 'fish') sfx.splash();
    if (material === 'rock' && w.slow) {
      const water = w.slowStyle === 'water' || w.id === 'soaker';
      const honey = w.slowStyle === 'honey';
      if (this.slowT <= 0) this.addText(w.slowText ?? '❄ BEKU!', x, y + 50,
        honey ? '#ffd56c' : water ? '#93c5fd' : '#bff1ff', 22);
      this.applySlow(w.slowTime ?? 1.3, w.slowFactor ?? 0.3, w.slowRgb ?? '170,230,255',
        honey ? 'honey' : water ? 'water' : 'ice');
      if (w.id !== 'soaker' && w.id !== 'honey') for (let i = 0; i < 10; i++) {
        const a = rand(0, TAU), speed = rand(60, 260);
        this.particles.push({ x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, life: rand(0.4, 0.8), max: 0.8,
          size: rand(2, 4), color: pick(water ? ['#ffffff', '#93c5fd', '#3b82f6'] : ['#ffffff', '#d6f6ff', '#9be7ff']),
          kind: 'chip', rot: rand(0, TAU), vr: rand(-10, 10), g: water ? 900 : 300 });
      }
    }
  }

  /**
   * MINI/GIANT for a round that an imported layer paints itself.
   *
   * Slide 1 scales its own shot art inside the shared projectile renderer, so
   * the treasure star's size card never reached a slide-7/9/11/2 round: the
   * entry hole it made on the rock or the chest was small (`EmbeddedShot.scale`
   * always carried the buff) while the round in flight stayed full size, which
   * is why the buff looked like it did nothing at all. The carried round is
   * drawn through the same multiplier here.
   */
  private drawCarriedRound(c: CanvasRenderingContext2D, p: Proj, paint: () => void) {
    const k = projectileSizeMultiplier(this.weapon.id, !!p.mini, !!p.giant);
    if (k === 1) {
      paint();
      return;
    }
    c.save();
    c.translate(p.x, p.y);
    c.scale(k, k);
    c.translate(-p.x, -p.y);
    paint();
    c.restore();
  }

  private drawEmbeddedShot(c: CanvasRenderingContext2D, shot: EmbeddedShot, x: number, y: number, surfaceOffset = 0) {
    c.save();
    c.translate(x, y);
    c.rotate(shot.angle - Math.PI / 2);
    // The rock stores the impact 7px inside its cell; the chest stores it
    // half a bullet inside the lid. Align honey, peeled fruit, hornet,
    // energy orbs and celestial star art without moving the hitboxes.
    const surfaceAligned = shot.w === 'honey' || shot.w === 'banana'
      || shot.w === 'bee' || shot.w === 'moonbeam' || shot.w === 'plasma' || shot.w === 'blackhole'
      || shot.w === 'xeno' || shot.w === 'dora' || shot.w === 'pred';
    if (surfaceAligned) c.translate(0, surfaceOffset - (getWeapon(shot.w).stick + EMBED)
      * (shot.w === 'moonbeam' ? 0.53 : 0.5));
    if (shot.w === 'snowball') c.translate(0, surfaceOffset);
    if (shot.w === 'firework') {
      c.translate(0, surfaceOffset - FIREWORK_EMBED_NOSE);
      gunState.rocketHue = shot.hue ?? 340;
      gunState.rocketFlash = shot.flash ?? 0;
    }
    if (shot.w === 'yoyo') {
      c.translate(0, surfaceOffset + 4);
      gunState.yoyoHue = shot.hue ?? 0;
      gunState.yoyoFlash = shot.flash ?? 0;
    }
    if (shot.w === 'diamond') {
      c.translate(0, surfaceOffset + 9);
      gunState.diamondFlash = shot.flash ?? 0;
      gunState.diamondSeed = (shot.x + shot.y) * 0.1;
    }
    if (shot.w === 'bazooka') {
      c.translate(0, surfaceOffset - 5);
      gunState.bazookaHue = shot.hue ?? 45;
      gunState.bazookaFlash = shot.flash ?? 0;
      gunState.bazookaSeed = (shot.x + shot.y) * 0.1;
      gunState.bazookaBite = Math.max(0.38, 1 - shot.age * 0.8);
    }
    if (shot.w === 'gauntlet_cannon') {
      c.translate(0, surfaceOffset - 5.5);
    }
    if (shot.w === 'magnet') {
      c.translate(0, surfaceOffset - 4);
    }
    c.scale(shot.scale, shot.scale);
    const oldBig = gunState.bigShot, oldTint = gunState.tint;
    gunState.bigShot = shot.big;
    if (shot.tint) gunState.tint = shot.tint;
    // ---- specialized stuck rendering (game-3: drawAirVortex, drawPlasmaScar) ----
    const seed = (shot.x * 7 + shot.y * 3) % 1000;
    const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
    const glowAt = (gx: number, gy: number, gr: number, gcolor: string, ga: number) => {
      c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = Math.min(1, ga); c.fillStyle = gcolor; c.beginPath(); c.arc(gx, gy, gr, 0, TAU); c.fill(); c.restore();
    };
    const rgbaH = (h: string, a: number) => { const n = parseInt(h.slice(1), 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`; };
    let skipProj = false;
    if (shot.w === 'xeno') {
      // game-3: acid stuck NOT drawn on rim (only drips in update loop)
      skipProj = true;
    } else if (shot.w === 'dora') {
      // game-3 drawAirVortex: rotating torus ring, curls, impact star
      skipProj = true;
      const pop = 1 + Math.max(0, 0.6 - shot.age) * 1.2;
      c.save();
      c.translate(10, 0);
      c.scale(pop, pop);
      c.globalCompositeOperation = 'lighter';
      glowAt(6, 0, 30, '#9fdcff', 0.35);
      c.globalCompositeOperation = 'source-over';
      c.lineCap = 'round';
      for (let k = 0; k < 3; k++) {
        const ph = this.time * 6 + k * 2.1 + seed;
        const ry = 16 - k * 3, rxx = 5 + Math.abs(Math.sin(ph)) * 3;
        c.strokeStyle = `rgba(255,255,255,${0.85 - k * 0.22})`;
        c.lineWidth = 2.5 - k * 0.6;
        c.beginPath(); c.ellipse(4 + k * 6, 0, rxx, ry, 0, 0, TAU); c.stroke();
      }
      for (let i = 0; i < 4; i++) {
        const a = this.time * 5 + (i / 4) * TAU + seed;
        const px = 8 + Math.cos(a) * 6, py = Math.sin(a) * 17;
        c.strokeStyle = 'rgba(200,235,255,0.8)'; c.lineWidth = 1.6;
        c.beginPath(); c.arc(px, py, 4, a, a + 3.6); c.stroke();
      }
      const sa = Math.max(0, 1 - shot.age / 0.5);
      if (sa > 0) {
        c.fillStyle = rgbaH('#fff4a0', sa);
        c.beginPath();
        for (let i = 0; i < 16; i++) { const an = (i / 16) * TAU; const r = i % 2 ? 6 : 16 * (1 + shot.age * 2); i ? c.lineTo(-4 + Math.cos(an) * r, Math.sin(an) * r) : c.moveTo(-4 + r, 0); }
        c.closePath(); c.fill();
      }
      c.restore();
    } else if (shot.w === 'pred') {
      // game-3 drawPlasmaScar: charred spur, molten veins, plasma residue, arcs
      skipProj = true;
      const hot = clamp01(1 - shot.age / 6);
      const pop = 1 + Math.max(0, 0.4 - shot.age) * 1.5;
      c.save();
      c.scale(pop, pop);
      c.beginPath(); c.moveTo(-6, -9); c.lineTo(14, -6); c.lineTo(26, -1); c.lineTo(28, 1); c.lineTo(16, 6); c.lineTo(-6, 9); c.closePath();
      const sg = c.createLinearGradient(-6, 0, 28, 0);
      sg.addColorStop(0, hot > 0.3 ? '#3a1a08' : '#1a110a'); sg.addColorStop(1, '#0a0806');
      c.fillStyle = sg; c.fill();
      c.globalCompositeOperation = 'lighter';
      c.strokeStyle = rgbaH('#ff7a20', 0.5 + hot * 0.5); c.lineWidth = 1.4; c.lineCap = 'round';
      c.beginPath(); c.moveTo(-4, 0); c.lineTo(6, -2); c.lineTo(14, 1); c.lineTo(22, 0); c.stroke();
      c.strokeStyle = rgbaH('#ffe0a0', hot); c.lineWidth = 0.7; c.stroke();
      glowAt(2, 0, 14 + hot * 16, '#ff7a20', 0.3 + hot * 0.6);
      const pulse = 0.6 + 0.4 * Math.sin(this.time * 14 + seed);
      glowAt(0, 0, 22, '#6fd3ff', (0.2 + hot * 0.5) * pulse);
      glowAt(0, 0, 8, '#ffffff', hot * pulse);
      if (Math.random() < 0.4 + hot * 0.5) {
        c.beginPath(); let ax = 0, ay = 0; c.moveTo(ax, ay);
        const a = rand(0, TAU);
        for (let k = 0; k < 4; k++) { ax += Math.cos(a) * 5 + rand(-4, 4); ay += Math.sin(a) * 5 + rand(-4, 4); c.lineTo(ax, ay); }
        c.strokeStyle = rgbaH('#6fd3ff', 0.8); c.lineWidth = 2; c.stroke();
        c.strokeStyle = '#ffffff'; c.lineWidth = 0.8; c.stroke();
      }
      c.globalCompositeOperation = 'source-over';
      c.restore();
    }
    if (!skipProj) this.drawProj(c, shot.w, undefined, shot.age, shot.w === 'snowball' || surfaceAligned || shot.w === 'firework' || shot.w === 'yoyo' || shot.w === 'diamond' || shot.w === 'bazooka' || shot.w === 'gauntlet_cannon' || shot.w === 'magnet');
    gunState.bigShot = oldBig;
    gunState.tint = oldTint;
    gunState.rocketFlash = 0;
    gunState.yoyoFlash = 0;
    gunState.diamondFlash = 0;
    gunState.diamondSeed = 0;
    gunState.bazookaFlash = 0;
    c.restore();
  }

  private burstSpecial(x: number, y: number, type: 'rock' | 'diamond' | 'gold', count: number) {
    const palette = type === 'gold' ? ['#ffe99e', '#ffc83d', '#ffffff']
      : type === 'diamond' ? ['#a5f3fc', '#ffffff', '#67e8f9'] : ['#aab6c6', '#6a7b91', '#e1ebf7'];
    for (let i = 0; i < count; i++) {
      const a = rand(0, TAU), speed = rand(100, 320);
      this.particles.push({
        x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed - 80,
        life: rand(0.35, 0.7), max: 0.7, size: rand(2, 5), color: pick(palette),
        kind: type === 'rock' ? 'shard' : 'star', rot: rand(0, TAU), vr: rand(-12, 12), g: type === 'rock' ? 1000 : 280,
      });
    }
  }

  private payStageReward() {
    if (this.stageRewardPaid || this.state !== 'clear' || !isSpecial(this.level.mode)) return;
    // A chest hit isn't a payout until every coin has bounced and reached the HUD.
    if (this.level.mode === 'treasure' && this.treasureCoins.length) return;
    this.stageRewardPaid = true;
    const earned = this.coins - this.stageStartCoins;
    if (this.level.mode === 'treasure') {
      this.addText(`🧰 HARTA +${earned}!`, CX, this.targetY + 185, '#fde68a', 26);
      this.stateT = 0; // Show the final amount before loading the next level.
    }
    // Treasure coins were deposited one by one on arrival. Stage rewards for
    // stone/bonus (or a game without onTreasureCoin) are still paid here.
    const unbanked = this.level.mode === 'treasure' && this.events.onTreasureCoin ? 0 : earned;
    const diamondReward = this.level.mode === 'boulder' && this.centerDiamondCollected ? 50 : 0;
    if (this.events.onStageReward) {
      this.bankedCoins += unbanked;
      this.events.onStageReward(this.level.mode, this.level.n, unbanked, diamondReward);
    }
  }

  private finishSpecialStage() {
    if (this.state !== 'play' || !isSpecial(this.level.mode)) return;
    const mode = this.level.mode;
    this.state = 'clear';
    this.stateT = 0;
    this.projs = [];
    this.star = null;
    this.holding = false;
    this.choosingBuff = false;
    this.flashWhite = 0.42;
    this.shake = Math.max(this.shake, 8);
    if (mode === 'boulder') {
      this.coins += 3;
      this.score += 75;
      this.addText('BERLIAN BERSIH! +3 APEL', CX, this.targetY + 185, '#a5f3fc', 28);
    } else if (mode === 'bonus') {
      this.addText(`🪙 BONUS +${this.coins - this.stageStartCoins}!`, CX, this.targetY + 185, '#fde68a', 26);
    } else if (this.treasureCoins.length) {
      this.addText('🪙 KOIN BERTEBARAN!', CX, this.targetY + 185, '#fde68a', 26);
    }
    this.payStageReward();
    this.sink.light(CX, this.targetY, 250, mode === 'boulder' ? '125,230,255' : '255,213,74', 0.8);
    this.burstSpecial(CX, this.targetY, mode === 'boulder' ? 'diamond' : 'gold', 38);
    if (!this.setTwoVoice('clear')) sfx.clear(this.weapon?.id);
  }

  private updateTreasureShower(dt: number) {
    this.coinPulse = Math.max(0, this.coinPulse - dt * 5);
    if (!this.treasureCoins.length) return;
    const landed = advanceTreasureCoins(this.treasureCoins, dt, (x, y) => this.burstSpecial(x, y, 'gold', 3));
    if (landed > 0) {
      this.coins += landed;
      this.score += landed * 25;
      this.coinPulse = 1;
      this.sink.light(W - 28, 34, 58, '255,215,90', 0.18);
      this.burstSpecial(W - 28, 34, 'gold', Math.min(7, landed + 2));
      if (this.time - this.lastCoinSound > 0.08) {
        sfx.coin();
        this.lastCoinSound = this.time;
      }
      if (this.events.onTreasureCoin) {
        this.bankedCoins += landed;
        this.events.onTreasureCoin(landed);
      }
    }
    if (this.state === 'clear' && !this.treasureCoins.length) this.payStageReward();
  }

  private advanceReload(dt: number) {
    if (this.reloadT <= 0) return;
    this.reloadT = Math.max(0, this.reloadT - dt);
    if (this.reloadT > 0) return;
    // Special stages also refill their stage allowance; ordinary stages only
    // reload the snow hopper, never granting extra shots beyond their quota.
    if (isSpecial(this.level.mode) && this.ammoLeft === 0) this.ammoLeft = this.level.ammo * this.maxAmmoMult;
    if (this.weapon.id === 'snowball') this.snowLoaded = Math.min(SNOWBALL_MAG_SIZE, this.ammoLeft);
  }

  private update(dt: number) {
    // The stage clock and gun must stop while the player chooses a star upgrade.
    if (this.choosingBuff) return;
    this.rock?.update(dt);
    this.chest?.update(dt);
    this.diamondPing = Math.max(0, this.diamondPing - dt * 3);
    if (isSpecial(this.level.mode) && this.state === 'play') {
      this.stageTime = Math.max(0, this.stageTime - dt);
      if (this.stageTime === 0) {
        if (this.level.mode === 'boulder') {
          this.state = 'fail';
          this.stateT = 0;
          this.projs = [];
          this.holding = false;
          this.addText('WAKTU HABIS!', CX, this.targetY + 185, '#fb7185', 26);
          if (!this.setTwoVoice('fail')) sfx.fail(this.weapon?.id);
        } else this.finishSpecialStage();
      }
    }
    this.advanceReload(dt);
    this.timeScale += (1 - this.timeScale) * Math.min(1, dt * 2.5);
    let s = dt * this.timeScale;
    if (this.hitStop > 0) {
      this.hitStop -= dt;
      s *= 0.06;
    }
    this.camY *= Math.exp(-dt * 11);
    this.rt += dt;
    // ketapel: creak when starting to draw the band
    if (this.weapon.id === 'slingshot' && !this.stretchPlayed && this.rt - this.lastShotRT > 0.16) {
      this.stretchPlayed = true;
      if (this.state === 'play' && this.ammoLeft > 0) sfx4.stretch();
    }
    // charge blaster
    if (this.charging) {
      if (this.state !== 'play') this.charging = false;
      this.chargeT += dt;
      const stage = this.chargeT >= 1 ? 2 : this.chargeT >= 0.35 ? 1 : 0;
        if (stage > this.chargeStage) {
          this.chargeStage = stage;
          if (this.weapon.id === 'pred') sfx6.predCharge(stage === 2 ? 1 : 0.65);
          else if (stage === 1) sfx4.chargeStart();
          else sfx4.chargeFull();
        for (const ox of this.gunOffsets) this.sink.push({ x: CX + ox, y: GUN_Y + 2, vx: 0, vy: 0, life: 0.3, max: 0.3, size: stage === 2 ? 90 : 50, color: stage === 2 ? '254,240,138' : '125,211,252', kind: 'shock', rot: 0, vr: 0, g: 0 });
      }
      for (const ox of this.gunOffsets) {
        if (Math.random() < 0.6) {
          const a = rand(0, TAU);
          const d = rand(40, 70);
          this.sink.push({ x: CX + ox + Math.cos(a) * d, y: GUN_Y + 2 + Math.sin(a) * d, vx: -Math.cos(a) * d * 4, vy: -Math.sin(a) * d * 4, life: 0.25, max: 0.25, size: rand(2, 4), color: stage === 2 ? '254,240,138' : '125,211,252', kind: 'glow', rot: 0, vr: 0, g: 0 });
        }
        this.sink.light(CX + ox, GUN_Y, 60 + Math.min(1, this.chargeT) * 120, stage === 2 ? '254,240,138' : '125,211,252', 0.05);
      }
      // Predator: ions spiral into the shoulder-caster core, plus crackling
      // arcs — the slide-7 charge telegraph (game-3 startCharge block).
      if (this.weapon.id === 'pred') {
        const coreY = GUN_Y - 72;
        for (const ox of this.gunOffsets) {
          if (Math.random() < 0.9) {
            const a = rand(0, TAU);
            const d = rand(40, 90);
            this.sink.push({
              x: CX + ox + Math.cos(a) * d, y: coreY + Math.sin(a) * d,
              vx: -Math.cos(a) * d * 4, vy: -Math.sin(a) * d * 4,
              life: 0.25, max: 0.25, size: 1.4, color: Math.random() < 0.5 ? '#ffffff' : '111,211,255',
              kind: 'spark', rot: 0, vr: 0, g: 0,
            });
          }
          if (Math.random() < Math.min(1, this.chargeT) * 0.5) {
            const a = rand(0, TAU);
            this.sink.push({
              x: CX + ox, y: coreY, vx: Math.cos(a) * rand(14, 34), vy: Math.sin(a) * rand(14, 34),
              life: 0.08, max: 0.08, size: 2, color: '111,211,255', kind: 'bolt', rot: 0, vr: 0, g: 0,
            });
          }
          this.sink.light(CX + ox, coreY, 40 + Math.min(1, this.chargeT) * 90, '111,211,255', 0.12);
        }
      }
      if (stage === 2 && Math.random() < 0.15) sfx4.chargeHum(2);
    }
    gunState.charge = this.charging ? Math.min(1, this.chargeT) : Math.max(0, gunState.charge - dt * 3);
    this.tintA = Math.max(0, this.tintA - dt * 1.6);
    this.comboPop = Math.max(0, this.comboPop - dt * 4);
    // Tekken-style healthbar delayed red drain effect
    if (this.bossHpRed > this.bossHp) {
      this.bossHpRed = Math.max(this.bossHp, this.bossHpRed - dt * 35);
    }
    for (let i = this.lights.length - 1; i >= 0; i--) {
      this.lights[i].life -= dt;
      if (this.lights[i].life <= 0) this.lights.splice(i, 1);
    }
    this.time += s;
    // Real-time, staggered coin arrivals continue during the treasure-clear
    // celebration, but freeze while the star's choice modal is open.
    this.updateTreasureShower(dt);

    if (this.state !== 'clear') {
      this.levelTime += s;
      const v = this.state === 'idle' ? 1.1 : this.level.mode === 'bonus' ? this.level.dir * 1.05
        : this.level.mode === 'treasure' ? 0 : PATTERNS[this.level.pattern](this.levelTime, this.level.base, this.level.dir);
      const f0 = this.slowF;
      const slowF = this.slowT > 0 ? f0 + (1 - f0) * Math.max(0, (0.3 - this.slowT) / 0.3) : 1;
      const aimF = this.aiming ? 0.28 : 1;
      // Faster, readable boss rhythms: Knight reverses every 7s, Oni every 5s,
      // while Cyborg and Pirate reverse smoothly on their own distinct cycles.
      if (this.level.boss) this.rot += bossRotationSpeed(this.level.style as BossType, this.levelTime) * s * slowF * aimF;
      else this.rot += v * s * slowF * aimF;
      this.slowT = Math.max(0, this.slowT - s);
    }
    if (this.aiming) {
      this.aimT += dt;
      if (this.state !== 'play') this.aiming = false;
    }
    // minigun spin
    if (this.weapon.spinup) {
      if (this.holding && this.state === 'play') this.spin = Math.min(1, this.spin + dt * 1.1);
      else this.spin = Math.max(0, this.spin - dt * 1.6);
      if (this.holding && this.spin > 0.25 && this.state === 'play') this.shoot();
    } else this.spin = 0;
    gunState.spin = this.spin;
    gunState.spinAngle += dt * (2 + this.spin * 40);
    // burn
    if (this.burnT > 0 && this.state === 'play') {
      this.burnT -= s;
      this.burnTick -= s;
      if (this.burnTick <= 0) {
        this.burnTick = 0.5;
        this.score += 1;
        sfx2.burn();
        const a = rand(0, TAU);
        const p = this.worldPos(a, this.level.radius * rand(0.3, 0.95));
        this.addText(`+1${this.weapon.burnIcon ?? '🔥'}`, p.x, p.y, '#ffb347', 16);
      }
      const isBee = this.weapon.burnIcon === '🐝';
      for (let i = 0; i < (isBee ? 1 : 2); i++) {
        const a = rand(0, TAU);
        const p = { x: CX + Math.cos(a) * this.level.radius * rand(0.2, 1), y: CY + Math.sin(a) * this.level.radius * rand(0.2, 1) };
        if (isBee) this.particles.push({ x: p.x, y: p.y, vx: rand(-120, 120), vy: rand(-120, 120), life: 0.4, max: 0.4, size: 3, color: pick(['#facc15', '#111111']), kind: 'chip', rot: 0, vr: 30, g: 0 });
        else this.particles.push({ x: p.x, y: p.y, vx: rand(-20, 20), vy: rand(-90, -40), life: rand(0.3, 0.6), max: 0.6, size: rand(4, 8), color: pick(['255,200,80', '255,120,30', '255,60,20']), kind: 'glow', rot: 0, vr: 0, g: -60 });
      }
    }
    this.spikeOffT = Math.max(0, this.spikeOffT - s);
    this.glitchT = Math.max(0, this.glitchT - dt);
    // pushed spikes slide
    for (const it of this.items) {
      if (it.vel) {
        it.angle = norm(it.angle + it.vel * s);
        it.vel *= Math.exp(-s * 6);
        if (Math.abs(it.vel) < 0.02) it.vel = 0;
      }
      if (it.w === 'seed' && !it.harvested && it.age > 1.7 && this.state === 'play') {
        it.harvested = true;
        this.coins++;
        sfx2.bloom();
        const p = this.worldPos(it.angle, this.level.radius + 30);
        this.addText('🌸 +1 💰', p.x, p.y, '#f9a8d4', 18);
      }
    }
    // grow ray
    if (this.targetR && this.state !== 'clear') {
      this.level.radius += (this.targetR - this.level.radius) * Math.min(1, dt * 8);
    }
    for (let i = this.portals.length - 1; i >= 0; i--) {
      this.portals[i].life -= dt;
      if (this.portals[i].life <= 0) this.portals.splice(i, 1);
    }

    // Star flies across the open lane between the target and the upright gun.
    if (this.state === 'play' && allowsStarPowerups(this.level) && !this.star) {
      this.starTimer -= dt;
      if (this.starTimer <= 0) {
        this.starTimer = 14 + Math.random() * 8;
        this.spawnFloatingStar();
      }
    }
    if (this.star) {
      this.star.age += dt;
      this.star.life -= dt;
      this.star.x += this.star.vx * dt;
      this.star.y = this.star.baseY + Math.sin(this.star.age * 3.2) * 6;
      if (this.star.life <= 0 || this.star.x < -55 || this.star.x > W + 55) this.star = null;
    }

    // Rounds retain the local position/orientation of their exact rock cell;
    // detached cells and every round trapped in them share one rigid transform.
    for (const shot of this.rockBullets) shot.age += s;
    for (const shot of this.chestBullets) shot.age += s;
    for (let i = this.fallenCells.length - 1; i >= 0; i--) {
      const f = this.fallenCells[i];
      f.vy += 1500 * s;
      f.x += f.vx * s;
      f.y += f.vy * s;
      f.rot += f.vr * s;
      f.life -= dt;
      for (const shot of f.bullets) shot.age += s;
      if (f.life <= 0 || f.y > H + 90) this.fallenCells.splice(i, 1);
    }

    // ═══════ FRAGMEN BATU ═══════
    for (let i = this.rockFragments.length - 1; i >= 0; i--) {
      const f = this.rockFragments[i];
      f.vy += 1500 * s;
      f.x += f.vx * s;
      f.y += f.vy * s;
      f.rot += f.vr * s;
      f.life -= dt;
      if (f.life <= 0 || f.y > H + 200) this.rockFragments.splice(i, 1);
    }

    // ---------------- BOSS SHOOTING ATTACK MECHANIC ----------------
    if (this.level.boss && this.state === 'play') {
      this.bossShootTimer -= s;
      if (this.bossShootTimer <= 0) {
        const bDef = getBossDef(this.level.style);
        this.bossShootTimer = bossFireInterval(bDef.fireInterval, rand(-0.18, 0.22));
        const bType = this.level.style as BossType;
        // Boss launches projectile downward toward the player with aim spread
        const spawnY = this.targetY + this.level.radius * 0.8;
        const targetX = CX + rand(-60, 60);
        const dx = targetX - CX;
        const dy = (GUN_Y + 40) - spawnY;
        const dist = Math.hypot(dx, dy);
        // Boss shots travel 1.9x faster, but retain clear telegraphing and interceptable hitboxes.
        const spd = (160 + this.level.n * 3) * 1.9;
        this.bossProjs.push({
          x: CX,
          y: spawnY,
          vx: (dx / dist) * spd,
          vy: (dy / dist) * spd,
          rot: Math.atan2(dy, dx) - Math.PI / 2,
          type: bType,
        });
        // Attack SFX & alert cue
        if (bType === 'oni') sfx4.busterMid();
        else if (bType === 'cyborg') sfx2.railgun();
        else if (bType === 'pirate') sfx2.pirate();
        else sfx3.keris();
        // Crisp boss-specific firing flecks instead of a large halo around the boss.
        const bossRgb = bType === 'knight' ? '56,189,248' : bType === 'oni' ? '239,68,68' : bType === 'cyborg' ? '34,211,238' : '234,179,8';
        for (let k = 0; k < 5; k++) {
          this.particles.push({
            x: CX + rand(-12, 12), y: spawnY + rand(-8, 8),
            vx: rand(-95, 95), vy: rand(-70, 70), life: 0.16, max: 0.16,
            size: rand(2, 4), color: bossRgb, kind: bType === 'oni' ? 'glow' : 'spark',
            rot: 0, vr: 0, g: 0,
          });
        }
      }
    }

    // Update & step boss projectiles
    for (let i = this.bossProjs.length - 1; i >= 0; i--) {
      const bp = this.bossProjs[i];
      bp.x += bp.vx * s;
      bp.y += bp.vy * s;
      // Ujung proyektil selalu menghadap arah geraknya (ke arah pemain),
      // tidak berputar-putar di jalan.
      bp.rot = Math.atan2(bp.vy, bp.vx) - Math.PI / 2;

      // Api/jejak menyala mengekor di EKOR peluru (sisi berlawanan arah
      // gerak), bukan menempel di badan peluru.
      const spdH = Math.hypot(bp.vx, bp.vy) || 1;
      const dirx = bp.vx / spdH, diry = bp.vy / spdH;
      const tailX = bp.x - dirx * 44;
      const tailY = bp.y - diry * 44;
      if (Math.random() < 0.85) {
        // Tail material/color follows each boss rather than sharing orange fire.
        const trail = bp.type === 'knight'
          ? { color: '56,189,248', kind: 'spark' as const }
          : bp.type === 'oni'
          ? { color: '239,68,68', kind: 'glow' as const }
          : bp.type === 'cyborg'
          ? { color: '34,211,238', kind: 'spark' as const }
          : { color: '71,85,105', kind: 'smoke' as const };
        this.particles.push({
          x: tailX + rand(-7, 7),
          y: tailY + rand(-7, 7),
          vx: -dirx * rand(30, 90) + rand(-25, 25),
          vy: -diry * rand(30, 90) + rand(-25, 25),
          life: bp.type === 'pirate' ? 0.48 : 0.28,
          max: bp.type === 'pirate' ? 0.48 : 0.28,
          size: bp.type === 'pirate' ? rand(4, 7) : rand(2.5, 5),
          color: bp.type === 'pirate' ? 'rgba(71,85,105,' : trail.color,
          kind: trail.kind,
          rot: 0,
          vr: 0,
          g: 0,
        });
        if (bp.type === 'oni') {
          this.particles.push({
            x: tailX + rand(-5, 5),
            y: tailY + rand(-5, 5),
            vx: -dirx * rand(40, 110) + rand(-18, 18),
            vy: -diry * rand(40, 110) + rand(-18, 18),
            life: 0.22, max: 0.22, size: rand(4, 7.5),
            color: pick(['255,200,80', '255,120,30', '255,60,20']),
            kind: 'glow', rot: 0, vr: 0, g: 0,
          });
        } else if (bp.type === 'pirate' && Math.random() < 0.45) {
          this.particles.push({
            x: tailX + rand(-5, 5), y: tailY + rand(-5, 5),
            vx: -dirx * 35 + rand(-20, 20), vy: -diry * 35 + rand(-20, 20),
            life: 0.3, max: 0.3, size: rand(2, 3.5), color: '34,197,94',
            kind: 'spark', rot: 0, vr: 0, g: 0,
          });
        }
      }

      // 1. Collision with player's rising projectiles (Hitbox besar 40px karena ukuran proyektil 3x!)
      let intercepted = false;
      for (let j = this.projs.length - 1; j >= 0; j--) {
        const pp = this.projs[j];
        if (Math.hypot(pp.x - bp.x, pp.y - bp.y) < 42) {
          intercepted = true;
          this.projs.splice(j, 1);
          break;
        }
      }
      if (intercepted) {
        this.bossProjs.splice(i, 1);
        sfx.clang();
        sfx4.match();
        this.shake = Math.max(this.shake, 7);
        this.score += 2;
        // AMMO KEMBALI 1 KALO BERHASIL HANCURKAN SERANGAN BOS!
        this.ammoLeft = Math.min(this.level.ammo * this.maxAmmoMult, this.ammoLeft + 1);
        this.addText('💥 TANGKIS! +1 AMMO +2', bp.x, bp.y - 15, '#38bdf8', 22);
        this.sink.push({ x: bp.x, y: bp.y, vx: 0, vy: 0, life: 0.4, max: 0.4, size: 90, color: '#38bdf8', kind: 'shock', rot: 0, vr: 0, g: 0 });
        for (let k = 0; k < 12; k++) {
          this.particles.push({
            x: bp.x, y: bp.y, vx: rand(-200, 200), vy: rand(-200, 200), life: 0.3, max: 0.3, size: rand(2.5, 5), color: '#38bdf8', kind: 'spark', rot: 0, vr: 0, g: 300,
          });
        }
        continue;
      }

      // 2. Boss projectile damage: only knocks player weapon or grazes (no unfair sudden deaths!)
      if (bp.y >= GUN_Y - 15 && bp.y <= GUN_Y + 70 && this.gunOffsets.some(ox => Math.abs(bp.x - (CX + ox)) < 26)) {
        this.bossProjs.splice(i, 1);
        sfx.clang();
        this.shake = Math.max(this.shake, 8);
        this.recoil = 1.6;
        this.addText('SERANGAN BOS!', bp.x, GUN_Y - 20, '#ef4444', 20);
        this.sink.push({ x: bp.x, y: bp.y, vx: 0, vy: 0, life: 0.35, max: 0.35, size: 50, color: '#ef4444', kind: 'shock', rot: 0, vr: 0, g: 0 });
        break;
      }

      // Out of bounds
      if (bp.y > H + 50 || bp.x < -40 || bp.x > W + 40) {
        this.bossProjs.splice(i, 1);
      }
    }

    this.wheelScale += (1 - this.wheelScale) * Math.min(1, dt * 9);
    if (this.state === 'intro') {
      this.introT += dt;
      if (this.introT >= 0.5) this.state = 'play';
    }
    this.bannerT = Math.max(0, this.bannerT - dt);

    this.cooldown -= dt;
    if (this.weapon.auto && !this.weapon.spinup && this.holding && this.state === 'play') this.shoot();
    for (let i = this.beams.length - 1; i >= 0; i--) {
      this.beams[i].life -= dt;
      if (this.beams[i].life <= 0) this.beams.splice(i, 1);
    }
    const tw = this.weapon;
    for (const p of this.projs) {
      if (p.spawnDelay && p.spawnDelay > 0) continue;
      if (p.setElevenPending) {
        // Slide 11 releases some rounds a frame later (bursts, drones).
        const made = this.s11.takeShots();
        if (made.length) {
          p.setEleven = made[0];
          p.setElevenPending = false;
          p.y = made[0].y;
        } else if (this.strandCarrier(p)) continue;
      }
      if (p.s11Ghost) continue; // extra pellet of a burst gun: slide 11 fired it
      if (p.setEleven) {
        // Slide 11's round keeps its own frames; slide 1 decides where it is.
        this.s11.carry(p.setEleven, p.x, p.y, Math.atan2(p.vy, p.vx));
        continue;
      }
      if (p.setTwo) {
        // Slide 2's round keeps its own trail, sparks and smoke; slide 1 only
        // says where the round is.
        const s2id = this.setTwoId;
        if (s2id) {
          p.setTwo.age += dt;
          const fx = this.s2w;
          fx.cx = CX;
          fx.gunY = GUN_Y;
          fx.trail(s2id, p.x, p.y, p.setTwo);
        }
        continue;
      }
      if (p.setNinePending) {
        // Slide 9 releases some rounds later than the trigger (charged staffs,
        // drum bursts); hold the carrier still until its round exists.
        const made = this.s9.takeShots();
        if (made.length) {
          p.setNine = made[0];
          p.setNinePending = false;
          p.y = made[0].y;
        } else if (this.strandCarrier(p)) continue;
      }
      if (p.s9Ghost) continue; // extra pellet of a burst gun: slide 9 fired it
      if (p.setNine) {
        // Slide 9's round keeps its own frames (trail, sub-particles, spin);
        // slide 1 decides where it actually is.
        this.s9.carry(p.setNine, p.x, p.y, Math.atan2(p.vy, p.vx));
        continue;
      }
      if (p.setSevenPending) {
        // Slide 7 releases some shots later than the trigger (the staff charges
        // first); hold the carrier still until its shot exists.
        const made = this.s7.takeShots();
        if (made.length) {
          p.setSeven = made[0];
          p.setSevenPending = false;
          p.y = made[0].y;
          // A charged staff releases its round later than the trigger; from
          // that moment it travels at slide 7's speed, not slide 1's.
          adoptSevenRound(p, made[0], Math.abs(p.vy) / this.speedMult, this.speedMult);
          this.s7Last = made[0];
        } else if (this.strandCarrier(p)) continue;
      }
      if (p.s7Ghost) continue; // extra pellet of a burst gun: slide 7 shot it
      if (p.setOne) {
        this.s1.trail(p.setOne, p.x, p.y, s);
        continue;
      }
      if (p.setSeven) {
        // Slide 7's own frame: `update()` schedules its sub-projectiles (the
        // minigun drum, the swarm…) and spawns its trail; slide 1 decides where
        // the round actually is, so the position is handed over every frame.
        const shot = p.setSeven;
        shot.x = p.x;
        shot.y = p.y - shot.vy * s;
        shot.update(s);
        shot.x = p.x;
        shot.y = p.y;
        continue;
      }
      if (tw.id === 'firework') {
        spawnFirework8FlightSparks(this.getFwState(), p.x, p.y, p.hue ?? gunState.rocketHue);
        continue;
      }
      if (tw.id === 'yoyo') {
        spawnYoyoFlightSparks(this.getYoyoState(), p.x, p.y, p.hue ?? gunState.yoyoHue);
        continue;
      }
      if (tw.id === 'keris') {
        spawnKerisFlightSparks(this.getKerisState(), p.x, p.y);
        continue;
      }
      if (tw.id === 'diamond') {
        spawnDiamondFlightSparks(this.getDiamondState(), p.x, p.y);
        continue;
      }
      if (tw.id === 'bazooka') {
        continue;
      }
      const px = p.x + rand(-4, 4);
      const py = p.y + rand(20, 46);
      if (tw.id === 'snowball') {
        for (let k = 0; k < 6; k++) {
          this.sink.push({ x: p.x + rand(-16, 16), y: p.y + rand(29, 69),
            vx: rand(-60, 60), vy: rand(25, 90), life: rand(0.25, 0.49), max: 0.49,
            size: rand(1.5, 3.6), color: pick(['#ffffff', '#f8fdff', '#eaf6fb']), kind: 'snowDust',
            rot: 0, vr: 0, g: 110, drag: 1.4 });
        }
        for (let k = 0; k < 2; k++) {
          this.sink.push({ x: p.x + rand(-15, 15), y: p.y + rand(36, 64),
            vx: rand(-50, 50), vy: rand(20, 85), life: rand(0.3, 0.52), max: 0.52,
            size: rand(2.2, 4.2), color: '#ffffff', kind: 'snowflake',
            rot: rand(0, TAU), vr: rand(-5, 5), g: 75, drag: 1.7 });
        }
        continue;
      }
      if (tw.id === 'soaker') {
        for (let k = 0; k < 3; k++) {
          this.sink.push({ x: p.x + rand(-11, 11), y: p.y + rand(23, 67), vx: rand(-95, 95),
            vy: rand(45, 155), life: rand(0.23, 0.45), max: 0.45, size: rand(1.6, 4.1),
            color: pick(['#ddfaff', '#7dd3fc', '#bae6fd']), kind: 'waterDrop',
            rot: 0, vr: 0, g: 800, drag: 0.8 });
        }
        continue;
      }
      // Dora projectile: echo ringE rings + wind streaks + puff particles (game-3)
      if (tw.id === 'dora') {
        if (p.t === undefined) p.t = 0;
        p.t += s;
        if (p.lastEcho === undefined) p.lastEcho = p.y;
        while (p.lastEcho - p.y > 44) {
          p.lastEcho -= 44;
          this.sink.push({ x: p.x, y: p.lastEcho, vx: 0, vy: 0, life: 0.32, max: 0.32, size: 26, color: '#ffffff', kind: 'ringE', rot: 0, vr: 0, g: 0 });
        }
        if (Math.random() < 0.8) this.sink.push({ x: p.x + rand(-26, 26), y: p.y + rand(10, 40), vx: rand(-30, 30), vy: rand(150, 320), life: rand(0.15, 0.3), max: 0.3, size: rand(10, 24), color: '#ffffff', kind: 'wind', rot: 0, vr: 0, g: 0, drag: 1 });
        if (Math.random() < 0.3) this.sink.push({ x: p.x + rand(-30, 30), y: p.y + rand(0, 30), vx: rand(-80, 80), vy: rand(60, 160), life: rand(0.3, 0.5), max: 0.5, size: rand(5, 10), color: '#ffffff', kind: 'puff', rot: rand(0, TAU), vr: rand(-3, 3), g: 0, drag: 2 });
        continue;
      }
      // Xeno projectile: shed droplets + green smoke (game-3)
      if (tw.id === 'xeno') {
        // sampled tail for the metaball body (game-3 p.trail)
        p.t = (p.t ?? 0) + s;
        p.trail = p.trail ?? [];
        p.trail.unshift({ x: p.x + rand(-1, 1), y: p.y });
        if (p.trail.length > 12) p.trail.pop();
        if (Math.random() < 0.7) this.sink.push({ x: p.x + rand(-7, 7), y: p.y + rand(10, 40), vx: rand(-70, 70), vy: rand(-200, 100), life: rand(0.5, 1), max: 1, size: rand(1.5, 3.5), color: '#b6ff1a', kind: 'acid', rot: 0, vr: 0, g: 1100, drag: 0.15 });
        if (Math.random() < 0.3) this.sink.push({ x: p.x + rand(-6, 6), y: p.y + 20, vx: rand(-20, 20), vy: rand(-20, 20), life: 0.8, max: 0.8, size: rand(6, 12), color: '182,255,26', kind: 'smoke', rot: 0, vr: 0, g: 0, drag: 0 });
        continue;
      }
      // Pred projectile: sparks + bolts + ringE echo + smoke (game-3)
      if (tw.id === 'pred') {
        if (p.t === undefined) p.t = 0;
        p.t += s;
        if (p.lastEcho === undefined) p.lastEcho = p.y;
        while (p.lastEcho - p.y > 60) { p.lastEcho -= 60; this.sink.push({ x: p.x, y: p.lastEcho, vx: 0, vy: 0, life: 0.25, max: 0.25, size: 10, color: '111,211,255', kind: 'ringE', rot: 0, vr: 0, g: 0 }); }
        if (Math.random() < 0.9) this.sink.push({ x: p.x + rand(-8, 8), y: p.y + rand(10, 60), vx: rand(-120, 120), vy: rand(40, 200), life: rand(0.2, 0.4), max: 0.4, size: 1.5, color: Math.random() < 0.5 ? '#ffffff' : '111,211,255', kind: 'spark', rot: 0, vr: 0, g: 0, drag: 3 });
        if (Math.random() < 0.5) this.sink.push({ x: p.x, y: p.y + rand(0, 40), vx: Math.cos(rand(0, TAU)) * rand(16, 40), vy: Math.sin(rand(0, TAU)) * rand(16, 40), life: 0.08, max: 0.08, size: 2, color: '111,211,255', kind: 'bolt', rot: 0, vr: 0, g: 0 });
        if (Math.random() < 0.4) this.sink.push({ x: p.x + rand(-10, 10), y: p.y + 40, vx: rand(-20, 20), vy: rand(-10, 30), life: 0.7, max: 0.7, size: rand(8, 16), color: '74,106,144', kind: 'smoke', rot: 0, vr: 0, g: 0, drag: 0 });
        continue;
      }
      switch (tw.trailFx) {
        case 'glow':
        case 'void':
          this.particles.push({ x: px, y: py, vx: rand(-30, 30), vy: rand(20, 80), life: rand(0.2, 0.4), max: 0.4, size: rand(2.5, 5), color: tw.trail, kind: 'glow', rot: 0, vr: 0, g: 0 });
          break;
        case 'smoke':
          this.particles.push({ x: px, y: py + 6, vx: rand(-25, 25), vy: rand(30, 90), life: rand(0.5, 0.9), max: 0.9, size: rand(6, 12), color: 'rgba(170,170,170,', kind: 'smoke', rot: 0, vr: 0, g: -20 });
          this.particles.push({ x: p.x, y: p.y + 44, vx: rand(-20, 20), vy: rand(60, 140), life: 0.15, max: 0.15, size: rand(5, 9), color: '255,160,50', kind: 'glow', rot: 0, vr: 0, g: 0 });
          break;
        case 'spark':
          this.particles.push({ x: px, y: py, vx: rand(-200, 200), vy: rand(-50, 150), life: 0.15, max: 0.15, size: 1.5, color: pick(tw.sparks), kind: 'spark', rot: 0, vr: 0, g: 0 });
          break;
        case 'bubble':
          if (Math.random() < 0.6) this.particles.push({ x: px, y: py, vx: rand(-20, 20), vy: rand(-10, 30), life: rand(0.3, 0.5), max: 0.5, size: rand(1.5, 3), color: tw.trail, kind: 'glow', rot: 0, vr: 0, g: 0 });
          break;
        case 'frost':
          this.particles.push({ x: px, y: py, vx: rand(-40, 40), vy: rand(10, 60), life: rand(0.3, 0.5), max: 0.5, size: rand(2, 4), color: tw.trail, kind: 'glow', rot: 0, vr: 0, g: 0 });
          break;
        case 'gold':
          this.particles.push({ x: px, y: py, vx: rand(-60, 60), vy: rand(0, 80), life: 0.25, max: 0.25, size: 1.5, color: pick(tw.sparks), kind: 'spark', rot: 0, vr: 0, g: 200 });
          break;
        case 'fire':
          for (let k = 0; k < 2; k++) this.particles.push({ x: px, y: py, vx: rand(-40, 40), vy: rand(40, 120), life: rand(0.2, 0.4), max: 0.4, size: rand(4, 8), color: pick(['255,200,80', '255,120,30', '255,60,20']), kind: 'glow', rot: 0, vr: 0, g: -100 });
          break;
        case 'pixel':
          this.particles.push({ x: px, y: py, vx: 0, vy: rand(20, 60), life: 0.3, max: 0.3, size: rand(2, 4), color: pick(['#ff0055', '#00ffee', '#22ff88']), kind: 'chip', rot: 0, vr: 0, g: 0 });
          break;
        case 'confetti':
          this.particles.push({ x: px, y: py, vx: rand(-80, 80), vy: rand(0, 80), life: rand(0.4, 0.7), max: 0.7, size: rand(2, 4), color: pick(tw.sparks), kind: 'chip', rot: rand(0, TAU), vr: rand(-20, 20), g: 200 });
          break;
        case 'rainbow': {
          // Lush ribbon trail across all 6 pastel rainbow bands with trailing stardust
          const RBC = ['248,113,113', '251,146,60', '250,204,21', '74,222,128', '96,165,250', '192,132,252'];
          for (let k = 0; k < 6; k++) {
            const ox = (k - 2.5) * 3.2;
            this.sink.push({ x: p.x + ox, y: p.y + 18, vx: rand(-10, 10), vy: rand(50, 120), life: 0.45, max: 0.45, size: 3.5, color: RBC[k], kind: 'glow', rot: 0, vr: 0, g: 0 });
          }
          for (let k = 0; k < 2; k++) {
            this.sink.push({ x: px + rand(-12, 12), y: py + rand(10, 30), vx: rand(-40, 40), vy: rand(20, 60), life: rand(0.4, 0.7), max: 0.7, size: rand(4, 7), color: '#ffffff', kind: 'star', rot: 0, vr: 0, g: 0, drag: 2 });
          }
          break;
        }
        case 'petal':
          if (Math.random() < 0.7) this.sink.push({ x: px, y: py, vx: rand(-90, 90), vy: rand(-20, 60), life: rand(0.7, 1.2), max: 1.2, size: rand(2.5, 4.5), color: pick(['#fbcfe8', '#f9a8d4', '#fdf2f8']), kind: 'petal', rot: rand(0, TAU), vr: rand(-8, 8), g: 60, drag: 1.5 });
          break;
        case 'note':
          if (Math.random() < 0.25) this.particles.push({ x: px + rand(-14, 14), y: py, vx: rand(-40, 40), vy: rand(-30, 30), life: 0.7, max: 0.7, size: 14, color: pick(['#fde68a', '#fca5a5', '#a5f3fc']), kind: 'text', rot: 0, vr: 0, g: 0, text: pick(['♪', '♫']) });
          this.sink.push({ x: px, y: py, vx: 0, vy: 40, life: 0.3, max: 0.3, size: 3, color: tw.trail, kind: 'glow', rot: 0, vr: 0, g: 0 });
          break;
        case 'acid':
          // Xenomorph viscous acid drips + fine mist
          this.particles.push({ x: px, y: py, vx: rand(-20, 20), vy: rand(40, 100), life: rand(0.3, 0.6), max: 0.6, size: rand(3, 6), color: tw.trail, kind: 'drop', rot: 0, vr: 0, g: 500, drag: 0.8 });
          if (Math.random() < 0.5) this.particles.push({ x: px + rand(-8, 8), y: py + rand(5, 15), vx: rand(-30, 30), vy: rand(20, 80), life: rand(0.3, 0.6), max: 0.6, size: rand(1.5, 3), color: 'rgba(126,200,30,', kind: 'smoke', rot: 0, vr: 0, g: 100, drag: 2 });
          break;
        case 'air':
          // Dora compressed air ring puffs + light streaks
          this.particles.push({ x: px, y: py, vx: rand(-40, 40), vy: rand(30, 90), life: rand(0.4, 0.8), max: 0.8, size: rand(8, 14), color: 'rgba(220,240,255,', kind: 'smoke', rot: rand(0, TAU), vr: rand(-2, 2), g: -30, drag: 3 });
          if (Math.random() < 0.4) this.sink.push({ x: px, y: py, vx: 0, vy: 0, life: 0.2, max: 0.2, size: 14, color: '255,255,255', kind: 'ring', rot: 0, vr: 0, g: 0 });
          break;
        case 'plasma':
          // Predator plasma ion sparks + electric arcs
          this.particles.push({ x: px, y: py, vx: rand(-60, 60), vy: rand(40, 120), life: rand(0.15, 0.3), max: 0.3, size: rand(2, 4), color: tw.trail, kind: 'glow', rot: 0, vr: 0, g: 0, drag: 3 });
          if (Math.random() < 0.3) this.sink.push({ x: px + rand(-10, 10), y: py, vx: rand(-30, 30), vy: 0, life: 0.12, max: 0.12, size: 2, color: '255,255,255', kind: 'bolt', rot: 0, vr: 0, g: 0 });
          break;
      }
    }
    this.recoil = Math.max(0, this.recoil - dt * 7);
    this.muzzle -= dt;
    this.bump *= Math.exp(-dt * 14);
    this.hitFlash = Math.max(0, this.hitFlash - dt * 7);
    this.shake *= Math.exp(-dt * 9);
    this.flashWhite = Math.max(0, this.flashWhite - dt * 2.5);
    this.wheelFlash = Math.max(0, this.wheelFlash - dt * 5);
    this.flashRed = Math.max(0, this.flashRed - dt * 1.8);
    for (const it of this.items) {
      it.age += s;
      if (it.flash) it.flash = Math.max(0, it.flash - dt * 3.5);
    }
    // ---- ongoing stuck effects for xeno/dora/pred (game-3 update loop) ----
    if (this.state === 'play') {
      for (const it of this.items) {
        if (it.type !== 'bullet') continue;
        if (it.w !== 'xeno' && it.w !== 'dora' && it.w !== 'pred') continue;
        const wp = this.worldPos(it.angle, this.level.radius);
        const hx = wp.x, hy = wp.y;
        if (it.w === 'xeno') {
          // Ported from game-3: the blob sags, then a drip stretches until it
          // detaches and falls into the fluid layer, plus acid vapour/bubbles.
          if (it.acid) {
            const R0 = this.level.radius;
            const a = it.angle + this.rot;
            const bx = CX + Math.cos(a) * (R0 + 8);
            const by = this.targetY + Math.sin(a) * (R0 + 8);
            it.acid.dripT -= dt;
            if (it.acid.dripT <= 0) {
              it.acid.drip += dt * 14;
              if (it.acid.drip > 12) {
                this.sink.push({ x: bx + rand(-4, 4), y: by + 6, vx: rand(-10, 10), vy: 30, life: 1.8, max: 1.8, size: rand(3, 4.2), color: '#b6ff1a', kind: 'acid', rot: 0, vr: 0, g: 1100, drag: 0.15 });
                it.acid.drip = 0;
                it.acid.dripT = rand(0.8, 2.2);
              }
            }
            if (Math.random() < dt * 5) {
              this.sink.push({ x: bx + rand(-8, 8), y: by - 4, vx: rand(-15, 15), vy: rand(-45, -15), life: rand(1, 1.8), max: 1.8, size: rand(6, 12), color: '168,224,74', kind: 'smoke', rot: 0, vr: 0, g: 0, drag: 0 });
            }
            if (Math.random() < dt * 6) {
              this.sink.push({ x: bx + rand(-10, 10), y: by + rand(-10, 10), vx: 0, vy: -10, life: rand(0.3, 0.7), max: 0.7, size: rand(0.8, 1.8), color: '244,255,154', kind: 'bubble', rot: 0, vr: 0, g: 0, grow: 2 });
            }
            void hx; void hy;
          }
        } else if (it.w === 'dora') {
          // wind particles swirling around rim (game-3: white wind streaks, tangent direction)
          if (Math.random() < dt * 10) {
            const a = it.angle + this.rot;
            const ta = a + Math.PI / 2;
            this.sink.push({ x: hx + rand(-10, 10), y: hy + rand(-10, 10), vx: Math.cos(ta) * rand(60, 140) * (Math.random() < 0.5 ? 1 : -1), vy: Math.sin(ta) * rand(60, 140), life: rand(0.25, 0.45), max: 0.45, size: rand(6, 14), color: '#ffffff', kind: 'wind', rot: 0, vr: 0, g: 0, drag: 2 });
          }
        } else if (it.w === 'pred') {
          // plasma scar: bolts, embers, smoke (game-3)
          const hot = Math.max(0, 1 - it.age / 6);
          if (Math.random() < dt * (2 + hot * 6)) {
            const a = it.angle + this.rot + rand(-1.5, 1.5);
            this.sink.push({ x: hx, y: hy, vx: Math.cos(a) * rand(30, 70), vy: Math.sin(a) * rand(30, 70), life: rand(0.1, 0.2), max: 0.2, size: 3, color: '111,211,255', kind: 'bolt', rot: 0, vr: 0, g: 0 });
          }
          if (Math.random() < dt * (3 + hot * 12)) {
            this.sink.push({ x: hx + rand(-6, 6), y: hy + rand(-6, 6), vx: rand(-30, 30), vy: rand(-80, -20), life: rand(0.4, 0.9), max: 0.9, size: rand(1, 2.2), color: pick(['#ffb060', '#ff7030', '111,211,255']), kind: 'glow', rot: 0, vr: 0, g: 0, drag: 1 });
          }
          if (Math.random() < dt * (2 + hot * 6)) {
            this.sink.push({ x: hx + rand(-6, 6), y: hy, vx: rand(-10, 10), vy: rand(-50, -20), life: rand(1, 1.8), max: 1.8, size: rand(6, 12), color: '48,58,72', kind: 'smoke', rot: 0, vr: 0, g: 0, drag: 2 });
          }
        }
      }
    }
    for (const b of this.rockBullets) {
      b.age += s;
      if (b.flash) b.flash = Math.max(0, b.flash - dt * 3.5);
    }
    for (const b of this.chestBullets) {
      b.age += s;
      if (b.flash) b.flash = Math.max(0, b.flash - dt * 3.5);
    }
    if (this.weapon.id === 'firework' || (this.fwState && (this.fwState.particles.length > 0 || this.fwState.glows.length > 0 || this.fwState.rings.length > 0 || this.fwState.sky.length > 0))) {
      // Slide 2 runs its sky show on the menu / game over only — mirror that here.
      // (Gun Hit's idle screen uses its own menu backdrop, so 'over' is the match.)
      updateFirework8State(this.getFwState(), dt, this.state === 'over');
    }
    if (
      this.slide2Void || this.s2.particles.length > 0 || this.s2.glows.length > 0
      || this.s2.rings.length > 0 || this.s2.voids.length > 0 || this.s2.jets.length > 0
      || this.s2.beams.length > 0 || this.s2.smokes.length > 0 || this.s2.fireballs.length > 0
      || this.s2.flashes.length > 0 || this.s2.texts.length > 0 || this.s2.timers.length > 0
    ) {
      this.s2.update(dt);
    }
    // Slide 2's own layer: its round trails, bubbles, impact cracks, shrapnel
    // and the muzzle pulses its recipes feed the artwork.
    if (this.s2wState && (this.s2wState.busy || this.setTwoLive)) {
      const fx = this.s2w;
      fx.cx = CX;
      fx.cy = this.targetY;
      fx.ambient = this.state === 'play';
      fx.radius = this.level.radius;
      fx.gunY = GUN_Y;
      fx.h = H;
      setTwoGunFx(fx);
      fx.update(dt);
      if (fx.flash > 0) {
        // Slide 2 tints the screen with `min(0.45, flash * 0.45)`; slide 1's
        // white veil is drawn at 0.6× its value, so scale it to match.
        this.flashWhite = Math.max(this.flashWhite, Math.min(0.75, fx.flash * 0.75));
        this.wheelFlash = Math.max(this.wheelFlash, fx.flash * 0.6);
        fx.flash = 0;
      }
    }
    else setTwoGunFx(null);
    if (this.s1State && (this.s1State.busy || this.setOneLive)) this.s1State.update(dt);
    // Slide-7 SET 2..5: its own clock, its animation springs (recoil, pump,
    // heat, spin, charge…) and the idle ambience that keeps the gun alive.
    if (this.s7State || this.setSevenId) {
      const fx = this.s7;
      const id = this.setSevenId;
      if (id) {
        fx.weaponId = id;
        fx.time = this.time;
        fx.syncWheel();
        updateSevenAnim(fx, dt);
      }
      fx.update(dt);
    }
    // Slide 11: its own clock, particles, rounds, marks and beams.
    if (this.setElevenLive || (this.s11State && this.s11State.busy)) {
      const fx = this.s11;
      const id = this.setElevenId;
      if (id) {
        fx.weaponId = id;
        fx.syncWheel();
      }
      // Holding the trigger keeps a slide-11 channel (flame, beam) flowing,
      // exactly like slide 11's own `press()`; slide 1 still owns every shot.
      fx.advance(dt, this.state === 'play' && this.holding);
    }
    // Slide 6: its own clock, beams, particles and scorch marks. Its beam is
    // painted on the trigger, so there is no carried round to follow.
    if (this.setSixLive || (this.s6State && this.s6State.busy)) {
      const fx = this.s6;
      const id = this.setSixId;
      if (id) {
        fx.weaponId = id;
        fx.time = this.time;
        fx.syncWheel();
      }
      // Slide 6's sniper keeps its laser sight lit while it is armed.
      fx.sight = this.state === 'play' && id !== null;
      fx.update(dt);
    }
    // Slide 9: its own clock, particles, rounds, beams and entry holes. Only
    // while that shot (or its leftover FX) is live, so a slide-9 layer can never
    // animate for a gun that is firing slide 11 instead.
    if (this.setNineLive || (this.s9State && this.s9State.busy)) {
      const fx = this.s9;
      const id = this.setNineId;
      if (id) {
        fx.weaponId = id;
        fx.time = this.time;
        fx.syncWheel();
      }
      fx.update(dt);
    }
    if (this.state === 'play' && this.slide2Void) {
      // Slide 2 keeps tearing voids open in the sky while the gun is live.
      ambientBlackHole2(this.s2, CX, GUN_Y, dt);
      this.s2Ambient -= dt;
      if (this.s2Ambient <= 0) {
        launchVoidSky2(this.s2, rand(0.8, 1.15), () => slide2Sfx.voidOpen(), () => slide2Sfx.voidBoom(1));
        this.s2Ambient = rand(1.6, 2.6);
      }
    }
    if (
      this.weapon.id === 'yoyo' ||
      (this.yoyoState &&
        (this.yoyoState.particles.length > 0 ||
          this.yoyoState.glows.length > 0 ||
          this.yoyoState.rings.length > 0 ||
          this.yoyoState.strings.length > 0 ||
          this.yoyoState.timers.length > 0 ||
          this.yoyoState.flash > 0.01 ||
          this.yoyoState.wpulse > 0.01))
    ) {
      const yoyo = this.getYoyoState();
      const stuckPins: { x: number; y: number; hue: number; age: number }[] = [];
      for (const it of this.items) {
        if (it.type === 'bullet' && it.w === 'yoyo') {
          const worldA = it.angle + this.rot;
          const itemR = this.level.boss
            ? getExactBossRadius(this.level.style as BossType, it.angle, this.level.radius)
            : this.level.radius;
          const dist = itemR + 4;
          stuckPins.push({
            x: CX + Math.cos(worldA) * dist,
            y: this.targetY + Math.sin(worldA) * dist,
            hue: it.hue ?? 0,
            age: it.age,
          });
        }
      }
      updateYoyoSlideState(yoyo, dt, stuckPins);
    }
    if (
      this.weapon.id === 'keris' ||
      (this.kerisState &&
        (this.kerisState.particles.length > 0 ||
          this.kerisState.crawlArcs.length > 0 ||
          this.kerisState.thunderFlash > 0.01))
    ) {
      updateKerisSlideState(
        this.getKerisState(),
        dt,
        this.time,
        CX,
        GUN_Y + this.recoil * 22,
        this.weapon.id === 'keris' && (this.state === 'play' || this.state === 'intro'),
      );
    }
    if (
      this.weapon.id === 'diamond' ||
      (this.diamondState &&
        (this.diamondState.particles.length > 0 ||
          this.diamondState.shards.length > 0 ||
          this.diamondState.glows.length > 0 ||
          this.diamondState.rings.length > 0 ||
          this.diamondState.starflashes.length > 0 ||
          this.diamondState.timers.length > 0 ||
          this.diamondState.flash > 0.01 ||
          this.diamondState.wpulse > 0.01))
    ) {
      const diamond = this.getDiamondState();
      const stuckPins: { x: number; y: number }[] = [];
      for (const it of this.items) {
        if (it.type === 'bullet' && it.w === 'diamond') {
          const worldA = it.angle + this.rot;
          const itemR = this.level.boss
            ? getExactBossRadius(this.level.style as BossType, it.angle, this.level.radius)
            : this.level.radius;
          const dist = itemR + 14;
          stuckPins.push({
            x: CX + Math.cos(worldA) * dist,
            y: this.targetY + Math.sin(worldA) * dist,
          });
        }
      }
      updateDiamondSlideState(
        diamond,
        dt,
        stuckPins,
        this.weapon.id === 'diamond' && (this.state === 'play' || this.state === 'intro'),
        CX,
        GUN_Y,
      );
    }
    if (
      this.weapon.id === 'bazooka' ||
      (this.bazookaState &&
        (this.bazookaState.particles.length > 0 ||
          this.bazookaState.smokes.length > 0 ||
          this.bazookaState.fireballs.length > 0 ||
          this.bazookaState.flashes.length > 0 ||
          this.bazookaState.debris.length > 0 ||
          this.bazookaState.glows.length > 0 ||
          this.bazookaState.timers.length > 0 ||
          this.bazookaState.screenFlash > 0.01))
    ) {
      const bazooka = this.getBazookaState();
      const flyingShots =
        this.weapon.id === 'bazooka'
          ? this.projs
              .filter((p) => !p.spawnDelay || p.spawnDelay <= 0)
              .map((p) => ({ x: p.x, y: p.y }))
          : [];
      bazooka.update(
        dt,
        this.weapon.id === 'bazooka' && (this.state === 'play' || this.state === 'intro'),
        CX,
        GUN_Y,
        flyingShots,
        H,
      );
    }

    // projectiles
    for (let i = this.projs.length - 1; i >= 0; i--) {
      const p = this.projs[i];
      if (p.spawnDelay && p.spawnDelay > 0) {
        p.spawnDelay -= s;
        if (p.spawnDelay > 0) continue;
        if (this.weapon.id === 'keris') {
          this.sink.light(p.x, GUN_Y - 6, 80, '255,224,110', 0.28);
          this.sink.push({
            x: p.x,
            y: GUN_Y - 6,
            vx: 0,
            vy: 0,
            life: 0.24,
            max: 0.24,
            size: 32,
            color: '#ffd056',
            kind: 'ring',
            rot: 0,
            vr: 0,
            g: 0,
          });
        }
      }
      // A charged slide-7 gun (bamboo fuse, emerald/rail/freeze charge, the
      // buster) creates its round a fraction of a second *after* the trigger.
      // Slide 7 shows nothing in that time, so the carrier waits at the muzzle
      // instead of flying a bullet slide 7 never fired — without this it landed
      // before its round existed, the round was never drawn, and the wheel got
      // slide 1's bullet instead of slide 7's stuck art.
      if (p.setSevenPending) continue;
      const ghostN = FX[this.weapon.id].ghost;
      if (ghostN) {
        p.hist = p.hist ?? [];
        p.hist.push({ x: p.x, y: p.y });
        if (p.hist.length > ghostN) p.hist.shift();
      }
      if (this.slide2Void) trailBlackHole2(this.s2, p.x, p.y, this.s2Hue);
      const dist = Math.hypot(p.vx, p.vy) * s;
      const steps = Math.max(1, Math.ceil(dist / 7));
      let r: StepRes = { res: 'none' };
      for (let k = 0; k < steps; k++) {
        p.x += (p.vx * s) / steps;
        p.y += (p.vy * s) / steps;
        r = this.stepProj(p);
        if (r.res !== 'none') break;
      }
      if (r.res === 'stick') {
        this.projs.splice(i, 1);
        this.stickAt(r.local ?? norm(Math.PI / 2 - this.rot), p);
        if ((this.state as State) === 'clear') break;
      } else if (r.res === 'hit') {
        // Consume one projectile per stone/star hit; a star pauses further shots.
        const idx = this.projs.indexOf(p);
        if (idx >= 0) this.projs.splice(idx, 1);
        if (this.choosingBuff || (this.state as State) === 'clear') break;
      } else if (r.res === 'fail') {
        if (this.trySave(p, !!r.spike)) {
          const idx = this.projs.indexOf(p);
          if (idx >= 0) this.projs.splice(idx, 1);
          if ((this.state as State) === 'clear') break;
          continue;
        }
        this.failProjAngle = 0;
        this.fail(p);
        break;
      } else if (p.y < -80 || p.x < -80 || p.x > W + 80) {
        this.projs.splice(i, 1);
      }
    }

    // particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= s;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      p.vy += p.g * s;
      if (p.drag) {
        const k = Math.exp(-p.drag * s);
        p.vx *= k;
        p.vy *= k;
      }
      p.x += p.vx * s;
      p.y += p.vy * s;
      p.rot += p.vr * s;
      if (p.kind === 'text') p.vy *= Math.exp(-s * 3);
      if ((p.kind === 'chip' || p.kind === 'shard' || p.kind === 'drop' || p.kind === 'snowChunk' || p.kind === 'waterDrop')
        && p.y > H - 14 && p.vy > 0) {
        p.y = H - 14;
        p.vy *= -0.35;
        p.vx *= 0.7;
      }
      if (p.kind === 'shell' && p.y > H - 20 && p.vy > 0) {
        p.y = H - 20;
        p.vy *= -0.4;
        p.vx *= 0.6;
      }
    }
    for (let i = this.frags.length - 1; i >= 0; i--) {
      const f = this.frags[i];
      f.vy += 1300 * s;
      f.x += f.vx * s;
      f.y += f.vy * s;
      f.rot += f.vr * s;
      if (f.y > H + 200) this.frags.splice(i, 1);
    }
    for (let i = this.flyers.length - 1; i >= 0; i--) {
      const f = this.flyers[i];
      f.vy += 1400 * s;
      f.x += f.vx * s;
      f.y += f.vy * s;
      f.rot += f.vr * s;
      if (f.y > H + 150) this.flyers.splice(i, 1);
    }
    for (const d of this.dust) {
      d.y -= d.v * dt;
      d.x += Math.sin(this.time + d.y * 0.01) * 4 * dt;
      if (d.y < -5) {
        d.y = H + 5;
        d.x = Math.random() * W;
      }
    }

    if (this.state === 'clear') {
      this.stateT += dt;
      if (this.stateT > 1.75 && this.time >= this.diamondHoldUntil && (this.level.mode !== 'treasure' || this.stageRewardPaid)) {
        if (this.level.boss && this.events.onBossDefeated) {
          this.state = 'idle';
          this.bankedCoins += 5; // the boss reward was already included in this.coins
          this.events.onBossDefeated(this.level.name, this.level.n, 5, this.level.style as BossType);
        } else {
          this.loadLevel(this.level.n + 1);
        }
      }
    } else if (this.state === 'fail') {
      this.stateT += dt;
      if (this.stateT > 1.25) {
        this.state = 'over';
        this.events.onGameOver(this.score, this.level.n, Math.max(0, this.coins - this.bankedCoins), this.coins);
      }
    }
  }

  // ---------- drawing ----------
  private drawSpike(c: CanvasRenderingContext2D) {
    c.save();
    c.scale(SPIKE_SCALE, SPIKE_SCALE); // stage-board spikes are doubled; Nail Gun shots stay normal-sized
    const g = c.createLinearGradient(0, 0, 0, SPIKE_LEN + 6);
    g.addColorStop(0, '#2a2d33');
    g.addColorStop(0.6, '#5b616b');
    g.addColorStop(1, '#ff3030');
    c.beginPath();
    c.moveTo(-12, 0);
    c.lineTo(12, 0);
    c.lineTo(0, SPIKE_LEN + 6);
    c.closePath();
    c.fillStyle = g;
    c.fill();
    c.strokeStyle = '#111';
    c.lineWidth = 1.5;
    c.stroke();
    c.beginPath();
    c.moveTo(-3, 2);
    c.lineTo(0, SPIKE_LEN);
    c.strokeStyle = 'rgba(255,255,255,0.35)';
    c.lineWidth = 1.2;
    c.stroke();
    c.restore();
  }

  private drawCoin(c: CanvasRenderingContext2D, t: number, glowing = true) {
    // HUD and classic pickups share Diamond Breaker's reflective dollar coin.
    drawBreakerCoin(c, 0, 0, CLASSIC_COIN_RADIUS, t, 0, Math.abs(Math.cos(t * 3)) * 0.6 + 0.4, glowing);
  }

  // Berlian / Diamond tertancap ke papan arena:
  // Ujung lancip (kerucut / pavilion) menancap ke dalam papan (-Y mengarah ke pusat target),
  // bagian atas (mahkota/table crown) menonjol keluar ke arah +Y sehingga hanya terlihat setengah berlian!
  // Wajib ditembak 2 kali baru lepas dan jatuh!
  private drawEmbeddedDiamond(c: CanvasRenderingContext2D, t: number, hits = 0) {
    const shake = hits === 1 ? Math.sin(t * 34) * 1.6 : 0;
    c.save();
    c.translate(shake, 0);
    c.scale(CLASSIC_DIAMOND_SCALE, CLASSIC_DIAMOND_SCALE);

    const D_SIZE = 14; // Entire normal-stage diamond, including facets and badge, is 20% larger.

    // Pendaran kilau kristal (glow aura)
    c.shadowColor = hits === 1 ? '#fb7185' : '#38bdf8';
    c.shadowBlur = hits === 1 ? 16 : 14;

    // Retakan & serpihan tanah/kayu di sekitar titik tancap (y = 0)
    c.fillStyle = 'rgba(0,0,0,0.45)';
    c.beginPath();
    c.ellipse(0, 0, D_SIZE * 0.8, 3.5, 0, 0, TAU);
    c.fill();

    // 1. Bagian kerucut tajam (pavilion) yang MENANCAP KE DALAM PAPAN (-y direction)
    // Dibuat agak tembus pandang / tertancap di kayu/kulit target
    c.beginPath();
    c.moveTo(0, -D_SIZE * 1.15); // Ujung kerucut paling dalam menancap ke pusat papan!
    c.lineTo(-D_SIZE * 0.82, -1);
    c.lineTo(D_SIZE * 0.82, -1);
    c.closePath();
    const gDeep = c.createLinearGradient(0, -D_SIZE * 1.15, 0, 0);
    if (hits === 1) {
      gDeep.addColorStop(0, 'rgba(159,18,57,0.3)');
      gDeep.addColorStop(0.7, 'rgba(244,63,94,0.6)');
      gDeep.addColorStop(1, 'rgba(253,224,71,0.8)');
    } else {
      gDeep.addColorStop(0, 'rgba(12,74,110,0.35)');
      gDeep.addColorStop(0.65, 'rgba(14,165,233,0.65)');
      gDeep.addColorStop(1, 'rgba(56,189,248,0.85)');
    }
    c.fillStyle = gDeep;
    c.fill();
    c.strokeStyle = hits === 1 ? 'rgba(254,205,211,0.5)' : 'rgba(186,230,253,0.5)';
    c.lineWidth = 1;
    c.stroke();

    // 2. Bagian mahkota berlian (crown & table) yang MENONJOL KELUAR (+y direction)
    // Inilah setengah berlian yang terlihat mengkilap di permukaan papan!
    c.beginPath();
    c.moveTo(-D_SIZE * 0.85, 0);
    c.lineTo(-D_SIZE * 0.55, D_SIZE * 0.65); // Sisi mahkota kiri
    c.lineTo(D_SIZE * 0.55, D_SIZE * 0.65);  // Sisi mahkota kanan
    c.lineTo(D_SIZE * 0.85, 0);
    c.lineTo(0, -3); // Sedikit bevel ke dalam
    c.closePath();

    const gCrown = c.createLinearGradient(-D_SIZE, 0, D_SIZE, D_SIZE * 0.65);
    if (hits === 1) {
      // Retak kemerahan/kuning tanda tembakan 1 mengenai berlian!
      gCrown.addColorStop(0, '#fef08a');
      gCrown.addColorStop(0.35, '#fb7185');
      gCrown.addColorStop(0.7, '#e11d48');
      gCrown.addColorStop(1, '#9f1239');
    } else {
      // Berlian cyan cemerlang berkilauan
      gCrown.addColorStop(0, '#ffffff');
      gCrown.addColorStop(0.2, '#cffafe');
      gCrown.addColorStop(0.6, '#38bdf8');
      gCrown.addColorStop(1, '#0284c7');
    }
    c.fillStyle = gCrown;
    c.fill();
    c.shadowBlur = 0;
    c.strokeStyle = hits === 1 ? '#fecdd3' : '#e0f2fe';
    c.lineWidth = 1.6;
    c.stroke();

    // Garis faset kristal (facet cut) pada setengah berlian yang menonjol
    c.strokeStyle = 'rgba(255,255,255,0.85)';
    c.lineWidth = 1;
    c.beginPath();
    // Garis horizontal faset
    c.moveTo(-D_SIZE * 0.85, 0);
    c.lineTo(D_SIZE * 0.85, 0);
    // Garis segitiga faset
    c.moveTo(-D_SIZE * 0.55, D_SIZE * 0.65);
    c.lineTo(0, 0);
    c.lineTo(D_SIZE * 0.55, D_SIZE * 0.65);
    c.stroke();

    // Kilatan specular cahaya di sudut atas berlian
    c.fillStyle = '#ffffff';
    c.beginPath();
    c.arc(-D_SIZE * 0.35, D_SIZE * 0.45, 1.8, 0, TAU);
    c.fill();

    // Retakan visual saat hits === 1
    if (hits === 1) {
      c.strokeStyle = '#ffffff';
      c.lineWidth = 1.3;
      c.beginPath();
      c.moveTo(-4, D_SIZE * 0.55);
      c.lineTo(1, D_SIZE * 0.2);
      c.lineTo(-2, -D_SIZE * 0.3);
      c.lineTo(3, -D_SIZE * 0.7);
      c.stroke();
    }

    // Badge hit indicator: "1x lagi!" atau "2x"
    c.fillStyle = hits === 1 ? '#ffe4e6' : '#ffffff';
    c.font = 'bold 8.5px sans-serif';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.shadowColor = 'rgba(0,0,0,0.8)';
    c.shadowBlur = 4;
    c.fillText(hits === 1 ? '1x!' : '2x', 0, D_SIZE * 0.3);

    c.restore();
  }

  private drawProj(c: CanvasRenderingContext2D, kind: ProjKind, len?: number, age = 99, embedded = false) {
    const l = len ?? (kind === 'old' ? BLEN : getWeapon(kind).stick + EMBED);
    drawProjectile(c, kind, l, this.time, age, embedded, kind === 'diamond' ? 'new' : undefined);
  }

  private drawGunNow(c: CanvasRenderingContext2D) {
    const sinceShot = this.state === 'idle' ? 9 : this.rt - this.lastShotRT;
    const kerisCharging =
      this.weapon.id === 'keris' && sinceShot >= 0 && sinceShot < KERIS_GLEAM_DUR;
    const ry = kerisCharging
      ? -3.5 * Math.sin((sinceShot / KERIS_GLEAM_DUR) * Math.PI)
      : this.recoil * 22 - (this.state === 'idle' ? Math.sin(this.time * 2) * 3 : 0);
    const y0 = GUN_Y + ry;
    const R = this.level.radius;

    // Two upright barrels get two straight sights; a star never steers either.
    if (this.state === 'play' || this.state === 'intro') {
      if (this.weapon.id === 'firework' || this.weapon.id === 'yoyo') {
        const nextHue =
          this.weapon.id === 'firework'
            ? firework8ShotHue(this.level?.n ?? 1, this.getFwState().shotIdx)
            : yoyoAmmoHue(this.getYoyoState().shotIdx);
        const lg = c.createLinearGradient(0, y0, 0, this.targetY + R);
        lg.addColorStop(0, hsl(nextHue, 100, 70, 0.35));
        lg.addColorStop(1, 'rgba(255,255,255,0)');
        c.save();
        c.strokeStyle = lg;
        c.setLineDash([4, 7]);
        c.lineWidth = 1.5;
        for (const ox of this.gunOffsets) {
          c.beginPath();
          c.moveTo(CX + ox, y0);
          c.lineTo(CX + ox, this.targetY + R + 6);
          c.stroke();
        }
        c.setLineDash([]);
        c.restore();
      } else if (this.weapon.id === 'keris') {
        for (const ox of this.gunOffsets) {
          drawKerisAimGuide(c, CX + ox, y0, this.targetY + R, this.time);
        }
      } else {
        const lg = c.createLinearGradient(0, y0, 0, this.targetY);
        lg.addColorStop(0, this.weapon.color + '66');
        lg.addColorStop(1, this.weapon.color + '00');
        c.fillStyle = lg;
        for (const ox of this.gunOffsets) {
          c.fillRect(CX + ox - 0.75, this.targetY + R, 1.5, y0 - this.targetY - R);
        }
      }
    }

    // laser beams
    for (const b of this.beams) {
      const a = b.life / b.max;
      if ((this.weapon.id === 'laser' || this.weapon.id === 'moonbeam')
        && getGunEffect(this.weapon.id) === 'original') {
        drawClassicBeam(c, b.x, b.y, y0, a, b.rgb);
        continue;
      }
      if (this.weapon.id === 'laser') {
        drawLaserBeam(c, b.x, b.y, y0, a, this.time);
        continue;
      }
      c.save();
      c.globalCompositeOperation = 'lighter';
      const wdt = 14 * a + 2;
      const bg = c.createLinearGradient(b.x - wdt, 0, b.x + wdt, 0);
      bg.addColorStop(0, `rgba(${b.rgb},0)`);
      bg.addColorStop(0.5, `rgba(${b.rgb},${a * 0.9})`);
      bg.addColorStop(1, `rgba(${b.rgb},0)`);
      c.fillStyle = bg;
      c.fillRect(b.x - wdt, b.y, wdt * 2, y0 - b.y);
      if (this.weapon.id === 'moonbeam') {
        // Instant beam mechanics stay intact, but the beam reads as a stream
        // of bright stars released from the wand rather than a laser rifle.
        c.shadowColor = '#d9c5ff'; c.shadowBlur = 12;
        c.strokeStyle = `rgba(255,244,218,${a * 0.75})`;
        c.lineWidth = 2.5 * a; c.lineCap = 'round';
        c.beginPath(); c.moveTo(b.x, b.y);
        for (let i = 0; i < 6; i++) {
          const yy = b.y + (y0 - b.y) * ((i + 1) / 6);
          c.lineTo(b.x + Math.sin(i * 2.4 + this.time * 8) * 6, yy);
        }
        c.stroke(); c.shadowBlur = 0;
        for (let i = 0; i < 8; i++) {
          const yy = b.y + (y0 - b.y) * ((i + 0.5) / 8);
          const xx = b.x + Math.sin(i * 2.8 + this.time * 8) * 7;
          const r = (i % 3 === 0 ? 8 : 5) * a;
          c.fillStyle = i % 3 === 0 ? '#fff2c5' : '#f7eeff';
          c.beginPath();
          for (let n = 0; n < 12; n++) {
            const theta = n * TAU / 12 - Math.PI / 2;
            const rad = n % 2 ? r * 0.4 : r;
            c.lineTo(xx + Math.cos(theta) * rad, yy + Math.sin(theta) * rad);
          }
          c.closePath(); c.fill();
        }
      } else {
        c.fillStyle = `rgba(255,255,255,${a})`;
        c.fillRect(b.x - 1.5 * a - 0.5, b.y, 3 * a + 1, y0 - b.y);
      }
      const hg = c.createRadialGradient(b.x, b.y, 1, b.x, b.y, 30);
      hg.addColorStop(0, `rgba(255,255,255,${a})`);
      hg.addColorStop(1, `rgba(${b.rgb},0)`);
      c.fillStyle = hg;
      c.beginPath();
      c.arc(b.x, b.y, 30, 0, TAU);
      c.fill();
      c.restore();
    }

    const ready = this.state === 'idle' || this.state === 'intro'
      || (this.cooldown <= 0 && this.reloadT === 0 && this.ammoLeft > 0
        && (this.weapon.id !== 'snowball' || this.snowLoaded > 0)
        && (this.weapon.id !== 'yoyo' || this.projs.length === 0));
    gunState.sinceShot = this.state === 'idle' ? 9 : this.rt - this.lastShotRT;
    gunState.reloadT = this.reloadT;
    // Slide-7 SET 1..7 artwork: hand the live motion over to the real renderer.
    gunState.s7Anim = this.setSevenId && getGunVariant(this.weapon.id) === 'set7'
      ? buildSevenAnim({ sinceShot: gunState.sinceShot, charge: gunState.charge, spin: this.spin })
      : null;
    // Slide 9's own draw state: its recoil curve, cycle, held charge and how
    // many of its rounds are still out (the identity disc uses that).
    gunState.s9Live = this.setNineLive;
    // Slide 6's own draw state: its draw progress across its own trigger
    // interval plus its 14 px recoil, so the live gun is the slide-6 gun.
    gunState.sixLive = this.setSixLive;
    gunState.sixState = this.setSixId
      ? sixStateFor(gunState.sinceShot, this.setSixId, this.time)
      : null;
    // Slide 11's own weapon state (recoil, charge, channel, shot clock) drives
    // its artwork inside the normal gun pipeline.
    gunState.elevenLive = this.setElevenLive;
    // Slide 2's own draw state: its recoil curve, its reload meter, the hue it
    // charges with and the cannon pulse its own shots feed.
    gunState.twoLive = this.setTwoLive;
    gunState.twoState = this.setTwoId
      ? {
        time: this.time,
        recoil: gunState.sinceShot >= 0.17 ? 0 : 1 - gunState.sinceShot / 0.17,
        loadP: this.setTwoLive
          ? Math.min(1, Math.max(0, gunState.sinceShot) * 7)
          : 1,
        ammo: Math.max(0, this.ammoLeft),
        hue: this.s2HueFor(this.setTwoId),
        live: this.state === 'play',
        cannonPulse: this.s2wState?.cannonPulse ?? 0,
      }
      : null;
    gunState.elevenState = this.setElevenId ? this.s11State?.state ?? null : null;
    gunState.s9State = this.setNineId
      ? {
        t: this.time,
        recoil: gunState.sinceShot >= 0.16 ? 0 : 1 - gunState.sinceShot / 0.16,
        charge: gunState.charge,
        cycle: Math.min(1, Math.max(0, gunState.sinceShot) / 0.35),
        out: this.projs.filter((p) => p.setNine).length,
        catchT: gunState.sinceShot,
      }
      : null;
    const totalAmmo = this.level.ammo * this.maxAmmoMult;
    gunState.ammoRatio = totalAmmo > 0 ? Math.max(0, Math.min(1, this.ammoLeft / totalAmmo)) : 1;
    // xeno/pred animation state
    const wId = this.weapon.id;
    gunState.jaw = wId === 'xeno' ? Math.max(0, 1 - gunState.sinceShot / 0.3) : 0;
    gunState.glow = wId === 'xeno' ? Math.max(0, 1 - gunState.sinceShot / 0.4) : 0;
    gunState.servo = wId === 'pred' ? Math.max(0, 1 - gunState.sinceShot / 0.5) : 0;
    gunState.heat = wId === 'pred' ? Math.max(0, 1 - gunState.sinceShot / 0.6) : 0;
    const flash = Math.max(0, this.muzzle / 0.07);
    if (this.weapon.id === 'firework') {
      const fw = this.getFwState();
      const nextHue = firework8ShotHue(this.level?.n ?? 1, fw.shotIdx);
      gunState.rocketHue = nextHue;
      for (const ox of this.gunOffsets) {
        drawFirework8GunGlow(c, CX + ox, y0 + 50, nextHue, 0);
      }
    }
    if (this.weapon.id === 'yoyo') {
      const yoyo = this.getYoyoState();
      const nextHue = yoyoAmmoHue(yoyo.shotIdx);
      gunState.yoyoHue = nextHue;
      for (const ox of this.gunOffsets) {
        drawYoyoSlideGunGlow(c, CX + ox, y0 + 60, nextHue, this.recoil);
      }
    }
    if (this.weapon.id === 'keris') {
      c.save();
      c.fillStyle = 'rgba(0,0,0,0.42)';
      for (const ox of this.gunOffsets) {
        c.beginPath();
        c.ellipse(CX + ox, GUN_Y + 172, 44, 9, 0, 0, TAU);
        c.fill();
      }
      c.restore();
    }
    if (this.weapon.id === 'diamond') {
      for (const ox of this.gunOffsets) {
        drawDiamondSlideGunGlow(c, CX + ox, y0 + 70, this.recoil);
      }
    }

    // Slide 2's voids (the singularity's event horizon) sit BEHIND the gun and
    // the wheel; everything else it paints is drawn later, on top.
    if (this.s2wState && this.s2wState.voids.length > 0) {
      this.s2wState.drawBehind(c, this.time);
    }
    if (this.hasTwinGuns) {
      // Left gun mirrored and right gun normal: their grips/magazines face OUT,
      // matching the side-by-side AK-47 silhouette rather than overlapping.
      for (const ox of this.gunOffsets) {
        c.save();
        c.translate(CX + ox, y0);
        if (ox < 0) c.scale(-1, 1);
        drawGun(c, this.weapon.id, 0, 0, this.time, flash, ready, this.snowLoaded);
        c.restore();
      }
    } else {
      c.save();
      c.translate(CX, y0);
      drawGun(c, this.weapon.id, 0, 0, this.time, flash, ready, this.snowLoaded);
      c.restore();
    }

  }

  private forestBackdrop: HTMLCanvasElement | null = null;
  private forestBackdropKey = '';

  private drawForestBackground(c: CanvasRenderingContext2D, pal: (typeof STYLE_COLORS)[Style], R: number) {
    if (this.state !== 'idle' && this.weapon.id === 'firework') {
      drawFirework8Background(
        c,
        this.getFwState(),
        this.dpr,
        CX,
        this.targetY - this.bump * 9,
        R,
        this.level?.n ?? 1,
      );
      return;
    }
    if (this.state !== 'idle' && this.weapon.id === 'yoyo') {
      drawYoyoSlideBackground(
        c,
        this.getYoyoState(),
        this.dpr,
        CX,
        this.targetY - this.bump * 9,
        R,
        this.level?.n ?? 1,
        this.time,
      );
      return;
    }
    if (this.state !== 'idle' && this.weapon.id === 'keris') {
      drawKerisSlideBackground(
        c,
        this.getKerisState(),
        CX,
        this.targetY - this.bump * 9,
        R,
        this.time,
        this.level?.boss ?? false,
        W,
        H,
      );
      return;
    }
    if (this.state !== 'idle' && this.weapon.id === 'diamond') {
      drawDiamondSlideBackground(
        c,
        this.getDiamondState(),
        this.dpr,
        CX,
        this.targetY - this.bump * 9,
        R,
        this.level?.n ?? 1,
        this.time,
      );
      return;
    }
    if (this.state !== 'idle' && this.weapon.id === 'bazooka') {
      this.getBazookaState().drawBackground(c, W, H);
      return;
    }
    // Sky, silhouettes and target lighting do not change each frame. Cache
    // them at retina resolution; keep the drifting fireflies and grass live.
    const key = `${this.level.style}:${R}:${this.targetY}:${this.dpr}`;
    if (key !== this.forestBackdropKey || !this.forestBackdrop) {
      const backdrop = document.createElement('canvas');
      const density = Math.ceil(this.dpr);
      backdrop.width = W * density;
      backdrop.height = H * density;
      const bg = backdrop.getContext('2d')!;
      bg.setTransform(density, 0, 0, density, 0, 0);
      this.paintForestBackdrop(bg, pal, R);
      this.forestBackdrop = backdrop;
      this.forestBackdropKey = key;
    }
    c.drawImage(this.forestBackdrop, 0, 0, W, H);

    // 5. Kunang-Kunang Hutan Emas Melayang (Glowing Fireflies Sesuai Foto 1!)
    for (const d of this.dust) {
      const pulse = 0.4 + 0.6 * Math.sin(this.time * 2.5 + d.x);
      // Soft glow aura
      c.fillStyle = `rgba(250, 204, 21, ${0.28 * pulse})`;
      c.beginPath();
      c.arc(d.x, d.y, d.s * 2.8, 0, TAU);
      c.fill();
      // Bright core
      c.fillStyle = `rgba(254, 240, 138, ${0.9 * pulse})`;
      c.beginPath();
      c.arc(d.x, d.y, d.s * 0.9, 0, TAU);
      c.fill();
    }

    // 6. Rerumputan Liar 2D di Bagian Bawah Layar (Bottom Grass Blades Sesuai Foto 1!)
    c.fillStyle = '#020507';
    c.beginPath();
    c.moveTo(0, H);
    const blades = 28;
    for (let i = 0; i <= blades; i++) {
      const bx = (i / blades) * W;
      const wind = Math.sin(this.time * 2 + i * 0.5) * 4;
      const hBlade = 22 + (i % 3) * 12 + Math.sin(i * 1.5) * 8;
      c.lineTo(bx - 4, H);
      c.quadraticCurveTo(bx + wind * 0.5, H - hBlade * 0.6, bx + wind, H - hBlade);
      c.quadraticCurveTo(bx + 4 + wind * 0.5, H - hBlade * 0.6, bx + 6, H);
    }
    c.lineTo(W, H);
    c.closePath();
    c.fill();
  }

  private paintForestBackdrop(c: CanvasRenderingContext2D, pal: (typeof STYLE_COLORS)[Style], R: number) {
    // 1. Gradasi Langit Hutan 2D (+20% lebih cerah khas Knife Hit)
    const bg = c.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, pal.bgTop);
    bg.addColorStop(0.7, pal.bgBot);
    bg.addColorStop(1, '#0d252c');
    c.fillStyle = bg;
    c.fillRect(0, 0, W, H);

    // 2. Siluet Batang Pohon Lapisan Belakang (Far Background Trees - lebih terlihat jelas)
    c.fillStyle = 'rgba(24, 52, 60, 0.65)';
    // Batang pohon jauh 1
    c.beginPath();
    c.moveTo(50, 0); c.lineTo(84, 0); c.lineTo(74, H); c.lineTo(40, H); c.closePath();
    c.fill();
    // Cabang kecil
    c.beginPath();
    c.moveTo(65, 200); c.lineTo(118, 138); c.lineTo(112, 132); c.lineTo(63, 190); c.closePath();
    c.fill();

    // Batang pohon jauh 2
    c.beginPath();
    c.moveTo(330, 0); c.lineTo(370, 0); c.lineTo(354, H); c.lineTo(315, H); c.closePath();
    c.fill();
    c.beginPath();
    c.moveTo(345, 260); c.lineTo(286, 206); c.lineTo(292, 200); c.lineTo(348, 252); c.closePath();
    c.fill();

    // 3. Siluet Batang Pohon Lapisan Depan (Near Foreground Trees - Kiri & Kanan Sesuai Foto 1)
    const nearTree = (x0: number, x1: number, x2: number, x3: number) => {
      const tg = c.createLinearGradient(x0, 0, x1, 0);
      tg.addColorStop(0, 'rgba(14, 34, 40, 0.95)');
      tg.addColorStop(0.5, 'rgba(22, 50, 58, 0.92)');
      tg.addColorStop(1, 'rgba(12, 30, 36, 0.98)');
      c.fillStyle = tg;
      c.beginPath();
      c.moveTo(x0, 0); c.lineTo(x1, 0); c.lineTo(x2, H); c.lineTo(x3, H); c.closePath();
      c.fill();
    };

    // Pohon Kiri Utama
    nearTree(-15, 45, 35, -25);
    // Cabang pohon kiri menjorok ke target
    c.fillStyle = 'rgba(6, 15, 18, 0.95)';
    c.beginPath();
    c.moveTo(30, 120); c.quadraticCurveTo(80, 100, 130, 40); c.lineTo(120, 35); c.quadraticCurveTo(75, 90, 28, 105); c.closePath();
    c.fill();
    c.beginPath();
    c.moveTo(25, 420); c.quadraticCurveTo(70, 390, 115, 350); c.lineTo(110, 345); c.quadraticCurveTo(65, 382, 23, 405); c.closePath();
    c.fill();

    // Pohon Kanan Utama
    nearTree(375, 435, 445, 385);
    // Cabang pohon kanan menjorok ke target
    c.beginPath();
    c.moveTo(390, 150); c.quadraticCurveTo(340, 120, 290, 50); c.lineTo(298, 45); c.quadraticCurveTo(345, 112, 395, 135); c.closePath();
    c.fill();
    c.beginPath();
    c.moveTo(395, 440); c.quadraticCurveTo(350, 410, 300, 370); c.lineTo(306, 364); c.quadraticCurveTo(355, 402, 398, 425); c.closePath();
    c.fill();

    // 4. Ambient Target Glow (Cahaya lembut di sekitar buah / target)
    const targetGlow = c.createRadialGradient(CX, this.targetY, 20, CX, this.targetY, R * 2.5);
    targetGlow.addColorStop(0, pal.glow);
    targetGlow.addColorStop(0.6, pal.glow.replace(/[\d.]+\)$/, '0.06)'));
    targetGlow.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = targetGlow;
    c.fillRect(0, 0, W, H);

    // A restrained bottom vignette adds depth while keeping the lower forest readable.
    const lowerShade = c.createLinearGradient(0, H * 0.48, 0, H);
    lowerShade.addColorStop(0, 'rgba(2, 10, 18, 0)');
    lowerShade.addColorStop(0.58, 'rgba(2, 10, 18, 0.045)');
    lowerShade.addColorStop(1, 'rgba(2, 10, 18, 0.12)');
    c.fillStyle = lowerShade;
    c.fillRect(0, 0, W, H);
  }

  private drawBonusRing(c: CanvasRenderingContext2D, radius: number) {
    c.save();
    c.scale(radius / 196, radius / 196);
    for (const coin of this.bonusCoins) {
      if (coin.taken) continue;
      const x = Math.cos(coin.angle) * coin.radius, y = Math.sin(coin.angle) * coin.radius;
      drawBonusCoin(c, x, y, 11, this.time, coin.phase, true);
    }
    c.restore();
  }

  private render() {
    const c = this.ctx;
    const k = this.scale * this.dpr;
    c.setTransform(k, 0, 0, k, 0, 0);
    const pal = STYLE_COLORS[this.level.style];
    const R = this.level.radius;

    // Keep Gun Hit's forest, but give each Diamond Breaker round its own lighting.
    if (this.setTwoLook) drawSetTwoSky(c);
    else this.drawForestBackground(c, pal, R);
    if (isSpecial(this.level.mode)) {
      const tint = c.createLinearGradient(0, 0, 0, H);
      const gold = this.level.mode === 'treasure' || this.level.mode === 'bonus';
      tint.addColorStop(0, gold ? 'rgba(54,24,56,0.62)' : 'rgba(9,32,65,0.58)');
      tint.addColorStop(1, gold ? 'rgba(44,23,10,0.36)' : 'rgba(10,34,54,0.28)');
      c.fillStyle = tint; c.fillRect(0, 0, W, H);
      const halo = c.createRadialGradient(CX, this.targetY, 24, CX, this.targetY, 245);
      halo.addColorStop(0, gold ? 'rgba(251,191,36,0.26)' : 'rgba(103,232,249,0.24)');
      halo.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = halo; c.fillRect(0, 0, W, H);
    }
    // Slide 2's 110 twinkling stars ride on top of the sky it just painted.
    if (this.setTwoLook) drawSetTwoStars(c, this.time);

    c.save();
    if (this.shake > 0.1) c.translate(rand(-1, 1) * this.shake, rand(-1, 1) * this.shake);
    c.translate(0, this.camY);
    // The per-weapon atmosphere wash slide 2 paints over its sky.
    if (this.setTwoLook) {
      drawSetTwoAtmosphere(c, this.weapon.id, this.time, CX, this.targetY);
    }

    // Keep the clean diamond / chest visible through the special-stage celebration.
    if (this.state !== 'idle' && (this.state !== 'clear' || isSpecial(this.level.mode))) {
      const wScale = this.wheelScale ?? 1;
      const sc = wScale * (1 + this.bump * 0.035);
      c.save();
      c.translate(CX, this.targetY + this.bump * 7);
      c.scale(sc, sc);
      // Slide 2's soft ring of light behind the target.
      if (this.setTwoLook) {
        drawSetTwoWheelGlow(c, R, setTwoWheelHue(this.weapon.id, this.level.n), Math.min(1, this.bump / 14));
      }
      // Ordinary round targets keep their drop shadow. The special rock and
      // treasure chest must NOT sit on a large black disk as chunks fall away.
      // Dark Knight juga tampil tanpa lingkaran hitam di belakangnya.
      if (!isSpecial(this.level.mode) && !this.level.boss) {
        c.beginPath();
        c.arc(0, 10, R + 6, 0, TAU);
        c.fillStyle = 'rgba(0,0,0,0.35)';
        c.fill();
      }
      // Idle "hidup" untuk bos: melayang pelan, napas, dan goyangan lembut —
      // bos TIDAK diem, tapi juga TIDAK muter/membalik. Transform visual murni;
      // this.rot tetap terkunci 0 untuk fisika proyektil & bidikan.
      if (this.level.boss) {
        const bt = this.time;
        c.translate(Math.sin(bt * 0.53) * 3.2, Math.sin(bt * 1.15) * 3.8);
        c.rotate(Math.sin(bt * 0.66 + 1.0) * 0.085);
        const breath = 1 + Math.sin(bt * 1.35) * 0.014;
        c.scale(breath, breath);
      }
      if (this.rock && !this.centerDiamondCollected) drawRockDiamond(c, R, this.time, this.diamondPing);
      // Lapisan target berputar — bos juga berputar pelan (this.rot di update),
      // bukan terkunci diam. Kecepatan boss konstan agar tidak muter liar.
      if (this.level.mode !== 'treasure') c.rotate(this.rot);
      for (const it of this.items) {
        if (it.type === 'bullet' || it.type === 'old') {
          if (it.hideArt) continue; // slide 9 paints its own entry hole
          c.save();
          c.rotate(it.angle - Math.PI / 2);
          const sink = it.type === 'bullet' ? Math.max(0, 1 - it.age * 12) * 6 : 0;
          const sc = it.scale ?? 1;
          const totalWeaponLen = it.type === 'old' ? BLEN : (getWeapon(it.w || 'pistol').stick + 12);
          const len = totalWeaponLen;
          // Masuk lebih dalam hingga hanya terlihat setengah (50% tertanam di dalam papan)
          const embedDepth = totalWeaponLen * 0.5;
          const pencilEmbedBonus = it.w === 'pencil' ? Math.sin(it.angle * 13) * 5 : 0;
          const itemR = this.level.boss ? getExactBossRadius(this.level.style as BossType, it.angle, R) : R;
          const snowball = it.type === 'bullet' && it.w === 'snowball';
          const firework = it.type === 'bullet' && it.w === 'firework';
          const yoyo = it.type === 'bullet' && it.w === 'yoyo';
          const keris = it.type === 'bullet' && it.w === 'keris';
          const diamond = it.type === 'bullet' && it.w === 'diamond';
          const bazooka = it.type === 'bullet' && it.w === 'bazooka';
          const gauntlet = it.type === 'bullet' && it.w === 'gauntlet_cannon';
          const magnet = it.type === 'bullet' && it.w === 'magnet';
          // Place the snowy hemisphere, firework rocket nose, yoyo, keris, diamond, bazooka, gauntlet knuckles, or 2x horseshoe magnet at the hit surface.
          c.translate(0, snowball || keris ? itemR + sink
            : firework ? itemR - FIREWORK_EMBED_NOSE * sc + sink
            : yoyo ? itemR + 4 * sc + sink
            : diamond ? itemR + 9 * sc + sink
            : bazooka ? itemR - 5 * sc + sink
            : gauntlet ? itemR - 5.5 * sc + sink
            : magnet ? itemR - 4 * sc + sink
            : itemR - (embedDepth + pencilEmbedBonus) * sc + sink);
          c.scale(sc, sc);
          gunState.bigShot = it.big ?? 0;
          if (it.tint) gunState.tint = it.tint;
          if (firework) {
            gunState.rocketHue = it.hue ?? 340;
            gunState.rocketFlash = it.flash ?? 0;
          }
          if (yoyo) {
            gunState.yoyoHue = it.hue ?? 0;
            gunState.yoyoFlash = it.flash ?? 0;
          }
          if (diamond) {
            gunState.diamondFlash = it.flash ?? 0;
            gunState.diamondSeed = it.angle * 3.7;
          }
          if (bazooka) {
            gunState.bazookaHue = it.hue ?? 45;
            gunState.bazookaFlash = it.flash ?? 0;
            gunState.bazookaSeed = it.angle * 3.7;
            gunState.bazookaBite = Math.max(0.38, 1 - it.age * 0.8);
          }
          // ---- specialized stuck rendering (game-3: drawAirVortex, drawPlasmaScar) ----
          const wSeed = (it.angle * 7 + this.targetY * 3) % 1000;
          const clamp01w = (v: number) => Math.max(0, Math.min(1, v));
          const glowAtW = (gx: number, gy: number, gr: number, gcolor: string, ga: number) => {
            if (ga <= 0.003 || gr <= 0) return;
            const n = parseInt(gcolor.slice(1), 16);
            const gr2 = (n >> 16) & 255, gg = (n >> 8) & 255, gb = n & 255;
            c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = Math.min(1, ga);
            const grd = c.createRadialGradient(gx, gy, 0, gx, gy, gr);
            grd.addColorStop(0, `rgba(${gr2},${gg},${gb},1)`);
            grd.addColorStop(0.4, `rgba(${gr2},${gg},${gb},0.5)`);
            grd.addColorStop(1, `rgba(${gr2},${gg},${gb},0)`);
            c.fillStyle = grd; c.beginPath(); c.arc(gx, gy, gr, 0, TAU); c.fill();
            c.restore();
          };
          const rgbaW = (h: string, a: number) => { const n = parseInt(h.slice(1), 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`; };
          let skipWheelProj = false;
          if (it.w === 'xeno') {
            skipWheelProj = true; // game-3: acid stuck NOT drawn on rim
          } else if (it.w === 'dora') {
            skipWheelProj = true;
            const pop = 1 + Math.max(0, 0.6 - it.age) * 1.2;
            c.save();
            c.rotate(Math.PI / 2);
            c.translate(embedDepth * sc - sink + 10, 0);
            c.scale(pop, pop);
            c.globalCompositeOperation = 'lighter';
            glowAtW(6, 0, 30, '#9fdcff', 0.35);
            c.globalCompositeOperation = 'source-over';
            c.lineCap = 'round';
            for (let k = 0; k < 3; k++) {
              const ph = this.time * 6 + k * 2.1 + wSeed;
              const ry = 16 - k * 3, rxx = 5 + Math.abs(Math.sin(ph)) * 3;
              c.strokeStyle = `rgba(255,255,255,${0.85 - k * 0.22})`;
              c.lineWidth = 2.5 - k * 0.6;
              c.beginPath(); c.ellipse(4 + k * 6, 0, rxx, ry, 0, 0, TAU); c.stroke();
            }
            for (let i = 0; i < 4; i++) {
              const a = this.time * 5 + (i / 4) * TAU + wSeed;
              const px = 8 + Math.cos(a) * 6, py = Math.sin(a) * 17;
              c.strokeStyle = 'rgba(200,235,255,0.8)'; c.lineWidth = 1.6;
              c.beginPath(); c.arc(px, py, 4, a, a + 3.6); c.stroke();
            }
            const sa = Math.max(0, 1 - it.age / 0.5);
            if (sa > 0) {
              c.fillStyle = rgbaW('#fff4a0', sa);
              c.beginPath();
              for (let i = 0; i < 16; i++) { const an = (i / 16) * TAU; const r = i % 2 ? 6 : 16 * (1 + it.age * 2); i ? c.lineTo(-4 + Math.cos(an) * r, Math.sin(an) * r) : c.moveTo(-4 + r, 0); }
              c.closePath(); c.fill();
            }
            c.restore();
          } else if (it.w === 'pred') {
            skipWheelProj = true;
            const hot = clamp01w(1 - it.age / 6);
            const pop = 1 + Math.max(0, 0.4 - it.age) * 1.5;
            c.save();
            c.scale(pop, pop);
            c.beginPath(); c.moveTo(-6, -9); c.lineTo(14, -6); c.lineTo(26, -1); c.lineTo(28, 1); c.lineTo(16, 6); c.lineTo(-6, 9); c.closePath();
            const sg = c.createLinearGradient(-6, 0, 28, 0);
            sg.addColorStop(0, hot > 0.3 ? '#3a1a08' : '#1a110a'); sg.addColorStop(1, '#0a0806');
            c.fillStyle = sg; c.fill();
            c.globalCompositeOperation = 'lighter';
            c.strokeStyle = rgbaW('#ff7a20', 0.5 + hot * 0.5); c.lineWidth = 1.4; c.lineCap = 'round';
            c.beginPath(); c.moveTo(-4, 0); c.lineTo(6, -2); c.lineTo(14, 1); c.lineTo(22, 0); c.stroke();
            c.strokeStyle = rgbaW('#ffe0a0', hot); c.lineWidth = 0.7; c.stroke();
            glowAtW(2, 0, 14 + hot * 16, '#ff7a20', 0.3 + hot * 0.6);
            const pulse = 0.6 + 0.4 * Math.sin(this.time * 14 + wSeed);
            glowAtW(0, 0, 22, '#6fd3ff', (0.2 + hot * 0.5) * pulse);
            glowAtW(0, 0, 8, '#ffffff', hot * pulse);
            if (Math.random() < 0.4 + hot * 0.5) {
              c.beginPath(); let ax = 0, ay = 0; c.moveTo(ax, ay);
              const a = rand(0, TAU);
              for (let k = 0; k < 4; k++) { ax += Math.cos(a) * 5 + rand(-4, 4); ay += Math.sin(a) * 5 + rand(-4, 4); c.lineTo(ax, ay); }
              c.strokeStyle = rgbaW('#6fd3ff', 0.8); c.lineWidth = 2; c.stroke();
              c.strokeStyle = '#ffffff'; c.lineWidth = 0.8; c.stroke();
            }
            c.globalCompositeOperation = 'source-over';
            c.restore();
          }
          if (!skipWheelProj) this.drawProj(c, it.type === 'old' ? 'old' : it.w || 'pistol', len, it.age,
            snowball || firework || yoyo || keris || diamond || bazooka || gauntlet || magnet || it.w === 'honey' || it.w === 'banana'
              || it.w === 'bee' || it.w === 'moonbeam' || it.w === 'plasma' || it.w === 'blackhole'
              || it.w === 'nail');
          gunState.bigShot = 0;
          gunState.rocketFlash = 0;
          gunState.yoyoFlash = 0;
          gunState.diamondFlash = 0;
          gunState.diamondSeed = 0;
          gunState.bazookaFlash = 0;
          c.restore();
        } else if (it.type === 'spike') {
          c.save();
          c.rotate(it.angle - Math.PI / 2);
          const k = this.spikeOffT > 0 ? Math.min(1, this.spikeOffT / 0.25) * (this.spikeOffT > 0.3 ? 1 : this.spikeOffT / 0.3) : 0;
          // Di boss, duri menempel pas pada permukaan kontur kepala organik boss!
          const itemR = this.level.boss ? getExactBossRadius(this.level.style as BossType, it.angle, R) : R;
          c.translate(0, itemR - 6 - (SPIKE_LEN + 4) * SPIKE_SCALE * Math.min(1, k * 1.5));
          this.drawSpike(c);
          c.restore();
        }
      }
      const facePad = this.level.boss ? 40 : 4;
      if (this.rock) {
        this.rock.draw(c, R, this.time);
        const sc = R / 196;
        for (const shot of this.rockBullets) this.drawEmbeddedShot(c, shot, shot.x * sc, shot.y * sc, 7);
        if (this.level.mode === 'bonus') this.drawBonusRing(c, R);
      } else if (this.chest) {
        c.save();
        c.translate(0, 15);
        this.chest.draw(c, this.time, cc => {
          for (const shot of this.chestBullets) this.drawEmbeddedShot(cc, shot, shot.x, shot.y,
            (getWeapon(shot.w).stick + EMBED) * 0.5);
        });
        c.restore();
      } else {
        c.drawImage(this.face, -R - facePad, -R - facePad, (R + facePad) * 2, (R + facePad) * 2);
      }
      // Slide 2's artist draws every round it leaves in the target — shark jaws
      // clamped on the board, a stone buried in the bamboo, a shell rammed into
      // armour. Drawn after the wheel face so the round sits on top of it.
      if (this.setTwoLook) {
        const pins: SetTwoPin[] = [];
        for (const it of this.items) {
          if (it.type !== 'bullet' || !it.setTwo) continue;
          pins.push({
            a: it.angle,
            hue: it.hue ?? 28,
            seed: (it.angle * 3.7) % 10,
            flash: Math.max(0, 1 - it.age * 5),
            bite: Math.max(0, 1 - it.age * 1.6),
          });
        }
        if (pins.length > 0) drawSetTwoPins(c, this.weapon.id, this.time, R, pins);
      }
      // Slide #8 Keris & Slide #3 Bazooka rim crater on top of target face
      for (const it of this.items) {
        if (it.type === 'bullet' && it.w === 'keris') {
          c.save();
          c.rotate(it.angle - Math.PI / 2);
          const sink = Math.max(0, 1 - it.age * 12) * 6;
          const itemR = this.level.boss ? getExactBossRadius(this.level.style as BossType, it.angle, R) : R;
          c.translate(0, itemR + sink);
          if (it.scale) c.scale(it.scale, it.scale);
          drawKerisStuckCrater(c, 0, this.time);
          c.restore();
        } else if (it.type === 'bullet' && it.w === 'bazooka') {
          c.save();
          c.rotate(it.angle - Math.PI / 2);
          const sink = Math.max(0, 1 - it.age * 12) * 6;
          const itemR = this.level.boss ? getExactBossRadius(this.level.style as BossType, it.angle, R) : R;
          c.translate(0, itemR - 3 + sink);
          if (it.scale) c.scale(it.scale, it.scale);
          drawSlide3BazookaStuckCrater(c, this.time, it.angle * 3.7, Math.max(0.38, 1 - it.age * 0.8));
          c.restore();
        }
      }
      if (this.kerisState && this.kerisState.crawlArcs.length > 0) {
        drawKerisSurfaceArcs(c, this.kerisState, R, 0, this.time);
      }
      if (this.wheelFlash > 0 && this.level.mode !== 'treasure') {
        // Slide-7 impact tint: only the target lights up (game-3 wheelFlash).
        c.save();
        c.globalCompositeOperation = 'lighter';
        c.globalAlpha = this.wheelFlash * 0.2;
        c.beginPath();
        c.arc(0, 0, R, 0, TAU);
        c.fillStyle = `rgb(${this.wheelFlashRgb})`;
        c.fill();
        c.restore();
      }
      if (this.hitFlash > 0 && !isSpecial(this.level.mode)) {
        c.beginPath();
        c.arc(0, 0, R, 0, TAU);
        // Brief surface flash: the whole circular board/boss lights up on impact.
        c.fillStyle = `rgba(255,255,255,${this.hitFlash * 0.28})`;
        c.fill();
      }
      if (this.slowT > 0) {
        const fa = Math.min(1, this.slowT / 0.3);
        if (this.slowKind === 'water') {
          drawWetSurface(c, R, this.time, fa);
        } else {
          c.beginPath();
          c.arc(0, 0, R, 0, TAU);
          c.fillStyle = `rgba(${this.slowRgb},${(this.slowKind === 'honey' ? 0.10 : 0.28) * fa})`;
          c.fill();
          c.strokeStyle = `rgba(${this.slowRgb},${(this.slowKind === 'honey' ? 0.48 : 0.9) * fa})`;
          c.lineWidth = 4;
          c.stroke();
          c.strokeStyle = `rgba(255,255,255,${0.5 * fa})`;
          c.lineWidth = 1.2;
          if (this.slowKind === 'honey') {
            // The honey film clings to the turning target instead of becoming
            // the Soaker's blue wet sheen or a field of icy glass cracks.
            c.strokeStyle = `rgba(255,232,143,${0.5 * fa})`;
            c.lineWidth = 2.4; c.lineCap = 'round';
            c.beginPath(); c.arc(0, 0, R - 6, 0.2, 1.85); c.stroke();
          } else if (this.slowKind === 'ice') {
            for (let i = 0; i < 8; i++) {
              const a = (i / 8) * TAU;
              c.beginPath();
              c.moveTo(Math.cos(a) * R * 0.3, Math.sin(a) * R * 0.3);
              c.lineTo(Math.cos(a + 0.15) * R * 0.95, Math.sin(a + 0.15) * R * 0.95);
              c.stroke();
            }
          } else {
            c.save();
            c.rotate(-this.rot);
            c.strokeStyle = `rgba(254,240,138,${0.9 * fa})`;
            c.lineWidth = 2;
            for (let i = 0; i < 12; i++) {
              const a = (i / 12) * TAU;
              c.beginPath();
              c.moveTo(Math.cos(a) * (R - 12), Math.sin(a) * (R - 12));
              c.lineTo(Math.cos(a) * (R - 3), Math.sin(a) * (R - 3));
              c.stroke();
            }
            c.lineWidth = 4;
            c.lineCap = 'round';
            c.beginPath();
            c.moveTo(0, 0);
            c.lineTo(0, -R * 0.6);
            c.moveTo(0, 0);
            c.lineTo(R * 0.4, 0);
            c.stroke();
            c.restore();
          }
        }
      }
      if (this.burnT > 0) {
        const fa = Math.min(1, this.burnT / 0.4);
        c.beginPath();
        c.arc(0, 0, R, 0, TAU);
        c.fillStyle = `rgba(255,100,20,${0.15 * fa + 0.05 * Math.sin(this.time * 20)})`;
        c.fill();
      }
      for (const it of this.items) {
        if (it.type !== 'coin' && it.type !== 'diamond_chest') continue;
        c.save();
        c.rotate(it.angle - Math.PI / 2);
        const itemR = this.level.boss ? getExactBossRadius(this.level.style as BossType, it.angle, R) : R;
        if (it.type === 'coin') {
          c.translate(0, itemR + 18);
          this.drawCoin(c, this.time + it.angle);
        } else {
          // Diamond menancap di permukaan papan target (garis lingkaran R)
          // Bagian kerucut masuk ke dalam (< R), bagian mahkota muncul keluar (> R)
          c.translate(0, itemR + 2);
          this.drawEmbeddedDiamond(c, this.time + it.angle, it.hits || 0);
        }
      c.restore();
      }
      c.restore();
    }

    // fragments
    for (const f of this.frags) {
      c.save();
      c.translate(f.x, f.y);
      c.rotate(f.rot);
      c.beginPath();
      c.moveTo(0, 0);
      c.arc(0, 0, R + 1, f.a0, f.a1);
      c.closePath();
      c.clip();
      const fragPad = this.level.boss ? 40 : 4;
      c.drawImage(this.face, -R - fragPad, -R - fragPad, (R + fragPad) * 2, (R + fragPad) * 2);
      c.restore();
    }
    // Real, textured chunks keep their embedded rounds as they tumble away.
    for (const f of this.fallenCells) {
      c.save();
      c.globalAlpha = Math.min(1, f.life * 3);
      c.translate(f.x, f.y);
      c.rotate(f.rot);
      c.shadowColor = 'rgba(0,0,0,0.38)';
      c.shadowBlur = 5;
      c.shadowOffsetY = 3;
      this.rock?.drawFallenCell(c, f.id, R);
      c.shadowBlur = 0;
      c.shadowOffsetY = 0;
      const sc = R / 196;
      for (const shot of f.bullets) {
        this.drawEmbeddedShot(c, shot, (shot.x - f.cx) * sc, (shot.y - f.cy) * sc, 7);
      }
      c.restore();
    }
    // ═══ FRAGMEN BATU (boulder shatter) ═══
    for (const f of this.rockFragments) {
      const a = Math.max(0, Math.min(1, f.life / 0.6));
      c.save();
      c.globalAlpha = a;
      c.translate(f.x, f.y);
      c.rotate(f.rot);
      drawRockFragment(c, f.size, f.seed);
      c.restore();
    }

    // The star travels across the gap with a short glowing trail, not a gun-aim arrow.
    if (this.star) {
      const st = this.star;
      const blink = st.life < 0.8 ? (Math.floor(this.time * 8) % 2 ? 0.35 : 1) : 1;
      c.save();
      c.globalCompositeOperation = 'lighter';
      for (let i = 1; i <= 3; i++) {
        c.globalAlpha = blink * (0.52 - i * 0.11);
        c.fillStyle = '#ffd54a';
        c.beginPath();
        c.ellipse(st.x - Math.sign(st.vx) * (st.r + i * 12), st.y + Math.sin(st.age * 4 - i) * 5, 6 - i, 4 - i * 0.5, 0, 0, TAU);
        c.fill();
      }
      c.restore();
      c.save();
      c.globalAlpha = blink;
      drawStar(c, st.x, st.y, st.r, this.time, '250,204,21');
      c.restore();
    }

    for (const f of this.flyers) {
      c.save();
      c.translate(f.x, f.y);
      c.rotate(f.rot);
      if (f.kind === 'spike') this.drawSpike(c);
      else if (f.kind === 'coin') this.drawCoin(c, this.time);
      else if (f.kind === 'diamond_chest') this.drawEmbeddedDiamond(c, this.time, 1);
      else {
        if (f.w === 'firework') {
          gunState.rocketHue = f.hue ?? 340;
          gunState.rocketFlash = 0;
        }
        if (f.w === 'yoyo') {
          gunState.yoyoHue = f.hue ?? 0;
          gunState.yoyoFlash = 0;
        }
        c.translate(0, -BLEN / 2);
        this.drawProj(c, f.kind === 'old' ? 'old' : f.w || 'pistol');
      }
      c.restore();
    }

    // projectiles
    for (const p of this.projs) {
      if (p.spawnDelay && p.spawnDelay > 0) continue;
      const wid = this.weapon.id;
      const trailCol = this.weapon.trail;
      const ang = Math.atan2(p.vx, this.weapon.speed);
      // Slide-7 SET 1 rounds are painted by slide 7's own renderers.
      if (p.setOne) {
        this.drawCarriedRound(c, p, () => this.s1.drawShot(c, p.setOne!, p.x, p.y));
        continue;
      }
      // …and so are the SET 2..5 rounds.
      if (p.setSeven) {
        this.drawCarriedRound(c, p, () => p.setSeven!.draw(c));
        continue;
      }
      if (p.setSevenPending) continue;
      if (p.s7Ghost) continue;
      // Slide 9 draws its own rounds (and beams) from its own layer.
      if (p.setNine) {
        this.drawCarriedRound(c, p, () => this.s9.drawShot(c, p.setNine!));
        continue;
      }
      if (p.setNinePending || p.s9Ghost) continue;
      // …and so does slide 11.
      if (p.setEleven) {
        this.drawCarriedRound(c, p, () => this.s11.drawShot(c, p.setEleven!));
        continue;
      }
      if (p.setElevenPending || p.s11Ghost) continue;
      // Slide 2's own round art (orb, shell, grenade, bolt, stone, drop, rocket).
      if (p.setTwo) {
        const s2id = this.setTwoId;
        if (s2id) this.drawCarriedRound(c, p, () => this.s2w.drawRound(c, s2id, p.setTwo!, p.x, p.y, this.time));
        continue;
      }
      if (this.weapon.rope) {
        if (wid === 'yoyo') {
          const gunX = p.originX ?? CX;
          const gunY = GUN_Y + this.recoil * 22 + 24;
          drawSlide6String(
            c,
            { x: gunX - 18, y: gunY + 46 },
            { x: p.x, y: p.y + 15 },
            7,
            4,
            this.time * 32,
            0,
            1,
            p.hue ?? gunState.yoyoHue,
          );
        } else {
          c.strokeStyle = 'rgba(254,243,199,0.9)';
          c.lineWidth = 1.2;
          c.beginPath();
          c.moveTo((p.originX ?? CX) - 14, GUN_Y + 198 + this.recoil * 22);
          c.quadraticCurveTo((p.originX ?? CX) + 10, (p.y + GUN_Y) / 2 + 30, p.x, p.y + 40);
          c.stroke();
        }
      }
      const fxp = FX[wid];
      // afterimages
      if (fxp.ghost && wid !== 'diamond' && p.hist) {
        for (let gi = 0; gi < p.hist.length; gi++) {
          const h = p.hist[gi];
          c.save();
          c.globalAlpha = ((gi + 1) / (p.hist.length + 1)) * 0.32;
          c.translate(h.x, h.y);
          c.rotate(-ang);
          if (this.weapon.energy) c.globalCompositeOperation = 'lighter';
          this.drawProj(c, wid);
          c.restore();
        }
      }
      // The moving singularity pulls a helical light tether from its actual
      // muzzle (both muzzles when doubled). It still collides as a projectile.
      if (wid === 'blackhole' && this.slide2Void) {
        drawBlackHoleShot2(c, p.x, p.y, this.s2Hue, this.time);
        continue;
      }
      if (wid === 'blackhole' && getGunEffect(wid) === 'new' && this.slide2Void) {
        drawVoidTether(c, p.x, p.y, p.originX ?? CX,
          GUN_Y + this.recoil * 22, this.time);
      }
      c.save();
      c.translate(p.x, p.y);
      c.rotate(-ang);
      // Water/snow have material trails, and a portal must remain a compact
      // ring; the usual white laser wedge made all three look like tadpoles.
      // The xenomorph glob is painted by the metaball layer; drawing the old
      // sprite + wedge on top of it produced the "stacked circles" look.
      if (wid !== 'xeno' && !drawMaterialTrail(c, wid, wid === 'diamond' ? 'new' : undefined)) {
        const tl = Math.min(260, 50 + this.weapon.speed * 0.045) * fxp.streak;
        const tw = Math.max(2, this.weapon.half) * 1.25
          * projectileSizeMultiplier(wid, !!p.mini, !!p.giant);
        c.globalCompositeOperation = 'lighter';
        const tg = c.createLinearGradient(0, 6, 0, 6 + tl);
        tg.addColorStop(0, `rgba(${trailCol},0.75)`);
        tg.addColorStop(0.35, `rgba(${trailCol},0.28)`);
        tg.addColorStop(1, `rgba(${trailCol},0)`);
        c.fillStyle = tg;
        c.beginPath();
        c.moveTo(-tw, 8);
        c.lineTo(tw, 8);
        c.lineTo(0.5, 8 + tl);
        c.lineTo(-0.5, 8 + tl);
        c.closePath();
        c.fill();
        const cg = c.createLinearGradient(0, 6, 0, 6 + tl * 0.55);
        cg.addColorStop(0, 'rgba(255,255,255,0.85)');
        cg.addColorStop(1, 'rgba(255,255,255,0)');
        c.fillStyle = cg;
        c.fillRect(-0.9, 8, 1.8, tl * 0.55);
        const hr = tw * 4.5;
        const hg = c.createRadialGradient(0, 6, 0, 0, 6, hr);
        hg.addColorStop(0, `rgba(${trailCol},0.55)`);
        hg.addColorStop(1, `rgba(${trailCol},0)`);
        c.fillStyle = hg;
        c.beginPath();
        c.arc(0, 6, hr, 0, TAU);
        c.fill();
        c.globalCompositeOperation = 'source-over';
      }
      gunState.bigShot = p.big ?? 0;
      if (p.tint) gunState.tint = p.tint;
      if (wid === 'firework') {
        gunState.rocketHue = p.hue ?? 340;
        gunState.rocketFlash = p.flash ?? 0;
      }
      if (wid === 'yoyo') {
        gunState.yoyoHue = p.hue ?? 0;
        gunState.yoyoFlash = p.flash ?? 0;
      }
      if (wid === 'diamond') {
        gunState.diamondFlash = p.flash ?? 0;
        gunState.diamondSeed = (p.hue ?? 205) * 0.13;
      }
      if (wid === 'bazooka') {
        gunState.bazookaHue = p.hue ?? 45;
        gunState.bazookaFlash = p.flash ?? 0;
        gunState.bazookaSeed = (p.hue ?? 45) * 0.13;
      }
      if (p.big) c.scale(1 + p.big * 0.3, 1 + p.big * 0.3);
      const sizeMultiplier = projectileSizeMultiplier(wid, !!p.mini, !!p.giant);
      if (sizeMultiplier !== 1) c.scale(sizeMultiplier, sizeMultiplier);
      if (this.weapon.spinFly) {
        const l2 = this.weapon.stick + EMBED;
        c.translate(0, l2 / 2);
        c.rotate(this.time * 28);
        c.translate(0, -l2 / 2);
      }
      if (wid !== 'xeno') this.drawProj(c, wid);
      gunState.rocketFlash = 0;
      gunState.yoyoFlash = 0;
      gunState.diamondFlash = 0;
      gunState.diamondSeed = 0;
      gunState.bazookaFlash = 0;
      c.restore();
    }
    void this.failProjAngle;

    // portals
    for (const pt of this.portals) {
      const a = pt.life / pt.max;
      const s = Math.sin(a * Math.PI);
      c.save();
      c.translate(pt.x, pt.y);
      c.globalCompositeOperation = 'lighter';
      const g = c.createRadialGradient(0, 0, 2, 0, 0, 30 * s);
      g.addColorStop(0, 'rgba(255,255,255,0.9)');
      g.addColorStop(0.5, `rgba(${pt.rgb},0.8)`);
      g.addColorStop(1, `rgba(${pt.rgb},0)`);
      c.fillStyle = g;
      c.beginPath();
      c.ellipse(0, 0, 30 * s, 14 * s, 0, 0, TAU);
      c.fill();
      c.strokeStyle = `rgba(${pt.rgb},${a})`;
      c.lineWidth = 3;
      c.beginPath();
      c.ellipse(0, 0, 24 * s, 10 * s, 0, 0, TAU);
      c.stroke();
      c.restore();
    }

    // ---------------- Distinct, flat boss attack silhouettes ----------------
    for (const bp of this.bossProjs) drawBossProjectile(c, bp, this.time);

    if (this.state !== 'idle') {
      this.drawGunNow(c);
      this.drawTriLaser(c);
    }

    // ---- acid fluid (metaball) layer — slide 7 Acid Spitter parity ----
    // Drawn after the gun and the wheel, exactly like games/game-3, so the
    // glob covers the muzzle and the acid on the rim melts into one body.
    if (this.state !== 'idle' && this.hasAcidLayer()) {
      this.collectAcidBlobs();
      const hot = this.weapon.id === 'xeno'
        ? this.projs.filter((p) => !(p.spawnDelay && p.spawnDelay > 0)).map((p) => ({ x: p.x + Math.sin((p.t ?? 0) * 40) * 1.5, y: p.y }))
        : [];
      this.acidFluid.render(c, W, H, hot);
    }

    // Real gold pieces leap out of the chest, scatter, fall and bounce, then
    // sweep into the HUD. They render in front of the guns and behind the HUD.
    for (const coin of this.treasureCoins) {
      if (coin.delay > 0) continue;
      const scale = coin.state === 'collect' ? 1 - 0.45 * coin.collectT / coin.collectDuration : 1;
      drawBonusCoin(c, coin.x, coin.y, coin.r * scale, this.time, coin.phase, true);
    }

    // Droplets are one batched path per colour; the loop below skips them.
    drawDropParticles(c, this.particles);

    // particles
    for (const p of this.particles) {
      const a = Math.max(0, p.life / p.max);
      // Below ~4% alpha nothing is visible on a phone screen, but each one still
      // costs a fill. Skipping them keeps a paintball burst from paying for a
      // hundred invisible droplets.
      if ((a < 0.04 && p.kind !== 'text') || p.kind === 'drop') continue;
      switch (p.kind) {
        case 'spark':
          c.strokeStyle = cssColor(p.color);
          c.globalAlpha = a;
          c.lineWidth = p.size;
          c.beginPath();
          c.moveTo(p.x, p.y);
          c.lineTo(p.x - p.vx * 0.025, p.y - p.vy * 0.025);
          c.stroke();
          c.globalAlpha = 1;
          break;
        case 'chip':
          c.save();
          c.globalAlpha = Math.min(1, a * 2);
          c.translate(p.x, p.y);
          c.rotate(p.rot);
          c.fillStyle = cssColor(p.color);
          c.fillRect(-p.size / 2, -p.size / 3, p.size, p.size * 0.66);
          c.restore();
          break;
        case 'smoke':
          // Soft plumes: a filled arc left a hard-edged disc, while slide 7
          // draws smoke through its glow sprite. Gradient falloff matches it,
          // and the gradient is cached per colour instead of being rebuilt for
          // every plume on every frame.
          drawSmokeParticle(c, p, a);
          break;
        case 'shell':
          c.save();
          c.translate(p.x, p.y);
          c.rotate(p.rot);
          c.globalAlpha = Math.min(1, a * 3);
          c.fillStyle = cssColor(p.color);
          c.fillRect(-3.5, -7, 7, 13);
          c.fillStyle = 'rgba(255,255,255,0.5)';
          c.fillRect(-1.5, -6, 1.5, 11);
          c.fillStyle = 'rgba(0,0,0,0.35)';
          c.fillRect(-4, 5, 8, 2.5);
          c.restore();
          break;
        case 'bolt': {
          c.save();
          c.globalCompositeOperation = 'lighter';
          c.shadowColor = cssColor(p.color);
          c.shadowBlur = 12;
          c.lineJoin = 'round';
          for (const [lw, col] of [[p.size * 2.5 * a, cssColor(p.color)], [p.size * 0.8 * a, '#ffffff']] as const) {
            c.strokeStyle = col;
            c.lineWidth = lw;
            c.beginPath();
            c.moveTo(p.x, p.y);
            const tx = p.tx ?? p.x;
            const ty = p.ty ?? p.y;
            for (let k = 1; k < 7; k++) {
              const f = k / 7;
              c.lineTo(p.x + (tx - p.x) * f + rand(-7, 7), p.y + (ty - p.y) * f + rand(-7, 7));
            }
            c.lineTo(tx, ty);
            c.stroke();
          }
          c.restore();
          break;
        }
        case 'glow': {
          c.save();
          c.globalCompositeOperation = 'lighter';
          const r = p.size * (0.5 + a * 0.8);
          const gg = c.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 2);
          gg.addColorStop(0, `rgba(255,255,255,${a})`);
          gg.addColorStop(0.3, cssColor(p.color, a * 0.9));
          gg.addColorStop(1, cssColor(p.color, 0));
          c.fillStyle = gg;
          c.beginPath();
          c.arc(p.x, p.y, r * 2, 0, TAU);
          c.fill();
          c.restore();
          break;
        }
        case 'ring': {
          const t = 1 - a;
          c.strokeStyle = cssColor(p.color);
          c.globalAlpha = a * 0.8;
          c.lineWidth = 4 * a + 1;
          c.beginPath();
          c.arc(p.x, p.y, p.size * (0.2 + t * 0.8), 0, TAU);
          c.stroke();
          c.globalAlpha = 1;
          break;
        }
        case 'text': {
          const k = a;
          const pop = k < 0.15 ? 1.6 - (k / 0.15) * 0.6 : 1;
          const al = k > 0.7 ? 1 - (k - 0.7) / 0.3 : 1;
          c.save();
          c.translate(p.x, p.y);
          c.rotate(p.rot);
          c.scale(pop, pop);
          c.globalAlpha = al;
          c.font = `italic 900 ${p.size}px Impact, 'Arial Black', sans-serif`;
          c.textAlign = 'center';
          c.textBaseline = 'middle';
          c.lineJoin = 'round';
          c.strokeStyle = '#1a0a00'; c.lineWidth = p.size * 0.28;
          c.strokeText(p.text || '', 0, 0);
          c.strokeStyle = '#ffffff'; c.lineWidth = p.size * 0.14;
          c.strokeText(p.text || '', 0, 0);
          const tg = c.createLinearGradient(0, -p.size / 2, 0, p.size / 2);
          tg.addColorStop(0, '#fff6b0'); tg.addColorStop(0.5, cssColor(p.color)); tg.addColorStop(1, '#ff7a00');
          c.fillStyle = tg;
          c.fillText(p.text || '', 0, 0);
          c.restore();
          break;
        }
        default:
          drawFxParticle(c, p, this.time);
          break;
      }
    }

    if (this.state !== 'idle' && (this.weapon.id === 'firework' || (this.fwState && (this.fwState.particles.length > 0 || this.fwState.rings.length > 0)))) {
      drawFirework8ParticlesAndRings(c, this.getFwState());
    }
    // Slide-2 FX layer (black-hole voids, jets, warped starlight, smoke).
    if (this.s2State && (this.slide2Void || this.s2State.particles.length > 0 || this.s2State.voids.length > 0
      || this.s2State.glows.length > 0 || this.s2State.rings.length > 0 || this.s2State.jets.length > 0
      || this.s2State.beams.length > 0 || this.s2State.smokes.length > 0 || this.s2State.fireballs.length > 0
      || this.s2State.flashes.length > 0 || this.s2State.texts.length > 0)) {
      this.s2State.draw(c, this.time);
    }
    // Slide 2's own layer for the eight exported weapons: its rounds' bursts,
    // bubbles, bite marks, shrapnel and callouts.
    if (this.s2wState && (this.s2wState.busy || this.setTwoLive)) {
      try {
        this.s2wState.draw(c, this.time);
        this.s2wState.drawSky(c);
      } catch {
        /* slide 2's own art must never blank slide 1 */
      }
    }
    // Slide 6 layer: scorch marks on the wheel face, then its beams and the
    // burst that follows them.
    if (this.s6State && (this.s6State.busy || this.setSixLive)) {
      try {
        this.s6State.drawWheel(c, CX, this.targetY + this.bump * 7, this.level.radius, this.rot);
        this.s6State.drawBeam(c);
        this.s6State.draw(c);
      } catch {
        /* keep drawing slide 1 */
      }
    }
    // Slide 9 layer: entry holes ride the wheel, rounds and bursts on top.
    if (this.s11State && (this.s11State.busy || this.setElevenLive)) {
      // A bad frame from slide 11's own art must not blank slide 1.
      try {
        this.s11State.drawWheel(c, CX, this.targetY + this.bump * 7, this.level.radius, this.rot);
        this.s11State.drawBeam(c);
        this.s11State.draw(c);
      } catch {
        /* keep drawing slide 1 */
      }
    }
    if (this.s9State && (this.s9State.busy || this.setNineLive)) {
      this.s9State.drawWheel(c, CX, this.targetY + this.bump * 7, this.level.radius, this.rot);
      this.s9State.draw(c);
    }
    // Slide-7 SET 2..5 layer: wheel-space FX, then particles and FX objects.
    if (this.s7State && (this.s7State.busy || this.setSevenLive)) {
      this.s7State.drawWheel(c, CX, this.targetY + this.bump * 7, this.level.radius, this.rot);
      this.s7State.draw(c);
      this.s7State.drawFront(c);
    }
    // Slide-7 SET 1 layer: wheel-space sparks first, then its particles/FX.
    if (this.s1State && (this.s1State.busy || this.setOneLive)) {
      this.s1State.drawWheel(c, CX, this.targetY + this.bump * 7);
      this.s1State.draw(c);
      this.s1State.drawFront(c);
    }
    if (
      this.state !== 'idle' &&
      (this.weapon.id === 'yoyo' ||
        (this.yoyoState &&
          (this.yoyoState.particles.length > 0 ||
            this.yoyoState.rings.length > 0 ||
            this.yoyoState.strings.length > 0 ||
            this.yoyoState.flash > 0.01 ||
            this.yoyoState.wpulse > 0.01)))
    ) {
      drawYoyoSlideParticlesRingsAndStrings(c, this.getYoyoState(), CX, this.targetY, this.time);
    }
    if (
      this.state !== 'idle' &&
      (this.weapon.id === 'keris' ||
        (this.kerisState &&
          (this.kerisState.particles.length > 0 ||
            this.kerisState.thunderFlash > 0.01)))
    ) {
      drawKerisSlideParticlesAndArcs(c, this.getKerisState(), W, H);
    }
    if (
      this.state !== 'idle' &&
      (this.weapon.id === 'diamond' ||
        (this.diamondState &&
          (this.diamondState.particles.length > 0 ||
            this.diamondState.shards.length > 0 ||
            this.diamondState.rings.length > 0 ||
            this.diamondState.starflashes.length > 0 ||
            this.diamondState.flash > 0.01 ||
            this.diamondState.wpulse > 0.01)))
    ) {
      drawDiamondSlideForeground(c, this.getDiamondState(), CX, this.targetY);
    }
    if (
      this.state !== 'idle' &&
      (this.weapon.id === 'bazooka' ||
        (this.bazookaState &&
          (this.bazookaState.particles.length > 0 ||
            this.bazookaState.smokes.length > 0 ||
            this.bazookaState.fireballs.length > 0 ||
            this.bazookaState.flashes.length > 0 ||
            this.bazookaState.debris.length > 0 ||
            this.bazookaState.screenFlash > 0.01)))
    ) {
      this.getBazookaState().drawForeground(c, W, H);
    }

    // dynamic lights (bloom-like)
    if (this.lights.length) {
      c.save();
      c.globalCompositeOperation = 'lighter';
      for (const l of this.lights) {
        const a = l.life / l.max;
        const g = c.createRadialGradient(l.x, l.y, 0, l.x, l.y, l.r);
        g.addColorStop(0, `rgba(${l.rgb},${0.42 * a})`);
        g.addColorStop(0.3, `rgba(${l.rgb},${0.16 * a})`);
        g.addColorStop(1, `rgba(${l.rgb},0)`);
        c.fillStyle = g;
        c.fillRect(l.x - l.r, l.y - l.r, l.r * 2, l.r * 2);
      }
      c.restore();
    }
    c.restore();

    // weapon-colored impact tint
    if (this.tintA > 0) {
      const tg2 = c.createRadialGradient(CX, H / 2, H * 0.2, CX, H / 2, H * 0.75);
      tg2.addColorStop(0, `rgba(${this.tintRgb},0)`);
      tg2.addColorStop(1, `rgba(${this.tintRgb},${this.tintA})`);
      c.save();
      c.globalCompositeOperation = 'lighter';
      c.fillStyle = tg2;
      c.fillRect(0, 0, W, H);
      c.restore();
    }

    // vignette
    const vg = c.createRadialGradient(CX, H / 2, H * 0.3, CX, H / 2, H * 0.75);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,0.55)');
    c.fillStyle = vg;
    c.fillRect(0, 0, W, H);

    // sniper scope overlay
    if (this.aiming) {
      const k2 = Math.min(1, this.aimT / 0.15);
      const rr2 = 520 - (520 - (R + 80)) * k2;
      c.save();
      c.beginPath();
      c.rect(0, 0, W, H);
      c.arc(CX, this.targetY + R * 0.5, rr2, 0, TAU, true);
      c.fillStyle = `rgba(0,0,0,${0.75 * k2})`;
      c.fill('evenodd');
      c.strokeStyle = `rgba(0,0,0,${0.9 * k2})`;
      c.lineWidth = 6;
      c.beginPath();
      c.arc(CX, this.targetY + R * 0.5, rr2, 0, TAU);
      c.stroke();
      c.strokeStyle = `rgba(255,40,40,${0.85 * k2})`;
      c.lineWidth = 1.2;
      c.beginPath();
      c.moveTo(CX, this.targetY + R * 0.5 - rr2);
      c.lineTo(CX, this.targetY + R * 0.5 + rr2);
      c.moveTo(CX - rr2, this.targetY + R * 0.5);
      c.lineTo(CX + rr2, this.targetY + R * 0.5);
      c.stroke();
      c.beginPath();
      c.arc(CX, this.targetY + R, 6, 0, TAU);
      c.stroke();
      for (let i = 1; i < 5; i++) {
        c.beginPath();
        c.moveTo(CX - 5, this.targetY + R * 0.5 + i * 22);
        c.lineTo(CX + 5, this.targetY + R * 0.5 + i * 22);
        c.stroke();
      }
      c.fillStyle = `rgba(255,80,80,${k2})`;
      c.font = "13px 'Russo One', sans-serif";
      c.textAlign = 'center';
      c.fillText('LEPAS UNTUK MENEMBAK', CX, this.targetY + R + rr2 * 0.55);
      c.restore();
    }
    // glitch screen
    if (this.glitchT > 0) {
      for (let i = 0; i < 8; i++) {
        c.fillStyle = pick(['rgba(255,0,85,0.35)', 'rgba(0,255,238,0.35)', 'rgba(34,255,136,0.3)']);
        c.fillRect(0, rand(0, H), W, rand(2, 14));
      }
    }

    if (this.state !== 'idle') this.drawHUD(c);

    if (this.flashWhite > 0) {
      c.fillStyle = `rgba(255,255,255,${this.flashWhite * 0.6})`;
      c.fillRect(0, 0, W, H);
    }
    if (this.flashRed > 0) {
      c.fillStyle = `rgba(255,0,0,${this.flashRed * 0.3})`;
      c.fillRect(0, 0, W, H);
      const rg = c.createRadialGradient(CX, H / 2, H * 0.2, CX, H / 2, H * 0.7);
      rg.addColorStop(0, 'rgba(255,0,0,0)');
      rg.addColorStop(1, `rgba(255,0,0,${this.flashRed * 0.5})`);
      c.fillStyle = rg;
      c.fillRect(0, 0, W, H);
    }
  }

  private drawHUD(c: CanvasRenderingContext2D) {
    const font = (s: number) => `${s}px 'Russo One', sans-serif`;
    c.textBaseline = 'middle';
    // score
    c.textAlign = 'left';
    c.font = font(isSpecial(this.level.mode) ? 29 : 40);
    c.lineWidth = 5;
    c.strokeStyle = 'rgba(0,0,0,0.6)';
    c.strokeText(String(this.score), 22, isSpecial(this.level.mode) ? 34 : 46);
    c.fillStyle = '#ffffff';
    c.fillText(String(this.score), 22, isSpecial(this.level.mode) ? 34 : 46);

    // combo badge di HUD kiri atas (di bawah skor angka, tidak menutupi target!)
    const cWindow = this.weapon.comboWindow ?? 0.5;
    const timeSinceHit = this.time - this.lastHit;
    if (this.combo >= 2 && timeSinceHit < cWindow) {
      const leftFrac = Math.max(0, 1 - (timeSinceHit / cWindow));
      const popScale = 1 + this.comboPop * 0.28;
      c.save();
      c.translate(22, 74);
      c.scale(popScale, popScale);
      c.textAlign = 'left';
      c.font = font(13);
      c.lineWidth = 3;
      c.strokeStyle = 'rgba(0,0,0,0.85)';
      const comboText = `⚡ COMBO x${this.combo}`;
      c.strokeText(comboText, 0, 0);
      c.fillStyle = this.combo >= 5 ? '#f43f5e' : this.combo >= 3 ? '#ffd23f' : '#38bdf8';
      c.fillText(comboText, 0, 0);

      // Bar timer combo halus yang menyusut
      c.fillStyle = 'rgba(255,255,255,0.18)';
      c.fillRect(0, 9, 82, 3);
      c.fillStyle = this.combo >= 5 ? '#f43f5e' : this.combo >= 3 ? '#ffd23f' : '#38bdf8';
      c.fillRect(0, 9, 82 * leftFrac, 3);
      c.restore();
    }

    // coins
    c.textAlign = 'right';
    c.font = font(22);
    const coinY = isSpecial(this.level.mode) ? 34 : 44;
    c.strokeText(String(this.coins), W - 46, coinY);
    c.save();
    c.fillStyle = '#ffd23f';
    c.shadowColor = '#fbbf24';
    c.shadowBlur = 13 * this.coinPulse;
    c.fillText(String(this.coins), W - 46, coinY);
    c.restore();
    c.save();
    c.translate(W - 28, coinY);
    c.scale(1 + this.coinPulse * 0.16, 1 + this.coinPulse * 0.16);
    this.drawCoin(c, 0, false); // no oversized halo clipped by the HUD edge
    c.restore();

    // Stage identity and countdown are above the target, never over the diamond.
    const n = this.level.n;
    c.textAlign = 'center';
    const modeLabel = this.level.mode === 'boulder' ? `💎 DIAMOND BREAKER • LV ${n}`
      : this.level.mode === 'bonus' ? `🪙 BONUS STAGE • LV ${n}`
      : this.level.mode === 'treasure' ? `🧰 HARTA KARUN • LV ${n}`
      : this.level.mode === 'double' ? `🔫🔫 DOUBLE GUN • LEVEL ${n}`
      : this.level.boss ? `BOSS • ${this.level.name}` : `LEVEL ${n}`;
    c.font = font(isSpecial(this.level.mode) ? 13 : 16);
    c.fillStyle = this.level.mode === 'treasure' || this.level.mode === 'bonus' ? '#fde68a'
      : this.level.mode === 'boulder' ? '#a5f3fc' : this.level.boss ? '#ff5050' : '#ffffff';
    c.fillText(modeLabel, CX, isSpecial(this.level.mode) ? 20 : 30);

    if (isSpecial(this.level.mode)) {
      c.save();
      c.fillStyle = 'rgba(5,12,24,0.78)';
      c.strokeStyle = this.level.mode === 'boulder' ? 'rgba(103,232,249,0.7)' : 'rgba(252,211,77,0.7)';
      c.lineWidth = 1.5;
      c.beginPath(); c.roundRect(CX - 62, 39, 124, 31, 12); c.fill(); c.stroke();
      c.font = font(18);
      c.fillStyle = this.stageTime < 8 ? '#fb7185' : '#ffffff';
      c.fillText(`⏱ ${this.stageTime.toFixed(1)}s`, CX, 56);
      c.font = font(12);
      c.fillStyle = '#ffffff';
      if (this.level.mode === 'boulder') {
        const barX = CX - 105, barY = 102, ratio = 1 - this.level.hp / Math.max(1, this.level.maxHp);
        c.fillStyle = 'rgba(2,12,25,0.85)';
        c.beginPath(); c.roundRect(barX - 3, barY - 3, 216, 15, 7); c.fill();
        c.fillStyle = '#164e63'; c.fillRect(barX, barY, 210, 9);
        const g = c.createLinearGradient(barX, 0, barX + 210, 0);
        g.addColorStop(0, '#38bdf8'); g.addColorStop(1, '#a5f3fc');
        c.fillStyle = g; c.fillRect(barX, barY, 210 * ratio, 9);
        c.fillStyle = '#d9f9ff';
        c.fillText(`BATU TERKIKIS ${Math.round(ratio * 100)}%`, CX, 87);
      } else if (this.level.mode === 'bonus') {
        c.fillStyle = '#fde68a';
        c.fillText(`KOIN ${this.bonusCoins.filter(coin => coin.taken).length}/${this.bonusCoins.length} • TEMBAK YANG BERPUTAR`, CX, 88);
      } else {
        c.fillStyle = '#fde68a';
        c.fillText(this.treasureBuff === 'double' ? '2 SENJATA AKTIF'
          : this.treasureBuff ? `BONUS ${this.treasureBuff.toUpperCase()} AKTIF` : 'TEMBAK PETI SEBANYAK MUNGKIN!', CX, 88);
      }
      c.restore();
    }

    // TEKKEN-STYLE SATISFYING BOSS HEALTHBAR
    if (this.level.boss) {
      const barW = 200;
      const barH = 12;
      const barX = CX - barW / 2;
      const barY = 46;

      const hpFrac = Math.max(0, Math.min(1, this.bossHp / this.bossMaxHp));
      const hpRedFrac = Math.max(0, Math.min(1, this.bossHpRed / this.bossMaxHp));

      c.save();
      // Outer bevel metallic frame
      c.fillStyle = '#0a0d14';
      c.beginPath();
      c.roundRect(barX - 3, barY - 3, barW + 6, barH + 6, 6);
      c.fill();
      c.strokeStyle = '#eab308';
      c.lineWidth = 1.8;
      c.stroke();

      // Background empty bar
      c.fillStyle = '#261214';
      c.fillRect(barX, barY, barW, barH);

      // Delayed Red damage bar (Tekken ghost health drain)
      c.fillStyle = '#ef4444';
      c.fillRect(barX, barY, barW * hpRedFrac, barH);

      // Foreground yellow/green health gradient
      const hg = c.createLinearGradient(barX, barY, barX + barW, barY);
      hg.addColorStop(0, '#facc15');
      hg.addColorStop(0.5, '#4ade80');
      hg.addColorStop(1, '#22c55e');
      c.fillStyle = hg;
      c.fillRect(barX, barY, barW * hpFrac, barH);

      // Glass specular shine
      c.fillStyle = 'rgba(255,255,255,0.35)';
      c.fillRect(barX, barY, barW * hpFrac, barH * 0.45);

      // HP text
      c.font = 'bold 9px sans-serif';
      c.fillStyle = '#ffffff';
      c.textAlign = 'center';
      c.fillText(`${Math.round(this.bossHp)} / ${this.bossMaxHp} HP`, CX, barY + barH * 0.7);
      c.restore();
    } else if (!isSpecial(this.level.mode)) {
      const idx = (n - 1) % 5;
      for (let i = 0; i < 5; i++) {
        const x = CX - 52 + i * 26;
        const y = 56;
        const isBoss = i === 4;
        c.beginPath();
        if (isBoss) {
          c.save();
          c.translate(x, y);
          c.rotate(Math.PI / 4);
          c.rect(-6, -6, 12, 12);
          c.restore();
        } else {
          c.arc(x, y, i === idx ? 7 : 5.5, 0, TAU);
        }
        if (i < idx) c.fillStyle = '#ffd23f';
        else if (i === idx) c.fillStyle = isBoss ? '#ff3b3b' : '#ffffff';
        else c.fillStyle = isBoss ? 'rgba(255,60,60,0.35)' : 'rgba(255,255,255,0.22)';
        if (i === idx) {
          c.shadowColor = c.fillStyle as string;
          c.shadowBlur = 12;
        }
        c.fill();
        c.shadowBlur = 0;
      }
    }

    // Timed stages refill automatically; the regular ammo buff adds one finite magazine.
    const total = this.level.ammo * this.maxAmmoMult;
    const spacing = Math.min(26, (H * 0.48) / total);
    for (let i = 0; i < total; i++) {
      const x = 30;
      const y = H - 40 - i * spacing;
      c.save();
      if (this.weapon.id === 'yoyo') {
        const used = i >= this.ammoLeft;
        const k = total - 1 - i;
        c.globalAlpha = used ? 0.18 : 1;
        c.translate(x, y - 6);
        drawSlide6Yoyo(c, 0, 0, 8, this.time * 4 + k * 1.6, 0, used ? 200 : yoyoAmmoHue(k));
      } else if (this.weapon.id === 'keris') {
        const used = i >= this.ammoLeft;
        const bob = used ? 0 : Math.sin(this.time * 2.4 + i * 0.5) * 1.4;
        c.translate(x, y - 6 + bob);
        c.scale(0.68, 0.68);
        drawKerisSlideMini(c, this.time + i * 0.3, used);
      } else if (this.weapon.id === 'diamond') {
        const used = i >= this.ammoLeft;
        const k = total - 1 - i;
        c.globalAlpha = used ? 0.18 : 1;
        c.translate(x, y - 6);
        drawSlide2DiamondBullet(c, 7.5, this.time, k * 1.5, 0);
      } else if (this.weapon.id === 'bazooka') {
        const used = i >= this.ammoLeft;
        const k = total - 1 - i;
        c.globalAlpha = used ? 0.18 : 1;
        c.translate(x, y - 16);
        c.scale(0.45, 0.45);
        drawSlide3BazookaShell(c, BAZOOKA_HUES[k % BAZOOKA_HUES.length], this.time, k * 1.5, 0, 0);
      } else {
        c.translate(x, y - 14);
        c.scale(0.5, 0.5);
        if (i < this.ammoLeft) {
          this.drawProj(c, this.weapon.id);
        } else {
          c.globalAlpha = 0.25;
          c.fillStyle = '#000';
          c.fillRect(-6, 0, 12, BLEN);
        }
      }
      c.restore();
    }
    c.textAlign = 'left';
    c.font = font(14);
    c.fillStyle = 'rgba(255,255,255,0.75)';
    c.fillText(this.reloadT > 0 ? 'ISI ULANG…' : `x${this.ammoLeft}`, 46, H - 30);

    // weapon label
    c.textAlign = 'right';
    c.font = font(12);
    c.fillStyle = this.weapon.energy ? this.weapon.color : 'rgba(255,255,255,0.6)';
    c.fillText(`${this.weapon.name}${this.hasTwinGuns ? ' ×2' : ''} • ${this.weapon.perk}`, W - 14, H - 16);
    const wq = this.weapon;
    let info = '';
    if (wq.saves) info = `${wq.emoji} NYAWA: ${'●'.repeat(this.savesLeft)}${'○'.repeat(Math.max(0, wq.saves - this.savesLeft))}`;
    else if (wq.chronoEvery) info = `⏱ ${wq.chronoEvery - (this.perkCount % wq.chronoEvery)} lagi`;
    else if (wq.reverseEvery) info = `🌍 ${wq.reverseEvery - (this.perkCount % wq.reverseEvery)} lagi`;
    else if (wq.snowman) info = `⛄ ${3 - (this.perkCount % 3)} lagi`;
    else if (wq.abductEvery) info = `🛸 culik ${wq.abductEvery - (this.perkCount % wq.abductEvery)} lagi`;
    else if (wq.everyBonus) info = `🎰 lucky ${wq.everyBonus.n - (this.perkCount % wq.everyBonus.n)} lagi`;
    else if (wq.meltEvery && wq.meltEvery > 1) info = `✏️ hapus ${wq.meltEvery - (this.perkCount % wq.meltEvery)} lagi`;
    else if (wq.paint && this.lastPaint) info = '🎨 warna terakhir ●';
    else if (wq.charge) info = this.charging ? `🔋 ${this.chargeT >= 1 ? 'FULL!' : Math.round(Math.min(1, this.chargeT) * 100) + '%'}` : '🔋 tahan untuk charge';
    else if (wq.phaseSpikes) info = '👻 kebal duri';
    else if (wq.notes) info = `🎶 nada ${Math.min(10, Math.max(1, this.combo))}/10`;
    if (info) {
      c.font = font(13);
      c.fillStyle = wq.color;
      c.fillText(info, W - 14, H - 36);
    }
    if (wq.spinup) {
      c.fillStyle = 'rgba(255,255,255,0.15)';
      c.fillRect(W - 114, H - 46, 100, 7);
      c.fillStyle = this.spin > 0.25 ? '#22c55e' : '#f59e0b';
      c.fillRect(W - 114, H - 46, 100 * this.spin, 7);
      c.font = font(10);
      c.fillStyle = 'rgba(255,255,255,0.7)';
      c.fillText('SPIN', W - 118, H - 40);
    }

    // banner
    if (this.bannerT > 0) {
      const t = this.bannerT;
      const a = Math.min(1, t * 2.5) * Math.min(1, (1.8 - t) * 5);
      c.save();
      c.globalAlpha = a;
      c.translate(CX, isSpecial(this.level.mode) ? this.targetY + this.level.radius + 46 : CY + this.level.radius + 115);
      const s = 1 + Math.max(0, (t - 1.5)) * 1.5;
      c.scale(s, s);
      c.textAlign = 'center';
      if (this.level.boss) {
        c.fillStyle = 'rgba(120,0,0,0.65)';
        c.fillRect(-W / 2, -38, W, 76);
        c.font = font(34);
        c.lineWidth = 6;
        c.strokeStyle = 'rgba(0,0,0,0.7)';
        c.strokeText('⚠ BOSS FIGHT ⚠', 0, -10);
        c.fillStyle = '#ff4040';
        c.fillText('⚠ BOSS FIGHT ⚠', 0, -10);
        c.font = font(16);
        c.fillStyle = '#ffd0d0';
        c.fillText(this.level.name, 0, 20);
      } else if (isSpecial(this.level.mode)) {
        const title = this.level.mode === 'boulder' ? '💎 DIAMOND BREAKER'
          : this.level.mode === 'bonus' ? '🪙 BONUS STAGE' : '🧰 HARTA KARUN';
        const hint = this.level.mode === 'boulder' ? 'Kikis batu hingga diamond bersih!'
          : this.level.mode === 'bonus' ? 'Bidik koin yang berputar!' : '10 detik! Berondong petinya!';
        c.font = font(27); c.lineWidth = 5; c.strokeStyle = 'rgba(0,0,0,0.9)';
        c.strokeText(title, 0, -9);
        c.fillStyle = this.level.mode === 'boulder' ? '#a5f3fc' : '#fde68a';
        c.fillText(title, 0, -9);
        c.font = font(13); c.fillStyle = '#ffffff'; c.fillText(hint, 0, 25);
      } else {
        c.font = font(38);
        c.lineWidth = 6;
        c.strokeStyle = 'rgba(0,0,0,0.7)';
        c.strokeText(`LEVEL ${n}`, 0, 0);
        c.fillStyle = '#ffffff';
        c.fillText(`LEVEL ${n}`, 0, 0);
      }
      if (n <= 2 && (this.weapon.auto || this.weapon.scope || this.weapon.charge)) {
        c.font = font(13);
        c.fillStyle = '#ffd23f';
        const hint = this.weapon.charge ? 'TAP = TEMBAK, TAHAN = CHARGE x4!' : this.weapon.scope ? 'TAHAN = BIDIK SLOW-MO, LEPAS = TEMBAK' : this.weapon.spinup ? 'TAHAN LAYAR UNTUK MEMUTAR LARAS!' : 'TAHAN LAYAR / SPASI = AUTO-FIRE';
        c.fillText(hint, 0, 40);
      }
      c.restore();
    }

    // Slide #2 exact "STAGE CLEAR!" + "BONUS +3" banner (`games/firework/src/game/engine.ts` lines 3469–3515)
    if (this.state === 'clear' && !isSpecial(this.level.mode)) {
      const t = this.stateT;
      const sc =
        t < 0.35
          ? 0.4 + 0.6 * Math.pow(t / 0.35, 0.6) * (1 + 0.25 * Math.sin((t / 0.35) * Math.PI))
          : 1;
      const a = t > 1.35 ? Math.max(0, 1 - (t - 1.35) / 0.4) : 1;
      const clearFont = "Bungee, Impact, 'Arial Black', sans-serif";
      const w = this.weapon.id;
      c.save();
      c.globalAlpha = a;
      c.translate(CX, 330);
      c.scale(sc, sc);
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.font = `700 46px ${clearFont}`;
      const g = c.createLinearGradient(-140, -20, 140, 20);
      if (w === 'keris') {
        g.addColorStop(0, '#ffe9a8');
        g.addColorStop(0.5, '#ffd75e');
        g.addColorStop(1, '#ff8a3d');
        c.shadowColor = 'rgba(255,190,80,0.95)';
      } else if (w === 'blackhole') {
        g.addColorStop(0, '#b46bff');
        g.addColorStop(0.5, '#7ad7ff');
        g.addColorStop(1, '#f0e6ff');
        c.shadowColor = 'rgba(140,80,255,0.95)';
      } else if (w === 'yoyo') {
        g.addColorStop(0, '#ff5f8f');
        g.addColorStop(0.5, '#ffd75e');
        g.addColorStop(1, '#5fe7ff');
        c.shadowColor = 'rgba(255,150,120,0.95)';
      } else if (w === 'diamond') {
        g.addColorStop(0, '#ffffff');
        g.addColorStop(0.5, '#bfe6ff');
        g.addColorStop(1, '#7ab8ff');
        c.shadowColor = 'rgba(200,235,255,0.95)';
      } else if (w === 'bazooka') {
        g.addColorStop(0, '#ffe27a');
        g.addColorStop(0.5, '#ff9d2e');
        g.addColorStop(1, '#ff5a2e');
        c.shadowColor = 'rgba(255,140,40,0.95)';
      } else {
        g.addColorStop(0, '#ffb0e6');
        g.addColorStop(0.5, '#8adcff');
        g.addColorStop(1, '#c77dff');
        c.shadowColor = 'rgba(220,150,255,0.95)';
      }
      c.shadowBlur = 24;
      c.fillStyle = g;
      c.fillText('STAGE CLEAR!', 0, 0);
      c.shadowBlur = 0;
      c.font = `700 18px ${clearFont}`;
      c.fillStyle = '#fff';
      c.fillText('BONUS +3', 0, 40);
      c.restore();
    }
  }
}
