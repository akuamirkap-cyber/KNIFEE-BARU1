import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { Game as GunHit } from '../src/games/gunhit/game/Game';
import { Game as RifleRock } from '../src/games/rifle-rock/game/engine';
import { GUN_SUNBURST_RGB, gunSunburstColor } from '../src/games/gunhit/game/sunburstPalette';
import { getWeapon, type Rarity } from '../src/games/gunhit/game/weapons';

test('Hub no longer embeds standalone iframe slides and renders only Slide 01 directly', () => {
  const app = fs.readFileSync(path.resolve(process.cwd(), 'src/App.tsx'), 'utf8');
  const iframeSlides = [...new Set([...app.matchAll(/games\/([a-z0-9-]+)\/index\.html/g)].map(m => m[1]))];
  assert.deepEqual(iframeSlides, []);
  assert.ok(!app.includes('<iframe'), 'hub must not render secondary game iframes');
});

test('Slides 02-05 and earlier extra slides are removed from the hub so only Slide 01 (gunhit) remains', () => {
  const root = process.cwd();
  const app = fs.readFileSync(path.join(root, 'src/App.tsx'), 'utf8');
  const vite = fs.readFileSync(path.join(root, 'vite.config.ts'), 'utf8');
  for (const id of ['obliterator', 'game1', 'game2', 'game4', 'game5', 'game6', 'game7', 'game8']) {
    assert.ok(!app.includes(`id: '${id}'`), `${id} must not be a hub slide`);
  }
  for (const dir of ['obliterator', 'game-1', 'game-5', 'game-7']) {
    assert.ok(!app.includes(`games/${dir}/`), `${dir} must not be loaded by the hub`);
    assert.ok(!vite.includes(`games/${dir}/`), `${dir} must not be a build input`);
    assert.ok(!fs.existsSync(path.join(root, 'games', dir)), `games/${dir} is deleted`);
  }
  for (const id of ['fireworkgun', 'rainbow', 'game-2', 'game-4', 'game-6', 'game-8']) {
    assert.ok(!app.includes(`id: '${id}'`), `${id} must not be a hub slide`);
    assert.ok(!app.includes(`games/${id}/`), `${id} must not be loaded by the hub`);
    assert.ok(!vite.includes(`games/${id}/`), `${id} must not be a build input`);
    assert.ok(!fs.existsSync(path.join(root, 'games', id, 'index.html')), `${id} must not ship a standalone page`);
  }
  assert.ok(!fs.existsSync(path.join(root, 'games/rainbow')));
  // Slide 01 (SGA) still drives the ported weapon/FX/audio modules from these folders.
  for (const rel of [
    'games/fireworkgun/src/game/engine.ts',
    'games/fireworkgun/src/game/sfx.ts',
    'games/game-2/src/weapons.ts',
    'games/game-4/src/game/weapons.ts',
    'games/game-6/src/game/weapons/index.ts',
    'games/game-8/src/game/weapons/index.ts',
  ]) {
    assert.ok(fs.existsSync(path.join(root, rel)), `keep ${rel}`);
  }
  assert.ok(app.includes('<GunHitGame introReady={hasBooted && !loading} />'), 'App renders GunHitGame directly with synchronized intro state');
  assert.ok(!app.includes('SLIDE 01'), 'outer hub slide chrome is removed for pure 9:16 mobile SGA');
  assert.ok(app.includes('baseWidth={420}'), '9:16 mobile portrait baseWidth is preserved');
  assert.ok(app.includes('baseHeight={760}'), '9:16 mobile portrait baseHeight is preserved');
});

test('Gun Hit tiers have their own FX Lab rays, including every equipped weapon', () => {
  const tiers: Rarity[] = ['UMUM', 'LANGKA', 'EPIC', 'LEGENDARIS'];
  assert.deepEqual(Object.keys(GUN_SUNBURST_RGB), tiers);
  assert.equal(new Set(tiers.map(gunSunburstColor)).size, 4);
  for (const id of ['pistol', 'plasma', 'cricket', 'golden'] as const) {
    const color = gunSunburstColor(getWeapon(id).rarity);
    assert.match(color, /^\d{1,3},\d{1,3},\d{1,3}$/);
  }
});

test('Gun Hit and Diamond Breaker cancel RAF on blur and schedule only on return', () => {
  const savedFrame = globalThis.requestAnimationFrame;
  const savedCancel = globalThis.cancelAnimationFrame;
  let frames = 0;
  const cancelled: number[] = [];
  globalThis.requestAnimationFrame = () => ++frames;
  globalThis.cancelAnimationFrame = (id) => { cancelled.push(id); };
  try {
    for (const GameEngine of [GunHit, RifleRock]) {
      // No DOM needed: setActive owns only the animation lifecycle. The
      // browser integration checks that each live canvas actually freezes.
      const engine = Object.create(GameEngine.prototype) as InstanceType<typeof GameEngine>;
      const state = engine as unknown as Record<string, unknown>;
      state.active = false;
      state.raf = 0;
      state.holding = true;
      state.firing = true;
      state.aiming = true;
      state.charging = true;
      let qualityPauses = 0;
      if (GameEngine === GunHit) state.adaptiveDpr = { pause: () => { qualityPauses++; } };

      engine.setActive(false);
      assert.equal(state.raf, 0);
      engine.setActive(true);
      const first = state.raf as number;
      assert.equal(first, frames);
      engine.setActive(true);
      assert.equal(frames, first, 'no second loop on redundant focus');
      engine.setActive(false);
      assert.ok(cancelled.includes(first));
      assert.equal(state.raf, 0);
      engine.setActive(false);
      assert.equal(cancelled.filter((id) => id === first).length, 1);
      engine.setActive(true);
      assert.equal(state.raf, first + 1, 'resuming creates one fresh loop');
      engine.setActive(false);
      if (GameEngine === GunHit) {
        assert.equal(state.holding, false);
        assert.equal(state.aiming, false);
        assert.equal(state.charging, false);
        assert.equal(qualityPauses, 2, 'frame-quality sampling resets on each actual pause');
      } else {
        assert.equal(state.firing, false);
      }
    }
  } finally {
    globalThis.requestAnimationFrame = savedFrame;
    globalThis.cancelAnimationFrame = savedCancel;
  }
});
