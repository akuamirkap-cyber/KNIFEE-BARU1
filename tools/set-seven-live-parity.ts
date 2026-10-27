/**
 * 100% detail check: every SET 2..7 gun, fired on slide 1, against slide 7.
 *
 * For each of the 63 imported guns this prints
 *   - slide 7's own trigger interval vs the interval slide 1 ends up with,
 *   - slide 7's own launch speed vs the speed slide 1's carrier flies,
 *   - the muzzle/spawn Y the round actually starts from,
 *   - which weapons are beams (no travel) and which hand their round over late.
 *
 * Usage: npx tsx tools/set-seven-live-parity.ts
 */
import { installCanvasShim } from '../tests/supportCanvas';
import './supportAudioSilent';

installCanvasShim();

const { Game, makeLevel } = await import('../src/games/gunhit/game/Game.ts');
const { getWeapon } = await import('../src/games/gunhit/game/weapons.ts');
const { SET_SEVEN_DESIGN_WEAPONS } = await import('../src/games/gunhit/game/art/gunVariants.ts');
const gunVariants = await import('../src/games/gunhit/game/art/gunVariants.ts');
const { setSevenIdFor } = await import('../src/games/gunhit/game/setSevenArt.ts');
const { sevenCooldown } = await import('../src/games/gunhit/game/setSevenShot.ts');

/** A Game without a canvas: enough of slide 1 for the fire path. */
function probe(weapon: string) {
  const game = Object.create(Game.prototype) as Record<string, unknown>;
  const particles: unknown[] = [];
  Object.assign(game, {
    level: makeLevel(3), weapon: getWeapon(weapon as never), state: 'play',
    projs: [], beams: [], items: [], flyers: [], frags: [], stuck: 0,
    particles, lights: [], sink: { push: (p: unknown) => particles.push(p), light: () => {} },
    events: {}, rot: 0, levelTime: 0, camY: 0, bump: 0, shake: 0, hitStop: 0, flashWhite: 0,
    cooldown: 0, reloadT: 0, ammoLeft: 30, snowLoaded: 6, maxAmmoMult: 1,
    speedMult: 1, dmgMult: 1, rt: 0, coins: 0, score: 0, slowT: 0, slowF: 1,
    combo: 0, lastHit: -10, time: 1, hitFlash: 0, timeScale: 1,
    faceCtx: null, faceScale: 2,
  });
  return game;
}

function fire(id: string) {
  gunVariants.setGunEffect(id as never, 'set7');
  const game = probe(id);
  game.shoot();
  const carrier = (game.projs as unknown as Carrier[])[0];
  const s7 = (game as unknown as { s7: { update: (dt: number) => void; takeShots: () => { vy: number; y: number }[] } }).s7;
  let late = 0;
  for (let i = 0; i < 90 && carrier?.setSevenPending; i++) {
    s7.update(1 / 60);
    const made = s7.takeShots();
    if (!made.length) { late++; continue; }
    (carrier as unknown as { setSeven: unknown }).setSeven = made[0];
    (carrier as unknown as { setSevenPending: boolean }).setSevenPending = false;
    const sp = Math.abs(made[0].vy);
    if (sp > 200) {
      (carrier as unknown as { vy: number }).vy = -sp;
      (carrier as unknown as { y: number }).y = made[0].y;
    }
    break;
  }
  return { game, carrier, late };
}

const rows: string[] = [];
let bad = 0;
for (const id of SET_SEVEN_DESIGN_WEAPONS) {
  const s7 = setSevenIdFor(id)!;
  const want = sevenCooldown(s7)!;
  const { game, carrier } = fire(id);
  const cool = (game as unknown as { cooldown: number }).cooldown;
  const w = getWeapon(id as never);
  const own = carrier?.setSeven ? Math.abs(carrier.setSeven.vy) : 0;
  const beam = own > 0 && own <= 200;
  const wantSpeed = beam ? w.speed : own;
  const gotSpeed = Math.abs(carrier?.vy ?? 0);
  const coolOk = Math.abs(cool - want) < 1e-9;
  const speedOk = Math.abs(gotSpeed - wantSpeed) < 1e-6;
  if (!coolOk || !speedOk) bad++;
  rows.push(
    `${coolOk && speedOk ? '✓' : '✗'} ${id.padEnd(21)} s7=${s7.padEnd(12)}`
    + ` rate ${want.toFixed(2)}/${cool.toFixed(2)}`
    + ` speed ${beam ? 'BEAM' : String(wantSpeed).padStart(5)}/${String(Math.round(gotSpeed)).padStart(5)}`
    + ` spawn y ${String(Math.round(carrier?.y ?? 0)).padStart(3)}`
    + (carrier?.setSevenPending ? ' (late)' : ''),
  );
}
console.log(rows.join('\n'));
console.log(`\n${SET_SEVEN_DESIGN_WEAPONS.length - bad} of ${SET_SEVEN_DESIGN_WEAPONS.length} guns match slide 7 in rate and speed`);
if (bad) process.exitCode = 1;
