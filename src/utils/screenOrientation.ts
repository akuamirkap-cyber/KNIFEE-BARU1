import { Capacitor } from '@capacitor/core';

/**
 * Putar perangkatnya mengikuti mode tampilan permainan.
 *
 * Di Android (Capacitor) ini memakai `@capacitor/screen-orientation`, jadi
 * MODE LANDSCAPE benar-benar memutar HP: senjata di kiri, musuh di kanan, dan
 * layar penuh dipakai. Di browser biasa `screen.orientation.lock()` hanya
 * diizinkan saat fullscreen — kalau ditolak, panggilannya gagal diam-diam dan
 * tata letak tetap mengikuti ukuran viewport apa adanya.
 */
export type ScreenOrientationLock = 'portrait' | 'landscape';

function isNativeShell(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

let requested: ScreenOrientationLock | null = null;

/** Orientasi yang terakhir diminta (untuk tes & debugging). */
export function lastRequestedOrientation(): ScreenOrientationLock | null {
  return requested;
}

export async function requestScreenOrientation(lock: ScreenOrientationLock): Promise<void> {
  if (requested === lock) return;
  requested = lock;
  try {
    if (isNativeShell()) {
      const { ScreenOrientation } = await import('@capacitor/screen-orientation');
      await ScreenOrientation.lock({ orientation: lock });
      return;
    }
    const orientation = (globalThis.screen as Screen | undefined)?.orientation as
      | { lock?: (value: string) => Promise<void> }
      | undefined;
    if (typeof orientation?.lock === 'function') await orientation.lock(lock);
  } catch {
    /* Ditolak (tidak fullscreen, WebView lama, desktop): tata letak tetap jalan. */
  }
}

/** Serahkan orientasi ke sensor perangkat (dipakai saat aplikasi ditutup). */
export async function releaseScreenOrientation(): Promise<void> {
  requested = null;
  try {
    if (isNativeShell()) {
      const { ScreenOrientation } = await import('@capacitor/screen-orientation');
      await ScreenOrientation.unlock();
      return;
    }
    const orientation = (globalThis.screen as Screen | undefined)?.orientation as
      | { unlock?: () => Promise<void> }
      | undefined;
    if (typeof orientation?.unlock === 'function') orientation.unlock();
  } catch {
    /* sama seperti di atas: best-effort */
  }
}
