import { Component, lazy, Suspense, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import ScaledFrame from './components/ScaledFrame';
import { SlideActivityProvider } from './games/shared/SlideActivity';
import { juicyAudio } from './utils/juicyAudio';
import { sfx as studioSfx } from './games/perfect-shot/audio/sfx';

// Keep the entry bundle small; preload SGA behind the intro so parsing does not
// stall the first menu entrance as the logo disappears.
const loadGunHitGame = () => import('./games/gunhit/App');
const GunHitGame = lazy(loadGunHitGame);
const PerfectShotGame = lazy(() => import('./games/perfect-shot/EmbeddedApp'));
const SansStudioLoading = lazy(() => import('./components/SansStudioLoading'));
type GamePane = 'sga' | 'perfect-shot';

function GameBootFallback({ message = 'MEMUAT GAME' }: { message?: string }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-[#0b1418] text-slate-200" role="status" aria-live="polite">
      <span className="h-7 w-7 animate-spin rounded-full border-2 border-slate-700 border-t-sky-400" />
      <span className="text-xs font-semibold tracking-[0.16em]">{message}</span>
    </div>
  );
}

class GameLoadBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }

  render() {
    if (this.state.failed) {
      return (
        <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-[#0b1418] px-6 text-center text-slate-200" role="alert">
          <span className="text-sm font-semibold">Game belum berhasil dimuat.</span>
          <button className="rounded-md bg-sky-700 px-4 py-2 text-sm font-semibold text-white" onClick={() => window.location.reload()}>
            Coba muat ulang
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export type SlideId = 'gunhit';

export default function App() {
  const [pageVisible, setPageVisible] = useState(() => !document.hidden);
  // Play the SANS STUDIO opening once on startup; Settings can replay it later.
  const [loading, setLoading] = useState(true);
  const [hasBooted, setHasBooted] = useState(false);
  const [introRunKey, setIntroRunKey] = useState(0);
  const [activeGame, setActiveGame] = useState<GamePane>('sga');
  const gameStageRef = useRef<HTMLDivElement>(null);

  const selectGame = useCallback((game: GamePane) => {
    setActiveGame(game);
    const stage = gameStageRef.current;
    if (stage) stage.scrollTo({ left: game === 'sga' ? 0 : stage.clientWidth, behavior: 'smooth' });
  }, []);

  const handleStageScroll = useCallback(() => {
    const stage = gameStageRef.current;
    if (!stage || stage.scrollWidth <= stage.clientWidth + 2) return;
    setActiveGame(stage.scrollLeft >= stage.clientWidth * 0.45 ? 'perfect-shot' : 'sga');
  }, []);

  useEffect(() => {
    void loadGunHitGame().catch(() => undefined);
  }, []);

  // Freeze RAF simulation when browser tab / mobile app goes to background
  useEffect(() => {
    const updateVisibility = () => setPageVisible(!document.hidden);
    document.addEventListener('visibilitychange', updateVisibility);
    return () => document.removeEventListener('visibilitychange', updateVisibility);
  }, []);

  // Allow replaying the SANS STUDIO 2D Game Intro anytime from SGA Settings
  useEffect(() => {
    const onReplay = () => {
      juicyAudio.unlock();
      setIntroRunKey((k) => k + 1);
      setLoading(true);
    };
    window.addEventListener('sans-replay-intro', onReplay);
    return () => window.removeEventListener('sans-replay-intro', onReplay);
  }, []);

  useEffect(() => {
    if (loading || !hasBooted) return;
    const timer = window.setTimeout(() => {
      window.dispatchEvent(new CustomEvent('sans-intro-complete', {
        detail: { replay: introRunKey > 0 },
      }));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loading, hasBooted, introRunKey]);

  const handleLoadingComplete = useCallback(() => {
    setLoading(false);
    setHasBooted(true);
    juicyAudio.suspendAfterIntro(550);
  }, []);

  return (
    <div
      className="fixed inset-0 flex h-dvh w-full flex-col overflow-hidden bg-[#05060a] select-none touch-manipulation"
      onPointerDownCapture={(event) => {
        const target = event.target as Element | null;
        if (!target?.closest('button, [role="button"]')) return;
        studioSfx.init();
        if (studioSfx.getState().music) studioSfx.startMusic();
      }}
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
        paddingLeft: 'env(safe-area-inset-left)',
        paddingRight: 'env(safe-area-inset-right)',
      }}
    >
      <nav className="relative z-[70] flex h-10 shrink-0 items-center justify-center gap-2 border-b border-white/10 bg-[#090c12] px-2" aria-label="Pilih game">
        <button
          type="button"
          aria-pressed={activeGame === 'sga'}
          onClick={() => selectGame('sga')}
          className={`rounded-md border px-3 py-1 text-[10px] font-semibold tracking-wide transition-colors ${activeGame === 'sga' ? 'border-sky-500 bg-sky-950 text-sky-200' : 'border-slate-700 bg-[#151922] text-slate-400 hover:text-white'}`}
        >
          A · GUNHIT <span className="text-slate-500">SGA</span>
        </button>
        <button
          type="button"
          aria-pressed={activeGame === 'perfect-shot'}
          onClick={() => selectGame('perfect-shot')}
          className={`rounded-md border px-3 py-1 text-[10px] font-semibold tracking-wide transition-colors ${activeGame === 'perfect-shot' ? 'border-emerald-500 bg-emerald-950 text-emerald-200' : 'border-slate-700 bg-[#151922] text-slate-400 hover:text-white'}`}
        >
          B · PERFECT SHOT
        </button>
        <span className="hidden text-[9px] text-slate-500 sm:inline">Geser layar untuk berpindah</span>
      </nav>

      <div ref={gameStageRef} onScroll={handleStageScroll} className="game-pair">
        <section className="game-pane" data-game-pane="sga" data-game-id="A" data-game-name="GUNHIT" aria-label="Game A - Gun Hit SGA">
          <SlideActivityProvider active={pageVisible && !loading && activeGame === 'sga'}>
            <GameLoadBoundary>
              <ScaledFrame baseWidth={420} baseHeight={760}>
                <div className="relative h-[760px] w-[420px] overflow-hidden">
                  {hasBooted ? (
                    <Suspense fallback={<GameBootFallback />}>
                      <GunHitGame introReady={hasBooted && !loading} />
                    </Suspense>
                  ) : (
                    <GameBootFallback message="MENYIAPKAN SGA" />
                  )}
                </div>
              </ScaledFrame>
            </GameLoadBoundary>
          </SlideActivityProvider>
        </section>

        <section className="game-pane" data-game-pane="perfect-shot" data-game-id="B" data-game-name="PERFECT SHOT" aria-label="Game B - Perfect Shot">
          <GameLoadBoundary>
            <ScaledFrame baseWidth={420} baseHeight={760}>
              <div className="relative h-[760px] w-[420px] overflow-hidden">
                <Suspense fallback={<GameBootFallback message="MEMUAT PERFECT SHOT" />}>
                  <PerfectShotGame />
                </Suspense>
              </div>
            </ScaledFrame>
          </GameLoadBoundary>
        </section>
      </div>

      {loading && (
        <Suspense fallback={<GameBootFallback message="MEMUAT INTRO" />}>
          <SansStudioLoading
            key={introRunKey}
            active={pageVisible}
            onComplete={handleLoadingComplete}
          />
        </Suspense>
      )}
    </div>
  );
}
