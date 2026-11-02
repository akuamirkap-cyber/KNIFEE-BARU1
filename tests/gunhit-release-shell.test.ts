import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { pushBackHandler, runBackHandlers, clearBackHandlers, backHandlerCount } from '../src/utils/backStack';

const read = (p: string) => fs.readFileSync(path.join(process.cwd(), p), 'utf8');

test('back stack: handler terbaru menang, yang dilepas tidak dipanggil lagi', () => {
  clearBackHandlers();
  const calls: string[] = [];
  pushBackHandler(() => { calls.push('menu'); return false; });
  const offModal = pushBackHandler(() => { calls.push('modal'); return true; });
  pushBackHandler(() => { calls.push('inactive'); return false; });

  // Newest first; the first consumer stops the walk, so 'menu' is never reached.
  assert.equal(backHandlerCount(), 3);
  assert.equal(runBackHandlers(), true);
  assert.deepEqual(calls, ['inactive', 'modal'], 'handler terbaru dicek lebih dulu dan yang true menghentikan pencarian');

  offModal();
  calls.length = 0;
  assert.equal(backHandlerCount(), 2);
  assert.equal(runBackHandlers(), false, 'tanpa consumer, back diteruskan ke app (keluar)');
  assert.deepEqual(calls, ['inactive', 'menu']);
  clearBackHandlers();
});

test('back stack: satu panel rusak tidak mematikan tombol back', () => {
  clearBackHandlers();
  pushBackHandler(() => ({ ok: true } as unknown as boolean)); // truthy, tapi bukan `true`
  pushBackHandler(() => { throw new Error('panel rusak'); });
  const off = pushBackHandler(() => true);
  assert.equal(runBackHandlers(), true, 'handler yang melempar dilewati, sisanya tetap jalan');
  off();
  assert.equal(runBackHandlers(), false, 'nilai truthy non-boolean tidak dihitung sebagai "sudah ditangani"');
  clearBackHandlers();
});

test('font dikemas di dalam app, bukan diambil dari Google Fonts', () => {
  const html = read('index.html');
  assert.doesNotMatch(html, /fonts\.googleapis\.com/, 'tidak ada permintaan font ke internet');
  assert.doesNotMatch(html, /fonts\.gstatic\.com/);

  const fonts = read('src/fonts.css');
  // The faces the UI and the canvas banner actually use, shipped as woff2.
  for (const file of [
    'inter-latin-400-normal.woff2',
    'russo-one-latin-400-normal.woff2',
    'bungee-latin-400-normal.woff2',
    'fredoka-latin-400-normal.woff2',
    'space-grotesk-latin-400-normal.woff2',
  ]) {
    assert.match(fonts, new RegExp(`@fontsource/[a-z-]+/files/${file.replace(/\./g, '\\.')}`), `${file} dikemas`);
  }
  assert.match(fonts, /font-family: 'Russo One'/, 'nama family sama dengan yang dipakai CSS lain');
  assert.match(fonts, /src: url\('@fontsource\/inter\/files\/inter-latin-400-normal\.woff2'\) format\('woff2'\)/);

  const main = read('src/main.tsx');
  assert.ok(
    main.indexOf("import './fonts.css'") >= 0 && main.indexOf("import './fonts.css'") < main.indexOf("import './index.css'"),
    'fonts.css dimuat sebelum style lain',
  );
  const pkg = JSON.parse(read('package.json')) as { dependencies: Record<string, string> };
  for (const dep of ['@fontsource/inter', '@fontsource/russo-one', '@fontsource/bungee', '@fontsource/fredoka', '@fontsource/space-grotesk']) {
    assert.ok(pkg.dependencies[dep], `${dep} jadi dependensi`);
  }
});

test('CSS animasi bersama dimuat saat startup, bukan menunggu chunk lazy', () => {
  const main = read('src/main.tsx');
  const shared = main.indexOf("import './games/perfect-shot/index.css'");
  assert.ok(shared >= 0, 'stylesheet animasi bersama diimpor oleh entry');
  assert.ok(main.indexOf("import './index.css'") < shared, 'urutan sama seperti sebelumnya: index.css dulu, lalu stylesheet bersama');

  // The keyframes the menu needs (bullet, letters, shine) live in that file.
  const css = read('src/games/perfect-shot/index.css');
  for (const name of ['.in-letter', '.in-bullet', '.mm-shine', '.a {']) {
    assert.ok(css.includes(name), `${name} ada di stylesheet bersama`);
  }

  // No lazy chunk may own it: if another module imports it, the bundler hoists
  // the file into a shared chunk and reorders it against src/index.css.
  const importers: string[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(path.join(process.cwd(), dir), { withFileTypes: true })) {
      const rel = `${dir}/${entry.name}`;
      if (entry.isDirectory()) walk(rel);
      else if (/\.tsx?$/.test(entry.name) && !rel.endsWith('src/main.tsx') && read(rel).includes('perfect-shot/index.css')) importers.push(rel);
    }
  };
  walk('src');
  assert.deepEqual(importers, [], 'hanya entry yang mengimpor stylesheet bersama');
});

test('Android: layar dikunci portrait dan plugin back benar-benar terpasang', () => {
  const manifest = read('android/app/src/main/AndroidManifest.xml');
  assert.match(manifest, /android:screenOrientation="portrait"/, 'main activity dikunci portrait');

  const settings = read('android/capacitor.settings.gradle');
  assert.match(settings, /include ':capacitor-app'/, 'plugin @capacitor/app ikut dibuild');
  const buildGradle = read('android/app/capacitor.build.gradle');
  assert.match(buildGradle, /implementation project\(':capacitor-app'\)/);

  const pkg = JSON.parse(read('package.json')) as { dependencies: Record<string, string> };
  assert.ok(pkg.dependencies['@capacitor/app'], '@capacitor/app jadi dependensi');
});

test('Android back di Game A: tutup panel → pause run → hasil balik ke menu', () => {
  const app = read('src/games/gunhit/App.tsx');
  const start = app.indexOf('useAndroidBack(() => {');
  assert.ok(start > 0, 'Game A memasang handler back');
  const slice = app.slice(start, start + 1400);
  assert.ok(
    slice.indexOf('setInGameSettingsOpen(false)') < slice.indexOf("if (screen === 'playing')"),
    'panel pengaturan ditutup sebelum pause diproses',
  );
  assert.match(slice, /if \(screen === 'playing'\) \{ setInGameSettingsOpen\(true\); return true; \}/, 'back saat main = pause, bukan keluar');
  assert.match(slice, /if \(screen === 'over'\) \{ goToMainMenuFromPlay\(\); return true; \}/, 'back di layar hasil = ke menu');
  assert.match(slice, /milestoneGift \|\| weaponCelebration\) return true;/, 'hadiah yang belum diklaim tidak hilang karena back');
  assert.match(slice, /\}, active\);/, 'handler hanya aktif untuk pane yang sedang tampil');

  const hub = read('src/App.tsx');
  assert.match(hub, /installAndroidBack\(\(\) => \{\s*void exitAndroidApp\(\);/);
  assert.doesNotMatch(hub, /activeGame|game-pair/, 'hub satu game: tidak ada lagi perpindahan pane sebelum keluar app');
});
