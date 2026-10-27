import { createCanvas, loadImage } from '@napi-rs/canvas';
import { readFileSync, writeFileSync } from 'node:fs';
const ids = ['snowball','holy','minigun','sapphire','paintball','rpg','bee','obliterator'];
const box = { x: 110, y: 250, w: 200, h: 200 };
const Z = 200, PAD = 8, LAB = 18;
const sheet = createCanvas(PAD + 2 * (Z + PAD), 40 + 8 * (Z + LAB + PAD));
const c = sheet.getContext('2d');
c.fillStyle = '#0b1220'; c.fillRect(0, 0, sheet.width, sheet.height);
c.fillStyle = '#e2e8f0'; c.font = 'bold 16px sans-serif';
c.fillText('rim zoom: one stuck round, slide 7 art (+0.42s | +0.75s)', PAD, 24);
let y = 34;
for (const id of ids) {
  const files = [`/tmp/s7look/${id}-42.png`, `/tmp/s7look/${id}-75.png`];
  for (let i = 0; i < 2; i++) {
    const img = await loadImage(readFileSync(files[i]));
    const x = PAD + i * (Z + PAD);
    c.drawImage(img as never, box.x, box.y, box.w, box.h, x, y, Z, Z);
  }
  c.fillStyle = '#f8fafc'; c.font = 'bold 12px sans-serif';
  c.fillText(id, PAD + 2, y + Z + 13);
  y += Z + LAB + PAD;
}
writeFileSync('set-seven-stuck-zoom.png', sheet.toBuffer('image/png'));
console.log('ok');
