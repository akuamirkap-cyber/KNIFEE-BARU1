/* Procedural weapon SFX — Web Audio, no external assets */

let _tick = 0;
function chargeTick() { _tick = (_tick + 1) % 4; return _tick; }

export class Sfx {
  ctx: AudioContext | null = null;
  master: GainNode | null = null;
  enabled = true;
  private noiseBuf: AudioBuffer | null = null;
  private loops: { gain: GainNode; osc: OscillatorNode[]; src: AudioBufferSourceNode[] } | null = null;

  ensure() {
    if (!this.ctx) {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      if (!AC) return null;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.55;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  }

  private noise(): AudioBuffer {
    const ctx = this.ctx!;
    if (!this.noiseBuf) {
      const len = ctx.sampleRate * 2;
      const b = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = b.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this.noiseBuf = b;
    }
    return this.noiseBuf;
  }

  private env(g: GainNode, t: number, peak: number, atk: number, dec: number) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + atk);
    g.gain.exponentialRampToValueAtTime(0.0001, t + atk + dec);
  }

  /** filtered noise burst */
  nburst(dur: number, f0: number, f1: number, peak = 0.6, q = 1, type: BiquadFilterType = 'lowpass', delay = 0) {
    const ctx = this.ensure(); if (!ctx || !this.enabled) return;
    const t = ctx.currentTime + delay;
    const src = ctx.createBufferSource();
    src.buffer = this.noise();
    src.playbackRate.value = 0.8 + Math.random() * 0.4;
    const fl = ctx.createBiquadFilter();
    fl.type = type; fl.Q.value = q;
    fl.frequency.setValueAtTime(f0, t);
    fl.frequency.exponentialRampToValueAtTime(Math.max(60, f1), t + dur);
    const g = ctx.createGain();
    this.env(g, t, peak, 0.004, dur);
    src.connect(fl); fl.connect(g); g.connect(this.master!);
    src.start(t); src.stop(t + dur + 0.05);
  }

  /** pitched tone with sweep */
  tone(type: OscillatorType, f0: number, f1: number, dur: number, peak = 0.3, delay = 0, curve: 'exp' | 'lin' = 'exp') {
    const ctx = this.ensure(); if (!ctx || !this.enabled) return;
    const t = ctx.currentTime + delay;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(Math.max(10, f0), t);
    if (curve === 'exp') o.frequency.exponentialRampToValueAtTime(Math.max(10, f1), t + dur);
    else o.frequency.linearRampToValueAtTime(Math.max(10, f1), t + dur);
    const g = ctx.createGain();
    this.env(g, t, peak, 0.005, dur);
    o.connect(g); g.connect(this.master!);
    o.start(t); o.stop(t + dur + 0.05);
  }

  private click(delay = 0, peak = 0.25) {
    this.nburst(0.03, 4000, 900, peak, 3, 'bandpass', delay);
  }

  /* ================== weapon shots ================== */
  shot(kind: string, idx: number, power = 1) {
    if (!this.enabled) return;
    switch (kind) {
      case 'bullet': {
        const heavy = idx === 1;
        this.nburst(heavy ? 0.22 : 0.12, 2600, 220, heavy ? 0.85 : 0.55, 1.2);
        this.tone('triangle', heavy ? 180 : 260, 55, heavy ? 0.18 : 0.1, 0.5);
        this.click(0.02, 0.18);
        if (idx === 3 || idx === 5) {
          this.tone('sawtooth', 900 + Math.random() * 400, 120, 0.16, 0.22);
          this.nburst(0.18, 5200, 700, 0.28, 6, 'bandpass');
        }
        break;
      }
      case 'arrow':
        this.tone('triangle', 620, 95, 0.22, 0.55);
        this.tone('sine', 180, 42, 0.18, 0.52, 0.01);
        this.nburst(0.18, 2800, 340, 0.45, 2.2);
        this.tone('sawtooth', 320, 75, 0.12, 0.28);
        break;
      case 'beam':
        if (idx === 6) {
          this.tone('sawtooth', 1400, 90, 0.5, 0.35);
          this.tone('square', 220, 40, 0.45, 0.18);
          this.nburst(0.55, 3200, 180, 0.55, 1);
        } else {
          this.tone('square', 1200, 240, 0.18, 0.22);
          this.tone('sawtooth', 620, 140, 0.14, 0.16);
          this.nburst(0.12, 3000, 900, 0.18, 3, 'bandpass');
        }
        break;
      case 'fire':
        this.tone('sawtooth', 120, 42, 0.55, 0.45);
        this.nburst(0.85, 1200, 180, 0.55, 0.8);
        this.nburst(0.6, 420, 120, 0.35, 1.2, 'lowpass', 0.05);
        break;
      case 'slash':
        this.nburst(0.3, 5200, 700, 0.4, 2, 'bandpass');
        this.tone('triangle', 900, 180, 0.32, 0.28);
        break;
      case 'plasma':
        this.tone('sawtooth', 260, 60, 0.42, 0.4);
        this.tone('square', 520, 110, 0.32, 0.18);
        this.nburst(0.42, 1600, 160, 0.32, 1);
        break;
      case 'disc':
        this.nburst(0.34, 2400, 600, 0.32, 4, 'bandpass');
        this.tone('sine', 700, 220, 0.3, 0.2);
        break;
      case 'stream':
        this.nburst(0.16, 1800, 500, 0.22, 3, 'bandpass');
        break;
      case 'heat':
        this.tone('sawtooth', 220, 70, 0.9, 0.32);
        this.tone('sine', 110, 48, 0.9, 0.3);
        break;
      case 'repulsor':
        this.tone('sawtooth', 900, 90, 0.22, 0.34);
        this.nburst(0.2, 3600, 500, 0.32, 2);
        this.tone('sine', 160, 55, 0.2, 0.3);
        break;
      case 'acid': {
        this.nburst(0.22, 1900, 360, 0.32, 1.4);
        this.tone('triangle', 560, 150, 0.2, 0.18);
        this.nburst(0.4, 4200, 900, 0.12, 5, 'bandpass', 0.05);
        break;
      }
      case 'buster': {
        const p2 = Math.max(0.12, power);
        if (p2 > 0.55) {
          this.tone('square', 240 * (1 + p2), 70, 0.36, 0.34);
          this.tone('sawtooth', 120 * (1 + p2), 44, 0.42, 0.3);
          this.tone('triangle', 1400 * p2, 320, 0.3, 0.2);
          this.nburst(0.34, 3200, 420, 0.28, 1.6);
        } else {
          this.tone('square', 720, 260, 0.11, 0.24);
          this.tone('triangle', 1180, 520, 0.1, 0.15);
          this.nburst(0.08, 2600, 900, 0.14, 3, 'bandpass');
        }
        break;
      }
      case 'spine':
        this.nburst(0.16, 2600, 420, 0.34, 2.5, 'bandpass');
        this.tone('triangle', 780, 190, 0.18, 0.22);
        this.tone('sawtooth', 190, 62, 0.16, 0.15);
        break;
      case 'singularity':
        this.tone('sine', 92, 26, 0.95, 0.5);
        this.tone('sawtooth', 330, 40, 0.78, 0.26);
        this.nburst(0.7, 900, 90, 0.32, 1);
        break;
      case 'shard':
        this.tone('triangle', 1900, 430, 0.3, 0.26);
        this.tone('sine', 2700, 950, 0.22, 0.15);
        this.nburst(0.22, 5200, 1200, 0.22, 3, 'bandpass');
        break;
      case 'burst':
        this.tone('sawtooth', 420, 70, 0.3, 0.42);
        this.tone('square', 760, 120, 0.22, 0.2);
        this.nburst(0.32, 2000, 180, 0.4, 1);
        this.tone('sine', 90, 42, 0.35, 0.35);
        break;
    }
  }

  charge(idx: number) {
    if (!this.enabled) return;
    const ctx = this.ensure(); if (!ctx) return;
    const t = ctx.currentTime;
    if (idx === 16) {
      this.tone('sawtooth', 60, 380, 0.32, 0.16);
      this.tone('triangle', 240, 900, 0.3, 0.1);
    } else if (idx === 11) {
      this.tone('triangle', 180, 620, 0.28, 0.12);
    } else if (idx === 21) {
      this.tone('square', 320 + chargeTick() * 160, 520 + chargeTick() * 220, 0.12, 0.14);
      this.tone('triangle', 640 + chargeTick() * 260, 900 + chargeTick() * 300, 0.1, 0.09);
    } else {
      this.tone('sine', 90, 180, 0.18, 0.12);
    }
    void t;
  }

  /* ================== impacts ================== */
  impact(kind: string, idx: number) {
    if (!this.enabled) return;
    switch (kind) {
      case 'bullet':
        this.nburst(0.09, 2400, 500, 0.32, 2, 'bandpass');
        this.tone('triangle', 320, 90, 0.09, 0.22);
        if (idx === 3 || idx === 5) {
          this.tone('square', 1400, 300, 0.18, 0.18);
          this.nburst(0.2, 5000, 900, 0.16, 8, 'bandpass');
        }
        break;
      case 'arrow':
        this.nburst(0.18, 1600, 160, 0.65, 2.0);
        this.tone('triangle', 260, 50, 0.22, 0.52);
        this.tone('sine', 110, 38, 0.18, 0.45);
        break;
      case 'beam':
        this.nburst(0.35, 3000, 300, 0.42, 1.2);
        this.tone('sawtooth', idx === 6 ? 300 : 480, 70, 0.35, 0.28);
        break;
      case 'repulsor':
        this.nburst(0.26, 4200, 420, 0.36, 1.4);
        this.tone('sine', 130, 44, 0.28, 0.34);
        break;
      case 'fire':
        this.nburst(0.75, 1100, 150, 0.5, 0.9);
        this.tone('sawtooth', 90, 34, 0.7, 0.32);
        break;
      case 'slash':
        this.nburst(0.26, 4200, 700, 0.36, 2.5, 'bandpass');
        this.tone('triangle', 620, 160, 0.24, 0.24);
        break;
      case 'plasma': case 'burst':
        this.tone('sawtooth', 320, 52, 0.5, 0.42);
        this.nburst(0.5, 1700, 140, 0.45, 1);
        this.tone('sine', 82, 38, 0.55, 0.36);
        break;
      case 'disc':
        this.nburst(0.28, 3200, 600, 0.3, 4, 'bandpass');
        break;
      case 'acid':
        this.nburst(0.42, 2400, 320, 0.34, 1.5);
        this.tone('sawtooth', 360, 92, 0.32, 0.18);
        this.nburst(0.7, 5200, 1100, 0.12, 4, 'bandpass', 0.06);
        break;
      case 'buster':
        this.nburst(0.24, 3000, 700, 0.3, 1.6);
        this.tone('square', 520, 120, 0.22, 0.22);
        this.tone('triangle', 900, 220, 0.2, 0.16);
        break;
      case 'spine':
        this.nburst(0.35, 1900, 260, 0.34, 1.6);
        this.tone('sawtooth', 430, 88, 0.3, 0.2);
        this.nburst(0.55, 3200, 700, 0.13, 5, 'bandpass', 0.05);
        break;
      case 'singularity':
        this.tone('sine', 68, 22, 1.15, 0.55);
        this.tone('sawtooth', 240, 32, 0.9, 0.3);
        this.nburst(0.95, 1200, 110, 0.45, 1);
        break;
      case 'shard':
        this.tone('triangle', 2500, 720, 0.36, 0.26);
        for (let i = 0; i < 6; i++) this.click(i * 0.05 + Math.random() * 0.04, 0.17);
        break;
    }
  }

  breakWheel() {
    if (!this.enabled) return;
    this.nburst(1.1, 1400, 90, 0.75, 0.8);
    this.tone('sawtooth', 160, 32, 1.1, 0.5);
    this.tone('triangle', 90, 28, 1.3, 0.42);
    for (let i = 0; i < 9; i++) this.click(i * 0.07 + Math.random() * 0.05, 0.3);
  }

  /* ================== continuous proton / heat ray loop ================== */
  startLoop(kind: string) {
    const ctx = this.ensure(); if (!ctx || !this.enabled || this.loops) return;
    const g = ctx.createGain();
    g.gain.value = 0.0001;
    g.connect(this.master!);
    const oscs: OscillatorNode[] = [], srcs: AudioBufferSourceNode[] = [];
    if (kind === 'stream') {
      const o1 = ctx.createOscillator(); o1.type = 'sawtooth'; o1.frequency.value = 78;
      const o2 = ctx.createOscillator(); o2.type = 'square'; o2.frequency.value = 156;
      const s = ctx.createBufferSource(); s.buffer = this.noise(); s.loop = true;
      const fl = ctx.createBiquadFilter(); fl.type = 'bandpass'; fl.frequency.value = 1600; fl.Q.value = 2;
      o1.connect(g); o2.connect(g); s.connect(fl); fl.connect(g);
      oscs.push(o1, o2); srcs.push(s);
      const lfo = ctx.createOscillator(); lfo.frequency.value = 11;
      const lg = ctx.createGain(); lg.gain.value = 220;
      lfo.connect(lg); lg.connect(fl.frequency); oscs.push(lfo);
      g.gain.linearRampToValueAtTime(0.18, ctx.currentTime + 0.12);
    } else {
      const o1 = ctx.createOscillator(); o1.type = 'sawtooth'; o1.frequency.value = 118;
      const o2 = ctx.createOscillator(); o2.type = 'triangle'; o2.frequency.value = 59;
      const s = ctx.createBufferSource(); s.buffer = this.noise(); s.loop = true;
      const fl = ctx.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = 900;
      o1.connect(g); o2.connect(g); s.connect(fl); fl.connect(g);
      oscs.push(o1, o2); srcs.push(s);
      g.gain.linearRampToValueAtTime(0.16, ctx.currentTime + 0.2);
    }
    oscs.forEach(o => o.start());
    srcs.forEach(s => s.start());
    this.loops = { gain: g, osc: oscs, src: srcs };
  }

  stopLoop() {
    if (!this.loops || !this.ctx) return;
    const { gain, osc, src } = this.loops;
    const t = this.ctx.currentTime;
    gain.gain.cancelScheduledValues(t);
    gain.gain.setValueAtTime(gain.gain.value, t);
    gain.gain.linearRampToValueAtTime(0.0001, t + 0.12);
    osc.forEach(o => o.stop(t + 0.16));
    src.forEach(s => s.stop(t + 0.16));
    this.loops = null;
  }

  setEnabled(v: boolean) {
    this.enabled = v;
    if (!v) this.stopLoop();
    if (this.master) this.master.gain.value = v ? 0.55 : 0;
  }
}

export const sfx = new Sfx();
