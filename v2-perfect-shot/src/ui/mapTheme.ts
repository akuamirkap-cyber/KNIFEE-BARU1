/** Only the original forest's column palette; no extra theme catalog. */
export type Theme = { column: [string, string, string]; accent: string };
export const themeFor = (_theme: string, _cycle: number): Theme => ({ column: ['#f2f7f4', '#c3d4cf', '#6f8a86'], accent: '#3fdc72' });
export const cycleOf = (_stage: number) => 0;
export const useSettings = (): { theme: string } => ({ theme: 'hutan' });
