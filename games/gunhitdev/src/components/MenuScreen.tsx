import { useState } from "react";
import WeaponPreview from "./WeaponPreview";
import { ArcadeButton, CoinPill, DecoRing, IconBolt, IconBtn, IconCrown, IconMute, IconPlay, IconSound, IconTarget, IconTrophy, StatChip } from "./Ui";
import type { Weapon } from "../game/weapons";
import { sfx } from "../game/audio";

interface Props {
  weapon: Weapon;
  coins: number;
  best: number;
  muted: boolean;
  onPlay: () => void;
  onSkins: () => void;
  onToggleSound: () => void;
}

export default function MenuScreen({ weapon, coins, best, muted, onPlay, onSkins, onToggleSound }: Props) {
  const [how, setHow] = useState(false);

  return (
    <div className="arena-bg grain relative h-full w-full overflow-hidden">
      <div className="relative z-10 mx-auto flex h-full w-full max-w-[560px] flex-col px-5 pb-4 pt-4">
        {/* ---------- header ---------- */}
        <header className="anim-slide flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="grid h-9 w-9 place-items-center rounded-lg border border-gold/40 bg-gold/10 text-gold">
              <IconTarget className="h-5 w-5" />
            </div>
            <div className="leading-none">
              <div className="font-display text-[13px] tracking-wide text-white/90">GUN HIT</div>
              <div className="mt-1 text-[9.5px] uppercase tracking-[0.26em] text-white/35">arcade tap shooter</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <CoinPill amount={coins} />
            <IconBtn label={muted ? "Nyalakan suara" : "Matikan suara"} onClick={onToggleSound}>
              {muted ? <IconMute /> : <IconSound />}
            </IconBtn>
          </div>
        </header>

        {/* ---------- hero: logo di dalam lingkaran berputar ---------- */}
        <div className="relative mt-1 flex min-h-0 flex-1 items-center justify-center">
          <div className="pointer-events-none absolute inset-0 flex items-start justify-center overflow-visible">
            <div className="anim-floaty relative -mt-[1%] w-[min(78vw,340px)]">
              <DecoRing size="100%" speed={26} tint={weapon.hue} bolts={5} />
            </div>
          </div>

          <div className="pointer-events-none relative z-10 -mt-8 text-center">
            <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.42em] text-white/40">tap • tembak • tancapkan</div>
            <h1
              className="font-display text-[clamp(46px,15.5vw,74px)] leading-[0.86] text-[#ffd979]"
              style={{
                WebkitTextStroke: "4px #160c04",
                paintOrder: "stroke fill",
                textShadow:
                  "0 3px 0 #b06a12, 0 6px 0 #7c4708, 0 10px 22px rgba(0,0,0,.75), 0 0 44px rgba(255,178,60,.35)",
              }}
            >
              GUN
              <br />
              HIT
            </h1>
          </div>

          {/* senjata terpilih, hidup & menembak */}
          <div className="absolute inset-x-0 bottom-0 z-20 h-[52%]">
            <WeaponPreview weapon={weapon} className="h-full w-full" maxScale={0.8} />
          </div>
        </div>

        {/* ---------- aksi ---------- */}
        <div className="anim-slide z-30 mt-3 space-y-2.5" style={{ animationDelay: "80ms" }}>
          <button
            type="button"
            onClick={() => {
              sfx.ui();
              onSkins();
            }}
            className="btn-3d flex w-full items-center justify-between gap-2 rounded-xl border px-3 py-2 text-left backdrop-blur-sm"
            style={{
              borderColor: `${weapon.hue}44`,
              background: `linear-gradient(90deg, ${weapon.hue}1f, rgba(0,0,0,.45) 60%)`,
            }}
          >
            <span className="flex min-w-0 items-center gap-2.5">
              <span
                className="grid h-7 w-7 shrink-0 place-items-center rounded-lg"
                style={{ background: `${weapon.hue}22`, color: weapon.hue }}
              >
                <IconBolt className="h-3.5 w-3.5" />
              </span>
              <span className="min-w-0">
                <span className="block text-[9px] uppercase tracking-[0.22em] text-white/35">senjata terpakai</span>
                <span className="block truncate font-display text-[12.5px] leading-tight" style={{ color: weapon.hue }}>
                  {weapon.name}
                </span>
              </span>
            </span>
            <span className="shrink-0 text-[10px] uppercase tracking-[0.16em] text-white/45">
              5/5 terbuka · ganti
            </span>
          </button>
          <ArcadeButton
            onClick={() => {
              sfx.ui();
              onPlay();
            }}
            className="py-4 text-lg anim-ring"
          >
            <IconPlay className="h-5 w-5" />
            MAIN — LEVEL {best}
          </ArcadeButton>
          <div className="grid grid-cols-2 gap-2.5">
            <ArcadeButton tone="ghost" onClick={() => { sfx.ui(); onSkins(); }}>
              <IconBolt className="h-4 w-4 text-gold" />
              GUDANG SENJATA
            </ArcadeButton>
            <ArcadeButton tone="ghost" onClick={() => { sfx.ui(); setHow((v) => !v); }}>
              <IconCrown className="h-4 w-4 text-jade" />
              CARA MAIN
            </ArcadeButton>
          </div>

          {how && (
            <div className="anim-pop rounded-2xl border border-white/12 bg-black/55 p-3.5 backdrop-blur-md">
              <ol className="space-y-2 text-[12.5px] leading-snug text-white/70">
                {[
                  ["TAP di mana saja untuk menembak. Senjatamu tidak pernah bergerak.", "#ffc247"],
                  ["Peluru menancap di titik lingkaran yang sedang menghadap ke bawah.", "#38e8c8"],
                  ["Kena paku penghalang merah = GAME OVER. Habiskan semua peluru = level selesai.", "#ff4d6a"],
                  ["Tiap 5 level muncul BOSS: putaran lebih cepat dan pola kacau.", "#c46bff"],
                ].map(([txt, c], i) => (
                  <li key={i} className="flex gap-2.5">
                    <span
                      className="mt-[1px] grid h-5 w-5 shrink-0 place-items-center rounded-md font-display text-[10px] text-black"
                      style={{ background: c as string }}
                    >
                      {i + 1}
                    </span>
                    <span>{txt}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* ---------- statistik ---------- */}
          <div className="grid grid-cols-3 gap-2">
            <StatChip icon={<IconTrophy className="h-4 w-4" />} label="Terjauh" value={`LV ${best}`} />
            <StatChip icon={<IconBolt className="h-4 w-4" />} label="Senjata" value="5 / 5" accent="#38e8c8" />
            <StatChip icon={<IconCrown className="h-4 w-4" />} label="Boss" value="Tiap 5 LV" accent="#c46bff" />
          </div>
        </div>
      </div>
    </div>
  );
}
