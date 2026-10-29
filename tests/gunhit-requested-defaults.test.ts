import test from 'node:test';
import assert from 'node:assert/strict';

// Literal export from the player: both the card IDs and their visible numbers
// must continue to match. These expectations are intentionally independent of
// the implementation's factory-preset table.
const requested = [
  ['ak47', 'original', 1, 3, 'set11', 4, 4],
  ['crossbow', 'original', 1, 2, 'set7', 3, 3],
  ['laser', 'set7', 2, 2, 'original', 1, 2],
  ['fish', 'current', 2, 3, 'set7', 3, 3],
  ['rpg', 'original', 1, 3, 'set7', 3, 4],
  ['cricket', 'current', 2, 3, 'new', 2, 3],
  ['bazooka', 'set7', 2, 3, 'set7', 3, 4],
  ['freeze', 'original', 1, 2, 'set7', 3, 3],
  ['blackhole', 'set1', 3, 3, 'new', 2, 2],
  ['slingshot', 'original', 1, 2, 'new', 2, 2],
  ['blowgun', 'set1', 2, 2, 'new', 2, 2],
  ['shotgun', 'original', 1, 2, 'original', 1, 2],
  ['soaker', 'set1', 2, 3, 'set2', 3, 3],
  ['snowball', 'set7', 2, 2, 'set7', 3, 3],
  ['sniper', 'original', 1, 4, 'set9', 4, 5],
  ['flamethrower', 'original', 1, 2, 'set7', 3, 3],
  ['bubble', 'original', 1, 2, 'set7', 3, 3],
  ['bamboo', 'original', 1, 3, 'set7', 3, 4],
  ['banana', 'original', 1, 2, 'new', 2, 3],
  ['harpoon', 'set7', 2, 2, 'set7', 3, 3],
  ['chicken', 'set7', 4, 4, 'set7', 3, 3],
  ['confetti', 'set7', 2, 2, 'set7', 3, 3],
  ['seed', 'original', 1, 2, 'set7', 3, 3],
  ['pizza', 'original', 1, 2, 'set7', 3, 3],
  ['minigun', 'set7', 2, 2, 'new', 2, 3],
  ['railgun', 'set11', 5, 5, 'set7', 4, 6],
  ['magnet', 'original', 1, 2, 'set7', 3, 3],
  ['shrink', 'set7', 2, 2, 'set7', 3, 3],
  ['pirate', 'original', 1, 2, 'set7', 3, 3],
  ['card', 'set7', 2, 2, 'set7', 3, 3],
] as const;

type GunVariantsModule = typeof import('../src/games/gunhit/game/art/gunVariants');
let run = 0;
async function freshModule(): Promise<GunVariantsModule> {
  // A separate module instance simulates the next page load and re-reads storage.
  return import(`../src/games/gunhit/game/art/gunVariants.ts?requested-test=${++run}`);
}
function mockStorage(values: Record<string, string> = {}) {
  const data = new Map(Object.entries(values));
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => { data.set(key, String(value)); },
    removeItem: (key: string) => { data.delete(key); },
    data,
  };
}
async function withStorage<T>(store: ReturnType<typeof mockStorage>, fn: () => Promise<T>): Promise<T> {
  const old = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: store });
  try { return await fn(); }
  finally {
    if (old) Object.defineProperty(globalThis, 'localStorage', old);
    else Reflect.deleteProperty(globalThis, 'localStorage');
  }
}
function assertRequestedDefaults(m: GunVariantsModule) {
  for (const [id, skin, skinNo, skinTotal, effect, effectNo, effectTotal] of requested) {
    assert.equal(m.getGunVariant(id), skin, `${id} skin`);
    assert.equal(m.getGunEffect(id), effect, `${id} shot`);
    assert.ok(m.getGunVariantOptions(id).some(option => option.id === skin), `${id} skin is selectable`);
    assert.ok(m.getGunEffectOptions(id).some(option => option.id === effect), `${id} effect is selectable`);
    const pos = m.getGunSkinAndEffectPosition(id);
    assert.deepEqual([pos.skinId, pos.skinNo, pos.skinTotal, pos.effectId, pos.effectNo, pos.effectTotal],
      [skin, skinNo, skinTotal, effect, effectNo, effectTotal], `${id} visible card positions`);
    assert.deepEqual(m.getMarkedGunDefault(id), { variant: skin, effect }, `${id} marked preset`);
    assert.equal(m.isCurrentSelectionMarkedDefault(id), true, `${id} is visibly marked`);
    assert.equal(m.isGunModifiedFromFactory(id), false, `${id} is a factory default`);
  }
}

test('all 30 supplied skin and effect cards are marked factory defaults on a fresh profile', async () => {
  await withStorage(mockStorage(), async () => {
    const m = await freshModule();
    assertRequestedDefaults(m);
    assert.equal(m.getMarkedGunDefaultCount(), 31);
    const entries = m.getWeaponDefaultExportEntries('marked_only');
    assert.equal(entries.length, 31);
    assert.deepEqual(m.getMarkedGunDefault('gauntlet_cannon'), { variant: 'original', effect: 'set7' });
    for (const row of requested) {
      const entry = entries.find(e => e.id === row[0]);
      assert.ok(entry, `${row[0]} appears in the bulk export`);
      assert.deepEqual([entry.skinId, entry.skinNo, entry.skinTotal, entry.effectId, entry.effectNo, entry.effectTotal],
        [row[1], row[2], row[3], row[4], row[5], row[6]]);
      assert.equal(entry.marked, true);
      assert.equal(entry.changedFromFactory, false);
    }
    assert.match(m.formatWeaponDefaultsExport('marked_only'), /fish \| .* \| skin=2\/3\(current:Sekarang\) \| efek=3\/3\(set7:Slide 3\) \| ★DEFAULT/);
    assert.match(m.formatWeaponDefaultsExport('marked_only'), /soaker \| .* \| skin=2\/3\(set1:Slide 3\) \| efek=3\/3\(set2:Firework\) \| ★DEFAULT/);
    assert.deepEqual([m.getGunVariant('pistol'), m.getGunEffect('pistol')], ['original', 'set9']);
    assert.deepEqual([m.getGunVariant('golden'), m.getGunEffect('golden')], ['set1', 'new']);
    assert.deepEqual([m.getGunVariant('honey'), m.getGunEffect('honey')], ['set7', 'set7']);
    assert.equal(m.isGunDefaultMarked('pistol'), false);
  });
});

test('upgrade replaces only the 30 old selections and marks, preserving other saved weapons', async () => {
  const store = mockStorage({
    'gunhit:requested-defaults:v1': '1',
    'gunhit:gun-designs:v3': JSON.stringify({ fish: 'set7', ak47: 'set11', chicken: 'original', seed: 'set7', minigun: 'original', pistol: 'set9', golden: 'latest', honey: 'current' }),
    'gunhit:shot-effects:v3': JSON.stringify({ fish: 'original', laser: 'set7', chicken: 'new', seed: 'original', railgun: 'set11', pistol: 'set11', golden: 'original', honey: 'new' }),
    'gunhit:pistol-loadout:v2': '1',
    'gunhit:default-presets:v1': JSON.stringify({ fish: { variant: 'set7', effect: 'original' }, seed: { variant: 'set7', effect: 'original' }, pistol: { variant: 'set9', effect: 'set11' }, honey: { variant: 'current', effect: 'new' } }),
  });
  await withStorage(store, async () => {
    const m = await freshModule();
    assertRequestedDefaults(m);
    assert.deepEqual([m.getGunVariant('pistol'), m.getGunEffect('pistol')], ['set9', 'set11']);
    assert.deepEqual([m.getGunVariant('golden'), m.getGunEffect('golden')], ['latest', 'original']);
    assert.deepEqual([m.getGunVariant('honey'), m.getGunEffect('honey')], ['current', 'new']);
    assert.deepEqual(m.getMarkedGunDefault('pistol'), { variant: 'set9', effect: 'set11' });
    assert.deepEqual(m.getMarkedGunDefault('honey'), { variant: 'current', effect: 'new' });
    assert.equal(m.getMarkedGunDefaultCount(), 33);
    assert.equal(store.getItem('gunhit:requested-defaults:v2'), '1');

    // Player changes after the upgrade must not be overwritten on each load.
    m.setGunVariant('fish', 'original');
    m.setGunEffect('fish', 'new');
    m.unmarkGunDefault('fish');
    const reloaded = await freshModule();
    assert.deepEqual([reloaded.getGunVariant('fish'), reloaded.getGunEffect('fish')], ['original', 'new']);
    assert.equal(reloaded.getMarkedGunDefault('fish'), null);
    assert.equal(reloaded.isGunModifiedFromFactory('fish'), true);
    assert.deepEqual([reloaded.getGunVariant('pistol'), reloaded.getGunEffect('pistol')], ['set9', 'set11']);
    assert.deepEqual(reloaded.markGunDefault('fish', 'original', 'new'), { variant: 'original', effect: 'new' });
    const remarked = await freshModule();
    assert.deepEqual(remarked.getMarkedGunDefault('fish'), { variant: 'original', effect: 'new' });
    remarked.clearAllMarkedGunDefaults();
    const cleared = await freshModule();
    assert.equal(cleared.getMarkedGunDefaultCount(), 0, 'clear all stays cleared after reload');
    assert.deepEqual([cleared.getGunVariant('fish'), cleared.getGunEffect('fish')], ['original', 'new']);
  });
});

test('legacy chicken saves and denied or malformed storage still fall back to the new defaults', async () => {
  await withStorage(mockStorage({
    'gunhit:gun-designs:v1': JSON.stringify({ chicken: 'original' }),
    'gunhit:shot-effects:v1': JSON.stringify({ chicken: 'new' }),
    'gunhit:gun-designs:v3': '{not json',
    'gunhit:default-presets:v1': '[]',
  }), async () => assertRequestedDefaults(await freshModule()));

  const old = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, get: () => { throw new Error('denied'); } });
  try { assertRequestedDefaults(await freshModule()); }
  finally {
    if (old) Object.defineProperty(globalThis, 'localStorage', old);
    else Reflect.deleteProperty(globalThis, 'localStorage');
  }
});
