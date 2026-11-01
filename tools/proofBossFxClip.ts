/**
 * Proof: in boss mode a round's splinters stay on the blue outline of the boss
 * drawing. Each row is the SAME frame rendered twice — as the game paints it
 * now (clipped to the outline) and with the clip taken away, which is exactly
 * what it looked like before. No physics, no spawn positions change.
 *
 *   npx tsx tools/proofBossFxClip.ts
 *   -> parity-proof/gameA-boss-fx-outline.png
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
g.Path2D = Path2D; g.DOMParser = DOMParser;
g.HTMLCanvasElement ??= createCanvas(2, 2).constructor;
g.document = { createElement: (t: string) => (t === 'canvas' ? createCanvas(64, 64) : { style: {} }), visibilityState: 'visible', addEventListener: () => {} };
g.requestAnimationFrame = () => 0; g.cancelAnimationFrame = () => {};
installSilentAudio();
g.window = Object.assign(g.window ?? {}, { setTimeout, clearTimeout, setInterval: () => 0, clearInterval: () => undefined, addEventListener: () => undefined, removeEventListener: () => undefined, devicePixelRatio: 2, innerWidth: 420, innerHeight: 760, matchMedia: () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} }) });
const W = 420, H = 760, DPR = 2;
const svg = renderToStaticMarkup(React.createElement(HeadArt, { kind: 'pirate' as never }));
const image = await loadImage(Buffer.from(svg));
const CROP = 280, SC = 2;
const shots = ['shotgun', 'firework'];
const sheet = createCanvas(CROP * SC * 2 + 16, CROP * SC * shots.length + 40 * shots.length + 30);
const so = sheet.getContext('2d');
so.fillStyle = '#0b1420'; so.fillRect(0, 0, sheet.width, sheet.height);
for (const [row, id] of shots.entries()) {
  const cv = createCanvas(W * DPR, H * DPR); const ctx = cv.getContext('2d') as unknown as CanvasRenderingContext2D;
  const canvas = { width: W * DPR, height: H * DPR, style: {}, getBoundingClientRect: () => ({ width: W, height: H, left: 0, top: 0 }), getContext: () => ctx, addEventListener: () => {}, removeEventListener: () => {} } as unknown as HTMLCanvasElement;
  const game = new Game(canvas, { onGameOver: () => {}, onStageChange: () => {} } as never) as unknown as Record<string, any>;
  game.setWheelArtSource({ keyFor: () => 'boss|pirate', get: () => image, request: () => {}, markup: () => svg });
  game.startAtLevel(5);
  game.setWheelArt('boss|pirate', image as unknown as HTMLImageElement, svg);
  game.setWeapon(id);
  game.state = 'play';
  for (let f = 0; f < 240; f++) game.update(1 / 60);
  game.bossMaxHp = 1e9; game.bossHp = 1e9;
  for (let k = 0; k < 2; k++) {
    game.rot = -Math.PI / 2;
    game.state = 'play'; game.ammoLeft = 99; game.cooldown = 0; game.reloadT = 0; game.holding = true;
    game.press(); game.onRelease();
    for (let f = 0; f < 200 && game.projs.length; f++) game.update(1 / 60);
  }
  game.bannerT = 0;
  for (let f = 0; f < 4; f++) game.update(1 / 60);
  const capture = async (path: string) => {
    game.render();
    const png = await loadImage(cv.toBuffer('image/png'));
    writeFileSync(path, png ? cv.toBuffer('image/png') : Buffer.alloc(0));
    const out = createCanvas(CROP * SC, CROP * SC);
    const o = out.getContext('2d');
    o.imageSmoothingEnabled = false;
    o.drawImage(png, (210 - CROP / 2) * DPR, (game.targetY + game.level.radius * 0.22 - CROP / 2) * DPR, CROP * DPR, CROP * DPR, 0, 0, CROP * SC, CROP * SC);
    return out;
  };
  const after = await capture(`/tmp/fx_${id}_after.png`);
  const keepPaint = game.bossClipPaint;
  game.bossClipPaint = () => false; // the old behaviour: nothing to clip against
  const before = await capture(`/tmp/fx_${id}_before.png`);
  game.bossClipPaint = keepPaint;
  const y = 30 + row * (CROP * SC + 40);
  so.fillStyle = '#ff9a9a'; so.font = '700 17px monospace';
  so.fillText(`${id.toUpperCase()} — SEBELUM (tanpa clip)`, 10, y + 16);
  so.fillStyle = '#8dffbe';
  so.fillText(`${id.toUpperCase()} — SESUDAH (clip ke outline bos)`, CROP * SC + 26, y + 16);
  so.drawImage(before, 0, y + 26);
  so.drawImage(after, CROP * SC + 16, y + 26);
  console.log(id, 'particles', game.particles.length, 's9', game.s9State?.particles?.length ?? 0);
  game.destroy?.();
}
writeFileSync('parity-proof/gameA-boss-fx-outline.png', sheet.toBuffer('image/png'));
console.log('written parity-proof/gameA-boss-fx-outline.png');
