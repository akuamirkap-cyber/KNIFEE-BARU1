import test from 'node:test';
import assert from 'node:assert/strict';
import { BOARD_OBSTACLE_SCALE, embeddedProjectileScale, Game, makeLevel, projectileSizeMultiplier, type LevelMode } from '../src/games/gunhit/game/Game';
import { DiamondRock } from '../src/games/gunhit/game/art/diamondRock';
import { TreasureChest } from '../src/games/gunhit/game/art/bonusArt';
import { SNOWBALL_RADIUS } from '../src/games/gunhit/game/art/projectiles2';
import { SNOWBALL_MAG_SIZE } from '../src/games/gunhit/game/art/guns2';
import { drawMaterialTrail } from '../src/games/gunhit/game/art/projectileTrails';
import { drawClassicBeam } from '../src/games/gunhit/game/art/beamEffects';
import { getGunEffect, getGunEffectOptions, setGunEffect } from '../src/games/gunhit/game/art/gunVariants';
import { goldenSlideOffset } from '../src/games/gunhit/game/art/guns';
import { bananaPeelOpen, bananaFleshFill } from '../src/games/gunhit/game/art/guns2';
import { dragonFlameSurge } from '../src/games/gunhit/game/art/guns3';
import { honeyPumpPulse } from '../src/games/gunhit/game/art/guns4';
import { FX, spawnImpact, spawnMuzzle, type Particle } from '../src/games/gunhit/game/fx';
import { drawGun, drawProjectile, getWeapon, WEAPONS } from '../src/games/gunhit/game/weapons';
import { GUN_METRICS } from '../src/games/gunhit/game/art/metrics';
import { gunState } from '../src/games/gunhit/game/art/kit';
import { drawPreciseWeaponDecal } from '../src/games/gunhit/game/art/decalSystem';
import {
  createFirework8State,
  drawFirework8Background,
  drawFirework8ParticlesAndRings,
  FIREWORK_EMBED_NOSE,
  FIREWORK_PL,
  firework8ShotHue,
  type Firework8State,
} from '../src/games/gunhit/game/firework8fx';
import {
  createYoyoSlideState,
  drawYoyoSlideBackground,
  drawYoyoSlideParticlesRingsAndStrings,
  yoyoAmmoHue,
  type YoyoSlideState,
} from '../src/games/gunhit/game/yoyoSlideFx';
import {
  createKerisSlideState,
  drawKerisSlideBackground,
  drawKerisSlideParticlesAndArcs,
  drawKerisSurfaceArcs,
  type KerisSlideState,
} from '../src/games/gunhit/game/kerisSlideFx';
import { drawGunCentered } from '../src/games/gunhit/game/art/drawCentered';
import { isSlide23Weapon, noteFreq, SLIDE23_WEAPONS, slide23Sfx } from '../src/games/gunhit/game/slide23Sfx';
import { sfx } from '../src/games/gunhit/game/audio';
import { readFileSync } from 'node:fs';

interface Shot { x: number; y: number; vx: number; vy: number }
interface Embedded { cellId?: number; x: number; y: number; angle: number; w: string }
interface Falling { id: number; x: number; y: number; cx: number; cy: number; rot: number; bullets: Embedded[] }
interface Probe {
  shoot(): void;
  advanceReload(dt: number): void;
  stepSpecialProjectile(p: Shot): { res: string };
  specialImpact(x: number, y: number, material: 'rock' | 'gold'): void;
  level: ReturnType<typeof makeLevel>;
  projs: Shot[];
  particles: { kind: string; x: number; y: number }[];
  lights: { x: number; y: number }[];
  fallenCells: Falling[];
  flyers: { kind: string; x: number; y: number }[];
  rockBullets: Embedded[];
  chestBullets: Embedded[];
  rockFragments: unknown[];
  ammoLeft: number;
  snowLoaded: number;
  reloadT: number;
  cooldown: number;
  coins: number;
  score: number;
  beams: { x: number; y: number }[];
  slowT: number;
  slowF: number;
  slowKind: string;
}

test('Sandal shots stay full-sized and do not use the spinning flight animation', () => {
  const sandal = getWeapon('sandal');
  assert.equal(sandal.spinFly, undefined);
  assert.equal(sandal.slow, undefined, 'sandal hits no longer slow or stun the target');
  assert.equal(sandal.slowStyle, undefined, 'the dizzy visual/status is removed from Sandal');
  assert.equal(projectileSizeMultiplier('sandal', true, false), 1,
    'a mini-shot modifier cannot shrink the sandal');
  assert.equal(projectileSizeMultiplier('sandal', false, false), 1,
    'the normal sandal remains at its original full size');
  assert.equal(projectileSizeMultiplier('sandal', false, true), 1.8,
    'an explicit giant modifier can still enlarge it');
  assert.equal(projectileSizeMultiplier('pistol', true, false), 0.65,
    'mini-shot sizing remains unchanged for other weapons');
});

test('stage-board obstacles are doubled while embedded weapon shots keep normal size', () => {
  assert.equal(BOARD_OBSTACLE_SCALE, 2, 'pre-placed rusty bullets and spikes use 2x scale');
  assert.equal(embeddedProjectileScale(), 1, 'Nail Gun knife shots return to normal size');
  assert.ok(Math.abs(embeddedProjectileScale(1) - 1.3) < 1e-10, 'only an explicit charge buff enlarges a shot');
});

test('an embedded Nail Gun projectile is rendered as a knife with an exposed handle', () => {
  const fillStyles: unknown[] = [];
  const gradient = { addColorStop: () => {} };
  const ctx = new Proxy({} as CanvasRenderingContext2D, {
    get: (_target, key) => key === 'createLinearGradient' ? () => gradient : () => {},
    set: (_target, key, value) => {
      if (key === 'fillStyle') fillStyles.push(value);
      return true;
    },
  });
  drawProjectile(ctx, 'nail', 39, 0, 99, true);
  assert.ok(fillStyles.includes('#5b3520'), 'the knife grip is drawn over the board');
  assert.ok(fillStyles.includes('#fbbf24'), 'the knife has a visible guard');
});

function probe(level: number, weapon = 'pistol', mode?: LevelMode): Probe {
  const game = Object.create(Game.prototype) as Probe;
  const particles: Probe['particles'] = [];
  const lights: Probe['lights'] = [];
  Object.assign(game, {
    level: makeLevel(level, mode), weapon: getWeapon(weapon), state: 'play',
    projs: [], beams: [], rockBullets: [], chestBullets: [], treasureCoins: [], fallenCells: [], rockFragments: [], flyers: [],
    particles, lights, sink: {
      push: (p: Probe['particles'][number]) => particles.push(p),
      light: (x: number, y: number) => lights.push({ x, y }),
    },
    events: {}, rot: 0, camY: 0, bump: 0, shake: 0, hitStop: 0, flashWhite: 0,
    cooldown: 0, reloadT: 0, ammoLeft: 12, snowLoaded: SNOWBALL_MAG_SIZE, maxAmmoMult: 1,
    speedMult: 1, dmgMult: 1, rt: 0, coins: 0, score: 0, slowT: 0, slowF: 1, slowKind: 'ice',
  });
  return game;
}

test('disc, glitch, portal, bit8, warp_disruptor, and deflector_shield are removed from SGA', () => {
  for (const removedId of ['disc', 'glitch', 'portal', 'bit8', 'warp_disruptor', 'deflector_shield']) {
    assert.equal(WEAPONS.some(w => w.id === removedId), false, `${removedId} should be removed from WEAPONS`);
  }
});

test('snowball doubles in size and breaks into clumps of white snow, not blue ice', () => {
  const snow = getWeapon('snowball');
  assert.equal(SNOWBALL_RADIUS, 16);
  assert.equal(snow.half, 13, 'the collision radius grows with the visible ball');
  assert.equal(snow.stick, 16, 'the surface entry depth remains unchanged');
  const particles: Particle[] = [];
  const sink = { push: (p: Particle) => particles.push(p), light: () => {} };
  spawnMuzzle(sink, FX.snowball, snow, 210, 570);
  assert.ok(particles.some(p => p.kind === 'snowflake'), 'snow sprays from the cannon');
  particles.length = 0;
  spawnImpact(sink, FX.snowball, snow, 210, 360, 0, 1, ['#999999']);
  assert.ok(particles.filter(p => p.kind === 'snowChunk').length >= 10);
  assert.ok(particles.filter(p => p.kind === 'snowDust').length >= 20);
  assert.ok(particles.some(p => p.kind === 'snowflake'));
  assert.ok(particles.some(p => p.kind === 'smoke'), 'powder cloud softens the snow burst');
  assert.equal(particles.some(p => p.kind === 'iceShard'), false);
});

test('the five Snowball Cannon chambers empty on shots and refill only after a reload', () => {
  // These assertions describe slide 1's own upgraded effect; slide 7 is the new default.
  setGunEffect('snowball', 'new');
  const game = probe(7, 'snowball');
  game.ammoLeft = game.level.ammo;
  assert.equal(game.ammoLeft, 8);
  assert.equal(SNOWBALL_MAG_SIZE, 5);
  for (let fired = 1; fired <= SNOWBALL_MAG_SIZE; fired++) {
    game.cooldown = 0;
    game.shoot();
    assert.equal(game.snowLoaded, SNOWBALL_MAG_SIZE - fired);
    assert.equal(game.ammoLeft, 8 - fired);
  }
  assert.ok(game.reloadT > 0, 'empty magazine starts an automatic reload');
  const shots = game.projs.length;
  game.cooldown = 0;
  game.shoot();
  assert.equal(game.projs.length, shots, 'cannot fire an invisible sixth snowball');
  game.advanceReload(0.42);
  assert.equal(game.snowLoaded, 0, 'hopper stays empty during the reload');
  game.advanceReload(0.5);
  assert.equal(game.snowLoaded, 3, 'the next magazine holds only the remaining stage ammo');
  assert.equal(game.ammoLeft, 3, 'classic stages never gain infinite ammunition');
  game.cooldown = 0;
  game.shoot();
  assert.equal(game.snowLoaded, 2);
  assert.equal(game.ammoLeft, 2);

  const timed = probe(3, 'snowball', 'boulder');
  timed.snowLoaded = 1;
  timed.shoot();
  assert.ok(timed.reloadT > 0);
  timed.advanceReload(1);
  assert.equal(timed.ammoLeft, 11, 'magazine reload must NOT refill remaining timed-stage ammo');
  assert.equal(timed.snowLoaded, 5);
  timed.ammoLeft = 1;
  timed.snowLoaded = 1;
  timed.cooldown = 0;
  timed.shoot();
  timed.advanceReload(1);
  assert.equal(timed.ammoLeft, timed.level.ammo, 'timed stages refill the stage quota only after it reaches zero');
  assert.equal(timed.snowLoaded, 5);
});

test('Super Soaker fires liquid spray and splashes instead of slow-perk glass chips', () => {
  const water = getWeapon('soaker');
  const particles: Particle[] = [];
  const sink = { push: (p: Particle) => particles.push(p), light: () => {} };
  spawnMuzzle(sink, FX.soaker, water, 210, 570);
  assert.ok(particles.every(p => p.kind === 'waterDrop'));
  particles.length = 0;
  spawnImpact(sink, FX.soaker, water, 210, 360, 0, 1, ['#999999']);
  assert.equal(particles.filter(p => p.kind === 'waterSplash').length, 1);
  assert.ok(particles.filter(p => p.kind === 'waterDrop').length >= 15);
  assert.equal(particles.some(p => p.kind === 'chip'), false);
  assert.equal(water.slowFactor, 0.6, 'the visual overhaul does not change the wet slowdown');
});

test('Honey Blaster keeps its slowdown but leaves sticky amber beads and a splash on every target', () => {
  const honey = getWeapon('honey');
  assert.equal(honey.slowFactor, 0.5);
  assert.equal(honey.slowTime, 1.6);
  assert.equal(honey.slowStyle, 'honey', 'slowdown cannot borrow the Soaker\'s blue film');
  assert.equal(honey.stick, 22);
  const particles: Particle[] = [];
  const sink = { push: (p: Particle) => particles.push(p), light: () => {} };
  spawnMuzzle(sink, FX.honey, honey, 210, 570);
  assert.ok(particles.filter(p => p.kind === 'honeyDrop').length >= 6);
  particles.length = 0;
  spawnImpact(sink, FX.honey, honey, 210, 360, 0, 1, ['#999999']);
  assert.equal(particles.filter(p => p.kind === 'honeySplash').length, 1);
  assert.ok(particles.filter(p => p.kind === 'honeyDrop').length >= 17);
  assert.ok(particles.every(p => p.kind !== 'waterDrop' && p.kind !== 'chip'));

  const rock = probe(3, 'honey', 'boulder');
  const stone = new DiamondRock();
  const cells = (stone as unknown as { cells: { center: { x: number; y: number }; hp: number }[] }).cells;
  const cell = cells.find(c => c.hp >= 2 && c.center.y > 140 && Math.abs(c.center.x) < 40)!;
  assert.ok(cell);
  Object.assign(rock, { rock: stone, dmgMult: 0.25 });
  assert.equal(rock.stepSpecialProjectile({ x: 210 + cell.center.x * rock.level.radius / 196,
    y: 282 + cell.center.y * rock.level.radius / 196, vx: 0, vy: -1900 }).res, 'hit');
  assert.ok([...rock.rockBullets, ...rock.fallenCells.flatMap(f => f.bullets)].some(b => b.w === 'honey'),
    'the liquid bead must remain attached to the actual stone cell');
  assert.equal(rock.slowKind, 'honey');
  assert.equal(rock.slowF, 0.5);
  assert.ok(rock.particles.some(p => p.kind === 'honeySplash'));

  const chest = probe(6, 'honey', 'treasure');
  Object.assign(chest, { chest: { hit: () => {} } });
  assert.equal(chest.stepSpecialProjectile({ x: 210, y: 362, vx: 0, vy: -1900 }).res, 'hit');
  assert.equal(chest.chestBullets[0].w, 'honey', 'the liquid sticks to the shaking treasure chest too');
  assert.ok(chest.particles.some(p => p.kind === 'honeySplash'));
});

test('embedded hornets point a long sharp sting into the board, not their head', () => {
  const bee = getWeapon('bee');
  assert.equal(bee.half, 3.5);
  assert.equal(bee.stick, 24);
  assert.equal(bee.auto, true);
  const calls: { method: string; args: number[] }[] = [];
  const ctx = new Proxy({}, {
    get: (_target, method) => method === 'createLinearGradient' || method === 'createRadialGradient'
      ? () => ({ addColorStop: () => {} })
      : (...args: number[]) => { calls.push({ method: String(method), args }); },
    set: () => true,
  }) as CanvasRenderingContext2D;
  drawProjectile(ctx, 'bee', 36, 0.6, 1, true);
  assert.ok(calls.some(call => call.method === 'lineTo' && call.args[0] === 0
    && Math.abs(call.args[1] - (36 * 0.35 - 12)) < 0.001),
  'the needle tip penetrates past the surface while its root remains visible');
  assert.ok(calls.some(call => call.method === 'ellipse' && call.args[0] === 0
    && call.args[1] === 18 && call.args[2] === 8),
  'the tiny puncture halo marks where the barbed tail enters the board');
  calls.length = 0;
  drawProjectile(ctx, 'bee', 36, 0.6, 0.1);
  assert.ok(calls.some(call => call.method === 'lineTo' && call.args[0] === 0 && call.args[1] === -12),
    'a flying hornet also travels stinger-first');
});

test('Moonbeam defaults to its original shot while the optional new star beam keeps the same hit rules', () => {
  const moon = getWeapon('moonbeam');
  // Slide 7's own MOONBEAM is the newest effect; slide 1 keeps both of its own.
  assert.equal(getGunEffect('moonbeam'), 'set7');
  setGunEffect('moonbeam', 'original');
  assert.equal(moon.beam, true);
  assert.equal(moon.speed, 14000);
  assert.equal(moon.points, 2);
  const classic = probe(1, 'moonbeam');
  classic.shoot();
  assert.equal(classic.projs.length, 1);
  assert.equal(classic.beams.length, 1);
  setGunEffect('moonbeam', 'new');
  try {
    const game = probe(1, 'moonbeam');
    game.shoot();
    assert.equal(game.projs.length, 1);
    assert.equal(game.beams.length, 1);
    assert.ok(game.particles.filter(p => p.kind === 'star').length >= 24,
      'the optional new shot opens with stars at the wand and along the beam');
    const particles: Particle[] = [];
    spawnImpact({ push: p => particles.push(p), light: () => {} }, FX.moonbeam, moon, 210, 360, 0, 1, []);
    assert.ok(particles.filter(p => p.kind === 'star').length >= 18);
    assert.equal(particles.filter(p => p.kind === 'shock').length, 2);
    assert.ok(FX.moonbeam.lightR >= 200);
    const translations: number[] = [];
    const ctx = new Proxy({}, {
      get: (_target, method) => method === 'createRadialGradient' || method === 'createLinearGradient'
        ? () => ({ addColorStop: () => {} })
        : method === 'translate' ? (_x: number, y: number) => { translations.push(y); } : () => {},
      set: () => true,
    }) as CanvasRenderingContext2D;
    drawProjectile(ctx, 'moonbeam', 42, 1, 1, true);
    assert.ok(translations.includes(42 * 0.53), 'the optional new star stays centered on the target surface');
  } finally { setGunEffect('moonbeam', 'set7'); }
});

test('viscous honey, stars, rainbow light and dragon fire have their own material trails', () => {
  const ctx = new Proxy({}, {
    get: (_target, method) => method === 'createLinearGradient' || method === 'createRadialGradient'
      ? () => ({ addColorStop: () => {} }) : () => {},
    set: () => true,
  }) as CanvasRenderingContext2D;
  for (const weapon of ['honey', 'rainbow', 'dragon', 'meteor'] as const) {
    assert.equal(drawMaterialTrail(ctx, weapon, 'new'), true, weapon);
  }
  assert.equal(drawMaterialTrail(ctx, 'moonbeam', 'original'), false, 'selected classic shot has no new trail');
  assert.equal(drawMaterialTrail(ctx, 'moonbeam', 'new'), true, 'the optional new shot still has stars');
});

test('treasure coins form a supported heap inside the rim, without clipped crowns', () => {
  // Each chest has its own slight jitter. Check many layouts so a rare seed
  // cannot leave a detached coin at the edge or above the old crop line.
  for (let sample = 0; sample < 50; sample++) {
    const coins = (new TreasureChest() as unknown as {
      coins: { x: number; y: number; r: number }[];
    }).coins;
    assert.equal(coins.length, 32);
    for (const coin of coins) {
      assert.ok(coin.x - coin.r > -88 && coin.x + coin.r < 88, 'within the open mouth');
      assert.ok(coin.y - coin.r > -45, 'no coin crown is cut by the old clip line');
      assert.ok(coin.y + coin.r < 21, 'lowest coins disappear behind the front wall');
      if (coin.y < -3) {
        assert.ok(coins.some(below => below.y - coin.y > 7 && below.y - coin.y < 17
          && Math.hypot(below.x - coin.x, below.y - coin.y) < coin.r + below.r),
        'every visible upper coin rests against another coin below it');
      }
    }
  }
});

test('both barrels own their muzzle rings, glow and projectiles in rock and treasure', () => {
  for (const [stage, mode] of [[3, 'boulder'], [6, 'treasure']] as const) {
    const game = probe(stage, 'plasma', mode);
    Object.assign(game, { twinGuns: true });
    game.shoot();
    assert.deepEqual(game.projs.map(p => p.x), [180, 240]);
    assert.deepEqual(game.particles.filter(p => p.kind === 'ring').map(p => p.x), [180, 240]);
    assert.deepEqual(game.lights.map(l => l.x), [180, 240]);
    assert.equal(game.ammoLeft, 11);
  }

  const pistol = probe(3, 'pistol', 'boulder');
  Object.assign(pistol, { twinGuns: true });
  pistol.shoot();
  const casings = pistol.particles.filter(p => p.kind === 'shell');
  assert.deepEqual(casings.map(p => p.x), [164, 256], 'mirrored guns eject outward');
});

test('special-stage explosions keep the weapon’s normal impact burst', () => {
  for (const [stage, material, mode] of [[3, 'rock', 'boulder'], [6, 'gold', 'bonus']] as const) {
    const game = probe(stage, 'rpg', mode);
    game.specialImpact(164, 360, material);
    assert.ok(game.particles.some(p => p.kind === 'shock' && p.x === 164));
    assert.ok(game.particles.some(p => p.kind === 'smoke' && Math.abs(p.x - 164) < 25));
    assert.ok(game.particles.some(p => p.kind === 'ring' && p.x === 164));
  }
});

test('rounds stay on their exact rotating cell and tumble with that cell when it breaks', () => {
  const rock = new DiamondRock();
  const cells = (rock as unknown as { cells: { id: number; center: { x: number; y: number }; hp: number }[] }).cells;
  const target = cells.find(c => c.hp >= 2 && c.center.y > 150 && Math.abs(c.center.x) < 40)!;
  assert.ok(target);
  const initialHp = target.hp;
  const game = probe(3, 'pistol', 'boulder');
  Object.assign(game, { rock, dmgMult: 0.25, twinGuns: true });
  const sc = game.level.radius / 196;
  for (let i = 0; i < initialHp; i++) {
    const rotation = i * 0.11;
    Object.assign(game, { rot: rotation });
    const x = 210 + (target.center.x * Math.cos(rotation) - target.center.y * Math.sin(rotation)) * sc;
    const y = 282 + (target.center.x * Math.sin(rotation) + target.center.y * Math.cos(rotation)) * sc;
    assert.equal(game.stepSpecialProjectile({ x, y, vx: 0, vy: -2700 }).res, 'hit');
    if (i === 0) {
      assert.equal(game.rockBullets.length, 1);
      assert.equal(game.rockBullets[0].cellId, target.id);
      assert.equal(game.fallenCells.length, 0);
    }
  }
  assert.equal(game.rockBullets.some(b => b.cellId === target.id), false);
  const fallen = game.fallenCells.find(f => f.id === target.id)!;
  assert.ok(fallen, 'the struck textured chunk drops, not just generic dust');
  assert.equal(fallen.bullets.length, initialHp, 'old and breaking shots follow the chunk together');
  assert.ok(fallen.bullets.every(b => b.cellId === target.id && b.w === 'pistol'));
  // A bullet's offsets and orientation are cell-local, so changing the falling
  // chunk transform moves the bullet without detaching it or leaving a ghost.
  const first = fallen.bullets[0];
  const relativeX = (first.x - fallen.cx) * sc, relativeY = (first.y - fallen.cy) * sc;
  const before = { x: fallen.x + relativeX * Math.cos(fallen.rot) - relativeY * Math.sin(fallen.rot),
    y: fallen.y + relativeX * Math.sin(fallen.rot) + relativeY * Math.cos(fallen.rot) };
  fallen.y += 60;
  fallen.rot += 0.25;
  const after = { x: fallen.x + relativeX * Math.cos(fallen.rot) - relativeY * Math.sin(fallen.rot),
    y: fallen.y + relativeX * Math.sin(fallen.rot) + relativeY * Math.cos(fallen.rot) };
  assert.ok(Math.hypot(after.x - before.x, after.y - before.y) > 40);
});

test('splash damage carries bullets away with neighboring chunks too', () => {
  const rock = new DiamondRock();
  const cells = (rock as unknown as { cells: { id: number; center: { x: number; y: number }; hp: number; alive: boolean }[] }).cells;
  const target = cells.find(c => c.hp >= 2 && c.hp <= 3 && c.center.y > 140 && Math.abs(c.center.x) < 80
    && cells.some(other => other !== c && Math.hypot(other.center.x - c.center.x, other.center.y - c.center.y) < 40))!;
  assert.ok(target);
  const neighbor = cells.find(c => c !== target && Math.hypot(c.center.x - target.center.x, c.center.y - target.center.y) < 40)!;
  const game = probe(3, 'pistol', 'boulder');
  Object.assign(game, { rock, dmgMult: 0.25 });
  const sc = game.level.radius / 196;
  const hit = (cell: typeof target) => game.stepSpecialProjectile({
    x: 210 + cell.center.x * sc, y: 282 + cell.center.y * sc, vx: 0, vy: -2700,
  });
  assert.equal(hit(target).res, 'hit');
  assert.equal(game.rockBullets[0].cellId, target.id);
  Object.assign(game, { dmgMult: 1 });
  assert.equal(hit(neighbor).res, 'hit');
  assert.equal(target.alive, false);
  assert.equal(game.fallenCells.find(f => f.id === target.id)?.bullets.length, 1);
  assert.equal(game.rockBullets.some(b => b.cellId === target.id), false);
});

test('treasure hits use normal weapon impacts at each lane and embed rounds in the shaking chest', () => {
  const game = probe(6, 'plasma', 'treasure');
  let hits = 0;
  Object.assign(game, { chest: { hit: () => { hits++; } }, treasureBuff: 'double', twinGuns: true });
  for (const x of [180, 240]) assert.equal(game.stepSpecialProjectile({ x, y: 362, vx: 0, vy: -1700 }).res, 'hit');
  assert.equal(hits, 2);
  assert.deepEqual(game.chestBullets.map(b => b.x), [-30, 30]);
  assert.equal(game.coins, 0, 'coins must wait for the shower to land before being credited');
  assert.ok((game as unknown as { treasureCoins: { value: number }[] }).treasureCoins.reduce((n, c) => n + c.value, 0) >= 2);
  assert.ok(game.lights.some(l => l.x === 180));
  assert.ok(game.lights.some(l => l.x === 240));
  assert.ok(game.particles.some(p => p.x === 180 && p.kind === 'shock'));
  assert.ok(game.particles.some(p => p.x === 240 && p.kind === 'shock'));

  game.stepSpecialProjectile({ x: 180, y: 362, vx: 0, vy: -1700 });
  assert.equal(hits, 3);
  assert.deepEqual(game.chestBullets.map(b => b.x), [30, -30]);
  assert.equal(game.flyers.filter(f => f.kind === 'bullet').length, 1, 'a repeat hit dislodges only the previous round');
});

test('rock and treasure retain the gun-specific flames, confetti and notes of ordinary rounds', () => {
  for (const stage of [3, 6]) {
    const fire = probe(stage, 'dragon');
    fire.specialImpact(164, 370, stage === 3 ? 'rock' : 'gold');
    assert.ok(fire.particles.some(p => p.kind === 'glow' && p.x > 145 && p.x < 185));

    const confetti = probe(stage, 'confetti');
    confetti.specialImpact(256, 370, stage === 3 ? 'rock' : 'gold');
    assert.ok(confetti.particles.filter(p => p.kind === 'chip').length >= 28);

    const notes = probe(stage, 'angklung');
    Object.assign(notes, { perkCount: 0 });
    notes.specialImpact(164, 370, stage === 3 ? 'rock' : 'gold');
    assert.equal(notes.particles.filter(p => p.kind === 'text').length, 3);
  }
});

test('Banana flesh enters the target halfway, splashes juice, and never gains reload ammo', () => {
  const banana = getWeapon('banana');
  assert.equal(banana.half, 5.5);
  assert.equal(banana.stick, 30);
  const seams: number[] = [];
  const ctx = new Proxy({}, {
    get: (_target, method) => method === 'createLinearGradient' || method === 'createRadialGradient'
      ? () => ({ addColorStop: () => {} })
      : method === 'ellipse' ? (_x: number, y: number) => { seams.push(y); } : () => {},
    set: () => true,
  }) as CanvasRenderingContext2D;
  drawProjectile(ctx, 'banana', banana.stick, 0.3, 1, true);
  assert.ok(seams.includes(banana.stick * 0.5), 'the embedded flesh marks its halfway surface');
  const classic = probe(1, 'banana');
  classic.ammoLeft = classic.level.ammo;
  classic.shoot();
  assert.equal(classic.ammoLeft, classic.level.ammo - 1, 'closing peel does not refill ammo');
  const chest = probe(6, 'banana', 'treasure');
  Object.assign(chest, { chest: { hit: () => {} } });
  assert.equal(chest.stepSpecialProjectile({ x: 210, y: 362, vx: 0, vy: -1700 }).res, 'hit');
  assert.equal(chest.chestBullets[0].w, 'banana');
  assert.ok(chest.particles.some(p => p.kind === 'bananaSplash'));
  assert.ok(chest.particles.filter(p => p.kind === 'bananaDrop').length >= 10);
});

test('Bamboo firecracker and twice-sized chick retain their original stage rules', () => {
  const bamboo = getWeapon('bamboo');
  const particles: Particle[] = [];
  const sink = { push: (p: Particle) => particles.push(p), light: () => {} };
  spawnImpact(sink, FX.bamboo, bamboo, 210, 360, 0, 1, ['#999999']);
  assert.ok(particles.some(p => p.kind === 'smoke' && p.color.includes('255')));
  assert.equal(bamboo.points, 2);
  const chicken = getWeapon('chicken');
  assert.equal(chicken.half, 12, 'larger chick gets a matching collision width');
  assert.equal(chicken.stick, 70);
  assert.equal(chicken.burst?.n, undefined, 'visual growth cannot grant extra shots');
  const game = probe(1, 'chicken');
  game.shoot();
  assert.equal(game.projs.length, 1);
  assert.equal(game.ammoLeft, 11);
});

test('Golden Gun cycles its slide after a shot and while reloading without refilling classic ammo', () => {
  assert.equal(goldenSlideOffset(9, 0), 0);
  assert.ok(goldenSlideOffset(0.125, 0) >= 16, 'the chamber recoils visibly');
  assert.ok(goldenSlideOffset(9, 0.325) >= 16, 'timed-stage reload moves the same upper slide');
  assert.equal(goldenSlideOffset(9, 0.65), 0);
  const classic = probe(1, 'golden');
  classic.shoot();
  assert.equal(classic.ammoLeft, 11);
  assert.equal(classic.reloadT, 0, 'classic stage has no invented reload between shots');
  const timed = probe(3, 'golden', 'treasure');
  timed.ammoLeft = 1;
  timed.shoot();
  assert.ok(timed.reloadT > 0);
  timed.advanceReload(0.1);
  assert.equal(timed.ammoLeft, 0, 'animation cannot give free rounds early');
  timed.advanceReload(1);
  assert.equal(timed.ammoLeft, timed.level.ammo);
});

test('Laser keeps its instant hit with the former beam; the BLACK HOLE classic round stays selectable', () => {
  assert.equal(getGunEffect('laser'), 'original');
  // The black hole now defaults to the slide-2 void shot; the compact classic
  // round is still there as the "Sebelumnya" effect.
  assert.equal(getGunEffect('blackhole'), 'new');
  assert.deepEqual(getGunEffectOptions('blackhole').map(o => o.id), ['original', 'new']);
  assert.equal(getGunEffect('plasma'), 'original');
  assert.equal(getWeapon('laser').beam, true);
  assert.notEqual(getWeapon('blackhole').beam, true);
  const laser = probe(1, 'laser');
  laser.shoot();
  assert.equal(laser.projs.length, 1, 'the fast projectile still handles collision');
  assert.equal(laser.beams.length, 1, 'the classic beam is a visual overlay');
  const voidShot = probe(1, 'blackhole');
  voidShot.shoot();
  assert.equal(voidShot.projs.length, 1);
  assert.equal(voidShot.beams.length, 0);

  const calls: { method: string; args: number[] }[] = [];
  const ctx = new Proxy({}, {
    get: (_target, method) => method === 'createLinearGradient' || method === 'createRadialGradient'
      ? () => ({ addColorStop: () => {} })
      : (...args: number[]) => { calls.push({ method: String(method), args }); },
    set: () => true,
  }) as CanvasRenderingContext2D;
  drawClassicBeam(ctx, 210, 180, 570, 0.8, getWeapon('laser').trail);
  assert.equal(calls.filter(call => call.method === 'fillRect').length, 2,
    'classic beam has a narrow core and a soft glow, not the new filaments');
  calls.length = 0;
  drawProjectile(ctx, 'blackhole', 36, 1.5, 1, true, 'original');
  assert.ok(calls.some(call => call.method === 'arc' && call.args[2] === 5.5));
  assert.equal(calls.some(call => call.method === 'arc' && call.args[2] > 24), false,
    'no oversized opaque black circle is placed on a rock or chest');
  const impact: Particle[] = [];
  spawnImpact({ push: p => impact.push(p), light: () => {} }, FX.blackhole,
    getWeapon('blackhole'), 210, 360, 0, 1, ['#777777']);
  assert.ok(impact.length);
  for (const id of ['plasma'] as const) {
    assert.equal(drawMaterialTrail(ctx, id, 'new'), false,
      'the retired new trail cannot return through a stale saved choice');
  }
  // The black hole's slide-2 shot renders its own singularity, so it must not
  // also paint a generic material trail.
  assert.equal(drawMaterialTrail(ctx, 'blackhole', 'original'), false);
});

test('bee-shaped Honey Blaster pumps on impact without altering its sticky slowdown', () => {
  assert.equal(honeyPumpPulse(9), 0);
  assert.equal(honeyPumpPulse(0), 0);
  assert.ok(honeyPumpPulse(0.14) > 0.99);
  assert.equal(honeyPumpPulse(0.28), 0);
  const w = getWeapon('honey');
  assert.equal(w.slowStyle, 'honey');
  assert.equal(w.slowFactor, 0.5);
  assert.equal(w.slowTime, 1.6);
});

test('banana peel opens for the launched pulp, then closes as the fruit visibly refills', () => {
  assert.equal(bananaPeelOpen(9), 0);
  assert.equal(bananaFleshFill(9), 1);
  assert.equal(bananaFleshFill(0), 0);
  assert.equal(bananaFleshFill(0.06), 0);
  assert.ok(bananaPeelOpen(0.065) > 0.99);
  assert.ok(Math.abs(bananaFleshFill(0.13) - 0.5) < 1e-6);
  assert.equal(bananaPeelOpen(0.2), 0);
  assert.equal(bananaFleshFill(0.2), 1);
});

test('dragon breath flares beyond the horns after a shot, then settles without extra rounds', () => {
  assert.equal(dragonFlameSurge(9), 0);
  assert.ok(dragonFlameSurge(0.11) > 0.99);
  assert.equal(dragonFlameSurge(0.22), 0);
  const game = probe(1, 'dragon');
  game.shoot();
  assert.equal(game.projs.length, 1);
  assert.equal(game.ammoLeft, 11);
});

test('Firework weapon keeps SGA launcher shape while using Firework 8-Gun rocket, muzzle, stick burst, and night-sky background', () => {
  // These assertions describe slide 1's own upgraded effect; slide 7 is the new default.
  setGunEffect('firework', 'new');
  const fwWeapon = getWeapon('firework');
  assert.equal(fwWeapon.noSmoke, true, 'no gray firearm smoke puffs');
  assert.equal(drawMaterialTrail({} as CanvasRenderingContext2D, 'firework'), true,
    'firework rocket uses stick sparks rather than a white laser wedge');

  // 1. SGA 3-tube launcher shape is preserved, and flash uses Slide #3 recoil ellipse
  const gunCalls: { prop: string; args: unknown[] }[] = [];
  const gunFillStyles: unknown[] = [];
  const ctx = new Proxy({} as CanvasRenderingContext2D, {
    get: (_target, prop) => {
      if (prop === 'createLinearGradient' || prop === 'createRadialGradient') {
        return () => ({ addColorStop: () => {} });
      }
      return (...args: unknown[]) => { gunCalls.push({ prop: String(prop), args }); };
    },
    set: (_target, prop, value) => {
      if (prop === 'fillStyle') gunFillStyles.push(value);
      return true;
    },
  });
  gunState.rocketHue = 210;
  drawGun(ctx, 'firework', 0, 0, 0.5, 0.8, true, undefined, 'original');
  assert.ok(gunFillStyles.includes('#fde047'), 'SGA firework launcher keeps yellow star/cone accents');
  assert.ok(gunFillStyles.some(v => typeof v === 'string' && v.startsWith('hsla(210, 100%, 70%')),
    'muzzle flash draws Slide #3 colored recoil ellipse');

  // 2. Projectile draws Slide #3 drawRocketShape (wooden stick #e6c27a, two white stripes, flash overlay)
  const projStrokes: unknown[] = [];
  const projFills: unknown[] = [];
  const projRects: number[][] = [];
  const projCtx = new Proxy({} as CanvasRenderingContext2D, {
    get: (_target, prop) => {
      if (prop === 'createLinearGradient' || prop === 'createRadialGradient') {
        return () => ({ addColorStop: () => {} });
      }
      if (prop === 'fillRect') return (...args: number[]) => { projRects.push(args); };
      return () => {};
    },
    set: (_target, prop, value) => {
      if (prop === 'strokeStyle') projStrokes.push(value);
      if (prop === 'fillStyle') projFills.push(value);
      return true;
    },
  });
  gunState.rocketHue = 300;
  gunState.rocketFlash = 1;
  drawProjectile(projCtx, 'firework', FIREWORK_PL, 0.2, 0.1, true);
  gunState.rocketFlash = 0;
  assert.ok(projStrokes.includes('#e6c27a'), 'rocket wooden stick is drawn');
  assert.ok(projFills.includes('rgba(255,255,255,0.85)'), 'rocket white body stripes are drawn');
  assert.ok(projFills.includes('rgba(255,255,255,0.7)'), 'impact flash overlay is drawn when flash > 0');
  assert.equal(projRects.length, 2, 'two body stripes are drawn on the rocket');

  // 3. Launching ("saat keluar") and sticking ("nancep") populate Slide #3 firework state
  const game = probe(2, 'firework') as Probe & {
    getFwState(): Firework8State;
    stickAt(local: number, p?: Shot & { hue?: number }): void;
    items: { angle: number; type: string; w?: string; hue?: number; flash?: number }[];
    faceCtx: CanvasRenderingContext2D;
    faceR: number;
  };
  game.items = [];
  game.faceR = 106;
  game.faceCtx = projCtx;
  game.shoot();
  const fw = game.getFwState();
  assert.equal(game.projs.length, 1);
  const firstHue = firework8ShotHue(2, 0);
  assert.equal((game.projs[0] as Shot & { hue?: number }).hue, firstHue);
  assert.equal(fw.particles.length, 23, '22 muzzle sparks + 1 central flash particle');
  assert.equal(fw.glows.length, 1, 'muzzle glow r=70');
  assert.equal(fw.rings.length, 1, 'muzzle shock ring r=38');

  // Sticking into the target triggers Slide #3 stick burst and sets flash=1 with 6px nose embed
  const prevParticles = fw.particles.length;
  game.stickAt(Math.PI / 2, game.projs[0] as Shot & { hue?: number });
  assert.equal(game.items.length, 1);
  assert.equal(game.items[0].hue, firstHue);
  assert.equal(game.items[0].flash, 1);
  assert.equal(FIREWORK_EMBED_NOSE, 6);
  assert.ok(fw.particles.length > prevParticles + 80, 'dual firework bursts spawn on stick');
  assert.ok(fw.rings.some(r => r.r === 90 && r.life === 0.45), 'impact shock ring r=90 (0.45s) spawns on stick');

  // 4. Target decal leaves no black scorch hole for firework
  const decalCalls: string[] = [];
  const decalCtx = new Proxy({} as CanvasRenderingContext2D, {
    get: (_target, prop) => (..._args: unknown[]) => { decalCalls.push(String(prop)); },
    set: () => true,
  });
  drawPreciseWeaponDecal(decalCtx, 106, Math.PI / 2, fwWeapon, 'wood');
  assert.deepEqual(decalCalls, ['save', 'beginPath', 'arc', 'clip', 'restore']);

  // 5. Night-sky background ("efek dilatar") renders gradient, horizon haze, skyline, stars, glows, and line-streak particles
  const bgStops: string[] = [];
  const bgCtx = new Proxy({} as CanvasRenderingContext2D, {
    get: (_target, prop) => {
      if (prop === 'createLinearGradient' || prop === 'createRadialGradient') {
        return () => ({ addColorStop: (_at: number, col: string) => { bgStops.push(col); } });
      }
      return () => {};
    },
    set: () => true,
  });
  const bgState = createFirework8State(420, 760);
  assert.equal(bgState.stars.length, 110);
  assert.ok(bgState.skyline.length > 8);
  drawFirework8Background(bgCtx, bgState, 1, 210, 255, 106, 2);
  assert.ok(bgStops.includes('#04010f') && bgStops.includes('#4a1747'), 'Slide #3 night sky gradient stops');
  assert.ok(bgStops.includes('rgba(255, 120, 160, 0.25)'), 'Slide #3 pink horizon haze');
  drawFirework8ParticlesAndRings(bgCtx, fw);
});

test('Yoyo Shooter uses Slide #6 gun/yoyo design & animations and Slide #2 launch, stuck rim spin, string snap, ammo, and background', () => {
  const yoyoWeapon = getWeapon('yoyo');
  assert.equal(yoyoWeapon.rope, true);

  // 1. Gun body and demo shot/catch-back animation use Slide #6 (Arsenal Wheel) YoyoGun & drawYoyo
  const gunFills: string[] = [];
  const gunStrokes: string[] = [];
  const gunCtx = new Proxy({} as CanvasRenderingContext2D, {
    get: (_target, prop) => {
      if (prop === 'createLinearGradient' || prop === 'createRadialGradient') {
        return () => ({ addColorStop: (_at: number, col: string) => { gunFills.push(col); } });
      }
      return () => {};
    },
    set: (_target, prop, value) => {
      if (prop === 'fillStyle' && typeof value === 'string') gunFills.push(value);
      if (prop === 'strokeStyle' && typeof value === 'string') gunStrokes.push(value);
      return true;
    },
  });
  drawGun(gunCtx, 'yoyo', 210, 550, 0.5, 1, true);
  assert.ok(gunFills.includes('#ffe4f3') && gunFills.includes('#ffa6d4'), 'Slide #6 capsule launcher body gradient');
  assert.ok(gunStrokes.includes('#18b8d8') && gunStrokes.includes('#2ee6ff'), 'Slide #6 cyan yoyo cradle');
  assert.ok(gunFills.includes('#ffe14a') && gunFills.includes('#7b3dff'), 'Slide #6 yoyo axle cap and star emblem');

  // Demo preview in Menu/Arsenal animates shot & catch-back without mutating live gunState
  gunState.sinceShot = 9;
  drawGunCentered(gunCtx, 'yoyo', 0.05, 0, true, undefined, true);
  assert.equal(gunState.sinceShot, 9);
  assert.equal(gunState.inPreview, false);

  // 2. Projectile uses Slide #6 spinning yoyo + Slide #2 stuck spin arcs when embedded
  const projArcs: number[] = [];
  const projCtx = new Proxy({} as CanvasRenderingContext2D, {
    get: (_target, prop) => {
      if (prop === 'createLinearGradient' || prop === 'createRadialGradient') {
        return () => ({ addColorStop: () => {} });
      }
      if (prop === 'arc') {
        return (_x: number, _y: number, r: number) => { projArcs.push(r); };
      }
      return () => {};
    },
    set: () => true,
  });
  gunState.yoyoHue = 120;
  gunState.yoyoFlash = 1;
  drawProjectile(projCtx, 'yoyo', 34, 0.4, 0.1, true);
  assert.ok(projArcs.some(r => r > 22), 'embedded yoyo draws Slide #2 fast-spin speed arcs around the rim');
  assert.equal(drawMaterialTrail(projCtx, 'yoyo'), true, 'skips generic laser wedge trail');

  // 3. Firing & sticking in Game triggers Slide #2 launch, yoyoBurst, and elastic string snap-back
  const game = probe(2, 'yoyo') as Probe & {
    getYoyoState(): YoyoSlideState;
    stickAt(local: number, p?: Shot & { hue?: number; originX?: number }): void;
    items: { angle: number; type: string; w?: string; hue?: number; flash?: number; age: number }[];
    faceCtx: CanvasRenderingContext2D;
    faceR: number;
  };
  game.items = [];
  game.faceR = 106;
  game.faceCtx = projCtx;
  game.shoot();
  const yoyo = game.getYoyoState();
  assert.equal(game.projs.length, 1);
  const firstHue = yoyoAmmoHue(0);
  assert.equal((game.projs[0] as Shot & { hue?: number }).hue, firstHue);
  assert.equal(yoyo.particles.length, 14, '14 Slide #2 launch puff sparks');
  assert.equal(yoyo.glows.length, 1, 'Slide #2 launch glow');
  assert.equal(yoyo.rings.length, 1, 'Slide #2 launch ring');

  const prevParticles = yoyo.particles.length;
  game.stickAt(Math.PI / 2, game.projs[0] as Shot & { hue?: number; originX?: number });
  assert.equal(game.items.length, 1);
  assert.equal(game.items[0].hue, firstHue);
  assert.equal(game.items[0].flash, 1);
  assert.equal(yoyo.strings.length, 1, 'elastic string snaps back from wheel rim to gun');
  assert.ok(yoyo.particles.length >= prevParticles + 52, 'Slide #2 yoyoBurst spawns 52 rainbow particles + central flash');
  assert.ok(yoyo.rings.some(r => r.r === 95) && yoyo.rings.some(r => r.r === 125), 'Slide #2 dual shockwave rings spawn on stick');

  // 4. Target decal leaves no black bullet hole for yoyo
  const decalCalls: string[] = [];
  const decalCtx = new Proxy({} as CanvasRenderingContext2D, {
    get: (_target, prop) => (..._args: unknown[]) => { decalCalls.push(String(prop)); },
    set: () => true,
  });
  drawPreciseWeaponDecal(decalCtx, 106, Math.PI / 2, yoyoWeapon, 'wood');
  assert.deepEqual(decalCalls, ['save', 'beginPath', 'arc', 'clip', 'restore']);

  // 5. Slide #2 yoyo background renders night skyline, stars, yoyo atmosphere overlay, and rainbow wheel glow
  const bgStops: string[] = [];
  const bgCtx = new Proxy({} as CanvasRenderingContext2D, {
    get: (_target, prop) => {
      if (prop === 'createLinearGradient' || prop === 'createRadialGradient') {
        return () => ({ addColorStop: (_at: number, col: string) => { bgStops.push(col); } });
      }
      return () => {};
    },
    set: () => true,
  });
  const bgState = createYoyoSlideState(420, 760);
  assert.equal(bgState.stars.length, 95);
  assert.ok(bgState.skyline.length > 8);
  drawYoyoSlideBackground(bgCtx, bgState, 1, 210, 255, 106, 2, 1.5);
  assert.ok(bgStops.includes('#04010f') && bgStops.includes('#4a1747'), 'Slide #2 night sky gradient stops');
  assert.ok(bgStops.includes('rgba(60,10,60,0.2)') && bgStops.includes('rgba(80,20,40,0.2)'), 'Slide #2 yoyo atmosphere overlay');
  drawYoyoSlideParticlesRingsAndStrings(bgCtx, yoyo, 210, 255, 1.5);
});

test('keris weapon combines Slide #8 Keris gun/effects/background with Slide #4 Luk Keris blade design', () => {
  // These assertions describe slide 1's own upgraded effect; slide 7 is the new default.
  setGunEffect('keris', 'new');
  const kerisWeapon = getWeapon('keris');
  assert.equal(kerisWeapon.color, '#4deeea');
  assert.equal(FX.keris.ghost, 0, 'no ghost afterimage trail');
  assert.equal(FX.keris.speedLines, false, 'no generic vertical speedLines');

  // 1. Gun renders Slide #8 Hulu/Mendak/Warangka/Ganja + Slide #4 Luk 5 Wilah blade (no tip star) + bottom-to-top gleam sweep
  const gunStops: string[] = [];
  const gunFills: string[] = [];
  const gunStrokes: string[] = [];
  const gunCtx = new Proxy({} as CanvasRenderingContext2D, {
    get: (_target, prop) => {
      if (prop === 'createLinearGradient' || prop === 'createRadialGradient') {
        return () => ({ addColorStop: (_at: number, col: string) => { gunStops.push(col); } });
      }
      return () => {};
    },
    set: (_target, prop, value) => {
      if (prop === 'fillStyle' && typeof value === 'string') gunFills.push(value);
      if (prop === 'strokeStyle' && typeof value === 'string') gunStrokes.push(value);
      return true;
    },
  });
  gunState.sinceShot = 0.04;
  drawGun(gunCtx, 'keris', 210, 575, 0.5, 0.9, true, undefined, 'original');
  assert.ok(gunStops.includes('#1e1107') && gunStops.includes('#593518'), 'Slide #8 Garuda Jawa Hulu wood gradient');
  assert.ok(gunStops.includes('#241409') && gunStops.includes('#663d1d'), 'Slide #8 Ladrang Warangka boat sheath');
  assert.ok(gunStops.includes('#c98a1e') && gunStops.includes('#f0cf7d'), 'Slide #4 Luk 5 Wilah golden-white blade gradient');
  assert.ok(gunFills.includes('#e02547'), 'Slide #4 Naga crest ruby eyes at blade base');
  assert.ok(gunStops.includes('rgba(255, 250, 220, 0.98)') && gunFills.includes('rgba(255, 232, 140, 0.92)'), 'bottom-to-top blade gleam sweep when shooting');
  assert.ok(!gunStrokes.includes('rgba(217,154,38,0.7)'), 'no tip star at the end of the Keris blade');
  drawGunCentered(gunCtx, 'keris', 0.3, 0, true, 'original', true);

  // 2. Projectile & stuck Keris match the full Keris weapon shape (Hulu, Mendak, Warangka, Ganja, Luk 5 Wilah & Naga crests)
  //    with yellow/golden lightning (listrik kuning) and zero blue/cyan glow.
  const projStops: string[] = [];
  const projStrokes: string[] = [];
  const projCtx = new Proxy({} as CanvasRenderingContext2D, {
    get: (_target, prop) => {
      if (prop === 'createLinearGradient' || prop === 'createRadialGradient') {
        return () => ({ addColorStop: (_at: number, col: string) => { projStops.push(col); } });
      }
      return () => {};
    },
    set: (_target, prop, value) => {
      if (prop === 'strokeStyle' && typeof value === 'string') projStrokes.push(value);
      return true;
    },
  });
  drawProjectile(projCtx, 'keris', 44, 0.4, 0.1, false);
  assert.ok(projStops.includes('rgba(255, 224, 110, 0.65)'), 'golden-yellow tail behind flying Keris');
  assert.ok(projStops.includes('#c98a1e') && projStops.includes('#f0cf7d'), 'Slide #4 Luk 5 Wilah blade gradient');

  projStops.length = 0;
  projStrokes.length = 0;
  drawProjectile(projCtx, 'keris', 44, 0.4, 0.1, true);
  assert.ok(projStops.includes('#1e1107') && projStops.includes('#593518'), 'stuck Keris includes full Hulu Garuda Jawa');
  assert.ok(projStops.includes('#241409') && projStops.includes('#663d1d'), 'stuck Keris includes full Warangka Ladrang');
  assert.ok(projStops.includes('#c98a1e') && projStops.includes('#f0cf7d'), 'stuck Keris includes full Luk 5 Wilah blade');
  assert.ok(projStrokes.includes('rgba(255, 208, 86, 0.92)'), 'golden-yellow electric crater on stuck Keris');
  assert.ok(projStrokes.some(s => s.startsWith('rgba(255,170,40,') || s.startsWith('rgba(255,205,80,')), 'yellow lightning jolts (listrik kuning) on stuck Keris');
  assert.ok(!projStops.includes('#4deeea') && !projStrokes.some(s => s.includes('77, 238, 234')), 'no blue/cyan glow on stuck Keris');
  assert.equal(drawMaterialTrail(projCtx, 'keris'), true, 'skips generic laser wedge trail');

  // 3. Firing & sticking in Game triggers Slide #8 launch arcs, crisp lightning bolts from muzzle to target, crawlArcs & thunderFlash
  const game = probe(2, 'keris') as Probe & {
    getKerisState(): KerisSlideState;
    stickAt(local: number, p?: Shot & { originX?: number }): void;
    items: { angle: number; type: string; w?: string; age: number }[];
    faceCtx: CanvasRenderingContext2D;
    faceR: number;
  };
  game.items = [];
  game.faceR = 106;
  game.faceCtx = projCtx;
  game.shoot();
  const keris = game.getKerisState();
  assert.equal(game.projs.length, 1);
  assert.ok(keris.particles.filter(p => p.kind === 'arc').length === 3, '3 Slide #8 muzzle lightning arcs');
  assert.ok(keris.particles.filter(p => p.kind === 'spark').length === 10, '10 Slide #8 muzzle sparks');
  assert.ok(keris.particles.some(p => p.kind === 'ring' && p.grow === 260), 'Slide #8 muzzle shock ring');

  const prevArcs = keris.particles.filter(p => p.kind === 'arc').length;
  game.stickAt(Math.PI / 2, game.projs[0] as Shot & { originX?: number });
  assert.equal(game.items.length, 1);
  assert.equal(keris.particles.filter(p => p.kind === 'arc').length, prevArcs + 7, 'main bolt + gold companion bolt + 5 radial impact arcs');
  assert.equal(keris.crawlArcs.length, 1, 'crawling surface lightning arc on wheel rim');
  assert.equal(keris.thunderFlash, 1, 'full-screen subtle cyan thunderFlash triggered');

  // 4. Target decal leaves no black bullet hole for keris
  const decalCalls: string[] = [];
  const decalCtx = new Proxy({} as CanvasRenderingContext2D, {
    get: (_target, prop) => (..._args: unknown[]) => { decalCalls.push(String(prop)); },
    set: () => true,
  });
  drawPreciseWeaponDecal(decalCtx, 106, Math.PI / 2, kerisWeapon, 'wood');
  assert.deepEqual(decalCalls, ['save', 'beginPath', 'arc', 'clip', 'restore']);

  // 5. Slide #8 background renders midnight navy gradient, cyan target halo, golden weapon ember, rotating dashed rings, and dust
  const bgStops: string[] = [];
  const bgCtx = new Proxy({} as CanvasRenderingContext2D, {
    get: (_target, prop) => {
      if (prop === 'createLinearGradient' || prop === 'createRadialGradient') {
        return () => ({ addColorStop: (_at: number, col: string) => { bgStops.push(col); } });
      }
      return () => {};
    },
    set: () => true,
  });
  const bgState = createKerisSlideState(420, 760);
  assert.equal(bgState.dust.length, 44);
  drawKerisSlideBackground(bgCtx, bgState, 210, 255, 106, 1.5, false, 420, 760);
  assert.ok(bgStops.includes('#0b1428') && bgStops.includes('#080d1c') && bgStops.includes('#05070f'), 'Slide #8 midnight gradient stops');
  drawKerisSurfaceArcs(bgCtx, keris, 106, 0, 1.5);
  drawKerisSlideParticlesAndArcs(bgCtx, keris, 420, 760);
});

test('Pistol uses Slide #7 Weapon #3 (M1911 LEGACY) design sized like Golden/Chrono Gun, and Banana flesh uses Slide #7 Weapon #6 flesh', () => {
  const pistolStops: string[] = [];
  const pistolFills: string[] = [];
  const pistolCtx = new Proxy({} as CanvasRenderingContext2D, {
    get: (_target, prop) => {
      if (prop === 'createLinearGradient' || prop === 'createRadialGradient') {
        return () => ({ addColorStop: (_at: number, col: string) => { pistolStops.push(col); } });
      }
      return () => {};
    },
    set: (_target, prop, value) => {
      if (prop === 'fillStyle' && typeof value === 'string') pistolFills.push(value);
      return true;
    },
  });
  gunState.sinceShot = 0.08;
  drawGun(pistolCtx, 'pistol', 210, 575, 0.5, 0, true);
  assert.ok(pistolStops.includes('#aebfd2') && pistolStops.includes('#4a5866'), 'Slide #7 M1911 blued-steel slide gradient');
  assert.ok(pistolStops.includes('#5b3a1e') && pistolStops.includes('#43290f'), 'Slide #7 M1911 checkered walnut grip gradient');
  assert.ok(pistolFills.includes('#7fb3ff'), 'Slide #7 M1911 .45 LEGACY ammo pips');

  const bananaStops: string[] = [];
  const bananaFills: string[] = [];
  const bananaStrokes: string[] = [];
  const bananaCtx = new Proxy({} as CanvasRenderingContext2D, {
    get: (_target, prop) => {
      if (prop === 'createLinearGradient' || prop === 'createRadialGradient') {
        return () => ({ addColorStop: (_at: number, col: string) => { bananaStops.push(col); } });
      }
      return () => {};
    },
    set: (_target, prop, value) => {
      if (prop === 'fillStyle' && typeof value === 'string') bananaFills.push(value);
      if (prop === 'strokeStyle' && typeof value === 'string') bananaStrokes.push(value);
      return true;
    },
  });
  drawProjectile(bananaCtx, 'banana', 30, 0.4, 0.2, false);
  assert.ok(bananaStops.includes('#dccf9a') && bananaStops.includes('#f7efc9') && bananaStops.includes('#fffdf2'), 'Slide #7 Weapon #6 banana flesh gradient');
  assert.ok(bananaStrokes.includes('rgba(190,166,100,0.6)'), 'Slide #7 Weapon #6 longitudinal flesh ridges');
  assert.ok(bananaFills.includes('rgba(122,92,32,0.5)') && bananaFills.includes('#8a5a1a'), 'Slide #7 Weapon #6 seed dots and brown peel nub');

  bananaStops.length = 0;
  gunState.sinceShot = 9;
  drawGun(bananaCtx, 'banana', 210, 575, 0.5, 0, true, undefined, 'original');
  assert.ok(bananaStops.includes('#f0e2ad') && bananaStops.includes('#e6d7a2'), 'Slide #7 Weapon #6 banana flesh inside the Banana Gun');
});

test('Slide #2 pentatonic sound rhythm, UI/clear/fail/start SFX, wheel 0.15->1 entrance, and STAGE CLEAR! banner work in SGA', () => {
  // 1. Pentatonic scale matches Slide #2 (`games/firework/src/game/sfx.ts`)
  assert.ok(Math.abs(noteFreq(0) - 523.25) < 1e-6);
  assert.ok(Math.abs(noteFreq(1) - 523.25 * Math.pow(2, 2 / 12)) < 1e-6);
  assert.ok(Math.abs(noteFreq(2) - 523.25 * Math.pow(2, 4 / 12)) < 1e-6);
  assert.ok(Math.abs(noteFreq(3) - 523.25 * Math.pow(2, 7 / 12)) < 1e-6);
  assert.ok(Math.abs(noteFreq(4) - 523.25 * Math.pow(2, 9 / 12)) < 1e-6);
  assert.ok(Math.abs(noteFreq(5) - 523.25 * 2) < 1e-6);

  // 2. All 12 weapons from Slide #2 and Slide #3 use the Slide #2/#3 sound system
  for (const w of ['keris', 'blackhole', 'yoyo', 'diamond', 'crystal', 'firework', 'shark', 'bamboo', 'soaker', 'rainbow', 'bazooka', 'rpg'] as const) {
    assert.ok(SLIDE23_WEAPONS.includes(w) && isSlide23Weapon(w), `${w} uses Slide #2/#3 sound system`);
  }

  // 3. Shooting and sticking with Slide #2/#3 weapons invoke slide23Sfx.shoot and slide23Sfx.hit with ascending hit index
  const calls: string[] = [];
  const origShoot = slide23Sfx.shoot.bind(slide23Sfx);
  const origHit = slide23Sfx.hit.bind(slide23Sfx);
  const origStart = slide23Sfx.start.bind(slide23Sfx);
  const origClear = slide23Sfx.clear.bind(slide23Sfx);
  const origFail = slide23Sfx.fail.bind(slide23Sfx);
  const origClick = slide23Sfx.click.bind(slide23Sfx);
  slide23Sfx.shoot = (w) => { calls.push(`shoot:${w}`); };
  slide23Sfx.hit = (w, idx) => { calls.push(`hit:${w}:${idx}`); };
  slide23Sfx.start = () => { calls.push('start'); };
  slide23Sfx.clear = (w) => { calls.push(`clear:${w}`); };
  slide23Sfx.fail = (w) => { calls.push(`fail:${w}`); };
  slide23Sfx.click = () => { calls.push('click'); };
  try {
    sfx.click();
    sfx.start();
    sfx.clear('keris');
    sfx.fail('yoyo');
    assert.deepEqual(calls, ['click', 'start', 'clear:keris', 'fail:yoyo']);

    calls.length = 0;
    const game = probe(1, 'diamond') as Probe & {
      stickAt(local: number): void;
      clearLevel(): void;
      fail(p: Shot): void;
      items: unknown[];
      stuck: number;
      combo: number;
      lastHit: number;
      time: number;
      hitFlash: number;
      flashRed: number;
      timeScale: number;
      frags: unknown[];
    };
    const noopCtx = new Proxy({} as CanvasRenderingContext2D, {
      get: () => () => ({ addColorStop: () => {} }),
      set: () => true,
    });
    Object.assign(game, {
      items: [], stuck: 0, combo: 0, lastHit: -10, time: 1, hitFlash: 0, flashRed: 0, timeScale: 1, frags: [],
      faceCtx: noopCtx, faceScale: 2,
    });
    // Slide 1's own shot sound (slide 7 plays its own when its effect is on).
    setGunEffect('diamond', 'new');
    game.shoot();
    setGunEffect('diamond', 'set7');
    game.stickAt(0.2);
    game.stickAt(0.8);
    assert.deepEqual(calls, ['shoot:diamond', 'hit:diamond:0', 'hit:diamond:1']);
  } finally {
    slide23Sfx.shoot = origShoot;
    slide23Sfx.hit = origHit;
    slide23Sfx.start = origStart;
    slide23Sfx.clear = origClear;
    slide23Sfx.fail = origFail;
    slide23Sfx.click = origClick;
  }

  // 4. Wheel entrance animation (0.15 -> 1 via dt * 9) and STAGE CLEAR! + BONUS +3 banner in Game.ts
  const gameSrc = readFileSync('src/games/gunhit/game/Game.ts', 'utf8');
  assert.ok(gameSrc.includes('this.wheelScale = 0.15;'), 'wheel starts at 0.15 scale like Slide #2');
  assert.ok(gameSrc.includes('this.wheelScale += (1 - this.wheelScale) * Math.min(1, dt * 9);'), 'wheel scales with Slide #2 damping');
  assert.ok(gameSrc.includes("c.fillText('STAGE CLEAR!', 0, 0);"), 'draws STAGE CLEAR! banner on canvas like Slide #2');
  assert.ok(gameSrc.includes("c.fillText('BONUS +3', 0, 40);"), 'draws BONUS +3 subtitle on canvas like Slide #2');
  assert.ok(gameSrc.includes('c.drawImage(this.face,'), 'keeps SGA wheel face image');
});

test('Magnet Gun uses upgraded 3D horseshoe + solenoid coil design and stuck magnet on the wheel is 2x larger', () => {
  const scales: [number, number][] = [];
  const texts: string[] = [];
  const ctx = new Proxy({} as CanvasRenderingContext2D, {
    get: (_target, prop) => {
      if (prop === 'createLinearGradient' || prop === 'createRadialGradient') {
        return () => ({ addColorStop: () => {} });
      }
      if (prop === 'scale') {
        return (sx: number, sy: number) => { scales.push([sx, sy]); };
      }
      if (prop === 'fillText') {
        return (t: string) => { texts.push(t); };
      }
      return () => {};
    },
    set: () => true,
  });

  drawGun(ctx, 'magnet', 210, 575, 0.5, 0, true);
  assert.ok(texts.includes('N') && texts.includes('S'), 'Magnet Gun draws N and S pole markings on the horseshoe crown');

  scales.length = 0;
  drawProjectile(ctx, 'magnet', 39, 0.5, 0.2, false);
  assert.ok(scales.some(([sx, sy]) => sx === 1 && sy === 1), 'flying magnet uses 1x scale');

  scales.length = 0;
  drawProjectile(ctx, 'magnet', 39, 0.5, 0.2, true);
  assert.ok(scales.some(([sx, sy]) => sx === 2 && sy === 2), 'embedded magnet stuck on the wheel is 2x larger');
});

test('Laser Beam, Freeze Ray, Ghost Gun, UFO Ray, and Rainbow Gun use upgraded reference silhouettes and animations', () => {
  const stops: string[] = [];
  const rotations: number[] = [];
  const ctx = new Proxy({} as CanvasRenderingContext2D, {
    get: (_target, prop) => {
      if (prop === 'createLinearGradient' || prop === 'createRadialGradient') {
        return () => ({ addColorStop: (_o: number, col: string) => { stops.push(col); } });
      }
      if (prop === 'rotate') {
        return (ang: number) => { rotations.push(ang); };
      }
      return () => {};
    },
    set: () => true,
  });

  drawGun(ctx, 'laser', 210, 575, 0.5, 0, true);
  assert.ok(rotations.some(r => Math.abs(r - (-0.22)) < 1e-4), 'Laser Beam uses contoured rear-flowing grip angle');
  assert.ok(stops.includes('#ff1744') && stops.includes('#ff5c7f'), 'Laser Beam renders 5-cell glowing crimson energy core');

  stops.length = 0;
  rotations.length = 0;
  drawGun(ctx, 'freeze', 210, 575, 0.5, 0, true);
  assert.ok(rotations.some(r => Math.abs(r - (-0.72)) < 1e-4), 'Freeze Ray uses ergonomic angled cryo grip');
  assert.ok(stops.includes('#00e5ff') && stops.includes('#80f5ff'), 'Freeze Ray renders glowing cyan coolant capsule and rear cryo orb');

  stops.length = 0;
  drawGun(ctx, 'ghost', 210, 575, 0.5, 0, true, undefined, 'original');
  assert.ok(stops.includes('#88f4ff') && stops.includes('rgba(140,248,255,0.92)'), 'Ghost Gun renders pearlescent bottle body and glowing cyan ghosts');

  stops.length = 0;
  drawGun(ctx, 'ufo', 210, 575, 0.5, 0, true, undefined, 'original');
  assert.ok(stops.includes('#10b981') && stops.includes('#4ade80'), 'UFO Ray renders glowing emerald dome and neon green plasma spike');

  stops.length = 0;
  rotations.length = 0;
  drawGun(ctx, 'rainbow', 210, 575, 0.5, 0, true, undefined, 'original');
  assert.ok(rotations.some(r => Math.abs(r - (-0.28)) < 1e-4), 'Rainbow Gun renders angled rainbow thumb-sight tab and star badge');
});

test('pistol, ak47, laser, freeze, ghost, golden, ufo, rainbow, and gauntlet_cannon use refined thin outlines matching keris and yoyo', () => {
  const weapons = ['pistol', 'ak47', 'laser', 'freeze', 'ghost', 'golden', 'ufo', 'rainbow', 'gauntlet_cannon'] as const;
  for (const w of weapons) {
    let curStroke = '';
    let curWidth = 1;
    const thickDarkStrokes: { stroke: string; width: number }[] = [];
    const ctx = new Proxy({} as CanvasRenderingContext2D, {
      get: (_target, prop) => {
        if (prop === 'createLinearGradient' || prop === 'createRadialGradient') {
          return () => ({ addColorStop: () => {} });
        }
        if (prop === 'stroke') {
          return () => {
            const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(curStroke);
            const isDarkHex = m
              ? parseInt(m[1], 16) < 48 && parseInt(m[2], 16) < 48 && parseInt(m[3], 16) < 58
              : false;
            if (curWidth >= 1.8 && isDarkHex) {
              thickDarkStrokes.push({ stroke: curStroke, width: curWidth });
            }
          };
        }
        return () => {};
      },
      set: (_target, prop, val) => {
        if (prop === 'strokeStyle' && typeof val === 'string') curStroke = val;
        if (prop === 'lineWidth' && typeof val === 'number') curWidth = val;
        return true;
      },
    });
    drawGun(ctx, w, 210, 575, 0.5, 0, true, 'classic');
    drawGun(ctx, w, 210, 575, 0.5, 0, true, 'new');
    assert.deepEqual(thickDarkStrokes, [], `${w} should not have thick dark contour outlines`);
  }
});

test('alien_ray and tornado are removed, and ruby, sapphire, wand, and crystal render reference-matched rare designs with thin outlines', () => {
  const weaponIds = WEAPONS.map(w => w.id as string);
  assert.ok(!weaponIds.includes('alien_ray'), 'alien_ray is removed from WEAPONS');
  assert.ok(!weaponIds.includes('tornado'), 'tornado is removed from WEAPONS');
  assert.ok(!('alien_ray' in GUN_METRICS), 'alien_ray is removed from GUN_METRICS');
  assert.ok(!('tornado' in GUN_METRICS), 'tornado is removed from GUN_METRICS');

  for (const w of ['ruby', 'sapphire', 'wand', 'crystal'] as const) {
    const stops: string[] = [];
    let curStroke = '';
    let curWidth = 1;
    const thickDarkStrokes: { stroke: string; width: number }[] = [];
    const ctx = new Proxy({} as CanvasRenderingContext2D, {
      get: (_target, prop) => {
        if (prop === 'createLinearGradient' || prop === 'createRadialGradient') {
          return () => ({
            addColorStop: (_o: number, col: string) => {
              stops.push(col);
            },
          });
        }
        if (prop === 'stroke') {
          return () => {
            const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(curStroke);
            const isDarkHex = m
              ? parseInt(m[1], 16) < 48 && parseInt(m[2], 16) < 48 && parseInt(m[3], 16) < 58
              : false;
            if (curWidth >= 1.8 && isDarkHex) {
              thickDarkStrokes.push({ stroke: curStroke, width: curWidth });
            }
          };
        }
        return () => {};
      },
      set: (_target, prop, val) => {
        if (prop === 'strokeStyle' && typeof val === 'string') curStroke = val;
        if (prop === 'lineWidth' && typeof val === 'number') curWidth = val;
        return true;
      },
    });
    drawGun(ctx, w, 210, 575, 0.4, 0, true, 'classic');
    drawProjectile(ctx, w, getWeapon(w).stick, 0.4, 1, false);
    assert.deepEqual(thickDarkStrokes, [], `${w} should use refined thin outlines`);
    assert.ok(stops.length >= 12, `${w} should render rich multi-stop gemstone/metallic gradients`);
  }
});

test('electro, blackhole, slingshot, shotgun, and soaker render reference-matched designs with thin outlines', () => {
  for (const w of ['electro', 'blackhole', 'slingshot', 'shotgun', 'soaker'] as const) {
    const stops: string[] = [];
    let curStroke = '';
    let curWidth = 1;
    const thickDarkStrokes: { stroke: string; width: number }[] = [];
    const ctx = new Proxy({} as CanvasRenderingContext2D, {
      get: (_target, prop) => {
        if (prop === 'createLinearGradient' || prop === 'createRadialGradient') {
          return () => ({
            addColorStop: (_o: number, col: string) => {
              stops.push(col);
            },
          });
        }
        if (prop === 'stroke') {
          return () => {
            const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(curStroke);
            const isDarkHex = m
              ? parseInt(m[1], 16) < 48 && parseInt(m[2], 16) < 48 && parseInt(m[3], 16) < 58
              : false;
            if (curWidth >= 1.8 && isDarkHex) {
              thickDarkStrokes.push({ stroke: curStroke, width: curWidth });
            }
          };
        }
        return () => {};
      },
      set: (_target, prop, val) => {
        if (prop === 'strokeStyle' && typeof val === 'string') curStroke = val;
        if (prop === 'lineWidth' && typeof val === 'number') curWidth = val;
        return true;
      },
    });
    // The reference designs, not the slide-7 SET 1 card (the default). The
    // black hole's reference art is its slide-2 cannon ("Terbaru" card).
    drawGun(ctx, w, 210, 575, 0.45, 0, true, undefined, w === 'blackhole' ? 'latest' : 'current');
    assert.deepEqual(thickDarkStrokes, [], `${w} should use refined thin outlines`);
    assert.ok(stops.length >= 10, `${w} should render rich multi-stop gradients matching the reference art`);
  }
});

test('removed weapons are absent and honey, railgun, and snowball render reference-matched designs with thin outlines', () => {
  const ids = WEAPONS.map(w => w.id as string);
  for (const removed of [
    'disc', 'glitch', 'portal', 'bit8', 'warp_disruptor', 'deflector_shield',
    'lone_star', 'plasma_repeater', 'sonic', 'mirror', 'chrono',
  ]) {
    assert.ok(!ids.includes(removed), `${removed} is removed from WEAPONS`);
    assert.ok(!(removed in GUN_METRICS), `${removed} is removed from GUN_METRICS`);
  }

  for (const w of ['honey', 'railgun', 'snowball', 'moonbeam', 'storm', 'nail', 'sniper', 'flamethrower', 'bubble', 'meteor'] as const) {
    const stops: string[] = [];
    let curStroke = '';
    let curWidth = 1;
    const thickDarkStrokes: { stroke: string; width: number }[] = [];
    const ctx = new Proxy({} as CanvasRenderingContext2D, {
      get: (_target, prop) => {
        if (prop === 'createLinearGradient' || prop === 'createRadialGradient') {
          return () => ({
            addColorStop: (_o: number, col: string) => {
              stops.push(col);
            },
          });
        }
        if (prop === 'stroke') {
          return () => {
            const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(curStroke);
            const isDarkHex = m
              ? parseInt(m[1], 16) < 48 && parseInt(m[2], 16) < 48 && parseInt(m[3], 16) < 58
              : false;
            if (curWidth >= 1.8 && isDarkHex) {
              thickDarkStrokes.push({ stroke: curStroke, width: curWidth });
            }
          };
        }
        return () => {};
      },
      set: (_target, prop, val) => {
        if (prop === 'strokeStyle' && typeof val === 'string') curStroke = val;
        if (prop === 'lineWidth' && typeof val === 'number') curWidth = val;
        return true;
      },
    });
    // The reference designs, not the slide-7 SET 1 card (the default). The
    // black hole's reference art is its slide-2 cannon ("Terbaru" card).
    drawGun(ctx, w, 210, 575, 0.45, 0, true, undefined, w === 'blackhole' ? 'latest' : 'current');
    assert.deepEqual(thickDarkStrokes, [], `${w} should use refined thin outlines`);
    assert.ok(stops.length >= 12, `${w} should render rich multi-stop gradients matching the reference art`);
  }
});

test('Diamond Gun keeps SGA silhouette with Slide #2 muzzle diamond formation, diamond bullet + glow, and diamond shard bursts', () => {
  // These assertions describe slide 1's own upgraded effect; slide 7 is the new default.
  setGunEffect('diamond', 'new');
  const game = probe(1, 'diamond') as Probe & {
    stickAt(local: number): void;
    diamondState?: {
      particles: unknown[];
      shards: unknown[];
      glows: unknown[];
      rings: unknown[];
      starflashes: unknown[];
    };
    items: unknown[];
    stuck: number;
    combo: number;
    lastHit: number;
    time: number;
    hitFlash: number;
  };
  const noopCtx = new Proxy({} as CanvasRenderingContext2D, {
    get: () => () => ({ addColorStop: () => {} }),
    set: () => true,
  });
  Object.assign(game, {
    items: [], stuck: 0, combo: 0, lastHit: -10, time: 1, hitFlash: 0,
    faceCtx: noopCtx, faceScale: 2,
  });
  game.shoot();
  assert.ok(game.diamondState, 'diamondState is initialized when Diamond Gun fires');
  assert.ok(game.diamondState!.particles.length >= 18, 'spawns Slide #2 diamond launch sparks');
  assert.ok(game.diamondState!.shards.length >= 4, 'spawns diamond shards on launch');
  assert.ok(game.diamondState!.starflashes.length >= 1, 'spawns Slide #2 muzzle starflash');
  assert.ok(game.diamondState!.glows.length >= 1, 'spawns Slide #2 muzzle glow');

  const shardsBefore = game.diamondState!.shards.length;
  game.stickAt(0.4);
  assert.ok(game.diamondState!.shards.length >= shardsBefore + 8, 'spawns Slide #2 diamondBurst shard debris on hit');
  assert.ok(game.diamondState!.rings.length >= 1, 'spawns Slide #2 expanding ice-blue ring on hit');
});

test('Bazooka in SGA keeps SGA gun shape with Slide #3 shell projectile, glow, muzzle sparks, warhead detonation, and battlefield dusk background', () => {
  const game = probe(1, 'bazooka') as Probe & {
    stickAt(local: number): void;
    bazookaState?: {
      particles: unknown[];
      smokes: unknown[];
      fireballs: unknown[];
      flashes: unknown[];
      debris: unknown[];
      glows: unknown[];
    };
    items: unknown[];
    stuck: number;
    combo: number;
    lastHit: number;
    time: number;
    hitFlash: number;
  };
  const noopCtx = new Proxy({} as CanvasRenderingContext2D, {
    get: () => () => ({ addColorStop: () => {} }),
    set: () => true,
  });
  Object.assign(game, {
    items: [], stuck: 0, combo: 0, lastHit: -10, time: 1, hitFlash: 0,
    faceCtx: noopCtx, faceScale: 2,
  });
  game.shoot();
  assert.ok(game.bazookaState, 'bazookaState is initialized when Bazooka fires');
  assert.ok(game.bazookaState!.particles.length >= 50, 'spawns Slide #3 forward fire cone, backblast flames, and gravity sparks');
  assert.ok(game.bazookaState!.smokes.length >= 20, 'spawns Slide #3 backblast, muzzle smoke, and ground dust');
  assert.ok(game.bazookaState!.fireballs.length >= 3, 'spawns Slide #3 muzzle fireballs');
  assert.ok(game.bazookaState!.flashes.length >= 1, 'spawns Slide #3 8-spike muzzle flash');

  const debrisBefore = game.bazookaState!.debris.length;
  game.stickAt(0.35);
  assert.ok(game.bazookaState!.debris.length >= debrisBefore + 8, 'spawns Slide #3 shrapnel shards and burning dirt clods on warhead impact');
  assert.ok(game.bazookaState!.fireballs.length >= 7, 'spawns Slide #3 layered core + satellite fireballs on warhead impact');
});


