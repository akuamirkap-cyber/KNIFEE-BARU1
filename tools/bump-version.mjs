#!/usr/bin/env node
/**
 * Naikkan versi rilis di android/version.properties.
 *
 *   npm run version:bump            -> patch  (1.0.0 -> 1.0.1, versionCode +1)
 *   npm run version:bump -- minor   -> minor  (1.0.1 -> 1.1.0, versionCode +1)
 *   npm run version:bump -- major   -> major  (1.1.0 -> 2.0.0, versionCode +1)
 *
 * versionCode selalu naik satu, karena Play Console menolak upload dengan
 * versionCode yang sama atau lebih kecil dari rilis sebelumnya.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const file = path.join(process.cwd(), 'android/version.properties');
const kind = (process.argv[2] || 'patch').toLowerCase();
if (!['patch', 'minor', 'major'].includes(kind)) {
  console.error(`Jenis bump tidak dikenal: ${kind}. Pakai patch | minor | major.`);
  process.exit(2);
}

const source = readFileSync(file, 'utf8');
const codeMatch = /^versionCode\s*=\s*(\d+)\s*$/m.exec(source);
const nameMatch = /^versionName\s*=\s*([0-9.]+)\s*$/m.exec(source);
if (!codeMatch || !nameMatch) {
  console.error('android/version.properties tidak memuat versionCode/versionName.');
  process.exit(1);
}

const code = Number(codeMatch[1]);
const parts = nameMatch[1].split('.').map((n) => Number(n));
while (parts.length < 3) parts.push(0);
if (kind === 'major') {
  parts[0] += 1;
  parts[1] = 0;
  parts[2] = 0;
} else if (kind === 'minor') {
  parts[1] += 1;
  parts[2] = 0;
} else {
  parts[2] += 1;
}

const nextName = parts.join('.');
const next = source
  .replace(/^versionCode\s*=\s*\d+\s*$/m, `versionCode=${code + 1}`)
  .replace(/^versionName\s*=\s*[0-9.]+\s*$/m, `versionName=${nextName}`);
writeFileSync(file, next);
console.log(`versionCode ${code} -> ${code + 1}, versionName ${nameMatch[1]} -> ${nextName}`);
