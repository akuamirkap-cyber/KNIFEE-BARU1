import test from 'node:test';
import assert from 'node:assert/strict';
import { cssColor } from '../src/games/gunhit/game/fx';
import { drawGlow } from '../src/games/gunhit/game/art/glowSprite';
import { AcidFluid } from '../src/games/gunhit/game/acidFluid';
import { drawGun } from '../src/games/gunhit/game/weapons';
import { drawPreciseWeaponDecal } from '../src/games/gunhit/game/art/decalSystem';
import { getWeapon } from '../src/games/gunhit/game/weapons';
import { installCanvasShim } from './supportCanvas';


/**
 * Slide 1 ports slide 7's elemental weapons. Slide 7 builds its bloom from a
 * cached radial-gradient sprite; the first port filled a plain arc instead,
 * which is why the Acid Spitter showed a hard neon-green disc. These tests keep
 * the soft gradient (and the colour normalisation that makes the ported
 * `182,255,26` triplets visible at all) from regressing.
 */

/** Records gradient stops and plain fills so soft glows can be told apart. */
function recordingContext() {
  const radial: { inner: string; outer: string }[] = [];
  const fills: { style: unknown; alpha: number }[] = [];
  const ctx = {
    canvas: { width: 420, height: 760 },
    globalAlpha: 1,
    globalCompositeOperation: 'source-over',
    fillStyle: '' as unknown,
    strokeStyle: '' as unknown,
    lineWidth: 1,
    shadowBlur: 0,
    shadowColor: '',
    lineCap: 'butt',
    lineJoin: 'miter',
    save() {},
    restore() {},
    translate() {},
    rotate() {},
    scale() {},
    beginPath() {},
    closePath() {},
    moveTo() {},
    lineTo() {},
    quadraticCurveTo() {},
    bezierCurveTo() {},
    arc() {},
    ellipse() {},
    roundRect() {},
    rect() {},
    clip() {},
    setLineDash() {},
    fillRect() {},
    fill() {
      fills.push({ style: ctx.fillStyle, alpha: ctx.globalAlpha });
    },
    stroke() {},
    strokeRect() {},
    fillText() {},
    strokeText() {},
    measureText() {
      return { width: 10 };
    },
    drawImage() {},
    createImageData(w: number, h: number) {
      return { width: w, height: h, data: new Uint8ClampedArray(w * h * 4) };
    },
    putImageData() {},
    getImageData(_x: number, _y: number, w: number, h: number) {
      return { width: w, height: h, data: new Uint8ClampedArray(w * h * 4) };
    },
    createLinearGradient() {
      return { addColorStop() {} };
    },
    createRadialGradient() {
      const stops: [number, string][] = [];
      const gradient = {
        addColorStop(offset: number, color: string) {
          stops.push([offset, color]);
        },
      };
      const proxy = {
        addColorStop(offset: number, color: string) {
          gradient.addColorStop(offset, color);
          if (stops.length === 1) radial.push({ inner: color, outer: '' });
          else radial[radial.length - 1].outer = color;
        },
      };
      return proxy;
    },
  };
  return { ctx: ctx as unknown as CanvasRenderingContext2D, radial, fills };
}

test('particle colours from the slide-7 port are normalised before they reach canvas', () => {
  assert.equal(cssColor('182,255,26'), 'rgba(182,255,26,1)');
  assert.equal(cssColor('#b6ff1a'), 'rgba(182,255,26,1)');
  assert.equal(cssColor('#b6ff1a', 0.25), 'rgba(182,255,26,0.25)');
  // legacy strings with an unterminated rgba() must still become valid colours
  assert.equal(cssColor('rgba(220,220,220,'), 'rgba(220,220,220,1)');
  assert.equal(cssColor('143,194,58', 0.5), 'rgba(143,194,58,0.5)');
  // already complete colours keep their payload but take the requested alpha
  assert.equal(cssColor('rgba(255,255,255,0.4)', 0.9), 'rgba(255,255,255,0.9)');
});

test('bloom uses a fading radial gradient instead of a solid disc', () => {
  const { ctx, radial, fills } = recordingContext();
  drawGlow(ctx, 10, 20, 60, '#7dff00', 0.6);
  assert.equal(fills.length, 1, 'the glow is painted once');
  assert.equal(typeof fills[0].style, 'object', 'fill must be a gradient, not a flat colour');
  assert.ok(radial.length, 'a radial gradient with stops is required');
  const last = radial[radial.length - 1];
  assert.match(last.inner, /rgba\(125,255,0,1\)/);
  assert.match(last.outer, /rgba\(125,255,0,0\)/, 'the outer stop must fade to zero');
});

test('acid spitter gun art glows softly and never fills a bare circle with its light colour', () => {
  // This path reaches slide-11 art, which bakes glow sprites offscreen.
  const restoreCanvas = installCanvasShim();
  try {
  const { ctx, fills } = recordingContext();
  drawGun(ctx, 'xeno', 0, 0, 0.5, 0.6, true);
  const flatGreen = fills.filter(
    (f) => typeof f.style === 'string' && /^#7dff00$/i.test(f.style as string),
  );
  assert.equal(flatGreen.length, 0, 'the acid glow must not be a flat #7dff00 disc');
  } finally {
    // Never leak the shim into the DOM-free tests that follow.
    restoreCanvas();
  }
});

test('acid crater decal also uses the soft bloom', () => {
  const { ctx, radial, fills } = recordingContext();
  drawPreciseWeaponDecal(ctx, 106, Math.PI / 2, getWeapon('xeno'), 'wood', 1.2);
  const flatNeon = fills.filter((f) => f.style === '#9aff00');
  assert.equal(flatNeon.length, 0, 'the crater glow must not be a flat #9aff00 disc');
  assert.ok(radial.some((r) => /rgba\(154,255,0,0\)/.test(r.outer)), 'cream-green bloom expected');
});

test('metaball layer is inert (and safe) until it has blobs or a canvas', () => {
  const fluid = new AcidFluid();
  fluid.resize(420, 760);
  const { ctx } = recordingContext();
  assert.equal(fluid.render(ctx, 420, 760), false, 'nothing to draw without blobs');
  fluid.begin();
  fluid.add(10, 10, 8);
  assert.equal(fluid.count, 1);
  // Headless (no document) it must decline cleanly rather than throw.
  assert.equal(fluid.render(ctx, 420, 760), false);
});
