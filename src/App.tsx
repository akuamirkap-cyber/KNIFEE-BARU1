import React, { useEffect, useState, useRef } from 'react';
import {
  Flame,
  Target,
  Sparkles,
  Layers,
  Compass,
  Wand2,
  Gamepad2,
  RotateCcw,
  Maximize2,
  Minimize2,
  ExternalLink,
  Smartphone,
  Play,
  Pause,
  X,
} from 'lucide-react';

import ScaledFrame from './components/ScaledFrame';
import { SlideActivityProvider } from './games/shared/SlideActivity';
import GunHitGame from './games/gunhit/App';

type SlideId = 'gunhit' | 'game2' | 'game4' | 'game5' | 'game6' | 'game7' | 'game8';

export interface GameSlide {
  id: SlideId;
  slideNumber: number;
  name: string;
  fullName: string;
  badge: string;
  tagline: string;
  weapons: string[];
  icon: React.ElementType;
  themeColor: string;
  borderColor: string;
  accentBg: string;
  path?: string;
  render: (active: boolean) => React.ReactNode;
}

export default function App() {
  const [fullscreenId, setFullscreenId] = useState<SlideId | null>(null);
  const [activeId, setActiveId] = useState<SlideId | null>('gunhit');
  const [columnsMode, setColumnsMode] = useState<'3-col' | '2-col' | '1-col'>('3-col');
  const [pageVisible, setPageVisible] = useState(() => !document.hidden);
  const slideRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const iframeRefs = useRef<Record<string, HTMLIFrameElement | null>>({});

  const [keys, setKeys] = useState<Record<SlideId, number>>({
    gunhit: 0,
    game2: 0,
    game4: 0,
    game5: 0,
    game6: 0,
    game7: 0,
    game8: 0,
  });

  const selectSlide = (id: SlideId) => {
    setActiveId(id);
    // Notify all iframes: resume selected, pause others to guarantee 0% CPU & 60 FPS
    slides.forEach((s) => {
      const iframe = iframeRefs.current[s.id];
      if (iframe?.contentWindow) {
        try {
          if (s.id === id) {
            iframe.contentWindow.postMessage('GAME_RESUME', '*');
          } else {
            iframe.contentWindow.postMessage('GAME_PAUSE', '*');
          }
        } catch {
          /* ignore cross-window communication errors */
        }
      }
    });
  };

  const reloadGame = (id: SlideId) => {
    selectSlide(id);
    setKeys((prev) => ({ ...prev, [id]: (prev[id] || 0) + 1 }));
  };

  const handleReloadAll = () => {
    const updatedKeys = { ...keys };
    (Object.keys(keys) as SlideId[]).forEach((id) => {
      updatedKeys[id] = (keys[id] || 0) + 1;
    });
    setKeys(updatedKeys);
  };

  const scrollToSlide = (id: SlideId) => {
    const el = slideRefs.current[id];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  // Sync iframe pause/resume whenever activeId changes
  useEffect(() => {
    if (!pageVisible) {
      slides.forEach((s) => {
        const iframe = iframeRefs.current[s.id];
        if (iframe?.contentWindow) {
          try {
            iframe.contentWindow.postMessage('GAME_PAUSE', '*');
          } catch {
            /* ignore */
          }
        }
      });
      return;
    }

    slides.forEach((s) => {
      const iframe = iframeRefs.current[s.id];
      if (iframe?.contentWindow) {
        try {
          if (s.id === activeId) {
            iframe.contentWindow.postMessage('GAME_RESUME', '*');
          } else {
            iframe.contentWindow.postMessage('GAME_PAUSE', '*');
          }
        } catch {
          /* ignore */
        }
      }
    });
  }, [activeId, pageVisible]);

  // Visibility change handling: freeze active game when browser tab is hidden
  useEffect(() => {
    const updateVisibility = () => setPageVisible(!document.hidden);
    document.addEventListener('visibilitychange', updateVisibility);
    return () => document.removeEventListener('visibilitychange', updateVisibility);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFullscreenId(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const baseUrl = import.meta.env.BASE_URL || '/';
  const cleanBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;

  const slides: GameSlide[] = [
    {
      id: 'gunhit',
      slideNumber: 1,
      name: 'Gun Hit Arcade (SGA)',
      fullName: 'Gun Hit Arcade (100 Stage Quest)',
      badge: '🎯 100 Stage Quest',
      tagline: 'Game tembak sasaran terkomplit dengan puluhan senjata nyata & bos legendaris.',
      weapons: ['🔫 Pistol', '⚡ Plasma', '🏏 Cricket', '✨ Golden AK', '🤖 Mecha Boss'],
      icon: Flame,
      themeColor: 'text-amber-400',
      borderColor: 'border-amber-500/40 hover:border-amber-400/80 shadow-amber-950/40',
      accentBg: 'bg-amber-500/20 text-amber-400',
      render: (active: boolean) => (
        <SlideActivityProvider active={active}>
          <ScaledFrame baseWidth={420} baseHeight={760}>
            <GunHitGame key={keys.gunhit} />
          </ScaledFrame>
        </SlideActivityProvider>
      ),
    },
    {
      id: 'game2',
      slideNumber: 2,
      name: 'Wheel Hit Ultra FX',
      fullName: 'Weapon Wheel Hit — Ultra FX Edition',
      badge: '🌀 Ultra FX',
      tagline: 'Efek putaran roda ultra-vibrant dengan impact partikel neon dinamis & ragam peluru.',
      weapons: ['✨ Neon Pulse', '⚡ Electric Bolt', '🔷 Crystal Dart', '💥 Heavy Shell'],
      icon: Sparkles,
      themeColor: 'text-cyan-400',
      borderColor: 'border-cyan-500/40 hover:border-cyan-400/80 shadow-cyan-950/40',
      accentBg: 'bg-cyan-500/20 text-cyan-400',
      path: `${cleanBase}games/game-2/index.html`,
      render: (active: boolean) => (
        <iframe
          ref={(el) => {
            iframeRefs.current.game2 = el;
          }}
          key={`game2-${keys.game2}`}
          src={`${cleanBase}games/game-2/index.html?standby=${active ? '0' : '1'}`}
          title="Weapon Wheel Hit"
          className="w-full h-full border-0 bg-black block"
          allow="autoplay; gamepad"
        />
      ),
    },
    {
      id: 'game4',
      slideNumber: 3,
      name: 'Weapon Hit 71 Senjata',
      fullName: 'Weapon Hit — 71 Senjata (Level 1 FX)',
      badge: '🔮 71 Senjata',
      tagline: 'Koleksi komprehensif 71 senjata dengan animasi tembakan, proyektil, recoil, dan audio synth.',
      weapons: ['🔫 71 Senjata', '💥 Muzzle Flash', '🎵 Synth Audio', '⚡ 7 Tipe Spawn'],
      icon: Layers,
      themeColor: 'text-purple-400',
      borderColor: 'border-purple-500/40 hover:border-purple-400/80 shadow-purple-950/40',
      accentBg: 'bg-purple-500/20 text-purple-400',
      path: `${cleanBase}games/game-4/index.html`,
      render: (active: boolean) => (
        <iframe
          ref={(el) => {
            iframeRefs.current.game4 = el;
          }}
          key={`game4-${keys.game4}`}
          src={`${cleanBase}games/game-4/index.html?standby=${active ? '0' : '1'}`}
          title="Weapon Hit 71 Senjata"
          className="w-full h-full border-0 bg-black block"
          allow="autoplay; gamepad"
        />
      ),
    },
    {
      id: 'game5',
      slideNumber: 4,
      name: 'Neon Ballistics',
      fullName: 'ARSENAL - Neon Ballistics (Level 01)',
      badge: '🔴 Neon Ballistics',
      tagline: 'Satu roda, tujuh hit bersih, dan 17 senjata 2D dengan animasi presisi dan suara khas.',
      weapons: ['🎯 17 Senjata', '✨ 7 Clean Hits', '🔊 Sfx Khusus', '📐 Presisi'],
      icon: Target,
      themeColor: 'text-rose-400',
      borderColor: 'border-rose-500/40 hover:border-rose-400/80 shadow-rose-950/40',
      accentBg: 'bg-rose-500/20 text-rose-400',
      path: `${cleanBase}games/game-5/index.html`,
      render: (active: boolean) => (
        <iframe
          ref={(el) => {
            iframeRefs.current.game5 = el;
          }}
          key={`game5-${keys.game5}`}
          src={`${cleanBase}games/game-5/index.html?standby=${active ? '0' : '1'}`}
          title="Neon Ballistics"
          className="w-full h-full border-0 bg-black block"
          allow="autoplay; gamepad"
        />
      ),
    },
    {
      id: 'game6',
      slideNumber: 5,
      name: 'Arsenal Wheel Hit Range',
      fullName: 'Arsenal Wheel Hit — 2D Weapon FX Range',
      badge: '🎯 Range Edition',
      tagline: 'Galeri tembak presisi Knife Hit dengan senjata elektro, api, sci-fi, dan firearms.',
      weapons: ['⚡ Electro', '🔥 Fire', '🚀 Sci-Fi', '🔫 Firearms', '🏹 Bow'],
      icon: Compass,
      themeColor: 'text-yellow-400',
      borderColor: 'border-yellow-500/40 hover:border-yellow-400/80 shadow-yellow-950/40',
      accentBg: 'bg-yellow-500/20 text-yellow-400',
      path: `${cleanBase}games/game-6/index.html`,
      render: (active: boolean) => (
        <iframe
          ref={(el) => {
            iframeRefs.current.game6 = el;
          }}
          key={`game6-${keys.game6}`}
          src={`${cleanBase}games/game-6/index.html?standby=${active ? '0' : '1'}`}
          title="Arsenal Wheel Hit Range"
          className="w-full h-full border-0 bg-black block"
          allow="autoplay; gamepad"
        />
      ),
    },
    {
      id: 'game7',
      slideNumber: 6,
      name: 'Ballistics Lab',
      fullName: 'Arsenal FX — 2D Ballistics Lab',
      badge: '🧪 Ballistics Lab',
      tagline: 'Galeri efek tembakan 2D: bentuk peluru, muzzle flash, impact, dan roda putar.',
      weapons: ['💥 Shape FX', '⚡ Flash Engine', '💥 Impact Ring', '🎯 Roda Putar'],
      icon: Target,
      themeColor: 'text-indigo-400',
      borderColor: 'border-indigo-500/40 hover:border-indigo-400/80 shadow-indigo-950/40',
      accentBg: 'bg-indigo-500/20 text-indigo-400',
      path: `${cleanBase}games/game-7/index.html`,
      render: (active: boolean) => (
        <iframe
          ref={(el) => {
            iframeRefs.current.game7 = el;
          }}
          key={`game7-${keys.game7}`}
          src={`${cleanBase}games/game-7/index.html?standby=${active ? '0' : '1'}`}
          title="Ballistics Lab"
          className="w-full h-full border-0 bg-black block"
          allow="autoplay; gamepad"
        />
      ),
    },
    {
      id: 'game8',
      slideNumber: 7,
      name: 'Knife-Hit Arsenal FX',
      fullName: 'Arsenal FX – Knife-Hit Weapon Effects',
      badge: '🐉 Knife-Hit FX',
      tagline: 'Koleksi senjata dragon, plasmacaster, sci-fi, dan firearms dengan efek benturan tajam.',
      weapons: ['🐉 Dragon Fang', '⚡ Plasmacaster', '🔮 Fantasy Edge', '🚀 Sci-Fi Blade'],
      icon: Wand2,
      themeColor: 'text-fuchsia-400',
      borderColor: 'border-fuchsia-500/40 hover:border-fuchsia-400/80 shadow-fuchsia-950/40',
      accentBg: 'bg-fuchsia-500/20 text-fuchsia-400',
      path: `${cleanBase}games/game-8/index.html`,
      render: (active: boolean) => (
        <iframe
          ref={(el) => {
            iframeRefs.current.game8 = el;
          }}
          key={`game8-${keys.game8}`}
          src={`${cleanBase}games/game-8/index.html?standby=${active ? '0' : '1'}`}
          title="Knife-Hit Arsenal FX"
          className="w-full h-full border-0 bg-black block"
          allow="autoplay; gamepad"
        />
      ),
    },
  ];

  const fullscreenSlide = slides.find((s) => s.id === fullscreenId);

  return (
    <div className="min-h-screen bg-[#04060c] text-white flex flex-col font-sans selection:bg-amber-500/30 selection:text-amber-200">
      {/* Ambient background glows */}
      <div className="pointer-events-none fixed -top-32 left-1/4 w-[500px] h-[300px] bg-cyan-500/10 rounded-full blur-3xl" />
      <div className="pointer-events-none fixed -bottom-32 right-1/4 w-[500px] h-[300px] bg-amber-500/10 rounded-full blur-3xl" />

      {/* Top Header Bar */}
      <header className="sticky top-0 z-40 bg-[#07090e]/95 backdrop-blur-md border-b border-white/10 px-3 sm:px-6 py-3">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          {/* Brand & Stats */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/20 shrink-0">
              <Gamepad2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-1.5">
                  GAME ARCADE HUB
                </h1>
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {slides.length} Slides Live
                </span>
              </div>
              <p className="text-xs text-neutral-400">
                Semua slide menampilkan grafik asli gamenya · Hanya game aktif yang bergerak (FPS 60 aman & 0% CPU standby)
              </p>
            </div>
          </div>

          {/* Quick Toolbar */}
          <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-end">
            {/* View Mode Toggle: 3 Kolom (Default), 2 Kolom, 1 Kolom */}
            <div className="inline-flex rounded-xl bg-slate-900 border border-white/10 p-1">
              <button
                onClick={() => setColumnsMode('3-col')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  columnsMode === '3-col'
                    ? 'bg-amber-400 text-neutral-950 shadow-sm'
                    : 'text-neutral-400 hover:text-white'
                }`}
                title="Tampilkan 3 Kolom ke Kanan (3 baris ke kanan, sisanya ke bawah)"
              >
                3 Kolom (Default)
              </button>
              <button
                onClick={() => setColumnsMode('2-col')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  columnsMode === '2-col'
                    ? 'bg-amber-400 text-neutral-950 shadow-sm'
                    : 'text-neutral-400 hover:text-white'
                }`}
                title="Tampilkan 2 Kolom"
              >
                2 Kolom
              </button>
              <button
                onClick={() => setColumnsMode('1-col')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  columnsMode === '1-col'
                    ? 'bg-amber-400 text-neutral-950 shadow-sm'
                    : 'text-neutral-400 hover:text-white'
                }`}
                title="Tampilkan 1 Kolom Fokus"
              >
                1 Kolom
              </button>
            </div>

            {/* Reset All */}
            <button
              onClick={handleReloadAll}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-white/5 hover:bg-white/10 text-neutral-200 hover:text-white rounded-xl border border-white/10 transition-colors active:scale-95 cursor-pointer"
              title={`Muat ulang seluruh ${slides.length} game`}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reset Semua</span>
            </button>
          </div>
        </div>

        {/* Quick Slide Navigation Bar */}
        <div className="max-w-7xl mx-auto mt-2 pt-2 border-t border-white/5 flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
          <span className="text-[11px] font-semibold text-neutral-400 shrink-0 mr-1 flex items-center gap-1">
            <Layers className="w-3 h-3 text-amber-400" /> Lompat:
          </span>
          {slides.map((s) => {
            const isCur = activeId === s.id;
            return (
              <button
                key={s.id}
                onClick={() => {
                  scrollToSlide(s.id);
                  selectSlide(s.id);
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors shrink-0 flex items-center gap-1 cursor-pointer border ${
                  isCur
                    ? 'bg-amber-400 text-neutral-950 border-amber-300 shadow-sm'
                    : 'bg-white/5 hover:bg-white/15 text-neutral-300 hover:text-white border-white/5'
                }`}
              >
                <span
                  className={`w-4 h-4 rounded-full text-[10px] flex items-center justify-center font-bold ${
                    isCur ? 'bg-neutral-950 text-amber-400' : 'bg-neutral-800 text-amber-400'
                  }`}
                >
                  {s.slideNumber}
                </span>
                <span className="max-w-[100px] truncate">{s.name}</span>
              </button>
            );
          })}
        </div>
      </header>

      {/* Main Content Area: 3 Columns Grid by Default */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-5 lg:p-6">
        {/* Helper Banner */}
        <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-amber-950/30 via-slate-900/60 to-slate-900/40 border border-amber-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs sm:text-sm font-bold text-neutral-200">
                Tampilan Awal Asli di Setiap Slide (3 Baris ke Kanan, Sisanya ke Bawah)
              </p>
              <p className="text-xs text-neutral-400 mt-0.5">
                Setiap slide menampilkan visual awal game yang sebenarnya. Game yang tidak dipencet otomatis diam/standby (0% CPU, FPS aman). Cukup <span className="text-amber-300 font-semibold">klik/pencet slide</span> untuk langsung mulai bermain!
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono text-amber-400/90 px-3 py-1.5 rounded-xl bg-black/40 border border-white/5 shrink-0">
            <span>3 Kolom ke Kanan</span>
            <span>•</span>
            <span>Total {slides.length} Game</span>
          </div>
        </div>

        {/* The Grid: 3 columns across on desktop/laptop, continuing downwards */}
        <div
          className={`grid gap-6 sm:gap-7 ${
            columnsMode === '3-col'
              ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
              : columnsMode === '2-col'
              ? 'grid-cols-1 md:grid-cols-2'
              : 'grid-cols-1 max-w-xl mx-auto'
          }`}
        >
          {slides.map((slide) => {
            const isPlaying = activeId === slide.id && pageVisible;

            return (
              <div
                key={slide.id}
                ref={(el) => {
                  slideRefs.current[slide.id] = el;
                }}
                className={`flex flex-col bg-slate-900/80 rounded-3xl border ${
                  isPlaying
                    ? 'border-amber-400 shadow-[0_0_30px_rgba(251,191,36,0.28)] ring-2 ring-amber-400/40'
                    : 'border-white/10 hover:border-white/30'
                } overflow-hidden shadow-2xl transition-all duration-200 group`}
              >
                {/* Slide Header Bar */}
                <div className="px-3.5 py-2.5 bg-slate-950/90 border-b border-white/10 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="px-2 py-0.5 rounded-md text-[11px] font-mono font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 shrink-0">
                      SLIDE {String(slide.slideNumber).padStart(2, '0')}
                    </span>
                    <div className="min-w-0">
                      <h2 className="text-xs sm:text-sm font-bold text-white truncate group-hover:text-amber-300 transition-colors">
                        {slide.name}
                      </h2>
                      <p className="text-[10.5px] text-neutral-400 truncate">
                        {slide.badge}
                      </p>
                    </div>
                  </div>

                  {/* Actions for this specific slide */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => reloadGame(slide.id)}
                      className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-neutral-300 hover:text-white transition-colors cursor-pointer"
                      title="Reset game ini"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        selectSlide(slide.id);
                        setFullscreenId(slide.id);
                      }}
                      className="p-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 hover:text-amber-300 border border-amber-500/20 transition-colors cursor-pointer"
                      title="Buka Layar Penuh"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                    </button>
                    {slide.path && (
                      <a
                        href={slide.path}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-neutral-300 hover:text-white transition-colors"
                        title="Buka di tab baru"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>

                {/* 9:16 Slide Container */}
                <div className="p-2 sm:p-3 bg-black/40 flex items-center justify-center flex-1">
                  <div className="w-full max-w-[380px] aspect-[9/16] relative rounded-2xl overflow-hidden shadow-inner border border-white/15 bg-black">
                    {/* Simulated Phone Bezel Gloss */}
                    <div className="absolute inset-0 pointer-events-none rounded-2xl ring-1 ring-white/10 z-20" />

                    {/* The Live Interactive Game (Always mounted so the initial canvas visual is rendered!) */}
                    {slide.render(isPlaying)}

                    {/* Standby Visual Overlay: Transparent so the real game visuals behind it are 100% visible! */}
                    {!isPlaying && (
                      <div
                        onClick={() => selectSlide(slide.id)}
                        className="absolute inset-0 z-30 cursor-pointer bg-black/25 hover:bg-black/10 transition-colors flex flex-col items-center justify-between p-4 group/standby select-none"
                      >
                        {/* Standby Top Indicator */}
                        <div className="w-full flex justify-between items-center">
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-black/75 text-amber-300 border border-white/15 backdrop-blur-md shadow-md">
                            SLIDE {String(slide.slideNumber).padStart(2, '0')}
                          </span>
                          <span className="text-[10px] font-semibold text-emerald-300 bg-black/75 px-2.5 py-0.5 rounded-full border border-emerald-500/40 backdrop-blur-md flex items-center gap-1.5 shadow-md">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            Standby (0% CPU)
                          </span>
                        </div>

                        {/* Center Action Prompt Button */}
                        <div className="flex flex-col items-center gap-2 transform group-hover/standby:scale-105 transition-transform duration-200">
                          <div className="w-14 h-14 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 text-neutral-950 flex items-center justify-center shadow-[0_0_28px_rgba(251,191,36,0.7)] border-2 border-white/70">
                            <Play className="w-7 h-7 fill-current ml-0.5" />
                          </div>
                          <span className="px-4 py-1.5 rounded-xl bg-black/85 backdrop-blur-md border border-white/20 text-white font-black text-xs tracking-wider uppercase shadow-xl">
                            Pencet Untuk Main
                          </span>
                        </div>

                        {/* Bottom Slide Info Tag */}
                        <div className="w-full text-center">
                          <span className="text-[11px] font-semibold text-white/95 bg-black/75 backdrop-blur-md px-3 py-1 rounded-full border border-white/15 truncate max-w-full inline-block shadow-md">
                            {slide.fullName}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Slide Footer Details */}
                <div className="px-3.5 py-2.5 bg-slate-950/90 border-t border-white/5 flex items-center justify-between text-xs text-neutral-400">
                  <span className="inline-flex items-center gap-1.5 truncate max-w-[70%]">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        isPlaying ? 'bg-emerald-400 animate-pulse' : 'bg-neutral-600'
                      } shrink-0`}
                    />
                    <span className="truncate text-[11px]">
                      {isPlaying ? '⚡ Sedang Dimainkan' : slide.tagline}
                    </span>
                  </span>
                  <span className="font-mono text-[10px] text-neutral-500 shrink-0">
                    9:16 PORTRAIT
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* Fullscreen / Theater Modal */}
      {fullscreenSlide && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-4">
          <div className="w-full max-w-md flex flex-col bg-slate-900 rounded-3xl border border-white/20 overflow-hidden shadow-2xl relative max-h-[96vh]">
            {/* Modal Header */}
            <div className="px-4 py-3 bg-slate-950 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md text-xs font-mono font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  SLIDE {String(fullscreenSlide.slideNumber).padStart(2, '0')}
                </span>
                <span className="text-sm font-bold text-white truncate max-w-[180px]">
                  {fullscreenSlide.fullName}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => reloadGame(fullscreenSlide.id)}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-white transition-colors cursor-pointer"
                  title="Reload Game"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                {fullscreenSlide.path && (
                  <a
                    href={fullscreenSlide.path}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-white transition-colors"
                    title="Buka di tab baru"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
                <button
                  onClick={() => setFullscreenId(null)}
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                  title="Tutup (Esc)"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal 9:16 Frame */}
            <div className="p-3 bg-black flex items-center justify-center flex-1 overflow-hidden">
              <div className="w-full max-w-[380px] aspect-[9/16] relative rounded-2xl overflow-hidden border border-white/20 bg-black">
                {fullscreenSlide.render(true)}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-4 py-2.5 bg-slate-950 border-t border-white/5 flex items-center justify-between text-xs text-neutral-400">
              <span className="truncate">{fullscreenSlide.tagline}</span>
              <button
                onClick={() => setFullscreenId(null)}
                className="px-2.5 py-1 rounded bg-amber-400 text-neutral-950 font-bold text-xs hover:bg-amber-300 transition-colors cursor-pointer shrink-0 ml-2"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
