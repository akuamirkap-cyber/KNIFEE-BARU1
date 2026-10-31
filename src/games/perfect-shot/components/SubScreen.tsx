import type { CSSProperties, MouseEvent } from "react";
import type { Target } from "./MainMenu";
import { sfx } from "../audio/sfx";
import { useSound, hoverSfx } from "../audio/useSound";

const META: Record<Target, { title: string; icon: string; from: string; to: string; desc: string }> = {
  play: { title: "STAGE 4", icon: "🎯", from: "#1f6b3a", to: "#0b2414", desc: "Tap to shoot the target!" },
  quest: { title: "QUEST", icon: "🗺️", from: "#7a2a18", to: "#200a06", desc: "Complete missions to earn rewards" },
  gun: { title: "GUN SHOP", icon: "🔫", from: "#5b2a6b", to: "#170a1d", desc: "Unlock and upgrade your weapons" },
  ranks: { title: "RANKS", icon: "🏆", from: "#6b5a1a", to: "#1d1806", desc: "Global leaderboard" },
  ready: { title: "DAILY GIFT", icon: "🎁", from: "#1a4f6b", to: "#06161d", desc: "Your reward is ready to claim!" },
  setting: { title: "SETTING", icon: "⚙️", from: "#3a4650", to: "#0e1316", desc: "Adjust your preferences" },
};

const ITEMS: Record<Target, string[]> = {
  play: ["🎯 Hit 10 targets", "⏱️ 30 seconds", "⭐ Perfect bonus x2"],
  quest: ["Shoot 50 bottles — 💰 200", "Reach stage 10 — 💎 5", "Perfect x10 — 💰 500"],
  gun: ["Silver Falcon — Owned", "Neon Blaster — 💰 800", "Golden Eagle — 💎 25"],
  ranks: ["🥇 SniperKing — 9.820", "🥈 BulletQueen — 8.410", "🥉 You — 23"],
  ready: ["Day 1 — 💰 50 ✓", "Day 2 — 💰 100 ✓", "Day 3 — 💎 3 (Claim!)"],
  setting: ["🔊 Sound — ON", "🎵 Music — ON", "📳 Vibration — OFF"],
};

type Props = {
  target: Target;
  leaving: boolean;
  onBack: (e: MouseEvent<HTMLElement>) => void;
};

export function SubScreen({ target, leaving, onBack }: Props) {
  const m = META[target];
  const sound = useSound();
  const a = (inA: string, inD: number, outA: string, outD: number) => ({
    className: `a ${leaving ? outA : inA}`,
    style: { "--d": `${leaving ? outD : inD}ms` } as CSSProperties,
  });

  return (
    <div className={`absolute inset-0 overflow-hidden ${leaving ? "pointer-events-none" : ""}`}>
      <div
        {...a("in-bg", 0, "out-bg", 120)}
        className={`${a("in-bg", 0, "out-bg", 120).className} absolute inset-0`}
        style={{
          ...a("in-bg", 0, "out-bg", 120).style,
          background: `radial-gradient(ellipse at 50% 35%, ${m.from}, ${m.to})`,
        }}
      />

      <div className="relative flex h-full flex-col px-6 pt-5 pb-8">
        <div {...a("in-left", 150, "out-left", 0)}>
          <button
            onClick={onBack}
            onPointerEnter={hoverSfx}
            className="press font-ui flex items-center gap-2 rounded-xl bg-white/15 px-4 py-2 text-lg text-white ring-1 ring-white/25"
          >
            ◀ BACK
          </button>
        </div>

        <div className="mt-8 flex flex-col items-center text-center">
          <div {...a("in-gun", 250, "out-spin", 40)}>
            <div className="float text-8xl drop-shadow-[0_10px_20px_rgba(0,0,0,.5)]">{m.icon}</div>
          </div>
          <div {...a("in-slam", 500, "out-blast", 80)}>
            <h1
              className="font-title mt-6 text-5xl text-white"
              style={{ textShadow: "0 4px 0 rgba(0,0,0,.35), 0 10px 20px rgba(0,0,0,.4)" }}
            >
              {m.title}
            </h1>
          </div>
          <div {...a("in-up", 700, "out-fade", 60)}>
            <p className="font-ui mt-2 text-lg text-white/70">{m.desc}</p>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-3">
          {target === "setting" &&
            [
              { k: "Sound Effects", icon: "🔊", on: sound.sfx, set: (v: boolean) => sfx.setSfx(v) },
              { k: "Music", icon: "🎵", on: sound.music, set: (v: boolean) => sfx.setMusic(v) },
            ].map((s, i) => (
              <div key={s.k} {...a(i % 2 ? "in-right" : "in-left", 800 + i * 100, "out-down", i * 50)}>
                <button
                  onPointerEnter={hoverSfx}
                  onClick={() => {
                    const v = !s.on;
                    if (s.k === "Sound Effects") {
                      if (v) {
                        s.set(true);
                        sfx.toggle(true);
                      } else {
                        sfx.toggle(false);
                        window.setTimeout(() => s.set(false), 260);
                      }
                    } else {
                      sfx.toggle(v);
                      s.set(v);
                    }
                  }}
                  className="press font-ui flex w-full items-center justify-between rounded-2xl border border-white/15 bg-white/10 px-5 py-4 text-lg text-white shadow-lg backdrop-blur"
                >
                  <span>
                    {s.icon} {s.k}
                  </span>
                  <span
                    className={`relative h-8 w-14 rounded-full transition-colors duration-300 ${
                      s.on ? "bg-[#3fdc72]" : "bg-white/20"
                    }`}
                  >
                    <span
                      className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-all duration-300 ${
                        s.on ? "left-7" : "left-1"
                      }`}
                    />
                  </span>
                </button>
              </div>
            ))}
          {(target === "setting" ? ITEMS[target].slice(2) : ITEMS[target]).map((t, j) => {
            const i = target === "setting" ? j + 2 : j;
            return (
            <div key={t} {...a(i % 2 ? "in-right" : "in-left", 800 + i * 100, "out-down", i * 50)}>
              <div className="font-ui rounded-2xl border border-white/15 bg-white/10 px-5 py-4 text-lg text-white shadow-lg backdrop-blur">
                {t}
              </div>
            </div>
            );
          })}
        </div>

        <div {...a("in-pop", 1150, "out-down", 0)} className={`${a("in-pop", 1150, "out-down", 0).className} mt-auto`}>
          <button
            onClick={onBack}
            onPointerEnter={hoverSfx}
            className="press shine font-ui relative h-16 w-full rounded-2xl bg-gradient-to-b from-[#4cef6a] to-[#18b93a] text-2xl text-white shadow-[0_6px_0_#0c7a22,0_10px_20px_rgba(0,0,0,.4)]"
          >
            <span className="relative drop-shadow-[0_2px_0_rgba(0,0,0,.3)]">BACK TO MENU</span>
          </button>
        </div>
      </div>
    </div>
  );
}
