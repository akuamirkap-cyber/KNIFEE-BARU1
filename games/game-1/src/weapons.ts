export type Kind = 'arrow' | 'bullet' | 'beam' | 'fire' | 'slash' | 'plasma' | 'disc' | 'stream' | 'heat' | 'repulsor' | 'burst' | 'spine' | 'singularity' | 'shard' | 'acid' | 'buster';

export interface Weapon {
  name: string;
  kind: Kind;
  rate: number;
  auto: boolean;
  dmg: number;
  color: string;
  muzzle: number;
  electro?: boolean;
  icon: string;
  desc: string;
}

export const WEAPONS: Weapon[] = [
  { name: 'Busur Panah', kind: 'arrow', rate: 320, auto: false, dmg: 12, color: '#ffd27a', muzzle: 120, icon: '🏹', desc: 'Tarikan kilat berdaya tembus tinggi' },
  { name: 'AK-47', kind: 'bullet', rate: 105, auto: true, dmg: 4, color: '#ffb347', muzzle: 178, icon: '🔥', desc: '7.62mm tracer, recoil kuat' },
  { name: 'Rifle M4', kind: 'bullet', rate: 85, auto: true, dmg: 3.5, color: '#ffe08a', muzzle: 172, icon: '🎯', desc: '5.56mm tracer presisi' },
  { name: 'Rifle Electro', kind: 'bullet', rate: 95, auto: true, dmg: 4.5, color: '#3ff0ff', muzzle: 176, electro: true, icon: '⚡', desc: 'Peluru listrik berantai' },
  { name: 'MP5', kind: 'bullet', rate: 65, auto: true, dmg: 2.5, color: '#ffd36b', muzzle: 128, icon: '🔫', desc: '9mm SMG cepat' },
  { name: 'MP5 Electro', kind: 'bullet', rate: 70, auto: true, dmg: 3, color: '#b06bff', muzzle: 130, electro: true, icon: '⚡', desc: 'SMG ungu bertegangan tinggi' },
  { name: 'Sniper Beam', kind: 'beam', rate: 900, auto: false, dmg: 22, color: '#ff2a6d', muzzle: 205, icon: '🔭', desc: 'Sinar railgun menembus' },
  { name: 'Dragon Breath', kind: 'fire', rate: 650, auto: false, dmg: 16, color: '#ff6a00', muzzle: 175, icon: '🐉', desc: 'Naga api menyembur' },
  { name: 'Beretta 92', kind: 'bullet', rate: 200, auto: false, dmg: 6, color: '#ffe6a0', muzzle: 82, icon: '🔫', desc: 'Pistol 9mm klasik' },
  { name: 'Phaser', kind: 'beam', rate: 320, auto: false, dmg: 9, color: '#ff7a1a', muzzle: 92, icon: '🖖', desc: 'Star Trek Type-2 phaser' },
  { name: 'Energy Sword', kind: 'slash', rate: 420, auto: false, dmg: 12, color: '#4fc8ff', muzzle: 150, icon: '🗡️', desc: 'Tebasan gelombang plasma' },
  { name: 'Plasmacaster', kind: 'plasma', rate: 700, auto: false, dmg: 17, color: '#4aa8ff', muzzle: 120, icon: '👽', desc: 'Predator shoulder cannon' },
  { name: 'Identity Disc', kind: 'disc', rate: 300, auto: false, dmg: 14, color: '#00f0ff', muzzle: 40, icon: '💿', desc: 'Cakram Tron kembali ke tangan' },
  { name: 'Proton Pack', kind: 'stream', rate: 0, auto: true, dmg: 14, color: '#ff8a2a', muzzle: 150, icon: '👻', desc: 'Tahan untuk menyemburkan aliran proton' },
  { name: 'Tripod Heat-Ray', kind: 'heat', rate: 1300, auto: false, dmg: 30, color: '#e8ffb8', muzzle: 120, icon: '🛸', desc: 'War of the Worlds heat-ray' },
  { name: 'Iron Man Repulsor', kind: 'repulsor', rate: 380, auto: false, dmg: 11, color: '#9feaff', muzzle: 70, icon: '🦾', desc: 'Repulsor dari telapak tangan' },
  { name: 'Predator Shoulder Cannon', kind: 'burst', rate: 850, auto: false, dmg: 8, color: '#ff5a2a', muzzle: 128, icon: '👽', desc: 'Meriam pundak Yautja: 3 ledakan plasma beruntun' },
  { name: 'Xeno Spine Launcher', kind: 'spine', rate: 135, auto: true, dmg: 5, color: '#8dff5a', muzzle: 158, icon: '🦂', desc: 'Tulang berduri Xenomorph dengan racun asam' },
  { name: 'Void Singularity Cannon', kind: 'singularity', rate: 1150, auto: false, dmg: 26, color: '#b26cff', muzzle: 176, icon: '🌌', desc: 'Bola gravitasi alien — menghisap lalu meledak' },
  { name: 'Kryon Shard Cannon', kind: 'shard', rate: 460, auto: false, dmg: 13, color: '#7fe8ff', muzzle: 166, icon: '❄️', desc: 'Kristal kriogenik alien yang pecah berkeping' },
  { name: 'Xeno Acid Blood', kind: 'acid', rate: 230, auto: true, dmg: 7, color: '#b6ff2a', muzzle: 148, icon: '☠️', desc: 'Darah asam Xenomorph bertekanan — melubangi baja' },
  { name: 'Mega Buster', kind: 'buster', rate: 240, auto: false, dmg: 9, color: '#5ac8ff', muzzle: 118, icon: '🤖', desc: 'Tahan untuk charge shot, lepas untuk menembak' },
];

type C = CanvasRenderingContext2D;

export function rr(c: C, x: number, y: number, w: number, h: number, r: number) {
  r = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
  c.beginPath();
  c.moveTo(x + r, y);
  c.lineTo(x + w - r, y);
  c.quadraticCurveTo(x + w, y, x + w, y + r);
  c.lineTo(x + w, y + h - r);
  c.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  c.lineTo(x + r, y + h);
  c.quadraticCurveTo(x, y + h, x, y + h - r);
  c.lineTo(x, y + r);
  c.quadraticCurveTo(x, y, x + r, y);
  c.closePath();
}

/* ===================== MATERIAL TOOLKIT ===================== */
function vg(c: C, y0: number, y1: number, cols: string[]) {
  const g = c.createLinearGradient(0, y0, 0, y1);
  cols.forEach((col, i) => g.addColorStop(i / (cols.length - 1), col));
  return g;
}
function vgx(c: C, x0: number, x1: number, cols: string[]) {
  const g = c.createLinearGradient(x0, 0, x1, 0);
  cols.forEach((col, i) => g.addColorStop(i / (cols.length - 1), col));
  return g;
}
/** deterministic random so nothing flickers between frames */
function prand(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let x = Math.imul(s ^ (s >>> 15), 1 | s);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}
const METAL = ['#8b9199', '#41464d', '#191b1e', '#2e3238'];
const DARK = ['#4a4f56', '#22252a', '#0b0c0e'];
const WOOD = ['#c9884a', '#8a4d1d', '#4a240a'];

/** beveled plate: gradient body + top gloss + bottom shade + inner rim light */
function plate(c: C, x: number, y: number, w: number, h: number, r: number, cols: string[], o: { gloss?: number; shade?: number; stroke?: string; edge?: boolean } = {}) {
  const { gloss = 0.17, shade = 0.26, stroke = 'rgba(0,0,0,.62)', edge = true } = o;
  rr(c, x, y, w, h, r);
  c.fillStyle = vg(c, y, y + h, cols);
  c.fill();
  c.strokeStyle = stroke;
  c.lineWidth = 1;
  c.stroke();
  c.save();
  rr(c, x, y, w, h, r);
  c.clip();
  c.fillStyle = `rgba(255,255,255,${gloss})`;
  c.fillRect(x, y, w, Math.max(1.4, h * 0.13));
  c.fillStyle = `rgba(255,255,255,${gloss * 0.35})`;
  c.fillRect(x, y + h * 0.13, w, Math.max(1, h * 0.07));
  c.fillStyle = `rgba(0,0,0,${shade})`;
  c.fillRect(x, y + h * 0.82, w, h * 0.18);
  if (edge) {
    c.strokeStyle = 'rgba(255,255,255,.13)';
    c.lineWidth = 1;
    c.beginPath(); c.moveTo(x + r, y + 1.2); c.lineTo(x + w - r, y + 1.2); c.stroke();
  }
  c.restore();
}
/** horizontal cylinder (barrels, tubes) with specular streak */
function tube(c: C, x0: number, x1: number, y: number, r: number, cols: string[]) {
  const g = c.createLinearGradient(0, y - r, 0, y + r);
  cols.forEach((col, i) => g.addColorStop(i / (cols.length - 1), col));
  rr(c, x0, y - r, x1 - x0, r * 2, Math.min(2.4, r));
  c.fillStyle = g; c.fill();
  c.strokeStyle = 'rgba(0,0,0,.55)'; c.lineWidth = 1; c.stroke();
  c.fillStyle = 'rgba(255,255,255,.38)';
  c.fillRect(x0 + 1, y - r * 0.66, x1 - x0 - 2, Math.max(1, r * 0.22));
  c.fillStyle = 'rgba(0,0,0,.26)';
  c.fillRect(x0 + 1, y + r * 0.42, x1 - x0 - 2, Math.max(1, r * 0.32));
}
function screw(c: C, x: number, y: number, r = 2.2, slot = 0.6) {
  const g = c.createRadialGradient(x - r * 0.4, y - r * 0.4, 0, x, y, r * 1.15);
  g.addColorStop(0, '#e8e8e8'); g.addColorStop(0.6, '#8c8c8c'); g.addColorStop(1, '#2a2a2a');
  c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill();
  c.strokeStyle = 'rgba(0,0,0,.5)'; c.lineWidth = 0.8; c.stroke();
  c.strokeStyle = 'rgba(0,0,0,.65)'; c.lineWidth = 1;
  c.beginPath(); c.moveTo(x - r * slot, y); c.lineTo(x + r * slot, y); c.stroke();
}
function stipple(c: C, x: number, y: number, w: number, h: number, n: number, seed = 7, alpha = 0.3) {
  const r = prand(seed);
  c.save(); c.beginPath(); c.rect(x, y, w, h); c.clip();
  for (let i = 0; i < n; i++) {
    c.fillStyle = `rgba(0,0,0,${alpha})`;
    c.fillRect(x + r() * w, y + r() * h, 1.6, 1.6);
    c.fillStyle = `rgba(255,255,255,${alpha * 0.55})`;
    c.fillRect(x + r() * w, y + r() * h, 1.1, 1.1);
  }
  c.restore();
}
function knurl(c: C, x: number, y: number, w: number, h: number, step = 3, alpha = 0.32) {
  c.save(); c.beginPath(); c.rect(x, y, w, h); c.clip();
  for (let i = -h; i < w; i += step) {
    c.strokeStyle = `rgba(0,0,0,${alpha})`;
    c.lineWidth = 1;
    c.beginPath(); c.moveTo(x + i, y); c.lineTo(x + i + h, y + h); c.stroke();
    c.strokeStyle = `rgba(255,255,255,${alpha * 0.6})`;
    c.beginPath(); c.moveTo(x + i + 1, y); c.lineTo(x + i + 1 + h, y + h); c.stroke();
  }
  c.restore();
}
function glowDot(c: C, x: number, y: number, r: number, color: string, a = 1, blur = 12) {
  c.save();
  c.globalCompositeOperation = 'lighter';
  c.shadowColor = color; c.shadowBlur = blur;
  c.fillStyle = color; c.globalAlpha = a;
  c.beginPath(); c.arc(x, y, r, 0, 7); c.fill();
  c.restore();
}
function core(c: C, x: number, y: number, r: number, color: string, inner = '#ffffff', a = 1) {
  c.save();
  c.globalCompositeOperation = 'lighter';
  const g = c.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, inner);
  g.addColorStop(0.32, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  c.globalAlpha = a;
  c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill();
  c.restore();
}
function poly(c: C, pts: number[], fill: string | CanvasGradient | string[], stroke: string | null = 'rgba(0,0,0,.55)', lw = 1) {
  c.beginPath();
  c.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]);
  c.closePath();
  let f: string | CanvasGradient = fill as string;
  if (Array.isArray(fill)) {
    let y0 = Infinity, y1 = -Infinity;
    for (let i = 1; i < pts.length; i += 2) { y0 = Math.min(y0, pts[i]); y1 = Math.max(y1, pts[i]); }
    f = vg(c, y0, y1, fill);
  }
  c.fillStyle = f; c.fill();
  if (stroke) { c.strokeStyle = stroke; c.lineWidth = lw; c.stroke(); }
}
function woodGrain(c: C, x: number, y: number, w: number, h: number, n = 6, seed = 3) {
  const r = prand(seed);
  c.save(); c.beginPath(); c.rect(x, y, w, h); c.clip();
  for (let i = 0; i < n; i++) {
    const yy = y + (i + 0.5) * (h / n);
    c.strokeStyle = `rgba(255,220,170,${0.12 + r() * 0.12})`;
    c.lineWidth = 0.9 + r() * 1.1;
    c.beginPath(); c.moveTo(x, yy);
    for (let k = 0; k <= w; k += 8) c.lineTo(x + k, yy + Math.sin(k * 0.12 + i * 1.7) * (1.2 + r() * 1.4));
    c.stroke();
    c.strokeStyle = 'rgba(70,32,8,.18)';
    c.beginPath(); c.moveTo(x, yy + 1.6);
    for (let k = 0; k <= w; k += 8) c.lineTo(x + k, yy + 1.6 + Math.sin(k * 0.12 + i * 1.7) * 1.6);
    c.stroke();
  }
  c.restore();
}
function engrave(c: C, x: number, y: number, w: number, h: number) {
  c.fillStyle = 'rgba(0,0,0,.42)';
  c.fillRect(x, y, w, h);
  c.fillStyle = 'rgba(255,255,255,.16)';
  c.fillRect(x, y, w, 1);
}
function gripLines(c: C, x: number, y: number, w: number, h: number, step = 4) {
  for (let i = y; i < y + h; i += step) {
    c.fillStyle = 'rgba(255,255,255,.09)';
    c.fillRect(x, i, w, 1.2);
    c.fillStyle = 'rgba(0,0,0,.3)';
    c.fillRect(x, i + 1.2, w, 1);
  }
}
function railTeeth(c: C, x: number, y: number, w: number, step = 5) {
  for (let i = 0; i < w; i += step) {
    c.fillStyle = '#16181b';
    c.fillRect(x + i, y, step * 0.55, 3.4);
    c.fillStyle = 'rgba(255,255,255,.12)';
    c.fillRect(x + i, y, step * 0.55, 1);
  }
}
function boltsRow(c: C, x0: number, x1: number, y: number, r = 1.6) {
  for (let x = x0; x <= x1; x += 7) screw(c, x, y, r);
}
function coils(c: C, x0: number, x1: number, y: number, color: string, t: number, amp = 6) {
  c.save();
  c.globalCompositeOperation = 'lighter';
  c.shadowColor = color; c.shadowBlur = 12;
  c.strokeStyle = color; c.lineWidth = 2;
  for (let x = x0; x < x1; x += 7) {
    const a = 0.5 + 0.5 * Math.sin(t * 12 - x * 0.2);
    c.globalAlpha = 0.4 + a * 0.6;
    c.beginPath(); c.moveTo(x, y - amp); c.lineTo(x + 3, y + amp); c.stroke();
  }
  c.restore();
}

/* ===================== ARROW ===================== */
export function drawArrowShape(c: C, x: number, y: number, len: number, glowy = 0, t = 0) {
  const sg = c.createLinearGradient(0, y - 2, 0, y + 2);
  sg.addColorStop(0, '#f0cf9a'); sg.addColorStop(0.5, '#b98a4c'); sg.addColorStop(1, '#6d4720');
  c.fillStyle = sg;
  c.fillRect(x, y - 1.6, len - 14, 3.2);
  c.fillStyle = 'rgba(255,255,255,.25)';
  c.fillRect(x, y - 1.6, len - 14, 1);
  if (glowy) { c.save(); c.shadowColor = '#ffd27a'; c.shadowBlur = 14 + Math.sin(t * 20) * 4; }
  poly(c, [x + len - 17, y - 6.4, x + len + 4, y, x + len - 17, y + 6.4, x + len - 12, y],
    vg(c, y - 6.4, y + 6.4, ['#ffffff', '#98a2ac', '#33383e', '#15181b']));
  if (glowy) c.restore();
  for (const s of [-1, 1]) {
    poly(c, [x + 2, y, x + 27, y, x + 18, y + s * 8.4, x - 4, y + s * 9.4],
      s < 0 ? vg(c, y - 8, y + 8, ['#e2374c', '#8f1424']) : vg(c, y - 8, y + 8, ['#ffffff', '#c9ccd1']), 'rgba(0,0,0,.35)');
    c.fillStyle = 'rgba(0,0,0,.22)';
    c.fillRect(x + 7, y + s * 2, 14, 1.1);
  }
  c.fillStyle = '#1b1b1b'; c.fillRect(x - 3.5, y - 2.2, 4.4, 4.4);
  screw(c, x + 4, y, 1.4);
}

const smooth = (a: number, b: number, x: number) => {
  const u = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return u * u * (3 - 2 * u);
};

/* ===================== 0 · BOW ===================== */
function drawBow(c: C, t: number, charge: number, ready: boolean, cycle = 1) {
  const cl = Math.max(0, Math.min(1, cycle));

  // Reload & deep draw tension:
  // 1. Release & vibration snap (cl: 0 -> 0.30): string vibrates at rest, arrow in flight
  // 2. Retrieve & nock arrow (cl: 0.30 -> 0.55): arrow slides smoothly into position
  // 3. Deep draw tension (cl: 0.55 -> 0.95): string & arrow pull back much further deeply!
  // At full draw / ready (cl >= 0.95), bow is drawn back deep (-88px), limbs flexing back!
  const reloadDraw = smooth(0.55, 0.95, cl);
  const totalDraw = Math.max(reloadDraw, Math.min(1, charge));
  const chPow = Math.pow(totalDraw, 0.72);

  // Tremble under deep tension
  const tremble = totalDraw > 0.85 ? Math.sin(t * 50) * (totalDraw - 0.85) * 3.5 : 0;
  // String vibration on release
  const vib = totalDraw < 0.15 && cl < 0.35 ? Math.exp(-cl * 14) * Math.sin(cl * 110) * 10 * (1 - cl / 0.35) : 0;

  // Deep draw: rest at -18, deeply drawn back to -88 (and up to -98 under charge)
  const pull = -18 - chPow * 70 + vib + tremble;
  const limbFlex = chPow * 16;
  const limbTipX = -6 - chPow * 22;
  const tipY = 98 - limbFlex * 0.22;

  c.save();
  c.lineCap = 'round';
  const lg = c.createLinearGradient(-14, -100, 26, 100);
  lg.addColorStop(0, '#2b1608'); lg.addColorStop(0.32, '#b0742f'); lg.addColorStop(0.62, '#6b3d12'); lg.addColorStop(1, '#2b1608');
  for (const s of [-1, 1]) {
    c.beginPath();
    c.moveTo(18, 0);
    c.bezierCurveTo(24 - limbFlex * 0.25, s * 40, 10 - limbFlex, s * 80, limbTipX, s * tipY);
    c.strokeStyle = '#140a03'; c.lineWidth = 11.5; c.stroke();
    c.strokeStyle = lg; c.lineWidth = 7.8; c.stroke();
    c.strokeStyle = 'rgba(255,222,158,.75)'; c.lineWidth = 1.1;
    c.beginPath(); c.moveTo(19, s * 6); c.bezierCurveTo(22 - limbFlex * 0.25, s * 40, 11 - limbFlex, s * 78, limbTipX + 1, s * (tipY - 4)); c.stroke();
    for (const k of [0.3, 0.56, 0.82]) {
      const bx = 18 + (limbTipX - 18) * k, by = s * tipY * k * 1.03;
      c.strokeStyle = 'rgba(216,178,116,.65)'; c.lineWidth = 3.2;
      c.beginPath(); c.moveTo(bx - 3, by - 3.4); c.lineTo(bx + 3, by + 3.4); c.stroke();
      c.strokeStyle = 'rgba(30,16,6,.5)'; c.lineWidth = 1;
      c.beginPath(); c.moveTo(bx - 3, by - 3.4); c.lineTo(bx + 3, by + 3.4); c.stroke();
    }
    core(c, limbTipX, s * tipY, 5 + chPow * 2.5, 'rgba(255,214,140,.9)', '#fff4d8', 0.85 + chPow * 0.15);
  }
  // Bow string with deep draw angle
  c.strokeStyle = 'rgba(0,0,0,.3)'; c.lineWidth = 3.2;
  c.beginPath(); c.moveTo(limbTipX, -tipY); c.lineTo(pull, 0); c.lineTo(limbTipX, tipY); c.stroke();
  c.strokeStyle = 'rgba(248,244,232,.98)'; c.lineWidth = 1.6;
  c.beginPath(); c.moveTo(limbTipX, -tipY); c.lineTo(pull, 0); c.lineTo(limbTipX, tipY); c.stroke();

  // Serving around nocking point
  c.strokeStyle = '#b91c1c'; c.lineWidth = 3;
  c.beginPath(); c.moveTo(pull, -5); c.lineTo(pull, 5); c.stroke();

  // riser / grip
  plate(c, 6, -18, 19, 36, 6, ['#5c3517', '#241206', '#3d2210']);
  c.save(); c.beginPath(); c.rect(6, -18, 19, 36); c.clip();
  for (let i = -18; i < 18; i += 3.2) {
    c.strokeStyle = 'rgba(20,8,2,.5)'; c.lineWidth = 1.1;
    c.beginPath(); c.moveTo(6, i); c.lineTo(25, i + 3.6); c.stroke();
    c.strokeStyle = 'rgba(255,214,150,.16)';
    c.beginPath(); c.moveTo(6, i + 1.4); c.lineTo(25, i + 5); c.stroke();
  }
  c.restore();
  screw(c, 12, -12, 1.7); screw(c, 12, 12, 1.7);
  core(c, 15, 0, 7, 'rgba(255,206,120,.45)', 'rgba(255,255,255,.9)', 0.6);

  // Arrow rest / shelf
  c.fillStyle = '#d6b98a';
  c.fillRect(17, -2.5, 9, 3.2);

  // Reload animation like Slide 6:
  // Arrow is gone while cl <= 0.32 after release.
  // At cl > 0.32, arrow smoothly slides in from behind and draws back deep with string!
  const showArrow = cl > 0.32 || totalDraw > 0.05;
  const slide = (1 - smooth(0.32, 0.55, cl)) * 44;
  const aAlpha = smooth(0.32, 0.44, cl);
  if (ready && showArrow) {
    c.save();
    c.globalAlpha = aAlpha;
    drawArrowShape(c, pull + slide, 0, 140, totalDraw > 0.85 ? 1 : 0, t);
    c.restore();
  }
  c.restore();
}

/* ===================== 1 · AK-47 ===================== */
function drawAK(c: C, t: number, electro?: string) {
  // laminated stock
  poly(c, [-100, -1, -22, -7, -22, 11, -46, 14, -100, 28], vg(c, -7, 28, WOOD));
  woodGrain(c, -100, -6, 80, 36, 6, 11);
  poly(c, [-100, 3, -74, 3, -78, 13, -100, 13], 'rgba(255,225,180,.14)', 'rgba(0,0,0,.25)');
  plate(c, -102, 4, 13, 9, 2, ['#5c5c5c', '#2a2a2a', '#464646']);
  // receiver
  plate(c, -24, -12, 88, 22, 2, METAL);
  engrave(c, -18, -9, 22, 2);
  c.fillStyle = 'rgba(0,0,0,.45)'; c.fillRect(-16, -2, 74, 1.6);
  c.fillStyle = '#111315'; c.fillRect(-21, -16, 22, 5);
  poly(c, [-3, -22, 8, -22, 10, -15, -5, -15], ['#3c4148', '#121417']);
  screw(c, -18, -2, 1.9); screw(c, 14, -4, 1.9); screw(c, 52, -2, 1.9);
  // safety selector
  c.strokeStyle = '#d6b24a'; c.lineWidth = 2.4;
  c.beginPath(); c.moveTo(26, -7); c.lineTo(54, -2); c.stroke(); c.lineWidth = 1;
  screw(c, 26, -7, 2.4);
  engrave(c, 30, -12, 22, 2);
  // grip
  poly(c, [-11, 8, 5, 8, -1, 42, -19, 40], vg(c, 8, 42, ['#7c451c', '#3c1e08', '#5c2f12']));
  stipple(c, -19, 10, 22, 30, 130, 21, 0.26);
  // trigger
  c.strokeStyle = '#171717'; c.lineWidth = 2.4;
  c.beginPath(); c.moveTo(9, 9); c.quadraticCurveTo(19, 21, 8, 23); c.lineTo(2, 23); c.stroke(); c.lineWidth = 1;
  c.fillStyle = '#0d0d0d'; c.fillRect(11, 11, 2.6, 8.5);
  // mag
  c.beginPath();
  c.moveTo(24, 9); c.lineTo(42, 9);
  c.bezierCurveTo(51, 27, 57, 43, 67, 58);
  c.lineTo(48, 64);
  c.bezierCurveTo(38, 46, 30, 27, 24, 9);
  c.closePath();
  c.fillStyle = electro ? vgx(c, 24, 60, ['#2c4250', '#132430']) : vg(c, 9, 64, ['#c4762a', '#6d3410', '#3a1c06']);
  c.fill(); c.strokeStyle = 'rgba(0,0,0,.6)'; c.stroke();
  if (!electro) {
    for (let i = 1; i < 5; i++) {
      c.strokeStyle = 'rgba(255,208,150,.22)'; c.lineWidth = 1.4;
      c.beginPath(); c.moveTo(25 + i * 2.6, 13 + i * 9); c.lineTo(51 + i * 2.6, 13 + i * 9); c.stroke();
    }
  }
  // handguard (two-piece)
  plate(c, 62, -10, 23, 20, 5, electro ? DARK : WOOD);
  plate(c, 87, -10, 25, 20, 5, electro ? DARK : WOOD);
  woodGrain(c, 62, -10, 50, 20, 3, 31);
  for (let i = 0; i < 3; i++) engrave(c, 66 + i * 15, -6, 3, 12);
  // gas tube + block + barrel
  tube(c, 60, 118, -15, 3.2, METAL);
  tube(c, 108, 170, 0, 3.6, METAL);
  poly(c, [141, -3.5, 145, -16, 150, -16, 153, -3.5], ['#33383e', '#101214']);
  screw(c, 147, -9, 1.6);
  // slant muzzle brake
  poly(c, [168, -6, 183, -8.5, 183, 6.5, 168, 5.5], vg(c, -8.5, 6.5, ['#6a7078', '#22262a', '#3c4148']));
  engrave(c, 172, -4, 8, 2);
  if (electro) {
    coils(c, 64, 110, 0, electro, t, 7);
    c.save(); c.shadowColor = electro; c.shadowBlur = 12; c.strokeStyle = electro; c.lineWidth = 1.4;
    c.beginPath(); c.moveTo(-92, 9); c.lineTo(-26, 3); c.stroke();
    c.beginPath(); c.moveTo(28, 16); c.bezierCurveTo(38, 30, 44, 45, 55, 59); c.stroke();
    c.restore();
    core(c, 24, -5, 6, electro, '#ffffff', 0.8 + 0.2 * Math.sin(t * 11));
  }
}

/* ===================== 2/3 · M4 CARBINE ===================== */
function drawM4(c: C, t: number, electro?: string) {
  // buffer tube + crane stock
  tube(c, -66, -20, -1, 5, METAL);
  poly(c, [-98, -13, -68, -13, -60, -4, -60, 19, -68, 26, -98, 26], vg(c, -13, 26, DARK));
  poly(c, [-95, -8, -74, -8, -72, -2, -95, -2], 'rgba(255,255,255,.08)', null);
  plate(c, -96, -6, 5, 22, 2, ['#2c3036', '#101214']);
  // lower + upper
  plate(c, -25, -3, 66, 16, 3, DARK);
  plate(c, -27, -14, 88, 13, 2, METAL);
  railTeeth(c, -23, -17, 80, 5);
  engrave(c, -18, -6, 20, 2);
  // grip
  poly(c, [-9, 10, 7, 10, 3, 41, -15, 39], vg(c, 10, 41, ['#3c4148', '#141619', '#26292e']));
  stipple(c, -15, 12, 22, 28, 140, 5, 0.32);
  // trigger
  c.strokeStyle = '#0e0e0e'; c.lineWidth = 2.2;
  c.beginPath(); c.moveTo(13, 7); c.lineTo(15, 17); c.stroke(); c.lineWidth = 1;
  // mag
  poly(c, [15, 9, 33, 9, 37, 53, 20, 56], vg(c, 9, 56, ['#7c838c', '#2c3036', '#454a51']));
  for (let i = 0; i < 3; i++) {
    c.strokeStyle = 'rgba(255,255,255,.12)'; c.lineWidth = 1.2;
    c.beginPath(); c.moveTo(17 + i * 4.5, 14); c.lineTo(21 + i * 4.5, 51); c.stroke();
  }
  screw(c, 4, -1, 1.8); screw(c, 30, 0, 1.8);
  // optic
  plate(c, -4, -33, 40, 16, 7, ['#4c525a', '#1b1e22', '#2c3036']);
  plate(c, 4, -36, 9, 5, 1.5, ['#2c3036', '#111']);
  plate(c, 21, -36, 9, 5, 1.5, ['#2c3036', '#111']);
  engrave(c, 2, -28, 34, 2);
  core(c, 33, -25, 8, 'rgba(255,70,90,.9)', 'rgba(255,255,255,.95)', 0.85);
  plate(c, -31, -19, 11, 7, 1.5, ['#2c3036', '#121417']);
  // handguard
  plate(c, 58, -13, 62, 24, 4, ['#4a5058', '#1b1e22', '#2c3036']);
  for (let x = 62; x < 116; x += 8) engrave(c, x, -8, 5, 15);
  railTeeth(c, 60, -16, 58, 6);
  railTeeth(c, 60, 9, 58, 6);
  for (let i = 0; i < 4; i++) screw(c, 64 + i * 15, 2, 1.7);
  // barrel + gas block + flash hider
  tube(c, 118, 160, 0, 3.2, METAL);
  poly(c, [143, -3.5, 146, -17, 152, -17, 155, -3.5], ['#33383e', '#101214']);
  plate(c, 158, -5, 16, 10, 1.5, ['#5c626a', '#22262a']);
  c.fillStyle = '#000';
  for (let i = 0; i < 3; i++) c.fillRect(161 + i * 5, -3.4, 2.2, 6.8);
  if (electro) {
    coils(c, 62, 116, -1, electro, t, 7);
    c.save(); c.shadowColor = electro; c.shadowBlur = 12; c.strokeStyle = electro; c.lineWidth = 1.5;
    c.beginPath(); c.moveTo(-42, 8); c.lineTo(-20, 2); c.stroke();
    for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(17 + i, 18 + i * 11); c.lineTo(33 + i, 18 + i * 11); c.stroke(); }
    c.restore();
    core(c, -36, 6, 6, electro, '#ffffff', 0.75 + 0.25 * Math.sin(t * 10));
  }
}

/* ===================== 4/5 · MP5 ===================== */
function drawMP5(c: C, t: number, electro?: string) {
  // retractable stock
  poly(c, [-88, -8, -42, -8, -32, -1, -32, 13, -42, 20, -88, 22], vg(c, -8, 22, DARK));
  c.fillStyle = '#0a0b0c';
  c.beginPath(); c.ellipse(-66, 7, 14, 6.5, 0, 0, 7); c.fill();
  c.strokeStyle = 'rgba(255,255,255,.14)'; c.lineWidth = 1.2;
  c.beginPath(); c.ellipse(-66, 7, 14, 6.5, 0, 0, 7); c.stroke();
  tube(c, -62, -30, -9, 3.2, METAL);
  screw(c, -84, -2, 1.8); screw(c, -84, 16, 1.8);
  // receiver
  plate(c, -35, -12, 88, 21, 3, METAL);
  engrave(c, -28, -8, 18, 2.4);
  c.fillStyle = 'rgba(0,0,0,.4)'; c.fillRect(-30, 2, 78, 1.4);
  // cocking tube + hooded front sight
  tube(c, 42, 114, -15, 3.8, METAL);
  poly(c, [92, -23, 112, -23, 118, -5, 111, -5, 106, -17, 92, -17], ['#33383e', '#141619']);
  c.fillStyle = '#0b0c0e'; c.beginPath(); c.arc(109, -10, 2.1, 0, 7); c.fill();
  plate(c, -27, -21, 13, 11, 2, ['#3c4148', '#111315']);
  c.fillStyle = '#0b0c0e'; c.beginPath(); c.arc(-20, -16, 3.2, 0, 7); c.fill();
  // grip
  poly(c, [-17, 6, -2, 6, -7, 37, -23, 35], vg(c, 6, 37, ['#3c4148', '#141619', '#26292e']));
  stipple(c, -23, 8, 21, 28, 120, 17, 0.3);
  c.strokeStyle = '#0e0e0e'; c.lineWidth = 2.2;
  c.beginPath(); c.moveTo(7, 8); c.lineTo(9, 18); c.stroke(); c.lineWidth = 1;
  // SEF trigger housing
  plate(c, -22, 3, 34, 12, 4, ['#2c3036', '#101214']);
  engrave(c, -14, 7, 5, 3); engrave(c, -5, 7, 5, 3); engrave(c, 4, 7, 5, 3);
  // curved mag
  c.beginPath();
  c.moveTo(13, 8); c.lineTo(28, 8);
  c.bezierCurveTo(33, 27, 39, 41, 47, 53);
  c.lineTo(31, 59);
  c.bezierCurveTo(23, 43, 17, 27, 13, 8);
  c.closePath();
  c.fillStyle = vg(c, 8, 59, ['#7c838c', '#2c3036', '#454a51']);
  c.fill(); c.strokeStyle = 'rgba(0,0,0,.6)'; c.stroke();
  for (let i = 1; i < 4; i++) {
    c.strokeStyle = 'rgba(255,255,255,.13)';
    c.beginPath(); c.moveTo(15 + i * 3.4, 15 + i * 11); c.lineTo(33 + i * 3.4, 15 + i * 11); c.stroke();
  }
  // tropical handguard
  plate(c, 52, -9, 58, 20, 9, ['#42474e', '#171a1d', '#2b2f34']);
  for (let x = 58; x < 106; x += 9) engrave(c, x, -4, 6, 11);
  // barrel + tri-lug
  tube(c, 108, 132, 0, 3.1, METAL);
  plate(c, 128, -5, 14, 10, 2, ['#4c525a', '#1c1f23']);
  if (electro) {
    coils(c, 54, 108, 1, electro, t, 6);
    c.save(); c.shadowColor = electro; c.shadowBlur = 14; c.strokeStyle = electro; c.lineWidth = 1.8;
    c.beginPath(); c.moveTo(-31, -3); c.lineTo(48, -3); c.stroke();
    c.beginPath(); c.moveTo(17, 15); c.bezierCurveTo(23, 33, 31, 45, 39, 55); c.stroke();
    c.restore();
  }
}

/* ===================== 6 · SNIPER BEAM ===================== */
function drawSniper(c: C, t: number) {
  // chassis stock
  poly(c, [-108, -4, -46, -9, -32, 3, -48, 17, -74, 15, -108, 30], vg(c, -9, 30, ['#39424e', '#171d25', '#080b0e']));
  plate(c, -100, 2, 24, 11, 3, ['#2c343e', '#12171d'], { gloss: 0.1 });
  engrave(c, -96, 5, 16, 2);
  // receiver
  plate(c, -35, -12, 96, 21, 3, ['#454f5c', '#1b222a', '#0b0f13']);
  plate(c, -31, -15, 27, 5, 1.5, ['#2c343e', '#10161b']);
  engrave(c, -22, -6, 26, 2);
  // grip + trigger + mag
  poly(c, [-17, 6, -2, 6, -10, 37, -25, 35], vg(c, 6, 37, ['#333b45', '#12171d', '#22282f']));
  stipple(c, -25, 8, 23, 28, 130, 41, 0.3);
  c.strokeStyle = '#0c1013'; c.lineWidth = 2.2;
  c.beginPath(); c.moveTo(11, 6); c.lineTo(13, 16); c.stroke(); c.lineWidth = 1;
  plate(c, 13, 5, 21, 26, 2, ['#2c343e', '#10161b']);
  engrave(c, 16, 9, 15, 2);
  // scope
  plate(c, -18, -35, 82, 16, 8, ['#525c69', '#1b222a', '#0a0d10']);
  plate(c, -27, -39, 15, 25, 5, ['#3c4550', '#111619']);
  plate(c, 57, -40, 15, 27, 5, ['#3c4550', '#111619']);
  plate(c, 12, -42, 11, 8, 2, ['#2c343e', '#10161b']);
  plate(c, 30, -42, 11, 8, 2, ['#2c343e', '#10161b']);
  knurl(c, -26, -32, 12, 12, 3, 0.3);
  for (let i = 0; i < 2; i++) { screw(c, -8 + i * 46, -30, 2.4); }
  core(c, 72, -27, 11, 'rgba(255,42,109,.95)', '#ffffff', 0.9);
  // barrel shroud with fluting
  plate(c, 58, -8, 140, 16, 3, ['#454f5c', '#171d25', '#0a0d10']);
  for (let x = 66; x < 190; x += 12) engrave(c, x, -10, 3.4, 20);
  coils(c, 72, 186, 0, '#ff2a6d', t, 5);
  // muzzle assembly
  plate(c, 194, -11, 17, 22, 3, ['#3c4550', '#111619']);
  knurl(c, 196, -8, 13, 16, 3, 0.3);
  core(c, 208, 0, 7, 'rgba(255,42,109,.95)', '#ffe2ec', 1);
  // bipod
  c.strokeStyle = '#242a31'; c.lineWidth = 4; c.lineCap = 'round';
  c.beginPath(); c.moveTo(86, 9); c.lineTo(73, 33); c.moveTo(86, 9); c.lineTo(100, 33); c.stroke();
  c.lineWidth = 1;
  screw(c, 86, 9, 2.4);
}

/* ===================== 7 · DRAGON BREATH ===================== */
function drawDragon(c: C, t: number) {
  poly(c, [-100, -6, -26, -9, -26, 12, -48, 16, -100, 30], vg(c, -9, 30, ['#7c1616', '#320606', '#150202']));
  c.strokeStyle = '#e8b34a'; c.lineWidth = 1.4;
  c.beginPath(); c.moveTo(-92, 13); c.bezierCurveTo(-74, -2, -62, 21, -42, 7); c.stroke();
  c.beginPath(); c.moveTo(-87, -2); c.bezierCurveTo(-71, 13, -58, -6, -41, 3); c.stroke();
  plate(c, -30, -13, 66, 25, 3, ['#e6b54e', '#8e5c15', '#3f2505']);
  boltsRow(c, -24, 28, -6, 1.7);
  engrave(c, -22, 4, 44, 2.4);
  poly(c, [-13, 8, 3, 8, -4, 40, -21, 38], vg(c, 8, 40, ['#7c1616', '#260404']));
  c.strokeStyle = '#e8b34a'; c.lineWidth = 1.3;
  c.beginPath(); c.moveTo(-17, 13); c.lineTo(-9, 36); c.stroke();
  plate(c, 32, -9, 104, 18, 3, ['#4a1212', '#1c0505', '#0c0202']);
  for (let x = 38; x < 132; x += 11) engrave(c, x, -6, 3, 12);
  // coiling dragon body
  const pts: [number, number][] = [];
  for (let x = -24; x <= 136; x += 2) pts.push([x, Math.sin(x * 0.072 + t * 3) * 12]);
  c.save();
  c.lineCap = 'round';
  c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
  c.strokeStyle = '#280900'; c.lineWidth = 12.5; c.stroke();
  c.strokeStyle = vg(c, -12, 12, ['#ffdc7c', '#d1611a', '#6d1503']); c.lineWidth = 8.8; c.stroke();
  c.strokeStyle = 'rgba(255,236,190,.55)'; c.lineWidth = 1.6;
  c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x, y - 3) : c.moveTo(x, y - 3))); c.stroke();
  c.fillStyle = 'rgba(72,8,0,.55)';
  for (let i = 0; i < pts.length; i += 3) { const [x, y] = pts[i]; c.beginPath(); c.arc(x, y - 1, 2.5, 0, Math.PI); c.fill(); }
  c.fillStyle = '#ff9a2a';
  for (let i = 4; i < pts.length - 4; i += 6) {
    const [x, y] = pts[i];
    c.beginPath(); c.moveTo(x - 3, y - 3); c.lineTo(x, y - 10.5); c.lineTo(x + 3, y - 3); c.fill();
  }
  c.restore();
  // dragon head
  c.save();
  c.translate(154, 0);
  const jaw = 0.22 + Math.sin(t * 4) * 0.06;
  c.fillStyle = vg(c, -34, 0, ['#fff3c9', '#c19239', '#6c4a12']);
  c.beginPath(); c.moveTo(-15, -10); c.quadraticCurveTo(-42, -38, -55, -33); c.quadraticCurveTo(-33, -22, -8, -6); c.fill();
  c.beginPath(); c.moveTo(-10, 10); c.quadraticCurveTo(-38, 36, -53, 33); c.quadraticCurveTo(-31, 20, -6, 6); c.fill();
  c.fillStyle = '#c0391a';
  for (let i = 0; i < 4; i++) {
    c.beginPath(); c.moveTo(-21 + i * 2, -6); c.lineTo(-38 - i * 5, -21 + i * 10); c.lineTo(-16 + i * 2, 4); c.fill();
    c.strokeStyle = 'rgba(255,190,110,.6)'; c.lineWidth = 1;
    c.beginPath(); c.moveTo(-21 + i * 2, -6); c.lineTo(-38 - i * 5, -21 + i * 10); c.stroke();
  }
  c.save(); c.rotate(-jaw);
  poly(c, [-23, -14, 6, -16, 29, -10, 36, -3, 31, 0, -23, 2], vg(c, -16, 2, ['#ffdc7c', '#d8621c', '#671402']), '#380a00');
  c.fillStyle = '#fffdf4';
  for (let x = 2; x < 31; x += 5) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x + 1.6, 5.4); c.lineTo(x + 3.2, 0); c.fill(); }
  c.fillStyle = '#2c0808'; c.beginPath(); c.ellipse(29, -7, 2.3, 1.4, 0, 0, 7); c.fill();
  core(c, -5, -8, 7, 'rgba(255,238,0,.95)', '#fffbc4', 1);
  c.fillStyle = '#080404'; c.fillRect(-5.4, -10, 1.4, 4.2);
  c.strokeStyle = '#541000'; c.lineWidth = 2.3;
  c.beginPath(); c.moveTo(-13, -13); c.lineTo(8, -13); c.stroke(); c.lineWidth = 1;
  c.restore();
  c.save(); c.rotate(jaw);
  poly(c, [-21, -1, 25, 1, 29, 4, 23, 10.5, -21, 11.5], vg(c, -1, 11.5, ['#d8621c', '#671402']), '#380a00');
  c.fillStyle = '#fffdf4';
  for (let x = 4; x < 25; x += 5) { c.beginPath(); c.moveTo(x, 1); c.lineTo(x + 1.6, -3.2); c.lineTo(x + 3.2, 1); c.fill(); }
  c.restore();
  core(c, 14, 0, 22, 'rgba(255,140,20,.85)', 'rgba(255,255,210,.95)', 0.9 + 0.1 * Math.sin(t * 15));
  c.restore();
}

/* ===================== 8 · BERETTA 92FS ===================== */
function drawBeretta(c: C) {
  // slide (open top)
  poly(c, [-26, -12, 38, -12, 38, -4.5, 30, -4.5, 30, -9, -26, -9], ['#33383e', '#101214']);
  plate(c, -25, -9, 101, 13, 2, ['#42474e', '#191c1f', '#0a0b0c']);
  tube(c, 28, 76, -2.5, 3.6, ['#a8aeb5', '#4c5158', '#23262a']);
  c.fillStyle = '#0b0c0e'; c.beginPath(); c.arc(73, -2.5, 2.5, 0, 7); c.fill();
  for (let x = -21; x < -2; x += 3) engrave(c, x, -8, 1.4, 11);
  engrave(c, 6, -8, 16, 2);
  // hammer + beavertail
  poly(c, [-32, -11, -23, -13, -21, -4, -30, -2], ['#33383e', '#121416']);
  poly(c, [-36, 0, -18, -2.5, -13, 6, -33, 9], ['#33383e', '#121416']);
  screw(c, -24, -6, 1.8);
  // frame
  plate(c, -19, 3, 88, 10, 2, ['#42474e', '#17191c', '#2c3035']);
  // grip + wood panel
  poly(c, [-23, 7, 5, 7, 1, 49, -27, 47], vg(c, 7, 49, ['#3c4148', '#131518', '#262a2e']));
  poly(c, [-20, 11, 1, 11, -2.5, 43, -23, 41], vg(c, 11, 43, ['#8a4d1d', '#43220a', '#5c3212']));
  stipple(c, -23, 11, 24, 32, 180, 31, 0.22);
  core(c, -11, 25, 6, 'rgba(255,222,150,.9)', '#ffeec2', 0.9);
  c.fillStyle = 'rgba(0,0,0,.4)'; c.beginPath(); c.arc(-11, 25, 4.6, 0, 7); c.fill();
  // trigger guard
  c.beginPath();
  c.moveTo(11, 8); c.quadraticCurveTo(31, 8, 33, 21); c.quadraticCurveTo(31, 28, 18, 27); c.lineTo(11, 27);
  c.strokeStyle = '#20242a'; c.lineWidth = 2.8; c.stroke(); c.lineWidth = 1;
  c.fillStyle = '#101214'; c.fillRect(15, 10, 2.6, 10);
  // controls
  c.fillStyle = '#d2ac3f'; c.fillRect(-13, 1, 9, 2.4); c.fillRect(25, 0, 8, 2.4);
  screw(c, 30, 1, 1.6);
  plate(c, -27, 47, 27, 4, 1.5, ['#2c3035', '#0d0e10']);
  core(c, -15, -11, 2.6, 'rgba(255,255,255,.9)', '#ffffff', 0.9);
  core(c, 71, -11, 2.6, 'rgba(255,255,255,.9)', '#ffffff', 0.9);
}

/* ===================== 9 · PHASER (TOS) ===================== */
function drawPhaser(c: C, t: number) {
  poly(c, [-33, -2, -8, -2, -17, 52, -41, 50], vg(c, -2, 52, ['#585e66', '#23262a', '#0d0f11']));
  gripLines(c, -36, 4, 22, 42, 5);
  screw(c, -25, 42, 1.8);
  // main body
  poly(c, [-40, -19, 62, -19, 80, -11, 80, 3, -40, 3], vg(c, -19, 3, ['#b6bcc3', '#5c6167', '#26292d', '#3c4148']));
  c.fillStyle = 'rgba(255,255,255,.22)'; c.fillRect(-38, -18, 116, 1.8);
  // type-1 module
  poly(c, [-19, -33, 36, -33, 43, -25, -19, -25], vg(c, -33, -25, ['#6a7078', '#22252a']));
  plate(c, 22, -32, 9, 8, 1.5, ['#e0b45c', '#8a6a14']);
  core(c, -8, -29, 5, 'rgba(255,180,80,.8)', '#fff0c8', 0.8);
  c.strokeStyle = '#c9a227'; c.lineWidth = 1.3;
  c.beginPath(); c.arc(-8, -29, 4, 0, 7); c.stroke();
  // side detail
  for (let x = -32; x < 54; x += 6) engrave(c, x, -14, 1.6, 13);
  engrave(c, -30, -6, 30, 2);
  // emitter shroud
  poly(c, [74, -14, 94, -9, 94, 2, 74, 5], vg(c, -14, 5, ['#e4c17a', '#8a6a14', '#4d3a08']));
  knurl(c, 76, -10, 14, 12, 3, 0.3);
  core(c, 96, -3.5, 13, 'rgba(255,122,26,.95)', '#ffe8c2', 0.85 + 0.15 * Math.sin(t * 10));
  // trigger
  poly(c, [6, 3, 15, 3, 13, 15, 4, 13], ['#202327', '#0b0c0e']);
  c.fillStyle = '#c9a227'; c.fillRect(-35, 3, 24, 2.2);
}

/* ===================== 10 · ENERGY SWORD ===================== */
function drawSword(c: C, t: number, swing: number) {
  c.save();
  c.rotate(-swing);
  plate(c, -48, -10, 54, 20, 7, ['#3c4550', '#12161a', '#05070a']);
  knurl(c, -44, -7, 22, 14, 3.4, 0.35);
  engrave(c, -18, -6, 18, 12);
  for (const s of [-1, 1]) {
    c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(13, s * 19, 27, s * 21); c.lineTo(27, s * 11);
    c.quadraticCurveTo(13, s * 9, 7, 0);
    c.fillStyle = vg(c, 0, s * 21, ['#48525e', '#12161a']); c.fill(); c.strokeStyle = '#000'; c.stroke();
    core(c, 23, s * 15, 6, 'rgba(120,205,255,.9)', '#e2f6ff', 0.9);
    screw(c, 6, s * 5, 1.6);
  }
  c.globalCompositeOperation = 'lighter';
  const flick = Math.sin(t * 30) * 0.9;
  for (const s of [-1, 1]) {
    c.beginPath();
    c.moveTo(21, s * 15);
    c.quadraticCurveTo(85, s * (21 + flick), 153, s * 2);
    c.quadraticCurveTo(85, s * 6, 21, s * 9);
    c.closePath();
    c.shadowColor = '#4fc8ff'; c.shadowBlur = 28;
    c.fillStyle = 'rgba(60,170,255,.5)'; c.fill();
    c.lineWidth = 2; c.strokeStyle = 'rgba(200,240,255,.9)'; c.stroke();
    c.beginPath(); c.moveTo(23, s * 12); c.quadraticCurveTo(85, s * 13, 151, s * 2);
    c.strokeStyle = '#ffffff'; c.lineWidth = 1.7; c.stroke();
    c.shadowBlur = 0;
  }
  c.globalCompositeOperation = 'source-over';
  c.restore();
}

/* ===================== 11 · PLASMACASTER ===================== */
function drawPlasmacaster(c: C, t: number) {
  plate(c, -78, 5, 66, 15, 6, ['#6a5b3e', '#2b2418', '#120e08']);
  boltsRow(c, -70, -22, 12, 1.5);
  const jg = c.createRadialGradient(-12, 11, 0, -12, 12, 12);
  jg.addColorStop(0, '#9a8a62'); jg.addColorStop(1, '#241c10');
  c.fillStyle = jg; c.beginPath(); c.arc(-12, 12, 11, 0, 7); c.fill();
  c.strokeStyle = '#0c0906'; c.stroke();
  screw(c, -12, 12, 3.4);
  c.beginPath();
  c.moveTo(-24, -8); c.quadraticCurveTo(12, -26, 62, -16); c.lineTo(112, -10); c.lineTo(112, 11);
  c.lineTo(62, 16); c.quadraticCurveTo(12, 26, -24, 10); c.closePath();
  c.fillStyle = vg(c, -26, 26, ['#a6946c', '#4a3f2c', '#1d180e', '#33291a']); c.fill();
  c.strokeStyle = '#000'; c.lineWidth = 1.1; c.stroke();
  for (let x = 2; x < 106; x += 11) {
    c.beginPath(); c.moveTo(x, -12); c.lineTo(x + 5, 12);
    c.strokeStyle = 'rgba(0,0,0,.5)'; c.lineWidth = 1.3; c.stroke();
    c.beginPath(); c.moveTo(x + 2, -12); c.lineTo(x + 7, 12);
    c.strokeStyle = 'rgba(255,232,180,.16)'; c.lineWidth = 1; c.stroke();
  }
  const pulse = 0.6 + 0.4 * Math.sin(t * 8);
  c.save();
  c.beginPath(); c.ellipse(44, 0, 21, 7, 0, 0, 7); c.clip();
  core(c, 44, 0, 26, 'rgba(74,168,255,.9)', '#e6f6ff', pulse);
  c.restore();
  c.strokeStyle = 'rgba(150,210,255,.7)'; c.lineWidth = 1.2;
  c.beginPath(); c.ellipse(44, 0, 21, 7, 0, 0, 7); c.stroke();
  plate(c, 108, -13, 20, 26, 7, ['#7a6844', '#211a10', '#3d3220']);
  c.fillStyle = '#080603'; c.beginPath(); c.arc(124, 0, 7, 0, 7); c.fill();
  c.strokeStyle = 'rgba(255,220,160,.3)'; c.lineWidth = 1; c.stroke();
  glowDot(c, 74, -19, 2.8, '#ff2020', 1, 10);
}

/* ===================== 12 · IDENTITY DISC + HAND ===================== */
export function drawDisc(c: C, x: number, y: number, rot: number, alpha: number) {
  c.save();
  c.translate(x, y);
  c.rotate(rot);
  c.globalAlpha = alpha;
  const g = c.createRadialGradient(-6, -8, 2, 0, 0, 28);
  g.addColorStop(0, '#4c525a'); g.addColorStop(0.6, '#20242a'); g.addColorStop(1, '#0b0d10');
  c.fillStyle = g;
  c.beginPath(); c.arc(0, 0, 26, 0, 7); c.fill();
  c.strokeStyle = 'rgba(255,255,255,.16)'; c.lineWidth = 1;
  for (let r = 8; r < 25; r += 4) { c.beginPath(); c.arc(0, 0, r, 0, 7); c.stroke(); }
  c.globalCompositeOperation = 'lighter';
  c.shadowColor = '#00f0ff'; c.shadowBlur = 22;
  c.strokeStyle = '#7ff8ff'; c.lineWidth = 3.5;
  c.beginPath(); c.arc(0, 0, 22, 0, 7); c.stroke();
  c.lineWidth = 1.6;
  c.beginPath(); c.arc(0, 0, 11, 0, 7); c.stroke();
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2 + 0.4;
    c.beginPath(); c.moveTo(Math.cos(a) * 12, Math.sin(a) * 12); c.lineTo(Math.cos(a) * 20, Math.sin(a) * 20); c.stroke();
  }
  c.shadowBlur = 0;
  c.globalCompositeOperation = 'source-over';
  c.fillStyle = '#05080a'; c.beginPath(); c.arc(0, 0, 6, 0, 7); c.fill();
  c.restore();
}

function drawDiscHand(c: C, t: number, has: boolean) {
  plate(c, -82, -18, 48, 36, 13, ['#272c33', '#0a0b0e'], { gloss: 0.12 });
  c.save(); c.shadowColor = '#00f0ff'; c.shadowBlur = 12; c.strokeStyle = '#00f0ff'; c.lineWidth = 2.2;
  c.beginPath(); c.moveTo(-80, -10); c.lineTo(-40, -10); c.moveTo(-80, 10); c.lineTo(-40, 10); c.stroke();
  c.restore();
  for (let i = 0; i < 3; i++) engrave(c, -76 + i * 12, -5, 8, 10);
  plate(c, -42, -20, 36, 40, 12, ['#2c3239', '#0c0e11']);
  for (let i = 0; i < 4; i++) {
    const y = -17 + i * 11;
    plate(c, -9, y, 23, 10, 5, ['#333941', '#0e1013']);
    plate(c, 6, y + 1.4, 13, 8, 4, ['#282e35', '#0a0c0e']);
    c.fillStyle = 'rgba(0,240,255,.28)'; c.fillRect(-9, y + 3.6, 21, 1.2);
    glowDot(c, 9, y + 5, 1.7, '#7ff8ff', 0.9, 8);
  }
  plate(c, -24, 13, 24, 12, 6, ['#333941', '#0e1013']);
  c.fillStyle = 'rgba(0,240,255,.28)'; c.fillRect(-22, 17, 20, 1.2);
  if (has) drawDisc(c, 32, 0, t * 2, 1);
}

/* ===================== 13 · PROTON WAND ===================== */
function drawProton(c: C, t: number) {
  // braided cable
  c.lineCap = 'round';
  c.strokeStyle = '#0c0c0c'; c.lineWidth = 8;
  c.beginPath(); c.moveTo(-108, 46); c.quadraticCurveTo(-72, 13, -46, 8); c.stroke();
  c.strokeStyle = 'rgba(255,255,255,.12)'; c.lineWidth = 1.4;
  for (let i = 0; i < 22; i++) {
    const k = i / 22;
    const x = -108 + k * 62 + Math.sin(k * 3) * 6, y = 46 - k * 38 + Math.sin(k * 4) * 5;
    c.beginPath(); c.moveTo(x, y - 3); c.lineTo(x + 3, y + 3); c.stroke();
  }
  plate(c, -50, -12, 120, 24, 5, ['#63686d', '#2b2d30', '#121314']);
  for (let i = 0; i < 8; i++) {
    const on = (Math.floor(t * 12) + i) % 8 < 5;
    c.fillStyle = on ? '#ff3b2f' : '#3c0f0f';
    c.fillRect(-43 + i * 6, -16, 4, 4.4);
    if (on) glowDot(c, -41 + i * 6, -13.8, 1.6, '#ff5a4a', 0.8, 6);
  }
  engrave(c, -44, -8, 108, 2);
  boltsRow(c, -42, 58, 4, 1.5);
  plate(c, 66, -10, 44, 20, 3, ['#e2e2e2', '#828282', '#3a3a3a']);
  boltsRow(c, 70, 104, -4, 1.5);
  plate(c, 108, -8, 42, 16, 2, ['#f2c94c', '#9a7a14', '#5c4708']);
  knurl(c, 112, -5, 34, 10, 3, 0.28);
  plate(c, 148, -11, 16, 22, 3, ['#4c525a', '#141619']);
  poly(c, [-24, 8, -6, 8, -12, 38, -28, 36], vg(c, 8, 38, ['#3c4148', '#141619']));
  stipple(c, -28, 10, 22, 26, 110, 13, 0.3);
  plate(c, 38, 9, 12, 26, 5, ['#33383e', '#101214']);
  core(c, 162, 0, 13, 'rgba(255,138,42,.95)', '#fff2d2', 1);
}

/* ===================== 14 · TRIPOD HEAT-RAY ===================== */
function drawTripod(c: C, t: number) {
  c.save();
  c.lineCap = 'round';
  c.strokeStyle = '#22271f'; c.lineWidth = 19;
  c.beginPath(); c.moveTo(-112, 36); c.bezierCurveTo(-76, -13, -42, 23, -10, 0); c.stroke();
  c.strokeStyle = '#525c4c'; c.lineWidth = 11.5; c.stroke();
  c.strokeStyle = 'rgba(255,255,255,.14)'; c.lineWidth = 2.4; c.stroke();
  for (let i = 0; i < 11; i++) {
    const x = -106 + i * 9.6, y = 15 - Math.sin(i * 0.9) * 9.5;
    c.strokeStyle = 'rgba(0,0,0,.42)'; c.lineWidth = 1.2;
    c.beginPath(); c.arc(x, y, 7, 0, 7); c.stroke();
    c.fillStyle = 'rgba(140,160,120,.28)';
    c.beginPath(); c.arc(x - 1.6, y - 1.6, 2.2, 0, 7); c.fill();
  }
  c.beginPath();
  c.moveTo(-18, -23); c.quadraticCurveTo(42, -40, 92, -16); c.lineTo(118, -9); c.lineTo(118, 10);
  c.lineTo(92, 16); c.quadraticCurveTo(42, 40, -18, 23); c.closePath();
  c.fillStyle = vg(c, -40, 40, ['#d2d8cb', '#6a7366', '#2a2f28', '#454d42']); c.fill();
  c.strokeStyle = '#12140f'; c.lineWidth = 1.2; c.stroke();
  c.beginPath(); c.moveTo(-4, 0); c.quadraticCurveTo(52, -14, 110, 0);
  c.strokeStyle = 'rgba(0,0,0,.5)'; c.lineWidth = 1.4; c.stroke();
  for (let i = 0; i < 5; i++) {
    c.beginPath(); c.moveTo(12 + i * 21, -13); c.lineTo(16 + i * 21, 13);
    c.strokeStyle = 'rgba(0,0,0,.35)'; c.lineWidth = 1.1; c.stroke();
  }
  boltsRow(c, 30, 86, -19, 1.6);
  const p = 0.5 + 0.5 * Math.sin(t * 5);
  core(c, 120, 0, 22, 'rgba(216,255,138,.95)', `rgba(245,255,220,${0.6 + p * 0.4})`, 1);
  c.fillStyle = '#141a10'; c.beginPath(); c.ellipse(119, 0, 6, 11, 0, 0, 7); c.fill();
  c.strokeStyle = 'rgba(220,255,180,.8)'; c.lineWidth = 1.2;
  c.beginPath(); c.ellipse(119, 0, 6, 11, 0, 0, 7); c.stroke();
  glowDot(c, 43, -12, 3, '#ff3a2a', 1, 10);
  c.restore();
}

/* ===================== 15 · IRON MAN REPULSOR ===================== */
function drawIronHand(c: C, t: number, charge: number) {
  poly(c, [-90, -21, -22, -19, -22, 19, -90, 21], vg(c, -21, 21, ['#ef4040', '#a51616', '#4e0505', '#8c1212']));
  plate(c, -70, -21, 13, 42, 3, ['#f6d26a', '#a07a14', '#5a4508']);
  plate(c, -50, -19, 9, 38, 2, ['#c22626', '#5c0808']);
  for (let i = 0; i < 3; i++) engrave(c, -92 + i * 12, -6, 8, 12);
  boltsRow(c, -86, -34, -13, 1.6);
  // palm
  poly(c, [-28, -22, 18, -20, 20, 20, -28, 22], vg(c, -22, 22, ['#f24141', '#a51616', '#4e0505', '#8c1212']));
  c.strokeStyle = 'rgba(255,255,255,.16)'; c.lineWidth = 1;
  c.beginPath(); c.moveTo(-24, -12); c.lineTo(14, -11); c.moveTo(-24, 12); c.lineTo(14, 11); c.stroke();
  // fingers
  for (let i = 0; i < 4; i++) {
    const y = -19 + i * 10.6;
    plate(c, -5, y, 19, 9.6, 4.6, ['#e83636', '#7a0a0a']);
    plate(c, 8, y + 1, 14, 8.6, 4.2, ['#c92828', '#5c0707']);
    c.fillStyle = 'rgba(255,255,255,.2)'; c.fillRect(-3, y + 1.6, 15, 1.3);
    c.fillStyle = '#f6d26a'; c.fillRect(2, y - 0.4, 5, 2.2);
    screw(c, -2, y + 4.8, 1.3);
  }
  plate(c, -20, 15, 25, 12, 6, ['#e83636', '#7a0a0a']);
  // repulsor
  const pulse = 0.7 + 0.3 * Math.sin(t * 9) + charge * 0.5;
  core(c, 25, 0, 28 * pulse, 'rgba(120,220,255,.9)', '#ffffff', 1);
  c.fillStyle = '#f6d26a'; c.beginPath(); c.arc(23, 0, 9.5, 0, 7); c.fill();
  c.fillStyle = '#0f2436'; c.beginPath(); c.arc(23, 0, 7, 0, 7); c.fill();
  c.strokeStyle = '#eafaff'; c.lineWidth = 1.5;
  c.beginPath(); c.arc(23, 0, 4.2, 0, 7); c.stroke();
  c.strokeStyle = 'rgba(246,210,106,.7)'; c.lineWidth = 1;
  c.beginPath(); c.arc(23, 0, 8.2, 0, 7); c.stroke();
}

/* ===================== 16 · PREDATOR SHOULDER CANNON ===================== */
function drawShoulderCannon(c: C, t: number, charge: number) {
  c.save();
  c.lineCap = 'round';
  // shoulder armor plate
  poly(c, [-120, -28, -76, -37, -58, -15, -62, 24, -94, 33, -122, 13], vg(c, -37, 33, ['#8c7952', '#3a2f1e', '#161009', '#4a3c24']));
  c.strokeStyle = 'rgba(226,196,134,.5)'; c.lineWidth = 1.7;
  c.beginPath(); c.moveTo(-113, -17); c.quadraticCurveTo(-88, -30, -67, -19); c.stroke();
  c.beginPath(); c.moveTo(-115, 5); c.quadraticCurveTo(-90, -7, -67, 2); c.stroke();
  boltsRow(c, -111, -72, -23, 1.8);
  boltsRow(c, -111, -74, 19, 1.8);
  engrave(c, -110, -8, 34, 3);
  // articulated arm
  const sway = Math.sin(t * 1.6) * 2.2;
  const j1x = -56, j1y = -6 + sway, j2x = -22, j2y = -2 + sway * 0.6;
  c.strokeStyle = '#2c2418'; c.lineWidth = 13;
  c.beginPath(); c.moveTo(-94, 6); c.lineTo(j1x, j1y); c.stroke();
  c.strokeStyle = '#78623e'; c.lineWidth = 8; c.stroke();
  c.strokeStyle = 'rgba(255,232,180,.35)'; c.lineWidth = 2; c.stroke();
  c.strokeStyle = '#2c2418'; c.lineWidth = 11;
  c.beginPath(); c.moveTo(j1x, j1y); c.lineTo(j2x, j2y); c.stroke();
  c.strokeStyle = '#8a7248'; c.lineWidth = 6.5; c.stroke();
  for (const [jx, jy, r] of [[j1x, j1y, 10.5], [j2x, j2y, 9]] as [number, number, number][]) {
    const g = c.createRadialGradient(jx - 3, jy - 3, 0, jx, jy, r);
    g.addColorStop(0, '#d8c094'); g.addColorStop(0.6, '#5a4a30'); g.addColorStop(1, '#1b1409');
    c.fillStyle = g; c.beginPath(); c.arc(jx, jy, r, 0, 7); c.fill();
    c.strokeStyle = '#0c0906'; c.stroke();
    screw(c, jx, jy, r * 0.36, 0.9);
    core(c, jx, jy, r * 0.8, 'rgba(255,140,60,.35)', 'rgba(255,255,255,.5)', 0.35);
  }
  // cable
  c.strokeStyle = '#121212'; c.lineWidth = 3.6;
  c.beginPath(); c.moveTo(-98, 17); c.bezierCurveTo(-66, 31, -38, 23, -8, 17); c.stroke();
  c.strokeStyle = 'rgba(255,120,60,.4)'; c.lineWidth = 1;
  c.beginPath(); c.moveTo(-98, 17); c.bezierCurveTo(-66, 31, -38, 23, -8, 17); c.stroke();
  // hull
  c.beginPath();
  c.moveTo(-15, -17); c.quadraticCurveTo(20, -31, 72, -21); c.lineTo(118, -13);
  c.lineTo(124, 0); c.lineTo(118, 13); c.lineTo(72, 21); c.quadraticCurveTo(20, 31, -15, 17);
  c.lineTo(-24, 0); c.closePath();
  const hg = c.createLinearGradient(0, -31, 0, 31);
  hg.addColorStop(0, '#b49c6c'); hg.addColorStop(0.32, '#6b5a3c'); hg.addColorStop(0.72, '#332a19'); hg.addColorStop(1, '#120d07');
  c.fillStyle = hg; c.fill(); c.strokeStyle = '#0b0805'; c.lineWidth = 1.1; c.stroke();
  for (let x = -6; x < 114; x += 12) {
    c.beginPath(); c.moveTo(x, -19 + Math.abs(x - 40) * 0.06); c.lineTo(x + 6, 19 - Math.abs(x - 40) * 0.06);
    c.strokeStyle = 'rgba(0,0,0,.5)'; c.lineWidth = 1.3; c.stroke();
  }
  c.beginPath(); c.moveTo(-9, -13); c.quadraticCurveTo(48, -23, 114, -11);
  c.strokeStyle = 'rgba(238,212,158,.35)'; c.lineWidth = 1.2; c.stroke();
  boltsRow(c, -6, 30, 12, 1.5);
  const pulse = 0.55 + 0.45 * Math.sin(t * 7) + charge * 0.4;
  c.save();
  c.beginPath(); c.ellipse(58, 0, 30, 13, 0, 0, 7); c.clip();
  core(c, 58, 0, 34 * pulse, 'rgba(255,140,60,.9)', 'rgba(255,255,255,.95)', pulse);
  c.restore();
  c.strokeStyle = 'rgba(255,176,88,.75)'; c.lineWidth = 1.4;
  c.beginPath(); c.ellipse(58, 0, 28, 11, 0, 0, 7); c.stroke();
  // rotating triple barrel cluster
  c.save();
  c.translate(130, 0);
  const spin = t * 6;
  const sh = c.createLinearGradient(0, -20, 0, 20);
  sh.addColorStop(0, '#9c8558'); sh.addColorStop(0.5, '#463a24'); sh.addColorStop(1, '#161009');
  c.fillStyle = sh;
  rr(c, -10, -20, 24, 40, 10); c.fill(); c.strokeStyle = '#0b0805'; c.stroke();
  for (let i = 0; i < 3; i++) {
    const a = spin + (i * Math.PI * 2) / 3;
    const bx = Math.cos(a) * 10, by = Math.sin(a) * 10;
    c.fillStyle = '#2a2114';
    c.beginPath(); c.ellipse(15 + bx * 0.35, by, 5.2, 7.2, 0, 0, 7); c.fill();
    c.fillStyle = '#0c0906';
    c.beginPath(); c.ellipse(16 + bx * 0.35, by, 3, 4.8, 0, 0, 7); c.fill();
    if (charge > 0.15) core(c, 16 + bx * 0.35, by, 9, 'rgba(255,150,60,.9)', 'rgba(255,232,190,.95)', charge);
  }
  c.restore();
  // targeting laser
  plate(c, 32, -33, 28, 9, 3, ['#5a4b2e', '#191208']);
  glowDot(c, 58, -28.5, 2.6, '#ff2a1a', 1, 12);
  for (let i = 0; i < 3; i++) {
    const on = (Math.floor(t * 6) + i) % 3 === 0;
    glowDot(c, 5 + i * 8, 15, 1.9, on ? '#ffb35a' : '#3a2a12', on ? 1 : 0.4, 6);
  }
  c.restore();
}

/* ===================== 17 · XENO SPINE LAUNCHER ===================== */
function drawXenoLauncher(c: C, t: number) {
  const BONE = ['#ece3cc', '#b3a589', '#6c6049', '#2b251d'];
  for (let i = 0; i < 3; i++) {
    const x = -88 + i * 25;
    c.save();
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(x, 15);
    c.bezierCurveTo(x - 15, -17, x + 16, -38, x + 37, -29);
    c.strokeStyle = '#241d15'; c.lineWidth = 13.5 - i; c.stroke();
    c.strokeStyle = vg(c, -38, 15, BONE); c.lineWidth = 8.8 - i * 0.9; c.stroke();
    c.strokeStyle = 'rgba(255,252,232,.4)'; c.lineWidth = 1.6; c.stroke();
    c.strokeStyle = `rgba(150,255,95,${0.22 + 0.16 * Math.sin(t * 4 + i * 1.4)})`; c.lineWidth = 1.8; c.stroke();
    c.restore();
    core(c, x + 33, -27, 5, 'rgba(140,255,90,.8)', '#e6ffc4', 0.7);
  }
  // ribbed chitin barrel
  c.beginPath();
  c.moveTo(-50, -14); c.lineTo(118, -10); c.lineTo(118, 12); c.lineTo(-50, 16); c.closePath();
  c.fillStyle = vg(c, -14, 16, BONE); c.fill();
  c.strokeStyle = '#201a13'; c.lineWidth = 1.2; c.stroke();
  for (let x = -44; x < 114; x += 12) {
    c.beginPath(); c.moveTo(x, -13); c.quadraticCurveTo(x + 7, 1, x, 15);
    c.strokeStyle = 'rgba(32,25,17,.72)'; c.lineWidth = 1.8; c.stroke();
    c.beginPath(); c.moveTo(x + 2.6, -12); c.quadraticCurveTo(x + 9.6, 1, x + 2.6, 14);
    c.strokeStyle = 'rgba(255,252,235,.24)'; c.lineWidth = 1; c.stroke();
  }
  // acid sacs
  for (let i = 0; i < 3; i++) {
    const x = 4 + i * 35;
    const pulse = 0.62 + 0.38 * Math.sin(t * 5 + i * 1.3);
    c.save();
    c.beginPath(); c.ellipse(x, -13, 15, 10, 0, 0, 7); c.clip();
    core(c, x - 2, -15, 18, `rgba(112,232,58,${0.85 * pulse})`, `rgba(220,255,182,${0.9 * pulse})`, 1);
    c.restore();
    c.strokeStyle = 'rgba(28,58,10,.85)'; c.lineWidth = 1.3;
    c.beginPath(); c.ellipse(x, -13, 15, 10, 0, 0, 7); c.stroke();
  }
  poly(c, [-30, 14, -9, 14, -16, 47, -36, 45], vg(c, 14, 47, ['#cdbd9c', '#5b5040', '#241d15']));
  stipple(c, -36, 16, 27, 30, 140, 9, 0.28);
  c.strokeStyle = '#241d15'; c.lineWidth = 2.3;
  c.beginPath(); c.moveTo(3, 13); c.lineTo(6, 24); c.stroke(); c.lineWidth = 1;
  // jaw muzzle
  c.save();
  c.translate(122, 0);
  const open = 0.17 + Math.sin(t * 3.4) * 0.05;
  for (const s2 of [-1, 1]) {
    c.save(); c.rotate(s2 * open);
    poly(c, [-3, s2 * 6, 27, s2 * 13, 37, s2 * 22, 22, s2 * 24, -5, s2 * 12], vg(c, -24, 24, BONE), '#1d170f');
    c.fillStyle = '#fffdf2';
    for (let i = 0; i < 4; i++) {
      c.beginPath();
      c.moveTo(5 + i * 8, s2 * 9 + i * 1.7);
      c.lineTo(8.2 + i * 8, s2 * 2 + i * 1.2);
      c.lineTo(11.4 + i * 8, s2 * 10 + i * 1.7);
      c.fill();
    }
    c.restore();
  }
  core(c, 12, 0, 21, 'rgba(120,240,60,.85)', `rgba(230,255,196,${0.8 + 0.2 * Math.sin(t * 9)})`, 1);
  for (let i = 0; i < 3; i++) {
    const dy = (t * 46 + i * 24) % 66;
    c.fillStyle = `rgba(146,255,92,${1 - dy / 66})`;
    c.beginPath(); c.arc(23 + i * 5, 11 + dy * 0.55, 2.5 - dy * 0.022, 0, 7); c.fill();
  }
  c.restore();
}

/* ===================== 18 · VOID SINGULARITY CANNON ===================== */
function drawVoidCannon(c: C, t: number) {
  const OBS = ['#7a66ac', '#2c2249', '#0d0919', '#3c2f66'];
  poly(c, [-78, -16, 36, -24, 104, -16, 134, -7, 134, 10, 104, 18, 36, 26, -78, 18], vg(c, -26, 26, OBS));
  for (let x = -68; x < 130; x += 15) {
    c.beginPath(); c.moveTo(x, -18); c.lineTo(x + 11, 18);
    c.strokeStyle = 'rgba(178,124,255,.3)'; c.lineWidth = 1.1; c.stroke();
    c.beginPath(); c.moveTo(x + 2, -18); c.lineTo(x + 13, 18);
    c.strokeStyle = 'rgba(255,255,255,.1)'; c.lineWidth = 1; c.stroke();
  }
  c.save();
  c.shadowColor = '#b26cff'; c.shadowBlur = 12;
  c.strokeStyle = 'rgba(200,154,255,.92)'; c.lineWidth = 1.5;
  for (let i = 0; i < 5; i++) {
    const x = -50 + i * 34, y = -2 + Math.sin(i * 2.1) * 6;
    c.beginPath(); c.moveTo(x, y - 6); c.lineTo(x + 8, y); c.lineTo(x, y + 6);
    c.moveTo(x + 13, y - 5); c.lineTo(x + 19, y + 5); c.stroke();
  }
  c.restore();
  core(c, 54, 0, 26, 'rgba(126,54,226,.9)', '#000000', 1);
  c.fillStyle = '#050308'; c.beginPath(); c.arc(54, 0, 15, 0, 7); c.fill();
  c.strokeStyle = 'rgba(212,172,255,.9)'; c.lineWidth = 1.7;
  c.beginPath(); c.arc(54, 0, 15.5, 0, 7); c.stroke();
  for (let i = 0; i < 3; i++) {
    const a = t * 1.4 + i * 2.1;
    const rr2 = 30 + i * 17;
    const x = 62 + Math.cos(a) * 9, y = Math.sin(a) * rr2 * 0.32;
    c.strokeStyle = `rgba(190,142,255,${0.32 + 0.3 * (Math.sin(a) * 0.5 + 0.5)})`;
    c.lineWidth = 3 - i * 0.6;
    c.beginPath(); c.ellipse(x, y, rr2 * 0.52, rr2 * 0.19, Math.sin(a) * 0.45, 0, 7); c.stroke();
  }
  poly(c, [-80, -16, -22, -14, -22, 16, -80, 19], vg(c, -16, 19, OBS));
  poly(c, [-68, 17, -46, 17, -52, 50, -72, 48], vg(c, 17, 50, OBS));
  stipple(c, -72, 19, 26, 30, 120, 23, 0.24);
  boltsRow(c, -70, -34, -5, 1.6);
  engrave(c, -72, -8, 30, 3);
  poly(c, [132, -14, 156, -5, 156, 8, 132, 14], vg(c, -14, 14, ['#523a80', '#130d2a']), '#08050f');
  core(c, 157, 0, 15, 'rgba(150,80,255,.95)', '#ffffff', 1);
}

/* ===================== 19 · KRYON SHARD CANNON ===================== */
function drawShardCannon(c: C, t: number) {
  const cg = c.createLinearGradient(0, -23, 0, 23);
  cg.addColorStop(0, 'rgba(244,254,255,.97)');
  cg.addColorStop(0.3, 'rgba(158,232,255,.93)');
  cg.addColorStop(0.7, 'rgba(38,132,182,.93)');
  cg.addColorStop(1, 'rgba(8,44,72,.96)');
  poly(c, [-74, -7, -20, -20, 58, -18, 112, -12, 136, -4, 136, 6, 112, 14, 58, 20, -20, 22, -74, 9], cg, 'rgba(226,251,255,.8)', 1.2);
  for (let x = -58; x < 130; x += 18) {
    c.beginPath(); c.moveTo(x, -16 + Math.abs(x - 42) * 0.035); c.lineTo(x + 11, 16 - Math.abs(x - 42) * 0.035);
    c.strokeStyle = 'rgba(255,255,255,.42)'; c.lineWidth = 1; c.stroke();
    c.beginPath(); c.moveTo(x + 2, -16 + Math.abs(x - 42) * 0.035); c.lineTo(x + 13, 16 - Math.abs(x - 42) * 0.035);
    c.strokeStyle = 'rgba(6,40,64,.35)'; c.lineWidth = 1; c.stroke();
  }
  c.save();
  c.shadowColor = '#9fe8ff'; c.shadowBlur = 11;
  c.strokeStyle = 'rgba(238,253,255,.92)'; c.lineWidth = 1.3;
  c.beginPath(); c.moveTo(-60, 0); c.quadraticCurveTo(22, -11, 126, -3); c.stroke();
  c.beginPath(); c.moveTo(-32, 13); c.quadraticCurveTo(30, 6, 112, 13); c.stroke();
  c.restore();
  for (let i = 0; i < 4; i++) {
    const a = t * 1.6 + i * 1.57;
    const x = 46 + Math.cos(a) * 50, y = Math.sin(a) * 22;
    const s2 = 4 + (i % 2) * 3.5;
    poly(c, [x, y - s2 * 1.9, x + s2 * 0.78, y, x, y + s2 * 1.7, x - s2 * 0.78, y], 'rgba(192,242,255,.92)', 'rgba(255,255,255,.72)');
    core(c, x, y, s2 * 1.6, 'rgba(150,230,255,.8)', '#ffffff', 0.5);
  }
  poly(c, [-36, 20, -12, 20, -18, 53, -42, 51], vg(c, 20, 53, ['rgba(126,206,238,.92)', 'rgba(14,58,90,.96)']));
  stipple(c, -42, 22, 30, 30, 110, 19, 0.2);
  for (let i = 0; i < 3; i++) {
    const y = -9 + i * 9;
    poly(c, [134, y - 5, 158 + i * 3, y, 134, y + 5], cg, 'rgba(226,251,255,.8)');
    core(c, 150 + i * 3, y, 4, 'rgba(150,230,255,.8)', '#ffffff', 0.45);
  }
  core(c, 162, 0, 17, 'rgba(120,215,255,.95)', '#ffffff', 1);
}

/* ===================== 20 · XENO ACID BLOOD (pressurised molecular acid) ===================== */
function drawAcidSac(c: C, t: number, charge: number) {
  const BONE = ['#e9dfc6', '#b0a286', '#6a5e47', '#2b251d'];
  // bony pressurised housing
  poly(c, [-74, -17, 34, -23, 112, -13, 130, -5, 130, 7, 112, 15, 34, 25, -74, 19], vg(c, -25, 25, BONE));
  for (let x = -66; x < 124; x += 13) {
    c.beginPath(); c.moveTo(x, -18); c.lineTo(x + 7, 18);
    c.strokeStyle = 'rgba(32,25,17,.6)'; c.lineWidth = 1.6; c.stroke();
    c.beginPath(); c.moveTo(x + 2.4, -18); c.lineTo(x + 9.4, 18);
    c.strokeStyle = 'rgba(255,252,235,.2)'; c.lineWidth = 1; c.stroke();
  }
  // veins feeding the sac
  c.save();
  c.strokeStyle = 'rgba(120,220,60,.45)'; c.lineWidth = 1.6;
  for (let i = 0; i < 5; i++) {
    c.beginPath();
    c.moveTo(-60 + i * 28, 14);
    c.quadraticCurveTo(-30 + i * 28, 4, 22 + i * 20, -2);
    c.stroke();
  }
  c.restore();
  // pressurised acid sac (inflates with charge)
  const bulge = 1 + charge * 0.3 + 0.035 * Math.sin(t * 6);
  c.save();
  c.translate(34, -1);
  c.scale(bulge, bulge);
  c.beginPath(); c.ellipse(0, 0, 34, 17, 0, 0, 7); c.clip();
  core(c, -4, -5, 34, 'rgba(150,255,60,.95)', `rgba(232,255,196,${0.85 + 0.15 * Math.sin(t * 8)})`, 1);
  c.fillStyle = 'rgba(40,90,10,.32)';
  for (let i = 0; i < 7; i++) {
    c.beginPath();
    c.ellipse(-26 + i * 9, 6 + Math.sin(i * 1.7) * 6, 5, 2.6, i * 0.6, 0, 7);
    c.fill();
  }
  c.restore();
  c.strokeStyle = 'rgba(30,62,10,.85)'; c.lineWidth = 1.5;
  c.beginPath(); c.ellipse(34, -1, 34 * bulge, 17 * bulge, 0, 0, 7); c.stroke();
  c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 1.2;
  c.beginPath(); c.ellipse(30, -7, 22 * bulge, 8 * bulge, -0.16, 3.5, 5.6); c.stroke();
  // pressure gauge window
  core(c, -34, -14, 8, 'rgba(180,255,90,.9)', '#f2ffd8', 0.75 + 0.25 * Math.sin(t * 9));
  c.strokeStyle = 'rgba(20,40,6,.8)'; c.lineWidth = 1.2;
  c.beginPath(); c.arc(-34, -14, 8, 0, 7); c.stroke();
  // nozzle with jaw ring
  plate(c, 126, -11, 18, 22, 6, ['#6d6349', '#241d15', '#463d2b']);
  knurl(c, 129, -7, 12, 14, 3, 0.3);
  c.fillStyle = '#0e1503'; c.beginPath(); c.ellipse(143, 0, 5, 7, 0, 0, 7); c.fill();
  core(c, 141, 0, 11, 'rgba(150,255,60,.9)', '#e8ffc0', 0.85 + 0.15 * Math.sin(t * 12));
  // drips
  for (let i = 0; i < 3; i++) {
    const dy = (t * 52 + i * 26) % 72;
    c.fillStyle = `rgba(150,255,70,${1 - dy / 72})`;
    c.beginPath(); c.arc(138 + i * 5, 10 + dy * 0.55, 2.6 - dy * 0.024, 0, 7); c.fill();
  }
  // bone grip
  poly(c, [-32, 15, -11, 15, -18, 48, -38, 46], vg(c, 15, 48, ['#c9b998', '#584d3d', '#241d15']));
  stipple(c, -38, 17, 27, 30, 140, 29, 0.26);
  c.strokeStyle = '#241d15'; c.lineWidth = 2.3;
  c.beginPath(); c.moveTo(1, 14); c.lineTo(4, 25); c.stroke(); c.lineWidth = 1;
}

/* ===================== 21 · MEGA BUSTER ===================== */
function drawMegaBuster(c: C, t: number, charge: number) {
  const BLUE = ['#5aa8ff', '#2a63c8', '#12326e', '#1c49a0'];
  const BLUE2 = ['#79c2ff', '#2f6fd6', '#123268'];
  // arm segments
  poly(c, [-84, -19, -46, -22, -30, -14, -30, 15, -46, 23, -84, 20], vg(c, -22, 23, BLUE));
  plate(c, -78, -12, 22, 26, 8, BLUE2);
  c.fillStyle = 'rgba(255,255,255,.22)'; c.fillRect(-76, -10, 18, 2);
  plate(c, -52, -15, 16, 30, 6, ['#6bb6ff', '#275fc0', '#0f2c62']);
  engrave(c, -48, -8, 8, 16);
  // elbow joint
  const jg = c.createRadialGradient(-38, -3, 0, -38, 0, 13);
  jg.addColorStop(0, '#a8dcff'); jg.addColorStop(0.55, '#2f6fd6'); jg.addColorStop(1, '#0e2b60');
  c.fillStyle = jg; c.beginPath(); c.arc(-38, 0, 12, 0, 7); c.fill();
  c.strokeStyle = '#0b2252'; c.lineWidth = 1.2; c.stroke();
  core(c, -38, 0, 5, 'rgba(150,220,255,.9)', '#ffffff', 0.8);
  // cannon body
  poly(c, [-32, -22, 60, -25, 106, -17, 122, -9, 122, 10, 106, 18, 60, 26, -32, 23], vg(c, -26, 26, BLUE));
  c.fillStyle = 'rgba(255,255,255,.24)';
  c.fillRect(-28, -21, 146, 2.4);
  c.fillStyle = 'rgba(0,0,0,.22)';
  c.fillRect(-28, 18, 146, 3.4);
  // white band + porthole lights
  plate(c, -8, -25, 12, 51, 5, ['#f2f8ff', '#b9cfe6', '#7d97b4']);
  plate(c, 30, -27, 10, 55, 5, ['#eaf4ff', '#a9c3de', '#6f8ba9']);
  for (let i = 0; i < 3; i++) {
    const on = (Math.floor(t * 5) + i) % 3 === 0;
    core(c, 8 + i * 13, -14, 3.4, on ? 'rgba(120,220,255,.95)' : 'rgba(30,70,130,.7)', '#e6f8ff', on ? 1 : 0.5);
    c.strokeStyle = 'rgba(10,40,90,.7)'; c.lineWidth = 1;
    c.beginPath(); c.arc(8 + i * 13, -14, 3.4, 0, 7); c.stroke();
  }
  // barrel
  tube(c, 62, 122, 0, 12, ['#8fd0ff', '#2c68cc', '#123a80', '#1c49a0']);
  knurl(c, 66, -9, 12, 18, 3.4, 0.22);
  engrave(c, 86, -8, 22, 3);
  plate(c, 118, -12, 12, 24, 5, ['#7fc4ff', '#22509c', '#0e2c62']);
  // muzzle + charge glow
  const cg2 = 0.6 + charge * 1.2 + 0.12 * Math.sin(t * 12);
  core(c, 132, 0, 16 * cg2, 'rgba(120,215,255,.95)', '#ffffff', 1);
  if (charge > 0.05) {
    c.save();
    c.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 3; i++) {
      const a = t * 5 + i * 2.1;
      c.strokeStyle = `rgba(160,225,255,${0.25 + charge * 0.5})`;
      c.lineWidth = 1.6;
      c.beginPath();
      c.ellipse(132, 0, 12 + charge * 16 + i * 4, (12 + charge * 16 + i * 4) * 0.42, a, 0, 7);
      c.stroke();
    }
    c.restore();
    core(c, 40, 0, 26 * charge, 'rgba(90,190,255,.7)', '#e6f8ff', charge * 0.8);
  }
  // gold trim
  c.fillStyle = '#ffd23f'; c.fillRect(118, -13, 4, 26);
  c.fillStyle = 'rgba(255,255,255,.5)'; c.fillRect(118, -13, 4, 2);
}

/* ===================== DRAW DISPATCH ===================== */
export function drawWeapon(c: C, idx: number, t: number, st: { charge: number; ready: boolean; swing: number; cycle?: number }) {
  switch (idx) {
    case 0: return drawBow(c, t, st.charge, st.ready, st.cycle);
    case 1: return drawAK(c, t);
    case 2: return drawM4(c, t);
    case 3: return drawM4(c, t, '#3ff0ff');
    case 4: return drawMP5(c, t);
    case 5: return drawMP5(c, t, '#b06bff');
    case 6: return drawSniper(c, t);
    case 7: return drawDragon(c, t);
    case 8: return drawBeretta(c);
    case 9: return drawPhaser(c, t);
    case 10: return drawSword(c, t, st.swing);
    case 11: return drawPlasmacaster(c, t);
    case 12: return drawDiscHand(c, t, st.ready);
    case 13: return drawProton(c, t);
    case 14: return drawTripod(c, t);
    case 15: return drawIronHand(c, t, st.charge);
    case 16: return drawShoulderCannon(c, t, st.charge);
    case 17: return drawXenoLauncher(c, t);
    case 18: return drawVoidCannon(c, t);
    case 19: return drawShardCannon(c, t);
    case 20: return drawAcidSac(c, t, st.charge);
    case 21: return drawMegaBuster(c, t, st.charge);
  }
}
