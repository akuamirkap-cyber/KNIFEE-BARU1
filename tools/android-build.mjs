#!/usr/bin/env node
/**
 * Build the Android release artifact from the command line, on any platform.
 *
 *   node tools/android-build.mjs apk     -> assembleRelease  (.apk, untuk install/tes)
 *   node tools/android-build.mjs aab     -> bundleRelease    (.aab, untuk Play Console)
 *
 * Jalankan lewat `npm run build:apk` / `npm run build:aab`, yang sudah melakukan
 * `vite build` + `cap sync android` lebih dulu.
 *
 * Hasil build disalin ke `release/<AppName>-v<versionName>-release.<ext>` supaya
 * tidak perlu mencari di dalam folder `android/app/build/outputs`.
 */
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const ROOT = process.cwd();
const ANDROID_DIR = path.join(ROOT, 'android');
const kind = (process.argv[2] || 'apk').toLowerCase();

if (!['apk', 'aab'].includes(kind)) {
  console.error(`Jenis build tidak dikenal: ${kind}. Pakai "apk" atau "aab".`);
  process.exit(2);
}

function readVersion() {
  const file = path.join(ANDROID_DIR, 'version.properties');
  const out = { versionCode: '1', versionName: '1.0.0' };
  if (!existsSync(file)) return out;
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = /^\s*(versionCode|versionName)\s*=\s*(.+?)\s*$/.exec(line);
    if (match) out[match[1]] = match[2];
  }
  return out;
}

const isWindows = process.platform === 'win32';
const gradle = path.join(ANDROID_DIR, isWindows ? 'gradlew.bat' : 'gradlew');
if (!existsSync(gradle)) {
  console.error(`Gradle wrapper tidak ditemukan: ${gradle}`);
  process.exit(2);
}

const { versionCode, versionName } = readVersion();
const task = kind === 'aab' ? 'bundleRelease' : 'assembleRelease';

console.log(`\n==> ${task}  (versionCode ${versionCode}, versionName ${versionName})`);
if (!existsSync(path.join(ANDROID_DIR, 'keystore.properties'))) {
  console.warn(
    '    [PERINGATAN] android/keystore.properties belum ada: build release akan\n' +
      '    ditandatangani dengan debug key. Buat keystore dulu (tools/make-keystore.sh\n' +
      '    atau BUILD-APK.bat) supaya bisa diupload ke Play Console.',
  );
}

const result = spawnSync(gradle, [task], {
  cwd: ANDROID_DIR,
  stdio: 'inherit',
  shell: isWindows,
  env: { ...process.env, JAVA_TOOL_OPTIONS: process.env.JAVA_TOOL_OPTIONS ?? '' },
});
if (result.status !== 0) {
  console.error(`\n[GAGAL] ${task} keluar dengan kode ${result.status}.`);
  process.exit(result.status ?? 1);
}

const built =
  kind === 'aab'
    ? path.join(ANDROID_DIR, 'app/build/outputs/bundle/release/app-release.aab')
    : path.join(ANDROID_DIR, 'app/build/outputs/apk/release/app-release.apk');

if (!existsSync(built)) {
  console.error(`\n[GAGAL] Hasil build tidak ditemukan: ${built}`);
  process.exit(1);
}

const releaseDir = path.join(ROOT, 'release');
mkdirSync(releaseDir, { recursive: true });
const target = path.join(releaseDir, `GameArcadeHub-v${versionName}-release.${kind}`);
copyFileSync(built, target);

const mb = (readFileSync(target).length / (1024 * 1024)).toFixed(1);
console.log(`\n==> Selesai: ${target}  (${mb} MB)`);
if (kind === 'aab') {
  console.log('    Upload file .aab ini ke Play Console (Production / Closed testing).');
} else {
  console.log('    Install ke HP: adb install -r "' + target + '"');
}
