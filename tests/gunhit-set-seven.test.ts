import test from 'node:test';
import assert from 'node:assert/strict';

import {
  SET_SEVEN_BY_SLIDE1_ID, SET_SEVEN_IDS, SET_SEVEN_SETS, setSevenIdFor, setSevenSetOf,
  restSevenAnim,
} from '../src/games/gunhit/game/setSevenArt';
import { SetSevenFx } from '../src/games/gunhit/game/setSevenFx';
import { FIRE_RECIPES } from '../src/games/gunhit/game/setSevenFire';
import { updateSevenAnim } from '../src/games/gunhit/game/setSevenAnim';
import { drawGun } from '../src/games/gunhit/game/art/guns';
import { getGunMetrics } from '../src/games/gunhit/game/art/metrics';
import {
  EDITABLE_WEAPONS, getGunEffect, getGunEffectOptions, getGunVariant, getGunVariantOptions,
  setGunEffect, setGunVariant,
} from '../src/games/gunhit/game/art/gunVariants';
import { Game, makeLevel } from '../src/games/gunhit/game/Game';
import { getWeapon } from '../src/games/gunhit/game/weapons';

/** A canvas that records nothing but accepts every call, like the other suites. */
function fakeCtx() {
  const gradient = { addColorStop: () => undefined };
  return new Proxy({} as Record<string, unknown>, {
    get: (_t, prop) => {
      const name = String(prop);
      if (name === 'createLinearGradient' || name === 'createRadialGradient'
        || name === 'createConicGradient' || name === 'createPattern') return () => gradient;
      if (name === 'canvas') return { width: 420, height: 760 };
      if (name === 'measureText') return () => ({ width: 10 });
      if (name === 'getImageData') return () => ({ data: new Uint8ClampedArray(4) });
      return () => undefined;
    },
    set: () => true,
  }) as unknown as CanvasRenderingContext2D;
}

function host() {
  const counts = { shake: 0, hitStop: 0, flash: 0, paint: 0, wheelFx: 0, impact: 0 };
  const fx = new SetSevenFx({
    shake: () => { counts.shake++; },
    hitStop: () => { counts.hitStop++; },
    flash: () => { counts.flash++; },
    paintWheel: () => { counts.paint++; },
    wheelImpact: () => { counts.impact++; },
    addWheelFx: () => { counts.wheelFx++; },
    wheel: () => ({ x: 210, y: 300, R: 120, angle: 0 }),
  });
  return { fx, counts };
}

test('slide 7 SET 2..7 is the 65 weapons slide 1 shares, matched by name', () => {
  assert.equal(SET_SEVEN_IDS.length, 65);
  assert.equal(new Set(SET_SEVEN_IDS).size, 65);
  // Every slide-1 id of the port exists, and only FLAMETHROWER is renamed.
  for (const [slide1, seven] of Object.entries(SET_SEVEN_BY_SLIDE1_ID)) {
    assert.equal(setSevenIdFor(slide1), seven);
    assert.ok(SET_SEVEN_IDS.includes(seven), `${slide1} maps to a real slide-7 weapon`);
  }
  assert.equal(setSevenIdFor('flamethrower'), 'flame');
  assert.equal(setSevenIdFor('pistol'), null);
  assert.deepEqual(
    [1, 2, 3, 4, 5, 6, 7].map((n) => SET_SEVEN_IDS.filter((id) => SET_SEVEN_SETS[id] === n).length),
    [0, 6, 9, 9, 12, 12, 17],
    'SET 2 = 6, SET 3 = 9, SET 4 = 9, SET 5 = 12, SET 6 = 12, SET 7 = 17 weapons',
  );
  assert.equal(setSevenSetOf('snowball'), 2);
  assert.equal(setSevenSetOf('wand'), 5);
  assert.equal(setSevenSetOf('card'), 6);
  assert.equal(setSevenSetOf('wars'), 7);
});

test('every one of the 65 fires slide 7’s own recipe, round and impact', () => {
  for (const id of SET_SEVEN_IDS) {
    const { fx } = host();
    fx.weaponId = id;
    fx.shotsFired = 1;
    const before = fx.particles.list.length;
    FIRE_RECIPES[id](fx, 210, 571);
    // Slide 7 may release the round inside `after()`; run its clock briefly.
    for (let i = 0; i < 45 && !fx.shots.length; i++) fx.update(1 / 60);
    assert.ok(fx.shots.length >= 1, `${id} must create its own slide-7 round`);
    const shot = fx.shots[0];
    // Some recipes (the minigun drum) spawn their muzzle FX over the burst.
    for (let i = 0; i < 20; i++) shot.update(1 / 60);
    assert.ok(fx.particles.list.length > before, `${id} must spawn its muzzle particles`);
    assert.ok(fx.fx.length > 0 || fx.particles.list.length > before, `${id} muzzle FX`);
    shot.draw(fakeCtx()); // slide 7's own renderer must accept the frame
    fx.update(1 / 60);
    shot.x = 210;
    shot.y = 302;
    shot.trail(1 / 60);
    shot.hit(0.4, 210, 302);
    shot.block(210, 302);
    fx.update(0.4);
    fx.draw(fakeCtx());
    fx.drawFront(fakeCtx());
    fx.drawWheel(fakeCtx(), 210, 300);
  }
});

test('slide 7’s animation springs and idle ambience drive the equipped gun', () => {
  const { fx } = host();
  fx.weaponId = 'flame';
  const anim = restSevenAnim();
  anim.intro = 0;
  fx.anim = anim;
  for (let i = 0; i < 30; i++) updateSevenAnim(fx, 1 / 60);
  assert.equal(fx.anim.intro, 1, 'the gun slides in like slide 7');
  assert.ok(fx.particles.list.length > 0, 'the flamethrower keeps breathing embers');

  fx.weaponId = 'minigun';
  fx.particles.clear();
  fx.anim.heat = 0.9;
  for (let i = 0; i < 60; i++) updateSevenAnim(fx, 1 / 60);
  assert.ok(fx.particles.list.length > 0, 'a hot minigun smokes while idle');

  fx.weaponId = 'storm';
  fx.particles.clear();
  fx.fx.length = 0;
  for (let i = 0; i < 120; i++) updateSevenAnim(fx, 1 / 60);
  assert.ok(fx.fx.length + fx.particles.list.length > 0, 'the storm crackles around its coil');
});

test('slide 3 designs and shots are available for all 65 SET 2..7 guns, and stay optional', () => {
  // PLASMA and LASER used to be locked to their classic card; they carry slide
  // 3's own guns now (user request), with the classic look still pickable.
  for (const id of ['plasma', 'laser'] as const) {
    assert.equal(getGunVariant(id), 'set7');
    assert.equal(getGunEffect(id), 'set7');
    assert.deepEqual(getGunVariantOptions(id).map((o) => o.id), ['original', 'set7']);
    assert.deepEqual(getGunEffectOptions(id).map((o) => o.id), ['original', 'set7']);
  }
  for (const [slide1, seven] of Object.entries(SET_SEVEN_BY_SLIDE1_ID)) {
    assert.ok(SET_SEVEN_SETS[seven] >= 2, `${seven} is SET 2..7`);
    assert.ok(EDITABLE_WEAPONS.includes(slide1 as never), `${slide1} is selectable`);
    const label = 'Slide 3';
    // The slide-3 card always exists, labelled with the hub slide it comes
    // from, and the slide-1 effects stay pickable next to it.
    const designs = getGunVariantOptions(slide1 as never);
    const design = designs.find((o) => o.id === 'set7');
    assert.ok(design, `${slide1} keeps its slide-7 design card`);
    assert.equal(design!.label, label);
    const effects = getGunEffectOptions(slide1 as never);
    const effect = effects.find((o) => o.id === 'set7');
    assert.ok(effect, `${slide1} keeps its slide-7 effect card`);
    assert.equal(effect!.label, label);
    assert.ok(effects.some((o) => o.id === 'original'), `${slide1} keeps its slide-1 shot`);
    // Whatever is selected by default must be one of the cards it offers.
    assert.ok(designs.some((o) => o.id === getGunVariant(slide1 as never)));
    assert.ok(effects.some((o) => o.id === getGunEffect(slide1 as never)));
    // FIREWORK LAUNCHER still defaults to slide 2's sky show.
    if (slide1 === 'firework') assert.equal(getGunEffect('firework'), 'new');
  }
  for (const id of ['golden', 'blackhole', 'slingshot', 'blowgun', 'shotgun', 'soaker']) {
    assert.equal(getGunVariant(id), 'set1');
  }
});

/** A Game without a canvas: enough of slide 1 for the fire/hit wiring. */
function probe(weapon: string) {
  const game = Object.create(Game.prototype) as Game & Record<string, unknown>;
  const particles: unknown[] = [];
  Object.assign(game, {
    level: makeLevel(3), weapon: getWeapon(weapon as never), state: 'play',
    projs: [], beams: [], items: [], flyers: [], frags: [], stuck: 0,
    particles, lights: [], sink: { push: (p: unknown) => particles.push(p), light: () => {} },
    events: {}, rot: 0, levelTime: 0, camY: 0, bump: 0, shake: 0, hitStop: 0, flashWhite: 0,
    cooldown: 0, reloadT: 0, ammoLeft: 12, snowLoaded: 5, maxAmmoMult: 1,
    speedMult: 1, dmgMult: 1, rt: 0, coins: 0, score: 0, slowT: 0, slowF: 1,
    combo: 0, lastHit: -10, time: 1, hitFlash: 0, timeScale: 1,
    faceCtx: fakeCtx(), faceScale: 2,
  });
  return game;
}

test('slide 1 fires slide 7’s round for the ported guns, and slide 1’s for the others', () => {
  setGunEffect('snowball', 'set7');
  const game = probe('snowball');
  game.shoot();
  assert.equal(game.projs.length, 1, 'one carrier round');
  const carrier = game.projs[0] as unknown as { setSeven?: { weapon: string }; setSevenPending?: boolean };
  assert.ok(carrier.setSeven || carrier.setSevenPending, 'the slide-7 round rides the carrier');
  assert.ok(carrier.setSeven?.weapon === 'snowball' || carrier.setSevenPending);
  assert.equal(game.particles.length, 0, 'slide 1’s own muzzle particles stay off');

  // Slide 1 still fires its own shot when the slide-7 effect is not selected.
  setGunEffect('snowball', 'new');
  const slide1 = probe('snowball');
  slide1.shoot();
  assert.equal((slide1.projs[0] as unknown as { setSeven?: unknown }).setSeven, undefined);
  assert.ok(slide1.particles.length > 0, 'slide 1’s muzzle burst is back');
  setGunEffect('snowball', 'set7');
});

test('a new level starts with an empty wheel: no slide-7 round stays stuck', () => {
  setGunEffect('fish', 'set7');
  const game = probe('fish') as Game & Record<string, unknown>;
  game.shoot();
  const carrier = (game.projs as unknown[])[0] as { setSeven?: { weapon: string } };
  assert.equal(carrier.setSeven?.weapon, 'fish', 'fish fires slide 7’s fish');
  // Land it in the wheel like a real hit: slide 7 stores the stuck round.
  (game as unknown as { stickAt: (a: number, p: unknown) => void }).stickAt(0.4, carrier);
  const layer = (game as unknown as { s7: { stuck: unknown[]; particles: { list: unknown[] } } }).s7;
  assert.ok(layer.stuck.length > 0, 'the fish is stuck in the wheel');

  // Next level: slide 1 clears its own items, and slide 7’s layer too.
  const doc = Object.getOwnPropertyDescriptor(globalThis, 'document');
  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: { createElement: () => ({ width: 0, height: 0, getContext: () => fakeCtx() }) },
  });
  try {
    (game as unknown as { loadLevel: (n: number) => void }).loadLevel(2);
  } finally {
    if (doc) Object.defineProperty(globalThis, 'document', doc);
    else delete (globalThis as { document?: unknown }).document;
  }
  assert.equal(layer.stuck.length, 0, 'stuck slide-7 rounds leave with the old level');
  assert.equal(layer.particles.list.length, 0, 'and so does their FX');
  const bullets = (game.items as { type: string }[]).filter((it) => it.type === 'bullet');
  assert.equal(bullets.length, 0, 'slide 1’s wheel keeps no stuck rounds either');

  // Changing gun also drops the previous gun’s stuck rounds.
  game.shoot();
  (game as unknown as { stickAt: (a: number, p: unknown) => void }).stickAt(0.4, carrier);
  game.setWeapon('snowball');
  assert.equal(layer.stuck.length, 0, 'a different gun starts with a clean wheel');
  setGunEffect('fish', 'set7');
});
