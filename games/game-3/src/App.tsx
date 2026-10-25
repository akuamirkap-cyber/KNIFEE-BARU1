import { useEffect, useRef, useState } from 'react';
import Armory from './components/Armory';
import { ACID, AIR, DORA, Game, GameState, PLASMA, VOID, WeaponId } from './game/Game';

const INFO: Record<WeaponId, { name: string; sub: string; hint: string; icon: string; glow: string; core: string; deep: string }> = {
  xeno: { name: 'Xenomorph Acid Spitter', sub: 'Molecular Acid Blood', hint: 'Klik = ludahkan asam', icon: '👾', glow: ACID.glow, core: ACID.core, deep: ACID.deep },
  dora: { name: 'Meriam Udara Doraemon', sub: '空気砲 · Kūki-hō · Peluru udara terkompresi', hint: 'Klik = DOKAN!', icon: '🔵', glow: AIR.glow, core: AIR.core, deep: DORA.blue },
  pred: { name: 'Predator Plasma Caster', sub: 'Shoulder Cannon · Titanium · Servo Mount · Tri-Laser', hint: 'Klik = isi inti → plasma dilepas', icon: '🔺', glow: PLASMA.glow, core: PLASMA.core, deep: PLASMA.deep },
  void: { name: 'Black Hole Shooter', sub: 'Singularity Launcher · Lensa Gravitasi · Cakram Akresi', hint: 'Klik = lontarkan singularitas', icon: '🕳️', glow: VOID.glow, core: VOID.core, deep: VOID.deep },
};
const ORDER: WeaponId[] = ['xeno', 'dora', 'pred', 'void'];
const SHORT: Record<WeaponId, string> = { xeno: 'Acid Spitter', dora: 'Meriam Udara', pred: 'Plasma Caster', void: 'Black Hole' };

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<Game | null>(null);
  const [st, setSt] = useState<GameState>({ weapon: 'xeno', ammo: 8, total: 8, hits: 0, status: 'playing' });
  const [armory, setArmory] = useState(false);

  useEffect(() => {
    const g = new Game(canvasRef.current!, (s) => setSt({ ...s }));
    gameRef.current = g;
    const onResize = () => g.resize();
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        if (g.status === 'playing') g.fire();
        else g.restart();
      }
      if (e.key === '1') g.setWeapon('xeno');
      if (e.key === '2') g.setWeapon('dora');
      if (e.key === '3') g.setWeapon('pred');
      if (e.key === '4') g.setWeapon('void');
      if (e.key === 'r' || e.key === 'R') g.restart();
    };
    window.addEventListener('resize', onResize);
    window.addEventListener('keydown', onKey);
    return () => {
      g.destroy();
      window.removeEventListener('resize', onResize);
      window.removeEventListener('keydown', onKey);
    };
  }, []);

  const W = INFO[st.weapon];

  return (
    <div className="fixed inset-0 overflow-hidden bg-black select-none touch-none">
      <canvas ref={canvasRef} className="absolute inset-0 cursor-crosshair" onPointerDown={() => gameRef.current?.fire()} />

      {/* Top-left title */}
      <div className="pointer-events-none absolute left-4 top-3 max-w-[70%]">
        <div className="text-xl font-black tracking-wide sm:text-2xl" style={{ color: W.glow, textShadow: `0 0 18px ${W.glow}, 0 0 2px #000` }}>
          {W.name}
        </div>
        <div className="text-[11px] font-semibold text-white/80">{W.sub}</div>
        <div className="text-[10px] text-white/45">{W.hint}</div>
      </div>

      {/* Top-right level badge */}
      <div className="pointer-events-none absolute right-4 top-3 text-right">
        <div className="inline-block rounded-full px-3 py-1 text-[11px] font-black tracking-widest text-black" style={{ background: 'linear-gradient(90deg,#ffd43a,#ffb000)', boxShadow: '0 0 14px #ffb00088' }}>
          LEVEL 1
        </div>
        <div className="mt-1 text-[10px] font-semibold tracking-widest text-white/50">
          RONDE · {st.hits}/{st.total}
        </div>
      </div>

      {/* Ammo dots */}
      <div className="pointer-events-none absolute left-1/2 top-[62px] flex -translate-x-1/2 gap-1.5">
        {Array.from({ length: st.total }).map((_, i) => {
          const live = i < st.ammo;
          return (
            <div
              key={i}
              className="h-2.5 w-2.5 rounded-full transition-all duration-300"
              style={{
                background: live ? `radial-gradient(circle at 35% 35%, ${W.core}, ${W.glow} 55%, ${W.deep})` : 'rgba(255,255,255,0.14)',
                boxShadow: live ? `0 0 8px ${W.glow}` : 'none',
                transform: live ? 'scale(1)' : 'scale(0.8)',
              }}
            />
          );
        })}
      </div>

      {/* Armory button */}
      <button
        onPointerDown={(e) => e.stopPropagation()}
        onClick={() => setArmory(true)}
        className="absolute bottom-3 left-3 flex items-center gap-2 rounded-xl border border-amber-300/40 bg-gradient-to-b from-[#2a2414] to-[#120f0a] px-3 py-2 text-left shadow-[0_0_18px_rgba(245,194,66,0.25)] transition hover:brightness-110 active:scale-95"
      >
        <span className="text-xl">🔫</span>
        <span>
          <span className="block text-[9px] font-bold tracking-widest text-amber-200/60">GUDANG</span>
          <span className="block text-[11px] font-black leading-tight text-amber-300">ARMORY</span>
        </span>
      </button>

      {armory && <Armory onClose={() => setArmory(false)} />}

      {/* Weapon switch */}
      <div className="absolute bottom-3 right-3 flex flex-col gap-2" onPointerDown={(e) => e.stopPropagation()}>
        {ORDER.map((id, i) => {
          const w = INFO[id];
          const on = st.weapon === id;
          return (
            <button
              key={id}
              onClick={() => gameRef.current?.setWeapon(id)}
              className="flex items-center gap-2 rounded-xl border px-3 py-2 text-left backdrop-blur-md transition-all"
              style={{
                borderColor: on ? w.glow : 'rgba(255,255,255,0.14)',
                background: on ? `linear-gradient(90deg, ${w.glow}33, rgba(10,12,24,0.85))` : 'rgba(10,12,24,0.65)',
                boxShadow: on ? `0 0 18px ${w.glow}66` : 'none',
              }}
            >
              <span className="text-xl">{w.icon}</span>
              <span>
                <span className="block text-[9px] font-bold text-white/40">{i + 1}</span>
                <span className="block text-[11px] font-black leading-tight text-white">{SHORT[id]}</span>
              </span>
            </button>
          );
        })}
      </div>

      {st.status === 'playing' && st.hits === 0 && st.ammo === st.total && (
        <div className="pointer-events-none absolute left-0 right-0 animate-pulse text-center text-xs font-semibold tracking-[0.25em] text-white/60" style={{ top: '56%' }}>
          {st.weapon === 'dora' ? 'TAP / SPASI — "DOKAN!"' : st.weapon === 'pred' ? 'TAP / SPASI — ISI INTI PLASMA' : st.weapon === 'void' ? 'TAP / SPASI — LEPASKAN SINGULARITAS' : 'TAP / SPASI UNTUK MELUDAH'}
        </div>
      )}

      {st.status !== 'playing' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
          <div className="mx-6 w-full max-w-sm rounded-2xl border border-white/15 bg-[#0a0c18]/90 p-6 text-center shadow-2xl" style={{ boxShadow: `0 0 60px ${st.status === 'win' ? W.glow : '#ff2a2a'}55` }}>
            <div className="text-5xl">{st.status === 'win' ? (st.weapon === 'dora' ? '💥' : st.weapon === 'pred' ? '⚡' : st.weapon === 'void' ? '🌌' : '☣️') : '🔪'}</div>
            <div className="mt-2 text-3xl font-black tracking-wider" style={{ color: st.status === 'win' ? W.glow : '#ff4a4a' }}>
              {st.status === 'win' ? 'LEVEL 1 SELESAI!' : 'GAGAL!'}
            </div>
            <p className="mt-2 text-sm text-white/60">
              {st.status === 'win'
                ? st.weapon === 'dora'
                  ? 'DOKAAAN! Udara terkompresi meledakkan target sampai berkeping-keping.'
                  : st.weapon === 'pred'
                    ? 'Plasma biru-putih menguapkan target jadi serpihan membara.'
                    : st.weapon === 'void'
                      ? 'Target tersedot melewati horizon peristiwa dan lenyap dari semesta.'
                      : 'Asam molekuler melelehkan target sampai hancur.'
                : st.weapon === 'dora'
                  ? 'Tembakan udaramu menghantam pisau / pusaran yang sudah ada.'
                  : st.weapon === 'pred'
                    ? 'Bolt plasmamu menghantam pisau / bekas plasma yang sudah ada.'
                    : st.weapon === 'void'
                      ? 'Singularitasmu menabrak pisau / celah yang sudah ada.'
                    : 'Ludahan asammu menghantam pisau / asam yang sudah menempel.'}
            </p>
            <button
              onClick={() => gameRef.current?.restart()}
              className="mt-5 w-full rounded-xl py-3 font-black tracking-widest text-black transition hover:brightness-110 active:scale-95"
              style={{ background: `linear-gradient(90deg, ${W.deep}, ${W.glow}, ${W.core})` }}
            >
              MAIN LAGI
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
