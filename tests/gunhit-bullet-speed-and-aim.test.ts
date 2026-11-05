import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { installCanvasShim } from './supportCanvas';
import { installSilentAudio } from '../tools/supportAudioSilent';
import {
  BULLET_SPEED_MAX,
  BULLET_SPEED_MIN,
  BULLET_SPEED_STORAGE_KEY,
  DEFAULT_BULLET_SPEED,
  formatBulletSpeed,
  getSavedBulletSpeed,
  normalizeBulletSpeed,
  setSavedBulletSpeed,
  subscribeBulletSpeed,
} from '../src/games/gunhit/game/bulletSpeed';
import { getWeapon } from '../src/games/gunhit/game/weapons';

installCanvasShim();
const env = globalThis as unknown as Record<string, unknown> & { window: Record<string, unknown> };
env.window = Object.assign(env.window ?? {}, {
  setTimeout, clearTimeout, setInterval: () => 0, clearInterval: () => undefined,
  addEventListener: () => undefined, removeEventListener: () => undefined,
  devicePixelRatio: 1, innerWidth: 420, innerHeight: 760,
});
installSilentAudio();
const gradient = { addColorStop: () => undefined };
const ctx = new Proxy({ canvas: { width: 420, height: 760 }, globalAlpha: 1 } as Record<string, unknown>, {
  get(target, prop) {
    const name = String(prop);
    if (name === 'canvas' || name === 'globalAlpha') return target[name];
    if (name === 'createLinearGradient' || name === 'createRadialGradient' || name === 'createPattern') return () => gradient;
    if (name === 'measureText') return () => ({ width: 8 });
    if (name === 'getImageData') return () => ({ data: new Uint8ClampedArray(4) });
    return () => undefined;
  },
  set(target, prop, value) { target[String(prop)] = value; return true; },
}) as unknown as CanvasRenderingContext2D;
const canvas = {
  width: 420, height: 760, style: {}, getContext: () => ctx,
  addEventListener: () => undefined, removeEventListener: () => undefined,
  getBoundingClientRect: () => ({ left: 0, top: 0, width: 420, height: 760 }),
};
const { Game } = await import('../src/games/gunhit/game/Game.ts');
type Live = Record<string, any>;
const events = { onGameOver() {}, onStageChange() {}, onStageCleared() {}, onShotFired() {}, onBossDefeated() {} };

function ready(weapon = 'pistol'): Live {
  const game = new Game(canvas as unknown as HTMLCanvasElement, events as never) as unknown as Live;
  game.startAtLevel(1);
  game.setWeapon(weapon);
  for (let i = 0; i < 180 && game.state === 'intro'; i++) game.update(1 / 60);
  assert.equal(game.state, 'play');
  game.items = []; game.bonusCoins = []; game.bossProjs = []; game.star = null;
  game.level.base = 0; game.level.ammo = 99; game.rot = 0;
  game.ammoLeft = 99; game.cooldown = 0; game.reloadT = 0;
  return game;
}

function shotSpeed(game: Live): number {
  game.projs = [];
  game.cooldown = 0;
  game.shoot();
  assert.ok(game.projs.length > 0, 'a round leaves the barrel');
  return Math.abs(game.projs[0].vy);
}

test('bullet speed is stored as a 1x-3x multiplier', () => {
  assert.equal(BULLET_SPEED_MIN, 1);
  assert.equal(BULLET_SPEED_MAX, 3);
  assert.equal(DEFAULT_BULLET_SPEED, 1);
  assert.equal(normalizeBulletSpeed(0.2), 1);
  assert.equal(normalizeBulletSpeed(9), 3);
  assert.equal(normalizeBulletSpeed(2.34), 2.3);
  assert.equal(normalizeBulletSpeed('2.5'), 2.5);
  assert.equal(normalizeBulletSpeed('nope'), 1);
  assert.equal(formatBulletSpeed(3), '3.0x');

  const previous = getSavedBulletSpeed();
  const seen: number[] = [];
  const unsub = subscribeBulletSpeed((value) => seen.push(value));
  setSavedBulletSpeed(2.4);
  assert.equal(getSavedBulletSpeed(), 2.4);
  setSavedBulletSpeed(12);
  assert.equal(getSavedBulletSpeed(), 3);
  assert.deepEqual(seen, [2.4, 3]);
  unsub();
  setSavedBulletSpeed(previous);
});

test('3x really flies three times faster for every weapon family', () => {
  const pistol = ready('pistol');
  const normal = shotSpeed(pistol);
  pistol.setBulletSpeed(3);
  const fast = shotSpeed(pistol);
  assert.ok(Math.abs(fast - normal * 3) < 0.51, `${fast} must be 3x ${normal}`);

  pistol.setBulletSpeed(1.5);
  const mid = shotSpeed(pistol);
  assert.ok(Math.abs(mid - normal * 1.5) < 0.51, `${mid} must be 1.5x ${normal}`);
  pistol.setBulletSpeed(1);
  assert.equal(shotSpeed(pistol), normal, 'back to the untouched tuning');

  // A different family (shotgun burst) scales the same way.
  const shotgun = ready('shotgun');
  const shell = shotSpeed(shotgun);
  shotgun.setBulletSpeed(3);
  const fastShell = shotSpeed(shotgun);
  assert.ok(Math.abs(fastShell - shell * 3) < 0.51, `${fastShell} must be 3x ${shell}`);
  assert.equal(getWeapon('shotgun').speed > 0, true);
});

test('every projectile spawn site multiplies by the tuning', () => {
  const game = readFileSync('src/games/gunhit/game/Game.ts', 'utf8');
  assert.match(game, /import \{ getSavedBulletSpeed, normalizeBulletSpeed \} from '\.\/bulletSpeed';/);
  assert.match(game, /private bulletMult: number = getSavedBulletSpeed\(\);/);
  // Harnesses that build from the prototype only must never see a NaN speed.
  assert.match(game, /private get bulletK\(\): number \{\s+const k = this\.bulletMult;\s+return Number\.isFinite\(k\) && k > 0 \? k : 1;/);
  assert.match(game, /setBulletSpeed\(speed: number\) \{\s+this\.bulletMult = normalizeBulletSpeed\(speed, 1\);/);
  assert.match(game, /const vy = -w\.speed \* this\.speedMult \* this\.bulletK;/);
  assert.match(game, /vy: -SIX_BEAM_SPEED \* this\.speedMult \* this\.bulletK,/);
  assert.match(game, /const shotVy = -shotSpeed \* this\.speedMult \* this\.bulletK;/);
  assert.match(game, /const ownVy = -sevenCarrierSpeed\(own, w\.speed\) \* this\.speedMult \* this\.bulletK;/);
  // Pellet fan-out follows the same speed, so the spread keeps its shape.
  assert.match(game, /this\.carrierPlan\(n, beams, SIX_BEAM_SPEED \* this\.bulletK\)/);
  assert.match(game, /this\.carrierPlan\(n, rounds\.length, w\.speed \* this\.bulletK\)/);
});

test('settings expose a 1x-3x bullet speed slider for all weapons', () => {
  const panel = readFileSync('src/games/gunhit/components/SgaSettingsPanel.tsx', 'utf8');
  const app = readFileSync('src/games/gunhit/App.tsx', 'utf8');
  assert.match(panel, /KECEPATAN PELURU \(SEMUA SENJATA\)/);
  assert.match(panel, /min=\{BULLET_SPEED_MIN\}[\s\S]*?max=\{BULLET_SPEED_MAX\}[\s\S]*?step=\{BULLET_SPEED_STEP\}/);
  assert.match(panel, /type="range"/);
  assert.match(panel, /bulletSpeed: number;/);
  assert.match(panel, /onBulletSpeed: \(value: number\) => void;/);
  assert.match(app, /const \[bulletSpeed, setBulletSpeed\] = useSgaBulletSpeed\(\);/);
  assert.match(app, /gameRef\.current\?\.setBulletSpeed\(bulletSpeed\);/);
  assert.match(app, /onBulletSpeed=\{setBulletSpeed\}/);
});

test('landscape menu weapon only lifts with W/S — the aiming angle belongs to the run', () => {
  const app = readFileSync('src/games/gunhit/App.tsx', 'utf8');
  assert.match(app, /const gunAimRef = useRef<HTMLDivElement>\(null\);/);
  assert.match(app, /if \(!menuLandscape \|\| !menuSceneOpen\) return;/);
  assert.match(app, /event\.code === 'KeyW'/);
  assert.match(app, /event\.code === 'KeyS'/);
  assert.match(app, /const dir = \(aim\.up \? 1 : 0\) - \(aim\.down \? 1 : 0\); \/\/ W lifts, S lowers/);
  assert.match(app, /const LIFT_MAX = 92;/);
  assert.match(app, /rig\.style\.transform = `translate3d\(0, \$\{\(-aim\.lift\)\.toFixed\(2\)\}px, 0\)`/);
  assert.match(app, /data-menu-aim/);
  // The showcase no longer reads the cursor: no heading maths and no rotation.
  assert.doesNotMatch(app, /Math\.atan2\(dx, Math\.max\(up, 12\)\)/);
  assert.doesNotMatch(app, /ANGLE_MAX/);
  assert.doesNotMatch(app, /aim\.angle/);
  assert.doesNotMatch(app, /rotate\(\$\{aim\./);
  assert.doesNotMatch(app, /window\.addEventListener\('pointermove', onPointerMove/);
});
