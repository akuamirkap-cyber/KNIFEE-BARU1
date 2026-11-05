/**
 * The pistol-family rounds, measured on a real canvas.
 *
 * Reported: the pistol's bullet looked too big. It was: the sprite is authored
 * ±5 px wide (13 px with the base rim) while the shot it actually collides with
 * is `weapon.half` = 4.75 — a 9.5 px hitbox. The round was therefore drawn 1.35x
 * wider than the thing it hits, and as wide as a rifle round.
 *
 * These tests rasterise the artwork the game draws and compare its real painted
 * width with the hitbox, so a future edit cannot quietly fatten it again.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createCanvas } from '@napi-rs/canvas';
import { drawProjectile } from '../src/games/gunhit/game/art/projectiles';
import { getWeapon, type WeaponId } from '../src/games/gunhit/game/weapons';

const EMBED = 21; // Game.ts: how much of a round sits inside the wheel
const S = 8; // supersample, so a 1 px edge is measured fairly
const BOX = 260;

type Measured = { w: number; h: number };

function measure(kind: WeaponId, len: number): Measured {
  const cv = createCanvas(BOX * S, BOX * S);
  const c = cv.getContext('2d') as unknown as CanvasRenderingContext2D;
  c.scale(S, S);
  c.translate(BOX / 2, BOX / 2 - len / 2); // tip at y=0, base at y=len
  drawProjectile(c, kind, len, 1.7, 99, false);
  const data = c.getImageData(0, 0, BOX * S, BOX * S).data;
  let minX = BOX * S, maxX = -1, minY = BOX * S, maxY = -1;
  for (let y = 0; y < BOX * S; y++) {
    for (let x = 0; x < BOX * S; x++) {
      if (data[(y * BOX * S + x) * 4 + 3] > 8) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  assert.ok(maxX >= 0, `${kind} painted something`);
  return { w: (maxX - minX + 1) / S, h: (maxY - minY + 1) / S };
}

const roundLen = (id: WeaponId) => getWeapon(id).stick + EMBED;
const ROUND_GUNS: WeaponId[] = ['pistol', 'golden', 'ak47'];

test('a pistol-family round is no wider than the shot it collides with', () => {
  for (const id of ROUND_GUNS) {
    const hitWidth = getWeapon(id).half * 2; // 9.5 px
    const { w } = measure(id, roundLen(id));
    assert.ok(w <= hitWidth * 1.15, `${id} round is ${w.toFixed(1)} px wide, hitbox is ${hitWidth.toFixed(1)}`);
    assert.ok(w >= 8, `${id} round stays a visible bullet (${w.toFixed(1)} px)`);
  }
});

test('the three pistol-family rounds share one width', () => {
  const widths = ROUND_GUNS.map((id) => measure(id, roundLen(id)).w);
  const spread = Math.max(...widths) - Math.min(...widths);
  assert.ok(spread <= 0.6, `width spread ${spread.toFixed(2)} px across ${widths.map((w) => w.toFixed(1)).join('/')} px`);
});

test('the trim is lateral only: the round keeps its length', () => {
  const { h } = measure('pistol', roundLen('pistol'));
  assert.ok(Math.abs(h - roundLen('pistol')) <= 2.5, `pistol round is ${h.toFixed(1)} px long, expected ~${roundLen('pistol')}`);
});
