import { useEffect, useRef, useState, type CSSProperties, type MouseEvent } from "react";
import { sfx } from "../audio/sfx";
import { hoverSfx, useSound } from "../audio/useSound";
import { GAME_SPEEDS, settings, THEMES, themeFor, useSettings, type ThemeSel } from "../theme/themes";
import { GameIcon, ICON_SETS, NavFrame } from "../ui/GameIcons";
import { Ico } from "../ui/FlatIcons";

type Props = {
  closing: boolean;
  onClose: (e?: MouseEvent<HTMLElement>) => void;
  onIntro: (e: MouseEvent<HTMLElement>) => void;
};

const v = (o: Record<string, string | number>) => o as CSSProperties;
const ALL = [...THEMES.map((x) => ({ id: x.id as ThemeSel, name: x.name, icon: x.icon, tile: x.tile, accent: x.accent })), { id: "auto" as ThemeSel, name: "AUTO", icon: "🎯", tile: ["#6b3fa0", "#1f1238"] as [string, string], accent: "#ffd23f" }];

function Toggle({ on }: { on: boolean }) {
  return (
    <span className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${on ? "bg-[#3fdc72]" : "bg-white/20"}`}>
      <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${on ? "left-[18px]" : "left-0.5"}`} />
    </span>
  );
}

export function Settings({ closing, onClose, onIntro }: Props) {
  const st = useSettings();
  const snd = useSound();
  const last = useRef(0);
  const prevVol = useRef(snd.volume || 1);
  const stripRef = useRef<HTMLDivElement>(null);
  const t = themeFor(st.theme, "menu");
  const out = closing;
  const A = (d: number, extra = "") => ({ className: `a ${out ? "" : "in-up"} ${extra}`, style: v({ "--d": `${d}ms`, "--dur": "380ms" }) });
  const [adv, setAdv] = useState(false);

  // keep the selected theme visible in the strip
  useEffect(() => {
    const el = stripRef.current?.querySelector<HTMLElement>(`[data-th="${st.theme}"]`);
    el?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [st.theme]);

  const setVol = (x: number, tick = true) => {
    sfx.setVolume(x);
    if (x > 0) prevVol.current = x;
    const now = performance.now();
    if (tick && now - last.current > 70) {
      last.current = now;
      sfx.tap(0, 700 + x * 900);
    }
  };
  const toggleMute = () => {
    if (snd.volume > 0) setVol(0, false);
    else setVol(prevVol.current || 1, false);
    sfx.tap(0, 1000);
  };

  const pickTheme = (id: ThemeSel, i: number) => {
    settings.setTheme(id);
    sfx.design(i);
    sfx.whoosh(0, 0.4, 300, 2600, 0.08);
  };

  const label = "font-title text-[11px] tracking-[0.14em] text-white/55";

  return (
    <div className={`absolute inset-0 z-[70] grid place-items-center px-5 ${out ? "pointer-events-none" : ""}`}>
      <button aria-label="Tutup pengaturan" onClick={() => onClose()} className={`absolute inset-0 cursor-default bg-black/55 backdrop-blur-[2px] ${out ? "studio-fade-out" : "studio-fade-in"}`} />

      <div
        className={`relative w-full max-w-[350px] rounded-[24px] border-2 border-white/15 p-3.5 shadow-[0_20px_50px_rgba(0,0,0,.6),inset_0_1px_0_rgba(255,255,255,.14)] ${out ? "st-pop-out" : "st-pop-in"}`}
        style={{ background: `linear-gradient(180deg, ${t.sky[1]}f0 0%, #0e1519f5 45%, #080c0ff8 100%)` }}
      >
        {/* header */}
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-white/10 text-lg">⚙️</span>
          <h2 className="font-title flex-1 text-[20px] leading-none tracking-wide text-white" style={{ textShadow: `0 2px 0 rgba(0,0,0,.45), 0 0 14px ${t.accent}55` }}>
            PENGATURAN
          </h2>
          <button onClick={(e) => onClose(e)} onPointerEnter={hoverSfx} aria-label="Tutup" className="press grid h-9 w-9 place-items-center rounded-xl border-2 border-white/20 bg-white/10 text-base text-white">
            ✕
          </button>
        </div>

        {/* sound */}
        <div {...A(40, "mt-3 rounded-2xl border border-white/10 bg-black/35 p-2.5")}>
          <div className="flex items-center gap-2.5">
            <button onClick={toggleMute} onPointerEnter={hoverSfx} aria-label="Bisukan" className="press grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-b from-[#38bdf8] to-[#0369a1] text-lg shadow-[0_3px_0_#0c4a6e]">
              {snd.volume === 0 ? "🔇" : snd.volume < 0.5 ? "🔉" : "🔊"}
            </button>
            <div className="relative h-7 flex-1">
              <div className="absolute inset-x-0 top-1/2 h-2 -translate-y-1/2 rounded-full bg-black/50 shadow-inner" />
              <div className="absolute left-0 top-1/2 h-2 -translate-y-1/2 rounded-full bg-gradient-to-r from-[#22c55e] to-[#86efac] shadow-[0_0_8px_rgba(34,197,94,.55)]" style={{ width: `${snd.volume * 100}%` }} />
              <div className="pointer-events-none absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-[#16a34a] bg-white shadow" style={{ left: `${snd.volume * 100}%` }} />
              <input type="range" min={0} max={100} value={Math.round(snd.volume * 100)} onChange={(e) => setVol(Number(e.target.value) / 100)} aria-label="Volume" className="absolute inset-0 h-full w-full cursor-pointer opacity-0" />
            </div>
            <span className="font-title w-11 text-right text-[14px] text-[#86efac]">{Math.round(snd.volume * 100)}%</span>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {[
              { l: "🎯 Efek", on: snd.sfx, f: () => (snd.sfx ? (sfx.toggle(false), setTimeout(() => sfx.setSfx(false), 240)) : (sfx.setSfx(true), sfx.toggle(true))) },
              { l: "🎵 Musik", on: snd.music, f: () => (sfx.toggle(!snd.music), sfx.setMusic(!snd.music)) },
            ].map((x) => (
              <button key={x.l} onPointerEnter={hoverSfx} onClick={x.f} className="press font-ui flex h-9 items-center justify-between gap-2 rounded-xl bg-white/[.06] px-3 text-[13px] text-white">
                {x.l}
                <Toggle on={x.on} />
              </button>
            ))}
          </div>
        </div>

        {/* theme */}
        <div {...A(140, "mt-3")}>
          <div className="flex items-baseline justify-between">
            <span className={label}>🎨 TEMA LATAR</span>
            <span key={st.theme} className="a in-fade font-title text-[12px] text-white" style={v({ "--d": "0ms", "--dur": "250ms" })}>
              {st.theme === "auto" ? "🎯 OTOMATIS" : `${t.icon} ${t.name}`}
            </span>
          </div>
          <div
            ref={stripRef}
            className="no-scrollbar smooth-scroll -mx-1 mt-1.5 flex snap-x snap-proximity gap-1.5 overflow-x-auto px-1 py-1"
            style={{ WebkitMaskImage: "linear-gradient(90deg, transparent, #000 10px, #000 calc(100% - 10px), transparent)", maskImage: "linear-gradient(90deg, transparent, #000 10px, #000 calc(100% - 10px), transparent)" }}
          >
            {ALL.map((x, i) => {
              const on = st.theme === x.id;
              return (
                <button
                  key={x.id}
                  data-th={x.id}
                  onPointerEnter={hoverSfx}
                  onClick={() => pickTheme(x.id, i)}
                  title={x.name}
                  className="press relative flex h-[58px] w-[54px] shrink-0 snap-center flex-col items-center justify-center gap-0.5 rounded-xl border-2 transition-transform"
                  style={{
                    borderColor: on ? x.accent : "rgba(255,255,255,.14)",
                    background: `linear-gradient(180deg, ${x.tile[0]}, ${x.tile[1]})`,
                    boxShadow: on ? `0 0 0 2px ${x.accent}44, 0 0 12px ${x.accent}88` : "0 2px 0 rgba(0,0,0,.4)",
                    transform: on ? "translateY(-2px)" : undefined,
                  }}
                >
                  <span className="text-[20px] leading-none drop-shadow-[0_2px_1px_rgba(0,0,0,.4)]">{x.icon}</span>
                  <span className="font-title text-[8.5px] leading-none text-white" style={{ textShadow: "0 1px 0 rgba(0,0,0,.6)" }}>
                    {x.name}
                  </span>
                  {on && <span className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-[#22c55e] text-[9px] text-white ring-2 ring-[#0e1519]">✓</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* advanced (collapsed by default) */}
        <div {...A(170, "mt-3")}>
          <button
            onPointerEnter={hoverSfx}
            onClick={() => {
              setAdv((x) => !x);
              sfx.tap(0, adv ? 800 : 1100);
            }}
            className="press flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/[.05] px-3 py-2.5"
          >
            <span className="font-title flex items-center gap-2 text-[13px] text-white/85">
              <Ico name="bolt" className="h-4 w-4" color="rgba(255,255,255,.75)" /> PENGATURAN LANJUTAN
            </span>
            <span className={`font-title text-[13px] text-white/70 transition-transform duration-300 ${adv ? "rotate-180" : ""}`}>▾</span>
          </button>
          {adv && (
            <div className="st-adv-in mt-1 rounded-xl border border-white/10 bg-black/25 px-2.5 pb-3 pt-1">
        {/* speed */}
        <div {...A(90, "mt-3")}>
          <div className={label}>⚡ KECEPATAN GAME</div>
          <div className="mt-1.5 grid grid-cols-4 gap-1 rounded-xl bg-black/35 p-1">
            {GAME_SPEEDS.map((s) => {
              const on = st.speed === s.v;
              return (
                <button
                  key={s.v}
                  onPointerEnter={hoverSfx}
                  onClick={() => {
                    settings.setSpeed(s.v);
                    sfx.tap(0, 600 + s.v * 500);
                  }}
                  className={`font-title h-8 rounded-lg text-[14px] transition-all ${on ? "bg-gradient-to-b from-[#ffe27a] to-[#f59e0b] text-[#4a2a00] shadow-[0_2px_0_#9a5b00]" : "text-white/70 hover:bg-white/10"}`}
                >
                  {s.v}x
                </button>
              );
            })}
          </div>
        </div>

        {/* transitions (before / after) */}
        <div {...A(150, "mt-3")}>
          <div className={label}>✦ TRANSISI</div>
          <button
            onPointerEnter={hoverSfx}
            onClick={() => {
              settings.setQuickBack(!st.quickBack);
              sfx.toggle(!st.quickBack);
            }}
            className="press mt-1.5 flex w-full items-center gap-3 rounded-xl border border-white/10 bg-black/35 px-3 py-2.5 text-left"
          >
            <div className="min-w-0 flex-1">
              <div className="font-title text-[13px] leading-tight text-white">Kembali ke Menu Cepat</div>
              <div className="font-ui mt-0.5 text-[11px] leading-snug text-white/60">
                {st.quickBack ? "ON · fade singkat ±0.4 dtk dari GUN, QUEST, READY & RANKS" : "OFF · animasi tema penuh (pintu baja, awan, kado, pita)"}
              </div>
            </div>
            <Toggle on={st.quickBack} />
          </button>
        </div>

        {/* icon style */}
        <div {...A(165, "mt-3")}>
          <div className={label}>◆ GAYA IKON</div>
          <div className="mt-1.5 grid grid-cols-4 gap-1.5">
            {ICON_SETS.map((x, i) => {
              const on = st.icons === x.id;
              return (
                <button
                  key={x.id}
                  onPointerEnter={hoverSfx}
                  onClick={() => {
                    settings.setIcons(x.id);
                    sfx.design(i * 3);
                  }}
                  title={x.desc}
                  className={`press flex flex-col items-center gap-1 rounded-xl border-2 px-1 pb-1.5 pt-2 transition-colors ${on ? "border-[#ffd23f] bg-[#ffd23f]/10" : "border-white/10 bg-black/30"}`}
                >
                  <span className="flex w-full justify-center gap-0.5">
                    {(["gun", "ranks", "gift"] as const).map((n) => (
                      <span key={n} className="w-[30%]">
                        <NavFrame set={x.id} name={n}>
                          <GameIcon name={n} set={x.id} className="h-full w-full" />
                        </NavFrame>
                      </span>
                    ))}
                  </span>
                  <span className={`font-title text-[10px] leading-none ${on ? "text-[#ffe27a]" : "text-white/75"}`}>{x.name}</span>
                </button>
              );
            })}
          </div>
        </div>

              <button onPointerEnter={hoverSfx} onClick={onIntro} className="press font-title mt-3 flex h-10 w-full items-center justify-center gap-1.5 rounded-xl border-2 border-[#ef4444]/50 bg-[#3a0d12]/80 text-[13px] text-[#fecaca]">
                <Ico name="play" className="h-4 w-4" color="#fecaca" /> PUTAR ULANG INTRO
              </button>
            </div>
          )}
        </div>

        {/* footer */}
        <div {...A(200, "mt-3")}>
          <button
            onPointerEnter={hoverSfx}
            onClick={(e) => onClose(e)}
            className="press font-title h-12 w-full rounded-xl border-2 border-[#0e5a26] text-[17px] text-white shadow-[0_4px_0_#0e5a26]"
            style={{ background: "linear-gradient(180deg,#7cf06f 0%,#3fcf4a 48%,#21a83a 52%,#1f9b37 100%)", textShadow: "0 2px 0 #0e5a26" }}
          >
            SELESAI
          </button>
        </div>
      </div>
    </div>
  );
}
