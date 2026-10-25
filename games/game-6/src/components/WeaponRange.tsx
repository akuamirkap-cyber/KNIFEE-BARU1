import { useEffect, useMemo, useRef, useState } from 'react';
import { Game, WEAPONS } from '../game/engine';
import type { PublicState } from '../game/engine';
import { audio } from '../game/core';
import WeaponIcon from './WeaponIcon';

const INITIAL_STATE: PublicState = {
  state: 'ready',
  hits: 0,
  required: 7,
  ammo: 9,
  weaponId: WEAPONS[1].id,
  charge: 0,
  message: '',
  practice: false,
};

export default function WeaponRange() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gameRef = useRef<Game | null>(null);
  const [hud, setHud] = useState<PublicState>(INITIAL_STATE);
  const [muted, setMuted] = useState(false);

  const weapon = useMemo(
    () => WEAPONS.find((item) => item.id === hud.weaponId) ?? WEAPONS[0],
    [hud.weaponId]
  );
  const selectedIndex = WEAPONS.findIndex((item) => item.id === weapon.id);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const game = new Game(canvas);
    gameRef.current = game;
    game.onState = (state) => setHud({ ...state });
    game.start();

    const resize = new ResizeObserver(() => game.resize());
    resize.observe(canvas);

    const movePointer = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      game.setPointer(event.clientX - rect.left, event.clientY - rect.top);
    };
    const pointerDown = (event: PointerEvent) => {
      if (event.button !== 0) return;
      movePointer(event);
      canvas.setPointerCapture(event.pointerId);
      game.pressDown();
    };
    const pointerUp = () => game.pressUp();

    canvas.addEventListener('pointermove', movePointer);
    canvas.addEventListener('pointerdown', pointerDown);
    window.addEventListener('pointerup', pointerUp);

    const keyDown = (event: KeyboardEvent) => {
      if (event.repeat) return;
      const target = event.target;
      const typing = target instanceof HTMLElement && ['INPUT', 'TEXTAREA'].includes(target.tagName);
      if (typing) return;

      if (event.code === 'Space') {
        if (target instanceof HTMLButtonElement) return;
        event.preventDefault();
        game.pressDown();
      } else if (event.code === 'KeyR') {
        game.reset();
      } else if (event.code === 'KeyP') {
        game.setPractice(!game.practice);
      } else if (event.code === 'KeyM') {
        audio.muted = !audio.muted;
        setMuted(audio.muted);
      } else if (event.code === 'ArrowRight' || event.code === 'ArrowLeft') {
        event.preventDefault();
        const current = WEAPONS.findIndex((item) => item.id === game.weapon.id);
        const dir = event.code === 'ArrowRight' ? 1 : -1;
        game.setWeapon(WEAPONS[(current + dir + WEAPONS.length) % WEAPONS.length].id);
      }
    };
    const keyUp = (event: KeyboardEvent) => {
      if (event.code === 'Space') game.pressUp();
    };
    window.addEventListener('keydown', keyDown);
    window.addEventListener('keyup', keyUp);

    return () => {
      game.stop();
      resize.disconnect();
      canvas.removeEventListener('pointermove', movePointer);
      canvas.removeEventListener('pointerdown', pointerDown);
      window.removeEventListener('pointerup', pointerUp);
      window.removeEventListener('keydown', keyDown);
      window.removeEventListener('keyup', keyUp);
    };
  }, []);

  const chooseWeapon = (id: string) => gameRef.current?.setWeapon(id);
  const togglePractice = () => gameRef.current?.setPractice(!hud.practice);
  const toggleMute = () => {
    audio.muted = !audio.muted;
    setMuted(audio.muted);
  };

  const stateLabel =
    hud.state === 'ready' ? 'RANGE READY' : hud.state === 'playing' ? 'LIVE FIRE' : hud.state === 'won' ? 'TARGET COMPLETE' : 'RUN ENDED';

  return (
    <div className="relative flex h-full min-h-0 w-full flex-col overflow-hidden bg-[#080c14] text-slate-100">
      <div className="armory-grid pointer-events-none absolute inset-0 opacity-50" />
      <div className="pointer-events-none absolute -left-40 top-24 h-[32rem] w-[32rem] rounded-full bg-sky-500/[0.035] blur-3xl" />
      <div className="pointer-events-none absolute -right-48 bottom-12 h-[30rem] w-[30rem] rounded-full bg-amber-500/[0.035] blur-3xl" />

      <header className="relative z-20 flex h-[66px] shrink-0 items-center gap-3 border-b border-white/[0.09] bg-[#080c14]/95 px-3 sm:px-5">
        <div className="flex min-w-0 items-center gap-3 sm:min-w-[225px]">
          <div className="relative grid h-9 w-9 shrink-0 place-items-center border border-sky-200/30 bg-sky-300/[0.07] text-sky-100">
            <ReticleIcon className="h-6 w-6" />
            <span className="signal-dot absolute -right-1 -top-1 h-1.5 w-1.5 rounded-full bg-sky-300" />
          </div>
          <div className="min-w-0 leading-none">
            <div className="truncate text-[12px] font-extrabold tracking-[0.19em] text-slate-100 sm:text-[13px]">
              NEON BALLISTICS
            </div>
            <div className="mt-1.5 truncate text-[9px] font-semibold tracking-[0.2em] text-slate-500">
              ARSENAL RANGE <span className="text-slate-700">/</span> LEVEL 01
            </div>
          </div>
        </div>

        <div className="hidden flex-1 items-center justify-center gap-3 lg:flex">
          <span className="text-[9px] font-bold tracking-[0.2em] text-slate-500">TARGETS</span>
          <div className="flex items-center gap-[5px]" aria-label={`${hud.hits} of ${hud.required} targets hit`}>
            {Array.from({ length: hud.required }).map((_, index) => (
              <span
                key={index}
                className={`h-[5px] w-7 transition-all duration-300 ${
                  index < hud.hits
                    ? 'bg-emerald-300 shadow-[0_0_10px_rgba(110,231,183,.58)]'
                    : 'bg-white/[0.12]'
                }`}
              />
            ))}
          </div>
          <span className="min-w-[44px] font-mono text-[11px] font-semibold tabular-nums text-slate-300">
            {String(hud.hits).padStart(2, '0')}<span className="text-slate-600"> / {String(hud.required).padStart(2, '0')}</span>
          </span>
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-2.5">
          <div className="mr-1 hidden border-r border-white/10 pr-3 text-right sm:block">
            <div className="text-[8px] font-bold tracking-[0.19em] text-slate-500">AMMUNITION</div>
            <div className="mt-0.5 font-mono text-[15px] font-bold leading-none tabular-nums text-slate-100">
              {hud.practice ? 'INF' : String(hud.ammo).padStart(2, '0')}
              <span className="ml-1 text-[10px] font-medium text-slate-600">/{String(9).padStart(2, '0')}</span>
            </div>
          </div>
          <button
            onClick={togglePractice}
            aria-pressed={hud.practice}
            title="Practice mode (P): infinite ammo, no collision loss, hold to auto-fire"
            className={`group flex h-9 items-center gap-2 border px-2.5 text-[9px] font-bold tracking-[0.11em] transition sm:px-3 ${
              hud.practice
                ? 'border-emerald-300/45 bg-emerald-300/[0.1] text-emerald-200'
                : 'border-white/10 bg-white/[0.025] text-slate-400 hover:border-white/20 hover:text-slate-200'
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${hud.practice ? 'bg-emerald-300 shadow-[0_0_8px_#6ee7b7]' : 'bg-slate-600'}`} />
            <span className="hidden sm:inline">PRACTICE</span>
            <span className="sm:hidden">P</span>
          </button>
          <button
            onClick={toggleMute}
            aria-label={muted ? 'Unmute sound' : 'Mute sound'}
            title="Sound (M)"
            className="grid h-9 w-9 place-items-center border border-white/10 bg-white/[0.025] text-slate-300 transition hover:border-white/20 hover:bg-white/[0.06]"
          >
            <SpeakerIcon muted={muted} />
          </button>
          <button
            onClick={() => gameRef.current?.reset()}
            title="Reset round (R)"
            className="flex h-9 items-center gap-2 border border-sky-200/25 bg-sky-300/[0.1] px-2.5 text-[9px] font-bold tracking-[0.12em] text-sky-100 transition hover:border-sky-200/50 hover:bg-sky-300/[0.16] sm:px-3"
          >
            <ResetIcon />
            <span className="hidden sm:inline">RESET</span>
          </button>
        </div>
      </header>

      <div className="relative z-10 flex min-h-0 flex-1">
        <main className="relative min-w-0 flex-1 overflow-hidden">
          <canvas ref={canvasRef} className="h-full w-full cursor-crosshair touch-none select-none" />

          <div className="pointer-events-none absolute left-4 top-4 sm:left-6 sm:top-5">
            <div className="flex items-center gap-2 text-[8px] font-bold tracking-[0.21em] text-slate-500 sm:text-[9px]">
              <span className={`h-1.5 w-1.5 rounded-full ${hud.state === 'playing' ? 'signal-dot bg-rose-300' : 'bg-sky-300'}`} />
              {stateLabel}
            </div>
            <div className="mt-2 text-[13px] font-bold leading-tight text-slate-100 sm:text-[15px]" style={{ textShadow: '0 2px 18px rgba(0,0,0,.85)' }}>
              {weapon.name}
            </div>
            <div className="mt-1 text-[8px] font-semibold tracking-[0.13em] text-slate-400 sm:text-[9px]">
              {weapon.tag}
            </div>
          </div>

          <div className="pointer-events-none absolute right-4 top-4 text-right sm:right-6 sm:top-5">
            <div className="text-[8px] font-bold tracking-[0.2em] text-slate-500 sm:text-[9px]">HITS</div>
            <div className="mt-0.5 font-mono text-[24px] font-semibold leading-none tabular-nums text-white sm:text-[30px]">
              {String(hud.hits).padStart(2, '0')}
              <span className="ml-1 text-[13px] text-slate-500 sm:text-[15px]">/ {String(hud.required).padStart(2, '0')}</span>
            </div>
          </div>

          <div className="pointer-events-none absolute bottom-4 right-4 text-right sm:bottom-5 sm:right-6">
            <div className="text-[8px] font-bold tracking-[0.2em] text-slate-500 sm:text-[9px]">AMMO</div>
            <div className="mt-0.5 font-mono text-[17px] font-semibold leading-none tabular-nums text-amber-100 sm:text-[20px]">
              {hud.practice ? 'INF' : String(hud.ammo).padStart(2, '0')}
              {!hud.practice && <span className="ml-1 text-[10px] text-slate-500">/ 09</span>}
            </div>
          </div>

          <div className="pointer-events-none absolute bottom-4 left-4 flex items-center gap-2 text-[8px] font-semibold tracking-[0.12em] text-slate-400/80 sm:bottom-5 sm:left-6 sm:text-[9px]">
            <span className="border border-white/15 bg-black/35 px-1.5 py-1 font-mono text-slate-300">MOUSE</span>
            <span>AIM</span>
            <span className="mx-1 h-3 w-px bg-white/15" />
            <span className="border border-white/15 bg-black/35 px-1.5 py-1 font-mono text-slate-300">CLICK</span>
            <span>FIRE</span>
          </div>
        </main>

        <aside className="hidden w-[264px] shrink-0 flex-col border-l border-white/[0.08] bg-[#0a0f18]/85 px-4 py-5 2xl:flex">
          <div className="flex items-center justify-between text-[9px] font-bold tracking-[0.18em] text-slate-500">
            <span>ACTIVE LOADOUT</span>
            <span className="font-mono text-slate-600">{String(selectedIndex + 1).padStart(2, '0')} / {String(WEAPONS.length).padStart(2, '0')}</span>
          </div>

          <div className="relative mt-4 grid h-[128px] place-items-center overflow-hidden border-y border-white/[0.08] bg-[radial-gradient(ellipse_at_50%_55%,rgba(118,163,223,0.12),transparent_67%)]">
            <div className="pointer-events-none absolute inset-x-6 top-1/2 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />
            <WeaponIcon weapon={weapon} width={224} height={116} />
            <span className="pointer-events-none absolute bottom-2 left-0 text-[7px] font-semibold tracking-[0.2em] text-slate-600">TACTICAL PROFILE</span>
          </div>

          <div className="mt-4">
            <h2 className="text-[17px] font-bold leading-tight text-slate-100" style={{ color: weapon.accent }}>
              {weapon.name}
            </h2>
            <p className="mt-1 text-[9px] font-semibold tracking-[0.15em] text-slate-500">{weapon.tag}</p>
          </div>

          {weapon.note ? (
            <p className="mt-4 border-l-2 pl-3 text-[11px] leading-[1.6] text-slate-400" style={{ borderColor: `${weapon.accent}99` }}>
              {weapon.note}
            </p>
          ) : (
            <p className="mt-4 border-l-2 border-white/15 pl-3 text-[11px] leading-[1.6] text-slate-400">
              Aim carefully. Every impact leaves a permanent hazard on the rotating target.
            </p>
          )}

          <div className="mt-5 border-t border-white/[0.08] pt-4">
            <div className="mb-3 text-[8px] font-bold tracking-[0.2em] text-slate-600">SYSTEM READOUT</div>
            <Readout label="FIRE MODE" value={weapon.mode === 'beam' ? 'ENERGY BEAM' : weapon.charged ? 'CHARGED RELEASE' : 'PROJECTILE'} accent={weapon.accent} />
            <Readout label="CYCLE" value={`${weapon.cooldown.toFixed(2)} SEC`} />
            <Readout label="RECOIL" value={`${Math.round(weapon.recoilAmt * 5)} / 100`} />
          </div>

          <div className="mt-auto border-t border-white/[0.08] pt-4">
            <div className="mb-2 text-[8px] font-bold tracking-[0.2em] text-slate-600">FIELD CONTROLS</div>
            <div className="flex flex-wrap gap-x-3 gap-y-2 text-[9px] text-slate-400">
              <span><KeyCap>SPACE</KeyCap> fire</span>
              <span><KeyCap>← →</KeyCap> select</span>
              <span><KeyCap>R</KeyCap> reset</span>
              <span><KeyCap>P</KeyCap> practice</span>
            </div>
          </div>
        </aside>
      </div>

      <footer className="relative z-20 shrink-0 border-t border-white/[0.09] bg-[#080c14]/96 px-2 pb-1.5 pt-2 sm:px-4">
        <div className="mb-1.5 flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-extrabold tracking-[0.2em] text-slate-300">ARMORY</span>
            <span className="h-3 w-px bg-white/15" />
            <span className="text-[8px] font-semibold tracking-[0.14em] text-slate-600">SELECT WEAPON</span>
          </div>
          <span className="font-mono text-[8px] font-semibold tracking-[0.12em] text-slate-600">{String(WEAPONS.length).padStart(2, '0')} SYSTEMS</span>
        </div>
        <div className="rack-scroll flex gap-2 overflow-x-auto pb-1.5">
          {WEAPONS.map((item, index) => {
            const active = item.id === hud.weaponId;
            return (
              <button
                key={item.id}
                onClick={() => chooseWeapon(item.id)}
                aria-pressed={active}
                title={`${item.name} | ${item.tag}`}
                className={`weapon-card group relative flex h-[72px] w-[136px] shrink-0 flex-col items-center justify-between overflow-hidden border px-1.5 pb-1.5 pt-0.5 text-left ${
                  active
                    ? 'border-white/25 bg-white/[0.075]'
                    : 'border-white/[0.075] bg-white/[0.018] hover:border-white/20 hover:bg-white/[0.045]'
                }`}
                style={{
                  boxShadow: active ? `inset 0 -2px 0 ${item.accent}, 0 0 24px ${item.accent}16` : undefined,
                }}
              >
                {active && <span className="weapon-active-glow pointer-events-none absolute inset-x-3 top-0 h-px" style={{ background: item.accent }} />}
                <span className="pointer-events-none absolute left-2 top-1 font-mono text-[7px] font-semibold tabular-nums text-slate-600">{String(index + 1).padStart(2, '0')}</span>
                <WeaponIcon weapon={item} width={122} height={47} animate={active} />
                <span className={`relative w-full truncate text-center text-[9px] font-semibold tracking-[0.01em] ${active ? 'text-slate-100' : 'text-slate-500 group-hover:text-slate-300'}`}>
                  {item.name}
                </span>
              </button>
            );
          })}
        </div>
      </footer>
    </div>
  );
}

function Readout({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="mb-2 flex items-baseline justify-between gap-3">
      <span className="text-[8px] font-semibold tracking-[0.13em] text-slate-600">{label}</span>
      <span className="truncate text-right font-mono text-[9px] font-semibold tracking-[0.06em] text-slate-300" style={{ color: accent }}>
        {value}
      </span>
    </div>
  );
}

function KeyCap({ children }: { children: React.ReactNode }) {
  return <span className="mr-1 border border-white/[0.13] bg-white/[0.035] px-1 py-0.5 font-mono text-[8px] text-slate-300">{children}</span>;
}

function ReticleIcon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
      <circle cx="16" cy="16" r="10.5" stroke="currentColor" strokeWidth="1.35" />
      <circle cx="16" cy="16" r="3.2" stroke="currentColor" strokeWidth="1.25" />
      <path d="M16 1.8v6M16 24.2v6M1.8 16h6M24.2 16h6" stroke="currentColor" strokeWidth="1.35" strokeLinecap="square" />
      <path d="M16 10.2v2M16 19.8v2M10.2 16h2M19.8 16h2" stroke="currentColor" strokeWidth="1" opacity=".62" />
    </svg>
  );
}

function SpeakerIcon({ muted }: { muted: boolean }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-[17px] w-[17px]" aria-hidden="true">
      <path d="M3 7.2h3.1L10 4v12l-3.9-3.2H3V7.2Z" stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round" />
      {muted ? (
        <path d="m13 7 4 6m0-6-4 6" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" />
      ) : (
        <>
          <path d="M12.6 7.2a4.2 4.2 0 0 1 0 5.6M14.8 5.2a7.1 7.1 0 0 1 0 9.6" stroke="currentColor" strokeWidth="1.15" strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}

function ResetIcon() {
  return (
    <svg viewBox="0 0 18 18" fill="none" className="h-[14px] w-[14px]" aria-hidden="true">
      <path d="M3.4 6.2A6 6 0 1 1 3 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M3 2.8v3.8h3.8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}