import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { createCanvas, Path2D, loadImage } from '@napi-rs/canvas';
import { DOMParser as XmldomParser } from '@xmldom/xmldom';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { HeadArt } from '../src/games/perfect-shot/play/HeadArt';
import { installSilentAudio } from '../tools/supportAudioSilent';

const ROOT = path.resolve(import.meta.dirname, '..');
const read = (file: string) => readFileSync(path.join(ROOT, file), 'utf8');

const globals = globalThis as unknown as Record<string, any>;
globals.Path2D ??= Path2D;
globals.DOMParser ??= XmldomParser;
globals.HTMLCanvasElement ??= createCanvas(2, 2).constructor;
globals.document ??= {
  createElement: (tag: string) => (tag === 'canvas' ? createCanvas(64, 64) : { style: {} }),
  visibilityState: 'visible',
  addEventListener: () => {},
};
globals.Image ??= class {
  width = 1;
  height = 1;
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  set src(_src: string) { /* the suite supplies the boss art directly */ }
};
globals.requestAnimationFrame ??= () => 0;
globals.cancelAnimationFrame ??= () => {};
installSilentAudio();
globals.window = Object.assign(globals.window ?? {}, {
  setTimeout, clearTimeout,
  setInterval: () => 0, clearInterval: () => undefined,
  addEventListener: () => undefined, removeEventListener: () => undefined,
  devicePixelRatio: 1, innerWidth: 420, innerHeight: 750,
  matchMedia: () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} }),
});

const { Game } = await import('../src/games/gunhit/game/Game.ts');
const { setGunEffect } = await import('../src/games/gunhit/game/art/gunVariants.ts');
const { solidOffset } = await import('./supportBossOutline.ts');

const W = 420;
const H = 750;
const HEADS = ['pirate', 'jester', 'dragon', 'skeleton', 'tiki', 'viking', 'oni', 'robot', 'alien', 'vampire', 'sun'];

async function bossStage(kind: string, level: number) {
  const svg = renderToStaticMarkup(React.createElement(HeadArt, { kind: kind as never }));
  const image = await loadImage(Buffer.from(svg));
  const cv = createCanvas(W, H);
  const ctx = cv.getContext('2d');
  const shim = {
    width: W, height: H, style: {},
    getBoundingClientRect: () => ({ width: W, height: H, left: 0, top: 0 }),
    getContext: () => ctx,
    addEventListener: () => {}, removeEventListener: () => {},
  } as unknown as HTMLCanvasElement;
  const game = new Game(shim, { onGameOver: () => {}, onStageChange: () => {} } as never) as unknown as Record<string, any>;
  game.setWheelArtSource({ keyFor: () => `boss|${kind}`, get: () => image, request: () => {}, markup: () => svg });
  game.startAtLevel(level);
  game.setWheelArt(`boss|${kind}`, image as unknown as HTMLImageElement, svg);
  game.state = 'play';
  for (let i = 0; i < 240; i++) game.update(1 / 60);
  game.items = [];
  game.projs = [];
  game.bossMaxHp = 1e9;
  game.bossHp = 1e9;
  game.level.ammo = 1e5;
  game.ammoLeft = 99;
  game.rot = 0;
  return { game, cv, ctx };
}

function frame(game: Record<string, any>) {
  game.render();
  const cv = game.canvas as unknown as { getContext: (k: string) => any };
  return cv.getContext('2d').getImageData(0, 0, W, H).data as Uint8ClampedArray;
}

/** How far (mask px) an art-local point is outside the solid footprint, ≤0 inside. */
function outsideBy(game: Record<string, any>, lx: number, ly: number) {
  const mask = game.artMask as { size: number; span: number; solid: Uint8Array };
  const R = game.level.radius as number;
  const u = Math.floor(((lx / R / mask.span) + 1) * 0.5 * mask.size);
  const v = Math.floor(((ly / R / mask.span) + 1) * 0.5 * mask.size);
  const solid = (px: number, py: number) => {
    if (px < 0 || py < 0 || px >= mask.size || py >= mask.size) return false;
    return mask.solid[py * mask.size + px] === 1;
  };
  if (solid(u, v)) return 0;
  for (let r = 1; r <= 6; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        if (solid(u + dx, v + dy)) return r;
      }
    }
  }
  return 99;
}


/** Is this art-local point within `r` mask px of the footprint's boundary? */
function nearEdge(game: Record<string, any>, lx: number, ly: number, r = 4) {
  const mask = game.artMask as { size: number; span: number; solid: Uint8Array };
  const R = game.level.radius as number;
  const u = Math.floor(((lx / R / mask.span) + 1) * 0.5 * mask.size);
  const v = Math.floor(((ly / R / mask.span) + 1) * 0.5 * mask.size);
  const solid = (px: number, py: number) =>
    px >= 0 && py >= 0 && px < mask.size && py < mask.size && mask.solid[py * mask.size + px] === 1;
  const me = solid(u, v);
  for (let d = 1; d <= r; d++) {
    for (let dy = -d; dy <= d; dy++) {
      for (let dx = -d; dx <= d; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== d) continue;
        if (solid(u + dx, v + dy) !== me) return true;
      }
    }
  }
  return false;
}

/**
 * Pixels that a flash changed must be pixels of the head. This is the visual
 * half of the outline rule: the collision is the drawing, so nothing on screen
 * may paint a disc of radius R behind it — that circle is what made hits look
 * like they landed on a ring.
 */
function assertFlashStaysOnHead(game: Record<string, any>, before: Uint8ClampedArray, after: Uint8ClampedArray, label: string) {
  let changed = 0;
  let worst = 0;
  const R = game.level.radius as number;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      if (before[i] === after[i] && before[i + 1] === after[i + 1] && before[i + 2] === after[i + 2]) continue;
      changed++;
      const local = game.worldToArt(x + 0.5, y + 0.5) as { x: number; y: number };
      if (Math.hypot(local.x, local.y) > R * 1.6) continue;
      const off = outsideBy(game, local.x, local.y);
      if (off > worst) worst = off;
    }
  }
  assert.ok(changed > 200, `${label}: the flash really painted something (${changed} px)`);
  assert.ok(worst <= 2, `${label}: every painted pixel is on the head (worst ${worst} mask px away)`);
}

test('a boss hit lights up the head, never a disc of radius R', async () => {
  // The mechanism, tested directly and deterministically: with the boss clip in
  // force, a full-screen fill of the target's own frame may only touch pixels
  // of the head. That is what every hit / burn / slow flash now goes through.
  for (let level = 5; level <= 55; level += 5) {
    const kind = HEADS[level / 5 - 1];
    const { game, cv } = await bossStage(kind, level);
    game.items = [];
    game.projs = [];
    game.hitFlash = 0;
    game.wheelFlash = 0;
    game.slowT = 0;
    game.state = 'play';
    // Reproduce the exact chain the head is drawn with.
    const ctx = cv.getContext('2d');
    ctx.clearRect(0, 0, W, H);
    const f = game.wheelDrawFrame() as { x: number; y: number; sx: number; sy: number };
    const decor = game.bossDecorMatrix() as { a: number; b: number; c: number; d: number; e: number; f: number };
    ctx.save();
    ctx.translate(f.x, f.y);
    ctx.scale(f.sx, f.sy);
    ctx.transform(decor.a, decor.b, decor.c, decor.d, decor.e, decor.f);
    ctx.rotate(game.rot as number);
    assert.equal(game.clipBossSurface(ctx), true, `${kind}: the boss clip exists`);
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(-400, -400, 800, 800);
    ctx.restore();
    const data = ctx.getImageData(0, 0, W, H).data as Uint8ClampedArray;
    let painted = 0;
    let worst = 0;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const i = (y * W + x) * 4;
        if (data[i] < 200 || data[i + 1] > 60 || data[i + 2] > 60) continue;
        painted++;
        const local = game.worldToArt(x + 0.5, y + 0.5) as { x: number; y: number };
        const off = outsideBy(game, local.x, local.y);
        if (off > worst) worst = off;
      }
    }
    assert.ok(painted > 400, `${kind}: the fill really painted (${painted} px)`);
    assert.ok(worst <= 2, `${kind}: every painted pixel is on the head (worst ${worst} mask px)`);
    game.destroy();
  }
});

test('no circle is drawn around a boss while it fights', () => {
  const src = read('src/games/gunhit/game/Game.ts');
  // The three surface flashes and the slow film all go through one boss-aware fill.
  assert.match(src, /private clipBossSurface\(c: CanvasRenderingContext2D\): boolean/);
  assert.match(src, /private paintTargetSurface\(c: CanvasRenderingContext2D, style: string\)/);
  assert.equal((src.match(/this\.paintTargetSurface\(/g) ?? []).length, 3,
    'wheelFlash, hitFlash and burn use the boss-aware fill');
  assert.ok((src.match(/this\.clipBossSurface\(c\)/g) ?? []).length >= 1,
    'the slow film is clipped to the head');
  // The entrance shockwave would draw two rings at radius R: skipped on a boss.
  assert.match(src, /\/\/ A boss is not a disc[\s\S]{0,220}?if \(this\.level\.boss\) continue;/);
  // The old disc-shaped hit flashes are gone.
  assert.ok(!/hitFlash \* 0\.28[^]{0,300}?arc\(0, 0, R/.test(src), 'the hit flash is not a circle');
  assert.ok(!/burnT \/ 0\.4[^]{0,300}?arc\(0, 0, R/.test(src), 'the burn tint is not a circle');
});


test('a boss hit pings the exact piece of the outline it stopped on', async () => {
  const { game } = await bossStage('pirate', 5);
  game.bossEdgePing = [];
  const before = frame(game);
  game.bossEdgePing = [{ a: 0.7, born: game.time }];
  const after = frame(game);
  let changed = 0;
  let off = 0;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      if (before[i] === after[i] && before[i + 1] === after[i + 1] && before[i + 2] === after[i + 2]) continue;
      changed++;
      const local = game.worldToArt(x + 0.5, y + 0.5) as { x: number; y: number };
      if (Math.hypot(local.x, local.y) > (game.level.radius as number) * 1.6) continue;
      if (!nearEdge(game, local.x, local.y, 4)) off++;
    }
  }
  assert.ok(changed > 100, `the ping really painted (${changed} px)`);
  assert.equal(off, 0, `every ping pixel sits on the blue line (${off} elsewhere)`);
  game.bossEdgePing = [];
  game.destroy();
});


/** Fire `shots` rounds of `id` at the boss, holding the trigger for autos. */
async function land(game: Record<string, any>, id: string, effect: string, shots = 4) {
  setGunEffect(id as never, effect as never);
  game.setWeapon(id);
  for (let i = 0; i < shots; i++) {
    game.rot = -Math.PI / 2 - (i * Math.PI) / 3;
    game.ammoLeft = 99;
    game.cooldown = 0;
    game.reloadT = 0;
    game.press();
    for (let f = 0; f < 30; f++) game.update(1 / 60);
    game.onRelease();
    for (let f = 0; f < 30; f++) game.update(1 / 60);
  }
}

test('rifles, beams and shotguns stick exactly like the pistol does', async () => {
  const cases: [string, string][] = [
    ['pistol', 'original'],
    ['ak47', 'set11'],
    ['minigun', 'original'],
    ['shotgun', 'original'],
    ['laser', 'set9'],
    ['freeze', 'set7'],
    ['railgun', 'set11'],
    ['nano_swarm', 'set11'],
    ['sniper', 'original'],
    ['mp5', 'set11'],
  ];
  for (const [id, effect] of cases) {
    const { game } = await bossStage('pirate', 5);
    await land(game, id, effect);
    const stuck = (game.items as any[]).filter((it) => it.type === 'bullet' && it.px !== undefined);
    assert.ok(stuck.length > 0, `${id}/${effect}: the round stuck on the boss at all`);
    // Every round is drawn by the shared renderer, at its exact pixel — no layer
    // is allowed to take the art and paint it on its own rim.
    assert.equal(stuck.filter((it) => it.hideArt).length, 0,
      `${id}/${effect}: the shared renderer draws the stuck round`);
    for (const it of stuck) {
      const off = solidOffset(game, it.px, it.py);
      assert.ok(Math.abs(off) <= 2.5,
        `${id}/${effect}: the round sits on the blue outline (${off.toFixed(2)} mask px)`);
    }
    game.destroy();
  }
});

test('no ported layer paints its own wheel rim on a boss', async () => {
  const { game } = await bossStage('pirate', 5);
  await land(game, 'ak47', 'set11');
  const calls: string[] = [];
  for (const key of ['s11State', 's9State', 's6State', 's1State'] as const) {
    const layer = game[key];
    if (!layer || typeof layer.drawWheel !== 'function') continue;
    const original = layer.drawWheel.bind(layer);
    layer.drawWheel = (...args: unknown[]) => { calls.push(key); original(...args); };
  }
  game.render();
  assert.deepEqual(calls, [], 'a boss has no wheel rim for a layer to mark');
  // And the shared impact burst is the one that fires, at the contact pixel.
  const src = read('src/games/gunhit/game/Game.ts');
  assert.match(src, /const ownHitFx = !layerFeel \|\| !!this\.level\.boss;/);
  assert.match(src, /hideArt: layerHit && !this\.level\.boss \? true : undefined,/);
  assert.match(src, /private withBossPaintClip\(c: CanvasRenderingContext2D, paint: \(\) => void\)/);
  game.destroy();
});

test('the collision boundary and the drawn line are the same path', () => {
  const src = read('src/games/gunhit/game/Game.ts');
  // One footprint, one outline, one hit test.
  assert.match(src, /solid\[i\] = alpha\[i\] > INK_ALPHA \|\| \(!open\[i\] && !touchesSky\(x, y\)\) \? 1 : 0;/);
  assert.match(src, /if \(!maskSolid\(mask, u, v\)\) return null;/);
  assert.match(src, /const surface = this\.maskSolidEdge \?\? this\.maskSurface;/);
  assert.match(src, /const surface = this\.maskSolidRegion \?\? this\.maskSurface;/);
  // A boss round is decided by the artwork and by nothing else: the branch
  // returns before any angular/item collision can run.
  assert.match(src, /if \(isBoss\) \{\n\s*const nose = shot7 \? shot7\.tip : 0;/);
  assert.match(src, /if \(isBoss\) return \{ res: 'none' \};/);
  // There is no radius-based stop left for a boss.
  assert.ok(!src.includes("if (isBoss && dist <= R"), 'no radius gate on a boss');
  assert.ok(!src.includes("boss ? R :"), 'no boss radius shortcut');
});
