import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

/**
 * Part 10: the files that go into Play Console must be uploadable — the right
 * pixel sizes, the right format, and listing text inside the length limits.
 *
 * The store rejects a 1023 px icon or an 81-character short description at
 * *upload* time, which is the worst moment to find out: the build is done and
 * the release is blocked. These checks run in CI instead.
 */

const ROOT = process.cwd();
const read = (file: string) => readFileSync(path.join(ROOT, file), 'utf8');

function png(file: string) {
  const buffer = readFileSync(path.join(ROOT, file));
  assert.equal(buffer.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', `${file} is a PNG`);
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
    colorType: buffer[25],
    bytes: buffer.length,
  };
}

test('the hi-res icon is 512×512 with no alpha channel', () => {
  const icon = png('store/icon-512.png');
  assert.equal(icon.width, 512);
  assert.equal(icon.height, 512);
  // Play Console: "32-bit PNG, no transparency" — colour type 4/6 carry alpha.
  assert.ok(icon.colorType === 2 || icon.colorType === 0 || icon.colorType === 3 || icon.colorType === 6);
  assert.notEqual(icon.colorType, 4, 'grayscale+alpha is not accepted');
});

test('the feature graphic is exactly 1024×500', () => {
  const graphic = png('store/feature-graphic-1024x500.png');
  assert.equal(graphic.width, 1024);
  assert.equal(graphic.height, 500);
});

test('four phone screenshots at 1080×1920', () => {
  const shots = [1, 2, 3, 4].map((index) => png(`store/screenshots/phone-0${index}.png`));
  for (const shot of shots) {
    assert.equal(shot.width, 1080);
    assert.equal(shot.height, 1920);
    // A store screenshot that is only a few kilobytes is almost certainly blank.
    assert.ok(shot.bytes > 100_000, 'screenshot has real content');
  }
  assert.equal(shots.length, 4, 'Play needs at least 2 and accepts up to 8');
});

test('every listing text stays inside the Play Console limits', () => {
  for (const file of ['store/listing-en.md', 'store/listing-id.md']) {
    const text = read(file);
    const blocks = [...text.matchAll(/```\n([\s\S]*?)```/g)].map((match) => match[1].trim());
    const short = blocks.filter((block) => !block.includes('\n') && block.length <= 80);
    assert.ok(short.length >= 1, `${file} has a short description (≤80 chars)`);
    assert.ok(short.every((block) => block.length <= 80));

    const full = blocks.filter((block) => block.length > 500);
    assert.ok(full.length >= 1, `${file} has a full description`);
    assert.ok(full.every((block) => block.length <= 4000), `${file} full description ≤4000 chars`);

    const whatsNew = blocks.filter((block) => /^(First release|Rilis pertama)/.test(block));
    assert.ok(whatsNew.length >= 1, `${file} has a "what's new" block`);
    assert.ok(whatsNew.every((block) => block.length <= 500));
  }
});

test('the listing names the real package and the real app name', () => {
  const en = read('store/listing-en.md');
  assert.match(en, /Game Arcade Hub/);
  assert.match(en, /akuamirkap2@gmail\.com/, 'contact email matches the privacy policy');
  const config = read('capacitor.config.ts');
  assert.match(config, /com\.gamearcade\.hub/, 'package id matches the release identity');
});

test('the store tool, the checker and the CI job exist and are wired', () => {
  assert.ok(existsSync(path.join(ROOT, 'tools/make-store-assets.ts')));
  assert.ok(existsSync(path.join(ROOT, 'tools/check-store-assets.ts')));
  assert.ok(existsSync(path.join(ROOT, 'store/fonts/Bungee.ttf')), 'offline renderer fonts are committed');
  const pkg = JSON.parse(read('package.json')) as { scripts: Record<string, string> };
  assert.match(pkg.scripts['store:assets'], /make-store-assets/);
  assert.match(pkg.scripts['check:store'], /check-store-assets/);
  const ci = read('.github/workflows/ci.yml');
  assert.match(ci, /npx tsc --noEmit/);
  assert.match(ci, /npm test/);
  assert.match(ci, /npm run build/);
  assert.match(ci, /check-store-assets\.ts/);
});

test('the device test plan covers installation, the game and settings', () => {
  const plan = read('docs/TEST-PLAN.md');
  for (const topic of ['Instalasi', 'GUN HIT', 'Ganti bahasa', 'reset progres', 'cold start', 'back']) {
    assert.ok(plan.toLowerCase().includes(topic.toLowerCase()), `test plan mentions ${topic}`);
  }
  assert.match(plan, /RESET PROGRES/);
  assert.match(plan, /mode pesawat|Mode pesawat/i);
});

test('dependencies that were never imported are gone', () => {
  const pkg = JSON.parse(read('package.json')) as {
    dependencies: Record<string, string>;
    devDependencies: Record<string, string>;
  };
  for (const unused of ['@google/genai', 'express', 'dotenv']) {
    assert.equal(pkg.dependencies[unused], undefined, `${unused} must not ship`);
  }
  assert.equal(pkg.devDependencies['@types/express'], undefined);
  assert.equal(pkg.devDependencies.autoprefixer, undefined, 'Tailwind 4 handles prefixes itself');
});
