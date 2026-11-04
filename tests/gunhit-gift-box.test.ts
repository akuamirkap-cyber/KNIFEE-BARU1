import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  GIFT_RARITY_WEIGHT,
  isWeaponUnlocked,
  WEAPONS,
  rollGiftWeapon,
  type Rarity,
} from '../src/games/gunhit/game/weapons';
import { BossGiftBoxModal, GiftBoxScene, giftBoxCoins } from '../src/games/gunhit/components/BossGiftBoxModal';

const ROOT = path.resolve(import.meta.dirname, '..');

test('rollGiftWeapon mengambil senjata dari katalog Gun Hit dan mengkecualikan senjata aktif', () => {
  const rarities = new Set<Rarity>(WEAPONS.map((w) => w.rarity));
  for (const r of rarities) assert.ok(GIFT_RARITY_WEIGHT[r] > 0, `bobot rarity ${r} harus > 0`);

  const current = WEAPONS[0].id;
  for (let i = 0; i < 200; i++) {
    const rolled = rollGiftWeapon(current);
    assert.ok(WEAPONS.some((w) => w.id === rolled.id), 'hasil roll harus ada di WEAPONS');
    assert.notEqual(rolled.id, current, 'senjata yang sedang dipakai tidak boleh jadi hadiah');
    assert.ok(GIFT_RARITY_WEIGHT[rolled.rarity] > 0);
    assert.notEqual(rolled.rarity, 'LANGKA', 'kotak hadiah tidak boleh membuka senjata LANGKA gratis');
  }
  // eksklusi penuh: panggil berulang dengan excludeId berbeda tetap valid
  for (const w of WEAPONS) {
    const rolled = rollGiftWeapon(w.id);
    assert.notEqual(rolled.id, w.id);
    assert.ok(WEAPONS.some((x) => x.id === rolled.id));
  }
});

test('koin bonus kotak hadiah naik per stage dan per rarity', () => {
  const stage5 = giftBoxCoins(5, 'UMUM');
  const stage50 = giftBoxCoins(50, 'UMUM');
  assert.ok(stage50 > stage5, 'koin naik mengikuti stage');
  const order: Rarity[] = ['UMUM', 'LANGKA', 'EPIC', 'LEGENDARIS'];
  for (let i = 1; i < order.length; i++) {
    assert.ok(giftBoxCoins(10, order[i]) > giftBoxCoins(10, order[i - 1]), `rarity ${order[i]} harus lebih besar`);
  }
});

test('BossGiftBoxModal memakai kotak hadiah & efek Knife, tapi senjata dari data Gun Hit', () => {
  const src = readFileSync(path.join(ROOT, 'src/games/gunhit/components/BossGiftBoxModal.tsx'), 'utf8');
  // efek & art kotak hadiah yang sama dengan slide Knife Boss 100 Lv
  for (const needle of [
    "from '../../knife-hit/components/Art'",
    "from '../../knife-hit/components/Effects'",
    "from '../../knife-hit/sfx'",
    'GiftBoxLid',
    'GiftBoxBody',
    'drop-in',
    'lid-fly',
    'box-sink',
    'weapon-rise',
    'seam-pulse',
    'tap-hint',
  ]) {
    assert.ok(src.includes(needle), `BossGiftBoxModal harus memakai ${needle}`);
  }
  // senjata & warna rarity dari data Gun Hit
  assert.match(src, /rollGiftWeapon/);
  assert.match(src, /RARITY_COLOR/);
  assert.match(src, /drawGunCentered/);

  // smoke render: komponen bisa dirender dengan data senjata Gun Hit
  const html = renderToStaticMarkup(
    createElement(BossGiftBoxModal, {
      bossName: 'MECHA',
      stage: 12,
      currentWeaponId: WEAPONS[0].id,
      onClaim: () => {},
    }),
  );
  // Judul LetterPop terpecah per huruf; pastikan ada animasi huruf + copy khas box stage
  assert.match(html, /letter-pop/);
  assert.match(html, /drop-in/);
  assert.match(html, /BONUS REWARD STAGE/);
  assert.match(html, /Kotak hadiah boss didapat/);
});

test('alur boss Gun Hit memakai BossGiftBoxModal sebagai bonus stage', () => {
  const app = readFileSync(path.join(ROOT, 'src/games/gunhit/App.tsx'), 'utf8');
  // Both the boss gift box and the milestone gift are the same lazily loaded
  // overlay now, so they are no longer one eager import statement.
  assert.match(app, /import\('\.\/components\/BossGiftBoxModal'\)\.then\(\(m\) => \(\{ default: m\.BossGiftBoxModal \}\)\)/);
  assert.match(app, /import\('\.\/components\/BossGiftBoxModal'\)\.then\(\(m\) => \(\{ default: m\.GiftBoxScene \}\)\)/);
  assert.match(app, /<BossGiftBoxModal/);
  assert.match(app, /onClaim=\{handleGiftBoxClaim\}/);
  assert.match(app, /setBonusStageOpen\(true\)/);
});

test('peti milestone di halaman reward membuka kado sungguhan', () => {
  const app = readFileSync(path.join(ROOT, 'src/games/gunhit/App.tsx'), 'utf8');
  // Klaim milestone tidak lagi langsung memberi hadiah: ia menyiapkan kado.
  assert.match(app, /setMilestoneGift\(\{ count, weaponId: reward \? reward\.id : null, coins: reward \? 0 : 1000 \}\)/);
  // Hadiah baru masuk setelah kado terbuka dan tombol ambil ditekan.
  assert.match(app, /const takeMilestoneGift = \(equip: boolean\) => \{/);
  assert.match(app, /onClaim=\{\(equip\) => takeMilestoneGift\(equip\)\}/);
  assert.match(app, /<GiftBoxScene\s+badge="★ REWARD MILESTONE ★"/);
});

test('GiftBoxScene memakai adegan buka kado Knife untuk kado mana pun', () => {
  const src = readFileSync(path.join(ROOT, 'src/games/gunhit/components/BossGiftBoxModal.tsx'), 'utf8');
  assert.match(src, /export function GiftBoxScene\(/);
  // Tiga ketukan, tutup terbang, kotak tenggelam, sinar keluar dari kotak.
  for (const needle of ['lid-fly', 'box-sink', 'beam-up', 'weapon-rise', 'TAP UNTUK MEMBUKA!']) {
    assert.ok(src.includes(needle), `GiftBoxScene harus memakai ${needle}`);
  }
  // Kado koin (milestone saat semua senjata rarity itu sudah dimiliki) tetap punya reveal.
  assert.match(src, /weapon \? \(/);
  assert.match(src, /<CoinSprite size=\{132\} \/>/);
});


test('reward details sit close below the fixed weapon reveal position', () => {
  const modal = readFileSync(path.join(ROOT, 'src/games/gunhit/components/BossGiftBoxModal.tsx'), 'utf8');
  // Portrait keeps the original stack (box at 300, details under it).
  assert.ok(modal.includes("{ left: '50%', top: 300, transform: 'translateX(-50%)' }"));
  assert.ok(modal.includes("showInfo ? 'inset-x-0 top-[390px]' : 'inset-x-0 bottom-[36px]'"));
  assert.ok(modal.includes('max-w-[300px] px-4 py-2 text-[18px]'));
  // Landscape has no 390px to spare: the box takes the left column and the
  // details (with both buttons) move into a right-hand column instead of
  // running off the bottom edge.
  assert.ok(modal.includes("{ left: '48%', right: '4%', top: '50%', transform: 'translateY(-50%)' }"));
  assert.ok(modal.includes("useSgaOrientation"));
  assert.ok(modal.includes('isLandscape(orientation)'));
});

test('stage-clear sunburst stays pinned behind the board pivot without a front DOM overlay or completion label', () => {
  const app = readFileSync(path.join(ROOT, 'src/games/gunhit/App.tsx'), 'utf8');
  const game = readFileSync(path.join(ROOT, 'src/games/gunhit/game/Game.ts'), 'utf8');
  assert.ok(game.includes('this.events.onStageCleared?.(this.level.n, this.level.boss, { x: CX, y: this.targetY });'));
  assert.ok(game.includes('drawBehindWheelSunburst('));
  assert.ok(!app.includes('<div className="stage-clear-burst">'), 'no front z-35 DOM sunburst above canvas');
  assert.ok(!app.includes('STAGE CLEAR!'));
});

test('senjata LANGKA butuh kepemilikan pembelian, sementara rarity lain tetap tersedia', () => {
  const rare = WEAPONS.find((w) => w.rarity === 'LANGKA')!;
  const common = WEAPONS.find((w) => w.rarity === 'UMUM')!;
  assert.equal(isWeaponUnlocked(rare), false);
  assert.equal(isWeaponUnlocked(rare, [rare.id]), true);
  assert.equal(isWeaponUnlocked(common), true);
});

test('GiftBoxScene bisa dirender untuk hadiah senjata maupun koin saja', () => {
  const weapon = WEAPONS.find((w) => w.rarity === 'EPIC') ?? WEAPONS[0];
  const withWeapon = renderToStaticMarkup(
    createElement(GiftBoxScene, {
      badge: '★ REWARD MILESTONE ★',
      headline: 'MILESTONE 8!',
      hint: '🎁 Peti hadiah milestone siap dibuka!',
      weapon,
      coins: 0,
      claimLabel: 'PAKAI & LANJUT ➜',
      declineLabel: 'Lanjut tanpa ganti senjata',
      onClaim: () => {},
    }),
  );
  assert.match(withWeapon, /REWARD MILESTONE/);
  assert.match(withWeapon, /Peti hadiah milestone siap dibuka/);
  assert.match(withWeapon, /drop-in/);
  assert.match(withWeapon, /viewBox="0 0 200 96"/, 'tutup kado Knife ikut dirender');
  assert.match(withWeapon, /viewBox="0 0 180 132"/, 'badan kado Knife ikut dirender');
  // Judul dipecah per huruf oleh LetterPop, jadi yang dicek animasi hurufnya.
  assert.ok(withWeapon.includes('letter-pop'));

  const coinsOnly = renderToStaticMarkup(
    createElement(GiftBoxScene, {
      badge: '★ REWARD MILESTONE ★',
      headline: 'MILESTONE 20!',
      hint: '🎁 Peti hadiah milestone siap dibuka!',
      coins: 1000,
      claimLabel: 'AMBIL HADIAH ➜',
      onClaim: () => {},
    }),
  );
  assert.match(coinsOnly, /drop-in/);
  assert.ok(coinsOnly.includes('letter-pop'));
  assert.doesNotMatch(coinsOnly, /PAKAI &amp; LANJUT/);
});

test('kado tetap bisa dibuka dan hadiahnya tetap tergambar saat slide tidak aktif', () => {
  const src = readFileSync(path.join(ROOT, 'src/games/gunhit/components/BossGiftBoxModal.tsx'), 'utf8');
  // Kotak yang tampil harus selalu lanjut dari 'drop' ke 'ready' agar bisa ditap.
  assert.match(src, /if \(state !== 'drop'\) return;/);
  assert.doesNotMatch(src, /if \(!active \|\| state !== 'drop'\) return;/);
  // Kanvas reveal menggambar satu frame statis ketika slide tidak aktif.
  assert.match(src, /if \(!active\) \{\s*paint\(start\);\s*return;\s*\}/);
  assert.doesNotMatch(src, /if \(!ctx\) return;\n    if \(!active\) return;/);
});
