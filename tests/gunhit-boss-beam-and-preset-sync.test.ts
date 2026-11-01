import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { traceBossSegment } from '../src/games/gunhit/game/bossRaycast';
import { SetNineFx } from '../src/games/gunhit/game/setNineFx';
import { sfx } from '../src/games/perfect-shot/audio/sfx';
import { gunTiming } from '../src/games/perfect-shot/anim/presets';

const ink = (x: number, y: number) => x >= 195 && x <= 205 && y >= 270 && y <= 290;
test('beam raycasts ignore the old circle and stop only at ink', () => {
  const hit = traceBossSegment(200, 600, 200, -80, ink);
  assert.ok(hit);
  assert.equal(hit.y, 290);
  assert.equal(traceBossSegment(250, 600, 250, -80, ink), null);
  const fx = new SetNineFx({ shake() {}, flash() {}, hitStop() {}, wheel: () => ({ x: 210, y: 300, R: 122, angle: 0, ink }) });
  const hit9 = fx.hitscan(200, 600, -Math.PI / 2);
  assert.equal(hit9.hit, true);
  assert.ok(Math.abs(hit9.y - 290) < 1.01);
  assert.equal(fx.hitscan(250, 600, -Math.PI / 2).hit, false);
});

test('Preset 1 spin starts with the rise and its pop transient lands at the visual 48% peak at all speeds', () => {
  const engine = sfx as any;
  const old = { ctx: engine.ctx, state: engine.state, styleIn: engine.styleIn, tone: engine.tone, noise: engine.noise, bell: engine.bell, marimba: engine.marimba, thud: engine.thud, duck: engine.duck };
  try {
    engine.ctx = { currentTime: 0 };
    engine.state = { ...engine.state, sfx: true };
    for (const key of ['tone', 'noise', 'bell', 'marimba', 'thud', 'duck']) engine[key] = () => {};
    for (const speed of [0.5, 0.75, 1, 1.5, 2]) {
      const calls: { style: string; d: number; dur: number }[] = [];
      engine.styleIn = function(style: string, d: number, dur: number, pan = 0, size = 1) {
        calls.push({ style, d, dur });
        return old.styleIn.call(this, style, d, dur, pan, size);
      };
      const duration = gunTiming('combo').inDur / 1000 / speed;
      const start = gunTiming('combo').inD / 1000 / speed;
      engine.styleIn('combo', start, duration);
      const rise = calls.find((c) => c.style === 'rise')!;
      const pop = calls.find((c) => c.style === 'pop')!;
      assert.equal(rise.d, start);
      assert.ok(Math.abs(pop.d + pop.dur * 0.38 - (start + duration * 0.48)) < 1e-9);
    }
  } finally {
    Object.assign(engine, old);
  }
});

test('preset changes replay after the opaque settings dialog closes and before audio starts', () => {
  const app = readFileSync('src/games/gunhit/App.tsx', 'utf8');
  assert.match(app, /if \(settingsOpen\) \{\s*pendingSettingsPlanRef\.current = plan;\s*return;/);
  assert.match(app, /setSettingsOpen\(false\);[\s\S]*?const plan = pendingSettingsPlanRef\.current;[\s\S]*?menuEntranceAudioRef\.current = plan;[\s\S]*?setMenuReturnKey/);
});

test('the boss impact clip is installed before slide 9 paints its particles', () => {
  const game = readFileSync('src/games/gunhit/game/Game.ts', 'utf8');
  assert.ok(game.indexOf('setSplinterClip(c, (fxCtx)') < game.indexOf('this.drawNineLayer(c)'));
  assert.doesNotMatch(game, /getExactBossRadius/);
});
