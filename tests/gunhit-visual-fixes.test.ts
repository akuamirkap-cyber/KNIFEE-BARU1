import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { createCanvas } from '@napi-rs/canvas';

const read = (file: string) => readFileSync(path.join(process.cwd(), file), 'utf8');

test('the menu frame is the only weapon in the air: the live gun waits for it to land', () => {
  const app = read('src/games/gunhit/App.tsx');
  const game = read('src/games/gunhit/game/Game.ts');
  const flight = read('src/games/gunhit/components/SgaWeaponFlight.tsx');

  // One duration, shared by the DOM flight and the canvas gun.
  assert.match(flight, /export const WEAPON_FLIGHT_MS = 780;/);
  assert.match(flight, /duration: WEAPON_FLIGHT_MS/);
  assert.match(app, /import SgaWeaponFlight, \{ WEAPON_FLIGHT_MS/);
  assert.match(app, /const gunHiddenFor = wantsWeaponFlight \? WEAPON_FLIGHT_MS \/ 1000 : 0;/);
  // The bitmap is removed the moment it lands, so nothing rests on the gun.
  assert.match(app, /deferPageClose\(mountAt \+ WEAPON_FLIGHT_MS \+ 24, \(\) => setWeaponFlight\(null\)\)/);
  assert.match(app, /startAtLevel\(level, wantsWeaponFlight, gunEntryDelay, true, wheelEntryDelay, gunHiddenFor\)/);
  assert.match(app, /startSpecialStage\(specialMode, gunEntryDelay, true, wheelEntryDelay, gunHiddenFor, wantsWeaponFlight\)/);

  // The canvas keeps that clock and paints no gun while it runs.
  assert.match(game, /private gunHiddenT = 0;/);
  assert.match(game, /this\.gunHiddenT = weaponHandoff && !reducedMotion \? Math\.max\(0, gunHiddenFor\) : 0;/);
  assert.match(game, /if \(this\.gunHiddenT > 0\) this\.gunHiddenT = Math\.max\(0, this\.gunHiddenT - dt\);/);
  assert.match(game, /private drawGunNow\(c: CanvasRenderingContext2D\) \{\n\s+\/\/[^\n]*\n\s+if \(this\.gunHiddenT > 0\) return;/);
});

test('no circular shadow is drawn under the weapon', () => {
  const game = read('src/games/gunhit/game/Game.ts');
  const eleven = read('src/games/gunhit/game/setElevenArt.ts');
  // The slide-9 pedestal disc and its rim ring are gone.
  assert.doesNotMatch(game, /#121824/);
  assert.doesNotMatch(game, /rgba\(150,200,255,0\.3\)/);
  // The keris contact ellipse is gone too.
  assert.doesNotMatch(game, /if \(this\.weapon\.id === 'keris' && !s3Art\) \{/);
  // Slide 11's stock shadow is gone.
  assert.doesNotMatch(eleven, /rgba\(0,0,0,\.45\)/);
});

test('the boss hit surface is sampled from the artwork on screen, never a circle', () => {
  const game = read('src/games/gunhit/game/Game.ts');
  assert.match(game, /private bossArtProfile: number\[\] \| null = null;/);
  // The contour is read back from the very canvas the renderer blits, so it
  // follows Game B's raster and this file's fallback face alike.
  assert.match(game, /this\.bossArtProfile = readable && mask \? maskProfile\(mask\) : null;/);
  assert.match(game, /private bossRadiusAt\(localAngle: number, radius = this\.level\.radius\): number \{/);
  // Every gameplay hit / placement site goes through that one helper.
  assert.doesNotMatch(game, /this\.level\.boss\s*\?\s*getExactBossRadius/);
  assert.ok(
    (game.match(/this\.bossRadiusAt\(/g) ?? []).length >= 10,
    'all boss collision sites read the artwork contour',
  );
  // There is no Game A boss asset/contour processor left to fall back to: the
  // silhouette comes from the head art on screen, and nowhere else.
  assert.ok(!game.includes('getExactBossRadius'), 'no legacy radial boss table');
  assert.ok(!game.includes('bossAssetProcessor'), 'no legacy boss asset pipeline');
  assert.match(game, /private ensureArtMask\(\): ArtMask \| null \{/, 'the mask is rebuilt from the live artwork');
});

test('the alpha contour of a cut-out head follows its shape instead of filling a circle', () => {
  const size = 200;
  const canvas = createCanvas(size, size);
  const c = canvas.getContext('2d');
  // A wide hat with a short chin: nothing about this is a circle.
  c.fillStyle = '#123456';
  c.beginPath();
  c.moveTo(10, 100);
  c.lineTo(100, 20);
  c.lineTo(190, 100);
  c.lineTo(112, 132);
  c.lineTo(88, 132);
  c.closePath();
  c.fill();
  const pixels = c.getImageData(0, 0, size, size);
  // Same normalisation the game uses (radius of the box = 100 units).
  const radii: number[] = [];
  for (let deg = 0; deg < 360; deg++) {
    const rad = (deg * Math.PI) / 180;
    let outer = 0;
    for (let r = 99; r >= 2; r--) {
      const px = Math.round(100 + Math.cos(rad) * r);
      const py = Math.round(100 + Math.sin(rad) * r);
      if (pixels.data[(py * size + px) * 4 + 3] > 16) { outer = r; break; }
    }
    radii.push(outer / 100);
  }
  const at = (deg: number) => radii[deg];
  assert.ok(at(270) > 0.6, 'the hat brim reaches far up');
  assert.ok(at(90) < 0.4, 'the chin sits much closer to the centre');
  assert.ok(Math.abs(at(0) - at(90)) > 0.4, 'the contour is not a fixed radius');
  assert.ok(Math.max(...radii) - Math.min(...radii) > 0.3, 'the contour is a silhouette, not a circle');
});

test('every coin and diamond in Game A is the Diamond Breaker art', () => {
  const game = read('src/games/gunhit/game/Game.ts');
  const arsenal = read('src/games/gunhit/components/Arsenal.tsx');
  const sprite = read('src/games/shared/CoinSprite.tsx');
  const diamondSprite = read('src/games/shared/DiamondSprite.tsx');

  // HUD + every board pickup use the breaker coin, and nothing else.
  assert.match(game, /import \{ drawBreakerCoin \} from '\.\.\/\.\.\/shared\/coinArt';/);
  assert.match(game, /drawBreakerCoin\(c, 0, 0, CLASSIC_COIN_RADIUS, t, 0, Math\.abs\(Math\.cos\(t \* 3\)\) \* 0\.6 \+ 0\.4, glowing\)/);
  assert.doesNotMatch(game, /drawWalletCoin/);
  // The board diamond is the Diamond Breaker gem.
  assert.match(game, /drawBreakerDiamond\(c, 0, -D_SIZE \* 0\.52, t, 0\.22\)/);

  // The shared sprites the DOM HUD, quest modal, result card and wallet use.
  assert.match(sprite, /import \{ drawBreakerCoin \} from '\.\/coinArt';/);
  assert.match(diamondSprite, /import \{ drawBreakerDiamond \} from '\.\/diamondArt';/);

  // The armory wallet is the same coin now, not a second icon — and it keeps
  // the menu HUD's scale (25 px coin / 24 px diamond), not a smaller copy.
  assert.match(arsenal, /<CoinSprite size=\{25\}/);
  assert.match(arsenal, /<DiamondSprite size=\{24\} \/>/);
  assert.doesNotMatch(arsenal, /\bCoins\b/);

  // No emoji stand-ins left wherever a coin or diamond is used as an icon.
  const settings = read('src/games/gunhit/components/SgaSettingsPanel.tsx');
  const picker = read('src/games/gunhit/components/WeaponPicker.tsx');
  assert.match(settings, /<CoinSprite size=\{22\} \/><span className="mt-1 block font-title text-\[9px\] text-amber-100">BONUS · 4<\/span>/);
  assert.doesNotMatch(settings, /🪙/);
  assert.match(picker, /if \(id === 'coingun'\) return <CoinSprite size=\{size\}/);
  assert.match(picker, /if \(id === 'diamond'\) return <DiamondSprite size=\{size\}/);
  assert.doesNotMatch(picker, /\{w\.emoji\}|\{x\.emoji\}/);
});

test("the wheel sunburst is Gun Hit's warm stage light again", () => {
  const glow = read('src/games/gunhit/game/art/glowSprite.ts');
  const game = read('src/games/gunhit/game/Game.ts');
  assert.match(glow, /intensity = 1,\n\s+rgb = '255,255,255',/);
  assert.match(glow, /const sprites = getSunburstSprites\(rgb\);/);
  assert.match(game, /drawBehindWheelSunburst\(\s*c,\s*CX,\s*this\.targetY \+ wheelEntry\.offsetY,\s*R \* 1\.92,\s*this\.time,\s*0\.42 \* wheelEntry\.opacity,\s*specialRays\.rgb,/);
  assert.match(game, /const clearRays = getWheelSunburstTheme\(this\.level\.style\);/);
});
