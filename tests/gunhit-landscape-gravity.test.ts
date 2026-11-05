import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createCanvas } from '@napi-rs/canvas';
import { installCanvasShim } from './supportCanvas';
import { installSilentAudio } from '../tools/supportAudioSilent';

installCanvasShim();
(globalThis as { document?: { createElement: (tag: string) => unknown } }).document!.createElement = (tag: string) => {
  if (tag !== 'canvas') return { style: {} };
  const element = createCanvas(8, 8) as unknown as Record<string, unknown>;
  element.style = {};
  return element;
};
const env = globalThis as unknown as Record<string, unknown> & { window: Record<string, unknown> };
env.window = Object.assign(env.window ?? {}, {
  setTimeout, clearTimeout, setInterval: () => 0, clearInterval: () => undefined,
  addEventListener: () => undefined, removeEventListener: () => undefined,
  devicePixelRatio: 1, innerWidth: 760, innerHeight: 420,
});
installSilentAudio();

const { Game } = await import('../src/games/gunhit/game/Game.ts');

function liveGame(orientation: 'portrait' | 'landscape' = 'landscape') {
  const surface = createCanvas(orientation === 'landscape' ? 760 : 420, orientation === 'landscape' ? 420 : 760);
  const canvas = {
    width: surface.width, height: surface.height, style: {},
    getContext: () => surface.getContext('2d'),
    addEventListener: () => undefined, removeEventListener: () => undefined,
    getBoundingClientRect: () => ({ left: 0, top: 0, width: surface.width, height: surface.height }),
  };
  const game = new Game(canvas as never, {
    onGameOver() {}, onStageChange() {}, onStageCleared() {}, onShotFired() {}, onBossDefeated() {},
  } as never) as unknown as Record<string, any>;
  game.setOrientation(orientation);
  game.active = true;
  game.startAtLevel(1);
  for (let i = 0; i < 900 && game.state !== 'play'; i++) game.update(1 / 60);
  assert.equal(game.state, 'play');
  return game;
}

const chip = (vx: number, vy: number) => ({
  x: 200, y: 300, vx, vy, life: 1, max: 1, size: 5, color: '#fff',
  kind: 'chip', rot: 0, vr: 0, g: 900,
});

test('landscape drops debris along world +x — the screen floor — not sideways', () => {
  const game = liveGame('landscape');
  // Portrait debris is written with +y = down. On the landscape screen
  // (`layout.ts`: world (x, y) is display (H - y, x)) the floor is world +x, so
  // a piece thrown straight "down" must come out thrown along +x instead.
  const p = chip(0, 240);
  game.particles.push(p);
  assert.equal(game.debrisFallsAlongX, true);
  for (let i = 0; i < 6; i++) game.update(1 / 60);
  assert.ok(p.vx > 200, `gravity pulls along +x (vx ${p.vx.toFixed(1)})`);
  assert.ok(Math.abs(p.vy) < 30, `nothing pushes it sideways (vy ${p.vy.toFixed(1)})`);
});

test('portrait keeps the original +y gravity, untouched', () => {
  const game = liveGame('portrait');
  const p = chip(0, 200);
  game.particles.push(p);
  assert.equal(game.debrisFallsAlongX, false);
  for (let i = 0; i < 6; i++) game.update(1 / 60);
  assert.ok(p.vy > 200, 'still falls along +y');
  assert.ok(Math.abs(p.vx) < 1, 'no sideways drift');
});

test('a piece is turned into the screen frame exactly once', () => {
  const game = liveGame('landscape');
  const piece = { vx: 0, vy: 120 };
  game.turnDebris(piece);
  assert.equal(piece.vx, 120);
  assert.ok(piece.vy === 0, 'a straight-down launch becomes a straight-in launch');
  // A later frame must not turn it again (that would spin its arc every frame).
  game.turnDebris(piece);
  assert.equal(piece.vx, 120);
  assert.ok(piece.vy === 0);
});

test('every falling array rides the same gravity axis', () => {
  const src = readFileSync('src/games/gunhit/game/Game.ts', 'utf8');
  // particles, glass fragments, knocked-loose rounds, detached rock cells and
  // rock fragments all have to agree, or half the wreckage still slides sideways.
  assert.match(src, /if \(this\.debrisFallsAlongX\) p\.vx \+= p\.g \* s;/);
  assert.match(src, /if \(this\.debrisFallsAlongX\) f\.vx \+= 1300 \* s;/);
  assert.match(src, /if \(this\.debrisFallsAlongX\) f\.vx \+= 1400 \* s;/);
  assert.match(src, /if \(this\.debrisFallsAlongX\) f\.vx \+= 1500 \* s;/g);
  assert.match(src, /private pastDebrisFloor\(x: number, y: number, m: number\): boolean \{/);
});

test('a resize that cannot change the surface never blanks the canvas', () => {
  const game = liveGame('landscape');
  const before = game.canvas.width;
  const surface = game.cssSurface;
  let painted = 0;
  const realRender = game.render;
  game.render = () => { painted++; realRender.call(game); };
  // A mobile browser fires resize for an address bar collapsing, the keyboard,
  // or a rotation the presentation already handled. None of those can change a
  // fixed world-sized canvas, so nothing may be reallocated or cleared.
  for (let i = 0; i < 8; i++) game.resize();
  assert.equal(game.canvas.width, before, 'backing store untouched');
  assert.equal(game.cssSurface, surface, 'the surface key is stable');
  assert.equal(painted, 0, 'no reallocation, so no blank frame to repaint');

  const src = readFileSync('src/games/gunhit/game/Game.ts', 'utf8');
  assert.match(src, /if \(surface === this\.cssSurface && this\.hasSized\) return;/);
  // …and when it *does* rebuild, it repaints immediately instead of waiting for
  // a throttled tick to fill the empty store.
  assert.match(src, /if \(this\.hasRendered\) this\.render\(\);\n  \};/);
  // A resolution change mid-play also starts from an empty store: never skip
  // that frame's draw.
  assert.match(src, /live \? resized \|\| this\.cadence\.shouldRender/);
});
