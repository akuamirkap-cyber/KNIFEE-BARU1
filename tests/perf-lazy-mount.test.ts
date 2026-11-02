import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const read = (file: string) => readFileSync(path.join(process.cwd(), file), 'utf8');

/**
 * The frame that opens a page must not carry work that belongs to the frames
 * after it. These three guarantees were measured on the offline canvas audit
 * (tools/golden-perf-audit.ts) and with a 90-thumbnail draw sweep:
 *
 *   • 90 arsenal cards painted in one commit cost ~134 ms of drawing alone,
 *   • the first blackhole lens allocated a 1024² scratch surface mid-frame,
 *   • a boss wheel was requested on the reveal frame, so its SVG decode landed
 *     two frames after the head was supposed to drop in.
 */

test('arsenal paints only the cards near the viewport, the first screenful eagerly', () => {
  const arsenal = read('src/games/gunhit/components/Arsenal.tsx');
  assert.match(arsenal, /IntersectionObserver/, 'offscreen cards wait for the observer');
  assert.match(arsenal, /rootMargin: '320px 0px'/, 'one screen of margin keeps scrolling ahead of the paint');
  assert.match(arsenal, /eager=\{index < 12\}/, 'the first screenful still paints with the page');
  assert.match(arsenal, /const \[painted, setPainted\] = useState\(eager\)/, 'eager cards start painted');
  assert.match(arsenal, /const visible = painted \|\| isSelected/, 'the selected card is never blank');
  assert.match(arsenal, /if \(!cv \|\| !visible\) return;/, 'no drawing happens for a card that is not visible yet');
  assert.match(arsenal, /typeof IntersectionObserver === 'undefined'/, 'old WebViews fall back to painting everything');
});

test('the engine prewarms its first-use costs while the menu is idle', () => {
  const game = read('src/games/gunhit/game/Game.ts');
  assert.match(game, /prewarm\(\) \{/, 'Game exposes prewarm()');
  assert.match(game, /this\.s7State\?\.prewarmLens\(\)/, 'the refraction surface is allocated up front');
  assert.match(game, /for \(const size of \[16, 13, 29, 40\]\)/, 'the HUD font is shaped at every size it uses');

  const fx = read('src/games/gunhit/game/setSevenFx.ts');
  assert.match(fx, /prewarmLens\(\) \{/, 'the lens scratch surface has its own warm-up');
  assert.match(fx, /if \(this\.lensCanvas\) return;/, 'warming twice is free');

  const app = read('src/games/gunhit/App.tsx');
  assert.match(app, /requestIdleCallback/, 'the warm-up runs off the critical path');
  assert.match(app, /g\?\.prewarm\(\)/, 'App warms the engine once it exists');
});

test('a chosen stage requests its wheel art before the transition ends', () => {
  const app = read('src/games/gunhit/App.tsx');
  const start = app.indexOf('const beginStage = (');
  assert.ok(start > 0, 'beginStage is the single entry point for starting a stage');
  const body = app.slice(start, start + 4000);
  const request = body.indexOf('requestWheelArt(level)');
  const schedule = body.indexOf('deferPageClose(lead');
  assert.ok(request > 0, 'the wheel raster is requested on the tap');
  assert.ok(schedule > request, 'and before the transition is scheduled');
});
