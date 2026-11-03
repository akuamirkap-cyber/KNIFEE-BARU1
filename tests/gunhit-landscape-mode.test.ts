/**
 * MODE TAMPILAN: POTRET ↔ LANDSCAPE.
 *
 * Landscape bukan dunia baru: dunia 420×760 yang sama diputar seperempat
 * putaran saat digambar, jadi senjata berdiri di tepi kiri dan menembak ke
 * kanan, sementara roda/musuh pindah ke tepi kanan. Tes ini menjaga tiga hal:
 *
 *  1. geometri putaran (senjata kiri → musuh kanan, peluru terbang ke kanan),
 *  2. engine & shell (ukuran kanvas, transform dasar, fase kepala bos, HUD,
 *     pilihan yang tersimpan, permintaan orientasi perangkat),
 *  3. potret tidak berubah sedikit pun (angka HUD lama, rot 0 untuk bos,
 *     kanvas 420×760).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

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
  matchMedia: () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} }),
});
installSilentAudio();

const read = (file: string) => readFileSync(path.join(process.cwd(), file), 'utf8');

const {
  CX,
  CY,
  GUN_Y,
  H,
  LANDSCAPE_VIEW,
  PORTRAIT_VIEW,
  UPRIGHT_SPIN,
  W,
  baseViewTransform,
  viewSize,
  viewToWorld,
  worldToView,
} = await import('../src/games/gunhit/game/layout.ts');
const {
  DEFAULT_SGA_ORIENTATION,
  LANDSCAPE_FRAME,
  PORTRAIT_FRAME,
  SGA_ORIENTATION_OPTIONS,
  SGA_ORIENTATION_STORAGE_KEY,
  frameForOrientation,
  getActiveShellFrame,
  getSavedSgaOrientation,
  normalizeSgaOrientation,
  setActiveShellFrame,
  setSavedSgaOrientation,
  subscribeActiveShellFrame,
  subscribeSgaOrientation,
} = await import('../src/games/gunhit/game/orientation.ts');
const { storage } = await import('../src/games/gunhit/game/safeStorage.ts');
const { EN } = await import('../src/i18n/strings.ts');
const { Game } = await import('../src/games/gunhit/game/Game.ts');

/* ------------------------------------------------------------------ harness */

type AnyGame = Record<string, any>;

const gradient = { addColorStop: () => undefined };

/**
 * A recording 2D context: every `setTransform` and `rotate` is written down so
 * the tests can see which frame a layer was painted in.
 */
function makeRecorder() {
  const transforms: number[][] = [];
  const rotates: number[] = [];
  const state = { font: '' };
  const ctx = new Proxy({} as Record<string, unknown>, {
    get(_target, prop: string) {
      if (prop === 'canvas') return canvas;
      if (prop === 'measureText') return (text: string) => ({ width: String(text).length * 6 });
      if (prop === 'createLinearGradient' || prop === 'createRadialGradient' || prop === 'createPattern') {
        return () => gradient;
      }
      if (prop === 'getTransform') {
        return () => {
          const last = transforms[transforms.length - 1] ?? [1, 0, 0, 1, 0, 0];
          return { a: last[0], b: last[1], c: last[2], d: last[3], e: last[4], f: last[5] };
        };
      }
      return (...args: unknown[]) => {
        if (prop === 'setTransform') transforms.push(args.map(Number));
        if (prop === 'rotate') rotates.push(Number(args[0]));
        return undefined;
      };
    },
    set(_target, prop: string, value) {
      if (prop === 'font') state.font = String(value);
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;
  const canvas = {
    width: 420,
    height: 760,
    style: {} as Record<string, string>,
    getContext: () => ctx,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    getBoundingClientRect: () => ({ left: 0, top: 0, width: canvas.width, height: canvas.height }),
  };
  return { ctx, canvas, transforms, rotates, state };
}

const events = {
  onGameOver: () => undefined,
  onStageChange: () => undefined,
  onStageCleared: () => undefined,
  onShotFired: () => undefined,
  onBossDefeated: () => undefined,
};

function createGame(landscape: boolean, stage = 3): { game: AnyGame; recorder: ReturnType<typeof makeRecorder> } {
  const recorder = makeRecorder();
  const game = new Game(recorder.canvas as unknown as HTMLCanvasElement, events as never) as unknown as AnyGame;
  game.setWeapon('pistol');
  if (landscape) game.setOrientation('landscape');
  game.startAtLevel(stage);
  game.state = 'play';
  return { game, recorder };
}

/* --------------------------------------------------------------- 1. geometry */

test('landscape memutar dunia: senjata di kiri, roda/musuh di kanan, satu garis bidik', () => {
  assert.deepEqual(viewSize(false), { w: W, h: H }, 'potret tetap 420×760');
  assert.deepEqual(viewSize(true), { w: H, h: W }, 'landscape 760×420 (dunia yang sama, diputar)');
  assert.deepEqual(PORTRAIT_VIEW, { w: 420, h: 760 });
  assert.deepEqual(LANDSCAPE_VIEW, { w: 760, h: 420 });

  const gun = worldToView(CX, GUN_Y, true);
  const wheel = worldToView(CX, CY, true);
  assert.equal(gun.x, 200, 'pangkal senjata mendarat 200 px dari tepi kiri');
  assert.equal(wheel.x, 576, 'roda/musuh pindah ke sisi kanan');
  assert.ok(gun.x < wheel.x, 'senjata di kiri, musuh di kanan');
  assert.equal(gun.y, wheel.y, 'senjata dan musuh segaris horizontal di tengah layar');
  assert.equal(gun.y, LANDSCAPE_VIEW.h / 2, 'garis bidiknya tepat di tengah tinggi layar');

  // Ujung laras (dunia: lebih tinggi = lebih dekat ke roda) harus lebih kanan.
  const muzzle = worldToView(CX, GUN_Y - 120, true);
  assert.ok(muzzle.x > gun.x, 'laras menunjuk ke kanan, ke arah musuh');

  for (const point of [[0, 0], [CX, CY], [CX, GUN_Y], [W - 1, H - 1], [12, 700]] as const) {
    const view = worldToView(point[0], point[1], true);
    const back = viewToWorld(view.x, view.y, true);
    assert.ok(Math.abs(back.x - point[0]) < 1e-9 && Math.abs(back.y - point[1]) < 1e-9,
      `dunia ↔ layar bolak-balik untuk (${point[0]}, ${point[1]})`);
    // Potret tidak pernah memindahkan apa pun.
    assert.deepEqual(worldToView(point[0], point[1], false), { x: point[0], y: point[1] });
  }
});

test('transform dasar landscape = rotasi +90° lalu geser selebar dunia', () => {
  assert.deepEqual(baseViewTransform(1, false), [1, 0, 0, 1, 0, 0]);
  assert.deepEqual(baseViewTransform(2, false), [2, 0, 0, 2, 0, 0]);
  assert.deepEqual(baseViewTransform(2, true), [0, 2, -2, 0, 2 * H, 0]);

  // Matriksnya harus memetakan titik dunia ke titik layar yang sama dengan
  // worldToView (dalam px CSS, jadi dibagi dpr).
  const k = 3;
  const [a, b, c, d, e, f] = baseViewTransform(k, true);
  for (const [x, y] of [[CX, GUN_Y], [CX, CY], [0, 0], [W, H]] as const) {
    const view = worldToView(x, y, true);
    assert.ok(Math.abs((a * x + c * y + e) / k - view.x) < 1e-9, `x layar untuk dunia (${x}, ${y})`);
    assert.ok(Math.abs((b * x + d * y + f) / k - view.y) < 1e-9, `y layar untuk dunia (${x}, ${y})`);
  }
  assert.ok(Math.abs(UPRIGHT_SPIN + Math.PI / 2) < 1e-12, 'putaran balik teks/kepala bos = -90°');
});

/* ------------------------------------------------------------ 2. orientation */

test('pilihan mode tampilan tersimpan, dinormalisasi, dan disiarkan ke pelanggan', () => {
  storage.removeItem(SGA_ORIENTATION_STORAGE_KEY);
  assert.equal(DEFAULT_SGA_ORIENTATION, 'portrait', 'bawaannya potret: tidak ada yang berubah saat upgrade');
  assert.equal(getSavedSgaOrientation(), 'portrait');
  assert.equal(normalizeSgaOrientation('landscape'), 'landscape');
  assert.equal(normalizeSgaOrientation('POTRET'), 'portrait', 'nilai tak dikenal jatuh ke bawaan');
  assert.equal(normalizeSgaOrientation(null), 'portrait');

  const seen: string[] = [];
  const unsub = subscribeSgaOrientation((next) => seen.push(next));
  try {
    assert.equal(setSavedSgaOrientation('landscape'), 'landscape');
    assert.equal(getSavedSgaOrientation(), 'landscape');
    assert.equal(storage.getItem(SGA_ORIENTATION_STORAGE_KEY), 'landscape', 'tersimpan untuk sesi berikutnya');
    assert.equal(setSavedSgaOrientation('portrait'), 'portrait');
    assert.equal(getSavedSgaOrientation(), 'portrait');
    assert.deepEqual(seen, ['landscape', 'portrait']);
  } finally {
    unsub();
    storage.removeItem(SGA_ORIENTATION_STORAGE_KEY);
  }

  assert.deepEqual(frameForOrientation('portrait'), PORTRAIT_FRAME);
  assert.deepEqual(frameForOrientation('landscape'), LANDSCAPE_FRAME);
  assert.deepEqual(PORTRAIT_FRAME, { width: 420, height: 760 });
  assert.deepEqual(LANDSCAPE_FRAME, { width: 760, height: 420 });
  assert.deepEqual(
    SGA_ORIENTATION_OPTIONS.map((option) => option.id),
    ['portrait', 'landscape'],
  );
});

test('bingkai shell yang aktif diterbitkan permainan dan dikembalikan ke potret', () => {
  const seen: { width: number; height: number }[] = [];
  const unsub = subscribeActiveShellFrame((frame) => seen.push(frame));
  try {
    setActiveShellFrame(PORTRAIT_FRAME);
    setActiveShellFrame(LANDSCAPE_FRAME);
    setActiveShellFrame(LANDSCAPE_FRAME); // nilai sama tidak disiarkan dua kali
    setActiveShellFrame(PORTRAIT_FRAME);
    assert.deepEqual(getActiveShellFrame(), PORTRAIT_FRAME);
    assert.deepEqual(seen, [LANDSCAPE_FRAME, PORTRAIT_FRAME]);
  } finally {
    unsub();
    setActiveShellFrame(PORTRAIT_FRAME);
  }
});

/* ---------------------------------------------------------------- 3. engine */

test('engine: kanvas & transform dasar ikut mode, dunia tetap 420×760', () => {
  const portrait = createGame(false);
  const canvas = portrait.recorder.canvas;
  assert.equal(canvas.style.width, '420px');
  assert.equal(canvas.style.height, '760px');
  assert.ok(Math.abs(canvas.width / canvas.height - 420 / 760) < 1e-6, 'backing store potret 9:16');
  portrait.recorder.transforms.length = 0;
  portrait.game.render();
  const [pa, pb, pc, pd] = portrait.recorder.transforms[0];
  assert.ok(pa === pb * 0 + pa && pa !== 0 && pb === 0 && pc === 0 && pd === pa, 'potret: scale murni, tanpa rotasi');
  assert.equal(portrait.game.getOrientation(), 'portrait');
  assert.equal(portrait.game.isLandscape(), false);
  portrait.game.destroy();

  const landscape = createGame(true);
  assert.equal(landscape.recorder.canvas.style.width, '760px', 'kanvas jadi 760 px lebar');
  assert.equal(landscape.recorder.canvas.style.height, '420px');
  assert.ok(
    Math.abs(landscape.recorder.canvas.width / landscape.recorder.canvas.height - 760 / 420) < 1e-6,
    'backing store landscape 760×420',
  );
  assert.equal(landscape.game.getOrientation(), 'landscape');
  assert.equal(landscape.game.isLandscape(), true);
  landscape.recorder.transforms.length = 0;
  landscape.game.render();
  const first = landscape.recorder.transforms[0];
  const k = first[1];
  assert.deepEqual(first, [0, k, -k, 0, k * H, 0], 'frame pertama render diputar +90° dan digeser selebar dunia');
  // HUD dilukis lurus ke layar: ada transform tanpa rotasi setelah transform dasar.
  assert.ok(
    landscape.recorder.transforms.some(([a, b, c, d, e, f]) => b === 0 && c === 0 && a !== 0 && a === d && e === 0 && f === 0),
    'HUD landscape dilukis di ruang layar (tanpa rotasi)',
  );

  // Kembali ke potret di tengah run: ukuran & transformasinya pulih.
  landscape.game.setOrientation('portrait');
  assert.equal(landscape.recorder.canvas.style.width, '420px');
  assert.equal(landscape.recorder.canvas.style.height, '760px');
  landscape.recorder.transforms.length = 0;
  landscape.game.render();
  const back = landscape.recorder.transforms[0];
  assert.deepEqual(back, [back[0], 0, 0, back[0], 0, 0], 'kembali ke potret tanpa rotasi');
  landscape.game.destroy();
});

test('peluru terbang dari kiri ke kanan di landscape, dari bawah ke atas di potret', () => {
  for (const landscape of [false, true]) {
    const { game } = createGame(landscape, 3);
    game.ammoLeft = 5;
    game.cooldown = 0;
    game.shoot();
    const shot = game.projs[0];
    assert.ok(shot, 'satu peluru keluar dari senjata');
    const track: { x: number; y: number }[] = [];
    for (let i = 0; i < 6; i++) {
      game.update(1 / 60);
      const live = game.projs[0] ?? shot;
      track.push(worldToView(live.x, live.y, landscape));
    }
    const dx = track[track.length - 1].x - track[0].x;
    const dy = track[track.length - 1].y - track[0].y;
    if (landscape) {
      assert.ok(dx > 40, `peluru bergerak ke kanan di layar (dx=${dx.toFixed(1)})`);
      assert.ok(Math.abs(dy) < 12, `lintasannya mendatar di layar (dy=${dy.toFixed(1)})`);
    } else {
      assert.ok(dy < -40, `peluru bergerak naik di layar potret (dy=${dy.toFixed(1)})`);
      assert.ok(Math.abs(dx) < 12, `tetap di kolom tengah (dx=${dx.toFixed(1)})`);
    }
    game.destroy();
  }
});

test('kepala bos tetap tegak menghadap pemain di kedua mode', () => {
  const portrait = createGame(false, 5);
  assert.equal(portrait.game.level.boss, true, 'stage 5 adalah bos');
  assert.equal(portrait.game.rot, 0, 'potret: bos mulai tegak pada sudut 0');
  portrait.game.destroy();

  const landscape = createGame(true, 5);
  assert.equal(landscape.game.level.boss, true);
  assert.ok(
    Math.abs(landscape.game.rot - UPRIGHT_SPIN) < 1e-9,
    'landscape: fase bos digeser -90° supaya wajahnya tegak di layar',
  );
  // Membalik mode di tengah pertarungan menggeser fasenya kembali, bukan
  // membangun ulang stage-nya.
  landscape.game.setOrientation('portrait');
  assert.ok(Math.abs(landscape.game.rot) < 1e-9, 'kembali ke potret: bos tegak lagi');
  landscape.game.setOrientation('landscape');
  assert.ok(Math.abs(landscape.game.rot - UPRIGHT_SPIN) < 1e-9, 'dan landscape lagi tanpa memuat ulang stage');
  assert.equal(landscape.game.level.n, 5, 'stage-nya tetap stage yang sama');
  landscape.game.destroy();
});

test('HUD: potret memakai angka lama persis, landscape memakai layar 760×420', () => {
  const portrait = createGame(false, 3);
  const p = portrait.game.hudLayout();
  assert.deepEqual(
    { w: p.w, h: p.h, cx: p.cx },
    { w: 420, h: 760, cx: 210 },
    'HUD potret dilukis di dunia 420×760',
  );
  assert.equal(p.scoreX, 22);
  assert.equal(p.scoreY, 46);
  assert.equal(p.specialScoreY, 34);
  assert.equal(p.comboY, 74);
  assert.equal(p.ammoX, 30);
  assert.equal(p.ammoBaseY, H - 40);
  assert.equal(p.ammoTextX, 46);
  assert.equal(p.ammoTextY, H - 30);
  assert.equal(p.rightX, W - 14);
  assert.equal(p.labelY, H - 16);
  assert.equal(p.infoY, H - 36);
  assert.equal(p.spinBarX, W - 114);
  assert.equal(p.modeLabelY, 24);
  assert.equal(p.pillY, 30);
  assert.equal(p.pillTextY, 42);
  assert.equal(p.barY, 46);
  assert.equal(p.dotsY, 47);
  assert.equal(p.clearY, 330);
  assert.equal(p.bannerY, CY + portrait.game.level.radius + 115, 'banner potret tetap di bawah roda');
  // Dompet kanan atas tidak boleh menabrak baris tengah (aturan lama).
  assert.equal(p.cx + 126, 336);
  assert.equal(p.cx + 106, 316);
  portrait.game.destroy();

  const landscape = createGame(true, 3);
  const l = landscape.game.hudLayout();
  assert.deepEqual({ w: l.w, h: l.h, cx: l.cx }, { w: 760, h: 420, cx: 380 }, 'HUD landscape dilukis di layar 760×420');
  // Daerah yang sama, sudut yang sama: kiri atas skor, kanan atas dompet,
  // kiri bawah magasin, kanan bawah kartu senjata, tengah untuk banner.
  assert.ok(l.scoreX < 40 && l.scoreY < 60, 'skor tetap di kiri atas');
  const coinCx = l.w - 17.5 - l.coinEdge;
  assert.ok(coinCx > 700 && l.scoreY === 40, 'dompet menempati sudut kanan atas');
  assert.ok(l.ammoTextY > l.h - 30 && l.ammoX < 40, 'magasin di kiri bawah, di bawah senjata');
  assert.ok(l.ammoBaseY - l.ammoSpan > 240, 'kolom magasin tidak menabrak senjata di kiri tengah');
  assert.equal(l.rightX, l.w - 14);
  assert.ok(l.labelY > l.h - 20, 'kartu senjata di kanan bawah');
  assert.equal(l.bannerY, l.h / 2, 'banner tepat di tengah: antara senjata (kiri) dan roda (kanan)');
  // Tidak ada unsur HUD yang keluar layar.
  for (const [name, value, max] of [
    ['scoreX', l.scoreX, l.w], ['rightX', l.rightX, l.w], ['ammoTextY', l.ammoTextY, l.h],
    ['labelY', l.labelY, l.h], ['barY', l.barY, l.h], ['pillY', l.pillY, l.h], ['clearY', l.clearY, l.h],
  ] as const) {
    assert.ok(value >= 0 && value <= max, `${name}=${value} tetap di dalam layar ${max}`);
  }
  landscape.game.destroy();
});

test('callout, teks scope, magasin, dan reaksi bos dibalik supaya tegak di layar', () => {
  const game = read('src/games/gunhit/game/Game.ts');
  assert.match(game, /c\.rotate\(p\.rot \+ this\.uprightSpin\(\)\)/, 'callout damage dibalik seperempat putaran');
  assert.match(game, /c\.rotate\(this\.uprightSpin\(\)\);\s*\n\s*c\.fillText\(T\('LEPAS UNTUK MENEMBAK'\), 0, 0\)/,
    'teks scope menghadap pemain');
  assert.match(game, /if \(this\.landscape\) \{\s*\n\s*c\.translate\(x, y\);\s*\n\s*c\.rotate\(-this\.uprightSpin\(\)\);/,
    'isi magasin menunjuk ke arah tembakan (kanan)');
  assert.match(game, /private applyWheelSpin\(c: CanvasRenderingContext2D\)/, 'peti harta karun punya jalur tegak sendiri');
  assert.match(game, /c\.rotate\(this\.uprightSpin\(\)\);\s*\n\s*const HA_KEYS/,
    'reaksi bos (HA · HA · uap · MARAH!) digambar di ruang layar yang tegak');
  // Sentuhan dipetakan balik ke dunia, jadi bintang power-up tetap bisa disentuh.
  assert.match(game, /viewToWorld\(/, 'input layar dipetakan ke dunia');
  assert.match(game, /this\.events\.onDiamondCollected\?\.\(10, false, this\.toView\(x, y\)\)/,
    'penerbangan berlian DOM memakai koordinat layar');
});

/* ------------------------------------------------------------ 4. shell & UI */

class Mat {
  constructor(
    public a = 1,
    public b = 0,
    public c = 0,
    public d = 1,
    public e = 0,
    public f = 0,
  ) {}
  copy() {
    return new Mat(this.a, this.b, this.c, this.d, this.e, this.f);
  }
  /** CTM = CTM × m (urutan komposisi canvas). */
  times(m: Mat) {
    const { a, b, c, d, e, f } = this;
    return new Mat(
      a * m.a + c * m.b,
      b * m.a + d * m.b,
      a * m.c + c * m.d,
      b * m.c + d * m.d,
      a * m.e + c * m.f + e,
      b * m.e + d * m.f + f,
    );
  }
  apply(x: number, y: number) {
    return { x: this.a * x + this.c * y + this.e, y: this.b * x + this.d * y + this.f };
  }
}

/** 6 angka, satu DOMMatrix, atau `ctx.getTransform()` yang disimpan engine. */
function toMat(args: unknown[], fallback: Mat): Mat {
  if (args.length === 1 && args[0] && typeof args[0] === 'object') {
    const m = args[0] as Record<string, number>;
    const nums = [m.a, m.b, m.c, m.d, m.e, m.f];
    if (nums.every((n) => typeof n === 'number' && Number.isFinite(n))) {
      return new Mat(nums[0], nums[1], nums[2], nums[3], nums[4], nums[5]);
    }
    return fallback;
  }
  const nums = args.slice(0, 6).map((a) => Number(a));
  return nums.length === 6 && nums.every((n) => Number.isFinite(n))
    ? new Mat(nums[0], nums[1], nums[2], nums[3], nums[4], nums[5])
    : fallback;
}

type TextCall = { text: string; screen: { x: number; y: number }; baseline: { x: number; y: number } };

/**
 * Merekam setiap teks beserta transform aktifnya, lalu mengubahnya ke
 * koordinat layar — supaya bisa dipastikan teks HUD landscape benar-benar
 * tegak (baseline ke kanan) dan masih berada di dalam layar.
 */
function trackText(landscape: boolean): { render: () => void; texts: TextCall[] } {
  const view = viewSize(landscape);
  const texts: TextCall[] = [];
  let ctm = new Mat();
  const stack: Mat[] = [];
  const canvas = {
    width: Math.round(view.w),
    height: Math.round(view.h),
    style: {} as Record<string, string>,
    getContext: () => ctx,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    getBoundingClientRect: () => ({ left: 0, top: 0, width: view.w, height: view.h }),
  };
  const target = {
    canvas,
    globalAlpha: 1,
    lineWidth: 1,
    font: '12px sans-serif',
    textAlign: 'left',
    textBaseline: 'alphabetic',
    filter: 'none',
    globalCompositeOperation: 'source-over',
    measureText: (s: string) => {
      const px = Number(/(\d+(?:\.\d+)?)px/.exec(target.font)?.[1] ?? 12);
      return { width: s.length * px * 0.55 };
    },
    getImageData: (sx: number, sy: number, sw: number, sh: number) => ({
      data: new Uint8ClampedArray(Math.max(4, Math.ceil(sw) * Math.ceil(sh) * 4)),
      width: Math.max(1, Math.ceil(sw)),
      height: Math.max(1, Math.ceil(sh)),
    }),
    createImageData: (w: number, h: number) => ({
      data: new Uint8ClampedArray(Math.max(4, Math.ceil(w) * Math.ceil(h) * 4)),
      width: Math.max(1, Math.ceil(w)),
      height: Math.max(1, Math.ceil(h)),
    }),
    getTransform: () => ctm.copy(),
    resetTransform: () => {
      ctm = new Mat();
    },
    setTransform: (...args: unknown[]) => {
      ctm = toMat(args, new Mat());
    },
    transform: (...args: unknown[]) => {
      ctm = ctm.times(toMat(args, new Mat()));
    },
    translate: (x: number, y: number) => {
      ctm = ctm.times(new Mat(1, 0, 0, 1, x, y));
    },
    rotate: (r: number) => {
      ctm = ctm.times(new Mat(Math.cos(r), Math.sin(r), -Math.sin(r), Math.cos(r), 0, 0));
    },
    scale: (x: number, y: number) => {
      ctm = ctm.times(new Mat(x, 0, 0, y, 0, 0));
    },
    save: () => stack.push(ctm.copy()),
    restore: () => {
      const popped = stack.pop();
      if (popped) ctm = popped;
    },
    fillText: (text: unknown, x: unknown, y: unknown) => record(String(text), Number(x), Number(y)),
    strokeText: (text: unknown, x: unknown, y: unknown) => record(String(text), Number(x), Number(y)),
  };
  function record(text: string, x: number, y: number) {
    if (!text || !Number.isFinite(x) || !Number.isFinite(y)) return;
    const len = Math.hypot(ctm.a, ctm.b) || 1;
    texts.push({
      text,
      screen: ctm.apply(x, y),
      baseline: { x: ctm.a / len, y: ctm.b / len },
    });
  }
  const ctx = new Proxy(target, {
    get(obj, prop) {
      if (prop === 'createLinearGradient' || prop === 'createRadialGradient' || prop === 'createPattern') {
        return () => gradient;
      }
      return prop in obj ? (obj as never)[prop as never] : () => undefined;
    },
    set(obj, prop, value) {
      (obj as never)[prop as never] = value;
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;
  const game = new Game(canvas as unknown as HTMLCanvasElement, events as never) as unknown as AnyGame;
  game.setWeapon('pistol');
  if (landscape) game.setOrientation('landscape');
  game.startAtLevel(5);
  game.state = 'play';
  return {
    render: () => {
      texts.length = 0;
      stack.length = 0;
      ctm = new Mat();
      game.render();
    },
    texts,
  };
}

/**
 * Teks HUD dikenali dari bentuknya, bukan dari isinya, supaya nama senjata/bos
 * yang dinamis tetap terperiksa. Label yang tertancap di papan ("2x", "1x!")
 * sengaja tidak termasuk: ia ikut berputar bersama papan di kedua mode.
 */
const HUD_TEXT_PATTERNS: RegExp[] = [
  /^\d+$/, // skor & jumlah koin di dompet
  /^\d+ \/ \d+ HP$/, // angka bar darah bos
  /^x\d+$/, // magasin
  /\u2022/, // label mode ("BOSS • …") & label senjata ("PISTOL • …")
  /STAGE CLEAR|\u26a0|AMMO|MAGASIN|SPIN/i,
];

const isHudText = (text: string) => HUD_TEXT_PATTERNS.some((re) => re.test(text));

test('semua teks HUD landscape tegak menghadap pembaca dan tetap di dalam layar', () => {
  const view = viewSize(true);
  const { render, texts } = trackText(true);
  render();
  const hudTexts = texts.filter((entry) => isHudText(entry.text));
  assert.ok(hudTexts.length >= 8, `teks HUD landscape terlalu sedikit: ${hudTexts.length}`);

  for (const entry of hudTexts) {
    assert.ok(
      Math.abs(entry.baseline.y) < 0.02 && entry.baseline.x > 0.98,
      `teks HUD "${entry.text}" tidak tegak (baseline ${entry.baseline.x.toFixed(2)}, ${entry.baseline.y.toFixed(2)})`,
    );
    assert.ok(
      entry.screen.x >= -view.w * 0.05 &&
        entry.screen.x <= view.w * 1.05 &&
        entry.screen.y >= -view.h * 0.05 &&
        entry.screen.y <= view.h * 1.05,
      `teks HUD "${entry.text}" keluar layar: (${entry.screen.x.toFixed(0)}, ${entry.screen.y.toFixed(0)})`,
    );
  }

  // Paritas: mode landscape tidak menambah atau mengurangi satu pun teks HUD.
  const portrait = trackText(false);
  portrait.render();
  const unique = (list: TextCall[]) => [...new Set(list.map((entry) => entry.text))].sort();
  assert.deepEqual(unique(hudTexts), unique(portrait.texts.filter((entry) => isHudText(entry.text))));
});

test('shell aplikasi mengikuti bingkai permainan dan meminta orientasi perangkat', () => {
  const shell = read('src/App.tsx');
  assert.match(shell, /subscribeActiveShellFrame/, 'shell berlangganan bingkai aktif');
  assert.match(shell, /baseWidth=\{shellFrame\.width\}/);
  assert.match(shell, /baseHeight=\{shellFrame\.height\}/);

  const app = read('src/games/gunhit/App.tsx');
  assert.match(app, /useSgaOrientation\(\)/, 'Game A membaca pilihan mode tampilan');
  assert.match(app, /const landscapeGameplay = orientation === 'landscape' && screen === 'playing'/,
    'hanya permainan yang berjalan yang boleh landscape');
  assert.match(app, /setActiveShellFrame\(shellFrame\)/, 'Game A menerbitkan bingkainya ke shell');
  assert.match(app, /engine\.setOrientation\(landscapeGameplay \? 'landscape' : 'portrait'\)/);
  assert.match(app, /requestScreenOrientation\(landscapeGameplay \? 'landscape' : 'portrait'\)/,
    'di Android HP-nya ikut diputar');
  assert.match(app, /useEffect\(\(\) => \(\) => setActiveShellFrame\(PORTRAIT_FRAME\), \[\]\)/,
    'shell tidak tertinggal di landscape saat permainan dilepas');
  assert.match(app, /style=\{\{ width: shellFrame\.width, height: shellFrame\.height \}\}/,
    'bingkai permainan memakai ukuran aktif');
  assert.match(app, /data-orientation=\{landscapeGameplay \? 'landscape' : 'portrait'\}/);
  assert.match(app, /orientation !== 'landscape' && fromMenu && captureMenuWeaponFlight\(\)/,
    'penerbangan senjata menu (tegak) dilewati di landscape');
  assert.match(app, /<FitLandscape active=\{landscapeGameplay\}/, 'modal gameplay disesuaikan ke bingkai pendek');
});

test('mode tampilan bisa dipilih dari Pengaturan menu dan dari jeda permainan', () => {
  const settings = read('src/games/gunhit/components/SgaSettingsPanel.tsx');
  assert.match(settings, /orientation: SgaOrientation;/);
  assert.match(settings, /orientationOptions: readonly SgaOrientationOption\[\];/);
  assert.match(settings, /onOrientation: \(value: SgaOrientation\) => void;/);
  assert.match(settings, /MODE TAMPILAN/);
  assert.match(settings, /data-orientation=\{item\.id\}/);

  const app = read('src/games/gunhit/App.tsx');
  const modalStart = app.indexOf("{screen === 'playing' && inGameSettingsOpen && (");
  const modalEnd = app.indexOf("{screen === 'menu' && arsenalOpen && (", modalStart);
  assert.notEqual(modalStart, -1);
  assert.notEqual(modalEnd, -1);
  const modal = app.slice(modalStart, modalEnd);
  assert.match(modal, /MODE TAMPILAN/, 'jeda permainan menawarkan mode tampilan');
  assert.match(modal, /SGA_ORIENTATION_OPTIONS\.map/);
  assert.match(modal, /setOrientation\(option\.id\)/);
  assert.match(modal, /LANJUTKAN MAIN/, 'tombol lama tetap ada');

  assert.match(app, /orientation=\{orientation\}/);
  assert.match(app, /orientationOptions=\{SGA_ORIENTATION_OPTIONS\}/);
  assert.match(app, /onOrientation=\{setOrientation\}/);
});

test('plugin orientasi Android dipasang lazy dan tidak mengubah kunci potret bawaan', () => {
  const util = read('src/utils/screenOrientation.ts');
  assert.match(util, /await import\('@capacitor\/screen-orientation'\)/, 'plugin dimuat hanya saat dibutuhkan');
  assert.match(util, /ScreenOrientation\.lock\(\{ orientation: lock \}\)/);
  assert.match(util, /isNativePlatform/, 'di browser tidak ada panggilan native');

  const pkg = JSON.parse(read('package.json')) as { dependencies: Record<string, string> };
  assert.ok(pkg.dependencies['@capacitor/screen-orientation'], 'plugin jadi dependensi');

  const gradle = read('android/capacitor.settings.gradle');
  assert.match(gradle, /capacitor-screen-orientation/, 'proyek Android menyertakan pluginnya');

  // Aktivitasnya tetap dikunci potret: hanya run landscape yang memintanya berputar.
  assert.match(read('android/app/src/main/AndroidManifest.xml'), /android:screenOrientation="portrait"/);
});

test('label & keterangan mode tampilan punya terjemahan Inggris', () => {
  for (const option of SGA_ORIENTATION_OPTIONS) {
    for (const text of [option.label, option.desc]) {
      if (!/[a-z]/i.test(text)) continue;
      if (text === 'LANDSCAPE') continue; // sudah bahasa Inggris
      assert.ok(text in EN, `"${text}" ada di katalog EN`);
      assert.notEqual(EN[text], text, `"${text}" benar-benar diterjemahkan`);
    }
  }
  for (const text of [
    'MODE TAMPILAN',
    'Landscape: senjata di kiri menembak ke kanan, musuh di kanan',
    'POTRET',
  ]) {
    assert.ok(text in EN, `"${text}" ada di katalog EN`);
    assert.notEqual(EN[text], text);
  }
});
