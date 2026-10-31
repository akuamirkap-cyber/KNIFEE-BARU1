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
  assert.match(game, /this\.bossArtProfile = this\.level\.boss && this\.wheelImage \? this\.sampleArtProfile\(this\.wheelImage\) : null;/);
  assert.match(game, /private bossRadiusAt\(localAngle: number, radius = this\.level\.radius\): number \{/);
  // Every gameplay hit / placement site goes through that one helper.
  assert.doesNotMatch(game, /this\.level\.boss\s*\?\s*getExactBossRadius/);
  assert.ok(
    (game.match(/this\.bossRadiusAt\(/g) ?? []).length >= 10,
    'all boss collision sites read the artwork contour',
  );
  const processor = read('src/games/gunhit/game/bossAssetProcessor.ts');
  assert.match(processor, /Math\.max\(targetRadius \* 0\.3, asset\.radii\[deg\] \* scale\)/);
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

test('gameplay coins and diamonds wear the menu wallet art', () => {
  const game = read('src/games/gunhit/game/Game.ts');
  const wallet = read('src/games/shared/walletArt.ts');
  assert.match(game, /import \{ drawWalletCoin \} from '\.\.\/\.\.\/shared\/walletArt';/);
  assert.match(game, /drawWalletCoin\(c, 0, 0, CLASSIC_COIN_RADIUS, Math\.abs\(Math\.cos\(t \* 3\)\) \* 0\.6 \+ 0\.4, glowing\)/);
  assert.doesNotMatch(game, /drawBreakerCoin/);
  // Same diamond the armory's DiamondSprite draws.
  assert.match(game, /drawBreakerDiamond\(c, 0, -D_SIZE \* 0\.52, t, 0\.22\)/);
  assert.match(wallet, /export function drawWalletCoinsGlyph/);
  assert.match(wallet, /#fde047/);
  assert.match(wallet, /#f59e0b/);
  assert.match(wallet, /#451a03/);
  const arsenal = read('src/games/gunhit/components/Arsenal.tsx');
  assert.match(arsenal, /from-yellow-300 to-amber-500/, 'the wallet badge keeps the same two colours');
  assert.match(arsenal, /<Coins className="h-4 w-4" \/>/);
});

test("the wheel sunburst is Gun Hit's warm stage light again", () => {
  const glow = read('src/games/gunhit/game/art/glowSprite.ts');
  const game = read('src/games/gunhit/game/Game.ts');
  assert.match(glow, /intensity = 1,\n\s+rgb = '255,255,255',/);
  assert.match(glow, /const sprites = getSunburstSprites\(rgb\);/);
  assert.match(game, /drawBehindWheelSunburst\(\s*c,\s*CX,\s*this\.targetY \+ wheelEntry\.offsetY,\s*R \* 1\.92,\s*this\.time,\s*0\.42 \* wheelEntry\.opacity,\s*specialRays\.rgb,/);
  assert.match(game, /const clearRays = getWheelSunburstTheme\(this\.level\.style\);/);
});
