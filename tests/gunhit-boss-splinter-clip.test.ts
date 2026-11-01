import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createCanvas } from '@napi-rs/canvas';
import { setSplinterClip, withSplinterClip } from '../src/games/gunhit/game/fx';

const game = readFileSync('src/games/gunhit/game/Game.ts', 'utf8');
const nine = readFileSync('src/games/gunhit/game/setNineFx.ts', 'utf8');
const eleven = readFileSync('src/games/gunhit/game/setElevenFx.ts', 'utf8');
const two = readFileSync('src/games/gunhit/game/slide2Fx.ts', 'utf8');
const six = readFileSync('src/games/gunhit/game/setSixFx.ts', 'utf8');
const seven = readFileSync('src/games/gunhit/game/setSevenFx.ts', 'utf8');
const one = readFileSync('src/games/gunhit/game/setOneFx.ts', 'utf8');

/** Paint the whole square red; only what the clip allows may survive. */
function paintSquare(c: CanvasRenderingContext2D) {
  c.fillStyle = '#ff0000';
  c.fillRect(0, 0, 120, 120);
}

test('a registered clip confines every splinter layer that runs through it', () => {
  const cv = createCanvas(120, 120);
  const c = cv.getContext('2d') as unknown as CanvasRenderingContext2D;
  let called = 0;
  setSplinterClip(c, (ctx) => {
    called++;
    ctx.beginPath();
    ctx.arc(60, 60, 20, 0, Math.PI * 2);
    ctx.clip();
    return true;
  });
  withSplinterClip(c, () => paintSquare(c));
  setSplinterClip(c, null);

  const data = (cv.getContext('2d') as any).getImageData(0, 0, 120, 120).data as Uint8ClampedArray;
  const at = (x: number, y: number) => data[(y * 120 + x) * 4 + 3];
  assert.equal(called, 1, 'the boss outline was painted as a clip');
  assert.ok(at(60, 60) > 200, 'the round inside the outline keeps its splinters');
  assert.equal(at(2, 2), 0, 'nothing is painted in the empty sky');
  assert.equal(at(118, 60), 0, 'nothing is painted beside the head');
  assert.equal(at(60, 118), 0, 'nothing is painted below the head either');
});

test('without a boss clip the same layer paints everywhere, exactly as before', () => {
  const cv = createCanvas(120, 120);
  const c = cv.getContext('2d') as unknown as CanvasRenderingContext2D;
  setSplinterClip(c, null);
  withSplinterClip(c, () => paintSquare(c));
  const data = (cv.getContext('2d') as any).getImageData(0, 0, 120, 120).data as Uint8ClampedArray;
  assert.ok(data[3] > 200, 'the corner is painted: a round stage is untouched');
  assert.ok(data[(60 * 120 + 60) * 4 + 3] > 200, 'the middle is painted');
});

test('a clip that cannot be built never eats the splinters', () => {
  const cv = createCanvas(120, 120);
  const c = cv.getContext('2d') as unknown as CanvasRenderingContext2D;
  setSplinterClip(c, () => false);
  withSplinterClip(c, () => paintSquare(c));
  setSplinterClip(c, null);
  const data = (cv.getContext('2d') as any).getImageData(0, 0, 120, 120).data as Uint8ClampedArray;
  assert.ok(data[3] > 200, 'a frame without a silhouette still shows its fx');
});

test('a clip registered for another canvas does not follow the context', () => {
  const a = createCanvas(120, 120);
  const b = createCanvas(120, 120);
  const ca = a.getContext('2d') as unknown as CanvasRenderingContext2D;
  const cb = b.getContext('2d') as unknown as CanvasRenderingContext2D;
  setSplinterClip(ca, (ctx) => { ctx.beginPath(); ctx.arc(60, 60, 4, 0, Math.PI * 2); ctx.clip(); return true; });
  withSplinterClip(cb, () => paintSquare(cb));
  setSplinterClip(ca, null);
  const data = (b.getContext('2d') as any).getImageData(0, 0, 120, 120).data as Uint8ClampedArray;
  assert.ok(data[3] > 200, 'the other canvas paints its own frame in full');
});

test('the running game clips the impact splinters to the boss it drew', () => {
  // The splinter pass is the one that carries the boss clip …
  assert.match(game, /if \(this\.bossClipPaint\(fxCtx\)\) return true;/);
  assert.match(game, /withSplinterClip\(c, \(\) => this\.drawSplinters\(c\)\);/);
  // … and the outline is the one the hit test stops rounds on, in the very
  // transform the head was painted with.
  assert.match(game, /private bossClipPaint\(c: CanvasRenderingContext2D\): boolean/);
  assert.match(game, /const art = this\.bossArtScreen;/);
  assert.match(game, /c\.setTransform\(art\);/);
  assert.match(game, /c\.clip\(surface\);/);
  assert.match(game, /this\.bossArtScreen = this\.level\.boss && typeof c\.getTransform === 'function' \? c\.getTransform\(\) : null;/);
  // The clip is released before the HUD, so no overlay inherits it.
  assert.match(game, /setSplinterClip\(c, null\);\n\n    if \(this\.state !== 'idle'\) this\.drawHUD\(c\);/);
  // Callouts are labels, not splatter: they are drawn after the clip.
  assert.match(game, /for \(const p of this\.particles\) \{\n\s*if \(p\.kind === 'text'\) this\.drawImpactText\(c, p\);/);
  // Every splinter layer runs its particle draw through the same hook, while
  // the rounds in flight keep flying.
  assert.match(nine, /withSplinterClip\(ctx, \(\) => drawParticles\(ctx, this\.particles\)\);/);
  assert.match(eleven, /withSplinterClip\(ctx, \(\) => \(g as unknown as/);
  assert.match(two, /withSplinterClip\(ctx, \(\) => this\.drawGlows\(ctx\)\);/);
  assert.match(two, /withSplinterClip\(ctx, \(\) => this\.drawStreaks\(ctx\)\);/);
  assert.match(six, /withSplinterClip\(c, \(\) => this\.drawParts\(c\)\);/);
  assert.match(seven, /withSplinterClip\(ctx, \(\) => this\.particles\.draw\(ctx, false\)\);/);
  assert.match(one, /withSplinterClip\(ctx, \(\) => this\.particles\.draw\(ctx, true\)\);/);
  // Beams and jets are the round in flight: never wrapped.
  assert.doesNotMatch(two, /withSplinterClip\(ctx, \(\) => this\.drawBeams/);
  assert.doesNotMatch(two, /withSplinterClip\(ctx, \(\) => this\.drawJets/);
});
