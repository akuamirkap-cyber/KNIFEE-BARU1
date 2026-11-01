import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const read = (file: string) => readFileSync(path.join(process.cwd(), file), 'utf8');

test('the two games are labelled Game A (GUNHIT) and Game B (PERFECT SHOT)', () => {
  const app = read('src/App.tsx');

  // Nav buttons carry the shared names.
  assert.match(app, /A · GUNHIT/);
  assert.match(app, /B · PERFECT SHOT/);
  assert.doesNotMatch(app, /GUN HIT · SGA/, 'the old, easily confused label is gone');

  // Each pane is addressable by id, not by guessing its position.
  assert.match(app, /data-game-pane="sga" data-game-id="A" data-game-name="GUNHIT"/);
  assert.match(app, /data-game-pane="perfect-shot" data-game-id="B" data-game-name="PERFECT SHOT"/);
  assert.match(app, /aria-label="Game A - Gun Hit SGA"/);
  assert.match(app, /aria-label="Game B - Perfect Shot"/);

  // The naming doc stays in the repo so the convention survives future sessions.
  const doc = read('GAMES.md');
  assert.match(doc, /Game A — GUNHIT/);
  assert.match(doc, /Game B — PERFECT SHOT/);
  assert.match(doc, /src\/games\/gunhit/);
  assert.match(doc, /src\/games\/perfect-shot/);
});
