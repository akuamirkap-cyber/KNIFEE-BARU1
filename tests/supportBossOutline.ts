/**
 * Test-side mirror of the engine's boss hitbox: the *solid footprint* of the
 * artwork — its ink plus the see-through windows the ink encloses — which is
 * also exactly what the blue outline is stroked along. Measuring against these
 * bytes is the only honest way to say "the round sits on the blue line".
 */

export interface MaskLike {
  size: number;
  span: number;
  alpha: Uint8Array | Uint8ClampedArray;
  solid?: Uint8Array;
  maxR?: number;
}

export function maskOf(game: Record<string, any>): MaskLike {
  const mask = game.artMask ?? game.ensureArtMask?.();
  if (!mask) throw new Error('the stage has no artwork mask');
  return mask as MaskLike;
}

/** Is a mask pixel inside the boss' blue outline? */
export function solidAt(mask: MaskLike, u: number, v: number): boolean {
  if (u < 0 || v < 0 || u >= mask.size || v >= mask.size) return false;
  const i = v * mask.size + u;
  if (mask.solid && mask.solid.length) return mask.solid[i] === 1;
  return mask.alpha[i] > 96;
}

/** Art-local px → continuous mask coordinates. */
export function maskPoint(game: Record<string, any>, lx: number, ly: number) {
  const mask = maskOf(game);
  const R = game.level.radius as number;
  const half = mask.size / 2;
  return {
    x: (lx / R / mask.span + 1) * half,
    y: (ly / R / mask.span + 1) * half,
  };
}

/**
 * Signed distance (mask px, negative = inside) from an art-local point to the
 * nearest edge of the solid footprint — the line the blue stroke follows.
 * Zero is the line; a stop point must land within a pixel or two of it.
 */
export function solidOffset(game: Record<string, any>, lx: number, ly: number): number {
  const mask = maskOf(game);
  const p = maskPoint(game, lx, ly);
  const u = Math.floor(p.x);
  const v = Math.floor(p.y);
  const inside = solidAt(mask, u, v);
  let best = Infinity;
  for (let dy = -14; dy <= 14; dy++) {
    for (let dx = -14; dx <= 14; dx++) {
      const px = u + dx;
      const py = v + dy;
      if (px < 0 || py < 0 || px >= mask.size || py >= mask.size) continue;
      if (solidAt(mask, px, py) === inside) continue;
      // Distance to the nearest point of that open pixel's square.
      const ddx = Math.max(px - p.x, 0, p.x - (px + 1));
      const ddy = Math.max(py - p.y, 0, p.y - (py + 1));
      const d = Math.hypot(ddx, ddy);
      if (d < best) best = d;
    }
  }
  if (!Number.isFinite(best)) return inside ? -99 : 99;
  return inside ? -best : best;
}

/**
 * Radius (mask px from the mask centre) of the first solid pixel on a ray walked
 * in from outside, for every 0.5° of a turn — the same walk the engine does, so
 * it describes the line the player sees at that angle.
 */
export function outlineRadii(mask: MaskLike, steps = 720): number[] {
  const half = mask.size / 2;
  const out = new Array<number>(steps).fill(0);
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    const cos = Math.cos(a);
    const sin = Math.sin(a);
    for (let r = half * 0.995; r > 1; r -= 0.35) {
      const u = Math.floor(half + cos * r);
      const v = Math.floor(half + sin * r);
      if (solidAt(mask, u, v)) { out[i] = r; break; }
    }
  }
  return out;
}

/** Outline radius at an angle, linearly interpolated like the renderer's table. */
export function outlineRadiusAt(radii: number[], angle: number): number {
  let a = angle;
  if (a < 0) a = ((a % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
  const f = (a / (Math.PI * 2)) * radii.length;
  const i = Math.floor(f) % radii.length;
  const t = f - Math.floor(f);
  return radii[i] * (1 - t) + radii[(i + 1) % radii.length] * t;
}

/** Outline radius in art-local px at an angle (mask px scaled by the stage). */
export function outlineRadiusPx(game: Record<string, any>, radii: number[], angle: number): number {
  const mask = maskOf(game);
  const R = game.level.radius as number;
  return (outlineRadiusAt(radii, angle) / (mask.size / 2)) * R * mask.span;
}
