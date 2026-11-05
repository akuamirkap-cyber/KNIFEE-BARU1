/**
 * PERFECT SHOT — v2 renderer.
 *
 * One function, `draw(ctx, scene)`, on a plain 2D context: no images, no
 * webfonts, no filters. That is what lets the same code draw in a browser, in
 * an offline Skia renderer and in a test, and it is why this file is small
 * enough to carry into another project whole.
 *
 * Board coordinates only. Scaling lives in `attach.ts`.
 */
import { BASE, CX, CY, GH, GW, HITS_TO_WIN, RADIUS } from '../config';
import type { Scene, Status } from '../game';
import type { Shape } from '../weapons';

const TAU = Math.PI * 2;

/** Inset of the wheel's metal ring. */
const RING_W = 10;

/**
 * Draw one frame.
 *
 * @param ctx  a 2D context already scaled so 1 unit = 1 board px.
 * @param scene the run to draw (see `game.ts`).
 */
export function draw(ctx: CanvasRenderingContext2D, scene: Scene): void {
  const t = scene.theme;
  ctx.save();
  // Screen shake: the whole board moves, never the HUD alone.
  if (scene.shake > 0.05) {
    const a = scene.shake;
    ctx.translate((Math.random() - 0.5) * a, (Math.random() - 0.5) * a);
  }

  sky(ctx, t.sky0, t.sky1);
  wheel(ctx, scene);
  aimLine(ctx, scene);
  gun(ctx, scene);

  // Knives in flight ride the aim line from the muzzle to the rim.
  for (const shot of scene.shots) {
    const x = CX;
    const y = BASE + (CY + RADIUS - BASE) * shot.t;
    ctx.save();
    ctx.translate(x, y);
    // Tip up, the way a thrown knife travels. A little spin late in the flight
    // keeps it lively without ever reading as "sideways".
    ctx.rotate(Math.sin(shot.spin) * 0.18 * shot.t);
    ctx.shadowColor = `rgba(${shot.rgb},0.9)`;
    ctx.shadowBlur = 14 * (1 - shot.t) + 4;
    shape(ctx, shot.shape, 1, shot.rgb);
    ctx.restore();
  }

  // Impact flash at the rim.
  if (scene.flash > 0.02) {
    ctx.save();
    const r = 26 + scene.flash * 46;
    const g = ctx.createRadialGradient(CX, CY + RADIUS, 0, CX, CY + RADIUS, r);
    g.addColorStop(0, `rgba(255,240,200,${0.75 * scene.flash})`);
    g.addColorStop(1, 'rgba(255,180,80,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(CX, CY + RADIUS, r, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  ctx.restore();
  hud(ctx, scene);
  if (scene.status !== 'play') endBanner(ctx, scene.status);
}

function sky(ctx: CanvasRenderingContext2D, a: string, b: string): void {
  const g = ctx.createLinearGradient(0, 0, 0, GH);
  g.addColorStop(0, a);
  g.addColorStop(1, b);
  ctx.fillStyle = g;
  ctx.fillRect(-40, -40, GW + 80, GH + 80);
  // A soft pool behind the wheel so the silhouette always has contrast.
  const pool = ctx.createRadialGradient(CX, CY, RADIUS * 0.4, CX, CY, RADIUS * 2.6);
  pool.addColorStop(0, 'rgba(120,160,200,0.10)');
  pool.addColorStop(1, 'rgba(120,160,200,0)');
  ctx.fillStyle = pool;
  ctx.fillRect(0, 0, GW, GH);
}

function wheel(ctx: CanvasRenderingContext2D, scene: Scene): void {
  const t = scene.theme;
  const squash = 1 + scene.bump * 0.05;
  ctx.save();
  ctx.translate(CX, CY);
  ctx.scale(1 / squash, squash);

  // Body: a steely disc with a warm rim.
  const body = ctx.createRadialGradient(0, -RADIUS * 0.4, RADIUS * 0.2, 0, 0, RADIUS);
  body.addColorStop(0, t.wheel1);
  body.addColorStop(0.62, t.wheel0);
  body.addColorStop(1, t.wheel2);
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.arc(0, 0, RADIUS, 0, TAU);
  ctx.fill();

  // Teeth: eight notches that make the spin readable even when the disc is plain.
  ctx.save();
  ctx.rotate(scene.rot);
  ctx.fillStyle = 'rgba(0,0,0,0.16)';
  for (let i = 0; i < 8; i++) {
    ctx.save();
    ctx.rotate((i / 8) * TAU);
    ctx.fillRect(-3, -RADIUS + 2, 6, RADIUS * 0.24);
    ctx.restore();
  }
  ctx.restore();

  // Ring + hub.
  ctx.strokeStyle = t.ring;
  ctx.lineWidth = RING_W;
  ctx.beginPath();
  ctx.arc(0, 0, RADIUS - RING_W / 2, 0, TAU);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, RADIUS - RING_W, 0, TAU);
  ctx.stroke();

  ctx.fillStyle = t.hub;
  ctx.beginPath();
  ctx.arc(0, 0, 13, 0, TAU);
  ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.30)';
  ctx.beginPath();
  ctx.arc(0, 0, 6, 0, TAU);
  ctx.fill();

  // Stuck knives: each sits on the rim at its own angle plus the wheel's spin.
  // The blade is buried in the wheel and the handle sticks out towards the
  // player, so the pile reads as knives thrown from the bottom.
  for (const k of scene.stuck) {
    const pop = Math.min(1, Math.max(0, (scene.time - k.born) / 0.14));
    const scale = 0.55 + 0.45 * pop;
    ctx.save();
    ctx.rotate(k.angle + scene.rot);
    ctx.translate(0, RADIUS - 4);
    ctx.scale(scale, scale);
    ctx.rotate(Math.PI / 2); // blade points inwards, handle outwards
    ctx.shadowColor = 'rgba(0,0,0,0.55)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetY = 2;
    shape(ctx, k.shape, 1.35, k.rgb);
    ctx.restore();
  }
  ctx.restore();
}

/** The dotted aim line from the muzzle up to the rim. */
function aimLine(ctx: CanvasRenderingContext2D, scene: Scene): void {
  const t = scene.theme;
  ctx.save();
  ctx.strokeStyle = t.aim;
  ctx.lineWidth = 2;
  ctx.setLineDash([7, 9]);
  ctx.beginPath();
  ctx.moveTo(CX, CY + RADIUS + 8);
  ctx.lineTo(CX, BASE - 40);
  ctx.stroke();
  ctx.restore();
}

/** The gun: a chunky pistol silhouette that kicks with the recoil. */
function gun(ctx: CanvasRenderingContext2D, scene: Scene): void {
  const t = scene.theme;
  const kick = scene.recoil * 14;
  ctx.save();
  ctx.translate(CX, BASE + kick);

  const metal = ctx.createLinearGradient(-22, 0, 22, 0);
  metal.addColorStop(0, t.gunDark);
  metal.addColorStop(0.5, t.gunLight);
  metal.addColorStop(1, t.gunDark);

  // Barrel.
  ctx.fillStyle = metal;
  roundRect(ctx, -14, -104, 28, 106, 8);
  ctx.fill();
  // Bore shadow, so the barrel reads as a tube rather than a slab.
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  roundRect(ctx, -7, -100, 5, 100, 2.5);
  ctx.fill();
  // Muzzle ring, lit with the equipped weapon's colour.
  ctx.fillStyle = `rgba(${scene.weapon.rgb},0.95)`;
  roundRect(ctx, -16, -110, 32, 11, 5);
  ctx.fill();
  // Front sight.
  ctx.fillStyle = t.gunLight;
  roundRect(ctx, -3, -96, 6, 9, 2);
  ctx.fill();
  // Slide + frame.
  ctx.fillStyle = t.gun;
  roundRect(ctx, -30, -18, 60, 30, 8);
  ctx.fill();
  // Grip, raked back.
  ctx.save();
  ctx.translate(6, 8);
  ctx.rotate(0.22);
  ctx.fillStyle = t.gunDark;
  roundRect(ctx, -16, 0, 32, 50, 10);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.07)';
  roundRect(ctx, -11, 7, 22, 36, 7);
  ctx.fill();
  ctx.restore();
  // Trigger guard.
  ctx.strokeStyle = t.gunLight;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(-12, 16, 13, -0.2, Math.PI * 0.9);
  ctx.stroke();
  ctx.restore();
}

/** Score pips, and the shot that is ready to fire. */
function hud(ctx: CanvasRenderingContext2D, scene: Scene): void {
  const t = scene.theme;
  const total = HITS_TO_WIN;
  const w = 20;
  const gap = 6;
  const span = total * w + (total - 1) * gap;
  const x0 = CX - span / 2;
  for (let i = 0; i < total; i++) {
    const done = i < scene.hits;
    ctx.fillStyle = done ? t.hud : 'rgba(255,255,255,0.14)';
    if (done) {
      ctx.shadowColor = t.hud;
      ctx.shadowBlur = 10;
    }
    roundRect(ctx, x0 + i * (w + gap), 44, w, 10, 5);
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  // Cooldown bar, right under the pips: a full bar means the next knife is ready.
  const ready = scene.weapon.cooldown > 0 ? 1 - scene.cooldown / scene.weapon.cooldown : 1;
  ctx.fillStyle = 'rgba(255,255,255,0.10)';
  roundRect(ctx, CX - 60, 62, 120, 5, 2.5);
  ctx.fill();
  ctx.fillStyle = `rgba(${scene.weapon.rgb},${0.55 + 0.45 * ready})`;
  roundRect(ctx, CX - 60, 62, 120 * ready, 5, 2.5);
  ctx.fill();
}

function endBanner(ctx: CanvasRenderingContext2D, status: Status): void {
  ctx.save();
  ctx.fillStyle = 'rgba(6,10,16,0.55)';
  ctx.fillRect(0, GH * 0.30, GW, 150);
  ctx.textAlign = 'center';
  ctx.fillStyle = status === 'win' ? '#ffd77a' : '#ff8a8a';
  ctx.font = '900 52px system-ui, sans-serif';
  ctx.fillText(status === 'win' ? 'CLEAR' : 'MISS', CX, GH * 0.30 + 78);
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.font = '600 16px system-ui, sans-serif';
  ctx.fillText(status === 'win' ? 'wheel destroyed' : 'knife on knife', CX, GH * 0.30 + 112);
  ctx.restore();
}

/** The five silhouettes, drawn around (0,0) pointing up, `s` = 1 is ~46 px long. */
function shape(ctx: CanvasRenderingContext2D, kind: Shape, s: number, rgb: string): void {
  ctx.save();
  ctx.scale(s, s);
  ctx.fillStyle = `rgb(${rgb})`;
  ctx.strokeStyle = `rgba(${rgb},0.55)`;
  ctx.lineWidth = 1.5;
  switch (kind) {
    case 'knife': {
      ctx.beginPath();
      ctx.moveTo(0, -30);
      ctx.lineTo(5, -8);
      ctx.lineTo(4, 4);
      ctx.lineTo(-4, 4);
      ctx.lineTo(-5, -8);
      ctx.closePath();
      ctx.fill();
      ctx.fillRect(-2.6, 4, 5.2, 20);
      break;
    }
    case 'arrow': {
      ctx.fillRect(-1.6, -26, 3.2, 46);
      ctx.beginPath();
      ctx.moveTo(0, -34);
      ctx.lineTo(7, -22);
      ctx.lineTo(-7, -22);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-8, 20);
      ctx.lineTo(0, 12);
      ctx.lineTo(8, 20);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'bullet': {
      ctx.beginPath();
      ctx.moveTo(0, -26);
      ctx.quadraticCurveTo(7, -12, 6, 6);
      ctx.lineTo(-6, 6);
      ctx.quadraticCurveTo(-7, -12, 0, -26);
      ctx.closePath();
      ctx.fill();
      ctx.fillRect(-6, 6, 12, 12);
      break;
    }
    case 'disc': {
      ctx.beginPath();
      ctx.ellipse(0, 0, 15, 6, 0, 0, TAU);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(0, 0, 7, 3, 0, 0, TAU);
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fill();
      break;
    }
    case 'spark': {
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * TAU;
        const r = i % 2 === 0 ? 22 : 8;
        const x = Math.cos(a) * r;
        const y = Math.sin(a) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
      break;
    }
  }
  ctx.restore();
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}
