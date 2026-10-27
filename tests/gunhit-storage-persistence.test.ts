import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';

import { createReadinessTracker } from '../src/games/gunhit/game/safeStorage';

/**
 * The page shim keeps the games playable in a frame that refuses storage. These
 * tests prove the extra layers actually persist: `window.name` survives a reload
 * of the same frame, IndexedDB survives a real reload, and slide 1 waits for the
 * restore before it reads (otherwise the restored values arrive too late).
 */

const html = '<!doctype html><html><head><title>x</title></head><body><div id="root"></div></body></html>';

/** The shim exactly as a browser receives it, taken out of the real plugin. */
async function shimSource(): Promise<string> {
  const config = (await import('../vite.config')).default({ command: 'serve', mode: 'development' } as never);
  const plugins = (Array.isArray(config) ? config[0].plugins : config.plugins) as {
    name?: string;
    transformIndexHtml?: (html: string, ctx: { path?: string }) => unknown;
  }[];
  const plugin = plugins.flat().find((p) => p?.name === 'standby-control');
  const page = String(plugin!.transformIndexHtml!(html, { path: '/games/gunhit/index.html' }));
  const marker = page.indexOf('__gunhit_kv');
  assert.ok(marker > 0, 'the shim is on the page');
  const open = page.lastIndexOf('<script>', marker);
  const close = page.indexOf('</script>', marker);
  return page.slice(open + '<script>'.length, close);
}

interface FakeIndexedDb {
  factory: { open: (name: string, version: number) => unknown };
  rows: Map<string, string>;
  stats: { opens: number; puts: number; deletes: number };
}

const later = (fn: () => void) => setTimeout(fn, 0);

/** Only the calls the shim makes: open, one object store, getAll/put/delete. */
function createFakeIndexedDb(initial: Record<string, string> = {}): FakeIndexedDb {
  const rows = new Map<string, string>(Object.entries(initial));
  const stats = { opens: 0, puts: 0, deletes: 0 };

  const request = (result: unknown) => {
    const req: { result: unknown; onsuccess?: (event: unknown) => void } = { result };
    later(() => req.onsuccess?.({ target: req }));
    return req;
  };

  const db = {
    transaction: () => {
      const tx: { oncomplete?: () => void; objectStore?: () => unknown } = {};
      const objectStore = {
        getAllKeys: () => request([...rows.keys()]),
        getAll: () => request([...rows.values()]),
        put: (value: string, key: string) => { rows.set(key, value); stats.puts += 1; return request(key); },
        delete: (key: string) => { rows.delete(key); stats.deletes += 1; return request(undefined); },
      };
      tx.objectStore = () => objectStore;
      later(() => tx.oncomplete?.());
      return tx;
    },
  };

  return {
    rows,
    stats,
    factory: {
      open: () => {
        stats.opens += 1;
        const req: Record<string, unknown> & { result?: unknown } = { result: db };
        later(() => (req.onupgradeneeded as (() => void) | undefined)?.());
        later(() => (req.onsuccess as (() => void) | undefined)?.());
        return req;
      },
    },
  };
}

function denied(): never {
  throw new DOMException('Access is denied for this document.', 'SecurityError');
}

interface Sandbox {
  window: Record<string, unknown> & { name: string };
  run: (code: string) => unknown;
}

function runShim(shim: string, options: {
  name?: string;
  indexedDb?: FakeIndexedDb['factory'] | null;
  allowStorage?: boolean;
} = {}): Sandbox {
  const scope: Record<string, unknown> = { name: options.name ?? '' };
  scope.setTimeout = setTimeout;
  scope.clearTimeout = clearTimeout;
  scope.console = console;
  scope.document = { visibilityState: 'visible' };
  scope.addEventListener = () => {};

  if (options.allowStorage) {
    const data = new Map<string, string>();
    scope.localStorage = {
      getItem: (k: string) => (data.has(k) ? data.get(k)! : null),
      setItem: (k: string, v: string) => { data.set(k, String(v)); },
      removeItem: (k: string) => { data.delete(k); },
      clear: () => data.clear(),
    };
    scope.sessionStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {}, clear: () => {} };
  } else {
    Object.defineProperty(scope, 'localStorage', { configurable: true, get: denied });
    Object.defineProperty(scope, 'sessionStorage', { configurable: true, get: denied });
  }

  if (options.indexedDb !== undefined) scope.indexedDB = options.indexedDb;

  // A page script also sees these as globals, not only as `window` members.
  const context = vm.createContext({ window: scope, setTimeout, clearTimeout, console });
  // Exactly what a page does with the injected <script>.
  vm.runInContext(shim, context);
  return { window: scope as Sandbox['window'], run: (code) => vm.runInContext(code, context) };
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const NAME_SLOT = '__gunhit_kv';

test('a refused localStorage keeps its values in window.name, which a reload can read back', async () => {
  const shim = await shimSource();
  const seeded = NAME_SLOT + JSON.stringify({ gunhit_coins: '900', gunhit_weapon: 'shotgun' });
  const page = runShim(shim, { name: seeded, indexedDb: null });

  const store = page.window.localStorage as Storage;
  assert.equal(store.getItem('gunhit_coins'), '900', 'window.name is read synchronously, before the first render');
  assert.equal(store.getItem('gunhit_weapon'), 'shotgun');

  store.setItem('gunhit_coins', '940');
  await wait(300);
  const saved = JSON.parse(String(page.window.name).slice(NAME_SLOT.length));
  assert.equal(saved.gunhit_coins, '940', 'writes are flushed into window.name');
  assert.equal(saved.gunhit_weapon, 'shotgun', 'the rest of the save travels with it');

  // Reloading the frame: a fresh shim over the same window.name sees the new value.
  const reloaded = runShim(shim, { name: page.window.name, indexedDb: null });
  assert.equal((reloaded.window.localStorage as Storage).getItem('gunhit_coins'), '940');
});

test('IndexedDB restores the save and reports that it is still loading until then', async () => {
  const shim = await shimSource();
  const idb = createFakeIndexedDb({ gunhit_best: '77', gunhit_coins: '420' });
  const page = runShim(shim, { indexedDb: idb.factory });

  assert.equal(page.window.__gunhitStoragePending, true, 'slide 1 must wait instead of reading defaults');
  const ready = page.window.__gunhitStorageReady as Promise<unknown>;
  assert.equal(typeof (ready as { then?: unknown }).then, 'function');

  await ready;
  assert.equal(page.window.__gunhitStoragePending, false);
  const store = page.window.localStorage as Storage;
  assert.equal(store.getItem('gunhit_best'), '77', 'the stored save is back');
  assert.equal(store.getItem('gunhit_coins'), '420');
});

test('values written while the restore runs win over the stored ones', async () => {
  const shim = await shimSource();
  const idb = createFakeIndexedDb({ gunhit_coins: '1' });
  const page = runShim(shim, { indexedDb: idb.factory });
  const store = page.window.localStorage as Storage;

  store.setItem('gunhit_coins', '5');
  await (page.window.__gunhitStorageReady as Promise<unknown>);
  assert.equal(store.getItem('gunhit_coins'), '5', 'the live session is not rolled back by the restore');
});

test('new values reach IndexedDB too, so they survive a real reload', async () => {
  const shim = await shimSource();
  const idb = createFakeIndexedDb();
  const page = runShim(shim, { indexedDb: idb.factory });
  await (page.window.__gunhitStorageReady as Promise<unknown>);

  const store = page.window.localStorage as Storage;
  store.setItem('gunhit_player_xp', '310');
  await wait(300);
  assert.equal(idb.rows.get('gunhit_player_xp'), '310', 'written through to the database');

  store.removeItem('gunhit_player_xp');
  await wait(300);
  assert.equal(idb.rows.has('gunhit_player_xp'), false, 'removals are written through as well');
});

test('a working localStorage is left untouched and needs no waiting', async () => {
  const shim = await shimSource();
  const idb = createFakeIndexedDb();
  const page = runShim(shim, { indexedDb: idb.factory, allowStorage: true });

  assert.notEqual(page.window.__gunhitStoragePending, true, 'the normal path never shows a waiting state');
  await (page.window.__gunhitStorageReady as Promise<unknown>);
  const store = page.window.localStorage as Storage;
  store.setItem('gunhit_coins', '12');
  assert.equal(store.getItem('gunhit_coins'), '12');
  await wait(300);
  assert.equal(idb.stats.opens, 0, 'no fallback store is opened when the real one works');
});

test('the readiness tracker answers at once when nothing has to be restored', () => {
  const tracker = createReadinessTracker(() => ({ pending: false, settled: null }));
  assert.equal(tracker.isReady(), true);
  let calls = 0;
  tracker.subscribe(() => { calls += 1; })();
  assert.equal(calls, 0, 'a listener added after the fact is not called');
});

test('the readiness tracker waits for the shim and then notifies exactly once', async () => {
  let release: () => void = () => {};
  const settled = new Promise<void>((resolve) => { release = resolve; });
  const tracker = createReadinessTracker(() => ({ pending: true, settled }));

  assert.equal(tracker.isReady(), false, 'the game must not read defaults while the save is loading');
  let calls = 0;
  tracker.subscribe(() => { calls += 1; });

  release();
  await settled;
  await wait(0);
  assert.equal(tracker.isReady(), true);
  assert.equal(calls, 1);
});

test('the restore can finish between the render and the effect, so the gate re-checks', async () => {
  let release: () => void = () => {};
  const settled = new Promise<void>((resolve) => { release = resolve; });
  const tracker = createReadinessTracker(() => ({ pending: true, settled }));

  // Render: not ready yet. The restore lands before React runs the effect.
  assert.equal(tracker.isReady(), false);
  release();
  await settled;
  await wait(0);

  // Effect: subscribing now would never fire, so it must look again.
  let calls = 0;
  tracker.subscribe(() => { calls += 1; });
  assert.equal(calls, 0, 'no late notification is coming');
  assert.equal(tracker.isReady(), true, 'the second look is what unsticks the slide');

  const { readFileSync } = await import('node:fs');
  const { fileURLToPath } = await import('node:url');
  const app = readFileSync(fileURLToPath(new URL('../src/games/gunhit/App.tsx', import.meta.url)), 'utf8');
  assert.ok(app.includes('if (savedValues.isReady()) setReady(true);'),
    'the gate keeps that second look, otherwise the waiting shell never goes away');
});

test('the tracker degrades to ready when the shim never ran or misbehaves', () => {
  assert.equal(createReadinessTracker(() => null).isReady(), true);
  assert.equal(createReadinessTracker(() => { throw new Error('boom'); }).isReady(), true);
  assert.equal(createReadinessTracker(() => ({ pending: true, settled: null })).isReady(), true);
});

test('slide 1 renders only after the saved values are readable', async () => {
  const { readFileSync } = await import('node:fs');
  const { fileURLToPath } = await import('node:url');
  const app = readFileSync(fileURLToPath(new URL('../src/games/gunhit/App.tsx', import.meta.url)), 'utf8');
  assert.ok(app.includes("import { savedValues, storage } from './game/safeStorage'"));
  assert.match(app, /savedValues\.isReady\(\)/, 'the gate asks the tracker');
  assert.match(app, /if \(!ready\) return <div className="h-full w-full bg-\[#0b1418\]" aria-busy="true" \/>/,
    'while waiting it paints the game shell, not a white page');
  const gate = app.slice(app.indexOf('export default function App('), app.indexOf('function GunHitGame('));
  assert.match(gate, /return <GunHitGame onExit=\{onExit\} \/>;/, 'the game mounts once the values are there');
});
