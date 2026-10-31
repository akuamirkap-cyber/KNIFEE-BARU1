import type { CSSProperties, MouseEvent } from "react";
import { Background } from "./Background";

type Props = { leaving: boolean; onStart: (e: MouseEvent<HTMLElement>) => void };

export function Splash({ leaving, onStart }: Props) {
  return (
    <button
      onClick={onStart}
      className={`absolute inset-0 block h-full w-full cursor-pointer overflow-hidden text-left ${leaving ? "pointer-events-none" : ""}`}
    >
      <Background leaving={leaving} />
      <div className="absolute inset-0 bg-black/45" />

      <div className="relative flex h-full flex-col items-center justify-center gap-10">
        <div
          className={`a ${leaving ? "out-blast" : "in-slam"} text-center`}
          style={{ "--d": leaving ? "0ms" : "300ms", "--dur": "600ms" } as CSSProperties}
        >
          <div
            className="font-title text-6xl leading-none text-[#3fdc72]"
            style={{ textShadow: "0 3px 0 #1d8a42, 0 6px 0 #0f5427, 0 12px 18px rgba(0,0,0,.6)" }}
          >
            PERFECT
          </div>
          <div
            className="font-title text-7xl leading-none text-[#ffd23f]"
            style={{ textShadow: "0 3px 0 #e0901a, 0 6px 0 #9c5a10, 0 12px 18px rgba(0,0,0,.6)" }}
          >
            SHOT
          </div>
        </div>

        <div
          className={`a ${leaving ? "out-spin" : "in-gun"}`}
          style={{ "--d": leaving ? "0ms" : "600ms" } as CSSProperties}
        >
          <svg viewBox="0 0 100 100" className="spin-slow h-28 w-28 drop-shadow-[0_0_12px_rgba(63,220,114,.6)]">
            <circle cx="50" cy="50" r="38" fill="none" stroke="#3fdc72" strokeWidth="3" />
            <circle cx="50" cy="50" r="22" fill="none" stroke="#3fdc72" strokeWidth="1.5" opacity="0.6" strokeDasharray="4 4" />
            <path d="M50 4 V30 M50 70 V96 M4 50 H30 M70 50 H96" stroke="#ffd23f" strokeWidth="3.5" strokeLinecap="round" />
            <circle cx="50" cy="50" r="3.5" fill="#ff5a3d" />
          </svg>
        </div>

        <div
          className={`a ${leaving ? "out-fade" : "in-up"} flex flex-col items-center gap-3`}
          style={{ "--d": leaving ? "0ms" : "900ms" } as CSSProperties}
        >
          <span className="font-title animate-pulse text-2xl tracking-[0.3em] text-white drop-shadow-[0_2px_0_rgba(0,0,0,.6)]">
            TAP TO START
          </span>
          <span className="font-ui text-sm tracking-wider text-white/55">🎧 Best experienced with sound</span>
        </div>
      </div>
    </button>
  );
}
