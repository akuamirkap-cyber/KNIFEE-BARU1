/**
 * PERFECT SHOT — v2 sound.
 *
 * All effects are synthesised with WebAudio: no files, no fetch, no decoding, so
 * the whole game stays one HTML file and starts instantly. Everything is
 * wrapped so a blocked AudioContext (autoplay policy, an old browser, a test
 * environment) degrades to silence instead of throwing.
 *
 * The first user gesture calls `unlock()`; until then `sfx.*` is a no-op.
 */

export type SoundName =
  | 'fire'
  | 'land'
  | 'combo'
  | 'miss'
  | 'clear'
  | 'perfect'
  | 'click'
  | 'gameover'
  | 'levelup';

interface Note {
  /** Frequency in Hz at the start. */
  f: number;
  /** Frequency at the end, for a glide. Defaults to `f`. */
  to?: number;
  /** Seconds. */
  dur: number;
  /** 0…1. */
  gain: number;
  type?: OscillatorType;
  /** Seconds to wait before this note starts. */
  at?: number;
}

/** Every sound is a handful of short notes; that is the whole sound design. */
const RECIPES: Record<SoundName, Note[]> = {
  fire: [{ f: 620, to: 240, dur: 0.08, gain: 0.22, type: 'square' }],
  land: [
    { f: 340, to: 520, dur: 0.07, gain: 0.2, type: 'triangle' },
    { f: 900, dur: 0.05, gain: 0.09, type: 'sine', at: 0.02 },
  ],
  combo: [
    { f: 700, to: 980, dur: 0.08, gain: 0.2, type: 'triangle' },
    { f: 1200, dur: 0.07, gain: 0.12, type: 'sine', at: 0.05 },
  ],
  miss: [
    { f: 180, to: 70, dur: 0.34, gain: 0.3, type: 'sawtooth' },
    { f: 90, to: 45, dur: 0.3, gain: 0.22, type: 'square', at: 0.04 },
  ],
  clear: [
    { f: 523, dur: 0.11, gain: 0.22, type: 'triangle' },
    { f: 659, dur: 0.11, gain: 0.22, type: 'triangle', at: 0.1 },
    { f: 784, dur: 0.11, gain: 0.22, type: 'triangle', at: 0.2 },
    { f: 1046, dur: 0.24, gain: 0.24, type: 'triangle', at: 0.3 },
  ],
  perfect: [
    { f: 784, dur: 0.1, gain: 0.22, type: 'sine' },
    { f: 988, dur: 0.1, gain: 0.22, type: 'sine', at: 0.08 },
    { f: 1318, dur: 0.1, gain: 0.22, type: 'sine', at: 0.16 },
    { f: 1568, dur: 0.34, gain: 0.24, type: 'sine', at: 0.24 },
  ],
  click: [{ f: 440, to: 520, dur: 0.04, gain: 0.12, type: 'square' }],
  gameover: [
    { f: 400, to: 300, dur: 0.16, gain: 0.24, type: 'triangle' },
    { f: 300, to: 210, dur: 0.18, gain: 0.24, type: 'triangle', at: 0.15 },
    { f: 210, to: 120, dur: 0.4, gain: 0.26, type: 'triangle', at: 0.32 },
  ],
  levelup: [
    { f: 660, to: 880, dur: 0.12, gain: 0.18, type: 'sine' },
    { f: 1100, dur: 0.16, gain: 0.14, type: 'sine', at: 0.1 },
  ],
};

export class Sfx {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  /** Cached noise buffer, built once, for the percussive hits. */
  private noise: AudioBuffer | null = null;
  muted = false;

  /** Call from a user gesture. Safe to call repeatedly. */
  unlock(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume().catch(() => {});
      return;
    }
    try {
      const Ctor =
        (globalThis as unknown as { AudioContext?: typeof AudioContext }).AudioContext ??
        (globalThis as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      const ctx = new Ctor();
      const master = ctx.createGain();
      master.gain.value = this.muted ? 0 : 0.9;
      master.connect(ctx.destination);
      this.ctx = ctx;
      this.master = master;

      // 0.3 s of white noise, reused for every thud and burst.
      const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.3), ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      this.noise = buf;
    } catch {
      this.ctx = null;
      this.master = null;
    }
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.master) this.master.gain.value = muted ? 0 : 0.9;
  }

  /** Play one of the recipes. Silent until `unlock()` has run. */
  play(name: SoundName, detune = 0): void {
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master || this.muted) return;
    if (ctx.state === 'suspended') void ctx.resume().catch(() => {});
    const now = ctx.currentTime;
    for (const note of RECIPES[name]) {
      const t0 = now + (note.at ?? 0);
      const osc = ctx.createOscillator();
      const env = ctx.createGain();
      osc.type = note.type ?? 'triangle';
      const f0 = note.f * (1 + detune);
      const f1 = (note.to ?? note.f) * (1 + detune);
      osc.frequency.setValueAtTime(f0, t0);
      if (f1 !== f0) osc.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t0 + note.dur);
      env.gain.setValueAtTime(0.0001, t0);
      env.gain.exponentialRampToValueAtTime(note.gain, t0 + 0.008);
      env.gain.exponentialRampToValueAtTime(0.0001, t0 + note.dur);
      osc.connect(env);
      env.connect(master);
      osc.onended = () => { osc.disconnect(); env.disconnect(); };
      osc.start(t0);
      osc.stop(t0 + note.dur + 0.02);
    }
  }

  /** A short filtered noise hit — the "thunk" under a landing. */
  thud(power = 1): void {
    const ctx = this.ctx;
    const master = this.master;
    const buf = this.noise;
    if (!ctx || !master || !buf || this.muted) return;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1400 * power, ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(240, ctx.currentTime + 0.12);
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.28 * power, ctx.currentTime);
    env.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.14);
    src.connect(filter);
    filter.connect(env);
    env.connect(master);
    src.onended = () => { src.disconnect(); filter.disconnect(); env.disconnect(); };
    src.start();
  }

  /** Backgrounding never leaves an audio device running. */
  suspend(): void {
    if (this.ctx?.state === 'running') void this.ctx.suspend().catch(() => {});
  }

  destroy(): void {
    try {
      void this.ctx?.close().catch(() => {});
    } catch {
      /* already gone */
    }
    this.ctx = null;
    this.master = null;
  }
}

/** One shared instance; a host that wants its own can `new Sfx()`. */
export const sfx = new Sfx();
