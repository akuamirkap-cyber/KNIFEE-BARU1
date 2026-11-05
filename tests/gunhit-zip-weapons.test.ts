import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { ZIP_ART, placeZipArt, inkHeight } from '../src/games/gunhit/zipWeapons/index.ts';
import { ZIP_WEAPON_IDS, hasZipArt } from '../src/games/gunhit/zipWeapons/ids.ts';

const ROOT = path.resolve(import.meta.dirname, '..');
const read = (file: string) => readFileSync(path.join(ROOT, file), 'utf8');

test('the zip’s five weapons are the game weapons with the same name', () => {
  const weapons = read('src/games/gunhit/game/weapons.ts');
  const expected: [string, string][] = [
    ['diamond', 'DIAMOND GUN'],
    ['blaster', 'WARS BLASTER'],
    ['paintball', 'PAINTBALL GUN'],
    ['shark', 'SHARK LAUNCHER'],
    ['heat_ray', 'MARTIAN HEAT-RAY'],
  ];
  for (const [id, name] of expected) {
    assert.ok(weapons.includes(`id: '${id}', name: '${name}'`), `${id} is still named ${name}`);
    assert.ok(hasZipArt(id), `${id} carries the zip art`);
  }
  assert.deepEqual([...ZIP_WEAPON_IDS].sort(), expected.map(([id]) => id).sort());
  assert.equal(hasZipArt('pistol'), false, 'every other weapon keeps its canvas art');
});

test('the shipped art is the zip’s own animated SVG, not a baked picture', () => {
  for (const id of ZIP_WEAPON_IDS) {
    const art = ZIP_ART[id];
    assert.ok(art.markup.startsWith('<svg'), `${id}: it is SVG`);
    assert.ok(art.markup.length > 10_000, `${id}: the whole artwork, not a placeholder`);
    // The animations live in the SVG's own <style>: that is what makes it move.
    assert.ok(art.markup.includes('<style>'), `${id}: it keeps its keyframes`);
    assert.match(art.markup, /@keyframes/, `${id}: the zip's animations are in the markup`);
    assert.ok(art.markup.includes('rotate(-45 256 256)'), `${id}: the barrel points up`);
    // No baked raster anywhere: no data: URLs, no <image>.
    assert.ok(!art.markup.includes('<image'), `${id}: still vector`);
    assert.ok(!art.markup.includes('data:image'), `${id}: no raster fallback`);
    // Ink + barrel tip, so every screen can place it without guessing.
    assert.ok(art.ink.y1 - art.ink.y0 > 300, `${id}: ink was measured`);
    assert.ok(art.ink.muzzleY <= art.ink.y0 + 4, `${id}: the muzzle is the top of the ink`);
  }
});

test('an anchor lands on the barrel tip, and the ink is exactly as tall as asked', () => {
  const art = ZIP_ART.diamond;
  const height = 185;
  const place = placeZipArt(art, height, 'muzzle');
  // The tip sits on the container's (0,0).
  const tipX = place.left + (art.ink.muzzleX + art.pad) * place.scale;
  const tipY = place.top + (art.ink.muzzleY + art.pad) * place.scale;
  assert.ok(Math.abs(tipX) < 1e-6, `barrel tip x ${tipX}`);
  assert.ok(Math.abs(tipY) < 1e-6, `barrel tip y ${tipY}`);
  // The ink spans exactly `height` px.
  assert.ok(Math.abs(inkHeight(art) * place.scale - height) < 1e-6);

  const centred = placeZipArt(art, 230, 'center');
  const cx = centred.left + ((art.ink.x0 + art.ink.x1) / 2 + art.pad) * centred.scale;
  const cy = centred.top + ((art.ink.y0 + art.ink.y1) / 2 + art.pad) * centred.scale;
  assert.ok(Math.abs(cx) < 1e-6 && Math.abs(cy) < 1e-6, 'the ink centre lands on the anchor');
});

test('the engine hands the zip weapon to the page instead of drawing it', () => {
  const game = read('src/games/gunhit/game/Game.ts');
  assert.ok(game.includes("import { hasZipArt } from '../zipWeapons/ids';"));
  assert.ok(game.includes('getZipGunFrame(): { x: number; y: number; rot: number; scale: number; hidden: boolean } | null {'));
  assert.ok(game.includes('const zipGun = hasZipArt(this.weapon.id);'));
  assert.ok(game.includes('? { x: this.gunX, y: y0, rot: this.gunTiltNow, scale: GAMEPLAY_GUN_SCALE, hidden: false }'));
  // Both the single and the twin-gun draw are skipped for these five.
  assert.ok(game.includes('if (zipGun) {\n        // Drawn by the page'));
  // The engine never imports the artwork itself: only the ids, so the 190 KB
  // chunk stays out of the engine bundle.
  assert.ok(!game.includes("from '../zipWeapons'"));
  const ids = read('src/games/gunhit/zipWeapons/ids.ts');
  assert.ok(!ids.includes('<svg'), 'the id module carries no markup');
});

test('the three screens all show the zip art', () => {
  const app = read('src/games/gunhit/App.tsx');
  const arsenal = read('src/games/gunhit/components/Arsenal.tsx');
  // Play: the page draws the gun on the engine's anchor.
  assert.ok(app.includes('<ZipWeaponOverlay'));
  assert.ok(app.includes('read={() => gameRef.current?.getZipGunFrame() ?? null}'));
  // Menu: the showcase canvas stays empty and the live SVG takes its place.
  assert.ok(app.includes('{hasZipArt(weapon) && <ZipWeaponArt id={weapon} height={300} anchor="center" className="pointer-events-none" />}'));
  assert.ok(app.includes('if (cv && hasZipArt(weapon)) {'));
  assert.ok(app.includes('if (hasZipArt(weapon)) return;'), 'the kept bitmap never replays an old gun');
  // Armory: thumbnail and spotlight.
  assert.ok(arsenal.includes('if (hasZipArt(weapon.id)) {'));
  assert.equal((arsenal.match(/<ZipWeaponArt /g) ?? []).length, 2);
});

test('the artwork is a lazy chunk, so the page still paints first', () => {
  const art = read('src/games/gunhit/components/ZipWeaponArt.tsx');
  assert.ok(art.includes("import('../zipWeapons')"), 'the markup is requested on demand');
  // Type-only imports are erased at build time; a value import would not be.
  assert.ok(!/^import (?!type )[^;]*from '\.\.\/zipWeapons'/m.test(art), 'nothing pulls the markup in statically');
  assert.ok(art.includes('dangerouslySetInnerHTML'), 'the SVG is mounted, not serialised to a bitmap');
  const vite = read('vite.config.ts');
  assert.ok(!/zipWeapons/.test(vite), 'the preload list does not drag it into the entry');
});

test('the play overlay is visible from its first frame, and only during a run', () => {
  const overlay = read('src/games/gunhit/components/ZipWeaponOverlay.tsx');
  // The element ships at opacity 0, so it is switched on every frame instead of
  // "when it changes" — a changed?-check left the gun invisible for a whole run.
  assert.ok(overlay.includes("el.style.opacity = visible ? '1' : '0';"));
  assert.ok(!/let shown\b/.test(overlay), 'no cached visibility flag to go stale');
  // And a pose the engine has not reported yet still stands the weapon up.
  assert.ok(overlay.includes('const pose = frame ?? STAND;'));
  assert.ok(overlay.includes('x: CX, y: GUN_Y, rot: 0, scale: GAMEPLAY_GUN_SCALE'));

  const app = read('src/games/gunhit/App.tsx');
  assert.ok(app.includes("screen === 'playing' && hasZipArt(weapon) && ("),
    'the overlay belongs to a run, not to the menu');

  const game = read('src/games/gunhit/game/Game.ts');
  assert.ok(game.includes("if (this.state === 'idle') return null;"),
    'a frame left over from the last run cannot float over the title screen');
});

test('the weapon also exists as a plain <img>, so it can never go missing', () => {
  const art = read('src/games/gunhit/components/ZipWeaponArt.tsx');
  // The same vector rides underneath as an image: identical pixels when the live
  // layer paints, and the weapon is still on screen if a device refuses it.
  assert.ok(art.includes('data:image/svg+xml;charset=utf-8,'));
  assert.ok(art.includes('<img src={still}'));
  assert.ok(art.includes('dangerouslySetInnerHTML'), 'the animated copy is still mounted');
});

test('the zip weapons fill the frame like a rifle, not a pistol', () => {
  const overlay = read('src/games/gunhit/components/ZipWeaponOverlay.tsx');
  assert.ok(overlay.includes('export const ZIP_GUN_INK_HEIGHT = 250;'));
  const app = read('src/games/gunhit/App.tsx');
  assert.ok(app.includes('height={300} anchor="center"'), 'the menu showcase scales up with it');
  const arsenal = read('src/games/gunhit/components/Arsenal.tsx');
  assert.ok(arsenal.includes('height={size * 0.92}'));
  assert.ok(arsenal.includes('height={box.h * 0.92}'));
});

test('Diamond Gun keeps its round on the muzzle, and fires it', () => {
  const overlay = read('src/games/gunhit/components/ZipWeaponOverlay.tsx');
  assert.ok(overlay.includes("{id === 'diamond' && <MuzzleGem innerRef={gemRef} />}"));
  assert.ok(overlay.includes('function MuzzleGem('));
  // Gone for a beat after the shot, then grown back on the muzzle.
  assert.ok(overlay.includes('const since = performance.now() - (readShotAt?.() ?? 0);'));
  assert.ok(overlay.includes('const back = since < 90 ? 0 : since < 320 ? (since - 90) / 230 : 1;'));
  const app = read('src/games/gunhit/App.tsx');
  assert.ok(app.includes('zipMuzzleShotAtRef.current = performance.now();'), 'the shot timestamp comes from the engine');
  assert.ok(app.includes('readShotAt={() => zipMuzzleShotAtRef.current}'));
});
