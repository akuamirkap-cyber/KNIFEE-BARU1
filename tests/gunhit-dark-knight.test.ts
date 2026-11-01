import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { bossFireInterval, bossKnifeCount, bossRiseOffset, bossRotationSpeed, bossSpinSpeed, Game, makeLevel, SPIKE_SCALE } from '../src/games/gunhit/game/Game';
import { getWeapon } from '../src/games/gunhit/game/weapons';

const ROOT = path.resolve(import.meta.dirname, '..');
const read = (p: string) => readFileSync(path.join(ROOT, p), 'utf8');

test('stage-board spikes on the arena and boss are rendered at twice their base size', () => {
  assert.equal(SPIKE_SCALE, 2);
});

test('setiap boss memakai rintangan Perfect Shot: pisau tertancap, tanpa duri', () => {
  for (const n of [5, 10, 15, 20, 25, 45]) {
    const level = makeLevel(n);
    assert.equal(level.boss, true, `level ${n} harus boss`);
    assert.equal(level.spikes, 0, `level ${n} tanpa duri jebakan gaya Game A`);
    assert.equal(level.old, bossKnifeCount(n), `level ${n} memakai jumlah pisau Game B`);
    assert.ok(level.old >= 3 && level.old <= 5, 'Game B menanam 3–5 pisau di kepala bos');
    assert.ok(['classic'].includes(level.mode));
  }
});

test('proyektil bos menghadap arah gerak (ke pemain), tidak berputar', () => {
  const src = read('src/games/gunhit/game/Game.ts');
  assert.ok(
    src.includes('bp.rot = Math.atan2(bp.vy, bp.vx) - Math.PI / 2'),
    'rotasi proyektil bos harus mengikuti arah gerak'
  );
  assert.ok(!src.includes('bp.rot += s * 4'), 'proyektil bos tidak boleh berputar di jalan');
});

test('bos punya pola putaran khas yang terkontrol dan tembakan 1.9x lebih cepat', () => {
  const src = read('src/games/gunhit/game/Game.ts');
  assert.ok(
    src.includes('this.rot = this.level.boss ? 0 : rand(0, TAU)'),
    'boss harus mulai pada sudut 0 (tegak)'
  );
  // The boss wheel now runs Perfect Shot's own 6 s cycle, not Game A's old
  // per-type spin curves: fast spin -> brake -> reverse -> freeze -> jitter.
  assert.ok(src.includes('bossSpinSpeed(this.level.n, this.levelTime)'), "Perfect Shot's boss rhythm drives the boss wheel");
  const b20 = (72 + 80) * (Math.PI / 180); // level 20: 72 + min(110, 20*4) deg/s
  assert.ok(Math.abs(bossSpinSpeed(20, 0) - b20 * 1.25) < 1e-9, 'first 2.1 s: fast spin (x1.25)');
  assert.ok(Math.abs(bossSpinSpeed(20, 2.3) - b20 * 0.12) < 1e-9, '2.1-2.6 s: the fake brake (x0.12)');
  assert.ok(Math.abs(bossSpinSpeed(20, 3.0) + b20 * 1.5) < 1e-9, '2.6-4.1 s: reverse burst (x-1.5)');
  assert.equal(bossSpinSpeed(20, 4.3), 0, '4.1-4.5 s: the wheel freezes dead');
  assert.ok(bossSpinSpeed(20, 4.8) > 0 && bossSpinSpeed(20, 4.8) < b20 * 1.6, 'then the jitter takes over');
  assert.ok(bossSpinSpeed(20, 6.0) === bossSpinSpeed(20, 0), 'the cycle repeats every 6 s');
  // Game A's legacy per-type curves are still exported for the old tests, but
  // they no longer drive a boss stage.
  assert.ok(!src.includes('bossRotationSpeed(this.level.style as BossType, this.levelTime)'));
  assert.ok(typeof bossRotationSpeed('knight', 1.1) === 'number');
  assert.ok(src.includes('const spd = (160 + this.level.n * 3) * 1.9;'), 'peluru boss bergerak 1.9x lebih cepat');
  assert.ok(
    src.includes("if (this.level.mode !== 'treasure') c.rotate(this.rot);"),
    'render harus memutar lapisan target memakai this.rot (bos ikut berputar)'
  );
  assert.ok(
    !src.includes('this.rot = 0;'),
    'bos tidak boleh dikunci diam (this.rot = 0)'
  );
  assert.ok(
    src.includes('e: Math.sin(t * 0.53) * 3.2, f: Math.sin(t * 1.15) * 3.8'),
    'bos punya gerak idle melayang (terlihat hidup)'
  );
  assert.ok(src.includes('private bossDecorMatrix(): BossMat'), 'idle + reaksi bos satu matriks');
  assert.ok(src.includes("this.setBossMood('laugh', 1.1)"), 'bos ketawa berkala seperti Game B');
});

// ---------------------------------------------------------------------------
// Behavior: render dengan ctx perekam. this.rot sengaja diisi nilai non-nol
// (adversarial) — untuk bos TIDAK BOLEH ada rotate(±nilai itu) yang sampai ke
// kanvas, sedangkan target biasa tetap berputar (kontrol).
// ---------------------------------------------------------------------------
interface Recorder { events: string[]; ctx: CanvasRenderingContext2D }

function recorder(): Recorder {
  const events: string[] = [];
  const gradient = { addColorStop: () => {} };
  const ctx = new Proxy({}, {
    get: (_t, prop) => (...args: unknown[]) => {
      const name = String(prop);
      if (name === 'createLinearGradient' || name === 'createRadialGradient') {
        events.push(`${name}(${args.map(Number).join(',')})`);
        return gradient;
      }
      if (name === 'measureText') return { width: 30 };
      if (['rotate', 'translate', 'scale', 'transform', 'drawImage', 'setTransform'].includes(name)) {
        events.push(`${name}(${args.map((v) => (typeof v === 'number' ? v.toFixed(3) : typeof v)).join(',')})`);
      }
      return undefined;
    },
    set: () => true,
  }) as unknown as CanvasRenderingContext2D;
  return { events, ctx };
}

function renderProbe(events: string[], ctx: CanvasRenderingContext2D, levelN: number, rot: number, extra: Record<string, unknown> = {}) {
  const game = Object.create(Game.prototype) as Record<string, unknown>;
  const stub = () => {};
  Object.assign(game, {
    ctx,
    level: makeLevel(levelN),
    scale: 1,
    dpr: 1,
    time: 0.5,
    rt: 0.5,
    camY: 0,
    shake: 0,
    state: 'play',
    introT: 1,
    bump: 0,
    rot,
    items: [],
    face: { tag: 'face-tex' },
    faceR: 122,
    hitFlash: 0,
    slowT: 0,
    slowF: 1,
    slowKind: 'ice',
    slowRgb: '0,0,0',
    bossProjs: [],
    bossMuzzleFlashes: [],
    projs: [],
    beams: [],
    particles: [],
    frags: [],
    flyers: [],
    rockFragments: [],
    fallenCells: [],
    chestBullets: [],
    rockBullets: [],
    treasureCoins: [],
    bonusCoins: [],
    portals: [],
    lights: [],
    texts: [],
    twinGuns: false,
    rock: null,
    chest: null,
    star: null,
    weapon: getWeapon('pistol'),
    ammoLeft: 12,
    reloadT: 0,
    recoil: 0,
    tintA: 0,
    tintRgb: '0,0,0',
    diamondPing: 0,
    spikeOffT: 0,
    burnT: 0,
    failProjAngle: 0,
    // method gambar berat di-stub; yang diuji inline di render()
    drawForestBackground: stub,
    drawGunNow: stub,
    drawHUD: stub,
    drawProj: stub,
    drawSpike: stub,
    drawCoin: stub,
    drawEmbeddedShot: stub,
    drawEmbeddedDiamond: stub,
    drawBonusRing: stub,
    ...extra,
  });
  (Game.prototype as unknown as { render(this: unknown): void }).render.call(game);
  return events;
}

test('render: lapisan wajah bos ikut berputar (this.rot sampai ke kanvas) + goyangan idle', () => {
  const ADV = 1.234; // sudut papan bos yang HARUS sampai ke kanvas
  const r1 = recorder();
  const boss = renderProbe(r1.events, r1.ctx, 5, ADV);
  assert.ok(
    boss.some((e) => e.startsWith('drawImage(object')),
    'wajah bos harus digambar'
  );
  assert.ok(
    boss.some((e) => e === `rotate(${ADV.toFixed(3)})`),
    `rotasi papan bos harus sampai ke kanvas — bos harus muter (rotate(${ADV}))`
  );
  assert.ok(
    boss.some((e) => e.startsWith('transform(') && e !== 'transform(1.000,0.000,0.000,1.000,0.000,0.000)'),
    'bos punya goyangan idle + reaksi tambahan (terlihat hidup)'
  );
  // kontrol: target biasa (non-boss) tetap memutar lapisan target
  const r2 = recorder();
  const normal = renderProbe(r2.events, r2.ctx, 1, ADV);
  assert.ok(
    normal.some((e) => e === `rotate(${ADV.toFixed(3)})`),
    'target biasa harus tetap berputar (rotasi papan target)'
  );
});

test('boss defeat shows the defeated boss, persistent player XP, transparent game backdrop, and auto-continue', () => {
  const modal = read('src/games/gunhit/components/BossDefeatedModal.tsx');
  const app = read('src/games/gunhit/App.tsx');
  assert.ok(modal.includes('renderBossHead'));
  assert.ok(modal.includes('role="progressbar"'));
  assert.ok(modal.includes('LANJUT OTOMATIS'));
  assert.ok(!modal.includes('onClick={onContinue}'));
  assert.ok(!modal.includes('bg-gradient-to-b from-[#133038]/95'));
  // Player XP is saved through the safe store: a browser that refuses storage
  // must not blank the page (see tests/gunhit-blank-page.test.ts).
  assert.ok(app.includes('storage.setItem(LS.playerXp, String(totalXp))'));
  assert.ok(app.includes('storage.setItem(LS.playerLevel, String(nextProgress.level))'));
});

test('setiap bos punya bentuk dan material jejak serangan yang berbeda', () => {
  const art = read('src/games/gunhit/game/bossProjectileArt.ts');
  for (const type of ['knight', 'oni', 'cyborg', 'pirate']) {
    assert.ok(art.includes(`bp.type === '${type}'`), `serangan ${type} harus punya desain khusus`);
  }
  assert.ok(art.includes("'rgba(56,189,248,0.24)'"), 'Knight memakai jejak tebasan biru tajam');
  assert.ok(art.includes('flying knight sword') && art.includes('c.lineTo(0, 21)'), 'Dark Knight menembakkan pedang dengan bilah, gagang, dan pelindung yang terlihat jelas');
  assert.ok(art.includes('Horn-shaped tongues') || art.includes('horn-shaped tongues'), 'Oni memakai jejak api bertanduk');
  assert.ok(art.includes('Hard-edged cyan micro-rocket'), 'Cyborg memakai roket bersudut');
  assert.ok(art.includes('battered dark cannonball'), 'Pirate memakai bola meriam dengan tengkorak');
  assert.ok(!art.includes('shadowBlur'), 'proyektil boss tidak mengandalkan glow');
});

test('halaman Gun SGA menampilkan demo animasi senjata dan efek serangan bos terpilih', () => {
  const arsenal = read('src/games/gunhit/components/Arsenal.tsx');
  assert.ok(arsenal.includes('<BossAttackPreview boss={selectedBoss} />'));
  assert.ok(arsenal.includes('DEMO SERANGAN BOS'));
  assert.ok(arsenal.includes('drawBossProjectile(ctx'));
  assert.ok(arsenal.includes('selectedBoss.projectileName'));
});

test('api & jejak peluru bos mengekor di ekor (partikel spawn di belakang)', () => {
  const src = read('src/games/gunhit/game/Game.ts');
  assert.ok(
    /advanceCosmeticTrail\(bp, s, \(x, y\) =>/.test(src) && /tailX = x - dirx \* 44/.test(src) && /tailY = y - diry \* 44/.test(src),
    'partikel api harus spawn di posisi ekor (44px di belakang pusat peluru)'
  );
  assert.ok(
    src.includes('x: tailX + rand(-7, 7)') && src.includes('y: tailY + rand(-7, 7)'),
    'partikel jejak harus disebar di sekitar ekor'
  );
});

test('semua boss tampil bersih tanpa disk bayangan atau glow outline neon', () => {
  const gameSrc = read('src/games/gunhit/game/Game.ts');
  assert.ok(gameSrc.includes('if (!isSpecial(this.level.mode) && !this.level.boss)'), 'disk bayangan dihilangkan untuk semua boss');
  const rendererSrc = read('src/games/gunhit/game/bossRenderer.ts');
  assert.ok(rendererSrc.includes('no neon/glow outline for any boss'), 'renderer menghilangkan outline glow untuk semua boss');
  assert.ok(!rendererSrc.includes('shadowBlur'), 'renderer boss tidak membuat aura bercahaya');
});
