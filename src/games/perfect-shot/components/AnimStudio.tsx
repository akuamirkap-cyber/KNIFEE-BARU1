import { useState, type CSSProperties } from "react";
import {
  animStore,
  GROUPS,
  SPEEDS,
  STYLES,
  STYLE_MAP,
  useAnimCfg,
  animClass,
  type GroupId,
  type Mode,
  type Plan,
  type StyleId,
} from "../anim/presets";
import { sfx } from "../audio/sfx";
import { hoverSfx } from "../audio/useSound";

const CLASSIC: Record<GroupId, [string, string]> = {
  gun: ["in-gun", "out-spin"],
  buttons: ["in-left", "out-left"],
  nav: ["in-pop", "out-down"],
  title: ["in-letter", "out-letter"],
};
const SIZE: Record<GroupId, number> = { gun: 1, buttons: 0.7, nav: 0.45, title: 0.5 };

const MODES: { id: Mode; label: string; icon: string; desc: string }[] = [
  { id: "fixed", label: "FIXED", icon: "📌", desc: "Selalu memakai gaya yang dipilih" },
  { id: "auto", label: "AUTO", icon: "🎲", desc: "Gaya berganti otomatis setiap masuk menu" },
  { id: "mix", label: "MIX", icon: "🎨", desc: "Tiap elemen dapat gaya acak yang berbeda" },
];

type Props = {
  closing: boolean;
  plan: Plan;
  onClose: () => void;
  onPreviewIn: () => void;
  onPreviewCycle: () => void;
};

function Preview({ group, style, k }: { group: GroupId; style: StyleId; k: number }) {
  const cls = animClass(style, "in", CLASSIC[group]);
  const content =
    group === "gun" ? (
      <span className="text-3xl">🔫</span>
    ) : group === "buttons" ? (
      <span className="font-ui rounded-lg bg-gradient-to-b from-[#4cef6a] to-[#18b93a] px-3 py-1 text-sm text-white shadow-[0_3px_0_#0c7a22]">
        PLAY
      </span>
    ) : group === "nav" ? (
      <span className="grid h-9 w-9 place-items-center rounded-xl border border-white/25 bg-white/15 text-lg">🎁</span>
    ) : (
      <span className="font-title text-2xl text-[#ffd23f]" style={{ textShadow: "0 2px 0 #9c5a10" }}>
        S
      </span>
    );
  return (
    <span
      key={k}
      className={`a ${cls} inline-block`}
      style={{ "--d": "0ms", "--dur": style === "combo" ? "3000ms" : group === "gun" ? "900ms" : "700ms", "--sx": 1 } as CSSProperties}
    >
      {content}
    </span>
  );
}

export function AnimStudio({ closing, plan, onClose, onPreviewIn, onPreviewCycle }: Props) {
  const cfg = useAnimCfg();
  const [tab, setTab] = useState<GroupId>("gun");
  const [pk, setPk] = useState<Record<string, number>>({});
  const g = cfg.groups[tab];

  const current: StyleId[] =
    tab === "gun" ? [plan.gun] : tab === "buttons" ? plan.buttons : tab === "nav" ? plan.nav : plan.title;

  const choose = (id: StyleId) => {
    animStore.setGroup(tab, { style: id, mode: "fixed" });
    setPk((p) => ({ ...p, [id]: (p[id] ?? 0) + 1 }));
    sfx.tap(0, 1200);
    sfx.preview(id, SIZE[tab]);
  };

  const setMode = (m: Mode) => {
    animStore.setGroup(tab, { mode: m });
    sfx.toggle(m !== "fixed");
    if (m !== "fixed") sfx.sparkle(0.05, 5, 0.03);
  };

  return (
    <div className="absolute inset-0 z-[60] flex flex-col justify-end">
      <button
        aria-label="close"
        onClick={onClose}
        className={`absolute inset-0 bg-black/55 backdrop-blur-[2px] ${closing ? "studio-fade-out" : "studio-fade-in"}`}
      />

      <div
        className={`relative flex max-h-[86%] flex-col rounded-t-[28px] border-t border-[#3fdc72]/40 bg-gradient-to-b from-[#132a30]/98 to-[#081316]/98 shadow-[0_-20px_60px_rgba(0,0,0,.6)] ${
          closing ? "studio-sheet-out" : "studio-sheet-in"
        }`}
      >
        <div className="mx-auto mt-2.5 h-1.5 w-12 rounded-full bg-white/25" />

        {/* header */}
        <div className="flex items-center justify-between px-5 pt-3 pb-2">
          <div>
            <h2 className="font-title text-xl tracking-wide text-white">
              🎬 ANIMATION <span className="text-[#ffd23f]">STUDIO</span>
            </h2>
            <p className="font-ui text-xs text-white/50">Atur animasi masuk & keluar tiap elemen</p>
          </div>
          <button
            onClick={onClose}
            onPointerEnter={hoverSfx}
            className="press grid h-9 w-9 place-items-center rounded-full bg-white/10 text-white ring-1 ring-white/20"
          >
            ✕
          </button>
        </div>

        <div className="no-scrollbar flex-1 overflow-y-auto px-5 pb-3">
          {/* quick actions */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { l: "AUTO SEMUA", i: "🎲", f: () => animStore.setAllMode("auto"), c: "from-[#8b5cf6] to-[#6d28d9] shadow-[0_4px_0_#4c1d95]" },
              { l: "MIX SEMUA", i: "🎨", f: () => animStore.setAllMode("mix"), c: "from-[#f472b6] to-[#db2777] shadow-[0_4px_0_#9d174d]" },
              { l: "RESET", i: "↺", f: () => animStore.reset(), c: "from-[#64748b] to-[#475569] shadow-[0_4px_0_#1e293b]" },
            ].map((b) => (
              <button
                key={b.l}
                onPointerEnter={hoverSfx}
                onClick={() => {
                  b.f();
                  sfx.confirm();
                  if (b.l !== "RESET") sfx.sparkle(0.1, 6, 0.03);
                }}
                className={`press font-ui flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-b py-2.5 text-sm text-white ${b.c}`}
              >
                <span>{b.i}</span>
                {b.l}
              </button>
            ))}
          </div>

          {/* speed */}
          <div className="mt-4">
            <div className="font-title mb-1.5 text-xs tracking-widest text-white/60">⚡ KECEPATAN</div>
            <div className="grid grid-cols-5 gap-1.5 rounded-xl bg-black/30 p-1">
              {SPEEDS.map((sp) => (
                <button
                  key={sp}
                  onPointerEnter={hoverSfx}
                  onClick={() => {
                    animStore.setSpeed(sp);
                    sfx.tap(0, 600 + sp * 400);
                  }}
                  className={`font-ui rounded-lg py-1.5 text-sm transition-all ${
                    cfg.speed === sp ? "bg-[#ffd23f] text-[#3a2a00] shadow-[0_2px_0_#9c5a10]" : "text-white/70 hover:bg-white/10"
                  }`}
                >
                  {sp}x
                </button>
              ))}
            </div>
          </div>

          {/* group tabs */}
          <div className="mt-4 grid grid-cols-4 gap-1.5">
            {GROUPS.map((gr) => {
              const gc = cfg.groups[gr.id];
              const active = tab === gr.id;
              return (
                <button
                  key={gr.id}
                  onPointerEnter={hoverSfx}
                  onClick={() => {
                    setTab(gr.id);
                    sfx.tap(0, 950);
                  }}
                  className={`press relative flex flex-col items-center gap-0.5 rounded-xl border px-1 py-2 transition-colors ${
                    active ? "border-[#3fdc72] bg-[#3fdc72]/15" : "border-white/10 bg-white/5"
                  }`}
                >
                  <span className="text-xl">{gr.icon}</span>
                  <span className={`font-ui text-[10px] leading-tight ${active ? "text-[#3fdc72]" : "text-white/70"}`}>
                    {gr.name}
                  </span>
                  <span className="font-title absolute -top-1.5 -right-1 rounded-full bg-black/70 px-1.5 text-[9px] text-white ring-1 ring-white/20">
                    {gc.mode === "fixed" ? STYLE_MAP[gc.style].icon : gc.mode === "auto" ? "🎲" : "🎨"}
                  </span>
                </button>
              );
            })}
          </div>

          {/* mode */}
          <div className="mt-4">
            <div className="font-title mb-1.5 text-xs tracking-widest text-white/60">🔁 MODE GANTI ANIMASI</div>
            <div className="grid grid-cols-3 gap-1.5 rounded-xl bg-black/30 p-1">
              {MODES.map((m) => {
                const disabled = m.id === "mix" && tab === "gun";
                return (
                  <button
                    key={m.id}
                    disabled={disabled}
                    onPointerEnter={hoverSfx}
                    onClick={() => setMode(m.id)}
                    className={`font-ui rounded-lg py-2 text-sm transition-all disabled:opacity-30 ${
                      g.mode === m.id ? "bg-[#3fdc72] text-[#06260f] shadow-[0_2px_0_#0c7a22]" : "text-white/70 hover:bg-white/10"
                    }`}
                  >
                    {m.icon} {m.label}
                  </button>
                );
              })}
            </div>
            <p className="font-ui mt-1.5 text-xs text-white/50">{MODES.find((m) => m.id === g.mode)!.desc}</p>
          </div>

          {/* styles */}
          <div className="mt-4">
            <div className="font-title mb-1.5 text-xs tracking-widest text-white/60">✨ GAYA ANIMASI</div>
            <div className="grid grid-cols-3 gap-2">
              {STYLES.map((st, i) => {
                const selected = g.mode === "fixed" && g.style === st.id;
                const playing = g.mode !== "fixed" && current.includes(st.id);
                return (
                  <button
                    key={st.id}
                    onPointerEnter={hoverSfx}
                    onClick={() => choose(st.id)}
                    className={`press relative flex flex-col items-center overflow-hidden rounded-2xl border p-1.5 text-center transition-colors ${
                      selected
                        ? "border-[#ffd23f] bg-[#ffd23f]/12 shadow-[0_0_16px_rgba(255,210,63,.25)]"
                        : "border-white/10 bg-white/[.04]"
                    }`}
                  >
                    <div className="relative grid h-16 w-full place-items-center overflow-hidden rounded-xl bg-[radial-gradient(circle,#2f5459,#0e1d21)]">
                      <Preview
                        key={`${tab}-${st.id}-${pk[st.id] ?? 0}`}
                        group={tab}
                        style={st.id}
                        k={(pk[st.id] ?? 0) + i}
                      />
                    </div>
                    <span className="font-ui mt-1.5 text-[13px] leading-none text-white">
                      {st.icon} {st.name}
                    </span>
                    <span className="mt-0.5 line-clamp-2 min-h-[22px] text-[9.5px] leading-tight text-white/45">{st.desc}</span>
                    {selected && (
                      <span className="font-title absolute top-1 right-1 rounded-full bg-[#ffd23f] px-1.5 text-[9px] text-[#3a2a00]">
                        ✓
                      </span>
                    )}
                    {playing && (
                      <span className="font-title absolute top-1 left-1 rounded-full bg-[#3fdc72] px-1.5 text-[8px] text-[#06260f]">
                        ▶ AKTIF
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* footer */}
        <div className="grid grid-cols-2 gap-3 border-t border-white/10 px-5 pt-3 pb-5">
          <button
            onPointerEnter={hoverSfx}
            onClick={onPreviewCycle}
            className="press font-ui relative h-12 rounded-xl bg-gradient-to-b from-[#ff6a3d] to-[#e0331e] text-base text-white shadow-[0_4px_0_#9c1f12]"
          >
            ⇄ KELUAR + MASUK
          </button>
          <button
            onPointerEnter={hoverSfx}
            onClick={onPreviewIn}
            className="press shine font-ui relative h-12 rounded-xl bg-gradient-to-b from-[#4cef6a] to-[#18b93a] text-base text-white shadow-[0_4px_0_#0c7a22]"
          >
            ▶ PREVIEW MASUK
          </button>
        </div>
      </div>
    </div>
  );
}
