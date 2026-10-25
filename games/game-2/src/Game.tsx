/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef } from 'react';
import { WEAPONS, Weapon, drawWeapon, glow, bolt, drawArrowShape, drawDiscShape, lg, rr } from './weapons';

export const GW = 480, GH = 960;
const CX = 240, CY = 185, R = 92, BASE = 900;
export const TARGET = 10;
const TAU = Math.PI * 2;
const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const norm = (a: number) => ((a % TAU) + TAU) % TAU;
const adiff = (a: number, b: number) => { const d = Math.abs(norm(a) - norm(b)); return Math.min(d, TAU - d); };

interface P { t: string; x: number; y: number; vx: number; vy: number; life: number; max: number; size: number; col: string; g?: number; drag?: number; rot?: number; vr?: number; a1?: number; a2?: number; kind?: string; add?: boolean }
interface Stuck { a: number; kind: string; col: string; born: number; seed: number }

const PROTRUDE = new Set(['arrow', 'disc', 'bullet', 'electro']);

// growth rings precomputed
const RINGS = Array.from({ length: 9 }, (_, i) => ({ r: 12 + i * 9.5, off: Array.from({ length: 48 }, () => rnd(-1.4, 1.4)) }));
const CRACKS = Array.from({ length: 6 }, () => ({ a: rnd(0, TAU), l: rnd(25, 70) }));
const STARS = Array.from({ length: 70 }, () => ({ x: rnd(0, GW), y: rnd(0, GH), s: rnd(0.4, 1.6), p: rnd(0, TAU) }));

export default function Game({ weaponId, onHud, resetKey }: { weaponId: string; onHud: (h: { hits: number; status: string }) => void; resetKey: number }) {
  const cv = useRef<HTMLCanvasElement>(null);
  const wRef = useRef<Weapon>(WEAPONS[0]);
  const st = useRef<any>(null);
  const fireRef = useRef<() => void>(() => {});

  const newState = () => ({
    rot: 0, t: 0, hits: 0, status: 'play', stuck: [] as Stuck[], projs: [] as any[], parts: [] as P[], beams: [] as any[],
    shake: 0, flash: 0, bump: 0, cd: 0, fireT: 9, recoil: 0, endT: 0,
  });

  useEffect(() => {
    const w = WEAPONS.find((x) => x.id === weaponId) || WEAPONS[0];
    wRef.current = w;
    if (st.current) { st.current.cd = 0.15; st.current.fireT = 9; }
  }, [weaponId]);

  useEffect(() => {
    const s = newState();
    // pre-stuck obstacles like knife hit level 1
    s.stuck.push({ a: 0.6, kind: 'arrow', col: '', born: -5, seed: 1 }, { a: 3.4, kind: 'arrow', col: '', born: -5, seed: 2 });
    st.current = s;
    onHud({ hits: 0, status: 'play' });
  }, [resetKey]); // eslint-disable-line

  useEffect(() => {
    const canvas = cv.current!;
    const c = canvas.getContext('2d')!;
    let raf = 0, last = performance.now();
    let scale = 1, ox = 0, oy = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const r = canvas.getBoundingClientRect();
      canvas.width = r.width * dpr; canvas.height = r.height * dpr;
      scale = Math.min(r.width / GW, r.height / GH) * dpr;
      ox = (canvas.width - GW * scale) / 2; oy = (canvas.height - GH * scale) / 2;
    };
    resize();
    window.addEventListener('resize', resize);

    const add = (p: Partial<P>) => st.current.parts.push({ vx: 0, vy: 0, life: 1, size: 3, col: '255,255,255', ...p, max: p.life ?? 1 } as P);

    const muzzlePos = () => {
      const w = wRef.current; const s = st.current;
      return { x: CX + w.mY, y: BASE - w.muzzle + s.recoil * 14 };
    };

    const spawnMuzzle = (w: Weapon, x: number, y: number) => {
      const f = w.flash;
      if (f === 'gun') {
        add({ t: 'flash', x, y, life: 0.07, size: rnd(26, 36), col: w.col, rot: rnd(0, TAU), add: true });
        add({ t: 'glow', x, y, life: 0.1, size: 60, col: '255,180,80', add: true });
        for (let i = 0; i < 8; i++) add({ t: 'spark', x, y, vx: rnd(-120, 120), vy: rnd(-700, -250), life: rnd(0.08, 0.2), size: 1.5, col: '255,220,120', add: true, drag: 0.9 });
        for (let i = 0; i < 4; i++) add({ t: 'smoke', x: x + rnd(-4, 4), y: y - rnd(0, 14), vx: rnd(-30, 30), vy: rnd(-70, -20), life: rnd(0.5, 0.9), size: rnd(6, 10), col: '200,200,200', drag: 0.94 });
        if (w.shell) add({ t: 'shell', x: CX - 6, y: BASE - w.muzzle * 0.35, vx: rnd(-260, -160), vy: rnd(-120, 20), g: 900, life: 1.2, size: 1, rot: rnd(0, TAU), vr: rnd(-25, 25), col: '' });
      } else if (f === 'electro') {
        add({ t: 'flash', x, y, life: 0.08, size: 30, col: w.col, rot: rnd(0, TAU), add: true });
        add({ t: 'glow', x, y, life: 0.16, size: 70, col: w.col, add: true });
        for (let i = 0; i < 4; i++) add({ t: 'bolt', x, y, vx: rnd(-40, 40), vy: rnd(-60, -10), life: 0.09, size: 1.2, col: w.col, add: true });
        add({ t: 'ring', x, y, life: 0.25, size: 30, col: w.col, add: true });
      } else if (f === 'sniper') {
        add({ t: 'flash', x, y, life: 0.1, size: 44, col: '255,80,90', rot: 0, add: true });
        add({ t: 'ring', x, y, life: 0.35, size: 50, col: w.col, add: true });
        add({ t: 'ring', x, y: y - 20, life: 0.3, size: 30, col: w.col, add: true });
        for (let i = 0; i < 6; i++) add({ t: 'smoke', x, y, vx: rnd(-60, 60), vy: rnd(-40, 10), life: 0.8, size: 8, col: '255,170,170', drag: 0.93 });
      } else if (f === 'dragon') {
        add({ t: 'glow', x, y, life: 0.35, size: 160, col: '255,110,30', add: true });
        add({ t: 'glow', x, y, life: 0.2, size: 80, col: '255,220,120', add: true });
        // shock ring
        for (let i = 0; i < 3; i++) add({ t: 'ring', x, y: y - i * 6, life: 0.35 + i * 0.05, size: 30 + i * 20, col: i === 1 ? '255,200,100' : '255,120,40', add: true });
        // dense fan of flame wisps
        for (let i = 0; i < 90; i++) {
          const a = -Math.PI / 2 + rnd(-0.45, 0.45); const sp = rnd(200, 900);
          add({ t: 'fire', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 40, life: rnd(0.3, 0.75), size: rnd(10, 26), col: '', drag: 0.92, add: true });
        }
        // ember sparks
        for (let i = 0; i < 40; i++) add({ t: 'ember', x, y, vx: rnd(-300, 300), vy: rnd(-800, -180), life: rnd(0.6, 1.5), size: rnd(1, 3), col: '255,200,90', drag: 0.97, g: -30, add: true });
        // smoke
        for (let i = 0; i < 10; i++) add({ t: 'smoke', x: x + rnd(-20, 20), y: y - rnd(0, 50), vx: rnd(-60, 60), vy: rnd(-120, -20), life: rnd(1, 1.8), size: rnd(12, 22), col: '70,55,50', drag: 0.95 });
      } else if (f === 'phaser') {
        add({ t: 'glow', x, y, life: 0.2, size: 50, col: w.col, add: true });
        add({ t: 'ring', x, y, life: 0.2, size: 20, col: w.col, add: true });
      } else if (f === 'plasma') {
        add({ t: 'glow', x, y, life: 0.25, size: 80, col: w.col, add: true });
        add({ t: 'ring', x, y, life: 0.3, size: 40, col: w.col, add: true });
        for (let i = 0; i < 3; i++) add({ t: 'bolt', x, y, vx: rnd(-50, 50), vy: rnd(-50, 0), life: 0.1, size: 1, col: w.col, add: true });
      } else if (f === 'disc') {
        add({ t: 'ring', x, y, life: 0.3, size: 45, col: w.col, add: true });
      } else if (f === 'sword') {
        for (let i = 0; i < 10; i++) add({ t: 'spark', x: x + rnd(-40, 40), y: y + rnd(-10, 30), vx: rnd(-80, 80), vy: rnd(-300, -100), life: 0.25, size: 1.2, col: w.col, add: true, drag: 0.92 });
      } else if (f === 'proton') {
        add({ t: 'glow', x, y, life: 0.5, size: 60, col: '255,120,40', add: true });
      } else if (f === 'tripod') {
        add({ t: 'glow', x, y, life: 0.4, size: 90, col: w.col, add: true });
        add({ t: 'ring', x, y, life: 0.4, size: 50, col: w.col, add: true });
      } else if (f === 'iron') {
        add({ t: 'glow', x, y, life: 0.3, size: 90, col: w.col, add: true });
        add({ t: 'ring', x, y, life: 0.35, size: 55, col: w.col, add: true });
        add({ t: 'ring', x, y, life: 0.25, size: 30, col: '255,255,255', add: true });
      }
    };

    const chips = (x: number, y: number, n: number, pow = 1) => {
      for (let i = 0; i < n; i++) {
        const a = Math.PI / 2 + rnd(-1.1, 1.1);
        const sp = rnd(120, 420) * pow;
        add({ t: 'chip', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: 1100, life: rnd(0.5, 1), size: rnd(2, 5), rot: rnd(0, TAU), vr: rnd(-20, 20), col: Math.random() < 0.5 ? '#c98a4a' : '#7a4318' });
      }
    };

    const spawnImpact = (w: Weapon, x: number, y: number) => {
      const k = w.proj || w.beam;
      const fan = (n: number, col: string, smin: number, smax: number, life = 0.35, size = 1.6) => {
        for (let i = 0; i < n; i++) {
          const a = Math.PI / 2 + rnd(-1.3, 1.3);
          const sp = rnd(smin, smax);
          add({ t: 'spark', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: 500, life: rnd(life * 0.5, life), size, col, add: true, drag: 0.94 });
        }
      };
      switch (k) {
        case 'arrow':
          chips(x, y, 10, 0.7);
          add({ t: 'ring', x, y, life: 0.25, size: 26, col: '255,240,210', add: true });
          for (let i = 0; i < 3; i++) add({ t: 'smoke', x, y, vx: rnd(-50, 50), vy: rnd(10, 50), life: 0.6, size: 6, col: '190,160,120', drag: 0.93 });
          break;
        case 'bullet':
          chips(x, y, 14);
          fan(14, '255,210,120', 200, 600, 0.3);
          add({ t: 'flash', x, y, life: 0.06, size: 22, col: '255,220,150', rot: rnd(0, TAU), add: true });
          for (let i = 0; i < 4; i++) add({ t: 'smoke', x, y, vx: rnd(-60, 60), vy: rnd(10, 70), life: 0.7, size: rnd(6, 10), col: '170,150,130', drag: 0.94 });
          break;
        case 'electro':
          chips(x, y, 8);
          add({ t: 'glow', x, y, life: 0.3, size: 90, col: w.col, add: true });
          add({ t: 'ring', x, y, life: 0.3, size: 50, col: w.col, add: true });
          for (let i = 0; i < 7; i++) add({ t: 'arc', x, y, a1: rnd(-0.4, 0.4), life: rnd(0.15, 0.35), size: rnd(40, 80), col: w.col, add: true });
          fan(16, w.col, 200, 600, 0.4);
          break;
        case 'fire':
          chips(x, y, 10);
          add({ t: 'glow', x, y, life: 0.4, size: 140, col: '255,120,30', add: true });
          add({ t: 'ring', x, y, life: 0.4, size: 70, col: '255,160,60', add: true });
          for (let i = 0; i < 40; i++) {
            const a = rnd(0, TAU), sp = rnd(60, 380);
            add({ t: 'fire', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.7 - 60, life: rnd(0.3, 0.7), size: rnd(8, 20), col: '', drag: 0.92, add: true });
          }
          for (let i = 0; i < 18; i++) add({ t: 'ember', x, y, vx: rnd(-260, 260), vy: rnd(-260, 120), life: rnd(0.6, 1.4), size: rnd(1, 2.5), col: '255,180,70', g: 200, drag: 0.97, add: true });
          for (let i = 0; i < 7; i++) add({ t: 'smoke', x: x + rnd(-20, 20), y, vx: rnd(-40, 40), vy: rnd(-80, -20), life: rnd(1, 1.6), size: rnd(12, 20), col: '60,50,45', drag: 0.95 });
          break;
        case 'plasma':
          chips(x, y, 10);
          add({ t: 'glow', x, y, life: 0.4, size: 130, col: w.col, add: true });
          for (let i = 0; i < 3; i++) add({ t: 'ring', x, y, life: 0.3 + i * 0.12, size: 40 + i * 30, col: i === 1 ? '255,255,255' : w.col, add: true });
          for (let i = 0; i < 5; i++) add({ t: 'arc', x, y, a1: rnd(-0.6, 0.6), life: 0.25, size: rnd(30, 60), col: w.col, add: true });
          fan(22, '150,210,255', 150, 550, 0.45, 2);
          break;
        case 'disc':
          chips(x, y, 12);
          fan(24, w.col, 250, 700, 0.35, 1.4);
          add({ t: 'ring', x, y, life: 0.3, size: 40, col: w.col, add: true });
          add({ t: 'glow', x, y, life: 0.25, size: 70, col: w.col, add: true });
          break;
        case 'wave':
          chips(x, y, 12);
          add({ t: 'glow', x, y, life: 0.35, size: 110, col: w.col, add: true });
          fan(26, '200,230,255', 200, 650, 0.4, 1.5);
          add({ t: 'ring', x, y, life: 0.3, size: 50, col: w.col, add: true });
          break;
        case 'sniper':
          chips(x, y, 16, 1.2);
          add({ t: 'glow', x, y, life: 0.35, size: 100, col: w.col, add: true });
          add({ t: 'ring', x, y, life: 0.3, size: 45, col: '255,200,200', add: true });
          fan(26, '255,160,90', 250, 800, 0.5, 1.6);
          for (let i = 0; i < 4; i++) add({ t: 'smoke', x, y, vx: rnd(-40, 40), vy: rnd(-10, 50), life: 1, size: 8, col: '90,70,70', drag: 0.95 });
          break;
        case 'phaser':
          chips(x, y, 8);
          add({ t: 'glow', x, y, life: 0.3, size: 80, col: w.col, add: true });
          fan(18, '255,180,90', 150, 500, 0.4);
          break;
        case 'proton':
          chips(x, y, 10);
          add({ t: 'glow', x, y, life: 0.5, size: 110, col: '255,110,50', add: true });
          for (let i = 0; i < 6; i++) add({ t: 'arc', x, y, a1: rnd(-0.6, 0.6), life: 0.3, size: rnd(40, 80), col: i % 2 ? '120,180,255' : '255,120,60', add: true });
          fan(18, '255,170,90', 150, 500, 0.4);
          break;
        case 'tripod':
          chips(x, y, 18, 1.2);
          add({ t: 'glow', x, y, life: 0.5, size: 160, col: w.col, add: true });
          add({ t: 'ring', x, y, life: 0.45, size: 80, col: w.col, add: true });
          for (let i = 0; i < 30; i++) {
            const a = rnd(0, TAU), sp = rnd(60, 300);
            add({ t: 'fire', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 50, life: rnd(0.3, 0.7), size: rnd(8, 18), col: 'g', drag: 0.92, add: true });
          }
          for (let i = 0; i < 6; i++) add({ t: 'smoke', x, y, vx: rnd(-40, 40), vy: rnd(-60, 0), life: 1.4, size: 14, col: '40,50,40', drag: 0.95 });
          break;
        case 'iron':
          chips(x, y, 14, 1.2);
          add({ t: 'glow', x, y, life: 0.35, size: 140, col: w.col, add: true });
          for (let i = 0; i < 3; i++) add({ t: 'ring', x, y, life: 0.3 + i * 0.1, size: 50 + i * 28, col: i ? w.col : '255,255,255', add: true });
          fan(22, '200,240,255', 250, 700, 0.4, 1.5);
          break;
      }
    };

    const winBurst = () => {
      const s = st.current;
      s.status = 'win'; s.endT = 0; s.shake = 16; s.flash = 1;
      for (let i = 0; i < 8; i++) {
        const a1 = s.rot + (i / 8) * TAU, a2 = a1 + TAU / 8, am = (a1 + a2) / 2;
        add({ t: 'chunk', x: CX, y: CY, vx: Math.cos(am) * rnd(150, 300), vy: Math.sin(am) * rnd(150, 300) - 200, g: 900, life: 2, size: R, rot: 0, vr: rnd(-4, 4), a1: a1 - s.rot, a2: a2 - s.rot, col: '' });
      }
      s.stuck.forEach((k: Stuck) => {
        const wa = k.a + s.rot;
        add({ t: 'stuckfly', x: CX + Math.cos(wa) * R, y: CY + Math.sin(wa) * R, vx: Math.cos(wa) * rnd(150, 350), vy: Math.sin(wa) * rnd(150, 350) - 250, g: 900, life: 2, size: 1, rot: wa, vr: rnd(-8, 8), kind: k.kind, col: k.col });
      });
      s.stuck = [];
      chips(CX, CY, 50, 1.4);
      for (let i = 0; i < 40; i++) { const a = rnd(0, TAU); add({ t: 'spark', x: CX, y: CY, vx: Math.cos(a) * rnd(200, 700), vy: Math.sin(a) * rnd(200, 700), life: 0.6, size: 2, col: '255,220,140', add: true, drag: 0.95 }); }
      add({ t: 'ring', x: CX, y: CY, life: 0.6, size: 220, col: '255,230,180', add: true });
      onHud({ hits: s.hits, status: 'win' });
    };

    const impact = (w: Weapon) => {
      const s = st.current;
      if (s.status !== 'play') return;
      const a = norm(Math.PI / 2 - s.rot);
      const x = CX, y = CY + R;
      const isP = PROTRUDE.has(w.stuck);
      const hit = s.stuck.find((k: Stuck) => adiff(k.a, a) < (isP && PROTRUDE.has(k.kind) ? 0.2 : 0.12));
      if (hit) {
        s.status = 'lose'; s.endT = 0; s.shake = 14;
        add({ t: 'stuckfly', x, y: y + 20, vx: rnd(-200, 200), vy: 500, g: 1200, life: 1.6, size: 1, rot: Math.PI / 2, vr: rnd(-14, 14), kind: w.stuck, col: w.col });
        for (let i = 0; i < 30; i++) { const an = rnd(0, TAU); add({ t: 'spark', x, y, vx: Math.cos(an) * rnd(200, 600), vy: Math.sin(an) * rnd(200, 600), life: 0.5, size: 2, col: '255,255,200', add: true, drag: 0.93 }); }
        add({ t: 'flash', x, y, life: 0.12, size: 50, col: '255,255,255', rot: 0, add: true });
        add({ t: 'ring', x, y, life: 0.4, size: 70, col: '255,80,80', add: true });
        onHud({ hits: s.hits, status: 'lose' });
        return;
      }
      s.stuck.push({ a, kind: w.stuck, col: w.col, born: s.t, seed: Math.random() });
      s.hits++; s.flash = 0.6; s.bump = 1; s.shake = Math.max(s.shake, w.kind === 'beam' ? 7 : 4);
      spawnImpact(w, x, y);
      if (s.hits >= TARGET) setTimeout(winBurst, 120);
      onHud({ hits: s.hits, status: 'play' });
    };

    fireRef.current = () => {
      const s = st.current; const w = wRef.current;
      if (!s || s.status !== 'play' || s.cd > 0) return;
      s.cd = w.cd; s.fireT = 0; s.recoil = 1;
      const m = muzzlePos();
      spawnMuzzle(w, m.x, m.y);
      if (w.kind === 'proj') {
        s.projs.push({ x: m.x, y: m.y, w, age: 0, spin: 0 });
      } else {
        const dur = w.beam === 'proton' ? 0.55 : w.beam === 'tripod' ? 0.45 : w.beam === 'sniper' ? 0.32 : 0.28;
        s.beams.push({ w, life: dur, max: dur, seed: Math.random() * 100 });
        impact(w);
      }
    };

    // ---------- drawing ----------
    const drawStuck = (k: { kind: string; col: string; born: number; seed: number }, now: number, local = true) => {
      // in local frame: +x outward, rim at x=R (if local) else at x=0
      const base = local ? R : 0;
      const age = now - k.born;
      c.save(); c.translate(base, 0);
      switch (k.kind) {
        case 'arrow':
          c.save(); c.scale(-1, 1); c.translate(12, 0); drawArrowShape(c, 92); c.restore();
          break;
        case 'bullet':
        case 'electro': {
          c.fillStyle = 'rgba(20,10,4,0.85)'; c.beginPath(); c.arc(-3, 0, 6, 0, TAU); c.fill();
          c.strokeStyle = 'rgba(30,15,5,0.7)'; c.lineWidth = 1;
          for (let i = 0; i < 5; i++) { const a = Math.PI + (i - 2) * 0.45 + k.seed; c.beginPath(); c.moveTo(-3, 0); c.lineTo(-3 + Math.cos(a) * 14, Math.sin(a) * 14); c.stroke(); }
          rr(c, -2, -3, 11, 6, 3);
          c.fillStyle = k.kind === 'electro' ? lg(c, 0, -3, 0, 3, [[0, '#e6f6ff'], [1, '#3a6a8a']]) : lg(c, 0, -3, 0, 3, [[0, '#ffe7a0'], [0.5, '#c88a2a'], [1, '#6a4410']]);
          c.fill();
          if (k.kind === 'electro') {
            c.globalCompositeOperation = 'lighter';
            glow(c, 2, 0, 16, k.col, 0.4 + 0.2 * Math.sin(now * 20 + k.seed * 9));
            if (Math.random() < 0.25) bolt(c, 4, 0, rnd(-30, 10), rnd(-22, 22), k.col, 0.7, 4, 5);
            c.globalCompositeOperation = 'source-over';
          }
          if (age < 0.4) { c.globalCompositeOperation = 'lighter'; glow(c, 0, 0, 20, '255,200,120', 1 - age / 0.4); c.globalCompositeOperation = 'source-over'; }
          break;
        }
        case 'burn': {
          const g = c.createRadialGradient(-6, 0, 0, -6, 0, 22);
          g.addColorStop(0, 'rgba(10,4,2,0.95)'); g.addColorStop(0.6, 'rgba(40,15,5,0.6)'); g.addColorStop(1, 'rgba(40,15,5,0)');
          c.fillStyle = g; c.beginPath(); c.arc(-6, 0, 22, 0, TAU); c.fill();
          c.globalCompositeOperation = 'lighter';
          const e = Math.max(0.25, 1 - age * 0.4);
          for (let i = 0; i < 5; i++) glow(c, -8 + Math.sin(k.seed * 10 + i) * 8, Math.cos(k.seed * 7 + i * 2) * 10, 5 + Math.sin(now * 8 + i) * 1.5, '255,120,30', e * 0.8);
          c.globalCompositeOperation = 'source-over';
          break;
        }
        case 'scorch': {
          const g = c.createRadialGradient(-5, 0, 0, -5, 0, 18);
          g.addColorStop(0, 'rgba(15,6,3,0.95)'); g.addColorStop(1, 'rgba(15,6,3,0)');
          c.fillStyle = g; c.beginPath(); c.ellipse(-5, 0, 18, 10, 0, 0, TAU); c.fill();
          c.globalCompositeOperation = 'lighter';
          const e = Math.max(0.2, 1 - age * 0.5);
          glow(c, -4, 0, 14, k.col, e);
          c.fillStyle = `rgba(255,240,200,${e * 0.9})`; c.beginPath(); c.ellipse(-3, 0, 5, 3, 0, 0, TAU); c.fill();
          c.globalCompositeOperation = 'source-over';
          break;
        }
        case 'plasma': {
          c.globalCompositeOperation = 'lighter';
          const e = 0.5 + 0.3 * Math.sin(now * 6 + k.seed * 5);
          glow(c, -6, 0, 22, k.col, e);
          for (let i = 0; i < 6; i++) { const a = Math.PI + (i - 2.5) * 0.5; c.fillStyle = `rgba(${k.col},0.8)`; c.beginPath(); c.arc(-6 + Math.cos(a) * 9, Math.sin(a) * 9, 2.5, 0, TAU); c.fill(); }
          c.fillStyle = 'rgba(220,240,255,0.9)'; c.beginPath(); c.arc(-4, 0, 4, 0, TAU); c.fill();
          c.globalCompositeOperation = 'source-over';
          break;
        }
        case 'disc':
          c.save(); c.translate(8, 0); c.scale(0.35, 1);
          drawDiscShape(c, 24, 0, k.col, 0.9);
          c.restore();
          break;
        case 'slash': {
          c.globalCompositeOperation = 'lighter';
          const e = Math.max(0.25, 1 - age * 0.5);
          c.strokeStyle = `rgba(${k.col},${0.4 * e})`; c.lineWidth = 8;
          c.beginPath(); c.arc(30, 0, 34, Math.PI - 0.55, Math.PI + 0.55); c.stroke();
          c.strokeStyle = `rgba(230,245,255,${0.9 * e})`; c.lineWidth = 2;
          c.beginPath(); c.arc(30, 0, 34, Math.PI - 0.5, Math.PI + 0.5); c.stroke();
          c.globalCompositeOperation = 'source-over';
          break;
        }
      }
      c.restore();
    };

    const drawWheel = (s: any) => {
      const bump = s.bump * 6;
      c.save(); c.translate(CX, CY - bump);
      c.globalCompositeOperation = 'lighter';
      glow(c, 0, 0, R * 1.9, '255,170,90', 0.13);
      c.globalCompositeOperation = 'source-over';
      c.fillStyle = 'rgba(0,0,0,0.45)'; c.beginPath(); c.ellipse(4, 12, R + 4, R + 2, 0, 0, TAU); c.fill();
      c.rotate(s.rot);
      // stuck items behind? draw protruding after wheel; marks on top of wheel
      // bark
      c.fillStyle = lg(c, -R, -R, R, R, [[0, '#6a3c1c'], [1, '#2a1406']]);
      c.beginPath(); c.arc(0, 0, R + 2, 0, TAU); c.fill();
      c.strokeStyle = 'rgba(0,0,0,0.35)'; c.lineWidth = 1.5;
      for (let i = 0; i < 40; i++) { const a = (i / 40) * TAU; c.beginPath(); c.moveTo(Math.cos(a) * (R - 6), Math.sin(a) * (R - 6)); c.lineTo(Math.cos(a + 0.03) * (R + 2), Math.sin(a + 0.03) * (R + 2)); c.stroke(); }
      const g = c.createRadialGradient(-15, -15, 5, 0, 0, R - 6);
      g.addColorStop(0, '#f2c98e'); g.addColorStop(0.6, '#d49a5a'); g.addColorStop(1, '#a8682e');
      c.fillStyle = g; c.beginPath(); c.arc(0, 0, R - 7, 0, TAU); c.fill();
      c.strokeStyle = 'rgba(120,64,22,0.45)'; c.lineWidth = 1.3;
      RINGS.forEach((rg) => {
        c.beginPath();
        rg.off.forEach((o, i) => { const a = (i / rg.off.length) * TAU; const rr2 = rg.r + o; i ? c.lineTo(Math.cos(a) * rr2, Math.sin(a) * rr2) : c.moveTo(Math.cos(a) * rr2, Math.sin(a) * rr2); });
        c.closePath(); c.stroke();
      });
      c.strokeStyle = 'rgba(70,35,10,0.55)'; c.lineWidth = 1.5;
      CRACKS.forEach((k) => { c.beginPath(); c.moveTo(Math.cos(k.a) * (R - 7), Math.sin(k.a) * (R - 7)); c.lineTo(Math.cos(k.a + 0.05) * (R - k.l * 0.5), Math.sin(k.a + 0.05) * (R - k.l * 0.5)); c.lineTo(Math.cos(k.a - 0.02) * (R - k.l), Math.sin(k.a - 0.02) * (R - k.l)); c.stroke(); });
      c.fillStyle = '#7a4318'; c.beginPath(); c.arc(0, 0, 7, 0, TAU); c.fill();
      c.fillStyle = '#e8b878'; c.beginPath(); c.arc(-2, -2, 2.5, 0, TAU); c.fill();
      // marks (flat) first, protruding after
      s.stuck.forEach((k: Stuck) => { if (!PROTRUDE.has(k.kind)) { c.save(); c.rotate(k.a); drawStuck(k, s.t); c.restore(); } });
      if (s.flash > 0) { c.fillStyle = `rgba(255,250,235,${s.flash * 0.35})`; c.beginPath(); c.arc(0, 0, R, 0, TAU); c.fill(); }
      s.stuck.forEach((k: Stuck) => { if (PROTRUDE.has(k.kind)) { c.save(); c.rotate(k.a); drawStuck(k, s.t); c.restore(); } });
      c.restore();
    };

    const drawProj = (p: any) => {
      const w: Weapon = p.w; const x = p.x, y = p.y;
      c.save();
      switch (w.proj) {
        case 'arrow':
          c.translate(x, y); c.rotate(-Math.PI / 2);
          c.globalCompositeOperation = 'lighter';
          c.fillStyle = lg(c, -140, 0, 0, 0, [[0, 'rgba(255,240,200,0)'], [1, 'rgba(255,240,200,0.3)']]); c.fillRect(-150, -3, 150, 6);
          c.globalCompositeOperation = 'source-over';
          drawArrowShape(c, 92);
          break;
        case 'bullet': {
          c.globalCompositeOperation = 'lighter';
          c.fillStyle = lg(c, 0, y, 0, y + 130, [[0, `rgba(${w.col},0.95)`], [1, `rgba(${w.col},0)`]]);
          c.beginPath(); c.moveTo(x - 2.5, y); c.lineTo(x + 2.5, y); c.lineTo(x + 0.6, y + 130); c.lineTo(x - 0.6, y + 130); c.fill();
          glow(c, x, y, 12, w.col, 0.7);
          c.globalCompositeOperation = 'source-over';
          c.fillStyle = lg(c, x - 3, 0, x + 3, 0, [[0, '#6a4410'], [0.5, '#ffe2a0'], [1, '#8a5a1a']]);
          c.beginPath(); c.moveTo(x, y - 5); c.quadraticCurveTo(x + 3, y - 2, x + 3, y + 4); c.lineTo(x - 3, y + 4); c.quadraticCurveTo(x - 3, y - 2, x, y - 5); c.fill();
          break;
        }
        case 'electro':
          c.globalCompositeOperation = 'lighter';
          c.fillStyle = lg(c, 0, y, 0, y + 90, [[0, `rgba(${w.col},0.9)`], [1, `rgba(${w.col},0)`]]);
          c.fillRect(x - 3, y, 6, 90);
          glow(c, x, y, 28, w.col, 0.9);
          c.fillStyle = '#fff'; c.beginPath(); c.ellipse(x, y + 4, 3.5, 9, 0, 0, TAU); c.fill();
          for (let i = 0; i < 3; i++) bolt(c, x, y, x + rnd(-24, 24), y + rnd(10, 70), w.col, 0.8, 5, 6);
          c.globalCompositeOperation = 'source-over';
          break;
        case 'fire': {
          c.globalCompositeOperation = 'lighter';
          // outer halo
          glow(c, x, y, 80, '255,80,20', 0.55);
          glow(c, x, y, 40, '255,150,40', 0.85);
          glow(c, x, y, 18, '255,230,140', 1);
          // body flame teardrop
          const ag = Math.atan2(-p.w.speed, 0); // up
          c.save(); c.translate(x, y); c.rotate(ag);
          const flick = Math.sin(p.age * 60) * 2;
          // outer red-orange
          c.fillStyle = 'rgba(255,80,20,0.9)';
          c.beginPath(); c.moveTo(0, 22); c.quadraticCurveTo(-14, 0, -8, -18); c.quadraticCurveTo(0, -28 + flick, 8, -18); c.quadraticCurveTo(14, 0, 0, 22); c.fill();
          // middle yellow
          c.fillStyle = 'rgba(255,190,60,0.95)';
          c.beginPath(); c.moveTo(0, 14); c.quadraticCurveTo(-8, 0, -5, -14); c.quadraticCurveTo(0, -22 + flick, 5, -14); c.quadraticCurveTo(8, 0, 0, 14); c.fill();
          // white core
          c.fillStyle = 'rgba(255,245,210,0.95)';
          c.beginPath(); c.moveTo(0, 6); c.quadraticCurveTo(-3, -2, -2, -10); c.quadraticCurveTo(0, -16 + flick * 0.7, 2, -10); c.quadraticCurveTo(3, -2, 0, 6); c.fill();
          // two side flame tongues
          for (const sgn of [-1, 1]) {
            c.fillStyle = 'rgba(255,140,40,0.8)';
            c.beginPath();
            c.moveTo(sgn * 4, 10);
            c.quadraticCurveTo(sgn * (14 + flick), 2, sgn * (16 + flick), -14);
            c.quadraticCurveTo(sgn * 10, -4, sgn * 4, 8);
            c.fill();
          }
          c.restore();
          c.globalCompositeOperation = 'source-over';
          break;
        }
        case 'plasma':
          c.globalCompositeOperation = 'lighter';
          c.fillStyle = lg(c, 0, y, 0, y + 70, [[0, `rgba(${w.col},0.8)`], [1, `rgba(${w.col},0)`]]);
          c.beginPath(); c.moveTo(x - 9, y); c.lineTo(x + 9, y); c.lineTo(x, y + 70); c.fill();
          glow(c, x, y, 40 + Math.sin(p.age * 60) * 4, w.col, 0.9);
          glow(c, x, y, 16, '230,245,255', 1);
          for (let i = 0; i < 2; i++) bolt(c, x, y, x + rnd(-26, 26), y + rnd(-26, 26), w.col, 0.7, 4, 5);
          c.globalCompositeOperation = 'source-over';
          break;
        case 'disc':
          for (let i = 4; i >= 1; i--) { c.save(); c.globalAlpha = 0.15 * (5 - i) / 4; c.translate(x, y + i * 18); c.scale(1, 0.45); drawDiscShape(c, 26, p.spin - i, w.col, 0.6); c.restore(); }
          c.translate(x, y); c.scale(1, 0.45); drawDiscShape(c, 26, p.spin, w.col, 1);
          break;
        case 'wave': {
          const sc = 0.8 + Math.min(1, p.age * 3) * 0.5;
          c.translate(x, y); c.scale(sc, sc);
          c.globalCompositeOperation = 'lighter';
          for (let i = 0; i < 4; i++) {
            c.strokeStyle = `rgba(${w.col},${0.15 + 0.1 * i})`; c.lineWidth = 16 - i * 3;
            c.beginPath(); c.arc(0, 40 + i * 6, 46, -Math.PI / 2 - 0.9, -Math.PI / 2 + 0.9); c.stroke();
          }
          c.strokeStyle = 'rgba(240,250,255,0.95)'; c.lineWidth = 3;
          c.beginPath(); c.arc(0, 40, 46, -Math.PI / 2 - 0.85, -Math.PI / 2 + 0.85); c.stroke();
          glow(c, 0, -4, 40, w.col, 0.5);
          c.globalCompositeOperation = 'source-over';
          break;
        }
      }
      c.restore();
    };

    const drawBeam = (b: any, s: any) => {
      const w: Weapon = b.w; const m = muzzlePos();
      const x1 = m.x, y1 = m.y, x2 = CX, y2 = CY + R - 4;
      const k = b.life / b.max; // 1 -> 0
      c.save(); c.globalCompositeOperation = 'lighter';
      const line = (wd: number, col: string, wob = 0, freq = 0.08, ph = 0) => {
        c.beginPath();
        const n = 30;
        for (let i = 0; i <= n; i++) {
          const yy = y1 + (y2 - y1) * (i / n);
          const env = Math.sin((i / n) * Math.PI);
          const xx = x1 + (x2 - x1) * (i / n) + Math.sin(yy * freq + s.t * 40 + ph) * wob * env;
          i ? c.lineTo(xx, yy) : c.moveTo(xx, yy);
        }
        c.strokeStyle = col; c.lineWidth = wd; c.lineCap = 'round'; c.stroke();
      };
      switch (w.beam) {
        case 'sniper':
          line(22 * k, `rgba(255,30,60,${0.18 * k})`);
          line(8 * k, `rgba(255,50,80,${0.6 * k})`);
          line(2.5, `rgba(255,235,235,${k})`);
          for (let i = 0; i < 6; i++) { const yy = y1 + (y2 - y1) * ((s.t * 3 + i / 6) % 1); glow(c, x1, yy, 10, '255,60,80', 0.5 * k); }
          break;
        case 'phaser': {
          const pulse = 0.7 + 0.3 * Math.sin(s.t * 120);
          line(16 * k, `rgba(255,90,30,${0.25 * k})`);
          line(6 * pulse, `rgba(255,130,50,${0.8 * k})`);
          line(2, `rgba(255,240,200,${k})`);
          break;
        }
        case 'proton':
          line(26, `rgba(255,80,30,${0.15 * k})`, 10, 0.05);
          line(7, `rgba(255,110,40,${0.8 * k})`, 14, 0.06);
          line(5, `rgba(255,170,90,${0.7 * k})`, 10, 0.09, 2);
          line(2, `rgba(255,240,220,${k})`, 12, 0.06);
          for (let i = 0; i < 3; i++) bolt(c, x1, y1, x2 + rnd(-10, 10), y2, '120,170,255', 1, 14, 18);
          glow(c, x2, y2, 50, '255,120,50', 0.6 * k);
          if (Math.random() < 0.6) add({ t: 'spark', x: x2, y: y2, vx: rnd(-300, 300), vy: rnd(0, 300), life: 0.3, size: 1.5, col: '255,180,100', add: true, g: 400 });
          break;
        case 'tripod':
          line(40 * k, `rgba(60,255,100,${0.12 * k})`, 4, 0.04);
          line(16 * k, `rgba(90,255,130,${0.45 * k})`, 3, 0.05);
          line(5, `rgba(235,255,235,${k})`, 2, 0.07);
          for (let i = 0; i < 2; i++) {
            const yy = rnd(y2, y1);
            add({ t: 'fire', x: x1 + rnd(-6, 6), y: yy, vx: rnd(-40, 40), vy: rnd(-40, 10), life: 0.3, size: rnd(5, 10), col: 'g', add: true, drag: 0.9 });
          }
          glow(c, x2, y2, 60, '90,255,120', 0.7 * k);
          break;
        case 'iron': {
          line(44 * k, `rgba(120,200,255,${0.15 * k})`);
          line(20 * k, `rgba(160,225,255,${0.55 * k})`);
          line(8 * k, `rgba(255,255,255,${k})`);
          const ph = (1 - k) * 4;
          for (let i = 0; i < 4; i++) {
            const u = (i / 4 + ph) % 1; const yy = y1 + (y2 - y1) * u;
            c.strokeStyle = `rgba(200,240,255,${0.6 * k})`; c.lineWidth = 2;
            c.beginPath(); c.ellipse(x1, yy, 16 * k + 4, 5, 0, 0, TAU); c.stroke();
          }
          break;
        }
      }
      c.restore();
    };

    const drawPart = (p: P) => {
      const k = Math.max(0, p.life / p.max);
      c.save();
      if (p.add) c.globalCompositeOperation = 'lighter';
      switch (p.t) {
        case 'spark': {
          c.strokeStyle = `rgba(${p.col},${k})`; c.lineWidth = p.size; c.lineCap = 'round';
          c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(p.x - p.vx * 0.03, p.y - p.vy * 0.03); c.stroke();
          break;
        }
        case 'glow': glow(c, p.x, p.y, p.size * (0.6 + 0.4 * k), p.col, k); break;
        case 'ring':
          c.strokeStyle = `rgba(${p.col},${k * 0.9})`; c.lineWidth = 3 * k + 0.5;
          c.beginPath(); c.arc(p.x, p.y, p.size * (1 - k * 0.8), 0, TAU); c.stroke();
          break;
        case 'flash': {
          c.translate(p.x, p.y); c.rotate(p.rot || 0);
          glow(c, 0, 0, p.size * 1.3, p.col, k);
          c.fillStyle = `rgba(255,250,230,${k})`;
          c.beginPath();
          const n = 6;
          for (let i = 0; i < n * 2; i++) {
            const a = (i / (n * 2)) * TAU; const r = i % 2 ? p.size * 0.18 : p.size * (i % 4 === 0 ? 1.1 : 0.6);
            i ? c.lineTo(Math.cos(a) * r, Math.sin(a) * r) : c.moveTo(Math.cos(a) * r, Math.sin(a) * r);
          }
          c.fill();
          c.fillStyle = `rgba(${p.col},${k * 0.8})`; c.beginPath(); c.ellipse(0, -p.size * 0.5, p.size * 0.25, p.size * 0.9, 0, 0, TAU); c.fill();
          break;
        }
        case 'smoke':
          c.fillStyle = `rgba(${p.col},${k * 0.25})`;
          c.beginPath(); c.arc(p.x, p.y, p.size * (2 - k), 0, TAU); c.fill();
          break;
        case 'fire': {
          const sz = p.size * (0.4 + k * 0.8);
          const col = p.col === 'g' ? (k > 0.6 ? '220,255,220' : k > 0.3 ? '90,255,120' : '20,120,40') : (k > 0.7 ? '255,240,180' : k > 0.4 ? '255,150,40' : '220,50,10');
          glow(c, p.x, p.y, sz * 1.3, col, k * 0.8);
          glow(c, p.x, p.y, sz * 0.55, '255,220,120', k * 0.9);
          // small bright core teardrop (ke atas searah kecepatan)
          const ang = Math.atan2(p.vy, p.vx);
          c.save(); c.translate(p.x, p.y); c.rotate(ang + Math.PI / 2);
          c.fillStyle = `rgba(255,240,200,${k * 0.9})`;
          c.beginPath(); c.ellipse(0, 0, sz * 0.35, sz * 0.6, 0, 0, TAU); c.fill();
          c.restore();
          break;
        }
        case 'ember':
          c.fillStyle = `rgba(${p.col},${k})`; c.beginPath(); c.arc(p.x, p.y, p.size, 0, TAU); c.fill();
          glow(c, p.x, p.y, p.size * 4, p.col, k * 0.5);
          break;
        case 'bolt': bolt(c, p.x, p.y, p.x + p.vx, p.y + p.vy, p.col, p.size, 5, 6); break;
        case 'arc': {
          const a = Math.PI / 2 + (p.a1 || 0) - Math.PI; // upward into wheel
          const ex = p.x + Math.cos(a + rnd(-0.8, 0.8)) * p.size, ey = p.y + Math.sin(a + rnd(-0.8, 0.8)) * p.size;
          c.globalAlpha = k; bolt(c, p.x, p.y, ex, ey, p.col, 1.2, 7, 9);
          break;
        }
        case 'chip':
          c.translate(p.x, p.y); c.rotate(p.rot || 0); c.globalAlpha = Math.min(1, k * 2);
          c.fillStyle = p.col; c.fillRect(-p.size, -p.size * 0.4, p.size * 2, p.size * 0.8);
          break;
        case 'shell':
          c.translate(p.x, p.y); c.rotate(p.rot || 0);
          c.fillStyle = lg(c, 0, -2, 0, 2, [[0, '#fff0b0'], [0.5, '#d49a2a'], [1, '#6a4410']]);
          c.fillRect(-5, -2, 10, 4); c.fillStyle = '#8a5a1a'; c.fillRect(4, -2.4, 1.5, 4.8);
          break;
        case 'chunk': {
          c.translate(p.x, p.y); c.rotate(p.rot || 0); c.globalAlpha = Math.min(1, k * 2);
          c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, p.size, p.a1!, p.a2!); c.closePath();
          const g = c.createRadialGradient(0, 0, 5, 0, 0, p.size); g.addColorStop(0, '#f2c98e'); g.addColorStop(0.85, '#b87838'); g.addColorStop(1, '#3a1c08');
          c.fillStyle = g; c.fill(); c.strokeStyle = '#5a2c10'; c.lineWidth = 2; c.stroke();
          break;
        }
        case 'stuckfly':
          c.translate(p.x, p.y); c.rotate(p.rot || 0); c.globalAlpha = Math.min(1, k * 2);
          drawStuck({ kind: p.kind!, col: p.col, born: -9, seed: 0.5 }, 0, false);
          break;
      }
      c.restore();
    };

    const loop = (now: number) => {
      const dt = Math.min(0.033, (now - last) / 1000); last = now;
      const s = st.current; const w = wRef.current;
      if (!s) { raf = requestAnimationFrame(loop); return; }
      s.t += dt; s.cd = Math.max(0, s.cd - dt); s.fireT += dt;
      s.recoil *= Math.pow(0.0008, dt); s.flash = Math.max(0, s.flash - dt * 3); s.bump *= Math.pow(0.001, dt); s.shake *= Math.pow(0.002, dt);
      if (s.status === 'play') {
        const sp = 1.9 + Math.sin(s.t * 0.7) * 1.3 + Math.sin(s.t * 2.3) * 0.4;
        s.rot += sp * dt;
      } else s.endT += dt;

      // projectiles
      for (let i = s.projs.length - 1; i >= 0; i--) {
        const p = s.projs[i]; p.age += dt; p.spin += dt * 25;
        p.y -= p.w.speed * dt;
        if (p.w.proj === 'fire') {
          for (let j = 0; j < 4; j++) add({ t: 'fire', x: p.x + rnd(-8, 8), y: p.y + rnd(0, 20), vx: rnd(-60, 60), vy: rnd(40, 200), life: rnd(0.2, 0.45), size: rnd(8, 16), col: '', drag: 0.9, add: true });
          if (Math.random() < 0.5) add({ t: 'ember', x: p.x, y: p.y, vx: rnd(-80, 80), vy: rnd(0, 120), life: 0.6, size: 1.5, col: '255,190,80', add: true, drag: 0.95 });
        }
        if (p.w.proj === 'disc' && Math.random() < 0.6) add({ t: 'spark', x: p.x + rnd(-26, 26), y: p.y, vx: 0, vy: 200, life: 0.2, size: 1.2, col: p.w.col, add: true });
        if (p.w.proj === 'wave' && Math.random() < 0.8) add({ t: 'spark', x: p.x + rnd(-40, 40), y: p.y + rnd(0, 20), vx: rnd(-40, 40), vy: 150, life: 0.25, size: 1.2, col: p.w.col, add: true });
        const tip = p.w.proj === 'disc' ? 12 : p.w.proj === 'wave' ? 6 : 0;
        if (p.y - tip <= CY + R) { s.projs.splice(i, 1); impact(p.w); }
      }
      for (let i = s.beams.length - 1; i >= 0; i--) { s.beams[i].life -= dt; if (s.beams[i].life <= 0) s.beams.splice(i, 1); }
      // ambient weapon fx
      if (w.id === 'dragon' && Math.random() < 0.25) {
        const m = muzzlePos();
        add({ t: 'smoke', x: m.x + rnd(-6, 6), y: m.y + 10, vx: rnd(-10, 10), vy: rnd(-40, -15), life: 1.2, size: 4, col: '120,100,90', drag: 0.98 });
        if (Math.random() < 0.4) add({ t: 'ember', x: m.x, y: m.y + 8, vx: rnd(-20, 20), vy: rnd(-60, -20), life: 0.8, size: 1.2, col: '255,170,60', add: true, drag: 0.98 });
      }
      for (let i = s.parts.length - 1; i >= 0; i--) {
        const p: P = s.parts[i];
        if (p.max === 0) { s.parts.splice(i, 1); continue; }
        p.life -= dt;
        if (p.life <= 0) { s.parts.splice(i, 1); continue; }
        if (p.drag) { const d = Math.pow(p.drag, dt * 60); p.vx *= d; p.vy *= d; }
        if (p.g) p.vy += p.g * dt;
        p.x += p.vx * dt; p.y += p.vy * dt;
        if (p.vr) p.rot = (p.rot || 0) + p.vr * dt;
      }
      if (s.parts.length > 900) s.parts.splice(0, s.parts.length - 900);

      // ---- render ----
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.fillStyle = '#07060b'; c.fillRect(0, 0, canvas.width, canvas.height);
      c.setTransform(scale, 0, 0, scale, ox, oy);
      c.save();
      if (s.shake > 0.1) c.translate(rnd(-s.shake, s.shake), rnd(-s.shake, s.shake));
      const bg = c.createRadialGradient(CX, CY, 20, CX, CY + 200, 700);
      bg.addColorStop(0, '#2a1c2e'); bg.addColorStop(0.5, '#130f1f'); bg.addColorStop(1, '#05040a');
      c.fillStyle = bg; c.fillRect(-40, -40, GW + 80, GH + 80);
      STARS.forEach((st2) => { c.fillStyle = `rgba(255,240,220,${0.25 + 0.25 * Math.sin(s.t * 2 + st2.p)})`; c.fillRect(st2.x, st2.y, st2.s, st2.s); });
      // floor glow
      c.globalCompositeOperation = 'lighter';
      glow(c, CX, BASE + 40, 220, `${w.col}`, 0.12);
      c.globalCompositeOperation = 'source-over';

      // plasmacaster tri-laser on wheel
      if (w.id === 'plasma' && s.status === 'play') {
        c.save(); c.globalCompositeOperation = 'lighter';
        const tx = CX, ty = CY + R - 10;
        const m = muzzlePos();
        c.strokeStyle = 'rgba(255,30,30,0.18)'; c.lineWidth = 1;
        for (let i = 0; i < 3; i++) {
          const a = -Math.PI / 2 + i * TAU / 3; const px = tx + Math.cos(a) * 7, py = ty + Math.sin(a) * 7;
          c.beginPath(); c.moveTo(m.x, m.y + 45); c.lineTo(px, py); c.stroke();
          c.fillStyle = '#ff2a2a'; c.beginPath(); c.arc(px, py, 2, 0, TAU); c.fill(); glow(c, px, py, 7, '255,30,30', 0.8);
        }
        c.restore();
      }
      // sniper laser sight
      if (w.id === 'sniper' && s.status === 'play') {
        const m = muzzlePos();
        c.save(); c.globalCompositeOperation = 'lighter';
        c.strokeStyle = `rgba(255,40,60,${0.12 + 0.08 * Math.sin(s.t * 6)})`; c.lineWidth = 1;
        c.beginPath(); c.moveTo(m.x, m.y); c.lineTo(CX, CY + R); c.stroke();
        glow(c, CX, CY + R - 2, 8, '255,40,60', 0.8);
        c.restore();
      }

      if (s.status !== 'win') drawWheel(s);
      s.beams.forEach((b: any) => drawBeam(b, s));
      s.projs.forEach(drawProj);

      // weapon
      c.save();
      const ready = s.cd > 0 ? 1 - s.cd / w.cd : 1;
      c.translate(CX, BASE + s.recoil * 14);
      c.rotate(-Math.PI / 2);
      drawWeapon(c, w.id, { t: s.t, ready: s.status === 'play' ? ready : 0.3, fireT: s.fireT });
      c.restore();

      s.parts.forEach(drawPart);
      c.restore();

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    const key = (e: KeyboardEvent) => { if (e.code === 'Space') { e.preventDefault(); fireRef.current(); } };
    window.addEventListener('keydown', key);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); window.removeEventListener('keydown', key); };
  }, []); // eslint-disable-line

  return <canvas ref={cv} className="w-full h-full block touch-none cursor-crosshair" onPointerDown={() => fireRef.current()} />;
}
