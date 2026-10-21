import { useEffect, useRef } from 'react';
import { GameEngine } from '../game/engine';
import type { Status } from '../game/types';

interface Props {
  onStatus: (s: Status) => void;
  onReady: (e: GameEngine) => void;
}

export default function GameCanvas({ onStatus, onReady }: Props) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const statusRef = useRef(onStatus);
  const readyRef = useRef(onReady);
  statusRef.current = onStatus;
  readyRef.current = onReady;

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const engine = new GameEngine(cv);
    engine.onStatus = (s) => statusRef.current(s);
    readyRef.current(engine);
    engine.start();

    const down = (e: PointerEvent) => {
      e.preventDefault();
      engine.primary();
    };
    const block = (e: Event) => e.preventDefault();

    cv.addEventListener('pointerdown', down);
    cv.addEventListener('contextmenu', block);
    window.addEventListener('touchmove', block, { passive: false });

    return () => {
      cv.removeEventListener('pointerdown', down);
      cv.removeEventListener('contextmenu', block);
      window.removeEventListener('touchmove', block);
      engine.destroy();
    };
  }, []);

  return <canvas ref={ref} className="absolute inset-0 block h-full w-full" style={{ touchAction: 'none' }} />;
}
