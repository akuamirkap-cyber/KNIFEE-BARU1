/**
 * Aset toko Play Console, dirender dari mesin game yang sebenarnya.
 *
 * Usage: npx tsx tools/make-store-assets.ts
 *
 * Yang dihasilkan (semua ke `store/`):
 *
 *   icon-512.png                    ikon hi-res 512×512 (wajib Play Console)
 *   feature-graphic-1024x500.png    feature graphic 1024×500 (wajib)
 *   screenshots/phone-01..04.png    screenshot ponsel 1080×1920 (minimal 2)
 *
 * Screenshot **bukan mockup**: `Game` asli dijalankan di kanvas Skia
 * (`@napi-rs/canvas`), satu frame diambil, lalu ditempel ke latar pemasaran
 * bersama judul dan keterangan. Jadi yang dilihat calon pemain di toko sama
 * dengan yang dirender aplikasi.
 */
import { Canvas as NapiCanvas, createCanvas, GlobalFonts, loadImage, type Canvas } from '@napi-rs/canvas';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const OUT = path.join(ROOT, 'store');
const SHOTS = path.join(OUT, 'screenshots');

const SHOT_W = 1080;
const SHOT_H = 1920;
const FEATURE_W = 1024;
const FEATURE_H = 500;
const ICON = 512;

// --------------------------------------------------------------- font & warna
GlobalFonts.registerFromPath(path.join(ROOT, 'store/fonts/Bungee.ttf'), 'Bungee');
GlobalFonts.registerFromPath(path.join(ROOT, 'store/fonts/RussoOne.ttf'), 'Russo One');
GlobalFonts.registerFromPath(path.join(ROOT, 'store/fonts/Fredoka.ttf'), 'Fredoka');

const INK = '#04070d';
const GOLD = '#ffcc33';
const CYAN = '#67e8f9';

type Ctx = CanvasRenderingContext2D;

function roundRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Latar pemasaran: gelap, sedikit vignette, garis cahaya di belakang ponsel. */
function paintBackdrop(ctx: Ctx, w: number, h: number, accent: string) {
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, '#0b1626');
  bg.addColorStop(0.55, '#0a1220');
  bg.addColorStop(1, '#05080f');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  const glow = ctx.createRadialGradient(w / 2, h * 0.42, 40, w / 2, h * 0.42, w * 0.85);
  glow.addColorStop(0, `${accent}40`);
  glow.addColorStop(0.55, `${accent}12`);
  glow.addColorStop(1, '#00000000');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);

  // subtle grid, like the map screens
  ctx.strokeStyle = '#ffffff08';
  ctx.lineWidth = 2;
  for (let x = 40; x < w; x += 120) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
}

function paintVignette(ctx: Ctx, w: number, h: number) {
  const v = ctx.createRadialGradient(w / 2, h / 2, h * 0.35, w / 2, h / 2, h * 0.78);
  v.addColorStop(0, '#00000000');
  v.addColorStop(1, '#00000073');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, w, h);
}

// ------------------------------------------------------------------- dom shim
/**
 * `Game` mengira ia berjalan di browser: ia memanggil
 * `document.createElement('canvas')` untuk membakar tekstur roda, dan membaca
 * `devicePixelRatio`. Shim ini memberi kanvas Skia yang asli, persis seperti
 * `tools/render-frame.ts`, jadi hasilnya identik dengan yang dilihat pemain.
 */
function installDomShim(dpr: number) {
  const g = globalThis as unknown as Record<string, unknown> & { window: Record<string, unknown> };
  g.window = Object.assign(g.window ?? {}, {
    setTimeout,
    clearTimeout,
    setInterval: () => 0,
    clearInterval: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    devicePixelRatio: dpr,
    innerWidth: 420,
    innerHeight: 760,
  });
  g.HTMLCanvasElement = NapiCanvas;
  g.document = {
    createElement: (tag: string) => (tag === 'canvas' ? createCanvas(64, 64) : { style: {} }),
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  };
  class FakeImage {
    width = 1;
    height = 1;
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    set src(_value: string) {
      /* stays blank */
    }
  }
  g.Image = FakeImage;
}

/** Deterministik: Math.random dipaku supaya aset tidak berubah tiap dijalankan. */
function seedRandom(seed = 20261102) {
  let state = seed >>> 0;
  Math.random = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

installDomShim(3);
seedRandom();

const { Game } = await import('../src/games/gunhit/game/Game.ts');
const { makeLevel } = await import('../src/games/gunhit/game/levels.ts');
const { WEAPONS } = await import('../src/games/gunhit/game/weapons.ts');
const { levelConfig } = await import('../src/games/perfect-shot/play/levels.ts');
const { TargetArt } = await import('../src/games/perfect-shot/play/TargetArt.tsx');
const { createElement } = await import('react');
const { renderToStaticMarkup } = await import('react-dom/server');

const GAME_W = 420;
const GAME_H = 760;

/** Satu kanvas game, dipakai ulang untuk tiap screenshot. */
function makeGameCanvas(): Canvas {
  const canvas = createCanvas(GAME_W * 3, GAME_H * 3) as unknown as Canvas & Record<string, unknown>;
  canvas.style = {};
  canvas.addEventListener = () => undefined;
  canvas.removeEventListener = () => undefined;
  canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: GAME_W, height: GAME_H });
  return canvas;
}

/**
 * The wheel artwork is an SVG component, so the engine expects the React
 * side to hand it a raster. Offline we rasterise that same component with
 * `renderToStaticMarkup` + Skia's SVG loader, which is why a boss keeps its real
 * head and a fruit stage keeps its real wheel instead of a placeholder disc.
 */
async function wheelArtFor(stage: number) {
  const config = levelConfig(stage) as unknown as { target: string; icon?: unknown; head?: unknown };
  const markup = renderToStaticMarkup(
    createElement(TargetArt as never, { kind: config.target, icon: config.icon, head: config.head } as never),
  );
  const sized = markup.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"');
  const image = await loadImage(Buffer.from(sized));
  return { key: `${config.target}|${config.head ?? ''}`, markup: sized, image };
}

interface SceneRequest {
  stage: number;
  weapon: string;
  frames: number;
  /** Biarkan state `play` walau stage-nya bos, supaya HUD-nya penuh. */
  idle?: boolean;
}

/** Jalankan game `frames` langkah lalu kembalikan kanvasnya. */
async function renderScene(request: SceneRequest): Promise<Canvas> {
  const canvas = makeGameCanvas();
  const game = new Game(canvas as unknown as HTMLCanvasElement, { onGameOver: () => {}, onStageChange: () => {} } as never) as unknown as Record<string, any>;
  game.level = makeLevel(request.stage);
  game.setWeapon(request.weapon);
  game.applyCanvasDpr?.(3);

  // The engine only adopts a raster once it knows the key for the stage on
  // screen, so the source is wired first — the same order the React bridge uses.
  const art = await wheelArtFor(request.stage);
  game.setWheelArtSource?.({
    keyFor: (level: number) => {
      const config = levelConfig(level) as unknown as { target: string; head?: string };
      return `${config.target}|${config.head ?? ''}`;
    },
    get: (key: string) => (key === art.key ? art.image : null),
    request: () => undefined,
    markup: (key: string) => (key === art.key ? art.markup : null),
  });
  game.setWheelArt?.(art.key, art.image, art.markup);
  const DT = 1 / 60;
  for (let frame = 0; frame < request.frames; frame++) {
    game.state = 'play';
    game.stuck = 0;
    game.ammoLeft = game.level.ammo;
    // A special stage counts down from the moment it starts; without a live
    // stage clock the frame would already say "TIME UP".
    game.stageTime = 30;
    if (game.items?.length > 10) game.items.splice(0, game.items.length - 10);
    if (!request.idle && game.cooldown <= 0) game.shoot();
    game.update(DT);
    game.render();
  }
  return canvas;
}

// ------------------------------------------------------------- screenshot satu
interface ShotSpec {
  file: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  bullets: string[];
  accent: string;
  scene: SceneRequest;
}

const SHOT_SPECS: ShotSpec[] = [
  {
    file: 'phone-01.png',
    eyebrow: 'GUN HIT · SGA',
    title: 'AIM, SHOOT, CLEAR',
    subtitle: 'Tap to fire at the spinning wheel — one clean hit at a time.',
    bullets: ['Auto-fire', 'Timer', 'Combos'],
    accent: CYAN,
    scene: { stage: 3, weapon: 'pistol', frames: 64 },
  },
  {
    file: 'phone-02.png',
    eyebrow: 'BOSS FIGHT',
    title: 'ELEVEN BOSSES',
    subtitle: 'Pirate, jester, dragon, skeleton… each one attacks differently.',
    bullets: ['Boss HP', 'Spikes', 'Gift box'],
    accent: '#fb7185',
    scene: { stage: 5, weapon: 'ak47', frames: 34 },
  },
  {
    file: 'phone-03.png',
    eyebrow: 'SPECIAL STAGE',
    title: 'BONUS & TREASURE',
    subtitle: 'Chip the boulder, blast the crates, grab the coins.',
    bullets: ['Diamond Breaker', 'Bonus Stage', 'Treasure'],
    accent: GOLD,
    scene: { stage: 4, weapon: 'shotgun', frames: 76 },
  },
  {
    file: 'phone-04.png',
    eyebrow: 'ARSENAL',
    title: `${WEAPONS.length} WEAPONS`,
    subtitle: `${WEAPONS.length} guns, three skins each, unlocked by playing.`,
    bullets: ['3 skins each', '11 boss heads', 'Achievements'],
    accent: '#a855f7',
    scene: { stage: 7, weapon: 'plasma', frames: 70 },
  },
];

function composeScreenshot(spec: ShotSpec, gameCanvas: Canvas) {
  const canvas = createCanvas(SHOT_W, SHOT_H);
  const ctx = canvas.getContext('2d') as unknown as Ctx;

  paintBackdrop(ctx, SHOT_W, SHOT_H, spec.accent);

  // top: eyebrow + title
  ctx.textAlign = 'center';
  ctx.fillStyle = spec.accent;
  ctx.font = '34px "Russo One"';
  ctx.fillText(spec.eyebrow, SHOT_W / 2, 132);

  ctx.fillStyle = '#ffffff';
  ctx.font = '86px Bungee';
  ctx.fillText(spec.title, SHOT_W / 2, 232);

  // game frame
  const frameW = 660;
  const frameH = Math.round((frameW * GAME_H) / GAME_W);
  const frameX = Math.round((SHOT_W - frameW) / 2);
  const frameY = 288;
  const radius = 44;

  ctx.save();
  ctx.shadowColor = `${spec.accent}66`;
  ctx.shadowBlur = 70;
  ctx.shadowOffsetY = 24;
  ctx.fillStyle = '#0d1524';
  roundRect(ctx, frameX - 10, frameY - 10, frameW + 20, frameH + 20, radius + 8);
  ctx.fill();
  ctx.restore();

  ctx.save();
  roundRect(ctx, frameX, frameY, frameW, frameH, radius);
  ctx.clip();
  const src = gameCanvas as unknown as Canvas;
  ctx.drawImage(src as unknown as never, frameX, frameY, frameW, frameH);
  ctx.restore();

  ctx.save();
  roundRect(ctx, frameX, frameY, frameW, frameH, radius);
  ctx.strokeStyle = '#ffffff26';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.restore();

  // subtitle under the phone — two lines are reserved so the bullets never move
  ctx.fillStyle = '#cbd5e1';
  ctx.font = '38px Fredoka';
  const subtitleTop = frameY + frameH + 74;
  wrap(ctx, spec.subtitle, 900).slice(0, 2).forEach((line, index) => {
    ctx.fillText(line, SHOT_W / 2, subtitleTop + index * 48);
  });

  // bullets
  ctx.textAlign = 'left';
  const bulletY = subtitleTop + 2 * 48 + 54;
  const columnW = Math.round(frameW / spec.bullets.length);
  spec.bullets.forEach((bullet, index) => {
    const x = frameX + columnW * index + 26;
    ctx.fillStyle = spec.accent;
    ctx.beginPath();
    ctx.arc(x + 9, bulletY - 11, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '27px Fredoka';
    wrap(ctx, bullet, columnW - 46).slice(0, 2).forEach((line, lineIndex) => {
      ctx.fillText(line, x + 28, bulletY + lineIndex * 30);
    });
  });

  // brand strip
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff59';
  ctx.font = '26px "Russo One"';
  ctx.fillText('GAME ARCADE HUB · OFFLINE ARCADE · NO ADS', SHOT_W / 2, SHOT_H - 48);

  paintVignette(ctx, SHOT_W, SHOT_H);
  return canvas;
}

/** Kecilkan ukuran font sampai teksnya muat di lebar yang tersedia. */
function fitFont(ctx: Ctx, text: string, family: string, maxSize: number, maxWidth: number, minSize = 16): number {
  let size = maxSize;
  for (; size > minSize; size -= 2) {
    ctx.font = `${size}px ${family}`;
    if (ctx.measureText(text).width <= maxWidth) break;
  }
  return size;
}

function wrap(ctx: Ctx, text: string, maxWidth: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

// ------------------------------------------------------------- ikon & feature
async function makeIcon() {
  const canvas = createCanvas(ICON, ICON);
  const ctx = canvas.getContext('2d') as unknown as Ctx;
  // background keeps the icon legible on any Play Store surface
  const bg = ctx.createLinearGradient(0, 0, ICON, ICON);
  bg.addColorStop(0, '#0b1626');
  bg.addColorStop(1, '#05080f');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, ICON, ICON);
  const ready = await loadIconImage();
  ctx.drawImage(ready as unknown as never, 0, 0, ICON, ICON);
  return canvas;
}

let iconImage: unknown = null;
/**
 * `assets/app-icon.png` is the 1024×1024 master the Android launcher icons are
 * generated from, so the launcher and the store share one icon.
 */
async function loadIconImage() {
  if (iconImage) return iconImage;
  iconImage = await loadImage(path.join(ROOT, 'assets/app-icon.png'));
  return iconImage;
}

async function makeFeatureGraphic() {
  const canvas = createCanvas(FEATURE_W, FEATURE_H);
  const ctx = canvas.getContext('2d') as unknown as Ctx;
  paintBackdrop(ctx, FEATURE_W, FEATURE_H, GOLD);

  const icon = await loadIconImage();
  const iconSize = 288;
  const iconX = 56;
  const iconY = (FEATURE_H - iconSize) / 2;
  ctx.save();
  roundRect(ctx, iconX, iconY, iconSize, iconSize, 54);
  ctx.clip();
  ctx.drawImage(icon as unknown as never, iconX, iconY, iconSize, iconSize);
  ctx.restore();
  ctx.save();
  roundRect(ctx, iconX, iconY, iconSize, iconSize, 54);
  ctx.strokeStyle = '#ffffff33';
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.restore();

  const textX = iconX + iconSize + 52;
  const maxWidth = FEATURE_W - textX - 56;

  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffffff';
  const titleSize = fitFont(ctx, 'GAME ARCADE HUB', 'Bungee', 62, maxWidth);
  ctx.font = `${titleSize}px Bungee`;
  ctx.fillText('GAME ARCADE HUB', textX, 186);

  ctx.fillStyle = GOLD;
  const tagline = 'ONE OFFLINE ARCADE SHOOTER';
  const taglineSize = fitFont(ctx, tagline, '"Russo One"', 30, maxWidth);
  ctx.font = `${taglineSize}px "Russo One"`;
  ctx.fillText(tagline, textX, 246);

  ctx.fillStyle = '#cbd5e1';
  const facts = `GUN HIT · ${WEAPONS.length} GUNS · 11 BOSSES · OFFLINE`;
  const factsSize = fitFont(ctx, facts, 'Fredoka', 27, maxWidth);
  ctx.font = `${factsSize}px Fredoka`;
  ctx.fillText(facts, textX, 300);

  ctx.fillStyle = '#94a3b8';
  const sub = 'No ads · no accounts · no internet needed';
  const subSize = fitFont(ctx, sub, 'Fredoka', 24, maxWidth);
  ctx.font = `${subSize}px Fredoka`;
  ctx.fillText(sub, textX, 348);

  paintVignette(ctx, FEATURE_W, FEATURE_H);
  return canvas;
}

// ----------------------------------------------------------------------- main
mkdirSync(SHOTS, { recursive: true });

writeFileSync(path.join(OUT, 'icon-512.png'), (await makeIcon()).toBuffer('image/png'));
writeFileSync(path.join(OUT, 'feature-graphic-1024x500.png'), (await makeFeatureGraphic()).toBuffer('image/png'));

for (const spec of SHOT_SPECS) {
  const scene = await renderScene(spec.scene);
  const shot = composeScreenshot(spec, scene);
  writeFileSync(path.join(SHOTS, spec.file), shot.toBuffer('image/png'));
  console.log('wrote', path.relative(ROOT, path.join(SHOTS, spec.file)));
}

console.log('wrote store/icon-512.png and store/feature-graphic-1024x500.png');
console.log('weapons available:', WEAPONS.length);
