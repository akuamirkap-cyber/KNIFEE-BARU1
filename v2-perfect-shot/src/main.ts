import { mount, type Mounted } from './render/attach';
import { WEAPONS } from './weapons';
import { HITS_TO_WIN } from './config';

/**
 * PERFECT SHOT v2 — the smallest possible shell.
 *
 * Everything here is host code, kept deliberately dumb: one canvas, one
 * "level over" overlay, a weapon picker. Swap this file out and the engine in
 * `src/game.ts` + `src/render/` still works.
 */
const app = document.getElementById('app');
if (!app) throw new Error('perfect-shot-v2: no #app');

app.innerHTML = `
  <style>
    :root { color-scheme: dark; }
    * { box-sizing: border-box; }
    html, body { margin: 0; height: 100%; background: #070a10; }
    body {
      display: flex; align-items: center; justify-content: center;
      font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
      color: #fff; overscroll-behavior: none;
      touch-action: manipulation; -webkit-tap-highlight-color: transparent;
    }
    #stage { position: relative; height: 100%; aspect-ratio: 1 / 2; max-width: 100vw; }
    canvas { display: block; width: 100%; height: 100%; }
    .top {
      position: absolute; inset: 8px 8px auto 8px;
      display: flex; align-items: center; justify-content: space-between;
      font-size: 11px; letter-spacing: .28em; text-transform: uppercase;
      color: #f5d9a8cc; pointer-events: none;
    }
    .end {
      position: absolute; inset: 0; display: none;
      align-items: center; justify-content: center; flex-direction: column;
      gap: 10px; background: #04060ac8; backdrop-filter: blur(3px);
      text-align: center; padding: 24px;
    }
    .end.on { display: flex; }
    .end h1 { margin: 0; font-size: 44px; letter-spacing: .04em; }
    .end p { margin: 0; color: #ffffffa8; font-size: 14px; }
    .end button {
      margin-top: 8px; padding: 14px 30px; border: 0; border-radius: 999px;
      font: inherit; font-weight: 800; letter-spacing: .06em; color: #10160f;
      background: linear-gradient(120deg, #ffe08a, #ffa63c); cursor: pointer;
    }
    .guns {
      position: absolute; inset: auto 8px 8px 8px;
      display: flex; gap: 6px; justify-content: center; flex-wrap: wrap;
    }
    .guns button {
      font: inherit; font-size: 11px; letter-spacing: .06em;
      padding: 7px 12px; border-radius: 999px; cursor: pointer;
      color: #cfe0f0; background: #ffffff12; border: 1px solid #ffffff20;
    }
    .guns button[aria-pressed="true"] { background: #ffffff2c; border-color: #ffffff66; color: #fff; }
  </style>
  <div id="stage">
    <canvas id="board"></canvas>
    <div class="top"><span>PERFECT SHOT</span><span id="hits">0 / ${HITS_TO_WIN}</span></div>
    <div class="end" id="end">
      <h1 id="endTitle">CLEAR</h1>
      <p id="endNote"></p>
      <button id="again">PLAY AGAIN</button>
    </div>
    <div class="guns" id="guns"></div>
  </div>
`;

const canvas = document.getElementById('board') as HTMLCanvasElement;
const endEl = document.getElementById('end') as HTMLDivElement;
const endTitle = document.getElementById('endTitle') as HTMLHeadingElement;
const endNote = document.getElementById('endNote') as HTMLParagraphElement;
const hitsEl = document.getElementById('hits') as HTMLSpanElement;
const gunsEl = document.getElementById('guns') as HTMLDivElement;

let weapon = 'knife';

const game = mount(canvas, {
  weapon,
  onEnd: (outcome, g) => {
    endTitle.textContent = outcome === 'win' ? 'CLEAR' : 'MISS';
    endTitle.style.color = outcome === 'win' ? '#ffd77a' : '#ff8a8a';
    endNote.textContent = outcome === 'win'
      ? `Wheel destroyed — ${g.scene.hits} knives landed.`
      : 'Your knife hit one already stuck in the wheel.';
    endEl.classList.add('on');
    g.clearOutcome();
  },
});

// The pips live in the page here so the shell can style them; the canvas HUD in
// `render/draw.ts` draws the same thing, so a host can use either.
setInterval(() => {
  hitsEl.textContent = `${game.game.scene.hits} / ${HITS_TO_WIN}`;
}, 120);

// Weapon picker: keeps the run, only the cooldown and the silhouette change.
for (const w of WEAPONS) {
  const b = document.createElement('button');
  b.textContent = w.name;
  b.setAttribute('aria-pressed', String(w.id === weapon));
  b.onclick = () => {
    weapon = w.id;
    game.game.setWeapon(w.id);
    for (const other of gunsEl.querySelectorAll('button')) {
      other.setAttribute('aria-pressed', String(other === b));
    }
  };
  gunsEl.append(b);
}

(document.getElementById('again') as HTMLButtonElement).onclick = () => {
  endEl.classList.remove('on');
  game.game.restart(weapon);
  game.resume();
};

export type { Mounted };
