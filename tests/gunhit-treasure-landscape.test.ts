import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  advanceTreasureCoins,
  throwTreasureCoins,
  SHOWER_LANDSCAPE,
  SHOWER_PORTRAIT,
} from '../src/games/gunhit/game/treasureShower';

const ROOT = path.resolve(import.meta.dirname, '..');
const read = (file: string) => readFileSync(path.join(ROOT, file), 'utf8');

test('the landscape screen is 760 wide and 420 tall; portrait is the world', () => {
  assert.deepEqual({ ...SHOWER_LANDSCAPE }, { width: 760, height: 420 });
  assert.deepEqual({ ...SHOWER_PORTRAIT }, { width: 420, height: 760 });
});

test('landscape coins leap up the screen, then fall to its floor instead of sliding left', () => {
  // Screen space in landscape: the world's left edge is the floor, so a shower
  // simulated in world coordinates used to throw the gold sideways.
  const coins = throwTreasureCoins(560, 250, 12, () => 0.5, SHOWER_LANDSCAPE);
  assert.ok(coins.length > 0);
  assert.ok(coins.every((c) => c.vy < 0), 'meledak ke ATAS layar');
  assert.ok(coins.every((c) => c.y <= 250), 'mulai di mulut peti');

  let bounces = 0;
  const floor = SHOWER_LANDSCAPE.height - 32;
  for (let i = 0; i < 90; i++) {
    advanceTreasureCoins(coins, 1 / 60, () => { bounces++; }, SHOWER_LANDSCAPE);
    for (const c of coins) {
      if (c.state !== 'burst') continue;
      assert.ok(c.y <= floor + 0.001, `koin tidak menembus lantai layar (y ${c.y.toFixed(1)})`);
      assert.ok(c.x >= 0 && c.x <= SHOWER_LANDSCAPE.width, 'koin tetap di lebar layar');
    }
  }
  assert.ok(bounces > 0, 'koin memantul di dasar layar');
});

test('portrait keeps exactly the old physics', () => {
  const a = throwTreasureCoins(210, 282, 13, () => 0.5, SHOWER_PORTRAIT);
  const b = throwTreasureCoins(210, 282, 13, () => 0.5);
  assert.deepEqual(a, b, 'portrait = world, default arg tetap sama');
});

test('the game converts the shower between screen and world', () => {
  const game = read('src/games/gunhit/game/Game.ts');
  // The shower is thrown and advanced on the screen…
  assert.match(game, /const gold = this\.worldToScreen\(p\.x, ty\);/);
  assert.match(game, /throwTreasureCoins\(gold\.x, gold\.y, reward, Math\.random, this\.showerScreen\)/);
  assert.match(game, /advanceTreasureCoins\(\n\s*this\.treasureCoins,\n\s*dt,\n\s*\(sx, sy\) => \{ const at = this\.screenToWorld\(sx, sy\); this\.burstSpecial\(at\.x, at\.y, 'gold', 3\); \},\n\s*this\.showerScreen,/);
  // …and drawn in the world, where the chest lives.
  assert.match(game, /const at = this\.screenToWorld\(coin\.x, coin\.y\);/);
  assert.match(game, /private get showerScreen\(\) \{/);
});

test('a treasure chest never wears the boss hitbox outline', () => {
  const game = read('src/games/gunhit/game/Game.ts');
  // The chest is hit as a box, so the contour is geometry leaking onto the
  // screen: `drawBossSilhouette` refuses the treasure stage, and the play path
  // no longer calls it at all (the line is player-requested hidden).
  assert.match(game, /private drawBossSilhouette\(c: CanvasRenderingContext2D\) \{\n[\s\S]{0,900}?if \(this\.level\.mode === 'treasure'\) return;/);
  assert.ok(!/else this\.drawBossSilhouette\(c\);/.test(game), 'tidak ada garis biru di play');
});
