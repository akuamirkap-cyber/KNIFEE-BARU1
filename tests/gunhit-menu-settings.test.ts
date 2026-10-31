import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const app = readFileSync(path.join(process.cwd(), 'src/games/gunhit/App.tsx'), 'utf8');

test('Vortex ring, combo ghost, and combo glow are disabled in both SGA and Perfect Shot', () => {
  const perfectShotMenu = readFileSync(path.join(process.cwd(), 'src/games/perfect-shot/components/MainMenu.tsx'), 'utf8');
  const perfectShotCss = readFileSync(path.join(process.cwd(), 'src/games/perfect-shot/index.css'), 'utf8');
  assert.doesNotMatch(app, /sga-vortex-anchor|sga-vortex-ring|vortexAnchorRef/);
  assert.doesNotMatch(perfectShotMenu, /combo-ghost|combo-glow/);
  assert.match(perfectShotCss, /\.st-in-combo::before \{ content: none !important; animation: none !important; \}/);
  assert.doesNotMatch(perfectShotCss, /@keyframes comboVortex2|@keyframes comboGlow|@keyframes comboGhost/);
  assert.match(app, /SunburstFX size=\{390\}/, 'the separate rarity Sunburst stays in SGA');
});
test('menu rays share the weapon frame pivot and keep centering separate from the animated transform', () => {
  const menuStart = app.indexOf('MAIN MENU: EXACT MATCHING SCREENSHOT');
  const gunFrame = app.indexOf("planStyleMotion(menuPlan.gun", menuStart);
  const raysStart = app.indexOf("planMotion('rays-drop', WHEEL.d, WHEEL.dur", menuStart);
  const raysAnchor = app.lastIndexOf('className="absolute left-1/2 top-1/2 h-[min(300px,64vw)]', raysStart);
  assert.notEqual(menuStart, -1);
  assert.notEqual(gunFrame, -1);
  assert.notEqual(raysStart, -1);
  assert.ok(gunFrame < raysAnchor && raysAnchor < raysStart, 'the light is anchored inside the animated weapon frame');
  assert.match(app.slice(raysAnchor, raysStart), /-translate-x-1\/2 -translate-y-1\/2/);
  assert.match(app.slice(raysStart, raysStart + 110), /'h-full w-full'/);
  assert.match(app, /className="float relative h-full w-full" data-menu-gun/);
  assert.match(app, /ctx\.getImageData\(0, 0, cv\.width, cv\.height\)/);
  assert.match(app, /--weapon-pivot-x/);
  assert.match(app, /ref=\{weaponPivotRef\} className="pointer-events-none absolute inset-0"/);
  assert.match(app, /SunburstFX size=\{390\}[^>]*core=\{false\}/);
});

test('Gun Hit menu uses PERFECT SHOT branding and keeps special-stage picks in Settings', () => {
  const menuStart = app.indexOf('MAIN MENU: EXACT MATCHING SCREENSHOT');
  const settingsStart = app.indexOf("{screen === 'menu' && settingsOpen && (");
  const modalsStart = app.indexOf('{/* Modals */}', settingsStart);
  assert.notEqual(menuStart, -1);
  assert.notEqual(settingsStart, -1);
  assert.notEqual(modalsStart, -1);

  const menu = app.slice(menuStart, settingsStart);
  const settings = readFileSync(path.join(process.cwd(), 'src/games/gunhit/components/SgaSettingsPanel.tsx'), 'utf8');
  assert.match(menu, /'PERFECT'\.split\(''\)/);
  assert.match(menu, /'SHOT'\.split\(''\)/);
  assert.doesNotMatch(menu, /startSpecial\(/);
  assert.match(settings, /PENGATURAN/);
  assert.match(app.slice(settingsStart, modalsStart), /onSpecial=\{startSpecial\}/);
  assert.match(settings, /onSpecial\('boulder'\)/);
  assert.match(settings, /onSpecial\('bonus'\)/);
  assert.match(settings, /onSpecial\('treasure'\)/);
  assert.match(menu, /<CoinSprite size=\{25\}/);
  assert.match(menu, /<DiamondSprite size=\{24\} fillRatio=\{0\.92\}/);
  assert.match(menu, /from-\[#ff6a3d\].*to-\[#e0331e\]/s);
  assert.match(menu, /from-\[#4cef6a\].*to-\[#18b93a\]/s);
  assert.doesNotMatch(menu, /🍎|\{getWeapon\(weapon\)\.name\}/);
  assert.match(app, /const pw = 337;\s+const ph = 295;/);
  assert.match(menu, /width:\s*'min\(337px,\s*90vw\)',\s*height:\s*'min\(295px,\s*54vh\)'/);
  const bottomBar = menu.slice(menu.indexOf('Right game\'s four framed vector icons'));
  assert.equal((bottomBar.match(/<GameIcon name=\{item\.icon\}/g) ?? []).length, 1);
  assert.match(bottomBar, /<NavFrame set=\{perfectShotIconSet\}/);
  assert.match(bottomBar, /data-gloss="off"/);
  assert.match(app, /id: 'gun', label: 'GUN'/);
  assert.match(app, /id: 'ranks', label: 'RANKS'/);
  assert.match(app, /id: 'ready', label: 'READY!'/);
  assert.match(app, /id: 'setting', label: 'SETTING'/);

  const game = readFileSync(path.join(process.cwd(), 'src/games/gunhit/game/Game.ts'), 'utf8');
  const faces = readFileSync(path.join(process.cwd(), 'src/games/gunhit/game/faces.ts'), 'utf8');
  assert.match(faces, /bgTop: '#1b4d59', bgBot: '#153743'/);
  assert.match(game, /lowerShade\.addColorStop\(0\.58, 'rgba\(2, 10, 18, 0\.045\)'\)/);
  assert.match(game, /lowerShade\.addColorStop\(1, 'rgba\(2, 10, 18, 0\.12\)'\)/);
  assert.match(app, /SunburstFX size=\{390\} color=\{gunSunburstColor\(getWeapon\(weapon\)\.rarity\)\} intensity=\{0\.16\}[^>]*core=\{false\}/);
  const coinSprite = readFileSync(path.join(process.cwd(), 'src/games/shared/CoinSprite.tsx'), 'utf8');
  assert.match(coinSprite, /0\.68 \+ Math\.abs\(Math\.cos/);
  assert.match(coinSprite, /false, false/);
});

test('SGA uses Perfect Shot UI, page-transition and ambient audio with a separate music control', () => {
  assert.match(app, /from '\.\.\/perfect-shot\/audio\/sfx'/);
  assert.match(app, /from '\.\.\/perfect-shot\/audio\/useSound'/);
  assert.match(app, /studioSfx\.hover\(\)/);
  assert.match(app, /studioSfx\.tap\(\)/);
  assert.match(app, /studioSfx\.menuEnter\(0\.03, nextPlan\)/);
  assert.match(app, /getSharedMenuPlan\(\) \?\? resolvePlan\(psAnimationConfig\)/);
  assert.match(app, /const freshMenuPlan = \(\) => getSharedMenuPlan\(\) \?\? resolvePlan\(animStore\.get\(\), menuPlanRef\.current\)/);
  assert.match(app, /studioSfx\.shutterClose\(/);
  assert.match(app, /studioSfx\.shutterOpen\(/);
  assert.match(app, /studioSfx\.menuExit\('play'/);
  assert.match(app, /studioSfx\.playEnter\(mountAt \/ 1000, PLAY_IN, stageConfig\.boss, stageConfig\.ammo/);
  assert.match(app, /studioSfx\.scopeAim\(lead \/ 1000\)/);
  assert.match(app, /studioSfx\.scopeOpen\(revealAt \/ 1000\)/);
  assert.match(app, /variant="scope"/);
  assert.match(app, /captureMenuWeaponFlight/);
  assert.match(app, /const PLAY_SCOPE = \{ menuLead: 180, questLead: 260, otherLead: 460, cover: 620, hold: 600, reveal: 680 \}/);
  assert.match(app, /deferPageClose\(finishAt, \(\) => \{[\s\S]*?setWeaponFlight\(null\)/);
  assert.doesNotMatch(app, /deferPageClose\(780, \(\) => setWeaponFlight\(null\)\)/);
  assert.match(app, /const previewScale = \(295 \* 0\.78\) \/ Math\.max\(metric\.span, 130\)/);
  assert.match(app, /gameCenterX = \(210 \+ metric\.centerOffsetX \* GAMEPLAY_GUN_SCALE\)/);
  assert.match(app, /gameCenterY = \(GUN_Y \+ metric\.centerOffsetY \* GAMEPLAY_GUN_SCALE\)/);
  assert.match(app, /to: \{ x: gameCenterX - flightMassX, y: gameCenterY - flightMassY, w: toW, h: toH \}/);
  assert.match(app, /<SgaWeaponFlight key=\{weaponFlight\.id\} flight=\{weaponFlight\} \/>/);
  const game = readFileSync(path.join(process.cwd(), 'src/games/gunhit/game/Game.ts'), 'utf8');
  assert.match(game, /startAtLevel\(level: number, weaponHandoff = false, weaponEntryDelay = 0, synchronizedEntrance = false\)/);
  assert.match(app, /studioSfx\.playExit\(0\)/);
  assert.match(app, /studioSfx\.questEnter\(timing\.swapAt \/ 1000, QUEST_IN\)/);
  assert.match(app, /studioSfx\.achEnter\(timing\.swapAt \/ 1000, ACH_IN/);
  assert.match(app, /studioSfx\.lbEnter\(timing\.swapAt \/ 1000, LB_IN\)/);
  assert.match(app, /beginMenuPageTransition\('cloud', 'QUEST', menuPageLead\(\)/);
  assert.match(app, /beginMenuPageTransition\('wrap', 'ACHIEVEMENT', menuPageLead\(\)/);
  assert.match(app, /beginMenuPageTransition\('podium', 'PERINGKAT', menuPageLead\(\)/);
  assert.match(app, /studioSfx\.cloudClose\(timing\.lead \/ 1000, timing\.rate\)/);
  assert.match(app, /studioSfx\.menuEnter\(timing\.swapAt \/ 1000, nextPlan\)/);
  assert.match(app, /phase=\{menuPageTransition\.phase\}/);
  assert.match(app, /progress=\{\{ stage: Math\.max\(1, Math\.min\(GUN_HIT_MAP_MAX_LEVEL, bestLevel\)\), stages: SGA_QUEST_STAGES \}\}/);
  assert.match(app, /className=\{`gunhit-menu[^`]*\$\{active && introReady \? '' : 'slide-paused'\}[^`]*\$\{menuReady && introReady && !menuDeparture && !settingsOpen \? '' : 'pointer-events-none'\}/);
  assert.match(app, /introReady = true/);
  assert.match(app, /sans-intro-complete/);
  const hub = readFileSync(path.join(process.cwd(), 'src/App.tsx'), 'utf8');
  assert.match(hub, /introReady=\{hasBooted && !loading\}/);
  assert.match(app, /font-title tabular-nums font-black tracking-tight/);
  assert.match(app, /studioSfx\.questExit\(0\)/);
  assert.match(app, /studioSfx\.achExit\(0\)/);
  assert.match(app, /studioSfx\.lbExit\(0\)/);
  assert.match(app, /studioSfx\.subEnter\(/);
  assert.match(app, /studioSfx\.subExit\(/);
  assert.match(app, /studioSfx\.shopEnter\(timing\.swapAt \/ 1000, SHOP_IN\)/);
  assert.match(app, /studioSfx\.shopExit\(0\)/);
  assert.match(app, /studioSfx\.startMusic\(\)/);
  assert.equal((app.match(/<MusicAmbientControl enabled=\{studioSound\.music\} onToggle=\{toggleBackgroundMusic\} \/>/g) ?? []).length, 1);
  assert.match(app, /<SgaSettingsPanel/);
  assert.match(app, /studioSfx\.setMusic\(enabled\)/);
  assert.match(app, /studioSfx\.setVolume\(clamped\)/);
});

test('SGA uses Perfect Shot quest-map geometry while keeping SGA stage progress and matching page cues to the cover reveal', () => {
  const map = readFileSync(path.join(process.cwd(), 'src/games/perfect-shot/components/QuestMap.tsx'), 'utf8');
  assert.match(app, /cloud: \{ cover: 600, hold: 400, reveal: 820 \}/);
  assert.match(app, /wrap: \{ cover: 640, hold: 560, reveal: 820 \}/);
  assert.match(app, /podium: \{ cover: 600, hold: 520, reveal: 700 \}/);
  assert.match(app, /Math\.round\(base\.cover \/ rate\)/);
  assert.match(app, /const rate = variant === 'fade' \? 1 : OVERLAY_RATE/);
  assert.match(app, /const menuPageLead = \(\) => Math\.max\(300, 380 \* menuPlanRef\.current\.k\)/);
  assert.match(app, /setMenuPageTransition\(\{ \.\.\.transition, phase: 'cover' \}\)/);
  assert.match(app, /setMenuPageTransition\(\{ \.\.\.transition, phase: 'reveal' \}\)/);
  assert.match(app, /studioSfx\.questEnter\(timing\.swapAt \/ 1000, QUEST_IN\)/);
  assert.match(app, /studioSfx\.achEnter\(timing\.swapAt \/ 1000, ACH_IN/);
  assert.match(app, /studioSfx\.lbEnter\(timing\.swapAt \/ 1000, LB_IN\)/);
  assert.match(app, /leaving=\{mapLeaving\}/);
  assert.match(app, /beginMenuPageTransition\('cloud', 'QUEST', QUEST_OUT\.total/);
  assert.match(app, /studioSfx\.menuEnter\(timing\.swapAt \/ 1000, nextPlan\)/);
  assert.match(app, /beginMenuPageTransition\('wrap', 'ACHIEVEMENT', ACH_OUT\.total/);
  assert.match(app, /beginMenuPageTransition\('podium', 'PERINGKAT', LB_OUT\.total/);
  assert.match(app, /opening \? menuPageLead\(\) : SHOP_OUT\.total/);
  assert.match(app, /const MENU_EXIT_K = 0\.78/);
  assert.match(app, /planStyleMotion\(menuPlan\.title\[i\], TL\.letter\(i\), \['in-letter', 'out-letter'\]/);
  assert.match(app, /planStyleMotion\(menuPlan\.nav\[i\], TL\.nav\(i\), \['in-pop', 'out-down'\]/);
  assert.match(app, /setMenuDeparture\('play'\)/);
  assert.match(app, /beginMenuPageTransition\('fade', 'MENU', PLAY_OUT\.total/);
  assert.match(app, /<TransitionOverlay[\s\S]*?phase=\{menuPageTransition\.phase\}[\s\S]*?rate=\{menuPageTransition\.rate\}/);
  assert.match(app, /const SGA_QUEST_STAGES: StageBase\[\] = Array\.from\(\{ length: GUN_HIT_MAP_MAX_LEVEL \}/);
  assert.match(app, /name: node\.label/);
  assert.match(map, /progress\?: \{ stage: number; stars\?: Record<number, number>; stages\?: readonly StageBase\[\] \}/);
  assert.match(map, /const cur = progress\?\.stage \?\? g\.stage/);
  assert.match(map, /const stages = progress\?\.stages \?\? STAGES/);
  assert.match(map, /const starsAt = \(n: number\) => progress \? progress\.stars\?\.\[n\] \?\? 0/);
  assert.match(map, /const colW = W \* 0\.84 \* 0\.44/);
  assert.match(map, /#ffffff 47%/);
  assert.match(map, /opacity: 1/);
  assert.doesNotMatch(map.slice(map.indexOf('background: colGrad'), map.indexOf('filter: undefined')), /MaskImage/);
  assert.match(map, /appearance-none border-0 bg-transparent p-0 text-inherit/);
  assert.equal((map.match(/data-gloss="off"/g) ?? []).length, 4, 'the stage hit areas and QuestMap controls bypass the SGA global glass-button treatment');
  assert.match(map, /via-white\/45/);
});

test('SGA achievement screen matches the reference board layout while retaining native balances and claim progression', () => {
  const questModal = readFileSync(path.join(process.cwd(), 'src/games/gunhit/components/QuestModal.tsx'), 'utf8');
  assert.match(questModal, /coins: number/);
  assert.match(questModal, /diamonds: number/);
  assert.match(questModal, /data-gloss="off"/);
  assert.match(questModal, /BONUS MILESTONE/);
  assert.match(questModal, /h-\[176px\]/);
  assert.match(questModal, /\[3, 8, 14, 17\]/);
  assert.match(questModal, /RESET DALAM/);
  assert.match(questModal, /KLAIM SEMUA/);
  assert.match(questModal, /\[1, 2, 3, 4\]/);
  assert.match(questModal, /onClaim\(q\)/);
  assert.match(questModal, /onClaimMilestone\(count\)/);
  assert.match(app, /coins=\{totalCoins\}[\s\S]*?diamonds=\{diamonds\}/);
});

test('menu preview keeps the SGA sunburst and centered canvas inside the Perfect Shot layout', () => {
  const menuStart = app.indexOf("{screen === 'menu' && !mapOpen && !questOpen && !leaderboardOpen");
  const settingsStart = app.indexOf("{screen === 'menu' && settingsOpen && (");
  const previewArea = app.slice(menuStart, settingsStart);
  assert.match(previewArea, /SunburstFX size=\{390\}[^>]*intensity=\{0\.16\}/);
  assert.match(previewArea, /w-\[68%\]/);
  assert.match(previewArea, /<canvas ref=\{previewCanvasRef\}/);
  assert.match(previewArea, /width:\s*'min\(337px,\s*90vw\)'/);
  assert.match(previewArea, /height:\s*'min\(295px,\s*54vh\)'/);
  assert.match(previewArea, /data-menu-gun/);
  assert.doesNotMatch(previewArea, /translate-x-\[1%\]/);
  assert.match(app, /const previousGunState = \{ \.\.\.gunState \};[\s\S]*?drawGunCentered\(ctx, curW\.id, 0, 0, true, undefined, false\);[\s\S]*?Object\.assign\(gunState, previousGunState\)/);
  assert.match(app, /intensity=\{0\.16\}/);
  const motionCss = readFileSync(path.join(process.cwd(), 'src/games/perfect-shot/index.css'), 'utf8');
  assert.match(motionCss, /\.gunhit-menu \.in-gun \{ animation-name: sgaGunIn; \}/);
});

test('menu & game theme choices default to forest and expose all SGA background themes', () => {
  const themes = readFileSync(path.join(process.cwd(), 'src/games/gunhit/components/MenuEnvironment.tsx'), 'utf8');
  const bgThemes = readFileSync(path.join(process.cwd(), 'src/games/gunhit/game/backgroundThemes.ts'), 'utf8');
  assert.match(bgThemes, /DEFAULT_SGA_BG_THEME:\s*SgaBackgroundTheme\s*=\s*'forest'/);
  const settingsUi = readFileSync(path.join(process.cwd(), 'src/games/gunhit/components/SgaSettingsPanel.tsx'), 'utf8');
  assert.match(settingsUi, /TEMA LATAR/);
  assert.match(app, /gameRef\.current\?\.setBackgroundTheme\(menuTheme\)/);
  for (const theme of [
    'forest',
    'morning',
    'town',
    'snow',
    'skyline',
    'battlefield',
    'mystic',
    'crystal',
    'yoyo_neon',
    'royal_vault',
    'cyber_grid',
    'nebula',
    'auto',
  ]) {
    assert.ok(bgThemes.includes(`id: '${theme}'`), `backgroundThemes includes ${theme}`);
  }
  assert.match(themes, /data-menu-environment="morning"/);
  assert.match(themes, /data-menu-environment="town"/);
  assert.match(themes, /data-menu-environment="snow"/);
  assert.match(themes, /data-menu-environment="skyline"/);
  assert.match(themes, /data-menu-environment="nebula"/);
});
