/** Small inline UI symbols, no icon font or external asset requests. */
const paths = {
  target: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="M12 1v5m0 12v5M1 12h5m12 0h5"/>',
  play: '<path d="m9 5 11 7-11 7Z"/>',
  pause: '<path d="M8 5v14M16 5v14" stroke-width="3"/>',
  sound: '<path d="m11 4-5 4H2v8h4l5 4Z"/><path d="M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
  muted: '<path d="m11 4-5 4H2v8h4l5 4Z"/><path d="m16 9 6 6m0-6-6 6"/>',
  coin: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="6"/><path d="m12 7 3 5-3 5-3-5Z"/>',
  arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
  back: '<path d="M20 12H4m6-6-6 6 6 6"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  lock: '<rect x="5" y="10" width="14" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2"/>',
  check: '<path d="m5 12 4 4L20 5"/>',
  armory: '<path d="m6 3 2 5-1 8-3 4 4 1 4-5 4-4 5-4-1-4-4 3-8 1Z"/><path d="m7 17 3-3m3-3 6-6"/>',
  map: '<path d="m3 5 6-2 6 3 6-2v15l-6 2-6-3-6 2Zm6-2v15m6-12v15"/>',
  trophy: '<path d="M8 3h8v6a4 4 0 0 1-8 0Zm0 2H4v3a4 4 0 0 0 4 4m8-7h4v3a4 4 0 0 1-4 4m-4 1v6m-4 2h8m-6-2h4"/>',
  heart: '<path d="M12 21S1 14 2 7a5 5 0 0 1 10-1A5 5 0 0 1 22 7c1 7-10 14-10 14Z"/>',
  retry: '<path d="M3 10a9 9 0 1 1 2 9M3 3v7h7"/>',
  home: '<path d="m2 11 10-9 10 9M5 9v12h5v-7h4v7h5V9"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 10v7m0-10v.1"/>',
  star: '<path d="m12 2 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1Z"/>',
  bolt: '<path d="m14 2-3 8h8L9 22l3-9H5Z"/>',
} as const;
export type IconName = keyof typeof paths;
export function icon(name: IconName, extraClass = ''): string {
  return `<svg class="ps-icon ${extraClass}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${paths[name]}</svg>`;
}
