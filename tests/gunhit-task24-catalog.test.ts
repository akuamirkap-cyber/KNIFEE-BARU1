import test from 'node:test';
import assert from 'node:assert/strict';
import { RETIRED_WEAPONS } from '../src/games/gunhit/game/retiredWeapons';
import { WEAPONS, getWeapon } from '../src/games/gunhit/game/weapons';
import { QUESTS } from '../src/games/gunhit/game/quests';
import {
  UNIQUE_EDITABLE_WEAPONS, getGunVariantOptions, getGunEffectOptions,
  getGunEffect, getGunVariant, getWeaponDefaultExportEntries,
} from '../src/games/gunhit/game/art/gunVariants';

const removed = [
  'helix_pulsar', 'pred', 'yautja', 'chrono_rifle', 'prism_lance',
  'pulse_rifle', 'quantum_destabilizer', 'buster', 'acid', 'anchor',
] as const;

test('all ten retired weapons stay out of the roster, editor, exports, and quest rewards', () => {
  assert.deepEqual([...RETIRED_WEAPONS].sort(), [...removed].sort());
  for (const id of removed) {
    assert.ok(!WEAPONS.some(weapon => weapon.id === id), `${id} cannot be equipped`);
    assert.ok(!UNIQUE_EDITABLE_WEAPONS.includes(id as never), `${id} is not in the editor`);
    assert.deepEqual(getGunVariantOptions(id as never), []);
    assert.deepEqual(getGunEffectOptions(id as never), []);
    assert.ok(!getWeaponDefaultExportEntries('all').some(row => row.id === id));
    assert.ok(!QUESTS.some(quest => quest.rewardWeapon === id), `${id} is not awarded`);
    assert.equal(getWeapon(id).id, 'pistol', 'stale saves fall back to a valid weapon');
  }
  assert.equal(QUESTS.find(quest => quest.id === 's-playerlevel5')?.rewardWeapon, 'mega_buster');
  assert.equal(getWeapon('xeno').id, 'xeno', 'Xenomorph is not the retired Acid Spitter Gun');
  assert.ok(WEAPONS.some(weapon => weapon.id === 'ironman_hand'));
});

test('Xenomorph, Gauntlet, Ironman and Photon offer precisely the requested cards', () => {
  assert.deepEqual(getGunEffectOptions('xeno').map(o => o.id), ['original', 'new', 'set11', 'xeno_hybrid']);
  assert.equal(getGunEffectOptions('xeno')[3].label, 'Efek 4');
  assert.deepEqual(getGunVariantOptions('gauntlet_cannon').map(o => o.id), ['original', 'set6', 'set7', 'set9']);
  assert.deepEqual([getGunVariant('gauntlet_cannon'), getGunEffect('gauntlet_cannon')], ['original', 'set7']);
  assert.deepEqual(getGunVariantOptions('ironman_hand').map(o => o.id), ['set11']);
  assert.deepEqual(getGunEffectOptions('ironman_hand').map(o => o.id), ['ironman_combo']);
  assert.ok(getGunVariantOptions('photon_saber').some(o => o.id === 'set11'), 'the fifth imported skin is retained');
  assert.ok(!getGunEffectOptions('photon_saber').some(o => o.id === 'set11'), 'only its fifth effect was removed');
});

test('Gauntlet migration and Photon repair preserve unrelated choices and never repeat', async () => {
  const old = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const values = new Map<string, string>(Object.entries({
    'gunhit:requested-defaults:v2': '1',
    'gunhit:gun-designs:v3': JSON.stringify({ gauntlet_cannon: 'set9', photon_saber: 'set11', honey: 'current', fish: 'original', pred: 'set11' }),
    'gunhit:shot-effects:v3': JSON.stringify({ gauntlet_cannon: 'new', photon_saber: 'set11', honey: 'new', fish: 'new', pred: 'set11' }),
    'gunhit:default-presets:v1': JSON.stringify({
      photon_saber: { variant: 'set11', effect: 'set11' },
      honey: { variant: 'current', effect: 'new' },
      fish: { variant: 'original', effect: 'new' },
      pred: { variant: 'set11', effect: 'set11' },
    }),
  }));
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, String(value)); },
  };
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: storage });
  try {
    const first = await import('../src/games/gunhit/game/art/gunVariants.ts?task24-migration=1');
    assert.deepEqual([first.getGunVariant('gauntlet_cannon'), first.getGunEffect('gauntlet_cannon')], ['original', 'set7']);
    assert.deepEqual(first.getMarkedGunDefault('gauntlet_cannon'), { variant: 'original', effect: 'set7' });
    assert.deepEqual([first.getGunVariant('photon_saber'), first.getGunEffect('photon_saber')], ['set11', 'set9']);
    assert.deepEqual(first.getMarkedGunDefault('photon_saber'), { variant: 'set11', effect: 'set9' });
    assert.deepEqual([first.getGunVariant('honey'), first.getGunEffect('honey')], ['current', 'new']);
    assert.deepEqual(first.getMarkedGunDefault('fish'), { variant: 'original', effect: 'new' });
    assert.ok(!first.getWeaponDefaultExportEntries('all').some(row => row.id === 'pred'));
    assert.equal(values.get('gunhit:gauntlet-ironman:v1'), '1');

    first.setGunVariant('gauntlet_cannon', 'set9');
    first.setGunEffect('gauntlet_cannon', 'new');
    first.unmarkGunDefault('gauntlet_cannon');
    const again = await import('../src/games/gunhit/game/art/gunVariants.ts?task24-migration=2');
    assert.deepEqual([again.getGunVariant('gauntlet_cannon'), again.getGunEffect('gauntlet_cannon')], ['set9', 'new']);
    assert.equal(again.getMarkedGunDefault('gauntlet_cannon'), null, 'a later player unmark is respected');
    assert.deepEqual(again.getMarkedGunDefault('honey'), { variant: 'current', effect: 'new' });
    assert.deepEqual(again.getMarkedGunDefault('photon_saber'), { variant: 'set11', effect: 'set9' });
  } finally {
    if (old) Object.defineProperty(globalThis, 'localStorage', old);
    else Reflect.deleteProperty(globalThis, 'localStorage');
  }
});
