/**
 * Proof sheet: the HUD names the boss after the head the game actually wears,
 * and the collision overlay draws that head's shape (no ring).
 * `npx tsx tools/proofBossName.ts` → parity-proof/gameA-boss-names.png
 */
import { createCanvas, Path2D, loadImage } from '@napi-rs/canvas';
import { DOMParser } from '@xmldom/xmldom';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { writeFileSync } from 'node:fs';
import { HeadArt } from '../src/games/perfect-shot/play/HeadArt';
import { levelConfig } from '../src/games/perfect-shot/play/levels';
import { Game } from '../src/games/gunhit/game/Game';
import { installSilentAudio } from './supportAudioSilent';

const g = globalThis as unknown as Record<string, any>;
g.Path2D = Path2D;
g.DOMParser = DOMParser;
g.HTMLCanvasElement ??= createCanvas(2, 2).constructor;
g.document = {
  createElement: (t: string) => (t === 'canvas' ? createCanvas(64, 64) : { style: {} }),
  visibilityState: 'visible',
  addEventListener: () => {},
};
g.Image ??= class { width = 1; height = 1; set src(_s: string) {} };
g.requestAnimationFrame = () => 0;
g.cancelAnimationFrame = () => {};
installSilentAudio();
g.window = Object.assign(g.window ?? {}, {
  setTimeout, clearTimeout,
  setInterval: () => 0, clearInterval: () => undefined,
  addEventListener: () => undefined, removeEventListener: () => undefined,
  devicePixelRatio: 1, innerWidth: 420, innerHeight: 750,
  matchMedia: () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} }),
});

const W = 420;
const H = 750;

async function frame(level: number) {
  const kind = levelConfig(level).head as string;
  const svg = renderToStaticMarkup(React.createElement(HeadArt, { kind: kind as never }));
  const image = await loadImage(Buffer.from(svg));
  const cv = createCanvas(W, H);
  const ctx = cv.getContext('2d');
  const canvas = {
    width: W, height: H, style: {},
    getBoundingClientRect: () => ({ width: W, height: H, left: 0, top: 0 }),
    getContext: () => ctx,
    addEventListener: () => {}, removeEventListener: () => {},
  } as unknown as HTMLCanvasElement;
  const game = new Game(canvas, { onGameOver: () => {} } as never) as unknown as Record<string, any>;
  game.setWheelArtSource({ keyFor: () => `boss|${kind}`, get: () => image, request: () => {}, markup: () => svg });
  game.startAtLevel(level);
  game.setWheelArt(`boss|${kind}`, image as unknown as HTMLImageElement, svg);
  game.state = 'play';
  for (let i = 0; i < 240; i++) game.update(1 / 60);
  game.bossMaxHp = 1e9;
  game.bossHp = 1e9;
  for (const turn of [0.4, 2.1, 3.6]) {
    game.rot = turn;
    const before = new Set(game.items as any[]);
    for (let f = 0; f < 100; f++) {
      game.ammoLeft = 99;
      game.level.ammo = 1e5;
      if (f % 10 === 0) game.press();
      if (f % 10 === 7) game.onRelease();
      game.update(1 / 60);
      if ((game.items as any[]).some((it) => !before.has(it) && it.px !== undefined)) break;
    }
    game.onRelease();
  }
  game.rot = -1.2;
  game.bannerT = 0;
  game.render();
  const name = game.level.name as string;
  game.destroy();
  return { cv, name, kind };
}

const panels = [await frame(5), await frame(20), await frame(15)];
const SC = 0.62;
const pw = Math.round(W * SC);
const ph = Math.round(H * SC);
const out = createCanvas(pw * panels.length + 20, ph + 56);
const o = out.getContext('2d');
o.fillStyle = '#080d1a';
o.fillRect(0, 0, out.width, out.height);
panels.forEach((p, i) => {
  o.drawImage(p.cv as never, i * (pw + 6) + 4, 6, pw, ph);
  o.strokeStyle = 'rgba(120,150,220,0.45)';
  o.lineWidth = 1.5;
  o.strokeRect(i * (pw + 6) + 4, 6, pw, ph);
});
o.fillStyle = '#9fb3dd';
o.font = '15px sans-serif';
o.textAlign = 'center';
o.fillText('nama boss = kepala yang dipakai (Perfect Shot) · tabrakan = bentuk gambar, bukan roda', out.width / 2, ph + 34);
writeFileSync('parity-proof/gameA-boss-names.png', out.toBuffer('image/png'));
console.log(panels.map((p) => `${p.kind} → ${p.name}`).join('\n'));
console.log('sheet', out.width, 'x', out.height);
