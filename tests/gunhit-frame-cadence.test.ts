import test from 'node:test';
import assert from 'node:assert/strict';
import { FrameCadence } from '../src/games/gunhit/utils/frameCadence';

/** Drive the governor with a fixed frame interval and a fixed work cost. */
function run(cadence: FrameCadence, interval: number, work: number, frames: number, from = 0) {
  let drawn = 0;
  let now = from;
  for (let i = 0; i < frames; i++) {
    now += interval;
    if (cadence.shouldRender(now, interval, work)) drawn++;
  }
  return { drawn, now };
}

test('a 60 Hz phone, and a 120 Hz phone with headroom, always draw every frame', () => {
  for (const [interval, work] of [[16.7, 6], [16.7, 11], [11.1, 2], [8.3, 3.5]] as const) {
    const cadence = new FrameCadence();
    assert.equal(run(cadence, interval, work, 600).drawn, 600, `${interval}ms/${work}ms keeps every frame`);
    assert.equal(cadence.isCapped, false);
  }
});

test('a 120 Hz screen whose work fills the interval is locked to the 60 Hz grid', () => {
  const cadence = new FrameCadence();
  // 8.3 ms of display interval, 7 ms of work: it cannot hold 120 Hz.
  const warm = run(cadence, 8.3, 7, 40);
  assert.equal(warm.drawn, 40, 'the lock needs sustained strain, never a single slow frame');
  run(cadence, 8.3, 7, 60, warm.now);
  assert.equal(cadence.isCapped, true, 'sustained strain locks the cadence');
  // The RAF callbacks still arrive at 120 Hz; the drawing lands on every second.
  const locked = run(cadence, 8.3, 7, 240, warm.now + 60 * 8.3);
  assert.ok(locked.drawn >= 110 && locked.drawn <= 130, `one draw per 60 Hz tick (${locked.drawn}/240)`);
});

test('a single slow frame or a tab switch never locks the cadence', () => {
  const cadence = new FrameCadence();
  run(cadence, 8.3, 2, 100);
  cadence.shouldRender(5000, 5000, 2);
  for (let i = 0; i < 40; i++) cadence.shouldRender(10000 + i * 8.3, 8.3, 9);
  assert.equal(cadence.isCapped, false, 'forty strained frames are not "sustained"');
});

test('the lock releases once the work is comfortably inside the interval again', () => {
  const cadence = new FrameCadence();
  const strain = run(cadence, 8.3, 7, 400);
  assert.equal(cadence.isCapped, true);
  const relaxed = run(cadence, 8.3, 2, 400, strain.now);
  assert.equal(cadence.isCapped, false, 'a long, easy stretch returns to native refresh');
  assert.ok(relaxed.drawn > 300, `frames flow again (${relaxed.drawn}/400)`);
});

test('a reset forgets the measurement, so a resized canvas starts clean', () => {
  const cadence = new FrameCadence();
  run(cadence, 8.3, 7, 400);
  assert.equal(cadence.isCapped, true);
  cadence.reset();
  assert.equal(cadence.isCapped, false);
  assert.equal(run(cadence, 8.3, 7, 40).drawn, 40, 'the warm-up draws every frame');
});
