/**
 * The star item has to work for every gun, in every stage that offers it.
 *
 * Slide 1's own weapons always obeyed the star cards (`double` = two barrels,
 * `mini`/`giant` = round size, `power`, `ammo`, `speed`, `rapid`). The guns
 * imported from slide 7's SET 1..7, slide 2, slide 9 and slide 11 build their
 * rounds in their own layer, so several of those cards silently did nothing on
 * them — the doubled gun fired one barrel, the size card only reached the entry
 * hole, and a round whose carrier the pickup dropped stayed painted in mid-air.
 *
 * This sweep walks every slide-1 weapon with every imported effect, in Diamond
 * Breaker, Harta Karun and the boss round, taking each card the mode offers, and
 * checks three things per run: nothing throws, the round really hurts the
 * target, and every carrier either gets its layer's round or flies out anyway.
 *
 * Usage: npx tsx tools/star-ported-sweep.ts [effect]
 */
import { installSilentAudio } from './supportAudioSilent';

const W = 420;
const H = 760;
const g = globalThis as unknown as Record<string, unknown> & { window: Record<string, unknown> };
g.window = Object.assign(g.window ?? {}, {
  setTimeout, clearTimeout,
  setInterval: () => 0, clearInterval: () => undefined,
  addEventListener: () => undefined, removeEventListener: () => undefined,
  devicePixelRatio: 1, innerWidth: W, innerHeight: H,
});
/**
 * Baked sprites (the wheel faces, the boulder texture) are painted into
 * offscreen canvases. The sweep never looks at those pixels, so every context
 * is permissive: Node has no `Path2D`, and the boulder fills pre-baked paths.
 */
const gradient = { addColorStop: () => undefined };
function permissiveCtx(): CanvasRenderingContext2D {
  return new Proxy({ canvas: { width: 64, height: 64 } } as Record<string, unknown>, {
    get(target, prop) {
      const name = String(prop);
      if (name === 'canvas') return target.canvas;
      if (name === 'createLinearGradient' || name === 'createRadialGradient'
        || name === 'createConicGradient' || name === 'createPattern') return () => gradient;
      if (name === 'measureText') return () => ({ width: 8 });
      if (name === 'getImageData') return () => ({ data: new Uint8ClampedArray(4) });
      if (name === 'createImageData') {
        return (w = 1, h = 1) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) });
      }
      return () => undefined;
    },
    set(target, prop, value) { target[String(prop)] = value; return true; },
  }) as unknown as CanvasRenderingContext2D;
}
g.document = {
  createElement: () => ({ width: 64, height: 64, style: {}, getContext: () => permissiveCtx() }),
  addEventListener: () => undefined,
  removeEventListener: () => undefined,
};
// Boss art is decoded with `new Image()`; the sweep never inspects pixels.
g.Image = class {
  width = 1;
  height = 1;
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  set src(_src: string) { /* stays blank in Node */ }
};
installSilentAudio();
(globalThis as unknown as Record<string, unknown>).Path2D = class {
  moveTo() {}
  lineTo() {}
  closePath() {}
  arc() {}
  ellipse() {}
  rect() {}
  quadraticCurveTo() {}
  bezierCurveTo() {}
  addPath() {}
};

const { Game, makeLevel } = await import('../src/games/gunhit/game/Game.ts');
const variants = await import('../src/games/gunhit/game/art/gunVariants.ts');
const { WEAPONS } = await import('../src/games/gunhit/game/weapons.ts');

const only = process.argv[2];
const EFFECTS = ['set7', 'set2', 'set9', 'set11', 'set6'] as const;
/**
 * One process per layer by default.
 *
 * Five layers over every gun and every stage is ~6 000 full games; keeping them
 * in one process parks enough baked canvases in memory to be killed mid-run
 * (exit 137, with no result line). Each layer is swept in its own child process
 * and the totals are added up, so `npx tsx tools/star-ported-sweep.ts` stays the
 * documented command. `... set9` still sweeps a single layer.
 */
if (!only) {
  const { spawnSync } = await import('node:child_process');
  const total = { runs: 0, inert: 0, stranded: 0, threw: 0 };
  let failed = false;
  for (const effect of EFFECTS) {
    const res = spawnSync(process.execPath, ['--import', 'tsx', process.argv[1], effect], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'inherit'],
    });
    const line = (res.stdout ?? '').trim().split('\n').filter((l) => l.startsWith('runs ')).pop();
    if (!line) {
      failed = true;
      console.log(`${effect}: no result (exit ${res.status ?? res.signal})`);
      continue;
    }
    console.log(`${effect}: ${line}`);
    for (const key of Object.keys(total) as (keyof typeof total)[]) {
      const n = Number(new RegExp(`${key} (\\d+)`).exec(line)?.[1] ?? 0);
      total[key] += n;
    }
  }
  console.log('runs', total.runs, 'inert', total.inert, 'stranded', total.stranded, 'threw', total.threw);
  process.exit(failed || total.inert || total.stranded || total.threw ? 1 : 0);
}
const STAGES = [
  { name: 'boulder', mode: 'boulder' as const, buffs: ['speed', 'ammo', 'power', 'double'] },
  { name: 'treasure', mode: 'treasure' as const, buffs: ['rapid', 'double', 'mini', 'giant'] },
  { name: 'boss', mode: undefined, buffs: ['speed', 'ammo', 'power', 'double'] },
];

// The game itself paints into a permissive context as well: the sweep only
// checks the simulation (hits, carriers, no throws), never the pixels.
const gameCtx = permissiveCtx();
const gameCanvas = {
  width: W, height: H, style: {},
  getContext: () => gameCtx,
  addEventListener: () => undefined,
  removeEventListener: () => undefined,
  getBoundingClientRect: () => ({ left: 0, top: 0, width: W, height: H }),
} as unknown as HTMLCanvasElement;

const events = {
  onGameOver: () => undefined, onStageChange: () => undefined, onStageCleared: () => undefined,
  onShotFired: () => undefined, onBossDefeated: () => undefined,
};

let runs = 0;
let inert = 0;
let threw = 0;
let stranded = 0;

for (const stage of STAGES) {
  for (const buff of stage.buffs) {
    for (const w of WEAPONS) {
      for (const effect of EFFECTS) {
        if (only && effect !== only) continue;
        runs++;
        variants.setGunEffect(w.id as never, effect as never);
        const game = new Game(gameCanvas, events as never) as unknown as Record<string, any>;
        const label = `${stage.name}/${buff}/${w.id}:${effect}`;
        try {
          if (stage.mode) game.startSpecialStage(stage.mode);
          else game.startRun(5);
          game.setWeapon(w.id);
          game.state = 'play';
          game.starTimer = Infinity;
          game.choosingBuff = true;
          game.applyBuff(buff);
          const rockBefore = game.rock?.remaining ?? 0;
          const coinsBefore = game.coins;
          for (let shot = 0; shot < 3; shot++) {
            game.state = 'play';
            game.cooldown = 0;
            game.reloadT = 0;
            game.ammoLeft = 40;
            game.shoot();
            for (let i = 0; i < 30; i++) if (game.state === 'play') game.update(1 / 60);
          }
          game.render();
          // A charged recipe hands its round over up to a second after the
          // trigger, so give the last shot time to resolve before judging.
          for (let i = 0; i < 80; i++) if (game.state === 'play') game.update(1 / 60);
          // Every carrier must have resolved or still be flying with its round.
          const waiting = game.projs.filter((p: Record<string, unknown>) => p.setSevenPending || p.setNinePending || p.setElevenPending);
          if (waiting.length > 0) {
            stranded++;
            console.log('STRANDED', label, waiting.length);
          }
          const hurt = (game.rock?.remaining ?? 0) < rockBefore
            || game.chestBullets.length > 0
            || game.coins > coinsBefore
            || game.score > 0;
          if (!hurt) {
            inert++;
            console.log('INERT', label);
          }
        } catch (err) {
          threw++;
          console.log('THREW', label, (err as Error).message);
        }
      }
    }
  }
}
// keep `makeLevel` referenced for readers who want a plain stage instead of a run
void makeLevel;
console.log('runs', runs, 'inert', inert, 'stranded', stranded, 'threw', threw);
