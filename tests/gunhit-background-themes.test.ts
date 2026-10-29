import test from 'node:test';
import assert from 'node:assert/strict';

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

const { Game } = await import('../src/games/gunhit/game/Game');
const {
  DEFAULT_SGA_BG_THEME,
  SGA_BG_THEMES,
  SGA_BG_THEME_IDS,
  SGA_BG_THEME_STORAGE_KEY,
  getSavedSgaBgTheme,
  normalizeSgaBgTheme,
  setSavedSgaBgTheme,
  subscribeSgaBgTheme,
} = await import('../src/games/gunhit/game/backgroundThemes');
const { storage } = await import('../src/games/gunhit/game/safeStorage');

function stub2d(log?: string[]): CanvasRenderingContext2D {
  const gradient = { addColorStop: (stop: number, color: string) => log?.push(`stop:${stop}:${color}`) };
  return new Proxy(
    { canvas: { width: 420, height: 760 } } as Record<string, unknown>,
    {
      get: (target, prop) => {
        if (prop === 'canvas') return target.canvas;
        if (
          prop === 'createLinearGradient' ||
          prop === 'createRadialGradient' ||
          prop === 'createConicGradient' ||
          prop === 'createPattern'
        ) {
          return () => gradient;
        }
        if (prop === 'measureText') return () => ({ width: 10 });
        if (prop === 'getImageData') return () => ({ data: new Uint8ClampedArray(16) });
        if (log && ['fillRect', 'drawImage', 'arc', 'moveTo', 'lineTo', 'quadraticCurveTo', 'stroke'].includes(String(prop))) {
          return (...args: unknown[]) => log.push(`${String(prop)}:${args.length}`);
        }
        return () => undefined;
      },
      set: (target, prop, value) => {
        target[String(prop)] = value;
        if (log && prop === 'fillStyle' && typeof value === 'string') {
          log.push(`fill:${value}`);
        }
        return true;
      },
    },
  ) as unknown as CanvasRenderingContext2D;
}

test('SGA background theme catalog exposes all 13 themes, defaults to forest, and persists live', () => {
  assert.equal(SGA_BG_THEMES.length, 13);
  assert.equal(DEFAULT_SGA_BG_THEME, 'forest');
  assert.equal(normalizeSgaBgTheme('unknown_theme'), 'forest');

  const prev = storage.getItem(SGA_BG_THEME_STORAGE_KEY);
  try {
    storage.removeItem(SGA_BG_THEME_STORAGE_KEY);
    assert.equal(getSavedSgaBgTheme(), 'forest');

    const seen: string[] = [];
    const unsub = subscribeSgaBgTheme((t) => seen.push(t));
    for (const id of SGA_BG_THEME_IDS) {
      setSavedSgaBgTheme(id);
      assert.equal(getSavedSgaBgTheme(), id);
    }
    unsub();
    assert.deepEqual(seen, [...SGA_BG_THEME_IDS]);
  } finally {
    if (prev === null) storage.removeItem(SGA_BG_THEME_STORAGE_KEY);
    else storage.setItem(SGA_BG_THEME_STORAGE_KEY, prev);
  }
});

test('every selectable SGA background theme functions inside live Game rendering across weapons', () => {
  for (const theme of SGA_BG_THEME_IDS) {
    const log: string[] = [];
    const canvas = {
      width: 420,
      height: 760,
      clientWidth: 420,
      clientHeight: 760,
      style: {},
      getContext: () => stub2d(log),
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 420, height: 760 }),
    } as unknown as HTMLCanvasElement;

    const game = new Game(canvas, {
      onHud: () => undefined,
      onStageClear: () => undefined,
      onGameOver: () => undefined,
    }) as unknown as {
      setBackgroundTheme: (t: typeof theme) => void;
      getBackgroundTheme: () => string;
      setWeapon: (id: string) => void;
      startAtLevel: (n: number) => void;
      update: (dt: number) => void;
      render: () => void;
    };

    game.setBackgroundTheme(theme);
    assert.equal(game.getBackgroundTheme(), theme);

    for (const wid of ['pistol', 'bazooka', 'shark']) {
      game.setWeapon(wid);
      game.startAtLevel(1);
      game.update(1 / 60);
      log.length = 0;
      assert.doesNotThrow(() => game.render(), `theme ${theme} renders cleanly with ${wid}`);
      assert.ok(log.length > 5, `theme ${theme} emits canvas paint ops with ${wid}`);
    }

    (game as unknown as Game).destroy();
  }
});

test('concrete themes (morning, town, snow, royal_vault, cyber_grid, nebula) paint distinct skies even with Bazooka equipped', () => {
  const signatures = new Map<string, string>();
  const savedDoc = g.document;

  for (const theme of ['morning', 'town', 'snow', 'royal_vault', 'cyber_grid', 'nebula'] as const) {
    const log: string[] = [];
    const canvas = {
      width: 420,
      height: 760,
      clientWidth: 420,
      clientHeight: 760,
      style: {},
      getContext: () => stub2d(log),
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 420, height: 760 }),
    } as unknown as HTMLCanvasElement;

    const game = new Game(canvas, {
      onHud: () => undefined,
      onStageClear: () => undefined,
      onGameOver: () => undefined,
    }) as unknown as {
      setBackgroundTheme: (t: typeof theme) => void;
      setWeapon: (id: string) => void;
      startAtLevel: (n: number) => void;
      drawForestBackground: (
        c: CanvasRenderingContext2D,
        pal: { bgTop: string; bgBot: string; glow: string; chips: string[]; gridColor: string },
        r: number,
      ) => void;
    };

    game.setWeapon('bazooka');
    game.startAtLevel(1);
    game.setBackgroundTheme(theme);

    delete g.document;
    log.length = 0;
    try {
      game.drawForestBackground(
        stub2d(log),
        { bgTop: '#1b4d59', bgBot: '#153743', glow: 'rgba(255,165,0,0.32)', chips: [], gridColor: '' },
        106,
      );
    } finally {
      g.document = savedDoc;
    }

    const stops = log.filter((entry) => entry.startsWith('stop:')).slice(0, 4).join('|');
    assert.ok(stops.length > 0, `${theme} paints gradient stops`);
    signatures.set(theme, stops);
    (game as unknown as Game).destroy();
  }

  assert.equal(new Set(signatures.values()).size, 6, 'all 6 themes paint distinct sky gradients');
});
