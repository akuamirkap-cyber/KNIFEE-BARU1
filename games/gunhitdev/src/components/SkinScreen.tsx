import { useState } from "react";
import WeaponPreview from "./WeaponPreview";
import { ArcadeButton, IconBack, IconBtn, IconMute, IconSound } from "./Ui";
import { WEAPONS, rgba } from "../game/weapons";
import { sfx } from "../game/audio";

interface Props {
  selected: string;
  muted: boolean;
  onBack: () => void;
  onSelect: (id: string) => void;
  onToggleSound: () => void;
}

const STATS: Record<string, { label: string; v: number }[]> = {
  keris: [
    { label: "Pesona", v: 92 },
    { label: "Kilau", v: 74 },
    { label: "Ledakan", v: 62 },
  ],
  yoyo: [
    { label: "Pesona", v: 78 },
    { label: "Kilau", v: 88 },
    { label: "Ledakan", v: 74 },
  ],
  diamond: [
    { label: "Pesona", v: 96 },
    { label: "Kilau", v: 100 },
    { label: "Ledakan", v: 82 },
  ],
  blackhole: [
    { label: "Pesona", v: 100 },
    { label: "Kilau", v: 70 },
    { label: "Ledakan", v: 94 },
  ],
  crystal: [
    { label: "Pesona", v: 88 },
    { label: "Kilau", v: 96 },
    { label: "Ledakan", v: 90 },
  ],
};

const TIER: Record<string, { label: string; color: string }> = {
  keris: { label: "PUSAKA", color: "#ffc247" },
  yoyo: { label: "LANGKA", color: "#38e8c8" },
  diamond: { label: "EPIK", color: "#7fd4ff" },
  blackhole: { label: "TERLARANG", color: "#c46bff" },
  crystal: { label: "LEGENDARIS", color: "#ff7ad9" },
};

export default function SkinScreen({ selected, muted, onBack, onSelect, onToggleSound }: Props) {
  const startIdx = Math.max(0, WEAPONS.findIndex((w) => w.id === selected));
  const [idx, setIdx] = useState(startIdx);
  const w = WEAPONS[idx];
  const active = selected === w.id;
  const tier = TIER[w.id];

  const act = () => {
    if (active) {
      sfx.ui();
      return;
    }
    sfx.select();
    onSelect(w.id);
  };

  return (
    <div className="arena-bg grain relative h-full w-full overflow-hidden">
      <div className="relative z-10 mx-auto flex h-full w-full max-w-[620px] flex-col px-4 pb-4 pt-4">
        <header className="anim-slide flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <IconBtn
              label="Kembali"
              onClick={() => {
                sfx.ui();
                onBack();
              }}
            >
              <IconBack />
            </IconBtn>
            <div className="leading-none">
              <h2 className="font-display text-[15px] tracking-wide text-white/92">GUDANG SENJATA</h2>
              <div className="mt-1 flex items-center gap-1.5 text-[9.5px] uppercase tracking-[0.24em] text-white/35">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-jade" />
                {WEAPONS.length} / {WEAPONS.length} terbuka semua
              </div>
            </div>
          </div>
          <IconBtn label="Suara" onClick={onToggleSound}>
            {muted ? <IconMute /> : <IconSound />}
          </IconBtn>
        </header>

        <div className="mt-3 min-h-0 flex-1 overflow-y-auto">
          {/* ---------- panggung utama ---------- */}
          <div
            key={w.id}
            className="anim-pop relative overflow-hidden rounded-[26px] border p-3"
            style={{
              borderColor: rgba(w.hue, 0.35),
              background: `radial-gradient(120% 90% at 50% 0%, ${rgba(w.hue, 0.18)} 0%, rgba(6,9,18,.92) 55%, rgba(4,6,13,.96) 100%)`,
              boxShadow: `0 24px 60px -30px ${rgba(w.hue, 0.7)}, inset 0 1px 0 rgba(255,255,255,.07)`,
            }}
          >
            <div className="flex items-start justify-between gap-3 px-1.5 pt-1">
              <div>
                <div className="text-[9.5px] uppercase tracking-[0.28em]" style={{ color: rgba(w.hue, 0.9) }}>
                  {w.origin}
                </div>
                <h3 className="font-display text-[clamp(20px,6vw,30px)] leading-none text-white/95">{w.name}</h3>
              </div>
              <div
                className="shrink-0 rounded-full border px-2.5 py-1 font-display text-[9px] tracking-[0.14em]"
                style={{
                  borderColor: rgba(tier.color, 0.45),
                  background: rgba(tier.color, 0.13),
                  color: tier.color,
                  boxShadow: `0 0 20px -6px ${tier.color}`,
                }}
              >
                {tier.label}
              </div>
            </div>

            <div className="relative mx-auto mt-1 h-[min(38vh,260px)] w-full">
              <WeaponPreview weapon={w} className="h-full w-full" maxScale={0.86} />
              {active && (
                <div className="pointer-events-none absolute right-1 top-1 rounded-full border border-jade/40 bg-jade/12 px-2.5 py-1 font-display text-[9px] tracking-[0.16em] text-jade">
                  DIPAKAI
                </div>
              )}
            </div>

            <p className="mt-1 px-1.5 text-[12.5px] leading-relaxed text-white/55">{w.desc}</p>

            <div className="mt-3 grid grid-cols-3 gap-2 px-1.5">
              {STATS[w.id].map((s) => (
                <div key={s.label}>
                  <div className="flex items-baseline justify-between">
                    <span className="text-[9.5px] uppercase tracking-[0.16em] text-white/38">{s.label}</span>
                    <span className="font-display text-[11px]" style={{ color: w.hue }}>
                      {s.v}
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/8">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${s.v}%`,
                        background: `linear-gradient(90deg, ${w.hue2}, ${w.hue})`,
                        boxShadow: `0 0 12px ${rgba(w.hue, 0.8)}`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ---------- tombol aksi ---------- */}
          <div className="mt-3">
            {active ? (
              <ArcadeButton tone="jade" onClick={act}>
                SEDANG DIPAKAI
              </ArcadeButton>
            ) : (
              <ArcadeButton onClick={act}>PAKAI {w.name}</ArcadeButton>
            )}
          </div>

          {/* ---------- strip koleksi ---------- */}
          <div className="mt-3 pb-1">
            <div className="mb-2 flex items-center justify-between px-1">
              <span className="text-[10px] uppercase tracking-[0.24em] text-white/35">koleksi lengkap</span>
              <span className="text-[10px] uppercase tracking-[0.18em] text-white/25">geser →</span>
            </div>
            <div className="-mx-4 flex gap-2.5 overflow-x-auto px-4 pb-2">
              {WEAPONS.map((it, i) => {
                const on = i === idx;
                const used = selected === it.id;
                return (
                  <button
                    key={it.id}
                    type="button"
                    onClick={() => {
                      sfx.ui();
                      setIdx(i);
                    }}
                    className="card-tilt relative h-[104px] w-[92px] shrink-0 overflow-hidden rounded-2xl border text-left"
                    style={{
                      borderColor: on ? rgba(it.hue, 0.75) : used ? rgba(it.hue, 0.35) : "rgba(255,255,255,.1)",
                      background: on
                        ? `linear-gradient(180deg, ${rgba(it.hue, 0.22)}, rgba(5,8,16,.95))`
                        : "rgba(255,255,255,.035)",
                      transform: on ? "translateY(-3px)" : undefined,
                      boxShadow: on ? `0 14px 30px -14px ${rgba(it.hue, 0.9)}` : undefined,
                    }}
                  >
                    <div className="absolute inset-x-0 top-0 h-[68px]">
                      <WeaponPreview weapon={it} demo={false} maxScale={0.34} className="h-full w-full" />
                    </div>
                    <div className="absolute inset-x-0 bottom-0 px-1.5 pb-1.5 pt-1">
                      <div className="truncate font-display text-[9px] leading-tight text-white/85">
                        {it.name.replace(" GUN", "")}
                      </div>
                      <div
                        className="mt-0.5 flex items-center gap-1 text-[8.5px] uppercase tracking-[0.1em]"
                        style={{ color: used ? "#38e8c8" : rgba(TIER[it.id].color, 0.75) }}
                      >
                        {used && <span className="inline-block h-1 w-1 rounded-full bg-jade" />}
                        {used ? "dipakai" : TIER[it.id].label}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
