import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  burstFirework8,
  createFirework8State,
  launchFirework8Sky,
  spawnFirework8ClearFinale,
  spawnFirework8FailBurst,
  spawnFirework8Muzzle,
  spawnFirework8StickBurst,
  updateFirework8State,
  FIREWORK_PL,
  firework8ShotHue,
} from '../src/games/gunhit/game/firework8fx';
import { fireworkSfx, fwNoteFreq } from '../src/games/gunhit/game/fireworkSlide2Sfx';

/**
 * The slide-1 firework launcher must look and sound EXACTLY like the slide-2
 * "Firework 8-Gun" firework weapon. These tests pin the numbers copied from
 * `games/fireworkgun/src/game/engine.ts` and `.../sfx.ts`.
 */

test('burst patterns keep slide 2 particle counts, glow and lifetimes', () => {
  const expected: Record<string, number> = {
    // peony: 80 + 36 secondary (i < 80 * 0.45) + 1 central flash
    peony: 80 + 36 + 1,
    // ring: 56 + 30 inner + 1
    ring: 56 + 30 + 1,
    star: 110 + 1,
    heart: 70 + 1,
    spiral: 100 + 1,
    crackle: 70 + 1,
    rainbow: 90 + 1,
    willow: 80 + 1,
  };
  for (const [type, count] of Object.entries(expected)) {
    const state = createFirework8State(420, 760);
    burstFirework8(state, 100, 200, 120, type as 'peony', 1);
    assert.equal(state.particles.length, count, `${type} particle count`);
    assert.equal(state.glows.length, 1, `${type} spawns one glow`);
    assert.equal(state.glows[0].r, 90 * 1 + 30, `${type} glow radius 90*scale+30`);
    assert.equal(state.glows[0].life, 0.5, 'glow lives 0.5s');
  }
});

test('shells scale like slide 2 (cnt = max(0.5, scale), impact shells 0.72)', () => {
  const small = createFirework8State();
  burstFirework8(small, 0, 0, 0, 'peony', 0.35);
  assert.equal(small.particles.length, 59, '0.35 shell clamps to cnt 0.5');

  const stickScale = createFirework8State();
  burstFirework8(stickScale, 0, 0, 0, 'peony', 0.72);
  assert.equal(stickScale.particles.length, 86, '0.72 impact shell');
});

test('muzzle flash is slide 2 fire(): 22 sparks + flash, glow 70, ring 38', () => {
  const state = createFirework8State();
  spawnFirework8Muzzle(state, 210, 590, 300);
  assert.equal(state.particles.length, 23);
  assert.equal(state.glows.length, 1);
  assert.equal(state.glows[0].r, 70);
  assert.equal(state.glows[0].life, 0.25);
  assert.equal(state.glows[0].y, 588, 'glow sits 2px above the muzzle');
  assert.equal(state.rings.length, 1);
  assert.equal(state.rings[0].r, 38);
  assert.equal(state.rings[0].y, 592, 'ring sits 2px below the muzzle');
});

test('a stuck rocket pops exactly like slide 2 stick(): shell + peony + 90px ring', () => {
  const state = createFirework8State();
  spawnFirework8StickBurst(state, 200, 300, 40);
  // random impact shell (min: heart 51) + peony 0.35 (59)
  assert.ok(state.particles.length >= 110, `two bursts, got ${state.particles.length}`);
  const ring = state.rings.find((r) => r.r === 90);
  assert.ok(ring, '90px shock ring');
  assert.equal(ring!.life, 0.45);
  assert.equal(state.glows.length, 2, 'one glow per burst');
});

test('stage clear finale = rainbow + ring + willow over the board then 9 sky rockets', () => {
  const state = createFirework8State();
  spawnFirework8ClearFinale(state, 210, 260, 3);
  assert.equal(state.particles.length, 362, 'rainbow 1.5 + ring 1.3 + willow 1.4');
  assert.equal(state.glows.length, 4, 'three bursts + board glow');
  assert.ok(state.glows.some((g) => g.r === 260 && g.life === 0.9), 'big board glow');
  assert.ok(state.rings.some((r) => r.r === 260 && r.life === 0.8), 'big board ring');
  assert.equal(state.timers.length, 9, 'nine rockets in the sky show');
  const times = state.timers.map((t) => t.t);
  const sorted = [...times].sort((a, b) => a - b);
  assert.deepEqual(times, sorted, 'rockets leave in a rising rhythm');
  assert.ok(sorted[0] >= 0.15 && sorted[0] <= 0.25, 'first rocket ~0.15s after clear');
  assert.ok(sorted[8] >= 1.9 && sorted[8] <= 2.2, 'last rocket ~2s after clear');

  for (let i = 0; i < 150; i++) updateFirework8State(state, 1 / 60);
  assert.ok(state.sky.length > 0, 'sky show is flying');
});

test('failed shot bursts white peony + warm ring + 120px glow, slide 2 failRocket', () => {
  const state = createFirework8State();
  spawnFirework8FailBurst(state, 210, 400, 300);
  assert.equal(state.particles.length, 115);
  assert.equal(state.glows.length, 3, 'two shell glows + the slide 2 crash glow');
  assert.ok(state.glows.some((g) => g.r === 120 && g.life === 0.5 && g.hue === 0));
});

test('sky rockets fly ballistically with a = 700 px/s and burst at their peak', () => {
  const state = createFirework8State(420, 760);
  launchFirework8Sky(state, true, 1.2);
  const rocket = state.sky[0];
  assert.equal(rocket.y, 650, 'launch height H-110');
  assert.equal(rocket.scale, 1.2, 'scale carried into the burst');
  const expectedVy = -Math.sqrt(2 * 700 * (650 - rocket.vy ** 2 / (2 * -700)));
  assert.ok(Number.isFinite(expectedVy));

  const vy0 = rocket.vy;
  updateFirework8State(state, 1 / 60);
  assert.ok(Math.abs(state.sky[0].vy - (vy0 + 700 / 60)) < 1e-9, 'gravity 700 px/s²');

  // fly until it pops
  let popped = false;
  for (let i = 0; i < 600 && !popped; i++) {
    updateFirework8State(state, 1 / 60);
    popped = state.sky.length === 0;
  }
  assert.ok(popped, 'rocket bursts at the top of its arc');
  assert.ok(state.particles.length > 50, 'sky burst spawns a shell');
});

test('idle celebration show launches a rocket every 0.7–1.5s like slide 2 menu', () => {
  const state = createFirework8State();
  state.ambientT = 0;
  updateFirework8State(state, 1 / 60, true);
  assert.equal(state.sky.length, 1, 'one rocket as soon as the timer runs out');
  assert.ok(state.ambientT >= 0.7 && state.ambientT <= 1.5, `next rocket in ${state.ambientT}s`);

  const quiet = createFirework8State();
  quiet.ambientT = 0;
  updateFirework8State(quiet, 1 / 60, false);
  assert.equal(quiet.sky.length, 0, 'no show while actually shooting — same as slide 2');
});

test('particle physics match slide 2 (drag^f, +g*f, life counts down, crackle spawns sparks)', () => {
  const state = createFirework8State();
  state.particles.push({
    x: 0, y: 0, vx: 3, vy: 0, life: 1, max: 1,
    size: 2, h: 0, s: 100, l: 60, g: 0.05, d: 0.96, tr: 2.5, tw: false, crackle: false,
  });
  updateFirework8State(state, 1 / 60);
  const p = state.particles[0];
  const f = 1;
  assert.ok(Math.abs(p.vx - 3 * Math.pow(0.96, f)) < 1e-9, 'drag');
  assert.ok(Math.abs(p.vy - 0.05 * f) < 1e-9, 'gravity');
  assert.ok(Math.abs(p.life - (1 - 1 / 60)) < 1e-9, 'life ticks in seconds');

  const crackler = createFirework8State();
  crackler.particles.push({
    x: 5, y: 5, vx: 0, vy: 0, life: 0.01, max: 1,
    size: 2, h: 0, s: 100, l: 60, g: 0, d: 1, tr: 2.5, tw: false, crackle: true,
  });
  updateFirework8State(crackler, 1 / 60);
  assert.equal(crackler.particles.length, 3, 'crackle pops three white sparks');
  assert.ok(crackler.particles.every((s) => s.h === 50 && s.s === 40 && s.l === 92));
});

test('shot hues climb 41° per shell like slide 2 ammoHue', () => {
  assert.equal(firework8ShotHue(2, 1) - firework8ShotHue(2, 0), 41);
  assert.equal(firework8ShotHue(2, 2) - firework8ShotHue(2, 1), 41);
});

test('hit bells climb the same pentatonic ladder as slide 2', () => {
  // C5 D5 E5 G5 A5 C6
  const freqs = [0, 1, 2, 3, 4, 5].map((i) => Math.round(fwNoteFreq(i)));
  assert.deepEqual(freqs, [523, 587, 659, 784, 880, 1047]);
});

test('slide-2 firework sounds are wired and never throw without an AudioContext', () => {
  for (const fn of ['shoot', 'hit', 'boom', 'skyLaunch', 'clear', 'fail'] as const) {
    assert.equal(typeof fireworkSfx[fn], 'function', `${fn} exists`);
  }
  assert.doesNotThrow(() => {
    fireworkSfx.shoot();
    fireworkSfx.hit(4);
    fireworkSfx.boom();
    fireworkSfx.skyLaunch();
    fireworkSfx.clear();
    fireworkSfx.fail();
    fireworkSfx.setMuted(true);
    fireworkSfx.setMuted(false);
    fireworkSfx.unlock();
  });
});

test('port keeps the exact slide-2 constants (no drifted magic numbers)', () => {
  const strip = (p: string) => readFileSync(p, 'utf8').replace(/"/g, "'");
  const engine = strip('games/fireworkgun/src/game/engine.ts');
  const port = strip('src/games/gunhit/game/firework8fx.ts');
  const sfx = strip('games/fireworkgun/src/game/sfx.ts');
  const sfxPort = strip('src/games/gunhit/game/fireworkSlide2Sfx.ts');

  const engineLines = [
    'const speed = 5.2 * scale;',
    'const cnt = Math.max(0.5, scale);',
    'r: 90 * scale + 30',
    'const n = Math.round(80 * cnt);',
    'const n = Math.round(56 * cnt);',
    'const n = Math.round(110 * cnt);',
    'const n = Math.round(70 * cnt);',
    'const n = Math.round(100 * cnt);',
    'const n = Math.round(90 * cnt);',
    's.vy += 700 * dt;',
    'if (s.vy > -40) {',
    'this.ambientT = sh || bb || sq || rb || bz || rp ? rnd(1.4, 2.4) : rnd(0.7, 1.5);',
  ];
  for (const line of engineLines) {
    assert.ok(engine.includes(line), `slide 2 still has: ${line}`);
  }

  const portedLines = [
    'const speed = 5.2 * scale;',
    'const cnt = Math.max(0.5, scale);',
    'r: 90 * scale + 30',
    'Math.round(80 * cnt)',
    'Math.round(56 * cnt)',
    'Math.round(110 * cnt)',
    'Math.round(70 * cnt)',
    'Math.round(100 * cnt)',
    'Math.round(90 * cnt)',
    's.vy += 700 * dt;',
    'if (s.vy > -40) {',
    'rnd(0.7, 1.5)',
  ];
  for (const line of portedLines) {
    assert.ok(port.includes(line), `slide-1 port has: ${line}`);
  }

  const sfxLines = [
    'this.tone(220, t, 0.16, \'sine\', 0.7, 45, 0.2);',
    'this.noiseBurst(t + 0.01, 0.28, 0.16, \'bandpass\', 900, 4200, 3, 0.5);',
    'this.bell(f, t + 0.01, 0.2, 1.0);',
    'this.crackle(t + 0.08, 14, 0.5, 0.2);',
    'this.tone(f * 4, t + 0.03, 0.4, \'sine\', 0.05, f * 6, 0.9, 0.05);',
    'this.noiseBurst(t, 0.5, 0.07, \'bandpass\', 700, 3200, 3, 0.6);',
    'const seq = [0, 2, 4, 7, 9, 12, 16, 19, 24];',
  ];
  for (const line of sfxLines) {
    assert.ok(sfx.includes(line), `slide 2 sfx still has: ${line}`);
    assert.ok(sfxPort.includes(line), `slide-1 sfx port has: ${line}`);
  }
  assert.ok(sfxPort.includes('this.master.gain.value = this.muted ? 0 : 0.8'), 'master 0.8');
  assert.ok(sfxPort.includes('comp.threshold.value = -14'), 'compressor -14');
  assert.ok(sfxPort.includes('comp.ratio.value = 6'), 'compressor ratio 6');
  assert.ok(sfx.includes('const len = ctx.sampleRate * 2.2;'), 'slide 2 reverb length');
  assert.equal(FIREWORK_PL, 46, 'rocket length unchanged');
});
