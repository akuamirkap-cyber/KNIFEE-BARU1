/**
 * Ghost-wheel repro: slide 11's own hidden wheel shattering on top of slide 1's.
 *
 * Slide 11 (`games/game-8`) keeps its own `Game`: its own wooden wheel, its own
 * hit counter and, at `goal` hits, its own `breakWheel()` — eleven wedge pieces
 * clipped from *its* wooden face plus seventy wood chips. Slide 1 draws slide
 * 11's `fx`/`parts` over its own wheel, so that phantom shatter reads as a
 * second, extra wheel breaking while the real SGA wheel is fine.
 *
 * Usage: npx tsx tools/ghost-wheel.ts [outDir]
 */
import { installSilentAudio } from './supportAudioSilent';
import { createCanvas } from '@napi-rs/canvas';
import { mkdirSync, writeFileSync } from 'node:fs';

const W = 420;
const H = 760;
const g = globalThis as any;
g.document = {
  createElement: (t: string) => (t === 'canvas' ? createCanvas(64, 64) : { style: {} }),
  addEventListener: () => undefined,
  removeEventListener: () => undefined,
};
g.Image = class { width = 1; height = 1; onload: any = null; onerror: any = null; set src(_v: string) {} };
g.window = Object.assign(g.window ?? {}, {
  setTimeout, clearTimeout, setInterval: () => 0, clearInterval: () => undefined,
  addEventListener: () => undefined, removeEventListener: () => undefined,
  devicePixelRatio: 1, innerWidth: W, innerHeight: H,
});
installSilentAudio();
let seed = 777 >>> 0;
Math.random = () => {
  seed = (seed + 0x6d2b79f5) >>> 0;
  let t = seed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const outDir = process.argv[2] ?? '/tmp/ghost-wheel';
mkdirSync(outDir, { recursive: true });

const raw = createCanvas(W, H) as any;
raw.style = {};
raw.addEventListener = () => undefined;
raw.removeEventListener = () => undefined;
raw.getBoundingClientRect = () => ({ left: 0, top: 0, width: W, height: H });

const { Game } = await import('../src/games/gunhit/game/Game.ts');
const variants = await import('../src/games/gunhit/game/art/gunVariants.ts');

const game = new Game(raw as unknown as HTMLCanvasElement, { onGameOver: () => {}, onStageChange: () => {} } as never) as any;
game.startAtLevel(Number(process.env.LEVEL ?? 3));
game.setWeapon('pistol');
variants.setGunEffect('pistol', 'set11');
for (let i = 0; i < 40 && game.state === 'intro'; i++) game.update(1 / 60);

const s11 = game.s11State;
const rawWord = s11?.raw;
console.log('slide 11 hidden wheel:', rawWord ? `goal=${rawWord.goal} hits=${rawWord.hits} state=${rawWord.state}` : '(no raw world)');

let shot = 0;
let ward = 0;
for (; shot < 40; shot++) {
  if (game.state !== 'play') break;
  // Keep the SGA wheel from clearing/failing so every round lands as one hit.
  game.items = [];
  game.level.ammo = 99;
  game.ammoLeft = 99;
  game.cooldown = 0;
  game.reloadT = 0;
  game.shoot();
  for (let i = 0; i < 18; i++) game.update(1 / 60);
  const hits = rawWord ? rawWord.hits : -1;
  // `adopt()` pins `state = 'play'` every frame, so the break shows up as the
  // eleven wedge pieces (`max: 2.4`) plus its rings — not as a state the repro
  // can read. The fix makes `breakWheel()` a no-op, so this stays false.
  const wedges = rawWord ? rawWord.fx.filter((f: any) => f.max === 2.4).length : 0;
  const broke = wedges > 0;
  if (broke || shot % 5 === 4) {
    console.log(`shot ${shot + 1}: sga stuck=${game.stuck} | slide11 hits=${hits} pieces=${wedges} fx=${rawWord?.fx.length} parts=${rawWord?.parts.length}`);
  }
  if (broke) {
    game.render();
    writeFileSync(`${outDir}/ghost-wheel.png`, raw.toBuffer('image/png'));
    console.log('phantom wheel shatter captured ->', `${outDir}/ghost-wheel.png`);
    break;
  }
}
if (rawWord) console.log('final slide 11:', `hits=${rawWord.hits} goal=${rawWord.goal} state=${rawWord.state} fx=${rawWord.fx.length} parts=${rawWord.parts.length}`);
