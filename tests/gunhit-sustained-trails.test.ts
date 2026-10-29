import test from 'node:test';
import assert from 'node:assert/strict';
import { installCanvasShim } from './supportCanvas';
import { installSilentAudio } from '../tools/supportAudioSilent';
import { advanceCosmeticTrail } from '../src/games/gunhit/game/cosmeticTrail';

installCanvasShim();
const env = globalThis as unknown as { window: Record<string, unknown> };
Object.assign(env.window, {
  setTimeout, clearTimeout, addEventListener: () => undefined, removeEventListener: () => undefined,
  devicePixelRatio: 1, innerWidth: 420, innerHeight: 760,
});
installSilentAudio();
const { Game, makeLevel } = await import('../src/games/gunhit/game/Game.ts');
const variants = await import('../src/games/gunhit/game/art/gunVariants.ts');
const gradient = { addColorStop: () => undefined };
const ctx = new Proxy({ canvas: { width: 420, height: 760 } } as Record<string, any>, {
  get(target, prop) {
    if (prop === 'canvas') return target.canvas;
    if (prop === 'createLinearGradient' || prop === 'createRadialGradient' || prop === 'createPattern') return () => gradient;
    if (prop === 'measureText') return () => ({ width: 8 });
    return () => undefined;
  },
  set(target, prop, value) { target[String(prop)] = value; return true; },
});
const canvas = {
  width: 420, height: 760, style: {}, getContext: () => ctx,
  addEventListener: () => undefined, removeEventListener: () => undefined,
  getBoundingClientRect: () => ({ left: 0, top: 0, width: 420, height: 760 }),
};
const makeGame = () => {
  const g = new Game(canvas as unknown as HTMLCanvasElement, { onGameOver() {}, onStageChange() {}, onStageCleared() {}, onShotFired() {}, onBossDefeated() {} } as never) as unknown as Record<string, any>;
  g.level = makeLevel(1); g.state = 'play'; g.items = []; g.ammoLeft = 99; g.cooldown = 10;
  return g;
};

test('legacy projectile trails keep their 60 Hz density across refresh rates', () => {
  const originalRandom = Math.random;
  const scenarios = [
    ['snowball', 480], ['soaker', 180], ['dora', 120], ['xeno', 120],
    ['firework', 180], ['yoyo', 120], ['keris', 60], ['diamond', 120],
  ] as const;
  const getter: Record<string, string> = {
    firework: 'getFwState', yoyo: 'getYoyoState', keris: 'getKerisState', diamond: 'getDiamondState',
  };
  Math.random = () => 0.01; // every optional trail emission fires
  try {
    for (const [id, expected] of scenarios) {
      const oldSkin = variants.getGunVariant(id), oldEffect = variants.getGunEffect(id);
      variants.setGunVariant(id, 'original'); variants.setGunEffect(id, 'original');
      try {
        for (const hz of [30, 60, 90, 120, 144]) {
          const game = makeGame();
          game.setWeapon(id);
          game.projs = [{ x: 210, y: 500, vx: 0, vy: 0 }];
          let count = 0;
          game.sink.push = () => { count++; };
          if (getter[id]) {
            const list = game[getter[id]]().particles as any[];
            const push = list.push;
            list.push = function (...items) {
              // Keris and Diamond also have time-scaled ambient gun motes;
              // count the actual flight trail, not those random ambient ticks.
              count += items.filter((p) => id === 'keris' ? p.kind === 'streak' : id === 'diamond' ? p.y < 520 : true).length;
              return push.apply(this, items);
            };
          }
          for (let i = 0; i < hz; i++) game.update(1 / hz);
          assert.equal(count, expected, `${id} at ${hz} Hz`);
          assert.equal(game.projs.length, 1, 'cosmetic timing does not remove or score the projectile');
          if (id === 'xeno') assert.equal(game.projs[0].trail.length, 12, 'the metaball tail stays sampled');
          game.destroy();
        }
      } finally {
        variants.setGunVariant(id, oldSkin); variants.setGunEffect(id, oldEffect);
      }
    }
  } finally { Math.random = originalRandom; }
});

test('boss attack trails emit at the same rate without changing projectile motion', () => {
  const oldRandom = Math.random; Math.random = () => 0.01;
  try {
    for (const hz of [30, 60, 90, 120, 144]) {
      const game = makeGame();
      game.bossProjs = [{ x: 20, y: 50, vx: 0, vy: 0, rot: 0, type: 'oni' }];
      let count = 0;
      const list = game.particles as any[], push = list.push;
      list.push = function (...items) { count += items.length; return push.apply(this, items); };
      for (let i = 0; i < hz; i++) game.update(1 / hz);
      assert.equal(count, 120, `two Oni trail particles per authored tick at ${hz} Hz`);
      assert.equal(game.bossProjs.length, 1);
      assert.equal(game.bossProjs[0].x, 20); assert.equal(game.bossProjs[0].y, 50);
      game.destroy();
    }
  } finally { Math.random = oldRandom; }
});

test('boss trail samples stay 44 px behind the moving projectile', () => {
  const oldRandom = Math.random; Math.random = () => 0.01;
  const game = makeGame();
  try {
    const bp = { x: 210, y: 100, vx: 0, vy: 100, rot: 0, type: 'oni' };
    game.bossProjs = [bp];
    const emitted: { x: number; y: number }[] = [];
    const list = game.particles as any[], push = list.push;
    list.push = function (...items) { emitted.push(...items.map((p) => ({ x: p.x, y: p.y }))); return push.apply(this, items); };
    game.update(1 / 60);
    assert.equal(emitted.length, 2);
    assert.ok(Math.abs(emitted[0].y - (bp.y - 44 - 6.86)) < 1e-6, 'trail originates behind the boss projectile');
    assert.ok(Math.abs(emitted[0].x - (bp.x - 6.86)) < 1e-6);
  } finally { game.destroy(); Math.random = oldRandom; }
});

test('trail catch-up stays on the travelled segment and is capped after a pause', () => {
  const p = { x: 0, y: 0 }, points: number[] = [];
  advanceCosmeticTrail(p, 1 / 60, (x) => points.push(x));
  p.x = 60;
  advanceCosmeticTrail(p, 1 / 30, (x) => points.push(x));
  assert.deepEqual(points, [0, 30, 60]);
  points.length = 0;
  advanceCosmeticTrail(p, 3, (x) => points.push(x));
  assert.equal(points.length, 6, 'no huge backlog after a suspended tab');
  points.length = 0;
  advanceCosmeticTrail(p, 0, (x) => points.push(x));
  advanceCosmeticTrail(p, Number.NaN, (x) => points.push(x));
  assert.equal(points.length, 0);
});

test('many consecutive weapon changes and classic, special and Boss stages keep transient layers bounded', () => {
  const scenarios = [
    ['pistol', 'original', 'set9'], ['ghost', 'set7', 'set7'], ['xeno', 'original', 'xeno_hybrid'],
    ['firework', 'set7', 'set7'], ['gauntlet_cannon', 'original', 'set7'], ['xeno', 'set11', 'set11'],
    ['snowball', 'original', 'original'], ['blackhole', 'latest', 'original'],
  ] as const;
  const old = scenarios.map(([id]) => ({ id, skin: variants.getGunVariant(id), effect: variants.getGunEffect(id) }));
  const oldRandom = Math.random;
  let seed = 0x12345678;
  Math.random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 0x100000000; };
  const game = makeGame();
  let fired = 0, maxParticles = 0, maxSlide7 = 0, maxSlide11 = 0;
  try {
    for (let stage = 0; stage < 100; stage++) {
      const [id, skin, effect] = scenarios[stage % scenarios.length];
      variants.setGunVariant(id, skin); variants.setGunEffect(id, effect);
      game.setWeapon(id);
      const mode = stage % 5;
      if (mode === 0) game.startAtLevel(3);
      else if (mode === 1) game.startSpecialStage('boulder');
      else if (mode === 2) game.startSpecialStage('bonus');
      else if (mode === 3) game.startSpecialStage('treasure');
      else game.startAtLevel(5);
      if (game.s7State) {
        assert.equal(game.s7State.particles.list.length, 0, 'slide-7 particles reset on a new stage');
        assert.equal(game.s7State.released.length, 0, 'released imported rounds reset on a new stage');
      }
      if (game.s11State?.raw) {
        assert.equal(game.s11State.raw.parts.length, 0, 'slide-11 particles reset on a new stage');
        assert.equal(game.s11State.raw.fx.length, 0, 'slide-11 transient FX reset on a new stage');
      }
      for (let frame = 0; frame < 180; frame++) {
        game.update(1 / 60);
        if (game.state === 'play' && game.cooldown <= 0 && game.reloadT <= 0 && !game.choosingBuff) {
          game.shoot(); fired++;
        }
        maxParticles = Math.max(maxParticles, game.particles.length);
        maxSlide7 = Math.max(maxSlide7, game.s7State?.particles.list.length ?? 0);
        maxSlide11 = Math.max(maxSlide11, game.s11State?.raw?.parts.length ?? 0);
      }
    }
    assert.ok(fired > 100, 'the soak included sustained real triggers');
    assert.ok(maxParticles <= 300, `generic particle count stayed bounded: ${maxParticles}`);
    assert.ok(maxSlide7 < 1000, `slide-7 effects stayed bounded: ${maxSlide7}`);
    assert.ok(maxSlide11 < 1500, `slide-11 effects stayed bounded: ${maxSlide11}`);
  } finally {
    game.destroy(); Math.random = oldRandom;
    for (const { id, skin, effect } of old) { variants.setGunVariant(id, skin); variants.setGunEffect(id, effect); }
  }
});

test('Xeno hybrid still travels and scores exactly once at each refresh rate', () => {
  const skin = variants.getGunVariant('xeno'), effect = variants.getGunEffect('xeno');
  variants.setGunVariant('xeno', 'original'); variants.setGunEffect('xeno', 'xeno_hybrid');
  try {
    for (const hz of [30, 60, 90, 120, 144]) {
      const game = makeGame(); game.setWeapon('xeno'); game.ammoLeft = 20; game.cooldown = 0;
      game.shoot();
      assert.equal(game.projs.length, 1);
      for (let i = 0; i < hz * 2 && game.projs.length && game.state === 'play'; i++) game.update(1 / hz);
      assert.equal(game.projs.length, 0, `the shot reached the wheel at ${hz} Hz`);
      assert.equal(game.stuck, 1, `the same single collision was scored at ${hz} Hz`);
      assert.equal(game.state, 'play');
      game.destroy();
    }
  } finally { variants.setGunVariant('xeno', skin); variants.setGunEffect('xeno', effect); }
});
