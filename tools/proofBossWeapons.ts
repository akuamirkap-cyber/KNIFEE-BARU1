/**
 * Visual proof that every weapon lands the same way on a boss: the round and
 * its burst sit on the blue outline, whatever the gun is
 * (`npx tsx tools/proofBossWeapons.ts`).
 *
 * Four weapons of four different ported layers are fired at the same boss and
 * the frame is captured the instant the last round bites, then cropped to the
 * head and blown up. Writes `parity-proof/gameA-boss-weapons-on-outline.png`.
 */
import { createCanvas, Path2D, loadImage } from '@napi-rs/canvas';
import { DOMParser } from '@xmldom/xmldom';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { writeFileSync } from 'node:fs';
import { HeadArt } from '../src/games/perfect-shot/play/HeadArt';
import { Game } from '../src/games/gunhit/game/Game';
import { installSilentAudio } from './supportAudioSilent';
import { setGunEffect } from '../src/games/gunhit/game/art/gunVariants';

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
  setTimeout,
  clearTimeout,
  setInterval: () => 0,
  clearInterval: () => undefined,
  addEventListener: () => undefined,
  removeEventListener: () => undefined,
  devicePixelRatio: 1,
  innerWidth: 420,
  innerHeight: 750,
  matchMedia: () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} }),
});

const W = 420;
const H = 750;
const svg = renderToStaticMarkup(React.createElement(HeadArt, { kind: 'pirate' as never }));
const image = await loadImage(Buffer.from(svg));

const CASES: [string, string, string][] = [
  ['pistol', 'original', 'SET 1 · pistol'],
  ['ak47', 'set11', 'SET 11 · AK-47'],
  ['laser', 'set9', 'SET 9 · laser'],
  ['freeze', 'set7', 'SET 7 · freeze'],
];

const panels: { cv: ReturnType<typeof createCanvas>; title: string; note: string }[] = [];
for (const [id, effect, title] of CASES) {
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
  for (let i = 0; i < 240; i++) game.update(1 / 60);
  game.items = [];
  game.projs = [];
  game.bossMaxHp = 1e9;
  game.bossHp = 1e9;
  game.level.ammo = 1e5;
  game.bannerT = 0;
  if (game.s2?.texts) game.s2.texts.length = 0;
  if (game.s2?.flashes) game.s2.flashes.length = 0;
  setGunEffect(id as never, effect as never);
  game.setWeapon(id);
  // One round per heading, captured right after the last one bites.
  for (const deg of [0, 55, 110, 165, 220, 275, 330]) {
    game.rot = -Math.PI / 2 - (deg * Math.PI) / 180;
    game.ammoLeft = 99;
    game.cooldown = 0;
    game.reloadT = 0;
    game.press();
    for (let f = 0; f < 26; f++) game.update(1 / 60);
    game.onRelease();
    for (let f = 0; f < 8; f++) game.update(1 / 60);
  }
  game.rot = 0;
  game.render();
  panels.push({ cv, title, note: `${game.items.length} peluru · ${effect}` });
  game.destroy();
}

const hook = { x: W / 2, y: 250 };
const CW = 260;
const SC = 3;
const pad = 22;
const panel = CW * SC;
const capH = 56;
const footH = 64;
const sheet = createCanvas(panels.length * (panel + pad) + pad, panel + capH + pad * 2 + footH + 16);
const o = sheet.getContext('2d');
o.fillStyle = '#050a16';
o.fillRect(0, 0, sheet.width, sheet.height);
o.imageSmoothingEnabled = false;
panels.forEach((p, i) => {
  const x = pad + i * (panel + pad);
  o.drawImage(p.cv as unknown as Canvas, hook.x - CW / 2, hook.y - CW / 2, CW, CW, x, pad, panel, panel);
  o.strokeStyle = 'rgba(56,189,248,0.5)';
  o.lineWidth = 2;
  o.strokeRect(x - 1, pad - 1, panel + 2, panel + 2);
  o.fillStyle = '#7dd3fc';
  o.font = 'bold 22px monospace';
  o.fillText(p.title, x, pad + panel + 28);
  o.fillStyle = '#94a3b8';
  o.font = '15px monospace';
  o.fillText(p.note, x, pad + panel + 48);
});
o.fillStyle = '#e2e8f0';
o.font = 'bold 22px monospace';
o.fillText('GAME A · BOSS lvl 5 · tiap senjata menempel di garis biru, bukan di lingkaran', pad, sheet.height - 40);
o.fillStyle = '#94a3b8';
o.font = '15px monospace';
o.fillText('peluru + burst memakai piksel kontak yang sama; lapisan set tidak menggambar rim roda', pad, sheet.height - 18);
o.fillStyle = '#64748b';
o.font = '13px monospace';
o.fillText('serpihan putih di langit = muzzle spray senjata SET 7 (milik gun), bukan efek yang menempel di bos', pad, sheet.height - 2);

writeFileSync('parity-proof/gameA-boss-weapons-on-outline.png', sheet.toBuffer('image/png'));
console.log('wrote parity-proof/gameA-boss-weapons-on-outline.png');
