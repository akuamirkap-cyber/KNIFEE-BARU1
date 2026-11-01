import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { installCanvasShim } from './supportCanvas';
import { installSilentAudio } from '../tools/supportAudioSilent';

installCanvasShim();
const env = globalThis as unknown as Record<string, unknown> & { window: Record<string, unknown> };
env.window = Object.assign(env.window ?? {}, {
  setTimeout, clearTimeout, setInterval: () => 0, clearInterval: () => undefined,
  addEventListener: () => undefined, removeEventListener: () => undefined,
  devicePixelRatio: 2, innerWidth: 420, innerHeight: 760,
  matchMedia: () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} }),
});
installSilentAudio();

const { WEAPONS } = await import('../src/games/gunhit/game/weapons');
const { getGunMetrics, showcaseScale, SHOWCASE_FULL_SPAN } = await import('../src/games/gunhit/game/art/metrics');
const arsenal = readFileSync('src/games/gunhit/components/Arsenal.tsx', 'utf8');

const PANE = 180;
/** How tall the drawing ends up inside the panes it was scaled for. */
const drawn = (span: number) => span * showcaseScale(span, PANE);

test('the armory showcase keeps the real proportions of the arsenal', () => {
  const pistol = drawn(getGunMetrics('pistol').span);
  const ak = drawn(getGunMetrics('ak47').span);
  const bazooka = drawn(getGunMetrics('bazooka').span);
  assert.ok(pistol < ak * 0.8, `the pistol must read much smaller than the AK-47 (${pistol.toFixed(1)} vs ${ak.toFixed(1)} px)`);
  assert.ok(ak <= bazooka * 1.05, 'the AK-47 and the bazooka are both big guns');
  // A small pistol and a long rifle can no longer be the same size, which is
  // exactly what the armory was doing when every weapon filled the pane.
  assert.ok(ak > pistol * 1.6, `the rifle owns the pane, the pistol does not (${(ak / pistol).toFixed(2)}x)`);
});

test('nothing is blown up past the pane and nothing is cropped worse than before', () => {
  for (const w of WEAPONS as { id: string; name: string }[]) {
    const span = Math.max(getGunMetrics(w.id as never).span, 130);
    const fit = (PANE * 0.98) / span;
    const scale = showcaseScale(span, PANE);
    assert.ok(scale <= fit + 1e-9, `${w.name}: never drawn bigger than the fit scale`);
    assert.ok(span * scale <= PANE * 0.98 + 1e-6, `${w.name}: stays inside the pane`);
    assert.ok(scale > 0, `${w.name}: has a real scale`);
  }
});

test('a longer weapon never reads smaller than a shorter one', () => {
  const spans = [...new Set((WEAPONS as { id: string }[]).map((w) => Math.max(getGunMetrics(w.id as never).span, 130)))].sort((a, b) => a - b);
  for (let i = 1; i < spans.length; i++) {
    assert.ok(drawn(spans[i]) >= drawn(spans[i - 1]) - 1e-6, `span ${spans[i]} is not smaller than ${spans[i - 1]}`);
  }
  // Small guns keep a readable presence instead of shrinking into a dot.
  assert.ok(drawn(spans[0]) >= PANE * 0.38, `the smallest gun still reads (${drawn(spans[0]).toFixed(1)} px)`);
  // …and the biggest fill the pane.
  assert.ok(drawn(SHOWCASE_FULL_SPAN) >= PANE * 0.95, 'a reference-sized gun fills the showcase');
});

test('the armory hero uses that rule instead of normalising every weapon', () => {
  assert.match(arsenal, /import \{ getGunMetrics, showcaseScale \} from '\.\.\/game\/art\/metrics';/);
  assert.match(arsenal, /const scale = showcaseScale\(m\.span, h\);/);
  // The spotlight must not scale by its own span any more.
  assert.doesNotMatch(arsenal, /const scale = \(h \* 0\.98\) \/ span;/);
});
