import { useState } from 'react';
import { PISTOL } from '../weapons';
import { PistolPreview } from './PistolPreview';
import { SunburstFX } from './Effects';
import { Ico } from './FlatIcons';
import CoinSprite from './CoinSprite';
import DiamondSprite from './DiamondSprite';
import type { Save } from '../persist';
import { useLiteAudio } from '../context';

/** A pruned copy of v1's purple ARMORY, not a redesigned weapon shop. */
export function GunPage({ save, onBack }: { save: Save; onBack(): void }) {
  const [tab, setTab] = useState<'ALL' | 'UMUM'>('ALL'); const audio = useLiteAudio();
  return (
    <div data-page="gun" data-weapon-count="1" className="arsenal-armory-open a in-bg absolute inset-0 z-40 flex flex-col overflow-hidden px-3 pt-3 pb-2.5 text-white" style={{ background: 'radial-gradient(ellipse at 50% 0%, #6b5b86 0%, #35284f 40%, #1b142b 100%)' }}>
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_8%,rgba(255,240,200,.2),transparent_50%),radial-gradient(ellipse_at_50%_50%,rgba(120,100,200,.12)_52%,transparent_78%)]" />
        <div className="absolute left-1/2 top-0 h-[46%] w-[86%] -translate-x-1/2 origin-top" style={{ background: 'linear-gradient(180deg,rgba(255,255,255,.22),rgba(255,255,255,0) 85%)', clipPath: 'polygon(38% 0,62% 0,100% 100%,0 100%)', filter: 'blur(6px)' }} />
        {Array.from({ length: 14 }, (_, i) => <span key={i} className="arsenal-firefly absolute rounded-full" style={{ left: `${i * 37 % 100}%`, top: `${i * 23 % 62}%`, width: 3 + i % 3, height: 3 + i % 3, animationDelay: `${-i * 0.63}s`, background: i % 4 === 0 ? '#7dd3fc' : '#c4b5fd' }} />)}
      </div>
      <header className="a in-down relative z-20 flex shrink-0 items-center gap-2.5">
        <button onClick={onBack} aria-label="Kembali" className="press grid h-11 w-11 shrink-0 place-items-center rounded-2xl border-2 border-[#7a4b00] bg-gradient-to-b from-[#ffe27a] to-[#f59e0b] shadow-[0_4px_0_#7a4b00,inset_0_2px_0_rgba(255,255,255,.5)]">
          <svg viewBox="0 0 24 24" className="h-7 w-7"><path d="M11 4 L3 12 L11 20 V15 H21 V9 H11 Z" fill="#fff" stroke="#7a4b00" strokeWidth="1.8" strokeLinejoin="round" /></svg>
        </button>
        <div className="min-w-0 flex-1">
          <div className="font-arsenal-title truncate text-[22px] leading-none text-white [text-shadow:0_2px_0_#2a1650,0_0_14px_rgba(192,132,252,.55)]">ARMORY</div>
          <div className="mt-1 flex items-center gap-1 text-[10px] tracking-wide text-[#c4b5fd]"><Ico name="target" className="h-3.5 w-3.5" /><span className="font-arsenal-title whitespace-nowrap">1/1 UNLOCKED</span><span className="h-1 w-10 overflow-hidden rounded-full bg-black/50"><span className="block h-full w-full rounded-full bg-gradient-to-r from-[#c084fc] to-[#f0abfc]" /></span></div>
        </div>
        <div className="flex h-11 shrink-0 items-center gap-1.5 rounded-full border-2 border-white/10 bg-black/45 pl-2 pr-2 text-white shadow-inner"><CoinSprite size={25} /><span className="font-title min-w-[34px] text-xl tabular-nums leading-none">{save.coins}</span><span className="h-6 w-px bg-white/20" /><DiamondSprite size={24} /><span className="font-title min-w-[26px] text-lg tabular-nums leading-none">{save.diamonds}</span></div>
      </header>
      <section className="relative z-10 mt-1 flex h-[164px] shrink-0 items-center justify-center">
        <div className="pointer-events-none absolute h-[150%] aspect-square"><SunburstFX size={430} color="255,255,255" intensity={0.44} speed={32} core={false} stars={false} style={{ left: '50%', top: '50%' }} /></div>
        <div className="pointer-events-none absolute bottom-0 left-1/2 h-6 w-48 -translate-x-1/2 rounded-[50%] border-2 border-[#c084fc]/40 bg-gradient-to-b from-[#3b2a66] to-[#1a1033] shadow-[0_0_24px_rgba(168,85,247,.35)]" />
        <div className="a sh-hero-in relative z-10 float"><PistolPreview width={238} height={170} /></div>
      </section>
      <div className="relative z-20 mt-1.5 flex min-h-[42px] shrink-0 items-center justify-center gap-2">
        <div className="a in-slam flex max-w-[82%] items-center gap-2 rounded-2xl border-2 border-[#ffd23f]/30 bg-gradient-to-b from-[#2a1d48] to-[#140b26] px-4 py-2 shadow-[0_6px_16px_rgba(0,0,0,.5),inset_0_1px_0_rgba(255,255,255,.12)]"><span className="font-arsenal-title truncate text-[24px] leading-none text-[#ffd23f] [text-shadow:0_2px_0_#9c5a10,0_0_12px_rgba(255,210,63,.35)]">PISTOL</span><span className="font-arsenal-title flex shrink-0 items-center gap-1 rounded-md bg-slate-200 px-2 py-1 text-[12px] leading-none text-slate-800"><Ico name="shield" className="h-3 w-3" />COMMON</span></div>
      </div>
      <nav className="relative z-20 mt-3 grid shrink-0 grid-cols-7 gap-1" aria-label="Kategori senjata">
        {(['ALL', 'UMUM'] as const).map(t => <button key={t} type="button" onClick={() => { setTab(t); audio.tap(); }} aria-pressed={tab === t} className={`press flex w-full flex-col items-center gap-0.5 rounded-t-xl border-x-2 border-t-2 px-0.5 pt-1.5 pb-1 ${tab === t ? '-translate-y-1 border-[#f0abfc]/70 bg-gradient-to-b from-[#c026d3] to-[#7e22ce] shadow-[0_-4px_14px_rgba(192,38,211,.45)]' : 'border-white/10 bg-gradient-to-b from-[#3a2d5c] to-[#271c42]'}`}><Ico name={t === 'ALL' ? 'crown' : 'shield'} className="h-5 w-5" /><span className="font-arsenal-title text-[10px] leading-none">{t}</span></button>)}
      </nav>
      <section className="a sh-panel-in relative z-10 flex min-h-0 flex-1 flex-col overflow-hidden rounded-b-2xl rounded-tr-2xl border-2 border-[#7e22ce]/80 bg-gradient-to-b from-[#1e1338] to-[#140c27] shadow-[0_10px_30px_rgba(0,0,0,.5)]">
        <div className="flex shrink-0 items-center justify-between bg-gradient-to-r from-[#5b21b6] to-[#3b1a6e] px-3 py-2"><span className="font-arsenal-title text-[15px]">{tab === 'ALL' ? 'ALL WEAPONS' : 'COMMON'}</span><span className="font-arsenal-title rounded-lg bg-black/40 px-2 py-1 text-[11px] text-white/85">1 ITEM</span></div>
        <div className="arsenal-scroll-area min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-2.5 pb-5 pt-2.5">
          <div className="grid grid-cols-3 items-start gap-2.5">
            <button type="button" data-weapon="pistol" aria-pressed="true" aria-label="Pilih PISTOL" onClick={() => audio.tap()} className="press sh-sel relative block aspect-[0.9] w-full overflow-hidden rounded-2xl border-2 border-[#ffe066] text-left" style={{ background: 'radial-gradient(circle at 50% 42%, #d6dce53d, transparent 65%), linear-gradient(180deg,#555b67,#292c36)' }}>
              <span className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/15 to-transparent" /><span className="font-arsenal-title absolute left-1.5 top-1.5 z-10 flex items-center gap-1 rounded-md bg-slate-300 px-1.5 py-1 text-[9px] leading-none text-black"><Ico name="shield" className="h-3 w-3" />COMMON</span><span className="absolute right-1.5 top-1.5 z-20 grid h-5 w-5 place-items-center rounded-full bg-[#22c55e] text-white shadow ring-2 ring-[#0f3b1f]"><Ico name="check" className="h-3.5 w-3.5" /></span>
              <div className="absolute inset-x-1 top-7 bottom-8 grid place-items-center"><PistolPreview width={112} height={112} thumb /></div>
              <span className="font-arsenal-title absolute inset-x-1.5 bottom-1.5 z-10 rounded-lg border border-[#ffe066]/70 bg-black/85 px-1 py-1.5 text-center text-[11px] leading-[1.05] text-[#ffe066]">PISTOL</span>
            </button>
          </div>
          <div className="font-arsenal-title mt-4 pb-2 text-center text-[9px] tracking-wider text-white/35">— 1 SENJATA · AKHIR DAFTAR —</div>
          <div className="mt-3 rounded-xl border border-white/10 bg-black/20 p-3"><div className="font-title text-sm text-[#ffd23f]">SEIMBANG</div><p className="mt-1 text-[11px] text-white/65">{PISTOL.desc}</p><div className="mt-3 space-y-2">{(['RATE', 'SPEED', 'POWER'] as const).map(label => <div key={label} className="flex items-center justify-between text-[10px] text-white/65"><span>{label}</span><span className="flex gap-1">{[0, 1, 2, 3, 4].map(i => <span key={i} className={`h-2 w-5 rounded-sm ${i < 3 ? 'bg-[#c084fc]' : 'bg-white/10'}`} />)}</span></div>)}</div></div>
        </div>
      </section>
    </div>
  );
}
