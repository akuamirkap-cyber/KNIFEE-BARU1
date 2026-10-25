import {
  P,
  TAU,
  audio,
  clamp,
  drawParticles,
  rnd,
  updateParticles,
  withAlpha,
} from "./core";
import type { Particle } from "./core";
import type { Beam, Bullet, GameAPI, Mark, Weapon } from "./types";
import { getWeaponPose, WEAPONS } from "./weapons";
import { segmentCircleContact } from "./geometry";
import { ArenaScene } from "./scene";
import { rotatedWeaponBounds } from "./measure";
import { FIRE_SPECS, firingMuzzleOffset, isSignature } from "./fireMotion";

export type GameState = "ready" | "playing" | "won" | "lost";

export interface PublicState {
  state: GameState;
  hits: number;
  required: number;
  ammo: number;
  weaponId: string;
  charge: number;
  message: string;
  paused: boolean;
  elapsed: number;
  shots: number;
  cooldown: number;
  discFlying: boolean;
  status: string;
  targetBlocked: boolean;
  shotAge: number;
  catchAge: number;
  motionRate: number;
}

const REQUIRED = 7;
const AMMO = 9;
export const DEFAULT_WEAPON =
  WEAPONS.find((weapon) => weapon.id === "predatorShoulder") ?? WEAPONS[1];

export class Game implements GameAPI {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  W = 900;
  H = 640;
  dpr = 1;

  cx = 450;
  cy = 250;
  wheelR = 110;
  rotation = 0;
  rotSpeed = 1.45;
  dir = 1;

  time = 0;
  particles: Particle[] = [];
  bullets: Bullet[] = [];
  beams: Beam[] = [];
  marks: Mark[] = [];
  debris: {
    x: number;
    y: number;
    vx: number;
    vy: number;
    rot: number;
    spin: number;
    m: Mark;
  }[] = [];

  shakeAmt = 0;
  flashColor = "#fff";
  flashAlpha = 0;
  hitstopT = 0;

  weapon: Weapon = DEFAULT_WEAPON;
  recoil = 0;
  charge = 0;
  charging = false;
  cooldownT = 0;
  shotQueued = false;
  private queuedCharge: number | null = null;
  shotAge = 100;
  emptyAmmoT = 0;
  paused = false;
  cinematic = true;
  reducedMotion = false;
  elapsed = 0;
  lastHitAt = -100;
  lastHitColor = "#c8d8d2";
  private uiClock = 0;
  private scene = new ArenaScene();
  private baseCx = 450;
  private baseCy = 250;
  private targetSpring = { x: 0, y: 0, vx: 0, vy: 0 };
  private discCaughtAt = -100;

  aim = -Math.PI / 2;
  pointer = { x: 450, y: 100 };

  state: GameState = "ready";
  hits = 0;
  ammo = AMMO;
  message = "";
  endT = 0;

  onState: (s: PublicState) => void = () => {};
  private raf = 0;
  private last = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.resize();
    this.reset();
  }

  /* ------------------------------- lifecycle ------------------------------ */
  start() {
    this.last = performance.now();
    const loop = (t: number) => {
      const dt = Math.min(0.033, (t - this.last) / 1000);
      this.last = t;
      if (!this.paused) {
        this.update(dt);
        this.render();
      }
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }
  stop() {
    cancelAnimationFrame(this.raf);
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.W = Math.max(320, rect.width);
    this.H = Math.max(180, rect.height);
    this.canvas.width = Math.floor(this.W * this.dpr);
    this.canvas.height = Math.floor(this.H * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    const compact = this.H < 360;
    this.cx = this.W * (compact ? 0.68 : 0.5);
    this.cy = this.H * (compact ? 0.44 : 0.33);
    this.baseCx = this.cx;
    this.baseCy = this.cy;
    this.targetSpring = { x: 0, y: 0, vx: 0, vy: 0 };
    this.wheelR = compact
      ? clamp(this.H * 0.25, 40, 70)
      : clamp(Math.min(this.W, this.H) * 0.23, 72, 150);
    for (const mark of this.marks) mark.r = this.wheelR;
    this.aim = Math.atan2(this.cy - this.playerY(), this.cx - this.playerX());
    if (this.paused) this.render();
  }

  reset() {
    audio.stopAll();
    this.marks = [];
    this.bullets = [];
    this.beams = [];
    this.particles = [];
    this.debris = [];
    this.hits = 0;
    this.ammo = AMMO;
    this.state = "ready";
    this.message = "";
    this.rotation = rnd(TAU);
    this.dir = Math.random() < 0.5 ? 1 : -1;
    this.rotSpeed = 1.4;
    this.charge = 0;
    this.charging = false;
    this.cooldownT = 0;
    this.shotQueued = false;
    this.queuedCharge = null;
    this.shotAge = 100;
    this.emptyAmmoT = 0;
    this.recoil = 0;
    this.flashAlpha = 0;
    this.shakeAmt = 0;
    this.hitstopT = 0;
    this.paused = false;
    this.elapsed = 0;
    this.lastHitAt = -100;
    this.discCaughtAt = -100;
    this.targetSpring = { x: 0, y: 0, vx: 0, vy: 0 };
    this.cx = this.baseCx;
    this.cy = this.baseCy;
    this.emit();
  }

  setWeapon(id: string) {
    const w = WEAPONS.find((x) => x.id === id);
    if (w && w.id !== this.weapon.id) {
      this.weapon = w;
      this.charge = 0;
      this.charging = false;
      this.shotQueued = false;
      this.queuedCharge = null;
      this.cooldownT = 0;
      this.recoil = 0;
      this.shotAge = 100;
      if (!this.paused) audio.play("equip");
      this.emit();
    }
  }

  emit() {
    const discFlying = this.bullets.some((bullet) => bullet.kind === "disc");
    const returning = this.bullets.some(
      (bullet) => bullet.kind === "disc" && (bullet.returning ?? 0) <= 0,
    );
    let status = "Siap menembak";
    if (this.paused) status = "Dijeda";
    else if (this.state === "won") status = "Level selesai";
    else if (this.state === "lost") status = "Sesi berakhir";
    else if (this.ammo === 0)
      status =
        this.bullets.length || this.beams.length
          ? "Tembakan terakhir"
          : "Amunisi habis";
    else if (this.charging)
      status = this.charge >= 0.97 ? "Tarikan penuh" : "Menarik busur";
    else if (
      isSignature(this.weapon.id) &&
      this.shotAge < FIRE_SPECS[this.weapon.id].release
    ) {
      status = {
        identityDisc: "Menyiapkan lemparan",
        protonPack: "Cyclotron berputar",
        tripod: "Mengisi heat-ray",
        repulsor: "Mengisi repulsor",
        plasmacaster: "Mengompresi plasma",
        predatorShoulder: "Mengunci energi",
      }[this.weapon.id];
    } else if (this.weapon.id === "identityDisc" && discFlying)
      status = returning ? "Kembali ke tangan" : "Cakram terbang";
    else if (this.cooldownT > 0) status = "Menyiapkan tembakan";
    this.onState({
      state: this.state,
      hits: this.hits,
      required: REQUIRED,
      ammo: this.ammo,
      weaponId: this.weapon.id,
      charge: this.charge,
      message: this.message,
      paused: this.paused,
      elapsed: this.elapsed,
      shots: AMMO - this.ammo,
      cooldown: Math.max(0, Math.min(1, this.cooldownT / this.weapon.cooldown)),
      discFlying,
      status,
      targetBlocked: this.isAimBlocked(),
      shotAge: this.shotAge,
      catchAge: this.time - this.discCaughtAt,
      motionRate: this.hitstopT > 0 ? 0.12 : 1,
    });
    this.uiClock = 0;
  }

  setPaused(value: boolean) {
    if (this.state === "won" || this.state === "lost" || value === this.paused)
      return;
    this.paused = value;
    this.cancelInput();
    if (audio.ctx) {
      const change = value ? audio.ctx.suspend() : audio.ctx.resume();
      void change.catch(() => {});
    }
    this.render();
    this.emit();
  }

  cancelInput() {
    this.charging = false;
    this.charge = 0;
    this.shotQueued = false;
    this.queuedCharge = null;
  }

  private isAimBlocked() {
    const m = this.muzzlePoint();
    const hit = this.hitscan(m.x, m.y, this.aim);
    if (!hit.hit) return false;
    const angle = Math.atan2(hit.y - this.cy, hit.x - this.cx) - this.rotation;
    return this.marks.some((mark) => {
      const d = Math.atan2(Math.sin(angle - mark.a), Math.cos(angle - mark.a));
      return (
        Math.abs(d) * this.wheelR < (mark.size + this.weapon.markSize) * 0.45
      );
    });
  }

  /* --------------------------------- input -------------------------------- */
  setPointer(x: number, y: number) {
    this.pointer.x = x;
    this.pointer.y = y;
    const px = this.playerX(),
      py = this.playerY();
    let a = Math.atan2(y - py, x - px);
    if (a > 0) a = a > Math.PI / 2 ? -Math.PI + 0.25 : -0.25;
    this.aim = clamp(a, -Math.PI + 0.18, -0.18);
  }

  pressDown() {
    if (this.paused) return;
    if (this.state === "won" || this.state === "lost") {
      if (this.time - this.endT > 0.6) this.reset();
      return;
    }
    if (this.weapon.charged) {
      this.charging = true;
    } else {
      this.shoot();
    }
  }

  pressUp() {
    if (this.paused) return;
    if (this.charging) {
      this.charging = false;
      this.shoot();
      this.charge = 0;
    }
  }

  playerX() {
    return this.W * (this.H < 360 ? 0.24 : 0.5);
  }
  playerY() {
    return this.H < 360
      ? this.H * 0.72
      : this.H - clamp(this.H * 0.18, 70, 126);
  }

  get anchorX() {
    return this.weapon.id === "identityDisc"
      ? this.muzzlePoint([44, -2]).x
      : this.playerX();
  }

  get anchorY() {
    return this.weapon.id === "identityDisc"
      ? this.muzzlePoint([44, -2]).y
      : this.playerY();
  }

  muzzlePoint(point?: [number, number]) {
    const w = this.weapon;
    const flip = Math.cos(this.aim) < 0 ? -1 : 1;
    const [mx, my] = point ?? w.muzzle;
    const sc = this.weaponScale();
    const signature = isSignature(w.id);
    const kick = signature ? undefined : w.muzzleKick;
    const offset = signature
      ? firingMuzzleOffset(w.id, this.shotAge)
      : { x: 0, y: 0 };
    let lx = mx + offset.x - (kick?.x ?? 0) * this.recoil;
    let ly = my + offset.y - (kick?.y ?? 0) * this.recoil;
    if (kick?.rotation) {
      const rotation = kick.rotation * this.recoil;
      const c = Math.cos(rotation);
      const s = Math.sin(rotation);
      [lx, ly] = [lx * c - ly * s, lx * s + ly * c];
    }
    const pose = getWeaponPose(
      w,
      this.reducedMotion ? 0 : this.time,
      true,
      this.shotAge,
      this.time - this.discCaughtAt,
    );
    const posedX =
      lx * Math.cos(pose.rotation) - ly * Math.sin(pose.rotation) + pose.x;
    const posedY =
      lx * Math.sin(pose.rotation) + ly * Math.cos(pose.rotation) + pose.y;
    const localX = posedX * sc;
    const localY = posedY * sc * flip;
    const ca = Math.cos(this.aim),
      sa = Math.sin(this.aim);
    return {
      x: this.playerX() + localX * ca - localY * sa,
      y: this.playerY() + localX * sa + localY * ca,
    };
  }

  muzzleFor(weaponId: string) {
    if (weaponId !== this.weapon.id) return null;
    return { ...this.muzzlePoint(), angle: this.aim };
  }

  pushTarget(x: number, y: number, force: number) {
    const distance = Math.hypot(this.cx - x, this.cy - y) || 1;
    const strength = force * (this.reducedMotion ? 0.25 : 1.5);
    this.targetSpring.vx = clamp(
      this.targetSpring.vx + ((this.cx - x) / distance) * strength,
      -190,
      190,
    );
    this.targetSpring.vy = clamp(
      this.targetSpring.vy + ((this.cy - y) / distance) * strength,
      -190,
      190,
    );
  }

  private catchDisc(bullet: Bullet) {
    this.discCaughtAt = this.time;
    bullet.weapon.onReturn?.(this, this.anchorX, this.anchorY);
    this.uiClock = 0.1;
  }

  weaponScale() {
    const base = clamp(Math.min(this.W / 1170, this.H / 800), 0.46, 0.98);
    const clearance =
      Math.hypot(this.playerX() - this.cx, this.playerY() - this.cy) -
      this.wheelR -
      22;
    const bounds = rotatedWeaponBounds(this.weapon, this.aim);
    const bottomFit = (this.H - this.playerY() - 35) / Math.max(1, bounds.maxY);
    const leftFit = (this.playerX() - 20) / Math.max(1, -bounds.minX);
    const rightFit = (this.W - this.playerX() - 20) / Math.max(1, bounds.maxX);
    return Math.max(
      0.15,
      Math.min(
        base,
        bottomFit,
        leftFit,
        rightFit,
        Math.max(0.2, clearance / Math.max(this.weapon.muzzle[0], 100)),
      ),
    );
  }

  shoot() {
    if (this.paused) return;
    if (this.state === "won" || this.state === "lost") {
      this.shotQueued = false;
      return;
    }
    if (this.ammo <= 0) {
      this.shotQueued = false;
      return;
    }
    if (
      this.weapon.id === "identityDisc" &&
      this.bullets.some((bullet) => bullet.kind === "disc")
    ) {
      this.shotQueued = true;
      return;
    }
    if (this.cooldownT > 0) {
      this.shotQueued = true;
      if (this.weapon.charged) this.queuedCharge = this.charge;
      return;
    }
    this.shotQueued = false;
    if (this.state === "ready") this.state = "playing";
    const m = this.muzzlePoint();
    this.cooldownT = this.weapon.cooldown;
    this.recoil = 1;
    this.shotAge = 0;
    this.ammo--;
    this.weapon.fire(
      this,
      m.x,
      m.y,
      this.aim,
      this.queuedCharge ?? this.charge,
    );
    this.queuedCharge = null;
    this.emit();
  }

  /* --------------------------------- api ---------------------------------- */
  shake(n: number) {
    if (this.cinematic && !this.reducedMotion)
      this.shakeAmt = Math.min(26, this.shakeAmt + n * 0.75);
  }
  flash(color: string, a: number) {
    this.flashColor = color;
    this.flashAlpha = Math.max(
      this.flashAlpha,
      a * (this.reducedMotion ? 0.15 : 0.7),
    );
  }
  hitstop(s: number) {
    this.hitstopT = Math.max(this.hitstopT, s);
  }

  hitscan(x: number, y: number, angle: number) {
    // ray-circle intersection with the wheel
    const dx = Math.cos(angle),
      dy = Math.sin(angle);
    const fx = x - this.cx,
      fy = y - this.cy;
    const b = 2 * (fx * dx + fy * dy);
    const c = fx * fx + fy * fy - this.wheelR * this.wheelR;
    const disc = b * b - 4 * c;
    if (disc < 0)
      return { hit: false, x: x + dx * 1600, y: y + dy * 1600, dist: 1600 };
    const sq = Math.sqrt(disc);
    const t1 = (-b - sq) / 2;
    if (t1 < 0)
      return { hit: false, x: x + dx * 1600, y: y + dy * 1600, dist: 1600 };
    return { hit: true, x: x + dx * t1, y: y + dy * t1, dist: t1 };
  }

  registerHit(
    x: number,
    y: number,
    weapon: Weapon,
    sourceId?: number,
    record = true,
  ): boolean {
    if (this.state === "lost" || this.state === "won") return false;
    const a = Math.atan2(y - this.cy, x - this.cx) - this.rotation;
    const size = weapon.markSize;
    let overlapsOwnStamp = false;
    for (const m of this.marks) {
      let d = a - m.a;
      while (d > Math.PI) d -= TAU;
      while (d < -Math.PI) d += TAU;
      const px = Math.abs(d) * this.wheelR;
      if (px < (size + m.weapon.markSize) * 0.45) {
        // A disc can rebound off its own stamp, but a later throw still collides with it.
        if (sourceId !== undefined && m.sourceId === sourceId) {
          overlapsOwnStamp = true;
          continue;
        }
        this.lose("TABRAKAN!");
        return false;
      }
    }
    if (overlapsOwnStamp) return true;
    if (!record) return true;
    const mark: Mark = {
      weapon,
      sourceId,
      a,
      r: this.wheelR,
      size,
      age: 0,
      seed: rnd(1000),
    };
    this.marks.push(mark);
    this.hits++;
    this.lastHitAt = this.time;
    this.lastHitColor = weapon.accent;
    this.rotSpeed = 1.4 + this.hits * 0.06;
    if (this.state === "ready") this.state = "playing";
    if (this.hits >= REQUIRED) this.win();
    this.emit();
    return true;
  }

  lose(msg: string) {
    if (this.state === "lost" || this.state === "won") return;
    this.state = "lost";
    this.message = msg;
    this.shotQueued = false;
    this.charging = false;
    this.endT = this.time;
    audio.play("fail");
    this.shake(30);
    this.flash("#ff6b6b", 0.4);
    this.hitstop(0.1);
    // marks fly off as debris
    for (const m of this.marks) {
      const wa = this.rotation + m.a;
      const x = this.cx + Math.cos(wa) * m.r;
      const y = this.cy + Math.sin(wa) * m.r;
      this.debris.push({
        x,
        y,
        vx: Math.cos(wa) * rnd(120, 420),
        vy: Math.sin(wa) * rnd(120, 420) - 120,
        rot: wa,
        spin: rnd(-9, 9),
        m,
      });
    }
    this.marks = [];
    for (let i = 0; i < 90; i++) {
      const a = rnd(TAU);
      this.particles.push(
        P({
          type: "shard",
          x: this.cx + Math.cos(a) * this.wheelR * rnd(0.3, 1),
          y: this.cy + Math.sin(a) * this.wheelR * rnd(0.3, 1),
          vx: Math.cos(a) * rnd(100, 600),
          vy: Math.sin(a) * rnd(100, 600) - 100,
          size: rnd(3, 11),
          color: ["#8a5a2b", "#a9713a", "#6b4320", "#c08b4e"][i % 4],
          color2: "#e4bb83",
          rot: rnd(TAU),
          spin: rnd(-14, 14),
          grav: 1200,
          life: rnd(1, 2),
          drag: 0.995,
        }),
      );
    }
    for (let i = 0; i < 24; i++)
      this.particles.push(
        P({
          type: "smoke",
          x: this.cx + rnd(-60, 60),
          y: this.cy + rnd(-60, 60),
          vx: rnd(-120, 120),
          vy: rnd(-200, -20),
          size: rnd(50, 110),
          size2: 14,
          color: "#6b5a4a",
          life: rnd(1, 2.2),
        }),
      );
    this.emit();
  }

  win() {
    this.state = "won";
    this.message = "LEVEL 1 CLEAR";
    this.shotQueued = false;
    this.charging = false;
    this.endT = this.time;
    audio.play("win");
    this.flash("#ffe9a8", 0.3);
    for (let i = 0; i < 140; i++) {
      const a = rnd(TAU);
      const sp = rnd(120, 640);
      this.particles.push(
        P({
          type: i % 3 === 0 ? "star" : "ember",
          x: this.cx,
          y: this.cy,
          vx: Math.cos(a) * sp,
          vy: Math.sin(a) * sp,
          size: rnd(2, 7),
          color: ["#fde68a", "#67e8f9", "#f9a8d4", "#a7f3d0"][i % 4],
          color2: "#f59e0b",
          life: rnd(0.8, 2),
          grav: 260,
          drag: 0.97,
          width: 1.6,
        }),
      );
    }
    this.emit();
  }

  /* -------------------------------- update -------------------------------- */
  update(dtRaw: number) {
    if (this.paused) return;
    let dt = dtRaw;
    this.time += dtRaw;
    if (this.state === "playing") this.elapsed += dtRaw;
    if (this.hitstopT > 0) {
      this.hitstopT -= dtRaw;
      dt *= 0.12;
    }
    this.shotAge += dt;
    const spring = this.targetSpring;
    spring.vx += (-spring.x * 300 - spring.vx * 21) * dt;
    spring.vy += (-spring.y * 300 - spring.vy * 21) * dt;
    spring.x = clamp(spring.x + spring.vx * dt, -8, 8);
    spring.y = clamp(spring.y + spring.vy * dt, -8, 8);
    this.cx = this.baseCx + spring.x;
    this.cy = this.baseCy + spring.y;

    if (this.state === "playing" || this.state === "ready") {
      this.rotation +=
        this.dir * this.rotSpeed * (1 + 0.15 * Math.sin(this.time * 0.8)) * dt;
    } else if (this.state === "won") {
      this.rotation += this.dir * this.rotSpeed * 2.2 * dt;
    }

    this.cooldownT = Math.max(0, this.cooldownT - dtRaw);
    this.recoil = Math.max(0, this.recoil - dtRaw * 5.5);
    if (this.charging) this.charge = clamp(this.charge + dtRaw * 3.4, 0, 1);
    if (this.shotQueued && this.cooldownT <= 0) this.shoot();

    // ambient dust
    if (!this.reducedMotion && Math.random() < dtRaw * 5)
      this.particles.push(
        P({
          type: "glow",
          x: rnd(this.W),
          y: this.H + 10,
          vx: rnd(-14, 14),
          vy: rnd(-40, -12),
          size: rnd(1.2, 3),
          size2: 0.4,
          color: "#ffdcaa",
          color2: "#ff9f50",
          life: rnd(2.5, 5),
          drag: 1,
        }),
      );

    updateParticles(this.particles, dt);
    if (this.particles.length > 1400)
      this.particles.splice(0, this.particles.length - 1400);

    // bullets
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      const oldX = b.x;
      const oldY = b.y;
      b.age += dt;
      b.update?.(b, dt, this);
      if (b.dead) {
        if (b.data.caught) this.catchDisc(b);
        this.bullets.splice(i, 1);
        continue;
      }
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.angle = Math.atan2(b.vy, b.vx);
      b.trail.push({ x: b.x, y: b.y });
      if (b.trail.length > b.trailMax) b.trail.shift();

      // The identity disc ricochets off the arena instead of disappearing.
      if (b.kind === "disc" && b.data.launched !== 0) {
        let nx = 0;
        let ny = 0;
        if (b.x < 12) {
          b.x = 12;
          b.vx = Math.abs(b.vx);
          nx = 1;
        } else if (b.x > this.W - 12) {
          b.x = this.W - 12;
          b.vx = -Math.abs(b.vx);
          nx = -1;
        }
        if (b.y < 12) {
          b.y = 12;
          b.vy = Math.abs(b.vy);
          ny = 1;
        } else if (b.y > this.H - 12) {
          b.y = this.H - 12;
          b.vy = -Math.abs(b.vy);
          ny = -1;
        }
        if (nx || ny) {
          audio.play("disc-bounce");
          b.returning = (b.data.wheelHits ?? 0) < 4 ? 0.55 : 0;
          b.wallBounces = (b.wallBounces ?? 0) + 1;
          this.particles.push(
            P({
              type: "ring",
              x: b.x,
              y: b.y,
              size: 25,
              size2: 4,
              color: "#67e8f9",
              width: 2,
              life: 0.2,
            }),
          );
          const reboundAngle = Math.atan2(ny, nx);
          for (let spark = 0; spark < 8; spark++) {
            const a = reboundAngle + rnd(-0.85, 0.85);
            const speed = rnd(90, 280);
            this.particles.push(
              P({
                type: "spark",
                x: b.x,
                y: b.y,
                vx: Math.cos(a) * speed,
                vy: Math.sin(a) * speed,
                color: spark % 2 ? "#22d3ee" : "#d9ffff",
                life: rnd(0.12, 0.26),
                drag: 0.91,
                width: 1.8,
              }),
            );
          }
        }
      }

      if (
        b.kind === "disc" &&
        b.data.launched !== 0 &&
        (b.returning ?? 0) <= 0 &&
        Math.hypot(b.x - this.anchorX, b.y - this.anchorY) < 40
      ) {
        b.dead = true;
        this.catchDisc(b);
        this.bullets.splice(i, 1);
        continue;
      }

      const contact = segmentCircleContact(
        oldX,
        oldY,
        b.x,
        b.y,
        this.cx,
        this.cy,
        this.wheelR + b.size * 0.4,
      );
      const chargingPlasma = b.data.launched === 0;
      if (
        contact !== null &&
        !chargingPlasma &&
        this.state !== "lost" &&
        this.state !== "won"
      ) {
        const contactX = oldX + (b.x - oldX) * contact;
        const contactY = oldY + (b.y - oldY) * contact;
        const a = Math.atan2(contactY - this.cy, contactX - this.cx);
        const hx = this.cx + Math.cos(a) * this.wheelR;
        const hy = this.cy + Math.sin(a) * this.wheelR;
        if (b.kind === "disc") {
          if ((b.hitCd ?? 0) <= 0) {
            const wheelHits = b.data.wheelHits ?? 0;
            const canDamage = wheelHits < 4;
            const fullDamage = (b.returning ?? 0) > 0;
            b.data.lastDamage = fullDamage
              ? (b.weapon.damage ?? 17)
              : (b.weapon.returnDamage ?? 12);
            b.hitCd = 0.25;
            if (canDamage) b.weapon.onImpact?.(this, hx, hy, b.angle);
            const hitsBefore = this.hits;
            const recorded = this.registerHit(
              hx,
              hy,
              b.weapon,
              b.id,
              canDamage,
            );
            if (!recorded || this.hits >= REQUIRED) {
              this.bullets.splice(i, 1);
              continue;
            }
            // Reflect around the wheel's true surface normal and bleed a little energy.
            const nx = Math.cos(a);
            const ny = Math.sin(a);
            const dot = b.vx * nx + b.vy * ny;
            b.vx = (b.vx - 2 * dot * nx) * 0.86;
            b.vy = (b.vy - 2 * dot * ny) * 0.86;
            // An own-stamp rebound is physical contact, not another credited hit.
            if (canDamage && this.hits > hitsBefore)
              b.data.wheelHits = wheelHits + 1;
            b.returning = b.data.wheelHits < 4 ? 0.55 : 0;
            b.x = hx + nx * (b.size * 0.4 + 1);
            b.y = hy + ny * (b.size * 0.4 + 1);
          }
        } else {
          b.weapon.onImpact?.(this, hx, hy, b.angle);
          this.registerHit(hx, hy, b.weapon);
          this.bullets.splice(i, 1);
          continue;
        }
      }
      if (
        b.age > b.life ||
        (b.kind !== "disc" &&
          (b.x < -200 ||
            b.x > this.W + 200 ||
            b.y < -300 ||
            b.y > this.H + 200))
      ) {
        this.bullets.splice(i, 1);
      }
    }

    // beams
    for (let i = this.beams.length - 1; i >= 0; i--) {
      const bm = this.beams[i];
      const firstFrame = bm.age === 0;
      bm.age += dt;
      if (bm.followMuzzle) {
        const muzzle = this.muzzleFor(bm.weapon.id);
        if (muzzle) {
          bm.x = muzzle.x;
          bm.y = muzzle.y;
        }
        if (bm.pendingHit) {
          if (muzzle) bm.angle = muzzle.angle;
          const hit = this.hitscan(bm.x, bm.y, bm.angle);
          bm.hit = hit.hit;
          bm.hitX = hit.x;
          bm.hitY = hit.y;
          bm.len = hit.dist;
        } else if (bm.hit && bm.impactAngle !== undefined) {
          bm.hitX = this.cx + Math.cos(bm.impactAngle) * this.wheelR;
          bm.hitY = this.cy + Math.sin(bm.impactAngle) * this.wheelR;
          bm.angle = Math.atan2(bm.hitY - bm.y, bm.hitX - bm.x);
          bm.len = Math.hypot(bm.hitX - bm.x, bm.hitY - bm.y);
        }
      }
      bm.tick?.(bm, dt, this);
      if (bm.pendingHit && bm.age >= (bm.windup ?? 0)) {
        bm.pendingHit = false;
        bm.impactApplied = true;
        if (bm.hit && this.state !== "lost" && this.state !== "won") {
          bm.impactAngle = Math.atan2(bm.hitY - this.cy, bm.hitX - this.cx);
          bm.weapon.onImpact?.(this, bm.hitX, bm.hitY, bm.angle);
          this.registerHit(bm.hitX, bm.hitY, bm.weapon);
        }
      } else if (firstFrame && !bm.windup && bm.hit)
        bm.weapon.onImpact?.(this, bm.hitX, bm.hitY, bm.angle);
      if (bm.age >= bm.duration) this.beams.splice(i, 1);
    }

    for (const m of this.marks) m.age += dt;

    // Wait for long-lived discs and charge effects to finish before judging the last shot.
    if (
      this.state === "playing" &&
      this.ammo === 0 &&
      !this.bullets.length &&
      !this.beams.length
    ) {
      this.emptyAmmoT += dtRaw;
      if (this.emptyAmmoT >= 0.6) this.lose("AMUNISI HABIS");
    } else {
      this.emptyAmmoT = 0;
    }

    // debris after loss
    for (const d of this.debris) {
      d.vy += 1300 * dt;
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      d.rot += d.spin * dt;
    }
    this.debris = this.debris.filter((d) => d.y < this.H + 200);

    this.shakeAmt *= Math.pow(0.001, dtRaw);
    this.flashAlpha = Math.max(0, this.flashAlpha - dtRaw * 2.2);
    this.uiClock += dtRaw;
    const animated =
      isSignature(this.weapon.id) &&
      (this.shotAge < FIRE_SPECS[this.weapon.id].duration ||
        this.time - this.discCaughtAt < 0.3);
    if (this.uiClock >= (animated ? 0.05 : 0.1)) this.emit();
  }

  /* -------------------------------- render -------------------------------- */
  render() {
    const ctx = this.ctx;
    const { W, H } = this;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    this.drawBackground(ctx);

    ctx.save();
    if (this.shakeAmt > 0.3) {
      ctx.translate(
        rnd(-this.shakeAmt, this.shakeAmt) * 0.25,
        rnd(-this.shakeAmt, this.shakeAmt) * 0.25,
      );
    }

    this.drawWheel(ctx);
    this.drawDebris(ctx);

    // beams under bullets
    for (const bm of this.beams) bm.draw(ctx, bm, this.time);
    drawParticles(ctx, this.particles);
    for (const b of this.bullets) b.draw(ctx, b, this.time);

    this.drawAimGuide(ctx);
    this.drawPlayer(ctx);
    ctx.restore();

    this.drawOverlay(ctx);
  }

  private drawBackground(ctx: CanvasRenderingContext2D) {
    this.scene.drawBackground(
      ctx,
      this.W,
      this.H,
      this.baseCx,
      this.baseCy,
      this.wheelR,
      this.weapon.accent,
      this.time,
    );
  }

  private drawWheel(ctx: CanvasRenderingContext2D) {
    if (this.state === "lost") return;
    const { cx, cy, wheelR: r } = this;
    ctx.save();
    ctx.translate(cx, cy);
    const glow = Math.exp(-Math.max(0, this.time - this.lastHitAt) * 5);
    if (glow > 0.01) {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      const light = ctx.createRadialGradient(0, 0, r * 0.6, 0, 0, r * 1.35);
      light.addColorStop(0, withAlpha(this.lastHitColor, 0));
      light.addColorStop(0.65, withAlpha(this.lastHitColor, glow * 0.1));
      light.addColorStop(1, withAlpha(this.lastHitColor, 0));
      ctx.fillStyle = light;
      ctx.beginPath();
      ctx.arc(0, 0, r * 1.35, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
    ctx.save();
    ctx.rotate(this.rotation);
    this.scene.drawWheelFace(ctx, r, this.dpr);
    for (const mark of this.marks) {
      ctx.save();
      ctx.rotate(mark.a);
      ctx.translate(mark.r, 0);
      mark.weapon.drawMark(ctx, mark, this.time);
      ctx.restore();
    }
    ctx.restore();
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const reflection = ctx.createLinearGradient(-r, -r, r, r);
    reflection.addColorStop(0, "rgba(241,238,204,0.09)");
    reflection.addColorStop(0.5, "rgba(231,238,225,0)");
    reflection.addColorStop(1, "rgba(231,238,225,0)");
    ctx.fillStyle = reflection;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, TAU);
    ctx.fill();
    ctx.restore();
    ctx.restore();
  }

  private drawDebris(ctx: CanvasRenderingContext2D) {
    for (const d of this.debris) {
      ctx.save();
      ctx.translate(d.x, d.y);
      ctx.rotate(d.rot);
      d.m.weapon.drawMark(ctx, d.m, this.time);
      ctx.restore();
    }
  }

  private drawAimGuide(ctx: CanvasRenderingContext2D) {
    if (this.state === "lost" || this.state === "won" || this.paused) return;
    const m = this.muzzlePoint();
    const hs = this.hitscan(m.x, m.y, this.aim);
    const hitAngle = Math.atan2(hs.y - this.cy, hs.x - this.cx) - this.rotation;
    const blocked =
      hs.hit &&
      this.marks.some((mark) => {
        const difference = Math.atan2(
          Math.sin(hitAngle - mark.a),
          Math.cos(hitAngle - mark.a),
        );
        return (
          Math.abs(difference) * this.wheelR <
          (mark.size + this.weapon.markSize) * 0.45
        );
      });
    const acc = blocked ? "#fb7971" : this.weapon.accent;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    if (this.weapon.id === "predatorShoulder") {
      if (hs.hit) {
        const charging = this.shotAge < 0.28;
        const convergence = charging ? 1 - this.shotAge / 0.28 : 0;
        const radius = 5 + convergence * 10;
        const pod = this.muzzlePoint([73, -84]);
        for (let i = 0; i < 3; i++) {
          const a = -Math.PI / 2 + (i * TAU) / 3;
          const x = hs.x + Math.cos(a) * radius;
          const y = hs.y + Math.sin(a) * radius;
          ctx.strokeStyle = `rgba(255,78,68,${charging ? 0.18 : 0.07})`;
          ctx.lineWidth = 0.7;
          ctx.beginPath();
          ctx.moveTo(pod.x, pod.y);
          ctx.lineTo(x, y);
          ctx.stroke();
          const glow = ctx.createRadialGradient(x, y, 0, x, y, 7);
          glow.addColorStop(0, "rgba(255,220,201,0.85)");
          glow.addColorStop(0.2, "rgba(255,67,60,0.9)");
          glow.addColorStop(1, "rgba(255,60,50,0)");
          ctx.fillStyle = glow;
          ctx.beginPath();
          ctx.arc(x, y, 7, 0, TAU);
          ctx.fill();
        }
        ctx.strokeStyle = blocked
          ? "rgba(255,112,91,0.75)"
          : "rgba(255,103,91,0.37)";
        ctx.lineWidth = 1;
        for (let i = 0; i < 3; i++) {
          const a = -Math.PI / 2 + (i * TAU) / 3;
          ctx.beginPath();
          ctx.arc(hs.x, hs.y, 15 + convergence * 5, a - 0.16, a + 0.16);
          ctx.stroke();
        }
      }
      ctx.restore();
      return;
    }
    ctx.setLineDash([2, 12]);
    ctx.lineDashOffset = this.reducedMotion ? 0 : -this.time * 22;
    ctx.strokeStyle = withAlpha(acc, 0.17);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(m.x, m.y);
    ctx.lineTo(hs.x, hs.y);
    ctx.stroke();
    ctx.setLineDash([]);
    if (hs.hit) {
      const r = 8.5;
      ctx.strokeStyle = withAlpha(acc, 0.8);
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.arc(hs.x, hs.y, r, 0, TAU);
      ctx.stroke();
      ctx.beginPath();
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * TAU;
        ctx.moveTo(hs.x + Math.cos(a) * (r + 3), hs.y + Math.sin(a) * (r + 3));
        ctx.lineTo(hs.x + Math.cos(a) * (r + 6), hs.y + Math.sin(a) * (r + 6));
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawPlayer(ctx: CanvasRenderingContext2D) {
    const px = this.playerX(),
      py = this.playerY();
    const sc = this.weaponScale();

    const bounds = rotatedWeaponBounds(this.weapon, this.aim);
    this.scene.drawStand(
      ctx,
      px + (bounds.minX + bounds.maxX) * sc * 0.5,
      py + bounds.maxY * sc - 28,
      this.weapon.accent,
      this.recoil,
    );

    // weapon
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(this.aim);
    if (Math.cos(this.aim) < 0) ctx.scale(1, -1);
    ctx.scale(sc, sc);
    const cycle = this.weapon.cooldown > 0 ? clamp(1 - this.cooldownT / this.weapon.cooldown, 0, 1) : 1;
    this.weapon.draw(ctx, {
      t: this.reducedMotion ? 0 : this.time,
      recoil: this.recoil,
      charge: this.charge,
      cycle,
      selected: true,
      discInFlight: this.bullets.some((bullet) => bullet.kind === "disc"),
      shotAge: this.shotAge,
      catchAge: this.time - this.discCaughtAt,
    });
    ctx.restore();

    // charge meter for bow
    if (this.weapon.charged && this.charge > 0.02) {
      ctx.save();
      ctx.translate(px, py + 70);
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(-60, -5, 120, 10);
      const cg = ctx.createLinearGradient(-60, 0, 60, 0);
      cg.addColorStop(0, "#34d399");
      cg.addColorStop(0.6, "#fde047");
      cg.addColorStop(1, "#f87171");
      ctx.fillStyle = cg;
      ctx.fillRect(-58, -3, 116 * this.charge, 6);
      ctx.restore();
    }
  }

  private drawOverlay(ctx: CanvasRenderingContext2D) {
    if (this.flashAlpha <= 0.001) return;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const glow = ctx.createRadialGradient(
      this.cx,
      this.cy,
      10,
      this.cx,
      this.cy,
      this.wheelR * 3.1,
    );
    glow.addColorStop(0, withAlpha(this.flashColor, this.flashAlpha * 0.36));
    glow.addColorStop(0.55, withAlpha(this.flashColor, this.flashAlpha * 0.13));
    glow.addColorStop(1, withAlpha(this.flashColor, 0));
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, this.W, this.H);
    ctx.restore();
  }
}

export { WEAPONS };
