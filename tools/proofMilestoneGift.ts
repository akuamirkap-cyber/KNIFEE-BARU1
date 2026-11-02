/**
 * Preview of the achievement route's milestone presents
 * (`npx tsx tools/proofMilestoneGift.ts`).
 *
 * The three rarity tones are rendered closed and claimed, on the same blue
 * board the achievement page uses, so the green / purple / gold presents can be
 * checked without a browser. Writes `parity-proof/gameA-milestone-gifts.png`.
 */
import { createCanvas, loadImage } from '@napi-rs/canvas';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { writeFileSync } from 'node:fs';
import MilestoneGift from '../src/games/gunhit/components/MilestoneGift';

const TONES = ['green', 'purple', 'gold'] as const;
const SIZE = 118;
const pad = 18;
const labelH = 26;

const cells: { img: Awaited<ReturnType<typeof loadImage>>; label: string }[] = [];
for (const tone of TONES) {
  for (const open of [false, true]) {
    const svg = renderToStaticMarkup(
      React.createElement(MilestoneGift, { tone, open, className: '', width: SIZE, height: SIZE } as never),
    );
    const img = await loadImage(Buffer.from(svg));
    cells.push({ img, label: `${tone}${open ? ' · diklaim' : ''}` });
  }
}

const cols = 3;
const rows = 2;
const sheet = createCanvas(pad * 2 + cols * (SIZE + pad), pad * 2 + rows * (SIZE + labelH + pad) + 44);
const c = sheet.getContext('2d');
c.fillStyle = '#2f6fe0';
c.fillRect(0, 0, sheet.width, sheet.height);
c.strokeStyle = 'rgba(255,255,255,.10)';
c.lineWidth = 1;
for (let x = 0; x < sheet.width; x += 22) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, sheet.height); c.stroke(); }
for (let y = 0; y < sheet.height; y += 22) { c.beginPath(); c.moveTo(0, y); c.lineTo(sheet.width, y); c.stroke(); }

cells.forEach((cell, i) => {
  const col = i % cols;
  const row = Math.floor(i / cols);
  const x = pad + col * (SIZE + pad);
  const y = pad + row * (SIZE + labelH + pad);
  c.fillStyle = 'rgba(26,70,168,.62)';
  c.strokeStyle = 'rgba(11,31,92,.5)';
  c.lineWidth = 2;
  c.beginPath();
  (c as unknown as { roundRect: (x: number, y: number, w: number, h: number, r: number) => void }).roundRect(x - 8, y - 8, SIZE + 16, SIZE + 16, 14);
  c.fill();
  c.stroke();
  c.drawImage(cell.img as unknown as Canvas, x, y, SIZE, SIZE);
  c.fillStyle = '#dbeafe';
  c.font = 'bold 13px monospace';
  c.textAlign = 'center';
  c.fillText(cell.label, x + SIZE / 2, y + SIZE + 16);
});

c.textAlign = 'left';
c.fillStyle = '#ffffff';
c.font = 'bold 14px monospace';
c.fillText('GAME A · kado milestone: hijau = UMUM, ungu = EPIC, emas = LEGEND', pad, sheet.height - 24);
c.fillStyle = '#c7dbff';
c.font = '12px monospace';
c.fillText('tutup terangkat + cahaya keluar saat hadiah sudah diklaim', pad, sheet.height - 8);

writeFileSync('parity-proof/gameA-milestone-gifts.png', sheet.toBuffer('image/png'));
console.log('wrote parity-proof/gameA-milestone-gifts.png');
