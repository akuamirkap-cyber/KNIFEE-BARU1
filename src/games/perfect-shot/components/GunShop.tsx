import { useEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent } from "react";
import { sfx } from "../audio/sfx";
import { hoverSfx } from "../audio/useSound";
import { useGame } from "../game/store";
import { WeaponPose } from "../shop/WeaponArt";
import {
  filterWeapons,

  RARITY_LEVEL,
  RARITY_STYLE,
  TABS,
  WEAPONS,
  type TabId,
  type Weapon,
} from "../shop/weapons";
import { SHOP_IN, SHOP_OUT } from "../shop/timeline";
import { Coin } from "./Bits";
import { Ico, type FlatName } from "../ui/FlatIcons";
import { Gem } from "../gift/GiftArt";
import type { Rarity } from "../shop/weapons";

const RARITY_ICON: Record<Rarity, FlatName> = { UMUM: "shield", RARE: "gem", EPIC: "bolt", LEGEND: "fire", SKIN: "palette", BOSS: "demon" };
const TAB_COL: Record<string, string> = { ALL: "#fde68a", UMUM: "#cbd5e1", RARE: "#7dd3fc", EPIC: "#d8b4fe", LEGEND: "#fdba74", SKIN: "#f9a8d4", BOSS: "#fca5a5" };

type Props = {
  leaving: boolean;
  coins: number;
  gems: number;
  onBack: (e: MouseEvent<HTMLElement>) => void;
};

type GridPhase = "in" | "out";
type GridDir = "deal" | "next" | "prev" | "scatter";

const FX = [
  { name: "None", filter: "drop-shadow(0 14px 18px rgba(0,0,0,.55))", aura: "transparent" },
  { name: "Frost", filter: "drop-shadow(0 0 10px #38bdf8) drop-shadow(0 14px 18px rgba(0,0,0,.5))", aura: "rgba(56,189,248,.35)" },
  { name: "Gold", filter: "drop-shadow(0 0 12px rgba(255,214,90,.85)) drop-shadow(0 14px 18px rgba(0,0,0,.5))", aura: "rgba(255,214,90,.35)" },
  { name: "Void", filter: "drop-shadow(0 0 12px #c084fc) drop-shadow(0 0 26px #7c3aed)", aura: "rgba(168,85,247,.4)" },
];
const DEFAULT_COMBO = { skin: 0, fx: 2 };

const v = (o: Record<string, string | number>) => o as CSSProperties;

export function GunShop({ leaving, coins, gems, onBack }: Props) {
  const [tab, setTab] = useState<TabId>("ALL");
  // only booleans live in React state; the scroll rail is moved directly via a ref (no re-render per frame)
  const [sc, setSc] = useState({ atTop: true, far: false, can: false });
  const thumbRef = useRef<HTMLDivElement>(null);
  const scRaf = useRef(0);
  const gridRef = useRef<HTMLDivElement>(null);
  const lastRow = useRef(0);
  const [selected, setSelected] = useState(0);
  const [heroKey, setHeroKey] = useState(0);
  const [combo, setCombo] = useState(DEFAULT_COMBO);
  const [entered, setEntered] = useState(false);
  const [grid, setGrid] = useState<{ phase: GridPhase; dir: GridDir; key: number }>({ phase: "in", dir: "deal", key: 0 });
  const [shake, setShake] = useState<{ id: number; n: number } | null>(null);
  const [pillShake, setPillShake] = useState(0);
  const [toast, setToast] = useState<{ text: string; n: number; tone: "ok" | "bad"; icon?: FlatName } | null>(null);
  const [count, setCount] = useState(0);
  const busy = useRef(false);
  const heroRef = useRef<HTMLDivElement>(null);

  const list = useMemo(() => filterWeapons(tab), [tab]);
  const owned = useGame().owned;
  const isLocked = (w: Weapon) => w.locked && !owned.includes(w.id);
  const openCount = WEAPONS.filter((w) => !isLocked(w)).length;
  const openRef = useRef(openCount);
  openRef.current = openCount;
  const sel = WEAPONS[selected];
  const out = leaving;

  /* ---------------- entrance clock ---------------- */
  useEffect(() => {
    const id = window.setTimeout(() => setEntered(true), SHOP_IN.ready);
    // count-up for the progress number
    let raf = 0;
    const start = performance.now() + SHOP_IN.fill.d;
    const tick = (now: number) => {
      const p = Math.min(1, Math.max(0, (now - start) / SHOP_IN.fill.dur));
      setCount(Math.round(openRef.current * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      clearTimeout(id);
      cancelAnimationFrame(raf);
    };
  }, []);

  const showToast = (text: string, tone: "ok" | "bad" = "ok", icon?: FlatName) => setToast({ text, n: Date.now(), tone, icon });

  /* ---------------- grid transitions ---------------- */
  const swapGrid = (dir: GridDir, apply: () => void) => {
    if (busy.current) return;
    busy.current = true;
    setGrid((g) => ({ ...g, phase: "out", dir }));
    window.setTimeout(() => {
      apply();
      setGrid((g) => ({ phase: "in", dir, key: g.key + 1 }));
      if (dir === "deal" || dir === "scatter") sfx.deal(0, 6, 0.06, 0.3);
      window.setTimeout(() => (busy.current = false), 450);
    }, 280);
  };

  const changeTab = (id: TabId, i: number) => {
    if (id === tab || busy.current) return;
    sfx.tabSwitch(i);
    swapGrid("scatter", () => {
      setTab(id);
      if (gridRef.current) gridRef.current.scrollTop = 0;
      setSc((p) => ({ ...p, atTop: true, far: false }));
    });
  };

  const measureScroll = () => {
    const el = gridRef.current;
    if (!el) return;
    const max = el.scrollHeight - el.clientHeight;
    const frac = el.scrollHeight > 0 ? el.clientHeight / el.scrollHeight : 1;
    const ratio = max > 0 ? el.scrollTop / max : 0;
    const th = thumbRef.current;
    if (th) {
      const h = Math.max(10, frac * 100);
      th.style.height = `${h}%`;
      th.style.transform = `translateY(${(ratio * (100 - h) * 100) / h}%)`;
    }
    const next = { atTop: el.scrollTop < 8, far: el.scrollTop > 260, can: frac < 0.99 };
    setSc((p) => (p.atTop === next.atTop && p.far === next.far && p.can === next.can ? p : next));
    const row = Math.floor(el.scrollTop / 120);
    if (row !== lastRow.current) {
      lastRow.current = row;
      if (entered) sfx.hover();
    }
  };
  const onGridScroll = () => {
    if (scRaf.current) return;
    scRaf.current = requestAnimationFrame(() => {
      scRaf.current = 0;
      measureScroll();
    });
  };
  useEffect(() => {
    const id = window.setTimeout(measureScroll, 60);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, grid.key, entered]);

  const toTop = () => {
    sfx.whoosh(0, 0.35, 2600, 500, 0.1);
    gridRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  const pick = (w: Weapon) => {
    if (isLocked(w)) {
      sfx.lockedBuzz();
      setShake({ id: w.id, n: Date.now() });
      showToast(`${w.name} terkunci — butuh 500 diamond`, "bad", "lock");
      return;
    }
    if (w.id === selected) {
      sfx.tap(0, 1400);
      return;
    }
    sfx.selectWeapon(RARITY_LEVEL[w.rarity], w.kind);
    setSelected(w.id);
    setCombo(DEFAULT_COMBO);
    setHeroKey((k) => k + 1);
  };

  /* ---------------- keyboard ---------------- */
  useEffect(() => {
    if (!entered || leaving) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        sfx.denied();
        setPillShake(Date.now());
        showToast(`Diamond tidak cukup (${gems}/500)`, "bad", "gem");
      } else if (e.code === "ArrowDown") gridRef.current?.scrollBy({ top: 130, behavior: "smooth" });
      else if (e.code === "ArrowUp") gridRef.current?.scrollBy({ top: -130, behavior: "smooth" });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  /* ---------------- utility actions ---------------- */





  const designIdx = combo.skin * 4 + combo.fx;
  const cycleDesign = () => {
    const n = (designIdx + 1) % 8;
    setCombo({ skin: Math.floor(n / 4), fx: n % 4 });
    sfx.design(n);
  };

  /* ---------------- animation helpers ---------------- */
  const A = (inCls: string, i: { d: number; dur: number }, outCls: string, o: { d: number; dur: number }, extra = "") => ({
    className: `a ${out ? outCls : inCls} ${extra}`,
    style: v({ "--d": `${out ? o.d : i.d}ms`, "--dur": `${out ? o.dur : i.dur}ms` }),
  });

  const cardAnim = (i: number) => {
    const col = i % 3;
    const k = Math.min(i, 11);
    const vars = {
      "--cx": `${(1 - col) * 105}%`,
      "--cr": `${(col - 1) * -24}deg`,
      "--ox": `${(col - 1) * 60}%`,
      "--or": `${(col - 1) * 30 + (i < 3 ? -10 : 10)}deg`,
    };
    if (out) {
      if (i > 8) return { cls: "out-fade", style: v({ "--d": "0ms", "--dur": "250ms" }) };
      const s = SHOP_OUT.card(Math.min(5, i));
      return { cls: "sh-card-out", style: v({ ...vars, "--d": `${s.d}ms`, "--dur": `${s.dur}ms` }) };
    }
    if (grid.phase === "out") return { cls: "sh-card-flipout", style: v({ ...vars, "--d": `${k * 15}ms`, "--dur": "240ms" }) };
    if (grid.key === 0) {
      if (i > 8) return { cls: "in-fade", style: v({ "--d": `${SHOP_IN.card(9).d}ms`, "--dur": "500ms" }) };
      const s = SHOP_IN.card(i);
      return { cls: "sh-card-in", style: v({ ...vars, "--d": `${s.d}ms`, "--dur": `${s.dur}ms` }) };
    }
    if (i > 11) return { cls: "in-fade", style: v({ "--d": "300ms", "--dur": "400ms" }) };
    return { cls: "sh-card-in", style: v({ ...vars, "--d": `${k * 45}ms`, "--dur": "520ms" }) };
  };

  const heroCls = out ? "sh-hero-out" : heroKey === 0 ? "sh-hero-in" : "sh-hero-swap";
  const heroStyle = out
    ? v({ "--d": `${SHOP_OUT.hero.d}ms`, "--dur": `${SHOP_OUT.hero.dur}ms` })
    : heroKey === 0
      ? v({ "--d": `${SHOP_IN.hero.d}ms`, "--dur": `${SHOP_IN.hero.dur}ms` })
      : v({ "--d": "120ms", "--dur": "620ms" });
  const heroLand = heroKey === 0 ? SHOP_IN.hero.d + SHOP_IN.hero.dur * SHOP_IN.hero.land : 120 + 620 * 0.55;
  const plateStyle = heroKey === 0 ? SHOP_IN.plate : { d: 260, dur: 460 };
  const skinFilter = combo.skin === 1 ? `sepia(.55) saturate(2.4) hue-rotate(${(sel.id * 47) % 360}deg) ` : "";
  const rs = RARITY_STYLE[sel.rarity];

  return (
    <div className={`absolute inset-0 overflow-hidden ${entered && !out ? "" : "pointer-events-none"}`}>
      {/* ================= BACKGROUND ================= */}
      <div {...A("sh-bg-in", SHOP_IN.bg, "out-bg", SHOP_OUT.bg, "absolute inset-0")}>
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(180deg, #2b1f4d 0%, #1d1238 45%, #140b29 100%)" }}
        />
        <div
          className="absolute inset-0"
          style={{ background: "radial-gradient(ellipse 70% 30% at 50% 17%, rgba(214,205,255,.45), rgba(120,100,200,.15) 50%, transparent 75%)" }}
        />
        {Array.from({ length: 14 }).map((_, i) => (
          <span
            key={i}
            className="firefly absolute rounded-full"
            style={v({
              left: `${(i * 37) % 100}%`,
              top: `${(i * 23) % 60}%`,
              width: 3 + (i % 3),
              height: 3 + (i % 3),
              background: i % 4 === 0 ? "#7dd3fc" : "#c4b5fd",
              boxShadow: "0 0 6px 2px rgba(190,170,255,.4)",
              "--fd": `${5 + (i % 4)}s`,
              "--fdl": `${-i * 0.7}s`,
              "--fx": `${(i % 2 ? 1 : -1) * 14}px`,
              "--fy": "-20px",
            })}
          />
        ))}
      </div>

      {/* spotlight cone */}
      <div
        {...A("sh-spot-in", SHOP_IN.spot, "out-fade", { d: 60, dur: 300 }, "pointer-events-none absolute left-1/2 top-0 h-[40%] w-[80%] -translate-x-1/2 origin-top")}
      >
        <div
          className="h-full w-full"
          style={{
            background: "linear-gradient(180deg, rgba(255,255,255,.22), rgba(255,255,255,0) 85%)",
            clipPath: "polygon(38% 0, 62% 0, 100% 100%, 0 100%)",
            filter: "blur(6px)",
          }}
        />
      </div>

      <div className="relative flex h-full flex-col px-3 pt-3 pb-2.5">
        {/* ================= TOP BAR ================= */}
        <div className="relative z-20 flex items-center gap-2.5">
          <div {...A("in-down", SHOP_IN.top(0), "out-up", SHOP_OUT.top(0))}>
            <button
              onClick={onBack}
              onPointerEnter={hoverSfx}
              className="press grid h-11 w-11 place-items-center rounded-2xl border-2 border-[#7a4b00] bg-gradient-to-b from-[#ffe27a] to-[#f59e0b] shadow-[0_4px_0_#7a4b00,inset_0_2px_0_rgba(255,255,255,.5)]"
            >
              <svg viewBox="0 0 24 24" className="h-7 w-7">
                <path d="M11 4 L3 12 L11 20 V15 H21 V9 H11 Z" fill="#fff" stroke="#7a4b00" strokeWidth="1.8" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
          <div {...A("in-down", SHOP_IN.top(1), "out-up", SHOP_OUT.top(1), "min-w-0 flex-1")}>
            <div className="font-title truncate text-[22px] leading-none text-white" style={{ textShadow: "0 2px 0 #2a1650, 0 0 14px rgba(192,132,252,.55)" }}>
              ARMORY
            </div>
            <div className="font-title mt-1 flex items-center gap-1 text-[11px] tracking-wider text-[#c4b5fd]"><Ico name="gun" className="h-3.5 w-3.5" color="#c4b5fd" /> {count}/{WEAPONS.length} TERBUKA</div>
          </div>
          <div {...A("in-down", SHOP_IN.top(3), "out-up", SHOP_OUT.top(3))}>
            <div key={pillShake} className={pillShake ? "sh-shake" : ""}>
              <div className="font-title flex h-10 items-center gap-1.5 rounded-full border-2 border-white/10 bg-black/45 pl-1.5 pr-1 text-white shadow-inner">
                <Coin size={24} />
                <span className="min-w-[30px] text-[16px]">{coins}</span>
                <span className="h-5 w-px bg-white/20" />
                <Gem className="h-5 w-5" />
                <span className="text-[16px]">{gems}</span>
                <button
                  onPointerEnter={hoverSfx}
                  onClick={() => {
                    sfx.confirm();
                    showToast("Toko diamond segera hadir!", "ok", "cart");
                  }}
                  className="press grid h-8 w-8 place-items-center rounded-full bg-gradient-to-b from-[#7c6cff] to-[#4b3bd6] text-lg leading-none shadow-[0_2px_0_#2a1f8a]"
                >
                  +
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ================= HERO SHOWCASE ================= */}
        <div className="relative mt-1 flex h-[clamp(120px,20vh,185px)] shrink-0 items-center justify-center">
          <div {...A("in-rays", SHOP_IN.rays, "out-rays", { d: 80, dur: 500 }, "absolute h-[150%] aspect-square")}>
            <div
              className="spin-slow h-full w-full rounded-full"
              style={{
                background: "repeating-conic-gradient(from 0deg, rgba(255,255,255,.2) 0deg 6deg, transparent 6deg 18deg)",
                WebkitMask: "radial-gradient(circle, #000 0%, rgba(0,0,0,.5) 35%, transparent 68%)",
                mask: "radial-gradient(circle, #000 0%, rgba(0,0,0,.5) 35%, transparent 68%)",
              }}
            />
          </div>
          <div className="pointer-events-none absolute h-40 w-40 rounded-full transition-colors duration-500" style={{ background: `radial-gradient(circle, ${FX[combo.fx].aura}, transparent 70%)` }} />
          {/* podium */}
          <div className="pointer-events-none absolute bottom-0 left-1/2 h-6 w-48 -translate-x-1/2 rounded-[50%] border-2 border-[#c084fc]/40 bg-gradient-to-b from-[#3b2a66] to-[#1a1033] shadow-[0_0_24px_rgba(168,85,247,.35)]" />

          {!out && (
            <div key={`fx-${heroKey}`} className="pointer-events-none absolute inset-0">
              <div className="a sh-flash absolute left-1/2 top-1/2 -ml-24 -mt-24 h-48 w-48 rounded-full" style={v({ "--d": `${heroLand - 40}ms`, "--dur": "600ms", background: "radial-gradient(circle, rgba(255,255,255,.95), rgba(255,240,200,.5) 35%, transparent 70%)" })} />
              <div className="a sh-dust absolute bottom-[2%] left-1/2 h-6 w-36 rounded-[50%]" style={v({ "--d": `${heroLand}ms`, "--dur": "700ms", background: "radial-gradient(ellipse, rgba(220,210,255,.7), transparent 70%)" })} />
            </div>
          )}

          <div key={`hero-${heroKey}`} className={`a ${heroCls} relative h-[88%] w-[46%]`} style={heroStyle}>
            <div ref={heroRef} className="float grid h-full w-full place-items-center">
              <div className="grid h-full w-full place-items-center transition-[filter] duration-500" style={{ filter: `${skinFilter}${FX[combo.fx].filter}` }}>
                <WeaponPose kind={sel.kind} pal={sel.pal} size="hero" />
              </div>
            </div>
            {combo.fx >= 2 && (
              <div className="sh-orbit pointer-events-none absolute inset-0">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="absolute h-1.5 w-1.5 rounded-full"
                    style={{
                      left: `${50 + 42 * Math.cos((i * Math.PI * 2) / 3)}%`,
                      top: `${50 + 42 * Math.sin((i * Math.PI * 2) / 3)}%`,
                      background: combo.fx === 2 ? "#ffe48a" : "#d8b4fe",
                      boxShadow: `0 0 8px 3px ${combo.fx === 2 ? "rgba(255,214,90,.8)" : "rgba(168,85,247,.8)"}`,
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ================= NAME PLATE (compact) ================= */}
        <div className="relative z-10 mt-1.5 flex items-center justify-center gap-2">
          <div key={`plate-${heroKey}`} {...A("in-slam", plateStyle, "out-up", SHOP_OUT.plate)}>
            <div className="flex items-center gap-2 rounded-2xl border-2 border-[#ffd23f]/30 bg-gradient-to-b from-[#2a1d48] to-[#140b26] px-4 py-2 shadow-[0_6px_16px_rgba(0,0,0,.5),inset_0_1px_0_rgba(255,255,255,.12)]">
              <span className="font-title text-[24px] leading-none text-[#ffd23f]" style={{ textShadow: "0 2px 0 #9c5a10, 0 0 12px rgba(255,210,63,.35)" }}>
                {sel.name.toUpperCase()}
              </span>
              <span className={`font-title flex items-center gap-1 rounded-md px-2 py-[4px] text-[12px] leading-none ${rs.chip}`}>
                <Ico name={RARITY_ICON[sel.rarity]} className="h-3.5 w-3.5" color="currentColor" />
                {sel.rarity}
              </span>
            </div>
          </div>
          <div {...A("in-pop", SHOP_IN.pill, "out-up", { d: 30, dur: 360 })}>
            <button
              onPointerEnter={hoverSfx}
              onClick={cycleDesign}
              aria-label="Ganti desain"
              title={`Desain ${designIdx + 1}/8`}
              className="press relative grid h-12 w-12 place-items-center rounded-2xl border-2 border-[#c084fc]/60 bg-gradient-to-b from-[#7c3aed] to-[#4c1d95] shadow-[0_4px_0_#2e1065]"
            >
              <Ico name="palette" className="h-6 w-6" color="#ffffff" />
              <span className="font-title absolute -bottom-1.5 -right-1.5 rounded-full bg-[#fbbf24] px-1.5 py-[1px] text-[10px] leading-none text-[#4a2a00] ring-2 ring-[#140b26]">{designIdx + 1}/8</span>
            </button>
          </div>
        </div>

        {/* ================= TABS ================= */}
        <div className="relative z-10 mt-3 grid grid-cols-7 gap-1">
          {TABS.map((t, i) => {
            const active = t.id === tab;
            return (
              <div key={t.id} {...A("in-pop", SHOP_IN.tab(i), "out-down", SHOP_OUT.tab(i))}>
                <button
                  onPointerEnter={hoverSfx}
                  onClick={() => changeTab(t.id, i)}
                  className={`press flex w-full flex-col items-center gap-0.5 rounded-t-xl border-x-2 border-t-2 pt-1.5 pb-1 transition-all duration-300 ${
                    active ? "-translate-y-1 border-[#f0abfc]/70 bg-gradient-to-b from-[#c026d3] to-[#7e22ce] shadow-[0_-4px_14px_rgba(192,38,211,.45)]" : "border-white/10 bg-gradient-to-b from-[#3a2d5c] to-[#271c42]"
                  }`}
                >
                  <span className={active ? "bounce-soft" : ""}>
                    <Ico name={t.icon} className="h-[20px] w-[20px]" color={active ? "#ffffff" : TAB_COL[t.id]} />
                  </span>
                  <span className={`font-title text-[10px] leading-none ${active ? "text-white" : "text-white/70"}`}>{t.id}</span>
                </button>
              </div>
            );
          })}
        </div>

        {/* ================= PANEL (SCROLL) ================= */}
        <div {...A("sh-panel-in", SHOP_IN.panel, "sh-panel-out", SHOP_OUT.panel, "relative z-10 flex min-h-0 flex-1 flex-col origin-bottom")}>
          <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-b-2xl rounded-tr-2xl border-2 border-[#7e22ce]/80 bg-gradient-to-b from-[#1e1338] to-[#140c27] shadow-[0_10px_30px_rgba(0,0,0,.5)]">
            <div className="flex items-center justify-between bg-gradient-to-r from-[#5b21b6] to-[#3b1a6e] px-3 py-2">
              <span key={tab} className="a in-left font-title text-[15px] text-white" style={v({ "--d": "0ms", "--dur": "450ms" })}>
                {tab === "ALL" ? "SEMUA SENJATA" : `SENJATA ${tab}`}
              </span>
              <span className="font-title rounded-lg bg-black/40 px-2 py-1 text-[11px] text-white/85">{list.length} ITEM</span>
            </div>
            <div
              ref={gridRef}
              onScroll={onGridScroll}
              className="no-scrollbar smooth-scroll relative min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-2.5 pt-2.5 pb-6"

            >
              <div key={grid.key} className="grid grid-cols-3 gap-2.5">
                {list.map((w, i) => {
                  const ca = cardAnim(i);
                  const isSel = w.id === selected;
                  const shaking = shake?.id === w.id;
                  const locked = isLocked(w);
                  const r = RARITY_STYLE[w.rarity];
                  return (
                    <div key={w.id} className={`a cv-card ${ca.cls}`} style={ca.style}>
                      <button
                        key={shaking ? shake!.n : 0}
                        onPointerEnter={hoverSfx}
                        onClick={() => pick(w)}
                        className={`press relative block aspect-[1/1.12] w-full overflow-hidden rounded-2xl border-2 text-left ${isSel ? "sh-sel border-[#ffe066]" : "border-black/40"} ${shaking ? "sh-shake" : ""}`}
                        style={{
                          background: locked ? "linear-gradient(180deg, #2a2f3a, #161a22)" : `radial-gradient(circle at 50% 42%, ${r.ring}40, transparent 65%), linear-gradient(180deg, #4a4f5c, #23262f)`,
                        }}
                      >
                        <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/10 to-transparent" />
                        <div className="absolute inset-x-1.5 top-7 bottom-9 grid place-items-center" style={{ filter: locked ? "brightness(.18) saturate(0)" : "drop-shadow(0 6px 6px rgba(0,0,0,.5))" }}>
                          <WeaponPose kind={w.kind} pal={w.pal} />
                        </div>
                        <div className="absolute left-1.5 top-1.5 flex items-center gap-1">
                          <span className={`font-title flex items-center gap-1 rounded-md px-1.5 py-[3px] text-[11px] leading-none shadow-[0_2px_0_rgba(0,0,0,.35)] ${r.chip}`}>
                            <Ico name={RARITY_ICON[w.rarity]} className="h-3 w-3" color="currentColor" />
                            {w.rarity}
                          </span>
                        </div>
                        {w.star && (
                          <span className="absolute left-1.5 top-[30px] grid h-[20px] w-[20px] place-items-center rounded-md bg-[#ffd23f] shadow-[0_2px_0_#9a5b00]">
                            <Ico name="star" className="h-3.5 w-3.5" color="#7a4300" />
                          </span>
                        )}
                        {isSel ? (
                          <span className="a in-pop absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-full bg-[#22c55e] shadow ring-2 ring-[#0f3b1f]" style={v({ "--d": "0ms", "--dur": "400ms" })}>
                            <Ico name="check" className="h-3.5 w-3.5" color="#ffffff" />
                          </span>
                        ) : (
                          w.isNew && <span className="font-title absolute right-1.5 top-[30px] rounded-full border border-[#3fdc72] bg-[#0f3b1f] px-1.5 py-[3px] text-[10px] leading-none text-[#4ade80]">NEW</span>
                        )}
                        {locked && (
                          <div className="absolute inset-0 grid place-items-center">
                            <span key={shaking ? shake!.n : 0} className={`grid h-12 w-12 place-items-center rounded-2xl border-2 border-[#22d3ee] bg-[#08202a]/85 shadow-[0_0_16px_rgba(34,211,238,.6)] ${shaking ? "sh-lock-wiggle" : ""}`}>
                              <Ico name="lock" className="h-7 w-7" color="#e0fbff" />
                            </span>
                          </div>
                        )}
                        <div className="absolute inset-x-1.5 bottom-1.5">
                          <div
                            className={`font-title break-words rounded-lg border px-1 py-[5px] text-center leading-[1.05] ${isSel ? "border-[#ffe066]/70 bg-black/80 text-[#ffe066]" : "border-white/10 bg-black/70 text-white"}`}
                            style={{ fontSize: w.name.length <= 8 ? 13 : w.name.length <= 10 ? 12 : 11.5 }}
                          >
                            {w.name.toUpperCase()}
                          </div>
                        </div>
                      </button>
                    </div>
                  );
                })}
              </div>
              <div className="font-title mt-4 text-center text-[11px] tracking-wider text-white/35">— {list.length} SENJATA · AKHIR DAFTAR —</div>
            </div>

            {/* scroll rail */}
            {/* soft fades (overlays instead of a mask → no repaint while scrolling) */}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 rounded-b-2xl bg-gradient-to-t from-[#140c27] to-transparent" />
            {sc.can && (
              <div className="pointer-events-none absolute right-1 top-[86px] bottom-3 w-1 rounded-full bg-white/10">
                <div ref={thumbRef} className="absolute inset-x-0 top-0 rounded-full bg-gradient-to-b from-[#f0abfc] to-[#a855f7] will-change-transform" style={{ height: "30%" }} />
              </div>
            )}
            {sc.atTop && sc.can && entered && (
              <div className="pointer-events-none absolute inset-x-0 bottom-2 flex justify-center">
                <span className="qm-arrow font-title rounded-full bg-black/60 px-3 py-1 text-[11px] text-white/85">⌄ GESER KE BAWAH</span>
              </div>
            )}
            {sc.far && (
              <button onClick={toTop} onPointerEnter={hoverSfx} className="press a in-pop absolute bottom-3 right-3 grid h-10 w-10 place-items-center rounded-full border-2 border-[#3b1a6e] bg-gradient-to-b from-[#c084fc] to-[#7e22ce] text-lg text-white shadow-[0_4px_0_#3b1a6e]" style={v({ "--d": "0ms", "--dur": "350ms" })}>
                <Ico name="up" className="h-5 w-5" color="#ffffff" />
              </button>
            )}
          </div>
        </div>

      </div>

      {/* toast */}
      {toast && (
        <div key={toast.n} className="pointer-events-none absolute inset-x-0 top-[100px] z-40 flex justify-center px-4">
          <div
            className={`sh-toast font-ui flex items-center gap-2 rounded-full border px-4 py-2 text-sm shadow-xl backdrop-blur ${
              toast.tone === "bad" ? "border-red-400/40 bg-[#3a0d14]/85 text-red-100" : "border-[#3fdc72]/40 bg-[#0d2a18]/85 text-green-100"
            }`}
          >
            {toast.icon && <Ico name={toast.icon} className="h-4 w-4" color="currentColor" />}
            {toast.text}
          </div>
        </div>
      )}
    </div>
  );
}
