import { slide23Sfx } from './slide23Sfx';

const TAU = Math.PI * 2;
const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)];

export const hsl = (h: number, s = 95, l = 60, a = 1) =>
  `hsla(${((h % 360) + 360) % 360}, ${s}%, ${l}%, ${a})`;

export const FIREWORK_PL = 46;
export const FIREWORK_EMBED_NOSE = 6;

export type BurstType =
  | 'peony'
  | 'ring'
  | 'star'
  | 'heart'
  | 'spiral'
  | 'crackle'
  | 'rainbow'
  | 'willow';

export const IMPACT_TYPES: readonly BurstType[] = [
  'peony',
  'ring',
  'star',
  'heart',
  'spiral',
  'crackle',
  'rainbow',
];

export const ALL_BURST_TYPES: readonly BurstType[] = [
  'peony',
  'ring',
  'star',
  'heart',
  'spiral',
  'crackle',
  'rainbow',
  'willow',
];

export interface Firework8Particle {
  x: number;
  y: number;
  px: number;
  py: number;
  vx: number;
  vy: number;
  g: number;
  drag: number;
  hue: number;
  sat: number;
  light: number;
  alpha: number;
  decay: number;
  size: number;
  twinkle?: boolean;
  crackle?: boolean;
}

export interface Firework8Glow {
  x: number;
  y: number;
  r: number;
  hue: number;
  alpha: number;
  decay: number;
}

export interface Firework8Ring {
  x: number;
  y: number;
  r: number;
  maxR: number;
  hue: number;
  alpha: number;
  w: number;
}

export interface Firework8SkyRocket {
  x: number;
  y: number;
  vx: number;
  vy: number;
  targetY: number;
  hue: number;
  type: BurstType;
  ambient?: boolean;
}

export interface Firework8Star {
  x: number;
  y: number;
  r: number;
  p: number;
  s: number;
  hue: number;
}

export interface Firework8Building {
  x: number;
  w: number;
  h: number;
  spire: boolean;
  wins: { x: number; y: number }[];
}

export interface Firework8State {
  w: number;
  h: number;
  stars: Firework8Star[];
  skyline: Firework8Building[];
  particles: Firework8Particle[];
  glows: Firework8Glow[];
  rings: Firework8Ring[];
  sky: Firework8SkyRocket[];
  timers: { t: number; fn: () => void }[];
  shotIdx: number;
  impactIdx: number;
  bgCanvas?: HTMLCanvasElement | null;
  bgDpr?: number;
}

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/**
 * Exact firework rocket shape from Slide #3 ("Firework 8-Gun" / games/fireworkgun/src/game/engine.ts).
 * Drawn horizontally in local space: nose tip at (0, 0) pointing toward -x,
 * striped body at x = 11..35, swept fins at x = 24..36, wooden stick at x = 30..46.
 */
export function drawRocketShape(ctx: CanvasRenderingContext2D, hue: number, flash = 0) {
  // Stick
  ctx.strokeStyle = '#e6c27a';
  ctx.lineWidth = 2.6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(30, 0);
  ctx.lineTo(FIREWORK_PL, 0);
  ctx.stroke();

  // Fins
  ctx.fillStyle = hsl(hue, 85, 38);
  ctx.beginPath();
  ctx.moveTo(24, -4.5);
  ctx.lineTo(36, -11);
  ctx.lineTo(33, -4.5);
  ctx.closePath();
  ctx.moveTo(24, 4.5);
  ctx.lineTo(36, 11);
  ctx.lineTo(33, 4.5);
  ctx.closePath();
  ctx.fill();

  // Body
  const grad = ctx.createLinearGradient(0, -6, 0, 6);
  grad.addColorStop(0, hsl(hue, 90, 74));
  grad.addColorStop(0.5, hsl(hue, 95, 52));
  grad.addColorStop(1, hsl(hue, 90, 32));
  ctx.fillStyle = grad;
  roundRectPath(ctx, 11, -5.5, 24, 11, 2);
  ctx.fill();

  // Stripes
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.fillRect(18, -5.5, 3, 11);
  ctx.fillRect(25, -5.5, 3, 11);

  // Nose cone
  ctx.fillStyle = hsl(hue + 35, 100, 62);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(5, -6.5, 12, -6);
  ctx.lineTo(12, 6);
  ctx.quadraticCurveTo(5, 6.5, 0, 0);
  ctx.closePath();
  ctx.fill();

  if (flash > 0) {
    ctx.fillStyle = `rgba(255,255,255,${flash * 0.7})`;
    roundRectPath(ctx, 0, -6, 36, 12, 3);
    ctx.fill();
  }
}

/**
 * Draws the Slide #3 firework rocket oriented for SGA's vertical projectile convention:
 * nose tip at (0, 0) pointing up (-y), body from y = 11..35, fins at y = 24..36, stick to y = 46.
 */
export function drawFirework8Projectile(
  ctx: CanvasRenderingContext2D,
  hue = 340,
  flash = 0,
) {
  ctx.save();
  ctx.rotate(Math.PI / 2);
  drawRocketShape(ctx, hue, flash);
  ctx.restore();
}

export function createFirework8State(w = 420, h = 760): Firework8State {
  const stars: Firework8Star[] = [];
  for (let i = 0; i < 110; i++) {
    stars.push({
      x: Math.random() * w,
      y: Math.random() * h * 0.78,
      r: rnd(0.5, 1.9),
      p: rnd(0, TAU),
      s: rnd(1, 3.5),
      hue: Math.random() < 0.3 ? rnd(190, 320) : 50,
    });
  }

  const skyline: Firework8Building[] = [];
  let x = 0;
  while (x < w) {
    const bw = Math.floor(rnd(18, 42));
    const bh = Math.floor(rnd(28, 95));
    const wins: { x: number; y: number }[] = [];
    for (let wy = 8; wy < bh - 10; wy += 9) {
      for (let wx = 4; wx < bw - 6; wx += 7) {
        if (Math.random() < 0.38) wins.push({ x: wx, y: wy });
      }
    }
    skyline.push({ x, w: bw, h: bh, spire: Math.random() < 0.25, wins });
    x += bw - 2;
  }

  return {
    w,
    h,
    stars,
    skyline,
    particles: [],
    glows: [],
    rings: [],
    sky: [],
    timers: [],
    shotIdx: 0,
    impactIdx: 0,
    bgCanvas: null,
    bgDpr: 0,
  };
}

export function firework8HueBase(level: number): number {
  return (level * 53) % 360;
}

export function firework8ShotHue(level: number, shotIdx: number): number {
  return (firework8HueBase(level) + shotIdx * 41) % 360;
}

export function paintFirework8Backdrop(
  ctx: CanvasRenderingContext2D,
  state: Firework8State,
) {
  const { w, h, skyline } = state;
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#04010f');
  g.addColorStop(0.45, '#12062e');
  g.addColorStop(0.8, '#2a0f4a');
  g.addColorStop(1, '#4a1747');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  // Horizon haze
  const hg = ctx.createRadialGradient(w * 0.5, h * 0.92, 10, w * 0.5, h * 0.92, w * 0.9);
  hg.addColorStop(0, 'rgba(255, 120, 160, 0.25)');
  hg.addColorStop(0.6, 'rgba(140, 50, 140, 0.08)');
  hg.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = hg;
  ctx.fillRect(0, 0, w, h);

  // Skyline
  for (const b of skyline) {
    const by = h - b.h;
    ctx.fillStyle = '#0b0420';
    ctx.fillRect(b.x, by, b.w, b.h);
    if (b.spire) {
      ctx.beginPath();
      ctx.moveTo(b.x + b.w * 0.5 - 3, by);
      ctx.lineTo(b.x + b.w * 0.5, by - 14);
      ctx.lineTo(b.x + b.w * 0.5 + 3, by);
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(255, 210, 120, 0.55)';
    for (const win of b.wins) {
      ctx.fillRect(b.x + win.x, by + win.y, 3, 4);
    }
  }
}

export function drawFirework8Background(
  ctx: CanvasRenderingContext2D,
  state: Firework8State,
  dpr: number,
  targetX: number,
  targetY: number,
  targetR: number,
  level: number,
) {
  const density = Math.ceil(dpr || 1);
  if (!state.bgCanvas || state.bgDpr !== density) {
    if (typeof document !== 'undefined') {
      const bgCanvas = document.createElement('canvas');
      bgCanvas.width = state.w * density;
      bgCanvas.height = state.h * density;
      const bctx = bgCanvas.getContext('2d');
      if (bctx) {
        bctx.setTransform(density, 0, 0, density, 0, 0);
        paintFirework8Backdrop(bctx, state);
        state.bgCanvas = bgCanvas;
        state.bgDpr = density;
      }
    }
  }
  if (state.bgCanvas) {
    ctx.drawImage(state.bgCanvas, 0, 0, state.w, state.h);
  } else {
    paintFirework8Backdrop(ctx, state);
  }

  // Twinkling stars
  for (const st of state.stars) {
    const a = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(st.p));
    ctx.fillStyle = hsl(st.hue, 80, 90, a);
    ctx.beginPath();
    ctx.arc(st.x, st.y, st.r, 0, TAU);
    ctx.fill();
  }

  // Additive glows in the sky
  if (state.glows.length > 0) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const gl of state.glows) {
      const gr = ctx.createRadialGradient(gl.x, gl.y, 0, gl.x, gl.y, gl.r);
      gr.addColorStop(0, hsl(gl.hue, 100, 65, gl.alpha));
      gr.addColorStop(0.4, hsl(gl.hue, 100, 50, gl.alpha * 0.35));
      gr.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = gr;
      ctx.beginPath();
      ctx.arc(gl.x, gl.y, gl.r, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  // Background sky rockets
  for (const s of state.sky) {
    ctx.fillStyle = hsl(s.hue, 100, 78);
    ctx.beginPath();
    ctx.arc(s.x, s.y, 2.3, 0, TAU);
    ctx.fill();
  }

  // Wheel / target radial glow from Slide #3
  const hueBase = firework8HueBase(level);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const wg = ctx.createRadialGradient(targetX, targetY, targetR * 0.2, targetX, targetY, targetR * 2.1);
  wg.addColorStop(0, hsl(hueBase, 95, 55, 0.28));
  wg.addColorStop(0.5, hsl((hueBase + 60) % 360, 90, 45, 0.1));
  wg.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = wg;
  ctx.beginPath();
  ctx.arc(targetX, targetY, targetR * 2.1, 0, TAU);
  ctx.fill();
  ctx.restore();
}

export function drawFirework8ParticlesAndRings(
  ctx: CanvasRenderingContext2D,
  state: Firework8State,
) {
  if (state.rings.length === 0 && state.particles.length === 0) return;

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';

  // Rings
  for (const r of state.rings) {
    if (r.alpha <= 0) continue;
    ctx.strokeStyle = hsl(r.hue, 100, 70, r.alpha);
    ctx.lineWidth = r.w;
    ctx.beginPath();
    ctx.arc(r.x, r.y, Math.max(0.5, r.r), 0, TAU);
    ctx.stroke();
  }

  // Line-streak firework particles
  ctx.lineCap = 'round';
  for (const p of state.particles) {
    let a = p.alpha;
    if (p.twinkle && Math.random() < 0.35) a *= rnd(0.25, 1);
    if (a <= 0) continue;

    ctx.strokeStyle = hsl(p.hue, p.sat, p.light, a);
    ctx.lineWidth = p.size * 1.15;
    ctx.beginPath();
    ctx.moveTo(p.px, p.py);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();

    ctx.fillStyle = hsl(p.hue, p.sat, Math.min(98, p.light + 18), a);
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * 0.75, 0, TAU);
    ctx.fill();
  }

  ctx.restore();
}

export function drawFirework8GunGlow(
  ctx: CanvasRenderingContext2D,
  gx: number,
  gy: number,
  nextHue: number,
  recoilAmt: number,
) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const gg = ctx.createRadialGradient(gx, gy, 4, gx, gy, 75);
  gg.addColorStop(0, hsl(nextHue, 100, 60, 0.25));
  gg.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = gg;
  ctx.beginPath();
  ctx.arc(gx, gy, 75, 0, TAU);
  ctx.fill();

  if (recoilAmt > 0.05) {
    ctx.fillStyle = hsl(nextHue, 100, 70, recoilAmt * 0.8);
    ctx.beginPath();
    ctx.ellipse(gx, gy - 36, 18 * recoilAmt, 10 * recoilAmt, 0, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

export function launchFirework8Sky(state: Firework8State, ambient = false) {
  if (!ambient) slide23Sfx.skyLaunch();
  state.sky.push({
    x: rnd(40, state.w - 40),
    y: state.h - 30,
    vx: rnd(-0.6, 0.6),
    vy: rnd(-7.5, -9.8),
    targetY: rnd(80, state.h * (ambient ? 0.55 : 0.45)),
    hue: rnd(0, 360),
    type: pick(ALL_BURST_TYPES),
    ambient,
  });
}

export function burstFirework8(
  state: Firework8State,
  x: number,
  y: number,
  hue: number,
  type: BurstType = 'peony',
  scale = 1,
) {
  state.glows.push({
    x,
    y,
    r: 130 * scale,
    hue,
    alpha: 0.9,
    decay: 0.04,
  });

  state.rings.push({
    x,
    y,
    r: 4,
    maxR: 110 * scale,
    hue,
    alpha: 0.85,
    w: 3 * scale,
  });

  // Central flash
  state.particles.push({
    x,
    y,
    px: x,
    py: y,
    vx: 0,
    vy: 0,
    g: 0,
    drag: 1,
    hue,
    sat: 30,
    light: 96,
    alpha: 1,
    decay: 0.11,
    size: 26 * scale,
  });

  const count = Math.floor(
    (type === 'willow' ? 68 : type === 'ring' ? 54 : 62) * Math.min(1.3, scale + 0.25),
  );

  for (let i = 0; i < count; i++) {
    const t = i / count;
    let vx = 0;
    let vy = 0;
    let h = hue + rnd(-18, 18);
    let sat = 100;
    let light = rnd(58, 76);
    let decay = rnd(0.013, 0.024);
    let g = 0.085;
    let drag = 0.968;
    let size = rnd(2, 3.6) * Math.min(1.2, scale + 0.2);
    let twinkle = Math.random() < 0.45;
    let crackle = false;

    if (type === 'peony') {
      const a = rnd(0, TAU);
      const sp = Math.pow(Math.random(), 0.45) * rnd(3.2, 8.8) * scale;
      vx = Math.cos(a) * sp;
      vy = Math.sin(a) * sp;
      if (Math.random() < 0.28) h = (hue + 140) % 360;
    } else if (type === 'ring') {
      const a = t * TAU;
      const sp = 6.6 * scale;
      vx = Math.cos(a) * sp;
      vy = Math.sin(a) * sp;
      h = hue + Math.sin(a * 3) * 35;
      decay = 0.017;
    } else if (type === 'star') {
      const a = t * TAU;
      const spikes = 5;
      const r = 0.52 + 0.48 * Math.cos(spikes * a);
      const sp = r * 8.6 * scale;
      vx = Math.cos(a) * sp;
      vy = Math.sin(a) * sp;
      h = hue + (r > 0.75 ? 0 : 55);
    } else if (type === 'heart') {
      const a = t * TAU;
      const hx = 16 * Math.pow(Math.sin(a), 3);
      const hy = -(
        13 * Math.cos(a) -
        5 * Math.cos(2 * a) -
        2 * Math.cos(3 * a) -
        Math.cos(4 * a)
      );
      const sp = 0.42 * scale;
      vx = hx * sp;
      vy = hy * sp;
      h = 340 + rnd(-12, 12);
    } else if (type === 'spiral') {
      const a = t * TAU * 3;
      const sp = (1.6 + t * 7.2) * scale;
      vx = Math.cos(a) * sp;
      vy = Math.sin(a) * sp;
      h = (hue + t * 200) % 360;
    } else if (type === 'crackle') {
      const a = rnd(0, TAU);
      const sp = rnd(2.2, 7.6) * scale;
      vx = Math.cos(a) * sp;
      vy = Math.sin(a) * sp;
      crackle = Math.random() < 0.48;
      twinkle = true;
    } else if (type === 'rainbow') {
      const a = t * TAU + rnd(-0.04, 0.04);
      const sp = rnd(4.5, 8.8) * scale;
      vx = Math.cos(a) * sp;
      vy = Math.sin(a) * sp;
      h = (t * 360) % 360;
    } else if (type === 'willow') {
      const a = rnd(0, TAU);
      const sp = Math.pow(Math.random(), 0.5) * rnd(2.5, 7.2) * scale;
      vx = Math.cos(a) * sp;
      vy = Math.sin(a) * sp;
      h = 44 + rnd(-10, 10);
      sat = 95;
      light = 72;
      g = 0.14;
      drag = 0.978;
      decay = rnd(0.008, 0.014);
      size = rnd(1.8, 2.8);
    }

    state.particles.push({
      x,
      y,
      px: x,
      py: y,
      vx,
      vy,
      g,
      drag,
      hue: h,
      sat,
      light,
      alpha: 1,
      decay,
      size,
      twinkle,
      crackle,
    });
  }

  // Inner glitter
  for (let i = 0; i < 18; i++) {
    const a = rnd(0, TAU);
    const sp = rnd(0.6, 2.8) * scale;
    state.particles.push({
      x,
      y,
      px: x,
      py: y,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp,
      g: 0.04,
      drag: 0.94,
      hue: (hue + 180) % 360,
      sat: 90,
      light: 88,
      alpha: 1,
      decay: rnd(0.025, 0.045),
      size: rnd(1.3, 2.3),
      twinkle: true,
    });
  }
}

/**
 * Muzzle launch effect ("saat keluar") from Slide #3's fire() method.
 */
export function spawnFirework8Muzzle(
  state: Firework8State,
  mx: number,
  my: number,
  hue: number,
) {
  for (let i = 0; i < 22; i++) {
    const a = -Math.PI / 2 + rnd(-0.55, 0.55);
    const sp = rnd(2, 8);
    const h = hue + rnd(-25, 25);
    state.particles.push({
      x: mx,
      y: my,
      px: mx,
      py: my,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp,
      g: 0.14,
      drag: 0.95,
      hue: h,
      sat: 100,
      light: rnd(60, 80),
      alpha: 1,
      decay: rnd(0.035, 0.06),
      size: rnd(1.8, 3.6),
      twinkle: true,
    });
  }
  state.particles.push({
    x: mx,
    y: my,
    px: mx,
    py: my,
    vx: 0,
    vy: 0,
    g: 0,
    drag: 1,
    hue,
    sat: 40,
    light: 98,
    alpha: 1,
    decay: 0.14,
    size: 16,
  });
  state.glows.push({ x: mx, y: my, r: 70, hue, alpha: 0.7, decay: 0.07 });
  state.rings.push({ x: mx, y: my, r: 4, maxR: 38, hue, alpha: 0.7, w: 2.5 });
}

/**
 * Flying rocket tail sparks from Slide #3's update() method.
 */
export function spawnFirework8FlightSparks(
  state: Firework8State,
  rx: number,
  ry: number,
  hue: number,
) {
  for (let i = 0; i < 3; i++) {
    state.particles.push({
      x: rx + rnd(-2, 2),
      y: ry + FIREWORK_PL + rnd(0, 10),
      px: rx,
      py: ry + FIREWORK_PL + 10,
      vx: rnd(-1.1, 1.1),
      vy: rnd(2.2, 5.2),
      g: 0.08,
      drag: 0.94,
      hue: hue + rnd(-25, 25),
      sat: 100,
      light: rnd(60, 88),
      alpha: 1,
      decay: rnd(0.045, 0.075),
      size: rnd(1.8, 3.3),
      twinkle: true,
    });
  }
}

/**
 * Stuck rocket hit burst ("nancep") from Slide #3's stick() method.
 */
export function spawnFirework8StickBurst(
  state: Firework8State,
  hx: number,
  hy: number,
  hue: number,
) {
  const bx = hx;
  const by = hy + 34;
  const type = IMPACT_TYPES[state.impactIdx % IMPACT_TYPES.length];
  state.impactIdx++;
  burstFirework8(state, bx, by, hue, type, 0.72);
  burstFirework8(state, hx, hy, (hue + 60) % 360, 'peony', 0.35);
  state.rings.push({ x: hx, y: hy, r: 6, maxR: 90, hue, alpha: 0.9, w: 3 });
}

/**
 * Stage clear finale from Slide #3's clearLevel() method.
 */
export function spawnFirework8ClearFinale(
  state: Firework8State,
  cx: number,
  cy: number,
  level: number,
) {
  const hueBase = firework8HueBase(level);
  burstFirework8(state, cx, cy, hueBase, 'rainbow', 1.5);
  burstFirework8(state, cx, cy, (hueBase + 120) % 360, 'ring', 1.3);
  burstFirework8(state, cx, cy, (hueBase + 240) % 360, 'willow', 1.4);

  for (let i = 0; i < 6; i++) {
    state.timers.push({
      t: 0.14 + i * 0.14,
      fn: () => launchFirework8Sky(state, false),
    });
  }
}

/**
 * Fail collision burst from Slide #3's failRocket() method.
 */
export function spawnFirework8FailBurst(
  state: Firework8State,
  x: number,
  y: number,
  hue: number,
) {
  burstFirework8(state, x, y, hue, 'peony', 0.6);
  burstFirework8(state, x, y, (hue + 180) % 360, 'ring', 0.5);
}

/**
 * Updates stars, sky rockets, line-streak particles, glows, rings, and idle sparks on stuck rockets.
 */
export function updateFirework8State(
  state: Firework8State,
  dt: number,
  stuckPins?: { x: number; y: number; worldA: number; hue: number }[],
) {
  const f = dt * 60;

  // Scheduled timers (e.g. stage clear sky rockets)
  for (let i = state.timers.length - 1; i >= 0; i--) {
    state.timers[i].t -= dt;
    if (state.timers[i].t <= 0) {
      const fn = state.timers[i].fn;
      state.timers.splice(i, 1);
      fn();
    }
  }

  // Twinkling stars
  for (const st of state.stars) {
    st.p += st.s * dt;
  }

  // Idle sparks from stuck rockets on the wheel
  if (stuckPins && stuckPins.length > 0) {
    for (const p of stuckPins) {
      if (Math.random() < 0.22 * f) {
        state.particles.push({
          x: p.x,
          y: p.y,
          px: p.x,
          py: p.y,
          vx: Math.cos(p.worldA) * rnd(0.4, 1.8) + rnd(-0.5, 0.5),
          vy: Math.sin(p.worldA) * rnd(0.4, 1.8) + rnd(-0.5, 0.5),
          g: 0.05,
          drag: 0.95,
          hue: p.hue + rnd(-20, 20),
          sat: 100,
          light: 72,
          alpha: 0.85,
          decay: 0.06,
          size: 1.8,
        });
      }
    }
  }

  // Ambient sky rockets
  if (Math.random() < 0.018 * f && state.sky.length < 3) {
    launchFirework8Sky(state, true);
  }
  for (let i = state.sky.length - 1; i >= 0; i--) {
    const s = state.sky[i];
    s.x += s.vx * f;
    s.y += s.vy * f;
    s.vy += 0.05 * f;
    state.particles.push({
      x: s.x + rnd(-1, 1),
      y: s.y + 4,
      px: s.x,
      py: s.y + 4,
      vx: rnd(-0.4, 0.4),
      vy: rnd(0.8, 2),
      g: 0.04,
      drag: 0.95,
      hue: s.hue,
      sat: 90,
      light: 72,
      alpha: 0.85,
      decay: 0.055,
      size: 1.5,
    });
    if (s.y <= s.targetY || s.vy >= -0.5) {
      if (!s.ambient) slide23Sfx.boom(0.75);
      burstFirework8(state, s.x, s.y, s.hue, s.type, rnd(0.55, 0.85));
      state.sky.splice(i, 1);
    }
  }

  // Particles
  for (let i = state.particles.length - 1; i >= 0; i--) {
    const p = state.particles[i];
    p.px = p.x;
    p.py = p.y;
    p.vx *= Math.pow(p.drag, f);
    p.vy *= Math.pow(p.drag, f);
    p.vy += p.g * f;
    p.x += p.vx * f;
    p.y += p.vy * f;
    p.alpha -= p.decay * f;

    if (p.crackle && p.alpha < 0.38 && p.alpha > 0.3) {
      p.crackle = false;
      for (let k = 0; k < 5; k++) {
        const a = rnd(0, TAU);
        const sp = rnd(1.2, 3.2);
        state.particles.push({
          x: p.x,
          y: p.y,
          px: p.x,
          py: p.y,
          vx: Math.cos(a) * sp,
          vy: Math.sin(a) * sp,
          g: 0.06,
          drag: 0.92,
          hue: p.hue + rnd(-35, 35),
          sat: 100,
          light: 88,
          alpha: 0.95,
          decay: 0.075,
          size: 1.4,
          twinkle: true,
        });
      }
    }

    if (p.alpha <= 0) state.particles.splice(i, 1);
  }
  if (state.particles.length > 900) {
    state.particles.splice(0, state.particles.length - 900);
  }

  // Glows
  for (let i = state.glows.length - 1; i >= 0; i--) {
    const gl = state.glows[i];
    gl.alpha -= gl.decay * f;
    if (gl.alpha <= 0) state.glows.splice(i, 1);
  }

  // Rings
  for (let i = state.rings.length - 1; i >= 0; i--) {
    const r = state.rings[i];
    r.r += (r.maxR - r.r) * 0.18 * f;
    r.alpha -= 0.04 * f;
    r.w *= Math.pow(0.96, f);
    if (r.alpha <= 0) state.rings.splice(i, 1);
  }
}
