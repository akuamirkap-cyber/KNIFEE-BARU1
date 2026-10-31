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

test('SGA menu keeps its own Gun Hit sunburst behind the weapon, not the reference conic ray disc', () => {
  const showcase = app.indexOf('Weapon showcase');
  assert.notEqual(showcase, -1);
  const showcaseSlice = app.slice(showcase, showcase + 2600);
  // The reference menu's ray wheel (conic disc, drop layer, shock ring) is gone.
  assert.doesNotMatch(showcaseSlice, /rays-drop/);
  assert.doesNotMatch(showcaseSlice, /rays-shock/);
  assert.doesNotMatch(app, /repeating-conic-gradient\(from 0deg,rgba\(200,240,240,\.22\)/);
  // Game A's own sunburst is back at full strength behind the weapon canvas.
  assert.match(app, /SunburstFX size=\{430\}/, 'the menu shows Gun Hit\'s own 430px sunburst');
  assert.match(app, /SunburstFX size=\{430\}[^>]*intensity=\{0\.34\}/);
  assert.match(app, /SunburstFX size=\{430\}[^>]*speed=\{32\}/);
  assert.match(app, /SunburstFX size=\{430\}[^>]*core=\{false\}/);
  assert.match(app, /SunburstFX size=\{430\}[^>]*stars=\{false\}/);
  // It still rides the weapon pivot, so it hugs the gun instead of the frame.
  assert.match(app, /--weapon-pivot-x/);
});

test('scope transition frames the real stage target and lets the wheel drop after the lens opens', () => {
  assert.match(app, /const lens = stageConfig\.radius \+ 14/);
  // The wheel entrance is no longer burned behind the closed lens: the reveal
  // starts first and only then does the Perfect Shot drop begin.
  assert.match(app, /const hold = PLAY_SCOPE\.hold/);
  assert.match(app, /const wheelEntryDelay = hold \/ 1000/);
  assert.match(app, /startAtLevel\(level, wantsWeaponFlight, gunEntryDelay, true, wheelEntryDelay, gunHiddenFor\)/);
  assert.match(app, /startSpecialStage\(specialMode, gunEntryDelay, true, wheelEntryDelay, gunHiddenFor, wantsWeaponFlight\)/);
  assert.match(game, /this\.wheelEntryDelayT = this\.synchronizedEntrance \? Math\.max\(0, wheelEntryDelay\) \* this\.pace : 0/);
  assert.match(game, /perfectShotWheelEntry\(\s*this\.wheelEntryT - this\.wheelEntryDelayT,\s*this\.pace,\s*this\.level\.radius,?\s*\)/);
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
