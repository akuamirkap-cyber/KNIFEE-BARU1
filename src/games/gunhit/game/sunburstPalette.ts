import type { Style } from './faces';
import type { Rarity } from './weapons';

// Knife Boss's SunburstFX accepts RGB triplets. The four Gun Hit tiers use
// separate silver, aqua, violet and gold light on the Menu / Arsenal showcase.
export const GUN_SUNBURST_RGB: Record<Rarity, string> = {
  UMUM: '201,220,238',
  LANGKA: '56,204,248',
  EPIC: '174,104,255',
  LEGENDARIS: '255,193,52',
};

export const gunSunburstColor = (rarity: Rarity) => GUN_SUNBURST_RGB[rarity];

export interface StageClearSunburstTheme {
  rgb: string;
  shockwave: string;
  burstColors: [string, string, string, string];
}

// Pure luminous white sunburst strictly behind the wheel (never yellow, never in front of the wheel).
export const WHITE_WHEEL_SUNBURST: StageClearSunburstTheme = {
  rgb: '255,255,255',
  shockwave: 'rgba(255,255,255,.94)',
  burstColors: ['#ffffff', '#f8fafc', '#f1f5f9', '#e2e8f0'],
};

export const WHEEL_SUNBURST_THEMES: Record<Style, StageClearSunburstTheme> = {
  orange: WHITE_WHEEL_SUNBURST,
  wood: WHITE_WHEEL_SUNBURST,
  target: WHITE_WHEEL_SUNBURST,
  knight: WHITE_WHEEL_SUNBURST,
  oni: WHITE_WHEEL_SUNBURST,
  cyborg: WHITE_WHEEL_SUNBURST,
  pirate: WHITE_WHEEL_SUNBURST,
};

export const SPECIAL_SUNBURST_THEMES: Record<'boulder' | 'bonus' | 'treasure', StageClearSunburstTheme> = {
  boulder: WHITE_WHEEL_SUNBURST,
  bonus: WHITE_WHEEL_SUNBURST,
  treasure: WHITE_WHEEL_SUNBURST,
};

export function getWheelSunburstTheme(style: Style): StageClearSunburstTheme {
  return WHEEL_SUNBURST_THEMES[style] ?? WHITE_WHEEL_SUNBURST;
}

export function getSpecialSunburstTheme(
  mode: 'boulder' | 'bonus' | 'treasure',
): StageClearSunburstTheme {
  return SPECIAL_SUNBURST_THEMES[mode] ?? WHITE_WHEEL_SUNBURST;
}
