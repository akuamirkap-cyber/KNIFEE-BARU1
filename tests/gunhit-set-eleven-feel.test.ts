import test from 'node:test';
import assert from 'node:assert/strict';

import { SetElevenFx, busterCharge, drawSetElevenShotShell, setElevenMuted } from '../src/games/gunhit/game/setElevenFx';
import { installCanvasShim } from './supportCanvas';

/**
 * Slide 11 (the hub's "Slide 7", `games/game-8`) does more than draw its
 * rounds: its engine hums its beams, whines while the buster charges, shakes
 * the screen, stops time, kicks / squashes / shivers / heats / freezes its
 * wheel and lights the scene. These tests pin the bridge that hands all of it
 * to slide 1.
 */
installCanvasShim();

type Calls = { shake: number[]; hitStop: number[] };

function host() {
  const calls: Calls = { shake: [], hitStop: [] };
  const fx = new SetElevenFx({
    shake: (a) => { calls.shake.push(a); },
    flash: () => {},
    hitStop: (s) => { calls.hitStop.push(s); },
    wheel: () => ({ x: 210, y: 300, R: 120, angle: 0, dir: 1 }),
  });
  fx.cx = 210;
  fx.gunX = 210;
  fx.wy = 300;
  fx.wheelR = 120;
  fx.gunY = 571;
  fx.syncWheel();
  return { fx, calls };
}

/** Swap slide 11's sound engine calls for a log. */
function spySfx(fx: SetElevenFx) {
  const log: { name: string; args: unknown[] }[] = [];
  const sfx = fx.raw!.sfx as unknown as Record<string, unknown>;
  for (const name of ['channel', 'charge', 'stopAll', 'ricochet', 'impact', 'thunk', 'playFire', 'playRelease']) {
    sfx[name] = (...args: unknown[]) => { log.push({ name, args }); };
  }
  return log;
}

/** A 2D context that records what is filled, and with which colour. */
function paintCtx() {
  const fills: string[] = [];
  /** Image centres, in the context's current (untracked) local frame. */
  const images: { x: number; y: number }[] = [];
  let fillStyle = '';
  const gradient = { addColorStop: () => undefined };
  const ctx = new Proxy({} as Record<string, unknown>, {
    get: (_t, prop) => {
      const name = String(prop);
      if (name === 'canvas') return { width: 420, height: 760 };
      if (name === 'fillStyle') return fillStyle;
      if (name === 'createLinearGradient' || name === 'createRadialGradient' || name === 'createPattern') return () => gradient;
      if (name === 'measureText') return () => ({ width: 10 });
      if (name === 'fillRect') return () => { fills.push(String(fillStyle)); };
      if (name === 'drawImage') {
        return (_i: unknown, x: number, y: number, w = 0, h = 0) => { images.push({ x: x + w / 2, y: y + h / 2 }); };
      }
      return () => undefined;
    },
    set: (_t, prop, value) => {
      if (prop === 'fillStyle') fillStyle = String(value);
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;
  return { ctx, fills, images };
}

test('a slide-11 beam hums while it is held and stops when it fades, like slide 11’s update', () => {
  const { fx } = host();
  fx.selectWeapon('tripod');
  const log = spySfx(fx);
  fx.fire(210, 571, 0);
  for (let i = 0; i < 30; i++) fx.advance(1 / 60, true);
  const held = log.filter((e) => e.name === 'channel');
  assert.ok(held.length >= 30, 'the heat-ray drives its channel loop every frame');
  assert.equal(held[0].args[0], 'tripod');
  assert.ok(Number(held.at(-1)!.args[1]) > 0.9, 'and swells it to full while held');
  for (let i = 0; i < 90; i++) fx.advance(1 / 60, false);
  const last = log.filter((e) => e.name === 'channel').at(-1)!;
  assert.ok(Number(last.args[1]) < 0.04, 'released, the level drops under slide 11’s stop threshold');
});

test('the Mega Buster whines on slide 1’s charge clock, and the whine stops on release', () => {
  const { fx } = host();
  fx.selectWeapon('mega-buster');
  const log = spySfx(fx);
  // A held trigger slide 1 is not charging (a press during its cooldown) will
  // not shoot on release, so the buster must neither glow nor whine for it.
  for (let i = 0; i < 20; i++) fx.advance(1 / 60, true);
  assert.equal(log.filter((e) => e.name === 'charge' && Number(e.args[1]) > 0).length, 0);
  assert.equal(fx.state.charge, 0);
  for (let i = 1; i <= 60; i++) {
    fx.chargeTime = i / 60;
    fx.advance(1 / 60, true);
  }
  const whine = log.filter((e) => e.name === 'charge');
  assert.ok(whine.length >= 60);
  assert.equal(whine[0].args[0], 'mega-buster');
  assert.ok(Math.abs(Number(whine.at(-1)!.args[1]) - 1.2) < 1e-9,
    'slide 1’s full charge (1 s) is the buster’s full charge level');
  fx.chargeTime = 0;
  fx.advance(1 / 60, false);
  assert.equal(Number(log.filter((e) => e.name === 'charge').at(-1)!.args[1]), 0, 'let go: the loop is told to stop');
});

test('slide 1’s charge levels land on the buster’s own glow levels', () => {
  assert.equal(busterCharge(0), 0);
  assert.ok(Math.abs(busterCharge(0.35) - 0.45) < 1e-9, 'CHARGE x2 at 0.35 s is the buster’s mid glow');
  assert.ok(Math.abs(busterCharge(1) - 1.2) < 1e-9, 'FULL CHARGE at 1 s is the buster’s full glow');
  assert.ok(busterCharge(0.34) < 0.45 && busterCharge(0.99) < 1.2, 'never ahead of slide 1');
  assert.ok(Math.abs(busterCharge(1.4) - 1.6) < 1e-9);
  assert.equal(busterCharge(5), 1.6, 'capped at the buster’s max charge');
  let last = 0;
  for (let t = 0; t <= 2; t += 0.01) {
    const c = busterCharge(t);
    assert.ok(c >= last, 'and it only ever grows');
    last = c;
  }
});

test('a released buster shot is voiced by its release blast alone', () => {
  const { fx } = host();
  fx.selectWeapon('mega-buster');
  const log = spySfx(fx);
  fx.fire(210, 571, 2);
  assert.equal(log.filter((e) => e.name === 'playFire').length, 0, 'no fire sound stacked on the release');
  const rel = log.filter((e) => e.name === 'playRelease');
  assert.equal(rel.length, 1);
  assert.deepEqual(rel[0].args, ['mega-buster', 2]);
  fx.selectWeapon('ak47');
  fx.fire(210, 571, 0);
  assert.equal(log.filter((e) => e.name === 'playFire').length, 1, 'a normal gun keeps its fire sound');
});

test('a carried slide-11 round is painted once, by slide 1’s pass, and dropped once nobody carries it', () => {
  const { fx } = host();
  fx.selectWeapon('ak47');
  fx.fire(210, 571, 0);
  const [round] = fx.takeShots();
  assert.ok(round, 'the AK round');
  let painted = 0;
  const own = round.draw;
  round.draw = (...args: Parameters<typeof own>) => { painted++; own(...args); };
  const { ctx } = paintCtx();
  fx.carry(round, 210, 420, -Math.PI / 2);
  fx.draw(ctx);
  assert.equal(painted, 0, 'the layer pass leaves carried rounds to slide 1');
  fx.drawShot(ctx, round);
  assert.equal(painted, 1, 'slide 1’s pass paints it');
  for (let i = 0; i < 5; i++) {
    fx.carry(round, 210, 420 - i * 10, -Math.PI / 2);
    fx.advance(1 / 60, false);
  }
  assert.ok(fx.raw!.projs.includes(round), 'carried every frame, it stays');
  fx.advance(1 / 60, false);
  fx.advance(1 / 60, false);
  assert.equal(fx.raw!.projs.includes(round), false, 'its carrier gone, slide 11 lets go of it as well');
});

test('a muted slide 1 cuts slide 11’s loops instead of leaving them sounding', () => {
  const { fx } = host();
  fx.selectWeapon('phaser');
  const log = spySfx(fx);
  fx.fire(210, 571, 0);
  for (let i = 0; i < 10; i++) fx.advance(1 / 60, true);
  try {
    setElevenMuted(true);
    const before = log.length;
    for (let i = 0; i < 10; i++) fx.advance(1 / 60, true);
    const muted = log.slice(before);
    assert.equal(muted.filter((e) => e.name === 'stopAll').length, 1, 'the running hum is cut once');
    assert.equal(muted.filter((e) => e.name === 'channel').length, 0, 'and not driven again while muted');
  } finally {
    setElevenMuted(false);
  }
});

test('pausing or resetting cuts the loops and the delayed booms', () => {
  const { fx } = host();
  fx.selectWeapon('proton-pack');
  const log = spySfx(fx);
  fx.fire(210, 571, 0);
  for (let i = 0; i < 10; i++) fx.advance(1 / 60, true);
  fx.silence();
  assert.ok(log.some((e) => e.name === 'stopAll'), 'silence() stops slide 11’s loops');
  assert.equal(fx.state.chan, 0, 'and a resumed stage starts with the beam off');
  const n = log.filter((e) => e.name === 'stopAll').length;
  fx.clear();
  assert.equal(log.filter((e) => e.name === 'stopAll').length, n + 1, 'a stage reset does too');
});

test('slide 11’s screen shake and hit-stop reach slide 1', () => {
  const { fx, calls } = host();
  fx.selectWeapon('beretta');
  const raw = fx.raw! as unknown as { shake(a: number): void; hitstop: number };
  raw.shake(7);
  assert.deepEqual(calls.shake, [7], 'g.shake() moves slide 1’s camera, one to one');
  raw.hitstop = 0.07;
  fx.advance(1 / 60);
  assert.deepEqual(calls.hitStop, [0.07], 'slide 11’s hit-stop freezes slide 1');
  assert.equal(raw.hitstop, 0, 'once');
  // A real hit sends both.
  calls.shake.length = 0;
  calls.hitStop.length = 0;
  (fx.raw! as unknown as { hit(x: number, y: number, o: object): void }).hit(210, 420, { power: 2.4, shake: 9, stop: 0.07 });
  fx.advance(1 / 60);
  assert.ok(calls.shake.includes(9));
  assert.ok(calls.hitStop.length === 1);
});

test('a hit kicks and squashes slide 11’s wheel, and the spring settles it again', () => {
  const { fx } = host();
  fx.selectWeapon('beretta');
  const raw = fx.raw! as unknown as { hit(x: number, y: number, o: object): void; wheel: { kick: number; sq: number; boost: number } };
  assert.deepEqual(fx.wheelMotion(), { dx: 0, dy: 0, sx: 1, sy: 1 }, 'a still wheel does not move');
  raw.hit(210, 420, { power: 2 });
  let peak = 0;
  for (let i = 0; i < 12; i++) {
    fx.advance(1 / 60);
    peak = Math.min(peak, raw.wheel.kick);
  }
  assert.ok(peak < -3, `the wheel jumps up like slide 11’s (kick ${peak.toFixed(1)} px)`);
  const m = fx.wheelMotion();
  assert.equal(m.dy, raw.wheel.kick);
  assert.ok(raw.wheel.boost > 0, 'and the hit pushes its spin on');
  for (let i = 0; i < 120; i++) fx.advance(1 / 60);
  assert.ok(Math.abs(raw.wheel.kick) < 0.3, 'two seconds later it has settled');
  assert.ok(raw.wheel.boost < 0.01, 'and the spin boost has died away');
});

test('the harmonic shiver jitters the wheel by at most its own amplitude, once per frame', () => {
  const { fx } = host();
  fx.selectWeapon('harmonic');
  fx.raw!.wheel.shiver = 3;
  fx.advance(1 / 60);
  const a = fx.wheelMotion();
  const b = fx.wheelMotion();
  assert.deepEqual(a, b, 'the wheel, its marks and its overlays share one roll per frame');
  const sh = fx.raw!.wheel.shiver;
  assert.ok(Math.abs(a.dx) <= sh && Math.abs(a.dy - fx.raw!.wheel.kick) <= sh);
});

test('slide 11’s heat, frost and hit flash are painted onto slide 1’s wheel', () => {
  const { fx } = host();
  fx.selectWeapon('tripod');
  const wl = fx.raw!.wheel;
  wl.heat = 0.6;
  wl.heatC = '#ff8a2a';
  wl.freeze = 1;
  wl.flash = 0.8;
  const { ctx, fills, images } = paintCtx();
  fx.drawWheel(ctx, 210, 300, 120, 0.4);
  // Painted in the wheel's frame: centred 0.9 R below the hub, like slide 11's.
  assert.ok(images.some((p) => Math.abs(p.x) < 1 && Math.abs(p.y - 108) < 1), 'the heat glow sits low on the face');
  assert.ok(fills.some((f) => f.startsWith('rgba(90,200,255')), 'a frozen wheel turns icy blue');
  assert.ok(fills.some((f) => f.startsWith('rgba(255,236,205')), 'a hit flashes it warm white');
});

test('slide 11’s scene light is painted while it glows', () => {
  const { fx } = host();
  fx.selectWeapon('sniper-beam');
  const raw = fx.raw! as unknown as { light(c: string, a: number): void; lightA: number };
  let { ctx, images } = paintCtx();
  fx.drawLight(ctx);
  assert.equal(images.length, 0, 'no light, nothing painted');
  raw.light('#43e8ff', 0.8);
  ({ ctx, images } = paintCtx());
  fx.drawLight(ctx);
  assert.equal(images.length, 2, 'a wash around the wheel and one over the gun');
  for (let i = 0; i < 60; i++) fx.advance(1 / 60);
  assert.ok(raw.lightA < 0.01, 'and it fades like slide 11’s');
});

test('the prism lance splits into its seven rays while slide 1 carries it', () => {
  const { fx } = host();
  fx.selectWeapon('prism-lance');
  const log = spySfx(fx);
  fx.fire(210, 571, 0);
  const [tracer] = fx.takeShots();
  assert.ok(tracer, 'the photon tracer is the round slide 1 carries');
  // Slide 1 flies it up the lane; slide 11 still runs its update.
  let y = 571;
  for (let i = 0; i < 6 && tracer.alive; i++) {
    y -= 2800 / 60;
    fx.carry(tracer, 210, y, -Math.PI / 2);
    fx.advance(1 / 60);
  }
  assert.equal(tracer.alive, false, 'the tracer bursts at slide 11’s split line');
  const rays = fx.raw!.projs.filter((p) => p.alive && p !== tracer);
  assert.equal(rays.length, 7, 'into slide 11’s seven spectrum rays');
  for (let i = 0; i < 30; i++) fx.advance(1 / 60);
  assert.ok(log.filter((e) => e.name === 'impact').length >= 3, 'which land and ring on the wheel themselves');
  assert.ok(fx.raw!.embeds.length >= 3, 'and leave their colour marks');
  // Slide 1's carrier still lands where the tracer would have: nothing to burst.
  const before = log.filter((e) => e.name === 'impact').length;
  fx.impact(210, 420, tracer);
  assert.equal(log.filter((e) => e.name === 'impact').length, before, 'a split tracer lands no second burst');
});

test('the shoulder caster fires its own plasma bolt on slide 1’s release', () => {
  const { fx } = host();
  fx.selectWeapon('plasmacaster-mk2');
  spySfx(fx);
  // Holding: the lock follows slide 1's charge meter and never fires alone.
  fx.chargeHint = 0.5;
  for (let i = 0; i < 240; i++) fx.advance(1 / 60, true);
  assert.equal(fx.raw!.projs.length, 0, 'four seconds of holding fire nothing by themselves');
  assert.ok(Math.abs(fx.state.data.cyc - 1.3) < 0.05, 'the three dots sit half-locked at half charge');
  // Release: slide 1 fires, the burst leaves at once.
  fx.chargeHint = 0;
  fx.fire(210, 571, 2);
  const made = fx.takeShots();
  assert.equal(made.length, 1, 'one plasma bolt, slide 11’s own');
  assert.ok(made[0].vy < -1000, 'flying up the lane');
  assert.ok(fx.raw!.fx.length > 0, 'with its muzzle burst');
});

test('a slide-11 shot that hits an obstacle ricochets with slide 11’s own ping', () => {
  const { fx } = host();
  fx.selectWeapon('ak47');
  const log = spySfx(fx);
  fx.fire(210, 571, 0);
  const [round] = fx.takeShots();
  fx.carry(round, 210, 430, -Math.PI / 2);
  fx.block(210, 430, round);
  assert.ok(log.some((e) => e.name === 'ricochet'), 'slide 11’s ricochet voice');
  assert.equal(fx.raw!.projs.includes(round), false);
  fx.fire(210, 571, 0);
  fx.sweepRounds();
  assert.equal(fx.raw!.projs.length, 0, 'GAGAL! leaves no slide-11 round in the air');
});

test('every slide-11 card still paints its shot (the slash and the caster bolt included)', () => {
  for (const id of ['energy-sword', 'plasmacaster-mk2', 'dragon-breath', 'sniper-beam'] as const) {
    let n = 0;
    const ctx = new Proxy({} as Record<string, unknown>, {
      get: (_t, prop) => {
        const name = String(prop);
        if (name === 'canvas') return { width: 420, height: 760 };
        if (name === 'createLinearGradient' || name === 'createRadialGradient' || name === 'createPattern') return () => ({ addColorStop: () => undefined });
        if (name === 'measureText') return () => ({ width: 10 });
        return () => { n++; };
      },
      set: () => true,
    }) as unknown as CanvasRenderingContext2D;
    drawSetElevenShotShell(ctx, id, 0.06, 26);
    assert.ok(n > 20, `${id} paints its shot on the card (${n} calls)`);
  }
});
