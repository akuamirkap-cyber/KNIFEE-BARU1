import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { P, drawParticles, updateParticles } from '../games/game-6/src/game/core';
import { trailPath, makeBullet } from '../games/game-6/src/game/fx';
import { drawSetNineGun, nineWeapon, restNineState } from '../src/games/gunhit/game/setNineArt';

function readRepoFile(relPath: string): string {
  return readFileSync(fileURLToPath(new URL(`../${relPath}`, import.meta.url)), 'utf8');
}

function createCountingCtx() {
  const stats = {
    linearGradients: 0,
    radialGradients: 0,
    lighterSwitches: 0,
    strokes: 0,
    shadowBlurs: 0,
  };
  let compositeOp = 'source-over';
  const stack: string[] = [];

  const ctx = new Proxy({} as Record<string, unknown>, {
    get(_target, prop) {
      const name = String(prop);
      if (name === 'createLinearGradient') {
        return () => {
          stats.linearGradients++;
          return { addColorStop: () => undefined };
        };
      }
      if (name === 'createRadialGradient') {
        return () => {
          stats.radialGradients++;
          return { addColorStop: () => undefined };
        };
      }
      if (name === 'save') {
        return () => {
          stack.push(compositeOp);
        };
      }
      if (name === 'restore') {
        return () => {
          compositeOp = stack.pop() ?? 'source-over';
        };
      }
      if (name === 'stroke') {
        return () => {
          stats.strokes++;
        };
      }
      if (name === 'globalCompositeOperation') return compositeOp;
      if (name === 'globalAlpha') return 1;
      return () => undefined;
    },
    set(_target, prop, value) {
      const name = String(prop);
      if (name === 'globalCompositeOperation') {
        if (value === 'lighter' && compositeOp !== 'lighter') {
          stats.lighterSwitches++;
        }
        compositeOp = String(value);
      }
      if (name === 'shadowBlur' && Number(value) > 0) {
        stats.shadowBlurs++;
      }
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;

  return { ctx, stats };
}

test('Slide 4 (default pistol shot effect) batches particles into one additive pass with zero gradients or shadowBlur', () => {
  const particles = [
    ...Array.from({ length: 18 }, (_, i) =>
      P({ type: 'spark', x: 210, y: 300, vx: (i - 9) * 40, vy: -320, color: '#ffc861', life: 0.25 }),
    ),
    ...Array.from({ length: 6 }, () =>
      P({ type: 'smoke', x: 210, y: 300, size: 32, size2: 5, color: '#aab3bf', life: 0.8 }),
    ),
    P({ type: 'flash', x: 210, y: 520, size: 28, color: '#ffd98a', color2: '#ff6a00', life: 0.08 }),
    P({ type: 'glow', x: 210, y: 520, size: 80, size2: 30, color: '#ffd98a', color2: '#ff6a00', life: 0.1 }),
    P({ type: 'cone', x: 210, y: 520, rot: -Math.PI / 2, size: 54, width: 0.3, color: '#ffd98a', color2: '#ff6a00', life: 0.07 }),
    P({ type: 'flare', x: 210, y: 520, rot: -Math.PI / 2, size: 42, size2: 5, width: 0.6, color: '#ffd98a', life: 0.07 }),
    P({ type: 'bolt', x: 210, y: 300, rot: -1.2, size: 28, color: '#7dd3fc', life: 0.1 }),
    P({ type: 'casing', x: 230, y: 540, size: 4.2, life: 1.2 }),
  ];

  const { ctx, stats } = createCountingCtx();
  drawParticles(ctx, particles);

  assert.equal(stats.linearGradients, 0, 'particles must not allocate per-frame linear gradients');
  assert.equal(stats.radialGradients, 0, 'particles must not allocate per-frame radial gradients');
  assert.equal(stats.shadowBlurs, 0, 'particles must never enable Gaussian shadowBlur');
  assert.equal(stats.lighterSwitches, 1, 'all additive particles batch into a single lighter pass');
});

test('Slide 4 weapon artwork caches cylinder/specular gradients across frames and caps rapid-fire particle bursts', () => {
  const { ctx, stats } = createCountingCtx();
  drawSetNineGun(ctx, 'beretta92', 210, 575, 0.2, restNineState());
  const firstFrameGrads = stats.linearGradients;
  assert.ok(firstFrameGrads > 0, 'frame 1 builds initial linear gradients');

  stats.linearGradients = 0;
  drawSetNineGun(ctx, 'beretta92', 210, 575, 0.216, { ...restNineState(), recoil: 0.75, cycle: 0.25 });
  assert.equal(stats.linearGradients, 0, 'subsequent frames reuse cached gradients even during recoil');

  // Resampled 36-point tracer trail batches into <= 8 strokes instead of 70+
  const w = nineWeapon('beretta92');
  const b = makeBullet({ x: 210, y: 300, a: -Math.PI / 2, speed: 1800, weapon: w, kind: 'slug', size: 3.4, draw: () => undefined });
  for (let i = 0; i < 36; i++) b.trail.push({ x: 210, y: 540 - i * 6 });
  stats.strokes = 0;
  trailPath(ctx, b, '#ffd27a', 3.1, 0.9);
  assert.ok(stats.strokes <= 8, `expected <= 8 batched trail strokes, got ${stats.strokes}`);

  // Particle burst cap prevents runaway frame times during ultra-fast tapping
  const flood = Array.from({ length: 320 }, () => P({ type: 'smoke', life: 1.0 }));
  updateParticles(flood, 1 / 60);
  assert.ok(flood.length <= 180, `expected particle list capped <= 180, got ${flood.length}`);
});

test('shooting path avoids mid-gameplay React quest re-renders, permanent canvas overlays, and un-normalized reverb clipping', () => {
  const app = readRepoFile('src/games/gunhit/App.tsx');
  assert.ok(
    !app.includes('top-[492px]'),
    'no permanent translucent DOM aura should overlap the desynchronized gameplay canvas',
  );
  const onShotBlock = app.slice(app.indexOf('onShotFired:'), app.indexOf('onBossDefeated:'));
  assert.ok(
    !onShotBlock.includes('saveQuests(') && !onShotBlock.includes('setTimeout'),
    'onShotFired must accumulate purely in RAM without scheduling mid-gameplay React state updates',
  );

  for (const audioFile of [
    'games/game-6/src/game/core.ts',
    'games/game-8/src/game/sound.ts',
    'src/games/gunhit/game/slide23Sfx.ts',
    'src/games/gunhit/game/fireworkSlide2Sfx.ts',
  ]) {
    const src = readRepoFile(audioFile);
    assert.ok(
      !src.includes('.normalize = false'),
      `${audioFile} must NEVER disable ConvolverNode equal-power normalization (causes +29dB static clipping & compressor ducking)`,
    );
    assert.ok(
      src.includes('createBuffer(2,'),
      `${audioFile} preserves clean 2-channel stereo hall reverb`,
    );
  }
});
