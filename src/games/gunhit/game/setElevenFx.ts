/**
 * Slide-11 (`games/game-8` / Knife-Hit Arsenal FX) runtime for slide 1.
 *
 * Slide 11's own game object hosts everything visual: its particle system, its
 * `Fx` list, its `Embed` wheel marks and its `SoundEngine`. This module owns a
 * real slide-11 `Game` and gives slide 1 the same five calls slide 7 and slide 9
 * got — fire, take the round, follow it, report the hit, draw — while slide 1
 * keeps the rules (flight, hit test, score, ammo).
 */
import { Game } from '../../../../games/game-8/src/game/engine';
import type { Embed, Proj, Weapon, WeaponState } from '../../../../games/game-8/src/game/types';
import { clamp, drawGlow, rand, TAU } from '../../../../games/game-8/src/game/util';
import { restElevenState, elevenScale, elevenWeapon, type ElevenId } from './setElevenArt';

/** What slide 1 does for slide 11. */
export interface ElevenHooks {
  shake(amount: number): void;
  flash(color: string, strength: number): void;
  hitStop(seconds: number): void;
  wheel(): { x: number; y: number; R: number; angle: number };
}

const NO_HOOKS: ElevenHooks = {
  shake: () => {},
  flash: () => {},
  hitStop: () => {},
  wheel: () => ({ x: 0, y: 0, R: 0, angle: 0 }),
};

/** Slide 11's own master switch, so slide 1's mute button silences it too. */
let muted = false;
/** Every slide-11 sound engine slide 1 has built so far (one per gun shell). */
const engines = new Set<Game['sfx']>();

function useEngine(sfx: Game['sfx']) {
  engines.add(sfx);
  // Slide 11 stores its mute switch in `localStorage` under `arsenal-mute`.
  // Whoever toggled sound on slide 11 last would otherwise leave every ported
  // gun silent on slide 1 forever — slide 1 owns the switch here.
  sfx.muted = muted;
  // …and slide 11's background music must never start over slide 1's game.
  sfx.musicOn = false;
  return sfx;
}

/** Slide 11's current mute state, so a temporary silence can be undone. */
export function elevenMuted(): boolean {
  return muted;
}

export function setElevenMuted(m: boolean) {
  muted = m;
  for (const sfx of engines) {
    try {
      sfx.muted = m;
    } catch {
      /* an engine that was never unlocked has nothing to mute */
    }
  }
}

function sfxOf(fx: SetElevenFx): Game['sfx'] | null {
  const g = fx.raw;
  return g ? g.sfx : null;
}

/** Slide 11's audio graph may only start after a user gesture. */
export function unlockElevenAudio(fx: SetElevenFx) {
  const sfx = sfxOf(fx) as unknown as { ensure?: () => boolean; musicOn?: boolean; ac?: AudioContext } | null;
  if (!sfx) return;
  try {
    useEngine(sfx as unknown as Game['sfx']);
    if (sfx.ensure?.() && sfx.ac && sfx.ac.state === 'suspended') void sfx.ac.resume();
    setElevenMuted(muted);
  } catch {
    /* No AudioContext (tests / unsupported): the visuals still run. */
  }
}

/** A canvas for slide 11's own background/face sprites; headless-safe. */
function spriteCanvas(): HTMLCanvasElement | null {
  if (typeof document === 'undefined' || typeof document.createElement !== 'function') return null;
  try {
    return document.createElement('canvas');
  } catch {
    return null;
  }
}

export class SetElevenFx {
  /* ── slide-1 geometry, mirrored every frame ──────────────────────────── */
  cx = 210;
  wy = 300;
  wheelR = 96;
  rotation = 0;
  gunX = 210;
  gunY = 575;

  /** Slide 11's live world (this is the real object slide 11 authored). */
  raw: Game | null = null;
  /** True once slide 11's world helpers have been bound to slide 1's scale. */
  private worldPatched = false;

  weaponId: ElevenId = 'ak47';
  state: WeaponState = restElevenState();
  /** Rounds slide 1 already took from slide 11. */
  private taken = new Set<Proj>();
  private carried = new Set<Proj>();
  shotsFired = 0;
  private hooks: ElevenHooks;

  constructor(hooks: ElevenHooks = NO_HOOKS) {
    this.hooks = hooks;
    const canvas = spriteCanvas();
    if (!canvas) return;
    try {
      const g = new Game(canvas, 1);
      useEngine(g.sfx);
      // Slide 11's constants become slide 1's, so every authored world point
      // (`g.lw`, `g.muzzlePos`, `g.aim`, embed angles) lands where slide 1 is.
      const raw = g as unknown as Record<string, unknown>;
      raw.W = 420;
      raw.H = 760;
      raw.state = 'play';
      raw.swapT = 1;
      (g.wheel as { scale: number }).scale = 1;
      this.raw = g;
      this.muteOwnWheelBreak();
      this.adopt();
      this.selectWeapon('ak47');
    } catch {
      /* No 2D canvas available: the runtime simply has nothing to draw. */
    }
  }

  setHooks(h: ElevenHooks) {
    this.hooks = h;
  }

  /* ── slide-1 geometry ─────────────────────────────────────────────────── */

  /** Mirror slide 1's wheel into slide 11's coordinates. */
  syncWheel() {
    const w = this.hooks.wheel();
    this.cx = w.x;
    this.wy = w.y;
    this.wheelR = w.R;
    this.rotation = w.angle;
    this.adopt();
  }

  /** The scale slide 1 actually draws this gun at. */
  scaleOf(): number {
    const w = this.raw?.weapon;
    return (w ? elevenScale(this.weaponId) * (w.scale ?? 1) : 1);
  }

  private adopt() {
    const g = this.raw;
    if (!g) return;
    const raw = g as unknown as Record<string, unknown>;
    const w = g.weapon;
    const sc = w ? elevenScale(this.weaponId) * (w.scale ?? 1) : 1;
    if (w && !this.worldPatched) {
      // Slide 11's own `lw()` / `muzzlePos()` scale by `weapon.scale` alone. On
      // slide 1 that gun is drawn at `elevenScale * scale`, so the muzzle, the
      // side vents and every spawn point have to use the same scale — or the
      // flash and the rounds appear somewhere other than the barrel.
      const self = this;
      const host = g as unknown as {
        lw(x: number, y: number): { x: number; y: number };
        muzzlePos(): { x: number; y: number };
      };
      host.lw = (x: number, y: number) => {
        const weapon = self.raw?.weapon;
        const k = self.scaleOf();
        const base = (self.raw as unknown as { baseY: number }).baseY;
        return {
          x: self.cx + (y - (weapon?.muzzleY ?? 0)) * k,
          y: base - (x - (self.state.recoil * (weapon?.kick ?? 0))) * k,
        };
      };
      host.muzzlePos = () => {
        const weapon = self.raw?.weapon;
        const k = self.scaleOf();
        const base = (self.raw as unknown as { baseY: number }).baseY;
        return {
          x: self.cx,
          y: base - ((weapon?.muzzle ?? 0) - self.state.recoil * (weapon?.kick ?? 0)) * k,
        };
      };
      this.worldPatched = true;
    }
    raw.cx = this.cx;
    raw.wy0 = this.wy;
    // Slide 11 anchors the *stock* at `baseY` and puts the muzzle `muzzle * sc`
    // above it. Slide 1 anchors the *muzzle* line, so the base has to sit that
    // far below it — otherwise slide 11 spawns flashes and rounds above the gun.
    raw.baseY = this.gunY + (w ? w.muzzle * sc : 0);
    raw.R = this.wheelR;
    raw.W = 420;
    raw.H = 760;
    // The wheel kick shifts `wy`; slide 1 owns the wheel, so pin it.
    g.wheel.kick = 0;
    g.wheel.kickV = 0;
    g.wheel.scale = 1;
    g.wheel.spawnT = 1;
    // Slide 11 stores its entry holes and aim in wheel-local angles, so its own
    // spin has to be slide 1's spin: otherwise every mark lands at the wrong
    // angle and slides around the rim with the wheel.
    g.wheel.angle = this.rotation;
    g.state = 'play';
  }

  /* ── slide-11's own weapon ────────────────────────────────────────────── */

  /** Start a weapon: a different gun starts from a clean layer. */
  selectWeapon(id: ElevenId) {
    const g = this.raw;
    if (!g) {
      this.weaponId = id;
      return;
    }
    const changed = this.weaponId !== id || g.weapon?.id !== id;
    this.weaponId = id;
    if (changed) {
      g.setWeapon(elevenWeapon(id));
      this.state = g.ws;
      g.parts.length = 0;
      g.fx.length = 0;
      g.projs.length = 0;
      g.embeds.length = 0;
      this.taken.clear();
      this.carried.clear();
      this.shotsFired = 0;
    }
    this.adopt();
  }

  get weapon(): Weapon {
    return elevenWeapon(this.weaponId);
  }

  /** Slide-11's own trigger: muzzle FX, particles, sound and its real round. */
  fire(x: number, y: number, charge = 0) {
    const g = this.raw;
    if (!g) return;
    this.gunX = x;
    this.gunY = y;
    this.adopt();
    const w = g.weapon;
    const ws = g.ws;
    this.shotsFired++;
    ws.holding = false;
    ws.cd = ws.cdMax = w.cooldown;
    ws.ready = 0;
    ws.recoil = 1;
    ws.fireT = 0;
    ws.shots++;
    if (w.channel) ws.minHold = w.minHold ?? 0.35;
    try {
      g.sfx.playFire(w.id);
    } catch {
      /* audio is optional */
    }
    if (w.onRelease) {
      ws.charge = charge;
      w.onRelease(g, ws, charge);
      try {
        g.sfx.playRelease(w.id, charge);
      } catch {
        /* audio is optional */
      }
    } else {
      w.fire?.(g, ws);
    }
    // Muzzle flash for the guns that draw one in their own coordinates.
    if (w.muzzle > 0 && w.id !== 'ironman' && w.id !== 'tripod') {
      const m = this.muzzlePos();
      g.muzzleFlash(m.x, m.y, { size: 9, color: w.accent });
    }
  }

  /** Slide-11's muzzle in slide-1 screen space (the anchor slide 1 draws at). */
  muzzlePos() {
    return { x: this.gunX, y: this.gunY };
  }

  /**
   * The rounds slide 11 created but nobody carries yet. Some weapons release
   * their shot a frame later (bursts, drones), so slide 1 asks again for a few
   * frames after the trigger.
   */
  takeShots(): Proj[] {
    const g = this.raw;
    if (!g) return [];
    const made = g.projs.filter((p) => !this.taken.has(p));
    // Only hand the round over: it becomes slide 1's on `carry()`. A volley
    // slide 1 cannot carry (a twelve-orb burst, a later timer shot) must keep
    // flying on slide 11's own physics instead of freezing at the muzzle.
    for (const p of made) this.taken.add(p);
    return made;
  }

  /** True when slide 11 fired a projectile (as opposed to a channel/beam). */
  get hasRound(): boolean {
    return this.raw ? this.raw.projs.length > 0 : false;
  }

  /** Slide 1 hands the carried round's real position back to slide 11. */
  carry(p: Proj, x: number, y: number, angle: number) {
    p.x = x;
    p.y = y;
    if (!p.noCollide) p.data = { ...(p.data ?? {}), aim: angle };
    this.taken.add(p);
    this.carried.add(p);
  }

  /** Slide-11's own impact FX for a round that landed on slide 1's wheel. */
  impact(x: number, y: number, p?: Proj) {
    const g = this.raw;
    if (!g) return;
    const proj = p ?? null;
    if (proj) {
      proj.alive = false;
      try {
        proj.onHit(g, x, y, proj);
      } catch {
        /* a weapon's own burst must never break the frame */
      }
      this.carried.delete(proj);
      this.taken.delete(proj);
    }
  }

  /** A round that died on an occupied spot still sparks, like slide 11's. */
  block(x: number, y: number) {
    const g = this.raw;
    if (!g) return;
    const n = Math.atan2(y - this.wy, x - this.cx);
    g.burst(x, y, {
      n: 10, ang: n, spread: 1.1, speed: [180, 520], life: [0.12, 0.3],
      size: [1.2, 2.4], pal: ['#fff6c8', '#ffd35a', '#ff9a2e'], len: 0.05, ay: 500,
    });
    g.glow(x, y, 26, '#ffe9a8', 0.12);
    g.ring(x, y, 3, 20, '#fff0c0', 0.2, 2.2);
  }

  /** True while slide 11 still has something to draw or animate. */
  get busy(): boolean {
    const g = this.raw;
    if (!g) return false;
    return g.parts.length > 0 || g.fx.length > 0 || g.projs.length > 0
      || g.embeds.length > 0 || this.state.chan > 0.01 || this.state.minHold > 0;
  }

  /**
   * Slide 11's own wheel must never break.
   *
   * `Game.hit()` counts the hits that land on slide 11's own wheel and, at
   * `goal` (15), calls its own `breakWheel()`: eleven wedges clipped out of
   * slide 11's *wooden* face plus seventy wood chips, drawn from slide 11's
   * wheel centre — and slide 1 draws that whole layer on top of its own wheel.
   * The player saw a second, extra wheel shattering around the real one, while
   * the actual SGA wheel stayed intact ("ada 2 roda, roda asli SGA aman").
   *
   * It came back level after level because `adopt()` pins slide 11's `state`
   * back to `'play'` every frame and nothing ever reset its hit counter, so the
   * hidden wheel broke again every 15 hits. Slide 1 owns the stages, the hits
   * and the score; slide 11 only lends its guns, rounds and impact FX.
   */
  private muteOwnWheelBreak() {
    const g = this.raw as unknown as { breakWheel?: () => void; hits: number } | null;
    if (!g) return;
    g.breakWheel = () => {};
    g.hits = 0;
  }

  clear() {
    const g = this.raw;
    this.taken.clear();
    this.carried.clear();
    if (!g) return;
    // A new stage starts with slide 11's own level flow at zero as well.
    this.muteOwnWheelBreak();
    g.parts.length = 0;
    g.fx.length = 0;
    g.projs.length = 0;
    g.embeds.length = 0;
    g.wheel.heat = 0;
    g.wheel.freeze = 0;
    g.wheel.freezeT = 0;
    g.wheel.flash = 0;
    g.wheel.shiver = 0;
    this.state.chan = 0;
    this.state.minHold = 0;
    this.state.recoil = 0;
  }

  /* ── one frame of slide 11 ────────────────────────────────────────────── */

  advance(dt: number, holding = false) {
    try {
      this.step(dt, holding);
    } catch {
      // Slide 11's own weapon FX may never break slide 1's simulation: a thrown
      // frame is what makes the round look frozen or the wheel glitch.
    }
  }

  private step(dt: number, holding: boolean) {
    const g = this.raw;
    if (!g) return;
    this.adopt();
    g.time += dt;
    const w = g.weapon;
    const ws = this.state;
    ws.t += dt;
    ws.fireT += dt;
    ws.recoil *= Math.exp(-dt * 15);
    ws.cd = Math.max(0, ws.cd - dt);
    ws.ready = ws.cdMax > 0 ? 1 - ws.cd / ws.cdMax : 1;
    if (w.channel) {
      ws.minHold = Math.max(0, ws.minHold - dt);
      const on = holding || ws.minHold > 0;
      ws.chan += ((on ? 1 : 0) - ws.chan) * (1 - Math.exp(-dt * (on ? 16 : 8)));
      if (ws.chan < 0.01 && !on) ws.chan = 0;
      if (ws.chan > 0.01) {
        try {
          w.channelUpdate?.(g, ws, dt);
        } catch {
          /* a channel's own FX must never break the frame */
        }
      }
    } else if (w.onRelease && holding) {
      // Slide 1 owns the trigger; only the charge meter grows here.
      ws.charge = Math.min(w.maxCharge ?? 1.6, ws.charge + dt);
    }
    try {
      w.update?.(g, ws, dt);
    } catch {
      /* a weapon's idle FX must never break the frame */
    }

    const R = this.wheelR;
    // Rounds slide 1 is not carrying fly on slide 11's own physics — and they
    // hit slide 11's own wheel, so a burst that slide 1 never carried still
    // bursts into the target instead of sailing through it.
    for (const p of g.projs) {
      p.age += dt;
      if (this.carried.has(p)) continue;
      try {
        p.update?.(g, dt, p);
      } catch {
        /* ignore */
      }
      const py = p.y;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (!p.noCollide && this.wy > 0 && p.vy < 0) {
        const dx = p.x - this.cx;
        if (Math.abs(dx) < R) {
          const sy = this.wy + Math.sqrt(Math.max(0, R * R - dx * dx));
          if (py >= sy && p.y <= sy) {
            p.y = sy;
            p.alive = false;
            try {
              p.onHit(g, p.x, sy, p);
            } catch {
              /* a weapon's own burst must never break the frame */
            }
          }
        }
      }
      if (p.y < -160 || p.y > 1020 || p.x < -200 || p.x > 620) p.alive = false;
    }
    g.projs = g.projs.filter((p) => {
      if (!p.alive) {
        this.carried.delete(p);
        this.taken.delete(p);
      }
      return p.alive;
    });

    // particles (slide 11's own update, including its wheel-hit droplets)
    const parts = g.parts;
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.life -= dt;
      if (p.life <= 0) {
        parts[i] = parts[parts.length - 1];
        parts.pop();
        continue;
      }
      if (p.drag) {
        const f = Math.exp(-p.drag * dt);
        p.vx *= f;
        p.vy *= f;
      }
      if (p.turb) p.vx += Math.sin(g.time * 14 + p.seed) * p.turb * dt;
      p.vy += p.ay * dt;
      const py = p.y;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
      if (p.hit && g.active && p.vy < 0) {
        const dx = p.x - this.cx;
        if (Math.abs(dx) < R * 0.97) {
          const sy = this.wy + Math.sqrt(Math.max(0, R * R - dx * dx));
          if (py >= sy && p.y <= sy) {
            p.y = sy;
            p.life = 0;
            try {
              p.hit(g, p);
            } catch {
              /* ignore */
            }
          }
        }
      }
    }

    for (const f of g.fx) {
      f.age += dt;
      f.update?.(dt, f);
    }
    g.fx = g.fx.filter((f) => f.age < f.max);

    // Wheel mood + slide-11's entry holes (acid keeps eating, burn keeps burning)
    const wl = g.wheel;
    wl.heat *= Math.exp(-dt * 1.1);
    wl.flash *= Math.exp(-dt * 9);
    wl.freezeT = Math.max(0, wl.freezeT - dt);
    wl.freeze += ((wl.freezeT > 0 ? 1 : 0) - wl.freeze) * (1 - Math.exp(-dt * (wl.freezeT > 0 ? 14 : 5)));
    wl.shiver *= Math.exp(-dt * 6);
    for (const e of g.embeds) {
      if (e.fade > 0) e.fade -= dt;
      if (e.fire > 0) {
        e.fire -= dt;
        this.embedFire(e, dt);
      }
    }
    g.embeds = g.embeds.filter((e) => e.fade >= 0);
  }

  private embedFire(e: Embed, dt: number) {
    const g = this.raw;
    if (!g) return;
    const an = g.wheel.angle + e.a;
    const ex = this.cx + Math.cos(an) * this.wheelR;
    const ey = this.wy + Math.sin(an) * this.wheelR;
    if (e.kind === 'acid') {
      const k = clamp(e.fire / 2.4);
      if (Math.random() < dt * 22 * k) {
        g.spawn({
          type: 'smoke', x: ex + rand(-8, 8), y: ey + rand(-8, 4), vx: rand(-14, 14),
          vy: rand(-80, -30), size: 4, size1: rand(16, 26), life: rand(0.8, 1.4),
          alpha: 0.24, pal: ['#f0ffc0', '#a8d84a', '#5a7a2a'], drag: 0.8,
        });
      }
      if (Math.random() < dt * 16 * k) {
        g.spawn({
          type: 'ring', x: ex + rand(-9, 9), y: ey + rand(-6, 6), size: 1,
          size1: rand(4, 7), len: 1.3, life: rand(0.25, 0.5),
          pal: ['#e8ff8a', '#9aff2a'], alpha: 0.9,
        });
      }
      return;
    }
    if (Math.random() < dt * 14) {
      g.spawn({
        type: 'glow', x: ex, y: ey, vx: rand(-14, 14), vy: rand(-70, -30),
        size: rand(2, 4), size1: 0, life: rand(0.5, 1.0),
        pal: ['#ffe9a0', '#ff9a2e', '#7a2a10'], alpha: 0.9,
      });
    }
  }

  /* ── drawing ──────────────────────────────────────────────────────────── */

  /**
   * Every round slide 11 is flying, its `Fx` list and its particles.
   *
   * One weapon's renderer throwing must never take the whole slide-1 frame with
   * it (a blank screen mid-round reads as a freeze), so each piece is guarded.
   */
  draw(ctx: CanvasRenderingContext2D) {
    const g = this.raw;
    if (!g) return;
    for (const p of g.projs) {
      ctx.save();
      try {
        p.draw(ctx, g, p);
      } catch {
        /* a single round's art must not break the frame */
      }
      ctx.restore();
    }
    for (const f of g.fx) {
      ctx.save();
      if (f.add) ctx.globalCompositeOperation = 'lighter';
      try {
        f.draw(ctx, clamp(f.age / f.max), f);
      } catch {
        /* ignore */
      }
      ctx.restore();
    }
    try {
      (g as unknown as { drawParticles(c: CanvasRenderingContext2D): void }).drawParticles(ctx);
    } catch {
      /* ignore */
    }
  }

  /** Slide-11's entry holes, painted into slide 1's wheel. */
  drawWheel(ctx: CanvasRenderingContext2D, cx: number, cy: number, radius: number, rot: number) {
    const g = this.raw;
    if (!g || !g.embeds.length) return;
    const self = g as unknown as {
      embedOut(c: CanvasRenderingContext2D, e: Embed): void;
      embedIn(c: CanvasRenderingContext2D, e: Embed): void;
    };
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rot);
    for (const e of g.embeds) {
      ctx.save();
      ctx.rotate(e.a);
      ctx.translate(radius, 0);
      ctx.globalAlpha = e.fade > 0 ? clamp(e.fade / 0.4) : 1;
      try {
        self.embedOut(ctx, e);
      } catch {
        /* ignore */
      }
      ctx.restore();
    }
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 0, radius - 1, 0, TAU);
    ctx.clip();
    for (const e of g.embeds) {
      ctx.save();
      ctx.rotate(e.a);
      ctx.translate(radius, 0);
      ctx.globalAlpha = e.fade > 0 ? clamp(e.fade / 0.4) : 1;
      try {
        self.embedIn(ctx, e);
      } catch {
        /* ignore */
      }
      ctx.restore();
    }
    ctx.restore();
    ctx.restore();

    // burning marks glow on the rim, exactly like slide 11's
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const e of g.embeds) {
      if (e.fire <= 0 || e.kind === 'acid') continue;
      const an = rot + e.a;
      const x = cx + Math.cos(an) * radius;
      const y = cy + Math.sin(an) * radius;
      const f = clamp(e.fire / 0.6);
      const fl = 0.75 + 0.25 * Math.sin(g.time * 30 + e.seed);
      drawGlow(ctx, x, y - 8, 15 * fl, '#ff7a1a', 0.8 * f);
      drawGlow(ctx, x, y - 13 * fl, 9 * fl, '#ffd25a', 0.9 * f);
      drawGlow(ctx, x, y - 6, 5, '#ffffff', 0.6 * f);
    }
    ctx.restore();
  }

  /** The gun itself, in slide 11's own coordinates, at slide 1's size. */
  drawWeapon(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    time: number,
  ) {
    const g = this.raw;
    if (!g) return;
    const w = g.weapon;
    const ws = this.state;
    const sc = elevenScale(this.weaponId) * (w.scale ?? 1);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-Math.PI / 2);
    ctx.rotate(Math.sin(time * 1.25 + 0.7) * 0.012);
    ctx.translate(-w.muzzle - ws.recoil * w.kick, -w.muzzleY);
    ctx.scale(sc, sc);
    w.draw(ctx, g, ws);
    ctx.restore();
  }

  /** Slide-11's beam / overlay pass, in slide-1 screen space. */
  drawBeam(ctx: CanvasRenderingContext2D) {
    const g = this.raw;
    if (!g) return;
    const w = g.weapon;
    const ws = this.state;
    if (ws.chan <= 0.02) return;
    ctx.save();
    const sc = elevenScale(this.weaponId) * (w.scale ?? 1);
    ctx.translate(this.gunX, this.gunY);
    ctx.rotate(-Math.PI / 2);
    ctx.scale(sc, sc);
    ctx.translate(-w.muzzle, -w.muzzleY);
    try {
      w.drawBeam?.(ctx, g, ws);
    } catch {
      /* ignore */
    }
    ctx.restore();
  }
}

/**
 * A still of slide 11's round (or beam) at `age` seconds after the muzzle, for
 * the picker's "Slide 11" effect card — slide 11's own draw, nothing redrawn.
 */
export function drawSetElevenShotShell(
  c: CanvasRenderingContext2D,
  id: ElevenId,
  age: number,
  travel = 26,
) {
  const fx = new SetElevenFx();
  if (!fx.raw) return;
  fx.selectWeapon(id);
  const w = fx.weapon;
  fx.fire(0, -travel);
  // Channel weapons (the flame throwers, the beams) and charged guns only show
  // their shot after slide 11 has run a few of its own frames: let it, so the
  // card shows the real flame / beam instead of an empty muzzle.
  const holds = !!w.channel || !!w.onRelease;
  // Hitscan beams live in slide 11's `Fx` list for a fraction of a second, so
  // stop as soon as the weapon has produced anything at all: the card shows the
  // beam at its brightest, not a frame after it already faded.
  for (let i = 0; i < 60 && !fx.raw.projs.length && !fx.raw.fx.length; i++) {
    fx.advance(1 / 30, holds);
  }
  for (let i = 0; i < 2; i++) fx.advance(1 / 60, holds);
  const proj = fx.takeShots()[0] ?? fx.raw.projs[0];
  if (proj) {
    proj.x = 0;
    proj.y = -travel;
    proj.age = age;
    c.save();
    proj.draw(c, fx.raw, proj);
    c.restore();
  }
  // Beam weapons (the sniper lance, the pack) are their channel, not a round.
  if (w.channel) {
    c.save();
    fx.state.chan = 1;
    fx.drawBeam(c);
    c.restore();
  }
  // The muzzle burst / flame body slide 11 itself spawned for this shot.
  fx.draw(c);
}
