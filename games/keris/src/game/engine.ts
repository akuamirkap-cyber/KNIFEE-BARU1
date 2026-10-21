import { AudioEngine } from './audio';
import { specForLevel, type LevelSpec, type RotPhase } from './levels';
import {
  boltPts,
  drawArcaneRig,
  drawBackdrop,
  drawGem,
  drawHolyRing,
  drawJolt,
  drawKerisBullet,
  drawKerisGun,
  drawMuzzleFlash,
  drawShard,
  drawTargetBody,
  strokeJolt,
} from './render';
import {
  TAU,
  angDiff,
  clamp,
  easeOutBack,
  lerp,
  normAng,
  phaseEase,
  type Phase,
  type Status,
} from './types';

/* ---------------- helpers ---------------- */

class RotCtl {
  phases: RotPhase[];
  t = 0;
  total: number;
  angle: number;

  constructor(phases: RotPhase[]) {
    this.phases = phases.length ? phases : [{ dur: 4, from: 1.2, to: 1.2 }];
    this.total = this.phases.reduce((s, p) => s + p.dur, 0) || 1;
    this.angle = Math.random() * TAU;
  }

  update(dt: number): number {
    this.t += dt;
    let tt = this.t % this.total;
    let speed = 0;
    for (const p of this.phases) {
      if (tt <= p.dur) {
        speed = lerp(p.from, p.to, phaseEase(clamp(tt / p.dur, 0, 1)));
        break;
      }
      tt -= p.dur;
    }
    this.angle += speed * dt;
    return speed;
  }
}

interface Embedded {
  la: number;
  enemy: boolean;
  spark: number; // residual crackle timer
}

interface GemOnTarget {
  la: number;
  taken: boolean;
}

/** electric aftermath drawn in the target's rotating frame */
interface EArc {
  kind: 'crawl' | 'tendril' | 'link';
  a0: number;
  a1: number;
  rIn: number;
  ttl: number;
  ttl0: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  life0: number;
  size: number;
  color: string;
  grav: number;
  glow: boolean;
  drift: number;
  seed: number;
  shape: 'dot' | 'chip' | 'spark';
  rot: number;
  vr: number;
}

interface Popup {
  x: number;
  y: number;
  life: number;
  life0: number;
  text: string;
  color: string;
  size: number;
}

interface FreeBullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vr: number;
  life: number;
}

interface ShardBody {
  px: number;
  py: number;
  vx: number;
  vy: number;
  rot: number;
  vr: number;
  life: number;
  ox: number; // old centre
  oy: number;
  cx0: number; // initial centroid
  cy0: number;
  a0: number;
  a1: number;
  R: number;
}

const rnd = (a: number, b: number) => a + Math.random() * (b - a);

const SPARK_GOLD = ['#d99a26', '#b57d16', '#fff6cf'];
const CHIP_WOOD = ['#a8722a', '#704a12', '#e8c268', '#5c3a0a'];

/* ================================================================ */

export class GameEngine {
  private cv: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private raf = 0;
  private last = 0;
  private t = 0;
  private dead = false;

  private W = 0;
  private H = 0;
  private dpr = 1;

  // layout
  private cx = 0;
  private cy = 0;
  private R = 90;
  private rMul = 1;
  private unit = 1;
  private gunX = 0;
  private gunY = 0;

  // state
  phase: Phase = 'menu';
  private level = 1;
  private score = 0;
  private gems = 0;
  private best = 0;
  private isNewBest = false;
  private gameOverAt = 0;

  // target
  private spec: LevelSpec = specForLevel(1);
  private rot = new RotCtl([{ dur: 4, from: 0.9, to: 0.9 }]);
  private theta = 0;
  private popT = 1;
  private targetAlive = true;
  private wobble = 0;

  private bullets: Embedded[] = [];
  private gemsT: GemOnTarget[] = [];
  private shotsLeft = 0;
  private shotsTotal = 0;

  // projectile & debris
  private proj: { y: number; vy: number; trail: { x: number; y: number }[] } | null = null;
  private shards: ShardBody[] = [];
  private freeBullets: FreeBullet[] = [];
  private elArcs: EArc[] = [];
  private particles: Particle[] = [];
  private popups: Popup[] = [];

  // fx timers
  private recoil = 0;
  private muzzleT = 0;
  private charge = 0;
  private shake = 0;
  private flash = 0;
  private flashRed = true;
  private slowT = 0;
  private dyingT = 0;
  private celebT = 0;
  private emberT = 0;
  private flameT = 0;

  readonly audio = new AudioEngine();
  onStatus?: (s: Status) => void;

  private boundResize = () => this.resize();
  private boundVis = () => {
    this.last = performance.now();
  };

  constructor(canvas: HTMLCanvasElement) {
    this.cv = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('no 2d ctx');
    this.ctx = ctx;

    try {
      this.best = parseInt(localStorage.getItem('gunhit_best') ?? '0', 10) || 0;
      this.gems = parseInt(localStorage.getItem('gunhit_gems') ?? '0', 10) || 0;
    } catch {
      /* ignore */
    }

    window.addEventListener('resize', this.boundResize);
    document.addEventListener('visibilitychange', this.boundVis);
    this.resize();
    this.demoScene();
  }

  /* ---------------- lifecycle ---------------- */

  start() {
    this.last = performance.now();
    const loop = (now: number) => {
      if (this.dead) return;
      const dt = clamp((now - this.last) / 1000, 0, 0.05);
      this.last = now;
      const ts = this.slowT > 0 ? 0.1 : 1;
      this.slowT -= dt;
      this.t += dt;
      this.update(dt * ts, dt);
      this.render();
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  destroy() {
    this.dead = true;
    cancelAnimationFrame(this.raf);
    window.removeEventListener('resize', this.boundResize);
    document.removeEventListener('visibilitychange', this.boundVis);
  }

  resize() {
    const w = this.cv.clientWidth;
    const h = this.cv.clientHeight;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    this.W = w;
    this.H = h;
    this.cv.width = Math.round(w * this.dpr);
    this.cv.height = Math.round(h * this.dpr);

    this.unit = clamp(Math.min(w, h) / 760, 0.62, 1.22);
    this.R = clamp(Math.min(w, h) * 0.155, 58, 118);
    this.cx = w / 2;
    this.cy = Math.max(h * 0.3, this.R * this.rMul + 46);
    this.gunX = w / 2;
    this.gunY = h - 24 - 104 * this.unit;
  }

  /* ---------------- scene setup ---------------- */

  private demoScene() {
    this.spec = specForLevel(1);
    this.rMul = 1;
    this.rot = new RotCtl([{ dur: 4, from: 0.9, to: 0.9 }]);
    this.theta = this.rot.angle;
    this.targetAlive = true;
    this.popT = 1;
    this.bullets = [
      { la: -1.9, enemy: true, spark: 0 },
      { la: 2.2, enemy: true, spark: 0 },
    ];
    this.gemsT = [{ la: 0.3, taken: false }];
    this.shotsLeft = 0;
    this.shotsTotal = 0;
  }

  private spawnLevel() {
    this.spec = specForLevel(this.level);
    this.rMul = this.spec.radiusMul;
    this.rot = new RotCtl(this.spec.phases);
    this.theta = this.rot.angle;
    this.popT = 0;
    this.targetAlive = true;
    this.proj = null;
    this.elArcs = [];
    this.cy = Math.max(this.H * 0.3, this.R * this.rMul * 1.1 + 46);

    // enemy keris obstacles
    this.bullets = [];
    const placed: number[] = [];
    for (let i = 0; i < this.spec.obstacles; i++) {
      let la = 0;
      for (let tries = 0; tries < 40; tries++) {
        la = rnd(-Math.PI, Math.PI);
        if (placed.every((o) => angDiff(o, la) > 0.85)) break;
      }
      placed.push(la);
      this.bullets.push({ la, enemy: true, spark: 0 });
    }
    // rubies
    this.gemsT = [];
    for (let i = 0; i < this.spec.gems; i++) {
      let la = rnd(-Math.PI, Math.PI);
      for (let tries = 0; tries < 40; tries++) {
        la = rnd(-Math.PI, Math.PI);
        if (placed.every((o) => angDiff(o, la) > 0.8)) break;
      }
      placed.push(la);
      this.gemsT.push({ la, taken: false });
    }

    this.shotsLeft = this.spec.shots;
    this.shotsTotal = this.spec.shots;
  }

  begin() {
    this.audio.ui();
    this.level = 1;
    this.score = 0;
    this.isNewBest = false;
    this.shards = [];
    this.freeBullets = [];
    this.popups = [];
    this.phase = 'playing';
    this.spawnLevel();
    this.audio.level();
    this.emit();
  }

  restart() {
    this.begin();
  }

  toggleMute() {
    this.audio.toggle();
    this.emit();
  }

  /** main tap handler from canvas */
  primary() {
    if (this.phase === 'menu') {
      this.begin();
      return;
    }
    if (this.phase === 'gameover') {
      if (this.t - this.gameOverAt > 0.45) this.restart();
      return;
    }
    if (this.phase === 'playing') this.shoot();
  }

  /* ---------------- combat ---------------- */

  private shoot() {
    if (this.proj || this.shotsLeft <= 0 || !this.targetAlive || this.popT < 0.4) return;
    const spd = clamp(this.H * 3.3, 2200, 4700);
    this.proj = { y: this.gunY - 127 * this.unit, vy: -spd, trail: [] };
    this.muzzleT = 1;
    this.recoil = 11;
    this.charge = 1;
    this.shake = Math.max(this.shake, 2.2);
    this.audio.shoot();
    // holy sparks shedding from the tip
    for (let i = 0; i < 6; i++) {
      this.particles.push({
        x: this.gunX + rnd(-9, 9) * this.unit,
        y: this.gunY - 146 * this.unit,
        vx: rnd(-40, 40),
        vy: rnd(-140, -60),
        life: rnd(0.3, 0.55),
        life0: 0.55,
        size: rnd(1.2, 2.6) * this.unit,
        color: SPARK_GOLD[i % SPARK_GOLD.length],
        grav: -30,
        glow: true,
        drift: 0,
        seed: rnd(0, TAU),
        shape: 'dot',
        rot: 0,
        vr: 0,
      });
    }
  }

  private effR() {
    const pop = easeOutBack(clamp(this.popT, 0, 1));
    const wob = 1 + 0.045 * Math.sin(this.wobble * 40) * Math.exp(-this.wobble * 5);
    return this.R * this.rMul * pop * wob;
  }

  private resolveHit() {
    const impact = Math.PI / 2;
    const r = this.effR();
    const ipx = this.gunX;
    const ipy = this.cy + r - 4 * this.unit;

    // rubies first — tipped off by the shot
    for (const g of this.gemsT) {
      if (!g.taken && angDiff(this.theta + g.la, impact) < 0.22) {
        g.taken = true;
        this.gems++;
        this.score += 3;
        this.audio.gem();
        this.popup(ipx + rnd(-20, 20), ipy - 26 * this.unit, '+3', '#c22544', 26 * this.unit);
        this.burst(ipx, ipy, 14, SPARK_GOLD.concat(['#ff4d6d']), true, 220);
        this.flash = Math.max(this.flash, 0.16);
        this.flashRed = false;
        this.checkBest();
      }
    }

    // clash with an existing keris?
    const colTol = clamp(0.24 + 9 / r, 0.27, 0.4);
    for (const b of this.bullets) {
      if (angDiff(this.theta + b.la, impact) < colTol) {
        this.die(ipx, ipy);
        return;
      }
    }

    // embed! the thunder strikes home
    const la2 = normAng(impact - this.theta);
    let prevHero: Embedded | null = null;
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      if (!this.bullets[i].enemy) {
        prevHero = this.bullets[i];
        break;
      }
    }
    this.bullets.push({ la: la2, enemy: false, spark: 1.7 });
    this.shotsLeft--;
    this.score += 1;
    this.checkBest();
    this.audio.thunder();
    this.wobble = 1;
    this.shake = Math.max(this.shake, 5.5);
    this.flash = Math.max(this.flash, 0.14);
    this.flashRed = false;

    // golden electricity crawls across the mandala
    const pushArc = (a: EArc) => {
      this.elArcs.push(a);
      if (this.elArcs.length > 30) this.elArcs.shift();
    };
    for (let i = 0; i < 3; i++) {
      const dir = Math.random() > 0.5 ? 1 : -1;
      const t0 = 0.45 + rnd(0, 0.25);
      pushArc({ kind: 'crawl', a0: la2 + dir * rnd(0.05, 0.15), a1: la2 + dir * rnd(0.5, 0.95), rIn: 0, ttl: t0, ttl0: t0 });
    }
    for (let i = 0; i < 3; i++) {
      const t0 = 0.3 + rnd(0, 0.2);
      pushArc({ kind: 'tendril', a0: la2 + rnd(-0.09, 0.09), a1: la2 + rnd(-0.5, 0.5), rIn: rnd(0.3, 0.62), ttl: t0, ttl0: t0 });
    }
    if (prevHero && angDiff(prevHero.la, la2) > 0.2) {
      pushArc({ kind: 'link', a0: prevHero.la, a1: la2, rIn: 0, ttl: 0.5, ttl0: 0.5 });
    }

    this.popup(ipx + rnd(-18, 18), ipy - 30 * this.unit, `+1`, '#8a5a10', 24 * this.unit);
    // wood chips & gold sparks
    this.burst(ipx, ipy, 9, CHIP_WOOD, false, 160);
    this.burst(ipx, ipy, 7, SPARK_GOLD, true, 240);

    this.proj = null;

    if (this.shotsLeft <= 0) {
      this.phase = 'celebrating';
      this.celebT = 0;
      this.score += 10;
      this.checkBest();
      this.breakTarget();
      this.audio.clear(this.spec.boss);
      this.popup(this.cx, this.cy - this.R * this.rMul - 40 * this.unit, '+10', '#704a12', 34 * this.unit);
    }
    this.emit();
  }

  private checkBest() {
    if (this.score > this.best) {
      this.best = this.score;
      this.isNewBest = true;
    }
  }

  private die(px: number, py: number) {
    this.phase = 'dying';
    this.dyingT = 0;
    this.slowT = 0.2;
    this.flash = 1;
    this.flashRed = true;
    this.shake = 15;
    this.audio.clash();
    this.freeBullets.push({
      x: px,
      y: py + 12 * this.unit,
      vx: (Math.random() > 0.5 ? 1 : -1) * rnd(240, 520),
      vy: -rnd(180, 380),
      rot: 0,
      vr: (Math.random() > 0.5 ? 1 : -1) * rnd(9, 16),
      life: 1.6,
    });
    this.burst(px, py, 16, ['#fffdf6', '#ffd98a', '#e0651a'], true, 320);
    this.proj = null;
    try {
      localStorage.setItem('gunhit_best', String(this.best));
      localStorage.setItem('gunhit_gems', String(this.gems));
    } catch {
      /* ignore */
    }
    this.emit();
  }

  private breakTarget() {
    this.targetAlive = false;
    const r = this.effR();
    const gap = 0.05;
    for (let i = 0; i < 4; i++) {
      const a0 = this.theta + (i * Math.PI) / 2 + gap;
      const a1 = this.theta + ((i + 1) * Math.PI) / 2 - gap;
      const m = (a0 + a1) / 2;
      const rr = r * 0.56;
      const cx0 = this.cx + Math.cos(m) * rr;
      const cy0 = this.cy + Math.sin(m) * rr;
      this.shards.push({
        px: cx0,
        py: cy0,
        vx: Math.cos(m) * rnd(180, 330),
        vy: Math.sin(m) * rnd(160, 300) - 140,
        rot: 0,
        vr: (i % 2 === 0 ? 1 : -1) * rnd(2.5, 5),
        life: 1.5,
        ox: this.cx,
        oy: this.cy,
        cx0,
        cy0,
        a0,
        a1,
        R: r,
      });
    }
    // release embedded keris into sparks
    for (const b of this.bullets) {
      const a = this.theta + b.la;
      this.burst(this.cx + Math.cos(a) * r, this.cy + Math.sin(a) * r, 6, SPARK_GOLD, true, 200);
    }
    this.bullets = [];
    this.gemsT = [];
    // chip storm
    for (let i = 0; i < 26; i++) {
      const a = rnd(0, TAU);
      const px = this.cx + Math.cos(a) * r * 0.72;
      const py = this.cy + Math.sin(a) * r * 0.72;
      this.particles.push({
        x: px,
        y: py,
        vx: Math.cos(a) * rnd(60, 300),
        vy: Math.sin(a) * rnd(60, 300) - 120,
        life: rnd(0.5, 1.1),
        life0: 1.1,
        size: rnd(2, 5.2) * this.unit,
        color: CHIP_WOOD[i % CHIP_WOOD.length],
        grav: 900,
        glow: false,
        drift: 0,
        seed: rnd(0, TAU),
        shape: 'chip',
        rot: rnd(0, TAU),
        vr: rnd(-9, 9),
      });
    }
    this.burst(this.cx, this.cy, 22, SPARK_GOLD, true, 420);
    this.flash = Math.max(this.flash, 0.5);
    this.flashRed = false;
    this.shake = Math.max(this.shake, 9);
  }

  /* ---------------- fx helpers ---------------- */

  private burst(x: number, y: number, n: number, colors: string[], glow: boolean, pow: number) {
    for (let i = 0; i < n; i++) {
      const a = rnd(0, TAU);
      const v = rnd(pow * 0.3, pow);
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v - pow * 0.25,
        life: rnd(0.35, 0.8),
        life0: 0.8,
        size: rnd(1.2, 3) * this.unit,
        color: colors[i % colors.length],
        grav: glow ? 260 : 700,
        glow,
        drift: 0,
        seed: rnd(0, TAU),
        shape: 'spark',
        rot: rnd(0, TAU),
        vr: rnd(-8, 8),
      });
    }
  }

  private popup(x: number, y: number, text: string, color: string, size: number) {
    this.popups.push({ x, y, life: 0.9, life0: 0.9, text, color, size });
  }

  /* ---------------- update ---------------- */

  private update(dtW: number, dtR: number) {
    // ambient embers
    this.emberT -= dtR;
    if (this.emberT <= 0 && this.particles.length < 260) {
      this.emberT = 0.13;
      this.particles.push({
        x: rnd(0, this.W),
        y: this.H + 10,
        vx: rnd(-8, 8),
        vy: rnd(-46, -18),
        life: rnd(3, 6),
        life0: 6,
        size: rnd(0.9, 2.2),
        color: ['#e8c268', '#d99a26', '#7fd6c8', '#ffffff'][Math.floor(Math.random() * 4)],
        grav: -4,
        glow: true,
        drift: rnd(10, 26),
        seed: rnd(0, TAU),
        shape: 'dot',
        rot: 0,
        vr: 0,
      });
    }

    // fx decay
    this.recoil *= Math.exp(-9 * dtR);
    this.charge *= Math.exp(-3.2 * dtR);
    this.shake *= Math.exp(-7 * dtR);
    this.flash = Math.max(0, this.flash - dtR * 1.8);
    this.muzzleT = Math.max(0, this.muzzleT - dtR / 0.09);
    this.wobble += dtW;

    // electric decay
    for (let i = this.elArcs.length - 1; i >= 0; i--) {
      const a = this.elArcs[i];
      a.ttl -= dtR;
      if (a.ttl <= 0) this.elArcs.splice(i, 1);
    }
    for (const b of this.bullets) b.spark = Math.max(0, b.spark - dtR * 1.05);

    // particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dtW;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      p.vy += p.grav * dtW;
      p.x += p.vx * dtW + (p.drift ? Math.sin(this.t * 1.4 + p.seed) * p.drift * dtW : 0);
      p.y += p.vy * dtW;
      p.rot += p.vr * dtW;
    }

    // popups
    for (let i = this.popups.length - 1; i >= 0; i--) {
      const p = this.popups[i];
      p.life -= dtR;
      p.y -= 34 * dtR;
      if (p.life <= 0) this.popups.splice(i, 1);
    }

    // shards & free bodies
    for (const s of this.shards) {
      s.life -= dtW;
      s.vy += 1400 * dtW;
      s.px += s.vx * dtW;
      s.py += s.vy * dtW;
      s.rot += s.vr * dtW;
    }
    this.shards = this.shards.filter((s) => s.life > 0 && s.py < this.H + 200);
    for (const f of this.freeBullets) {
      f.life -= dtW;
      f.vy += 1500 * dtW;
      f.x += f.vx * dtW;
      f.y += f.vy * dtW;
      f.rot += f.vr * dtW;
    }
    this.freeBullets = this.freeBullets.filter((f) => f.life > 0 && f.y < this.H + 120);

    // phases
    if (this.phase === 'menu') {
      this.rot.update(dtW);
      this.theta = this.rot.angle;
    } else if (this.phase === 'playing') {
      this.popT = Math.min(1, this.popT + dtR / 0.55);
      this.rot.update(dtW);
      this.theta = this.rot.angle;

      // boss flames
      if (this.spec.boss && this.targetAlive) {
        this.flameT -= dtW;
        if (this.flameT <= 0) {
          this.flameT = 0.06;
          const a = rnd(0, TAU);
          const r = this.effR();
          this.particles.push({
            x: this.cx + Math.cos(a) * (r + 10 * this.unit),
            y: this.cy + Math.sin(a) * (r + 10 * this.unit),
            vx: Math.cos(a) * 30 + rnd(-14, 14),
            vy: Math.sin(a) * 30 - 40,
            life: rnd(0.4, 0.8),
            life0: 0.8,
            size: rnd(1.6, 3.4) * this.unit,
            color: ['#e0651a', '#c22544', '#d99a26'][Math.floor(Math.random() * 3)],
            grav: -60,
            glow: true,
            drift: 0,
            seed: rnd(0, TAU),
            shape: 'dot',
            rot: 0,
            vr: 0,
          });
        }
      }

      // restless thunder — arcs leap between embedded keris
      if (this.targetAlive && Math.random() < 0.02) {
        const heroes = this.bullets.filter((b) => !b.enemy);
        if (heroes.length >= 3) {
          const p = heroes[Math.floor(Math.random() * heroes.length)];
          const q = heroes[Math.floor(Math.random() * heroes.length)];
          if (p !== q && angDiff(p.la, q.la) < 2.4 && this.elArcs.length < 30) {
            this.elArcs.push({ kind: 'link', a0: p.la, a1: q.la, rIn: 0, ttl: 0.35, ttl0: 0.35 });
          }
        }
      }

      // projectile flight
      if (this.proj) {
        this.proj.y += this.proj.vy * dtW;
        this.proj.trail.unshift({ x: this.gunX, y: this.proj.y + 22 * this.unit });
        if (this.proj.trail.length > 12) this.proj.trail.pop();
        const tip = this.proj.y - 23 * this.unit;
        const impactY = this.cy + this.effR() - 2 * this.unit;
        if (tip <= impactY && this.targetAlive) {
          this.resolveHit();
        }
      }
    } else if (this.phase === 'celebrating') {
      this.rot.update(dtW * 0.25);
      this.theta = this.rot.angle;
      this.celebT += dtR;
      if (this.celebT >= 1.5) {
        this.level++;
        this.spawnLevel();
        this.phase = 'playing';
        this.audio.level();
        this.emit();
      }
    } else if (this.phase === 'dying') {
      this.dyingT += dtR;
      if (this.dyingT >= 1.05) {
        this.phase = 'gameover';
        this.gameOverAt = this.t;
        this.emit();
      }
    }
  }

  /* ---------------- render ---------------- */

  private render() {
    const { ctx } = this;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.W, this.H);

    drawBackdrop(ctx, this.W, this.H, this.cx, this.cy, this.R * this.rMul, this.t);

    const sx = (Math.random() - 0.5) * this.shake;
    const sy = (Math.random() - 0.5) * this.shake;
    ctx.save();
    ctx.translate(sx, sy);

    // back particles (embers)
    this.drawParticles(false);

    /* target */
    if (this.targetAlive) {
      const pop = easeOutBack(clamp(this.popT, 0, 1));
      const wob = 1 + 0.045 * Math.sin(this.wobble * 40) * Math.exp(-this.wobble * 5);
      const r = this.R * this.rMul * pop * wob;

      ctx.save();
      ctx.translate(this.cx, this.cy);
      ctx.scale(pop * wob, pop * wob);
      ctx.rotate(this.theta);
      drawTargetBody(ctx, this.R * this.rMul, this.spec.kind, this.t);

      // gems on rim
      for (const g of this.gemsT) {
        if (g.taken) continue;
        ctx.save();
        ctx.translate(Math.cos(g.la) * (this.R * this.rMul - 5), Math.sin(g.la) * (this.R * this.rMul - 5));
        drawGem(ctx, 7 * this.unit + this.R * this.rMul * 0.015, this.t * 4 + g.la);
        ctx.restore();
      }

      // embedded keris — blade buried, hulu proud of the rim
      for (const b of this.bullets) {
        const rr = this.R * this.rMul - 3 * this.unit;
        ctx.save();
        ctx.translate(Math.cos(b.la) * rr, Math.sin(b.la) * rr);
        ctx.rotate(b.la - Math.PI / 2);
        ctx.scale(this.unit, this.unit);
        drawKerisBullet(ctx, b.enemy ? 'enemy' : 'hero');
        // residual crackle — the lightning still lives in the steel
        if (b.spark > 0.03) {
          const sa = Math.min(1, b.spark) * (0.55 + Math.random() * 0.45);
          drawJolt(ctx, 0, 7, rnd(-8, 8), rnd(16, 27), 3.2, 1.15, sa);
          drawJolt(ctx, 0, 7, rnd(-8, 8), rnd(14, 24), 3.2, 0.9, sa * 0.8);
          drawJolt(ctx, 0, 0, rnd(-5, 5), -rnd(8, 18), 2.4, 0.9, sa * 0.75);
        }
        ctx.restore();
      }

      // golden electricity scarred across the mandala
      const RR = this.R * this.rMul;
      for (const a of this.elArcs) {
        const al = clamp(a.ttl / a.ttl0, 0, 1);
        if (al <= 0) continue;
        const w = (1.5 * al + 0.4) * this.unit;
        if (a.kind === 'crawl') {
          const rs = RR - 3 * this.unit;
          const pts = boltPts(Math.cos(a.a0) * rs, Math.sin(a.a0) * rs, Math.cos(a.a1) * rs, Math.sin(a.a1) * rs, 7 * this.unit);
          for (const p of pts) {
            const d = Math.hypot(p.x, p.y) || 1;
            const rr2 = rs + rnd(-2.6, 2.6);
            p.x = (p.x / d) * rr2;
            p.y = (p.y / d) * rr2;
          }
          strokeJolt(ctx, pts, w, al);
        } else if (a.kind === 'tendril') {
          const r0 = RR - 4 * this.unit;
          const r1 = RR * a.rIn;
          strokeJolt(
            ctx,
            boltPts(Math.cos(a.a0) * r0, Math.sin(a.a0) * r0, Math.cos(a.a1) * r1, Math.sin(a.a1) * r1, 9 * this.unit),
            w,
            al * 0.9,
          );
        } else {
          const rs = RR - 3 * this.unit;
          strokeJolt(
            ctx,
            boltPts(Math.cos(a.a0) * rs, Math.sin(a.a0) * rs, Math.cos(a.a1) * rs, Math.sin(a.a1) * rs, RR * 0.11),
            w * 0.85,
            al * 0.7,
          );
        }
      }
      ctx.restore();

      // soft sheen on the disc
      ctx.save();
      const lg2 = ctx.createRadialGradient(this.cx - r * 0.5, this.cy - r * 0.6, r * 0.1, this.cx, this.cy, r * 1.4);
      lg2.addColorStop(0, 'rgba(255,250,230,0.22)');
      lg2.addColorStop(0.7, 'rgba(255,250,230,0.05)');
      lg2.addColorStop(1, 'rgba(255,250,230,0)');
      ctx.fillStyle = lg2;
      ctx.beginPath();
      ctx.arc(this.cx, this.cy, r * 1.15, 0, TAU);
      ctx.fill();
      ctx.restore();

      // celestial frame around the mandala
      ctx.save();
      ctx.translate(this.cx, this.cy);
      ctx.rotate(this.t * 0.05);
      drawHolyRing(ctx, (r + 27 * this.unit) * 0.97);
      ctx.restore();
    }

    /* shards */
    for (const s of this.shards) {
      ctx.save();
      ctx.globalAlpha = clamp(s.life / 1.5, 0, 1);
      ctx.translate(s.px, s.py);
      ctx.rotate(s.rot);
      ctx.translate(-(s.cx0 - s.ox), -(s.cy0 - s.oy));
      drawShard(ctx, s.R, s.a0, s.a1, this.spec.kind);
      ctx.restore();
    }

    /* projectile — the keris rides a golden lightning bolt */
    if (this.proj) {
      const hx = this.gunX;
      const hy = this.proj.y - 21 * this.unit;
      const sx = this.gunX;
      const sy = this.gunY + (this.recoil - 150) * this.unit;
      const rough = clamp(Math.abs(sy - hy) * 0.085, 4, 22);
      const main = boltPts(sx, sy, hx, hy, rough);
      strokeJolt(ctx, main, 2.5 * this.unit, 1);
      // branching forks along the strike
      for (let i = 2; i < main.length - 2; i += 4) {
        if (Math.random() < 0.5) {
          const p = main[i];
          const dir = Math.atan2(hy - sy, hx - sx) + rnd(-1.3, 1.3);
          const dl = rnd(8, 26) * this.unit;
          strokeJolt(
            ctx,
            boltPts(p.x, p.y, p.x + Math.cos(dir) * dl, p.y + Math.sin(dir) * dl, dl * 0.4),
            1.1 * this.unit,
            0.55,
          );
        }
      }
      // crackling plasma head
      const headG = ctx.createRadialGradient(hx, hy, 1, hx, hy, 20 * this.unit);
      headG.addColorStop(0, 'rgba(255,255,252,0.95)');
      headG.addColorStop(0.4, 'rgba(255,205,80,0.55)');
      headG.addColorStop(1, 'rgba(255,170,40,0)');
      ctx.fillStyle = headG;
      ctx.beginPath();
      ctx.arc(hx, hy, 20 * this.unit, 0, TAU);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(hx, hy, (10 + Math.sin(this.t * 44) * 2.4) * this.unit, 0, TAU);
      ctx.strokeStyle = 'rgba(255,214,106,0.8)';
      ctx.lineWidth = 1.6;
      ctx.stroke();
      for (let c = 0; c < 3; c++) {
        const aa = Math.random() * TAU;
        const rl = 12 * this.unit;
        strokeJolt(ctx, boltPts(hx, hy, hx + Math.cos(aa) * rl, hy + Math.sin(aa) * rl, 3), 1 * this.unit, 0.75);
      }
      // the keris riding inside the bolt
      ctx.save();
      ctx.translate(this.gunX, this.proj.y);
      ctx.scale(this.unit, this.unit);
      drawKerisBullet(ctx, 'hero');
      ctx.restore();
    }

    /* dead bullet */
    for (const f of this.freeBullets) {
      ctx.save();
      ctx.globalAlpha = clamp(f.life / 1.6, 0, 1);
      ctx.translate(f.x, f.y);
      ctx.rotate(f.rot);
      ctx.scale(this.unit, this.unit);
      drawKerisBullet(ctx, 'hero');
      ctx.restore();
    }

    /* arcane rig + the KERIS GUN */
    ctx.save();
    ctx.translate(this.gunX, this.gunY);
    ctx.scale(this.unit, this.unit);
    drawArcaneRig(ctx, 78, this.t, 0.25 + this.charge * 0.75);
    ctx.translate(0, this.recoil);
    drawKerisGun(ctx, this.t, 0.25 + this.charge * 0.75);
    ctx.restore();

    /* holy muzzle flash at the blade tip */
    if (this.muzzleT > 0) {
      ctx.save();
      ctx.translate(this.gunX, this.gunY + (this.recoil - 152) * this.unit);
      ctx.scale(this.unit, this.unit);
      drawMuzzleFlash(ctx, 1 - this.muzzleT);
      ctx.restore();
    }

    // front particles (sparks & chips)
    this.drawParticles(true);

    /* popups */
    for (const p of this.popups) {
      const k = p.life / p.life0;
      ctx.save();
      ctx.globalAlpha = clamp(k * 1.4, 0, 1);
      ctx.font = `800 ${p.size}px Sora, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillStyle = p.color;
      ctx.shadowColor = 'rgba(0,0,0,0.6)';
      ctx.shadowBlur = 8;
      ctx.fillText(p.text, p.x, p.y);
      ctx.restore();
    }

    ctx.restore();

    /* full-screen flash */
    if (this.flash > 0) {
      ctx.save();
      const g = ctx.createRadialGradient(this.cx, this.cy, 10, this.cx, this.cy, Math.max(this.W, this.H) * 0.7);
      g.addColorStop(0, this.flashRed ? `rgba(230,32,63,${0.28 * this.flash})` : `rgba(255,236,190,${0.22 * this.flash})`);
      g.addColorStop(1, this.flashRed ? `rgba(120,6,26,${0.4 * this.flash})` : 'rgba(255,236,190,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, this.W, this.H);
      ctx.restore();
    }
  }

  private drawParticles(front: boolean) {
    const { ctx } = this;
    for (const p of this.particles) {
      const isFront = p.shape !== 'dot' || p.drift === 0;
      if (front !== isFront) continue;
      const k = clamp(p.life / p.life0, 0, 1);
      ctx.save();
      if (p.shape === 'chip') {
        ctx.globalAlpha = Math.min(1, k * 1.1);
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      } else if (p.shape === 'spark') {
        ctx.globalAlpha = Math.min(1, k * 1.2);
        ctx.strokeStyle = p.color;
        ctx.lineWidth = p.size;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - p.vx * 0.03, p.y - p.vy * 0.03);
        ctx.stroke();
      } else {
        // soft halo + core, readable on the bright sky
        const soft = p.drift ? 0.5 : 1;
        ctx.globalAlpha = k * 0.22 * soft;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 2.8, 0, TAU);
        ctx.fillStyle = p.color;
        ctx.fill();
        ctx.globalAlpha = k * 0.9 * soft;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, TAU);
        ctx.fillStyle = p.glow ? '#fffdf6' : p.color;
        ctx.fill();
      }
      ctx.restore();
    }
  }

  /* ---------------- status bridge ---------------- */

  private emit() {
    this.onStatus?.({
      phase: this.phase,
      level: this.level,
      boss: this.spec.boss,
      score: this.score,
      best: this.best,
      isNewBest: this.isNewBest,
      gems: this.gems,
      shotsLeft: this.shotsLeft,
      shotsTotal: this.shotsTotal,
      muted: this.audio.muted,
    });
  }

  /** HUD pulls fresh status after engine events */
  snapshot(): Status {
    return {
      phase: this.phase,
      level: this.level,
      boss: this.spec.boss,
      score: this.score,
      best: this.best,
      isNewBest: this.isNewBest,
      gems: this.gems,
      shotsLeft: this.shotsLeft,
      shotsTotal: this.shotsTotal,
      muted: this.audio.muted,
    };
  }
}
