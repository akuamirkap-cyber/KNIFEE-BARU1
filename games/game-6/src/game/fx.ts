import { P, TAU, pick, rng, rnd, withAlpha } from './core';
import { emissive } from './art';
import type { Beam, Bullet, GameAPI, Weapon } from './types';

/* =========================== factories =========================== */

export function makeBeam(o: Partial<Beam> & { weapon: Weapon; draw: Beam['draw'] }): Beam {
  return { x: 0, y: 0, angle: 0, age: 0, duration: 0.3, len: 1200, hitX: 0, hitY: 0, hit: false, ...o };
}

export function makeBullet(o: {
  x: number;
  y: number;
  a: number;
  speed: number;
  weapon: Weapon;
  kind: string;
  size: number;
  trailMax?: number;
  life?: number;
  spin?: number;
  noStick?: boolean;
  data?: Record<string, number>;
  update?: Bullet['update'];
  collide?: Bullet['collide'];
  draw: Bullet['draw'];
}): Bullet {
  return {
    x: o.x,
    y: o.y,
    vx: Math.cos(o.a) * o.speed,
    vy: Math.sin(o.a) * o.speed,
    angle: o.a,
    spin: o.spin ?? 0,
    age: 0,
    life: o.life ?? 3,
    size: o.size,
    dead: false,
    kind: o.kind,
    weapon: o.weapon,
    trail: [],
    trailMax: o.trailMax ?? 8,
    data: o.data ?? {},
    noStick: o.noStick,
    update: o.update,
    collide: o.collide,
    draw: o.draw,
  };
}

export function trailPath(ctx: CanvasRenderingContext2D, b: Bullet, color: string, w: number, alpha = 1) {
  if (b.trail.length < 2) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const n = b.trail.length;
  // tapered trail: draw as segments with increasing width/alpha
  for (let i = 1; i < n; i++) {
    const u = i / (n - 1);
    const p0 = b.trail[i - 1],
      p1 = b.trail[i];
    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    ctx.lineTo(p1.x, p1.y);
    ctx.strokeStyle = withAlpha(color, 0.2 * alpha * u);
    ctx.lineWidth = w * 3 * u;
    ctx.stroke();
    ctx.strokeStyle = withAlpha(color, 0.65 * alpha * u);
    ctx.lineWidth = w * u;
    ctx.stroke();
  }
  ctx.restore();
}

/* ============================ muzzle fx ============================ */

type FlashKind = 'ak' | 'brake' | 'smg' | 'pistol';

export function muzzleFlash(
  api: GameAPI,
  x: number,
  y: number,
  a: number,
  o: { kind: FlashKind; size: number; color?: string; color2?: string }
) {
  const ps = api.particles;
  const c1 = o.color ?? '#ffd98a';
  const c2 = o.color2 ?? '#ff6a00';
  const S = o.size;
  // hot core
  ps.push(P({ type: 'flash', x, y, size: S * 0.95, color: c1, color2: c2, life: 0.075 }));
  // wide light spill that lights up the surroundings
  ps.push(P({ type: 'glow', x, y, size: S * 3.4, size2: S * 1.4, color: c1, color2: c2, life: 0.1 }));
  // forward leaf-shaped flame
  ps.push(P({ type: 'cone', x, y, rot: a, size: S * 2.6, width: o.kind === 'pistol' ? 0.3 : 0.24, color: c1, color2: c2, life: 0.07 }));
  // spikes
  const spikes = o.kind === 'smg' ? 7 : o.kind === 'pistol' ? 5 : 6;
  ps.push(
    P({ type: 'flare', x, y, rot: a, size: S * 2.0, size2: spikes, width: o.kind === 'smg' ? 0.9 : 0.6, color: c1, life: 0.075 })
  );
  if (o.kind === 'ak') {
    // slant-brake pushes gas up & forward
    ps.push(P({ type: 'cone', x, y, rot: a - 0.95, size: S * 1.3, width: 0.34, color: c1, color2: c2, life: 0.06 }));
    ps.push(P({ type: 'cone', x, y, rot: a + 0.35, size: S * 0.8, width: 0.3, color: c1, color2: c2, life: 0.05 }));
  } else if (o.kind === 'brake') {
    // multi-port brake: twin side blasts
    for (const d of [-1, 1]) {
      ps.push(P({ type: 'cone', x: x - Math.cos(a) * 8, y: y - Math.sin(a) * 8, rot: a + d * 1.45, size: S * 1.5, width: 0.3, color: c1, color2: c2, life: 0.07 }));
    }
    ps.push(P({ type: 'streak', x, y, rot: a + Math.PI / 2, size: S * 1.7, width: 5, color: c1, life: 0.09 }));
  }
  // expanding gas ring
  ps.push(
    P({
      type: 'shock',
      x: x + Math.cos(a) * 10,
      y: y + Math.sin(a) * 10,
      rot: a + Math.PI / 2,
      size: S * 1.1,
      size2: S * 0.2,
      color: c1,
      width: 2.4,
      life: 0.16,
      vx: Math.cos(a) * 160,
      vy: Math.sin(a) * 160,
      drag: 0.9,
    })
  );
  // sparks
  const nS = o.kind === 'brake' ? 16 : 11;
  for (let i = 0; i < nS; i++) {
    const ang = a + rnd(-0.7, 0.7);
    const sp = rnd(280, 1050);
    ps.push(
      P({
        type: 'spark',
        x,
        y,
        vx: Math.cos(ang) * sp,
        vy: Math.sin(ang) * sp,
        color: pick(['#fff6d6', '#ffc861', '#ff9f3a']),
        life: rnd(0.1, 0.38),
        grav: 520,
        drag: 0.93,
        width: 1.6,
      })
    );
  }
  // burning powder embers
  for (let i = 0; i < 4; i++) {
    const ang = a + rnd(-0.5, 0.5);
    ps.push(
      P({
        type: 'ember',
        x,
        y,
        vx: Math.cos(ang) * rnd(100, 400),
        vy: Math.sin(ang) * rnd(100, 400) - 30,
        size: rnd(1.1, 2.2),
        color: '#ffe3a0',
        color2: '#ff6a00',
        life: rnd(0.3, 0.7),
        grav: 300,
        drag: 0.95,
      })
    );
  }
  // smoke: a jet + lazy curls
  for (let i = 0; i < 6; i++) {
    const ang = a + rnd(-0.45, 0.45);
    ps.push(
      P({
        type: 'smoke',
        x: x + Math.cos(a) * 6,
        y: y + Math.sin(a) * 6,
        vx: Math.cos(ang) * rnd(40, 220),
        vy: Math.sin(ang) * rnd(40, 220) - 28,
        size: rnd(26, 58),
        size2: 5,
        color: i % 2 ? '#aab3bf' : '#8a929e',
        life: rnd(0.6, 1.4),
        drag: 0.93,
      })
    );
  }
}

/** tiny brass casing flung from the ejection port, bounces on the floor */
export function shellEject(api: GameAPI, x: number, y: number, o: { size?: number; power?: number } = {}) {
  const pw = o.power ?? 1;
  api.particles.push(
    P({
      type: 'casing',
      x,
      y,
      vx: rnd(90, 210) * pw,
      vy: -rnd(150, 290) * pw,
      size: o.size ?? 4.2,
      rot: rnd(TAU),
      spin: rnd(-26, 26),
      grav: 1500,
      floor: api.floorY,
      bounce: 0.42,
      life: 1.8,
      drag: 0.997,
    })
  );
  // tiny glint
  api.particles.push(P({ type: 'star', x, y, size: 7, color: '#fff2c4', life: 0.1, width: 1.2 }));
}

export function energyMuzzle(api: GameAPI, x: number, y: number, a: number, c1: string, c2: string, size = 46) {
  const ps = api.particles;
  ps.push(P({ type: 'flash', x, y, size, color: c1, color2: c2, life: 0.12 }));
  ps.push(P({ type: 'glow', x, y, size: size * 3, size2: size, color: c1, color2: c2, life: 0.16 }));
  ps.push(P({ type: 'flare', x, y, rot: a, size: size * 2.2, size2: 5, width: 0.7, color: c1, life: 0.1 }));
  ps.push(P({ type: 'streak', x, y, rot: a + Math.PI / 2, size: size * 1.2, width: 3, color: c1, life: 0.12 }));
  ps.push(P({ type: 'ring', x, y, size: size * 0.95, size2: 3, color: c1, width: 4, life: 0.2 }));
  for (let i = 0; i < 10; i++) {
    const ang = a + rnd(-0.55, 0.55);
    ps.push(
      P({
        type: 'spark',
        x,
        y,
        vx: Math.cos(ang) * rnd(200, 700),
        vy: Math.sin(ang) * rnd(200, 700),
        color: c1,
        life: rnd(0.12, 0.32),
        drag: 0.9,
        width: 1.6,
      })
    );
  }
  for (let i = 0; i < 3; i++)
    ps.push(P({ type: 'bolt', x, y, rot: a + rnd(-0.9, 0.9), size: rnd(16, 36), color: c1, life: 0.1, width: 1.6 }));
}

/* ============================ impact fx ============================ */

export const rimAngleAt = (api: GameAPI, x: number, y: number) => Math.atan2(y - api.cy, x - api.cx);

export function splinters(api: GameAPI, x: number, y: number, a: number, n = 12, power = 1) {
  for (let i = 0; i < n; i++) {
    const ang = a + Math.PI + rnd(-1.2, 1.2);
    api.particles.push(
      P({
        type: 'shard',
        x,
        y,
        vx: Math.cos(ang) * rnd(100, 480) * power,
        vy: Math.sin(ang) * rnd(100, 480) * power - 70,
        size: rnd(2.4, 7.5),
        color: pick(['#8a5a2b', '#a9713a', '#6b4320', '#c99a62']),
        color2: '#e6bb84',
        rot: rnd(TAU),
        spin: rnd(-22, 22),
        grav: 1150,
        life: rnd(0.6, 1.4),
        drag: 0.99,
      })
    );
  }
}

export function dust(api: GameAPI, x: number, y: number, a: number, n = 5, power = 1, color = '#d9c4a4') {
  for (let i = 0; i < n; i++) {
    const ang = a + Math.PI + rnd(-1.0, 1.0);
    api.particles.push(
      P({
        type: 'smoke',
        x,
        y,
        vx: Math.cos(ang) * rnd(50, 200) * power,
        vy: Math.sin(ang) * rnd(50, 200) * power - 25,
        size: rnd(26, 52) * power,
        size2: 5,
        color,
        life: rnd(0.45, 1.0),
        drag: 0.92,
      })
    );
  }
}

export function shockRing(api: GameAPI, x: number, y: number, size: number, color: string, width = 3, life = 0.3) {
  api.particles.push(P({ type: 'ring', x, y, size, size2: 4, color, width, life }));
}

export function sparkFan(
  api: GameAPI,
  x: number,
  y: number,
  dir: number,
  n: number,
  o: { spread?: number; min?: number; max?: number; colors?: string[]; grav?: number; width?: number; life?: [number, number] } = {}
) {
  for (let i = 0; i < n; i++) {
    const ang = dir + rnd(-(o.spread ?? 1.3), o.spread ?? 1.3);
    const sp = rnd(o.min ?? 150, o.max ?? 900);
    const lf = o.life ?? [0.15, 0.5];
    api.particles.push(
      P({
        type: 'spark',
        x,
        y,
        vx: Math.cos(ang) * sp,
        vy: Math.sin(ang) * sp,
        color: pick(o.colors ?? ['#fff6d0', '#ffcf6b', '#ff9b3d']),
        life: rnd(lf[0], lf[1]),
        grav: o.grav ?? 900,
        drag: 0.93,
        width: o.width ?? 1.9,
      })
    );
  }
}

export function embers(api: GameAPI, x: number, y: number, n: number, c1 = '#ffe3a0', c2 = '#ff5500', power = 1, up = 120) {
  for (let i = 0; i < n; i++) {
    const ang = rnd(TAU);
    api.particles.push(
      P({
        type: 'ember',
        x,
        y,
        vx: Math.cos(ang) * rnd(50, 380) * power,
        vy: Math.sin(ang) * rnd(50, 380) * power - up,
        size: rnd(1.3, 3.1),
        color: c1,
        color2: c2,
        life: rnd(0.6, 1.5),
        grav: 260,
        drag: 0.96,
      })
    );
  }
}

export function impactFlash(api: GameAPI, x: number, y: number, size: number, c1: string, c2: string, life = 0.1) {
  api.particles.push(P({ type: 'flash', x, y, size, color: c1, color2: c2, life }));
  api.particles.push(P({ type: 'glow', x, y, size: size * 2.6, size2: size * 0.8, color: c1, color2: c2, life: life * 1.8 }));
}

/** chain-lightning that crawls along the wheel rim in both directions */
export function rimArcs(api: GameAPI, x: number, y: number, color: string, n = 2, span = 1.3) {
  const a0 = rimAngleAt(api, x, y);
  for (let i = 0; i < n; i++) {
    for (const d of [-1, 1]) {
      api.particles.push(
        P({
          type: 'rimarc',
          x: api.cx,
          y: api.cy,
          rot: a0 + d * 0.04 * i,
          size: api.wheelR - 1 - i * 3,
          size2: d * span * rnd(0.6, 1.15),
          color,
          width: 2.2,
          life: rnd(0.24, 0.4),
          drag: 1,
        })
      );
    }
  }
}

export function radialStreaks(api: GameAPI, x: number, y: number, n: number, color: string, min = 60, max = 240) {
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU + rnd(-0.1, 0.1);
    api.particles.push(
      P({
        type: 'streak',
        x: x + Math.cos(a) * rnd(8, 30),
        y: y + Math.sin(a) * rnd(8, 30),
        rot: a,
        size: rnd(min, max),
        width: rnd(1.4, 3.2),
        color,
        life: rnd(0.15, 0.32),
        vx: Math.cos(a) * rnd(80, 260),
        vy: Math.sin(a) * rnd(80, 260),
        drag: 0.9,
      })
    );
  }
}

export function bulletImpact(api: GameAPI, x: number, y: number, a: number, power: number, color: string) {
  impactFlash(api, x, y, 30 * power, '#fff2c4', '#ff8a3c', 0.08);
  sparkFan(api, x, y, a + Math.PI, Math.round(16 * power), { spread: 1.35, max: 950 * power });
  splinters(api, x, y, a, Math.round(9 * power), power);
  dust(api, x, y, a, Math.round(4 * power) + 1, power);
  api.particles.push(P({ type: 'star', x, y, size: 20 * power, color, life: 0.12, width: 1.6 }));
  shockRing(api, x, y, 40 * power, '#ffe2b0', 2.6, 0.24);
}

/* ============================ mark painters ============================ */
/* Mark space: origin at impact point, +X points OUTWARD from the wheel centre. */

/** a small, recessed impact dimple; kept compact so its edge never reads as spikes */
export function holeMark(ctx: CanvasRenderingContext2D, r: number, seed: number, fibers = 8) {
  const R = rng(Math.floor(seed * 1000) + 7);
  const rx = r * 1.1,
    ry = r * 0.84;

  // soft compression bruise with a single raised crescent on its lit edge
  const bruise = ctx.createRadialGradient(-r * 0.16, -r * 0.12, r * 0.08, 0, 0, r * 1.55);
  bruise.addColorStop(0, 'rgba(8,4,2,0.94)');
  bruise.addColorStop(0.52, 'rgba(28,15,7,0.86)');
  bruise.addColorStop(0.82, 'rgba(86,53,27,0.42)');
  bruise.addColorStop(1, 'rgba(86,53,27,0)');
  ctx.fillStyle = bruise;
  ctx.beginPath();
  ctx.ellipse(0, 0, rx * 1.35, ry * 1.35, 0, 0, TAU);
  ctx.fill();

  const rim = ctx.createLinearGradient(0, -ry, 0, ry);
  rim.addColorStop(0, 'rgba(244,211,163,0.72)');
  rim.addColorStop(0.28, 'rgba(113,72,36,0.9)');
  rim.addColorStop(0.62, 'rgba(28,15,7,1)');
  rim.addColorStop(1, 'rgba(119,77,40,0.7)');
  ctx.fillStyle = rim;
  ctx.beginPath();
  ctx.ellipse(0, 0, rx, ry, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#100904';
  ctx.beginPath();
  ctx.ellipse(-r * 0.04, -r * 0.02, rx * 0.62, ry * 0.56, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,239,204,0.48)';
  ctx.lineWidth = Math.max(0.65, r * 0.14);
  ctx.beginPath();
  ctx.ellipse(0, 0, rx * 0.9, ry * 0.84, 0, Math.PI * 1.08, Math.PI * 1.78);
  ctx.stroke();

  // a few shallow chips touch the rim rather than radiating into a spiky star
  const n = Math.min(4, Math.max(2, Math.ceil(fibers / 5)));
  ctx.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const a = R() * TAU;
    const x0 = Math.cos(a) * rx * 0.86,
      y0 = Math.sin(a) * ry * 0.82;
    const x1 = Math.cos(a + (R() - 0.5) * 0.45) * rx * (1.02 + R() * 0.2),
      y1 = Math.sin(a + (R() - 0.5) * 0.45) * ry * (0.98 + R() * 0.2);
    ctx.strokeStyle = i % 2 ? 'rgba(24,12,5,0.72)' : 'rgba(232,195,143,0.52)';
    ctx.lineWidth = 0.65 + R() * 0.55;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo((x0 + x1) * 0.56 + (R() - 0.5) * r * 0.12, (y0 + y1) * 0.56);
    ctx.lineTo(x1, y1);
    ctx.stroke();
  }
}

export function crackStar(ctx: CanvasRenderingContext2D, seed: number, n: number, len: number, a = 0.55) {
  const R = rng(Math.floor(seed * 1000) + 31);
  // Natural, short fractures. Avoid evenly spaced radial spokes, which look like a spiky organism.
  const count = Math.max(2, Math.min(5, Math.ceil(n / 2.5)));
  const maxLen = Math.max(3, len * 0.42);
  ctx.lineCap = 'round';
  for (let i = 0; i < count; i++) {
    const ang = R() * TAU;
    const l = maxLen * (0.42 + R() * 0.58);
    let x = Math.cos(ang) * len * 0.12;
    let y = Math.sin(ang) * len * 0.12;
    const pts: [number, number][] = [[x, y]];
    for (let k = 1; k <= 3; k++) {
      const aa = ang + (R() - 0.5) * 0.75;
      x += Math.cos(aa) * (l / 3);
      y += Math.sin(aa) * (l / 3);
      pts.push([x, y]);
    }
    ctx.strokeStyle = `rgba(22,12,6,${a})`;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    pts.forEach(([px, py], j) => (j ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
    ctx.stroke();
    ctx.strokeStyle = 'rgba(245,218,180,0.42)';
    ctx.lineWidth = 0.62;
    ctx.beginPath();
    pts.forEach(([px, py], j) => (j ? ctx.lineTo(px, py - 0.7) : ctx.moveTo(px, py - 0.7)));
    ctx.stroke();
    if (R() > 0.45) {
      const [bx, by] = pts[2];
      const ba = ang + (R() < 0.5 ? -1 : 1) * (0.5 + R() * 0.5);
      ctx.strokeStyle = `rgba(22,12,6,${a * 0.82})`;
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(bx + Math.cos(ba) * l * 0.24, by + Math.sin(ba) * l * 0.24);
      ctx.stroke();
    }
  }
}

export function heatGlow(ctx: CanvasRenderingContext2D, r: number, color: string, a: number, ox = 0) {
  if (a <= 0.01) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(ox, 0, 0, ox, 0, r);
  g.addColorStop(0, withAlpha('#fff3c0', a));
  g.addColorStop(0.4, withAlpha(color, a * 0.7));
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(ox, 0, r, 0, TAU);
  ctx.fill();
  ctx.restore();
}

/* Lichtenberg fractal: the branching burn left by electricity in wood */
interface Seg {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  d: number;
}
const lichCache = new Map<number, Seg[]>();
function lichSegs(seed: number, len: number): Seg[] {
  const key = Math.floor(seed * 1000) * 7 + Math.floor(len);
  const hit = lichCache.get(key);
  if (hit) return hit;
  const R = rng(key);
  const segs: Seg[] = [];
  const grow = (x: number, y: number, ang: number, l: number, d: number) => {
    if (d > 4 || l < 6) return;
    let cx = x,
      cy = y,
      a = ang;
    const steps = Math.ceil(l / 5);
    for (let i = 0; i < steps; i++) {
      a += (R() - 0.5) * 0.95;
      const nx = cx + Math.cos(a) * 5,
        ny = cy + Math.sin(a) * 5;
      segs.push({ x0: cx, y0: cy, x1: nx, y1: ny, d });
      cx = nx;
      cy = ny;
      if (R() < 0.2 && d < 4) grow(cx, cy, a + (R() < 0.5 ? -1 : 1) * (0.5 + R() * 0.7), l * (0.5 + R() * 0.25) - i * 2, d + 1);
    }
  };
  const n = 5 + Math.floor(R() * 3);
  for (let i = 0; i < n; i++) grow(0, 0, (i / n) * TAU + R() * 0.5, len * (0.7 + R() * 0.5), 0);
  lichCache.set(key, segs);
  return segs;
}

export function lichtenberg(
  ctx: CanvasRenderingContext2D,
  seed: number,
  len: number,
  color: string,
  glow: number,
  t: number
) {
  const segs = lichSegs(seed, len);
  ctx.save();
  ctx.lineCap = 'round';
  // burn underlay
  ctx.strokeStyle = 'rgba(12,6,3,0.7)';
  for (const s of segs) {
    ctx.lineWidth = 2.6 - s.d * 0.45;
    ctx.beginPath();
    ctx.moveTo(s.x0, s.y0);
    ctx.lineTo(s.x1, s.y1);
    ctx.stroke();
  }
  if (glow > 0.02) {
    ctx.globalCompositeOperation = 'lighter';
    const fl = 0.55 + 0.45 * Math.sin(t * 17 + seed);
    for (const s of segs) {
      ctx.strokeStyle = withAlpha(color, glow * (0.35 + 0.65 * fl * (1 - s.d * 0.16)));
      ctx.lineWidth = 1.5 - s.d * 0.22;
      ctx.beginPath();
      ctx.moveTo(s.x0, s.y0);
      ctx.lineTo(s.x1, s.y1);
      ctx.stroke();
    }
  }
  ctx.restore();
}

export function drawEmbedded(ctx: CanvasRenderingContext2D, r: number, hot: number, color: string) {
  // slug base seen head-on
  ctx.beginPath();
  ctx.ellipse(-1, 0, r * 1.15, r, 0, 0, TAU);
  const g = ctx.createRadialGradient(-2, -1, 0, -1, 0, r * 1.2);
  g.addColorStop(0, '#fff0bf');
  g.addColorStop(0.5, '#c79637');
  g.addColorStop(1, '#6b4511');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = 'rgba(30,16,4,0.7)';
  ctx.lineWidth = 0.8;
  ctx.stroke();
  if (hot > 0.02) emissive(ctx, -1, 0, 10 * hot + 3, color, hot * 0.6);
}

