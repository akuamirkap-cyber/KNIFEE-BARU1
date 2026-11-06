/** Small, local WebAudio recipes for the remaining Pistol/menu. No music files or other weapons. */
export class LiteAudio {
  private ctx: AudioContext | null = null;
  private enabled = true;
  private active = true;
  private volume = 0.65;
  configure(enabled: boolean, volume: number) { this.enabled = enabled; this.volume = Math.max(0, Math.min(1, volume)); if (!enabled) void this.ctx?.suspend().catch(() => {}); }
  setActive(active: boolean) { this.active = active; if (!active) void this.ctx?.suspend().catch(() => {}); }
  unlock() {
    if (!this.active || !this.enabled) return;
    try { this.ctx ??= new AudioContext(); if (this.ctx.state === 'suspended') void this.ctx.resume().catch(() => {}); } catch { /* Audio unsupported/blocked: still playable. */ }
  }
  private tone(freq: number, to: number, duration: number, type: OscillatorType = 'sine', gain = 0.1) {
    this.unlock(); const ctx = this.ctx;
    if (!ctx || !this.active || !this.enabled || ctx.state !== 'running') return;
    const t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t); o.frequency.exponentialRampToValueAtTime(Math.max(1, to), t + duration);
    g.gain.setValueAtTime(Math.max(0.0001, gain * this.volume), t); g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    o.connect(g); g.connect(ctx.destination); o.start(t); o.stop(t + duration + 0.02);
  }
  shot() {
    this.tone(145, 35, 0.11, 'triangle', 0.19);
    const c = this.ctx; if (!c || !this.active || !this.enabled || c.state !== 'running') return;
    const b = c.createBuffer(1, Math.floor(c.sampleRate * 0.075), c.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / d.length * 6);
    const s = c.createBufferSource(), g = c.createGain(); s.buffer = b; g.gain.value = this.volume * 0.22; s.connect(g); g.connect(c.destination); s.start();
  }
  hit() { this.tone(260, 65, 0.08, 'triangle', 0.11); }
  coin() { this.tone(1150, 1900, 0.17, 'sine', 0.09); }
  clear() { this.tone(520, 1040, 0.4, 'triangle', 0.11); }
  fail() { this.tone(150, 42, 0.4, 'sawtooth', 0.08); }
  tap(..._args: number[]) { this.tone(660, 420, 0.07, 'sine', 0.065); }
  pillarTap(..._args: number[]) { this.tap(); }
  lockedBuzz() { this.fail(); }
  mapGlide() { this.tone(250, 700, 0.18, 'sine', 0.03); }
  confirm() { this.tap(); }
  destroy() { this.active = false; void this.ctx?.close().catch(() => {}); this.ctx = null; }
}
// The copied map receives an instance through context, not v1's global audio bus.
