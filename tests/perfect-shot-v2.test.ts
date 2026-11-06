import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { initialAppVersion } from '../src/appVersion';
import { PistolGame } from '../v2-perfect-shot/src/game';
import { LEVELS, STAGES, TOTAL } from '../v2-perfect-shot/src/levels';
import { bankRun, freshSave, loadSave, storeSave, SAVE_KEY } from '../v2-perfect-shot/src/persist';
import { WEAPONS, PISTOL, PISTOL_EFFECT } from '../v2-perfect-shot/src/weapons';

const read = (p: string) => readFileSync(path.join(process.cwd(), p), 'utf8');
const tick = (g: PistolGame, seconds: number) => { let left = seconds; while (left > 1e-9) { const d = Math.min(left, 1 / 240); g.update(d); left -= d; } };

test('v1 remains default: no saved v2 choice; only explicit ?v=2 opts in', () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'window');
  try {
    for (const [search, expected] of [['', 'v1'], ['?v=2', 'v2'], ['?v=1', 'v1'], ['?v=unknown', 'v1']] as const) {
      Object.defineProperty(globalThis, 'window', { configurable: true, value: { location: { search } } }); assert.equal(initialAppVersion(), expected);
    }
  } finally { if (previous) Object.defineProperty(globalThis, 'window', previous); else Reflect.deleteProperty(globalThis, 'window'); }
});

test('v2 remains lazy, boot-gated, and freezes v1 input/audio only when selected', () => {
  const app = read('src/App.tsx');
  assert.match(app, /const PerfectShotV2 = lazy\(\(\) => import\('\.\/components\/PerfectShotV2'\)\)/);
  assert.match(app, /hasBooted && appVersion === 'v2'/);
  assert.match(app, /if \(appVersion === 'v2'\) \{[\s\S]*?setHasBooted\(true\)/);
  assert.match(app, /active=\{pageVisible && !loading && appVersion === 'v1'\}/);
  assert.match(app, /if \(appVersion === 'v2'\) return;/);
});

test('in-app v2 and ZIP render the same Lite app; real taps and back are wired', () => {
  const host = read('src/components/PerfectShotV2.tsx'), main = read('v2-perfect-shot/src/main.tsx');
  assert.match(host, /v2-perfect-shot\/src\/App/); assert.match(main, /from '\.\/App'/);
  assert.match(host, /<PerfectShotLite ref=\{liteRef\} active=\{active\}/);
  assert.match(host, /onPointerDown=\{/); assert.doesNotMatch(host, /onPointerDownCapture=\{/);
  assert.match(host, /liteRef\.current\?\.back\(\)/);
  assert.match(host, /addEventListener\('keydown', blockLegacyUnlocks, true\)/);
  assert.match(host, /removeEventListener\('keydown', blockLegacyUnlocks, true\)/);
  assert.match(host, /href="\.\/perfect-shot-v2\.zip"/); assert.match(host, /aria-label="Unduh ZIP v2"/);
  assert.match(read('vite.config.ts'), /dedupe: \['react', 'react-dom'\]/);
});

test('the portable source graph never imports v1 or the removed full arcade', () => {
  const root = path.resolve('v2-perfect-shot');
  const visit = (dir: string): void => { for (const item of readdirSync(dir, { withFileTypes: true })) { const p = path.join(dir, item.name); if (item.isDirectory()) visit(p); else if (/\.(tsx?|css)$/.test(p)) { const source = readFileSync(p, 'utf8'); for (const match of source.matchAll(/from\s+['"]([^'"]+)['"]/g)) { if (match[1].startsWith('.')) assert.ok(path.resolve(path.dirname(p), match[1]).startsWith(root + path.sep), `${p}: ${match[1]}`); } } } };
  visit(path.join(root, 'src')); assert.equal(SAVE_KEY, 'perfect-shot.v2.lite.save');
});

test('only Pistol and quest level1 physically exist, rather than locking/filtering a full catalog', () => {
  assert.deepEqual(WEAPONS.map(w => w.id), ['pistol']); assert.deepEqual(LEVELS.map(l => l.n), [1]); assert.deepEqual(STAGES.map(l => l.n), [1]); assert.equal(TOTAL, 1);
  const source = read('v2-perfect-shot/src/levels.ts'); assert.doesNotMatch(source, /Array\.from\(\{ length: (?:30|100)|CAMPAIGN|bossDef|BOSS_ORDER/);
  const assets = readdirSync('v2-perfect-shot/src/assets'); assert.deepEqual(assets.filter(n => /\.svg$/.test(n)).sort(), ['orange.svg', 'player.svg']);
  assert.deepEqual(readdirSync('v2-perfect-shot/src/art').filter(n => /pistol|weapons|boss|gun/.test(n)), ['pistol.ts']);
});

test('copied Pistol artwork is exactly the original v1 renderer, not an invented replacement', () => {
  const original = read('src/games/gunhit/game/art/guns.ts').match(/function pistol\([\s\S]*?^}/m)![0].trim();
  const lite = read('v2-perfect-shot/src/art/pistol.ts'); assert.equal(lite.slice(lite.indexOf('function pistol(')).trim(), original);
  const manifest = JSON.parse(read('v2-perfect-shot/SOURCE-MAP.json')); assert.equal(createHash('sha256').update(original).digest('hex'), manifest.pistolFunctionSha256);
});

test('original forest geometry and stage1 constants are preserved without importing the full engine', () => {
  const original = read('src/games/gunhit/game/stageBackdrop.ts'), lite = read('v2-perfect-shot/src/art/stageBackdrop.ts');
  assert.equal(lite.slice(lite.indexOf('export function paintStageForest')), original.slice(original.indexOf('export function paintStageForest')));
  assert.equal(LEVELS[0].ammo, 5); assert.equal(LEVELS[0].base, 1.61); assert.equal(LEVELS[0].radius, 95); assert.equal(LEVELS[0].pattern, 'constant');
  assert.equal(PISTOL.speed, 2700); assert.equal(PISTOL.cooldown, .12); assert.equal(PISTOL_EFFECT.speed, 1800);
});

test('menu keeps the original appearance, words and navigation', () => {
  const menu = read('v2-perfect-shot/src/ui/Menu.tsx');
  for (const marker of ['PERFECT', 'SHOT', 'text-[#3fdc72]', 'text-[#ffd23f]', 'QUEST', 'PLAY', 'GUN', 'RANKS', 'READY!', 'SETTING', 'MenuStageBackdrop', 'SunburstFX']) assert.ok(menu.includes(marker), marker);
  assert.doesNotMatch(menu, /RANGER|LONG BOW|MAIN SEKARANG/);
  assert.match(menu, /data-menu-pistol-showcase aria-hidden="true" className=\{`pointer-events-none/); // Overshooting intro art must never swallow a real QUEST/PLAY tap.
});

test('one collision ends a classic run, without substituting three-heart gameplay', () => {
  const g = new PistolGame(() => .75); tick(g, 1); g.fire(); tick(g, .3); g.level.base = 0; g.rotation = Math.PI / 2 - g.marks[0].angle;
  assert.equal(g.fire(), true); tick(g, .2); assert.equal(g.phase, 'over'); assert.equal(g.hits, 1); assert.ok(!('lives' in g));
});

test('a clear stops at level1 and cannot auto-advance to a hidden campaign', () => {
  const g = new PistolGame(() => .75); tick(g, 1); for (let i = 0; i < 5; i++) { assert.equal(g.fire(), true); tick(g, .31); }
  assert.equal(g.phase, 'clear'); assert.equal(g.hits, 5); assert.equal(g.score, 8); tick(g, 10); assert.equal(g.level.n, 1); assert.equal(g.phase, 'clear');
  const next = bankRun(freshSave(), { won: true, score: g.score, coins: g.coins, at: 1 }); assert.equal(next.stage, 1); assert.equal(next.weapon, 'pistol'); assert.equal(next.stars, 3);
});

test('Lite saves cannot unlock another stage/gun and never overwrite a v1 key', () => {
  const data = new Map([['gunhit_best_level', '81'], [SAVE_KEY, JSON.stringify({ schema: 1, stage: 100, weapon: 'other', coins: -1, owned: ['other'] })]]);
  const store = { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => { data.set(k, v); } };
  const s = loadSave(store); assert.equal(s.stage, 1); assert.equal(s.weapon, 'pistol'); assert.equal(s.coins, 0); assert.ok(!('owned' in s)); storeSave(s, store); assert.equal(data.get('gunhit_best_level'), '81');
});

test('portable build/package includes required fonts/art and omits the full project', () => {
  const pack = read('v2-perfect-shot/package.py');
  for (const name of ['dist/index.html', 'SOURCE-MAP.json', 'smoke.tsx', 'scripts/styles.mjs', '.woff2', 'water-caustic.png']) assert.ok(pack.includes(name), name);
  assert.doesNotMatch(pack, /ROOT\.parent|rglob\("\*"\).*node_modules/);
  assert.match(read('v2-perfect-shot/README.md'), /satu PISTOL/); assert.match(read('v2-perfect-shot/README.md'), /hanya level 1/);
});

test('pause/inactivity stop the game loop and scoped styles unmount with Lite', () => {
  const app = read('v2-perfect-shot/src/App.tsx'), board = read('v2-perfect-shot/src/ui/GameBoard.tsx');
  assert.match(app, /<style>\{css\}<\/style>/); assert.match(app, /active=\{live && !paused && !result\}/);
  assert.match(board, /cancelAnimationFrame\(raf\)/); assert.match(board, /active && !document\.hidden/);
  assert.match(app, /audio\.destroy\(\)/); assert.match(app, /removeEventListener\('keydown', key\)/);
});
