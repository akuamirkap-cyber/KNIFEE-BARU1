/**
 * Look sheet: the slide-2 guns inside slide 1, framed on the moment *after* the
 * first round lands, so the sky, the skyline, the stars, the per-weapon
 * atmosphere, the wheel glow and slide 2's hand-drawn stuck round are all
 * visible without the clear-screen flash washing the frame out.
 *
 * Usage: npx tsx tools/set-two-look.ts [outDir]
 */
import { installCanvasShim } from '../tests/supportCanvas';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
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
  createElement: (tag: string) => (tag === 'canvas' ? createCanvas(W, H) : { style: {} }),
  addEventListener: () => undefined, removeEventListener: () => undefined,
};
g.Image = class { width = 1; height = 1; onload: (() => void) | null = null; onerror: (() => void) | null = null; set src(_v: string) {} };

let seed = Number(process.env.SEED ?? 2025) >>> 0;
Math.random = () => {
  seed = (seed + 0x6d2b79f5) >>> 0;
  let t = seed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

installSilentAudio();
installCanvasShim();

const outDir = process.argv[2] ?? '/tmp/set-two-look';
mkdirSync(outDir, { recursive: true });

const { Game } = await import('../src/games/gunhit/game/Game.ts');
const variants = await import('../src/games/gunhit/game/art/gunVariants.ts');
const { SET_TWO_IDS } = await import('../src/games/gunhit/game/setTwoArt.ts');

const DT = 1 / 60;
const LEVEL = Number(process.env.LEVEL ?? 3);
const crops: Record<string, { x: number; y: number; w: number; h: number }> = {};

for (const id of SET_TWO_IDS) {
  const raw = createCanvas(W, H) as unknown as Record<string, unknown>;
  raw.style = {};
  raw.addEventListener = () => undefined;
  raw.removeEventListener = () => undefined;
  raw.getBoundingClientRect = () => ({ left: 0, top: 0, width: W, height: H });
  const game = new Game(raw as unknown as HTMLCanvasElement, { onGameOver: () => {}, onStageChange: () => {} } as never) as unknown as Record<string, any>;
  game.startAtLevel(LEVEL);
  game.setWeapon(id);
  variants.setGunEffect(id, 'set2' as never);
  // Let the intro finish, then put one round into the wheel.
  let frames = 0;
  while (frames < 400 && game.state !== 'play') { frames++; game.update(DT); game.render(); }
  for (let i = 0; i < 20; i++) { game.update(DT); game.render(); }
  game.shoot();
  let guard = 0;
  while (guard++ < 400 && game.stuck < Math.min(1, game.level.ammo)) { game.update(DT); game.render(); }
  // 0.22s after the hit: the burst has faded, the stuck round has settled.
  for (let i = 0; i < 13; i++) { game.update(DT); game.render(); }
  const cv = raw as unknown as { toBuffer: (m: string) => Buffer };
  writeFileSync(join(outDir, `${id}.png`), cv.toBuffer('image/png'));
  // Later frame: the burst has faded, whatever is left in the wheel is visible.
  for (let i = 0; i < 46; i++) { game.update(DT); game.render(); }
  writeFileSync(join(outDir, `${id}-late.png`), cv.toBuffer('image/png'));
  // Crop tight around the wheel for the "stuck round" sheet.
  const half = 150;
  const box = { x: 210 - half, y: Number(game.targetY) - half, w: half * 2, h: half * 2 };
  crops[id] = box;
  console.log(`✓ ${id} level ${LEVEL} stuck=${game.stuck}/${game.level.ammo}`);
}

// ---- contact sheet
const ORDER = ['firework', 'blackhole', 'shark', 'bamboo', 'soaker', 'rainbow', 'bazooka', 'rpg'];
const CW = Math.round(W * 0.55);
const CH = Math.round(H * 0.55);
const PAD = 8;
const LABEL = 24;
const COLS = 4;
const ids = ORDER.filter((id) => (SET_TWO_IDS as readonly string[]).includes(id));
const sheet = createCanvas(PAD + COLS * (CW + PAD), 44 + Math.ceil(ids.length / COLS) * (CH + LABEL + PAD));
const c = sheet.getContext('2d');
c.fillStyle = '#0b1020';
c.fillRect(0, 0, sheet.width, sheet.height);
c.fillStyle = '#e8eefc';
c.font = 'bold 20px sans-serif';
c.fillText(`Slide 2 look inside slide 1 — level ${LEVEL}, after the first round lands`, PAD + 4, 30);
for (const [i, id] of ids.entries()) {
  const x = PAD + (i % COLS) * (CW + PAD);
  const y = 44 + Math.floor(i / COLS) * (CH + LABEL + PAD);
  c.drawImage(await loadImage(join(outDir, `${id}.png`)), x, y, CW, CH);
  c.fillStyle = '#93a4c8';
  c.font = 'bold 14px sans-serif';
  c.fillText(id, x + 4, y + CH + 17);
}
const out = process.argv[3] ?? 'set-two-look.png';
writeFileSync(out, sheet.toBuffer('image/png'));

// ---- wheel close-ups: the round slide 2 leaves in the target, per weapon
const ZOOM = 1.55;
const zc = Math.round(300 * ZOOM);
const zsheet = createCanvas(PAD + COLS * (zc + PAD), 44 + Math.ceil(ids.length / COLS) * (zc + LABEL + PAD));
const z = zsheet.getContext('2d');
z.fillStyle = '#0b1020';
z.fillRect(0, 0, zsheet.width, zsheet.height);
z.fillStyle = '#e8eefc';
z.font = 'bold 20px sans-serif';
z.fillText('Peluru nempel di roda — seni slide 2 (zoom)', PAD + 4, 30);
for (const [i, id] of ids.entries()) {
  const x = PAD + (i % COLS) * (zc + PAD);
  const y = 44 + Math.floor(i / COLS) * (zc + LABEL + PAD);
  const src = await loadImage(join(outDir, `${id}-late.png`));
  const box = crops[id] ?? { x: 60, y: 105, w: 300, h: 300 };
  z.drawImage(src, box.x, box.y, box.w, box.h, x, y, zc, zc);
  z.fillStyle = '#93a4c8';
  z.font = 'bold 14px sans-serif';
  z.fillText(id, x + 4, y + zc + 17);
}
const zout = process.argv[4] ?? 'set-two-pins.png';
writeFileSync(zout, zsheet.toBuffer('image/png'));
console.log(`wrote ${out}, ${zout} (+ ${ids.length} frames in ${outDir})`);
