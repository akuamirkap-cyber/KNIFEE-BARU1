import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { installCanvasShim } from './supportCanvas';
import { installSilentAudio } from '../tools/supportAudioSilent';

installCanvasShim();
const g = globalThis as unknown as { window: Record<string, unknown> };
g.window = Object.assign(g.window ?? {}, {
  setTimeout, clearTimeout, setInterval: () => 0, clearInterval: () => undefined,
  addEventListener: () => undefined, removeEventListener: () => undefined,
  devicePixelRatio: 1, innerWidth: 420, innerHeight: 760,
});
installSilentAudio();

const { Game } = await import('../src/games/gunhit/game/Game');
const { levelConfig } = await import('../src/games/perfect-shot/play/levels');

const gradient = { addColorStop: () => undefined };
function context(): CanvasRenderingContext2D {
  const target: Record<string, unknown> = { canvas: { width: 420, height: 760 }, globalAlpha: 1 };
  return new Proxy(target, {
    get(obj, prop) {
      if (prop === 'canvas' || prop === 'globalAlpha') return obj[prop];
      if (prop === 'createLinearGradient' || prop === 'createRadialGradient' || prop === 'createConicGradient' || prop === 'createPattern') return () => gradient;
      if (prop === 'measureText') return () => ({ width: 8 });
      if (prop === 'getImageData') return () => ({ data: new Uint8ClampedArray(4) });
      return () => undefined;
    },
    set(obj, prop, value) { obj[String(prop)] = value; return true; },
  }) as unknown as CanvasRenderingContext2D;
}
function canvas(): HTMLCanvasElement {
  const ctx = context();
  return {
    width: 420, height: 760, style: {}, getContext: () => ctx,
    addEventListener: () => undefined, removeEventListener: () => undefined,
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 420, height: 760 }),
  } as unknown as HTMLCanvasElement;
}
const events = { onGameOver: () => undefined, onStageChange: () => undefined, onStageCleared: () => undefined };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Live = any;

const keyFor = (n: number) => {
  const c = levelConfig(n);
  return `${c.target}|${c.head ?? ''}`;
};

test('every stage Game A loads asks for Perfect Shot’s wheel artwork', () => {
  const requested: number[] = [];
  const game = new Game(canvas(), events as never) as Live;
  try {
    game.setWheelArtSource({ keyFor, get: () => null, request: (n: number) => requested.push(n) });
    requested.length = 0; // the constructor already asked for its level-1 wheel
    game.startAtLevel(3);
    assert.ok(requested.includes(3), 'the engine requests the stage-3 wheel');
    assert.equal(game.wheelArtKey, keyFor(3), 'the key is keyed by the stage’s own artwork');

    game.startAtLevel(12);
    assert.ok(requested.includes(12), 'a later stage asks for its own wheel');
    assert.equal(game.wheelArtKey, keyFor(12));
  } finally {
    game.destroy();
  }
});

test('the transferred image replaces the canvas face and late arrivals for other stages are ignored', () => {
  const game = new Game(canvas(), events as never) as Live;
  try {
    game.setWheelArtSource({ keyFor, get: () => null, request: () => undefined });
    game.startAtLevel(12);
    const stale = { width: 200, height: 200 } as unknown as HTMLImageElement;
    game.setWheelArt(keyFor(4), stale);
    assert.equal(game.wheelImage, null, 'a wheel for another stage is not worn by this one');

    const image = { width: 200, height: 200 } as unknown as HTMLImageElement;
    game.setWheelArt(keyFor(12), image);
    assert.equal(game.wheelImage, image, 'the stage’s own reference wheel is baked into the face');
    assert.ok(game.face, 'the face canvas is rebuilt around the transferred artwork');
  } finally {
    game.destroy();
  }
});

test('cached artwork is reused without a second request', () => {
  const requested: number[] = [];
  const cache = new Map<string, HTMLImageElement>();
  const image = { width: 200, height: 200 } as unknown as HTMLImageElement;
  cache.set(keyFor(2), image);
  const game = new Game(canvas(), events as never) as Live;
  try {
    game.setWheelArtSource({
      keyFor,
      get: (key: string) => cache.get(key) ?? null,
      request: (n: number) => requested.push(n),
    });
    requested.length = 0; // ignore the constructor’s level-1 request
    game.startAtLevel(2);
    assert.equal(game.wheelImage, image);
    assert.deepEqual(requested, [], 'nothing is rasterised twice');
  } finally {
    game.destroy();
  }
});

test('the face renderer draws the reference wheel and falls back to the canvas art until it lands', () => {
  const source = readFileSync('src/games/gunhit/game/Game.ts', 'utf8');
  assert.match(source, /if \(this\.wheelImage\) c\.drawImage\(this\.wheelImage, -R, -R, R \* 2, R \* 2\)/);
  assert.match(source, /else drawFace\(c, R, this\.level\.style\)/);
  assert.match(source, /this\.syncWheelArt\(true\)/);
});

test('the React bridge rasterises Perfect Shot’s own TargetArt and hands it to the engine', () => {
  const bridge = readFileSync('src/games/gunhit/components/WheelArtBridge.tsx', 'utf8');
  assert.match(bridge, /import \{ TargetArt \} from "\.\.\/\.\.\/perfect-shot\/play\/TargetArt"/);
  assert.match(bridge, /XMLSerializer/);
  assert.match(bridge, /new Image\(\)/);
  assert.match(bridge, /image\/svg\+xml/);

  const app = readFileSync('src/games/gunhit/App.tsx', 'utf8');
  assert.match(app, /g\.setWheelArtSource\(\{/);
  assert.match(app, /<WheelArtBridge/);
  assert.match(app, /levelConfig\(level\)/, 'the Art key comes from the reference level table');
});

test('stage 1 keeps the reference orange wheel and stage 5 is the reference boss', () => {
  assert.equal(levelConfig(1).target, 'orange');
  assert.equal(levelConfig(5).boss, true);
  assert.ok(levelConfig(2).target !== levelConfig(1).target, 'stage 2 already shows a different wheel');
});
