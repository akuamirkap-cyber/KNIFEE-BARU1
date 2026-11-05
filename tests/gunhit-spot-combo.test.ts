import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CX } from '../src/games/gunhit/game/layout';
import { createCanvas } from '@napi-rs/canvas';
import { installCanvasShim } from './supportCanvas';
import { installSilentAudio } from '../tools/supportAudioSilent';
import {
  DEFAULT_SPOT_COMBO,
  SPOT_COMBO_ACCURACY,
  SPOT_COMBO_COIN_VALUE,
  SPOT_COMBO_REACH,
  SPOT_COMBO_RADIUS,
  SPOT_COMBO_STEP,
  getSavedSpotCombo,
  setSavedSpotCombo,
} from '../src/games/gunhit/game/spotCombo';

installCanvasShim();
(globalThis as { document?: { createElement: (tag: string) => unknown } }).document!.createElement = (tag: string) => {
  if (tag !== 'canvas') return { style: {} };
  const element = createCanvas(8, 8) as unknown as Record<string, unknown>;
  element.style = {};
  return element;
};
const env = globalThis as unknown as Record<string, unknown> & { window: Record<string, unknown> };
env.window = Object.assign(env.window ?? {}, {
  setTimeout, clearTimeout, setInterval: () => 0, clearInterval: () => undefined,
  addEventListener: () => undefined, removeEventListener: () => undefined,
  devicePixelRatio: 1, innerWidth: 760, innerHeight: 420,
});
installSilentAudio();

const { Game } = await import('../src/games/gunhit/game/Game.ts');

function liveGame() {
  const surface = createCanvas(760, 420);
  const canvas = {
    width: 760, height: 420, style: {}, getContext: () => surface.getContext('2d'),
    addEventListener: () => undefined, removeEventListener: () => undefined,
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 760, height: 420 }),
  };
  const game = new Game(canvas as never, {
    onGameOver() {}, onStageChange() {}, onStageCleared() {}, onShotFired() {}, onBossDefeated() {},
  } as never) as unknown as Record<string, any>;
  game.setOrientation('landscape');
  game.active = true;
  game.startAtLevel(1);
  for (let i = 0; i < 900 && game.state !== 'play'; i++) game.update(1 / 60);
  assert.equal(game.state, 'play');
  return game;
}

test('the mode ships off, and the setting round-trips', () => {
  assert.equal(DEFAULT_SPOT_COMBO, false);
  assert.equal(getSavedSpotCombo(), false);
  setSavedSpotCombo(true);
  assert.equal(getSavedSpotCombo(), true);
  setSavedSpotCombo(false);
  assert.equal(getSavedSpotCombo(), false);
});

test('same-spot ladder is 10 · 20 · 30 … and a shot coin is worth 10 in the mode', () => {
  assert.equal(SPOT_COMBO_STEP, 10);
  assert.equal(SPOT_COMBO_COIN_VALUE, 10);
  // "Very close": the mark has to land inside 80 % of a tight tolerance, so the
  // two holes really overlap.
  assert.equal(SPOT_COMBO_ACCURACY, 0.8);
  assert.ok(SPOT_COMBO_REACH <= 18, 'the chain only survives a near-perfect repeat');
  assert.equal(SPOT_COMBO_REACH, SPOT_COMBO_RADIUS * SPOT_COMBO_ACCURACY);

  const game = liveGame();
  game.items.push({ angle: 0, type: 'coin', age: 0, r: 100 });
  const coin = game.items[game.items.length - 1];
  game.setSpotCombo(true);
  game.coins = 0;
  game.collectCoin(coin);
  assert.equal(game.coins, 10, 'a shot coin pays 10 in COMBO TITIK mode');

  const plain = liveGame();
  plain.items.push({ angle: 0, type: 'coin', age: 0, r: 100 });
  const plainCoin = plain.items[plain.items.length - 1];
  plain.setSpotCombo(false);
  plain.coins = 0;
  plain.collectCoin(plainCoin);
  assert.equal(plain.coins, plain.weapon.coinValue, 'with the mode off the weapon still prices its own coins');
});

test('the ladder only climbs while the rounds keep landing on the same spot', () => {
  const src = readFileSync('src/games/gunhit/game/Game.ts', 'utf8');
  // Angle distance inside the target frame decides "same spot" (the marks rotate
  // with the wheel, so world coordinates would drift).
  assert.match(src, /const arc = this\.spotHits > 0\s*\n?\s*\? Math\.abs\(Math\.atan2\(Math\.sin\(local - this\.spotAngle\), Math\.cos\(local - this\.spotAngle\)\)\) \* R/);
  assert.match(src, /this\.spotHits = arc <= SPOT_COMBO_REACH \? this\.spotHits \+ 1 : 1;/);
  // A short, plain line — just the coins, no fire emoji, no size ramp.
  assert.match(src, /this\.addText\(`\+\$\{spotBonus\} 💰`, CX, this\.targetY \+ R \+ 30, '#fbbf24', 20\);/);
  assert.ok(!src.includes('TITIK SAMA +'), 'the old noisy label is gone');
  assert.match(src, /const spotBonus = SPOT_COMBO_STEP \* this\.spotHits;/);
  assert.match(src, /this\.coins \+= spotBonus;/);
  assert.match(src, /setSpotCombo\(on: boolean\)/);
  // A new stage starts the ladder over.
  assert.match(src, /this\.spotHits = 0;/);
});

test('in the mode a round that lands on a stuck round is a hit, not a violation', () => {
  const fire = (combo: boolean) => {
    const game = liveGame();
    game.setSpotCombo(combo);
    const R = game.level.radius;
    const local = -Math.PI / 2 - game.rot;
    // A round already stuck right where the next one is aimed.
    game.items.push({ angle: local, type: 'bullet', age: 0, r: R, w: 'pistol' });
    const before = game.items.length;
    const proj = { x: CX, y: game.targetY - R + 3, vx: 0, vy: -900 };
    const res = game.stepProj(proj);
    return { res, game, before };
  };

  const off = fire(false);
  assert.equal(off.res.res, 'fail', 'outside the mode the old rule still wastes the shot');

  const on = fire(true);
  assert.equal(on.res.res, 'stick', 'in COMBO TITIK it bites the same spot');
  // The mark it replaced is knocked loose instead of piling up on one spot: the
  // wheel holds one mark here, and the caller adds the new round on top of it.
  assert.equal(on.game.items.length, on.before - 1, 'the old mark leaves the wheel');
  assert.ok(on.game.flyers.length > 0, 'the replaced round flies off');
});

test('a spike is still a violation, even in the mode', () => {
  const game = liveGame();
  game.setSpotCombo(true);
  const R = game.level.radius;
  const local = -Math.PI / 2 - game.rot;
  game.items.push({ angle: local, type: 'spike', age: 0, r: R });
  const res = game.stepProj({ x: CX, y: game.targetY - R + 3, vx: 0, vy: -900 });
  assert.equal(res.res, 'fail', 'hazards keep their teeth');
});
