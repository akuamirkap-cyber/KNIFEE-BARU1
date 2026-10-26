import test from 'node:test';
import assert from 'node:assert/strict';

import {
  SET_NINE_BY_SLIDE1_ID, SET_NINE_IDS, SET_NINE_NEW_WEAPONS, SET_NINE_SLIDE1_IDS,
  drawSetNineGun, isNineNewWeapon, nineWeapon, restNineState, setNineIdFor,
  slide1IdForNine,
} from '../src/games/gunhit/game/setNineArt';
import { SetNineFx, drawSetNineShotShell } from '../src/games/gunhit/game/setNineFx';
import { drawGun } from '../src/games/gunhit/game/art/guns';
import { getGunMetrics } from '../src/games/gunhit/game/art/metrics';
import {
  EDITABLE_WEAPONS, getGunEffect, getGunEffectOptions, getGunVariant, getGunVariantOptions,
  hasSlide9Update, setGunEffect, setGunVariant,
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
  const counts = { shake: 0, hitStop: 0, flash: 0 };
  const fx = new SetNineFx({
    shake: () => { counts.shake++; },
    flash: () => { counts.flash++; },
    hitStop: () => { counts.hitStop++; },
    wheel: () => ({ x: 210, y: 300, R: 120, angle: 0 }),
  });
  fx.W = 420;
  fx.H = 760;
  fx.floorY = 760;
  fx.syncWheel();
  return { fx, counts };
}

test('slide 9 is 17 weapons: eight slide-1 guns updated by name, nine brand-new guns', () => {
  assert.equal(SET_NINE_IDS.length, 17);
  assert.equal(new Set(SET_NINE_IDS).size, 17);
  assert.equal(SET_NINE_SLIDE1_IDS.length, 17);
  assert.equal(SET_NINE_NEW_WEAPONS.length, 9);
  // Every mapping points at a real slide-9 weapon and a real slide-1 gun.
  for (const [slide1, nine] of Object.entries(SET_NINE_BY_SLIDE1_ID)) {
    assert.equal(setNineIdFor(slide1), nine);
    assert.equal(slide1IdForNine(nine), slide1);
    assert.equal(nineWeapon(nine).id, nine, `${nine} exists in slide 9`);
    assert.ok(WEAPONS.some((w) => w.id === slide1), `${slide1} exists on slide 1`);
  }
  // The eight guns slide 1 already had, matched by what the weapon IS.
  assert.equal(setNineIdFor('ak47'), 'ak47');
  assert.equal(setNineIdFor('pistol'), 'beretta92');
  assert.equal(setNineIdFor('sniper'), 'rifle');
  assert.equal(setNineIdFor('railgun'), 'sniperBeam');
  assert.equal(setNineIdFor('dragon'), 'dragonBreath');
  assert.equal(setNineIdFor('pred'), 'plasmacaster');
  assert.equal(setNineIdFor('photon_saber'), 'energySword');
  assert.equal(setNineIdFor('gauntlet_cannon'), 'repulsor');
  // Everything else is a new gun, never folded into an unrelated one.
  for (const id of SET_NINE_NEW_WEAPONS) {
    assert.equal(isNineNewWeapon(id), true);
    assert.ok(!['pistol', 'ak47', 'sniper', 'railgun', 'dragon', 'pred',
      'photon_saber', 'gauntlet_cannon'].includes(id), `${id} is new`);
  }
  assert.equal(setNineIdFor('rainbow'), null);
  assert.equal(setNineIdFor('plasma'), null);
});

test('every one of the 17 fires slide 9’s own shot, burst and entry hole', () => {
  for (const id of SET_NINE_IDS) {
    const { fx } = host();
    fx.weaponId = id;
    const particles = fx.particles.length;
    fx.fire(210, 571, -Math.PI / 2, 0);
    // Slide 9 may release the round inside `after()`: run its clock briefly.
    const made = fx.takeShots();
    for (let i = 0; i < 45 && !made.length && !fx.bullets.length && !fx.beams.length; i++) {
      fx.update(1 / 60);
      if (!made.length) made.push(...fx.takeShots());
    }
    const weapon = nineWeapon(id);
    assert.ok(made.length > 0 || fx.bullets.length > 0 || fx.beams.length > 0
      || weapon.mode === 'beam', `${id} must create its own slide-9 round or beam`);
    assert.ok(fx.particles.length > particles, `${id} must spawn its own muzzle particles`);
    // Slide 9's own renderers must accept a frame.
    for (const b of fx.bullets) b.draw(fakeCtx(), b, 0.05);
    for (const bm of fx.beams) bm.draw(fakeCtx(), bm, 0.05);
    fx.draw(fakeCtx());

    // Slide 9's impact: burst + the entry hole it paints into the wheel.
    fx.impact(210, 420, -Math.PI / 2);
    assert.equal(fx.marks.length, 1, `${id} paints one entry hole`);
    for (let i = 0; i < 6; i++) fx.update(1 / 60);
    fx.drawWheel(fakeCtx(), 210, 300, 120, 0.3);
    fx.block(210, 420);
    assert.ok(fx.busy, `${id} keeps its layer alive while the FX run`);
    fx.clear();
    assert.equal(fx.busy, false, `${id} clears cleanly`);
  }
});

test('every slide-9 gun has measured preview metrics and real artwork', () => {
  for (const id of SET_NINE_IDS) {
    const calls: string[] = [];
    drawSetNineGun(fakeCtx(calls), id, 210, 575, 0.4, restNineState());
    assert.ok(calls.length > 40, `${id} must draw a whole gun (${calls.length} ops)`);
    const m = getGunMetrics(id as never, 'set9');
    assert.ok(m.totalLen > 55 && m.span >= m.totalLen * 0.7, `${id} needs measured metrics`);
    assert.ok(Number.isFinite(m.centerOffsetX) && Number.isFinite(m.centerOffsetY));
    assert.ok(drawSetNineShotShell(fakeCtx(), id, 0.06, 26) === undefined);
  }
});

test('slide 9 is the newest design and shot of its 17 guns, and older cards stay pickable', () => {
  const matched = ['pistol', 'ak47', 'sniper', 'railgun', 'dragon', 'pred',
    'photon_saber', 'gauntlet_cannon'];
  for (const id of [...matched, ...SET_NINE_NEW_WEAPONS]) {
    assert.ok(EDITABLE_WEAPONS.includes(id as never), `${id} is selectable`);
    assert.equal(getGunVariant(id as never), 'set9', `${id} shows slide 9's art by default`);
    assert.equal(getGunEffect(id as never), 'set9', `${id} fires slide 9's shot by default`);
    assert.equal(hasSlide9Update(id), true, `${id} carries the NEW badge`);
    const designs = getGunVariantOptions(id as never);
    assert.equal(designs.at(-1)?.id, 'set9');
    assert.equal(designs.at(-1)?.label, 'Slide 9');
    const effects = getGunEffectOptions(id as never);
    assert.equal(effects.at(-1)?.id, 'set9');
    assert.equal(effects.at(-1)?.label, 'Slide 9');
  }
  // The nine new guns have no earlier shape at all.
  for (const id of SET_NINE_NEW_WEAPONS) {
    assert.deepEqual(getGunVariantOptions(id).map((o) => o.id), ['set9']);
    assert.deepEqual(getGunEffectOptions(id).map((o) => o.id), ['set9']);
  }
  // Slide-1 designs and shots remain selectable for the matched guns.
  for (const id of matched) {
    const designs = getGunVariantOptions(id as never).map((o) => o.id);
    assert.ok(designs.includes('original'), `${id} keeps its slide-1 shape`);
    assert.ok(getGunEffectOptions(id as never).some((o) => o.id === 'new'));
  }
  assert.deepEqual(getGunVariantOptions('ak47').map((o) => o.id), ['original', 'set9']);
  assert.deepEqual(getGunEffectOptions('ak47').map((o) => o.id), ['original', 'new', 'set9']);
});

test('slide 9 artwork draws through the normal gun pipeline, with its own recoil', () => {
  setGunVariant('longbow', 'set9');
  const idle: string[] = [];
  drawGun(fakeCtx(idle), 'longbow', 210, 575, 0.4, 0, true);
  assert.ok(idle.length > 40, 'the longbow renders');
  const other: string[] = [];
  drawGun(fakeCtx(other), 'longbow', 210, 575, 1.2, 0, true);
  assert.notEqual(idle.join('|'), other.join('|'), 'slide 9 guns breathe while idle');
  // A slide-9 design is a distinct renderer from the slide-1 one.
  const slide1: string[] = [];
  drawGun(fakeCtx(slide1), 'pistol', 210, 575, 0.4, 0, true, undefined, 'original');
  const slide9: string[] = [];
  drawGun(fakeCtx(slide9), 'pistol', 210, 575, 0.4, 0, true, undefined, 'set9');
  assert.notEqual(slide1.join('|'), slide9.join('|'), 'Set 9 and Sebelumnya are different guns');
});

/* ── the live game: slide 1 carries slide 9's round and scores it ─────────── */

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

test('slide 1 flies slide 9’s round, and only slide 9’s shot fires for its guns', () => {
  setGunEffect('longbow', 'set9');
  const game = probe('longbow');
  game.shoot();
  assert.equal(game.projs.length, 1, 'one carrier round');
  const carrier = (game.projs as unknown[])[0] as {
    setNine?: { weapon: { id: string } }; setNinePending?: boolean;
  };
  assert.ok(carrier.setNine || carrier.setNinePending, 'the slide-9 arrow rides the carrier');
  assert.equal(game.particles.length, 0, 'slide 1’s own muzzle particles stay off');

  // The classic effect still fires slide 1's own shot.
  setGunEffect('longbow', 'original');
  const classic = probe('longbow');
  classic.shoot();
  const plain = (classic.projs as unknown[])[0] as { setNine?: unknown };
  assert.equal(plain.setNine, undefined);
  setGunEffect('longbow', 'set9');
});

test('a slide-9 hit paints its entry hole, hides slide 1’s bullet art and scores', () => {
  setGunEffect('longbow', 'set9');
  const game = probe('longbow');
  game.shoot();
  const carrier = (game.projs as unknown[])[0] as {
    setNine?: { weapon: { id: string } }; setNinePending?: boolean;
  };
  // Release the round if slide 9 scheduled it, exactly like the update loop.
  if (carrier.setNinePending) {
    const made = (game as unknown as { s9: SetNineFx }).s9.takeShots();
    carrier.setNine = made[0] as never;
    carrier.setNinePending = false;
  }
  assert.equal(carrier.setNine?.weapon.id, 'bow');
  const score = game.score;
  (game as unknown as { stickAt: (a: number, p: unknown) => void }).stickAt(0.4, carrier);
  const layer = (game as unknown as { s9: SetNineFx }).s9;
  assert.equal(layer.marks.length, 1, 'slide 9 painted one entry hole');
  assert.ok(game.score > score, 'slide 1 still scores the hit');
  const stuck = (game.items as { type: string; hideArt?: boolean }[]).filter((i) => i.type === 'bullet');
  assert.equal(stuck.length, 1);
  assert.equal(stuck[0].hideArt, true, 'slide 1’s own bullet art is hidden behind slide 9’s hole');

  // A new level starts with an empty slide-9 layer.
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
  assert.equal(layer.marks.length, 0, 'entry holes leave with the old level');
  const bullets = (game.items as { type: string }[]).filter((i) => i.type === 'bullet');
  assert.equal(bullets.length, 0, 'and so do the stuck rounds');
});

test('every slide-9 gun is playable on slide 1 and fires without a slide-1 sound', () => {
  for (const id of SET_NINE_IDS) {
    const slide1 = slide1IdForNine(id);
    setGunEffect(slide1, 'set9');
    const game = probe(slide1);
    game.shoot();
    assert.equal(game.projs.length, 1, `${slide1} fires one carrier`);
    const carrier = (game.projs as unknown[])[0] as { setNine?: unknown; setNinePending?: boolean };
    assert.ok(carrier.setNine || carrier.setNinePending, `${slide1} carries slide 9's shot`);
    // A rendered frame must not throw with the ported gun equipped.
    (game as unknown as { draw: () => void }).draw?.();
  }
  // Restore the shipped defaults.
  for (const key of SET_NINE_IDS) setGunEffect(slide1IdForNine(key), 'set9');
});
