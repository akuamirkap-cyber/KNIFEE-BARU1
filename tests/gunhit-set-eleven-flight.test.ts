import test from 'node:test';
import assert from 'node:assert/strict';

import { installCanvasShim } from './supportCanvas';
import { installSilentAudio } from '../tools/supportAudioSilent';

/**
 * Slide 7 (`games/game-8`, "Knife-Hit Arsenal FX") on slide 1: the flight of
 * its rounds and the way they sound. Slide 1 carries the one round of a shot
 * it scores as a knife; that round flies slide 7's own flight (its speed, its
 * acceleration, a drone's homing), every other round of a volley flies and
 * bites on slide 7's own physics, and a shot is heard only where slide 7
 * voices it. Only the "Slide 7" card does this; the other cards of the same
 * guns keep slide 1's behaviour untouched.
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
const { SET_ELEVEN_IDS, SLIDE1_ID_FOR_ELEVEN, elevenWeapon } = await import('../src/games/gunhit/game/setElevenArt.ts');
const { getWeapon } = await import('../src/games/gunhit/game/weapons.ts');
const { setElevenMuted } = await import('../src/games/gunhit/game/setElevenFx.ts');
const { sfx } = await import('../src/games/gunhit/game/audio.ts');
setElevenMuted(true);

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
function stage(weapon: string, effect: 'set11' | 'original' = 'set11'): Live {
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

/** A tap and the frame after it: slide 7's shot leaves inside its next update. */
function tapFire(game: Live) {
  tap(game);
  game.update(DT);
}

function run(game: Live, seconds: number) {
  const n = Math.round(seconds / DT);
  for (let i = 0; i < n; i++) game.update(DT);
}

/** Old knives, spikes and coins off the board: nothing but the shot itself. */
function clearBoard(game: Live) {
  game.items = game.items.filter((it: Live) => it.type !== 'old' && it.type !== 'spike' && it.type !== 'coin');
  game.ammoLeft = 40;
}

type Watch = { t: number; hits: { t: number; count: number }[]; sticks: number[] };

/** Logs slide 7's own hits on its wheel and the knives slide 1 sticks. */
function watch(game: Live): Watch {
  const raw = game.s11.raw;
  const log: Watch = { t: 0, hits: [], sticks: [] };
  const hit = raw.hit.bind(raw);
  raw.hit = (x: number, y: number, o: Live = {}) => {
    log.hits.push({ t: log.t, count: o.count ?? 1 });
    return hit(x, y, o);
  };
  const stick = game.stickAt.bind(game);
  game.stickAt = (a: number, p: Live) => {
    log.sticks.push(log.t);
    return stick(a, p);
  };
  return log;
}

function play(game: Live, log: Watch, seconds: number) {
  const n = Math.max(1, Math.round(seconds / DT));
  for (let i = 0; i < n; i++) {
    game.update(DT);
    log.t += DT;
  }
}

const alive = (game: Live) => game.s11.raw.projs.filter((p: Live) => p.alive);

/* ── the nano swarm ──────────────────────────────────────────────────────── */

test('one Slide 7 nano-swarm shot: all twelve drones fly slide 7’s swarm and bite; slide 1 scores one knife a barrel', () => {
  seeded(7, () => {
    const game = stage('nano_swarm');
    clearBoard(game);
    const log = watch(game);
    tap(game);
    play(game, log, DT);
    assert.equal(alive(game).length, 12, 'twelve drones leave');
    assert.equal(game.projs.length, 1, 'slide 1 carries one of them');
    const own = game.projs[0].setEleven;
    assert.equal(own.data.i, 6, 'the centre drone — one of the two slide 7 itself counts');
    assert.equal(own.data.tx, 210, 'its spot under the wheel is slide 1’s barrel line');
    const spots = new Set(alive(game).map((p: Live) => Math.round(p.data.tx)));
    assert.ok(spots.size >= 10, 'the other drones keep slide 7’s random spots');
    play(game, log, 1.4);
    assert.equal(log.hits.length, 12, `every drone bites the wheel (${log.hits.length})`);
    assert.equal(log.hits.reduce((a, h) => a + h.count, 0), 2, 'slide 7 counts drones 0 and 6');
    assert.equal(log.sticks.length, 1, 'one knife for one barrel — not twelve hidden ones');
    assert.ok(new Set(log.hits.map((h) => h.t)).size >= 5, 'the swarm lands drone by drone, not all at once');
    assert.equal(game.state, 'play', 'one shot does not clear the stage');
    assert.equal(alive(game).length, 0);
  });
});

/* ── slide 7's own flight ────────────────────────────────────────────────── */

test('a carried Slide 7 round flies slide 7’s own flight: the singularity speeds up as it does there', () => {
  seeded(7, () => {
    const game = stage('singularity');
    clearBoard(game);
    const log = watch(game);
    tap(game);
    play(game, log, DT);
    const p = game.projs[0];
    assert.ok(p.setEleven, 'slide 1 carries the black hole');
    assert.ok(Math.abs(p.vy) <= 420, `it leaves at slide 7’s 380 px/s (${p.vy})`);
    play(game, log, 0.1);
    assert.ok(Math.abs(p.vy) > 560, `and speeds up at 2200 px/s² (${p.vy})`);
    play(game, log, 0.5);
    assert.equal(log.sticks.length, 1);
    assert.ok(log.sticks[0] < 0.35, `it lands when slide 7’s does (${log.sticks[0].toFixed(3)} s), not at a constant 380 px/s`);
    assert.ok(Math.abs(log.sticks[0] - log.hits[0].t) < 1e-9, 'slide 1’s knife sticks on slide 7’s own hit');
  });
});



test('the Slide 7 identity disc flies back to the gun after it bites, as on slide 7', () => {
  seeded(7, () => {
    const game = stage('identity_disc');
    clearBoard(game);
    const log = watch(game);
    tap(game);
    while (!log.hits.length && log.t < 1) play(game, log, DT);
    assert.equal(log.sticks.length, 1);
    const [disc] = alive(game);
    assert.ok(disc, 'the disc is still flying');
    assert.equal(disc.data.phase, 'back');
    assert.equal(disc.noCollide, true, 'on its way back it never bites again');
    assert.equal(game.projs.length, 0, 'slide 1 carries nothing back: its knife stuck');
    const y0 = disc.y;
    play(game, log, 0.1);
    assert.ok(disc.y > y0, 'it heads back down to the gun');
    play(game, log, 0.6);
    assert.equal(alive(game).length, 0, 'docked in the gun');
    assert.equal(log.hits.length, 1);
  });
});

test('slide 1 scores a Slide 7 round on its barrel line: held rapid fire never lands on its own last knife', () => {
  for (const sga of ['ak47', 'mp5', 'ion_smg']) {
    seeded(13, () => {
      const game = stage(sga);
      clearBoard(game);
      const log = watch(game);
      game.press();
      for (let i = 0; i < 33; i++) {
        play(game, log, DT);
        for (const p of game.projs) {
          if (!p.setEleven) continue;
          assert.ok(Math.abs(p.x - 210) < 1e-6 && p.vx === 0, `${sga}: its scored round flies up the barrel (${p.x}, ${p.vx})`);
        }
      }
      game.holding = false;
      assert.ok(game.state !== 'fail' && game.state !== 'over', `${sga}: held, it never fails on slide 7’s spread`);
      assert.ok(log.sticks.length >= 4, `${sga}: ${log.sticks.length} knives`);
    });
  }
});

test('a round slide 7 released in flight is never handed over as a new shot', () => {
  seeded(3, () => {
    const ak = stage('ak47');
    const fx = ak.s11;
    fx.fire(210, 571, 0);
    const round = fx.raw.projs.find((p: Live) => p.alive && p.age === 0);
    assert.ok(round);
    round.age = DT;
    assert.deepEqual(fx.takeShots(), [], 'a round that already flew is nobody’s shot');
  });
});

/* ── how a Slide 7 shot sounds ───────────────────────────────────────────── */

test('Slide 7 hits make no slide-1 combo beep; the combo still scores and pops', () => {
  const combo = sfx.combo;
  let beeps = 0;
  (sfx as Live).combo = (...a: Live[]) => {
    beeps++;
    return (combo as Live)(...a);
  };
  try {
    seeded(11, () => {
      const game = stage('pistol');
      clearBoard(game);
      game.press();
      run(game, 0.55);
      game.holding = false;
      assert.ok(game.combo >= 2, `Beretta knives in a row (combo ${game.combo})`);
      assert.ok(game.comboPop > 0, 'the combo still pops');
      assert.equal(beeps, 0, 'slide 7 voices its hits only as the weapon');

      const classic = stage('pistol', 'original');
      clearBoard(classic);
      for (let i = 0; i < 90; i++) {
        if (classic.cooldown <= 0) tap(classic);
        classic.update(DT);
      }
      assert.ok(beeps > 0, 'Sebelumnya keeps slide 1’s combo voice');
    });
  } finally {
    (sfx as Live).combo = combo;
  }
});

test('on the rock and the chest a Slide 7 round lands with slide 7’s own impact, not slide 1’s hit look and voice', () => {
  const special = (mode: 'boulder' | 'treasure', effect: 'set11' | 'original') => seeded(5, () => {
    variants.setGunEffect('ak47' as never, effect as never);
    const game = new Game(canvas as unknown as HTMLCanvasElement, events as never) as Live;
    game.startSpecialStage(mode);
    game.setWeapon('ak47');
    for (let i = 0; i < 160 && game.state === 'intro'; i++) game.update(DT);
    for (let i = 0; i < 20; i++) game.update(DT);
    const fx = game.s11;
    const n = { own: 0, generic: 0, voice: 0 };
    const impact = fx.impact.bind(fx);
    fx.impact = (...a: Live[]) => {
      n.own++;
      return impact(...a);
    };
    const look = game.specialImpact.bind(game);
    game.specialImpact = (...a: Live[]) => {
      n.generic++;
      return look(...a);
    };
    const hit = sfx.hit;
    (sfx as Live).hit = () => { n.voice++; };
    try {
      tap(game);
      run(game, 0.4);
    } finally {
      (sfx as Live).hit = hit;
    }
    return n;
  });
  for (const mode of ['boulder', 'treasure'] as const) {
    const n = special(mode, 'set11');
    assert.equal(n.own, 1, `${mode}: slide 7’s own impact (${JSON.stringify(n)})`);
    assert.equal(n.generic, 0, `${mode}: no slide-1 hit burst on top`);
    assert.equal(n.voice, 0, `${mode}: no slide-1 hit voice on top`);
  }
  const classic = special('boulder', 'original');
  assert.equal(classic.own, 0);
  assert.ok(classic.generic >= 1, 'Sebelumnya keeps slide 1’s special-stage impact');
});
