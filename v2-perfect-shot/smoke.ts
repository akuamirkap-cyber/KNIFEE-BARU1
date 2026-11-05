/**
 * PERFECT SHOT v2 — browserless smoke test for the page wiring.
 *
 * `proof.ts` proves the *rules*. This proves the *page*: it boots the real
 * `src/main.ts` (the shell, `mount()`, the rAF loop, the key handler) against a
 * small DOM shim backed by Skia, presses space, and writes PNG frames. If the
 * shell or the canvas driver is broken, this fails — and it runs on a CI box
 * with no browser installed.
 *
 *   npx tsx smoke.ts [outDir]
 */
import { createCanvas } from '@napi-rs/canvas';
import { mkdirSync, writeFileSync } from 'node:fs';

const outDir = process.argv[2] ?? '/tmp/psv2-smoke';
mkdirSync(outDir, { recursive: true });

type Handler = (e: unknown) => void;
const listeners = new Map<string, Set<Handler>>();
const on = (k: string, f: Handler) => {
  const set = listeners.get(k) ?? new Set<Handler>();
  listeners.set(k, set);
  set.add(f);
};
const off = (k: string, f: Handler) => listeners.get(k)?.delete(f);
const fire = (k: string, e: unknown = { preventDefault() {} }) => {
  for (const f of listeners.get(k) ?? []) f(e);
};

const board = createCanvas(480, 960);
const boardEl = {
  width: 480,
  height: 960,
  getContext: (t: string) => (t === '2d' ? board.getContext('2d') : null),
  getBoundingClientRect: () => ({ left: 0, top: 0, width: 480, height: 960 }),
  addEventListener: on,
  removeEventListener: off,
};

interface FakeEl {
  tagName: string;
  style: Record<string, string>;
  children: FakeEl[];
  textContent: string;
  classList: { add(c: string): void; remove(c: string): void; contains(c: string): boolean };
  setAttribute(k: string, v: string): void;
  append(c: FakeEl): void;
  querySelectorAll(): FakeEl[];
  onclick: (() => void) | null;
  addEventListener: typeof on;
  innerHTML: string;
}

const fakeEl = (tag: string): FakeEl => {
  const classes = new Set<string>();
  return {
    tagName: tag.toUpperCase(),
    style: {},
    children: [],
    textContent: '',
    classList: {
      add: (c) => void classes.add(c),
      remove: (c) => void classes.delete(c),
      contains: (c) => classes.has(c),
    },
    setAttribute: () => {},
    append(c) {
      this.children.push(c);
    },
    querySelectorAll: () => [],
    onclick: null,
    addEventListener: on,
    innerHTML: '',
  };
};

const nodes = new Map<string, FakeEl>();
const raf: { cb: ((t: number) => void) | null } = { cb: null };

Object.assign(globalThis, {
  window: {
    devicePixelRatio: 1,
    addEventListener: on,
    removeEventListener: off,
    requestAnimationFrame: (cb: (t: number) => void) => {
      raf.cb = cb;
      return 1;
    },
    cancelAnimationFrame: () => {
      raf.cb = null;
    },
  },
  requestAnimationFrame: (cb: (t: number) => void) => {
    raf.cb = cb;
    return 1;
  },
  cancelAnimationFrame: () => {
    raf.cb = null;
  },
  setInterval: () => 0,
  document: {
    getElementById: (id: string) => {
      if (id === 'board') return boardEl;
      if (!nodes.has(id)) nodes.set(id, fakeEl('div'));
      return nodes.get(id);
    },
    createElement: fakeEl,
  },
});

// Boot the real shell.
await import('./src/main.ts');

const step = (frames: number, fireEvery = 0) => {
  let t = 0;
  for (let i = 0; i < frames; i++) {
    if (fireEvery && i % fireEvery === 0) fire('keydown', { code: 'Space', preventDefault() {} });
    t += 1000 / 60;
    const cb = raf.cb;
    raf.cb = null;
    cb?.(t);
  }
};

const shot = (name: string) => writeFileSync(`${outDir}/${name}.png`, board.toBuffer('image/png'));

step(40);
shot('1-opening');
step(170, 17);
shot('2-mid-run');

console.log(`smoke ok — wrote ${outDir}/{1-opening,2-mid-run}.png`);
