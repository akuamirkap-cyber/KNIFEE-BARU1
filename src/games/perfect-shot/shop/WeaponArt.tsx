import { useId, type CSSProperties, type ReactNode } from "react";
import { Gun } from "../components/Gun";
import type { Kind, Pal } from "./weapons";

const O = "#14171c"; // outline
const SW = 2.4;

type Props = { kind: Kind; pal: Pal; className?: string; style?: CSSProperties };

export function WeaponArt({ kind, pal, className = "", style }: Props) {
  const raw = useId();
  const u = raw.replace(/[^a-zA-Z0-9]/g, "");
  if (kind === "pistol") {
    return (
      <div className={className} style={style}>
        <Gun className="h-full w-full" />
      </div>
    );
  }

  const g = {
    body: `url(#${u}b)`,
    bodyD: `url(#${u}bd)`,
    metal: `url(#${u}m)`,
    wood: `url(#${u}w)`,
    glow: `url(#${u}g)`,
  };
  const p = { stroke: O, strokeWidth: SW, strokeLinejoin: "round" as const, strokeLinecap: "round" as const };

  const hl = (x: number, y: number, w: number) => (
    <rect x={x} y={y} width={w} height={2.2} rx={1.1} fill="#fff" opacity={0.45} />
  );

  const grip = (x: number, y: number, fill = g.bodyD) => (
    <path d={`M${x} ${y} L${x + 16} ${y} L${x + 11} ${y + 28} L${x - 5} ${y + 25} Z`} fill={fill} {...p} />
  );
  const trigger = (x: number, y: number) => (
    <path d={`M${x} ${y} q 10 0 10 9 q 0 7 -10 7`} fill="none" stroke={O} strokeWidth={2.6} />
  );

  let art: ReactNode = null;
  switch (kind) {
    case "rifle":
      art = (
        <>
          <path d="M6 44 L42 39 L45 55 L12 68 Q5 68 5 61 Z" fill={g.wood} {...p} />
          {grip(58, 52, g.wood)}
          <path d="M76 51 L88 51 Q90 66 99 77 L88 82 Q77 68 76 51 Z" fill={g.wood} {...p} />
          <rect x="40" y="36" width="52" height="17" rx="2" fill={g.metal} {...p} />
          <rect x="91" y="32" width="34" height="6" rx="2" fill={g.bodyD} {...p} />
          <rect x="91" y="38" width="28" height="12" rx="3" fill={g.wood} {...p} />
          <rect x="118" y="40" width="38" height="5.5" rx="1.5" fill={g.bodyD} {...p} />
          <rect x="146" y="32" width="5" height="9" fill={g.bodyD} {...p} />
          <rect x="80" y="30" width="9" height="6" fill={g.bodyD} {...p} />
          {trigger(66, 53)}
          {hl(44, 39, 40)}
          {hl(94, 40, 20)}
        </>
      );
      break;
    case "smg":
      art = (
        <>
          <rect x="38" y="20" width="50" height="8" rx="2" fill={g.bodyD} {...p} />
          {grip(46, 52)}
          <rect x="70" y="52" width="13" height="28" rx="2" fill={g.metal} {...p} />
          <rect x="100" y="33" width="30" height="13" rx="3" fill={g.metal} {...p} />
          <rect x="128" y="35.5" width="16" height="8" rx="2" fill={g.bodyD} {...p} />
          <rect x="30" y="26" width="72" height="27" rx="8" fill={g.body} {...p} />
          <g clipPath={`url(#${u}clip)`}>
            {[0, 1, 2, 3, 4].map((i) => (
              <path key={i} d={`M${40 + i * 14} 26 l10 0 l-12 27 l-10 0 Z`} fill={pal.accent} opacity="0.85" />
            ))}
          </g>
          <rect x="30" y="26" width="72" height="27" rx="8" fill="none" {...p} />
          {trigger(60, 53)}
          {hl(36, 29, 58)}
          <circle cx="92" cy="40" r="3" fill={g.glow} />
        </>
      );
      break;
    case "crossbow":
      art = (
        <>
          <path d="M126 46 Q118 10 98 6" fill="none" stroke={O} strokeWidth="9" strokeLinecap="round" />
          <path d="M126 54 Q118 90 98 94" fill="none" stroke={O} strokeWidth="9" strokeLinecap="round" />
          <path d="M126 46 Q118 10 98 6" fill="none" stroke={pal.body} strokeWidth="5" strokeLinecap="round" />
          <path d="M126 54 Q118 90 98 94" fill="none" stroke={pal.body} strokeWidth="5" strokeLinecap="round" />
          <path d="M98 6 L66 49 L98 94" fill="none" stroke="#e8e2d0" strokeWidth="1.6" />
          <path d="M8 44 L54 44 L60 50 L120 48 L120 56 L58 58 L50 64 L12 66 Q4 64 6 54 Z" fill={g.wood} {...p} />
          {grip(56, 57, g.wood)}
          <rect x="58" y="43" width="92" height="6" rx="2" fill={g.metal} {...p} />
          <line x1="40" y1="45" x2="150" y2="45" stroke="#8b5a2b" strokeWidth="2.5" />
          <path d="M150 41 L160 45 L150 49 Z" fill={pal.accent === "#ffb020" ? "#c9ced6" : pal.accent} {...p} strokeWidth={1.4} />
          <path d="M40 45 l-6 -5 M40 45 l-6 5" stroke="#e74c3c" strokeWidth="2.5" />
          {trigger(66, 58)}
          {hl(14, 47, 34)}
        </>
      );
      break;
    case "plasma":
      art = (
        <>
          {grip(40, 56)}
          <path d="M66 58 L80 58 L80 70 L66 70 Z" fill={g.bodyD} {...p} />
          <path d="M20 42 Q20 26 40 26 L102 26 Q120 26 124 38 L124 50 Q120 60 102 60 L40 60 Q20 60 20 46 Z" fill={g.body} {...p} />
          <rect x="38" y="34" width="58" height="12" rx="6" fill={g.glow} {...p} strokeWidth={1.8} />
          <rect x="38" y="34" width="58" height="12" rx="6" fill={pal.glow} opacity="0.7" filter={`url(#${u}blur)`} />
          <rect x="44" y="37" width="44" height="3" rx="1.5" fill="#fff" opacity="0.8" />
          <rect x="60" y="18" width="30" height="9" rx="3" fill={g.bodyD} {...p} />
          <circle cx="132" cy="43" r="12" fill={g.bodyD} {...p} />
          <circle cx="132" cy="43" r="6" fill={pal.glow} />
          <circle cx="132" cy="43" r="9" fill={pal.glow} opacity="0.5" filter={`url(#${u}blur)`} />
          {trigger(56, 58)}
          {hl(30, 29, 66)}
        </>
      );
      break;
    case "laser":
      art = (
        <>
          <path d="M8 40 L36 38 L40 52 L14 64 Q6 62 6 54 Z" fill={g.bodyD} {...p} />
          {grip(52, 50)}
          <path d="M32 36 L118 32 L142 40 L120 52 L32 52 Z" fill={g.body} {...p} />
          <rect x="48" y="24" width="44" height="9" rx="4.5" fill={g.bodyD} {...p} />
          <circle cx="92" cy="28.5" r="3" fill={pal.glow} />
          <rect x="38" y="41" width="84" height="4" rx="2" fill={pal.glow} />
          <rect x="38" y="40" width="84" height="6" rx="3" fill={pal.glow} opacity="0.6" filter={`url(#${u}blur)`} />
          <rect x="140" y="38" width="16" height="6" rx="2" fill={g.glow} {...p} strokeWidth={1.6} />
          <rect x="142" y="36" width="16" height="10" rx="4" fill={pal.glow} opacity="0.5" filter={`url(#${u}blur)`} />
          {trigger(62, 52)}
          {hl(36, 35, 76)}
        </>
      );
      break;
    case "shotgun":
      art = (
        <>
          <path d="M5 46 L46 41 L48 56 L10 69 Q4 67 4 60 Z" fill={g.wood} {...p} />
          {grip(50, 54, g.wood)}
          <rect x="76" y="37" width="78" height="7" rx="2" fill={g.metal} {...p} />
          <rect x="76" y="44" width="78" height="7" rx="2" fill={g.bodyD} {...p} />
          <rect x="44" y="36" width="34" height="20" rx="3" fill={g.body} {...p} />
          <rect x="88" y="49" width="34" height="11" rx="4" fill={g.wood} {...p} />
          {[94, 100, 106, 112].map((x) => (
            <line key={x} x1={x} y1="51" x2={x} y2="58" stroke={O} strokeWidth="1.2" opacity="0.6" />
          ))}
          {trigger(58, 56)}
          {hl(48, 39, 26)}
          {hl(80, 39, 70)}
        </>
      );
      break;
    case "sniper":
      art = (
        <>
          <path d="M4 44 L46 40 L48 56 L32 56 L22 67 L6 65 Z" fill={g.body} {...p} />
          {grip(52, 52)}
          <rect x="66" y="52" width="10" height="16" rx="2" fill={g.bodyD} {...p} />
          <rect x="44" y="39" width="42" height="14" rx="2" fill={g.metal} {...p} />
          <rect x="84" y="42.5" width="72" height="5.5" rx="1.5" fill={g.bodyD} {...p} />
          <rect x="150" y="40" width="8" height="10" rx="1.5" fill={g.bodyD} {...p} />
          <path d="M122 48 L112 74 M124 48 L134 74" stroke={O} strokeWidth="3" />
          <rect x="50" y="24" width="46" height="11" rx="5.5" fill={g.bodyD} {...p} />
          <rect x="46" y="22" width="8" height="15" rx="3" fill={g.bodyD} {...p} />
          <rect x="92" y="22" width="8" height="15" rx="3" fill={g.bodyD} {...p} />
          <circle cx="99" cy="29.5" r="3.5" fill={pal.glow} />
          <rect x="64" y="34" width="5" height="6" fill={O} />
          <rect x="80" y="34" width="5" height="6" fill={O} />
          {trigger(60, 53)}
          {hl(48, 42, 34)}
          {hl(56, 26, 30)}
        </>
      );
      break;
    case "revolver":
      art = (
        <>
          <path d="M40 50 L60 56 Q54 76 42 86 L26 82 Q36 68 40 50 Z" fill={g.wood} {...p} />
          <rect x="72" y="35" width="66" height="11" rx="2" fill={g.metal} {...p} />
          <rect x="72" y="31" width="62" height="5" rx="2" fill={g.bodyD} {...p} />
          <rect x="132" y="27" width="5" height="6" fill={g.bodyD} {...p} />
          <path d="M38 32 L76 32 L76 56 L48 60 Z" fill={g.body} {...p} />
          <rect x="52" y="35" width="26" height="21" rx="5" fill={g.bodyD} {...p} />
          {[58, 65, 72].map((x) => (
            <line key={x} x1={x} y1="37" x2={x} y2="54" stroke={O} strokeWidth="1.4" opacity="0.7" />
          ))}
          <path d="M38 32 L30 22 L36 20 L44 32 Z" fill={g.bodyD} {...p} />
          <path d="M54 60 q 6 12 16 6" fill="none" stroke={O} strokeWidth="3" />
          {hl(76, 37, 56)}
          <circle cx="36" cy="66" r="2.5" fill={pal.accent} />
        </>
      );
      break;
    case "minigun":
      art = (
        <>
          <rect x="36" y="62" width="32" height="20" rx="3" fill={g.bodyD} {...p} />
          <path d="M68 70 Q90 76 98 60" fill="none" stroke={pal.accent} strokeWidth="5" strokeDasharray="3 2" />
          {[30, 39, 48].map((y, i) => (
            <rect key={y} x="80" y={y} width="76" height="7" rx="2" fill={i === 1 ? g.bodyD : g.metal} {...p} />
          ))}
          <rect x="108" y="26" width="8" height="32" rx="2" fill={g.bodyD} {...p} />
          <rect x="140" y="26" width="8" height="32" rx="2" fill={g.bodyD} {...p} />
          <rect x="26" y="24" width="58" height="38" rx="9" fill={g.body} {...p} />
          <path d="M40 24 Q55 6 70 24" fill="none" stroke={O} strokeWidth="7" />
          <path d="M40 24 Q55 6 70 24" fill="none" stroke={pal.metalD} strokeWidth="3.5" />
          <path d="M26 44 L12 44 L8 60 L18 62 Z" fill={g.bodyD} {...p} />
          <circle cx="56" cy="43" r="8" fill={g.glow} {...p} strokeWidth={1.6} />
          {hl(32, 28, 46)}
        </>
      );
      break;
    case "bazooka":
      art = (
        <>
          {grip(52, 54)}
          {grip(88, 54)}
          <rect x="60" y="22" width="14" height="12" rx="2" fill={g.bodyD} {...p} />
          <rect x="8" y="33" width="134" height="23" rx="11" fill={g.body} {...p} />
          {[28, 104, 124].map((x) => (
            <rect key={x} x={x} y="33" width="7" height="23" fill={pal.accent} opacity="0.9" {...p} strokeWidth={1.5} />
          ))}
          <path d="M140 35 Q156 44.5 140 54 Z" fill={g.glow} {...p} />
          <rect x="4" y="31" width="10" height="27" rx="3" fill={g.bodyD} {...p} />
          {hl(18, 37, 110)}
        </>
      );
      break;
    case "blaster":
      art = (
        <>
          {grip(40, 52)}
          <path d="M44 22 L70 22 L62 30 L46 30 Z" fill={g.bodyD} {...p} />
          <rect x="88" y="37" width="46" height="9" rx="3" fill={g.metal} {...p} />
          <ellipse cx="60" cy="42" rx="34" ry="16" fill={g.body} {...p} />
          {[98, 108, 118].map((x) => (
            <ellipse key={x} cx={x} cy="41.5" rx="4" ry="11" fill={pal.accent} {...p} strokeWidth={1.8} />
          ))}
          <circle cx="140" cy="41.5" r="7.5" fill={g.glow} {...p} strokeWidth={1.8} />
          <circle cx="140" cy="41.5" r="10" fill={pal.glow} opacity="0.5" filter={`url(#${u}blur)`} />
          <circle cx="54" cy="30" r="8" fill={pal.glow} opacity="0.85" {...p} strokeWidth={1.6} />
          <circle cx="51" cy="27" r="2.4" fill="#fff" opacity="0.9" />
          {trigger(52, 54)}
          {hl(34, 36, 40)}
        </>
      );
      break;
    case "launcher":
      art = (
        <>
          <path d="M6 44 L40 42 L42 56 L12 66 Q4 64 5 56 Z" fill={g.wood} {...p} />
          {grip(40, 58)}
          <rect x="70" y="30" width="70" height="24" rx="4" fill={g.body} {...p} />
          <rect x="136" y="27" width="10" height="30" rx="3" fill={g.bodyD} {...p} />
          <rect x="84" y="22" width="18" height="9" rx="2" fill={g.bodyD} {...p} />
          <circle cx="58" cy="50" r="17" fill={g.bodyD} {...p} />
          {[0, 1, 2, 3, 4, 5].map((i) => {
            const a = (i / 6) * Math.PI * 2;
            return <circle key={i} cx={58 + Math.cos(a) * 10} cy={50 + Math.sin(a) * 10} r="3.5" fill={pal.accent} {...p} strokeWidth={1.2} />;
          })}
          <circle cx="58" cy="50" r="3" fill={g.metal} />
          {hl(74, 33, 60)}
        </>
      );
      break;
    case "flamer":
      art = (
        <>
          <rect x="12" y="50" width="40" height="22" rx="11" fill={g.bodyD} {...p} />
          <rect x="24" y="50" width="6" height="22" fill={pal.accent} opacity="0.85" />
          {grip(54, 50)}
          <rect x="40" y="33" width="62" height="17" rx="6" fill={g.body} {...p} />
          <path d="M100 36 L128 32 L140 28 L140 56 L128 52 L100 48 Z" fill={g.metal} {...p} />
          <path d="M140 30 Q160 34 156 42 Q162 48 140 54 Q150 42 140 30 Z" fill="#ff7a1a" />
          <path d="M140 35 Q152 38 150 42 Q154 46 140 50 Q146 42 140 35 Z" fill="#ffe14a" />
          <path d="M138 26 Q164 30 158 42 Q166 50 138 58" fill="#ff7a1a" opacity="0.45" filter={`url(#${u}blur)`} />
          <path d="M52 50 Q40 50 34 56" fill="none" stroke={O} strokeWidth="3" />
          {trigger(66, 50)}
          {hl(46, 36, 50)}
        </>
      );
      break;
  }

  return (
    <svg viewBox="0 0 160 100" className={className} style={style}>
      <defs>
        <linearGradient id={`${u}b`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={pal.body} stopOpacity="1" />
          <stop offset="0.55" stopColor={pal.body} />
          <stop offset="1" stopColor={pal.bodyD} />
        </linearGradient>
        <linearGradient id={`${u}bd`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={pal.bodyD} />
          <stop offset="1" stopColor="#0b0d10" />
        </linearGradient>
        <linearGradient id={`${u}m`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.35" stopColor={pal.metal} />
          <stop offset="1" stopColor={pal.metalD} />
        </linearGradient>
        <linearGradient id={`${u}w`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={pal.wood} />
          <stop offset="1" stopColor={pal.woodD} />
        </linearGradient>
        <radialGradient id={`${u}g`}>
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.5" stopColor={pal.glow} />
          <stop offset="1" stopColor={pal.glow} stopOpacity="0.7" />
        </radialGradient>
        <filter id={`${u}blur`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" />
        </filter>
        <clipPath id={`${u}clip`}>
          <rect x="30" y="26" width="72" height="27" rx="8" />
        </clipPath>
      </defs>
      {art}
    </svg>
  );
}

/** wrapper that orients each weapon diagonally (barrel to upper-right) like the reference */
export function WeaponPose({ kind, pal, size = "card", style }: Props & { size?: "card" | "hero" }) {
  if (kind === "pistol") {
    return (
      <WeaponArt
        kind={kind}
        pal={pal}
        className={size === "hero" ? "h-[88%] aspect-[200/260]" : "h-[92%] aspect-[200/260]"}
        style={{ transform: "rotate(34deg)", ...style }}
      />
    );
  }
  return <WeaponArt kind={kind} pal={pal} className="w-[104%] max-w-none" style={{ transform: "rotate(-28deg)", ...style }} />;
}
