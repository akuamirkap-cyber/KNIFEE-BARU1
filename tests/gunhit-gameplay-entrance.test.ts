import test from 'node:test';
import assert from 'node:assert/strict';
import { installCanvasShim } from './supportCanvas';
import { installSilentAudio } from '../tools/supportAudioSilent';

installCanvasShim();
const g = globalThis as unknown as { window: Record<string, unknown> };
g.window = Object.assign(g.window ?? {}, {
  setTimeout, clearTimeout, setInterval: () => 0, clearInterval: () => undefined,
  addEventListener: () => undefined, removeEventListener: () => undefined,
  devicePixelRatio: 1, innerWidth: 420, innerHeight: 760,
});
installSilentAudio();

const {
  Game, GUN_Y, GAMEPLAY_GUN_SCALE, GAMEPLAY_GUN_ENTRY_DURATION,
  GAMEPLAY_GUN_ENTRY_DISTANCE, gameplayGunEntryOffset, perfectShotWheelEntry,
  perfectShotWheelBurst, initialGameplayWheelCenterY,
} = await import('../src/games/gunhit/game/Game');

const gradient = { addColorStop: () => undefined };
function context(translates: [number, number][] = []): CanvasRenderingContext2D {
  const target: Record<string, unknown> = { canvas: { width: 420, height: 760 }, globalAlpha: 1 };
  return new Proxy(target, {
    get(obj, prop) {
      if (prop === 'canvas' || prop === 'globalAlpha') return obj[prop];
      if (prop === 'translate') return (x: number, y: number) => { translates.push([x, y]); };
      if (prop === 'createLinearGradient' || prop === 'createRadialGradient' || prop === 'createConicGradient' || prop === 'createPattern') return () => gradient;
      if (prop === 'measureText') return () => ({ width: 8 });
      if (prop === 'getImageData') return () => ({ data: new Uint8ClampedArray(4) });
      return () => undefined;
    },
    set(obj, prop, value) { obj[String(prop)] = value; return true; },
  }) as unknown as CanvasRenderingContext2D;
}
function canvas(): HTMLCanvasElement {
  const ctx = context();
  return {
    width: 420, height: 760, style: {}, getContext: () => ctx,
    addEventListener: () => undefined, removeEventListener: () => undefined,
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 420, height: 760 }),
  } as unknown as HTMLCanvasElement;
}
const events = { onGameOver: () => undefined, onStageChange: () => undefined, onStageCleared: () => undefined };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Live = any;
const near = (a: number, b: number) => Math.abs(a - b) < 1e-7;

test('gameplay weapon rises from below and settles without changing its resting size or muzzle', () => {
  assert.equal(GAMEPLAY_GUN_SCALE, 1.08);
  assert.equal(gameplayGunEntryOffset(0), GAMEPLAY_GUN_ENTRY_DISTANCE);
  const offsets = [0, 0.2, 0.4, 0.6, GAMEPLAY_GUN_ENTRY_DURATION].map(gameplayGunEntryOffset);
  assert.ok(offsets.every((offset, i) => i === 0 || offset < offsets[i - 1]), 'the motion rises steadily');
  assert.equal(gameplayGunEntryOffset(GAMEPLAY_GUN_ENTRY_DURATION), 0);
  assert.equal(gameplayGunEntryOffset(9), 0);

  for (const id of ['pistol', 'photon_saber', 'ghost', 'buster', 'firework'] as const) {
    const game = new Game(canvas(), events as never) as Live;
    try {
      game.setWeapon(id);
      game.setGameSpeed(1);
      game.startAtLevel(1);
      const positions: [number, number][] = [];
      game.drawGunNow(context(positions));
      assert.ok(positions.some(([x, y]) => near(x, 210) && near(y, GUN_Y + GAMEPLAY_GUN_ENTRY_DISTANCE)), `${id} starts below the screen`);
      positions.length = 0;
      game.update(0.25);
      game.drawGunNow(context(positions));
      assert.ok(positions.some(([x, y]) => near(x, 210) && near(y, GUN_Y + gameplayGunEntryOffset(0.25))), `${id} moves upward as it is drawn`);
      positions.length = 0;
      game.update(1);
      game.drawGunNow(context(positions));
      assert.ok(positions.some(([x, y]) => near(x, 210) && near(y, GUN_Y)), `${id} returns to the original muzzle position`);
    } finally { game.destroy(); }
  }
});

test('Perfect Shot wheel intro drops, squashes, pops and lands on the original animation timeline', () => {
  const almost = (a: number, b: number) => Math.abs(a - b) < 1e-5;
  const start = perfectShotWheelEntry(0, 1, 106);
  assert.equal(start.opacity, 0);
  assert.equal(start.scaleX, 0.5);
  assert.ok(almost(start.offsetY, -339.2), 'the wheel begins 170% above its own diameter');
  const landed = perfectShotWheelEntry(0.06 + 1.1 * 0.42, 1, 106);
  assert.ok(almost(landed.offsetY, 0));
  assert.ok(almost(landed.scaleX, 1.14));
  assert.ok(almost(landed.scaleY, 0.84), 'the impact compresses the wheel vertically');
  const rebound = perfectShotWheelEntry(0.06 + 1.1 * 0.52, 1, 106);
  assert.ok(almost(rebound.offsetY, -0.16 * 106), 'the rebound matches the reference -8% of the wheel diameter');
  assert.ok(almost(rebound.scaleX, 0.96) && almost(rebound.scaleY, 1.05));
  const blast = perfectShotWheelEntry(0.06 + 1.1 * 0.8, 1, 106);
  assert.ok(almost(blast.scaleX, 1.32));
  assert.ok(almost(blast.scaleY, 1.32));
  assert.ok(almost(blast.brightness, 2.4));
  assert.equal(perfectShotWheelEntry(1.2, 1, 106).scaleX, 1, 'the wheel rests at the original Perfect Shot timing');
});

test('scope origin follows the exact SGA wheel center and the arrival gets the timed warm landing burst', () => {
  assert.equal(initialGameplayWheelCenterY(false, false), 184);
  assert.equal(initialGameplayWheelCenterY(true, false), 220);
  assert.equal(initialGameplayWheelCenterY(false, true), 184);
  const before = perfectShotWheelBurst(0.8, 1);
  assert.equal(before.flashOpacity, 0);
  assert.ok(before.waves.every((wave) => wave.opacity === 0));
  const impact = perfectShotWheelBurst(0.06 + 1.1 * 0.8, 1);
  assert.ok(impact.flashOpacity > 0.8, 'the warm flash peaks during the target pop');
  assert.equal(impact.waves.length, 2, 'both expanding rings from the Perfect Shot entrance are present');
  assert.ok(impact.waves.some((wave) => wave.opacity > 0.8), 'a shockwave accompanies the target pop');
  assert.ok(impact.waves.every((wave) => wave.scale >= 0.2 && wave.scale <= 2.6));
  const finished = perfectShotWheelBurst(1.75, 1);
  assert.equal(finished.flashOpacity, 0);
  assert.ok(finished.waves.every((wave) => wave.opacity === 0));
});

test('shared Play entrance times the wheel reveal, gun handoff and gameplay-ready state together', () => {
  const game = new Game(canvas(), events as never) as Live;
  try {
    game.setGameSpeed(1);
    game.startAtLevel(3, false, 0.6, true);
    assert.equal(game.introDuration, 1.35, 'the stage remains in its READY intro for the Perfect Shot timeline');
    assert.equal(game.gunEntryDelayT, 0.6, 'the SGA weapon waits for the same 600ms handoff offset');
    assert.equal(game.state, 'intro');
    game.update(0.5);
    assert.equal(game.state, 'intro', 'the wheel entrance remains active behind the scope reveal');
    assert.ok(game.wheelScale >= 0.5 && game.wheelScale < 0.84, 'the wheel is visibly dropping toward its Perfect Shot landing');
    assert.ok(game.gunEntryDelayT < 0.11 && game.gunEntryT === 0, 'the gun delay is not confused with its rise animation');
    for (let i = 0; i < 19; i++) game.update(0.05);
    assert.equal(game.state, 'play', 'input unlocks at the shared ready cue');
    assert.equal(game.gunEntryT, GAMEPLAY_GUN_ENTRY_DURATION, 'the weapon handoff ends at its intended gameplay slot');

    game.startAtLevel(1, true, 0, true);
    assert.equal(game.gunEntryT, GAMEPLAY_GUN_ENTRY_DURATION, 'a menu-to-game weapon flight skips a duplicate rise');
    assert.equal(game.synchronizedEntrance, true, 'the target wheel still plays its synchronized arrival');
  } finally { game.destroy(); }
});

test('entry replays for new runs, keeps stage transitions stable, and never delays the first accepted shot', () => {
  const game = new Game(canvas(), events as never) as Live;
  try {
    game.setWeapon('pistol');
    game.setGameSpeed(1);
    game.startAtLevel(3);
    assert.equal(game.gunEntryT, 0);
    game.update(0.5);
    assert.equal(game.state, 'play', 'existing 0.5s gameplay readiness is unchanged');
    assert.ok(gameplayGunEntryOffset(game.gunEntryT) > 0, 'the last few pixels may still be settling');
    const ammo = game.ammoLeft;
    game.shoot();
    assert.equal(game.ammoLeft, ammo - 1, 'first accepted shot is not delayed');
    assert.equal(game.gunEntryT, GAMEPLAY_GUN_ENTRY_DURATION, 'the visible muzzle instantly settles for that shot');
    assert.ok(game.projs.length > 0, 'the original projectile still spawns');
    game.loadLevel(4);
    assert.equal(game.gunEntryT, GAMEPLAY_GUN_ENTRY_DURATION, 'ordinary next stages do not re-animate the weapon');
    game.startSpecialStage('treasure');
    assert.equal(game.gunEntryT, 0, 'a special-stage shortcut is a fresh gameplay entrance');
    game.toIdle();
    assert.equal(game.gunEntryT, GAMEPLAY_GUN_ENTRY_DURATION, 'returning to the menu clears the entry');
    game.startAtLevel(1);
    assert.equal(game.gunEntryT, 0, 'a later run replays it');
  } finally { game.destroy(); }
});

test('entry uses the existing game speed and honors live reduced-motion changes without leaking listeners', () => {
  const old = g.window.matchMedia;
  const listeners = new Set<() => void>();
  const media = {
    matches: false,
    addEventListener: (_name: string, fn: () => void) => listeners.add(fn),
    removeEventListener: (_name: string, fn: () => void) => listeners.delete(fn),
  };
  g.window.matchMedia = () => media;
  const game = new Game(canvas(), events as never) as Live;
  try {
    assert.equal(listeners.size, 1);
    game.setGameSpeed(1.4);
    game.startAtLevel(1);
    game.update(0.2);
    assert.ok(near(game.gunEntryT, 0.28), 'entry follows the selected game speed');
    media.matches = true;
    for (const fn of listeners) fn();
    assert.equal(game.gunEntryT, GAMEPLAY_GUN_ENTRY_DURATION, 'enabling reduced motion settles immediately');
    game.startAtLevel(1);
    assert.equal(game.gunEntryT, GAMEPLAY_GUN_ENTRY_DURATION, 'new runs start settled under reduced motion');
    media.matches = false;
    for (const fn of listeners) fn();
    game.startAtLevel(1);
    assert.equal(game.gunEntryT, 0, 'motion resumes on the next new run');
  } finally {
    game.destroy();
    g.window.matchMedia = old;
  }
  assert.equal(listeners.size, 0, 'the media listener is removed when the game is destroyed');
});
