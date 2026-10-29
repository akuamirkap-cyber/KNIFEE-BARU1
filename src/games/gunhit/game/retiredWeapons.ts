/** Former roster entries kept only as implementation ids for imported renderers.
 * They must not be offered, awarded, exported, or counted as owned weapons. */
export const RETIRED_WEAPONS: ReadonlySet<string> = new Set([
  'helix_pulsar', 'pred', 'yautja', 'chrono_rifle', 'prism_lance',
  'pulse_rifle', 'quantum_destabilizer', 'buster', 'acid', 'anchor',
]);
