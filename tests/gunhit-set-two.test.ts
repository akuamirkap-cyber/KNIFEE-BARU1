import test from 'node:test';
import assert from 'node:assert/strict';

import {
  SET_TWO_BY_SLIDE1_ID, SET_TWO_IDS, drawSetTwoGun, restTwoState, setTwoIdFor,
} from '../src/games/gunhit/game/setTwoArt';
import { SetTwoFx, twoAmmoHue } from '../src/games/gunhit/game/setTwoFx';
import { drawGun } from '../src/games/gunhit/game/art/guns';
import { gunState } from '../src/games/gunhit/game/art/kit';
import {
  SET_TWO_DESIGN_WEAPONS, SET_TWO_EFFECT_WEAPONS, getGunEffect, getGunEffectOptions,
  getGunVariant, getGunVariantOptions, setGunEffect, setGunVariant,
} from '../src/games/gunhit/game/art/gunVariants';
import { Game, makeLevel } from '../src/games/gunhit/game/Game';
import { getWeapon } from '../src/games/gunhit/game/weapons';

function fakeCtx(calls: string[] = []) {
  const gradient = { addColorStop: () => undefined };
  return new Proxy({} as Record<string, unknown>, {
    get: (_t, prop) => {
      const name = String(prop);
      if (name === 'createLinearGradient' || name === 'createRadialGradient'
        || name === 'createConicGradient' || name === 'createPattern') return () => gradient;
      if (name === 'canvas') return { width: 420, height: 760 };
      if (name === 'measureText') return () => ({ width: 10 });
      if (name === 'getImageData') return () => ({ data: new Uint8ClampedArray(4) });
      if (['fill', 'stroke', 'fillRect', 'strokeRect', 'arc', 'moveTo', 'lineTo',
        'quadraticCurveTo', 'bezierCurveTo', 'ellipse', 'roundRect', 'fillText',
        'translate', 'rotate', 'scale', 'save', 'restore', 'drawImage', 'setTransform'].includes(name)) {
        return (...args: unknown[]) => calls.push(`${name}:${args.join(',')}`);
      }
      return () => undefined;
    },
    set: () => true,
  }) as unknown as CanvasRenderingContext2D;
}

const HUE: Record<string, number> = {
  firework: 28, blackhole: 265, shark: 200, bamboo: 28, soaker: 200, rainbow: 120, bazooka: 45, rpg: 15,
};

test('slide 2 exports its eight weapons onto the slide-1 guns they share', () => {
  assert.equal(SET_TWO_IDS.length, 8);
  assert.deepEqual([...SET_TWO_IDS].sort(), [
    'bamboo', 'bazooka', 'blackhole', 'firework', 'rainbow', 'rpg', 'shark', 'soaker',
  ]);
  for (const id of SET_TWO_IDS) {
    assert.equal(SET_TWO_BY_SLIDE1_ID[id], id, `${id} keeps its slide-1 name`);
    assert.equal(setTwoIdFor(id), id);
  }
  // Every slide-2 gun exists on slide 1 under the same name, so nothing has to
  // be registered as a brand-new weapon.
  assert.equal(setTwoIdFor('pistol'), null);
  assert.equal(setTwoIdFor(undefined), null);
});

test('slide 2 offers a design and a shot card on the seven guns it updates', () => {
  assert.equal(SET_TWO_DESIGN_WEAPONS.length, 7);
  assert.equal(SET_TWO_EFFECT_WEAPONS.length, 7);
  for (const id of SET_TWO_DESIGN_WEAPONS) {
    assert.ok(getGunVariantOptions(id).some((o) => o.id === 'set2'), `${id} offers the slide-2 art`);
    assert.ok(getGunEffectOptions(id).some((o) => o.id === 'set2'), `${id} offers the slide-2 shot`);
  }
  // BLACK HOLE already wears slide 2's cannon ("Terbaru") and already fires
  // slide 2's collapsing singularity ("Baru"), so it needs no extra card.
  assert.equal(SET_TWO_DESIGN_WEAPONS.includes('blackhole' as never), false);
  assert.ok(getGunVariantOptions('blackhole').some((o) => o.id === 'latest'));
  assert.deepEqual(getGunEffectOptions('blackhole').map((o) => o.id), ['original', 'new']);
});

test('exporting slide 2 never changes a gun’s default look or shot', () => {
  assert.equal(getGunVariant('firework'), 'set7');
  assert.equal(getGunVariant('soaker'), 'set1');
  assert.equal(getGunEffect('bazooka'), 'set7');
  assert.equal(getGunEffect('firework'), 'new');
  setGunVariant('shark', 'set2');
  setGunEffect('shark', 'set2');
  assert.equal(getGunVariant('shark'), 'set2');
  assert.equal(getGunEffect('shark'), 'set2');
  setGunVariant('shark', 'set7');
  setGunEffect('shark', 'set7');
});

test('the Slide 2 card paints slide 2’s own artwork, through the normal pipeline', () => {
  for (const id of SET_TWO_IDS) {
    const viaCard: string[] = [];
    gunState.twoLive = false;
    gunState.twoState = null;
    drawGun(fakeCtx(viaCard), id as never, 210, 596, 1.7, 0, true, undefined, 'set2');
    const viaArt: string[] = [];
    // The card rebuilds the same rested pose from the shared shot clock.
    const hue = id === 'blackhole' ? 215 + ((gunState.shots * 53) % 105) : 28;
    drawSetTwoGun(fakeCtx(viaArt), id, 210, 596, restTwoState(hue, { time: 1.7, loadP: 1 }));
    assert.ok(viaCard.length > 80, `${id} draws a full gun (${viaCard.length} ops)`);
    // The card must be the ported slide-2 renderer and nothing else (the
    // pipeline's own save/restore wrapper aside).
    assert.deepEqual(viaCard.slice(1, -1), viaArt, `${id} draws exactly slide 2's art`);
  }
});

test('every slide-2 muzzle recipe spawns its own FX at the barrel', () => {
  for (const id of SET_TWO_IDS) {
    const fx = new SetTwoFx();
    fx.cx = 210;
    fx.cy = 262;
    fx.radius = 100;
    fx.gunY = 596;
    fx.h = 760;
    fx.time = 1.7;
    fx.host = { shake: () => {}, emit: () => {} };
    const round = fx.fire(id, HUE[id]);
    assert.equal(fx.weapon, id);
    assert.ok(fx.particles.length > 0, `${id} spawns muzzle particles`);
    assert.ok(fx.glows.length > 0, `${id} lights its muzzle`);
    // Bazooka and the RPG vent a fireball instead of a firework shock ring.
    assert.ok(fx.rings.length > 0 || fx.fireballs.length > 0, `${id} marks its muzzle`);
    assert.ok(round.hue === HUE[id] && round.seed >= 0 && round.seed <= 10);
    assert.equal(round.age, 0);
    assert.ok(fx.busy);
    fx.draw(fakeCtx(), 1.7);
    fx.clear();
    assert.equal(fx.busy, false, `${id} clears cleanly`);
  }
});

test('slide-2 impacts run their own recipe at the point the round landed', () => {
  const expect = {
    firework: { parts: true, callout: true },
    blackhole: { parts: true, voids: true, callout: true },
    shark: { parts: true, bites: true, callout: true },
    bamboo: { parts: true, bites: true, callout: true },
    soaker: { parts: true, bubbles: true, callout: true },
    rainbow: { parts: true, bites: true, beams: true, callout: true },
    bazooka: { parts: true, bites: true, debris: true, callout: true },
    rpg: { parts: true, bites: true, debris: true, callout: true },
  } as Record<string, Record<string, boolean>>;
  for (const id of SET_TWO_IDS) {
    const fx = new SetTwoFx();
    fx.cx = 210;
    fx.cy = 262;
    fx.radius = 100;
    fx.gunY = 596;
    fx.h = 760;
    fx.host = { shake: () => {}, emit: () => {} };
    fx.stick(id, 210, 368, HUE[id], 3.3);
    const want = expect[id];
    assert.ok(fx.particles.length > 0, `${id} bursts`);
    if (want.voids) assert.ok(fx.voids.length > 0, `${id} opens a void`);
    if (want.bites) assert.ok(fx.biteMarks.length > 0, `${id} leaves its bite mark`);
    if (want.bubbles) assert.ok(fx.bubbles.length > 0, `${id} splashes bubbles`);
    if (want.beams) assert.ok(fx.beams.length > 0, `${id} fires its beam`);
    if (want.debris) assert.ok(fx.debris.length > 0, `${id} throws shrapnel`);
    assert.ok(fx.texts.length > 0, `${id} shows its own callout`);
    // The plain firework pop is the one slide-2 impact that never flashes.
    if (id !== 'firework') assert.ok(fx.flash > 0, `${id} flashes the screen`);
    fx.stick(id, 210, 368, HUE[id], 3.3);
    fx.stick(id, 210, 368, HUE[id], 3.3);
    fx.stick(id, 210, 368, HUE[id], 3.3);
    assert.ok(fx.texts.some((t) => /BOOM|KABOOM|ZAP|DUK|BYUR|CHOMP|DUAR|\+1/.test(t.text)),
      `${id} keeps slide 2's callouts`);
    fx.draw(fakeCtx(), 1);
    fx.clear();
    assert.equal(fx.busy, false);
  }
});

test('slide 2 keeps its own per-round hue cycle', () => {
  assert.equal(twoAmmoHue('blackhole', 0), 215);
  assert.equal(twoAmmoHue('blackhole', 2), 215 + ((2 * 53) % 105));
  assert.equal(twoAmmoHue('rainbow', 3), 141);
  assert.deepEqual([0, 1, 2, 3, 4, 5, 6].map((i) => twoAmmoHue('bazooka', i)), [45, 90, 140, 200, 280, 0, 45]);
  assert.equal(twoAmmoHue('firework', 0, 28), 28);
  assert.equal(twoAmmoHue('firework', 1, 28), 69);
});

test('a live slide-2 gun fires slide 2’s round, not slide 1’s', () => {
  for (const id of SET_TWO_DESIGN_WEAPONS) {
    setGunEffect(id as never, 'set2');
    const game = probe(id);
    game.shoot();
    const projs = game.projs as Record<string, unknown>[];
    assert.ok(projs.length > 0, `${id} fires`);
    assert.ok(projs.every((p) => p.setTwo), `${id} carries a slide-2 round`);
    const fx = (game as unknown as { s2wState?: SetTwoFx }).s2wState;
    assert.ok(fx && fx.busy, `${id} runs slide 2's FX layer`);
    setGunEffect(id as never, getGunEffectOptions(id as never)[0].id as never);
  }
});

function probe(weapon: string) {
  const game = Object.create(Game.prototype) as Game & Record<string, unknown>;
  const particles: unknown[] = [];
  const lights: unknown[] = [];
  const sink = { push: (p: unknown) => particles.push(p), light: (...args: unknown[]) => lights.push(args) };
  Object.assign(game, {
    level: makeLevel(3), weapon: getWeapon(weapon as never), state: 'play',
    projs: [], beams: [], items: [], flyers: [], frags: [], stuck: 0,
    particles, lights, sink,
    events: {}, rot: 0, levelTime: 0, camY: 0, bump: 0, shake: 0, hitStop: 0, flashWhite: 0,
    cooldown: 0, reloadT: 0, ammoLeft: 12, snowLoaded: 5, maxAmmoMult: 1,
    speedMult: 1, dmgMult: 1, rt: 0, coins: 0, score: 0, slowT: 0, slowF: 1,
    combo: 0, lastHit: -10, time: 1, hitFlash: 0, timeScale: 1,
    faceCtx: fakeCtx(), faceScale: 2, chargeLevel: 0, chargeT: 0, charging: false,
  });
  return game;
}
