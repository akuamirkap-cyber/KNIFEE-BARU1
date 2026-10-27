/**
 * Post-impact audit for the imported SET 2..7 guns.
 *
 * One trigger pull per gun, then a few seconds of slide-1 time with no second
 * shot:
 *   - the round must land and stay landed (one wheel entry + one slide-7 round),
 *   - slide 1 must not paint a second round on top (`hideArt`),
 *   - whatever the round still animates after landing must finish and clean up,
 *   - nothing may carry a NaN/Infinity coordinate.
 *
 * Usage: npx tsx tools/set-seven-live-audit.ts
 */
import { installCanvasShim } from '../tests/supportCanvas';
import { installSilentAudio } from './supportAudioSilent';

installCanvasShim();

const g = globalThis as unknown as Record<string, unknown> & { window: Record<string, unknown> };
g.window = Object.assign(g.window ?? {}, {
  setTimeout, clearTimeout,
  setInterval: () => 0, clearInterval: () => undefined,
  addEventListener: () => undefined, removeEventListener: () => undefined,
  devicePixelRatio: 1, innerWidth: 420, innerHeight: 760,
});
installSilentAudio();

const gradient = { addColorStop: () => {} };
const ctx = new Proxy({ canvas: { width: 420, height: 760 } } as Record<string, unknown>, {
  get(t, p) {
    const n = String(p);
    if (n === 'canvas') return t.canvas;
    if (n === 'createLinearGradient' || n === 'createRadialGradient' || n === 'createPattern') return () => gradient;
    if (n === 'measureText') return () => ({ width: 8 });
    return () => undefined;
  },
  set(t, p, v) { t[String(p)] = v; return true; },
}) as unknown as CanvasRenderingContext2D;

const canvas = {
  width: 420, height: 760, style: {},
  getContext: () => ctx,
  addEventListener: () => undefined,
  removeEventListener: () => undefined,
  getBoundingClientRect: () => ({ left: 0, top: 0, width: 420, height: 760 }),
};

const { Game, makeLevel } = await import('../src/games/gunhit/game/Game.ts');
const { getWeapon } = await import('../src/games/gunhit/game/weapons.ts');
const variants = await import('../src/games/gunhit/game/art/gunVariants.ts');
const { SET_SEVEN_DESIGN_WEAPONS } = variants;
const { setSevenIdFor } = await import('../src/games/gunhit/game/setSevenArt.ts');

const emptyEvents = {
  onGameOver: () => {}, onStageChange: () => {}, onStageCleared: () => {},
  onShotFired: () => {}, onCoin: () => {}, onBossDefeated: () => {},
  onDiamondCollected: () => {}, onTreasureCoin: () => {}, onGift: () => {},
};

function probe(weapon: string) {
  const game = new Game(canvas as unknown as HTMLCanvasElement, emptyEvents as never) as unknown as Record<string, any>;
  game.level = makeLevel(3);
  game.state = 'play';
  game.setWeapon(weapon);
  game.cooldown = 0;
  game.reloadT = 0;
  game.ammoLeft = 30;
  game.snowLoaded = 6;
  return game;
}

const DT = 1 / 60;
const bad: string[] = [];
const rows: string[] = [];

for (const id of SET_SEVEN_DESIGN_WEAPONS) {
  const s7 = setSevenIdFor(id)!;
  variants.setGunEffect(id as never, 'set7');
  const game = probe(id);
  game.shoot();
  const carrier = game.projs[0] as { setSeven?: unknown } | undefined;
  if (!carrier) { bad.push(`${id}: no carrier`); continue; }

  // Fly until it lands (or 3 s), keeping slide 1 in `play` and not re-firing.
  let t = 0;
  while (t < 3 && game.projs.length > 0) {
    game.state = 'play';
    game.cooldown = 9;
    game.update(DT);
    t += DT;
  }
  const layer = game.s7 as { stuck: unknown[]; released: { x: number; y: number }[]; wheel?: unknown };
  const items = (game.items as { type: string; hideArt?: boolean; angle: number }[])
    .filter((it) => it.type === 'bullet');
  const releasedAtLanding = layer.released.length;
  // Let the landed round finish its own animation.
  for (let i = 0; i < 240; i++) {
    game.state = 'play';
    game.cooldown = 9;
    game.update(DT);
  }
  const probs: string[] = [];
  if (game.projs.length) probs.push('carrier never landed');
  // A burst gun scores one hit per pellet on slide 1 (the shotgun/sapphire
  // fire three), so it stores more than one entry — all of them invisible.
  const burst = game.weapon.burst ?? 1;
  if (items.length < 1 || items.length > burst) probs.push(`items ${items.length} (want 1..${burst})`);
  if (layer.stuck.length !== 1) probs.push(`slide-7 stuck ${layer.stuck.length} (want 1)`);
  if (items.some((it) => !it.hideArt)) probs.push('slide 1 still paints its own round');
  if (layer.released.length) probs.push(`released rounds never died (${layer.released.length})`);
  const nan = (n: number) => !Number.isFinite(n);
  if (items.some((it) => nan(it.angle))) probs.push('NaN item angle');
  if (layer.released.some((p) => nan(p.x) || nan(p.y))) probs.push('NaN released round');
  if (!Number.isFinite(game.cooldown)) probs.push('NaN cooldown');
  if (probs.length) bad.push(`${id}: ${probs.join(', ')}`);
  rows.push(`${probs.length ? '✗' : '✓'} ${id.padEnd(21)} s7=${String(s7).padEnd(12)}`
    + ` landed at ${t.toFixed(2)}s, released ${releasedAtLanding}, stuck ${layer.stuck.length}`);
}

console.log(rows.join('\n'));
console.log(`\n${SET_SEVEN_DESIGN_WEAPONS.length - bad.length} of ${SET_SEVEN_DESIGN_WEAPONS.length} guns land cleanly`);
if (bad.length) {
  console.log('\nproblems:\n' + bad.join('\n'));
  process.exitCode = 1;
}
