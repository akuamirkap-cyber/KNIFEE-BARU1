/** Frozen full-buffer renderer used as a visual oracle for the bounded
 * readback implementation. Keep its equations and draw order unchanged. */
/**
 * Metaball ("fluid") acid layer — a 1:1 port of games/game-3 renderFluid() +
 * collectBlobs().
 *
 * Slide 7's Acid Spitter is not drawn as separate circles: every droplet, the
 * glob body, the trail and the acid stuck on the wheel are collected as soft
 * "metaballs", rendered additively into a low-resolution buffer, thresholded
 * and re-coloured into one viscous, merged blob with a bright inner highlight.
 * Slide 1 previously approximated this with a few additive sprites, which is
 * why the acid looked like stacked solid circles instead of liquid.
 */
import { drawGlow } from '../src/games/gunhit/game/art/glowSprite';

const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

export interface AcidBlob {
  x: number;
  y: number;
  r: number;
}

/** Sub-blob of a glob stuck on the wheel (game-3 SubBlob). */
export interface AcidStuckBlob {
  d: number;
  s: number;
  r: number;
  ph: number;
}

/** metaball field sprite: alpha = (1 - d^2)^2 */
let blobSpriteC: HTMLCanvasElement | null = null;
function blobSprite(): HTMLCanvasElement {
  if (blobSpriteC) return blobSpriteC;
  const S = 64;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d')!;
  const img = g.createImageData(S, S);
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const dx = (x + 0.5) / (S / 2) - 1;
      const dy = (y + 0.5) / (S / 2) - 1;
      const d2 = dx * dx + dy * dy;
      const v = d2 >= 1 ? 0 : Math.pow(1 - d2, 2);
      const i = (y * S + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = 255;
      img.data[i + 3] = Math.round(v * 255);
    }
  }
  g.putImageData(img, 0, 0);
  blobSpriteC = c;
  return blobSpriteC;
}

export interface AcidHotCore {
  x: number;
  y: number;
}

export class ReferenceAcidFluid {
  private fs = 0.45;
  private fw = 0;
  private fh = 0;
  // Created lazily so importing the module in a headless test environment
  // never touches the DOM.
  private fc: HTMLCanvasElement | null = null;
  private fctx: CanvasRenderingContext2D | null = null;
  private oc: HTMLCanvasElement | null = null;
  private octx: CanvasRenderingContext2D | null = null;
  private out: ImageData | null = null;
  private blobs: AcidBlob[] = [];
  private w = 0;
  private h = 0;
  /**
   * Slide 7's glow radii are tuned for a full-screen canvas. On slide 1's
   * 420px board the same numbers became a huge green haze, so the bloom is
   * scaled with the viewport (never below 55%).
   */
  private glowScale = 1;

  resize(W: number, H: number) {
    if (this.w === W && this.h === H && this.out) return;
    if (typeof document === 'undefined') return;
    if (!this.fc || !this.oc) {
      this.fc = document.createElement('canvas');
      this.fctx = this.fc.getContext('2d');
      this.oc = document.createElement('canvas');
      this.octx = this.oc.getContext('2d');
    }
    this.w = W;
    this.h = H;
    this.glowScale = Math.max(0.55, Math.min(1, W / 760));
    // Same resolution budget as slide 7: enough samples for smooth merging,
    // cheap enough for an every-frame ImageData pass.
    this.fs = Math.min(0.45, Math.sqrt(150000 / (W * H)));
    this.fw = Math.ceil(W * this.fs);
    this.fh = Math.ceil(H * this.fs);
    this.fc!.width = this.oc!.width = this.fw;
    this.fc!.height = this.oc!.height = this.fh;
    this.out = this.octx!.createImageData(this.fw, this.fh);
  }

  begin() {
    this.blobs.length = 0;
  }

  add(x: number, y: number, r: number) {
    if (r < 0.6) return;
    this.blobs.push({ x, y, r });
  }

  get count() {
    return this.blobs.length;
  }

  /** Composite the merged acid body. Returns true when something was drawn. */
  render(c: CanvasRenderingContext2D, W: number, H: number, hotCores: AcidHotCore[] = []): boolean {
    if (!this.blobs.length || !this.out || !this.fctx || !this.octx) return false;
    const f = this.fctx;
    const s = this.fs;
    const fw = this.fw;
    const fh = this.fh;
    f.setTransform(1, 0, 0, 1, 0, 0);
    f.globalCompositeOperation = 'lighter';
    f.clearRect(0, 0, fw, fh);
    const spr = blobSprite();
    for (const b of this.blobs) {
      const r = b.r * 1.6 * s;
      if (r < 0.4) continue;
      f.drawImage(spr, b.x * s - r, b.y * s - r, r * 2, r * 2);
    }
    const img = f.getImageData(0, 0, fw, fh);
    const d = img.data;
    const o = this.out.data;
    const T = 92;
    const inv = 1 / (255 - T);
    const w4 = fw * 4;
    for (let i = 0, n = d.length; i < n; i += 4) {
      const a = d[i + 3];
      if (a < T) {
        o[i + 3] = 0;
        continue;
      }
      const v = (a - T) * inv;
      const aa = i >= w4 ? d[i - w4 + 3] : 0;
      const hl = clamp((a - aa - 26) / 70);
      let r: number;
      let g: number;
      let b: number;
      if (v < 0.16) {
        const k = v / 0.16;
        r = lerp(48, 128, k);
        g = lerp(104, 208, k);
        b = lerp(0, 8, k);
      } else if (v < 0.6) {
        const k = (v - 0.16) / 0.44;
        r = lerp(128, 190, k);
        g = lerp(208, 255, k);
        b = lerp(8, 40, k);
      } else {
        const k = (v - 0.6) / 0.4;
        r = lerp(190, 248, k);
        g = 255;
        b = lerp(40, 170, k);
      }
      const h = hl * 0.75;
      o[i] = r + (255 - r) * h;
      o[i + 1] = g + (255 - g) * h;
      o[i + 2] = b + (255 - b) * h;
      o[i + 3] = v < 0.08 ? 150 + (v / 0.08) * 105 : 255;
    }
    this.octx.putImageData(this.out, 0, 0);

    // under-glow so the acid bleeds light onto the wheel and the gun
    let n = 0;
    for (const b of this.blobs) {
      if (b.r < 3) continue;
      if (++n > 160) break;
      drawGlow(c, b.x, b.y, b.r * 3.2 * this.glowScale, '#7dff00', 0.16 + 0.1 * Math.min(1, b.r / 10));
    }
    c.save();
    c.imageSmoothingEnabled = true;
    c.drawImage(this.oc!, 0, 0, W, H);
    c.restore();

    // hot inner core of every flying glob
    for (const p of hotCores) {
      drawGlow(c, p.x, p.y + 4, 34 * this.glowScale, '#eaff6a', 0.55);
      drawGlow(c, p.x - 3, p.y - 3, 9 * this.glowScale, '#ffffff', 0.9);
    }
    return true;
  }
}
