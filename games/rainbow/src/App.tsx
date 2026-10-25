import { useState } from "react";
import GameStage from "./components/GameStage";
import { cn } from "./utils/cn";

const HOW_TO = [
  {
    icon: "🎯",
    title: "Tembak Roda",
    text: "Roda pelangi berputar terus. Tembak tepat di celah kosongnya.",
  },
  {
    icon: "🔺",
    title: "Senjata Tetap Atas",
    text: "Rainbow Gun tidak bisa diarahkan — murni soal timing & ritme.",
  },
  {
    icon: "✨",
    title: "Kejar Zona Emas",
    text: "Bidik busur emas di ring untuk PERFECT dan combo berlipat.",
  },
  {
    icon: "💥",
    title: "Jangan Bertabrakan",
    text: "Holy Pulse yang menyentuh segel energi di roda akan pecah = game over.",
  },
];

const SPINS = [
  { name: "Steady", desc: "Putaran konstan", color: "from-emerald-400 to-cyan-400" },
  { name: "Sway", desc: "Bolak-balik", color: "from-sky-400 to-indigo-400" },
  { name: "Pulse", desc: "Cepat lalu jeda", color: "from-amber-300 to-orange-400" },
  { name: "Ramp", desc: "Makin lama makin ngebut", color: "from-rose-400 to-fuchsia-500" },
  { name: "Chaos", desc: "Pola boss acak", color: "from-fuchsia-500 to-violet-500" },
];

const getSpecs = (w: "rainbow" | "blackhole") =>
  w === "rainbow"
    ? [
        ["Nama", "PRISM-07 Holy Railgun"],
        ["Tipe", "Angular Hand Cannon"],
        ["Ammo", "Holy Pulse ∞"],
        ["Arah", "Tetap 180° (atas)"],
        ["Efek", "Holy Iridescent Bloom"],
      ]
    : [
        ["Nama", "VOID-9X Black Hole"],
        ["Tipe", "Singularity Cannon"],
        ["Ammo", "Void Pulse ∞"],
        ["Arah", "Tetap 180° (atas)"],
        ["Efek", "Gravitational Lensing"],
      ];

export default function App() {
  const [weapon, setWeapon] = useState<"rainbow" | "blackhole">("rainbow");

  const toggleWeapon = () => setWeapon((w) => (w === "rainbow" ? "blackhole" : "rainbow"));

  return (
    <div className="relative h-full min-h-screen w-full overflow-hidden bg-[#05030c] text-white">
      {/* ambient background glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 top-0 h-[28rem] w-[28rem] rounded-full bg-fuchsia-700/20 blur-[120px]" />
        <div className="absolute -right-24 top-40 h-[26rem] w-[26rem] rounded-full bg-cyan-600/20 blur-[120px]" />
        <div className="absolute bottom-0 left-1/3 h-[24rem] w-[24rem] rounded-full bg-indigo-700/25 blur-[120px]" />
      </div>

      <div className="relative mx-auto flex h-screen max-w-[1500px] flex-col gap-5 p-3 sm:p-5 lg:flex-row lg:items-stretch lg:gap-7 lg:p-7">
        {/* ---------------- left panel ---------------- */}
        <aside className="hidden w-[19rem] shrink-0 flex-col gap-4 lg:flex">
          <div>
            <div className="mb-1 text-[10px] font-black uppercase tracking-[0.5em] text-white/40">
              2D Arcade
            </div>
            <h1 className="rainbow-text text-5xl font-black italic leading-none tracking-tighter">
              RAINBOW
              <br />
              GUN
            </h1>
            <p className="mt-3 text-[13px] leading-relaxed text-white/55">
              Versi <span className="font-bold text-white/80">Gun Hit</span> dari Knife Hit — sasaran
              tetap lingkaran berputar, tapi kali ini kamu menembak dengan senjata pelangi yang
              menghadap lurus ke atas.
            </p>
          </div>

          <div className="glass rounded-2xl p-4">
            <div className="mb-3 text-[10px] font-black uppercase tracking-[0.3em] text-white/45">
              Cara Main
            </div>
            <ul className="space-y-3">
              {HOW_TO.map((h) => (
                <li key={h.title} className="flex gap-3">
                  <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-white/10 text-sm">
                    {h.icon}
                  </span>
                  <div>
                    <div className="text-[13px] font-bold text-white/90">{h.title}</div>
                    <div className="text-[11.5px] leading-snug text-white/50">{h.text}</div>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="glass rounded-2xl p-4">
            <div className="mb-3 text-[10px] font-black uppercase tracking-[0.3em] text-white/45">
              Pola Putaran Roda
            </div>
            <div className="space-y-2">
              {SPINS.map((s) => (
                <div key={s.name} className="flex items-center gap-3">
                  <span
                    className={`h-6 w-1.5 rounded-full bg-gradient-to-b ${s.color} shadow-[0_0_10px_rgba(255,255,255,0.25)]`}
                  />
                  <div className="text-[12px] font-bold text-white/85">{s.name}</div>
                  <div className="text-[11px] text-white/45">{s.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* ---------------- game ---------------- */}
        <main className="min-h-0 min-w-0 flex-1">
          <GameStage weapon={weapon} />
        </main>

        {/* ---------------- right panel ---------------- */}
        <aside className="hidden w-[16.5rem] shrink-0 flex-col gap-4 xl:flex">
          <div className="glass relative overflow-hidden rounded-2xl p-4">
            <div className="animate-ring pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full border-2 border-dashed border-white/15" />
            <div className="text-[10px] font-black uppercase tracking-[0.3em] text-white/45">
              Senjata Terpasang
            </div>
            <button
              onClick={toggleWeapon}
              className="mt-2 flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-left transition hover:bg-white/10 active:scale-95"
            >
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.15em] text-white/50">
                  Model Senjata
                </div>
                <div className={cn(
                  "text-[11px] font-bold tabular-nums",
                  weapon === "rainbow"
                    ? "bg-gradient-to-r from-rose-400 via-amber-300 to-cyan-300 bg-clip-text text-transparent"
                    : "bg-gradient-to-r from-fuchsia-500 via-cyan-400 to-indigo-500 bg-clip-text text-transparent"
                )}>
                  {weapon === "rainbow" ? "PRISM-07" : "VOID-9X"}
                </div>
              </div>
              <div className="rounded-full border border-white/20 p-1">
                <div
                  className={cn(
                    "h-4 w-4 rounded-full transition-transform duration-300",
                    weapon === "rainbow"
                      ? "bg-rose-400 transform translate-x-0"
                      : "bg-cyan-400 transform translate-x-4"
                  )}
                />
              </div>
            </button>
            <div className="mt-3 space-y-1.5">
              {getSpecs(weapon).map(([k, v]) => (
                <div key={k} className="flex items-baseline justify-between gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/35">
                    {k}
                  </span>
                  <span className="text-right text-[11.5px] font-semibold text-white/75">{v}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 space-y-1.5">
              {getSpecs(weapon).map(([k, v]) => (
                <div key={k} className="flex items-baseline justify-between gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/35">
                    {k}
                  </span>
                  <span className="text-right text-[11.5px] font-semibold text-white/75">{v}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="glass rounded-2xl p-4">
            <div className="mb-2 text-[10px] font-black uppercase tracking-[0.3em] text-white/45">
              Kontrol
            </div>
            <div className="space-y-2 text-[11.5px] text-white/60">
              <div className="flex items-center justify-between">
                <span>Tembak</span>
                <span className="rounded-md bg-white/10 px-2 py-0.5 font-bold text-white/80">
                  Tap / Klik
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Tembak (keyboard)</span>
                <span className="rounded-md bg-white/10 px-2 py-0.5 font-bold text-white/80">
                  Space
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Ulangi</span>
                <span className="rounded-md bg-white/10 px-2 py-0.5 font-bold text-white/80">
                  ⟳
                </span>
              </div>
            </div>
          </div>

          <div className="glass rounded-2xl p-4">
            <div className="mb-2 text-[10px] font-black uppercase tracking-[0.3em] text-white/45">
              Skor
            </div>
            <ul className="space-y-1.5 text-[11.5px] text-white/60">
              <li className="flex justify-between">
                <span>Hit biasa</span>
                <span className="font-bold text-white/85">+12</span>
              </li>
              <li className="flex justify-between">
                <span>Perfect</span>
                <span className="font-bold text-amber-300">+40</span>
              </li>
              <li className="flex justify-between">
                <span>Combo ke-n</span>
                <span className="font-bold text-amber-300">+20 / chain</span>
              </li>
              <li className="flex justify-between">
                <span>Level clear</span>
                <span className="font-bold text-cyan-300">+60 × level</span>
              </li>
            </ul>
          </div>

          <div className="mt-auto text-center text-[10px] font-semibold uppercase tracking-[0.25em] text-white/25">
            {weapon === "rainbow" ? "PRISM-07 Rainbow Gun" : "VOID-9X Black Hole Gun"} · canvas 2D
          </div>
        </aside>
      </div>
    </div>
  );
}
