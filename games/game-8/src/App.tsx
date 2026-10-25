import { useCallback, useEffect, useRef, useState } from 'react';
import { Music, Volume2, VolumeX } from 'lucide-react';
import { Game, type HudState } from './game/engine';
import { WEAPONS } from './game/weapons';

const W = 540;
const H = 960;

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Game | null>(null);
  const [idx, setIdx] = useState(0);
  const idxRef = useRef(0);
  const [hud, setHud] = useState<HudState>({ hits: 0, goal: 15, round: 1, state: 'play' });
  const [size, setSize] = useState({ w: 360, h: 640 });
  const [muted, setMuted] = useState(() => { try { return localStorage.getItem('arsenal-mute') === '1'; } catch { return false; } });
  const [musicOn, setMusicOn] = useState(() => { try { return localStorage.getItem('arsenal-music') !== '0'; } catch { return true; } });

  // create game
  useEffect(() => {
    const canvas = canvasRef.current!;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    const g = new Game(canvas, dpr, (s) => setHud(s));
    g.setWeapon(WEAPONS[idxRef.current]);
    g.start();
    gameRef.current = g;
    return () => {
      g.stop();
      gameRef.current = null;
    };
  }, []);

  // fit canvas into the available area
  useEffect(() => {
    const el = wrapRef.current!;
    const fit = () => {
      const r = el.getBoundingClientRect();
      const s = Math.min(r.width / W, r.height / H);
      setSize({ w: Math.floor(W * s), h: Math.floor(H * s) });
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const select = useCallback((i: number) => {
    const n = (i + WEAPONS.length) % WEAPONS.length;
    idxRef.current = n;
    setIdx(n);
    gameRef.current?.setWeapon(WEAPONS[n]);
  }, []);

  // keyboard
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code === 'Space') { e.preventDefault(); if (!e.repeat) gameRef.current?.press(); }
      else if (e.code === 'ArrowRight' || e.code === 'KeyD') select(idxRef.current + 1);
      else if (e.code === 'ArrowLeft' || e.code === 'KeyA') select(idxRef.current - 1);
      else if (/^Digit[1-9]$/.test(e.code)) select(Number(e.code.slice(5)) - 1);
      else if (e.code === 'Digit0') select(9);
    };
    const up = (e: KeyboardEvent) => { if (e.code === 'Space') gameRef.current?.release(); };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, [select]);

  const w = WEAPONS[idx];
  const fs = size.w / 540;

  return (
    <div className="h-[100dvh] w-full flex flex-col lg:flex-row bg-[#07060f] text-white overflow-hidden select-none">
      {/* sidebar (desktop) */}
      <aside className="hidden lg:flex flex-col w-[340px] shrink-0 border-r border-white/10 bg-gradient-to-b from-[#120d24] to-[#07060f]">
        <div className="px-5 pt-5 pb-3">
          <div className="text-[11px] tracking-[0.3em] text-white/40 uppercase">Weapon FX Lab</div>
          <h1 className="text-2xl font-black leading-tight mt-1">
            Arsenal <span style={{ color: w.accent }}>Knife-Hit</span> Edition
          </h1>
          <p className="text-[13px] text-white/55 mt-2 leading-relaxed">
            Level 1 · roda kayu berputar. Pilih senjata, tembak, dan lihat efek moncong, bentuk peluru, serta dampaknya di roda.
          </p>
        </div>
        <div className="mx-4 mb-3 rounded-2xl p-4 border" style={{ borderColor: w.accent + '55', background: `linear-gradient(135deg, ${w.accent}22, transparent)` }}>
          <div className="flex items-center justify-between">
            <div className="text-lg font-extrabold">{w.name}</div>
            <span className="text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full" style={{ background: w.accent + '33', color: w.accent }}>{w.tag}</span>
          </div>
          <div className="text-xs text-white/50">{w.sub}</div>
          <p className="text-[13px] text-white/75 mt-2 leading-relaxed">{w.desc}</p>
          <div className="text-[11px] mt-2" style={{ color: w.accent }}>🖱 {w.hint}</div>
        </div>
        <div className="flex-1 overflow-y-auto px-4 pb-4 grid grid-cols-2 gap-2 content-start">
          {WEAPONS.map((x, i) => (
            <button
              key={x.id}
              onClick={() => select(i)}
              className="text-left rounded-xl px-3 py-2 border transition-all hover:-translate-y-0.5"
              style={{
                borderColor: i === idx ? x.accent : 'rgba(255,255,255,.08)',
                background: i === idx ? `linear-gradient(135deg, ${x.accent}33, rgba(255,255,255,.03))` : 'rgba(255,255,255,.03)',
                boxShadow: i === idx ? `0 0 18px ${x.accent}44` : 'none',
              }}
            >
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full" style={{ background: x.accent, boxShadow: `0 0 8px ${x.accent}` }} />
                <span className="text-[13px] font-bold truncate">{x.name}</span>
                {x.isNew && <span className="ml-auto text-[8px] font-black px-1.5 py-0.5 rounded bg-gradient-to-r from-fuchsia-500 to-amber-400 text-black">NEW</span>}
              </div>
              <div className="text-[10px] text-white/45 mt-0.5 truncate">{i < 9 ? `[${i + 1}] ` : ''}{x.tag}</div>
            </button>
          ))}
        </div>
        <div className="px-5 py-3 text-[11px] text-white/40 border-t border-white/10">
          Tahan klik / <kbd className="px-1 py-0.5 rounded bg-white/10">Spasi</kbd> = tembak · <kbd className="px-1 py-0.5 rounded bg-white/10">←</kbd> <kbd className="px-1 py-0.5 rounded bg-white/10">→</kbd> ganti senjata
        </div>
      </aside>

      {/* game area */}
      <main ref={wrapRef} className="flex-1 min-h-0 min-w-0 flex items-center justify-center p-1 lg:p-3">
        <div
          className="relative rounded-2xl overflow-hidden shadow-[0_0_60px_rgba(120,80,255,.25)] ring-1 ring-white/10"
          style={{ width: size.w, height: size.h, touchAction: 'none', fontSize: Math.max(9, 16 * fs) }}
          onPointerDown={(e) => { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); gameRef.current?.press(); }}
          onPointerUp={() => gameRef.current?.release()}
          onPointerCancel={() => gameRef.current?.release()}
          onContextMenu={(e) => e.preventDefault()}
        >
          <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
          {/* HUD */}
          <div className="absolute inset-x-0 top-0 p-[3%] pointer-events-none">
            <div className="absolute right-0 top-0 flex gap-1.5 pointer-events-auto">
              <button
                aria-label="Suara"
                className="rounded-lg bg-black/45 border border-white/10 p-1.5 hover:bg-black/70 transition-colors"
                onClick={(e) => { e.stopPropagation(); const g = gameRef.current; if (!g) return; g.sfx.unlock(); setMuted(g.sfx.toggleMute()); }}
                onPointerDown={(e) => e.stopPropagation()}
              >
                {muted ? <VolumeX size={Math.max(14, 18)} className="text-white/60" /> : <Volume2 size={Math.max(14, 18)} className="text-amber-300" />}
              </button>
              <button
                aria-label="Musik"
                className="rounded-lg bg-black/45 border border-white/10 p-1.5 hover:bg-black/70 transition-colors"
                onClick={(e) => { e.stopPropagation(); const g = gameRef.current; if (!g) return; g.sfx.unlock(); setMusicOn(g.sfx.toggleMusic()); }}
                onPointerDown={(e) => e.stopPropagation()}
              >
                <Music size={Math.max(14, 18)} className={musicOn ? 'text-cyan-300' : 'text-white/40'} />
              </button>
            </div>
            <div className="flex items-start justify-between gap-2 mr-16">
              <div className="min-w-0">
                <div className="font-black leading-none truncate" style={{ fontSize: '1.25em', color: w.accent, textShadow: `0 0 12px ${w.accent}88` }}>{w.name}</div>
                <div className="text-white/60 truncate" style={{ fontSize: '0.72em' }}>{w.sub}</div>
                <div className="text-white/45" style={{ fontSize: '0.68em' }}>{w.hint}</div>
              </div>
              <div className="text-right shrink-0">
                <div className="inline-block rounded-full px-3 py-1 font-black tracking-wider bg-gradient-to-b from-amber-300 to-amber-500 text-amber-950 shadow-lg" style={{ fontSize: '0.8em' }}>
                  LEVEL 1
                </div>
                <div className="text-white/50" style={{ fontSize: '0.65em' }}>Ronde {hud.round}</div>
              </div>
            </div>
            <div className="mt-[2.5%] flex items-center justify-center gap-[0.35em]">
              {Array.from({ length: hud.goal }).map((_, i) => (
                <span
                  key={i}
                  className="rounded-full transition-all duration-150"
                  style={{
                    width: '0.62em', height: '0.62em',
                    background: i < hud.hits ? w.accent : 'rgba(255,255,255,.14)',
                    boxShadow: i < hud.hits ? `0 0 8px ${w.accent}` : 'none',
                    transform: i === hud.hits - 1 ? 'scale(1.5)' : 'scale(1)',
                  }}
                />
              ))}
            </div>
          </div>
          {/* hint pill for mobile */}
          <div className="absolute bottom-2 inset-x-0 flex justify-center pointer-events-none lg:hidden">
            <span className="rounded-full bg-black/40 px-3 py-1 text-white/70" style={{ fontSize: '0.65em' }}>Sentuh &amp; tahan layar untuk menembak</span>
          </div>
        </div>
      </main>

      {/* weapon bar (mobile) */}
      <nav className="lg:hidden shrink-0 border-t border-white/10 bg-[#0c0919] overflow-x-auto">
        <div className="flex gap-2 p-2 w-max">
          {WEAPONS.map((x, i) => (
            <button
              key={x.id}
              onClick={() => select(i)}
              className="rounded-xl px-3 py-1.5 border text-left whitespace-nowrap"
              style={{
                borderColor: i === idx ? x.accent : 'rgba(255,255,255,.1)',
                background: i === idx ? `${x.accent}33` : 'rgba(255,255,255,.04)',
                boxShadow: i === idx ? `0 0 12px ${x.accent}55` : 'none',
              }}
            >
              <div className="text-[12px] font-bold flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: x.accent }} />
                {x.name}
                {x.isNew && <span className="text-[8px] font-black px-1 rounded bg-gradient-to-r from-fuchsia-500 to-amber-400 text-black">NEW</span>}
              </div>
              <div className="text-[9px] text-white/45">{x.tag}</div>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
