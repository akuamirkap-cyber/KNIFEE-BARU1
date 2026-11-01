/**
 * Proof: the armory showcase is back on the original sizing rule —
 * `(h * 0.98) / span`, the same rule Game A shipped with, so every weapon
 * fills the strip like it did before.
 *
 *   npx tsx tools/proofShowcaseBaseline.ts
 *   -> parity-proof/gameA-armory-showcase-baseline.png
 */
import { createCanvas, Path2D } from '@napi-rs/canvas';
import { DOMParser } from '@xmldom/xmldom';
import { writeFileSync } from 'node:fs';
import { drawGunCentered } from '../src/games/gunhit/game/art/drawCentered';
import { getGunMetrics } from '../src/games/gunhit/game/art/metrics';
import { getGunVariant } from '../src/games/gunhit/game/art/gunVariants';
import { installSilentAudio } from './supportAudioSilent';
const g = globalThis as unknown as Record<string, any>;
g.Path2D = Path2D; g.DOMParser = DOMParser;
g.HTMLCanvasElement ??= createCanvas(2, 2).constructor;
g.document = { createElement: (t: string) => (t === 'canvas' ? createCanvas(64, 64) : { style: {} }), visibilityState: 'visible', addEventListener: () => {} };
g.requestAnimationFrame = () => 0; g.cancelAnimationFrame = () => {};
installSilentAudio();
g.window = Object.assign(g.window ?? {}, { setTimeout, clearTimeout, setInterval: () => 0, clearInterval: () => undefined, addEventListener: () => undefined, removeEventListener: () => undefined, devicePixelRatio: 2, innerWidth: 420, innerHeight: 740, matchMedia: () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} }) });

const W = 380, H = 180, DPR = 2;
const ids = ['pistol', 'nail', 'ak47', 'minigun', 'bazooka', 'longbow'];
const pane = (id: string) => {
  const span = Math.max(getGunMetrics(id as never).span, 130);
  const scale = (H * 0.98) / span; // the original rule
  const cv = createCanvas(W * DPR, H * DPR);
  const ctx = cv.getContext('2d') as unknown as CanvasRenderingContext2D;
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  const shade = ctx.createRadialGradient(W / 2, H / 2, 8, W / 2, H / 2, W * 0.55);
  shade.addColorStop(0, '#2b1d4a'); shade.addColorStop(1, '#140b26');
  ctx.fillStyle = shade; ctx.fillRect(0, 0, W, H);
  ctx.save();
  ctx.translate(W / 2, H / 2 - 4);
  ctx.rotate(Math.PI / 4);
  ctx.scale(scale, scale);
  drawGunCentered(ctx, id as never, 0, 0, true, getGunVariant(id as never), true);
  ctx.restore();
  return { cv, span, drawn: span * scale };
};
const LABEL = 18;
const sheet = createCanvas(W, 30 + ids.length * (LABEL + H + 6));
const so = sheet.getContext('2d');
so.fillStyle = '#0b1420'; so.fillRect(0, 0, sheet.width, sheet.height);
so.fillStyle = '#8dffbe'; so.font = '700 14px monospace';
so.fillText('ARMORY — aturan ukuran semula, semua 98%', 10, 18);
ids.forEach((id, i) => {
  const p = pane(id);
  const top = 30 + i * (LABEL + H + 6);
  so.fillStyle = '#cfe3ff'; so.font = '700 13px monospace';
  so.fillText(`${id.toUpperCase()} — span ${p.span} -> ${(100 * p.drawn / H).toFixed(0)}% tinggi strip`, 8, top + 13);
  so.drawImage(p.cv as never, 0, top + LABEL, W, H);
});
writeFileSync('parity-proof/gameA-armory-showcase-baseline.png', sheet.toBuffer('image/png'));
console.log('written parity-proof/gameA-armory-showcase-baseline.png');
console.log(ids.map((id) => {
  const s = Math.max(getGunMetrics(id as never).span, 130);
  return `${id.padEnd(8)} span ${String(s).padStart(3)} -> ${(((s * (H * 0.98) / s) / H) * 100).toFixed(0)}% of the strip`;
}).join('\n'));
