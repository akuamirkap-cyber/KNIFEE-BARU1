/**
 * Gun-art parity: slide 2's own `drawGun()` versus slide 1's `set2` design card.
 *
 * Both are rendered alone on a transparent canvas at the same muzzle origin, so
 * every pixel that differs is a real difference in the exported artwork (no
 * background, no HUD, no FX state in the way).
 *
 * Usage: npx tsx tools/set-two-parity.ts [outDir]
 */
import { installCanvasShim } from '../tests/supportCanvas';
import { createCanvas } from '@napi-rs/canvas';
import { mkdirSync, writeFileSync } from 'node:fs';
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

let seed = Number(process.env.SEED ?? 12345) >>> 0;
Math.random = () => {
  seed = (seed + 0x6d2b79f5) >>> 0;
  let t = seed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

installSilentAudio();
installCanvasShim();

const outDir = process.argv[2] ?? '/tmp/set-two-parity';
mkdirSync(outDir, { recursive: true });

const { Game: TwoGame } = await import('../games/fireworkgun/src/game/engine.ts');
const { Sfx: TwoSfx } = await import('../games/fireworkgun/src/game/sfx.ts');
const { drawGun } = await import('../src/games/gunhit/game/art/guns.ts');
const { gunState } = await import('../src/games/gunhit/game/art/kit.ts');
const { SET_TWO_IDS } = await import('../src/games/gunhit/game/setTwoArt.ts');

// Slide 2 authors its guns around (CX, GUNY) = (210, 596); draw BOTH there so the
// diff compares the artwork, not the 21px slide-1 muzzle offset.
const GUN_Y = 596;
const FRAME = 1.7;

function canvas(): [ReturnType<typeof createCanvas>, CanvasRenderingContext2D] {
  const cv = createCanvas(W, H);
  return [cv, cv.getContext('2d') as unknown as CanvasRenderingContext2D];
}

function bandStats(a: CanvasRenderingContext2D, b: CanvasRenderingContext2D) {
  const da = a.getImageData(0, 0, W, H).data;
  const db = b.getImageData(0, 0, W, H).data;
  let lit = 0;
  let diff = 0;
  for (let i = 0; i < da.length; i += 4) {
    const onA = da[i + 3] > 24;
    const onB = db[i + 3] > 24;
    if (!onA && !onB) continue;
    lit++;
    if (!onA || !onB) { diff++; continue; }
    const d = Math.abs(da[i] - db[i]) + Math.abs(da[i + 1] - db[i + 1]) + Math.abs(da[i + 2] - db[i + 2]);
    if (d > 48) diff++;
  }
  return { lit, diff, pct: lit ? (100 * diff) / lit : 100 };
}

let totalPct = 0;
const rows: string[] = [];
for (const id of SET_TWO_IDS) {
  // ---- slide 2, its own artwork --------------------------------------------
  const [cv2, c2] = canvas();
  const raw = createCanvas(W, H) as unknown as Record<string, unknown>;
  raw.style = {};
  raw.addEventListener = () => undefined;
  raw.removeEventListener = () => undefined;
  raw.getBoundingClientRect = () => ({ left: 0, top: 0, width: W, height: H });
  const two = new TwoGame(
    raw as unknown as HTMLCanvasElement,
    new TwoSfx() as never,
    () => {},
  ) as unknown as Record<string, any>;
  two.setupLevel(3, true);
  two.weapon = id;
  two.state = 'playing';
  two.time = FRAME;
  two.recoil = 0;
  two.loadP = 1;
  two.cannonPulse = 0;
  two.ammo = 6;
  two.queue = [id === 'blackhole' ? 265 : 28];
  two.shotIdx = 0;
  two.ctx = c2;
  two.drawGun();

  // ---- slide 1's set2 card --------------------------------------------------
  const [cv1, c1] = canvas();
  gunState.sinceShot = 99;
  gunState.shots = 0;
  gunState.twoLive = false;
  // Both sides draw the fully loaded, idling pose with the same round hue.
  gunState.twoState = {
    time: FRAME, recoil: 0, loadP: 1, ammo: 6, live: true,
    hue: id === 'blackhole' ? 265 : 28, cannonPulse: 0,
  };
  gunState.charge = 0;
  gunState.ammoRatio = 1;
  drawGun(c1, id as never, W / 2, GUN_Y, FRAME, 0, true, undefined, 'set2');

  const { lit, diff, pct } = bandStats(c1, c2);
  totalPct += pct;
  rows.push(`${id.padEnd(10)} ${pct.toFixed(1).padStart(5)}% differing  (${diff}/${lit} px)`);

  const sheet = createCanvas(W * 2, H);
  const s = sheet.getContext('2d');
  s.fillStyle = '#05070d';
  s.fillRect(0, 0, sheet.width, H);
  s.drawImage(cv2, 0, 0);
  s.drawImage(cv1, W, 0);
  writeFileSync(`${outDir}/${id}.png`, sheet.toBuffer('image/png'));
}

for (const r of rows) console.log(r);
console.log(`average artwork difference: ${(totalPct / SET_TWO_IDS.length).toFixed(1)}% -> ${outDir}`);
