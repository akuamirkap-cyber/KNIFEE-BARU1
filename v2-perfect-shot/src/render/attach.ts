/**
 * PERFECT SHOT — v2 canvas driver.
 *
 * Wires a `Game` to a `<canvas>` and a tap: the same 25 lines a host needs,
 * including the only two things that usually go wrong — device pixel ratio and
 * a board that has to fit a screen of a different shape.
 */
import { GH, GW } from '../config';
import { draw } from './draw';
import { Game, type Outcome } from '../game';

export interface MountOptions {
  /** Called once per finished level. After this the page can show its own screen. */
  onEnd?: (outcome: Outcome, game: Game) => void;
  /** Weapon id for `game.ts`'s catalogue. */
  weapon?: string;
  /** Start the loop paused; `resume()` is safe to call at any time. */
  paused?: boolean;
}

export interface Mounted {
  game: Game;
  /** Stop the loop, drop the listeners. */
  destroy(): void;
  pause(): void;
  resume(): void;
  /** Fire once (also bound to pointerdown / space). */
  fire(): void;
  /** Draw a single frame — for a paused preview or a screenshot. */
  paint(): void;
}

/** Mount the game on a canvas and start its loop. */
export function mount(canvas: HTMLCanvasElement, opts: MountOptions = {}): Mounted {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('perfect-shot-v2: 2D context unavailable');

  const game = new Game(opts.weapon ?? 'knife');
  let raf = 0;
  let last = 0;
  let running = false;
  let ended = false;

  /** Fit the 480×960 board inside the canvas, letterboxed, at device pixel ratio. */
  const fit = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    const w = Math.max(1, Math.round(rect.width * dpr));
    const h = Math.max(1, Math.round(rect.height * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    const scale = Math.min(w / GW, h / GH);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.setTransform(scale, 0, 0, scale, (w - GW * scale) / 2, (h - GH * scale) / 2);
  };

  const paint = () => {
    fit();
    draw(ctx, game.scene);
  };

  const tick = (now: number) => {
    if (!running) return;
    const dt = last ? (now - last) / 1000 : 1 / 60;
    last = now;
    game.update(dt);
    paint();
    // Hand the outcome to the page exactly once, and stop simulating: the host
    // owns whatever comes next (retry screen, next level, reward…).
    if (!ended && game.ended) {
      ended = true;
      running = false;
      const outcome = game.scene.outcome;
      if (outcome) opts.onEnd?.(outcome, game);
      return;
    }
    raf = requestAnimationFrame(tick);
  };

  const onPointer = (e: PointerEvent) => {
    e.preventDefault();
    if (running) game.fire();
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'Enter') {
      e.preventDefault();
      if (running) game.fire();
    }
  };
  const onResize = () => paint();

  canvas.addEventListener('pointerdown', onPointer);
  window.addEventListener('keydown', onKey);
  window.addEventListener('resize', onResize);

  const resume = () => {
    if (running) return;
    running = true;
    ended = false;
    last = 0;
    paint();
    raf = requestAnimationFrame(tick);
  };

  const api: Mounted = {
    game,
    paint,
    fire: () => game.fire(),
    resume,
    pause: () => {
      running = false;
      cancelAnimationFrame(raf);
    },
    destroy: () => {
      running = false;
      cancelAnimationFrame(raf);
      canvas.removeEventListener('pointerdown', onPointer);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onResize);
    },
  };

  if (!opts.paused) resume();
  else paint();
  return api;
}
