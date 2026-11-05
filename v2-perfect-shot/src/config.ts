/**
 * PERFECT SHOT — v2 config.
 *
 * Every number that shapes the run lives here, so a host can retune the whole
 * game without touching a line of logic. Units are CSS px on a fixed 480 x 960
 * board: `update()` and `render()` both assume that board, and the host scales
 * the canvas to fit (see `render/attach.ts`).
 */

export const GW = 480;
export const GH = 960;

/** Wheel centre and radius. */
export const CX = GW / 2;
export const CY = 360;
export const RADIUS = 112;

/** Where the gun's grip sits on the board (muzzle = BASE - muzzleLength). */
export const BASE = 828;

/** The launcher muzzle is always centred on the target, even during recoil. */
export const MUZZLE = BASE - 116;

/** Knives needed to clear one level. Constant, so every level reads the same. */
export const HITS_TO_WIN = 10;

/** Lives per run. A knife on a knife costs one; at zero the run is over. */
export const LIVES = 3;

/** Seconds the win burst gets before the host is told the level is over. */
export const END_HOLD = 1.35;

/**
 * Half-angle (radians) inside which an incoming knife is judged to hit a knife
 * that is already stuck. 0.12 rad ≈ 6.9°, about half a knife blade.
 */
export const COLLIDE = 0.12;

/** Seconds a knife spends between the muzzle and the rim. */
export const FLIGHT = 0.16;

/** Scoring. A landing is worth `HIT × level`, times the combo multiplier. */
export const SCORE = {
  hit: 100,
  /** Each consecutive landing adds this much multiplier… */
  comboStep: 0.25,
  /** …up to this. */
  comboMax: 4,
  /** Clearing a level without losing a knife. */
  perfect: 500,
  /** Clearing a level at all, times the level number. */
  clear: 200,
  /** Coins granted per cleared level. */
  coinsPerLevel: 25,
  /** Coins for a perfect clear. */
  coinsPerfect: 40,
  /** Bonus coins for hitting a rotating token on the rim. */
  token: 5,
};

/** Board palettes. A level picks one; the shell can preview them. */
export interface Palette {
  id: string;
  /** Backdrop, top to bottom. */
  sky0: string;
  sky1: string;
  /** Distant shapes behind the wheel. */
  hill0: string;
  hill1: string;
  /** Star / dust specks. */
  dust: string;
  /** Warm light pool behind the wheel. */
  glow: string;
}

export const PALETTES: Record<string, Palette> = {
  dusk: {
    id: 'dusk',
    sky0: '#1b1430',
    sky1: '#3a2140',
    hill0: '#241a3c',
    hill1: '#33234a',
    dust: 'rgba(255,226,190,0.55)',
    glow: 'rgba(255,170,110,0.16)',
  },
  night: {
    id: 'night',
    sky0: '#08111f',
    sky1: '#12233a',
    hill0: '#0d1a2b',
    hill1: '#16293f',
    dust: 'rgba(190,225,255,0.5)',
    glow: 'rgba(120,180,255,0.15)',
  },
  jungle: {
    id: 'jungle',
    sky0: '#0a1a15',
    sky1: '#123026',
    hill0: '#0d241c',
    hill1: '#14342a',
    dust: 'rgba(190,255,210,0.45)',
    glow: 'rgba(120,255,180,0.13)',
  },
  ember: {
    id: 'ember',
    sky0: '#1d0f10',
    sky1: '#3d1a12',
    hill0: '#2a1210',
    hill1: '#3d1c15',
    dust: 'rgba(255,190,150,0.5)',
    glow: 'rgba(255,120,60,0.18)',
  },
  frost: {
    id: 'frost',
    sky0: '#0e1a22',
    sky1: '#1f3644',
    hill0: '#14242e',
    hill1: '#1e3a48',
    dust: 'rgba(220,245,255,0.6)',
    glow: 'rgba(150,230,255,0.16)',
  },
};

/** Shared ink, so HUD text and the gun always agree with each other. */
export const INK = {
  hud: '#f5e2bd',
  hudDim: 'rgba(245,226,189,0.45)',
  win: '#8be08b',
  lose: '#ff8a8a',
  gold: '#ffd77a',
  gun: '#2b3442',
  gunLight: '#4a5768',
  gunDark: '#141a24',
  aim: 'rgba(255,255,255,0.22)',
};

export const TAU = Math.PI * 2;

/** Clamp helper used across the renderer. */
export const clamp = (v: number, lo: number, hi: number): number =>
  v < lo ? lo : v > hi ? hi : v;

/** Smooth 0…1 ramp. */
export const easeOut = (t: number): number => 1 - Math.pow(1 - clamp(t, 0, 1), 3);
