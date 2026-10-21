import React, { useEffect, useState, useRef } from 'react';
import {
  Flame,
  Maximize2,
  Minimize2,
  RotateCcw,
  Sparkles,
  Sword,
  Disc,
  Shield,
  Zap,
  Target,
  Waves,
  Rocket,
  ChevronLeft,
  ChevronRight,
  Play,
} from 'lucide-react';

import ScaledFrame from './components/ScaledFrame';
import { SlideActivityProvider } from './games/shared/SlideActivity';
import GunHitGame from './games/gunhit/App';

type SlideId = 'gunhit' | 'firework' | 'fireworkgun' | 'keris' | 'rainbow' | 'weaponskins' | 'obliterator' | 'gunhitdev' | 'sharkgun';

interface GameSlide {
  id: SlideId;
  name: string;
  fullName: string;
  badge: string;
  tagline: string;
  weapons: string[];
  icon: React.ElementType;
  themeColor: string;
  borderColor: string;
  accentBg: string;
  render: (active: boolean) => React.ReactNode;
}

function StandbyCard({
  name,
  badge,
  tagline,
  weapons,
  icon: Icon,
  themeColor,
  accentBg,
  onActivate,
}: {
  name: string;
  badge: string;
  tagline: string;
  weapons: string[];
  icon: React.ElementType;
  themeColor: string;
  accentBg: string;
  onActivate: () => void;
}) {
  return (
    <div
      onClick={onActivate}
      className="w-full h-full flex flex-col items-center justify-between p-4 sm:p-5 text-center cursor-pointer bg-gradient-to-b from-neutral-900/90 via-neutral-950 to-black select-none group transition-colors hover:from-neutral-900"
    >
      <div className="flex flex-col items-center gap-2 mt-3 sm:mt-4">
        <div
          className={`w-14 h-14 rounded-2xl ${accentBg} flex items-center justify-center border border-white/10 shadow-lg group-hover:scale-105 group-hover:border-white/30 transition-all`}
        >
          <Icon className={`w-7 h-7 ${themeColor}`} />
        </div>
        <span className="text-[10px] sm:text-[11px] font-bold tracking-wider uppercase px-2.5 py-0.5 rounded-full bg-white/10 text-white/80 border border-white/10">
          {badge}
        </span>
        <h3 className="text-base sm:text-lg font-black text-white mt-1 leading-tight group-hover:text-amber-300 transition-colors">
          {name}
        </h3>
        <p className="text-[11px] sm:text-xs text-neutral-400 max-w-[220px] leading-relaxed line-clamp-2">
          {tagline}
        </p>
      </div>

      <div className="w-full max-w-[240px] py-2 px-3 rounded-xl bg-white/5 border border-white/5 flex flex-wrap justify-center gap-1 text-[10px] text-neutral-300">
        {weapons.slice(0, 5).map((w, i) => (
          <span key={i} className="px-1.5 py-0.5 rounded bg-black/40 border border-white/5 font-mono">
            {w}
          </span>
        ))}
      </div>

      <div className="mb-3 sm:mb-4 flex flex-col items-center gap-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onActivate();
          }}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-neutral-950 font-bold text-xs shadow-lg shadow-amber-500/20 active:scale-95 transition-all cursor-pointer"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>Mainkan Game</span>
        </button>
        <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Standby · 0% CPU & FPS Aman
        </span>
      </div>
    </div>
  );
}

export default function App() {
  const [fullscreenId, setFullscreenId] = useState<SlideId | null>(null);
  const [activeId, setActiveId] = useState<SlideId | null>('gunhit');
  const [pageVisible, setPageVisible] = useState(() => !document.hidden);
  const [keys, setKeys] = useState<Record<SlideId, number>>({
    gunhit: 0,
    firework: 0,
    fireworkgun: 0,
    keris: 0,
    rainbow: 0,
    weaponskins: 0,
    obliterator: 0,
    gunhitdev: 0,
    sharkgun: 0,
  });

  const reloadGame = (id: SlideId) => {
    setActiveId(id);
    setKeys((prev) => ({ ...prev, [id]: (prev[id] || 0) + 1 }));
  };

  const focusGame = (id: SlideId) => {
    setActiveId(id);
    setFullscreenId(id);
  };

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -360, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 360, behavior: 'smooth' });
    }
  };

  // A background browser tab is paused too, including the currently selected game.
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
      name: 'SGA',
      fullName: 'Gun Hit Arcade',
      badge: '🎯 100 Stage Quest',
      tagline: 'Game tembak sasaran terkomplit dengan puluhan senjata nyata & bos legendaris.',
      weapons: ['🔫 Pistol', '⚡ Plasma', '🏏 Cricket', '✨ Golden AK', '🤖 Mecha Boss'],
      icon: Flame,
      themeColor: 'text-amber-400',
      borderColor: 'border-amber-500/40 hover:border-amber-400/80 shadow-amber-950/40',
      accentBg: 'bg-amber-500/20 text-amber-400',
      render: () => (
        <ScaledFrame baseWidth={420} baseHeight={760}>
          <GunHitGame key={keys.gunhit} />
        </ScaledFrame>
      ),
    },
    {
      id: 'firework',
      name: 'Firework',
      fullName: 'Gun Hit: Firework & Gems',
      badge: '🎆 Firework & Gems',
      tagline: '5 Senjata Neon Berkilau dengan ledakan kembang api spektakuler.',
      weapons: ['🗡️ Keris Emas', '🕳️ Black Hole', '🪀 Yoyo', '💎 Diamond', '🔮 Crystal'],
      icon: Sparkles,
      themeColor: 'text-amber-300',
      borderColor: 'border-amber-400/40 hover:border-amber-300/80 shadow-amber-950/40',
      accentBg: 'bg-amber-500/20 text-amber-300',
      render: (active: boolean) =>
        active ? (
          <iframe
            key={`firework-${keys.firework}`}
            src={`${cleanBase}games/firework/index.html`}
            title="Gun Hit: Firework"
            className="w-full h-full border-0 bg-black block"
            allow="autoplay"
          />
        ) : (
          <StandbyCard
            name="Firework"
            badge="🎆 Firework & Gems"
            tagline="5 Senjata Neon Berkilau dengan ledakan kembang api spektakuler."
            weapons={['🗡️ Keris Emas', '🕳️ Black Hole', '🪀 Yoyo', '💎 Diamond', '🔮 Crystal']}
            icon={Sparkles}
            themeColor="text-amber-300"
            accentBg="bg-amber-500/20 text-amber-300"
            onActivate={() => setActiveId('firework')}
          />
        ),
    },
    {
      id: 'fireworkgun',
      name: 'Firework 8-Gun',
      fullName: 'GUN HIT: 8 Senjata Seru',
      badge: '💥 8 Senjata Seru',
      tagline: 'Tembak papan berputar dengan 8 senjata: Meriam Bambu, Bazooka, RPG, Shark, dan lainnya.',
      weapons: ['🎆 Firework', '🎋 Bambu', '💥 Bazooka', '🚀 RPG', '🦈 Shark', '🔫 Soaker'],
      icon: Rocket,
      themeColor: 'text-orange-400',
      borderColor: 'border-orange-500/40 hover:border-orange-400/80 shadow-orange-950/40',
      accentBg: 'bg-orange-500/20 text-orange-400',
      render: (active: boolean) =>
        active ? (
          <iframe
            key={`fireworkgun-${keys.fireworkgun}`}
            src={`${cleanBase}games/fireworkgun/index.html`}
            title="GUN HIT: 8 Senjata Seru"
            className="w-full h-full border-0 bg-black block"
            allow="autoplay"
          />
        ) : (
          <StandbyCard
            name="Firework 8-Gun"
            badge="💥 8 Senjata Seru"
            tagline="Tembak papan berputar dengan 8 senjata: Meriam Bambu, Bazooka, RPG, Shark, dan lainnya."
            weapons={['🎆 Firework', '🎋 Bambu', '💥 Bazooka', '🚀 RPG', '🦈 Shark', '🔫 Soaker']}
            icon={Rocket}
            themeColor="text-orange-400"
            accentBg="bg-orange-500/20 text-orange-400"
            onActivate={() => setActiveId('fireworkgun')}
          />
        ),
    },
    {
      id: 'keris',
      name: 'Keris Sakti',
      fullName: 'Keris Sakti: Gun Hit',
      badge: '🗡️ Keris Sakti',
      tagline: 'Kuasai kekuatan pusaka mistis Jawa bertuah di setiap tingkatan level bos kuno.',
      weapons: ['🗡️ Keris Naga', '🗡️ Keris Brojol', '🗡️ Pusaka Emas'],
      icon: Sword,
      themeColor: 'text-yellow-400',
      borderColor: 'border-yellow-500/40 hover:border-yellow-400/80 shadow-yellow-950/40',
      accentBg: 'bg-yellow-500/20 text-yellow-400',
      render: (active: boolean) =>
        active ? (
          <iframe
            key={`keris-${keys.keris}`}
            src={`${cleanBase}games/keris/index.html`}
            title="Keris Sakti: Gun Hit"
            className="w-full h-full border-0 bg-black block"
            allow="autoplay"
          />
        ) : (
          <StandbyCard
            name="Keris Sakti"
            badge="🗡️ Keris Sakti"
            tagline="Kuasai kekuatan pusaka mistis Jawa bertuah di setiap tingkatan level bos kuno."
            weapons={['🗡️ Keris Naga', '🗡️ Keris Brojol', '🗡️ Pusaka Emas']}
            icon={Sword}
            themeColor="text-yellow-400"
            accentBg="bg-yellow-500/20 text-yellow-400"
            onActivate={() => setActiveId('keris')}
          />
        ),
    },
    {
      id: 'rainbow',
      name: 'Rainbow Gun',
      fullName: 'Rainbow Gun Arcade',
      badge: '🌈 Holy Rainbow',
      tagline: 'PRISM-07 Holy Railgun dengan cincin pelangi dinamis mode Sway, Pulse & Chaos Boss.',
      weapons: ['🌈 Prism Railgun', '🕳️ Void Black Hole'],
      icon: Disc,
      themeColor: 'text-cyan-400',
      borderColor: 'border-cyan-500/40 hover:border-cyan-400/80 shadow-cyan-950/40',
      accentBg: 'bg-cyan-500/20 text-cyan-400',
      render: (active: boolean) =>
        active ? (
          <iframe
            key={`rainbow-${keys.rainbow}`}
            src={`${cleanBase}games/rainbow/index.html`}
            title="Rainbow Gun Arcade"
            className="w-full h-full border-0 bg-black block"
            allow="autoplay"
          />
        ) : (
          <StandbyCard
            name="Rainbow Gun"
            badge="🌈 Holy Rainbow"
            tagline="PRISM-07 Holy Railgun dengan cincin pelangi dinamis mode Sway, Pulse & Chaos Boss."
            weapons={['🌈 Prism Railgun', '🕳️ Void Black Hole']}
            icon={Disc}
            themeColor="text-cyan-400"
            accentBg="bg-cyan-500/20 text-cyan-400"
            onActivate={() => setActiveId('rainbow')}
          />
        ),
    },
    {
      id: 'weaponskins',
      name: 'Arsenal Wheel',
      fullName: 'Arsenal Skins & Wheel',
      badge: '⚙️ 11 Arsenal Skins',
      tagline: 'Eksplorasi 11 skin senjata dengan recoil partikel dan tantangan Wheel Challenge.',
      weapons: ['🗡️ Keris', '🕳️ Hole', '🪀 Yoyo', '💎 Diamond', '🔮 Crystal', '❄️ Snow', '💧 Water', '🎉 Party'],
      icon: Shield,
      themeColor: 'text-purple-400',
      borderColor: 'border-purple-500/40 hover:border-purple-400/80 shadow-purple-950/40',
      accentBg: 'bg-purple-500/20 text-purple-400',
      render: (active: boolean) =>
        active ? (
          <iframe
            key={`weaponskins-${keys.weaponskins}`}
            src={`${cleanBase}games/weaponskins/index.html`}
            title="Arsenal Skins & Wheel"
            className="w-full h-full border-0 bg-black block"
            allow="autoplay"
          />
        ) : (
          <StandbyCard
            name="Arsenal Wheel"
            badge="⚙️ 11 Arsenal Skins"
            tagline="Eksplorasi 11 skin senjata dengan recoil partikel dan tantangan Wheel Challenge."
            weapons={['🗡️ Keris', '🕳️ Hole', '🪀 Yoyo', '💎 Diamond', '🔮 Crystal', '❄️ Snow']}
            icon={Shield}
            themeColor="text-purple-400"
            accentBg="bg-purple-500/20 text-purple-400"
            onActivate={() => setActiveId('weaponskins')}
          />
        ),
    },
    {
      id: 'obliterator',
      name: 'Obliterator',
      fullName: 'Obliterator Hit: DOOM',
      badge: '💥 Heavy Obliterator',
      tagline: 'Penghancur Inti Argent Core brutal! Kumpulkan gems & aktifkan Overdrive Charge.',
      weapons: ['💥 BFG 9000', '⚡ Maykr Laser', '🍌 Banana', '🐝 Beehive', '🔮 Crystal'],
      icon: Zap,
      themeColor: 'text-rose-400',
      borderColor: 'border-rose-500/40 hover:border-rose-400/80 shadow-rose-950/40',
      accentBg: 'bg-rose-500/20 text-rose-400',
      render: (active: boolean) =>
        active ? (
          <iframe
            key={`obliterator-${keys.obliterator}`}
            src={`${cleanBase}games/obliterator/index.html`}
            title="Obliterator Hit: DOOM"
            className="w-full h-full border-0 bg-black block"
            allow="autoplay"
          />
        ) : (
          <StandbyCard
            name="Obliterator"
            badge="💥 Heavy Obliterator"
            tagline="Penghancur Inti Argent Core brutal! Kumpulkan gems & aktifkan Overdrive Charge."
            weapons={['💥 BFG 9000', '⚡ Maykr Laser', '🍌 Banana', '🐝 Beehive', '🔮 Crystal']}
            icon={Zap}
            themeColor="text-rose-400"
            accentBg="bg-rose-500/20 text-rose-400"
            onActivate={() => setActiveId('obliterator')}
          />
        ),
    },
    {
      id: 'gunhitdev',
      name: 'Tap & Stick',
      fullName: 'Gun Hit: Tap & Stick',
      badge: '🎯 Tap & Stick',
      tagline: 'Hypercasual 2D tap shooter: putar, bidik waktu, dan tancapkan ke target berputar.',
      weapons: ['🗡️ Keris Jawa', '🕳️ Black Hole', '🪀 Yoyo Neon', '💎 Diamond Gun', '🔮 Crystal Prism'],
      icon: Target,
      themeColor: 'text-emerald-400',
      borderColor: 'border-emerald-500/40 hover:border-emerald-400/80 shadow-emerald-950/40',
      accentBg: 'bg-emerald-500/20 text-emerald-400',
      render: (active: boolean) =>
        active ? (
          <iframe
            key={`gunhitdev-${keys.gunhitdev}`}
            src={`${cleanBase}games/gunhitdev/index.html`}
            title="Gun Hit: Tap & Stick"
            className="w-full h-full border-0 bg-black block"
            allow="autoplay"
          />
        ) : (
          <StandbyCard
            name="Tap & Stick"
            badge="🎯 Tap & Stick"
            tagline="Hypercasual 2D tap shooter: putar, bidik waktu, dan tancapkan ke target berputar."
            weapons={['🗡️ Keris Jawa', '🕳️ Black Hole', '🪀 Yoyo Neon', '💎 Diamond Gun']}
            icon={Target}
            themeColor="text-emerald-400"
            accentBg="bg-emerald-500/20 text-emerald-400"
            onActivate={() => setActiveId('gunhitdev')}
          />
        ),
    },
    {
      id: 'sharkgun',
      name: 'Shark Predator',
      fullName: 'Shark Gun: Predator',
      badge: '🦈 Apex Shark',
      tagline: 'Kuasai predator puncak samudra, kumpulkan sirip emas, dan taklukkan Kraken!',
      weapons: ['🦈 Great White', '🦈 Megalodon', '🦈 Hammerhead', '🦈 Mako', '🦈 Tiger Shark'],
      icon: Waves,
      themeColor: 'text-sky-400',
      borderColor: 'border-sky-500/40 hover:border-sky-400/80 shadow-sky-950/40',
      accentBg: 'bg-sky-500/20 text-sky-400',
      render: (active: boolean) =>
        active ? (
          <iframe
            key={`sharkgun-${keys.sharkgun}`}
            src={`${cleanBase}games/sharkgun/index.html`}
            title="Shark Gun: Predator"
            className="w-full h-full border-0 bg-black block"
            allow="autoplay"
          />
        ) : (
          <StandbyCard
            name="Shark Predator"
            badge="🦈 Apex Shark"
            tagline="Kuasai predator puncak samudra, kumpulkan sirip emas, dan taklukkan Kraken!"
            weapons={['🦈 Great White', '🦈 Megalodon', '🦈 Hammerhead', '🦈 Mako']}
            icon={Waves}
            themeColor="text-sky-400"
            accentBg="bg-sky-500/20 text-sky-400"
            onActivate={() => setActiveId('sharkgun')}
          />
        ),
    },
  ];

  const currentSlide = slides.find((s) => s.id === (fullscreenId || activeId));

  return (
    <div className="relative w-screen h-screen bg-[#020408] text-white flex flex-col overflow-hidden select-none font-sans">
      <div className="pointer-events-none fixed -top-32 left-1/4 w-[500px] h-[300px] bg-cyan-500/10 rounded-full blur-3xl" />
      <div className="pointer-events-none fixed -bottom-32 right-1/4 w-[500px] h-[300px] bg-amber-500/10 rounded-full blur-3xl" />

      <header className="h-[36px] flex-shrink-0 z-30 flex items-center justify-between px-2 sm:px-4 bg-neutral-950/95 border-b border-white/10 backdrop-blur-md">
        <div className="flex items-center gap-2 overflow-hidden">
          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-amber-400/20 border border-amber-400/40 text-amber-300 font-bold text-[11px] shrink-0">
            <span>SGA + 8 SLIDE</span>
          </span>
          <span className="text-[11px] text-neutral-300 font-medium truncate hidden md:inline">
            Slide Aktif: <strong className="text-white">{currentSlide?.name}</strong> · Slide lain otomatis standby (0% CPU, FPS 60 mulus)
          </span>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {fullscreenId !== null ? (
            <>
              <span className="text-xs text-amber-300 font-bold hidden sm:inline mr-1">
                {currentSlide?.fullName}
              </span>
              <button
                onClick={() => reloadGame(fullscreenId)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-md border border-white/20 bg-white/10 text-white font-bold text-xs hover:bg-white/20 transition cursor-pointer"
                title="Restart Game Ini"
              >
                <RotateCcw className="w-3 h-3" /> <span className="hidden sm:inline">Restart</span>
              </button>
              <button
                onClick={() => setFullscreenId(null)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-400 text-neutral-950 font-bold text-xs hover:bg-amber-300 transition cursor-pointer"
              >
                <Minimize2 className="w-3 h-3" />
                <span>Semua Slide</span>
              </button>
            </>
          ) : (
            <>
              <div className="flex items-center gap-1 mr-1">
                <button
                  onClick={scrollLeft}
                  className="p-1 rounded bg-white/5 hover:bg-white/15 text-neutral-300 hover:text-white transition cursor-pointer"
                  title="Geser Kiri"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={scrollRight}
                  className="p-1 rounded bg-white/5 hover:bg-white/15 text-neutral-300 hover:text-white transition cursor-pointer"
                  title="Geser Kanan"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
              <span className="text-[11px] text-neutral-400 font-mono hidden lg:inline">
                Pilih slide untuk mainkan · Klik ⤢ untuk perbesar
              </span>
            </>
          )}
        </div>
      </header>

      {/* Slide Carousel Track: SGA on the far left, followed by the slides to its right */}
      <main
        ref={scrollContainerRef}
        className="relative flex-1 w-full h-[calc(100vh-36px)] p-1.5 sm:p-2 flex items-center justify-start overflow-x-auto overflow-y-hidden scroll-smooth"
      >
        <div
          className="h-full w-max flex-shrink-0 mx-auto flex items-center gap-2 sm:gap-2.5 md:gap-3"
          style={{ maxHeight: 'calc(100vh - 44px)' }}
        >
          {slides.map((slide, idx) => {
            const Icon = slide.icon;
            const expanded = fullscreenId === slide.id;
            const active = activeId === slide.id && pageVisible && (fullscreenId === null || expanded);

            return (
              <div
                key={slide.id}
                onPointerDownCapture={() => setActiveId(slide.id)}
                onFocusCapture={() => setActiveId(slide.id)}
                className={`group relative aspect-[9/16] flex-shrink-0 rounded-2xl border-2 ${
                  expanded
                    ? 'border-amber-400 shadow-[0_0_80px_rgba(251,191,36,0.3)]'
                    : active
                    ? `${slide.borderColor} ring-2 ring-amber-400/50`
                    : 'border-white/10 hover:border-white/30'
                } bg-neutral-950 shadow-2xl flex flex-col overflow-hidden transition-[border-color,box-shadow] duration-200`}
                style={{
                  height: 'min(calc(100vh - 48px), calc((100vw - 16px) * 16 / 9))',
                  display: fullscreenId !== null && !expanded ? 'none' : undefined,
                }}
              >
                <div
                  className={`h-[28px] flex-shrink-0 px-2.5 ${active ? 'bg-neutral-900/95' : 'bg-neutral-950/90'} border-b border-white/10 flex items-center justify-between z-20 text-[11px]`}
                  style={{ display: expanded ? 'none' : undefined }}
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-white/10 text-neutral-300">
                      #{idx + 1}
                    </span>
                    <Icon className={`w-3.5 h-3.5 ${slide.themeColor} flex-shrink-0`} />
                    <span
                      className="font-bold text-white truncate text-xs"
                      title={slide.fullName}
                      aria-label={`${slide.fullName} (${slide.name})`}
                    >
                      {slide.name}
                    </span>
                    {active ? (
                      <span className="ml-1 h-1.5 w-1.5 rounded-full bg-emerald-400 shrink-0 animate-ping" title="Sedang Aktif" />
                    ) : (
                      <span className="ml-1 text-[9px] text-neutral-500 font-mono">standby</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => reloadGame(slide.id)}
                      className="p-1 rounded hover:bg-white/15 text-neutral-400 hover:text-white transition cursor-pointer"
                      title={`Restart ${slide.fullName}`}
                    >
                      <RotateCcw className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => focusGame(slide.id)}
                      className="p-1 rounded hover:bg-white/15 text-neutral-400 hover:text-white transition cursor-pointer"
                      title={`Perbesar ${slide.fullName}`}
                    >
                      <Maximize2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                <div
                  className={`relative flex-1 min-h-0 w-full overflow-hidden bg-black flex items-center justify-center ${
                    active ? '' : 'slide-paused'
                  }`}
                >
                  <SlideActivityProvider active={active}>{slide.render(active)}</SlideActivityProvider>
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
