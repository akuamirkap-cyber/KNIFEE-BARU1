import {
  TAU,
  clamp,
  norm,
  angDist,
  rand,
  pick,
  px,
  py,
  easeOut,
} from "./utils";
import { sfx } from "./audio";
import {
  drawBackground,
  drawBullet,
  drawGun,
  drawParticles,
  drawPopups,
  drawWheel,
  drawFlash,
  drawFailFlash,
  type BoltView,
  type BulletView,
  type ParticleView,
  type PopupView,
} from "./render";

export const W = 450;
export const H = 820;
export const CX = 225;
export const CY = 252;
export const R = 96;
export const MUZZLE_Y = 545;

const BULLET_LEN = 48;
const BULLET_SPEED = 1120;
const GAP = 0.2;
const SWEET_HALF = 0.44;
const BEST_KEY = "rainbow-gun-best";

export type Phase = "menu" | "intro" | "playing" | "clear" | "over";

export interface Hud {
  phase: Phase;
  level: number;
  score: number;
  best: number;
  ammo: number;
  shots: number;
  combo: number;
  boss: boolean;
  perfects: number;
  totalShots: number;
  lastResult: string;
  weapon: "rainbow" | "blackhole" | "yoyo";
}

type Pattern = "steady" | "sway" | "pulse" | "ramp" | "chaos";

interface Bullet extends BulletView {
  vy: number;
  dead: boolean;
}

const PATTERN_ORDER: Pattern[] = [
  "steady",
  "steady",
  "sway",
  "pulse",
  "ramp",
  "sway",
  "chaos",
  "pulse",
];

function levelConfig(level: number) {
  const boss = level % 5 === 0;
  // how many bolts the wheel can visually hold this level (capacity ~15)
  const cap = Math.min(10, 5 + Math.floor((level - 1) / 2)) + (boss ? 1 : 0);
  const pre = boss
    ? Math.max(2, Math.min(cap - 4, 2 + Math.floor(level / 10)))
    : Math.min(cap - 4, Math.floor((level - 1) * 0.5));
  return {
    boss,
    cap,
    pre,
    shots: cap - pre,
    base: (boss ? 1.3 : 1) * (0.95 + Math.min(2.5, (level - 1) * 0.15)),
    pattern: (boss ? "chaos" : PATTERN_ORDER[(level - 1) % PATTERN_ORDER.length]) as Pattern,
    dir: level % 2 === 0 ? -1 : 1,
  };
}

export class Game {
  private ctx: CanvasRenderingContext2D;
  private raf = 0;
  private last = 0;
  private t = 0;
  private dpr = 1;
  private onHud: (h: Hud) => void;

  phase: Phase = "menu";
  level = 1;
  score = 0;
  best = 0;
  combo = 0;
  perfects = 0;
  totalShots = 0;
  lastResult = "";

  private cfg = levelConfig(1);
  private shots = 0;
  private ammo = 0;

  private angle = 0;
  private spinT = 0;
  private bolts: BoltView[] = [];
  private bullets: Bullet[] = [];
  private parts: ParticleView[] = [];
  private pops: PopupView[] = [];
  private sweetA = 0;

  private flash = 0;
  private shake = 0;
  private recoil = 0;
  private gunFlash = 0;
  private phaseT = 0;
  private clearAnim = 0;
  private hue = 200;
  private dead = false;
  private clearToken = 0;
  private failFlash = 0;
  private hitStop = 0;
  private flashScreen = 0;
  private ripple = 0;
  private ripplePhase = 0;
  private pulse = 0;
  private weapon: "rainbow" | "blackhole" | "yoyo" = "rainbow";

  /* Yoyo state: "idle" | "out" | "stuck" | "return" */
  private yoyo: {
    phase: "idle" | "out" | "stuck" | "return";
    x: number;
    y: number;
    hue: number;
    trail: { x: number; y: number }[];
    stuckAt: { x: number; y: number } | null;
    stickSince: number;
  } | null = null;

  constructor(canvas: HTMLCanvasElement, onHud: (h: Hud) => void) {
    const c = canvas.getContext("2d", { alpha: false });
    if (!c) throw new Error("no 2d context");
    this.ctx = c;
    this.onHud = onHud;
    this.best = Number(localStorage.getItem(BEST_KEY) || 0) || 0;
    this.resize(Math.min(2, window.devicePixelRatio || 1));
    this.resetWheel();
    this.loop = this.loop.bind(this);
    this.raf = requestAnimationFrame(this.loop);
    this.push();
  }

  destroy() {
    this.dead = true;
    cancelAnimationFrame(this.raf);
  }

  resize(dpr: number) {
    this.dpr = dpr;
    const cv = this.ctx.canvas;
    cv.width = Math.round(W * dpr);
    cv.height = Math.round(H * dpr);
  }

  /* --------------------------- state --------------------------- */

  private push() {
    this.onHud({
      phase: this.phase,
      level: this.level,
      score: this.score,
      best: this.best,
      ammo: this.ammo,
      shots: this.shots,
      combo: this.combo,
      boss: this.cfg.boss,
      perfects: this.perfects,
      totalShots: this.totalShots,
      lastResult: this.lastResult,
      weapon: this.weapon,
    });
  }

  switchWeapon() {
    this.weapon = this.weapon === "rainbow" ? "blackhole" : "rainbow";
    this.push();
  }

  getWeapon() {
    return this.weapon;
  }

  setWeapon(w: "rainbow" | "blackhole" | "yoyo") {
    this.weapon = w;
    this.push();
  }

  private resetWheel() {
    this.angle = rand(0, TAU);
    this.spinT = 0;
    this.bolts = [];
    this.bullets = [];
    this.parts = [];
    this.pops = [];
    this.clearAnim = 0;
  }

  private freeSpot(minGap: number, tries = 90): number | null {
    for (let i = 0; i < tries; i++) {
      const a = rand(-Math.PI, Math.PI);
      let ok = angDist(a, this.sweetA) > SWEET_HALF + 0.25;
      if (ok) for (const b of this.bolts) {
        if (angDist(a, b.a) < minGap) {
          ok = false;
          break;
        }
      }
      if (ok) return a;
    }
    return null;
  }

  /** find a fresh sweet-spot angle that stays clear of every bolt */
  private relocateSweet(): number {
    const margins = [0.8, 0.6, 0.45, 0.32, 0.24, GAP + 0.03];
    for (const m of margins) {
      for (let i = 0; i < 90; i++) {
        const a = rand(-Math.PI, Math.PI);
        if (this.bolts.every((b) => angDist(a, b.a) > m)) return a;
      }
    }
    return rand(-Math.PI, Math.PI);
  }

  goMenu() {
    this.clearToken++;
    this.phase = "menu";
    this.phaseT = 0;
    this.level = 1;
    this.cfg = levelConfig(1);
    this.shots = 0;
    this.ammo = 0;
    this.resetWheel();
    this.sweetA = rand(-Math.PI, Math.PI);
    this.parts = [];
    this.pops = [];
    this.push();
  }

  startGame() {
    this.clearToken++;
    this.score = 0;
    this.combo = 0;
    this.perfects = 0;
    this.totalShots = 0;
    this.level = 1;
    this.lastResult = "";
    this.startLevel();
  }

  private startLevel() {
    this.cfg = levelConfig(this.level);
    this.resetWheel();
    this.shots = this.cfg.shots;
    this.ammo = this.cfg.shots;
    this.hue = (this.level * 47) % 360;
    for (let i = 0; i < this.cfg.pre; i++) {
      const s = this.freeSpot(GAP * 2.1);
      if (s === null) break;
      this.bolts.push({ a: s, hue: rand(0, 360), perfect: false, born: -10 });
    }
    this.sweetA = this.relocateSweet();
    this.phase = "intro";
    this.phaseT = 0;
    this.push();
  }

  /* --------------------------- input --------------------------- */

  tap() {
    if (this.phase === "menu") {
      sfx.ui();
      this.startGame();
      return;
    }
    if (this.phase === "over") {
      if (this.phaseT > 0.8) {
        sfx.ui();
        this.startGame();
      }
      return;
    }
    if (this.phase !== "playing" || this.ammo <= 0) return;
    this.shoot();
  }

  private shoot() {
    if (this.weapon === "yoyo") {
      if (this.yoyo && this.yoyo.phase !== "idle") return;
      if (this.ammo <= 0) return;
      this.ammo--;
      this.totalShots++;
      const idx = this.totalShots - 1;
      const hue = (this.hue + idx * 37) % 360;
      this.yoyo = {
        phase: "out",
        x: CX,
        y: MUZZLE_Y,
        hue,
        trail: [],
        stuckAt: null,
        stickSince: 0,
      };
      this.recoil = 1.2;
      this.gunFlash = 1;
      this.shake = Math.max(this.shake, 6);
      sfx.shoot();
      this.push();
      return;
    }
    const idx = this.shots - this.ammo;
    const isBlackHole = this.weapon === "blackhole";
    const base = isBlackHole ? 260 : this.hue;
    const hue = (base + idx * (isBlackHole ? 55 : 43)) % 360;
    this.ammo--;
    this.totalShots++;
    this.bullets.push({
      x: CX,
      y: MUZZLE_Y + BULLET_LEN,
      vy: isBlackHole ? -BULLET_SPEED * 0.9 : -BULLET_SPEED,
      hue,
      weapon: isBlackHole ? "blackhole" : "rainbow",
      trail: [],
      dead: false,
    });
    this.recoil = isBlackHole ? 1.35 : 1;
    this.gunFlash = 1;
    this.shake = Math.max(this.shake, isBlackHole ? 7 : 5);
    sfx.shoot();
    for (let i = 0; i < (isBlackHole ? 14 : 10); i++) {
      this.parts.push({
        x: CX + rand(-10, 10),
        y: MUZZLE_Y + rand(-6, 14),
        vx: rand(-220, 220),
        vy: rand(-340, -60),
        g: isBlackHole ? 520 : 420,
        life: rand(0.28, 0.55),
        t: 0,
        size: rand(1.6, 4),
        hue: hue + rand(-50, 50),
        rot: 0,
        spin: 0,
        kind: isBlackHole ? 8 : 0,
      });
    }
    this.push();
  }

  /* --------------------------- yoyo physics --------------------------- */
  private updateYoyo(dt: number) {
    const y = this.yoyo;
    if (!y) return;

    const YOYO_SPEED = 520;
    const STICK_TIME = 0.5;
    const hitY = CY + R;

    if (y.phase === "out") {
      y.y -= YOYO_SPEED * dt;
      y.trail.push({ x: y.x, y: y.y });
      if (y.trail.length > 20) y.trail.shift();

      // Check collision with bolts (fail)
      const local = norm(-this.angle);
      for (const bolt of this.bolts) {
        if (angDist(local, bolt.a) < GAP) {
          const boltX = px(CX, R, this.angle + bolt.a);
          const boltY = py(CY, R, this.angle + bolt.a);
          if (Math.hypot(y.x - boltX, y.y - boltY) < 18) {
            this.failYoyo(y, bolt);
            return;
          }
        }
      }

      // Check if reached target line or gem sweet spot
      const perfect = angDist(local, this.sweetA) < SWEET_HALF;
      const sweetX = px(CX, R, this.angle + this.sweetA);
      const sweetY = py(CY, R, this.angle + this.sweetA);

      if (y.y <= hitY) {
        // Stick at impact
        y.phase = "stuck";
        y.stuckAt = { x: y.x, y: hitY };
        y.stickSince = 0;

        // Leave shadow bolt
        const boltHue = y.hue;
        this.bolts.push({ a: local, hue: boltHue, perfect, born: this.t });

        if (perfect) {
          this.combo++;
          this.perfects++;
          const pts = 40 + (this.combo - 1) * 20;
          this.score += pts;
          sfx.perfect(this.combo);
          this.pop(
            sweetX,
            sweetY - 30,
            this.combo > 1 ? `PERFECT x${this.combo}` : "PERFECT!",
            `+${pts}`,
            1.1,
            y.hue
          );
          this.sweetA = this.relocateSweet();
          this.add({ x: sweetX, y: sweetY, life: 0.65, size: 24, hue: 48, kind: 3 });
        } else {
          this.combo = 0;
          this.score += 12;
          this.pop(sweetX, sweetY - 24, "+12", "", 0.6, y.hue);
        }
        this.flash = 1;
        this.impactFx(sweetX, sweetY, y.hue, perfect);
        sfx.hit(y.hue, perfect);
        this.push();
      } else if (y.y < -60) {
        // Missed, return immediately
        y.phase = "return";
        this.push();
      }
    } else if (y.phase === "stuck") {
      y.stickSince += dt;
      if (y.stickSince >= STICK_TIME) {
        y.phase = "return";
        this.push();
      }
    } else if (y.phase === "return") {
      const dx = CX - y.x;
      const dy = MUZZLE_Y - y.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 8) {
        // Back at gun
        y.phase = "idle";
        if (this.ammo <= 0 && this.phase === "playing") {
          const token = ++this.clearToken;
          window.setTimeout(() => {
            if (this.clearToken === token) this.levelClear();
          }, 240);
        }
        this.push();
      } else {
        const spd = YOYO_SPEED * 1.1 * dt;
        y.x += (dx / dist) * spd;
        y.y += (dy / dist) * spd;
        y.trail.push({ x: y.x, y: y.y });
        if (y.trail.length > 20) y.trail.shift();
      }
    }
  }

  private failYoyo(y: { hue: number }, bolt: BoltView) {
    this.combo = 0;
    this.phase = "over";
    this.phaseT = 0;
    this.shake = 22;
    this.flash = 1;
    this.failFlash = 1;
    const hx = CX;
    const hy = CY + R;
    this.impactFx(hx, hy, y.hue, true);
    this.impactFx(hx, hy, 355, true);
    const boltX = px(CX, R - 20, this.angle + bolt.a);
    const boltY = py(CY, R - 20, this.angle + bolt.a);
    this.burst(boltX, boltY, 30, bolt.hue, 340);
    for (let i = 0; i < 26; i++) {
      const a = rand(0, TAU);
      const s = rand(150, 560);
      this.add({
        x: hx,
        y: hy,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s - 220,
        g: 760,
        kind: 1,
        life: rand(0.7, 1.5),
        size: rand(3, 6.5),
        hue: rand(0, 360),
        rot: rand(0, TAU),
        spin: rand(-18, 18),
      });
    }
    sfx.fail();
    this.pop(hx, hy - 40, "CRASH!", "YOYO KENA BOLT!", 1.6, 0);
    this.lastResult = `Kamu bertahan sampai level ${this.level} · ${this.perfects} perfect`;
    if (this.score > this.best) {
      this.best = this.score;
      localStorage.setItem(BEST_KEY, String(this.best));
    }
    this.push();
  }

  /* --------------------------- fx --------------------------- */

  private add(p: Partial<ParticleView> & { x: number; y: number }) {
    if (this.parts.length > 900) this.parts.splice(0, 120);
    this.parts.push({
      vx: 0,
      vy: 0,
      g: 0,
      life: 0.6,
      t: 0,
      size: 3,
      hue: 0,
      rot: 0,
      spin: 0,
      kind: 0,
      ...p,
    });
  }

  private burst(x: number, y: number, n: number, hue: number, spd = 260, kinds = true) {
    for (let i = 0; i < n; i++) {
      const a = rand(0, TAU);
      const s = rand(0.25, 1) * spd;
      this.add({
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        g: kinds ? 200 : 0,
        life: rand(0.35, 0.95),
        size: rand(1.6, 4.2),
        hue: hue + rand(-50, 50),
        rot: rand(0, TAU),
        spin: rand(-9, 9),
        kind: kinds && Math.random() < 0.35 ? 1 : 0,
      });
    }
    this.add({ x, y, life: 0.45, size: 14, hue, kind: 2, w: 5 });
  }

  /** the big one – everything that happens when a bolt slams into the wheel */
  private impactFx(x: number, y: number, hue: number, perfect: boolean) {
    const big = perfect;
    this.hitStop = big ? 0.09 : 0.05;
    this.flashScreen = big ? 0.95 : 0.45;
    this.ripple = 1;
    this.ripplePhase = 0;
    this.pulse = 1;
    this.shake = Math.max(this.shake, big ? 14 : 8);

    // lingering hot flare on the surface
    this.add({ x, y, kind: 5, life: big ? 0.75 : 0.5, size: big ? 54 : 34, hue });

    // shockwave rings
    const rings = big ? 4 : 3;
    for (let i = 0; i < rings; i++) {
      this.add({
        x,
        y,
        kind: 2,
        life: 0.38 + i * 0.14,
        size: 6 + i * 5,
        hue: hue + i * 45,
        w: Math.max(1.5, 5 - i),
      });
    }
    // prismatic chromatic ring
    this.add({ x, y, kind: 6, life: 0.55, size: 13, hue });

    // radial rays
    const rays = big ? 20 : 12;
    for (let i = 0; i < rays; i++) {
      const a = (i / rays) * TAU + rand(-0.13, 0.13);
      const sp = rand(200, big ? 680 : 480);
      this.add({
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        kind: 4,
        life: rand(0.26, 0.52),
        size: 3,
        hue: hue + i * 22,
        w: rand(3.5, 9),
      });
    }
    // sparks
    const sparks = big ? 58 : 32;
    for (let i = 0; i < sparks; i++) {
      const a = rand(0, TAU);
      const s = rand(60, big ? 620 : 440);
      this.add({
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s - 70,
        g: 520,
        kind: 0,
        life: rand(0.35, 1.05),
        size: rand(1.6, 4.2),
        hue: hue + rand(-70, 70),
      });
    }
    // crystal debris
    for (let i = 0; i < (big ? 18 : 10); i++) {
      const a = rand(0, TAU);
      const s = rand(120, 460);
      this.add({
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s - 140,
        g: 640,
        kind: 1,
        life: rand(0.5, 1.15),
        size: rand(2.5, 5.5),
        hue: hue + rand(-40, 40),
        rot: rand(0, TAU),
        spin: rand(-16, 16),
      });
    }
    // slow embers
    for (let i = 0; i < (big ? 20 : 11); i++) {
      const a = rand(0, TAU);
      const s = rand(20, 170);
      this.add({
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s - 100,
        g: 150,
        kind: 7,
        life: rand(0.7, 1.6),
        size: rand(1.2, 2.6),
        hue: hue + rand(-30, 45),
        rot: rand(0, TAU),
      });
    }
    if (big) {
      this.add({ x, y, kind: 3, life: 0.75, size: 26, hue: 48 });
      this.add({ x, y, kind: 3, life: 0.95, size: 40, hue: hue });
      for (let i = 0; i < 30; i++) {
        const a = rand(0, TAU);
        const s = rand(120, 520);
        this.add({
          x,
          y,
          vx: Math.cos(a) * s,
          vy: Math.sin(a) * s - 180,
          g: 720,
          kind: 8,
          life: rand(0.75, 1.5),
          size: rand(2, 4.2),
          hue: rand(0, 360),
          rot: rand(0, TAU),
          spin: rand(-13, 13),
        });
      }
    }
  }

  private pop(x: number, y: number, text: string, sub: string, life = 0.95, hue = 50) {
    this.pops.push({ x, y, text, sub, t: 0, life, hue });
  }

  /* --------------------------- logic --------------------------- */

  private spinVel(): number {
    const t = this.spinT;
    const d = this.cfg.dir;
    const b = this.cfg.base;
    switch (this.cfg.pattern) {
      case "steady":
        return d * b;
      case "sway":
        return d * b * Math.sin(t * 1.15);
      case "pulse": {
        const c = Math.sin(t * 1.7);
        return d * b * (c > -0.15 ? 1 : 0.12);
      }
      case "ramp": {
        const p = (t % 3.2) / 3.2;
        return d * b * (0.3 + easeOut(p) * 1.7);
      }
      case "chaos":
      default:
        return d * b * Math.sin(t * 2.1) * (0.55 + 0.45 * Math.cos(t * 0.8));
    }
  }

  private updateBullets(dt: number) {
    for (const b of this.bullets) {
      if (b.dead) continue;
      b.y += b.vy * dt;
      const tip = b.y - BULLET_LEN;
      if (tip <= CY + R) {
        b.dead = true;
        this.resolveHit(b);
      } else if (b.y < -80) {
        b.dead = true;
      }
    }
    if (this.bullets.some((b) => b.dead)) this.bullets = this.bullets.filter((b) => !b.dead);
  }

  private resolveHit(b: Bullet) {
    const local = norm(-this.angle);
    for (const bolt of this.bolts) {
      if (angDist(local, bolt.a) < GAP) {
        this.fail(b, bolt);
        return;
      }
    }
    const hx = CX;
    const hy = CY + R;
    const perfect = angDist(local, this.sweetA) < SWEET_HALF;
    this.bolts.push({ a: local, hue: b.hue, perfect, born: this.t });
    this.flash = 1;
    this.impactFx(hx, hy, b.hue, perfect);
    sfx.hit(b.hue, perfect);

    if (perfect) {
      this.combo++;
      this.perfects++;
      const pts = 40 + (this.combo - 1) * 20;
      this.score += pts;
      sfx.perfect(this.combo);
      this.pop(
        hx,
        hy - 30,
        this.combo > 1 ? `PERFECT x${this.combo}` : "PERFECT!",
        `+${pts}`,
        1.1,
        b.hue
      );
      this.sweetA = this.relocateSweet();
      this.add({ x: hx, y: hy, life: 0.65, size: 24, hue: 48, kind: 3 });
    } else {
      this.combo = 0;
      this.score += 12;
      this.pop(hx, hy - 24, "+12", "", 0.6, b.hue);
    }
    this.push();

    if (this.ammo <= 0 && this.phase === "playing") {
      const token = ++this.clearToken;
      window.setTimeout(() => {
        if (this.clearToken === token) this.levelClear();
      }, 240);
    }
  }

  private fail(b: Bullet, bolt: BoltView) {
    this.combo = 0;
    this.phase = "over";
    this.phaseT = 0;
    this.shake = 22;
    this.flash = 1;
    this.failFlash = 1;
    const hx = CX;
    const hy = CY + R;
    this.impactFx(hx, hy, b.hue, true);
    this.impactFx(hx, hy, 355, true);
    this.burst(px(CX, R - 20, this.angle + bolt.a), py(CY, R - 20, this.angle + bolt.a), 30, bolt.hue, 340);
    for (let i = 0; i < 26; i++) {
      const a = rand(0, TAU);
      const s = rand(150, 560);
      this.add({
        x: hx,
        y: hy,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s - 220,
        g: 760,
        kind: 1,
        life: rand(0.7, 1.5),
        size: rand(3, 6.5),
        hue: rand(0, 360),
        rot: rand(0, TAU),
        spin: rand(-18, 18),
      });
    }
    sfx.fail();
    this.pop(hx, hy - 40, "CRASH!", "ENERGI BERTABRAKAN!", 1.6, 0);
    this.lastResult = `Kamu bertahan sampai level ${this.level} · ${this.perfects} perfect`;
    if (this.score > this.best) {
      this.best = this.score;
      localStorage.setItem(BEST_KEY, String(this.best));
    }
    this.push();
  }

  private levelClear() {
    if (this.phase !== "playing") return;
    this.phase = "clear";
    this.phaseT = 0;
    const bonus = 60 * this.level + this.perfects * 10;
    this.score += bonus;
    this.pop(CX, CY, "TARGET CLEAR!", `bonus +${bonus}`, 1.5, 50);
    this.flashScreen = 0.8;
    this.ripple = 1;
    this.ripplePhase = 0;
    this.pulse = 1.4;
    this.shake = Math.max(this.shake, 12);
    for (const b of this.bolts) {
      const bx = px(CX, R - 26, this.angle + b.a);
      const by = py(CY, R - 26, this.angle + b.a);
      this.burst(bx, by, 9, b.hue, 340);
      this.add({ x: bx, y: by, kind: 5, life: 0.5, size: 22, hue: b.hue });
    }
    this.impactFx(CX, CY, this.hue, true);
    sfx.level();
    this.push();
  }

  /* --------------------------- loop --------------------------- */

  private loop(now: number) {
    if (this.dead) return;
    if (!this.last) this.last = now;
    let dt = (now - this.last) / 1000;
    this.last = now;
    dt = clamp(dt, 0, 1 / 20);
    this.update(dt);
    this.render();
    this.raf = requestAnimationFrame(this.loop);
  }

  private update(dt: number) {
    // hit-stop: a tiny slow-motion beat right when a bolt lands
    let sdt = dt;
    if (this.hitStop > 0) {
      this.hitStop -= dt;
      sdt = dt * 0.1;
    }
    this.t += sdt;
    this.phaseT += dt;
    this.hue += sdt * 26;

    // sub-stepped physics so fast bullets never tunnel
    const steps = Math.max(1, Math.min(8, Math.ceil((BULLET_SPEED * sdt) / 7)));
    const bdt = sdt / steps;
    for (let i = 0; i < steps; i++) {
      this.spinT += bdt;
      this.angle += this.spinVel() * bdt;
      if (this.phase === "playing") this.updateBullets(bdt);
    }

    // Sample the Holy Pulse path; the renderer turns these points into a rainbow beam.
    for (const b of this.bullets) {
      b.trail.push({ x: b.x, y: b.y });
      if (b.trail.length > 15) b.trail.shift();
      this.add({
        x: b.x + rand(-4, 4),
        y: b.y - rand(0, 22),
        vx: rand(-65, 65),
        vy: rand(80, 220),
        kind: 7,
        life: rand(0.22, 0.48),
        size: rand(0.8, 1.8),
        hue: b.hue + rand(-35, 35),
        rot: rand(0, TAU),
      });
    }

    if (this.phase === "menu") {
      this.spinT += sdt;
      this.angle += 0.28 * sdt;
    }
    if (this.phase === "intro" && this.phaseT > 1.05) {
      this.phase = "playing";
      this.phaseT = 0;
      this.push();
    }
    if (this.phase === "clear") {
      this.clearAnim = clamp(this.phaseT / 0.55, 0, 1);
      if (this.phaseT > 1.25) {
        this.level++;
        this.startLevel();
      }
    }

    // fx decay
    this.flash = Math.max(0, this.flash - sdt * 3.2);
    this.recoil = Math.max(0, this.recoil - sdt * 7);
    this.gunFlash = Math.max(0, this.gunFlash - sdt * 6);
    this.failFlash = Math.max(0, this.failFlash - dt * 1.1);
    this.flashScreen = Math.max(0, this.flashScreen - sdt * 5.5);
    this.ripple = Math.max(0, this.ripple - sdt * 1.5);
    this.ripplePhase += sdt * 26;
    this.pulse = Math.max(0, this.pulse - sdt * 4.2);
    this.shake *= Math.exp(-dt * 7);
    if (this.shake < 0.05) this.shake = 0;

    for (const p of this.parts) {
      p.t += sdt;
      p.x += p.vx * sdt;
      p.y += p.vy * sdt;
      p.vy += p.g * sdt;
      p.vx *= 1 - sdt * 1.2;
      p.rot += p.spin * sdt;
    }
    if (this.parts.length) this.parts = this.parts.filter((p) => p.t < p.life);
    for (const p of this.pops) p.t += dt;
    if (this.pops.length) this.pops = this.pops.filter((p) => p.t < p.life);
  }

  private render() {
    const ctx = this.ctx;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    drawBackground(ctx, W, H, this.t);

    ctx.save();
    if (this.shake > 0.05) {
      ctx.translate(rand(-1, 1) * this.shake, rand(-1, 1) * this.shake);
    }

    const wheelAlpha =
      this.phase === "clear" ? 1 - easeOut(this.clearAnim) : this.phase === "over" ? 0.85 : 1;

    drawWheel(ctx, {
      cx: CX,
      cy: CY,
      r: R * (1 - (this.phase === "clear" ? easeOut(this.clearAnim) * 0.3 : 0)),
      angle: this.angle,
      sweetA: this.sweetA,
      sweetHalf: SWEET_HALF,
      flash: this.flash,
      boss: this.cfg.boss,
      t: this.t,
      bolts: this.bolts,
      charge: this.shots ? (this.shots - this.ammo) / this.shots : 0,
      alive: this.phase === "playing" || this.phase === "intro",
      alpha: wheelAlpha,
      ripple: this.ripple,
      ripplePhase: this.ripplePhase,
      pulse: this.pulse,
    });

    for (const b of this.bullets) drawBullet(ctx, b, this.t, BULLET_LEN);
    drawParticles(ctx, this.parts);
    drawGun(ctx, {
      x: CX,
      muzzleY: MUZZLE_Y,
      t: this.t,
      recoil: this.recoil,
      flash: this.gunFlash,
      ammo: this.ammo,
      shots: this.shots,
      ready: this.phase === "playing" && this.ammo > 0,
      hue: this.hue,
      weapon: this.weapon,
    });
    drawPopups(ctx, this.pops);
    ctx.restore();

    drawFlash(ctx, W, H, this.flashScreen, this.hue);
    if (this.failFlash > 0.01) drawFailFlash(ctx, W, H, this.failFlash);
  }
}

export const randomTip = () =>
  pick([
    "Aim for the golden arc — PERFECT hits chain into huge combos.",
    "The gun never turns. Only your timing decides the shot.",
    "Watch the spin: some wheels pause, others swing back and forth.",
    "Holy pulses collide with energy seals already on the wheel.",
    "Boss wheels every 5 levels spin in chaotic patterns.",
  ]);
