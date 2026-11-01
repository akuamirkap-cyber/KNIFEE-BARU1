/**
 * A boss stage in these tests runs on a shimmed canvas whose 2D context returns
 * no pixels, so no artwork mask can ever be read back — and Game A's boss no
 * longer has a radius to fall back to (that circle is the bug this stage must
 * not have). Tests that only care about gameplay therefore hand the game a
 * known silhouette: a mask, exactly like the one the artwork produces.
 */
export function giveBossMask(
  game: Record<string, any>,
  opts: { radius?: number; shape?: 'disc' | 'square' } = {},
) {
  const size = 384;
  const half = size / 2;
  const R = game.level.radius as number;
  const span = (R + 40) / R;
  const rr = ((opts.radius ?? 0.92) * half) / span;
  const alpha = new Uint8Array(size * size);
  const square = (opts.shape ?? 'disc') === 'square';
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x + 0.5 - half;
      const dy = y + 0.5 - half;
      const inside = square ? Math.abs(dx) < rr && Math.abs(dy) < rr : Math.hypot(dx, dy) < rr;
      if (inside) alpha[y * size + x] = 255;
    }
  }
  const mask = { size, alpha, span, maxR: (rr / half) * span };
  game.artMask = mask;
  game.artMaskMaxR = mask.maxR;
  game.maskOutline = null;
  game.bossArtProfile = null;
  return mask;
}
