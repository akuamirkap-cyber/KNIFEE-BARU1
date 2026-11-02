import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const ROOT = process.cwd();
const read = (file: string) => readFileSync(path.join(ROOT, file), 'utf8');
const RES = 'android/app/src/main/res';

/** Width/height straight from the PNG header, without pulling in an image library. */
function pngSize(file: string) {
  const buffer = readFileSync(path.join(ROOT, file));
  assert.equal(buffer.subarray(1, 4).toString('ascii'), 'PNG', `${file} is a PNG`);
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20), colorType: buffer[25] };
}

test('identitas rilis satu sumber: appId & nama app konsisten', () => {
  const config = read('capacitor.config.ts');
  assert.match(config, /appId:\s*'com\.gamearcade\.hub'/);
  assert.match(config, /appName:\s*'Game Arcade Hub'/);

  const strings = read(`${RES}/values/strings.xml`);
  assert.match(strings, /<string name="app_name">Game Arcade Hub<\/string>/);
  assert.match(strings, /<string name="package_name">com\.gamearcade\.hub<\/string>/);

  const gradle = read('android/app/build.gradle');
  assert.match(gradle, /namespace = "com\.gamearcade\.hub"/);
  assert.match(gradle, /applicationId "com\.gamearcade\.hub"/);

  const manifest = read('android/app/src/main/AndroidManifest.xml');
  assert.match(manifest, /android:label="@string\/app_name"/);
  assert.match(manifest, /android:icon="@mipmap\/ic_launcher"/);
  assert.match(manifest, /android:roundIcon="@mipmap\/ic_launcher_round"/);
  assert.match(manifest, /android:screenOrientation="portrait"/);
  // Predictive back would bypass @capacitor/app's back button handling.
  assert.match(manifest, /android:enableOnBackInvokedCallback="false"/);
  assert.match(manifest, /android:theme="@style\/AppTheme\.NoActionBarLaunch"/);
});

test('versionCode & versionName hanya diatur dari android/version.properties', () => {
  assert.ok(existsSync(path.join(ROOT, 'android/version.properties')));
  const version = read('android/version.properties');
  const code = /^versionCode\s*=\s*(\d+)\s*$/m.exec(version);
  const name = /^versionName\s*=\s*(\d+\.\d+\.\d+)\s*$/m.exec(version);
  assert.ok(code, 'versionCode berupa angka');
  assert.ok(name, 'versionName berupa x.y.z');
  assert.ok(Number(code![1]) >= 1);

  const gradle = read('android/app/build.gradle');
  assert.match(gradle, /def versionPropertiesFile = rootProject\.file\("version\.properties"\)/);
  assert.match(gradle, /versionCode appVersionCode/);
  assert.match(gradle, /versionName appVersionName/);
  // No hard-coded version may survive next to the properties file.
  assert.ok(!/versionCode\s+\d+\s*$/m.test(gradle), 'versionCode tidak di-hardcode');
  assert.ok(!/versionName\s+"[0-9.]+"\s*$/m.test(gradle), 'versionName tidak di-hardcode');

  const bat = read('BUILD-APK.bat');
  assert.ok(bat.includes('version.properties'), 'BUILD-APK.bat membaca version.properties');

  const scripts = (JSON.parse(read('package.json')) as { scripts: Record<string, string> }).scripts;
  assert.ok(scripts['build:apk'].includes('tools/android-build.mjs apk'));
  assert.ok(scripts['build:aab'].includes('tools/android-build.mjs aab'));
  assert.ok(scripts['version:bump'].includes('tools/bump-version.mjs'));
});

test('adaptive icon: semua density ada dan emblem di dalam safe zone', () => {
  const legacy: Record<string, number> = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 };
  const canvas: Record<string, number> = { mdpi: 108, hdpi: 162, xhdpi: 216, xxhdpi: 324, xxxhdpi: 432 };
  for (const [density, size] of Object.entries(legacy)) {
    const square = pngSize(`${RES}/mipmap-${density}/ic_launcher.png`);
    assert.deepEqual([square.width, square.height], [size, size], `ic_launcher ${density}`);
    const round = pngSize(`${RES}/mipmap-${density}/ic_launcher_round.png`);
    assert.deepEqual([round.width, round.height], [size, size], `ic_launcher_round ${density}`);
    // The adaptive foreground is a 108dp canvas; the artwork inside is 74% of it.
    const foreground = pngSize(`${RES}/mipmap-${density}/ic_launcher_foreground.png`);
    assert.deepEqual([foreground.width, foreground.height], [canvas[density], canvas[density]], `foreground ${density}`);
  }

  const adaptive = read(`${RES}/mipmap-anydpi-v26/ic_launcher.xml`);
  assert.match(adaptive, /<background android:drawable="@color\/ic_launcher_background"/);
  assert.match(adaptive, /<foreground android:drawable="@mipmap\/ic_launcher_foreground"/);
  assert.match(read(`${RES}/values/ic_launcher_background.xml`), /<color name="ic_launcher_background">#0D1627<\/color>/);
  // The generator keeps the whole artwork inside the safe circle.
  assert.match(read('tools/make-android-assets.sh'), /art=\$\(\( canvas \* 74 \/ 100 \)\)/);
});

test('splash screen: Android 12 API + fallback lama, bukan gambar landscape', () => {
  const styles = read(`${RES}/values/styles.xml`);
  assert.match(styles, /<style name="AppTheme\.NoActionBarLaunch" parent="Theme\.SplashScreen">/);
  assert.match(styles, /<item name="windowSplashScreenBackground">@color\/splash_background<\/item>/);
  assert.match(styles, /<item name="windowSplashScreenAnimatedIcon">@drawable\/splash_logo<\/item>/);
  assert.match(styles, /<item name="postSplashScreenTheme">@style\/AppTheme\.NoActionBar<\/item>/);
  assert.match(styles, /<item name="android:windowBackground">@drawable\/splash<\/item>/);
  // System bars follow the artwork instead of flashing white.
  assert.match(styles, /<item name="android:statusBarColor">@color\/status_bar<\/item>/);
  assert.match(styles, /<item name="android:navigationBarColor">@color\/navigation_bar<\/item>/);
  assert.match(styles, /<item name="android:windowLightStatusBar">false<\/item>/);

  assert.ok(existsSync(path.join(ROOT, `${RES}/drawable/splash.xml`)), 'splash.xml ada');
  const logo = pngSize(`${RES}/drawable-nodpi/splash_logo.png`);
  assert.ok(logo.width >= 512 && logo.width === logo.height, 'logo splash persegi minimal 512px');

  const leftovers = readdirSync(path.join(ROOT, RES)).filter((dir) => /^drawable-(port|land)/.test(dir));
  assert.deepEqual(leftovers, [], 'tidak ada lagi splash landscape per-density');
  assert.ok(!existsSync(path.join(ROOT, `${RES}/drawable/splash.png`)), 'PNG splash lama sudah dihapus');

  const colors = read(`${RES}/values/colors.xml`);
  assert.match(colors, /<color name="splash_background">#0D1627<\/color>/);
  assert.match(colors, /<color name="status_bar">#0B0E14<\/color>/);
});

test('build rilis: skrip APK/AAB, keystore, dan dokumentasi', () => {
  assert.ok(existsSync(path.join(ROOT, 'tools/android-build.mjs')));
  const build = read('tools/android-build.mjs');
  assert.match(build, /bundleRelease/);
  assert.match(build, /assembleRelease/);
  assert.match(build, /release\/?\$?/, 'hasil disalin ke release/');
  assert.ok(existsSync(path.join(ROOT, 'tools/make-keystore.sh')));
  assert.ok(existsSync(path.join(ROOT, 'tools/bump-version.mjs')));

  const gradle = read('android/app/build.gradle');
  assert.match(gradle, /signingConfig hasReleaseKeystore \? signingConfigs\.release : signingConfigs\.debug/);

  const ignore = read('.gitignore');
  assert.ok(ignore.includes('android/keystore.properties'));
  assert.ok(ignore.includes('android/*.keystore'));

  const docs = read('BUILD-APK.md');
  for (const topic of ['npm run build:aab', 'android/version.properties', 'tools/make-keystore.sh', 'windowSplashScreenAnimatedIcon']) {
    assert.ok(docs.includes(topic), `BUILD-APK.md menjelaskan ${topic}`);
  }
});

test('setiap referensi resource Android terdefinisi (build resource tidak gagal)', () => {
  // A dangling @color/@drawable/@style reference fails the Gradle resource link
  // step, and the APK simply never appears — exactly the class of bug this test
  // is here to catch before a build is attempted.
  const resDir = path.join(ROOT, RES);
  const walk = (dir: string): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const full = path.join(dir, entry.name);
      return entry.isDirectory() ? walk(full) : [full];
    });

  const files = walk(resDir);
  const defined = new Set<string>();
  for (const file of files) {
    const folder = path.basename(path.dirname(file));
    if (file.endsWith('.xml')) {
      const xml = readFileSync(file, 'utf8');
      for (const match of xml.matchAll(/<(color|string|style|dimen|bool|integer)\s+name="([^"]+)"/g)) {
        defined.add(`${match[1]}/${match[2]}`);
      }
      const base = path.basename(file, '.xml');
      const kind = folder.startsWith('mipmap') ? 'mipmap' : folder.startsWith('drawable') ? 'drawable' : folder.startsWith('xml') ? 'xml' : folder.startsWith('layout') ? 'layout' : null;
      if (kind) defined.add(`${kind}/${base}`);
    } else {
      const base = path.basename(file).replace(/\.[^.]+$/, '');
      const kind = folder.startsWith('mipmap') ? 'mipmap' : folder.startsWith('drawable') ? 'drawable' : folder.startsWith('xml') ? 'xml' : folder.startsWith('layout') ? 'layout' : null;
      if (kind) defined.add(`${kind}/${base}`);
    }
  }

  // AppCompat's theme attributes are resolved by the framework, not by us.
  const frameworkPrefix = new Set(['android']);
  const missing: string[] = [];
  for (const file of files.filter((f) => f.endsWith('.xml'))) {
    const xml = readFileSync(file, 'utf8');
    for (const match of xml.matchAll(/@(color|drawable|mipmap|string|style|xml|layout)\/([A-Za-z0-9_.]+)/g)) {
      if (frameworkPrefix.has(match[1])) continue;
      const key = `${match[1]}/${match[2]}`;
      if (!defined.has(key)) missing.push(`${path.relative(ROOT, file)} -> @${key}`);
    }
  }
  assert.deepEqual(missing, []);
});
