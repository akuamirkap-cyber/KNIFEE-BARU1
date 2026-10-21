import {
  Crown,
  Gem,
  MousePointerClick,
  Play,
  RefreshCw,
  ShieldAlert,
  Target,
  Trophy,
  Volume2,
  VolumeX,
} from 'lucide-react';
import type { GameEngine } from '../game/engine';
import type { Status } from '../game/types';
import KerisIcon from './KerisIcon';

interface Props {
  status: Status;
  engine: () => GameEngine | null;
}

const PRAISE = ['SAKTI!', 'PUSAKA PECAH!', 'LUAR BIASA!', 'HEBAT SEKALI!', 'SEMPURNA!', 'TAK TERHENTIKAN!'];

export default function HUD({ status, engine }: Props) {
  const { phase, level, boss, score, best, isNewBest, gems, shotsLeft, shotsTotal, muted } = status;

  const startGame = () => engine()?.begin();
  const restart = () => engine()?.restart();
  const toggleMute = () => engine()?.toggleMute();

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* atmosphere layers */}
      <div className="batik-flow absolute inset-0 opacity-70" />
      <div className="vignette absolute inset-0" />

      {/* ============ TOP BAR ============ */}
      <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-3 px-4 pt-4 sm:px-7 sm:pt-6">
        {/* score */}
        <div className={`min-w-20 transition-opacity duration-500 ${phase === 'menu' ? 'opacity-0' : 'opacity-100'}`}>
          <div className="eyebrow text-[#96661a]">Skor</div>
          <div className="font-display text-3xl font-black leading-none text-gold-grad drop-glow-gold sm:text-4xl">
            {score}
          </div>
        </div>

        {/* level chip */}
        <div
          className={`flex flex-col items-center transition-opacity duration-500 ${phase === 'menu' ? 'opacity-0' : 'opacity-100'}`}
        >
          <div className="flex items-center gap-2">
            <span className="hairline w-6 sm:w-10" />
            {boss ? <Crown className="h-3.5 w-3.5 text-ruby-500" strokeWidth={2.4} /> : null}
            <span className={`eyebrow ${boss ? 'text-ruby-500' : 'text-[#96661a]'}`}>{boss ? 'Bos Pusaka' : 'Level'}</span>
            <span className="hairline w-6 sm:w-10" />
          </div>
          <div
            className={`font-display text-2xl font-black sm:text-3xl ${
              boss ? 'text-ember-grad drop-glow-ruby' : 'text-gold-grad drop-glow-gold'
            }`}
          >
            {String(level).padStart(2, '0')}
          </div>
        </div>

        {/* gems */}
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-1.5 rounded-full border border-ruby-400/35 bg-cream-50/80 px-3 py-1 shadow-sm backdrop-blur-sm">
            <Gem className={`h-3.5 w-3.5 text-ruby-400 ${gems > 0 ? 'anim-gem' : ''}`} strokeWidth={2.4} />
            <span className="text-sm font-bold text-ruby-500">{gems}</span>
          </div>
        </div>
      </div>

      {/* mute — always topmost so it survives the overlays */}
      <button
        onClick={toggleMute}
        className="btn-ghost pointer-events-auto absolute right-4 top-[3.6rem] flex h-9 w-9 items-center justify-center rounded-full sm:right-7 sm:top-[4.4rem]"
        aria-label="suara"
      >
        {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
      </button>

      {/* ============ SHOT PIPS ============ */}
      {phase !== 'menu' && shotsTotal > 0 && (
        <div className="absolute bottom-4 left-3 flex flex-col-reverse items-center gap-1 sm:bottom-6 sm:left-6">
          {Array.from({ length: shotsTotal }).map((_, i) => (
            <KerisIcon key={i} className="h-9 w-2.5 sm:h-11 sm:w-3" used={i >= shotsLeft} dim={false} delay={i * 0.11} />
          ))}
          <div className="mt-1 h-px w-5 bg-[#a8721c]/50" />
          <span className="text-[9px] font-bold tracking-[0.3em] text-[#96661a]/80">{shotsLeft}</span>
        </div>
      )}

      {/* ============ FIRST-RUN HINT ============ */}
      {phase === 'playing' && level === 1 && shotsLeft === shotsTotal && (
        <div className="absolute inset-x-0 bottom-24 flex items-center justify-center gap-2 sm:bottom-28">
          <MousePointerClick className="h-4 w-4 animate-pulse text-[#a8721c]" />
          <span className="animate-pulse text-[11px] font-semibold tracking-[0.34em] text-[#8a5a10]">
            KETUK LAYAR UNTUK MENEMBAK
          </span>
        </div>
      )}

      {/* ============ LEVEL INTRO SWEEP ============ */}
      {phase === 'playing' && (
        <div key={`${level}-intro`} className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="anim-intro flex flex-col items-center">
            <span
              className={`font-display text-4xl font-black opacity-90 drop-glow-gold sm:text-6xl ${boss ? 'text-ember-grad' : 'text-gold-grad'}`}
            >
              {boss ? 'BOS' : 'LEVEL'}
            </span>
            <span
              className={`mt-1 font-display text-6xl font-black drop-glow-gold sm:text-8xl ${boss ? 'text-ember-grad' : 'text-gold-grad'}`}
            >
              {String(level).padStart(2, '0')}
            </span>
          </div>
        </div>
      )}

      {/* ============ CLEAR BANNER ============ */}
      {phase === 'celebrating' && (
        <div className="absolute left-1/2 top-[24%] -translate-x-1/2">
          <div className="anim-banner flex flex-col items-center">
            <div className="flex items-center gap-3">
              <span className="hairline w-10" />
              <span className={`eyebrow ${boss ? 'text-ruby-500' : 'text-[#96661a]'}`}>
                {boss ? 'Bos Pusaka Takluk' : 'Level Selesai'}
              </span>
              <span className="hairline w-10" />
            </div>
            <div className="mt-1 whitespace-nowrap font-display text-4xl font-black text-gold-grad drop-glow-gold sm:text-6xl">
              {PRAISE[level % PRAISE.length]}
            </div>
            <div className="mt-1 text-xs font-bold tracking-[0.5em] text-[#a8721c]">+10</div>
          </div>
        </div>
      )}

      {/* ============ MENU ============ */}
      {phase === 'menu' && (
        <div
          className="pointer-events-auto absolute inset-0 flex flex-col items-center justify-center bg-[rgba(253,243,218,0.55)] px-6 backdrop-blur-[1.5px]"
          onPointerDown={startGame}
        >
          <div className="anim-rise relative mb-5">
            <div className="anim-slowspin absolute -inset-7 rounded-full border border-[#a8721c]/35" />
            <div className="absolute -inset-4 rounded-full border border-[#a8721c]/20" />
            <KerisIcon className="h-20 w-6 -rotate-12" />
          </div>

          <div className="anim-rise-d1 flex items-center gap-3">
            <span className="hairline w-8" />
            <span className="eyebrow text-[#8a5a10]">Pusaka Nusantara • Tembak Sakti</span>
            <span className="hairline w-8" />
          </div>

          <h1 className="anim-title anim-rise-d1 mt-2 text-center font-display text-6xl font-black leading-none text-gold-grad drop-glow-gold sm:text-8xl">
            GUN
          </h1>
          <h1 className="anim-title anim-rise-d2 text-center font-display text-6xl font-black leading-none text-gold-grad drop-glow-gold sm:text-8xl">
            HIT
          </h1>

          <p className="anim-rise-d2 mt-3 text-[11px] font-semibold tracking-[0.5em] text-[#a8721c]">
            K E R I S &nbsp; S U C I
          </p>

          <p className="anim-rise-d3 mt-5 max-w-xs text-center text-sm leading-relaxed text-[#6b4a20]/90">
            Tembakkan keris cahaya suci ke mandala pusaka yang berputar. Pecahkan semuanya — jangan sampai mengenai
            keris yang sudah tertancap.
          </p>

          <div className="anim-rise-d3 mt-5 flex flex-wrap items-center justify-center gap-2">
            {[
              { icon: MousePointerClick, txt: 'Ketuk = tembak' },
              { icon: Target, txt: 'Pecahkan mandala' },
              { icon: ShieldAlert, txt: 'Hindari keris lain' },
            ].map((it, i) => (
              <span
                key={i}
                className="flex items-center gap-1.5 rounded-full border border-[#a8721c]/30 bg-cream-50/75 px-3 py-1.5 text-[11px] font-medium text-cocoa-700 shadow-sm backdrop-blur-sm"
              >
                <it.icon className="h-3.5 w-3.5 text-[#a8721c]" />
                {it.txt}
              </span>
            ))}
          </div>

          <div className="anim-rise-d3 mt-6 flex items-center gap-3">
            <span className="flex items-center gap-1.5 rounded-lg border border-[#a8721c]/30 bg-cream-50/80 px-3 py-1.5 text-xs font-bold text-[#7a4c1c] shadow-sm">
              <Trophy className="h-3.5 w-3.5 text-[#a8721c]" /> TERBAIK {best}
            </span>
            <span className="flex items-center gap-1.5 rounded-lg border border-ruby-400/30 bg-cream-50/80 px-3 py-1.5 text-xs font-bold text-ruby-500 shadow-sm">
              <Gem className="h-3.5 w-3.5" /> {gems}
            </span>
          </div>

          <button
            onPointerDown={(e) => {
              e.stopPropagation();
              startGame();
            }}
            className="btn-sakti anim-rise-d3 mt-8 flex items-center gap-2.5 rounded-full px-12 py-4 text-base font-extrabold tracking-[0.24em]"
          >
            <Play className="h-5 w-5 fill-current" />
            MULAI
          </button>
          <span className="mt-3 animate-pulse text-[10px] font-semibold tracking-[0.4em] text-[#8a5a10]/60">
            ATAU KETUK DI MANA SAJA
          </span>
        </div>
      )}

      {/* ============ GAME OVER ============ */}
      {phase === 'gameover' && (
        <div
          className="pointer-events-auto absolute inset-0 flex items-center justify-center bg-[radial-gradient(90%_80%_at_50%_40%,rgba(190,32,60,0.22),rgba(90,26,10,0.5))] px-5"
          onPointerDown={restart}
        >
          <div
            className="ornate-panel anim-rise w-full max-w-sm rounded-2xl px-7 py-8 text-center"
            onPointerDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-center gap-3">
              <span className="hairline w-10" />
              <span className="eyebrow text-ruby-500/90">Pusaka Patah</span>
              <span className="hairline w-10" />
            </div>

            <h2 className="mt-2 font-display text-5xl font-black text-ember-grad drop-glow-ruby">GAGAL</h2>
            <p className="mt-2 text-xs leading-relaxed text-[#6b4a20]/85">
              Kerismu mengenai keris yang sudah tertancap. Semesta menuntut kesabaran lebih.
            </p>

            <div className="mt-6">
              <div className="eyebrow text-[#96661a]">Skor</div>
              <div className="font-display text-6xl font-black text-gold-grad drop-glow-gold">{score}</div>
              {isNewBest && (
                <div className="mt-2 inline-flex animate-pulse items-center gap-1.5 rounded-full border border-[#a8721c]/50 bg-[#eab449]/25 px-3 py-1 text-[10px] font-bold tracking-[0.3em] text-[#704a10]">
                  <Crown className="h-3 w-3" /> REKOR BARU!
                </div>
              )}
            </div>

            <div className="mt-4 flex items-center justify-center gap-3">
              <span className="flex items-center gap-1.5 rounded-lg border border-[#a8721c]/30 bg-cream-50/85 px-3 py-1.5 text-xs font-bold text-[#7a4c1c] shadow-sm">
                <Trophy className="h-3.5 w-3.5 text-[#a8721c]" /> TERBAIK {best}
              </span>
              <span className="flex items-center gap-1.5 rounded-lg border border-ruby-400/30 bg-cream-50/85 px-3 py-1.5 text-xs font-bold text-ruby-500 shadow-sm">
                <Gem className="h-3.5 w-3.5" /> {gems}
              </span>
            </div>

            <button
              onPointerDown={(e) => {
                e.stopPropagation();
                restart();
              }}
              className="btn-sakti mt-7 flex w-full items-center justify-center gap-2.5 rounded-full px-8 py-4 text-sm font-extrabold tracking-[0.24em]"
            >
              <RefreshCw className="h-4.5 w-4.5" />
              MAIN LAGI
            </button>
            <span className="mt-3 block animate-pulse text-[10px] font-semibold tracking-[0.4em] text-[#8a5a10]/50">
              ATAU KETUK LAYAR
            </span>
          </div>
        </div>
      )}

      {/* footer brand */}
      {phase === 'menu' && (
        <div className="absolute bottom-4 right-5 text-[9px] font-semibold tracking-[0.34em] text-[#8a5a25]/45">
          KERIS GUN • GUN HIT
        </div>
      )}
    </div>
  );
}
