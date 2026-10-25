import { useEffect, useMemo, useRef, useState } from 'react';
import { Engine, type Stats } from './game/engine';
import { WEAPONS, type WeaponDef } from './game/weapons';
import { sfx } from './game/audio';

const ICON: Record<string, string> = {
  bow: '🏹',
  ak: '🔫',
  rifle: '🎯',
  rifleElectro: '⚡',
  mp5: '💥',
  mp5Electro: '🔆',
  sniper: '🔭',
  dragon: '🐉',
  beretta: '🔪',
  phaser: '🛸',
  sword: '🗡️',
  caster: '👽',
  disc: '💿',
  proton: '👻',
  tripod: '🛰️',
  repulsor: '🦾',
  singularity: '🕳️',
  tesla: '⚡',
  railgun: '🚀',
  prism: '🔷',
  nanite: '🧬',
  chrono: '⏳',
  cryo: '❄️',
  sonic: '🔊',
  quantum: '⚛️',
  acid: '🧪',
  buster: '💥',
};

const TAGS = ['Classical', 'Pistol', 'SMG', 'Rifle', 'Energy', 'Exotic', 'Melee', 'Legendary'];

function Bar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = Math.max(3, Math.min(100, (value / max) * 100));
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[10px] font-semibold uppercase tracking-widest text-slate-400">
        <span>{label}</span>
        <span className="text-slate-200">{value >= 100 ? value.toFixed(0) : value.toFixed(1)}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/8">
        <div className="h-full rounded-full transition-all duration-300" style={{ width: `${pct}%`, background: color, boxShadow: `0 0 12px ${color}` }} />
      </div>
    </div>
  );
}

function Chip({ children, color }: { children: React.ReactNode; color?: string }) {
  return (
    <span
      className="rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest"
      style={{ borderColor: (color ?? '#94a3b8') + '55', color: color ?? '#cbd5e1', background: (color ?? '#94a3b8') + '14' }}
    >
      {children}
    </span>
  );
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<Engine | null>(null);
  const autoRef = useRef(false);
  const [id, setId] = useState<string>('caster');
  const [stats, setStats] = useState<Stats>({ hits: 0, clashes: 0, destroyed: 0, damage: 0, charge: 0, hp: 120, firing: false, combo: 0, best: 0 });
  const [slow, setSlow] = useState(false);
  const [muted, setMuted] = useState(false);
  const [bgm, setBgm] = useState(false);
  const [auto, setAuto] = useState(false);
  const [hq, setHq] = useState(true);
  const [showList, setShowList] = useState(true);

  const weapon: WeaponDef = useMemo(() => WEAPONS.find((w) => w.id === id) ?? WEAPONS[0], [id]);

  useEffect(() => {
    if (!canvasRef.current) return;
    const e = new Engine(canvasRef.current, WEAPONS.find((w) => w.id === id) ?? WEAPONS[0]);
    engineRef.current = e;
    e.onStats = (s) => setStats(s);
    e.start();
    const onResize = () => e.resize();
    window.addEventListener('resize', onResize);
    const onKey = (ev: KeyboardEvent) => {
      if (ev.code === 'Space') {
        ev.preventDefault();
        sfx.init();
        e.setFiring(true);
      }
    };
    const onKeyUp = (ev: KeyboardEvent) => {
      if (ev.code === 'Space') e.setFiring(false);
    };
    const onUp = () => e.setFiring(autoRef.current);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('blur', onUp);
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('blur', onUp);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keyup', onKeyUp);
      e.stop();
      engineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    engineRef.current?.setWeapon(weapon);
  }, [weapon]);

  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.userSlow = slow;
      engineRef.current.slowmo = slow;
    }
  }, [slow]);

  useEffect(() => {
    sfx.muted = muted;
  }, [muted]);

  useEffect(() => {
    autoRef.current = auto;
    const e = engineRef.current;
    if (!e) return;
    e.setFiring(auto);
  }, [auto]);

  const select = (w: WeaponDef) => {
    sfx.init();
    sfx.select(w);
    setId(w.id);
    const e = engineRef.current;
    if (e) {
      e.resetWheel();
      e.stats = { hits: 0, clashes: 0, destroyed: 0, damage: 0, charge: 0, hp: e.wheel.maxHp, firing: auto, combo: 0, best: 0 };
      e.setFiring(auto);
    }
  };

  const fire = (down: boolean) => {
    sfx.init();
    engineRef.current?.setFiring(down || auto);
  };

  const grouped = TAGS.map((t) => ({ tag: t, items: WEAPONS.filter((w) => w.tag === t) })).filter((g) => g.items.length);

  return (
    <div className="min-h-screen bg-[#05070d] text-slate-200">
      {/* ambient background */}
      <div
        className="pointer-events-none fixed inset-0 opacity-70"
        style={{
          background:
            'radial-gradient(900px 500px at 15% 10%, rgba(56,189,248,.10), transparent 60%), radial-gradient(800px 500px at 85% 80%, rgba(244,63,94,.10), transparent 60%)',
        }}
      />
      <div className="relative mx-auto max-w-[1700px] px-4 pb-10 pt-5 lg:px-8">
        {/* header */}
        <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-end gap-3">
            <div>
              <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
                ARSENAL <span className="text-cyan-400">FX</span>
                <span className="ml-2 align-middle text-[10px] font-bold uppercase tracking-[0.3em] text-slate-500">2D ballistics lab</span>
              </h1>
              <p className="text-xs text-slate-400 sm:text-sm">
                Efek tembakan, bentuk peluru &amp; impact nyata · roda putar gaya Knife Hit · Level 1
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setSlow((v) => !v)}
              className={`rounded-lg border px-3 py-2 text-xs font-bold uppercase tracking-widest transition ${
                slow ? 'border-cyan-400/60 bg-cyan-400/15 text-cyan-200' : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
              }`}
            >
              🐢 Slow-mo
            </button>
            <button
              onPointerDown={() => fire(true)}
              onPointerUp={() => fire(false)}
              onPointerLeave={() => fire(false)}
              className="rounded-lg border border-amber-400/60 bg-amber-400/20 px-3.5 py-2 text-xs font-black uppercase tracking-widest text-amber-100 shadow-[0_0_20px_-4px_rgba(251,191,36,.5)] transition hover:bg-amber-400/30 active:scale-95"
            >
              🔥 Tembak!
            </button>
            <button
              onClick={() => {
                sfx.init();
                setAuto((v) => !v);
              }}
              className={`rounded-lg border px-3 py-2 text-xs font-bold uppercase tracking-widest transition ${
                auto ? 'border-rose-400/60 bg-rose-400/15 text-rose-200' : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
              }`}
            >
              ♾ Auto fire
            </button>
            <button
              onClick={() => {
                const next = !hq;
                setHq(next);
                if (engineRef.current) engineRef.current.fxHigh = next;
              }}
              className={`rounded-lg border px-3 py-2 text-xs font-bold uppercase tracking-widest transition ${
                hq ? 'border-violet-400/60 bg-violet-400/15 text-violet-200' : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
              }`}
            >
              ✨ FX {hq ? 'Ultra' : 'Lite'}
            </button>
            <button
              onClick={() => {
                sfx.init();
                const on = sfx.toggleBgm();
                setBgm(on);
              }}
              className={`rounded-lg border px-3 py-2 text-xs font-bold uppercase tracking-widest transition ${
                bgm ? 'border-emerald-400/60 bg-emerald-400/15 text-emerald-200' : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
              }`}
            >
              {bgm ? '🎵 Musik ON' : '🎵 Musik'}
            </button>
            <button
              onClick={() => {
                sfx.init();
                setMuted((v) => {
                  const next = !v;
                  sfx.muted = next;
                  if (!next) sfx.select(weapon);
                  return next;
                });
              }}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold uppercase tracking-widest text-slate-300 transition hover:bg-white/10"
            >
              {muted ? '🔇 Mute' : '🔊 Sound ON'}
            </button>
            <button
              onClick={() => engineRef.current?.resetWheel()}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold uppercase tracking-widest text-slate-300 transition hover:bg-white/10"
            >
              ↺ Reset wheel
            </button>
            <button
              onClick={() => setShowList((v) => !v)}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold uppercase tracking-widest text-slate-300 transition hover:bg-white/10 lg:hidden"
            >
              ☰
            </button>
          </div>
        </header>

        <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)_270px]">
          {/* weapon list */}
          <aside className={`${showList ? 'block' : 'hidden'} lg:block`}>
            <div className="max-h-[520px] space-y-3 overflow-y-auto rounded-2xl border border-white/10 bg-white/[0.03] p-3 backdrop-blur lg:max-h-[640px]">
              {grouped.map((g) => (
                <div key={g.tag}>
                  <div
                    className={`mb-1.5 flex items-center gap-1.5 px-1 text-[10px] font-black uppercase tracking-[0.25em] ${
                      g.tag === 'Legendary' ? 'text-amber-300' : 'text-slate-500'
                    }`}
                  >
                    {g.tag === 'Legendary' && <span>★</span>}
                    {g.tag}
                  </div>
                  <div className="space-y-1.5">
                    {g.items.map((w) => {
                      const active = w.id === id;
                      return (
                        <button
                          key={w.id}
                          onClick={() => select(w)}
                          className={`group flex w-full items-center gap-2.5 rounded-xl border px-2.5 py-2 text-left transition ${
                            active
                              ? 'border-cyan-400/50 bg-cyan-400/10 shadow-[0_0_24px_-6px_rgba(34,211,238,.6)]'
                              : w.tag === 'Legendary'
                                ? 'border-amber-400/25 bg-gradient-to-r from-amber-400/[0.07] to-transparent hover:border-amber-300/50 hover:bg-amber-400/10'
                                : 'border-white/8 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.06]'
                          }`}
                        >
                          <span
                            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-lg"
                            style={{ background: `linear-gradient(140deg, ${w.primary}22, transparent)`, boxShadow: `inset 0 0 0 1px ${w.primary}33` }}
                          >
                            {ICON[w.id] ?? '✦'}
                          </span>
                          <span className="min-w-0">
                            <span className={`block truncate text-[13px] font-bold ${active ? 'text-white' : 'text-slate-200'}`}>{w.name}</span>
                            <span className="block truncate text-[10px] uppercase tracking-wider text-slate-500">{w.from}</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </aside>

          {/* stage */}
          <main className="space-y-3">
            <div
              className="relative overflow-hidden rounded-2xl border border-white/10 bg-black shadow-[0_30px_80px_-30px_rgba(0,0,0,.9)]"
              style={{ boxShadow: `0 0 90px -40px ${weapon.primary}` }}
            >
              <canvas
                ref={canvasRef}
                className="block w-full touch-none select-none"
                style={{ aspectRatio: '16 / 9', cursor: 'crosshair' }}
                onPointerDown={(e) => {
                  e.currentTarget.setPointerCapture(e.pointerId);
                  fire(true);
                }}
                onPointerUp={() => fire(false)}
                onPointerCancel={() => fire(false)}
              />
              {/* HUD overlay */}
              <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-3 sm:p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="rounded-xl border border-white/10 bg-black/45 px-3 py-2 backdrop-blur">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{ICON[weapon.id]}</span>
                      <div>
                        <div className="text-sm font-black leading-tight text-white">{weapon.name}</div>
                        <div className="text-[10px] uppercase tracking-widest text-slate-400">
                          {weapon.tag} · {weapon.from}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <div className="rounded-xl border border-white/10 bg-black/45 px-3 py-1.5 text-right backdrop-blur">
                      <div className="text-[10px] uppercase tracking-widest text-slate-400">Wheel HP</div>
                      <div className="text-sm font-black text-white">{Math.max(0, Math.round(stats.hp))}</div>
                    </div>
                    {stats.combo > 1 && (
                      <div className="rounded-xl border border-amber-400/40 bg-amber-400/15 px-3 py-1 text-xs font-black text-amber-200 backdrop-blur">
                        COMBO ×{stats.combo}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-end justify-between gap-2">
                  <div className="rounded-xl border border-white/10 bg-black/45 px-3 py-2 text-[10px] uppercase tracking-widest text-slate-400 backdrop-blur">
                    Klik / tahan canvas atau <span className="text-slate-200">SPACE</span> untuk menembak
                  </div>
                  <div className="flex gap-1.5">
                    {([
                      ['HIT', stats.hits],
                      ['CLASH', stats.clashes],
                      ['DOWN', stats.destroyed],
                      ['DMG', Math.round(stats.damage)],
                    ] as [string, number][]).map(([k, v]) => (
                      <div key={k as string} className="rounded-lg border border-white/10 bg-black/45 px-2.5 py-1 text-center backdrop-blur">
                        <div className="text-[9px] uppercase tracking-widest text-slate-400">{k}</div>
                        <div className="text-xs font-black text-white">{v}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* info strip */}
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:col-span-2">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <h2 className="text-base font-black text-white">{weapon.name}</h2>
                  <Chip color={weapon.primary}>{weapon.mode}</Chip>
                  <Chip color={weapon.secondary}>{weapon.proj}</Chip>
                  <Chip color={weapon.primary}>{weapon.impact}</Chip>
                </div>
                <p className="text-sm leading-relaxed text-slate-300">{weapon.desc}</p>
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <Bar label="RPM" value={weapon.rpm} max={800} color={weapon.primary} />
                  <Bar label="Damage" value={weapon.damage} max={110} color="#f472b6" />
                  <Bar label="Velocity" value={weapon.speed} max={3000} color="#38bdf8" />
                  <Bar label="Spread" value={weapon.spread * 100} max={25} color="#fbbf24" />
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <div className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">Charge</div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full transition-[width] duration-75"
                    style={{ width: `${stats.charge * 100}%`, background: weapon.primary, boxShadow: `0 0 14px ${weapon.primary}` }}
                  />
                </div>
                <div className="mt-3 space-y-1.5 text-xs text-slate-400">
                  <div className="flex justify-between">
                    <span>Mode</span>
                    <span className="font-bold text-slate-200">
                      {weapon.mode === 'beam' ? (weapon.speed > 0 ? 'charged bolt' : (weapon.beamLife ?? 0) > 900 ? 'stream' : 'pulse beam') : weapon.mode}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Peluru / tembak</span>
                    <span className="font-bold text-slate-200">{weapon.pellets}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Best combo</span>
                    <span className="font-bold text-slate-200">{stats.best}</span>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <span className="h-8 flex-1 rounded-lg" style={{ background: `linear-gradient(90deg, ${weapon.primary}, ${weapon.secondary})` }} />
                  <span className="text-[10px] font-mono text-slate-500">{weapon.primary}</span>
                </div>
              </div>
            </div>
          </main>

          {/* right info */}
          <aside className="hidden space-y-3 lg:block">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">Cara kerja roda</div>
              <ul className="mt-2 space-y-2 text-xs leading-relaxed text-slate-400">
                <li>
                  <span className="font-bold text-slate-200">Tancap</span> — peluru masuk ke rim roda lalu ikut berputar, seperti Knife Hit.
                </li>
                <li>
                  <span className="font-bold text-rose-300">CLASH</span> — kalau mengenai peluru yang sudah tertancap, keduanya terlempar &amp; combo reset.
                </li>
                <li>
                  <span className="font-bold text-amber-300">Wheel Down</span> — HP roda habis → pecah, slow-motion + shockwave, lalu respawn otomatis.
                </li>
                <li>
                  <span className="font-bold text-cyan-300">Molten trail</span> — senjata beam meninggalkan bekas panas mengikuti putaran roda.
                </li>
              </ul>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">
                Arsenal ({WEAPONS.length}) · ★{WEAPONS.filter((w) => w.tag === 'Legendary').length} Legendary
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {WEAPONS.map((w) => (
                  <button
                    key={w.id}
                    onClick={() => select(w)}
                    title={w.name}
                    className={`h-8 w-8 rounded-lg text-base transition ${w.id === id ? 'bg-cyan-400/20 ring-1 ring-cyan-400/60' : 'bg-white/5 hover:bg-white/10'}`}
                  >
                    {ICON[w.id] ?? '✦'}
                  </button>
                ))}
              </div>
            </div>
            <div className="overflow-hidden rounded-2xl border border-amber-400/25 bg-gradient-to-b from-amber-400/[0.1] to-transparent p-4">
              <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.25em] text-amber-300">
                <span>★</span> Legendary Tier — Baru
              </div>
              <div className="mt-2.5 space-y-2">
                {WEAPONS.filter((w) => w.tag === 'Legendary').map((w) => (
                  <button
                    key={w.id}
                    onClick={() => select(w)}
                    className={`flex w-full items-center gap-2.5 rounded-xl border px-2.5 py-2 text-left transition ${
                      w.id === id ? 'border-amber-300/60 bg-amber-400/15' : 'border-white/10 bg-black/20 hover:border-amber-300/40 hover:bg-amber-400/10'
                    }`}
                  >
                    <span
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-lg"
                      style={{ background: `radial-gradient(circle at 50% 50%, ${w.primary}33, transparent 70%)` }}
                    >
                      {ICON[w.id]}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-[13px] font-black text-amber-100">{w.name}</span>
                      <span className="block truncate text-[10px] uppercase tracking-wider text-amber-200/50">{w.from}</span>
                    </span>
                  </button>
                ))}
              </div>
              <p className="mt-2.5 text-[11px] leading-relaxed text-amber-100/50">
                Sebelas senjata eksperimental. Nyalakan <span className="text-amber-200">Slow-mo</span> untuk melihat lensa
                gravitasi menyerap partikel, petal sabot terlepas, nanobot merayap, roda membeku, asam melarutkan rim, &amp;
                buster mengisi tiga tingkat.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-transparent p-4">
              <div className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">Tips</div>
              <p className="mt-2 text-xs leading-relaxed text-slate-400">
                Nyalakan <span className="text-slate-200">Slow-mo</span> lalu pilih <span className="text-slate-200">Sniper Beam</span> atau{' '}
                <span className="text-slate-200">Plasmacaster</span> untuk melihat detail flash, shockwave &amp; serpihan. Coba juga{' '}
                <span className="text-slate-200">Dragon Breath</span> untuk hujan bara 🔥
              </p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
