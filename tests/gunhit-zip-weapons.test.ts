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

test('the engine hands the zip weapon to the page only on its own card', () => {
  const game = read('src/games/gunhit/game/Game.ts');
  assert.ok(game.includes("import { hasZipArt } from '../zipWeapons/ids';"));
  assert.ok(game.includes('getZipGunFrame(): { x: number; y: number; rot: number; scale: number; hidden: boolean } | null {'));
  // The zip art is a design card of its own: on every other card the gun is
  // ordinary canvas art, so picking a design really changes the weapon.
  assert.ok(game.includes("const zipGun = hasZipArt(this.weapon.id) && this.zipCardLive;"));
  assert.ok(game.includes("return hasZipArt(this.weapon.id) && getGunVariant(this.weapon.id) === 'zip';"));
  // The page draws the gun, so the shot's kick has to ride along with the pose,
  // and the zip's own page kicks hard: the gun travels down the barrel axis,
  // tips back and punches out.
  assert.ok(game.includes('y: y0 + this.recoil * zipKick(this.weapon.id).y,'));
  assert.ok(game.includes('rot: this.gunTiltNow + this.recoil * zipKick(this.weapon.id).rot,'));
  assert.ok(game.includes('scale: GAMEPLAY_GUN_SCALE * (1 + this.recoil * zipKick(this.weapon.id).punch),'));
  assert.ok(game.includes('x: this.gunX,') && game.includes('scale: GAMEPLAY_GUN_SCALE * (1 + this.recoil * zipKick(this.weapon.id).punch),'));
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
  // Menu: on the zip card the showcase canvas stays empty and the live SVG takes
  // its place; on any other card the canvas draws that card's own art.
  assert.ok(app.includes('{zipCardWeapon === weapon && <ZipWeaponArt id={weapon} height={300} anchor="center" className="pointer-events-none" />}'));
  assert.ok(app.includes('if (cv && zipCardWeapon === weapon) {'));
  assert.ok(app.includes('if (zipCardWeapon === weapon) return;'), 'the kept bitmap never replays an old gun');
  // Armory: thumbnail and spotlight, each on the zip card alone.
  assert.equal((arsenal.match(/if \(hasZipArt\(weapon\.id\) && variant === 'zip'\)/g) ?? []).length, 2);
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
  assert.ok(app.includes("screen === 'playing' && hasZipArt(weapon) && zipCardWeapon === weapon && ("),
    'the overlay belongs to a run on the zip card, not to the menu or another card');
  // The zip's own one-shot fire animation is re-applied on every shot: without
  // it a shot only slid the gun back, with no flash at all.
  assert.ok(overlay.includes('svg.classList.add(fireClass);'));
  assert.ok(overlay.includes('window.setTimeout(() => svg.classList.remove(fireClass), ZIP_FIRE_MS);'));

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

test('the Diamond Gun’s round sits ON the muzzle crystal, not beside it', () => {
  // The overlay is anchored on the barrel tip, so the round has to be placed in
  // that same space. It used to sit at the overlay's origin (up and to the
  // right of the muzzle), which left a second bright diamond floating next to
  // the crystal — and the crystal itself still dark navy underneath.
  const overlay = read('src/games/gunhit/components/ZipWeaponOverlay.tsx');
  assert.ok(overlay.includes('const MUZZLE_GEM_CENTRE = { x: 0.25, y: 28.04 };'),
    'the round is centred on the muzzle crystal');
  assert.ok(overlay.includes('left: MUZZLE_GEM_CENTRE.x - half'),
    'and drawn around it, not at 0,0');
  assert.ok(!overlay.includes('style={{ left: -3, top: -7, width: 44, height: 44'),
    'the detached gem box is gone');

  // Work the placement out from the artwork, so the numbers cannot drift apart:
  // the crystal is drawn at (304,-7) in the zip's arm-local units.
  const art = ZIP_ART.diamond;
  const height = 250;
  const scale = height / inkHeight(art);
  const rot = (deg: number, x: number, y: number): [number, number] => {
    const a = (deg * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
    return [c * x - s * y, s * x + c * y];
  };
  const place = ([x0, y0]: [number, number]): [number, number] => {
    // g translate(238 270) rotate(-45) scale(0.87), inside rotate(-45 256 256)
    const [sx, sy] = rot(-45, x0 * 0.87, y0 * 0.87);
    const arm: [number, number] = [sx + 238 - 256, sy + 270 - 256];
    const [rx, ry] = rot(-45, arm[0], arm[1]);
    return [rx + 256, ry + 256];
  };
  const crystal = place([304, -7]);
  const centre = { x: (crystal[0] - art.ink.muzzleX) * scale, y: (crystal[1] - art.ink.muzzleY) * scale };
  assert.ok(Math.abs(centre.x - 0.25) < 0.5 && Math.abs(centre.y - 28.04) < 0.6,
    `the round is centred on the crystal (got ${centre.x.toFixed(2)}, ${centre.y.toFixed(2)})`);
});

test('the muzzle crystal is bright, with no dark-navy facets left on it', () => {
  const markup = ZIP_ART.diamond.markup;
  const muzzle = markup.slice(markup.indexOf('<g class="zip-muzzle-round">'));
  const crystal = muzzle.slice(0, muzzle.indexOf('</g>'));
  for (const dark of ['#1c55d8', '#0b3097', '#2f77ea']) {
    assert.ok(!crystal.includes(dark), `${dark} was one of the muzzle crystal's faces`);
  }
  // The crown's faces are the bright ice/azure the design card shows.
  for (const bright of ['#f0fbff', '#fdfeff', '#4fc3ff', '#93ddff', '#b5ebff']) {
    assert.ok(crystal.includes(bright), `${bright} paints the crystal`);
  }
});

test('each zip weapon fires its own round — only the Diamond Gun fires diamonds', () => {
  // The round belongs to the gun that fires it: a Wars Blaster that carried the
  // Diamond Gun's ice crystal around was the bug this pins.
  const fx = read('src/games/gunhit/game/zipShotFx.ts');
  for (const id of ['blaster', 'paintball', 'shark', 'heat_ray']) {
    assert.ok(fx.includes(`id === '${id}'`), `${id} has a round of its own`);
  }
  assert.ok(fx.includes('else drawSlide2DiamondBullet(c, r, t, seed, flash);'),
    'the Diamond Gun is the only one that falls through to the faceted crystal');
  // The engine hands the round the gun it was fired from.
  const proj = read('src/games/gunhit/game/art/projectiles.ts');
  assert.ok(proj.includes('embedded, kind, gunState.tint)'),
    'the painter knows which gun fired, and the shot paint for a paint ball');
  // The effect card's trail follows the round's own colour.
  const card = read('src/games/gunhit/components/ShotEffectCanvas.tsx');
  assert.ok(card.includes('zipRoundPaint(weapon.id).glow'));
});

test('the Martian Heat-Ray stands upright and fires Martian green', () => {
  // The zip drew its heatray at 35.5° inside its own 45° tilt, so the staff
  // leaned 9.5° off the barrel the game stands up. 45 cancels it exactly.
  const ray = read('src/games/gunhit/zipWeapons/martianHeatray.ts');
  assert.ok(ray.includes('rotate(45) scale(1.05)'), 'the head sits on the barrel axis');
  const pose = ray.slice(ray.indexOf('export const markup'));
  assert.ok(!pose.includes('rotate(35.5)'), 'the leaning pose is gone');
  // Its shot is tinted with the artwork's own lime, not slide 6's mint or fire red.
  const six = read('src/games/gunhit/game/setSixFx.ts');
  assert.ok(six.includes("const LIME = '141,255,59';"), 'the lime comes from #8dff3b');
  assert.ok(six.includes('case \'tripod\':'));
  const paint = six.slice(six.indexOf('const LIME ='));
  assert.ok(!paint.includes("'90,255,120'"), 'the mint green is no longer painted');
  const round = read('src/games/gunhit/game/zipShotFx.ts');
  assert.ok(round.includes("heat_ray: { core: '#f6ffe8', hot: '#b6ff5a', deep: '#4fbf18', glow: '141,255,59' }"),
    'the Heat-Ray round is the same lime');
});
