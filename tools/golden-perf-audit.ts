/**
 * Golden Gun's repeatable CPU/Skia stress audit, without a browser.
 *
 * Runs the real SGA game at a phone-like 1.5x backing resolution, firing as
 * quickly as allowed. Reports render/update times and live FX counts, not real
 * device FPS: browser GPU, display refresh and phone hardware also matter.
 *
 * Run: npx tsx tools/golden-perf-audit.ts [weapon=golden] [frames=150] [skin] [effect]
 * Set PERF_COUNTS=1 for draw calls, PERF_PROFILE=1 for per-section counts,
 * PERF_TIMES=1 for inclusive section times, PERF_BREAKDOWN=1 for canvas timings,
 * PERF_HZ=120 to simulate a higher refresh rate, PERF_VERBOSE=1 for slow frames.
 */
import { Canvas, createCanvas } from '@napi-rs/canvas';

const W = 420;
const H = 760;
const id = process.argv[2] ?? 'golden';
const requestedFrames = Number(process.argv[3] ?? 150);
const frames = Number.isFinite(requestedFrames) ? Math.max(1, Math.floor(requestedFrames)) : 150;
const skin = process.argv[4];
const effect = process.argv[5];
const g = globalThis as unknown as Record<string, unknown> & { window: Record<string, unknown> };
g.window = Object.assign(g.window ?? {}, {
  setTimeout, clearTimeout,
  setInterval: () => 0, clearInterval: () => undefined,
  addEventListener: () => undefined, removeEventListener: () => undefined,
  devicePixelRatio: 2, innerWidth: W, innerHeight: H,
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
  set src(_v: string) { /* no external asset decoding in this audit */ }
};
Object.defineProperty(g, 'navigator', {
  value: { hardwareConcurrency: 8, deviceMemory: 4, maxTouchPoints: 5 }, configurable: true,
});
delete g.AudioContext;

// A seed makes comparisons less sensitive to random particles and wheel art.
let seed = 12345;
Math.random = () => {
  seed = (seed + 0x6d2b79f5) >>> 0;
  let t = seed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const { Game, makeLevel } = await import('../src/games/gunhit/game/Game.ts');
const { setGunVariant, setGunEffect } = await import('../src/games/gunhit/game/art/gunVariants.ts');
if (skin) setGunVariant(id as never, skin as never);
if (effect) setGunEffect(id as never, effect as never);
const canvas = createCanvas(W, H) as unknown as HTMLCanvasElement;
canvas.style = {} as CSSStyleDeclaration;
canvas.addEventListener = () => undefined;
canvas.removeEventListener = () => undefined;
canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: W, height: H }) as DOMRect;
const game = new Game(canvas, { onGameOver: () => {}, onStageChange: () => {} } as never) as unknown as Record<string, any>;
const counts: Record<string, number> = {};
const sectionCounts: Record<string, Record<string, number>> = {};
const sectionTimes: Record<string, { ms: number; calls: number; maxMs: number }> = {};
let section = 'other';
if (process.env.PERF_PROFILE || process.env.PERF_TIMES) {
  const { Particles } = await import('../games/game-4/src/game/particles.ts');
  const { SetSevenFx } = await import('../src/games/gunhit/game/setSevenFx.ts');
  const { SetTwoFx } = await import('../src/games/gunhit/game/setTwoFx.ts');
  const { Slide2Fx } = await import('../src/games/gunhit/game/slide2Fx.ts');
  const { BlackHoleShot } = await import('../games/game-4/src/game/projectiles.ts');
  const tag = (target: Record<string, any>, key: string, label: string) => {
    const fn = target[key];
    if (typeof fn !== 'function') return;
    target[key] = function (...args: unknown[]) {
      const previous = section;
      section = label;
      const started = process.env.PERF_TIMES ? performance.now() : 0;
      try { return fn.apply(this, args); } finally {
        if (process.env.PERF_TIMES) {
          const elapsed = performance.now() - started;
          const timing = (sectionTimes[label] ??= { ms: 0, calls: 0, maxMs: 0 });
          timing.ms += elapsed;
          timing.calls++;
          timing.maxMs = Math.max(timing.maxMs, elapsed);
        }
        section = previous;
      }
    };
  };
  for (const key of ['drawGunNow', 'drawCarriedRound', 'drawForestBackground', 'drawHUD', 'drawLayerWheels', 'drawNineLayer', 'drawProj', 'render']) tag(game, key, key);
  for (const key of ['drawFace', 'drawStuck', 'draw', 'drawFront', 'drawRim', 'applyLens']) tag(SetSevenFx.prototype, key, `s7.${key}`);
  for (const key of ['draw', 'drawBubbles', 'drawDebris', 'drawSky', 'drawRound']) tag(SetTwoFx.prototype, key, `s2.${key}`);
  tag(Slide2Fx.prototype, 'draw', 's2.baseDraw');
  tag(BlackHoleShot.prototype, 'draw', 'blackhole.round');
  tag(Particles.prototype, 'draw', 's7.particles');
}
if (process.env.PERF_TRACE || process.env.PERF_COUNTS || process.env.PERF_PROFILE || process.env.PERF_BREAKDOWN) {
  const ctx = game.ctx as Record<string, any>;
  for (const key of ['stroke', 'fill', 'drawImage', 'fillText', 'strokeText', 'clip', 'restore', 'setTransform', 'createLinearGradient', 'createRadialGradient']) {
    const original = ctx[key].bind(ctx);
    ctx[key] = (...args: unknown[]) => {
      counts[key] = (counts[key] ?? 0) + 1;
      if (process.env.PERF_PROFILE) {
        const group = (sectionCounts[section] ??= {});
        group[key] = (group[key] ?? 0) + 1;
      }
      if (!process.env.PERF_TRACE && !process.env.PERF_BREAKDOWN) return original(...args);
      const t = performance.now();
      const result = original(...args);
      const ms = performance.now() - t;
      if (process.env.PERF_BREAKDOWN) {
        const timing = (sectionTimes[`${section}.${key}`] ??= { ms: 0, calls: 0, maxMs: 0 });
        timing.ms += ms; timing.calls++; timing.maxMs = Math.max(timing.maxMs, ms);
      }
      if (process.env.PERF_TRACE && ms > 20) console.error(`slow canvas ${key}: ${ms.toFixed(1)}ms\n${new Error().stack}`);
      return result;
    };
  }
}
game.level = makeLevel(3);
game.state = 'play';
game.setWeapon(id);

const requestedHz = Number(process.env.PERF_HZ ?? 60);
const hz = Number.isFinite(requestedHz) ? Math.max(1, Math.min(240, requestedHz)) : 60;
const dt = 1 / hz;
for (let i = 0; i < 10; i++) {
  game.update(dt);
  game.render();
}
for (const key of Object.keys(counts)) counts[key] = 0;
for (const key of Object.keys(sectionCounts)) delete sectionCounts[key];
for (const key of Object.keys(sectionTimes)) delete sectionTimes[key];
const update: number[] = [];
const render: number[] = [];
let peakParticles = 0;
let peakWheelFx = 0;
let peakSlideTwoParticles = 0;
let peakSlideTwoBubbles = 0;
let shots = 0;
for (let f = 0; f < frames; f++) {
  // Prevent stage completion and ammunition exhaustion from ending the stress
  // scenario; cap stuck art to typical on-screen levels.
  game.state = 'play';
  game.stuck = 0;
  if (game.items.length > 10) game.items.splice(0, game.items.length - 10);
  if (game.s7State?.stuck?.length > 10) game.s7State.stuck.splice(0, game.s7State.stuck.length - 10);
  game.ammoLeft = game.level.ammo;
  game.reloadT = 0;
  if (game.cooldown <= 0) {
    const before = game.ammoLeft;
    game.shoot();
    if (game.ammoLeft < before) shots++;
  }
  let t = performance.now();
  game.update(dt);
  update.push(performance.now() - t);
  t = performance.now();
  game.render();
  const renderTime = performance.now() - t;
  render.push(renderTime);
  if (process.env.PERF_VERBOSE && renderTime > 20) {
    const mem = process.memoryUsage();
    console.error(`frame ${f}: ${renderTime.toFixed(2)}ms, particles=${game.s7State?.particles?.list?.length ?? 0}, wheelFX=${game.s7State?.wheelFx?.length ?? 0}, rss=${Math.round(mem.rss / 1048576)}MB, ext=${Math.round(mem.external / 1048576)}MB`);
  }
  peakParticles = Math.max(peakParticles, game.s7State?.particles?.list?.length ?? 0);
  peakWheelFx = Math.max(peakWheelFx, game.s7State?.wheelFx?.length ?? 0);
  peakSlideTwoParticles = Math.max(peakSlideTwoParticles, game.s2wState?.particles?.length ?? 0);
  peakSlideTwoBubbles = Math.max(peakSlideTwoBubbles, game.s2wState?.bubbles?.length ?? 0);
  if (process.env.PERF_VERBOSE && f === frames - 1) {
    const list = game.s7State?.particles?.list ?? [];
    const outside = list.filter((p: { x: number; y: number }) => p.x < -40 || p.x > W + 40 || p.y < -40 || p.y > H + 40).length;
    console.error(`final particles: ${list.length}, well outside view: ${outside}`);
  }
}
const stats = (times: number[]) => {
  const sorted = times.slice().sort((a, b) => a - b);
  const p = (q: number) => Number(sorted[Math.floor((sorted.length - 1) * q)].toFixed(2));
  return { avgMs: +(times.reduce((a, b) => a + b, 0) / times.length).toFixed(2), p50Ms: p(0.5), p95Ms: p(0.95), p99Ms: p(0.99) };
};
const opsPerFrame = Object.fromEntries(Object.entries(counts).map(([key, count]) => [key, +(count / frames).toFixed(1)]));
const sectionsPerFrame = Object.fromEntries(Object.entries(sectionCounts).map(([name, values]) => [name, Object.fromEntries(Object.entries(values).map(([key, value]) => [key, +(value / frames).toFixed(1)]))]));
const sectionTiming = Object.fromEntries(Object.entries(sectionTimes).map(([name, t]) => [name, { msPerFrame: +(t.ms / frames).toFixed(3), callsPerFrame: +(t.calls / frames).toFixed(1), maxMs: +t.maxMs.toFixed(2) }]));
console.log(JSON.stringify({ weapon: id, skin: skin ?? 'default', effect: effect ?? 'default', frames, hz, resolution: `${canvas.width}x${canvas.height}`, shots, peakParticles, peakWheelFx, peakSlideTwoParticles, peakSlideTwoBubbles, update: stats(update), render: stats(render), ...(process.env.PERF_COUNTS ? { opsPerFrame } : {}), ...(process.env.PERF_PROFILE ? { sectionsPerFrame } : {}), ...((process.env.PERF_TIMES || process.env.PERF_BREAKDOWN) ? { sectionTiming } : {}) }, null, 2));
