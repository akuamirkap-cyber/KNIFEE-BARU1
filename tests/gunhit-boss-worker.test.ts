import test from 'node:test';
import assert from 'node:assert/strict';
import { installCanvasShim } from './supportCanvas';
import { processBossPixels } from '../src/games/gunhit/game/bossAssetPixels';

installCanvasShim();
const g = globalThis as unknown as Record<string, any>;
const images: any[] = [];
g.Image = class {
  naturalWidth = 2; naturalHeight = 2; onload: (() => void) | null = null; src = '';
  constructor() { images.push(this); }
};
class Bitmap {
  width = 2; height = 2; closed = 0;
  close() { this.closed++; }
}
class FakeWorker {
  static instances: FakeWorker[] = [];
  onmessage: ((event: { data: any }) => void) | null = null;
  onerror: (() => void) | null = null;
  posted: { type: string; bitmap: Bitmap }[] = [];
  terminated = 0;
  constructor() { FakeWorker.instances.push(this); }
  postMessage(message: { type: string; bitmap: Bitmap }) { this.posted.push(message); }
  terminate() { this.terminated++; }
}
g.Worker = FakeWorker;
g.OffscreenCanvas = class {};
g.createImageBitmap = async () => new Bitmap();
const boss = await import('../src/games/gunhit/game/bossAssetProcessor.ts');

test('boss background removal and radial collision profile are deterministic', () => {
  const w = 7, h = 7, data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4;
    const red = x >= 1 && x <= 5 && y >= 2 && y <= 4;
    data[i] = red ? 180 : 255; data[i + 1] = red ? 20 : 255; data[i + 2] = red ? 40 : 255; data[i + 3] = 255;
  }
  const result = processBossPixels(data, w, h);
  assert.equal(data[3], 0, 'white sticker is removed');
  assert.equal(data[(3 * w + 3) * 4 + 3], 255, 'colored boss remains opaque');
  assert.equal(result.length, 360);
  assert.ok(result.every((r) => Number.isFinite(r) && r > 0 && r <= 1));
  assert.notEqual(result[0], result[90], 'the angular contour follows the actual shape');
});

test('decoded boss images use one worker, publish full results and terminate after the batch', async () => {
  assert.equal(images.length, 4);
  let notifications = 0;
  const unsubscribe = boss.onBossAssetsLoaded(() => { notifications++; });
  for (const img of images) img.onload();
  await Promise.resolve();
  const worker = FakeWorker.instances[0];
  assert.equal(worker.posted.length, 4, 'all decoded images go to the background worker');
  const radius = Array.from({ length: 360 }, (_, i) => 0.7 + i / 10000);
  const results: Bitmap[] = [];
  for (const message of worker.posted) {
    const bitmap = new Bitmap(); results.push(bitmap);
    worker.onmessage!({ data: { type: message.type, bitmap, radii: radius } });
  }
  assert.equal(notifications, 4);
  assert.equal(worker.terminated, 1, 'the worker does not remain resident after loading');
  assert.equal(boss.getBossAsset('knight')?.canvas, results[0]);
  assert.deepEqual(boss.getBossAsset('knight')?.radii, radius);
  unsubscribe();
  boss.loadAllBosses();
  images[4].onload();
  await Promise.resolve();
  const next = FakeWorker.instances[1];
  const invalid = new Bitmap();
  next.onmessage!({ data: { type: next.posted[0].type, bitmap: invalid, radii: [] } });
  assert.equal(invalid.closed, 1, 'an unusable worker image is discarded');
  assert.equal(next.terminated, 1);
  assert.equal(notifications, 4, 'unsubscribed games are never notified by the fallback');
});

test('worker failure falls back for every pending image and closes late bitmaps', async () => {
  const waiting: ((value: Bitmap) => void)[] = [];
  g.createImageBitmap = () => new Promise<Bitmap>((resolve) => { waiting.push(resolve); });
  const firstNew = images.length;
  boss.loadAllBosses();
  images[firstNew].onload(); images[firstNew + 1].onload();
  const worker = FakeWorker.instances.at(-1)!;
  assert.equal(waiting.length, 2);
  worker.onerror!();
  assert.equal(worker.terminated, 1);
  assert.ok(!(boss.getBossAsset('knight')?.canvas instanceof Bitmap), 'knight has synchronous fallback art');
  assert.ok(!(boss.getBossAsset('oni')?.canvas instanceof Bitmap), 'oni has synchronous fallback art');
  const late = [new Bitmap(), new Bitmap()];
  waiting.forEach((resolve, i) => resolve(late[i]));
  await Promise.resolve();
  assert.deepEqual(late.map((b) => b.closed), [1, 1], 'late decoded images cannot leak into a dead worker');
  assert.equal(worker.posted.length, 0);
});
