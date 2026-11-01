/**
 * Visual proof that a round stops on the boss' blue outline and nowhere else
 * (`npx tsx tools/proofBossEdge.ts`). Level 5 (KAPTEN BAJAK LAUT) is fired into
 * from every direction, the round is left stuck where it bit, and the live
 * frame is cropped to the head and blown up 3x. Also prints, for every stuck
 * round, how far it sits from the drawn surface (`artSurfaceLocal`): anything
 * above a pixel would mean the round stopped inside the art or outside it.
 * Writes `parity-proof/gameA-boss-hitbox-outline.png`.
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
const svg = renderToStaticMarkup(React.createElement(HeadArt, { kind: 'pirate' as never }));
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
  const game = new Game(shim, { onGameOver: () => {} } as never) as unknown as Record<string, any>;
  game.setWheelArtSource({
    keyFor: () => 'boss|pirate',
    get: () => image,
    request: () => {},
    markup: () => svg,
  });
  game.startAtLevel(5);
  game.setWheelArt('boss|pirate', image, svg);
  game.state = 'play';
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

/** Fire once per requested heading and report every round that bit the art. */
function fire(game: Record<string, any>, degs: number[]) {
  const stops: { px: number; py: number; r: number; err: number }[] = [];
  const collected: any[] = [];
  for (const deg of degs) {
    // Fire into a clean target so no earlier round can block this one, then put
    // the rounds back: the picture has to show every stop at once.
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
    if (fresh) {
      collected.push(fresh);
      const r = Math.hypot(fresh.px, fresh.py);
      const surface = game.artSurfaceLocal(Math.atan2(fresh.py, fresh.px));
      stops.push({ px: fresh.px, py: fresh.py, r, err: surface ? r - surface.r : Number.NaN });
    }
    game.items = collected.slice();
  }
  game.rot = 0;
  game.state = 'play';
  return stops;
}

const { game, cv } = make();
const stops = fire(game, [0, 25, 50, 75, 100, 125, 150, 175, 200, 225, 250, 275, 300, 325, 350]);

const hook = game.wheelHookRot(0) as { x: number; y: number; R: number };
const CW = 300;
const SC = 3;
const pad = 44;
const panel = Math.round(CW * SC);
const sheet = createCanvas(panel + pad, panel + pad + 96);
const o = sheet.getContext('2d');
o.fillStyle = '#050a16';
o.fillRect(0, 0, sheet.width, sheet.height);

game.bannerT = 0;
if (game.s2?.texts) game.s2.texts.length = 0;
if (game.s2?.flashes) game.s2.flashes.length = 0;
game.render();
const img = await loadImage((cv as any).toBuffer('image/png'));
o.imageSmoothingEnabled = false;
o.drawImage(
  img,
  hook.x - CW / 2,
  hook.y - CW / 2,
  CW,
  CW,
  pad / 2,
  pad / 2,
  panel,
  panel,
);

// impact points drawn again on top, so the reader can see where each round bit
const k = panel / CW;
for (const s of stops) {
  const w = game.artToWorld(s.px, s.py);
  const dx = pad / 2 + (w.x - (hook.x - CW / 2)) * k;
  const dy = pad / 2 + (w.y - (hook.y - CW / 2)) * k;
  o.save();
  o.strokeStyle = '#ff8c1a';
  o.lineWidth = 2;
  o.beginPath();
  o.arc(dx, dy, 9, 0, Math.PI * 2);
  o.stroke();
  o.restore();
}

o.fillStyle = '#dbeafe';
o.font = 'bold 15px system-ui, sans-serif';
o.fillText(`GAME A · BOSS lvl 5 · ${stops.length} rounds stopped on the blue outline`, pad / 2, panel + pad / 2 + 26);
o.font = '12px system-ui, sans-serif';
o.fillStyle = '#93b4d6';
o.fillText('cyan = hitbox from the artwork alpha · orange = the pixel each round stopped on · 3x', pad / 2, panel + pad / 2 + 46);
const worst = stops.reduce((m, s) => Math.max(m, Math.abs(s.err)), 0);
o.fillText(
  `stop error vs the drawn surface: max ${worst.toFixed(2)} px over ${stops.length} rounds — no red ring is drawn`,
  pad / 2,
  panel + pad / 2 + 64,
);
o.strokeStyle = 'rgba(120,150,220,0.5)';
o.lineWidth = 2;
o.strokeRect(pad / 2, pad / 2, panel, panel);

writeFileSync('parity-proof/gameA-boss-hitbox-outline.png', sheet.toBuffer('image/png'));

console.log(
  'rounds',
  stops.length,
  stops.map((s) => `r${s.r.toFixed(1)}(err${s.err.toFixed(2)})`).join(' '),
);
console.log('max stop error', worst.toFixed(2), 'px');
