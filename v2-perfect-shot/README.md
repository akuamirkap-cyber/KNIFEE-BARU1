# PERFECT SHOT — v2 (gameplay only)

The **super-lean** Perfect Shot: the run itself, nothing around it.
No menu, no shop, no quest map, no leaderboard, no rewards, no music, no fonts,
no images. What is left is the wheel, the knives, and the rules that make the
level end.

`v2` is a separate folder on purpose: **v1 (`src/games/**`) is untouched**, so
the two can be merged later without either one getting in the other's way.

```
v2-perfect-shot/
  index.html            one page, one canvas
  src/
    config.ts           every tunable number (board, wheel, spin, collision)
    weapons.ts          the weapon catalogue: cooldown + colour + silhouette
    game.ts             the whole run — rules only, no DOM, no canvas
    render/draw.ts      one function: draw(ctx, scene). Plain 2D canvas.
    render/attach.ts    wire Game + canvas + tap: dpr, letterbox, rAF loop
    main.ts             the demo shell (a host replaces this)
  proof.ts              proves the rules, writes real PNG frames
  smoke.ts              boots the real page on a DOM shim (no browser needed)
```

**11 source files · ~1 400 lines · 13 KB single-file build (5.2 KB gzipped) ·
0 runtime dependencies.**

## The rules it keeps

Perfect Shot's, unchanged:

| Rule | Where |
| --- | --- |
| The wheel turns at a base speed with a slow swell | `config.ts` → `SPIN`, `game.ts` → `spinAt()` |
| A level opens with knives already stuck | `config.ts` → `START_STUCK` |
| Every landing counts; **10** clears the level | `config.ts` → `HITS_TO_WIN` |
| Landing within **~6.9°** of a stuck knife loses it | `config.ts` → `COLLIDE` |
| Fire is rate-limited per weapon, so mashing is harmless | `weapons.ts` → `cooldown` |
| The end burst plays before the page is told | `config.ts` → `END_HOLD`, `game.ts` → `ended` |

## Run it

```bash
cd v2-perfect-shot
npm i
npm run dev        # http://localhost:5173
npm run proof      # assert the rules + write /tmp/psv2/*.png frames
npm run smoke      # boot the real page headlessly, write frames
npm run build      # → dist/index.html, a single self-contained file
```

Space / tap / click fires. The bottom row swaps the weapon without restarting.

## Put it in another project

Copy the folder, then either:

1. **keep the page** — `npm run build` gives you one `index.html` you can drop
   anywhere, or
2. **keep the engine only** — keep `src/config.ts`, `src/weapons.ts`,
   `src/game.ts`, `src/render/draw.ts` and delete `src/main.ts`. Then:

```ts
import { mount } from './perfect-shot/render/attach';

const game = mount(document.querySelector('canvas')!, {
  weapon: 'knife',
  onEnd: (outcome, g) => {
    // show your own screen, then:
    g.restart();
    game.resume();
  },
});
```

`draw.ts` only needs a 2D context that can fill paths, draw gradients and set
`shadowBlur` — so the same file renders in a browser, in the repo's Skia
renderers (`@napi-rs/canvas`), and in `proof.ts`. There are no images, no
webfonts, no filters and no `requestAnimationFrame` inside it.

### Notes for merging into v1

- The board is **480 × 960**, the same aspect as Gun Hit's 420 × 760 canvas, and
  `attach.ts` letterboxes, so it fits whichever container you give it.
- Nothing here imports from v1; nothing here is imported by v1.
- `game.ts` never touches `window`, so it also runs on a server.
- Tuning the whole game is `config.ts`: speed, tolerance, knives per level,
  board geometry, palette.
