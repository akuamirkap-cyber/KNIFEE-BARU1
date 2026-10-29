import test from 'node:test';
import assert from 'node:assert/strict';
import { installCanvasShim } from './supportCanvas';
import { drawGun } from '../src/games/gunhit/game/art/guns';
import { drawProjectile } from '../src/games/gunhit/game/art/projectiles';
import { drawCrystalEffectTwo } from '../src/games/gunhit/game/art/combinedShots';
import { drawXenoCorrosion, drawXenoHybridFlight, drawXenoMolecularBurst, drawXenoSpecialPuddle } from '../src/games/gunhit/game/art/xenoHybrid';
import { drawSpiritMote } from '../src/games/shared/spiritArt';
import { ghostWisps } from '../games/game-4/src/game/spawn5';
import { Particles } from '../games/game-4/src/game/particles';
import { SpiritAura } from '../games/game-4/src/game/fx5';
import { drawBreakerCoin } from '../src/games/shared/coinArt';
import { drawHolyEmblem } from '../games/game-4/src/game/shapes7';
import { CoinShot } from '../games/game-4/src/game/projectiles7';
import { busterWeapon } from '../games/game-8/src/game/weapons/icons';
import { BUSTER_PELLET_RADIUS } from '../games/game-8/src/game/weapons/busterPellet';
import { drawSetElevenGun, restElevenState } from '../src/games/gunhit/game/setElevenArt';

installCanvasShim();
function recording() {
  const calls: { name: string; args: unknown[] }[] = [];
  const stops: string[] = [];
  const widths: number[] = [];
  const gradient = { addColorStop: (_n: number, color: string) => stops.push(color) };
  const state: Record<string, unknown> = { globalAlpha: 1 };
  const ctx = new Proxy(state, {
    get(target, prop) {
      if (prop === 'globalAlpha') return target.globalAlpha;
      if (prop === 'createLinearGradient' || prop === 'createRadialGradient' || prop === 'createConicGradient') return () => gradient;
      if (prop === 'canvas') return { width: 420, height: 760 };
      return (...args: unknown[]) => { calls.push({ name: String(prop), args }); };
    },
    set(target, prop, value) {
      target[String(prop)] = value;
      if (prop === 'lineWidth') widths.push(value as number);
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;
  return { ctx, calls, stops, widths };
}

test('Holy uses a pearl emblem and a white sculpted handle, not the former cross or pistol grip', () => {
  const e = recording();
  drawHolyEmblem(e.ctx, 11);
  assert.equal(e.calls.filter(c => c.name === 'ellipse').length, 2);
  assert.ok(!e.calls.some(c => c.name === 'fillRect' || c.name === 'lineTo'), 'emblem is an oval jewel, not a cross');
  const original = recording();
  drawGun(original.ctx, 'holy', 0, 0, 0.5, 0, true, undefined, 'original');
  assert.ok(original.stops.includes('rgba(255,255,255,1)'), 'white pearlescent grip highlights');
  assert.ok(original.stops.some(color => /^rgba\(20[0-9],2[0-4][0-9],2[0-5][0-9],1\)$/.test(color)), 'cool pale shading defines its white contour');
});

test('Photon skin 5 retains a continuous multi-layer glow along the blade', () => {
  const rec = recording();
  drawSetElevenGun(rec.ctx, 'energy-sword', 0, 0, 0.8, restElevenState());
  assert.ok([76, 48, 29].every(width => rec.widths.includes(width)), 'three full-blade halo strokes');
  assert.ok(rec.stops.includes('rgba(70,210,255,0.8)'));
});

test('all three Firework openings contain loaded rockets in both three-tube designs', () => {
  const original = recording();
  drawGun(original.ctx, 'firework', 0, 0, 0.8, 0, true, undefined, 'original');
  assert.equal(original.calls.filter(c => c.name === 'fillRect' && c.args[2] === 7 && c.args[3] === 12).length, 3);
  const imported = recording();
  drawGun(imported.ctx, 'firework', 0, 0, 0.8, 0, true, undefined, 'set7');
  assert.equal(imported.calls.filter(c => c.name === 'fillRect' && c.args[0] === -4.2 && c.args[1] === -2).length, 3);
});

test('both Coin Gun projectile renderers reuse the exact shiny in-game coin sprite', () => {
  const actual = recording();
  drawBreakerCoin(actual.ctx, 0, 12, 13, 0.5, 0, 1, true, true);
  const face = actual.calls.find(c => c.name === 'drawImage')?.args[0];
  assert.ok(face, 'in-game coin uses its baked shiny sprite');
  const original = recording();
  drawProjectile(original.ctx, 'coingun', 44, 0.5, 0, false, 'new');
  assert.ok(original.calls.some(c => c.name === 'drawImage' && c.args[0] === face));
  const slide3 = recording();
  const shot = new CoinShot({} as never, 0, 12); shot.age = 0.5;
  shot.draw(slide3.ctx);
  assert.ok(slide3.calls.some(c => c.name === 'drawImage' && c.args[0] === face));
});

test('Mega Buster keeps its doubled core and now flies with a Plasma Gun energy tail', () => {
  let projectile: { draw: (ctx: CanvasRenderingContext2D, game: unknown, p: unknown) => void } | undefined;
  const host = {
    muzzlePos: () => ({ x: 0, y: 0 }), muzzleFlash: () => undefined, ring: () => undefined,
    light: () => undefined, addProj: (p: typeof projectile) => { projectile = p; },
  };
  busterWeapon.onRelease!(host as never, { data: {} } as never, 0);
  assert.ok(projectile);
  const rec = recording();
  projectile.draw(rec.ctx, host, { x: 0, y: 0, age: 0 });
  assert.equal(BUSTER_PELLET_RADIUS, 14, 'radius 14, previously 7');
  assert.ok(rec.calls.some(c => c.name === 'drawImage' && c.args[3] === 28 && c.args[4] === 28), 'the shared 28px core is drawn');
  assert.ok(rec.calls.some(c => c.name === 'moveTo' && c.args[0] === -10.5 && c.args[1] === 4), 'the wide Plasma-style tail starts behind the core');
  assert.ok(rec.calls.some(c => c.name === 'lineTo' && c.args[0] === 1 && c.args[1] === 110), 'the trail tapers over the Plasma Gun’s 110px length');
});

test('Crystal effect 3 draws exactly the effect-2 projectile', () => {
  const combo = recording(), effect2 = recording();
  drawCrystalEffectTwo(combo.ctx, 0, 4, 1);
  effect2.ctx.save(); effect2.ctx.translate(0, 0);
  drawProjectile(effect2.ctx, 'crystal', 44, 1, 0, false, 'new'); effect2.ctx.restore();
  assert.deepEqual(combo.calls, effect2.calls);
  assert.deepEqual(combo.stops, effect2.stops);
});

test('Ghost aura uses closed sheet-spirits with faces instead of head-and-tail strokes', () => {
  const one = recording();
  drawSpiritMote(one.ctx, 10, 20, 12, 0.5);
  assert.ok(one.calls.some(c => c.name === 'closePath'), 'the ghost has a closed silhouette');
  assert.equal(one.calls.filter(c => c.name === 'ellipse').length, 2, 'two eyes identify the spirit');
  assert.ok(one.calls.filter(c => c.name === 'quadraticCurveTo').length >= 4, 'scalloped ghost hem');

  const particles = new Particles();
  ghostWisps(particles, 0, 0, 3, 0, 1, [10, 20]);
  assert.equal(particles.list.length, 3);
  for (const p of particles.list) {
    const rec = recording();
    p.draw!(rec.ctx, p);
    assert.ok(rec.calls.some(c => c.name === 'closePath'));
    assert.equal(rec.calls.filter(c => c.name === 'ellipse').length, 2);
  }
  const aura = new SpiritAura(0, 0); aura.update(0.25);
  const rec = recording(); aura.draw(rec.ctx);
  assert.equal(rec.calls.filter(c => c.name === 'closePath').length, 5, 'impact aura also uses ghost silhouettes');
});

test('Xeno hybrid shows effect-3 glass glob, a molecular shock wave and a growing crater', () => {
  const flight = recording();
  drawXenoHybridFlight(flight.ctx, 0, 0, 0.2);
  assert.ok(flight.stops.includes('#f8ffc0') && flight.stops.includes('#c6ff3a'), 'uses effect 3’s actual glob gradient');
  assert.ok(flight.calls.filter(c => c.name === 'closePath').length >= 3, 'molecular tracers are visible in flight');

  const impact = recording();
  drawXenoMolecularBurst(impact.ctx, 10, 20, 0.3);
  assert.equal(impact.calls.filter(c => c.name === 'closePath').length, 19, 'effect 3’s full honeycomb wave');
  const fresh = recording(), grown = recording();
  drawXenoCorrosion(fresh.ctx, 0, 0, 0, -9.6, 0);
  drawXenoCorrosion(grown.ctx, 0, 0, 1, -9.6, 1);
  const r0 = fresh.calls.find(c => c.name === 'arc')!.args[2] as number;
  const r1 = grown.calls.find(c => c.name === 'arc')!.args[2] as number;
  assert.ok(r1 > r0 * 2, 'the corroded hole visibly grows');
  const special = recording();
  drawXenoSpecialPuddle(special.ctx, 0, 0, 1);
  assert.ok(special.stops.some(stop => stop.includes('175,255,34')), 'special-stage mark also has green liquid');
});

test('Xeno hybrid bubbles always have valid radii, including negative rock and chest seeds', () => {
  for (const seed of [-1000, -142, -9.6, 0, 5, 1000]) for (const time of [0, 0.13, 2.4]) {
    const rec = recording();
    drawXenoCorrosion(rec.ctx, 0, 0, time, seed);
    const arcs = rec.calls.filter(c => c.name === 'arc');
    const bubbles = arcs.slice(1); // the first arc is the broad stain
    assert.equal(bubbles.length, 7);
    assert.ok(bubbles.every(c => typeof c.args[2] === 'number' && c.args[2] >= 1.2 && c.args[2] < 4.4), `seed ${seed}, time ${time}`);
  }
});
