import { useEffect, useRef, useState } from 'react';
import { Download, LockKeyhole } from 'lucide-react';
import DiamondSprite from '../../shared/DiamondSprite';
import { WEAPONS, getWeapon, RARITY_COLOR, type WeaponId, type Weapon } from '../game/weapons';
import { BOSS_ROSTER, type BossProfile } from '../game/bossRoster';
import { renderBossHead } from '../game/bossRenderer';
import { drawBossProjectile } from '../game/bossProjectileArt';
import { drawGunCentered } from '../game/art/drawCentered';
import { getGunMetrics } from '../game/art/metrics';
import { sfx } from '../game/audio';
import { sfx4 } from '../game/sfx4';
import { useSlideActive } from '../../shared/SlideActivity';
import { SunburstFX } from '../../knife-hit/components/Effects';
import { gunSunburstColor } from '../game/sunburstPalette';
import { EDITABLE_WEAPONS, getGunVariant, setGunVariant, getGunEffect, setGunEffect, getGunVariantOptions, canChooseGunDesign, hasSlide7Update, slide7UpdateSet, hasSlide9Update, hasSlide11Update, hasSlide6Update, type GunVariant } from '../game/art/gunVariants';
import GunVariantPicker from './GunVariantPicker';

type Tab = 'ALL' | 'DESAIN' | 'EPIC' | 'LANGKA' | 'LEGENDARIS' | 'UMUM' | 'BOSS';

interface ArsenalProps {
  current: WeaponId;
  highestLevel: number;
  totalCoins: number;
  diamonds: number;
  /** Naik saat cheat key C dipakai — memaksa sinkron ulang koleksi dari localStorage. */
  refreshKey: number;
  onBuyRare: (id: WeaponId) => boolean;
  onUnlockAll: () => WeaponId[];
  onPick: (id: WeaponId) => void;
  onClose: () => void;
}

// -------------------------------------------------------------
// Gun Render: 100% PERFECT CENTER PIVOT, 30% BIGGER & ZERO CROP!
// -------------------------------------------------------------
function GunItemCanvas({ weapon, isSelected, variant, size = 110 }: { weapon: Weapon; isSelected: boolean; variant: GunVariant; size?: number }) {
  const active = useSlideActive();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = size * dpr;
    cv.height = size * dpr;
    const ctx = cv.getContext('2d');
    if (!ctx) return;

    let raf = 0;
    const start = performance.now();
    let lastDraw = -Infinity;

    const loop = (now: number) => {
      if (now - lastDraw < 1000 / 30 - 1) {
        raf = requestAnimationFrame(loop);
        return;
      }
      lastDraw = now;
      const t = (now - start) / 1000;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, size, size);

      ctx.save();
      // True geometric center pivot
      ctx.translate(size / 2, size / 2);

      // Alive dynamic sway animation (tidak diam saja!)
      const sway = Math.sin(t * 2.8 + (weapon.previewLen || 180)) * 0.045;
      const selectPulse = isSelected ? Math.sin(t * 5) * 0.03 : 0;
      ctx.rotate(Math.PI / 4 + sway + selectPulse);

      // 30% LEBIH BESAR + 100% ZERO CROP FORMULA:
      // Weapon span is the true diagonal length of the gun
      const m = getGunMetrics(weapon.id, variant);
      const span = Math.max(m.span, 130);
      // Scale: 30% bigger than standard while safely fitting inside the 110px canvas
      const scale = (size * 0.92) / span;
      ctx.scale(scale, scale);

      // drawGunCentered places the true mass center precisely at (0, 0)!
      drawGunCentered(ctx, weapon.id, t, 0, true, variant, true);

      ctx.restore();

      // Eleven static thumbnails and just one animated selection: no grid of
      // twelve simultaneous canvas loops while browsing the arsenal.
      if (active && isSelected) raf = requestAnimationFrame(loop);
    };

    loop(start);
    return () => cancelAnimationFrame(raf);
  }, [weapon.id, size, isSelected, active, variant]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: size, height: size }}
      className="block pointer-events-none drop-shadow-[0_6px_14px_rgba(0,0,0,0.7)]"
    />
  );
}

// -------------------------------------------------------------
// Top Spotlight Preview with Sunburst Rays
// -------------------------------------------------------------
function SpotlightGun({ weapon, variant }: { weapon: Weapon; variant: GunVariant }) {
  const active = useSlideActive();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = 220;
    const h = 170;
    cv.width = w * dpr;
    cv.height = h * dpr;
    const ctx = cv.getContext('2d');
    if (!ctx) return;

    let raf = 0;
    const start = performance.now();
    let lastDraw = -Infinity;

    const loop = (now: number) => {
      if (now - lastDraw < 1000 / 30 - 1) {
        raf = requestAnimationFrame(loop);
        return;
      }
      lastDraw = now;
      const t = (now - start) / 1000;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      ctx.save();
      ctx.translate(w / 2, h / 2 - 4);

      ctx.rotate(Math.PI / 4 + Math.sin(t * 2.2) * 0.05);

      const m = getGunMetrics(weapon.id, variant);
      const span = Math.max(m.span, 130);
      const scale = (h * 0.88) / span;
      ctx.scale(scale, scale);

      drawGunCentered(ctx, weapon.id, t, 0, true, variant, true);
      ctx.restore();

      if (active) raf = requestAnimationFrame(loop);
    };

    loop(start);
    return () => cancelAnimationFrame(raf);
  }, [weapon.id, active, variant]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: 220, height: 170 }}
      className="block filter drop-shadow-[0_12px_28px_rgba(255,255,255,0.45)]"
    />
  );
}

function BossAttackPreview({ boss }: { boss: BossProfile }) {
  const active = useSlideActive();
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || !active) return;
    const W = 160, H = 96;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf = 0;
    const start = performance.now();
    const draw = (now: number) => {
      const t = (now - start) / 1000;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = 'rgba(5,9,22,.92)';
      ctx.beginPath(); ctx.roundRect(0, 0, W, H, 12); ctx.fill();
      ctx.strokeStyle = `${boss.accent}88`;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Mini firing loop: boss portrait, weapon projectile, and its real in-game trail.
      ctx.save();
      ctx.translate(27, 48);
      renderBossHead(ctx, boss.id, 17);
      ctx.restore();
      const phase = t % 1.55;
      if (phase < 1.02) {
        const x = 72 + phase * 45;
        drawBossProjectile(ctx, {
          x,
          y: 48 + Math.sin(t * 7) * 1.5,
          vx: 180,
          vy: 0,
          rot: -Math.PI / 2,
          type: boss.id,
        }, t, 0.56);
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [active, boss.id, boss.accent]);

  return <canvas ref={ref} aria-label={`Demo serangan ${boss.name}`} className="h-24 w-40 shrink-0 rounded-xl" />;
}

export default function Arsenal({
  current,
  highestLevel,
  totalCoins,
  diamonds,
  refreshKey,
  onBuyRare,
  onUnlockAll,
  onPick,
  onClose,
}: ArsenalProps) {
  const [tab, setTab] = useState<Tab>('ALL');
  const [page, setPage] = useState(0);
  const [selectedGunId, setSelectedGunId] = useState<WeaponId>(current);
  const [useRandom, setUseRandom] = useState(false);
  const [ownedRare, setOwnedRare] = useState<string[]>(() => {
    try {
      const ids = JSON.parse(localStorage.getItem('gunhit_rare_owned') || '[]');
      return Array.isArray(ids) ? ids.filter((id): id is string => typeof id === 'string') : [];
    } catch { return []; }
  });
  const [editingDesign, setEditingDesign] = useState(false);
  const [, setDesignRevision] = useState(0);
  const [selectedBoss, setSelectedBoss] = useState<BossProfile>(BOSS_ROSTER[0]);
  const [bulkUnlockMessage, setBulkUnlockMessage] = useState('');
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (gridRef.current) gridRef.current.scrollTop = 0; }, [page, tab]);

  // Cheat key C menulis langsung ke localStorage; sinkron ulang koleksi
  // LANGKA supaya gembok hilang seketika meski Arsenal sedang terbuka.
  useEffect(() => {
    if (refreshKey === 0) return;
    try {
      const ids = JSON.parse(localStorage.getItem('gunhit_rare_owned') || '[]');
      setOwnedRare(Array.isArray(ids) ? ids.filter((id): id is string => typeof id === 'string') : []);
    } catch { /* collection save is optional */ }
  }, [refreshKey]);

  useEffect(() => {
    const handleSpace = (event: KeyboardEvent) => {
      if (event.code !== 'Space') return;
      // Consume Space only while Arsenal is mounted, so it never leaks into gameplay fire.
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      if (event.repeat) return;

      const allRare = WEAPONS.filter(w => w.rarity === 'LANGKA');
      const remaining = allRare.filter(w => !ownedRare.includes(w.id));
      if (remaining.length === 0) {
        setBulkUnlockMessage('Semua senjata LANGKA sudah dibeli.');
        return;
      }
      const purchased = onUnlockAll();
      if (purchased.length) {
        setOwnedRare(ids => [...new Set([...ids, ...purchased])]);
        const stillLocked = remaining.length - purchased.length;
        setBulkUnlockMessage(stillLocked
          ? `${purchased.length} dibeli · ${stillLocked} masih terkunci. Per senjata: 500 diamond.`
          : `Semua ${allRare.length} senjata LANGKA terbuka · biaya 500 diamond per senjata.`);
      } else {
        setBulkUnlockMessage('Diamond belum cukup. Senjata LANGKA berharga 500 diamond masing-masing.');
      }
    };
    window.addEventListener('keydown', handleSpace, true);
    return () => window.removeEventListener('keydown', handleSpace, true);
  }, [onUnlockAll, ownedRare]);

  const selectedGun = getWeapon(selectedGunId);
  const selectedVariant = getGunVariant(selectedGunId);
  const isLocked = (w: Weapon) => w.rarity === 'LANGKA' && !ownedRare.includes(w.id);
  const selectedLocked = isLocked(selectedGun);

  // Filter weapons
  const filteredWeapons = WEAPONS.filter((w) => {
    if (tab === 'ALL') return true;
    if (tab === 'DESAIN') return canChooseGunDesign(w.id);
    if (tab === 'EPIC') return w.rarity === 'EPIC';
    if (tab === 'LANGKA') return w.rarity === 'LANGKA';
    if (tab === 'LEGENDARIS') return w.rarity === 'LEGENDARIS';
    if (tab === 'UMUM') return w.rarity === 'UMUM';
    return true;
  });

  // 6 item per halaman (grid 3 kolom x 2 baris) agar 100% pas tanpa kartu yang terpotong di bawah & tanpa scrollbar putih!
  const PAGE_SIZE = 6;
  const totalPages = Math.max(1, Math.ceil(filteredWeapons.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const currentPageWeapons = filteredWeapons.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);
  const unlockedCount = WEAPONS.filter((w) => !isLocked(w)).length;
  const unlockPercent = Math.round((unlockedCount / Math.max(1, WEAPONS.length)) * 100);
  const wheelLockRef = useRef(0);

  const handleGridWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (Math.abs(e.deltaY) < 12) return;
    const now = performance.now();
    if (now - wheelLockRef.current < 160) return;
    wheelLockRef.current = now;
    if (e.deltaY > 0 && safePage < totalPages - 1) {
      setPage(safePage + 1);
      sfx.unlock();
    } else if (e.deltaY < 0 && safePage > 0) {
      setPage(safePage - 1);
      sfx.unlock();
    }
  };

  const handleSelectGun = (w: Weapon) => {
    setSelectedGunId(w.id);
    if (isLocked(w)) return;
    onPick(w.id);
    sfx.unlock();
    sfx4.match();
  };

  const handleRandomToggle = () => {
    const next = !useRandom;
    setUseRandom(next);
    if (next) {
      const available = WEAPONS.filter((w) => !isLocked(w));
      const randW = available[Math.floor(Math.random() * available.length)];
      handleSelectGun(randW);
    }
  };

  const rarityCardTheme = (rarity: Weapon['rarity'], locked: boolean) => {
    if (locked) {
      return 'border-cyan-400/25 bg-gradient-to-b from-slate-900/90 via-slate-950/95 to-[#060913]';
    }
    switch (rarity) {
      case 'LEGENDARIS':
        return 'border-amber-400/55 bg-gradient-to-b from-[#45260b] via-[#281506] to-[#160b03] shadow-[inset_0_1px_14px_rgba(245,158,11,0.25)] hover:border-amber-300/80';
      case 'EPIC':
        return 'border-purple-400/50 bg-gradient-to-b from-[#361761] via-[#220e42] to-[#130726] shadow-[inset_0_1px_14px_rgba(168,85,247,0.25)] hover:border-purple-300/80';
      case 'LANGKA':
        return 'border-blue-400/50 bg-gradient-to-b from-[#162f5e] via-[#0f2042] to-[#091329] shadow-[inset_0_1px_14px_rgba(59,130,246,0.22)] hover:border-blue-300/80';
      default:
        return 'border-slate-400/35 bg-gradient-to-b from-[#252b3d] via-[#191d2b] to-[#10131d] shadow-[inset_0_1px_10px_rgba(148,163,184,0.14)] hover:border-slate-300/65';
    }
  };

  return (
    <div className="pop-in absolute inset-0 z-50 flex flex-col justify-between bg-gradient-to-b from-[#140b2d] via-[#0d0620] to-[#080314] px-3.5 pb-2.5 pt-2.5 text-white font-game select-none backdrop-blur-md">
      {/* Background Starfield & Mountain Silhouettes */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-35">
        <div className="absolute left-8 top-16 h-1 w-1 rounded-full bg-white shadow-[0_0_6px_#fff]" />
        <div className="absolute right-12 top-28 h-1.5 w-1.5 rounded-full bg-cyan-200 shadow-[0_0_8px_#38bdf8]" />
        <div className="absolute left-1/4 top-48 h-1 w-1 rounded-full bg-yellow-200" />
        <div className="absolute right-1/4 top-72 h-1.5 w-1.5 rounded-full bg-fuchsia-300" />
        <div className="absolute -bottom-16 -left-10 -right-10 h-48 rounded-t-[50%] bg-[#05010c]/90 border-t border-purple-900/30" />
      </div>

      {/* TOP BAR */}
      <div className="relative z-10 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          {/* Solid Yellow Knife Hit Back Arrow */}
          <button
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-yellow-300/25 bg-white/5 transition active:scale-90 hover:bg-white/10 drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)]"
            aria-label="Kembali"
          >
            <svg viewBox="0 0 32 32" className="h-7 w-7 fill-[#facc15] filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
              <path d="M 12 6 L 2 16 L 12 26 L 12 21 L 28 21 L 28 11 L 12 11 Z" />
            </svg>
          </button>

          <a
            href={`${import.meta.env.BASE_URL}gun-hit-sga-weapons-svg.zip`}
            download="gun-hit-sga-weapons-svg.zip"
            target="_blank"
            rel="noopener"
            title={`Unduh seluruh ${WEAPONS.length} senjata sebagai SVG vektor dalam satu ZIP`}
            aria-label={`Unduh seluruh ${WEAPONS.length} senjata sebagai SVG vektor dalam satu ZIP`}
            className="flex h-8 items-center gap-1 rounded-xl border border-cyan-300/35 bg-cyan-950/60 px-2.5 text-[9.5px] font-black text-cyan-100 shadow-md backdrop-blur-sm transition hover:bg-cyan-900/70 active:scale-95"
          >
            <Download className="h-3.5 w-3.5 text-cyan-300" />
            SVG ZIP
          </a>
        </div>

        {/* Currency Pill with + */}
        <div className="flex items-center gap-2 rounded-full border border-purple-400/35 bg-[#190d30]/95 py-1 pl-3 pr-1.5 shadow-[0_4px_16px_rgba(0,0,0,0.6)]">
          <span className="text-lg filter drop-shadow">🍎</span>
          <span className="font-mono text-lg font-black text-white drop-shadow">{totalCoins}</span>
          <span className="ml-0.5 flex items-center gap-1 border-l border-white/15 pl-2 font-mono text-base font-black text-cyan-100"><DiamondSprite size={19} /> {diamonds}</span>
          <button
            onClick={() => sfx.coin()}
            className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-b from-[#6366f1] to-[#4338ca] text-sm font-black text-white shadow transition hover:scale-105 active:scale-95"
          >
            +
          </button>
        </div>
      </div>

      {/* TOP SPOTLIGHT */}
      <div className="relative z-10 flex flex-col items-center">
        {/* UNIFIED CONTROL ROW: USE ALL & RARITY/STATUS BADGE */}
        <div className="w-full flex items-center justify-between px-1 pt-1 text-xs font-bold">
          <button
            type="button"
            onClick={handleRandomToggle}
            className="flex items-center gap-2 rounded-full border border-white/15 bg-[#1b0e33]/85 px-2.5 py-1 shadow-md transition hover:border-purple-300/40"
          >
            <span className="text-[9.5px] tracking-wider text-white/90 font-black">USE ALL</span>
            <div className={`flex h-5 w-9 items-center rounded-full p-0.5 transition-colors ${useRandom ? 'bg-[#9333ea]' : 'bg-white/20'}`}>
              <div className={`h-4 w-4 rounded-full bg-white shadow-md transform transition-transform ${useRandom ? 'translate-x-4' : 'translate-x-0'}`} />
            </div>
          </button>

          <div className="flex items-center gap-1.5">
            <span
              className="rounded-full px-2.5 py-0.5 text-[9.5px] font-black text-black shadow-sm tracking-wide"
              style={{ background: RARITY_COLOR[selectedGun.rarity] }}
            >
              {selectedGun.rarity === 'LANGKA' ? 'RARE' : selectedGun.rarity === 'LEGENDARIS' ? 'LEGEND' : selectedGun.rarity}
            </span>
            <div className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 border text-[9.5px] font-black shadow-md ${selectedLocked ? 'border-cyan-300/50 bg-slate-900 text-cyan-100' : 'border-emerald-300/45 bg-gradient-to-r from-emerald-600 to-teal-600 text-white'}`}>
              {selectedLocked ? <><LockKeyhole className="h-3 w-3" /> TERKUNCI</> : '✓ TERBUKA'}
            </div>
          </div>
        </div>

        {/* The same layered FX Lab sunburst used by Knife Boss, recolored per rarity. */}
        <div className="relative -my-3.5 flex items-center justify-center">
          <div className="pointer-events-none absolute inset-0" aria-hidden="true">
            <SunburstFX size={450} color={gunSunburstColor(selectedGun.rarity)} intensity={0.85} speed={30} stars={false} />
          </div>
          <div className={`relative z-10 ${selectedLocked ? 'opacity-35 grayscale' : ''}`}><SpotlightGun weapon={selectedGun} variant={selectedVariant} />{selectedLocked && <div className="absolute inset-0 flex items-center justify-center"><LockKeyhole className="h-14 w-14 rounded-2xl border-2 border-cyan-100/80 bg-slate-950/90 p-3 text-cyan-100 shadow-[0_0_28px_rgba(34,211,238,0.7)]" /></div>}</div>
        </div>

        {/* Active Gun Name & Perk Pill (Elevated z-20 so weapon never overlaps text!) */}
        <div className="relative z-20 -mt-2 flex items-center gap-2 rounded-full border border-white/15 bg-[#120726]/90 px-3.5 py-1 shadow-[0_6px_18px_rgba(0,0,0,0.75)] backdrop-blur-md">
          <span className="text-lg font-black tracking-wide text-yellow-300 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] font-game leading-none">
            {selectedGun.name}
          </span>
          <span className="rounded-full bg-yellow-400/20 px-2 py-0.5 text-[8.5px] font-black tracking-wider text-yellow-200 border border-yellow-400/45 leading-none">
            {selectedGun.perk}
          </span>
          {(hasSlide11Update(selectedGun.id) || hasSlide9Update(selectedGun.id) || hasSlide6Update(selectedGun.id) || hasSlide7Update(selectedGun.id)) && (
            <span
              className="shrink-0 rounded-full border border-emerald-200/80 bg-gradient-to-r from-emerald-400 to-green-500 px-1.5 py-0.5 text-[7.5px] font-black tracking-widest text-[#052e16] leading-none shadow-[0_0_10px_rgba(52,211,153,0.8)]"
              title={hasSlide11Update(selectedGun.id)
                ? 'Senjata ini dapat pembaharuan: desain & efek asli slide 7'
                : hasSlide6Update(selectedGun.id)
                ? 'Senjata ini dapat pembaharuan: desain & efek asli slide 2'
                : hasSlide9Update(selectedGun.id)
                ? 'Senjata ini dapat pembaharuan: desain & efek asli slide 5'
                : `Senjata ini dapat pembaharuan: desain & efek asli slide 3 (SET ${slide7UpdateSet(selectedGun.id)})`}
            >
              NEW
            </span>
          )}
        </div>
        {selectedLocked && (
          <div className="relative z-20 mt-1 flex flex-col items-center gap-0.5">
            <button type="button" onClick={() => {
              if (diamonds < 500) { sfx.coin(); return; }
              if (onBuyRare(selectedGun.id)) setOwnedRare((ids) => ids.includes(selectedGun.id) ? ids : [...ids, selectedGun.id]);
            }} className={`rounded-xl border px-3.5 py-1 text-[10.5px] font-black shadow-lg transition active:scale-95 ${diamonds >= 500 ? 'border-cyan-100 bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:brightness-110' : 'border-white/20 bg-slate-900/90 text-white/55'}`}>
              <LockKeyhole className="inline h-3 w-3" /> BELI · 500 <DiamondSprite size={16} className="inline align-middle" /> {diamonds < 500 ? `(kurang ${500 - diamonds})` : ''}
            </button>
          </div>
        )}
        {canChooseGunDesign(selectedGunId) && (
          <button type="button" onClick={() => setEditingDesign(true)}
            aria-label={`Bandingkan desain ${selectedGun.name}`}
            className="relative z-20 mt-1 rounded-xl border border-amber-200/70 bg-[#342354] px-3.5 py-0.5 text-[10px] font-black text-amber-200 shadow-[0_0_12px_rgba(250,204,21,0.22)] transition hover:bg-[#4d3475] active:scale-95">
            ✦ PILIH DESAIN · {(getGunVariantOptions(selectedGunId).find((v) => v.id === selectedVariant)?.label ?? '').toUpperCase()} ▸
          </button>
        )}
      </div>

      {/* TABS ROW: LOGICAL RARITY ORDER + CLEAR MICRO LABELS */}
      <div className="relative z-10 flex flex-col mt-1">
        <div className="grid grid-cols-7 gap-1 px-1">
          {[
            { id: 'ALL', icon: '👑', label: 'ALL' },
            { id: 'UMUM', icon: '🛡️', label: 'UMUM' },
            { id: 'LANGKA', icon: '💎', label: 'RARE' },
            { id: 'EPIC', icon: '⚡', label: 'EPIC' },
            { id: 'LEGENDARIS', icon: '🔥', label: 'LEGEND' },
            { id: 'DESAIN', icon: '🎨', label: 'SKIN' },
            { id: 'BOSS', icon: '👹', label: 'BOSS' },
          ].map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                aria-label={t.label}
                onClick={() => {
                  setTab(t.id as Tab);
                  setPage(0);
                  sfx.unlock();
                }}
                className={`flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-t-xl transition-all ${
                  active
                    ? 'bg-gradient-to-b from-[#9333ea] to-[#6b21a8] text-white shadow-lg border-t-2 border-x-2 border-purple-200/70 pb-2 z-20 -mb-0.5'
                    : 'bg-[#231242]/80 text-white/55 hover:text-white/90 hover:bg-[#2e1854] border-t border-x border-purple-500/25'
                }`}
              >
                <span className="text-base leading-none filter drop-shadow">{t.icon}</span>
                <span className={`text-[7.5px] font-black tracking-wider leading-none ${active ? 'text-yellow-200' : 'text-white/60'}`}>
                  {t.label}
                </span>
              </button>
            );
          })}
        </div>

        <div className="bg-gradient-to-r from-[#581c87] via-[#7e22ce] to-[#581c87] py-1 px-3 flex items-center justify-between text-[10px] font-black tracking-widest text-white shadow-md uppercase border-t border-purple-300/45 rounded-t-sm">
          <span>
            {tab === 'ALL'
              ? 'ALL WEAPONS'
              : tab === 'DESAIN'
              ? `${EDITABLE_WEAPONS.length} CUSTOM SKINS`
              : tab === 'EPIC'
              ? 'EPIC ARSENAL'
              : tab === 'LANGKA'
              ? 'RARE COLLECTION'
              : tab === 'LEGENDARIS'
              ? 'LEGENDARY WEAPONS'
              : tab === 'UMUM'
              ? 'CLASSIC WEAPONS'
              : 'CARTOON BOSS HEADS'}
          </span>
          {tab !== 'BOSS' && (
            <span className="rounded-md bg-black/35 px-2 py-0.5 text-[9px] font-mono text-purple-100">
              {filteredWeapons.length} ITEM
            </span>
          )}
        </div>
      </div>

      {/* -------------------------------------------------------------
          MAIN GRID: 6 KARTU PER HALAMAN (3x2 PAS TANPA KARTU TERPOTONG
          DI BAWAH & TANPA SCROLLBAR PUTIH!) + WARNA KARTU SESUAI RARITY
         ------------------------------------------------------------- */}
      <div className="relative z-10 flex-1 min-h-0 bg-[#110622]/95 px-2.5 pt-2 pb-2 border-x border-b border-purple-500/35 shadow-2xl flex flex-col justify-between rounded-b-2xl">
        <div role="status" className="mb-1.5 shrink-0 flex items-center justify-center gap-1.5 rounded-lg border border-cyan-400/25 bg-cyan-950/40 px-2.5 py-1 text-center text-[8.5px] font-black tracking-wide leading-tight text-cyan-100/90">
          <DiamondSprite size={13} />
          <span>{bulkUnlockMessage || 'TEKAN SPACE: BORONG SENJATA RARE (500 DIAMOND / SENJATA)'}</span>
        </div>
        {tab !== 'BOSS' ? (
          <>
            <div
              ref={gridRef}
              onWheel={handleGridWheel}
              aria-label="Senjata, gulir untuk melihat semua"
              className="grid grid-cols-3 grid-rows-2 gap-2.5 flex-1 min-h-0 overflow-y-auto overflow-x-hidden [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden p-0.5 items-center justify-items-center"
            >
              {currentPageWeapons.map((w) => {
                const isSelected = selectedGunId === w.id;
                const locked = isLocked(w);
                const rc = RARITY_COLOR[w.rarity];
                const rarityLabel =
                  w.rarity === 'LEGENDARIS'
                    ? 'LEGEND'
                    : w.rarity === 'LANGKA'
                    ? 'RARE'
                    : w.rarity === 'EPIC'
                    ? 'EPIC'
                    : 'UMUM';

                return (
                  <button
                    key={w.id}
                    onClick={() => handleSelectGun(w)}
                    className={`group relative flex h-full max-h-[128px] w-full max-w-[114px] flex-col items-center justify-between p-1.5 rounded-2xl border transition-all overflow-hidden active:scale-95 ${rarityCardTheme(w.rarity, locked)} ${
                      isSelected
                        ? '!border-[2.5px] !border-[#fef08a] ring-2 ring-[#facc15]/70 shadow-[0_0_20px_rgba(253,224,71,0.75),inset_0_0_14px_rgba(253,224,71,0.28)] z-10 scale-[1.02]'
                        : ''
                    }`}
                  >
                    {/* Subtle glossy card top-sheen */}
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-10 rounded-t-2xl bg-gradient-to-b from-white/12 to-transparent" />

                    {/* 1. LABEL RARITY DI ATAS KIRI KOTAK DENGAN BADGE TEGAS */}
                    <div className="w-full flex items-center justify-between z-10">
                      <div
                        className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[8px] font-black text-black tracking-wider shadow"
                        style={{ background: rc }}
                      >
                        <span>{rarityLabel}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {(hasSlide11Update(w.id) || hasSlide9Update(w.id) || hasSlide6Update(w.id) || hasSlide7Update(w.id)) && (
                          <span
                            className="rounded-md border border-emerald-200/80 bg-gradient-to-b from-emerald-400 to-green-500 px-1 py-px text-[7.5px] font-black uppercase leading-none tracking-wider text-[#052e16] shadow-[0_0_8px_rgba(52,211,153,0.75)]"
                            title={hasSlide11Update(w.id)
                              ? 'Desain & efek baru · Slide 7'
                              : hasSlide6Update(w.id)
                              ? 'Desain & efek baru · Slide 2'
                              : hasSlide9Update(w.id)
                              ? 'Desain & efek baru · Slide 5'
                              : `Desain & efek baru · Slide 3 SET ${slide7UpdateSet(w.id)}`}
                          >
                            NEW
                          </span>
                        )}
                        {isSelected && (
                          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-400 text-[9px] font-black text-black shadow">
                            ✓
                          </span>
                        )}
                      </div>
                    </div>

                    {/* 2. VISUAL SENJATA: EXACT CENTER PIVOT */}
                    <div className="relative flex-1 w-full my-auto overflow-visible">
                      <div className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 ${locked ? 'opacity-25 grayscale' : ''}`}>
                        <GunItemCanvas weapon={w} isSelected={isSelected} variant={getGunVariant(w.id)} size={122} />
                      </div>
                      {locked && (
                        <div className="absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2">
                          <LockKeyhole className="h-8 w-8 rounded-xl border border-cyan-200/75 bg-slate-950/90 p-1.5 text-cyan-100 shadow-[0_0_16px_rgba(34,211,238,0.6)]" />
                        </div>
                      )}
                    </div>

                    {/* 3. LABEL NAMA SENJATA DI BAWAH KOTAK */}
                    <div className={`w-full text-[8.5px] font-black text-center leading-tight py-1 rounded-lg px-1 border shadow-inner z-10 ${
                      isSelected
                        ? 'bg-black/85 text-yellow-200 border-yellow-300/35'
                        : 'bg-black/70 text-white border-white/10'
                    }`}>
                      <span className="truncate block drop-shadow">{w.name}</span>
                    </div>
                  </button>
                );
              })}

              {/* Empty placeholder slots */}
              {Array.from({ length: Math.max(0, PAGE_SIZE - currentPageWeapons.length) }).map((_, i) => (
                <div
                  key={`empty-${i}`}
                  className="flex h-full max-h-[128px] w-full max-w-[114px] items-center justify-center rounded-2xl border border-purple-900/25 bg-[#140b28]/40 opacity-25"
                />
              ))}
            </div>

            {/* Pagination Controls & Dots */}
            <div className="flex items-center justify-between pt-1.5 px-1 shrink-0">
              <button
                disabled={safePage <= 0}
                onClick={() => {
                  setPage(Math.max(0, safePage - 1));
                  sfx.unlock();
                }}
                className={`flex h-7 w-9 items-center justify-center rounded-xl border border-purple-400/30 bg-purple-900/60 text-sm font-black transition ${
                  safePage <= 0 ? 'opacity-25 cursor-not-allowed' : 'hover:bg-purple-700 active:scale-90 text-white shadow'
                }`}
              >
                ◀
              </button>

              <div className="flex items-center gap-1.5">
                {Array.from({ length: totalPages }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setPage(i);
                      sfx.unlock();
                    }}
                    aria-label={`Halaman ${i + 1}`}
                    className={`h-2 rounded-full transition-all ${
                      safePage === i ? 'w-5 bg-gradient-to-r from-yellow-300 to-amber-400 shadow-[0_0_8px_rgba(250,204,21,0.7)]' : 'w-2 bg-white/20 hover:bg-white/40'
                    }`}
                  />
                ))}
                <span className="ml-1 rounded-md bg-white/10 px-1.5 py-0.5 font-mono text-[9px] font-black text-purple-200">
                  {safePage + 1}/{totalPages}
                </span>
              </div>

              <button
                disabled={safePage >= totalPages - 1}
                onClick={() => {
                  setPage(Math.min(totalPages - 1, safePage + 1));
                  sfx.unlock();
                }}
                className={`flex h-7 w-9 items-center justify-center rounded-xl border border-purple-400/30 bg-purple-900/60 text-sm font-black transition ${
                  safePage >= totalPages - 1 ? 'opacity-25 cursor-not-allowed' : 'hover:bg-purple-700 active:scale-90 text-white shadow'
                }`}
              >
                ▶
              </button>
            </div>
          </>
        ) : (
          /* Boss Heads Tab */
          <div className="flex flex-1 flex-col gap-2.5 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden p-1">
            <div className="flex items-center gap-4 rounded-2xl border border-purple-400/40 bg-[#1e1038] p-3 shadow-lg">
              <div
                className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-xl border-2 overflow-hidden bg-black/50"
                style={{ borderColor: selectedBoss.accent }}
              >
                <canvas
                  ref={(cv) => {
                    if (!cv) return;
                    cv.width = cv.height = 160;
                    const ctx = cv.getContext('2d');
                    if (!ctx) return;
                    ctx.setTransform(2, 0, 0, 2, 0, 0);
                    ctx.clearRect(0, 0, 80, 80);
                    ctx.save();
                    ctx.translate(40, 40);
                    renderBossHead(ctx, selectedBoss.id, 35);
                    ctx.restore();
                  }}
                  style={{ width: 80, height: 80 }}
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-lg font-black text-white" style={{ color: selectedBoss.accent }}>
                  {selectedBoss.name}
                </div>
                <div className="text-xs font-bold text-white/70">{selectedBoss.title}</div>
                <div className="text-[10px] text-white/50 mt-0.5 leading-tight">{selectedBoss.desc}</div>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#110a24] p-2.5">
              <BossAttackPreview boss={selectedBoss} />
              <div className="min-w-0">
                <div className="text-[9px] font-black tracking-[0.16em] text-white/55">DEMO SERANGAN BOS</div>
                <div className="mt-1 text-[12px] font-black leading-tight" style={{ color: selectedBoss.accent }}>
                  {selectedBoss.projectileEmoji} {selectedBoss.projectileName}
                </div>
                <div className="mt-1 text-[9px] leading-tight text-white/55">Senjata dan efek serangan bergerak sesuai karakter boss.</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {BOSS_ROSTER.map((b, idx) => {
                const beaten = highestLevel >= (idx + 1) * 5;
                const isSel = selectedBoss.id === b.id;
                return (
                  <button
                    key={b.id}
                    onClick={() => {
                      setSelectedBoss(b);
                      sfx.unlock();
                    }}
                    className={`flex items-center gap-2 rounded-xl border p-2 text-left transition ${
                      isSel ? 'border-amber-300 bg-[#2d1656]' : 'border-purple-500/20 bg-[#1e1038] hover:bg-[#27144a]'
                    }`}
                  >
                    <span className="text-2xl">{b.id === 'knight' ? '🛡️' : b.id === 'oni' ? '👺' : b.id === 'cyborg' ? '🤖' : '🏴‍☠️'}</span>
                    <div>
                      <div className="text-xs font-bold text-white leading-none">{b.name}</div>
                      <div className="text-[9px] text-white/50 mt-0.5">LEVEL {(idx + 1) * 5} {beaten ? '✓' : ''}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* FOOTER BAR WITH VISUAL COLLECTION PROGRESS */}
      <div className="relative z-10 mt-2 flex h-10 w-full items-center gap-3 rounded-2xl bg-gradient-to-r from-[#3b0764] via-[#581c87] to-[#3b0764] px-3.5 font-game text-xs font-black shadow-xl border border-purple-300/35">
        <span className="shrink-0 rounded-xl bg-black/50 px-2.5 py-0.5 font-mono text-xs text-yellow-300 border border-yellow-300/25">
          {unlockedCount} / {WEAPONS.length}
        </span>
        <div className="relative h-2.5 flex-1 overflow-hidden rounded-full bg-black/50 border border-white/10 p-0.5">
          <div
            className="h-full rounded-full bg-gradient-to-r from-amber-400 via-yellow-300 to-emerald-400 shadow-[0_0_8px_rgba(250,204,21,0.65)] transition-all duration-300"
            style={{ width: `${unlockPercent}%` }}
          />
        </div>
        <span className="shrink-0 tracking-wider text-[10.5px] text-white drop-shadow">
          {unlockedCount} SENJATA TERBUKA
        </span>
      </div>
      {editingDesign && canChooseGunDesign(selectedGunId) && (
        <GunVariantPicker
          weapon={selectedGun}
          variantId={selectedGunId}
          selected={selectedVariant}
          effect={getGunEffect(selectedGunId)}
          onSelect={(variant) => {
            setGunVariant(selectedGunId, variant);
            setDesignRevision((n) => n + 1);
            sfx.unlock();
          }}
          onEffectSelect={(effect) => {
            setGunEffect(selectedGunId, effect);
            setDesignRevision((n) => n + 1);
            sfx.unlock();
          }}
          onClose={() => setEditingDesign(false)}
        />
      )}
    </div>
  );
}
