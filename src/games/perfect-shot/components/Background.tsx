import type { CSSProperties } from "react";
import { ThemeLayer } from "../theme/Backdrop";
import { themeFor, useSettings, type Theme } from "../theme/themes";


export function Background({ leaving, theme, still = false }: { leaving: boolean; theme?: Theme; still?: boolean }) {
  const st = useSettings();
  const t = theme ?? themeFor(st.theme, "menu");
  return (
    <div
      className={still ? "absolute inset-0" : `a ${leaving ? "out-bg" : "in-bg"} absolute inset-0`}
      style={{ "--dur": leaving ? "700ms" : "1100ms" } as CSSProperties}
    >
      <ThemeLayer theme={t} />
    </div>
  );
}

export function Grass({ leaving, color, still = false }: { leaving: boolean; color?: string; still?: boolean }) {
  const st = useSettings();
  const fill = color ?? themeFor(st.theme, "menu").grass;
  const pts: string[] = ["0,60"];
  for (let i = 0; i <= 40; i++) {
    const x = i * 12;
    const h = 10 + ((i * 37) % 23) + (i % 3 === 0 ? 18 : 0);
    pts.push(`${x - 4},60 ${x},${60 - h} ${x + 4},60`);
  }
  pts.push("480,60");
  return (
    <div
      className={`${still ? "" : `a ${leaving ? "out-grass" : "in-grass"}`} pointer-events-none absolute inset-x-0 bottom-0 z-20 h-14`}
      style={{ "--d": leaving ? "120ms" : "200ms", "--dur": leaving ? "450ms" : "900ms" } as CSSProperties}
    >
      <svg viewBox="0 0 476 60" preserveAspectRatio="none" className="h-full w-full">
        <polygon points={pts.join(" ") + " 480,60 0,60"} fill={fill} />
      </svg>
    </div>
  );
}
