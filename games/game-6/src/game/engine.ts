import { P, TAU, audio, clamp, drawParticles, rnd, updateParticles, withAlpha } from './core';
import type { Particle } from './core';
import type { Beam, Bullet, GameAPI, Mark, Weapon } from './types';
import { WEAPONS } from './weapons';

export type GameState = 'ready' | 'playing' | 'won' | 'lost';

export interface PublicState {
  state: GameState;
  hits: number;
  required: number;
  ammo: number;
  weaponId: string;
  charge: number;
  message: string;
  practice: boolean;
}

const REQUIRED = 7;
const AMMO = 9;

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
  kick = { x: 0, y: 0, vx: 0, vy: 0 };

  time = 0;
  particles: Particle[] = [];
  bullets: Bullet[] = [];
  beams: Beam[] = [];
  marks: Mark[] = [];
  debris: { x: number; y: number; vx: number; vy: number; rot: number; spin: number; m: Mark }[] = [];
  timers: { t: number; fn: () => void }[] = [];

  shakeAmt = 0;
  flashColor = '#fff';
  flashAlpha = 0;
  hitstopT = 0;

  weapon: Weapon = WEAPONS[1];
  recoil = 0;
  charge = 0;
  charging = false;
  holding = false;
  cooldownT = 0;
  cycle = 1;
  queued = false;
  catchT = 99;
  outT = 0;

  aim = -Math.PI / 2;
  pointer = { x: 450, y: 100 };

  state: GameState = 'ready';
  hits = 0;
  ammo = AMMO;
  message = '';
  endT = 0;
  practice = false;

  onState: (s: PublicState) => void = () => {};
  private raf = 0;
  private last = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.resize();
    this.reset();
  }

  get floorY() {
    return this.H - 46;
  }

  /* ------------------------------- lifecycle ------------------------------ */
  start() {
    this.last = performance.now();
    const loop = (t: number) => {
      const dt = Math.min(0.033, (t - this.last) / 1000);
      this.last = t;
      this.update(dt);
      this.render();
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
    this.H = Math.max(360, rect.height);
    this.canvas.width = Math.floor(this.W * this.dpr);
    this.canvas.height = Math.floor(this.H * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.cx = this.W / 2;
    this.cy = this.H * 0.33;
    this.wheelR = clamp(Math.min(this.W, this.H) * 0.2, 72, 135);
  }

  reset() {
    this.marks = [];
    this.bullets = [];
    this.beams = [];
    this.particles = [];
    this.debris = [];
    this.timers = [];
    this.hits = 0;
    this.ammo = AMMO;
    this.state = 'ready';
    this.message = '';
    this.rotation = rnd(TAU);
    this.dir = Math.random() < 0.5 ? 1 : -1;
    this.rotSpeed = 1.4;
    this.charge = 0;
    this.charging = false;
    this.holding = false;
    this.cooldownT = 0;
    this.cycle = 1;
    this.queued = false;
    this.catchT = 99;
    this.outT = 0;
    this.kick = { x: 0, y: 0, vx: 0, vy: 0 };
    this.emit();
  }

  setPractice(on: boolean) {
    this.practice = on;
    this.reset();
  }

  setWeapon(id: string) {
    const w = WEAPONS.find((x) => x.id === id);
    if (w) {
      this.weapon = w;
      this.charge = 0;
      this.charging = false;
      this.cooldownT = 0;
      this.cycle = 1;
      this.queued = false;
      this.emit();
    }
  }

  emit() {
    this.onState({
      state: this.state,
      hits: this.hits,
      required: REQUIRED,
      ammo: this.ammo,
      weaponId: this.weapon.id,
      charge: this.charge,
      message: this.message,
      practice: this.practice,
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
    if (this.state === 'won' || this.state === 'lost') {
      if (this.time - this.endT > 0.6) this.reset();
      return;
    }
    this.holding = true;
    if (this.weapon.charged) {
      this.charging = true;
    } else {
      this.shoot();
    }
  }

  pressUp() {
    this.holding = false;
    if (this.charging) {
      this.charging = false;
      this.shoot();
      this.charge = 0;
    }
  }

  playerX() {
    return this.W / 2;
  }
  playerY() {
    return this.H - 70;
  }

  /** weapon-local coordinates -> world */
  toWorld(lx: number, ly: number) {
    const sc = this.weaponScale();
    const flip = Math.cos(this.aim) < 0 ? -1 : 1;
    const ca = Math.cos(this.aim),
      sa = Math.sin(this.aim);
    const x = lx * sc,
      y = ly * flip * sc;
    return { x: this.playerX() + x * ca - y * sa, y: this.playerY() + x * sa + y * ca };
  }

  muzzlePoint() {
    const [mx, my] = this.weapon.muzzle;
    return this.toWorld(mx - this.recoil * 8, my);
  }

  weaponScale() {
    return clamp(Math.min(this.W / 1500, this.H / 950), 0.4, 0.74);
  }

  handPulse() {
    this.catchT = 0;
  }

  after(sec: number, fn: () => void) {
    this.timers.push({ t: sec, fn });
  }

  shoot() {
    if (this.state === 'won' || this.state === 'lost') return;
    if (this.cooldownT > 0) {
      // input buffer: a click made just before the weapon is ready is remembered, not lost
      if (this.cooldownT <= 0.22 && !this.weapon.charged) this.queued = true;
      return;
    }
    if (!this.practice && this.ammo <= 0) return;
    if (this.state === 'ready') this.state = 'playing';
    const m = this.muzzlePoint();
    this.cooldownT = this.weapon.cooldown;
    this.cycle = 0;
    this.recoil = 1;
    if (!this.practice) this.ammo--;
    this.weapon.fire(this, m.x, m.y, this.aim, this.charge);
    this.emit();
  }

  /* --------------------------------- api ---------------------------------- */
  shake(n: number) {
    this.shakeAmt = Math.min(34, this.shakeAmt + n);
  }
  flash(color: string, a: number) {
    this.flashColor = color;
    this.flashAlpha = Math.max(this.flashAlpha, a);
  }
  hitstop(s: number) {
    this.hitstopT = Math.max(this.hitstopT, s);
  }

  hitscan(x: number, y: number, angle: number) {
    const dx = Math.cos(angle),
      dy = Math.sin(angle);
    const fx = x - this.cx,
      fy = y - this.cy;
    const b = 2 * (fx * dx + fy * dy);
    const c = fx * fx + fy * fy - this.wheelR * this.wheelR;
    const disc = b * b - 4 * c;
    if (disc < 0) return { hit: false, x: x + dx * 1600, y: y + dy * 1600, dist: 1600 };
    const sq = Math.sqrt(disc);
    const t1 = (-b - sq) / 2;
    if (t1 < 0) return { hit: false, x: x + dx * 1600, y: y + dy * 1600, dist: 1600 };
    return { hit: true, x: x + dx * t1, y: y + dy * t1, dist: t1 };
  }

  registerHit(x: number, y: number, weapon: Weapon, delay = 0, sizeMul = 1): boolean {
    if (this.state === 'lost' || this.state === 'won') return false;
    // when the impact visual lands `delay` seconds later, pre-compensate the wheel's spin
    const spin = this.dir * this.rotSpeed * (1 + 0.15 * Math.sin(this.time * 0.8));
    const a = Math.atan2(y - this.cy, x - this.cx) - (this.rotation + spin * delay);
    const size = weapon.markSize * sizeMul;
    // wheel recoils from the blow
    const dir = Math.atan2(this.cy - y, this.cx - x);
    const imp = weapon.markSize * 11;
    this.kick.vx += Math.cos(dir) * imp;
    this.kick.vy += Math.sin(dir) * imp;
    if (!this.practice) {
      for (const m of this.marks) {
        let d = a - m.a;
        while (d > Math.PI) d -= TAU;
        while (d < -Math.PI) d += TAU;
        const px = Math.abs(d) * this.wheelR;
        if (px < (size + m.size) * 0.45) {
          this.lose('TABRAKAN!');
          return false;
        }
      }
    }
    const mark: Mark = { weapon, a, r: this.wheelR, size, age: 0, seed: rnd(1000) };
    this.marks.push(mark);
    if (this.practice && this.marks.length > 20) this.marks.shift();
    this.hits++;
    if (!this.practice) this.rotSpeed = 1.4 + this.hits * 0.06;
    if (this.state === 'ready') this.state = 'playing';
    if (!this.practice && this.hits >= REQUIRED) this.win();
    this.emit();
    return true;
  }

  lose(msg: string) {
    if (this.state === 'lost' || this.state === 'won') return;
    this.state = 'lost';
    this.message = msg;
    this.endT = this.time;
    audio.play('fail');
    this.shake(30);
    this.flash('#ff6b6b', 0.4);
    this.hitstop(0.1);
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
          type: 'shard',
          x: this.cx + Math.cos(a) * this.wheelR * rnd(0.3, 1),
          y: this.cy + Math.sin(a) * this.wheelR * rnd(0.3, 1),
          vx: Math.cos(a) * rnd(100, 600),
          vy: Math.sin(a) * rnd(100, 600) - 100,
          size: rnd(3, 11),
          color: ['#8a5a2b', '#a9713a', '#6b4320', '#c08b4e'][i % 4],
          color2: '#e4bb83',
          rot: rnd(TAU),
          spin: rnd(-14, 14),
          grav: 1200,
          life: rnd(1, 2),
          drag: 0.995,
        })
      );
    }
    for (let i = 0; i < 24; i++)
      this.particles.push(
        P({
          type: 'smoke',
          x: this.cx + rnd(-60, 60),
          y: this.cy + rnd(-60, 60),
          vx: rnd(-120, 120),
          vy: rnd(-200, -20),
          size: rnd(50, 110),
          size2: 14,
          color: '#6b5a4a',
          life: rnd(1, 2.2),
        })
      );
    this.emit();
  }

  win() {
    this.state = 'won';
    this.message = 'LEVEL 1 CLEAR';
    this.endT = this.time;
    audio.play('win');
    this.flash('#ffe9a8', 0.3);
    for (let i = 0; i < 140; i++) {
      const a = rnd(TAU);
      const sp = rnd(120, 640);
      this.particles.push(
        P({
          type: i % 3 === 0 ? 'star' : 'ember',
          x: this.cx,
          y: this.cy,
          vx: Math.cos(a) * sp,
          vy: Math.sin(a) * sp,
          size: rnd(2, 7),
          color: ['#fde68a', '#67e8f9', '#f9a8d4', '#a7f3d0'][i % 4],
          color2: '#f59e0b',
          life: rnd(0.8, 2),
          grav: 260,
          drag: 0.97,
          width: 1.6,
        })
      );
    }
    this.emit();
  }

  /* -------------------------------- update -------------------------------- */
  update(dtRaw: number) {
    let dt = dtRaw;
    this.time += dtRaw;
    if (this.hitstopT > 0) {
      this.hitstopT -= dtRaw;
      dt *= 0.12;
    }

    if (this.state === 'playing' || this.state === 'ready') {
      this.rotation += this.dir * this.rotSpeed * (1 + 0.15 * Math.sin(this.time * 0.8)) * dt;
    } else if (this.state === 'won') {
      this.rotation += this.dir * this.rotSpeed * 2.2 * dt;
    }

    // wheel kick spring
    const k = this.kick;
    k.vx += (-420 * k.x - 14 * k.vx) * dtRaw;
    k.vy += (-420 * k.y - 14 * k.vy) * dtRaw;
    k.x += k.vx * dtRaw;
    k.y += k.vy * dtRaw;

    // timers (delayed effects such as ejected brass)
    for (let i = this.timers.length - 1; i >= 0; i--) {
      this.timers[i].t -= dtRaw;
      if (this.timers[i].t <= 0) {
        const f = this.timers[i].fn;
        this.timers.splice(i, 1);
        f();
      }
    }

    this.cooldownT = Math.max(0, this.cooldownT - dtRaw);
    this.cycle = this.weapon.cooldown > 0 ? clamp(1 - this.cooldownT / this.weapon.cooldown, 0, 1) : 1;
    this.recoil = Math.max(0, this.recoil - dtRaw * 6.4);
    if (this.charging && this.cooldownT <= 0) this.charge = clamp(this.charge + dtRaw * 3.4, 0, 1);

    this.catchT = Math.min(99, this.catchT + dtRaw);
    if (this.queued && this.cooldownT <= 0) {
      this.queued = false;
      this.shoot();
    }

    // out of ammo and nothing left in the air -> the round is over
    if (
      !this.practice &&
      this.state === 'playing' &&
      this.ammo <= 0 &&
      this.hits < REQUIRED &&
      this.bullets.length === 0 &&
      this.beams.length === 0 &&
      this.timers.length === 0
    ) {
      this.outT += dtRaw;
      if (this.outT > 1.1) this.lose('AMUNISI HABIS');
    } else this.outT = 0;

    // hold-to-fire in practice mode
    if (this.practice && this.holding && !this.weapon.charged && this.cooldownT <= 0) this.shoot();

    // ambient dust
    if (Math.random() < 0.5)
      this.particles.push(
        P({
          type: 'glow',
          x: rnd(this.W),
          y: this.H + 10,
          vx: rnd(-14, 14),
          vy: rnd(-40, -12),
          size: rnd(1.2, 3),
          size2: 0.4,
          color: '#ffdcaa',
          color2: '#ff9f50',
          life: rnd(2.5, 5),
          drag: 1,
        })
      );

    updateParticles(this.particles, dt);
    if (this.particles.length > 1800) this.particles.splice(0, this.particles.length - 1800);

    // bullets
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.age += dt;
      b.update?.(b, dt, this);
      if (b.dead) {
        this.bullets.splice(i, 1);
        continue;
      }
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.angle = b.spin ? b.angle : Math.atan2(b.vy, b.vx);
      b.trail.push({ x: b.x, y: b.y });
      if (b.trail.length > b.trailMax) b.trail.shift();

      const d = Math.hypot(b.x - this.cx, b.y - this.cy);
      if (d <= this.wheelR + b.size * 0.4 && this.state !== 'lost') {
        const a = Math.atan2(b.y - this.cy, b.x - this.cx);
        const hx = this.cx + Math.cos(a) * this.wheelR;
        const hy = this.cy + Math.sin(a) * this.wheelR;
        if (b.collide) {
          // persistent projectile: it bounces / keeps living instead of being consumed
          if (b.collide(b, this, { x: hx, y: hy, nx: Math.cos(a), ny: Math.sin(a) })) this.bullets.splice(i, 1);
          continue;
        }
        b.weapon.onImpact?.(this, hx, hy, b.angle);
        this.registerHit(hx, hy, b.weapon);
        this.bullets.splice(i, 1);
        continue;
      }
      if (b.age > b.life || b.x < -200 || b.x > this.W + 200 || b.y < -300 || b.y > this.H + 200) {
        this.bullets.splice(i, 1);
      }
    }

    // beams
    for (let i = this.beams.length - 1; i >= 0; i--) {
      const bm = this.beams[i];
      if (bm.hit && !bm.impacted && bm.age >= (bm.impactDelay ?? 0)) {
        bm.impacted = true;
        bm.weapon.onImpact?.(this, bm.hitX, bm.hitY, bm.angle);
      }
      bm.age += dt;
      bm.tick?.(bm, dt, this);
      if (bm.age >= bm.duration) this.beams.splice(i, 1);
    }

    for (const m of this.marks) {
      m.age += dt;
      if (m.weapon.ambient) {
        const wa = this.rotation + m.a;
        m.weapon.ambient(this, this.cx + this.kick.x + Math.cos(wa) * m.r, this.cy + this.kick.y + Math.sin(wa) * m.r, wa, m, dt);
      }
    }

    for (const d of this.debris) {
      d.vy += 1300 * dt;
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      d.rot += d.spin * dt;
    }
    this.debris = this.debris.filter((d) => d.y < this.H + 200);

    this.shakeAmt *= Math.pow(0.001, dtRaw);
    this.flashAlpha = Math.max(0, this.flashAlpha - dtRaw * 2.2);
  }

  /* -------------------------------- render -------------------------------- */
  render() {
    const ctx = this.ctx;
    const { W, H } = this;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    this.drawBackground(ctx);

    ctx.save();
    // cinematic punch-zoom: the whole scene pushes in a touch on heavy hits/shots
    const zoomK = clamp(this.shakeAmt / 30, 0, 1);
    if (zoomK > 0.02) {
      const zs = 1 + zoomK * zoomK * 0.03;
      ctx.translate(this.cx, this.cy);
      ctx.scale(zs, zs);
      ctx.translate(-this.cx, -this.cy);
    }
    if (this.shakeAmt > 0.3) {
      ctx.translate(rnd(-this.shakeAmt, this.shakeAmt) * 0.35, rnd(-this.shakeAmt, this.shakeAmt) * 0.35);
    }

    this.drawWheel(ctx);
    this.drawDebris(ctx);

    for (const bm of this.beams) bm.draw(ctx, bm, this.time);
    drawParticles(ctx, this.particles);
    for (const b of this.bullets) b.draw(ctx, b, this.time);

    this.drawAimGuide(ctx);
    this.drawPlayer(ctx);
    ctx.restore();

    this.drawOverlay(ctx);
  }

  private drawBackground(ctx: CanvasRenderingContext2D) {
    const { W, H } = this;
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#0b1020');
    g.addColorStop(0.45, '#121a2e');
    g.addColorStop(1, '#070a13');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const sp = ctx.createRadialGradient(this.cx, this.cy, 10, this.cx, this.cy, this.wheelR * 4.2);
    sp.addColorStop(0, 'rgba(90,130,200,0.28)');
    sp.addColorStop(0.5, 'rgba(60,90,160,0.1)');
    sp.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = sp;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();

    const fy = H - 54;
    const fg = ctx.createLinearGradient(0, fy - 30, 0, H);
    fg.addColorStop(0, 'rgba(20,28,44,0)');
    fg.addColorStop(0.4, '#141c2c');
    fg.addColorStop(1, '#0a0e18');
    ctx.fillStyle = fg;
    ctx.fillRect(0, fy - 30, W, H - fy + 30);
    ctx.strokeStyle = 'rgba(120,180,255,0.18)';
    ctx.lineWidth = 1;
    for (let i = -8; i <= 8; i++) {
      ctx.beginPath();
      ctx.moveTo(W / 2 + i * 40, fy);
      ctx.lineTo(W / 2 + i * 220, H);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(0, fy);
    ctx.lineTo(W, fy);
    ctx.strokeStyle = 'rgba(140,200,255,0.3)';
    ctx.stroke();
  }

  private drawWheel(ctx: CanvasRenderingContext2D) {
    if (this.state === 'lost') return;
    const R = this.wheelR;
    const cx = this.cx + this.kick.x,
      cy = this.cy + this.kick.y;
    ctx.save();

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const halo = ctx.createRadialGradient(cx, cy, R * 0.8, cx, cy, R * 1.9);
    halo.addColorStop(0, 'rgba(255,190,110,0.18)');
    halo.addColorStop(1, 'rgba(255,150,60,0)');
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(cx, cy, R * 1.9, 0, TAU);
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.beginPath();
    ctx.ellipse(cx + 8, cy + 14, R * 1.02, R * 1.02, 0, 0, TAU);
    ctx.fill();

    ctx.translate(cx, cy);
    ctx.save();
    ctx.rotate(this.rotation);

    const rim = ctx.createLinearGradient(-R, -R, R, R);
    rim.addColorStop(0, '#9aa7b8');
    rim.addColorStop(0.3, '#55606f');
    rim.addColorStop(0.55, '#2c333e');
    rim.addColorStop(0.8, '#6b7787');
    rim.addColorStop(1, '#20262f');
    ctx.fillStyle = rim;
    ctx.beginPath();
    ctx.arc(0, 0, R, 0, TAU);
    ctx.fill();

    const face = ctx.createRadialGradient(-R * 0.3, -R * 0.35, R * 0.1, 0, 0, R * 0.94);
    face.addColorStop(0, '#d8a062');
    face.addColorStop(0.45, '#b2763c');
    face.addColorStop(0.78, '#8a5526');
    face.addColorStop(1, '#5d3516');
    ctx.fillStyle = face;
    ctx.beginPath();
    ctx.arc(0, 0, R * 0.92, 0, TAU);
    ctx.fill();

    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 0, R * 0.92, 0, TAU);
    ctx.clip();
    for (let i = 0; i < 9; i++) {
      ctx.beginPath();
      ctx.strokeStyle = i % 2 ? 'rgba(80,45,18,0.3)' : 'rgba(225,180,130,0.14)';
      ctx.lineWidth = 1 + (i % 3);
      ctx.ellipse(-R * 0.08 + Math.sin(i) * 4, R * 0.04, R * (0.1 + i * 0.1), R * (0.12 + i * 0.097), 0.3, 0, TAU);
      ctx.stroke();
    }
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * TAU;
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(60,32,12,0.35)';
      ctx.lineWidth = 1.6;
      ctx.moveTo(Math.cos(a) * R * 0.2, Math.sin(a) * R * 0.2);
      ctx.lineTo(Math.cos(a) * R * 0.92, Math.sin(a) * R * 0.92);
      ctx.stroke();
    }
    ctx.restore();

    ctx.strokeStyle = 'rgba(200,60,50,0.55)';
    ctx.lineWidth = R * 0.07;
    ctx.beginPath();
    ctx.arc(0, 0, R * 0.56, 0, TAU);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(240,240,245,0.35)';
    ctx.lineWidth = R * 0.03;
    ctx.beginPath();
    ctx.arc(0, 0, R * 0.74, 0, TAU);
    ctx.stroke();

    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * TAU;
      const bx = Math.cos(a) * R * 0.965,
        by = Math.sin(a) * R * 0.965;
      const bg = ctx.createRadialGradient(bx - 1, by - 1, 0, bx, by, 5);
      bg.addColorStop(0, '#e2e8f0');
      bg.addColorStop(0.5, '#94a3b8');
      bg.addColorStop(1, '#334155');
      ctx.fillStyle = bg;
      ctx.beginPath();
      ctx.arc(bx, by, 4.2, 0, TAU);
      ctx.fill();
    }

    for (const m of this.marks) {
      ctx.save();
      ctx.rotate(m.a);
      ctx.translate(m.r, 0);
      m.weapon.drawMark(ctx, m, this.time);
      ctx.restore();
    }

    const hub = ctx.createRadialGradient(-4, -5, 1, 0, 0, R * 0.2);
    hub.addColorStop(0, '#f1f5f9');
    hub.addColorStop(0.4, '#94a3b8');
    hub.addColorStop(1, '#1e293b');
    ctx.fillStyle = hub;
    ctx.beginPath();
    ctx.arc(0, 0, R * 0.19, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = 'rgba(10,15,25,0.8)';
    ctx.lineWidth = 2;
    ctx.stroke();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU + this.rotation * 0.4;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * R * 0.12, Math.sin(a) * R * 0.12, 2.2, 0, TAU);
      ctx.fillStyle = '#0f172a';
      ctx.fill();
    }
    ctx.restore();

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const spec = ctx.createLinearGradient(-R, -R, R * 0.4, R * 0.5);
    spec.addColorStop(0, 'rgba(255,255,255,0.22)');
    spec.addColorStop(0.5, 'rgba(255,255,255,0.03)');
    spec.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = spec;
    ctx.beginPath();
    ctx.arc(0, 0, R, 0, TAU);
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
    if (this.state === 'lost' || this.state === 'won') return;
    const m = this.muzzlePoint();
    const hs = this.hitscan(m.x, m.y, this.aim);
    const acc = this.weapon.accent;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.setLineDash([3, 12]);
    ctx.lineDashOffset = -this.time * 60;
    ctx.strokeStyle = withAlpha(acc, 0.3);
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(m.x, m.y);
    ctx.lineTo(hs.x, hs.y);
    ctx.stroke();
    ctx.setLineDash([]);
    if (hs.hit) {
      const r = 10 + Math.sin(this.time * 8) * 2;
      ctx.strokeStyle = withAlpha(acc, 0.8);
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(hs.x, hs.y, r, 0, TAU);
      ctx.stroke();
      ctx.beginPath();
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * TAU + this.time * 1.5;
        ctx.moveTo(hs.x + Math.cos(a) * (r + 3), hs.y + Math.sin(a) * (r + 3));
        ctx.lineTo(hs.x + Math.cos(a) * (r + 9), hs.y + Math.sin(a) * (r + 9));
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawPlayer(ctx: CanvasRenderingContext2D) {
    const px = this.playerX(),
      py = this.playerY();
    const sc = this.weaponScale();

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(px, py + 40, 4, px, py + 40, 120);
    g.addColorStop(0, withAlpha(this.weapon.accent, 0.3));
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(px, py + 42, 120, 32, 0, 0, TAU);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.fillStyle = '#121824';
    ctx.strokeStyle = 'rgba(150,200,255,0.3)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(px, py + 44, 68, 18, 0, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // global recoil punch: the whole weapon body jumps back along the aim and
    // snaps back with a short overshoot, scaled by how heavy the weapon is
    const recoilN = clamp(this.recoil, 0, 1);
    const kickBack = recoilN * this.weapon.recoilAmt * 1.35;
    const bounce = Math.sin(recoilN * Math.PI) * this.weapon.recoilAmt * 0.28;
    const px2 = px - Math.cos(this.aim) * kickBack;
    const py2 = py - Math.sin(this.aim) * kickBack - bounce;

    ctx.save();
    ctx.translate(px2, py2);
    ctx.rotate(this.aim);
    if (Math.cos(this.aim) < 0) ctx.scale(1, -1);
    ctx.scale(sc, sc);
    let out = 0;
    for (const b of this.bullets) if (b.weapon === this.weapon) out++;
    this.weapon.draw(ctx, { t: this.time, recoil: this.recoil, charge: this.charge, cycle: this.cycle, out, catchT: this.catchT });
    ctx.restore();

    if (this.weapon.charged && this.charge > 0.02) {
      ctx.save();
      ctx.translate(px, py + 70);
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(-60, -5, 120, 10);
      const cg = ctx.createLinearGradient(-60, 0, 60, 0);
      cg.addColorStop(0, '#34d399');
      cg.addColorStop(0.6, '#fde047');
      cg.addColorStop(1, '#f87171');
      ctx.fillStyle = cg;
      ctx.fillRect(-58, -3, 116 * this.charge, 6);
      ctx.restore();
    }
  }

  private drawOverlay(ctx: CanvasRenderingContext2D) {
    const { W, H } = this;
    if (this.flashAlpha > 0.001) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = withAlpha(this.flashColor, this.flashAlpha * 0.6);
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }
    const v = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75);
    v.addColorStop(0, 'rgba(0,0,0,0)');
    v.addColorStop(1, 'rgba(0,0,0,0.62)');
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, W, H);

    if (this.state === 'lost' || this.state === 'won') {
      const k = clamp((this.time - this.endT) * 2.2, 0, 1);
      ctx.save();
      ctx.globalAlpha = k;
      ctx.fillStyle = 'rgba(5,8,15,0.55)';
      ctx.fillRect(0, 0, W, H);
      ctx.textAlign = 'center';
      const big = this.state === 'won' ? 'LEVEL 1 CLEAR' : 'GAGAL';
      ctx.font = `800 ${Math.round(Math.min(W * 0.1, 64))}px ui-sans-serif, system-ui, sans-serif`;
      const grad = ctx.createLinearGradient(0, H / 2 - 50, 0, H / 2 + 20);
      if (this.state === 'won') {
        grad.addColorStop(0, '#fef3c7');
        grad.addColorStop(1, '#f59e0b');
      } else {
        grad.addColorStop(0, '#fecaca');
        grad.addColorStop(1, '#ef4444');
      }
      ctx.fillStyle = grad;
      ctx.shadowColor = this.state === 'won' ? 'rgba(245,158,11,0.8)' : 'rgba(239,68,68,0.8)';
      ctx.shadowBlur = 30;
      ctx.fillText(big, W / 2, H / 2 - 6);
      ctx.shadowBlur = 0;
      ctx.font = '600 18px ui-sans-serif, system-ui, sans-serif';
      ctx.fillStyle = 'rgba(226,232,240,0.9)';
      ctx.fillText(
        this.state === 'won' ? `${this.hits} tembakan sempurna • klik untuk main lagi` : `${this.message} • klik untuk coba lagi`,
        W / 2,
        H / 2 + 34
      );
      ctx.restore();
    } else if (this.state === 'ready') {
      const pulse = 0.6 + 0.4 * Math.sin(this.time * 3);
      ctx.save();
      ctx.textAlign = 'center';
      ctx.font = '700 15px ui-sans-serif, system-ui, sans-serif';
      ctx.fillStyle = `rgba(226,232,240,${0.45 * pulse})`;
      ctx.fillText(
        this.weapon.hint ?? (this.weapon.charged ? 'TAHAN untuk menarik busur, LEPAS untuk menembak' : 'KLIK / SPASI untuk menembak'),
        W / 2,
        H - 16
      );
      ctx.restore();
    }
  }
}

export { WEAPONS };
