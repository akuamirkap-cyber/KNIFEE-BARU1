import test from 'node:test';
import assert from 'node:assert/strict';

import {
  EDITABLE_WEAPONS,
  FIXED_CLASSIC_WEAPONS,
  canChooseGunDesign,
  getGunEffect,
  getGunEffectOptions,
  getGunVariant,
  getGunVariantOptions,
  isTwoCardGun,
  supportsGunVariants,
} from '../src/games/gunhit/game/art/gunVariants';
import { getGunMetrics } from '../src/games/gunhit/game/art/metrics';
import { drawGun } from '../src/games/gunhit/game/art/guns';
import { Slide2Fx } from '../src/games/gunhit/game/slide2Fx';
import {
  drawBlackHoleGun2,
  fireBlackHole2,
  launchVoidSky2,
  trailBlackHole2,
  voidBurst2,
} from '../src/games/gunhit/game/slide2Weapons';
import { slide2Sfx } from '../src/games/gunhit/game/slide2Audio';

function recorder() {
  const calls: string[] = [];
  const gradient = { addColorStop: () => undefined };
  const ctx = new Proxy({} as Record<string, unknown>, {
    get: (_t, method) => {
      const name = String(method);
      if (name === 'createLinearGradient' || name === 'createRadialGradient') return () => gradient;
      if (name === 'canvas') return { width: 420, height: 760 };
      return (...args: unknown[]) => {
        calls.push(`${name}:${args.filter(a => typeof a === 'number').join(',')}`);
        return undefined;
      };
    },
    set: () => true,
  }) as unknown as CanvasRenderingContext2D;
  return { ctx, calls };
}

test('the black hole gun is no longer a retired classic: newest design + newest shot are the defaults', () => {
  assert.equal((FIXED_CLASSIC_WEAPONS as readonly string[]).includes('blackhole'), false);
  assert.equal((EDITABLE_WEAPONS as readonly string[]).includes('blackhole'), true);
  assert.equal(supportsGunVariants('blackhole'), true);
  assert.equal(canChooseGunDesign('blackhole'), true);
  assert.equal(isTwoCardGun('blackhole'), true);
  // Only two genuine silhouettes exist, so the picker shows two cards instead
  // of inventing a duplicate third.
  assert.deepEqual(getGunVariantOptions('blackhole').map(o => o.id), ['original', 'latest']);
  assert.deepEqual(getGunEffectOptions('blackhole').map(o => o.id), ['original', 'new']);
  assert.equal(getGunVariant('blackhole'), 'latest', 'slide-2 art is the default');
  assert.equal(getGunEffect('blackhole'), 'new', 'slide-2 void shot is the default');
});

test('the slide-2 black hole preview is measured so the whole cannon fits its card', () => {
  const latest = getGunMetrics('blackhole', 'latest');
  const original = getGunMetrics('blackhole', 'original');
  // Measured from the real slide-2 renderer: ink x -117..116, y -76..216.
  assert.equal(latest.totalLen, 216);
  assert.equal(latest.centerOffsetY, 70);
  assert.equal(latest.centerOffsetX, 0);
  assert.equal(latest.span, 371, '45° diagonal of the 233×292 ink box');
  assert.ok(latest.span > original.span, 'slide 2 draws a bigger cannon than slide 1');
  // A preview scaled by span must keep both extremes inside the card.
  const card = 132 * 0.94;
  const scale = card / Math.max(latest.span, 130);
  assert.ok(292 * scale <= card + 0.001, 'height fits');
  assert.ok(233 * scale <= card + 0.001, 'width fits');
});

test('the slide-2 black hole art renders a full cannon at the slide-1 muzzle', () => {
  const { ctx, calls } = recorder();
  drawBlackHoleGun2(ctx, 0, 0, { time: 1.4, recoil: 0.2, loadP: 1, hue: 265, live: true });
  assert.ok(calls.length > 80, 'the whole cannon body, coils, muzzle ring and core are drawn');
  assert.ok(calls.some(c => c.startsWith('ellipse')), 'double photon ring at the muzzle');
  assert.ok(calls.some(c => c.startsWith('roundRect')), 'receiver collar');
});

test('slide-2 particle physics keeps its 60 Hz drag/gravity contract', () => {
  const fx = new Slide2Fx();
  fx.spawn(0, 0, 10, 0, { life: 1, d: 0.5, g: 0, tr: 0 });
  const p = fx.particles[0];
  fx.update(1 / 60);
  assert.ok(Math.abs(p.x - 5) < 1e-6, 'drag d is applied once per 60 Hz step');
  assert.ok(Math.abs(p.vx - 5) < 1e-6);
  const fx2 = new Slide2Fx();
  fx2.spawn(0, 0, 0, 0, { life: 1, d: 1, g: 0.5, tr: 0 });
  fx2.update(1 / 60);
  assert.ok(Math.abs(fx2.particles[0].vy - 0.5) < 1e-6, 'gravity is per step, not per second');
});

test('slide-2 crackle pops into three sparks and the particle cap holds', () => {
  const fx = new Slide2Fx();
  fx.spawn(10, 10, 0, 0, { life: 0.001, crackle: true, d: 1, g: 0 });
  fx.update(1 / 60);
  assert.equal(fx.particles.length, 3, 'one crackle particle becomes three');
  const capped = new Slide2Fx();
  for (let i = 0; i < 4000; i++) capped.spawn(0, 0, 0, 0, { life: 10 });
  // Slide 2's guard is `length > 3600`, so exactly one more push is allowed.
  assert.equal(capped.particles.length, 3601, 'slide 2 refuses to grow past its 3600 cap');
});

test('the void burst is the slide-2 one: accretion inflow, jets, tangential ejecta', () => {
  const fx = new Slide2Fx();
  voidBurst2(fx, 200, 300, 265, 1);
  assert.equal(fx.voids.length, 1);
  assert.equal(fx.voids[0].r, 62 + 18);
  assert.equal(fx.voids[0].life, 0.85);
  assert.deepEqual(fx.rings.map(r => r.r), [130, 110]);
  assert.equal(fx.rings[0].impl, true, 'the first ring collapses inward');
  assert.equal(fx.particles.length, 52, 'accretion inflow count is slide 2 exact');
  assert.ok(fx.particles.every(p => p.pull === 6 && p.ax === 200 && p.ay === 300));
  assert.equal(fx.jets.length, 0, 'the jets are delayed like slide 2');
  // 0.15 s later the collapse flash, bipolar jets and ejecta land.
  for (let i = 0; i < 10; i++) fx.update(1 / 60);
  assert.equal(fx.jets.length, 1);
  assert.equal(fx.jets[0].len, 200);
  assert.ok(fx.particles.length > 52 + 50);
});

test('voids devour nearby particles exactly like slide 2', () => {
  const fx = new Slide2Fx();
  fx.void(0, 0, 265, 1, 40);
  fx.spawn(100, 0, 0, 0, { life: 1, d: 1, g: 0, tr: 0 });
  const before = fx.particles[0].vx;
  fx.update(1 / 60);
  assert.ok(fx.particles[0].vx < before, 'particles inside 250 px are pulled in');
  fx.spawn(5, 0, 0, 0, { life: 1, d: 1, g: 0, tr: 0 });
  fx.update(1 / 60);
  const swallowed = fx.particles[fx.particles.length - 1];
  assert.ok(swallowed.life <= 0.08, 'particles inside 6 px are swallowed');
});

test('the slide-2 black hole shot, trail and sky show use slide-2 numbers', () => {
  const fx = new Slide2Fx();
  fireBlackHole2(fx, 210, 575, 265);
  assert.equal(fx.particles.length, 17, '16 collapsing sparks + 1 bright muzzle core');
  assert.equal(fx.glows.length, 1);
  assert.equal(fx.rings.length, 1);
  assert.equal(fx.rings[0].r, 46);

  const before = fx.particles.length;
  trailBlackHole2(fx, 210, 400, 265);
  assert.ok(fx.particles.length > before, 'the flying singularity drags an accretion spiral');

  const sky = new Slide2Fx();
  launchVoidSky2(sky, 1);
  assert.equal(sky.particles.length, 26, 'warning shimmer before the sky void opens');
  assert.equal(sky.timers.length, 1);
  for (let i = 0; i < 25; i++) sky.update(1 / 60);
  assert.equal(sky.voids.length, 1, 'the void tears open 0.32 s later');
});

test('every slide-2 gun keeps its own exact sound voice on slide 1', () => {
  // The slide-2 Sfx class is used directly, so each voice must exist verbatim.
  const voices = [
    'shoot', 'hit', 'boom', 'skyLaunch', 'clear', 'fail',
    'shootBH', 'hitBH', 'voidOpen', 'voidBoom', 'clearBH', 'failBH',
    'shootShark', 'hitShark', 'sharkLeap', 'clearShark', 'failShark',
    'shootBamboo', 'hitBamboo', 'bambooSkyBoom', 'clearBamboo', 'failBamboo',
    'shootSoaker', 'hitSoaker', 'soakerGeyser', 'clearSoaker', 'failSoaker',
    'shootRainbow', 'hitRainbow', 'rainbowSky', 'clearRainbow', 'failRainbow',
    'shootBazooka', 'hitBazooka', 'bazookaSkyBoom', 'clearBazooka', 'failBazooka',
    'shootRpg', 'hitRpg', 'rpgSkyBoom', 'clearRpg', 'failRpg',
  ] as const;
  const engine = (slide2Sfx as unknown as { e?: Record<string, unknown> });
  const target = engine.e ?? {};
  for (const voice of voices) {
    assert.equal(typeof target[voice], 'function', `slide-2 voice ${voice} must be available`);
  }
  // The muted flag is owned by the slide-2 engine, so the global mute switch works.
  slide2Sfx.setMuted(true);
  assert.equal((target as { muted?: boolean }).muted, true);
  slide2Sfx.setMuted(false);
});

test('the newest design draws through the slide-2 renderer, the old one through slide 1', () => {
  const latest = recorder();
  drawGun(latest.ctx, 'blackhole', 0, 0, 1.1, 0, true, undefined, 'latest');
  const original = recorder();
  drawGun(original.ctx, 'blackhole', 0, 0, 1.1, 0, true, undefined, 'original');
  assert.notEqual(latest.calls.join(','), original.calls.join(','));
  assert.ok(latest.calls.some(c => c.startsWith('ellipse')), 'slide-2 muzzle gate');
});
