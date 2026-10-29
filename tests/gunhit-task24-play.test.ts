import test from 'node:test';
import assert from 'node:assert/strict';
import { installCanvasShim } from './supportCanvas';
import { installSilentAudio } from '../tools/supportAudioSilent';
import { fireworkMouth } from '../src/games/gunhit/game/art/fireworkTubes';
import { GHOST_HAND_X, GHOST_HAND_Y, drawGhostSpiritGun } from '../src/games/gunhit/game/art/ghostSpiritGun';
import { spawnImpact, FX, type Particle } from '../src/games/gunhit/game/fx';
import { getWeapon } from '../src/games/gunhit/game/weapons';

installCanvasShim();
const gl = globalThis as unknown as Record<string, unknown> & { window: Record<string, unknown> };
gl.window = Object.assign(gl.window ?? {}, {
  setTimeout, clearTimeout, setInterval: () => 0, clearInterval: () => undefined,
  addEventListener: () => undefined, removeEventListener: () => undefined,
  devicePixelRatio: 1, innerWidth: 420, innerHeight: 760,
});
installSilentAudio();
const gradient = { addColorStop: () => undefined };
const ctx = new Proxy({ canvas: { width: 420, height: 760 }, globalAlpha: 1 } as Record<string, unknown>, {
  get(target, prop) {
    const name = String(prop);
    if (name === 'canvas' || name === 'globalAlpha') return target[name];
    if (name === 'createLinearGradient' || name === 'createRadialGradient' || name === 'createPattern') return () => gradient;
    if (name === 'measureText') return () => ({ width: 8 });
    if (name === 'getImageData') return () => ({ data: new Uint8ClampedArray(4) });
    return () => undefined;
  },
  set(target, prop, value) { target[String(prop)] = value; return true; },
}) as unknown as CanvasRenderingContext2D;
const canvas = {
  width: 420, height: 760, style: {}, getContext: () => ctx,
  addEventListener: () => undefined, removeEventListener: () => undefined,
  getBoundingClientRect: () => ({ left: 0, top: 0, width: 420, height: 760 }),
};
const { Game, makeLevel, GUN_Y, GAMEPLAY_GUN_SCALE } = await import('../src/games/gunhit/game/Game.ts');
const variants = await import('../src/games/gunhit/game/art/gunVariants.ts');
const { gunState } = await import('../src/games/gunhit/game/art/kit.ts');
const events = { onGameOver: () => undefined, onStageChange: () => undefined, onStageCleared: () => undefined, onShotFired: () => undefined, onBossDefeated: () => undefined };
type Live = Record<string, any>;

function stage(weapon: string, skin: string, effect: string, twin = false): Live {
  variants.setGunVariant(weapon as never, skin as never);
  variants.setGunEffect(weapon as never, effect as never);
  const game = new Game(canvas as unknown as HTMLCanvasElement, events as never) as unknown as Live;
  game.level = makeLevel(1); game.state = 'play'; game.items = [];
  game.setWeapon(weapon); game.ammoLeft = 99; game.cooldown = 0; game.reloadT = 0;
  game.twinGuns = twin;
  return game;
}
function shootFresh(game: Live) {
  game.projs = []; game.items = []; game.cooldown = 0; game.reloadT = 0; game.ammoLeft = 99;
  game.shoot();
  assert.ok(game.projs.length, 'one trigger creates a real carrier');
}
function land(game: Live) {
  for (let i = 0; i < 150 && game.projs.length && game.state === 'play'; i++) game.update(1 / 60);
  assert.equal(game.state, 'play', 'a shot must not collide with its own sibling');
}
const near = (a: number, b: number) => Math.abs(a - b) < 1e-5;

test('Ghost alternates hand launches in both skins and every effect, including twin guns', () => {
  for (const skin of ['original', 'set7']) for (const effect of ['original', 'new', 'set7']) {
    const game = stage('ghost', skin, effect);
    for (const side of [1, -1]) {
      shootFresh(game);
      assert.equal(game.projs.length, 1);
      assert.equal(gunState.ghostSide, side);
      assert.ok(near(game.projs[0].x, 210 + side * GHOST_HAND_X * GAMEPLAY_GUN_SCALE));
      assert.ok(near(game.projs[0].y, GUN_Y + GHOST_HAND_Y * GAMEPLAY_GUN_SCALE));
      land(game);
      assert.ok(game.stuck > 0);
      if (effect === 'set7') assert.ok(game.s7.fx.some((fx: Live) => fx.constructor.name === 'SpiritAura'));
    }
    game.destroy();
    const twin = stage('ghost', skin, effect, true);
    shootFresh(twin);
    assert.deepEqual(twin.projs.map((p: Live) => Math.round(p.x)).sort((a: number, b: number) => a - b), [129, 291]);
    land(twin);
    assert.equal(twin.stuck, 2);
    twin.destroy();
  }
});

test('Ghost hand trajectories converge at centre, while only twin siblings may share an impact', () => {
  const previousSkin = variants.getGunVariant('ghost'), previousEffect = variants.getGunEffect('ghost');
  try {
    for (const skin of ['original', 'set7']) for (const effect of ['original', 'new', 'set7']) {
      for (const twin of [false, true]) {
        const game = stage('ghost', skin, effect, twin);
        game.level.base = 0; game.rot = 0;
        const hits: number[] = [];
        const stick = game.stickAt.bind(game);
        game.stickAt = (angle: number, p: Live) => { hits.push(p.x); stick(angle, p); };
        for (let side = 0; side < 2; side++) {
          shootFresh(game);
          const starts = game.projs.map((p: Live) => p.x);
          for (const p of game.projs) {
            assert.equal(p.ghostAim, true);
            assert.ok((p.x - 210) * p.vx < 0, 'the hand launches toward centre');
          }
          game.update(1 / 60);
          for (const [i, p] of game.projs.entries()) {
            assert.ok(Math.abs(p.x - 210) < Math.abs(starts[i] - 210), 'including imported effect 3, motion moves inward');
          }
          const previous = hits.length;
          land(game);
          const landed = hits.slice(previous);
          assert.equal(landed.length, twin ? 2 : 1);
          assert.ok(landed.every(x => Math.abs(x - 210) < 1.5), `${skin}/${effect}/${twin}: ${landed}`);
        }
        if (twin) {
          // The exemption is per trigger, not a blanket pass through bullets.
          game.cooldown = 0; game.reloadT = 0; game.ammoLeft = 99; game.shoot();
          for (let i = 0; i < 150 && game.projs.length && game.state === 'play'; i++) game.update(1 / 60);
          assert.equal(game.state, 'fail', `${skin}/${effect}: a later volley still hits the old round`);
        }
        game.destroy();
      }
    }
  } finally {
    variants.setGunVariant('ghost', previousSkin); variants.setGunEffect('ghost', previousEffect);
  }
});

test('Ghost convergence preserves obstacles and its existing spike-phasing rules', () => {
  const previousSkin = variants.getGunVariant('ghost'), previousEffect = variants.getGunEffect('ghost');
  try {
    for (const skin of ['original', 'set7']) for (const effect of ['original', 'new', 'set7']) {
      for (const twin of [false, true]) for (const obstacle of ['old', 'bullet', 'spike']) {
        const game = stage('ghost', skin, effect, twin);
        game.level.base = 0; game.rot = 0;
        // A real obstacle at the common target, not part of the current volley.
        game.items = [{ angle: Math.PI / 2, type: obstacle, age: 1, w: 'ghost',
          ...(obstacle === 'bullet' && effect === 'set7' ? { s7Half: 0.1, s7Protrude: 45 } : {}) }];
        game.shoot();
        for (let i = 0; i < 150 && game.projs.length && game.state === 'play'; i++) game.update(1 / 60);
        // Slide-1 Ghost phases through spikes; imported Slide-3 intentionally
        // uses its own obstacle rules and cannot phase. Neither phases rounds.
        const phasesSpike = obstacle === 'spike' && effect !== 'set7';
        assert.equal(game.state, phasesSpike ? 'play' : 'fail', `${skin}/${effect}/${twin}/${obstacle}`);
        if (phasesSpike) assert.equal(game.stuck, twin ? 2 : 1);
        game.destroy();
      }
    }
  } finally {
    variants.setGunVariant('ghost', previousSkin); variants.setGunEffect('ghost', previousEffect);
  }
});

test('Ghost aims at centre on Boulder, Bonus, Treasure and Boss stages for every effect, skin and twin mode', () => {
  const previousSkin = variants.getGunVariant('ghost'), previousEffect = variants.getGunEffect('ghost');
  try {
    for (const mode of ['boulder', 'bonus', 'treasure', 'boss'] as const) {
      for (const skin of ['original', 'set7']) for (const effect of ['original', 'new', 'set7']) for (const twin of [false, true]) {
        variants.setGunVariant('ghost', skin as never); variants.setGunEffect('ghost', effect as never);
        const game = new Game(canvas as unknown as HTMLCanvasElement, events as never) as unknown as Live;
        if (mode === 'boss') game.startAtLevel(5); else game.startSpecialStage(mode);
        game.setWeapon('ghost');
        for (let i = 0; i < 160 && game.state === 'intro'; i++) game.update(1 / 60);
        game.items = []; game.bonusCoins = []; game.level.base = 0; game.rot = 0; game.twinGuns = twin;
        game.ammoLeft = 99; game.level.ammo = 99;
        const hits: number[] = [];
        if (mode === 'boss') {
          const stick = game.stickAt.bind(game);
          game.stickAt = (angle: number, p: Live) => { hits.push(p.x); stick(angle, p); };
        } else {
          const special = game.stepSpecialProjectile.bind(game);
          game.stepSpecialProjectile = (p: Live) => {
            const result = special(p);
            if (result.res === 'hit') hits.push(p.x);
            return result;
          };
        }
        for (let hand = 0; hand < 2; hand++) {
          game.items = []; game.projs = []; game.cooldown = 0; game.reloadT = 0; game.shoot();
          for (let i = 0; i < 200 && game.projs.length && game.state === 'play'; i++) game.update(1 / 60);
          assert.equal(game.state, 'play', `${mode}/${skin}/${effect} stays playable`);
        }
        assert.equal(hits.length, twin ? 4 : 2, `${mode}/${skin}/${effect}/${twin} both hands reach target`);
        assert.ok(hits.every(x => Math.abs(x - 210) < 5), `${mode}/${skin}/${effect}/${twin}: ${hits}`);
        game.destroy();
      }
    }
  } finally {
    variants.setGunVariant('ghost', previousSkin); variants.setGunEffect('ghost', previousEffect);
  }
});

test('Ghost hands swing up separately and its generic hit produces flowing spirit particles', () => {
  const hands: number[][] = [];
  const record = new Proxy(ctx, { get(target, prop) {
    if (prop === 'ellipse') return (...args: number[]) => { if (args[2] === 9 && args[3] === 10) hands.push(args); };
    return Reflect.get(target, prop);
  } });
  drawGhostSpiritGun(record, 0, 0, 0, 0.2, 1, false);
  assert.equal(hands.length, 2);
  assert.ok(hands[1][1] < hands[0][1] - 50, 'the right hand rises for the right-hand throw');
  hands.length = 0;
  drawGhostSpiritGun(record, 0, 0, 0, 0.2, -1, true);
  assert.ok(hands[0][1] < hands[1][1] - 50, 'the left hand rises on the next throw');
  const parts: Particle[] = [];
  spawnImpact({ push: p => parts.push(p), light: () => undefined }, FX.ghost, getWeapon('ghost'), 210, 300, 0, 1, []);
  assert.equal(parts.length, 7);
  assert.ok(parts.every(p => p.kind === 'spirit' && p.vy < 0), 'no flower, radial stars or splash');
});

test('Firework cycles through all three matching openings for every effect and both three-tube skins', () => {
  for (const skin of ['original', 'set7', 'set2'] as const) for (const effect of ['original', 'new', 'set7', 'set2']) {
    const game = stage('firework', skin, effect);
    for (let tube = 0; tube < 3; tube++) {
      shootFresh(game);
      const mouth = fireworkMouth(skin, tube);
      assert.equal(gunState.fireworkTube, tube);
      assert.ok(near(game.projs[0].x, 210 + mouth.x * GAMEPLAY_GUN_SCALE), `${skin}/${effect}: tube ${tube} x`);
      assert.ok(near(game.projs[0].y, GUN_Y + mouth.y * GAMEPLAY_GUN_SCALE - 8), `${skin}/${effect}: tube ${tube} y`);
      if (effect === 'set7') assert.equal(game.projs[0].setSeven.ci, tube, 'rocket color matches the selected tube');
      land(game); assert.ok(game.stuck >= tube + 1);
    }
    game.destroy();
  }
});

test('twin Firework rockets start in mirrored tubes and the Slide-3 rockets land in separate lanes', () => {
  for (const skin of ['original', 'set7', 'set2']) for (const effect of ['original', 'new', 'set7', 'set2']) {
    const game = stage('firework', skin, effect, true);
    shootFresh(game);
    const mouth = fireworkMouth(skin as never, 0);
    const expected = [180 - mouth.x * GAMEPLAY_GUN_SCALE, 240 + mouth.x * GAMEPLAY_GUN_SCALE];
    assert.equal(game.projs.length, 2);
    assert.ok(near(game.projs[0].x, expected[0]) && near(game.projs[1].x, expected[1]));
    land(game);
    assert.equal(game.stuck, 2, `${skin}/${effect} lands both, not one collision`);
    game.destroy();
  }
});

test('combined Ironman and Crystal carriers each score once and retain their effect-4/3 wheel art', () => {
  for (const [weapon, skin, effect, shot] of [
    ['ironman_hand', 'set11', 'ironman_combo', 'gauntlet'],
    ['crystal', 'set7', 'set7', 'crystal'],
  ]) {
    const game = stage(weapon, skin, effect);
    shootFresh(game);
    assert.equal(game.projs.length, 1);
    assert.equal(game.projs[0].setSeven.weapon, shot);
    land(game);
    assert.equal(game.stuck, 1, `${weapon} scores one hit`);
    assert.equal(game.s7.stuck.length, 1);
    assert.equal(game.s7.stuck[0].weapon, shot, 'the imported wheel mark remains');
    game.destroy();
  }
});

test('Xenomorph effect 4 retains effect-2 liquid and exactly one scored impact', () => {
  const game = stage('xeno', 'set11', 'xeno_hybrid');
  shootFresh(game);
  assert.equal(game.projs.length, 1);
  assert.equal(game.projs[0].setEleven, undefined, 'effect 3 does not add a second projectile');
  land(game);
  assert.equal(game.stuck, 1);
  assert.equal(game.items.length, 1);
  assert.ok(game.items[0].acid?.hybrid, 'effect-2 liquid sticks while the corrosion grows');
  assert.equal(game.particles.filter((p: Live) => p.kind === 'xenoMolecular').length, 1, 'one effect-3 molecular burst');
  assert.ok(game.particles.some((p: Live) => p.kind === 'acid'), 'effect-2 liquid splash remains');
  game.destroy();
});

test('Xeno hybrid keeps one liquid and molecular impact on each special surface', () => {
  const previousSkin = variants.getGunVariant('xeno'), previousEffect = variants.getGunEffect('xeno');
  try {
    for (const mode of ['boulder', 'bonus', 'treasure'] as const) {
      variants.setGunVariant('xeno', 'set11'); variants.setGunEffect('xeno', 'xeno_hybrid');
      const game = new Game(canvas as unknown as HTMLCanvasElement, events as never) as unknown as Live;
      game.startSpecialStage(mode); game.setWeapon('xeno');
      for (let i = 0; i < 160 && game.state === 'intro'; i++) game.update(1 / 60);
      game.items = []; game.bonusCoins = []; game.ammoLeft = 99; game.cooldown = 0; game.reloadT = 0;
      game.shoot(); assert.equal(game.projs.length, 1);
      for (let i = 0; i < 180 && game.projs.length && game.state === 'play'; i++) game.update(1 / 60);
      assert.equal(game.projs.length, 0, `${mode} consumes the real carrier`);
      assert.equal(game.particles.filter((p: Live) => p.kind === 'xenoMolecular').length, 1, `${mode} gets one molecular impact`);
      assert.ok(game.particles.some((p: Live) => p.kind === 'acid'), `${mode} keeps the liquid splash`);
      const marks = mode === 'treasure' ? game.chestBullets : [...game.rockBullets, ...game.fallenCells.flatMap((c: Live) => c.bullets)];
      assert.ok(marks.some((m: Live) => m.xenoHybrid), `${mode} retains a hybrid surface mark`);
      game.destroy();
    }
  } finally {
    variants.setGunVariant('xeno', previousSkin); variants.setGunEffect('xeno', previousEffect);
  }
});

test('revised weapons reach Boulder, Bonus, Treasure and Boss targets with one real trigger', () => {
  const loadouts = [
    ['ghost', 'original', 'new'], ['ghost', 'set7', 'set7'],
    ['firework', 'set7', 'new'], ['firework', 'set7', 'set7'], ['firework', 'set2', 'set2'],
    ['ironman_hand', 'set11', 'ironman_combo'], ['gauntlet_cannon', 'original', 'set7'],
    ['crystal', 'set7', 'set7'], ['xeno', 'set11', 'xeno_hybrid'],
    ['coingun', 'set7', 'set7'], ['mega_buster', 'set11', 'set11'],
    ['holy', 'set7', 'set7'], ['photon_saber', 'set11', 'set9'],
  ] as const;
  const ids = [...new Set(loadouts.map(([id]) => id))];
  const previous = ids.map(id => ({ id, skin: variants.getGunVariant(id), effect: variants.getGunEffect(id) }));
  const random = Math.random;
  let seed = 12345;
  Math.random = () => {
    seed = (seed + 0x6d2b79f5) >>> 0;
    let x = seed; x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
  try {
    for (const mode of ['boulder', 'bonus', 'treasure', 'boss'] as const) {
      for (const [id, skin, effect] of loadouts) {
        variants.setGunVariant(id, skin); variants.setGunEffect(id, effect);
        const game = new Game(canvas as unknown as HTMLCanvasElement, events as never) as unknown as Live;
        if (mode === 'boss') game.startAtLevel(5); else game.startSpecialStage(mode);
        game.setWeapon(id);
        for (let i = 0; i < 160 && game.state === 'intro'; i++) game.update(1 / 60);
        game.items = []; game.obstacles = []; game.ammoLeft = 99; game.level.ammo = 99;
        game.cooldown = 0; game.reloadT = 0;
        const before = {
          ammo: game.ammoLeft, hp: game.level.hp, boss: game.bossHp,
          coins: game.bonusCoins.filter((c: Live) => c.taken).length, chest: game.chestBullets.length,
        };
        const hit = () => mode === 'boss' ? game.bossHp < before.boss
          : mode === 'treasure' ? game.chestBullets.length > before.chest
          : game.level.hp < before.hp || (mode === 'bonus' && game.bonusCoins.filter((c: Live) => c.taken).length > before.coins);
        game.press(); game.holding = false; game.releaseScope();
        for (let i = 0; i < 240 && !hit() && game.state === 'play'; i++) game.update(1 / 60);
        assert.ok(game.ammoLeft < before.ammo, `${id} ${effect} consumes ammunition on ${mode}`);
        assert.ok(hit(), `${id} ${effect} reaches the ${mode} target`);
        assert.equal(game.state, 'play', `${id} ${effect} leaves ${mode} playable`);
        game.destroy();
      }
    }
  } finally {
    Math.random = random;
    for (const { id, skin, effect } of previous) { variants.setGunVariant(id, skin); variants.setGunEffect(id, effect); }
  }
});
