import { useId, type CSSProperties } from "react";

/* =====================================================================
   OBSTACLE KNIVES — tip at the TOP (y=0), handle at the bottom.
   viewBox 0 0 28 84. The top ~30% sinks into the wheel.
   ===================================================================== */
export const KNIFE_INFO = [
  { name: "Pisau Dapur", desc: "Pisau koki tajam bergagang kayu. Rintangan paling umum — jangan tembak gagangnya!" },
  { name: "Belati", desc: "Belati ksatria dengan pelindung emas dan gagang merah. Lebar pelindungnya bikin celah makin sempit." },
  { name: "Kunai", desc: "Pisau lempar ninja dari baja hitam dengan cincin di ujung gagang." },
] as const;
export const KNIFE_COUNT = KNIFE_INFO.length;

const O = "#1a1020";

export function KnifeArt({ variant = 0, className = "", style }: { variant?: number; className?: string; style?: CSSProperties }) {
  const u = useId().replace(/[^a-zA-Z0-9]/g, "");
  const v = ((variant % KNIFE_COUNT) + KNIFE_COUNT) % KNIFE_COUNT;
  return (
    <svg viewBox="0 0 28 84" className={className} style={style} preserveAspectRatio="xMidYMid meet" overflow="visible">
      <defs>
        <linearGradient id={`${u}st`} x1="0" x2="1">
          <stop offset="0" stopColor="#7d8996" />
          <stop offset=".45" stopColor="#f5f8fb" />
          <stop offset=".6" stopColor="#c7d0d9" />
          <stop offset="1" stopColor="#6b7681" />
        </linearGradient>
        <linearGradient id={`${u}dk`} x1="0" x2="1">
          <stop offset="0" stopColor="#1f2430" />
          <stop offset=".5" stopColor="#5b6475" />
          <stop offset="1" stopColor="#1a1e28" />
        </linearGradient>
        <linearGradient id={`${u}wd`} x1="0" x2="1">
          <stop offset="0" stopColor="#5b2c0f" />
          <stop offset=".45" stopColor="#b8733a" />
          <stop offset="1" stopColor="#4a2208" />
        </linearGradient>
        <linearGradient id={`${u}au`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#fff3b0" />
          <stop offset=".5" stopColor="#f5b82e" />
          <stop offset="1" stopColor="#9a5b00" />
        </linearGradient>
        <linearGradient id={`${u}rd`} x1="0" x2="1">
          <stop offset="0" stopColor="#7f1d1d" />
          <stop offset=".5" stopColor="#ef4444" />
          <stop offset="1" stopColor="#7f1d1d" />
        </linearGradient>
      </defs>

      {v === 0 && (
        <g stroke={O} strokeWidth="1.3" strokeLinejoin="round">
          <path d="M16.5 0.5 L18.6 50 H8.6 Q9 20 16.5 0.5 Z" fill={`url(#${u}st)`} />
          <path d="M16.6 4 L18.2 48" stroke="#ffffff" strokeOpacity=".8" strokeWidth="1" fill="none" />
          <path d="M11 34 Q11.6 22 15 10" stroke="#5b6670" strokeOpacity=".5" strokeWidth=".8" fill="none" />
          <rect x="7.6" y="49.5" width="12" height="5" rx="1.4" fill="#cfd6de" />
          <rect x="8.8" y="54" width="9.6" height="28.5" rx="3.6" fill={`url(#${u}wd)`} />
          {[61, 68.5, 76].map((y) => (
            <circle key={y} cx="13.6" cy={y} r="1.6" fill="#e5e7eb" strokeWidth=".8" />
          ))}
        </g>
      )}

      {v === 1 && (
        <g stroke={O} strokeWidth="1.3" strokeLinejoin="round">
          <path d="M14 0.5 L18.6 11 L18 52 H10 L9.4 11 Z" fill={`url(#${u}st)`} />
          <path d="M14 5 V48" stroke="#5b6670" strokeWidth="1.4" fill="none" />
          <path d="M14.9 6 L15 47" stroke="#ffffff" strokeOpacity=".85" strokeWidth=".8" fill="none" />
          <path d="M3 51.5 Q14 48 25 51.5 L24 57 Q14 54.5 4 57 Z" fill={`url(#${u}au)`} />
          <circle cx="3.4" cy="54.2" r="2.4" fill={`url(#${u}au)`} />
          <circle cx="24.6" cy="54.2" r="2.4" fill={`url(#${u}au)`} />
          <rect x="10.8" y="56" width="6.4" height="20.5" rx="2" fill={`url(#${u}rd)`} />
          <path d="M10.8 60 L17.2 63 M10.8 65 L17.2 68 M10.8 70 L17.2 73" stroke="#3b0606" strokeWidth=".9" fill="none" />
          <circle cx="14" cy="79.5" r="4" fill={`url(#${u}au)`} />
          <circle cx="12.8" cy="78.4" r="1.2" fill="#fff" stroke="none" opacity=".8" />
        </g>
      )}

      {v === 2 && (
        <g stroke={O} strokeWidth="1.3" strokeLinejoin="round">
          <path d="M14 0.5 L20.2 25 L16.2 44.5 H11.8 L7.8 25 Z" fill={`url(#${u}dk)`} />
          <path d="M14 3 V42" stroke="#9aa3b2" strokeWidth="1" fill="none" />
          <path d="M14 3 L19 24" stroke="#ffffff" strokeOpacity=".5" strokeWidth=".8" fill="none" />
          <rect x="11.6" y="44" width="4.8" height="25" rx="1.2" fill="#2a1d14" />
          <path d="M11.6 47 L16.4 50 M11.6 51.5 L16.4 54.5 M11.6 56 L16.4 59 M11.6 60.5 L16.4 63.5 M11.6 65 L16.4 68" stroke="#c9b48a" strokeWidth="1.2" fill="none" />
          <circle cx="14" cy="75.5" r="6.2" fill="none" stroke={O} strokeWidth="4.2" />
          <circle cx="14" cy="75.5" r="6.2" fill="none" stroke={`url(#${u}dk)`} strokeWidth="2.4" />
        </g>
      )}
    </svg>
  );
}
