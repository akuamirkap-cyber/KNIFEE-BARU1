/**
 * Render-budget audit for the two scenes that decide whether the game feels
 * smooth on a phone (`npx tsx tools/renderBudget.ts [frames] [dpr]`).
 *
 *  steady  — a normal stage, firing: the everyday frame.
 *  growing — the same stage while `level.radius` eases towards `targetR`, which
 *            is what the Grow Ray / Shrink Ray do on every hit for about a
 *            second. Any full-screen work that is keyed on the radius shows up
 *            here as a 10x regression, and that is exactly the frame rate a
 *            player sees after shrinking a target ten times in a row.
 *
 * Reports median / p95 / worst of `render()` only (update is separate), at a
 * phone-like backing resolution. It is a software-raster comparison between two
 * builds of this repository, not a device FPS meter.
 */
import { Canvas, createCanvas } from '@napi-rs/canvas';

const W = 420;
const H = 760;
const frames = Math.max(60, Number(process.argv[2] ?? 240));
const dpr = Number(process.argv[3] ?? 1.5);

const g = globalThis as unknown as Record<string, any>;
g.window = Object.assign(g.window ?? {}, {
  setTimeout, clearTimeout,
  setInterval: () => 0, clearInterval: () => undefined,
  addEventListener: () => undefined, removeEventListener: () => undefined,
  devicePixelRatio: dpr, innerWidth: W, innerHeight: H,
  matchMedia: () => ({ matches: true }),
});
g.HTMLCanvasElement = Canvas;
g.document = {
  createElement: (tag: string) => (tag === 'canvas' ? createCanvas(64, 64) : { style: {} }),
  addEventListener: () => undefined,
  removeEventListener: () => undefined,
};
g.Image = class {
  width = 1; height = 1; onload: (() => void) | null = null; onerror: (() => void) | null = null;
  set src(_v: string) { /* supplied directly */ }
};
Object.defineProperty(g, 'navigator', {
  value: { hardwareConcurrency: 8, deviceMemory: 4, maxTouchPoints: 5 }, configurable: true,
});
delete g.AudioContext;

let seed = 12345;
Math.random = () => {
  seed = (seed + 0x6d2b79f5) >>> 0;
  let t = seed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const { installSilentAudio } = await import('./supportAudioSilent.ts');
installSilentAudio();
const { Game, makeLevel } = await import('../src/games/gunhit/game/Game.ts');

function boot() {
  const cv = createCanvas(Math.round(W * dpr), Math.round(H * dpr)) as any;
  cv.style = {};
  cv.addEventListener = () => undefined;
  cv.removeEventListener = () => undefined;
  cv.getBoundingClientRect = () => ({ left: 0, top: 0, width: W, height: H });
  const game = new Game(cv, { onGameOver: () => {}, onStageChange: () => {} } as never) as unknown as Record<string, any>;
  game.level = makeLevel(3);
  game.state = 'play';
  game.setWeapon('pistol');
  return game;
}

const shoot = (game: Record<string, any>) => {
  game.state = 'play';
  game.stuck = 0;
  game.ammoLeft = game.level.ammo;
  game.reloadT = 0;
  if (game.cooldown <= 0) game.shoot();
};

const stats = (times: number[]) => {
  const sorted = times.slice().sort((a, b) => a - b);
  const at = (q: number) => +sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * q))].toFixed(2);
  return {
    medianMs: at(0.5),
    p95Ms: at(0.95),
    worstMs: +sorted[sorted.length - 1].toFixed(2),
  };
};

function measure(name: string, growing: boolean) {
  const game = boot();
  const dt = 1 / 60;
  // Warm up until every lazy sprite, mask and gradient exists.
  for (let i = 0; i < 120; i++) {
    shoot(game);
    game.update(dt);
    game.render();
  }
  const times: number[] = [];
  for (let f = 0; f < frames; f++) {
    shoot(game);
    if (growing) {
      // The Grow/Shrink Ray: radius eases towards a moving target every frame.
      game.targetR = 106 + 30 * (0.5 + 0.5 * Math.sin(f * 0.05));
    }
    game.update(dt);
    const t = performance.now();
    game.render();
    times.push(performance.now() - t);
  }
  game.destroy?.();
  return { scene: name, ...stats(times) };
}

console.log(JSON.stringify({
  resolution: `${Math.round(W * dpr)}x${Math.round(H * dpr)}`,
  frames,
  scenes: [measure('steady', false), measure('growing', true)],
}, null, 2));
