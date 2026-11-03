import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { installCanvasShim } from './supportCanvas';
import { installSilentAudio } from '../tools/supportAudioSilent';

installCanvasShim();
const env = globalThis as unknown as Record<string, unknown> & { window: Record<string, unknown> };
env.window = Object.assign(env.window ?? {}, {
  setTimeout, clearTimeout, setInterval: () => 0, clearInterval: () => undefined,
  addEventListener: () => undefined, removeEventListener: () => undefined,
  devicePixelRatio: 1, innerWidth: 760, innerHeight: 420,
});
installSilentAudio();
const gradient = { addColorStop: () => undefined };
const ctx = new Proxy({ canvas: { width: 760, height: 420 }, globalAlpha: 1 } as Record<string, unknown>, {
  get(target, prop) {
    const n = String(prop);
    if (n === 'canvas' || n === 'globalAlpha') return target[n];
    if (n === 'createLinearGradient' || n === 'createRadialGradient' || n === 'createPattern') return () => gradient;
    if (n === 'measureText') return () => ({ width: 8 });
    if (n === 'getImageData') return () => ({ data: new Uint8ClampedArray(4) });
    return () => undefined;
  },
  set(t, p, v) { t[String(p)] = v; return true; },
}) as unknown as CanvasRenderingContext2D;
const canvas = { width: 760, height: 420, style: {}, getContext: () => ctx, addEventListener: () => undefined, removeEventListener: () => undefined, getBoundingClientRect: () => ({ left: 0, top: 0, width: 760, height: 420 }) };
const { Game } = await import('../src/games/gunhit/game/Game.ts');

test('landscape gun pose', () => {
  const game = new Game(canvas as never, { onGameOver(){}, onStageChange(){}, onStageCleared(){}, onShotFired(){}, onBossDefeated(){} } as never) as any;
  game.setOrientation('landscape');
  game.active = true; // the real game is focused; headless instances are not
  game.startAtLevel(1);
  for (let i = 0; i < 200 && game.state === 'intro'; i++) game.update(1/60);
  assert.equal(game.state, 'play');
  const base = game.getGunSlide();
  // simulate W held
  game.onKey({ code: 'KeyW', preventDefault(){}, target: null });
  for (let i = 0; i < 90; i++) game.update(1/60);
  const up = game.getGunSlide();
  game.onKeyUp({ code: 'KeyW' });
  // simulate S held
  game.onKey({ code: 'KeyS', preventDefault(){}, target: null });
  for (let i = 0; i < 120; i++) game.update(1/60);
  const down = game.getGunSlide();
  game.onKeyUp({ code: 'KeyS' });
  console.log('slide base/up/down', base, up, down);
  assert.ok(up < base, 'W raises the gun on screen (world -x)');
  assert.ok(down > up, 'S lowers it');
  // Wide enough to sweep most of the screen, still capped before the gun
  // leaves it entirely.
  assert.ok(Math.abs(down) <= 150.001 && Math.abs(up) <= 150.001, 'capped');
  assert.ok(Math.abs(up) > 100, 'the slide reaches well past the old 66 px cap');

  // Back to the middle before aiming, so both swings are measured from there.
  game.gunSlide = 0;
  // pointer above the gun -> negative tilt (barrel up on screen)
  game.aimPointer = { x: 700, y: 40 };
  for (let i = 0; i < 60; i++) game.update(1/60);
  const tiltUp = game.getGunTilt();
  game.aimPointer = { x: 700, y: 400 };
  for (let i = 0; i < 60; i++) game.update(1/60);
  const tiltDown = game.getGunTilt();
  console.log('tilt up/down', tiltUp, tiltDown);
  assert.ok(tiltUp < -0.1, 'pointer above tilts the barrel up');
  assert.ok(tiltDown > 0.1, 'pointer below tilts it down');
  // The aim assist keeps the barrel inside the target face, so a wide swing
  // still lands: the angle is clamped to the wheel's width, not to 36 degrees.
  const R = game.level.radius;
  const travel = Math.max(40, (560 - 6) - (game.targetY + R));
  const limit = Math.atan2(R * 0.9, travel);
  game.aimPointer = { x: 1200, y: 400 };
  for (let i = 0; i < 90; i++) game.update(1 / 60);
  assert.ok(Math.abs(game.getGunTilt()) <= limit + 1e-9, 'the barrel never leaves the target face');

  // portrait keeps the gun still
  game.setOrientation('portrait');
  game.update(1/60);
  assert.equal(game.getGunSlide(), 0);
  assert.equal(game.getGunTilt(), 0);
});

test('the live game wires the landscape gun control end to end', () => {
  const src = readFileSync('src/games/gunhit/game/Game.ts', 'utf8');
  // Wide slide range, still capped before the gun leaves the screen entirely.
  assert.match(src, /export const GUN_SLIDE_MAX = 150;/);
  assert.match(src, /export const GUN_TILT_MAX = 0\.62;/);
  // W/S only exist in landscape and never steal keys from text fields.
  assert.match(src, /this\.orientation === 'landscape' && \(e\.code === 'KeyW' \|\| e\.code === 'KeyS'\)/);
  assert.match(src, /if \(e\.code === 'KeyW'\) this\.gunSlideUp = true;\s+else this\.gunSlideDown = true;/);
  assert.match(src, /if \(e\.code === 'KeyW'\) this\.gunSlideUp = false;\s+else if \(e\.code === 'KeyS'\) this\.gunSlideDown = false;/);
  // The pointer is tracked on the canvas and mapped into world space.
  assert.match(src, /canvas\.addEventListener\('pointermove', this\.onPointerMove\);/);
  assert.match(src, /this\.canvas\.removeEventListener\('pointermove', this\.onPointerMove\);/);
  assert.match(src, /const pointerWorld = \{ x: pointer\.y, y: H - pointer\.x \};/);
  // Aim assist keeps the impact on the target's face whatever the slide.
  assert.match(src, /const hitX = Math\.max\(CX - face, Math\.min\(CX \+ face, this\.gunX \+ Math\.tan\(want\) \* travel\)\);/);
  // Rounds leave along the barrel, once each.
  assert.match(src, /private aimRoundAt\(p: Proj\)/);
  assert.match(src, /p\.vx = vx \* cos - vy \* sin;\s+p\.vy = vx \* sin \+ vy \* cos;/);
  assert.match(src, /if \(!this\.aimedProjs\.has\(p\)\) \{\s+this\.aimedProjs\.add\(p\);\s+this\.aimRoundAt\(p\);/);
  // The gun art, its halo, its sights, its muzzle and every round follow the pose.
  assert.match(src, /c\.translate\(this\.gunX \+ ox, y0\);\s+if \(this\.gunTiltNow\) c\.rotate\(this\.gunTiltNow\);/);
  assert.match(src, /drawRgbGlowSprite\(c, this\.gunX, GUN_Y \+ entryOffset \+ 42/);
  assert.match(src, /const GX = this\.gunX;/);
  assert.match(src, /x: GX \+ plan\[i\]\.ox, originX: GX \+ plan\[i\]\.ox/);
});

test('a shot leaves the muzzle along the barrel, aimed at the pointer', () => {
  const game = new Game(canvas as never, { onGameOver(){}, onStageChange(){}, onStageCleared(){}, onShotFired(){}, onBossDefeated(){} } as never) as any;
  const proto = game;
  proto.orientation = 'landscape';
  proto.gunTilt = 0.3;
  proto.gunSlide = 0;
  const speed = 900;
  const p = { vx: 0, vy: -speed };
  proto.aimRoundAt(p);
  assert.ok(p.vx > 0, 'a clockwise barrel sends the round towards world +x');
  assert.ok(p.vy < 0, 'and still up the world');
  assert.ok(Math.abs(Math.hypot(p.vx, p.vy) - speed) < 1e-9, 'speed is untouched');
  // Portrait never bends a round.
  const q = { vx: 0, vy: -speed };
  proto.orientation = 'portrait';
  proto.aimRoundAt(q);
  assert.equal(q.vx, 0);
  assert.equal(q.vy, -speed);
});

test('the aim assist keeps every shot on the target, whatever the slide', () => {
  const game = new Game(canvas as never, { onGameOver(){}, onStageChange(){}, onStageCleared(){}, onShotFired(){}, onBossDefeated(){} } as never) as any;
  game.setOrientation('landscape');
  game.active = true;
  game.startAtLevel(1);
  for (let i = 0; i < 200 && game.state === 'intro'; i++) game.update(1 / 60);
  const R = game.level.radius;
  const CX = 210;
  const face = R * 0.9;
  const travel = Math.max(40, (560 - 6) - (game.targetY + R));
  let checked = 0;
  for (const slide of [-150, -90, 0, 90, 150]) {
    for (const pointerY of [0, 60, 210, 360, 420]) {
      game.gunSlide = slide;
      game.gunTilt = 0;
      game.aimPointer = { x: 700, y: pointerY };
      for (let i = 0; i < 120; i++) game.update(1 / 60);
      const angle = game.getGunTilt();
      const gunX = CX + slide;
      const hitX = gunX + Math.tan(angle) * travel;
      assert.ok(
        hitX > CX - face - 1 && hitX < CX + face + 1,
        `slide ${slide} pointer ${pointerY}: lands at ${hitX.toFixed(1)}, face is ${(CX - face).toFixed(0)}..${(CX + face).toFixed(0)}`,
      );
      assert.ok(Math.abs(angle) <= 0.62 + 1e-9, 'the barrel never leans past the cap');
      checked++;
    }
  }
  assert.equal(checked, 25);
});

test('rounds fired while aiming land on the target, not past it', () => {
  // One shot per fresh run: a hit point already taken by an earlier round is a
  // legitimate miss in this game, and would hide what this test is asserting.
  const make = () => {
    const g = new Game(canvas as never, { onGameOver(){}, onStageChange(){}, onStageCleared(){}, onShotFired(){}, onBossDefeated(){} } as never) as any;
    g.setOrientation('landscape');
    g.active = true;
    g.startAtLevel(1);
    for (let i = 0; i < 400 && g.state !== 'play'; i++) g.update(1 / 60);
    return g;
  };
  for (const [slide, pointerY] of [[0, 40], [0, 210], [0, 400], [-150, 40], [150, 400], [150, 40], [-150, 400]] as const) {
    const game = make();
    assert.equal(game.state, 'play');
    let failed = 0;
    const origFail = game.fail.bind(game);
    game.fail = (p: unknown) => { failed++; origFail(p); };
    game.gunSlide = game.gunSlide ?? slide;
    game.gunSlide = slide;
    game.aimPointer = { x: 520, y: pointerY };
    for (let i = 0; i < 60; i++) game.update(1 / 60);
    game.cooldown = 0;
    game.reloadT = 0;
    game.shoot();
    const round = game.projs.at(-1);
    assert.ok(round, 'the trigger fired');
    game.update(1 / 60);
    if (slide === 0 && pointerY === 210) {
      assert.ok(Math.abs(round.vx) < 60, 'a pointer level with the gun fires nearly straight');
    } else {
      assert.ok(Math.abs(round.vx) > 50, 'an off-centre pointer sends the round off the vertical');
    }
    for (let i = 0; i < 240 && game.projs.length; i++) game.update(1 / 60);
    assert.equal(failed, 0, `slide ${slide} pointer ${pointerY}: the round was lost past the target`);
  }
});
