/**
 * Level-transition render check.
 *
 * Clears a stage, waits for the auto-advance and renders the first frames of the
 * next stage — the wheel, the HUD, the gun. A blank frame here means the new
 * stage is not being drawn at all (the player sees the "rodanya pecah" leftovers
 * of the stage before, or an empty background).
 *
 * Usage: npx tsx tools/level-transition.ts [weaponId] [outDir]
 */
import { installSilentAudio } from './supportAudioSilent';
import { createCanvas } from '@napi-rs/canvas';
import { mkdirSync, writeFileSync } from 'node:fs';

const W = 420;
const H = 760;
const g = globalThis as unknown as Record<string, unknown> & { window: Record<string, unknown> };

// Real canvases, including the offscreen ones the game bakes its art into.
g.document = {
  createElement: (tag: string) => (tag === 'canvas' ? createCanvas(64, 64) : { style: {} }),
  addEventListener: () => undefined,
  removeEventListener: () => undefined,
};
g.Image = class { width = 1; height = 1; onload: (() => void) | null = null; onerror: (() => void) | null = null; set src(_v: string) {} };
g.window = Object.assign(g.window ?? {}, {
  setTimeout, clearTimeout, setInterval: () => 0, clearInterval: () => undefined,
  addEventListener: () => undefined, removeEventListener: () => undefined,
  devicePixelRatio: 1, innerWidth: W, innerHeight: H,
});
installSilentAudio();

let seed = 12345 >>> 0;
Math.random = () => {
  seed = (seed + 0x6d2b79f5) >>> 0;
  let t = seed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const id = process.argv[2] ?? 'pistol';
const outDir = process.argv[3] ?? '/tmp/transition';
mkdirSync(outDir, { recursive: true });

const { Game } = await import('../src/games/gunhit/game/Game.ts');
const variants = await import('../src/games/gunhit/game/art/gunVariants.ts');

const raw = createCanvas(W, H) as unknown as Record<string, any>;
raw.style = {};
raw.addEventListener = () => undefined;
raw.removeEventListener = () => undefined;
raw.getBoundingClientRect = () => ({ left: 0, top: 0, width: W, height: H });

const game = new Game(raw as unknown as HTMLCanvasElement, { onGameOver: () => {}, onStageChange: () => {} } as never) as unknown as Record<string, any>;
game.startAtLevel(1);
game.setWeapon(id);
if (process.env.EFFECT && variants.supportsGunVariants(id)) {
  variants.setGunEffect(id, process.env.EFFECT as never);
}

const DT = 1 / 60;
const snap = (tag: string) => {
  game.render();
  writeFileSync(`${outDir}/transition-${tag}.png`, raw.toBuffer('image/png'));
  console.log(
    tag.padEnd(22),
    `state=${String(game.state).padEnd(5)}`,
    `level=${game.level.n}`,
    `frags=${game.frags.length}`,
    `flyers=${game.flyers.length}`,
    `particles=${game.particles.length}`,
    `stuck=${game.stuck}`,
    `banner=${game.bannerT.toFixed(2)}`,
  );
};

for (let i = 0; i < 40; i++) game.update(DT);
snap('l1-play');
for (let shot = 0; shot < 40 && game.state === 'play'; shot++) {
  game.cooldown = 0;
  game.shoot();
  for (let i = 0; i < 30 && game.state === 'play'; i++) game.update(DT);
}
snap('l1-clear');
for (const ms of [100, 400, 800, 1200, 1600]) {
  let left = Math.round(ms / 16.67);
  while (left-- > 0 && game.state === 'clear') game.update(DT);
  snap(`l1-clear+${ms}ms`);
}
let advanced = false;
for (let i = 0; i < 400 && !advanced; i++) {
  game.update(DT);
  if (game.level.n === 2 && game.state === 'intro') advanced = true;
}
snap('l2-intro-frame0');
for (let i = 0; i < 12; i++) game.update(DT);
snap('l2-intro-0.2s');
for (let i = 0; i < 48; i++) game.update(DT);
snap('l2-intro-1.0s');
console.log('done', outDir);
