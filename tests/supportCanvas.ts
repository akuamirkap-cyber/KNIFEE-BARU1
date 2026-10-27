/**
 * Slide 7 / 9 / 11 artwork is imported verbatim, and those modules bake small
 * glow sprites into an offscreen `<canvas>` through `document.createElement`.
 * Node has no DOM, so the structural art tests install this minimal shim: a
 * canvas whose 2D context accepts every call the real renderers make.
 *
 * Everything the shimmed context paints is throwaway — the assertions only
 * count draw calls on the *recording* proxy the test passes in, so a silent
 * permissive context keeps those counts identical to the browser.
 */
export function installCanvasShim(): () => void {
  const g = globalThis as { document?: unknown };
  const previous = g.document;
  if (previous) return () => { g.document = previous; };

  const gradient = { addColorStop: () => {} };
  const ctx = new Proxy({}, {
    get: (_target, prop) => {
      if (prop === 'createLinearGradient' || prop === 'createRadialGradient'
        || prop === 'createConicGradient' || prop === 'createPattern') return () => gradient;
      if (prop === 'measureText') return () => ({ width: 8 });
      if (prop === 'getImageData') return () => ({ data: new Uint8ClampedArray(4) });
      if (prop === 'createImageData') {
        return (w = 1, h = 1) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) });
      }
      if (prop === 'canvas') return { width: 64, height: 64 };
      return () => {};
    },
    set: () => true,
  }) as CanvasRenderingContext2D;

  const canvas = () => ({
    width: 64,
    height: 64,
    style: {},
    getContext: () => ctx,
  });

  // Diamond Breaker bakes its rock texture into a `Path2D` per chunk. Node has
  // no Path2D, so a shattering boulder used to throw on the first hit that dug
  // into the stone (the gem-only hits never reached `bake()`).
  const gPath = globalThis as { Path2D?: unknown };
  const previousPath = gPath.Path2D;
  if (!previousPath) {
    gPath.Path2D = class {
      moveTo() {}
      lineTo() {}
      closePath() {}
      arc() {}
      arcTo() {}
      ellipse() {}
      rect() {}
      roundRect() {}
      quadraticCurveTo() {}
      bezierCurveTo() {}
      addPath() {}
    };
  }

  // Boss art is decoded with `new Image()`; nothing here inspects pixels.
  const gAny = globalThis as { Image?: unknown };
  const previousImage = gAny.Image;
  if (!previousImage) {
    gAny.Image = class {
      width = 1;
      height = 1;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(_src: string) { /* never loads in Node: the art simply stays blank */ }
    };
  }

  g.document = {
    createElement: (tag: string) => (tag === 'canvas' ? canvas() : { style: {} }),
  } as unknown;

  // Slide 11's SoundEngine asks `window.AudioContext` before it builds anything.
  // With a bare `window` it simply reports "no audio here" and stays silent.
  const w = globalThis as { window?: unknown };
  const previousWindow = w.window;
  if (!previousWindow) w.window = {};

  return () => {
    if (previous) g.document = previous;
    else Reflect.deleteProperty(g, 'document');
    if (previousWindow) w.window = previousWindow;
    else Reflect.deleteProperty(w, 'window');
    if (!previousImage) Reflect.deleteProperty(gAny, 'Image');
    if (!previousPath) Reflect.deleteProperty(gPath, 'Path2D');
  };
}
