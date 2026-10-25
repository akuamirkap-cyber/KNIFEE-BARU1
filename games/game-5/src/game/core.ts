// Core math, particle system and tiny synth audio engine.

export const TAU = Math.PI * 2;

export const clamp = (v: number, a: number, b: number) =>
  v < a ? a : v > b ? b : v;
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const rnd = (a = 1, b?: number) =>
  b === undefined ? Math.random() * a : a + Math.random() * (b - a);
export const rndi = (a: number, b: number) => Math.floor(rnd(a, b + 1));
export const pick = <T>(arr: T[]): T =>
  arr[Math.floor(Math.random() * arr.length)];
// Fractional emission rates stay consistent across 30, 60 and high-refresh displays.
export function emissionCount(dt: number, perSecond: number) {
  const amount = clamp(dt * perSecond, 0, 64);
  const whole = Math.floor(amount);
  return whole + (Math.random() < amount - whole ? 1 : 0);
}
export const angNorm = (a: number) => {
  while (a > Math.PI) a -= TAU;
  while (a < -Math.PI) a += TAU;
  return a;
};

export type ParticleType =
  | "spark"
  | "ember"
  | "smoke"
  | "fire"
  | "shard"
  | "ring"
  | "flash"
  | "bolt"
  | "glow"
  | "casing"
  | "star"
  | "shock";

export interface Particle {
  type: ParticleType;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  size2: number;
  color: string;
  color2: string;
  rot: number;
  spin: number;
  grav: number;
  drag: number;
  width: number;
  seed: number;
}

export function P(o: Partial<Particle>): Particle {
  const life = o.life ?? 0.5;
  return {
    type: o.type ?? "spark",
    x: o.x ?? 0,
    y: o.y ?? 0,
    vx: o.vx ?? 0,
    vy: o.vy ?? 0,
    life,
    max: life,
    size: o.size ?? 2,
    size2: o.size2 ?? o.size ?? 2,
    color: o.color ?? "#fff",
    color2: o.color2 ?? "rgba(255,255,255,0)",
    rot: o.rot ?? 0,
    spin: o.spin ?? 0,
    grav: o.grav ?? 0,
    drag: o.drag ?? 0.98,
    width: o.width ?? 1.6,
    seed: o.seed ?? Math.random() * 1000,
  };
}

export function updateParticles(list: Particle[], dt: number) {
  for (let i = list.length - 1; i >= 0; i--) {
    const p = list[i];
    p.life -= dt;
    if (p.life <= 0) {
      list.splice(i, 1);
      continue;
    }
    const d = Math.pow(p.drag, dt * 60);
    p.vx *= d;
    p.vy *= d;
    p.vy += p.grav * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.rot += p.spin * dt;
  }
}

function hexA(color: string, a: number) {
  if (color.startsWith("rgba")) return color;
  if (color.startsWith("#")) {
    const h = color.slice(1);
    const n = parseInt(
      h.length === 3
        ? h
            .split("")
            .map((c) => c + c)
            .join("")
        : h,
      16,
    );
    const r = (n >> 16) & 255,
      g = (n >> 8) & 255,
      b = n & 255;
    return `rgba(${r},${g},${b},${a})`;
  }
  return color;
}
export const withAlpha = hexA;

export function drawParticles(ctx: CanvasRenderingContext2D, list: Particle[]) {
  for (const p of list) drawParticle(ctx, p);
}

export function drawParticle(ctx: CanvasRenderingContext2D, p: Particle) {
  const t = clamp(p.life / p.max, 0, 1);
  const additive =
    p.type !== "smoke" && p.type !== "shard" && p.type !== "casing";
  ctx.save();
  if (additive) ctx.globalCompositeOperation = "lighter";

  switch (p.type) {
    case "spark": {
      const len = clamp(Math.hypot(p.vx, p.vy) * 0.022, 2, 26) * (0.4 + t);
      const a = Math.atan2(p.vy, p.vx);
      const g = ctx.createLinearGradient(
        p.x - Math.cos(a) * len,
        p.y - Math.sin(a) * len,
        p.x,
        p.y,
      );
      g.addColorStop(0, hexA(p.color, 0));
      g.addColorStop(1, hexA(p.color, t));
      ctx.strokeStyle = g;
      ctx.lineWidth = p.width * (0.3 + t * 0.9);
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(p.x - Math.cos(a) * len, p.y - Math.sin(a) * len);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      break;
    }
    case "ember": {
      const fl = 0.65 + 0.35 * Math.sin(p.seed + (p.max - p.life) * 30);
      const r = p.size * (0.4 + t * 0.9) * fl;
      const g = ctx.createRadialGradient(
        p.x,
        p.y,
        0,
        p.x,
        p.y,
        Math.max(0.5, r * 3.2),
      );
      g.addColorStop(0, hexA(p.color, t));
      g.addColorStop(0.35, hexA(p.color2, t * 0.55));
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(0.5, r * 3.2), 0, TAU);
      ctx.fill();
      break;
    }
    case "glow": {
      const r = lerp(p.size2, p.size, t);
      const g = ctx.createRadialGradient(
        p.x,
        p.y,
        0,
        p.x,
        p.y,
        Math.max(0.6, r),
      );
      g.addColorStop(0, hexA(p.color, t));
      g.addColorStop(0.4, hexA(p.color2, t * 0.5));
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(0.6, r), 0, TAU);
      ctx.fill();
      break;
    }
    case "flash": {
      const r = p.size * (0.5 + (1 - t) * 0.9);
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
      g.addColorStop(0, hexA("#ffffff", t));
      g.addColorStop(0.25, hexA(p.color, t * 0.95));
      g.addColorStop(0.6, hexA(p.color2, t * 0.35));
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, TAU);
      ctx.fill();
      break;
    }
    case "fire": {
      const r = lerp(p.size2, p.size, 1 - t) * 1.0;
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, Math.max(1, r));
      const hot = t;
      g.addColorStop(
        0,
        `rgba(255,255,${Math.floor(200 * hot + 40)},${0.9 * t})`,
      );
      g.addColorStop(0.3, hexA(p.color, 0.75 * t));
      g.addColorStop(0.7, hexA(p.color2, 0.35 * t));
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(1, r), 0, TAU);
      ctx.fill();
      break;
    }
    case "smoke": {
      const r = lerp(p.size2, p.size, 1 - t);
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, Math.max(1, r));
      g.addColorStop(0, hexA(p.color, 0.42 * t));
      g.addColorStop(0.5, hexA(p.color, 0.2 * t));
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(1, r), 0, TAU);
      ctx.fill();
      break;
    }
    case "shard": {
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.globalAlpha = clamp(t * 1.6, 0, 1);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.moveTo(-p.size, -p.size * 0.35);
      ctx.lineTo(p.size * 0.9, -p.size * 0.5);
      ctx.lineTo(p.size, p.size * 0.42);
      ctx.lineTo(-p.size * 0.8, p.size * 0.3);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = hexA(p.color2, 0.6);
      ctx.fillRect(-p.size, -p.size * 0.35, p.size * 1.9, p.size * 0.18);
      break;
    }
    case "casing": {
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.globalAlpha = clamp(t * 1.8, 0, 1);
      const g = ctx.createLinearGradient(0, -p.size * 0.4, 0, p.size * 0.4);
      g.addColorStop(0, "#fde68a");
      g.addColorStop(0.45, "#d4a017");
      g.addColorStop(1, "#8a5a12");
      ctx.fillStyle = g;
      ctx.fillRect(-p.size * 1.1, -p.size * 0.38, p.size * 2.2, p.size * 0.76);
      ctx.fillStyle = "#b8860b";
      ctx.fillRect(p.size * 0.7, -p.size * 0.45, p.size * 0.45, p.size * 0.9);
      break;
    }
    case "ring": {
      const r = lerp(p.size2, p.size, 1 - t);
      ctx.strokeStyle = hexA(p.color, t * 0.9);
      ctx.lineWidth = p.width * (0.25 + t);
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(0.5, r), 0, TAU);
      ctx.stroke();
      break;
    }
    case "shock": {
      const r = lerp(p.size2, p.size, 1 - t);
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.scale(1, 0.42);
      ctx.strokeStyle = hexA(p.color, t * 0.8);
      ctx.lineWidth = p.width * (0.3 + t);
      ctx.beginPath();
      ctx.arc(0, 0, Math.max(0.5, r), 0, TAU);
      ctx.stroke();
      ctx.restore();
      break;
    }
    case "bolt": {
      const a = p.rot;
      const len = p.size;
      ctx.strokeStyle = hexA(p.color, t);
      ctx.lineWidth = p.width * (0.4 + t);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      let cx = p.x,
        cy = p.y;
      const seg = 5;
      for (let i = 1; i <= seg; i++) {
        const prog = i / seg;
        const off = (Math.sin(p.seed * 9.1 + i * 2.3) * len) / 6;
        cx = p.x + Math.cos(a) * len * prog - Math.sin(a) * off;
        cy = p.y + Math.sin(a) * len * prog + Math.cos(a) * off;
        ctx.lineTo(cx, cy);
      }
      ctx.stroke();
      break;
    }
    case "star": {
      const r = p.size * (0.3 + t * 1.1);
      ctx.strokeStyle = hexA(p.color, t);
      ctx.lineWidth = p.width;
      ctx.beginPath();
      ctx.moveTo(p.x - r, p.y);
      ctx.lineTo(p.x + r, p.y);
      ctx.moveTo(p.x, p.y - r);
      ctx.lineTo(p.x, p.y + r);
      ctx.stroke();
      break;
    }
  }
  ctx.restore();
}

/* --------------------------- drawing helpers --------------------------- */

export function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const rr = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

export function metal(
  ctx: CanvasRenderingContext2D,
  y0: number,
  y1: number,
  c0: string,
  c1: string,
  c2: string,
) {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, c0);
  g.addColorStop(0.42, c1);
  g.addColorStop(0.62, c1);
  g.addColorStop(1, c2);
  return g;
}

export function glowLine(
  ctx: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  w: number,
  color: string,
  alpha = 1,
) {
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.lineCap = "round";
  ctx.strokeStyle = hexA(color, 0.22 * alpha);
  ctx.lineWidth = w * 3.4;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();
  ctx.strokeStyle = hexA(color, 0.6 * alpha);
  ctx.lineWidth = w * 1.7;
  ctx.stroke();
  ctx.strokeStyle = `rgba(255,255,255,${0.95 * alpha})`;
  ctx.lineWidth = Math.max(0.6, w * 0.5);
  ctx.stroke();
  ctx.restore();
}

export function lightning(
  ctx: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  amp: number,
  color: string,
  seed: number,
  width = 2,
  segs = 8,
) {
  const pts: [number, number][] = [];
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    const nx = lerp(x0, x1, t);
    const ny = lerp(y0, y1, t);
    const dx = x1 - x0,
      dy = y1 - y0;
    const len = Math.hypot(dx, dy) || 1;
    const px = -dy / len,
      py = dx / len;
    const w =
      i === 0 || i === segs
        ? 0
        : Math.sin(seed * 12.9 + i * 3.7) * amp * (0.5 + Math.random() * 0.5);
    pts.push([nx + px * w, ny + py * w]);
  }
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.strokeStyle = hexA(color, 0.3);
  ctx.lineWidth = width * 3;
  ctx.beginPath();
  pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
  ctx.stroke();
  ctx.strokeStyle = hexA(color, 0.85);
  ctx.lineWidth = width;
  ctx.stroke();
  ctx.strokeStyle = "rgba(255,255,255,0.95)";
  ctx.lineWidth = Math.max(0.5, width * 0.38);
  ctx.stroke();
  ctx.restore();
}

/* ------------------------------- audio -------------------------------- */

class Synth {
  ctx: AudioContext | null = null;
  private mutedState = false;
  noise: AudioBuffer | null = null;
  private output: GainNode | null = null;
  private sources = new Set<AudioScheduledSourceNode>();

  get muted() {
    return this.mutedState;
  }

  set muted(value: boolean) {
    this.mutedState = value;
    if (this.output && this.ctx) {
      this.output.gain.cancelScheduledValues(this.ctx.currentTime);
      this.output.gain.setTargetAtTime(
        value ? 0 : 0.65,
        this.ctx.currentTime,
        0.012,
      );
    }
  }

  stopAll() {
    for (const source of this.sources) {
      try {
        source.stop();
      } catch {
        /* A source may already have finished. */
      }
    }
    this.sources.clear();
  }

  ensure() {
    if (!this.ctx) {
      const AC = (window.AudioContext ||
        (window as any).webkitAudioContext) as typeof AudioContext;
      this.ctx = new AC();
      const compressor = this.ctx.createDynamicsCompressor();
      compressor.threshold.value = -16;
      compressor.knee.value = 14;
      compressor.ratio.value = 6;
      compressor.attack.value = 0.003;
      compressor.release.value = 0.18;
      this.output = this.ctx.createGain();
      this.output.gain.value = this.muted ? 0 : 0.65;
      this.output.connect(compressor);
      compressor.connect(this.ctx.destination);
      const len = this.ctx.sampleRate * 1.2;
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this.noise = buf;
    }
    if (this.ctx.state === "suspended") this.ctx.resume();
    return this.ctx;
  }

  private env(node: AudioNode, g: number, a: number, d: number, t0: number) {
    const ctx = this.ctx!;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, g), t0 + a);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + a + d);
    node.connect(gain);
    gain.connect(this.output ?? ctx.destination);
    return gain;
  }

  noiseBurst(
    dur: number,
    gain: number,
    type: BiquadFilterType,
    freq: number,
    q = 1,
    t0 = 0,
  ) {
    const ctx = this.ensure();
    if (this.muted) return;
    const src = ctx.createBufferSource();
    src.buffer = this.noise!;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    src.connect(f);
    const start = ctx.currentTime + t0;
    const envelope = this.env(f, gain, 0.004, dur, start);
    this.sources.add(src);
    src.onended = () => {
      src.disconnect();
      f.disconnect();
      envelope.disconnect();
      this.sources.delete(src);
    };
    src.start(start);
    src.stop(start + dur + 0.1);
  }

  tone(
    f0: number,
    f1: number,
    dur: number,
    gain: number,
    type: OscillatorType = "sine",
    t0 = 0,
  ) {
    const ctx = this.ensure();
    if (this.muted) return;
    const o = ctx.createOscillator();
    o.type = type;
    const start = ctx.currentTime + t0;
    o.frequency.setValueAtTime(f0, start);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), start + dur);
    const envelope = this.env(o, gain, 0.005, dur, start);
    this.sources.add(o);
    o.onended = () => {
      o.disconnect();
      envelope.disconnect();
      this.sources.delete(o);
    };
    o.start(start);
    o.stop(start + dur + 0.1);
  }

  warble(
    f0: number,
    f1: number,
    duration: number,
    gain: number,
    type: OscillatorType,
    rate: number,
    depth: number,
  ) {
    const ctx = this.ensure();
    if (this.muted) return;
    const carrier = ctx.createOscillator();
    const modulator = ctx.createOscillator();
    const modulation = ctx.createGain();
    const start = ctx.currentTime;
    carrier.type = type;
    carrier.frequency.setValueAtTime(f0, start);
    carrier.frequency.exponentialRampToValueAtTime(f1, start + duration);
    modulator.frequency.value = rate;
    modulation.gain.value = depth;
    modulator.connect(modulation);
    modulation.connect(carrier.frequency);
    const envelope = this.env(carrier, gain, 0.012, duration, start);
    this.sources.add(carrier);
    this.sources.add(modulator);
    carrier.onended = () => {
      carrier.disconnect();
      envelope.disconnect();
      this.sources.delete(carrier);
    };
    modulator.onended = () => {
      modulator.disconnect();
      modulation.disconnect();
      this.sources.delete(modulator);
    };
    carrier.start(start);
    modulator.start(start);
    carrier.stop(start + duration + 0.1);
    modulator.stop(start + duration + 0.1);
  }

  play(kind: string) {
    try {
      if (this.muted) return;
      this.ensure();
      switch (kind) {
        case "equip":
          this.tone(720, 390, 0.045, 0.035, "triangle");
          this.noiseBurst(0.022, 0.018, "highpass", 3300, 1.1);
          break;
        case "rifle":
          this.noiseBurst(0.18, 0.5, "lowpass", 2600, 1);
          this.tone(180, 50, 0.18, 0.35, "square");
          break;
        case "smg":
          this.noiseBurst(0.09, 0.32, "bandpass", 1800, 1.2);
          this.tone(260, 90, 0.08, 0.2, "square");
          break;
        case "pistol":
          this.noiseBurst(0.12, 0.38, "bandpass", 1400, 1);
          this.tone(300, 80, 0.1, 0.22, "triangle");
          break;
        case "sniper":
          this.noiseBurst(0.35, 0.5, "lowpass", 1600, 0.8);
          this.tone(120, 38, 0.4, 0.4, "sawtooth");
          break;
        case "bow":
          this.noiseBurst(0.18, 0.42, "bandpass", 1800, 1.8);
          this.tone(640, 110, 0.22, 0.35, "triangle");
          this.tone(190, 48, 0.18, 0.45, "sine");
          break;
        case "electro":
          this.tone(1400, 180, 0.3, 0.2, "sawtooth");
          this.noiseBurst(0.22, 0.2, "highpass", 2500, 2);
          break;
        case "laser":
          this.tone(1800, 420, 0.25, 0.18, "square");
          break;
        case "beam":
          this.tone(260, 900, 0.5, 0.14, "sawtooth");
          this.noiseBurst(0.5, 0.12, "bandpass", 900, 3);
          break;
        case "fire":
          this.noiseBurst(0.55, 0.3, "lowpass", 800, 0.8);
          this.tone(90, 40, 0.5, 0.18, "sawtooth");
          break;
        case "plasma":
          this.tone(900, 180, 0.32, 0.2, "triangle");
          this.noiseBurst(0.3, 0.16, "bandpass", 1200, 2);
          break;
        case "caster-charge":
          this.tone(120, 520, 0.1, 0.085, "triangle");
          this.noiseBurst(0.07, 0.04, "bandpass", 2100, 2.4);
          break;
        case "caster-shot":
          this.tone(176, 38, 0.32, 0.26, "sine");
          this.tone(960, 210, 0.22, 0.13, "triangle");
          this.noiseBurst(0.18, 0.16, "bandpass", 1700, 1.1);
          this.noiseBurst(0.03, 0.06, "highpass", 3000, 1);
          this.noiseBurst(0.18, 0.035, "bandpass", 1800, 2, 0.22);
          break;
        case "caster-hit":
          this.tone(108, 30, 0.28, 0.2, "sine");
          this.noiseBurst(0.25, 0.15, "lowpass", 1000, 0.8);
          this.tone(1900, 410, 0.18, 0.04, "triangle");
          break;
        case "predator-charge":
          this.tone(130, 510, 0.28, 0.065, "sine");
          this.tone(310, 1150, 0.26, 0.035, "triangle");
          this.noiseBurst(0.18, 0.04, "bandpass", 1700, 3);
          [0.025, 0.09, 0.155].forEach((delay, i) =>
            this.tone(
              1380 + i * 190,
              1040 + i * 180,
              0.035,
              0.035,
              "sine",
              delay,
            ),
          );
          break;
        case "predator-shot":
          this.tone(145, 36, 0.38, 0.3, "sine");
          this.tone(1040, 145, 0.19, 0.11, "sawtooth");
          this.noiseBurst(0.22, 0.2, "bandpass", 1450, 0.8);
          this.noiseBurst(0.035, 0.07, "highpass", 4200, 1.2);
          this.tone(630, 210, 0.3, 0.05, "triangle");
          this.tone(470, 160, 0.16, 0.035, "sine", 0.12);
          this.tone(360, 130, 0.2, 0.02, "sine", 0.23);
          this.noiseBurst(0.18, 0.06, "bandpass", 1700, 2.4, 0.22);
          break;
        case "predator-impact":
          this.tone(105, 29, 0.36, 0.26, "sine");
          this.noiseBurst(0.32, 0.19, "lowpass", 1300, 0.7);
          this.tone(1680, 410, 0.31, 0.04, "triangle");
          this.noiseBurst(0.18, 0.045, "bandpass", 3000, 2, 0.1);
          break;
        case "proton-start":
          this.warble(85, 190, 0.13, 0.08, "sawtooth", 14, 4);
          this.noiseBurst(0.04, 0.04, "bandpass", 1800, 1.7);
          break;
        case "proton":
          this.warble(145, 175, 0.7, 0.11, "sawtooth", 27, 21);
          this.tone(890, 690, 0.68, 0.05, "triangle");
          this.noiseBurst(0.72, 0.08, "bandpass", 780, 3);
          for (let i = 0; i < 8; i++)
            this.noiseBurst(
              0.025,
              0.022,
              "bandpass",
              2500 + i * 90,
              3,
              i * 0.085,
            );
          break;
        case "proton-hit":
          this.noiseBurst(0.16, 0.13, "bandpass", 1100, 1.3);
          this.tone(300, 60, 0.18, 0.09, "triangle");
          break;
        case "martian-charge":
          this.tone(65, 110, 0.18, 0.09, "sawtooth");
          this.tone(230, 720, 0.17, 0.06, "sine");
          this.noiseBurst(0.14, 0.045, "bandpass", 680, 2);
          break;
        case "martian":
          this.tone(65, 88, 0.7, 0.16, "sawtooth");
          this.tone(97, 132, 0.62, 0.08, "triangle");
          this.warble(900, 350, 0.56, 0.09, "sine", 6, 70);
          this.noiseBurst(0.6, 0.08, "bandpass", 950, 3);
          break;
        case "martian-hit":
          this.tone(90, 25, 0.4, 0.23, "sine");
          this.noiseBurst(0.3, 0.15, "lowpass", 1000, 0.8);
          this.noiseBurst(0.22, 0.035, "highpass", 2200, 1.4);
          break;
        case "repulsor-charge":
          this.tone(580, 1900, 0.11, 0.065, "sine");
          this.tone(145, 420, 0.09, 0.04, "triangle");
          break;
        case "repulsor":
          this.tone(1350, 170, 0.23, 0.16, "triangle");
          this.tone(220, 48, 0.28, 0.24, "sine");
          this.noiseBurst(0.15, 0.12, "bandpass", 1800, 1.2);
          this.tone(2300, 1200, 0.06, 0.05, "sine");
          break;
        case "repulsor-hit":
          this.tone(158, 30, 0.3, 0.23, "sine");
          this.noiseBurst(0.18, 0.14, "bandpass", 1500, 0.8);
          this.tone(950, 380, 0.2, 0.045, "triangle");
          break;
        case "disc-windup":
          this.tone(480, 1400, 0.12, 0.08, "sine");
          this.noiseBurst(0.07, 0.05, "highpass", 2200, 1.5);
          break;
        case "disc":
          this.warble(880, 470, 0.25, 0.09, "triangle", 36, 40);
          this.tone(1500, 600, 0.22, 0.065, "sine", 0.04);
          break;
        case "disc-bounce":
          this.tone(1260, 960, 0.075, 0.09, "triangle");
          this.tone(270, 160, 0.05, 0.075, "sine");
          this.noiseBurst(0.035, 0.06, "bandpass", 4000, 2);
          break;
        case "disc-catch":
          this.tone(780, 720, 0.1, 0.085, "sine");
          this.tone(1550, 1240, 0.08, 0.035, "sine", 0.025);
          this.noiseBurst(0.025, 0.04, "highpass", 2600, 1.8);
          break;
        case "sword":
          this.tone(1200, 300, 0.3, 0.16, "sawtooth");
          this.noiseBurst(0.25, 0.18, "highpass", 3000, 1);
          break;
        case "hit":
          this.noiseBurst(0.14, 0.3, "lowpass", 900, 1);
          this.tone(150, 60, 0.12, 0.2, "triangle");
          break;
        case "fail":
          this.tone(300, 60, 0.7, 0.3, "sawtooth");
          this.noiseBurst(0.7, 0.3, "lowpass", 600, 0.7);
          break;
        case "win":
          [523, 659, 784, 1047].forEach((f, i) =>
            this.tone(f, f, 0.22, 0.16, "triangle", i * 0.11),
          );
          break;
      }
    } catch {
      /* ignore */
    }
  }
}

export const audio = new Synth();
