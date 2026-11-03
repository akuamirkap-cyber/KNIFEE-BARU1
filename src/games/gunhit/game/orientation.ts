/**
 * MODE TAMPILAN Game A: POTRET (bawaan) atau LANDSCAPE.
 *
 * Satu sumber kebenaran kecil, mengikuti pola `gameSpeed.ts` /
 * `backgroundThemes.ts`: nilai disimpan di `gunhit_orientation`, ada
 * `subscribe…` supaya Panel Pengaturan, pengaturan dalam game, engine, dan
 * shell aplikasi bergerak bersamaan tanpa harus saling meng-props.
 *
 * Landscape berarti dunia 420×760 diputar seperempat putaran saat digambar
 * (`layout.ts` → `baseViewTransform`): senjata pindah ke tepi kiri dan menembak
 * ke kanan, roda/musuh pindah ke tepi kanan. Ukuran bingkai yang terlihat ikut
 * berubah (760×420), dan shell aplikasi membacanya lewat `getActiveShellFrame`.
 */
import { storage } from './safeStorage';
import { LANDSCAPE_VIEW, PORTRAIT_VIEW } from './layout';

export type SgaOrientation = 'portrait' | 'landscape';

export const SGA_ORIENTATION_STORAGE_KEY = 'gunhit_orientation';
export const DEFAULT_SGA_ORIENTATION: SgaOrientation = 'portrait';

export interface SgaOrientationOption {
  id: SgaOrientation;
  icon: string;
  label: string;
  desc: string;
}

export const SGA_ORIENTATION_OPTIONS: readonly SgaOrientationOption[] = [
  {
    id: 'portrait',
    icon: '📱',
    label: 'POTRET',
    desc: 'Klasik SGA: senjata di bawah, menembak naik ke roda di atas',
  },
  {
    id: 'landscape',
    icon: '🎮',
    label: 'LANDSCAPE',
    desc: 'Senjata di kiri menembak ke kanan, musuh & roda di kanan',
  },
];

type OrientationListener = (orientation: SgaOrientation) => void;
const listeners = new Set<OrientationListener>();

export function normalizeSgaOrientation(
  value: unknown,
  fallback: SgaOrientation = DEFAULT_SGA_ORIENTATION,
): SgaOrientation {
  return value === 'landscape' || value === 'portrait' ? value : fallback;
}

export function getSavedSgaOrientation(): SgaOrientation {
  return normalizeSgaOrientation(storage.getItem(SGA_ORIENTATION_STORAGE_KEY), DEFAULT_SGA_ORIENTATION);
}

export function setSavedSgaOrientation(next: unknown): SgaOrientation {
  const normalized = normalizeSgaOrientation(next, DEFAULT_SGA_ORIENTATION);
  storage.setItem(SGA_ORIENTATION_STORAGE_KEY, normalized);
  for (const listener of listeners) listener(normalized);
  return normalized;
}

export function subscribeSgaOrientation(listener: OrientationListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Ukuran bingkai shell (CSS px) untuk satu pilihan orientasi. */
export interface ShellFrame {
  width: number;
  height: number;
}

export const PORTRAIT_FRAME: ShellFrame = { width: PORTRAIT_VIEW.w, height: PORTRAIT_VIEW.h };
export const LANDSCAPE_FRAME: ShellFrame = { width: LANDSCAPE_VIEW.w, height: LANDSCAPE_VIEW.h };

export function frameForOrientation(orientation: SgaOrientation): ShellFrame {
  return orientation === 'landscape' ? LANDSCAPE_FRAME : PORTRAIT_FRAME;
}

/**
 * Bingkai yang sedang dipakai layar permainan.
 *
 * Shell aplikasi (`src/App.tsx`) selalu menampung 420×760 — menu, arsenal, peta
 * stage dan layar hasil semuanya dirancang potret. Hanya permainan yang sedang
 * berjalan yang boleh meminta bingkai landscape, jadi Game A menerbitkan
 * bingkainya sendiri dan shell mengikutinya.
 */
type ShellFrameListener = (frame: ShellFrame) => void;
const frameListeners = new Set<ShellFrameListener>();
let activeFrame: ShellFrame = PORTRAIT_FRAME;

export function getActiveShellFrame(): ShellFrame {
  return activeFrame;
}

export function setActiveShellFrame(frame: ShellFrame): void {
  if (frame.width === activeFrame.width && frame.height === activeFrame.height) return;
  activeFrame = frame;
  for (const listener of frameListeners) listener(frame);
}

export function subscribeActiveShellFrame(listener: ShellFrameListener): () => void {
  frameListeners.add(listener);
  return () => {
    frameListeners.delete(listener);
  };
}
