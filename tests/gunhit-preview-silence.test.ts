import test from 'node:test';
import assert from 'node:assert/strict';

import { installCanvasShim } from './supportCanvas';
import { sfx as setSevenSfx } from '../games/game-4/src/game/audio';
import { slide2Sfx } from '../src/games/gunhit/game/slide2Audio';
import { drawSetSevenShotShell } from '../src/games/gunhit/game/setSevenFx';
import { silentPreview } from '../src/games/gunhit/game/previewAudio';
import { setNineMuted, nineMuted } from '../src/games/gunhit/game/setNineFx';
import { setElevenMuted, elevenMuted } from '../src/games/gunhit/game/setElevenFx';

installCanvasShim();

const gradient = { addColorStop: () => undefined };
const fakeCtx = new Proxy({ canvas: { width: 152, height: 88 } } as Record<string, unknown>, {
  get(target, prop) {
    const name = String(prop);
    if (name === 'canvas') return target.canvas;
    if (name === 'createLinearGradient' || name === 'createRadialGradient' || name === 'createPattern') {
      return () => gradient;
    }
    if (name === 'measureText') return () => ({ width: 8 });
    return () => undefined;
  },
  set(target, prop, value) { target[String(prop)] = value; return true; },
}) as unknown as CanvasRenderingContext2D;

/** Record every `sfx.play()` the shell makes, with the mute state it saw. */
function spyPlay() {
  const calls: { name: string; muted: boolean }[] = [];
  const original = setSevenSfx.play.bind(setSevenSfx);
  (setSevenSfx as unknown as { play: (name: string, gain?: number) => void }).play = (name: string, gain?: number) => {
    calls.push({ name, muted: setSevenSfx.muted });
    original(name, gain);
  };
  return { calls, restore: () => { setSevenSfx.play = original; } };
}

test('the effect card paints slide 7’s shot without firing its voice', () => {
  // Without the guard the card's recipe would be audible 18 times a second —
  // that is the "spam" sound the picker used to make on the charged guns.
  const spy = spyPlay();
  try {
    drawSetSevenShotShell(fakeCtx, 'emerald', 0.06, 22);
    assert.ok(spy.calls.length > 0, 'emerald’s recipe does try to play its charge');
    assert.ok(spy.calls.every((c) => c.muted === false), 'unguarded it is audible');

    spy.calls.length = 0;
    silentPreview(() => drawSetSevenShotShell(fakeCtx, 'emerald', 0.06, 22));
    assert.ok(spy.calls.length > 0, 'the recipe still ran');
    assert.ok(spy.calls.every((c) => c.muted === true), 'but every voice was muted');
  } finally {
    spy.restore();
  }
});

test('silentPreview silences every ported layer, then restores each one', () => {
  assert.equal(setSevenSfx.muted, false);
  assert.equal(slide2Sfx.muted, false);
  assert.equal(nineMuted(), false);
  assert.equal(elevenMuted(), false);
  let inside: boolean[] = [];
  silentPreview(() => {
    inside = [setSevenSfx.muted, slide2Sfx.muted, nineMuted(), elevenMuted()];
  });
  assert.deepEqual(inside, [true, true, true, true]);
  assert.deepEqual([setSevenSfx.muted, slide2Sfx.muted, nineMuted(), elevenMuted()], [false, false, false, false]);
});

test('a muted game stays muted after a preview', () => {
  setSevenSfx.muted = true;
  slide2Sfx.setMuted(true);
  setNineMuted(true);
  setElevenMuted(true);
  try {
    silentPreview(() => {
      assert.equal(setSevenSfx.muted, true);
    });
    assert.deepEqual([setSevenSfx.muted, slide2Sfx.muted, nineMuted(), elevenMuted()], [true, true, true, true]);
  } finally {
    setSevenSfx.muted = false;
    slide2Sfx.setMuted(false);
    setNineMuted(false);
    setElevenMuted(false);
  }
});

test('nested previews keep the silence until the outermost one ends', () => {
  let inner: boolean = false;
  let after: boolean = true;
  silentPreview(() => {
    silentPreview(() => {
      inner = setSevenSfx.muted;
    });
    after = setSevenSfx.muted;
  });
  assert.equal(inner, true, 'the inner call keeps the mute');
  assert.equal(after, true, 'and the outer call is still silent');
  assert.equal(setSevenSfx.muted, false, 'until it is done');
});
