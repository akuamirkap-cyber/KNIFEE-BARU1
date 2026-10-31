import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const read = (file: string) => readFileSync(path.join(process.cwd(), file), 'utf8');
const app = read('src/games/gunhit/App.tsx');
const game = read('src/games/gunhit/game/Game.ts');
const settings = read('src/games/gunhit/components/SgaSettingsPanel.tsx');
const questModal = read('src/games/gunhit/components/QuestModal.tsx');
const overlay = read('src/games/perfect-shot/components/TransitionOverlay.tsx');
const overlayCss = read('src/games/perfect-shot/index.css');

test('SGA menu wheel drops in its own layer at full reference strength, then pops a shock ring', () => {
  const showcase = app.indexOf('Weapon showcase');
  assert.notEqual(showcase, -1);
  const wheel = app.indexOf("planMotion('rays-drop', WHEEL.d, WHEEL.dur", showcase);
  const gun = app.indexOf('planStyleMotion(menuPlan.gun', showcase);
  assert.ok(wheel !== -1 && gun !== -1);
  assert.ok(wheel < gun, 'the wheel is a sibling layer, never a child of the weapon preset wrapper');
  assert.match(app.slice(showcase, wheel), /h-\[300px\] w-\[300px\]/);
  assert.match(app.slice(showcase, wheel), /rays-shock/);
  assert.match(app, /WHEEL\.d \+ WHEEL\.dur \* 0\.72/, 'the shock ring fires on the wheel pop-blast frame');
  assert.match(app, /repeating-conic-gradient\(from 0deg,rgba\(200,240,240,\.22\)/);
  // The old nested copy dimmed the rays to .13 — the reference uses .22.
  assert.doesNotMatch(app, /rgba\(200,240,240,\.13\)/);
});

test('scope transition frames the real stage target and lets the wheel drop after the lens opens', () => {
  assert.match(app, /const lens = stageConfig\.radius \+ 14/);
  // The wheel entrance is no longer burned behind the closed lens: the reveal
  // starts first and only then does the Perfect Shot drop begin.
  assert.match(app, /const hold = PLAY_SCOPE\.hold/);
  assert.match(app, /const wheelEntryDelay = hold \/ 1000/);
  assert.match(app, /startAtLevel\(level, wantsWeaponFlight, gunEntryDelay, true, wheelEntryDelay\)/);
  assert.match(app, /startSpecialStage\(specialMode, gunEntryDelay, true, wheelEntryDelay\)/);
  assert.match(game, /this\.wheelEntryDelayT = this\.synchronizedEntrance \? Math\.max\(0, wheelEntryDelay\) \* this\.pace : 0/);
  assert.match(game, /perfectShotWheelEntry\(this\.introT - this\.wheelEntryDelayT, this\.pace, this\.level\.radius\)/);
  assert.match(game, /perfectShotWheelEntry\(wheelEntryT, this\.pace, R\)/);
  assert.doesNotMatch(app, /wheelSettleMs/);
  assert.match(app, /y: \(initialGameplayWheelCenterY\(stageConfig\.boss, Boolean\(specialMode\)\) \/ H\) \* 100/);
  assert.match(app, /variant="scope" lens=\{playTransition\.lens\}/);
  // The shared overlay keeps a CSS-variable lens radius so Perfect Shot is untouched.
  assert.match(overlay, /lens\?: number/);
  assert.match(overlay, /--scl/);
  assert.match(overlayCss, /--sr: calc\(var\(--scl, 118px\) - 10px\)/);
  assert.match(overlayCss, /--sr: var\(--scl, 118px\)/);
});

test('SGA settings expose the same weapon-preset style + speed controls as the reference menu', () => {
  assert.match(settings, /animSpeeds: readonly number\[\]/);
  assert.match(settings, /animStyles: readonly \{ id: StyleId; name: string; icon: string; desc: string \}\[\]/);
  assert.match(settings, /PRESET ANIMASI SENJATA MENU/);
  assert.match(settings, /onAnimSpeed\(value\)/);
  assert.match(settings, /onAnimGunStyle\(style\.id\)/);
  assert.match(app, /animStore\.setSpeed\(speed\)/);
  assert.match(app, /animStore\.setGroup\('gun', \{ mode: 'fixed', style \}\)/);
  assert.match(app, /publishMenuPlan\(plan\)/, 'the resolved plan is shared with the right-hand game');
  assert.match(app, /animSpeeds=\{SPEEDS\}/);
  assert.match(app, /animStyles=\{STYLES\}/);
});

test('quest / achievement page plays a complete staggered enter and exit choreography', () => {
  assert.match(questModal, /import \{ ACH_IN, ACH_OUT \} from '\.\.\/\.\.\/perfect-shot\/ach\/data'/);
  assert.match(questModal, /animationName: leaving \? outName : inName/);
  assert.match(questModal, /ACH_IN\.row\(rowIndex\), 'outDown', ACH_OUT\.row\(rowIndex\)/);
  assert.match(questModal, /ACH_IN\.banner, 'acBannerOut', ACH_OUT\.banner/);
  assert.match(questModal, /ACH_IN\.panel, 'acPanelOut', ACH_OUT\.panel/);
  assert.match(questModal, /ACH_IN\.tabs/, 'the DAILY / SKILL tabs join the entrance stagger');
  assert.match(questModal, /ACH_IN\.claimAll/);
  assert.match(questModal, /ACH_IN\.day\(0\)/);
  // the menu world itself also exits like the reference before the overlay covers it.
  assert.match(app, /planMotion\('in-bg', 0, 1100, 'absolute inset-0', undefined, 'out-bg', 120, 700\)/);
  assert.match(app, /menuDeparture === 'play'\s*\? \{ className: 'absolute inset-0'/);
});
