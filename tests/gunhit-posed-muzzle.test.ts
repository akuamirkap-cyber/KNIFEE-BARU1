import test from 'node:test';
import assert from 'node:assert/strict';
import { installCanvasShim } from './supportCanvas';
import { installSilentAudio } from '../tools/supportAudioSilent';
import { CX } from '../src/games/gunhit/game/layout';

installCanvasShim();
installSilentAudio();

const env = globalThis as any;
env.window = Object.assign(env.window ?? {}, {
  setTimeout, clearTimeout, setInterval: () => 0, clearInterval: () => undefined,
  addEventListener: () => undefined, removeEventListener: () => undefined, devicePixelRatio: 1,
});
const store: Record<string, string> = { gunhit_menu_theme: 'town' };
env.localStorage = {
  getItem: (k: string) => store[k] ?? null,
  setItem: (k: string, v: string) => { store[k] = String(v); },
  removeItem: (k: string) => { delete store[k]; },
  clear: () => { for (const k of Object.keys(store)) delete store[k]; },
};

const gradient = { addColorStop: () => undefined };
const ctx = new Proxy({} as any, {
  get: (_t, p) => {
    const n = String(p);
    if (n === 'canvas') return { width: 760, height: 420 };
    if (n === 'createLinearGradient' || n === 'createRadialGradient' || n === 'createPattern') return () => gradient;
    if (n === 'measureText') return () => ({ width: 8 });
    if (n === 'getImageData') return () => ({ data: new Uint8ClampedArray(4) });
    if (n === 'getTransform') return () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 });
    return () => undefined;
  },
  set: () => true,
});
const canvas = {
  width: 760, height: 420, style: {},
  getContext: () => ctx,
  addEventListener: () => undefined,
  removeEventListener: () => undefined,
  getBoundingClientRect: () => ({ left: 0, top: 0, width: 760, height: 420 }),
};

const { Game } = await import('../src/games/gunhit/game/Game.ts');

const EVENTS = { onGameOver(){}, onStageChange(){}, onStageCleared(){}, onShotFired(){}, onBossDefeated(){} };

/** A settled landscape run with the gun slid up and the barrel leaning. */
async function posedRun(weapon: string) {
  const game = new Game(canvas as never, EVENTS as never) as any;
  game.setOrientation('landscape');
  game.active = true;
  game.setWeapon(weapon);
  game.startAtLevel(1);
  for (let i = 0; i < 240 && game.state === 'intro'; i++) game.update(1 / 60);
  game.gunSlideUp = true;
  for (let i = 0; i < 40; i++) game.update(1 / 60);
  game.gunSlideUp = false;
  game.aimPointer = { x: 700, y: 30 };
  for (let i = 0; i < 20; i++) game.update(1 / 60);
  return game;
}

test('slide 11 paints its muzzle where the barrel actually is', async () => {
  const game = await posedRun('ak47');
  assert.equal(game.state, 'play');
  assert.ok(game.setElevenLive, 'the AK-47 runs the slide-11 layer');
  const tilt = game.getGunTilt();
  assert.ok(Math.abs(tilt) > 0.05, 'the barrel is leaning');
  assert.ok(game.gunX < CX - 100, 'the gun is slid away from the centre');

  const module = game.s11;
  // A shot, then its spray must sit on the barrel — slide 11 paints its own
  // effects, so they used to hang at the upright centre of its world (CX) while
  // the gun itself had slid away.
  game.cooldown = 0;
  game.shoot();
  const burst = module.raw.fx.filter((f: any) => f.poseAnchor).at(-1);
  assert.ok(burst, 'the muzzle burst leans with the barrel');
  const spray = module.raw.parts as { x: number; y: number; type: string }[];
  assert.ok(spray.length > 0, 'the shot throws its own smoke');
  const nearBarrel = spray.filter((q) => Math.abs(q.x - game.gunX) < 30 && Math.abs(q.y - game.gunBaseY) < 40);
  assert.ok(nearBarrel.length > 0, `slide 11's spray leaves the barrel: ${JSON.stringify(spray.map((q) => [Math.round(q.x), Math.round(q.y)]))}`);
  const stranded = spray.filter((q) => Math.abs(q.x - CX) < 12);
  assert.equal(stranded.length, 0, 'nothing is left hanging at the old centre line');
});

test('every gun family fires from the barrel, not from the old centre line', async () => {
  for (const weapon of ['pistol', 'ak47', 'mp5', 'sniper', 'bazooka', 'shotgun']) {
    const game = await posedRun(weapon);
    const before = game.projs.length;
    game.cooldown = 0;
    game.shoot();
    // Aiming happens on the next tick, exactly like the live loop.
    for (let i = 0; i < 2; i++) game.update(1 / 1000);
    const fired = game.projs.slice(before);
    assert.ok(fired.length > 0, `${weapon} fires a round`);
    for (const p of fired) {
      if ((p.spawnDelay ?? 0) > 0) continue;
      assert.ok(
        Math.abs(p.x - game.gunX) < 70,
        `${weapon}: round leaves at x ${p.x.toFixed(0)}, gun is at ${game.gunX.toFixed(0)} (centre ${CX})`,
      );
    }
  }
});
