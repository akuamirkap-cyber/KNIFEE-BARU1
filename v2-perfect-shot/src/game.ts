import { CX, CY, GUN_Y, TAU } from './config';
import { makeLevel1 } from './levels';
import { PISTOL, PISTOL_EFFECT } from './weapons';

export type Phase = 'intro' | 'play' | 'clear' | 'over';
export type GameEvent = 'shot' | 'hit' | 'coin' | 'clear' | 'fail';
export interface Projectile { y: number }
export interface Mark { angle: number; at: number }
export interface Coin { angle: number; taken: boolean }
export interface Particle { x: number; y: number; vx: number; vy: number; life: number; max: number; size: number; color: string }
export const angleDifference = (a: number, b: number) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));

/** Pistol + v1 classic level-1 rules only. No campaign generator or other gun dispatch. */
export class PistolGame {
  readonly level;
  phase: Phase = 'intro';
  elapsed = 0;
  phaseTime = 0;
  rotation = 0;
  ammo = 5;
  score = 0;
  coins = 0;
  hits = 0;
  combo = 0;
  lastHit = -99;
  sinceShot = 99;
  cooldown = 0;
  recoil = 0;
  bump = 0;
  shake = 0;
  projectiles: Projectile[] = [];
  marks: Mark[] = [];
  rimCoins: Coin[] = [];
  particles: Particle[] = [];
  events: GameEvent[] = [];
  private readonly random: () => number;

  constructor(random = Math.random) {
    this.random = random;
    this.level = makeLevel1(random);
    for (let i = 0; i < this.level.coins; i++) this.rimCoins.push({ angle: (i + 0.32 + random() * 0.35) / Math.max(1, this.level.coins) * TAU, taken: false });
  }
  fire(): boolean {
    if (this.phase !== 'play' || this.cooldown > 0 || this.ammo <= 0) return false;
    this.ammo--;
    this.cooldown = PISTOL_EFFECT.cooldown;
    this.sinceShot = 0;
    this.recoil = 1;
    this.shake = PISTOL.shake;
    this.projectiles.push({ y: GUN_Y - 5 });
    this.events.push('shot');
    this.burst(CX + 20, GUN_Y + 48, 2, ['#e0ad40'], 90);
    return true;
  }
  update(delta: number): void {
    if (!Number.isFinite(delta) || delta <= 0) return;
    // Fixed microsteps also test the protruding rounds; fast bullets cannot tunnel through them.
    const dt = Math.min(delta, 0.05);
    const n = Math.ceil(dt / (1 / 240));
    for (let i = 0; i < n; i++) this.step(dt / n);
  }
  takeEvents(): GameEvent[] { const out = this.events; this.events = []; return out; }
  private step(dt: number): void {
    this.elapsed += dt;
    this.phaseTime += dt;
    this.sinceShot += dt;
    this.cooldown = Math.max(0, this.cooldown - dt);
    this.recoil *= Math.exp(-15 * dt);
    this.bump *= Math.exp(-15 * dt);
    this.shake *= Math.exp(-20 * dt);
    for (const p of this.particles) { p.life -= dt; p.vy += 900 * dt; p.x += p.vx * dt; p.y += p.vy * dt; }
    this.particles = this.particles.filter(p => p.life > 0);
    if (this.phase === 'intro') { if (this.phaseTime >= 0.95) { this.phase = 'play'; this.phaseTime = 0; } return; }
    if (this.phase !== 'play') return;
    this.rotation += this.level.base * this.level.dir * dt;
    for (const p of [...this.projectiles]) {
      p.y -= PISTOL_EFFECT.speed * dt;
      const reach = p.y - CY;
      const local = Math.PI / 2 - this.rotation;
      for (const c of this.rimCoins) {
        if (c.taken) continue;
        const a = c.angle + this.rotation;
        const r = this.level.radius + 18;
        if (Math.hypot(CX - (CX + Math.cos(a) * r), p.y - (CY + Math.sin(a) * r)) < PISTOL.coinRadius + 8) {
          c.taken = true; this.coins++; this.events.push('coin'); this.burst(CX, p.y, 8, ['#ffd23f', '#fff3b0'], 140);
        }
      }
      // Same tangential clearance and exposed half-length as v1's classic collision.
      const arc = (PISTOL.half * 2) / Math.max(50, this.level.radius);
      const protrusion = (PISTOL.stick + 12) * 0.5;
      if (reach <= this.level.radius + protrusion && reach >= this.level.radius - 8 && this.marks.some(m => angleDifference(local, m.angle) < arc)) {
        this.phase = 'over'; this.phaseTime = 0; this.events.push('fail');
        this.shake = 12; this.combo = 0; this.burst(CX, p.y, 22, ['#ffffff', '#ffda60', '#e26537'], 260);
        this.projectiles = [];
        return;
      }
      if (reach <= this.level.radius) {
        this.projectiles.splice(this.projectiles.indexOf(p), 1);
        this.marks.push({ angle: local, at: this.elapsed });
        this.combo = this.elapsed - this.lastHit < 0.5 ? this.combo + 1 : 1;
        this.lastHit = this.elapsed;
        this.score += PISTOL.points * (this.combo >= 3 ? 2 : 1);
        this.hits++; this.bump = 1; this.shake = 6;
        this.events.push('hit');
        this.burst(CX, CY + this.level.radius, 14, ['#fff4dc', '#fb923c', '#ffd23f'], 180);
        if (this.ammo === 0 && this.projectiles.length === 0) {
          this.phase = 'clear'; this.phaseTime = 0; this.events.push('clear');
          this.burst(CX, CY, 46, ['#fff4dc', '#fb923c', '#ffd23f'], 330);
          // Intentionally no next-level/unlock/auto-advance path. Replay makes another level 1.
        }
      }
    }
  }
  private burst(x: number, y: number, count: number, colors: string[], speed: number): void {
    for (let i = 0; i < count; i++) {
      const a = this.random() * TAU, v = speed * (0.25 + this.random() * 0.75), life = 0.3 + this.random() * 0.4;
      this.particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 100, life, max: life, size: 1.5 + this.random() * 3, color: colors[i % colors.length] });
    }
    if (this.particles.length > 140) this.particles.splice(0, this.particles.length - 140);
  }
}
