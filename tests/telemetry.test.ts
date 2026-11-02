import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import {
  analyticsSinkId,
  configureAnalytics,
  createMemorySink,
  recentEvents,
  resetAnalyticsForTests,
  track,
  type TrackedEvent,
} from '../src/telemetry/analytics';
import { createSessionTracker, sessionProps } from '../src/telemetry/session';
import { installErrorHooks, reportError, resetErrorHooksForTests } from '../src/telemetry/errorHooks';
import {
  currentRun,
  resetGameAnalyticsForTests,
  trackRunEnd,
  trackStageClear,
  trackStageStart,
} from '../src/telemetry/gameAnalytics';
import { createSafeStorage, type KeyValueStore } from '../src/games/gunhit/game/safeStorage';
import { installDebugSinkFromUrl } from '../src/telemetry/debugSink';

const ROOT = process.cwd();
const read = (file: string) => readFileSync(path.join(ROOT, file), 'utf8');
const DAY = 86_400_000;

function fakeStore(): KeyValueStore & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
    removeItem: (key) => void data.delete(key),
  };
}

test('default-nya tidak ada sink: semua track() jadi no-op', () => {
  resetAnalyticsForTests();
  assert.equal(analyticsSinkId(), null);
  assert.doesNotThrow(() => track('stage_start', { stage: 1 }));
  assert.equal(recentEvents().length, 0, 'tidak menyimpan apa pun tanpa sink');
});

test('sink bisa dipasang, properti dibersihkan, dan bisa dilepas lagi', () => {
  resetAnalyticsForTests();
  const events: TrackedEvent[] = [];
  const restore = configureAnalytics(createMemorySink(events));
  assert.equal(analyticsSinkId(), 'memory');

  track('stage_start', {
    stage: 3,
    boss: true,
    weapon: 'pistol',
    long: 'x'.repeat(500),
    broken: Number.NaN,
  });

  assert.equal(events.length, 1);
  const [event] = events;
  assert.equal(event.name, 'stage_start');
  assert.equal(event.props.stage, 3);
  assert.equal(event.props.boss, true);
  assert.ok(String(event.props.long).length <= 161, 'string panjang dipangkas');
  assert.ok(!('broken' in event.props), 'NaN dibuang');
  assert.ok(event.session.length > 0 && event.t > 0);
  assert.equal(recentEvents().length, 1);

  restore();
  assert.equal(analyticsSinkId(), null);
  track('stage_clear', { stage: 3 });
  assert.equal(events.length, 1, 'setelah dilepas tidak ada event baru');
  resetAnalyticsForTests();
});

test('retensi dihitung lokal dari tanggal install', () => {
  const store = fakeStore();
  let now = 1_700_000_000_000;
  const tracker = createSessionTracker(store, () => now);

  const first = tracker.noteStart();
  assert.equal(first.sessionIndex, 1);
  assert.equal(first.daysSinceInstall, 0);
  assert.equal(first.daysPlayed, 1);
  assert.equal(first.returningD1, false);

  now += DAY; // hari berikutnya
  const second = tracker.noteStart();
  assert.equal(second.sessionIndex, 2);
  assert.equal(second.daysSinceInstall, 1);
  assert.equal(second.daysPlayed, 2);
  assert.equal(second.returningD1, true);
  assert.equal(second.returningD7, false);

  now += 7 * DAY;
  const week = tracker.noteStart();
  assert.equal(week.returningD7, true);

  now += 30 * DAY;
  const month = tracker.noteStart();
  assert.equal(month.returningD30, true);

  assert.deepEqual(Object.keys(sessionProps(month)).sort(), [
    'days_played',
    'days_since_install',
    'returning_d1',
    'returning_d30',
    'returning_d7',
    'session_index',
  ]);

  tracker.clear();
  const afterReset = tracker.noteStart();
  assert.equal(afterReset.sessionIndex, 1, 'reset menghapus hitungan');
});

test('retensi tetap jalan saat storage menolak menulis', () => {
  const broken: KeyValueStore = {
    getItem: () => {
      throw new Error('blocked');
    },
    setItem: () => {
      throw new Error('blocked');
    },
    removeItem: () => {
      throw new Error('blocked');
    },
  };
  const tracker = createSessionTracker(broken, () => 1_700_000_000_000);
  const info = tracker.noteStart();
  assert.equal(info.sessionIndex, 1, 'launch pertama tetap terhitung');
  assert.equal(tracker.peek().daysPlayed, 1);
});

test('funnel run: start → clear → end, termasuk run yang ditinggalkan', () => {
  resetAnalyticsForTests();
  resetGameAnalyticsForTests();
  const events: TrackedEvent[] = [];
  configureAnalytics(createMemorySink(events));

  const t0 = 1_000_000;
  trackStageStart({ stage: 4, mode: 'classic', weapon: 'ak47', boss: false }, t0);
  trackStageClear({ stage: 4, boss: false }, t0 + 5_000);
  trackStageStart({ stage: 5, mode: 'classic', weapon: 'ak47', boss: true }, t0 + 6_000);
  trackStageClear({ stage: 5, boss: true }, t0 + 30_000);
  trackRunEnd({ outcome: 'game_over', stage: 5, score: 1234, coins: 12 }, t0 + 31_000);

  const byName = (name: string) => events.filter((event) => event.name === name);
  assert.equal(byName('stage_start').length, 2);
  assert.equal(byName('stage_clear').length, 2);
  const clear = byName('stage_clear')[1];
  assert.equal(clear.props.cleared_this_run, 2);
  assert.equal(clear.props.run_ms, 30_000, 'durasi dihitung dari awal run');

  const end = byName('run_end')[0];
  assert.equal(end.props.outcome, 'game_over');
  assert.equal(end.props.cleared, 2);
  assert.equal(end.props.run_ms, 31_000);
  assert.equal(end.props.weapon, 'ak47');
  assert.equal(currentRun(), null, 'run ditutup setelah game over');

  // Run yang ditinggalkan tetap tercatat, tapi tidak dihitung sebagai mati.
  trackStageStart({ stage: 7, mode: 'boulder', weapon: 'pistol', boss: false }, t0 + 40_000);
  assert.ok(currentRun());
  trackRunEnd({ outcome: 'abandoned', stage: 7, score: 400, coins: 0 }, t0 + 42_000);
  const abandoned = events.filter((event) => event.name === 'run_end')[1];
  assert.equal(abandoned.props.outcome, 'abandoned');
  assert.equal(abandoned.props.cleared, 0);

  resetAnalyticsForTests();
  resetGameAnalyticsForTests();
});

test('error hook menangkap error global, sekali per pesan', () => {
  resetAnalyticsForTests();
  resetErrorHooksForTests();
  const events: TrackedEvent[] = [];
  configureAnalytics(createMemorySink(events));

  const target = new EventTarget();
  const uninstall = installErrorHooks(target as unknown as Pick<Window, 'addEventListener' | 'removeEventListener'>);

  const errorEvent = new Event('error') as Event & { message?: string; error?: unknown; lineno?: number; filename?: string };
  errorEvent.message = 'TypeError: boom';
  errorEvent.error = new TypeError('boom');
  errorEvent.lineno = 42;
  errorEvent.filename = 'https://localhost/assets/App.js';
  target.dispatchEvent(errorEvent);
  target.dispatchEvent(errorEvent); // duplikat tidak dilaporkan lagi

  const rejection = new Event('unhandledrejection') as Event & { reason?: unknown };
  rejection.reason = new Error('promise failed');
  target.dispatchEvent(rejection);

  // Resource error (gambar 404) tidak punya message → bukan crash.
  target.dispatchEvent(new Event('error'));

  const errors = events.filter((event) => event.name === 'error');
  assert.equal(errors.length, 2);
  assert.equal(errors[0].props.source, 'window');
  assert.equal(errors[0].props.line, 42);
  assert.equal(errors[0].props.file, 'App.js');
  assert.equal(errors[1].props.source, 'promise');
  assert.match(String(errors[1].props.message), /promise failed/);

  // Boundary React memakai jalur yang sama.
  reportError('react-boundary', new Error('render kaboom'), { where: 'game-boundary' });
  assert.equal(events.filter((event) => event.name === 'error').length, 3);

  uninstall();
  resetAnalyticsForTests();
  resetErrorHooksForTests();
});

test('debug sink hanya aktif di build development', () => {
  resetAnalyticsForTests();
  assert.equal(installDebugSinkFromUrl('?telemetry=console', false), null, 'release mengabaikan URL');
  assert.equal(analyticsSinkId(), null);
  assert.equal(installDebugSinkFromUrl('?nothing=1', true), null);
  assert.equal(installDebugSinkFromUrl('?telemetry=console', true), 'console');
  assert.equal(analyticsSinkId(), 'console');
  resetAnalyticsForTests();
});

test('satu sumber versi: __APP_VERSION__ diisi dari android/version.properties', () => {
  const config = read('vite.config.ts');
  assert.ok(config.includes('__APP_VERSION__'));
  assert.ok(config.includes("android/version.properties"));
  const version = read('android/version.properties');
  assert.match(version, /^versionName\s*=\s*\d+\.\d+\.\d+\s*$/m);
  // Di lingkungan tes nilainya "dev" (tanpa Vite), bukan crash.
  assert.equal(read('src/telemetry/version.ts').includes("'dev'"), true);
});

test('telemetri terpasang di app dan game, dan tidak pernah memakai jaringan', () => {
  const hub = read('src/App.tsx');
  assert.ok(hub.includes('trackSessionStart()'));
  assert.ok(hub.includes('installErrorHooks()'));
  assert.ok(hub.includes("reportError('react-boundary'"), 'error boundary melapor');

  const game = read('src/games/gunhit/App.tsx');
  assert.ok(game.includes('trackStageStart({ stage: level, mode: stageConfig.mode, weapon, boss: stageConfig.boss })'));
  assert.ok(game.includes("trackRunEnd({ outcome: 'game_over', stage: level, score, coins: runCoins })"));
  assert.ok(game.includes("trackRunEnd({ outcome: 'abandoned'"));
  assert.ok(game.includes('trackStageClear({ stage: level, boss })'));

  const dir = path.join(ROOT, 'src/telemetry');
  for (const file of readdirSync(dir)) {
    const source = read(path.posix.join('src/telemetry', file));
    for (const pattern of [/\bfetch\s*\(/, /XMLHttpRequest/, /sendBeacon/, /WebSocket/]) {
      assert.ok(!pattern.test(source), `${file} tidak memakai ${pattern}`);
    }
  }
});

test('namespace storage telemetri terpisah dari simpanan game', () => {
  const store = fakeStore();
  const tracker = createSessionTracker(store, () => 1_700_000_000_000);
  tracker.noteStart();
  const keys = [...store.data.keys()];
  assert.deepEqual(keys, ['sga.telemetry.session.v1']);
  // Storage aman tetap bisa dipakai sebagai lapisan penyimpanan.
  const safe = createSafeStorage(() => null);
  assert.doesNotThrow(() => safe.setItem('x', '1'));
});
