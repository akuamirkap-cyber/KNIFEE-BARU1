/* =========================================================================
   GUN HIT — engine
   Lingkaran berputar di atas, satu senjata tetap di bawah, TAP untuk tembak.
   ========================================================================= */

import {
  getWeapon,
  rgba,
  TAU,
  boltPath,
  strokeBolt,
  sparkle,
  glow,
  noGlow,
  type Emit,
  type ParticleInit,
  type ParticleKind,
  type Weapon,
} from "./weapons";
import {
  createCrispBolt,
  renderCrispBolt,
  drawCircleSurfaceArc,
} from "./lightning";
import { sfx } from "./audio";

export type Phase = "intro" | "play" | "dying" | "cleared" | "paused";

export interface HudState {
  level: number;
  shots: number;
  total: number;
  boss: boolean;
  phase: Phase;
  stuck: number;
}

export interface GameCallbacks {
  onHud?: (h: HudState) => void;
  onGameOver?: (info: { level: number; stuck: number }) => void;
  onClear?: (info: { level: number; reward: number; shotsLeft: number; boss: boolean }) => void;
}

interface Particle {
  kind: ParticleKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  color: string;
  rot: number;
  vr: number;
  grav: number;
  drag: number;
  gl: number;
  tx: number;
  ty: number;
  grow: number;
  len: number;
  thick: number;
  data: number;
  done: boolean;
}

interface Stuck {
  local: number;
  hw: number;
  weapon: string;
  born: number;
  obstacle: boolean;
}

interface Bullet {
  y: number;
  vy: number;
  born: number;
  spin: number;
  lag: number;
}

interface Debris {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vr: number;
  weapon: string;
  life: number;
  obstacle: boolean;
}

interface Floater {
  x: number;
  y: number;
  vy: number;
  life: number;
  max: number;
  text: string;
  color: string;
  size: number;
}

interface YoReturn {
  sx: number;
  sy: number;
  t: number;
  dur: number;
}

export interface LevelCfg {
  shots: number;
  obstacles: number;
  pattern: string;
  speed: number;
  boss: boolean;
}

export function levelCfg(level: number): LevelCfg {
  const boss = level % 5 === 0;
  const shots = Math.min(12, 6 + Math.floor(level / 4) + (boss ? 2 : 0));
  const obstacles = Math.min(6, 1 + Math.floor(level / 4) + (boss ? 1 : 0));
  const speed = Math.min(2.25, 0.8 + level * 0.06) * (boss ? 1.35 : 1);
  const pats = ["const", "wobble", "step", "pause", "zigzag", "chaos"];
  const pattern = boss ? "chaos" : level <= 1 ? "const" : pats[(level - 1) % pats.length];
  return { shots, obstacles, pattern, speed, boss };
}

function angDiff(a: number, b: number) {
  let d = (a - b) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return Math.abs(d);
}
const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private cb: GameCallbacks;
  private raf = 0;
  private last = 0;
  private alive = true;

  W = 0;
  H = 0;
  dpr = 1;
  private bgGrad: CanvasGradient | null = null;
  private vigGrad: CanvasGradient | null = null;

  weapon: Weapon;
  level = 1;
  cfg: LevelCfg = levelCfg(1);
  phase: Phase = "intro";

  private t = 0; // waktu visual (selalu jalan)
  private gt = 0; // waktu gameplay (dipengaruhi slow-mo)
  private introT = 0;
  private endT = 0;
  private firedEnd = false;

  private theta = 0;
  private omegaFn: (t: number) => number = () => 1;
  private kick = 0;
  private kickTarget = 0;
  private nextKick = 2;

  private stuck: Stuck[] = [];
  private bullets: Bullet[] = [];
  private parts: Particle[] = [];
  private debris: Debris[] = [];
  private floats: Floater[] = [];
  private yos: YoReturn[] = [];

  private shots = 0;
  private cooldown = 0;
  private recoil = 0;
  private flash = 0;
  private shake = 0;
  private hitFlash = 0;
  private damageFlash = 0;
  private timeScale = 1;
  private slowmo = 0;
  private offx = 0;
  private offy = 0;
  private offvy = 0;
  private squash = 0;
  private deathSpin = 0;
  private clearAnim = 0;
  private thunderFlash = 0;
  private crawlArcs: { angle: number; life: number; max: number }[] = [];

  private dust: { x: number; y: number; z: number; r: number; p: number }[] = [];
  private hudCache = "";
  private ro: ResizeObserver | null = null;

  constructor(canvas: HTMLCanvasElement, weaponId: string, level: number, cb: GameCallbacks = {}) {
    this.canvas = canvas;
    const c = canvas.getContext("2d", { alpha: false });
    if (!c) throw new Error("canvas 2d unsupported");
    this.ctx = c;
    this.cb = cb;
    this.weapon = getWeapon(weaponId);
    this.resize();
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(canvas.parentElement ?? canvas);
    canvas.addEventListener("pointerdown", this.onPointer);
    window.addEventListener("keydown", this.onKey);
    document.addEventListener("visibilitychange", this.onVis);
    this.startLevel(level);
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.loop);
  }

  destroy() {
    this.alive = false;
    cancelAnimationFrame(this.raf);
    this.ro?.disconnect();
    this.canvas.removeEventListener("pointerdown", this.onPointer);
    window.removeEventListener("keydown", this.onKey);
    document.removeEventListener("visibilitychange", this.onVis);
  }

  private onVis = () => {
    if (document.hidden && this.phase === "play") this.setPaused(true);
  };
  private onKey = (e: KeyboardEvent) => {
    if (e.code === "Space" || e.code === "Enter") {
      e.preventDefault();
      this.fire();
    }
  };
  private onPointer = (e: PointerEvent) => {
    e.preventDefault();
    this.fire();
  };

  setPaused(p: boolean) {
    if (p && this.phase === "play") {
      this.phase = "paused";
      this.pushHud(true);
    } else if (!p && this.phase === "paused") {
      this.phase = "play";
      this.last = performance.now();
      this.pushHud(true);
    }
  }

  setWeapon(id: string) {
    this.weapon = getWeapon(id);
  }

  /* ------------------------------ layout ------------------------------ */
  resize() {
    const host = this.canvas.parentElement;
    const w = Math.max(240, host ? host.clientWidth : window.innerWidth);
    const h = Math.max(360, host ? host.clientHeight : window.innerHeight);
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.W = w;
    this.H = h;
    this.canvas.width = Math.floor(w * this.dpr);
    this.canvas.height = Math.floor(h * this.dpr);
    this.canvas.style.width = w + "px";
    this.canvas.style.height = h + "px";

    const g = this.ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "#0b1428");
    g.addColorStop(0.45, "#080d1c");
    g.addColorStop(1, "#05070f");
    this.bgGrad = g;
    const v = this.ctx.createRadialGradient(w / 2, h * 0.45, Math.min(w, h) * 0.25, w / 2, h * 0.5, Math.max(w, h) * 0.78);
    v.addColorStop(0, "rgba(0,0,0,0)");
    v.addColorStop(1, "rgba(0,0,0,0.72)");
    this.vigGrad = v;

    this.dust = [];
    const n = Math.round(clamp((w * h) / 16000, 26, 70));
    for (let i = 0; i < n; i++)
      this.dust.push({
        x: Math.random() * w,
        y: Math.random() * h,
        z: 0.25 + Math.random() * 0.9,
        r: 0.5 + Math.random() * 1.9,
        p: Math.random() * TAU,
      });
  }

  private get cx() {
    return this.W / 2;
  }
  private get cy() {
    return clamp(this.H * 0.325, 120, this.H * 0.37);
  }
  private get R() {
    return clamp(Math.min(this.W * 0.345, this.H * 0.19), 60, 172);
  }
  private get gs() {
    return clamp(Math.min(this.W / 470, this.H / 800), 0.6, 1.15);
  }
  private get gunY() {
    return this.H - 52;
  }
  private get muzzleY() {
    return this.gunY - this.weapon.muzzle * this.gs;
  }

  /* ------------------------------ level ------------------------------ */
  startLevel(level: number) {
    this.level = Math.max(1, level);
    this.cfg = levelCfg(this.level);
    this.shots = this.cfg.shots;
    this.theta = Math.random() * TAU;
    this.gt = 0;
    this.kick = 0;
    this.kickTarget = 0;
    this.nextKick = 1.8 + Math.random();
    this.omegaFn = this.makeOmega(this.cfg);
    this.stuck = [];
    this.bullets = [];
    this.parts = [];
    this.debris = [];
    this.floats = [];
    this.yos = [];
    this.shake = 0;
    this.hitFlash = 0;
    this.damageFlash = 0;
    this.thunderFlash = 0;
    this.crawlArcs = [];
    this.timeScale = 1;
    this.slowmo = 0;
    this.offx = 0;
    this.offy = 0;
    this.offvy = 0;
    this.squash = 0;
    this.deathSpin = 0;
    this.clearAnim = 0;
    this.recoil = 0;
    this.flash = 0;
    this.firedEnd = false;
    this.endT = 0;

    // Sebar penghalang merata + jitter: dijamin selalu ada celah untuk semua peluru.
    const R = this.R;
    const gap = Math.max(0.34, (22 / R) * 2.2);
    const n = this.cfg.obstacles;
    const stepAng = TAU / Math.max(1, n);
    const rot0 = Math.random() * TAU;
    for (let i = 0; i < n; i++) {
      for (let attempt = 0; attempt < 26; attempt++) {
        const jit = attempt === 0 ? 0 : (Math.random() - 0.5) * stepAng * 0.62;
        const a = rot0 + i * stepAng + jit;
        if (angDiff(a, Math.PI / 2) < 0.42) continue; // jangan persis di zona tembak saat mulai
        if (this.stuck.some((s) => angDiff(s.local + this.theta, a) < gap)) continue;
        this.stuck.push({ local: a - this.theta, hw: 9, weapon: "", born: -99, obstacle: true });
        break;
      }
    }

    this.phase = "intro";
    this.introT = this.cfg.boss ? 1.7 : 1.15;
    if (this.cfg.boss) sfx.boss();
    this.pushHud(true);
  }

  nextLevel() {
    this.startLevel(this.level + 1);
  }
  retry() {
    this.startLevel(this.level);
  }

  private makeOmega(cfg: LevelCfg) {
    const s = cfg.speed;
    const p1 = Math.random() * TAU;
    return (t: number) => {
      switch (cfg.pattern) {
        case "const":
          return s * (Math.floor(t / 7.5) % 2 === 0 ? 1 : -1);
        case "wobble":
          return s * 1.2 * Math.sin(t * 0.85 + p1);
        case "step":
          return s * Math.tanh(3.4 * Math.sin(t * 1.35 + p1));
        case "pause": {
          const cyc = t * 0.48 + p1;
          const c = cyc % 1;
          const dir = Math.floor(cyc) % 2 === 0 ? 1 : -1;
          const ramp = c < 0.62 ? Math.sin((Math.PI * c) / 0.62) : 0;
          return s * 1.55 * dir * ramp;
        }
        case "zigzag": {
          const c = (t * 0.4 + p1) % 1;
          return s * 1.25 * (4 * Math.abs(c - 0.5) - 1);
        }
        default:
          return (
            s *
            0.85 *
            (Math.sin(t * 1.7 + p1) + 0.55 * Math.sin(t * 3.9 + p1 * 2) + 0.32 * Math.sin(t * 7.7 + p1))
          );
      }
    };
  }

  /* ------------------------------ input ------------------------------ */
  fire() {
    if (this.phase === "intro" && this.introT < 0.35) {
      this.introT = Math.min(this.introT, 0.2);
    }
    if (this.phase !== "play" || this.cooldown > 0 || this.shots <= 0) return;
    const w = this.weapon;
    const x = this.cx;
    const y = this.muzzleY;
    const dist = Math.max(60, y - (this.cy + this.R));
    const speed = clamp(this.H * 2.3, 900, 2400) * (w.speedMul ?? 1);
    this.bullets.push({ y: y - 6, vy: -speed, born: this.t, spin: (Math.random() - 0.5) * 6, lag: 0 });
    this.shots--;
    this.cooldown = 0.085;
    this.recoil = 1;
    this.flash = 1;
    void dist;
    w.onFire(this.emit, x, y - 10, this.gs);
    sfx.shoot(w.id);
    this.shake = Math.max(this.shake, 3.2);
    if (this.shots === 0) {
      this.slowmo = 0.95;
      this.floats.push({
        x: this.cx,
        y: this.cy + this.R + 58,
        vy: -22,
        life: 1.1,
        max: 1.1,
        text: "TEMBAKAN TERAKHIR",
        color: "#ffd979",
        size: 13,
      });
    }
    this.pushHud();
  }

  /* ------------------------------ particles ------------------------------ */
  private emit: Emit = (p: ParticleInit) => {
    if (this.parts.length > 460) this.parts.splice(0, 60);
    this.parts.push({
      kind: p.kind ?? "spark",
      x: p.x,
      y: p.y,
      vx: p.vx ?? 0,
      vy: p.vy ?? 0,
      life: p.life ?? 0.5,
      max: p.life ?? 0.5,
      size: p.size ?? 2,
      color: p.color ?? "#ffffff",
      rot: p.rot ?? 0,
      vr: p.vr ?? 0,
      grav: p.grav ?? 0,
      drag: p.drag ?? 0,
      gl: p.glow ?? 0,
      tx: p.tx ?? 0,
      ty: p.ty ?? 0,
      grow: p.grow ?? 0,
      len: p.len ?? 0,
      thick: p.thick ?? 2,
      data: p.data ?? 0,
      done: false,
    });
  };

  private burst(x: number, y: number, n: number, colors: string[], power = 1) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU;
      const sp = (60 + Math.random() * 340) * power;
      this.emit({
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life: 0.4 + Math.random() * 0.7,
        size: 1.4 + Math.random() * 3,
        color: colors[i % colors.length],
        kind: "spark",
        grav: 300,
        drag: 1.2,
        glow: 12,
      });
    }
  }

  /* ------------------------------ loop ------------------------------ */
  private loop = (ts: number) => {
    if (!this.alive) return;
    this.raf = requestAnimationFrame(this.loop);
    const raw = clamp((ts - this.last) / 1000, 0, 0.05);
    this.last = ts;
    this.t += raw;
    if (this.phase !== "paused") {
      if (this.slowmo > 0) {
        this.slowmo -= raw;
        this.timeScale += (0.3 - this.timeScale) * Math.min(1, raw * 9);
      } else {
        this.timeScale += (1 - this.timeScale) * Math.min(1, raw * 4.5);
      }
      this.update(raw * this.timeScale, raw);
    }
    this.render();
  };

  private update(dt: number, raw: number) {
    const w = this.weapon;

    if (this.phase === "intro") {
      this.introT -= raw;
      if (this.introT <= 0) {
        this.phase = "play";
        this.pushHud(true);
      }
    }

    // rotasi lingkaran
    if (this.phase !== "cleared") {
      this.gt += dt;
      let om = this.omegaFn(this.gt) + this.kick;
      if (this.phase === "dying") om += this.deathSpin;
      this.theta += om * dt;
      this.kick *= Math.exp(-2.6 * dt);
      // perubahan arah halus (terbaca mata), makin sering di level tinggi/boss
      this.nextKick -= dt;
      if (this.nextKick <= 0 && this.phase === "play") {
        this.nextKick = this.cfg.boss ? 1.8 + Math.random() * 2.2 : 3.4 + Math.random() * 4;
        if (this.level >= 4) {
          const amt = (0.16 + Math.random() * 0.26) * (this.cfg.boss ? 1.5 : 1);
          this.kickTarget = (Math.random() < 0.5 ? -1 : 1) * amt;
        }
      }
      this.kick += (this.kickTarget - this.kick) * Math.min(1, dt * 2.2);
      this.kickTarget *= Math.exp(-0.7 * dt);
    }

    if (this.phase === "dying") this.deathSpin = Math.min(26, this.deathSpin + raw * 22);

    // spring offset lingkaran (efek tarikan black hole / guncangan)
    this.offvy += (-this.offy * 120 - this.offvy * 9) * dt;
    this.offy += this.offvy * dt;
    this.offx *= Math.exp(-6 * dt);
    this.squash *= Math.exp(-5.5 * dt);
    this.hitFlash *= Math.exp(-7 * dt);
    this.damageFlash *= Math.exp(-3.4 * dt);
    this.thunderFlash *= Math.exp(-8 * raw);
    for (let i = this.crawlArcs.length - 1; i >= 0; i--) {
      this.crawlArcs[i].life -= raw;
      if (this.crawlArcs[i].life <= 0) this.crawlArcs.splice(i, 1);
    }
    this.shake *= Math.exp(-6.5 * dt);
    this.recoil *= Math.exp(-9 * dt);
    this.flash *= Math.exp(-14 * dt);
    this.cooldown = Math.max(0, this.cooldown - raw);
    if (this.phase === "cleared") this.clearAnim = Math.min(1, this.clearAnim + raw * 1.1);

    // peluru terbang
    const bottomY = this.cy + this.offy + this.R + this.weapon.embed;
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      const prevY = b.y;
      b.y += b.vy * dt;
      if (prevY > bottomY && b.y <= bottomY) b.lag = (bottomY - b.y) / Math.max(1, -b.vy);
      // jejak
      if (Math.random() < 0.85)
        this.emit({
          x: this.cx + (Math.random() - 0.5) * 4,
          y: b.y + 12,
          vx: (Math.random() - 0.5) * 14,
          vy: 40 + Math.random() * 60,
          life: 0.22 + Math.random() * 0.16,
          size: 1 + Math.random() * 2.2,
          color: Math.random() < 0.5 ? w.hue : w.hue2,
          kind: "streak",
          drag: 2,
          glow: 10,
        });
      if (b.y <= bottomY) {
        this.bullets.splice(i, 1);
        this.resolveHit(b);
      }
    }

    // yoyo kembali
    for (let i = this.yos.length - 1; i >= 0; i--) {
      const y = this.yos[i];
      y.t += raw;
      if (y.t >= y.dur) this.yos.splice(i, 1);
      else if (Math.random() < 0.5)
        this.emit({
          x: this.cx,
          y: lerp(y.sy, this.muzzleY, ease(y.t / y.dur)),
          life: 0.25,
          size: 1.6,
          color: "#ffd93d",
          kind: "spark",
          vx: (Math.random() - 0.5) * 40,
          vy: (Math.random() - 0.5) * 40,
          glow: 8,
        });
    }

    // debris (game over)
    for (let i = this.debris.length - 1; i >= 0; i--) {
      const d = this.debris[i];
      d.life -= raw;
      d.vy += 900 * dt;
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      d.rot += d.vr * dt;
      if (d.life <= 0 || d.y > this.H + 60) this.debris.splice(i, 1);
    }

    this.updateParticles(dt);

    // floaters
    for (let i = this.floats.length - 1; i >= 0; i--) {
      const f = this.floats[i];
      f.life -= raw;
      f.y += f.vy * raw;
      f.vy *= 0.96;
      if (f.life <= 0) this.floats.splice(i, 1);
    }

    // partikel ambient senjata
    if (this.phase === "play" || this.phase === "intro") w.ambient(this.emit, this.cx, this.gunY, this.gs, this.t, dt);

    // akhir level / kalah
    if (this.phase === "dying" || this.phase === "cleared") {
      this.endT -= raw;
      if (this.endT <= 0 && !this.firedEnd) {
        this.firedEnd = true;
        if (this.phase === "dying") this.cb.onGameOver?.({ level: this.level, stuck: this.countStuck() });
        else
          this.cb.onClear?.({
            level: this.level,
            reward: this.reward(),
            shotsLeft: this.shots,
            boss: this.cfg.boss,
          });
      }
    }
  }

  reward() {
    return (this.cfg.boss ? 60 + this.level * 6 : 14 + this.level * 3) + this.shots * 4;
  }
  private countStuck() {
    return this.stuck.filter((s) => !s.obstacle).length;
  }

  private updateParticles(dt: number) {
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const p = this.parts[i];
      p.life -= dt;
      if (p.life <= 0) {
        if (p.kind === "hole") this.holeCollapse(p);
        this.parts.splice(i, 1);
        continue;
      }
      switch (p.kind) {
        case "suck": {
          const dx = p.tx - p.x;
          const dy = p.ty - p.y;
          const d = Math.hypot(dx, dy) || 1;
          const f = 2600 / Math.max(24, d);
          p.vx += (dx / d) * f * dt * 60 * 0.016;
          p.vy += (dy / d) * f * dt * 60 * 0.016;
          p.vx *= 0.94;
          p.vy *= 0.94;
          if (d < 7) p.life = Math.min(p.life, 0.05);
          break;
        }
        case "hole": {
          p.size += p.grow * dt * 0.4;
          const rr = 70 + p.size * 2;
          for (const q of this.parts) {
            if (q === p || q.kind === "hole") continue;
            const dx = p.x - q.x;
            const dy = p.y - q.y;
            const d2 = dx * dx + dy * dy;
            if (d2 < rr * rr && d2 > 1) {
              const d = Math.sqrt(d2);
              const f = (420 * dt) / d;
              q.vx += dx * f;
              q.vy += dy * f;
            }
          }
          break;
        }
        case "crystal": {
          if (!p.done && p.life / p.max < 0.34) {
            p.done = true;
            for (let k = 0; k < 7; k++) {
              const a = p.rot - Math.PI / 2 + (Math.random() - 0.5) * 1.6;
              const sp = 70 + Math.random() * 210;
              this.emit({
                x: p.x + Math.cos(a) * p.size,
                y: p.y + Math.sin(a) * p.size,
                vx: Math.cos(a) * sp,
                vy: Math.sin(a) * sp,
                life: 0.35 + Math.random() * 0.4,
                size: 1.2 + Math.random() * 2.4,
                color: p.color,
                kind: "shard",
                grav: 420,
                drag: 1.2,
                rot: Math.random() * TAU,
                vr: (Math.random() - 0.5) * 14,
                glow: 10,
              });
            }
          }
          break;
        }
        case "smoke":
          p.size += p.grow * dt;
          p.vy += -18 * dt;
          break;
        case "ring":
          p.size += p.grow * dt;
          break;
        case "mote":
          p.x += Math.sin(this.t * 1.4 + p.rot) * 8 * dt;
          break;
        default:
          break;
      }
      if (
        p.kind !== "hole" &&
        p.kind !== "ring" &&
        p.kind !== "flash" &&
        p.kind !== "star" &&
        p.kind !== "crystal" &&
        p.kind !== "arc"
      ) {
        p.vy += p.grav * dt;
        if (p.drag) {
          const k = Math.exp(-p.drag * dt);
          p.vx *= k;
          p.vy *= k;
        }
        p.x += p.vx * dt;
        p.y += p.vy * dt;
      }
      p.rot += p.vr * dt;
    }
  }

  private holeCollapse(p: Particle) {
    this.emit({ x: p.x, y: p.y, kind: "ring", life: 0.5, size: p.size, grow: 240, color: "#b06bff", thick: 3, glow: 20 });
    this.emit({ x: p.x, y: p.y, kind: "ring", life: 0.7, size: p.size * 0.6, grow: 130, color: "#3ee0ff", thick: 1.6, glow: 14 });
    this.emit({ x: p.x, y: p.y, kind: "flash", life: 0.22, size: 60, color: "#d9b6ff", glow: 24 });
    this.burst(p.x, p.y, 20, ["#b06bff", "#3ee0ff", "#e6d4ff"], 1.1);
    this.shake = Math.max(this.shake, 6);
  }

  /* ------------------------------ hit ------------------------------ */
  private resolveHit(b: Bullet) {
    const w = this.weapon;
    const R = this.R;
    // sudut dihitung pada saat peluru benar-benar menyentuh lingkaran
    const omNow = this.omegaFn(this.gt) + this.kick;
    const thetaHit = this.theta - omNow * (b.lag || 0);
    const local = Math.PI / 2 - thetaHit;
    const hx = this.cx + this.offx;
    const hy = this.cy + this.offy + R;

    // cari tabrakan sudut dengan penghalang
    let crash = false;
    let closest = 99;
    for (const s of this.stuck) {
      const d = angDiff(s.local, local);
      const need = ((s.hw + w.halfW) * this.bs) / R + 0.01;
      if (d < need) crash = true;
      closest = Math.min(closest, d - need);
    }

    if (crash) {
      this.gameOver(hx, hy);
      return;
    }

    this.stuck.push({ local, hw: w.halfW, weapon: w.id, born: this.t, obstacle: false });
    w.onImpact(this.emit, hx, hy, this.gs, {
      nx: 0,
      ny: 1,
      power: 1,
      last: this.shots === 0,
      mx: this.cx,
      my: this.muzzleY,
    });
    sfx.stick(w.id);
    if (w.id === "yoyo") this.yos.push({ sx: hx, sy: hy, t: 0, dur: 0.42 });

    this.shake = Math.max(this.shake, w.shake);
    this.hitFlash = 1;
    this.buzz(9);
    if (w.id === "keris") {
      this.thunderFlash = 1.0;
      this.crawlArcs.push({
        angle: local,
        life: 0.38,
        max: 0.38,
      });
    }
    this.squash = 1;
    this.offvy += w.pull * 26;
    this.offx += (Math.random() - 0.5) * 2;
    const dir = this.omegaFn(this.gt) >= 0 ? 1 : -1;
    this.kick += dir * (0.12 + Math.random() * 0.16);

    if (closest < 0.09) {
      sfx.close();
      this.floats.push({
        x: hx + (Math.random() - 0.5) * 40,
        y: hy + 26,
        vy: -46,
        life: 0.75,
        max: 0.75,
        text: "TIPIS!",
        color: "#ff4d6a",
        size: 15,
      });
    }

    if (this.shots <= 0 && this.bullets.length === 0) {
      this.phase = "cleared";
      this.endT = 1.5;
      this.slowmo = 0.7;
      sfx.clear();
      this.celebrate(hx, hy);
      this.pushHud(true);
    } else {
      this.pushHud();
    }
  }

  private celebrate(x: number, y: number) {
    const cols = [this.weapon.hue, this.weapon.hue2, "#ffd979", "#ffffff", "#8affc1"];
    for (let i = 0; i < 90; i++) {
      const a = Math.random() * TAU;
      const sp = 90 + Math.random() * 520;
      this.emit({
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 90,
        life: 0.7 + Math.random() * 1.1,
        size: 2.4 + Math.random() * 4.5,
        color: cols[i % cols.length],
        kind: i % 3 === 0 ? "confetti" : "spark",
        grav: 460,
        drag: 0.7,
        vr: (Math.random() - 0.5) * 18,
        glow: 10,
      });
    }
    this.emit({ x, y, kind: "ring", life: 0.9, size: 10, grow: 620, color: "#ffffff", thick: 4, glow: 24 });
    this.emit({ x, y, kind: "ring", life: 1.2, size: 6, grow: 380, color: this.weapon.hue, thick: 2.4, glow: 20 });
    this.shake = Math.max(this.shake, 9);
    this.buzz([10, 30, 10, 30, 26]);
    this.floats.push({
      x: this.cx,
      y: this.cy - this.R - 18,
      vy: -26,
      life: 1.5,
      max: 1.5,
      text: `+${this.reward()} KOIN`,
      color: "#ffd979",
      size: 18,
    });
  }

  private gameOver(x: number, y: number) {
    this.phase = "dying";
    this.endT = 1.35;
    this.deathSpin = 4;
    this.timeScale = 1;
    this.slowmo = 0;
    this.shake = 20;
    this.damageFlash = 1;
    this.buzz([16, 40, 60]);
    sfx.crash();
    this.burst(x, y, 40, ["#ff4d6a", "#ff9a3d", "#ffffff"], 1.4);
    this.emit({ x, y, kind: "ring", life: 0.7, size: 8, grow: 520, color: "#ff4d6a", thick: 5, glow: 26 });
    this.emit({ x, y, kind: "flash", life: 0.3, size: 130, color: "#ff6b6b", glow: 40 });
    // semua yang menancap terlempar lepas
    const R = this.R;
    for (const s of this.stuck) {
      const a = s.local + this.theta;
      const px = this.cx + Math.cos(a) * R;
      const py = this.cy + Math.sin(a) * R;
      this.debris.push({
        x: px,
        y: py,
        vx: Math.cos(a) * (160 + Math.random() * 320) + (Math.random() - 0.5) * 120,
        vy: Math.sin(a) * (160 + Math.random() * 320) - 160,
        rot: a,
        vr: (Math.random() - 0.5) * 16,
        weapon: s.weapon,
        life: 2.2,
        obstacle: s.obstacle,
      });
    }
    this.stuck = [];
    this.bullets = [];
    this.floats.push({
      x: this.cx,
      y: this.cy + R + 40,
      vy: -18,
      life: 1.3,
      max: 1.3,
      text: "KENA PENGHALANG",
      color: "#ff4d6a",
      size: 17,
    });
    this.pushHud(true);
  }

  private buzz(pattern: number | number[]) {
    try {
      const nav = typeof navigator !== "undefined" ? (navigator as Navigator & { vibrate?: (p: number | number[]) => void }) : null;
      nav?.vibrate?.(pattern);
    } catch {
      /* ignore */
    }
  }

  private pushHud(force = false) {
    const h: HudState = {
      level: this.level,
      shots: this.shots,
      total: this.cfg.shots,
      boss: this.cfg.boss,
      phase: this.phase,
      stuck: this.countStuck(),
    };
    const key = `${h.level}|${h.shots}|${h.phase}|${h.boss}`;
    if (force || key !== this.hudCache) {
      this.hudCache = key;
      this.cb.onHud?.(h);
    }
  }

  /* ============================== RENDER ============================== */
  private render() {
    const ctx = this.ctx;
    const { W, H } = this;
    ctx.save();
    ctx.scale(this.dpr, this.dpr);

    // guncangan layar
    const sh = this.shake;
    if (sh > 0.2) ctx.translate((Math.random() - 0.5) * sh, (Math.random() - 0.5) * sh);

    ctx.fillStyle = this.bgGrad ?? "#05070f";
    ctx.fillRect(-30, -30, W + 60, H + 60);

    this.drawAmbient();
    this.drawAimGuide();
    this.drawTarget();
    this.drawParticles(false);
    this.drawStuckItems();
    this.drawBullets();
    this.drawDebris();
    this.drawYoReturns();
    this.drawGun();
    this.drawAmmo();
    this.drawParticles(true);
    this.drawFloaters();

    // vignette + kilat damage
    ctx.fillStyle = this.vigGrad!;
    ctx.fillRect(-30, -30, W + 60, H + 60);
    if (this.damageFlash > 0.01) {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.2, W / 2, H / 2, H * 0.8);
      g.addColorStop(0, "rgba(255,0,60,0)");
      g.addColorStop(1, rgba("#ff2a4d", 0.55 * this.damageFlash));
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }
    if (this.thunderFlash > 0.01) {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = rgba("#4deeea", 0.04 * this.thunderFlash);
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }
    if (this.slowmo > 0 && this.timeScale < 0.75) {
      ctx.save();
      ctx.globalAlpha = (0.75 - this.timeScale) * 0.6;
      ctx.fillStyle = "#04060d";
      ctx.fillRect(0, 0, W, 26);
      ctx.fillRect(0, H - 26, W, 26);
      ctx.restore();
    }
    ctx.restore();
  }

  private drawAmbient() {
    const ctx = this.ctx;
    const { W, H } = this;
    const hue = this.cfg.boss ? "#ff4d6a" : this.weapon.hue;

    // cahaya di belakang lingkaran
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const g = ctx.createRadialGradient(this.cx, this.cy, this.R * 0.4, this.cx, this.cy, this.R * 3.1);
    g.addColorStop(0, rgba(hue, 0.16));
    g.addColorStop(0.5, rgba(hue, 0.05));
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(this.cx, this.cy, this.R * 3.1, 0, TAU);
    ctx.fill();

    // bara di bawah (senjata)
    const g2 = ctx.createRadialGradient(this.cx, H, 10, this.cx, H, H * 0.42);
    g2.addColorStop(0, rgba(this.weapon.hue2, 0.13));
    g2.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g2;
    ctx.fillRect(0, H * 0.55, W, H * 0.45);
    ctx.restore();

    // cincin latar berputar lambat
    ctx.save();
    ctx.translate(this.cx, this.cy);
    ctx.strokeStyle = "rgba(255,255,255,0.045)";
    for (let i = 0; i < 3; i++) {
      const rr = this.R * (1.9 + i * 0.62);
      ctx.save();
      ctx.rotate(this.t * (i % 2 === 0 ? 0.06 : -0.045) + i);
      ctx.setLineDash([i === 1 ? 3 : 16, i === 1 ? 22 : 30]);
      ctx.lineWidth = i === 1 ? 1 : 1.6;
      ctx.beginPath();
      ctx.arc(0, 0, rr, 0, TAU);
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();

    // debu ambient
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const d of this.dust) {
      d.y -= (7 + d.z * 14) * 0.016;
      d.x += Math.sin(this.t * 0.5 + d.p) * 0.18;
      if (d.y < -6) {
        d.y = H + 6;
        d.x = Math.random() * W;
      }
      const a = 0.05 + d.z * 0.16;
      ctx.fillStyle = rgba(d.z > 0.7 ? "#bcd8ff" : "#ffd9a0", a);
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r * d.z, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  private drawAimGuide() {
    if (this.phase !== "play" && this.phase !== "intro") return;
    const ctx = this.ctx;
    const y0 = this.muzzleY - 14;
    const y1 = this.cy + this.offy + this.R;
    ctx.save();
    ctx.strokeStyle = rgba(this.weapon.hue, 0.16);
    ctx.lineWidth = 1.4;
    ctx.setLineDash([5, 11]);
    ctx.lineDashOffset = -this.t * 46;
    ctx.beginPath();
    ctx.moveTo(this.cx, y0);
    ctx.lineTo(this.cx, y1 + 16);
    ctx.stroke();
    ctx.setLineDash([]);
    // penanda titik tumbukan
    const pulse = 0.5 + 0.5 * Math.sin(this.t * 5);
    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = rgba(this.weapon.hue, 0.3 + pulse * 0.35);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(this.cx, y1, 9 + pulse * 4, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }

  private drawTarget() {
    const ctx = this.ctx;
    const R = this.R;
    const boss = this.cfg.boss;
    const dying = this.phase === "dying";
    const cleared = this.phase === "cleared";
    let scale = 1;
    let alpha = 1;
    if (cleared) {
      const e = ease(this.clearAnim);
      scale = 1 + e * 0.22;
      alpha = 1 - e * e;
    }
    const sq = this.squash * 0.05;

    ctx.save();
    ctx.translate(this.cx + this.offx, this.cy + this.offy);
    ctx.globalAlpha = alpha;
    ctx.scale(scale * (1 + sq), scale * (1 - sq));

    const accent = boss ? "#ff4d6a" : this.weapon.hue;
    const accent2 = boss ? "#ff9a3d" : this.weapon.hue2;

    // piringan
    ctx.save();
    ctx.rotate(this.theta);
    const disc = ctx.createRadialGradient(0, -R * 0.3, R * 0.1, 0, 0, R);
    disc.addColorStop(0, boss ? "#3a1220" : "#1b2748");
    disc.addColorStop(0.55, boss ? "#220b16" : "#111a33");
    disc.addColorStop(1, boss ? "#150610" : "#0a1020");
    ctx.fillStyle = disc;
    ctx.beginPath();
    ctx.arc(0, 0, R, 0, TAU);
    ctx.fill();

    // gigi-gigi lingkaran (penanda rotasi) + jejak gerak saat cepat
    const om = this.omegaFn(this.gt) + this.kick;
    const blur = clamp(Math.abs(om) / 5.5, 0, 1);
    if (blur > 0.22) {
      const dir = Math.sign(om) || 1;
      for (let k = 2; k >= 1; k--) {
        ctx.save();
        ctx.rotate(-dir * blur * 0.13 * k);
        this.drawTeeth(ctx, R, boss ? 18 : 14, accent, (0.2 * blur) / k, false);
        ctx.restore();
      }
    }
    this.drawTeeth(ctx, R, boss ? 18 : 14, accent, 1, true);

    // alur dalam
    ctx.strokeStyle = rgba("#ffffff", 0.07);
    ctx.lineWidth = 1.4;
    for (const f of [0.74, 0.52, 0.3]) {
      ctx.beginPath();
      ctx.arc(0, 0, R * f, 0, TAU);
      ctx.stroke();
    }
    // runa
    ctx.strokeStyle = rgba(accent, 0.3);
    ctx.lineWidth = 2;
    for (let i = 0; i < 6; i++) {
      const a = (i * TAU) / 6 + this.t * 0.05;
      ctx.beginPath();
      ctx.arc(0, 0, R * 0.63, a, a + 0.42);
      ctx.stroke();
    }

    if (boss) {
      // duri gergaji
      ctx.fillStyle = rgba("#ff4d6a", 0.55);
      glow(ctx, "#ff2a4d", 16);
      for (let i = 0; i < 12; i++) {
        const a = (i * TAU) / 12;
        ctx.save();
        ctx.rotate(a);
        ctx.beginPath();
        ctx.moveTo(-9, -R * 0.98);
        ctx.lineTo(0, -R * 1.17 - Math.sin(this.t * 4 + i) * 2.5);
        ctx.lineTo(9, -R * 0.98);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
      noGlow(ctx);
    }

    // inti
    const core = 0.5 + 0.5 * Math.sin(this.t * (boss ? 6 : 2.4));
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const cg = ctx.createRadialGradient(0, 0, 1, 0, 0, R * 0.42);
    cg.addColorStop(0, rgba(accent2, 0.35 + core * 0.35));
    cg.addColorStop(0.5, rgba(accent, 0.12));
    cg.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = cg;
    ctx.beginPath();
    ctx.arc(0, 0, R * 0.42, 0, TAU);
    ctx.fill();
    ctx.restore();

    if (boss) {
      ctx.save();
      ctx.rotate(-this.theta * 2);
      ctx.strokeStyle = rgba("#ffd0d8", 0.5);
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i < 3; i++) {
        const a = (i * TAU) / 3;
        const px = Math.cos(a) * R * 0.2;
        const py = Math.sin(a) * R * 0.2;
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.stroke();
      ctx.fillStyle = rgba("#ff2a4d", 0.5 + core * 0.5);
      glow(ctx, "#ff2a4d", 20);
      ctx.beginPath();
      ctx.arc(0, 0, R * 0.075 + core * 2, 0, TAU);
      ctx.fill();
      noGlow(ctx);
      ctx.restore();
    }
    ctx.restore(); // rotate theta

    // bibir lingkaran (highlight statis)
    const rim = ctx.createLinearGradient(0, -R, 0, R);
    rim.addColorStop(0, rgba("#ffffff", 0.5));
    rim.addColorStop(0.45, rgba(accent, 0.65));
    rim.addColorStop(1, rgba(accent2, 0.35));
    ctx.strokeStyle = rim;
    ctx.lineWidth = boss ? 6 : 5;
    glow(ctx, accent, dying ? 26 : 14);
    ctx.beginPath();
    ctx.arc(0, 0, R, 0, TAU);
    ctx.stroke();
    noGlow(ctx);
    ctx.strokeStyle = rgba("#ffffff", 0.16);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, 0, R - 4, 0, TAU);
    ctx.stroke();

    if (this.hitFlash > 0.02) {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = rgba("#ffffff", this.hitFlash * 0.22);
      ctx.beginPath();
      ctx.arc(0, 0, R, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
    // Crawling surface lightning arcs (arus petir menjalar di permukaan lingkaran)
    for (const ca of this.crawlArcs) {
      const pRatio = ca.life / ca.max;
      const arcSweep = (1 - pRatio) * 1.6;
      drawCircleSurfaceArc(
        ctx,
        0,
        0,
        R,
        ca.angle - arcSweep * 0.5 + this.theta,
        arcSweep,
        Math.floor(this.t * 30),
        "#4deeea"
      );
    }
    if (dying) {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = rgba("#ff2a4d", 0.2 + 0.14 * Math.sin(this.t * 30));
      ctx.beginPath();
      ctx.arc(0, 0, R, 0, TAU);
      ctx.fill();
      // retakan
      ctx.strokeStyle = rgba("#ffd7de", 0.7);
      ctx.lineWidth = 2;
      for (let i = 0; i < 5; i++) {
        const a = (i * TAU) / 5 + 0.4;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        let px = 0;
        let py = 0;
        for (let k = 1; k <= 4; k++) {
          px += Math.cos(a + (k % 2 ? 0.4 : -0.4)) * (R / 4);
          py += Math.sin(a + (k % 2 ? 0.4 : -0.4)) * (R / 4);
          ctx.lineTo(px, py);
        }
        ctx.stroke();
      }
      ctx.restore();
    }
    ctx.restore();
  }

  private drawTeeth(
    ctx: CanvasRenderingContext2D,
    R: number,
    n: number,
    accent: string,
    alpha: number,
    hero: boolean
  ) {
    ctx.save();
    ctx.globalAlpha = alpha;
    for (let i = 0; i < n; i++) {
      const a = (i * TAU) / n;
      ctx.save();
      ctx.rotate(a);
      ctx.beginPath();
      ctx.moveTo(-R * 0.055, -R * 0.88);
      ctx.lineTo(R * 0.055, -R * 0.88);
      ctx.lineTo(R * 0.036, -R * 0.985);
      ctx.lineTo(-R * 0.036, -R * 0.985);
      ctx.closePath();
      const isHero = hero && i === 0;
      ctx.fillStyle = isHero ? rgba(accent, 0.95) : rgba("#ffffff", 0.13);
      if (isHero) glow(ctx, accent, 14);
      ctx.fill();
      noGlow(ctx);
      ctx.restore();
    }
    ctx.restore();
  }

  private drawStuckItems() {
    const ctx = this.ctx;
    const R = this.R;
    const bottomZone = Math.PI / 2;
    const many = this.stuck.length > 11;
    // saat level selesai, item menancap ikut membesar & memudar bersama lingkaran
    const cleared = this.phase === "cleared";
    const e = cleared ? ease(this.clearAnim) : 0;
    const sc = cleared ? 1 + e * 0.22 : 1;
    const sq = this.squash * 0.05;
    const ocx = this.cx + this.offx;
    const ocy = this.cy + this.offy;
    ctx.save();
    ctx.globalAlpha = cleared ? Math.max(0, 1 - e * e) : 1;
    ctx.translate(ocx, ocy);
    ctx.scale(sc * (1 + sq), sc * (1 - sq));
    ctx.translate(-ocx, -ocy);
    for (const s of this.stuck) {
      const a = s.local + this.theta;
      const px = this.cx + this.offx + Math.cos(a) * R;
      const py = this.cy + this.offy + Math.sin(a) * R;
      const near = 1 - clamp(angDiff(a, bottomZone) / 1.1, 0, 1);
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(a - Math.PI / 2);
      ctx.scale(this.bs, this.bs);
      if (s.obstacle) {
        // penghalang: paku baja berujung merah
        if (near > 0.05) {
          ctx.save();
          ctx.globalCompositeOperation = "lighter";
          ctx.fillStyle = rgba("#ff2a4d", near * (many ? 0.18 : 0.28));
          ctx.beginPath();
          ctx.arc(0, 14, 22, 0, TAU);
          ctx.fill();
          ctx.restore();
        }
        ctx.translate(0, 13);
        ctx.fillStyle = "#2b3350";
        ctx.beginPath();
        ctx.moveTo(-7, -16);
        ctx.lineTo(7, -16);
        ctx.lineTo(5.4, 12);
        ctx.lineTo(-5.4, 12);
        ctx.closePath();
        const mg = ctx.createLinearGradient(-7, 0, 7, 0);
        mg.addColorStop(0, "#39415f");
        mg.addColorStop(0.4, "#8e9ac4");
        mg.addColorStop(0.62, "#c8d4f5");
        mg.addColorStop(1, "#2c3350");
        ctx.fillStyle = mg;
        ctx.fill();
        ctx.strokeStyle = rgba("#0a0d18", 0.9);
        ctx.lineWidth = 1.2;
        ctx.stroke();
        // kepala paku
        ctx.beginPath();
        ctx.moveTo(-11, 12);
        ctx.lineTo(11, 12);
        ctx.lineTo(8, 20);
        ctx.lineTo(-8, 20);
        ctx.closePath();
        ctx.fillStyle = rgba("#ff4d6a", 0.9);
        glow(ctx, "#ff2a4d", 12 + near * 12);
        ctx.fill();
        noGlow(ctx);
        ctx.strokeStyle = rgba("#ffd7de", 0.5);
        ctx.lineWidth = 1;
        ctx.stroke();
        // gerigi
        ctx.fillStyle = "#59628a";
        for (let i = -1; i <= 1; i += 2) {
          ctx.beginPath();
          ctx.moveTo(i * 5.4, -2);
          ctx.lineTo(i * 12, -7);
          ctx.lineTo(i * 5.4, -11);
          ctx.closePath();
          ctx.fill();
        }
      } else {
        const wpn = getWeapon(s.weapon);
        const age = this.t - s.born;
        ctx.translate(0, wpn.embed);
        if (wpn.drawStuck) wpn.drawStuck(ctx, { t: this.t, age });
        else wpn.drawBullet(ctx, { t: this.t, rot: 0, speed: 0 });
      }
      ctx.restore();
    }
    ctx.restore();
  }

  private get bs() {
    return clamp(this.gs, 0.78, 1.08);
  }

  private drawBullets() {
    const ctx = this.ctx;
    const bs = this.bs;
    for (const b of this.bullets) {
      ctx.save();
      ctx.translate(this.cx, b.y);
      ctx.scale(bs, bs);
      this.weapon.drawBullet(ctx, { t: this.t, rot: (this.t - b.born) * b.spin, speed: b.vy });
      ctx.restore();
    }
  }

  private drawDebris() {
    const ctx = this.ctx;
    for (const d of this.debris) {
      ctx.save();
      ctx.translate(d.x, d.y);
      ctx.rotate(d.rot);
      ctx.globalAlpha = clamp(d.life, 0, 1);
      if (d.obstacle) {
        ctx.fillStyle = "#5a648c";
        ctx.fillRect(-5, -14, 10, 28);
        ctx.fillStyle = rgba("#ff4d6a", 0.85);
        ctx.fillRect(-8, 10, 16, 7);
      } else {
        getWeapon(d.weapon).drawMini(ctx, { t: this.t });
      }
      ctx.restore();
    }
  }

  private drawYoReturns() {
    const ctx = this.ctx;
    for (const y of this.yos) {
      const p = ease(clamp(y.t / y.dur, 0, 1));
      const mx = this.cx;
      const my = this.muzzleY - 10;
      const x = lerp(y.sx, mx, p);
      const yy = lerp(y.sy, my, p) - Math.sin(p * Math.PI) * 26;
      ctx.save();
      ctx.strokeStyle = rgba("#fff6d8", 0.55 * (1 - p * 0.4));
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(mx, my);
      ctx.quadraticCurveTo((mx + x) / 2 + Math.sin(this.t * 22) * 5, (my + yy) / 2 + 12 * (1 - p), x, yy);
      ctx.stroke();
      ctx.translate(x, yy);
      this.weapon.drawBullet(ctx, { t: this.t, rot: this.t * 30, speed: 0 });
      ctx.restore();
    }
  }

  private drawGun() {
    const ctx = this.ctx;
    const s = this.gs;
    ctx.save();
    // bayangan lantai
    ctx.fillStyle = "rgba(0,0,0,0.42)";
    ctx.beginPath();
    ctx.ellipse(this.cx, this.gunY + 12, 44 * s, 9 * s, 0, 0, TAU);
    ctx.fill();
    ctx.translate(this.cx, this.gunY);
    ctx.scale(s, s);
    this.weapon.drawGun(ctx, { t: this.t, recoil: this.recoil, flash: this.flash, s });
    ctx.restore();
  }

  private drawAmmo() {
    const ctx = this.ctx;
    const n = this.shots;
    if (n <= 0) return;
    const gap = clamp(26, 14, (this.W - 40) / Math.max(6, n));
    const totalW = (n - 1) * gap;
    const y = this.H - 24;
    ctx.save();
    for (let i = 0; i < n; i++) {
      const x = this.cx - totalW / 2 + i * gap;
      const bob = Math.sin(this.t * 2.4 + i * 0.5) * 1.6;
      ctx.save();
      ctx.translate(x, y + bob);
      ctx.scale(0.72, 0.72);
      ctx.globalAlpha = 0.95;
      this.weapon.drawMini(ctx, { t: this.t + i * 0.3 });
      ctx.restore();
    }
    ctx.restore();
  }

  private drawFloaters() {
    const ctx = this.ctx;
    ctx.save();
    ctx.textAlign = "center";
    for (const f of this.floats) {
      const a = clamp(f.life / f.max, 0, 1);
      ctx.globalAlpha = a > 0.75 ? (1 - a) * 4 : a;
      ctx.font = `${f.size}px "Space Grotesk", sans-serif`;
      ctx.fillStyle = f.color;
      glow(ctx, rgba(f.color, 0.9), 12);
      ctx.fillText(f.text, f.x, f.y);
      noGlow(ctx);
    }
    ctx.restore();
  }

  private drawParticles(top: boolean) {
    const ctx = this.ctx;
    const cheap = this.parts.length > 130; // jaga 60fps di perangkat lemah
    ctx.save();
    for (const p of this.parts) {
      const k = p.life / p.max;
      const isTop =
        p.kind === "ring" ||
        p.kind === "flash" ||
        p.kind === "star" ||
        p.kind === "hole" ||
        p.kind === "crystal" ||
        p.kind === "arc";
      if (isTop !== top) continue;
      ctx.globalAlpha = 1;
      switch (p.kind) {
        case "spark":
        case "streak": {
          ctx.globalCompositeOperation = "lighter";
          ctx.strokeStyle = rgba(p.color, clamp(k * 1.3, 0, 1));
          ctx.lineWidth = p.size * (0.4 + k * 0.6);
          ctx.lineCap = "round";
          if (p.gl && !cheap) glow(ctx, p.color, p.gl);
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - p.vx * 0.022, p.y - p.vy * 0.022);
          ctx.stroke();
          noGlow(ctx);
          break;
        }
        case "mote": {
          ctx.globalCompositeOperation = "lighter";
          ctx.fillStyle = rgba(p.color, clamp(Math.sin(k * Math.PI) * 0.9, 0, 1));
          if (p.gl && !cheap) glow(ctx, p.color, p.gl);
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, TAU);
          ctx.fill();
          noGlow(ctx);
          break;
        }
        case "confetti": {
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.fillStyle = rgba(p.color, clamp(k * 1.4, 0, 1));
          const w = p.size * (0.6 + Math.abs(Math.cos(p.rot * 1.7)) * 0.7);
          ctx.fillRect(-w / 2, -p.size * 0.32, w, p.size * 0.64);
          ctx.restore();
          break;
        }
        case "shard": {
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.globalCompositeOperation = "lighter";
          ctx.fillStyle = rgba(p.color, clamp(k * 1.2, 0, 1));
          if (p.gl && !cheap) glow(ctx, p.color, p.gl);
          ctx.beginPath();
          ctx.moveTo(0, -p.size);
          ctx.lineTo(p.size * 0.62, p.size * 0.5);
          ctx.lineTo(-p.size * 0.62, p.size * 0.5);
          ctx.closePath();
          ctx.fill();
          noGlow(ctx);
          ctx.restore();
          break;
        }
        case "smoke": {
          ctx.fillStyle = rgba(p.color, clamp(k * 0.16, 0, 0.16));
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, TAU);
          ctx.fill();
          break;
        }
        case "ring": {
          ctx.globalCompositeOperation = "lighter";
          ctx.strokeStyle = rgba(p.color, clamp(k, 0, 1) * 0.85);
          ctx.lineWidth = Math.max(0.4, p.thick * k);
          if (p.gl && !cheap) glow(ctx, p.color, p.gl * k);
          ctx.beginPath();
          ctx.arc(p.x, p.y, Math.max(0.5, p.size), 0, TAU);
          ctx.stroke();
          noGlow(ctx);
          break;
        }
        case "flash": {
          ctx.globalCompositeOperation = "lighter";
          const r = p.size * (1.25 - k * 0.4);
          ctx.fillStyle = rgba(p.color, clamp(k, 0, 1) * 0.7);
          if (p.gl && !cheap) glow(ctx, p.color, p.gl);
          ctx.beginPath();
          ctx.arc(p.x, p.y, r, 0, TAU);
          ctx.fill();
          noGlow(ctx);
          break;
        }
        case "star": {
          const a = Math.sin(clamp(k, 0, 1) * Math.PI);
          sparkle(ctx, p.x, p.y, p.size * (0.4 + a * 0.8), a, p.color);
          break;
        }
        case "arc": {
          const alen = Math.hypot(p.vx, p.vy);
          if (alen > 35 && !cheap) {
            const bolt = createCrispBolt(p.x, p.y, p.x + p.vx, p.y + p.vy, {
              sway: 8,
              steps: 5,
              branchChance: 0.25,
            });
            renderCrispBolt(ctx, bolt, p.color, 8);
          } else {
            const seed = Math.floor(this.t * 30) + p.rot * 7;
            boltPath(
              ctx,
              p.x,
              p.y,
              p.x + p.vx,
              p.y + p.vy,
              clamp(alen * 0.04, p.size * 1.5, 20),
              seed,
              Math.round(clamp(alen / 24, 4, 14))
            );
            strokeBolt(ctx, p.color, p.size * 0.85, clamp(k * 1.25, 0, 1), cheap ? 0 : 8);
          }
          break;
        }
        case "suck": {
          ctx.globalCompositeOperation = "lighter";
          ctx.strokeStyle = rgba(p.color, clamp(k * 1.2, 0, 1));
          ctx.lineWidth = p.size * 0.8;
          ctx.lineCap = "round";
          if (p.gl && !cheap) glow(ctx, p.color, p.gl);
          const sp = Math.hypot(p.vx, p.vy) || 1;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - (p.vx / sp) * 9 * k, p.y - (p.vy / sp) * 9 * k);
          ctx.stroke();
          noGlow(ctx);
          break;
        }
        case "hole": {
          const r = p.size;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.globalCompositeOperation = "lighter";
          ctx.fillStyle = rgba("#b06bff", clamp(k, 0, 1) * 0.5);
          if (!cheap) glow(ctx, "#b06bff", 26);
          ctx.beginPath();
          ctx.arc(0, 0, r * 1.9, 0, TAU);
          ctx.fill();
          noGlow(ctx);
          ctx.rotate(this.t * 7);
          for (let i = 0; i < 3; i++) {
            ctx.strokeStyle = rgba(i % 2 ? "#3ee0ff" : "#e0b6ff", clamp(k, 0, 1) * 0.8);
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.ellipse(0, 0, r * (1.2 + i * 0.3), r * (0.4 + i * 0.16), i * 1.1, 0, TAU);
            ctx.stroke();
          }
          ctx.restore();
          ctx.globalCompositeOperation = "source-over";
          ctx.fillStyle = "#000000";
          ctx.beginPath();
          ctx.arc(p.x, p.y, r * 0.85, 0, TAU);
          ctx.fill();
          break;
        }
        case "crystal": {
          const prog = 1 - clamp(k, 0, 1);
          const grow = ease(clamp(prog / 0.66, 0, 1));
          const fade = prog > 0.66 ? 1 - (prog - 0.66) / 0.34 : 1;
          const h = p.grow * grow;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.globalCompositeOperation = "lighter";
          const g = ctx.createLinearGradient(0, 0, 0, -h);
          g.addColorStop(0, rgba(p.color, 0.15 * fade));
          g.addColorStop(0.6, rgba(p.color, 0.75 * fade));
          g.addColorStop(1, rgba("#ffffff", 0.9 * fade));
          ctx.fillStyle = g;
          if (!cheap) glow(ctx, p.color, 16);
          ctx.beginPath();
          ctx.moveTo(0, -h);
          ctx.lineTo(p.size * 0.6, -h * 0.35);
          ctx.lineTo(p.size * 0.34, 0);
          ctx.lineTo(-p.size * 0.34, 0);
          ctx.lineTo(-p.size * 0.6, -h * 0.35);
          ctx.closePath();
          ctx.fill();
          noGlow(ctx);
          ctx.restore();
          break;
        }
        default:
          break;
      }
    }
    ctx.restore();
  }
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}
function ease(t: number) {
  return 1 - Math.pow(1 - t, 3);
}
