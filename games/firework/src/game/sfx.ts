// Synthesised sound engine (WebAudio, no assets needed)
// 5 weapon voices: keris / blackhole / yoyo / diamond / crystal

const PENTA = [0, 2, 4, 7, 9];

export function noteFreq(i: number): number {
  const oct = Math.min(Math.floor(i / 5), 2);
  const semi = PENTA[i % 5] + oct * 12;
  return 523.25 * Math.pow(2, semi / 12);
}

export class Sfx {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private dry!: GainNode;
  private wet!: GainNode;
  private noise!: AudioBuffer;
  muted = false;
  private lastSky = 0;

  init() {
    if (this.ctx) {
      try {
        if (this.ctx.state === "suspended") void this.ctx.resume().catch(() => undefined);
      } catch {
        /* ignore */
      }
      return;
    }
    try {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      const ctx = new AC();
      this.ctx = ctx;
      this.buildGraph(ctx);
    } catch (e) {
      console.error("[gunhit] audio unavailable:", e);
      this.ctx = null;
    }
  }

  private buildGraph(ctx: AudioContext) {
    this.master = ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.8;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.ratio.value = 6;
    this.master.connect(comp);
    comp.connect(ctx.destination);

    this.dry = ctx.createGain();
    this.dry.connect(this.master);

    // generated reverb
    const conv = ctx.createConvolver();
    const len = ctx.sampleRate * 2.2;
    const imp = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = imp.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6);
    }
    conv.buffer = imp;
    this.wet = ctx.createGain();
    this.wet.gain.value = 0.45;
    this.wet.connect(conv);
    conv.connect(this.master);

    // noise buffer
    const nl = ctx.sampleRate * 2;
    this.noise = ctx.createBuffer(1, nl, ctx.sampleRate);
    const nd = this.noise.getChannelData(0);
    for (let i = 0; i < nl; i++) nd[i] = Math.random() * 2 - 1;

    try {
      if (ctx.state === "suspended") void ctx.resume().catch(() => undefined);
    } catch {
      /* ignore */
    }
  }

  setMuted(m: boolean) {
    this.muted = m;
    try {
      if (this.ctx && this.master) this.master.gain.setTargetAtTime(m ? 0 : 0.8, this.ctx.currentTime, 0.02);
    } catch {
      /* ignore */
    }
  }

  // ---------- primitives ----------
  private tone(
    freq: number,
    t0: number,
    dur: number,
    type: OscillatorType,
    vol: number,
    slideTo?: number,
    reverb = 0.5,
    attack = 0.005
  ) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(slideTo, 1), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g);
    g.connect(this.dry);
    if (reverb > 0) {
      const s = ctx.createGain();
      s.gain.value = reverb;
      g.connect(s);
      s.connect(this.wet);
    }
    o.start(t0);
    o.stop(t0 + dur + 0.05);
  }

  private noiseBurst(
    t0: number,
    dur: number,
    vol: number,
    type: BiquadFilterType,
    f0: number,
    f1: number,
    q = 1,
    reverb = 0.4
  ) {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const off = Math.random() * 1.5;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.Q.value = q;
    f.frequency.setValueAtTime(f0, t0);
    f.frequency.exponentialRampToValueAtTime(Math.max(f1, 20), t0 + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f);
    f.connect(g);
    g.connect(this.dry);
    if (reverb > 0) {
      const s = ctx.createGain();
      s.gain.value = reverb;
      g.connect(s);
      s.connect(this.wet);
    }
    src.start(t0, off, dur + 0.05);
  }

  private bell(freq: number, t0: number, vol: number, dur = 0.9) {
    this.tone(freq, t0, dur, "sine", vol, undefined, 0.7);
    this.tone(freq * 2.01, t0, dur * 0.6, "sine", vol * 0.45, undefined, 0.7);
    this.tone(freq * 3.97, t0, dur * 0.35, "sine", vol * 0.2, undefined, 0.7);
    this.tone(freq * 0.5, t0, dur * 0.5, "triangle", vol * 0.25, undefined, 0.5);
  }

  // bright metallic metallophone (keris / diamond)
  private metal(freq: number, t0: number, vol: number, dur = 0.8) {
    this.tone(freq, t0, dur, "sine", vol, undefined, 0.75);
    this.tone(freq * 2.76, t0, dur * 0.5, "sine", vol * 0.4, undefined, 0.7);
    this.tone(freq * 5.4, t0, dur * 0.3, "sine", vol * 0.18, undefined, 0.7);
  }

  // ---------- ui ----------
  click() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.tone(660, t, 0.12, "triangle", 0.18, 990, 0.3);
  }

  start() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    [0, 4, 7, 12].forEach((s, i) => this.bell(523.25 * Math.pow(2, s / 12), t + i * 0.07, 0.14, 0.9));
    this.noiseBurst(t, 0.4, 0.15, "bandpass", 800, 4000, 3, 0.6);
  }

  // ---------- per-weapon voices ----------
  shoot(w: string) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    if (w === "keris") {
      // blade unsheathe + mystical thump
      this.noiseBurst(t, 0.16, 0.4, "highpass", 2500, 6000, 1.2, 0.35);
      this.tone(150, t, 0.22, "sine", 0.7, 55, 0.3);
      this.noiseBurst(t + 0.02, 0.3, 0.2, "bandpass", 700, 4200, 2.5, 0.55);
      this.metal(1318, t + 0.04, 0.08, 0.5);
    } else if (w === "blackhole") {
      this.tone(170, t, 0.4, "sine", 0.85, 26, 0.35);
      this.noiseBurst(t, 0.35, 0.4, "lowpass", 1400, 90, 1, 0.5);
      this.tone(280, t + 0.02, 0.32, "sine", 0.09, 2500, 0.85, 0.09);
      this.tone(420, t + 0.02, 0.28, "triangle", 0.05, 3200, 0.85, 0.1);
    } else if (w === "yoyo") {
      // springy throw + whirr
      this.tone(280, t, 0.14, "triangle", 0.35, 950, 0.3, 0.01);
      this.noiseBurst(t, 0.12, 0.25, "bandpass", 1200, 3600, 2, 0.3);
      this.tone(160, t + 0.03, 0.3, "sawtooth", 0.05, 420, 0.4, 0.03);
    } else if (w === "diamond") {
      // glassy charge + crisp launch ping
      this.tone(880, t, 0.14, "sine", 0.2, 1980, 0.55, 0.02);
      this.noiseBurst(t + 0.02, 0.2, 0.28, "highpass", 2800, 7000, 1.1, 0.5);
      this.metal(2093, t + 0.05, 0.09, 0.5);
    } else {
      // crystal — soft airy swell
      this.noiseBurst(t, 0.32, 0.25, "bandpass", 500, 3600, 2.2, 0.65);
      this.tone(340, t, 0.3, "sine", 0.22, 880, 0.7, 0.04);
      this.tone(510, t + 0.04, 0.3, "sine", 0.1, 1320, 0.7, 0.04);
    }
  }

  hit(w: string, idx: number) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const f = noteFreq(idx);
    if (w === "keris") {
      // gamelan metallophone strike + gold shimmer
      this.tone(130, t, 0.14, "sine", 0.6, 60, 0.25);
      this.noiseBurst(t, 0.08, 0.35, "bandpass", 2200, 900, 1.4, 0.3);
      const g = f * 1.25;
      this.metal(g, t + 0.02, 0.22, 1.2);
      this.metal(g * 1.5, t + 0.08, 0.09, 0.8);
      this.tone(g * 4, t + 0.05, 0.35, "sine", 0.05, g * 5, 0.85, 0.03);
    } else if (w === "blackhole") {
      this.noiseBurst(t, 0.3, 0.42, "bandpass", 3800, 180, 2.2, 0.6);
      this.tone(950, t, 0.3, "sine", 0.24, 65, 0.6, 0.01);
      const d = t + 0.13;
      this.tone(72, d, 0.55, "sine", 0.85, 26, 0.4);
      this.noiseBurst(d, 0.3, 0.4, "lowpass", 2000, 120, 0.8, 0.6);
      this.noiseBurst(d + 0.02, 0.45, 0.16, "bandpass", 300, 5200, 2.5, 0.7);
      const b = f * 0.5;
      this.bell(b, d, 0.2, 1.2);
      this.bell(b * 1.5, d + 0.06, 0.08, 0.9);
      this.tone(52, d, 1.3, "sine", 0.22, 30, 0.7, 0.1);
    } else if (w === "yoyo") {
      // boing + bright pluck climbing the scale
      this.tone(340, t, 0.16, "sine", 0.4, 140, 0.3, 0.008);
      this.tone(200, t + 0.08, 0.14, "sine", 0.25, 420, 0.3, 0.008);
      this.noiseBurst(t, 0.06, 0.3, "bandpass", 1800, 900, 1.2, 0.25);
      this.bell(f * 1.12, t + 0.05, 0.18, 0.9);
      this.bell(f * 1.68, t + 0.12, 0.08, 0.6);
    } else if (w === "diamond") {
      // brilliant crystal strike
      this.noiseBurst(t, 0.07, 0.4, "highpass", 3200, 1800, 1, 0.35);
      this.tone(200, t, 0.1, "sine", 0.5, 80, 0.25);
      const g = f * 1.5;
      this.metal(g, t + 0.02, 0.2, 1.2);
      this.metal(g * 2, t + 0.08, 0.08, 0.7);
      [0, 7, 12].forEach((s, i) => {
        this.metal(g * Math.pow(2, s / 12), t + 0.12 + i * 0.05, 0.05, 0.5);
      });
    } else {
      // crystal — warm resonant bloom
      this.tone(160, t, 0.16, "sine", 0.5, 70, 0.3);
      this.noiseBurst(t, 0.12, 0.25, "bandpass", 1400, 4200, 2, 0.55);
      const g = f * 0.9;
      this.bell(g, t + 0.03, 0.22, 1.3);
      this.bell(g * 1.5, t + 0.1, 0.1, 1.0);
      this.tone(g * 3, t + 0.08, 0.4, "sine", 0.05, g * 4, 0.8, 0.05);
    }
  }

  clear(w: string) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    if (w === "keris") {
      // gong + ascending metallophone run
      this.tone(98, t, 1.6, "sine", 0.8, 49, 0.6, 0.02);
      this.tone(147, t, 1.2, "triangle", 0.2, 73, 0.5);
      const seq = [0, 3, 5, 7, 10, 12, 15, 19, 24];
      seq.forEach((s, i) => {
        this.metal(659.25 * Math.pow(2, s / 12), t + 0.2 + i * 0.095, 0.14, 1.3);
      });
      [0, 7, 12].forEach((s) => this.metal(329.6 * Math.pow(2, s / 12), t + 1.15, 0.12, 2.2));
    } else if (w === "blackhole") {
      this.tone(90, t, 1.4, "sine", 0.9, 22, 0.5);
      this.tone(45, t, 1.8, "sine", 0.7, 20, 0.6, 0.05);
      this.noiseBurst(t, 1.0, 0.55, "lowpass", 1800, 70, 0.7, 0.7);
      this.noiseBurst(t, 0.35, 0.35, "bandpass", 4200, 150, 2.2, 0.6);
      const seq = [0, 3, 5, 7, 10, 12, 15, 19, 24];
      seq.forEach((s, i) => {
        this.bell(392 * Math.pow(2, s / 12), t + 0.3 + i * 0.1, 0.15, 1.6);
      });
      [0, 3, 7, 12].forEach((s) => this.bell(392 * Math.pow(2, s / 12), t + 1.35, 0.1, 2.4));
      this.noiseBurst(t + 0.35, 0.9, 0.14, "bandpass", 400, 4800, 2.5, 0.75);
    } else if (w === "yoyo") {
      // playful ascending run + happy chord
      const seq = [0, 4, 7, 12, 16, 19, 24];
      seq.forEach((s, i) => {
        this.bell(587.33 * Math.pow(2, s / 12), t + 0.12 + i * 0.09, 0.15, 1.0);
      });
      this.tone(300, t, 0.25, "sine", 0.2, 600, 0.4, 0.02);
      [0, 4, 7, 12].forEach((s) => this.bell(587.33 * Math.pow(2, s / 12), t + 0.85, 0.1, 1.8));
    } else if (w === "diamond") {
      // sparkling glissando + grand chord
      const seq = [0, 2, 4, 5, 7, 9, 11, 12, 14, 16, 19, 24];
      seq.forEach((s, i) => {
        this.metal(1046.5 * Math.pow(2, s / 12), t + 0.1 + i * 0.07, 0.1, 0.9);
      });
      [0, 4, 7, 12, 16].forEach((s) => this.bell(523.25 * Math.pow(2, s / 12), t + 1.0, 0.1, 2.2));
    } else {
      // crystal — lush blooming arpeggio
      const seq = [0, 2, 5, 7, 9, 12, 14, 17, 21, 24];
      seq.forEach((s, i) => {
        this.bell(440 * Math.pow(2, s / 12), t + 0.15 + i * 0.095, 0.15, 1.5);
      });
      [0, 5, 9, 12].forEach((s) => this.bell(440 * Math.pow(2, s / 12), t + 1.2, 0.1, 2.4));
      this.noiseBurst(t + 0.2, 1.0, 0.1, "bandpass", 600, 4200, 2, 0.75);
    }
  }

  fail(w: string) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    if (w === "keris") {
      this.tone(140, t, 0.4, "sine", 0.8, 45, 0.3);
      this.noiseBurst(t, 0.2, 0.45, "lowpass", 2400, 200, 0.8, 0.4);
      this.metal(392, t + 0.2, 0.12, 1.0);
      this.metal(311, t + 0.45, 0.12, 1.1);
      this.metal(233, t + 0.7, 0.14, 1.4);
    } else if (w === "blackhole") {
      this.tone(220, t, 0.9, "sawtooth", 0.16, 34, 0.6);
      this.tone(160, t, 1.0, "square", 0.08, 28, 0.6);
      this.noiseBurst(t, 0.6, 0.5, "lowpass", 2500, 100, 0.8, 0.6);
      this.tone(64, t, 0.7, "sine", 0.85, 24, 0.3);
      this.bell(311, t + 0.3, 0.09, 0.9);
      this.bell(233, t + 0.55, 0.09, 1.1);
      this.bell(155, t + 0.85, 0.1, 1.6);
    } else if (w === "yoyo") {
      // string snap + sad slide down
      this.noiseBurst(t, 0.08, 0.5, "highpass", 2000, 1200, 1, 0.25);
      this.tone(500, t + 0.05, 0.5, "sine", 0.25, 120, 0.4, 0.02);
      this.tone(350, t + 0.4, 0.4, "triangle", 0.15, 110, 0.4);
    } else if (w === "diamond") {
      // glass crack + dull thud + descend
      this.noiseBurst(t, 0.09, 0.55, "highpass", 3800, 2200, 1, 0.3);
      this.tone(150, t, 0.3, "sine", 0.7, 50, 0.25);
      this.metal(880, t + 0.25, 0.09, 0.8);
      this.metal(659, t + 0.5, 0.09, 0.9);
      this.metal(494, t + 0.78, 0.1, 1.2);
    } else {
      this.tone(170, t, 0.4, "sine", 0.7, 55, 0.35);
      this.noiseBurst(t, 0.25, 0.35, "lowpass", 2000, 220, 0.8, 0.45);
      this.bell(392, t + 0.3, 0.12, 1.0);
      this.bell(311, t + 0.6, 0.12, 1.2);
      this.bell(233, t + 0.9, 0.12, 1.5);
    }
  }

  sky(w: string) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    if (now - this.lastSky < 0.25) return;
    this.lastSky = now;
    const t = now;
    if (w === "keris") {
      this.metal(880 + Math.random() * 440, t, 0.07, 1.0);
      this.noiseBurst(t, 0.3, 0.08, "bandpass", 1200, 4200, 2.5, 0.6);
    } else if (w === "blackhole") {
      this.noiseBurst(t, 0.32, 0.2, "bandpass", 5200, 500, 3, 0.7);
      this.tone(1400, t, 0.3, "sine", 0.07, 220, 0.8, 0.02);
    } else if (w === "yoyo") {
      this.tone(500 + Math.random() * 200, t, 0.18, "sine", 0.08, 900, 0.4, 0.02);
    } else if (w === "diamond") {
      this.metal(1568 + Math.random() * 600, t, 0.08, 1.1);
    } else {
      this.bell(660 + Math.random() * 220, t, 0.08, 1.2);
      this.noiseBurst(t, 0.3, 0.06, "bandpass", 800, 3600, 2.5, 0.65);
    }
  }
}
