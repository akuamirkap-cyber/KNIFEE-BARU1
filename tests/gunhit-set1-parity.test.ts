import test from 'node:test';
import assert from 'node:assert/strict';

import { SET_ONE_IDS, buildSetOneAnim, drawSetOneGun, setOneIdFor } from '../src/games/gunhit/game/setOneArt';
import { SetOneFx, type SetOneHooks } from '../src/games/gunhit/game/setOneFx';
import { SET_ONE_SFX, fireSetOne, impactSetOne } from '../src/games/gunhit/game/setOneWeapons';
import { K } from '../games/game-4/src/game/particles';
import { drawGun } from '../src/games/gunhit/game/art/guns';
import {
  EDITABLE_WEAPONS,
  getGunEffect,
  getGunEffectOptions,
  getGunVariant,
  getGunVariantOptions,
  setGunEffect,
  setGunVariant,
} from '../src/games/gunhit/game/art/gunVariants';

function recorder() {
  const calls: string[] = [];
  const gradient = { addColorStop: () => undefined };
  const ctx = new Proxy({} as Record<string, unknown>, {
    get: (_t, prop) => {
      const name = String(prop);
      if (name === 'createLinearGradient' || name === 'createRadialGradient') return () => gradient;
      if (name === 'canvas') return { width: 420, height: 760 };
      if (name === 'getImageData') return () => ({ data: new Uint8ClampedArray(4) });
      return (...args: unknown[]) => {
        calls.push(`${name}:${args.filter(a => typeof a === 'number').join(',')}`);
        return undefined;
      };
    },
    set: () => true,
  }) as unknown as CanvasRenderingContext2D;
  return { ctx, calls };
}

function countingHooks(): SetOneHooks & { counts: Record<string, number>; wheelPaints: number } {
  const counts: Record<string, number> = { shake: 0, hitStop: 0, flash: 0, wheelFx: 0 };
  const hooks = {
    counts,
    wheelPaints: 0,
    shake: () => { counts.shake++; },
    hitStop: () => { counts.hitStop++; },
    flash: () => { counts.flash++; },
    paintWheel: () => { hooks.wheelPaints++; },
    addWheelFx: () => { counts.wheelFx++; },
    wheel: () => ({ x: 210, y: 300, R: 120 }),
  };
  return hooks;
}

test('slide 7 SET 1 is exactly the six weapons slide 1 shares, matched by name', () => {
  assert.deepEqual([...SET_ONE_IDS], ['golden', 'blackhole', 'ketapel', 'sumpit', 'shotgun', 'soaker']);
  // KETAPEL and SUMPIT DAYAK carry a different id on slide 1.
  assert.equal(setOneIdFor('slingshot'), 'ketapel');
  assert.equal(setOneIdFor('blowgun'), 'sumpit');
  for (const [slide1, setOne] of [
    ['golden', 'golden'], ['blackhole', 'blackhole'], ['shotgun', 'shotgun'], ['soaker', 'soaker'],
  ] as const) {
    assert.equal(setOneIdFor(slide1), setOne);
  }
  assert.equal(setOneIdFor('pistol'), null);
  assert.equal(setOneIdFor('dragon'), null);
  for (const id of ['golden', 'blackhole', 'slingshot', 'blowgun', 'shotgun', 'soaker'] as const) {
    assert.ok((EDITABLE_WEAPONS as readonly string[]).includes(id), `${id} offers the SET 1 card`);
    assert.equal(getGunVariant(id), 'set1', `${id} defaults to the newest design`);
    assert.equal(getGunEffect(id), 'new', `${id} defaults to the SET 1 shot`);
    assert.ok(getGunVariantOptions(id).some(o => o.id === 'set1'));
    assert.deepEqual(getGunEffectOptions(id).map(o => o.id), ['original', 'new']);
  }
});

test('design and effect stay independent: old art + SET 1 shot, SET 1 art + old shot', () => {
  const id = 'shotgun';
  try {
    setGunVariant(id, 'original');
    setGunEffect(id, 'new');
    assert.deepEqual([getGunVariant(id), getGunEffect(id)], ['original', 'new']);
    setGunVariant(id, 'set1');
    setGunEffect(id, 'original');
    assert.deepEqual([getGunVariant(id), getGunEffect(id)], ['set1', 'original']);
  } finally {
    setGunVariant(id, 'set1');
    setGunEffect(id, 'new');
  }
});

test('the default card draws slide 7 own artwork, and it is not the slide-1 body', () => {
  for (const id of ['golden', 'blackhole', 'slingshot', 'blowgun', 'shotgun', 'soaker'] as const) {
    const setOne = recorder();
    drawGun(setOne.ctx, id, 210, 575, 0.8, 0);
    assert.ok(setOne.calls.length > 150, `${id} draws the whole slide-7 weapon`);

    const slide1 = recorder();
    drawGun(slide1.ctx, id, 210, 575, 0.8, 0, true, undefined, 'original');
    assert.notDeepEqual(setOne.calls, slide1.calls, `${id} keeps two real designs`);
  }
});

test('slide-7 SET 1 animation state reacts to shot, charge and ammo like slide 7', () => {
  const golden = buildSetOneAnim('golden', { sinceShot: 0 });
  assert.ok(golden.slide > golden.slide * 0 === 0 || golden.slide > 0);
  assert.ok(buildSetOneAnim('golden', { sinceShot: 0 }).slide >= buildSetOneAnim('golden', { sinceShot: 0.2 }).slide);
  assert.ok(buildSetOneAnim('blackhole', { sinceShot: 0.1, charge: 1 }).charge === 1);
  assert.equal(buildSetOneAnim('blackhole', { sinceShot: 0.5 }).orb, 0, 'the orb is spent after 0.32 s');
  assert.ok(buildSetOneAnim('sumpit', { sinceShot: 0.2 }).tassel !== 0);
  assert.ok(buildSetOneAnim('shotgun', { sinceShot: 0.29 }).pump > 0, 'the pump runs after 0.17 s');
  assert.equal(buildSetOneAnim('shotgun', { sinceShot: 0.1 }).pump, 0, 'and not before');
  const soakerDry = buildSetOneAnim('soaker', { sinceShot: 9, water: 0 });
  const soakerFull = buildSetOneAnim('soaker', { sinceShot: 9, water: 1 });
  assert.ok(soakerFull.gauge > soakerDry.gauge, 'the tank gauge follows the ammo left');
});

test('each SET 1 shot leaves slide 7 own muzzle point with slide 7 timing', () => {
  const expected = {
    golden: { delay: 0, y: -6 },
    blackhole: { delay: 0.28, y: -4 },
    ketapel: { delay: 0, y: 40 },
    sumpit: { delay: 0.075, y: -38 },
    shotgun: { delay: 0, y: -8 },
    soaker: { delay: 0, y: -2 },
  } as const;
  for (const id of SET_ONE_IDS) {
    const fx = new SetOneFx();
    const spawn = fireSetOne(fx, id, 210, 575, countingHooks(), () => {});
    assert.equal(spawn.x, 210, `${id} leaves the barrel line`);
    assert.equal(spawn.y, 575 + expected[id].y, `${id} spawn height is slide 7 exact`);
    assert.equal(spawn.delay, expected[id].delay, `${id} spawn delay is slide 7 exact`);
    assert.ok(fx.busy || id === 'soaker', `${id} draws its own muzzle recipe`);
  }
});

test('the muzzle recipes keep slide-7 particle counts and timers', () => {
  // BLACK HOLE charges 28 sparks into the orb, then releases 0.28 s later.
  const bh = new SetOneFx();
  fireSetOne(bh, 'blackhole', 210, 575, countingHooks(), () => {});
  assert.equal(bh.particles.list.filter(p => p.k === K.SPARK).length, 28, 'slide-7 charge sparks');
  assert.equal(bh.fx.length, 3, 'three charge bolts');
  let peakFx = bh.fx.length;
  for (let i = 0; i < 20; i++) {
    bh.update(1 / 60);
    peakFx = Math.max(peakFx, bh.fx.length);
  }
  assert.ok(bh.particles.list.length > 28, 'the release adds rings and sparks');
  assert.ok(peakFx >= 6, 'the release adds its five bolts while the charge bolts are still alive');

  // SHOTGUN launches nine pellets and kicks the wad out.
  const sg = new SetOneFx();
  const shot = sg.newShot('shotgun', 210, 567);
  assert.equal(shot.pellets.length, 9, 'slide-7 pellet count');
  fireSetOne(sg, 'shotgun', 210, 575, countingHooks(), () => {});
  assert.ok(sg.particles.list.some(p => p.k === K.CUSTOM), 'the wad is thrown');
  sg.update(0.2);
  sg.update(0.15);
  assert.ok(sg.particles.list.filter(p => p.k === K.CUSTOM).length >= 2, 'the shell is ejected at 0.28 s');

  // GOLDEN GUN ejects its casing 0.035 s after the shot.
  const gg = new SetOneFx();
  fireSetOne(gg, 'golden', 210, 575, countingHooks(), () => {});
  const before = gg.particles.list.filter(p => p.k === K.CUSTOM).length;
  gg.update(0.05);
  assert.ok(gg.particles.list.filter(p => p.k === K.CUSTOM).length > before, 'the casing leaves the port');

  // SUPER SOAKER sprays droplets from the muzzle.
  const sk = new SetOneFx();
  fireSetOne(sk, 'soaker', 210, 575, countingHooks(), () => {});
  assert.ok(sk.particles.list.filter(p => p.k === K.DROP).length >= 16, 'slide-7 spray count');
});

test('the impact bursts are slide 7 own, and the black hole collapses 0.32 s later', () => {
  const hooks = countingHooks();

  const golden = new SetOneFx();
  const goldenShot = golden.newShot('golden', 210, 400);
  impactSetOne(golden, goldenShot, 210, 300, Math.PI / 2, hooks, () => {});
  assert.ok(golden.particles.list.length > 80, 'golden crash: sparks, stars, flakes, chips');
  assert.ok(hooks.counts.hitStop > 0 && hooks.counts.shake > 0);
  assert.ok(hooks.wheelPaints > 0, 'the dent and cracks are painted on the target');
  assert.ok(hooks.counts.wheelFx >= 2, 'the glowing crack lines and the hot spot');

  const sling = new SetOneFx();
  impactSetOne(sling, sling.newShot('ketapel', 210, 400), 210, 300, Math.PI / 2, countingHooks(), () => {});
  assert.ok(sling.particles.list.length > 20, 'splinters and dust');

  const dart = new SetOneFx();
  impactSetOne(dart, dart.newShot('sumpit', 210, 400), 210, 300, Math.PI / 2, countingHooks(), () => {});
  assert.ok(dart.particles.list.some(p => p.color === '110,225,80'), 'poison cloud');

  const bhHooks = countingHooks();
  const bh = new SetOneFx();
  impactSetOne(bh, bh.newShot('blackhole', 210, 400), 210, 300, Math.PI / 2, bhHooks, () => {});
  assert.equal(bh.particles.list.length, 40, 'forty in-rushing chips and sparks');
  assert.equal(bhHooks.counts.shake, 1, 'only the small shake happens at once');
  bh.update(0.34);
  assert.ok(bhHooks.counts.shake >= 2 && bhHooks.counts.hitStop > 0, 'the collapse lands after 0.32 s');
  assert.ok(bhHooks.counts.flash > 0, 'with slide-7 screen tint');
});

test('every SET 1 weapon plays slide 7 own sound ids', () => {
  assert.deepEqual(
    Object.fromEntries(SET_ONE_IDS.map(id => [id, SET_ONE_SFX[id].fire])),
    {
      golden: 'golden_fire', blackhole: 'bh_fire', ketapel: 'sling_fire',
      sumpit: 'sumpit_fire', shotgun: 'shotgun_fire', soaker: 'soaker_fire',
    },
  );
  assert.deepEqual(
    Object.fromEntries(SET_ONE_IDS.map(id => [id, SET_ONE_SFX[id].hit])),
    {
      golden: 'golden_hit', blackhole: 'bh_hit', ketapel: 'sling_hit',
      sumpit: 'sumpit_hit', shotgun: 'shotgun_hit', soaker: 'splash',
    },
  );
  assert.ok(SET_ONE_SFX.blackhole.extra?.includes('bh_charge'));
  assert.ok(SET_ONE_SFX.shotgun.extra?.includes('pump'));
  assert.ok(SET_ONE_SFX.blackhole.extra?.includes('bh_suck'));
});

test('the SET 1 layer only exists while its gun is equipped and firing', () => {
  const fx = new SetOneFx();
  assert.equal(fx.busy, false);
  fireSetOne(fx, 'golden', 210, 575, countingHooks(), () => {});
  assert.equal(fx.busy, true);
  for (let i = 0; i < 400; i++) fx.update(1 / 60);
  assert.equal(fx.busy, false, 'the layer drains itself and stops being updated');
});
