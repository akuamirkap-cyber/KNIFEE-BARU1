import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { installCanvasShim } from './supportCanvas';
import { installSilentAudio } from '../tools/supportAudioSilent';

installCanvasShim();
const gl = globalThis as unknown as { window: Record<string, unknown> };
gl.window = Object.assign(gl.window ?? {}, {
  setTimeout, clearTimeout, setInterval: () => 0, clearInterval: () => undefined,
  addEventListener: () => undefined, removeEventListener: () => undefined,
  devicePixelRatio: 1, innerWidth: 420, innerHeight: 760,
});
installSilentAudio();

const { Game } = await import('../src/games/gunhit/game/Game');
const { getGunVariant, getGunEffect, setGunVariant, setGunEffect } = await import('../src/games/gunhit/game/art/gunVariants');
const { gunState } = await import('../src/games/gunhit/game/art/kit');
const { drawGun } = await import('../src/games/gunhit/game/art/guns');
const { drawGunCentered } = await import('../src/games/gunhit/game/art/drawCentered');
const { buildSevenAnim } = await import('../src/games/gunhit/game/setSevenArt');
const { restElevenState } = await import('../src/games/gunhit/game/setElevenArt');
const { audio } = await import('../games/game-6/src/game/core');
audio.muted = true;

const gradient = { addColorStop: () => undefined };
function context(angles: number[] = []): CanvasRenderingContext2D {
  const target: Record<string, unknown> = { canvas: { width: 420, height: 760 }, globalAlpha: 1 };
  return new Proxy(target, {
    get(obj, prop) {
      if (prop === 'canvas' || prop === 'globalAlpha') return obj[prop];
      if (prop === 'rotate') return (angle: number) => { angles.push(angle); };
      if (prop === 'createLinearGradient' || prop === 'createRadialGradient' || prop === 'createConicGradient' || prop === 'createPattern') return () => gradient;
      if (prop === 'measureText') return () => ({ width: 8 });
      if (prop === 'getImageData') return () => ({ data: new Uint8ClampedArray(4) });
      return () => undefined;
    },
    set(obj, prop, value) { obj[String(prop)] = value; return true; },
  }) as unknown as CanvasRenderingContext2D;
}
function canvas(): HTMLCanvasElement {
  const ctx = context();
  return {
    width: 420, height: 760, style: {}, getContext: () => ctx,
    addEventListener: () => undefined, removeEventListener: () => undefined,
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 420, height: 760 }),
  } as unknown as HTMLCanvasElement;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Live = any;
const events = { onGameOver: () => undefined, onStageChange: () => undefined, onStageCleared: () => undefined };
const designs = ['original', 'set7', 'set9', 'set11'] as const;
const effects = ['original', 'new', 'set7', 'set9'] as const;
const near = (value: number, expected: number) => Math.abs(value - expected) < 1e-7;
const ageForTest = 0.1;

test('SGA menu shares Perfect Shot choreography while keeping SGA art, background and currency', () => {
  const app = readFileSync('src/games/gunhit/App.tsx', 'utf8');
  const css = readFileSync('src/index.css', 'utf8');
  const menu = app.slice(app.indexOf("{screen === 'menu' && !mapOpen && !questOpen"), app.indexOf("{screen === 'menu' && settingsOpen && ("));
  assert.match(menu, /MenuEnvironment theme=\{menuTheme\}/);
  assert.match(menu, /SunburstFX size=\{430\} color=\{gunSunburstColor\(getWeapon\(weapon\)\.rarity\)\} intensity=\{0\.34\}/);
  assert.match(menu, /CoinSprite size=\{25\}/);
  assert.match(menu, /DiamondSprite size=\{24\}/);
  assert.match(menu, /font-title relative flex text-\[min\(15vw,72px\)\]/);
  assert.match(menu, /planStyleMotion\(menuPlan\.title\[i\], TL\.letter\(i\), \['in-letter', 'out-letter'\]/);
  assert.match(menu, /planStyleMotion\(menuPlan\.title\[7 \+ i\], TL\.shot\(i\), \['in-slam', 'out-blast'\]/);
  assert.match(menu, /planMotion\('in-bullet', 800, 560/);
  assert.match(menu, /planMotion\('in-shake', 800 \+ 560 \* 0\.78, 380/);
  assert.match(menu, /planStyleMotion\(menuPlan\.gun, gunTiming\(menuPlan\.gun\), \['in-gun', 'out-spin'\]/);
  assert.match(menu, /planStyleMotion\(menuPlan\.title\[i\], TL\.letter\(i\), \['in-letter', 'out-letter'\]/);
  assert.match(menu, /planStyleMotion\(menuPlan\.buttons\[0\], TL\.buttons\(0\), \['in-left', 'out-left'\]/);
  assert.match(menu, /planStyleMotion\(menuPlan\.nav\[i\], TL\.nav\(i\), \['in-pop', 'out-down'\]/);
  assert.match(app, /getSharedMenuPlan\(\) \?\? resolvePlan\(psAnimationConfig\)/);
  assert.match(menu, /<GameIcon name="quest"/);
  assert.match(menu, /<NavFrame set=\{perfectShotIconSet\}/);
  assert.match(menu, /font-ui relative flex h-\[54px\]/);
  assert.match(menu, /role="button" tabIndex=\{0\} aria-label="Buka koleksi senjata" onClick=\{\(\) => startArsenalTransition\(true\)\} onKeyDown/);
  assert.doesNotMatch(css, /\.gunhit-menu \.menu-motion \{ animation: none !important/);
  const psMotionCss = readFileSync('src/games/perfect-shot/index.css', 'utf8');
  assert.match(psMotionCss, /\.st-in-combo \{ animation-name: stInCombo/);
  assert.match(psMotionCss, /@keyframes stInCombo[\s\S]*?translateY\(170%\)[\s\S]*?rotate\(360deg\)/);
  assert.match(psMotionCss, /animation-name: comboMove, comboSpin, comboScale, comboFade, comboFlash/);
  assert.match(psMotionCss, /@keyframes comboFlash[\s\S]*?brightness\(1\.35\)[\s\S]*?brightness\(2\.6\)[\s\S]*?brightness\(1\.15\)/);
  assert.match(psMotionCss, /\.menu-pop-ray[\s\S]*?animation: menuPopRay/);
  assert.match(psMotionCss, /\.st-in-combo::after \{ content: none !important; animation: none !important; \}/);
  assert.match(app, /menuPlan\.gun === 'combo'[\s\S]*?menu-pop-burst/);
  const psMenu = readFileSync('src/games/perfect-shot/components/MainMenu.tsx', 'utf8');
  assert.match(psMenu, /plan\.gun === "combo"[\s\S]*?menu-pop-burst/);
  assert.match(app, /subscribeMenuPlan\(setMenuPlan\)/);
  assert.match(app, /initialGameplayWheelCenterY\(stageConfig\.boss, Boolean\(specialMode\)\) \/ H/);
  assert.match(app, /origin=\{playTransition\.origin\}/);
  assert.doesNotMatch(app, /origin=\{\{ x: 50, y: 29 \}\}/);
  assert.match(psMotionCss, /\.gunhit-menu \.in-gun \{ animation-name: sgaGunIn; \}/);
  assert.match(psMotionCss, /@keyframes sgaGunIn[\s\S]*?brightness\(1\.25\)[\s\S]*?brightness\(1\.08\)[\s\S]*?brightness\(1\)/);
  assert.doesNotMatch(psMotionCss.slice(psMotionCss.indexOf('@keyframes sgaGunIn'), psMotionCss.indexOf('\n}', psMotionCss.indexOf('@keyframes sgaGunIn')) + 2), /brightness\(3\)/);
  assert.match(app, /drawGunCentered\(ctx, curW\.id, 0, 0, true, undefined, false\)/);
  assert.match(app, /synthetic firing flashes[\s\S]*?not the title screen/);
  assert.match(app, /sans-intro-complete/);
  const arsenal = readFileSync('src/games/gunhit/components/Arsenal.tsx', 'utf8');
  assert.equal((arsenal.match(/reducedMotion\?\.removeEventListener\?\.\('change', onMotionChange\)/g) ?? []).length, 2);
  assert.doesNotMatch(app, /Math\.sin\(t \* 2\.5\) \* 8/);
  assert.doesNotMatch(menu, /drawGunCentered\(ctx, curW\.id, t,/);
});

test('each Photon Saber skin draws mirrored firing motion and settles to the same resting pose', () => {
  const saved = { ...gunState };
  const age = 0.1;
  try {
    gunState.sinceShot = age;
    gunState.s7Anim = buildSevenAnim({ sinceShot: age, charge: 0, spin: 0 });
    gunState.s9State = null;
    // Simulate a stale slide-11 state from a previously equipped gun.
    gunState.elevenState = { ...restElevenState(), fireT: 9, data: { side: 1 } };
    gunState.elevenLive = false;
    gunState.nineStage = false;
    gunState.elevenStage = false;
    for (const design of designs) {
      const positive: number[] = [], negative: number[] = [];
      gunState.saberSide = 1;
      drawGun(context(positive), 'photon_saber', 0, 0, 1, 0, true, undefined, design);
      gunState.saberSide = -1;
      drawGun(context(negative), 'photon_saber', 0, 0, 1, 0, true, undefined, design);
      assert.notDeepEqual(positive, negative, `${design} changes its actual drawing transform`);
      if (design === 'original') {
        const angle = 0.65 * Math.sin(Math.PI * age / 0.3);
        assert.ok(positive.some(a => near(a, angle)) && negative.some(a => near(a, -angle)), 'classic blade pivots in opposite directions');
      } else if (design === 'set7') {
        const angle = -0.85 * (1 - age / 0.22) ** 2;
        assert.ok(positive.some(a => near(a, angle)) && negative.some(a => near(a, -angle)), 'slide-3 blade and afterimages mirror');
      } else if (design === 'set9') {
        const rec = 1 - age / 0.16;
        assert.ok(positive.some(a => near(a, -0.28 + 0.66 * rec * rec)));
        assert.ok(negative.some(a => near(a, -0.28 - 0.66 * rec * rec)));
      } else {
        const u = (age - 0.07) / 0.13;
        const angle = -0.95 + 1.9 * u * u * (3 - 2 * u);
        assert.ok(positive.some(a => near(a, angle)) && negative.some(a => near(a, -angle)), 'default slide-11 blade uses the actual trigger age and side');
      }
      gunState.sinceShot = 9;
      gunState.s7Anim = buildSevenAnim({ sinceShot: 9, charge: 0, spin: 0 });
      const rest1: number[] = [], rest2: number[] = [];
      gunState.saberSide = 1;
      drawGun(context(rest1), 'photon_saber', 0, 0, 1, 0, true, undefined, design);
      gunState.saberSide = -1;
      drawGun(context(rest2), 'photon_saber', 0, 0, 1, 0, true, undefined, design);
      assert.equal(rest1.length, rest2.length, `${design} returns to the same stance`);
      assert.ok(rest1.every((a, i) => near(a, rest2[i])), `${design} returns to the same angles`);
      gunState.sinceShot = age;
      gunState.s7Anim = buildSevenAnim({ sinceShot: age, charge: 0, spin: 0 });
    }
  } finally { Object.assign(gunState, saved); }
});

test('Photon alternates on accepted triggers across every skin/effect and twin guns, not on rejected taps', () => {
  const oldDesign = getGunVariant('photon_saber'), oldEffect = getGunEffect('photon_saber');
  const saved = { ...gunState };
  try {
    for (const design of designs) for (const effect of effects) for (const twin of [false, true]) {
      setGunVariant('photon_saber', design);
      setGunEffect('photon_saber', effect);
      const game = new Game(canvas(), events as never) as Live;
      try {
        game.setWeapon('photon_saber');
        game.startAtLevel(1);
        game.state = 'play';
        game.ammoLeft = 20;
        game.twinGuns = twin;
        for (const expected of [1, -1, 1, -1]) {
          game.cooldown = 0;
          game.reloadT = 0;
          game.projs = [];
          game.shoot();
          assert.equal(game.saberSide, expected, `${design}/${effect}/twin=${twin}: one flip per trigger`);
          assert.ok(game.projs.length >= 1);
          if (effect === 'set9') {
            assert.ok(game.projs.every((p: { vy: number }) => near(p.vy, -1300)), 'slide-9 projectile keeps 1300 px/s');
          }
          const remaining = game.ammoLeft;
          game.shoot(); // cooldown rejects this immediate press
          assert.equal(game.saberSide, expected, 'a rejected cooldown tap does not change the next direction');
          assert.equal(game.ammoLeft, remaining);
          game.rt += ageForTest;
          if (game.s7State?.anim) game.s7State.anim.fireT = ageForTest;
          game.drawGunNow(context());
          assert.equal(gunState.saberSide, expected, 'the accepted direction reaches the actual draw pipeline');
        }
        game.cooldown = 0;
        game.ammoLeft = 0;
        game.shoot();
        assert.equal(game.saberSide, -1, 'an empty tap does not flip');
        game.startAtLevel(1);
        assert.equal(game.saberSide, -1, 'a fresh run starts from a known direction');
      } finally { game.destroy(); }
    }
  } finally {
    setGunVariant('photon_saber', oldDesign);
    setGunEffect('photon_saber', oldEffect);
    Object.assign(gunState, saved);
  }
});

test('preview rendering cannot advance a live saber, and the next level keeps the alternating sequence', () => {
  const oldDesign = getGunVariant('photon_saber'), oldEffect = getGunEffect('photon_saber');
  const saved = { ...gunState };
  setGunVariant('photon_saber', 'set11');
  setGunEffect('photon_saber', 'set9');
  const game = new Game(canvas(), events as never) as Live;
  try {
    game.setWeapon('photon_saber');
    game.startAtLevel(1);
    game.state = 'play';
    game.cooldown = 0;
    game.shoot();
    assert.equal(game.saberSide, 1);
    for (const time of [0.95, 3.75, 6.55]) drawGunCentered(context(), 'photon_saber', time, 0, true, 'set11', true);
    assert.equal(game.saberSide, 1, 'previews do not count as game triggers');
    game.loadLevel(2);
    game.state = 'play';
    game.cooldown = 0;
    game.shoot();
    assert.equal(game.saberSide, -1, 'the first shot on the next stage continues the sequence');
  } finally {
    game.destroy();
    setGunVariant('photon_saber', oldDesign);
    setGunEffect('photon_saber', oldEffect);
    Object.assign(gunState, saved);
  }
});

test('Photon menu/Arsenal previews alternate independently and restore live animation state', () => {
  const saved = { ...gunState };
  try {
    gunState.sinceShot = 0.41;
    gunState.saberSide = -1;
    gunState.s7Anim = buildSevenAnim({ sinceShot: 0.2, charge: 0, spin: 0 });
    gunState.elevenState = { ...restElevenState(), fireT: 3, data: { side: -1 } };
    const seven = gunState.s7Anim, nine = gunState.s9State, eleven = gunState.elevenState;
    for (const design of designs) {
      const first: number[] = [], second: number[] = [];
      drawGunCentered(context(first), 'photon_saber', 0.95, 0, true, design, true);
      drawGunCentered(context(second), 'photon_saber', 3.75, 0, true, design, true);
      assert.notDeepEqual(first, second, `${design} preview demonstrates opposite swings`);
      assert.equal(gunState.sinceShot, 0.41);
      assert.equal(gunState.saberSide, -1);
      assert.equal(gunState.s7Anim, seven);
      assert.equal(gunState.s9State, nine);
      assert.equal(gunState.elevenState, eleven);
    }
    assert.throws(() => drawGunCentered(new Proxy({}, { get: () => { throw new Error('lost canvas'); } }) as CanvasRenderingContext2D,
      'photon_saber', 0.95, 0, true, 'set7', true));
    assert.equal(gunState.saberSide, -1);
    assert.equal(gunState.s7Anim, seven);
    assert.equal(gunState.elevenState, eleven);
  } finally { Object.assign(gunState, saved); }
});
