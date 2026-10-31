import type { CSSProperties, MouseEvent } from "react";
import { Background, Grass } from "./Background";
import { Gun } from "./Gun";
import { hoverSfx } from "../audio/useSound";
import { FLAT_COLOR, GameIcon, NavFrame, type IconName } from "../ui/GameIcons";
import { Gem } from "../gift/GiftArt";
import { useSettings } from "../theme/themes";
import { animClass, gunTiming, TL, WHEEL, type Plan } from "../anim/presets";

export type Target = "play" | "quest" | "gun" | "ranks" | "ready" | "setting";

type Props = {
  leaving: Target | "preview" | null;
  ready: boolean;
  coins: number;
  gems: number;
  plan: Plan;
  onNavigate: (t: Target, e: MouseEvent<HTMLElement>) => void;
  rewardBadge?: number;
};

/** timing of the title bullet (ms, before speed scaling) */
const BULLET = { d: 800, dur: 560 };
/** menu exit plays faster than the entrance */
const EXIT_K = 0.78;

/** 3D brass bullet spinning on its long axis */
function SpinBullet() {
  return (
    <div className="relative h-[18px] w-[58px] drop-shadow-[0_0_8px_rgba(255,220,140,.75)]">
      <div className="b3d-case absolute left-[3px] top-0 h-full w-[58%] overflow-hidden rounded-l-[3px] shadow-[inset_0_0_0_1px_rgba(70,40,0,.55)]" />
      <div className="absolute -left-[1px] -top-[1px] h-[20px] w-[6px] rounded-[2px] shadow-[inset_0_0_0_1px_rgba(60,30,0,.6)]" style={{ background: "linear-gradient(180deg,#fff2b0,#d49a2a 45%,#5a3505)" }} />
      <div className="b3d-band absolute left-[50%] top-0 h-full w-[7%]" />
      <div
        className="b3d-tip absolute left-[56%] top-[1px] h-[16px] w-[44%] overflow-hidden shadow-[inset_0_0_0_1px_rgba(70,25,5,.55)]"
        style={{ borderRadius: "0 75% 75% 0 / 0 50% 50% 0" }}
      >
        <span className="b3d-glint absolute inset-x-0 h-[3px] bg-white/80 blur-[0.5px]" />
      </div>
      <div className="pointer-events-none absolute left-[5%] right-[12%] top-[20%] h-[2px] rounded-full bg-white/85" />
      <div className="pointer-events-none absolute bottom-[12%] left-[5%] right-[16%] h-[2px] rounded-full bg-black/35" />
    </div>
  );
}

export function MainMenu({ leaving, ready, coins, gems, plan, onNavigate, rewardBadge = 0 }: Props) {
  const out = leaving !== null;
  const k = plan.k;

  /** fixed (non-configurable) element animation */
  const a = (inA: string, inD: number, outA: string, outD: number, inDur = 700, outDur = 480, extra = "") => ({
    className: `a ${out ? outA : inA} ${extra}`,
    style: {
      "--d": `${(out ? outD * EXIT_K : inD) * k}ms`,
      "--dur": `${(out ? outDur * EXIT_K : inDur) * k}ms`,
    } as CSSProperties,
  });

  /** configurable element animation (uses plan style) */
  const s = (
    style: Plan["gun"],
    t: { inD: number; inDur: number; outD: number; outDur: number },
    classic: [string, string],
    sx: number,
    extra = "",
  ) => ({
    className: `a ${animClass(style, out ? "out" : "in", classic)} ${extra}`,
    style: {
      "--d": `${(out ? t.outD * EXIT_K : t.inD) * k}ms`,
      "--dur": `${(out ? t.outDur * EXIT_K : t.inDur) * k}ms`,
      "--sx": sx,
    } as CSSProperties,
  });

  const perfect = "PERFECT".split("");
  const shot = "SHOT".split("");

  const iconSet = useSettings().icons;
  const nav: { id: Target; label: string; icon: IconName; hl?: boolean }[] = [
    { id: "gun", label: "GUN", icon: "gun" },
    { id: "ranks", label: "RANKS", icon: "ranks" },
    { id: "ready", label: "READY!", icon: "gift", hl: true },
    { id: "setting", label: "SETTING", icon: "gear" },
  ];

  const shake = a("in-shake", BULLET.d + BULLET.dur * 0.78, "", 0, 380, 0, "absolute inset-0");
  const div = a("in-fade", 250, "out-fade", 0, 700, 480, "h-8 w-px bg-white/20");
  const slashBar = a("in-trail", BULLET.d, "out-slash", 120, BULLET.dur, 380, "absolute inset-0");
  const bullet = a("in-bullet", BULLET.d, "out-bullet", 110, BULLET.dur, 460, "absolute top-1/2 z-10");
  const muzzle = a("b-muzzle", BULLET.d, "", 0, 280, 0, "pointer-events-none absolute left-0 top-1/2 h-10 w-10 rounded-full");
  const rays = a("rays-drop", WHEEL.d, "out-rays", 100, WHEEL.dur, 500, "absolute h-[300px] w-[300px]");
  const line = a("in-line", 1500, "out-line", 40, 600, 380, "relative z-10 mx-auto my-4 h-px w-[70%] bg-gradient-to-r from-transparent via-white/15 to-transparent");
  const gunCls: [string, string] = ["in-gun", leaving === "play" ? "out-zoom" : "out-spin"];
  const gunA =
    leaving === "play"
      ? { className: "relative opacity-0", style: {} as CSSProperties }
      : s(plan.gun, gunTiming(plan.gun), gunCls, 1, "relative");

  return (
    <div className={`absolute inset-0 overflow-hidden ${ready && !out ? "" : "pointer-events-none"}`}>
      <Background leaving={out} still={leaving === "play"} />

      {/* shake wrapper (triggers when "SHOT" slams in) */}
      <div {...shake}>
        <div className="relative flex h-full flex-col">
          {/* ===== currency bar ===== */}
          <div className="relative z-10 flex items-center justify-end gap-3 px-5 pt-4">
            <div {...a("in-down", 150, "out-up", 0)}>
              <div className="font-title flex items-center gap-1.5 text-xl text-amber-300 drop-shadow">
                {coins}
                <span className="grid h-6 w-6 place-items-center rounded-full bg-gradient-to-br from-yellow-200 to-amber-500 text-xs shadow-inner ring-2 ring-amber-600/60">
                  <span className="h-3 w-1.5 rounded-full bg-amber-700/70" />
                </span>
              </div>
            </div>
            <div {...div} />
            <div {...a("in-down", 250, "out-up", 60)}>
              <div className="font-title flex items-center gap-1 text-lg text-white drop-shadow">
                <Gem className="h-6 w-6" />
                {gems}
              </div>
            </div>
          </div>

          {/* ===== title ===== */}
          <div className="relative z-10 mt-1 flex flex-col items-center">
            {!out && <div className="mm-halo pointer-events-none absolute left-1/2 top-[46%] h-[180px] w-[360px] -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ animationDelay: `${2600 * k}ms` }} />}
            <h1 className="font-title relative flex text-[min(15vw,72px)] leading-none tracking-wide text-[#3fdc72]">
              {!out && (
                <span aria-hidden className="mm-shine pointer-events-none absolute inset-0 z-10 flex" style={{ animationDelay: `${2800 * k}ms` }}>
                  {perfect.map((ch, i) => (
                    <span key={i} className="inline-block">{ch}</span>
                  ))}
                </span>
              )}
              {perfect.map((ch, i) => {
                const p = s(plan.title[i], TL.letter(i), ["in-letter", "out-letter"], i < 3 ? -1 : 1, "inline-block");
                return (
                  <span
                    key={i}
                    className={p.className}
                    style={{
                      ...p.style,
                      textShadow:
                        "0 2px 0 #23a34e, 0 4px 0 #1d8a42, 0 6px 0 #166f35, 0 8px 0 #0f5427, 0 14px 18px rgba(0,0,0,.55)",
                    }}
                  >
                    {ch}
                  </span>
                );
              })}
            </h1>

            {/* slash bar */}
            <div className="relative mt-1 h-3 w-[62%]">
              <div
                className={slashBar.className}
                style={{ ...slashBar.style, filter: "drop-shadow(0 0 5px rgba(255,255,255,.9)) drop-shadow(0 0 14px rgba(180,255,220,.6))" }}
              >
                {/* tapered, fading tail */}
                <div
                  className="absolute inset-y-[1px] left-0 right-0"
                  style={{ clipPath: "polygon(0 50%, 100% 0, 100% 100%)", background: "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,.18) 25%, rgba(255,255,255,.7) 68%, #ffffff 100%)" }}
                />
                {/* hot core */}
                <div
                  className="absolute left-[35%] right-0 top-1/2 h-[3px] -translate-y-1/2"
                  style={{ clipPath: "polygon(0 50%, 100% 0, 100% 100%)", background: "linear-gradient(90deg, rgba(255,255,255,0), #fffbe6 80%)" }}
                />
              </div>
              {!out && (
                <span
                  className={muzzle.className}
                  style={{ ...muzzle.style, background: "radial-gradient(circle, #fffbe0 0%, #ffd23f 40%, rgba(255,140,40,.5) 60%, transparent 72%)" }}
                />
              )}
              <div className={bullet.className} style={{ ...bullet.style, left: "92%" }}>
                {!out && (
                  <>
                    <span className="b-streak absolute right-[70%] top-1/2 h-[7px] -translate-y-1/2 rounded-full" style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,.9) 70%, #fff7c2)", boxShadow: "0 0 12px 3px rgba(255,240,180,.7)" }} />
                    <span className="b-ring absolute right-0 top-1/2 h-8 w-8 rounded-full border-2 border-[#fff3b0]" style={{ boxShadow: "0 0 10px rgba(255,220,120,.9)" }} />
                    {[[-22, -16], [-26, 12], [-12, -22], [-14, 20], [6, -14], [8, 12]].map(([x, y], i) => (
                      <span
                        key={i}
                        className="b-spark absolute right-0 top-1/2 h-[5px] w-[5px] rounded-full"
                        style={{ background: i % 2 ? "#fff7c2" : "#ffb347", boxShadow: "0 0 6px 2px rgba(255,200,90,.8)", ["--sx" as string]: `${x}px`, ["--sy" as string]: `${y}px` } as CSSProperties}
                      />
                    ))}
                  </>
                )}
                <div className="b-idle">
                  <SpinBullet />
                </div>
              </div>
            </div>

            <h2 className="font-title relative -mt-1 flex text-[min(18vw,86px)] leading-none tracking-wider text-[#ffd23f]">
              {!out && (
                <span aria-hidden className="mm-shine pointer-events-none absolute inset-0 z-10 flex" style={{ animationDelay: `${3000 * k}ms` }}>
                  {shot.map((ch, i) => (
                    <span key={i} className="inline-block">{ch}</span>
                  ))}
                </span>
              )}
              {shot.map((ch, i) => {
                const p = s(plan.title[7 + i], TL.shot(i), ["in-slam", "out-blast"], i < 2 ? -1 : 1, "inline-block");
                return (
                  <span
                    key={i}
                    className={p.className}
                    style={{
                      ...p.style,
                      textShadow:
                        "0 2px 0 #f0a81c, 0 4px 0 #e0901a, 0 6px 0 #c47414, 0 8px 0 #9c5a10, 0 14px 18px rgba(0,0,0,.55)",
                    }}
                  >
                    {ch}
                  </span>
                );
              })}
            </h2>

            <div {...a("in-up", 1250, "out-fade", 80, 600, 300)}>
              <p className="font-title mt-4 flex items-center gap-3 text-lg tracking-[0.12em] text-white drop-shadow-[0_2px_0_rgba(0,0,0,.5)]">
                STAGE 4 <span className="inline-block h-2.5 w-2.5 rotate-45 bg-amber-400" /> SCORE 23
              </p>
            </div>
          </div>

          {/* ===== gun showcase ===== */}
          <div className="relative flex flex-1 items-center justify-center">
            <div {...rays}>
              <div
                className="spin-slow h-full w-full rounded-full"
                style={{
                  background:
                    "repeating-conic-gradient(from 0deg, rgba(200,240,240,.22) 0deg 7deg, transparent 7deg 22deg)",
                  WebkitMask: "radial-gradient(circle, #000 0%, rgba(0,0,0,.6) 35%, transparent 70%)",
                  mask: "radial-gradient(circle, #000 0%, rgba(0,0,0,.6) 35%, transparent 70%)",
                }}
              />
            </div>
            <div {...gunA}>
              {!out && plan.gun === "combo" && (
                <div
                  aria-hidden="true"
                  className="menu-pop-burst left-1/2 top-1/2"
                  style={{
                    "--pop-delay": `${(gunTiming("combo").inD + gunTiming("combo").inDur * 0.74) * k}ms`,
                    "--pop-dur": `${gunTiming("combo").inDur * 0.26 * k}ms`,
                  } as CSSProperties}
                >
                  {Array.from({ length: 12 }, (_, i) => (
                    <span key={i} className="menu-pop-ray" style={{ "--ray-angle": `${i * 30}deg` } as CSSProperties} />
                  ))}
                </div>
              )}
              <div className="shadow-pulse absolute bottom-0 left-1/2 h-8 w-40 -translate-x-1/2 rounded-[50%] bg-black/60 blur-sm" />
              {!out && (
                <div className="mm-pedestal pointer-events-none absolute -bottom-3 left-1/2 h-12 w-56 -translate-x-1/2" style={{ animationDelay: `${3400 * k}ms` }}>
                  <span className="absolute inset-0 rounded-[50%] border-2 border-[#a5f3fc]/60 shadow-[0_0_18px_rgba(165,243,252,.55),inset_0_0_14px_rgba(165,243,252,.35)]" />
                  <svg viewBox="0 0 224 48" className="absolute inset-0 h-full w-full overflow-visible">
                    <ellipse cx="112" cy="24" rx="96" ry="18" fill="none" stroke="rgba(255,255,255,.4)" strokeWidth="2" strokeDasharray="8 10" className="mm-dash" />
                    <circle r="4" fill="#ffffff" style={{ filter: "drop-shadow(0 0 5px rgba(165,243,252,1))" }}>
                      <animateMotion dur="5s" repeatCount="indefinite" path="M224 24 A112 24 0 1 1 0 24 A112 24 0 1 1 224 24" />
                    </circle>
                  </svg>
                </div>
              )}
              {!out &&
                [18, 42, 64, 82].map((x, i) => (
                  <span key={i} className="mm-mote pointer-events-none absolute bottom-6 h-1.5 w-1.5 rounded-full bg-[#e0fbff]" style={{ left: `${x}%`, animationDelay: `${3400 * k + i * 700}ms` }} />
                ))}
              <div className="float" data-menu-gun>
                <Gun className="relative h-[clamp(180px,30vh,260px)] w-auto drop-shadow-[0_10px_20px_rgba(0,0,0,.5)]" />
              </div>
            </div>
          </div>

          {/* ===== main buttons ===== */}
          <div className="relative z-10 flex justify-center gap-3 px-6">
            <div {...s(plan.buttons[0], TL.buttons(0), ["in-left", "out-left"], -1, "w-[42%] max-w-[158px]")}>
              <button
                onClick={(e) => onNavigate("quest", e)}
                onPointerEnter={hoverSfx}
                className="press shine font-ui relative flex h-[54px] w-full items-center justify-center gap-1.5 rounded-2xl bg-gradient-to-b from-[#ff6a3d] to-[#e0331e] text-[20px] text-white shadow-[0_5px_0_#9c1f12,0_10px_18px_rgba(0,0,0,.4)]"
                style={{ "--shd": "2.4s" } as CSSProperties}
              >
                <span className="absolute inset-x-3 top-1.5 h-5 rounded-xl bg-white/25" />
                <GameIcon name="quest" set={iconSet} mono={{ fill: "#ffffff", line: "#8f1d10" }} className="relative h-6 w-6" />
                <span className="relative drop-shadow-[0_2px_0_rgba(0,0,0,.3)]">QUEST</span>
              </button>
            </div>
            <div {...s(plan.buttons[1], TL.buttons(1), ["in-right", "out-right"], 1, "w-[42%] max-w-[158px]")}>
              <button
                onClick={(e) => onNavigate("play", e)}
                onPointerEnter={hoverSfx}
                className="press shine mm-breathe font-ui relative flex h-[54px] w-full items-center justify-center gap-1.5 rounded-2xl bg-gradient-to-b from-[#4cef6a] to-[#18b93a] text-[24px] text-white shadow-[0_5px_0_#0c7a22,0_10px_18px_rgba(0,0,0,.4)]"
              >
                <span className="absolute inset-x-3 top-1.5 h-5 rounded-xl bg-white/30" />
                <span className="relative drop-shadow-[0_2px_0_rgba(0,0,0,.3)]">PLAY</span>
                <GameIcon name="play" set={iconSet} mono={{ fill: "#ffffff", line: "#0c6a22" }} className="relative h-7 w-7" />
              </button>
            </div>
          </div>

          <div {...line} />

          {/* ===== bottom nav ===== */}
          <div className={`relative z-30 grid grid-cols-4 px-6 pb-6 ${iconSet === "flat" ? "gap-5" : "gap-3"}`}>
            {nav.map((n, i) => (
              <div key={n.id} {...s(plan.nav[i], TL.nav(i), ["in-pop", "out-down"], i < 2 ? -1 : 1)}>
                <button
                  onClick={(e) => onNavigate(n.id, e)}
                  onPointerEnter={hoverSfx}
                  className="press flex w-full flex-col items-center gap-1.5"
                >
                  <span className={`relative w-full ${iconSet === "flat" ? "max-w-[50px]" : "max-w-[66px]"}`}>
                    <NavFrame set={iconSet} name={n.icon} active={!!n.hl}>
                      <span className={`block h-full w-full ${n.hl ? "bounce-soft" : ""}`}>
                        <GameIcon name={n.icon} set={iconSet} className="h-full w-full drop-shadow-[0_3px_2px_rgba(0,0,0,.45)]" />
                      </span>
                    </NavFrame>
                    {n.id === "ready" && rewardBadge > 0 && (
                      <span className="font-title absolute -right-1.5 -top-1 grid h-6 min-w-6 place-items-center rounded-full bg-[#ef4444] px-1 text-[12px] text-white shadow-[0_2px_0_#7f1d1d] ring-2 ring-white">
                        {rewardBadge}
                      </span>
                    )}
                  </span>
                  <span
                    className={`font-title tracking-wide drop-shadow-[0_2px_0_rgba(0,0,0,.6)] ${iconSet === "flat" ? "text-[10.5px]" : "text-sm"} ${
                      iconSet === "flat" ? "" : n.hl ? "text-yellow-300" : "text-white"
                    }`}
                    style={iconSet === "flat" ? { color: FLAT_COLOR } : undefined}
                  >
                    {n.label}
                  </span>
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Grass leaving={out} still={leaving === "play"} />
    </div>
  );
}
