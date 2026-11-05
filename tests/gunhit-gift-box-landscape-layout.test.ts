import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { GiftBoxScene } from '../src/games/gunhit/components/BossGiftBoxModal';
import { WEAPONS } from '../src/games/gunhit/game/weapons';
import { setSavedSgaOrientation } from '../src/games/gunhit/game/orientation';

const ROOT = path.resolve(import.meta.dirname, '..');
const SCENE = path.join(ROOT, 'src/games/gunhit/components/BossGiftBoxModal.tsx');

function scene(orientation: 'portrait' | 'landscape') {
  // The real store the panel reads at mount, so the markup is the one the player
  // actually gets on that screen shape.
  setSavedSgaOrientation(orientation);
  const html = renderToStaticMarkup(
    createElement(GiftBoxScene, {
      badge: '★ BONUS REWARD STAGE ★',
      headline: 'PIRATE CAPTAIN DEFEATED!',
      hint: '🎁 Kotak hadiah boss didapat!',
      weapon: WEAPONS[0],
      coins: 120,
      claimLabel: 'PAKAI & LANJUT ➜',
      declineLabel: 'Lanjut tanpa ganti senjata',
      onClaim: () => {},
    }),
  );
  setSavedSgaOrientation('portrait');
  return html;
}

test('landscape opens on a centred kado, not a left column', () => {
  const html = scene('landscape');
  // The kado owns the middle of the screen while the player is asked to tap it.
  assert.match(html, /left:50%;top:52%;transform:translate\(-50%, -50%\) scale\(1\.12\)/, 'kotak hadiah di tengah');
  // …with the tap hint stacked underneath it instead of on the right half.
  assert.match(html, /left:6%;right:6%;top:88%/, 'petunjuk tap di bawah kotak');
  // The tap copy only appears once the kado has landed (`ready`), so the
  // static first frame shows the dots only — assert on the source instead.
  assert.match(readFileSync(SCENE, 'utf8'), /TAP UNTUK MEMBUKA/, 'petunjuk tetap ada');
  // The headline travels with it, so the closed screen is one centred column.
  assert.match(html, /left:27%;width:46%/, 'judul ikut ke tengah');
});

test('portrait keeps the original stack', () => {
  const html = scene('portrait');
  assert.match(html, /left:50%;top:300px;transform:translateX\(-50%\)/, 'portrait tidak berubah');
  assert.doesNotMatch(html, /left:27%;width:46%/, 'tidak ada kolom landscape di portrait');
  assert.match(html, /inset-x-0/, 'petunjuk tetap di dalam alur portrait');
});

test('the reward slides one column to the left once it is revealed', () => {
  const src = readFileSync(SCENE, 'utf8');
  // A single transition drives every anchor, so the box, the burst/rays, the
  // gun rising out of it and the loot card all move on the same beat.
  assert.match(src, /const REVEAL_SLIDE = 'left \.7s cubic-bezier\(\.22,\.9,\.28,1\), top \.7s/);
  assert.match(src, /left: showInfo \? '23%' : '50%'/, 'kotak: tengah → kolom kiri');
  assert.match(src, /top: showInfo \? '58%' : '52%'/);
  assert.match(src, /scale\(\$\{showInfo \? 1\.18 : 1\.12\}\)/, 'kotak membesar sedikit saat pindah');
  assert.match(src, /left: showInfo \? '48%' : '6%'/, 'kartu hadiah: bawah-tengah → kanan');
  assert.match(src, /top: showInfo \? '50%' : '88%'/);
  assert.match(src, /left: showInfo \? 0 : '27%'/, 'judul: tengah → kiri');
  // …and the effects are anchored to the box, so they follow it left.
  assert.match(src, /left: showInfo \? '23%' : '50%'/);
  const anchored = src.match(/top: landscape \? boxSpot\.top :/g) ?? [];
  assert.equal(anchored.length, 2, 'burst & sinar ikut titik kotak');
});
