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

test('the weapon is 20% smaller, the board only 10%', () => {
  assert.equal(BOARD_PACKAGE_SCALE, 0.9);
  assert.equal(GAMEPLAY_GUN_SCALE, 1.08 * 0.8);
  assert.ok(Math.abs(GAMEPLAY_GUN_SCALE - 0.864) < 1e-9);
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

test('the weapon stands 20% farther from the board than before the shrink', () => {
  const previousMuzzle = H - Math.round(185 * 1.08); // 560
  const previousGap = previousMuzzle - (CY + 106); // 270
  const rim = CY + Math.round(106 * BOARD_PACKAGE_SCALE); // 279
  const gap = GUN_Y - rim;
  // 1.19x, not 1.20x: the last 3px of the larger gap would push the grip off the
  // bottom edge, so the screen wins by a rounding.
  assert.ok(gap / previousGap >= 1.18, `muzzle gap is ~1.2x (${gap} vs ${previousGap})`);
  assert.ok(gap / previousGap <= 1.2, 'never more than the requested fifth');
  // …and the shorter rig still fits: muzzle + arm (185 * 0.864) stays on screen.
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
