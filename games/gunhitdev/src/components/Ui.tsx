import type { CSSProperties, ReactNode } from "react";

/* ------------------------------- ikon SVG ------------------------------- */
const s = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

export const IconPlay = ({ className = "h-5 w-5" }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden>
    <path d="M7 4.5 20 12 7 19.5z" fill="currentColor" stroke="currentColor" strokeWidth={2} strokeLinejoin="round" />
  </svg>
);
export const IconPause = ({ className = "h-5 w-5" }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden>
    <rect x="6" y="4.5" width="4" height="15" rx="1.4" fill="currentColor" />
    <rect x="14" y="4.5" width="4" height="15" rx="1.4" fill="currentColor" />
  </svg>
);
export const IconBack = ({ className = "h-5 w-5" }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden>
    <path d="M15 5 8 12l7 7" {...s} />
  </svg>
);
export const IconLock = ({ className = "h-5 w-5" }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden>
    <rect x="4.5" y="10" width="15" height="10.5" rx="2.5" fill="currentColor" opacity=".9" />
    <path d="M8 10V7.5a4 4 0 0 1 8 0V10" {...s} />
  </svg>
);
export const IconSound = ({ className = "h-5 w-5" }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden>
    <path d="M4 9.5h3.5L12 5.5v13L7.5 14.5H4z" fill="currentColor" />
    <path d="M15.5 9a4.2 4.2 0 0 1 0 6M18 6.5a7.6 7.6 0 0 1 0 11" {...s} />
  </svg>
);
export const IconMute = ({ className = "h-5 w-5" }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden>
    <path d="M4 9.5h3.5L12 5.5v13L7.5 14.5H4z" fill="currentColor" />
    <path d="m16 9.5 5 5m0-5-5 5" {...s} />
  </svg>
);
export const IconTarget = ({ className = "h-5 w-5" }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden>
    <circle cx="12" cy="12" r="8.2" {...s} />
    <circle cx="12" cy="12" r="3.4" {...s} />
    <path d="M12 1.8v3.4M12 18.8v3.4M1.8 12h3.4M18.8 12h3.4" {...s} />
  </svg>
);
export const IconBolt = ({ className = "h-5 w-5" }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden>
    <path d="M13.5 2 4 13.6h6L9.8 22 20 10.2h-6.4z" fill="currentColor" />
  </svg>
);
export const IconCrown = ({ className = "h-5 w-5" }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden>
    <path d="M3 8.5 7 12l5-7 5 7 4-3.5-2 11H5z" fill="currentColor" />
  </svg>
);
export const IconTrophy = ({ className = "h-5 w-5" }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden>
    <path d="M7 4h10v5a5 5 0 0 1-10 0z" fill="currentColor" />
    <path d="M7 5.5H4.5V8a3.5 3.5 0 0 0 3 3.4M17 5.5h2.5V8a3.5 3.5 0 0 1-3 3.4M9.5 20h5M12 14v6" {...s} />
  </svg>
);
export const IconCoin = ({ className = "h-4 w-4" }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden>
    <circle cx="12" cy="12" r="9" fill="currentColor" />
    <circle cx="12" cy="12" r="5.4" fill="none" stroke="rgba(0,0,0,.35)" strokeWidth="2" />
  </svg>
);
export const IconRefresh = ({ className = "h-5 w-5" }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden>
    <path d="M20 12a8 8 0 1 1-2.6-5.9" {...s} />
    <path d="M20 3.5V9h-5.5" {...s} />
  </svg>
);
export const IconHome = ({ className = "h-5 w-5" }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden>
    <path d="M4 11 12 4l8 7v8.5a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1z" {...s} />
  </svg>
);

/* ------------------------------ komponen UI ------------------------------ */

export function CoinPill({ amount, className = "" }: { amount: number; className?: string }) {
  return (
    <div
      className={`flex items-center gap-2 rounded-full border border-gold/30 bg-black/45 px-3 py-1.5 backdrop-blur-sm ${className}`}
    >
      <IconCoin className="h-4 w-4 text-gold" />
      <span className="font-display text-sm leading-none text-gold tabular-nums">{amount.toLocaleString("id-ID")}</span>
    </div>
  );
}

export function IconBtn({
  children,
  onClick,
  label,
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  label: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`btn-3d grid h-11 w-11 place-items-center rounded-xl border border-white/12 bg-white/6 text-white/80 hover:border-white/25 hover:bg-white/12 hover:text-white ${className}`}
    >
      {children}
    </button>
  );
}

export function ArcadeButton({
  children,
  onClick,
  tone = "gold",
  className = "",
  style,
}: {
  children: ReactNode;
  onClick?: () => void;
  tone?: "gold" | "ghost" | "danger" | "jade";
  className?: string;
  style?: CSSProperties;
}) {
  const tones: Record<string, string> = {
    gold: "text-[#2a1602] bg-[linear-gradient(180deg,#ffe6a3_0%,#ffc247_45%,#f0932b_100%)] border-[#8a4d0d] shadow-[0_6px_0_#8a4d0d,0_14px_28px_-8px_rgba(255,170,50,.65)]",
    jade: "text-[#022019] bg-[linear-gradient(180deg,#9dffe4_0%,#38e8c8_48%,#12a98c_100%)] border-[#0a6b58] shadow-[0_6px_0_#0a6b58,0_14px_28px_-8px_rgba(56,232,200,.55)]",
    danger:
      "text-[#2b0209] bg-[linear-gradient(180deg,#ffb0bd_0%,#ff4d6a_48%,#c81f3d_100%)] border-[#7d0f24] shadow-[0_6px_0_#7d0f24,0_14px_28px_-8px_rgba(255,77,106,.55)]",
    ghost: "text-white/85 bg-white/6 border-white/15 shadow-[0_4px_0_rgba(0,0,0,.45)] hover:bg-white/12",
  };
  return (
    <button
      type="button"
      onClick={onClick}
      style={style}
      className={`btn-3d no-select relative w-full overflow-hidden rounded-2xl border-b-4 px-5 py-3.5 font-display text-base tracking-wide ${tones[tone]} ${className}`}
    >
      <span className="relative z-10 flex items-center justify-center gap-2.5">{children}</span>
      {tone !== "ghost" && (
        <span
          className="pointer-events-none absolute inset-y-0 -left-1/3 z-0 w-1/3 skew-x-[-18deg] bg-white/35 blur-[6px]"
          style={{ animation: "barSweep 3.4s ease-in-out infinite" }}
        />
      )}
    </button>
  );
}

export function StatChip({
  icon,
  label,
  value,
  accent = "#ffc247",
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  accent?: string;
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2">
      <span style={{ color: accent }}>{icon}</span>
      <span className="min-w-0">
        <span className="block text-[10px] uppercase tracking-[0.18em] text-white/40">{label}</span>
        <span className="block truncate font-display text-sm text-white/90">{value}</span>
      </span>
    </div>
  );
}

/* ------------- lingkaran target dekoratif (dipakai di menu) ------------- */
export function DecoRing({
  size = 380,
  speed = 22,
  tint = "#ffc247",
  bolts = 5,
  className = "",
}: {
  size?: number | string;
  speed?: number;
  tint?: string;
  bolts?: number;
  className?: string;
}) {
  const R = 100;
  const teeth = 16;
  return (
    <svg viewBox="-130 -130 260 260" width={size} height={size} className={className} aria-hidden>
      <defs>
        <radialGradient id="dr" cx="50%" cy="35%" r="70%">
          <stop offset="0%" stopColor={tint} stopOpacity=".26" />
          <stop offset="55%" stopColor="#0e1730" stopOpacity=".95" />
          <stop offset="100%" stopColor="#070c18" stopOpacity="1" />
        </radialGradient>
        <linearGradient id="dru" x1="0" y1="-1" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity=".55" />
          <stop offset="50%" stopColor={tint} stopOpacity=".85" />
          <stop offset="100%" stopColor={tint} stopOpacity=".3" />
        </linearGradient>
      </defs>
      <circle r={R * 1.5} fill="none" stroke="#ffffff" strokeOpacity=".05" strokeWidth="1" strokeDasharray="3 12" />
      <circle r={R * 1.24} fill="none" stroke={tint} strokeOpacity=".12" strokeWidth="1.4" strokeDasharray="18 26" />
      <g style={{ animation: `spinSlow ${speed}s linear infinite`, transformOrigin: "center" }}>
        <circle r={R} fill="url(#dr)" stroke="url(#dru)" strokeWidth="4.5" />
        {Array.from({ length: teeth }).map((_, i) => {
          const a = (i / teeth) * Math.PI * 2;
          return (
            <g key={i} transform={`rotate(${(a * 180) / Math.PI})`}>
              <path
                d={`M -4.6 ${-R * 0.88} L 4.6 ${-R * 0.88} L 3 ${-R * 0.99} L -3 ${-R * 0.99} Z`}
                fill={i === 0 ? tint : "#ffffff"}
                opacity={i === 0 ? 0.95 : 0.14}
              />
            </g>
          );
        })}
        <circle r={R * 0.7} fill="none" stroke="#ffffff" strokeOpacity=".08" strokeWidth="1.2" />
        <circle r={R * 0.44} fill="none" stroke={tint} strokeOpacity=".22" strokeWidth="2" strokeDasharray="10 16" />
        {Array.from({ length: bolts }).map((_, i) => {
          const a = ((i + 0.5) / bolts) * Math.PI * 2;
          const x = Math.cos(a) * R;
          const y = Math.sin(a) * R;
          return (
            <g key={i} transform={`translate(${x} ${y}) rotate(${(a * 180) / Math.PI + 90})`}>
              <rect x="-3.4" y="-2" width="6.8" height="20" rx="1.6" fill="#5d678f" />
              <rect x="-6" y="16" width="12" height="5" rx="1.6" fill="#ff4d6a" opacity=".85" />
            </g>
          );
        })}
      </g>
      <circle r={R * 0.16} fill={tint} opacity=".5" />
    </svg>
  );
}
