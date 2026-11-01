import test from 'node:test';
import assert from 'node:assert/strict';
import { drawFace } from '../src/games/gunhit/game/faces';

/** Records every paint the face renderer makes so the artwork can be inspected. */
function probe() {
  const calls: Array<{ name: string; args: unknown[] }> = [];
  const gradient = { addColorStop: (...args: unknown[]) => calls.push({ name: 'addColorStop', args }) };
  const ctx = new Proxy({} as CanvasRenderingContext2D, {
    get: (_t, property) => {
      const name = String(property);
      if (name === 'createRadialGradient' || name === 'createLinearGradient') {
        return (...args: unknown[]) => { calls.push({ name, args }); return gradient; };
      }
      if (['beginPath', 'closePath', 'fill', 'stroke', 'clip', 'save', 'restore',
        'moveTo', 'lineTo', 'arc', 'ellipse', 'fillRect', 'translate', 'scale'].includes(name)) {
        return (...args: unknown[]) => calls.push({ name, args });
      }
      return undefined;
    },
    set: (_t, property, value) => { calls.push({ name: `set:${String(property)}`, args: [value] }); return true; },
  });
  return { ctx, calls };
}

const painted = (calls: Array<{ name: string; args: unknown[] }>, prop: string) =>
  calls.filter(c => c.name === `set:${prop}`).map(c => c.args[0]);

test('SGA level 1 uses Perfect Shot’s orange wheel artwork verbatim', () => {
  const { ctx, calls } = probe();
  drawFace(ctx, 106, 'orange');

  const fills = painted(calls, 'fillStyle');
  // Reference TargetArt palette: rind #f59e0b / stroke #b45309 / pith #fff4dc / flesh #fb923c-#ea7a1c.
  assert.ok(fills.includes('#f59e0b'), 'the rind is the reference amber');
  assert.ok(fills.includes('#b45309'), 'the rim stroke colour covers the outermost pixels');
  assert.ok(fills.includes('#fff4dc'), 'the pith is the reference cream');
  assert.ok(!fills.includes('#ff7a00'), 'the old SGA orange rind is gone');
  assert.ok(!fills.includes('#fffae8'), 'the old SGA pith is gone');

  const stops = calls.filter(c => c.name === 'addColorStop').map(c => c.args);
  assert.deepEqual(stops[0], [0, 'rgba(255,255,255,0.5)'], 'flesh gradient starts white at 50%');
  assert.deepEqual(stops[1], [0.25, '#fb923c']);
  assert.deepEqual(stops[2], [1, '#ea7a1c']);

  const ellipses = calls.filter(c => c.name === 'ellipse');
  assert.equal(ellipses.length, 30, 'the reference juice seeds (30 ellipses) are all drawn');
  const lines = calls.filter(c => c.name === 'lineTo');
  assert.equal(lines.length, 10, 'the reference draws 10 pith spokes');
  const arcs = calls.filter(c => c.name === 'arc').map(c => Math.round(Number(c.args[2])));
  assert.ok(arcs.includes(104), 'r=98 of a 200-unit viewBox lands on 103.88 at radius 106');
  assert.ok(arcs.includes(95), 'r=90 pith lands on 95.4');
});

test('the shatter still belongs to SGA: fragments keep slicing the same baked face', () => {
  // The face canvas is the only artwork the fragment renderer receives, so the
  // new orange art rides along inside SGA's own 3D shatter without any change.
  const { ctx, calls } = probe();
  drawFace(ctx, 106, 'orange');
  const hasClip = calls.some(c => c.name === 'clip');
  assert.ok(hasClip, 'the artwork stays inside the wheel silhouette the fragments slice');
});
