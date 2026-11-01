/**
 * Visual proof for the boss hitbox / attachment contract (run with
 * `npx tsx tools/proofBossAttach.ts`). Several weapon slides fire into the head,
 * then the same stuck rounds are rendered again with the head turned: they must
 * stay on the same feature of the drawing. Writes
 * `parity-proof/gameA-boss-attach-all-weapons.png`.
 */
import { createCanvas, Path2D, loadImage } from '@napi-rs/canvas';
import { DOMParser } from '@xmldom/xmldom';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { writeFileSync } from 'node:fs';
import { HeadArt } from '../src/games/perfect-shot/play/HeadArt';
import { Game } from '../src/games/gunhit/game/Game';
import { installSilentAudio } from './supportAudioSilent';
import { setGunEffect, setGunVariant } from '../src/games/gunhit/game/art/gunVariants';

const g = globalThis as unknown as Record<string, any>;
g.Path2D = Path2D;
g.DOMParser = DOMParser;
g.HTMLCanvasElement ??= createCanvas(2, 2).constructor;
g.document = {
  createElement: (t: string) => (t === 'canvas' ? createCanvas(64, 64) : { style: {} }),
  visibilityState: 'visible',
  addEventListener: () => {},
};
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
const svg = renderToStaticMarkup(React.createElement(HeadArt, { kind: 'pirate' as any }));
const image = await loadImage(Buffer.from(svg));

function make() {
  const cv = createCanvas(W, H);
  const ctx = cv.getContext('2d');
  const shim = {
    width: W,
    height: H,
    style: {},
    getBoundingClientRect: () => ({ width: W, height: H, left: 0, top: 0 }),
    getContext: () => ctx,
    addEventListener: () => {},
    removeEventListener: () => {},
  } as unknown as HTMLCanvasElement;
  const game = new Game(shim, { onGameOver: () => {} } as any) as unknown as Record<string, any>;
  game.setWheelArtSource({
    keyFor: () => 'boss|pirate',
    get: () => image,
    request: () => {},
    markup: () => svg,
  });
  game.startAtLevel(5);
  game.setWheelArt('boss|pirate', image, svg);
  game.state = 'play';
  game.showHitbox = true;
  for (let i = 0; i < 240; i++) game.update(1 / 60);
  game.items = [];
  game.projs = [];
  game.bossMaxHp = 1e9;
  game.bossHp = 1e9;
  game.level.ammo = 1e5;
  game.ammoLeft = 99;
  game.cooldown = 0;
  game.reloadT = 0;
  return { game, cv };
}

function fire(game: any, turns: number[]) {
  const radii: number[] = [];
  for (const turn of turns) {
    const before = new Set(game.items as any[]);
    game.rot = turn;
    for (let f = 0; f < 90; f++) {
      game.ammoLeft = 99;
      if (f % 10 === 0) game.press();
      if (f % 10 === 7) game.onRelease();
      game.update(1 / 60);
      const fresh = (game.items as any[]).filter((it) => !before.has(it));
      const stuck = fresh.find((it) => it.px !== undefined && it.py !== undefined);
      if (stuck) break;
    }
    game.onRelease();
    const fresh = (game.items as any[]).filter((it) => !before.has(it) && it.px !== undefined);
    if (fresh[0]) radii.push(Math.round(Math.hypot(fresh[0].px, fresh[0].py)));
  }
  game.rot = 0;
  return radii;
}

const PANELS: [string, string, string][] = [
  ['pistol', 'original', 'PISTOL'],
  ['sniper', 'original', 'SNIPER · set6'],
  ['plasma', 'original', 'PLASMA'],
  ['pistol', 'set11', 'MEGA BUSTER · set11'],
];
const ROUNDS = [0, 0.75, 1.4, 2.1, 2.9, 3.7];

// crop: keep the wheel and the gun barrel out, zoom the head
const CW = 268;
const CH = 268;
const SC = 1.55;
const pw = Math.round(CW * SC);
const ph = Math.round(CH * SC);
const footer = 150;
const sheet = createCanvas(pw * 4 + 40, ph * 2 + footer + 30);
const o = sheet.getContext('2d');
o.fillStyle = '#080d1a';
o.fillRect(0, 0, sheet.width, sheet.height);

const report: string[] = [];
for (let i = 0; i < PANELS.length; i++) {
  const [id, effect, label] = PANELS[i];
  setGunVariant(id as never, 'original');
  setGunEffect(id as never, effect as never);
  const { game, cv } = make();
  game.setWeapon(id);
  const radii = fire(game, ROUNDS);
  const centre = (game as any).wheelHookRot(0);
  report.push(`${label}: ${radii.length} rounds · radii ${radii.join(',')} · spread ${radii.length > 1 ? Math.max(...radii) - Math.min(...radii) : 0}px`);

  for (const [row, rot] of [[0, 0], [1, 1.25]] as const) {
    game.rot = rot;
    game.bannerT = 0;
    if (game.s2?.texts) game.s2.texts.length = 0;
    if (game.s2?.flashes) game.s2.flashes.length = 0;
    game.render();
    const img = await loadImage((cv as any).toBuffer('image/png'));
    const x = 10 + i * (pw + 6);
    const y = 10 + row * (ph + 6);
    o.drawImage(
      img,
      centre.x - CW / 2,
      centre.y - CH / 2,
      CW,
      CH,
      x + 4,
      y + 4,
      pw - 8,
      ph - 8,
    );
    o.strokeStyle = 'rgba(120,150,220,0.5)';
    o.lineWidth = 2;
    o.strokeRect(x, y, pw, ph);
    // what the old circular hitbox would have drawn: one ring through every hit
    const hook = (game as any).wheelHookRot(0);
    const k = (pw - 8) / CW;
    const cx = x + 4 + (hook.x - (centre.x - CW / 2)) * k;
    const cy = y + 4 + (hook.y - (centre.y - CH / 2)) * k;
    const seen = new Set<string>();
    for (const it of game.items as any[]) {
      if (it.px === undefined || it.py === undefined) continue;
      const key = `${Math.round(it.px)},${Math.round(it.py)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const w = (game as any).artToWorld(it.px, it.py);
      const dx = x + 4 + (w.x - (centre.x - CW / 2)) * k;
      const dy = y + 4 + (w.y - (centre.y - CH / 2)) * k;
      if (dx < x + 8 || dx > x + pw - 8 || dy < y + 8 || dy > y + ph - 8) continue;
      o.save();
      o.strokeStyle = '#ff8c1a';
      o.lineWidth = 2.5;
      o.beginPath();
      o.arc(dx, dy, 7, 0, Math.PI * 2);
      o.stroke();
      o.fillStyle = '#ffe066';
      o.beginPath();
      o.arc(dx, dy, 1.8, 0, Math.PI * 2);
      o.fill();
      o.restore();
    }
    o.save();
    o.setLineDash([6, 6]);
    o.strokeStyle = 'rgba(255,90,140,0.85)';
    o.lineWidth = 2;
    o.beginPath();
    o.arc(cx, cy, hook.R * k, 0, Math.PI * 2);
    o.stroke();
    if (row === 0) {
      o.setLineDash([]);
      o.strokeStyle = 'rgba(255,90,140,0.55)';
      o.beginPath();
      o.moveTo(cx - 7, cy);
      o.lineTo(cx + 7, cy);
      o.moveTo(cx, cy - 7);
      o.lineTo(cx, cy + 7);
      o.stroke();
    }
    o.restore();
  }
  game.destroy();
}

o.fillStyle = '#e8eeff';
o.font = 'bold 19px sans-serif';
o.textAlign = 'center';
PANELS.forEach((p, i) => {
  o.fillText(p[2], 10 + i * (pw + 6) + pw / 2, ph + 30);
  o.fillText('head turned +1.25 rad', 10 + i * (pw + 6) + pw / 2, ph * 2 + 40);
});

o.textAlign = 'left';
o.font = '16px monospace';
o.fillStyle = '#9fb3dd';
const lines = [
  'same rounds, same boss — top row head at rest, bottom row the SAME stuck rounds after the head turned.',
  'pink dashed = the old circular hitbox (radius R). orange ring = impact point, white = round direction.',
  'cyan/green = the silhouette the game now bites on.',
  '',
  ...report,
];
lines.forEach((t, i) => o.fillText(t, 14, ph * 2 + 78 + i * 20));

writeFileSync('parity-proof/gameA-boss-attach-all-weapons.png', (sheet as any).toBuffer('image/png'));
console.log(lines.join('\n'));
console.log('\nsheet', sheet.width, 'x', sheet.height);
