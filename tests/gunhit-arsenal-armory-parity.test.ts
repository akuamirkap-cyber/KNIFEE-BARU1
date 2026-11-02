import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const arsenal = readFileSync('src/games/gunhit/components/Arsenal.tsx', 'utf8');
const css = readFileSync('src/games/perfect-shot/index.css', 'utf8');

test('the armory showcase wears the menu sunburst, not a second ray wheel', () => {
  // Landing flash, dust ring and the floating pose are the three beats that
  // make the showcase read as "juicy"; the light itself is the menu's burst.
  assert.match(
    arsenal,
    /<SunburstFX\s+size=\{430\}\s+color=\{gunSunburstColor\(selectedGun\.rarity\)\}\s+intensity=\{0\.44\}\s+speed=\{32\}\s+core=\{false\}\s+stars=\{false\}/,
    'same size, speed, strength and no hot core as the cover screen',
  );
  assert.doesNotMatch(arsenal, /repeating-conic-gradient\(from 0deg, rgba\(255,255,255,\.2\)/, 'no extra conic ray wheel');
  assert.doesNotMatch(arsenal, /h-40 w-40 rounded-full transition-colors/, 'no second rarity halo under the burst');
  assert.equal(arsenal.split('<SunburstFX').length - 1, 1, 'exactly one sunburst in the showcase');
  assert.match(arsenal, /className="a sh-flash /, 'the white landing flash fires');
  assert.match(arsenal, /className="a sh-dust /, 'the dust ring fires');
  assert.match(arsenal, /className=\{`float /, 'the gun floats in place');
  for (const cls of ['sh-flash', 'sh-dust', 'float', 'sh-sel', 'bounce-soft']) {
    assert.ok(css.includes(cls), `${cls} exists in the reference stylesheet`);
  }
});

test('the flash lands on the same beat the gun does', () => {
  assert.match(arsenal, /const heroLand = heroKey === 0 \? SHOP_IN\.hero\.d \+ SHOP_IN\.hero\.dur \* SHOP_IN\.hero\.land : 120 \+ 620 \* 0\.55;/);
  assert.match(arsenal, /'--d': `\$\{heroLand - 40\}ms`/);
  assert.match(arsenal, /'--d': `\$\{heroLand\}ms`/);
});

test('the weapon title re-snaps every time a weapon is picked', () => {
  assert.match(arsenal, /key=\{`plate-\$\{selectedGunId\}-\$\{heroKey\}`\}/, 'the plate is keyed so in-slam replays');
  assert.match(arsenal, /heroKey === 0 \? SHOP_IN\.plate : \{ d: 260, dur: 460 \}/, 'and it slams straight after the swap');
  assert.match(arsenal, /key=\{`hero-\$\{selectedGunId\}-\$\{heroKey\}`\}/);
  assert.match(arsenal, /key=\{`hero-fx-\$\{heroKey\}`\}/);
});

test('the showcase weapon is drawn as big as the reference’s', () => {
  assert.match(arsenal, /const scale = \(h \* 0\.98\) \/ span;/, 'the pose is drawn nearly as tall as the showcase');
  assert.match(arsenal, /style=\{\{ width: box\.w, height: box\.h \}\}/, 'the canvas is sized from the measured showcase');
  assert.match(arsenal, /const heroSectionRef = useRef<HTMLElement>\(null\);/, 'the showcase strip is the measuring stick');
  assert.match(arsenal, /new ResizeObserver\(measure\)/, 'it rescales with the pane on every screen');
});

test('the selected card and the active tab animate like the reference', () => {
  assert.match(arsenal, /isSelected \? 'sh-sel z-10 border-\[#ffe066\]'/);
  assert.match(arsenal, /<span className=\{active \? 'bounce-soft' : ''\}>/);
  assert.match(arsenal, /const RARITY_CHIP: Record<Weapon\['rarity'\], string>/);
});

test('the wallet stays Game A’s own art, never Game B’s', () => {
  // Game A's coin badge + DiamondSprite must survive the port.
  assert.match(arsenal, /from 'lucide-react'/, 'lucide icons still used');
  // Same wallet scale as the menu HUD: 25 px coin, 24 px diamond.
  assert.match(arsenal, /<CoinSprite size=\{25\}/, 'the wallet shows Diamond Breaker\'s own coin');
  assert.match(arsenal, /<DiamondSprite size=\{24\} \/>/, 'the SGA diamond sprite is untouched');
  assert.doesNotMatch(arsenal, /from '\.\.\/\.\.\/perfect-shot\/components\/Bits'/, 'no Perfect Shot coin');
  assert.doesNotMatch(arsenal, /from '\.\.\/\.\.\/perfect-shot\/gift\/GiftArt'/, 'no Perfect Shot gem');
});
