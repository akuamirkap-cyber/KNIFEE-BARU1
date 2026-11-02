/**
 * Visual proof of Game A's HUD wallet (`npx tsx tools/proofHudWallet.ts`).
 *
 * Renders the top strip of a normal stage and of a special stage at three
 * clock values, so the coin next to the counter can be seen flipping (it used
 * to be drawn at t = 0, i.e. a frozen icon), and the coin counter can be
 * compared with the score on the left. Writes
 * `parity-proof/gameA-hud-wallet.png`.
 */
import { createCanvas, Path2D, loadImage } from '@napi-rs/canvas';
import { DOMParser } from '@xmldom/xmldom';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { writeFileSync } from 'node:fs';
import { HeadArt } from '../src/games/perfect-shot/play/HeadArt';
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
  setTimeout, clearTimeout, setInterval: () => 0, clearInterval: () => undefined,
  addEventListener: () => undefined, removeEventListener: () => undefined,
  devicePixelRatio: 1, innerWidth: 420, innerHeight: 750,
  matchMedia: () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} }),
});

const W = 420;
const H = 750;
const svg = renderToStaticMarkup(React.createElement(HeadArt, { kind: 'pirate' as never }));
const image = await loadImage(Buffer.from(svg));

const CAPTURES: { mode: 'normal' | 'special'; clock: number; title: string }[] = [
  { mode: 'normal', clock: 0, title: 'normal · t 0,0 s' },
  { mode: 'normal', clock: 0.55, title: 'normal · t 0,55 s' },
  { mode: 'normal', clock: 1.1, title: 'normal · t 1,10 s' },
  { mode: 'special', clock: 0, title: 'special · t 0,0 s' },
  { mode: 'special', clock: 0.55, title: 'special · t 0,55 s' },
  { mode: 'special', clock: 1.1, title: 'special · t 1,10 s' },
];

const panels: { cv: ReturnType<typeof createCanvas>; title: string }[] = [];
for (const cap of CAPTURES) {
  const cv = createCanvas(W, H);
  const ctx = cv.getContext('2d');
  const shim = {
    width: W, height: H, style: {},
    getBoundingClientRect: () => ({ width: W, height: H, left: 0, top: 0 }),
    getContext: () => ctx,
    addEventListener: () => {}, removeEventListener: () => {},
  } as unknown as HTMLCanvasElement;
  const game = new Game(shim, { onGameOver: () => {} } as never) as unknown as Record<string, any>;
  game.setWheelArtSource({ keyFor: () => 'boss|pirate', get: () => image, request: () => {}, markup: () => svg });
  game.startAtLevel(5);
  game.setWheelArt('boss|pirate', image, svg);
  game.state = 'play';
  if (cap.mode === 'special') {
    game.startAtLevel(9); // one of the three special stages: the compact HUD
    game.state = 'play';
  }
  game.score = 1240;
  game.coins = 86;
  game.coinPulse = 0;
  game.time = cap.clock;
  game.render();
  panels.push({ cv, title: cap.title });
  game.destroy();
}

const CW = 420;
const CH = 96;
const SC = 1.35;
const pad = 14;
const panelW = Math.round(CW * SC);
const panelH = Math.round(CH * SC);
const capH = 26;
const sheet = createCanvas(panelW + pad * 2, panels.length * (panelH + capH + pad) + pad + 46);
const o = sheet.getContext('2d');
o.fillStyle = '#050a16';
o.fillRect(0, 0, sheet.width, sheet.height);
o.imageSmoothingEnabled = false;
panels.forEach((p, i) => {
  const y = pad + i * (panelH + capH + pad);
  o.drawImage(p.cv as unknown as Canvas, 0, 0, CW, CH, pad, y, panelW, panelH);
  o.strokeStyle = 'rgba(56,189,248,0.45)';
  o.lineWidth = 1.5;
  o.strokeRect(pad - 0.5, y - 0.5, panelW + 1, panelH + 1);
  o.fillStyle = '#7dd3fc';
  o.font = 'bold 15px monospace';
  o.fillText(p.title, pad + 2, y + panelH + 18);
});
o.fillStyle = '#e2e8f0';
o.font = 'bold 16px monospace';
o.fillText('GAME A · HUD: koin kanan atas = ukuran font skor kiri atas', pad, sheet.height - 26);
o.fillStyle = '#94a3b8';
o.font = '12px monospace';
o.fillText('koin memutar mengikuti jam permainan (bukan frame pertama yang membeku)', pad, sheet.height - 10);

writeFileSync('parity-proof/gameA-hud-wallet.png', sheet.toBuffer('image/png'));
console.log('wrote parity-proof/gameA-hud-wallet.png');
