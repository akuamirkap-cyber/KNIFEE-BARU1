import test from 'node:test';
import assert from 'node:assert/strict';
import { HEAD_INFO, HEAD_KINDS } from '../src/games/perfect-shot/play/HeadArt';
import { levelConfig } from '../src/games/perfect-shot/play/levels';
import { makeLevel } from '../src/games/gunhit/game/Game';
import { bossHeadFor, bossNameFor } from '../src/games/gunhit/game/bossIdentity';
import { readFileSync } from 'node:fs';
import path from 'node:path';

/**
 * The boss on screen is Perfect Shot's head. If the HUD names it something else
 * the player is told the wrong boss is in front of them — which is exactly what
 * happened while slide 1 kept its own list: the pirate head (stage 5) was
 * announced as "DARK KNIGHT".
 */
test('every boss is named after the head it actually wears', () => {
  let bosses = 0;
  for (let n = 1; n <= 100; n++) {
    const cfg = levelConfig(n);
    if (!cfg.boss) {
      assert.equal(bossHeadFor(n), null, `stage ${n} is not a boss`);
      assert.equal(makeLevel(n).name, '', `stage ${n} has no boss name`);
      continue;
    }
    bosses++;
    const head = bossHeadFor(n);
    assert.ok(head, `stage ${n} is a boss with a head`);
    assert.equal(makeLevel(n).name, HEAD_INFO[head!].name.toUpperCase(),
      `stage ${n}: the name matches the ${head} artwork`);
    assert.equal(bossNameFor(n), HEAD_INFO[head!].name.toUpperCase());
  }
  assert.equal(bosses, 20, 'all twenty boss stages were checked');
});

test('stage 5 is the pirate, not the dark knight', () => {
  assert.equal(bossHeadFor(5), 'pirate');
  const name = makeLevel(5).name;
  assert.equal(name, 'PIRATE CAPTAIN');
  assert.ok(!/KNIGHT|DARK/i.test(name), 'no knight name over a pirate head');
});

test('the head rotation follows Perfect Shot, so names never repeat out of order', () => {
  const heads = [5, 10, 15, 20, 25].map((n) => bossHeadFor(n));
  assert.deepEqual(heads, ['pirate', 'jester', 'dragon', 'skeleton', 'tiki']);
});

test('the QUEST dialog names the boss after the art too', () => {
  const map = readFileSync(
    path.join(import.meta.dirname, '..', 'src/games/gunhit/components/LevelMap.tsx'),
    'utf8',
  );
  // The map keeps its own theme label, but the boss line the player reads has
  // to come from the head Perfect Shot puts on that stage.
  assert.match(map, /const artBoss = kind === 'boss' \? headInfoFor\(selectedLevel\)\?\.name \?\? '' : '';/);
  assert.match(map, /`\$\{tr\(language, 'BOSS '\)\}\$\{trId\(language, artBoss \|\| theme\.label\)\}/);
  assert.doesNotMatch(map, /Nama boss peta/);
});


test('the first eleven boss stages use all eleven Game B heads', () => {
  const heads = Array.from({ length: 11 }, (_, i) => bossHeadFor((i + 1) * 5));
  assert.deepEqual(heads, HEAD_KINDS);
  assert.equal(new Set(heads).size, 11);
});
