/**
 * Layer isolation for a visual glitch: renders the same deterministic frame
 * with one drawing layer disabled at a time, so the offending pass can be seen.
 *
 * Usage: npx tsx tools/render-layer.ts [weaponId] [frame]
 */
import { createCanvas } from '@napi-rs/canvas';
import { mkdirSync, writeFileSync } from 'node:fs';

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

let seed = 12345 >>> 0;
Math.random = () => {
  seed = (seed + 0x6d2b79f5) >>> 0;
  let t = seed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const id = process.argv[2] ?? 'paintball';
const targetFrame = Number(process.argv[3] ?? 40);
const outDir = process.argv[4] ?? '/tmp/layers';
mkdirSync(outDir, { recursive: true });

const { Game, makeLevel } = await import('../src/games/gunhit/game/Game.ts');

function makeGame() {
  const canvas = createCanvas(W, H) as unknown as Record<string, any>;
  canvas.style = {};
  canvas.addEventListener = () => undefined;
  canvas.removeEventListener = () => undefined;
  canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: W, height: H });
  const game = new Game(canvas as unknown as HTMLCanvasElement, { onGameOver: () => {}, onStageChange: () => {} } as never) as unknown as Record<string, any>;
  game.level = makeLevel(3);
  game.state = 'play';
  game.setWeapon(id);
  return { game, canvas };
}

function render(variant: string, disable: (game: Record<string, any>) => void) {
  seed = 12345 >>> 0;
  const { game, canvas } = makeGame();
  const DT = 1 / 60;
  for (let f = 0; f <= targetFrame; f++) {
    game.state = 'play';
    game.stuck = 0;
    game.ammoLeft = game.level.ammo;
    if (game.items.length > 10) game.items.splice(0, game.items.length - 10);
    if (game.s7?.stuck?.length > 10) game.s7.stuck.splice(0, game.s7.stuck.length - 10);
    if (f === targetFrame) disable(game);
    if (game.cooldown <= 0) game.shoot();
    game.update(DT);
    game.render();
  }
  writeFileSync(`${outDir}/${id}-${String(targetFrame).padStart(3, '0')}-${variant}.png`, canvas.toBuffer('image/png'));
  console.log('wrote', variant, 's7 particles', game.s7?.particles?.list?.length ?? 0, 'own', game.particles.length, 'flyers', game.flyers?.length ?? 0, 'frags', game.frags?.length ?? 0);
}

render('all', () => {});
render('no-s7wheel', (game) => {
  const s7 = game.s7;
  if (!s7) return;
  s7.drawWheel = () => {};
});
render('no-s7particles', (game) => {
  const s7 = game.s7;
  if (!s7) return;
  s7.draw = () => {};
  s7.drawFront = () => {};
});
render('no-ownparticles', (game) => { game.particles = []; });
render('no-s7shots', (game) => {
  const s7 = game.s7;
  if (!s7) return;
  s7.shots = [];
  s7.stuck = [];
});
