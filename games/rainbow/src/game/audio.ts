/** Tiny WebAudio synth – no assets required. */
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let muted = false;

function ac(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.5;
    master.connect(ctx.destination);
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

export function setMuted(m: boolean) {
  muted = m;
  if (master) master.gain.value = m ? 0 : 0.5;
}
export function isMuted() {
  return muted;
}

function tone(
  freq: number,
  dur: number,
  type: OscillatorType,
  vol: number,
  slideTo?: number,
  delay = 0
) {
  const a = ac();
  if (!a || !master || muted) return;
  const t0 = a.currentTime + delay;
  const osc = a.createOscillator();
  const g = a.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g);
  g.connect(master);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

function noise(dur: number, vol: number, freq = 1200, q = 1) {
  const a = ac();
  if (!a || !master || muted) return;
  const len = Math.floor(a.sampleRate * dur);
  const buf = a.createBuffer(1, len, a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = a.createBufferSource();
  src.buffer = buf;
  const bp = a.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = freq;
  bp.Q.value = q;
  const g = a.createGain();
  g.gain.value = vol;
  src.connect(bp);
  bp.connect(g);
  g.connect(master);
  src.start();
}

export const sfx = {
  shoot() {
    tone(980, 0.16, "sawtooth", 0.16, 200);
    tone(1960, 0.12, "sine", 0.1, 720);
    noise(0.13, 0.13, 2600, 0.8);
    tone(180, 0.14, "sine", 0.16, 60);
  },
  hit(hue: number, big = false) {
    const f = 420 + ((hue % 360) / 360) * 500;
    tone(f, 0.14, "triangle", 0.18, f * 1.5);
    tone(f * 2, 0.24, "sine", 0.1, f * 3);
    noise(0.1, 0.09, big ? 2400 : 3600, 1.2);
    // weight
    tone(big ? 150 : 120, big ? 0.3 : 0.2, "sine", big ? 0.26 : 0.18, 42);
    if (big) tone(70, 0.42, "sine", 0.16, 32);
  },
  perfect(combo: number) {
    const base = 660 * Math.pow(1.06, Math.min(10, combo));
    [0, 0.06, 0.12].forEach((d, i) => tone(base * (1 + i * 0.26), 0.24, "sine", 0.16, base * 2, d));
    noise(0.18, 0.07, 5200, 0.7);
    // glass shimmer + sub boom
    tone(2400, 0.35, "sine", 0.07, 5200, 0.02);
    tone(90, 0.4, "sine", 0.22, 34);
  },
  fail() {
    tone(220, 0.5, "sawtooth", 0.2, 55);
    tone(110, 0.7, "square", 0.12, 40);
    noise(0.5, 0.16, 300, 0.5);
  },
  level() {
    [0, 0.09, 0.18, 0.3].forEach((d, i) =>
      tone(523.25 * Math.pow(2, i / 4), 0.35, "triangle", 0.16, undefined, d)
    );
  },
  ui() {
    tone(760, 0.07, "sine", 0.12, 980);
  },
};
