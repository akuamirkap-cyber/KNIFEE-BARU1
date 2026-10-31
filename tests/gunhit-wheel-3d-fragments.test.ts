import test from 'node:test';
import assert from 'node:assert/strict';
import { drawExtrudedWheelFragment } from '../src/games/gunhit/game/Game';

function canvasProbe() {
  const calls: Array<{ name: string; args: unknown[] }> = [];
  const gradient = { addColorStop: (...args: unknown[]) => calls.push({ name: 'addColorStop', args }) };
  const ctx = new Proxy({} as CanvasRenderingContext2D, {
    get: (_target, property) => {
      const name = String(property);
      if (name === 'createLinearGradient') return (...args: unknown[]) => {
        calls.push({ name, args });
        return gradient;
      };
      if (['beginPath', 'closePath', 'fill', 'stroke', 'clip', 'save', 'restore'].includes(name)) {
        return (...args: unknown[]) => calls.push({ name, args });
      }
      if (['moveTo', 'lineTo', 'arc', 'drawImage', 'scale'].includes(name)) {
        return (...args: unknown[]) => calls.push({ name, args });
      }
      return undefined;
    },
    set: (_target, property, value) => {
      calls.push({ name: `set:${String(property)}`, args: [value] });
      return true;
    },
  });
  return { ctx, calls };
}

test('stage-clear wheel pieces keep a textured rear face and thick 3D sidewalls', () => {
  const { ctx, calls } = canvasProbe();
  const face = {} as CanvasImageSource;
  const pitch = 1.05;
  drawExtrudedWheelFragment(ctx, face, 100, 4, 0.2, 0.8, 14, '#102638', '#b7872a', pitch, -Math.PI * 0.75);

  const imageDraws = calls.filter(call => call.name === 'drawImage');
  assert.equal(imageDraws.length, 2, 'both the rear and front wedge faces retain the wheel texture');
  assert.ok(Math.abs(Number(imageDraws[0].args[2]) - (-104 + 14 * Math.tan(pitch))) < 1e-8, 'rear face is offset toward camera by its projected thickness');
  assert.equal(imageDraws[1].args[2], -104, 'front artwork stays at the original wheel position');
  assert.ok(calls.some(call => call.name === 'scale' && call.args[0] === 1 && Number(call.args[1]) < 0.6), 'face is strongly foreshortened instead of shown front-on');
  assert.ok(calls.some(call => call.name === 'arc' && Math.abs(Number(call.args[1]) - 14 * Math.tan(pitch)) < 1e-8 && call.args[5] === true), 'the curved outer side connects both angled faces');
  assert.ok(calls.filter(call => call.name === 'fill').length >= 3, 'radial and curved side faces are filled');
  assert.ok(calls.some(call => call.name === 'addColorStop' && call.args[1] === 'rgba(255,255,255,0.20)'), 'a directional upper-left highlight lights the front face');
  assert.ok(calls.some(call => call.name === 'addColorStop' && call.args[1] === 'rgba(0,0,0,0.14)'), 'the opposite edge falls into shadow');
  assert.ok(calls.some(call => call.name === 'set:fillStyle' && call.args[0] === 'rgba(0,0,0,0.16)'), 'a soft offset shadow separates each chunk');
});
