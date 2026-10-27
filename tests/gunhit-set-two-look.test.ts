import test from 'node:test';
import assert from 'node:assert/strict';

import {
  drawSetTwoAtmosphere, drawSetTwoPins, drawSetTwoSky, drawSetTwoStars,
  drawSetTwoWheelGlow, resetSetTwoSky, setTwoWheelHue, type SetTwoPin,
} from '../src/games/gunhit/game/setTwoLook';
import { SetTwoFx } from '../src/games/gunhit/game/setTwoFx';
import { SET_TWO_IDS } from '../src/games/gunhit/game/setTwoArt';

function fakeCtx(calls: string[] = []) {
  const gradient = { addColorStop: () => undefined };
  return new Proxy({} as Record<string, unknown>, {
    get: (_t, prop) => {
      const name = String(prop);
      if (name === 'createLinearGradient' || name === 'createRadialGradient'
        || name === 'createConicGradient' || name === 'createPattern') return () => gradient;
      if (name === 'canvas') return { width: 420, height: 760 };
      if (name === 'measureText') return () => ({ width: 10 });
      if (name === 'getImageData') return () => ({ data: new Uint8ClampedArray(4) });
      if (['fill', 'stroke', 'fillRect', 'strokeRect', 'arc', 'moveTo', 'lineTo',
        'quadraticCurveTo', 'bezierCurveTo', 'ellipse', 'roundRect', 'fillText',
        'translate', 'rotate', 'scale', 'save', 'restore', 'drawImage', 'clip',
        'setTransform'].includes(name)) {
        return (...args: unknown[]) => calls.push(`${name}:${args.join(',')}`);
      }
      return () => undefined;
    },
    set: () => true,
  }) as unknown as CanvasRenderingContext2D;
}

const pin = (over: Partial<SetTwoPin> = {}): SetTwoPin => ({ a: Math.PI / 2, hue: 28, seed: 3.5, flash: 1, bite: 1, ...over });

test('slide 2 sky: painted once into a cache when a canvas is available', () => {
  const calls: string[] = [];
  const fakeCanvas = {
    width: 420,
    height: 760,
    getContext: () => fakeCtx(calls),
  };
  const g = globalThis as { document?: unknown };
  const previous = g.document;
  g.document = { createElement: () => fakeCanvas };
  resetSetTwoSky();
  try {
    const out: string[] = [];
    drawSetTwoSky(fakeCtx(out));
    assert.ok(out.some((c) => c.startsWith('drawImage:')), 'the cached sky is blitted');
    // The skyline itself was painted into the offscreen layer.
    assert.ok(calls.filter((c) => c.startsWith('fillRect:')).length > 20, 'skyline windows');
  } finally {
    g.document = previous;
    resetSetTwoSky();
  }
});

test('slide 2 sky never throws without a DOM', () => {
  const g = globalThis as { document?: unknown };
  const previous = g.document;
  delete g.document;
  resetSetTwoSky();
  try {
    const calls: string[] = [];
    assert.doesNotThrow(() => drawSetTwoSky(fakeCtx(calls)));
    assert.equal(calls.length, 0);
  } finally {
    g.document = previous;
    resetSetTwoSky();
  }
});

test('slide 2 stars: 110 twinkling dots', () => {
  const calls: string[] = [];
  drawSetTwoStars(fakeCtx(calls), 1.7);
  assert.equal(calls.filter((c) => c.startsWith('arc:')).length, 110);
});

test('every slide-2 weapon keeps its own atmosphere wash', () => {
  for (const id of SET_TWO_IDS) {
    const calls: string[] = [];
    assert.doesNotThrow(() => drawSetTwoAtmosphere(fakeCtx(calls), id, 2.4, 210, 255), id);
    // The firework launcher is the one gun slide 2 never tints: its show is the
    // sky itself (the rockets the FX layer keeps launching overhead).
    if (id === 'firework') assert.equal(calls.length, 0);
    else assert.ok(calls.length > 0, `${id} paints a backdrop`);
  }
});

test('the atmosphere washes differ per weapon', () => {
  const sample = (id: string) => {
    const calls: string[] = [];
    drawSetTwoAtmosphere(fakeCtx(calls), id, 2.4, 210, 255);
    return calls.length;
  };
  const shapes = SET_TWO_IDS.map(sample);
  assert.ok(new Set(shapes).size > 1, 'the eight weapons do not share one wash');
});

test('the wheel keeps slide 2 glow ring, coloured per weapon and level', () => {
  const calls: string[] = [];
  drawSetTwoWheelGlow(fakeCtx(calls), 106, setTwoWheelHue('shark', 3), 0.5);
  assert.ok(calls.some((c) => c.startsWith('arc:')));
  assert.equal(setTwoWheelHue('blackhole', 1), 272);
  assert.equal(setTwoWheelHue('shark', 1), 211);
  assert.equal(setTwoWheelHue('rainbow', 1), 67);
  assert.notEqual(setTwoWheelHue('bamboo', 1), setTwoWheelHue('bamboo', 2));
});

test('every slide-2 weapon draws its own stuck round', () => {
  for (const id of SET_TWO_IDS) {
    const calls: string[] = [];
    assert.doesNotThrow(() => drawSetTwoPins(fakeCtx(calls), id, 1.2, 106, [pin()]), id);
    assert.ok(calls.length > 3, `${id} paints a stuck round`);
  }
});

test('a fresh hit wears a flash, a settled one does not', () => {
  const fresh: string[] = [];
  drawSetTwoPins(fakeCtx(fresh), 'blackhole', 1, 106, [pin({ flash: 1 })]);
  const settled: string[] = [];
  drawSetTwoPins(fakeCtx(settled), 'blackhole', 1, 106, [pin({ flash: 0, bite: 0 })]);
  assert.ok(fresh.length > settled.length, 'the impact flash adds paint');
});

test('no pins means nothing to paint', () => {
  const calls: string[] = [];
  drawSetTwoPins(fakeCtx(calls), 'shark', 1, 106, []);
  assert.equal(calls.length, 0);
});

test('slide 2 sky rockets: launched, burst and cleared', () => {
  const fx = new SetTwoFx();
  fx.h = 760;
  fx.launchSky(1.1);
  assert.equal(fx.sky.length, 1);
  const rocket = fx.sky[0];
  assert.ok(rocket.vy < 0, 'the rocket climbs');
  assert.ok(rocket.y > 500, 'launched from the bottom of the screen');

  // Climb until it runs out of steam, then it bursts into the sky.
  for (let i = 0; i < 200 && fx.sky.length > 0; i++) fx.update(1 / 60);
  assert.equal(fx.sky.length, 0, 'the rocket bursts');
  assert.ok(fx.particles.length > 0, 'and leaves a firework');

  fx.sky.push({ x: 100, y: 200, vx: 0, vy: -100, hue: 40, type: 'peony', scale: 1 });
  fx.clear();
  assert.equal(fx.sky.length, 0, 'a new level takes the sky show with it');
});

test('the ambient show only runs while slide 1 is playing', () => {
  const idle = new SetTwoFx();
  idle.weapon = 'firework';
  idle.ambient = false;
  for (let i = 0; i < 600; i++) idle.update(1 / 60);
  assert.equal(idle.sky.length, 0, 'no show outside play');

  const playing = new SetTwoFx();
  playing.weapon = 'firework';
  playing.ambient = true;
  for (let i = 0; i < 120; i++) playing.update(1 / 60);
  assert.ok(playing.sky.length > 0, 'the sky show runs during play');

  const ground = new SetTwoFx();
  ground.weapon = 'bazooka';
  ground.ambient = true;
  for (let i = 0; i < 600; i++) ground.update(1 / 60);
  assert.equal(ground.sky.length, 0, 'bazooka uses ground fire, never sky fireworks');
});
