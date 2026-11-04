import test from 'node:test';
import assert from 'node:assert/strict';
import { createCanvas } from '@napi-rs/canvas';

/**
 * Player report: on the pistol the muzzle seemed to come apart — the slide
 * retracted while the barrel stayed put, so the muzzle hung in front of a gap.
 * The barrel (and its recoil plug) must travel back together with the slide.
 *
 * Rendered instead of grepped: a source-level assertion cannot tell "the muzzle
 * retracts" from "the muzzle stays nailed to the frame".
 */
const env = globalThis as unknown as Record<string, unknown>;
env.window = env.window ?? { devicePixelRatio: 1 };
const oldDocument = env.document;
env.document = { createElement: () => createCanvas(1, 1) };
const { drawGun } = await import('../src/games/gunhit/game/art/guns.ts');
const { gunState } = await import('../src/games/gunhit/game/art/kit.ts');
test.after(() => {
  if (oldDocument === undefined) delete env.document;
  else env.document = oldDocument;
});

const W = 420;
const H = 760;
const Y0 = 80; // muzzle origin row
const SC = 1.15; // the pistol's own local scale
const RECOIL_TRAVEL = 14; // local units the slide (and now the barrel) travels

function render(sinceShot: number) {
  const cv = createCanvas(W, H);
  const ctx = cv.getContext('2d') as unknown as CanvasRenderingContext2D;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);
  gunState.sinceShot = sinceShot;
  gunState.inPreview = false;
  drawGun(ctx, 'pistol', W / 2, Y0, 0.4, 0, true, undefined, 'original');
  const { data } = cv.getContext('2d').getImageData(0, 0, W, H);
  const ink = (x: number, y: number) => {
    const i = (y * W + x) * 4;
    return data[i] < 246 || data[i + 1] < 246 || data[i + 2] < 246;
  };
  /** Topmost painted row anywhere on the canvas: the muzzle tip. */
  const crown = () => {
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) if (ink(x, y)) return y;
    }
    return -1;
  };
  /** First row at or below `from` on column `x` with a run of paper behind it. */
  const firstPaperRow = (x: number, from: number, gap = 3) => {
    for (let y = from; y < H; y++) {
      let blank = true;
      for (let d = 0; d < gap && blank; d++) if (ink(x, y + d)) blank = false;
      // Ignore the paper that lies between the barrel and the frame rails.
      if (blank) {
        for (let d = 0; d < gap; d++) if (ink(x - 4, y + d) || ink(x + 4, y + d)) blank = false;
      }
      if (blank) return y;
    }
    return H;
  };
  return { cv, ink, crown, firstPaperRow };
}

const idle = render(9);
const peak = render(0.125); // sin(pi * 0.125 / 0.25) === 1: full recoil

test('the pistol’s muzzle travels back with the slide instead of staying put', () => {
  const idleTip = idle.crown();
  const peakTip = peak.crown();
  assert.ok(idleTip > 0 && peakTip > 0, `the pistol draws (${idleTip}, ${peakTip})`);
  const travel = peakTip - idleTip;
  assert.ok(travel > RECOIL_TRAVEL * SC - 3,
    `the muzzle must ride the slide back (${travel.toFixed(1)} px of ${(RECOIL_TRAVEL * SC).toFixed(1)})`);
  assert.ok(travel < RECOIL_TRAVEL * SC + 4,
    `the muzzle may not over-travel past the slide (${travel.toFixed(1)} px)`);
});

test('the recoiled barrel stays attached: no paper gap behind the muzzle', () => {
  const tip = peak.crown();
  const boreX = W / 2; // the bore is drawn on the muzzle axis
  const gapRow = peak.firstPaperRow(boreX, tip + 4, 3);
  const attached = gapRow - tip;
  // The barrel plus the slide behind it is a long, solid run of ink; a detached
  // muzzle showed only the 10.8-unit barrel (~12 px) before the gap.
  assert.ok(attached > 40,
    `the muzzle must grow straight into the slide, not float (${attached} px of ink)`);
  assert.equal(peak.ink(boreX, gapRow - 1), true, 'the frame meets the barrel');
});

test('the muzzle eases out and back with the slide, and finishes home', () => {
  const at = (since: number) => render(since).crown();
  const idleTip = at(9);
  const quarter = at(0.2); // same distance into the pulse as 0.05, other side
  const peakTip = at(0.125);
  const late = at(0.05);
  const home = at(0);
  assert.ok(peakTip > quarter && quarter > idleTip,
    `the muzzle pulls back then settles (${[idleTip, quarter, peakTip, late, home].join(', ')})`);
  assert.ok(Math.abs(quarter - late) <= 1, 'the pulse is symmetric on the way out and back');
  assert.equal(home, idleTip, 'the barrel returns to the slide’s rest position');
});
