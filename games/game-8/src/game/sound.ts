/* Procedural Web Audio sound engine — no audio files needed. */

type StopFn = () => void;

export class SoundEngine {
  ac: AudioContext | null = null;
  private master!: GainNode;
  private fxBus!: GainNode;
  private musicBus!: GainNode;
  private rev!: ConvolverNode;
  private revG!: GainNode;
  private nb!: AudioBuffer;
  muted = false;
  musicOn = true;
  private loops = new Map<string, { stop: StopFn; set: (v: number, dt: number) => void }>();
  private timers: number[] = [];
  private lastAt = new Map<string, number>();
  private mTimer: number | undefined;
  private nextStep = 0;
  private step = 0;

  constructor() {
    try {
      this.muted = localStorage.getItem('arsenal-mute') === '1';
      this.musicOn = localStorage.getItem('arsenal-music') !== '0';
    } catch { /* noop */ }
  }

  /* ---------------- graph ---------------- */
  private ensure(): boolean {
    if (this.ac) return true;
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    if (!AC) return false;
    const ac = (this.ac = new AC());
    const comp = ac.createDynamicsCompressor();
    comp.threshold.value = -14; comp.knee.value = 22; comp.ratio.value = 9;
    comp.attack.value = 0.002; comp.release.value = 0.18;
    this.master = ac.createGain();
    this.master.gain.value = this.muted ? 0 : 0.92;
    this.fxBus = ac.createGain(); this.fxBus.gain.value = 1;
    this.musicBus = ac.createGain(); this.musicBus.gain.value = 0.62;
    this.fxBus.connect(comp); this.musicBus.connect(comp);
    comp.connect(this.master); this.master.connect(ac.destination);
    // generated impulse response: lush hall
    const sr = ac.sampleRate, len = Math.floor(sr * 1.7);
    const ir = ac.createBuffer(2, len, sr);
    for (let c = 0; c < 2; c++) {
      const d = ir.getChannelData(c);
      for (let i = 0; i < len; i++) {
        const t = i / sr;
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - t / 1.7, 2.6) * 0.6;
      }
    }
    this.rev = ac.createConvolver(); this.rev.buffer = ir;
    this.revG = ac.createGain(); this.revG.gain.value = 0.34;
    this.rev.connect(this.revG); this.revG.connect(this.master);
    // global fx send into reverb
    const send = ac.createGain(); send.gain.value = 0.5;
    this.fxBus.connect(send); send.connect(this.rev);
    // shared noise buffer
    const n = ac.sampleRate * 2;
    this.nb = ac.createBuffer(1, n, ac.sampleRate);
    const nd = this.nb.getChannelData(0);
    for (let i = 0; i < n; i++) nd[i] = Math.random() * 2 - 1;
    return true;
  }
  unlock() {
    if (!this.ensure()) return;
    const ac = this.ac!;
    if (ac.state === 'suspended') ac.resume();
    if (this.musicOn && this.mTimer === undefined) this.startMusic();
  }
  toggleMute(): boolean {
    this.muted = !this.muted;
    try { localStorage.setItem('arsenal-mute', this.muted ? '1' : '0'); } catch { /* noop */ }
    if (this.ac) this.master.gain.linearRampToValueAtTime(this.muted ? 0 : 0.92, this.ac.currentTime + 0.08);
    return this.muted;
  }
  toggleMusic(): boolean {
    this.musicOn = !this.musicOn;
    try { localStorage.setItem('arsenal-music', this.musicOn ? '1' : '0'); } catch { /* noop */ }
    if (this.musicOn) { this.unlock(); if (this.mTimer === undefined) this.startMusic(); }
    else { clearInterval(this.mTimer); this.mTimer = undefined; }
    return this.musicOn;
  }
  stopAll() {
    for (const l of this.loops.values()) l.stop();
    this.loops.clear();
    for (const t of this.timers) clearTimeout(t);
    this.timers = [];
  }

  /* ---------------- primitives ---------------- */
  private t0() { return this.ac ? this.ac.currentTime + 0.012 : 0; }
  private ready(): this is { ac: AudioContext } {
    if (!this.ac || this.muted) return false;
    // A context that is still waiting for the user's gesture still *schedules*
    // voices: they play the moment it resumes. Dropping them here was why the
    // first shots after a tap came out silent.
    if (this.ac.state === 'suspended') {
      try {
        void this.ac.resume();
      } catch {
        /* ignore */
      }
    }
    return true;
  }

  /** gain stage w/ ADSR-lite, connected to fxBus (and thus reverb) */
  private osc(type: OscillatorType, f0: number, f1: number, dur: number, peak: number, a = 0.004, when = 0, pan = 0) {
    const ac = this.ac!;
    const t = this.t0() + when;
    const o = ac.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(Math.max(20, f0), t);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    let node: any = o;
    if (pan) { const p = ac.createStereoPanner(); p.pan.value = pan; o.connect(p); node = p; }
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0002, t + a + dur);
    node.connect(g);
    g.connect(this.fxBus);
    o.start(t); o.stop(t + a + dur + 0.05);
    o.onended = () => { o.disconnect(); g.disconnect(); };
    return o;
  }
  private noise(dur: number, peak: number, o: { hp?: number; lp?: number; rate?: number; a?: number; when?: number; q?: number; sweepTo?: number; pan?: number } = {}) {
    const ac = this.ac!;
    const t = this.t0() + (o.when ?? 0);
    const src = ac.createBufferSource();
    src.buffer = this.nb;
    src.loop = true;
    src.playbackRate.value = o.rate ?? 1;
    let node: any = src;
    if (o.hp || o.lp) {
      const f = ac.createBiquadFilter();
      f.type = o.hp && o.lp ? 'bandpass' : o.hp ? 'highpass' : 'lowpass';
      f.frequency.setValueAtTime((o.hp || o.lp)!, t);
      if (o.sweepTo) f.frequency.exponentialRampToValueAtTime(o.sweepTo, t + dur);
      f.Q.value = o.q ?? (o.hp && o.lp ? 1.1 : 0.7);
      src.connect(f); node = f;
    }
    if (o.pan) { const p = ac.createStereoPanner(); p.pan.value = o.pan; node.connect(p); node = p; }
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + (o.a ?? 0.004));
    g.gain.exponentialRampToValueAtTime(0.0002, t + (o.a ?? 0.004) + dur);
    node.connect(g); g.connect(this.fxBus);
    src.start(t); src.stop(t + (o.a ?? 0.004) + dur + 0.05);
    src.onended = () => { src.disconnect(); g.disconnect(); };
  }
  private boom(size = 1, tone: 'boom' | 'zap' | 'solar' = 'boom') {
    this.osc('sine', 62, 30, 0.5 * size, 0.85 * size, 0.004);
    this.noise(0.45 * size, 0.6 * size, { lp: 340, a: 0.005 });
    if (tone === 'zap') { this.osc('sawtooth', 900, 120, 0.16, 0.16); this.noise(0.3, 0.25, { hp: 2600 }); }
    if (tone === 'solar') { this.noise(0.8, 0.4, { lp: 260 }); this.osc('sine', 1300, 500, 0.35, 0.08); }
  }
  private woodHit(p: number) {
    const v = Math.min(1.2, 0.45 + 0.4 * p);
    this.noise(0.09, 0.9 * v, { lp: 260 });
    this.osc('square', 150, 70, 0.05, 0.2 * v);
    this.noise(0.03, 0.4 * v, { hp: 2800 });
  }
  private crackle(n: number, when = 0, vol = 0.3, hp = 2200) {
    for (let i = 0; i < n; i++) {
      this.noise(0.02 + Math.random() * 0.05, vol * (0.4 + Math.random() * 0.6), {
        hp: hp * (0.7 + Math.random() * 0.8), when: when + Math.random() * 0.35, pan: Math.random() * 1.6 - 0.8,
      });
    }
  }
  private chimes(n = 3, scale: number[] = [1046, 1318, 1568, 2093], when = 0) {
    for (let i = 0; i < n; i++) {
      const f = scale[Math.floor(Math.random() * scale.length)] * (0.97 + Math.random() * 0.06);
      this.osc('sine', f, f, 0.5 + Math.random() * 0.4, 0.12, 0.004, when + i * 0.07 + Math.random() * 0.05, Math.random() * 1.4 - 0.7);
    }
  }
  private splinters(n: number, vol = 0.2) {
    for (let i = 0; i < n; i++) {
      this.noise(0.015 + Math.random() * 0.03, vol * (0.5 + Math.random() * 0.5), {
        hp: 3000 + Math.random() * 4000, when: Math.random() * 0.28, pan: Math.random() * 1.6 - 0.8,
      });
    }
  }
  private gate(fam: string, ms: number): boolean {
    const now = performance.now();
    const last = this.lastAt.get(fam) ?? -1e9;
    if (now - last < ms) return false;
    this.lastAt.set(fam, now);
    return true;
  }
  private later(ms: number, fn: () => void) {
    this.timers.push(window.setTimeout(() => { fn(); }, ms));
  }

  /* ---------------- events ---------------- */
  playFire(id: string) {
    if (!this.ready()) return;
    const v = (mul = 1) => mul;
    switch (id) {
      case 'ak47':
        this.noise(0.1, 0.95 * v(), { hp: 1100 });
        this.osc('sine', 115, 42, 0.11, 0.5);
        this.osc('square', 240, 80, 0.03, 0.16);
        break;
      case 'mp5':
        this.noise(0.07, 0.8, { hp: 1600 });
        this.osc('sine', 150, 60, 0.08, 0.4);
        break;
      case 'mp5-electro':
        this.noise(0.07, 0.7, { hp: 1500 });
        this.osc('sawtooth', 980, 140, 0.07, 0.2);
        this.noise(0.05, 0.3, { hp: 3200 });
        break;
      case 'rifle':
        this.noise(0.09, 1, { hp: 1900 });
        this.osc('square', 260, 90, 0.045, 0.2);
        this.osc('sine', 130, 50, 0.1, 0.45);
        break;
      case 'rifle-electro':
        this.noise(0.08, 0.9, { hp: 1800 });
        this.osc('sawtooth', 1300, 160, 0.12, 0.22);
        this.noise(0.08, 0.35, { hp: 3400 });
        break;
      case 'beretta':
        this.noise(0.08, 1.05, { hp: 1400 });
        this.osc('sine', 150, 46, 0.12, 0.55);
        this.osc('sine', 3100, 2600, 0.05, 0.12, 0.001, 0.016);
        this.noise(0.04, 0.3, { hp: 5200, when: 0.014 });
        break;
      case 'sniper-beam':
        this.osc('sawtooth', 200, 1500, 0.16, 0.18, 0.01);
        this.boom(1.15, 'zap');
        this.noise(0.5, 0.5, { hp: 300, sweepTo: 2600 });
        this.osc('sine', 7800, 5200, 0.5, 0.07, 0.004, 0.02);
        break;
      case 'bow':
        this.osc('sine', 380, 130, 0.12, 0.4);
        this.osc('sine', 570, 190, 0.1, 0.25);
        this.noise(0.2, 0.3, { hp: 1500, sweepTo: 3200 });
        break;
      case 'energy-sword':
        this.noise(0.26, 0.5, { hp: 380, lp: 1900, sweepTo: 2400, q: 3 });
        this.osc('sawtooth', 90, 220, 0.16, 0.1);
        break;
      case 'plasmacaster': case 'plasmacaster-mk2':
        if (!this.gate('plasma', 300)) break;
        this.osc('sawtooth', 70, 190, 0.26, 0.22);
        this.boom(1.25, 'zap');
        this.crackle(8, 0.12, 0.3);
        break;
      case 'identity-disc':
        this.noise(0.3, 0.4, { hp: 500, lp: 2300, sweepTo: 2400, q: 2 });
        this.osc('sine', 320, 940, 0.28, 0.14);
        break;
      case 'singularity':
        this.osc('sine', 66, 26, 0.9, 0.8);
        this.noise(0.5, 0.35, { hp: 320, sweepTo: 2800 });
        this.osc('sawtooth', 220, 34, 0.55, 0.2);
        break;
      case 'prism-lance':
        // four-note glass chord + air; the chimes ride just under the noise so
        // the lance reads as loud as the other rare guns
        this.chimes(4, [1600, 2400, 3200, 4200]);
        this.noise(0.32, 0.34, { hp: 3600 });
        this.osc('triangle', 2400, 900, 0.22, 0.22, 0.004);
        break;
      case 'nano-swarm':
        for (let i = 0; i < 5; i++) this.osc('square', 720 + i * 190, 720 + i * 190, 0.03, 0.2, 0.002, i * 0.028);
        this.noise(0.2, 0.3, { hp: 2400 });
        this.osc('sawtooth', 1400, 300, 0.16, 0.14, 0.004, 0.02);
        break;
      case 'chrono':
        this.noise(0.38, 0.26, { hp: 2800, sweepTo: 420, q: 2 });
        this.osc('sine', 66, 30, 0.5, 0.5);
        for (let i = 0; i < 2; i++) this.osc('square', 1900, 1200, 0.03, 0.1, 0.002, 0.1 + i * 0.09);
        break;
      case 'orbital-beacon':
        for (let i = 0; i < 2; i++) this.osc('square', 1380, 1380, 0.05, 0.12, 0.002, i * 0.09);
        this.noise(0.5, 0.4, { hp: 420, lp: 2800, sweepTo: 2600, q: 2 });
        break;
      case 'helix-pulsar':
        this.osc('square', 720, 240, 0.05, 0.34);
        this.osc('sawtooth', 1080, 360, 0.05, 0.3, 0.002, 0.016);
        this.noise(0.06, 0.18, { hp: 2200 });
        break;
      case 'harmonic':
        this.osc('sine', 55, 28, 0.75, 1);
        this.noise(0.4, 0.5, { lp: 260 });
        this.osc('sine', 2500, 260, 0.85, 0.13, 0.01, 0.04);
        break;
      case 'absolute-zero':
        this.noise(0.45, 0.45, { hp: 1700, sweepTo: 600, q: 1.2 });
        this.noise(0.3, 0.3, { lp: 380 });
        this.chimes(2, [2800, 4200, 5600], 0.05);
        break;
      case 'helios':
        this.noise(0.5, 0.7, { hp: 300, lp: 1400, sweepTo: 500 });
        this.osc('sine', 60, 30, 0.65, 0.9);
        this.noise(1.1, 0.34, { lp: 300, when: 0.05 });
        break;
      case 'xenomorph':
        this.noise(0.16, 0.7, { lp: 480, q: 2 });
        this.osc('sine', 230, 80, 0.1, 0.3);
        this.noise(0.1, 0.3, { hp: 1100, when: 0.02 });
        break;
      /* ── the six guns that used to fall through to the default recipe ──── */
      case 'tripod':
        // heat ray: rising electric whine + vent of steam
        this.osc('sawtooth', 180, 1400, 0.3, 0.3, 0.02);
        this.osc('square', 90, 620, 0.26, 0.18, 0.02, 0.01);
        this.noise(0.34, 0.4, { hp: 1500, sweepTo: 5200, q: 1.4 });
        this.noise(0.22, 0.2, { lp: 500, when: 0.12 });
        break;
      case 'ironman':
        // repulsor blast: one fat solar palm-blast, the suit's signature
        this.boom(0.9, 'zap');
        this.osc('sine', 320, 60, 0.3, 0.6, 0.004);
        this.noise(0.5, 0.4, { hp: 900, sweepTo: 2600, when: 0.02 });
        break;
      case 'mega-buster':
        // uncharged buster shot: bright plasma pellet, punchy but small
        this.osc('square', 1500, 520, 0.09, 0.42);
        this.osc('sawtooth', 420, 140, 0.16, 0.22, 0.004);
        this.noise(0.12, 0.4, { hp: 2600, when: 0.01 });
        break;
      case 'dragon-breath':
        // throaty roar + scorching exhale
        this.noise(0.55, 0.6, { lp: 420, sweepTo: 1600, q: 1.6 });
        this.osc('sawtooth', 78, 34, 0.5, 0.5, 0.01);
        this.crackle(10, 0.06, 0.32);
        this.noise(0.9, 0.28, { lp: 300, when: 0.08 });
        break;
      case 'proton-pack':
        // crossed-stream hum: two detuned saws + ion crackle
        this.osc('sawtooth', 150, 210, 0.4, 0.34, 0.01);
        this.osc('sawtooth', 158, 224, 0.4, 0.3, 0.01, 0.012);
        this.noise(0.45, 0.34, { hp: 1200, sweepTo: 3000, q: 1.2 });
        this.crackle(7, 0.04, 0.26, 2800);
        break;
      case 'phaser':
        // classic phaser sweep: clean descending zap with a chorus tail
        this.osc('sine', 2400, 320, 0.26, 0.42);
        this.osc('square', 1200, 210, 0.18, 0.16, 0.004);
        this.noise(0.2, 0.24, { hp: 3000, sweepTo: 800, q: 2 });
        break;
      default:
        this.noise(0.07, 0.7, { hp: 1300 });
        this.osc('sine', 130, 55, 0.09, 0.4);
    }
  }

  playRelease(id: string, c: number) {
    if (!this.ready()) return;
    const ch = this.loops.get('charge');
    if (ch) { ch.stop(); this.loops.delete('charge'); }
    if (id === 'mega-buster') {
      if (c < 0.45) {
        this.osc('square', 1500, 640, 0.07, 0.3);
        this.noise(0.03, 0.2, { hp: 3000 });
      } else if (c < 1.2) {
        this.osc('sawtooth', 320, 1500, 0.16, 0.28, 0.006);
        this.osc('square', 1240, 500, 0.08, 0.18, 0.004, 0.1);
        this.noise(0.14, 0.3, { hp: 2200, when: 0.02 });
      } else {
        this.osc('sawtooth', 420, 1900, 0.2, 0.3, 0.005);
        this.boom(1.2, 'zap');
        this.noise(0.3, 0.4, { hp: 2000, when: 0.05 });
      }
    }
  }

  /** wood-hit — rate-limited, scales with power */
  thunk(power: number) {
    if (!this.ready() || !this.gate('thunk', 52)) return;
    this.woodHit(Math.min(2.6, power));
  }

  ricochet() {
    if (!this.ready()) return;
    this.osc('sine', 3400, 2500, 0.24, 0.2);
    this.osc('sine', 5100, 4200, 0.15, 0.1, 0.002, 0.01);
    this.noise(0.05, 0.35, { hp: 4200 });
    this.woodHit(0.5);
  }

  breakWheel() {
    if (!this.ready()) return;
    this.noise(0.5, 1, { lp: 320 });
    this.osc('square', 120, 50, 0.14, 0.5);
    this.osc('sine', 52, 28, 0.75, 1);
    this.splinters(10, 0.3);
    this.noise(0.7, 0.3, { hp: 600, lp: 3000, when: 0.04 });
  }

  levelClear() {
    if (!this.ready()) return;
    const seq = [523, 659, 784, 880, 1046, 1318];
    seq.forEach((f, i) => {
      this.osc('triangle', f, f, 0.3, 0.3, 0.004, i * 0.075, (i % 2 ? 0.5 : -0.5));
      if (i >= 4) this.osc('sine', f * 2, f * 2, 0.4, 0.12, 0.004, i * 0.075);
    });
    [523, 659, 784].forEach((f) => this.osc('sine', f, f, 0.9, 0.16, 0.01, 0.48));
    this.noise(0.9, 0.1, { hp: 8000, when: 0.35 });
  }

  select() {
    if (!this.ready()) return;
    this.osc('square', 860, 1200, 0.05, 0.1);
    this.noise(0.12, 0.12, { hp: 2400 });
  }

  /* ---------------- impact accents (wrapped at addProj) ---------------- */
  impact(id: string) {
    if (!this.ready() || !this.gate('imp' + id, 60)) return;
    switch (id) {
      case 'ak47': case 'rifle': case 'mp5': case 'beretta': case 'rifle-electro': case 'mp5-electro':
        this.osc('square', 210, 90, 0.025, 0.2);
        this.noise(0.04, 0.35, { hp: 2600 });
        this.crackle(2, 0.01, 0.18, 3000);
        break;
      case 'sniper-beam': case 'plasmacaster': case 'plasmacaster-mk2': case 'helios':
        this.boom(0.95);
        this.crackle(6, 0.06, 0.3);
        if (id === 'helios') { this.noise(0.9, 0.4, { lp: 280 }); this.crackle(8, 0.2, 0.3, 2800); }
        break;
      case 'bow':
        this.noise(0.1, 0.9, { lp: 240 });
        this.osc('square', 170, 80, 0.05, 0.3);
        break;
      case 'energy-sword':
        this.noise(0.18, 0.5, { hp: 2000 });
        this.osc('sawtooth', 1100, 180, 0.14, 0.2);
        break;
      case 'identity-disc':
        this.osc('square', 480, 120, 0.12, 0.2);
        this.osc('square', 960, 300, 0.1, 0.1, 0.004, 0.03);
        this.noise(0.16, 0.3, { hp: 1600 });
        break;
      case 'singularity':
        this.noise(0.85, 0.5, { hp: 900, lp: 3000, sweepTo: 200, q: 2 });
        this.osc('sine', 36, 24, 1.1, 1);
        this.later(1010, () => { if (this.ready()) { this.boom(1.5, 'zap'); this.crackle(9, 0.1, 0.4); } });
        break;
      case 'prism-lance':
        this.chimes(2, [1300, 1950, 2600, 3900]);
        this.noise(0.1, 0.2, { hp: 4200 });
        break;
      case 'nano-swarm':
        for (let i = 0; i < 4; i++) this.osc('square', 900 + Math.random() * 1400, 900, 0.025, 0.1, 0.002, i * 0.04, Math.random() - 0.5);
        this.noise(0.06, 0.2, { hp: 3000 });
        break;
      case 'chrono':
        this.osc('sine', 1600, 1600, 0.6, 0.14);
        this.osc('sine', 2400, 2400, 0.6, 0.08, 0.004, 0.06);
        this.osc('sine', 66, 30, 0.5, 0.6);
        this.noise(0.4, 0.2, { hp: 3600, sweepTo: 800, q: 2, when: 0.02 });
        break;
      case 'orbital-beacon':
        this.osc('square', 620, 1800, 0.85, 0.13, 0.004, 0.02);
        this.osc('square', 930, 2700, 0.85, 0.1, 0.004, 0.06);
        this.later(940, () => {
          if (!this.ready()) return;
          this.boom(1.7, 'zap');
          this.noise(0.7, 0.5, { hp: 200, lp: 1600, sweepTo: 400 });
          this.crackle(10, 0.15, 0.4);
          this.noise(0.8, 0.4, { lp: 240, when: 0.05 });
        });
        break;
      case 'helix-pulsar':
        this.osc('square', 860, 300, 0.05, 0.15);
        this.noise(0.04, 0.25, { hp: 2600 });
        break;
      case 'harmonic':
        this.osc('sine', 48, 26, 0.8, 0.9);
        this.noise(0.35, 0.4, { lp: 300 });
        this.later(380, () => { if (this.ready()) { this.noise(0.4, 0.6, { lp: 260 }); this.osc('sine', 52, 28, 0.5, 0.7); this.crackle(6, 0.02, 0.35); } });
        break;
      case 'absolute-zero':
        this.noise(0.3, 0.5, { hp: 2600 });
        this.crackle(7, 0.02, 0.4, 3600);
        for (let i = 0; i < 3; i++) this.osc('sine', 4200 - i * 700, 3000 - i * 500, 0.25, 0.1, 0.002, i * 0.05, Math.random() - 0.5);
        break;
      case 'xenomorph':
        this.noise(0.2, 0.6, { lp: 600, q: 2 });
        this.noise(1.6, 0.3, { hp: 2800, q: 1.5 });
        for (let i = 0; i < 5; i++) this.osc('sine', 300 + Math.random() * 300, 120, 0.06, 0.12, 0.004, 0.1 + Math.random() * 0.9, Math.random() - 0.5);
        break;
      case 'mega-buster':
        this.noise(0.3, 0.5, { hp: 1600 });
        this.osc('square', 300, 90, 0.09, 0.3);
        this.noise(0.12, 0.3, { hp: 3400, when: 0.02 });
        break;
      default:
        this.woodHit(0.9);
    }
  }

  /* ---------------- weapon-specific loops (channel beams & chargers) ---------------- */
  private startLoop(id: string): { stop: StopFn; set: (v: number, dt: number) => void } {
    const ac = this.ac!;
    const g = ac.createGain();
    g.gain.value = 0.0001;
    g.connect(this.fxBus);
    const nodes: (OscillatorNode | AudioBufferSourceNode)[] = [];
    const osc = (type: OscillatorType, f: number) => {
      const o = ac.createOscillator(); o.type = type; o.frequency.value = f;
      nodes.push(o); return o;
    };
    const noiseBB = () => {
      const s = ac.createBufferSource(); s.buffer = this.nb; s.loop = true; nodes.push(s); return s;
    };
    const lfo = (f: number, depth: number, target: AudioParam) => {
      const o = ac.createOscillator(); o.frequency.value = f;
      const og = ac.createGain(); og.gain.value = depth;
      o.connect(og); og.connect(target); o.start();
      nodes.push(o);
    };
    let extra: (v: number) => void = () => { /* noop */ };
    switch (id) {
      case 'dragon-breath': {
        const n = noiseBB();
        const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 320; f.Q.value = 1.2;
        const n2 = noiseBB();
        const f2 = ac.createBiquadFilter(); f2.type = 'bandpass'; f2.frequency.value = 1800; f2.Q.value = 0.8;
        const g2 = ac.createGain(); g2.gain.value = 0.4;
        const sub = osc('sine', 48);
        const sg = ac.createGain(); sg.gain.value = 0.5;
        lfo(7, 120, f.frequency); lfo(9, 700, f2.frequency);
        n.connect(f); f.connect(g);
        n2.connect(f2); f2.connect(g2); g2.connect(g);
        sub.connect(sg); sg.connect(g);
        n.start(); n2.start(); sub.start();
        break;
      }
      case 'phaser': {
        const o1 = osc('sine', 1457), o2 = osc('sine', 618);
        const og = ac.createGain(); og.gain.value = 0.5;
        const am = ac.createGain(); am.gain.value = 1;
        lfo(8.3, 0.5, og.gain);
        lfo(5.6, 60, o1.frequency); lfo(4.1, 34, o2.frequency);
        const hf = ac.createBiquadFilter(); hf.type = 'highpass'; hf.frequency.value = 3000;
        const hg = ac.createGain(); hg.gain.value = 0.07;
        const n = noiseBB(); n.connect(hf); hf.connect(hg); hg.connect(g);
        o1.connect(og); o2.connect(am);
        og.connect(g); am.connect(og);
        o1.start(); o2.start(); n.start();
        break;
      }
      case 'proton-pack': {
        const n = noiseBB();
        const f = ac.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 640; f.Q.value = 2.5;
        const o = osc('square', 104);
        const og = ac.createGain(); og.gain.value = 0.16;
        const n2 = noiseBB();
        const hf = ac.createBiquadFilter(); hf.type = 'highpass'; hf.frequency.value = 4200;
        const hg = ac.createGain(); hg.gain.value = 0.1;
        lfo(11, 380, f.frequency);
        lfo(13, 0.1, og.gain);
        n.connect(f); f.connect(g);
        o.connect(og); og.connect(g);
        n2.connect(hf); hf.connect(hg); hg.connect(g);
        n.start(); n2.start(); o.start();
        break;
      }
      case 'tripod': {
        const n = noiseBB();
        const f = ac.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 3000; f.Q.value = 1.6;
        const ff = ac.createBiquadFilter(); ff.type = 'lowpass'; ff.frequency.value = 1400;
        const o1 = osc('sawtooth', 38), o2 = osc('sawtooth', 38.7);
        const og = ac.createGain(); og.gain.value = 0.5;
        lfo(6.5, 500, f.frequency);
        lfo(0.7, 0.4, og.gain);
        lfo(0.31, 0.4, og.gain);
        n.connect(f); f.connect(ff); ff.connect(g);
        o1.connect(og); o2.connect(og); og.connect(g);
        n.start(); o1.start(); o2.start();
        const hissG = ac.createGain(); hissG.gain.value = 0;
        const hn = noiseBB(); const hf2 = ac.createBiquadFilter(); hf2.type = 'highpass'; hf2.frequency.value = 5500;
        hn.connect(hf2); hf2.connect(hissG); hissG.connect(g); hn.start();
        extra = (v) => { hissG.gain.setTargetAtTime(v > 0.6 ? 0.5 : 0.05, ac.currentTime, 0.05); };
        break;
      }
      case 'ironman': {
        const n = noiseBB();
        const f = ac.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1000; f.Q.value = 4;
        const o1 = osc('square', 220), o2 = osc('square', 331);
        const og = ac.createGain(); og.gain.value = 0.14;
        const sub = osc('sine', 82);
        const sg = ac.createGain(); sg.gain.value = 0.4;
        lfo(9, 500, f.frequency);
        lfo(6, 0.08, og.gain);
        n.connect(f); f.connect(g);
        o1.connect(og); o2.connect(og); og.connect(g);
        sub.connect(sg); sg.connect(g);
        n.start(); o1.start(); o2.start(); sub.start();
        break;
      }
      default: {
        const n = noiseBB(); n.connect(g); n.start();
      }
    }
    const t = ac.currentTime;
    g.gain.setValueAtTime(0.0001, t);
    const loop = {
      stop: () => {
        try { g.gain.setTargetAtTime(0.0001, ac.currentTime, 0.06); } catch { /* noop */ }
        for (const n of nodes) { try { (n as any).stop?.(ac.currentTime + 0.25); } catch { /* noop */ } setTimeout(() => { try { g.disconnect(); } catch { /* noop */ } }, 400); }
      },
      set: (v: number, dt: number) => {
        const cur = ac.currentTime;
        g.gain.setTargetAtTime(0.0001 + v * 0.5, cur, 0.03);
        for (const n of nodes) {
          if ((n as any).frequency) (n as any).frequency.setTargetAtTime(((n as any).frequency.base64 ?? (n as any).frequency.value), cur, dt);
        }
        extra(v);
      },
    };
    return loop;
  }

  /** continuous driver for channel weapons; spawn/stop loop automatically */
  channel(id: string, v: number) {
    if (!this.ac || this.muted || this.ac.state !== 'running') { this.killLoop(id + 'z'); return; }
    const key = 'ch:' + id;
    if (v < 0.04) { const l = this.loops.get(key); if (l) { l.stop(); this.loops.delete(key); } return; }
    let l = this.loops.get(key);
    if (!l) {
      l = this.startLoop(id);
      this.loops.set(key, l);
    }
    l.set(v, 0.016);
  }
  private killLoop(key: string) {
    const l = this.loops.get(key);
    if (l) { l.stop(); this.loops.delete(key); }
  }

  /** Mega Buster charge whine, driven every frame while holding */
  charge(id: string, c: number) {
    if (id !== 'mega-buster') return;
    if (!this.ac || this.muted || this.ac.state !== 'running') return;
    const key = 'charge';
    if (c <= 0.04) { this.killLoop(key); return; }
    let l = this.loops.get(key);
    if (!l) {
      const ac = this.ac;
      const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 190;
      const o2 = ac.createOscillator(); o2.type = 'sine'; o2.frequency.value = 380;
      const g = ac.createGain(); g.gain.value = 0.0001;
      const fl = ac.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = 900;
      const tr = ac.createGain(); tr.gain.value = 1;
      const lfo = ac.createOscillator(); lfo.frequency.value = 30;
      const lg = ac.createGain(); lg.gain.value = 0;
      lfo.connect(lg); lg.connect(tr.gain); lfo.start();
      o.connect(fl); fl.connect(tr); tr.connect(g); g.connect(this.fxBus);
      o2.connect(tr); o.start(); o2.start();
      const loop = {
        stop: () => { try { g.gain.setTargetAtTime(0.0001, ac.currentTime, 0.05); } catch { /* noop */ } setTimeout(() => { try { o.stop(); o2.stop(); lfo.stop(); } catch { /* noop */ } }, 200); },
        set: (v: number) => {
          const t = ac.currentTime;
          g.gain.setTargetAtTime(0.0001 + v * 0.35, t, 0.03);
          const fq = 190 + v * 620;
          o.frequency.setTargetAtTime(fq, t, 0.03);
          o2.frequency.setTargetAtTime(fq * 2.02, t, 0.03);
          fl.frequency.setTargetAtTime(800 + v * 1600, t, 0.03);
          lg.gain.setTargetAtTime(v > 1.15 ? 0.55 : 0, t, 0.05);
        },
      };
      this.loops.set(key, loop);
      l = loop;
    }
    l.set(c, 0.016);
  }

  /* ---------------- music: gentle synthwave, very quiet ---------------- */
  private startMusic() {
    if (this.mTimer !== undefined || !this.ac) return;
    this.nextStep = this.ac.currentTime + 0.1;
    this.step = 0;
    this.mTimer = window.setInterval(() => this.musTick(), 42);
  }
  private musTick() {
    if (!this.ac || this.muted || this.ac.state !== 'running' || !this.musicOn) return;
    const ac = this.ac;
    const EIGHTH = 60 / 96 / 2;
    while (this.nextStep < ac.currentTime + 0.24) {
      this.mStep(this.step, this.nextStep);
      this.nextStep += EIGHTH;
      this.step = (this.step + 1) % 64;
    }
  }
  private mOsc(type: OscillatorType, f: number, t: number, dur: number, vol: number, pan: number) {
    if (!this.ac) return;
    const o = this.ac.createOscillator(); o.type = type; o.frequency.value = f;
    const p = this.ac.createStereoPanner(); p.pan.value = pan;
    const g = this.ac.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0002, t + dur);
    o.connect(p); p.connect(g); g.connect(this.musicBus);
    o.start(t); o.stop(t + dur + 0.05);
    o.onended = () => { o.disconnect(); g.disconnect(); };
  }
  private mNoise(t: number, dur: number, vol: number, hp: number, pan = 0) {
    if (!this.ac) return;
    const s = this.ac.createBufferSource(); s.buffer = this.nb; s.loop = true;
    const f = this.ac.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = hp;
    const p = this.ac.createStereoPanner(); p.pan.value = pan;
    const g = this.ac.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0002, t + dur);
    s.connect(f); f.connect(p); p.connect(g); g.connect(this.musicBus);
    s.start(t); s.stop(t + dur + 0.05);
    s.onended = () => { s.disconnect(); g.disconnect(); };
  }
  private mStep(i: number, t: number) {
    const bar = Math.floor(i / 16) % 4, p8 = i % 16;
    const roots = [110, 87.3, 130.8, 98];
    const R = roots[bar];
    if (p8 === 0) {
      // pad: warm minor-ish chord
      const third = bar === 1 || bar === 3 ? R * 2.997 : R * 2.4;
      [R, R * 1.5, third, R * 2].forEach((f, k) => {
        this.mOsc('sine', f, t, 1.5, 0.05 - k * 0.007, (k - 1.5) * 0.3);
        this.mOsc('triangle', f * 2, t, 1.2, 0.02, (1.5 - k) * 0.3);
      });
      this.mOsc('sine', R / 2, t, 0.4, 0.16, 0);
    }
    if (p8 % 8 === 1) this.mOsc('sine', R / 2 * 2, t, 0.22, 0.13, 0);
    if (p8 % 2 === 1) this.mNoise(t, 0.05, 0.02, 7800, (p8 % 4 - 1.5) * 0.3);
    // sparkle arp inspired by the wheel
    const arp = [1, 1.5, 2, 3, 4][Math.floor(Math.random() * 5)];
    if ((p8 % 4 === 2 && Math.random() < 0.7) || (p8 % 8 === 6 && Math.random() < 0.4)) {
      const f = R * 2 * arp * (Math.random() < 0.3 ? 1.5 : 1);
      this.mOsc('triangle', f, t, 0.26, 0.055, Math.sin(t * 1.3) * 0.6);
    }
    if (p8 === 8 && Math.random() < 0.5) this.mOsc('sine', R * 3 * (1 + Math.random() * 0.02), t, 0.6, 0.03, -0.3);
  }
}
