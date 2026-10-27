import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { Game as GunHit } from '../src/games/gunhit/game/Game';
import { Game as RifleRock } from '../src/games/rifle-rock/game/engine';
import { GUN_SUNBURST_RGB, gunSunburstColor } from '../src/games/gunhit/game/sunburstPalette';
import { getWeapon, type Rarity } from '../src/games/gunhit/game/weapons';

test('Every iframe slide game has its own index.html, main.tsx, and App.tsx so it never falls back to root index.html', () => {
  // Every game page the hub embeds, read from the hub itself.
  const app = fs.readFileSync(path.resolve(process.cwd(), 'src/App.tsx'), 'utf8');
  const iframeSlides = [...new Set([...app.matchAll(/games\/([a-z0-9-]+)\/index\.html/g)].map(m => m[1]))];
  assert.deepEqual(iframeSlides, ['game-2', 'game-4', 'game-6', 'game-8']);
  for (const id of iframeSlides) {
    const dir = path.resolve(process.cwd(), 'games', id);
    const htmlPath = path.join(dir, 'index.html');
    const mainPath = path.join(dir, 'src', 'main.tsx');
    const appPath = path.join(dir, 'src', 'App.tsx');
    assert.ok(fs.existsSync(htmlPath), `Missing ${htmlPath}`);
    assert.ok(fs.existsSync(mainPath), `Missing ${mainPath}`);
    assert.ok(fs.existsSync(appPath), `Missing ${appPath}`);
    const html = fs.readFileSync(htmlPath, 'utf8');
    assert.ok(new RegExp(`src=["'](\\./|/games/${id}/)src/main\\.tsx["']`).test(html), `${id} loads its own main.tsx`);
  }
});

test('Firework 8-Gun, Rainbow Gun, Obliterator Hit, Weapon Hit Arena, Neon Ballistics and Ballistics Lab are gone from the hub and the rest is renumbered 01-05', () => {
  const root = process.cwd();
  const app = fs.readFileSync(path.join(root, 'src/App.tsx'), 'utf8');
  const vite = fs.readFileSync(path.join(root, 'vite.config.ts'), 'utf8');
  for (const id of ['obliterator', 'game1', 'game5', 'game7']) {
    assert.ok(!app.includes(`id: '${id}'`), `${id} must not be a hub slide`);
  }
  // Nothing imports Obliterator Hit, Weapon Hit Arena, Neon Ballistics or
  // Ballistics Lab: all four folders are gone.
  for (const dir of ['obliterator', 'game-1', 'game-5', 'game-7']) {
    assert.ok(!app.includes(`games/${dir}/`), `${dir} must not be loaded by the hub`);
    assert.ok(!vite.includes(`games/${dir}/`), `${dir} must not be a build input`);
    assert.ok(!fs.existsSync(path.join(root, 'games', dir)), `games/${dir} is deleted`);
  }
  for (const id of ['fireworkgun', 'rainbow']) {
    assert.ok(!app.includes(`id: '${id}'`), `${id} must not be a hub slide`);
    assert.ok(!app.includes(`games/${id}/`), `${id} must not be loaded by the hub`);
    assert.ok(!vite.includes(`games/${id}/`), `${id} must not be a build input`);
    assert.ok(!fs.existsSync(path.join(root, 'games', id, 'index.html')), `${id} must not ship a page`);
  }
  assert.ok(!fs.existsSync(path.join(root, 'games/rainbow')));
  // SGA's "Firework" card still plays slide 2's own sound engine, and its
  // parity test still drives slide 2's own engine: those two files stay.
  for (const file of ['engine.ts', 'sfx.ts']) {
    assert.ok(fs.existsSync(path.join(root, 'games/fireworkgun/src/game', file)), `keep games/fireworkgun/src/game/${file}`);
  }
  const numbers = [...app.matchAll(/slideNumber: (\d+),/g)].map(m => Number(m[1]));
  assert.deepEqual(numbers, [1, 2, 3, 4, 5]);
  const ids = [...app.matchAll(/\n      id: '([a-z0-9]+)',\n      slideNumber:/g)].map(m => m[1]);
  assert.deepEqual(ids, ['gunhit', 'game2', 'game4', 'game6', 'game8']);
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
      } else {
        assert.equal(state.firing, false);
      }
    }
  } finally {
    globalThis.requestAnimationFrame = savedFrame;
    globalThis.cancelAnimationFrame = savedCancel;
  }
});
