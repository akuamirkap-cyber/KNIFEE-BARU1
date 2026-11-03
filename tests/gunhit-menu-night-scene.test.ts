import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync('src/games/gunhit/App.tsx', 'utf8');
const env = readFileSync('src/games/gunhit/components/MenuEnvironment.tsx', 'utf8');
const backdrop = readFileSync('src/games/gunhit/components/MenuBackdrop.tsx', 'utf8');
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

test('the menu keeps Gun Hit\'s own sunburst in both orientations', () => {
  // The showroom burst experiment was reverted: one SunburstFX, 430px, amber,
  // exactly as the menu always had it - landscape included.
  assert.equal(app.split('<SunburstFX size={430}').length - 1, 1, 'exactly one 430px menu burst');
  assert.match(app, /<SunburstFX size=\{430\} color=\{gunSunburstColor\(getWeapon\(weapon\)\.rarity\)\} intensity=\{0\.44\} speed=\{32\} core=\{false\} stars=\{false\}/);
  assert.doesNotMatch(app, /MenuSunburst/);
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
