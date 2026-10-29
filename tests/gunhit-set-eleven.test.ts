import test from 'node:test';
import { RETIRED_WEAPONS } from '../src/games/gunhit/game/retiredWeapons';
import assert from 'node:assert/strict';

import {
  SET_ELEVEN_BY_SLIDE1_ID, SET_ELEVEN_IDS, SET_ELEVEN_METRICS, SET_ELEVEN_NEW_IDS,
  SET_ELEVEN_NEW_WEAPONS, drawSetElevenGun, elevenScale, elevenWeapon,
  isElevenNewSlide1Id, isElevenNewWeapon, restElevenState, setElevenIdFor,
  slide1IdForEleven,
} from '../src/games/gunhit/game/setElevenArt';
import { SetElevenFx, drawSetElevenShotShell } from '../src/games/gunhit/game/setElevenFx';
import { drawGun } from '../src/games/gunhit/game/art/guns';
import { getGunMetrics } from '../src/games/gunhit/game/art/metrics';
import {
  EDITABLE_WEAPONS, getGunEffect, getGunEffectOptions, getGunVariant, getGunVariantOptions,
  hasSlide11Update, hasSlide7Update, hasSlide9Update, setGunEffect, setGunVariant,
} from '../src/games/gunhit/game/art/gunVariants';
import { Game, makeLevel } from '../src/games/gunhit/game/Game';
import { WEAPONS, getWeapon } from '../src/games/gunhit/game/weapons';
import { installCanvasShim } from './supportCanvas';
import { installSilentAudio } from '../tools/supportAudioSilent';

// Slide 11 draws its guns, glow sprites and background through real canvases.
installCanvasShim();

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
      if (name === 'createImageData') {
        return (w = 1, h = 1) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) });
      }
      if (['fill', 'stroke', 'fillRect', 'strokeRect', 'arc', 'moveTo', 'lineTo',
        'quadraticCurveTo', 'bezierCurveTo', 'ellipse', 'roundRect', 'fillText',
        'translate', 'rotate', 'scale', 'save', 'restore', 'drawImage'].includes(name)) {
        return (...args: unknown[]) => calls.push(`${name}:${args.join(',')}`);
      }
      return () => undefined;
    },
    set: () => true,
  }) as unknown as CanvasRenderingContext2D;
}

function host() {
  const counts = { shake: 0, hitStop: 0, flash: 0 };
  const fx = new SetElevenFx({
    shake: () => { counts.shake++; },
    flash: () => { counts.flash++; },
    hitStop: () => { counts.hitStop++; },
    wheel: () => ({ x: 210, y: 300, R: 120, angle: 0 }),
  });
  fx.cx = 210;
  fx.gunX = 210;
  fx.wy = 300;
  fx.wheelR = 120;
  fx.gunY = 760 - 189;
  fx.syncWheel();
  return { fx, counts };
}

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

test('slide 11 is 27 weapons: seventeen slide-1 guns updated by name, ten brand-new guns', () => {
  assert.equal(SET_ELEVEN_IDS.length, 27);
  assert.equal(new Set(SET_ELEVEN_IDS).size, 27);
  assert.equal(SET_ELEVEN_NEW_WEAPONS.length, 11);
  assert.equal(Object.keys(SET_ELEVEN_BY_SLIDE1_ID).length, 27);
  for (const id of SET_ELEVEN_IDS) {
    const slide1 = slide1IdForEleven(id);
    assert.equal(elevenWeapon(id).id, id, `${id} exists in slide 11`);
    assert.equal(setElevenIdFor(slide1), id);
    if (RETIRED_WEAPONS.has(slide1)) {
      assert.ok(!WEAPONS.some(w => w.id === slide1));
      continue;
    }
    assert.ok(WEAPONS.some((w) => w.id === slide1), `${slide1} exists on slide 1`);
    assert.ok(EDITABLE_WEAPONS.includes(slide1 as never), `${slide1} can be picked on slide 1`);
    assert.equal(isElevenNewSlide1Id(slide1), isElevenNewWeapon(id), `${id} new-gun flag`);
  }
  // The guns slide 1 already had, matched by what the weapon IS.
  assert.equal(setElevenIdFor('pistol'), 'beretta');
  assert.equal(setElevenIdFor('ak47'), 'ak47');
  assert.equal(setElevenIdFor('sniper'), 'rifle');
  assert.equal(setElevenIdFor('railgun'), 'sniper-beam');
  assert.equal(setElevenIdFor('dragon'), 'dragon-breath');
  assert.equal(setElevenIdFor('pred'), 'plasmacaster-mk2');
  assert.equal(setElevenIdFor('photon_saber'), 'energy-sword');
  assert.equal(setElevenIdFor('gauntlet_cannon'), 'ironman');
  assert.equal(setElevenIdFor('xeno'), 'xenomorph');
  assert.equal(setElevenIdFor('longbow'), 'bow');
  assert.equal(setElevenIdFor('heat_ray'), 'tripod');
  // A slide-11 weapon with no related slide-1 gun arrives as a NEW gun, never
  // folded into an unrelated one.
  for (const [slide1, eleven] of Object.entries(SET_ELEVEN_BY_SLIDE1_ID)) {
    if (!SET_ELEVEN_NEW_IDS.includes(slide1)) continue;
    assert.equal(isElevenNewWeapon(eleven as never), true, `${eleven} is a new gun`);
  }
  assert.equal(setElevenIdFor('rainbow'), null);
  assert.equal(setElevenIdFor('plasma'), null);
});

test('every one of the 27 fires slide 11’s own round, burst and muzzle FX', () => {
  for (const id of SET_ELEVEN_IDS) {
    const { fx } = host();
    assert.ok(fx.raw, 'slide 11 runs its own game object');
    fx.selectWeapon(id);
    const weapon = elevenWeapon(id);
    const before = fx.raw!.parts.length;
    fx.fire(210, 571, 0);
    // Slide 11 releases some rounds a frame later: give its clock a moment.
    const made = fx.takeShots();
    for (let i = 0; i < 60 && !made.length && !fx.state.chan && !fx.raw!.fx.length; i++) {
      fx.advance(1 / 60, true);
      if (!made.length) made.push(...fx.takeShots());
    }
    const live = made.length > 0 || fx.raw!.projs.length > 0 || fx.raw!.fx.length > 0
      || fx.state.chan > 0.02;
    assert.ok(live, `${id} must create its own slide-11 round or channel`);
    assert.ok(fx.raw!.parts.length > before || fx.raw!.fx.length > 0 || fx.state.chan > 0.02,
      `${id} must spawn slide 11's own muzzle FX`);
    // Slide 11's own renderers must accept a frame.
    fx.draw(fakeCtx());
    fx.drawBeam(fakeCtx());
    fx.drawWheel(fakeCtx(), 210, 300, 120, 0.4);

    // Its impact runs slide 11's burst; the entry hole is slide 11's own.
    const hit = made[0] ?? fx.raw!.projs[0];
    if (hit) {
      // A round that lands runs slide 11's own onHit: its burst and its mark.
      fx.impact(210, 420, hit);
      for (let i = 0; i < 6; i++) fx.advance(1 / 60);
      assert.ok(fx.raw!.parts.length + fx.raw!.fx.length > 0, `${id} leaves slide 11 FX behind`);
    }
    assert.ok(fx.raw!.parts.length + fx.raw!.fx.length > 0 || fx.state.chan > 0.02,
      `${id} keeps slide 11's own FX alive`);
    assert.ok(fx.busy, `${id} keeps its layer alive while the FX run`);
    fx.clear();
    assert.equal(fx.busy, false, `${id} clears cleanly`);
  }
});

test('slide 11 artwork draws through the normal gun pipeline, with its own recoil', () => {
  const previous = getGunVariant('ak47');
  try {
    setGunVariant('ak47', 'set11');
    const idle: string[] = [];
    drawGun(fakeCtx(idle), 'ak47', 210, 575, 0.4, 0, true);
    assert.ok(idle.length > 40, 'the ak47 renders');
    const other: string[] = [];
    drawGun(fakeCtx(other), 'ak47', 210, 575, 1.2, 0, true);
    assert.notEqual(idle.join('|'), other.join('|'), 'slide 11 guns breathe while idle');
    for (const variant of ['original', 'set9'] as const) {
      const before: string[] = [];
      drawGun(fakeCtx(before), 'ak47', 210, 575, 0.4, 0, true, undefined, variant);
      assert.notEqual(before.join('|'), idle.join('|'), `slide 11 differs from ${variant}`);
    }
    // PISTOL no longer accepts 'set11' as a weapon design and always draws Slide 01's pistol by default.
    const pistolDefault: string[] = [];
    const pistolOriginal: string[] = [];
    drawGun(fakeCtx(pistolDefault), 'pistol', 210, 575, 0.4, 0, true);
    drawGun(fakeCtx(pistolOriginal), 'pistol', 210, 575, 0.4, 0, true, undefined, 'original');
    assert.equal(pistolDefault.join('|'), pistolOriginal.join('|'), 'pistol draws Slide 01 design by default');
    // Every slide-11 id draws a whole gun, at slide 1's size.
    for (const id of SET_ELEVEN_IDS) {
      const calls: string[] = [];
      drawSetElevenGun(fakeCtx(calls), id, 210, 575, 0.4, restElevenState());
      assert.ok(calls.length > 30, `${id} must draw a whole gun`);
      const metrics = SET_ELEVEN_METRICS[id];
      assert.ok(metrics.totalLen > 60 && metrics.totalLen < 200, `${id} is slide-1 sized`);
      assert.ok(elevenScale(id) > 0.2, `${id} has a real scale`);
    }
  } finally {
    setGunVariant('ak47', previous);
  }
});

test('every slide-11 gun has preview metrics and never clips the play field', () => {
  for (const id of SET_ELEVEN_IDS) {
    const slide1 = slide1IdForEleven(id);
    if (RETIRED_WEAPONS.has(slide1)) continue;
    if (slide1 === 'pistol') {
      assert.equal(getGunVariant('pistol'), 'original');
      const metrics = getGunMetrics('pistol');
      assert.ok(metrics.span > 0 && metrics.totalLen > 0, 'pistol is measured');
      assert.ok(metrics.span <= 400, 'pistol fits inside the 420-wide field');
      continue;
    }
    const previous = getGunVariant(slide1 as never);
    setGunVariant(slide1 as never, 'set11');
    const metrics = getGunMetrics(slide1 as never);
    assert.equal(getGunVariant(slide1 as never), 'set11');
    assert.ok(metrics.span > 0 && metrics.totalLen > 0, `${slide1} is measured`);
    assert.ok(metrics.span <= 400, `${slide1} fits inside the 420-wide field`);
    // Restore the shipped choice, which can differ from the newest card.
    setGunVariant(slide1 as never, previous);
  }
});

test('slide 1 flies slide 11’s round, and only slide 11’s shot fires for its guns', () => {
  setGunEffect('pistol', 'set11');
  const game = probe('pistol');
  game.shoot();
  assert.equal(game.projs.length, 1, 'one carrier round');
  const carrier = (game.projs as unknown[])[0] as {
    setEleven?: { weapon?: unknown }; setElevenPending?: boolean;
  };
  assert.ok(carrier.setEleven || carrier.setElevenPending, 'the slide-11 round rides the carrier');
  assert.equal(game.particles.length, 0, 'slide 1’s own muzzle particles stay off');

  // The classic effect still fires slide 1's own shot.
  setGunEffect('pistol', 'original');
  const classic = probe('pistol');
  classic.shoot();
  const classicRound = (classic.projs as unknown[])[0] as { setEleven?: unknown };
  assert.equal(classicRound.setEleven, undefined, 'Sebelumnya keeps slide 1’s shot');
  // Restore PISTOL's shipped default shot effect (Slide 4 = 'set9').
  setGunEffect('pistol', 'set9');
});

test('slide 11 is the newest design and shot of its guns (with pistol keeping Slide 01 design + Slide 4 default shot + Slide 5 shot option)', () => {
  const matched = Object.keys(SET_ELEVEN_BY_SLIDE1_ID).filter((id) => !isElevenNewSlide1Id(id));
  assert.equal(matched.length, 16);
  for (const slide1 of Object.keys(SET_ELEVEN_BY_SLIDE1_ID)) {
    if (RETIRED_WEAPONS.has(slide1)) continue;
    assert.ok(EDITABLE_WEAPONS.includes(slide1 as never), `${slide1} is selectable`);
    const effects = getGunEffectOptions(slide1 as never);
    if (slide1 === 'ironman_hand') {
      assert.deepEqual(effects.map(o => o.id), ['ironman_combo']);
      assert.deepEqual(getGunVariantOptions(slide1).map(o => o.id), ['set11']);
      continue;
    }
    if (slide1 === 'photon_saber') {
      assert.ok(getGunVariantOptions(slide1).some(o => o.id === 'set11'));
      assert.ok(!effects.some(o => o.id === 'set11'));
      continue;
    }
    if (slide1 === 'xeno') {
      assert.equal(effects.at(-1)?.id, 'xeno_hybrid');
      assert.equal(effects.at(-1)?.label, 'Efek 4');
      continue;
    }
    assert.equal(effects.at(-1)?.id, 'set11');
    assert.equal(effects.at(-1)?.label, 'Slide 5');
    if (slide1 === 'pistol') {
      assert.equal(getGunVariant('pistol'), 'original', 'pistol shows Slide 01 art by default');
      assert.equal(getGunEffect('pistol'), 'set9', 'pistol fires Slide 4 shot by default');
      assert.equal(hasSlide11Update('pistol'), false, 'pistol Slide 5 design was removed');
      assert.equal(hasSlide9Update('pistol'), true);
      assert.deepEqual(getGunVariantOptions('pistol').map((o) => o.id), ['original', 'set9']);
      assert.deepEqual(effects.map((o) => o.id), ['original', 'new', 'set9', 'set11']);
      continue;
    }
    const expectedArt = slide1 === 'ak47' || slide1 === 'sniper' ? 'original' : 'set11';
    const expectedShot = slide1 === 'sniper' ? 'set9' : slide1 === 'railgun' ? 'set7' : 'set11';
    assert.equal(getGunVariant(slide1 as never), expectedArt, `${slide1} shows its requested default art`);
    assert.equal(getGunEffect(slide1 as never), expectedShot, `${slide1} fires its requested default shot`);
    assert.equal(hasSlide11Update(slide1), true, `${slide1} carries the green NEW badge`);
    const designs = getGunVariantOptions(slide1 as never);
    assert.equal(designs.at(-1)?.id, 'set11');
    assert.equal(designs.at(-1)?.label, 'Slide 5');
    if (isElevenNewSlide1Id(slide1)) {
      assert.deepEqual(designs.map((o) => o.id), ['set11'], `${slide1} never existed before slide 11`);
      assert.deepEqual(effects.map((o) => o.id), ['set11']);
      assert.equal(hasSlide7Update(slide1), false);
    }
  }
  assert.deepEqual(getGunVariantOptions('pistol').map((o) => o.id), ['original', 'set9']);
  assert.deepEqual(getGunEffectOptions('pistol').map((o) => o.id), ['original', 'new', 'set9', 'set11']);
  assert.deepEqual(getGunVariantOptions('dragon').map((o) => o.id),
    ['original', 'current', 'latest', 'set7', 'set9', 'set11']);
  assert.deepEqual(getGunVariantOptions('xeno').map((o) => o.id), ['original', 'set11']);
  assert.equal(hasSlide9Update('xeno'), false);
});

test('the picker’s Slide 11 card paints slide 11’s real round for all 27', () => {
  for (const id of SET_ELEVEN_IDS) {
    const calls: string[] = [];
    drawSetElevenShotShell(fakeCtx(calls), id, 0.06, 26);
    assert.ok(calls.length > 20, `${id} draws its round or beam on the card`);
  }
});

test('a stuck slide-11 round never survives a gun or level change', () => {
  setGunEffect('pistol', 'set11');
  const game = probe('pistol');
  game.shoot();
  game.projs.length = 0;
  // The layer itself is reset with the level, exactly like slide 7 and slide 9.
  (game as unknown as { resetSevenLayer(): void }).resetSevenLayer();
  const s11 = (game as unknown as { s11State?: SetElevenFx }).s11State;
  assert.ok(!s11 || !s11.busy, 'the slide-11 layer is empty after a reset');
  setGunEffect('pistol', 'set9');
});

test('slide 11’s own wheel never breaks behind a slide-1 stage', () => {
  const { fx } = host();
  const raw = fx.raw as unknown as {
    hit(x: number, y: number, o?: { count?: number }): void;
    goal: number;
    fx: { max: number }[];
  };
  assert.ok(raw, 'slide 11 runs its own world');
  // One slide-1 stage fires far more hits than slide 11’s own goal.
  for (let i = 0; i < 60; i++) raw.hit(210, 400, { count: 1 });
  // `breakWheel()` is the only thing that spawns those eleven long-lived wedge
  // pieces (`max: 2.4`), and slide 1 draws them on top of its own wheel.
  assert.equal(raw.fx.filter((f) => f.max === 2.4).length, 0,
    'slide 11 must never shatter its own wheel over slide 1’s');
});

test('slide 11 spawns its muzzle FX at the barrel slide 1 draws, not above it', () => {
  const { fx } = host();
  for (const id of SET_ELEVEN_IDS) {
    fx.selectWeapon(id);
    // Slide 1 anchors the muzzle line; slide 11 anchors the stock. Both have to
    // agree, or every flash and every round starts away from the barrel.
    assert.equal(fx.muzzlePos().y, fx.gunY, `${id} muzzle sits on slide 1's muzzle line`);
    assert.equal(fx.muzzlePos().x, fx.gunX);
    const raw = fx.raw! as unknown as { muzzlePos(): { x: number; y: number }; lw(x: number, y: number): { x: number; y: number } };
    const own = raw.muzzlePos();
    const w = elevenWeapon(id);
    assert.ok(Math.abs(own.y - fx.gunY) < 1, `${id} world muzzle y=${own.y.toFixed(1)} vs ${fx.gunY}`);
    assert.ok(Math.abs(own.x - fx.gunX) < 1, `${id} world muzzle x`);
    // A weapon's own local spawn point lands on the same, slide-1-sized gun.
    const vent = raw.lw(w.muzzle, w.muzzleY);
    assert.ok(Math.abs(vent.y - fx.gunY) < 1.5, `${id} local muzzle -> ${vent.y.toFixed(1)}`);
  }
});

test('slide 11 entry holes land on the wheel angle slide 1 hit, and stay put', () => {
  const rotation = 0.7;
  const { fx } = host();
  fx.setHooks({
    shake: () => {}, flash: () => {}, hitStop: () => {},
    wheel: () => ({ x: 210, y: 300, R: 120, angle: rotation }),
  });
  fx.syncWheel();
  fx.selectWeapon('beretta');
  assert.equal(fx.raw!.wheel.angle, rotation, 'slide 11 spins with slide 1’s wheel');
  const phi = 1.2;
  const hx = 210 + Math.cos(phi) * 120;
  const hy = 300 + Math.sin(phi) * 120;
  fx.fire(210, 571, 0);
  const made = fx.takeShots();
  const round = made[0] ?? fx.raw!.projs[0];
  assert.ok(round);
  fx.impact(hx, hy, round);
  const embed = fx.raw!.embeds.at(-1);
  assert.ok(embed, 'the hit leaves an embed');
  // `drawWheel` rotates by slide 1's own wheel first, so the mark has to be
  // stored in wheel-local space — otherwise it slides around the rim.
  assert.ok(Math.abs(embed!.a - (phi - rotation)) < 1e-6,
    `embed angle ${embed!.a.toFixed(3)} is not local (${(phi - rotation).toFixed(3)})`);
  // And its world position is still where slide 1 registered the hit.
  const world = rotation + embed!.a;
  assert.ok(Math.abs(world - phi) < 1e-6, 'the mark stays on the hit point');
});

test('a burst slide 1 cannot carry keeps flying and bursts, instead of freezing', () => {
  const { fx } = host();
  fx.selectWeapon('nano-swarm');
  fx.fire(210, 571, 0);
  const made = fx.takeShots();
  assert.ok(made.length > 1, 'the swarm is a volley');
  // Slide 1 carries one round; the rest belong to slide 11.
  fx.carry(made[0], 210, 500, -Math.PI / 2);
  const loose = made.slice(1);
  const startY = loose.map((p) => p.y);
  for (let i = 0; i < 90; i++) fx.advance(1 / 60);
  loose.forEach((p, i) => {
    assert.notEqual(p.y, startY[i], 'the extra orbs do not hang at the muzzle');
    assert.equal(p.alive, false, 'and they burst into the wheel like slide 11’s own');
  });
});

test('a slide-9/11 gun waiting for its own round leaves no phantom bullet hole', () => {
  setGunEffect('dragon', 'set11');
  const game = probe('dragon');
  const carrier = { x: 210, y: 420, vx: 0, vy: -1800, setElevenPending: true };
  (game.projs as unknown[]).push(carrier);
  (game as unknown as { stickAt(local: number, p: unknown): void }).stickAt(0.2, carrier);
  const item = (game.items as unknown[]).at(-1) as { hideArt?: boolean };
  assert.equal(item?.hideArt, true, 'slide 11 owns the impact, so slide 1 hides its bullet');
  assert.equal(game.stuck, 1, 'the hit still counts');
  assert.equal(game.score > 0, true, 'and it still scores');
  setGunEffect('dragon', 'set11');
});

test('a broken slide-9/11 round can never freeze slide 1', () => {
  const { fx } = host();
  fx.selectWeapon('beretta');
  fx.fire(210, 571, 0);
  const made = fx.takeShots();
  // Simulate one weapon's renderer/update throwing mid-flight.
  const bomb = { boom: () => { throw new Error('boom'); } };
  for (const p of made) {
    (p as unknown as { draw: () => void }).draw = bomb.boom;
    (p as unknown as { update: () => void }).update = bomb.boom;
    (p as unknown as { onHit: () => void }).onHit = bomb.boom;
  }
  (fx.raw!.fx as unknown[]).push({ age: 0, max: 1, add: true, draw: bomb.boom } as never);
  // None of these may throw out of the layer.
  fx.draw(fakeCtx());
  fx.advance(1 / 60);
  fx.advance(1 / 60);
  const round = made[0] ?? fx.raw!.projs[0];
  if (round) fx.impact(210, 420, round);
  fx.drawWheel(fakeCtx(), 210, 300, 120, 0.3);
});

test('slide 11 only runs while its own shot is live', () => {
  // A slide-1 gun with no slide-11 layer must never spin a hidden game object:
  // that is what made marks and flashes appear for unrelated guns.
  setGunEffect('pistol', 'set11');
  const game = probe('pistol');
  // `Game.update` only advances the slide-11 layer while that gun's own shot
  // is live (or slide 11 still has FX to finish); a fresh game owns none.
  assert.equal((game as unknown as { s11State?: unknown }).s11State, undefined,
    'no slide-11 layer for a gun that is not firing it');
  const fx = new SetElevenFx();
  assert.ok(fx.raw, 'the layer still builds on demand');
  assert.equal(fx.busy, false, 'and starts idle');
});

/* ── slide-11 import fixes ─────────────────────────────────────────────── */

type Pt = { x: number; y: number; op: string };

/**
 * A 2D context that follows `translate` / `rotate` / `scale` / `setTransform`
 * and records where each path point, arc, rect and image really lands on the
 * screen — the plain fake above only sees a weapon's local numbers.
 */
function trackCtx(points: Pt[]) {
  let m = [1, 0, 0, 1, 0, 0];
  const stack: number[][] = [];
  const mul = (n: number[]) => {
    const [a, b, c, d, e, f] = m;
    m = [a * n[0] + c * n[1], b * n[0] + d * n[1], a * n[2] + c * n[3], b * n[2] + d * n[3],
      a * n[4] + c * n[5] + e, b * n[4] + d * n[5] + f];
  };
  const at = (x: number, y: number, op: string) => {
    const [a, b, c, d, e, f] = m;
    points.push({ x: a * x + c * y + e, y: b * x + d * y + f, op });
  };
  const gradient = { addColorStop: () => undefined };
  type M = { a: number; b: number; c: number; d: number; e: number; f: number };
  const api: Record<string, unknown> = {
    canvas: { width: 420, height: 760 },
    save: () => { stack.push(m.slice()); },
    restore: () => { m = stack.pop() ?? [1, 0, 0, 1, 0, 0]; },
    translate: (x: number, y: number) => mul([1, 0, 0, 1, x, y]),
    rotate: (r: number) => mul([Math.cos(r), Math.sin(r), -Math.sin(r), Math.cos(r), 0, 0]),
    scale: (x: number, y: number) => mul([x, 0, 0, y, 0, 0]),
    transform: (...n: number[]) => mul(n),
    setTransform: (a?: number | M, ...n: number[]) => {
      if (a === undefined) m = [1, 0, 0, 1, 0, 0];
      else if (typeof a === 'object') m = [a.a, a.b, a.c, a.d, a.e, a.f];
      else m = [a, ...n];
    },
    resetTransform: () => { m = [1, 0, 0, 1, 0, 0]; },
    getTransform: () => ({ a: m[0], b: m[1], c: m[2], d: m[3], e: m[4], f: m[5] }),
    moveTo: (x: number, y: number) => at(x, y, 'moveTo'),
    lineTo: (x: number, y: number) => at(x, y, 'lineTo'),
    quadraticCurveTo: (_cx: number, _cy: number, x: number, y: number) => at(x, y, 'curve'),
    bezierCurveTo: (_a: number, _b: number, _c: number, _d: number, x: number, y: number) => at(x, y, 'curve'),
    arc: (x: number, y: number) => at(x, y, 'arc'),
    ellipse: (x: number, y: number) => at(x, y, 'arc'),
    rect: (x: number, y: number, w: number, h: number) => at(x + w / 2, y + h / 2, 'rect'),
    fillRect: (x: number, y: number, w: number, h: number) => at(x + w / 2, y + h / 2, 'rect'),
    drawImage: (_img: unknown, ...n: number[]) => {
      const [x, y, w = 0, h = 0] = n.length >= 8 ? n.slice(4) : n;
      at(x + w / 2, y + h / 2, 'image');
    },
    fillText: (_s: string, x: number, y: number) => at(x, y, 'text'),
    createLinearGradient: () => gradient,
    createRadialGradient: () => gradient,
    createConicGradient: () => gradient,
    createPattern: () => gradient,
    measureText: () => ({ width: 10 }),
  };
  return new Proxy(api, {
    get: (t, p) => (p in t ? t[p as string] : () => undefined),
    set: (t, p, v) => { t[p as string] = v; return true; },
  }) as unknown as CanvasRenderingContext2D;
}

const lines = (pts: Pt[]) => pts.filter((p) => p.op === 'moveTo' || p.op === 'lineTo');

test('a slide-11 round that lands bursts once and is never handed out again', () => {
  const { fx } = host();
  fx.selectWeapon('ak47');
  fx.fire(210, 571, 0);
  const [round] = fx.takeShots();
  assert.ok(round, 'the trigger made a round');
  let bursts = 0;
  const own = round.onHit;
  round.onHit = (...args: Parameters<typeof own>) => {
    bursts++;
    own(...args);
  };
  fx.carry(round, 210, 425, -Math.PI / 2);
  fx.impact(210, 420, round);
  assert.equal(bursts, 1, 'one hit, one burst');
  assert.equal(fx.raw!.projs.includes(round), false, 'the landed round leaves slide 11 the frame it lands');
  // An auto-fire gun pulls the trigger again in that same frame. The landed
  // round used to be handed over a second time: its carrier spawned under the
  // wheel, ran into the bullet that had just stuck and failed the stage.
  assert.deepEqual(fx.takeShots(), [], 'a landed round is never a new shot');
  fx.fire(210, 571, 0);
  assert.equal(fx.takeShots().includes(round), false);
  for (let i = 0; i < 30; i++) fx.advance(1 / 60);
  assert.equal(bursts, 1, 'it never flies — or bursts and leaves a hole — a second time');
});

test('a slide-11 round blocked by an obstacle sparks and goes away with its carrier', () => {
  const { fx } = host();
  fx.selectWeapon('beretta');
  fx.fire(210, 571, 0);
  const [round] = fx.takeShots();
  assert.ok(round);
  fx.carry(round, 210, 430, -Math.PI / 2);
  const sparks = fx.raw!.parts.length;
  fx.block(210, 430, round);
  assert.ok(fx.raw!.parts.length > sparks, 'the block still sparks, like slide 11’s own');
  assert.equal(fx.raw!.projs.includes(round), false, 'and the round does not hang frozen over GAGAL!');
});

test('slide 11’s channel beams run from slide 1’s muzzle to the wheel, in screen space', () => {
  const beams = SET_ELEVEN_IDS.filter((id) => elevenWeapon(id).channel && elevenWeapon(id).drawBeam);
  assert.ok(beams.length >= 5, `the beam guns: ${beams.join(', ')}`);
  // `host()`: slide 1's muzzle line is y = 571 and the wheel's rim faces it at
  // y = 300 + 120 = 420, both on x = 210.
  for (const id of beams) {
    const { fx } = host();
    fx.selectWeapon(id);
    fx.fire(210, 571, 0);
    for (let i = 0; i < 20; i++) fx.advance(1 / 60, true);
    const pts: Pt[] = [];
    fx.drawBeam(trackCtx(pts));
    const beam = lines(pts);
    assert.ok(beam.length > 0, `${id} paints its beam`);
    for (const p of beam) {
      assert.ok(Math.abs(p.x - 210) <= 100 && p.y >= 340 && p.y <= 640,
        `${id} beam point (${p.x.toFixed(0)}, ${p.y.toFixed(0)}) is off the muzzle-to-wheel line`);
    }
    assert.ok(beam.some((p) => p.y >= 550), `${id} beam leaves the muzzle`);
    assert.ok(beam.some((p) => p.y <= 440), `${id} beam reaches the wheel`);
  }
});

test('slide 11’s aiming overlays land on the wheel: laser sight, three-dot lock, designator', () => {
  const aimed = SET_ELEVEN_IDS.filter((id) => elevenWeapon(id).drawOverlay);
  assert.deepEqual([...aimed].sort(), ['orbital-beacon', 'plasmacaster-mk2', 'sniper-beam']);
  for (const id of aimed) {
    const { fx } = host();
    fx.follow(id);
    assert.equal(fx.raw!.weapon.id, id, `${id} is slide 11’s live weapon before any shot`);
    for (let i = 0; i < 10; i++) fx.advance(1 / 60);
    const pts: Pt[] = [];
    fx.drawOverlay(trackCtx(pts));
    const onTarget = pts.filter((p) => Math.hypot(p.x - 210, p.y - 420) < 30);
    assert.ok(onTarget.length > 0, `${id} paints its overlay where slide 1's wheel is`);
  }
});

test('slide 11’s xenomorph and shoulder caster hit with their own FX only', () => {
  for (const weapon of ['xeno'] as const) {
    for (const effect of ['set11', 'original'] as const) {
      setGunEffect(weapon, effect);
      const game = probe(weapon);
      const hit = game as unknown as { projs: unknown[]; items: { acid?: unknown }[]; stuck: number };
      const calls = { plasmaImpact: 0, splash: 0, airBlast: 0 };
      for (const name of Object.keys(calls) as (keyof typeof calls)[]) {
        game[name] = () => { calls[name]++; };
      }
      const carrier: Record<string, unknown> = { x: 210, y: 420, vx: 0, vy: -1800 };
      if (effect === 'set11') carrier.setElevenPending = true;
      hit.projs.push(carrier);
      (game as unknown as { stickAt(local: number, p: unknown): void }).stickAt(0.2, carrier);
      const item = hit.items.at(-1)!;
      const ownFx = weapon === 'xeno' ? calls.splash : calls.plasmaImpact;
      if (effect === 'set11') {
        // Slide 11 bursts, marks and voices the hit itself: a game-3 acid
        // splash, rim glob or plasma blast on top is a second hit effect.
        assert.equal(ownFx, 0, `${weapon} on slide 11's shot runs no game-3 hit FX`);
        assert.equal(item.acid, undefined, `${weapon} on slide 11's shot leaves no game-3 acid glob`);
      } else {
        assert.equal(ownFx, 1, `${weapon} on slide 1's own shot keeps its game-3 hit FX`);
        if (weapon === 'xeno') assert.ok(item.acid, 'and its acid glob');
      }
      assert.equal(hit.stuck, 1, 'the hit counts either way');
    }
    setGunEffect(weapon, 'set11');
  }
});

test('the picker card’s slide-11 beam joins the card’s muzzle to the card’s rim', () => {
  // The card's frame (152 × 88 at 1.15 × 1.1 from its top centre) plus the
  // wheel it strokes above its top edge.
  for (const id of SET_ELEVEN_IDS.filter((x) => elevenWeapon(x).channel && elevenWeapon(x).drawBeam)) {
    const pts: Pt[] = [];
    drawSetElevenShotShell(trackCtx(pts), id, 0.06, 26);
    const beam = lines(pts);
    assert.ok(beam.length > 0, `${id} paints its beam on the card`);
    for (const p of beam) {
      assert.ok(Math.abs(p.x) <= 100 && p.y >= -80 && p.y <= 110,
        `${id} card beam point (${p.x.toFixed(0)}, ${p.y.toFixed(0)}) is outside the card`);
    }
    assert.ok(beam.some((p) => p.y >= 40), `${id} card beam starts at the card's muzzle`);
    assert.ok(beam.some((p) => p.y <= 10), `${id} card beam reaches the card's rim`);
  }
});

test('the picker cards repaint with one slide-11 world, not a new audio graph per frame', () => {
  installSilentAudio();
  const g = globalThis as unknown as { AudioContext: new () => unknown; window: Record<string, unknown> };
  const Base = g.AudioContext;
  let made = 0;
  class Counting extends (Base as new () => object) {
    constructor() {
      super();
      made++;
    }
  }
  g.AudioContext = Counting;
  g.window.AudioContext = Counting;
  g.window.webkitAudioContext = Counting;
  try {
    // About two seconds of three cards repainting (the picker runs ~18 fps).
    for (let frame = 0; frame < 12; frame++) {
      for (const id of ['tripod', 'beretta', 'orbital-beacon'] as const) {
        drawSetElevenShotShell(fakeCtx(), id, 0.06, 26);
      }
    }
    assert.ok(made <= 1, `${made} AudioContexts for 36 card frames`);
  } finally {
    delete g.window.AudioContext;
    delete g.window.webkitAudioContext;
    delete (g as Partial<typeof g>).AudioContext;
  }
});
