import test from 'node:test';
import assert from 'node:assert/strict';
import { PILLAR_H, STAGES, pillarH, pillarW } from '../src/games/perfect-shot/quest/data';

/* The stage map's projection, mirrored from QuestMap.tsx. */
const HOR = -2.2;
const BOT = 0.92;
const K = 0.08;
const PIL = 1.38;
const H = 820;

/** On-screen y of a stage's cap, i.e. where the disc sits. */
const capY = (n: number, cam: number) => {
  const b = STAGES[n - 1];
  const s = 1 / (1 + K * (n - 1 - cam));
  const base = H * (HOR + (BOT - HOR) * s);
  const W = pillarW(b.type);
  const total = (W * 0.64) / 2 + W * 0.14 + pillarH(b.n, b.type);
  return base - total * s * PIL;
};

test('every stage pillar is built to the same height', () => {
  const heights = STAGES.map((b) => pillarH(b.n, b.type));
  assert.equal(new Set(heights).size, 1, 'no per-stage random pillar height');
  assert.equal(heights[0], PILLAR_H);
});

test('consecutive stages keep an even, receding distance on screen', () => {
  for (const cam of [4.9, 12.9, 26.9, 48.9]) {
    const stages = STAGES.filter((b) => b.n >= cam + 2 && b.n <= cam + 10);
    const tops = stages.map((b) => capY(b.n, cam));
    const steps = tops.slice(1).map((t, i) => tops[i] - t);
    steps.forEach((step, i) => {
      assert.ok(step > 40, `stage gap ${Math.round(step)}px never collapses (cam ${cam})`);
      if (i) {
        assert.ok(
          step / steps[i - 1] >= 0.65,
          `gap never jumps: ${Math.round(steps[i - 1])}px → ${Math.round(step)}px (cam ${cam})`,
        );
      }
    });
  }
});

test('the rhythm is even across every island and boss stage, not just one stretch', () => {
  // A boss disc is wider than a normal one, so its cap sits a little higher;
  // that single step must stay small enough to read as the same rhythm.
  for (const cam of [9.9, 24.9, 39.9, 74.9]) {
    const tops = [1, 2, 3, 4, 5].map((k) => capY(Math.floor(cam) + k, cam));
    const steps = tops.slice(1).map((t, i) => tops[i] - t);
    const spread = Math.max(...steps) / Math.min(...steps);
    assert.ok(spread < 2.2, `island ${Math.round(cam)} rhythm spread ${spread.toFixed(2)}`);
  }
});
