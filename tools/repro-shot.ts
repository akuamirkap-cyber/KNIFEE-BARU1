/**
 * Reproduce the "one shot shatters the wheel" report for a single weapon+effect.
 *
 * Usage: npx tsx tools/repro-shot.ts [weaponId] [effect] [level] [frames]
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

const id = process.argv[2] ?? 'pistol';
const effect = process.argv[3] ?? 'set11';
const level = Number(process.argv[4] ?? 2);
const frames = Number(process.argv[5] ?? 120);
const shots = Number(process.env.SHOTS ?? 1);
const outDir = `/tmp/repro-${id}-${effect}-${level}`;
mkdirSync(outDir, { recursive: true });

installSilentAudio();

const { Game, makeLevel } = await import('../src/games/gunhit/game/Game.ts');
const variants = await import('../src/games/gunhit/game/art/gunVariants.ts');

const raw = createCanvas(W, H) as unknown as Record<string, any>;
raw.style = {};
raw.addEventListener = () => undefined;
raw.removeEventListener = () => undefined;
raw.getBoundingClientRect = () => ({ left: 0, top: 0, width: W, height: H });

const events = { onGameOver: () => {}, onStageChange: () => {} };
const game = new Game(raw as unknown as HTMLCanvasElement, events as never) as unknown as Record<string, any>;
game.startAtLevel(level);
game.setWeapon(id);
if (variants.supportsGunVariants(id) && variants.getGunEffectOptions(id).some((o: { id: string }) => o.id === effect)) {
  variants.setGunEffect(id, effect as never);
}
console.log('weapon', id, 'effect', variants.getGunEffect(id), 'level', level, 'ammo', game.level.ammo, 'mode', game.level.mode, 'style', game.level.style);

// Trace every wheel landing: one trigger pull must land exactly one round.
const trace: string[] = [];
const origStick = game.stickAt?.bind(game);
if (typeof game.stickAt === 'function') {
  (game as any).stickAt = (...a: unknown[]) => {
    trace.push(`stickAt at frame ${frame} (weapon ${game.weapon.id}, stuck before ${game.stuck}) :: ${(new Error().stack ?? '').split('\n').slice(2, 4).map((l) => l.trim()).join(' <- ')}`);
    return origStick(...(a as []));
  };
}

const DT = 1 / 60;
let fired = 0;
let frame = 0;
for (let f = 0; f < frames; f++) {
  frame = f;
  if (game.state === 'play' && fired < shots && game.cooldown <= 0 && game.introT < 5) {
    game.shoot();
    fired++;
    console.log(`frame ${f}: fired (marked ${fired}), ammoLeft ${game.ammoLeft}`);
  }
  game.update(DT);
  game.render();
  if (f % 5 === 0) {
    writeFileSync(`${outDir}/f${String(f).padStart(3, '0')}.png`, raw.toBuffer('image/png'));
  }
  const flags: string[] = [];
  if (game.state !== 'play') flags.push(`state=${game.state}`);
  flags.push(`stuck=${game.stuck}/${game.level.ammo}`, `score=${game.score}`, `frags=${game.frags.length}`, `flyers=${game.flyers.length}`);
  if (flags.join(' ').includes('state=') || game.frags.length) console.log(`frame ${f}: ${flags.join(' ')}`);
}
writeFileSync(`${outDir}/final.png`, raw.toBuffer('image/png'));
for (const line of trace) console.log(line);
console.log('end state', game.state, 'stuck', game.stuck, '/', game.level.ammo, 'score', game.score, 'frames written to', outDir);
