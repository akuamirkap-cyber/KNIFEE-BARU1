import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync('src/games/gunhit/App.tsx', 'utf8');
const env = readFileSync('src/games/gunhit/components/MenuEnvironment.tsx', 'utf8');
const backdrop = readFileSync('src/games/gunhit/components/MenuBackdrop.tsx', 'utf8');
const burst = readFileSync('src/games/gunhit/components/MenuSunburst.tsx', 'utf8');
const css = readFileSync('src/index.css', 'utf8');

test('landscape menu paints the vivid night grade, portrait keeps the raw theme', () => {
  assert.match(app, /<MenuEnvironment theme=\{menuTheme\} vivid=\{menuLandscape\} \/>/);
  // Only the default forest world is regraded; a background picked in SETTING
  // still renders exactly as Game B draws it.
  assert.match(backdrop, /export const vividFor = \(theme: SgaBackgroundTheme\) => theme === "auto" \|\| theme === "forest";/);
  assert.match(env, /const night = vivid && vividFor\(theme\);/);
  assert.match(env, /<MenuBackdrop theme=\{theme\} vivid=\{night\} \/>/);
});

test('the night grade is a blue sky with blue hills and gold particles', () => {
  assert.match(backdrop, /export function vividBackdropTheme\(t: Theme\): Theme \{/);
  assert.match(backdrop, /sky: \["#0f3963", "#21689f", "#071c36"\]/);
  assert.match(backdrop, /glow: "#6cc4ff"/);
  assert.match(backdrop, /far: \{ \.\.\.t\.far, color: "#2f74a6" \}/);
  assert.match(backdrop, /near: \{ \.\.\.t\.near, color: "#16456c" \}/);
  assert.match(backdrop, /pc: "#ffd76a"/);
  // The selected theme's silhouette kind and particles survive the regrade.
  assert.match(backdrop, /\.\.\.t,/);
});

test('the showroom burst is crisp white-blue rays, not the narrow gameplay ring', () => {
  assert.ok(/rgba\(\$\{tint\},\.30\) 0deg 2\.8deg/.test(burst), 'solid ray wedges');
  // The mask lets the fan reach most of the frame instead of 2%-18% of the box.
  assert.match(burst, /radial-gradient\(circle, rgba\(0,0,0,0\) 3%, #000 15%, #000 36%, rgba\(0,0,0,\.45\) 50%, transparent 64%\)/);
  // Two counter-rotating fans plus a hot core.
  assert.match(burst, /animationDuration: `\$\{spin \* 3\}s`, animationDirection: "reverse"/);
  assert.match(burst, /className="sunburst-hot"/);
  // The gameplay burst stays untouched for portrait and for the effects system.
  assert.match(app, /<SunburstFX size=\{430\} color=\{gunSunburstColor\(getWeapon\(weapon\)\.rarity\)\} intensity=\{0\.44\} speed=\{32\} core=\{false\} stars=\{false\}/);
});

test('gold sparkles and the warm corner light belong to the night grade only', () => {
  assert.match(css, /\.mm-spark \{/);
  assert.match(css, /@keyframes mmSpark \{/);
  assert.match(css, /clip-path: polygon\(50% 0%, 61% 39%, 100% 50%, 61% 61%, 50% 100%, 39% 61%, 0% 50%, 39% 39%\);/);
  assert.match(env, /className="mm-spark absolute"/);
  assert.match(env, /rgba\(255,166,48,\.32\)/);
});

test('the landscape framing is lighter so the sky is not washed out', () => {
  assert.match(app, /rgba\(3,7,10,\.16\)/);
  assert.match(app, /rgba\(3,7,10,\.42\)/);
  assert.match(app, /<Dust count=\{menuLandscape \? 20 : 14\} \/>/);
  assert.match(app, /<SparkleField count=\{menuLandscape \? 16 : 10\} spread=\{1\.45\} \/>/);
});
