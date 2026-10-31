import { useEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent } from "react";
import { sfx } from "../audio/sfx";
import { hoverSfx } from "../audio/useSound";
import { ACHS, ACH_IN, ACH_OUT, GIFT_STOPS, MAX_MS, MILESTONES, type Ach, type AchTab, type Milestone } from "../ach/data";
import { GiftOpener } from "./GiftOpener";
import { Gem, GiftBox } from "../gift/GiftArt";
import { Ico, IcoTile, type FlatName } from "../ui/FlatIcons";
import { DUP_COINS, rollReward, type Reward as GiftReward } from "../gift/data";
import { game, useGame } from "../game/store";
import { RARITY_LEVEL, RARITY_STYLE, WEAPONS } from "../shop/weapons";
import { Chest, Coin } from "./Bits";
import { ThemeLayer } from "../theme/Backdrop";
import { themeFor, useSettings } from "../theme/themes";

type Props = {
  leaving: boolean;
  onBack: (e: MouseEvent<HTMLElement>) => void;
  onGo: (e: MouseEvent<HTMLElement>) => void;
};

type Status = "ready" | "prog" | "done";
type Fx = { id: number; x: number; y: number; tx: number; ty: number; bx: number; by: number; d: number; kind: "coin" | "gem" };
type Opener = { src: "chest" | "gift"; at: number; tone?: Milestone["tone"]; title: string; reward: GiftReward; fx: number; fy: number; closing: boolean; n: number };

const v = (o: Record<string, string | number>) => o as CSSProperties;
const TRACK_Y = 78;
const STROKE = (c: string, w = 1.5) => ({ textShadow: `0 ${w + 0.5}px 0 ${c}, -${w}px 0 0 ${c}, ${w}px 0 0 ${c}, 0 -${w}px 0 ${c}, 0 3px 4px rgba(0,0,0,.3)` });

function useCountUp(value: number, dur = 650) {
  const [shown, setShown] = useState(value);
  const cur = useRef(value);
  useEffect(() => {
    const a = cur.current;
    if (a === value) return;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / dur);
      const x = Math.round(a + (value - a) * (1 - Math.pow(1 - p, 3)));
      cur.current = x;
      setShown(x);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, dur]);
  return shown;
}

function useResetTimer() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const end = new Date(now);
  end.setHours(24, 0, 0, 0);
  const s = Math.max(0, Math.floor((end.getTime() - now) / 1000));
  const p = (x: number) => String(x).padStart(2, "0");
  return `${p(Math.floor(s / 3600))}:${p(Math.floor((s % 3600) / 60))}:${p(s % 60)}`;
}

/* ================================================================== */
export function Achievement({ leaving, onBack, onGo }: Props) {
  const g = useGame();
  const [tab, setTab] = useState<AchTab>("DAILY");
  const [day] = useState(1);
  const [dayPoke, setDayPoke] = useState(0);
  const [dayPokeK, setDayPokeK] = useState(0);
  const [info, setInfo] = useState(false);
  const st = useSettings();
  const theme = themeFor(st.theme, "menu");
  const [tabKey, setTabKey] = useState(0);
  const [entered, setEntered] = useState(false);
  const [filled, setFilled] = useState(false);
  const [claiming, setClaiming] = useState<string[]>([]);
  const [settled, setSettled] = useState<string[]>([]);
  const [fx, setFx] = useState<Fx[]>([]);
  const [bump, setBump] = useState({ coin: 0, gem: 0, done: 0 });
  const [opener, setOpener] = useState<Opener | null>(null);
  const [poke, setPoke] = useState<{ at: number; n: number } | null>(null);
  const [toast, setToast] = useState<{ text: string; n: number; tone: "ok" | "bad"; icon?: FlatName } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const coinRef = useRef<HTMLSpanElement>(null);
  const gemRef = useRef<HTMLSpanElement>(null);
  const allRef = useRef<HTMLButtonElement>(null);
  const busyIds = useRef(new Set<string>());
  const coins = useCountUp(g.coins);
  const gems = useCountUp(g.gems);
  const timer = useResetTimer();
  const out = leaving;
  const done = g.claimed.length;

  useEffect(() => {
    const a = window.setTimeout(() => setEntered(true), ACH_IN.ready);
    const b = window.setTimeout(() => setFilled(true), ACH_IN.fill.d);
    return () => {
      clearTimeout(a);
      clearTimeout(b);
    };
  }, []);

  const statusOf = (a: Ach): Status => (g.claimed.includes(a.id) ? "done" : a.progress >= a.goal ? "ready" : "prog");
  const rows = useMemo(() => {
    const order: Record<Status, number> = { ready: 0, prog: 1, done: 2 };
    return ACHS.filter((a) => a.tab === tab)
      .map((a, i) => ({ a, i, s: statusOf(a) }))
      .sort((x, y) => order[x.s] - order[y.s] || x.i - y.i);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, g.claimed]);
  const readyAll = ACHS.filter((a) => statusOf(a) === "ready" && !claiming.includes(a.id));
  const readyIn = (t: AchTab) => ACHS.filter((a) => a.tab === t && statusOf(a) === "ready").length;

  const showToast = (text: string, tone: "ok" | "bad" = "ok", icon?: FlatName) => setToast({ text, n: Date.now(), tone, icon });

  /* ---------------- coin fly fx ---------------- */
  const spawn = (from: DOMRect, kind: "coin" | "gem", n: number) => {
    const root = rootRef.current?.getBoundingClientRect();
    const tgt = (kind === "coin" ? coinRef : gemRef).current?.getBoundingClientRect();
    if (!root || !tgt) return [];
    const sx = from.left + from.width * 0.8 - root.left;
    const sy = from.top + from.height / 2 - root.top;
    const tx = tgt.left + tgt.width / 2 - root.left - sx;
    const ty = tgt.top + tgt.height / 2 - root.top - sy;
    const list: Fx[] = Array.from({ length: n }, (_, i) => ({
      id: Math.random(),
      x: sx,
      y: sy,
      tx,
      ty,
      bx: (Math.random() - 0.5) * 120,
      by: (Math.random() - 0.5) * 70 - 25,
      d: i * 55,
      kind,
    }));
    setFx((f) => [...f, ...list]);
    window.setTimeout(() => setFx((f) => f.filter((p) => !list.includes(p))), 1200 + n * 55);
    return list.map((p) => p.d + 880);
  };

  /* ---------------- claim ---------------- */
  const claim = (a: Ach, el: Element | null) => {
    if (busyIds.current.has(a.id) || game.get().claimed.includes(a.id)) return;
    busyIds.current.add(a.id);
    setClaiming((c) => [...c, a.id]);
    sfx.claim();
    const r = (el ?? allRef.current)?.getBoundingClientRect();
    if (r) {
      const arr = spawn(r, "coin", Math.min(9, 4 + Math.round(a.coins / 60)));
      sfx.coinRain(arr);
      if (a.gems) sfx.coinRain(spawn(r, "gem", Math.min(4, a.gems)), true);
    }
    window.setTimeout(() => {
      const before = game.get().claimed.length;
      game.claim(a.id, a.coins, a.gems ?? 0);
      busyIds.current.delete(a.id);
      setClaiming((c) => c.filter((x) => x !== a.id));
      setSettled((s) => [...s, a.id]);
      setBump({ coin: Date.now(), gem: a.gems ? Date.now() : 0, done: Date.now() });
      const m = MILESTONES.find((x) => x.at === before + 1);
      if (m) {
        sfx.milestoneReady(0.05);
        showToast(`Peti ${m.label} siap dibuka!`, "ok", "gift");
      }
    }, 950);
  };

  const claimAll = () => {
    const list = readyAll;
    if (!list.length) return;
    sfx.confirm();
    list.forEach((a, i) =>
      window.setTimeout(() => claim(a, rootRef.current?.querySelector(`[data-ach="${a.id}"]`) ?? null), 120 + i * 260),
    );
  };

  /* ---------------- milestone chest ---------------- */
  const originOf = (el: Element | null) => {
    const root = rootRef.current?.getBoundingClientRect();
    const r = el?.getBoundingClientRect();
    if (!root || !r) return { fx: 0, fy: 0 };
    return { fx: r.left + r.width / 2 - (root.left + root.width / 2), fy: r.top + r.height / 2 - (root.top + root.height * 0.47) };
  };

  const tapChest = (m: Milestone, el: Element | null) => {
    if (g.chests.includes(m.at)) {
      sfx.tap();
      showToast("Hadiah milestone ini sudah diambil", "ok", "check");
      return;
    }
    if (done < m.at) {
      sfx.lockedBuzz();
      setPoke({ at: m.at, n: Date.now() });
      showToast(`Butuh ${m.at - done} achievement lagi`, "bad", "lock");
      return;
    }
    const pool = WEAPONS.filter((w) => w.rarity === m.rarity);
    const fresh = pool.filter((w) => w.locked && !g.owned.includes(w.id));
    const w = (fresh.length ? fresh : pool)[Math.floor(Math.random() * (fresh.length ? fresh : pool).length)];
    const reward: GiftReward = { kind: "weapon", weapon: w, dup: !fresh.length, tier: RARITY_LEVEL[m.rarity] >= 3 ? 3 : RARITY_LEVEL[m.rarity] };
    sfx.confirm();
    setOpener({ src: "chest", at: m.at, tone: m.tone, title: `PETI ${m.label} · ${m.at} ACHIEVEMENT`, reward, ...originOf(el), closing: false, n: Date.now() });
  };

  const tapGift = (at: number, el: Element | null) => {
    if (g.giftStops.includes(at)) {
      sfx.tap();
      showToast("Kado ini sudah dibuka", "ok", "check");
      return;
    }
    if (done < at) {
      sfx.lockedBuzz();
      setPoke({ at, n: Date.now() });
      showToast(`Kado kejutan terbuka di ${at} achievement (${at - done} lagi)`, "bad", "gift");
      return;
    }
    sfx.confirm();
    setOpener({ src: "gift", at, title: `KADO KEJUTAN · ${at} ACHIEVEMENT`, reward: rollReward(g.owned), ...originOf(el), closing: false, n: Date.now() });
  };

  const takeOpener = (rect: DOMRect | null) => {
    const op = opener;
    if (!op) return;
    const r = op.reward;
    sfx.confirm();
    if (op.src === "chest" && r.kind === "weapon") game.claimChest(op.at, r.weapon.id, r.dup);
    else game.claimGiftStop(op.at);
    const from = rect ?? rootRef.current?.getBoundingClientRect();
    if (r.kind === "coin" || (r.kind === "weapon" && r.dup)) {
      const amt = r.kind === "coin" ? r.amount : DUP_COINS;
      if (op.src === "gift") window.setTimeout(() => game.addCoins(amt), 900);
      if (from) sfx.coinRain(spawn(from, "coin", Math.min(12, 5 + Math.round(amt / 60))));
      window.setTimeout(() => setBump((b) => ({ ...b, coin: Date.now() })), 900);
      if (r.kind === "weapon") showToast(`${r.weapon.name} sudah dimiliki · +${DUP_COINS} koin`, "ok", "coinbag");
    } else if (r.kind === "gem") {
      if (from) sfx.coinRain(spawn(from, "gem", Math.min(8, Math.max(3, r.amount))), true);
      window.setTimeout(() => {
        game.addGems(r.amount);
        setBump((b) => ({ ...b, gem: Date.now() }));
      }, 900);
    } else if (r.kind === "weapon") {
      if (op.src === "gift") game.grantWeapon(r.weapon.id);
      sfx.goldChord(0.05, 0.04);
      showToast(`${r.weapon.name} terbuka di ARMORY!`, "ok", "unlock");
    }
    window.setTimeout(() => setOpener((o) => o && { ...o, closing: true }), 650);
    window.setTimeout(() => setOpener(null), 1000);
  };

  const tapDay = (d: number) => {
    if (d === day) {
      sfx.tap(0, 1200);
      return;
    }
    sfx.lockedBuzz();
    setDayPoke(d);
    setDayPokeK(Date.now());
    const [h, m] = timer.split(":").map(Number);
    showToast(`DAY ${d} terbuka dalam ${h + (d - 2) * 24}j ${m}m`, "bad", "lock");
  };

  const switchTab = (t: AchTab, i: number) => {
    if (t === tab) return;
    sfx.tabSwitch(i * 3);
    setTab(t);
    setTabKey((k) => k + 1);
  };

  /* ---------------- anim helpers ---------------- */
  const A = (inCls: string, i: { d: number; dur: number }, outCls: string, o: { d: number; dur: number }, extra = "") => ({
    className: `a ${out ? outCls : inCls} ${extra}`,
    style: v({ "--d": `${out ? o.d : i.d}ms`, "--dur": `${out ? o.dur : i.dur}ms` }),
  });
  const fillPct = filled ? Math.min(1, done / MAX_MS) * 100 : 0;

  return (
    <div ref={rootRef} className={`absolute inset-0 overflow-hidden ${entered && !out ? "" : "pointer-events-none"}`}>
      {/* ================= BACKGROUND ================= */}
      <div {...A("sh-bg-in", ACH_IN.bg, "out-bg", ACH_OUT.bg, "absolute inset-0")}>
        <div className="absolute inset-0 scale-110" style={{ filter: "blur(5px) saturate(1.15)" }}>
          <ThemeLayer theme={theme} />
        </div>
        <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(59,130,246,.55) 0%, rgba(23,45,122,.55) 45%, rgba(5,10,35,.82) 100%)" }} />
        <div className="absolute left-1/2 top-[70px] h-[560px] w-[560px] -translate-x-1/2 -translate-y-1/2 opacity-40">
          <div
            className="spin-slow h-full w-full rounded-full"
            style={{
              background: "repeating-conic-gradient(from 0deg, rgba(255,255,255,.25) 0deg 8deg, transparent 8deg 22deg)",
              WebkitMask: "radial-gradient(circle, #000 0%, transparent 65%)",
              mask: "radial-gradient(circle, #000 0%, transparent 65%)",
            }}
          />
        </div>
        {Array.from({ length: 10 }).map((_, i) => (
          <span
            key={i}
            className="sparkle absolute"
            style={v({ left: `${(i * 41) % 96}%`, top: `${(i * 29) % 40}%`, "--sd": `${i * 0.37}s` })}
          >
            <Ico name="sparkle" color="rgba(255,255,255,.7)" style={{ width: 10 + (i % 3) * 5, height: 10 + (i % 3) * 5 }} />
          </span>
        ))}
      </div>

      <div className="relative flex h-full flex-col px-3 pt-3 pb-2.5">
        {/* ================= TOP BAR ================= */}
        <div className="relative z-20 flex items-center gap-2">
          <div className="flex-1" />
          <div {...A("in-down", ACH_IN.top(1), "out-up", ACH_OUT.top(1))}>
            <div className="font-title flex h-10 items-center gap-1.5 rounded-full border-2 border-[#0b1f5c] bg-[#0b1f5c]/70 pl-1.5 pr-1 text-white shadow-inner">
              <span ref={coinRef} key={`c${bump.coin}`} className={bump.coin ? "bump" : ""}>
                <Coin size={22} />
              </span>
              <span className="min-w-[34px] text-base">{coins}</span>
              <span ref={gemRef} key={`g${bump.gem}`} className={bump.gem ? "bump" : ""}>
                <Gem className="h-5 w-5" />
              </span>
              <span className="min-w-[18px] text-base">{gems}</span>
              <span className="grid h-7 w-7 place-items-center rounded-full bg-gradient-to-b from-[#4ade80] to-[#16a34a] text-base leading-none shadow-[0_2px_0_#14532d]">+</span>
            </div>
          </div>
          <div {...A("in-down", ACH_IN.top(2), "out-up", ACH_OUT.top(2))}>
            <div className="flex h-11 flex-col items-center justify-center rounded-xl border-2 border-[#0b1f5c] bg-gradient-to-b from-[#1e3a8a] to-[#0f1f4f] px-2.5 shadow-[0_3px_0_#060f2e]">
              <span key={bump.done} className={`font-title text-lg leading-none text-[#ffd23f] ${bump.done ? "bump" : ""}`}>
                {done}
                <span className="text-xs text-white/60">/{ACHS.length}</span>
              </span>
              <span className="font-title text-[10px] tracking-widest text-white/75">SELESAI</span>
            </div>
          </div>
        </div>

        {/* ================= BANNER ================= */}
        <div className="relative z-10 mt-1.5 flex flex-col items-center">
          <div {...A("ac-banner-in", ACH_IN.banner, "ac-banner-out", ACH_OUT.banner, "relative mt-1 h-[54px] w-[90%]")}>
            <span className="absolute -left-3 top-3 h-10 w-12 bg-gradient-to-b from-[#c2410c] to-[#7c2d12]" style={{ clipPath: "polygon(0 0,100% 0,100% 100%,0 100%,28% 50%)" }} />
            <span className="absolute -right-3 top-3 h-10 w-12 bg-gradient-to-b from-[#c2410c] to-[#7c2d12]" style={{ clipPath: "polygon(0 0,100% 0,72% 50%,100% 100%,0 100%)" }} />
            <div className="absolute inset-x-2 top-0 bottom-1.5 overflow-hidden rounded-2xl border-[3px] border-[#7c2d12] bg-gradient-to-b from-[#ffd25a] via-[#ffa62b] to-[#f97316] shadow-[0_5px_0_#7c2d12,0_10px_20px_rgba(0,0,0,.35)]">
              <div className="absolute inset-x-2 top-1 h-[40%] rounded-xl bg-white/30" />
              <div className="relative flex h-full items-center justify-center gap-2">
                <span {...A("in-gun", ACH_IN.trophy, "out-spin", { d: 0, dur: 300 }, "leading-none drop-shadow-[0_3px_0_rgba(124,45,18,.6)]")}><Ico name="trophy" className="h-7 w-7" color="#ffffff" /></span>
                <span className="font-title text-[24px] tracking-wide text-white" style={STROKE("#7c2d12", 2)}>
                  ACHIEVEMENT
                </span>
              </div>
            </div>
            <div {...A("in-pop", ACH_IN.trophy, "out-spin", { d: 0, dur: 300 }, "absolute -right-1 top-[4px] z-10")}>
              <button
                onClick={onBack}
                onPointerEnter={hoverSfx}
                aria-label="Tutup"
                className="press grid h-10 w-10 place-items-center rounded-full border-[3px] border-[#7f1d1d] bg-gradient-to-b from-[#ff7a7a] to-[#dc2626] shadow-[0_4px_0_#7f1d1d,inset_0_2px_0_rgba(255,255,255,.45)]"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5">
                  <path d="M6 6 L18 18 M18 6 L6 18" stroke="#fff" strokeWidth="4.2" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            <div {...A("in-pop", { d: ACH_IN.trophy.d + 80, dur: 500 }, "out-spin", { d: 0, dur: 300 }, "absolute -left-1 top-[5px] z-10")}>
              <button
                onClick={() => {
                  sfx.confirm();
                  setInfo(true);
                }}
                onPointerEnter={hoverSfx}
                aria-label="Info"
                className="press font-title grid h-9 w-9 place-items-center rounded-full border-[3px] border-[#0b1f5c] bg-gradient-to-b from-[#7dd3fc] to-[#2563eb] text-lg text-white shadow-[0_3px_0_#0b1f5c]"
                style={STROKE("#0b1f5c")}
              >
                i
              </button>
            </div>
          </div>
          <div {...A("in-pop", ACH_IN.timer, "out-up", ACH_OUT.top(1), "-mt-0.5")}>
            <div className="font-title flex items-center gap-1.5 rounded-full border-2 border-[#3b0764] bg-gradient-to-b from-[#a855f7] to-[#6b21a8] px-3 py-1 text-[12px] leading-none text-white shadow-[0_2px_0_#3b0764]">
              <Ico name="timer" className="h-4 w-4" color="#ffffff" />
              RESET DALAM {timer}
            </div>
          </div>
        </div>

        {/* ================= BOARD ================= */}
        <div {...A("ac-panel-in", ACH_IN.panel, "ac-panel-out", ACH_OUT.panel, "relative z-10 mt-2 flex min-h-0 flex-1 flex-col origin-bottom")}>
          <div
            className="relative flex min-h-0 flex-1 flex-col rounded-[22px] border-[3px] border-[#0b1f5c] p-2.5 shadow-[0_8px_0_#0b1f5c,0_16px_30px_rgba(0,0,0,.45),inset_0_2px_0_rgba(255,255,255,.35)]"
            style={{
              backgroundColor: "#2f6fe0",
              backgroundImage:
                "linear-gradient(rgba(255,255,255,.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.08) 1px, transparent 1px)",
              backgroundSize: "22px 22px",
            }}
          >
            {/* ---------- milestone ---------- */}
            <div className="relative rounded-2xl border-2 border-[#0b1f5c]/50 bg-[#1a46a8]/60 px-3 pt-5 pb-2 shadow-[inset_0_3px_8px_rgba(0,0,0,.25)]">
              <div className="font-title absolute -top-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border-2 border-[#7c2d12] bg-gradient-to-b from-[#ffd23f] to-[#f59e0b] px-3.5 py-1 text-[12px] leading-none text-[#5a2a00] shadow-[0_2px_0_#7c2d12]">
                <Ico name="gift" className="-mt-0.5 mr-1 h-3.5 w-3.5" color="#5a2a00" />BONUS MILESTONE · {Math.min(done, MAX_MS)}/{MAX_MS}
              </div>
              <div className="relative mx-6 h-[168px]">
                {/* track */}
                <div className="absolute inset-x-0 h-4" style={{ top: TRACK_Y }}>
                  <div {...A("in-slash", ACH_IN.track, "out-fade", { d: 0, dur: 300 }, "absolute inset-0 rounded-full border-2 border-[#0b1f5c] bg-[#13306f] shadow-inner")}>
                    <div className="h-full rounded-full bg-gradient-to-b from-[#ffe066] to-[#f59e0b] shadow-[0_0_10px_rgba(255,210,63,.7)] transition-[width] duration-1000 ease-out" style={{ width: `${fillPct}%` }} />
                  </div>
                  <div className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2">
                    <div {...A("in-pop", ACH_IN.node(0), "out-fade", { d: 0, dur: 250 })}>
                      <span className="grid h-9 w-9 place-items-center rounded-full border-[3px] border-[#7c2d12] bg-gradient-to-b from-[#fff3a0] to-[#f59e0b] shadow-[0_3px_0_#7c2d12]">
                        <Coin size={20} />
                      </span>
                    </div>
                  </div>
                  {MILESTONES.map((m, i) => {
                    const reached = done >= m.at;
                    return (
                      <div key={m.at} className="absolute top-1/2" style={{ left: `${(m.at / MAX_MS) * 100}%`, transform: "translate(-50%,-50%)" }}>
                        <div {...A("in-pop", ACH_IN.node(i + 1), "out-fade", { d: 0, dur: 250 })}>
                          <span className={`font-title grid h-[26px] w-[26px] place-items-center rounded-full border-2 text-[12px] transition-colors duration-500 ${reached ? "border-[#7c2d12] bg-gradient-to-b from-[#fff3a0] to-[#f59e0b] text-[#7c2d12]" : "border-[#0b1f5c] bg-[#1e3a8a] text-white"}`}>
                            {reached ? <Ico name="check" className="h-3.5 w-3.5" color="#7c2d12" /> : m.at}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {/* chests: above / below / above */}
                {MILESTONES.map((m, i) => {
                  const ready = done >= m.at && !g.chests.includes(m.at);
                  const opened = g.chests.includes(m.at);
                  const size = m.at === 20 ? 60 : 48;
                  const below = i === 1;
                  const pos: CSSProperties = below ? { top: TRACK_Y + 16 + 8 } : { bottom: 168 - TRACK_Y + 8 };
                  return (
                    <div key={m.at} className="absolute flex flex-col items-center" style={{ left: `${(m.at / MAX_MS) * 100}%`, transform: "translateX(-50%)", ...pos }}>
                      <div {...A("ac-chest-in", ACH_IN.chest(i), "ac-chest-out", ACH_OUT.chest(i), "flex flex-col items-center origin-bottom")}>
                        <button
                          key={poke?.at === m.at ? poke.n : 0}
                          onPointerEnter={hoverSfx}
                          onClick={(e) => tapChest(m, e.currentTarget)}
                          aria-label={`Peti ${m.at}`}
                          className={`press relative block ${poke?.at === m.at ? "ac-poke" : ""}`}
                          style={{ width: size }}
                        >
                          <div className={ready ? "ac-ready" : ""} style={{ filter: opened ? "grayscale(.6) brightness(.8)" : undefined }}>
                            <Chest tone={m.tone} open={opened} className="w-full drop-shadow-[0_5px_4px_rgba(0,0,0,.35)]" />
                          </div>
                          {ready && (
                            <span className="font-title absolute -top-4 left-1/2 -translate-x-1/2 animate-bounce whitespace-nowrap rounded-full bg-[#ef4444] px-2 py-[2px] text-[10px] leading-none text-white shadow ring-2 ring-white">
                              BUKA!
                            </span>
                          )}
                          {m.at === 20 && !ready && !opened && (
                            <span className="font-title absolute -right-6 -top-1 rotate-[12deg] rounded-md border-2 border-[#7c2d12] bg-[#ffd23f] px-1 py-[1px] text-[8.5px] leading-tight text-[#7c2d12] shadow">
                              TOP
                              <br />
                              PRIZE
                            </span>
                          )}
                        </button>
                        <span className={`font-title mt-0.5 whitespace-nowrap rounded-md px-2 py-[3px] text-[10px] leading-none shadow ${RARITY_STYLE[m.rarity].chip}`}>
                          {opened ? "DIAMBIL" : m.label}
                        </span>
                      </div>
                    </div>
                  );
                })}
                {/* surprise gifts on the track */}
                {GIFT_STOPS.map((at, i) => {
                  const opened = g.giftStops.includes(at);
                  const ready = done >= at && !opened;
                  // sit on the empty side of the track (chests at 5 & 20 are above, 10 is below)
                  const above = at > 5 && at < 10;
                  return (
                    <div key={`gs${at}`} className="absolute z-10" style={{ left: `${(at / MAX_MS) * 100}%`, top: above ? TRACK_Y - 42 : TRACK_Y + 20, transform: "translateX(-50%)" }}>
                      <span className="absolute left-1/2 w-[3px] -translate-x-1/2 rounded bg-[#0b1f5c]/60" style={above ? { top: 34, height: 8 } : { top: -6, height: 6 }} />
                      <div {...A("in-pop", { d: ACH_IN.chest(0).d + 260 + i * 90, dur: 520 }, "out-up", ACH_OUT.chest(i % 3))}>
                        <button
                          key={poke?.at === at ? poke.n : 0}
                          onPointerEnter={hoverSfx}
                          onClick={(e) => tapGift(at, e.currentTarget)}
                          aria-label={`Kado ${at}`}
                          className={`press relative block w-[38px] ${poke?.at === at ? "ac-poke" : ""}`}
                        >
                          <div className={ready ? "tg-ready" : ""} style={{ filter: opened ? "grayscale(1) brightness(.75)" : done < at ? "saturate(.55) brightness(.85)" : undefined }}>
                            <GiftBox className="w-full drop-shadow-[0_4px_3px_rgba(0,0,0,.4)]" lidOff={opened} />
                          </div>
                          {ready && <span className="font-title absolute -right-2 -top-2 grid h-5 w-5 place-items-center rounded-full bg-[#ef4444] text-[12px] leading-none text-white ring-2 ring-white">!</span>}
                          {opened && <span className="absolute -right-1.5 -top-1 grid h-5 w-5 place-items-center rounded-full bg-[#22c55e] ring-2 ring-white"><Ico name="check" className="h-3 w-3" color="#ffffff" /></span>}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="font-ui flex items-center justify-center gap-1 text-center text-[11px] text-white/70"><Ico name="gift" className="h-3.5 w-3.5" color="rgba(255,255,255,.7)" /> Kado kejutan di sepanjang jalur · Peti berisi senjata</p>
            </div>

            {/* ---------- tabs ---------- */}
            <div className="mt-2.5 grid grid-cols-2 gap-2">
              {(["DAILY", "SKILL"] as AchTab[]).map((t, i) => {
                const active = t === tab;
                const n = readyIn(t);
                return (
                  <div key={t} {...A(i ? "in-right" : "in-left", ACH_IN.tabs, i ? "out-right" : "out-left", ACH_OUT.top(i))}>
                    <button
                      onPointerEnter={hoverSfx}
                      onClick={() => switchTab(t, i)}
                      className={`press font-title relative flex h-11 w-full items-center justify-center gap-2 rounded-2xl border-2 text-lg transition-all duration-200 ${
                        active
                          ? "border-[#7c2d12] bg-gradient-to-b from-[#ffe27a] to-[#f59e0b] text-[#5a2a00] shadow-[0_4px_0_#9a3412]"
                          : "border-[#0b1f5c] bg-gradient-to-b from-[#3d5fa8] to-[#24427f] text-white/75 shadow-[0_4px_0_#0b1f5c]"
                      }`}
                    >
                      <Ico name={t === "DAILY" ? "calendar" : "swords"} className="h-5 w-5" color={active ? "#5a2a00" : "rgba(255,255,255,.8)"} />
                      {t}
                      {n > 0 && (
                        <span className="absolute -right-1 -top-2 grid h-5 min-w-5 place-items-center rounded-full bg-[#ef4444] px-1 text-[11px] text-white ring-2 ring-white">
                          {n}
                        </span>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* ---------- rows ---------- */}
            <div className="no-scrollbar smooth-scroll mt-2.5 min-h-0 flex-1 space-y-2 overflow-y-auto overflow-x-hidden px-0.5 pb-2">
              {rows.map(({ a, s }, i) => {
                const anim = out
                  ? { cls: "ac-row-out", ...ACH_OUT.row(i) }
                  : tabKey === 0
                    ? { cls: "ac-row-in", ...ACH_IN.row(i) }
                    : { cls: "ac-row-in", d: i * 55, dur: 500 };
                return (
                  <div key={`${tabKey}-${a.id}`} data-ach={a.id} className={`a ${anim.cls}`} style={v({ "--d": `${anim.d}ms`, "--dur": `${anim.dur}ms` })}>
                    <div key={settled.includes(a.id) ? "s" : "n"} className={settled.includes(a.id) ? "ac-settle" : ""}>
                      <Row
                        a={a}
                        s={s}
                        claiming={claiming.includes(a.id)}
                        onClaim={(e) => claim(a, e.currentTarget)}
                        onGo={(e) => {
                          sfx.confirm();
                          onGo(e);
                        }}
                        onDone={() => {
                          sfx.tap(0, 800);
                          showToast("Sudah diklaim", "ok", "check");
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ---------- claim all ---------- */}
            <div {...A("in-up", ACH_IN.claimAll, "out-down", ACH_OUT.top(0))}>
              {readyAll.length > 0 ? (
                <button
                  ref={allRef}
                  onPointerEnter={hoverSfx}
                  onClick={claimAll}
                  className="press shine font-title relative flex h-12 w-full items-center justify-center gap-2 rounded-2xl border-2 border-[#0e5a26] text-xl text-white shadow-[0_5px_0_#0e5a26]"
                  style={{ background: "linear-gradient(180deg,#7cf06f 0%,#3fcf4a 48%,#21a83a 52%,#1f9b37 100%)" }}
                >
                  <span className="absolute inset-x-3 top-1 h-[38%] rounded-xl bg-white/25" />
                  <Ico name="gift" className="relative h-6 w-6" color="#ffffff" />
                  <span className="relative" style={STROKE("#0e5a26")}>
                    KLAIM SEMUA ({readyAll.length})
                  </span>
                </button>
              ) : (
                <div className="font-title flex h-12 w-full items-center justify-center gap-2 rounded-2xl border-2 border-[#0b1f5c] bg-[#1e3a8a]/80 text-sm text-white/70">
                  <Ico name="timer" className="h-4 w-4" color="rgba(255,255,255,.7)" /> Misi baru dalam {timer}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ================= DAY BAR ================= */}
        <div className="relative z-10 mt-2.5 flex items-stretch">
          {[1, 2, 3, 4].map((d, i) => {
            const active = d === day;
            const locked = d > 1;
            return (
              <div key={d} className="-ml-2 flex-1 first:ml-0" style={{ zIndex: 10 - i }}>
                <div {...A("in-up", ACH_IN.day(i), "out-down", ACH_OUT.top(i))}>
                  <button
                    key={dayPoke === d ? dayPokeK : 0}
                    onPointerEnter={hoverSfx}
                    onClick={() => tapDay(d)}
                    className={`press relative block h-[52px] w-full ${dayPoke === d ? "ac-poke" : ""}`}
                  >
                    <span
                      className="absolute inset-0"
                      style={{
                        clipPath: i === 0 ? "polygon(0 0,84% 0,100% 50%,84% 100%,0 100%)" : "polygon(0 0,84% 0,100% 50%,84% 100%,0 100%,16% 50%)",
                        background: active ? "#7c2d12" : "#0b1f5c",
                      }}
                    />
                    <span
                      className="absolute inset-[3px] flex flex-col items-center justify-center"
                      style={{
                        clipPath: i === 0 ? "polygon(0 0,84% 0,100% 50%,84% 100%,0 100%)" : "polygon(0 0,84% 0,100% 50%,84% 100%,0 100%,16% 50%)",
                        background: active ? "linear-gradient(180deg,#ffd25a,#f97316)" : "linear-gradient(180deg,#5d7fc8,#2c4a8f)",
                        paddingLeft: i === 0 ? 0 : 8,
                      }}
                    >
                      <span className="absolute inset-x-1 top-0.5 h-[35%] bg-white/20" />
                      <span className="font-title text-[11px] leading-none text-white" style={STROKE(active ? "#7c2d12" : "#0b1f5c", 1)}>
                        DAY
                      </span>
                      <span className="font-title text-[19px] leading-none text-white" style={STROKE(active ? "#7c2d12" : "#0b1f5c", 1.5)}>
                        {d}
                      </span>
                    </span>
                    {active && <span className="absolute -top-2 left-[38%] h-0 w-0 -translate-x-1/2 border-x-[7px] border-b-[9px] border-x-transparent border-b-[#ffd25a]" />}
                    {locked && (
                      <span className="absolute -bottom-1 left-[40%] grid h-5 w-5 -translate-x-1/2 place-items-center rounded-md border-2 border-[#0b1f5c] bg-gradient-to-b from-[#94a3b8] to-[#475569] shadow"><Ico name="lock" className="h-3 w-3" color="#ffffff" /></span>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ================= COIN FX ================= */}
      <div className="pointer-events-none absolute inset-0 z-40">
        {fx.map((p) => (
          <span
            key={p.id}
            className="coin-fly absolute"
            style={v({ left: p.x - 11, top: p.y - 11, "--tx": `${p.tx}px`, "--ty": `${p.ty}px`, "--bx": `${p.bx}px`, "--by": `${p.by}px`, "--fd": `${p.d}ms` })}
          >
            {p.kind === "coin" ? <Coin size={22} /> : <Gem className="h-6 w-6" />}
          </span>
        ))}
      </div>

      {/* ================= TOAST ================= */}
      {toast && (
        <div key={toast.n} className="pointer-events-none absolute inset-x-0 top-[118px] z-40 flex justify-center px-4">
          <div
            className={`sh-toast font-ui flex items-center gap-2 rounded-full border px-4 py-2 text-sm shadow-xl backdrop-blur ${
              toast.tone === "bad" ? "border-red-300/50 bg-[#3a0d14]/90 text-red-100" : "border-[#ffd23f]/50 bg-[#1e1b4b]/90 text-yellow-50"
            }`}
          >
            {toast.icon && <Ico name={toast.icon} className="h-4 w-4" color="currentColor" />}
            {toast.text}
          </div>
        </div>
      )}

      {/* ================= INFO ================= */}
      {info && (
        <div className="absolute inset-0 z-50 grid place-items-center px-6" onClick={() => (sfx.back(), setInfo(false))}>
          <div className="studio-fade-in absolute inset-0 bg-black/60 backdrop-blur-[2px]" />
          <div className="gp-panel-in relative w-full max-w-[320px] rounded-[24px] border-[3px] border-[#0b1f5c] bg-gradient-to-b from-[#3b82f6] to-[#1d4ed8] p-4 text-white shadow-[0_8px_0_#0b1f5c,0_20px_40px_rgba(0,0,0,.5)]">
            <div className="font-title mb-2 text-center text-xl" style={STROKE("#0b1f5c")}>CARA MAIN</div>
            {[
              ["target", "Selesaikan misi DAILY & SKILL lalu tekan CLAIM untuk koin & diamond."],
              ["gift", "Kado kejutan & peti di jalur milestone berisi koin, diamond, atau senjata."],
              ["calendar", "Misi DAY berikutnya terbuka setiap reset harian."],
              ["bolt", "Misi yang belum selesai: tekan GO untuk langsung ke Quest."],
            ].map(([ic, t]) => (
              <div key={t} className="mb-1.5 flex items-start gap-2 rounded-xl bg-black/20 p-2">
                <IcoTile name={ic as FlatName} bg={["#60a5fa", "#1e40af"]} size={30} radius={9} />
                <span className="font-ui text-[12.5px] leading-snug">{t}</span>
              </div>
            ))}
            <div className="font-title mt-2 text-center text-[11px] text-white/70">Tap di mana saja untuk menutup</div>
          </div>
        </div>
      )}

      {/* ================= CHEST MODAL ================= */}
      {opener && (
        <GiftOpener key={opener.n} mode={opener.src} tone={opener.tone} title={opener.title} reward={opener.reward} fx={opener.fx} fy={opener.fy} closing={opener.closing} onTake={takeOpener} />
      )}
    </div>
  );
}

/* ================================================================== */
function Reward({ a, tone }: { a: Ach; tone: "green" | "blue" }) {
  return (
    <span
      className={`relative flex w-[92px] shrink-0 flex-col items-center justify-center gap-0.5 border-l-2 ${
        tone === "green" ? "border-[#0e5a26]/40 bg-[#e8fde4]" : "border-[#1e3a8a]/30 bg-[#c4d9ff]"
      }`}
    >
      <span className="font-title flex items-center gap-1 text-[17px] leading-none text-[#1e3a8a]">
        <Coin size={18} />+{a.coins}
      </span>
      {a.gems ? <span className="font-title flex items-center gap-0.5 text-[12px] leading-none text-[#7e22ce]"><Gem className="h-3.5 w-3.5" /> +{a.gems}</span> : null}
    </span>
  );
}

function Row({
  a,
  s,
  claiming,
  onClaim,
  onGo,
  onDone,
}: {
  a: Ach;
  s: Status;
  claiming: boolean;
  onClaim: (e: MouseEvent<HTMLButtonElement>) => void;
  onGo: (e: MouseEvent<HTMLButtonElement>) => void;
  onDone: () => void;
}) {
  const pct = Math.min(1, a.progress / a.goal);
  const icon = (
    <span
      className="relative m-2 grid w-[46px] shrink-0 place-items-center rounded-xl border-2 border-black/20 shadow-[inset_0_2px_0_rgba(255,255,255,.5),inset_0_-3px_0_rgba(0,0,0,.15)]"
      style={{ background: `linear-gradient(180deg, ${a.color[0]}, ${a.color[1]})`, filter: s === "done" ? "grayscale(1) brightness(.8)" : undefined }}
    >
      <Ico name={a.icon} className="h-[28px] w-[28px] drop-shadow-[0_2px_0_rgba(0,0,0,.25)]" color="#ffffff" />
    </span>
  );

  if (s === "ready")
    return (
      <button
        onClick={onClaim}
        onPointerEnter={hoverSfx}
        className={`press shine relative flex h-[70px] w-full items-stretch overflow-hidden rounded-2xl border-2 border-[#0e5a26] text-left shadow-[0_4px_0_#0e5a26] ${claiming ? "ac-claiming pointer-events-none" : ""}`}
        style={{ background: "linear-gradient(180deg,#7cf06f 0%,#3fcf4a 48%,#21a83a 52%,#1f9b37 100%)" }}
      >
        <span className="absolute inset-x-2 top-1 h-[38%] rounded-xl bg-white/25" />
        {icon}
        <span className="relative flex min-w-0 flex-1 flex-col justify-center">
          <span className="font-title text-[23px] leading-none text-white" style={STROKE("#0e5a26")}>
            {claiming ? "OK!" : "CLAIM"}
          </span>
          <span className="font-title truncate text-[12.5px] text-[#0b3d18]">{a.title.toUpperCase()}</span>
        </span>
        <Reward a={a} tone="green" />
      </button>
    );

  if (s === "prog")
    return (
      <button
        onClick={onGo}
        onPointerEnter={hoverSfx}
        className="press relative flex h-[74px] w-full items-stretch overflow-hidden rounded-2xl border-2 border-[#1e3a8a] bg-gradient-to-b from-[#f1f6ff] to-[#d3e3ff] text-left shadow-[0_4px_0_#1e3a8a]"
      >
        {icon}
        <span className="relative flex min-w-0 flex-1 flex-col justify-center pr-2">
          <span className="flex items-center gap-1.5">
            <span className="font-title truncate text-[14px] leading-tight text-[#1e3a8a]">{a.title.toUpperCase()}</span>
            <span className="font-title shrink-0 rounded-md bg-[#f59e0b] px-1.5 py-[1px] text-[10px] leading-none text-white shadow-[0_1px_0_#9a3412]">GO ›</span>
          </span>
          <span className="font-ui truncate text-[12px] leading-tight text-[#2c4a85]">{a.desc}</span>
          <span className="relative mt-1.5 h-[18px] w-full overflow-hidden rounded-full border-2 border-[#1e3a8a] bg-[#3b4f86]">
            <span className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-b from-[#ffe066] to-[#f59e0b]" style={{ width: `${pct * 100}%` }} />
            <span className="font-title absolute inset-0 grid place-items-center text-[11px] leading-none text-white" style={STROKE("#1e3a8a")}>
              {a.progress}/{a.goal}
            </span>
          </span>
        </span>
        <Reward a={a} tone="blue" />
      </button>
    );

  return (
    <button
      onClick={onDone}
      className="relative flex h-[62px] w-full items-stretch overflow-hidden rounded-2xl border-2 border-[#0f2a6b] bg-[#1d3d8f]/75 text-left"
    >
      {icon}
      <span className="relative flex min-w-0 flex-1 flex-col justify-center">
        <span className="font-title truncate text-[14px] text-white/60 line-through decoration-2">{a.title.toUpperCase()}</span>
        <span className="font-ui truncate text-[11.5px] text-white/50">{a.desc}</span>
      </span>
      <span className="flex w-[92px] shrink-0 flex-col items-center justify-center gap-0.5 border-l-2 border-[#0f2a6b] bg-[#163275]">
        <span className="grid h-7 w-7 place-items-center rounded-full bg-gradient-to-b from-[#4ade80] to-[#16a34a] shadow-[0_2px_0_#14532d]"><Ico name="check" className="h-4 w-4" color="#ffffff" /></span>
        <span className="font-title text-[10px] text-[#86efac]">SELESAI</span>
      </span>
    </button>
  );
}
