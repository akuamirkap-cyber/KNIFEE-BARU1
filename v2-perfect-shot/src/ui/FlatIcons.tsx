import { useId, type CSSProperties } from "react";

/* =====================================================================
   FLAT ICON LIBRARY — single colour silhouettes, details cut out as gaps.
   viewBox 0 0 64 64.
     m = filled body
     a = filled inner part separated from the body by a thin gap
     d = cut line (width w)
     s = thick stroke (width w)
   ===================================================================== */
type L = { k: "m" | "a" | "d" | "s"; p: string; w?: number; eo?: boolean };

const C = (cx: number, cy: number, r: number) => `M${cx - r} ${cy} a${r} ${r} 0 1 0 ${2 * r} 0 a${r} ${r} 0 1 0 ${-2 * r} 0 Z`;
const R = (x: number, y: number, w: number, h: number, r: number) =>
  `M${x + r} ${y} H${x + w - r} Q${x + w} ${y} ${x + w} ${y + r} V${y + h - r} Q${x + w} ${y + h} ${x + w - r} ${y + h} H${x + r} Q${x} ${y + h} ${x} ${y + h - r} V${y + r} Q${x} ${y} ${x + r} ${y} Z`;
const DOT = (x: number, y: number) => `M${x} ${y} L${x} ${y + 0.01}`;
const STAR = (cx: number, cy: number, ro: number, ri: number) => {
  const p: string[] = [];
  for (let i = 0; i < 10; i++) {
    const a = (i * Math.PI) / 5 - Math.PI / 2;
    const r = i % 2 ? ri : ro;
    p.push(`${(cx + Math.cos(a) * r).toFixed(2)} ${(cy + Math.sin(a) * r).toFixed(2)}`);
  }
  return `M${p.join(" L")} Z`;
};
const SPARK = (cx: number, cy: number, r: number) =>
  `M${cx} ${cy - r} C${cx + r * 0.12} ${cy - r * 0.3} ${cx + r * 0.3} ${cy - r * 0.12} ${cx + r} ${cy} C${cx + r * 0.3} ${cy + r * 0.12} ${cx + r * 0.12} ${cy + r * 0.3} ${cx} ${cy + r} C${cx - r * 0.12} ${cy + r * 0.3} ${cx - r * 0.3} ${cy + r * 0.12} ${cx - r} ${cy} C${cx - r * 0.3} ${cy - r * 0.12} ${cx - r * 0.12} ${cy - r * 0.3} ${cx} ${cy - r} Z`;

export const FLAT = {
  lock: [
    { k: "s", p: "M22 29 V21 a10 10 0 0 1 20 0 V29", w: 6 },
    { k: "m", p: R(13, 27, 38, 29, 6) },
    { k: "d", p: DOT(32, 39), w: 7 },
    { k: "d", p: "M32 41 V48", w: 3.4 },
  ],
  check: [{ k: "s", p: "M13 33 L27 47 L51 19", w: 9 }],
  star: [{ k: "m", p: STAR(32, 33, 28, 12.5) }],
  crown: [
    { k: "m", p: "M7 19 L20 32 L32 10 L44 32 L57 19 L51 50 H13 Z" },
    { k: "d", p: "M14 42 H50", w: 3 },
  ],
  shield: [
    { k: "m", p: "M32 4 L56 12 V30 C56 45 46 54 32 60 C18 54 8 45 8 30 V12 Z" },
    { k: "a", p: "M32 13 L47 18 V30 C47 40 41 47 32 51 Z" },
  ],
  target: [
    { k: "m", p: C(32, 32, 28) },
    { k: "d", p: `${C(32, 32, 19)} ${C(32, 32, 10)}`, w: 3.4 },
    { k: "d", p: DOT(32, 32), w: 6 },
  ],
  pin: [{ k: "m", eo: true, p: `M32 3 C20 3 11 12 11 24 C11 40 32 61 32 61 C32 61 53 40 53 24 C53 12 44 3 32 3 Z ${C(32, 24, 8.5)}` }],
  replay: [
    { k: "s", p: "M45.8 20.4 A18 18 0 1 0 48.9 38.2", w: 7 },
    { k: "m", p: "M54 29.5 L36.5 24.5 L50.8 11.5 Z" },
  ],
  play: [{ k: "m", p: "M19 12.5 Q19 7.5 23.5 10 L52 28.5 Q56 32 52 35.5 L23.5 54 Q19 56.5 19 51.5 Z" }],
  info: [
    { k: "m", p: C(32, 32, 28) },
    { k: "d", p: DOT(32, 19), w: 8 },
    { k: "d", p: "M32 28 V47", w: 7 },
  ],
  coinbag: [
    { k: "m", p: "M23 13 H41 L37 20 C49 24 57 34 57 44 C57 54 47 59 32 59 C17 59 7 54 7 44 C7 34 15 24 27 20 Z" },
    { k: "d", p: "M24 20.5 H40", w: 3 },
    { k: "d", p: "M37.5 34 C34 31 26 31 26 36 C26 41 38.5 39 38.5 45 C38.5 50.5 30 50.5 26.5 47 M32 28 V53", w: 3.2 },
  ],
  trophy: [
    { k: "s", p: "M21 15 H14 Q11 15 11 18.5 Q11 27 21.5 29 M43 15 H50 Q53 15 53 18.5 Q53 27 42.5 29", w: 4.5 },
    { k: "m", p: "M19 8 H45 V24 Q45 37 32 39 Q19 37 19 24 Z" },
    { k: "m", p: "M28.5 38 H35.5 V46 H28.5 Z" },
    { k: "m", p: R(17, 46, 30, 10, 3) },
    { k: "a", p: STAR(32, 22, 7, 3.2) },
  ],
  gift: [
    { k: "m", p: "M11.5 29 H52.5 V54 Q52.5 57 49.5 57 H14.5 Q11.5 57 11.5 54 Z" },
    { k: "m", p: R(6.5, 20.5, 51, 10, 3) },
    { k: "d", p: "M32 21 V57", w: 3 },
    { k: "m", p: "M32 20.5 C25 6 13 9 18 17 C20.5 20.5 27 20.5 32 20.5 Z M32 20.5 C39 6 51 9 46 17 C43.5 20.5 37 20.5 32 20.5 Z" },
  ],
  gun: [
    { k: "m", p: "M14 30 H31 L27 53.5 Q26.4 57 23 57 H13.4 Q9.6 57 10.4 53.2 Z" },
    { k: "m", p: "M10 17 H50 L57 21.5 V30.5 H10 Q6.5 30.5 6.5 27 V20.5 Q6.5 17 10 17 Z" },
    { k: "s", p: "M31 31 V37.5 Q31 42 35.5 42 H38.5 Q42.5 42 42.5 37.5 V31", w: 4 },
    { k: "d", p: "M37 20.5 V27 M41 20.5 V27 M45 20.5 V27", w: 2.2 },
  ],
} satisfies Record<string, L[]>;

export type FlatName = keyof typeof FLAT;

type Props = { name: FlatName; color?: string; className?: string; style?: CSSProperties; title?: string; at?: { x: number; y: number; size: number } };

/** single-colour icon; inner details are real gaps (mask) */
export function Ico({ name, color = "currentColor", className = "h-5 w-5", style, title, at }: Props) {
  const u = useId().replace(/[^a-zA-Z0-9]/g, "");
  const layers = FLAT[name] as L[];
  return (
    <svg
      viewBox="0 0 64 64"
      {...(at ? { x: at.x, y: at.y, width: at.size, height: at.size } : { className: `inline-block shrink-0 ${className}` })}
      style={{ overflow: "visible", ...style }}
      aria-hidden={!title}
      role={title ? "img" : undefined}
    >
      {title && <title>{title}</title>}
      <defs>
        <mask id={`${u}k`} maskUnits="userSpaceOnUse" x="-12" y="-12" width="88" height="88">
          <rect x="-12" y="-12" width="88" height="88" fill="#000" />
          {layers.map((l, i) => {
            const rule = l.eo ? "evenodd" : undefined;
            if (l.k === "m") return <path key={i} d={l.p} fill="#fff" fillRule={rule} />;
            if (l.k === "s") return <path key={i} d={l.p} fill="none" stroke="#fff" strokeWidth={l.w ?? 5} strokeLinecap="round" strokeLinejoin="round" />;
            if (l.k === "a") return <path key={i} d={l.p} fill="#fff" stroke="#000" strokeWidth={3.4} strokeLinejoin="round" paintOrder="stroke" />;
            return <path key={i} d={l.p} fill="none" stroke="#000" strokeWidth={l.w ?? 2.4} strokeLinecap="round" strokeLinejoin="round" />;
          })}
        </mask>
      </defs>
      <rect x="-12" y="-12" width="88" height="88" fill={color} mask={`url(#${u}k)`} />
    </svg>
  );
}
