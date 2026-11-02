import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import MilestoneGift from '../src/games/gunhit/components/MilestoneGift';

const read = (p: string) => fs.readFileSync(path.join(process.cwd(), p), 'utf8');

test('jalur milestone memakai kado, bukan peti, dan warnanya tetap hijau/ungu/emas', () => {
  const quest = read('src/games/gunhit/components/QuestModal.tsx');
  assert.match(quest, /import MilestoneGift from '\.\/MilestoneGift';/);
  assert.doesNotMatch(quest, /from '\.\.\/\.\.\/perfect-shot\/components\/Bits'/, 'peti Perfect Shot tidak dipakai lagi');
  assert.doesNotMatch(quest, /<Chest\b/);
  assert.match(quest, /<MilestoneGift tone=\{tones\[m\.rarity\]\} open=\{taken\}/, 'kado memakai nada rarity dan terbuka saat sudah diklaim');
  assert.match(
    quest,
    /const tones = \{ UMUM: 'green', EPIC: 'purple', LEGENDARIS: 'gold' \} as const;/,
    'UMUM hijau, EPIC ungu, LEGENDARIS emas',
  );
  assert.match(quest, /Kado berisi senjata/, 'keterangan ikut menyebut kado');
});

test('setiap nada kado benar-benar digambar dengan warnanya sendiri', () => {
  const svg = (tone: 'green' | 'purple' | 'gold') =>
    renderToStaticMarkup(React.createElement(MilestoneGift, { tone, open: false }));
  const green = svg('green');
  const purple = svg('purple');
  const gold = svg('gold');

  assert.match(green, /#22c55e/i, 'kado hijau memakai hijau');
  assert.match(purple, /#a855f7/i, 'kado ungu memakai ungu');
  assert.match(gold, /#fbbf24/i, 'kado emas memakai emas');
  assert.notEqual(green, purple);
  assert.notEqual(purple, gold);

  // The present is a real gift: a bow above a lidded box, and the lid lifts
  // once the milestone is claimed.
  const closed = renderToStaticMarkup(React.createElement(MilestoneGift, { tone: 'gold', open: false }));
  const opened = renderToStaticMarkup(React.createElement(MilestoneGift, { tone: 'gold', open: true }));
  assert.match(closed, /M50 33 C35 13/, 'busur (bow) kado digambar');
  assert.match(closed, /transform:none/, 'tutup kado tertutup');
  assert.match(opened, /translate\(-8px,-24px\) rotate\(-16deg\)/, 'tutup kado terangkat saat diklaim');
  assert.ok(!closed.includes('fill="#fde68a"'), 'halo cahaya hanya muncul saat kado dibuka');
  assert.match(opened, /fill="#fde68a" opacity="\.28"/, 'cahaya keluar dari kado yang dibuka');
});

test('kartu SENJATA BARU tidak lagi berupa panel hitam datar', () => {
  const app = read('src/games/gunhit/App.tsx');
  const start = app.indexOf('{weaponCelebration &&');
  const card = app.slice(start, start + 5200);
  assert.ok(start > 0 && card.includes('SENJATA BARU'));
  assert.doesNotMatch(card, /bg-slate-950\/80/, 'panel hitam lama sudah hilang');
  assert.match(card, /const rarity = RARITY_COLOR\[unlocked\.rarity\];/, 'kartu memakai warna rarity senjata');
  assert.match(card, /font-arsenal-title/, 'judul memakai font arcade game');
  assert.match(card, /border-\[#7c2d12\]/, 'bingkai emas seperti banner achievement');
  assert.match(card, /radial-gradient\(circle at 50% 34%/, 'senjata duduk di plat bercahaya');
  assert.match(card, /unlocked\.rarity === 'LEGENDARIS' \? 'LEGEND' : unlocked\.rarity/, 'chip rarity tetap tampil');
});
