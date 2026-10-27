/**
 * Contact sheet of the live in-game sweep (`tools/set-two-sweep.ts`): the eight
 * slide-2 guns actually firing at the wheel inside slide 1, one frame each.
 *
 * Usage: npx tsx tools/set-two-sheet.ts [sweepDir] [outFile]
 */
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { existsSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const dir = process.argv[2] ?? '/tmp/s2sweep';
const outFile = process.argv[3] ?? 'set-two-ingame.png';
if (!existsSync(dir)) {
  console.error(`no sweep frames in ${dir} — run: npx tsx tools/set-two-sweep.ts ${dir}`);
  process.exit(1);
}

const ORDER = ['firework', 'blackhole', 'shark', 'bamboo', 'soaker', 'rainbow', 'bazooka', 'rpg'];
const files = readdirSync(dir).filter((f) => f.endsWith('.png'));
const ids = ORDER.filter((id) => files.includes(`${id}.png`));
if (ids.length === 0) {
  console.error(`${dir} holds no known sweep frames`);
  process.exit(1);
}

const first = await loadImage(join(dir, `${ids[0]}.png`));
const W = first.width;
const H = first.height;
// Half-size keeps the sheet light and still readable.
const CW = Math.round(W * 0.55);
const CH = Math.round(H * 0.55);
const PAD = 8;
const LABEL = 24;
const COLS = 4;
const ROWS = Math.ceil(ids.length / COLS);

const sheet = createCanvas(PAD + COLS * (CW + PAD), 44 + ROWS * (CH + LABEL + PAD));
const c = sheet.getContext('2d');
c.fillStyle = '#0b1020';
c.fillRect(0, 0, sheet.width, sheet.height);
c.fillStyle = '#e8eefc';
c.font = 'bold 20px sans-serif';
c.fillText('Slide 2 guns firing inside slide 1 (SGA)', PAD + 4, 30);

for (const [i, id] of ids.entries()) {
  const col = i % COLS;
  const row = Math.floor(i / COLS);
  const x = PAD + col * (CW + PAD);
  const y = 44 + row * (CH + LABEL + PAD);
  c.drawImage(await loadImage(join(dir, `${id}.png`)), x, y, CW, CH);
  c.fillStyle = '#93a4c8';
  c.font = 'bold 14px sans-serif';
  c.fillText(`${id}  ·  kartu "Slide 2"`, x + 4, y + CH + 17);
}

writeFileSync(outFile, sheet.toBuffer('image/png'));
console.log(`wrote ${outFile}`);
