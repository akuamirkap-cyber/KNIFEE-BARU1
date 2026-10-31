import { useState, type CSSProperties } from "react";
import { sfx } from "../audio/sfx";
import { hoverSfx } from "../audio/useSound";
import { useGame } from "../game/store";
import { TargetArt } from "../play/TargetArt";
import { CODEX_BOSSES, CODEX_OBSTACLES, CODEX_WHEELS, type CodexEntry } from "../codex/data";
import { KnifeArt } from "../play/KnifeArt";

function EntryArt({ e, big = false }: { e: CodexEntry; big?: boolean }) {
  if (e.group === "obstacle")
    return (
      <span className="relative block h-full w-full">
        <span className="absolute inset-[6%]" style={{ transform: "rotate(28deg)" }}>
          <KnifeArt variant={e.knife} className="absolute inset-0 h-full w-full drop-shadow-[0_6px_6px_rgba(0,0,0,.5)]" />
        </span>
      </span>
    );
  return <TargetArt kind={e.kind} head={e.head} className={`h-full w-full ${big ? "drop-shadow-[0_10px_12px_rgba(0,0,0,.5)]" : "drop-shadow-[0_5px_6px_rgba(0,0,0,.45)]"}`} />;
}
import { Ico } from "../ui/FlatIcons";

type Props = { closing: boolean; onClose: () => void };
const v = (o: Record<string, string | number>) => o as CSSProperties;
const STROKE = (c: string, w = 2) => ({ textShadow: `0 ${w + 1}px 0 ${c}, -${w}px 0 0 ${c}, ${w}px 0 0 ${c}, 0 -${w}px 0 ${c}` });

export function Codex({ closing, onClose }: Props) {
  const g = useGame();
  const [tab, setTab] = useState<"wheel" | "boss" | "obstacle">("wheel");
  const [sel, setSel] = useState(0);
  const [k, setK] = useState(0);
  const list = tab === "wheel" ? CODEX_WHEELS : tab === "boss" ? CODEX_BOSSES : CODEX_OBSTACLES;
  const e = list[Math.min(sel, list.length - 1)];
  const found = (x: CodexEntry) => x.first > 0 && x.first <= g.stage;
  const ALL = [...CODEX_WHEELS, ...CODEX_BOSSES, ...CODEX_OBSTACLES];
  const foundCount = ALL.filter(found).length;
  const total = ALL.length;

  const pick = (i: number) => {
    if (i === sel) return;
    setSel(i);
    setK((x) => x + 1);
    sfx.tap(0, 1150);
    if (list[i].group === "boss") sfx.thud(0.02, 0.4);
    else sfx.bubble(0.02, i % 4);
  };
  const switchTab = (t: "wheel" | "boss" | "obstacle", i: number) => {
    if (t === tab) return;
    sfx.tabSwitch(i * 3);
    setTab(t);
    setSel(0);
    setK((x) => x + 1);
  };

  return (
    <div className={`absolute inset-0 z-[70] flex flex-col overflow-hidden ${closing ? "cx-out pointer-events-none" : "cx-in"}`} style={{ background: "radial-gradient(ellipse at 50% 0%, #3b2a6b 0%, #1a1238 45%, #0b0820 100%)" }}>
      <div className="pointer-events-none absolute inset-0 opacity-[.07]" style={{ backgroundImage: "radial-gradient(#fff 1px, transparent 1.5px)", backgroundSize: "18px 18px" }} />

      {/* ---------- header ---------- */}
      <div className="relative flex items-center gap-2.5 px-3 pt-3">
        <button onClick={onClose} onPointerEnter={hoverSfx} aria-label="Kembali" className="press grid h-11 w-11 place-items-center rounded-2xl border-2 border-[#7a4b00] bg-gradient-to-b from-[#ffe27a] to-[#f59e0b] shadow-[0_4px_0_#7a4b00,inset_0_2px_0_rgba(255,255,255,.5)]">
          <Ico name="right" className="h-6 w-6 rotate-180" color="#ffffff" />
        </button>
        <div className="min-w-0 flex-1">
          <div className="font-title flex items-center gap-1.5 text-[22px] leading-none text-white" style={{ textShadow: "0 2px 0 #1a1238, 0 0 14px rgba(253,230,138,.45)" }}>
            <Ico name="book" className="h-6 w-6" color="#fde68a" /> KAMUS GAME
          </div>
          <div className="font-title mt-1 text-[11px] tracking-wider text-[#c4b5fd]">
            {foundCount}/{total} DITEMUKAN · {CODEX_WHEELS.length} RODA · {CODEX_BOSSES.length} BOS · {CODEX_OBSTACLES.length} RINTANGAN
          </div>
        </div>
      </div>

      {/* ---------- featured ---------- */}
      <div className="relative mx-3 mt-3 overflow-hidden rounded-[22px] border-2 p-3 shadow-[0_10px_24px_rgba(0,0,0,.45)]" style={{ borderColor: `${e.tagColor}88`, background: `radial-gradient(circle at 22% 45%, ${e.tagColor}40, transparent 55%), linear-gradient(180deg, #2a1d52, #140d2c)` }}>
        <div className="flex gap-3">
          <div className="relative grid h-[132px] w-[132px] shrink-0 place-items-center">
            <div className="absolute inset-0 rounded-full" style={{ background: `radial-gradient(circle, ${e.tagColor}66, transparent 68%)` }} />
            <div key={`a${k}`} className="a in-pop relative h-[118px] w-[118px]" style={v({ "--d": "0ms", "--dur": "520ms" })}>
              <div className={e.group === "wheel" ? "cx-spin h-full w-full" : "float h-full w-full"}>
                <EntryArt e={e} big />
              </div>
            </div>
          </div>
          <div key={`t${k}`} className="a in-left min-w-0 flex-1 py-0.5" style={v({ "--d": "40ms", "--dur": "420ms" })}>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-title rounded-md px-2 py-[3px] text-[10.5px] leading-none text-white" style={{ background: e.tagColor }}>
                {e.tag}
              </span>
              {found(e) ? (
                <span className="font-title flex items-center gap-1 rounded-md bg-[#14532d] px-2 py-[3px] text-[10.5px] leading-none text-[#86efac]">
                  <Ico name="check" className="h-3 w-3" color="#86efac" /> DITEMUKAN
                </span>
              ) : (
                <span className="font-title flex items-center gap-1 rounded-md bg-white/10 px-2 py-[3px] text-[10.5px] leading-none text-white/70">
                  <Ico name="lock" className="h-3 w-3" color="rgba(255,255,255,.7)" /> STAGE {e.first || "?"}
                </span>
              )}
            </div>
            <div className="font-title mt-1.5 text-[20px] leading-tight text-white" style={STROKE("#140d2c", 1.5)}>
              {e.name.toUpperCase()}
            </div>
            <p className="font-ui mt-1 text-[12px] leading-snug text-white/80">{e.desc}</p>
            <div className="mt-1.5 flex flex-wrap gap-1">
              {[`Muncul: Stage ${e.first || "-"}`, ...e.facts].map((f) => (
                <span key={f} className="font-ui rounded-full bg-black/35 px-2 py-[2px] text-[10.5px] text-white/85">
                  {f}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ---------- tabs ---------- */}
      <div className="relative mx-3 mt-3 grid grid-cols-3 gap-2">
        {(
          [
            { t: "wheel", l: "RODA", n: CODEX_WHEELS.length, ic: "target", c: "from-[#4ade80] to-[#16a34a] border-[#0e5a26] shadow-[0_4px_0_#0e5a26]" },
            { t: "boss", l: "BOS", n: CODEX_BOSSES.length, ic: "skull", c: "from-[#ff7a7a] to-[#dc2626] border-[#5f0f0f] shadow-[0_4px_0_#5f0f0f]" },
            { t: "obstacle", l: "PISAU", n: CODEX_OBSTACLES.length, ic: "swords", c: "from-[#cbd5e1] to-[#64748b] border-[#1e293b] shadow-[0_4px_0_#1e293b]" },
          ] as const
        ).map((x, i) => {
          const on = tab === x.t;
          return (
            <button
              key={x.t}
              onPointerEnter={hoverSfx}
              onClick={() => switchTab(x.t, i)}
              className={`press font-title flex h-11 items-center justify-center gap-1.5 rounded-2xl border-2 text-[14px] text-white transition-all ${on ? `bg-gradient-to-b ${x.c}` : "border-white/10 bg-white/[.06] text-white/70 shadow-[0_4px_0_rgba(0,0,0,.4)]"}`}
            >
              <Ico name={x.ic} className="h-5 w-5" color={on ? "#ffffff" : "rgba(255,255,255,.7)"} />
              {x.l}
              <span className="rounded-md bg-black/30 px-1.5 text-[12px]">{x.n}</span>
            </button>
          );
        })}
      </div>

      {/* ---------- grid ---------- */}
      <div className="no-scrollbar smooth-scroll relative mt-3 min-h-0 flex-1 overflow-y-auto px-3 pb-6">
        <div key={tab} className="grid grid-cols-3 gap-2.5">
          {list.map((x, i) => {
            const on = i === sel;
            return (
              <div key={x.id} className="a in-pop" style={v({ "--d": `${Math.min(i, 12) * 35}ms`, "--dur": "420ms" })}>
                <button
                  onPointerEnter={hoverSfx}
                  onClick={() => pick(i)}
                  className={`press relative flex w-full flex-col items-center rounded-2xl border-2 px-1.5 pb-2 pt-2.5 transition-colors ${on ? "border-[#fde68a] bg-[#fde68a]/10" : "border-white/10 bg-white/[.05]"}`}
                  style={on ? { boxShadow: "0 0 0 2px rgba(253,230,138,.25), 0 0 16px rgba(253,230,138,.35)" } : undefined}
                >
                  <span className="absolute left-1.5 top-1.5 h-2.5 w-2.5 rounded-full ring-2 ring-black/30" style={{ background: x.tagColor }} />
                  {!found(x) && (
                    <span className="absolute right-1.5 top-1.5 grid h-5 w-5 place-items-center rounded-md bg-black/50">
                      <Ico name="lock" className="h-3 w-3" color="rgba(255,255,255,.8)" />
                    </span>
                  )}
                  <span className="grid aspect-square w-[82%] place-items-center">
                    <EntryArt e={x} />
                  </span>
                  <span
                    className={`font-title mt-1.5 flex min-h-[24px] w-full items-center justify-center break-words text-center leading-[1.05] ${on ? "text-[#fde68a]" : "text-white"}`}
                    style={{ fontSize: x.name.length <= 11 ? 11.5 : 10.5 }}
                  >
                    {x.name.toUpperCase()}
                  </span>
                  <span className="font-ui mt-0.5 text-[10px] leading-none text-white/50">Stage {x.first || "-"}</span>
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
