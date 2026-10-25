import { Particles, VW, VH, clamp, rand, randInt, TAU, rayCircle, hexA, makeGrain } from './core';
import { drawProjectile, muzzleFX, impactFX, type WeaponDef, type ProjKind } from './weapons';
import { drawArt, type ArtState } from './weapons';
import { sfx } from './audio';

export interface Stats {
  hits: number;
  clashes: number;
  destroyed: number;
  damage: number;
  charge: number;
  hp: number;
  firing: boolean;
  combo: number;
  best: number;
}

interface Proj {
  kind: ProjKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  ang: number;
  t: number;
  dead: boolean;
  gravity: number;
  w: WeaponDef;
  trail: number[];
  returning?: boolean;
  stuck?: number;
  rel?: number;
  chargeTier?: number;
  group: number;
  /** quantum superposition echoes riding alongside this projectile */
  ghosts: { x: number; y: number; phase: number; rx: number; ry: number }[];
}

const STICKS: ProjKind[] = ['arrow', 'bullet', 'smg', 'pistol', 'plasma', 'fire'];

interface Beam {
  t: number;
  life: number;
  max: number;
  w: WeaponDef;
  ox: number;
  oy: number;
  ang: number;
  len: number;
  ix: number;
  iy: number;
  hit: boolean;
}

interface Stuck {
  rel: number;
  kind: ProjKind;
  color: string;
  embed: number;
  wob: number;
  w: WeaponDef;
  t: number;
  group: number;
}

interface Molten {
  a0: number;
  a1: number;
  heat: number;
  color: string;
}

/** autonomous nanobot crawling along the wheel rim */
interface Nanite {
  rel: number;
  dir: number;
  speed: number;
  life: number;
  max: number;
  size: number;
  col: string;
}

const CONF: Record<string, { mx: number; my: number; scale: number }> = {
  bow: { mx: 244, my: 400, scale: 1 },
  ak: { mx: 250, my: 398, scale: 0.86 },
  rifle: { mx: 250, my: 398, scale: 0.86 },
  rifleElectro: { mx: 250, my: 398, scale: 0.86 },
  mp5: { mx: 246, my: 398, scale: 0.8 },
  mp5Electro: { mx: 246, my: 398, scale: 0.8 },
  sniper: { mx: 252, my: 398, scale: 0.8 },
  dragon: { mx: 264, my: 396, scale: 0.84 },
  beretta: { mx: 254, my: 410, scale: 1.15 },
  phaser: { mx: 286, my: 400, scale: 1.2 },
  sword: { mx: 246, my: 396, scale: 0.95 },
  caster: { mx: 300, my: 392, scale: 0.95 },
  disc: { mx: 246, my: 398, scale: 0.85 },
  proton: { mx: 262, my: 396, scale: 0.95 },
  tripod: { mx: 276, my: 403, scale: 0.85 },
  repulsor: { mx: 222, my: 398, scale: 1.05 },
  singularity: { mx: 250, my: 398, scale: 0.82 },
  tesla: { mx: 288, my: 398, scale: 0.86 },
  railgun: { mx: 252, my: 398, scale: 0.74 },
  prism: { mx: 280, my: 398, scale: 0.94 },
  nanite: { mx: 274, my: 398, scale: 0.9 },
  chrono: { mx: 312, my: 398, scale: 0.92 },
  cryo: { mx: 296, my: 398, scale: 0.94 },
  sonic: { mx: 302, my: 398, scale: 0.88 },
  quantum: { mx: 294, my: 398, scale: 0.94 },
  acid: { mx: 268, my: 398, scale: 0.9 },
  buster: { mx: 250, my: 398, scale: 1.0 },
};

export class Engine {
  ctx: CanvasRenderingContext2D;
  canvas: HTMLCanvasElement;
  ps = new Particles();
  raf = 0;
  last = 0;
  time = 0;
  timeScale = 1;
  slowmo = false;

  w: WeaponDef;
  firing = false;
  pending = false;
  cooldown = 0;
  charge = 0;
  recoil = 0;
  pull = 0;
  swing = 0;
  swingHit = false;
  fireFlash = 0;
  shake = 0;
  flash = 0;
  muzzleGlow = 0;

  wheel = {
    x: 985,
    y: 398,
    r: 182,
    angle: 0,
    speed: 1.15,
    hp: 120,
    maxHp: 120,
    alive: true,
    respawn: 0,
    hitFlash: 0,
    shake: 0,
  };

  stuck: Stuck[] = [];
  molten: Molten[] = [];
  projs: Proj[] = [];
  beams: Beam[] = [];
  /** cryo buildup 0..1 — freezes and slows the wheel */
  freeze = 0;
  /** frost arcs grown on the rim */
  frost: { rel: number; a0: number; a1: number; life: number }[] = [];
  /** acid pools eating into the rim */
  acidPools: { rel: number; size: number; life: number; max: number }[] = [];
  /** buster charge tier for the shot currently being spawned */
  busterTier = 0;
  nanites: Nanite[] = [];
  /** temporal stutter timer (seconds) — drives the time-crack slow-mo */
  stutterT = 0;

  stats: Stats = { hits: 0, clashes: 0, destroyed: 0, damage: 0, charge: 0, hp: 120, firing: false, combo: 0, best: 0 };
  onStats: ((s: Stats) => void) | null = null;
  private dirty = true;
  private notifyT = 0;

  /* ---- post-processing buffers (bloom) + reflection + grain ---- */
  private bA = document.createElement('canvas');
  private bB = document.createElement('canvas');
  private bC = document.createElement('canvas');
  private bD = document.createElement('canvas');
  private refl = document.createElement('canvas');
  private grain = makeGrain(160, 22);
  private decal: { rel: number; r: number; size: number; heat: number; color: string }[] = [];
  private motes: { x: number; y: number; z: number; s: number; p: number }[] = [];

  private setupBuffers() {
    for (const [c, w, h] of [
      [this.bA, 320, 180],
      [this.bB, 320, 180],
      [this.bC, 160, 90],
      [this.bD, 160, 90],
    ] as [HTMLCanvasElement, number, number][]) {
      c.width = w;
      c.height = h;
    }
    this.refl.width = 640;
    this.refl.height = 80;
    for (let i = 0; i < 46; i++) {
      this.motes.push({ x: rand(0, VW), y: rand(0, VH), z: rand(0.25, 1), s: rand(0.6, 2.2), p: rand(0, TAU) });
    }
    this.ps.onBounce = (p) => {
      if (p.kind === 'casing') sfx.tick();
      else if (Math.random() < 0.3)
        this.ps.spawn({
          kind: 'ember',
          x: p.x,
          y: p.y,
          vx: rand(-120, 120),
          vy: rand(-90, -20),
          life: rand(0.2, 0.5),
          max: 0.5,
          size: rand(0.8, 1.8),
          color: p.color,
          grav: 260,
        });
    };
  }

  constructor(canvas: HTMLCanvasElement, weapon: WeaponDef) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false })!;
    this.w = weapon;
    this.setupBuffers();
    this.resize();
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = VW * dpr;
    this.canvas.height = VH * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  setWeapon(w: WeaponDef) {
    this.w = w;
    this.charge = 0;
    this.cooldown = 0;
    this.beams = [];
    this.pull = 0;
    this.dirty = true;
    sfx.beamStop();
  }

  resetWheel() {
    this.wheel.hp = this.wheel.maxHp;
    this.wheel.alive = true;
    this.wheel.respawn = 0;
    this.stuck = [];
    this.molten = [];
    this.decal = [];
    this.nanites = [];
    this.frost = [];
    this.freeze = 0;
    this.acidPools = [];
    this.projs = [];
    this.ps.clear();
    this.dirty = true;
  }

  /** release the swarm: nanobots hatch and crawl the rim, eating it */
  private hatchNanites(rel: number, count = 26) {
    for (let i = 0; i < count; i++) {
      this.nanites.push({
        rel: rel + rand(-0.16, 0.16),
        dir: Math.random() < 0.5 ? -1 : 1,
        speed: rand(0.35, 1.25),
        life: rand(2.4, 4.6),
        max: 4.6,
        size: rand(1.1, 2.3),
        col: Math.random() < 0.75 ? this.w.primary : '#eaffd6',
      });
    }
    if (this.nanites.length > 90) this.nanites.splice(0, this.nanites.length - 90);
  }

  /** shatter the local timeline — heavy slow-motion snap */
  timeCrack(dur = 0.55) {
    this.stutterT = Math.max(this.stutterT, dur);
    this.flash = Math.max(this.flash, 0.35);
  }

  setFiring(f: boolean) {
    if (f && !this.firing) {
      sfx.init();
      this.pending = true;
    }
    if (!f) {
      if (this.beams.length) sfx.beamStop();
    }
    this.firing = f;
    this.dirty = true;
  }

  start() {
    this.last = performance.now();
    const loop = (ts: number) => {
      const dtRaw = Math.min(0.05, (ts - this.last) / 1000);
      this.last = ts;
      this.timeScale += ((this.slowmo ? 0.28 : 1) - this.timeScale) * Math.min(1, dtRaw * 8);
      this.update(dtRaw * this.timeScale);
      this.render();
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  stop() {
    cancelAnimationFrame(this.raf);
    sfx.beamStop();
  }

  private notify(force = false) {
    if (force) this.dirty = true;
    this.notifyT += 1;
    if (this.dirty && this.notifyT % 4 === 0) {
      this.dirty = false;
      this.onStats?.({ ...this.stats, charge: this.charge, hp: this.wheel.hp, firing: this.firing });
    }
  }

  private get muz() {
    const c = CONF[this.w.id] ?? { mx: 250, my: 398, scale: 1 };
    return c;
  }

  /* ------------------------------------------------------------ FIRING */
  private group = 0;

  private shoot() {
    const w = this.w;
    const c = this.muz;
    const ox = c.mx;
    const oy = c.my;
    this.group += 1;
    if (w.id === 'bow') this.pull = 0;
    this.cooldown = 60 / Math.max(1, w.rpm);
    this.recoil = Math.min(1.6, w.recoil);
    this.fireFlash = 1;
    this.shake = Math.max(this.shake, w.shake);
    this.muzzleGlow = 1;
    sfx.fire(w);

    if (w.mode === 'melee') {
      this.swing = 0.001;
      this.swingHit = false;
      this.ps.spawn({
        kind: 'ring',
        x: ox + 120,
        y: oy,
        size: 8,
        size2: 130,
        life: 0.3,
        max: 0.3,
        color: w.primary,
        data: 6,
      });
      return;
    }

    muzzleFX(this.ps, w, ox, oy, 0, 1);

    if (w.mode === 'throw') {
      this.spawnProj(ox, oy, w.speed, rand(-20, 20), w);
      return;
    }

    const d = this.wheel.x - ox;
    const g = w.gravity ?? 0;
    const aim = g > 0 ? -0.5 * Math.asin(clamp((g * d) / (w.speed * w.speed), -1, 1)) : 0;
    for (let i = 0; i < w.pellets; i++) {
      const a = aim + rand(-w.spread, w.spread);
      const sp = w.speed * rand(0.94, 1.06);
      this.spawnProj(ox, oy + (w.pellets > 1 ? rand(-14, 14) : 0), Math.cos(a) * sp, Math.sin(a) * sp, w);
    }
  }

  private spawnProj(x: number, y: number, vx: number, vy: number, w: WeaponDef) {
    this.projs.push({
      kind: w.proj,
      x,
      y,
      vx,
      vy,
      ang: Math.atan2(vy, vx),
      t: 0,
      dead: false,
      gravity: w.gravity ?? 0,
      w,
      trail: [],
      group: this.group,
      ghosts: w.proj === 'qubit'
        ? [
            { x, y, phase: 0, rx: 13, ry: 16 },
            { x, y, phase: Math.PI, rx: 17, ry: 11 },
          ]
        : [],
    });
  }

  private firePulseBeam() {
    const w = this.w;
    const c = this.muz;
    this.recoil = Math.min(1.8, w.recoil);
    this.fireFlash = 1;
    this.muzzleGlow = 1;
    sfx.fire(w);
    const ang = Math.atan2(this.wheel.y - c.my, this.wheel.x - c.mx);
    muzzleFX(this.ps, w, c.mx, c.my, ang, 1.9);
    const t = rayCircle(c.mx, c.my, Math.cos(ang), Math.sin(ang), this.wheel.x, this.wheel.y, this.wheel.r);
    this.beams.push({
      t: 0,
      life: w.beamLife ?? 0.2,
      max: w.beamLife ?? 0.2,
      w,
      ox: c.mx,
      oy: c.my,
      ang,
      len: t > 0 ? t : 1200,
      ix: c.mx + Math.cos(ang) * (t > 0 ? t : 1200),
      iy: c.my + Math.sin(ang) * (t > 0 ? t : 1200),
      hit: t > 0,
    });
    this.applyDamage(w.damage, c.mx + Math.cos(ang) * (t > 0 ? t : 1200), c.my + Math.sin(ang) * (t > 0 ? t : 1200), ang, true);
    impactFX(this.ps, w, c.mx + Math.cos(ang) * (t > 0 ? t : 1200), c.my + Math.sin(ang) * (t > 0 ? t : 1200), ang, 1.4);
    sfx.impact(w.impact, this.stats.combo);
    this.shake = Math.max(this.shake, w.shake);
  }

  /* ----------------------------------------------------------- DAMAGE */
  private applyDamage(amount: number, x: number, y: number, ang: number, big = false, count = true) {
    const wl = this.wheel;
    if (!wl.alive) return;
    wl.hp -= amount;
    wl.hitFlash = Math.min(1, wl.hitFlash + (big ? 0.9 : 0.2));
    wl.shake = Math.min(1, wl.shake + (big ? 0.8 : 0.12));
    this.stats.damage += amount;
    if (count) {
      this.stats.hits += 1;
      this.stats.combo += 1;
      this.stats.best = Math.max(this.stats.best, this.stats.combo);
    }
    // damage numbers: only for meaningful hits (avoids per-frame spam on beams)
    if (amount >= 1 || Math.random() < 0.14) {
      this.ps.spawn({
        kind: 'text',
        x: x + rand(-6, 6),
        y: y - 16,
        vx: rand(-20, 20),
        vy: -70,
        life: 0.7,
        max: 0.7,
        size: big ? 26 : 16,
        color: big ? '#ffffff' : this.w.primary,
        text: `${Math.max(1, Math.round(amount))}`,
        add: false,
      });
    }
    if (wl.hp <= 0) this.destroyWheel(ang);
    this.dirty = true;
  }

  private destroyWheel(ang: number) {
    const wl = this.wheel;
    wl.alive = false;
    wl.hp = 0;
    wl.respawn = 1.5;
    this.stats.destroyed += 1;
    this.stats.combo += 1;
    this.stats.best = Math.max(this.stats.best, this.stats.combo);
    this.shake = Math.max(this.shake, 26);
    this.flash = 1;
    this.slowmoPulse();
    sfx.boom();
    const cx = wl.x;
    const cy = wl.y;
    this.ps.spawn({ kind: 'flash', x: cx, y: cy, size: 420, life: 0.35, max: 0.35, color: '#ffffff' });
    for (const [r, c] of [
      [260, '#ffffff'],
      [420, this.w.primary],
      [600, this.w.secondary],
    ] as [number, string][]) {
      this.ps.spawn({ kind: 'ring', x: cx, y: cy, size: 30, size2: r, life: 0.75, max: 0.75, color: c, data: 10 });
    }
    for (let i = 0; i < 60; i++) {
      const a = rand(0, TAU);
      const s = rand(120, 900);
      this.ps.spawn({
        kind: 'spark',
        x: cx + Math.cos(a) * wl.r * 0.6,
        y: cy + Math.sin(a) * wl.r * 0.6,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life: rand(0.4, 1),
        max: 1,
        size: rand(14, 34),
        size2: rand(2, 4),
        color: i % 3 ? this.w.primary : '#ffffff',
        grav: 400,
        drag: 0.95,
      });
    }
    for (let i = 0; i < 26; i++) {
      const a = (i / 26) * TAU + rand(-0.1, 0.1);
      this.ps.spawn({
        kind: 'shard',
        x: cx + Math.cos(a) * wl.r,
        y: cy + Math.sin(a) * wl.r,
        vx: Math.cos(a) * rand(160, 620),
        vy: Math.sin(a) * rand(160, 620) - 120,
        rot: a,
        vrot: rand(-12, 12),
        life: rand(0.9, 1.8),
        max: 1.8,
        size: rand(6, 16),
        size2: rand(4, 11),
        color: i % 2 ? '#3a424c' : '#69737f',
        grav: 820,
        add: false,
      });
    }
    for (let i = 0; i < 22; i++)
      this.ps.spawn({
        kind: 'smoke',
        x: cx + rand(-100, 100),
        y: cy + rand(-100, 100),
        vx: rand(-160, 160),
        vy: rand(-180, -30),
        size: rand(30, 70),
        life: rand(1.2, 2.4),
        max: 2.4,
        color: '#7c8794',
        add: false,
        drag: 0.97,
      });
    // fly off stuck knives
    for (const s of this.stuck) {
      const a = wl.angle + s.rel;
      this.ps.spawn({
        kind: 'debris',
        x: wl.x + Math.cos(a) * wl.r,
        y: wl.y + Math.sin(a) * wl.r,
        vx: Math.cos(a) * rand(300, 700),
        vy: Math.sin(a) * rand(300, 700) - 200,
        rot: a + Math.PI,
        vrot: rand(-20, 20),
        life: 1.4,
        max: 1.4,
        size: 8,
        color: '#cfd6de',
        grav: 800,
        add: false,
      });
    }
    this.stuck = [];
    this.ps.spawn({ kind: 'text', x: cx, y: cy - 40, vx: 0, vy: -40, life: 1.2, max: 1.2, size: 44, color: '#fff', text: 'WHEEL DOWN!', add: false });
    void ang;
  }

  userSlow = false;

  slowmoPulse() {
    this.slowmo = true;
    window.setTimeout(() => (this.slowmo = this.userSlow), 460);
  }

  /* ----------------------------------------------------------- UPDATE */
  update(dtRaw: number) {
    const dt = dtRaw;
    this.time += dt;
    const w = this.w;
    const wl = this.wheel;
    this.cooldown = Math.max(0, this.cooldown - dt);
    this.recoil = Math.max(0, this.recoil - dt * (w.mode === 'melee' ? 2.2 : 6.5));
    this.fireFlash = Math.max(0, this.fireFlash - dt * 9);
    this.muzzleGlow = Math.max(0, this.muzzleGlow - dt * 4);
    this.pull += ((this.firing && w.id === 'bow' ? 1 : 0) - this.pull) * Math.min(1, dt * 12);
    this.shake *= Math.pow(0.0025, dt);
    this.flash = Math.max(0, this.flash - dt * 2.6);
    if (this.swing > 0) {
      this.swing += dt * 3.6;
      if (this.swing >= 1) this.swing = 0;
    }

    // ---- wheel (rotation damped by cryo freeze buildup)
    if (wl.alive) {
      wl.angle += wl.speed * (1 - this.freeze * 0.78) * dt;
      wl.hitFlash = Math.max(0, wl.hitFlash - dt * 3.4);
      wl.shake = Math.max(0, wl.shake - dt * 3);
      // the frost thaws slowly
      if (this.freeze > 0 && this.w.id !== 'cryo') this.freeze = Math.max(0, this.freeze - dt * 0.34);
      for (let i = this.frost.length - 1; i >= 0; i--) {
        this.frost[i].life -= dt * 0.3;
        if (this.frost[i].life <= 0) this.frost.splice(i, 1);
      }
      // cold glitter drifting off the frozen rim
      if (this.freeze > 0.25 && Math.random() < dt * 22 * this.freeze) {
        const a = rand(0, TAU);
        this.ps.spawn({
          kind: 'ember',
          x: wl.x + Math.cos(a) * wl.r,
          y: wl.y + Math.sin(a) * wl.r,
          vx: rand(-50, 50),
          vy: rand(-90, -10),
          life: rand(0.4, 1),
          max: 1,
          size: rand(0.7, 1.7),
          color: Math.random() < 0.5 ? '#e8f8ff' : this.w.primary,
          grav: 190,
          drag: 0.985,
        });
      }
    } else {
      wl.respawn -= dt;
      if (wl.respawn <= 0) this.resetWheel();
    }
    for (let i = this.molten.length - 1; i >= 0; i--) {
      const m = this.molten[i];
      m.heat -= dt * 0.42;
      if (m.heat <= 0) this.molten.splice(i, 1);
    }
    for (let i = this.decal.length - 1; i >= 0; i--) {
      this.decal[i].heat -= dt * 0.16;
      if (this.decal[i].heat <= 0) this.decal.splice(i, 1);
    }
    /* ---- acid pools: bubble, fizz, and keep dissolving the rim ---- */
    if (this.acidPools.length) {
      let total = 0;
      for (let i = this.acidPools.length - 1; i >= 0; i--) {
        const a = this.acidPools[i];
        a.life -= dt;
        a.size = Math.min(a.size + dt * 3.4, 15);
        if (a.life <= 0) {
          this.acidPools.splice(i, 1);
          continue;
        }
        total += a.size;
        // the acid boils as it eats
        const rel = a.rel;
        if (Math.random() < dt * 9) {
          const ang2 = wl.angle + rel;
          this.ps.spawn({
            kind: 'bubble',
            x: wl.x + Math.cos(ang2) * (wl.r - 8),
            y: wl.y + Math.sin(ang2) * (wl.r - 8),
            vx: rand(-60, 60),
            vy: rand(-180, -50),
            life: rand(0.35, 0.9),
            max: 0.9,
            size: rand(2, 5.4),
            color: this.w.primary,
            color2: '#f0ffcd',
            drag: 0.97,
          });
        }
        if (Math.random() < dt * 6) {
          const ang2 = wl.angle + rel;
          this.ps.spawn({
            kind: 'acid',
            x: wl.x + Math.cos(ang2) * (wl.r - 8),
            y: wl.y + Math.sin(ang2) * (wl.r - 8),
            vx: rand(-90, 90),
            vy: rand(-190, -40),
            life: rand(0.4, 1),
            max: 1,
            size: rand(1.2, 2.8),
            color: this.w.primary,
            color2: '#4a8a0a',
            grav: 620,
            drag: 0.97,
          });
        }
        if (Math.random() < dt * 3) this.addDecal(rel, rand(2.6, 5.6), this.w.primary);
      }
      // sustained dissolution damage scaled by total acid on the rim
      this.applyDamage(16 * dt * Math.min(6, total / 6), wl.x, wl.y, 0, false, false);
    }

    /* ---- nanite swarm: crawl the rim, chew it, then burn out ---- */
    if (this.nanites.length) {
      // sustained disassembly damage
      this.applyDamage(9 * dt * Math.min(4, this.nanites.length / 8), wl.x, wl.y, 0, false, false);
      for (let i = this.nanites.length - 1; i >= 0; i--) {
        const n = this.nanites[i];
        n.life -= dt;
        n.rel += n.dir * n.speed * dt;
        if (n.life <= 0) {
          const a = wl.angle + n.rel;
          this.ps.spawn({
            kind: 'nano',
            x: wl.x + Math.cos(a) * (wl.r - 6),
            y: wl.y + Math.sin(a) * (wl.r - 6),
            vx: rand(-90, 90),
            vy: rand(-140, -20),
            life: 0.3,
            max: 0.3,
            size: n.size,
            color: n.col,
            drag: 0.94,
          });
          this.nanites.splice(i, 1);
          continue;
        }
        // they eat the surface: pockmarks + tiny sparks
        if (Math.random() < dt * 2.4) {
          this.addDecal(n.rel, rand(1.6, 3.4), n.col);
          const a = wl.angle + n.rel;
          this.ps.spawn({
            kind: 'nano',
            x: wl.x + Math.cos(a) * (wl.r - 6),
            y: wl.y + Math.sin(a) * (wl.r - 6),
            vx: rand(-70, 70),
            vy: rand(-120, -20),
            life: rand(0.2, 0.45),
            max: 0.45,
            size: n.size * 0.8,
            color: n.col,
            drag: 0.95,
          });
        }
      }
    }
    // chrono crack leaves golden crystal dust drifting
    if (this.stutterT > 0 && Math.random() < dt * 46) {
      this.ps.spawn({
        kind: 'ember',
        x: rand(0, VW),
        y: rand(0, VH - 100),
        vx: rand(-40, 40),
        vy: rand(-60, 20),
        life: rand(0.4, 1),
        max: 1,
        size: rand(0.8, 2),
        color: Math.random() < 0.5 ? '#ffcc4d' : '#5fe6d0',
        grav: -20,
        drag: 0.98,
      });
    }
    // ambient atmospheric motes lit by recent gunfire
    if (this.fireFlash > 0.2 && Math.random() < dt * 40) {
      const c = this.muz;
      this.ps.spawn({
        kind: 'mote',
        x: rand(c.mx - 40, VW - 200),
        y: rand(180, VH - 120),
        vx: rand(-20, 90),
        vy: rand(-24, 12),
        size: rand(1.4, 4),
        life: rand(0.4, 1),
        max: 1,
        color: this.w.primary,
      });
    }

    // ---- firing
    const continuous = w.mode === 'beam' && !w.speed && (w.beamLife ?? 0) > 900;
    if (continuous) {
      if (this.firing && wl.alive) {
        if (!this.beams.length) {
          sfx.beamStart(w);
          const c = this.muz;
          this.beams.push({ t: 0, life: 999, max: 999, w, ox: c.mx, oy: c.my, ang: 0, len: 0, ix: 0, iy: 0, hit: false });
        }
      } else if (this.beams.length) {
        this.beams = [];
        sfx.beamStop();
      }
    } else if (this.firing || this.pending) {
      if (w.chargeTime) {
        if (this.cooldown <= 0) {
          if (this.charge === 0) {
            sfx.charge(true, w);
            this.busterTier = 0;
          }
          this.charge = Math.min(1, this.charge + dt / w.chargeTime);
          /* Mega Buster style: normal shots keep firing while the
             charge builds, and the tier tracks how far it has gone */
          if (w.dualShot) {
            this.busterTier = this.charge >= 0.99 ? 3 : this.charge > 0.62 ? 2 : this.charge > 0.3 ? 1 : 0;
            if (this.cooldown <= 0 && this.charge < 0.99 && this.firing) {
              this.shoot();
            }
          }
          if (this.charge >= 1) {
            this.charge = 0;
            this.pending = false;
            this.recoil = Math.min(2, w.recoil * (w.dualShot ? 2.6 : 1));
            this.shake = Math.max(this.shake, w.shake * (w.dualShot ? 2.4 : 1));
            if (w.speed > 0) this.shoot();
            else this.firePulseBeam();
            this.cooldown = 60 / Math.max(1, w.rpm);
            this.busterTier = 0;
          }
        }
      } else if (this.cooldown <= 0) {
        this.pending = false;
        this.shoot();
      } else if (w.mode === 'semi' || w.mode === 'melee' || w.mode === 'throw') {
        this.pending = false;
      }
    } else if (!this.firing && !this.pending && this.charge > 0) {
      this.charge = Math.max(0, this.charge - dt * 2);
    }

    // ---- continuous beam behaviour
    if (continuous && this.beams.length && this.firing && wl.alive) {
      const b = this.beams[0];
      const c = this.muz;
      const base = Math.atan2(wl.y - c.my, wl.x - c.mx);
      const sweep = w.sweep ?? 0;
      b.ang = base + Math.sin(this.time * (w.sweepSpeed ?? 2)) * sweep;
      const dx = Math.cos(b.ang);
      const dy = Math.sin(b.ang);
      const t = rayCircle(c.mx, c.my, dx, dy, wl.x, wl.y, wl.r);
      b.len = t > 0 ? t : 1300;
      b.ix = c.mx + dx * b.len;
      b.iy = c.my + dy * b.len;
      b.hit = t > 0;
      b.t += dt;
      if (Math.random() < dt * 26) {
        const a = b.ang + rand(-0.5, 0.5);
        this.ps.spawn({
          kind: 'spark',
          x: c.mx,
          y: c.my,
          vx: Math.cos(a) * rand(200, 620),
          vy: Math.sin(a) * rand(200, 620),
          life: rand(0.12, 0.28),
          max: 0.28,
          size: rand(10, 22),
          size2: rand(1.6, 3),
          color: w.secondary,
          drag: 0.9,
        });
      }
      if (b.hit && w.id === 'tesla') {
        // residual arcs crawling over the rim around the contact point
        if (Math.random() < dt * 22) {
          this.ps.spawn({
            kind: 'arcweb',
            x: b.ix + rand(-12, 12),
            y: b.iy + rand(-12, 12),
            rot: rand(0, TAU),
            size: rand(34, 70),
            size2: rand(1.3, 2.2),
            data: randInt(3, 5),
            life: rand(0.12, 0.26),
            max: 0.26,
            color: Math.random() < 0.5 ? w.primary : '#ffffff',
          });
        }
      }
      if (b.hit) {
        this.applyDamage(w.damage * dt, b.ix, b.iy, b.ang, false, false);
        if (Math.random() < dt * 34) {
          impactFX(this.ps, w, b.ix, b.iy, b.ang, 0.42);
          sfx.impact(w.impact);
        }
        const rel = Math.atan2(b.iy - wl.y, b.ix - wl.x) - wl.angle;
        if (w.id === 'cryo') {
          // build up ice instead of melting it
          this.freeze = Math.min(1, this.freeze + dt * 0.62);
          this.addFrost(rel);
          if (Math.random() < dt * 20) {
            this.ps.spawn({
              kind: 'snowflake',
              x: b.ix + rand(-18, 18),
              y: b.iy + rand(-18, 18),
              vx: rand(-60, 60),
              vy: rand(-90, -10),
              rot: rand(0, TAU),
              vrot: rand(-2.5, 2.5),
              size: rand(2.4, 6),
              color: Math.random() < 0.5 ? w.primary : '#ffffff',
              color2: '#3f7fd6',
              life: rand(0.5, 1.2),
              max: 1.2,
            });
          }
          if (Math.random() < dt * 26)
            this.ps.spawn({
              kind: 'frost',
              x: b.ix + rand(-14, 14),
              y: b.iy + rand(-14, 14),
              vx: rand(-70, 70),
              vy: rand(-120, -20),
              size: rand(12, 26),
              data: 2.4,
              life: rand(0.6, 1.3),
              max: 1.3,
              color: '#cbe9ff',
              drag: 0.96,
              rot: rand(0, TAU),
            });
        } else this.addMolten(rel, w.primary, dt * 1.5);
      }
    }

    // ---- beams (pulses) lifetime
    for (let i = this.beams.length - 1; i >= 0; i--) {
      const b = this.beams[i];
      if (b.max < 900) {
        b.t += dt;
        if (b.t >= b.max) this.beams.splice(i, 1);
      }
    }

    // ---- projectiles
    for (let i = this.projs.length - 1; i >= 0; i--) {
      const p = this.projs[i];
      p.t += dt;
      if (p.stuck !== undefined) {
        p.stuck -= dt;
        const a = wl.angle + (p.rel ?? 0);
        p.x = wl.x + Math.cos(a) * (wl.r - 8);
        p.y = wl.y + Math.sin(a) * (wl.r - 8);
        p.ang = a;
        if (p.stuck <= 0) {
          p.stuck = undefined;
          p.returning = true;
          const hx = this.muz.mx;
          const hy = this.muz.my;
          const d = Math.hypot(hx - p.x, hy - p.y) || 1;
          p.vx = ((hx - p.x) / d) * p.w.speed * 0.9;
          p.vy = ((hy - p.y) / d) * p.w.speed * 0.9;
        }
        continue;
      }
      if (p.returning) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.trail.push(p.x, p.y);
        if (p.trail.length > 40) p.trail.splice(0, 2);
        if (p.x < this.muz.mx + 20) p.dead = true;
        continue;
      }
      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.ang = Math.atan2(p.vy, p.vx);
      if (p.kind !== 'arrow' || true) {
        p.trail.push(p.x, p.y);
        const cap = p.kind === 'arrow' || p.kind === 'bullet' || p.kind === 'smg' || p.kind === 'pistol' ? 10 : 22;
        while (p.trail.length > cap * 2) p.trail.splice(0, 2);
      }
      /* quantum superposition: the qubit drags two phase-echo copies
         that orbit it, then they all snap together on impact */
      if (p.kind === 'qubit' && !p.returning) {
        const n = p.ghosts.length;
        for (let i = 0; i < n; i++) {
          const g = p.ghosts[i];
          g.phase += dt * (5.2 + i * 1.4);
          const ox = Math.cos(g.phase) * g.rx;
          const oy = Math.sin(g.phase) * g.ry;
          g.x = p.x - Math.cos(p.ang) * oy + Math.cos(p.ang + Math.PI / 2) * ox;
          g.y = p.y - Math.sin(p.ang) * oy + Math.sin(p.ang + Math.PI / 2) * ox;
          if (Math.random() < dt * 26) {
            this.ps.spawn({
              kind: 'ghost',
              x: g.x,
              y: g.y,
              rot: rand(0, TAU),
              size: rand(5, 11),
              color: i === 1 ? p.w.secondary : p.w.primary,
              data: 0.85,
              life: rand(0.16, 0.32),
              max: 0.32,
            });
          }
        }
      }
      /* gravitational lens: the singularity round drags every nearby
         particle, smoke puff and spark toward its event horizon */
      if (p.kind === 'singularity') {
        const R = 260;
        const R2 = R * R;
        for (const q of this.ps.list) {
          const ddx = p.x - q.x;
          const ddy = p.y - q.y;
          const d2 = ddx * ddx + ddy * ddy;
          if (d2 < R2 && d2 > 144) {
            const d = Math.sqrt(d2);
            const f = (1 - d / R) * 1500 * dt;
            q.vx += (ddx / d) * f;
            q.vy += (ddy / d) * f;
          }
        }
        if (Math.random() < dt * 60) {
          const a = rand(0, TAU);
          const d = rand(90, 230);
          this.ps.spawn({
            kind: 'streak',
            x: p.x + Math.cos(a) * d,
            y: p.y + Math.sin(a) * d,
            vx: -Math.cos(a) * rand(320, 900),
            vy: -Math.sin(a) * rand(320, 900),
            rot: a + Math.PI,
            size: rand(20, 48),
            size2: rand(0.9, 2),
            life: rand(0.16, 0.34),
            max: 0.34,
            color: Math.random() < 0.5 ? p.w.secondary : '#ffffff',
            drag: 0.99,
          });
        }
      }
      if (p.kind === 'fire' && Math.random() < dt * 90) {
        this.ps.spawn({
          kind: 'flame',
          x: p.x - Math.cos(p.ang) * rand(0, 30),
          y: p.y - Math.sin(p.ang) * rand(0, 30),
          vx: rand(-60, 60) - Math.cos(p.ang) * 60,
          vy: rand(-80, 20),
          life: rand(0.2, 0.5),
          max: 0.5,
          size: rand(8, 18),
          color: '#ff7a18',
          drag: 0.93,
          grav: -60,
        });
        if (Math.random() < 0.4)
          this.ps.spawn({
            kind: 'ember',
            x: p.x,
            y: p.y,
            vx: rand(-90, 90),
            vy: rand(-120, 30),
            life: rand(0.4, 1),
            max: 1,
            size: rand(1.4, 3),
            color: '#ffd24a',
            grav: 240,
          });
      }
      if (p.kind === 'plasma' && Math.random() < dt * 40) {
        this.ps.spawn({
          kind: 'glow',
          x: p.x,
          y: p.y,
          vx: rand(-40, 40),
          vy: rand(-40, 40),
          life: 0.22,
          max: 0.22,
          size: rand(6, 13),
          color: p.w.primary,
        });
      }
      if (p.kind === 'orb' && Math.random() < dt * 75) {
        this.ps.spawn({
          kind: 'glow',
          x: p.x + rand(-8, 8),
          y: p.y + rand(-8, 8),
          vx: rand(-80, 40) - Math.cos(p.ang) * 140,
          vy: rand(-80, 80),
          life: 0.26,
          max: 0.26,
          size: rand(9, 19),
          color: Math.random() < 0.4 ? '#ffffff' : p.w.primary,
        });
        if (Math.random() < 0.55) {
          this.ps.spawn({
            kind: 'spark',
            x: p.x,
            y: p.y,
            vx: -Math.cos(p.ang) * rand(180, 520) + rand(-120, 120),
            vy: rand(-180, 180),
            life: rand(0.14, 0.28),
            max: 0.28,
            size: rand(12, 24),
            size2: rand(1.6, 2.8),
            color: Math.random() < 0.5 ? '#ffffff' : p.w.primary,
            drag: 0.92,
          });
        }
      }
      // collision with wheel
      const dxc = p.x - wl.x;
      const dyc = p.y - wl.y;
      if (wl.alive && dxc * dxc + dyc * dyc <= wl.r * wl.r) {
        this.hitWheel(p);
        continue;
      }
      if (p.x > VW + 60 || p.y > VH + 60 || p.y < -80 || p.t > 4) p.dead = true;
      if (p.dead) this.projs.splice(i, 1);
    }

    // ---- sword melee contact
    if (w.mode === 'melee' && this.swing > 0.12 && this.swing < 0.55 && !this.swingHit && wl.alive) {
      const c = this.muz;
      const dist = Math.hypot(wl.x - c.mx, wl.y - c.my);
      if (dist - wl.r < 900) {
        this.swingHit = true;
        const a = Math.atan2(wl.y - c.my, wl.x - c.mx);
        const ix = c.mx + Math.cos(a) * (dist - wl.r - 4);
        const iy = c.my + Math.sin(a) * (dist - wl.r - 4);
        this.applyDamage(w.damage, ix, iy, a, true);
        impactFX(this.ps, w, ix, iy, a, 1);
        sfx.impact(w.impact);
        this.addMolten(Math.atan2(iy - wl.y, ix - wl.x) - wl.angle, w.primary, 0.9);
        this.shake = Math.max(this.shake, w.shake);
        for (let i = 0; i < 3; i++)
          this.ps.spawn({
            kind: 'slash',
            x: ix,
            y: iy,
            rot: a + rand(-0.5, 0.5),
            size: 14,
            size2: 1.4,
            data: 80 + i * 22,
            life: 0.3,
            max: 0.3,
            color: i ? '#ffffff' : w.primary,
          });
      }
    }

    this.ps.update(dt);
    this.notify();
  }

  private addMolten(rel: number, color: string, amount: number) {
    const w = 0.1;
    for (const m of this.molten) {
      if (Math.abs(m.a0 - rel) < 0.35 || Math.abs(m.a1 - rel) < 0.35) {
        m.a0 = Math.min(m.a0, rel - w);
        m.a1 = Math.max(m.a1, rel + w);
        m.heat = Math.min(1.6, m.heat + amount);
        m.color = color;
        return;
      }
    }
    this.molten.push({ a0: rel - w, a1: rel + w, heat: amount, color });
  }

  private hitWheel(p: Proj) {
    const wl = this.wheel;
    const ang = Math.atan2(p.y - wl.y, p.x - wl.x);
    if (p.kind === 'disc') {
      this.applyDamage(p.w.damage, p.x, p.y, ang, true);
      impactFX(this.ps, p.w, p.x, p.y, ang, 0.9);
      sfx.impact(p.w.impact);
      this.addMolten(ang - wl.angle, p.w.primary, 0.7);
      p.stuck = 0.2;
      p.rel = ang - wl.angle;
      this.shake = Math.max(this.shake, p.w.shake);
      this.dirty = true;
      return;
    }
    // knife-hit style clash test
    const minGap = 0.2;
    for (const s of this.stuck) {
      const d = Math.abs(((ang - wl.angle - s.rel + Math.PI * 3) % TAU) - Math.PI);
      if (d < minGap && s.group !== p.group) {
        // CLASH!
        this.stats.clashes += 1;
        this.stats.combo = 0;
        wl.shake = 1;
        this.shake = Math.max(this.shake, 14);
        sfx.clash();
        this.ps.spawn({ kind: 'text', x: p.x, y: p.y - 30, vx: 0, vy: -60, life: 0.9, max: 0.9, size: 30, color: '#ff5b5b', text: 'CLASH!', add: false });
        impactFX(this.ps, { ...p.w, impact: 'metal' }, p.x, p.y, ang, 1.2);
        for (let i = 0; i < 2; i++) {
          const a2 = wl.angle + s.rel;
          this.ps.spawn({
            kind: 'debris',
            x: wl.x + Math.cos(a2) * wl.r,
            y: wl.y + Math.sin(a2) * wl.r,
            vx: Math.cos(a2) * rand(260, 520) - 120,
            vy: Math.sin(a2) * rand(260, 520) - 260,
            rot: a2 + Math.PI,
            vrot: rand(-18, 18),
            life: 1.3,
            max: 1.3,
            size: 8,
            color: '#cfd6de',
            grav: 820,
            add: false,
          });
        }
        this.stuck = this.stuck.filter((x) => x !== s);
        p.dead = true;
        this.dirty = true;
        return;
      }
    }
    // stick
    const embed = p.w.embed;
      if (!STICKS.includes(p.kind)) {
      const big = ['caster', 'sniper', 'singularity', 'railgun', 'nanite', 'chrono'].includes(p.w.id);
      const tier = p.chargeTier ?? 0;
      const dmg = p.w.id === 'buster' ? (tier === 0 ? 15 : tier === 1 ? 42 : tier === 2 ? 84 : 170) : p.w.damage;
      this.applyDamage(dmg, p.x, p.y, ang, big || (p.w.id === 'buster' && tier >= 2));
      if (p.w.id === 'nanite') this.hatchNanites(ang - wl.angle, 26);
      if (p.w.id === 'chrono') this.timeCrack(0.6);
      /* molecular acid splashes and keeps eating */
      if (p.w.id === 'acid') {
        for (let k = 0; k < 3; k++) {
          this.acidPools.push({
            rel: ang - wl.angle + rand(-0.3, 0.3),
            size: rand(4, 8),
            life: rand(2.4, 4),
            max: 4,
          });
        }
        if (this.acidPools.length > 26) this.acidPools.splice(0, this.acidPools.length - 26);
      }
      /* wavefunction collapse: the echoes snap inward then wink out */
      if (p.ghosts.length) {
        for (let i = 0; i < p.ghosts.length; i++) {
          const g = p.ghosts[i];
          const col = i === 1 ? p.w.secondary : p.w.primary;
          this.ps.spawn({ kind: 'ghost', x: g.x, y: g.y, rot: rand(0, TAU), size: 20, color: col, data: 1.4, life: 0.34, max: 0.34 });
          this.ps.spawn({ kind: 'flash', x: g.x, y: g.y, size: 54, life: 0.1, max: 0.1, color: '#ffffff' });
          for (let k = 0; k < 5; k++) {
            const a = rand(0, TAU);
            this.ps.spawn({
              kind: 'streak',
              x: g.x,
              y: g.y,
              vx: Math.cos(a) * rand(300, 800),
              vy: Math.sin(a) * rand(300, 800),
              rot: a,
              size: rand(26, 62),
              size2: rand(1.4, 2.6),
              life: rand(0.14, 0.3),
              max: 0.3,
              color: col,
              drag: 0.97,
            });
          }
        }
        // small screen pop for the collapse
        this.shake = Math.max(this.shake, 6);
      }
      impactFX(this.ps, p.w, p.x, p.y, ang, p.w.id === 'buster' ? 1 + tier * 0.42 : 1);
      sfx.impact(p.w.impact, this.stats.combo);
      this.shake = Math.max(this.shake, p.w.id === 'buster' ? p.w.shake * (1 + tier * 0.9) : p.w.shake * 0.5);
      if (p.w.impact === 'fire' || p.w.impact === 'laser' || p.w.impact === 'heavy' || p.w.impact === 'rail') {
        this.addMolten(ang - wl.angle, p.w.primary, p.w.impact === 'heavy' ? 1.25 : 0.85);
      }
      if (p.w.impact === 'heavy') {
        this.decal.push({ rel: ang - wl.angle, r: this.wheel.r - 10, size: 12, heat: 1.2, color: p.w.primary });
      }
      p.dead = true;
      this.shake = Math.max(this.shake, p.w.shake * 0.5);
      this.dirty = true;
      return;
    }
    this.stuck.push({
      rel: ang - wl.angle,
      kind: p.kind,
      color: p.w.primary,
      embed,
      wob: 1,
      w: p.w,
      t: 0,
      group: p.group,
    });
    if (this.stuck.length > 34) this.stuck.shift();
    this.applyDamage(p.w.damage, p.x, p.y, ang, p.w.id === 'sniper' || p.w.id === 'caster' || p.w.pellets > 4);
    impactFX(this.ps, p.w, p.x, p.y, ang, p.w.pellets > 1 ? 0.7 : 1);
    sfx.impact(p.w.impact);
    if (p.w.impact === 'fire' || p.w.impact === 'laser') this.addMolten(ang - wl.angle, p.w.primary, 0.8);
    this.addDecal(ang - wl.angle, p.w.embed * 0.42 + 3.5, p.w.primary);
    p.dead = true;
    this.shake = Math.max(this.shake, p.w.shake * 0.5);
    this.dirty = true;
  }

  /** grow a frost patch at this rim angle */
  private addFrost(rel: number) {
    const w = 0.12;
    for (const f of this.frost) {
      if (Math.abs(f.rel - rel) < 0.42) {
        f.a0 = Math.min(f.a0, rel - w);
        f.a1 = Math.max(f.a1, rel + w);
        f.life = Math.min(2.2, f.life + 0.2);
        return;
      }
    }
    this.frost.push({ rel, a0: rel - w, a1: rel + w, life: 1.2 });
    if (this.frost.length > 40) this.frost.shift();
  }

  private addDecal(rel: number, size: number, color: string) {
    if (!STICKS.includes(this.w.proj)) return;
    this.decal.push({ rel, r: this.wheel.r - 4 - size * 0.4, size, heat: 1, color });
    if (this.decal.length > 46) this.decal.shift();
  }

  /* ----------------------------------------------------------- RENDER */
  render() {
    const ctx = this.ctx;
    ctx.save();
    const sh = this.shake;
    if (sh > 0.2) {
      ctx.translate(rand(-sh, sh) * 0.6, rand(-sh, sh) * 0.6);
      ctx.rotate(rand(-sh, sh) * 0.0008);
    }
    this.drawBg(ctx);
    this.drawGuide(ctx);
    this.drawReflection(ctx);
    this.drawFloorFog(ctx);
    this.drawWheel(ctx);
    this.drawProjectiles(ctx);
    this.ps.draw(ctx);
    this.drawBeams(ctx);
    this.drawWeapon(ctx);
    ctx.restore();

    // ---- post: bloom, flash, vignette, grain
    this.applyBloom(ctx);
    if (this.flash > 0.01) {
      ctx.fillStyle = `rgba(255,255,255,${this.flash * 0.4})`;
      ctx.fillRect(0, 0, VW, VH);
    }
    const vg = ctx.createRadialGradient(VW / 2, VH / 2 - 40, 240, VW / 2, VH / 2, 860);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(0.6, 'rgba(0,0,0,0.18)');
    vg.addColorStop(1, 'rgba(0,0,0,0.62)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, VW, VH);
    // animated film grain
    ctx.save();
    ctx.globalCompositeOperation = 'overlay';
    ctx.globalAlpha = 0.5;
    const gx = -Math.random() * this.grain.width;
    const gy = -Math.random() * this.grain.height;
    for (let y = gy; y < VH; y += this.grain.height)
      for (let x = gx; x < VW; x += this.grain.width) ctx.drawImage(this.grain, x, y);
    ctx.restore();
    if (this.slowmo) {
      ctx.fillStyle = 'rgba(70,150,255,0.06)';
      ctx.fillRect(0, 0, VW, VH);
    }
    // cryo frost creeping in from the screen edges as the wheel freezes
    if (this.freeze > 0.04) {
      const k = this.freeze;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const fg = ctx.createRadialGradient(VW / 2, VH / 2, 300, VW / 2, VH / 2, 900);
      fg.addColorStop(0, 'rgba(159,230,255,0)');
      fg.addColorStop(1, `rgba(200,240,255,${0.2 * k})`);
      ctx.fillStyle = fg;
      ctx.fillRect(0, 0, VW, VH);
      // ice crystals growing in from the frame
      ctx.strokeStyle = `rgba(240,251,255,${0.22 * k})`;
      ctx.lineWidth = 2;
      for (let i = 0; i < 14; i++) {
        const side = i % 4;
        const bx = side === 0 ? 0 : side === 1 ? VW : (i * 197) % VW;
        const by = side === 2 ? 0 : side === 3 ? VH : (i * 143) % VH;
        const a = (i / 14) * TAU;
        const L = 40 + (i % 5) * 26 * k;
        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.lineTo(bx + Math.cos(a) * L, by + Math.sin(a) * L);
        ctx.moveTo(bx + Math.cos(a) * L * 0.45, by + Math.sin(a) * L * 0.45);
        ctx.lineTo(bx + Math.cos(a) * L * 0.45 + Math.cos(a + 0.9) * L * 0.28, by + Math.sin(a) * L * 0.45 + Math.sin(a + 0.9) * L * 0.28);
        ctx.stroke();
      }
      ctx.restore();
    }
    // chrono crack: golden time-shear overlay + edge streaks
    if (this.stutterT > 0) {
      const k = clamp(this.stutterT / 0.6, 0, 1);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = `rgba(255,204,77,${0.07 * k})`;
      ctx.fillRect(0, 0, VW, VH);
      // horizontal time-shear bands
      for (let i = 0; i < 9; i++) {
        const y = ((i * 91 + this.time * 340) % VH + VH) % VH;
        ctx.fillStyle = hexA(i % 2 ? '#ffcc4d' : '#5fe6d0', 0.05 * k);
        ctx.fillRect(0, y, VW, 2 + (i % 3));
      }
      ctx.restore();
    }
  }

  /** master toggle for the expensive post FX */
  fxHigh = true;
  /** browsers without CanvasRenderingContext2D.filter (old Safari) get a softer, cheaper bloom */
  private readonly filterOK = (() => {
    const c = document.createElement('canvas').getContext('2d');
    return !!c && 'filter' in c;
  })();

  /** two-scale gaussian-ish bloom (downsample + blur + additive re-composite) */
  private applyBloom(ctx: CanvasRenderingContext2D) {
    const { bA, bB, bC, bD } = this;
    if (!this.fxHigh || !this.filterOK) {
      const ca = bA.getContext('2d')!;
      ca.clearRect(0, 0, bA.width, bA.height);
      ca.drawImage(this.canvas, 0, 0, bA.width, bA.height);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.22;
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(bA, 0, 0, VW, VH);
      ctx.restore();
      return;
    }
    const ca = bA.getContext('2d')!;
    const cb = bB.getContext('2d')!;
    const cc = bC.getContext('2d')!;
    const cd = bD.getContext('2d')!;
    ca.clearRect(0, 0, bA.width, bA.height);
    ca.drawImage(this.canvas, 0, 0, bA.width, bA.height);
    cb.clearRect(0, 0, bB.width, bB.height);
    cb.filter = 'contrast(1.85) brightness(1.08) blur(3px)';
    cb.drawImage(bA, 0, 0, bB.width, bB.height);
    cb.filter = 'none';
    if (!this.fxHigh) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.32;
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(bB, 0, 0, VW, VH);
      ctx.restore();
      return;
    }
    cc.clearRect(0, 0, bC.width, bC.height);
    cc.drawImage(this.canvas, 0, 0, bC.width, bC.height);
    cd.clearRect(0, 0, bD.width, bD.height);
    cd.filter = 'contrast(2.1) brightness(1.15) blur(5px)';
    cd.drawImage(bC, 0, 0, bD.width, bD.height);
    cd.filter = 'none';
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.imageSmoothingEnabled = true;
    ctx.globalAlpha = 0.48;
    ctx.drawImage(bB, 0, 0, VW, VH);
    ctx.globalAlpha = 0.4;
    ctx.drawImage(bD, 0, 0, VW, VH);
    ctx.restore();
  }

  /** mirrored, perspective-squashed wheel reflection in the wet floor */
  private drawReflection(ctx: CanvasRenderingContext2D) {
    const F = VH - 72;
    const r = this.refl;
    const rc = r.getContext('2d')!;
    const sc = 0.5;
    rc.setTransform(1, 0, 0, 1, 0, 0);
    rc.clearRect(0, 0, r.width, r.height);
    rc.setTransform(sc, 0, 0, sc, 0, 0);
    rc.translate(0, F);
    rc.scale(1, -0.34);
    rc.translate(0, -F);
    this.drawWheel(rc, true);
    rc.setTransform(1, 0, 0, 1, 0, 0);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.3;
    ctx.drawImage(r, 0, 0, r.width, r.height, 0, F, VW, r.height / sc);
    ctx.restore();
  }

  /** floor shading that fades the reflection and grounds the objects */
  private drawFloorFog(ctx: CanvasRenderingContext2D) {
    const F = VH - 72;
    const g = ctx.createLinearGradient(0, F - 6, 0, VH);
    g.addColorStop(0, 'rgba(6,9,15,0.1)');
    g.addColorStop(0.35, 'rgba(5,7,12,0.72)');
    g.addColorStop(1, 'rgba(3,4,8,0.98)');
    ctx.fillStyle = g;
    ctx.fillRect(0, F - 6, VW, VH - F + 6);
    // sheen highlight along the floor line
    const sh = ctx.createLinearGradient(0, F - 3, 0, F + 26);
    sh.addColorStop(0, hexA(this.w.primary, 0.1));
    sh.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = sh;
    ctx.fillRect(0, F - 3, VW, 30);
    // hazard chevrons
    ctx.save();
    ctx.globalAlpha = 0.13;
    ctx.strokeStyle = '#ffbe3d';
    ctx.lineWidth = 5;
    for (let x = -40; x < VW + 60; x += 46) {
      ctx.beginPath();
      ctx.moveTo(x, VH - 8);
      ctx.lineTo(x + 20, VH - 30);
      ctx.stroke();
    }
    ctx.restore();
    // drifting atmospheric dust
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const m of this.motes) {
      m.p += 0.008;
      m.x += Math.sin(m.p + m.z * 6) * 0.16 * m.z;
      m.y -= 0.06 * m.z + 0.02;
      if (m.y < -10) {
        m.y = VH + 10;
        m.x = rand(0, VW);
      }
      if (m.x < -10) m.x = VW + 10;
      if (m.x > VW + 10) m.x = -10;
      const a = 0.05 + 0.09 * m.z;
      const g2 = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, m.s * 5);
      g2.addColorStop(0, hexA('#dceaff', a));
      g2.addColorStop(1, 'rgba(220,234,255,0)');
      ctx.fillStyle = g2;
      ctx.beginPath();
      ctx.arc(m.x, m.y, m.s * 5, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  private drawBg(ctx: CanvasRenderingContext2D) {
    const F = VH - 72;
    /* ---- deep hangar gradient ---- */
    const g = ctx.createLinearGradient(0, 0, 0, VH);
    g.addColorStop(0, '#04060c');
    g.addColorStop(0.42, '#0a1120');
    g.addColorStop(0.78, '#080d17');
    g.addColorStop(1, '#03040a');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, VW, VH);

    /* ---- ceiling light banks (with volumetric cones) ---- */
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const lx of [190, 640, 1090]) {
      const flick = 0.86 + 0.14 * Math.sin(this.time * 0.7 + lx);
      const lg = ctx.createLinearGradient(lx, 0, lx, F);
      lg.addColorStop(0, `rgba(190,220,255,${0.1 * flick})`);
      lg.addColorStop(0.55, `rgba(150,190,240,${0.035 * flick})`);
      lg.addColorStop(1, 'rgba(120,170,230,0)');
      ctx.fillStyle = lg;
      ctx.beginPath();
      ctx.moveTo(lx - 62, -10);
      ctx.lineTo(lx + 62, -10);
      ctx.lineTo(lx + 250, F);
      ctx.lineTo(lx - 250, F);
      ctx.closePath();
      ctx.fill();
      // fixture
      ctx.fillStyle = `rgba(225,240,255,${0.75 * flick})`;
      ctx.fillRect(lx - 54, 6, 108, 7);
      const fg = ctx.createRadialGradient(lx, 10, 0, lx, 10, 120);
      fg.addColorStop(0, `rgba(220,238,255,${0.5 * flick})`);
      fg.addColorStop(1, 'rgba(200,225,255,0)');
      ctx.fillStyle = fg;
      ctx.beginPath();
      ctx.arc(lx, 10, 120, 0, TAU);
      ctx.fill();
    }
    ctx.restore();

    /* ---- back wall structure ---- */
    ctx.save();
    ctx.strokeStyle = 'rgba(120,165,215,0.055)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= VW; x += 80) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, F);
    }
    for (let y = 40; y <= F; y += 80) {
      ctx.moveTo(0, y);
      ctx.lineTo(VW, y);
    }
    ctx.stroke();
    // I-beams
    ctx.fillStyle = 'rgba(10,14,22,0.75)';
    ctx.fillRect(0, 96, VW, 12);
    ctx.fillRect(0, 250, VW, 8);
    ctx.fillStyle = 'rgba(140,180,225,0.07)';
    ctx.fillRect(0, 96, VW, 2);
    ctx.fillRect(0, 250, VW, 1.5);
    // vertical pillars
    for (const px of [120, 520, 760, 1160]) {
      ctx.fillStyle = 'rgba(9,12,20,0.6)';
      ctx.fillRect(px, 0, 26, F);
      ctx.fillStyle = 'rgba(150,190,235,0.06)';
      ctx.fillRect(px, 0, 3, F);
    }
    ctx.restore();

    /* ---- key light behind the target ---- */
    const wg = ctx.createRadialGradient(this.wheel.x, this.wheel.y, 20, this.wheel.x, this.wheel.y, 600);
    wg.addColorStop(0, hexA(this.w.primary, 0.16));
    wg.addColorStop(0.45, hexA(this.w.primary, 0.055));
    wg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = wg;
    ctx.fillRect(0, 0, VW, VH);

    /* ---- floor plane ---- */
    const fl = ctx.createLinearGradient(0, F - 40, 0, VH);
    fl.addColorStop(0, 'rgba(26,34,48,0.55)');
    fl.addColorStop(0.4, 'rgba(12,17,26,0.8)');
    fl.addColorStop(1, 'rgba(2,3,7,1)');
    ctx.fillStyle = fl;
    ctx.fillRect(0, F - 40, VW, 112);
    // glowing floor seam
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const seam = ctx.createLinearGradient(0, F - 3, 0, F + 3);
    seam.addColorStop(0, hexA(this.w.primary, 0));
    seam.addColorStop(0.5, hexA(this.w.primary, 0.4));
    seam.addColorStop(1, hexA(this.w.primary, 0));
    ctx.fillStyle = seam;
    ctx.fillRect(0, F - 3, VW, 6);
    ctx.restore();
    ctx.strokeStyle = 'rgba(150,195,240,0.2)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, F - 0.5);
    ctx.lineTo(VW, F - 0.5);
    ctx.stroke();
    // range markings
    ctx.save();
    ctx.strokeStyle = 'rgba(255,196,110,0.14)';
    ctx.setLineDash([30, 24]);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(310, F + 14);
    ctx.lineTo(VW - 40, F + 14);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.font = '700 11px ui-sans-serif, system-ui, sans-serif';
    ctx.fillStyle = 'rgba(255,196,110,0.22)';
    ctx.textAlign = 'left';
    ctx.fillText('FIRING LINE — 25 M', 316, F + 40);
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(150,195,240,0.2)';
    ctx.fillText('BAY 04 · LIVE FIRE', VW - 44, F + 40);
    ctx.restore();
  }

  /** subtle firing-range aim guide from muzzle to target */
  private drawGuide(ctx: CanvasRenderingContext2D) {
    const c = this.muz;
    const wl = this.wheel;
    const x0 = c.mx + 14;
    const x1 = wl.x - wl.r - 26;
    const y = c.my;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createLinearGradient(x0, y, x1, y);
    g.addColorStop(0, hexA(this.w.primary, 0.02));
    g.addColorStop(0.7, hexA(this.w.primary, 0.16));
    g.addColorStop(1, hexA(this.w.primary, 0.03));
    ctx.strokeStyle = g;
    ctx.lineWidth = 2;
    ctx.setLineDash([16, 14]);
    ctx.lineDashOffset = -this.time * 90;
    ctx.beginPath();
    ctx.moveTo(x0, y);
    ctx.lineTo(x1, y);
    ctx.stroke();
    ctx.setLineDash([]);
    // target chevron
    ctx.strokeStyle = hexA(this.w.primary, 0.35);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x1 + 12, y - 12);
    ctx.lineTo(x1 + 22, y);
    ctx.lineTo(x1 + 12, y + 12);
    ctx.stroke();
    ctx.restore();
  }

  private drawWheel(ctx: CanvasRenderingContext2D, reflPass = false) {
    const wl = this.wheel;
    const cx = wl.x + (reflPass ? 0 : rand(-1, 1) * wl.shake * 7);
    const cy = wl.y + (reflPass ? 0 : rand(-1, 1) * wl.shake * 7);
    const r = wl.r;
    ctx.save();
    if (!wl.alive) {
      ctx.globalAlpha = 0.25;
    }
    if (!reflPass) {
      // contact shadow on the floor
      const sg = ctx.createRadialGradient(cx, VH - 68, 4, cx, VH - 68, r * 1.05);
      sg.addColorStop(0, 'rgba(0,0,0,0.66)');
      sg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = sg;
      ctx.beginPath();
      ctx.ellipse(cx, VH - 68, r * 1.05, 30, 0, 0, TAU);
      ctx.fill();
    }
    // back glow
    const bg = ctx.createRadialGradient(cx, cy, r * 0.5, cx, cy, r * 1.5);
    bg.addColorStop(0, hexA(this.w.primary, 0.16));
    bg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 1.5, 0, TAU);
    ctx.fill();

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(wl.angle);

    // body disc
    const body = ctx.createRadialGradient(-r * 0.3, -r * 0.4, 20, 0, 0, r);
    body.addColorStop(0, '#5a6472');
    body.addColorStop(0.55, '#2c333d');
    body.addColorStop(1, '#141920');
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, TAU);
    ctx.fill();

    // segments
    const segs = 12;
    for (let i = 0; i < segs; i++) {
      const a0 = (i / segs) * TAU;
      const a1 = ((i + 1) / segs) * TAU;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, r - 14, a0, a1);
      ctx.closePath();
      ctx.fillStyle = i % 2 ? 'rgba(255,255,255,0.055)' : 'rgba(0,0,0,0.16)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(160,190,220,0.14)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    // concentric rings
    ctx.strokeStyle = 'rgba(180,210,240,0.12)';
    ctx.lineWidth = 3;
    for (const rr2 of [r - 14, r * 0.62, r * 0.3]) {
      ctx.beginPath();
      ctx.arc(0, 0, rr2, 0, TAU);
      ctx.stroke();
    }
    // rim
    const rim = ctx.createLinearGradient(0, -r, 0, r);
    rim.addColorStop(0, '#93a0af');
    rim.addColorStop(0.35, '#3d454f');
    rim.addColorStop(0.6, '#6b7683');
    rim.addColorStop(1, '#191e25');
    ctx.strokeStyle = rim;
    ctx.lineWidth = 20;
    ctx.beginPath();
    ctx.arc(0, 0, r - 8, 0, TAU);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, r - 17, 0, TAU);
    ctx.stroke();
    // bolts
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * TAU;
      const x = Math.cos(a) * (r - 8);
      const y = Math.sin(a) * (r - 8);
      ctx.fillStyle = '#8d98a5';
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, TAU);
      ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.beginPath();
      ctx.arc(x + 1.6, y + 1.6, 3, 0, TAU);
      ctx.fill();
    }
    // persistent impact decals (bullet holes / scorch marks) riding the rim
    for (const d of this.decal) {
      const a = 0.75 * clamp(d.heat, 0, 1);
      ctx.save();
      ctx.rotate(d.rel);
      ctx.translate(d.r, 0);
      // dark hole
      const hg = ctx.createRadialGradient(0, 0, 0, 0, 0, d.size);
      hg.addColorStop(0, `rgba(8,9,12,${a})`);
      hg.addColorStop(0.55, `rgba(24,22,20,${a * 0.7})`);
      hg.addColorStop(1, 'rgba(40,36,32,0)');
      ctx.fillStyle = hg;
      ctx.beginPath();
      ctx.arc(0, 0, d.size, 0, TAU);
      ctx.fill();
      // torn bright lip
      ctx.strokeStyle = hexA(d.color, a * 0.5);
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(0, 0, d.size * 0.72, 0, TAU);
      ctx.stroke();
      ctx.restore();
    }

    // molten marks
    ctx.globalCompositeOperation = 'lighter';
    for (const m of this.molten) {
      const h = clamp(m.heat, 0, 1.6);
      ctx.strokeStyle = hexA(m.color, 0.42 * h);
      ctx.lineWidth = 28 * h;
      ctx.beginPath();
      ctx.arc(0, 0, r - 6, m.a0, m.a1);
      ctx.stroke();
      ctx.strokeStyle = hexA(m.color, 0.3 * h);
      ctx.lineWidth = 48 * h;
      ctx.beginPath();
      ctx.arc(0, 0, r - 6, m.a0, m.a1);
      ctx.stroke();
      ctx.strokeStyle = hexA('#ffffff', 0.55 * h);
      ctx.lineWidth = 8 * h;
      ctx.beginPath();
      ctx.arc(0, 0, r - 4, m.a0, m.a1);
      ctx.stroke();
      if (!reflPass && Math.random() < 0.25 * h) {
        const a = rand(m.a0, m.a1);
        this.ps.spawn({
          kind: 'ember',
          x: Math.cos(a) * (r - 6),
          y: Math.sin(a) * (r - 6),
          vx: rand(-40, 40),
          vy: rand(-30, 30),
          life: rand(0.3, 0.9),
          max: 0.9,
          size: rand(1.2, 2.8),
          color: m.color,
          grav: 120,
        });
      }
    }
    if (wl.hitFlash > 0.01) {
      ctx.strokeStyle = hexA('#ffffff', wl.hitFlash * 0.8);
      ctx.lineWidth = 14;
      ctx.beginPath();
      ctx.arc(0, 0, r - 8, 0, TAU);
      ctx.stroke();
    }
    ctx.globalCompositeOperation = 'source-over';

    // damage cracks
    const dmg = 1 - clamp(wl.hp / wl.maxHp, 0, 1);
    const cracks = Math.floor(dmg * 14);
    ctx.strokeStyle = `rgba(10,12,16,${0.5 + dmg * 0.4})`;
    ctx.lineWidth = 3;
    for (let i = 0; i < cracks; i++) {
      const a = (i / 14) * TAU + 0.3;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * (r - 12), Math.sin(a) * (r - 12));
      ctx.lineTo(Math.cos(a + 0.14) * (r * 0.55), Math.sin(a + 0.14) * (r * 0.55));
      ctx.lineTo(Math.cos(a - 0.08) * (r * 0.34), Math.sin(a - 0.08) * (r * 0.34));
      ctx.stroke();
    }
    // hub
    const hub = ctx.createRadialGradient(-14, -16, 4, 0, 0, 54);
    hub.addColorStop(0, '#8f9aa7');
    hub.addColorStop(0.6, '#333b45');
    hub.addColorStop(1, '#12161b');
    ctx.fillStyle = hub;
    ctx.beginPath();
    ctx.arc(0, 0, 50, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = hexA(this.w.primary, 0.9);
    ctx.beginPath();
    ctx.arc(0, 0, 15, 0, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath();
    ctx.arc(0, 0, 6, 0, TAU);
    ctx.fill();

    // acid pools: glossy bubbling craters eating into the metal
    if (this.acidPools.length) {
      for (const a of this.acidPools) {
        const k = clamp(a.life / a.max, 0, 1);
        ctx.save();
        ctx.rotate(a.rel);
        ctx.translate(r - 8, 0);
        // dissolved crater
        const hg = ctx.createRadialGradient(0, 0, 0, 0, 0, a.size * 1.5);
        hg.addColorStop(0, `rgba(10,20,4,${0.85 * k})`);
        hg.addColorStop(0.6, `rgba(30,50,12,${0.6 * k})`);
        hg.addColorStop(1, 'rgba(40,64,16,0)');
        ctx.fillStyle = hg;
        ctx.beginPath();
        ctx.ellipse(0, 0, a.size * 1.5, a.size * 1.15, 0, 0, TAU);
        ctx.fill();
        // glowing pool sitting in the crater
        ctx.globalCompositeOperation = 'lighter';
        const wob = 1 + Math.sin(this.time * 9 + a.rel * 7) * 0.12;
        const pg = ctx.createRadialGradient(0, 0, 0, 0, 0, a.size * wob);
        pg.addColorStop(0, `rgba(244,255,208,${0.9 * k})`);
        pg.addColorStop(0.35, hexA(this.w.primary, 0.8 * k));
        pg.addColorStop(0.75, hexA('#5c9e12', 0.5 * k));
        pg.addColorStop(1, hexA(this.w.primary, 0));
        ctx.fillStyle = pg;
        ctx.beginPath();
        ctx.ellipse(0, 0, a.size * wob, a.size * 0.78 * wob, 0, 0, TAU);
        ctx.fill();
        // bright meniscus rim
        ctx.strokeStyle = `rgba(240,255,200,${0.7 * k})`;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.ellipse(0, 0, a.size * wob, a.size * 0.78 * wob, 0, 0, TAU);
        ctx.stroke();
        ctx.globalCompositeOperation = 'source-over';
        // corrosion halo etched into the plate
        ctx.strokeStyle = hexA(this.w.primary, 0.28 * k);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(0, 0, a.size * 2.1, a.size * 1.7, 0, 0, TAU);
        ctx.stroke();
        ctx.restore();
      }
    }

    // cryo frost creeping over the rim
    if (this.frost.length) {
      ctx.save();
      for (const f of this.frost) {
        const a = clamp(f.life, 0, 1);
        // opaque ice shell
        ctx.strokeStyle = `rgba(226,246,255,${0.62 * a})`;
        ctx.lineWidth = 20 * a;
        ctx.beginPath();
        ctx.arc(0, 0, r - 6, f.a0, f.a1);
        ctx.stroke();
        // crystalline sheen
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = hexA('#9fe6ff', 0.5 * a);
        ctx.lineWidth = 30 * a;
        ctx.beginPath();
        ctx.arc(0, 0, r - 6, f.a0, f.a1);
        ctx.stroke();
        ctx.strokeStyle = `rgba(255,255,255,${0.8 * a})`;
        ctx.lineWidth = 5 * a;
        ctx.beginPath();
        ctx.arc(0, 0, r - 4, f.a0, f.a1);
        ctx.stroke();
        ctx.globalCompositeOperation = 'source-over';
        // ice dendrite spikes growing inward
        const mid = (f.a0 + f.a1) * 0.5;
        for (let k = 0; k < 3; k++) {
          const aa = mid + (k - 1) * 0.07;
          const len = 14 + k * 5;
          ctx.strokeStyle = `rgba(240,251,255,${0.8 * a})`;
          ctx.lineWidth = 2.2;
          ctx.beginPath();
          ctx.moveTo(Math.cos(aa) * (r - 14), Math.sin(aa) * (r - 14));
          ctx.lineTo(Math.cos(aa) * (r - 14 - len), Math.sin(aa) * (r - 14 - len));
          ctx.stroke();
        }
      }
      ctx.restore();
    }

    // live nanite swarm crawling and chewing the rim
    if (this.nanites.length) {
      ctx.globalCompositeOperation = 'lighter';
      for (const n of this.nanites) {
        const a = clamp(n.life / n.max, 0, 1);
        const rad = r - 6;
        ctx.save();
        ctx.rotate(n.rel);
        // chew trail behind it
        ctx.strokeStyle = hexA(n.col, 0.35 * a);
        ctx.lineWidth = n.size * 1.7;
        ctx.beginPath();
        ctx.arc(0, 0, rad, -n.dir * 0.3, 0, n.dir > 0);
        ctx.stroke();
        ctx.strokeStyle = `rgba(255,255,255,${0.6 * a})`;
        ctx.lineWidth = Math.max(0.6, n.size * 0.5);
        ctx.beginPath();
        ctx.arc(0, 0, rad, -n.dir * 0.18, 0, n.dir > 0);
        ctx.stroke();
        // the bot
        const bx = rad;
        const g = ctx.createRadialGradient(bx, 0, 0, bx, 0, n.size * 4.2);
        g.addColorStop(0, `rgba(255,255,255,${0.95 * a})`);
        g.addColorStop(0.3, hexA(n.col, 0.85 * a));
        g.addColorStop(1, hexA(n.col, 0));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(bx, 0, n.size * 4.2, 0, TAU);
        ctx.fill();
        // hex chassis outline
        ctx.strokeStyle = `rgba(255,255,255,${0.8 * a})`;
        ctx.lineWidth = 0.9;
        ctx.beginPath();
        for (let k = 0; k < 6; k++) {
          const aa = (k / 6) * TAU + this.time * 6;
          const rr3 = n.size * 1.7;
          if (k === 0) ctx.moveTo(bx + Math.cos(aa) * rr3, Math.sin(aa) * rr3);
          else ctx.lineTo(bx + Math.cos(aa) * rr3, Math.sin(aa) * rr3);
        }
        ctx.closePath();
        ctx.stroke();
        ctx.restore();
      }
      ctx.globalCompositeOperation = 'source-over';
    }

    // stuck projectiles (rotating with the wheel)
    for (const s of this.stuck) {
      if (reflPass) s.t += 0;
      s.wob = Math.max(0, s.wob - 0.03);
      ctx.save();
      ctx.rotate(s.rel);
      ctx.translate(r - s.embed + 6, 0);
      ctx.rotate(Math.PI + Math.sin(s.t * 26) * 0.09 * s.wob);
      ctx.scale(0.9, 0.9);
      drawProjectile(ctx, s.kind, 0, 0, 0, s.t, s.w, 0);
      ctx.restore();
    }
    ctx.restore();

    if (reflPass) {
      ctx.restore();
      return;
    }
    // level label (screen aligned)
    ctx.font = '900 20px ui-sans-serif, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillText('LEVEL 1', cx, cy + 76);
    // hp ring
    const hpFrac = clamp(wl.hp / wl.maxHp, 0, 1);
    ctx.strokeStyle = 'rgba(255,255,255,0.09)';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(cx, cy, r + 22, -Math.PI / 2, -Math.PI / 2 + TAU);
    ctx.stroke();
    ctx.strokeStyle = hpFrac > 0.4 ? hexA(this.w.primary, 0.85) : '#ff5b5b';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(cx, cy, r + 22, -Math.PI / 2, -Math.PI / 2 + TAU * hpFrac);
    ctx.stroke();
    // cryo freeze indicator ring
    if (this.freeze > 0.02) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = `rgba(226,246,255,${0.35 + 0.5 * this.freeze})`;
      ctx.lineWidth = 4;
      ctx.setLineDash([7, 9]);
      ctx.beginPath();
      ctx.arc(cx, cy, r + 34, -Math.PI / 2, -Math.PI / 2 + TAU * this.freeze);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
      ctx.font = '900 15px ui-sans-serif, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = `rgba(226,246,255,${0.55 + 0.4 * this.freeze})`;
      ctx.fillText(`FROZEN ${Math.round(this.freeze * 100)}%`, cx, cy - r - 40);
    }
    ctx.restore();
  }

  private drawProjectiles(ctx: CanvasRenderingContext2D) {
    for (const p of this.projs) {
      // quantum superposition echoes
      if (p.ghosts.length && !p.returning) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        p.ghosts.forEach((g, i) => {
          const col = i === 1 ? p.w.secondary : p.w.primary;
          const a = 0.34 + 0.26 * Math.sin(g.phase * 2);
          const rg = ctx.createRadialGradient(g.x, g.y, 0, g.x, g.y, 26);
          rg.addColorStop(0, hexA(col, a));
          rg.addColorStop(0.45, hexA(col, a * 0.35));
          rg.addColorStop(1, hexA(col, 0));
          ctx.fillStyle = rg;
          ctx.beginPath();
          ctx.arc(g.x, g.y, 26, 0, TAU);
          ctx.fill();
          ctx.strokeStyle = hexA(col, a + 0.25);
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.ellipse(g.x, g.y, 9, 12, g.phase, 0, TAU);
          ctx.stroke();
        });
        // entanglement threads back to the real qubit
        ctx.strokeStyle = hexA(p.w.primary, 0.3);
        ctx.setLineDash([3, 5]);
        ctx.lineWidth = 1;
        for (const g of p.ghosts) {
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(g.x, g.y);
          ctx.stroke();
        }
        ctx.setLineDash([]);
        ctx.restore();
      }
      const n = p.trail.length / 2;
      if (n >= 3) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.lineCap = 'round';
        const speed = Math.hypot(p.vx, p.vy);
        // outer soft ribbon
        for (let pass = 0; pass < 2; pass++) {
          ctx.beginPath();
          for (let i = 0; i < n; i++) {
            const x = p.trail[i * 2];
            const y = p.trail[i * 2 + 1];
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.lineTo(p.x, p.y);
          const grd = ctx.createLinearGradient(p.trail[0], p.trail[1], p.x, p.y);
          grd.addColorStop(0, hexA(p.w.primary, 0));
          grd.addColorStop(0.6, hexA(p.w.primary, (pass ? 0.14 : 0.34) * clamp(speed / 900, 0.25, 1)));
          grd.addColorStop(1, hexA(pass ? '#ffffff' : p.w.primary, pass ? 0.5 : 0.7));
          ctx.strokeStyle = grd;
          ctx.lineWidth = pass ? 3 : 11;
          ctx.stroke();
        }
        ctx.restore();
      }
      drawProjectile(ctx, p.kind, p.x, p.y, p.ang, p.t, p.w);
    }
  }

  private drawBeams(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const b of this.beams) {
      const life = b.max < 900 ? 1 - b.t / b.max : 1;
      const w = b.w;
      const ox = b.ox;
      const oy = b.oy;
      const ang = b.ang;
      const len = b.len;
      const dx = Math.cos(ang);
      const dy = Math.sin(ang);
      const px = -dy;
      const py = dx;

      const width = (w.beamWidth ?? 10) * (0.75 + 0.25 * Math.sin(this.time * 30));
      ctx.lineCap = 'round';

      if (w.id === 'phaser') {
        // travelling bulge, classic TNG sweep
        const N = 26;
        for (let pass = 0; pass < 2; pass++) {
          ctx.beginPath();
          for (let i = 0; i <= N; i++) {
            const f = i / N;
            const bulge = Math.exp(-Math.pow((f - ((this.time * 1.6) % 1.3)) * 4.2, 2));
            const env = Math.sin(Math.PI * clamp(f * 1.05, 0, 1));
            const off = Math.sin(f * 16 - this.time * 9) * 3 * env + bulge * 6;
            const wd = (width * (0.55 + bulge * 0.9) * env + 2) * (pass ? 0.45 : 1);
            const cxp = ox + dx * len * f + px * off;
            const cyp = oy + dy * len * f + py * off;
            if (i === 0) ctx.moveTo(cxp + px * wd, cyp + py * wd);
            else ctx.lineTo(cxp + px * wd, cyp + py * wd);
          }
          for (let i = N; i >= 0; i--) {
            const f = i / N;
            const bulge = Math.exp(-Math.pow((f - ((this.time * 1.6) % 1.3)) * 4.2, 2));
            const env = Math.sin(Math.PI * clamp(f * 1.05, 0, 1));
            const wd = (width * (0.55 + bulge * 0.9) * env + 2) * (pass ? 0.45 : 1);
            ctx.lineTo(ox + dx * len * f - px * wd, oy + dy * len * f - py * wd);
          }
          ctx.closePath();
          const g = ctx.createLinearGradient(ox, oy, ox + dx * len, oy + dy * len);
          g.addColorStop(0, hexA('#ffd9c8', 0.9 * life));
          g.addColorStop(0.4, hexA(w.primary, 0.85 * life));
          g.addColorStop(1, hexA('#ff2a00', 0.6 * life));
          ctx.fillStyle = g;
          ctx.fill();
        }
      } else if (w.id === 'proton') {
        // wavy particle ribbon with bright nodes
        const N = 60;
        for (let pass = 0; pass < 3; pass++) {
          ctx.beginPath();
          for (let i = 0; i <= N; i++) {
            const f = i / N;
            const env = Math.sin(Math.PI * clamp(f, 0, 1));
            const amp = (16 + pass * 9) * env;
            const off = Math.sin(f * (w.waves ?? 7) * TAU - this.time * 16) * amp;
            const cxp = ox + dx * len * f + px * off;
            const cyp = oy + dy * len * f + py * off;
            if (i === 0) ctx.moveTo(cxp, cyp);
            else ctx.lineTo(cxp, cyp);
          }
          ctx.strokeStyle = hexA(pass === 2 ? '#fff3c8' : pass === 1 ? '#ff8a1e' : '#ff3b12', (pass === 2 ? 0.55 : 0.4) * life);
          ctx.lineWidth = (pass === 2 ? 6 : 16 - pass * 5) * (0.8 + 0.2 * Math.sin(this.time * 20));
          ctx.stroke();
        }
        for (let i = 0; i < 7; i++) {
          const f = ((this.time * 1.9 + i / 7) % 1);
          const env = Math.sin(Math.PI * f);
          const off = Math.sin(f * (w.waves ?? 7) * TAU - this.time * 16) * 16 * env;
          const cxp = ox + dx * len * f + px * off;
          const cyp = oy + dy * len * f + py * off;
          const g = ctx.createRadialGradient(cxp, cyp, 0, cxp, cyp, 26 * env);
          g.addColorStop(0, `rgba(255,255,240,${0.9 * life})`);
          g.addColorStop(0.4, hexA('#ff8a1e', 0.7 * life));
          g.addColorStop(1, 'rgba(255,80,0,0)');
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(cxp, cyp, 26 * env, 0, TAU);
          ctx.fill();
        }
      } else if (w.id === 'tripod') {
        /* heat ray: searing white core in a boiling blue sheath with a
           heat-haze wake and vaporising blobs racing down it */
        const N = 30;
        const pts: number[][] = [];
        for (let i = 0; i <= N; i++) {
          const f = i / N;
          const env = Math.sin(Math.PI * clamp(f * 1.04, 0, 1));
          const hz = Math.sin(f * 26 - this.time * 30) * 6 * env;
          pts.push([ox + dx * len * f + px * hz, oy + dy * len * f + py * hz]);
        }
        ctx.lineCap = 'round';
        const tpath = (wd: number, col: string, a: number) => {
          ctx.beginPath();
          ctx.moveTo(pts[0][0], pts[0][1]);
          for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
          ctx.strokeStyle = hexA(col, a * life);
          ctx.lineWidth = wd * (0.86 + 0.14 * Math.sin(this.time * 42));
          ctx.stroke();
        };
        tpath(width * 3.6, '#5c8cb8', 0.13);
        tpath(width * 2.2, '#8fc4e8', 0.24);
        tpath(width * 1.2, '#dff3ff', 0.5);
        for (let pass = 0; pass < 2; pass++) {
          ctx.beginPath();
          ctx.moveTo(pts[0][0] + rand(-2, 2), pts[0][1] + rand(-2, 2));
          for (let i = 1; i <= N; i++) {
            const j = (Math.random() - 0.5) * (pass ? 3 : 7);
            ctx.lineTo(pts[i][0] + px * j, pts[i][1] + py * j);
          }
          ctx.strokeStyle = hexA(pass ? '#dff3ff' : '#ffffff', (pass ? 0.7 : 0.95) * life);
          ctx.lineWidth = pass ? width * 0.6 : Math.max(2, width * 0.3);
          ctx.stroke();
        }
        for (let k = 0; k < 5; k++) {
          const f = (this.time * 3.2 + k / 5) % 1;
          const idx = Math.floor(f * N);
          const [vx2, vy2] = pts[idx];
          const rr2 = 14 * (1 - f * 0.4);
          const g2 = ctx.createRadialGradient(vx2, vy2, 0, vx2, vy2, rr2 * 2.2);
          g2.addColorStop(0, `rgba(255,255,255,${0.95 * life})`);
          g2.addColorStop(0.35, hexA('#dff3ff', 0.7 * life));
          g2.addColorStop(1, hexA('#bfe4ff', 0));
          ctx.fillStyle = g2;
          ctx.beginPath();
          ctx.arc(vx2, vy2, rr2 * 2.2, 0, TAU);
          ctx.fill();
        }
      } else if (w.id === 'tesla') {
        /* forked lightning: jagged main channel + random side branches */
        const N = 46;
        const wig = (f: number) => Math.sin(f * 21 - this.time * 26) * 15 * (0.35 + f);
        const pts: number[][] = [];
        for (let i = 0; i <= N; i++) {
          const f = i / N;
          const off = wig(f);
          pts.push([ox + dx * len * f + px * off, oy + dy * len * f + py * off]);
        }
        const drawPath = (p: number[][], wdt: number, col: string, a: number) => {
          ctx.beginPath();
          ctx.moveTo(p[0][0], p[0][1]);
          for (let i = 1; i < p.length; i++) ctx.lineTo(p[i][0], p[i][1]);
          ctx.strokeStyle = hexA(col, a * life);
          ctx.lineWidth = wdt;
          ctx.lineJoin = 'round';
          ctx.stroke();
        };
        // wide soft corona
        for (let pass = 0; pass < 3; pass++) {
          const jit = pts.map(([qx, qy]) => [qx + rand(-9, 9), qy + rand(-9, 9)]);
          drawPath(jit, width * (3.4 - pass * 0.9), pass === 2 ? '#ffffff' : w.primary, pass === 2 ? 0.5 : 0.2);
        }
        // crisp white core
        drawPath(pts, Math.max(1.6, width * 0.26), '#ffffff', 0.95);
        // random forks leaving the main channel
        const forks = 4;
        for (let k = 0; k < forks; k++) {
          const start = Math.floor(rand(0.15, 0.9) * N);
          const [fx, fy] = pts[start];
          const fa = ang + rand(-1.5, 1.5);
          const fl = rand(40, 130);
          const fp: number[][] = [[fx, fy]];
          for (let i2 = 1; i2 <= 4; i2++) {
            const f = i2 / 4;
            fp.push([fx + Math.cos(fa) * fl * f + rand(-10, 10), fy + Math.sin(fa) * fl * f + rand(-10, 10)]);
          }
          drawPath(fp, Math.max(1, width * 0.16), k % 2 ? '#ffffff' : w.secondary, 0.75);
        }
        // travelling bright packets along the channel
        for (let k = 0; k < 5; k++) {
          const f = (this.time * 4.5 + k / 5) % 1;
          const idx = Math.floor(f * N);
          const [qx, qy] = pts[idx];
          const g = ctx.createRadialGradient(qx, qy, 0, qx, qy, 24);
          g.addColorStop(0, 'rgba(255,255,255,.95)');
          g.addColorStop(0.35, hexA(w.primary, 0.7));
          g.addColorStop(1, hexA(w.primary, 0));
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(qx, qy, 24, 0, TAU);
          ctx.fill();
        }
      } else if (w.id === 'prism') {
        /* seven spectral beams diverge from the prism array and
           reconverge on the impact point, overlapping into white */
        const SPECT = ['#ff2d55', '#ff9500', '#ffe600', '#5cff6b', '#2de1ff', '#4a6bff', '#b14aff'];
        const ix = b.ix;
        const iy = b.iy;
        ctx.lineCap = 'round';
        // white master lance underneath
        const mg = ctx.createLinearGradient(ox, oy, ix, iy);
        mg.addColorStop(0, 'rgba(255,255,255,.95)');
        mg.addColorStop(0.45, hexA('#ffffff', 0.6 * life));
        mg.addColorStop(1, 'rgba(255,255,255,.2)');
        ctx.strokeStyle = mg;
        ctx.lineWidth = Math.max(1.5, width * 0.9) * life;
        ctx.beginPath();
        ctx.moveTo(ox, oy);
        ctx.lineTo(ix, iy);
        ctx.stroke();
        // each colour takes its own slightly rotated path
        for (let k = 0; k < 7; k++) {
          const off = (k - 3) * 0.055;
          const ca2 = Math.cos(ang + off);
          const sa2 = Math.sin(ang + off);
          const tHit = rayCircle(ox, oy, ca2, sa2, this.wheel.x, this.wheel.y, this.wheel.r);
          const ex = ox + ca2 * (tHit > 0 ? tHit : len);
          const ey = oy + sa2 * (tHit > 0 ? tHit : len);
          const col = SPECT[k];
          for (const [wd, al] of [
            [width * 3.4, 0.16],
            [width * 1.5, 0.42],
            [Math.max(1, width * 0.4), 0.95],
          ] as [number, number][]) {
            const g = ctx.createLinearGradient(ox, oy, ex, ey);
            g.addColorStop(0, hexA(col, 0.1 * al * life));
            g.addColorStop(0.5, hexA(col, al * life));
            g.addColorStop(1, hexA('#ffffff', al * life));
            ctx.strokeStyle = g;
            ctx.lineWidth = Math.max(0.6, wd) * life;
            ctx.beginPath();
            ctx.moveTo(ox, oy);
            ctx.lineTo(ex, ey);
            ctx.stroke();
          }
          // travelling shimmer packet per band
          const f = (this.time * 3.4 + k / 7) % 1;
          const sx = ox + (ex - ox) * f;
          const sy = oy + (ey - oy) * f;
          const sg = ctx.createRadialGradient(sx, sy, 0, sx, sy, 20);
          sg.addColorStop(0, hexA('#ffffff', 0.85 * life));
          sg.addColorStop(0.35, hexA(col, 0.7 * life));
          sg.addColorStop(1, hexA(col, 0));
          ctx.fillStyle = sg;
          ctx.beginPath();
          ctx.arc(sx, sy, 20, 0, TAU);
          ctx.fill();
        }
        // rainbow muzzle fan
        for (let k = 0; k < 7; k++) {
          const a = ang + (k - 3) * 0.09;
          const g = ctx.createLinearGradient(ox, oy, ox + Math.cos(a) * 70, oy + Math.sin(a) * 70);
          g.addColorStop(0, hexA('#ffffff', 0.8 * life));
          g.addColorStop(0.5, hexA(SPECT[k], 0.5 * life));
          g.addColorStop(1, hexA(SPECT[k], 0));
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.moveTo(ox, oy);
          ctx.lineTo(ox + Math.cos(a - 0.05) * 70, oy + Math.sin(a - 0.05) * 70);
          ctx.lineTo(ox + Math.cos(a + 0.05) * 70, oy + Math.sin(a + 0.05) * 70);
          ctx.closePath();
          ctx.fill();
        }
      } else if (w.id === 'cryo') {
        /* cold plasma lance: a white core inside a wide freezing sheath,
           with ice crystals nucleating along its length */
        const N = 26;
        const pts: number[][] = [];
        for (let i = 0; i <= N; i++) {
          const f = i / N;
          const env = Math.sin(Math.PI * clamp(f * 1.04, 0, 1));
          const off = Math.sin(f * 13 - this.time * 7) * 5 * env;
          pts.push([ox + dx * len * f + px * off, oy + dy * len * f + py * off]);
        }
        ctx.lineCap = 'round';
        const path = (wd: number, col: string, a: number) => {
          ctx.beginPath();
          ctx.moveTo(pts[0][0], pts[0][1]);
          for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
          ctx.strokeStyle = hexA(col, a * life);
          ctx.lineWidth = wd;
          ctx.stroke();
        };
        path(width * 5.2, w.primary, 0.14);
        path(width * 2.6, w.primary, 0.4);
        path(width * 1.1, '#ffffff', 0.85);
        // nucleating crystals along the beam
        for (let k = 0; k < 6; k++) {
          const f = ((this.time * 2.2 + k / 6) % 1);
          const idx = Math.floor(f * N);
          const [cx2, cy2] = pts[idx];
          const sz = 4 + f * 9;
          ctx.save();
          ctx.translate(cx2, cy2);
          ctx.rotate(f * 8);
          ctx.strokeStyle = hexA('#ffffff', 0.9 * life * (1 - f * 0.4));
          ctx.lineWidth = 1.4;
          for (let arm = 0; arm < 6; arm++) {
            ctx.save();
            ctx.rotate((arm / 6) * TAU);
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(sz, 0);
            ctx.moveTo(sz * 0.5, 0);
            ctx.lineTo(sz * 0.78, -sz * 0.34);
            ctx.stroke();
            ctx.restore();
          }
          ctx.restore();
        }
        // cold glow at the impact point
        if (b.hit) {
          const ig = ctx.createRadialGradient(b.ix, b.iy, 0, b.ix, b.iy, 70);
          ig.addColorStop(0, `rgba(255,255,255,${0.9 * life})`);
          ig.addColorStop(0.3, hexA(w.primary, 0.7 * life));
          ig.addColorStop(1, hexA(w.primary, 0));
          ctx.fillStyle = ig;
          ctx.beginPath();
          ctx.arc(b.ix, b.iy, 70, 0, TAU);
          ctx.fill();
        }
      } else if (w.id === 'acid') {
        /* pressurised acid jet: a wobbling green stream with globs and fizz */
        const N = 30;
        const pts: number[][] = [];
        for (let i = 0; i <= N; i++) {
          const f = i / N;
          // the jet widens and breaks up as it travels
          const spread = 3 + f * 9;
          const off = Math.sin(f * 15 - this.time * 15) * spread + Math.sin(f * 31 + this.time * 23) * spread * 0.4;
          pts.push([ox + dx * len * f + px * off, oy + dy * len * f + py * off]);
        }
        ctx.lineCap = 'round';
        const apath = (wd: number, col: string, a: number) => {
          ctx.beginPath();
          ctx.moveTo(pts[0][0], pts[0][1]);
          for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
          ctx.strokeStyle = hexA(col, a * life);
          ctx.lineWidth = wd;
          ctx.stroke();
        };
        apath(width * 3.2, '#5c9e12', 0.2);
        apath(width * 1.7, w.primary, 0.6);
        apath(width * 0.55, '#f4ffd0', 0.9);
        // discrete globs riding the stream
        for (let k = 0; k < 7; k++) {
          const f = (this.time * 3.6 + k / 7) % 1;
          const idx = Math.floor(f * N);
          const [gx2, gy2] = pts[idx];
          const rr2 = (5 + f * 7) * (0.8 + 0.2 * Math.sin(this.time * 12 + k));
          const g2 = ctx.createRadialGradient(gx2, gy2, 0, gx2, gy2, rr2 * 2.4);
          g2.addColorStop(0, `rgba(244,255,208,${0.95 * life})`);
          g2.addColorStop(0.3, hexA(w.primary, 0.85 * life));
          g2.addColorStop(0.7, hexA('#5c9e12', 0.4 * life));
          g2.addColorStop(1, hexA(w.primary, 0));
          ctx.fillStyle = g2;
          ctx.beginPath();
          ctx.arc(gx2, gy2, rr2 * 2.4, 0, TAU);
          ctx.fill();
          ctx.globalCompositeOperation = 'source-over';
          ctx.fillStyle = hexA(w.secondary, 0.95 * life);
          ctx.beginPath();
          ctx.ellipse(gx2, gy2, rr2, rr2 * 0.82, 0, 0, TAU);
          ctx.fill();
          ctx.fillStyle = `rgba(255,255,255,${0.7 * life})`;
          ctx.beginPath();
          ctx.arc(gx2 - rr2 * 0.3, gy2 - rr2 * 0.3, rr2 * 0.3, 0, TAU);
          ctx.fill();
          ctx.globalCompositeOperation = 'lighter';
        }
        if (b.hit) {
          const ig = ctx.createRadialGradient(b.ix, b.iy, 0, b.ix, b.iy, 58);
          ig.addColorStop(0, `rgba(244,255,208,${0.9 * life})`);
          ig.addColorStop(0.3, hexA(w.primary, 0.75 * life));
          ig.addColorStop(1, hexA(w.primary, 0));
          ctx.fillStyle = ig;
          ctx.beginPath();
          ctx.arc(b.ix, b.iy, 58, 0, TAU);
          ctx.fill();
        }
      } else if (w.id === 'repulsor') {
        /* repulsor: a tight white core inside a gold-tipped field, with a
           powerful palm bloom at the emitter */
        ctx.lineCap = 'round';
        const layers: [number, string, number][] = [
          [width * 4.4, '#8fc4e8', 0.12],
          [width * 2.4, '#cfeaff', 0.3],
          [width * 1.15, '#ffffff', 0.85],
          [Math.max(1, width * 0.4), '#ffffff', 1],
        ];
        for (const [wd, col, a] of layers) {
          const g = ctx.createLinearGradient(ox, oy, ox + dx * len, oy + dy * len);
          g.addColorStop(0, hexA('#ffffff', a * life));
          g.addColorStop(0.55, hexA(col, a * life));
          g.addColorStop(1, hexA('#ffd36a', a * life * 0.85));
          ctx.strokeStyle = g;
          ctx.lineWidth = wd;
          ctx.beginPath();
          ctx.moveTo(ox, oy);
          ctx.lineTo(ox + dx * len, oy + dy * len);
          ctx.stroke();
        }
        // gold energy tip flaring at the impact end
        if (b.hit) {
          const tx = b.ix;
          const ty = b.iy;
          const tg = ctx.createRadialGradient(tx, ty, 0, tx, ty, 64);
          tg.addColorStop(0, `rgba(255,255,255,${0.95 * life})`);
          tg.addColorStop(0.28, hexA('#ffd36a', 0.8 * life));
          tg.addColorStop(1, hexA('#ffd36a', 0));
          ctx.fillStyle = tg;
          ctx.beginPath();
          ctx.arc(tx, ty, 64, 0, TAU);
          ctx.fill();
          // cross flare
          ctx.strokeStyle = `rgba(255,224,150,${0.6 * life})`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(tx - 30, ty);
          ctx.lineTo(tx + 30, ty);
          ctx.moveTo(tx, ty - 30);
          ctx.lineTo(tx, ty + 30);
          ctx.stroke();
        }
      } else {
        // generic sniper / heavy beam
        const g = ctx.createLinearGradient(ox, oy, ox + dx * len, oy + dy * len);
        g.addColorStop(0, hexA(w.secondary, 0.5 * life));
        g.addColorStop(0.3, hexA(w.primary, 0.9 * life));
        g.addColorStop(1, hexA('#ffffff', 0.95 * life));
        ctx.strokeStyle = g;
        ctx.lineWidth = width * 1.6 * life;
        ctx.beginPath();
        ctx.moveTo(ox, oy);
        ctx.lineTo(ox + dx * len, oy + dy * len);
        ctx.stroke();
        ctx.strokeStyle = hexA('#ffffff', 0.95 * life);
        ctx.lineWidth = Math.max(2, width * 0.45) * life;
        ctx.stroke();
        for (const rr2 of [1, 0.72, 0.45]) {
          ctx.strokeStyle = hexA(w.primary, 0.3 * life * rr2);
          ctx.lineWidth = width * 3.2 * rr2 * life;
          ctx.beginPath();
          ctx.moveTo(ox, oy);
          ctx.lineTo(ox + dx * len, oy + dy * len);
          ctx.stroke();
        }
      }
      // muzzle bloom + impact bloom
      const bl = ctx.createRadialGradient(ox, oy, 0, ox, oy, 60);
      bl.addColorStop(0, `rgba(255,255,255,${0.85 * life})`);
      bl.addColorStop(0.4, hexA(w.primary, 0.6 * life));
      bl.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = bl;
      ctx.beginPath();
      ctx.arc(ox, oy, 60, 0, TAU);
      ctx.fill();
      if (b.hit) {
        const il = ctx.createRadialGradient(b.ix, b.iy, 0, b.ix, b.iy, 90);
        il.addColorStop(0, `rgba(255,255,255,${0.95 * life})`);
        il.addColorStop(0.3, hexA(w.primary, 0.8 * life));
        il.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = il;
        ctx.beginPath();
        ctx.arc(b.ix, b.iy, 90, 0, TAU);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  private drawWeapon(ctx: CanvasRenderingContext2D) {
    const w = this.w;
    const c = this.muz;
    // Predator Shoulder Caster: 3 Red Targeting Lasers & Triangle Lock-On Reticle
    if (w.id === 'caster' && this.wheel.alive) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const ch = this.charge;
      const bobX = Math.sin(this.time * 1.15) * 3.2;
      const bobY = Math.cos(this.time * 1.75) * 2.4 + Math.sin(this.time * 2.4) * 1.4;
      const txBase = this.wheel.x - this.wheel.r + 4;
      const tyBase = this.wheel.y + Math.sin(this.time * 1.8) * (1 - ch) * 14;

      // 3 diode origin offsets on the muzzle bezel + 3 triangle vertex offsets on the target
      const triRadius = 11 + (1 - ch) * 44;
      const triSpin = (1 - ch) * Math.sin(this.time * 2.2) * 0.45;
      const diodes: [number, number][] = [
        [-4, -13],
        [-6, 10],
        [3, 7],
      ];
      const targetPts: [number, number][] = [];

      for (let i = 0; i < 3; i++) {
        const a = -Math.PI / 2 + (i * TAU) / 3 + triSpin;
        const px = txBase + Math.cos(a) * triRadius * 0.55;
        const py = tyBase + Math.sin(a) * triRadius;
        targetPts.push([px, py]);

        const sx = c.mx + bobX - this.recoil * 14 + diodes[i][0] * c.scale;
        const sy = c.my + bobY - this.recoil * 2.4 + diodes[i][1] * c.scale;

        // Outer red laser haze
        const beamAlpha = 0.24 + ch * 0.62;
        const lg = ctx.createLinearGradient(sx, sy, px, py);
        lg.addColorStop(0, `rgba(255,35,20,${beamAlpha * 1.15})`);
        lg.addColorStop(0.5, `rgba(255,25,15,${beamAlpha * 0.7})`);
        lg.addColorStop(1, `rgba(255,45,25,${beamAlpha * 1.25})`);
        ctx.strokeStyle = lg;
        ctx.lineWidth = 3.2 + ch * 1.8;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(px, py);
        ctx.stroke();

        // Crisp inner laser core
        ctx.strokeStyle = `rgba(255,190,170,${0.32 + ch * 0.65})`;
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(px, py);
        ctx.stroke();

        // Glowing red laser dot on the wheel surface
        const dg = ctx.createRadialGradient(px, py, 0, px, py, 10 + ch * 8);
        dg.addColorStop(0, '#ffffff');
        dg.addColorStop(0.3, '#ff4d3a');
        dg.addColorStop(1, 'rgba(255,20,0,0)');
        ctx.fillStyle = dg;
        ctx.beginPath();
        ctx.arc(px, py, 10 + ch * 8, 0, TAU);
        ctx.fill();
      }

      // Iconic Yautja triangular lock-on reticle connecting the 3 red dots as charge builds
      if (ch > 0.03) {
        ctx.strokeStyle = `rgba(255,50,30,${0.25 + ch * 0.65})`;
        ctx.lineWidth = 1.4;
        ctx.setLineDash([5, 4]);
        ctx.beginPath();
        ctx.moveTo(targetPts[0][0], targetPts[0][1]);
        ctx.lineTo(targetPts[1][0], targetPts[1][1]);
        ctx.lineTo(targetPts[2][0], targetPts[2][1]);
        ctx.closePath();
        ctx.stroke();
        ctx.setLineDash([]);

        if (ch > 0.65) {
          ctx.font = '900 11px ui-sans-serif, system-ui, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillStyle = `rgba(255,90,70,${0.55 + 0.45 * Math.sin(this.time * 18)})`;
          ctx.fillText('TARGET LOCKED', txBase - 18, tyBase - triRadius - 14);
        }
      }
      ctx.restore();
    }
    // Mega Buster charge-tier readout floating at the muzzle
    if (w.id === 'buster' && this.charge > 0.02) {
      const tier = this.busterTier;
      const names = ['', 'CHARGE 1', 'CHARGE 2', 'MAX CHARGE'];
      const cols = ['#ffe08a', '#ffc24a', '#ff9b2f', '#fff6d8'];
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.font = '900 17px ui-sans-serif, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = hexA(cols[tier], 0.55 + 0.45 * Math.sin(this.time * 12));
      ctx.fillText(names[tier], c.mx - 40, c.my - 70);
      // tier pips
      for (let i = 0; i < 3; i++) {
        const on = tier > i;
        ctx.fillStyle = hexA(cols[tier], on ? 0.9 : 0.18);
        ctx.beginPath();
        ctx.arc(c.mx - 74 + i * 17, c.my - 54, 4.5, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
    }
    // charge aura
    if (this.charge > 0.02) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(c.mx, c.my, 0, c.mx, c.my, 120 * this.charge);
      g.addColorStop(0, hexA(w.primary, 0.5 * this.charge));
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(c.mx, c.my, 120 * this.charge, 0, TAU);
      ctx.fill();
      for (let i = 0; i < 3; i++) {
        const a = this.time * 5 + i * 2.1;
        ctx.strokeStyle = hexA(w.secondary, 0.5 * this.charge);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(c.mx, c.my, 40 + i * 16 + Math.sin(this.time * 9 + i) * 6, a, a + 1.6);
        ctx.stroke();
      }
      ctx.restore();
    }
    // muzzle flash sprite
    if (this.fireFlash > 0.02 && w.id !== 'sword' && w.id !== 'bow') {
      ctx.save();
      ctx.translate(c.mx, c.my);
      ctx.rotate(rand(-0.15, 0.15));
      ctx.globalCompositeOperation = 'lighter';
      const f = this.fireFlash;
      const len = (w.id === 'dragon' ? 190 : 92) * f;
      const wid = (w.id === 'dragon' ? 74 : 38) * f;
      // layered flame petals
      for (let i = 0; i < 3; i++) {
        const k = 1 - i * 0.26;
        const lg = len * k * (1 + i * 0.12);
        const lw = wid * k;
        const g = ctx.createLinearGradient(0, 0, lg, 0);
        g.addColorStop(0, `rgba(255,255,255,${(0.95 - i * 0.18) * f})`);
        g.addColorStop(0.3, hexA(i === 0 ? '#fff3c4' : w.primary, (0.85 - i * 0.2) * f));
        g.addColorStop(0.75, hexA(w.primary, 0.35 * f));
        g.addColorStop(1, hexA(w.primary, 0));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(0, -lw * 0.3);
        ctx.quadraticCurveTo(lg * 0.45, -lw * (0.9 + i * 0.25), lg, 0);
        ctx.quadraticCurveTo(lg * 0.45, lw * (0.9 + i * 0.25), 0, lw * 0.3);
        ctx.closePath();
        ctx.fill();
      }
      // rose-petal crown (gas escaping around the muzzle device)
      const petals = 7;
      for (let i = 0; i < petals; i++) {
        const a = (i / petals) * Math.PI * 2 + f * 2;
        const pl = wid * (1.5 + (i % 2) * 0.9) * f;
        const pg = ctx.createLinearGradient(0, 0, Math.cos(a) * pl, Math.sin(a) * pl);
        pg.addColorStop(0, `rgba(255,255,255,${0.85 * f})`);
        pg.addColorStop(0.5, hexA(w.primary, 0.6 * f));
        pg.addColorStop(1, hexA(w.primary, 0));
        ctx.fillStyle = pg;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a + 0.22) * wid * 0.22, Math.sin(a + 0.22) * wid * 0.22);
        ctx.lineTo(Math.cos(a) * pl, Math.sin(a) * pl);
        ctx.lineTo(Math.cos(a - 0.22) * wid * 0.22, Math.sin(a - 0.22) * wid * 0.22);
        ctx.closePath();
        ctx.fill();
      }
      // star spikes
      ctx.fillStyle = `rgba(255,255,255,${0.7 * f})`;
      for (const sp of [
        [0, -wid * 1.5, 3, wid * 0.5],
        [0, wid * 1.5, 3, wid * 0.5],
      ] as number[][]) {
        ctx.beginPath();
        ctx.moveTo(0, sp[1]);
        ctx.lineTo(sp[2], 0);
        ctx.lineTo(0, -sp[1] * 0.12);
        ctx.lineTo(-sp[2], 0);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }

    /* ---- light the weapon casts onto the floor + soft contact shadow ---- */
    const F = VH - 72;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const cast = ctx.createRadialGradient(c.mx, F, 6, c.mx, F, 300);
    const ci = 0.1 + this.fireFlash * 0.28 + (this.beams.length ? 0.14 : 0);
    cast.addColorStop(0, hexA(w.primary, ci));
    cast.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = cast;
    ctx.beginPath();
    ctx.ellipse(c.mx, F, 300, 60, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
    ctx.save();
    const shg = ctx.createRadialGradient(c.mx - 40, F - 6, 4, c.mx - 40, F - 6, 230);
    shg.addColorStop(0, 'rgba(0,0,0,0.55)');
    shg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = shg;
    ctx.beginPath();
    ctx.ellipse(c.mx - 40, F - 6, 230, 34, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
    // back-light halo so the prop reads against the dark bay
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const halo = ctx.createRadialGradient(c.mx - 90, c.my, 10, c.mx - 90, c.my, 260);
    halo.addColorStop(0, hexA(w.secondary, 0.07 + this.fireFlash * 0.1));
    halo.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = halo;
    ctx.fillRect(c.mx - 380, c.my - 260, 520, 520);
    ctx.restore();

    ctx.save();
    let lunge = 0;
    if (w.mode === 'melee') {
      lunge = Math.sin(Math.PI * clamp(this.swing, 0, 1)) * 420;
      // dash speed lines
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 9; i++) {
        const yy = c.my + rand(-90, 90);
        const g = ctx.createLinearGradient(c.mx - 260 - lunge, yy, c.mx - 20 - lunge, yy);
        g.addColorStop(0, hexA(w.primary, 0));
        g.addColorStop(1, hexA(w.secondary, 0.35 * (lunge / 300)));
        ctx.fillStyle = g;
        ctx.fillRect(c.mx - 300 - lunge, yy, 280, 2 + Math.random() * 2);
      }
      ctx.restore();
    }
    // hand-held idle sway (breathing) — keeps the rig feeling alive
    const bobX = Math.sin(this.time * 1.15) * 3.2;
    const bobY = Math.cos(this.time * 1.75) * 2.4;
    ctx.translate(c.mx + lunge + bobX, c.my + bobY);
    const s = c.scale;
    ctx.scale(s, s);
    const state: ArtState = {
      t: this.time,
      recoil: w.mode === 'melee' ? this.swing : this.recoil,
      pull: this.pull,
      charge: this.charge,
      fire: this.fireFlash,
      active: this.beams.length > 0 || this.fireFlash > 0.1,
      sway: 0,
    };
    drawArt(ctx, w, state);
    ctx.restore();
  }
}


