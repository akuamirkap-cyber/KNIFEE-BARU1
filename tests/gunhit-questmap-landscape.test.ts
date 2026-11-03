import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const map = readFileSync('src/games/perfect-shot/components/QuestMap.tsx', 'utf8');
const app = readFileSync('src/games/gunhit/App.tsx', 'utf8');

/* Same constants QuestMap uses. */
const HOR = -2.2;
const BOT = 0.92;
const K = 0.08;
const FOCUS_D = 1.1;
const travel = (s: number) => HOR + (BOT - HOR) * s;
const T_FOCUS = travel(1 / (1 + K * FOCUS_D));
const alongX = (s: number, W: number) => W * 0.42 + (T_FOCUS - travel(s)) * W * 1.15;
const sOf = (d: number) => 1 / (1 + K * d);

test('the map takes a travel axis and defaults to the portrait one', () => {
  assert.match(map, /axis\?: "y" \| "x";/);
  assert.match(map, /axis = "y" \}: Props\) \{\s+const onX = axis === "x";/);
  // The host game asks for the horizontal map exactly when the frame is landscape.
  assert.match(app, /axis=\{menuLandscape \? 'x' : 'y'\}/);
});

test('landscape turns depth into screen x, portrait keeps screen y', () => {
  assert.match(map, /const along = \(s: number\) => \(onX \? W \* 0\.42 \+ \(T_FOCUS - travel\(s\)\) \* W \* 1\.15 : H \* travel\(s\)\);/);
  assert.match(map, /const lateral = \(xw: number, s: number\) => \(onX \? H \* 0\.62 \+ xw \* s \* H \* 0\.30 : W \/ 2 \+ xw \* s \* W \* 0\.37\);/);
  assert.match(map, /const at = \(lat: number, ax: number\) => \(onX \? \{ x: ax, y: lat \} : \{ x: lat, y: ax \}\);/);
  // Pillars are drawn smaller in landscape: the frame is only 420px tall.
  assert.match(map, /const PILLAR_K = onX \? 0\.72 : 1;/);
});

test('landscape runs the stages to the RIGHT, at a comfortable gap', () => {
  const W = 760; // landscape frame width
  const cam = 30;
  const xs = [1, 2, 3, 4, 5].map((n) => alongX(sOf(n - 1 - cam), W));
  for (let i = 1; i < xs.length; i++) {
    assert.ok(xs[i] > xs[i - 1], `stage ${i + 1} must sit right of stage ${i}`);
    // Perspective compresses the far ones; the nearest gap is the widest.
    const gap = xs[i] - xs[i - 1];
    assert.ok(gap > 90 && gap < 320, `stage gap ${Math.round(gap)}px must stay readable`);
  }
  // The current stage lands near the middle of the frame, not off screen.
  const cur = alongX(sOf(FOCUS_D), W);
  assert.ok(Math.abs(cur - W * 0.42) < 1, `current stage at ${Math.round(cur)}px`);
});

test('the portrait corridor is untouched', () => {
  const H = 820;
  // Same formula as the original `proj`: y = H * (HOR + (BOT-HOR)*s).
  assert.equal(H * travel(sOf(3)), H * (HOR + (BOT - HOR) * sOf(3)));
  assert.match(map, /const travel = \(s: number\) => HOR \+ \(BOT - HOR\) \* s;/);
  // Dragging stays vertical in portrait, horizontal in landscape.
  assert.match(map, /const grab = \(e: \{ clientX: number; clientY: number \}\) => \(onX \? -e\.clientX : e\.clientY\);/);
  assert.match(map, /const unit = \(onX \? size\.w : size\.h\) \* 0\.17;/);
});
