/**
 * Slide-9 (`games/game-6` / `Weapon Lab`) runtime for slide 1.
 *
 * Nothing is redrawn here. Slide 9's own `Weapon` objects run on slide 1:
 * `fire()` pushes the real slide-9 `Bullet`s and `Beam`s (they carry their own
 * flight particles, trails, impact bursts and sounds), `drawMark()` paints the
 * entry hole into the wheel, and `ambient()` keeps the hot rim breathing. All
 * of that was written against slide 9's `Game`/`GameAPI`; the shim below is
 * that object, forwarded to slide 1 through `NineHooks`.
 *
 * Slide 1 keeps the physics and the rules: it moves the carrier round, decides
 * when the wheel is hit, and scores it. Slide 9 owns everything you see and
 * hear — including its own synthesizer, which plays through `audio.play()`.
 */
import {
  audio as nineAudio,
  drawParticles,
  updateParticles,
  type Particle,
} from '../../../../games/game-6/src/game/core';
import type { Beam, Bullet, GameAPI, Mark } from '../../../../games/game-6/src/game/types';
import { NINE_SCALE, nineGunOrigin, nineWeapon, type NineId } from './setNineArt';

/** What slide 1 does for slide 9 (the parts slide 9 needs from its game). */
export interface NineHooks {
  /** Camera/wheel shake, in slide-9 units (0..34). */
  shake(amount: number): void;
  /** Full-screen colour flash (any CSS colour) + strength. */
  flash(color: string, strength: number): void;
  /** Brief slow motion after a heavy hit. */
  hitStop(seconds: number): void;
  /** Slide-1 wheel geometry, refreshed every frame. */
  wheel(): { x: number; y: number; R: number; angle: number };
}

const NO_HOOKS: NineHooks = {
  shake: () => {},
  flash: () => {},
  hitStop: () => {},
  wheel: () => ({ x: 0, y: 0, R: 0, angle: 0 }),
};

/** Slide 9's muted switch, so slide 1's UI can silence the ported guns too. */
export function setNineMuted(muted: boolean) {
  nineAudio.muted = muted;
}

/** Slide 9's audio graph may only start after a user gesture. */
export function unlockNineAudio() {
  try {
    nineAudio.ensure();
  } catch {
    /* No AudioContext (tests / unsupported): the visuals still run. */
  }
}

export class SetNineFx implements GameAPI {
  /* ── slide-9 game geometry (mirrored from slide 1 every frame) ─────────── */
  cx = 210;
  cy = 0;
  wheelR = 0;
  rotation = 0;
  aim = -Math.PI / 2;
  floorY = 760;
  W = 420;
  H = 760;
  time = 0;

  /* ── slide-9's live world ─────────────────────────────────────────────── */
  particles: Particle[] = [];
  bullets: Bullet[] = [];
  beams: Beam[] = [];
  /** Entry holes slide 9 paints into the wheel (`drawMark` + `ambient`). */
  marks: Mark[] = [];
  /** Slide-9 `after()` timers, in seconds. */
  timers: { t: number; fn: () => void }[] = [];

  /** Rounds slide 1 already took from slide 9 (it carries their position). */
  private taken = new Set<Bullet>();
  /** Rounds slide 1 is carrying; their position comes from slide 1. */
  private carried = new Set<Bullet>();

  weaponId: NineId = 'ak47';
  /** Slide-9 muzzle in slide-1 screen space (set before every shot). */
  gunX = 210;
  gunY = 575;
  scale = NINE_SCALE;
  /** Seconds since the hand last caught something (identity disc). */
  catchT = 9;
  shotsFired = 0;

  private hooks: NineHooks;

  constructor(hooks: NineHooks = NO_HOOKS) {
    this.hooks = hooks;
  }

  setHooks(hooks: NineHooks) {
    this.hooks = hooks;
  }

  /* ── GameAPI ──────────────────────────────────────────────────────────── */

  shake(amount: number) {
    this.hooks.shake(amount);
  }

  flash(color: string, strength: number) {
    this.hooks.flash(color, strength);
  }

  hitstop(seconds: number) {
    this.hooks.hitStop(seconds);
  }

  /**
   * Slide 9 resolves its own wheel hits through this. On slide 1 the carrier
   * round does that (and scores), so the ported weapon must not do it twice —
   * the beam still stops exactly on the rim because `hitscan` is real.
   */
  registerHit(): boolean {
    return true;
  }

  hitscan(x: number, y: number, angle: number) {
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);
    const fx = x - this.cx;
    const fy = y - this.cy;
    const b = 2 * (fx * dx + fy * dy);
    const c = fx * fx + fy * fy - this.wheelR * this.wheelR;
    const disc = b * b - 4 * c;
    if (disc < 0) return { hit: false, x: x + dx * 1600, y: y + dy * 1600, dist: 1600 };
    const sq = Math.sqrt(disc);
    const t1 = (-b - sq) / 2;
    if (t1 < 0) return { hit: false, x: x + dx * 1600, y: y + dy * 1600, dist: 1600 };
    return { hit: true, x: x + dx * t1, y: y + dy * t1, dist: t1 };
  }

  handPulse() {
    this.catchT = 0;
  }

  /** Weapon-local coordinates -> slide-1 screen space, like slide 9's `toWorld`. */
  toWorld(lx: number, ly: number) {
    const origin = nineGunOrigin(this.weaponId, this.gunX, this.gunY, this.scale);
    return {
      x: origin.x + ly * this.scale,
      y: origin.y - lx * this.scale,
    };
  }

  after(sec: number, fn: () => void) {
    this.timers.push({ t: sec, fn });
  }

  /* ── slide-9's world ──────────────────────────────────────────────────── */

  /** Mirror slide 1's wheel into slide 9's coordinates. */
  syncWheel() {
    const w = this.hooks.wheel();
    this.cx = w.x;
    this.cy = w.y;
    this.wheelR = w.R;
    this.rotation = w.angle;
  }

  /** Start a weapon: a different gun starts from a clean layer. */
  selectWeapon(id: NineId) {
    if (this.weaponId !== id) {
      this.particles.length = 0;
      this.bullets.length = 0;
      this.beams.length = 0;
      this.marks.length = 0;
      this.timers.length = 0;
      this.taken.clear();
      this.carried.clear();
      this.catchT = 9;
      this.shotsFired = 0;
    }
    this.weaponId = id;
  }

  /** Slide 9's own trigger: its muzzle FX, sound, shake and projectile. */
  fire(x: number, y: number, angle: number, charge = 0) {
    const w = nineWeapon(this.weaponId);
    this.gunX = x;
    this.gunY = y;
    this.aim = angle;
    this.shotsFired++;
    w.fire(this, x, y, angle, charge);
  }

  /**
   * The rounds slide 9 has created but nobody carries yet. Slide 9 releases
   * some shots later than the trigger (charged staffs, drum bursts), so slide 1
   * calls this again on the frames that follow a shot.
   */
  takeShots(): Bullet[] {
    if (this.bullets.length === this.taken.size) return [];
    const made = this.bullets.filter((b) => !this.taken.has(b));
    for (const b of made) {
      this.taken.add(b);
      this.carried.add(b);
    }
    return made;
  }

  /**
   * Slide-9's impact: the weapon's own burst at the hit point plus the entry
   * hole it paints into the wheel (`drawMark`).
   */
  impact(hx: number, hy: number, local: number) {
    const w = nineWeapon(this.weaponId);
    w.onImpact?.(this, hx, hy, local + this.rotation);
    this.marks.push({
      weapon: w,
      a: local,
      r: this.wheelR,
      size: w.markSize,
      age: 0,
      seed: Math.random() * 1000,
    });
  }

  /** A round that bounced off an occupied spot still bursts, like slide 9's. */
  block(hx: number, hy: number) {
    nineWeapon(this.weaponId).onImpact?.(this, hx, hy, this.aim);
  }

  /** True while slide 9 still has something to draw or animate. */
  get busy(): boolean {
    return this.particles.length > 0 || this.bullets.length > 0 || this.beams.length > 0
      || this.marks.length > 0 || this.timers.length > 0;
  }

  clear() {
    this.particles.length = 0;
    this.bullets.length = 0;
    this.beams.length = 0;
    this.marks.length = 0;
    this.timers.length = 0;
    this.taken.clear();
    this.carried.clear();
    this.catchT = 9;
  }

  /** One frame of slide-9 time: timers, particles, rounds, beams, entry holes. */
  update(dt: number) {
    this.time += dt;
    this.catchT += dt;
    for (let i = this.timers.length - 1; i >= 0; i--) {
      const t = this.timers[i];
      t.t -= dt;
      if (t.t <= 0) {
        this.timers.splice(i, 1);
        t.fn();
      }
    }
    updateParticles(this.particles, dt);
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.age += dt;
      if (!this.carried.has(b)) {
        // Rounds slide 1 is not carrying (extra pellets of a burst) fly on
        // their own, exactly like slide 9 moves them.
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        if (!b.spin) b.angle = Math.atan2(b.vy, b.vx);
        b.trail.push({ x: b.x, y: b.y });
        if (b.trail.length > b.trailMax) b.trail.shift();
      }
      b.update?.(b, dt, this);
      if (b.age > b.life || b.dead || b.x < -400 || b.x > this.W + 400
        || b.y < -800 || b.y > this.H + 600) {
        this.bullets.splice(i, 1);
        this.carried.delete(b);
        this.taken.delete(b);
      }
    }
    for (let i = this.beams.length - 1; i >= 0; i--) {
      const bm = this.beams[i];
      bm.age += dt;
      bm.tick?.(bm, dt, this);
      if (bm.age >= bm.duration) this.beams.splice(i, 1);
    }
    for (const m of this.marks) {
      m.age += dt;
      if (m.weapon.ambient && this.wheelR > 0) {
        const wa = this.rotation + m.a;
        m.weapon.ambient(
          this,
          this.cx + Math.cos(wa) * m.r,
          this.cy + Math.sin(wa) * m.r,
          wa,
          m,
          dt,
        );
      }
    }
  }

  /** Beams, then rounds, then every particle slide 9 spawned. */
  draw(ctx: CanvasRenderingContext2D) {
    for (const bm of this.beams) bm.draw(ctx, bm, this.time);
    for (const b of this.bullets) b.draw(ctx, b, this.time);
    drawParticles(ctx, this.particles);
  }

  /** Entry holes, drawn from the wheel centre with the wheel's own spin. */
  drawWheel(ctx: CanvasRenderingContext2D, cx: number, cy: number, radius: number, rot: number) {
    if (!this.marks.length) return;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rot);
    for (const m of this.marks) {
      ctx.save();
      ctx.rotate(m.a);
      ctx.translate(m.r || radius, 0);
      m.weapon.drawMark(ctx, m, this.time);
      ctx.restore();
    }
    ctx.restore();
  }

  /** Called by slide 1 whenever it moves a carried round. */
  carry(b: Bullet, x: number, y: number, angle: number) {
    b.x = x;
    b.y = y;
    b.angle = angle;
    b.trail.push({ x, y });
    if (b.trail.length > b.trailMax) b.trail.shift();
  }
}

/**
 * A still of the slide-9 round at `age` seconds after it left the muzzle, used
 * by the picker's effect card so "Set 9" shows the real slide-9 projectile or
 * beam — slide 9's own `draw()` for that weapon.
 */
export function drawSetNineShotShell(
  c: CanvasRenderingContext2D,
  id: NineId,
  age: number,
  travel = 22,
) {
  const fx = new SetNineFx();
  fx.weaponId = id;
  fx.cx = 0;
  fx.cy = -120;
  fx.wheelR = 78;
  fx.gunX = 0;
  fx.gunY = 0;
  fx.fire(0, 0, -Math.PI / 2, 0);
  for (let i = 0; i < 40 && !fx.bullets.length && !fx.beams.length; i++) fx.update(1 / 60);
  const b = fx.bullets[0];
  if (b) {
    b.x = 0;
    b.y = -travel;
    b.age = age;
    b.trail = [{ x: 0, y: 2 }, { x: 0, y: -travel * 0.6 }, { x: 0, y: -travel }];
    c.save();
    b.draw(c, b, age);
    c.restore();
    return;
  }
  const bm = fx.beams[0];
  if (bm) {
    bm.age = age;
    c.save();
    bm.draw(c, bm, age);
    c.restore();
  }
}
