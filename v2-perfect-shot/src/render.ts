import { CX, CY, GUN_Y, GAMEPLAY_GUN_SCALE, W, H, TAU } from './config';
import { PistolGame } from './game';
import { pistol } from './art/pistol';
import { gunState } from './art/kit';
import { drawPistolRound } from './art/round';
import { drawOrange } from './art/orange';
import { paintStageForest, paintStageGrass, paintStageVignette } from './art/stageBackdrop';
import { drawBreakerCoin } from './art/coinArt';
import orangeSVG from './assets/orange.svg?raw';

let orange: HTMLCanvasElement | null = null;
let orangeLoading = false;
function loadOrange() {
  if (orangeLoading || typeof Image === 'undefined' || typeof document === 'undefined') return;
  orangeLoading = true;
  const image = new Image();
  image.onload = () => {
    // Rasterize the exact v1 SVG once, not a live SVG at every rotated frame.
    // Rotated/clipped frames reuse this bitmap, including the split animation.
    const tile = document.createElement('canvas'); tile.width = tile.height = 512;
    const ctx = tile.getContext('2d'); if (!ctx) return;
    ctx.drawImage(image, 0, 0, 512, 512); orange = tile;
  };
  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(orangeSVG)}`;
}

let forest: HTMLCanvasElement | null = null;
function background(c: CanvasRenderingContext2D, width: number, height: number) {
  if (typeof document !== 'undefined' && (!forest || forest.width !== width || forest.height !== height)) {
    const tile = document.createElement('canvas'); tile.width = width; tile.height = height;
    const ctx = tile.getContext('2d', { alpha: false });
    if (ctx) { ctx.setTransform(width / W, 0, 0, height / H, 0, 0); paintStageForest(ctx, 'orange'); paintStageVignette(ctx); forest = tile; }
  }
  if (forest) c.drawImage(forest, 0, 0, W, H);
  else { paintStageForest(c, 'orange'); paintStageVignette(c); }
}

function drawBullet(c: CanvasRenderingContext2D, x: number, y: number, tail: boolean) {
  c.save(); c.translate(x, y);
  if (tail) {
    const t = c.createLinearGradient(0, 44, 0, 0); t.addColorStop(0, 'rgba(255,217,160,0)'); t.addColorStop(1, 'rgba(255,217,160,.85)');
    c.fillStyle = t; c.fillRect(-2, 4, 4, 42);
  }
  c.beginPath(); c.moveTo(0, -7); c.quadraticCurveTo(-3, -2, -3, 3); c.lineTo(-2.76, 7); c.lineTo(2.76, 7); c.lineTo(3, 3); c.quadraticCurveTo(3, -2, 0, -7);
  const g = c.createLinearGradient(-3, 0, 3, 0); g.addColorStop(0, '#fff2c2'); g.addColorStop(.35, '#e2b04a'); g.addColorStop(.65, '#9a6a1d'); g.addColorStop(1, '#4e300a');
  c.fillStyle = g; c.fill(); c.strokeStyle = 'rgba(40,24,6,.6)'; c.lineWidth = .7; c.stroke(); c.restore();
}
export function renderGame(c: CanvasRenderingContext2D, game: PistolGame, backingW: number, backingH: number): void {
  loadOrange();
  c.setTransform(backingW / W, 0, 0, backingH / H, 0, 0);
  c.clearRect(0, 0, W, H);
  background(c, backingW, backingH); paintStageGrass(c, game.elapsed);
  const R = game.level.radius, t = game.elapsed;
  c.save();
  if (game.shake > .1) c.translate(Math.sin(t * 137) * game.shake * .35, Math.cos(t * 163) * game.shake * .35);
  if (game.phase !== 'clear') {
    c.save(); c.translate(CX, CY); c.rotate(game.rotation);
    const bump = 1 + game.bump * .035; c.scale(bump, bump);
    if (orange) c.drawImage(orange, -R, -R, R * 2, R * 2); else drawOrange(c, R);
    // V1's embedded 9mm holes, rotating with the orange, not free-floating sprites.
    for (const m of game.marks) {
      // The exposed casing makes the next collision visible, just as in v1.
      c.save(); c.translate(Math.cos(m.angle) * (R - 21), Math.sin(m.angle) * (R - 21)); c.rotate(m.angle - Math.PI / 2);
      c.beginPath(); c.rect(-7, 21, 14, 18); c.clip(); drawPistolRound(c, 38); c.restore();
      const x = Math.cos(m.angle) * (R - 3), y = Math.sin(m.angle) * (R - 3);
      c.fillStyle = '#3d200b'; c.beginPath(); c.ellipse(x, y, 4.7, 3.5, m.angle, 0, TAU); c.fill();
      c.strokeStyle = 'rgba(255,228,154,.75)'; c.lineWidth = 1; c.stroke();
    }
    for (const coin of game.rimCoins) if (!coin.taken) drawBreakerCoin(c, Math.cos(coin.angle) * (R + 18), Math.sin(coin.angle) * (R + 18), 10, t, 0, .68 + Math.abs(Math.cos(t * 2.8)) * .32, false, false);
    c.restore();
  } else if (game.phaseTime < .9) {
    // Only the level-1 orange is split; no sprite sheets or other targets are loaded.
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * TAU, age = game.phaseTime;
      c.save(); c.translate(CX + Math.cos(a) * age * 240, CY + Math.sin(a) * age * 240 + age * age * 420); c.rotate(game.rotation + age * (i % 2 ? -2 : 2));
      c.globalAlpha = Math.max(0, 1 - age / .9); c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, R, a, a + TAU / 8); c.closePath(); c.clip();
      if (orange) c.drawImage(orange, -R, -R, R * 2, R * 2); else drawOrange(c, R); c.restore();
    }
  }
  if (game.phase === 'play') {
    c.save(); c.globalCompositeOperation = 'lighter'; c.setLineDash([3, 12]); c.lineDashOffset = -t * 60;
    c.strokeStyle = 'rgba(226,232,240,0.3)'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(CX, GUN_Y - 4); c.lineTo(CX, CY + R); c.stroke(); c.setLineDash([]);
    const r = 10 + Math.sin(t * 8) * 2; c.strokeStyle = 'rgba(226,232,240,0.8)'; c.lineWidth = 1.8;
    c.beginPath(); c.arc(CX, CY + R, r, 0, TAU); c.stroke(); c.beginPath();
    for (let i = 0; i < 4; i++) { const a = i / 4 * TAU + t * 1.5; c.moveTo(CX + Math.cos(a) * (r + 3), CY + R + Math.sin(a) * (r + 3)); c.lineTo(CX + Math.cos(a) * (r + 9), CY + R + Math.sin(a) * (r + 9)); }
    c.stroke(); c.restore();
  }
  for (const p of game.projectiles) drawBullet(c, CX, p.y + 7, true);
  c.save(); c.translate(CX, GUN_Y + game.recoil * 22); c.scale(GAMEPLAY_GUN_SCALE, GAMEPLAY_GUN_SCALE);
  const old = gunState.sinceShot; gunState.sinceShot = game.sinceShot; pistol(c, 0, 0, t); gunState.sinceShot = old; c.restore();
  if (game.sinceShot < .06) {
    c.save(); c.globalCompositeOperation = 'lighter'; const flash = 1 - game.sinceShot / .06;
    const light = c.createRadialGradient(CX, GUN_Y - 8, 0, CX, GUN_Y - 8, 38 * flash); light.addColorStop(0, '#fff'); light.addColorStop(.22, '#fff3b0'); light.addColorStop(.55, 'rgba(255,170,60,.65)'); light.addColorStop(1, 'rgba(255,170,60,0)');
    c.fillStyle = light; c.fillRect(CX - 40, GUN_Y - 50, 80, 80); c.restore();
  }
  for (const p of game.particles) { c.globalAlpha = Math.max(0, p.life / p.max); c.fillStyle = p.color; c.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size); }
  c.globalAlpha = 1; c.restore();
  drawHUD(c, game);
  if (game.phase === 'intro') {
    const s = Math.min(1, game.phaseTime * 6); c.save(); c.translate(CX, H * .5); c.scale(s, s); c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = "80px 'Russo One',sans-serif"; c.strokeStyle = '#183547'; c.lineWidth = 12; c.strokeText('GO!!', 0, 0); c.fillStyle = '#ffd23f'; c.fillText('GO!!', 0, 0); c.restore();
  }
}
function drawHUD(c: CanvasRenderingContext2D, g: PistolGame) {
  const font = (s: number) => `${s}px 'Russo One',sans-serif`;
  c.save(); c.textBaseline = 'middle'; c.textAlign = 'left'; c.font = font(40); c.lineWidth = 5; c.strokeStyle = 'rgba(0,0,0,.6)'; c.strokeText(String(g.score), 22, 46); c.fillStyle = '#fff'; c.fillText(String(g.score), 22, 46);
  c.textAlign = 'right'; c.strokeText(String(g.coins), 369, 46); c.fillStyle = '#ffd23f'; c.fillText(String(g.coins), 369, 46); drawBreakerCoin(c, 394.5, 46, 17.5, g.elapsed, 0, .68 + Math.abs(Math.cos(g.elapsed * 2.8)) * .32, false, false);
  c.textAlign = 'center'; c.font = font(16); c.fillStyle = '#fff'; c.fillText('LEVEL 1', CX, 24);
  // One stage indicator. Do not imply there is a hidden five-stage campaign.
  c.fillStyle = 'rgba(255,255,255,.26)'; c.beginPath(); c.arc(CX, 47, 11.5, 0, TAU); c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.arc(CX, 47, 7, 0, TAU); c.fill();
  if (g.combo >= 2 && g.elapsed - g.lastHit < .5) {
    c.textAlign = 'left'; c.font = font(13); c.fillStyle = g.combo >= 3 ? '#ffd23f' : '#38bdf8'; c.fillText(`COMBO x${g.combo}`, 22, 74);
    c.fillStyle = 'rgba(255,255,255,.18)'; c.fillRect(22, 83, 82, 3); c.fillStyle = '#ffd23f'; c.fillRect(22, 83, 82 * Math.max(0, 1 - (g.elapsed - g.lastHit) / .5), 3);
  }
  for (let i = 0; i < 5; i++) { c.save(); c.translate(30, H - 40 - i * 26 - 14); c.scale(.5, .5); if (i < g.ammo) drawPistolRound(c, 38); else { c.globalAlpha = .25; c.fillStyle = '#000'; c.fillRect(-6, 0, 12, 42); } c.restore(); }
  c.textAlign = 'left'; c.font = font(14); c.fillStyle = 'rgba(255,255,255,.75)'; c.fillText(`x${g.ammo}`, 46, H - 30);
  c.textAlign = 'right'; c.font = font(12); c.fillStyle = 'rgba(255,255,255,.6)'; c.fillText('PISTOL • SEIMBANG', W - 14, H - 16);
  c.restore();
}
