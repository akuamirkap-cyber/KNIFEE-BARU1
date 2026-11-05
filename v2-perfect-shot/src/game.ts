/**
 * PERFECT SHOT v2 — deterministic rules, independent of DOM, canvas, and audio.
 *
 * A run carries its score, combo and three lives across levels. A collision
 * costs a life, not the whole run; clearing a boss restores one life. Cosmetics
 * live in Juice; externally visible effects are queued as typed events, drained
 * once by the host. Nothing in here reads storage or starts a timer.
 */
import { COLLIDE, CX, CY, END_HOLD, FLIGHT, LIVES, MUZZLE, RADIUS, SCORE, TAU, clamp } from './config';
import { levelConfig, openingKnife, speedAt, type Level } from './levels';
import { Juice } from './juice';
import { weaponById, type Shape, type Weapon } from './weapons';

export type Status = 'play' | 'win' | 'lose';
export type Outcome = 'win' | 'lose';
export interface Shot { t: number; shape: Shape; rgb: string; spin: number }
export interface Stuck { angle: number; shape: Shape; rgb: string; born: number }
export interface Token { angle: number; collected: boolean }
export interface Reward { score: number; coins: number; perfect: boolean; stars: number; healed: boolean }

export type GameEvent =
  | { type: 'fire'; weapon: Weapon }
  | { type: 'land'; points: number; coins: number; combo: number; token: boolean }
  | { type: 'miss'; lives: number }
  | { type: 'clear'; level: number; reward: Reward }
  | { type: 'gameover' }
  | { type: 'level'; level: number };

export interface Scene {
  status: Status;
  level: Level;
  rot: number;
  time: number;
  /** Brief level introduction; no input or spin until it is finished. */
  intro: number;
  hits: number;
  stuck: Stuck[];
  shots: Shot[];
  tokens: Token[];
  weapon: Weapon;
  cooldown: number;
  flash: number;
  bump: number;
  shake: number;
  recoil: number;
  /** Brief recovery after losing a life; prevents another accidental shot. */
  hurt: number;
  endT: number;
  outcome: Outcome | null;
  juice: Juice;
  lives: number;
  score: number;
  runCoins: number;
  combo: number;
  maxCombo: number;
  totalHits: number;
  clears: number;
  misses: number;
  reward: Reward | null;
}

export interface GameOptions { level?: number; intro?: boolean }

/** Signed angular difference, wrapping around ±π. */
export function angleDelta(a: number, b: number): number {
  let d = (a - b) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d <= -Math.PI) d += TAU;
  return d;
}

export function multiplier(combo: number): number {
  return Math.min(SCORE.comboMax, 1 + Math.max(0, combo - 1) * SCORE.comboStep);
}

function freshScene(weapon: Weapon, options: GameOptions = {}): Scene {
  const level = levelConfig(options.level ?? 1);
  const stuck: Stuck[] = Array.from({ length: level.obstacles }, (_, i) => ({
    ...openingKnife(level.n, i), rgb: '211,221,232', born: -5,
  }));
  // Tokens only spawn in clear spots, never hidden behind an opening blade.
  const tokens: Token[] = [];
  for (let i = 0; i < 24 && tokens.length < 3; i++) {
    const angle = (level.n * 0.93 + i * 2.399963) % TAU;
    if (stuck.every((k) => Math.abs(angleDelta(k.angle, angle)) > 0.36)
      && tokens.every((c) => Math.abs(angleDelta(c.angle, angle)) > 0.65)) {
      tokens.push({ angle, collected: false });
    }
  }
  return {
    status: 'play', level, rot: 0, time: 0, intro: options.intro === false ? 0 : 1.15,
    hits: 0, stuck, shots: [], tokens, weapon, cooldown: 0,
    flash: 0, bump: 0, shake: 0, recoil: 0, hurt: 0, endT: 0, outcome: null,
    juice: new Juice(), lives: LIVES, score: 0, runCoins: 0, combo: 0,
    maxCombo: 0, totalHits: 0, clears: 0, misses: 0, reward: null,
  };
}

export class Game {
  /** Its identity is stable across restart/nextLevel, so a host can retain it. */
  readonly scene: Scene;
  private events: GameEvent[] = [];

  constructor(weaponId = 'knife', options: GameOptions = {}) {
    this.scene = freshScene(weaponById(weaponId), options);
  }

  setWeapon(id: string): void {
    this.scene.weapon = weaponById(id);
    // Changing gun must not bypass an existing cooldown. A projectile already
    // in flight keeps its own shape and colour, regardless of this selection.
  }

  spinAt(time = this.scene.time): number { return speedAt(this.scene.level, time); }
  get rimPoint(): { x: number; y: number } { return { x: CX, y: CY + RADIUS }; }
  get muzzle(): { x: number; y: number } { return { x: CX, y: MUZZLE + this.scene.recoil * 14 }; }
  get flight(): number { return FLIGHT; }

  fire(): boolean {
    const s = this.scene;
    if (s.status !== 'play' || s.intro > 0 || s.hurt > 0 || s.cooldown > 0 || s.shots.length) return false;
    s.cooldown = s.weapon.cooldown;
    s.recoil = 1;
    s.shots.push({ t: 0, shape: s.weapon.shape, rgb: s.weapon.rgb, spin: 0 });
    this.emit({ type: 'fire', weapon: s.weapon });
    return true;
  }

  update(dt: number): void {
    // Hidden tabs, invalid deltas, and clock changes must not teleport a shot.
    const step = Number.isFinite(dt) && dt > 0 ? Math.min(dt, 0.1) : 0;
    if (!step) return;
    const s = this.scene;
    s.juice.update(step);
    s.flash = Math.max(0, s.flash - step * 4.2);
    s.bump = Math.max(0, s.bump - step * 4.5);
    s.shake = Math.max(0, s.shake - step * 38);
    s.recoil = Math.max(0, s.recoil - step * 5.5);
    s.cooldown = Math.max(0, s.cooldown - step);
    s.hurt = Math.max(0, s.hurt - step);

    if (s.status !== 'play') {
      s.endT += step;
      return;
    }
    if (s.intro > 0) {
      s.intro = Math.max(0, s.intro - step);
      return;
    }
    s.time += step;
    s.rot = (s.rot + this.spinAt(s.time) * step) % TAU;
    // At most one shot, because every cooldown exceeds the flight time.
    for (let i = s.shots.length - 1; i >= 0; i--) {
      const shot = s.shots[i];
      shot.t += step / FLIGHT;
      shot.spin += step * 12;
      if (shot.t >= 1) {
        s.shots.splice(i, 1);
        this.land(shot);
      }
    }
  }

  private land(shot: Shot): void {
    const s = this.scene;
    if (s.status !== 'play') return;
    const angle = Math.PI / 2 - s.rot;
    const hit = s.stuck.some((k) => Math.abs(angleDelta(k.angle, angle)) < COLLIDE);
    const rim = this.rimPoint;
    if (hit) {
      s.lives = Math.max(0, s.lives - 1);
      s.misses += 1;
      s.combo = 0;
      s.hurt = 0.72;
      s.shake = 15;
      s.flash = 0.55;
      s.juice.burst(rim.x, rim.y, 24, '255,116,123', { speed: 240, size: 4 });
      s.juice.text(CX, CY + RADIUS + 75, '−1 NYAWA', '#ff8f9c', 23);
      s.juice.kickDamage();
      this.emit({ type: 'miss', lives: s.lives });
      if (!s.lives) {
        s.status = 'lose'; s.endT = 0; s.outcome = 'lose';
        this.emit({ type: 'gameover' });
      }
      return;
    }

    s.stuck.push({ angle, shape: shot.shape, rgb: shot.rgb, born: s.time });
    s.hits += 1;
    s.totalHits += 1;
    s.combo += 1;
    s.maxCombo = Math.max(s.maxCombo, s.combo);
    let token = false;
    for (const c of s.tokens) {
      if (!c.collected && Math.abs(angleDelta(c.angle, angle)) < 0.20) {
        c.collected = true;
        token = true;
      }
    }
    const points = Math.round(SCORE.hit * s.level.n * multiplier(s.combo)) + (token ? 250 : 0);
    const coins = 1 + (token ? SCORE.token : 0);
    s.score += points;
    s.runCoins += coins;
    s.flash = 0.7; s.bump = 1; s.shake = Math.max(s.shake, 4);
    s.juice.burst(rim.x, rim.y, token ? 22 : 12, token ? '255,211,117' : shot.rgb, {
      speed: 150, spread: Math.PI * 1.3, dir: -Math.PI / 2, size: 3,
    });
    s.juice.text(CX + 64, CY + RADIUS + 15, `+${points}`, token ? '#ffd77a' : '#b3ffdd', 22);
    if (token) s.juice.text(CX - 64, CY + RADIUS + 48, `+${SCORE.token} KOIN`, '#ffd77a', 15);
    if (s.combo % 5 === 0) s.juice.text(CX, CY + 24, `${s.combo} COMBO!`, '#79ffe0', 31);
    this.emit({ type: 'land', points, coins, combo: s.combo, token });

    if (s.hits >= s.level.aim) this.clearLevel();
  }

  private clearLevel(): void {
    const s = this.scene;
    const perfect = s.misses === 0;
    const healed = s.level.boss && s.lives < LIVES;
    if (healed) s.lives += 1;
    const reward: Reward = {
      score: (SCORE.clear + (perfect ? SCORE.perfect : 0) + (s.level.boss ? 500 : 0)) * s.level.n,
      coins: SCORE.coinsPerLevel + (perfect ? SCORE.coinsPerfect : 0) + (s.level.boss ? 30 : 0),
      perfect, stars: perfect ? 3 : s.misses === 1 ? 2 : 1, healed,
    };
    s.score += reward.score;
    s.runCoins += reward.coins;
    s.clears += 1;
    s.reward = reward;
    s.status = 'win'; s.endT = 0; s.outcome = 'win'; s.shake = 18; s.flash = 1;
    s.juice.kickFlash(0.42, '158,255,217');
    s.juice.burst(CX, CY, 88, s.level.boss ? '202,151,255' : '255,198,113', { speed: 360, size: 6 });
    s.juice.burst(CX, CY, 30, '125,255,209', { speed: 270, g: 130, shard: false, size: 3 });
    this.emit({ type: 'clear', level: s.level.n, reward });
  }

  get ended(): boolean { return this.scene.status !== 'play' && this.scene.endT >= END_HOLD; }

  clearOutcome(): Outcome | null {
    const out = this.scene.outcome;
    this.scene.outcome = null;
    return out;
  }

  /** Only a completed clear can advance. Score, lives and combo carry over. */
  nextLevel(): boolean {
    const s = this.scene;
    if (s.status !== 'win' || !this.ended) return false;
    const next = freshScene(s.weapon, { level: s.level.n + 1 });
    for (const key of ['lives', 'score', 'runCoins', 'combo', 'maxCombo', 'totalHits', 'clears'] as const) next[key] = s[key];
    Object.assign(s, next);
    this.emit({ type: 'level', level: s.level.n });
    return true;
  }

  restart(weaponId?: string, options: GameOptions = {}): void {
    const weapon = weaponId ? weaponById(weaponId) : this.scene.weapon;
    this.events.length = 0;
    Object.assign(this.scene, freshScene(weapon, options));
    this.emit({ type: 'level', level: this.scene.level.n });
  }

  /** Consumers drain once per frame; headless users may safely ignore effects. */
  takeEvents(): GameEvent[] {
    const out = this.events;
    this.events = [];
    return out;
  }

  private emit(event: GameEvent): void {
    // A host that never drains cannot build an unbounded queue in an endless run.
    if (this.events.length >= 64) this.events.shift();
    this.events.push(event);
  }
}

/** Normalised cooldown, exposed for hosts that draw their own HUD. */
export function readiness(scene: Scene): number {
  return clamp(1 - scene.cooldown / scene.weapon.cooldown, 0, 1);
}
