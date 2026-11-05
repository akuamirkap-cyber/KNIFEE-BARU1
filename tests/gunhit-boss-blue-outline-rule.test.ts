import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { createCanvas, Path2D, loadImage } from '@napi-rs/canvas';
import { DOMParser as XmldomParser } from '@xmldom/xmldom';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { HeadArt, HEAD_INFO, HEAD_KINDS } from '../src/games/perfect-shot/play/HeadArt';
import { levelConfig } from '../src/games/perfect-shot/play/levels';
import { installSilentAudio } from '../tools/supportAudioSilent';
import { setGunEffect, setGunVariant } from '../src/games/gunhit/game/art/gunVariants';

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

const { Game, buildSolidFootprint } = await import('../src/games/gunhit/game/Game.ts');
const { maskOf, solidAt, solidOffset, outlineRadii, outlineRadiusPx } = await import('./supportBossOutline.ts');
const { BOSS_CATALOG } = await import('../src/games/gunhit/game/bossCatalog.ts');
const { bossHeadFor } = await import('../src/games/gunhit/game/bossIdentity.ts');

const W = 420;
const H = 750;

/** A real Game A boss stage: stage `level` wearing Game B's own head. */
async function bossStage(level: number) {
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
  const game = new Game(canvas, { onGameOver: () => {}, onStageChange: () => {} } as never) as unknown as Record<string, any>;
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
  return { game, kind, cv, ctx };
}

/**
 * A point inside the blue outline where the head is see-through: the jester's
 * hat and the vampire's collar have them. These are the pixels a round used to
 * sail through — straight through the middle of the boss — because the old test
 * only accepted ink.
 */
function findSeeThroughWindow(game: Record<string, any>) {
  const mask = maskOf(game);
  const R = game.level.radius as number;
  const half = mask.size / 2;
  for (let y = 2; y < mask.size - 2; y += 2) {
    for (let x = 2; x < mask.size - 2; x += 2) {
      const i = y * mask.size + x;
      // Transparent, yet inside the boss: a hole in the drawing the ink encloses.
      if (mask.alpha[i] > 8 || !solidAt(mask, x, y)) continue;
      let inkNear = false;
      for (let oy = -2; oy <= 2 && !inkNear; oy++) {
        for (let ox = -2; ox <= 2; ox++) {
          if (mask.alpha[(y + oy) * mask.size + (x + ox)] > 20) { inkNear = true; break; }
        }
      }
      if (!inkNear) continue;
      const lx = ((x + 0.5) / half - 1) * R * mask.span;
      const ly = ((y + 0.5) / half - 1) * R * mask.span;
      return { lx, ly };
    }
  }
  return null;
}

test('every boss of Game A is one of Game B\'s eleven bosses', () => {
  assert.equal(BOSS_CATALOG.length, 11);
  assert.deepEqual(BOSS_CATALOG.map((boss) => boss.head), HEAD_KINDS);
  for (let stage = 5; stage <= 100; stage += 5) {
    const head = bossHeadFor(stage);
    assert.ok(head, `stage ${stage} has a Game B head`);
    const boss = BOSS_CATALOG.find((entry) => entry.head === head)!;
    assert.equal(boss.name, HEAD_INFO[head].name.toUpperCase());
    assert.ok(boss.projectileName.length > 0, `${head} has its own attack`);
    assert.ok(boss.fireInterval > 0);
  }
  // And nothing else is a boss any more.
  for (let stage = 1; stage <= 100; stage++) {
    if (stage % 5 === 0) continue;
    assert.equal(bossHeadFor(stage), null, `stage ${stage} is not a boss`);
  }
  for (const file of [
    'src/games/gunhit/game/bossRoster.ts',
    'src/games/gunhit/game/bossRenderer.ts',
    'src/games/gunhit/game/bossAssetPixels.ts',
    'src/games/gunhit/game/bossAssetProcessor.ts',
    'src/games/gunhit/game/bossAssetWorker.ts',
  ]) {
    assert.throws(() => read(file), `${file} is deleted`);
  }
  const game = read('src/games/gunhit/game/Game.ts');
  assert.ok(!game.includes('BOSS_NAMES'), 'no Game A boss name table');
  assert.ok(!game.includes('getBossDef'), 'no Game A boss roster lookup');
  assert.ok(!game.includes('/bosses/'), 'no Game A boss images');
});

test('a round flies through anything that is not the blue outline', async () => {
  for (let level = 5; level <= 55; level += 5) {
    const { game, kind } = await bossStage(level);
    const mask = maskOf(game);
    const radii = outlineRadii(mask);
    // Every 15° of the outline, a point 10 px outside the line must be air.
    let probed = 0;
    for (let deg = 0; deg < 360; deg += 15) {
      const a = (deg * Math.PI) / 180;
      const outside = outlineRadiusPx(game, radii, a) + 10;
      const lx = Math.cos(a) * outside;
      const ly = Math.sin(a) * outside;
      const world = game.artToWorld(lx, ly);
      assert.equal(game.artSurfaceAt(world.x, world.y), null,
        `${kind} ${deg}deg: space outside the outline is not the boss`);
      const res = game.stepProj({ x: world.x, y: world.y, vx: 0, vy: -520 }, 1);
      assert.equal(res.res, 'none', `${kind} ${deg}deg: a round outside the outline is not consumed`);
      probed++;
    }
    assert.equal(probed, 24);
    game.destroy();
  }
});

test('a see-through window enclosed by the drawing is still the boss', async () => {
  // A ring of ink with empty air inside: the drawing encloses that air, so the
  // blue line runs around the outside of the ring and the middle is boss.
  const { game, kind } = await bossStage(5);
  const R = game.level.radius as number;
  const size = 384;
  const half = size / 2;
  const span = (R + 40) / R;
  const alpha = new Uint8Array(size * size);
  const rr = (0.8 * half) / span;
  const hole = (0.35 * half) / span;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const d = Math.hypot(x + 0.5 - half, y + 0.5 - half);
      if (d < rr && d > hole) alpha[y * size + x] = 255;
    }
  }
  const solid = buildSolidFootprint(size, alpha);
  game.artMask = { size, alpha, span, maxR: (rr / half) * span, solid };
  game.artMaskMaxR = (rr / half) * span;
  game.maskSolidRegion = null;
  game.maskSolidEdge = null;
  game.maskSurface = null;
  game.maskOutline = null;

  const centre = game.artToWorld(0, 0);
  assert.ok(game.artHitAt(centre.x, centre.y), `${kind}: the enclosed air is inside the boss`);
  const inner = (hole / half) * R * span + 2;
  const inside = game.artToWorld(inner, 0);
  assert.ok(game.artHitAt(inside.x, inside.y), 'air just inside the ring is the boss');
  const outside = game.artToWorld((rr / half) * R * span + 6, 0);
  assert.equal(game.artHitAt(outside.x, outside.y), null, 'air outside the ring is not');
  // A round crossing the middle stops on the ring instead of passing through it.
  const res = game.stepProj({ x: centre.x, y: centre.y, vx: 0, vy: -520 }, 1);
  assert.equal(res.res, 'stick', 'the round stops on the boss it entered');
  game.destroy();
});

test('every real boss round stops on the blue line the player sees', async () => {
  for (let level = 5; level <= 55; level += 5) {
    const { game, kind } = await bossStage(level);
    let hits = 0;
    let worst = 0;
    let total = 0;
    const loose: string[] = [];
    for (let deg = 0; deg < 360; deg += 15) {
      game.rot = -Math.PI / 2 - (deg * Math.PI) / 180;
      game.items = [];
      game.projs = [];
      game.ammoLeft = 99;
      game.cooldown = 0;
      game.reloadT = 0;
      game.aiming = false;
      game.charging = false;
      game.press();
      game.onRelease();
      let bullet: any = null;
      for (let f = 0; f < 60 && game.projs.length; f++) {
        game.update(1 / 60);
        bullet = (game.items as any[]).find((it) => it.type === 'bullet' && it.px !== undefined) ?? null;
        if (bullet) break;
      }
      if (!bullet) continue;
      hits++;
      const off = Math.abs(solidOffset(game, bullet.px, bullet.py));
      // A stop is measured in mask pixels. The head keeps turning while the
      // round flies, so one approach in the whole sweep can land a single frame
      // late — a notch of the drawing's ink, worth one spin step (~5,7 px at
      // most). Everything else must sit on the line.
      if (off > 2.5) loose.push(`${deg}deg ${off.toFixed(2)}`);
      total += off;
      worst = Math.max(worst, off);
    }
    assert.ok(hits >= 12, `${kind}: enough rounds reached it (${hits})`);
    assert.ok(loose.length <= 1, `${kind}: only one spin-step notch may drift (${loose.join(', ')})`);
    assert.ok(worst <= 6, `${kind}: every stop is on the line (worst ${worst.toFixed(2)} px)`);
    assert.ok(total / Math.max(1, hits) <= 1.5, `${kind}: stops sit on the line on average (${(total / Math.max(1, hits)).toFixed(2)} px)`);
    game.destroy();
  }
});

test('a boss fight shows no hitbox marker at all — the artwork is the target', () => {
  const game = read('src/games/gunhit/game/Game.ts');
  // Play path: no debug overlay, no legend, no fill, no old circle, and the blue
  // contour is gone from the boss display too (player request). Only `?hitbox=1`
  // may paint geometry.
  assert.doesNotMatch(game, /drawHitboxLegend/);
  assert.ok(!game.includes('HITBOX = BENTUK GAMBAR'));
  assert.match(game, /if \(this\.hitboxFlag\) this\.drawHitboxDebug\(c\);\n\s*c\.restore\(\);/,
    'di play tidak ada garis biru: hanya overlay debug ?hitbox=1');
  assert.ok(!/else this\.drawBossSilhouette\(c\);/.test(game), 'garis biru tidak dipanggil dari render');
  // The line still exists for inspection, and hit testing still reads it.
  assert.ok(game.includes('private drawBossSilhouette('));
  assert.match(game, /c\.strokeStyle = 'rgba\(56,189,248,0\.95\)';/);
  // `?hitbox=1` is the only way into the inspection overlay.
  assert.match(game, /handle\.location|location\.search|typeof location/);
  // The region a round stops in and the line that is stroked are the same bytes:
  // one solid footprint, one marching-squares boundary of it.
  assert.match(game, /export function buildSolidFootprint\(size: number, alpha: Uint8Array\): Uint8Array/);
  assert.match(game, /export function buildSolidOutline\(mask: ArtMask\): Path2D \| null/);
  assert.match(game, /solid: buildSolidFootprint\(size, alpha\)/);
  assert.match(game, /return solid\[y \* size \+ x\] === 1;/);
  assert.match(game, /const surface = this\.maskSolidEdge \?\? this\.maskSurface;/);
  // No ray-marched star hull is drawn or tested against any more.
  assert.ok(!game.includes('buildOutlineEdges'));
  assert.ok(!game.includes('outlineRadiusPx'));
  assert.ok(!game.includes('maxEdgePx'));
});

test('the eleven bosses keep their own attack identity in play', async () => {
  const names = new Set<string>();
  for (const boss of BOSS_CATALOG) {
    names.add(boss.projectileName);
    assert.ok(boss.glow.startsWith('rgba('), `${boss.head} has a glow`);
    assert.ok(boss.rgb.split(',').length === 3, `${boss.head} has an rgb palette`);
  }
  assert.equal(names.size, 11, 'eleven bosses, eleven attacks');
  const { game } = await bossStage(5);
  game.bossShootTimer = 0;
  game.update(1 / 60);
  const shot = (game.bossProjs as any[])[0];
  assert.ok(shot, 'the pirate fires');
  assert.equal(shot.head, 'pirate');
  assert.equal(shot.type, 'pirate');
  game.bossShootTimer = 0;
  game.bossProjs = [];
  game.destroy();

  // A different head fires a different attack, from its own catalog record.
  setGunVariant('pistol', 'original');
  setGunEffect('pistol', 'original');
  const other = await bossStage(15); // dragon
  other.game.bossShootTimer = 0;
  other.game.update(1 / 60);
  const dragonShot = (other.game.bossProjs as any[])[0];
  assert.ok(dragonShot, 'the dragon fires');
  assert.equal(dragonShot.head, 'dragon');
  assert.equal(dragonShot.type, 'oni');
  other.game.destroy();
});
