import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GameView, type GameHandle } from './components/GameView';
import type { GameInfo } from './game/Game';
import { renderWeaponIcon } from './game/icons';
import { WEAPONS, WEAPON_MAP, type Rarity, type WeaponId } from './game/weapons';
import { cn } from './utils/cn';

const STUCK_NAME: Record<WeaponId, string> = {
  golden: 'peluru emas',
  blackhole: 'singularitas',
  ketapel: 'batu',
  sumpit: 'damek',
  shotgun: 'lubang tembakan',
  soaker: 'butiran air',
  snowball: 'gundukan salju',
  sniper: 'peluru sniper',
  flame: 'api yang menyala',
  bubble: 'gelembung sabun',
  bamboo: 'bola meriam',
  banana: 'pisang',
  harpoon: 'tombak harpun',
  chicken: 'ayam karet',
  confetti: 'rosette konfeti',
  seed: 'tunas',
  pizza: 'potongan pizza',
  minigun: 'peluru minigun',
  crossbow: 'anak panah',
  plasma: 'bola plasma',
  laser: 'titik laser',
  dragon: 'sisik naga',
  gravity: 'orb gravitasi',
  honey: 'madu',
  coconut: 'kelapa',
  angklung: 'not balok',
  bee: 'lebah',
  sakura: 'ranting sakura',
  firework: 'roket petasan',
  keris: 'keris',
  moonbeam: 'sabit bulan',
  storm: 'bola petir',
  pencil: 'pensil',
  sandal: 'sandal jepit',
  paintball: 'gumpalan cat',
  wand: 'bintang sihir',
  shark: 'hiu',
  ghost: 'hantu',
  ufo: 'piring terbang',
  rainbow: 'pelangi',
  meteor: 'meteor',
  diamond: 'berlian',
  fish: 'ikan',
  rpg: 'granat RPG',
  cricket: 'bola plasma',
  electro: 'simpul tesla',
  bazooka: 'roket bazooka',
  freeze: 'kristal es',
  rail: 'peluru rel',
  magnet: 'magnet',
  shrink: 'orb pengecil',
  grow: 'orb pembesar',
  pirate: 'bola meriam',
  card: 'kartu remi',
  holy: 'salib suci',
  unicorn: 'tanduk unicorn',
  obliterator: 'orb radioaktif',
  coin: 'koin emas',
  saber: 'bilah foton',
  gauntlet: 'sarung tinju robot',
  ruby: 'rubi',
  emerald: 'kristal zamrud',
  sapphire: 'serpihan safir',
  crystal: 'kristal ametis',
  beerifle: 'sengat lebah',
  charge: 'bola plasma',
  pulse: 'baut pulsa',
  cryo: 'gugusan es',
  hyperdrive: 'inti warp',
  quantum: 'pusaran kuantum',
  wars: 'bekas tembakan',
};

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '=', 'q', 'w', 'e', 'y', 'u'];

const RARITY_STYLE: Record<Rarity, string> = {
  LEGEND: 'bg-gradient-to-b from-[#ffc23a] to-[#ff8a00] text-[#3b1d00]',
  RARE: 'bg-gradient-to-b from-[#5a95ff] to-[#2358e0] text-white',
  EPIC: 'bg-gradient-to-b from-[#b56bff] to-[#7a2fe0] text-white',
  UMUM: 'bg-[#9a95ad] text-white',
};

function RarityTag({ rarity, className }: { rarity: Rarity; className?: string }) {
  return <span className={cn('font-game rounded-md leading-none tracking-wide shadow-sm', RARITY_STYLE[rarity], className)}>{rarity}</span>;
}

const SETS: { id: 1 | 2 | 3 | 4 | 5 | 6 | 7; label: string; sub: string }[] = [
  { id: 1, label: 'SET 1', sub: 'LEGEND • UMUM' },
  { id: 2, label: 'SET 2', sub: 'RARE • UMUM' },
  { id: 3, label: 'SET 3', sub: 'EPIC • RARE' },
  { id: 4, label: 'SET 4', sub: 'LEGEND • EPIC' },
  { id: 5, label: 'SET 5', sub: 'LEGEND • EPIC' },
  { id: 6, label: 'SET 6', sub: 'EPIC • LEGEND' },
  { id: 7, label: 'SET 7', sub: 'LEGEND • EPIC' },
];

export default function App() {
  const [set, setSet] = useState<1 | 2 | 3 | 4 | 5 | 6 | 7>(7);
  const [weapon, setWeapon] = useState<WeaponId>('holy');
  const [info, setInfo] = useState<GameInfo>({ status: 'playing', score: 0, apples: 0, hits: 0, total: 6 });
  const [muted, setMuted] = useState(false);
  const [icons, setIcons] = useState<Partial<Record<WeaponId, string>>>({});
  const gameRef = useRef<GameHandle>(null);
  const setRef = useRef(set);
  const weaponRef = useRef(weapon);
  setRef.current = set;
  weaponRef.current = weapon;
  const def = WEAPON_MAP[weapon];
  const list = useMemo(() => WEAPONS.filter((w) => w.set === set), [set]);

  const onInfo = useCallback((i: GameInfo) => setInfo(i), []);

  // card icons are rendered from the in-game weapon art
  useEffect(() => {
    let dead = false;
    const first = setRef.current;
    const order = [...WEAPONS].sort((p, q) => Number(q.set === first) - Number(p.set === first));
    const timers = order.map((w, i) =>
      window.setTimeout(() => {
        if (dead) return;
        const url = renderWeaponIcon(w.id);
        setIcons((prev) => ({ ...prev, [w.id]: url }));
      }, 30 + i * 22),
    );
    return () => {
      dead = true;
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, []);

  const select = useCallback((id: WeaponId) => {
    if (id === weaponRef.current) gameRef.current?.restart();
    else setWeapon(id);
  }, []);

  const switchSet = useCallback((next: 1 | 2 | 3 | 4 | 5 | 6 | 7) => {
    if (next === setRef.current) return;
    const cur = WEAPONS.filter((w) => w.set === setRef.current);
    const idx = Math.max(0, cur.findIndex((w) => w.id === weaponRef.current));
    const nxt = WEAPONS.filter((w) => w.set === next);
    setSet(next);
    setWeapon(nxt[Math.min(idx, nxt.length - 1)].id);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const n = KEYS.indexOf(e.key.toLowerCase()) + 1;
      if (n >= 1) {
        const l = WEAPONS.filter((w) => w.set === setRef.current);
        if (l[n - 1]) setWeapon(l[n - 1].id);
      }
      if (e.key === 't' || e.key === 'T') switchSet(((setRef.current % 7) + 1) as 1 | 2 | 3 | 4 | 5 | 6 | 7);
      if (e.key === 'r' || e.key === 'R') gameRef.current?.restart();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [switchSet]);

  return (
    <div className="app-bg font-body min-h-[100dvh] w-full text-white">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-2.5 py-2.5 lg:flex-row lg:items-start lg:justify-center lg:gap-8 lg:py-6">
        {/* ───────── GAME ───────── */}
        <div className="game-frame relative shrink-0 overflow-hidden lg:sticky lg:top-6 rounded-[26px] border border-violet-300/25 bg-[#12081f] shadow-[0_0_70px_rgba(140,80,255,0.35),0_20px_60px_rgba(0,0,0,0.6)]">
          <GameView ref={gameRef} weapon={weapon} muted={muted} onInfo={onInfo} />

          <button
            onClick={(e) => {
              e.currentTarget.blur();
              setMuted((m) => !m);
            }}
            className="absolute bottom-3 right-3 z-10 grid h-9 w-9 place-items-center rounded-full border border-white/15 bg-black/35 text-white/80 backdrop-blur transition hover:bg-black/55"
            aria-label={muted ? 'Nyalakan suara' : 'Matikan suara'}
            title={muted ? 'Nyalakan suara' : 'Matikan suara'}
          >
            {muted ? (
              <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 5 6 9H2v6h4l5 4V5z" />
                <path d="m23 9-6 6M17 9l6 6" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 5 6 9H2v6h4l5 4V5z" />
                <path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14" />
              </svg>
            )}
          </button>

          {info.status !== 'playing' && (
            <div className="fade-in absolute inset-0 z-20 flex items-center justify-center bg-[#0b0418]/60 backdrop-blur-[2px]">
              <div className="pop-in mx-6 w-full max-w-[290px] rounded-3xl border border-white/15 bg-gradient-to-b from-[#3d2675] to-[#1a0f33] p-6 text-center shadow-[0_20px_60px_rgba(0,0,0,0.6)]">
                {info.status === 'cleared' ? (
                  <>
                    <div className="font-game text-sm tracking-[0.35em] text-violet-200/90">LEVEL 1</div>
                    <div className="font-game text-gold mt-1 text-[44px] leading-none">SELESAI!</div>
                    <div className="mt-3 flex justify-center gap-2">
                      {[0, 1, 2].map((i) => (
                        <svg key={i} viewBox="0 0 24 24" className="star-pop h-9 w-9 drop-shadow-[0_0_10px_rgba(255,200,60,0.8)]" style={{ animationDelay: `${0.15 + i * 0.15}s` }}>
                          <path fill="#ffd23f" stroke="#b86e00" strokeWidth="1.2" d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z" />
                        </svg>
                      ))}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="font-game text-sm tracking-[0.35em] text-violet-200/90">LEVEL 1</div>
                    <div className="font-game mt-1 text-[44px] leading-none text-[#ff5a6e] drop-shadow-[0_0_14px_rgba(255,60,90,0.6)]">GAGAL!</div>
                    <p className="mt-3 text-[13px] font-semibold leading-snug text-white/75">Tembakanmu mengenai {STUCK_NAME[weapon]} yang sudah tertancap di roda.</p>
                  </>
                )}
                <div className="font-game mt-4 flex items-center justify-center gap-6 text-lg">
                  <div>
                    <span className="text-white/60">SKOR </span>
                    {info.score}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="inline-block h-3.5 w-3.5 rounded-full bg-gradient-to-br from-[#ff8a7a] to-[#b3121a]" />
                    {info.apples}
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.currentTarget.blur();
                    gameRef.current?.restart();
                  }}
                  className="font-game mt-5 w-full rounded-2xl bg-gradient-to-b from-[#ffe066] to-[#ff9f1c] py-3 text-xl tracking-wide text-[#3a1d00] shadow-[0_5px_0_#b35c00] transition active:translate-y-1 active:shadow-[0_1px_0_#b35c00]"
                >
                  {info.status === 'cleared' ? 'MAIN LAGI' : 'COBA LAGI'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ───────── PANEL ───────── */}
        <aside className="flex w-full max-w-[460px] flex-col gap-3 lg:w-[420px] lg:gap-4">
          <header className="order-2 hidden lg:order-1 lg:block">
            <h1 className="font-game text-gold text-5xl leading-none tracking-wide">WEAPON HIT</h1>
            <p className="mt-1.5 text-[15px] font-bold text-violet-200/80">71 Senjata • Level 1 • Efek Tembakan 2D</p>
          </header>

          <div className="order-1 flex flex-col gap-2 lg:order-2 lg:gap-3">
            {/* set tabs */}
            <div className="flex gap-1 sm:gap-2">
              {SETS.map((s) => {
                const active = s.id === set;
                return (
                  <button
                    key={s.id}
                    onClick={(e) => {
                      e.currentTarget.blur();
                      switchSet(s.id);
                    }}
                    className={cn(
                      'flex min-w-0 flex-1 items-center justify-center gap-2 rounded-xl border px-1 py-2 transition sm:px-3',
                      active ? 'border-violet-300/60 bg-gradient-to-b from-[#6a46c9] to-[#40268a] shadow-[0_0_18px_rgba(150,100,255,0.45)]' : 'border-white/10 bg-white/5 text-white/60 hover:bg-white/10',
                    )}
                  >
                    <span className="font-game whitespace-nowrap text-[12.5px] leading-none tracking-normal sm:text-[15px] sm:tracking-wide">{s.label}</span>
                    
                  </button>
                );
              })}
            </div>

            <div className="no-scrollbar -mx-2.5 flex snap-x gap-2 overflow-x-auto px-2.5 py-1.5 lg:mx-0 lg:grid lg:grid-cols-3 lg:gap-3 lg:overflow-visible lg:px-0 lg:py-0">
              {list.map((w, i) => {
                const active = w.id === weapon;
                const src = icons[w.id];
                return (
                  <button
                    key={w.id}
                    onClick={(e) => {
                      e.currentTarget.blur();
                      select(w.id);
                    }}
                    className={cn(
                      'card group relative aspect-square w-[86px] shrink-0 snap-start overflow-hidden rounded-xl border-2 transition-all duration-200 lg:w-auto lg:rounded-2xl',
                      active ? 'z-10 scale-[1.05]' : 'border-white/10 hover:-translate-y-0.5 hover:border-white/30',
                    )}
                    style={active ? { borderColor: w.accent, boxShadow: `0 0 22px ${w.accent}99, inset 0 0 22px ${w.accent}55` } : undefined}
                    title={`${w.name} (${KEYS[i]})`}
                  >
                    {src ? (
                      <img
                        src={src}
                        alt={w.name}
                        draggable={false}
                        className="absolute inset-0 h-full w-full object-contain p-1 drop-shadow-[0_4px_5px_rgba(0,0,0,0.45)] transition-transform duration-300 group-hover:scale-110"
                      />
                    ) : (
                      <span className="absolute inset-4 animate-pulse rounded-full bg-white/10" />
                    )}
                    <RarityTag rarity={w.rarity} className="absolute left-1.5 top-1.5 px-1.5 py-[3px] text-[8.5px] lg:left-2 lg:top-2 lg:px-2 lg:py-1 lg:text-[11px]" />
                    <span className="font-game absolute inset-x-1 bottom-1 truncate rounded-md bg-black/75 px-1 py-[3px] text-center text-[9.5px] leading-none tracking-wide lg:inset-x-2.5 lg:bottom-2 lg:py-1 lg:text-[12.5px]">
                      {w.name}
                    </span>
                    <span className="font-game absolute right-2 top-1.5 hidden text-[11px] text-white/45 lg:block">{KEYS[i]}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <section key={weapon} className="detail-in order-3 rounded-2xl border border-white/10 bg-white/[0.045] p-4 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className="card grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-xl border border-white/10">
                {icons[weapon] && <img src={icons[weapon]} alt="" className="h-full w-full object-contain p-0.5" />}
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-game text-2xl leading-none" style={{ color: def.accent }}>
                    {def.name}
                  </h2>
                  <RarityTag rarity={def.rarity} className="px-2 py-1 text-[11px]" />
                </div>
                <p className="mt-1 text-[13px] font-bold text-white/60">
                  {def.tagline} • {def.ammo} tembakan
                </p>
              </div>
            </div>
            <ul className="mt-3.5 space-y-2.5 text-[13px] font-semibold leading-snug text-white/80">
              {(
                [
                  ['TEMBAKAN', def.fx.tembak, '#ffd166'],
                  ['PELURU', def.fx.peluru, '#7ee0ff'],
                  ['EFEK KENA', def.fx.kena, '#ff8fa3'],
                ] as const
              ).map(([label, text, col]) => (
                <li key={label} className="flex gap-2.5">
                  <span className="font-game mt-[1px] w-[74px] shrink-0 text-[12px] tracking-wide" style={{ color: col }}>
                    {label}
                  </span>
                  <span>{text}</span>
                </li>
              ))}
            </ul>
          </section>

          <div className="order-4 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-[12.5px] font-bold leading-relaxed text-white/60">
            <span className="text-white/85">Cara main:</span> klik / tap layar atau tekan <kbd className="kbd">SPASI</kbd> untuk menembak. Jangan kena yang sudah
            tertancap! Tembak apel untuk bonus. <kbd className="kbd">1</kbd>–<kbd className="kbd">=</kbd> / <kbd className="kbd">Q</kbd> <kbd className="kbd">W</kbd> <kbd className="kbd">E</kbd> <kbd className="kbd">Y</kbd> <kbd className="kbd">U</kbd> ganti senjata, <kbd className="kbd">T</kbd> ganti set,{' '}
            <kbd className="kbd">R</kbd> ulang level.
          </div>
        </aside>
      </div>
    </div>
  );
}
