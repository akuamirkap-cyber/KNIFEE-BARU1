/**
 * FX parity: slide 2's own `fire()` / `stick()` recipes versus the port in
 * `SetTwoFx`, compared particle by particle (same seed, same arithmetic), so a
 * single dropped line shows up as a count or value mismatch.
 *
 * Usage: npx tsx tools/set-two-fx-parity.ts
 */
import { installCanvasShim } from '../tests/supportCanvas';
import { createCanvas } from '@napi-rs/canvas';
import { installSilentAudio } from './supportAudioSilent';

const W = 420;
const H = 760;
const g = globalThis as unknown as Record<string, unknown> & { window: Record<string, unknown> };
g.window = Object.assign(g.window ?? {}, {
  setTimeout, clearTimeout, setInterval: () => 0, clearInterval: () => undefined,
  addEventListener: () => undefined, removeEventListener: () => undefined,
  devicePixelRatio: 1, innerWidth: W, innerHeight: H,
});
g.document = {
  createElement: (tag: string) => (tag === 'canvas' ? createCanvas(64, 64) : { style: {} }),
  addEventListener: () => undefined, removeEventListener: () => undefined,
};
g.Image = class { width = 1; height = 1; onload: (() => void) | null = null; onerror: (() => void) | null = null; set src(_v: string) {} };

let seed = 1;
function resetSeed() { seed = 12345; }
Math.random = () => {
  seed = (seed + 0x6d2b79f5) >>> 0;
  let t = seed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

installSilentAudio();
installCanvasShim();
// Slide 2's own synth rolls its pitches from `Math.random()`; muting the port's
// audio keeps both randomised recipes drawing from the same stream.
const { slide2Sfx } = await import('../src/games/gunhit/game/slide2Audio.ts');
slide2Sfx.setMuted(true);

const { Game: TwoGame } = await import('../games/fireworkgun/src/game/engine.ts');
const { Sfx: TwoSfx } = await import('../games/fireworkgun/src/game/sfx.ts');
const { SetTwoFx } = await import('../src/games/gunhit/game/setTwoFx.ts');
const { SET_TWO_IDS } = await import('../src/games/gunhit/game/setTwoArt.ts');

const LAYERS = ['particles', 'glows', 'rings', 'voids', 'jets', 'beams', 'smokes', 'fireballs', 'flashes', 'texts'] as const;
const HUE: Record<string, number> = {
  firework: 28, blackhole: 265, shark: 200, bamboo: 28, soaker: 200, rainbow: 120, bazooka: 45, rpg: 15,
};

function makeTwo(id: string, hue: number) {
  const raw = createCanvas(W, H) as unknown as Record<string, unknown>;
  raw.style = {};
  raw.addEventListener = () => undefined;
  raw.removeEventListener = () => undefined;
  raw.getBoundingClientRect = () => ({ left: 0, top: 0, width: W, height: H });
  const two = new TwoGame(raw as unknown as HTMLCanvasElement, new TwoSfx() as never, () => {}) as unknown as Record<string, any>;
  two.setupLevel(3, true);
  two.weapon = id;
  two.state = 'playing';
  two.ammo = 6;
  two.cooldown = 0;
  two.queue = [hue];
  two.shotIdx = 0;
  two.time = 1.7;
  two.recoil = 0;
  two.loadP = 1;
  // Slide 2's own sound engine rolls its pitches from `Math.random()`; a
  // no-op stub keeps the randomised recipes in step with the port (whose audio
  // is muted, so it never draws a number).
  two.sfx = new Proxy({}, { get: () => () => {} });
  two.stuckCount = 0;
  two.rot = 0;
  // slide 2's own `fire()` guard: the wheel must be settled and on-screen
  two.wheelScale = 1;
  return two;
}

function makePort(id: string, hue: number) {
  const fx = new SetTwoFx();
  fx.cx = 210;
  fx.cy = 262;
  fx.radius = 100;
  fx.gunY = 596;
  fx.h = H;
  fx.time = 1.7;
  fx.host = { shake: () => {}, emit: () => {} };
  void hue;
  void id;
  return fx;
}

function compare(name: string, a: Record<string, any>, b: Record<string, any>) {
  const problems: string[] = [];
  for (const layer of LAYERS) {
    const la = a[layer] ?? [];
    const lb = b[layer] ?? [];
    if (la.length !== lb.length) problems.push(`${layer}: ${la.length} vs ${lb.length}`);
    const n = Math.min(la.length, lb.length);
    for (let i = 0; i < n; i++) {
      for (const k of Object.keys(la[i])) {
        if (k === 'seed' && !('seed' in lb[i])) continue;
        const va = la[i][k];
        const vb = lb[i][k];
        if (typeof va === 'number' && typeof vb === 'number') {
          if (Math.abs(va - vb) > 1e-9) { problems.push(`${layer}[${i}].${k}: ${va} vs ${vb}`); break; }
        } else if (va !== vb) { problems.push(`${layer}[${i}].${k}: ${String(va)} vs ${String(vb)}`); break; }
      }
    }
  }
  if ((a.timers?.length ?? 0) !== (b.timers?.length ?? 0)) {
    problems.push(`timers: ${a.timers.length} vs ${b.timers.length}`);
  }
  if ((a.bubbles?.length ?? 0) !== (b.bubbles?.length ?? 0)) {
    problems.push(`bubbles: ${a.bubbles.length} vs ${b.bubbles.length}`);
  }
  if ((a.debris?.length ?? 0) !== (b.debris?.length ?? 0)) {
    problems.push(`debris: ${a.debris?.length} vs ${b.debris?.length}`);
  }
  if ((a.flash ?? 0) !== (b.flash ?? 0) || (a.flashHue ?? 0) !== (b.flashHue ?? 0)) {
    problems.push(`flash: ${a.flash}/${a.flashHue} vs ${b.flash}/${b.flashHue}`);
  }
  const counts = LAYERS.map((l) => `${l.slice(0, 4)}=${(b[l] ?? []).length}`).join(' ');
  if (problems.length) {
    console.log(`✗ ${name.padEnd(26)} ${counts}`);
    for (const p of problems.slice(0, 6)) console.log(`    ${p}`);
    if (problems.length > 6) console.log(`    … ${problems.length - 6} more`);
    return false;
  }
  console.log(`✓ ${name.padEnd(26)} identical  ${counts}`);
  return true;
}

let ok = true;
for (const id of SET_TWO_IDS) {
  const hue = HUE[id];
  // ---- muzzle recipe -------------------------------------------------------
  // Build both worlds FIRST: slide-2's own constructor draws level/chord
  // variations from the same RNG, so the seed must be reset right before the
  // recipe runs, never before the object exists.
  const twoFire = makeTwo(id, hue);
  const portFire = makePort(id, hue);
  resetSeed();
  twoFire.fire();
  resetSeed();
  portFire.fire(id, hue);
  ok = compare(`${id} fire()`, twoFire, portFire) && ok;

  // ---- wheel impact --------------------------------------------------------
  const seedA = 3.3;
  const twoHit = makeTwo(id, hue);
  const portHit = makePort(id, hue);
  resetSeed();
  twoHit.stuckCount = 0;
  twoHit.stick({ y: 0, hue, age: 0, open: 0, seed: seedA });
  resetSeed();
  portHit.stick(id, 210, 262 + 100 + 6, hue, seedA);
  ok = compare(`${id} stick()`, twoHit, portHit) && ok;
}

console.log(ok ? '\nall slide-2 FX recipes match slide 2 exactly' : '\nMISMATCH — see above');
process.exitCode = ok ? 0 : 1;
