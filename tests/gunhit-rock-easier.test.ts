import test from 'node:test';
import assert from 'node:assert/strict';

import { installCanvasShim } from './supportCanvas';
import { installSilentAudio } from '../tools/supportAudioSilent';

/**
 * Requested: the Diamond Breaker stone ("harta karun" bonus stage too) has to
 * break faster — "one shot, two chunks fall".
 *
 * One hit used to be worth a single chunk for most guns: the struck cell took
 * the damage and the 43/32px splash ring shaved two points off its neighbours,
 * which every 3hp chunk survived. Now a direct hit always shatters its own
 * chunk and the ring takes the neighbours with it.
 */
installCanvasShim();
installSilentAudio();

const g = globalThis as unknown as Record<string, unknown> & { window: Record<string, unknown> };
g.window = Object.assign(g.window ?? {}, {
  setTimeout, clearTimeout,
  setInterval: () => 0, clearInterval: () => undefined,
  addEventListener: () => undefined, removeEventListener: () => undefined,
  devicePixelRatio: 1, innerWidth: 420, innerHeight: 760,
  requestAnimationFrame: () => 0, cancelAnimationFrame: () => undefined,
});

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
const events = {
  onGameOver: () => undefined, onStageChange: () => undefined, onStageCleared: () => undefined,
  onShotFired: () => undefined, onBossDefeated: () => undefined,
};

/** Deterministic rocks: the cell hp and types are rolled in `generate()`. */
function seeded<T>(seed: number, run: () => T): T {
  const real = Math.random;
  let s = seed * 9301 + 49297;
  Math.random = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  try { return run(); } finally { Math.random = real; }
}

/** Fire one shot at the stone and report how many chunks it took with it. */
function shotOnRock(mode: 'boulder' | 'bonus', weapon: string) {
  const game = new Game(canvas as unknown as HTMLCanvasElement, events as never) as unknown as Record<string, any>;
  try {
    game.startSpecialStage(mode);
    game.setWeapon(weapon);
    game.state = 'play';
    game.level.base = 0;
    game.rot = 0;
    // Let the wheel finish its entrance so the first shell is a real shot.
    for (let i = 0; i < 40; i++) { game.state = 'play'; game.update(1 / 60); }
    const rock = game.rock;
    assert.ok(rock, `${mode}: the stage really has a rock`);
    const before = rock.remaining;
    // Three shells on three different lanes: the same lane twice would drill a
    // hole through to the gem, and the third shot would hit the diamond.
    for (let i = 0; i < 3; i++) {
      const spin = i * 0.42;
      game.cooldown = 0; game.reloadT = 0; game.ammoLeft = 30;
      game.level.base = 0; game.rot = spin;
      game.state = 'play';
      game.shoot();
      for (let f = 0; f < 40 && game.projs.length; f++) {
        game.level.base = 0; game.rot = spin;
        game.state = 'play';
        game.update(1 / 60);
      }
    }
    return { taken: before - (game.rock ? game.rock.remaining : 0), shots: 3, before };
  } finally {
    game.destroy();
  }
}

test('one shot takes two chunks off the stone, lane after lane', async () => {
  // The game's shots climb the same lane, so probe fresh stone at the radii a
  // shot really crosses and count what falls: the struck chunk plus the ring.
  const { DiamondRock } = await import('../src/games/gunhit/game/art/diamondRock.ts');
  const { getWeapon } = await import('../src/games/gunhit/game/weapons.ts');
  const pistol = getWeapon('pistol');
  // The numbers the game hands the rock for an ordinary pistol shot: its own
  // damage, the 40px ring, and that same damage again inside the ring.
  const dmg = Math.round(4 + (pistol.points - 1) * 2);
  for (const seed of [3, 11, 29, 47]) {
    seeded(seed, () => {
      for (const r of [120, 150, 180]) {
        const rock = new DiamondRock() as unknown as { hitAt: Function };
        const hit = rock.hitAt({ x: 0, y: r }, dmg, 40, 6, dmg) as { kind: string; broken: unknown[] };
        assert.ok(hit, `seed ${seed} r${r}: the shot lands on stone`);
        assert.ok(hit.broken.length >= 2,
          `seed ${seed} r${r}: one shot takes ${hit.broken.length} chunk(s), wanted 2+`);
      }
    });
  }
});

test('three shells on three lanes clear more chunks than shells in a real stage', async () => {
  // A smoke test on the real board, one shell per lane (the same lane twice
  // would drill through to the gem and the third shot would hit the diamond).
  for (const mode of ['boulder', 'bonus'] as const) {
    for (const weapon of ['pistol', 'ak47', 'nail', 'sniper'] as const) {
      for (const seed of [3, 11, 29]) {
        const { taken } = seeded(seed, () => shotOnRock(mode, weapon));
        // A loose smoke test on the real board: the exact count depends on where
        // the lane meets the jagged rim (and a shell that drifts into the gem
        // takes nothing), but three shells must never be worth three chunks.
        assert.ok(taken > 3, `${mode}/${weapon} seed ${seed}: ${taken} chunks in 3 shots (wanted more than 3)`);
      }
    }
  }
});

test('a direct hit shatters the chunk it lands on, hard 6hp reef included', async () => {
  const { DiamondRock } = await import('../src/games/gunhit/game/art/diamondRock.ts');
  for (const seed of [5, 17, 41]) {
    seeded(seed, () => {
      const rock = new DiamondRock() as unknown as { cells: any[]; hitAt: Function };
      const hard = rock.cells.find(c => c.type === 'hard');
      assert.ok(hard, 'this rock has a hard reef');
      const hit = rock.hitAt(hard.center, 6, 38, 6, 3) as { broken: { id: number }[] };
      assert.ok(hit.broken.some(c => c.id === hard.id),
        `seed ${seed}: the reef it lands on falls in one shot (it has ${hard.maxHp}hp)`);
    });
  }
});

test('the splash ring does not eat the hard reef — that still needs the shot', async () => {
  const { DiamondRock } = await import('../src/games/gunhit/game/art/diamondRock.ts');
  seeded(7, () => {
    const rock = new DiamondRock() as unknown as { cells: any[]; hitAt: Function };
    const hard = rock.cells.find(c => c.type === 'hard' && c.hp >= 6);
    assert.ok(hard, 'this rock has a hard reef');
    // Land the shot on a neighbour: the 3-point ring must not finish 6hp stone.
    const neighbour = rock.cells.find(c => c !== hard && c.alive
      && Math.hypot(c.center.x - hard.center.x, c.center.y - hard.center.y) < 30);
    assert.ok(neighbour, 'the reef has a neighbour close enough to splash');
    rock.hitAt(neighbour.center, 6, 38, 6, 3);
    assert.ok(hard.alive, 'the hard reef survives a splash');
    assert.ok(hard.hp < hard.maxHp, 'but it does take the hit');
  });
});
