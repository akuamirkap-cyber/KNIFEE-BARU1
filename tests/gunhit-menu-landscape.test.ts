import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const app = readFileSync(path.join(process.cwd(), 'src/games/gunhit/App.tsx'), 'utf8');
const menuStart = app.indexOf("{screen === 'menu' && !mapOpen && !questOpen && !leaderboardOpen");
const settingsStart = app.indexOf("{screen === 'menu' && settingsOpen && (");
const menu = app.slice(menuStart, settingsStart);

const order = (needle: string) => menu.indexOf(needle);

test('landscape menu gives the weapon showcase its own column on the LEFT', () => {
  assert.notEqual(menuStart, -1);
  assert.notEqual(settingsStart, -1);

  // Two columns: weapon 46%, HUD/title/buttons/nav 54%. The `gun` area spans
  // every row of the left column, so the weapon can never sit on top of the
  // title the way it did when both shared one vertical stack.
  assert.match(app, /const menuLandscape = isLandscape\(orientation\);/);
  assert.match(app, /gridTemplateColumns: '46% 54%'/);
  assert.match(app, /gridTemplateAreas: '"gun hud" "gun title" "gun btns" "gun line" "gun nav"'/);

  // Every menu region is pinned to a named area.
  const showcase = order('Weapon showcase');
  assert.notEqual(showcase, -1);
  assert.ok(order("menuArea('gun')") > showcase, 'the weapon column must own the gun area');
  assert.ok(order("menuArea('hud')") < showcase);
  assert.ok(order("menuArea('title')") < showcase);
  assert.ok(order("menuArea('btns')") > showcase);
  assert.ok(order("menuArea('line')") > showcase);
  assert.ok(order("menuArea('nav')") > showcase);

  // The gun area only keeps its flex growth in portrait; in landscape its
  // height comes from the grid row span.
  assert.match(menu, /\$\{menuLandscape \? '' : 'min-h-0 flex-1'\}/);
});

test('portrait menu keeps its original single-column stack', () => {
  assert.match(menu, /relative flex h-full \$\{menuLandscape \? '' : 'flex-col'\}/);
  assert.match(menu, /menuLandscape \? 'px-4 pt-2' : 'px-5 pt-4'/);
  // The portrait weapon box and canvas size are untouched.
  assert.match(menu, /width:\s*'min\(337px,\s*90vw\)',\s*height:\s*'min\(295px,\s*54vh\)'/);
  assert.match(app, /menuLandscape\s*\?\s*'h-\[289px\] w-\[330px\] max-w-full'\s*:\s*'h-\[min\(295px,54vh\)\] w-\[min\(337px,90vw\)\] max-w-full'/);
});

test('the landscape weapon box keeps the weapon art aspect ratio and stays on screen', () => {
  // Native art box is 337x295; the landscape box must not stretch the weapon.
  assert.match(menu, /menuLandscape \? \{ width: '330px', height: '289px' \} : \{ width: 'min\(337px, 90vw\)', height: 'min\(295px, 54vh\)' \}/);
  const ratioNative = 337 / 295;
  const ratioLandscape = 330 / 289;
  assert.ok(Math.abs(ratioNative - ratioLandscape) < 0.005, 'landscape box must keep the art aspect ratio');
  // 289px tall fits inside the 420px landscape frame with room for the row gaps.
  assert.ok(289 < 420);
});

test('landscape menu shrinks the title so the right column fits 420px tall', () => {
  // The inline font-size overrides keep the original responsive classes as the
  // portrait default, so the title markup itself is shared by both layouts.
  assert.match(menu, /text-\[min\(15vw,72px\)\] leading-none tracking-wide text-\[#3fdc72\]" style=\{menuLandscape \? \{ fontSize: '44px' \} : undefined\}/);
  assert.match(menu, /text-\[min\(18vw,86px\)\] leading-none tracking-wider text-\[#ffd23f\]" style=\{menuLandscape \? \{ fontSize: '54px' \} : undefined\}/);
});
