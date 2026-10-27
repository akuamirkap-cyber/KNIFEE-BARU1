/**
 * One-shot anomaly sweep.
 *
 * Fires exactly ONE shot for every weapon × shot-effect combination and reports
 * combinations where that single round does more than hit the wheel once —
 * i.e. the stage clears (wheel shatters), the shot is counted several times, or
 * the level state jumps. This is the harness that found "pistol + last effect
 * breaks the wheel on the first shot".
 *
 * Usage: npx tsx tools/one-shot-sweep.ts [weaponId ...]
 */
import { installCanvasShim } from '../tests/supportCanvas';
import { installSilentAudio } from './supportAudioSilent';

const restore = installCanvasShim();

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
const { WEAPONS } = await import('../src/games/gunhit/game/weapons.ts');
const variants = await import('../src/games/gunhit/game/art/gunVariants.ts');

const LEVEL = Number(process.env.LEVEL ?? 2);
const DT = 1 / 60;

interface Row {
  id: string;
  effect: string;
  stuck: number;
  ammo: number;
  state: string;
  score: number;
  projs: number;
  note: string;
}

function run(id: string, effect: string | null): Row | null {
  const events = { onGameOver: () => {}, onStageChange: () => {} };
  const game = new Game(canvas as unknown as HTMLCanvasElement, events as never) as unknown as Record<string, any>;
  game.level = makeLevel(LEVEL);
  game.state = 'play';
  game.setWeapon(id);
  if (effect) {
    if (!variants.supportsGunVariants(id)) return null;
    if (!variants.getGunEffectOptions(id).some((o: { id: string }) => o.id === effect)) return null;
    variants.setGunEffect(id, effect as never);
  }
  const ammo = game.level.ammo;
  // Fresh level (stuck = 0, full ammo), then one trigger pull. `startRun` loads
  // the level and puts it in `intro`, exactly like a stage that just began.
  game.startAtLevel(LEVEL);
  game.setWeapon(id);
  game.items = [];
  game.cooldown = 0;
  game.reloadT = 0;
  for (let i = 0; i < 40 && game.state === 'intro'; i++) game.update(DT);
  game.cooldown = 0;
  game.shoot();
  const firedAmmo = ammo - game.ammoLeft;

  let frames = 0;
  const introStart = game.state;
  void introStart;
  let cleared = false;
  let failed = false;
  const startScore = game.score;
  for (; frames < 240; frames++) {
    game.update(DT);
    if (game.state === 'clear') cleared = true;
    if (game.state === 'fail') failed = true;
    if (game.state === 'over') failed = true;
    if (cleared || failed) break;
  }
  const notes: string[] = [];
  if (firedAmmo !== 1) notes.push(`fired ${firedAmmo} rounds`);
  if (game.stuck === 0 && !cleared) notes.push('no wheel hit');
  if (cleared) notes.push(`CLEARED in ${frames} frames`);
  if (failed) notes.push('FAILED');
  if (game.stuck > 1) notes.push(`${game.stuck} wheel hits`);
  if (cleared || failed || game.stuck > 1 || firedAmmo !== 1) {
    notes.unshift(`score +${game.score - startScore}`);
  }
  return {
    id,
    effect: effect ?? '(default)',
    stuck: game.stuck,
    ammo,
    state: game.state,
    score: game.score - startScore,
    projs: game.projs?.length ?? 0,
    note: notes.join(', '),
  };
}

const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const ids: string[] = args.length ? args : WEAPONS.map((w: { id: string }) => w.id);
const rows: Row[] = [];

for (const id of ids) {
  const options = variants.supportsGunVariants(id)
    ? variants.getGunEffectOptions(id).map((o: { id: string }) => o.id)
    : [null];
  for (const effect of options) {
    try {
      const row = run(id, effect);
      if (row && (row.note || process.env.ALL === '1')) rows.push(row);
    } catch (err) {
      rows.push({
        id, effect: String(effect), stuck: -1, ammo: -1, state: 'THREW',
        score: 0, projs: 0, note: `threw: ${(err as Error).message}`,
      });
    }
  }
}

console.log(`level ${LEVEL}: ${rows.length} anomalous one-shot combinations\n`);
for (const r of rows.sort((a, b) => (b.stuck - a.stuck) || a.id.localeCompare(b.id))) {
  console.log(`${r.id.padEnd(22)} ${String(r.effect).padEnd(10)} hits ${String(r.stuck).padEnd(3)}/${String(r.ammo).padEnd(3)} ${r.state.padEnd(6)} ${r.note}`);
}

restore();
