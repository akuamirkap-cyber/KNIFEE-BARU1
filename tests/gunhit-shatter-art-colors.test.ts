import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createCanvas } from '@napi-rs/canvas';
import { artChips, readTargetPixels, wedgeInk } from '../src/games/gunhit/game/Game';

const game = readFileSync('src/games/gunhit/game/Game.ts', 'utf8');
const app = readFileSync('src/games/gunhit/App.tsx', 'utf8');
const arsenal = readFileSync('src/games/gunhit/components/Arsenal.tsx', 'utf8');

/** A disc painted with two loud colours so the sampled palette is unambiguous. */
function sampleFace() {
  const cv = createCanvas(200, 200);
  const c = cv.getContext('2d');
  c.fillStyle = '#14b8a6';
  c.fillRect(0, 0, 200, 200);
  c.fillStyle = '#d946ef';
  c.fillRect(80, 0, 40, 200);
  const pix = readTargetPixels(cv as unknown as HTMLCanvasElement);
  assert.ok(pix, 'the artwork pixels are readable');
  return pix;
}

test('shatter debris takes its colours from the target artwork', () => {
  const pix = sampleFace();
  const chips = artChips(pix);
  assert.ok(chips && chips.length >= 2, 'two dominant colours were found');
  const toRgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const hasTeal = chips!.some((h) => {
    const [r, g, b] = toRgb(h);
    return g > 120 && b > 100 && r < 120;
  });
  const hasMagenta = chips!.some((h) => {
    const [r, g, b] = toRgb(h);
    return r > 150 && b > 150 && g < 120;
  });
  assert.ok(hasTeal, `teal from the art, got ${chips!.join(' ')}`);
  assert.ok(hasMagenta, `magenta from the art, got ${chips!.join(' ')}`);
});

test('each wedge gets a wall and a bevel in its own artwork hue', () => {
  const pix = sampleFace();
  // The magenta stripe sits around 90deg in this artwork.
  const ink = wedgeInk(pix, 98, 2, 1, Math.PI / 2 - 0.35, Math.PI / 2 + 0.35);
  assert.ok(ink, 'the wedge has ink');
  const parse = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [sr, sg, sb] = parse(ink!.side);
  const [er, eg, eb] = parse(ink!.edge);
  assert.ok(sr + sg + sb < er + eg + eb, 'the wall is darker than the bevel');
  // The sampled wedge mixes the artwork's teal and magenta, so the wall is a
  // purple rather than the level palette's orange: it keeps that hue.
  assert.ok(Math.max(sr, sg, sb) - Math.min(sr, sg, sb) > 40, `wall keeps the artwork hue, got ${ink!.side}`);
  assert.ok(sr < sb, `magenta dominates this wedge, got ${ink!.side}`);
});

test('the cleared wheel and the cleared boss use their own artwork colours', () => {
  // Both stages go through the same clear path, and the face on a boss stage is
  // the boss artwork, so the debris palette is the boss's own.
  // The palette is read once per stage (in `prepareWedges`), not on the frame the
  // wheel breaks, and the clear path consumes exactly that.
  assert.match(game, /const pix = readTargetPixels\(this\.face \?\? null\);/);
  assert.match(game, /debris: pix \? artChips\(pix\) : null/);
  assert.match(game, /const debris = prepared\.debris \?\? STYLE_COLORS\[this\.level\.style\]\.chips;/);
  assert.match(game, /const wedge = pix \? wedgeInk\(pix, R, pad, this\.faceScale, a0, a1\) : null;/);
  assert.match(game, /const ink = prepared\.ink\[i\];/);
  assert.match(game, /side: ink\?\.side, edge: ink\?\.edge, depth,/);
  assert.match(game, /const cols = debris;/);
  assert.match(game, /const cc = debris;/);
  // Chunk thickness follows the artwork's own weight instead of a fixed 14px.
  assert.match(game, /const depth = Math\.max\(5, Math\.min\(12, R \* 0\.07\)\);/);
  assert.match(game, /f\.depth \?\? 14,/);
  assert.match(game, /f\.side \?\? palette\.chips\[1\],/);
  assert.match(game, /f\.edge \?\? palette\.chips\[0\],/);
});

test('the menu weapon stands on light alone: no floor ring and no circle shadow', () => {
  assert.doesNotMatch(app, /mm-pedestal/);
  assert.doesNotMatch(app, /shadow-pulse/);
  assert.doesNotMatch(app, /rounded-\[50%\] bg-black\/60 blur-sm/);
  // The sunburst keeps the same shape, ten percent brighter.
  assert.match(app, /SunburstFX size=\{430\}[^>]*intensity=\{0\.44\}/);
  assert.match(arsenal, /intensity=\{0\.44\}/);
});
