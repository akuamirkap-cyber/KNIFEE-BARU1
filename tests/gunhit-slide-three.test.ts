import test from 'node:test';
import assert from 'node:assert/strict';

import { installCanvasShim } from './supportCanvas';
import { installSilentAudio } from '../tools/supportAudioSilent';

/**
 * Slide 3 (`games/game-4`, "Weapon Hit 71 Senjata") on slide 1. All 71 of its
 * weapons live on slide 1 behind a "Slide 3" card, and on that card a gun is
 * slide 3's gun: its own engine fires it (trigger, cooldown, round, flight,
 * impact), its own synthesizer is the only voice, its own wheel reaction
 * (bounce spring, rim flash, screen flash, 22 % hit-stop) is the only feel, and
 * none of slide 1's perks, combo beeps or extra bursts are layered on top.
 * The other cards of the same guns keep slide 1's behaviour untouched.
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
const { WEAPONS: SLIDE3 } = await import('../games/game-4/src/game/weapons.ts');
const { SET_SEVEN_BY_SLIDE1_ID, slideThreeIdFor } = await import('../src/games/gunhit/game/setSevenArt.ts');
const { SET_ONE_BY_SLIDE1_ID } = await import('../src/games/gunhit/game/setOneArt.ts');
const { sfx: slide3Sfx } = await import('../games/game-4/src/game/audio.ts');

// Every voice slide 1 owns. A slide-3 shot may not use any of them.
const SLIDE1_VOICES: Record<string, Record<string, unknown>> = {
  sfx: (await import('../src/games/gunhit/game/audio.ts')).sfx as never,
  sfx2: (await import('../src/games/gunhit/game/sfx2.ts')).sfx2 as never,
  sfx3: (await import('../src/games/gunhit/game/sfx3.ts')).sfx3 as never,
  sfx4: (await import('../src/games/gunhit/game/sfx4.ts')).sfx4 as never,
  sfx5: (await import('../src/games/gunhit/game/sfx5.ts')).sfx5 as never,
  sfx6: (await import('../src/games/gunhit/game/sfx6.ts')).sfx6 as never,
  slide23: (await import('../src/games/gunhit/game/slide23Sfx.ts')).slide23Sfx as never,
  firework: (await import('../src/games/gunhit/game/fireworkSlide2Sfx.ts')).fireworkSfx as never,
};

let heard: string[] = [];
const slide3Play = slide3Sfx.play.bind(slide3Sfx);
(slide3Sfx as unknown as { play: (n: string, g?: number) => void }).play = (name: string, gain?: number) => {
  heard.push(`slide3:${name}`);
  slide3Play(name, gain);
};
for (const [mod, obj] of Object.entries(SLIDE1_VOICES)) {
  const keys = new Set([...Object.keys(obj), ...Object.getOwnPropertyNames(Object.getPrototypeOf(obj))]);
  for (const k of keys) {
    if (k === 'constructor' || typeof obj[k] !== 'function') continue;
    if (/^(setMuted|unlock|ensure|init|resume|isMuted|stopAll|setVolume|stop|start|buildGraph|send|tone|noise|bell|bubble)$/.test(k)) continue;
    const orig = (obj[k] as (...a: unknown[]) => unknown).bind(obj);
    obj[k] = (...a: unknown[]) => { heard.push(`slide1:${mod}.${k}`); return orig(...a); };
  }
}

let shots = 0;
const events = {
  onGameOver: () => undefined, onStageChange: () => undefined, onStageCleared: () => undefined,
  onShotFired: () => { shots++; }, onBossDefeated: () => undefined,
};

const DT = 1 / 60;

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

/** Slide 1's gun for every slide-3 weapon. */
const SLIDE1_FOR: Record<string, string> = {};
for (const [k, v] of Object.entries(SET_SEVEN_BY_SLIDE1_ID)) SLIDE1_FOR[v as string] = k;
for (const [k, v] of Object.entries(SET_ONE_BY_SLIDE1_ID)) SLIDE1_FOR[v as string] = k;

/** The id of a gun's slide-3 card: SET 1 keeps `new`, SET 2..7 use `set7`. */
const slide3Card = (id: string) => (SET_ONE_BY_SLIDE1_ID as Record<string, string>)[id] ? 'new' : 'set7';

/** A live stage with `weapon` on its slide-3 card (or `effect`), past the intro, board cleared. */
function stage(weapon: string, opts: { effect?: string; special?: 'boulder' } = {}): Live {
  variants.setGunEffect(weapon as never, (opts.effect ?? slide3Card(weapon)) as never);
  const game = new Game(canvas as unknown as HTMLCanvasElement, events as never) as Live;
  if (opts.special) game.startSpecialStage(opts.special);
  else game.startAtLevel(1);
  game.setWeapon(weapon);
  for (let i = 0; i < 120 && game.state === 'intro'; i++) game.update(DT);
  for (let i = 0; i < 20; i++) game.update(DT);
  game.items = game.items.filter((it: Live) => it.type !== 'old' && it.type !== 'spike' && it.type !== 'coin');
  game.ammoLeft = 40;
  return game;
}

function tap(game: Live) {
  game.press();
  game.holding = false;
}

function run(game: Live, seconds: number) {
  const n = Math.round(seconds / DT);
  for (let i = 0; i < n; i++) game.update(DT);
}

/** Logs the knives slide 1 sticks, with their time. */
function watchSticks(game: Live) {
  const log = { t: 0, sticks: [] as number[] };
  const stick = game.stickAt.bind(game);
  game.stickAt = (a: number, p: Live) => {
    log.sticks.push(log.t);
    return stick(a, p);
  };
  return log;
}

/* ── every slide-3 weapon is on slide 1 ──────────────────────────────────── */

test('all 71 of slide 3’s weapons are on slide 1, each with its own "Slide 3" design and shot card', () => {
  assert.equal(SLIDE3.length, 71);
  for (const w of SLIDE3) {
    const slide1 = SLIDE1_FOR[w.id];
    assert.ok(slide1, `${w.id} has a slide-1 gun`);
    assert.equal(slideThreeIdFor(slide1), w.id);
    assert.ok(variants.EDITABLE_WEAPONS.includes(slide1 as never), `${slide1} is selectable`);
    const card = slide3Card(slide1);
    const effect = variants.getGunEffectOptions(slide1 as never).find((o) => o.id === card);
    assert.equal(effect?.label, 'Slide 3', `${slide1} offers slide 3's shot`);
    const design = variants.getGunVariantOptions(slide1 as never).find((o) => o.id === 'set7' || o.id === 'set1');
    assert.equal(design?.label, 'Slide 3', `${slide1} offers slide 3's design`);
  }
});

/* ── the sound: slide 3's voice only ─────────────────────────────────────── */

test('a "Slide 3" shot is heard only through slide 3’s own synthesizer — all 71 weapons', () => {
  seeded(7, () => {
    for (const w of SLIDE3) {
      const slide1 = SLIDE1_FOR[w.id];
      const game = stage(slide1);
      heard = [];
      tap(game);
      run(game, 1.2);
      const own = heard.filter((h) => h.startsWith('slide3:'));
      const foreign = heard.filter((h) => h.startsWith('slide1:'));
      assert.ok(own.length >= 1, `${w.id}: slide 3 voices the shot (${own.join(' ')})`);
      assert.deepEqual(foreign, [], `${w.id}: no slide-1 voice on top (combo beep, perk, hit or charge sounds)`);
      assert.equal(game.stuck, 1, `${w.id}: one round, one knife`);
    }
  });
});

test('the other cards of the same guns keep slide 1’s own voice', () => {
  seeded(7, () => {
    const game = stage('honey', { effect: 'original' });
    heard = [];
    tap(game);
    run(game, 1.2);
    assert.ok(heard.some((h) => h.startsWith('slide1:')), 'the classic honey gun still sounds like slide 1');
    assert.equal(heard.some((h) => h.startsWith('slide3:')), false);
  });
});

/* ── the trigger: one press, one shot ────────────────────────────────────── */

test('slide 3 fires once per press: no auto-fire, spin-up, scope or held charge', () => {
  seeded(7, () => {
    for (const id of ['minigun', 'flamethrower', 'bee', 'paintball', 'soaker', 'sniper', 'beerifle', 'buster']) {
      const game = stage(id);
      shots = 0;
      game.press(); // held
      assert.equal(shots, 1, `${id} fires on the press itself`);
      run(game, 1.5);
      game.holding = false;
      assert.equal(shots, 1, `${id} does not fire again while held`);
      assert.equal(game.aiming, false, `${id} never opens slide 1's scope`);
      assert.equal(game.charging, false, `${id} never charges slide 1's way`);
    }
  });
});

test('a press while the gun is still cooling is ignored, as on slide 3', () => {
  seeded(7, () => {
    const game = stage('crossbow');
    shots = 0;
    tap(game);
    run(game, 0.25); // slide 3's crossbow reloads in 0.5 s
    tap(game);
    assert.equal(shots, 1, 'the early press is dropped, not queued');
    run(game, 0.45);
    assert.equal(shots, 1);
    tap(game);
    assert.equal(shots, 2, 'once cooled, the next press fires');
  });
});

/* ── the flight ──────────────────────────────────────────────────────────── */

test('a slide-3 round flies its own way: the RPG speeds up from 440 to 1300 px/s', () => {
  seeded(7, () => {
    const game = stage('rpg');
    tap(game);
    const p = game.projs[0];
    assert.equal(p.setSeven.constructor.name, 'RpgShot');
    assert.ok(Math.abs(p.vy) <= 460, `it leaves at 440 px/s (${p.vy})`);
    run(game, 0.15);
    assert.ok(Math.abs(p.vy) > 800, `and accelerates at 3000 px/s² (${p.vy})`);
  });
});

test('a slide-3 beam lands in the frame it appears, and its line stops at the wheel', () => {
  seeded(7, () => {
    const game = stage('laser');
    const log = watchSticks(game);
    tap(game);
    let beamAt = -1;
    const beams = () => game.projs.some((q: Live) => q.setSeven) || game.s7.released.length > 0;
    for (let i = 0; i < 60 && !log.sticks.length; i++) {
      log.t += DT;
      game.update(DT);
      if (beamAt < 0 && beams()) beamAt = log.t;
    }
    assert.equal(log.sticks.length, 1, 'the laser landed');
    assert.ok(Math.abs(log.sticks[0] - beamAt) < 1e-9, 'in the very frame its beam was released');
    const beam = game.s7.released.find((r: Live) => r.constructor.name === 'LaserBeam');
    assert.ok(beam && beam.mode === 'hit', 'the beam knows it hit');
    assert.ok(beam.endY > game.targetY, `and its line ends at the wheel (${beam.endY}), not off-screen`);
  });
});

test('SET 1 fires through slide 3’s own engine: the golden gun’s real bullet, speed and reload', () => {
  seeded(7, () => {
    const game = stage('golden');
    tap(game);
    const p = game.projs[0];
    assert.equal(p.setSeven?.constructor.name, 'GoldenBullet');
    assert.equal(Math.abs(p.vy), 1750, 'slide 3 fires it at 1750 px/s');
    assert.equal(game.cooldown, 0.2, 'and reloads in 0.2 s');
    run(game, 0.4);
    assert.equal(game.stuck, 1);
    assert.equal(game.s7.stuck.length, 1, 'slide 3 draws the stuck golden bullet');
  });
});

/* ── the feel: slide 3's own wheel reaction ──────────────────────────────── */

test('a slide-3 hit moves the wheel and the screen the slide-3 way only', () => {
  seeded(7, () => {
    const game = stage('rpg');
    tap(game);
    const camY = game.camY;
    let frames = 0;
    while (game.stuck === 0 && frames++ < 90) game.update(DT);
    assert.equal(game.stuck, 1);
    const f = game.s7.feel;
    assert.ok(f.bumpV < -100 || f.bumpY < -1, 'its bounce spring got the −26·15 kick');
    assert.ok(f.rim > 0.8, 'its rim flash lit');
    assert.ok(Math.abs(f.flashA - 0.24) < 0.05, `its screen flash is 0.24 (${f.flashA})`);
    assert.ok(f.stop > 0.05, 'its hit-stop is running');
    assert.equal(game.bump, 0, 'no slide-1 bump');
    assert.equal(game.hitFlash, 0, 'no slide-1 white flash');
    assert.equal(game.tintA, 0, 'no slide-1 tint');
    assert.equal(game.hitStop, 0, 'no slide-1 freeze');
    assert.ok(Math.abs(game.camY - camY) < 1, 'no slide-1 camera kick');
  });
});

test('slide 3’s hit-stop runs its world at 22 %', () => {
  seeded(7, () => {
    const game = stage('golden');
    game.s7.feel.stop = 0.05;
    const t0 = game.s7.time;
    game.update(DT);
    assert.ok(Math.abs((game.s7.time - t0) - DT * 0.22) < 1e-9, 'slide 3’s clock moved 22 % of the frame');
    game.s7.feel.stop = 0;
    const t1 = game.s7.time;
    game.update(DT);
    assert.ok(Math.abs((game.s7.time - t1) - DT) < 1e-9, 'and its full frame afterwards');
  });
});

test('the shrink ray pulses the wheel with slide 3’s own spring', () => {
  seeded(7, () => {
    const game = stage('shrink');
    tap(game);
    let frames = 0;
    while (game.stuck === 0 && frames++ < 90) game.update(DT);
    assert.equal(game.stuck, 1);
    assert.ok(game.s7.feel.pulseS < -0.05, `the wheel shrinks for a moment (${game.s7.feel.pulseS})`);
    run(game, 2);
    assert.ok(Math.abs(game.s7.feel.pulseS) < 0.01, 'and springs back');
  });
});

/* ── no slide-1 perks ────────────────────────────────────────────────────── */

test('slide 3’s guns have no slide-1 perks: no slow, no piercing, no rescue', () => {
  seeded(7, () => {
    // HONEY: slide 1's sticky slow is not part of slide 3.
    const honey = stage('honey');
    tap(honey);
    run(honey, 0.6);
    assert.equal(honey.stuck, 1);
    assert.equal(honey.slowT, 0, 'the wheel keeps its speed');

    // KERIS: slide 1 lets it pierce old knives; on slide 3 a knife blocks it.
    const keris = stage('keris');
    keris.rot = 0;
    keris.items.push({ angle: Math.PI / 2, type: 'old', age: 9 });
    keris.level.speed = 0;
    keris.level.dir = 0;
    tap(keris);
    run(keris, 0.6);
    assert.equal(keris.state, 'fail', 'the old knife blocks the keris: GAGAL');
  });
});

/* ── slide 3's own collision rule ────────────────────────────────────────── */

test('two slide-3 rounds block each other with slide 3’s own half-widths', () => {
  seeded(7, () => {
    const game = stage('harpoon');
    game.level.speed = 0;
    game.level.dir = 0;
    game.rot = 0;
    tap(game);
    run(game, 0.6);
    assert.equal(game.stuck, 1);
    const first = game.items.find((it: Live) => it.type === 'bullet');
    assert.ok(first.s7Half > 0 && first.s7Protrude > 0, 'slide 1 keeps slide 3’s half and protrude');
    // Turn the wheel so the next round arrives just inside / just outside
    // the two rounds' combined half-angle.
    const shot = game.s7.stuck[0];
    const reach = first.s7Half + 0.07; // the harpoon round's own half is 0.07
    for (const [k, expect] of [[0.85, 'fail'], [1.25, 'play']] as const) {
      const g2 = stage('harpoon');
      g2.level.speed = 0;
      g2.level.dir = 0;
      g2.rot = 0;
      g2.items.push({ ...first, age: 9 });
      g2.s7.stuck.push(shot);
      g2.rot = -reach * k;
      g2.cooldown = 0;
      tap(g2);
      run(g2, 0.6);
      assert.equal(g2.state, expect, `${k}× the combined half-angle → ${expect}`);
    }
  });
});

/* ── the rock and the chest ──────────────────────────────────────────────── */

test('on the rock a slide-3 round bursts with its own hit, and is embedded with its own stuck art', () => {
  seeded(7, () => {
    const game = stage('harpoon', { special: 'boulder' });
    assert.equal(game.level.mode, 'boulder');
    heard = [];
    tap(game);
    run(game, 0.8);
    assert.ok(heard.includes('slide3:harpoon_hit'), `slide 3 voices the hit on the rock (${heard.join(' ')})`);
    assert.equal(game.s7.stuck.length, 0, 'nothing sticks to a wheel that is not there');
    assert.equal(game.s7.decals.length, 0);
    // (The cell it struck may break at once and tumble away with the round.)
    const embeds = [...game.rockBullets, ...game.fallenCells.flatMap((c: Live) => c.bullets)];
    const embed = embeds.at(-1);
    assert.ok(embed?.s7, 'the round embedded in the rock is slide 3’s');
    assert.ok(game.s7Embeds.get(embed.s7), 'and it is drawn with slide 3’s own stuck art');
  });
});
