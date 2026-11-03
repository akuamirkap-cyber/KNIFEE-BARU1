import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import {
  CX,
  CY,
  GUN_Y,
  H,
  LAND_H,
  LAND_W,
  W,
  displaySize,
  displayToWorld,
  worldTransform,
} from '../src/games/gunhit/game/layout';

/** Apply a setTransform matrix to a world point, the way the canvas does. */
function apply(
  m: [number, number, number, number, number, number],
  x: number,
  y: number,
): { x: number; y: number } {
  const [a, b, c, d, e, f] = m;
  return { x: a * x + c * y + e, y: b * x + d * y + f };
}

test('portrait keeps the original world and display rectangles', () => {
  assert.deepEqual(displaySize('portrait'), { w: W, h: H });
  const k = 2;
  assert.deepEqual(worldTransform('portrait', k), [k, 0, 0, k, 0, 0]);
  // Identity: a world point maps to itself (scaled by k).
  assert.deepEqual(apply(worldTransform('portrait', 1), 100, 200), { x: 100, y: 200 });
});

test('landscape swaps the display rectangle', () => {
  assert.deepEqual(displaySize('landscape'), { w: LAND_W, h: LAND_H });
  assert.equal(LAND_W, H);
  assert.equal(LAND_H, W);
  assert.ok(LAND_W > LAND_H, 'landscape must be wider than it is tall');
});

test('landscape puts the gun on the LEFT, firing toward the RIGHT', () => {
  const m = worldTransform('landscape', 1);

  // The gun sits at the bottom-centre of the portrait world.
  const gun = apply(m, CX, GUN_Y);
  assert.ok(
    gun.x < LAND_W * 0.35,
    `gun should be near the left edge, got x=${gun.x} of ${LAND_W}`,
  );
  assert.ok(
    Math.abs(gun.y - LAND_H / 2) < 1,
    `gun should be vertically centred, got y=${gun.y} of ${LAND_H}`,
  );

  // The muzzle points "up" in the world; on screen that must become "right".
  const muzzle = apply(m, CX, GUN_Y - 100);
  assert.ok(
    muzzle.x > gun.x,
    `the muzzle must be to the RIGHT of the gun body (gun.x=${gun.x}, muzzle.x=${muzzle.x})`,
  );
  assert.ok(Math.abs(muzzle.y - gun.y) < 1, 'the muzzle must stay on the same row');
});

test('landscape puts the wheel/target on the RIGHT', () => {
  const m = worldTransform('landscape', 1);
  const wheel = apply(m, CX, CY);
  assert.ok(
    wheel.x > LAND_W * 0.6,
    `wheel should be near the right edge, got x=${wheel.x} of ${LAND_W}`,
  );
  assert.ok(Math.abs(wheel.y - LAND_H / 2) < 1, 'wheel should be vertically centred');

  // The gun and the wheel must be on the same row, gun left / wheel right.
  const gun = apply(m, CX, GUN_Y);
  assert.ok(gun.x < wheel.x, 'gun must be left of the wheel');
});

test('landscape makes the world top edge the screen RIGHT edge', () => {
  const m = worldTransform('landscape', 1);
  // Anything spawning just above the world's top edge (y < 0) therefore enters
  // from the right of the screen, which is where the enemies belong.
  const above = apply(m, CX, -40);
  assert.ok(above.x > LAND_W, `spawn above the world should be off the RIGHT, got x=${above.x}`);
  const below = apply(m, CX, H + 40);
  assert.ok(below.x < 0, `spawn below the world should be off the LEFT, got x=${below.x}`);
});

test('displayToWorld inverts worldTransform for every corner', () => {
  for (const orientation of ['portrait', 'landscape'] as const) {
    const m = worldTransform(orientation, 1);
    for (const [x, y] of [
      [0, 0],
      [W, 0],
      [0, H],
      [W, H],
      [CX, CY],
      [CX, GUN_Y],
    ]) {
      const p = apply(m, x, y);
      const { w, h } = displaySize(orientation);
      // Normalise the display point back into 0..1, then invert.
      const back = displayToWorld(orientation, p.x / w, p.y / h);
      assert.ok(
        Math.abs(back.x - x) < 1e-6 && Math.abs(back.y - y) < 1e-6,
        `${orientation}: (${x},${y}) round-tripped to (${back.x},${back.y})`,
      );
    }
  }
});

test('the engine and the shell both read the display size, not the world size', () => {
  const game = readFileSync(path.join(process.cwd(), 'src/games/gunhit/game/Game.ts'), 'utf8');
  // Canvas backing store and CSS size must follow the display rectangle.
  assert.ok(game.includes('const { w, h } = displaySize(this.orientation);'));
  assert.ok(game.includes('this.canvas.style.width = `${w}px`;'));
  // The world is drawn through the orientation transform.
  assert.ok(game.includes('worldTransform(this.orientation, k)'));
  // Input has to be mapped back through the same transform.
  assert.ok(game.includes('displayToWorld(this.orientation, nx, ny)'));
  // The HUD is laid out against the display rectangle.
  assert.ok(game.includes('const { w: DW, h: DH } = displaySize(this.orientation);'));
});
