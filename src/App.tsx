import { useCallback, useEffect, useState } from 'react';
import ScaledFrame from './components/ScaledFrame';
import SansStudioLoading from './components/SansStudioLoading';
import { SlideActivityProvider } from './games/shared/SlideActivity';
import GunHitGame from './games/gunhit/App';
import { juicyAudio } from './utils/juicyAudio';

export type SlideId = 'gunhit';

export default function App() {
  const [pageVisible, setPageVisible] = useState(() => !document.hidden);
  const [loading, setLoading] = useState(true);
  const [introRunKey, setIntroRunKey] = useState(0);

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

  const handleLoadingComplete = useCallback(() => {
    setLoading(false);
    juicyAudio.suspendAfterIntro(550);
  }, []);

  return (
    <div
      className="fixed inset-0 w-full h-dvh bg-[#05060a] overflow-hidden select-none touch-manipulation"
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
        paddingLeft: 'env(safe-area-inset-left)',
        paddingRight: 'env(safe-area-inset-right)',
      }}
    >
      <SlideActivityProvider active={pageVisible && !loading}>
        <ScaledFrame baseWidth={420} baseHeight={760}>
          <div className="relative h-[760px] w-[420px] overflow-hidden">
            <GunHitGame />
          </div>
        </ScaledFrame>
      </SlideActivityProvider>

      {loading && (
        <SansStudioLoading
          key={introRunKey}
          active={pageVisible}
          onComplete={handleLoadingComplete}
        />
      )}
    </div>
  );
}
