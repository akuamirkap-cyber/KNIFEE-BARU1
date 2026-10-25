export class Sfx {
  ctx: AudioContext | null = null;
  master!: GainNode;
  nb!: AudioBuffer;

  ensure() {
    if (!this.ctx) {
      const C = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new C();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.45;
      this.master.connect(this.ctx.destination);
      const len = this.ctx.sampleRate * 2;
      this.nb = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.nb.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  }

  osc(type: OscillatorType, f0: number, f1: number, dur: number, vol: number, delay = 0) {
    const c = this.ctx;
    if (!c) return;
    const t = c.currentTime + delay;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  noise(dur: number, vol: number, ftype: BiquadFilterType, f0: number, f1: number, q = 1, delay = 0) {
    const c = this.ctx;
    if (!c) return;
    const t = c.currentTime + delay;
    const s = c.createBufferSource();
    s.buffer = this.nb;
    const f = c.createBiquadFilter();
    f.type = ftype;
    f.Q.value = q;
    f.frequency.setValueAtTime(f0, t);
    f.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(this.master);
    s.start(t, Math.random());
    s.stop(t + dur + 0.05);
  }

  /** Xenomorph hiss + wet spit */
  spit() {
    if (!this.ctx) return;
    this.noise(0.42, 0.4, 'highpass', 1500, 5000, 0.7);
    this.noise(0.18, 0.5, 'bandpass', 900, 300, 2);
    this.osc('sawtooth', 160, 60, 0.3, 0.14);
    this.osc('sine', 420, 90, 0.2, 0.2);
  }

  /** Wet splat + long corrosive sizzle */
  splat() {
    if (!this.ctx) return;
    this.noise(0.14, 0.6, 'lowpass', 1800, 300, 1);
    this.osc('sine', 300, 55, 0.3, 0.3);
    this.noise(1.8, 0.22, 'highpass', 3500, 7000, 0.5, 0.05);
    this.noise(0.9, 0.15, 'bandpass', 2200, 1200, 3, 0.1);
  }

  /** Doraemon Air Cannon "DOKAN!": deep air thump + whoosh */
  dokan() {
    if (!this.ctx) return;
    this.osc('sine', 150, 38, 0.42, 0.7);
    this.osc('triangle', 90, 30, 0.3, 0.4);
    this.noise(0.12, 0.6, 'lowpass', 1200, 200, 1);
    this.noise(0.5, 0.35, 'bandpass', 500, 2600, 1.2, 0.03);
  }

  /** Air blast slams wood: hollow thud + crack + dust */
  thud() {
    if (!this.ctx) return;
    this.osc('sine', 120, 30, 0.35, 0.6);
    this.noise(0.06, 0.6, 'highpass', 1200, 900, 1);
    this.noise(0.45, 0.4, 'lowpass', 900, 120, 1);
    this.osc('square', 220, 60, 0.08, 0.08);
  }

  /** Predator caster: servo whir + rising core charge whine */
  charge(dur: number) {
    if (!this.ctx) return;
    this.osc('sawtooth', 70, 140, dur, 0.06);
    this.osc('sine', 180, 1900, dur, 0.16);
    this.osc('triangle', 90, 950, dur, 0.1);
    this.noise(dur, 0.1, 'bandpass', 600, 5000, 2);
  }

  /** plasma release: iconic thunk + electric crack + tail */
  plasma() {
    if (!this.ctx) return;
    this.noise(0.05, 0.9, 'highpass', 2000, 4000, 1);
    this.osc('square', 1400, 120, 0.12, 0.18);
    this.osc('sine', 260, 50, 0.45, 0.6);
    this.osc('sawtooth', 900, 140, 0.35, 0.14);
    this.noise(0.6, 0.35, 'bandpass', 2400, 400, 1.5, 0.02);
  }

  /** plasma impact: thunderous explosion + sizzle */
  plasmaHit() {
    if (!this.ctx) return;
    this.noise(0.08, 0.9, 'lowpass', 6000, 2000, 1);
    this.osc('sine', 140, 30, 0.7, 0.75);
    this.noise(0.9, 0.5, 'lowpass', 2600, 150, 1);
    this.osc('square', 2200, 300, 0.1, 0.1);
    this.noise(1.6, 0.18, 'highpass', 3500, 7000, 0.6, 0.1);
  }

  /** singularity launch: deep sub-bass drop + reversed-sounding sweep */
  voidShot() {
    if (!this.ctx) return;
    this.osc('sine', 48, 22, 0.9, 0.8);
    this.osc('sine', 1800, 90, 0.5, 0.14);
    this.osc('sawtooth', 60, 240, 0.35, 0.08);
    this.noise(0.6, 0.25, 'lowpass', 400, 2200, 1);
  }

  /** event horizon bites the wheel: implosion thump + crushing rumble + high harmonic */
  voidHit() {
    if (!this.ctx) return;
    this.noise(0.35, 0.3, 'bandpass', 3000, 200, 1.2);
    this.osc('sine', 30, 70, 0.5, 0.9, 0.12);
    this.osc('sine', 110, 28, 1.2, 0.7, 0.15);
    this.noise(1.4, 0.35, 'lowpass', 500, 60, 1, 0.15);
    this.osc('triangle', 2400, 1200, 0.6, 0.06, 0.1);
  }

  /** everything collapses into the singularity then snaps */
  voidCollapse() {
    if (!this.ctx) return;
    this.osc('sine', 40, 160, 1.4, 0.7);
    this.noise(1.4, 0.4, 'lowpass', 200, 3000, 1);
    this.osc('sine', 160, 20, 0.8, 0.9, 1.4);
    this.noise(0.5, 0.8, 'lowpass', 4000, 100, 1, 1.4);
  }

  /** Acid hits a knife: metallic ping + hiss */
  clang() {
    if (!this.ctx) return;
    this.osc('sine', 1250, 1210, 0.6, 0.28);
    this.osc('sine', 1870, 1840, 0.45, 0.18);
    this.noise(0.08, 0.4, 'highpass', 3000, 3000, 1);
    this.noise(1.2, 0.25, 'highpass', 3000, 7000, 0.6, 0.05);
  }

  explode() {
    if (!this.ctx) return;
    this.noise(1.6, 0.7, 'lowpass', 2500, 70, 1);
    this.osc('sine', 95, 28, 1.1, 0.6);
    this.noise(2, 0.3, 'highpass', 3000, 6000, 0.5, 0.2);
    [523, 659, 784, 1046].forEach((f, i) => this.osc('square', f, f, 0.14, 0.05, 0.5 + i * 0.1));
  }
}
