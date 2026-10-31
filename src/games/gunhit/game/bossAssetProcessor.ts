import type { BossType } from './bossRoster';
import { processBossPixels } from './bossAssetPixels';

interface ProcessedBoss {
  canvas: HTMLCanvasElement | ImageBitmap;
  radii: number[]; // 360 angular profile radii normalized to base radius
}

const cache: Partial<Record<BossType, ProcessedBoss>> = {};
const listeners = new Set<() => void>();

export function onBossAssetsLoaded(fn: () => void) {
  listeners.add(fn);
  if (Object.keys(cache).length > 0) {
    fn();
  }
  return () => { listeners.delete(fn); };
}

const BOSS_SRCS: Record<BossType, string> = {
  knight: '/bosses/dark_knight_flat.png',
  oni: '/bosses/oni_demon_flat.png',
  cyborg: '/bosses/mecha_cyborg_flat.png',
  pirate: '/bosses/pirate_lord_flat.png',
};

/** Install one completed asset and notify only currently mounted games. */
function publish(type: BossType, canvas: HTMLCanvasElement | ImageBitmap, radii: number[]) {
  cache[type] = { canvas, radii };
  listeners.forEach((cb) => cb());
}

/** Exact synchronous fallback for browsers without worker canvas support. */
function processBossImage(img: HTMLImageElement, type: BossType) {
  const w = img.naturalWidth || 512;
  const h = img.naturalHeight || 512;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.drawImage(img, 0, 0, w, h);
  const pixels = ctx.getImageData(0, 0, w, h);
  const radii = processBossPixels(pixels.data, w, h);
  ctx.putImageData(pixels, 0, 0);
  publish(type, canvas, radii);
}

let worker: Worker | null = null;
const pending = new Map<BossType, HTMLImageElement>();

/** Terminate when the last image is ready so the helper does not linger. */
function stopWorkerWhenIdle() {
  if (pending.size === 0 && worker) {
    worker.terminate();
    worker = null;
  }
}

/** If a worker is unsupported or fails, retain the old synchronous renderer. */
function failWorker() {
  worker?.terminate();
  worker = null;
  const retry = Array.from(pending.entries());
  pending.clear();
  for (const [type, img] of retry) processBossImage(img, type);
}

function getWorker(): Worker | null {
  if (worker) return worker;
  if (typeof Worker === 'undefined' || typeof OffscreenCanvas === 'undefined'
    || typeof createImageBitmap !== 'function') return null;
  try {
    const active = new Worker(new URL('./bossAssetWorker.ts', import.meta.url), { type: 'module' });
    active.onmessage = (event: MessageEvent<{ type: BossType; bitmap?: ImageBitmap; radii?: number[] }>) => {
      const { type, bitmap, radii } = event.data;
      const img = pending.get(type);
      if (!img) { bitmap?.close(); return; }
      pending.delete(type);
      if (bitmap && radii?.length === 360) publish(type, bitmap, radii);
      else {
        bitmap?.close();
        processBossImage(img, type);
      }
      stopWorkerWhenIdle();
    };
    active.onerror = () => { if (worker === active) failWorker(); };
    worker = active;
    return active;
  } catch {
    return null;
  }
}

/** Decode on the browser's image pipeline; perform the large pixel scan off the frame thread. */
function queueBossImage(img: HTMLImageElement, type: BossType) {
  const active = getWorker();
  if (!active) { processBossImage(img, type); return; }
  pending.set(type, img);
  try {
    void createImageBitmap(img).then((bitmap) => {
      if (worker !== active || pending.get(type) !== img) { bitmap.close(); return; }
      try { active.postMessage({ type, bitmap }, [bitmap]); }
      catch {
        bitmap.close();
        pending.delete(type);
        processBossImage(img, type);
        stopWorkerWhenIdle();
      }
    }).catch(() => {
      if (pending.get(type) !== img) return;
      pending.delete(type);
      processBossImage(img, type);
      stopWorkerWhenIdle();
    });
  } catch {
    pending.delete(type);
    processBossImage(img, type);
    stopWorkerWhenIdle();
  }
}

export function loadAllBosses() {
  if (typeof window === 'undefined') return;
  (Object.keys(BOSS_SRCS) as BossType[]).forEach((type) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => { queueBossImage(img, type); };
    img.src = BOSS_SRCS[type];
  });
}

loadAllBosses();

export function getBossAsset(type: BossType): ProcessedBoss | null {
  return cache[type] || null;
}

export function getExactBossRadius(type: BossType, localAngle: number, targetRadius: number): number {
  const asset = cache[type];
  if (!asset) {
    return targetRadius;
  }
  const TAU = Math.PI * 2;
  const normA = ((localAngle % TAU) + TAU) % TAU;
  const deg = Math.floor((normA * 180) / Math.PI) % 360;
  // Scaled accurately to the character head size. The floor only guards
  // against a degenerate 0-length ray; it must never pad the contour back out
  // towards a circle (the reference game uses 0.3 the same way).
  const scale = targetRadius * 1.05;
  return Math.max(targetRadius * 0.3, asset.radii[deg] * scale);
}
