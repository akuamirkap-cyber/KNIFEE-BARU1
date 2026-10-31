import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { SgaBackgroundTheme, SgaBgThemeOption } from '../game/backgroundThemes';
import type { SgaGameSpeed } from '../game/gameSpeed';
import DiamondSprite from '../../shared/DiamondSprite';

type Props = {
  closing: boolean;
  muted: boolean;
  volume: number;
  sfxEnabled: boolean;
  musicEnabled: boolean;
  speed: SgaGameSpeed;
  speedOptions: readonly SgaGameSpeed[];
  themes: readonly SgaBgThemeOption[];
  theme: SgaBackgroundTheme;
  onClose: () => void;
  onMute: () => void;
  onSfx: () => void;
  onMusic: () => void;
  onVolume: (value: number) => void;
  onSpeed: (value: SgaGameSpeed) => void;
  onTheme: (value: SgaBackgroundTheme) => void;
  onReplayIntro: () => void;
  onSpecial: (stage: 'boulder' | 'bonus' | 'treasure') => void;
  formatSpeed: (value: SgaGameSpeed) => string;
};

function Toggle({ on }: { on: boolean }) {
  return (
    <span className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${on ? 'bg-[#3fdc72]' : 'bg-white/20'}`}>
      <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${on ? 'left-[18px]' : 'left-0.5'}`} />
    </span>
  );
}

export default function SgaSettingsPanel({
  closing, muted, volume, sfxEnabled, musicEnabled, speed, speedOptions, themes, theme,
  onClose, onMute, onSfx, onMusic, onVolume, onSpeed, onTheme, onReplayIntro, onSpecial, formatSpeed,
}: Props) {
  const [advanced, setAdvanced] = useState(false);
  const stripRef = useRef<HTMLDivElement>(null);
  const selectedTheme = themes.find((item) => item.id === theme) ?? themes[0];
  const percent = muted ? 0 : Math.round(volume * 100);

  useEffect(() => {
    const node = stripRef.current?.querySelector<HTMLElement>(`[data-theme="${theme}"]`);
    node?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
  }, [theme]);

  return (
    <div className={`a absolute inset-0 z-[70] grid place-items-center px-5 ${closing ? 'out-fade pointer-events-none' : 'in-fade'}`} style={{ '--d': '0ms', '--dur': closing ? '380ms' : '300ms' } as CSSProperties}>
      <button type="button" aria-label="Tutup pengaturan" onClick={onClose} className="absolute inset-0 cursor-default bg-black/55 backdrop-blur-[2px]" />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="gunhit-settings-title"
        className={`relative w-full max-w-[350px] max-h-[min(720px,94%)] overflow-y-auto thin-scroll rounded-[24px] border-2 border-white/15 p-3.5 text-white shadow-[0_20px_50px_rgba(0,0,0,.6),inset_0_1px_0_rgba(255,255,255,.14)] ${closing ? 'st-pop-out' : 'st-pop-in'}`}
        style={{ background: 'linear-gradient(180deg, #17404af0 0%, #0e1519f5 45%, #080c0ff8 100%)' }}
      >
        <header className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-white/10 text-lg">⚙️</span>
          <div className="min-w-0 flex-1">
            <h2 id="gunhit-settings-title" className="font-title text-[20px] leading-none tracking-wide text-white">PENGATURAN</h2>
            <p className="mt-1 font-title text-[9px] tracking-[.14em] text-white/55">AUDIO · TEMA · GAME SGA</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Tutup" className="press grid h-9 w-9 place-items-center rounded-xl border-2 border-white/20 bg-white/10 text-base text-white">✕</button>
        </header>

        <section className="mt-3 rounded-2xl border border-white/10 bg-black/35 p-2.5">
          <div className="flex items-center gap-2.5">
            <button type="button" onClick={onMute} aria-label="Bisukan semua efek" className="press grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-b from-[#38bdf8] to-[#0369a1] text-lg shadow-[0_3px_0_#0c4a6e]">
              {muted || volume === 0 ? '🔇' : volume < 0.5 ? '🔉' : '🔊'}
            </button>
            <div className="relative h-7 flex-1">
              <div className="absolute inset-x-0 top-1/2 h-2 -translate-y-1/2 rounded-full bg-black/50 shadow-inner" />
              <div className="absolute left-0 top-1/2 h-2 -translate-y-1/2 rounded-full bg-gradient-to-r from-[#22c55e] to-[#86efac] shadow-[0_0_8px_rgba(34,197,94,.55)]" style={{ width: `${percent}%` }} />
              <div className="pointer-events-none absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-[#16a34a] bg-white shadow" style={{ left: `${percent}%` }} />
              <input type="range" min={0} max={100} step={1} value={percent} onChange={(event) => onVolume(Number(event.target.value) / 100)} aria-label="Volume" className="absolute inset-0 h-full w-full cursor-pointer opacity-0" />
            </div>
            <span className="font-title w-11 text-right text-[14px] text-[#86efac]">{percent}%</span>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button type="button" onClick={onSfx} className="press font-title flex h-9 items-center justify-between gap-2 rounded-xl bg-white/[.06] px-3 text-[12px] text-white">
              <span>🎯 Efek</span><Toggle on={sfxEnabled && !muted} />
            </button>
            <button type="button" onClick={onMusic} className="press font-title flex h-9 items-center justify-between gap-2 rounded-xl bg-white/[.06] px-3 text-[12px] text-white">
              <span>🎵 Musik</span><Toggle on={musicEnabled} />
            </button>
          </div>
        </section>

        <section className="mt-3">
          <div className="flex items-baseline justify-between">
            <span className="font-title text-[11px] tracking-[.14em] text-white/55">TEMA LATAR</span>
            <span className="font-title text-[11px] text-white">{selectedTheme?.icon} {selectedTheme?.label}</span>
          </div>
          <div ref={stripRef} className="no-scrollbar smooth-scroll -mx-1 mt-1.5 flex snap-x snap-proximity gap-1.5 overflow-x-auto px-1 py-1" style={{ WebkitMaskImage: 'linear-gradient(90deg,transparent,#000 10px,#000 calc(100% - 10px),transparent)', maskImage: 'linear-gradient(90deg,transparent,#000 10px,#000 calc(100% - 10px),transparent)' }}>
            {themes.map((item) => {
              const active = theme === item.id;
              return (
                <button key={item.id} type="button" data-theme={item.id} onClick={() => onTheme(item.id)} title={item.desc} aria-pressed={active} className="press relative flex h-[58px] w-[54px] shrink-0 snap-center flex-col items-center justify-center gap-0.5 rounded-xl border-2" style={{ borderColor: active ? '#ffd23f' : 'rgba(255,255,255,.14)', background: item.swatch, boxShadow: active ? '0 0 0 2px #ffd23f44, 0 0 12px #ffd23f88' : '0 2px 0 rgba(0,0,0,.4)', transform: active ? 'translateY(-2px)' : undefined }}>
                  <span className="text-[20px] leading-none drop-shadow">{item.icon}</span>
                  <span className="font-title text-[8px] leading-none text-white">{item.label}</span>
                  {active && <span className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-[#22c55e] text-[9px] text-white ring-2 ring-[#0e1519]">✓</span>}
                </button>
              );
            })}
          </div>
        </section>

        <button type="button" onClick={() => setAdvanced((value) => !value)} className="press mt-3 flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/[.05] px-3 py-2.5">
          <span className="font-title flex items-center gap-2 text-[12px] text-white/85"><span>⚙</span> PENGATURAN LANJUTAN</span>
          <span className={`font-title text-[13px] text-white/70 transition-transform ${advanced ? 'rotate-180' : ''}`}>▾</span>
        </button>
        {advanced && (
          <div className="st-adv-in mt-1 rounded-xl border border-white/10 bg-black/25 px-2.5 pb-3 pt-1">
            <div className="mt-3">
              <div className="font-title text-[10px] tracking-[.14em] text-white/55">⚡ KECEPATAN GAME SGA</div>
              <div className="mt-1.5 grid grid-cols-4 gap-1 rounded-xl bg-black/35 p-1">
                {speedOptions.map((value) => {
                  const active = speed === value;
                  return <button key={value} type="button" aria-pressed={active} onClick={() => onSpeed(value)} className={`font-title h-8 rounded-lg text-[12px] transition-all ${active ? 'bg-gradient-to-b from-[#ffe27a] to-[#f59e0b] text-[#4a2a00] shadow-[0_2px_0_#9a5b00]' : 'text-white/70 hover:bg-white/10'}`}>{formatSpeed(value)}</button>;
                })}
              </div>
            </div>
            <div className="mt-3">
              <div className="font-title text-[10px] tracking-[.14em] text-white/55">✦ STAGE SPESIAL</div>
              <p className="mt-1 text-[10px] text-white/55">Pilih langsung mode bonus SGA.</p>
              <div className="mt-1.5 grid grid-cols-3 gap-1.5">
                <button type="button" onClick={() => onSpecial('boulder')} className="press rounded-xl border border-cyan-300/30 bg-cyan-400/10 px-1 py-2 text-center">
                  <DiamondSprite size={22} /><span className="mt-1 block font-title text-[9px] text-cyan-100">BATU · 3</span>
                </button>
                <button type="button" onClick={() => onSpecial('bonus')} className="press rounded-xl border border-amber-300/30 bg-amber-400/10 px-1 py-2 text-center">
                  <span className="block text-xl leading-none">🪙</span><span className="mt-1 block font-title text-[9px] text-amber-100">BONUS · 4</span>
                </button>
                <button type="button" onClick={() => onSpecial('treasure')} className="press rounded-xl border border-pink-300/30 bg-pink-400/10 px-1 py-2 text-center">
                  <span className="block text-xl leading-none">🧰</span><span className="mt-1 block font-title text-[9px] text-pink-100">HARTA · 6</span>
                </button>
              </div>
            </div>
            <button type="button" onClick={onReplayIntro} className="press mt-3 flex h-10 w-full items-center justify-center gap-1.5 rounded-xl border-2 border-[#ef4444]/50 bg-[#3a0d12]/80 font-title text-[12px] text-[#fecaca]">▶ PUTAR ULANG INTRO SANS STUDIO</button>
          </div>
        )}

        <button type="button" onClick={onClose} className="press shine font-title mt-3 h-11 w-full rounded-xl border-2 border-[#0e5a26] bg-gradient-to-b from-[#7cf06f] via-[#3fcf4a] to-[#1f9b37] text-[16px] text-white shadow-[0_4px_0_#0e5a26]" style={{ textShadow: '0 2px 0 #0e5a26' }}>SIMPAN & KEMBALI</button>
      </section>
    </div>
  );
}
