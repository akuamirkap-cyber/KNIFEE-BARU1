import type { CSSProperties } from 'react';
import type { SgaBackgroundTheme } from '../game/backgroundThemes';

export type MenuEnvironmentTheme = SgaBackgroundTheme;

const SNOWFLAKES = Array.from({ length: 28 }, (_, index) => ({
  left: `${(index * 37 + 9) % 100}%`,
  top: `${(index * 53 + 5) % 86}%`,
  size: 2 + (index % 4),
  delay: `${(index % 7) * -0.6}s`,
}));

const STARS = Array.from({ length: 34 }, (_, index) => ({
  left: `${(index * 29 + 7) % 98}%`,
  top: `${(index * 43 + 4) % 78}%`,
  size: 1.5 + (index % 3),
  delay: `${(index % 6) * -0.5}s`,
}));

const TOWN_BUILDINGS = [
  { left: '0%', width: '15%', height: '22%' },
  { left: '12%', width: '13%', height: '35%' },
  { left: '25%', width: '14%', height: '26%' },
  { left: '39%', width: '12%', height: '43%' },
  { left: '51%', width: '15%', height: '29%' },
  { left: '66%', width: '12%', height: '38%' },
  { left: '78%', width: '13%', height: '25%' },
  { left: '90%', width: '14%', height: '34%' },
];

export default function MenuEnvironment({ theme }: { theme: MenuEnvironmentTheme }) {
  if (theme === 'forest' || theme === 'auto') return null;

  if (theme === 'morning') {
    return (
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true" data-menu-environment="morning">
        <div className="absolute inset-0 bg-gradient-to-b from-[#ffd891]/75 via-[#ffc66e]/42 to-[#ffdf9b]/[.18]" />
        <div className="absolute right-[14%] top-[18%] h-24 w-24 rounded-full bg-amber-200/65 blur-2xl" />
        <div className="absolute right-[22%] top-[22%] h-10 w-10 rounded-full bg-yellow-100/55 blur-[2px]" />
        <div className="absolute inset-x-0 top-[34%] h-[20%] bg-gradient-to-b from-amber-100/[.08] to-transparent" />
      </div>
    );
  }

  if (theme === 'town') {
    return (
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true" data-menu-environment="town">
        <div className="absolute inset-0 bg-gradient-to-b from-[#f7ae68]/60 via-[#bb8b72]/40 to-[#13252d]/55" />
        <div className="absolute right-[16%] top-[17%] h-20 w-20 rounded-full bg-orange-200/25 blur-2xl" />
        <div className="absolute inset-x-0 bottom-0 h-[46%] opacity-85">
          {TOWN_BUILDINGS.map((building, index) => (
            <div
              key={index}
              className="absolute bottom-0 border-x border-t border-slate-300/10 bg-gradient-to-b from-[#243a48]/95 to-[#101e28]"
              style={{ ...building, backgroundImage: 'linear-gradient(180deg,rgba(49,68,79,.96),rgba(15,28,39,.99)), repeating-linear-gradient(90deg,transparent 0 13px,rgba(251,191,36,.22) 13px 16px,transparent 16px 25px)', clipPath: index % 3 === 0 ? 'polygon(0 12%, 30% 12%, 30% 0, 70% 0, 70% 12%, 100% 12%, 100% 100%, 0 100%)' : undefined } as CSSProperties}
            />
          ))}
          <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-[#07151b] to-transparent" />
        </div>
      </div>
    );
  }

  if (theme === 'snow') {
    return (
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true" data-menu-environment="snow">
        <div className="absolute inset-0 bg-gradient-to-b from-[#c9edff]/70 via-[#8ec9e5]/50 to-[#d9f4ff]/40" />
        <div className="absolute right-[15%] top-[17%] h-20 w-20 rounded-full bg-white/30 blur-2xl" />
        {SNOWFLAKES.map((flake, index) => (
          <span
            key={index}
            className="absolute rounded-full bg-white shadow-[0_0_8px_rgba(220,245,255,.85)] animate-pulse"
            style={{ left: flake.left, top: flake.top, width: flake.size, height: flake.size, animationDelay: flake.delay, opacity: 0.62 + (index % 4) * 0.08 }}
          />
        ))}
        <div className="absolute inset-x-0 bottom-0 h-[17%] rounded-[50%_50%_0_0] bg-gradient-to-t from-[#e7f8ff]/20 to-[#f5fcff]/[.06]" />
      </div>
    );
  }

  if (theme === 'skyline') {
    return (
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true" data-menu-environment="skyline">
        <div className="absolute inset-0 bg-gradient-to-b from-[#04010f]/95 via-[#12062e]/90 to-[#4a1747]/90" />
        <div className="absolute inset-x-0 bottom-0 h-44 bg-[radial-gradient(ellipse_at_50%_100%,rgba(255,120,160,.28),transparent_70%)]" />
        {STARS.map((st, idx) => (
          <span
            key={idx}
            className="absolute rounded-full bg-fuchsia-100 animate-pulse"
            style={{ left: st.left, top: st.top, width: st.size, height: st.size, animationDelay: st.delay, opacity: 0.65 }}
          />
        ))}
        <div className="absolute inset-x-0 bottom-0 h-[28%] opacity-90">
          {TOWN_BUILDINGS.map((b, idx) => (
            <div
              key={idx}
              className="absolute bottom-0 bg-[#0b0420]"
              style={{ ...b, backgroundImage: 'repeating-linear-gradient(90deg,transparent 0 9px,rgba(255,210,120,.38) 9px 12px,transparent 12px 19px)' } as CSSProperties}
            />
          ))}
        </div>
      </div>
    );
  }

  if (theme === 'battlefield') {
    return (
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true" data-menu-environment="battlefield">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0814]/95 via-[#2e211b]/88 to-[#6e3512]/88" />
        <div className="absolute inset-x-0 bottom-0 h-56 bg-[radial-gradient(ellipse_at_50%_100%,rgba(255,130,35,.38),transparent_70%)]" />
        <div className="absolute left-[18%] bottom-0 h-full w-16 -rotate-12 bg-gradient-to-t from-amber-100/15 to-transparent" />
        <div className="absolute right-[18%] bottom-0 h-full w-16 rotate-12 bg-gradient-to-t from-amber-100/15 to-transparent" />
      </div>
    );
  }

  if (theme === 'mystic') {
    return (
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true" data-menu-environment="mystic">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0b1428]/95 via-[#080d1c]/92 to-[#05070f]/95" />
        <div className="absolute left-1/2 top-[44%] h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-cyan-300/20" />
        <div className="absolute left-1/2 top-[44%] h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-amber-200/15" />
        <div className="absolute inset-x-0 bottom-0 h-44 bg-[radial-gradient(ellipse_at_50%_100%,rgba(255,208,86,.22),transparent_70%)]" />
      </div>
    );
  }

  if (theme === 'crystal') {
    return (
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true" data-menu-environment="crystal">
        <div className="absolute inset-0 bg-gradient-to-b from-[#071833]/92 via-[#0f3460]/85 to-[#164e78]/88" />
        <div className="absolute -left-16 top-0 h-full w-44 rotate-12 bg-gradient-to-b from-cyan-200/18 via-sky-300/10 to-transparent blur-md" />
        {STARS.slice(0, 22).map((st, idx) => (
          <span
            key={idx}
            className="absolute rounded-full bg-cyan-100 shadow-[0_0_8px_#67e8f9] animate-pulse"
            style={{ left: st.left, top: st.top, width: st.size, height: st.size, animationDelay: st.delay }}
          />
        ))}
      </div>
    );
  }

  if (theme === 'yoyo_neon') {
    return (
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true" data-menu-environment="yoyo_neon">
        <div className="absolute inset-0 bg-gradient-to-b from-[#1a062b]/92 via-[#230e48]/88 to-[#4c1238]/90" />
        <div className="absolute left-[18%] top-[24%] h-28 w-28 rounded-full bg-fuchsia-400/25 blur-2xl" />
        <div className="absolute right-[14%] top-[38%] h-32 w-32 rounded-full bg-cyan-400/20 blur-2xl" />
        <div className="absolute left-[38%] bottom-[20%] h-28 w-28 rounded-full bg-amber-300/20 blur-2xl" />
      </div>
    );
  }

  if (theme === 'royal_vault') {
    return (
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true" data-menu-environment="royal_vault">
        <div className="absolute inset-0 bg-gradient-to-b from-[#1e0f3b]/95 via-[#2a1452]/92 to-[#0c0518]/96" />
        <div className="absolute left-1/2 top-[38%] h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-purple-400/20 blur-3xl" />
        <div className="absolute left-[22%] top-0 h-[75%] w-12 rotate-6 bg-gradient-to-b from-purple-200/12 to-transparent" />
        <div className="absolute right-[22%] top-0 h-[75%] w-12 -rotate-6 bg-gradient-to-b from-purple-200/12 to-transparent" />
      </div>
    );
  }

  if (theme === 'cyber_grid') {
    return (
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true" data-menu-environment="cyber_grid">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0b1020]/96 via-[#121a2e]/94 to-[#070a13]/98" />
        <div className="absolute left-1/2 top-[40%] h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-sky-400/20 blur-3xl" />
        <div
          className="absolute inset-x-0 bottom-0 h-28 border-t border-sky-300/35"
          style={{
            backgroundImage:
              'linear-gradient(180deg, rgba(56,189,248,.16), rgba(10,14,24,.95)), repeating-linear-gradient(90deg, rgba(120,180,255,.22) 0 1px, transparent 1px 28px)',
          }}
        />
      </div>
    );
  }

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true" data-menu-environment="nebula">
      <div className="absolute inset-0 bg-gradient-to-b from-[#1f1740]/95 via-[#141233]/93 to-[#07080f]/97" />
      <div className="absolute left-[20%] top-[26%] h-40 w-40 rounded-full bg-indigo-400/20 blur-3xl" />
      <div className="absolute right-[16%] top-[48%] h-44 w-44 rounded-full bg-violet-500/20 blur-3xl" />
      {STARS.map((st, idx) => (
        <span
          key={idx}
          className="absolute rounded-full bg-indigo-100 animate-pulse"
          style={{ left: st.left, top: st.top, width: st.size, height: st.size, animationDelay: st.delay, opacity: 0.7 }}
        />
      ))}
    </div>
  );
}
