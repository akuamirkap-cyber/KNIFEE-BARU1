import test from 'node:test';
import assert from 'node:assert/strict';
import { installCanvasShim } from './supportCanvas';
import { installSilentAudio } from '../tools/supportAudioSilent';

installCanvasShim();
const env = globalThis as unknown as Record<string, unknown> & { window: Record<string, unknown> };
env.window = Object.assign(env.window ?? {}, {
  setTimeout, clearTimeout, setInterval: () => 0, clearInterval: () => undefined,
  addEventListener: () => undefined, removeEventListener: () => undefined,
  devicePixelRatio: 1, innerWidth: 420, innerHeight: 760,
});
installSilentAudio();
const grad = { addColorStop: () => undefined };
const context = new Proxy({ canvas: { width: 420, height: 760 } } as Record<string, unknown>, {
  get(target, prop) {
    if (prop === 'canvas') return target.canvas;
    if (prop === 'createLinearGradient' || prop === 'createRadialGradient' || prop === 'createConicGradient' || prop === 'createPattern') return () => grad;
    if (prop === 'measureText') return () => ({ width: 8 });
    if (prop === 'getImageData') return () => ({ data: new Uint8ClampedArray(4) });
    return () => undefined;
  },
  set(target, prop, value) { target[String(prop)] = value; return true; },
}) as unknown as CanvasRenderingContext2D;
const canvas = {
  width: 420, height: 760, style: {}, getContext: () => context,
  addEventListener: () => undefined, removeEventListener: () => undefined,
  getBoundingClientRect: () => ({ left: 0, top: 0, width: 420, height: 760 }),
} as unknown as HTMLCanvasElement;
const { Game } = await import('../src/games/gunhit/game/Game');
const { setGunVariant, setGunEffect } = await import('../src/games/gunhit/game/art/gunVariants');
const DT = 1 / 60;

// Explicit IDs/cards ensure this really exercises the player's 30 combinations.
const loadouts = [
  ['ak47', 'original', 'set11'], ['crossbow', 'original', 'set7'], ['laser', 'set7', 'original'],
  ['fish', 'current', 'set7'], ['rpg', 'original', 'set7'], ['cricket', 'current', 'new'],
  ['bazooka', 'set7', 'set7'], ['freeze', 'original', 'set7'], ['blackhole', 'set1', 'new'],
  ['slingshot', 'original', 'new'], ['blowgun', 'set1', 'new'], ['shotgun', 'original', 'original'],
  ['soaker', 'set1', 'set2'], ['snowball', 'set7', 'set7'], ['sniper', 'original', 'set9'],
  ['flamethrower', 'original', 'set7'], ['bubble', 'original', 'set7'], ['bamboo', 'original', 'set7'],
  ['banana', 'original', 'new'], ['harpoon', 'set7', 'set7'], ['chicken', 'set7', 'set7'],
  ['confetti', 'set7', 'set7'], ['seed', 'original', 'set7'], ['pizza', 'original', 'set7'],
  ['minigun', 'set7', 'new'], ['railgun', 'set11', 'set7'], ['magnet', 'original', 'set7'],
  ['shrink', 'set7', 'set7'], ['pirate', 'original', 'set7'], ['card', 'set7', 'set7'],
] as const;

// A deterministic random stream makes target setup and impact particles repeatable.
function seeded<T>(run: () => T): T {
  const old = Math.random; let n = 12345;
  Math.random = () => { n = (n + 0x6d2b79f5) >>> 0; let x = n; x = Math.imul(x ^ (x >>> 15), x | 1); x ^= x + Math.imul(x ^ (x >>> 7), x | 61); return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
  try { return run(); } finally { Math.random = old; }
}
function stage(id: string, mode: 'normal' | 'boulder' | 'bonus' | 'boss' = 'normal') {
  const row = loadouts.find(r => r[0] === id);
  assert.ok(row);
  setGunVariant(row[0] as never, row[1] as never);
  setGunEffect(row[0] as never, row[2] as never);
  const game = new Game(canvas, {}) as any;
  game.setWeapon(row[0]);
  if (mode === 'boulder' || mode === 'bonus') game.startSpecialStage(mode);
  else game.startAtLevel(mode === 'boss' ? 5 : 1);
  game.state = 'play';
  game.cooldown = 0;
  return game;
}
function shootUntilHit(game: any, id: string) {
  const oldScore = game.score, oldAmmo = game.ammoLeft;
  const initialBossHp = game.bossHp, initialRockHp = game.level.hp;
  // A coin may score before the projectile actually lands. Wait for a real
  // target hit rather than mistaking an earlier coin pickup for an impact.
  const hitTarget = () => game.level.mode === 'classic'
    ? (game.level.boss ? game.bossHp < initialBossHp : game.stuck > 0)
    : game.level.hp < initialRockHp;
  game.press();
  // The classic minigun needs its spin-up; the others are tapped once.
  if (id !== 'minigun') { game.holding = false; game.releaseScope(); }
  for (let i = 0; i < 240 && !hitTarget() && game.state === 'play'; i++) game.update(DT);
  game.holding = false;
  assert.ok(game.ammoLeft < oldAmmo, `${id}: the real trigger used ammunition`);
  assert.ok(hitTarget(), `${id}: the projectile actually reached its target`);
  assert.ok(game.score > oldScore, `${id}: the projectile landed and scored`);
}
function assertNoImpactFreeze(game: any, message: string) {
  assert.equal(game.hitStop, 0, `${message}: no classic impact pause`);
  assert.equal(game.nineStop, 0, `${message}: no Slide 4 impact pause`);
  assert.equal(game.elevenStop, 0, `${message}: no Slide 5 impact pause`);
  assert.ok(!game.s7State || game.s7State.feel.stop <= 0, `${message}: no Slide 3 impact pause`);
  const before = game.time;
  game.update(DT);
  assert.ok(Math.abs(game.time - before - DT) < 1e-8, `${message}: world advances a full frame after a hit`);
}

test('all 30 real default shots score without slowing the world after impact', () => seeded(() => {
  for (const [id] of loadouts) {
    const game = stage(id);
    shootUntilHit(game, id);
    assert.equal(game.state, 'play', `${id}: the stage remains playable`);
    assertNoImpactFreeze(game, id);
    game.destroy();
  }
}));

test('Boulder, Bonus and Boss hits keep their damage and feedback without stalling play', () => seeded(() => {
  for (const [id, mode] of [['seed', 'boulder'], ['pizza', 'bonus'], ['cricket', 'boulder'], ['railgun', 'boss'], ['ak47', 'boss']] as const) {
    const game = stage(id, mode);
    const hp = mode === 'boss' ? game.bossHp : game.level.hp;
    const coins = game.bonusCoins?.length ?? 0;
    shootUntilHit(game, id);
    const hpAfter = mode === 'boss' ? game.bossHp : game.level.hp;
    assert.ok(hpAfter < hp, `${id} damages ${mode}`);
    assert.ok(game.shake > 0 || game.nineShake > 0 || game.s7State?.feel.rim > 0, `${id} retains visible impact feedback`);
    if (mode === 'boulder') assert.equal(coins, 48, 'the attached coin field remains available');
    assertNoImpactFreeze(game, `${id} ${mode}`);
    game.destroy();
  }
}));

test('failure cinematics can still slow time; only routine successful impacts are changed', () => seeded(() => {
  const game = stage('cricket');
  game.state = 'fail'; game.hitStop = 0.14; game.timeScale = 0.12;
  const before = game.time;
  game.update(DT);
  assert.ok(game.time - before < DT * 0.1, 'the deliberate failure moment remains');
  game.destroy();
}));
