import test from 'node:test';
import assert from 'node:assert/strict';

import { installCanvasShim } from './supportCanvas';
import { installSilentAudio } from '../tools/supportAudioSilent';

/**
 * Player request: the weapon package is 20% smaller and stands 20% farther from
 * the wheel, while the board-side packages — wheel, treasure, Diamond Breaker
 * and the boss — are only 10% smaller.
 *
 * The board's radius is the single knob behind the wheel, its rim gems, the
 * boss head, the Diamond Breaker rock and everything buried in them, so these
 * checks pin that radius, the weapon's 0.864x rig, the enlarged muzzle gap and
 * the treasure chest's hit box (baked art, so it shrinks separately).
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

const ops: string[] = [];
const gradient = { addColorStop: () => undefined };
const ctx = new Proxy({ canvas: { width: 420, height: 760 } } as Record<string, unknown>, {
  get(target, prop) {
    const name = String(prop);
    if (name === 'canvas') return target.canvas;
    if (name === 'scale') return (sx: number, sy: number) => { ops.push(`scale:${sx},${sy}`); };
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

const {
  BOARD_PACKAGE_SCALE, CY, Game, GAMEPLAY_GUN_SCALE, GUN_Y, H,
} = await import('../src/games/gunhit/game/Game.ts');
const { CX } = await import('../src/games/gunhit/game/layout.ts');
const { makeLevel } = await import('../src/games/gunhit/game/levels.ts');

const events = {
  onGameOver: () => undefined, onStageChange: () => undefined, onStageCleared: () => undefined,
  onShotFired: () => undefined, onBossDefeated: () => undefined,
};

test('the weapon draws at the title screen size, the board stays 10% smaller', () => {
  assert.equal(BOARD_PACKAGE_SCALE, 0.9);
  // The menu fits a gun's ink to 0.78 of its 295 px canvas (≈230 px); the
  // roster's median gun fills that at 1.12x, so gameplay uses 1.12 instead of
  // the 0.864 the rig had shrunk to.
  assert.ok(Math.abs(GAMEPLAY_GUN_SCALE - 1.12) < 5e-3, `gun ${GAMEPLAY_GUN_SCALE}`);
});

test('wheel, Diamond Breaker rock and boss head are 10% smaller than the reference board', () => {
  assert.equal(makeLevel(1).radius, 95, 'ordinary wheel: 0.9 of 106');
  assert.equal(makeLevel(3).radius, 95);
  assert.equal(makeLevel(5).radius, 110, 'boss head: 0.9 of 122');
  assert.equal(makeLevel(5, 'boulder').radius, 110, 'a boss stage keeps its head, never the rock');
  for (const mode of ['boulder', 'bonus'] as const) {
    assert.equal(makeLevel(4, mode).radius, 149, `${mode}: 0.9 of 166`);
  }
  assert.equal(makeLevel(4, 'treasure').radius, 95);
});

test('the board is pushed back 15% from where the bigger rig left it', () => {
  const rim = CY + Math.round(106 * BOARD_PACKAGE_SCALE); // 249
  const gap = GUN_Y - rim; // 303
  // Where the wheel would sit if it had not moved: the muzzle rose with the
  // bigger rig, so the gap it left behind is 274 px.
  const crowdedGap = GUN_Y - (184 + Math.round(106 * BOARD_PACKAGE_SCALE));
  assert.ok(gap > crowdedGap, 'the board really is farther than the crowded layout');
  // The ask is 15%; the top HUD owns the strip above it, so the layout clamps
  // one notch short of it (a 15% lift would put the wheel behind the stage row).
  assert.ok(gap / crowdedGap >= 1.10, `muzzle gap grew (${gap} vs ${crowdedGap})`);
  assert.ok(gap / crowdedGap <= 1.15, 'never more than the requested 15%');
  // …and the wheel's top edge still clears the HUD strip.
  assert.ok(CY - makeLevel(1).radius > 58, 'the wheel top edge stays below the top HUD');
  // …and the taller rig still fits: muzzle + arm (185 * 1.12) stays on screen.
  assert.ok(GUN_Y + 185 * GAMEPLAY_GUN_SCALE <= H, 'the weapon never clips off the bottom');
});

test('the treasure chest shrinks with its painting and its hit box', () => {
  const game = new Game(canvas as unknown as HTMLCanvasElement, events as never) as unknown as Record<string, any>;
  try {
    game.startSpecialStage('treasure');
    game.state = 'play';
    Object.assign(game, { chest: { hit: () => undefined, draw: () => undefined, update: () => undefined, shake: 0, lid: 0 } });
    const ty = game.targetY as number;
    const halfW = Math.round(97 * BOARD_PACKAGE_SCALE); // 87
    const lift = 15 * BOARD_PACKAGE_SCALE; // 13.5
    const top = Math.round(90 * BOARD_PACKAGE_SCALE); // 81
    const bottom = Math.round(88 * BOARD_PACKAGE_SCALE); // 79
    const shootAt = (x: number, y: number) => game.stepSpecialProjectile({ x, y, vx: 0, vy: -1700 }).res;

    assert.equal(shootAt(CX + halfW - 1, ty + lift - 10), 'hit', 'a lane inside the box still lands');
    assert.equal(shootAt(CX + halfW + 3, ty + lift - 10), 'none', 'the old 97px half width is gone');
    assert.equal(shootAt(CX, ty + lift - top + 1), 'hit', 'the lid still counts');
    assert.equal(shootAt(CX, ty + lift - top - 3), 'none', 'the box does not float above the chest');
    assert.equal(shootAt(CX, ty + lift + bottom - 1), 'hit', 'the foot still counts');
    assert.equal(shootAt(CX, ty + lift + bottom + 3), 'none', 'and it stops at the chest');

    ops.length = 0;
    game.render();
    assert.ok(ops.includes(`scale:${BOARD_PACKAGE_SCALE},${BOARD_PACKAGE_SCALE}`), 'the chest paints at 0.9');
  } finally {
    game.destroy();
  }
});
