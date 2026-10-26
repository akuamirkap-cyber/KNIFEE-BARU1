/**
 * Slide-1 weapon audio.
 *
 * Every one of the 99 guns must actually make a sound when it fires — and not a
 * whisper. Slide 1 mixes five different synthesizers (its own recipes, slide 2/3,
 * slide 7, slide 9's `Synth`, slide 11's `SoundEngine`), so these tests drive the
 * real `Game.shoot()` through every gun × effect combination and listen to what
 * landed on the Web Audio graph.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { installCanvasShim } from './supportCanvas';
import { installAudioHarness } from './supportAudio';

// The fake AudioContext has to exist *before* the sound modules are imported:
// each engine builds its context and master bus at construction time.
const restoreCanvas = installCanvasShim();
const audio = installAudioHarness();

const g = globalThis as unknown as Record<string, unknown> & {
  window: Record<string, unknown>;
};
g.window = Object.assign(g.window ?? {}, {
  setTimeout,
  clearTimeout,
  setInterval: () => 0,
  clearInterval: () => undefined,
  addEventListener: () => undefined,
  removeEventListener: () => undefined,
  devicePixelRatio: 1,
  innerWidth: 420,
  innerHeight: 760,
});

const gradient = { addColorStop: () => undefined };
function fakeCtx() {
  return new Proxy({} as Record<string, unknown>, {
    get: (_t, prop) => {
      const name = String(prop);
      if (['createLinearGradient', 'createRadialGradient', 'createConicGradient',
        'createPattern'].includes(name)) return () => gradient;
      if (name === 'canvas') return { width: 420, height: 760 };
      if (name === 'measureText') return () => ({ width: 10 });
      if (name === 'getImageData') return () => ({ data: new Uint8ClampedArray(4) });
      if (name === 'createImageData') {
        return (w = 1, h = 1) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) });
      }
      return () => undefined;
    },
    set: () => true,
  });
}

const canvas = {
  width: 420,
  height: 760,
  style: {},
  getContext: () => fakeCtx(),
  addEventListener: () => undefined,
  getBoundingClientRect: () => ({ left: 0, top: 0, width: 420, height: 760 }),
};

const { FIRE_SFX, HIT_SFX, Game, makeLevel } = await import('../src/games/gunhit/game/Game.ts');
const { WEAPONS, getWeapon } = await import('../src/games/gunhit/game/weapons.ts');
const variants = await import('../src/games/gunhit/game/art/gunVariants.ts');
const { slide23Sfx } = await import('../src/games/gunhit/game/slide23Sfx.ts');
const { masterLevel, setMuted } = await import('../src/games/gunhit/game/audio.ts');
const { SET_ELEVEN_IDS, slide1IdForEleven } = await import('../src/games/gunhit/game/setElevenArt.ts');
const { SET_NINE_SLIDE1_IDS } = await import('../src/games/gunhit/game/setNineArt.ts');
const { SoundEngine } = await import('../games/game-8/src/game/sound.ts');

/** A slide-11 engine with its own graph up and its background music off. */
function elevenEngine() {
  const e = new SoundEngine();
  e.musicOn = false;
  e.unlock();
  return e;
}

/** A game on a mid level, with every counter a shot needs cleared. */
function newGame() {
  const game = new Game(canvas as unknown as HTMLCanvasElement, {} as never);
  game.level = makeLevel(3);
  game.state = 'play';
  return game;
}

/** Clears everything a shot needs to be allowed to fire. */
function ready(game: Game & { snowLoaded?: number }) {
  game.state = 'play';
  game.cooldown = 0;
  game.reloadT = 0;
  game.ammoLeft = 30;
  game.snowLoaded = 6;
}

/**
 * Fires one shot of `id` with `effect` selected and returns what it played.
 *
 * The first shot only builds each engine's graph (and its master bus), so it is
 * fired and thrown away — the measurement sees the voices alone.
 */
function fire(id: string, effect?: string) {
  const game = newGame() as Game & { snowLoaded?: number };
  if (effect) variants.setGunEffect(id as never, effect as never);
  game.weapon = getWeapon(id as never);
  ready(game);
  game.shoot();
  ready(game);
  audio.reset();
  game.shoot();
  return { ...audio.probe };
}

/** Same, but waits out a source recipe's rate limiter between the two shots. */
async function fireAfterGate(id: string, effect: string, ms = 340) {
  const game = newGame() as Game & { snowLoaded?: number };
  variants.setGunEffect(id as never, effect as never);
  game.weapon = getWeapon(id as never);
  ready(game);
  game.shoot();
  ready(game);
  await new Promise((r) => setTimeout(r, ms));
  audio.reset();
  game.shoot();
  return { ...audio.probe };
}

test('every gun has a fire sound and every fire sound plays', () => {
  const silent: string[] = [];
  for (const w of WEAPONS) {
    const fn = FIRE_SFX[w.id];
    assert.equal(typeof fn, 'function', `${w.id} has no fire sound`);
    audio.reset();
    fn();
    if (audio.probe.voices === 0 || audio.probe.energy <= 0) silent.push(w.id);
  }
  assert.deepEqual(silent, [], `guns that made no sound: ${silent.join(', ')}`);
});

test('every impact accent plays', () => {
  for (const [id, fn] of Object.entries(HIT_SFX)) {
    assert.equal(typeof fn, 'function', `${id} hit sound is not callable`);
    audio.reset();
    fn!();
    assert.ok(audio.probe.voices > 0, `${id} hit sound made no sound`);
  }
});

test('every gun × effect combination is audible in the real game', async () => {
  const quiet: string[] = [];
  const silent: string[] = [];
  const rounds: { id: string; peak: number }[] = [];
  let combos = 0;
  for (const w of WEAPONS) {
    for (const opt of variants.getGunEffectOptions(w.id as never)) {
      combos++;
      let p = fire(w.id, opt.id);
      if (p.voices === 0) {
        // A few source recipes are rate-limited (slide 9's plasma caster, slide
        // 11's plasmacaster) and stayed quiet because the priming shot was a
        // few milliseconds earlier. Wait out the gate and demand the sound.
        p = await fireAfterGate(w.id, opt.id);
        if (p.voices === 0) silent.push(`${w.id}:${opt.id}`);
      }
      rounds.push({ id: `${w.id}:${opt.id}`, peak: p.peak });
      if (p.voices > 0 && p.peak < 0.3) quiet.push(`${w.id}:${opt.id} (${p.peak.toFixed(2)})`);
    }
  }
  assert.ok(combos >= 260, `expected ~265 gun/effect combinations, saw ${combos}`);
  assert.deepEqual(silent, [], `silent combinations: ${silent.join(', ')}`);
  assert.deepEqual(quiet, [], `combinations too quiet to hear: ${quiet.join(', ')}`);
  // …and the arsenal stays one instrument: no gun three times louder than the
  // band the rest of the guns live in (peaks are pre-master, and every source
  // synthesizer already runs a compressor on its bus).
  const peaks = rounds.map((r) => r.peak).sort((a, b) => a - b);
  const median = peaks[Math.floor(peaks.length / 2)];
  assert.ok(median >= 0.4, `median fire peak dropped to ${median.toFixed(2)}`);
  assert.ok(peaks[peaks.length - 1] <= 1.5, `loudest gun peaks at ${peaks[peaks.length - 1].toFixed(2)}`);
});

test('the slide-2/3 recipes that were whispers are lifted to the pack', () => {
  // These ten guns borrow slide 2/3's firework sounds, written as soft accents
  // under that slide's music. `slide23Sfx.shoot(id, gain)` is what makes them
  // audible as the only voice of a slide-1 shot.
  const lifted = ['rainbow', 'crystal', 'yoyo', 'shark', 'soaker', 'keris',
    'blackhole', 'bamboo', 'rpg', 'diamond'];
  for (const id of lifted) {
    const p = fire(id, 'original');
    assert.ok(p.peak >= 0.4, `${id} still peaks at ${p.peak.toFixed(2)}`);
  }
  // …and the multiplier really is a multiplier.
  audio.reset();
  slide23Sfx.shoot('crystal', 1);
  const plain = audio.probe.energy;
  audio.reset();
  slide23Sfx.shoot('crystal', 4);
  assert.ok(audio.probe.energy > plain * 2.5, 'gain should scale the recipe, not replace it');
});

test('the quietest ported sounds stay in the same band as the rest', async () => {
  const rounds = SET_NINE_SLIDE1_IDS.map((id) => ({ id, tag: `${id}:set9`, effect: 'set9', p: fire(id, 'set9') }))
    .concat(SET_ELEVEN_IDS.map((id) => ({
      id: slide1IdForEleven(id), tag: `${id}:set11`, effect: 'set11', p: fire(slide1IdForEleven(id), 'set11'),
    })));
  for (const r of rounds) {
    if (r.p.voices === 0) {
      // plasmacaster-mk2's recipe is rate-limited; give the gate its window.
      r.p = await fireAfterGate(r.id, r.effect);
    }
    assert.ok(r.p.voices > 0, `${r.tag} fired silently`);
    assert.ok(r.p.peak >= 0.18, `${r.tag} peaked at only ${r.p.peak.toFixed(2)}`);
  }
});

test('slide 11 has its own voice for every one of its guns', () => {
  const e = elevenEngine();
  // The six guns that used to fall through to the generic two-voice default.
  for (const id of ['tripod', 'ironman', 'mega-buster', 'dragon-breath', 'proton-pack', 'phaser']) {
    audio.reset();
    e.playFire(id);
    assert.ok(audio.probe.voices >= 3, `${id} still plays the generic default`);
    assert.ok(audio.probe.peak >= 0.3, `${id} is too quiet (${audio.probe.peak.toFixed(2)})`);
  }
  // …and the three rare guns that were authored barely above a murmur.
  for (const id of ['helix-pulsar', 'prism-lance', 'nano-swarm']) {
    audio.reset();
    e.playFire(id);
    assert.ok(audio.probe.peak >= 0.3, `${id} is too quiet (${audio.probe.peak.toFixed(2)})`);
  }
});

test('the mute switch silences slide 1, slide 9 and slide 11 alike', () => {
  try {
    setMuted(true);
    const nine = fire('sniper', 'set9');
    const eleven = fire('railgun', 'set11');
    audio.reset();
    FIRE_SFX.ak47();
    assert.equal(nine.voices, 0, 'slide 9 kept playing while muted');
    assert.equal(eleven.voices, 0, 'slide 11 kept playing while muted');
    assert.equal(masterLevel(), 0, 'slide 1 master is not silent while muted');
    const s23 = fire('keris', 'original');
    assert.equal(s23.voices, 0, 'slide 2/3 recipes kept playing while muted');
  } finally {
    setMuted(false);
  }
  assert.ok(masterLevel() > 0.5, 'unmuting did not restore the slide-1 master');
  const again = fire('sniper', 'set9');
  assert.ok(again.voices > 0, 'unmuting did not bring slide 9 back');
});

test.after(() => {
  audio.restore();
  restoreCanvas();
});
