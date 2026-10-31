import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { installCanvasShim } from './supportCanvas';
import { installSilentAudio } from '../tools/supportAudioSilent';

installCanvasShim();
const g = globalThis as unknown as Record<string, unknown> & { window: Record<string, unknown> };
g.window = Object.assign(g.window ?? {}, {
  setTimeout,
  clearTimeout,
  setInterval: () => 0,
  clearInterval: () => undefined,
  addEventListener: () => undefined,
  removeEventListener: () => undefined,
  devicePixelRatio: 1,
  innerWidth: 420,
  innerHeight: 760,
});
installSilentAudio();

const gradient = { addColorStop: () => undefined };
const ctx = new Proxy({ canvas: { width: 420, height: 760 } } as Record<string, unknown>, {
  get(target, prop) {
    const name = String(prop);
    if (name === 'canvas') return target.canvas;
    if (name === 'createLinearGradient' || name === 'createRadialGradient' || name === 'createPattern') {
      return () => gradient;
    }
    if (name === 'measureText') return () => ({ width: 8 });
    return () => undefined;
  },
  set(target, prop, value) {
    target[String(prop)] = value;
    return true;
  },
}) as unknown as CanvasRenderingContext2D;

const canvas = {
  width: 420,
  height: 760,
  style: {},
  getContext: () => ctx,
  addEventListener: () => undefined,
  removeEventListener: () => undefined,
  getBoundingClientRect: () => ({ left: 0, top: 0, width: 420, height: 760 }),
};

const {
  SGA_SPEED_OPTIONS,
  DEFAULT_SGA_SPEED,
  SGA_SPEED_STORAGE_KEY,
  formatSgaSpeed,
  getSavedSgaSpeed,
  setSavedSgaSpeed,
  subscribeSgaSpeed,
} = await import('../src/games/gunhit/game/gameSpeed.ts');
const { storage } = await import('../src/games/gunhit/game/safeStorage.ts');
const { Game } = await import('../src/games/gunhit/game/Game.ts');

const events = {
  onGameOver: () => undefined,
  onStageChange: () => undefined,
  onStageCleared: () => undefined,
  onShotFired: () => undefined,
  onBossDefeated: () => undefined,
};

type AnyGame = Record<string, any>;

function createPlayableGame(speed: number, stage = 1): AnyGame {
  const game = new Game(canvas as unknown as HTMLCanvasElement, events as never) as unknown as AnyGame;
  game.setGameSpeed(speed);
  game.setWeapon('pistol');
  game.startAtLevel(stage);
  return game;
}

test('SGA speed options expose 1x, 1.2x, 1.3x, 1.4x with 1.2x default and live persistence', () => {
  assert.deepEqual([...SGA_SPEED_OPTIONS], [1, 1.2, 1.3, 1.4]);
  assert.equal(DEFAULT_SGA_SPEED, 1.2);
  storage.removeItem(SGA_SPEED_STORAGE_KEY);
  assert.equal(getSavedSgaSpeed(), 1.2);

  const seen: number[] = [];
  const unsub = subscribeSgaSpeed((next) => seen.push(next));
  try {
    for (const spd of [1.3, 1.4, 1, 1.2] as const) {
      assert.equal(setSavedSgaSpeed(spd), spd);
      assert.equal(getSavedSgaSpeed(), spd);
      assert.equal(formatSgaSpeed(spd), `${spd}x`);
    }
    assert.deepEqual(seen, [1.3, 1.4, 1, 1.2]);
  } finally {
    unsub();
  }
});

test('Game.setGameSpeed scales wheel rotation, intro, cooldown, projectile flight, and boss timers by 1.2x, 1.3x, and 1.4x', () => {
  const DT = 1 / 60;

  // 1) Intro & levelTime / wheel rotation scale exact 1.2x, 1.3x, 1.4x
  const base = createPlayableGame(1, 1);
  base.level.pattern = 'constant';
  base.level.dir = 1;
  base.rot = 0;
  base.update(DT * 10);

  for (const mult of [1.2, 1.3, 1.4] as const) {
    const fast = createPlayableGame(mult, 1);
    fast.level.pattern = 'constant';
    fast.level.dir = 1;
    fast.rot = 0;
    fast.update(DT * 10);

    assert.equal(fast.getGameSpeed(), mult);
    assert.ok(Math.abs(fast.introT - base.introT * mult) < 1e-9, `introT scales by ${mult}x`);
    assert.ok(Math.abs(fast.levelTime - base.levelTime * mult) < 1e-9, `levelTime scales by ${mult}x`);
    assert.ok(Math.abs(fast.rot - base.rot * mult) < 1e-9, `wheel rotation scales by ${mult}x`);
  }

  // 2) Projectile travel & weapon cooldown scale exact 1.2x, 1.3x, 1.4x and stick cleanly
  const shotBase = createPlayableGame(1, 1);
  shotBase.state = 'play';
  shotBase.items = [];
  shotBase.shoot();
  const y0 = shotBase.projs[0].y as number;
  const cd0 = shotBase.cooldown as number;
  shotBase.update(DT);
  const dyBase = y0 - (shotBase.projs[0].y as number);
  const dcdBase = cd0 - (shotBase.cooldown as number);

  for (const mult of [1.2, 1.3, 1.4] as const) {
    const shotFast = createPlayableGame(mult, 1);
    shotFast.state = 'play';
    shotFast.items = [];
    shotFast.shoot();
    shotFast.update(DT);

    const dyFast = y0 - (shotFast.projs[0].y as number);
    const dcdFast = cd0 - (shotFast.cooldown as number);
    assert.ok(Math.abs(dyFast - dyBase * mult) < 1e-6, `projectile step scales by ${mult}x`);
    assert.ok(Math.abs(dcdFast - dcdBase * mult) < 1e-9, `weapon cooldown scales by ${mult}x`);

    // Ensure fast projectile never tunnels past the wheel and sticks cleanly
    for (let i = 0; i < 60 && shotFast.projs.length > 0; i++) shotFast.update(DT);
    assert.equal(shotFast.stuck, 1, `shot sticks cleanly on target at ${mult}x`);
  }

  // 3) Boss stage attack timer & persistence across stage transitions
  const bossBase = createPlayableGame(1, 5);
  bossBase.state = 'play';
  bossBase.bossShootTimer = 2.0;
  bossBase.update(DT * 12);
  const bossElapsedBase = 2.0 - (bossBase.bossShootTimer as number);

  for (const mult of [1.2, 1.3, 1.4] as const) {
    const bossFast = createPlayableGame(mult, 5);
    bossFast.state = 'play';
    bossFast.bossShootTimer = 2.0;
    bossFast.update(DT * 12);
    const bossElapsedFast = 2.0 - (bossFast.bossShootTimer as number);
    assert.ok(Math.abs(bossElapsedFast - bossElapsedBase * mult) < 1e-9, `boss attack cadence scales by ${mult}x`);

    bossFast.startAtLevel(6);
    assert.equal(bossFast.getGameSpeed(), mult, `speed ${mult}x persists across stages`);
  }
});

test('SGA Pengaturan exposes the speed selector while App focuses purely on 9:16 SGA', () => {
  const hub = readFileSync(path.join(process.cwd(), 'src/App.tsx'), 'utf8');
  const sga = readFileSync(path.join(process.cwd(), 'src/games/gunhit/App.tsx'), 'utf8');
  assert.ok(hub.includes('<GunHitGame introReady={hasBooted && !loading} />'));
  assert.ok(!hub.includes('<header'), 'no outer desktop hub header on 9:16 mobile view');
  const settingsUi = readFileSync(path.join(process.cwd(), 'src/games/gunhit/components/SgaSettingsPanel.tsx'), 'utf8');
  assert.ok(settingsUi.includes('KECEPATAN GAME SGA'));
  assert.ok(sga.includes('SGA_SPEED_OPTIONS'));
});
