import MenuBackdrop from './MenuBackdrop';
import type { SgaBackgroundTheme } from '../game/backgroundThemes';

export type MenuEnvironmentTheme = SgaBackgroundTheme;

/**
 * Game A's menu world is the reference game's own scenery. Every selectable
 * background (HUTAN, PAGI, TOWN, SALJU, MALAM, PERANG, MISTIS, KRISTAL, NEON,
 * KUBAH, CYBER, NEBULA) is drawn by Game B's backdrop component, so the two
 * games can never drift apart in background art.
 */
export default function MenuEnvironment({ theme }: { theme: MenuEnvironmentTheme }) {
  return <MenuBackdrop theme={theme} />;
}
