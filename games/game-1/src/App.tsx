import { useEffect, useRef, useState } from 'react';
import { Game, CW, CH } from './game';
import { WEAPONS } from './weapons';
import { sfx } from './audio';

export default function App() {
  const ref = useRef<HTMLCanvasElement>(null);
  const game = useRef<Game | null>(null);
  const [sel, setSel] = useState(0);
  const [stats, setStats] = useState({ h: 0, k: 0 });
  const [sound, setSound] = useState(true);

  useEffect(() => {
    const cv = ref.current!;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = CW * dpr; cv.height = CH * dpr;
    const ctx = cv.getContext('2d')!;
    ctx.scale(dpr, dpr);
    const g = new Game(ctx);
    g.onStats = (h, k) => setStats({ h, k });
    g.bannerT = 1.6;
    game.current = g;
    let last = performance.now(), raf = 0;
    const loop = (now: number) => {
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      g.update(dt);
      g.render();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    const kd = (e: KeyboardEvent) => {
      if (e.code === 'Space') { e.preventDefault(); if (!e.repeat) g.press(); }
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        const n = (g.widx + (e.key === 'ArrowRight' ? 1 : -1) + WEAPONS.length) % WEAPONS.length;
        g.setWeapon(n); setSel(n);
      }
    };
    const ku = (e: KeyboardEvent) => { if (e.code === 'Space') g.release(); };
    const up = () => g.release();
    window.addEventListener('keydown', kd);
    window.addEventListener('keyup', ku);
    window.addEventListener('pointerup', up);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', kd);
      window.removeEventListener('keyup', ku);
      window.removeEventListener('pointerup', up);
    };
  }, []);

  const pick = (i: number) => { setSel(i); game.current?.setWeapon(i); };
  const w = WEAPONS[sel];

  return (
    <div className="min-h-screen w-full bg-[#03040a] text-white flex flex-col lg:flex-row items-center justify-center gap-4 p-3 select-none">
      <div className="relative">
        <canvas
          ref={ref}
          onPointerDown={e => { e.preventDefault(); game.current?.press(); }}
          onContextMenu={e => e.preventDefault()}
          className="rounded-2xl border border-white/10 shadow-[0_0_60px_rgba(80,120,255,.25)] touch-none cursor-crosshair"
          style={{ height: 'min(82vh, 820px)', aspectRatio: `${CW}/${CH}`, maxWidth: '96vw' }}
        />
      </div>

      <div className="w-full max-w-md lg:w-[400px]">
        <h1 className="text-2xl font-black tracking-tight bg-gradient-to-r from-amber-300 via-orange-400 to-pink-500 bg-clip-text text-transparent">
          WEAPON HIT ARENA
        </h1>
        <div className="flex items-start justify-between gap-3">
          <p className="text-xs text-white/50 mb-3">
            Klik / tap canvas atau tekan <b>SPASI</b> untuk menembak (tahan untuk senjata otomatis & Proton Pack).
            <b> Mega Buster:</b> tahan untuk charge, lepas untuk menembak. <b>← →</b> ganti senjata.
          </p>
          <button
            onClick={() => { const v = !sound; setSound(v); sfx.setEnabled(v); if (v) sfx.ensure(); }}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-semibold transition-colors ${sound ? 'border-amber-400/60 bg-amber-400/15 text-amber-200' : 'border-white/15 bg-white/5 text-white/50'}`}
          >
            {sound ? '🔊 SUARA AKTIF' : '🔇 SUARA MATI'}
          </button>
        </div>
        <div className="mb-3 rounded-xl border border-white/10 bg-white/5 p-3" style={{ boxShadow: `inset 0 0 30px ${w.color}22` }}>
          <div className="flex items-center gap-2">
            <span className="text-2xl">{w.icon}</span>
            <div>
              <div className="font-bold" style={{ color: w.color }}>{w.name}</div>
              <div className="text-xs text-white/60">{w.desc}</div>
            </div>
          </div>
          <div className="mt-2 flex gap-4 text-[11px] text-white/60">
            <span>DMG <b className="text-white">{w.dmg}{w.kind === 'stream' ? '/s' : ''}</b></span>
            <span>MODE <b className="text-white">{w.kind === 'stream' ? 'STREAM' : w.auto ? 'AUTO' : 'SEMI'}</b></span>
            <span>HIT <b className="text-white">{stats.h}</b></span>
            <span>HANCUR <b className="text-white">{stats.k}</b></span>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {WEAPONS.map((wp, i) => (
            <button
              key={wp.name}
              onClick={() => pick(i)}
              className={`group rounded-xl border px-1 py-2 text-center transition-all ${i === sel ? 'border-transparent scale-105' : 'border-white/10 bg-white/[.03] hover:bg-white/10'}`}
              style={i === sel ? { background: `${wp.color}25`, boxShadow: `0 0 18px ${wp.color}88, inset 0 0 0 1px ${wp.color}` } : undefined}
            >
              <div className="text-xl">{wp.icon}</div>
              <div className="text-[10px] leading-tight font-semibold text-white/85 mt-1">{wp.name}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
