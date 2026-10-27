/**
 * Visual proof sheet for the slide-2 import: for every slide-2 weapon, three
 * columns side by side —
 *   1. the design slide 1 used before this import,
 *   2. the new "Slide 2" card,
 *   3. slide 2's own `Game.drawGun()` from `games/fireworkgun`.
 *
 * Column 2 and 3 are rendered from the same rest state, so any difference is a
 * real difference in the exported artwork.
 *
 * Usage: npx tsx tools/set-two-compare.ts [outFile]
 */
import { installCanvasShim } from '../tests/supportCanvas';
import { createCanvas } from '@napi-rs/canvas';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { installSilentAudio } from './supportAudioSilent';

const W = 420;
const H = 760;
const g = globalThis as unknown as Record<string, unknown> & { window: Record<string, unknown> };
g.window = Object.assign(g.window ?? {}, {
  setTimeout, clearTimeout, setInterval: () => 0, clearInterval: () => undefined,
  addEventListener: () => undefined, removeEventListener: () => undefined,
  devicePixelRatio: 1, innerWidth: W, innerHeight: H,
});
g.document = {
  createElement: (tag: string) => (tag === 'canvas' ? createCanvas(64, 64) : { style: {} }),
  addEventListener: () => undefined, removeEventListener: () => undefined,
};
g.Image = class { width = 1; height = 1; onload: (() => void) | null = null; onerror: (() => void) | null = null; set src(_v: string) {} };

let seed = Number(process.env.SEED ?? 12345) >>> 0;
Math.random = () => {
  seed = (seed + 0x6d2b79f5) >>> 0;
  let t = seed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

installSilentAudio();
installCanvasShim();

const outFile = process.argv[2] ?? 'set-two-import-compare.png';
mkdirSync(dirname(outFile), { recursive: true });

const { drawGun } = await import('../src/games/gunhit/game/art/guns.ts');
const { gunState } = await import('../src/games/gunhit/game/art/kit.ts');
const { SET_TWO_IDS, drawSetTwoGun, restTwoState } = await import('../src/games/gunhit/game/setTwoArt.ts');
const { getGunVariantOptions, getGunVariant } = await import('../src/games/gunhit/game/art/gunVariants.ts');

const GUN_Y = 596;
const FRAME = 1.7;
const CELL_W = 176;
const GUTTER = 92;
const CELL_H = 250;
const LABEL = 26;
const PAD = 10;

function ctxOf(w: number, h: number) {
  const cv = createCanvas(w, h);
  return [cv, cv.getContext('2d') as unknown as CanvasRenderingContext2D] as const;
}

function paintGun(dst: CanvasRenderingContext2D, id: string, variant: 'slide1' | 'set2' | 'source') {
  // Inside the cell: muzzle a little below the top edge, the gun hanging down.
  const sx = CELL_W / 2;
  const y0 = 58;
  if (variant === 'set2' || variant === 'source') {
    drawSetTwoGun(dst, id as never, sx, y0, restTwoState(28, { time: FRAME, recoil: 0, loadP: 1 }));
    return;
  }
  void getGunVariant;
  void getGunVariantOptions;
  drawGun(dst, id as never, sx, y0, FRAME, 0, true, undefined, 'set1');
}

const sheetW = PAD + GUTTER + (CELL_W + PAD) * 3;
const sheetH = 74 + (CELL_H + LABEL + PAD) * SET_TWO_IDS.length;
const [sheet, sctx] = ctxOf(sheetW, sheetH);
const c = sctx;
c.fillStyle = '#0b1020';
c.fillRect(0, 0, sheetW, sheetH);
c.fillStyle = '#e8eefc';
c.font = 'bold 22px sans-serif';
c.fillText('Slide 2 -> Slide 1: design card vs slide 2 itself', PAD, 40);

const cols: { key: 'slide1' | 'set2' | 'source'; label: string }[] = [
  { key: 'slide1', label: 'sebelumnya' },
  { key: 'set2', label: 'kartu "Slide 2"' },
  { key: 'source', label: 'slide 2 asli' },
];
// Column headers.
cols.forEach((col, i) => {
  c.fillStyle = '#93a4c8';
  c.font = 'bold 14px sans-serif';
  c.fillText(col.label, PAD + GUTTER + i * (CELL_W + PAD) + 8, 56);
});

SET_TWO_IDS.forEach((id, row) => {
  const y0 = 74 + row * (CELL_H + LABEL + PAD);
  c.fillStyle = '#e8eefc';
  c.font = 'bold 15px sans-serif';
  c.fillText(id, PAD + 4, y0 + CELL_H / 2);
  cols.forEach((col, i) => {
    const x0 = PAD + GUTTER + i * (CELL_W + PAD);
    c.fillStyle = '#141b31';
    c.fillRect(x0, y0, CELL_W, CELL_H);
    c.fillStyle = '#93a4c8';
    c.font = '13px sans-serif';
    c.save();
    c.translate(x0, y0);
    c.beginPath();
    c.rect(0, 0, CELL_W, CELL_H);
    c.clip();
    paintGun(c, id, col.key);
    c.restore();
  });
});

writeFileSync(outFile, sheet.toBuffer('image/png'));
console.log(`wrote ${outFile}`);
