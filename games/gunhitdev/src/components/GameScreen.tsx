import { useCallback, useEffect, useRef, useState } from "react";
import { GameEngine, type HudState } from "../game/engine";
import type { Weapon } from "../game/weapons";
import { ArcadeButton, CoinPill, IconBtn, IconHome, IconMute, IconPause, IconPlay, IconRefresh, IconSound, IconTarget } from "./Ui";
import { sfx } from "../game/audio";
import { rgba } from "../game/weapons";

interface Props {
  weapon: Weapon;
  startLevel: number;
  muted: boolean;
  onExit: () => void;
  onGameOver: (level: number) => void;
  onClear: (level: number, reward: number) => void;
  onToggleSound: () => void;
}

type Overlay = "none" | "paused" | "over" | "clear";

export default function GameScreen({ weapon, startLevel, muted, onExit, onGameOver, onClear, onToggleSound }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const [hud, setHud] = useState<HudState | null>(null);
  const [overlay, setOverlay] = useState<Overlay>("none");
  const [clearInfo, setClearInfo] = useState({ level: 1, reward: 0, shotsLeft: 0, boss: false });
  const [runCoins, setRunCoins] = useState(0);
  const [runCleared, setRunCleared] = useState(0);

  const overRef = useRef(onGameOver);
  overRef.current = onGameOver;
  const clearRef = useRef(onClear);
  clearRef.current = onClear;

  const overCb = useCallback((level: number) => {
    setOverlay("over");
    overRef.current(level);
  }, []);

  const clearCb = useCallback(
    (info: { level: number; reward: number; shotsLeft: number; boss: boolean }) => {
      setClearInfo(info);
      setRunCoins((c) => c + info.reward);
      setRunCleared((c) => c + 1);
      setOverlay("clear");
      clearRef.current(info.level, info.reward);
    },
    []
  );

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const eng = new GameEngine(cv, weapon.id, startLevel, {
      onHud: (h) => setHud(h),
      onGameOver: ({ level }) => overCb(level),
      onClear: (info) => clearCb(info),
    });
    engineRef.current = eng;
    return () => {
      eng.destroy();
      engineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const phase = hud?.phase ?? "intro";
  const shots = hud?.shots ?? 0;
  const total = hud?.total ?? 1;
  const level = hud?.level ?? startLevel;
  const boss = hud?.boss ?? false;

  const resume = () => {
    sfx.ui();
    engineRef.current?.setPaused(false);
    setOverlay("none");
  };
  const retry = () => {
    sfx.ui();
    setRunCoins(0);
    setRunCleared(0);
    setOverlay("none");
    engineRef.current?.retry();
  };
  const next = () => {
    sfx.ui();
    setOverlay("none");
    engineRef.current?.nextLevel();
  };

  return (
    <div className="arena-bg grain relative h-full w-full overflow-hidden">
      <div className="relative mx-auto h-full w-full max-w-[560px]">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 h-full w-full touch-none select-none"
          style={{ cursor: "crosshair" }}
        />

        {/* ---------------- HUD ---------------- */}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-2 p-3">
          <div
            className={`relative overflow-hidden rounded-2xl border px-3 backdrop-blur-sm ${boss ? "pb-4 pt-2" : "py-2"}`}
            style={{
              borderColor: boss ? "rgba(255,77,106,.5)" : rgba(weapon.hue, 0.38),
              background: boss ? "linear-gradient(180deg, rgba(255,77,106,.22), rgba(0,0,0,.6))" : "rgba(0,0,0,.5)",
              boxShadow: boss ? "0 0 30px -8px rgba(255,45,80,.9)" : `0 0 26px -12px ${weapon.hue}`,
            }}
          >
            <div className="flex items-center gap-3">
              <div className="flex items-baseline gap-1">
                <span className="text-[9px] uppercase tracking-[0.22em] text-white/38">LV</span>
                <span className="font-display text-xl leading-none text-white tabular-nums">{level}</span>
              </div>
              <span className="h-7 w-px bg-white/12" />
              <div>
                <div className="flex items-center gap-[3px]">
                  {Array.from({ length: total }).map((_, i) => (
                    <span
                      key={i}
                      className="rounded-full transition-all duration-200"
                      style={{
                        width: total > 10 ? 4 : 5,
                        height: total > 10 ? 9 : 11,
                        background: i < shots ? weapon.hue : "rgba(255,255,255,.14)",
                        boxShadow: i < shots ? `0 0 7px ${rgba(weapon.hue, 0.9)}` : "none",
                        transform: i === shots - 1 ? "scaleY(1.22)" : undefined,
                      }}
                    />
                  ))}
                </div>
                <div className="mt-1 flex items-center gap-1 text-[9px] uppercase tracking-[0.16em] text-white/35">
                  <span style={{ color: weapon.hue }}>
                    <IconTarget className="h-2.5 w-2.5" />
                  </span>
                  {shots} sisa
                  {!boss && (
                    <span className="text-white/22">· boss {5 - (level % 5)} lv</span>
                  )}
                </div>
              </div>
            </div>
            {boss && (
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-[#ff4d6a]/20 py-[2px] font-display text-[8.5px] tracking-[0.22em] text-[#ffb3bf]">
                <span className="inline-block h-1 w-1 animate-ping rounded-full bg-[#ff4d6a]" />
                BOSS FIGHT
              </div>
            )}
          </div>

          <div className="pointer-events-auto flex items-center gap-2">
            <CoinPill amount={runCoins} />
            <IconBtn
              label={muted ? "Nyalakan suara" : "Matikan suara"}
              onClick={() => {
                onToggleSound();
              }}
            >
              {muted ? <IconMute /> : <IconSound />}
            </IconBtn>
            <IconBtn
              label="Jeda"
              onClick={() => {
                if (phase === "play" || phase === "intro") {
                  sfx.ui();
                  engineRef.current?.setPaused(true);
                  setOverlay("paused");
                }
              }}
            >
              <IconPause />
            </IconBtn>
          </div>
        </div>

        {/* banner level */}
        {phase === "intro" && overlay === "none" && (
          <div key={level} className="pointer-events-none absolute inset-0 z-20 grid place-items-center">
            <div className="anim-banner text-center">
              <div
                className="font-display text-[clamp(38px,13vw,66px)] leading-none"
                style={{
                  color: boss ? "#ff8ea0" : "#ffd979",
                  WebkitTextStroke: "3px #12080a",
                  paintOrder: "stroke fill",
                  textShadow: boss
                    ? "0 0 40px rgba(255,45,80,.8), 0 6px 0 #6d0f22"
                    : "0 0 40px rgba(255,190,80,.55), 0 6px 0 #7c4708",
                }}
              >
                {boss ? "BOSS" : `LEVEL ${level}`}
              </div>
              <div className="mt-2 text-[11px] uppercase tracking-[0.4em] text-white/45">
                {boss ? "putaran kacau · waspada" : "siap · bidik waktunya"}
              </div>
            </div>
          </div>
        )}

        {/* petunjuk tap pertama */}
        {phase === "play" && overlay === "none" && level === startLevel && shots === total && (
          <div className="pointer-events-none absolute inset-x-0 bottom-[26%] z-20 flex justify-center">
            <div className="anim-pop flex items-center gap-2 rounded-full border border-white/12 bg-black/50 px-3.5 py-1.5 text-[11px] uppercase tracking-[0.2em] text-white/55 backdrop-blur-sm">
              <span className="h-1.5 w-1.5 animate-ping rounded-full" style={{ background: weapon.hue }} />
              tap untuk menembak
            </div>
          </div>
        )}

        {/* ---------------- OVERLAY ---------------- */}
        {overlay !== "none" && (
          <div className="absolute inset-0 z-30 grid place-items-center bg-black/68 p-5 backdrop-blur-[6px]">
            {overlay === "paused" && (
              <div className="anim-pop w-full max-w-[340px] rounded-3xl border border-white/12 bg-[linear-gradient(180deg,rgba(20,28,52,.96),rgba(6,9,18,.98))] p-5 text-center shadow-[0_40px_80px_-30px_rgba(0,0,0,.9)]">
                <div className="font-display text-2xl text-white/90">JEDA</div>
                <p className="mt-1.5 text-[12.5px] text-white/45">Lingkaran masih berputar menunggumu.</p>
                <div className="mt-4 space-y-2">
                  <ArcadeButton onClick={resume}>
                    <IconPlay className="h-4 w-4" /> LANJUTKAN
                  </ArcadeButton>
                  <ArcadeButton tone="ghost" onClick={() => { sfx.ui(); onExit(); }}>
                    <IconHome className="h-4 w-4" /> MENU UTAMA
                  </ArcadeButton>
                </div>
              </div>
            )}

            {overlay === "clear" && (
              <div
                className="anim-pop w-full max-w-[360px] overflow-hidden rounded-3xl border p-5 text-center"
                style={{
                  borderColor: rgba(weapon.hue, 0.4),
                  background: `radial-gradient(120% 80% at 50% 0%, ${rgba(weapon.hue, 0.22)}, rgba(6,9,18,.97) 60%)`,
                  boxShadow: `0 40px 90px -30px ${rgba(weapon.hue, 0.8)}`,
                }}
              >
                <div className="text-[10px] uppercase tracking-[0.36em] text-white/40">
                  {clearInfo.boss ? "boss tumbang" : "level selesai"}
                </div>
                <div
                  className="mt-1 font-display text-[clamp(30px,9vw,42px)] leading-none text-[#ffd979]"
                  style={{ WebkitTextStroke: "3px #160c04", paintOrder: "stroke fill", textShadow: "0 4px 0 #7c4708" }}
                >
                  {clearInfo.boss ? "HEBAT!" : `LEVEL ${clearInfo.level}`}
                </div>
                <div className="mx-auto mt-4 grid max-w-[260px] grid-cols-2 gap-2">
                  <div className="rounded-xl border border-white/10 bg-black/40 px-3 py-2">
                    <div className="text-[9.5px] uppercase tracking-[0.18em] text-white/35">Koin</div>
                    <div className="font-display text-lg text-gold">+{clearInfo.reward}</div>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-black/40 px-3 py-2">
                    <div className="text-[9.5px] uppercase tracking-[0.18em] text-white/35">Sisa peluru</div>
                    <div className="font-display text-lg text-jade">{clearInfo.shotsLeft}</div>
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  <ArcadeButton onClick={next}>
                    LEVEL {clearInfo.level + 1} <IconPlay className="h-4 w-4" />
                  </ArcadeButton>
                  <ArcadeButton tone="ghost" onClick={() => { sfx.ui(); onExit(); }}>
                    <IconHome className="h-4 w-4" /> MENU UTAMA
                  </ArcadeButton>
                </div>
                <div className="mt-3 text-[11px] text-white/30">
                  sesi ini: {runCleared} level · {runCoins} koin
                </div>
              </div>
            )}

            {overlay === "over" && (
              <div className="anim-pop w-full max-w-[360px] overflow-hidden rounded-3xl border border-[#ff4d6a]/35 bg-[radial-gradient(120%_80%_at_50%_0%,rgba(255,77,106,.22),rgba(8,6,12,.97)_60%)] p-5 text-center shadow-[0_40px_90px_-30px_rgba(255,45,80,.7)]">
                <div className="text-[10px] uppercase tracking-[0.36em] text-[#ff8ea0]/70">kena penghalang</div>
                <div
                  className="mt-1 font-display text-[clamp(30px,9vw,44px)] leading-none text-[#ff6b81]"
                  style={{ WebkitTextStroke: "3px #1a0409", paintOrder: "stroke fill", textShadow: "0 4px 0 #7d0f24" }}
                >
                  GAME OVER
                </div>
                <div className="mx-auto mt-4 grid max-w-[260px] grid-cols-2 gap-2">
                  <div className="rounded-xl border border-white/10 bg-black/40 px-3 py-2">
                    <div className="text-[9.5px] uppercase tracking-[0.18em] text-white/35">Level</div>
                    <div className="font-display text-lg text-white/90">{level}</div>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-black/40 px-3 py-2">
                    <div className="text-[9.5px] uppercase tracking-[0.18em] text-white/35">Koin sesi</div>
                    <div className="font-display text-lg text-gold">{runCoins}</div>
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  <ArcadeButton tone="danger" onClick={retry}>
                    <IconRefresh className="h-4 w-4" /> COBA LAGI
                  </ArcadeButton>
                  <ArcadeButton tone="ghost" onClick={() => { sfx.ui(); onExit(); }}>
                    <IconHome className="h-4 w-4" /> MENU UTAMA
                  </ArcadeButton>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
