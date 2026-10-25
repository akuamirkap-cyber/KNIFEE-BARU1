import { WEAPONS, drawWeapon, drawArrowShape, drawDisc, rr } from './weapons';
import { sfx } from './audio';

export const CW = 480, CH = 820;
const WC = { x: 240, y: 235 };
const R = 100;
const G = { x: 240, y: 700 };
const MAXHP = 100;
const HITY = WC.y + R;

type P = { x: number; y: number; vx: number; vy: number; life: number; max: number; size: number; color: string; type: string; g?: number; rot?: number; vr?: number; drag?: number; add?: boolean };
type Mark = { type: string; a: number; born: number; color: string; len?: number; seed: number; geo: number[][] };

function hex2rgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map(x => x + x).join('') : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let x = Math.imul(s ^ (s >>> 15), 1 | s);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

/** pre-computed mark geometry so impact scars never flicker */
function markGeo(type: string, seed: number, size = 1): number[][] {
  const r = rng(seed);
  const geo: number[][] = [];
  const jagged = (n: number, rad: number) => {
    const p: number[] = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const k = rad * (0.72 + r() * 0.5);
      p.push(Math.cos(a) * k, Math.sin(a) * k);
    }
    return p;
  };
  const branch = (a0: number, len: number, segs: number) => {
    const line: number[] = [];
    let a = a0, x = 0, y = 0;
    line.push(0, 0);
    for (let k = 0; k < segs; k++) {
      a += (r() - 0.5) * 1.15;
      x += Math.cos(a) * (len / segs);
      y += Math.sin(a) * (len / segs);
      line.push(x, y);
    }
    return line;
  };
  switch (type) {
    case 'hole': case 'dent': {
      const rad = (type === 'hole' ? 4.4 : 11) * size;
      geo.push(jagged(11, rad));
      const cracks = type === 'hole' ? 5 : 9;
      for (let i = 0; i < cracks; i++) geo.push(branch(r() * Math.PI * 2, rad * (1.6 + r() * 1.4), 3));
      for (let i = 0; i < 7; i++) {
        const a = r() * Math.PI * 2, l = rad * (1.5 + r() * 1.8);
        geo.push([Math.cos(a) * rad * 0.6, Math.sin(a) * rad * 0.6, Math.cos(a) * l, Math.sin(a) * l]);
      }
      return geo;
    }
    case 'escorch': {
      geo.push(jagged(14, 6.5 * size));
      for (let b = 0; b < 7; b++) geo.push(branch(r() * Math.PI * 2, (10 + r() * 12) * size, 3 + Math.floor(r() * 3)));
      return geo;
    }
    case 'burn': case 'melt': {
      const rad = (type === 'burn' ? 21 : 12) * size;
      geo.push(jagged(18, rad));
      for (let i = 0; i < 6; i++) geo.push(branch(r() * Math.PI * 2, rad * (0.9 + r() * 1.1), 3));
      for (let i = 0; i < 3; i++) {
        const a = r() * Math.PI * 2, l = rad * (0.9 + r() * 1.1);
        geo.push([Math.cos(a) * rad * 0.4, Math.sin(a) * rad * 0.4, Math.cos(a) * l, Math.sin(a) * l, Math.cos(a) * (l + 3), Math.sin(a) * (l + 3)]);
      }
      for (let i = 0; i < 10; i++) {
        const a = r() * Math.PI * 2, d = rad * (0.9 + r() * 1.2);
        geo.push([Math.cos(a) * d, Math.sin(a) * d, 1 + r() * 1.6]);
      }
      return geo;
    }
    case 'acid': {
      geo.push(jagged(16, 13 * size));
      for (let i = 0; i < 5; i++) {
        const a = r() * Math.PI * 2;
        const l = (12 + r() * 16) * size;
        const line = [Math.cos(a) * 7, Math.sin(a) * 7];
        let x = Math.cos(a) * 7, y = Math.sin(a) * 7;
        for (let k = 0; k < 3; k++) { x += Math.cos(a) * (l / 3); y += Math.sin(a) * (l / 3) + 2.2; line.push(x, y); }
        geo.push(line);
      }
      for (let i = 0; i < 12; i++) {
        const a = r() * Math.PI * 2, d = (8 + r() * 17) * size;
        geo.push([Math.cos(a) * d, Math.sin(a) * d, 1 + r() * 2]);
      }
      return geo;
    }
    case 'void': {
      geo.push(jagged(15, 12 * size));
      for (let i = 0; i < 10; i++) geo.push(branch(r() * Math.PI * 2, (14 + r() * 17) * size, 3));
      return geo;
    }
    case 'frost': {
      geo.push(jagged(14, 12 * size));
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * Math.PI * 2 + r() * 0.32;
        const l = (14 + r() * 18) * size;
        geo.push([0, 0, Math.cos(a) * l, Math.sin(a) * l, Math.cos(a) * (l + 7), Math.sin(a) * (l + 7)]);
      }
      for (let i = 0; i < 10; i++) {
        const a = r() * Math.PI * 2, d = (6 + r() * 19) * size;
        geo.push([Math.cos(a) * d, Math.sin(a) * d, 1 + r() * 1.8]);
      }
      return geo;
    }
    case 'cut': {
      const L = 22 * size;
      geo.push([0, -L, 2.2, -L * 0.45, 1.1, 0, 3, L * 0.5, 0, L]);
      geo.push([-3, -L * 0.7, -1, -L * 0.2, -3.5, L * 0.35, -1.5, L * 0.8]);
      geo.push([4, -L * 0.6, 6, -L * 0.1, 4.5, L * 0.4, 6, L * 0.7]);
      for (let i = 0; i < 8; i++) {
        const a = r() * Math.PI * 2, d = 4 + r() * L * 0.8;
        geo.push([Math.cos(a) * 2, Math.sin(a) * d * 0.6, Math.cos(a) * 6 + 2, Math.sin(a) * d]);
      }
      return geo;
    }
  }
  return geo;
}
type Proj = { kind: string; x: number; y: number; vx: number; vy: number; t: number; color: string; electro?: boolean; dead?: boolean; bounce?: boolean; rot?: number; returning?: boolean; sz?: number; trail: { x: number; y: number }[]; widx: number };
type Beam = { x0: number; y0: number; x1: number; y1: number; life: number; max: number; color: string; w: number; kind: string };
type Piece = { a0: number; a1: number; x: number; y: number; vx: number; vy: number; rot: number; vr: number };

export class Game {
  c: CanvasRenderingContext2D;
  t = 0;
  widx = 0;
  wheel = { angle: 0, speed: 1.6, hp: MAXHP, kick: 0, flash: 0, heat: 0, broken: false, respawn: 0, phase: 0 };
  marks: Mark[] = [];
  parts: P[] = [];
  projs: Proj[] = [];
  beams: Beam[] = [];
  pieces: Piece[] = [];
  holding = false;
  lastFire = -9999;
  recoil = 0;
  shake = 0;
  charge = 0;
  swing = 0;
  discOut = false;
  streamOn = false;
  burstLeft = 0;
  burstT = 0;
  busterStart = -9;
  busterTick = -1;
  lockT = 0;
  looping = '';
  hits = 0;
  kills = 0;
  tex: HTMLCanvasElement;
  cracks: number[][][] = [];
  bannerT = 0;
  stars: { x: number; y: number; s: number }[] = [];
  onStats?: (h: number, k: number) => void;

  constructor(c: CanvasRenderingContext2D) {
    this.c = c;
    this.tex = this.makeTex();
    this.makeCracks();
    for (let i = 0; i < 90; i++) this.stars.push({ x: Math.random() * CW, y: Math.random() * CH, s: Math.random() });
  }

  makeTex() {
    const s = R * 2 + 8;
    const cv = document.createElement('canvas');
    cv.width = cv.height = s * 2;
    const c = cv.getContext('2d')!;
    c.scale(2, 2);
    c.translate(s / 2, s / 2);
    // bark
    c.fillStyle = '#3b2210';
    c.beginPath(); c.arc(0, 0, R, 0, 7); c.fill();
    for (let i = 0; i < 120; i++) {
      const a = Math.random() * Math.PI * 2;
      c.strokeStyle = `rgba(${20 + Math.random() * 30},${10 + Math.random() * 15},0,.8)`;
      c.lineWidth = 1 + Math.random() * 2;
      c.beginPath(); c.arc(0, 0, R - 2 - Math.random() * 6, a, a + 0.08 + Math.random() * 0.15); c.stroke();
    }
    // wood face
    const g = c.createRadialGradient(0, 0, 0, 0, 0, R - 9);
    g.addColorStop(0, '#e6b77a'); g.addColorStop(0.6, '#c98f50'); g.addColorStop(1, '#a5672e');
    c.fillStyle = g;
    c.beginPath(); c.arc(0, 0, R - 9, 0, 7); c.fill();
    // growth rings
    for (let r = 6; r < R - 10; r += 4 + Math.random() * 4) {
      c.strokeStyle = `rgba(110,60,20,${0.25 + Math.random() * 0.3})`;
      c.lineWidth = 0.8 + Math.random() * 1.2;
      c.beginPath();
      for (let a = 0; a <= Math.PI * 2 + 0.1; a += 0.1) {
        const rr2 = r + Math.sin(a * 3 + r) * 1.2 + Math.sin(a * 7) * 0.6;
        const x = Math.cos(a) * rr2, y = Math.sin(a) * rr2;
        a ? c.lineTo(x, y) : c.moveTo(x, y);
      }
      c.stroke();
    }
    // radial checks
    c.strokeStyle = 'rgba(70,35,10,.45)';
    for (let i = 0; i < 6; i++) {
      const a = Math.random() * 7; c.lineWidth = 1;
      c.beginPath(); c.moveTo(Math.cos(a) * 10, Math.sin(a) * 10); c.lineTo(Math.cos(a) * (40 + Math.random() * 40), Math.sin(a) * (40 + Math.random() * 40)); c.stroke();
    }
    // bullseye paint
    c.globalAlpha = 0.85;
    c.strokeStyle = '#b3121f'; c.lineWidth = 5;
    c.beginPath(); c.arc(0, 0, 58, 0, 7); c.stroke();
    c.beginPath(); c.arc(0, 0, 30, 0, 7); c.stroke();
    c.fillStyle = '#b3121f'; c.beginPath(); c.arc(0, 0, 11, 0, 7); c.fill();
    c.globalAlpha = 1;
    // metal bolts
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const x = Math.cos(a) * (R - 16), y = Math.sin(a) * (R - 16);
      const bg = c.createRadialGradient(x - 1, y - 1, 0, x, y, 4);
      bg.addColorStop(0, '#eee'); bg.addColorStop(1, '#444');
      c.fillStyle = bg; c.beginPath(); c.arc(x, y, 3.5, 0, 7); c.fill();
    }
    return cv;
  }

  makeCracks() {
    this.cracks = [];
    for (let i = 0; i < 9; i++) {
      let a = Math.random() * Math.PI * 2, r = 4 + Math.random() * 10;
      const path: number[][] = [[Math.cos(a) * r, Math.sin(a) * r]];
      while (r < R - 6) {
        r += 8 + Math.random() * 10; a += (Math.random() - 0.5) * 0.35;
        path.push([Math.cos(a) * Math.min(r, R - 6), Math.sin(a) * Math.min(r, R - 6)]);
      }
      this.cracks.push(path);
    }
  }

  get w() { return WEAPONS[this.widx]; }

  setWeapon(i: number) {
    this.widx = i;
    this.discOut = false;
    this.projs = this.projs.filter(p => p.kind !== 'disc');
    this.charge = 0;
    this.bannerT = 1.4;
  }

  press() {
    sfx.ensure();
    this.holding = true;
    if (this.w.kind === 'buster') {
      this.busterStart = this.t;
      this.busterTick = -1;
      sfx.charge(this.widx);
      return;
    }
    this.tryFire();
  }
  release() {
    if (this.w.kind === 'buster' && this.holding) {
      this.charge = Math.min(1, Math.max(0.12, (this.t - this.busterStart) / 0.9));
      this.fire();
      this.charge = 0;
    }
    this.holding = false;
  }

  muzzle() { return { x: G.x, y: G.y - this.w.muzzle + this.recoil }; }

  /* ---------------- particles ---------------- */
  p(o: Partial<P> & { x: number; y: number }) {
    const q = { vx: 0, vy: 0, life: 0.5, size: 2, color: '#fff', type: 'spark', add: true, ...o } as P;
    q.max = q.life;
    this.parts.push(q);
  }
  sparks(x: number, y: number, n: number, color: string, spd = 400, spread = Math.PI, dir = Math.PI / 2) {
    for (let i = 0; i < n; i++) {
      const a = dir + (Math.random() - 0.5) * spread * 2, s = spd * (0.3 + Math.random());
      this.p({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.25 + Math.random() * 0.4, size: 1 + Math.random() * 1.8, color, type: 'spark', g: 600, drag: 0.98 });
    }
  }
  chips(x: number, y: number, n: number) {
    for (let i = 0; i < n; i++) {
      const a = Math.PI / 2 + (Math.random() - 0.5) * 2.4, s = 150 + Math.random() * 300;
      const col = ['#d9a05f', '#a0652c', '#e8c08a', '#6e3d14'][i % 4];
      this.p({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.7 + Math.random() * 0.6, size: 2 + Math.random() * 3, color: col, type: 'chip', g: 1100, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 30, add: false });
    }
  }
  smoke(x: number, y: number, n: number, col = '120,120,120', size = 10) {
    for (let i = 0; i < n; i++) {
      this.p({ x: x + (Math.random() - 0.5) * 8, y, vx: (Math.random() - 0.5) * 50, vy: 20 + Math.random() * 40, life: 0.8 + Math.random() * 0.8, size: size * (0.6 + Math.random()), color: col, type: 'smoke', add: false, g: -60 });
    }
  }
  ring(x: number, y: number, color: string, size: number, life = 0.4) {
    this.p({ x, y, life, size, color, type: 'ring' });
  }
  glowP(x: number, y: number, color: string, size: number, life = 0.2) {
    this.p({ x, y, life, size, color, type: 'glow' });
  }

  /* ---------------- firing ---------------- */
  tryFire() {
    const w = this.w;
    if (w.kind === 'stream') return;
    if (this.t * 1000 - this.lastFire < w.rate) return;
    if (w.kind === 'disc' && this.discOut) return;
    this.lastFire = this.t * 1000;
    this.fire();
  }

  fire() {
    const w = this.w, m = this.muzzle();
    const base: Proj = { kind: w.kind, x: m.x, y: m.y, vx: 0, vy: 0, t: 0, color: w.color, electro: w.electro, trail: [], widx: this.widx };
    switch (w.kind) {
      case 'bullet': {
        const heavy = this.widx === 1 ? 1.4 : this.widx === 8 ? 1.2 : 1;
        this.projs.push({ ...base, vy: -2600, vx: (Math.random() - 0.5) * 40 });
        this.recoil = 10 * heavy;
        this.shake = Math.max(this.shake, 2.5 * heavy);
        this.flash(m.x, m.y, w.electro ? w.color : '#ffcc55', 1 * heavy, w.electro);
        // shell casing
        this.p({ x: m.x + 8, y: G.y - 30, vx: 160 + Math.random() * 120, vy: -200 - Math.random() * 120, life: 1.1, size: this.widx === 8 || this.widx >= 4 && this.widx <= 5 ? 2.5 : 3.5, color: '#d6a845', type: 'shell', g: 1200, rot: Math.random() * 6, vr: 25, add: false });
        this.smoke(m.x, m.y - 6, 2, w.electro ? '120,180,255' : '160,160,160', 7);
        break;
      }
      case 'arrow':
        this.projs.push({ ...base, y: G.y + 10, vy: -3400 });
        this.recoil = -14;
        this.shake = Math.max(this.shake, 4.5);
        this.ring(m.x, G.y - 10, '#ffd27a', 32, 0.22);
        this.sparks(m.x, G.y - 10, 8, '#ffe49e', 320, 0.6, -Math.PI / 2);
        this.charge = 0;
        break;
      case 'beam': case 'heat': case 'repulsor': {
        const isSn = this.widx === 6, isHeat = w.kind === 'heat', isRep = w.kind === 'repulsor';
        this.beams.push({ x0: m.x, y0: m.y, x1: WC.x, y1: HITY, life: isHeat ? 0.9 : isSn ? 0.45 : isRep ? 0.3 : 0.28, max: isHeat ? 0.9 : isSn ? 0.45 : isRep ? 0.3 : 0.28, color: w.color, w: isHeat ? 16 : isSn ? 9 : isRep ? 14 : 5, kind: this.widx === 9 ? 'phaser' : w.kind + (isSn ? 'sn' : '') });
        this.recoil = isSn ? 18 : isRep ? 12 : 6;
        this.shake = Math.max(this.shake, isHeat ? 10 : isSn ? 7 : isRep ? 5 : 2);
        this.flash(m.x, m.y, w.color, isHeat ? 2 : 1.3, true);
        this.ring(m.x, m.y, w.color, isSn ? 40 : 26);
        if (!isHeat) this.hit(w.kind, w.dmg);
        break;
      }
      case 'fire':
        this.projs.push({ ...base, vy: -950 });
        this.recoil = 16; this.shake = Math.max(this.shake, 6);
        for (let i = 0; i < 40; i++) {
          const a = -Math.PI / 2 + (Math.random() - 0.5) * 0.7, s = 300 + Math.random() * 500;
          this.p({ x: m.x, y: m.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.35 + Math.random() * 0.35, size: 8 + Math.random() * 10, color: '', type: 'flame', drag: 0.94, g: -100 });
        }
        this.smoke(m.x, m.y - 30, 6, '70,50,40', 14);
        break;
      case 'slash':
        this.projs.push({ ...base, y: m.y - 20, vy: -1300 });
        this.swing = 1.4;
        break;
      case 'plasma':
        this.projs.push({ ...base, vy: -1150 });
        this.recoil = 12; this.shake = Math.max(this.shake, 4);
        this.flash(m.x, m.y, '#7cc4ff', 1.4, true);
        this.ring(m.x, m.y, '#7cc4ff', 30);
        break;
      case 'disc':
        this.projs.push({ ...base, x: G.x, y: G.y - 14, vy: -1500, rot: 0 });
        this.discOut = true;
        this.recoil = -8;
        break;
      case 'burst': {
        this.burstLeft = 3;
        this.burstT = 0.34;
        this.lockT = 0.34;
        this.recoil = -5;
        this.charge = 0;
        sfx.charge(this.widx);
        // targeting laser converges on the target
        this.ring(WC.x, HITY, '#ff4a2a', 40, 0.35);
        break;
      }
      case 'spine':
        this.projs.push({ ...base, vy: -1950, vx: (Math.random() - 0.5) * 110 });
        this.recoil = 5;
        this.flash(m.x, m.y, '#a6ff6a', 0.75, true);
        this.glowP(m.x, m.y, '#8dff5a', 38, 0.16);
        break;
      case 'singularity':
        this.projs.push({ ...base, vy: -820 });
        this.recoil = 18;
        this.shake = Math.max(this.shake, 9);
        this.flash(m.x, m.y, '#b26cff', 1.7, true);
        this.ring(m.x, m.y, '#c79bff', 48, 0.35);
        this.glowP(m.x, m.y, '#7a2fff', 80, 0.3);
        break;
      case 'shard':
        this.projs.push({ ...base, vy: -1680, vx: (Math.random() - 0.5) * 34 });
        this.recoil = 10;
        this.shake = Math.max(this.shake, 3);
        this.flash(m.x, m.y, '#c8f4ff', 1.1, true);
        this.ring(m.x, m.y, '#7fe8ff', 32, 0.25);
        break;
      case 'buster': {
        const cb = Math.min(1, Math.max(0.12, this.charge));
        const big = cb > 0.55;
        this.projs.push({ ...base, y: m.y - 8, vy: -(1450 + 380 * cb), color: big ? '#7fe4ff' : '#ffe27a', sz: 0.7 + cb * 1.9 });
        this.recoil = 9 + cb * 12;
        this.shake = Math.max(this.shake, 3 + cb * 7);
        this.flash(m.x, m.y - 8, big ? '#7fe4ff' : '#ffe27a', 0.9 + cb * 1.4, true);
        this.ring(m.x, m.y - 8, big ? '#bfeaff' : '#fff2b0', 26 + cb * 40, 0.3);
        this.glowP(m.x, m.y - 8, big ? '#7fe4ff' : '#ffe27a', 40 + cb * 60, 0.22);
        break;
      }
      case 'acid': {
        for (let i = 0; i < 3; i++) {
          this.projs.push({ ...base, x: m.x + (i - 1) * 10, y: m.y + Math.abs(i - 1) * 6, vy: -1180 - Math.random() * 220, vx: (i - 1) * 110, sz: 0.85 + Math.random() * 0.35 });
        }
        this.recoil = 7;
        this.flash(m.x, m.y, '#b6ff2a', 0.9, true);
        for (let i = 0; i < 16; i++) {
          const a = -Math.PI / 2 + (Math.random() - 0.5) * 0.9, sp = 180 + Math.random() * 380;
          this.p({ x: m.x, y: m.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.5 + Math.random() * 0.4, size: 2.5 + Math.random() * 3.5, color: '#b6ff2a', type: 'ember', g: 700, drag: 0.97 });
        }
        this.glowP(m.x, m.y, '#b6ff2a', 44, 0.2);
        break;
      }
    }
    if (w.kind !== 'burst') sfx.shot(w.kind, this.widx, this.charge);
  }

  flash(x: number, y: number, color: string, s: number, energy?: boolean) {
    this.p({ x, y, life: 0.06 + 0.03 * s, size: 22 * s, color, type: energy ? 'eflash' : 'flash', rot: Math.random() * 6 });
    this.glowP(x, y, color, 50 * s, 0.1);
    this.sparks(x, y, energy ? 6 : 4, color, 300, 0.4, -Math.PI / 2);
  }

  /* ---------------- hit ---------------- */
  localA() { return Math.PI / 2 - this.wheel.angle; }

  addMark(type: string, color: string, len?: number, size = 1) {
    const seed = Math.floor(Math.random() * 1e6);
    this.marks.push({ type, a: this.localA(), born: this.t, color, len, seed, geo: markGeo(type, seed, size) });
    if (this.marks.length > 70) {
      const i = this.marks.findIndex(m => m.type !== 'arrow');
      this.marks.splice(i >= 0 ? i : 0, 1);
    }
  }

  hit(kind: string, dmg: number, proj?: Proj) {
    const wl = this.wheel;
    if (wl.broken) return;
    const x = WC.x, y = HITY;
    const w = WEAPONS[proj ? proj.widx : this.widx];
    wl.kick = Math.min(14, wl.kick + dmg * 0.5);
    wl.flash = 1;
    sfx.impact(kind, proj ? proj.widx : this.widx);
    switch (kind) {
      case 'bullet':
        this.sparks(x, y, 14, w.electro ? w.color : '#ffd27a', 500);
        this.chips(x, y, 6);
        this.smoke(x, y, 2, '150,130,110', 8);
        this.glowP(x, y, w.electro ? w.color : '#ffaa44', 30, 0.12);
        this.addMark(w.electro ? 'escorch' : 'hole', w.color);
        if (w.electro) {
          this.ring(x, y, w.color, 34, 0.3);
          for (let i = 0; i < 3; i++) this.p({ x, y, life: 0.25, size: 50 + Math.random() * 40, color: w.color, type: 'arc', rot: Math.PI + Math.random() * Math.PI });
        }
        break;
      case 'arrow':
        this.chips(x, y, 18);
        this.sparks(x, y, 12, '#fff3c4', 420);
        this.ring(x, y, '#ffd27a', 36, 0.25);
        this.addMark('arrow', '#fff');
        wl.kick += 10;
        this.shake = Math.max(this.shake, 6.5);
        break;
      case 'beam': {
        const sn = this.widx === 6 || (proj && proj.widx === 6);
        this.sparks(x, y, sn ? 40 : 18, w.color, sn ? 700 : 450);
        this.ring(x, y, w.color, sn ? 70 : 34, 0.35);
        this.glowP(x, y, w.color, sn ? 90 : 50, 0.3);
        this.chips(x, y, sn ? 10 : 3);
        this.smoke(x, y, sn ? 6 : 2, '90,70,70', 10);
        for (let i = 0; i < 8; i++) this.p({ x, y, vx: (Math.random() - 0.5) * 200, vy: 50 + Math.random() * 150, life: 1 + Math.random(), size: 1.5 + Math.random() * 1.5, color: '#ffb070', type: 'ember', g: -40, drag: 0.97 });
        this.addMark('melt', w.color, undefined, this.widx === 6 ? 1.7 : 0.85);
        break;
      }
      case 'repulsor':
        this.sparks(x, y, 24, '#bff4ff', 550);
        for (let i = 0; i < 3; i++) this.ring(x, y, '#9feaff', 30 + i * 22, 0.3 + i * 0.1);
        this.glowP(x, y, '#9feaff', 80, 0.3);
        this.chips(x, y, 8);
        this.addMark('dent', w.color, undefined, 1.2);
        break;
      case 'heat':
        break;
      case 'fire':
        for (let i = 0; i < 60; i++) {
          const a = Math.random() * Math.PI * 2, s = 100 + Math.random() * 400;
          this.p({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s * 0.7 + 50, life: 0.4 + Math.random() * 0.5, size: 10 + Math.random() * 16, color: '', type: 'flame', drag: 0.93, g: -250 });
        }
        this.ring(x, y, '#ffaa33', 80, 0.45);
        this.glowP(x, y, '#ff7a1a', 130, 0.4);
        this.smoke(x, y, 10, '60,45,40', 18);
        this.chips(x, y, 10);
        this.sparks(x, y, 30, '#ffcc55', 600, Math.PI);
        this.addMark('burn', '#ff6a00', undefined, 1.35);
        wl.heat = Math.min(1, wl.heat + 0.5);
        this.shake = Math.max(this.shake, 9);
        break;
      case 'slash':
        this.sparks(x, y, 30, '#9fe0ff', 550, 1.5);
        this.glowP(x, y, '#4fc8ff', 80, 0.25);
        this.p({ x, y, life: 0.3, size: 120, color: '#4fc8ff', type: 'slashfx', rot: 0 });
        this.chips(x, y, 8);
        this.addMark('cut', '#4fc8ff', undefined, 2);
        this.shake = Math.max(this.shake, 4);
        break;
      case 'plasma': {
        const burst = proj !== undefined && proj.widx === 16;
        const s = burst ? 0.62 : 1;
        const col = burst ? '#ff7a3a' : '#4aa8ff';
        const soft = burst ? '#ffd0a0' : '#9fd4ff';
        this.ring(x, y, soft, 42 * s, 0.3);
        this.ring(x, y, col, 92 * s, 0.5);
        this.glowP(x, y, col, 140 * s, 0.35);
        this.sparks(x, y, burst ? 26 : 40, soft, 650, Math.PI);
        for (let i = 0; i < (burst ? 3 : 5); i++) this.p({ x, y, life: 0.3, size: (60 + Math.random() * 50) * s, color: burst ? '#ffc090' : '#8fd0ff', type: 'arc', rot: Math.random() * Math.PI * 2 });
        this.chips(x, y, burst ? 8 : 14);
        this.smoke(x, y, burst ? 3 : 6, burst ? '120,90,80' : '90,110,140', 13 * s);
        this.addMark('melt', col, undefined, 1.25 * s);
        this.shake = Math.max(this.shake, burst ? 5 : 8);
        break;
      }
      case 'spine':
        this.sparks(x, y, 22, '#c8ff8a', 430);
        for (let i = 0; i < 15; i++) {
          const a = Math.random() * Math.PI * 2, sp = 80 + Math.random() * 270;
          this.p({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.8 + 60, life: 0.5 + Math.random() * 0.55, size: 3 + Math.random() * 4, color: '#8dff5a', type: 'ember', g: 320, drag: 0.95 });
        }
        this.smoke(x, y, 5, '108,182,68', 14);
        this.glowP(x, y, '#8dff5a', 74, 0.35);
        this.ring(x, y, '#a6ff6a', 48, 0.35);
        this.chips(x, y, 8);
        this.addMark('acid', '#8dff5a', undefined, 1.15);
        this.shake = Math.max(this.shake, 2);
        break;
      case 'singularity':
        for (let i = 0; i < 28; i++) {
          const a = Math.random() * Math.PI * 2, sp = 420 + Math.random() * 330;
          this.p({ x, y, vx: -Math.cos(a) * sp, vy: -Math.sin(a) * sp, life: 0.28 + Math.random() * 0.26, size: 2 + Math.random() * 3, color: '#c79bff', type: 'spark', drag: 0.9 });
        }
        this.ring(x, y, '#b26cff', 74, 0.4);
        this.ring(x, y, '#e2c7ff', 36, 0.3);
        this.ring(x, y, '#7a2fff', 132, 0.62);
        this.glowP(x, y, '#8a3cff', 172, 0.45);
        this.chips(x, y, 16);
        this.smoke(x, y, 8, '58,28,92', 18);
        this.addMark('void', '#b26cff', undefined, 1.3);
        this.shake = Math.max(this.shake, 11);
        break;
      case 'shard':
        this.sparks(x, y, 26, '#d6f6ff', 520);
        for (let i = 0; i < 17; i++) {
          const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.7, sp = 220 + Math.random() * 380;
          this.p({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.7 + Math.random() * 0.6, size: 2.5 + Math.random() * 3.5, color: '#a8ecff', type: 'chip', g: 900, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 26, add: true });
        }
        this.ring(x, y, '#bff0ff', 54, 0.32);
        this.glowP(x, y, '#7fe8ff', 92, 0.3);
        this.smoke(x, y, 3, '168,214,236', 12);
        this.addMark('frost', '#7fe8ff', undefined, 1.25);
        this.shake = Math.max(this.shake, 5);
        break;
      case 'buster': {
        const big = proj !== undefined && (proj.sz ?? 1) > 1.4;
        const col = proj ? proj.color : w.color;
        this.sparks(x, y, big ? 34 : 18, col, big ? 640 : 420, Math.PI);
        this.ring(x, y, col, big ? 92 : 46, 0.38);
        if (big) this.ring(x, y, '#ffffff', 40, 0.25);
        this.glowP(x, y, col, big ? 160 : 72, 0.32);
        for (let i = 0; i < (big ? 4 : 2); i++) this.p({ x, y, life: 0.3, size: 42 + Math.random() * 42, color: col, type: 'arc', rot: Math.random() * Math.PI * 2 });
        this.chips(x, y, big ? 16 : 8);
        this.smoke(x, y, big ? 6 : 3, '118,148,192', 14);
        this.addMark('melt', col, undefined, big ? 1.55 : 0.95);
        this.shake = Math.max(this.shake, big ? 9 : 3);
        break;
      }
      case 'acid':
        this.sparks(x, y, 24, '#d6ff8a', 470);
        for (let i = 0; i < 22; i++) {
          const a = Math.random() * Math.PI * 2, sp = 90 + Math.random() * 320;
          this.p({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.85 + 70, life: 0.55 + Math.random() * 0.6, size: 3 + Math.random() * 5, color: '#b6ff2a', type: 'ember', g: 700, drag: 0.95 });
        }
        this.smoke(x, y, 7, '118,190,60', 16);
        this.glowP(x, y, '#b6ff2a', 84, 0.38);
        this.ring(x, y, '#c8ff6a', 54, 0.35);
        this.chips(x, y, 10);
        this.addMark('acid', '#b6ff2a', undefined, 1.4);
        this.shake = Math.max(this.shake, 3);
        break;
      case 'disc':
        this.sparks(x, y, 26, '#7ff8ff', 500);
        this.glowP(x, y, '#00f0ff', 60, 0.2);
        this.ring(x, y, '#00f0ff', 50, 0.3);
        this.chips(x, y, 8);
        this.addMark('cut', '#00f0ff', 30);
        break;
    }
    this.damage(dmg);
  }

  damage(d: number, count = true) {
    const wl = this.wheel;
    if (wl.broken) return;
    wl.hp -= d;
    if (count) this.hits++;
    if (wl.hp <= 0) this.breakWheel();
    this.onStats?.(this.hits, this.kills);
  }

  breakWheel() {
    const wl = this.wheel;
    wl.broken = true; wl.respawn = 1.8; this.kills++;
    sfx.breakWheel();
    this.pieces = [];
    const n = 7;
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * Math.PI * 2 + wl.angle, a1 = ((i + 1) / n) * Math.PI * 2 + wl.angle, am = (a0 + a1) / 2;
      const s = 250 + Math.random() * 250;
      this.pieces.push({ a0: a0 - wl.angle, a1: a1 - wl.angle, x: WC.x, y: WC.y, vx: Math.cos(am) * s, vy: Math.sin(am) * s - 250, rot: wl.angle, vr: (Math.random() - 0.5) * 10 });
    }
    // fling arrows
    for (const m of this.marks) if (m.type === 'arrow') {
      const a = m.a + wl.angle;
      this.p({ x: WC.x + Math.cos(a) * (R + 20), y: WC.y + Math.sin(a) * (R + 20), vx: Math.cos(a) * 400, vy: Math.sin(a) * 400 - 200, life: 1.6, size: 1, color: '', type: 'farrow', g: 1200, rot: a, vr: (Math.random() - 0.5) * 16, add: false });
    }
    this.marks = [];
    this.chips(WC.x, WC.y, 50);
    for (let i = 0; i < 40; i++) {
      const a = Math.random() * 7, s = Math.random() * 600;
      this.p({ x: WC.x, y: WC.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 1.2, size: 3 + Math.random() * 4, color: ['#d9a05f', '#a0652c', '#e8c08a'][i % 3], type: 'chip', g: 1200, rot: 0, vr: 20, add: false });
    }
    this.smoke(WC.x, WC.y, 14, '160,130,100', 22);
    this.ring(WC.x, WC.y, '#fff3c4', 160, 0.5);
    this.glowP(WC.x, WC.y, '#ffd27a', 200, 0.3);
    this.shake = 16;
    this.discOut = this.projs.some(p => p.kind === 'disc');
  }

  /* ---------------- update ---------------- */
  update(dt: number) {
    this.t += dt;
    const wl = this.wheel, w = this.w;
    // wheel rotation (knife hit style variable)
    wl.phase += dt;
    const target = 1.5 + Math.sin(wl.phase * 0.7) * 1.6 + Math.sin(wl.phase * 1.9) * 0.6;
    wl.speed += (target - wl.speed) * Math.min(1, dt * 2);
    wl.angle += wl.speed * dt;
    wl.kick *= Math.pow(0.001, dt);
    wl.flash = Math.max(0, wl.flash - dt * 6);
    wl.heat = Math.max(0, wl.heat - dt * 0.25);
    if (wl.broken) {
      wl.respawn -= dt;
      if (wl.respawn <= 0) {
        wl.broken = false; wl.hp = MAXHP; wl.heat = 0; this.pieces = []; this.makeCracks();
        this.ring(WC.x, WC.y, '#ffffff', 130, 0.4);
      }
    }
    this.recoil *= Math.pow(0.0005, dt);
    this.shake *= Math.pow(0.002, dt);
    this.swing *= Math.pow(0.001, dt);
    this.bannerT = Math.max(0, this.bannerT - dt);

    // charging (bow / repulsor visual)
    if (w.kind === 'arrow') this.charge = this.holding ? 0.35 : 0;
    if (w.kind === 'repulsor') this.charge = Math.min(1, (this.t * 1000 - this.lastFire) / w.rate) * 0.5;
    if (w.kind === 'buster') {
      const target = this.holding ? Math.min(1, (this.t - this.busterStart) / 0.9) : 0;
      this.charge += (target - this.charge) * Math.min(1, dt * 22);
      if (this.holding) {
        const tick = Math.floor(this.charge * 4);
        if (tick !== this.busterTick && tick > 0) { this.busterTick = tick; sfx.charge(this.widx); }
      }
    }
    if (w.kind === 'burst') {
      const idle = Math.min(1, (this.t * 1000 - this.lastFire) / w.rate) * 0.3;
      this.charge = this.burstLeft > 0 || this.lockT > 0 ? 0.6 + 0.4 * Math.sin(this.t * 22) : idle;
    }

    if (this.holding && w.auto && w.kind !== 'stream') this.tryFire();

    // predator shoulder cannon burst (3-bolt volley)
    this.lockT = Math.max(0, this.lockT - dt);
    if (this.burstLeft > 0) {
      this.burstT -= dt;
      if (this.burstT <= 0) {
        this.burstLeft--;
        this.burstT = 0.14;
        const m = this.muzzle();
        this.projs.push({ kind: 'plasma', x: m.x + (Math.random() - 0.5) * 5, y: m.y, vx: 0, vy: -1450, t: 0, color: '#ff7a3a', trail: [], widx: this.widx });
        this.recoil = 15;
        this.shake = Math.max(this.shake, 6);
        this.flash(m.x, m.y, '#ff8a3a', 1.35, true);
        this.ring(m.x, m.y, '#ffb070', 34, 0.26);
        sfx.shot('burst', this.widx);
      }
    }

    // proton stream
    this.streamOn = this.holding && w.kind === 'stream';
    if (this.streamOn) {
      const m = this.muzzle();
      this.recoil = 4 + Math.random() * 3;
      this.shake = Math.max(this.shake, 2.5);
      if (!wl.broken) {
        this.damage(w.dmg * dt, false);
        wl.flash = 0.5;
        wl.kick = Math.max(wl.kick, 3 + Math.random() * 3);
        if (Math.random() < dt * 60) this.sparks(WC.x, HITY, 2, Math.random() < 0.5 ? '#ffb070' : '#7fc8ff', 400);
        if (Math.random() < dt * 20) this.p({ x: WC.x, y: HITY, life: 0.2, size: 50, color: '#ff9a4a', type: 'arc', rot: Math.PI + Math.random() * Math.PI });
        if (Math.random() < dt * 8) this.addMark('escorch', '#ff8a2a');
        if (Math.random() < dt * 10) this.smoke(WC.x, HITY, 1, '120,100,90', 10);
        this.glowP(WC.x, HITY, '#ff8a2a', 50 + Math.random() * 20, 0.05);
      }
      this.glowP(m.x, m.y, '#ffc070', 30, 0.05);
    }

    // heat-ray continuous damage
    for (const b of this.beams) {
      b.life -= dt;
      if (b.kind === 'heat' && !wl.broken) {
        this.damage((WEAPONS[14].dmg / 0.9) * dt, false);
        wl.heat = Math.min(1, wl.heat + dt * 1.5);
        wl.kick = Math.max(wl.kick, 4);
        this.shake = Math.max(this.shake, 5);
        if (Math.random() < dt * 40) this.p({ x: WC.x + (Math.random() - 0.5) * 20, y: HITY, vx: (Math.random() - 0.5) * 200, vy: 80 + Math.random() * 200, life: 1.2, size: 2 + Math.random() * 2, color: '#ffcc88', type: 'ember', g: -80, drag: 0.97 });
        if (Math.random() < dt * 30) this.smoke(WC.x, HITY, 1, '60,60,55', 14);
        this.sparks(WC.x, HITY, 1, '#f4ffcc', 500);
        if (Math.random() < dt * 6) this.addMark('melt', '#ff9a3a');
      }
    }
    this.beams = this.beams.filter(b => b.life > 0);

    // projectiles
    for (const p of this.projs) {
      p.t += dt;
      p.trail.push({ x: p.x, y: p.y });
      if (p.trail.length > 18) p.trail.shift();
      if (p.kind === 'fire' && !p.bounce) p.vx = Math.cos(p.t * 16) * 160;
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.rot !== undefined) p.rot += dt * (p.kind === 'disc' ? 30 : 12);
      if (p.bounce) { p.vy += 1600 * dt; if (p.y > CH + 50) p.dead = true; continue; }
      if (p.kind === 'fire' && Math.random() < 0.9) {
        this.p({ x: p.x, y: p.y + 10, vx: (Math.random() - 0.5) * 80, vy: 80 + Math.random() * 80, life: 0.35, size: 9 + Math.random() * 8, color: '', type: 'flame', g: -60 });
      }
      if (p.kind === 'acid') {
        p.vy += 620 * dt;
        p.vx += Math.sin(p.t * 18) * 26 * dt;
        if (Math.random() < 0.55) {
          this.p({ x: p.x + (Math.random() - 0.5) * 8, y: p.y + 6, vx: (Math.random() - 0.5) * 44, vy: 60 + Math.random() * 90, life: 0.5, size: 2 + Math.random() * 2.2, color: '#b6ff2a', type: 'ember', g: 520, drag: 0.98 });
        }
      }
      if (p.kind === 'buster' && (p.sz ?? 1) > 1.4 && Math.random() < 0.8) {
        this.p({ x: p.x + (Math.random() - 0.5) * 14, y: p.y + 10, vx: (Math.random() - 0.5) * 60, vy: 90, life: 0.22, size: 2.2, color: p.color, type: 'spark', drag: 0.95 });
      }
      if (p.kind === 'plasma' && Math.random() < 0.8) this.p({ x: p.x + (Math.random() - 0.5) * 10, y: p.y + 6, vx: (Math.random() - 0.5) * 60, vy: 60, life: 0.3, size: 2, color: '#9fd4ff', type: 'spark' });
      if (p.kind === 'disc' && p.returning) {
        if (p.y >= G.y - 14) { p.dead = true; this.discOut = false; this.ring(G.x, G.y - 14, '#00f0ff', 30, 0.25); }
        continue;
      }
      const tipY = p.kind === 'arrow' ? p.y - 140 : p.kind === 'disc' ? p.y - 26 : p.kind === 'spine' ? p.y - 32 : p.kind === 'shard' ? p.y - 36 : p.kind === 'buster' ? p.y - 16 * (p.sz ?? 1) : p.kind === 'acid' ? p.y - 12 : p.y;
      if (tipY <= HITY && !this.wheel.broken) {
        if (p.kind === 'arrow') {
          const la = this.localA();
          const clash = this.marks.some(m => m.type === 'arrow' && Math.abs(Math.atan2(Math.sin(m.a - la), Math.cos(m.a - la))) < 0.14);
          if (clash) {
            p.bounce = true; p.vy = 300; p.vx = (Math.random() - 0.5) * 500; p.rot = 0;
            this.sparks(WC.x, HITY + 10, 20, '#ffffff', 450);
            this.ring(WC.x, HITY, '#ffffff', 30, 0.2);
            this.shake = 8;
            continue;
          }
        }
        if (p.kind === 'disc') {
          this.hit('disc', WEAPONS[p.widx].dmg, p);
          p.returning = true; p.vy = 1300;
          continue;
        }
        p.dead = true;
        this.hit(p.kind, WEAPONS[p.widx].dmg * (p.sz ?? 1), p);
      }
      if (p.y < -100) { p.dead = true; if (p.kind === 'disc') this.discOut = false; }
      if (p.kind === 'disc' && p.y < -40) { p.dead = false; p.returning = true; p.vy = 1300; }
    }
    this.projs = this.projs.filter(p => !p.dead);

    // continuous weapon loops (proton stream / heat-ray)
    const wantLoop = this.streamOn ? 'stream' : this.beams.some(b => b.kind === 'heat') ? 'heat' : '';
    if (wantLoop !== this.looping) {
      if (this.looping) sfx.stopLoop();
      if (wantLoop) sfx.startLoop(wantLoop);
      this.looping = wantLoop;
    }

    // burn marks emit flames
    if (!wl.broken) for (const m of this.marks) {
      if ((m.type === 'burn' && this.t - m.born < 2.5) || (m.type === 'melt' && this.t - m.born < 1)) {
        if (Math.random() < dt * (m.type === 'burn' ? 40 : 10)) {
          const a = m.a + wl.angle;
          const x = WC.x + Math.cos(a) * (R - 8), y = WC.y + Math.sin(a) * (R - 8) - wl.kick;
          if (m.type === 'burn') this.p({ x, y, vx: (Math.random() - 0.5) * 40, vy: -80 - Math.random() * 60, life: 0.4, size: 7 + Math.random() * 6, color: '', type: 'flame', g: -100 });
          else this.p({ x, y, vx: 0, vy: -30, life: 0.8, size: 5, color: '90,90,90', type: 'smoke', add: false });
        }
      }
    }

    // particles
    for (const q of this.parts) {
      q.life -= dt;
      if (q.drag) { q.vx *= Math.pow(q.drag, dt * 60); q.vy *= Math.pow(q.drag, dt * 60); }
      if (q.g) q.vy += q.g * dt;
      q.x += q.vx * dt; q.y += q.vy * dt;
      if (q.vr) q.rot = (q.rot || 0) + q.vr * dt;
      if ((q.type === 'shell' || q.type === 'chip') && q.y > CH - 20 && q.vy > 0) { q.vy *= -0.35; q.vx *= 0.6; q.vr = (q.vr || 0) * 0.5; }
    }
    this.parts = this.parts.filter(q => q.life > 0);
    if (this.parts.length > 1400) this.parts.splice(0, this.parts.length - 1400);

    for (const pc of this.pieces) {
      pc.vy += 1300 * dt; pc.x += pc.vx * dt; pc.y += pc.vy * dt; pc.rot += pc.vr * dt;
    }
  }

  /* ---------------- render ---------------- */
  render() {
    const c = this.c, wl = this.wheel;
    c.save();
    // background
    const bg = c.createRadialGradient(WC.x, WC.y, 20, WC.x, WC.y + 200, 700);
    bg.addColorStop(0, '#1d2340'); bg.addColorStop(0.5, '#0d1024'); bg.addColorStop(1, '#04050c');
    c.fillStyle = bg; c.fillRect(0, 0, CW, CH);
    for (const s of this.stars) {
      c.fillStyle = `rgba(200,210,255,${0.2 + 0.5 * Math.abs(Math.sin(this.t * (0.5 + s.s) + s.x))})`;
      c.fillRect(s.x, s.y, 1 + s.s, 1 + s.s);
    }
    // floor
    const fg = c.createLinearGradient(0, CH - 60, 0, CH);
    fg.addColorStop(0, 'rgba(0,0,0,0)'); fg.addColorStop(1, 'rgba(40,60,120,.25)');
    c.fillStyle = fg; c.fillRect(0, CH - 60, CW, 60);

    const sx = (Math.random() - 0.5) * this.shake, sy = (Math.random() - 0.5) * this.shake;
    c.translate(sx, sy);

    // heat glow behind wheel
    if (wl.heat > 0.01 && !wl.broken) {
      c.globalCompositeOperation = 'lighter';
      const hg = c.createRadialGradient(WC.x, WC.y, R * 0.6, WC.x, WC.y, R * 1.6);
      hg.addColorStop(0, `rgba(255,120,30,${wl.heat * 0.5})`); hg.addColorStop(1, 'rgba(255,60,0,0)');
      c.fillStyle = hg; c.beginPath(); c.arc(WC.x, WC.y, R * 1.6, 0, 7); c.fill();
      c.globalCompositeOperation = 'source-over';
    }

    if (!wl.broken) this.drawWheel();
    else this.drawPieces();

    // plasmacaster tri-laser
    if (this.widx === 11 && !wl.broken) {
      c.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 3; i++) {
        const a = Math.PI / 2 + (i - 1) * 0.12 + Math.PI * 1.5 * 0;
        const px = WC.x + Math.cos(-Math.PI / 2 + (i * 2 * Math.PI) / 3 + this.t * 2) * 7, py = HITY - 10 + Math.sin(-Math.PI / 2 + (i * 2 * Math.PI) / 3 + this.t * 2) * 7;
        void a;
        c.strokeStyle = 'rgba(255,0,0,.12)'; c.lineWidth = 1;
        c.beginPath(); c.moveTo(G.x, G.y - 104); c.lineTo(px, py); c.stroke();
        const g = c.createRadialGradient(px, py, 0, px, py, 7);
        g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.3, 'rgba(255,0,0,.9)'); g.addColorStop(1, 'rgba(255,0,0,0)');
        c.fillStyle = g; c.beginPath(); c.arc(px, py, 7, 0, 7); c.fill();
      }
      c.globalCompositeOperation = 'source-over';
    }
    // predator shoulder cannon — target lock reticle
    if (this.widx === 16 && !wl.broken) {
      const f = this.lockT > 0 ? 1 - this.lockT / 0.34 : 1;
      const rad = 74 - 46 * f + Math.sin(this.t * 4) * 2;
      const m = this.muzzle();
      c.save();
      c.globalCompositeOperation = 'lighter';
      c.strokeStyle = `rgba(255,60,30,${0.25 + 0.4 * f})`; c.lineWidth = 1;
      c.beginPath(); c.moveTo(m.x, m.y); c.lineTo(WC.x, HITY); c.stroke();
      c.translate(WC.x, HITY);
      c.rotate(this.t * 0.9);
      for (let i = 0; i < 4; i++) {
        const a = (i * Math.PI) / 2;
        const x0 = Math.cos(a) * rad, y0 = Math.sin(a) * rad;
        const x1 = Math.cos(a + 0.28) * rad, y1 = Math.sin(a + 0.28) * rad;
        c.strokeStyle = 'rgba(255,80,40,.95)'; c.lineWidth = 2.2;
        c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke();
      }
      c.rotate(-this.t * 0.9);
      c.strokeStyle = `rgba(255,60,30,${0.5 + 0.4 * f})`; c.lineWidth = 1.1;
      c.beginPath(); c.arc(0, 0, rad * 0.62, 0, 7); c.stroke();
      for (let i = 0; i < 3; i++) {
        const a = -Math.PI / 2 + (i * Math.PI * 2) / 3 + this.t * 1.6;
        const g = c.createRadialGradient(Math.cos(a) * 16, Math.sin(a) * 16, 0, Math.cos(a) * 16, Math.sin(a) * 16, 5);
        g.addColorStop(0, '#fff'); g.addColorStop(0.4, 'rgba(255,60,30,.9)'); g.addColorStop(1, 'rgba(255,60,30,0)');
        c.fillStyle = g; c.beginPath(); c.arc(Math.cos(a) * 16, Math.sin(a) * 16, 5, 0, 7); c.fill();
      }
      const cg3 = c.createRadialGradient(0, 0, 0, 0, 0, 6);
      cg3.addColorStop(0, 'rgba(255,120,80,.9)'); cg3.addColorStop(1, 'rgba(255,60,30,0)');
      c.fillStyle = cg3; c.beginPath(); c.arc(0, 0, 6, 0, 7); c.fill();
      c.restore();
    }
    // sniper laser sight
    if (this.widx === 6 && !wl.broken) {
      const m = this.muzzle();
      c.globalCompositeOperation = 'lighter';
      c.strokeStyle = 'rgba(255,40,100,.35)'; c.lineWidth = 1;
      c.beginPath(); c.moveTo(m.x, m.y); c.lineTo(WC.x, HITY); c.stroke();
      const g = c.createRadialGradient(WC.x, HITY, 0, WC.x, HITY, 8);
      g.addColorStop(0, '#fff'); g.addColorStop(0.4, 'rgba(255,40,100,.8)'); g.addColorStop(1, 'rgba(255,40,100,0)');
      c.fillStyle = g; c.beginPath(); c.arc(WC.x, HITY, 8, 0, 7); c.fill();
      c.globalCompositeOperation = 'source-over';
    }

    this.drawBeams();
    if (this.streamOn) this.drawStream();
    this.drawProjs();
    this.drawParts(false);
    this.drawGun();
    this.drawParts(true);
    c.restore();
    this.drawHUD();
  }

  drawWheel() {
    const c = this.c, wl = this.wheel;
    const cy = WC.y - wl.kick;
    // shadow
    c.fillStyle = 'rgba(0,0,0,.45)';
    c.beginPath(); c.ellipse(WC.x + 6, cy + 10, R + 4, R + 4, 0, 0, 7); c.fill();
    c.save();
    c.translate(WC.x, cy);
    c.rotate(wl.angle);
    const s = R * 2 + 8;
    c.drawImage(this.tex, -s / 2, -s / 2, s, s);
    // damage cracks
    const dmgF = 1 - wl.hp / MAXHP;
    const nCr = Math.floor(dmgF * this.cracks.length * 1.1);
    c.strokeStyle = 'rgba(40,18,4,.85)'; c.lineWidth = 1.6;
    for (let i = 0; i < Math.min(nCr, this.cracks.length); i++) {
      const path = this.cracks[i];
      c.beginPath(); path.forEach(([x, y], j) => (j ? c.lineTo(x, y) : c.moveTo(x, y))); c.stroke();
    }
    // marks
    for (const m of this.marks) {
      if (m.type === 'arrow') continue;
      c.save(); c.rotate(m.a); c.translate(R - 10, 0);
      const age = this.t - m.born;
      this.drawMark(m, age);
      c.restore();
    }
    // stuck arrows (protruding outward)
    for (const m of this.marks) if (m.type === 'arrow') {
      c.save(); c.rotate(m.a);
      // arrow pointing inward: tip at R-18, tail at R+122
      c.translate(R + 122, 0); c.rotate(Math.PI);
      drawArrowShape(c, 0, 0, 140);
      c.restore();
    }
    // hit flash + heat tint
    if (wl.flash > 0 || wl.heat > 0) {
      c.globalCompositeOperation = 'lighter';
      c.fillStyle = `rgba(255,${200 - wl.heat * 120},${150 - wl.heat * 150},${wl.flash * 0.12 + wl.heat * 0.25})`;
      c.beginPath(); c.arc(0, 0, R, 0, 7); c.fill();
      c.globalCompositeOperation = 'source-over';
    }
    c.restore();
    // hub
    const hg = c.createRadialGradient(WC.x - 3, cy - 3, 0, WC.x, cy, 12);
    hg.addColorStop(0, '#f5f5f5'); hg.addColorStop(1, '#3a3a3a');
    c.fillStyle = hg; c.beginPath(); c.arc(WC.x, cy, 10, 0, 7); c.fill();
  }

  drawMark(m: Mark, age: number) {
    const c = this.c;
    const hot = Math.max(0, 1 - age / 1.8);
    const g = m.geo;
    if (!g.length) return;
    c.save();
    const polyPath = (l: number[]) => {
      c.beginPath(); c.moveTo(l[0], l[1]);
      for (let k = 2; k < l.length; k += 2) c.lineTo(l[k], l[k + 1]);
    };
    const linePath = (l: number[]) => {
      c.beginPath(); c.moveTo(l[0], l[1]);
      for (let k = 2; k < l.length; k += 2) c.lineTo(l[k], l[k + 1]);
    };
    switch (m.type) {
      case 'hole': case 'dent': {
        const isHole = m.type === 'hole';
        const nCracks = isHole ? 6 : 10;
        c.lineCap = 'round';
        c.strokeStyle = isHole ? 'rgba(78,44,14,.8)' : 'rgba(216,178,122,.45)';
        c.lineWidth = 1.2;
        for (let i = 1; i < Math.min(g.length, nCracks); i++) { linePath(g[i]); c.stroke(); }
        c.strokeStyle = 'rgba(244,212,156,.8)'; c.lineWidth = 1.1;
        for (let i = nCracks; i < g.length; i++) { linePath(g[i]); c.stroke(); }
        const p = g[0];
        polyPath(p); c.closePath();
        if (isHole) {
          const hg = c.createRadialGradient(-1, -1, 0, 0, 0, 8);
          hg.addColorStop(0, '#060200'); hg.addColorStop(0.5, '#281406'); hg.addColorStop(1, 'rgba(96,54,18,0)');
          c.fillStyle = hg; c.fill();
          c.strokeStyle = 'rgba(248,216,162,.5)'; c.lineWidth = 1; c.stroke();
          c.strokeStyle = 'rgba(184,122,52,.32)'; c.lineWidth = 2.6;
          c.beginPath(); c.arc(0, 0, 5.4, 0.35, 3.5); c.stroke();
        } else {
          const dg = c.createRadialGradient(0, 0, 0, 0, 0, 14);
          dg.addColorStop(0, 'rgba(34,18,6,.8)'); dg.addColorStop(0.6, 'rgba(66,36,14,.42)'); dg.addColorStop(1, 'rgba(66,36,14,0)');
          c.fillStyle = dg; c.fill();
          c.strokeStyle = 'rgba(255,226,178,.32)'; c.lineWidth = 1.1; c.stroke();
          c.strokeStyle = 'rgba(255,255,255,.14)'; c.lineWidth = 1;
          c.beginPath(); c.arc(0, 0, 11, -2.6, -0.4); c.stroke();
        }
        if (hot > 0 && m.color && m.color !== '#fff') {
          c.globalCompositeOperation = 'lighter';
          c.shadowColor = m.color; c.shadowBlur = 10;
          c.strokeStyle = m.color; c.globalAlpha = hot * 0.55; c.lineWidth = 1.3;
          c.beginPath(); c.arc(0, 0, 6, 0, 7); c.stroke();
          c.shadowBlur = 0; c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
        }
        break;
      }
      case 'escorch': {
        const p = g[0];
        polyPath(p); c.closePath();
        const cg = c.createRadialGradient(0, 0, 0, 0, 0, 11);
        cg.addColorStop(0, 'rgba(18,8,2,.9)'); cg.addColorStop(0.55, 'rgba(46,22,6,.5)'); cg.addColorStop(1, 'rgba(46,22,6,0)');
        c.fillStyle = cg; c.fill();
        c.lineCap = 'round'; c.lineJoin = 'round';
        for (let i = 1; i < g.length; i++) {
          linePath(g[i]);
          c.strokeStyle = 'rgba(22,10,3,.85)'; c.lineWidth = 2.2; c.stroke();
          c.strokeStyle = 'rgba(126,74,26,.55)'; c.lineWidth = 1; c.stroke();
        }
        if (hot > 0) {
          c.globalCompositeOperation = 'lighter';
          for (let i = 1; i < g.length; i++) {
            linePath(g[i]);
            c.shadowColor = m.color; c.shadowBlur = 8;
            c.strokeStyle = m.color; c.globalAlpha = hot * 0.8; c.lineWidth = 1.2; c.stroke();
            c.strokeStyle = '#fff'; c.globalAlpha = hot * 0.45; c.lineWidth = 0.6; c.stroke();
          }
          const gg = c.createRadialGradient(0, 0, 0, 0, 0, 12);
          gg.addColorStop(0, m.color); gg.addColorStop(1, 'rgba(0,0,0,0)');
          c.globalAlpha = hot * 0.55; c.fillStyle = gg; c.beginPath(); c.arc(0, 0, 12, 0, 7); c.fill();
          c.shadowBlur = 0; c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
        }
        break;
      }
      case 'burn': case 'melt': {
        const isBurn = m.type === 'burn';
        const halo = c.createRadialGradient(0, 0, 0, 0, 0, isBurn ? 27 : 16);
        halo.addColorStop(0, isBurn ? 'rgba(26,10,2,.85)' : 'rgba(22,12,6,.9)');
        halo.addColorStop(0.62, isBurn ? 'rgba(46,18,4,.4)' : 'rgba(52,30,12,.45)');
        halo.addColorStop(1, 'rgba(50,24,8,0)');
        c.fillStyle = halo; c.beginPath(); c.arc(0, 0, isBurn ? 27 : 16, 0, 7); c.fill();
        polyPath(g[0]); c.closePath();
        c.fillStyle = isBurn ? 'rgba(14,6,1,.92)' : 'rgba(9,5,2,.95)'; c.fill();
        c.strokeStyle = 'rgba(128,76,32,.5)'; c.lineWidth = 1.1; c.stroke();
        c.lineCap = 'round'; c.lineJoin = 'round';
        for (let i = 1; i < 7 && i < g.length; i++) { linePath(g[i]); c.strokeStyle = 'rgba(16,8,2,.85)'; c.lineWidth = 1.5; c.stroke(); }
        for (let i = 7; i < 10 && i < g.length; i++) { linePath(g[i]); c.strokeStyle = 'rgba(10,5,1,.9)'; c.lineWidth = 2.1; c.stroke(); }
        for (let i = 10; i < g.length; i++) {
          const l = g[i];
          c.fillStyle = 'rgba(32,15,3,.75)';
          c.beginPath(); c.arc(l[0], l[1], l[2], 0, 7); c.fill();
        }
        if (hot > 0) {
          c.globalCompositeOperation = 'lighter';
          const cg = c.createRadialGradient(0, 0, 0, 0, 0, isBurn ? 18 : 11);
          cg.addColorStop(0, isBurn ? `rgba(255,242,196,${hot})` : '#ffffff');
          cg.addColorStop(0.35, isBurn ? `rgba(255,132,22,${hot * 0.85})` : m.color);
          cg.addColorStop(1, 'rgba(255,60,0,0)');
          c.fillStyle = cg; c.beginPath(); c.arc(0, 0, isBurn ? 18 : 11, 0, 7); c.fill();
          c.shadowColor = isBurn ? '#ff7a1a' : m.color; c.shadowBlur = 10;
          for (let i = 1; i < 7 && i < g.length; i++) {
            linePath(g[i]);
            c.strokeStyle = isBurn ? '#ff8a22' : m.color; c.globalAlpha = hot * 0.85; c.lineWidth = 1.3; c.stroke();
            c.strokeStyle = '#fff'; c.globalAlpha = hot * 0.4; c.lineWidth = 0.6; c.stroke();
          }
          c.shadowBlur = 0; c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
        }
        break;
      }
      case 'acid': {
        const halo = c.createRadialGradient(0, 0, 0, 0, 0, 19);
        halo.addColorStop(0, 'rgba(28,46,10,.85)'); halo.addColorStop(0.55, 'rgba(44,72,16,.5)'); halo.addColorStop(1, 'rgba(44,72,16,0)');
        c.fillStyle = halo; c.beginPath(); c.arc(0, 0, 19, 0, 7); c.fill();
        polyPath(g[0]); c.closePath();
        c.fillStyle = 'rgba(17,26,5,.9)'; c.fill();
        c.strokeStyle = 'rgba(122,192,70,.5)'; c.lineWidth = 1.1; c.stroke();
        c.lineCap = 'round'; c.lineJoin = 'round';
        for (let i = 1; i < 6 && i < g.length; i++) {
          linePath(g[i]);
          c.strokeStyle = 'rgba(58,94,20,.75)'; c.lineWidth = 2.2; c.stroke();
          c.strokeStyle = 'rgba(152,232,86,.7)'; c.lineWidth = 1; c.stroke();
        }
        for (let i = 6; i < g.length; i++) {
          const l = g[i];
          c.fillStyle = 'rgba(122,202,70,.55)';
          c.beginPath(); c.arc(l[0], l[1], l[2], 0, 7); c.fill();
        }
        if (hot > 0) {
          c.globalCompositeOperation = 'lighter';
          const gg5 = c.createRadialGradient(0, 0, 0, 0, 0, 15);
          gg5.addColorStop(0, `rgba(196,255,126,${hot * 0.9})`); gg5.addColorStop(1, 'rgba(80,255,40,0)');
          c.fillStyle = gg5; c.beginPath(); c.arc(0, 0, 15, 0, 7); c.fill();
          c.shadowColor = '#8dff5a'; c.shadowBlur = 10;
          for (let i = 1; i < 6 && i < g.length; i++) {
            linePath(g[i]); c.strokeStyle = '#b6ff7a'; c.globalAlpha = hot * 0.85; c.lineWidth = 1.2; c.stroke();
          }
          c.shadowBlur = 0; c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
        }
        break;
      }
      case 'void': {
        const vhalo = c.createRadialGradient(0, 0, 0, 0, 0, 18);
        vhalo.addColorStop(0, 'rgba(6,2,12,.95)'); vhalo.addColorStop(0.5, 'rgba(38,12,72,.6)'); vhalo.addColorStop(1, 'rgba(70,24,130,0)');
        c.fillStyle = vhalo; c.beginPath(); c.arc(0, 0, 18, 0, 7); c.fill();
        polyPath(g[0]); c.closePath();
        c.fillStyle = '#05010c'; c.fill();
        c.strokeStyle = 'rgba(150,92,232,.42)'; c.lineWidth = 1.1; c.stroke();
        for (let i = 1; i < g.length; i++) { linePath(g[i]); c.strokeStyle = 'rgba(26,9,46,.85)'; c.lineWidth = 1.6; c.stroke(); }
        if (hot > 0) {
          c.globalCompositeOperation = 'lighter';
          c.shadowColor = '#b26cff'; c.shadowBlur = 14;
          for (let i = 1; i < g.length; i++) {
            linePath(g[i]); c.strokeStyle = '#c79bff'; c.globalAlpha = hot * 0.8; c.lineWidth = 1.1; c.stroke();
          }
          for (let i = 0; i < 4; i++) {
            const a = this.t * 2 + i * 1.6 + m.seed;
            c.fillStyle = '#e2c7ff'; c.globalAlpha = hot * 0.9;
            c.beginPath(); c.arc(Math.cos(a) * 11, Math.sin(a) * 7, 1.7, 0, 7); c.fill();
          }
          const gg6 = c.createRadialGradient(0, 0, 0, 0, 0, 13);
          gg6.addColorStop(0, `rgba(162,92,255,${hot * 0.8})`); gg6.addColorStop(1, 'rgba(90,20,200,0)');
          c.fillStyle = gg6; c.beginPath(); c.arc(0, 0, 13, 0, 7); c.fill();
          c.shadowBlur = 0; c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
        }
        break;
      }
      case 'frost': {
        c.globalAlpha = 1 - Math.min(0.75, Math.max(0, (age - 4) / 9));
        const fhalo = c.createRadialGradient(0, 0, 0, 0, 0, 18);
        fhalo.addColorStop(0, 'rgba(226,248,255,.85)'); fhalo.addColorStop(0.5, 'rgba(150,215,240,.4)'); fhalo.addColorStop(1, 'rgba(150,215,240,0)');
        c.fillStyle = fhalo; c.beginPath(); c.arc(0, 0, 18, 0, 7); c.fill();
        polyPath(g[0]); c.closePath();
        c.fillStyle = 'rgba(198,236,252,.32)'; c.fill();
        c.strokeStyle = 'rgba(228,249,255,.75)'; c.lineWidth = 1.1; c.stroke();
        for (let i = 1; i < 10 && i < g.length; i++) {
          linePath(g[i]);
          c.strokeStyle = 'rgba(22,62,86,.78)'; c.lineWidth = 1.6; c.stroke();
          c.strokeStyle = 'rgba(240,253,255,.85)'; c.lineWidth = 0.8; c.stroke();
        }
        for (let i = 10; i < g.length; i++) {
          const l = g[i];
          c.fillStyle = 'rgba(228,249,255,.72)';
          c.beginPath(); c.arc(l[0], l[1], l[2], 0, 7); c.fill();
        }
        if (hot > 0) {
          c.globalCompositeOperation = 'lighter';
          const gg7 = c.createRadialGradient(0, 0, 0, 0, 0, 15);
          gg7.addColorStop(0, `rgba(222,250,255,${hot})`); gg7.addColorStop(1, 'rgba(120,220,255,0)');
          c.fillStyle = gg7; c.beginPath(); c.arc(0, 0, 15, 0, 7); c.fill();
          c.globalCompositeOperation = 'source-over';
        }
        c.globalAlpha = 1;
        break;
      }
      case 'cut': {
        const l0 = g[0];
        const path = () => { c.beginPath(); c.moveTo(l0[0], l0[1]); for (let k = 2; k < l0.length; k += 2) c.lineTo(l0[k], l0[k + 1]); };
        for (let i = 1; i < 3 && i < g.length; i++) { linePath(g[i]); c.strokeStyle = 'rgba(62,34,12,.5)'; c.lineWidth = 1; c.stroke(); }
        c.lineCap = 'round';
        path(); c.strokeStyle = 'rgba(18,7,1,.95)'; c.lineWidth = 3.1; c.stroke();
        path(); c.strokeStyle = 'rgba(216,172,112,.32)'; c.lineWidth = 1.2; c.stroke();
        if (hot > 0) {
          c.globalCompositeOperation = 'lighter';
          c.shadowColor = m.color; c.shadowBlur = 14;
          path(); c.strokeStyle = m.color; c.globalAlpha = hot; c.lineWidth = 1.8; c.stroke();
          path(); c.strokeStyle = '#fff'; c.globalAlpha = hot * 0.7; c.lineWidth = 0.8; c.stroke();
          c.shadowBlur = 0; c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
        }
        for (let i = 3; i < g.length; i++) {
          const l = g[i];
          c.beginPath(); c.moveTo(l[0], l[1]); c.lineTo(l[2], l[3]);
          c.strokeStyle = 'rgba(224,188,128,.65)'; c.lineWidth = 1; c.stroke();
        }
        break;
      }
    }
    c.restore();
  }

  drawPieces() {
    const c = this.c, s = R * 2 + 8;
    for (const pc of this.pieces) {
      c.save();
      c.translate(pc.x, pc.y); c.rotate(pc.rot);
      c.beginPath(); c.moveTo(0, 0);
      const steps = 6;
      for (let i = 0; i <= steps; i++) {
        const a = pc.a0 + ((pc.a1 - pc.a0) * i) / steps;
        const r = R + (i % 2 ? -3 : 0);
        c.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      c.closePath();
      c.save(); c.clip(); c.drawImage(this.tex, -s / 2, -s / 2, s, s); c.restore();
      c.strokeStyle = '#4a2408'; c.lineWidth = 2; c.stroke();
      c.restore();
    }
  }

  bolt(x0: number, y0: number, x1: number, y1: number, d: number, col: string, wdt: number) {
    const c = this.c;
    const pts: number[][] = [[x0, y0], [x1, y1]];
    let disp = d;
    for (let it = 0; it < 5; it++) {
      const np: number[][] = [pts[0]];
      for (let i = 0; i < pts.length - 1; i++) {
        const [ax, ay] = pts[i], [bx, by] = pts[i + 1];
        np.push([(ax + bx) / 2 + (Math.random() - 0.5) * disp, (ay + by) / 2 + (Math.random() - 0.5) * disp]);
        np.push(pts[i + 1]);
      }
      pts.splice(0, pts.length, ...np); disp *= 0.55;
    }
    c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
    c.strokeStyle = col; c.lineWidth = wdt * 3; c.globalAlpha = 0.25; c.stroke();
    c.globalAlpha = 1; c.lineWidth = wdt; c.stroke();
    c.strokeStyle = '#fff'; c.lineWidth = wdt * 0.4; c.stroke();
  }

  drawBeams() {
    const c = this.c;
    c.save();
    c.globalCompositeOperation = 'lighter';
    c.lineCap = 'round';
    for (const b of this.beams) {
      const f = b.life / b.max;
      const jit = (Math.random() - 0.5) * 2;
      let w = b.w * (b.kind === 'heat' ? 0.7 + 0.3 * Math.sin(this.t * 60) : f);
      if (b.kind === 'heat') {
        w *= Math.min(1, (b.max - b.life) * 8) * Math.min(1, b.life * 5);
        // heat distortion waves
        for (let i = 0; i < 3; i++) {
          c.strokeStyle = `rgba(255,180,90,${0.08})`; c.lineWidth = w * (4 + i * 2);
          c.beginPath(); c.moveTo(b.x0, b.y0); c.lineTo(b.x1 + Math.sin(this.t * 40 + i) * 4, b.y1); c.stroke();
        }
      }
      const layers: [number, string, number][] = [[w * 4, b.color, 0.15 * (b.kind === 'heat' ? 1 : f)], [w * 2, b.color, 0.45], [w, b.color, 0.9], [w * 0.4, '#ffffff', 1]];
      for (const [lw, col, al] of layers) {
        c.globalAlpha = al * (b.kind === 'heat' ? 1 : Math.min(1, f * 1.5));
        c.strokeStyle = col; c.lineWidth = Math.max(0.5, lw);
        c.beginPath(); c.moveTo(b.x0 + jit, b.y0); c.lineTo(b.x1 + jit, b.y1); c.stroke();
      }
      c.globalAlpha = 1;
      if (b.kind === 'beamsn') {
        // helix spiral
        c.strokeStyle = b.color; c.lineWidth = 1.5; c.globalAlpha = f;
        for (const ph of [0, Math.PI]) {
          c.beginPath();
          for (let y = b.y0; y >= b.y1; y -= 4) {
            const x = b.x0 + Math.sin((y * 0.08) + ph + this.t * 30) * (8 + (1 - f) * 20);
            y === b.y0 ? c.moveTo(x, y) : c.lineTo(x, y);
          }
          c.stroke();
        }
        c.globalAlpha = 1;
      }
      if (b.kind === 'phaser') {
        for (let i = 0; i < 6; i++) {
          const y = b.y1 + Math.random() * (b.y0 - b.y1);
          c.fillStyle = '#ffe0b0'; c.globalAlpha = f;
          c.fillRect(b.x0 + (Math.random() - 0.5) * 10, y, 1.5, 1.5);
        }
        c.globalAlpha = 1;
      }
      if (b.kind === 'repulsor') {
        for (let i = 0; i < 5; i++) {
          const k = ((i / 5) + (1 - f) * 0.6) % 1;
          const y = b.y0 + (b.y1 - b.y0) * k;
          c.strokeStyle = '#d0f6ff'; c.lineWidth = 2; c.globalAlpha = f * 0.8;
          c.beginPath(); c.ellipse(b.x0, y, 10 + k * 12, 3 + k * 3, 0, 0, 7); c.stroke();
        }
        c.globalAlpha = 1;
      }
    }
    c.restore();
  }

  drawStream() {
    const c = this.c, m = this.muzzle();
    c.save();
    c.globalCompositeOperation = 'lighter';
    const y0 = m.y, y1 = HITY, x0 = m.x;
    const strands: [string, number, number][] = [['#ff6a1a', 4, 0], ['#ffcc55', 2.5, 2], ['#4aa8ff', 2, 4], ['#ff3a3a', 1.5, 1]];
    for (const [col, wd, ph] of strands) {
      c.beginPath();
      for (let y = y0; y >= y1; y -= 5) {
        const k = (y0 - y) / (y0 - y1);
        const amp = Math.sin(k * Math.PI) * (14 + Math.sin(this.t * 7 + ph) * 8);
        const x = x0 + Math.sin(k * 14 - this.t * 25 + ph) * amp + (Math.random() - 0.5) * 3;
        y === y0 ? c.moveTo(x, y) : c.lineTo(x, y);
      }
      c.strokeStyle = col; c.lineWidth = wd * 3; c.globalAlpha = 0.25; c.stroke();
      c.lineWidth = wd; c.globalAlpha = 0.95; c.stroke();
    }
    c.globalAlpha = 1;
    this.bolt(x0, y0, WC.x, y1, 50, '#7fc8ff', 1.3);
    this.bolt(x0, y0, WC.x, y1, 40, '#ff9a4a', 1.5);
    c.restore();
  }

  drawProjs() {
    const c = this.c;
    for (const p of this.projs) {
      c.save();
      switch (p.kind) {
        case 'bullet': {
          c.globalCompositeOperation = 'lighter';
          const len = 70;
          const g = c.createLinearGradient(0, p.y, 0, p.y + len);
          g.addColorStop(0, p.color); g.addColorStop(1, 'rgba(0,0,0,0)');
          c.strokeStyle = g; c.lineCap = 'round';
          c.lineWidth = 6; c.globalAlpha = 0.35;
          c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(p.x - p.vx * 0.02, p.y + len); c.stroke();
          c.globalAlpha = 1; c.lineWidth = 2;
          c.stroke();
          c.fillStyle = '#fff';
          c.beginPath(); c.ellipse(p.x, p.y, 1.8, 5, 0, 0, 7); c.fill();
          if (p.electro) {
            c.shadowColor = p.color; c.shadowBlur = 0;
            this.bolt(p.x, p.y, p.x + (Math.random() - 0.5) * 20, p.y + 40, 18, p.color, 1);
            const gg = c.createRadialGradient(p.x, p.y, 0, p.x, p.y, 14);
            gg.addColorStop(0, p.color); gg.addColorStop(1, 'rgba(0,0,0,0)');
            c.fillStyle = gg; c.beginPath(); c.arc(p.x, p.y, 14, 0, 7); c.fill();
          }
          break;
        }
        case 'arrow':
          c.translate(p.x, p.y);
          if (p.bounce) c.rotate((p.rot || 0) * 1.5);
          c.rotate(-Math.PI / 2);
          // motion blur
          c.globalAlpha = 0.25; drawArrowShape(c, -20, 0, 140); c.globalAlpha = 1;
          drawArrowShape(c, 0, 0, 140);
          break;
        case 'fire': {
          c.globalCompositeOperation = 'lighter';
          // serpent body from trail
          const tr = p.trail;
          for (let i = 0; i < tr.length; i++) {
            const k = i / tr.length;
            const r = 4 + k * 14;
            const g = c.createRadialGradient(tr[i].x, tr[i].y, 0, tr[i].x, tr[i].y, r * 1.8);
            g.addColorStop(0, `rgba(255,240,180,${k})`); g.addColorStop(0.4, `rgba(255,120,20,${k * 0.8})`); g.addColorStop(1, 'rgba(255,30,0,0)');
            c.fillStyle = g; c.beginPath(); c.arc(tr[i].x, tr[i].y, r * 1.8, 0, 7); c.fill();
          }
          // dragon head of flame
          c.translate(p.x, p.y);
          c.rotate(Math.atan2(p.vy, p.vx) + Math.PI / 2);
          c.shadowColor = '#ff7a1a'; c.shadowBlur = 25;
          c.fillStyle = 'rgba(255,170,50,.95)';
          c.beginPath();
          c.moveTo(0, -30); c.quadraticCurveTo(10, -24, 12, -10); c.lineTo(22, -18); c.lineTo(16, -2); c.quadraticCurveTo(14, 10, 0, 14);
          c.quadraticCurveTo(-14, 10, -16, -2); c.lineTo(-22, -18); c.lineTo(-12, -10); c.quadraticCurveTo(-10, -24, 0, -30);
          c.fill();
          c.fillStyle = 'rgba(255,250,220,1)';
          c.beginPath(); c.ellipse(0, -8, 6, 14, 0, 0, 7); c.fill();
          c.shadowBlur = 0;
          c.fillStyle = '#ff2200';
          c.beginPath(); c.ellipse(-6, -6, 2.5, 1.5, 0.4, 0, 7); c.ellipse(6, -6, 2.5, 1.5, -0.4, 0, 7); c.fill();
          break;
        }
        case 'slash': {
          c.globalCompositeOperation = 'lighter';
          c.translate(p.x, p.y);
          const sc = 1 + p.t * 1.2;
          c.scale(sc, 1);
          c.shadowColor = '#4fc8ff'; c.shadowBlur = 30;
          for (const [col, wd] of [['rgba(60,170,255,.5)', 14], ['#7fdcff', 6], ['#ffffff', 2]] as [string, number][]) {
            c.strokeStyle = col; c.lineWidth = wd; c.lineCap = 'round';
            c.beginPath(); c.arc(0, 30, 50, -Math.PI * 0.82, -Math.PI * 0.18); c.stroke();
          }
          c.shadowBlur = 0;
          for (let i = 0; i < 4; i++) {
            c.globalAlpha = 0.3 - i * 0.07; c.strokeStyle = '#4fc8ff'; c.lineWidth = 6;
            c.beginPath(); c.arc(0, 30 + i * 12, 50, -Math.PI * 0.8, -Math.PI * 0.2); c.stroke();
          }
          break;
        }
        case 'plasma': {
          c.globalCompositeOperation = 'lighter';
          const burst = p.widx === 16;
          const [cr, cg2, cb] = hex2rgb(p.color);
          const rad = burst ? 0.68 : 1;
          for (let i = 0; i < p.trail.length; i++) {
            const k = i / p.trail.length;
            c.fillStyle = `rgba(${cr},${cg2},${cb},${k * 0.32})`;
            c.beginPath(); c.arc(p.trail[i].x, p.trail[i].y, (4 + k * 9) * rad, 0, 7); c.fill();
          }
          const r = (16 + Math.sin(this.t * 50) * 3) * rad;
          const g = c.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 2);
          g.addColorStop(0, '#ffffff');
          g.addColorStop(0.22, burst ? '#ffe4c8' : '#bfe3ff');
          g.addColorStop(0.5, `rgba(${cr},${cg2},${cb},.7)`);
          g.addColorStop(1, `rgba(${cr},${cg2},${cb},0)`);
          c.fillStyle = g; c.beginPath(); c.arc(p.x, p.y, r * 2, 0, 7); c.fill();
          // magnetic ring around the bolt
          c.strokeStyle = `rgba(255,255,255,.5)`; c.lineWidth = 1.2;
          for (let i = 0; i < 2; i++) {
            const k = ((this.t * 3 + i * 0.5) % 1);
            c.globalAlpha = 0.5 * (1 - k);
            c.beginPath(); c.ellipse(p.x, p.y + 8, r * (1 + k * 1.6), r * 0.35 * (1 + k), 0, 0, 7); c.stroke();
          }
          c.globalAlpha = 1;
          for (let i = 0; i < 3; i++) { const a = Math.random() * 7; this.bolt(p.x, p.y, p.x + Math.cos(a) * 26 * rad, p.y + Math.sin(a) * 26 * rad, 10, burst ? '#ffc79a' : '#8fd0ff', 0.8); }
          break;
        }
        case 'spine': {
          c.globalCompositeOperation = 'lighter';
          for (let i = 0; i < p.trail.length; i++) {
            const k = i / p.trail.length;
            c.fillStyle = `rgba(140,255,90,${k * 0.2})`;
            c.beginPath(); c.arc(p.trail[i].x, p.trail[i].y, 2 + k * 7, 0, 7); c.fill();
          }
          c.globalCompositeOperation = 'source-over';
          c.translate(p.x, p.y);
          c.rotate(Math.atan2(p.vy, p.vx) + Math.PI / 2);
          const qg = c.createLinearGradient(-5, 0, 5, 0);
          qg.addColorStop(0, '#f4ecd8'); qg.addColorStop(0.5, '#c6b694'); qg.addColorStop(1, '#655842');
          c.fillStyle = qg;
          c.beginPath();
          c.moveTo(0, -32); c.quadraticCurveTo(5.5, -6, 3, 25); c.lineTo(0, 33); c.lineTo(-3, 25); c.quadraticCurveTo(-5.5, -6, 0, -32);
          c.fill();
          c.fillStyle = '#d9cbaa';
          for (let i = 0; i < 5; i++) {
            const y = -16 + i * 9.5;
            c.beginPath(); c.moveTo(1, y); c.lineTo(8 - i * 0.8, y - 7); c.lineTo(3, y + 3.5); c.fill();
            c.beginPath(); c.moveTo(-1, y); c.lineTo(-8 + i * 0.8, y - 7); c.lineTo(-3, y + 3.5); c.fill();
          }
          c.globalCompositeOperation = 'lighter';
          const tg2 = c.createRadialGradient(0, -29, 0, 0, -29, 13);
          tg2.addColorStop(0, '#eaffc2'); tg2.addColorStop(0.4, '#8dff5a'); tg2.addColorStop(1, 'rgba(90,255,40,0)');
          c.fillStyle = tg2; c.beginPath(); c.arc(0, -29, 13, 0, 7); c.fill();
          break;
        }
        case 'singularity': {
          c.globalCompositeOperation = 'lighter';
          for (let i = 0; i < p.trail.length; i++) {
            const k = i / p.trail.length;
            const a = k * 9 + this.t * 4;
            const rrad = 28 * (1 - k) + 7;
            c.fillStyle = `rgba(170,110,255,${k * 0.35})`;
            c.beginPath(); c.arc(p.x + Math.cos(a) * rrad, p.y + Math.sin(a) * rrad * 0.6, 2.6, 0, 7); c.fill();
          }
          const r2 = 18 + Math.sin(this.t * 22) * 2;
          c.strokeStyle = 'rgba(202,152,255,.85)'; c.lineWidth = 3;
          for (let i = 0; i < 3; i++) {
            c.beginPath(); c.ellipse(p.x, p.y, r2 * (1.5 + i * 0.42), r2 * 0.42, this.t * 1.2 + i * 0.7, 0, 7); c.stroke();
          }
          const gg3 = c.createRadialGradient(p.x, p.y, r2 * 0.6, p.x, p.y, r2 * 3);
          gg3.addColorStop(0, 'rgba(0,0,0,1)'); gg3.addColorStop(0.42, 'rgba(60,20,110,.85)'); gg3.addColorStop(1, 'rgba(90,30,180,0)');
          c.fillStyle = gg3; c.beginPath(); c.arc(p.x, p.y, r2 * 3, 0, 7); c.fill();
          c.fillStyle = '#000'; c.beginPath(); c.arc(p.x, p.y, r2 * 0.85, 0, 7); c.fill();
          c.strokeStyle = 'rgba(222,182,255,.9)'; c.lineWidth = 1.2;
          c.beginPath(); c.arc(p.x, p.y, r2 * 0.92, 0, 7); c.stroke();
          break;
        }
        case 'shard': {
          c.globalCompositeOperation = 'lighter';
          for (let i = 0; i < p.trail.length; i++) {
            const k = i / p.trail.length;
            c.fillStyle = `rgba(140,225,255,${k * 0.24})`;
            c.beginPath(); c.arc(p.trail[i].x, p.trail[i].y, 2 + k * 5, 0, 7); c.fill();
          }
          c.globalCompositeOperation = 'source-over';
          c.translate(p.x, p.y);
          c.rotate(Math.atan2(p.vy, p.vx) + Math.PI / 2);
          const sc2 = 1 + Math.sin(this.t * 30) * 0.05;
          c.scale(sc2, sc2);
          const sg2 = c.createLinearGradient(0, -36, 0, 36);
          sg2.addColorStop(0, '#ffffff'); sg2.addColorStop(0.35, '#a8ecff'); sg2.addColorStop(0.8, '#2f7fa8'); sg2.addColorStop(1, '#0c2a3a');
          c.beginPath();
          c.moveTo(0, -38); c.lineTo(10, -9); c.lineTo(6, 27); c.lineTo(0, 36); c.lineTo(-8, 27); c.lineTo(-11, -9); c.closePath();
          c.fillStyle = sg2; c.fill();
          c.strokeStyle = 'rgba(232,251,255,.9)'; c.lineWidth = 1; c.stroke();
          c.beginPath(); c.moveTo(0, -38); c.lineTo(0, 36); c.moveTo(-11, -9); c.lineTo(10, -9);
          c.strokeStyle = 'rgba(255,255,255,.5)'; c.stroke();
          c.globalCompositeOperation = 'lighter';
          const gg4 = c.createRadialGradient(0, -8, 0, 0, -8, 17);
          gg4.addColorStop(0, 'rgba(255,255,255,.9)'); gg4.addColorStop(1, 'rgba(120,220,255,0)');
          c.fillStyle = gg4; c.beginPath(); c.arc(0, -8, 17, 0, 7); c.fill();
          break;
        }
        case 'acid': {
          const sz = p.sz ?? 1;
          const wob = 1 + Math.sin(p.t * 26) * 0.13;
          c.globalCompositeOperation = 'lighter';
          for (let i = 0; i < p.trail.length; i++) {
            const k = i / p.trail.length;
            c.fillStyle = `rgba(150,255,60,${k * 0.3})`;
            c.beginPath(); c.arc(p.trail[i].x, p.trail[i].y, (2 + k * 8) * sz, 0, 7); c.fill();
          }
          const r = 9 * sz * wob;
          const ag = c.createRadialGradient(p.x - r * 0.3, p.y - r * 0.35, 0, p.x, p.y, r * 1.7);
          ag.addColorStop(0, '#f2ffd2'); ag.addColorStop(0.32, '#b6ff2a'); ag.addColorStop(0.72, 'rgba(88,190,20,.85)'); ag.addColorStop(1, 'rgba(60,140,10,0)');
          c.fillStyle = ag;
          c.beginPath(); c.ellipse(p.x, p.y, r * 1.15, r * 1.5, p.t * 2, 0, 7); c.fill();
          c.globalCompositeOperation = 'source-over';
          c.strokeStyle = 'rgba(40,86,6,.75)'; c.lineWidth = 1.2;
          c.beginPath(); c.ellipse(p.x, p.y, r * 1.15, r * 1.5, p.t * 2, 0, 7); c.stroke();
          c.fillStyle = 'rgba(255,255,255,.55)';
          c.beginPath(); c.ellipse(p.x - r * 0.45, p.y - r * 0.6, r * 0.34, r * 0.5, -0.4, 0, 7); c.fill();
          break;
        }
        case 'buster': {
          const sz = p.sz ?? 1;
          const [cr, cg2, cb] = hex2rgb(p.color);
          c.globalCompositeOperation = 'lighter';
          for (let i = 0; i < p.trail.length; i++) {
            const k = i / p.trail.length;
            c.fillStyle = `rgba(${cr},${cg2},${cb},${k * 0.32})`;
            c.beginPath(); c.arc(p.trail[i].x, p.trail[i].y, (3 + k * 10) * sz, 0, 7); c.fill();
          }
          const r = 11 * sz;
          const bg2 = c.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 1.7);
          bg2.addColorStop(0, '#ffffff'); bg2.addColorStop(0.3, p.color); bg2.addColorStop(1, `rgba(${cr},${cg2},${cb},0)`);
          c.fillStyle = bg2;
          c.beginPath(); c.ellipse(p.x, p.y, r * 1.02, r * 1.55, 0, 0, 7); c.fill();
          for (let i = 0; i < 3; i++) {
            const a = this.t * 6 + i * 2.1;
            c.strokeStyle = `rgba(255,255,255,${0.55 - i * 0.13})`; c.lineWidth = 1.6;
            c.beginPath(); c.ellipse(p.x, p.y, r * (1.25 + i * 0.36), r * 0.5, a, 0, 7); c.stroke();
          }
          break;
        }
        case 'disc': {
          c.globalCompositeOperation = 'lighter';
          for (let i = 0; i < p.trail.length; i++) {
            const k = i / p.trail.length;
            c.strokeStyle = `rgba(0,240,255,${k * 0.35})`; c.lineWidth = 2;
            c.beginPath(); c.ellipse(p.trail[i].x, p.trail[i].y, 26, 9, 0, 0, 7); c.stroke();
          }
          c.globalCompositeOperation = 'source-over';
          c.translate(p.x, p.y); c.scale(1, 0.4); drawDisc(c, 0, 0, p.rot || 0, 1);
          break;
        }
      }
      c.restore();
    }
  }

  drawParts(top: boolean) {
    const c = this.c;
    for (const q of this.parts) {
      const isTop = q.type === 'flash' || q.type === 'eflash' || q.type === 'glow' || q.type === 'flame' || q.type === 'ring';
      if (isTop !== top) continue;
      const f = Math.max(0, q.life / q.max);
      c.save();
      c.globalCompositeOperation = q.add ? 'lighter' : 'source-over';
      switch (q.type) {
        case 'spark': {
          c.strokeStyle = q.color; c.globalAlpha = f; c.lineWidth = q.size; c.lineCap = 'round';
          c.beginPath(); c.moveTo(q.x, q.y); c.lineTo(q.x - q.vx * 0.025, q.y - q.vy * 0.025); c.stroke();
          break;
        }
        case 'ember': {
          c.fillStyle = q.color; c.globalAlpha = f; c.shadowColor = q.color; c.shadowBlur = 8;
          c.beginPath(); c.arc(q.x + Math.sin(this.t * 10 + q.max * 30) * 3, q.y, q.size, 0, 7); c.fill();
          break;
        }
        case 'chip': {
          c.translate(q.x, q.y); c.rotate(q.rot || 0); c.globalAlpha = Math.min(1, f * 2);
          c.fillStyle = q.color; c.fillRect(-q.size, -q.size * 0.4, q.size * 2, q.size * 0.8);
          break;
        }
        case 'shell': {
          c.translate(q.x, q.y); c.rotate(q.rot || 0); c.globalAlpha = Math.min(1, f * 3);
          const g = c.createLinearGradient(0, -q.size, 0, q.size);
          g.addColorStop(0, '#fff2b0'); g.addColorStop(0.5, '#d6a845'); g.addColorStop(1, '#7a5a10');
          c.fillStyle = g; c.fillRect(-q.size * 1.8, -q.size * 0.7, q.size * 3.6, q.size * 1.4);
          c.fillStyle = '#5a3a08'; c.fillRect(-q.size * 1.8, -q.size * 0.7, 1.5, q.size * 1.4);
          break;
        }
        case 'smoke': {
          const r = q.size * (1 + (1 - f) * 2);
          const g = c.createRadialGradient(q.x, q.y, 0, q.x, q.y, r);
          g.addColorStop(0, `rgba(${q.color},${0.35 * f})`); g.addColorStop(1, `rgba(${q.color},0)`);
          c.fillStyle = g; c.beginPath(); c.arc(q.x, q.y, r, 0, 7); c.fill();
          break;
        }
        case 'flame': {
          const r = q.size * (0.5 + f * 0.8);
          const g = c.createRadialGradient(q.x, q.y, 0, q.x, q.y, r);
          const hot = f;
          g.addColorStop(0, `rgba(255,${200 + hot * 55},${hot * 160},${f})`);
          g.addColorStop(0.4, `rgba(255,${80 + hot * 100},0,${f * 0.7})`);
          g.addColorStop(1, 'rgba(180,20,0,0)');
          c.fillStyle = g; c.beginPath(); c.arc(q.x, q.y, r, 0, 7); c.fill();
          break;
        }
        case 'glow': {
          const g = c.createRadialGradient(q.x, q.y, 0, q.x, q.y, q.size);
          g.addColorStop(0, q.color); g.addColorStop(1, 'rgba(0,0,0,0)');
          c.globalAlpha = f * 0.8; c.fillStyle = g; c.beginPath(); c.arc(q.x, q.y, q.size, 0, 7); c.fill();
          break;
        }
        case 'ring': {
          const r = q.size * (1 - f * 0.8);
          c.strokeStyle = q.color; c.globalAlpha = f; c.lineWidth = 1 + f * 5;
          c.shadowColor = q.color; c.shadowBlur = 12;
          c.beginPath(); c.ellipse(q.x, q.y, r, r * 0.8, 0, 0, 7); c.stroke();
          break;
        }
        case 'flash': case 'eflash': {
          c.translate(q.x, q.y);
          const s = q.size * (0.7 + Math.random() * 0.5);
          const g = c.createRadialGradient(0, 0, 0, 0, 0, s);
          g.addColorStop(0, '#ffffff'); g.addColorStop(0.3, q.color); g.addColorStop(1, 'rgba(0,0,0,0)');
          c.fillStyle = g;
          // star petals pointing up
          c.beginPath();
          const petals = q.type === 'flash' ? 5 : 8;
          for (let i = 0; i < petals * 2; i++) {
            const a = -Math.PI / 2 + (i / (petals * 2)) * Math.PI * 2 + (q.rot || 0) * 0.1;
            const up = Math.abs(Math.sin(a)) > 0.9 && Math.sin(a) < 0 ? 1.8 : 1;
            const rr2 = i % 2 ? s * 0.35 : s * up;
            c.lineTo(Math.cos(a) * rr2, Math.sin(a) * rr2);
          }
          c.closePath(); c.fill();
          break;
        }
        case 'arc': {
          c.globalAlpha = f;
          const a = q.rot || 0;
          this.bolt(q.x, q.y, q.x + Math.cos(a) * q.size, q.y + Math.sin(a) * q.size, 25, q.color, 1.2);
          break;
        }
        case 'slashfx': {
          c.globalAlpha = f; c.strokeStyle = q.color; c.lineWidth = 4 * f + 1; c.shadowColor = q.color; c.shadowBlur = 20;
          c.beginPath(); c.moveTo(q.x - q.size * (1 - f), q.y + 10); c.lineTo(q.x + q.size * (1 - f), q.y - 10); c.stroke();
          break;
        }
        case 'farrow': {
          c.translate(q.x, q.y); c.rotate(q.rot || 0); c.globalAlpha = Math.min(1, f * 2);
          drawArrowShape(c, -70, 0, 140);
          break;
        }
      }
      c.restore();
    }
  }

  drawGun() {
    const c = this.c;
    c.save();
    const bob = Math.sin(this.t * 2) * 2;
    c.translate(G.x, G.y + this.recoil + bob);
    // ground glow
    c.rotate(-Math.PI / 2);
    const cycle = Math.min(1, (this.t * 1000 - this.lastFire) / Math.max(1, this.w.rate));
    drawWeapon(c, this.widx, this.t, { charge: this.charge, ready: !this.discOut, swing: this.swing, cycle });
    c.restore();
  }

  drawHUD() {
    const c = this.c, wl = this.wheel;
    // HP bar
    const hpF = Math.max(0, wl.hp / MAXHP);
    rr(c, 90, 24, 300, 14, 7); c.fillStyle = 'rgba(255,255,255,.08)'; c.fill();
    if (hpF > 0) {
      rr(c, 90, 24, 300 * hpF, 14, 7);
      const g = c.createLinearGradient(90, 0, 390, 0);
      g.addColorStop(0, '#ff3b5c'); g.addColorStop(1, '#ffb347');
      c.fillStyle = g; c.fill();
    }
    c.fillStyle = '#fff'; c.font = 'bold 13px system-ui'; c.textAlign = 'center';
    c.fillText(wl.broken ? 'TARGET HANCUR!' : 'LEVEL 1 • TARGET', 240, 18);
    c.textAlign = 'left'; c.font = 'bold 12px system-ui'; c.fillStyle = 'rgba(255,255,255,.7)';
    c.fillText(`HIT ${this.hits}`, 14, 36);
    c.textAlign = 'right'; c.fillText(`🪵 ${this.kills}`, 466, 36);
    if (this.bannerT > 0) {
      c.globalAlpha = Math.min(1, this.bannerT * 2);
      c.textAlign = 'center'; c.font = '900 26px system-ui';
      c.shadowColor = this.w.color; c.shadowBlur = 20; c.fillStyle = '#fff';
      c.fillText(this.w.name.toUpperCase(), 240, 420);
      c.shadowBlur = 0; c.font = '13px system-ui'; c.fillStyle = 'rgba(255,255,255,.75)';
      c.fillText(this.w.desc, 240, 442);
      c.globalAlpha = 1;
    }
    if (wl.broken && wl.respawn < 1.6) {
      c.textAlign = 'center'; c.font = '900 34px system-ui'; c.fillStyle = '#ffd27a';
      c.shadowColor = '#ff8a2a'; c.shadowBlur = 25;
      c.fillText('HANCUR! 💥', 240, 245); c.shadowBlur = 0;
    }
  }
}
