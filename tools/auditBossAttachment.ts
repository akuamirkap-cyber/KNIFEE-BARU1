/**
 * Every weapon x every art effect, fired into a boss: does anything land off the
 * drawing? Run `npx tsx tools/auditBossAttachment.ts [from] [to]` in slices to
 * keep memory flat; the whole list is 102 weapons x 5 art variants.
 */
import { createCanvas, Path2D, loadImage } from '@napi-rs/canvas';
import { DOMParser } from '@xmldom/xmldom';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { HeadArt } from '../src/games/perfect-shot/play/HeadArt';
import { Game } from '../src/games/gunhit/game/Game';
import { installSilentAudio } from './supportAudioSilent';
import { setGunEffect, setGunVariant } from '../src/games/gunhit/game/art/gunVariants';

const g = globalThis as unknown as Record<string, any>;
g.Path2D = Path2D; g.DOMParser = DOMParser;
g.HTMLCanvasElement ??= createCanvas(2, 2).constructor;
g.document = { createElement: (t: string) => (t === 'canvas' ? createCanvas(64, 64) : { style: {} }), visibilityState: 'visible', addEventListener: () => {} };
g.Image ??= class { width = 1; height = 1; set src(_s: string) {} };
g.requestAnimationFrame = () => 0; g.cancelAnimationFrame = () => {};
installSilentAudio();
g.window = Object.assign(g.window ?? {}, {
  setTimeout, clearTimeout, setInterval: () => 0, clearInterval: () => undefined,
  addEventListener: () => undefined, removeEventListener: () => undefined,
  devicePixelRatio: 1, innerWidth: 420, innerHeight: 750,
  matchMedia: () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} }),
});

const IDS: string[] = ['pistol','ak47','nail','crossbow','plasma','laser','fish','rpg','cricket','electro','bazooka','freeze','golden','blackhole','slingshot','blowgun','shotgun','soaker','snowball','sniper','flamethrower','bubble','bamboo','banana','harpoon','chicken','confetti','seed','pizza','minigun','railgun','magnet','shrink','grow','pirate','card','dragon','gravity','honey','coconut','angklung','bee','yoyo','sakura','acid','keris','firework','anchor','shark','ghost','ufo','rainbow','meteor','diamond','moonbeam','storm','pencil','sandal','paintball','wand','ruby','emerald','sapphire','crystal','beerifle','buster','holy','unicorn','obliterator','coingun','photon_saber','gauntlet_cannon','ironman_hand','pulse_rifle','cryo_blaster','hyperdrive','quantum_destabilizer','blaster','xeno','dora','pred','longbow','mp5','tesla_rifle','ion_smg','phaser','yautja','identity_disc','proton_pack','mega_buster','harmonic_disruptor','absolute_zero','helios_flare','chrono_rifle','orbital_beacon','helix_pulsar','singularity','prism_lance','nano_swarm','heat_ray'];
const EFFECTS = ['original', 'new', 'set7', 'set9', 'set11'];
const W = 420, H = 750;
const svg = renderToStaticMarkup(React.createElement(HeadArt, { kind: 'pirate' as any }));
const image = await loadImage(Buffer.from(svg));

function make() {
  const cv = createCanvas(W, H);
  const ctx = cv.getContext('2d');
  const shim = { width: W, height: H, style: {}, getBoundingClientRect: () => ({ width: W, height: H, left: 0, top: 0 }), getContext: () => ctx, addEventListener: () => {}, removeEventListener: () => {} } as unknown as HTMLCanvasElement;
  const game = new Game(shim, { onGameOver: () => {} } as any) as unknown as Record<string, any>;
  game.setWheelArtSource({ keyFor: () => 'boss|pirate', get: () => image, request: () => {}, markup: () => svg });
  game.startAtLevel(5);
  game.setWheelArt('boss|pirate', image, svg);
  game.state = 'play';
  for (let i = 0; i < 200; i++) game.update(1 / 60);
  game.items = []; game.projs = [];
  game.bossMaxHp = 1e9; game.bossHp = 1e9; game.level.ammo = 1e5;
  return game;
}
function inkOf(game: any) {
  const mask = game.artMask; const R = game.level.radius;
  return (lx: number, ly: number) => {
    const u = Math.floor(((lx / R / mask.span) + 1) * 0.5 * mask.size);
    const v = Math.floor(((ly / R / mask.span) + 1) * 0.5 * mask.size);
    if (u < 1 || v < 1 || u >= mask.size - 1 || v >= mask.size - 1) return false;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (mask.alpha[(v + dy) * mask.size + (u + dx)] > 20) return true;
    }
    return false;
  };
}

const bad: string[] = [];
const quiet: string[] = [];
let rows = 0;
const from = Number(process.argv[2] ?? 0);
const to = Number(process.argv[3] ?? IDS.length);
for (const id of IDS.slice(from, to)) {
  const game = make();
  game.setWeapon(id);
  for (const effect of EFFECTS) {
    setGunVariant(id as never, 'original');
    setGunEffect(id as never, effect as never);
    game.items = [];
    game.projs = [];
    const ink = inkOf(game);
    const radii: number[] = [];
    const off: string[] = [];
    for (const turn of [0, 1.2, 2.4, 3.6]) {
      game.rot = turn;
      const before = new Set(game.items as any[]);
      for (let f = 0; f < 110; f++) {
        game.ammoLeft = 99;
        if (f % 10 === 0) game.press();
        if (f % 10 === 7) game.onRelease();
        game.update(1 / 60);
        if ((game.items as any[]).some((it) => !before.has(it) && it.px !== undefined)) break;
      }
      game.onRelease();
      const fresh = (game.items as any[]).find((it: any) => !before.has(it) && it.px !== undefined);
      if (!fresh) continue;
      radii.push(Math.round(Math.hypot(fresh.px, fresh.py)));
      if (!ink(fresh.px, fresh.py)) off.push(`${id}/${effect}`);
    }
    rows++;
    if (!radii.length) quiet.push(`${id}/${effect}`);
    if (off.length) bad.push(`${id}/${effect} @ ${off.join(',')}`);
  }
  game.destroy();
}
console.log(`rows ${rows}  rounds-fired rows ${rows - quiet.length}  silent ${quiet.length}`);
console.log('silent:', quiet.join(' '));
console.log('off-drawing:', bad.length ? bad.join(' | ') : 'NONE');
