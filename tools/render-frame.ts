/**
 * Render real Gun Hit frames to PNG with a Skia-backed canvas (no browser).
 *
 * Usage: npx tsx tools/render-frame.ts [weaponId] [frames] [outDir]
 *
 * This is the visual counterpart of tools/perf-audit.ts: it runs the actual
 * `Game` (update + render) and writes the frames out, so an effect can be
 * eyeballed without opening the game.
 */
import { Canvas as NapiCanvas, createCanvas, type Canvas } from '@napi-rs/canvas';
import { mkdirSync, writeFileSync } from 'node:fs';

const W = 420;
const H = 760;

// A DOM shim that hands out *real* canvases: the game bakes face textures,
// glow sprites and its gun art through document.createElement('canvas').
const g = globalThis as unknown as Record<string, unknown> & { window: Record<string, unknown> };
g.window = Object.assign(g.window ?? {}, {
  setTimeout, clearTimeout,
  setInterval: () => 0, clearInterval: () => undefined,
  addEventListener: () => undefined, removeEventListener: () => undefined,
  devicePixelRatio: 1,
  innerWidth: W, innerHeight: H,
});
// Let the browser-only sprite caches and fast Canvas2D path run in this real
// Skia canvas too, so these frames show what the browser actually renders.
g.HTMLCanvasElement = NapiCanvas;
g.document = {
  createElement: (tag: string) => (tag === 'canvas' ? createCanvas(64, 64) : { style: {} }),
  addEventListener: () => undefined,
  removeEventListener: () => undefined,
};
class FakeImage {
  width = 1;
  height = 1;
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  set src(_v: string) { /* stays blank */ }
}
g.Image = FakeImage;

const id = process.argv[2] ?? 'paintball';
const frames = Number(process.argv[3] ?? 90);
const outDir = process.argv[4] ?? '/tmp/frames';
const every = Number(process.argv[5] ?? 15);

// Deterministic frames: the game scatters bullets, tints and FX with
// Math.random, so two runs are otherwise incomparable.
let seed = Number(process.env.SEED ?? 12345) >>> 0;
Math.random = () => {
  seed = (seed + 0x6d2b79f5) >>> 0;
  let t = seed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const { Game, makeLevel } = await import('../src/games/gunhit/game/Game.ts');

const canvas = createCanvas(W, H) as unknown as HTMLCanvasElement & Canvas;
const ctx = (canvas as unknown as { getContext: (t: string) => CanvasRenderingContext2D }).getContext('2d');
(canvas as unknown as { style: Record<string, unknown> }).style = {};
(canvas as unknown as { addEventListener: () => void }).addEventListener = () => undefined;
(canvas as unknown as { removeEventListener: () => void }).removeEventListener = () => undefined;
(canvas as unknown as { getBoundingClientRect: () => Record<string, number> }).getBoundingClientRect = () => ({ left: 0, top: 0, width: W, height: H });

const game = new Game(canvas, { onGameOver: () => {}, onStageChange: () => {} } as never) as unknown as Record<string, any>;
game.level = makeLevel(3);
game.state = 'play';
game.setWeapon(id);

mkdirSync(outDir, { recursive: true });
const DT = 1 / 60;
for (let f = 0; f < frames; f++) {
  game.state = 'play';
  game.stuck = 0;
  game.ammoLeft = game.level.ammo;
  if (game.items.length > 10) game.items.splice(0, game.items.length - 10);
  // Read the optional state without creating a slide-3 layer for every gun.
  if (game.s7State?.stuck?.length > 10) game.s7State.stuck.splice(0, game.s7State.stuck.length - 10);
  if (process.env.IDLE !== '1' && game.cooldown <= 0) game.shoot();
  game.update(DT);
  game.render();
  if (f % every === 0) {
    const data = (canvas as unknown as { toBuffer: (t: string) => Buffer }).toBuffer('image/png');
    writeFileSync(`${outDir}/${id}-${String(f).padStart(3, '0')}.png`, data);
  }
}
const finalBuf = (canvas as unknown as { toBuffer: (t: string) => Buffer }).toBuffer('image/png');
writeFileSync(`${outDir}/${id}-final.png`, finalBuf);
console.log('wrote', outDir, 'ctx', typeof ctx.getImageData);
