import { useMemo } from "react";
type CSSVars = React.CSSProperties & Record<string, string | number>;

function parseColorToRgb(color: string): [number, number, number] {
  if (color.startsWith("#")) {
    const h = color.replace("#", "");
    if (h.length === 3) {
      return [
        parseInt(h[0] + h[0], 16),
        parseInt(h[1] + h[1], 16),
        parseInt(h[2] + h[2], 16),
      ];
    }
    return [
      parseInt(h.slice(0, 2), 16),
      parseInt(h.slice(2, 4), 16),
      parseInt(h.slice(4, 6), 16),
    ];
  }
  const parts = color.split(",").map((s) => Number(s.trim()));
  return [parts[0] ?? 255, parts[1] ?? 220, parts[2] ?? 120];
}

export function SunburstFX({
  size = 520,
  color = "210,192,255",
  intensity = 1,
  className = "",
  style,
  rays = 10,
  speed = 32,
  core = true,
  stars = true,
}: {
  size?: number;
  color?: string;
  intensity?: number;
  className?: string;
  style?: React.CSSProperties;
  rays?: number;
  speed?: number;
  core?: boolean;
  stars?: boolean;
}) {
  const [r, g, b] = useMemo(() => parseColorToRgb(color), [color]);

  // Generate stable ambient stars inside central burst area
  const starDots = useMemo(() => {
    if (!stars) return [];
    return Array.from({ length: 18 }).map((_, i) => {
      const angle = (i / 18) * Math.PI * 2 + (Math.sin(i * 3.7) * 0.4);
      const rad = 15 + ((i * 7) % 35); // 15% to 50% radius
      const x = 50 + Math.cos(angle) * rad;
      const y = 50 + Math.sin(angle) * rad;
      const sz = 1.2 + (i % 3) * 0.7;
      const tw = 2 + (i % 4) * 0.8;
      const dl = (i * 0.35) % 2.5;
      return { x, y, sz, tw, dl };
    });
  }, [stars]);

  const slice = 360 / rays;
  const solid = (slice * 0.5).toFixed(1);
  const rayAlpha = Math.min(0.75, 0.44 * intensity).toFixed(2);
  const conicBg = `repeating-conic-gradient(from 0deg at 50% 50%, rgba(${r},${g},${b},${rayAlpha}) 0deg ${solid}deg, transparent ${solid}deg ${slice.toFixed(1)}deg)`;
  const maskImg = "radial-gradient(circle, transparent 0%, #000 2%, #000 7.5%, transparent 18%)";

  return (
    <div
      className={`pointer-events-none absolute select-none ${className}`}
      style={{
        width: size,
        height: size,
        left: "50%",
        top: "50%",
        marginLeft: -size / 2,
        marginTop: -size / 2,
        ...style,
      }}
    >
      {/* 1. Outer Halo Diffuse (blur 24px) */}
      <div
        className="sunburst-halo"
        style={{
          width: size * 1.35,
          height: size * 1.35,
          background: `radial-gradient(circle, rgba(${r},${g},${b},${Math.min(0.5, 0.32 * intensity)}) 0%, rgba(${r},${g},${b},${Math.min(0.25, 0.14 * intensity)}) 34%, transparent 68%)`,
        }}
      />

      {/* 2. Rotating Conic Rays with Mask (screen blend mode) */}
      <div
        className="sunburst-rays"
        style={{
          width: size * 2.2,
          height: size * 2.2,
          background: conicBg,
          WebkitMaskImage: maskImg,
          maskImage: maskImg,
          animationDuration: `${speed}s`,
        }}
      />

      {/* 3. Mid Glow (screen blend, blur 10px) */}
      {core && (
        <div
          className="sunburst-glow"
          style={{
            width: size * 0.74,
            height: size * 0.74,
            background: `radial-gradient(circle, rgba(${r},${g},${b},${Math.min(1, 0.95 * intensity)}) 0%, rgba(${r},${g},${b},${Math.min(0.7, 0.55 * intensity)}) 26%, rgba(${r},${g},${b},${Math.min(0.3, 0.18 * intensity)}) 48%, transparent 70%)`,
          }}
        />
      )}

      {/* 4. Hot Glare Core (screen blend, blur 5px, glarePulse) */}
      {core && (
        <div
          className="sunburst-hot"
          style={{
            width: size * 0.42,
            height: size * 0.42,
            background: `radial-gradient(circle, rgba(${r},${g},${b},${Math.min(1, 1 * intensity)}) 0%, rgba(${r},${g},${b},${Math.min(0.95, 0.9 * intensity)}) 22%, rgba(${r},${g},${b},${Math.min(0.5, 0.38 * intensity)}) 48%, transparent 72%)`,
          }}
        />
      )}

      {/* 5. Ambient Twinkling Stars */}
      {stars && (
        <div className="absolute inset-0 pointer-events-none">
          {starDots.map((dot, idx) => (
            <div
              key={idx}
              className="star-dot-fx"
              style={{
                left: `${dot.x}%`,
                top: `${dot.y}%`,
                width: `${dot.sz}px`,
                height: `${dot.sz}px`,
                backgroundColor: `rgb(${Math.min(255, r + 40)}, ${Math.min(255, g + 40)}, ${Math.min(255, b + 40)})`,
                boxShadow: `0 0 6px rgba(${r},${g},${b},0.9)`,
                animationDuration: `${dot.tw}s`,
                animationDelay: `${dot.dl}s`,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}


export function Sparkle({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="-10 -10 20 20" className={className} style={{ filter: "drop-shadow(0 0 4px #fff)", ...style }}>
      <path d="M0 -10 Q1.2 -1.2 10 0 Q1.2 1.2 0 10 Q-1.2 1.2 -10 0 Q-1.2 -1.2 0 -10 Z" fill="#fff" />
    </svg>
  );
}

export function SparkleField({ count = 8, spread = 1, delay = 0 }: { count?: number; spread?: number; delay?: number }) {
  const s = useMemo(
    () => Array.from({ length: count }).map(() => ({
      l: 50 + (Math.random() - 0.5) * 90 * spread, t: 50 + (Math.random() - 0.5) * 80 * spread,
      d: Math.random() * 1.8, z: 10 + Math.random() * 14,
    })),
    [count, spread]
  );
  return (
    <>
      {s.map((p, i) => (
        <Sparkle key={i} className="twinkle pointer-events-none absolute" style={{ left: `${p.l}%`, top: `${p.t}%`, width: p.z, height: p.z, animationDelay: `${delay + p.d}s` }} />
      ))}
    </>
  );
}

export function Dust({ count = 22 }: { count?: number }) {
  const d = useMemo(
    () => Array.from({ length: count }).map(() => ({
      l: Math.random() * 100, s: 2 + Math.random() * 3, dur: 8 + Math.random() * 10, dl: -Math.random() * 18,
      o: 0.15 + Math.random() * 0.35, sx: (Math.random() - 0.5) * 80,
    })),
    [count]
  );
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {d.map((p, i) => (
        <span
          key={i}
          className="dust absolute block rounded-full bg-cyan-100"
          style={{ left: `${p.l}%`, bottom: -10, width: p.s, height: p.s, animationDuration: `${p.dur}s`, animationDelay: `${p.dl}s`, "--o": p.o, "--sx": `${p.sx}px`, boxShadow: "0 0 6px rgba(200,255,255,.8)" } as CSSVars}
        />
      ))}
    </div>
  );
}
