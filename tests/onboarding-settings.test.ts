import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { catalog, t, tList, type StringKey } from '../src/i18n/catalog';
import {
  LANGUAGE_STORAGE_KEY,
  detectLanguage,
  getLanguage,
  resetLanguageForTests,
  setLanguage,
  subscribeLanguage,
} from '../src/i18n/language';
import { HOW_TO_PLAY_SEEN_KEY, markHowToPlaySeen, shouldShowHowToPlay } from '../src/storage/firstRun';
import { PROGRESS_KEYS, SETTINGS_KEYS_KEPT, resetProgress } from '../src/storage/resetProgress';
import type { KeyValueStore } from '../src/games/gunhit/game/safeStorage';
import HowToPlayPage from '../src/games/gunhit/components/HowToPlayPage';
import ResetProgressDialog from '../src/games/gunhit/components/ResetProgressDialog';

const ROOT = process.cwd();
const read = (file: string) => readFileSync(path.join(ROOT, file), 'utf8');

function fakeStore(seed: Record<string, string> = {}): KeyValueStore & { data: Map<string, string> } {
  const data = new Map(Object.entries(seed));
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
    removeItem: (key) => void data.delete(key),
  };
}

test('katalog dua bahasa lengkap dan seimbang', () => {
  const idKeys = Object.keys(catalog.id).sort();
  const enKeys = Object.keys(catalog.en).sort();
  assert.deepEqual(enKeys, idKeys, 'setiap kunci ada di kedua bahasa');

  for (const key of idKeys as StringKey[]) {
    assert.ok(t('id', key).trim().length > 0, `id ${key} tidak kosong`);
    assert.ok(t('en', key).trim().length > 0, `en ${key} tidak kosong`);
  }
  assert.equal(tList('id', 'help.steps').length, tList('en', 'help.steps').length, 'jumlah langkah sama');
  assert.ok(tList('id', 'help.steps').length >= 5);
  // Bahasa yang tidak dikenal jatuh ke teks Indonesia, bukan string kosong.
  assert.equal(t('id', 'help.title'), 'CARA MAIN');
  assert.equal(t('en', 'help.title'), 'HOW TO PLAY');
});

test('bahasa disimpan, diteruskan ke pelanggan, dan tidak merusak apa pun', () => {
  resetLanguageForTests();
  const store = fakeStore();
  assert.equal(getLanguage(store), detectLanguage());

  const seen: string[] = [];
  const unsubscribe = subscribeLanguage((language) => seen.push(language));

  setLanguage('en', store);
  assert.equal(store.getItem(LANGUAGE_STORAGE_KEY), 'en');
  assert.deepEqual(seen, ['en']);
  assert.equal(getLanguage(store), 'en');

  resetLanguageForTests();
  setLanguage('id', store);
  assert.equal(getLanguage(store), 'id', 'pilihan tersimpan dibaca lagi');

  unsubscribe();
  resetLanguageForTests();
  assert.equal(detectLanguage('en-US'), 'en');
  assert.equal(detectLanguage('id-ID'), 'id');
  assert.equal(detectLanguage('fr-FR'), 'id');
});

test('CARA MAIN muncul sekali lalu tidak lagi', () => {
  const store = fakeStore();
  assert.equal(shouldShowHowToPlay(store), true, 'pemain baru melihat CARA MAIN');
  markHowToPlaySeen(store);
  assert.equal(store.getItem(HOW_TO_PLAY_SEEN_KEY), '1');
  assert.equal(shouldShowHowToPlay(store), false);

  // Storage yang menolak dibaca: jangan menagih layar itu di setiap launch.
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
  assert.equal(shouldShowHowToPlay(broken), false);
  assert.doesNotThrow(() => markHowToPlaySeen(broken));
});

test('reset progres menghapus kemajuan, tapi pengaturan tetap', () => {
  const seed: Record<string, string> = {
    gunhit_best: '1200',
    gunhit_best_level: '7',
    gunhit_coins: '540',
    gunhit_diamonds: '12',
    gunhit_weapon: 'ak47',
    gunhit_owned_weapons: 'pistol,ak47',
    gunhit_rare_owned: 'ak47',
    gunhit_quests_state: '{"stagesWon":9}',
    gunhit_player_xp: '300',
    gunhit_player_level: '3',
    gunhit_all_stages_open: '1',
    gunhit_runs_v1: '{"v":1,"c":"x","d":[]}',
    gunhit_save_meta: '{"v":2,"c":"x","d":{}}',
    gunhit_volume: '0.4',
    gunhit_game_speed: '1.2',
    gunhit_menu_theme: 'night',
    gunhit_orientation: 'landscape',
    'sga.language.v1': 'en',
    'sga.onboarding.v1': '1',
  };
  const store = fakeStore(seed);

  const result = resetProgress(store);

  for (const key of PROGRESS_KEYS) {
    assert.equal(store.getItem(key), null, `${key} terhapus`);
    assert.ok(result.cleared.includes(key), `${key} dilaporkan terhapus`);
  }
  for (const key of SETTINGS_KEYS_KEPT) {
    assert.equal(store.getItem(key), seed[key], `${key} tetap`);
  }
  assert.ok(result.kept.length === SETTINGS_KEYS_KEPT.length);

  // Idempoten & aman saat storage menolak.
  const again = resetProgress(store);
  assert.deepEqual(again.cleared, []);
  assert.doesNotThrow(() =>
    resetProgress({
      getItem: () => {
        throw new Error('nope');
      },
      setItem: () => {
        throw new Error('nope');
      },
      removeItem: () => {
        throw new Error('nope');
      },
    }),
  );
});

test('layar CARA MAIN dan dialog reset benar-benar merender teks', () => {
  resetLanguageForTests();
  setLanguage('id');
  const help = renderToStaticMarkup(createElement(HowToPlayPage, { onClose: () => {}, firstRun: true }));
  assert.ok(help.includes('CARA MAIN'));
  assert.ok(help.includes('MENGERTI, MULAI!'));
  assert.ok(help.includes('Sentuh layar untuk menembak'));
  assert.ok(help.includes('Sekali ini saja'));

  setLanguage('en');
  const helpEn = renderToStaticMarkup(createElement(HowToPlayPage, { onClose: () => {} }));
  assert.ok(helpEn.includes('HOW TO PLAY'));
  assert.ok(helpEn.includes('GOT IT, LET’S GO!'));

  // Kembali ke Indonesia: dialog membaca bahasa yang sama dengan layar lain.
  setLanguage('id');
  const dialog = renderToStaticMarkup(createElement(ResetProgressDialog, { onCancel: () => {}, onConfirm: () => {} }));
  assert.ok(dialog.includes('HAPUS SEMUA PROGRES?'));
  assert.ok(dialog.includes('YA, HAPUS'));
  assert.ok(dialog.includes('BATAL'));

  // Setelah dikonfirmasi, dialog memberi tahu bahwa progres sudah dihapus.
  const done = renderToStaticMarkup(
    createElement(ResetProgressDialog, { done: true, onCancel: () => {}, onConfirm: () => {} }),
  );
  assert.ok(done.includes('Progres dihapus'));
  assert.ok(!done.includes('YA, HAPUS'), 'tombol hapus tidak tampil dua kali');
  resetLanguageForTests();
});

test('pengaturan menyediakan bahasa, CARA MAIN, dan reset; App memasangnya', () => {
  const settings = read('src/games/gunhit/components/SgaSettingsPanel.tsx');
  assert.ok(settings.includes('onLanguage'));
  assert.ok(settings.includes('LANGUAGES.map'));
  assert.ok(settings.includes("t(language, 'settings.help')"));
  assert.ok(settings.includes("t(language, 'settings.reset')"));

  const app = read('src/games/gunhit/App.tsx');
  assert.ok(app.includes('const [language, changeLanguage] = useLanguage();'));
  assert.ok(app.includes('onHelp={() => setHelpOpen(true)}'));
  assert.ok(app.includes('setResetOpen(true);'));
  assert.ok(app.includes('setResetDone(false);'), 'membuka dialog selalu mulai dari keadaan belum dihapus');
  assert.ok(app.includes('if (!shouldShowHowToPlay(storage)) return;'), 'CARA MAIN otomatis sekali');
  assert.ok(app.includes('markHowToPlaySeen(storage)'));
  assert.ok(app.includes('resetProgress(storage);'));
  assert.ok(
    app.includes('window.setTimeout(() => window.location.reload(), 800)'),
    'reset memuat ulang agar semua layar membaca save kosong, setelah konfirmasi singkat',
  );
  // Back menutup CARA MAIN lebih dulu daripada panel lain, dan tidak boleh
  // menutup dialog yang sedang menunggu reload.
  assert.match(app, /useAndroidBack\(\(\) => \{\n\s+if \(helpOpen\) \{ closeHelp\(\); return true; \}\n\s+if \(resetOpen\) \{/);
  assert.match(app, /if \(!resetDone\) setResetOpen\(false\);/);
});
