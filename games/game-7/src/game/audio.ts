import type { WeaponDef } from './weapons';

// Musical scale frequencies (Lydian / Major Pentatonic hybrid) for festive hit/combo chimes
const COMBO_SCALE = [
  523.25, // C5
  587.33, // D5
  659.25, // E5
  739.99, // F#5
  783.99, // G5
  880.0,  // A5
  987.77, // B5
  1046.5, // C6
  1174.66, // D6
  1318.51, // E6
  1479.98, // F#6
  1567.98, // G6
  1760.0,  // A6
  2093.0,  // C7
];

class Sfx {
  ac: AudioContext | null = null;
  master: GainNode | null = null;
  comp: DynamicsCompressorNode | null = null;
  reverb: ConvolverNode | null = null;
  reverbGain: GainNode | null = null;
  noise: AudioBuffer | null = null;
  muted = false;
  bgmOn = false;
  private bgmTimer: number | null = null;
  private bgmStep = 0;
  private beamNodes: { osc: OscillatorNode[]; gain: GainNode; noise?: AudioBufferSourceNode } | null = null;
  private unlocked = false;

  constructor() {
    if (typeof window !== 'undefined') {
      const unlock = () => {
        this.init();
        if (this.ac && this.ac.state === 'running' && !this.unlocked) {
          this.unlocked = true;
        }
      };
      window.addEventListener('pointerdown', unlock, { passive: true });
      window.addEventListener('keydown', unlock, { passive: true });
      window.addEventListener('touchstart', unlock, { passive: true });
      window.addEventListener('click', unlock, { passive: true });
    }
  }

  init() {
    if (this.ac) {
      if (this.ac.state === 'suspended') {
        void this.ac.resume();
      }
      return;
    }
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;

    this.ac = new Ctx();
    if (this.ac.state === 'suspended') {
      void this.ac.resume();
    }

    // Master compressor for loud, punchy, studio-grade output without clipping
    this.comp = this.ac.createDynamicsCompressor();
    this.comp.threshold.value = -14;
    this.comp.knee.value = 12;
    this.comp.ratio.value = 4;
    this.comp.attack.value = 0.002;
    this.comp.release.value = 0.18;

    this.master = this.ac.createGain();
    this.master.gain.value = 0.92;

    // Stereo Hangar Reverb Convolver for lush, spacious 3D acoustics
    this.reverb = this.ac.createConvolver();
    this.reverb.buffer = this.makeReverbImpulse(1.35, 2.8);
    this.reverbGain = this.ac.createGain();
    this.reverbGain.gain.value = 0.28;

    this.master.connect(this.comp);
    this.master.connect(this.reverb);
    this.reverb.connect(this.reverbGain);
    this.reverbGain.connect(this.comp);
    this.comp.connect(this.ac.destination);

    // 2-second white/pink hybrid noise buffer
    const len = this.ac.sampleRate * 2;
    const buf = this.ac.createBuffer(1, len, this.ac.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      d[i] = Math.random() * 2 - 1;
    }
    this.noise = buf;
  }

  private ensure(): boolean {
    if (this.muted) return false;
    if (!this.ac) this.init();
    if (!this.ac) return false;
    if (this.ac.state === 'suspended') {
      void this.ac.resume();
    }
    return true;
  }

  private makeReverbImpulse(duration: number, decay: number): AudioBuffer {
    const rate = this.ac!.sampleRate;
    const len = Math.floor(rate * duration);
    const buf = this.ac!.createBuffer(2, len, rate);
    for (let ch = 0; ch < 2; ch++) {
      const data = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) {
        const t = i / len;
        const env = Math.pow(1 - t, decay);
        // Early reflections + diffuse tail
        const early = i < rate * 0.06 && i % 180 < 12 ? 1.5 : 1.0;
        data[i] = (Math.random() * 2 - 1) * env * early;
      }
    }
    return buf;
  }

  private noiseSrc(rate = 1) {
    if (!this.ac || !this.noise) return null;
    const s = this.ac.createBufferSource();
    s.buffer = this.noise;
    s.loop = true;
    s.playbackRate.value = rate * (0.85 + Math.random() * 0.3);
    return s;
  }

  /** Rich percussive noise + optional sub-bass thump */
  private shot(opts: {
    dur: number;
    peak: number;
    f0: number;
    f1: number;
    q?: number;
    type?: BiquadFilterType;
    thump?: number;
    delay?: number;
  }) {
    if (!this.ensure()) return;
    const now = this.ac!.currentTime + (opts.delay ?? 0);
    const n = this.noiseSrc();
    if (!n) return;

    const filt = this.ac!.createBiquadFilter();
    filt.type = opts.type ?? 'lowpass';
    filt.Q.value = opts.q ?? 1.2;
    filt.frequency.setValueAtTime(Math.max(40, opts.f0), now);
    filt.frequency.exponentialRampToValueAtTime(Math.max(40, opts.f1), now + opts.dur);

    const g = this.ac!.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(opts.peak, now + 0.003);
    g.gain.exponentialRampToValueAtTime(0.0001, now + opts.dur);

    n.connect(filt).connect(g).connect(this.master!);
    n.start(now);
    n.stop(now + opts.dur + 0.04);

    if (opts.thump) {
      const o = this.ac!.createOscillator();
      o.type = 'sine';
      o.frequency.setValueAtTime(opts.thump, now);
      o.frequency.exponentialRampToValueAtTime(34, now + opts.dur * 1.25);

      const g2 = this.ac!.createGain();
      g2.gain.setValueAtTime(0.0001, now);
      g2.gain.linearRampToValueAtTime(opts.peak * 0.95, now + 0.004);
      g2.gain.exponentialRampToValueAtTime(0.0001, now + opts.dur * 1.25);

      o.connect(g2).connect(this.master!);
      o.start(now);
      o.stop(now + opts.dur * 1.3);
    }
  }

  /** Expressive synth tone with pitch sweep & optional vibrato */
  private tone(opts: {
    type: OscillatorType;
    f0: number;
    f1: number;
    dur: number;
    peak: number;
    attack?: number;
    delay?: number;
    detune?: number;
  }) {
    if (!this.ensure()) return;
    const now = this.ac!.currentTime + (opts.delay ?? 0);
    const atk = opts.attack ?? 0.005;
    const o = this.ac!.createOscillator();
    o.type = opts.type;
    if (opts.detune) o.detune.value = opts.detune;
    o.frequency.setValueAtTime(Math.max(24, opts.f0), now);
    o.frequency.exponentialRampToValueAtTime(Math.max(24, opts.f1), now + opts.dur);

    const g = this.ac!.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(opts.peak, now + atk);
    g.gain.exponentialRampToValueAtTime(0.0001, now + Math.max(atk + 0.01, opts.dur));

    o.connect(g).connect(this.master!);
    o.start(now);
    o.stop(now + opts.dur + 0.04);
  }

  /** Play a crisp musical note (for UI, combos, fanfare, BGM) */
  private note(
    freq: number,
    dur: number,
    peak = 0.16,
    type: OscillatorType = 'triangle',
    delay = 0,
  ) {
    if (!this.ensure()) return;
    const now = this.ac!.currentTime + delay;
    const o1 = this.ac!.createOscillator();
    const o2 = this.ac!.createOscillator();
    o1.type = type;
    o2.type = 'sine';
    o1.frequency.setValueAtTime(freq, now);
    o2.frequency.setValueAtTime(freq * 2, now); // octave shimmer
    o1.detune.value = -4;
    o2.detune.value = 4;

    const g = this.ac!.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(peak, now + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);

    const g2 = this.ac!.createGain();
    g2.gain.value = 0.35;

    o1.connect(g);
    o2.connect(g2).connect(g);
    g.connect(this.master!);

    o1.start(now);
    o2.start(now);
    o1.stop(now + dur + 0.03);
    o2.stop(now + dur + 0.03);
  }

  /** Weapon equip / select signature sound */
  select(w?: WeaponDef) {
    if (!this.ensure()) return;
    if (!w) {
      this.note(880, 0.12, 0.14, 'triangle', 0);
      this.note(1318.5, 0.18, 0.14, 'triangle', 0.05);
      return;
    }
    switch (w.id) {
      case 'caster':
        // Predator Yautja trilling clicks + laser sight activation chime
        for (let i = 0; i < 4; i++) {
          this.shot({ dur: 0.03, peak: 0.22, f0: 3600, f1: 1200, type: 'bandpass', q: 5, delay: i * 0.045 });
        }
        this.tone({ type: 'sine', f0: 1800, f1: 2700, dur: 0.18, peak: 0.18, delay: 0.16 });
        this.tone({ type: 'triangle', f0: 240, f1: 520, dur: 0.25, peak: 0.2, delay: 0.05 });
        break;
      case 'bow':
        // Recurve bow string pluck
        this.tone({ type: 'triangle', f0: 190, f1: 140, dur: 0.28, peak: 0.26 });
        this.shot({ dur: 0.1, peak: 0.15, f0: 3200, f1: 900, type: 'bandpass', q: 2 });
        break;
      case 'dragon':
        // Dragon low growl + flame ignition
        this.tone({ type: 'sawtooth', f0: 140, f1: 75, dur: 0.38, peak: 0.25 });
        this.shot({ dur: 0.35, peak: 0.28, f0: 1400, f1: 320, thump: 95 });
        break;
      case 'sword':
        // Halo Energy Sword iconic plasma ignition hiss-chime
        this.note(1046.5, 0.35, 0.2, 'sine', 0);
        this.note(1567.98, 0.4, 0.18, 'triangle', 0.04);
        this.shot({ dur: 0.32, peak: 0.28, f0: 5400, f1: 1200, type: 'bandpass', q: 1.8 });
        break;
      case 'proton':
        // Ghostbusters Proton Pack iconic cyclotron startup whine
        this.tone({ type: 'sawtooth', f0: 110, f1: 880, dur: 0.55, peak: 0.22, attack: 0.04 });
        this.tone({ type: 'sine', f0: 220, f1: 1760, dur: 0.55, peak: 0.16, attack: 0.04 });
        break;
      case 'ak':
      case 'rifle':
      case 'mp5':
      case 'beretta':
        // Crisp metallic bolt rack (chhk-chhk!)
        this.shot({ dur: 0.055, peak: 0.28, f0: 6500, f1: 1800, type: 'bandpass', q: 3.2, delay: 0 });
        this.shot({ dur: 0.07, peak: 0.32, f0: 8200, f1: 2200, type: 'bandpass', q: 2.8, delay: 0.08 });
        break;
      default:
        // Sci-fi weapon power-on arpeggio
        this.note(659.25, 0.12, 0.15, 'triangle', 0);
        this.note(987.77, 0.14, 0.15, 'triangle', 0.05);
        this.note(1318.51, 0.22, 0.18, 'sine', 0.1);
        break;
    }
  }

  /** Weapon firing sound — multi-layered & punchy */
  fire(w: WeaponDef) {
    if (!this.ensure()) return;
    switch (w.id) {
      case 'bow':
        // Bowstring twang + whistling arrow whoosh
        this.shot({ dur: 0.18, peak: 0.48, f0: 5600, f1: 850, type: 'bandpass', q: 1.8, thump: 165 });
        this.tone({ type: 'triangle', f0: 230, f1: 115, dur: 0.22, peak: 0.32 });
        this.tone({ type: 'sine', f0: 1400, f1: 620, dur: 0.14, peak: 0.12, delay: 0.02 });
        break;
      case 'ak':
        // Heavy 7.62x39mm bark + metallic receiver clack + deep chest thump
        this.shot({ dur: 0.28, peak: 0.78, f0: 4800, f1: 220, thump: 135 });
        this.shot({ dur: 0.06, peak: 0.45, f0: 8500, f1: 2800, type: 'bandpass', q: 2.5 });
        this.tone({ type: 'sawtooth', f0: 190, f1: 55, dur: 0.16, peak: 0.32 });
        break;
      case 'rifle':
        // Suppressed 5.56mm tactical crack-thump
        this.shot({ dur: 0.2, peak: 0.62, f0: 3800, f1: 380, thump: 170 });
        this.shot({ dur: 0.05, peak: 0.38, f0: 9200, f1: 3200, type: 'bandpass', q: 3 });
        break;
      case 'mp5':
        // Crisp 9mm submachine pop
        this.shot({ dur: 0.15, peak: 0.54, f0: 4400, f1: 580, thump: 195 });
        this.shot({ dur: 0.04, peak: 0.3, f0: 7800, f1: 2600, type: 'bandpass', q: 2.5 });
        break;
      case 'beretta':
        // Sharp 9mm pistol crack + slide snap
        this.shot({ dur: 0.22, peak: 0.66, f0: 5200, f1: 380, thump: 175 });
        this.shot({ dur: 0.05, peak: 0.35, f0: 8800, f1: 3000, type: 'bandpass', q: 2.8, delay: 0.03 });
        break;
      case 'dragon':
        // Roaring dragon breath shotgun blast + fireballs
        this.shot({ dur: 0.58, peak: 0.85, f0: 2200, f1: 140, thump: 88 });
        this.shot({ dur: 0.42, peak: 0.5, f0: 5400, f1: 600, type: 'bandpass', q: 1.2, delay: 0.04 });
        this.tone({ type: 'sawtooth', f0: 340, f1: 52, dur: 0.52, peak: 0.34 });
        this.tone({ type: 'triangle', f0: 180, f1: 42, dur: 0.58, peak: 0.38 });
        break;
      case 'rifleElectro':
      case 'mp5Electro':
        // Electro-plasma bolt snap + high-voltage chirp
        this.tone({ type: 'sawtooth', f0: 1900, f1: 190, dur: 0.19, peak: 0.34 });
        this.tone({ type: 'square', f0: 2800, f1: 420, dur: 0.12, peak: 0.2 });
        this.shot({ dur: 0.16, peak: 0.42, f0: 7200, f1: 1100, type: 'bandpass', q: 2.4, thump: 160 });
        break;
      case 'caster':
        // Predator Shoulder Caster: Iconic Yautja Plasma Cannon shriek + massive sub-bass boom!
        this.tone({ type: 'sawtooth', f0: 2400, f1: 120, dur: 0.52, peak: 0.46 });
        this.tone({ type: 'square', f0: 1650, f1: 85, dur: 0.44, peak: 0.28, detune: 14 });
        this.tone({ type: 'sine', f0: 340, f1: 42, dur: 0.68, peak: 0.58 });
        this.shot({ dur: 0.58, peak: 0.72, f0: 5600, f1: 160, thump: 82 });
        this.note(1318.5, 0.22, 0.2, 'sine', 0.01);
        break;
      case 'sniper':
        // Massive hitscan particle beam crack
        this.tone({ type: 'sawtooth', f0: 2800, f1: 95, dur: 0.52, peak: 0.44 });
        this.shot({ dur: 0.62, peak: 0.82, f0: 6800, f1: 150, thump: 95 });
        this.note(1567.98, 0.3, 0.22, 'triangle', 0);
        break;
      case 'sword':
        // Twin plasma blade slash whoosh + harmonic ring
        this.shot({ dur: 0.32, peak: 0.52, f0: 900, f1: 5800, type: 'bandpass', q: 2.0, thump: 140 });
        this.tone({ type: 'sawtooth', f0: 380, f1: 1680, dur: 0.26, peak: 0.28 });
        this.note(1174.66, 0.24, 0.18, 'sine', 0.02);
        break;
      case 'disc':
        // Tron Identity Disc digital synth blade throw
        this.tone({ type: 'square', f0: 680, f1: 1720, dur: 0.22, peak: 0.26 });
        this.note(1046.5, 0.18, 0.18, 'triangle', 0);
        this.note(1567.98, 0.22, 0.18, 'sine', 0.04);
        this.shot({ dur: 0.18, peak: 0.28, f0: 6400, f1: 1800, type: 'bandpass', q: 3 });
        break;
      case 'repulsor':
        // Iron Man palm repulsor blast: high-tech punch + golden harmonic ring
        this.tone({ type: 'sawtooth', f0: 2200, f1: 160, dur: 0.42, peak: 0.38 });
        this.tone({ type: 'sine', f0: 260, f1: 52, dur: 0.48, peak: 0.48 });
        this.shot({ dur: 0.44, peak: 0.58, f0: 6200, f1: 420, thump: 105 });
        this.note(1760, 0.25, 0.2, 'sine', 0);
        break;
      case 'phaser':
        this.tone({ type: 'sawtooth', f0: 1400, f1: 620, dur: 0.35, peak: 0.28 });
        break;
      case 'tripod':
        this.shot({ dur: 0.65, peak: 0.55, f0: 3400, f1: 280, type: 'bandpass', q: 1.2, thump: 75 });
        this.tone({ type: 'sawtooth', f0: 240, f1: 82, dur: 0.65, peak: 0.32 });
        break;
      /* ---- legendary tier ---- */
      case 'singularity':
        // Deep void implosion + sub-bass drop + cosmic shimmer
        this.tone({ type: 'sine', f0: 480, f1: 36, dur: 1.1, peak: 0.62 });
        this.tone({ type: 'triangle', f0: 95, f1: 740, dur: 0.52, peak: 0.28 });
        this.shot({ dur: 0.9, peak: 0.58, f0: 900, f1: 95, thump: 58 });
        this.note(587.33, 0.45, 0.2, 'sine', 0.08);
        break;
      case 'tesla':
        this.shot({ dur: 0.2, peak: 0.5, f0: 9200, f1: 2400, type: 'bandpass', q: 2.4 });
        this.tone({ type: 'square', f0: 2600, f1: 820, dur: 0.16, peak: 0.24 });
        break;
      case 'railgun':
        // Hypersonic Mach crack + electromagnetic rail discharge
        this.tone({ type: 'sawtooth', f0: 3600, f1: 180, dur: 0.32, peak: 0.44 });
        this.shot({ dur: 0.8, peak: 0.88, f0: 7400, f1: 140, thump: 74 });
        this.shot({ dur: 0.32, peak: 0.5, f0: 9800, f1: 3200, type: 'bandpass', q: 1.6 });
        break;
      case 'prism':
        // Shimmering 7-beam rainbow chord + laser lance
        this.note(1046.5, 0.35, 0.2, 'triangle', 0);
        this.note(1318.5, 0.38, 0.2, 'triangle', 0.03);
        this.note(1567.98, 0.42, 0.2, 'sine', 0.06);
        this.note(2093.0, 0.48, 0.22, 'sine', 0.09);
        this.shot({ dur: 0.36, peak: 0.48, f0: 8800, f1: 2400, type: 'bandpass', q: 2.4, thump: 125 });
        break;
      case 'nanite':
        this.shot({ dur: 0.32, peak: 0.56, f0: 1400, f1: 220, thump: 140 });
        this.tone({ type: 'square', f0: 1400, f1: 2800, dur: 0.18, peak: 0.2 });
        break;
      case 'chrono':
        // Clockwork chime + time-warp pitch bend
        this.note(1174.66, 0.3, 0.22, 'triangle', 0);
        this.note(880, 0.35, 0.2, 'sine', 0.05);
        this.tone({ type: 'triangle', f0: 2600, f1: 280, dur: 0.65, peak: 0.32 });
        this.shot({ dur: 0.42, peak: 0.4, f0: 5400, f1: 800, type: 'bandpass', q: 1.8, thump: 110 });
        break;
      case 'cryo':
        this.shot({ dur: 0.42, peak: 0.42, f0: 7800, f1: 2400, type: 'bandpass', q: 1.4 });
        this.note(1760, 0.28, 0.18, 'sine', 0);
        break;
      case 'sonic':
        // Acoustic bass cannon boom + harmonic ring
        this.tone({ type: 'sine', f0: 185, f1: 42, dur: 0.58, peak: 0.68 });
        this.shot({ dur: 0.36, peak: 0.56, f0: 2600, f1: 280, thump: 92 });
        this.note(440, 0.25, 0.22, 'triangle', 0);
        break;
      case 'quantum':
        this.note(880, 0.3, 0.2, 'sine', 0);
        this.note(1318.5, 0.32, 0.2, 'triangle', 0.04);
        this.tone({ type: 'sawtooth', f0: 1760, f1: 440, dur: 0.38, peak: 0.28 });
        this.shot({ dur: 0.3, peak: 0.42, f0: 6600, f1: 1800, type: 'bandpass', q: 2.2, thump: 120 });
        break;
      case 'acid':
        this.shot({ dur: 0.35, peak: 0.45, f0: 6200, f1: 1800, type: 'bandpass', q: 1.2 });
        this.tone({ type: 'sawtooth', f0: 460, f1: 160, dur: 0.24, peak: 0.2 });
        break;
      case 'buster':
        // Classic Mega Buster crisp arcade shot
        this.tone({ type: 'square', f0: 1850, f1: 540, dur: 0.14, peak: 0.34 });
        this.tone({ type: 'triangle', f0: 920, f1: 220, dur: 0.16, peak: 0.28 });
        this.shot({ dur: 0.12, peak: 0.32, f0: 7200, f1: 2200, type: 'bandpass', q: 2.4, thump: 160 });
        break;
      default:
        this.shot({ dur: 0.24, peak: 0.58, f0: 3600, f1: 380, thump: 140 });
    }
  }

  /** Target impact sound + musical combo chime */
  impact(kind: string, combo = 0) {
    if (!this.ensure()) return;

    // Play rising musical chime when hitting the wheel to make hits feel festive & rewarding!
    if (combo > 0) {
      const idx = (combo - 1) % COMBO_SCALE.length;
      const freq = COMBO_SCALE[idx];
      this.note(freq, 0.18, 0.15, 'triangle', 0);
      if (combo >= 3) {
        this.note(freq * 1.25, 0.22, 0.11, 'sine', 0.03);
      }
    }

    switch (kind) {
      case 'arrow':
        // Deep wooden/target thunk
        this.shot({ dur: 0.22, peak: 0.52, f0: 1600, f1: 180, thump: 135 });
        this.tone({ type: 'triangle', f0: 180, f1: 75, dur: 0.16, peak: 0.32 });
        break;
      case 'metal':
        // Metallic bullet impact + ricochet ping
        this.shot({ dur: 0.14, peak: 0.42, f0: 7600, f1: 1500, type: 'bandpass', q: 2.2, thump: 145 });
        if (Math.random() < 0.45) {
          const pingF = 1800 + Math.random() * 1600;
          this.tone({ type: 'sine', f0: pingF, f1: pingF * 0.65, dur: 0.18, peak: 0.16, delay: 0.02 });
        }
        break;
      case 'plasma':
        this.tone({ type: 'square', f0: 1150, f1: 210, dur: 0.18, peak: 0.28 });
        this.shot({ dur: 0.16, peak: 0.34, f0: 5400, f1: 900, thump: 130 });
        break;
      case 'fire':
        this.shot({ dur: 0.36, peak: 0.48, f0: 1800, f1: 180, thump: 110 });
        break;
      case 'heavy':
        // Predator Shoulder Caster massive plasma detonation!
        this.shot({ dur: 0.78, peak: 0.82, f0: 2400, f1: 75, thump: 65 });
        this.tone({ type: 'sawtooth', f0: 620, f1: 48, dur: 0.62, peak: 0.42 });
        this.tone({ type: 'sine', f0: 190, f1: 34, dur: 0.82, peak: 0.58 });
        break;
      case 'slash':
        this.shot({ dur: 0.28, peak: 0.5, f0: 1100, f1: 4800, type: 'bandpass', q: 2, thump: 125 });
        break;
      case 'void':
        this.tone({ type: 'sine', f0: 340, f1: 32, dur: 1.2, peak: 0.62 });
        this.shot({ dur: 1.1, peak: 0.72, f0: 1600, f1: 70, thump: 52 });
        break;
      case 'arc':
        this.shot({ dur: 0.22, peak: 0.44, f0: 8400, f1: 1800, type: 'bandpass', q: 2.2 });
        this.tone({ type: 'square', f0: 1800, f1: 420, dur: 0.18, peak: 0.22 });
        break;
      case 'rail':
        this.shot({ dur: 0.9, peak: 0.85, f0: 1800, f1: 65, thump: 58 });
        this.shot({ dur: 0.28, peak: 0.48, f0: 9200, f1: 2400, type: 'bandpass', q: 1.5 });
        break;
      case 'prism':
        this.shot({ dur: 0.32, peak: 0.46, f0: 9600, f1: 2200, type: 'bandpass', q: 2.6 });
        this.note(1567.98, 0.28, 0.22, 'sine', 0);
        this.note(2093.0, 0.32, 0.2, 'triangle', 0.04);
        break;
      case 'nano':
        this.shot({ dur: 0.36, peak: 0.45, f0: 1800, f1: 240, thump: 115 });
        this.shot({ dur: 0.22, peak: 0.28, f0: 7200, f1: 2400, type: 'bandpass', q: 2.8 });
        break;
      case 'chrono':
        this.tone({ type: 'triangle', f0: 3400, f1: 220, dur: 0.9, peak: 0.36 });
        this.shot({ dur: 0.75, peak: 0.62, f0: 1100, f1: 68, thump: 64 });
        this.note(880, 0.45, 0.22, 'sine', 0);
        break;
      case 'freeze':
        this.shot({ dur: 0.36, peak: 0.44, f0: 8800, f1: 2800, type: 'bandpass', q: 2.4 });
        this.note(2093.0, 0.24, 0.2, 'sine', 0);
        break;
      case 'shatter':
        this.tone({ type: 'sine', f0: 210, f1: 36, dur: 0.95, peak: 0.64 });
        this.shot({ dur: 0.7, peak: 0.62, f0: 2200, f1: 150, thump: 72 });
        break;
      case 'collapse':
        this.tone({ type: 'sine', f0: 1320, f1: 440, dur: 0.5, peak: 0.34 });
        this.tone({ type: 'triangle', f0: 1328, f1: 220, dur: 0.55, peak: 0.28 });
        this.shot({ dur: 0.6, peak: 0.58, f0: 1600, f1: 85, thump: 76 });
        break;
      case 'acid':
        this.shot({ dur: 0.48, peak: 0.42, f0: 5400, f1: 1400, type: 'bandpass', q: 1.6 });
        this.tone({ type: 'triangle', f0: 920, f1: 240, dur: 0.34, peak: 0.18 });
        break;
      case 'buster':
        this.tone({ type: 'square', f0: 1200, f1: 220, dur: 0.22, peak: 0.32 });
        this.shot({ dur: 0.32, peak: 0.52, f0: 3800, f1: 420, thump: 135 });
        break;
      case 'laser':
      case 'ash':
      case 'proton':
        this.shot({ dur: 0.22, peak: 0.34, f0: 4400, f1: 680, type: 'bandpass', q: 1.4, thump: 120 });
        break;
    }
  }

  beamStart(w: WeaponDef) {
    if (!this.ensure() || this.beamNodes) return;
    const base =
      w.id === 'acid'
        ? 620
        : w.id === 'cryo'
          ? 1800
          : w.id === 'tesla'
            ? 1350
            : w.id === 'tripod'
              ? 280
              : w.id === 'proton'
                ? 165
                : w.id === 'phaser'
                  ? 880
                  : 520;

    const g = this.ac!.createGain();
    g.gain.value = 0.0001;
    g.gain.linearRampToValueAtTime(0.24, this.ac!.currentTime + 0.06);

    const filt = this.ac!.createBiquadFilter();
    filt.type = 'lowpass';
    filt.frequency.value = w.id === 'tesla' ? 6400 : w.id === 'cryo' ? 7600 : 3200;
    g.connect(filt).connect(this.master!);

    const osc: OscillatorNode[] = [];
    for (const [type, det] of [
      ['sawtooth', 0],
      ['sawtooth', 14],
      ['triangle', -12],
    ] as [OscillatorType, number][]) {
      const o = this.ac!.createOscillator();
      o.type = type;
      o.frequency.value = base;
      o.detune.value = det;
      o.connect(g);
      o.start();
      osc.push(o);

      const lfo = this.ac!.createOscillator();
      lfo.frequency.value = 8 + Math.random() * 6;
      const lg = this.ac!.createGain();
      lg.gain.value = base * 0.07;
      lfo.connect(lg).connect(o.frequency);
      lfo.start();
      osc.push(lfo);
    }

    // Add crackling noise layer for continuous beams
    const n = this.noiseSrc(1.1);
    if (n) {
      const nf = this.ac!.createBiquadFilter();
      nf.type = 'bandpass';
      nf.frequency.value = w.id === 'acid' ? 3200 : w.id === 'tesla' ? 5800 : 2400;
      nf.Q.value = 1.8;
      const ng = this.ac!.createGain();
      ng.gain.value = 0.35;
      n.connect(nf).connect(ng).connect(g);
      n.start();
    }

    this.beamNodes = { osc, gain: g, noise: n ?? undefined };
  }

  beamStop() {
    if (!this.ac || !this.beamNodes) return;
    const { osc, gain, noise } = this.beamNodes;
    const t = this.ac.currentTime;
    gain.gain.cancelScheduledValues(t);
    gain.gain.setValueAtTime(Math.max(0.0001, gain.gain.value), t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
    osc.forEach((o) => {
      try {
        o.stop(t + 0.15);
      } catch {
        // ignore
      }
    });
    if (noise) {
      try {
        noise.stop(t + 0.15);
      } catch {
        // ignore
      }
    }
    this.beamNodes = null;
  }

  /** Weapon-specific charge-up synthesis */
  charge(up = true, w?: WeaponDef) {
    if (!this.ensure()) return;
    const dur = w?.chargeTime ?? 0.6;

    if (w?.id === 'caster') {
      // Predator Shoulder Caster: 3 iconic red-laser lock-on beeps + rising plasma turbine!
      this.note(2200, 0.08, 0.22, 'sine', 0.0);
      this.note(2600, 0.08, 0.24, 'sine', 0.14);
      this.note(3100, 0.12, 0.28, 'sine', 0.28);
      this.tone({ type: 'sawtooth', f0: 180, f1: 1680, dur, peak: 0.26, attack: 0.04 });
      this.tone({ type: 'sine', f0: 320, f1: 2400, dur, peak: 0.24, attack: 0.04 });
      return;
    }

    if (w?.id === 'repulsor') {
      // Iron Man palm repulsor turbine whine
      this.tone({ type: 'sine', f0: 240, f1: 2800, dur, peak: 0.28, attack: 0.03 });
      this.tone({ type: 'triangle', f0: 480, f1: 3600, dur, peak: 0.2, attack: 0.03 });
      return;
    }

    if (w?.id === 'buster') {
      // Mega Buster arcade rising charge
      this.tone({ type: 'square', f0: 260, f1: 1480, dur, peak: 0.2, attack: 0.03 });
      this.tone({ type: 'triangle', f0: 520, f1: 2200, dur, peak: 0.22, attack: 0.03 });
      return;
    }

    this.tone({
      type: 'sine',
      f0: up ? 220 : 1400,
      f1: up ? 1680 : 220,
      dur,
      peak: 0.26,
      attack: 0.03,
    });
    this.tone({
      type: 'triangle',
      f0: up ? 110 : 700,
      f1: up ? 840 : 110,
      dur,
      peak: 0.18,
      attack: 0.03,
    });
  }

  /** Small brass tick when a shell casing hits the deck */
  tick() {
    if (!this.ensure()) return;
    this.shot({ dur: 0.06, peak: 0.16, f0: 9200, f1: 4200, type: 'bandpass', q: 5 });
    this.tone({ type: 'triangle', f0: 2800, f1: 1500, dur: 0.05, peak: 0.08 });
  }

  /** Knife-Hit style projectile clash! */
  clash() {
    if (!this.ensure()) return;
    this.shot({ dur: 0.34, peak: 0.65, f0: 9200, f1: 1100, type: 'bandpass', q: 1.4, thump: 120 });
    this.tone({ type: 'square', f0: 2100, f1: 280, dur: 0.28, peak: 0.32 });
    this.tone({ type: 'sawtooth', f0: 320, f1: 85, dur: 0.32, peak: 0.3 });
  }

  /** Wheel Destroyed! Massive explosion + triumphant celebratory fanfare chord */
  boom() {
    if (!this.ensure()) return;
    // 1. Massive explosion + sub-bass shockwave
    this.shot({ dur: 1.25, peak: 0.92, f0: 1400, f1: 55, thump: 52 });
    this.shot({ dur: 0.65, peak: 0.58, f0: 6400, f1: 420, type: 'bandpass', q: 1.2, delay: 0.04 });
    this.tone({ type: 'sine', f0: 160, f1: 28, dur: 1.2, peak: 0.72 });

    // 2. Celebratory triumphant arcade fanfare arpeggio (C major 9th!)
    const chord = [523.25, 659.25, 783.99, 987.77, 1174.66, 1567.98];
    chord.forEach((f, i) => {
      this.note(f, 0.55, 0.22, i % 2 === 0 ? 'triangle' : 'sine', 0.06 + i * 0.055);
    });
  }

  /** Toggle festive Sci-Fi Synthwave Range BGM */
  toggleBgm(on?: boolean): boolean {
    this.ensure();
    this.bgmOn = on ?? !this.bgmOn;
    if (this.bgmTimer !== null) {
      window.clearInterval(this.bgmTimer);
      this.bgmTimer = null;
    }
    if (this.bgmOn) {
      this.bgmStep = 0;
      const bassProg = [
        130.81, 130.81, 196.0, 130.81, // C3
        174.61, 174.61, 220.0, 174.61, // F3
        196.0, 196.0, 246.94, 196.0,   // G3
        146.83, 164.81, 196.0, 246.94, // D3 -> E3 -> G3 -> B3
      ];
      const arpProg = [
        523.25, 659.25, 783.99, 1046.5,
        698.46, 880.0, 1046.5, 1396.91,
        783.99, 987.77, 1174.66, 1567.98,
        587.33, 739.99, 880.0, 1174.66,
      ];
      this.bgmTimer = window.setInterval(() => {
        if (this.muted || !this.bgmOn || !this.ac || this.ac.state !== 'running') return;
        const step = this.bgmStep % 16;
        // Synthwave bass pulse
        const bf = bassProg[step];
        this.tone({ type: 'sawtooth', f0: bf, f1: bf * 0.99, dur: 0.16, peak: 0.11, attack: 0.008 });
        // Shimmering arpeggio
        const af = arpProg[step];
        this.note(af, 0.18, 0.075, 'triangle', 0);
        // Crisp hi-hat on off-beats
        if (step % 2 === 1) {
          this.shot({ dur: 0.04, peak: 0.06, f0: 9500, f1: 6000, type: 'highpass', q: 1 });
        }
        // Kick on 0, 4, 8, 12
        if (step % 4 === 0) {
          this.tone({ type: 'sine', f0: 130, f1: 38, dur: 0.15, peak: 0.18, attack: 0.003 });
        }
        this.bgmStep++;
      }, 135);
    }
    return this.bgmOn;
  }
}

export const sfx = new Sfx();
