import test from 'node:test';
import assert from 'node:assert/strict';
import { Canvas, createCanvas } from '@napi-rs/canvas';
import { AcidFluid } from '../src/games/gunhit/game/acidFluid';
import { ReferenceAcidFluid } from './supportAcidFluidReference';

const g = globalThis as unknown as Record<string, unknown>;
const originalDocument = g.document, originalCanvas = g.HTMLCanvasElement;
g.document = { createElement: () => createCanvas(1, 1) };
g.HTMLCanvasElement = Canvas;
test.after(() => {
  if (originalDocument === undefined) delete g.document; else g.document = originalDocument;
  if (originalCanvas === undefined) delete g.HTMLCanvasElement; else g.HTMLCanvasElement = originalCanvas;
});

const asCtx = (v: unknown) => v as CanvasRenderingContext2D;

test('bounded acid readback preserves the original fluid, glow and moving marks', () => {
  const actual = new AcidFluid(), reference = new ReferenceAcidFluid();
  const a = createCanvas(420, 760), b = createCanvas(420, 760);
  const ac = a.getContext('2d'), bc = b.getContext('2d');
  let w = 420, h = 760;
  actual.resize(w, h); reference.resize(w, h);
  const render = (blobs: number[][], hot: { x: number; y: number }[] = []) => {
    ac.fillStyle = bc.fillStyle = '#08131c';
    ac.fillRect(0, 0, w, h); bc.fillRect(0, 0, w, h);
    actual.begin(); reference.begin();
    for (const [x, y, r] of blobs) { actual.add(x, y, r); reference.add(x, y, r); }
    assert.equal(actual.render(asCtx(ac), w, h, hot), reference.render(asCtx(bc), w, h, hot));
    const aa = ac.getImageData(0, 0, w, h).data, bb = bc.getImageData(0, 0, w, h).data;
    assert.deepEqual(aa, bb, `fluid pixels match for ${JSON.stringify(blobs)}`);
  };
  render([[210, 184, 15], [200, 180, 8], [225, 189, 12], [216, 202, 8], [190, 198, 7]], [{ x: 210, y: 184 }]);
  render([[0, 0, 20], [-8, 32, 12], [418, 758, 16], [425, 742, 14]]);
  render([[180, 250, 12], [200, 250, 6], [220, 260, 10]]);
  render([[290, 400, 11], [310, 410, 9]]); // no ghost of the previous frame
  render([]); // no drawn fluid while the layer is empty
  render([[210, 150, 4]]);
  render(Array.from({ length: 200 }, (_, i) => [15 + (i * 37) % 400, 20 + (i * 71) % 720, 3 + i % 8]));
  render([[-100, -100, 10], [550, 850, 10]]); // completely outside the board
  for (let i = 0; i < 30; i++) {
    render([[100 + i * 4, 180 + i * 6, 8 + i % 9], [205 - i * 2, 200 + i * 3, 4 + i % 5]]);
  }
  // Resize resets both output buffers and their previous dirty rectangles.
  w = 375; h = 667; a.width = b.width = w; a.height = b.height = h;
  actual.resize(w, h); reference.resize(w, h);
  render([[10, 15, 12], [365, 650, 10], [188, 180, 22]], [{ x: 188, y: 180 }]);
});

test('acid reads only the occupied region, skips offscreen reads and requests a readback-friendly context', () => {
  const options: unknown[] = [];
  const before = g.document;
  g.document = { createElement: () => {
    const cv = createCanvas(1, 1);
    const get = cv.getContext.bind(cv);
    cv.getContext = ((kind: '2d', opts?: unknown) => { options.push(opts); return get(kind); }) as typeof cv.getContext;
    return cv;
  } };
  const fluid = new AcidFluid();
  try { fluid.resize(420, 760); } finally { g.document = before; }
  assert.deepEqual(options[0], { willReadFrequently: true }, 'the field canvas is optimized for repeated readback');
  const raw = fluid as unknown as { fctx: CanvasRenderingContext2D };
  const getImage = raw.fctx.getImageData.bind(raw.fctx);
  const reads: { w: number; h: number }[] = [];
  raw.fctx.getImageData = ((x: number, y: number, w: number, h: number) => {
    reads.push({ w, h });
    return getImage(x, y, w, h);
  }) as typeof raw.fctx.getImageData;
  const c = createCanvas(420, 760).getContext('2d');
  fluid.begin(); fluid.add(210, 184, 10); fluid.render(asCtx(c), 420, 760);
  assert.equal(reads.length, 1);
  assert.ok(reads[0].w * reads[0].h < 1000, 'one small blob does not read all 64,638 pixels');
  fluid.begin(); fluid.add(-300, -300, 10); fluid.add(800, 1100, 10); fluid.render(asCtx(c), 420, 760);
  assert.equal(reads.length, 1, 'even opposite offscreen droplets need no pixel readback');
  fluid.begin(); fluid.add(0, 0, 20); fluid.add(420, 760, 20); fluid.render(asCtx(c), 420, 760);
  assert.ok(reads.at(-1)!.w <= 189 && reads.at(-1)!.h <= 342, 'reads remain bounded to the buffer');
});
