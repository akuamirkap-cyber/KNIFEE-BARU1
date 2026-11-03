/**
 * Canvas geometry for Game A, kept out of the engine on purpose: the menu draws
 * the live weapon preview with exactly these numbers, and importing them from
 * `Game.ts` would drag the whole engine (art, FX, ported slides) into the first
 * chunk instead of its own lazily loaded one.
 */
export const W = 420;
export const H = 760;
export const CX = W / 2;
export const BASE_WHEEL_CY = 255;
export const CY = Math.round(BASE_WHEEL_CY * (1 - 0.28)); // 28% higher wheel position (184)
export const SPECIAL_CY = CY; // Bonus / Special stage wheel sits at the same vertical position as the normal wheel.

export function initialGameplayWheelCenterY(boss = false, special = false) {
  if (special) return SPECIAL_CY;
  return boss ? CY + 36 : CY;
}

export const GAMEPLAY_GUN_SCALE = 1.08; // -10% from 1.2x (1.2 * 0.9 = 1.08)
export const GUN_Y = H - Math.round(185 * GAMEPLAY_GUN_SCALE); // muzzle tip raised so +20% gun never clips bottom

/* ------------------------------------------------------------------ landscape
 * MODE LANDSCAPE memutar dunia potret seperempat putaran searah jarum jam:
 * sumbu Y dunia (bawah = senjata) jadi sumbu X layar (kiri = senjata), jadi
 * senjata berdiri di tepi kiri dan menembak ke kanan, ke arah roda/musuh yang
 * pindah ke tepi kanan. Dunia sendiri tetap 420×760 — setiap rumus fisika, art
 * dan FX di engine tidak berubah — yang berubah hanya transform pandangannya.
 *
 *   layar.x = H - dunia.y        layar.y = dunia.x
 *
 * sehingga senjata (210, 560) mendarat di (200, 210) — kiri tengah — dan roda
 * (210, 184) mendarat di (576, 210) — kanan tengah.
 */

/** Ukuran bingkai/canvas yang terlihat untuk setiap mode (CSS px). */
export const PORTRAIT_VIEW = { w: W, h: H } as const;
export const LANDSCAPE_VIEW = { w: H, h: W } as const;

export function viewSize(landscape: boolean): { w: number; h: number } {
  return landscape ? { w: LANDSCAPE_VIEW.w, h: LANDSCAPE_VIEW.h } : { w: PORTRAIT_VIEW.w, h: PORTRAIT_VIEW.h };
}

/** Satu titik dunia → titik layar untuk mode yang aktif. */
export function worldToView(x: number, y: number, landscape: boolean): { x: number; y: number } {
  return landscape ? { x: H - y, y: x } : { x, y };
}

/** Kebalikan `worldToView`: satu sentuhan layar → titik dunia. */
export function viewToWorld(x: number, y: number, landscape: boolean): { x: number; y: number } {
  return landscape ? { x: y, y: H - x } : { x, y };
}

/**
 * Transform dasar satu frame, dalam piksel device (`k` = scale × dpr).
 *
 * Potret: `scale(k)`. Landscape: rotasi +90° lalu geser sebesar lebar dunia
 * (`H`) supaya seluruh dunia masuk ke kanvas 760×420 — matriksnya
 * (0, k, -k, 0, k·H, 0).
 */
export function baseViewTransform(
  k: number,
  landscape: boolean,
): [number, number, number, number, number, number] {
  return landscape ? [0, k, -k, 0, k * H, 0] : [k, 0, 0, k, 0, 0];
}

/**
 * Sudut tambahan yang membuat sebuah gambar "tegak" di layar saat dunia sedang
 * diputar: dipakai teks callout, teks scope, dan fase awal kepala bos supaya
 * wajahnya tetap menghadap pemain, bukan terbaring miring.
 */
export const UPRIGHT_SPIN = -Math.PI / 2;
