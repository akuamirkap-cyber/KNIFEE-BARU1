import test from 'node:test';
import assert from 'node:assert/strict';

import { installCanvasShim } from './supportCanvas';

/**
 * A whole slide-1 frame needs the DOM-ish globals the game touches on boot
 * (`window.addEventListener` for the resize hook, a canvas context, silent
 * audio). The shim below is the same one the headless tools use.
 */
installCanvasShim();
const g = globalThis as unknown as Record<string, unknown> & { window: Record<string, unknown> };
g.window = Object.assign(g.window ?? {}, {
  setTimeout, clearTimeout,
  setInterval: () => 0, clearInterval: () => undefined,
  addEventListener: () => undefined, removeEventListener: () => undefined,
  devicePixelRatio: 1, innerWidth: 420, innerHeight: 760,
});

const gradient = { addColorStop: () => undefined };
const ctx = new Proxy({ canvas: { width: 420, height: 760 } } as Record<string, unknown>, {
  get(target, prop) {
    const name = String(prop);
    if (name === 'canvas') return target.canvas;
    if (name === 'createLinearGradient' || name === 'createRadialGradient' || name === 'createPattern') {
      return () => gradient;
    }
    if (name === 'measureText') return () => ({ width: 8 });
    return () => undefined;
  },
  set(target, prop, value) { target[String(prop)] = value; return true; },
}) as unknown as CanvasRenderingContext2D;

const canvas = {
  width: 420, height: 760, style: {},
  getContext: () => ctx,
  addEventListener: () => undefined,
  removeEventListener: () => undefined,
  getBoundingClientRect: () => ({ left: 0, top: 0, width: 420, height: 760 }),
};

const { Game, makeLevel } = await import('../src/games/gunhit/game/Game.ts');
const variants = await import('../src/games/gunhit/game/art/gunVariants.ts');

const events = {
  onGameOver: () => undefined, onStageChange: () => undefined, onStageCleared: () => undefined,
  onShotFired: () => undefined, onBossDefeated: () => undefined,
};

function stage(weapon: string) {
  variants.setGunEffect(weapon as never, 'set7');
  const game = new Game(canvas as unknown as HTMLCanvasElement, events as never) as unknown as Record<string, unknown>;
  game.level = makeLevel(3);
  game.state = 'play';
  (game as unknown as { setWeapon: (id: string) => void }).setWeapon(weapon);
  game.cooldown = 0;
  game.reloadT = 0;
  game.ammoLeft = 30;
  game.snowLoaded = 6;
  return game as unknown as {
    update: (dt: number) => void;
    shoot: () => void;
    projs: { y: number; setSeven?: unknown; setSevenPending?: boolean; s7Ghost?: boolean }[];
    items: { type: string; hideArt?: boolean }[];
    s7: { stuck: unknown[]; released: unknown[] };
    cooldown: number;
    level: { ammo: number };
    ammoLeft: number;
    state: string;
  };
}

const DT = 1 / 60;

test('a charged slide-7 round waits at the muzzle until slide 7 releases it', () => {
  // Bamboo lights its fuse for 0.17 s before the round exists. Slide 7 shows
  // nothing in that time, so slide 1's carrier must not fly a bullet slide 7
  // never fired (it used to land first, and the round was lost).
  const game = stage('bamboo');
  game.shoot();
  const carrier = game.projs[0];
  assert.ok(carrier.setSevenPending, 'the round is still on the fuse');
  const y0 = carrier.y;
  for (let i = 0; i < 8; i++) { game.state = 'play'; game.cooldown = 9; game.update(DT); }
  assert.equal(game.projs.length, 1, 'the carrier is still held');
  assert.equal(game.projs[0].y, y0, 'and it has not moved a pixel');
  assert.equal(game.s7.stuck.length, 0, 'nothing landed yet');
  for (let i = 0; i < 40; i++) { game.state = 'play'; game.cooldown = 9; game.update(DT); }
  assert.equal(game.projs.length, 0, 'then it flies and lands');
  assert.equal(game.s7.stuck.length, 1, 'slide 7 keeps the bamboo stuck in the wheel');
  assert.ok((game.items.find((it) => it.type === 'bullet'))?.hideArt, 'slide 1 does not paint a second one');
});

test('every charged slide-7 gun lands with slide 7’s own stuck art', () => {
  // These all release their round after the trigger: the emerald/rail/freeze
  // charge-ups, the buster, the moon staff, the meteor…
  for (const id of ['emerald', 'railgun', 'freeze', 'buster', 'moonbeam', 'meteor', 'pirate', 'obliterator', 'gravity', 'storm']) {
    const game = stage(id);
    game.shoot();
    for (let i = 0; i < 90 && game.projs.length > 0; i++) {
      game.state = 'play';
      game.cooldown = 9;
      game.update(DT);
    }
    assert.equal(game.s7.stuck.length, 1, `${id} leaves exactly one round in the wheel`);
    const bullets = game.items.filter((it) => it.type === 'bullet');
    assert.ok(bullets.length >= 1 && bullets.every((it) => it.hideArt), `${id}: slide 1 hides its own bullet art`);
  }
});

test('a slide-3 burst gun fires one round: one knife and one shell, not one per pellet', () => {
  const game = stage('sapphire');
  const ammo = game.ammoLeft;
  game.shoot();
  assert.equal(game.ammoLeft, ammo - 1, 'slide 3 spends one round a trigger');
  assert.equal(game.projs.length, 1, 'its shards live inside that one round');
  for (let i = 0; i < 90 && game.projs.length > 0; i++) {
    game.state = 'play';
    game.cooldown = 9;
    game.update(DT);
  }
  const bullets = game.items.filter((it) => it.type === 'bullet');
  assert.equal(bullets.length, 1, 'one knife for one round, as slide 3 counts it');
  assert.ok(bullets.every((it) => it.hideArt), 'and slide 1 paints no bullet over it');
  assert.equal(game.s7.stuck.length, 1, 'slide 3 shows a single sapphire shell');
});
