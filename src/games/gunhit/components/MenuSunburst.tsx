import type { CSSProperties } from "react";

/**
 * The menu's showroom burst.
 *
 * `SunburstFX` (shared with the gameplay effects) masks its conic rays into a
 * narrow ring, so at menu scale it reads as a soft haze instead of the crisp
 * fan of light behind the showcased weapon. This is the same idea with a menu
 * grade: sharp white-blue wedges that reach most of the way across the frame, a
 * bright core and a couple of twinkling stars.
 */
export default function MenuSunburst({
  size = 720,
  tint = "212, 240, 255",
  spin = 26,
  className = "",
  style,
}: {
  size?: number;
  /** rgb triplet, no alpha */
  tint?: string;
  /** seconds per full rotation */
  spin?: number;
  className?: string;
  style?: CSSProperties;
}) {
  const rays =
    `repeating-conic-gradient(from 0deg at 50% 50%,` +
    ` rgba(${tint},.30) 0deg 2.8deg,` +
    ` rgba(${tint},.11) 2.8deg 4.4deg,` +
    ` transparent 4.4deg 12deg)`;
  const wide =
    `repeating-conic-gradient(from 7.5deg at 50% 50%,` +
    ` rgba(${tint},.14) 0deg 7deg,` +
    ` transparent 7deg 30deg)`;
  const mask =
    "radial-gradient(circle, rgba(0,0,0,0) 3%, #000 15%, #000 36%, rgba(0,0,0,.45) 50%, transparent 64%)";

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute select-none ${className}`}
      style={{ width: size, height: size, left: "50%", top: "50%", marginLeft: -size / 2, marginTop: -size / 2, ...style }}
    >
      {/* soft ambient halo */}
      <div
        className="sunburst-halo"
        style={{ width: size, height: size, background: `radial-gradient(circle, rgba(${tint},.18) 0%, rgba(${tint},.09) 34%, transparent 64%)` }}
      />
      {/* the fan itself: fine wedges + a wider, slower set for depth */}
      <div
        className="sunburst-rays"
        style={{ width: size * 1.5, height: size * 1.5, background: rays, WebkitMaskImage: mask, maskImage: mask, animationDuration: `${spin}s`, filter: "blur(1px)" }}
      />
      <div
        className="sunburst-rays"
        style={{ width: size * 1.5, height: size * 1.5, background: wide, WebkitMaskImage: mask, maskImage: mask, animationDuration: `${spin * 3}s`, animationDirection: "reverse", opacity: 0.7, filter: "blur(2px)" }}
      />
      {/* hot centre */}
      <div
        className="sunburst-glow"
        style={{ width: size * 0.4, height: size * 0.4, background: `radial-gradient(circle, rgba(255,255,255,.8) 0%, rgba(${tint},.55) 22%, rgba(${tint},.2) 46%, transparent 68%)` }}
      />
      <div
        className="sunburst-hot"
        style={{ width: size * 0.26, height: size * 0.26, background: `radial-gradient(circle, #ffffff 0%, rgba(255,255,255,.85) 26%, rgba(${tint},.45) 52%, transparent 74%)` }}
      />
      {/* twinkles riding on the light */}
      {[
        { l: 62, t: 30, s: 3, d: 0 },
        { l: 34, t: 62, s: 2, d: 0.6 },
        { l: 72, t: 68, s: 2.5, d: 1.2 },
        { l: 26, t: 26, s: 2, d: 1.8 },
        { l: 56, t: 12, s: 1.6, d: 2.3 },
      ].map((st, i) => (
        <span
          key={i}
          className="star-dot-fx"
          style={{ left: `${st.l}%`, top: `${st.t}%`, width: st.s * 2, height: st.s * 2, background: "#fff", boxShadow: `0 0 8px rgba(${tint},.95)`, animationDelay: `${st.d}s` }}
        />
      ))}
    </div>
  );
}
