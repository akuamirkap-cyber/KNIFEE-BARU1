/**
 * Side-by-side: slide 2's own game frame versus the same moment inside slide 1.
 *
 * Left is `games/fireworkgun` running itself; right is slide 1 with the
 * "Slide 2" design + shot cards selected. Both fire the same gun at the same
 * level and are sampled at the same time after the round lands, so the
 * backdrop, the glow, the round in flight and the round left in the wheel can be
 * compared directly.
 *
 * Usage: npx tsx tools/set-two-ab.ts [weapon] [outFile]
 */
import { installCanvasShim } from '../tests/supportCanvas';
import { createCanvas } from '@napi-rs/canvas';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
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

let seed = Number(process.env.SEED ?? 5150) >>> 0;
Math.random = () => {
  seed = (seed + 0x6d2b79f5) >>> 0;
  let t = seed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

installSilentAudio();
installCanvasShim();

const weapon = (process.argv[2] ?? 'firework') as string;
const outFile = process.argv[3] ?? `set-two-ab-${weapon}.png`;
mkdirSync(dirname(outFile), { recursive: true });

const DT = 1 / 60;
const LEVEL = 3;

function rawCanvas() {
  const raw = createCanvas(W, H) as unknown as Record<string, unknown>;
  raw.style = {};
  raw.addEventListener = () => undefined;
  raw.removeEventListener = () => undefined;
  raw.getBoundingClientRect = () => ({ left: 0, top: 0, width: W, height: H });
  return raw as unknown as HTMLCanvasElement & { toBuffer: (m: string) => Buffer };
}

// ---------------------------------------------------------------- slide 2
const { Game: TwoGame } = await import('../games/fireworkgun/src/game/engine.ts');
const { Sfx: TwoSfx } = await import('../games/fireworkgun/src/game/sfx.ts');
const twoRaw = rawCanvas();
const two = new TwoGame(twoRaw, new TwoSfx() as never, () => {}) as unknown as Record<string, any>;
two.setupLevel(LEVEL, true);
two.weapon = weapon;
two.state = 'playing';
two.ammo = 6;
two.queue = [28, 200, 340, 60, 280, 120];
two.shotIdx = 0;
two.time = 1.7;
two.recoil = 0;
two.loadP = 1;
two.wheelScale = 1;
two.rot = 0;
two.sfx = new Proxy({}, { get: () => () => {} });
for (let i = 0; i < 24; i++) { two.update(DT); two.render(); }
two.fire();
for (let i = 0; i < 26; i++) { two.update(DT); two.render(); }
writeFileSync('/tmp/two-ab.png', twoRaw.toBuffer('image/png'));

// ---------------------------------------------------------------- slide 1
const { Game } = await import('../src/games/gunhit/game/Game.ts');
const variants = await import('../src/games/gunhit/game/art/gunVariants.ts');
const oneRaw = rawCanvas();
const one = new Game(oneRaw, { onGameOver: () => {}, onStageChange: () => {} } as never) as unknown as Record<string, any>;
one.startAtLevel(LEVEL);
one.setWeapon(weapon);
variants.setGunVariant(weapon, 'set2' as never);
variants.setGunEffect(weapon, 'set2' as never);
while (one.state !== 'play') { one.update(DT); one.render(); }
for (let i = 0; i < 24; i++) { one.update(DT); one.render(); }
one.shoot();
for (let i = 0; i < 26; i++) { one.update(DT); one.render(); }
writeFileSync('/tmp/one-ab.png', oneRaw.toBuffer('image/png'));

// ---------------------------------------------------------------- sheet
const sheet = createCanvas(W * 2 + 24, H + 40);
const c = sheet.getContext('2d');
c.fillStyle = '#0b1020';
c.fillRect(0, 0, sheet.width, sheet.height);
c.fillStyle = '#e8eefc';
c.font = 'bold 18px sans-serif';
c.fillText(`slide 2 (asli)`, 8, 26);
c.fillText(`slide 1 · kartu "Slide 2"`, W + 16, 26);
const { loadImage } = await import('@napi-rs/canvas');
c.drawImage(await loadImage('/tmp/two-ab.png'), 0, 36);
c.drawImage(await loadImage('/tmp/one-ab.png'), W + 8, 36);
writeFileSync(outFile, sheet.toBuffer('image/png'));
console.log(`wrote ${outFile}`);
