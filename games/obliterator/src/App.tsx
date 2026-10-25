import React, { useEffect, useRef, useState } from 'react';
import {
  Crosshair,
  Flame,
  Gem,
  RotateCcw,
  Sparkles,
  Trophy,
  Volume2,
  VolumeX,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { ObliteratorGameEngine } from './game/engine';
import { HudSnapshot } from './game/types';
import { WEAPON_ORDER, WEAPON_THEMES } from './game/weapons';
import { SPECTRUM } from './game/specialWeapons';

const RAINBOW_BG = `conic-gradient(${SPECTRUM.join(', ')}, ${SPECTRUM[0]})`;
const NEW_WEAPONS = new Set(['rifle', 'maykr', 'banana', 'beehive', 'bubble', 'confetti', 'crystal']);

const INITIAL_HUD: HudSnapshot = {
  phase: 'title',
  score: 0,
  bestScore: 0,
  stage: 1,
  bestStage: 1,
  ammoLeft: 6,
  ammoTotal: 6,
  argentGems: 0,
  overdriveCharge: 35,
  overdrivePrimed: false,
  combo: 0,
  selectedWeapon: 'bfg',
  inspectMode: false,
  muted: false,
  coreName: 'UAC FOUNDRY CORE',
  isBoss: false,
  isSpecial: false,
};

export function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<ObliteratorGameEngine | null>(null);
  const [hud, setHud] = useState<HudSnapshot>(INITIAL_HUD);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const engine = new ObliteratorGameEngine(canvas, (snapshot) => {
      setHud(snapshot);
    });
    engineRef.current = engine;
    engine.start();

    const handleResize = () => engine.resize();
    window.addEventListener('resize', handleResize);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat && e.code !== 'Space') return;
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'Enter') {
        e.preventDefault();
        engine.startGameAndFire();
      } else if (e.code === 'KeyR') {
        engine.restartGame();
      } else if (e.code === 'KeyI') {
        engine.toggleInspectMode();
      } else if (e.code === 'KeyM') {
        engine.toggleMute();
      } else if (e.code === 'Digit1') {
        engine.selectWeapon('bfg');
      } else if (e.code === 'Digit2') {
        engine.selectWeapon('crucible');
      } else if (e.code === 'Digit3') {
        engine.selectWeapon('maykr');
      } else if (e.code === 'Digit4') {
        engine.selectWeapon('overlord');
      } else if (e.code === 'Digit5') {
        engine.selectWeapon('rifle');
      } else if (e.code === 'Digit6') {
        engine.selectWeapon('banana');
      } else if (e.code === 'Digit7') {
        engine.selectWeapon('beehive');
      } else if (e.code === 'Digit8') {
        engine.selectWeapon('bubble');
      } else if (e.code === 'Digit9') {
        engine.selectWeapon('confetti');
      } else if (e.code === 'Digit0') {
        engine.selectWeapon('crystal');
      } else if (e.code === 'KeyQ') {
        engine.selectWeapon('rainbow');
      } else if (e.code === 'KeyW') {
        engine.selectWeapon('water');
      } else if (e.code === 'KeyE') {
        engine.selectWeapon('snow');
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', handleKeyDown);
      engine.destroy();
      engineRef.current = null;
    };
  }, []);

  const activeTheme = WEAPON_THEMES[hud.selectedWeapon];

  const handleCanvasPointerDown = () => {
    engineRef.current?.startGameAndFire();
  };

  const stopProp = (e: React.PointerEvent | React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <div
      className="relative w-screen h-screen overflow-hidden bg-[#07080b] cursor-crosshair select-none"
      onPointerDown={handleCanvasPointerDown}
    >
      {/* FULL-VIEWPORT LIVE 2D DOOM CANVAS */}
      <canvas ref={canvasRef} className="block w-full h-full" />

      {/* =================================================================== */}
      {/* TOP BAR HUD: SCORE (LEFT) • WAVE / BOSS HEADER (CENTER) • TOOLS     */}
      {/* =================================================================== */}
      <header className="pointer-events-none fixed inset-x-0 top-0 z-20 flex items-start justify-between px-4 pt-3.5 sm:px-6 sm:pt-4">
        {/* Top-Left Score & High Score */}
        <div className="flex flex-col gap-1">
          <div className="flex items-baseline gap-2.5">
            <span
              className="font-display text-3xl sm:text-4xl font-black tracking-wider drop-shadow-[0_2px_12px_rgba(0,0,0,0.9)]"
              style={{ color: activeTheme.plasmaMid }}
            >
              {hud.score}
            </span>
            {hud.combo >= 2 && (
              <span className="font-display text-xs font-bold px-2 py-0.5 rounded bg-amber-500/20 border border-amber-400/50 text-amber-300 tracking-wider">
                x{hud.combo}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 text-xs sm:text-sm font-semibold tracking-wider text-zinc-400">
            <span className="flex items-center gap-1">
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              {hud.bestScore}
            </span>
            <span className="flex items-center gap-1 text-rose-400">
              <Gem className="w-3.5 h-3.5" />
              {hud.argentGems}
            </span>
          </div>
        </div>

        {/* Top-Center Stage & Core Name Indicator */}
        {!hud.inspectMode && (
          <div className="flex flex-col items-center text-center">
            <div
              className={`font-display text-xs sm:text-sm font-extrabold tracking-[0.22em] px-3 py-0.5 rounded-full border backdrop-blur-md ${
                hud.isBoss
                  ? 'bg-rose-950/80 border-rose-500/70 text-rose-300 shadow-[0_0_20px_rgba(244,63,94,0.45)]'
                  : 'bg-zinc-900/75 border-zinc-700/70 text-zinc-200'
              }`}
            >
              {hud.isBoss
              ? `BOSS WAVE ${hud.stage}`
              : hud.isSpecial
                ? `SPECIAL WAVE ${hud.stage}`
                : `WAVE ${String(hud.stage).padStart(2, '0')}`}
            </div>
            <span className="mt-0.5 text-[11px] font-bold tracking-[0.18em] text-zinc-400 uppercase">
              {hud.coreName}
            </span>
          </div>
        )}

        {/* Top-Right Controls: Zoom Inspect Weapon & Mute */}
        <div
          className="pointer-events-auto flex items-center gap-2"
          onPointerDown={stopProp}
          onClick={stopProp}
        >
          <button
            type="button"
            onClick={() => engineRef.current?.toggleInspectMode()}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-display font-bold tracking-wider transition-all cursor-pointer backdrop-blur-md ${
              hud.inspectMode
                ? 'bg-emerald-500/25 border-emerald-400 text-emerald-200 shadow-[0_0_18px_rgba(74,222,128,0.4)]'
                : 'bg-zinc-900/80 border-zinc-700/80 text-zinc-200 hover:border-zinc-500'
            }`}
            title="Zoom & Inspect Obliterator Gun [I]"
          >
            {hud.inspectMode ? (
              <>
                <ZoomOut className="w-3.5 h-3.5" />
                <span>ARENA</span>
              </>
            ) : (
              <>
                <ZoomIn className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">INSPECT GUN</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => engineRef.current?.toggleMute()}
            className="p-2 rounded-lg bg-zinc-900/80 border border-zinc-700/80 text-zinc-300 hover:text-white hover:border-zinc-500 transition-colors cursor-pointer backdrop-blur-md"
            title="Toggle Audio [M]"
          >
            {hud.muted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* =================================================================== */}
      {/* LEFT SIDE KNIFE-HIT STYLE REMAINING PLASMA SPIKE RACK               */}
      {/* =================================================================== */}
      {!hud.inspectMode && hud.phase !== 'title' && (
        <aside className="pointer-events-none fixed left-4 sm:left-6 bottom-6 z-20 flex flex-col-reverse gap-1.5">
          {Array.from({ length: hud.ammoTotal }).map((_, idx) => {
            const isAvailable = idx < hud.ammoLeft;
            return (
              <div
                key={idx}
                className="flex items-center gap-1.5 transition-all duration-150"
                style={{
                  opacity: isAvailable ? 1 : 0.2,
                  transform: isAvailable ? 'scale(1)' : 'scale(0.82) translateX(-4px)',
                }}
              >
                <div
                  className="w-5 sm:w-6 h-2 rounded-sm border"
                  style={{
                    backgroundColor: isAvailable
                      ? activeTheme.kind === 'rainbow'
                        ? SPECTRUM[idx % 7]
                        : activeTheme.plasmaMid
                      : '#18181b',
                    borderColor: isAvailable ? '#ffffff' : '#3f3f46',
                    boxShadow: isAvailable
                      ? `0 0 10px ${activeTheme.kind === 'rainbow' ? SPECTRUM[idx % 7] : activeTheme.plasmaMid}`
                      : 'none',
                  }}
                />
              </div>
            );
          })}
          <span className="font-display text-[10px] font-bold tracking-widest text-zinc-400 mb-0.5">
            BOLTS
          </span>
        </aside>
      )}

      {/* =================================================================== */}
      {/* BOTTOM-RIGHT DOOM OBLITERATOR ARSENAL SWITCHER + OVERDRIVE METER    */}
      {/* =================================================================== */}
      <aside
        className="pointer-events-auto fixed right-3.5 sm:right-6 bottom-4 sm:bottom-6 z-20 flex flex-col items-end gap-2"
        onPointerDown={stopProp}
        onClick={stopProp}
      >
        {/* BFG Overdrive Status Pill */}
        {!hud.inspectMode && (
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border backdrop-blur-md transition-all ${
              hud.overdrivePrimed
                ? 'bg-emerald-950/90 border-emerald-400 text-emerald-200 animate-overdrive'
                : 'bg-zinc-900/80 border-zinc-800 text-zinc-400'
            }`}
          >
            <Flame
              className={`w-4 h-4 ${
                hud.overdrivePrimed ? 'text-emerald-400 animate-pulse' : 'text-zinc-500'
              }`}
            />
            <div className="flex flex-col">
              <span className="font-display text-[10px] font-extrabold tracking-widest leading-none">
                {hud.overdrivePrimed ? 'OVERDRIVE AKTIF!' : 'BFG SURGE'}
              </span>
              <div className="w-20 h-1.5 mt-1 rounded-full bg-zinc-800 overflow-hidden">
                <div
                  className="h-full transition-all duration-200 rounded-full"
                  style={{
                    width: `${hud.overdrivePrimed ? 100 : hud.overdriveCharge}%`,
                    backgroundColor: activeTheme.plasmaMid,
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* 4 DOOM Obliterator Weapon Variant Selector Buttons */}
        <div className="flex flex-col gap-1 p-1.5 rounded-xl bg-zinc-950/85 border border-zinc-800/90 backdrop-blur-md">
          <span className="px-1.5 text-[9px] font-display font-bold tracking-[0.2em] text-zinc-500 uppercase">
            ARSENAL [1-9 · 0 · Q · W · E]
          </span>
          <div className="grid grid-cols-4 gap-1">
            {WEAPON_ORDER.map((wId, idx) => {
              const t = WEAPON_THEMES[wId];
              const active = hud.selectedWeapon === wId;
              const isRainbow = t.kind === 'rainbow';
              const isNew = NEW_WEAPONS.has(wId);
              return (
                <button
                  key={wId}
                  type="button"
                  onClick={() => engineRef.current?.selectWeapon(wId)}
                  className={`group relative flex items-center justify-center md:justify-start gap-1.5 px-2 py-1.5 rounded-lg text-xs font-display font-bold transition-all cursor-pointer border ${
                    active
                      ? 'bg-zinc-800/95 text-white shadow-lg scale-105'
                      : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                  }`}
                  style={
                    active
                      ? {
                          borderColor: t.rarityColor ?? '#a1a1aa',
                          boxShadow: `0 0 14px ${t.rarityColor ?? '#a1a1aa'}66`,
                        }
                      : undefined
                  }
                  title={`${t.name} • ${t.rarity ?? ''}`}
                >
                  {isNew && (
                    <span
                      className="absolute -top-1.5 -right-1 px-1 rounded text-[7px] font-black tracking-wider text-zinc-950 leading-[11px]"
                      style={{ background: isRainbow ? RAINBOW_BG : t.rarityColor }}
                    >
                      NEW
                    </span>
                  )}
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{
                      background: isRainbow ? RAINBOW_BG : t.plasmaMid,
                      boxShadow: active ? `0 0 10px ${t.plasmaMid}` : 'none',
                    }}
                  />
                  <span className="hidden md:inline text-[10px] tracking-wider">
                    {t.short ?? wId.toUpperCase()}
                  </span>
                  <span className="md:hidden text-[10px]">{idx + 1}</span>
                </button>
              );
            })}
          </div>
        </div>
      </aside>

      {/* =================================================================== */}
      {/* WEAPON INSPECT SHOWCASE OVERLAY BANNER                              */}
      {/* =================================================================== */}
      {hud.inspectMode && (
        <div className="pointer-events-none fixed inset-x-0 top-16 z-20 flex flex-col items-center text-center px-4">
          <div className="px-4 py-2 rounded-xl bg-zinc-950/80 border border-zinc-700/80 backdrop-blur-md">
            <div
              className="inline-block mb-1 px-2 py-0.5 rounded-full text-[10px] font-display font-black tracking-[0.25em] text-zinc-950"
              style={{
                background: activeTheme.kind === 'rainbow' ? RAINBOW_BG : activeTheme.rarityColor,
                boxShadow: `0 0 16px ${activeTheme.rarityColor ?? '#ffffff'}aa`,
              }}
            >
              ★ {activeTheme.rarity ?? 'EPIC'} ★
            </div>
            <div
              className="font-display text-base sm:text-xl font-black tracking-[0.18em]"
              style={
                activeTheme.kind === 'rainbow'
                  ? {
                      backgroundImage: `linear-gradient(90deg, ${SPECTRUM.join(', ')})`,
                      WebkitBackgroundClip: 'text',
                      backgroundClip: 'text',
                      color: 'transparent',
                    }
                  : { color: activeTheme.plasmaMid }
              }
            >
              {activeTheme.name}
            </div>
            <div className="text-xs sm:text-sm font-semibold tracking-wider text-zinc-300">
              {activeTheme.subtitle} • KLIK / SPASI UNTUK UJI TEMBAK RECOIL
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* FRAMELESS FLOATING TITLE OVERLAY (SHOWS LIVE TARGET + LIVE GUN!)    */}
      {/* =================================================================== */}
      {hud.phase === 'title' && !hud.inspectMode && (
        <div className="pointer-events-none fixed inset-0 z-10 flex flex-col items-center justify-center px-4">
          <div className="pointer-events-auto flex flex-col items-center text-center px-6 py-4 rounded-2xl bg-zinc-950/68 border border-zinc-800/90 backdrop-blur-sm shadow-[0_0_50px_rgba(0,0,0,0.85)]">
            <div className="inline-flex items-center gap-1.5 text-[11px] font-display font-bold tracking-[0.25em] text-emerald-400 uppercase mb-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>DOOM 2D ARCADE PRECISION</span>
            </div>
            <h1 className="font-display text-2xl sm:text-4xl font-black tracking-[0.14em] text-white drop-shadow-[0_2px_16px_rgba(74,222,128,0.35)]">
              OBLITERATOR HIT
            </h1>

            <button
              type="button"
              onPointerDown={(e) => {
                e.stopPropagation();
                engineRef.current?.startGameAndFire();
              }}
              className="mt-3 inline-flex items-center gap-2.5 px-7 py-2.5 rounded-xl font-display text-sm sm:text-base font-extrabold tracking-[0.2em] text-zinc-950 transition-transform active:scale-95 hover:scale-105 cursor-pointer shadow-lg"
              style={{
                backgroundColor: activeTheme.plasmaMid,
                boxShadow: `0 0 26px ${activeTheme.plasmaMid}88`,
              }}
            >
              <Crosshair className="w-4 h-4 stroke-[2.6]" />
              <span>TEMBAK SEKARANG</span>
            </button>

            <span className="mt-2 text-xs font-semibold tracking-widest text-zinc-400">
              KLIK LAYAR ATAU TEKAN [SPASI]
            </span>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* INSTANT ZERO-LATENCY GAME OVER CARD                                 */}
      {/* =================================================================== */}
      {hud.phase === 'gameover' && !hud.inspectMode && (
        <div
          className="fixed inset-0 z-30 flex items-center justify-center bg-black/45 backdrop-blur-[2px] px-4"
          onPointerDown={stopProp}
        >
          <div className="flex flex-col items-center text-center w-full max-w-xs p-6 rounded-2xl bg-zinc-950/92 border border-rose-500/50 shadow-[0_0_60px_rgba(220,38,38,0.3)]">
            <span className="font-display text-xs font-extrabold tracking-[0.28em] text-rose-400 uppercase">
              BOLT TERPANTUL
            </span>
            <h2 className="mt-1 font-display text-3xl font-black tracking-wider text-white">
              SKOR {hud.score}
            </h2>

            <div className="mt-3 flex items-center justify-center gap-5 text-sm font-bold tracking-wider text-zinc-300">
              <span>REKOR: {hud.bestScore}</span>
              <span className="text-zinc-600">•</span>
              <span>WAVE: {hud.stage}</span>
            </div>

            <button
              type="button"
              onClick={() => engineRef.current?.restartGame()}
              className="mt-5 w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-display text-sm font-black tracking-[0.18em] text-zinc-950 transition-transform hover:scale-105 active:scale-95 cursor-pointer"
              style={{
                backgroundColor: activeTheme.plasmaMid,
                boxShadow: `0 0 24px ${activeTheme.plasmaMid}80`,
              }}
            >
              <RotateCcw className="w-4 h-4 stroke-[2.6]" />
              <span>MAIN LAGI</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
