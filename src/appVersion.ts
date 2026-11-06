/**
 * Pilihan versi: **v1** (Gun Hit — versi asli, tetap utuh) atau **v2** (Perfect Shot v2).
 *
 * Aturannya sederhana dan sengaja:
 * - **v1 selalu jadi yang pertama tampil.** v1 tidak pernah dihapus, ditimpa,
 *   atau disembunyikan permanen — dia default-nya.
 * - v2 hanya ada di layar kalau kamu memang memilihnya (lewat tombol V1/V2),
 *   atau kalau URL-nya minta: `?v=2`. Tanpa itu, v2 tidak dirender sama sekali.
 * - Pilihan **tidak disimpan**. Setiap reload kembali ke v1, jadi tidak ada
 *   kemungkinan v1 "hilang" karena pernah sekali mencoba v2.
 */

export type AppVersion = 'v1' | 'v2';

/** Versi yang diminta URL, kalau ada: `?v=1` / `?v=2`. */
export function versionFromUrl(): AppVersion | null {
  try {
    const v = new URLSearchParams(window.location.search).get('v');
    return v === '1' ? 'v1' : v === '2' ? 'v2' : null;
  } catch {
    return null;
  }
}

/** Versi awal: URL menang, sisanya v1. */
export function initialAppVersion(): AppVersion {
  return versionFromUrl() ?? 'v1';
}

/** Label tiap versi, buat tombol pemilih. */
export const APP_VERSION_LABEL: Record<AppVersion, string> = {
  v1: 'v1 · Gun Hit (asli)',
  v2: 'v2 · Perfect Shot Lite',
};
