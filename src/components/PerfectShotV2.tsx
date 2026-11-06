import { useEffect, useRef } from 'react';
import PerfectShotLite, { type LiteHandle } from '../../v2-perfect-shot/src/App';
import { APP_VERSION_LABEL, type AppVersion } from '../appVersion';
import { useAndroidBack } from '../utils/androidBack';

/** Opt-in host for the same Pistol/level-1 lite duplicate shipped in the ZIP. */
export default function PerfectShotV2({ active, version, onPickVersion }: {
  active: boolean;
  version: AppVersion;
  onPickVersion: (v: AppVersion) => void;
}) {
  const liteRef = useRef<LiteHandle>(null);
  useAndroidBack(() => liteRef.current?.back() ?? false, active);
  useEffect(() => {
    if (!active) return;
    // V1's legacy C/P unlock listeners live on window even while its pane sleeps.
    // Intercept only those unsupported shortcuts, without changing V1 or stealing
    // Lite's Space/Escape, native button activation, or volume-slider keys.
    const blockLegacyUnlocks = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey || !/^[cp]$/i.test(event.key)) return;
      event.preventDefault(); event.stopImmediatePropagation();
    };
    window.addEventListener('keydown', blockLegacyUnlocks, true);
    return () => window.removeEventListener('keydown', blockLegacyUnlocks, true);
  }, [active]);
  return (
    <div
      className="absolute inset-0 z-20 overflow-hidden bg-[#05080c]"
      data-app-version-active="v2"
      // Bubble, not capture: real canvas taps must still reach the game.
      onPointerDown={(e) => e.stopPropagation()}
    >
      <PerfectShotLite ref={liteRef} active={active} />
      <nav
        aria-label="Versi game dan unduhan"
        className="absolute right-1 top-1/2 z-50 flex -translate-y-1/2 flex-col gap-1 rounded-2xl border border-white/15 bg-[#081320]/90 p-1 shadow-lg backdrop-blur-sm"
      >
        {(['v1', 'v2'] as const).map((v) => (
          <button key={v} type="button" onClick={() => onPickVersion(v)} aria-pressed={version === v} title={APP_VERSION_LABEL[v]} className="rounded-xl px-2 py-2.5 text-[9px] font-bold leading-none tracking-wider text-slate-300 active:scale-95 aria-pressed:bg-emerald-300 aria-pressed:text-[#082a28]">{v.toUpperCase()}</button>
        ))}
        <a href="./perfect-shot-v2.zip" download title="Unduh Perfect Shot Lite · Pistol + level 1 (.zip)" aria-label="Unduh ZIP v2" className="rounded-xl px-1.5 py-2.5 text-center text-[8px] font-extrabold leading-tight tracking-wide text-amber-200 active:scale-95">ZIP<br />↓</a>
      </nav>
    </div>
  );
}
