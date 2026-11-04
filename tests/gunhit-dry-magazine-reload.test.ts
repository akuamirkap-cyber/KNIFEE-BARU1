import test from 'node:test';
import assert from 'node:assert/strict';
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

function stageCanvas(width = 760, height = 420) {
  const surface = createCanvas(width, height);
  return {
    width, height, style: {}, getContext: () => surface.getContext('2d'),
    addEventListener: () => undefined, removeEventListener: () => undefined,
    getBoundingClientRect: () => ({ left: 0, top: 0, width, height }),
  };
}

function liveGame(level: number) {
  const game = new Game(stageCanvas() as never, {
    onGameOver() {}, onStageChange() {}, onStageCleared() {}, onShotFired() {}, onBossDefeated() {},
  } as never) as unknown as Record<string, any>;
  game.setOrientation('landscape');
  game.active = true;
  game.startAtLevel(level);
  for (let i = 0; i < 900 && game.state !== 'play'; i++) game.update(1 / 60);
  assert.equal(game.state, 'play', `level ${level} reached play`);
  return game;
}

for (const level of [1, 5]) {
  const label = level === 5 ? 'boss stage' : 'normal stage';
  test(`a spent magazine on a live ${label} reloads instead of dead-ending the run`, () => {
    const game = liveGame(level);
    game.ammoLeft = 0;
    game.reloadT = 0;
    let sawReload = false;
    for (let i = 0; i < 180; i++) {
      game.update(1 / 60);
      if (game.reloadT > 0) sawReload = true;
      assert.notEqual(game.state, 'fail', 'an empty magazine is not a loss');
      assert.notEqual(game.state, 'over', 'the run does not end on an empty magazine');
    }
    assert.ok(sawReload, 'the empty gun goes through its reload beat');
    assert.ok(game.ammoLeft > 0, `the stage comes back with rounds (got ${game.ammoLeft})`);
  });
}

test('a magazine is not topped up while a round is still in the air', () => {
  const game = liveGame(1);
  game.ammoLeft = 1;
  game.cooldown = 0;
  game.shoot();
  assert.equal(game.ammoLeft, 0);
  assert.ok(game.projs.length > 0, 'the last round left the barrel');
  game.update(1 / 60);
  assert.equal(game.reloadT, 0, 'nothing reloads while the shot is in flight');
});
