import { useEffect, useRef, useState } from 'react';
import { mount, type Mounted } from '../../v2-perfect-shot/src/render/attach';
import { WEAPONS } from '../../v2-perfect-shot/src/weapons';
import { APP_VERSION_LABEL, type AppVersion } from '../appVersion';

/**
 * PERFECT SHOT v2, playable inside the app.
 *
 * A thin host: it owns the canvas, the weapon row, the restart button and the
 * v1/v2 switch — nothing else. Every rule (spin, hits, flight, win/lose) and the
 * whole HUD live in `v2-perfect-shot/src/`, which is the same engine that ships
 * in the downloadable zip. Rendering it here from source means no second copy
 * can drift from the deliverable.
 *
 * This component is only mounted while v2 is the picked version (see App.tsx),
 * so v1 renders alone, exactly as before v2 existed.
 */
export default function PerfectShotV2({
  active,
  version,
  onPickVersion,
}: {
  /** False freezes the loop (tab hidden, or the splash is still up). */
  active: boolean;
  version: AppVersion;
  onPickVersion: (v: AppVersion) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mountedRef = useRef<Mounted | null>(null);
  const weaponRef = useRef<string>(WEAPONS[0].id);
  const [weapon, setWeapon] = useState<string>(WEAPONS[0].id);
  const [ended, setEnded] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const mounted = mount(canvas, {
      weapon: weaponRef.current,
      paused: true, // resumed by the effect below, once `active` is known
      onEnd: () => setEnded(true),
    });
    mountedRef.current = mounted;
    return () => {
      mounted.destroy();
      mountedRef.current = null;
    };
  }, []);

  // Single place that decides whether the loop runs. Pausing rather than
  // unmounting keeps a half-played run intact when you peek at v1 or switch tab.
  useEffect(() => {
    const mounted = mountedRef.current;
    if (!mounted) return;
    if (active) mounted.resume();
    else mounted.pause();
  }, [active]);

  const pick = (id: string) => {
    weaponRef.current = id;
    setWeapon(id);
    mountedRef.current?.game.setWeapon(id);
  };

  const again = () => {
    setEnded(false);
    mountedRef.current?.game.restart(weaponRef.current);
    if (active) mountedRef.current?.resume();
  };

  return (
    <div
      className="absolute inset-0 z-20 overflow-hidden bg-[#070a10]"
      data-app-version-active="v2"
      // v2 owns the pointer while it is up; v1 keeps its run underneath.
      onPointerDownCapture={(e) => e.stopPropagation()}
    >
      <canvas ref={canvasRef} className="block h-full w-full touch-none" />

      {ended && (
        <div className="absolute inset-x-0 bottom-16 flex justify-center">
          <button
            type="button"
            onClick={again}
            className="rounded-full bg-gradient-to-r from-amber-200 to-orange-400 px-7 py-2.5 text-xs font-extrabold tracking-wide text-[#10160f] shadow-lg active:scale-95"
          >
            MAIN LAGI
          </button>
        </div>
      )}

      {/* Weapon row, the zip download, and the v1/v2 switch: all small and kept
          clear of the wheel. */}
      <div className="absolute inset-x-1.5 bottom-1.5 flex flex-wrap items-center justify-center gap-1">
        {WEAPONS.map((w) => (
          <button
            key={w.id}
            type="button"
            onClick={() => pick(w.id)}
            aria-pressed={weapon === w.id}
            className="rounded-full border border-white/20 bg-white/[0.07] px-2.5 py-1 text-[10px] tracking-wide text-sky-100 active:scale-95 aria-pressed:border-white/60 aria-pressed:bg-white/20"
          >
            {w.name}
          </button>
        ))}
        <a
          href="./perfect-shot-v2.zip"
          download
          title="Unduh Perfect Shot v2 (.zip)"
          className="rounded-full border border-amber-300/40 bg-amber-300/10 px-2.5 py-1 text-[10px] font-semibold tracking-wide text-amber-200 active:scale-95"
        >
          ⬇ ZIP v2
        </a>
      </div>

      <div className="absolute right-1 top-1/2 z-10 flex -translate-y-1/2 flex-col gap-1 rounded-full border border-white/15 bg-black/45 p-1 backdrop-blur-sm">
        {(['v1', 'v2'] as const).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => onPickVersion(v)}
            aria-pressed={version === v}
            title={APP_VERSION_LABEL[v]}
            className="rounded-full px-2.5 py-2 text-[10px] font-bold leading-none tracking-wider text-slate-300 aria-pressed:bg-sky-400 aria-pressed:text-[#06202c]"
          >
            {v.toUpperCase()}
          </button>
        ))}
      </div>
    </div>
  );
}
