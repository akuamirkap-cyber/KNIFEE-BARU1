/**
 * PERFECT SHOT — v2 levels.
 *
 * A level is generated from its number, so the run is endless and the curve is
 * one readable function instead of a table. Each level brings:
 *   · a target (what the wheel looks like, and what it bursts into),
 *   · a spin pattern (steady / wave / reverse / pulse / boss),
 *   · a speed that climbs with the level,
 *   · a few knives already stuck in the wheel,
 *   · a backdrop palette.
 *
 * `HITS_TO_WIN` landings clear it. The campaign wraps: level 31 is level 1 with
 * a "lap" badge and a speed penalty, so the game never runs out.
 */
import { HITS_TO_WIN, PALETTES, type Palette } from './config';
import type { Shape } from './weapons';

export type TargetKind =
  | 'orange' | 'wood' | 'watermelon' | 'lime' | 'lemon'
  | 'apple' | 'durian' | 'kiwi' | 'pineapple' | 'coconut'
  | 'soccer' | 'basketball' | 'tennis' | 'baseball' | 'bowling'
  | 'dartboard' | 'carrom' | 'casino' | 'eightball' | 'target'
  | 'moon' | 'mars' | 'jupiter' | 'pluto' | 'ufo'
  | 'disco' | 'peppermint' | 'friedegg' | 'pearl' | 'boss';

export type Pattern = 'steady' | 'wave' | 'reverse' | 'pulse' | 'boss';

export interface Level {
  /** 1-based level number, counting across laps. */
  n: number;
  /** 1-based lap; level 31 is lap 2 level 1. */
  lap: number;
  /** Name shown on the level card. */
  name: string;
  target: TargetKind;
  pattern: Pattern;
  /** Base spin, rad/s. */
  base: number;
  /** Knives already stuck when the level opens. */
  obstacles: number;
  /** Clear the level = 10 landings. */
  aim: number;
  palette: Palette;
  boss: boolean;
}

/** One entry per campaign level; the run wraps after this. */
const ROSTER: { name: string; target: TargetKind }[] = [
  { name: 'Orange Grove', target: 'orange' },
  { name: 'Wood Yard', target: 'wood' },
  { name: 'Melon Patch', target: 'watermelon' },
  { name: 'Lime Stand', target: 'lime' },
  { name: 'Lemon Tree', target: 'lemon' },
  { name: 'Backyard Match', target: 'soccer' },
  { name: 'Hoops', target: 'basketball' },
  { name: 'Center Court', target: 'tennis' },
  { name: 'Night League', target: 'baseball' },
  { name: 'Boss: BOSS RIM', target: 'boss' },
  { name: 'Carrom Board', target: 'carrom' },
  { name: 'Orchard', target: 'apple' },
  { name: 'Durian King', target: 'durian' },
  { name: 'Kiwi Slice', target: 'kiwi' },
  { name: 'Pineapple Crown', target: 'pineapple' },
  { name: 'Disco Ball', target: 'disco' },
  { name: 'Candy Cane', target: 'peppermint' },
  { name: 'Breakfast', target: 'friedegg' },
  { name: 'Pearl Diver', target: 'pearl' },
  { name: 'Boss: NIGHT SKY', target: 'boss' },
  { name: 'Moon Base', target: 'moon' },
  { name: 'Red Planet', target: 'mars' },
  { name: 'Gas Giant', target: 'jupiter' },
  { name: 'Ice Dwarf', target: 'pluto' },
  { name: 'Close Encounter', target: 'ufo' },
  { name: 'Casino Night', target: 'casino' },
  { name: 'Eight Ball', target: 'eightball' },
  { name: 'Dartboard', target: 'dartboard' },
  { name: 'Coconut Shy', target: 'coconut' },
  { name: 'Boss: GRAND RIM', target: 'boss' },
];

const PALETTE_ORDER = ['dusk', 'night', 'jungle', 'ember', 'frost'];
const PATTERN_ORDER: Pattern[] = ['steady', 'wave', 'reverse', 'pulse'];

/** Campaign length before the run wraps. */
export const CAMPAIGN = ROSTER.length;

export function levelConfig(number: number): Level {
  const n = Number.isFinite(number) ? Math.max(1, Math.floor(number)) : 1;
  const lap = Math.floor((Math.max(1, n) - 1) / CAMPAIGN) + 1;
  const i = (Math.max(1, n) - 1) % CAMPAIGN;
  const entry = ROSTER[i];
  const boss = entry.target === 'boss';
  // Lap 2+ adds a small speed penalty so a wrapped run is not a victory lap.
  const lapPenalty = (lap - 1) * 0.25;

  return {
    n,
    lap,
    name: entry.name,
    target: entry.target,
    pattern: boss ? 'boss' : PATTERN_ORDER[Math.floor(i / 2) % PATTERN_ORDER.length],
    // 1.5 → 3.9 rad/s over the campaign; ~86°/s up to ~224°/s.
    base: Math.min(5.4, Math.min(3.9, 1.5 + i * 0.085) + lapPenalty),
    obstacles: boss ? Math.min(5, 3 + Math.floor(i / 10)) : Math.min(5, 1 + Math.floor(i / 6)),
    aim: HITS_TO_WIN,
    palette: PALETTES[PALETTE_ORDER[Math.floor(i / CAMPAIGN * 5) % 5]] ?? PALETTES.dusk,
    boss,
  };
}

/**
 * Wheel angular speed at `t` seconds into the level, rad/s.
 *
 * `boss` is a 6 s cycle: fast spin → fake brake → reverse burst → freeze →
 * jitter. That is what makes boss levels a different kind of hard, not just a
 * faster version of the same thing.
 */
export function speedAt(level: Level, t: number): number {
  const b = level.base;
  switch (level.pattern) {
    case 'steady':
      return b;
    case 'wave':
      return b * (1 + 0.6 * Math.sin(t * 1.7));
    case 'reverse':
      return b * 1.3 * Math.sin(t * 0.85);
    case 'pulse':
      return b * (0.32 + 1.45 * Math.pow(Math.max(0, Math.sin(t * 2.2)), 2));
    case 'boss': {
      const c = t % 6;
      if (c < 2.1) return b * 1.2;
      if (c < 2.6) return b * 0.12;
      if (c < 4.1) return -b * 1.4;
      if (c < 4.5) return 0;
      return b * (0.85 + 0.7 * Math.sin(t * 6));
    }
  }
}

/** The i-th already-stuck knife of level `n` — angle and silhouette. */
export function openingKnife(n: number, i: number): { angle: number; shape: Shape } {
  // Spread the obstacles evenly but not symmetrically, and let the level number
  // shift the pattern so consecutive levels don't open identically.
  const gold = Math.PI * (3 - Math.sqrt(5));
  const shapes: Shape[] = ['knife', 'arrow', 'bullet'];
  return {
    angle: (n * 0.7 + i * gold) % (Math.PI * 2),
    shape: shapes[(n + i) % 3],
  };
}

/** The live spin cue shown below the level name. */
export function patternLabel(level: Level, time: number): string {
  if (level.boss) {
    const t = time % 6;
    return t < 2.1 ? 'OVERDRIVE' : t < 2.6 ? 'BRAKE' : t < 4.1 ? 'REVERSE' : t < 4.5 ? 'FREEZE' : 'UNSTABLE';
  }
  return { steady: 'STEADY SPIN', wave: 'SPEED WAVE', reverse: 'REVERSE SPIN', pulse: 'PULSE SPIN', boss: 'BOSS' }[level.pattern];
}
