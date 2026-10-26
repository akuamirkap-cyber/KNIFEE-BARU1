import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getGunVariant, setGunVariant, getGunEffect, setGunEffect, supportsGunVariants,
  canChooseGunDesign, VARIANT_WEAPONS, EDITABLE_WEAPONS, FIXED_CLASSIC_WEAPONS,
  hasSlide7Update, slide7UpdateSet,
  GUN_VARIANTS, GUN_EFFECTS, getGunVariantOptions, getGunEffectOptions,
  type GunVariant, type GunEffect, type VariantWeapon,
} from '../src/games/gunhit/game/art/gunVariants';
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
      if (['beginPath', 'lineTo', 'roundRect', 'arc', 'bezierCurveTo', 'fill', 'stroke',
        'ellipse', 'quadraticCurveTo', 'fillRect'].includes(String(prop))) {
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
  assert.equal(VARIANT_WEAPONS.length, 71);
  assert.equal(EDITABLE_WEAPONS.length, 69);
  assert.equal(getGunVariant('pistol'), 'current');
  assert.equal(getGunEffect('pistol'), 'new');
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
  // Slide 7 is the newest arsenal for every shared gun: its artwork and its own
  // shot are the defaults, and the slide-1 designs/effects stay pickable.
  const SET_ONE = ['golden', 'blackhole', 'slingshot', 'blowgun', 'shotgun', 'soaker'];
  for (const id of EDITABLE_WEAPONS) {
    assert.equal(canChooseGunDesign(id), true);
    assert.deepEqual([getGunVariant(id), getGunEffect(id)],
      SET_ONE.includes(id) ? ['set1', 'new']
        // FIREWORK LAUNCHER keeps slide 2's fireworks as its default effect.
        : id === 'firework' ? ['set7', 'new'] : ['set7', 'set7'], `${id} default`);
  }
  // The two-silhouette guns gain slide 7 as their third card.
  assert.deepEqual(getGunVariantOptions('honey').map(v => v.id), ['original', 'current', 'set7']);
  for (const id of ['cricket', 'fish', 'electro'] as const) {
    assert.deepEqual(getGunVariantOptions(id).map(v => v.id), ['original', 'current', 'set7']);
  }
  assert.equal(getGunVariantOptions('chicken').length, 4);
  // SET 1 cards: GOLDEN keeps its three slide-1 designs plus "Set 1".
  assert.deepEqual(getGunVariantOptions('golden').map(v => v.id), ['original', 'current', 'latest', 'set1']);
  assert.deepEqual(getGunVariantOptions('blackhole').map(v => v.id), ['original', 'latest', 'set1']);
  for (const id of ['slingshot', 'blowgun', 'shotgun', 'soaker'] as const) {
    assert.deepEqual(getGunVariantOptions(id).map(v => v.id), ['original', 'set1']);
  }
  // SET 2..5 cards: the number in the label is the weapon's own slide-7 set.
  for (const id of ['snowball', 'pizza', 'keris', 'wand'] as const) {
    assert.deepEqual(getGunVariantOptions(id).map(v => v.id), ['original', 'set7']);
  }
  assert.deepEqual(getGunVariantOptions('snowball').map(v => v.label), ['Sebelumnya', 'Set 2']);
  assert.deepEqual(getGunVariantOptions('pizza').map(v => v.label), ['Sebelumnya', 'Set 3']);
  assert.deepEqual(getGunVariantOptions('wand').map(v => v.label), ['Sebelumnya', 'Set 5']);
  assert.deepEqual(getGunVariantOptions('dragon').map(v => v.id), ['original', 'current', 'latest', 'set7']);
  // SET 2..5 guns get three effect cards: the two slide-1 effects plus slide 7.
  assert.deepEqual(getGunEffectOptions('honey').map(v => v.id), ['original', 'new', 'set7']);
  assert.deepEqual(getGunEffectOptions('moonbeam').map(v => v.label), ['Sebelumnya', 'Baru', 'Set 5']);
  assert.deepEqual(getGunEffectOptions('snowball').map(v => v.label), ['Sebelumnya', 'Baru', 'Set 2']);
  assert.equal(getGunEffectOptions('golden').length, 2);
  assert.equal(getGunMetrics('honey', 'latest').span, getGunMetrics('honey', 'current').span);
});

test('every offered design is a distinct full renderer without modifying weapon mechanics', () => {
  assert.equal(supportsGunVariants('pistol'), false);
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
    assert.equal(getGunVariant('dragon'), 'set7');
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
    if (setOneId) drawSetOneShotShell(ctx, setOneId, 0.06, 24);
    else if (setSevenId) drawSetSevenShotShell(ctx, setSevenId, 0.06, 24);
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
    // A slide-7 gun compares its slide-1 shot against slide 7's own round.
    const before: GunEffect = getGunEffectOptions(id).length > 2 ? 'new' : 'original';
    const after: GunEffect = getGunEffectOptions(id).length > 2 ? 'set7' : 'new';
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
    assert.equal(hasSlide7Update(id), true, `${id} has slide-7 artwork and shot`);
    const set = slide7UpdateSet(id);
    assert.ok(set !== null && set >= 1 && set <= 7, `${id} reports its slide-7 set`);
  }
  // UNCHANGED guns: no badge, no set.
  for (const id of ['pistol', 'ak47', 'nail', 'yoyo', 'acid', 'anchor', 'xeno', 'dora', 'pred',
    'plasma', 'laser'] as const) {
    assert.equal(hasSlide7Update(id), false, `${id} is unchanged`);
    assert.equal(slide7UpdateSet(id), null, `${id} has no slide-7 set`);
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
    assert.equal(getGunEffect('laser'), 'original');
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
