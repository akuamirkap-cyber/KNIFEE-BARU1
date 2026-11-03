import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const lb = readFileSync('src/games/perfect-shot/components/Leaderboard.tsx', 'utf8');
const app = readFileSync('src/games/gunhit/App.tsx', 'utf8');

test('the ranking page takes a landscape flag and defaults to the portrait stack', () => {
  assert.match(lb, /landscape\?: boolean;/);
  assert.match(lb, /export function Leaderboard\(\{ leaving, onBack, stats, rivals, subtitle, landscape = false \}: Props\)/);
  // The host game asks for the two-column layout exactly when the frame is landscape.
  assert.match(app, /<RankBoardPage[\s\S]*?landscape=\{menuLandscape\}[\s\S]*?onBack=\{closeLeaderboardPage\}/);
});

test('landscape puts podium/tabs on the LEFT and the list on the RIGHT', () => {
  // Portrait stays one stacked column (flex-col); landscape overrides it with a grid.
  assert.match(lb, /className="relative mt-3 flex min-h-0 flex-1 flex-col">/);
  assert.match(lb, /gridTemplateColumns: "minmax\(0,42fr\) minmax\(0,58fr\)"/);
  assert.match(lb, /gridTemplateAreas: '"tabs list" "podium list"'/);
  // Named areas are applied only in landscape, so portrait markup is untouched.
  assert.match(lb, /const area = \(name: AreaName\): CSSProperties => \(landscape \? \{ gridArea: name \} : \{\}\);/);
  assert.match(lb, /style=\{area\("tabs"\)\}/);
  assert.match(lb, /style=\{area\("podium"\)\}/);
  assert.match(lb, /style=\{area\("list"\)\}/);
});

test('the landscape list gets the whole frame height so no rank is cropped', () => {
  // Podium stops reserving a fixed 276px block and the list loses its top margin.
  assert.match(lb, /landscape \? "mt-0 h-auto min-h-0" : "mt-2 h-\[276px\]"/);
  assert.match(lb, /bg-gradient-to-b from-\[#241a63\]\/95 to-\[#120d36\]\/95 p-2 shadow-\[0_10px_24px_rgba\(0,0,0,\.45\)\] \$\{landscape \? "mt-0" : "mt-2"\}/);
  // Rows themselves still scroll inside the column.
  assert.match(lb, /no-scrollbar smooth-scroll min-h-0 flex-1 space-y-2 overflow-y-auto pb-1/);
  // Compact podium so three cards fit a 420px-tall frame.
  assert.match(lb, /landscape \? \(big \? "-mb-5 h-\[58px\] w-\[58px\]" : "-mb-4 h-\[50px\] w-\[50px\]"\)/);
  assert.match(lb, /size=\{landscape \? \(big \? 54 : 46\) : \(big \? 84 : 66\)\}/);
});

test('the congrats card becomes two columns: hero left, text and buttons right', () => {
  assert.match(lb, /gridTemplateAreas: '"avatar title" "badge stage" "score progress" "stats btns"'/);
  assert.match(lb, /gridTemplateRows: "auto auto auto auto"/);
  for (const name of ['avatar', 'badge', 'score', 'stats', 'title', 'stage', 'progress', 'btns']) {
    assert.ok(lb.includes(`"${name}"`), `area ${name} must be placed`);
  }
  // Portrait keeps its own block sizes; landscape only compacts them.
  assert.match(lb, /landscape \? "h-\[86px\] w-\[86px\]" : "h-\[116px\] w-\[116px\]"/);
  assert.match(lb, /compact \? "h-\[44px\]" : "h-\[52px\]"/);
});

test('the portrait rankings page still fits its 420x760 frame', () => {
  // Title shrank from 40px (it clipped at 420px wide) and the stack is a touch tighter.
  assert.match(lb, /landscape \? "text-\[24px\]" : "text-\[34px\]"/);
  assert.match(lb, /landscape \? "mt-0" : "mt-6"/);
  assert.match(lb, /"relative mt-auto grid w-full gap-2 pt-2"/);
  // Nothing in the portrait branch may fall back to a grid area.
  assert.match(lb, /const congratsGrid: CSSProperties = landscape\s+\? \{/);
});
