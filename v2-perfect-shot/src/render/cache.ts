/**
 * Bounded canvas-sprite LRU. Artwork stays vector-authored; a running browser
 * rasterises each material once instead of rebuilding hundreds of paths at
 * 60 fps. The factory is injected, so the renderer still has no DOM dependency.
 */
export interface Surface {
  width: number;
  height: number;
  getContext(type: '2d'): CanvasRenderingContext2D | null;
}
export interface SpriteCache {
  get(key: string, width: number, height: number, paint: (c: CanvasRenderingContext2D) => void): CanvasImageSource | null;
  clear(): void;
  readonly bytes: number;
}
export function createSpriteCache(factory: () => Surface, limit = 24 * 1024 * 1024): SpriteCache {
  const entries = new Map<string, { surface: Surface; bytes: number }>();
  let bytes = 0;
  return {
    get bytes() { return bytes; },
    get(key, width, height, paint) {
      const hit = entries.get(key);
      if (hit) { entries.delete(key);entries.set(key,hit);return hit.surface as CanvasImageSource; }
      const cost = width * height * 4;
      while (cost <= limit && entries.size && (bytes + cost > limit || entries.size >= 20)) {
        const oldest = entries.keys().next().value!;const entry = entries.get(oldest)!;
        entry.surface.width = 1;entry.surface.height = 1;bytes -= entry.bytes;entries.delete(oldest);
      }
      const surface = factory();surface.width = width;surface.height = height;
      const ctx = surface.getContext('2d');if (!ctx) return null;
      paint(ctx);
      if (cost <= limit) { entries.set(key,{surface,bytes:cost});bytes += cost; }
      return surface as CanvasImageSource;
    },
    clear() {
      for (const {surface} of entries.values()) { surface.width = 1;surface.height = 1; }
      entries.clear();bytes = 0;
    },
  };
}
