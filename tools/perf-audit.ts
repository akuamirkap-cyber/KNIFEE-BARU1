/**
 * Per-weapon draw-call audit for Gun Hit (SGA).
 *
 * The game is a canvas 2D app, so the cost of a gun is mostly how much drawing
 * it asks the browser to do every frame: the number of `fill()`/`stroke()`/
 * `drawImage()` calls, the gradients it builds, and the shadow/blur state
 * changes. This runs the REAL `Game` (update + render) against a recording
 * context, one weapon at a time, and reports the per-second budget.
 *
 * Run with:  npx tsx tools/perf-audit.ts [weaponId ...]
 */
import { installCanvasShim } from '../tests/supportCanvas';

const restore = installCanvasShim();

const g = globalThis as unknown as Record<string, unknown> & { window: Record<string, unknown> };
g.window = Object.assign(g.window ?? {}, {
  setTimeout,
  clearTimeout,
  setInterval: () => 0,
  clearInterval: () => undefined,
  addEventListener: () => undefined,
  removeEventListener: () => undefined,
  devicePixelRatio: 2,
  innerWidth: 420,
  innerHeight: 760,
});
// No AudioContext: every synth reports "no audio here" and stays silent, so the
// numbers below are pure drawing + simulation.
delete (g as { AudioContext?: unknown }).AudioContext;

const OPS = [
  'fill', 'stroke', 'drawImage', 'fillRect', 'strokeRect', 'clearRect',
  'arc', 'ellipse', 'moveTo', 'lineTo', 'quadraticCurveTo', 'bezierCurveTo',
  'roundRect', 'fillText', 'clip', 'save', 'restore',
  'createRadialGradient', 'createLinearGradient', 'createPattern',
] as const;

type Counts = Record<string, number>;

function countingContext(counts: Counts) {
  const gradient = { addColorStop: () => {} };
  const state: Record<string, unknown> = { canvas: { width: 420, height: 760 } };
  return new Proxy(state, {
    get(t, prop) {
      const name = String(prop);
      if (name === 'canvas') return t.canvas;
      if (name === 'createRadialGradient' || name === 'createLinearGradient' || name === 'createPattern') {
        return () => { counts[name] = (counts[name] ?? 0) + 1; return gradient; };
      }
      if (name === 'measureText') return () => ({ width: 10 });
      if (name === 'getImageData') return () => ({ data: new Uint8ClampedArray(4) });
      if (name === 'createImageData') return (w = 1, h = 1) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) });
      if ((OPS as readonly string[]).includes(name)) {
        return (..._a: unknown[]) => { counts[name] = (counts[name] ?? 0) + 1; };
      }
      return () => undefined;
    },
    set(t, prop, value) {
      const name = String(prop);
      // Canvas state changes are real work in a browser (they flush the path /
      // rasterizer state), so blur and blend-mode writes are counted too.
      if (name === 'shadowBlur' || name === 'globalCompositeOperation') {
        if (t[name] !== value) counts[name] = (counts[name] ?? 0) + 1;
      }
      t[name] = value;
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;
}

const counts: Counts = {};
const ctx = countingContext(counts);
const canvas = {
  width: 420, height: 760, style: {},
  getContext: () => ctx,
  addEventListener: () => undefined,
  removeEventListener: () => undefined,
  getBoundingClientRect: () => ({ left: 0, top: 0, width: 420, height: 760 }),
};

const { Game, makeLevel } = await import('../src/games/gunhit/game/Game.ts');
const { WEAPONS, getWeapon } = await import('../src/games/gunhit/game/weapons.ts');
const { K } = await import('../games/game-4/src/game/particles.ts');

/** Slide-7 particle kinds, for the per-frame histogram. */
const KIND_NAME: Record<number, string> = Object.fromEntries(
  Object.entries(K).map(([name, value]) => [value as number, name]),
);

const DT = 1 / 60;
const FRAMES = 150; // 2.5 s of held trigger

function reset() {
  for (const k of Object.keys(counts)) counts[k] = 0;
}

function audit(id: string) {
  reset();
  const events = { onGameOver: () => {}, onStageChange: () => {} };
  const game = new Game(canvas as unknown as HTMLCanvasElement, events as never) as unknown as Record<string, any>;
  game.level = makeLevel(3);
  game.state = 'play';
  game.setWeapon(id);

  let updateNs = 0;
  let renderNs = 0;
  let peakOwn = 0;
  let peakSet7 = 0;
  let shots = 0;
  const ownKinds: Record<string, number> = {};
  const set7Kinds: Record<string, number> = {};

  // Warm-up: the first frame builds every cached sprite.
  game.shoot();
  game.update(DT);
  game.render();
  reset();

  for (let f = 0; f < FRAMES; f++) {
    // Keep the stage alive: plenty of ammo, no reload stalls.
    game.state = 'play';
    // Never let the stage clear mid-measurement: the clear explosion is 50
    // chips + smoke + rings, which would swamp the gun's own footprint.
    // HUD draws one ammo pip per shot of the stage, so the stage's own ammo
    // count stays put; only the progress counter is reset to keep the level
    // alive (its 50-chip clear explosion would swamp the gun's footprint).
    game.stuck = 0;
    // A real stage only ever holds a couple of dozen embedded rounds; without
    // this cap a 2.5 s burst piles up a hundred rounds of weapon art and the
    // measurement drifts into the target's stuck-art cost.
    if (game.items.length > 10) game.items.splice(0, game.items.length - 10);
    if (game.s7?.stuck?.length > 10) game.s7.stuck.splice(0, game.s7.stuck.length - 10);
    game.ammoLeft = game.level.ammo;
    game.reloadT = 0;
    if (game.cooldown <= 0) {
      const before = game.ammoLeft;
      game.shoot();
      if (game.ammoLeft < before) shots++;
    }
    let t0 = performance.now();
    game.update(DT);
    updateNs += performance.now() - t0;
    peakOwn = Math.max(peakOwn, game.particles.length);
    peakSet7 = Math.max(peakSet7, game.s7?.particles?.list?.length ?? 0);
    for (const p of game.particles) ownKinds[p.kind] = (ownKinds[p.kind] ?? 0) + 1;
    for (const p of game.s7?.particles?.list ?? []) set7Kinds[KIND_NAME[p.k] ?? String(p.k)] = (set7Kinds[KIND_NAME[p.k] ?? String(p.k)] ?? 0) + 1;
    t0 = performance.now();
    game.render();
    renderNs += performance.now() - t0;
  }

  const secs = FRAMES * DT;
  const perSec = (k: string) => Math.round((counts[k] ?? 0) / secs);
  const seconds = secs;
  return {
    id,
    name: getWeapon(id as never).name,
    shots: Math.round(shots / seconds),
    jsUpdateMs: +(updateNs / FRAMES).toFixed(3),
    jsRenderMs: +(renderNs / FRAMES).toFixed(3),
    fills: perSec('fill'),
    strokes: perSec('stroke'),
    images: perSec('drawImage'),
    paths: perSec('arc') + perSec('ellipse') + perSec('lineTo') + perSec('quadraticCurveTo') + perSec('bezierCurveTo'),
    gradients: perSec('createRadialGradient') + perSec('createLinearGradient'),
    blurs: perSec('shadowBlur'),
    blends: perSec('globalCompositeOperation'),
    peakOwn,
    peakSet7,
    ownKinds,
    set7Kinds,
  };
}

const args = process.argv.slice(2);
const wanted = args.filter((a) => !a.startsWith('--'));
const ids = wanted.length ? wanted : WEAPONS.map((w: { id: string }) => w.id);

const rows: ReturnType<typeof audit>[] = [];
for (const id of ids) {
  try {
    rows.push(audit(id));
  } catch (err) {
    console.error(`skip ${id}: ${(err as Error).message}`);
  }
}

rows.sort((a, b) => (b.fills + b.strokes + b.images + b.paths) - (a.fills + a.strokes + a.images + a.paths));

const header = ['weapon', 'shots/s', 'upd ms', 'ren ms', 'fills', 'strokes', 'imgs', 'paths', 'grad', 'blur', 'blend', 'ownP', 's7P'];
const widths = [16, 7, 7, 7, 7, 7, 6, 8, 6, 5, 6, 5, 5];
const line = (cells: (string | number)[]) => cells.map((c, i) => String(c).padEnd(widths[i])).join(' ');
console.log(line(header));
for (const r of rows) {
  console.log(line([r.id, r.shots, r.jsUpdateMs, r.jsRenderMs, r.fills, r.strokes, r.images, r.paths, r.gradients, r.blurs, r.blends, r.peakOwn, r.peakSet7]));
}

if (args.includes('--kinds')) {
  for (const r of rows) {
    const avg = (o: Record<string, number>) => Object.fromEntries(
      Object.entries(o).map(([k, v]) => [k, +(v / FRAMES).toFixed(1)]).filter(([, v]) => (v as number) >= 1),
    );
    console.log(`${r.id}: own`, JSON.stringify(avg(r.ownKinds)), 'slide7', JSON.stringify(avg(r.set7Kinds)));
  }
}

restore();
