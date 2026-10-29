import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getGunVariant, setGunVariant, getGunEffect, setGunEffect, supportsGunVariants,
  canChooseGunDesign, VARIANT_WEAPONS, EDITABLE_WEAPONS, FIXED_CLASSIC_WEAPONS,
  hasSlide7Update, slide7UpdateSet, hasSlide9Update, SET_NINE_DESIGN_WEAPONS,
  hasSlide11Update, SET_ELEVEN_DESIGN_WEAPONS,
  GUN_VARIANTS, GUN_EFFECTS, getGunVariantOptions, getGunEffectOptions,
  type GunVariant, type GunEffect, type VariantWeapon,
} from '../src/games/gunhit/game/art/gunVariants';
import { drawSetNineShotShell } from '../src/games/gunhit/game/setNineFx';
import { setNineIdFor } from '../src/games/gunhit/game/setNineArt';
import { drawSetElevenShotShell } from '../src/games/gunhit/game/setElevenFx';
import { setElevenIdFor } from '../src/games/gunhit/game/setElevenArt';
import { installCanvasShim } from './supportCanvas';
import { hasClassicProjectile } from '../src/games/gunhit/game/art/classicProjectiles';
import { drawProjectile } from '../src/games/gunhit/game/art/projectiles';
import { drawMaterialTrail } from '../src/games/gunhit/game/art/projectileTrails';
import { drawSetOneShotShell } from '../src/games/gunhit/game/setOneFx';
import { drawSetSevenShotShell } from '../src/games/gunhit/game/setSevenFx';
import { setSevenIdFor } from '../src/games/gunhit/game/setSevenArt';
import { setOneIdFor } from '../src/games/gunhit/game/setOneArt';
import { drawClassicBeam, drawLaserBeam } from '../src/games/gunhit/game/art/beamEffects';
import { FX, spawnImpact, spawnMuzzle, type Particle } from '../src/games/gunhit/game/fx';
import { getGunMetrics } from '../src/games/gunhit/game/art/metrics';
import { drawGun } from '../src/games/gunhit/game/art/guns';
import { getWeapon, WEAPONS } from '../src/games/gunhit/game/weapons';

// Slide-11 artwork bakes glow sprites into an offscreen canvas.
installCanvasShim();

// Structural rendering probe that also validates every CanvasGradient stop.
// Browsers throw synchronously on an invalid stop (e.g. '#111' + '18'), which
// used to unmount the entire slide on the EPIC Arsenal tab.
function artContext(calls: string[]) {
  const gradient = { addColorStop: (_at: number, color: string) => {
    if (color.startsWith('#')) assert.match(color, /^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i,
      `invalid CanvasGradient color stop: ${color}`);
  } };
  return new Proxy({}, {
    get: (_target, prop) => (...args: unknown[]) => {
      if (prop === 'createLinearGradient' || prop === 'createRadialGradient'
        || prop === 'createConicGradient') return gradient;
      if (prop === 'measureText') return { width: 30 };
      // Glow-only rounds (sl cannons, sabers) are almost entirely additive
      // sprites: count `drawImage` too, so "the round draws" means what it says.
      if (['beginPath', 'lineTo', 'roundRect', 'arc', 'bezierCurveTo', 'fill', 'stroke',
        'ellipse', 'quadraticCurveTo', 'fillRect', 'drawImage'].includes(String(prop))) {
        calls.push(`${String(prop)}:${args.length}`);
      }
    },
    set: () => true,
  }) as CanvasRenderingContext2D;
}

function pathsFor(id: VariantWeapon, variant: GunVariant) {
  const calls: string[] = [];
  drawGun(artContext(calls), id, 0, 0, 0.8, 0, true, undefined, variant);
  return calls.join(',');
}

test('user loadouts use the requested classic/new combination; only real alternatives can be selected', () => {
  assert.deepEqual(GUN_VARIANTS.map(v => v.label), ['Sebelumnya', 'Sekarang', 'Terbaru']);
  assert.deepEqual(GUN_EFFECTS.map(v => v.label), ['Sebelumnya', 'Baru']);
  assert.equal(VARIANT_WEAPONS.length, 92);
  assert.equal(EDITABLE_WEAPONS.length, 92);
  // PISTOL removes the Slide 5 ('set11') weapon design, uses Slide 01's classic
  // pistol ('original') as its default design, uses Slide 4 ('set9') as its
  // default shot effect, and keeps Slide 5 ('set11') in its shot effects.
  assert.equal(getGunVariant('pistol'), 'original');
  assert.equal(getGunEffect('pistol'), 'set9');
  for (const id of FIXED_CLASSIC_WEAPONS) {
    assert.equal(supportsGunVariants(id), true);
    assert.equal(canChooseGunDesign(id), false);
    assert.deepEqual(getGunVariantOptions(id).map(v => v.id), ['original']);
    assert.deepEqual(getGunEffectOptions(id).map(v => v.id), ['original']);
    assert.equal(getGunVariant(id), 'original');
    assert.equal(getGunEffect(id), 'original');
    assert.equal(pathsFor(id, 'original'), pathsFor(id, 'current'));
    assert.equal(pathsFor(id, 'original'), pathsFor(id, 'latest'));
    assert.equal(drawMaterialTrail(artContext([]), id, 'new'), false,
      `${id} never uses a new trail, even with a stale caller`);
  }
  // PLASMA and LASER carry slide 3's own guns now (user request): that card is
  // their default, and their classic look and shot stay pickable.
  assert.deepEqual(FIXED_CLASSIC_WEAPONS, []);
  for (const id of ['plasma', 'laser'] as const) {
    assert.deepEqual(getGunVariantOptions(id).map(v => v.label), ['Sebelumnya', 'Slide 3']);
    assert.deepEqual(getGunEffectOptions(id).map(v => v.label), ['Sebelumnya', 'Slide 3']);
    assert.deepEqual([getGunVariant(id), getGunEffect(id)], ['set7', id === 'laser' ? 'original' : 'set7']);
    assert.notEqual(pathsFor(id, 'original'), pathsFor(id, 'set7'), `${id}'s classic design is its own drawing`);
    assert.equal(drawMaterialTrail(artContext([]), id, 'new'), false,
      `${id} never had a "Baru" trail, even with a stale caller`);
  }
  // Slide 7 is the newest arsenal for every shared gun: its artwork and its own
  // shot are the defaults, and the slide-1 designs/effects stay pickable.
  const SET_ONE = ['golden', 'blackhole', 'slingshot', 'blowgun', 'shotgun', 'soaker'];
  const SET_NINE: readonly string[] = SET_NINE_DESIGN_WEAPONS;
  const ELEVEN: readonly string[] = SET_ELEVEN_DESIGN_WEAPONS;
  const requested: Partial<Record<(typeof EDITABLE_WEAPONS)[number], [GunVariant, GunEffect]>> = {
    ak47: ['original', 'set11'], crossbow: ['original', 'set7'], laser: ['set7', 'original'],
    fish: ['current', 'set7'], rpg: ['original', 'set7'], cricket: ['current', 'new'],
    bazooka: ['set7', 'set7'], freeze: ['original', 'set7'], blackhole: ['set1', 'new'],
    slingshot: ['original', 'new'], blowgun: ['set1', 'new'], shotgun: ['original', 'original'],
    soaker: ['set1', 'set2'], snowball: ['set7', 'set7'], sniper: ['original', 'set9'],
    flamethrower: ['original', 'set7'], bubble: ['original', 'set7'], bamboo: ['original', 'set7'],
    banana: ['original', 'new'], harpoon: ['set7', 'set7'], chicken: ['set7', 'set7'], confetti: ['set7', 'set7'],
    seed: ['original', 'set7'], pizza: ['original', 'set7'], minigun: ['set7', 'new'], railgun: ['set11', 'set7'],
    magnet: ['original', 'set7'], shrink: ['set7', 'set7'], pirate: ['original', 'set7'], card: ['set7', 'set7'],
    gauntlet_cannon: ['original', 'set7'], photon_saber: ['set11', 'set9'], ironman_hand: ['set11', 'ironman_combo'],
  };
  for (const id of EDITABLE_WEAPONS) {
    assert.equal(canChooseGunDesign(id), true);
    assert.deepEqual([getGunVariant(id), getGunEffect(id)],
      requested[id] ?? (id === 'pistol' ? ['original', 'set9']
        : ELEVEN.includes(id as never) ? ['set11', 'set11']
        : SET_NINE.includes(id) ? ['set9', 'set9']
        : SET_ONE.includes(id) ? ['set1', 'new']
        // FIREWORK LAUNCHER keeps slide 2's fireworks as its default effect.
          : id === 'firework' ? ['set7', 'new'] : ['set7', 'set7']), `${id} default`);
  }
  // The two-silhouette guns gain slide 7 as their third card.
  assert.deepEqual(getGunVariantOptions('honey').map(v => v.id), ['original', 'current', 'set7']);
  for (const id of ['cricket', 'fish', 'electro'] as const) {
    assert.deepEqual(getGunVariantOptions(id).map(v => v.id), ['original', 'current', 'set7']);
  }
  assert.equal(getGunVariantOptions('chicken').length, 4);
  // SET 1 cards: GOLDEN keeps its three slide-1 designs plus "Slide 3".
  assert.deepEqual(getGunVariantOptions('golden').map(v => v.id), ['original', 'current', 'latest', 'set1']);
  assert.deepEqual(getGunVariantOptions('blackhole').map(v => v.id), ['original', 'latest', 'set1']);
  for (const id of ['slingshot', 'blowgun', 'shotgun'] as const) {
    assert.deepEqual(getGunVariantOptions(id).map(v => v.id), ['original', 'set1']);
  }
  // SOAKER also got slide 2's own artwork, so it keeps both cards and gains a third.
  assert.deepEqual(getGunVariantOptions('soaker').map(v => v.id), ['original', 'set1', 'set2']);
  // SET 2..7 cards: every slide-3 card reads "Slide 3".
  for (const id of ['snowball', 'pizza', 'keris', 'wand'] as const) {
    assert.deepEqual(getGunVariantOptions(id).map(v => v.id), ['original', 'set7']);
  }
  assert.deepEqual(getGunVariantOptions('snowball').map(v => v.label), ['Sebelumnya', 'Slide 3']);
  assert.deepEqual(getGunVariantOptions('pizza').map(v => v.label), ['Sebelumnya', 'Slide 3']);
  assert.deepEqual(getGunVariantOptions('wand').map(v => v.label), ['Sebelumnya', 'Slide 3']);
  assert.deepEqual(getGunVariantOptions('golden').map(v => v.label), ['Sebelumnya', 'Sekarang', 'Terbaru', 'Slide 3']);
  assert.deepEqual(getGunVariantOptions('dragon').map(v => v.id),
    ['original', 'current', 'latest', 'set7', 'set9', 'set11']);
  // SET 2..5 guns get three effect cards: the two slide-1 effects plus slide 7.
  assert.deepEqual(getGunEffectOptions('honey').map(v => v.id), ['original', 'new', 'set7']);
  assert.deepEqual(getGunEffectOptions('moonbeam').map(v => v.label), ['Sebelumnya', 'Baru', 'Slide 3']);
  assert.deepEqual(getGunEffectOptions('snowball').map(v => v.label), ['Sebelumnya', 'Baru', 'Slide 3']);
  // SET 1's slide-3 shot keeps the `new` id its saved choices use.
  assert.deepEqual(getGunEffectOptions('golden').map(v => `${v.id}:${v.label}`), ['original:Sebelumnya', 'new:Slide 3']);
  assert.deepEqual(getGunEffectOptions('soaker').map(v => v.label), ['Sebelumnya', 'Slide 3', 'Firework']);
  // Slide 9: the eight guns it updates keep every card they had and gain
  // "Slide 7" as the newest; the nine new guns only ever have that one card.
  assert.deepEqual(getGunVariantOptions('ak47').map(v => v.id), ['original', 'set9', 'set11']);
  assert.deepEqual(getGunVariantOptions('pistol').map(v => v.id), ['original', 'set9']);
  assert.deepEqual(getGunVariantOptions('pistol').map(v => v.label), ['Sebelumnya', 'Slide 4']);
  assert.deepEqual(getGunVariantOptions('sniper').map(v => v.id), ['original', 'set7', 'set9', 'set11']);
  // RAILGUN also has slide 6's beam, filed between its slide-1 shape and slide 7.
  assert.deepEqual(getGunVariantOptions('railgun').map(v => v.id), ['original', 'set6', 'set7', 'set9', 'set11']);
  assert.deepEqual(getGunVariantOptions('dragon').map(v => v.label),
    ['Sebelumnya', 'Sekarang', 'Terbaru', 'Slide 3', 'Slide 4', 'Slide 5']);
  // Slide 11 supersedes slide 9 for the eight slide-9 guns it also adopted;
  // YAUTJA is the one slide-9 gun slide 11 never had, so it keeps one card.
  for (const id of ['longbow', 'mp5', 'tesla_rifle', 'ion_smg', 'phaser',
    'identity_disc', 'proton_pack'] as const) {
    assert.deepEqual(getGunVariantOptions(id).map(v => v.id), ['set9', 'set11']);
    assert.deepEqual(getGunEffectOptions(id).map(v => v.id), ['set9', 'set11']);
  }
  // HEAT RAY existed on slide 6 first (`Tripod Heat-Ray`), so slide 6's card
  // opens the list: the earliest look of the gun, then slide 9, then slide 11.
  assert.deepEqual(getGunVariantOptions('heat_ray').map(v => v.id), ['set6', 'set9', 'set11']);
  assert.deepEqual(getGunEffectOptions('heat_ray').map(v => v.id), ['set6', 'set9', 'set11']);
  assert.deepEqual(getGunVariantOptions('gauntlet_cannon').map(v => v.id), ['original', 'set6', 'set7', 'set9']);
  assert.deepEqual(getGunVariantOptions('yautja'), []);
  assert.deepEqual(getGunEffectOptions('yautja'), []);
  // XENOMORPH is slide 11's only shared gun with a slide-1 silhouette to keep:
  // slide 1 only ever drew it one way, so it gets two honest cards.
  assert.deepEqual(getGunVariantOptions('xeno').map(v => v.label), ['Sebelumnya', 'Slide 5']);
  assert.deepEqual(getGunEffectOptions('xeno').map(v => v.label), ['Sebelumnya', 'Baru', 'Slide 5', 'Efek 4']);
  // The ten guns slide 11 added never existed on slide 1: one card each.
  for (const id of ['mega_buster', 'harmonic_disruptor', 'absolute_zero', 'helios_flare',
    'orbital_beacon', 'singularity', 'nano_swarm'] as const) {
    assert.deepEqual(getGunVariantOptions(id).map(v => v.id), ['set11']);
    assert.deepEqual(getGunEffectOptions(id).map(v => v.id), ['set11']);
  }
  assert.deepEqual(getGunEffectOptions('pistol').map(v => v.id), ['original', 'new', 'set9', 'set11']);
  assert.deepEqual(getGunEffectOptions('railgun').map(v => v.id), ['original', 'new', 'set6', 'set7', 'set9', 'set11']);
  assert.deepEqual(getGunEffectOptions('pistol').map(v => v.label), ['Sebelumnya', 'Baru', 'Slide 4', 'Slide 5']);
  assert.equal(getGunMetrics('honey', 'latest').span, getGunMetrics('honey', 'current').span);
});

test('every offered design is a distinct full renderer without modifying weapon mechanics', () => {
  assert.equal(supportsGunVariants('pistol'), true);
  assert.equal(canChooseGunDesign('pistol'), true);
  for (const id of EDITABLE_WEAPONS) {
    const weapon = getWeapon(id);
    const before = { speed: weapon.speed, stick: weapon.stick, rarity: weapon.rarity, perk: weapon.perk };
    const signatures = getGunVariantOptions(id).map(({ id: variant }) => pathsFor(id, variant));
    assert.ok(signatures.every(s => s.length > 100), `${id} must draw a whole gun`);
    assert.equal(new Set(signatures).size, signatures.length, `${id} must not label one drawing as two designs`);
    assert.deepEqual({ speed: weapon.speed, stick: weapon.stick, rarity: weapon.rarity, perk: weapon.perk }, before);
  }
});

test('Arsenal thumbnails never pass invalid colors to CanvasGradient, even after changing tabs', () => {
  for (const weapon of WEAPONS) {
    const calls: string[] = [];
    drawGun(artContext(calls), weapon.id, 0, 0, 0.8, 0);
    assert.ok(calls.length, `${weapon.id} thumbnail must render`);
  }
});

test('choices persist per weapon and the preview metrics follow the chosen silhouette', () => {
  const written: Record<string, string> = {};
  const old = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    setItem: (key: string, value: string) => { written[key] = value; },
  } });
  try {
    setGunVariant('diamond', 'original');
    setGunVariant('honey', 'current');
    setGunVariant('honey', 'latest'); // This version does not exist.
    assert.equal(getGunVariant('diamond'), 'original');
    assert.equal(getGunVariant('honey'), 'current');
    assert.equal(getGunVariant('dragon'), 'set11');
    assert.equal(getGunMetrics('diamond').span, getGunMetrics('diamond', 'original').span);
    assert.notEqual(getGunMetrics('diamond').span, getGunMetrics('diamond', 'set7').span);
    const persisted = JSON.parse(written['gunhit:gun-designs:v3']);
    assert.equal(persisted.diamond, 'original');
    assert.equal(persisted.honey, 'current');
  } finally {
    setGunVariant('diamond', 'set7');
    setGunVariant('honey', 'original');
    if (old) Object.defineProperty(globalThis, 'localStorage', old);
    else Reflect.deleteProperty(globalThis, 'localStorage');
  }
});

function effectArt(id: VariantWeapon, requested: GunEffect) {
  // PLASMA and LASER stay retired to their original shot, exactly like before.
  const effect: GunEffect = FIXED_CLASSIC_WEAPONS.includes(id as never) ? 'original' : requested;
  const calls: string[] = [];
  const ctx = artContext(calls);
  if (id === 'laser') {
    if (effect === 'original') drawClassicBeam(ctx, 0, 5, 100, 0.9, getWeapon(id).trail);
    else drawLaserBeam(ctx, 0, 5, 100, 0.9, 0.8);
  } else {
    const setOneId = effect === 'new' ? setOneIdFor(id) : null;
    const setSevenId = effect === 'set7' ? setSevenIdFor(id) : null;
    const setNineId = effect === 'set9' ? setNineIdFor(id) : null;
    const setElevenId = effect === 'set11' ? setElevenIdFor(id) : null;
    if (setOneId) drawSetOneShotShell(ctx, setOneId, 0.06, 24);
    else if (setSevenId) drawSetSevenShotShell(ctx, setSevenId, 0.06, 24);
    else if (setNineId) drawSetNineShotShell(ctx, setNineId, 0.06, 26);
    else if (setElevenId) drawSetElevenShotShell(ctx, setElevenId, 0.06, 26);
    else {
      drawMaterialTrail(ctx, id, effect);
      drawProjectile(ctx, id, 40, 0.8, 0, false, effect);
    }
  }
  return calls.join(',');
}

test('eleven editable guns show the old and new actual shot renderers', () => {
  for (const id of EDITABLE_WEAPONS) {
    // Slide 1 only ever had one shot for the SET 6..7 guns, so there is no
    // older renderer to compare until their effects land.
    if (!hasClassicProjectile(id) && !FIXED_CLASSIC_WEAPONS.includes(id as never)) continue;
    // The guns slide 9 / slide 11 added only ever have their own shot: there
    // is no older round to compare, so just prove that round draws.
    if (getGunEffectOptions(id).length === 1) {
      const only = getGunEffectOptions(id)[0].id;
      assert.ok(effectArt(id, only).length > 30, `${id} draws its only round`);
      continue;
    }
    // Compare the gun's two newest shot cards, whatever slides they came from:
    // "Baru" vs "Set 7", "Set 9" vs "Slide 11", and so on.
    const newest = getGunEffectOptions(id);
    const before: GunEffect = newest[newest.length - 2].id;
    const after: GunEffect = newest[newest.length - 1].id;
    const oldArt = effectArt(id, before);
    const newArt = effectArt(id, after);
    assert.ok(oldArt.length > 30 && newArt.length > 30, `${id} must draw both shots`);
    assert.notEqual(oldArt, newArt, `${id} must change its shot/beam, not just a label`);
  }
  for (const id of ['plasma'] as const) {
    assert.equal(effectArt(id, 'new'), effectArt(id, 'original'), `${id} new shot retired`);
  }
  // The black hole gained a real second shot (slide-2 void) and a second
  // design (slide-2 cannon), so it is no longer a retired classic.
  assert.equal(canChooseGunDesign('blackhole'), true);
  assert.deepEqual(getGunVariantOptions('blackhole').map(v => v.id), ['original', 'latest', 'set1']);
  assert.notEqual(effectArt('blackhole', 'new'), effectArt('blackhole', 'original'));
});

test('every updated gun carries the green NEW badge, and only those guns', () => {
  for (const id of EDITABLE_WEAPONS) {
    if (hasSlide11Update(id)) {
      // Slide 11 is the newest layer: its badge wins over the older ones.
      assert.ok(SET_ELEVEN_DESIGN_WEAPONS.includes(id as never), `${id} is slide 11`);
      continue;
    }
    assert.equal(hasSlide11Update(id), false, `${id} has no slide-11 update`);
    if (hasSlide9Update(id)) {
      assert.equal(hasSlide7Update(id), SET_NINE_DESIGN_WEAPONS.includes(id as never)
        && ['sniper', 'railgun', 'dragon', 'photon_saber', 'gauntlet_cannon'].includes(id),
      `${id} reports its slide-9 update`);
      continue;
    }
    assert.equal(hasSlide7Update(id), true, `${id} has slide-7 artwork and shot`);
    const set = slide7UpdateSet(id);
    assert.ok(set !== null && set >= 1 && set <= 7, `${id} reports its slide-7 set`);
  }
  // Slide 9's own badge list.
  for (const id of SET_NINE_DESIGN_WEAPONS) assert.equal(hasSlide9Update(id), true, `${id} is slide 9`);
  // Slide 11's own badge list, 26 guns (16 updated designs + 10 brand new; PISTOL's Slide 5 design was removed).
  for (const id of SET_ELEVEN_DESIGN_WEAPONS) assert.equal(hasSlide11Update(id), true, `${id} is slide 11`);
  assert.equal(SET_ELEVEN_DESIGN_WEAPONS.length, 26);
  // UNCHANGED guns: no badge, no set.
  for (const id of ['nail', 'yoyo', 'acid', 'anchor', 'dora'] as const) {
    assert.equal(hasSlide7Update(id), false, `${id} is unchanged`);
    assert.equal(slide7UpdateSet(id), null, `${id} has no slide-7 set`);
  }
  // PLASMA and LASER are slide 3's SET 3 PLASMA GUN and LASER GUN now.
  for (const id of ['plasma', 'laser'] as const) {
    assert.equal(hasSlide7Update(id), true, `${id} carries slide 3's update`);
    assert.equal(slide7UpdateSet(id), 3);
  }
  // The SET numbers come from slide 7 itself.
  assert.equal(slide7UpdateSet('golden'), 1);
  assert.equal(slide7UpdateSet('snowball'), 2);
  assert.equal(slide7UpdateSet('wand'), 5);
  assert.equal(slide7UpdateSet('card'), 6);
  assert.equal(slide7UpdateSet('blaster'), 7); // slide-1 calls WARS BLASTER 'blaster'
});

test('honey old/new effects persist independently of design and leave gameplay rules intact', () => {
  const written: Record<string, string> = {};
  const old = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    setItem: (key: string, value: string) => { written[key] = value; },
  } });
  try {
    const honey = getWeapon('honey');
    const mechanics = { speed: honey.speed, stick: honey.stick, half: honey.half,
      points: honey.points, cooldown: honey.cooldown, recoil: honey.recoil };
    setGunEffect('honey', 'original');
    setGunEffect('chicken', 'new');
    setGunVariant('honey', 'current');
    assert.equal(getGunVariant('honey'), 'current');
    assert.equal(getGunEffect('honey'), 'original');
    assert.equal(getGunEffect('chicken'), 'new');
    assert.equal(getGunEffect('laser'), 'original', 'laser keeps its requested classic shot');
    assert.equal(JSON.parse(written['gunhit:shot-effects:v3']).honey, 'original');
    assert.equal(JSON.parse(written['gunhit:shot-effects:v3']).chicken, 'new');
    assert.deepEqual({ speed: honey.speed, stick: honey.stick, half: honey.half,
      points: honey.points, cooldown: honey.cooldown, recoil: honey.recoil }, mechanics);
    const oldParticles: Particle[] = [], newParticles: Particle[] = [];
    const sink = (particles: Particle[]) => ({ push: (p: Particle) => particles.push(p), light: () => {} });
    spawnImpact(sink(oldParticles), FX.honey, honey, 210, 340, 0, -1, ['#aab6c6']);
    spawnMuzzle(sink(oldParticles), FX.honey, honey, 210, 570);
    setGunEffect('honey', 'new');
    spawnImpact(sink(newParticles), FX.honey, honey, 210, 340, 0, -1, ['#aab6c6']);
    spawnMuzzle(sink(newParticles), FX.honey, honey, 210, 570);
    assert.ok(oldParticles.length && newParticles.length);
    assert.notDeepEqual(oldParticles.map(p => p.kind).sort(), newParticles.map(p => p.kind).sort());
  } finally {
    setGunEffect('honey', 'new');
    setGunEffect('chicken', 'new');
    setGunVariant('honey', 'original');
    if (old) Object.defineProperty(globalThis, 'localStorage', old);
    else Reflect.deleteProperty(globalThis, 'localStorage');
  }
});
