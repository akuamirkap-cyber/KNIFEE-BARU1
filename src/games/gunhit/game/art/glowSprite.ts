/**
 * Soft radial glow sprite (ported from games/game-3 glowSprite()).
 *
 * The slide-7 "Elemental Arsenal" guns draw their muzzle/acid glow with this
 * sprite. The slide-1 port used `fillStyle = color; arc(); fill()` which paints
 * a hard-edged *solid circle* — that is the green disc that showed up behind
 * the Xenomorph Acid Spitter. Everything that needs a bloom now samples this
 * cached gradient instead.
 */
type C = CanvasRenderingContext2D;

const cache = new Map<string, HTMLCanvasElement>();

function rgba(hex: string, a: number) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

export function glowSprite(hex: string): HTMLCanvasElement {
  const hit = cache.get(hex);
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, rgba(hex, 1));
  gr.addColorStop(0.18, rgba(hex, 0.8));
  gr.addColorStop(0.45, rgba(hex, 0.25));
  gr.addColorStop(1, rgba(hex, 0));
  g.fillStyle = gr;
  g.fillRect(0, 0, 128, 128);
  cache.set(hex, c);
  return c;
}

/**
 * Draw a soft bloom centered on (x, y) with radius r.
 * Falls back to a radial gradient when there is no DOM (headless tests).
 */
export function drawGlow(c: C, x: number, y: number, r: number, hex: string, alpha: number) {
  if (r <= 0 || alpha <= 0.003) return;
  c.save();
  c.globalCompositeOperation = 'lighter';
  c.globalAlpha = Math.min(1, alpha);
  if (typeof document === 'undefined') {
    const g = c.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, rgba(hex, 1));
    g.addColorStop(0.18, rgba(hex, 0.8));
    g.addColorStop(0.45, rgba(hex, 0.25));
    g.addColorStop(1, rgba(hex, 0));
    c.fillStyle = g;
    c.beginPath();
    c.arc(x, y, r, 0, Math.PI * 2);
    c.fill();
  } else {
    c.drawImage(glowSprite(hex), x - r, y - r, r * 2, r * 2);
  }
  c.restore();
}
