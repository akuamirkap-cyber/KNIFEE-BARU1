/** Canvas lifecycle, letterboxing, DPR, input and one-shot event delivery. */
import { GH, GW } from '../config';
import { Game, type GameEvent, type Outcome } from '../game';
import { draw, type DrawOptions } from './draw';
import { createSpriteCache } from './cache';

export interface MountOptions {
  game?: Game;
  weapon?: string;
  paused?: boolean;
  /** Disable shots while menus are open without destroying the run. */
  input?: () => boolean;
  presentation?: () => DrawOptions;
  onGesture?: () => void;
  onEvent?: (event: GameEvent, game: Game) => void;
  onEnd?: (outcome: Outcome, game: Game) => void;
}
export interface Mounted {
  game: Game;
  destroy(): void;
  pause(): void;
  resume(): void;
  fire(): boolean;
  paint(): void;
  resize(): void;
  readonly running: boolean;
}

export function mount(canvas: HTMLCanvasElement, opts: MountOptions = {}): Mounted {
  const context = canvas.getContext('2d');
  if (!context) throw new Error('perfect-shot-v2: 2D canvas unavailable');
  const ctx = context;
  const game = opts.game ?? new Game(opts.weapon);
  const cache = createSpriteCache(() => canvas.ownerDocument.createElement('canvas'));
  let raf = 0, last: number | null = null, running = false, destroyed = false, delivered = false;
  let needsFit = true, width = 1, height = 1, scale = 1, ox = 0, oy = 0;

  function fit(): void {
    if (!needsFit) return;
    needsFit = false;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    width = Math.max(1, Math.round(rect.width * dpr));
    height = Math.max(1, Math.round(rect.height * dpr));
    if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
    scale = Math.min(width / GW, height / GH); ox = (width - GW * scale) / 2; oy = (height - GH * scale) / 2;
  }
  function paint(): void {
    if (destroyed) return;
    fit();ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,width,height);
    ctx.setTransform(scale,0,0,scale,ox,oy);draw(ctx,game.scene,{...opts.presentation?.(),cache});
  }
  function flushEvents(): void { for (const event of game.takeEvents()) opts.onEvent?.(event,game); }
  function tick(now: number): void {
    if (!running || destroyed) return;
    const dt = last === null ? 1/60 : (now-last)/1000;last = now;
    game.update(dt);flushEvents();paint();
    if (game.scene.status === 'play') delivered = false;
    if (!delivered && game.ended) {
      delivered = true;
      if (game.scene.outcome) opts.onEnd?.(game.scene.outcome,game);
    }
    // The host may have paused or destroyed us from a callback.
    if (running && !destroyed) raf = requestAnimationFrame(tick);
  }
  function fire(): boolean {
    if (!running || destroyed || opts.input?.() === false) return false;
    opts.onGesture?.();const fired = game.fire();flushEvents();return fired;
  }
  const onPointer = (event: PointerEvent) => {
    if (event.isPrimary === false || opts.input?.() === false || !running) return;
    event.preventDefault();event.stopPropagation();fire();
  };
  const onKey = (event: KeyboardEvent) => {
    if (!['Space','ArrowUp','Enter'].includes(event.code) || opts.input?.() === false || !running) return;
    const target = event.target as Element | null;
    if (target?.closest?.('input,textarea,select,[contenteditable="true"]')) return;
    // Buttons retain native Enter/Space behaviour (e.g. the accessible fire
    // button). Neither that key nor an arena shot should leak to a v1 beneath us.
    event.stopImmediatePropagation();
    if (target?.closest?.('button,a')) return;
    event.preventDefault();if (!event.repeat) fire();
  };
  const resize = () => { needsFit = true;paint(); };
  const pause = () => { running = false;cancelAnimationFrame(raf);last = null; };
  const resume = () => {
    if (running || destroyed) return;
    running = true;last = null;paint();raf = requestAnimationFrame(tick);
  };
  canvas.addEventListener('pointerdown',onPointer);
  window.addEventListener('keydown',onKey,true);
  window.addEventListener('resize',resize);
  const api: Mounted = {
    game,paint,fire,pause,resume,resize,get running() { return running; },
    destroy() {
      if (destroyed) return;pause();destroyed = true;
      canvas.removeEventListener('pointerdown',onPointer);
      window.removeEventListener('keydown',onKey,true);window.removeEventListener('resize',resize);cache.clear();
    },
  };
  if (!opts.paused) resume(); else paint();
  return api;
}
