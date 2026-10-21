import { useCallback, useEffect, useState } from "react";
import MenuScreen from "./components/MenuScreen";
import SkinScreen from "./components/SkinScreen";
import GameScreen from "./components/GameScreen";
import { DecoRing } from "./components/Ui";
import { getWeapon } from "./game/weapons";
import { loadSave, writeSave, type SaveData } from "./game/save";
import { setMuted, unlockAudio } from "./game/audio";

type Screen = "menu" | "skins" | "game";

export default function App() {
  const [save, setSave] = useState<SaveData>(() => loadSave());
  const [screen, setScreen] = useState<Screen>("menu");
  const [gameKey, setGameKey] = useState(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    writeSave(save);
    setMuted(save.muted);
  }, [save]);

  useEffect(() => {
    const un = () => {
      unlockAudio();
      setReady(true);
    };
    window.addEventListener("pointerdown", un, { once: true });
    window.addEventListener("keydown", un, { once: true });
    return () => {
      window.removeEventListener("pointerdown", un);
      window.removeEventListener("keydown", un);
    };
  }, []);

  const weapon = getWeapon(save.selected);

  const handlePlay = useCallback(() => {
    unlockAudio();
    setReady(true);
    setGameKey((k) => k + 1);
    setScreen("game");
  }, []);

  const handleGameOver = useCallback((level: number) => {
    setSave((s) => ({ ...s, best: Math.max(s.best, level), runs: s.runs + 1 }));
  }, []);

  const handleClear = useCallback((level: number, reward: number) => {
    setSave((s) => ({ ...s, coins: s.coins + reward, best: Math.max(s.best, level + 1) }));
  }, []);

  const handleSelect = useCallback((id: string) => setSave((s) => ({ ...s, selected: id })), []);
  const toggleSound = useCallback(() => setSave((s) => ({ ...s, muted: !s.muted })), []);

  const goMenu = useCallback(() => setScreen("menu"), []);
  const goSkins = useCallback(() => setScreen("skins"), []);

  return (
    <div className="relative h-full w-full overflow-hidden bg-ink">
      {/* dekorasi latar khusus layar lebar */}
      <div className="pointer-events-none absolute inset-0 hidden lg:block">
        <div className="absolute -left-40 top-1/2 -translate-y-1/2 opacity-[0.16]">
          <DecoRing size={520} speed={64} tint="#ffc247" bolts={7} />
        </div>
        <div className="absolute -right-44 top-6 opacity-[0.13]">
          <DecoRing size={460} speed={48} tint="#38e8c8" bolts={4} />
        </div>
        <div className="absolute bottom-4 right-10 opacity-[0.1]">
          <DecoRing size={300} speed={36} tint="#c46bff" bolts={3} />
        </div>
        <div className="absolute left-1/2 top-1/2 h-[80vh] w-[80vh] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,194,71,.07),transparent_65%)]" />
      </div>

      <div
        className="relative mx-auto h-full w-full max-w-[600px] overflow-hidden lg:border-x lg:border-white/8"
        style={{ boxShadow: "0 0 140px -30px rgba(0,0,0,.95)" }}
      >
        {screen === "menu" && (
          <MenuScreen
            weapon={weapon}
            coins={save.coins}
            best={save.best}
            muted={save.muted}
            onPlay={handlePlay}
            onSkins={goSkins}
            onToggleSound={toggleSound}
          />
        )}
        {screen === "skins" && (
          <SkinScreen
            selected={save.selected}
            muted={save.muted}
            onBack={goMenu}
            onSelect={handleSelect}
            onToggleSound={toggleSound}
          />
        )}
        {screen === "game" && (
          <GameScreen
            key={gameKey}
            weapon={weapon}
            startLevel={save.best}
            muted={save.muted}
            onExit={goMenu}
            onGameOver={handleGameOver}
            onClear={handleClear}
            onToggleSound={toggleSound}
          />
        )}
      </div>

      {/* lapisan mula: membuka audio lewat gestur pertama */}
      {!ready && (
        <div
          className="absolute inset-0 z-50 grid cursor-pointer place-items-center bg-ink/70 backdrop-blur-[2px]"
          onPointerDown={() => {
            unlockAudio();
            setReady(true);
          }}
        >
          <div className="anim-pop px-8 text-center">
            <div className="font-display text-[clamp(30px,9vw,46px)] leading-none text-[#ffd979]"
              style={{ WebkitTextStroke: "3px #160c04", paintOrder: "stroke fill", textShadow: "0 4px 0 #7c4708, 0 0 46px rgba(255,180,60,.45)" }}>
              GUN HIT
            </div>
            <div className="mt-3 text-[11px] uppercase tracking-[0.4em] text-white/50">sentuh untuk mulai</div>
          </div>
        </div>
      )}
    </div>
  );
}


