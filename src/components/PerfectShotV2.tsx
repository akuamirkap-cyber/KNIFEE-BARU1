import { useEffect, useRef } from 'react';
import { createArcade, type Arcade } from '../../v2-perfect-shot/src/ui/arcade';
import { APP_VERSION_LABEL, type AppVersion } from '../appVersion';
import { useAndroidBack } from '../utils/androidBack';

/**
 * Additive v2 host. The complete UI, engine, artwork, audio and save live in the
 * standalone folder: the in-app game cannot drift from the downloadable ZIP.
 * Only mounted while V2 is selected; none of v1's game files are changed.
 */
export default function PerfectShotV2({ active, version, onPickVersion }: {
  active: boolean;
  version: AppVersion;
  onPickVersion: (v: AppVersion) => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const arcadeRef = useRef<Arcade | null>(null);
  const initialActive = useRef(active);

  useEffect(() => {
    if (!rootRef.current) return;
    const arcade = createArcade(rootRef.current, { active: initialActive.current });
    arcadeRef.current = arcade;
    return () => { arcade.destroy(); arcadeRef.current = null; };
  }, []);
  useEffect(() => { arcadeRef.current?.setActive(active); }, [active]);
  useAndroidBack(() => arcadeRef.current?.back() ?? false, active);

  return (
    <div
      className="absolute inset-0 z-20 overflow-hidden bg-[#070e1b]"
      data-app-version-active="v2"
      // Bubble, not capture: a capture stop would prevent the native canvas
      // listener from ever receiving a real tap/click.
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div ref={rootRef} className="h-full w-full" />
      <nav
        aria-label="Versi game dan unduhan"
        className="absolute right-1 top-1/2 z-10 flex -translate-y-1/2 flex-col gap-1 rounded-2xl border border-white/15 bg-[#081320]/90 p-1 shadow-lg backdrop-blur-sm"
      >
        {(['v1', 'v2'] as const).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => onPickVersion(v)}
            aria-pressed={version === v}
            title={APP_VERSION_LABEL[v]}
            className="rounded-xl px-2 py-2.5 text-[9px] font-bold leading-none tracking-wider text-slate-300 active:scale-95 aria-pressed:bg-emerald-300 aria-pressed:text-[#082a28]"
          >
            {v.toUpperCase()}
          </button>
        ))}
        <a
          href="./perfect-shot-v2.zip"
          download
          title="Unduh Perfect Shot v2 lengkap (.zip)"
          aria-label="Unduh ZIP v2"
          className="rounded-xl px-1.5 py-2.5 text-center text-[8px] font-extrabold leading-tight tracking-wide text-amber-200 active:scale-95"
        >
          ZIP<br />↓
        </a>
      </nav>
    </div>
  );
}
