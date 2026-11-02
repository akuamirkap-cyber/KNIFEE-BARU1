/**
 * Periksa aset toko tanpa merender ulang apa pun.
 *
 * Usage: npx tsx tools/check-store-assets.ts
 *
 * Dipakai CI (`.github/workflows/ci.yml`) dan `npm run check:store`. Yang
 * diperiksa persis syarat Play Console: ukuran, format, dan (untuk ikon) tidak
 * boleh ada transparansi — supaya build tidak pernah berhenti di halaman unggah
 * karena gambar yang "kelihatan benar" ternyata 1023 px atau masih alpha.
 */
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const problems: string[] = [];
const checked: string[] = [];

/** Lebar/tinggi dari header PNG (IHDR) + apakah ada kanal alpha. */
function pngInfo(file: string) {
  const buffer = readFileSync(file);
  const signature = buffer.subarray(0, 8).toString('hex');
  if (signature !== '89504e470d0a1a0a') return null;
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  const bitDepth = buffer[24];
  const colorType = buffer[25];
  // 4 = grayscale+alpha, 6 = RGBA. Play rejects transparency on the icon.
  const hasAlpha = colorType === 4 || colorType === 6;
  return { width, height, bitDepth, colorType, hasAlpha };
}

function expect(file: string, width: number, height: number, options: { noAlpha?: boolean } = {}) {
  const full = path.join(ROOT, file);
  if (!existsSync(full)) {
    problems.push(`${file}: missing`);
    return;
  }
  const info = pngInfo(full);
  if (!info) {
    problems.push(`${file}: not a PNG`);
    return;
  }
  if (info.width !== width || info.height !== height) {
    problems.push(`${file}: ${info.width}×${info.height}, expected ${width}×${height}`);
  }
  if (options.noAlpha && info.hasAlpha) {
    problems.push(`${file}: has an alpha channel, Play Console wants none for the icon`);
  }
  checked.push(`${file} ${info.width}×${info.height}`);
}

const listingFile = path.join(ROOT, 'store/listing-en.md');
const listingId = path.join(ROOT, 'store/listing-id.md');

expect('store/icon-512.png', 512, 512);
expect('store/feature-graphic-1024x500.png', 1024, 500);
for (const shot of [1, 2, 3, 4]) {
  expect(`store/screenshots/phone-0${shot}.png`, 1080, 1920);
}

for (const [file, label] of [
  [listingFile, 'store/listing-en.md'],
  [listingId, 'store/listing-id.md'],
] as const) {
  if (!existsSync(file)) {
    problems.push(`${label}: missing`);
    continue;
  }
  const text = readFileSync(file, 'utf8');
  // The fenced blocks are what gets pasted into Play Console: the short
  // description has an 80-character limit, the full one 4000.
  const blocks = [...text.matchAll(/```\n([\s\S]*?)```/g)].map((match) => match[1].trim());
  const short = blocks.find((block) => block.length <= 80 && !block.includes('\n') && block.length > 20);
  if (!short) problems.push(`${label}: no short description block found (≤80 chars)`);
  const full = blocks.find((block) => block.length > 500);
  if (!full) problems.push(`${label}: no full description block found`);
  else if (full.length > 4000) problems.push(`${label}: full description is ${full.length} chars (max 4000)`);
  const whatsNew = blocks.find((block) => block.startsWith('First release') || block.startsWith('Rilis pertama'));
  if (!whatsNew) problems.push(`${label}: no "what's new" block found`);
  else if (whatsNew.length > 500) problems.push(`${label}: what's new is ${whatsNew.length} chars (max 500)`);
  checked.push(`${label} listing blocks`);
}

if (problems.length) {
  console.error('Store assets are not uploadable:');
  for (const problem of problems) console.error('  ✗', problem);
  process.exit(1);
}

console.log('Store assets OK:');
for (const line of checked) console.log('  ✓', line);
