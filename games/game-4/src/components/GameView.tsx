import { useEffect, useImperativeHandle, useLayoutEffect, useRef, type Ref } from 'react';
import { Game, type GameInfo } from '../game/Game';
import { sfx } from '../game/audio';
import type { WeaponId } from '../game/weapons';

export interface GameHandle {
  restart(): void;
  fire(): void;
}

interface Props {
  weapon: WeaponId;
  muted: boolean;
  onInfo: (info: GameInfo) => void;
  ref?: Ref<GameHandle>;
}

export function GameView({ weapon, muted, onInfo, ref }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<Game | null>(null);
  const cbRef = useRef(onInfo);
  const weaponRef = useRef(weapon);

  useLayoutEffect(() => {
    cbRef.current = onInfo;
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const g = new Game(canvas, (i) => cbRef.current(i), weaponRef.current);
    gameRef.current = g;
    if (new URLSearchParams(window.location.search).has('debug')) (window as unknown as { __game?: Game }).__game = g;
    return () => {
      g.destroy();
      gameRef.current = null;
    };
  }, []);

  useEffect(() => {
    weaponRef.current = weapon;
    const g = gameRef.current;
    if (g && g.weaponId !== weapon) g.setWeapon(weapon);
  }, [weapon]);

  useEffect(() => {
    sfx.muted = muted;
  }, [muted]);

  useImperativeHandle(
    ref,
    () => ({
      restart: () => gameRef.current?.reset(),
      fire: () => gameRef.current?.fire(),
    }),
    [],
  );

  return <canvas ref={canvasRef} className="block h-full w-full cursor-crosshair touch-none select-none" />;
}
