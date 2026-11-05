import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

/**
 * Entering the gun page used to cost one synchronous PNG encode (674x590), a
 * full-canvas pixel scan, a web-storage write of the base64 that came out, and —
 * because React state starts empty on every mount — a second paint that decoded
 * the kept snapshot before the live artwork replaced it.
 *
 * These are the guards that keep that off the entering frame.
 */
const ROOT = path.resolve(import.meta.dirname, '..');
const app = readFileSync(path.join(ROOT, 'src/games/gunhit/App.tsx'), 'utf8');

test('the entering frame never encodes the showcase canvas', () => {
  // `frameToPng` is the PNG encode. It may only be reached from the deferred
  // keeper, which is what runs on an idle callback instead of inside the paint.
  const keeper = app.indexOf('function keepMenuGunFrameLater(');
  assert.ok(keeper > 0, 'the deferred keeper exists');
  const calls = app.match(/frameToPng\(/g) ?? [];
  assert.equal(calls.length, 2, 'one definition, one call');
  const body = app.slice(keeper, keeper + 1400);
  assert.ok(body.includes('const png = frameToPng(cv);'), 'the encode lives in the keeper');
  // The paint effect asks for the keeper and nothing else.
  assert.ok(app.includes('keepMenuGunFrameLater(cv, weapon, paintKey);'));
  assert.ok(!/rememberMenuGunBitmap/.test(app), 'the synchronous encode is gone');
});

test('the kept frame is written on an idle callback, once per weapon and art', () => {
  const keeper = app.indexOf('function keepMenuGunFrameLater(');
  const body = app.slice(keeper, keeper + 1400);
  assert.ok(body.includes('requestIdleCallback'), 'it waits for idle');
  assert.ok(body.includes('{ timeout: 1500 }'), 'but it still runs when the menu stays busy');
  assert.ok(body.includes('window.setTimeout(run, 260)'), 'and without idle support it is scheduled, not immediate');
  // Already kept for this weapon + artwork + canvas size: nothing to do.
  assert.ok(body.includes('if (keptMenuGunFrame === key) return;'));
  // A weapon switched mid-idle must not keep the previous gun's frame.
  assert.ok(body.includes('if (latestMenuGunPaint !== key || keptMenuGunFrame === key) return;'));
});

test('a second visit paints the live weapon instead of replaying the snapshot', () => {
  // The resolved art module outlives the component, so the first render of a
  // re-entry already has the artwork and the snapshot path is skipped entirely.
  assert.ok(app.includes('let menuGunArtModule: MenuGunArt | null = null;'));
  assert.ok(app.includes('useState<MenuGunArt | null>(menuGunArtModule)'));
  assert.ok(app.includes('if (menuGunArtModule) return;'), 'the loader effect does not re-request what is already here');
  // And the snapshot effect still bails the moment live art is present.
  assert.ok(app.includes('if (gunArt) return;'));
});

test('the ink pivot is measured once per weapon, not on every visit', () => {
  assert.ok(app.includes('const menuGunPivot = new Map<string, { x: number; y: number }>();'));
  assert.ok(app.includes('let pivot = menuGunPivot.get(paintKey);'));
  assert.ok(app.includes('if (pivot) menuGunPivot.set(paintKey, pivot);'));
  // Half-resolution scan: the pivot still lands within half a CSS pixel.
  assert.ok(app.includes('for (let y = 0; y < cv.height; y += 2) {'));
  assert.ok(app.includes('for (let x = 0; x < cv.width; x += 2) {'));
  // A skin is different artwork with a different mass centre.
  assert.ok(app.includes('gunArt.getGunVariant?.(weapon)'));
  assert.ok(readFileSync(path.join(ROOT, 'src/games/gunhit/game/menuGunArt.ts'), 'utf8')
    .includes("export { getGunVariant } from './art/gunVariants';"));
});

test('the engine no longer boots inside the menu arrival', () => {
  // The engine canvas sits behind the menu, which paints its own room: nothing
  // on the title screen needs it. Its chunk + constructor used to land on the
  // frames the menu animates in, which is the transition the player feels.
  assert.ok(app.includes('const engineBootRef = useRef<(() => void) | null>(null);'));
  assert.ok(app.includes('const engineBootingRef = useRef(false);'));
  // Booted when the arrival sequence ends …
  assert.ok(app.includes('if (!menuReady) return;\n    engineBootRef.current?.();'));
  // … with a floor in case the menu never reports ready.
  assert.ok(app.includes('const bootTimer = window.setTimeout(startBoot, 2600);'));
  assert.ok(!app.includes('window.addEventListener(\'pagehide\', flushShotsToStorage);\n    void boot();'),
    'the entering frame does not boot the engine');
  // Boot runs once, no matter how many triggers fire.
  assert.ok(app.includes('if (engineBootingRef.current) return;\n      engineBootingRef.current = true;\n      void boot();'));
});

test('a run that is asked for first does not wait for the menu', () => {
  const at = app.indexOf('const whenEngine = (start: (engine: Game) => void) => {');
  assert.ok(at > 0);
  const body = app.slice(at, at + 400);
  assert.ok(body.includes('engineQueue.current.push(start);'));
  assert.ok(body.includes('engineBootRef.current?.();'), 'the tap boots the engine immediately');
});

test('a covered page transition stops repainting the menu room', () => {
  // The doors/cloud/wrap/podium variants hide the menu completely, so the 30 Hz
  // forest + grass pass is pure waste for the ~1.9s they run. A fade leaves the
  // menu visible and keeps animating.
  assert.ok(app.includes("animated={!menuPageTransition || menuPageTransition.variant === 'fade'}"));
  assert.ok(readFileSync(path.join(ROOT, 'src/games/gunhit/components/MenuStageBackdrop.tsx'), 'utf8')
    .includes('if (!animated) return () => observer?.disconnect();'));
});
