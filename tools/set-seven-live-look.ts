/**
 * Look sheet for the imported SET 2..7 guns *after* the speed/fire-rate fix.
 *
 * Each row is one gun, each column a moment after its very first trigger pull:
 * the round in flight at slide 7's own speed, the impact, and the wheel a beat
 * later (stuck round + whatever the round still animates after landing).
 *
 * Usage: npx tsx tools/set-seven-live-look.ts [outDir] [png]
 */
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import './supportAudioSilent';

const W = 420;
const H = 760;
const g = globalThis as unknown as Record<string, unknown> & { window: Record<string, unknown> };
g.window = Object.assign(g.window ?? {}, {
  setTimeout, clearTimeout,
  setInterval: () => 0, clearInterval: () => undefined,
  addEventListener: () => undefined, removeEventListener: () => undefined,
  devicePixelRatio: 1, innerWidth: W, innerHeight: H,
});
const realCanvas = (w = 64, h = 64) => createCanvas(w, h);
g.document = {
  createElement: (tag: string) => (tag === 'canvas' ? realCanvas() : { style: {} }),
  addEventListener: () => undefined,
  removeEventListener: () => undefined,
};
class FakeImage {
  width = 1; height = 1;
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  set src(_v: string) { /* blank */ }
}
g.Image = FakeImage;

let seed = 20260101;
Math.random = () => {
  seed = (seed + 0x6d2b79f5) >>> 0;
  let t = seed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const { Game, makeLevel } = await import('../src/games/gunhit/game/Game.ts');
const variants = await import('../src/games/gunhit/game/art/gunVariants.ts');
const { sevenCooldown } = await import('../src/games/gunhit/game/setSevenShot.ts');
const { setSevenIdFor } = await import('../src/games/gunhit/game/setSevenArt.ts');

const ids = (process.argv[2] ?? 'snowball,holy,minigun,sapphire,paintball,rpg,bee,obliterator').split(',');
const outDir = process.argv[3] ?? '/tmp/s7look';
const outName = process.argv[4] ?? 'set-seven-live-look.png';
mkdirSync(outDir, { recursive: true });

const canvas = createCanvas(W, H) as unknown as Record<string, unknown>;
const ctx = (canvas as unknown as { getContext: (t: string) => CanvasRenderingContext2D }).getContext('2d');
Object.assign(canvas, {
  style: {},
  addEventListener: () => undefined,
  removeEventListener: () => undefined,
  getBoundingClientRect: () => ({ left: 0, top: 0, width: W, height: H }),
});

const DT = 1 / 60;
/** Moments after the trigger, in seconds. */
const MOMENTS = [0.1, 0.26, 0.42, 0.75];

for (const id of ids) {
  variants.setGunEffect(id as never, 'set7');
  const game = new Game(canvas as unknown as HTMLCanvasElement, { onGameOver: () => {}, onStageChange: () => {} } as never) as unknown as Record<string, any>;
  game.level = makeLevel(3);
  game.state = 'play';
  game.setWeapon(id);
  game.cooldown = 0;
  game.ammoLeft = 30;
  game.snowLoaded = 6;
  game.shoot();
  const cool = game.cooldown;
  let t = 0;
  for (const at of MOMENTS) {
    while (t < at - 1e-9) {
      game.state = 'play';
      game.cooldown = Math.max(game.cooldown, 1); // one shot only
      game.update(DT);
      game.render();
      t += DT;
    }
    const buf = (canvas as unknown as { toBuffer: (m: string) => Buffer }).toBuffer('image/png');
    writeFileSync(join(outDir, `${id}-${Math.round(at * 100)}.png`), buf);
  }
  console.log(`rendered ${id} (slide 7 reload ${sevenCooldown(setSevenIdFor(id)!) ?? '?'}s, slide 1 now ${cool.toFixed(2)}s)`);
}

// ---- contact sheet
const COLS = MOMENTS.length;
const CW = 240;
const CH = Math.round((CW * H) / W);
const LABEL = 22;
const PAD = 10;
const sheet = createCanvas(PAD + COLS * (CW + PAD), 46 + ids.length * (CH + LABEL + PAD));
const c = sheet.getContext('2d');
c.fillStyle = '#0b1220';
c.fillRect(0, 0, sheet.width, sheet.height);
c.fillStyle = '#e2e8f0';
c.font = 'bold 20px sans-serif';
c.fillText('SET 2..7 guns on slide 1 — slide 7 speed, slide 7 trigger', PAD, 28);
c.font = '12px sans-serif';
c.fillStyle = '#94a3b8';
for (let i = 0; i < COLS; i++) {
  c.fillText(`+${MOMENTS[i]}s`, PAD + i * (CW + PAD) + 6, 44);
}
let y = 50;
for (const id of ids) {
  for (let i = 0; i < COLS; i++) {
    const file = join(outDir, `${id}-${Math.round(MOMENTS[i] * 100)}.png`);
    const img = await loadImage(readFileSync(file));
    const x = PAD + i * (CW + PAD);
    c.drawImage(img, x, y, CW, CH);
  }
  c.fillStyle = '#f8fafc';
  c.font = 'bold 13px sans-serif';
  c.fillText(id, PAD + 4, y + CH + 16);
  y += CH + LABEL + PAD;
}
writeFileSync(outName, sheet.toBuffer('image/png'));
console.log('wrote', outName);
