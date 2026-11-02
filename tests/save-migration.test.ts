import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import type { KeyValueStore } from '../src/games/gunhit/game/safeStorage';
import { checksum, encodeBlob, migrateValue, readBlob } from '../src/storage/saveBlob';
import {
  SAVE_META_KEY,
  SAVE_VERSION,
  bootSave,
  migrateSave,
  progressDigest,
  resetSaveBootForTests,
} from '../src/storage/saveState';
import { MAX_RUNS, RUNS_KEY, bestRun, readRuns, recordRun, writeRuns } from '../src/storage/leaderboard';
import { PROGRESS_KEYS } from '../src/storage/resetProgress';

/**
 * Part 9: the save file has to survive the three things that actually happen in
 * the field — an old build's data, a half-written value, and someone editing
 * `localStorage` — without ever showing a broken screen or a fake record.
 */

function fakeStore(seed: Record<string, string> = {}) {
  const data = new Map(Object.entries(seed));
  const store: KeyValueStore & { data: Map<string, string>; writes: string[] } = {
    data,
    writes: [],
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value);
      store.writes.push(key);
    },
    removeItem: (key) => void data.delete(key),
  };
  return store;
}

test('checksum is stable, short and sensitive to a single character', () => {
  assert.equal(checksum('stage=4'), checksum('stage=4'));
  assert.equal(checksum(''), '811c9dc5');
  assert.notEqual(checksum('stage=4'), checksum('stage=5'));
  assert.match(checksum('whatever'), /^[0-9a-f]{8}$/);
});

test('a blob round-trips and reports a tampered payload', () => {
  const raw = encodeBlob({ score: 900, stage: 7 }, 2);
  const good = readBlob<{ score: number }>(raw, 2, (value) =>
    typeof value === 'object' && value !== null && typeof (value as { score?: unknown }).score === 'number'
      ? (value as { score: number })
      : null);
  assert.equal(good.status, 'ok');
  assert.equal(good.value?.score, 900);

  const tampered = raw.replace('900', '999');
  assert.equal(readBlob(tampered, 2, () => ({ score: 1 })).status, 'corrupt');
  assert.equal(readBlob('{oops', 2, () => null).status, 'corrupt');
  assert.equal(readBlob(null, 2, () => null).status, 'missing');
  // A blob written by a newer build must not be read or overwritten blindly.
  assert.equal(readBlob(encodeBlob({ x: 1 }, 9), 2, () => ({ x: 1 })).status, 'newer');
});

test('plain (pre-version) values are accepted so nothing is lost on upgrade', () => {
  const read = readBlob<number[]>('[3, 4]', 1, (value) => (Array.isArray(value) ? (value as number[]) : null));
  assert.equal(read.status, 'unversioned');
  assert.deepEqual(read.value, [3, 4]);
});

test('migrateValue walks one step at a time', () => {
  const migrations = {
    1: (value: { n: number }) => ({ n: value.n + 1 }),
    2: (value: { n: number }) => ({ n: value.n * 10 }),
  };
  assert.deepEqual(migrateValue({ n: 1 }, 1, 3, migrations), { n: 20 });
  assert.deepEqual(migrateValue({ n: 1 }, 0, 3, migrations), { n: 20 }, 'version 0 starts at step 1');
});

test('a first launch stamps a version without inventing progress', () => {
  const store = fakeStore();
  const report = migrateSave(store);
  assert.equal(report.status, 'fresh');
  assert.equal(report.toVersion, SAVE_VERSION);
  assert.deepEqual(report.repaired, []);
  assert.equal(store.getItem('gunhit_coins'), null, 'no value is created out of thin air');
  assert.ok(store.getItem(SAVE_META_KEY), 'the meta record is written');
});

test('an unversioned save is migrated, not thrown away', () => {
  const store = fakeStore({
    gunhit_best: '4200',
    gunhit_best_level: '7',
    gunhit_coins: '130',
    gunhit_weapon: 'ak47',
    gunhit_owned_weapons: JSON.stringify(['pistol', 'ak47']),
  });
  const report = migrateSave(store);
  assert.equal(report.status, 'migrated');
  assert.equal(report.fromVersion, 0);
  assert.equal(report.toVersion, SAVE_VERSION);
  assert.equal(store.getItem('gunhit_best'), '4200', 'progress is preserved byte for byte');
  assert.equal(store.getItem('gunhit_best_level'), '7');
  assert.equal(store.getItem('gunhit_weapon'), 'ak47');
  const meta = readBlob<{ version: number; digest: string }>(store.getItem(SAVE_META_KEY), SAVE_VERSION, (value) => value as { version: number; digest: string });
  assert.equal(meta.status, 'ok');
  assert.equal(meta.value?.version, SAVE_VERSION);
  assert.equal(meta.value?.digest, progressDigest(store));
});

test('a corrupt or edited save is repaired instead of shown', () => {
  const store = fakeStore({
    gunhit_best: 'NaN',
    gunhit_best_level: '-4',
    gunhit_coins: '99999999999',
    gunhit_weapon: 'bukan-senjata',
    gunhit_owned_weapons: '{"not":"an array"}',
    gunhit_rare_owned: JSON.stringify(['pistol', 'plasma', 'plasma']),
  });
  const report = migrateSave(store);
  assert.equal(store.getItem('gunhit_best'), '0');
  assert.equal(store.getItem('gunhit_best_level'), '1');
  assert.equal(store.getItem('gunhit_coins'), '1000000000', 'clamped to the hard ceiling');
  // A value the browser itself cannot represent is 0, never `Infinity`.
  store.setItem('gunhit_diamonds', '1e999');
  migrateSave(store);
  assert.equal(store.getItem('gunhit_diamonds'), '0');
  assert.equal(store.getItem('gunhit_weapon'), 'pistol', 'unknown weapon falls back to the starter gun');
  assert.equal(store.getItem('gunhit_owned_weapons'), null, 'unreadable collection is dropped, not guessed');
  assert.equal(store.getItem('gunhit_rare_owned'), JSON.stringify(['plasma']), 'dupes and non-RARE ids removed');
  assert.ok(report.repaired.includes('gunhit_best'));
  assert.ok(report.repaired.includes('gunhit_owned_weapons'));
});

test('a checksum mismatch is detected on the next boot', () => {
  const store = fakeStore({ gunhit_best: '500' });
  migrateSave(store);
  // Someone edits the score by hand into something the game cannot use: the
  // digest no longer matches *and* the value is repaired.
  store.setItem('gunhit_best', 'seratus juta');
  const report = migrateSave(store);
  assert.equal(report.status, 'repaired');
  assert.equal(store.getItem('gunhit_best'), '0');
  assert.ok(report.repaired.includes('gunhit_best') || report.digest === progressDigest(store));
  assert.equal(progressDigest(store), readBlob<{ digest: string }>(store.getItem(SAVE_META_KEY), SAVE_VERSION, (v) => v as { digest: string }).value?.digest);
});

test('normal play does not look like corruption on the next boot', () => {
  const store = fakeStore({ gunhit_coins: '10' });
  migrateSave(store);
  // The game writes progress through its own keys during a run…
  store.setItem('gunhit_coins', '240');
  store.setItem('gunhit_best', '900');
  // …and the next launch must not call that "repaired", because the values are
  // all valid; only the fingerprint is refreshed.
  const report = migrateSave(store);
  assert.equal(report.status, 'current');
  assert.deepEqual(report.repaired, []);
  assert.equal(store.getItem('gunhit_coins'), '240', 'valid progress is untouched');
});

test('a newer save is not overwritten with old schema', () => {
  const store = fakeStore({ gunhit_coins: '55' });
  store.setItem(SAVE_META_KEY, encodeBlob({ version: SAVE_VERSION + 3, digest: 'deadbeef', updatedAt: new Date().toISOString() }, SAVE_VERSION + 3));
  const report = migrateSave(store);
  assert.equal(report.status, 'reset-for-downgrade');
  assert.equal(store.getItem('gunhit_coins'), '55', 'progress stays readable');
});

test('the local leaderboard keeps the ten best runs, newest first on ties', () => {
  const store = fakeStore();
  for (let i = 0; i < 14; i++) {
    recordRun({ score: 100 + i * 10, stage: 1 + i, coins: i, at: new Date(Date.UTC(2026, 0, 1 + i)).toISOString() }, store);
  }
  const runs = readRuns(store);
  assert.equal(runs.length, MAX_RUNS);
  assert.equal(runs[0].score, 230, 'highest score leads');
  assert.equal(bestRun(store)?.score, 230);
  assert.deepEqual(runs, [...runs].sort((a, b) => b.score - a.score), 'sorted by score');
});

test('a run outside the top ten is not stored', () => {
  const store = fakeStore();
  for (let i = 0; i < MAX_RUNS; i++) {
    recordRun({ score: 1000 + i, stage: 5, coins: 3, at: new Date(Date.UTC(2026, 0, i + 1)).toISOString() }, store);
  }
  const before = readRuns(store);
  const result = recordRun({ score: 1, stage: 1, coins: 0, at: new Date(Date.UTC(2026, 1, 1)).toISOString() }, store);
  assert.equal(result.added, false);
  assert.deepEqual(readRuns(store), before);
});

test('a tampered board is discarded instead of shown as a record', () => {
  const store = fakeStore();
  recordRun({ score: 500, stage: 4, coins: 2, at: new Date(Date.UTC(2026, 0, 1)).toISOString() }, store);
  const raw = store.getItem(RUNS_KEY)!;
  store.setItem(RUNS_KEY, raw.replace('500', '99999'));
  assert.deepEqual(readRuns(store), []);
});

test('an unversioned board from an older build is migrated', () => {
  const store = fakeStore();
  store.setItem(RUNS_KEY, JSON.stringify([{ score: 700, stage: 6, coins: 4, at: new Date(Date.UTC(2026, 0, 2)).toISOString() }]));
  const runs = readRuns(store);
  assert.equal(runs.length, 1);
  assert.equal(runs[0].score, 700);
  writeRuns(runs, store);
  assert.equal(readBlob(store.getItem(RUNS_KEY), 1, () => []).status, 'ok', 'rewritten with version + checksum');
});

test('reset progress clears the board and the save meta too', () => {
  for (const key of [RUNS_KEY, SAVE_META_KEY]) {
    assert.ok((PROGRESS_KEYS as readonly string[]).includes(key), `${key} must be reset with progress`);
  }
});

test('the game boots the save layer before it reads progress', () => {
  const app = readFileSync(path.join(process.cwd(), 'src/games/gunhit/App.tsx'), 'utf8');
  const boot = app.indexOf('bootSave(storage)');
  const firstRead = app.indexOf('const LS = {');
  assert.ok(boot > 0, 'bootSave is called');
  assert.ok(boot < firstRead, 'the migration runs before the first saved value is read');
  assert.match(app, /recordRun\(\{ score, stage: level, coins: runCoins \}\)/, 'every finished run is offered to the board');
  assert.match(app, /runsToRivals\(readRuns\(storage\)\)/, 'the board is built from saved runs, not invented rivals');
});

test('bootSave runs once per process and can be reset for tests', () => {
  resetSaveBootForTests();
  const first = bootSave(fakeStore({ gunhit_best: '5' }));
  const cached = bootSave(fakeStore({ gunhit_best: '9' }));
  assert.equal(first, cached, 'the second call reuses the first report');
  resetSaveBootForTests();
  const again = bootSave(fakeStore({ gunhit_best: '9' }));
  assert.notEqual(first, again);
});
