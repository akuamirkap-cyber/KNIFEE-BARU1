/**
 * Finds which code paints a giant, off-looking shape: tracks the canvas
 * transform and reports every filled path whose screen-space bounding box is
 * suspiciously large, with the JS stack that drew it.
 *
 * Usage: npx tsx tools/glitch-probe.ts [weaponId] [frame] [minPx]
 */
import { createCanvas } from '@napi-rs/canvas';

const W = 420;
const H = 760;
const g = globalThis as unknown as Record<string, unknown> & { window: Record<string, unknown> };
g.window = Object.assign(g.window ?? {}, {
  setTimeout, clearTimeout, setInterval: () => 0, clearInterval: () => undefined,
  addEventListener: () => undefined, removeEventListener: () => undefined,
  devicePixelRatio: 1, innerWidth: W, innerHeight: H,
});
let canvasSeq = 0;
g.document = {
  createElement: (tag: string) => {
    if (tag !== 'canvas') return { style: {} };
    const cv = createCanvas(64, 64) as unknown as Record<string, any>;
    cv.__id = `offscreen#${++canvasSeq}`;
    offscreen.push(cv);
    return cv;
  },
  addEventListener: () => undefined, removeEventListener: () => undefined,
};
g.Image = class { width = 1; height = 1; onload: (() => void) | null = null; onerror: (() => void) | null = null; set src(_v: string) {} };

let seed = 12345 >>> 0;
Math.random = () => {
  seed = (seed + 0x6d2b79f5) >>> 0;
  let t = seed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const id = process.argv[2] ?? 'paintball';
const targetFrame = Number(process.argv[3] ?? 40);
const MIN_PX = Number(process.argv[4] ?? 220);

const { Game, makeLevel } = await import('../src/games/gunhit/game/Game.ts');

type M = [number, number, number, number, number, number];
const I: M = [1, 0, 0, 1, 0, 0];
const mul = (a: M, b: M): M => [
  a[0] * b[0] + a[2] * b[1], a[1] * b[0] + a[3] * b[1],
  a[0] * b[2] + a[2] * b[3], a[1] * b[2] + a[3] * b[3],
  a[0] * b[4] + a[2] * b[5] + a[4], a[1] * b[4] + a[3] * b[5] + a[5],
];

const reports: string[] = [];
const offscreen: Record<string, any>[] = [];
let recording = false;
let currentLabel = 'main';

let label = 'main';
function instrument(raw: CanvasRenderingContext2D, canvas: { width: number; height: number }) {
  const label = currentLabel;
  let m: M = [...I] as M;
  const stack: M[] = [];
  const pts: { x: number; y: number }[] = [];
  let cur = { x: 0, y: 0 };
  let min = { x: 0, y: 0 };
  let max = { x: 0, y: 0 };
  const apply = (x: number, y: number) => ({ x: m[0] * x + m[2] * y + m[4], y: m[1] * x + m[3] * y + m[5] });
  const addPoint = (x: number, y: number) => {
    const p = apply(x, y);
    cur = p;
    if (!pts.length) { min = { ...p }; max = { ...p }; }
    else {
      min = { x: Math.min(min.x, p.x), y: Math.min(min.y, p.y) };
      max = { x: Math.max(max.x, p.x), y: Math.max(max.y, p.y) };
    }
    pts.push(p);
  };
  const reset = () => { pts.length = 0; };
  const c = raw as unknown as Record<string, any>;
  // Bind every original BEFORE overriding: once `c.foo` exists as an own
  // property, `raw.foo` resolves to it and calls itself forever.
  const orig = (name: string) => (raw as unknown as Record<string, any>)[name].bind(raw);
  const oSave = orig('save');
  const oRestore = orig('restore');
  const oTranslate = orig('translate');
  const oScale = orig('scale');
  const oRotate = orig('rotate');
  const oSetTransform = orig('setTransform');
  const oBeginPath = orig('beginPath');
  const oFill = orig('fill');
  const oStroke = orig('stroke');
  const oFillRect = orig('fillRect');
  const wrap = (name: string, fn: (...a: any[]) => void) => {
    const base = orig(name);
    c[name] = (...a: any[]) => { fn(...a); base(...a); };
  };
  c.save = () => { stack.push([...m] as M); oSave(); };
  c.restore = () => { m = (stack.pop() ?? [...I]) as M; reset(); oRestore(); };
  c.translate = (x: number, y: number) => { m = mul(m, [1, 0, 0, 1, x, y]); oTranslate(x, y); };
  c.scale = (x: number, y: number) => { m = mul(m, [x, 0, 0, y, 0, 0]); oScale(x, y); };
  c.rotate = (a: number) => { m = mul(m, [Math.cos(a), Math.sin(a), -Math.sin(a), Math.cos(a), 0, 0]); oRotate(a); };
  c.setTransform = (a: number, b: number, cc: number, d: number, e: number, f: number) => { m = [a, b, cc, d, e, f]; oSetTransform(a, b, cc, d, e, f); };
  c.beginPath = () => { reset(); oBeginPath(); };
  wrap('moveTo', (x: number, y: number) => addPoint(x, y));
  wrap('lineTo', (x: number, y: number) => addPoint(x, y));
  wrap('arc', (x: number, y: number, r: number) => { addPoint(x - r, y - r); addPoint(x + r, y + r); });
  wrap('ellipse', (x: number, y: number, rx: number, ry: number) => { addPoint(x - rx, y - ry); addPoint(x + rx, y + ry); });
  wrap('quadraticCurveTo', (cx: number, cy: number, x: number, y: number) => { addPoint(cx, cy); addPoint(x, y); });
  wrap('bezierCurveTo', (c1x: number, c1y: number, c2x: number, c2y: number, x: number, y: number) => { addPoint(c1x, c1y); addPoint(c2x, c2y); addPoint(x, y); });
  wrap('rect', (x: number, y: number, w: number, h: number) => { addPoint(x, y); addPoint(x + w, y + h); });
  const glitchFillRect = (x: number, y: number, w: number, h: number) => {
    const a = apply(x, y); const b = apply(x + w, y + h);
    if (!recording) return;
    if (Math.abs(b.x - a.x) > MIN_PX || Math.abs(b.y - a.y) > MIN_PX) {
      reports.push(`fillRect ${fillOf(raw)} at ${fmt(a)} size ${Math.round(b.x - a.x)}x${Math.round(b.y - a.y)}\n${stackOf()}`);
    }
  };
  wrap('fillRect', glitchFillRect);
  c.fill = () => {
    oFill();
    if (!recording || !pts.length) return;
    const w = max.x - min.x;
    const h = max.y - min.y;
    if (w > MIN_PX || h > MIN_PX) {
      reports.push(`fill ${fillOf(raw)} bbox ${fmt(min)}..${fmt(max)} (${Math.round(w)}x${Math.round(h)}) pts ${pts.length} @${label}\n${stackOf()}`);
    }
  };
  c.stroke = () => {
    oStroke();
    if (!recording || !pts.length) return;
    const w = max.x - min.x;
    const h = max.y - min.y;
    if (w > MIN_PX || h > MIN_PX) {
      reports.push(`stroke ${String(c.strokeStyle)} lw=${c.lineWidth} bbox ${fmt(min)}..${fmt(max)} (${Math.round(w)}x${Math.round(h)})\n${stackOf()}`);
    }
  };
  void canvas;
}

function fillOf(raw: CanvasRenderingContext2D) {
  const s = raw.fillStyle;
  return typeof s === 'string' ? s : '[gradient]';
}
const fmt = (p: { x: number; y: number }) => `(${Math.round(p.x)},${Math.round(p.y)})`;
function stackOf() {
  const lines = (new Error().stack ?? '').split('\n').slice(3, 8).map((l) => l.trim().replace(/\s*\(.*KNIFEE-BARU1\//, '('));
  return lines.join('\n    ');
}

const canvas = createCanvas(W, H) as unknown as Record<string, any>;
const rawCtx = canvas.getContext('2d') as CanvasRenderingContext2D;
instrument(rawCtx, canvas as unknown as { width: number; height: number });

// The game bakes the wheel face, glow sprites and gun art into offscreen
// canvases; a bad paint there shows up later as a huge `drawImage`.
for (const cv of offscreen) {
  currentLabel = cv.__id;
  const c2 = cv.getContext('2d') as CanvasRenderingContext2D;
  instrument(c2, cv as unknown as { width: number; height: number });
}
canvas.style = {};
canvas.addEventListener = () => undefined;
canvas.removeEventListener = () => undefined;
canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: W, height: H });

const game = new Game(canvas as unknown as HTMLCanvasElement, { onGameOver: () => {}, onStageChange: () => {} } as never) as unknown as Record<string, any>;
game.level = makeLevel(3);
game.state = 'play';
game.setWeapon(id);

const DT = 1 / 60;
for (let f = 0; f <= targetFrame; f++) {
  game.state = 'play';
  game.stuck = 0;
  game.ammoLeft = game.level.ammo;
  if (game.items.length > 10) game.items.splice(0, game.items.length - 10);
  if (game.s7?.stuck?.length > 10) game.s7.stuck.splice(0, game.s7.stuck.length - 10);
  if (game.cooldown <= 0) game.shoot();
  game.update(DT);
  if (f === targetFrame) {
    for (const cv of offscreen) {
      if (cv.__instrumented) continue;
      cv.__instrumented = true;
      currentLabel = cv.__id;
      instrument(cv.getContext('2d') as CanvasRenderingContext2D, cv as unknown as { width: number; height: number });
    }
  }
  recording = f === targetFrame;
  game.render();
}

for (const cv of offscreen) {
  if (cv.__instrumented) continue;
  cv.__instrumented = true;
  currentLabel = cv.__id;
  instrument(cv.getContext('2d') as CanvasRenderingContext2D, cv as unknown as { width: number; height: number });
}
console.log(`frame ${targetFrame}: ${reports.length} suspicious paint ops (bbox > ${MIN_PX}px) across ${offscreen.length} offscreen canvases\n`);
const pts = (r: string) => Number((r.match(/pts (\d+)/) ?? [0, 99])[1]);
const MAX_PTS = Number(process.env.MAX_PTS ?? 12);
const area = (r: string) => {
  const m = r.match(/\((\d+)x(\d+)\)/);
  return m ? Number(m[1]) * Number(m[2]) : 0;
};
const seen = new Map<string, { n: number; r: string; a: number }>();
for (const r of reports) {
  if (pts(r) > MAX_PTS) continue;
  const head = r.split('\n')[0];
  const key = head.replace(/\(-?\d+,-?\d+\)\.\.\(-?\d+,-?\d+\)/, '(bbox)');
  const e = seen.get(key) ?? { n: 0, r, a: area(r) };
  e.n++;
  if (area(r) > e.a) { e.a = area(r); e.r = r; }
  seen.set(key, e);
}
const list = [...seen.values()].sort((a, b) => b.a - a.a);
for (const e of list) {
  console.log(`x${e.n}  area ${e.a}  ${e.r.split('\n')[0]}`);
  console.log('    ' + e.r.split('\n').slice(1, 5).join('\n    ') + '\n');
}
