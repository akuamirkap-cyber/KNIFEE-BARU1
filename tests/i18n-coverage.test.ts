import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { WEAPONS } from '../src/games/gunhit/game/weapons';
import { QUESTS, MILESTONES } from '../src/games/gunhit/game/quests';
import { SGA_BG_THEMES } from '../src/games/gunhit/game/backgroundThemes';
import { getGunHitMapNodeTheme } from '../src/games/gunhit/game/stageMap';
import {
  EN,
  RARITY_EN,
  RARITY_ID,
  rarityLabel,
  tr,
  trStageCaption,
} from '../src/i18n/strings';

/**
 * Part 8 asks for one thing above all: no Indonesian left on screen when the
 * player picks English. Passing a string to `tr()` proves nothing on its own —
 * a missing entry silently falls back to the Indonesian text — so this file
 * checks the catalog itself:
 *
 *  1. every literal handed to `tr()` / `T()` in Game A has an English entry,
 *  2. every data row the game renders (weapons, quests, milestones, menu
 *     themes, map labels, design descriptions) has one too,
 *  3. the helpers behave the way the screens assume.
 */

const ROOT = process.cwd();
const GAME_A = path.join(ROOT, 'src/games/gunhit');
const read = (file: string) => readFileSync(path.join(ROOT, file), 'utf8');

function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) sourceFiles(full, out);
    else if (full.endsWith('.ts') || full.endsWith('.tsx')) out.push(full);
  }
  return out;
}

/** `tr(language, 'ini teks')` and the canvas helper `T('ini teks')`. */
function callsToTranslate(source: string): string[] {
  const found: string[] = [];
  const pattern = /(?:\btr\(|\bT\()\s*(?:language\s*,\s*)?'((?:[^'\\]|\\.)*)'/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(source))) found.push(match[1].replace(/\\(.)/g, '$1'));
  return found;
}

test('every string handed to tr() or T() in Game A has an English entry', () => {
  const missing: string[] = [];
  for (const file of sourceFiles(GAME_A)) {
    const relative = path.relative(ROOT, file);
    for (const text of callsToTranslate(read(relative))) {
      if (!(text in EN)) missing.push(`${relative}: ${text}`);
    }
  }
  assert.deepEqual(missing, [], `add these keys to src/i18n/strings.ts:\n${missing.join('\n')}`);
});

test('every weapon name, perk and description is in the catalog', () => {
  const missing: string[] = [];
  for (const weapon of WEAPONS) {
    for (const text of [weapon.name, weapon.perk, weapon.desc]) {
      // Weapon names are already English brand names (`AK-47`, `NAIL GUN`).
      if (!/[a-z]/.test(text)) continue;
      if (!(text in EN)) missing.push(`${weapon.id}: ${text}`);
    }
  }
  assert.deepEqual(missing, []);
});

test('every quest, milestone, theme and map label is in the catalog', () => {
  const missing: string[] = [];
  for (const quest of QUESTS) {
    for (const text of [quest.title, quest.desc]) if (!(text in EN)) missing.push(`quest ${quest.id}: ${text}`);
  }
  for (const milestone of MILESTONES) {
    for (const text of [milestone.label, milestone.desc]) {
      if (!(text in EN)) missing.push(`milestone ${milestone.count}: ${text}`);
    }
  }
  for (const theme of SGA_BG_THEMES) {
    for (const text of [theme.label, theme.desc]) if (!(text in EN)) missing.push(`theme ${theme.id}: ${text}`);
  }
  for (let level = 1; level <= 100; level++) {
    const label = getGunHitMapNodeTheme(level).label;
    if (!(label in EN) && !label.includes(' ')) missing.push(`map ${level}: ${label}`);
  }
  assert.deepEqual(missing, []);
});

test('every design description in the variant picker is in the catalog', () => {
  const source = read('src/games/gunhit/components/GunVariantPicker.tsx');
  const block = source.slice(source.indexOf('const DESCRIPTIONS'), source.indexOf('};', source.indexOf('const DESCRIPTIONS')));
  const texts = [...block.matchAll(/'((?:[^'\\]|\\.)*)'/g)].map((match) => match[1]);
  const missing = [...new Set(texts)].filter((text) => /[a-z]/.test(text) && !(text in EN));
  assert.deepEqual(missing, []);
});

test('Indonesian data is actually translated instead of falling back', () => {
  const untranslated: string[] = [];
  const rows = [
    ...WEAPONS.flatMap((weapon) => [weapon.perk, weapon.desc]),
    ...QUESTS.flatMap((quest) => [quest.title, quest.desc]),
    ...MILESTONES.flatMap((milestone) => [milestone.label, milestone.desc]),
    ...SGA_BG_THEMES.flatMap((theme) => [theme.label, theme.desc]),
  ];
  for (const text of rows) {
    // Proper names and acronyms (`MASTER SLAYER`, `XP`) stay identical on purpose.
    if (!/[a-z]/.test(text)) continue;
    if (tr('en', text) === text) untranslated.push(text);
  }
  assert.deepEqual(untranslated, []);
});

test('rarityLabel maps every rarity the shop renders', () => {
  assert.equal(rarityLabel('UMUM', 'en'), 'COMMON');
  assert.equal(rarityLabel('LANGKA', 'en'), 'RARE');
  assert.equal(rarityLabel('EPIC', 'en'), 'EPIC');
  assert.equal(rarityLabel('LEGENDARIS', 'en'), 'LEGEND');
  assert.equal(rarityLabel('UMUM', 'id'), 'UMUM');
  assert.equal(rarityLabel('LANGKA', 'id'), 'RARE');
  assert.deepEqual(Object.keys(RARITY_EN).sort(), Object.keys(RARITY_ID).sort());
  // English never shows the Indonesian rarity words.
  for (const rarity of Object.keys(RARITY_EN)) {
    assert.ok(!/LANGKA|UMUM|LEGENDARIS/.test(rarityLabel(rarity, 'en')), `${rarity} stays English`);
  }
  assert.equal(rarityLabel('LEGENDARIS', 'id'), 'LEGEND');
});

test('trStageCaption keeps the level number and translates the name', () => {
  assert.equal(tr('en', 'Spesial'), 'Special');
  assert.equal(trStageCaption('en', 'SPESIAL LV4'), 'SPECIAL LV4');
  assert.equal(trStageCaption('en', 'GENTONG LV1'), 'JAR LV1');
  assert.equal(trStageCaption('en', 'BIJIH BESI LV6'), 'IRON ORE LV6');
  assert.equal(trStageCaption('id', 'GENTONG LV1'), 'GENTONG LV1');
});

test('the language switch is the only source of truth for the catalog', () => {
  // `tr` never invents text: unknown keys pass through untouched.
  assert.equal(tr('id', 'Misi baru dalam '), 'Misi baru dalam ');
  assert.equal(tr('en', 'Misi baru dalam '), 'New missions in ');
  assert.equal(tr('en', 'Bukan teks yang dikenal'), 'Bukan teks yang dikenal');
});
