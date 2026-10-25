import { useCallback, useEffect, useRef, useState } from "react";
import { Game, W, H, type Hud } from "../game/engine";
import { randomTip } from "../game/engine";
import { isMuted, setMuted, sfx } from "../game/audio";
import { cn } from "../utils/cn";

const initialHud: Hud = {
  phase: "menu",
  level: 1,
  score: 0,
  best: 0,
  ammo: 4,
  shots: 4,
  combo: 0,
  boss: false,
  perfects: 0,
  totalShots: 0,
  lastResult: "",
  weapon: "rainbow",
};

function Pips({ ammo, shots }: { ammo: number; shots: number }) {
  const shown = Math.min(shots, 12);
  return (
    <div className="flex items-center gap-[5px]">
      {Array.from({ length: shown }).map((_, i) => {
        const lit = i < ammo;
        return (
          <span
            key={i}
            className={cn(
              "h-[9px] w-[9px] rotate-45 rounded-[2px] transition-all duration-200",
              lit ? "scale-100" : "scale-75"
            )}
            style={{
              background: lit
                ? `hsl(${(i * 34 + 190) % 360} 100% 65%)`
                : "rgba(255,255,255,0.12)",
              boxShadow: lit ? `0 0 10px hsl(${(i * 34 + 190) % 360} 100% 60% / 0.9)` : "none",
            }}
          />
        );
      })}
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string | number; accent?: string }) {
  return (
    <div className="text-center">
      <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/45">{label}</div>
      <div
        className={cn("text-xl font-black tabular-nums leading-tight", accent ?? "text-white")}
        style={{ textShadow: "0 2px 12px rgba(0,0,0,0.6)" }}
      >
        {value}
      </div>
    </div>
  );
}

export default function GameStage({ weapon }: { weapon: "rainbow" | "blackhole" }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Game | null>(null);
  const [hud, setHud] = useState<Hud>(initialHud);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [muted, setMutedState] = useState(false);
  const [tip] = useState(() => randomTip());

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const g = new Game(cv, setHud);
    g.setWeapon(weapon);
    gameRef.current = g;
    setMutedState(isMuted());

    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "ArrowUp" || e.code === "Enter") {
        e.preventDefault();
        g.tap();
      }
    };
    window.addEventListener("keydown", onKey);

    const ro = new ResizeObserver(() => {
      const el = wrapRef.current;
      if (!el) return;
      const s = Math.min(el.clientWidth / W, el.clientHeight / H);
      setBox({ w: Math.round(W * s), h: Math.round(H * s) });
      g.resize(Math.min(2, window.devicePixelRatio || 1));
    });
    if (wrapRef.current) ro.observe(wrapRef.current);

    return () => {
      window.removeEventListener("keydown", onKey);
      ro.disconnect();
      g.destroy();
      gameRef.current = null;
    };
  }, []);

  const toggleMute = useCallback(() => {
    const m = !isMuted();
    setMuted(m);
    setMutedState(m);
    if (!m) sfx.ui();
  }, []);

  const tap = useCallback(() => gameRef.current?.tap(), []);
  const retry = useCallback(() => {
    sfx.ui();
    gameRef.current?.startGame();
  }, []);
  const menu = useCallback(() => {
    sfx.ui();
    gameRef.current?.goMenu();
  }, []);

  const progress = hud.shots ? (hud.shots - hud.ammo) / hud.shots : 0;

  return (
    <div ref={wrapRef} className="relative flex h-full w-full items-center justify-center">
      <div
        className="relative overflow-hidden rounded-[26px] shadow-[0_30px_90px_-20px_rgba(0,0,0,0.9)] ring-1 ring-white/15"
        style={{ width: box.w || undefined, height: box.h || undefined }}
      >
        {/* rainbow aura behind the play field */}
        <div className="pointer-events-none absolute -inset-20 -z-10 opacity-70 blur-3xl">
          <div className="absolute left-1/4 top-10 h-56 w-56 rounded-full bg-fuchsia-600/40" />
          <div className="absolute right-1/5 top-40 h-64 w-64 rounded-full bg-cyan-500/30" />
          <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-indigo-600/40" />
        </div>

        <canvas
          ref={canvasRef}
          onPointerDown={tap}
          onContextMenu={(e) => e.preventDefault()}
          className="h-full w-full select-none"
        />

        {/* ------------------------- HUD ------------------------- */}
        <div className="pointer-events-none absolute inset-x-0 top-0 p-3">
          <div className="flex items-start justify-between gap-2">
            <div
              className={cn(
                "glass flex items-center gap-2 rounded-2xl px-3 py-1.5",
                hud.boss && hud.phase !== "menu" && "ring-2 ring-amber-300/70"
              )}
            >
              <div className="text-[9px] font-black uppercase leading-none tracking-[0.2em] text-white/50">
                {hud.boss && hud.phase !== "menu" ? "Boss" : "Level"}
              </div>
              <div
                className={cn(
                  "text-2xl font-black leading-none tabular-nums",
                  hud.boss && hud.phase !== "menu" ? "text-amber-300" : "text-white"
                )}
                style={{ textShadow: "0 2px 10px rgba(0,0,0,0.7)" }}
              >
                {hud.phase === "menu" ? "—" : hud.level}
              </div>
            </div>

            <div className="glass flex items-center gap-3 rounded-2xl px-3 py-1.5">
              <Stat label="Score" value={hud.score.toLocaleString()} />
              <div className="h-7 w-px bg-white/15" />
              <Stat label="Best" value={hud.best.toLocaleString()} accent="text-fuchsia-300" />
              <div className="h-7 w-px bg-white/15" />
              <Stat label="Combo" value={`x${Math.max(1, hud.combo)}`} accent="text-amber-300" />
            </div>
          </div>

          {/* progress */}
          <div className="mt-2 flex items-center gap-2 px-1">
            <Pips ammo={hud.ammo} shots={hud.shots} />
            <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
              <div
                className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-300"
                style={{
                  width: `${progress * 100}%`,
                  background:
                    "linear-gradient(90deg,#ff4d6d,#ff9f1c,#ffe066,#4ade80,#22d3ee,#818cf8,#e879f9)",
                  boxShadow: "0 0 12px rgba(255,255,255,0.45)",
                }}
              />
            </div>
          </div>
        </div>

        {/* ------------------- corner controls ------------------- */}
        <div className="absolute bottom-3 left-3 flex gap-2">
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={toggleMute}
            className="glass grid h-9 w-9 place-items-center rounded-xl text-base text-white/80 transition hover:text-white active:scale-95"
            aria-label="mute"
          >
            {muted ? "🔇" : "🔊"}
          </button>
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={retry}
            className="glass grid h-9 w-9 place-items-center rounded-xl text-base text-white/80 transition hover:text-white active:scale-95"
            aria-label="restart"
          >
            ⟳
          </button>
        </div>

        {/* --------------------- intro banner --------------------- */}
        {hud.phase === "intro" && (
          <div className="pointer-events-none absolute inset-0 flex items-start justify-center pt-[10%]">
            <div key={hud.level} className="animate-banner text-center">
              <div className="text-[10px] font-black uppercase tracking-[0.5em] text-white/60">
                {hud.boss ? "Boss Wheel" : "Get Ready"}
              </div>
              <div
                className="rainbow-text text-6xl font-black italic tracking-tighter"
                style={{ filter: "drop-shadow(0 6px 20px rgba(0,0,0,0.7))" }}
              >
                LEVEL {hud.level}
              </div>
              <div className="mt-1 text-xs font-bold uppercase tracking-[0.25em] text-white/70">
                {hud.shots} holy pulses
              </div>
            </div>
          </div>
        )}

        {/* -------------------------- menu -------------------------- */}
        {hud.phase === "menu" && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-between px-6 pb-[26%] pt-[9%]">
            <div className="animate-float-up text-center">
              <div className="mb-1 text-[10px] font-black uppercase tracking-[0.6em] text-white/50">
                2D Arcade Shooter
              </div>
              <h1
                className="rainbow-text text-[clamp(2.6rem,11vw,4.2rem)] font-black italic leading-[0.9] tracking-tighter"
                style={{ filter: "drop-shadow(0 8px 26px rgba(0,0,0,0.75))" }}
              >
                RAINBOW
                <br />
                GUN
              </h1>
              <p className="mx-auto mt-3 max-w-[16rem] text-[13px] font-medium leading-snug text-white/70">
                Tembak lingkaran yang berputar. Senjatanya tetap menghadap atas — hanya timing-mu
                yang menentukan.
              </p>
            </div>

            <div className="w-full max-w-[19rem] text-center">
              <button
                onPointerDown={(e) => e.stopPropagation()}
                onClick={tap}
                className="animate-glow pointer-events-auto w-full rounded-2xl bg-gradient-to-r from-rose-500 via-amber-400 to-cyan-400 px-8 py-4 text-lg font-black uppercase italic tracking-wider text-slate-950 transition active:scale-95"
              >
                ▶ Main
              </button>
              <div className="mt-3 text-[11px] font-semibold text-white/55">
                Tap / Klik / <span className="rounded bg-white/10 px-1.5 py-0.5">Space</span> untuk
                menembak
              </div>
              <div className="glass mt-4 rounded-xl px-3 py-2 text-[11px] leading-snug text-white/65">
                <span className="font-black text-amber-300">TIP · </span>
                {tip}
              </div>
            </div>
          </div>
        )}

        {/* ------------------------ game over ------------------------ */}
        {hud.phase === "over" && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/65 px-6 backdrop-blur-[3px]">
            <div className="animate-pop-in glass w-full max-w-[19rem] rounded-3xl p-5 text-center">
              <div className="text-[10px] font-black uppercase tracking-[0.45em] text-rose-300/80">
                Game Over
              </div>
              <div className="rainbow-text text-4xl font-black italic tracking-tight">
                SIAL!
              </div>
              <p className="mt-1 text-[11px] font-semibold text-white/60">{hud.lastResult}</p>

              <div className="mt-4 grid grid-cols-3 gap-2">
                {[
                  { l: "Score", v: hud.score.toLocaleString(), c: "text-white" },
                  { l: "Level", v: hud.level, c: "text-cyan-300" },
                  { l: "Perfect", v: hud.perfects, c: "text-amber-300" },
                ].map((s) => (
                  <div key={s.l} className="rounded-xl bg-white/5 px-2 py-2">
                    <div className="text-[8px] font-black uppercase tracking-[0.18em] text-white/40">
                      {s.l}
                    </div>
                    <div className={cn("text-lg font-black tabular-nums", s.c)}>{s.v}</div>
                  </div>
                ))}
              </div>

              {hud.score >= hud.best && hud.score > 0 && (
                <div className="mt-3 text-[11px] font-black uppercase tracking-[0.2em] text-amber-300">
                  ★ Rekor baru! ★
                </div>
              )}

              <button
                onPointerDown={(e) => e.stopPropagation()}
                onClick={retry}
                className="pointer-events-auto mt-4 w-full rounded-2xl bg-gradient-to-r from-violet-500 via-fuchsia-500 to-rose-500 px-6 py-3.5 text-base font-black uppercase italic tracking-wider text-white transition hover:brightness-110 active:scale-95"
              >
                Coba Lagi
              </button>
              <button
                onPointerDown={(e) => e.stopPropagation()}
                onClick={menu}
                className="pointer-events-auto mt-2 w-full rounded-2xl border border-white/15 px-6 py-2.5 text-xs font-bold uppercase tracking-[0.2em] text-white/70 transition hover:text-white active:scale-95"
              >
                Menu
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
