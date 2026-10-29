import test from 'node:test';
import assert from 'node:assert/strict';
import { installCanvasShim } from './supportCanvas';
import { installSilentAudio } from '../tools/supportAudioSilent';
import { RETIRED_WEAPONS } from '../src/games/gunhit/game/retiredWeapons';
import { WEAPONS, getWeapon, rollGiftWeapon } from '../src/games/gunhit/game/weapons';
import { QUESTS } from '../src/games/gunhit/game/quests';

installCanvasShim();
const env = globalThis as unknown as Record<string, unknown> & { window: Record<string, unknown> };
env.window = Object.assign(env.window ?? {}, {
  setTimeout, clearTimeout, setInterval: () => 0, clearInterval: () => undefined,
  addEventListener: () => undefined, removeEventListener: () => undefined,
  devicePixelRatio: 1, innerWidth: 420, innerHeight: 760,
});
installSilentAudio();
const gradient = { addColorStop: () => undefined };
const paint: string[] = [];
let capturedTransform: object | undefined;
const ctx = new Proxy({ canvas: { width: 420, height: 760 }, globalAlpha: 1 } as Record<string, unknown>, {
  get(target, prop) {
    const name = String(prop);
    if (name === 'canvas' || name === 'globalAlpha') return target[name];
    if (name === 'createLinearGradient' || name === 'createRadialGradient' || name === 'createPattern') return () => gradient;
    if (name === 'measureText') return () => ({ width: 8 });
    if (name === 'getImageData') return () => ({ data: new Uint8ClampedArray(4) });
    if (name === 'getTransform') return () => capturedTransform;
    if (name === 'setTransform') return (...args: unknown[]) => {
      if (capturedTransform && args[0] === capturedTransform) paint.push('wheel-transform-restored');
    };
    return () => { paint.push(name); };
  },
  set(target, prop, value) { target[String(prop)] = value; return true; },
}) as unknown as CanvasRenderingContext2D;
const canvas = {
  width: 420, height: 760, style: {}, getContext: () => ctx,
  addEventListener: () => undefined, removeEventListener: () => undefined,
  getBoundingClientRect: () => ({ left: 0, top: 0, width: 420, height: 760 }),
};
const { Game } = await import('../src/games/gunhit/game/Game.ts');
const variants = await import('../src/games/gunhit/game/art/gunVariants.ts');
const { setElevenMuted } = await import('../src/games/gunhit/game/setElevenFx.ts');
const previousSkin = variants.getGunVariant('mega_buster');
const previousEffect = variants.getGunEffect('mega_buster');
variants.setGunVariant('mega_buster', 'set11'); variants.setGunEffect('mega_buster', 'set11');
setElevenMuted(true);
test.after(() => {
  variants.setGunVariant('mega_buster', previousSkin); variants.setGunEffect('mega_buster', previousEffect);
  setElevenMuted(false);
});
type Live = Record<string, any>;
const events = { onGameOver() {}, onStageChange() {}, onStageCleared() {}, onShotFired() {}, onBossDefeated() {} };

function stage(mode: 'classic' | 'boss' | 'boulder' | 'bonus' | 'treasure'): Live {
  const game = new Game(canvas as unknown as HTMLCanvasElement, events as never) as unknown as Live;
  if (mode === 'classic') game.startAtLevel(1);
  else if (mode === 'boss') game.startAtLevel(5);
  else game.startSpecialStage(mode);
  game.setWeapon('mega_buster');
  for (let i = 0; i < 180 && game.state === 'intro'; i++) game.update(1 / 60);
  assert.equal(game.state, 'play');
  game.items = []; game.bonusCoins = []; game.bossProjs = []; game.star = null;
  game.level.base = 0; game.level.ammo = 99; game.rot = 0;
  game.ammoLeft = 99; game.cooldown = 0; game.reloadT = 0;
  return game;
}
function land(game: Live, charge = 0) {
  game.chargeLevel = charge; game.shoot();
  assert.equal(game.projs.length, 1, 'one real carrier leaves for one tap');
  assert.equal(game.projs[0].big, charge);
  assert.ok(game.projs[0].setEleven, 'the real slide-11 projectile supplies the art');
  if (charge === 0) assert.equal(game.projs[0].setEleven.vy, -2700, 'the yellow Plasma-style shot retains Mega Buster speed');
  for (let i = 0; i < 180 && game.projs.length && game.state === 'play'; i++) game.update(1 / 60);
  assert.equal(game.projs.length, 0, 'the target consumes the carrier');
}

test('Anchor Cannon is retired everywhere and stale saves resolve to the pistol', () => {
  assert.ok(RETIRED_WEAPONS.has('anchor'));
  assert.ok(!WEAPONS.some(w => w.id === 'anchor'));
  assert.equal(getWeapon('anchor').id, 'pistol');
  assert.ok(!QUESTS.some(q => q.rewardWeapon === 'anchor'));
  assert.ok(!variants.getWeaponDefaultExportEntries('all').some(row => row.id === 'anchor'));
  assert.deepEqual(variants.getGunVariantOptions('anchor' as never), []);
  assert.deepEqual(variants.getGunEffectOptions('anchor' as never), []);
  for (let i = 0; i < 200; i++) assert.notEqual(rollGiftWeapon().id, 'anchor');
  assert.equal(getWeapon('mega_buster').id, 'mega_buster');
});

test('one yellow tap scores once, becomes a wheel-attached orb, and keeps collision rules', () => {
  const game = stage('classic');
  try {
    land(game);
    assert.equal(game.state, 'play');
    assert.equal(game.score, 2); assert.equal(game.stuck, 1);
    const fx = game.s7State;
    assert.ok(fx, 'the real Plasma Gun visual layer handles the impact');
    assert.equal(fx.particles.list.length, 86, 'the actual Plasma hit recipe supplies its rings, sparks, debris and stars');
    assert.equal(fx.fx.length, 6, 'a light, fan rays and four world lightning arcs');
    assert.equal(fx.wheelFx.length, 9, 'seven wheel bolts, glowing cracks and a glow spot');
    const rings = fx.particles.list.filter((p: Live) => p.k === 9).map((p: Live) => p.color);
    assert.deepEqual(rings, ['255,226,65', '255,255,255', '211,155,10'], 'the three Plasma rings are yellow, white and gold');
    const shot = game.items.find((i: Live) => i.type === 'bullet');
    assert.ok(shot?.busterPellet, 'the real scored round remains as a yellow orb');
    assert.ok(shot.hideArt, 'there is no duplicate generic bullet');
    const localAngle = shot.angle;
    game.rot = 0.8;
    paint.length = 0; game.drawBusterWheelPellets(ctx, game.level.radius);
    assert.ok(paint.filter(call => call === 'drawImage').length >= 3, 'gold halo and core are actually drawn on the wheel');
    assert.equal(shot.angle, localAngle, 'the saved local angle stays attached while the wheel rotates');

    game.rot = 0; game.cooldown = 0; game.reloadT = 0; game.shoot();
    for (let i = 0; i < 180 && game.projs.length && game.state === 'play'; i++) game.update(1 / 60);
    assert.equal(game.state, 'fail', 'a later shot still collides with the embedded round');
    assert.equal(game.stuck, 1, 'the visual never creates a duplicate scoring object');
  } finally { game.destroy(); }
});

test('the blue charged blasts remain blue impacts and do not leave the yellow tap orb', () => {
  for (const charge of [1, 2]) {
    const game = stage('classic');
    try {
      land(game, charge);
      assert.equal(game.stuck, 1);
      assert.equal(game.score, charge === 2 ? 8 : 4);
      assert.ok(!game.items.some((i: Live) => i.busterPellet), 'only the uncharged yellow pellet sticks as a gold orb');
      assert.ok(!game.s7State?.busy, 'charged blue impacts never emit the yellow Plasma burst');
      assert.ok(game.s11State.raw.embeds.length > 0, 'the charged shot keeps its authored marks');
    } finally { game.destroy(); }
  }
});

test('gold tap marks follow the Boss and each solid special surface', () => {
  for (const mode of ['boss', 'boulder', 'bonus', 'treasure'] as const) {
    const game = stage(mode);
    try {
      land(game);
      assert.equal(game.s7State.fx.length, 6, `${mode} gets the world-space Plasma explosion`);
      assert.equal(game.s7State.wheelFx.length, mode === 'boss' ? 9 : 0,
        `${mode} uses wheel-local lightning only when it actually has a wheel`);
      if (mode === 'boss') {
        assert.equal(game.stuck, 1); assert.equal(game.score, 2);
        assert.ok(game.items.some((i: Live) => i.busterPellet));
        paint.length = 0; game.drawBusterWheelPellets(ctx, game.level.radius);
        assert.ok(paint.includes('drawImage'), 'Boss uses the visible golden orb too');
      } else {
        const shots = [...game.rockBullets, ...game.chestBullets, ...game.fallenCells.flatMap((cell: Live) => cell.bullets)];
        const shot = shots.find((s: Live) => s.busterPellet);
        assert.ok(shot, `${mode} records the yellow pellet on the struck surface or detached cell`);
        paint.length = 0; game.drawEmbeddedShot(ctx, shot, 0, 0, 7);
        assert.ok(paint.filter(call => call === 'drawImage').length >= 3, `${mode} paints the shared glow and core`);
        if (mode === 'treasure') assert.ok(game.treasureCoins.length > 0, 'treasure still releases its collectible reward');
        else assert.ok(game.score > 0, `${mode} still scores its hit`);
      }
    } finally { game.destroy(); }
  }
});

test('yellow marks stay bounded, clear with their stage and survive normal wheel break animation', () => {
  const game = stage('classic');
  try {
    land(game);
    game.clearLevel();
    assert.ok(game.flyers.some((f: Live) => f.busterPellet), 'the orb travels with its broken wheel piece');
    game.startAtLevel(2);
    assert.equal(game.items.filter((i: Live) => i.busterPellet).length, 0, 'new stages clear the old orb');
    assert.equal(game.flyers.filter((f: Live) => f.busterPellet).length, 0, 'no old flying orb survives the level reset');
  } finally { game.destroy(); }
});

test('twin Mega Busters leave one glowing mark per barrel without extra scoring', () => {
  const game = stage('classic');
  try {
    game.twinGuns = true; game.shoot();
    assert.equal(game.projs.length, 2, 'one real shot per barrel');
    for (let i = 0; i < 180 && game.projs.length && game.state === 'play'; i++) game.update(1 / 60);
    assert.equal(game.state, 'play');
    assert.equal(game.stuck, 2);
    assert.equal(game.items.filter((i: Live) => i.busterPellet).length, 2);
    assert.equal(game.score, 4);
  } finally { game.destroy(); }
});

test('Mini and Giant buffs scale the stuck yellow pellet with its real shot', () => {
  for (const [buff, scale] of [['mini', 0.65], ['giant', 1.8]] as const) {
    const game = stage('treasure');
    try {
      game.treasureBuff = buff;
      land(game);
      const shot = game.chestBullets.find((s: Live) => s.busterPellet);
      assert.equal(shot?.scale, scale, `${buff} retains its projectile size when attached`);
    } finally { game.destroy(); }
  }
});

test('gold flight motes use a bounded world-time rate at 30–144 Hz', async () => {
  const { busterWeapon } = await import('../games/game-8/src/game/weapons/icons.ts');
  for (const hz of [30, 60, 90, 120, 144]) {
    let spawned = 0, projectile: Live | undefined;
    const host = {
      muzzlePos: () => ({ x: 0, y: 0 }), muzzleFlash: () => undefined, ring: () => undefined,
      light: () => undefined, addProj: (p: Live) => { projectile = p; }, spawn: () => { spawned++; },
    };
    busterWeapon.onRelease!(host as never, { data: {} } as never, 0);
    assert.ok(projectile?.update);
    for (let i = 0; i < hz; i++) projectile.update(host, 1 / hz, projectile);
    assert.equal(spawned, 22, `${hz} Hz produces the same 22 motes per game second`);
    const before = spawned;
    projectile.update(host, 1, projectile);
    assert.ok(spawned - before <= 3, 'a stalled frame cannot emit an unbounded backlog');
  }
});


test('repeated Plasma-style impacts stay bounded and expire rather than accumulating', () => {
  const game = stage('classic');
  try {
    // The callback is visual-only: repeatedly invoke it at Buster's 0.13s
    // cadence without adding fake score, collision objects or ammo consumption.
    const host = game.s11.raw;
    assert.ok(host.busterPlasmaImpact);
    let peakParticles = 0, peakWorld = 0, peakWheel = 0;
    for (let i = 0; i < 2400; i++) {
      if (i % 8 === 0) host.busterPlasmaImpact(210, 280);
      game.update(1 / 60);
      const fx = game.s7State;
      peakParticles = Math.max(peakParticles, fx.particles.list.length);
      peakWorld = Math.max(peakWorld, fx.fx.length);
      peakWheel = Math.max(peakWheel, fx.wheelFx.length);
    }
    assert.ok(peakParticles <= 400, `particle budget stayed bounded (${peakParticles})`);
    assert.ok(peakWorld < 40 && peakWheel < 90, `short-lived world/wheel FX stayed bounded (${peakWorld}/${peakWheel})`);
    assert.equal(game.score, 0); assert.equal(game.stuck, 0);
    for (let i = 0; i < 180; i++) game.update(1 / 60);
    assert.equal(game.s7State.particles.list.length, 0);
    assert.equal(game.s7State.fx.length, 0); assert.equal(game.s7State.wheelFx.length, 0);
  } finally { game.destroy(); }
});

test('the standalone Buster has a yellow Plasma fallback and does not double the hosted burst', async () => {
  const { busterWeapon } = await import('../games/game-8/src/game/weapons/icons.ts');
  for (const hosted of [false, true]) {
    let projectile: Live | undefined;
    const calls: string[] = [];
    const host: Live = {
      muzzlePos: () => ({ x: 0, y: 0 }), muzzleFlash: () => {}, ring: () => calls.push('ring'),
      light: () => {}, addProj: (p: Live) => { projectile = p; }, normalAt: () => Math.PI / 2,
      hit: () => calls.push('hit'), addEmbed: () => calls.push('embed'), glow: () => calls.push('glow'),
      burst: () => calls.push('burst'), lightning: () => calls.push('lightning'), addFx: () => calls.push('rays'),
    };
    if (hosted) host.busterPlasmaImpact = () => { calls.push('host'); return true; };
    busterWeapon.onRelease!(host as never, { data: {} } as never, 0);
    calls.length = 0;
    projectile!.onHit(host, 210, 280, projectile);
    assert.equal(calls.filter(c => c === 'hit').length, 1);
    assert.equal(calls.filter(c => c === 'embed').length, 1);
    if (hosted) {
      assert.deepEqual(calls, ['hit', 'embed', 'host'], 'no old starburst or duplicate rings over the shared Plasma hit');
    } else {
      assert.equal(calls.filter(c => c === 'ring').length, 3);
      assert.equal(calls.filter(c => c === 'lightning').length, 4);
      assert.ok(calls.includes('glow') && calls.includes('rays') && calls.includes('burst'));
    }
  }
});

test('wheel and Boss orbs draw after the slide-11 scorch in the captured wheel transform', () => {
  for (const mode of ['classic', 'boss'] as const) {
    const game = stage(mode);
    try {
      land(game);
      const matrix = {}; capturedTransform = matrix;
      const originalWheel = game.s11State.drawWheel.bind(game.s11State);
      const originalPellets = game.drawBusterWheelPellets.bind(game);
      game.s11State.drawWheel = (...args: unknown[]) => { paint.push('slide11-wheel'); originalWheel(...args); };
      game.drawBusterWheelPellets = (...args: unknown[]) => { paint.push('buster-orbs'); originalPellets(...args); };
      paint.length = 0; game.render();
      const wheel = paint.indexOf('slide11-wheel'), orb = paint.indexOf('buster-orbs');
      assert.ok(wheel >= 0 && orb > wheel, `${mode} glow is not hidden by the later scorch`);
      assert.ok(paint.indexOf('wheel-transform-restored') > wheel, `${mode} uses the captured rotating and breathing target frame`);
    } finally { capturedTransform = undefined; game.destroy(); }
  }
});
