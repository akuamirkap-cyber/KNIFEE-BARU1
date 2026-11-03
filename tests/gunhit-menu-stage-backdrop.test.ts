import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync('src/games/gunhit/App.tsx', 'utf8');
const game = readFileSync('src/games/gunhit/game/Game.ts', 'utf8');
const stage = readFileSync('src/games/gunhit/game/stageBackdrop.ts', 'utf8');
const component = readFileSync('src/games/gunhit/components/MenuStageBackdrop.tsx', 'utf8');
const css = readFileSync('src/index.css', 'utf8');

test('the menu room is the gameplay room', () => {
  // Default theme (forest/auto): the menu paints the stage world itself.
  assert.match(app, /menuTheme === 'auto' \|\| menuTheme === 'forest' \? \(/);
  assert.match(app, /<MenuStageBackdrop orientation=\{orientation\} \/>/);
  // A background picked in SETTING still renders its own theme.
  assert.match(app, /<MenuEnvironment theme=\{menuTheme\} vivid=\{menuLandscape\} \/>/);
  assert.match(component, /ctx\.setTransform\(\.\.\.worldTransform\(orientation, k\)\)/);
  assert.match(component, /paintStageForest\(ctx, 'orange'\)/);
  assert.match(component, /paintStageVignette\(ctx\)/);
  assert.match(component, /paintStageGrass\(ctx, time\)/);
});

test('game and menu share one painter, so the two can never drift apart', () => {
  assert.match(stage, /export function paintStageForest\(/);
  assert.match(stage, /export function paintStageGrass\(/);
  assert.match(stage, /export function paintStageVignette\(/);
  // The game no longer owns a private copy of the sky or the grass.
  assert.match(game, /private paintForestBackdrop\(c: CanvasRenderingContext2D\) \{\s+\/\/ Same painter the menu uses[\s\S]{0,120}paintStageForest\(c, this\.level\.style\);/);
  assert.match(game, /paintStageGrass\(c, this\.time\);/);
  assert.match(game, /private paintForestVignette\(c: CanvasRenderingContext2D\) \{\s+paintStageVignette\(c\);/);
  assert.doesNotMatch(game, /Rerumputan Liar/, 'the grass band left the engine');
});

test('the shared painter still draws the teal forest and its grass', async () => {
  const calls: string[] = [];
  const gradient = { addColorStop: (stop: number, color: string) => calls.push(`stop ${stop} ${color}`) };
  const ctx = new Proxy({} as Record<string, unknown>, {
    get(target, prop) {
      const n = String(prop);
      if (n === 'createLinearGradient') return () => gradient;
      if (n === 'set fillStyle' || n === 'fillStyle') return '';
      return (...args: unknown[]) => { calls.push(`${n}(${args.length})`); };
    },
    set(target, prop, value) { calls.push(`${String(prop)}=${String(value)}`); return true; },
  }) as unknown as CanvasRenderingContext2D;
  const { paintStageForest, paintStageGrass, paintStageVignette } = await import('../src/games/gunhit/game/stageBackdrop');
  paintStageForest(ctx, 'orange');
  assert.ok(calls.includes('stop 0 #1b4d59'), 'forest sky top colour');
  assert.ok(calls.includes('stop 0.7 #153743'), 'forest sky bottom colour');
  assert.ok(calls.filter((c) => c.startsWith('fill(')).length >= 6, 'sky + far trunks + near trunks + branches');
  const after = calls.length;
  paintStageGrass(ctx, 0);
  const grass = calls.slice(after).filter((c) => c === 'quadraticCurveTo(4)').length;
  assert.equal(grass, 58, '28 wind-blown blades, two curves each');
  paintStageVignette(ctx);
  assert.ok(calls.join('|').includes('rgba(2, 10, 18, 0.045)'), 'the restrained vignette survives');
});

test('the menu burst is white, exactly like the armory showcase', () => {
  assert.equal(app.split('<SunburstFX size={430}').length - 1, 1, 'exactly one 430px menu burst');
  assert.match(app, /<SunburstFX size=\{430\} color="255,255,255" intensity=\{0\.44\} speed=\{32\} core=\{false\} stars=\{false\}/);
  assert.doesNotMatch(app, /MenuSunburst/);
  assert.doesNotMatch(app, /color=\{gunSunburstColor\(getWeapon\(weapon\)\.rarity\)\}/, 'no rarity tint, and never purple');
});

test('the framing around the stage talks to the gameplay framing', () => {
  assert.match(app, /rgba\(3,7,10,\.16\)/);
  assert.match(app, /rgba\(3,7,10,\.42\)/);
  // Star sparkles stay as ambient decoration on every theme.
  assert.match(css, /\.mm-spark \{/);
});
