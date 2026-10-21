/**
 * Fully synthesized Nusantara-flavoured sound engine (Web Audio).
 * No external assets — every sound is generated procedurally.
 */
export class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noiseBuf: AudioBuffer | null = null;
  muted = false;

  constructor() {
    try {
      this.muted = localStorage.getItem('gunhit_muted') === '1';
    } catch {
      /* ignore */
    }
  }

  private ensure(): boolean {
    if (this.muted) return false;
    if (!this.ctx) {
      try {
        const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.55;
        this.master.connect(this.ctx.destination);
        const len = this.ctx.sampleRate * 0.5;
        this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
        const data = this.noiseBuf.getChannelData(0);
        for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      } catch {
        return false;
      }
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    return true;
  }

  toggle(): boolean {
    this.muted = !this.muted;
    try {
      localStorage.setItem('gunhit_muted', this.muted ? '1' : '0');
    } catch {
      /* ignore */
    }
    if (!this.muted) this.ensure();
    return this.muted;
  }

  private osc(type: OscillatorType, f0: number, f1: number, t0: number, dur: number, vol: number, dest?: AudioNode) {
    if (!this.ctx || !this.master) return;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t0);
    o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t0 + dur);
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(dest ?? this.master);
    o.start(t0);
    o.stop(t0 + dur + 0.02);
  }

  private noise(t0: number, dur: number, vol: number, filterType: BiquadFilterType, freq: number, q = 1) {
    if (!this.ctx || !this.master || !this.noiseBuf) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.playbackRate.value = 0.8 + Math.random() * 0.5;
    const f = this.ctx.createBiquadFilter();
    f.type = filterType;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f).connect(g).connect(this.master);
    src.start(t0);
    src.stop(t0 + dur + 0.02);
  }

  /** thunder discharge — electric snap & whoosh */
  shoot() {
    if (!this.ensure() || !this.ctx) return;
    const t = this.ctx.currentTime;
    this.noise(t, 0.1, 0.95, 'highpass', 3200, 0.7);
    this.noise(t, 0.06, 0.5, 'bandpass', 5400, 2);
    this.osc('sawtooth', 2400, 300, t, 0.09, 0.18);
    this.osc('sine', 400, 55, t, 0.24, 0.75);
  }

  /** the bolt strikes home — crackle, sizzle & rumble */
  thunder() {
    if (!this.ensure() || !this.ctx) return;
    const t = this.ctx.currentTime;
    this.noise(t, 0.22, 0.85, 'highpass', 2400, 1);
    this.noise(t + 0.03, 0.5, 0.35, 'highpass', 5200, 0.9);
    for (let i = 0; i < 5; i++) {
      this.noise(t + 0.04 + i * 0.05, 0.05, 0.32, 'bandpass', 2600 + i * 420, 3);
    }
    this.osc('sine', 140, 36, t, 0.55, 0.8);
    this.osc('sine', 175, 90, t + 0.01, 0.12, 0.5);
  }

  /** keris biting into the wooden mandala (soft variant) */
  embed() {
    if (!this.ensure() || !this.ctx) return;
    const t = this.ctx.currentTime;
    this.noise(t, 0.09, 0.6, 'lowpass', 900, 1.4);
    this.osc('sine', 170, 90, t, 0.12, 0.55);
    this.osc('sine', 2500, 1800, t + 0.015, 0.09, 0.1);
  }

  /** rusty clash of two keris — death */
  clash() {
    if (!this.ensure() || !this.ctx) return;
    const t = this.ctx.currentTime;
    this.noise(t, 0.3, 0.8, 'bandpass', 3200, 4);
    this.osc('square', 620, 120, t, 0.28, 0.22);
    this.osc('sawtooth', 210, 42, t, 0.7, 0.5);
    this.noise(t + 0.05, 0.5, 0.5, 'lowpass', 380, 1);
  }

  /** ruby pickup — kempul chime */
  gem() {
    if (!this.ensure() || !this.ctx) return;
    const t = this.ctx.currentTime;
    this.osc('sine', 1320, 1320, t, 0.35, 0.3);
    this.osc('sine', 1980, 1980, t + 0.06, 0.3, 0.2);
    this.osc('triangle', 2640, 2640, t + 0.12, 0.25, 0.1);
  }

  /** level cleared — rising gamelan arpeggio */
  clear(big = false) {
    if (!this.ensure() || !this.ctx) return;
    const t = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5, (big ? 1568 : 1318.5)];
    notes.forEach((f, i) => {
      this.osc('sine', f, f, t + i * 0.07, 0.5, 0.28);
      this.osc('triangle', f * 2, f * 2, t + i * 0.07, 0.35, 0.08);
    });
    this.noise(t + 0.05, 0.45, 0.16, 'highpass', 7000, 0.7);
  }

  /** soft ui pluck */
  ui() {
    if (!this.ensure() || !this.ctx) return;
    const t = this.ctx.currentTime;
    this.osc('sine', 660, 520, t, 0.09, 0.2);
  }

  /** next level flourish */
  level() {
    if (!this.ensure() || !this.ctx) return;
    const t = this.ctx.currentTime;
    this.osc('sine', 440, 440, t, 0.3, 0.18);
    this.osc('sine', 587.33, 587.33, t + 0.09, 0.35, 0.2);
  }
}
