class SoundEngine {
  private ctx: AudioContext | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  public muted: boolean = false;

  private ensureContext(): AudioContext | null {
    if (this.muted) return null;
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx =
        window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    if (this.ctx && !this.noiseBuffer) {
      const bufferSize = this.ctx.sampleRate * 1.2;
      this.noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = this.noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
    }
    return this.ctx;
  }

  /**
   * Fires the heavy DOOM Obliterator Gun: sub-bass thump + plasma zap + mechanical slide clack
   */
  private tone(
    type: OscillatorType,
    f0: number,
    f1: number,
    gain: number,
    start: number,
    dur: number
  ) {
    const ctx = this.ctx;
    if (!ctx) return;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, start);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), start + dur);
    g.gain.setValueAtTime(gain, start);
    g.gain.exponentialRampToValueAtTime(0.001, start + dur);
    o.connect(g).connect(ctx.destination);
    o.start(start);
    o.stop(start + dur + 0.02);
  }

  private noise(
    filterType: BiquadFilterType,
    f0: number,
    f1: number,
    gain: number,
    start: number,
    dur: number
  ) {
    const ctx = this.ctx;
    if (!ctx || !this.noiseBuffer) return;
    const n = ctx.createBufferSource();
    n.buffer = this.noiseBuffer;
    const f = ctx.createBiquadFilter();
    f.type = filterType;
    f.frequency.setValueAtTime(f0, start);
    f.frequency.exponentialRampToValueAtTime(Math.max(30, f1), start + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, start);
    g.gain.exponentialRampToValueAtTime(0.001, start + dur);
    n.connect(f).connect(g).connect(ctx.destination);
    n.start(start);
    n.stop(start + dur + 0.02);
  }

  public playShoot(isOverdrive = false, kind?: string) {
    const ctx = this.ensureContext();
    if (!ctx || !this.noiseBuffer) return;
    const now = ctx.currentTime;

    if (kind === 'pistol') {
      // Sharp .50 crack + body thump + slide clack
      this.noise('highpass', 2600, 800, 0.5, now, 0.08);
      this.tone('triangle', 190, 50, 0.45, now, 0.12);
      this.noise('lowpass', 1200, 200, 0.3, now, 0.25);
      this.tone('square', 1500, 900, 0.05, now + 0.09, 0.03);
      return;
    }
    if (kind === 'banana') {
      // Boing + fruit splat
      this.tone('sine', 280, 95, 0.3, now, 0.18);
      this.tone('sine', 95, 140, 0.2, now + 0.14, 0.1);
      this.noise('lowpass', 700, 200, 0.3, now, 0.12);
      return;
    }
    if (kind === 'beehive') {
      // Bzzzt swarm buzz + tick
      this.tone('sawtooth', 185, 200, 0.1, now, 0.24);
      this.tone('sawtooth', 232, 245, 0.08, now, 0.24);
      this.tone('sine', 1300, 900, 0.05, now + 0.05, 0.06);
      this.noise('bandpass', 2500, 2200, 0.1, now, 0.18);
      return;
    }
    if (kind === 'bubble') {
      // Ploop + pop
      this.tone('sine', 380, 640, 0.22, now, 0.13);
      this.tone('sine', 950, 1400, 0.06, now + 0.1, 0.05);
      this.noise('highpass', 3000, 5000, 0.05, now + 0.1, 0.05);
      return;
    }
    if (kind === 'confetti') {
      // Party pop + sparkly tinkle
      this.noise('highpass', 4000, 1200, 0.3, now, 0.07);
      this.tone('sine', 1568, 1560, 0.08, now + 0.02, 0.14);
      this.tone('sine', 2093, 2090, 0.07, now + 0.06, 0.13);
      this.tone('sine', 2637, 2630, 0.06, now + 0.1, 0.12);
      return;
    }
    if (kind === 'crystal') {
      // Crystal chime arpeggio + glass ping
      this.tone('sine', 1318.5, 1310, 0.14, now, 0.16);
      this.tone('sine', 1760, 1750, 0.1, now + 0.05, 0.14);
      this.tone('sine', 2093, 2085, 0.08, now + 0.1, 0.13);
      this.tone('sine', 3136, 3100, 0.04, now + 0.12, 0.22);
      this.tone('triangle', 320, 200, 0.1, now, 0.08);
      return;
    }
    if (kind === 'rifle') {
      // Supersonic sniper CRACK + long rolling echo + bolt cycle
      this.noise('highpass', 4200, 1400, 0.55, now, 0.06);
      this.tone('sawtooth', 220, 45, 0.4, now, 0.18);
      this.noise('lowpass', 1400, 120, 0.3, now + 0.02, 0.7);
      this.tone('sine', 1800, 600, 0.06, now, 0.25);
      this.noise('bandpass', 2200, 2000, 0.18, now + 0.32, 0.04);
      this.noise('bandpass', 1600, 1500, 0.18, now + 0.42, 0.05);
      return;
    }
    if (kind === 'revolver') {
      // Heavy magnum boom + metallic ring
      this.noise('bandpass', 3000, 600, 0.55, now, 0.12);
      this.tone('sawtooth', 140, 40, 0.42, now, 0.22);
      this.noise('lowpass', 900, 150, 0.35, now, 0.4);
      this.tone('sine', 2200, 2100, 0.05, now + 0.05, 0.3);
      return;
    }
    if (kind === 'shotgun') {
      // Massive double-barrel BOOM + chk-chk
      this.noise('lowpass', 2400, 120, 0.7, now, 0.42);
      this.tone('sawtooth', 110, 30, 0.55, now, 0.35);
      this.noise('highpass', 3000, 1500, 0.3, now, 0.06);
      this.noise('bandpass', 1800, 1600, 0.22, now + 0.3, 0.04);
      this.noise('bandpass', 1400, 1300, 0.22, now + 0.38, 0.05);
      return;
    }
    if (kind === 'rainbow') {
      // Shimmering celestial arpeggio + soft magic thump
      this.tone('triangle', 140, 50, 0.32, now, 0.16);
      const notes = isOverdrive ? [1046, 1318, 1568, 2093, 2637] : [1318, 1568, 2093];
      notes.forEach((f, i) => this.tone('sine', f, f * 1.01, 0.12, now + i * 0.03, 0.22));
      this.noise('highpass', 6000, 9000, 0.08, now, 0.18);
      return;
    }
    if (kind === 'water') {
      // Pressurised FSSSHH + deep bloop + bubble blips
      this.noise('bandpass', 1400, 320, 0.32, now, isOverdrive ? 0.38 : 0.24);
      this.tone('sine', 320, 110, 0.3, now, 0.14);
      this.tone('sine', 620, 1250, 0.08, now + 0.06, 0.06);
      this.tone('sine', 800, 1500, 0.06, now + 0.11, 0.05);
      return;
    }
    if (kind === 'snow') {
      // Soft POMF + crisp ice tinkle
      this.noise('lowpass', 900, 200, 0.4, now, 0.16);
      this.tone('triangle', 150, 55, 0.3, now, 0.14);
      this.tone('sine', 2637, 2600, 0.06, now + 0.04, 0.18);
      this.tone('sine', 3520, 3480, 0.045, now + 0.07, 0.16);
      if (isOverdrive) this.noise('bandpass', 3000, 800, 0.2, now, 0.4);
      return;
    }

    // 1. Sub-bass chest punch
    const sub = ctx.createOscillator();
    const subGain = ctx.createGain();
    sub.type = 'triangle';
    sub.frequency.setValueAtTime(isOverdrive ? 135 : 105, now);
    sub.frequency.exponentialRampToValueAtTime(28, now + (isOverdrive ? 0.28 : 0.14));
    subGain.gain.setValueAtTime(isOverdrive ? 0.55 : 0.38, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + (isOverdrive ? 0.3 : 0.16));
    sub.connect(subGain).connect(ctx.destination);
    sub.start(now);
    sub.stop(now + 0.32);

    // 2. High-energy DOOM plasma rail chirp
    const rail = ctx.createOscillator();
    const railGain = ctx.createGain();
    rail.type = 'sawtooth';
    rail.frequency.setValueAtTime(isOverdrive ? 920 : 620, now);
    rail.frequency.exponentialRampToValueAtTime(isOverdrive ? 140 : 185, now + 0.11);
    railGain.gain.setValueAtTime(0.18, now);
    railGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    rail.connect(railGain).connect(ctx.destination);
    rail.start(now);
    rail.stop(now + 0.14);

    // 3. Hydraulic recoil vent hiss / snap
    const noise = ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1900, now);
    filter.frequency.exponentialRampToValueAtTime(450, now + 0.09);
    const nGain = ctx.createGain();
    nGain.gain.setValueAtTime(0.18, now);
    nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    noise.connect(filter).connect(nGain).connect(ctx.destination);
    noise.start(now);
    noise.stop(now + 0.11);
  }

  /**
   * Bolt slams cleanly into the rotating circular target!
   * Pitch rises slightly with combo count for awesome arcade dopamine!
   */
  public playEmbedHit(combo = 0, nearMiss = false, kind?: string) {
    const ctx = this.ensureContext();
    if (!ctx || !this.noiseBuffer) return;
    const now = ctx.currentTime;

    const pitchScale = Math.min(1.65, 1 + combo * 0.055);

    if (kind === 'crystal') {
      // Glassy chime stack, brighter with combo
      this.tone('sine', 2093 * pitchScale, 2080, 0.13, now, 0.2);
      this.tone('sine', 2637 * pitchScale, 2620, 0.09, now + 0.06, 0.18);
      this.tone('sine', 3520 * pitchScale, 3500, 0.05, now + 0.12, 0.16);
      this.tone('triangle', 240, 90, 0.14, now, 0.08);
      return;
    }

    if (kind === 'rainbow') {
      this.tone('sine', 1568 * pitchScale, 1568 * pitchScale, 0.14, now, 0.25);
      this.tone('sine', 2349 * pitchScale, 2349 * pitchScale, 0.08, now + 0.03, 0.22);
      this.tone('triangle', 180, 60, 0.22, now, 0.08);
      if (nearMiss) this.tone('sine', 3136, 3200, 0.08, now + 0.06, 0.2);
      return;
    }
    if (kind === 'water') {
      this.noise('bandpass', 1800, 400, 0.28, now, 0.14);
      this.tone('sine', 420 * pitchScale, 160, 0.26, now, 0.1);
      if (nearMiss) this.tone('sine', 900, 1800, 0.1, now + 0.04, 0.08);
      return;
    }
    if (kind === 'snow') {
      this.noise('bandpass', 2400, 900, 0.3, now, 0.09);
      this.tone('triangle', 200 * pitchScale, 70, 0.24, now, 0.08);
      if (nearMiss) this.tone('sine', 2800, 2800, 0.08, now + 0.03, 0.18);
      return;
    }

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(195 * pitchScale, now);
    osc.frequency.exponentialRampToValueAtTime(52, now + 0.09);
    gain.gain.setValueAtTime(0.32, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.11);

    // Crisp metallic crunch
    const noise = ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.setValueAtTime(1200, now);
    const nGain = ctx.createGain();
    nGain.gain.setValueAtTime(0.22, now);
    nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
    noise.connect(hp).connect(nGain).connect(ctx.destination);
    noise.start(now);
    noise.stop(now + 0.07);

    // Extra razor-close whistle ping on near miss!
    if (nearMiss) {
      const ping = ctx.createOscillator();
      const pGain = ctx.createGain();
      ping.type = 'sine';
      ping.frequency.setValueAtTime(980, now);
      ping.frequency.exponentialRampToValueAtTime(1480, now + 0.11);
      pGain.gain.setValueAtTime(0.16, now);
      pGain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);
      ping.connect(pGain).connect(ctx.destination);
      ping.start(now);
      ping.stop(now + 0.14);
    }
  }

  /**
   * Collectible Argent Energy Crystal pierced!
   */
  public playArgentGem() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const notes = [880, 1174.66, 1567.98];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      const t = now + idx * 0.04;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.16, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.2);
    });
  }

  /**
   * Final bolt OBLITERATES the rotating core into pieces!
   */
  public playCoreShatter(isBoss = false) {
    const ctx = this.ensureContext();
    if (!ctx || !this.noiseBuffer) return;
    const now = ctx.currentTime;

    // Massive DOOM sub-drop explosion
    const sub = ctx.createOscillator();
    const subGain = ctx.createGain();
    sub.type = 'sawtooth';
    sub.frequency.setValueAtTime(isBoss ? 120 : 95, now);
    sub.frequency.exponentialRampToValueAtTime(22, now + (isBoss ? 0.65 : 0.45));
    subGain.gain.setValueAtTime(0.5, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + (isBoss ? 0.68 : 0.48));

    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(360, now);
    sub.connect(lp).connect(subGain).connect(ctx.destination);
    sub.start(now);
    sub.stop(now + 0.7);

    // Filtered white-noise armor shatter blast
    const noise = ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2800, now);
    filter.frequency.exponentialRampToValueAtTime(160, now + 0.5);
    const nGain = ctx.createGain();
    nGain.gain.setValueAtTime(0.42, now);
    nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.52);
    noise.connect(filter).connect(nGain).connect(ctx.destination);
    noise.start(now);
    noise.stop(now + 0.55);
  }

  /**
   * Bolt collides with an already embedded spike -> sharp metallic CLANG & power down!
   */
  public playSpikeClash() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Metallic dissonant clang harmonics
    [1380, 2110, 3190].forEach((freq) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.72, now + 0.25);
      gain.gain.setValueAtTime(0.14, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.26);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.28);
    });

    // Descending fail reactor whine
    const down = ctx.createOscillator();
    const dGain = ctx.createGain();
    down.type = 'sawtooth';
    down.frequency.setValueAtTime(240, now + 0.05);
    down.frequency.exponentialRampToValueAtTime(42, now + 0.45);
    dGain.gain.setValueAtTime(0.24, now + 0.05);
    dGain.gain.exponentialRampToValueAtTime(0.001, now + 0.46);
    down.connect(dGain).connect(ctx.destination);
    down.start(now + 0.05);
    down.stop(now + 0.48);
  }

  /**
   * Subtle mechanical click when switching Obliterator skins
   */
  public playWeaponSwitch() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(420, now);
    osc.frequency.exponentialRampToValueAtTime(760, now + 0.06);
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.08);
  }
}

export const soundEngine = new SoundEngine();
