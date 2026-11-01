import test from 'node:test';
import assert from 'node:assert/strict';

const globals = globalThis as unknown as Record<string, any>;
globals.window ??= { setTimeout, clearTimeout, addEventListener: () => {}, removeEventListener: () => {} };

const {
  allStagesOpen,
  setAllStagesOpen,
  toggleAllStagesOpen,
  subscribeAllStages,
  isUnlockShortcut,
} = await import('../src/games/gunhit/game/stageUnlock.ts');

test('the map starts with every stage open', () => {
  // First run of the game: nothing has been chosen yet, so the whole map is open.
  assert.equal(allStagesOpen(), true, 'every stage is playable out of the box');
});

test('P flips the map to the earned progression and back again', () => {
  const seen: boolean[] = [];
  const stop = subscribeAllStages((v) => seen.push(v));
  assert.equal(toggleAllStagesOpen(), false, 'the first press goes back to normal');
  assert.equal(allStagesOpen(), false);
  assert.equal(toggleAllStagesOpen(), true, 'and the next press opens everything again');
  assert.deepEqual(seen, [false, true], 'every open map screen is re-rendered on the press');
  stop();
  seen.length = 0;
  setAllStagesOpen(false);
  assert.deepEqual(seen, [], 'the listener is gone once it unsubscribed');
  setAllStagesOpen(true);
  assert.equal(allStagesOpen(), true);
});

test('only a bare P on a page (never while typing) counts as the shortcut', () => {
  const key = (k: string, extra: Record<string, unknown> = {}) => ({ key: k, target: null, ...extra }) as any;
  assert.equal(isUnlockShortcut(key('p')), true);
  assert.equal(isUnlockShortcut(key('P')), true);
  assert.equal(isUnlockShortcut(key('x')), false, 'other keys are left alone');
  assert.equal(isUnlockShortcut(key('p', { ctrlKey: true })), false, 'browser shortcuts still work');
  assert.equal(isUnlockShortcut(key('p', { target: { tagName: 'INPUT' } })), false, 'typing a P in a field is not a toggle');
  assert.equal(isUnlockShortcut(key('p', { target: { tagName: 'DIV', isContentEditable: true } })), false);
});
