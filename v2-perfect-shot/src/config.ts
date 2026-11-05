/**
 * PERFECT SHOT — v2 config.
 *
 * Every number that shapes the run lives here, so a new project can retune the
 * whole game without touching a line of logic. Units are CSS px on a fixed
 * 480 x 960 board: `update()` and `render()` both assume that board, and the
 * host scales the canvas to fit (see `render/attach.ts`).
 */

export const GW = 480;
export const GH = 960;

/** Wheel centre and radius. */
export const CX = GW / 2;
export const CY = 185;
export const RADIUS = 92;

/** Where the gun's grip sits on the board (muzzle = BASE - muzzleLength). */
export const BASE = 900;

/** Knives needed to clear one level. */
export const HITS_TO_WIN = 10;

/** Seconds the win burst gets before the host is told the level is over. */
export const END_HOLD = 1.1;

/**
 * Half-angle (radians) inside which an incoming knife is judged to hit a knife
 * that is already stuck. 0.12 rad ≈ 6.9°, about half a knife blade.
 */
export const COLLIDE = 0.12;

/** Knives already stuck in the wheel when a level opens. */
export const START_STUCK: { angle: number; kind: string }[] = [
  { angle: 0.6, kind: 'arrow' },
  { angle: 3.4, kind: 'arrow' },
];

/** Spin profile: a steady base speed with a sine swell, so the wheel never sits still. */
export const SPIN = {
  /** Base angular speed, rad/s. */
  base: 2.1,
  /** Swell amplitude, rad/s. */
  swell: 0.55,
  /** Swell frequency, rad/s. */
  swellHz: 0.42,
};

/** The board's own dark theme. The host may pass its own palette instead. */
export interface Theme {
  sky0: string;
  sky1: string;
  wheel0: string;
  wheel1: string;
  wheel2: string;
  ring: string;
  hub: string;
  aim: string;
  gun: string;
  gunLight: string;
  gunDark: string;
  hud: string;
}

export const THEME: Theme = {
  sky0: '#0a0f18',
  sky1: '#16202c',
  wheel0: '#8a5730',
  wheel1: '#b8763f',
  wheel2: '#5d3a1e',
  ring: '#e0b679',
  hub: '#f0c98a',
  aim: 'rgba(255,255,255,0.22)',
  gun: '#2b3442',
  gunLight: '#4a5768',
  gunDark: '#141a24',
  hud: '#f5d9a8',
};
