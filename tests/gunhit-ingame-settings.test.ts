import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { getMasterVolume, masterLevel, setMasterVolume, setMuted } from '../src/games/gunhit/game/audio';

test('gameplay screen renders an in-game Settings button that pauses play and offers Menu, Sound Volume, and Speed controls', () => {
  const app = readFileSync('src/games/gunhit/App.tsx', 'utf8');

  // 1. In-game settings button on gameplay HUD with click/pointer propagation stopped so tapping never fires a shot
  assert.match(app, /aria-label="Pengaturan permainan"/);
  assert.match(app, /setInGameSettingsOpen\(true\)/);

  // 2. Opening inGameSettingsOpen pauses the active gameplay RAF simulation cleanly
  assert.match(
    app,
    /const gameplayModalOpen = inGameSettingsOpen \|\| arsenalOpen \|\| questOpen \|\| leaderboardOpen/,
  );

  // 3. In-game settings dialog offers Back to Main Menu, Resume, Sound Volume slider/presets, and Game Speed buttons
  const modalStart = app.indexOf("{screen === 'playing' && inGameSettingsOpen && (");
  const modalEnd = app.indexOf("{screen === 'menu' && arsenalOpen && (", modalStart);
  assert.notEqual(modalStart, -1, 'in-game settings modal exists');
  assert.notEqual(modalEnd, -1, 'in-game settings modal ends before arsenal modal');
  const modalSlice = app.slice(modalStart, modalEnd);
  assert.match(modalSlice, /PERMAINAN DIJEDA/);
  assert.match(modalSlice, /Volume suara saat bermain/);
  assert.match(modalSlice, /KECEPATAN GAME/);
  assert.match(modalSlice, /SGA_SPEED_OPTIONS\.map/);
  assert.match(modalSlice, /LANJUTKAN MAIN/);
  assert.match(modalSlice, /KE MENU UTAMA/);
  assert.match(modalSlice, /goToMainMenuFromPlay/);
});

test('setMasterVolume scales SGA audio level continuously and restores cleanly', () => {
  try {
    setMuted(false);
    setMasterVolume(1);
    const full = masterLevel();
    assert.ok(full > 0.85, `expected full masterLevel > 0.85, got ${full}`);

    setMasterVolume(0.5);
    assert.equal(getMasterVolume(), 0.5);
    assert.ok(Math.abs(masterLevel() - full * 0.5) < 1e-6);

    setMuted(true);
    assert.equal(masterLevel(), 0);

    setMuted(false);
    assert.ok(Math.abs(masterLevel() - full * 0.5) < 1e-6);
  } finally {
    setMuted(false);
    setMasterVolume(1);
  }
});
