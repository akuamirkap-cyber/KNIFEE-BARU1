import { useCallback, useRef, useState } from 'react';
import GameCanvas from './components/GameCanvas';
import HUD from './components/HUD';
import type { GameEngine } from './game/engine';
import type { Status } from './game/types';

export default function App() {
  const [status, setStatus] = useState<Status | null>(null);
  const engineRef = useRef<GameEngine | null>(null);

  const handleReady = useCallback((e: GameEngine) => {
    engineRef.current = e;
    setStatus(e.snapshot());
  }, []);

  const getEngine = useCallback(() => engineRef.current, []);

  return (
    <div className="fixed inset-0 select-none overflow-hidden bg-cream-100">
      <GameCanvas onStatus={setStatus} onReady={handleReady} />
      {status && <HUD status={status} engine={getEngine} />}
    </div>
  );
}
