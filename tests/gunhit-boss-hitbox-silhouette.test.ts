import test from 'node:test';
import assert from 'node:assert/strict';
import { createCanvas, Path2D, loadImage } from '@napi-rs/canvas';
import { DOMParser as XmldomParser } from '@xmldom/xmldom';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { HeadArt } from '../src/games/perfect-shot/play/HeadArt';
import { levelConfig } from '../src/games/perfect-shot/play/levels';
import { installSilentAudio } from '../tools/supportAudioSilent';
import { setGunEffect, setGunVariant } from '../src/games/gunhit/game/art/gunVariants';
import { INK_ALPHA } from '../src/games/gunhit/game/Game';

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
  set src(_src: string) { /* boss art is supplied directly in this suite */ }
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
const W = 420;
const H = 750;

/** A boss stage of Game A wearing Perfect Shot's real head. */
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
  game.bossMaxHp = 1e9;
  game.bossHp = 1e9;
  game.level.ammo = 1e5;
  return { game, kind, svg, image, cv };
}

/** Fire one real round so that it meets the head at `theta` in its own frame. */
function shootAtLocal(game: Record<string, any>, theta: number) {
  game.rot = -Math.PI / 2 - theta;
  game.items = [];
  game.projs = [];
  game.ammoLeft = 99;
  game.cooldown = 0;
  game.reloadT = 0;
  game.aiming = false;
  game.charging = false;
  game.press();
  game.onRelease();
  for (let i = 0; i < 60 && game.projs.length; i++) game.update(1 / 60);
  return (game.items as any[]).find((it) => it.type === 'bullet') ?? null;
}

/** Direct alpha lookup in the artwork's own frame — no decor, no radius. */
function maskInk(game: Record<string, any>, lx: number, ly: number) {
  const mask = game.artMask;
  assert.ok(mask, 'the stage has an artwork mask');
  const R = game.level.radius as number;
  const u = Math.floor(((lx / R / mask.span) + 1) * 0.5 * mask.size);
  const v = Math.floor(((ly / R / mask.span) + 1) * 0.5 * mask.size);
  if (u < 0 || v < 0 || u >= mask.size || v >= mask.size) return false;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const px = u + dx;
      const py = v + dy;
      if (px >= 0 && py >= 0 && px < mask.size && py < mask.size && mask.alpha[py * mask.size + px] > 20) return true;
    }
  }
  return false;
}

test('the boss hitbox is the drawing: twelve angles, twelve different depths', async () => {
  for (const level of [5, 30, 20, 25]) {
    const { game, kind } = await bossStage(level);
    const radii: number[] = [];
    for (let deg = 0; deg < 360; deg += 30) {
      const it = shootAtLocal(game, (deg * Math.PI) / 180);
      if (!it) continue;
      // the round is placed at the point it bit, and that point is the artwork
      assert.ok(maskInk(game, it.px, it.py), `${kind} ${deg}deg: the round sits on ink`);
      assert.ok(Math.abs(Math.hypot(it.px, it.py) - it.r) < 0.01,
        `${kind} ${deg}deg: the stored radius is the stored point`);
      radii.push(it.r);
    }
    assert.ok(radii.length >= 9, `${kind}: enough real impacts measured (${radii.length})`);
    const min = Math.min(...radii);
    const max = Math.max(...radii);
    // A circle would give one number here. The silhouette gives a spread.
    assert.ok(max - min > 18, `${kind}: the hit surface follows the drawing, not a circle (${Math.round(min)}..${Math.round(max)} px)`);
    game.destroy();
  }
});

test('a stuck round keeps its spot on the artwork while the boss turns', async () => {
  const { game, kind } = await bossStage(5);
  let it: any = null;
  for (const deg of [270, 250, 300, 90, 90, 210]) {
    it = shootAtLocal(game, (deg * Math.PI) / 180);
    if (it) break;
  }
  assert.ok(it, 'a round bit into the head');
  const artPoint = { x: it.px, y: it.py };
  const worlds: string[] = [];
  for (const turn of [0, 0.4, 1.2, -0.9, 2.4]) {
    game.rot = turn;
    const w = game.artToWorld(it.px, it.py);
    worlds.push(`${w.x.toFixed(0)},${w.y.toFixed(0)}`);
    // the drawn world point is the artwork's own point, whatever the angle
    assert.ok(game.artSurfaceAt(w.x, w.y) !== null, `${kind}: ink under the round at turn ${turn}`);
  }
  assert.equal(new Set(worlds).size, worlds.length, 'the round travels with the head, and only with the head');
  assert.deepEqual({ x: it.px, y: it.py }, artPoint, 'its artwork-local spot never changes');
  game.destroy();
});

test('a boss never lands a round on a radius, not even with no artwork at all', async () => {
  const { game } = await bossStage(5);
  // Strip the artwork: no mask, no markup, nothing to read.
  game.artMask = null;
  game.wheelSvg = null;
  game.maskOutline = null;
  game.wheelImage = null;
  game.setWheelArtSource({ keyFor: () => 'boss|none', get: () => null, request: () => {} });
  game.items = [];
  game.projs = [];
  game.ammoLeft = 99;
  game.cooldown = 0;
  game.reloadT = 0;
  game.rot = 0;
  game.press();
  game.onRelease();
  for (let i = 0; i < 90 && game.projs.length; i++) game.update(1 / 60);
  assert.equal((game.items as any[]).filter((it) => it.type === 'bullet').length, 0,
    'no ink means no hit: the old ring is gone');
  game.destroy();
});

test('the head scaled up by its laugh / angry / rage pose is still hittable', async () => {
  const { game } = await bossStage(5);
  const R = game.level.radius as number;
  const outer = R * game.artMask.maxR;
  // A point on the outermost ink, in the artwork's own frame, pushed out by the
  // reaction's own scale — exactly where the old world-space bound cut in.
  let probe: { x: number; y: number; r: number } | null = null;
  for (let deg = 0; deg < 360 && !probe; deg += 5) {
    const a = (deg * Math.PI) / 180;
    // Walk inwards until the *strict* ink test is happy: the hit test uses one
    // exact threshold, so the outermost anti-aliased pixel is not the edge.
    for (let r = outer; r > outer - 6; r -= 0.5) {
      const lx = Math.cos(a) * r;
      const ly = Math.sin(a) * r;
      if (game.artHitAt(game.artToWorld(lx, ly).x, game.artToWorld(lx, ly).y)) {
        probe = { x: lx, y: ly, r };
        break;
      }
    }
  }
  assert.ok(probe, 'the artwork has an outer edge');
  game.setBossMood('angry', 3);
  game.bossMoodAge = 0.1;
  const w = game.artToWorld(probe!.x, probe!.y);
  assert.ok(Math.hypot(w.x - W / 2, w.y - game.targetY) > outer,
    'the pose really does push this ink outside the wheel radius');
  assert.ok(game.artSurfaceAt(w.x, w.y) !== null, 'and it is still the boss');
  game.destroy();
});

/**
 * Every weapon layer (slide 2 bullets, slide 6 sight, slide 7 rain, slide 9
 * marks, slide 11 embeds) asks the host where the target's surface is. On a
 * boss that answer has to be the artwork, and its depth has to vary with the
 * angle — a radius would give one number.
 */
test('the wheel hook every layer asks answers with the artwork, not a radius', async () => {
  const { game, kind } = await bossStage(5);
  const hook = game.wheelHookRot(0);
  assert.equal(typeof hook.ink, 'function', `${kind}: layers get an artwork test`);
  const radii: number[] = [];
  for (let deg = 0; deg < 360; deg += 10) {
    const a = (deg * Math.PI) / 180;
    radii.push(hook.radiusAt(a));
    const p = hook.surfacePoint(a);
    assert.ok(game.artSurfaceAt(p.x, p.y) !== null,
      `${kind}: the surface point at ${deg}deg is on the drawing`);
  }
  const spread = Math.max(...radii) - Math.min(...radii);
  assert.ok(spread > 18, `${kind}: the hook's depth follows the silhouette (${spread.toFixed(0)} px spread)`);
  assert.equal(hook.ink(hook.surfacePoint(Math.PI).x, hook.surfacePoint(Math.PI).y), true,
    `${kind}: the hook's own surface answers as ink`);
  game.destroy();
});

/** Weapon slides that draw their own FX must land on the artwork too. */
test('every weapon slide bites the artwork, never the old circle', async () => {
  const cases: [string, string][] = [
    ['pistol', 'original'],
    ['sniper', 'original'],
    ['plasma', 'original'],
    ['pistol', 'set11'],
    ['pistol', 'set7'],
    ['pistol', 'set9'],
    ['shotgun', 'original'],
    ['crossbow', 'set7'],
  ];
  for (const [id, effect] of cases) {
    setGunVariant(id as never, 'original');
    setGunEffect(id as never, effect as never);
    const { game } = await bossStage(5);
    game.setWeapon(id);
    game.items = [];
    game.projs = [];
    const impacts: { x: number; y: number }[] = [];
    for (const turn of [0, 0.8, 1.6, 2.5]) {
      game.rot = turn;
      const before = new Set(game.items as any[]);
      for (let f = 0; f < 90; f++) {
        game.ammoLeft = 99;
        if (f % 10 === 0) game.press();
        if (f % 10 === 7) game.onRelease();
        game.update(1 / 60);
        if ((game.items as any[]).some((it) => !before.has(it) && it.px !== undefined)) break;
      }
      game.onRelease();
      const fresh = (game.items as any[]).find((it: any) => !before.has(it) && it.px !== undefined);
      if (fresh) impacts.push({ x: fresh.px, y: fresh.py });
    }
    assert.ok(impacts.length >= 2, `${id}/${effect}: rounds bit into the head (${impacts.length})`);
    for (const p of impacts) {
      assert.ok(maskInk(game, p.x, p.y), `${id}/${effect}: the round sits on ink`);
    }
    const depths = impacts.map((p) => Math.hypot(p.x, p.y));
    assert.ok(depths.some((d) => Math.abs(d - game.level.radius) > 6),
      `${id}/${effect}: at least one bite is off the old radius (${depths.map((d) => d.toFixed(0)).join(',')})`);
    game.destroy();
  }
});

/**
 * The Grow Ray enlarges the head mid-stage. Artwork-local spots must ride out
 * with the drawing: a round stuck before the growth may not drift off it.
 */
test('a round stays on the drawing while the head grows under it', async () => {
  const { game, kind } = await bossStage(5);
  game.setWeapon('grow');
  let it: any = null;
  for (const deg of [270, 250, 300, 90, 210]) {
    it = shootAtLocal(game, (deg * Math.PI) / 180);
    if (it) break;
  }
  assert.ok(it, `${kind}: a grow round bit into the head`);
  assert.ok(maskInk(game, it.px, it.py), `${kind}: it bit the drawing`);
  const R0 = game.level.radius as number;
  // grow the target the way the weapon does, then let the radius ease in
  game.targetR = R0 + 24;
  for (let i = 0; i < 90; i++) game.update(1 / 60);
  assert.ok((game.level.radius as number) > R0 + 12, `${kind}: the head really grew`);
  assert.ok(maskInk(game, it.px, it.py), `${kind}: the round is still on the drawing after the growth`);
  game.destroy();
});

/**
 * The rule the stage actually plays by: a round stops on the drawn edge and on
 * nothing else. The overlay's blue line is traced with the same threshold as the
 * hit test, so "3 px outside the line" has to be empty space.
 */
test('the hitbox is the drawn edge: outside it is empty space', async () => {
  for (const level of [5, 20]) {
    const { game, kind } = await bossStage(level);
    let checked = 0;
    for (let deg = 0; deg < 360; deg += 12) {
      const a = (deg * Math.PI) / 180;
      const surface = game.artSurfaceLocal(a);
      if (!surface) continue;
      const at = (r: number) => {
        const w = game.artToWorld(Math.cos(a) * r, Math.sin(a) * r);
        return game.artSurfaceAt(w.x, w.y);
      };
      assert.notEqual(at(surface.r), null, `${kind} ${deg}deg: the line itself is the boss`);
      assert.equal(at(surface.r + 3), null, `${kind} ${deg}deg: 3 px outside the line is empty space`);
      assert.equal(at(surface.r + 8), null, `${kind} ${deg}deg: 8 px outside the line is empty space`);
      checked++;
    }
    assert.ok(checked > 25, `${kind}: the whole outline was checked (${checked})`);
    game.destroy();
  }
});

/**
 * The round has to stop on the pixel it *met*, not a stride deeper. The game
 * walks its substep (<= 7 px) from the outside in at 1 px, so the pixel a round
 * reports must be an *outline* pixel: strict ink with empty space right beside
 * it. A round left a stride inside the body is ink on every side for 7-8 mask
 * pixels — this measures that distance, no tolerance picking.
 */
function edgeDistance(game: Record<string, any>, lx: number, ly: number) {
  const mask = game.ensureArtMask();
  assert.ok(mask, 'the stage has an artwork mask');
  const R = game.level.radius as number;
  const u = Math.floor(((lx / R / mask.span) + 1) * 0.5 * mask.size);
  const v = Math.floor(((ly / R / mask.span) + 1) * 0.5 * mask.size);
  const ink = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= mask.size || y >= mask.size) return false;
    return mask.alpha[y * mask.size + x] > INK_ALPHA;
  };
  if (!ink(u, v)) return -1;
  for (let d = 1; d <= 12; d++) {
    for (let dy = -d; dy <= d; dy++) {
      for (let dx = -d; dx <= d; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== d) continue;
        if (!ink(u + dx, v + dy)) return d;
      }
    }
  }
  return 99;
}

/**
 * Fire one round and measure the very frame it sticks: the head keeps swaying,
 * breathing and laughing afterwards, so the drawing moves under a stuck round —
 * the impact has to be judged against the art as it was when the round met it.
 */
function shootAndMeasure(game: Record<string, any>, theta: number) {
  game.rot = -Math.PI / 2 - theta;
  game.items = [];
  game.projs = [];
  game.ammoLeft = 99;
  game.cooldown = 0;
  game.reloadT = 0;
  game.aiming = false;
  game.charging = false;
  game.press();
  game.onRelease();
  for (let i = 0; i < 60 && game.projs.length; i++) {
    game.update(1 / 60);
    const it = (game.items as any[]).find((x) => x.type === 'bullet');
    if (it) return { it, edge: edgeDistance(game, it.px, it.py) };
  }
  return null;
}

test('a fast round stops on the first pixel of the drawing it meets', async () => {
  for (const weapon of ['sniper', 'pistol']) {
    const { game, kind } = await bossStage(5);
    game.setWeapon(weapon);
    let hits = 0;
    let worst = 0;
    for (let deg = 0; deg < 360; deg += 6) {
      const shot = shootAndMeasure(game, (Math.PI * deg) / 180);
      if (!shot) continue;
      hits++;
      const { it, edge } = shot;
      assert.ok(edge > 0 && edge <= 2,
        `${kind}/${weapon} ${deg}deg: the round sits on the outline (${edge < 0 ? 'not on the drawing' : `${edge} px from empty space`})`);
      if (edge > 1) worst = Math.max(worst, edge);
      const world = game.artToWorld(it.px, it.py);
      assert.ok(game.artHitAt(world.x, world.y),
        `${kind}/${weapon} ${deg}deg: the stuck round is on the boss`);
    }
    assert.ok(hits >= 15, `${kind}/${weapon}: the fast rounds reached the head (${hits})`);
    game.destroy();
  }
});


test('all eleven Game B heads stop a beam only at actual artwork pixels', async () => {
  const { traceBossSegment } = await import('../src/games/gunhit/game/bossRaycast');
  for (let level = 5; level <= 55; level += 5) {
    const { game, kind } = await bossStage(level);
    for (const x of [130, 170, 210, 250, 290]) {
      const ink = (px: number, py: number) => game.artHitAt(px, py) !== null;
      const hit = traceBossSegment(x, 650, x, -80, ink);
      if (hit) {
        assert.ok(ink(hit.x, hit.y), `${kind}: beam ends on its drawing`);
        assert.equal(ink(hit.x, hit.y + 2), false, `${kind}: space before the first hit stays open`);
      }
    }
    game.destroy();
  }
});

test('boss attacks do not consume a player shot outside the outline', async () => {
  const { game } = await bossStage(5);
  game.star = null;
  game.bossShootTimer = 100;
  game.projs = [{ x: 50, y: 500, vx: 0, vy: -1 }];
  game.bossProjs = [{ x: 50, y: 500, vx: 0, vy: 0, rot: 0, type: 'pirate' }];
  game.update(1 / 60);
  assert.equal(game.projs.length, 1);
  assert.equal(game.bossProjs.length, 1);
  game.destroy();
});
