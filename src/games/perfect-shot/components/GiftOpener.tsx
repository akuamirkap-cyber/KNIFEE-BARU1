import { useEffect, useRef, useState, type CSSProperties } from "react";
import { sfx } from "../audio/sfx";
import { hoverSfx } from "../audio/useSound";
import { Chest, Coin, Confetti } from "./Bits";
import { Gem, GiftBox } from "../gift/GiftArt";
import { Ico } from "../ui/FlatIcons";
import { WeaponPose } from "../shop/WeaponArt";
import { RARITY_STYLE } from "../shop/weapons";
import { DUP_COINS, glowAfter, TIERS, type Reward } from "../gift/data";

export type OpenerProps = {
  mode: "gift" | "chest";
  tone?: "green" | "purple" | "gold";
  title: string;
  reward: Reward;
  fx: number; // offset of origin from stage centre (px)
  fy: number;
  closing: boolean;
  onTake: (rect: DOMRect | null) => void;
};

type Phase = "fly" | "idle" | "opening" | "reveal" | "taken";
const v = (o: Record<string, string | number>) => o as CSSProperties;
const STROKE = (c: string, w = 2) => ({ textShadow: `0 ${w + 1}px 0 ${c}, -${w}px 0 0 ${c}, ${w}px 0 0 ${c}, 0 -${w}px 0 ${c}, 0 6px 12px rgba(0,0,0,.45)` });

const BANNER: [string, string, string][] = [
  ["#ffffff", "#94a3b8", "#334155"],
  ["#bae6fd", "#0284c7", "#0c4a6e"],
  ["#f3e8ff", "#9333ea", "#3b0764"],
  ["#fff6b0", "#f59e0b", "#7c2d12"],
];
const HEAD = ["HADIAH!", "LANGKA!", "EPIK!", "LEGENDARIS!"];

function CoinPile({ big = false }: { big?: boolean }) {
  const spots = big
    ? [[0, 0], [40, 0], [80, 0], [120, 0], [20, -24], [60, -24], [100, -24], [40, -48], [80, -48], [60, -72]]
    : [[0, 0], [44, 0], [88, 0], [22, -26], [66, -26], [44, -52]];
  const w = big ? 172 : 150;
  return (
    <div className="relative" style={{ width: w, height: big ? 140 : 116 }}>
      {spots.map(([x, y], i) => (
        <span key={i} className="absolute" style={{ left: 6 + x, bottom: 4 - y }}>
          <Coin size={big ? 50 : 54} />
        </span>
      ))}
    </div>
  );
}

export function GiftOpener({ mode, tone = "gold", title, reward, fx, fy, closing, onTake }: OpenerProps) {
  const [phase, setPhaseS] = useState<Phase>("fly");
  const phaseRef = useRef<Phase>("fly");
  const [taps, setTaps] = useState(0);
  const [glow, setGlow] = useState(-1);
  const [tapK, setTapK] = useState(0);
  const [upK, setUpK] = useState(0);
  const [lidOff, setLidOff] = useState(false);
  const [shown, setShown] = useState(0);
  const [canTake, setCanTake] = useState(false);
  const timers = useRef<number[]>([]);
  const itemRef = useRef<HTMLDivElement>(null);
  const later = (f: () => void, ms: number) => timers.current.push(window.setTimeout(f, ms));
  const setPhase = (p: Phase) => {
    phaseRef.current = p;
    setPhaseS(p);
  };

  useEffect(() => {
    sfx.whoosh(0, 0.5, 300, 2600, 0.14);
    later(() => {
      sfx.thud(0, 0.8);
      sfx.bubble(0.02, 3);
      setPhase("idle");
    }, 560);
    const t = timers.current;
    return () => t.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (phase !== "reveal" || reward.kind === "weapon") return;
    const target = reward.amount;
    const start = performance.now() + 250;
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, Math.max(0, (now - start) / 1000));
      setShown(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase, reward]);

  const tap = () => {
    if (phaseRef.current !== "idle") return;
    const k = taps + 1;
    if (k < 3) {
      const ng = glowAfter(reward.tier, k);
      const up = glow >= 0 && ng > glow;
      setTaps(k);
      setGlow(ng);
      setTapK((x) => x + 1);
      if (up) setUpK((x) => x + 1);
      sfx.giftTap(k, up);
      return;
    }
    setTaps(3);
    if (reward.tier > glow) setUpK((x) => x + 1);
    setGlow(reward.tier);
    setPhase("opening");
    sfx.giftOpen(reward.tier);
    later(() => setLidOff(true), 450);
    later(() => {
      setPhase("reveal");
      sfx.revealReward(reward.kind, reward.tier);
      if (reward.kind !== "weapon") sfx.countUp(0.25, 1, 14);
    }, 900);
    later(() => setCanTake(true), 1900);
  };

  const take = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!canTake) return;
    setCanTake(false);
    setPhase("taken");
    onTake(itemRef.current?.getBoundingClientRect() ?? null);
  };

  const tierC = glow >= 0 ? TIERS[glow].c : "#ffd9a8";
  const revealed = phase === "reveal" || phase === "taken";
  const T = reward.tier;
  const [b0, b1, b2] = BANNER[T];
  const ring = reward.kind === "weapon" ? RARITY_STYLE[reward.weapon.rarity].ring : TIERS[T].c;

  return (
    <div className={`absolute inset-0 z-50 select-none overflow-hidden ${closing ? "go-bg-out" : "go-bg-in"}`} onClick={tap}>
      {/* ---------- backdrop ---------- */}
      <div className="absolute inset-0 bg-[#05030f]/80 backdrop-blur-[3px]" />
      <div className="absolute inset-0 transition-[background] duration-700" style={{ background: `radial-gradient(circle at 50% 47%, ${tierC}${revealed ? "70" : glow >= 0 ? "44" : "26"}, transparent 62%)` }} />
      <div className="pointer-events-none absolute left-1/2 top-[47%] h-[900px] w-[900px] -translate-x-1/2 -translate-y-1/2">
        <div className="go-rays-a absolute inset-0 rounded-full transition-opacity duration-700" style={{ opacity: revealed ? 0.9 : 0.35 + Math.max(0, glow) * 0.12, background: `repeating-conic-gradient(from 0deg, ${tierC}55 0deg 6deg, transparent 6deg 18deg)`, WebkitMask: "radial-gradient(circle, #000 0%, rgba(0,0,0,.4) 32%, transparent 60%)", mask: "radial-gradient(circle, #000 0%, rgba(0,0,0,.4) 32%, transparent 60%)" }} />
        <div className="go-rays-b absolute inset-[18%] rounded-full transition-opacity duration-700" style={{ opacity: revealed ? 0.7 : 0.2, background: `repeating-conic-gradient(from 9deg, #ffffff33 0deg 3deg, transparent 3deg 24deg)`, WebkitMask: "radial-gradient(circle, #000 0%, transparent 62%)", mask: "radial-gradient(circle, #000 0%, transparent 62%)" }} />
      </div>
      {/* rising sparkles */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[70%]">
        {Array.from({ length: 16 }).map((_, i) => (
          <span key={i} className="gf-spark-up absolute bottom-0 rounded-full" style={v({ left: `${(i * 53) % 100}%`, width: 4 + (i % 3) * 2, height: 4 + (i % 3) * 2, background: i % 3 ? tierC : "#fff", boxShadow: `0 0 10px 2px ${tierC}`, "--sx": `${(i % 2 ? 1 : -1) * (12 + i * 2)}px`, "--sdl": `${i * 0.21}s` })} />
        ))}
      </div>

      {/* ---------- title ---------- */}
      <div className="pointer-events-none absolute inset-x-0 top-[7%] flex flex-col items-center">
        {!revealed ? (
          <>
            <div className="a in-down font-title rounded-full border-2 border-white/20 bg-black/50 px-4 py-1.5 text-[14px] leading-none tracking-wider text-white/90" style={v({ "--d": "0ms", "--dur": "500ms" })}>
              {title}
            </div>
            <div key={taps} className="gf-title-pop mt-3">
              <div className="go-tap-hint font-title text-[30px] leading-none text-white" style={STROKE("#4c0519", 2.5)}>
                {phase === "opening" ? "MEMBUKA..." : taps === 0 ? "TAP UNTUK BUKA!" : taps === 1 ? "LAGI!" : "SEKALI LAGI!!"}
              </div>
            </div>
            <div className="mt-3 flex gap-2.5">
              {[0, 1, 2].map((i) => (
                <span key={`${i}-${i < taps}`} className={`h-4 w-4 rounded-full border-2 border-white/80 ${i < taps ? "gf-dot-on" : ""}`} style={{ background: i < taps ? tierC : "rgba(255,255,255,.15)", boxShadow: i < taps ? `0 0 12px ${tierC}` : undefined }} />
              ))}
            </div>
          </>
        ) : (
          <div className="go-banner relative h-[62px] w-[78%] max-w-[320px]" style={{ animationDelay: "120ms" }}>
            <span className="absolute -left-4 top-3.5 h-11 w-14" style={{ background: `linear-gradient(180deg, ${b1}, ${b2})`, clipPath: "polygon(0 0,100% 0,100% 100%,0 100%,28% 50%)", filter: "brightness(.75)" }} />
            <span className="absolute -right-4 top-3.5 h-11 w-14" style={{ background: `linear-gradient(180deg, ${b1}, ${b2})`, clipPath: "polygon(0 0,100% 0,72% 50%,100% 100%,0 100%)", filter: "brightness(.75)" }} />
            <div className="absolute inset-x-2 top-0 bottom-2 overflow-hidden rounded-2xl border-[3px]" style={{ borderColor: b2, background: `linear-gradient(180deg, ${b0}, ${b1} 60%, ${b2})`, boxShadow: `0 5px 0 ${b2}, 0 0 30px ${b1}aa` }}>
              <div className="absolute inset-x-2 top-1 h-[40%] rounded-xl bg-white/35" />
              <div className="gf-shimmer absolute inset-0" />
              <div className={`relative flex h-full items-center justify-center ${T === 3 ? "gf-legend-text" : ""}`}>
                <span className="font-title text-[28px] tracking-wide text-white" style={STROKE(b2, 2.5)}>
                  {HEAD[T]}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ---------- stage ---------- */}
      <div className="absolute left-1/2 top-[47%] h-0 w-0">
        {/* box */}
        <div className={`absolute left-1/2 top-1/2 w-[min(250px,62vw)] -translate-x-1/2 -translate-y-[58%] ${revealed ? "go-box-sink" : ""}`} style={revealed ? { animationDelay: "120ms" } : undefined}>
          <div className="go-fly" style={v({ "--fx": `${fx}px`, "--fy": `${fy}px` })}>
            <div key={tapK} className={phase === "opening" ? "gf-rumble" : tapK ? "gf-tap" : ""} style={v({ "--tr": `${tapK % 2 ? 5 : -5}deg` })}>
              <div className={phase === "idle" && taps === 0 ? "go-float" : ""}>
                <div className="relative">
                  {/* glow behind */}
                  <div className="pointer-events-none absolute left-1/2 top-[50%] h-[120%] w-[140%] -translate-x-1/2 -translate-y-1/2 rounded-full transition-opacity duration-500" style={{ background: `radial-gradient(circle, ${tierC}99, transparent 62%)`, opacity: glow >= 0 ? 0.6 + taps * 0.13 : 0.3 }} />
                  {lidOff && <div className="gf-beam pointer-events-none absolute bottom-[50%] left-1/2 h-[360%] w-[86%]" style={{ background: `linear-gradient(0deg, #ffffff, ${tierC}, ${tierC}00)`, clipPath: "polygon(30% 100%, 70% 100%, 100% 0, 0 0)", mixBlendMode: "screen" }} />}
                  {mode === "gift" ? (
                    <GiftBox lidOff={lidOff} glow={glow >= 0 ? tierC : null} level={glow < 0 ? 0 : Math.max(1, taps)} wiggle={phase === "idle"} className="relative w-full drop-shadow-[0_22px_24px_rgba(0,0,0,.55)]" />
                  ) : (
                    <div className="relative">
                      {glow >= 0 && !lidOff && <div className="gf-seam pointer-events-none absolute left-[-10%] top-[40%] h-[16%] w-[120%] rounded-full" style={{ background: tierC, filter: "blur(10px)", opacity: 0.45 + taps * 0.2 }} />}
                      <Chest tone={tone} open={lidOff} className="relative w-full drop-shadow-[0_22px_24px_rgba(0,0,0,.55)]" />
                    </div>
                  )}
                  {upK > 0 && <span key={upK} className="gf-ring pointer-events-none absolute left-1/2 top-1/2 h-48 w-48 rounded-full border-[6px]" style={{ borderColor: tierC, boxShadow: `0 0 26px ${tierC}` }} />}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* burst */}
        {lidOff && (
          <>
            {[0, 140, 280].map((d) => (
              <span key={d} className="go-shock pointer-events-none absolute left-0 top-0 h-56 w-56 rounded-full" style={v({ borderStyle: "solid", borderColor: d === 140 ? "#ffffff" : tierC, boxShadow: `0 0 30px ${tierC}`, "--sd": `${d}ms` })} />
            ))}
            {Array.from({ length: 22 }).map((_, i) => {
              const a = (i / 22) * Math.PI * 2;
              const r = 150 + ((i * 47) % 110);
              return (
                <svg key={i} viewBox="0 0 24 24" className="go-star pointer-events-none absolute left-0 top-0" style={v({ width: 14 + (i % 4) * 6, height: 14 + (i % 4) * 6, "--x": `${Math.cos(a) * r}px`, "--y": `${Math.sin(a) * r}px`, "--r": `${(i % 2 ? 1 : -1) * 360}deg`, "--sd": `${(i % 5) * 30}ms` })}>
                  <path d="M12 1 L14.6 9.4 L23 12 L14.6 14.6 L12 23 L9.4 14.6 L1 12 L9.4 9.4 Z" fill={i % 3 === 0 ? "#ffffff" : tierC} style={{ filter: `drop-shadow(0 0 4px ${tierC})` }} />
                </svg>
              );
            })}
            <Confetti n={34 + T * 8} spread={1.5 + T * 0.15} />
          </>
        )}

        {/* reward */}
        {revealed && (
          <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-[56%] flex-col items-center">
            <div className="go-halo-in relative grid h-[250px] w-[250px] place-items-center" style={{ animationDelay: "200ms" }}>
              <div className="absolute inset-0 rounded-full" style={{ background: `radial-gradient(circle, ${ring}88 0%, ${ring}33 40%, transparent 68%)` }} />
              <div className="go-ring-spin absolute inset-[14%] rounded-full border-[3px] border-dashed" style={{ borderColor: `${ring}cc` }} />
              <div className="go-ring-spin-r absolute inset-[6%] rounded-full border-2" style={{ borderColor: `${ring}55`, borderTopColor: "#fff", borderBottomColor: "#fff" }} />
              {/* orbiting sparkles */}
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="go-orbit absolute inset-[4%]" style={v({ "--od": `${5 + i * 1.5}s`, transform: `rotate(${i * 90}deg)` })}>
                  <span className="go-twinkle absolute left-1/2 top-0 -ml-2" style={v({ "--td": `${i * 0.35}s`, filter: `drop-shadow(0 0 6px ${ring})` })}>
                    <Ico name="sparkle" className="h-4 w-4" color="#ffffff" />
                  </span>
                </div>
              ))}
              <div ref={itemRef} className={`relative ${phase === "taken" ? "gf-take" : reward.kind === "weapon" ? "gf-card-flip" : "gf-reward-in"}`} style={phase === "taken" ? undefined : { animationDelay: "160ms" }}>
                <div className="go-float">
                  {reward.kind === "coin" && <CoinPile big={reward.amount >= 300} />}
                  {reward.kind === "gem" && (
                    <div className="relative">
                      <Gem className="h-[124px] w-[136px] drop-shadow-[0_0_26px_rgba(56,189,248,.95)]" />
                      {reward.amount >= 8 && <Gem className="absolute -right-6 bottom-0 h-[54px] w-[60px] rotate-12 drop-shadow-[0_0_14px_rgba(56,189,248,.9)]" />}
                    </div>
                  )}
                  {reward.kind === "weapon" && (
                    <div
                      className="gf-shimmer relative w-[196px] overflow-hidden rounded-3xl border-4 p-2.5"
                      style={{ borderColor: ring, background: `radial-gradient(circle at 50% 40%, ${ring}77, transparent 65%), linear-gradient(180deg, #2a1d48, #0f0a1f)`, boxShadow: `0 0 40px ${ring}cc, 0 12px 26px rgba(0,0,0,.55)` }}
                    >
                      <span className={`font-title absolute left-2 top-2 z-10 rounded-md px-2 py-1 text-[11px] leading-none ${RARITY_STYLE[reward.weapon.rarity].chip}`}>{reward.weapon.rarity}</span>
                      <div className="grid h-[132px] place-items-center">
                        <div className="grid h-full w-[80%] place-items-center drop-shadow-[0_10px_14px_rgba(0,0,0,.6)]">
                          <WeaponPose kind={reward.weapon.kind} pal={reward.weapon.pal} size="hero" />
                        </div>
                      </div>
                      <div className="font-title rounded-xl border border-white/15 bg-black/55 py-1.5 text-center text-[16px] leading-none text-white">{reward.weapon.name.toUpperCase()}</div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {reward.kind !== "weapon" ? (
              <div className="go-amount -mt-2 flex flex-col items-center" style={{ animationDelay: "380ms" }}>
                <div className="font-title flex items-center gap-2 text-[54px] leading-none" style={{ color: reward.kind === "coin" ? "#ffd23f" : "#7dd3fc", ...STROKE(reward.kind === "coin" ? "#7c2d12" : "#0c4a6e", 3) }}>
                  +{shown}
                </div>
                <div className="font-title mt-1 rounded-full bg-black/45 px-4 py-1 text-[15px] tracking-[0.2em] text-white">
                  {reward.kind === "coin" ? (reward.amount >= 500 ? "JACKPOT KOIN" : "KOIN") : "DIAMOND"}
                </div>
              </div>
            ) : (
              <div className="go-amount -mt-1 flex flex-col items-center" style={{ animationDelay: "700ms" }}>
                <div className="font-title text-[28px] leading-none" style={{ color: reward.dup ? "#ffd23f" : "#86efac", ...STROKE(reward.dup ? "#7c2d12" : "#14532d", 2.5) }}>
                  {reward.dup ? "DUPLIKAT!" : "SENJATA BARU!"}
                </div>
                {reward.dup && (
                  <div className="font-title mt-1.5 flex items-center gap-1.5 rounded-full bg-black/45 px-3 py-1 text-[15px] text-white">
                    <Ico name="right" className="h-4 w-4" color="#ffffff" /> <Coin size={18} /> +{DUP_COINS}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* flash */}
      {lidOff && <div className="gf-flash pointer-events-none absolute inset-0" style={{ background: `radial-gradient(circle at 50% 47%, #ffffff, ${tierC}dd 30%, transparent 75%)` }} />}

      {/* ---------- bottom ---------- */}
      <div className="absolute inset-x-0 bottom-[7%] flex flex-col items-center">
        {phase === "idle" && taps === 0 && (
          <span className="gf-hand pointer-events-none mb-2 drop-shadow-[0_4px_4px_rgba(0,0,0,.5)]">
            <Ico name="hand" className="h-12 w-12" color="#ffffff" />
          </span>
        )}
        {canTake && (
          <button
            onClick={take}
            onPointerEnter={hoverSfx}
            className="press shine go-btn-in font-title relative h-[60px] w-[240px] rounded-2xl border-2 border-[#0e5a26] text-[26px] text-white shadow-[0_6px_0_#0e5a26,0_0_30px_rgba(124,240,111,.45)]"
            style={{ background: "linear-gradient(180deg,#7cf06f 0%,#3fcf4a 48%,#21a83a 52%,#1f9b37 100%)" }}
          >
            <span className="absolute inset-x-3 top-1 h-[38%] rounded-xl bg-white/25" />
            <span className="relative" style={{ textShadow: "0 2px 0 #0e5a26" }}>
              AMBIL!
            </span>
          </button>
        )}
      </div>
    </div>
  );
}
