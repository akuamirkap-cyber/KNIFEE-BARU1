/**
 * A recording Web Audio stand-in for the sound tests.
 *
 * Every oscillator / noise burst that a sound module schedules lands here, so a
 * test can ask two questions about a weapon that the code cannot: "did anything
 * actually play?" and "how loud was it compared to the weapon next to it?".
 */
export interface AudioProbe {
  /** Number of voices (oscillators + noise bursts) scheduled. */
  voices: number;
  /** Sum of the envelope peaks the voices asked for. */
  energy: number;
  /** Loudest single envelope peak. */
  peak: number;
  /** Frequencies of the scheduled oscillators, in order. */
  freqs: number[];
  /** How many gain nodes were created (rough "cost"). */
  gains: number;
}

export interface AudioHarness {
  probe: AudioProbe;
  reset(): void;
  /** Mimic the browser: a fresh context starts suspended until a gesture. */
  setState(state: AudioContextState): void;
  restore(): void;
}

class FakeParam {
  value = 0;
  constructor(private onSet: (v: number) => void) {}
  setValueAtTime(v: number) { this.value = v; this.onSet(v); return this; }
  linearRampToValueAtTime(v: number) { this.value = v; this.onSet(v); return this; }
  exponentialRampToValueAtTime(v: number) {
    if (v <= 0) throw new RangeError('exponentialRampToValueAtTime: 0');
    this.value = v;
    this.onSet(v);
    return this;
  }
  cancelScheduledValues() { return this; }
  setTargetAtTime(v: number) { this.value = v; this.onSet(v); return this; }
}

export function installAudioHarness(): AudioHarness {
  const probe: AudioProbe = { voices: 0, energy: 0, peak: 0, freqs: [], gains: 0 };
  const note = (v: number) => {
    if (!Number.isFinite(v) || v <= 0) return;
    probe.energy += v;
    probe.peak = Math.max(probe.peak, v);
  };

  class FakeNode {
    connect() { return this; }
    disconnect() { return this; }
    start() { probe.voices++; }
    stop() {}
    set onended(_fn: (() => void) | null) {}
    gain = new FakeParam((v) => note(v));
    frequency = new FakeParam(() => {});
    detune = new FakeParam(() => {});
    Q = new FakeParam(() => {});
    pan = new FakeParam(() => {});
    threshold = new FakeParam(() => {});
    knee = new FakeParam(() => {});
    ratio = new FakeParam(() => {});
    attack = new FakeParam(() => {});
    release = new FakeParam(() => {});
    type = 'sine';
    buffer: unknown = null;
    loop = false;
    playbackRate = new FakeParam(() => {});
  }

  class FakeContext {
    state: AudioContextState = 'running';
    currentTime = 0;
    sampleRate = 44100;
    destination = new FakeNode();
    resume() { this.state = 'running'; return Promise.resolve(); }
    suspend() { this.state = 'suspended'; return Promise.resolve(); }
    close() { return Promise.resolve(); }
    private make() { return new FakeNode(); }
    createOscillator() { return this.make(); }
    createGain() { probe.gains++; return this.make(); }
    createBufferSource() { return this.make(); }
    createBiquadFilter() { return this.make(); }
    createDynamicsCompressor() { return this.make(); }
    createConvolver() { return this.make(); }
    createStereoPanner() { return this.make(); }
    createWaveShaper() { return this.make(); }
    createDelay() { return this.make(); }
    createBuffer(channels: number, length: number) {
      return {
        length,
        numberOfChannels: channels,
        sampleRate: 44100,
        getChannelData: () => new Float32Array(Math.max(1, length)),
      };
    }
  }

  const g = globalThis as Record<string, unknown>;
  const previous = {
    AudioContext: g.AudioContext,
    webkitAudioContext: g.webkitAudioContext,
    window: g.window,
    performance: g.performance,
  };
  const contexts: FakeContext[] = [];
  class TrackedContext extends FakeContext {
    constructor() { super(); contexts.push(this); }
  }
  g.AudioContext = TrackedContext;
  const win = (g.window as Record<string, unknown> | undefined) ?? {};
  win.AudioContext = TrackedContext;
  win.webkitAudioContext = TrackedContext;
  win.setTimeout = setTimeout;
  win.clearTimeout = clearTimeout;
  win.localStorage = {
    store: new Map<string, string>(),
    getItem(k: string) { return (this.store as Map<string, string>).get(k) ?? null; },
    setItem(k: string, v: string) { (this.store as Map<string, string>).set(k, v); },
  };
  g.window = win;

  return {
    probe,
    reset() {
      probe.voices = 0;
      probe.energy = 0;
      probe.peak = 0;
      probe.freqs = [];
      probe.gains = 0;
    },
    setState(state: AudioContextState) {
      for (const c of contexts) c.state = state;
    },
    restore() {
      g.AudioContext = previous.AudioContext;
      g.webkitAudioContext = previous.webkitAudioContext;
      if (previous.window === undefined) Reflect.deleteProperty(g, 'window');
      else g.window = previous.window;
      if (previous.performance === undefined) Reflect.deleteProperty(g, 'performance');
      else g.performance = previous.performance;
    },
  };
}
