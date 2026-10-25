import { useState } from 'react';
import { ARMORY, ArmoryId } from './WeaponArt';

export default function Armory({ onClose }: { onClose: () => void }) {
  const [sel, setSel] = useState<ArmoryId>('pistol');
  const cur = ARMORY.find((w) => w.id === sel)!;
  const Big = cur.Art;

  return (
    <div
      className="absolute inset-0 z-20 flex items-center justify-center bg-[#050816]/85 backdrop-blur-md"
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className="relative mx-3 w-full max-w-[460px] rounded-3xl border border-white/10 bg-gradient-to-b from-[#0e1630] to-[#070b18] p-4 shadow-[0_0_80px_rgba(60,120,255,0.25)]">
        {/* header */}
        <div className="mb-3 flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold tracking-[0.35em] text-white/40">GUDANG SENJATA</div>
            <div className="text-xl font-black tracking-wider text-white">ARMORY</div>
          </div>
          <button onClick={onClose} className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-bold text-white/80 hover:bg-white/10">
            ✕ TUTUP
          </button>
        </div>

        {/* big preview */}
        <div className="relative mb-3 overflow-hidden rounded-2xl border border-white/10 bg-[radial-gradient(ellipse_at_50%_40%,#1c2a55_0%,#0a1024_60%,#05081a_100%)] p-3">
          <div className="pointer-events-none absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:22px_22px]" />
          <div className="pointer-events-none absolute left-1/2 top-[62%] h-6 w-[70%] -translate-x-1/2 rounded-full bg-black/60 blur-xl" />
          <div className="relative mx-auto h-36 w-[80%] drop-shadow-[0_0_18px_rgba(120,170,255,0.25)]">
            <Big id={`big-${cur.id}`} />
          </div>
          <div className="relative mt-1 flex items-end justify-between">
            <div>
              <span
                className="mr-2 inline-block rounded px-1.5 py-0.5 text-[9px] font-black tracking-widest"
                style={{ background: cur.rarity === 'RARE' ? '#2563eb' : '#334155', color: '#fff' }}
              >
                {cur.rarity}
              </span>
              <span className="text-lg font-black tracking-widest text-white">{cur.name}</span>
              <p className="mt-0.5 max-w-[300px] text-[11px] leading-snug text-white/60">{cur.desc}</p>
            </div>
          </div>
        </div>

        {/* grid */}
        <div className="grid grid-cols-3 gap-2.5">
          {ARMORY.map((w) => {
            const on = w.id === sel;
            const Art = w.Art;
            return (
              <button
                key={w.id}
                onClick={() => setSel(w.id)}
                className="group relative overflow-hidden rounded-2xl border p-2 pb-8 text-left transition-all active:scale-95"
                style={{
                  borderColor: on ? '#f5c242' : 'rgba(255,255,255,0.1)',
                  background: on
                    ? 'linear-gradient(180deg,#2a2a1a 0%,#141626 60%,#0a0c18 100%)'
                    : 'linear-gradient(180deg,#1a2240 0%,#111733 60%,#0a0e22 100%)',
                  boxShadow: on ? '0 0 22px rgba(245,194,66,0.45), inset 0 0 20px rgba(245,194,66,0.12)' : 'inset 0 1px 0 rgba(255,255,255,0.06)',
                }}
              >
                {/* rarity badge */}
                <span
                  className="absolute left-1.5 top-1.5 rounded px-1.5 py-[2px] text-[8px] font-black tracking-widest text-white"
                  style={{ background: w.rarity === 'RARE' ? '#2563eb' : '#3b4252' }}
                >
                  {w.rarity}
                </span>
                {/* check */}
                {on && (
                  <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-400 text-[10px] font-black text-black shadow-[0_0_8px_#34d399]">
                    ✓
                  </span>
                )}
                {/* art */}
                <div className="mt-4 h-16 w-full transition-transform duration-300 group-hover:scale-110">
                  <Art id={`card-${w.id}`} />
                </div>
                {/* name plate */}
                <div
                  className="absolute bottom-1.5 left-1.5 right-1.5 rounded-lg py-1 text-center text-[9px] font-black tracking-widest"
                  style={{
                    background: on ? 'linear-gradient(90deg,#1b1b10,#2a2614,#1b1b10)' : '#0a0c16',
                    color: on ? '#f5c242' : '#e5e7eb',
                    border: on ? '1px solid rgba(245,194,66,0.5)' : '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  {w.name}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
