import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { DEFAULT_WEAPON, Game, WEAPONS } from "../game/engine";
import type { PublicState } from "../game/engine";
import { audio } from "../game/core";
import { CATEGORIES, WEAPON_PROFILES } from "../game/catalog";
import { MARK_DESCRIPTIONS } from "../game/marks";
import Icon from "./Icon";
import type { IconName } from "./Icon";
import WeaponIcon from "./WeaponIcon";

function preference(key: string, fallback: string) {
  try {
    return localStorage.getItem(`arsenal.${key}`) ?? fallback;
  } catch {
    return fallback;
  }
}

function savePreference(key: string, value: string) {
  try {
    localStorage.setItem(`arsenal.${key}`, value);
  } catch {
    /* Private browsing can disable storage. */
  }
}

function timeLabel(seconds: number) {
  const total = Math.floor(seconds);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function savedBestTime() {
  const value = Number(preference("bestTime", "0"));
  return Number.isFinite(value) && value > 0 ? value : 0;
}

const INITIAL_HUD: PublicState = {
  state: "ready",
  hits: 0,
  required: 7,
  ammo: 9,
  weaponId: DEFAULT_WEAPON.id,
  charge: 0,
  message: "",
  paused: false,
  elapsed: 0,
  shots: 0,
  cooldown: 0,
  discFlying: false,
  status: "Siap menembak",
  targetBlocked: false,
  shotAge: 100,
  catchAge: 100,
  motionRate: 1,
};

export default function ArsenalRange() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gameRef = useRef<Game | null>(null);
  const rackRef = useRef<HTMLDivElement | null>(null);
  const pausedBeforeDialog = useRef(false);
  const [hud, setHud] = useState<PublicState>(INITIAL_HUD);
  const [muted, setMuted] = useState(
    () => preference("muted", "false") === "true",
  );
  const [cinematic, setCinematic] = useState(
    () => preference("cinematic", "true") === "true",
  );
  const [reducedMotion, setReducedMotion] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const [filter, setFilter] =
    useState<(typeof CATEGORIES)[number]["id"]>("all");
  const [dialog, setDialog] = useState<"help" | "weapon" | null>(null);
  const [fullScreen, setFullScreen] = useState(false);
  const [bestTime, setBestTime] = useState(savedBestTime);
  const [scrollEdges, setScrollEdges] = useState({ left: false, right: true });
  const [notice, setNotice] = useState("");
  const weapon = useMemo(
    () => WEAPONS.find((w) => w.id === hud.weaponId) ?? DEFAULT_WEAPON,
    [hud.weaponId],
  );
  const profile = WEAPON_PROFILES[weapon.id];
  const selectedIndex = WEAPONS.findIndex((w) => w.id === weapon.id) + 1;
  const filteredWeapons = useMemo(
    () =>
      WEAPONS.filter(
        (w) => filter === "all" || WEAPON_PROFILES[w.id].category === filter,
      ),
    [filter],
  );
  const ended = hud.state === "won" || hud.state === "lost";

  const reset = useCallback(() => {
    gameRef.current?.reset();
    canvasRef.current?.focus({ preventScroll: true });
  }, []);

  const toggleSound = useCallback(() => {
    setMuted((previous) => {
      audio.muted = !previous;
      savePreference("muted", String(!previous));
      return !previous;
    });
  }, []);

  const toggleFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      setNotice("Layar penuh tidak tersedia di perangkat ini.");
    }
  }, []);

  const openDialog = useCallback((kind: "help" | "weapon") => {
    pausedBeforeDialog.current = gameRef.current?.paused ?? false;
    gameRef.current?.setPaused(true);
    setDialog(kind);
  }, []);

  const closeDialog = useCallback(() => {
    setDialog(null);
    if (!pausedBeforeDialog.current) gameRef.current?.setPaused(false);
    requestAnimationFrame(() =>
      canvasRef.current?.focus({ preventScroll: true }),
    );
  }, []);

  useEffect(() => {
    audio.muted = muted;
    if (gameRef.current) {
      gameRef.current.cinematic = cinematic;
      gameRef.current.reducedMotion = reducedMotion;
    }
  }, [muted, cinematic, reducedMotion]);

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(""), 3500);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  useEffect(() => {
    if (
      hud.state === "won" &&
      hud.elapsed > 0 &&
      (!bestTime || hud.elapsed < bestTime)
    ) {
      setBestTime(hud.elapsed);
      savePreference("bestTime", String(hud.elapsed));
    }
  }, [hud.state, hud.elapsed, bestTime]);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const change = () => setReducedMotion(query.matches);
    const fullscreenChange = () =>
      setFullScreen(Boolean(document.fullscreenElement));
    query.addEventListener("change", change);
    document.addEventListener("fullscreenchange", fullscreenChange);
    return () => {
      query.removeEventListener("change", change);
      document.removeEventListener("fullscreenchange", fullscreenChange);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const game = new Game(canvas);
    gameRef.current = game;
    game.cinematic = preference("cinematic", "true") === "true";
    game.reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    game.onState = (state) => setHud({ ...state });
    game.emit();
    game.start();
    const resizeObserver = new ResizeObserver(() => game.resize());
    resizeObserver.observe(canvas);
    const position = (event: PointerEvent) => {
      const bounds = canvas.getBoundingClientRect();
      game.setPointer(
        ((event.clientX - bounds.left) * game.W) / bounds.width,
        ((event.clientY - bounds.top) * game.H) / bounds.height,
      );
    };
    let firingPointer: number | null = null;
    const down = (event: PointerEvent) => {
      if (event.button !== 0 || !event.isPrimary) return;
      firingPointer = event.pointerId;
      position(event);
      canvas.focus({ preventScroll: true });
      canvas.setPointerCapture(event.pointerId);
      game.pressDown();
    };
    const up = (event: PointerEvent) => {
      if (event.pointerId !== firingPointer) return;
      firingPointer = null;
      game.pressUp();
    };
    const cancel = (event: PointerEvent) => {
      if (event.pointerId !== firingPointer) return;
      firingPointer = null;
      game.cancelInput();
    };
    const blur = () => {
      firingPointer = null;
      game.cancelInput();
      if (game.state === "playing") game.setPaused(true);
    };
    const visibility = () => {
      if (document.hidden) blur();
    };
    const keyDown = (event: KeyboardEvent) => {
      if (
        event.repeat ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey ||
        document.querySelector("dialog[open]")
      )
        return;
      const target =
        event.target instanceof HTMLElement
          ? event.target.closest("button, input, select")
          : null;
      if (
        target?.getAttribute("role") === "tab" &&
        ["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.code)
      ) {
        event.preventDefault();
        const tabs = Array.from(
          target.parentElement?.querySelectorAll<HTMLButtonElement>(
            '[role="tab"]',
          ) ?? [],
        );
        const current = tabs.indexOf(target as HTMLButtonElement);
        const next =
          event.code === "Home"
            ? 0
            : event.code === "End"
              ? tabs.length - 1
              : (current +
                  (event.code === "ArrowRight" ? 1 : tabs.length - 1)) %
                tabs.length;
        tabs[next]?.focus();
        tabs[next]?.click();
        return;
      }
      if (event.code === "Space") {
        if (game.paused || (target && !target.hasAttribute("data-weapon-id")))
          return;
        event.preventDefault();
        game.pressDown();
      } else if (event.code === "KeyR") reset();
      else if (event.code === "KeyM") toggleSound();
      else if (event.code === "KeyF") void toggleFullscreen();
      else if (event.code === "KeyP" || event.code === "Escape")
        game.setPaused(!game.paused);
      else if (event.code === "ArrowRight" || event.code === "ArrowLeft") {
        event.preventDefault();
        setFilter("all");
        const index = WEAPONS.findIndex((w) => w.id === game.weapon.id);
        const next =
          (index + (event.code === "ArrowRight" ? 1 : WEAPONS.length - 1)) %
          WEAPONS.length;
        game.setWeapon(WEAPONS[next].id);
      }
    };
    const keyUp = (event: KeyboardEvent) => {
      if (event.code === "Space" && !document.querySelector("dialog[open]"))
        game.pressUp();
    };
    canvas.addEventListener("pointermove", position);
    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointercancel", cancel);
    window.addEventListener("pointerup", up);
    window.addEventListener("keydown", keyDown);
    window.addEventListener("keyup", keyUp);
    window.addEventListener("blur", blur);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      game.stop();
      game.onState = () => {};
      resizeObserver.disconnect();
      canvas.removeEventListener("pointermove", position);
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointercancel", cancel);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("keydown", keyDown);
      window.removeEventListener("keyup", keyUp);
      window.removeEventListener("blur", blur);
      document.removeEventListener("visibilitychange", visibility);
      gameRef.current = null;
    };
  }, [reset, toggleSound, toggleFullscreen]);

  const updateScrollEdges = useCallback(() => {
    const rack = rackRef.current;
    if (!rack) return;
    setScrollEdges({
      left: rack.scrollLeft > 3,
      right: rack.scrollLeft + rack.clientWidth < rack.scrollWidth - 4,
    });
  }, []);

  useEffect(() => {
    const rack = rackRef.current;
    if (!rack) return;
    const frame = requestAnimationFrame(() => {
      rack.querySelector('[aria-pressed="true"]')?.scrollIntoView({
        behavior: reducedMotion ? "instant" : "smooth",
        block: "nearest",
        inline: "center",
      });
      updateScrollEdges();
    });
    const observer = new ResizeObserver(updateScrollEdges);
    observer.observe(rack);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [hud.weaponId, filter, reducedMotion, updateScrollEdges]);

  const scrollRack = (direction: number) =>
    rackRef.current?.scrollBy({
      left: direction * Math.max(250, rackRef.current.clientWidth * 0.65),
      behavior: reducedMotion ? "instant" : "smooth",
    });
  const chooseAgain = () => {
    reset();
    requestAnimationFrame(() =>
      rackRef.current
        ?.querySelector<HTMLButtonElement>('[aria-pressed="true"]')
        ?.focus({ preventScroll: true }),
    );
  };
  const style = { "--weapon-color": weapon.accent } as CSSProperties;

  return (
    <div className="arsenal-app" style={style}>
      <header className="app-header">
        <a className="brand" href="#arena" aria-label="Arsenal Neon Ballistics">
          <span className="brand-mark">
            <Icon name="target" />
          </span>
          <span className="brand-type">
            <strong>
              ARSENAL<span className="brand-dot">.</span>
            </strong>
            <span>NEON BALLISTICS</span>
          </span>
        </a>
        <div
          className="level-progress"
          aria-label={`Level 1: ${hud.hits} dari ${hud.required} hit`}
        >
          <span className="micro-label">
            LEVEL <b>01</b>
          </span>
          <div className="progress-track">
            {Array.from({ length: hud.required }, (_, i) => (
              <span className={i < hud.hits ? "is-filled" : ""} key={i} />
            ))}
          </div>
        </div>
        <div className="header-actions">
          <ToolButton
            label={muted ? "Nyalakan suara" : "Matikan suara"}
            icon={muted ? "muted" : "sound"}
            onClick={toggleSound}
            pressed={muted}
            shortcut="M"
          />
          <ToolButton
            label={hud.paused ? "Lanjutkan permainan" : "Jeda permainan"}
            icon={hud.paused ? "play" : "pause"}
            disabled={ended}
            onClick={() => gameRef.current?.setPaused(!hud.paused)}
            shortcut="P"
          />
          <span className="fullscreen-control">
            <ToolButton
              label={fullScreen ? "Keluar layar penuh" : "Layar penuh"}
              icon={fullScreen ? "collapse" : "expand"}
              onClick={() => void toggleFullscreen()}
              shortcut="F"
            />
          </span>
          <button
            className="reset-button"
            onClick={reset}
            aria-label="Reset (R)"
            title="Ulangi Level 1 (R)"
          >
            <Icon name="reset" />
            <span>Ulang</span>
            <kbd>R</kbd>
          </button>
        </div>
      </header>

      <div className="range-layout">
        <main id="arena" className="arena" aria-label="Arena tembak Level 1">
          <canvas
            ref={canvasRef}
            tabIndex={0}
            aria-label="Bidik dan klik untuk menembak. Spasi: tembak. R: ulang. P: jeda. Panah kiri dan kanan: ganti senjata."
            className="arena-canvas"
          />
          <div className="arena-heading">
            <div>
              <p className="micro-label">
                <span className="live-dot" />
                THE ROTATING RANGE
              </p>
              <p className="mission-line">
                Tujuh hit. Jangan mengenai bekasnya.
              </p>
            </div>
            <div
              className="hit-counter"
              aria-label={`${hud.hits}/${hud.required} hit berhasil`}
            >
              <span className="micro-label">HIT BERHASIL</span>
              <p>
                <strong key={hud.hits}>
                  {String(hud.hits).padStart(2, "0")}
                </strong>
                <span>/ {String(hud.required).padStart(2, "0")}</span>
              </p>
            </div>
          </div>
          <div className="arena-corner top-left" />
          <div className="arena-corner top-right" />
          <div className="arena-corner bottom-left" />
          <div className="arena-corner bottom-right" />
          {hud.hits > 0 && !ended && (
            <div key={`${weapon.id}-${hud.hits}`} className="hit-confirmation">
              <Icon name="check" /> HIT TERCATAT
            </div>
          )}
          <div className="arena-bottom">
            <button
              className="active-weapon"
              onClick={() => openDialog("weapon")}
              title="Lihat detail senjata"
            >
              <span className="micro-label">
                EQUIPPED / {String(selectedIndex).padStart(2, "0")}
              </span>
              <span className="active-weapon-name">
                {profile.short}
                <Icon name="info" />
              </span>
              <span
                className={`weapon-state ${hud.targetBlocked ? "is-warning" : ""}`}
              >
                <i />
                {hud.targetBlocked && !ended && !hud.paused
                  ? "Titik terisi. Cari celah baru."
                  : hud.status}
              </span>
            </button>
            <div className="shoot-hint">
              <span>
                <kbd>SPASI</kbd> atau klik untuk menembak
              </span>
              <span>Geser bidikan. Temukan ritmenya.</span>
            </div>
            <div
              className="ammo-display"
              aria-label={`${hud.ammo} amunisi tersisa`}
            >
              <span className="micro-label">AMUNISI</span>
              <div>
                <strong key={hud.ammo}>
                  {String(hud.ammo).padStart(2, "0")}
                </strong>
                <span>/ 09</span>
              </div>
              <div className="ammo-track">
                {Array.from({ length: 9 }, (_, i) => (
                  <i key={i} className={i < hud.ammo ? "is-loaded" : ""} />
                ))}
              </div>
            </div>
          </div>
          {hud.paused && !dialog && !ended && (
            <section
              className="session-overlay pause-overlay"
              aria-label="Permainan dijeda"
            >
              <div className="session-content">
                <span className="overlay-symbol">
                  <Icon name="pause" />
                </span>
                <p className="micro-label">TAKE A BREATH</p>
                <h2>
                  SESI DIJEDA<span>.</span>
                </h2>
                <p>Roda, proyektil, dan waktu berhenti. Lanjutkan saat siap.</p>
                <button
                  className="primary-button"
                  onClick={() => gameRef.current?.setPaused(false)}
                >
                  <Icon name="play" />
                  Lanjutkan permainan
                </button>
                <button className="text-button" onClick={reset}>
                  Mulai ulang Level 1 <span>R</span>
                </button>
              </div>
            </section>
          )}
          {ended && (
            <section
              className={`session-overlay result-overlay ${hud.state === "won" ? "is-won" : "is-lost"}`}
              aria-label={
                hud.state === "won" ? "Level selesai" : "Sesi berakhir"
              }
            >
              <div className="session-content">
                <span className="overlay-symbol">
                  <Icon name={hud.state === "won" ? "check" : "target"} />
                </span>
                <p className="micro-label">
                  LEVEL 01 / {hud.state === "won" ? "COMPLETE" : "TRY AGAIN"}
                </p>
                <h2>
                  {hud.state === "won"
                    ? "TEPAT. TUJUH KALI"
                    : "TEMUKAN RITMEMU"}
                  <span>.</span>
                </h2>
                <p>
                  {hud.state === "won"
                    ? "Tujuh titik bersih. Satu putaran yang berhasil ditaklukkan."
                    : hud.message === "AMUNISI HABIS"
                      ? "Amunisi habis. Ambil napas, bidik celah, lalu coba lagi."
                      : "Tembakan mengenai titik terisi. Tunggu celah berikutnya."}
                </p>
                <div className="result-details">
                  <div>
                    <span>HIT</span>
                    <strong>
                      {hud.hits}
                      <small>/{hud.required}</small>
                    </strong>
                  </div>
                  <div>
                    <span>TEMBAKAN</span>
                    <strong>{String(hud.shots).padStart(2, "0")}</strong>
                  </div>
                  <div>
                    <span>WAKTU</span>
                    <strong>{timeLabel(hud.elapsed)}</strong>
                  </div>
                </div>
                <button className="primary-button" onClick={reset}>
                  Main lagi <Icon name="arrow" />
                </button>
                <button className="text-button" onClick={chooseAgain}>
                  Pilih senjata lain <Icon name="right" />
                </button>
                {hud.state === "won" && bestTime > 0 && (
                  <p className="personal-best">
                    REKOR PRIBADI / {timeLabel(bestTime)}
                  </p>
                )}
              </div>
            </section>
          )}
          {notice && (
            <p className="system-notice" role="status">
              {notice}
            </p>
          )}
          <p className="sr-only" aria-live="polite">
            {hud.hits} dari {hud.required} hit berhasil. {hud.ammo} amunisi
            tersisa.
          </p>
        </main>

        <aside className="weapon-inspector" aria-label="Detail senjata aktif">
          <div className="inspector-top">
            <span className="micro-label">THE ARMORY</span>
            <span className="micro-label">
              {String(selectedIndex).padStart(2, "0")}{" "}
              <span className="muted">/ {WEAPONS.length}</span>
            </span>
          </div>
          <div className="inspector-content" key={weapon.id}>
            <p className="weapon-family">{profile.family}</p>
            <h2>{weapon.name}</h2>
            <div className="weapon-showcase">
              <div className="showcase-orbit" />
              <WeaponIcon
                weapon={weapon}
                width={254}
                height={162}
                animate={!hud.paused && !reducedMotion}
                shotAge={hud.shotAge}
                catchAge={hud.catchAge}
                discInFlight={hud.discFlying}
                motionRate={hud.motionRate}
              />
              <span className="showcase-ground" />
            </div>
            <p className="weapon-description">{profile.description}</p>
            <div className="weapon-specs">
              <div>
                <span>SIKLUS TEMBAK</span>
                <strong>
                  {weapon.cooldown.toFixed(2).replace(".", ",")}{" "}
                  <small>detik</small>
                </strong>
              </div>
              <div>
                <span>JENIS SERANGAN</span>
                <strong>
                  {weapon.id === "identityDisc"
                    ? "Ricochet"
                    : weapon.charged
                      ? "Charge"
                      : weapon.mode === "beam"
                        ? "Beam"
                        : "Proyektil"}
                </strong>
              </div>
            </div>
            <div className="impact-note">
              <span className="micro-label">JEJAK PADA RODA</span>
              <p>{MARK_DESCRIPTIONS[weapon.id]}.</p>
              <span className="permanent-note">
                <i />
                Permanen. Jangan ditembak lagi.
              </span>
            </div>
            <div className="technique-note">
              <Icon name="target" />
              <p>{profile.technique}</p>
            </div>
          </div>
          <button
            className="inspector-help text-button"
            onClick={() => openDialog("help")}
          >
            <Icon name="help" />
            Panduan & pengaturan <Icon name="right" />
          </button>
        </aside>
      </div>

      <footer className="armory">
        <div className="armory-toolbar">
          <div className="collection-label">
            <span className="micro-label">KOLEKSI SENJATA</span>
            <span>{String(WEAPONS.length).padStart(2, "0")}</span>
          </div>
          <div
            className="category-tabs"
            role="tablist"
            aria-label="Kategori senjata"
          >
            {CATEGORIES.map((category) => (
              <button
                key={category.id}
                id={`category-${category.id}`}
                role="tab"
                tabIndex={category.id === filter ? 0 : -1}
                aria-controls="weapon-collection"
                aria-selected={category.id === filter}
                className={category.id === filter ? "is-active" : ""}
                onClick={() => setFilter(category.id)}
              >
                {category.label}
              </button>
            ))}
          </div>
          <div className="rack-navigation">
            <span>
              <kbd>&larr;</kbd>
              <kbd>&rarr;</kbd> Ganti senjata
            </span>
            <ToolButton
              label="Geser koleksi ke kiri"
              icon="left"
              disabled={!scrollEdges.left}
              onClick={() => scrollRack(-1)}
            />
            <ToolButton
              label="Geser koleksi ke kanan"
              icon="right"
              disabled={!scrollEdges.right}
              onClick={() => scrollRack(1)}
            />
          </div>
        </div>
        <div
          ref={rackRef}
          className="weapon-rack"
          id="weapon-collection"
          onScroll={updateScrollEdges}
          role="tabpanel"
          aria-labelledby={`category-${filter}`}
          aria-label={`${filteredWeapons.length} senjata dalam koleksi`}
        >
          {filteredWeapons.map((item) => {
            const active = item.id === weapon.id;
            const index = WEAPONS.indexOf(item) + 1;
            return (
              <button
                key={item.id}
                className={`weapon-slot ${active ? "is-selected" : ""}`}
                onClick={() => gameRef.current?.setWeapon(item.id)}
                aria-label={`Pilih ${item.name}`}
                aria-pressed={active}
                data-weapon-id={item.id}
                style={{ "--slot-color": item.accent } as CSSProperties}
                title={item.name}
              >
                <span className="slot-index">
                  {String(index).padStart(2, "0")}
                </span>
                <span className="slot-category">
                  {WEAPON_PROFILES[item.id].category === "ballistic"
                    ? "BALLISTIC"
                    : WEAPON_PROFILES[item.id].category === "signature"
                      ? "ICONIC"
                      : "ENERGY"}
                </span>
                <WeaponIcon
                  weapon={item}
                  width={150}
                  height={64}
                  animate={active && !hud.paused && !reducedMotion}
                  shotAge={active ? hud.shotAge : 100}
                  catchAge={active ? hud.catchAge : 100}
                  discInFlight={active && hud.discFlying}
                  motionRate={active ? hud.motionRate : 1}
                />
                <span className="slot-name">
                  {WEAPON_PROFILES[item.id].short}
                </span>
                <span className="slot-selected">
                  <Icon name="check" />
                </span>
              </button>
            );
          })}
        </div>
        <div className="app-statusbar">
          <span>
            <i />
            {hud.paused
              ? "SESI DIJEDA"
              : ended
                ? "SESI SELESAI"
                : "RANGE ONLINE"}
            <b>/</b>LEVEL 01
          </span>
          <button onClick={() => openDialog("help")}>
            <Icon name="help" />
            Panduan kontrol
          </button>
          <span>
            SPASI / TEMBAK <b>/</b> P / JEDA
          </span>
        </div>
      </footer>

      <Modal
        open={dialog !== null}
        onClose={closeDialog}
        title={dialog === "weapon" ? "Detail senjata" : "Panduan & pengaturan"}
      >
        {dialog === "weapon" ? (
          <div className="weapon-dialog">
            <p className="weapon-family">{profile.family}</p>
            <h2>{weapon.name}</h2>
            <div className="dialog-weapon-art">
              <WeaponIcon
                weapon={weapon}
                width={280}
                height={168}
                animate={!reducedMotion}
              />
            </div>
            <p>{profile.description}</p>
            <div className="dialog-rule">
              <span className="micro-label">CARA MENGGUNAKAN</span>
              <p>{profile.technique}</p>
            </div>
            <div className="dialog-rule">
              <span className="micro-label">JEJAK PERMANEN</span>
              <p>
                {MARK_DESCRIPTIONS[weapon.id]}. Titik ini tidak boleh ditembak
                lagi.
              </p>
            </div>
            <button className="primary-button" onClick={closeDialog}>
              Kembali ke arena <Icon name="arrow" />
            </button>
          </div>
        ) : (
          <div className="help-dialog">
            <p className="micro-label">ONE WHEEL. SEVEN CLEAN HITS.</p>
            <h2>
              Temukan ritmemu<span>.</span>
            </h2>
            <p>
              Daratkan tujuh hit di roda tanpa mengenai bekas tembakan
              sebelumnya. Kamu punya sembilan kesempatan.
            </p>
            <div className="control-list">
              <div>
                <span>
                  <kbd>SPASI</kbd> / klik
                </span>
                <p>Tembak. Untuk busur, tahan lalu lepas.</p>
              </div>
              <div>
                <span>
                  <kbd>&larr;</kbd>
                  <kbd>&rarr;</kbd>
                </span>
                <p>Ganti senjata.</p>
              </div>
              <div>
                <span>
                  <kbd>P</kbd> / <kbd>ESC</kbd>
                </span>
                <p>Jeda dan lanjutkan.</p>
              </div>
              <div>
                <span>
                  <kbd>R</kbd>
                </span>
                <p>Mulai ulang Level 1.</p>
              </div>
              <div>
                <span>
                  <kbd>M</kbd> / <kbd>F</kbd>
                </span>
                <p>Suara / layar penuh.</p>
              </div>
            </div>
            <p className="help-tip">
              <Icon name="info" />
              Identity Disc memantul lalu kembali. Bekas setiap lemparan tetap
              menjadi rintangan.
            </p>
            <label className="setting-row">
              <span>
                Getaran kamera
                <span>Efek sinematik saat menembak dan mengenai roda.</span>
              </span>
              <input
                type="checkbox"
                checked={cinematic}
                disabled={reducedMotion}
                onChange={(event) => {
                  setCinematic(event.target.checked);
                  savePreference("cinematic", String(event.target.checked));
                }}
              />
              <span className="toggle-switch" aria-hidden="true" />
            </label>
            {reducedMotion && (
              <p className="reduced-motion-note">
                Mode gerak minimal mengikuti pengaturan perangkatmu.
              </p>
            )}
            <button className="primary-button" onClick={closeDialog}>
              Kembali ke arena <Icon name="arrow" />
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}

function ToolButton({
  label,
  icon,
  onClick,
  disabled,
  pressed,
  shortcut,
}: {
  label: string;
  icon: IconName;
  onClick: () => void;
  disabled?: boolean;
  pressed?: boolean;
  shortcut?: string;
}) {
  return (
    <button
      className="tool-button"
      aria-label={label}
      aria-pressed={pressed}
      disabled={disabled}
      onClick={onClick}
      title={`${label}${shortcut ? ` (${shortcut})` : ""}`}
    >
      <Icon name={icon} />
    </button>
  );
}

function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement | null>(null);
  useEffect(() => {
    if (open && !ref.current?.open) ref.current?.showModal();
    else if (!open && ref.current?.open) ref.current.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      className="app-dialog"
      aria-label={title}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="dialog-inner">
        <button
          className="dialog-close tool-button"
          aria-label="Tutup dialog"
          onClick={onClose}
        >
          <Icon name="close" />
        </button>
        {children}
      </div>
    </dialog>
  );
}
