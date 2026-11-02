/**
 * The gun artwork the menu needs to draw its live weapon showcase. Kept behind
 * a dynamic import so the title screen paints before every weapon's art (and
 * the ported slide art behind it) has been parsed.
 */
export { drawGunCentered } from './art/drawCentered';
export { getGunMetrics } from './art/metrics';
export { gunState } from './art/kit';
