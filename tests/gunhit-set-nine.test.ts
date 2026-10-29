import test from 'node:test';
import { RETIRED_WEAPONS } from '../src/games/gunhit/game/retiredWeapons';
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
  hasSlide9Update, hasSlide11Update, setGunEffect, setGunVariant,
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
    if (RETIRED_WEAPONS.has(slide1)) { assert.ok(!WEAPONS.some(w => w.id === slide1)); continue; }
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

test('slide 9 keeps its card on all 17 guns, newest wherever slide 11 has no newer one', () => {
  const matched = ['pistol', 'ak47', 'sniper', 'railgun', 'dragon',
    'photon_saber', 'gauntlet_cannon'];
  // Slide 11 later adopted every one of those eight, plus eight of the nine
  // guns slide 9 introduced; YAUTJA is the only slide-9 gun it never had.
  const elevenNewer = (id: string) => hasSlide11Update(id);
  for (const id of [...matched, ...SET_NINE_NEW_WEAPONS]) {
    if (RETIRED_WEAPONS.has(id)) continue;
    assert.ok(EDITABLE_WEAPONS.includes(id as never), `${id} is selectable`);
    assert.equal(hasSlide9Update(id), true, `${id} carries the NEW badge`);
    const newest = elevenNewer(id) ? 'set11' : 'set9';
    assert.equal(
      getGunVariant(id as never),
      id === 'pistol' || id === 'ak47' || id === 'sniper' || id === 'gauntlet_cannon' ? 'original' : newest,
      `${id} shows its expected default art`,
    );
    assert.equal(getGunEffect(id as never), id === 'sniper' || id === 'photon_saber' ? 'set9' : id === 'railgun' || id === 'gauntlet_cannon' ? 'set7' : newest, `${id} fires its requested shot by default`);
    // Slide 9's own card is always there, labelled, and pickable.
    const designs = getGunVariantOptions(id as never);
    const design = designs.find((o) => o.id === 'set9');
    assert.ok(design, `${id} keeps its slide-9 design card`);
    assert.equal(design!.label, 'Slide 4');
    const effects = getGunEffectOptions(id as never);
    const effect = effects.find((o) => o.id === 'set9');
    assert.ok(effect, `${id} keeps its slide-9 effect card`);
    assert.equal(effect!.label, 'Slide 4');
    // Whatever is default must be one of the cards offered.
    assert.ok(designs.some((o) => o.id === getGunVariant(id as never)));
    assert.ok(effects.some((o) => o.id === getGunEffect(id as never)));
  }
  // YAUTJA's imported renderer remains internally available but it is retired.
  assert.deepEqual(getGunVariantOptions('yautja'), []);
  assert.deepEqual(getGunEffectOptions('yautja'), []);
  // Slide-1 designs and shots remain selectable for the matched guns.
  for (const id of matched) {
    const designs = getGunVariantOptions(id as never).map((o) => o.id);
    assert.ok(designs.includes('original'), `${id} keeps its slide-1 shape`);
    assert.ok(getGunEffectOptions(id as never).some((o) => o.id === 'new'));
  }
  assert.deepEqual(getGunVariantOptions('ak47').map((o) => o.id), ['original', 'set9', 'set11']);
  assert.deepEqual(getGunEffectOptions('ak47').map((o) => o.id), ['original', 'new', 'set9', 'set11']);
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

test('the carried round keeps slide 9’s trail spacing, so it never freezes', () => {
  const { fx } = host();
  fx.selectWeapon('ak47');
  fx.fire(210, 560, -Math.PI / 2, 0);
  const bullet = fx.takeShots()[0];
  assert.ok(bullet);
  // Slide 9's tail is a pixel length: `trailMax` samples, one per 60 Hz frame at
  // the round's own speed. Slide 1 must reproduce that LENGTH, never more.
  const step = Math.hypot(bullet.vx, bullet.vy) / 60;
  const tail = step * (bullet.trailMax - 1);
  const span = (b: { trail: { x: number; y: number }[] }) => b.trail.reduce(
    (sum, p, i) => (i === 0 ? sum : sum + Math.hypot(p.x - b.trail[i - 1].x, p.y - b.trail[i - 1].y)), 0);
  // Slide 1 moves the same round at its own game speed - and can stall a frame.
  let y = 560;
  let flown = 0;
  for (const travel of [60, 240, 30, 0, 120, 207, 90, 150]) {
    y -= travel;
    flown += travel;
    fx.carry(bullet, 210, y, -Math.PI / 2);
    for (let i = 1; i < bullet.trail.length; i++) {
      const gap = Math.hypot(
        bullet.trail[i].x - bullet.trail[i - 1].x,
        bullet.trail[i].y - bullet.trail[i - 1].y,
      );
      // Fine, frame-rate independent sampling: no long straight bar behind the
      // round, whatever slide 1's dt is.
      assert.ok(gap <= 6.001, `trail gap ${gap.toFixed(1)} is coarser than slide 1's 6px step`);
    }
    // The tail is slide 9's own length, in pixels, at every speed.
    assert.ok(span(bullet) <= tail + 6.5,
      `tail ${span(bullet).toFixed(0)}px is longer than slide 9's ${tail.toFixed(0)}px`);
    // Once the round has flown a full tail length, the comet is complete.
    assert.ok(span(bullet) >= Math.min(tail, flown) * 0.9, 'and it is a full comet, not a stub');
    assert.ok(bullet.trail.length <= 140, 'the point list stays bounded');
    assert.equal(bullet.y, y, 'and it still follows slide 1');
  }
  // A stalled frame must not leave a hole in the tail.
  const last = bullet.trail[bullet.trail.length - 1];
  assert.equal(last.y, bullet.y, 'the tail ends on the round itself');
});

test('slide 1 flies slide 9’s round, and only slide 9’s shot fires for its guns', () => {
  setGunEffect('ak47', 'set9');
  const game = probe('ak47');
  game.shoot();
  assert.equal(game.projs.length, 1, 'one carrier round');
  const carrier = (game.projs as unknown[])[0] as {
    setNine?: { weapon: { id: string } }; setNinePending?: boolean;
  };
  assert.ok(carrier.setNine || carrier.setNinePending, 'the slide-9 arrow rides the carrier');
  assert.equal(game.particles.length, 0, 'slide 1’s own muzzle particles stay off');

  // The classic effect still fires slide 1's own shot.
  setGunEffect('ak47', 'original');
  const classic = probe('ak47');
  classic.shoot();
  const plain = (classic.projs as unknown[])[0] as { setNine?: unknown };
  assert.equal(plain.setNine, undefined);
  setGunEffect('ak47', 'set9');
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
    const carrier = (game.projs as unknown[])[0] as { setNine?: unknown; setNinePending?: boolean; setNineBeam?: number };
    // A beam gun's carrier only scores: slide 9's beam is the shot.
    assert.ok(carrier.setNine || carrier.setNinePending || carrier.setNineBeam !== undefined, `${slide1} carries slide 9's shot`);
    // A rendered frame must not throw with the ported gun equipped.
    (game as unknown as { draw: () => void }).draw?.();
  }
  // Restore the shipped defaults.
  for (const key of SET_NINE_IDS) setGunEffect(slide1IdForNine(key), 'set9');
});
