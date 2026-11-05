/**
 * PERFECT SHOT — v2 effects.
 *
 * Particles, floating score text and the light flash. Kept in its own module
 * because it is the one part of the game that is pure decoration: a host can
 * delete this file, replace `spawnBurst()` with a no-op read, and the rules in
 * `game.ts` still hold.
 *
 * No allocation in the hot path beyond the pool below — a 300-particle cap keeps
 * a long run flat in memory and in frame time.
 */
import { TAU } from './config';

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Seconds left. */
  life: number;
  max: number;
  size: number;
  /** `r,g,b`. */
  rgb: string;
  /** Gravity, px/s². */
  g: number;
  /** Rotation and its speed, radians. */
  rot: number;
  spin: number;
  /** Draw as a shard (rotating quad) rather than a dot. */
  shard: boolean;
}

export interface FloatText {
  x: number;
  y: number;
  text: string;
  life: number;
  max: number;
  color: string;
  size: number;
}

const MAX_PARTICLES = 300;

export class Juice {
  particles: Particle[] = [];
  texts: FloatText[] = [];
  /** 0…1 white flash over the whole board. */
  flash = 0;
  /** Flash colour, set by whatever spawned it. */
  flashColor = '255,255,255';
  /** 0…1 vignette pulse, used on a lost life. */
  damage = 0;

  clear(): void {
    this.particles.length = 0;
    this.texts.length = 0;
    this.flash = 0;
    this.damage = 0;
  }

  /** A burst of shards, e.g. when a knife lands or a wheel breaks. */
  burst(
    x: number,
    y: number,
    count: number,
    rgb: string,
    opts: { speed?: number; spread?: number; dir?: number; g?: number; shard?: boolean; size?: number } = {},
  ): void {
    const speed = opts.speed ?? 180;
    const spread = opts.spread ?? TAU;
    const dir = opts.dir ?? 0;
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= MAX_PARTICLES) return;
      const a = dir + (Math.random() - 0.5) * spread;
      const v = speed * (0.35 + Math.random() * 0.9);
      const life = 0.28 + Math.random() * 0.5;
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v,
        life,
        max: life,
        size: (opts.size ?? 3) * (0.6 + Math.random() * 0.9),
        rgb,
        g: opts.g ?? 420,
        rot: Math.random() * TAU,
        spin: (Math.random() - 0.5) * 14,
        shard: opts.shard ?? true,
      });
    }
  }

  /** Score / combo text drifting up from a point. */
  text(x: number, y: number, text: string, color: string, size = 22): void {
    if (this.texts.length > 24) this.texts.shift();
    this.texts.push({ x, y, text, life: 0.95, max: 0.95, color, size });
  }

  kickFlash(amount: number, rgb = '255,255,255'): void {
    this.flash = Math.max(this.flash, amount);
    this.flashColor = rgb;
  }

  kickDamage(amount = 1): void {
    this.damage = Math.max(this.damage, amount);
  }

  update(dt: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += p.g * dt;
      p.vx *= 1 - 1.6 * dt;
      p.rot += p.spin * dt;
    }
    for (let i = this.texts.length - 1; i >= 0; i--) {
      const t = this.texts[i];
      t.life -= dt;
      if (t.life <= 0) this.texts.splice(i, 1);
      else t.y -= 46 * dt;
    }
    this.flash = Math.max(0, this.flash - dt * 3.4);
    this.damage = Math.max(0, this.damage - dt * 1.7);
  }
}
