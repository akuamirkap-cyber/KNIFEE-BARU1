import test from 'node:test';
import assert from 'node:assert/strict';

import { installCanvasShim } from './supportCanvas';
import { installSilentAudio } from '../tools/supportAudioSilent';

/**
 * Slide 9 (`games/game-6`, the hub's "Slide 5") on slide 1: the feel of its
 * guns — what a hit does to the round, the wheel and the screen, how fast a
 * round flies, how the trigger behaves — must be slide 9's own. Slide 1's own
 * reactions must not stack on top, and the other cards of the same guns must
 * keep slide 1's behaviour untouched.
 */
installCanvasShim();
const g = globalThis as unknown as Record<string, unknown> & { window: Record<string, unknown> };
g.window = Object.assign(g.window ?? {}, {
  setTimeout, clearTimeout,
  setInterval: () => 0, clearInterval: () => undefined,
  addEventListener: () => undefined, removeEventListener: () => undefined,
  devicePixelRatio: 1, innerWidth: 420, innerHeight: 760,
});
installSilentAudio();

const gradient = { addColorStop: () => undefined };
const ctx = new Proxy({ canvas: { width: 420, height: 760 } } as Record<string, unknown>, {
  get(target, prop) {
    const name = String(prop);
    if (name === 'canvas') return target.canvas;
    if (name === 'createLinearGradient' || name === 'createRadialGradient'
      || name === 'createConicGradient' || name === 'createPattern') return () => gradient;
    if (name === 'measureText') return () => ({ width: 8 });
    if (name === 'getImageData') return () => ({ data: new Uint8ClampedArray(4) });
    return () => undefined;
  },
  set(target, prop, value) { target[String(prop)] = value; return true; },
}) as unknown as CanvasRenderingContext2D;

const canvas = {
  width: 420, height: 760, style: {},
  getContext: () => ctx,
  addEventListener: () => undefined,
  removeEventListener: () => undefined,
  getBoundingClientRect: () => ({ left: 0, top: 0, width: 420, height: 760 }),
};

const { Game } = await import('../src/games/gunhit/game/Game.ts');
const variants = await import('../src/games/gunhit/game/art/gunVariants.ts');
const { SetNineFx } = await import('../src/games/gunhit/game/setNineFx.ts');
const { gunState } = await import('../src/games/gunhit/game/art/kit.ts');
const { sfx4 } = await import('../src/games/gunhit/game/sfx4.ts');
const { audio } = await import('../games/game-6/src/game/core.ts');
audio.muted = true;

let shots = 0;
const events = {
  onGameOver: () => undefined, onStageChange: () => undefined, onStageCleared: () => undefined,
  onShotFired: () => { shots++; }, onBossDefeated: () => undefined,
};

const DT = 1 / 60;

/** Math.random, seeded, so every run plays the same stage. */
function seeded<T>(seed: number, run: () => T): T {
  const saved = Math.random;
  let s = seed >>> 0;
  Math.random = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  try {
    return run();
  } finally {
    Math.random = saved;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Live = any;

/** A live stage 1 with `weapon` on the given card, past the intro. */
function stage(weapon: string, effect: 'set9' | 'original' = 'set9'): Live {
  variants.setGunEffect(weapon as never, effect as never);
  const game = new Game(canvas as unknown as HTMLCanvasElement, events as never) as Live;
  game.startAtLevel(1);
  game.setWeapon(weapon);
  for (let i = 0; i < 120 && game.state === 'intro'; i++) game.update(DT);
  for (let i = 0; i < 20; i++) game.update(DT);
  return game;
}

/** One tap of the trigger. */
function tap(game: Live) {
  game.press();
  game.holding = false;
}

/** The bare slide-9 layer around a slide-1-sized wheel. */
function host() {
  const counts = { shake: 0, hitStop: 0, flash: 0 };
  const fx = new SetNineFx({
    shake: () => { counts.shake++; },
    flash: () => { counts.flash++; },
    hitStop: () => { counts.hitStop++; },
    wheel: () => ({ x: 210, y: 255, R: 106, angle: 0 }),
  });
  fx.W = 420;
  fx.H = 760;
  fx.floorY = 760;
  fx.syncWheel();
  return { fx, counts };
}

/** Fire `id` and hand its round to "slide 1", carried just below the wheel. */
function carried(fx: InstanceType<typeof SetNineFx>, id: string) {
  fx.selectWeapon(id as never);
  fx.fire(210, 571, -Math.PI / 2, 0);
  const [round] = fx.takeShots();
  assert.ok(round, `${id} made a round`);
  fx.carry(round, 210, 380, -Math.PI / 2);
  return round;
}

/* ── the layer ───────────────────────────────────────────────────────────── */

test('a slide-9 round is spent on the wheel: nothing is left hanging at the rim', () => {
  const { fx } = host();
  const round = carried(fx, 'ak47');
  fx.impact(210, 361, Math.PI / 2, round);
  assert.ok(!fx.bullets.includes(round), 'the round is gone the moment it lands');
  assert.equal(fx.marks.length, 1, 'and its entry hole is painted');
  for (let i = 0; i < 30; i++) fx.update(DT);
  assert.equal(fx.bullets.length, 0, 'no frozen round keeps glowing on the rim');
});

test('the identity disc bounces off the rim and flies home to the hand, like slide 9’s', () => {
  const { fx } = host();
  const disc = carried(fx, 'identityDisc');
  fx.impact(210, 361, Math.PI / 2, disc);
  assert.ok(fx.bullets.includes(disc), 'the disc is not spent on the wheel');
  assert.ok(!fx.isCarried(disc), 'slide 9 flies it from here');
  assert.ok(disc.vy > 0, 'it reflects off the rim, back down');
  assert.equal(fx.marks.length, 1, 'leaving its marker');
  assert.equal(fx.out(), 1, 'out of the hand while it flies');
  let gone = false;
  for (let i = 0; i < 300 && !gone; i++) {
    fx.update(DT);
    gone = !fx.bullets.includes(disc);
  }
  assert.ok(gone, 'it comes back');
  assert.ok(fx.catchT < 0.2, 'and the hand catches it (slide 9’s hand pulse)');
  assert.equal(fx.out(), 0);
});

test('slide 9’s burst is aimed along the flight: its sparks fan back towards the shooter', () => {
  const { fx } = host();
  const round = carried(fx, 'ak47');
  const before = new Set(fx.particles);
  fx.impact(210, 361, Math.PI / 2, round);
  const sparks = fx.particles.filter((p) => !before.has(p) && p.type === 'spark');
  assert.ok(sparks.length > 4, 'the burst has sparks');
  const vy = sparks.reduce((sum, p) => sum + p.vy, 0) / sparks.length;
  assert.ok(vy > 0, `they fly down at the gun, not into the wheel (mean vy ${vy.toFixed(0)})`);
});

test('a carried slide-9 round is painted once — by slide 1, over its own sparks', () => {
  const { fx } = host();
  const round = carried(fx, 'ak47');
  let painted = 0;
  const draw = round.draw;
  round.draw = (...a) => { painted++; return draw(...a); };
  fx.draw(ctx);
  assert.equal(painted, 0, 'the layer leaves the carried round to slide 1');
  fx.drawShot(ctx, round);
  assert.equal(painted, 1, 'slide 1 paints it, once');
});

test('a carried round whose carrier vanished without a hit does not hang frozen', () => {
  const { fx } = host();
  const round = carried(fx, 'mp5');
  fx.update(DT);
  assert.ok(fx.bullets.includes(round), 'carried this frame: kept');
  fx.update(DT);
  assert.ok(!fx.bullets.includes(round), 'not carried any more: dropped');
});

test('every slide-9 hit shoves the wheel back on slide 9’s recoil spring', () => {
  const { fx } = host();
  const round = carried(fx, 'repulsor');
  fx.impact(210, 361, Math.PI / 2, round);
  // markSize 32 × 11 px/s, straight away from the blow: up.
  assert.ok(Math.abs(fx.kick.vy + 32 * 11) < 1e-6, `kick ${fx.kick.vy}`);
  let peak = 0;
  for (let i = 0; i < 12; i++) {
    fx.update(DT);
    peak = Math.max(peak, -fx.kick.y);
  }
  assert.ok(peak > 7 && peak < 11, `the wheel jumps ${peak.toFixed(2)} px`);
  for (let i = 0; i < 90; i++) fx.update(DT);
  assert.ok(Math.abs(fx.kick.y) < 0.05, 'and springs back');
});

test('a slide-9 beam bursts on the wheel at its own impact time: the flame late, the rail at once', () => {
  const dragon = host();
  dragon.fx.selectWeapon('dragonBreath');
  dragon.fx.fire(210, 571, -Math.PI / 2, 0);
  assert.ok(dragon.fx.kick.vy < 0, 'its registerHit already rocks the wheel');
  for (let i = 0; i < 6; i++) dragon.fx.update(DT);
  assert.equal(dragon.counts.hitStop, 0, 'the flame is still on its way');
  for (let i = 0; i < 12; i++) dragon.fx.update(DT);
  assert.equal(dragon.counts.hitStop, 1, 'it lands ~0.2 s after the trigger, with its own hit-stop');

  const rail = host();
  rail.fx.selectWeapon('sniperBeam');
  rail.fx.fire(210, 571, -Math.PI / 2, 0);
  const shakes = rail.counts.shake;
  rail.fx.update(DT);
  assert.ok(rail.counts.shake > shakes, 'the rail bursts on the very next frame');
});

test('a beam’s entry hole is as old as the beam, so the dragon’s scorch fades in on slide 9’s beat', () => {
  const { fx } = host();
  fx.selectWeapon('dragonBreath');
  fx.fire(210, 571, -Math.PI / 2, 0);
  for (let i = 0; i < 12; i++) fx.update(DT);
  fx.markBeam(Math.PI / 2);
  assert.equal(fx.marks.length, 1);
  assert.ok(Math.abs(fx.marks[0].age - 12 * DT) < 1e-6, `mark age ${fx.marks[0].age}`);
});

/* ── the live game ───────────────────────────────────────────────────────── */

test('a Slide 5 hit moves the screen with slide 9’s own reaction only; Sebelumnya keeps slide 1’s', () => {
  seeded(7, () => {
    const game = stage('mp5');
    tap(game);
    let own = 0;
    for (let i = 0; i < 60 && game.stuck === 0; i++) {
      game.update(DT);
      own = Math.max(own, game.bump, game.hitFlash, Math.abs(game.camY), game.tintA, game.shake, game.recoil, game.hitStop);
    }
    assert.equal(game.stuck, 1, 'the round landed');
    assert.equal(own, 0, 'no slide-1 bump, white flash, camera kick, tint, shake, hit-stop or gun jump');
    assert.ok(game.nineShake > 0, 'slide 9’s own jolt');
    assert.ok(game.s9State.kick.vy !== 0, 'slide 9’s wheel recoil');

    const classic = stage('ak47', 'original');
    tap(classic);
    let bump = 0;
    for (let i = 0; i < 60 && classic.stuck === 0; i++) {
      classic.update(DT);
      bump = Math.max(bump, classic.bump);
    }
    assert.ok(bump > 0, 'the Sebelumnya card still has slide 1’s own bump');
  });
});

test('slide 9’s shakes and flashes remain while hits no longer stall the world', () => {
  const game = stage('ak47');
  const fx = game.s9;
  fx.shake(20);
  fx.shake(20);
  assert.equal(game.nineShake, 34, 'additive, capped at 34');
  fx.flash('#ff0000', 0.3);
  assert.equal(game.nineFlashA, 0.3);
  assert.equal(game.nineFlashRgb, '255,0,0');
  fx.hitstop(0.05);
  assert.equal(game.nineStop, 0, 'slide 9 no longer slows down the whole world');
  assert.equal(game.hitStop, 0, 'not slide 1’s 6 % one');
  assert.equal(game.tintA, 0, 'no slide-1 tint vignette');
  game.update(0.1);
  assert.ok(Math.abs(game.nineShake - 34 * Math.pow(0.001, 0.1)) < 0.01, `shake ${game.nineShake}`);
  assert.ok(Math.abs(game.nineFlashA - (0.3 - 0.22)) < 1e-9, 'flash fades at 2.2/s');
});

test('the Slide 5 sniper and plasmacaster fire on the press; their other cards keep slide 1’s scope and charge', () => {
  const sniper = stage('sniper');
  sniper.press();
  assert.equal(sniper.aiming, false, 'no slide-1 scope');
  assert.equal(sniper.projs.length, 1, 'the rifle fires at once');
  const scoped = stage('sniper', 'original');
  scoped.press();
  assert.equal(scoped.aiming, true, 'Sebelumnya still aims with slide 1’s scope');
  assert.equal(scoped.projs.length, 0);


});

test('a Slide 5 gun keeps slide 9’s trigger interval and remembers a click made just before it is ready', () => {
  const game = stage('pistol');
  shots = 0;
  tap(game);
  assert.equal(shots, 1);
  assert.ok(Math.abs(game.cooldown - 0.24) < 1e-9, `Beretta: 0.24 s as on slide 9 (got ${game.cooldown})`);
  game.update(DT);
  tap(game); // 0.223 s left: too early to be remembered
  for (let i = 0; i < 20; i++) game.update(DT);
  assert.equal(shots, 1, 'an early click is dropped');
  tap(game);
  assert.equal(shots, 2);
  for (let i = 0; i < 3; i++) game.update(DT);
  tap(game); // ~0.19 s left: remembered
  assert.equal(shots, 2, 'not yet');
  for (let i = 0; i < 14; i++) game.update(DT);
  assert.equal(shots, 3, 'it fires the moment the gun is ready');
});

test('a Slide 5 round flies at slide 9’s own speed; a beam’s carrier only scores', () => {
  const saber = stage('photon_saber');
  tap(saber);
  assert.equal(Math.round(-saber.projs[0].vy), 1300, 'the energy sword flies at 1300 px/s');
  const rail = stage('railgun');
  tap(rail);
  assert.equal(rail.projs[0].setNineBeam, 0, 'the rail is an instant beam');
  assert.equal(-rail.projs[0].vy, 9500);
  const dragon = stage('dragon');
  tap(dragon);
  assert.ok(Math.abs(dragon.projs[0].setNineBeam - 0.22 * 0.92) < 1e-9, 'the flame lands 0.2 s later');
});

test('the Slide 5 bow draws its own string at 3.4/s, and slide 1’s charge rings and voices stay quiet', () => {
  const game = stage('longbow');
  let voices = 0;
  const saved = { start: sfx4.chargeStart, full: sfx4.chargeFull };
  sfx4.chargeStart = () => { voices++; };
  sfx4.chargeFull = () => { voices++; };
  try {
    game.press();
    assert.equal(game.charging, true, 'still hold to draw, like slide 9');
    for (let i = 0; i < 12; i++) game.update(DT);
    game.render();
    assert.ok(Math.abs(gunState.s9State!.charge - 0.68) < 0.01, `drawn ${gunState.s9State!.charge}`);
    for (let i = 0; i < 60; i++) game.update(DT);
    assert.equal(voices, 0, 'no slide-1 charge voices');
    game.holding = false;
    game.releaseScope();
    assert.equal(Math.round(-game.projs[0].vy), 3400, 'fully drawn: slide 9’s full-speed arrow');
  } finally {
    sfx4.chargeStart = saved.start;
    sfx4.chargeFull = saved.full;
  }
});

test('a Slide 5 hit plays no slide-1 per-gun voice and paints no slide-1 perk or plasma FX', () => {
  seeded(11, () => {
    const game = stage('ak47');
    const calls: unknown[][] = [];
    const applyPerks = game.applyPerks.bind(game);
    game.applyPerks = (...a: unknown[]) => { calls.push(a); return applyPerks(...a); };
    tap(game);
    let flash = 0;
    for (let i = 0; i < 90 && game.stuck === 0; i++) {
      game.update(DT);
      flash = Math.max(flash, game.wheelFlash);
    }
    assert.equal(game.stuck, 1);
    assert.deepEqual(calls.map((a) => [a[4], a[5]]), [[false, false]], 'no slide-1 voice, no slide-1 perk look');
    assert.equal(flash, 0, 'no game-3 plasma flash on the wheel');
  });
});
