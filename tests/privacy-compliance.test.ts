import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import test from 'node:test';
import PrivacyPage from '../src/components/PrivacyPage';
import {
  PRIVACY_CONTACT_EMAIL,
  PRIVACY_SECTIONS_EN,
  PRIVACY_SECTIONS_ID,
  privacyPolicyMarkdown,
} from '../src/legal/privacyPolicy';

const ROOT = process.cwd();
const read = (file: string) => readFileSync(path.join(ROOT, file), 'utf8');

function walk(dir: string): string[] {
  return readdirSync(path.join(ROOT, dir), { withFileTypes: true }).flatMap((entry) => {
    const rel = path.posix.join(dir, entry.name);
    return entry.isDirectory() ? walk(rel) : [rel];
  });
}

test('docs/PRIVACY.md identik dengan teks di aplikasi', () => {
  assert.ok(existsSync(path.join(ROOT, 'docs/PRIVACY.md')), 'docs/PRIVACY.md ada');
  // The doc is generated from src/legal/privacyPolicy.ts, so the page the player
  // reads in-app and the page Play Console links to can never disagree.
  assert.equal(read('docs/PRIVACY.md'), privacyPolicyMarkdown());
  const scripts = (JSON.parse(read('package.json')) as { scripts: Record<string, string> }).scripts;
  assert.ok(scripts['docs:privacy'].includes('tools/write-privacy-doc.ts'));

  const markdown = privacyPolicyMarkdown();
  assert.ok(markdown.includes(PRIVACY_CONTACT_EMAIL), 'email kontak ada di dokumen');
  assert.ok(markdown.includes('`com.gamearcade.hub`'), 'nama paket ada di dokumen');
  assert.ok(/^# English$/m.test(markdown), 'ada versi bahasa Inggris');
  for (const section of [...PRIVACY_SECTIONS_ID, ...PRIVACY_SECTIONS_EN]) {
    assert.ok(section.paragraphs.length > 0, `section ${section.id} punya isi`);
  }
});

test('kontak privasi berupa email sungguhan, bukan placeholder', () => {
  assert.match(PRIVACY_CONTACT_EMAIL, /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i);
  assert.ok(!/contoh|example|ganti|placeholder|todo/i.test(PRIVACY_CONTACT_EMAIL));
  for (const file of ['docs/PRIVACY.md', 'docs/DATA-SAFETY.md', 'docs/CONTENT-RATING.md', 'src/legal/privacyPolicy.ts']) {
    const text = read(file);
    assert.ok(!/GANTI_EMAIL|TODO|TBD/i.test(text), `${file} bebas placeholder`);
  }
});

test('klaim privasi cocok dengan isi aplikasi', () => {
  // 1) No ad / analytics / crash-reporting SDK ships with the app.
  const pkg = JSON.parse(read('package.json')) as { dependencies: Record<string, string>; devDependencies: Record<string, string> };
  const allDeps = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies }).join(' ').toLowerCase();
  for (const banned of ['admob', 'firebase', 'analytics', 'sentry', 'crashlytics', 'facebook', 'appsflyer', 'onesignal', 'amplitude', 'mixpanel']) {
    assert.ok(!allDeps.includes(banned), `tidak ada dependensi ${banned}`);
  }

  // 2) The web bundle performs no network requests.
  for (const file of walk('src')) {
    if (!/\.(ts|tsx)$/.test(file)) continue;
    const source = read(file);
    for (const pattern of [/\bfetch\s*\(/, /new XMLHttpRequest/, /navigator\.sendBeacon/, /new WebSocket/]) {
      assert.ok(!pattern.test(source), `${file} tidak memakai ${pattern}`);
    }
  }

  // 3) Only INTERNET is requested, and no advertising ID permission.
  const manifest = read('android/app/src/main/AndroidManifest.xml');
  const permissions = [...manifest.matchAll(/<uses-permission android:name="([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(permissions, ['android.permission.INTERNET']);
  assert.ok(!manifest.includes('AD_ID'));

  // 4) A stored-save key really is local-only: the game never posts progress.
  const source = walk('src').filter((f) => /\.(ts|tsx)$/.test(f)).map(read).join('\n');
  assert.ok(!/https?:\/\/(?!localhost)/.test(source.replace(/https?:\/\/www\.w3\.org[^"'`\s]*/g, '')), 'tidak ada URL eksternal di src');
});

test('halaman privasi ada di dalam game dan bisa dibuka dari Pengaturan', () => {
  const page = read('src/components/PrivacyPage.tsx');
  assert.ok(page.includes("from '../legal/privacyPolicy'"));
  assert.ok(page.includes('PRIVACY_SECTIONS_ID') && page.includes('PRIVACY_SECTIONS_EN'));
  assert.ok(page.includes('mailto:'), 'kontak bisa ditekan');

  const settings = read('src/games/gunhit/components/SgaSettingsPanel.tsx');
  assert.ok(settings.includes('onPrivacy'), 'panel pengaturan menerima handler privasi');
  assert.ok(settings.includes('KEBIJAKAN PRIVASI'), 'ada tombol KEBIJAKAN PRIVASI');

  const app = read('src/games/gunhit/App.tsx');
  assert.ok(app.includes("import PrivacyPage from '../../components/PrivacyPage';"));
  assert.ok(app.includes('onPrivacy={() => setPrivacyOpen(true)}'));
  assert.ok(app.includes('<PrivacyPage onClose={() => setPrivacyOpen(false)} />'));
  // Back closes the policy before any menu screen; the Part 7 overlays that can
  // sit on top of it (CARA MAIN, konfirmasi reset) take priority over it.
  assert.match(app, /if \(privacyOpen\) \{ setPrivacyOpen\(false\); return true; \}/);
  const back = app.slice(app.indexOf('useAndroidBack(() => {'));
  assert.ok(back.indexOf('if (helpOpen)') < back.indexOf('if (privacyOpen)'));
  assert.ok(back.indexOf('if (resetOpen)') < back.indexOf('if (privacyOpen)'));
});

test('dokumen Data Safety & content rating siap dipakai', () => {
  const safety = read('docs/DATA-SAFETY.md');
  assert.ok(safety.includes('Does your app collect or share any of the required user data types?'));
  assert.ok(safety.includes('**No**'));
  assert.ok(safety.includes('**Ya** — "Hapus data" di setelan Android atau uninstall'));
  assert.ok(safety.includes('AD_ID'));
  assert.ok(safety.includes('docs/PRIVACY.md'));

  const rating = read('docs/CONTENT-RATING.md');
  assert.ok(rating.includes('IARC'));
  assert.ok(rating.includes('PEGI 7'));
  assert.ok(rating.includes('loot box') || rating.includes('Loot box'));
  assert.ok(rating.includes('**Tidak**'), 'ada jawaban negatif yang eksplisit');
  assert.ok(rating.includes('13+'));
});

test('halaman privasi benar-benar merender teks kebijakan', () => {
  const html = renderToStaticMarkup(createElement(PrivacyPage, { onClose: () => {} }));
  // Judul, tombol bahasa, dan isi kebijakan versi Indonesia harus ikut ter-render.
  assert.ok(html.includes('KEBIJAKAN PRIVASI'));
  assert.ok(html.includes('Ringkasan'));
  assert.ok(html.includes('Data yang tidak kami kumpulkan'));
  assert.ok(html.includes(PRIVACY_CONTACT_EMAIL));
  assert.ok(html.includes(`mailto:${PRIVACY_CONTACT_EMAIL}`));
  for (const section of PRIVACY_SECTIONS_ID) {
    // React escapes '&' in the markup, so compare against the escaped title.
    const escaped = section.title.replace(/&/g, '&amp;');
    assert.ok(html.includes(escaped), `bagian "${section.title}" tampil`);
  }
});
