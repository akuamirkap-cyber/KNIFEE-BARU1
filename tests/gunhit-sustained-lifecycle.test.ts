import test from 'node:test';
import assert from 'node:assert/strict';
import { installCanvasShim } from './supportCanvas';
import { installSilentAudio } from '../tools/supportAudioSilent';

installCanvasShim();
const env = globalThis as unknown as Record<string, any> & { window: Record<string, any> };
const images: { naturalWidth: number; naturalHeight: number; onload: (() => void) | null; src: string }[] = [];
env.Image = class {
  naturalWidth = 2; naturalHeight = 2; onload: (() => void) | null = null; src = '';
  constructor() { images.push(this); }
};
Object.assign(env.window, {
  setTimeout, clearTimeout, setInterval: () => 0, clearInterval: () => undefined,
  addEventListener: () => undefined, removeEventListener: () => undefined,
  devicePixelRatio: 1, innerWidth: 420, innerHeight: 760,
});
installSilentAudio();
const { SoundEngine } = await import('../games/game-8/src/game/sound.ts');
const { SetElevenFx, setElevenMuted } = await import('../src/games/gunhit/game/setElevenFx.ts');
const { Game, makeLevel } = await import('../src/games/gunhit/game/Game.ts');
const variants = await import('../src/games/gunhit/game/art/gunVariants.ts');
const { drawGunCentered } = await import('../src/games/gunhit/game/art/drawCentered.ts');

const gradient = { addColorStop: () => undefined };
const ctx = new Proxy({ canvas: { width: 420, height: 760 } } as Record<string, any>, {
  get(target, prop) {
    if (prop === 'canvas') return target.canvas;
    if (prop === 'createLinearGradient' || prop === 'createRadialGradient' || prop === 'createPattern') return () => gradient;
    if (prop === 'measureText') return () => ({ width: 10 });
    if (prop === 'getImageData') return () => ({ data: new Uint8ClampedArray(4) });
    return () => undefined;
  },
  set(target, prop, value) { target[String(prop)] = value; return true; },
}) as unknown as CanvasRenderingContext2D;
const canvas = {
  width: 420, height: 760, style: {}, getContext: () => ctx,
  addEventListener: () => undefined, removeEventListener: () => undefined,
  getBoundingClientRect: () => ({ left: 0, top: 0, width: 420, height: 760 }),
};
const newGame = () => new Game(canvas as unknown as HTMLCanvasElement, {} as never) as unknown as Record<string, any>;

test('completed slide-11 delayed sounds do not retain timeout handles, and pending sounds can still be cancelled', () => {
  const originalSet = env.window.setTimeout, originalClear = globalThis.clearTimeout;
  let next = 0;
  const callbacks = new Map<number, () => void>();
  env.window.setTimeout = (fn: () => void) => { const id = ++next; callbacks.set(id, fn); return id; };
  globalThis.clearTimeout = ((id: number) => { callbacks.delete(id); }) as typeof clearTimeout;
  const engine = new SoundEngine() as unknown as Record<string, any>;
  try {
    let fired = 0;
    for (let i = 0; i < 5000; i++) {
      engine.later(10, () => { fired++; });
      const [id, fn] = callbacks.entries().next().value!;
      callbacks.delete(id); fn();
      assert.equal(engine.timers.size, 0, 'each completed timer is removed immediately');
    }
    assert.equal(fired, 5000);
    engine.later(10, () => { fired++; engine.later(10, () => { fired++; }); });
    engine.later(10, () => { fired++; });
    assert.equal(engine.timers.size, 2);
    const [id, fn] = callbacks.entries().next().value!;
    callbacks.delete(id); fn();
    assert.equal(engine.timers.size, 2, 'a callback may schedule another pending sound');
    engine.stopAll();
    assert.equal(engine.timers.size, 0);
    assert.equal(callbacks.size, 0, 'stopAll cancels only still-pending sounds');
    engine.dispose(); engine.dispose();
    engine.later(10, () => { fired++; });
    assert.equal(callbacks.size, 0, 'disposed sound engines cannot schedule new work');
  } finally {
    env.window.setTimeout = originalSet;
    globalThis.clearTimeout = originalClear;
  }
});

test('destroying a slide-11 host unregisters it and closes its own audio graph exactly once', () => {
  const fx = new SetElevenFx();
  const raw = fx.raw!;
  assert.ok(raw?.sfx.ac, 'a live host has its own unlocked sound graph');
  let closed = 0, changes = 0, muted = raw.sfx.muted;
  const ac = raw.sfx.ac!;
  ac.close = () => { closed++; return Promise.resolve(); };
  Object.defineProperty(raw.sfx, 'muted', { configurable: true, get: () => muted, set: (v) => { muted = v; changes++; } });
  try {
    setElevenMuted(true);
    assert.equal(changes, 1, 'a live engine receives the global switch');
    fx.dispose(); fx.dispose();
    assert.equal(fx.raw, null);
    assert.equal(raw.sfx.ac, null);
    assert.equal(closed, 1, 'the per-game AudioContext is closed exactly once');
    setElevenMuted(false);
    assert.equal(changes, 1, 'a destroyed engine no longer receives mute/volume updates');
    raw.sfx.unlock();
    assert.equal(raw.sfx.ac, null, 'a disposed graph is not reopened');
  } finally { setElevenMuted(false); }
});

test('Game.destroy removes its boss listener and disposes its slide-11 host', () => {
  assert.ok(images.length >= 2, 'boss images were registered at module load');
  const game = newGame();
  game.level = makeLevel(10); game.level.boss = true;
  let rebuilds = 0;
  game.buildFace = () => { rebuilds++; };
  const host = game.s11 as InstanceType<typeof SetElevenFx>;
  const engine = host.raw!.sfx;
  let closed = 0;
  engine.ac!.close = () => { closed++; return Promise.resolve(); };
  images[0].onload!();
  assert.equal(rebuilds, 1, 'a living boss game refreshes when an asset loads');
  game.destroy(); game.destroy();
  assert.equal(closed, 1);
  assert.equal(game.s11State, undefined);
  images[1].onload!();
  assert.equal(rebuilds, 1, 'a removed game is no longer kept or notified by the global listener');
});

test('Black Hole previews never add particles to a paused game, while the live gun still does', () => {
  const previous = variants.getGunVariant('blackhole'), originalRandom = Math.random;
  variants.setGunVariant('blackhole', 'latest');
  Math.random = () => 0.01;
  const game = newGame();
  try {
    game.setWeapon('blackhole');
    game.level = makeLevel(1); game.state = 'play'; game.ammoLeft = 9; game.cooldown = 0; game.reloadT = 0;
    game.render();
    const layer = game.s2State;
    assert.ok(layer?.particles.length > 0, 'the gameplay gun still supplies its charge sparks');
    const before = layer.particles.length;
    for (let i = 0; i < 1000; i++) drawGunCentered(ctx, 'blackhole', i / 60, 0, true, 'latest', true);
    assert.equal(layer.particles.length, before, 'preview frames cannot fill the paused game particle array');
  } finally {
    game.destroy();
    variants.setGunVariant('blackhole', previous);
    Math.random = originalRandom;
  }
});

test('repeated game mounts do not leave slide-11 engines subscribed or open', () => {
  const engines: { engine: any; changes: () => number }[] = [];
  let closed = 0;
  for (let i = 0; i < 20; i++) {
    const game = newGame(), engine = (game.s11 as InstanceType<typeof SetElevenFx>).raw!.sfx;
    let changes = 0, value = engine.muted;
    Object.defineProperty(engine, 'muted', { configurable: true, get: () => value, set: (v) => { value = v; changes++; } });
    engine.ac!.close = () => { closed++; return Promise.resolve(); };
    engines.push({ engine, changes: () => changes });
    game.destroy();
  }
  assert.equal(closed, 20, 'each owned audio context closed exactly once');
  setElevenMuted(true); setElevenMuted(false);
  assert.ok(engines.every(({ engine, changes }) => engine.ac === null && changes() === 0), 'none of the old engines remains in the global switch registry');
});
