import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { createSafeStorage } from '../src/games/gunhit/game/safeStorage';

/**
 * A browser inside the preview's cross-origin frame refuses `localStorage`
 * outright: the *property* throws `SecurityError`, it does not return null.
 * Slide 1 read its coins/weapon/collection/quests during the first render, so
 * that throw unmounted the tree and the hub came up blank.
 */
function deniedSource(): Storage {
  throw new DOMException('Access is denied for this document.', 'SecurityError');
}

function fakeStorage(overrides: Partial<Storage> = {}): Storage {
  const data = new Map<string, string>();
  return {
    getItem: (k: string) => (data.has(k) ? data.get(k)! : null),
    setItem: (k: string, v: string) => { data.set(k, String(v)); },
    removeItem: (k: string) => { data.delete(k); },
    clear: () => data.clear(),
    key: (i: number) => [...data.keys()][i] ?? null,
    get length() { return data.size; },
    ...overrides,
  } as Storage;
}

test('storage that is denied outright still answers reads and writes', () => {
  const store = createSafeStorage(deniedSource);
  // None of these may throw: they run inside the first render.
  assert.equal(store.getItem('gunhit_coins'), null);
  assert.doesNotThrow(() => store.setItem('gunhit_coins', '250'));
  assert.equal(store.getItem('gunhit_coins'), '250', 'a refused store keeps the session in memory');
  assert.doesNotThrow(() => store.removeItem('gunhit_coins'));
  assert.equal(store.getItem('gunhit_coins'), null);
});

test('a store that rejects calls falls back the same way', () => {
  const store = createSafeStorage(() => fakeStorage({
    getItem: () => { throw new DOMException('blocked', 'SecurityError'); },
    setItem: () => { throw new DOMException('QuotaExceededError', 'QuotaExceededError'); },
  }));
  assert.doesNotThrow(() => store.setItem('gunhit_weapon', 'pistol'));
  assert.equal(store.getItem('gunhit_weapon'), 'pistol');
});

test('a working store is still used, so progress is saved for real', () => {
  const real = fakeStorage();
  const store = createSafeStorage(() => real);
  store.setItem('gunhit_best', '42');
  assert.equal(real.getItem('gunhit_best'), '42', 'the browser store is the source of truth');
  assert.equal(store.getItem('gunhit_best'), '42');
  real.setItem('gunhit_best', '99'); // another tab
  assert.equal(store.getItem('gunhit_best'), '99');
  store.removeItem('gunhit_best');
  assert.equal(real.getItem('gunhit_best'), null);
});

test('slide 1 reads storage only through the safe store', () => {
  const app = readFileSync(fileURLToPath(new URL('../src/games/gunhit/App.tsx', import.meta.url)), 'utf8');
  assert.ok(!/\blocalStorage\b/.test(app),
    'App.tsx must not touch localStorage directly: one SecurityError blanks the hub');
  assert.match(app, /import \{ storage \} from '\.\/game\/safeStorage'/);
});

test('every page is served with the storage shim before its modules', async () => {
  const config = (await import('../vite.config')).default({ command: 'serve', mode: 'development' } as never);
  const plugins = (Array.isArray(config) ? config[0].plugins : config.plugins) as {
    name?: string;
    transformIndexHtml?: (html: string, ctx: { path?: string }) => unknown;
  }[];
  const plugin = plugins.flat().find((p) => p?.name === 'standby-control');
  assert.ok(plugin?.transformIndexHtml, 'the standby plugin also installs the storage shim');
  const html = '<!doctype html><html><head><title>x</title></head><body><div id="root"></div></body></html>';
  for (const path of ['/index.html', '/games/game-2/index.html', '/games/game-8/index.html', '/games/gunhit/index.html']) {
    const out = String(plugin!.transformIndexHtml!(html, { path }));
    assert.ok(out.includes('__storage_probe'), `${path} carries the shim`);
    assert.ok(out.indexOf('__storage_probe') < out.indexOf('</head>'), `${path}: shim runs first`);
  }
  // Idempotent: transforming twice must not stack two shims.
  const once = String(plugin!.transformIndexHtml!(html, { path: '/games/game-4/index.html' }));
  const twice = String(plugin!.transformIndexHtml!(once, { path: '/games/game-4/index.html' }));
  assert.equal(twice.match(/__storage_probe/g)?.length, 1);
});
