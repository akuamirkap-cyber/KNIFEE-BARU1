import { useEffect, useRef, useState } from 'react';
import Game, { TARGET } from './Game';
import { WEAPONS, drawWeapon } from './weapons';

function Thumb({ id, muzzle }: { id: string; muzzle: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current!; const c = cv.getContext('2d')!;
    let raf = 0; const t0 = performance.now();
    const draw = () => {
      c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, cv.width, cv.height);
      const minX = id === 'bow' ? -80 : -120, maxX = muzzle + 10;
      const sc = Math.min(cv.width / (maxX - minX), cv.height / (id === 'bow' ? 220 : 110));
      c.setTransform(sc, 0, 0, sc, -minX * sc, cv.height / 2);
      drawWeapon(c, id, { t: (performance.now() - t0) / 1000, ready: 1, fireT: 9 });
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, [id, muzzle]);
      return <canvas ref={ref} width={200} height={104} className="w-full h-[52px]" />;
}

export default function App() {
  const [wid, setWid] = useState('dragon');
  const [hud, setHud] = useState({ hits: 0, status: 'play' });
  const [rk, setRk] = useState(0);
  const w = WEAPONS.find((x) => x.id === wid)!;

  return (
    <div className="h-screen w-screen bg-[#07060b] text-white flex flex-col overflow-hidden select-none font-sans">
      <div className="relative flex-1 min-h-0">
        <Game weaponId={wid} onHud={setHud} resetKey={rk} />
        <div className="pointer-events-none absolute top-3 left-0 right-0 flex flex-col items-center gap-2">
          <div className="text-[11px] tracking-[0.35em] text-amber-200/70">LEVEL 1</div>
          <div className="flex gap-1.5">
            {Array.from({ length: TARGET }).map((_, i) => (
              <div key={i} className={`h-2.5 w-5 rounded-full transition-all ${i < hud.hits ? 'bg-amber-300 shadow-[0_0_10px_#fbbf24]' : 'bg-white/15'}`} />
            ))}
          </div>
        </div>
        <div className="pointer-events-none absolute left-3 bottom-3 text-left">
          <div className="text-lg font-bold" style={{ color: `rgb(${w.col})`, textShadow: `0 0 12px rgb(${w.col})` }}>{w.name}</div>
          <div className="text-xs text-white/50">{w.sub}</div>
        </div>
        <div className="pointer-events-none absolute right-3 bottom-3 text-[11px] text-white/40">Klik / Tap / Space = Tembak</div>
        {hud.status !== 'play' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
            <div className="text-center animate-[fadeIn_.4s]">
              <div className={`text-5xl font-black mb-2 ${hud.status === 'win' ? 'text-amber-300' : 'text-red-400'}`} style={{ textShadow: '0 0 30px currentColor' }}>
                {hud.status === 'win' ? 'LEVEL CLEAR!' : 'GAGAL!'}
              </div>
              <div className="text-white/60 mb-5">{hud.status === 'win' ? 'Roda hancur berkeping-keping 🔥' : 'Tembakanmu kena senjata yang sudah menancap'}</div>
              <button onClick={() => setRk((k) => k + 1)} className="px-7 py-3 rounded-full bg-gradient-to-r from-amber-400 to-orange-600 font-bold text-black shadow-[0_0_30px_rgba(251,146,60,.6)] hover:scale-105 transition">
                Main Lagi
              </button>
            </div>
          </div>
        )}
      </div>
      <div className="shrink-0 border-t border-white/10 bg-gradient-to-b from-[#120e1a] to-[#07060b] px-2 py-2">
        <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:thin]">
          {WEAPONS.map((x) => (
            <button
              key={x.id}
              onClick={() => setWid(x.id)}
              className={`shrink-0 w-28 rounded-xl border p-1.5 transition-all ${wid === x.id ? 'border-white/60 bg-white/10 scale-[1.03]' : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.07]'}`}
              style={wid === x.id ? { boxShadow: `0 0 18px rgba(${x.col},.45)` } : undefined}
            >
              <Thumb id={x.id} muzzle={x.muzzle} />
              <div className="text-[11px] font-semibold truncate" style={{ color: wid === x.id ? `rgb(${x.col})` : undefined }}>{x.name}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
