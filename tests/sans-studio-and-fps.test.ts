import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import SansStudioLoading, {
  SANS_INTRO_DEFAULTS,
  stepSpring,
} from '../src/components/SansStudioLoading';
import {
  buildDeformedLetterAPath,
  buildDeformedLetterNPath,
  deformSoftBodyPoint,
} from '../src/utils/smoothLogoGeometry';
import { juicyAudio, JuicyAudioEngine } from '../src/utils/juicyAudio';
import {
  getOptimalCanvasDpr,
  isMobilePerfProfile,
  optimizeCanvas2DForMobile,
} from '../src/games/gunhit/utils/mobilePerf';

const ROOT = process.cwd();

test('SANS STUDIO intro animation uses 2d-game-intro-animation.zip soft-body wordmark, red stage, and spring solver', () => {
  const html = renderToStaticMarkup(
    createElement(SansStudioLoading, { onComplete: () => {} }),
  );

  assert.match(html, /id="sans-stage-container"/);
  assert.match(html, /studio-red-stage/, 'uses #F11E1E radial red studio stage');
  assert.match(html, /viewBox="0 -160 960 920"/, 'renders 9:16 portrait SansWordmarkSvg viewBox');
  assert.match(html, /aria-label="SANS STUDIO"/);
  for (const ch of ['S', 'T', 'U', 'D', 'I', 'O']) {
    assert.match(html, new RegExp(`>${ch}<`), `renders STUDIO sub-label character ${ch}`);
  }
  assert.match(html, /fill="#F11E1E"/, 'renders mascot cutout face inside letter A');

  assert.equal(SANS_INTRO_DEFAULTS.preset, 'classic');
  assert.equal(SANS_INTRO_DEFAULTS.logoScale, 0.7);
  assert.equal(SANS_INTRO_DEFAULTS.redBgHex, '#F11E1E');

  // Verify soft-body FFD geometry produces smooth closed SVG spline paths
  const neutralSb = {
    pivotX: 396,
    pivotY: 348,
    translateX: 0,
    translateY: 0,
    scaleX: 1,
    scaleY: 1,
    rotationDeg: 0,
    bendX: 0,
    squishY: 0,
  };
  const aPath = buildDeformedLetterAPath(neutralSb);
  const nPath = buildDeformedLetterNPath({ ...neutralSb, pivotX: 588 });
  assert.ok(aPath.startsWith('M ') && aPath.endsWith(' Z'));
  assert.ok(nPath.startsWith('M ') && nPath.endsWith(' Z'));

  const pt = deformSoftBodyPoint(396, 224, { ...neutralSb, scaleY: 0.85, squishY: 0.4 });
  assert.ok(pt.y > 224 && pt.y < 348, 'vertical squash compresses letter toward floor pivot');

  // Verify 4x sub-stepped symplectic spring converges smoothly toward target
  const spring = { pos: -0.3, vel: 0, target: 0 };
  for (let i = 0; i < 60; i++) {
    stepSpring(spring, 330, 12, 1 / 60);
  }
  assert.ok(Math.abs(spring.pos) < 0.02);

  // Verify procedural audio calls are safe no-ops in headless/locked environments
  juicyAudio.playIntroBloom();
  juicyAudio.playDropWhoosh(0);
  juicyAudio.playSquishImpact(1);
  juicyAudio.playDropletBurst();
  juicyAudio.playMascotWink();
  juicyAudio.playStudioResolveChord();
  juicyAudio.playTransitionOut();
  juicyAudio.playGameArrival();
  assert.match(html, /data-audio-toggle="true"/, 'renders Mochi Garden intro audio toggle button');
});

test('2d-game-intro-animation (1).zip Mochi Garden audio engine plays Do-Mi-Sol-Do landings, squeeze, release, wink ting, and arrival', () => {
  const endedCallbacks: Array<() => void> = [];
  const makeParam = (initial = 0) => ({
    value: initial,
    setValueAtTime(v: number) {
      this.value = v;
    },
    setTargetAtTime(v: number) {
      this.value = v;
    },
    linearRampToValueAtTime(v: number) {
      this.value = v;
    },
    setValueCurveAtTime(curve: Float32Array) {
      this.value = curve[0] ?? 0;
    },
    cancelScheduledValues() {},
  });
  const makeNode = (extra: Record<string, unknown> = {}) => ({
    connect(dest: unknown) {
      return dest;
    },
    disconnect() {},
    ...extra,
  });

  const mockCtx = {
    sampleRate: 44100,
    currentTime: 0,
    state: 'running',
    destination: makeNode(),
    createGain: () => makeNode({ gain: makeParam(1) }),
    createConvolver: () => makeNode({ normalize: false, buffer: null }),
    createBiquadFilter: () =>
      makeNode({ type: 'lowpass', frequency: makeParam(1000), Q: makeParam(1) }),
    createDynamicsCompressor: () =>
      makeNode({
        threshold: makeParam(-15),
        knee: makeParam(15),
        ratio: makeParam(2),
        attack: makeParam(0.012),
        release: makeParam(0.18),
      }),
    createStereoPanner: () => makeNode({ pan: makeParam(0) }),
    createPeriodicWave: () => ({}),
    createBuffer: (channels: number, length: number, sampleRate: number) => {
      const chans = Array.from({ length: channels }, () => new Float32Array(length));
      return {
        sampleRate,
        length,
        numberOfChannels: channels,
        getChannelData: (ch: number) => chans[ch],
      };
    },
    createOscillator: () => {
      const node = makeNode({
        type: 'sine',
        frequency: makeParam(440),
        onended: null as null | (() => void),
        setPeriodicWave() {},
        start() {},
        stop() {
          if (node.onended) endedCallbacks.push(node.onended);
        },
      });
      return node;
    },
    createBufferSource: () => {
      const node = makeNode({
        buffer: null,
        onended: null as null | (() => void),
        start() {},
        stop() {
          if (node.onended) endedCallbacks.push(node.onended);
        },
      });
      return node;
    },
  } as unknown as BaseAudioContext;

  const engine = new JuicyAudioEngine(mockCtx);
  engine.volume = 1;
  const tones: Array<{ at: number; frequency: number; gain: number; duration: number }> = [];
  const origTone = engine.tone.bind(engine);
  engine.tone = (opts) => {
    tones.push({
      at: opts.at,
      frequency: opts.frequency,
      gain: opts.gain,
      duration: opts.duration,
    });
    return origTone(opts);
  };

  engine.playIntroBloom();
  for (let i = 0; i < 4; i++) {
    engine.playDropWhoosh(i, 0.05 + i * 0.1);
    engine.playSquishImpact(i, 0.87, 0.22 + i * 0.1);
  }
  engine.playManualSquish(1.15, 0.65);
  engine.playReleaseBoing(1.15, 0.94);
  engine.playDropletBurst(0.94);
  for (let i = 0; i < 6; i++) engine.playStudioLetterTick(i, 0.96 + i * 0.036);
  engine.playMascotWink(1.32);
  engine.playStudioResolveChord(1.32);

  const leads = tones.filter((t) => t.gain > 0.025);
  assert.deepEqual(
    leads.map((t) => t.frequency),
    [261.6256, 329.6276, 391.9954, 523.2511, 261.6256, 391.9954, 1046.5023],
    'Plays C4-E4-G4-C5 landings, C4 squeeze, G4 release, and C6 star-bell wink ting',
  );
  assert.equal(tones.length, 10, 'Exact 10 scheduled tones with zero stacked resolve clutter');
  for (let i = 1; i < 4; i++) {
    assert.ok(
      Math.abs(leads[i].at - leads[i - 1].at - 0.1) < 1e-5,
      'Landing notes are spaced exactly 100ms apart',
    );
  }
  const starTones = tones.filter((t) => t.at >= 1.32);
  assert.equal(starTones.length, 3, 'Star-bell wink has 3 harmonic partials');
  assert.equal(new Set(starTones.map((t) => t.at)).size, 1, 'Wink partials share a single onset');

  // Verify transition fade-out & arrival chime + full voice cleanup on ended
  engine.playTransitionOut(0.54);
  engine.playGameArrival();
  assert.ok(engine.voices.size > 0);
  while (endedCallbacks.length > 0) {
    endedCallbacks.pop()!();
  }
  assert.equal(engine.voices.size, 0, 'All voices disconnect cleanly after playback');

  // Muted engine produces zero voices
  engine.enabled = false;
  engine.playIntroBloom();
  engine.playMascotWink();
  assert.equal(engine.voices.size, 0, 'Muted engine schedules zero voices');

  // Verify SansStudioLoading timeline matches 2d-game-intro-animation (1).zip
  const introSrc = fs.readFileSync(
    path.join(ROOT, 'src/components/SansStudioLoading.tsx'),
    'utf8',
  );
  assert.ok(introSrc.includes('const dropStart = 0.05 + i * 0.1;'));
  assert.ok(introSrc.includes('juicyAudio.playIntroBloom()'));
  assert.ok(introSrc.includes('juicyAudio.playTransitionOut('));
  assert.ok(introSrc.includes('juicyAudio.playGameArrival()'));
});

test('App gates SGA activity behind SansStudioLoading before entering the game', () => {
  const appSrc = fs.readFileSync(path.join(ROOT, 'src/App.tsx'), 'utf8');
  assert.ok(appSrc.includes('SansStudioLoading'), 'App mounts SansStudioLoading');
  assert.ok(
    appSrc.includes('active={pageVisible && !loading}'),
    'SGA canvas loop stays paused while SANS STUDIO intro animation plays',
  );
  assert.ok(appSrc.includes('<GunHitGame />'), 'SGA remains mounted inside the 9:16 ScaledFrame');
  assert.ok(appSrc.includes('sans-replay-intro'), 'App listens for sans-replay-intro to replay the intro');
});

test('mobilePerf calibrates mobile DPR and suppresses expensive Canvas2D shadowBlur passes', () => {
  assert.equal(
    isMobilePerfProfile({ coarsePointer: true, innerWidth: 390, devicePixelRatio: 3 }),
    true,
  );
  assert.equal(
    getOptimalCanvasDpr(2, {
      coarsePointer: true,
      innerWidth: 390,
      devicePixelRatio: 3,
      hardwareConcurrency: 4,
      deviceMemory: 3,
    }),
    1.35,
  );
  assert.equal(
    getOptimalCanvasDpr(2, {
      coarsePointer: true,
      innerWidth: 412,
      devicePixelRatio: 3,
      hardwareConcurrency: 8,
      deviceMemory: 6,
    }),
    1.5,
  );
  assert.equal(
    getOptimalCanvasDpr(2, {
      coarsePointer: false,
      innerWidth: 1440,
      devicePixelRatio: 2,
      hardwareConcurrency: 8,
      deviceMemory: 16,
    }),
    2,
  );

  // Mock test contexts stay untouched unless force=true
  const mockCtx = { shadowBlur: 0 } as unknown as CanvasRenderingContext2D;
  optimizeCanvas2DForMobile(mockCtx);
  mockCtx.shadowBlur = 14;
  assert.equal(mockCtx.shadowBlur, 14);

  // Forced mobile optimization turns shadowBlur writes into O(1) zero-blur no-ops
  optimizeCanvas2DForMobile(mockCtx, { force: true });
  mockCtx.shadowBlur = 22;
  assert.equal(mockCtx.shadowBlur, 0);
});

test('Game engine and shared CSS eliminate mobile VSync frame-skipping, splice GC, and sunburst blur filters', () => {
  const gameSrc = fs.readFileSync(path.join(ROOT, 'src/games/gunhit/game/Game.ts'), 'utf8');
  const cssSrc = fs.readFileSync(path.join(ROOT, 'src/index.css'), 'utf8');
  const gunhitAppSrc = fs.readFileSync(path.join(ROOT, 'src/games/gunhit/App.tsx'), 'utf8');

  assert.ok(
    !gameSrc.includes('1000 / 60'),
    'Game loop runs natively on every VSync without 1000/60 beat-frequency drops on 90Hz/60Hz phones',
  );
  assert.ok(
    !gameSrc.includes('this.particles.splice('),
    'Particle loop uses zero-allocation in-place compaction',
  );
  assert.ok(
    gameSrc.includes('vignetteBackdrop'),
    'Full-screen vignette gradient is pre-baked instead of allocated every frame',
  );
  assert.ok(
    !gunhitAppSrc.includes('1000 / 30 - 1'),
    'Main menu weapon preview is unlocked from the 30 FPS cap',
  );

  const sunburstSection = cssSrc.slice(
    cssSrc.indexOf('.sunburst-halo'),
    cssSrc.indexOf('.star-dot-fx'),
  );
  assert.doesNotMatch(sunburstSection, /filter:\s*blur\(/);
  assert.doesNotMatch(sunburstSection, /mix-blend-mode:\s*screen/);
});
