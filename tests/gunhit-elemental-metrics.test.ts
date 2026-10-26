import test from 'node:test';
import assert from 'node:assert/strict';
import { fitInkBoxQuarterTurn, getGunInkBox, getGunMetrics } from '../src/games/gunhit/game/art/metrics';

/**
 * The three slide-7 elemental guns are much taller and more irregular than the
 * rest of the catalog. Their menu metrics were rough guesses (span 135/165/200
 * for guns that occupy ~325-440px after the showcase rotation), so every
 * thumbnail was scaled up until the weapon was cropped. These tests pin the
 * numbers that were actually measured from drawGun().
 */

const ELEMENTAL = ['xeno', 'dora', 'pred'] as const;

test('every elemental gun has measured ink bounds', () => {
  for (const id of ELEMENTAL) {
    const box = getGunInkBox(id);
    assert.ok(box, `${id} needs ink bounds`);
    assert.ok(box!.x1 > box!.x0 && box!.y1 > box!.y0, `${id} bounds must be positive`);
  }
  // Ordinary guns keep using the cheap span/centre table.
  assert.equal(getGunInkBox('pistol'), null);
  assert.equal(getGunInkBox('ak47'), null);
});

test('span matches the silhouettes: (width + height) / sqrt(2) for a 45° showcase', () => {
  for (const id of ELEMENTAL) {
    const box = getGunInkBox(id)!;
    const side = (box.x1 - box.x0 + (box.y1 - box.y0)) / Math.SQRT2;
    const span = getGunMetrics(id).span;
    // Within 4%: a too-small span zooms the gun until it clips.
    assert.ok(
      Math.abs(span - side) / side < 0.04,
      `${id} span ${span} should match measured showcase side ${side.toFixed(1)}`,
    );
    // The old, wrong values were less than half of the truth.
    assert.ok(span > (box.y1 - box.y0) * 0.9, `${id} span must account for its full length`);
  }
});

test('pivot centre matches the measured silhouette centre', () => {
  for (const id of ELEMENTAL) {
    const box = getGunInkBox(id)!;
    const m = getGunMetrics(id);
    const cx = (box.x0 + box.x1) / 2;
    const cy = (box.y0 + box.y1) / 2;
    assert.ok(Math.abs(m.centerOffsetX - cx) <= 6, `${id} centreOffsetX ${m.centerOffsetX} vs ${cx}`);
    assert.ok(Math.abs(m.centerOffsetY - cy) <= 6, `${id} centreOffsetY ${m.centerOffsetY} vs ${cy}`);
  }
});

test('menu-strip fit keeps the whole rotated gun inside the canvas', () => {
  const strips: [number, number][] = [
    [300, 115], // weapon picker
    [152, 74], // small variant thumbnails
    [336, 240], // boss gift box
  ];
  for (const id of ELEMENTAL) {
    const box = getGunInkBox(id)!;
    for (const [w, h] of strips) {
      const fit = fitInkBoxQuarterTurn(box, w, h, 8);
      const pts = [
        [box.x0, box.y0],
        [box.x1, box.y0],
        [box.x1, box.y1],
        [box.x0, box.y1],
      ];
      for (const [x, y] of pts) {
        // rotate(90°) then translate, exactly like the picker does
        const sx = fit.tx - y * fit.scale;
        const sy = fit.ty + x * fit.scale;
        assert.ok(sx >= -0.5 && sx <= w + 0.5, `${id} @${w}×${h}: x ${sx.toFixed(1)} outside 0..${w}`);
        assert.ok(sy >= -0.5 && sy <= h + 0.5, `${id} @${w}×${h}: y ${sy.toFixed(1)} outside 0..${h}`);
      }
    }
  }
});
