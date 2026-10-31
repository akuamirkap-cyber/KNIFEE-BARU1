import { ThemeLayer } from '../../perfect-shot/theme/Backdrop';
import { THEMES, type Theme, type ThemeId } from '../../perfect-shot/theme/themes';
import type { SgaBackgroundTheme } from '../game/backgroundThemes';

/** Game A's theme ids map 1:1 onto the reference game's twelve designs. */
const THEME_MAP: Record<Exclude<SgaBackgroundTheme, 'auto'>, ThemeId> = {
  forest: 'hutan',
  morning: 'pagi',
  town: 'town',
  snow: 'salju',
  skyline: 'malam',
  battlefield: 'perang',
  mystic: 'mistis',
  crystal: 'kristal',
  yoyo_neon: 'neon',
  royal_vault: 'kubah',
  cyber_grid: 'cyber',
  nebula: 'nebula',
};

/** The reference theme id behind any of Game A's background settings. */
export const sgaThemeIdFor = (theme: SgaBackgroundTheme): ThemeId =>
  theme === 'auto' ? 'hutan' : THEME_MAP[theme];

/** The full reference theme object (sky, skyline, floor, features, particles). */
export function sgaBackdropTheme(theme: SgaBackgroundTheme): Theme {
  const id = sgaThemeIdFor(theme);
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}

/**
 * Game A's menu scenery *is* the reference game's backdrop: every one of the
 * twelve designs (HUTAN, PAGI, TOWN, SALJU, MALAM, PERANG, MISTIS, KRISTAL,
 * NEON, KUBAH, CYBER, NEBULA) is drawn by the same component that draws them
 * in Game B, cross-fading when the player picks another one.
 */
export default function MenuBackdrop({ theme }: { theme: SgaBackgroundTheme }) {
  const backdrop = sgaBackdropTheme(theme);
  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      aria-hidden="true"
      data-menu-environment={theme}
      data-menu-backdrop={backdrop.id}
    >
      <ThemeLayer theme={backdrop} />
    </div>
  );
}
