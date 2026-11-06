import { useId } from "react";

export function TargetArt({ kind: _kind, className = "" }: { kind?: "orange"; className?: string }) {
  const u = useId().replace(/[^a-zA-Z0-9]/g, "");
    const c = { rind: "#f59e0b", rindD: "#b45309", pith: "#fff4dc", flesh: "#fb923c", fleshD: "#ea7a1c" };
    return (
      <svg viewBox="-100 -100 200 200" className={className}>
        <defs>
          <radialGradient id={`${u}f`}>
            <stop offset="0" stopColor="#fff" stopOpacity=".5" />
            <stop offset=".25" stopColor={c.flesh} />
            <stop offset="1" stopColor={c.fleshD} />
          </radialGradient>
        </defs>
        <circle r="98" fill={c.rind} stroke={c.rindD} strokeWidth="4" />
        <circle r="90" fill={c.pith} />
        <circle r="83" fill={`url(#${u}f)`} />
        {Array.from({ length: 10 }).map((_, i) => {
          const a = (i / 10) * Math.PI * 2;
          return <line key={i} x1="0" y1="0" x2={Math.cos(a) * 84} y2={Math.sin(a) * 84} stroke={c.pith} strokeWidth="4" strokeLinecap="round" />;
        })}
        {Array.from({ length: 30 }).map((_, i) => {
          const a = (i / 30) * Math.PI * 2 + 0.18;
          const r = 34 + (i % 3) * 16;
          return <ellipse key={`j${i}`} cx={Math.cos(a) * r} cy={Math.sin(a) * r} rx="7" ry="2.2" fill="#fff" opacity=".45" transform={`rotate(${(a * 180) / Math.PI} ${Math.cos(a) * r} ${Math.sin(a) * r})`} />;
        })}
        <circle r="9" fill={c.pith} />
        <path d="M-70 -50 A85 85 0 0 1 -20 -82" stroke="#fff" strokeWidth="6" strokeLinecap="round" fill="none" opacity=".55" />
      </svg>
    );
}
