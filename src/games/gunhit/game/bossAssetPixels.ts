/** Remove sticker background and compute the exact radial boss contour.
 * Shared by the worker and the synchronous fallback; neither scales the art. */
export function processBossPixels(data: Uint8ClampedArray, w: number, h: number): number[] {
  // 1. First pass: Any pixel that is white, near-white, light grey (sticker background)
  // Character colors are deep cyan, dark navy, red eyes, gold horns, etc. (high saturation or dark).
  // The sticker background is light/white with very low saturation.
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];

    if (a < 20) {
      data[i + 3] = 0;
      continue;
    }

    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    const maxCh = Math.max(r, g, b);
    const minCh = Math.min(r, g, b);
    const sat = maxCh === 0 ? 0 : (maxCh - minCh) / maxCh;

    // Remove white sticker paper background (anything light with low saturation)
    if (lum > 160 && sat < 0.4) {
      data[i + 3] = 0;
    } else if (r > 200 && g > 200 && b > 200) {
      data[i + 3] = 0;
    } else if (r < 25 && g < 25 && b < 25) {
      // Also remove pure black corners if any
      data[i + 3] = 0;
    }
  }

  // 2. Second pass: BFS flood fill from all 4 borders to clear any connected remnants
  const visited = new Uint8Array(w * h);
  const queue: number[] = [];

  const pushIfEdge = (x: number, y: number) => {
    if (x < 0 || x >= w || y < 0 || y >= h) return;
    const p = y * w + x;
    if (visited[p]) return;
    visited[p] = 1;
    // If not transparent yet, check if it's border background
    const idx = p * 4;
    if (data[idx + 3] > 0) {
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      if (lum > 130) {
        queue.push(p);
      }
    }
  };

  for (let x = 0; x < w; x++) {
    pushIfEdge(x, 0);
    pushIfEdge(x, 1);
    pushIfEdge(x, h - 2);
    pushIfEdge(x, h - 1);
  }
  for (let y = 0; y < h; y++) {
    pushIfEdge(0, y);
    pushIfEdge(1, y);
    pushIfEdge(w - 2, y);
    pushIfEdge(w - 1, y);
  }

  while (queue.length > 0) {
    const p = queue.pop()!;
    data[p * 4 + 3] = 0; // Wipe alpha!

    const x = p % w;
    const y = Math.floor(p / w);

    const neighbors = [
      y * w + (x + 1),
      y * w + (x - 1),
      (y + 1) * w + x,
      (y - 1) * w + x,
    ];

    for (const np of neighbors) {
      if (np >= 0 && np < w * h && !visited[np]) {
        visited[np] = 1;
        const nIdx = np * 4;
        if (data[nIdx + 3] > 0) {
          const r = data[nIdx];
          const g = data[nIdx + 1];
          const b = data[nIdx + 2];
          const lum = 0.299 * r + 0.587 * g + 0.114 * b;
          if (lum > 130) {
            queue.push(np);
          }
        }
      }
    }
  }

  // 3. Scan exact radial contour of the character across all 360 degrees
  const cx = w / 2;
  const cy = h / 2;
  const maxSearchR = Math.min(cx, cy);
  const radii: number[] = new Array(360).fill(0.72);

  for (let deg = 0; deg < 360; deg++) {
    const rad = (deg * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    let outerR = maxSearchR * 0.55;
    for (let r = Math.floor(maxSearchR * 0.95); r >= Math.floor(maxSearchR * 0.2); r--) {
      const px = Math.round(cx + cos * r);
      const py = Math.round(cy + sin * r);
      if (px >= 0 && px < w && py >= 0 && py < h) {
        const a = data[(py * w + px) * 4 + 3];
        if (a > 60) {
          outerR = r;
          break;
        }
      }
    }
    radii[deg] = outerR / maxSearchR;
  }

  // Smooth profile
  const smoothed: number[] = new Array(360);
  for (let deg = 0; deg < 360; deg++) {
    let sum = 0;
    for (let k = -3; k <= 3; k++) {
      const idx = (deg + k + 360) % 360;
      sum += radii[idx];
    }
    smoothed[deg] = sum / 7;
  }

  return smoothed;
}

/**
 * Alpha-only radial contour of an already-cut-out artwork (the reference game's
 * boss heads, rasterised from their own SVG). Unlike `processBossPixels` this
 * never treats light pixels as sticker paper: those heads are drawn on a
 * transparent background, so their pale bone / cream colours ARE the head.
 */
export function processAlphaRadii(data: Uint8ClampedArray, w: number, h: number): number[] {
  const cx = w / 2;
  const cy = h / 2;
  const maxSearchR = Math.min(cx, cy);
  const radii: number[] = new Array(360).fill(0.3);
  for (let deg = 0; deg < 360; deg++) {
    const rad = (deg * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    let outerR = 0;
    for (let r = Math.floor(maxSearchR * 0.99); r >= 2; r--) {
      const px = Math.round(cx + cos * r);
      const py = Math.round(cy + sin * r);
      if (px >= 0 && px < w && py >= 0 && py < h && data[(py * w + px) * 4 + 3] > 16) {
        outerR = r;
        break;
      }
    }
    radii[deg] = outerR / maxSearchR;
  }
  const smoothed: number[] = new Array(360);
  for (let deg = 0; deg < 360; deg++) {
    let sum = 0;
    for (let k = -2; k <= 2; k++) sum += radii[(deg + k + 360) % 360];
    smoothed[deg] = sum / 5;
  }
  return smoothed;
}
