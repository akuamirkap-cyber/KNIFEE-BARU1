import assert from 'node:assert/strict';
import test from 'node:test';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { makeLevel } from '../src/games/gunhit/game/Game';
import {
  getGunHitMapNodeCaption,
  getGunHitMapNodeTheme,
  getGunHitMapStage,
  GUN_HIT_MAP_BOSS_NAMES,
  GUN_HIT_MAP_BOSS_ROTATION,
  GUN_HIT_MAP_MAX_LEVEL,
} from '../src/games/gunhit/game/stageMap';
import { BOSS_CATALOG } from '../src/games/gunhit/game/bossCatalog';
import { bossHeadFor } from '../src/games/gunhit/game/bossIdentity';
import { HEAD_INFO, HEAD_KINDS } from '../src/games/perfect-shot/play/HeadArt';

const ROOT = path.resolve(import.meta.dirname, '..');
const read = (file: string) => readFileSync(path.join(ROOT, file), 'utf8');

test('the 100-stage SGA map mirrors the existing normal, special, boss cycle', () => {
  assert.equal(GUN_HIT_MAP_MAX_LEVEL, 100);
  for (let stage = 1; stage <= GUN_HIT_MAP_MAX_LEVEL; stage++) {
    const actual = makeLevel(stage);
    const expected = actual.boss ? 'boss'
      : ['boulder', 'bonus', 'treasure'].includes(actual.mode) ? 'special'
      : 'normal';
    assert.equal(getGunHitMapStage(stage), expected, `map stage ${stage} must match Game.makeLevel`);
  }
});

test('every boss node on the map is one of Game B\'s eleven bosses', () => {
  const rows = [
    ['Gentong', 'Perisai', 'Goblin'],
    ['Bijih besi', 'Landasan', 'Prajurit'],
    ['Lentera gelap', 'Perisai hitam', 'Bayangan'],
    ['Mahkota', 'Perisai kerajaan', 'Pengawal'],
    ['Kristal void', 'Perisai retak', 'Penjaga gelap'],
    ['Lentera Jepang', 'Topeng Oni', 'Goblin samurai'],
    ['Arang', 'Perisai api', 'Penjaga merah'],
    ['Genderang', 'Tameng', 'Prajurit Oni'],
    ['Mahkota iblis', 'Segel', 'Pengawal iblis'],
    ['Bendera', 'Katana', 'Samurai'],
    ['Roda gigi', 'Pelat baja', 'Robot penjaga'],
    ['Chip', 'Perisai energi', 'Drone'],
    ['Inti reaktor', 'Armor berat', 'Robot tempur'],
    ['Kristal energi', 'Kubah', 'Drone plasma'],
    ['Baterai', 'Armor berat', 'Robot elit'],
    ['Tong mesiu', 'Jangkar', 'Bajak laut'],
    ['Lentera hantu', 'Jangkar karat', 'Kerangka'],
    ['Kompas', 'Meriam', 'Penjaga kerangka'],
    ['Mutiara gelap', 'Karang', 'Penjaga laut'],
    ['Peti harta', 'Pedang kerajaan', 'Pengawal elite'],
  ];
  rows.forEach((row, cycle) => {
    const firstStage = cycle * 5 + 1;
    assert.deepEqual([0, 1, 2].map(offset => getGunHitMapNodeTheme(firstStage + offset).label), row);
    assert.equal(getGunHitMapNodeTheme(firstStage + 3).label, 'Spesial');
  });
  // Twenty boss fights, but exactly eleven bosses: every boss label is one of
  // Game B's heads, paired with the head art that stage really wears.
  assert.deepEqual(GUN_HIT_MAP_BOSS_NAMES, BOSS_CATALOG.map((boss) => boss.title));
  assert.equal(GUN_HIT_MAP_BOSS_NAMES.length, 11);
  assert.deepEqual(GUN_HIT_MAP_BOSS_ROTATION, GUN_HIT_MAP_BOSS_ROTATION.slice());
  for (let stage = 5; stage <= 100; stage += 5) {
    const label = getGunHitMapNodeTheme(stage).label;
    const head = bossHeadFor(stage)!;
    assert.ok(head, `stage ${stage} wears a Game B head`);
    assert.equal(label, HEAD_INFO[head].name, `stage ${stage} is named after its own head`);
    assert.equal(getGunHitMapNodeCaption(stage), `${HEAD_INFO[head].name.toUpperCase()} LV${stage}`);
  }
  const legacyNames = ['Dark Knight', 'Iron Knight', 'Shadow Knight', 'Royal Knight', 'Void Knight', 'Oni Demon', 'Flame Oni', 'War Oni', 'Demon Emperor', 'Oni Shogun', 'Mecha Cyborg', 'Cyber Warden', 'Omega Mecha', 'Nova Cyborg', 'Final Mecha', 'Pirate Lord', 'Ghost Captain', 'Cursed Admiral', 'Abyss Pirate', 'Pirate King'];
  for (let stage = 5; stage <= 100; stage += 5) {
    assert.ok(!legacyNames.includes(getGunHitMapNodeTheme(stage).label),
      `stage ${stage}: Game A's own boss names are gone`);
  }
  assert.equal(getGunHitMapNodeCaption(1), 'GENTONG LV1');
  assert.equal(getGunHitMapNodeCaption(3), 'GOBLIN LV3');
  assert.match(getGunHitMapNodeCaption(5), /^PIRATE CAPTAIN LV5$/);
  const map = read('src/games/gunhit/components/LevelMap.tsx');
  assert.ok(map.includes('>QUEST</h2>'));
  assert.ok(map.includes('getGunHitMapNodeTheme(level)'));
  assert.ok(map.includes('bossProfileFor(level)'));
});

test('all eleven Game B heads are bosses of Game A, and nothing else is', () => {
  const heads = Array.from({ length: 11 }, (_, i) => bossHeadFor((i + 1) * 5));
  assert.deepEqual(heads, HEAD_KINDS);
  for (let head = 0; head < HEAD_KINDS.length; head++) {
    assert.equal(BOSS_CATALOG[head].head, HEAD_KINDS[head]);
    assert.equal(BOSS_CATALOG[head].name, HEAD_INFO[HEAD_KINDS[head]].name.toUpperCase());
  }
  // Game A's own four bosses are deleted, not renamed.
  const roots = ['src/games/gunhit/game/bossRoster.ts', 'src/games/gunhit/game/bossRenderer.ts',
    'src/games/gunhit/game/bossAssetProcessor.ts', 'src/games/gunhit/game/bossAssetWorker.ts',
    'src/games/gunhit/game/bossAssetPixels.ts'];
  for (const file of roots) {
    assert.equal(existsSync(path.join(ROOT, file)), false, `${file} must be gone`);
  }
  assert.equal(existsSync(path.join(ROOT, 'public/bosses')), false, 'the four Game A boss PNGs are deleted');
  const pkg = read('src/games/gunhit/game/bossCatalog.ts');
  assert.match(pkg, /BOSS_CATALOG/);
  assert.ok(!read('src/games/gunhit/game/Game.ts').includes('BOSS_NAMES'));
});

test('the SGB slide is removed and its map entrance/active-node effects are reused in SGA QUEST', () => {
  const app = read('src/App.tsx');
  const map = read('src/games/gunhit/components/LevelMap.tsx');
  assert.ok(app.includes("type SlideId = 'gunhit'"));
  assert.ok(!app.includes('KnifeHitGame'));
  assert.ok(!app.includes("id: 'knife'"));
  for (const effect of ['fade-in', 'fade-up', 'tap-hint', 'ring-ping', 'thin-scroll']) {
    assert.ok(map.includes(effect), `SGA QUEST map reuses the ${effect} effect from SGB's map`);
  }
});

test('starting a map node launches that real SGA level without replacing stage generation', () => {
  const game = read('src/games/gunhit/game/Game.ts');
  const map = read('src/games/gunhit/components/LevelMap.tsx');
  const app = read('src/games/gunhit/App.tsx');
  assert.ok(game.includes('startAtLevel(\n    level: number,\n    weaponHandoff = false,'));
  assert.ok(map.includes('Stage spesial SGA: sistem tetap memilih Batu, Bonus, atau Harta Karun'));
  // The engine is its own chunk now, so the run is queued through `whenEngine`
  // and starts the same SGA level the moment that chunk is in.
  assert.ok(app.includes('whenEngine((engine) => {'));
  assert.ok(app.includes('else engine.startAtLevel(level, wantsWeaponFlight, gunEntryDelay, true, wheelEntryDelay, gunHiddenFor);'));
});
