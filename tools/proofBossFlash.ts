/**
 * Visual proof that a boss' hit feedback is painted *on the head*, not on a disc
 * of radius R (`npx tsx tools/proofBossFlash.ts`).
 *
 * Four frames of the same boss stage, cropped to the head and blown up:
 * idle (blue outline only), a hit flash, the burn tint, and the slow film.
 * Every one of them is clipped to the drawing's own footprint, so nothing ever
 * appears in the empty sky beside it — the old hitbox circle is gone from the
 * screen as well as from the collision.
 *
 * Writes `parity-proof/gameA-boss-hit-on-head.png`.
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
const LEVEL = 5;
const svg = renderToStaticMarkup(React.createElement(HeadArt, { kind: 'pirate' as never }));
const image = await loadImage(Buffer.from(svg));

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
const game = new Game(shim, { onGameOver: () => {} } as never) as unknown as Record<string, any>;
game.setWheelArtSource({ keyFor: () => 'boss|pirate', get: () => image, request: () => {}, markup: () => svg });
game.startAtLevel(LEVEL);
game.setWheelArt('boss|pirate', image, svg);
game.state = 'play';
for (let i = 0; i < 240; i++) game.update(1 / 60);
game.items = [];
game.projs = [];
game.bossMaxHp = 1e9;
game.bossHp = 1e9;
game.level.ammo = 1e5;
game.ammoLeft = 99;
game.bannerT = 0;
if (game.s2?.texts) game.s2.texts.length = 0;
if (game.s2?.flashes) game.s2.flashes.length = 0;

function shot() {
  game.render();
  return createCanvas(W, H);
}
function grab(cvOut: ReturnType<typeof createCanvas>) {
  cvOut.getContext('2d').drawImage(cv as unknown as Canvas, 0, 0);
  return cvOut;
}

const panels: { img: ReturnType<typeof createCanvas>; title: string; note: string }[] = [];

game.hitFlash = 0;
game.wheelFlash = 0;
game.burnT = 0;
game.slowT = 0;
panels.push({ img: grab(shot()), title: 'IDLE', note: 'hanya garis biru bentuk kepala' });

game.hitFlash = 1;
panels.push({ img: grab(shot()), title: 'HIT FLASH', note: 'kepala menyala, bukan cakram R' });
game.hitFlash = 0;

game.burnT = 0.4;
panels.push({ img: grab(shot()), title: 'BURN', note: 'tint api mengikuti bentuk kepala' });
game.burnT = 0;

game.slowT = 0.3;
game.slowKind = 'honey';
game.slowRgb = '255,220,120';
panels.push({ img: grab(shot()), title: 'SLOW / HONEY', note: 'film madu terpotong outline' });
game.slowT = 0;

// The outline pings the exact piece of the line the last rounds stopped on.
const stops: { px: number; py: number; r: number }[] = [];
for (const deg of [0, 60, 140, 215, 290]) {
  game.items = [];
  game.state = 'play';
  game.rot = -Math.PI / 2 - (Math.PI * deg) / 180;
  game.ammoLeft = 99;
  game.cooldown = 0;
  game.reloadT = 0;
  game.press();
  game.onRelease();
  for (let f = 0; f < 80 && (game.projs as any[]).length; f++) game.update(1 / 60);
  const fresh = (game.items as any[]).find((it) => it.px !== undefined);
  if (fresh) stops.push({ px: fresh.px, py: fresh.py, r: Math.hypot(fresh.px, fresh.py) });
}
game.bossEdgePing = stops.map((st) => ({ a: Math.atan2(st.py, st.px), born: game.time }));
game.rot = 0;
for (let f = 0; f < 30; f++) game.update(1 / 60);
game.bossEdgePing = stops.map((st) => ({ a: Math.atan2(st.py, st.px), born: game.time }));
panels.push({
  img: grab(shot()),
  title: '5 ROUNDS STOPPED',
  note: `${stops.length} titik, semua di garis (ping biru)`,
});

const hook = game.wheelHookRot(0) as { x: number; y: number };
const CW = 300;
const SC = 2;
const panel = Math.round(CW * SC);
const pad = 26;
const capH = 64;
const cols = 3;
const rows = Math.ceil(panels.length / cols);
const sheet = createCanvas(cols * panel + pad * (cols + 1), rows * (panel + capH) + pad * (rows + 1) + 78);
const o = sheet.getContext('2d');
o.fillStyle = '#050a16';
o.fillRect(0, 0, sheet.width, sheet.height);
o.imageSmoothingEnabled = false;
panels.forEach((p, i) => {
  const cx = pad + (i % cols) * (panel + pad);
  const cy = pad + Math.floor(i / cols) * (panel + capH + pad);
  o.drawImage(
    p.img as unknown as Canvas,
    hook.x - CW / 2,
    hook.y - CW / 2,
    CW,
    CW,
    cx,
    cy,
    panel,
    panel,
  );
  o.strokeStyle = 'rgba(56,189,248,0.55)';
  o.lineWidth = 2;
  o.strokeRect(cx - 1, cy - 1, panel + 2, panel + 2);
  o.fillStyle = '#7dd3fc';
  o.font = 'bold 20px monospace';
  o.fillText(p.title, cx, cy + panel + 26);
  o.fillStyle = '#94a3b8';
  o.font = '15px monospace';
  o.fillText(p.note, cx, cy + panel + 48);
});
o.fillStyle = '#e2e8f0';
o.font = 'bold 22px monospace';
o.fillText('GAME A · BOSS lvl 5 · efek hit hanya di dalam outline biru', pad, sheet.height - 46);
o.fillStyle = '#94a3b8';
o.font = '15px monospace';
o.fillText('tidak ada cakram / cincin radius R yang digambar di mode bos', pad, sheet.height - 24);
o.fillText(`${W}x${H} · crop ${CW}px · ${SC}x`, pad, sheet.height - 6);

writeFileSync('parity-proof/gameA-boss-hit-on-head.png', sheet.toBuffer('image/png'));
console.log('wrote parity-proof/gameA-boss-hit-on-head.png');
game.destroy();
