/**
 * Proof: the ARMORY showcase now draws every weapon at its real relative size.
 * Same pane, same pose, same art — only the scale rule differs.
 *
 *   npx tsx tools/proofWeaponShowcase.ts
 *   -> parity-proof/gameA-armory-showcase-scale.png
 */
import { createCanvas, Path2D, loadImage } from '@napi-rs/canvas';
import { DOMParser } from '@xmldom/xmldom';
import { writeFileSync } from 'node:fs';
import { drawGunCentered } from '../src/games/gunhit/game/art/drawCentered';
import { getGunMetrics, showcaseScale } from '../src/games/gunhit/game/art/metrics';
import { getGunVariant } from '../src/games/gunhit/game/art/gunVariants';
import { installSilentAudio } from './supportAudioSilent';
const g = globalThis as unknown as Record<string, any>;
g.Path2D = Path2D; g.DOMParser = DOMParser;
g.HTMLCanvasElement ??= createCanvas(2, 2).constructor;
g.document = { createElement: (t: string) => (t === 'canvas' ? createCanvas(64, 64) : { style: {} }), visibilityState: 'visible', addEventListener: () => {} };
g.requestAnimationFrame = () => 0; g.cancelAnimationFrame = () => {};
installSilentAudio();
g.window = Object.assign(g.window ?? {}, { setTimeout, clearTimeout, setInterval: () => 0, clearInterval: () => undefined, addEventListener: () => undefined, removeEventListener: () => undefined, devicePixelRatio: 2, innerWidth: 420, innerHeight: 760, matchMedia: () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} }) });

const W = 380, H = 180, DPR = 2;
const ids = ['pistol', 'nail', 'ak47', 'shotgun', 'minigun', 'bazooka', 'sniper', 'longbow'] as const;
const pane = (id: string, scale: number) => {
  const cv = createCanvas(W * DPR, H * DPR);
  const ctx = cv.getContext('2d') as unknown as CanvasRenderingContext2D;
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  const shade = ctx.createRadialGradient(W / 2, H / 2, 8, W / 2, H / 2, W * 0.55);
  shade.addColorStop(0, '#2b1d4a'); shade.addColorStop(1, '#140b26');
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, W, H);
  ctx.save();
  ctx.translate(W / 2, H / 2 - 4);
  ctx.rotate(Math.PI / 4);
  ctx.scale(scale, scale);
  drawGunCentered(ctx, id as never, 0, 0, true, getGunVariant(id as never), true);
  ctx.restore();
  return cv;
};

const rows = ids.length;
const LABEL = 20, GAP = 4;
const sheet = createCanvas(W * 2 + 30, 34 + rows * (LABEL + H + GAP));
const so = sheet.getContext('2d');
so.fillStyle = '#0b1420'; so.fillRect(0, 0, sheet.width, sheet.height);
so.fillStyle = '#ff9a9a'; so.font = '700 14px monospace';
so.fillText('SEBELUM — semua sama besar', 12, 16);
so.fillStyle = '#8dffbe';
so.fillText('SESUDAH — ukuran asli, besar tetap besar', W + 24, 16);
so.fillStyle = '#ffd23f'; so.font = '700 13px monospace';
so.fillText('AK-47 vs PISTOL: 1.00x -> ' + (() => {
  const sp = getGunMetrics('pistol' as never).span, sa = getGunMetrics('ak47' as never).span;
  return (sa * showcaseScale(sa, H) / (sp * showcaseScale(sp, H))).toFixed(2) + 'x';
})(), 12, 32);
for (const [i, id] of ids.entries()) {
  const span = getGunMetrics(id as never).span;
  const before = pane(id, (H * 0.98) / Math.max(span, 130));
  const after = pane(id, showcaseScale(span, H));
  const top = 34 + i * (LABEL + H + GAP);
  so.fillStyle = '#cfe3ff'; so.font = '700 14px monospace';
  const pct = ((span * showcaseScale(span, H)) / H * 100).toFixed(0);
  so.fillText(`${id.toUpperCase()} — span ${span} -> ${pct}% tinggi panel (dulu 98%)`, 8, top + 15);
  so.drawImage(before as never, 0, top + LABEL, W, H);
  so.drawImage(after as never, W + 18, top + LABEL, W, H);
}
writeFileSync('parity-proof/gameA-armory-showcase-scale.png', sheet.toBuffer('image/png'));
console.log('written parity-proof/gameA-armory-showcase-scale.png');
console.log(ids.map((id) => {
  const span = getGunMetrics(id as never).span;
  return `${id.padEnd(8)} span ${String(span).padStart(3)} -> ${(((span * showcaseScale(span, H)) / H) * 100).toFixed(0)}% of the pane`;
}).join('\n'));
