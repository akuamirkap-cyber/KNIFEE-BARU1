import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createCanvas, Path2D } from '@napi-rs/canvas';
import { DOMParser as XmldomParser } from '@xmldom/xmldom';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { loadImage } from '@napi-rs/canvas';
import { HeadArt } from '../src/games/perfect-shot/play/HeadArt';
import { installSilentAudio } from '../tools/supportAudioSilent';
import { buildArtMask, buildArtMaskFromSvg, Game } from '../src/games/gunhit/game/Game';

const game = readFileSync('src/games/gunhit/game/Game.ts', 'utf8');

// The mask is built through a scratch canvas, exactly like the browser does.
const globals = globalThis as unknown as Record<string, unknown>;
globals.HTMLCanvasElement ??= createCanvas(2, 2).constructor;
globals.document ??= {
  createElement: (tag: string) => (tag === 'canvas' ? createCanvas(64, 64) : { style: {} }),
};

/** A "boss": a filled blob in the middle of an otherwise transparent square. */
function bossArt() {
  const cv = createCanvas(200, 200);
  const c = cv.getContext('2d');
  c.clearRect(0, 0, 200, 200);
  c.fillStyle = '#38bdf8';
  c.beginPath();
  c.arc(100, 100, 52, 0, Math.PI * 2);
  c.fill();
  // one horn sticking up-right, so the silhouette is not a circle
  c.beginPath();
  c.moveTo(120, 70);
  c.lineTo(190, 10);
  c.lineTo(150, 96);
  c.closePath();
  c.fill();
  return cv;
}

test('the boss mask is the artwork alpha, not a filled disc', () => {
  const mask = buildArtMask(bossArt(), 1, 240);
  assert.ok(mask, 'a mask is built from the drawn artwork');
  const at = (x: number, y: number) => mask!.alpha[y * mask!.size + x];
  // centre of the blob is ink
  assert.ok(at(120, 120) > 20, 'the body is solid');
  // a corner of the square is empty space: no collision there
  assert.equal(at(6, 6), 0, 'the corner stays empty');
  // the horn is ink where the circle would not be
  const hornX = Math.round((185 / 200) * 240);
  const hornY = Math.round((16 / 200) * 240);
  assert.ok(at(hornX, hornY) > 20, 'the horn counts as boss surface');
  assert.equal(buildArtMask(null), null);
  // A padded blit (what the renderer does for a boss) reports its own extent.
  const padded = buildArtMask(bossArt(), 1.3, 240);
  assert.ok(padded && padded.span === 1.3, 'the mask knows how far it spans');
  assert.ok(padded!.maxR > 1 && padded!.maxR <= 1.3 * Math.SQRT2, 'outermost ink stays inside the span');
});

test('every bullet tests the boss pixels before anything else', () => {
  // The mask and the contour are read back from `cv` — the very canvas the
  // renderer blits (`this.face`) — so they can never describe another shape,
  // whether the art came from Game B's raster or the vector fallback.
  assert.match(game, /this\.face = cv;/);
  assert.match(game, /const span = \(R \+ pad\) \/ R;/);
  assert.match(game, /let mask = this\.level\.boss \? buildArtMask\(art, span, 384\) : null;/);
  assert.match(game, /let readable = !!mask && mask\.maxR > 0\.05;/);
  assert.match(game, /this\.artMask = readable \? mask : null;/);
  assert.match(game, /this\.bossArtProfile = readable && mask \? maskProfile\(mask\) : null;/);
  // When the browser refuses to read a canvas that had an SVG drawn into it,
  // the same head is rasterised from its own markup instead — never a ring.
  assert.match(game, /const traced = buildArtMaskFromSvg\(this\.wheelSvg, span, 384\);/);
  assert.doesNotMatch(game, /buildArtMaskFromSvg\(this\.face/);
  // The mask can also be rebuilt on demand, from the markup the App keeps.
  assert.match(game, /const markup = this\.wheelSvg \?\? \(key \? this\.wheelArtSource\?\.markup\?\.\(key\) \?\? null : null\);/);
  assert.match(game, /this\.bossArtProfile = maskProfile\(traced\);/);
  // The mask is read from the pristine art, never from the face that bullet
  // holes are painted into all stage long.
  assert.doesNotMatch(game, /buildArtMask\(cv/);
  assert.match(game, /c\.drawImage\(art, -R - pad, -R - pad\);/);
  // The padded blit is mapped back through the mask's own span.
  assert.match(game, /const u = Math\.floor\(\(\(lx \/ R \/ mask\.span\) \+ 1\) \* 0\.5 \* mask\.size\);/);
  // StepProj asks the artwork and nothing else on a boss stage.
  assert.match(game, /if \(isBoss\) \{/);
  assert.match(game, /const hit = \(head \? this\.artHitAt\(head\.x, head\.y\) : null\) \?\? this\.artHitAt\(p\.x, p\.y\);/);
  assert.match(game, /local: Math\.atan2\(hit\.y, hit\.x\),/);
  assert.match(game, /px: hit\.x,/);
  assert.match(game, /py: hit\.y,/);
  // No circular fallback is left anywhere on a boss stage: there is no rim
  // test for a boss at all, and the old `bossRadiusAt(local) + 1` ring is gone.
  assert.doesNotMatch(game, /const rim = bType \? this\.bossRadiusAt\(local\) \+ 1 : R;/);
  assert.match(game, /if \(!isBoss && reach <= R\) return \{ res: 'stick', local \};/);
  // The broad phase reaches the furthest ink so horns stay hittable.
  assert.match(game, /const phaseR = this\.artMask \? this\.level\.radius \* this\.artMaskMaxR \* 1\.4 : effectiveR;/);
  // The surface test rotates into the target's own frame and reads alpha.
  assert.match(game, /const cos = Math\.cos\(-this\.rot\);/);
  assert.match(game, /if \(!maskSolid\(mask, u, v\)\) return null;/);
  // The idle float, breath AND the laugh / angry / rage pose are one matrix,
  // and the pixel test inverts exactly that matrix.
  assert.match(game, /const sway = Math\.sin\(t \* 0\.66 \+ 1\.0\) \* 0\.085;/);
  assert.match(game, /const breath = 1 \+ Math\.sin\(t \* 1\.35\) \* 0\.014;/);
  assert.match(game, /const inv = bossMatInvert\(this\.bossDecorMatrix\(\)\);/);
  assert.match(game, /const p = bossMatApply\(inv, lx, ly\);/);
});

test('a stuck round keeps the exact spot it bit into the artwork', () => {
  assert.match(game, /\/\*\* Exact radius \(px\) the round bit into the target artwork\. \*\/ r\?: number;/);
  assert.match(game, /r: surfaceR,/);
  // The impact point itself is stored, so the round is drawn where it bit even
  // when no radial profile can describe that spot.
  assert.match(game, /\/\*\* Exact impact point in the target's own frame \(art-local px\)\. \*\/ px\?: number; py\?: number;/);
  assert.match(game, /px: hitX,/);
  assert.match(game, /py: hitY,/);
  assert.match(game, /this\.stickAt\(r\.local \?\? norm\(Math\.PI \/ 2 - this\.rot\), p, r\.r, r\.px, r\.py\);/);
  assert.match(game, /const itemR = it\.px !== undefined && it\.py !== undefined\n\s*\? Math\.hypot\(it\.px, it\.py\)\n\s*: it\.r \?\? this\.bossRadiusAt\(it\.angle, R\);/);
  // Sparks, cracks and bursts use the impact point through the same transform
  // the artwork is drawn with — never `worldPos(local, R)`, which put every
  // effect on a circle of radius R beside the head.
  assert.match(game, /const impact = hitX !== undefined && hitY !== undefined\n\s*\? this\.artToWorld\(hitX, hitY\)\n\s*: this\.worldPos\(local, surfaceR \?\? R\);/);
  assert.doesNotMatch(game, /worldPos\(local, R\)/);
  assert.match(game, /private artToWorld\(lx: number, ly: number\)/);
});

test('a real boss stage wears Perfect Shot\'s head and collides with its pixels', async () => {
  const g = globalThis as unknown as Record<string, unknown> & { window: Record<string, unknown> };
  installSilentAudio();
  g.window = Object.assign(g.window ?? {}, {
    setTimeout, clearTimeout,
    setInterval: () => 0, clearInterval: () => undefined,
    addEventListener: () => undefined, removeEventListener: () => undefined,
    devicePixelRatio: 1, innerWidth: 420, innerHeight: 750,
  });
  // The target canvas itself only needs to swallow drawing calls: every
  // offscreen face/mask canvas goes through `document.createElement`, which is
  // a real raster (see the shim at the top of this file).
  const grad = { addColorStop: () => {} };
  const ctx = new Proxy({}, {
    get: (_t, prop) => {
      if (prop === 'createLinearGradient' || prop === 'createRadialGradient'
        || prop === 'createConicGradient' || prop === 'createPattern') return () => grad;
      if (prop === 'measureText') return () => ({ width: 24 });
      if (prop === 'getTransform') return () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 });
      if (prop === 'getImageData') return () => ({ data: new Uint8ClampedArray(4) });
      return () => {};
    },
    set: () => true,
  }) as unknown as CanvasRenderingContext2D;
  const canvas = {
    width: 420,
    height: 750,
    style: {},
    getBoundingClientRect: () => ({ width: 420, height: 750, left: 0, top: 0 }),
    getContext: () => ctx,
    addEventListener: () => {},
    removeEventListener: () => {},
  } as unknown as HTMLCanvasElement;

  const game = new Game(canvas, {}) as unknown as Record<string, any>;
  game.setWheelArtSource({ keyFor: () => 'boss|pirate', get: () => null, request: () => {} });
  game.startAtLevel(20); // the pirate boss
  assert.equal(game.level.boss, true, 'level 20 is a boss');
  assert.equal(game.level.style, 'pirate');
  // No raster has landed yet: the stage must NOT paint Game A's old flat boss.
  assert.equal(game.artMask, null, 'no mask before the artwork arrives');

  const svg = renderToStaticMarkup(React.createElement(HeadArt, { kind: 'pirate' as any }));
  const image = await loadImage(Buffer.from(svg));
  game.setWheelArt('boss|pirate', image as unknown as HTMLImageElement);

  assert.ok(game.face, 'the boss face canvas is built from Game B\'s head');
  assert.ok(game.artMask, 'the mask comes from the drawn face');
  assert.ok(game.artMask.size >= 120, 'the mask has real resolution');
  assert.ok(game.bossArtProfile && game.bossArtProfile.length === 360);
  assert.ok(game.artMaskMaxR > 0.3 && game.artMaskMaxR <= 1.35, 'outermost ink is measured');

  // The mask must agree with the canvas that is on screen. Sample in the
  // artwork's own frame and push each point through the boss' idle decoration,
  // exactly the way the renderer does, so only real disagreements fail.
  const R = game.level.radius as number;
  const face = game.face as { width: number; getContext: (k: string) => any };
  const fctx = face.getContext('2d');
  const S = face.width / ((R + 40) * 2);
  // The sway angle is exactly zero at this instant; the float and the breath
  // are known offsets/scales, so the art frame and the screen frame line up.
  const t = (Math.PI - 1) / 0.66;
  game.time = t;
  const ox = Math.sin(t * 0.53) * 3.2;
  const oy = Math.sin(t * 1.15) * 3.8;
  const breath = 1 + Math.sin(t * 1.35) * 0.014;
  const faceInk = (ax: number, ay: number) => {
    const px = Math.floor((ax + R + 40) * S);
    const py = Math.floor((ay + R + 40) * S);
    const d = fctx.getImageData(px - 2, py - 2, 5, 5).data;
    let ink = 0;
    for (let i = 3; i < d.length; i += 4) if (d[i] > 20) ink++;
    return ink === 25 ? true : ink === 0 ? false : null;
  };
  const CX = 210;
  const at = (ax: number, ay: number) =>
    game.artSurfaceAt(CX + ax * breath + ox, game.targetY + ay * breath + oy);
  let agree = 0;
  let solidSamples = 0;
  for (const deg of [0, 30, 45, 60, 90, 120, 135, 150, 180, 210, 225, 240, 270, 300, 315, 330]) {
    for (const k of [0.2, 0.35, 0.5, 0.65, 0.8, 0.9, 0.98, 1.05, 1.12]) {
      const a = (deg * Math.PI) / 180;
      const ax = Math.cos(a) * R * k;
      const ay = Math.sin(a) * R * k;
      const expected = faceInk(ax, ay);
      if (expected === null) continue; // a borderline pixel: skip it
      assert.equal(at(ax, ay) !== null, expected, `mask matches the drawn face at ${deg}deg / ${k}R`);
      agree++;
      if (expected) solidSamples++;
    }
  }
  assert.ok(agree > 60, `enough unambiguous points compared (${agree})`);
  assert.ok(solidSamples > 15, `the boss really is solid in places (${solidSamples})`);
  // Every weapon used to bite the old 0.889R ring here — empty space beside the
  // pirate's cheek. The silhouette test must refuse that.
  assert.equal(at(-R * 0.889, 0), null, 'no bullet meets the boss where the drawing is empty');
});


test('the traced mask is the same head the browser draws, for all eleven bosses', async () => {
  globals.Path2D ??= Path2D;
  globals.DOMParser ??= XmldomParser;
  const R = 40;
  const pad = 40;
  const span = (R + pad) / R;
  for (const kind of ['pirate', 'jester', 'dragon', 'skeleton', 'tiki', 'viking', 'oni', 'robot', 'alien', 'vampire', 'sun']) {
    const svg = renderToStaticMarkup(React.createElement(HeadArt, { kind: kind as any }));
    const image = await loadImage(Buffer.from(svg));
    // The padded art canvas the game builds for a boss.
    const art = createCanvas((R + pad) * 2, (R + pad) * 2);
    const ac = art.getContext('2d');
    ac.translate(R + pad, R + pad);
    ac.drawImage(image, -R, -R, R * 2, R * 2);
    const drawn = buildArtMask(art, span, 384);
    const traced = buildArtMaskFromSvg(svg, span, 384);
    assert.ok(drawn && traced, `${kind}: both masks exist`);
    assert.ok(Math.abs((drawn!.maxR) - (traced!.maxR)) < 0.05,
      `${kind}: same outer ink (${drawn!.maxR.toFixed(3)} vs ${traced!.maxR.toFixed(3)})`);
    let diff = 0;
    for (let i = 0; i < drawn!.alpha.length; i++) {
      if ((drawn!.alpha[i] > 20) !== (traced!.alpha[i] > 20)) diff++;
    }
    const pct = (100 * diff) / drawn!.alpha.length;
    assert.ok(pct < 3.5, `${kind}: traced silhouette matches the drawn one (${pct.toFixed(2)}% apart)`);
    // A transparent corner is never boss, and the mask is never a disc.
    assert.equal(traced!.alpha[0], 0, `${kind}: (0,0) is empty`);
    assert.ok(traced!.alpha[traced!.alpha.length - 1] === 0, `${kind}: last pixel is empty`);
  }
});

test('a browser that cannot read the SVG image back still collides with the head', async () => {
  const g = globalThis as unknown as Record<string, unknown> & { window: Record<string, unknown> };
  installSilentAudio();
  g.window = Object.assign(g.window ?? {}, {
    setTimeout, clearTimeout,
    setInterval: () => 0, clearInterval: () => undefined,
    addEventListener: () => undefined, removeEventListener: () => undefined,
    devicePixelRatio: 1, innerWidth: 420, innerHeight: 750,
  });
  // The paths have to exist in this runtime for the traced fallback to run.
  globals.Path2D ??= Path2D;
  globals.DOMParser ??= XmldomParser;
  const grad = { addColorStop: () => {} };
  const ctx = new Proxy({}, {
    get: (_t, prop) => {
      if (prop === 'createLinearGradient' || prop === 'createRadialGradient'
        || prop === 'createConicGradient' || prop === 'createPattern') return () => grad;
      if (prop === 'measureText') return () => ({ width: 24 });
      if (prop === 'getTransform') return () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 });
      if (prop === 'getImageData') return () => ({ data: new Uint8ClampedArray(4) });
      return () => {};
    },
    set: () => true,
  }) as unknown as CanvasRenderingContext2D;
  const canvas = {
    width: 420,
    height: 750,
    style: {},
    getBoundingClientRect: () => ({ width: 420, height: 750, left: 0, top: 0 }),
    getContext: () => ctx,
    addEventListener: () => {},
    removeEventListener: () => {},
  } as unknown as HTMLCanvasElement;

  const g2 = new Game(canvas, {}) as unknown as Record<string, any>;
  g2.setWheelArtSource({ keyFor: () => 'boss|pirate', get: () => null, request: () => {} });
  g2.startAtLevel(20);
  const svg = renderToStaticMarkup(React.createElement(HeadArt, { kind: 'pirate' as any }));
  // An unreadable raster: alpha all zero, exactly what a tainted SVG canvas
  // hands back in the WebViews that started this. The markup is the real head.
  const blank = createCanvas((g2.level.radius + 40) * 2, (g2.level.radius + 40) * 2);
  g2.setWheelArt('boss|pirate', blank as unknown as HTMLImageElement, svg);

  assert.ok(g2.artMask, 'the traced head is the mask: no raster readback needed');
  assert.ok(g2.artMask.maxR > 0.5 && g2.artMask.maxR <= 1.35, `traced outline measured (${g2.artMask.maxR})`);
  assert.ok(g2.bossArtProfile && g2.bossArtProfile.length === 360);

  const R = g2.level.radius as number;
  const t = (Math.PI - 1) / 0.66;
  g2.time = t;
  const ox = Math.sin(t * 0.53) * 3.2;
  const oy = Math.sin(t * 1.15) * 3.8;
  const breath = 1 + Math.sin(t * 1.35) * 0.014;
  const CX = 210;
  const at = (ax: number, ay: number) =>
    g2.artSurfaceAt(CX + ax * breath + ox, g2.targetY + ay * breath + oy);
  assert.ok(at(0, 0) !== null, 'a round in the middle of the head meets the head');
  assert.equal(at(-R * 1.3, 0), null, 'the corner of the square is not the boss');
  assert.equal(at(-R * 0.889, 0), null, 'the old ring radius beside the cheek stays empty');
});
