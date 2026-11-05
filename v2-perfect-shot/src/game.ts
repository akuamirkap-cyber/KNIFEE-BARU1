/**
 * PERFECT SHOT — v2 gameplay core.
 *
 * This is the run, and only the run: a wheel spins, knives fly, a knife that
 * lands on one already stuck ends the level. No DOM, no canvas, no React, no
 * audio — `Game` is a plain class you can drive from anywhere (the page, a
 * test, an offline renderer). `render/` draws it, `render/attach.ts` wires it
 * to a real canvas.
 *
 * The rules are Perfect Shot's, unchanged:
 *   · the wheel turns at a base speed that slowly swells;
 *   · a few knives are already stuck when the level opens (see `START_STUCK`);
 *   · every landing counts, and `HITS_TO_WIN` landings clear the level;
 *   · a landing within `COLLIDE` of a stuck knife loses it.
 */
import {
  BASE,
  COLLIDE,
  CX,
  CY,
  END_HOLD,
  HITS_TO_WIN,
  RADIUS,
  SPIN,
  START_STUCK,
  THEME,
  type Theme,
} from './config';
import { weaponById, type Shape, type Weapon } from './weapons';

export type Status = 'play' | 'win' | 'lose';
export type Outcome = 'win' | 'lose';

/** Seconds a knife spends between the muzzle and the rim. */
const FLIGHT = 0.16;

/** One knife riding to the wheel. */
export interface Shot {
  /** How far it has travelled, 0 (muzzle) … 1 (rim). */
  t: number;
  shape: Shape;
  rgb: string;
  /** Spin applied to the silhouette, radians — purely cosmetic. */
  spin: number;
}

/** One knife welded to the wheel. */
export interface Stuck {
  /** Angle in the wheel's own frame, radians. */
  angle: number;
  shape: Shape;
  rgb: string;
  /** `scene.time` when it landed; the renderer uses it for the pop-in. */
  born: number;
}

export interface Scene {
  status: Status;
  /** Wheel rotation, radians. */
  rot: number;
  /** Seconds since the level opened. */
  time: number;
  /** Knives already landed this level. */
  hits: number;
  stuck: Stuck[];
  /** Knives in flight (at most one at a time — the cooldown keeps it that way). */
  shots: Shot[];
  weapon: Weapon;
  /** Seconds until the next shot is allowed. */
  cooldown: number;
  /** 0…1, decays after every landing: drives the flash and the wheel's squash. */
  flash: number;
  /** 0…1, decays after every landing: the wheel's bump. */
  bump: number;
  /** Screen shake in px. */
  shake: number;
  /** 0…1 recoil of the gun. */
  recoil: number;
  /** Seconds spent in `win` / `lose`. */
  endT: number;
  /** Set exactly once, when the level ends. The host reads it, then calls `clearOutcome()`. */
  outcome: Outcome | null;
  theme: Theme;
}

const TAU = Math.PI * 2;

/** Signed angular difference, always in (-π, π]. */
export function angleDelta(a: number, b: number): number {
  let d = (a - b) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d <= -Math.PI) d += TAU;
  return d;
}

function freshScene(weapon: Weapon, theme: Theme): Scene {
  return {
    status: 'play',
    rot: 0,
    time: 0,
    hits: 0,
    stuck: START_STUCK.map((s) => ({ angle: s.angle, shape: s.kind as Shape, rgb: '235,240,255', born: -5 })),
    shots: [],
    weapon,
    cooldown: 0,
    flash: 0,
    bump: 0,
    shake: 0,
    recoil: 0,
    endT: 0,
    outcome: null,
    theme,
  };
}

export class Game {
  readonly scene: Scene;

  constructor(weaponId: string = 'knife', theme: Theme = THEME) {
    this.scene = freshScene(weaponById(weaponId), theme);
  }

  /** Swap the equipped weapon without restarting the run. */
  setWeapon(id: string): void {
    this.scene.weapon = weaponById(id);
  }

  /** Wheel speed at `time`, rad/s. Exposed so a HUD can show the pace. */
  spinAt(time = this.scene.time): number {
    return SPIN.base + SPIN.swell * Math.sin(time * SPIN.swellHz * TAU);
  }

  /** Where the wheel's rim meets the aim line, in board px. */
  get rimPoint(): { x: number; y: number } {
    return { x: CX, y: CY + RADIUS };
  }

  /** Seconds a knife spends between the muzzle and the rim. */
  get flight(): number {
    return FLIGHT;
  }

  /** Where the gun's muzzle is, in board px. */
  get muzzle(): { x: number; y: number } {
    return { x: CX, y: BASE - this.scene.recoil * 14 };
  }

  /**
   * Fire. Returns true when a knife actually left — false while the cooldown
   * runs or once the level is over, which is what makes mashing harmless.
   */
  fire(): boolean {
    const s = this.scene;
    if (s.status !== 'play' || s.cooldown > 0) return false;
    s.cooldown = s.weapon.cooldown;
    s.recoil = 1;
    s.shots.push({ t: 0, shape: s.weapon.shape, rgb: s.weapon.rgb, spin: 0 });
    return true;
  }

  /** Advance the run. `dt` is seconds. */
  update(dt: number): void {
    const s = this.scene;
    // A huge dt (a backgrounded tab) must not teleport the wheel.
    const step = Number.isFinite(dt) && dt > 0 ? Math.min(dt, 0.1) : 0;
    if (step === 0) return;

    s.time += step;
    s.flash = Math.max(0, s.flash - step * 3.2);
    s.bump = Math.max(0, s.bump - step * 3.6);
    s.shake = Math.max(0, s.shake - step * 42);
    s.recoil = Math.max(0, s.recoil - step * 5.5);
    s.cooldown = Math.max(0, s.cooldown - step);

    if (s.status !== 'play') {
      s.endT += step;
      return;
    }

    s.rot += this.spinAt(s.time) * step;

    for (let i = s.shots.length - 1; i >= 0; i--) {
      const shot = s.shots[i];
      shot.t += step / FLIGHT;
      shot.spin += step * 9;
      if (shot.t >= 1) {
        s.shots.splice(i, 1);
        this.land(shot);
      }
    }
  }

  /** One landing: stick and count it, or lose the level. */
  private land(shot: Shot): void {
    const s = this.scene;
    if (s.status !== 'play') return;
    // The rim point sits at the wheel's bottom — +90° on screen — so convert it
    // into the wheel's own frame.
    const angle = Math.PI / 2 - s.rot;
    const hit = s.stuck.some((k) => Math.abs(angleDelta(k.angle, angle)) < COLLIDE);
    if (hit) {
      s.status = 'lose';
      s.endT = 0;
      s.outcome = 'lose';
      s.shake = 14;
      s.flash = 0.5;
      return;
    }
    s.stuck.push({ angle, shape: shot.shape, rgb: shot.rgb, born: s.time });
    s.hits += 1;
    s.flash = 0.6;
    s.bump = 1;
    s.shake = Math.max(s.shake, 4);
    if (s.hits >= HITS_TO_WIN) {
      s.status = 'win';
      s.endT = 0;
      s.outcome = 'win';
      s.shake = 16;
      s.flash = 1;
    }
  }

  /** True once the end burst has had its moment (see `END_HOLD`). */
  get ended(): boolean {
    return this.scene.status !== 'play' && this.scene.endT >= END_HOLD;
  }

  /** Hand the outcome to the host exactly once. */
  clearOutcome(): Outcome | null {
    const o = this.scene.outcome;
    this.scene.outcome = null;
    return o;
  }

  /** Take the outcome and go again, keeping the weapon and the theme. */
  restart(weaponId?: string): void {
    const weapon = weaponId ? weaponById(weaponId) : this.scene.weapon;
    Object.assign(this.scene, freshScene(weapon, this.scene.theme));
  }
}
