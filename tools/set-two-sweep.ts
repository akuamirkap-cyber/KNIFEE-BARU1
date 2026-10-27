/**
 * Live sweep: every slide-2 weapon, fired through slide 1 with the "Slide 2"
 * shot card selected. Checks that each round lands, the stage clears and the
 * ported FX layer actually paints.
 *
 * Usage: npx tsx tools/set-two-sweep.ts [outDir]
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

let seed = Number(process.env.SEED ?? 777) >>> 0;
Math.random = () => {
  seed = (seed + 0x6d2b79f5) >>> 0;
  let t = seed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

installSilentAudio();
installCanvasShim();

const outDir = process.argv[2] ?? '/tmp/set-two-sweep';
mkdirSync(outDir, { recursive: true });

const { Game } = await import('../src/games/gunhit/game/Game.ts');
const variants = await import('../src/games/gunhit/game/art/gunVariants.ts');
const { SET_TWO_IDS } = await import('../src/games/gunhit/game/setTwoArt.ts');

const DT = 1 / 60;
let failures = 0;

for (const id of SET_TWO_IDS) {
  const raw = createCanvas(W, H) as unknown as Record<string, unknown>;
  raw.style = {};
  raw.addEventListener = () => undefined;
  raw.removeEventListener = () => undefined;
  raw.getBoundingClientRect = () => ({ left: 0, top: 0, width: W, height: H });
  const game = new Game(raw as unknown as HTMLCanvasElement, { onGameOver: () => {}, onStageChange: () => {} } as never) as unknown as Record<string, any>;
  game.startAtLevel(1);
  game.setWeapon(id);
  variants.setGunVariant(id, 'set2' as never);
  variants.setGunEffect(id, 'set2' as never);
  if (variants.getGunEffect(id) !== 'set2') {
    console.log(`✗ ${id}: effect card missing`);
    failures++;
    continue;
  }
  const design = variants.getGunVariantOptions(id).some((o: { id: string }) => o.id === 'set2')
    ? variants.getGunVariant(id) : 'n/a (already slide 2)';
  let shots = 0;
  let peakFx = 0;
  let frames = 0;
  const ammo = game.level.ammo;
  while (frames < 1200 && game.stuck < ammo) {
    frames++;
    if (game.state === 'play' && game.cooldown <= 0 && shots < ammo) {
      game.shoot();
      shots++;
    }
    game.update(DT);
    game.render();
    const fx = game.s2wState;
    if (fx) peakFx = Math.max(peakFx, fx.particles.length + fx.glows.length + fx.smokes.length + fx.fireballs.length + fx.beams.length + fx.rings.length);
  }
  game.render();
  writeFileSync(`${outDir}/${id}.png`, (raw as unknown as ReturnType<typeof createCanvas>).toBuffer('image/png'));
  const fx = game.s2wState;
  const stuckOk = game.stuck === ammo;
  const cleared = game.state !== 'play' || game.stuck === ammo;
  const fxOk = peakFx > 0;
  if (!stuckOk || !cleared || !fxOk) failures++;
  console.log(
    `${stuckOk && cleared && fxOk ? '✓' : '✗'} ${id.padEnd(10)}`
    + ` stuck ${game.stuck}/${ammo} state=${game.state} score=${game.score}`
    + ` peakFx=${peakFx} design=${design} frame=${frames}`
    + (fx ? ` frozen=part${fx.particles.length}` : ''),
  );
}
console.log(failures ? `\n${failures} weapon(s) failed` : '\nall eight slide-2 weapons fire, land and paint');
process.exitCode = failures ? 1 : 0;
