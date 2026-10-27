/**
 * A silent Web Audio stand-in for the offline tools.
 *
 * `Game.startAtLevel()` unlocks every ported synthesizer, and each of them
 * builds a real AudioContext at that moment. Node has none, so the tools that
 * need a *fresh* level (rather than a poked-at one) install this first: every
 * node accepts the calls the synths make and throws nothing, and no sound is
 * produced.
 */
export function installSilentAudio(): void {
  const param = () => ({
    value: 0,
    setValueAtTime() {},
    linearRampToValueAtTime() {},
    exponentialRampToValueAtTime() {},
    setTargetAtTime() {},
    cancelScheduledValues() {},
    cancelAndHoldAtTime() {},
  });

  const makeNode = (): Record<string, unknown> => ({
    connect() { return makeNode(); },
    disconnect() {},
    start() {},
    stop() {},
    gain: param(),
    frequency: param(),
    detune: param(),
    Q: param(),
    pan: param(),
    delayTime: param(),
    playbackRate: param(),
    threshold: param(),
    knee: param(),
    ratio: param(),
    attack: param(),
    release: param(),
    curve: null,
    buffer: null,
    loop: false,
    type: 'sine',
    onended: null,
  });

  class SilentAudioContext {
    state = 'running';
    sampleRate = 44100;
    currentTime = 0;
    destination = makeNode();
    createGain() { return makeNode(); }
    createOscillator() { return makeNode(); }
    createBiquadFilter() { return makeNode(); }
    createDynamicsCompressor() { return makeNode(); }
    createStereoPanner() { return makeNode(); }
    createWaveShaper() { return makeNode(); }
    createConvolver() { return makeNode(); }
    createDelay() { return makeNode(); }
    createBufferSource() { return makeNode(); }
    createPeriodicWave() { return {}; }
    createBuffer(channels = 1, length = 1) {
      return {
        length,
        duration: length / this.sampleRate,
        sampleRate: this.sampleRate,
        numberOfChannels: channels,
        getChannelData: () => new Float32Array(length),
      };
    }
    resume() { return Promise.resolve(); }
    suspend() { return Promise.resolve(); }
    close() { return Promise.resolve(); }
  }

  const g = globalThis as unknown as Record<string, unknown> & { window: Record<string, unknown> };
  g.window = Object.assign(g.window ?? {}, { AudioContext: SilentAudioContext, webkitAudioContext: SilentAudioContext });
  g.AudioContext = SilentAudioContext;
}
