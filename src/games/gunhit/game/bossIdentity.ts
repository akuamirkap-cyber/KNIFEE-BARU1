import { levelConfig } from '../../perfect-shot/play/levels';
import { HEAD_INFO, type HeadKind } from '../../perfect-shot/play/HeadArt';

/**
 * Which boss is this? Game A draws Perfect Shot's own heads, so the boss' name,
 * colours and (legacy) style must come from the *same* source as the artwork.
 *
 * Slide 1 used to keep its own list — `['DARK KNIGHT', 'ONI DEMON', …]` indexed by
 * every fifth stage — while the head art came from Perfect Shot's `BOSS_ORDER`
 * (stage 5 is the pirate, not a knight). The HUD then announced "BOSS • DARK
 * KNIGHT" over a pirate, and the name disagreed with the thing on screen.
 *
 * One source of truth now: `levelConfig(n).head`.
 */
export type BossArtStyle = 'knight' | 'oni' | 'cyborg' | 'pirate';

/** Heads grouped by the legacy style that still tints decals and accents. */
const HEAD_STYLE: Record<HeadKind, BossArtStyle> = {
  pirate: 'pirate',
  jester: 'pirate',
  viking: 'pirate',
  oni: 'oni',
  dragon: 'oni',
  tiki: 'oni',
  sun: 'oni',
  skeleton: 'knight',
  vampire: 'knight',
  robot: 'cyborg',
  alien: 'cyborg',
};

/** The head Perfect Shot puts on this stage, or null for a non-boss stage. */
export function bossHeadFor(level: number): HeadKind | null {
  const cfg = levelConfig(level);
  return cfg.boss && cfg.head ? cfg.head : null;
}

/** The boss' own name, exactly as the game that owns the artwork calls it. */
export function bossNameFor(level: number): string {
  const head = bossHeadFor(level);
  return head ? HEAD_INFO[head].name.toUpperCase() : '';
}

/** Short label for logs/debug overlays, e.g. `PIRATE`. */
export function bossSlugFor(level: number): string {
  const head = bossHeadFor(level);
  return head ? head.toUpperCase() : '';
}

/** The legacy style bucket this head belongs to. */
export function bossStyleFor(level: number): BossArtStyle | null {
  const head = bossHeadFor(level);
  return head ? HEAD_STYLE[head] : null;
}

export function headInfoFor(level: number) {
  const head = bossHeadFor(level);
  return head ? HEAD_INFO[head] : null;
}
