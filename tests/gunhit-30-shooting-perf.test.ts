import test from 'node:test';
import assert from 'node:assert/strict';
import { Canvas, createCanvas } from '@napi-rs/canvas';
import { Particles } from '../games/game-4/src/game/particles';
import { leaves } from '../games/game-4/src/game/spawn3';
import { coins } from '../games/game-4/src/game/spawn6';
import { drawPizzaSlice, drawFastPizzaSlice } from '../games/game-4/src/game/shapes3';
import { PizzaShot, SeedShot } from '../games/game-4/src/game/projectiles3';
import { MagnetShot, PirateShot, SizeShot } from '../games/game-4/src/game/projectiles6';
import { SetSevenFx } from '../src/games/gunhit/game/setSevenFx';

const env = globalThis as unknown as Record<string, unknown>;
const originalDocument = env.document;
const originalCanvas = env.HTMLCanvasElement;
env.document = { createElement: () => createCanvas(1, 1) };
const browser = (on: boolean) => { env.HTMLCanvasElement = on ? Canvas : undefined; };
const asCtx = (c: unknown) => c as CanvasRenderingContext2D;
test.after(() => {
  if (originalDocument === undefined) delete env.document; else env.document = originalDocument;
  if (originalCanvas === undefined) delete env.HTMLCanvasElement; else env.HTMLCanvasElement = originalCanvas;
});

function compare(a: Uint8ClampedArray, b: Uint8ClampedArray, background: number[]) {
  let pixels = 0, total = 0;
  for (let i = 0; i < a.length; i += 4) {
    if (![0, 1, 2].some(k => Math.abs(a[i + k] - background[k]) > 2 || Math.abs(b[i + k] - background[k]) > 2)) continue;
    pixels++;
    for (let k = 0; k < 3; k++) total += Math.abs(a[i + k] - b[i + k]);
  }
  return { pixels, mean: total / Math.max(1, pixels * 3) };
}

test('seed, pizza, magnet, shrink/grow and pirate retain their 60 Hz trails on high-refresh displays', () => {
  const original = Math.random;
  Math.random = () => 0.01; // every optional cosmetic emitter fires
  try {
    const scenarios = [
      ['seed', (fx: SetSevenFx) => new SeedShot(fx.g, 210, 500), 3],
      ['pizza', (fx: SetSevenFx) => new PizzaShot(fx.g, 210, 500), 3],
      ['magnet', (fx: SetSevenFx) => new MagnetShot(fx.g, 210, 500), 4],
      ['shrink', (fx: SetSevenFx) => new SizeShot(fx.g, 210, 500, false), 3],
      ['grow', (fx: SetSevenFx) => new SizeShot(fx.g, 210, 500, true), 3],
      ['pirate', (fx: SetSevenFx) => new PirateShot(fx.g, 210, 500), 3],
    ] as const;
    for (const [name, make, count] of scenarios) {
      for (const hz of [30, 60, 90, 120, 144]) {
        const fx = new SetSevenFx(), shot = make(fx);
        for (let i = 0; i < hz; i++) shot.trail(1 / hz);
        assert.equal(fx.particles.list.length, count * 60, `${name} at ${hz} Hz`);
      }
    }
    const fx = new SetSevenFx();
    const pizza = new PizzaShot(fx.g, 210, 500);
    const pirate = new PirateShot(fx.g, 210, 500);
    pizza.trail(1 / 240); pirate.trail(1 / 240);
    assert.ok(pizza.rot > 0 && pirate.rot > 0, 'rotation updates even between emission ticks');
    const shrink = new SizeShot(fx.g, 210, 500, false);
    shrink.age = 0.4; shrink.trail(1 / 240);
    assert.ok(shrink.tip < 16 && shrink.tip === shrink.r, 'collision tip follows the live shrinking orb');
  } finally { Math.random = original; }
});

test('falling seed leaves keep flutter, shape and fading while their opaque art is cached', () => {
  const oldRandom = Math.random;
  Math.random = () => 0.28;
  const particles = new Particles();
  try { leaves(particles, 80, 80, 1, Math.PI / 2, 1, [20, 90]); }
  finally { Math.random = oldRandom; }
  const leaf = particles.list[0];
  assert.ok(leaf.draw);
  leaf.x = 80; leaf.y = 80; leaf.rot = 0.47;
  const background = [20, 46, 56];
  const paint = (cached: boolean, life: number, rotation = 0.47) => {
    browser(cached); leaf.life = leaf.max * life; leaf.rot = rotation;
    const canvas = createCanvas(160, 160), c = canvas.getContext('2d');
    c.fillStyle = '#142e38'; c.fillRect(0, 0, 160, 160);
    leaf.draw!(asCtx(c), leaf);
    return c.getImageData(0, 0, 160, 160).data;
  };
  for (const life of [1, 0.7, 0.3]) {
    const diff = compare(paint(false, life), paint(true, life), background);
    assert.ok(diff.pixels > 20, 'the whole leaf is visible');
    assert.ok(diff.mean < 10, `leaf shading matches the vector at ${life} life (${diff.mean.toFixed(2)}/255)`);
    if (life === 0.3) assert.equal(diff.mean, 0, 'fading vector layers retain exact translucency');
  }
  assert.ok(compare(paint(true, 1, 0), paint(true, 1, 1.5), background).mean > 5, 'leaf rotation is still live');

  browser(true); leaf.life = leaf.max;
  const canvas = createCanvas(160, 160), c = canvas.getContext('2d');
  leaf.draw!(asCtx(c), leaf); // warm this length and colour
  let images = 0, gradients = 0;
  const image = c.drawImage.bind(c), gradient = c.createLinearGradient.bind(c);
  c.drawImage = (...args: Parameters<typeof c.drawImage>) => { images++; return image(...args); };
  c.createLinearGradient = (...args: Parameters<typeof c.createLinearGradient>) => { gradients++; return gradient(...args); };
  leaf.draw!(asCtx(c), leaf);
  assert.equal(images, 1, 'opaque leaf uses one cached image');
  assert.equal(gradients, 0, 'no per-leaf gradient is allocated');
  leaf.life = leaf.max * 0.3;
  leaf.draw!(asCtx(c), leaf);
  assert.equal(gradients, 1, 'fading leaves deliberately fall back to the layered vector');
});

test('pirate coins keep flipping and glowing without a radial gradient on each opaque coin', () => {
  const oldRandom = Math.random;
  Math.random = () => 0.28;
  const particles = new Particles();
  try { coins(particles, 80, 80, 1, Math.PI / 2, 1, [20, 90]); }
  finally { Math.random = oldRandom; }
  const coin = particles.list[0];
  assert.ok(coin.draw);
  coin.x = 80; coin.y = 80;
  const background = [20, 46, 56];
  const paint = (cached: boolean, life: number, seed = coin.seed) => {
    browser(cached); coin.life = coin.max * life; coin.seed = seed;
    const canvas = createCanvas(160, 160), c = canvas.getContext('2d');
    c.fillStyle = '#142e38'; c.fillRect(0, 0, 160, 160);
    coin.draw!(asCtx(c), coin);
    return c.getImageData(0, 0, 160, 160).data;
  };
  for (const life of [1, 0.8, 0.3]) {
    const diff = compare(paint(false, life), paint(true, life), background);
    assert.ok(diff.pixels > 200, 'coin and glow remain visible');
    assert.ok(diff.mean < 6, `coin art matches its vector at ${life} life (${diff.mean.toFixed(2)}/255)`);
    if (life === 0.3) assert.equal(diff.mean, 0, 'transparent coin details retain their original blending');
  }
  assert.ok(compare(paint(true, 1, 0), paint(true, 1, Math.PI / 2), background).mean > 3, 'coin flip is still animated');

  browser(true); coin.life = coin.max;
  const canvas = createCanvas(160, 160), c = canvas.getContext('2d');
  coin.draw!(asCtx(c), coin);
  let images = 0, gradients = 0;
  const image = c.drawImage.bind(c), gradient = c.createRadialGradient.bind(c);
  c.drawImage = (...args: Parameters<typeof c.drawImage>) => { images++; return image(...args); };
  c.createRadialGradient = (...args: Parameters<typeof c.createRadialGradient>) => { gradients++; return gradient(...args); };
  coin.draw!(asCtx(c), coin);
  assert.equal(images, 1); assert.equal(gradients, 0);
  coin.life = coin.max * 0.3; coin.draw!(asCtx(c), coin);
  assert.equal(gradients, 1, 'fading coin reuses its layered vector');
});

test('pizza keeps toppings, crust, and layered translucent afterimages with cached art', () => {
  const background = [20, 46, 56];
  const paint = (cached: boolean, size: number, alpha: number) => {
    browser(cached);
    const canvas = createCanvas(260, 260), c = canvas.getContext('2d');
    c.fillStyle = '#142e38'; c.fillRect(0, 0, 260, 260);
    c.translate(130, 130); c.rotate(0.31); c.scale(3.3, 3.3); c.globalAlpha = alpha;
    (cached ? drawFastPizzaSlice : drawPizzaSlice)(asCtx(c), size);
    return c.getImageData(0, 0, 260, 260).data;
  };
  for (const size of [24, 34, 36]) for (const alpha of [0.12, 0.24, 0.36, 1]) {
    const diff = compare(paint(false, size, alpha), paint(true, size, alpha), background);
    assert.ok(diff.pixels > 3000, 'the pizza and its topping remain visible');
    assert.ok(diff.mean < 4, `pizza stays close to vector art at ${size}/${alpha} (${diff.mean.toFixed(2)}/255)`);
  }
  browser(true);
  const canvas = createCanvas(160, 160), c = canvas.getContext('2d'), ctx = asCtx(c);
  for (const alpha of [0.12, 0.24, 0.36, 1]) { c.globalAlpha = alpha; drawFastPizzaSlice(ctx, 36); }
  let images = 0, gradients = 0, strokes = 0;
  const image = c.drawImage.bind(c), linear = c.createLinearGradient.bind(c), radial = c.createRadialGradient.bind(c), stroke = c.stroke.bind(c);
  c.drawImage = (...args: Parameters<typeof c.drawImage>) => { images++; return image(...args); };
  c.createLinearGradient = (...args: Parameters<typeof c.createLinearGradient>) => { gradients++; return linear(...args); };
  c.createRadialGradient = (...args: Parameters<typeof c.createRadialGradient>) => { gradients++; return radial(...args); };
  c.stroke = (...args: Parameters<typeof c.stroke>) => { strokes++; return stroke(...args); };
  for (const alpha of [0.12, 0.24, 0.36, 1]) { c.globalAlpha = alpha; drawFastPizzaSlice(ctx, 36); }
  assert.equal(images, 4, 'all three afterimages and the pizza remain');
  assert.equal(gradients, 0); assert.equal(strokes, 0);
  c.globalAlpha = 0.53; drawFastPizzaSlice(ctx, 36);
  assert.ok(gradients > 0 && strokes > 0, 'unusual opacities fall back to the original vector art');
});
