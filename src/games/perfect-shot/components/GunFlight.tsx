import { useLayoutEffect, useRef } from "react";
import { Gun } from "./Gun";

export type Rect = { x: number; y: number; w: number; h: number };

/**
 * The menu gun itself flies down into its in-game slot.
 * Rendered ABOVE the transition overlay so the gun stays visible the whole time.
 */
export function GunFlight({ from, to, dur }: { from: Rect; to: Rect; dur: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const s = from.h / to.h;
    const dx = from.x + from.w / 2 - (to.x + to.w / 2);
    const dy = from.y - to.y;
    el.animate(
      [
        { transform: `translate(${dx}px, ${dy}px) scale(${s})`, easing: "cubic-bezier(.3,0,.6,1)" },
        { offset: 0.18, transform: `translate(${dx}px, ${dy - 18}px) scale(${s * 1.04}) rotate(-3deg)`, easing: "cubic-bezier(.55,0,.85,.4)" },
        { offset: 0.78, transform: "translate(0, 0) scale(1.06, .9)", easing: "cubic-bezier(.2,.8,.4,1)" },
        { offset: 0.9, transform: "translate(0, -6px) scale(.98, 1.03)" },
        { transform: "none" },
      ],
      { duration: dur, fill: "both" },
    );
  }, [from, to, dur]);
  return (
    <div className="pointer-events-none absolute z-[60]" style={{ left: to.x, top: to.y, width: to.w, height: to.h }}>
      <div ref={ref} className="h-full w-full" style={{ transformOrigin: "50% 0%" }}>
        <Gun className="h-full w-full drop-shadow-[0_10px_14px_rgba(0,0,0,.55)]" />
      </div>
    </div>
  );
}

/** exact rect of the gun slot used by GamePlay (keep in sync with its layout) */
export function gameGunSlot(W: number, H: number): Rect {
  const h = Math.min(H * 0.23, 210);
  const w = (h * 200) / 260;
  return { x: W / 2 - w / 2, y: H * 0.94 - h, w, h };
}
