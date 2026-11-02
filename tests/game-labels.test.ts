import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const read = (file: string) => readFileSync(path.join(process.cwd(), file), 'utf8');

test('satu game: pane A (GUNHIT) saja, tanpa sisa navigasi Game B', () => {
  const app = read('src/App.tsx');

  // The shell hosts exactly one game now.
  assert.match(app, /aria-label="Gun Hit SGA"/);
  assert.match(app, /data-game-id="A"/);
  assert.match(app, /data-game-name="GUNHIT"/);
  assert.doesNotMatch(app, /B · PERFECT SHOT/, 'tombol Game B sudah tidak ada');
  assert.doesNotMatch(app, /PerfectShotGame|perfect-shot\/EmbeddedApp/, 'Game B tidak lagi dimuat');
  assert.doesNotMatch(app, /game-pair|game-pane|activeGame/, 'tidak ada lagi pane geser atau status pane aktif');
  assert.match(app, /import\('\.\/games\/gunhit\/App'\)/, 'Game A tetap di-code-split');

  // The naming doc stays in the repo so the convention survives future sessions.
  const doc = read('GAMES.md');
  assert.match(doc, /Game A — GUNHIT/);
  assert.match(doc, /src\/games\/gunhit/);
  assert.match(doc, /sudah dihapus|dihapus/i, 'GAMES.md mencatat Game B sudah dihapus');
  assert.doesNotMatch(doc, /data-game-pane="perfect-shot"/, 'Game B bukan lagi pane kedua');
});
