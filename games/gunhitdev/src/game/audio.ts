/* SFX sintetis (Web Audio) — tanpa aset eksternal. Tiap senjata punya warna suara sendiri. */

let actx: AudioContext | null = null;
let master: GainNode | null = null;
let noiseBuf: AudioBuffer | null = null;
let muted = false;

function ac(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    if (!actx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      actx = new AC();
      master = actx.createGain();
      master.gain.value = muted ? 0 : 0.55;
      master.connect(actx.destination);
      const len = Math.floor(actx.sampleRate * 1.2);
      noiseBuf = actx.createBuffer(1, len, actx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    if (actx.state === "suspended") void actx.resume();
    return actx;
  } catch {
    return null;
  }
}

export function unlockAudio() {
  ac();
}
export function setMuted(m: boolean) {
  muted = m;
  if (master && actx) master.gain.setTargetAtTime(m ? 0 : 0.55, actx.currentTime, 0.02);
}
export function getMuted() {
  return muted;
}

interface ToneOpts {
  f: number;
  f2?: number;
  dur?: number;
  type?: OscillatorType;
  vol?: number;
  delay?: number;
  curve?: "exp" | "lin";
}
function tone({ f, f2, dur = 0.18, type = "sine", vol = 0.2, delay = 0, curve = "exp" }: ToneOpts) {
  const c = ac();
  if (!c || !master) return;
  const t = c.currentTime + delay;
  const o = c.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(Math.max(20, f), t);
  if (f2) {
    if (curve === "exp") o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t + dur);
    else o.frequency.linearRampToValueAtTime(Math.max(20, f2), t + dur);
  }
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g);
  g.connect(master);
  o.start(t);
  o.stop(t + dur + 0.05);
}

function noise(dur = 0.2, vol = 0.2, freq = 1200, q = 1, type: BiquadFilterType = "bandpass", delay = 0, sweep = 0) {
  const c = ac();
  if (!c || !master || !noiseBuf) return;
  const t = c.currentTime + delay;
  const s = c.createBufferSource();
  s.buffer = noiseBuf;
  s.loop = true;
  const f = c.createBiquadFilter();
  f.type = type;
  f.frequency.setValueAtTime(freq, t);
  if (sweep) f.frequency.exponentialRampToValueAtTime(Math.max(60, sweep), t + dur);
  f.Q.value = q;
  const g = c.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f);
  f.connect(g);
  g.connect(master);
  s.start(t);
  s.stop(t + dur + 0.05);
}

export const sfx = {
  shoot(id: string) {
    switch (id) {
      case "keris":
        // Sambaran Halilintar Mahadahsyat: Snap Tajam + Dentum Sub + Gemuruh Petir
        noise(0.18, 0.35, 8500, 1.4, "highpass", 0, 1800);
        tone({ f: 3400, f2: 280, dur: 0.12, type: "sawtooth", vol: 0.14 });
        tone({ f: 210, f2: 38, dur: 0.38, type: "sawtooth", vol: 0.22 });
        tone({ f: 90, f2: 30, dur: 0.5, type: "sine", vol: 0.36, delay: 0.01 });
        noise(0.42, 0.22, 420, 0.7, "lowpass", 0.01, 80);
        break;
      case "blackhole":
        tone({ f: 190, f2: 38, dur: 0.4, type: "sine", vol: 0.32 });
        tone({ f: 620, f2: 90, dur: 0.22, type: "sawtooth", vol: 0.06 });
        noise(0.34, 0.14, 900, 1.4, "lowpass", 0, 120);
        break;
      case "yoyo":
        tone({ f: 280, f2: 900, dur: 0.1, type: "square", vol: 0.1 });
        tone({ f: 900, f2: 320, dur: 0.14, type: "sine", vol: 0.14, delay: 0.08 });
        noise(0.1, 0.07, 2400, 3);
        break;
      case "diamond":
        tone({ f: 1500, f2: 2300, dur: 0.12, type: "sine", vol: 0.13 });
        tone({ f: 2600, dur: 0.2, type: "sine", vol: 0.06, delay: 0.02 });
        noise(0.12, 0.1, 5200, 4, "highpass");
        break;
      case "crystal":
        tone({ f: 1180, dur: 0.32, type: "sine", vol: 0.12 });
        tone({ f: 1770, dur: 0.28, type: "sine", vol: 0.09, delay: 0.02 });
        tone({ f: 2360, dur: 0.22, type: "triangle", vol: 0.05, delay: 0.04 });
        noise(0.16, 0.06, 4200, 3, "highpass");
        break;
      default:
        tone({ f: 800, f2: 200, dur: 0.12, type: "square", vol: 0.14 });
    }
  },
  stick(id?: string) {
    if (id === "keris") {
      // Ledakan Tumbukan Petir: Retakan Listrik + Dentum Guntur + Sisa Sizzling
      noise(0.12, 0.32, 5200, 2.2, "highpass");
      tone({ f: 2900, f2: 180, dur: 0.14, type: "sawtooth", vol: 0.16 });
      tone({ f: 160, f2: 40, dur: 0.45, type: "sine", vol: 0.32, delay: 0.01 });
      noise(0.55, 0.2, 240, 0.9, "lowpass", 0.02, 60);
      noise(0.08, 0.14, 6800, 3.2, "highpass", 0.11);
      return;
    }
    tone({ f: 190, f2: 58, dur: 0.16, type: "sine", vol: 0.3 });
    noise(0.1, 0.16, 700, 1.2, "lowpass");
    tone({ f: 1400, f2: 900, dur: 0.05, type: "triangle", vol: 0.06 });
  },
  close() {
    tone({ f: 1900, f2: 2400, dur: 0.09, type: "sine", vol: 0.07 });
  },
  crash() {
    tone({ f: 260, f2: 42, dur: 0.7, type: "sawtooth", vol: 0.28 });
    tone({ f: 174, f2: 30, dur: 0.8, type: "square", vol: 0.16, delay: 0.02 });
    noise(0.6, 0.28, 1600, 0.7, "lowpass", 0, 90);
  },
  clear() {
    [523, 659, 784, 1046].forEach((f, i) =>
      tone({ f, dur: 0.34, type: "triangle", vol: 0.16, delay: i * 0.085 })
    );
    noise(0.5, 0.05, 6000, 2, "highpass", 0.1);
  },
  boss() {
    tone({ f: 90, f2: 60, dur: 1.1, type: "sawtooth", vol: 0.18 });
    tone({ f: 440, f2: 330, dur: 0.5, type: "square", vol: 0.08 });
    tone({ f: 440, f2: 330, dur: 0.5, type: "square", vol: 0.08, delay: 0.6 });
  },
  ui() {
    tone({ f: 620, f2: 880, dur: 0.06, type: "square", vol: 0.05 });
  },
  coin() {
    tone({ f: 1250, dur: 0.08, type: "square", vol: 0.07 });
    tone({ f: 1900, dur: 0.14, type: "square", vol: 0.06, delay: 0.07 });
  },
  select() {
    tone({ f: 420, f2: 900, dur: 0.18, type: "triangle", vol: 0.12 });
  },
};
