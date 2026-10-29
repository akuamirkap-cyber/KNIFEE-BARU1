import test from 'node:test';
import assert from 'node:assert/strict';

test('default migration waits for embedded storage hydration before writing or reading choices', async () => {
  const oldStore = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const oldPending = Object.getOwnPropertyDescriptor(globalThis, '__gunhitStoragePending');
  const oldReady = Object.getOwnPropertyDescriptor(globalThis, '__gunhitStorageReady');
  const values = new Map<string, string>();
  const writes: string[] = [];
  const store = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { writes.push(key); values.set(key, String(value)); },
  };
  let finish!: () => void;
  const ready = new Promise<void>(resolve => { finish = resolve; });
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: store });
  Object.defineProperty(globalThis, '__gunhitStoragePending', { configurable: true, writable: true, value: true });
  Object.defineProperty(globalThis, '__gunhitStorageReady', { configurable: true, value: ready });
  try {
    const m = await import('../src/games/gunhit/game/art/gunVariants');
    assert.deepEqual(writes, [], 'an import cannot erase values still being restored');
    values.set('gunhit:requested-defaults:v1', '1');
    values.set('gunhit:gun-designs:v3', JSON.stringify({ fish: 'set7', seed: 'set7', honey: 'current', pistol: 'set9' }));
    values.set('gunhit:shot-effects:v3', JSON.stringify({ fish: 'original', seed: 'new', honey: 'new', pistol: 'set11' }));
    values.set('gunhit:pistol-loadout:v2', '1');
    values.set('gunhit:default-presets:v1', JSON.stringify({ honey: { variant: 'current', effect: 'new' } }));
    (globalThis as typeof globalThis & { __gunhitStoragePending: boolean }).__gunhitStoragePending = false;
    finish();
    await ready;
    await Promise.resolve();
    assert.deepEqual([m.getGunVariant('fish'), m.getGunEffect('fish')], ['current', 'set7']);
    assert.deepEqual([m.getGunVariant('seed'), m.getGunEffect('seed')], ['original', 'set7']);
    assert.deepEqual([m.getGunVariant('honey'), m.getGunEffect('honey')], ['current', 'new']);
    assert.deepEqual([m.getGunVariant('pistol'), m.getGunEffect('pistol')], ['set9', 'set11']);
    assert.deepEqual(m.getMarkedGunDefault('honey'), { variant: 'current', effect: 'new' });
    assert.equal(m.getMarkedGunDefaultCount(), 32);
    assert.equal(values.get('gunhit:requested-defaults:v2'), '1');
  } finally {
    if (oldStore) Object.defineProperty(globalThis, 'localStorage', oldStore);
    else Reflect.deleteProperty(globalThis, 'localStorage');
    if (oldPending) Object.defineProperty(globalThis, '__gunhitStoragePending', oldPending);
    else Reflect.deleteProperty(globalThis, '__gunhitStoragePending');
    if (oldReady) Object.defineProperty(globalThis, '__gunhitStorageReady', oldReady);
    else Reflect.deleteProperty(globalThis, '__gunhitStorageReady');
  }
});
