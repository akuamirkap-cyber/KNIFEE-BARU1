import test from 'node:test';
import assert from 'node:assert/strict';

import {
  SET_SIX_BY_SLIDE1_ID, SET_SIX_IDS, SET_SIX_NEW_WEAPONS, SET_SIX_SLIDE1_IDS,
  drawSetSixGun, drawSetSixIcon, isSixId, restSixState, setSixIdFor, sixCooldown,
  sixScale, sixStateFor, sixWeapon, slide1IdForSix,
} from '../src/games/gunhit/game/setSixArt';
import { SetSixFx, SIX_BEAM_SPEED, drawSetSixShotShell } from '../src/games/gunhit/game/setSixFx';
import { drawGun } from '../src/games/gunhit/game/art/guns';
import { getGunMetrics } from '../src/games/gunhit/game/art/metrics';
import {
  getGunEffect, getGunEffectOptions, getGunVariant, getGunVariantOptions,
  hasSlide6Update, hasSlide9Update, setGunEffect,
} from '../src/games/gunhit/game/art/gunVariants';
import { Game, makeLevel } from '../src/games/gunhit/game/Game';
import { WEAPONS, getWeapon } from '../src/games/gunhit/game/weapons';

/** A canvas that records nothing but accepts every call, like the other suites. */
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
        'translate', 'rotate', 'scale', 'save', 'restore'].includes(name)) {
        return (...args: unknown[]) => calls.push(`${name}:${args.join(',')}`);
      }
      return () => undefined;
    },
    set: () => true,
  }) as unknown as CanvasRenderingContext2D;
}

function host() {
  const counts = { shake: 0 };
  const fx = new SetSixFx({
    shake: () => { counts.shake++; },
    wheel: () => ({ x: 210, y: 300, R: 92, angle: 0 }),
  });
  fx.syncWheel();
  return { fx, counts };
}

test('slide 6 adds one design and one shot to the three guns slide 1 already has', () => {
  assert.equal(SET_SIX_IDS.length, 3);
  assert.equal(new Set(SET_SIX_IDS).size, 3);
  assert.equal(SET_SIX_SLIDE1_IDS.length, 3);
  // Every slide-6 beam already exists on slide 1 under the name slide 9 gave
  // it, so this export never adds a gun.
  assert.equal(SET_SIX_NEW_WEAPONS.length, 0);
  for (const [slide1, six] of Object.entries(SET_SIX_BY_SLIDE1_ID)) {
    assert.equal(setSixIdFor(slide1), six);
    assert.equal(slide1IdForSix(six), slide1);
    assert.equal(sixWeapon(six).id, six, `${six} exists in slide 6`);
    assert.ok(WEAPONS.some((w) => w.id === slide1), `${slide1} exists on slide 1`);
  }
  // Matched by what the weapon IS, not by a loose name.
  assert.equal(setSixIdFor('railgun'), 'sniper');
  assert.equal(setSixIdFor('heat_ray'), 'tripod');
  assert.equal(setSixIdFor('gauntlet_cannon'), 'iron');
  assert.equal(isSixId('sniper'), true);
  assert.equal(setSixIdFor('sniper'), null, 'the slide-6 id is not a slide-1 id');
  assert.equal(setSixIdFor('ak47'), null);
  assert.equal(setSixIdFor('xm42'), null);
  // Slide 6's own trigger intervals travel with the export.
  assert.equal(sixCooldown('sniper'), 0.6);
  assert.equal(sixCooldown('tripod'), 0.6);
  assert.equal(sixCooldown('iron'), 0.45);
});

test('every slide-6 beam fires with its own burst, lifetime and scorch mark', () => {
  const durations: Record<string, number> = { sniper: 0.32, tripod: 0.45, iron: 0.28 };
  for (const id of SET_SIX_IDS) {
    const { fx, counts } = host();
    fx.selectWeapon(id);
    fx.fire(210, 571);
    assert.equal(fx.beams.length, 1, `${id} paints one beam`);
    assert.equal(fx.beams[0].max, durations[id], `${id} keeps slide 6's beam lifetime`);
    assert.ok(fx.parts.length > 0, `${id} throws its own muzzle burst`);
    // The beam draws the whole way from the muzzle to the wheel, then fades.
    for (let i = 0; i < 10; i++) fx.update(1 / 60);
    assert.equal(fx.beams.length, 1, `${id} is still lit a frame after the trigger`);
    fx.drawBeam(fakeCtx());
    fx.draw(fakeCtx());
    for (let i = 0; i < 30; i++) fx.update(1 / 60);
    assert.equal(fx.beams.length, 0, `${id} beam dies after its own lifetime`);

    // Slide 6's impact: the rim burst plus the scorch mark it burns in.
    const before = fx.parts.length;
    fx.impact(210, 392, 0.4);
    assert.ok(fx.parts.length > before, `${id} bursts where it lands`);
    assert.equal(fx.marks.length, 1, `${id} leaves one scorch mark`);
    assert.equal(counts.shake, 1, `${id} shakes the camera like slide 6`);
    fx.drawWheel(fakeCtx(), 210, 300, 92, 0.3);
    fx.block(210, 392);
    assert.ok(fx.busy, `${id} keeps its layer alive while the FX run`);
    fx.clear();
    assert.equal(fx.busy, false, `${id} clears cleanly`);
  }
});

test('every slide-6 gun draws real art, has measured metrics and a live card', () => {
  for (const id of SET_SIX_IDS) {
    const calls: string[] = [];
    drawSetSixGun(fakeCtx(calls), id, 210, 575, 0.4, restSixState());
    assert.ok(calls.length > 40, `${id} must draw a whole gun (${calls.length} ops)`);
    // The icon path and the live path are the same drawing at a rested pose.
    const icon: string[] = [];
    drawSetSixIcon(fakeCtx(icon), id, 210, 575);
    assert.ok(icon.length > 40, `${id} draws its menu icon`);
    const slide1 = slide1IdForSix(id);
    const m = getGunMetrics(slide1, 'set6');
    assert.ok(m.totalLen > 100 && m.totalLen <= 180, `${id} is drawn at slide 1's size`);
    assert.ok(m.span >= m.totalLen * 0.7, `${id} needs measured metrics`);
    assert.ok(Number.isFinite(m.centerOffsetX) && Number.isFinite(m.centerOffsetY));
    assert.ok(sixScale(id) > 0.3 && sixScale(id) <= 1.45);
    assert.equal(drawSetSixShotShell(fakeCtx(), id, 0.06), undefined);
    // A rendered frame of the live game must not throw with the gun equipped.
    const frame: string[] = [];
    drawGun(fakeCtx(frame), slide1, 210, 575, 0.4, 0, true, undefined, 'set6');
    assert.ok(frame.length > 40, `${slide1} renders slide 6's design`);
  }
});

test('slide 6 is a pickable card and only a card: the newest defaults stay', () => {
  for (const slide1 of SET_SIX_SLIDE1_IDS) {
    assert.equal(hasSlide6Update(slide1), true, `${slide1} carries the NEW badge`);
    const designs = getGunVariantOptions(slide1);
    const card = designs.find((o) => o.id === 'set6');
    assert.ok(card, `${slide1} keeps its slide-6 design card`);
    assert.equal(card!.label, 'Slide 4');
    const effects = getGunEffectOptions(slide1);
    const shot = effects.find((o) => o.id === 'set6');
    assert.ok(shot, `${slide1} keeps its slide-6 shot card`);
    assert.equal(shot!.label, 'Slide 4');
    // Every gun it touches has a slide-9 card: that is where the name came from.
    assert.equal(hasSlide9Update(slide1), true);
    // The pickup already selected for this gun does not change.
    assert.ok(designs.some((o) => o.id === getGunVariant(slide1)));
    assert.ok(effects.some((o) => o.id === getGunEffect(slide1)));
  }
  // A gun slide 6 never touched gains nothing.
  assert.equal(hasSlide6Update('ak47'), false);
  assert.equal(getGunVariantOptions('ak47').some((o) => o.id === 'set6'), false);
  assert.equal(getGunEffectOptions('ak47').some((o) => o.id === 'set6'), false);
  // Slide 6's draw state follows slide 6's own trigger interval.
  const state = sixStateFor(0.3, 'sniper');
  assert.equal(state.ready, 0.5);
  assert.equal(state.fireT, 0.3);
  assert.ok((state.kick ?? 0) > 0.1 && (state.kick ?? 0) <= 1);
  assert.equal(sixStateFor(9, 'sniper').ready, 1);
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
    buff: null, treasureBuff: null, choosingBuff: false,
  });
  return game;
}

test('slide 6 fires its own beam: slide 1 only carries the hit to the wheel', () => {
  const slide1 = slide1IdForSix('sniper');
  setGunEffect(slide1, 'set6');
  try {
    const game = probe(slide1);
    game.shoot();
    const layer = (game as unknown as { s6: SetSixFx }).s6;
    assert.equal(game.projs.length, 1, 'one carrier round');
    assert.equal(layer.beams.length, 1, 'slide 6 painted its beam on the trigger');
    const carrier = (game.projs as { setSix?: true; vy: number }[])[0];
    assert.equal(carrier.setSix, true, 'the carrier belongs to slide 6');
    assert.equal(carrier.vy, -SIX_BEAM_SPEED, 'a hitscan beam crosses the field at once');
    // Slide 6's trigger interval, not slide 1's.
    assert.ok(Math.abs((game.cooldown as number) - sixCooldown('sniper')) < 1e-6);

    // The hit paints slide 6's scorch mark and hides slide 1's bullet art.
    const score = game.score as number;
    (game as unknown as { stickAt: (a: number, p: unknown) => void }).stickAt(0.4, carrier);
    assert.equal(layer.marks.length, 1, 'slide 6 burned one scorch mark into the wheel');
    assert.ok((game.score as number) > score, 'slide 1 still scores the hit');
    const stuck = (game.items as { type: string; hideArt?: boolean }[]).filter((i) => i.type === 'bullet');
    assert.equal(stuck.length, 1);
    assert.equal(stuck[0].hideArt, true, 'slide 1’s own bullet art is hidden');

    // A shot stopped by an occupied spot still bursts like slide 6's.
    const parts = layer.parts.length;
    (game as unknown as { fail: (p: unknown) => void }).fail(carrier);
    assert.ok(layer.parts.length > parts, 'the blocked shot throws slide 6’s burst');
  } finally {
    setGunEffect(slide1, 'set11');
  }
});

test('a different slide-6 gun starts its layer clean, and the classic shot returns', () => {
  const { fx } = host();
  fx.selectWeapon('sniper');
  fx.fire(210, 571);
  fx.impact(210, 392, 0.2);
  assert.ok(fx.busy);
  fx.selectWeapon('tripod');
  assert.equal(fx.busy, false, 'another gun never inherits the last one’s scorch');
  assert.equal(fx.weaponId, 'tripod');

  // The same gun with the slide-1 shot is slide 1's own gun again.
  const slide1 = slide1IdForSix('tripod');
  setGunEffect(slide1, 'original');
  try {
    const game = probe(slide1);
    game.shoot();
    const carrier = (game.projs as { setSix?: true }[])[0];
    assert.equal(carrier.setSix, undefined, 'slide 6 must not fire for the classic card');
    assert.equal((game as unknown as { s6State?: SetSixFx }).s6State, undefined);
  } finally {
    setGunEffect(slide1, 'set11');
  }
});
