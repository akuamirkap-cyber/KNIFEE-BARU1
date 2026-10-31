import { useCallback, useEffect, useRef, useState, type MouseEvent } from "react";
import { MainMenu, type Target } from "./components/MainMenu";
import { SubScreen } from "./components/SubScreen";
import { Splash } from "./components/Splash";
import { AnimStudio } from "./components/AnimStudio";
import { TransitionOverlay, type OverlayPhase, type OverlayVariant } from "./components/TransitionOverlay";
import { GunShop } from "./components/GunShop";
import { ARMORY_SHUTTER, SHOP_IN, SHOP_OUT } from "./shop/timeline";
import { Achievement } from "./components/Achievement";
import { QuestMap } from "./components/QuestMap";
import { ACHS, ACH_IN, ACH_OUT, GIFT_STOPS, MILESTONES } from "./ach/data";
import { QUEST_IN, QUEST_OUT, STAGES } from "./quest/data";
import { GamePlay } from "./components/GamePlay";
import { Codex } from "./components/Codex";
import { Leaderboard } from "./components/Leaderboard";
import { LB_IN, LB_OUT } from "./rank/data";
import { Settings } from "./components/Settings";
import { levelConfig, PLAY_IN, PLAY_OUT } from "./play/levels";
import { bumpMenuVisit, settings, useSettings } from "./theme/themes";

/** menu entrance speed after a quick return (smaller = faster) */
const QUICK_MENU_K = 0.45;
import { OVERLAY_RATE } from "./anim/speed";
import { GunFlight, gameGunSlot, type Rect } from "./components/GunFlight";

/** menu gun flies into its game slot in this time */
const FLIGHT_MS = 780;
/** game content waits this long inside the scope before the lens opens */
const PLAY_HOLD = 600;
import { ToolChip } from "./ui/GameIcons";
import { game, useGame } from "./game/store";
import { sfx } from "./audio/sfx";
import { useSound, hoverSfx } from "./audio/useSound";
import { animStore, publishMenuPlan, resolvePlan, STYLE_MAP, type Plan, type StyleId } from "./anim/presets";

type Screen = "splash" | "menu" | Target;
type Leaving = Screen | "preview" | null;

// Timeline (ms)
const EXIT_MS = 620;
const COVER_MS = 460;
const HOLD_MS = 280;
const REVEAL_MS = 620;
const MENU_ENTER_MS = 2000;

/** every page has its own themed transition */
const VARIANT_T: Record<OverlayVariant, { cover: number; hold: number; reveal: number }> = {
  iris: { cover: COVER_MS, hold: HOLD_MS, reveal: REVEAL_MS },
  shutter: ARMORY_SHUTTER, // steel blast doors framing the Armory
  ribbon: { cover: 560, hold: 420, reveal: 720 }, // achievement: royal banners + medal stamp
  cloud: { cover: 600, hold: 400, reveal: 820 }, // quest: dive through clouds onto the map
  scope: { cover: 620, hold: 600, reveal: 680 }, // gameplay: scope aims at the target spot (game mounts after cover)
  wrap: { cover: 640, hold: 560, reveal: 820 }, // gift: wrapping paper + bow, then torn open
  podium: { cover: 600, hold: 520, reveal: 700 }, // leaderboard: podium blocks rise, gold medal stamps
  fade: { cover: 200, hold: 60, reveal: 260 }, // quick dip to black (quest → game)
  none: { cover: 0, hold: 0, reveal: 0 }, // seamless (menu → game: the gun simply drops into place)
};
const THEME: Partial<Record<Screen, OverlayVariant>> = { gun: "shutter", ranks: "podium", quest: "cloud", ready: "wrap" };
/** pages that may use the quick "back to menu" transition (toggle in Settings) */
const QUICK_BACK: Screen[] = ["gun", "quest", "ready", "ranks"];
const variantFor = (from: Screen, to: Screen): OverlayVariant => {
  if (to === "play") return "scope";
  if (from === "play") return to === "quest" ? "cloud" : "fade";
  return THEME[to] ?? THEME[from] ?? "iris";
};
/** overlays that run at OVERLAY_RATE */
const FAST = (v: OverlayVariant) => v !== "fade" && v !== "none" && v !== "scope";

const LABELS: Record<Screen, string> = {
  splash: "",
  menu: "MENU",
  play: "LOADING",
  quest: "QUEST",
  gun: "ARMORY",
  ranks: "PERINGKAT",
  ready: "ACHIEVEMENT",
  setting: "SETTING",
};

function planSummary(p: Plan): string | null {
  const cfg = animStore.get();
  const parts: string[] = [];
  const fmt = (arr: StyleId[]) => {
    const u = [...new Set(arr)];
    return u.length > 2 ? `${u.slice(0, 3).map((s) => STYLE_MAP[s].icon).join("")} Mix` : u.map((s) => `${STYLE_MAP[s].icon} ${STYLE_MAP[s].name}`).join(" / ");
  };
  if (cfg.groups.gun.mode !== "fixed") parts.push(`🔫 ${fmt([p.gun])}`);
  if (cfg.groups.buttons.mode !== "fixed") parts.push(`🎮 ${fmt(p.buttons)}`);
  if (cfg.groups.nav.mode !== "fixed") parts.push(`📱 ${fmt(p.nav)}`);
  if (cfg.groups.title.mode !== "fixed") parts.push(`🔠 ${fmt(p.title)}`);
  return parts.length ? parts.join("  ·  ") : null;
}

export default function App() {
  const [screen, setScreen] = useState<Screen>("splash");
  const [leaving, setLeaving] = useState<Leaving>(null);
  const [overlay, setOverlay] = useState<OverlayPhase>("idle");
  const [variant, setVariant] = useState<OverlayVariant>("iris");
  const [origin, setOrigin] = useState({ x: 50, y: 50 });
  const [label, setLabel] = useState("MENU");
  const [menuReady, setMenuReady] = useState(false);
  const [enterKey, setEnterKey] = useState(0);
  const [plan, setPlan] = useState<Plan>(() => resolvePlan(animStore.get()));
  const [studio, setStudio] = useState<"closed" | "open" | "closing">("closed");
  const [toast, setToast] = useState<{ text: string; id: number } | null>(null);
  const planRef = useRef(plan);
  const busy = useRef(false);
  const screenRef = useRef<Screen>("splash");
  const timers = useRef<number[]>([]);
  const phoneRef = useRef<HTMLDivElement>(null);
  const sound = useSound();
  const wallet = useGame();
  const uiSet = useSettings();
  const [playStage, setPlayStage] = useState(4);
  const [playSeamless, setPlaySeamless] = useState(false);
  const [rate, setRate] = useState(1);
  const [flight, setFlight] = useState<{ from: Rect; to: Rect; dur: number } | null>(null);
  const allMuted = !sound.sfx && !sound.music;

  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  };

  useEffect(() => {
    const t = timers.current;
    return () => t.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    publishMenuPlan(planRef.current);
  }, []);

  useEffect(() => {
    if (screen !== "menu") return;
    setMenuReady(false);
    const id = window.setTimeout(() => setMenuReady(true), (MENU_ENTER_MS - 300) * planRef.current.k);
    return () => clearTimeout(id);
  }, [screen, enterKey]);

  /** resolve a fresh plan (AUTO / MIX re-roll here) */
  const nextPlan = () => resolvePlan(animStore.get(), planRef.current);

  /** apply a plan + remount the menu so the entrance replays */
  const enterMenu = (p: Plan) => {
    bumpMenuVisit();
    publishMenuPlan(p);
    planRef.current = p;
    setPlan(p);
    setEnterKey((k) => k + 1);
    const text = planSummary(p);
    if (text) {
      const id = Date.now();
      later(() => setToast({ text, id }), 1400 * p.k);
      later(() => setToast((t) => (t?.id === id ? null : t)), 1400 * p.k + 2600);
    }
  };

  const go = useCallback((to: Screen, e?: MouseEvent<HTMLElement>, stageArg?: number) => {
    if (busy.current) return;
    busy.current = true;
    const from = screenRef.current;
    const playN = Math.min(100, stageArg ?? game.get().stage);

    if (e && phoneRef.current) {
      const p = phoneRef.current.getBoundingClientRect();
      const b = e.currentTarget.getBoundingClientRect();
      const cx = from === "splash" ? p.left + p.width / 2 : b.left + b.width / 2;
      const cy = from === "splash" ? p.top + p.height / 2 : b.top + b.height / 2;
      setOrigin({ x: ((cx - p.left) / p.width) * 100, y: ((cy - p.top) / p.height) * 100 });
    }

    if (from === "splash") {
      sfx.init();
      sfx.startMusic();
    }
    const cur = planRef.current;
    const quick = to === "menu" && QUICK_BACK.includes(from) && settings.get().quickBack;
    const vr = quick ? "fade" : variantFor(from, to);
    const lead = quick
      ? 160
      :
      from === "splash"
        ? 260
        : from === "menu"
          ? to === "play"
            ? 180
            : Math.max(300, 380 * cur.k)
          : from === "gun"
            ? SHOP_OUT.total
            : from === "ranks"
              ? LB_OUT.total
              : from === "ready"
                ? ACH_OUT.total
              : from === "play"
                ? PLAY_OUT.total
              : from === "quest"
                ? to === "play"
                  ? 260
                  : QUEST_OUT.total
                : EXIT_MS - 120;
    const R = FAST(vr) ? OVERLAY_RATE : 1;
    const kk = 1 / R;
    const cover = Math.round(VARIANT_T[vr].cover / R);
    const hold = Math.round(VARIANT_T[vr].hold / R);
    const reveal = Math.round(VARIANT_T[vr].reveal / R);
    const swap = lead + cover + hold;
    // with the scope, the game mounts as soon as the lens has closed, so the target drops INSIDE the lens
    const mountAt = vr === "scope" ? lead + cover : swap;
    const fresh = to === "menu" ? nextPlan() : cur;
    // quick return: the menu entrance itself also plays faster
    const upcoming = quick ? { ...fresh, k: fresh.k * QUICK_MENU_K } : fresh;

    // ---- exit sound (current page) ----
    if (from === "splash") sfx.startTap();
    else if (from === "menu") sfx.menuExit(to, 0, { ...cur, k: cur.k * 0.6 });
    else if (from === "gun") sfx.shopExit(0);
    else if (quick) sfx.back(0);
    else if (from === "ranks") sfx.lbExit(0);
    else if (from === "quest") sfx.questExit(0);
    else if (from === "play") sfx.playExit(0);
    else if (from === "ready") sfx.achExit(0);
    else sfx.subExit();

    // ---- themed transition sound ----
    if (vr === "shutter") {
      sfx.shutterClose(lead / 1000, (cover * 0.8) / 1000, kk);
      sfx.shutterOpen(swap / 1000, kk);
    } else if (vr === "ribbon") {
      sfx.ribbonClose(lead / 1000, kk);
      sfx.ribbonOpen(swap / 1000, kk);
    } else if (vr === "podium") {
      sfx.podiumClose(lead / 1000, kk);
      sfx.podiumOpen(swap / 1000, kk);
    } else if (vr === "wrap") {
      sfx.wrapClose(lead / 1000, kk);
      sfx.wrapOpen(swap / 1000, kk);
    } else if (vr === "cloud") {
      sfx.cloudClose(lead / 1000, kk);
      sfx.cloudOpen(swap / 1000, kk);
    } else if (vr === "scope") {
      sfx.scopeAim(lead / 1000);
      sfx.scopeOpen(swap / 1000);
    } else if (vr === "fade") {
      sfx.whoosh(lead / 1000, 0.3, 2400, 400, 0.1);
    } else if (vr === "iris") {
      sfx.irisClose(lead / 1000, kk);
      sfx.scopeLock((lead + cover - 50) / 1000, kk);
      sfx.irisOpen(swap / 1000, kk);
    }

    // ---- enter sound (next page) ----
    if (to === "menu") sfx.menuEnter(swap / 1000, upcoming);
    else if (to === "gun") sfx.shopEnter(swap / 1000, SHOP_IN);
    else if (to === "ready") {
      const st = game.get();
      const ready = ACHS.filter((a) => !st.claimed.includes(a.id) && a.progress >= a.goal).length;
      sfx.achEnter(swap / 1000, ACH_IN, ready);
    } else if (to === "quest") sfx.questEnter(swap / 1000, QUEST_IN);
    else if (to === "ranks") sfx.lbEnter(swap / 1000, LB_IN);
    else if (to === "play") {
      const lc = levelConfig(playN);
      sfx.playEnter(mountAt / 1000, PLAY_IN, lc.boss, lc.ammo, { gun: from !== "menu", offset: PLAY_HOLD });
    } else sfx.subEnter(swap / 1000);

    setVariant(vr);
    setLabel(to === "play" ? `STAGE ${playN} · ${STAGES[playN - 1].name.toUpperCase()}` : LABELS[to]);
    if (to === "play") {
      setPlayStage(playN);
      setPlaySeamless(from === "menu");
      setOrigin({ x: 50, y: 29 }); // scope aims at the target
      if (from === "menu" && phoneRef.current) {
        const P = phoneRef.current.getBoundingClientRect();
        const g = document.querySelector("[data-menu-gun] svg")?.getBoundingClientRect();
        if (g) setFlight({ from: { x: g.left - P.left, y: g.top - P.top, w: g.width, h: g.height }, to: gameGunSlot(P.width, P.height), dur: FLIGHT_MS });
      }
    }
    setLeaving(to);
    setToast(null);
    setRate(R);
    if (vr !== "none") later(() => setOverlay("cover"), lead);
    later(() => {
      screenRef.current = to;
      setScreen(to);
      setLeaving(null);
      if (to === "menu") enterMenu(upcoming);
      else setEnterKey((k) => k + 1);
      if (vr !== "none" && mountAt === swap) setOverlay("reveal");
    }, mountAt);
    if (mountAt !== swap) later(() => setOverlay("reveal"), swap);
    later(() => {
      setOverlay("idle");
      setFlight(null);
      busy.current = false;
    }, swap + reveal);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------------- codex (kamus game) ---------------- */
  const [codex, setCodex] = useState<"closed" | "open" | "closing">("closed");
  const openCodex = () => {
    if (busy.current) return;
    sfx.confirm();
    sfx.pageFlip(1);
    setCodex("open");
  };
  const closeCodex = () => {
    sfx.back();
    sfx.whoosh(0, 0.26, 2400, 400, 0.1);
    setCodex("closing");
    later(() => setCodex("closed"), 290);
  };

  /* ---------------- settings popup ---------------- */
  const [settingsPop, setSettingsPop] = useState<"closed" | "open" | "closing">("closed");
  const openSettings = () => {
    if (busy.current) return;
    sfx.confirm();
    sfx.whoosh(0.02, 0.32, 300, 2400, 0.12);
    setSettingsPop("open");
  };
  const closeSettings = (cb?: () => void) => {
    sfx.back();
    sfx.whoosh(0, 0.26, 2400, 400, 0.1);
    setSettingsPop("closing");
    later(() => {
      setSettingsPop("closed");
      cb?.();
    }, 270);
  };

  /* ---------------- studio & previews ---------------- */
  const openStudio = () => {
    if (busy.current) return;
    sfx.confirm();
    sfx.whoosh(0.02, 0.35, 300, 2400, 0.12);
    setStudio("open");
  };
  const closeStudio = (cb?: () => void) => {
    if (studio !== "open") return cb?.();
    sfx.back();
    sfx.whoosh(0, 0.3, 2400, 400, 0.1);
    setStudio("closing");
    later(() => {
      setStudio("closed");
      cb?.();
    }, 300);
  };

  const replayIn = () => {
    if (busy.current) return;
    busy.current = true;
    const p = nextPlan();
    setToast(null);
    sfx.menuEnter(0.03, p);
    enterMenu(p);
    later(() => (busy.current = false), 900 * p.k);
  };

  const previewCycle = () => {
    if (busy.current) return;
    busy.current = true;
    const cur = planRef.current;
    setToast(null);
    setLeaving("preview");
    sfx.menuExit("preview", 0, cur);
    const wait = 700 * cur.k + 250;
    const p = nextPlan();
    sfx.menuEnter(wait / 1000, p);
    later(() => {
      setLeaving(null);
      enterMenu(p);
    }, wait);
    later(() => (busy.current = false), wait + 900 * p.k);
  };

  const toggleAll = () => {
    sfx.init();
    if (allMuted) {
      sfx.setSfx(true);
      sfx.setMusic(true);
      sfx.toggle(true);
    } else {
      sfx.toggle(false);
      sfx.setMusic(false);
      window.setTimeout(() => sfx.setSfx(false), 260);
    }
  };

  const menuLeaving: Target | "preview" | null =
    leaving && leaving !== "menu" && leaving !== "splash" ? (leaving as Target | "preview") : null;

  return (
    <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_center,#13242a,#030506)]">
      <div
        ref={phoneRef}
        className="relative h-full w-full max-h-full max-w-none overflow-hidden bg-black"
      >
        {screen === "splash" && <Splash leaving={leaving !== null} onStart={(e) => go("menu", e)} />}

        {screen === "menu" && (
          <MainMenu
            key={`menu-${enterKey}`}
            leaving={menuLeaving}
            ready={menuReady}
            coins={wallet.coins}
            gems={wallet.gems}
            plan={plan}
            onNavigate={(t, e) => (t === "setting" ? openSettings() : go(t, e))}
            rewardBadge={
              ACHS.filter((a) => !wallet.claimed.includes(a.id) && a.progress >= a.goal).length +
              GIFT_STOPS.filter((x) => wallet.claimed.length >= x && !wallet.giftStops.includes(x)).length +
              MILESTONES.filter((m) => wallet.claimed.length >= m.at && !wallet.chests.includes(m.at)).length
            }
          />
        )}

        {screen === "gun" && (
          <GunShop key={`gun-${enterKey}`} leaving={leaving !== null} coins={wallet.coins} gems={wallet.gems} onBack={(e) => go("menu", e)} />
        )}

        {screen === "ready" && (
          <Achievement key={`ach-${enterKey}`} leaving={leaving !== null} onBack={(e) => go("menu", e)} onGo={(e) => go("quest", e)} />
        )}

        {screen === "ranks" && <Leaderboard key={`lb-${enterKey}`} leaving={leaving !== null} onBack={(e) => go("menu", e)} />}

        {screen === "quest" && (
          <QuestMap key={`quest-${enterKey}`} leaving={leaving !== null} onBack={(e) => go("menu", e)} onPlay={(e, n) => go("play", e, n)} />
        )}

        {screen === "play" && (
          <GamePlay key={`play-${enterKey}`} leaving={leaving !== null} stage={playStage} seamless={playSeamless} handoff={playSeamless} entryOffset={PLAY_HOLD} onExit={(to, e) => go(to, e)} />
        )}

        {codex !== "closed" && <Codex closing={codex === "closing"} onClose={closeCodex} />}

        {settingsPop !== "closed" && (
          <Settings
            closing={settingsPop === "closing"}
            onClose={() => closeSettings()}
            onIntro={() => closeSettings(() => go("splash"))}
          />
        )}

        {screen !== "menu" && screen !== "splash" && screen !== "gun" && screen !== "ranks" && screen !== "quest" && screen !== "play" && screen !== "setting" && screen !== "ready" && (
          <SubScreen key={`sub-${enterKey}`} target={screen} leaving={leaving !== null} onBack={(e) => go("menu", e)} />
        )}

        <TransitionOverlay phase={overlay} origin={origin} label={label} variant={variant} rate={rate} />
        {flight && <GunFlight from={flight.from} to={flight.to} dur={flight.dur} />}

        {/* top-left tools */}
        {screen === "menu" && (
          <div className="absolute left-3 top-4 z-40 flex gap-2">
            <button
              onClick={openStudio}
              onPointerEnter={hoverSfx}
              title="Animation Studio"
              className="press"
            >
              <ToolChip set={uiSet.icons} name="studio" tone="gold" />
            </button>
            <button onClick={openCodex} onPointerEnter={hoverSfx} title="Kamus Game" aria-label="Kamus Game" className="press">
              <ToolChip set={uiSet.icons} name="book" tone="gold" />
            </button>
            <button
              onClick={() => {
                sfx.tap();
                replayIn();
              }}
              onPointerEnter={hoverSfx}
              title="Replay entrance animation"
              className="press"
            >
              <ToolChip set={uiSet.icons} name="replay" />
            </button>
            <button
              onClick={toggleAll}
              onPointerEnter={hoverSfx}
              title={allMuted ? "Unmute" : "Mute"}
              className="press"
            >
              <ToolChip set={uiSet.icons} name={allMuted ? "mute" : "sound"} />
            </button>
          </div>
        )}

        {/* auto-style toast */}
        {toast && screen === "menu" && !leaving && (
          <div key={toast.id} className="pointer-events-none absolute inset-x-0 top-[60px] z-40 flex justify-center px-4">
            <div className="a in-down font-ui max-w-full truncate rounded-full border border-white/15 bg-black/60 px-4 py-1.5 text-xs text-white shadow-lg backdrop-blur">
              <span className="text-[#3fdc72]">AUTO</span> {toast.text}
            </div>
          </div>
        )}

        {studio !== "closed" && (
          <AnimStudio
            closing={studio === "closing"}
            plan={plan}
            onClose={() => closeStudio()}
            onPreviewIn={() => closeStudio(replayIn)}
            onPreviewCycle={() => closeStudio(previewCycle)}
          />
        )}
      </div>
    </div>
  );
}
