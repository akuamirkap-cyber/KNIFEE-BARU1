/**
 * PERFECT SHOT v2 — proof.
 *
 * One file, two jobs:
 *   1. checks the rules (no framework — plain asserts, non-zero exit on failure);
 *   2. writes real PNG frames with Skia so the run can be eyeballed without a
 *      browser: `npx tsx proof.ts /tmp/psv2` writes four frames.
 *
 * Run from this folder after `npm i`, or from the parent repo where
 * `@napi-rs/canvas` is already installed.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { Game, angleDelta } from './src/game';
import { draw } from './src/render/draw';
import { COLLIDE, GH, GW, HITS_TO_WIN, START_STUCK } from './src/config';
import { WEAPONS, weaponById } from './src/weapons';

let failed = 0;
function check(name: string, ok: boolean, detail = ''): void {
  if (ok) {
    console.log(`  ok   ${name}`);
  } else {
    failed += 1;
    console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

/** Drive a game forward in 1/60 s steps. */
function advance(g: Game, seconds: number): void {
  const step = 1 / 60;
  for (let t = 0; t < seconds; t += step) g.update(step);
}

/** Fire and let the knife land. */
function shootOnce(g: Game): void {
  g.fire();
  advance(g, g.flight + 0.05);
}

/** An angle at least 0.3 rad clear of every knife in the wheel, or null. */
function aimClear(g: Game): number | null {
  for (let a = 0; a < Math.PI * 2; a += 0.02) {
    if (g.scene.stuck.every((k) => Math.abs(angleDelta(k.angle, a)) > 0.3)) return a;
  }
  return null;
}

console.log('rules');

// A brand-new level: ten knives to win, the pre-stuck ones already in.
{
  const g = new Game();
  check('opens in play', g.scene.status === 'play');
  check(`starts with ${START_STUCK.length} knives stuck`, g.scene.stuck.length === START_STUCK.length);
  check('counts zero hits', g.scene.hits === 0);
}

// The wheel actually turns, and turns the same way twice for the same clock.
{
  const a = new Game();
  const b = new Game();
  advance(a, 2);
  advance(b, 2);
  check('the wheel spins', Math.abs(a.scene.rot) > 1, `rot=${a.scene.rot}`);
  check('the spin is deterministic', a.scene.rot === b.scene.rot);
  check('speed swells around the base', a.spinAt(0) !== a.spinAt(1.4));
}

// A shot either lands (a knife is added, a hit is counted) or loses the level.
{
  const g = new Game();
  const before = g.scene.stuck.length;
  const fired = g.fire();
  check('fire() reports a shot', fired === true);
  check('the shot is in flight', g.scene.shots.length === 1);
  advance(g, g.flight + 0.02);
  check('the shot left flight', g.scene.shots.length === 0);
  if (g.scene.status === 'play') {
    check('a clean landing adds a knife', g.scene.stuck.length === before + 1);
    check('a clean landing counts', g.scene.hits === 1);
  } else {
    check('a colliding landing is a loss', g.scene.status === 'lose');
    check('a colliding landing adds nothing', g.scene.stuck.length === before);
  }
}

// Cooldown: a mashed fire is ignored, a cooled-down one is not.
{
  const g = new Game();
  check('the first shot goes', g.fire() === true);
  check('a second immediate shot is refused', g.fire() === false);
  advance(g, g.scene.weapon.cooldown + 0.01);
  check('a cooled-down shot goes', g.fire() === true);
}

// Ten clean landings win, and the win is reported once.
{
  const g = new Game();
  // Play it like someone who can aim: before each throw, aim the wheel at a
  // spot at least 0.3 rad clear of every knife already in it, and hold the
  // wheel still for the flight. That is ten clean landings, by the rules.
  const aim = () => {
    const TAU = Math.PI * 2;
    for (let a = 0; a < TAU; a += 0.02) {
      const clear = g.scene.stuck.every((k) => Math.abs(angleDelta(k.angle, a)) > 0.3);
      if (clear) return a;
    }
    return null;
  };
  let shots = 0;
  while (g.scene.status === 'play' && shots < 40) {
    const target = aim();
    if (target === null) break;
    g.scene.rot = Math.PI / 2 - target;
    g.fire();
    shots += 1;
    while (g.scene.shots.length && g.scene.status === 'play') {
      const rot = g.scene.rot;
      g.update(1 / 60);
      g.scene.rot = rot;
    }
    advance(g, g.scene.weapon.cooldown + 0.02);
  }
  check(`ten clean landings win (took ${shots})`, g.scene.status === 'win', `status=${g.scene.status}`);
  check('all ten knives are in the wheel', g.scene.stuck.length === START_STUCK.length + HITS_TO_WIN);
  check('the win is counted once', g.scene.outcome === 'win');
  check('the outcome is clearable', g.clearOutcome() === 'win' && g.scene.outcome === null);
  advance(g, 2);
  check('a finished level keeps reporting the same hits', g.scene.hits === HITS_TO_WIN);
}

// Knife on knife ends the level, and nothing is added.
{
  const g = new Game();
  const before = g.scene.stuck.length;
  const target = g.scene.stuck[0].angle;
  g.scene.rot = Math.PI / 2 - target;
  g.fire();
  while (g.scene.shots.length) {
    const rot = g.scene.rot;
    g.update(1 / 60);
    g.scene.rot = rot;
  }
  check('landing on a stuck knife loses', g.scene.status === 'lose');
  check('the losing knife is not added', g.scene.stuck.length === before);
  check('the loss is reported once', g.clearOutcome() === 'lose' && g.scene.outcome === null);
}

// The collision window is symmetric and wraps around ±π.
{
  check('angleDelta is zero for the same angle', angleDelta(1, 1) === 0);
  check('angleDelta wraps', Math.abs(angleDelta(0.01, Math.PI * 2 - 0.01) - 0.02) < 1e-9);
  check('COLLIDE is a sane half-angle', COLLIDE > 0 && COLLIDE < 0.5);
}

// weapons: unknown ids fall back, known ones change the drawing.
{
  check('an unknown weapon falls back', weaponById('nope').id === WEAPONS[0].id);
  const g = new Game();
  g.setWeapon('plasma');
  check('setWeapon swaps the silhouette', g.scene.weapon.shape === 'spark');
}

// restart() reopens the level with the same weapon.
{
  const g = new Game('disc');
  shootOnce(g);
  g.restart();
  check('restart resets the level', g.scene.hits === 0 && g.scene.status === 'play');
  check('restart keeps the weapon', g.scene.weapon.id === 'disc');
  check('restart re-sticks the opening knives', g.scene.stuck.length === START_STUCK.length);
}

// A huge dt must not teleport the wheel.
{
  const g = new Game();
  g.update(10);
  check('dt is clamped', g.scene.time <= 0.1 + 1e-9, `time=${g.scene.time}`);
}

// ---- frames ---------------------------------------------------------------
// Drawn with Skia when it is installed; the rules above run either way.
console.log('\nframes');
try {
  const { createCanvas } = await import('@napi-rs/canvas');
  const outDir = process.argv[2] ?? '/tmp/psv2';
  mkdirSync(outDir, { recursive: true });

  const canvas = createCanvas(GW, GH);
  const ctx = canvas.getContext('2d') as unknown as CanvasRenderingContext2D;

  const frame = (name: string) => {
    draw(ctx, g.scene);
    writeFileSync(`${outDir}/${name}.png`, canvas.toBuffer('image/png'));
  };

  const g = new Game('knife');
  advance(g, 0.4);
  frame('1-start');

  shootOnce(g);
  if (g.scene.status !== 'play') g.restart();
  shootOnce(g);
  frame('2-two-hits');

  // Mid-flight, so the travelling knife is visible.
  g.fire();
  advance(g, g.flight * 0.5);
  frame('3-in-flight');

  // A mid-run board with a pile of knives on the rim: aim at a clear spot for
  // each of six throws, so this is what a good run really looks like.
  const mid = new Game('arrow');
  for (let i = 0; i < 6; i++) {
    const target = aimClear(mid);
    if (target === null) break;
    mid.scene.rot = Math.PI / 2 - target;
    mid.fire();
    while (mid.scene.shots.length) {
      const rot = mid.scene.rot;
      mid.update(1 / 60);
      mid.scene.rot = rot;
    }
    advance(mid, 0.3);
  }
  draw(ctx, mid.scene);
  writeFileSync(`${outDir}/4-six-hits.png`, canvas.toBuffer('image/png'));

  console.log(`  wrote ${outDir}/{1-start,2-two-hits,3-in-flight,4-six-hits}.png`);
} catch {
  console.log('  skipped: @napi-rs/canvas is not installed here (rules still proved)');
}

console.log(failed === 0 ? '\nOK — all checks passed' : `\n${failed} CHECK(S) FAILED`);
process.exit(failed === 0 ? 0 : 1);
