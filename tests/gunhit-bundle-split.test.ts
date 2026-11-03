import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const ROOT = process.cwd();
const read = (file: string) => readFileSync(path.join(ROOT, file), 'utf8');

test('Game A engine is a lazy chunk, not part of the menu bundle', () => {
  const app = read('src/games/gunhit/App.tsx');
  // A value import of the engine (or of its art) would pull the whole game into
  // the menu chunk and the title screen would wait for it again.
  assert.ok(!/^import\s*\{[^}]*\bGame\b[^}]*\}\s*from\s*'\.\/game\/Game';$/m.test(app), 'engine must only be imported as a type');
  assert.ok(app.includes("import type { Game } from './game/Game';"));
  assert.ok(app.includes("const loadEngine = () => import('./game/Game');"));
  assert.ok(app.includes('whenEngine((engine) => {'));
  // The menu's gun showcase loads its artwork on demand as well.
  assert.ok(app.includes("const loadMenuGunArt = () => (menuGunArtPromise ??= import('./game/menuGunArt'));"));
});

test('menu overlays are code-split behind Suspense', () => {
  const app = read('src/games/gunhit/App.tsx');
  for (const component of ['Arsenal', 'QuestModal', 'SgaSettingsPanel', 'StarBuffModal', 'BossDefeatedModal', 'BossGiftBoxModal']) {
    const plain = app.includes(`lazy(() => import('./components/${component}'))`);
    const named = new RegExp(`import\\('./components/${component}'\\)\\.then\\(\\(m\\) => \\(\\{ default: m\\.`).test(app);
    assert.ok(plain || named, `${component} is lazy`);
  }
  assert.ok(app.includes("const Overlay = ({ children }: { children: ReactNode }) => <Suspense fallback={null}>{children}</Suspense>;"));
});

test('engine-only modules no longer hang off the menu audio module', () => {
  const audio = read('src/games/gunhit/game/audio.ts');
  // `audio.ts` is part of the first chunk; importing the ported slides' audio
  // buses from it dragged their engines along.
  assert.ok(!audio.includes("from './setNineFx'"));
  assert.ok(!audio.includes("from './setElevenFx'"));
  assert.ok(audio.includes("from './slideAudioBridge'"));
  const bridge = read('src/games/gunhit/game/slideAudioBridge.ts');
  assert.ok(bridge.includes('export function registerSlideAudio'));
  for (const file of ['src/games/gunhit/game/setNineFx.ts', 'src/games/gunhit/game/setElevenFx.ts']) {
    assert.ok(read(file).includes('registerSlideAudio('), `${file} registers its bus`);
  }
});

test('weapon data and weapon artwork live in separate modules', () => {
  const weapons = read('src/games/gunhit/game/weapons.ts');
  assert.ok(!weapons.includes("from './art/guns'"), 'weapons.ts stays artwork-free');
  assert.ok(!weapons.includes("from './art/projectiles'"));
  const draw = read('src/games/gunhit/game/weaponDraw.ts');
  assert.ok(draw.includes("export { drawGun } from './art/guns';"));
  assert.ok(draw.includes("export { drawProjectile } from './art/projectiles';"));
});

test('level rules and canvas geometry live outside the engine', () => {
  const game = read('src/games/gunhit/game/Game.ts');
  assert.ok(!/^export function makeLevel/m.test(game), 'makeLevel moved to levels.ts');
  assert.ok(game.includes("} from './levels';"));
  assert.ok(read('src/games/gunhit/game/levels.ts').includes('export function makeLevel'));
  const layout = read('src/games/gunhit/game/layout.ts');
  for (const constant of ['export const H = 760;', 'export const GAMEPLAY_GUN_SCALE = 1.08;', 'export const GUN_Y']) {
    assert.ok(layout.includes(constant), `layout keeps ${constant}`);
  }
});

test('vite splits the engine, the artwork and the ported slides', () => {
  const config = read('vite.config.ts');
  assert.ok(config.includes('advancedChunks'));
  for (const group of ['gunhit-art', 'gunhit-art-guns', 'gunhit-menu-data', 'gunhit-audio', 'shared-runtime', 'ported-4', 'ported-8']) {
    assert.ok(config.includes(`name: '${group}'`), `${group} group exists`);
  }
  // The engine must never be a *static* dependency of the entry chunk. A broad
  // `games/gunhit/game/` catch-all used to swallow safeStorage.ts — which the
  // hub shell does import statically — so the whole 440 kB engine (and, through
  // it, ported-4/6/8 and every gun texture) was downloaded and parsed before
  // first paint. Rolldown still splits the engine out on its own once the game
  // is opened, so those catch-all groups are deliberately gone.
  for (const catchAll of ['gunhit-engine', 'gunhit-components']) {
    assert.ok(!config.includes(`name: '${catchAll}'`), `${catchAll} catch-all is gone`);
    assert.ok(
      !new RegExp(`name:\\s*'${catchAll}'\\s*,\\s*test:\\s*/\\[\\\\\\\\/\\]games`).test(config),
      `${catchAll} directory catch-all regex is gone`,
    );
  }
});
