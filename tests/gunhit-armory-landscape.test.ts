import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const arsenal = readFileSync(path.join(process.cwd(), 'src/games/gunhit/components/Arsenal.tsx'), 'utf8');

test('armory in landscape: showcase LEFT, rarity tabs + catalog RIGHT', () => {
  // Two columns instead of the portrait stack: the same blocks are placed in
  // named grid areas, so DOM order (and every entrance animation) is untouched.
  assert.match(arsenal, /const \[orientation\] = useSgaOrientation\(\);/);
  assert.match(arsenal, /const landscape = isLandscape\(orientation\);/);
  assert.match(arsenal, /gridTemplateColumns: 'minmax\(0,43fr\) minmax\(0,57fr\)'/);
  assert.match(arsenal, /gridTemplateAreas: '"head head" "hero tabs" "hero panel" "plate panel" "buy panel"'/);

  // Header spans both columns; the showcase owns the left column, the tabs and
  // the catalog the right one.
  assert.match(arsenal, /'relative z-20 flex shrink-0 items-center gap-2\.5'\), 'head'\)/);
  assert.match(arsenal, /style=\{area\('hero'\)\}/);
  assert.match(arsenal, /style=\{area\('plate'\)\}/);
  assert.match(arsenal, /style=\{area\('tabs'\)\}/);
  assert.match(arsenal, /'panel'\)\}>/);
});

test('armory keeps its portrait stack and showcase when the frame is portrait', () => {
  assert.match(arsenal, /landscape \? 'mt-0 h-full min-h-0 w-full' : 'mt-1 h-\[clamp\(120px,20vh,185px\)\] shrink-0'/);
  assert.match(arsenal, /landscape \? 'mb-1 mt-0 min-h-0' : 'mt-1\.5 min-h-\[42px\] shrink-0'/);
  assert.match(arsenal, /landscape \? 'mb-1 mt-0' : 'mt-3 shrink-0'/);
  assert.match(arsenal, /landscape \? 'top-6 bottom-7' : 'top-7 bottom-8'/);
  assert.match(arsenal, /size=\{landscape \? 88 : 112\}/);
});

test('the showcase is measured in layout pixels, not in scaled frame pixels', () => {
  // The armory lives inside ScaledFrame; getBoundingClientRect() returns the
  // frame-scaled rect, so using it as the canvas CSS size made the gun spill
  // over the ARMORY header on wide windows.
  assert.match(arsenal, /const w = el\.clientWidth;\s+const h = el\.clientHeight;/);
  assert.doesNotMatch(arsenal, /const r = el\.getBoundingClientRect\(\);/);
  assert.match(arsenal, /style=\{\{ width: box\.w, height: box\.h \}\}/);
});
