// Original v1 preview timing.
export function shotPulse(sinceShot: number, duration = 0.28): number {
  return Number.isFinite(sinceShot) && sinceShot >= 0 && sinceShot < duration
    ? Math.sin(Math.PI * sinceShot / duration) : 0;
}
export function commonGunPreviewState(t: number) {
  const cycle = ((Number.isFinite(t) ? t : 0) % 2.8 + 2.8) % 2.8;
  const sinceShot = cycle - 0.85;
  if (sinceShot < 0) return { sinceShot: 9, reloadT: 0, ready: true, flash: 0 };
  return {
    sinceShot,
    reloadT: sinceShot >= 0.23 && sinceShot < 0.72 ? 0.72 - sinceShot : 0,
    ready: sinceShot >= 0.72,
    flash: sinceShot < 0.09 ? 0.55 * (1 - sinceShot / 0.09) : 0,
  };
}
