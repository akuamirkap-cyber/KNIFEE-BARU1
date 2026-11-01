/**
 * Deterministic frame snapshots for pixel-equality regression checks.
 *
 * Renders the real Game at a fixed seed and fixed dt, and writes PNGs plus a
 * per-file SHA-1 to a directory. Run before and after a rendering change and
 * compare the hashes: a pure performance change must not move a single pixel.
 *
 *   npx tsx tools/frameHash.ts /tmp/before [scene ...]
 *   npx tsx tools/frameHash.ts /tmp/after
 */
import { Canvas, createCanvas, loadImage } from '@napi-rs/canvas';
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const out = process.argv[2] ?? '/tmp/frames';
const only = process.argv.slice(3);
const W = 420;
const H = 760;
const DPR = 1.5;

const g = globalThis as unknown as Record<string, any>;
g.window = Object.assign(g.window ?? {}, {
  setTimeout, clearTimeout,
  setInterval: () => 0, clearInterval: () => undefined,
  addEventListener: () => undefined, removeEventListener: () => undefined,
  devicePixelRatio: DPR, innerWidth: W, innerHeight: H,
  matchMedia: () => ({ matches: true }),
});
g.HTMLCanvasElement = Canvas;
g.document = {
  createElement: (tag: string) => (tag === 'canvas' ? createCanvas(64, 64) : { style: {} }),
  addEventListener: () => undefined,
  removeEventListener: () => undefined,
};
g.Image = class {
  width = 1; height = 1; onload: (() => void) | null = null; onerror: (() => void) | null = null;
  set src(_v: string) { /* supplied directly */ }
};
Object.defineProperty(g, 'navigator', {
  value: { hardwareConcurrency: 8, deviceMemory: 4, maxTouchPoints: 5 }, configurable: true,
});
delete g.AudioContext;

let seed = 987654321;
Math.random = () => {
  seed = (seed + 0x6d2b79f5) >>> 0;
  let t = seed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const { installSilentAudio } = await import('./supportAudioSilent.ts');
installSilentAudio();
const { Game, makeLevel } = await import('../src/games/gunhit/game/Game.ts');
const { HeadArt } = await import('../src/games/perfect-shot/play/HeadArt.tsx');
const { levelConfig } = await import('../src/games/perfect-shot/play/levels.ts');

function makeCanvas() {
  const cv = createCanvas(Math.round(W * DPR), Math.round(H * DPR)) as any;
  cv.style = {};
  cv.addEventListener = () => undefined;
  cv.removeEventListener = () => undefined;
  cv.getBoundingClientRect = () => ({ left: 0, top: 0, width: W, height: H });
  return cv;
}

async function scene(name: (s: string) => boolean) {
  if (!name('x')) return;
}

mkdirSync(out, { recursive: true });
const scenes: { name: string; run: () => Promise<any> }[] = [];

for (const [name, level, weapon, effect, frames] of [
  ['normal-pistol', 3, 'pistol', 'set9', 40],
  ['normal-new', 7, 'shotgun', 'new', 30],
  ['boss-pirate', 5, 'pistol', 'original', 45],
  ['normal-set7', 12, 'plasma', 'set7', 35],
] as const) {
  if (only.length && !only.includes(name)) continue;
  scenes.push({
    name,
    run: async () => {
      const { setGunEffect, setGunVariant } = await import('../src/games/gunhit/game/art/gunVariants.ts');
      setGunVariant(weapon as never, 'original');
      setGunEffect(weapon as never, effect as never);
      const cv = makeCanvas();
      const game = new Game(cv, { onGameOver: () => {}, onStageChange: () => {} } as never) as any;
      if (level === 5) {
        const kind = levelConfig(5).head as string;
        const svg = renderToStaticMarkup(React.createElement(HeadArt, { kind: kind as never }));
        const image = await loadImage(Buffer.from(svg));
        game.setWheelArtSource({ keyFor: () => `boss|${kind}`, get: () => image, request: () => {}, markup: () => svg });
        game.startAtLevel(5);
        game.setWheelArt(`boss|${kind}`, image, svg);
      } else {
        game.level = makeLevel(level);
      }
      game.state = 'play';
      game.setWeapon(weapon);
      const dt = 1 / 60;
      for (let f = 0; f < frames; f++) {
        game.state = 'play';
        game.stuck = 0;
        game.ammoLeft = game.level.ammo;
        game.reloadT = 0;
        if (game.items.length > 8) game.items.splice(0, game.items.length - 8);
        if (game.cooldown <= 0) game.shoot();
        game.update(dt);
      }
      game.render();
      return cv.toBuffer('image/png');
    },
  });
}

const rows: { name: string; hash: string; bytes: number }[] = [];
for (const scene of scenes) {
  const png: Buffer = await scene.run();
  writeFileSync(`${out}/${scene.name}.png`, png);
  rows.push({ name: scene.name, hash: createHash('sha1').update(png).digest('hex'), bytes: png.length });
}
for (const r of rows) console.log(r.name.padEnd(16), r.hash, r.bytes);
