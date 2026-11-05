import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { preloadMenuGunArt } from '../vite.config';

const ROOT = process.cwd();
const read = (file: string) => readFileSync(path.join(ROOT, file), 'utf8');

interface PreloadTag { tag: string; attrs: Record<string, string>; injectTo?: string }

/** Runs the plugin's `transformIndexHtml` hook against a fake build bundle. */
function preloadTags(bundle: string[]): PreloadTag[] {
  const hook = preloadMenuGunArt().transformIndexHtml as unknown as {
    handler: (html: string, context: unknown) => { html: string; tags: PreloadTag[] };
  };
  const entries = Object.fromEntries(bundle.map((file) => [file, {}]));
  return hook.handler('<html><head></head><body></body></html>', { bundle: entries }).tags;
}

test('the menu gun artwork is preloaded, not discovered after the menu paints', () => {
  // The artist chain behind `menuGunArt` (gun modules, ported slides, audio) is
  // only reachable through a dynamic import, so the browser used to learn about
  // it after `App.tsx` ran: the title appeared, the weapon box stayed empty, and
  // the gun popped in a second or two later.
  const tags = preloadTags([
    'assets/index-abc123.js',
    'assets/App-def456.js',
    'assets/menuGunArt-BV7VMaUp.js',
    'assets/gunhit-art-DPwi8THB.js',
    'assets/gunhit-art-guns-BYiBNN0l.js',
    'assets/gunhit-art-variants-BNZvLQ12.js',
    'assets/gunhit-audio-wo42rhRS.js',
    'assets/ported-4-DnV_-lJY.js',
    'assets/ported-6-BLWbVPrC.js',
    'assets/ported-8-SZzqo4BP.js',
  ]);
  const hrefs = tags.map((tag) => tag.attrs.href).sort();
  assert.deepEqual(hrefs, [
    '/assets/gunhit-art-DPwi8THB.js',
    '/assets/gunhit-art-guns-BYiBNN0l.js',
    '/assets/gunhit-art-variants-BNZvLQ12.js',
    '/assets/gunhit-audio-wo42rhRS.js',
    '/assets/menuGunArt-BV7VMaUp.js',
    '/assets/ported-4-DnV_-lJY.js',
    '/assets/ported-6-BLWbVPrC.js',
    '/assets/ported-8-SZzqo4BP.js',
  ]);
  for (const tag of tags) {
    assert.equal(tag.tag, 'link');
    assert.equal(tag.attrs.rel, 'modulepreload');
    assert.equal(tag.injectTo, 'head');
  }
});

test('the preload hint never touches the shell or unrelated chunks', () => {
  assert.deepEqual(preloadTags(['assets/index-abc123.js', 'assets/App-def456.js', 'assets/knife-hit-1.js']), []);
  // A stylesheet whose name merely contains one of the patterns stays out.
  assert.deepEqual(preloadTags(['assets/menuGunArt-BV7VMaUp.css']), []);
  // Without a bundle (dev, or an unexpected hook call) it must not throw.
  const hook = preloadMenuGunArt().transformIndexHtml as unknown as {
    handler: (html: string, context: unknown) => { html: string; tags: PreloadTag[] };
  };
  assert.deepEqual(hook.handler('<html></html>', {}).tags, []);
});

test('the preload plugin only runs for the production build and is registered', () => {
  const config = read('vite.config.ts');
  assert.ok(config.includes('export function preloadMenuGunArt(): Plugin {'));
  assert.ok(config.includes("name: 'sga-menu-gun-art-preload'"));
  assert.ok(/apply: 'build'/.test(config));
  assert.ok(/plugins: \[react\(\), tailwindcss\(\), preloadMenuGunArt\(\)/.test(config));
  assert.equal(preloadMenuGunArt().apply, 'build');
});

test('the menu asks for the artwork as soon as its own module loads', () => {
  const app = read('src/games/gunhit/App.tsx');
  const loader = "const loadMenuGunArt = () => (menuGunArtPromise ??= import('./game/menuGunArt'));";
  const at = app.indexOf(loader);
  assert.ok(at > 0, 'the lazy loader is still there');
  // Eager kick-off: queued with the shell instead of waiting for the first
  // commit of the menu component. The module itself is kept once it resolves,
  // so the next visit to the page paints the live weapon at once.
  const kickOff = app.slice(at, at + 220);
  assert.ok(kickOff.includes('void loadMenuGunArt()'));
  assert.ok(app.includes('void loadMenuGunArt().then((mod) => { menuGunArtModule = mod; });'));
});

test('the last painted weapon is drawn before the artwork chunk lands', () => {
  const app = read('src/games/gunhit/App.tsx');
  assert.ok(app.includes("const MENU_GUN_BITMAP_KEY = 'sga_menu_gun_frame';"));
  assert.ok(app.includes('function readMenuGunBitmap()'));
  assert.ok(app.includes('function keepMenuGunFrameLater(cv: HTMLCanvasElement, id: string, key: string)'));
  // Guarded so a slow image decode can never paint over the live artwork.
  assert.ok(app.includes('if (menuGunArtReady.current) return;'));
  // The frame is stored per weapon and per app version, so a new build or a new
  // gun can never show the old picture.
  assert.ok(app.includes('parsed.v !== APP_VERSION'));
  assert.ok(app.includes('cached.id !== weapon'));
  assert.ok(app.includes('keepMenuGunFrameLater(cv, weapon, paintKey);'));
  // The shortcut is optional: it must never be able to break the menu, and it
  // goes through the safe store (a thrown `SecurityError` used to blank the hub).
  assert.ok(app.includes('function frameToPng(cv: HTMLCanvasElement): string | null {'));
  // The shortcut frame lands in a canvas sized like the live paint, not the
  // 300x150 default (which the CSS would then stretch into a squashed gun).
  assert.ok(app.includes('cv.width = Math.round(MENU_GUN_CANVAS_W * dpr);'));
  assert.ok(app.includes('const MENU_GUN_CANVAS_W = 337;'));
  assert.ok(app.includes('storage.setItem(MENU_GUN_BITMAP_KEY'));
  assert.ok(!/\blocalStorage\b/.test(app), 'App.tsx keeps reading storage through the safe store');
});

test('a paint that finds no canvas retries instead of staying blank', () => {
  const app = read('src/games/gunhit/App.tsx');
  assert.ok(app.includes('const [gunPaintTick, setGunPaintTick] = useState(0);'));
  assert.ok(app.includes('const retry = window.setTimeout(() => setGunPaintTick((n) => n + 1), 16);'));
  assert.ok(app.includes('}, [gunArt, gunPaintTick, screen, weapon'));
});
