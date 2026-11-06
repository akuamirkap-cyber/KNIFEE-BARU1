import { useEffect, useRef } from 'react';
import { PistolGame, type GameEvent } from '../game';
import { renderGame } from '../render';
import { W, H } from '../config';

export function GameBoard({ game, active, onEvent, onFire }: { game: PistolGame; active: boolean; onEvent(event: GameEvent): void; onFire(): void }) {
  const ref = useRef<HTMLCanvasElement>(null), eventRef = useRef(onEvent);
  eventRef.current = onEvent;
  useEffect(() => {
    const cv = ref.current, ctx = cv?.getContext('2d', { alpha: false }); if (!cv || !ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2); cv.width = W * dpr; cv.height = H * dpr;
    let raf = 0, last = 0;
    const paint = (now: number) => {
      if (active && !document.hidden && last) game.update((now - last) / 1000);
      last = now;
      for (const e of game.takeEvents()) eventRef.current(e);
      renderGame(ctx, game, cv.width, cv.height);
      cv.dataset.ammo = String(game.ammo); cv.dataset.score = String(game.score); cv.dataset.phase = game.phase; cv.dataset.elapsed = game.elapsed.toFixed(4);
      cv.setAttribute('aria-label', `Level 1, PISTOL, ${game.ammo} peluru, skor ${game.score}. Ketuk atau tekan Spasi untuk menembak.`);
      if (active) raf = requestAnimationFrame(paint);
    };
    paint(performance.now());
    return () => cancelAnimationFrame(raf);
  }, [game, active]);
  return <canvas ref={ref} data-game-board data-phase={game.phase} data-ammo={game.ammo} data-score={game.score} width={W} height={H} className="absolute inset-0 h-full w-full touch-none select-none" role="button" tabIndex={0} aria-label="Level 1, PISTOL. Ketuk atau tekan Spasi untuk menembak." onPointerDown={e => { e.preventDefault(); if (active) onFire(); }} />;
}
