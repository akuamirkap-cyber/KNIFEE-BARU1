import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent } from "react";
import { sfx } from "../audio/sfx";
import { hoverSfx } from "../audio/useSound";
import { game, useGame } from "../game/store";
import { cycleOf, themeFor, useSettings } from "../theme/themes";
import { Background, Grass } from "./Background";
import { Coin } from "./Bits";
import { Gun } from "./Gun";
import { JUICE, knifeVariant, levelConfig, NEXT_IN, PLAY_IN, speedAt, type Level } from "../play/levels";
import { KnifeArt } from "../play/KnifeArt";
import { Bullet, TargetArt } from "../play/TargetArt";
import { Ico } from "../ui/FlatIcons";
import { headProfile } from "../play/HeadArt";

type Props = {
  leaving: boolean;
  stage: number;
  seamless?: boolean;
  /** the menu gun already flew into the slot → show the gun immediately, no drop-in */
  handoff?: boolean;
  /** HUD / gun reveal waits for the scope to open */
  entryOffset?: number;
  onExit: (to: "quest" | "menu", e: MouseEvent<HTMLElement>) => void;
};
type Phase = "intro" | "play" | "breaking" | "clear" | "fail";
type Stuck = { id: number; a: number; steel?: boolean; knife?: number; tilt?: number };
type CoinOn = { id: number; a: number; taken?: boolean };

const FLIGHT = 80;
const GAP = 10;
const COIN_GAP = 14;
const v = (o: Record<string, string | number>) => o as CSSProperties;
const norm = (a: number) => ((a % 360) + 360) % 360;
const angDist = (a: number, b: number) => {
  const d = Math.abs(norm(a) - norm(b));
  return Math.min(d, 360 - d);
};
const STROKE = (c: string, w = 2) => ({ textShadow: `0 ${w + 1}px 0 ${c}, -${w}px 0 0 ${c}, ${w}px 0 0 ${c}, 0 -${w}px 0 ${c}, 0 6px 10px rgba(0,0,0,.35)` });

export function GamePlay({ leaving, stage, seamless = false, handoff = false, entryOffset = 0, onExit }: Props) {
  const st = useSettings();
  const g = useGame();
  const [n, setN] = useState(stage);
  const L = useMemo(() => levelConfig(n), [n]);
  const profile = useMemo(() => (L.boss && L.head ? headProfile(L.head) : null), [L]);
  const theme = themeFor(st.theme, cycleOf(n));
  const [run, setRun] = useState(0);
  const [first, setFirst] = useState(true);
  const [, setPhase] = useState<Phase>("intro");
  const [paused, setPaused] = useState(false);
  const [ammo, setAmmo] = useState(L.ammo);
  const [score, setScore] = useState(0);
  const [stuck, setStuck] = useState<Stuck[]>([]);
  const [coinsOn, setCoinsOn] = useState<CoinOn[]>([]);
  const [shots, setShots] = useState<{ id: number; fy: number }[]>([]);
  const [rics, setRics] = useState<{ id: number; rx: number; rr: number }[]>([]);
  const [recoil, setRecoil] = useState(0);
  const [knock, setKnock] = useState(0);
  const shakeRef = useRef<HTMLDivElement>(null);
  const [shattered, setShattered] = useState(false);
  const [flies, setFlies] = useState<{ id: number; tx: number; ty: number; bx: number; by: number; d: number }[]>([]);
  const [pops, setPops] = useState<{ id: number; text: string }[]>([]);
  const [retries, setRetries] = useState(0);
  const [result, setResult] = useState<{ fail: boolean; stars: number; reward: number } | null>(null);
  const [breakAngle, setBreakAngle] = useState(0);
  const [geo, setGeo] = useState({ tw: 240, tBottom: 330, gunTop: 620, cx: 210 });

  const rootRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const rotRef = useRef<HTMLDivElement>(null);
  const gunRef = useRef<HTMLDivElement>(null);
  const coinHud = useRef<HTMLSpanElement>(null);
  const angle = useRef(0);
  const spdRef = useRef(0);
  // boss mood / rage
  const [mood, setMood] = useState<{ m: "idle" | "laugh" | "angry"; k: number }>({ m: "idle", k: 0 });
  const [rage, setRage] = useState(false);
  const rageRef = useRef(false);
  const moodT = useRef(0);
  const taunt = useRef(0);
  const time = useRef(0);
  const cfgRef = useRef<Level>(L);
  const phaseRef = useRef<Phase>("intro");
  const pausedRef = useRef(false);
  const ammoRef = useRef(L.ammo);
  const stuckRef = useRef<Stuck[]>([]);
  const coinsRef = useRef<CoinOn[]>([]);
  const inFlight = useRef(false);
  const speedRef = useRef(st.speed);
  const timers = useRef<number[]>([]);
  const retriesRef = useRef(0);
  const leavingRef = useRef(leaving);
  speedRef.current = st.speed;
  leavingRef.current = leaving;
  pausedRef.current = paused;

  const later = (f: () => void, ms: number) => timers.current.push(window.setTimeout(f, ms));
  const setBossMood = (m: "laugh" | "angry", ms: number) => {
    if (!cfgRef.current.boss) return;
    window.clearTimeout(moodT.current);
    setMood({ m, k: Date.now() });
    moodT.current = window.setTimeout(() => setMood((x) => ({ m: "idle", k: x.k })), ms);
    if (m === "laugh") sfx.bossLaugh(cfgRef.current.head ?? "pirate");
    else sfx.bossGrowl();
  };
  const doShake = (k = 1) =>
    shakeRef.current?.animate(
      [
        { transform: "translate(0,0)" },
        { transform: `translate(${-9 * k}px, ${4 * k}px) rotate(${-0.6 * k}deg)` },
        { transform: `translate(${9 * k}px, ${-4 * k}px) rotate(${0.6 * k}deg)` },
        { transform: `translate(${-6 * k}px, ${3 * k}px)` },
        { transform: `translate(${4 * k}px, ${-2 * k}px)` },
        { transform: "translate(0,0)" },
      ],
      { duration: 380 + 80 * k, easing: "cubic-bezier(.36,.07,.19,.97)" },
    );
  const goPhase = (p: Phase) => {
    phaseRef.current = p;
    setPhase(p);
  };

  /* ---------------- geometry ---------------- */
  useLayoutEffect(() => {
    const measure = () => {
      const r = rootRef.current?.getBoundingClientRect();
      const b = boxRef.current?.getBoundingClientRect();
      const gr = gunRef.current?.getBoundingClientRect();
      if (!r || !b || !gr) return;
      setGeo({ tw: b.width, tBottom: b.top + b.height - r.top, gunTop: gr.top - r.top + gr.height * 0.02, cx: b.left + b.width / 2 - r.left });
    };
    measure();
    const t = window.setTimeout(measure, 1300);
    window.addEventListener("resize", measure);
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", measure);
    };
  }, []);

  /* ---------------- level setup ---------------- */
  const setup = (lv: number, isFirst: boolean) => {
    const cfg = levelConfig(lv);
    cfgRef.current = cfg;
    const used: number[] = [];
    const pick = (minGap: number) => {
      let a = 0;
      for (let k = 0; k < 40; k++) {
        a = Math.random() * 360;
        if (used.every((u) => angDist(u, a) >= minGap) && angDist(a, 0) > 25) break;
      }
      used.push(a);
      return a;
    };
    const obs: Stuck[] = Array.from({ length: cfg.obstacles }, (_, i) => ({ id: -1 - i, a: pick(34), knife: knifeVariant(lv, i), tilt: Math.round((Math.random() - 0.5) * 12) }));
    const coins: CoinOn[] = Array.from({ length: cfg.coins }, (_, i) => ({ id: i, a: pick(26) }));
    stuckRef.current = obs;
    coinsRef.current = coins;
    ammoRef.current = cfg.ammo;
    inFlight.current = false;
    angle.current = 0;
    time.current = 0;
    setStuck(obs);
    setCoinsOn(coins);
    setAmmo(cfg.ammo);
    setShots([]);
    setRics([]);
    setResult(null);
    setShattered(false);
    rageRef.current = false;
    setRage(false);
    setMood({ m: "idle", k: 0 });
    window.clearTimeout(moodT.current);
    setRun((r) => r + 1);
    goPhase("intro");
    if (cfg.boss) later(() => setBossMood("laugh", 1400), (isFirst ? PLAY_IN.ready : NEXT_IN.ready) - 250);
    if (!isFirst) sfx.levelStart(cfg.boss, cfg.ammo, NEXT_IN);
    later(() => {
      if (phaseRef.current === "intro") goPhase("play");
      setFirst(false);
    }, isFirst ? PLAY_IN.ready : NEXT_IN.ready);
  };

  useEffect(() => {
    setup(stage, true);
    const t = timers.current;
    return () => t.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------------- loop ---------------- */
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const ph = phaseRef.current;
      if (!pausedRef.current && (ph === "intro" || ph === "play" || ph === "fail")) {
        time.current += dt;
        const spd = speedAt(cfgRef.current, time.current) * speedRef.current * (ph === "fail" ? 0.25 : 1) * (rageRef.current ? 1.35 : 1);
        if (cfgRef.current.boss && ph === "play") {
          taunt.current += dt;
          if (taunt.current > (rageRef.current ? 3.2 : 5.5)) {
            taunt.current = 0;
            setBossMood("laugh", 1100);
          }
        }
        spdRef.current = spd;
        angle.current = norm(angle.current + spd * dt);
        if (rotRef.current) rotRef.current.style.transform = `rotate(${angle.current}deg)`;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  /* ---------------- shooting ---------------- */
  const shoot = () => {
    if (phaseRef.current !== "play" || pausedRef.current || leavingRef.current) return;
    if (ammoRef.current <= 0 || inFlight.current) return;
    inFlight.current = true;
    ammoRef.current -= 1;
    setAmmo(ammoRef.current);
    sfx.gunShot();
    setRecoil((k) => k + 1);
    const id = Date.now() + Math.random();
    // predict where the wheel will be when the bullet arrives → stop exactly on the head surface
    const local = norm(-(angle.current + (spdRef.current * FLIGHT) / 1000));
    const stopY = geo.tBottom - geo.tw / 2 + (geo.tw / 2) * edgeR(local);
    setShots((s) => [...s, { id, fy: geo.gunTop - stopY - bh * 0.1 }]);
    later(() => resolve(id), FLIGHT);
  };

  const resolve = (id: number) => {
    setShots((s) => s.filter((x) => x.id !== id));
    inFlight.current = false;
    if (phaseRef.current !== "play") return;
    const local = norm(-angle.current);
    if (stuckRef.current.some((s) => angDist(s.a, local) < GAP)) return fail();
    const ns = [...stuckRef.current, { id, a: local }];
    stuckRef.current = ns;
    setStuck(ns);
    setScore((x) => x + 1);
    setKnock((k) => k + 1);
    if (cfgRef.current.boss) {
      taunt.current = 0;
      if (ammoRef.current > 0 && !rageRef.current && ammoRef.current <= Math.ceil(cfgRef.current.ammo * 0.4)) enterRage(local);
      else setBossMood("angry", 650);
    }
    sfx.hitTarget(cfgRef.current.target, ns.length);
    const c = coinsRef.current.find((c) => !c.taken && angDist(c.a, local) < COIN_GAP);
    if (c) collect(c);
    if (ammoRef.current === 0) {
      goPhase("breaking");
      later(breakTarget, 60);
    }
  };

  const collect = (c: CoinOn) => {
    coinsRef.current = coinsRef.current.map((x) => (x.id === c.id ? { ...x, taken: true } : x));
    setCoinsOn(coinsRef.current);
    game.addCoins(5);
    const r = rootRef.current?.getBoundingClientRect();
    const h = coinHud.current?.getBoundingClientRect();
    if (r && h) {
      const list = Array.from({ length: 4 }, (_, i) => ({
        id: Math.random(),
        tx: h.left + h.width / 2 - r.left - geo.cx,
        ty: h.top + h.height / 2 - r.top - geo.tBottom,
        bx: (Math.random() - 0.5) * 90,
        by: -30 - Math.random() * 40,
        d: i * 60,
      }));
      setFlies((f) => [...f, ...list]);
      sfx.coinRain(list.map((x) => x.d + 880));
      later(() => setFlies((f) => f.filter((x) => !list.includes(x))), 1300);
    }
    sfx.coin();
    const pid = Math.random();
    setPops((p) => [...p, { id: pid, text: "+5" }]);
    later(() => setPops((p) => p.filter((x) => x.id !== pid)), 600);
  };

  /** boss enters RAGE: spins faster and throws an extra knife into the wheel */
  const enterRage = (hitLocal: number) => {
    rageRef.current = true;
    setRage(true);
    setBossMood("angry", 1500);
    sfx.bossRage();
    doShake(1.4);
    // throw a knife on the opposite side, clear of everything already stuck
    let best = norm(hitLocal + 180);
    let bestGap = -1;
    for (let k = 0; k < 36; k++) {
      const a = norm(hitLocal + 90 + k * 5);
      const gap = Math.min(...stuckRef.current.map((st) => angDist(st.a, a)), 999);
      if (angDist(a, hitLocal) > 40 && gap > bestGap) {
        bestGap = gap;
        best = a;
      }
    }
    const extra: Stuck = { id: -100 - Date.now(), a: best, knife: 1, tilt: 0 };
    stuckRef.current = [...stuckRef.current, extra];
    setStuck(stuckRef.current);
  };

  const fail = () => {
    goPhase("fail");
    sfx.ricochet();
    if (cfgRef.current.boss) later(() => setBossMood("laugh", 1600), 250);
    doShake(1);
    setRics((r) => [...r, { id: Math.random(), rx: (Math.random() > 0.5 ? 1 : -1) * (110 + Math.random() * 90), rr: (Math.random() > 0.5 ? 1 : -1) * 900 }]);
    later(() => setResult({ fail: true, stars: 0, reward: 0 }), 950);
  };

  const breakTarget = () => {
    setBreakAngle(angle.current);
    setShattered(true);
    const cfg = cfgRef.current;
    if (cfg.boss) {
      sfx.bossDefeat();
      later(() => doShake(1.7), 340);
    } else {
      sfx.targetBreak(cfg.target, false);
      doShake(1.1);
    }
    const stars = retriesRef.current === 0 ? 3 : retriesRef.current === 1 ? 2 : 1;
    const reward = 20 + cfg.n * 2 + (cfg.boss ? 60 : 0) + (cfg.type === "special" ? 30 : 0);
    later(() => {
      game.clearStage(cfg.n, stars, reward);
      setResult({ fail: false, stars, reward });
      goPhase("clear");
      sfx.stageClear(stars);
    }, cfg.boss ? 1700 : 1250);
  };

  const next = () => {
    sfx.confirm();
    retriesRef.current = 0;
    setRetries(0);
    const nn = Math.min(100, n + 1);
    setN(nn);
    setup(nn, false);
  };
  const retry = () => {
    sfx.confirm();
    retriesRef.current += 1;
    setRetries(retriesRef.current);
    setPaused(false);
    setup(n, false);
  };

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        shoot();
      }
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  });

  /* ---------------- render helpers ---------------- */
  const out = leaving;
  const off = first ? entryOffset : 0;
  const enterA = (inCls: string, d: number, dur: number, outCls: string, extra = "") => ({
    className: `a ${out ? outCls : first ? inCls : ""} ${extra}`,
    style: v({ "--d": `${out ? 0 : d}ms`, "--dur": `${out ? 400 : dur}ms` }),
  });
  const broken = shattered;
  const tIn = first ? PLAY_IN.target : NEXT_IN.target;
  const lvlD = first ? PLAY_IN.level.d : NEXT_IN.level.d;
  const pos = (n - 1) % 5;
  const bw = geo.tw * 0.065;
  const bh = geo.tw * 0.2;
  /** distance (fraction of the wheel radius) from the centre to the target surface for a stuck angle */
  const edgeR = (a: number) => {
    if (!profile) return 1;
    const t = (a * Math.PI) / 180;
    const deg = ((Math.round((Math.atan2(Math.cos(t), -Math.sin(t)) * 180) / Math.PI) % 360) + 360) % 360;
    return Math.max(0.3, profile[deg] / 100);
  };
  const edgeTop = (a: number, hang: number) => (geo.tw / 2) * (1 + edgeR(a)) - hang;
  const kh = geo.tw * 0.36;
  const kw = (kh * 28) / 84;
  const juice = JUICE[L.target];
  const bossDelay = L.boss ? 340 : 0;
  const fx = useMemo(() => {
    let seed = (run * 9301 + n * 49297) % 233280;
    const r = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
    const N = 8;
    const pieces = Array.from({ length: N }, (_, i) => {
      const a0 = (i / N) * Math.PI * 2 + 0.12;
      const a1 = ((i + 1) / N) * Math.PI * 2 + 0.12;
      const am = (a0 + a1) / 2;
      const pts = ["50% 50%"];
      for (let k = 0; k <= 4; k++) {
        const a = a0 + ((a1 - a0) * k) / 4;
        pts.push(`${50 + 75 * Math.cos(a)}% ${50 + 75 * Math.sin(a)}%`);
      }
      const sp = 85 + r() * 55;
      return {
        clip: `polygon(${pts.join(",")})`,
        px: Math.cos(am) * sp,
        py: Math.sin(am) * sp * 0.55 - 40,
        pr: (i % 2 ? 1 : -1) * (90 + r() * 160),
        dl: Math.round(r() * 40),
        dur: 1050 + Math.round(r() * 200),
        am,
      };
    });
    const bullets = Array.from({ length: 24 }, (_, i) => ({ px: (r() - 0.5) * 240, py: -50 - r() * 70, pr: (i % 2 ? 1 : -1) * (360 + r() * 360), dl: Math.round(r() * 60) }));
    const juiceDots = Array.from({ length: 26 }, (_, i) => {
      const a = (i / 26) * Math.PI * 2 + r() * 0.2;
      const rr = 100 + r() * 120;
      return { x: Math.cos(a) * rr, y: Math.sin(a) * rr, s: 7 + Math.round(r() * 10) };
    });
    const smoke = Array.from({ length: 9 }, (_, i) => {
      const a = (i / 9) * Math.PI * 2;
      return { x: Math.cos(a) * (80 + r() * 50), y: Math.sin(a) * (60 + r() * 40) - 30, s: 70 + r() * 50, dl: Math.round(r() * 120) };
    });
    return { pieces, bullets, juiceDots, smoke };
  }, [run, n]);

  return (
    <div ref={rootRef} className="absolute inset-0 overflow-hidden">
      <Background leaving={out} theme={theme} still={seamless && !out} />

      <div ref={shakeRef} className="absolute inset-0">
        {/* ======== TARGET ======== */}
        <div ref={boxRef} className="pointer-events-none absolute left-1/2 top-[29%] aspect-square w-[58%] max-w-[260px] -translate-x-1/2 -translate-y-1/2">
          {!out && (
            <div key={`pop${run}`} className="pointer-events-none absolute inset-0">
              <span
                className="rays-shock absolute left-1/2 top-1/2 h-full w-full rounded-full"
                style={v({ borderStyle: "solid", borderColor: L.boss ? "#ff6b6b" : "#fff3b0", boxShadow: `0 0 26px ${L.boss ? "#ff4d4d" : "#ffd27a"}`, "--sd": `${tIn.d + tIn.dur * 0.74}ms` })}
              />
              <span
                className="rays-shock absolute left-1/2 top-1/2 h-full w-full rounded-full"
                style={v({ borderStyle: "solid", borderColor: "#ffffff", "--sd": `${tIn.d + tIn.dur * 0.8}ms` })}
              />
              <div
                className="a sh-flash absolute left-1/2 top-1/2 -ml-[60%] -mt-[60%] h-[120%] w-[120%] rounded-full"
                style={v({ "--d": `${tIn.d + tIn.dur * 0.72}ms`, "--dur": "560ms", background: "radial-gradient(circle, rgba(255,255,255,.95), rgba(255,240,200,.45) 35%, transparent 70%)" })}
              />
            </div>
          )}
          <div className={`a ${out ? "gp-target-out" : "gp-target-in"} absolute inset-0`} key={run} style={v({ "--d": `${out ? 0 : tIn.d}ms`, "--dur": `${out ? 420 : tIn.dur}ms` })}>
            {!broken && (
              <div key={knock} className={`absolute inset-0 ${knock ? "gp-knock" : ""}`}>
                {L.boss && rage && <div className="bm-rage-aura pointer-events-none absolute -inset-[18%] rounded-full" />}
                <div key={`m${mood.k}`} className={`absolute inset-0 ${L.boss ? (mood.m === "laugh" ? "bm-laugh" : mood.m === "angry" ? "bm-angry" : rage ? "bm-rage" : "") : ""}`}>
                <div className="absolute -inset-[6%] rounded-full" style={{ background: `radial-gradient(circle, ${juice[0]}55, transparent 70%)` }} />
                <div ref={rotRef} className="absolute inset-0" style={{ transform: `rotate(${angle.current}deg)` }}>
                  {/* stuck bullets (behind disc edge) */}
                  {stuck.map((s) => (
                    <div key={s.id} className="absolute inset-0" style={{ transform: `rotate(${s.a}deg)` }}>
                      {s.knife !== undefined ? (
                        <KnifeArt variant={s.knife} className="absolute left-1/2" style={{ top: edgeTop(s.a, kh * 0.3), width: kw, height: kh, marginLeft: -kw / 2, transform: `rotate(${s.tilt ?? 0}deg)`, transformOrigin: "50% 30%", filter: "drop-shadow(0 4px 3px rgba(0,0,0,.45))" }} />
                      ) : (
                        <Bullet steel={s.steel} className="absolute left-1/2 -translate-x-1/2" style={{ top: edgeTop(s.a, bh * 0.28), width: bw, height: bh }} />
                      )}
                    </div>
                  ))}
                  {coinsOn.map((c) =>
                    c.taken ? null : (
                      <div key={c.id} className="absolute inset-0" style={{ transform: `rotate(${c.a}deg)` }}>
                        <span className="absolute left-1/2 -translate-x-1/2" style={{ top: edgeTop(c.a, 4) }}>
                          <span className="block rotate-180">
                            <Coin size={geo.tw * 0.12} />
                          </span>
                        </span>
                      </div>
                    ),
                  )}
                  <TargetArt kind={L.target} icon={L.icon} head={L.head} className="absolute inset-0 h-full w-full drop-shadow-[0_10px_16px_rgba(0,0,0,.45)]" />
                </div>
                </div>
              </div>
            )}
            {/* boss reactions (do not rotate with the wheel) */}
            {L.boss && !broken && !out && (
              <div className="pointer-events-none absolute inset-0 z-20">
                {mood.m === "laugh" && (
                  <div key={`l${mood.k}`} className="absolute right-[-6%] top-[10%]">
                    {["HA", "HA", "HA!"].map((t, i) => (
                      <span key={i} className="bm-ha font-title absolute text-[24px] leading-none text-[#ffd23f]" style={v({ right: `${(i % 2) * 18}px`, top: `${i * 30}px`, "--hd": `${i * 160}ms`, textShadow: "0 3px 0 #7c2d12, -2px 0 0 #7c2d12, 2px 0 0 #7c2d12, 0 -2px 0 #7c2d12" })}>
                        {t}
                      </span>
                    ))}
                  </div>
                )}
                {(mood.m === "angry" || rage) && (
                  <div key={`a${mood.k}`} className="absolute right-[2%] top-[4%]">
                    <svg viewBox="-20 -20 40 40" className="bm-vein h-12 w-12">
                      {[0, 90, 180, 270].map((a) => (
                        <path key={a} d="M3 -16 Q4 -6 14 -4 Q6 -2 4 3" fill="none" stroke="#ef4444" strokeWidth="5" strokeLinecap="round" transform={`rotate(${a})`} />
                      ))}
                    </svg>
                  </div>
                )}
                {rage && (
                  <>
                    {[-1, 1].map((sgn) => (
                      <div key={sgn} className="absolute top-[18%]" style={{ [sgn < 0 ? "left" : "right"]: "-6%" }}>
                        {[0, 1, 2].map((i) => (
                          <span key={i} className="bm-steam absolute rounded-full bg-white/80" style={v({ width: 16 - i * 3, height: 16 - i * 3, "--sx": `${sgn * (10 + i * 8)}px`, "--sdl": `${i * 0.35}s` })} />
                        ))}
                      </div>
                    ))}
                    <div className="font-title absolute -bottom-[14%] left-1/2 -translate-x-1/2 rounded-full bg-[#dc2626] px-3 py-1 text-[13px] leading-none text-white shadow-[0_3px_0_#7f1d1d]">
                      MARAH! ×1.35
                    </div>
                  </>
                )}
              </div>
            )}
            {broken && (
              <>
                <div className="absolute inset-0" style={{ transform: `rotate(${breakAngle}deg)` }}>
                  {/* boss: hit-flicker before exploding */}
                  {L.boss && (
                    <div className="bk-flicker absolute inset-0">
                      <TargetArt kind={L.target} icon={L.icon} head={L.head} className="h-full w-full" />
                    </div>
                  )}
                  {/* crack lines flash */}
                  <svg viewBox="-100 -100 200 200" className="bk-crack pointer-events-none absolute inset-0 z-10 h-full w-full" style={v({ "--cdl": `${bossDelay}ms` })}>
                    {fx.pieces.map((p, i) => (
                      <line key={i} x1="0" y1="0" x2={Math.cos(p.am - Math.PI / 8) * 100} y2={Math.sin(p.am - Math.PI / 8) * 100} stroke="#fffbe6" strokeWidth="5" strokeLinecap="round" />
                    ))}
                  </svg>
                  {fx.pieces.map((p, i) => (
                    <div
                      key={i}
                      className="bk-piece absolute inset-0"
                      style={v({ clipPath: p.clip, "--px": `${p.px}px`, "--py": `${p.py}px`, "--pr": `${p.pr}deg`, "--pdl": `${bossDelay + p.dl}ms`, "--pdur": `${p.dur}ms` })}
                    >
                      <TargetArt kind={L.target} icon={L.icon} head={L.head} className="h-full w-full" />
                    </div>
                  ))}
                  {stuck.map((st, i) => {
                    const f = fx.bullets[i % fx.bullets.length];
                    return (
                      <div key={st.id} className="absolute inset-0" style={{ transform: `rotate(${st.a}deg)` }}>
                        <div className="bk-piece absolute inset-0" style={v({ "--px": `${f.px}px`, "--py": `${f.py}px`, "--pr": `${f.pr}deg`, "--pdl": `${bossDelay + f.dl}ms`, "--pdur": "1200ms" })}>
                          {st.knife !== undefined ? (
                            <KnifeArt variant={st.knife} className="absolute left-1/2" style={{ top: edgeTop(st.a, kh * 0.3), width: kw, height: kh, marginLeft: -kw / 2 }} />
                          ) : (
                            <Bullet steel={st.steel} className="absolute left-1/2 -translate-x-1/2" style={{ top: edgeTop(st.a, bh * 0.28), width: bw, height: bh }} />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                {/* shockwaves + flash */}
                <span className="rays-shock pointer-events-none absolute left-1/2 top-1/2 h-full w-full rounded-full" style={v({ borderStyle: "solid", borderColor: L.boss ? "#ff6b6b" : "#fff3b0", boxShadow: `0 0 30px ${L.boss ? "#ff4d4d" : "#ffd27a"}`, "--sd": `${bossDelay}ms` })} />
                <span className="rays-shock pointer-events-none absolute left-1/2 top-1/2 h-full w-full rounded-full" style={v({ borderStyle: "solid", borderColor: "#ffffff", "--sd": `${bossDelay + 120}ms` })} />
                <div className="a sh-flash pointer-events-none absolute left-1/2 top-1/2 -ml-[75%] -mt-[75%] h-[150%] w-[150%] rounded-full" style={v({ "--d": `${bossDelay}ms`, "--dur": "620ms", background: `radial-gradient(circle, #ffffff, ${L.boss ? "rgba(255,120,80,.6)" : "rgba(255,240,200,.55)"} 35%, transparent 70%)` })} />
                {/* juice / sparks */}
                {fx.juiceDots.map((j, i) => (
                  <span
                    key={`j${i}`}
                    className="gp-juice pointer-events-none absolute left-1/2 top-1/2 rounded-full"
                    style={v({ width: j.s, height: j.s, marginLeft: -j.s / 2, marginTop: -j.s / 2, background: juice[i % 3], animationDelay: `${bossDelay}ms`, "--px": `${j.x}px`, "--py": `${j.y}px` })}
                  />
                ))}
                {/* boss smoke */}
                {L.boss &&
                  fx.smoke.map((sm, i) => (
                    <span
                      key={`s${i}`}
                      className="bk-smoke pointer-events-none absolute left-1/2 top-1/2 rounded-full"
                      style={v({ width: sm.s, height: sm.s, background: "radial-gradient(circle, rgba(90,80,90,.85), rgba(40,30,40,.4) 60%, transparent 72%)", "--sx": `${sm.x}px`, "--sy": `${sm.y}px`, "--sdl": `${bossDelay + sm.dl}ms` })}
                    />
                  ))}
                {/* stamp */}
                <div className="pointer-events-none absolute inset-0 z-20 grid place-items-center">
                  <div className="bk-stamp" style={v({ "--kd": `${bossDelay + 120}ms` })}>
                    {L.boss ? (
                      <div className="flex flex-col items-center">
                        <div className="font-title text-[64px] leading-none text-[#ffd23f]" style={STROKE("#7f1d1d", 3)}>
                          K.O.!
                        </div>
                        <div className="font-title -mt-1 rounded-lg bg-[#dc2626] px-2.5 py-1 text-[14px] leading-none text-white shadow-[0_3px_0_#5f0f0f]">
                          <Ico name={L.icon} className="-mt-0.5 mr-1 inline h-4 w-4" color="#ffffff" />
                          {L.name.toUpperCase()} KALAH
                        </div>
                      </div>
                    ) : (
                      <div className="font-title text-[44px] leading-none text-white" style={STROKE("#1b1f2a", 3)}>
                        HANCUR!
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
          {/* crosshair at impact point */}
          {!broken && !out && (
            <div className="absolute left-1/2 top-full -translate-x-1/2 -translate-y-1/2">
              <span className="gp-pulse-ring absolute left-1/2 top-1/2 h-8 w-8 rounded-full border-2 border-white/70" />
              <svg viewBox="0 0 40 40" className="relative h-10 w-10 drop-shadow-[0_0_4px_rgba(0,0,0,.6)]">
                <circle cx="20" cy="20" r="11" fill="none" stroke="#fff" strokeWidth="2.5" />
                <path d="M20 2 V11 M20 29 V38 M2 20 H11 M29 20 H38" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
                <circle cx="20" cy="20" r="2" fill="#ff5a3d" />
              </svg>
              {pops.map((p) => (
                <span key={p.id} className="gp-coin-pop font-title absolute left-1/2 top-0 text-xl text-[#ffd23f]" style={STROKE("#7c2d12", 1.5)}>
                  {p.text}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* aim line */}
        {!out && (
          <div
            className="gp-aim pointer-events-none absolute left-1/2 w-[3px] -translate-x-1/2"
            style={{
              top: geo.tBottom + 14,
              height: Math.max(0, geo.gunTop - geo.tBottom - 18),
              backgroundImage: "linear-gradient(180deg, rgba(255,255,255,.85) 50%, transparent 50%)",
              backgroundSize: "3px 12px",
              WebkitMaskImage: "linear-gradient(180deg, transparent, #000 40%)",
              maskImage: "linear-gradient(180deg, transparent, #000 40%)",
            }}
          />
        )}

        {/* flying bullets */}
        {shots.map((s) => (
          <div key={s.id} className="gp-fly pointer-events-none absolute left-1/2" style={v({ top: geo.gunTop - bh * 0.4, "--fy": `${s.fy}px`, "--fdur": `${FLIGHT}ms` })}>
            <Bullet style={{ width: bw, height: bh, filter: "drop-shadow(0 0 6px rgba(255,220,120,.9))" }} />
            <span className="absolute left-1/2 top-full h-16 w-[3px] -translate-x-1/2 bg-gradient-to-b from-[#fff3b0] to-transparent" />
          </div>
        ))}
        {rics.map((r) => (
          <div key={r.id} className="gp-ricochet pointer-events-none absolute left-1/2" style={v({ top: geo.tBottom, "--rx": `${r.rx}px`, "--rr": `${r.rr}deg` })}>
            <Bullet style={{ width: bw, height: bh }} />
          </div>
        ))}

        {/* ======== GUN ======== */}
        <div ref={gunRef} className="pointer-events-none absolute bottom-[6%] left-1/2 h-[23%] max-h-[210px] -translate-x-1/2" style={{ aspectRatio: "200/260" }}>
          <span className="absolute -bottom-[4%] left-1/2 h-[16%] w-[130%] -translate-x-1/2 rounded-[50%] bg-black/55 blur-[1px]" style={{ boxShadow: "inset 0 6px 14px rgba(0,0,0,.8)" }} />
          <div {...enterA(handoff ? "" : "gp-gun-in", PLAY_IN.gun.d + off, PLAY_IN.gun.dur, "gp-gun-out", "absolute inset-0")}>
            <div key={recoil} className={`absolute inset-0 ${recoil ? "gp-recoil" : ""}`}>
              {recoil > 0 && (
                <span className="gp-flash absolute left-[31%] -top-[14%] h-[22%] w-[42%]" style={{ background: "radial-gradient(circle, #fffbe0 0%, #ffd23f 35%, rgba(255,120,30,.7) 55%, transparent 72%)", clipPath: "polygon(50% 0,62% 32%,100% 22%,70% 52%,92% 90%,50% 66%,8% 90%,30% 52%,0 22%,38% 32%)" }} />
              )}
              <Gun className="h-full w-full drop-shadow-[0_10px_14px_rgba(0,0,0,.55)]" />
            </div>
          </div>
        </div>
      </div>

      {/* tap layer */}
      <div className="absolute inset-0 z-10" onPointerDown={shoot} />

      {/* ======== HUD ======== */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 px-4 pt-3">
        <div {...enterA("in-down", PLAY_IN.hud.d + off, PLAY_IN.hud.dur, "out-up", "flex items-start justify-between")}>
          <div key={score} className={`font-title min-w-[60px] text-[46px] leading-none text-white ${score ? "bump" : ""}`} style={STROKE("#1b1f2a", 2.5)}>
            {score}
          </div>
          <div className="flex flex-col items-center pt-1">
            <div className="font-title text-[15px] tracking-wider text-white" style={STROKE("#1b1f2a", 1.5)}>
              {L.boss ? "BOSS" : "LEVEL"} {n}
            </div>
            <div className="mt-1.5 flex items-center gap-2">
              {[0, 1, 2, 3, 4].map((i) =>
                i === 4 ? (
                  <span key={i} className={`text-[17px] leading-none ${pos === 4 ? "bounce-soft text-[#ff4d4d]" : "text-[#7f1d1d]"}`} style={{ filter: pos === 4 ? "drop-shadow(0 0 6px #ff4d4d)" : undefined }}>
                    ★
                  </span>
                ) : (
                  <span key={i} className={`rounded-full transition-all ${i === pos ? "h-3.5 w-3.5 bg-white shadow-[0_0_0_3px_rgba(255,255,255,.3)]" : i < pos ? "h-2.5 w-2.5 bg-white/85" : "h-2.5 w-2.5 bg-white/25"}`} />
                ),
              )}
            </div>
            {L.boss && (
              <div className="mt-2 w-36">
                <div className="h-2.5 overflow-hidden rounded-full border border-black/50 bg-black/50">
                  <div className="h-full rounded-full bg-gradient-to-r from-[#ef4444] to-[#fb923c] transition-[width] duration-200" style={{ width: `${(ammo / L.ammo) * 100}%` }} />
                </div>
                <div className="font-title mt-0.5 text-center text-[10px] text-white/80">
                  <Ico name={L.icon} className="-mt-0.5 mr-1 inline h-[1em] w-[1em]" color="currentColor" />
                  {L.name.toUpperCase()}
                </div>
              </div>
            )}
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="font-title flex items-center gap-1.5 text-2xl text-[#ffd23f]" style={STROKE("#1b1f2a", 1.5)}>
              {g.coins}
              <span ref={coinHud}>
                <Coin size={28} />
              </span>
            </div>
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onPointerEnter={hoverSfx}
              onClick={() => {
                if (phaseRef.current === "clear" || phaseRef.current === "fail") return;
                sfx.tap(0, 900);
                setPaused(true);
              }}
              className="press pointer-events-auto grid h-11 w-11 place-items-center rounded-xl border border-white/25 bg-gradient-to-b from-white/25 to-white/5 text-xl shadow-[0_4px_10px_rgba(0,0,0,.4)] backdrop-blur"
            >
              ⚙️
            </button>
          </div>
        </div>
      </div>

      {/* ammo stack */}
      <div className="pointer-events-none absolute bottom-[5%] left-4 z-20 flex flex-col items-center">
        <div className="flex flex-col-reverse items-center gap-[3px]">
          {Array.from({ length: Math.min(ammo, 12) }).map((_, i) => (
            <div key={`${run}-${i}`} className={`a ${out ? "out-left" : "sc-ammo"}`} style={v({ "--ad": `${first ? PLAY_IN.ammo(i).d + off : 200 + i * 40}ms`, "--d": "0ms", "--dur": "300ms" })}>
              <Bullet style={{ width: 11, height: 30, filter: "drop-shadow(0 2px 2px rgba(0,0,0,.5))" }} />
            </div>
          ))}
        </div>
        <span className="font-title mt-1 text-sm text-white/90" style={STROKE("#1b1f2a", 1)}>
          x{ammo}
        </span>
      </div>
      <div {...enterA("in-up", PLAY_IN.gun.d + 200 + off, 500, "out-down", "pointer-events-none absolute bottom-[5%] right-4 z-20")}>
        <span className="font-title text-[11px] tracking-wider text-white/75" style={STROKE("#1b1f2a", 1)}>
          PISTOL · SEIMBANG
        </span>
      </div>

      <Grass leaving={out} color={theme.grass} still={seamless && !out} />

      {/* level banner */}
      {!out && (
        <div key={`lv${run}`} className="pointer-events-none absolute inset-x-0 top-[50%] z-30 flex -translate-y-1/2 flex-col items-center">
          <div className="gp-level flex flex-col items-center" style={v({ "--ld": `${lvlD}ms` })}>
            {L.boss ? (
              <>
                <div className="font-title text-[54px] leading-none text-[#ff4d4d]" style={STROKE("#3b0505", 3)}>
                  BOSS FIGHT!
                </div>
                <div className="font-title mt-1 text-xl text-white" style={STROKE("#1b1f2a", 2)}>
                  <Ico name={L.icon} className="-mt-0.5 mr-1 inline h-[1em] w-[1em]" color="currentColor" />
                  {L.name.toUpperCase()}
                </div>
              </>
            ) : (
              <>
                <div className="font-title text-[54px] leading-none text-white" style={STROKE("#1b1f2a", 3)}>
                  LEVEL {n}
                </div>
                {L.type === "special" && (
                  <div className="font-title mt-1 text-lg text-[#ffd23f]" style={STROKE("#5a3a00", 2)}>
                    ⭐ STAGE SPESIAL
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* coin fly fx */}
      <div className="pointer-events-none absolute inset-0 z-40">
        {flies.map((p) => (
          <span key={p.id} className="coin-fly absolute" style={v({ left: geo.cx - 11, top: geo.tBottom - 11, "--tx": `${p.tx}px`, "--ty": `${p.ty}px`, "--bx": `${p.bx}px`, "--by": `${p.by}px`, "--fd": `${p.d}ms` })}>
            <Coin size={22} />
          </span>
        ))}
      </div>

      {/* ======== RESULT ======== */}
      {result && !out && (
        <div className="absolute inset-0 z-50 grid place-items-center px-6">
          <div className="studio-fade-in absolute inset-0 bg-black/60 backdrop-blur-[2px]" />
          <div className="gp-panel-in relative w-full max-w-[330px]">
            <div
              className="font-title relative z-10 mx-auto -mb-6 w-fit rounded-2xl border-[3px] px-6 py-2 text-[28px] text-white"
              style={{
                borderColor: result.fail ? "#5f0f0f" : "#7c2d12",
                background: result.fail ? "linear-gradient(180deg,#ff7a7a,#dc2626)" : "linear-gradient(180deg,#ffe27a,#f59e0b)",
                boxShadow: `0 5px 0 ${result.fail ? "#5f0f0f" : "#7c2d12"}`,
                ...STROKE(result.fail ? "#5f0f0f" : "#7c2d12", 2),
              }}
            >
              {result.fail ? "MELESET!" : L.boss ? "BOSS KALAH!" : "STAGE CLEAR!"}
            </div>
            <div className="rounded-[26px] border-[3px] border-[#0b1f5c] bg-gradient-to-b from-[#2f6fe0] to-[#1d4ed8] px-5 pt-10 pb-5 shadow-[0_8px_0_#0b1f5c,0_20px_40px_rgba(0,0,0,.5)]">
              {result.fail ? (
                <div className="flex flex-col items-center text-center">
                  <span className="text-6xl">💥</span>
                  <p className="font-ui mt-2 text-base text-white">Peluru menabrak peluru lain!</p>
                  <p className="font-title mt-1 text-sm text-white/70">
                    Sisa target: {ammo + 1} peluru
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <div className="flex items-end gap-2">
                    {[0, 1, 2].map((i) => (
                      <svg key={i} viewBox="0 0 24 24" className={`gp-star ${i === 1 ? "mb-3 h-16 w-16" : "h-12 w-12"}`} style={v({ "--sd": `${250 + i * 260}ms` })}>
                        <path d="M12 2l2.9 6.3 6.9.7-5.2 4.6 1.5 6.8L12 17l-6.1 3.4 1.5-6.8L2.2 9l6.9-.7z" fill={i < result.stars ? "#ffd23f" : "#1e3a8a"} stroke={i < result.stars ? "#9a5b00" : "#0b1f5c"} strokeWidth="1.6" strokeLinejoin="round" />
                      </svg>
                    ))}
                  </div>
                  <div className="font-title mt-3 flex items-center gap-2 rounded-full bg-black/30 px-4 py-1.5 text-2xl text-white">
                    <Coin size={26} />+{result.reward}
                  </div>
                  <div className="font-title mt-1.5 text-sm text-white/75">SKOR {score}</div>
                </div>
              )}
              <div className="mt-5 grid grid-cols-[1fr_1.4fr] gap-3">
                <button
                  onPointerEnter={hoverSfx}
                  onClick={(e) => onExit("quest", e)}
                  className="press font-title h-14 rounded-2xl border-2 border-[#0b1f5c] bg-gradient-to-b from-[#7aa2ff] to-[#3b5fd0] text-lg text-white shadow-[0_5px_0_#0b1f5c]"
                >
                  🗺️ QUEST
                </button>
                <button
                  onPointerEnter={hoverSfx}
                  onClick={result.fail ? retry : next}
                  className="press shine font-title relative h-14 rounded-2xl border-2 border-[#0e5a26] text-xl text-white shadow-[0_5px_0_#0e5a26]"
                  style={{ background: "linear-gradient(180deg,#7cf06f 0%,#3fcf4a 48%,#21a83a 52%,#1f9b37 100%)" }}
                >
                  <span className="absolute inset-x-3 top-1 h-[38%] rounded-xl bg-white/25" />
                  <span className="relative" style={{ textShadow: "0 2px 0 #0e5a26" }}>
                    {result.fail ? "↻ ULANG" : "LANJUT ▶"}
                  </span>
                </button>
              </div>
              {retries > 0 && !result.fail && <p className="font-ui mt-2 text-center text-[11px] text-white/60">Selesai dengan {retries}x ulang</p>}
            </div>
          </div>
        </div>
      )}

      {/* ======== PAUSE ======== */}
      {paused && !out && (
        <div className="absolute inset-0 z-50 grid place-items-center px-8">
          <div className="studio-fade-in absolute inset-0 bg-black/65 backdrop-blur-sm" />
          <div className="gp-panel-in relative flex w-full max-w-[300px] flex-col gap-3 rounded-[26px] border-2 border-white/15 bg-gradient-to-b from-[#1f2937]/95 to-[#0b1220]/95 p-5 shadow-2xl">
            <div className="font-title text-center text-3xl text-white" style={STROKE("#000", 2)}>
              JEDA
            </div>
            <div className="font-ui -mt-2 text-center text-xs text-white/55">
              Level {n} · {L.name}
            </div>
            {[
              { l: "▶ LANJUT", c: "from-[#7cf06f] to-[#1f9b37] border-[#0e5a26]", f: () => (sfx.confirm(), setPaused(false)) },
              { l: "↻ ULANG", c: "from-[#ffd25a] to-[#ea580c] border-[#7c2d12]", f: retry },
            ].map((b) => (
              <button key={b.l} onPointerEnter={hoverSfx} onClick={b.f} className={`press font-title h-12 rounded-2xl border-2 bg-gradient-to-b text-lg text-white shadow-[0_4px_0_rgba(0,0,0,.45)] ${b.c}`}>
                {b.l}
              </button>
            ))}
            <div className="grid grid-cols-2 gap-3">
              <button onPointerEnter={hoverSfx} onClick={(e) => onExit("quest", e)} className="press font-title h-11 rounded-xl border-2 border-[#0b1f5c] bg-gradient-to-b from-[#7aa2ff] to-[#3b5fd0] text-sm text-white shadow-[0_4px_0_#0b1f5c]">
                🗺️ QUEST
              </button>
              <button onPointerEnter={hoverSfx} onClick={(e) => onExit("menu", e)} className="press font-title h-11 rounded-xl border-2 border-white/20 bg-gradient-to-b from-white/25 to-white/5 text-sm text-white shadow-[0_4px_0_rgba(0,0,0,.45)]">
                🏠 MENU
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
