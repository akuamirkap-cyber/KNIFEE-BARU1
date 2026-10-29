import test from 'node:test';
import assert from 'node:assert/strict';

import { installCanvasShim } from './supportCanvas';
import { installSilentAudio } from '../tools/supportAudioSilent';

/**
 * Whole slide-1 stages with slide 11's guns (the "Slide 7" card in the
 * picker). A fresh level needs the DOM-ish globals the game touches on boot and
 * a silent AudioContext: `startAtLevel()` unlocks every ported synthesizer.
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
const { setElevenIdFor } = await import('../src/games/gunhit/game/setElevenArt.ts');

const events = {
  onGameOver: () => undefined, onStageChange: () => undefined, onStageCleared: () => undefined,
  onShotFired: () => undefined, onBossDefeated: () => undefined,
};

const DT = 1 / 60;

type ElevenLayer = {
  raw: { weapon: { id: string } } | null;
  drawOverlay(c: CanvasRenderingContext2D): void;
};
type Stage = {
  update(dt: number): void;
  render(): void;
  startAtLevel(level: number): void;
  setWeapon(id: string): void;
  holding: boolean;
  state: string;
  stuck: number;
  s11State?: ElevenLayer;
};

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

function stage(weapon: string, level = 1): Stage {
  variants.setGunEffect(weapon as never, 'set11');
  const game = new Game(canvas as unknown as HTMLCanvasElement, events as never) as unknown as Stage;
  game.startAtLevel(level);
  game.setWeapon(weapon);
  for (let i = 0; i < 120 && game.state === 'intro'; i++) game.update(DT);
  return game;
}

test('holding the trigger on a slide-11 auto-fire gun never fails stage 1 on its own bullets', () => {
  // Stage 1 has nothing to hit but the bare wheel. These guns used to fail it
  // on the first burst: a round that had just landed was handed back as a new
  // shot, and its carrier spawned under the wheel straight into that bullet.
  for (const weapon of ['ak47', 'mp5', 'ion_smg']) {
    for (const seed of [1, 2, 3]) {
      seeded(seed, () => {
        const game = stage(weapon);
        assert.equal(game.state, 'play', `${weapon} stage 1 starts`);
        game.holding = true;
        let frames = 0;
        for (; frames < 300 && game.state === 'play'; frames++) game.update(DT);
        const end = game.state as string;
        assert.ok(end !== 'fail' && end !== 'over',
          `${weapon} (seed ${seed}) failed stage 1 after ${frames} frames with ${game.stuck} hits`);
        assert.ok(game.stuck > 0, `${weapon} (seed ${seed}) actually hit the wheel`);
      });
    }
  }
});

test('the equipped slide-11 gun aims with slide 11’s own weapon from the first frame', () => {
  for (const weapon of ['railgun', 'orbital_beacon', 'heat_ray']) {
    const game = stage(weapon);
    game.update(DT);
    assert.equal(game.s11State?.raw?.weapon.id, setElevenIdFor(weapon as never),
      `${weapon} runs slide 11's own weapon before it ever fires`);
  }
});

test('slide 1 paints slide 11’s aiming overlay while a stage is live', () => {
  const game = stage('railgun');
  game.update(DT);
  const fx = game.s11State;
  assert.ok(fx, 'the slide-11 layer is up for the equipped gun');
  let painted = 0;
  const own = fx.drawOverlay.bind(fx);
  fx.drawOverlay = (c) => {
    painted++;
    own(c);
  };
  game.render();
  assert.equal(painted, 1, 'the laser sight is painted once per frame');
});

type Live = Stage & {
  shoot(): void;
  rot: number;
  bump: number;
  hitFlash: number;
  setActive(active: boolean): void;
  active: boolean;
  s11State?: ElevenLayer & { raw: { wheel: { freeze: number; kick: number } } | null; silence(): void };
};

/** Fire once and run frames until the shot has landed (or `max` frames). */
function landOne(game: Live, max = 90) {
  const before = game.stuck;
  game.shoot();
  for (let i = 0; i < max && game.stuck === before && game.state === 'play'; i++) game.update(DT);
  return game.stuck > before;
}



test('a slide-11 hit moves the wheel with slide 11’s reaction, not slide 1’s bump', () => {
  seeded(3, () => {
    const eleven = stage('ak47') as Live;
    assert.ok(landOne(eleven), 'the slide-11 round lands');
    assert.ok(eleven.bump < 0.05, 'no slide-1 bump on top of it');
    let kick = 0;
    for (let i = 0; i < 8; i++) {
      eleven.update(DT);
      kick = Math.min(kick, eleven.s11State?.raw?.wheel.kick ?? 0);
    }
    assert.ok(kick < -1, 'slide 11’s own kick throws the wheel up');
    variants.setGunEffect('ak47' as never, 'original');
    const own = new Game(canvas as unknown as HTMLCanvasElement, events as never) as unknown as Live;
    own.startAtLevel(1);
    own.setWeapon('ak47');
    for (let i = 0; i < 120 && own.state === 'intro'; i++) own.update(DT);
    assert.ok(landOne(own), 'slide 1’s own round lands');
    assert.ok(own.bump > 0.3, 'slide 1’s own shot keeps its bump');
  });
});

test('slide-11 hits are voiced by slide 11 alone', async () => {
  // Slide 1's per-gun hit voices (the railgun's zap, the saber's and the
  // gauntlet's hits) live in a table that holds the functions themselves.
  const { HIT_SFX } = await import('../src/games/gunhit/game/Game.ts');
  const table = HIT_SFX as Record<string, (() => void) | undefined>;
  for (const weapon of ['railgun', 'gauntlet_cannon']) {
    const own = table[weapon];
    assert.ok(own, `${weapon} has a slide-1 hit voice`);
    let voiced = 0;
    table[weapon] = () => { voiced++; };
    try {
      seeded(5, () => {
        const game = stage(weapon) as Live;
        assert.ok(landOne(game), `the ${weapon} hit lands`);
        assert.equal(voiced, 0, `slide 1’s own ${weapon} hit voice no longer plays over slide 11’s`);
      });
      variants.setGunEffect(weapon as never, 'original');
      const plain = new Game(canvas as unknown as HTMLCanvasElement, events as never) as unknown as Live;
      plain.startAtLevel(1);
      plain.setWeapon(weapon);
      for (let i = 0; i < 120 && plain.state === 'intro'; i++) plain.update(DT);
      if (landOne(plain)) assert.ok(voiced > 0, `slide 1’s own ${weapon} shot keeps its voice`);
    } finally {
      table[weapon] = own;
      variants.setGunEffect(weapon as never, 'set11');
    }
  }
});

test('pausing the slide silences slide 11’s beam hum', () => {
  const game = stage('heat_ray') as Live;
  game.update(DT);
  const fx = game.s11State;
  assert.ok(fx, 'the slide-11 layer is up');
  let silenced = 0;
  const own = fx.silence.bind(fx);
  fx.silence = () => { silenced++; own(); };
  const gl = globalThis as unknown as { cancelAnimationFrame?: (id: number) => void };
  const saved = gl.cancelAnimationFrame;
  gl.cancelAnimationFrame = () => undefined;
  try {
    game.active = true;
    game.setActive(false);
  } finally {
    gl.cancelAnimationFrame = saved;
  }
  assert.equal(silenced, 1, 'a paused slide leaves no loop running');
});

type Feel = Live & {
  recoil: number;
  camY: number;
  shake: number;
  tintA: number;
  hitStop: number;
  aiming: boolean;
  charging: boolean;
  burnT: number;
  score: number;
  press(): void;
  releaseScope(): void;
  addText(text: string, x: number, y: number, color: string, size: number): void;
  s11State?: Live['s11State'] & { shotsFired: number };
};

test('a slide-11 shot neither jumps slide 1’s gun nor jolts its camera, and its hit shakes like slide 11', () => {
  seeded(3, () => {
    const game = stage('ak47') as Feel;
    const cam = game.camY;
    game.shoot();
    assert.equal(game.recoil, 0, 'slide 11’s gun kicks inside its own artwork');
    assert.equal(game.camY, cam, 'no camera kick on the shot');
    const before = game.stuck;
    for (let i = 0; i < 90 && game.stuck === before; i++) game.update(DT);
    assert.ok(game.stuck > before, 'the round lands');
    let shake = 0, tint = 0, freeze = 0;
    for (let i = 0; i < 20; i++) {
      shake = Math.max(shake, game.shake);
      tint = Math.max(tint, game.tintA);
      freeze = Math.max(freeze, game.hitStop);
      game.update(DT);
    }
    assert.ok(shake > 0, 'slide 11’s own jolt reaches the screen');
    assert.ok(shake < 2.5, `only slide 11’s AK jolt (${shake.toFixed(2)} px) — slide 1 used to add 3 px and more`);
    assert.equal(tint, 0, 'no slide-1 colour wash');
    assert.equal(freeze, 0, 'no slide-1 freeze');
  });
});

test('slide 11’s sniper and bow fire the moment the trigger goes down, without slide 1’s scope or draw', () => {
  for (const weapon of ['sniper', 'longbow']) {
    seeded(4, () => {
      const game = stage(weapon) as Feel;
      game.update(DT);
      const fx = game.s11State!;
      const fired = fx.shotsFired;
      game.press();
      assert.equal(game.aiming, false, `${weapon}: no slide-1 scope (vignette, crosshair, slow-mo)`);
      assert.equal(game.charging, false, `${weapon}: no slide-1 draw-to-charge`);
      game.update(DT);
      assert.equal(fx.shotsFired, fired + 1, `${weapon}: slide 7’s shot leaves on the very next frame, as its \`pending\` does`);
      game.holding = false;
      game.releaseScope();
      game.update(DT);
      assert.equal(fx.shotsFired, fired + 1, `${weapon}: letting go fires nothing more`);
    });
  }
  // The Mega Buster keeps its hold-and-release charge (on slide 7's clock);
  // the shoulder caster has no trigger of its own: held, it only locks on.
  const buster = stage('mega_buster') as Feel;
  buster.press();
  assert.equal(buster.charging, true, 'the Mega Buster still charges while held');

});

test('a slide-11 heat ray keeps the burn’s points but none of slide 1’s fire look', () => {
  seeded(6, () => {
    const game = stage('heat_ray') as Feel;
    const texts: string[] = [];
    const own = game.addText.bind(game);
    game.addText = (text, x, y, color, size) => {
      texts.push(text);
      own(text, x, y, color, size);
    };
    assert.ok(landOne(game), 'the heat ray lands');
    assert.ok(game.burnT > 0, 'the wheel still burns for points');
    const score = game.score;
    for (let i = 0; i < 70 && game.state === 'play'; i++) game.update(DT);
    assert.ok(game.score > score, 'and the burn keeps scoring');
    assert.equal(texts.filter((t) => /TERBAKAR|🔥/.test(t)).length, 0, 'without slide 1’s fire captions');
  });
});
