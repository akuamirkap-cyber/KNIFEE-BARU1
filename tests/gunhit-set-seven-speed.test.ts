import test from 'node:test';
import assert from 'node:assert/strict';

import { Game, makeLevel } from '../src/games/gunhit/game/Game';
import { getWeapon } from '../src/games/gunhit/game/weapons';
import { SET_SEVEN_DESIGN_WEAPONS, setGunEffect } from '../src/games/gunhit/game/art/gunVariants';
import { setSevenIdFor } from '../src/games/gunhit/game/setSevenArt';
import { adoptSevenRound, sevenAmmo, sevenCooldown } from '../src/games/gunhit/game/setSevenShot';

/** A context that accepts every call; nothing here inspects pixels. */
function fakeCtx() {
  const gradient = { addColorStop: () => undefined };
  return new Proxy({} as Record<string, unknown>, {
    get: (_t, prop) => {
      const name = String(prop);
      if (name === 'createLinearGradient' || name === 'createRadialGradient'
        || name === 'createConicGradient' || name === 'createPattern') return () => gradient;
      if (name === 'canvas') return { width: 420, height: 760 };
      if (name === 'measureText') return () => ({ width: 10 });
      if (name === 'getImageData') return () => ({ data: new Uint8ClampedArray(4) });
      return () => undefined;
    },
    set: () => true,
  }) as unknown as CanvasRenderingContext2D;
}

/** A Game without a canvas: enough of slide 1 for the fire path. */
function probe(weapon: string) {
  const game = Object.create(Game.prototype) as Game & Record<string, unknown>;
  const particles: unknown[] = [];
  Object.assign(game, {
    level: makeLevel(3), weapon: getWeapon(weapon as never), state: 'play',
    projs: [], beams: [], items: [], flyers: [], frags: [], stuck: 0,
    particles, lights: [], sink: { push: (p: unknown) => particles.push(p), light: () => {} },
    events: {}, rot: 0, levelTime: 0, camY: 0, bump: 0, shake: 0, hitStop: 0, flashWhite: 0,
    cooldown: 0, reloadT: 0, ammoLeft: 30, snowLoaded: 6, maxAmmoMult: 1,
    speedMult: 1, dmgMult: 1, rt: 0, coins: 0, score: 0, slowT: 0, slowF: 1,
    combo: 0, lastHit: -10, time: 1, hitFlash: 0, timeScale: 1,
    faceCtx: fakeCtx(), faceScale: 2,
  });
  return game;
}

interface Carrier {
  vy: number;
  vx: number;
  setSeven?: { vy: number; weapon: string };
  setSevenPending?: boolean;
  s7Ghost?: boolean;
}

/** Fire one round of `id` with the slide-7 effect selected. */
function fireWithSetSeven(id: string) {
  setGunEffect(id as never, 'set7');
  const game = probe(id);
  game.shoot();
  const carriers = game.projs as unknown as Carrier[];
  const carrier = carriers[0];
  assert.ok(carrier, `${id} fired a carrier`);
  // Charge-style recipes hand their round over later: run slide 7's timers.
  const layer = (game as unknown as { s7: { update: (dt: number) => void } }).s7;
  for (let i = 0; i < 60 && carrier.setSevenPending; i++) {
    layer.update(1 / 60);
    // Slide 1's own carrier loop hands the round over; call that one step
    // without running a whole frame of the stage.
    pendingRelease(game, carrier);
  }
  return { game, carrier, carriers };
}

/** The one line of slide 1's projectile loop a pending carrier needs. */
function pendingRelease(game: Game & Record<string, unknown>, carrier: Carrier) {
  if (!carrier.setSevenPending) return;
  const made = (game as unknown as { s7: { takeShots: () => unknown[] } }).s7.takeShots();
  if (!made.length) return;
  carrier.setSeven = made[0] as Carrier['setSeven'];
  carrier.setSevenPending = false;
  adoptSevenRound(carrier, made[0] as { vy: number }, Math.abs(carrier.vy), 1);
}

test('every slide-7 gun fires on slide 7’s own trigger interval', () => {
  assert.equal(SET_SEVEN_DESIGN_WEAPONS.length, 63);
  for (const id of SET_SEVEN_DESIGN_WEAPONS) {
    const s7 = setSevenIdFor(id);
    assert.ok(s7, `${id} maps to a slide-7 gun`);
    const want = sevenCooldown(s7!);
    assert.ok(want !== null && want > 0, `${s7} has a slide-7 cooldown`);
    const { game } = fireWithSetSeven(id);
    assert.equal(
      (game as unknown as { cooldown: number }).cooldown,
      want,
      `${id} reloads in slide 7's ${want}s, not slide 1's`,
    );
  }
});

test('every slide-7 round flies at the speed slide 7 launches it with', () => {
  for (const id of SET_SEVEN_DESIGN_WEAPONS) {
    const { game, carrier } = fireWithSetSeven(id);
    const w = getWeapon(id as never);
    // Charge-style recipes that never released a round in the first frame keep
    // slide 1's speed until they do; that is handled by the pending test below.
    if (!carrier.setSeven) continue;
    const own = Math.abs(carrier.setSeven.vy);
    // Beams (`LaserBeam`, `FreezeBeam`, `RailShot`) are built with a -100
    // placeholder: they never travel, so they keep slide 1's fast carrier.
    const want = own > 200 ? own : w.speed;
    assert.ok(
      Math.abs(Math.abs(carrier.vy) - want) < 1e-6,
      `${id} flies at ${want} px/s (slide 7's own), not ${Math.abs(carrier.vy)}`,
    );
    assert.ok((game as unknown as { cooldown: number }).cooldown > 0);
  }
});

test('a late round adopts slide 7’s speed when it is finally released', () => {
  // The staff-charged guns release after the trigger; the carrier must not keep
  // flying at slide 1's speed once the real round exists.
  const checked = new Set<string>();
  for (const id of SET_SEVEN_DESIGN_WEAPONS) {
    const { game, carrier } = fireWithSetSeven(id);
    if (!carrier.setSeven) continue;
    const own = Math.abs(carrier.setSeven.vy);
    if (own <= 200) continue; // beam
    const w = getWeapon(id as never);
    if (Math.abs(w.speed - own) < 1e-6) continue;
    checked.add(id);
    assert.ok(Math.abs(Math.abs(carrier.vy) - own) < 1e-6, `${id} travels at ${own}`);
    void game;
  }
  assert.ok(checked.size > 50, `most guns differ from slide 1 (${checked.size} checked)`);
});

test('slide 7 keeps drawing its round after it lands, so slide 1 hides its own', () => {
  const { game, carrier } = fireWithSetSeven('snowball');
  assert.ok(carrier.setSeven, 'snowball has its round');
  const g = game as unknown as { stickAt: (a: number, p: unknown) => void; items: { hideArt?: boolean }[] };
  g.stickAt(0.4, carrier);
  assert.equal(g.items.length, 1, 'the hit is stored for scoring and collisions');
  assert.equal(g.items[0].hideArt, true, 'slide 1 no longer paints a second round');
  const layer = (game as unknown as { s7: { stuck: unknown[]; released: unknown[] } }).s7;
  assert.equal(layer.stuck.length, 1, 'slide 7 paints the stuck round itself');
  assert.equal(layer.released.length, 1, 'and keeps animating the round it landed');
});

test('slide 7 ammo table is present for every ported gun', () => {
  for (const id of SET_SEVEN_DESIGN_WEAPONS) {
    const s7 = setSevenIdFor(id);
    assert.ok(sevenAmmo(s7!)! > 0, `${s7} has a slide-7 ammo budget`);
  }
});
