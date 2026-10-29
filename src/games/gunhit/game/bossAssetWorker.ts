import type { BossType } from './bossRoster';
import { processBossPixels } from './bossAssetPixels';

// Do the full-resolution background removal and collision-contour scan away
// from requestAnimationFrame. The same pixel function powers the fallback.
const scope = globalThis as unknown as {
  onmessage: ((event: MessageEvent<{ type: BossType; bitmap: ImageBitmap }>) => void) | null;
  postMessage(message: unknown, transfer: Transferable[]): void;
};

scope.onmessage = (event) => {
  const { type, bitmap } = event.data;
  try {
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('2D worker canvas is not supported');
    ctx.drawImage(bitmap, 0, 0);
    bitmap.close();
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const radii = processBossPixels(pixels.data, canvas.width, canvas.height);
    ctx.putImageData(pixels, 0, 0);
    const output = canvas.transferToImageBitmap();
    scope.postMessage({ type, bitmap: output, radii }, [output]);
  } catch {
    bitmap.close();
    scope.postMessage({ type }, []);
  }
};
