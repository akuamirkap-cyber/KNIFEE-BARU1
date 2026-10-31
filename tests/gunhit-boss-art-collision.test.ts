import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createCanvas } from '@napi-rs/canvas';
import { buildArtMask } from '../src/games/gunhit/game/Game';

const game = readFileSync('src/games/gunhit/game/Game.ts', 'utf8');

// The mask is built through a scratch canvas, exactly like the browser does.
const globals = globalThis as unknown as Record<string, unknown>;
globals.HTMLCanvasElement ??= createCanvas(2, 2).constructor;
globals.document ??= {
  createElement: (tag: string) => (tag === 'canvas' ? createCanvas(64, 64) : { style: {} }),
};

/** A "boss": a filled blob in the middle of an otherwise transparent square. */
function bossArt() {
  const cv = createCanvas(200, 200);
  const c = cv.getContext('2d');
  c.clearRect(0, 0, 200, 200);
  c.fillStyle = '#38bdf8';
  c.beginPath();
  c.arc(100, 100, 52, 0, Math.PI * 2);
  c.fill();
  // one horn sticking up-right, so the silhouette is not a circle
  c.beginPath();
  c.moveTo(120, 70);
  c.lineTo(190, 10);
  c.lineTo(150, 96);
  c.closePath();
  c.fill();
  return cv;
}

test('the boss mask is the artwork alpha, not a filled disc', () => {
  const mask = buildArtMask(bossArt() as unknown as HTMLImageElement, 240);
  assert.ok(mask, 'a mask is built from the drawn artwork');
  const at = (x: number, y: number) => mask!.alpha[y * mask!.size + x];
  // centre of the blob is ink
  assert.ok(at(120, 120) > 20, 'the body is solid');
  // a corner of the square is empty space: no collision there
  assert.equal(at(6, 6), 0, 'the corner stays empty');
  // the horn is ink where the circle would not be
  const hornX = Math.round((185 / 200) * 240);
  const hornY = Math.round((16 / 200) * 240);
  assert.ok(at(hornX, hornY) > 20, 'the horn counts as boss surface');
  assert.equal(buildArtMask(null), null);
});

test('every bullet tests the boss pixels before anything else', () => {
  // The mask is built from the same art that is drawn on screen.
  assert.match(game, /this\.artMask = this\.level\.boss \? buildArtMask\(this\.wheelImage\) : null;/);
  // StepProj runs the pixel test and returns the exact surface radius.
  assert.match(game, /if \(this\.artMask\) \{/);
  assert.match(game, /const surface = \(head \? this\.artSurfaceAt\(head\.x, head\.y\) : null\) \?\? this\.artSurfaceAt\(p\.x, p\.y\);/);
  assert.match(game, /if \(surface !== null\) return \{ res: 'stick', local, r: surface \};/);
  // No circular fallback is left on a boss stage that has artwork.
  assert.match(game, /if \(!this\.artMask && reach <= R\) return \{ res: 'stick', local \};/);
  // The broad phase reaches the furthest ink so horns stay hittable.
  assert.match(game, /const phaseR = this\.artMask \? this\.level\.radius \* this\.artMaskMaxR : effectiveR;/);
  // The surface test rotates into the target's own frame and reads alpha.
  assert.match(game, /const cos = Math\.cos\(-this\.rot\);/);
  assert.match(game, /return maskSolid\(mask, u, v\) \? dist : null;/);
  // The idle float/sway/breath of the boss is undone before the pixel test.
  assert.match(game, /const wob = Math\.sin\(bt \* 0\.66 \+ 1\.0\) \* 0\.085;/);
  assert.match(game, /lx = \(ox \* cw - oy \* sw\) \/ breath;/);
});

test('a stuck round keeps the exact spot it bit into the artwork', () => {
  assert.match(game, /\/\*\* Exact radius \(px\) the round bit into the target artwork\. \*\/ r\?: number;/);
  assert.match(game, /r: surfaceR,/);
  assert.match(game, /this\.stickAt\(r\.local \?\? norm\(Math\.PI \/ 2 - this\.rot\), p, r\.r\);/);
  assert.match(game, /const itemR = it\.r \?\? this\.bossRadiusAt\(it\.angle, R\);/);
  assert.match(game, /const itemR = it\.r \?\? \(bType \? this\.bossRadiusAt\(it\.angle\) : this\.level\.radius\);/);
});
