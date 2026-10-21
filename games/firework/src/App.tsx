import { Component, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Game, H, W, type UISnap, type Weapon } from "./game/engine";
import { Sfx } from "./game/sfx";

const WEAPONS: { id: Weapon; icon: string; name: string; desc: string }[] = [
  { id: "keris", icon: "🗡️", name: "KERIS", desc: "Bilah pusaka emas" },
  { id: "blackhole", icon: "🕳️", name: "BLACK HOLE", desc: "Singularitas kosmik" },
  { id: "yoyo", icon: "🪀", name: "YOYO", desc: "Yoyo mental elastis" },
  { id: "diamond", icon: "💎", name: "DIAMOND", desc: "Berlian berkilau" },
  { id: "crystal", icon: "🔮", name: "CRYSTAL", desc: "Kristal pelangi" },
];

const BADGE: Record<Weapon, string> = {
  keris: "🗡️ KERIS",
  blackhole: "🕳️ BLACK HOLE",
  yoyo: "🪀 YOYO",
  diamond: "💎 DIAMOND",
  crystal: "🔮 CRYSTAL",
};

const SUBTITLE: Record<Weapon, { text: string; cls: string }> = {
  keris: { text: "KERIS", cls: "text-[#ffd75e] drop-shadow-[0_0_12px_rgba(255,180,0,0.9)]" },
  blackhole: { text: "BLACK HOLE", cls: "text-[#c77dff] drop-shadow-[0_0_12px_rgba(150,80,255,0.9)]" },
  yoyo: { text: "YOYO", cls: "text-[#ff8ab3] drop-shadow-[0_0_12px_rgba(255,120,170,0.9)]" },
  diamond: { text: "DIAMOND", cls: "text-[#cfeaff] drop-shadow-[0_0_12px_rgba(180,220,255,0.9)]" },
  crystal: { text: "CRYSTAL", cls: "text-[#e0a0ff] drop-shadow-[0_0_12px_rgba(200,140,255,0.9)]" },
};

const ACTIVE_STYLE: Record<Weapon, string> = {
  keris: "border-[#ffd75e] bg-white/15 shadow-[0_0_18px_rgba(255,200,60,0.5)]",
  blackhole: "border-[#b46bff] bg-[#b46bff]/15 shadow-[0_0_18px_rgba(150,80,255,0.6)]",
  yoyo: "border-[#ff8ab3] bg-[#ff8ab3]/10 shadow-[0_0_18px_rgba(255,120,170,0.6)]",
  diamond: "border-[#cfeaff] bg-[#cfeaff]/10 shadow-[0_0_18px_rgba(190,225,255,0.6)]",
  crystal: "border-[#e0a0ff] bg-[#e0a0ff]/10 shadow-[0_0_18px_rgba(210,150,255,0.6)]",
};

// Never show a blank page — if React crashes, show a friendly error instead.
class ErrorBoundary extends Component<{ children: ReactNode }, { error: string | null }> {
  state = { error: null as string | null };
  static getDerivedStateFromError(e: unknown) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
  componentDidCatch(e: unknown) {
    console.error("[gunhit] React error:", e);
  }
  render() {
    if (this.state.error) {
      return (
        <div className="fixed inset-0 flex flex-col items-center justify-center gap-4 bg-[#06020f] p-6 text-center">
          <div className="text-4xl">😢</div>
          <div className="text-xl font-bold text-white">Ups, gamenya error!</div>
          <div className="max-w-[320px] text-sm text-white/60">{this.state.error}</div>
          <button onClick={() => window.location.reload()} className="play-btn">
            ↻ MUAT ULANG
          </button>
          <div className="text-xs text-white/40">Coba update browser ke versi terbaru.</div>
        </div>
      );
    }
    return this.props.children;
  }
}

function GameApp() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<Game | null>(null);
  const sfxRef = useRef<Sfx | null>(null);
  const [ui, setUI] = useState<UISnap>({ state: "menu", level: 1, score: 0, best: 0, weapon: "keris" });
  const [scale, setScale] = useState(1);
  const [muted, setMuted] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  // create game
  useEffect(() => {
    let game: Game | null = null;
    try {
      const sfx = new Sfx();
      sfxRef.current = sfx;
      if (!canvasRef.current) throw new Error("Canvas tidak ditemukan.");
      game = new Game(canvasRef.current, sfx, setUI);
      gameRef.current = game;
      try {
        const saved = localStorage.getItem("gunhit-weapon");
        if (
          saved === "keris" ||
          saved === "blackhole" ||
          saved === "yoyo" ||
          saved === "diamond" ||
          saved === "crystal"
        )
          game.setWeapon(saved);
      } catch {
        /* ignore */
      }

      const onResize = () => {
        if (!game) return;
        const w = window.innerWidth || W;
        const h = window.innerHeight || H;
        const s = Math.max(0.2, Math.min(w / W, h / H));
        setScale(s);
        game.setScale(s, Math.min(window.devicePixelRatio || 1, 2.5));
      };
      onResize();
      window.addEventListener("resize", onResize);
      window.addEventListener("orientationchange", onResize);
      game.run();

      if (document.fonts) {
        try {
          void document.fonts.load("700 30px Bungee").catch(() => undefined);
        } catch {
          /* ignore */
        }
      }

      return () => {
        window.removeEventListener("resize", onResize);
        window.removeEventListener("orientationchange", onResize);
        game?.destroy();
      };
    } catch (e) {
      console.error("[gunhit] init error:", e);
      setInitError(e instanceof Error ? e.message : String(e));
      return;
    }
  }, []);

  const fire = useCallback(() => {
    sfxRef.current?.init();
    gameRef.current?.fire();
  }, []);

  const start = useCallback(() => {
    sfxRef.current?.init();
    gameRef.current?.startGame();
  }, []);

  const selectWeapon = useCallback((w: Weapon) => {
    sfxRef.current?.init();
    sfxRef.current?.click();
    try {
      localStorage.setItem("gunhit-weapon", w);
    } catch {
      /* ignore */
    }
    gameRef.current?.setWeapon(w);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "ArrowUp" || e.code === "Enter") {
        e.preventDefault();
        if (e.repeat) return;
        const g = gameRef.current;
        if (!g) return;
        if (g.state === "menu" || g.state === "over") start();
        else fire();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fire, start]);

  const toggleMute = () => {
    sfxRef.current?.init();
    const m = !muted;
    setMuted(m);
    sfxRef.current?.setMuted(m);
    if (!m) sfxRef.current?.click();
  };

  if (initError) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center gap-4 bg-[#06020f] p-6 text-center">
        <div className="text-4xl">😢</div>
        <div className="text-xl font-bold text-white">Game tidak bisa dimuat!</div>
        <div className="max-w-[320px] text-sm text-white/60">{initError}</div>
        <button onClick={() => window.location.reload()} className="play-btn">
          ↻ MUAT ULANG
        </button>
        <div className="text-xs text-white/40">Coba update browser ke versi terbaru.</div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center overflow-hidden bg-[#06020f] select-none touch-none">
      <div style={{ width: W * scale, height: H * scale }} className="relative">
        <div
          style={{ width: W, height: H, transform: `scale(${scale})`, transformOrigin: "top left" }}
          className="absolute left-0 top-0 overflow-hidden"
          onPointerDown={() => {
            if (ui.state === "playing") fire();
          }}
        >
          <canvas ref={canvasRef} style={{ width: W, height: H, display: "block" }} />

          {/* sound toggle */}
          <button
            aria-label="toggle sound"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={toggleMute}
            className="absolute right-3 bottom-3 flex h-11 w-11 items-center justify-center rounded-full border border-white/30 bg-white/10 text-xl backdrop-blur transition hover:bg-white/20"
          >
            {muted ? "🔇" : "🔊"}
          </button>

          {/* weapon badge during play */}
          {(ui.state === "playing" || ui.state === "clear" || ui.state === "failing") && (
            <div className="pointer-events-none absolute left-1/2 top-2 -translate-x-1/2 rounded-full border border-white/25 bg-black/40 px-3 py-1 text-[11px] tracking-widest text-white/90 backdrop-blur [font-family:Bungee,Impact,sans-serif]">
              {BADGE[ui.weapon]}
            </div>
          )}

          {/* menu */}
          {ui.state === "menu" && (
            <div
              className="absolute inset-0 flex flex-col items-center justify-between py-12"
              onPointerDown={(e) => e.stopPropagation()}
            >
              <div className="text-center">
                <div className="title-glow text-[64px] leading-none tracking-wide">GUN HIT</div>
                <div
                  className={`mt-2 text-[20px] font-bold tracking-[0.3em] [font-family:Bungee,Impact,sans-serif] ${SUBTITLE[ui.weapon].cls}`}
                >
                  {SUBTITLE[ui.weapon].text}
                </div>
              </div>

              <div className="flex flex-col items-center gap-2.5">
                <div className="text-[11px] tracking-[0.3em] text-white/60 [font-family:Bungee,Impact,sans-serif]">
                  PILIH SENJATA
                </div>
                <div className="flex max-w-[400px] flex-wrap justify-center gap-2 px-3">
                  {WEAPONS.map((w) => {
                    const active = ui.weapon === w.id;
                    return (
                      <button
                        key={w.id}
                        onClick={() => selectWeapon(w.id)}
                        className={`flex w-[118px] flex-col items-center gap-0.5 rounded-2xl border-2 p-2 transition ${
                          active
                            ? `${ACTIVE_STYLE[w.id]} scale-105`
                            : "border-white/20 bg-white/5 opacity-70 hover:opacity-100"
                        }`}
                      >
                        <span className="text-[26px] leading-none">{w.icon}</span>
                        <span className="text-[11px] text-white [font-family:Bungee,Impact,sans-serif]">{w.name}</span>
                        <span className="text-[9px] text-white/60">{w.desc}</span>
                      </button>
                    );
                  })}
                </div>
                <button onClick={start} className="play-btn">
                  ▶ MAIN
                </button>
                <p className="max-w-[330px] text-center text-[12px] leading-relaxed text-white/80">
                  {ui.weapon === "keris" ? (
                    <>
                      Tap layar / tekan <b>SPASI</b> untuk menembakkan <b>bilah keris energi</b>! Pusaka berlekuk
                      berputar melesat lalu menancap dengan <b>percikan emas</b>. Jangan sampai menabrak bilah lain!
                    </>
                  ) : ui.weapon === "blackhole" ? (
                    <>
                      Tap layar / tekan <b>SPASI</b> untuk menembakkan singularitas ke lingkaran berputar. Jangan
                      sampai menabrak orb yang sudah menancap!
                    </>
                  ) : ui.weapon === "yoyo" ? (
                    <>
                      Tap layar / tekan <b>SPASI</b> untuk melempar <b>yoyo</b>! Yoyo berputar di titik tumbukan dengan{" "}
                      <b>tali elastis</b> lalu menancap. Jangan sampai menabrak yoyo lain!
                    </>
                  ) : ui.weapon === "diamond" ? (
                    <>
                      Tap layar / tekan <b>SPASI</b> untuk menembakkan <b>berlian berkilau</b>! Pecahan berlian dan{" "}
                      <b>kilatan bintang</b> meledak saat menancap. Jangan sampai menabrak berlian lain!
                    </>
                  ) : (
                    <>
                      Tap layar / tekan <b>SPASI</b> untuk menembakkan <b>pecahan kristal</b>! Kristal tumbuh sesaat
                      lalu <b>pecah berkilau</b> di titik tumbukan. Jangan sampai menabrak kristal lain!
                    </>
                  )}
                </p>
                {ui.best > 0 && <p className="text-sm text-[#ffd75e]">Rekor terbaik: {ui.best}</p>}
              </div>
            </div>
          )}

          {/* game over */}
          {ui.state === "over" && (
            <div
              className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/45 backdrop-blur-[2px]"
              onPointerDown={(e) => e.stopPropagation()}
            >
              <div className="text-[44px] leading-none text-[#ff5a7a] drop-shadow-[0_0_18px_rgba(255,60,110,0.9)] [font-family:Bungee,Impact,sans-serif]">
                GAME OVER
              </div>
              <div className="flex gap-8 text-center">
                <div>
                  <div className="text-[11px] tracking-widest text-white/60 [font-family:Bungee,Impact,sans-serif]">SKOR</div>
                  <div className="text-4xl text-white [font-family:Bungee,Impact,sans-serif]">{ui.score}</div>
                </div>
                <div>
                  <div className="text-[11px] tracking-widest text-white/60 [font-family:Bungee,Impact,sans-serif]">STAGE</div>
                  <div className="text-4xl text-[#7ad7ff] [font-family:Bungee,Impact,sans-serif]">{ui.level}</div>
                </div>
                <div>
                  <div className="text-[11px] tracking-widest text-white/60 [font-family:Bungee,Impact,sans-serif]">BEST</div>
                  <div className="text-4xl text-[#ffd75e] [font-family:Bungee,Impact,sans-serif]">{ui.best}</div>
                </div>
              </div>
              {ui.score >= ui.best && ui.score > 0 && (
                <div className="text-sm font-bold text-[#ffd75e]">🏆 REKOR BARU!</div>
              )}
              <div className="flex max-w-[360px] flex-wrap justify-center gap-2">
                {WEAPONS.map((w) => (
                  <button
                    key={w.id}
                    onClick={() => selectWeapon(w.id)}
                    className={`rounded-full border px-3 py-1.5 text-[11px] [font-family:Bungee,Impact,sans-serif] ${
                      ui.weapon === w.id
                        ? "border-[#ffd75e] bg-white/15 text-white"
                        : "border-white/20 bg-white/5 text-white/60"
                    }`}
                  >
                    {w.icon} {w.name}
                  </button>
                ))}
              </div>
              <button onClick={start} className="play-btn mt-1">
                ↻ ULANGI
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <GameApp />
    </ErrorBoundary>
  );
}
