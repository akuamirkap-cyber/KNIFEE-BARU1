import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { installCanvasShim } from './supportCanvas';
import { installSilentAudio } from '../tools/supportAudioSilent';

installCanvasShim();
const g = globalThis as unknown as Record<string, unknown> & { window: Record<string, unknown> };
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
installSilentAudio();

test('HUD boss indicator uses a 5-point star instead of a rotated square (wajik)', async () => {
  const { traceHudStarPath } = await import('../src/games/gunhit/game/Game');

  const ops: { type: string; x?: number; y?: number }[] = [];
  const mockCtx = {
    beginPath: () => ops.push({ type: 'beginPath' }),
    moveTo: (x: number, y: number) => ops.push({ type: 'moveTo', x, y }),
    lineTo: (x: number, y: number) => ops.push({ type: 'lineTo', x, y }),
    closePath: () => ops.push({ type: 'closePath' }),
  } as unknown as CanvasRenderingContext2D;

  traceHudStarPath(mockCtx, 262, 47, 8.4, 8.4 * 0.44, 5);
  assert.equal(ops[0].type, 'beginPath');
  assert.equal(ops.filter((o) => o.type === 'moveTo').length, 1);
  assert.equal(ops.filter((o) => o.type === 'lineTo').length, 9, '5-point star has 10 vertices total');
  assert.equal(ops[ops.length - 1].type, 'closePath');
  // Top star tip points straight upward at (cx, cy - outerR)
  assert.ok(Math.abs((ops[1].x ?? 0) - 262) < 1e-6);
  assert.ok(Math.abs((ops[1].y ?? 0) - (47 - 8.4)) < 1e-6);

  const gameSrc = fs.readFileSync(
    path.join(process.cwd(), 'src/games/gunhit/game/Game.ts'),
    'utf8',
  );
  const hudStart = gameSrc.indexOf('private drawHUD(');
  const hudSlice = gameSrc.slice(hudStart);
  assert.ok(hudSlice.includes('traceHudStarPath('), 'drawHUD draws a 5-point star for the boss indicator');
  assert.ok(!hudSlice.includes('c.rect(-6, -6, 12, 12)'), 'old wajik rotated rect is removed from drawHUD');
});

test('The weapon draws 20% smaller (0.864x) and the wheel position is 28% higher up', async () => {
  const {
    BASE_WHEEL_CY,
    CY,
    SPECIAL_CY,
    GAMEPLAY_GUN_SCALE,
    GUN_Y,
    H,
    Game,
  } = await import('../src/games/gunhit/game/Game');

  assert.equal(BASE_WHEEL_CY, 255);
  // The board was lifted so the bigger rig keeps a gap: it now sits as high as
  // the top HUD allows (the 15% ask clamps here, see `layout.ts`).
  assert.equal(CY, 154);
  assert.equal(SPECIAL_CY, CY, 'bonus/special stage wheel sits on the same line (154) as the normal wheel');

  // Requested: the gameplay rig is the title screen's size — the roster's
  // median gun needs 1.12x to fill the menu's ink box — and the board (wheel,
  // boss head, rock, treasure chest) is pushed as far back as the HUD allows.
  assert.ok(Math.abs(GAMEPLAY_GUN_SCALE - 1.12) < 5e-3, 'the weapon draws at the menu size (~1.12x)');
  assert.equal(GUN_Y, 552, 'the muzzle rides at the bottom with the grip flush');
  const rim = CY + Math.round(106 * 0.9); // 249
  assert.equal(GUN_Y - rim, 303, 'muzzle-to-rim gap after the bigger rig');

  const scales: [number, number][] = [];
  const gradient = { addColorStop: () => undefined };
  const ctx = new Proxy({ canvas: { width: 420, height: 760 } } as Record<string, unknown>, {
    get(target, prop) {
      const name = String(prop);
      if (name === 'canvas') return target.canvas;
      if (name === 'scale') {
        return (sx: number, sy: number) => {
          scales.push([sx, sy]);
        };
      }
      if (name === 'createLinearGradient' || name === 'createRadialGradient' || name === 'createPattern') {
        return () => gradient;
      }
      if (name === 'measureText') return () => ({ width: 8 });
      return () => undefined;
    },
    set(target, prop, value) {
      target[String(prop)] = value;
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;

  const canvas = {
    width: 420,
    height: 760,
    style: {},
    getContext: () => ctx,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 420, height: 760 }),
  } as unknown as HTMLCanvasElement;

  const game = new Game(canvas, { onGameOver: () => {} });
  try {
    game.startAtLevel(3);
    const internal = game as unknown as {
      targetY: number;
      level: { radius: number };
      render: () => void;
      twinGuns: boolean;
    };
    assert.equal(internal.targetY, 154, 'normal stage wheel sits at CY=154');
    assert.equal(game.getWheelStyle(), 'orange', 'stage 3 uses the orange wheel style');
    assert.ok(
      internal.targetY - internal.level.radius > 58,
      'wheel top edge stays cleanly below top HUD & stage star row',
    );

    scales.length = 0;
    internal.render();
    assert.ok(
      scales.some(([sx, sy]) => Math.abs(sx - GAMEPLAY_GUN_SCALE) < 1e-6 && Math.abs(sy - GAMEPLAY_GUN_SCALE) < 1e-6),
      'single gameplay weapon renders at the (0.864x) package scale',
    );

    scales.length = 0;
    internal.twinGuns = true;
    internal.render();
    assert.ok(
      scales.some(([sx, sy]) => Math.abs(sx + GAMEPLAY_GUN_SCALE) < 1e-6 && Math.abs(sy - GAMEPLAY_GUN_SCALE) < 1e-6),
      'mirrored left twin gun renders with (-scale, scale)',
    );
    assert.ok(
      scales.some(([sx, sy]) => Math.abs(sx - GAMEPLAY_GUN_SCALE) < 1e-6 && Math.abs(sy - GAMEPLAY_GUN_SCALE) < 1e-6),
      'right twin gun renders with (scale, scale)',
    );
  } finally {
    game.destroy();
  }
});

test('Wheel & special-stage sunburst keeps Gun Hit\'s own warm stage colours and always renders behind the wheel', async () => {
  const {
    AMBER_WHEEL_SUNBURST,
    WHITE_WHEEL_SUNBURST,
    getWheelSunburstTheme,
    getSpecialSunburstTheme,
    WHEEL_SUNBURST_THEMES,
  } = await import('../src/games/gunhit/game/sunburstPalette');

  // The pure white lab sunburst still exists, but it is no longer forced on
  // every stage: the game shows the amber rays it always had.
  assert.equal(WHITE_WHEEL_SUNBURST.rgb, '255,255,255');
  assert.equal(AMBER_WHEEL_SUNBURST.rgb, '255,196,92');
  assert.ok(AMBER_WHEEL_SUNBURST.burstColors.includes('#fde047'), 'the wheel sunburst is warm gold again');

  const seen = new Set<string>();
  for (const style of ['orange', 'wood', 'target', 'knight', 'oni', 'cyborg', 'pirate'] as const) {
    const theme = getWheelSunburstTheme(style);
    assert.notEqual(theme.rgb, '255,255,255', `${style} wheel sunburst is a stage colour, not lab white`);
    seen.add(theme.rgb);
  }
  assert.ok(seen.size >= 5, 'each stage family keeps its own sunburst colour');
  for (const mode of ['bonus', 'treasure', 'boulder'] as const) {
    const theme = getSpecialSunburstTheme(mode);
    assert.notEqual(theme.rgb, '255,255,255', `${mode} special sunburst is a stage colour`);
  }
  assert.equal(Object.keys(WHEEL_SUNBURST_THEMES).length, 7);

  const gameSrc = fs.readFileSync(
    path.join(process.cwd(), 'src/games/gunhit/game/Game.ts'),
    'utf8',
  );
  const renderSlice = gameSrc.slice(gameSrc.indexOf('private render()'));
  const lastSunburstIdx = renderSlice.lastIndexOf('drawBehindWheelSunburst(');
  assert.ok(lastSunburstIdx > 0, 'render() paints behind-wheel pure-white sunburst');

  for (const frontTarget of [
    'this.rock.draw(',
    'this.drawBonusRing(',
    'this.chest.draw(',
    'c.drawImage(this.face,',
    'for (const f of this.frags)',
  ]) {
    const frontIdx = renderSlice.indexOf(frontTarget);
    assert.ok(frontIdx > lastSunburstIdx, `sunburst always renders strictly behind ${frontTarget}`);
  }

  // Special overlay center halo is also soft white, never yellow
  assert.ok(!renderSlice.includes('rgba(251,191,36,0.26)'), 'yellow special-stage center halo removed');

  const appSrc = fs.readFileSync(
    path.join(process.cwd(), 'src/games/gunhit/App.tsx'),
    'utf8',
  );
  assert.ok(!appSrc.includes('z-35'), 'no front z-35 DOM sunburst overlay above gameplay canvas');
});

test('Bonus stage coin sprites avoid per-frame clip()/save-restore, skip rock hitStop on bonus, and prebake rock/chest/shards', async () => {
  const coinSrc = fs.readFileSync(
    path.join(process.cwd(), 'src/games/shared/coinArt.ts'),
    'utf8',
  );
  const drawFnSlice = coinSrc.slice(coinSrc.indexOf('export function drawBreakerCoin'));
  assert.ok(!drawFnSlice.includes('.clip('), 'drawBreakerCoin does zero per-frame ctx.clip() stencil passes');

  const gameSrc = fs.readFileSync(
    path.join(process.cwd(), 'src/games/gunhit/game/Game.ts'),
    'utf8',
  );
  assert.ok(gameSrc.includes('private get steadyTargetY()'), 'Boss rise/fall uses steadyTargetY so Retina backdrops never reallocate per frame');
  assert.ok(gameSrc.includes('specialOverlayCanvas'), 'Special/Bonus stage caches its fullscreen tint & halo overlay');
  assert.ok(!gameSrc.includes('this.hitStop = Math.max(this.hitStop, 0.018);'), 'rapid rock hits no longer pause the world');
  assert.ok(gameSrc.includes('this.rock?.prebake();'), 'DiamondRock prebakes on stage load');

  const { drawBossMuzzleFlash, drawBossProjectile } = await import('../src/games/gunhit/game/bossProjectileArt');
  const ops: string[] = [];
  const gradient = { addColorStop: () => undefined };
  const mockCtx = new Proxy({}, {
    get: (_t, prop) => (..._args: unknown[]) => {
      const name = String(prop);
      ops.push(name);
      if (name === 'createLinearGradient' || name === 'createRadialGradient') return gradient;
      return undefined;
    },
    set: () => true,
  }) as unknown as CanvasRenderingContext2D;

  for (const type of ['knight', 'oni', 'cyborg', 'pirate'] as const) {
    ops.length = 0;
    drawBossMuzzleFlash(mockCtx, { x: 210, y: 240, rot: 0, type, age: 0.05, max: 0.28 });
    assert.ok(ops.includes('arc') && ops.includes('fill'), `muzzle flash renders for ${type}`);
    ops.length = 0;
    drawBossProjectile(mockCtx, { x: 210, y: 340, vx: 0, vy: 360, rot: 0, type }, 1.2);
    assert.ok(ops.length > 25, `upgraded boss projectile renders multi-layered art for ${type}`);
  }
});
