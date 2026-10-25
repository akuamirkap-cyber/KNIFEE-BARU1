import { hexA, metal, rr, TAU, clamp, bevel, rand } from './core';

export interface ArtState {
  t: number;
  recoil: number; // 0..1
  pull: number; // 0..1 bow pull
  charge: number; // 0..1
  fire: number; // 0..1 muzzle flash
  active: boolean; // beam streaming
  sway: number;
}

type Draw = (ctx: CanvasRenderingContext2D, s: ArtState) => void;

const GLOVE_HI = '#4a515e';

function glow(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, a = 1) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, Math.max(0.4, r));
  g.addColorStop(0, hexA('#ffffff', 0.9 * a));
  g.addColorStop(0.3, hexA(color, 0.75 * a));
  g.addColorStop(1, hexA(color, 0));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
}

/** simple arm + glove for hand-held gear, drawn behind the prop */
function arm(ctx: CanvasRenderingContext2D, gx: number, gy: number, len = 90, ang = 0.32) {
  ctx.save();
  ctx.translate(gx, gy);
  ctx.rotate(ang);
  const g = ctx.createLinearGradient(0, -18, 0, 20);
  g.addColorStop(0, '#d8443f');
  g.addColorStop(0.6, '#a82c2c');
  g.addColorStop(1, '#6d1a1a');
  ctx.fillStyle = g;
  rr(ctx, -len, -17, len, 34, 12);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.35)';
  ctx.lineWidth = 2;
  ctx.stroke();
  // glove
  const gg = ctx.createLinearGradient(0, -20, 0, 22);
  gg.addColorStop(0, GLOVE_HI);
  gg.addColorStop(1, '#1a1e25');
  ctx.fillStyle = gg;
  rr(ctx, -34, -21, 46, 42, 13);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.5)';
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.08)';
  for (let i = 0; i < 3; i++) {
    rr(ctx, -30 + i * 12, -19, 7, 38, 4);
    ctx.fill();
  }
  ctx.restore();
}

/* ------------------------------------------------------------------ BOW */
function drawBow(ctx: CanvasRenderingContext2D, s: ArtState) {
  const pull = s.pull;
  const top = -78;
  const bot = 78;
  // string
  const nockX = -68 - pull * 52;
  ctx.strokeStyle = 'rgba(240,245,255,.85)';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-10, top);
  ctx.lineTo(nockX, 0);
  ctx.lineTo(-10, bot);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(120,220,255,.35)';
  ctx.lineWidth = 4;
  ctx.stroke();

  // limbs (recurve)
  ctx.lineCap = 'round';
  for (const dir of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(-6, dir * 6);
    ctx.quadraticCurveTo(-40, dir * 44, -26, dir * 78);
    ctx.strokeStyle = '#3b2a1c';
    ctx.lineWidth = 13;
    ctx.stroke();
    ctx.strokeStyle = '#6b4a2c';
    ctx.lineWidth = 7;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,220,160,.35)';
    ctx.lineWidth = 2;
    ctx.stroke();
    // recurve tip
    ctx.beginPath();
    ctx.moveTo(-26, dir * 78);
    ctx.lineTo(-8, dir * 82);
    ctx.strokeStyle = '#20180f';
    ctx.lineWidth = 8;
    ctx.stroke();
  }
  // riser / grip
  const rg = ctx.createLinearGradient(-40, 0, 4, 0);
  rg.addColorStop(0, '#2b1d12');
  rg.addColorStop(0.5, '#5c3f24');
  rg.addColorStop(1, '#2b1d12');
  ctx.fillStyle = rg;
  ctx.beginPath();
  ctx.moveTo(-4, -30);
  ctx.lineTo(-34, -34);
  ctx.lineTo(-42, 0);
  ctx.lineTo(-34, 34);
  ctx.lineTo(-4, 30);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,.35)';
  rr(ctx, -32, -14, 20, 28, 6);
  ctx.fill();
  // arrow on string
  const ax = nockX + 6;
  ctx.save();
  ctx.translate(ax, 0);
  ctx.strokeStyle = '#c9a15c';
  ctx.lineWidth = 3.4;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(76, 0);
  ctx.stroke();
  ctx.fillStyle = '#e7e2d5';
  ctx.beginPath();
  ctx.moveTo(76, -4.5);
  ctx.lineTo(94, 0);
  ctx.lineTo(76, 4.5);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#37d6ff';
  for (const d of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(8, d * 2);
    ctx.lineTo(-10, d * 12);
    ctx.lineTo(2, d * 2.5);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
  if (pull > 0.05) glow(ctx, ax + 10, 0, 26 * pull, '#7ee8ff', pull * 0.5);
}

/* --------------------------------------------------- AK / RIFLE / SNIPER */
interface RifleOpts {
  len: number;
  accent?: string;
  coils?: boolean;
  suppressor?: boolean;
  wood?: boolean;
  scope?: boolean;
  drum?: boolean;
  glowCore?: number;
}

function rifle(ctx: CanvasRenderingContext2D, s: ArtState, o: RifleOpts) {
  const bodyTop = -14;
  const L = o.len;
  const wood = o.wood;
  const bodyCol = wood ? '#5a3b22' : '#2f353d';
  const bodyHi = wood ? '#8a5f36' : '#6b7480';
  const bodyLo = wood ? '#2b1b0e' : '#15181d';
  // fixed key stations (muzzle = 0)
  const MZ0 = -36;          // muzzle device rear
  const BAR = -62;          // exposed barrel
  const HG0 = -128;         // handguard rear
  const REC0 = -190;        // receiver rear
  const REC1 = -122;        // receiver front
  const extra = Math.max(0, o.len - 250);

  ctx.save();
  ctx.translate(0, s.recoil * 16);

  // ---- stock
  ctx.fillStyle = metal(ctx, -L, bodyTop - 4, REC0 + 90, bodyTop + 16, bodyCol, bodyHi, bodyLo);
  ctx.beginPath();
  ctx.moveTo(-L, -18);
  ctx.lineTo(REC0 + 4, -14);
  ctx.lineTo(REC0 + 4, 14);
  ctx.lineTo(-L + 66, 32);
  ctx.lineTo(-L, 22);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.55)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = 'rgba(0,0,0,.3)';
  rr(ctx, -L + 10, -6, 58, 9, 4);
  ctx.fill();
  ctx.fillStyle = '#1a2027';
  rr(ctx, -L - 4, -20, 16, 40, 6);
  ctx.fill();

  // ---- receiver
  ctx.fillStyle = metal(ctx, REC0, bodyTop, REC1, 18, '#333a42', '#79828e', '#14171b');
  rr(ctx, REC0, bodyTop, REC1 - REC0, 32, 4);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.5)';
  ctx.stroke();
  // ejection port + charging handle
  ctx.fillStyle = 'rgba(0,0,0,.45)';
  rr(ctx, REC0 + 28, bodyTop + 7, 30, 12, 2);
  ctx.fill();
  ctx.fillStyle = '#9aa4b0';
  rr(ctx, REC0 + 20, bodyTop - 5, 22, 5, 2);
  ctx.fill();
  // dust cover seam
  ctx.strokeStyle = 'rgba(255,255,255,.10)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(REC0 + 6, bodyTop + 3);
  ctx.lineTo(REC1 - 6, bodyTop + 3);
  ctx.stroke();

  // ---- trigger guard + pistol grip
  ctx.strokeStyle = '#22272e';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(REC0 + 42, 30, 15, 0.1, Math.PI - 0.2);
  ctx.stroke();
  ctx.fillStyle = metal(ctx, REC0 + 50, 18, REC0 + 78, 56, wood ? '#4a2f1a' : '#22262c', wood ? '#7a5228' : '#4b525c', '#0e1013');
  ctx.beginPath();
  ctx.moveTo(REC0 + 52, 16);
  ctx.lineTo(REC0 + 76, 16);
  ctx.lineTo(REC0 + 70, 56);
  ctx.lineTo(REC0 + 50, 52);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.5)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // ---- magazine
  ctx.fillStyle = metal(ctx, REC0 + 62, 20, REC0 + 104, 80, wood ? '#6d4526' : '#2b3037', '#8d97a3', '#111417');
  ctx.save();
  ctx.translate(REC0 + 66, 28);
  ctx.rotate(0.16);
  rr(ctx, -12, 0, 27, 64, 5);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.5)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.06)';
  rr(ctx, -9, 4, 8, 56, 3);
  ctx.fill();
  ctx.restore();

  // ---- handguard / gas tube
  ctx.fillStyle = metal(ctx, HG0, -13, BAR, 9, bodyCol, bodyHi, bodyLo);
  rr(ctx, HG0, -15, BAR - HG0, 21, 5);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.45)';
  ctx.stroke();
  if (wood) {
    ctx.strokeStyle = 'rgba(0,0,0,.25)';
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(HG0 + 8 + i * 14, -14);
      ctx.lineTo(HG0 + 8 + i * 14, 5);
      ctx.stroke();
    }
  }
  // upper handguard / gas block line
  ctx.fillStyle = 'rgba(255,255,255,.08)';
  rr(ctx, HG0 + 4, -13, BAR - HG0 - 8, 4, 2);
  ctx.fill();

  // ---- exposed barrel + suppressor
  const bg = ctx.createLinearGradient(0, -10, 0, 12);
  bg.addColorStop(0, '#8c949f');
  bg.addColorStop(0.4, '#3a4048');
  bg.addColorStop(1, '#12151a');
  ctx.fillStyle = bg;
  if (o.suppressor) {
    rr(ctx, BAR - 6, -10, MZ0 + 6 - BAR + extra, 20, 7);
    ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,.35)';
    for (let i = 0; i < 9; i++) ctx.fillRect(BAR + i * ((MZ0 - BAR - extra) / 9), -10, 3, 20);
    ctx.strokeStyle = 'rgba(0,0,0,.5)';
    ctx.lineWidth = 1.5;
    rr(ctx, BAR - 6, -10, MZ0 + 6 - BAR + extra, 20, 7);
    ctx.stroke();
  } else {
    rr(ctx, BAR, -7, MZ0 - BAR + extra, 14, 3);
    ctx.fill();
  }

  // ---- energy coils
  if (o.coils) {
    for (let i = 0; i < 5; i++) {
      const x = HG0 + 10 + i * ((BAR - HG0 - 24) / 4);
      const pulse = 0.5 + 0.5 * Math.sin(s.t * 6 - i);
      glow(ctx, x + 6, -4, 20 + pulse * 7, o.accent ?? '#22d3ee', 0.55);
      ctx.fillStyle = hexA(o.accent ?? '#22d3ee', 0.85);
      rr(ctx, x, -17, 12, 24, 4);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.75)';
      rr(ctx, x + 2, -15, 8, 6, 2);
      ctx.fill();
    }
  }

  // ---- front sight
  ctx.fillStyle = '#20252b';
  ctx.beginPath();
  ctx.moveTo(MZ0 - 14, -7);
  ctx.lineTo(MZ0 - 10, -28);
  ctx.lineTo(MZ0 - 3, -28);
  ctx.lineTo(MZ0 + 1, -7);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#0d1013';
  ctx.fillRect(MZ0 - 9, -31, 6, 4);

  // ---- muzzle device
  ctx.fillStyle = metal(ctx, MZ0, -6, 2, 6, '#262b31', '#6e7681', '#0d0f12');
  if (wood) {
    ctx.beginPath();
    ctx.moveTo(MZ0, -10);
    ctx.lineTo(0, -10);
    ctx.lineTo(0, 11);
    ctx.lineTo(MZ0 + 14, 11);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,.35)';
    ctx.fillRect(MZ0 + 2, -8, 4, 17);
  } else {
    rr(ctx, MZ0, -10, -MZ0, 20, 4);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.5)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = '#0b0d10';
    ctx.fillRect(-7, -6, 7, 12);
    ctx.fillStyle = 'rgba(255,255,255,.10)';
    ctx.fillRect(MZ0 + 3, -8, 3, 16);
  }

  // ---- optics
  if (o.scope) {
    ctx.fillStyle = '#1b1f25';
    rr(ctx, REC0 + 30, -46, 104, 22, 9);
    ctx.fill();
    const sg = ctx.createLinearGradient(REC0 + 30, -46, REC0 + 134, -24);
    sg.addColorStop(0, '#5d6672');
    sg.addColorStop(1, '#15181c');
    ctx.fillStyle = sg;
    rr(ctx, REC0 + 32, -44, 100, 18, 8);
    ctx.fill();
    ctx.fillStyle = '#0b1b22';
    ctx.beginPath();
    ctx.arc(REC0 + 126, -35, 10, 0, TAU);
    ctx.fill();
    ctx.fillStyle = hexA(o.accent ?? '#8ef0ff', 0.85);
    ctx.beginPath();
    ctx.arc(REC0 + 126, -35, 5, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#20252b';
    rr(ctx, REC0 + 44, -26, 12, 14, 3);
    ctx.fill();
    rr(ctx, REC0 + 112, -26, 12, 14, 3);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.15)';
    rr(ctx, REC0 + 38, -42, 84, 4, 2);
    ctx.fill();
  }

  // ---- energy core
  if (o.glowCore) {
    const pulse = 0.6 + 0.4 * Math.sin(s.t * 5);
    glow(ctx, REC0 + 58, 3, (22 + pulse * 8) * o.glowCore, o.accent ?? '#22d3ee', 0.8 * o.glowCore);
    ctx.fillStyle = hexA(o.accent ?? '#22d3ee', 0.9);
    ctx.beginPath();
    ctx.arc(REC0 + 58, 3, 7, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

/* -------------------------------------------------------------- MP5 SMG */
function smg(ctx: CanvasRenderingContext2D, s: ArtState, accent?: string) {
  ctx.save();
  ctx.translate(0, s.recoil * 12);
  // skeleton stock
  ctx.strokeStyle = '#2b3138';
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.moveTo(-178, -8);
  ctx.lineTo(-206, -6);
  ctx.moveTo(-178, 12);
  ctx.lineTo(-206, 16);
  ctx.stroke();
  ctx.fillStyle = '#20252b';
  rr(ctx, -214, -16, 44, 34, 8);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.5)';
  ctx.stroke();
  // receiver
  ctx.fillStyle = metal(ctx, -180, -12, -20, 16, '#343b44', '#7d8794', '#121519');
  rr(ctx, -180, -14, 140, 32, 5);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.5)';
  ctx.stroke();
  ctx.fillStyle = 'rgba(0,0,0,.4)';
  rr(ctx, -150, -6, 34, 14, 2);
  ctx.fill();
  // cocking tube
  ctx.fillStyle = '#3c434c';
  rr(ctx, -120, -24, 92, 11, 5);
  ctx.fill();
  // handguard
  ctx.fillStyle = metal(ctx, -96, -14, -10, 6, '#262b32', '#5f6874', '#0e1114');
  ctx.beginPath();
  ctx.moveTo(-96, -16);
  ctx.lineTo(-30, -16);
  ctx.lineTo(-24, -6);
  ctx.lineTo(-24, 12);
  ctx.lineTo(-96, 12);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.45)';
  ctx.stroke();
  ctx.fillStyle = 'rgba(0,0,0,.3)';
  for (let i = 0; i < 6; i++) ctx.fillRect(-88 + i * 10, -12, 4, 20);
  // barrel + muzzle
  ctx.fillStyle = '#20252b';
  rr(ctx, -26, -7, 28, 14, 3);
  ctx.fill();
  ctx.fillStyle = '#0c0e11';
  ctx.fillRect(-4, -4.5, 8, 9);
  // drum + ring sights
  ctx.fillStyle = '#191d22';
  ctx.beginPath();
  ctx.arc(-104, -30, 7, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(-18, -30, 5, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = '#191d22';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-104, -24);
  ctx.lineTo(-104, -16);
  ctx.moveTo(-18, -26);
  ctx.lineTo(-18, -16);
  ctx.stroke();
  // grip + trigger
  ctx.fillStyle = metal(ctx, -150, 18, -120, 56, '#262b32', '#4e5761', '#0d1013');
  ctx.beginPath();
  ctx.moveTo(-148, 16);
  ctx.lineTo(-122, 16);
  ctx.lineTo(-128, 54);
  ctx.lineTo(-150, 50);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#20252b';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(-136, 30, 14, 0.1, Math.PI - 0.2);
  ctx.stroke();
  // curved magazine
  ctx.save();
  ctx.translate(-116, 26);
  ctx.rotate(0.24);
  const mg = ctx.createLinearGradient(0, 0, 0, 70);
  mg.addColorStop(0, '#4b535d');
  mg.addColorStop(1, '#171b20');
  ctx.fillStyle = mg;
  rr(ctx, -11, 0, 24, 66, 5);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.5)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
  // SEF selector dots
  ctx.fillStyle = 'rgba(255,255,255,.25)';
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.arc(-170, -2 + i * 8, 1.8, 0, TAU);
    ctx.fill();
  }
  if (accent) {
    for (let i = 0; i < 3; i++) {
      const x = -84 + i * 22;
      const p = 0.5 + 0.5 * Math.sin(s.t * 7 - i * 1.1);
      glow(ctx, x, -2, 18 + p * 7, accent, 0.5);
      ctx.fillStyle = hexA(accent, 0.9);
      rr(ctx, x - 5, -14, 10, 24, 4);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.7)';
      rr(ctx, x - 3, -12, 6, 7, 2);
      ctx.fill();
    }
    glow(ctx, -158, 2, 20, accent, 0.55 + 0.25 * Math.sin(s.t * 5));
  }
  ctx.restore();
}

/* --------------------------------------------------------- DRAGON BREATH */
function dragonBreath(ctx: CanvasRenderingContext2D, s: ArtState) {
  ctx.save();
  ctx.translate(0, s.recoil * 14);
  // ---- shotgun body
  // stock
  ctx.fillStyle = metal(ctx, -250, -10, -170, 14, '#4a2c17', '#7d4d27', '#20130a');
  ctx.beginPath();
  ctx.moveTo(-250, -14);
  ctx.lineTo(-176, -12);
  ctx.lineTo(-176, 16);
  ctx.lineTo(-216, 30);
  ctx.lineTo(-250, 20);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.5)';
  ctx.stroke();
  // receiver
  ctx.fillStyle = metal(ctx, -178, -14, -80, 18, '#3a2716', '#6d4726', '#160d06');
  rr(ctx, -178, -16, 100, 34, 4);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.5)';
  ctx.stroke();
  // engraved scales on receiver
  ctx.strokeStyle = 'rgba(255,190,90,.22)';
  ctx.lineWidth = 1.4;
  for (let i = 0; i < 6; i++) {
    ctx.beginPath();
    ctx.arc(-170 + i * 14, 2, 7, 0, Math.PI);
    ctx.stroke();
  }
  // barrel shroud (heat)
  const heat = 0.4 + 0.3 * Math.sin(s.t * 3);
  ctx.fillStyle = metal(ctx, -190, -12, -70, 10, '#241a12', '#5c3c20', '#0d0906');
  rr(ctx, -190, -14, 122, 22, 6);
  ctx.fill();
  ctx.fillStyle = hexA('#ff6a1e', 0.10 * heat);
  rr(ctx, -190, -14, 122, 22, 6);
  ctx.fill();
  for (let i = 0; i < 7; i++) {
    ctx.fillStyle = 'rgba(0,0,0,.45)';
    ctx.beginPath();
    ctx.arc(-180 + i * 17, -2, 5, 0, TAU);
    ctx.fill();
  }
  // pump grip
  ctx.fillStyle = '#2a1c11';
  rr(ctx, -150, -20, 46, 30, 8);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,190,90,.25)';
  for (let i = 0; i < 5; i++) ctx.fillRect(-146 + i * 9, -18, 3, 26);
  // grip + trigger
  ctx.fillStyle = '#241708';
  ctx.beginPath();
  ctx.moveTo(-140, 18);
  ctx.lineTo(-114, 18);
  ctx.lineTo(-120, 54);
  ctx.lineTo(-142, 50);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#1a1008';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(-128, 30, 14, 0.1, Math.PI - 0.2);
  ctx.stroke();

  // ---- DRAGON HEAD muzzle
  ctx.save();
  ctx.translate(-70, -4);
  const jaw = 0.35 + s.fire * 0.5 + Math.sin(s.t * 2) * 0.06;
  // neck scales
  ctx.fillStyle = '#7b1f16';
  ctx.beginPath();
  ctx.moveTo(-26, -18);
  ctx.lineTo(0, -22);
  ctx.lineTo(0, 26);
  ctx.lineTo(-30, 22);
  ctx.closePath();
  ctx.fill();
  // upper skull
  const skull = ctx.createLinearGradient(0, -34, 0, 20);
  skull.addColorStop(0, '#d6552f');
  skull.addColorStop(0.45, '#a8321f');
  skull.addColorStop(1, '#5e1409');
  ctx.fillStyle = skull;
  ctx.beginPath();
  ctx.moveTo(-2, -26);
  ctx.quadraticCurveTo(26, -34, 46, -24);
  ctx.quadraticCurveTo(70, -18, 84, -6);
  ctx.quadraticCurveTo(86, 0, 82, 4);
  ctx.lineTo(30, 6);
  ctx.quadraticCurveTo(6, 8, -2, 4);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(40,8,4,.7)';
  ctx.lineWidth = 2;
  ctx.stroke();
  // brow ridge
  ctx.fillStyle = '#c1482a';
  ctx.beginPath();
  ctx.moveTo(28, -26);
  ctx.quadraticCurveTo(56, -30, 74, -16);
  ctx.lineTo(70, -10);
  ctx.quadraticCurveTo(52, -20, 28, -18);
  ctx.closePath();
  ctx.fill();
  // glowing eye
  const eyeP = 0.6 + 0.4 * Math.sin(s.t * 6);
  glow(ctx, 44, -16, 16 * eyeP + 5, '#ffb020', 0.9);
  ctx.fillStyle = '#ffdf7a';
  ctx.beginPath();
  ctx.ellipse(44, -16, 6.5, 4.6, -0.2, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#2a0c02';
  ctx.beginPath();
  ctx.ellipse(45.5, -16, 2.4, 4.2, -0.1, 0, TAU);
  ctx.fill();
  // horns (sweeping back)
  ctx.lineCap = 'round';
  for (const d of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(20, d * 4 - 22);
    ctx.quadraticCurveTo(-14, d * 8 - 40, -44, d * 6 - 34);
    ctx.strokeStyle = '#e8d3a8';
    ctx.lineWidth = 8 - (d < 0 ? 0 : 1.5);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.35)';
    ctx.lineWidth = 2.5;
    ctx.stroke();
  }
  // mane spikes
  ctx.fillStyle = '#f0dcb0';
  for (let i = 0; i < 5; i++) {
    const x = -20 + i * 16;
    ctx.beginPath();
    ctx.moveTo(x, -24 + i * 0.6);
    ctx.lineTo(x + 6, -42 - i);
    ctx.lineTo(x + 12, -23);
    ctx.closePath();
    ctx.fill();
  }
  // nostril + smoke
  ctx.fillStyle = '#2a0a04';
  ctx.beginPath();
  ctx.arc(76, -8, 3.2, 0, TAU);
  ctx.fill();
  // lower jaw
  ctx.save();
  ctx.translate(28, 6);
  ctx.rotate(jaw * 0.5);
  const jawG = ctx.createLinearGradient(0, 0, 0, 34);
  jawG.addColorStop(0, '#c94a28');
  jawG.addColorStop(1, '#5b1308');
  ctx.fillStyle = jawG;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(34, 2, 52, 10);
  ctx.quadraticCurveTo(40, 22, 6, 22);
  ctx.quadraticCurveTo(-6, 12, 0, 0);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(40,8,4,.7)';
  ctx.stroke();
  // mouth glow + teeth
  const fg = ctx.createRadialGradient(30, 4, 0, 30, 4, 40);
  fg.addColorStop(0, `rgba(255,255,220,${0.55 + s.fire * 0.45})`);
  fg.addColorStop(0.4, hexA('#ff9b1a', 0.5 + s.fire * 0.4));
  fg.addColorStop(1, 'rgba(255,60,0,0)');
  ctx.fillStyle = fg;
  ctx.beginPath();
  ctx.arc(24, 2, 42, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#fff6e2';
  for (let i = 0; i < 5; i++) {
    const tx = 8 + i * 10;
    ctx.beginPath();
    ctx.moveTo(tx, 0);
    ctx.lineTo(tx + 4, 8 + i * 0.4);
    ctx.lineTo(tx + 8, 0.5);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
  // upper teeth
  ctx.fillStyle = '#fff8ea';
  for (let i = 0; i < 5; i++) {
    const tx = 40 + i * 10;
    ctx.beginPath();
    ctx.moveTo(tx, 4);
    ctx.lineTo(tx + 4, 12 + i * 0.3);
    ctx.lineTo(tx + 8, 4);
    ctx.closePath();
    ctx.fill();
  }
  // chin whiskers
  ctx.strokeStyle = 'rgba(255,190,110,.5)';
  ctx.lineWidth = 1.6;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(74, 0);
    ctx.quadraticCurveTo(96, 4 + i * 8, 112, -2 + i * 12);
    ctx.stroke();
  }
  ctx.restore();
  ctx.restore();
}

/* --------------------------------------------------------- BERETTA 92 */
function beretta(ctx: CanvasRenderingContext2D, s: ArtState) {
  ctx.save();
  ctx.translate(0, s.recoil * 9);
  const slideOpen = s.fire > 0.05 ? 3.4 : 0;
  // frame / grip
  ctx.fillStyle = metal(ctx, -110, 6, -60, 62, '#2b3037', '#5a636e', '#0f1216');
  ctx.beginPath();
  ctx.moveTo(-106, 4);
  ctx.lineTo(-64, 4);
  ctx.lineTo(-58, 44);
  ctx.lineTo(-72, 62);
  ctx.lineTo(-100, 58);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.55)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = 'rgba(0,0,0,.35)';
  for (let i = 0; i < 6; i++) rr(ctx, -100 + i * 3, 16 + i * 6, 34 - i * 2, 3, 1.5), ctx.fill();
  // trigger guard
  ctx.strokeStyle = '#22272e';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(-72, 22, 14, 0.05, Math.PI - 0.15);
  ctx.stroke();
  // slide (Beretta open-top)
  const sg = ctx.createLinearGradient(0, -24, 0, 8);
  sg.addColorStop(0, '#9aa4b0');
  sg.addColorStop(0.4, '#5b636e');
  sg.addColorStop(1, '#191d22');
  ctx.fillStyle = sg;
  rr(ctx, -112, -24 + slideOpen, 118, 26, 4);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.5)';
  ctx.stroke();
  // open-top cut
  ctx.fillStyle = 'rgba(0,0,0,.55)';
  rr(ctx, -76, -19 + slideOpen, 46, 10, 3);
  ctx.fill();
  // slide serrations
  ctx.fillStyle = 'rgba(0,0,0,.4)';
  for (let i = 0; i < 6; i++) ctx.fillRect(-108 + i * 5, -20 + slideOpen, 2.5, 20);
  // barrel block visible in the open slide
  ctx.fillStyle = '#2f363e';
  rr(ctx, -70, -18 + slideOpen, 42, 7, 2);
  ctx.fill();
  // muzzle
  ctx.fillStyle = '#0c0e11';
  rr(ctx, -6 + slideOpen, -20 + slideOpen, 14, 20, 3);
  ctx.fill();
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.arc(4 + slideOpen, -10 + slideOpen, 3.6, 0, TAU);
  ctx.fill();
  // hammer
  ctx.fillStyle = '#8a939f';
  ctx.beginPath();
  ctx.arc(-114, -18 + slideOpen, 5, 0, TAU);
  ctx.fill();
  // front sight
  ctx.fillStyle = '#14181c';
  ctx.fillRect(0 + slideOpen, -28 + slideOpen, 7, 5);
  ctx.restore();
}

/* ------------------------------------------------------ PHASER (TNG) */
function phaser(ctx: CanvasRenderingContext2D, s: ArtState) {
  ctx.save();
  ctx.translate(0, s.recoil * 5);
  // body
  const bg = ctx.createLinearGradient(0, -26, 0, 40);
  bg.addColorStop(0, '#dfe4ea');
  bg.addColorStop(0.4, '#a9b2bd');
  bg.addColorStop(1, '#5b636e');
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.moveTo(-14, -24);
  ctx.quadraticCurveTo(-40, -28, -96, -22);
  ctx.quadraticCurveTo(-140, -18, -150, -2);
  ctx.quadraticCurveTo(-140, 14, -100, 16);
  ctx.lineTo(-52, 14);
  ctx.quadraticCurveTo(-24, 16, -14, 2);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(20,26,32,.55)';
  ctx.lineWidth = 2;
  ctx.stroke();
  // hand grip
  ctx.fillStyle = '#20262d';
  ctx.beginPath();
  ctx.moveTo(-84, 14);
  ctx.lineTo(-44, 12);
  ctx.lineTo(-50, 62);
  ctx.lineTo(-92, 60);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.5)';
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.08)';
  for (let i = 0; i < 5; i++) rr(ctx, -86 + i * 8, 22 + i * 3, 6, 30 - i * 2, 3), ctx.fill();
  // gold ventral accent
  ctx.fillStyle = '#c8a04a';
  ctx.beginPath();
  ctx.moveTo(-100, -20);
  ctx.lineTo(-40, -20);
  ctx.lineTo(-40, -14);
  ctx.lineTo(-100, -14);
  ctx.closePath();
  ctx.fill();
  // power setting dial
  ctx.fillStyle = '#1b2026';
  ctx.beginPath();
  ctx.arc(-118, -2, 11, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = '#c8a04a';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(-118, -2, 7, 0, TAU);
  ctx.stroke();
  ctx.strokeStyle = '#ff5b3a';
  ctx.beginPath();
  ctx.moveTo(-118, -2);
  ctx.lineTo(-118 + Math.cos(s.t * 1.5) * 7, -2 + Math.sin(s.t * 1.5) * 7);
  ctx.stroke();
  // emitter housing
  ctx.fillStyle = '#b7c0ca';
  ctx.beginPath();
  ctx.moveTo(-16, -20);
  ctx.lineTo(20, -14);
  ctx.lineTo(20, 8);
  ctx.lineTo(-16, 4);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#2b323a';
  rr(ctx, -8, -12, 26, 16, 3);
  ctx.fill();
  // emitter tip
  const charge = s.charge;
  ctx.fillStyle = '#8b949f';
  ctx.beginPath();
  ctx.moveTo(20, -12);
  ctx.lineTo(38, -6);
  ctx.lineTo(38, 4);
  ctx.lineTo(20, 8);
  ctx.closePath();
  ctx.fill();
  const p = 0.5 + 0.5 * Math.sin(s.t * 8);
  glow(ctx, 40, -1, 14 + 16 * charge + p * 4, '#ff6a3a', 0.5 + charge * 0.5 + (s.active ? 0.5 : 0));
  ctx.fillStyle = '#ffb27a';
  ctx.beginPath();
  ctx.arc(39, -1, 4 + charge * 3, 0, TAU);
  ctx.fill();
  ctx.restore();
}

/* ------------------------------------------------------------ SWORDS */
function energySword(ctx: CanvasRenderingContext2D, s: ArtState) {
  arm(ctx, -62, 6, 104, 0.22);
  // blades
  ctx.save();
  ctx.translate(-30, 0);
  const swing = s.recoil;
  ctx.rotate(-swing * 0.5);
  for (const d of [-1, 1]) {
    const g = ctx.createLinearGradient(0, d * 10, 150, d * 2);
    g.addColorStop(0, hexA('#9beaff', 0.55));
    g.addColorStop(0.5, hexA('#2ec8ff', 0.85));
    g.addColorStop(1, hexA('#e8feff', 0.95));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, d * 4);
    ctx.quadraticCurveTo(90, d * 26, 152, d * 6);
    ctx.quadraticCurveTo(90, d * 4, 0, d * -4);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = hexA('#ffffff', 0.85);
    ctx.beginPath();
    ctx.moveTo(6, 0);
    ctx.quadraticCurveTo(88, d * 12, 146, d * 2);
    ctx.quadraticCurveTo(88, d * 2, 6, 0);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
  // hilt
  ctx.fillStyle = '#1b2027';
  rr(ctx, -92, -12, 66, 24, 7);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.6)';
  ctx.stroke();
  ctx.fillStyle = '#39424d';
  for (let i = 0; i < 5; i++) rr(ctx, -86 + i * 12, -10, 5, 20, 2), ctx.fill();
  ctx.fillStyle = '#7de3ff';
  rr(ctx, -34, -15, 12, 30, 4);
  ctx.fill();
  glow(ctx, -28, 0, 26, '#4fd8ff', 0.8);
  glow(ctx, 60, 0, 60 + 20 * s.recoil, '#38c6ff', 0.45);
}

/* ------------------------------------- PREDATOR SHOULDER CASTER */
function plasmacaster(ctx: CanvasRenderingContext2D, s: ArtState) {
  const ch = s.charge;
  const fire = s.fire;
  const pCol = '#67e8f9'; // blue-white plasma cyan
  const pCore = '#e0faff';
  const laserRed = '#ff2a1f';
  const servoBob = Math.sin(s.t * 2.4) * 1.5;

  ctx.save();
  // Muzzle is at (0, 0). The shoulder armor base sits below & behind,
  // and the articulated servo arm lifts the cannon into firing position.

  /* ==================================================================
     1. TITANIUM SHOULDER ARMOR BASE & RAIL TRACK (stationary base)
     ================================================================== */
  ctx.save();
  ctx.translate(-142, 86);

  // Under-armor shadow pad
  ctx.fillStyle = '#0c0f14';
  ctx.beginPath();
  ctx.moveTo(-92, 18);
  ctx.quadraticCurveTo(-10, 2, 78, 16);
  ctx.lineTo(66, 36);
  ctx.quadraticCurveTo(-10, 24, -84, 34);
  ctx.closePath();
  ctx.fill();

  // Main curved titanium shoulder pauldron plate
  const pauldronG = ctx.createLinearGradient(-90, -14, 80, 32);
  pauldronG.addColorStop(0, '#7c8796');
  pauldronG.addColorStop(0.28, '#525b68');
  pauldronG.addColorStop(0.62, '#2d333c');
  pauldronG.addColorStop(1, '#14181e');
  ctx.fillStyle = pauldronG;
  ctx.beginPath();
  ctx.moveTo(-88, 12);
  ctx.quadraticCurveTo(-24, -10, 52, -4);
  ctx.lineTo(76, 12);
  ctx.lineTo(64, 30);
  ctx.quadraticCurveTo(-14, 18, -80, 28);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.78)';
  ctx.lineWidth = 2.2;
  ctx.stroke();

  // Top rectangular titanium rail-track housing (like photo 1 & 2)
  const railG = ctx.createLinearGradient(-64, -28, 56, 10);
  railG.addColorStop(0, '#9aa5b4');
  railG.addColorStop(0.35, '#596370');
  railG.addColorStop(0.75, '#2b313a');
  railG.addColorStop(1, '#12161b');
  ctx.fillStyle = railG;
  ctx.beginPath();
  ctx.moveTo(-62, -16);
  ctx.lineTo(48, -24);
  ctx.lineTo(62, -4);
  ctx.lineTo(48, 10);
  ctx.lineTo(-56, 16);
  ctx.lineTo(-70, 0);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.75)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Brushed titanium highlight & bevel lines on rail housing
  ctx.strokeStyle = 'rgba(230,242,255,.28)';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-58, -13);
  ctx.lineTo(45, -20);
  ctx.stroke();

  // Iconic engraved 'V' chevron & recessed panel on the side of the mount (photo 1)
  ctx.strokeStyle = 'rgba(15,19,25,.75)';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(14, -15);
  ctx.lineTo(25, -2);
  ctx.lineTo(36, -16);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(210,225,245,.2)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(15, -15);
  ctx.lineTo(25, -3);
  ctx.lineTo(35, -16);
  ctx.stroke();

  // Recessed track slot + hex bolts
  ctx.fillStyle = '#12161c';
  rr(ctx, -48, -9, 54, 10, 3);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.12)';
  ctx.lineWidth = 1;
  ctx.stroke();
  for (let i = 0; i < 4; i++) {
    ctx.fillStyle = '#7c8794';
    ctx.beginPath();
    ctx.arc(-40 + i * 14, -4, 2.3, 0, TAU);
    ctx.fill();
  }

  // Lower servo hinge clevis on the rail
  ctx.fillStyle = metal(ctx, -28, -26, 8, -6, '#3a424d', '#8792a1', '#151920');
  rr(ctx, -26, -26, 32, 16, 5);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.7)';
  ctx.lineWidth = 1.8;
  ctx.stroke();
  ctx.fillStyle = '#1b2028';
  ctx.beginPath();
  ctx.arc(-10, -18, 4.5, 0, TAU);
  ctx.fill();
  ctx.restore();

  /* ==================================================================
     2. ARTICULATED SERVO STALK & HYDRAULIC PISTONS
     ================================================================== */
  ctx.save();
  // Slight recoil kick + servo stabilization
  const stalkKick = s.recoil * 6;
  // Braided flexible power cables looping behind the servo arm
  ctx.lineCap = 'round';
  for (const [cOff, thick, col] of [
    [-14, 6, '#14181f'],
    [-14, 3.2, '#2e3540'],
    [-6, 5, '#0f1318'],
    [-6, 2.4, '#38414e'],
  ] as [number, number, string][]) {
    ctx.strokeStyle = col;
    ctx.lineWidth = thick;
    ctx.beginPath();
    ctx.moveTo(-162, 64);
    ctx.bezierCurveTo(-210 + cOff, 44, -222 + cOff, 4, -184 - stalkKick, -12 + servoBob);
    ctx.stroke();
  }

  // Main angled titanium servo strut (from base at (-152, 68) up to rear hub at (-166, -12))
  ctx.save();
  const bx = -152;
  const by = 66;
  const tx = -164 - stalkKick * 0.7;
  const ty = -10 + servoBob;
  // Hydraulic damper rod in front of the main strut
  ctx.strokeStyle = '#1b2028';
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(bx + 14, by - 4);
  ctx.lineTo(tx + 24, ty + 14);
  ctx.stroke();
  ctx.strokeStyle = '#b8c4d4';
  ctx.lineWidth = 3.2;
  ctx.beginPath();
  ctx.moveTo(bx + 14, by - 4);
  ctx.lineTo(tx + 19, ty + 28);
  ctx.stroke();

  // Main heavy servo arm body
  const armG = ctx.createLinearGradient(bx - 18, by, tx + 18, ty);
  armG.addColorStop(0, '#3a414c');
  armG.addColorStop(0.45, '#687382');
  armG.addColorStop(0.75, '#434b57');
  armG.addColorStop(1, '#1a1f27');
  ctx.fillStyle = armG;
  ctx.beginPath();
  ctx.moveTo(bx - 12, by);
  ctx.lineTo(bx + 10, by);
  ctx.lineTo(tx + 16, ty + 6);
  ctx.lineTo(tx - 10, ty + 6);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.75)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Machined lightening pockets / ribs on the servo arm
  ctx.strokeStyle = 'rgba(235,245,255,.22)';
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.moveTo(bx - 8, by - 4);
  ctx.lineTo(tx - 6, ty + 10);
  ctx.stroke();
  for (let i = 0; i < 3; i++) {
    const f = (i + 0.6) / 3.6;
    const px = bx + (tx - bx) * f;
    const py = by + (ty - by) * f;
    ctx.fillStyle = '#171b22';
    rr(ctx, px - 5, py - 4, 11, 8, 2.5);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.12)';
    ctx.lineWidth = 0.9;
    ctx.stroke();
  }

  // Upper servo knuckle / neck joint (with the glowing orange/amber indicator from photo 1)
  ctx.fillStyle = metal(ctx, tx - 14, ty - 6, tx + 26, ty + 18, '#3f4754', '#8d99a8', '#151920');
  rr(ctx, tx - 12, ty - 2, 34, 20, 6);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.72)';
  ctx.lineWidth = 1.8;
  ctx.stroke();
  // Glowing amber/orange servo power node (photo 1 detail!)
  const ambPulse = 0.65 + 0.35 * Math.sin(s.t * 5);
  glow(ctx, tx + 11, ty + 8, 12 + 4 * ambPulse, '#ff7a18', 0.65);
  ctx.fillStyle = '#ffb347';
  ctx.beginPath();
  ctx.arc(tx + 11, ty + 8, 3.2, 0, TAU);
  ctx.fill();
  ctx.restore();
  ctx.restore();

  /* ==================================================================
     3. CANNON ASSEMBLY (Translates with recoil & servo bob)
     ================================================================== */
  ctx.save();
  ctx.translate(-s.recoil * 15, servoBob - s.recoil * 2.5);

  /* ---- 3A. Rear Lower Grip / Trigger Strut under the receiver ---- */
  ctx.fillStyle = metal(ctx, -142, 10, -110, 48, '#2e343e', '#657080', '#12161c');
  ctx.beginPath();
  ctx.moveTo(-140, 12);
  ctx.lineTo(-114, 12);
  ctx.lineTo(-120, 44);
  ctx.lineTo(-136, 42);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.7)';
  ctx.lineWidth = 1.8;
  ctx.stroke();
  // Cross-slots on lower strut (visible in photo 3)
  ctx.fillStyle = '#14181f';
  for (let i = 0; i < 3; i++) {
    rr(ctx, -134, 17 + i * 7, 12, 3.5, 1);
    ctx.fill();
  }

  /* ---- 3B. Iconic Rear Circular Drum / Rotary Servo Capacitor Hub ---- */
  const hubX = -172;
  const hubY = -16;
  ctx.save();
  ctx.translate(hubX, hubY);
  // Outer titanium drum bezel
  const drumG = ctx.createRadialGradient(-8, -10, 4, 0, 0, 32);
  drumG.addColorStop(0, '#a6b1c0');
  drumG.addColorStop(0.45, '#586270');
  drumG.addColorStop(0.8, '#2a3038');
  drumG.addColorStop(1, '#11151a');
  ctx.fillStyle = drumG;
  ctx.beginPath();
  ctx.arc(0, 0, 30, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.8)';
  ctx.lineWidth = 2.4;
  ctx.stroke();

  // Notched perimeter gear teeth on the drum
  ctx.strokeStyle = 'rgba(20,24,30,.75)';
  ctx.lineWidth = 3;
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * TAU + s.t * 0.25;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * 24, Math.sin(a) * 24);
    ctx.lineTo(Math.cos(a) * 29, Math.sin(a) * 29);
    ctx.stroke();
  }

  // Recessed turbine well
  ctx.fillStyle = '#12161d';
  ctx.beginPath();
  ctx.arc(0, 0, 21, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = 'rgba(220,235,255,.25)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Plasma energy glowing inside the turbine slots as charge builds
  const coreGlow = 0.25 + ch * 0.75 + fire * 0.4;
  glow(ctx, 0, 0, 22 + 20 * ch, pCol, coreGlow * 0.75);

  // Rotating turbine spokes (8 radial fins, like photo 2 & 3)
  ctx.save();
  ctx.rotate(s.t * (1.2 + ch * 6));
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU;
    ctx.strokeStyle = hexA(pCol, 0.28 + ch * 0.65);
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a + 0.2) * 7, Math.sin(a + 0.2) * 7);
    ctx.lineTo(Math.cos(a + 0.2) * 19, Math.sin(a + 0.2) * 19);
    ctx.stroke();

    ctx.strokeStyle = '#7d8896';
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * 6, Math.sin(a) * 6);
    ctx.lineTo(Math.cos(a) * 20, Math.sin(a) * 20);
    ctx.stroke();
  }
  ctx.restore();

  // Center capacitor hub cap + glowing core jewel
  ctx.fillStyle = '#2d343e';
  ctx.beginPath();
  ctx.arc(0, 0, 8.5, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = '#9aa5b4';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = ch > 0.05 ? pCore : '#38bdf8';
  ctx.beginPath();
  ctx.arc(0, 0, 4 + ch * 2, 0, TAU);
  ctx.fill();
  ctx.restore();

  /* ---- 3C. Main Titanium Receiver Housing ---- */
  const recG = ctx.createLinearGradient(-156, -28, -50, 22);
  recG.addColorStop(0, '#96a1b0');
  recG.addColorStop(0.25, '#646f7e');
  recG.addColorStop(0.58, '#39404a');
  recG.addColorStop(1, '#181c22');
  ctx.fillStyle = recG;
  ctx.beginPath();
  ctx.moveTo(-158, -24);
  ctx.lineTo(-76, -24);
  ctx.lineTo(-62, -16);
  ctx.lineTo(-62, 14);
  ctx.lineTo(-102, 16);
  ctx.lineTo(-112, 22);
  ctx.lineTo(-148, 22);
  ctx.lineTo(-162, 8);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.78)';
  ctx.lineWidth = 2.2;
  ctx.stroke();

  // Receiver armor panel lines & rivets
  ctx.strokeStyle = 'rgba(235,245,255,.26)';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-154, -20);
  ctx.lineTo(-78, -20);
  ctx.lineTo(-66, -13);
  ctx.stroke();

  // Recessed side tech blocks on receiver
  ctx.fillStyle = '#1b2028';
  rr(ctx, -146, -12, 34, 14, 3);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.12)';
  ctx.lineWidth = 1;
  ctx.stroke();
  // Plasma conduit window in receiver
  ctx.fillStyle = hexA(pCol, 0.25 + ch * 0.75);
  rr(ctx, -142, -8, 26, 6, 2);
  ctx.fill();
  if (ch > 0.05) glow(ctx, -129, -5, 18 * ch, pCol, 0.55 * ch);

  /* ---- 3D. Top Auxiliary Laser-Sight / Rangefinder Tube (photo 2) ---- */
  ctx.fillStyle = metal(ctx, -112, -36, -54, -22, '#3d4550', '#8b96a6', '#14181e');
  rr(ctx, -110, -34, 52, 10, 4);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.7)';
  ctx.lineWidth = 1.6;
  ctx.stroke();
  // Mount brackets
  ctx.fillStyle = '#252b33';
  ctx.fillRect(-100, -25, 7, 4);
  ctx.fillRect(-74, -25, 7, 4);
  // Glowing red rangefinder lens
  glow(ctx, -56, -29, 10 + 8 * ch, laserRed, 0.6 + 0.4 * ch);
  ctx.fillStyle = '#ff4d3d';
  ctx.beginPath();
  ctx.arc(-57, -29, 3, 0, TAU);
  ctx.fill();

  /* ---- 3E. Forward Slotted Barrel Shroud (with iconic '////' slant vents) ---- */
  const shroudG = ctx.createLinearGradient(-96, -20, 6, 24);
  shroudG.addColorStop(0, '#a2adbc');
  shroudG.addColorStop(0.3, '#6c7786');
  shroudG.addColorStop(0.65, '#353c46');
  shroudG.addColorStop(1, '#151920');
  ctx.fillStyle = shroudG;
  ctx.beginPath();
  ctx.moveTo(-92, -17);
  ctx.lineTo(-18, -19);
  ctx.lineTo(-4, -12);
  ctx.lineTo(-2, 11);
  ctx.lineTo(-26, 22);
  ctx.lineTo(-98, 20);
  ctx.lineTo(-88, 2);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.8)';
  ctx.lineWidth = 2.2;
  ctx.stroke();

  // Upper longitudinal flute / groove on the forward shroud (photo 3)
  ctx.fillStyle = '#1c2129';
  ctx.beginPath();
  ctx.moveTo(-84, -12);
  ctx.lineTo(-22, -13);
  ctx.lineTo(-16, -6);
  ctx.lineTo(-82, -5);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(225,240,255,.22)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-84, -12);
  ctx.lineTo(-22, -13);
  ctx.stroke();
  // Plasma glow leaking through the upper flute during charge
  if (ch > 0.02 || fire > 0.05) {
    ctx.fillStyle = hexA(pCol, Math.min(1, ch * 0.85 + fire * 0.6));
    ctx.beginPath();
    ctx.moveTo(-82, -10);
    ctx.lineTo(-24, -11);
    ctx.lineTo(-20, -7);
    ctx.lineTo(-80, -7);
    ctx.closePath();
    ctx.fill();
  }

  // 5 Diagonal Slant Vents ('////' on lower-side of forward shroud, photo 3)
  for (let i = 0; i < 5; i++) {
    const vx = -82 + i * 11.5;
    ctx.fillStyle = '#0e1217';
    ctx.beginPath();
    ctx.moveTo(vx, 3);
    ctx.lineTo(vx + 6, 3);
    ctx.lineTo(vx + 2, 15);
    ctx.lineTo(vx - 4, 15);
    ctx.closePath();
    ctx.fill();
    // Blue-white plasma light glowing inside the slant vents as core charges
    const ventLit = clamp(ch * 1.3 - i * 0.08 + fire * 0.8, 0, 1);
    if (ventLit > 0.02) {
      ctx.fillStyle = hexA(i % 2 === 0 ? pCore : pCol, ventLit * 0.9);
      ctx.beginPath();
      ctx.moveTo(vx + 0.8, 4.2);
      ctx.lineTo(vx + 4.8, 4.2);
      ctx.lineTo(vx + 1.4, 13.8);
      ctx.lineTo(vx - 2.6, 13.8);
      ctx.closePath();
      ctx.fill();
      glow(ctx, vx + 1, 9, 11 * ventLit, pCol, 0.35 * ventLit);
    }
  }

  /* ---- 3F. Cylindrical Beveled Muzzle Barrel & 3 Red Laser Diodes ---- */
  // Inner cylindrical titanium barrel protruding to (0, 0)
  const barG = ctx.createLinearGradient(0, -11, 0, 11);
  barG.addColorStop(0, '#c4cfde');
  barG.addColorStop(0.35, '#788494');
  barG.addColorStop(0.7, '#333a44');
  barG.addColorStop(1, '#12161c');
  ctx.fillStyle = barG;
  ctx.beginPath();
  ctx.moveTo(-12, -10);
  ctx.lineTo(8, -10);
  ctx.lineTo(4, 10);
  ctx.lineTo(-12, 10);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.75)';
  ctx.lineWidth = 1.8;
  ctx.stroke();

  // Dark bore aperture at the muzzle tip
  ctx.fillStyle = '#070a0f';
  ctx.beginPath();
  ctx.ellipse(5, 0, 4.2, 8.2, 0.15, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = 'rgba(200,220,245,.35)';
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // Three Red Targeting Laser Diodes around the muzzle bezel (triangle formation)
  const diodes: [number, number][] = [
    [-4, -14], // top vertex
    [-6, 11],  // bottom-left vertex
    [3, 8],    // bottom-right vertex
  ];
  for (const [dx, dy] of diodes) {
    ctx.fillStyle = '#1d222a';
    ctx.beginPath();
    ctx.arc(dx, dy, 3.2, 0, TAU);
    ctx.fill();
    const lGlow = 0.55 + 0.45 * ch;
    glow(ctx, dx + 1, dy, 9 + 10 * ch, laserRed, lGlow);
    ctx.fillStyle = '#ff3b2f';
    ctx.beginPath();
    ctx.arc(dx + 0.6, dy, 1.9, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(dx + 0.8, dy - 0.3, 0.8, 0, TAU);
    ctx.fill();
  }

  // Blue-white Plasma Core condensing at the muzzle mouth when charging / firing
  const mEnergy = Math.min(1, ch + fire * 0.9);
  if (mEnergy > 0.02) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    glow(ctx, 6, 0, 26 + 44 * mEnergy, pCol, 0.55 + 0.45 * mEnergy);
    glow(ctx, 6, 0, 12 + 22 * mEnergy, '#ffffff', 0.8 * mEnergy);

    // 4-point star flare condensing at the barrel tip
    const starL = (14 + 34 * mEnergy) * (0.85 + 0.15 * Math.sin(s.t * 28));
    ctx.fillStyle = hexA('#ffffff', 0.9 * mEnergy);
    for (const [rx, ry] of [
      [starL * 1.3, 2.4],
      [2.4, starL * 0.85],
    ] as [number, number][]) {
      ctx.beginPath();
      ctx.ellipse(6, 0, rx, ry, 0, 0, TAU);
      ctx.fill();
    }

    // Crackling blue-white plasma arcs around the muzzle lip
    ctx.strokeStyle = hexA(pCore, 0.85 * mEnergy);
    ctx.lineWidth = 1.6;
    for (let i = 0; i < 3; i++) {
      const a = s.t * 16 + (i * TAU) / 3;
      ctx.beginPath();
      ctx.moveTo(5, 0);
      ctx.lineTo(6 + Math.cos(a) * (8 + 10 * mEnergy), Math.sin(a) * (8 + 10 * mEnergy));
      ctx.lineTo(8 + Math.cos(a + 0.5) * (14 + 14 * mEnergy), Math.sin(a + 0.5) * (12 + 12 * mEnergy));
      ctx.stroke();
    }
    ctx.restore();
  }

  ctx.restore(); // end cannon assembly
  ctx.restore();
}

/* ------------------------------------------------------ PROTON WAND */
function protonWand(ctx: CanvasRenderingContext2D, s: ArtState) {
  ctx.save();
  ctx.translate(0, s.recoil * 6);
  arm(ctx, -60, 6, 110, 0.18);
  // wand body
  const g = ctx.createLinearGradient(0, -16, 0, 20);
  g.addColorStop(0, '#8b8f96');
  g.addColorStop(0.4, '#3c4048');
  g.addColorStop(1, '#14171b');
  ctx.fillStyle = g;
  rr(ctx, -120, -14, 118, 28, 8);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.55)';
  ctx.lineWidth = 2;
  ctx.stroke();
  // ribs
  ctx.fillStyle = 'rgba(0,0,0,.35)';
  for (let i = 0; i < 7; i++) ctx.fillRect(-112 + i * 15, -14, 4, 28);
  // clamp lever
  ctx.fillStyle = '#c8b273';
  rr(ctx, -70, -24, 34, 12, 4);
  ctx.fill();
  // barrel
  ctx.fillStyle = '#2b2f36';
  rr(ctx, -60, -9, 60, 18, 6);
  ctx.fill();
  // emitter tip
  ctx.fillStyle = '#575d66';
  rr(ctx, -8, -12, 18, 24, 6);
  ctx.fill();
  const a = s.active ? 1 : 0.35 + 0.2 * Math.sin(s.t * 4);
  glow(ctx, 12, 0, 22 + 12 * a, '#ff8a1e', a);
  ctx.fillStyle = '#ffd9a0';
  ctx.beginPath();
  ctx.arc(11, 0, 5 + 3 * a, 0, TAU);
  ctx.fill();
  // red indicator
  ctx.fillStyle = s.active ? '#ff2b2b' : '#5a1414';
  ctx.beginPath();
  ctx.arc(-100, 0, 5, 0, TAU);
  ctx.fill();
  if (s.active) glow(ctx, -100, 0, 14, '#ff3b3b', 0.8);
  ctx.restore();
}

/* ---------------------------------------------------- TRIPOD HEAT RAY */
function tripodRay(ctx: CanvasRenderingContext2D, s: ArtState) {
  ctx.save();
  ctx.translate(0, s.recoil * 4);
  // curved tentacle arm
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-230, 90);
  ctx.quadraticCurveTo(-180, 20, -110, -6);
  ctx.strokeStyle = '#20242b';
  ctx.lineWidth = 34;
  ctx.stroke();
  ctx.strokeStyle = '#3c434d';
  ctx.lineWidth = 24;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,.12)';
  ctx.lineWidth = 6;
  ctx.stroke();
  // segment rings
  for (let i = 0; i < 8; i++) {
    const t = i / 7;
    const x = -228 + t * 122;
    const y = 88 - t * 96;
    ctx.strokeStyle = 'rgba(10,12,15,.6)';
    ctx.lineWidth = 26;
    ctx.beginPath();
    ctx.arc(x, y, 13, 0, TAU);
    ctx.stroke();
  }
  // cobra head
  const hg = ctx.createLinearGradient(-110, -60, 40, 40);
  hg.addColorStop(0, '#586270');
  hg.addColorStop(0.5, '#2c323b');
  hg.addColorStop(1, '#101317');
  ctx.fillStyle = hg;
  ctx.beginPath();
  ctx.moveTo(-110, -26);
  ctx.quadraticCurveTo(-40, -46, 26, -18);
  ctx.quadraticCurveTo(44, -8, 40, 4);
  ctx.quadraticCurveTo(10, 22, -60, 18);
  ctx.quadraticCurveTo(-104, 14, -110, -26);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.55)';
  ctx.lineWidth = 2.5;
  ctx.stroke();
  // hood plates
  ctx.strokeStyle = 'rgba(150,190,220,.18)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.moveTo(-96 + i * 22, -34);
    ctx.quadraticCurveTo(-80 + i * 22, -6, -96 + i * 22, 16);
    ctx.stroke();
  }
  // emitter aperture
  const a = s.active ? 1 : s.charge;
  glow(ctx, 34, -6, 30 + 40 * a, '#dff3ff', 0.4 + a * 0.6);
  ctx.fillStyle = '#0b0e12';
  ctx.beginPath();
  ctx.ellipse(30, -6, 16, 11, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = hexA('#cfeaff', 0.5 + a * 0.5);
  ctx.beginPath();
  ctx.ellipse(32, -6, 10, 6.5, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.ellipse(34, -6, 4 + 4 * a, 2.6 + 2.6 * a, 0, 0, TAU);
  ctx.fill();
  // red sensor eye
  ctx.fillStyle = hexA('#ff3a2a', 0.6 + 0.4 * Math.sin(s.t * 5));
  ctx.beginPath();
  ctx.arc(-20, -22, 5, 0, TAU);
  ctx.fill();
  glow(ctx, -20, -22, 14, '#ff2a1a', 0.6);
  ctx.restore();
}

/* --------------------------------------------------- IRON MAN PALM */
function repulsorHand(ctx: CanvasRenderingContext2D, s: ArtState) {
  ctx.save();
  ctx.translate(0, s.recoil * 8);
  arm(ctx, -46, 10, 120, 0.1);
  // gauntlet forearm
  const fg = ctx.createLinearGradient(0, -34, 0, 40);
  fg.addColorStop(0, '#c8202a');
  fg.addColorStop(0.5, '#8e1219');
  fg.addColorStop(1, '#4a080c');
  ctx.fillStyle = fg;
  rr(ctx, -150, -30, 108, 62, 18);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.5)';
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.fillStyle = hexA('#ffd36a', 0.9);
  rr(ctx, -140, -22, 20, 46, 8);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.15)';
  rr(ctx, -114, -24, 40, 12, 6);
  ctx.fill();
  // palm plate
  ctx.fillStyle = '#b31a22';
  rr(ctx, -60, -28, 60, 58, 16);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.5)';
  ctx.stroke();
  // knuckle row
  ctx.fillStyle = '#8e1219';
  for (let i = 0; i < 4; i++) {
    rr(ctx, -54 + i * 15, -44, 12, 18, 5);
    ctx.fill();
    ctx.fillStyle = hexA('#ffd36a', 0.5 + 0.5 * s.charge);
    rr(ctx, -51 + i * 15, -40, 6, 5, 2);
    ctx.fill();
    ctx.fillStyle = '#8e1219';
  }
  // repulsor
  const c = s.active ? 1 : s.charge;
  glow(ctx, -28, 0, 40 + 30 * c, '#bfe9ff', 0.35 + 0.65 * c);
  ctx.fillStyle = '#e9f6ff';
  ctx.beginPath();
  ctx.arc(-28, 0, 15, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#9fd8f5';
  ctx.beginPath();
  ctx.arc(-28, 0, 10, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(-28, 0, 4 + 4 * c, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.5)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(-28, 0, 19 + Math.sin(s.t * 4) * 2, 0, TAU);
  ctx.stroke();
  ctx.restore();
}

/* -------------------------------------------------------- IDENTITY DISC */
function identityDisc(ctx: CanvasRenderingContext2D, s: ArtState) {
  ctx.save();
  ctx.translate(-16, 0);
  const spin = s.t * 3;
  ctx.save();
  ctx.scale(1, 0.55);
  ctx.rotate(spin);
  // outer shell
  const g = ctx.createLinearGradient(-70, -70, 70, 70);
  g.addColorStop(0, '#e9edf2');
  g.addColorStop(0.5, '#9aa4b0');
  g.addColorStop(1, '#3d444d');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, 64, 0, TAU);
  ctx.fill();
  // inner core
  ctx.fillStyle = '#0d1c26';
  ctx.beginPath();
  ctx.arc(0, 0, 42, 0, TAU);
  ctx.fill();
  // energy ring
  ctx.strokeStyle = '#3ff2ff';
  ctx.lineWidth = 5;
  ctx.shadowColor = '#3ff2ff';
  ctx.shadowBlur = 22;
  ctx.beginPath();
  ctx.arc(0, 0, 40, 0, TAU);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, 52, 0, TAU);
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = hexA('#8ff8ff', 0.8);
  ctx.stroke();
  // spinning inner blades
  ctx.strokeStyle = hexA('#eafeff', 0.9);
  ctx.lineWidth = 6;
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * TAU;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * 8, Math.sin(a) * 8);
    ctx.lineTo(Math.cos(a) * 34, Math.sin(a) * 34);
    ctx.stroke();
  }
  ctx.shadowBlur = 0;
  ctx.restore();
  glow(ctx, 0, 0, 76, '#25d8ff', 0.5);
  ctx.restore();
}

/* ============================================================ LEGENDARY
   Three rare sci-fi weapons: gravitational, electrical, hypervelocity */

/* ------------------------------------------------- SINGULARITY CANNON */
function singularityCannon(ctx: CanvasRenderingContext2D, s: ArtState) {
  const ac = '#a855f7';
  const ac2 = '#f472f0';
  ctx.save();
  ctx.translate(0, s.recoil * 18);

  /* anti-grav fins, hovering on their own field */
  for (const [ox, oy, rot, ph] of [
    [-206, -48, -0.5, 0],
    [-218, 36, 0.42, 2.1],
    [-188, 66, 0.92, 4.2],
  ] as number[][]) {
    const hov = Math.sin(s.t * 2.2 + ph) * 4;
    ctx.save();
    ctx.translate(ox, oy + hov);
    ctx.rotate(rot);
    const g = ctx.createLinearGradient(-26, -14, 26, 14);
    g.addColorStop(0, '#4a3570');
    g.addColorStop(0.5, '#221838');
    g.addColorStop(1, '#0a0612');
    ctx.fillStyle = g;
    rr(ctx, -26, -13, 52, 26, 9);
    ctx.fill();
    ctx.strokeStyle = hexA(ac, 0.55);
    ctx.lineWidth = 1.6;
    ctx.stroke();
    ctx.fillStyle = hexA(ac, 0.8);
    rr(ctx, -16, -2.5, 32, 5, 2.5);
    ctx.fill();
    glow(ctx, 0, 0, 22, ac, 0.35);
    ctx.restore();
  }

  /* spine / stock */
  ctx.fillStyle = metal(ctx, -252, -20, -150, 20, '#241d33', '#4a3a66', '#0a0710');
  ctx.beginPath();
  ctx.moveTo(-252, -26);
  ctx.lineTo(-158, -22);
  ctx.lineTo(-158, 22);
  ctx.lineTo(-206, 42);
  ctx.lineTo(-252, 30);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.6)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = hexA(ac, 0.85);
  rr(ctx, -246, -10, 62, 5, 2.5);
  ctx.fill();

  /* receiver */
  ctx.fillStyle = metal(ctx, -170, -22, -60, 24, '#221a30', '#413259', '#08060d');
  rr(ctx, -170, -24, 112, 46, 9);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.6)';
  ctx.lineWidth = 2;
  ctx.stroke();
  bevel(ctx, -170, -24, 112, 46, 9);
  ctx.fillStyle = 'rgba(0,0,0,.4)';
  for (let i = 0; i < 7; i++) rr(ctx, -164 + i * 8, -18, 3.5, 10, 1.7), ctx.fill();

  /* singularity reactor */
  ctx.save();
  ctx.translate(-112, 0);
  for (const [rx, ry, sp, tilt, col, lw] of [
    [36, 0.28, 1.5, 0, ac, 4.5],
    [30, 0.24, -1.1, 0.6, ac2, 3],
  ] as [number, number, number, number, string, number][]) {
    ctx.save();
    ctx.rotate(s.t * sp + tilt);
    ctx.strokeStyle = hexA(col, 0.85);
    ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.ellipse(0, 0, rx, ry * 30, 0, 0, TAU);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.65)';
    ctx.lineWidth = lw * 0.35;
    ctx.stroke();
    ctx.restore();
  }
  const chg = s.charge;
  ctx.strokeStyle = '#2a2040';
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.arc(0, 0, 25, 0, TAU);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,.12)';
  ctx.lineWidth = 2;
  ctx.stroke();
  glow(ctx, 0, 0, 48 + 24 * chg, ac, 0.5 + 0.4 * chg);
  const eg = ctx.createRadialGradient(0, 0, 2, 0, 0, 18 + chg * 4);
  eg.addColorStop(0, '#020008');
  eg.addColorStop(0.85, '#05010e');
  eg.addColorStop(1, 'rgba(12,4,26,.2)');
  ctx.fillStyle = eg;
  ctx.beginPath();
  ctx.arc(0, 0, 18 + chg * 4, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.8)';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.arc(0, 0, 19 + chg * 4, 0, TAU);
  ctx.stroke();
  ctx.save();
  ctx.scale(1, 0.3);
  ctx.rotate(s.t * 3);
  const ag = ctx.createRadialGradient(0, 0, 18, 0, 0, 40);
  ag.addColorStop(0, 'rgba(255,255,255,.7)');
  ag.addColorStop(0.35, hexA(ac, 0.55));
  ag.addColorStop(1, hexA(ac2, 0));
  ctx.fillStyle = ag;
  ctx.beginPath();
  ctx.arc(0, 0, 40, 0, TAU);
  ctx.arc(0, 0, 18, 0, TAU, true);
  ctx.fill();
  ctx.restore();
  ctx.restore();

  /* barrel shroud with conduits */
  ctx.fillStyle = metal(ctx, -62, -14, 0, 8, '#1e1729', '#3b2d52', '#070510');
  ctx.beginPath();
  ctx.moveTo(-62, -21);
  ctx.lineTo(-14, -17);
  ctx.lineTo(-8, -6);
  ctx.lineTo(-8, 8);
  ctx.lineTo(-14, 19);
  ctx.lineTo(-62, 23);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.6)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.lineCap = 'round';
  ctx.strokeStyle = hexA(ac, 0.85);
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-56, -13);
  ctx.lineTo(-16, -10);
  ctx.moveTo(-56, 15);
  ctx.lineTo(-16, 12);
  ctx.stroke();

  /* magnetic clamps */
  for (let i = 0; i < 3; i++) {
    const x = -50 + i * 15;
    const p = 0.5 + 0.5 * Math.sin(s.t * 5 - i * 0.9);
    ctx.fillStyle = '#2f2544';
    rr(ctx, x - 4.5, -23, 9, 46, 4);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.55)';
    ctx.lineWidth = 1.4;
    ctx.stroke();
    glow(ctx, x, 0, 15 + p * 5, ac, 0.45);
    ctx.fillStyle = hexA(ac, 0.9);
    rr(ctx, x - 1.8, -15, 3.6, 30, 1.8);
    ctx.fill();
  }

  /* muzzle containment ring + event horizon */
  ctx.save();
  ctx.translate(-2, 0);
  const ringRot = s.t * 0.85;
  ctx.save();
  ctx.rotate(ringRot);
  ctx.strokeStyle = hexA(ac, 0.5);
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.ellipse(0, 0, 14, 43, 0, 0, TAU);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,.35)';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.ellipse(0, 0, 15, 44, 0, 0, TAU);
  ctx.stroke();
  ctx.restore();
  for (let i = 0; i < 6; i++) {
    const a = ringRot + (i / 6) * TAU;
    const x = Math.cos(a) * 9;
    const y = Math.sin(a) * 41;
    ctx.fillStyle = '#3d3157';
    rr(ctx, x - 5, y - 6, 10, 12, 3);
    ctx.fill();
    ctx.fillStyle = hexA(ac2, 0.95);
    ctx.fillRect(x - 2, y - 2, 4, 4);
  }
  glow(ctx, 4, 0, 28 + 34 * s.charge, ac, 0.45 + 0.45 * s.charge);
  const mz = ctx.createRadialGradient(4, 0, 1, 4, 0, 10 + s.charge * 7);
  mz.addColorStop(0, '#010005');
  mz.addColorStop(0.86, '#04010b');
  mz.addColorStop(1, 'rgba(10,3,24,.3)');
  ctx.fillStyle = mz;
  ctx.beginPath();
  ctx.arc(4, 0, 10 + s.charge * 7, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.85)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(4, 0, 11 + s.charge * 7, 0, TAU);
  ctx.stroke();
  ctx.restore();

  /* orbiting shard servitors */
  for (let i = 0; i < 3; i++) {
    const a = s.t * 2.6 + (i / 3) * TAU;
    ctx.save();
    ctx.translate(-2 + Math.cos(a) * 30, Math.sin(a) * 48);
    ctx.rotate(a * 2);
    ctx.fillStyle = hexA(ac2, 0.9);
    ctx.beginPath();
    ctx.moveTo(0, -6);
    ctx.lineTo(4.5, 0);
    ctx.lineTo(0, 6);
    ctx.lineTo(-4.5, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  /* grip */
  ctx.fillStyle = metal(ctx, -150, 20, -120, 60, '#2a2039', '#4a3a66', '#0a0710');
  ctx.beginPath();
  ctx.moveTo(-148, 20);
  ctx.lineTo(-124, 20);
  ctx.lineTo(-130, 60);
  ctx.lineTo(-150, 56);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.5)';
  ctx.lineWidth = 1.6;
  ctx.stroke();
  ctx.restore();
}

/* ----------------------------------------------- TESLA ARC PROJECTOR */
function teslaCoil(ctx: CanvasRenderingContext2D, s: ArtState) {
  const ac = '#5ee7ff';
  ctx.save();
  ctx.translate(0, s.recoil * 12);

  ctx.fillStyle = metal(ctx, -212, -12, -150, 14, '#2b3038', '#5a636e', '#0d1014');
  rr(ctx, -214, -17, 64, 36, 9);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.55)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = 'rgba(0,0,0,.35)';
  rr(ctx, -206, -4, 48, 9, 4);
  ctx.fill();

  ctx.fillStyle = metal(ctx, -180, -18, -40, 18, '#333a44', '#6d7784', '#111519');
  rr(ctx, -180, -21, 140, 42, 7);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.55)';
  ctx.lineWidth = 2;
  ctx.stroke();
  bevel(ctx, -180, -21, 140, 42, 7);
  ctx.fillStyle = 'rgba(0,0,0,.4)';
  for (let i = 0; i < 5; i++) rr(ctx, -172 + i * 8, -14, 4, 12, 2), ctx.fill();

  /* capacitor bank */
  ctx.fillStyle = '#20262d';
  rr(ctx, -152, 19, 70, 28, 6);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.5)';
  ctx.lineWidth = 1.6;
  ctx.stroke();
  const bankP = s.charge > 0.02 ? s.charge : 0.3 + 0.18 * Math.sin(s.t * 3);
  for (let i = 0; i < 5; i++) {
    const lit = clamp(bankP * 5 - i * 0.7, 0, 1);
    ctx.fillStyle = hexA(ac, 0.15 + lit * 0.8);
    rr(ctx, -146 + i * 12.5, 23, 7.5, 20, 2);
    ctx.fill();
    if (lit > 0.1) glow(ctx, -142 + i * 12.5, 33, 11 * lit, ac, 0.4 * lit);
  }

  /* wound accelerator coils */
  for (let i = 0; i < 5; i++) {
    const x = -134 + i * 25;
    const p = 0.5 + 0.5 * Math.sin(s.t * 9 - i * 1.2);
    const cg = ctx.createLinearGradient(x, -17, x, 17);
    cg.addColorStop(0, '#e0aa62');
    cg.addColorStop(0.4, '#a9762f');
    cg.addColorStop(0.72, '#6d4a15');
    cg.addColorStop(1, '#38240a');
    ctx.fillStyle = cg;
    rr(ctx, x - 8, -18, 17, 36, 5);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,222,168,.42)';
    ctx.lineWidth = 1;
    for (let k = 0; k < 9; k++) {
      ctx.beginPath();
      ctx.moveTo(x - 7, -16 + k * 3.9);
      ctx.lineTo(x + 8, -18 + k * 3.9);
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(0,0,0,.5)';
    ctx.lineWidth = 1.5;
    rr(ctx, x - 8, -18, 17, 36, 5);
    ctx.stroke();
    glow(ctx, x, 0, 19 + p * 9, ac, 0.28 + p * 0.4);
    ctx.strokeStyle = hexA(ac, 0.35 + p * 0.5);
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(x + 0.5, 0, 11 + p * 2, 0, TAU);
    ctx.stroke();
  }

  /* glass plasma conduit */
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const tubeG = ctx.createLinearGradient(-40, 0, 40, 0);
  tubeG.addColorStop(0, hexA(ac, 0.12));
  tubeG.addColorStop(0.5, hexA('#ffffff', 0.4 + 0.28 * Math.sin(s.t * 12)));
  tubeG.addColorStop(1, hexA(ac, 0.12));
  ctx.fillStyle = tubeG;
  rr(ctx, -38, -7, 78, 14, 7);
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle = 'rgba(200,240,255,.3)';
  ctx.lineWidth = 1.2;
  rr(ctx, -38, -7, 78, 14, 7);
  ctx.stroke();

  /* muzzle housing + electrodes */
  ctx.fillStyle = metal(ctx, -4, -12, 44, 12, '#2b323a', '#5a636e', '#0d1014');
  rr(ctx, -46, -13, 50, 26, 6);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.55)';
  ctx.lineWidth = 1.8;
  ctx.stroke();
  const el: [number, number][] = [
    [48, -19],
    [48, 19],
    [58, 0],
  ];
  for (const [ex, ey] of el) {
    ctx.fillStyle = '#98a2ae';
    ctx.beginPath();
    ctx.moveTo(ex - 15, ey - 5.5);
    ctx.lineTo(ex + 9, ey - 2.8);
    ctx.lineTo(ex + 9, ey + 2.8);
    ctx.lineTo(ex - 15, ey + 5.5);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.45)';
    ctx.fillRect(ex - 14, ey - 4, 20, 1.4);
  }
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const arcOn = 0.35 + s.charge * 0.65;
  for (let i = 0; i < 3; i++) {
    const a = el[i];
    const b = el[(i + 1) % 3];
    ctx.beginPath();
    ctx.moveTo(a[0] + 4, a[1]);
    for (let k = 1; k <= 4; k++) {
      const f = k / 4;
      ctx.lineTo(a[0] + 4 + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f + rand(-6, 6));
    }
    ctx.strokeStyle = hexA(ac, 0.9 * arcOn);
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.9)';
    ctx.lineWidth = 1.1;
    ctx.stroke();
  }
  ctx.restore();
  const tip = 0.4 + 0.3 * Math.sin(s.t * 11) + s.charge;
  glow(ctx, 62, 0, 18 + 26 * s.charge, ac, 0.35 + 0.55 * Math.min(1, tip));
  ctx.fillStyle = '#eafeff';
  ctx.beginPath();
  ctx.arc(60, 0, 2.5 + s.charge * 3, 0, TAU);
  ctx.fill();

  /* grip + trigger */
  ctx.fillStyle = metal(ctx, -120, 18, -96, 58, '#262b32', '#4e5761', '#0d1013');
  ctx.beginPath();
  ctx.moveTo(-118, 17);
  ctx.lineTo(-94, 17);
  ctx.lineTo(-100, 56);
  ctx.lineTo(-120, 52);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.5)';
  ctx.lineWidth = 1.6;
  ctx.stroke();
  ctx.strokeStyle = '#20252b';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(-104, 30, 14, 0.1, Math.PI - 0.2);
  ctx.stroke();
  ctx.restore();
}

/* ----------------------------------------------------- RAILGUN MK-VII */
function railgun(ctx: CanvasRenderingContext2D, s: ArtState) {
  const ac = '#7dd3fc';
  ctx.save();
  ctx.translate(0, s.recoil * 20);

  /* capacitor bank */
  ctx.fillStyle = metal(ctx, -302, -22, -230, 22, '#22262e', '#4a5260', '#0b0e12');
  rr(ctx, -302, -27, 80, 54, 9);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.6)';
  ctx.lineWidth = 2;
  ctx.stroke();
  bevel(ctx, -302, -27, 80, 54, 9);
  const capChg = Math.max(s.charge, Math.min(1, s.recoil * 0.7));
  for (let i = 0; i < 4; i++) {
    const lit = clamp(capChg * 4 - i * 0.9, 0, 1);
    ctx.fillStyle = hexA(ac, 0.14 + lit * 0.82);
    rr(ctx, -294 + i * 17.5, -17, 12, 34, 3);
    ctx.fill();
    if (lit > 0.08) glow(ctx, -288 + i * 17.5, 0, 17 * lit, ac, 0.45 * lit);
  }
  ctx.fillStyle = '#1a1f26';
  rr(ctx, -306, -10, 12, 20, 4);
  ctx.fill();

  /* receiver */
  ctx.fillStyle = metal(ctx, -228, -20, -140, 20, '#2b323b', '#5c6572', '#0e1116');
  rr(ctx, -228, -23, 94, 46, 7);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.55)';
  ctx.lineWidth = 2;
  ctx.stroke();
  bevel(ctx, -228, -23, 94, 46, 7);
  ctx.fillStyle = '#232830';
  for (let i = 0; i < 7; i++) {
    rr(ctx, -221 + i * 11.5, -36, 7, 15, 2.5);
    ctx.fill();
  }
  ctx.strokeStyle = 'rgba(255,255,255,.1)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 7; i++) {
    ctx.beginPath();
    ctx.moveTo(-221 + i * 11.5, -36);
    ctx.lineTo(-221 + i * 11.5, -22);
    ctx.stroke();
  }
  ctx.fillStyle = hexA(ac, 0.16 + capChg * 0.8);
  rr(ctx, -220, -7, 78, 4.5, 2.2);
  ctx.fill();
  if (capChg > 0.05) glow(ctx, -181, -5, 24 * capChg, ac, 0.5 * capChg);

  /* rail housing */
  ctx.fillStyle = metal(ctx, -140, -14, -10, 12, '#1d222a', '#3f4855', '#090c10');
  ctx.beginPath();
  ctx.moveTo(-140, -21);
  ctx.lineTo(-16, -17);
  ctx.lineTo(-8, -5);
  ctx.lineTo(-8, 7);
  ctx.lineTo(-16, 19);
  ctx.lineTo(-140, 23);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.6)';
  ctx.lineWidth = 2;
  ctx.stroke();

  /* twin exposed rails */
  const railG = ctx.createLinearGradient(0, -10, 0, 10);
  railG.addColorStop(0, '#e6ecf3');
  railG.addColorStop(0.34, '#9aa4b0');
  railG.addColorStop(0.7, '#5a636e');
  railG.addColorStop(1, '#20252c');
  ctx.fillStyle = railG;
  rr(ctx, -134, -10.5, 128, 6.6, 2);
  ctx.fill();
  rr(ctx, -134, 3.9, 128, 6.6, 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.5)';
  ctx.fillRect(-134, -9.8, 128, 1.2);
  ctx.fillRect(-134, 4.6, 128, 1.2);
  for (let i = 0; i < 6; i++) {
    const x = -128 + i * 21;
    ctx.fillStyle = '#2c333c';
    rr(ctx, x, -13, 9, 26, 3);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.5)';
    ctx.lineWidth = 1.3;
    ctx.stroke();
  }

  /* energy pulse racing down the rails */
  const travel = (s.t * 1.7) % 1;
  ctx.globalCompositeOperation = 'lighter';
  for (const yy of [-7.2, 7.2]) {
    const tg = ctx.createLinearGradient(-134, 0, -6, 0);
    tg.addColorStop(0, hexA(ac, 0));
    tg.addColorStop(clamp(travel - 0.2, 0, 1), hexA(ac, 0));
    tg.addColorStop(clamp(travel, 0.01, 0.99), hexA('#ffffff', 0.5 + capChg * 0.45));
    tg.addColorStop(1, hexA(ac, 0.22));
    ctx.fillStyle = tg;
    ctx.fillRect(-134, yy - 2.2, 128, 4.4);
  }
  ctx.globalCompositeOperation = 'source-over';

  /* lightning jumping the rail gap */
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 6; i++) {
    const x = -128 + ((s.t * 460 + i * 27) % 120);
    ctx.beginPath();
    ctx.moveTo(x, -4);
    ctx.lineTo(x + rand(-4, 4), 0);
    ctx.lineTo(x, 4);
    ctx.strokeStyle = hexA(ac, 0.75);
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.75)';
    ctx.lineWidth = 1.1;
    ctx.stroke();
  }
  ctx.restore();

  /* split muzzle rail tips */
  ctx.fillStyle = '#96a1ad';
  ctx.beginPath();
  ctx.moveTo(-10, -11.5);
  ctx.lineTo(7, -8.5);
  ctx.lineTo(7, -3.2);
  ctx.lineTo(-10, -4.2);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-10, 4.2);
  ctx.lineTo(7, 3.2);
  ctx.lineTo(7, 8.5);
  ctx.lineTo(-10, 11.5);
  ctx.closePath();
  ctx.fill();
  glow(ctx, 9, 0, 15 + 20 * capChg, ac, 0.38 + capChg * 0.5);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(6, 0, 2 + capChg * 2.6, 0, TAU);
  ctx.fill();

  /* under-barrel mag coil */
  ctx.fillStyle = '#20252c';
  rr(ctx, -112, 11, 98, 13, 4);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.5)';
  ctx.lineWidth = 1.4;
  ctx.stroke();
  for (let i = 0; i < 4; i++) {
    const p = 0.5 + 0.5 * Math.sin(s.t * 6 - i);
    ctx.fillStyle = hexA(ac, 0.25 + p * 0.65);
    rr(ctx, -106 + i * 22.5, 14, 9.5, 7, 2);
    ctx.fill();
  }

  /* grip + trigger */
  ctx.strokeStyle = '#22272e';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(-194, 30, 15, 0.1, Math.PI - 0.2);
  ctx.stroke();
  ctx.fillStyle = metal(ctx, -186, 19, -158, 58, '#262b32', '#4e5761', '#0d1013');
  ctx.beginPath();
  ctx.moveTo(-184, 19);
  ctx.lineTo(-160, 19);
  ctx.lineTo(-166, 58);
  ctx.lineTo(-186, 54);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.5)';
  ctx.lineWidth = 1.6;
  ctx.stroke();
  ctx.restore();
}


/* ===================================================== LEGENDARY WAVE 2
   Prismatic refraction · nanite swarm · temporal disruption */

const SPECTRUM = ['#ff2d55', '#ff9500', '#ffe600', '#5cff6b', '#2de1ff', '#4a6bff', '#b14aff'];

/* --------------------------------------------------- PRISMATIC LANCE */
function prismaticLance(ctx: CanvasRenderingContext2D, s: ArtState) {
  ctx.save();
  ctx.translate(0, s.recoil * 14);
  const chg = s.charge;

  /* --- crystal butt plate --- */
  ctx.fillStyle = metal(ctx, -214, -18, -160, 18, '#2c3340', '#7f8c9c', '#0c0f14');
  ctx.beginPath();
  ctx.moveTo(-216, -24);
  ctx.lineTo(-168, -20);
  ctx.lineTo(-168, 20);
  ctx.lineTo(-198, 34);
  ctx.lineTo(-216, 24);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.55)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = hexA('#dfe8f2', 0.5);
  ctx.beginPath();
  ctx.moveTo(-210, -16);
  ctx.lineTo(-178, -13);
  ctx.lineTo(-186, 8);
  ctx.lineTo(-208, 14);
  ctx.closePath();
  ctx.fill();

  /* --- faceted receiver --- */
  ctx.fillStyle = metal(ctx, -172, -20, -90, 20, '#39414d', '#8e9bab', '#12161b');
  ctx.beginPath();
  ctx.moveTo(-172, -22);
  ctx.lineTo(-104, -18);
  ctx.lineTo(-92, -6);
  ctx.lineTo(-92, 8);
  ctx.lineTo(-104, 20);
  ctx.lineTo(-172, 24);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.55)';
  ctx.lineWidth = 2;
  ctx.stroke();
  bevel(ctx, -172, -22, 82, 46, 6);
  // facet lines
  ctx.strokeStyle = 'rgba(255,255,255,.14)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.moveTo(-166 + i * 20, -20);
    ctx.lineTo(-160 + i * 20, 22);
    ctx.stroke();
  }

  /* --- three rotating dispersive prisms --- */
  const spin = s.t * (1.4 + chg * 7);
  for (let i = 0; i < 3; i++) {
    const px = -76 + i * 26;
    const sc = 1 - i * 0.08;
    ctx.save();
    ctx.translate(px, 0);
    ctx.rotate(spin * (i % 2 ? -1 : 1) + i);
    ctx.scale(sc, sc);
    // prism triangle (glass)
    const pg = ctx.createLinearGradient(-16, -16, 16, 16);
    pg.addColorStop(0, 'rgba(240,250,255,.92)');
    pg.addColorStop(0.45, 'rgba(170,200,225,.55)');
    pg.addColorStop(1, 'rgba(90,120,150,.75)');
    ctx.fillStyle = pg;
    ctx.beginPath();
    ctx.moveTo(17, 0);
    ctx.lineTo(-13, -16);
    ctx.lineTo(-13, 16);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.85)';
    ctx.lineWidth = 1.4;
    ctx.stroke();
    // refracted edge spectra inside the glass
    ctx.globalCompositeOperation = 'lighter';
    for (let k = 0; k < SPECTRUM.length; k++) {
      const f = k / (SPECTRUM.length - 1);
      ctx.strokeStyle = hexA(SPECTRUM[k], 0.35 + chg * 0.5);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-11, -13 + f * 26);
      ctx.lineTo(14, -3 + f * 7);
      ctx.stroke();
    }
    ctx.globalCompositeOperation = 'source-over';
    // mount collar
    ctx.fillStyle = '#2b323c';
    ctx.fillRect(-3.5, -19, 7, 38);
    ctx.restore();
  }

  /* --- focusing rails + white input lance --- */
  ctx.fillStyle = '#1b2027';
  rr(ctx, -22, -12, 26, 24, 4);
  ctx.fill();
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const inG = ctx.createLinearGradient(-20, 0, 4, 0);
  const ig = 0.25 + chg * 0.75;
  inG.addColorStop(0, hexA('#ffffff', 0));
  inG.addColorStop(1, hexA('#ffffff', ig));
  ctx.fillStyle = inG;
  ctx.beginPath();
  ctx.moveTo(-22, -4.5 * (1 - chg * 0.5));
  ctx.lineTo(6, -1.6);
  ctx.lineTo(6, 1.6);
  ctx.lineTo(-22, 4.5 * (1 - chg * 0.5));
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  /* --- exit aperture: 7 slotted fangs --- */
  ctx.fillStyle = '#4a5361';
  rr(ctx, 2, -19, 20, 38, 5);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.5)';
  ctx.lineWidth = 1.6;
  ctx.stroke();
  for (let k = 0; k < 7; k++) {
    const y = -15 + k * 5;
    const pulse = 0.35 + 0.65 * Math.abs(Math.sin(s.t * 5 - k * 0.5));
    ctx.fillStyle = hexA(SPECTRUM[k], (0.35 + chg * 0.65) * pulse);
    rr(ctx, 16, y - 1.6, 9 + chg * 4, 3.2, 1.6);
    ctx.fill();
  }
  glow(ctx, 24, 0, 22 + 40 * chg, '#ffffff', 0.3 + 0.6 * chg);
  // rainbow corona at the muzzle while charging
  if (chg > 0.03) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let k = 0; k < 7; k++) {
      const a = (k / 7) * TAU + s.t * 2;
      const g2 = ctx.createRadialGradient(22 + Math.cos(a) * 16, Math.sin(a) * 16, 0, 22 + Math.cos(a) * 16, Math.sin(a) * 16, 22);
      g2.addColorStop(0, hexA(SPECTRUM[k], 0.5 * chg));
      g2.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g2;
      ctx.beginPath();
      ctx.arc(22 + Math.cos(a) * 16, Math.sin(a) * 16, 22, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  /* --- grip + trigger --- */
  ctx.fillStyle = metal(ctx, -158, 20, -128, 60, '#262b32', '#4e5761', '#0d1013');
  ctx.beginPath();
  ctx.moveTo(-156, 20);
  ctx.lineTo(-130, 20);
  ctx.lineTo(-136, 58);
  ctx.lineTo(-156, 54);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.5)';
  ctx.lineWidth = 1.6;
  ctx.stroke();
  ctx.strokeStyle = '#20252b';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(-142, 32, 14, 0.1, Math.PI - 0.2);
  ctx.stroke();
  // spectral charge strip
  for (let k = 0; k < 7; k++) {
    const lit = clamp(chg * 7 - k * 0.85, 0, 1);
    ctx.fillStyle = hexA(SPECTRUM[k], 0.12 + lit * 0.85);
    rr(ctx, -150 + k * 3.4, 26, 2.6, 20 - k * 0.8, 1.3);
    ctx.fill();
  }
  ctx.restore();
}

/* ------------------------------------------------ NANITE HIVE LAUNCHER */
function naniteHive(ctx: CanvasRenderingContext2D, s: ArtState) {
  const ac = '#7dff4a';
  const ac2 = '#c6ff8a';
  ctx.save();
  ctx.translate(0, s.recoil * 16);

  /* --- organic spine / stock --- */
  ctx.fillStyle = metal(ctx, -238, -16, -180, 16, '#2b3a26', '#4d6b40', '#0a1008');
  ctx.beginPath();
  ctx.moveTo(-238, -22);
  ctx.lineTo(-186, -18);
  ctx.lineTo(-186, 18);
  ctx.lineTo(-214, 34);
  ctx.lineTo(-238, 24);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.6)';
  ctx.lineWidth = 2;
  ctx.stroke();
  // vertebrae
  ctx.fillStyle = hexA(ac, 0.75);
  for (let i = 0; i < 4; i++) {
    const x = -232 + i * 12;
    rr(ctx, x, -8 + Math.sin(i) * 2, 5, 5, 2.5);
    ctx.fill();
  }

  /* --- hive canister (hex cells) --- */
  ctx.fillStyle = metal(ctx, -188, -26, -120, 26, '#1e2a1a', '#3d5330', '#080d06');
  rr(ctx, -190, -28, 72, 56, 14);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.6)';
  ctx.lineWidth = 2;
  ctx.stroke();
  bevel(ctx, -190, -28, 72, 56, 14);
  // hex cell array
  const cw = 13;
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 5; col++) {
      const cx = -184 + col * cw + (row % 2 ? cw * 0.5 : 0);
      const cy = -20 + row * 13;
      if (cx > -124) continue;
      const pulse = 0.5 + 0.5 * Math.sin(s.t * 4 - (row + col) * 0.8);
      ctx.fillStyle = hexA(ac, 0.14 + pulse * 0.6 * (0.35 + s.charge * 0.65));
      ctx.save();
      ctx.translate(cx + 4, cy + 4);
      ctx.beginPath();
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * TAU + Math.PI / 6;
        const r2 = 4.6;
        if (k === 0) ctx.moveTo(Math.cos(a) * r2, Math.sin(a) * r2);
        else ctx.lineTo(Math.cos(a) * r2, Math.sin(a) * r2);
      }
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,.45)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();
    }
  }

  /* --- pulsing feed sac --- */
  const sacP = 1 + Math.sin(s.t * 5) * 0.06 + s.charge * 0.12;
  ctx.save();
  ctx.translate(-104, 0);
  ctx.scale(sacP, sacP);
  const sg = ctx.createRadialGradient(-8, -10, 2, 0, 0, 34);
  sg.addColorStop(0, '#c9ff9d');
  sg.addColorStop(0.35, hexA(ac, 0.85));
  sg.addColorStop(0.75, '#3d6b28');
  sg.addColorStop(1, '#15210f');
  ctx.fillStyle = sg;
  ctx.beginPath();
  ctx.ellipse(0, 0, 30, 24, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.55)';
  ctx.lineWidth = 2;
  ctx.stroke();
  // veins
  ctx.strokeStyle = hexA(ac2, 0.55);
  ctx.lineWidth = 1.6;
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * TAU + 0.4;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * 8, Math.sin(a) * 6);
    ctx.quadraticCurveTo(Math.cos(a) * 20, Math.sin(a) * 16, Math.cos(a) * 28, Math.sin(a) * 22);
    ctx.stroke();
  }
  ctx.restore();
  glow(ctx, -104, 0, 40, ac, 0.3 + 0.3 * s.charge);

  /* --- ribbed launcher barrel --- */
  ctx.fillStyle = metal(ctx, -78, -14, -20, 14, '#243020', '#4a633c', '#0a0f07');
  ctx.beginPath();
  ctx.moveTo(-80, -20);
  ctx.lineTo(-24, -16);
  ctx.lineTo(-18, -6);
  ctx.lineTo(-18, 8);
  ctx.lineTo(-24, 18);
  ctx.lineTo(-80, 22);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.6)';
  ctx.lineWidth = 2;
  ctx.stroke();
  for (let i = 0; i < 5; i++) {
    const x = -74 + i * 11;
    ctx.fillStyle = '#2f3f28';
    rr(ctx, x, -19, 6, 38, 3);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.45)';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.fillStyle = hexA(ac, 0.2 + 0.5 * (0.5 + 0.5 * Math.sin(s.t * 6 - i)));
    rr(ctx, x + 1.5, -13, 3, 26, 1.5);
    ctx.fill();
  }

  /* --- hex muzzle aperture --- */
  ctx.save();
  ctx.translate(-10, 0);
  ctx.fillStyle = '#16200f';
  ctx.beginPath();
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * TAU;
    const rr2 = 22;
    if (k === 0) ctx.moveTo(Math.cos(a) * rr2, Math.sin(a) * rr2);
    else ctx.lineTo(Math.cos(a) * rr2, Math.sin(a) * rr2);
  }
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = hexA(ac, 0.8);
  ctx.lineWidth = 2.5;
  ctx.stroke();
  // glowing throat
  const tg = ctx.createRadialGradient(0, 0, 0, 0, 0, 18);
  tg.addColorStop(0, hexA(ac2, 0.9));
  tg.addColorStop(0.5, hexA(ac, 0.55));
  tg.addColorStop(1, hexA('#1e3a12', 0.1));
  ctx.fillStyle = tg;
  ctx.beginPath();
  ctx.arc(0, 0, 18 * (0.6 + s.charge * 0.4), 0, TAU);
  ctx.fill();
  // swirling swarm inside the throat
  ctx.fillStyle = hexA('#eaffd6', 0.9);
  for (let i = 0; i < 9; i++) {
    const a = s.t * 6 + (i / 9) * TAU;
    const d = 5 + Math.sin(s.t * 3 + i) * 4;
    ctx.beginPath();
    ctx.arc(Math.cos(a) * d, Math.sin(a) * d * 0.6, 1.6, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
  glow(ctx, -4, 0, 34 + 30 * s.charge, ac, 0.4 + 0.4 * s.charge);

  /* --- grip --- */
  ctx.fillStyle = metal(ctx, -172, 26, -140, 66, '#2b3a26', '#4d6b40', '#0a1008');
  ctx.beginPath();
  ctx.moveTo(-170, 26);
  ctx.lineTo(-144, 26);
  ctx.lineTo(-150, 64);
  ctx.lineTo(-170, 60);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.5)';
  ctx.lineWidth = 1.6;
  ctx.stroke();
  ctx.restore();
}

/* --------------------------------------------------- CHRONO DISRUPTOR */
function chronoDisruptor(ctx: CanvasRenderingContext2D, s: ArtState) {
  const gold = '#ffcc4d';
  const teal = '#5fe6d0';
  ctx.save();
  ctx.translate(0, s.recoil * 12);

  /* --- brass counterweight stock --- */
  ctx.fillStyle = metal(ctx, -232, -18, -170, 18, '#4a3518', '#8a6a2c', '#140d04');
  ctx.beginPath();
  ctx.moveTo(-232, -24);
  ctx.lineTo(-178, -20);
  ctx.lineTo(-178, 20);
  ctx.lineTo(-206, 36);
  ctx.lineTo(-232, 26);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.6)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = hexA(gold, 0.7);
  rr(ctx, -226, -8, 40, 4, 2);
  ctx.fill();

  /* --- clockwork housing with exposed gears --- */
  ctx.fillStyle = metal(ctx, -182, -22, -104, 22, '#3a2b12', '#7a5c26', '#100b04');
  rr(ctx, -184, -24, 82, 48, 8);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.6)';
  ctx.lineWidth = 2;
  ctx.stroke();
  bevel(ctx, -184, -24, 82, 48, 8);
  // three meshing gears
  const gears: [number, number, number, number][] = [
    [-160, -2, 15, 1.1],
    [-136, 8, 10, -1.7],
    [-124, -10, 7.5, 2.6],
  ];
  for (const [gx, gy, gr, gs] of gears) {
    ctx.save();
    ctx.translate(gx, gy);
    ctx.rotate(s.t * gs);
    ctx.fillStyle = '#6b5019';
    ctx.beginPath();
    ctx.arc(0, 0, gr, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#8f6d24';
    for (let k = 0; k < 10; k++) {
      const a = (k / 10) * TAU;
      ctx.save();
      ctx.rotate(a);
      ctx.fillRect(gr - 1.5, -1.8, 4.5, 3.6);
      ctx.restore();
    }
    ctx.fillStyle = 'rgba(255,220,140,.35)';
    ctx.beginPath();
    ctx.arc(0, 0, gr * 0.5, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#241a08';
    ctx.beginPath();
    ctx.arc(0, 0, gr * 0.2, 0, TAU);
    ctx.fill();
    // spokes
    ctx.strokeStyle = 'rgba(40,28,10,.7)';
    ctx.lineWidth = 1.6;
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * TAU;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(a) * gr * 0.85, Math.sin(a) * gr * 0.85);
      ctx.stroke();
    }
    ctx.restore();
  }

  /* --- hourglass temporal chamber --- */
  ctx.save();
  ctx.translate(-70, 0);
  // frame
  ctx.fillStyle = '#5c451a';
  ctx.beginPath();
  ctx.moveTo(-19, -26);
  ctx.lineTo(19, -26);
  ctx.lineTo(19, -21);
  ctx.lineTo(-19, -21);
  ctx.moveTo(-19, 26);
  ctx.lineTo(19, 26);
  ctx.lineTo(19, 21);
  ctx.lineTo(-19, 21);
  ctx.closePath();
  ctx.fill();
  // glass bulbs
  const glass = ctx.createLinearGradient(0, -24, 0, 24);
  glass.addColorStop(0, 'rgba(220,245,255,.22)');
  glass.addColorStop(0.5, 'rgba(255,255,255,.06)');
  glass.addColorStop(1, 'rgba(220,245,255,.22)');
  ctx.fillStyle = glass;
  ctx.beginPath();
  ctx.moveTo(-16, -21);
  ctx.quadraticCurveTo(-16, -4, 0, 0);
  ctx.quadraticCurveTo(16, 4, 16, 21);
  ctx.lineTo(-16, 21);
  ctx.quadraticCurveTo(-16, 4, 0, 0);
  ctx.quadraticCurveTo(16, -4, 16, -21);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,235,180,.4)';
  ctx.lineWidth = 1.4;
  ctx.stroke();
  // falling chrono-sand
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const sandAmt = 0.4 + s.charge * 0.6;
  const upper = ctx.createLinearGradient(0, -21, 0, -2);
  upper.addColorStop(0, hexA(teal, 0.75 * sandAmt));
  upper.addColorStop(1, hexA(gold, 0.05));
  ctx.fillStyle = upper;
  ctx.beginPath();
  ctx.moveTo(-13, -20);
  ctx.quadraticCurveTo(-13, -6, 0, -1);
  ctx.quadraticCurveTo(13, -6, 13, -20);
  ctx.closePath();
  ctx.fill();
  const lower = ctx.createLinearGradient(0, 2, 0, 21);
  lower.addColorStop(0, hexA(gold, 0.5 * sandAmt));
  lower.addColorStop(1, hexA(teal, 0.8 * sandAmt));
  ctx.fillStyle = lower;
  ctx.beginPath();
  ctx.moveTo(-2, 1);
  ctx.quadraticCurveTo(-12, 6, -12, 20);
  ctx.lineTo(12, 20);
  ctx.quadraticCurveTo(12, 6, 2, 1);
  ctx.closePath();
  ctx.fill();
  // the falling stream
  ctx.fillStyle = hexA('#ffffff', 0.6 + 0.4 * Math.sin(s.t * 14));
  ctx.fillRect(-0.9, -2, 1.8, 22);
  ctx.restore();
  ctx.restore();
  glow(ctx, -70, 0, 34, teal, 0.3 + 0.35 * s.charge);

  /* --- split-time aperture muzzle --- */
  ctx.save();
  ctx.translate(-26, 0);
  ctx.fillStyle = '#3a2b12';
  rr(ctx, -4, -16, 30, 32, 5);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.55)';
  ctx.lineWidth = 1.6;
  ctx.stroke();
  // clock-face ring at the muzzle
  ctx.save();
  ctx.translate(32, 0);
  ctx.strokeStyle = hexA(gold, 0.85);
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, 0, 15, 0, TAU);
  ctx.stroke();
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * TAU;
    ctx.strokeStyle = hexA(k % 3 === 0 ? '#ffffff' : gold, 0.9);
    ctx.lineWidth = k % 3 === 0 ? 2.4 : 1.2;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * (k % 3 === 0 ? 10 : 12), Math.sin(a) * (k % 3 === 0 ? 10 : 12));
    ctx.lineTo(Math.cos(a) * 15, Math.sin(a) * 15);
    ctx.stroke();
  }
  // two hands at different rates
  const h1 = s.t * 3.1;
  const h2 = -s.t * 1.7;
  ctx.strokeStyle = hexA(teal, 0.95);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(Math.cos(h1) * 11, Math.sin(h1) * 11);
  ctx.stroke();
  ctx.strokeStyle = hexA('#ffffff', 0.9);
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(Math.cos(h2) * 7, Math.sin(h2) * 7);
  ctx.stroke();
  // frozen spiral inside
  ctx.strokeStyle = hexA(teal, 0.5 + s.charge * 0.5);
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  for (let k = 0; k <= 30; k++) {
    const f = k / 30;
    const a = f * 6.5 + s.t * 1.4;
    const rr2 = f * 9;
    const xx = Math.cos(a) * rr2;
    const yy = Math.sin(a) * rr2;
    if (k === 0) ctx.moveTo(xx, yy);
    else ctx.lineTo(xx, yy);
  }
  ctx.stroke();
  ctx.restore();
  glow(ctx, 32, 0, 22 + 32 * s.charge, teal, 0.35 + 0.55 * s.charge);
  ctx.restore();

  /* --- grip + brass trigger --- */
  ctx.fillStyle = metal(ctx, -168, 22, -136, 62, '#3a2b12', '#7a5c26', '#100b04');
  ctx.beginPath();
  ctx.moveTo(-166, 22);
  ctx.lineTo(-140, 22);
  ctx.lineTo(-146, 60);
  ctx.lineTo(-166, 56);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.5)';
  ctx.lineWidth = 1.6;
  ctx.stroke();
  ctx.strokeStyle = '#241a08';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(-152, 34, 14, 0.1, Math.PI - 0.2);
  ctx.stroke();
  ctx.restore();
}


/* ===================================================== LEGENDARY WAVE 3
   Cryogenic crystallisation · acoustic resonance · quantum superposition */

/* ------------------------------------------------- ABSOLUTE-ZERO LANCE */
function cryoLance(ctx: CanvasRenderingContext2D, s: ArtState) {
  const ice = '#9fe6ff';
  const deep = '#3f7fd6';
  ctx.save();
  ctx.translate(0, s.recoil * 14);
  const chg = s.charge;

  /* --- frosted cryo-tank stock --- */
  ctx.fillStyle = metal(ctx, -226, -18, -168, 18, '#2a3644', '#5f7b93', '#0b1119');
  ctx.beginPath();
  ctx.moveTo(-228, -24);
  ctx.lineTo(-176, -20);
  ctx.lineTo(-176, 20);
  ctx.lineTo(-202, 36);
  ctx.lineTo(-228, 26);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.6)';
  ctx.lineWidth = 2;
  ctx.stroke();
  // frost bloom on the tank
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * TAU + 0.4;
    const fx = -212 + Math.cos(a) * 16;
    const fy = Math.sin(a) * 14;
    const fg = ctx.createRadialGradient(fx, fy, 0, fx, fy, 13);
    fg.addColorStop(0, hexA('#dff4ff', 0.4));
    fg.addColorStop(1, hexA(ice, 0));
    ctx.fillStyle = fg;
    ctx.beginPath();
    ctx.arc(fx, fy, 13, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
  // snowflake etched on the tank
  ctx.strokeStyle = hexA('#eaf7ff', 0.8);
  ctx.lineWidth = 1.3;
  ctx.save();
  ctx.translate(-202, 0);
  ctx.rotate(s.t * 0.4);
  for (let k = 0; k < 6; k++) {
    ctx.save();
    ctx.rotate((k / 6) * TAU);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(9, 0);
    ctx.moveTo(4.5, 0);
    ctx.lineTo(7, -3);
    ctx.moveTo(4.5, 0);
    ctx.lineTo(7, 3);
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();

  /* --- receiver with radiator fins --- */
  ctx.fillStyle = metal(ctx, -180, -22, -104, 22, '#2e3b49', '#667f96', '#0c1219');
  rr(ctx, -182, -24, 80, 48, 8);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.6)';
  ctx.lineWidth = 2;
  ctx.stroke();
  bevel(ctx, -182, -24, 80, 48, 8);
  // stacked radiator fins (frosty)
  for (let i = 0; i < 6; i++) {
    const y = -20 + i * 7.5;
    ctx.fillStyle = '#1f2a35';
    rr(ctx, -176, y, 68, 4.5, 2);
    ctx.fill();
    ctx.fillStyle = hexA('#dff4ff', 0.16 + 0.2 * Math.abs(Math.sin(s.t * 2 + i)));
    rr(ctx, -176, y, 68, 1.6, 1);
    ctx.fill();
  }

  /* --- liquid-helium core (bubbling) --- */
  ctx.save();
  ctx.translate(-142, 0);
  ctx.fillStyle = '#16222e';
  ctx.beginPath();
  ctx.arc(0, 0, 21, 0, TAU);
  ctx.fill();
  const cg = ctx.createRadialGradient(-6, -7, 2, 0, 0, 20);
  cg.addColorStop(0, '#ffffff');
  cg.addColorStop(0.3, hexA(ice, 0.95));
  cg.addColorStop(0.72, hexA(deep, 0.85));
  cg.addColorStop(1, '#122440');
  ctx.fillStyle = cg;
  ctx.beginPath();
  ctx.arc(0, 0, 18, 0, TAU);
  ctx.fill();
  // rising cryo bubbles
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 7; i++) {
    const ph = (s.t * 0.55 + i / 7) % 1;
    const bx = Math.sin(i * 2.4) * 11;
    const by = 13 - ph * 26;
    ctx.fillStyle = hexA('#ffffff', 0.5 * (1 - ph));
    ctx.beginPath();
    ctx.arc(bx, by, 1.4 + i * 0.24, 0, TAU);
    ctx.fill();
  }
  ctx.globalCompositeOperation = 'source-over';
  ctx.strokeStyle = '#4a5f72';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(0, 0, 21, 0, TAU);
  ctx.stroke();
  ctx.strokeStyle = hexA('#dff4ff', 0.35);
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.restore();
  glow(ctx, -142, 0, 40, ice, 0.3 + 0.35 * chg);

  /* --- superconducting barrel --- */
  ctx.fillStyle = metal(ctx, -104, -14, -30, 14, '#26313d', '#587289', '#0a1017');
  ctx.beginPath();
  ctx.moveTo(-106, -20);
  ctx.lineTo(-36, -16);
  ctx.lineTo(-30, -6);
  ctx.lineTo(-30, 8);
  ctx.lineTo(-36, 18);
  ctx.lineTo(-106, 22);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.6)';
  ctx.lineWidth = 2;
  ctx.stroke();
  // frost creeping along the barrel, pulsing
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const creep = 0.4 + 0.25 * Math.sin(s.t * 1.6) + chg * 0.35;
  const fr = ctx.createLinearGradient(-104, 0, -30, 0);
  fr.addColorStop(0, hexA('#eaf7ff', 0.42 * creep));
  fr.addColorStop(1, hexA('#eaf7ff', 0.1 * creep));
  ctx.fillStyle = fr;
  rr(ctx, -104, -18, 74, 36, 8);
  ctx.fill();
  ctx.restore();
  // crystalline collars
  for (let i = 0; i < 4; i++) {
    const x = -98 + i * 18;
    ctx.fillStyle = '#3a4d5e';
    rr(ctx, x, -21, 8, 42, 3);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.5)';
    ctx.lineWidth = 1.3;
    ctx.stroke();
    // icicle teeth under each collar
    ctx.fillStyle = hexA('#eaf7ff', 0.85);
    for (let k = 0; k < 3; k++) {
      const ix = x + 1 + k * 2.4;
      const il = 4 + ((i + k) % 3) * 2.4;
      ctx.beginPath();
      ctx.moveTo(ix, 20);
      ctx.lineTo(ix + 1, 20 + il);
      ctx.lineTo(ix + 2, 20);
      ctx.closePath();
      ctx.fill();
    }
  }

  /* --- snowflake emitter aperture --- */
  ctx.save();
  ctx.translate(-22, 0);
  ctx.fillStyle = '#1b2733';
  ctx.beginPath();
  ctx.arc(0, 0, 19, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = hexA(ice, 0.9);
  ctx.lineWidth = 2.4;
  ctx.stroke();
  // rotating six-fold iris
  ctx.save();
  ctx.rotate(s.t * 0.9);
  ctx.strokeStyle = hexA('#eaf7ff', 0.85);
  ctx.lineWidth = 2;
  for (let k = 0; k < 6; k++) {
    ctx.save();
    ctx.rotate((k / 6) * TAU);
    ctx.beginPath();
    ctx.moveTo(4, 0);
    ctx.lineTo(17, 0);
    ctx.moveTo(11, 0);
    ctx.lineTo(15, -4);
    ctx.moveTo(11, 0);
    ctx.lineTo(15, 4);
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
  // freezing throat
  const tg = ctx.createRadialGradient(0, 0, 0, 0, 0, 15);
  tg.addColorStop(0, `rgba(255,255,255,${0.85 + 0.15 * chg})`);
  tg.addColorStop(0.45, hexA(ice, 0.7));
  tg.addColorStop(1, hexA(deep, 0.15));
  ctx.fillStyle = tg;
  ctx.beginPath();
  ctx.arc(0, 0, 15 * (0.65 + chg * 0.35), 0, TAU);
  ctx.fill();
  ctx.restore();
  glow(ctx, -16, 0, 30 + 30 * chg, ice, 0.4 + 0.45 * chg);
  // cold vapour leaking from the muzzle
  for (let i = 0; i < 3; i++) {
    const a = s.t * 1.3 + i * 2.1;
    glow(ctx, -14 + Math.cos(a) * 22, Math.sin(a) * 20, 11, '#dff4ff', 0.16);
  }

  /* --- grip --- */
  ctx.fillStyle = metal(ctx, -166, 22, -134, 62, '#2a3644', '#587289', '#0a1017');
  ctx.beginPath();
  ctx.moveTo(-164, 22);
  ctx.lineTo(-138, 22);
  ctx.lineTo(-144, 60);
  ctx.lineTo(-164, 56);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.5)';
  ctx.lineWidth = 1.6;
  ctx.stroke();
  ctx.strokeStyle = '#1c2530';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(-150, 34, 14, 0.1, Math.PI - 0.2);
  ctx.stroke();
  ctx.restore();
}

/* ------------------------------------------------------ SONOCLASM MK-4 */
function sonoclasm(ctx: CanvasRenderingContext2D, s: ArtState) {
  const ac = '#ff8a2a';
  const ac2 = '#ffe08a';
  ctx.save();
  ctx.translate(0, s.recoil * 16);
  const chg = s.charge;

  /* --- resonant bass-bin stock --- */
  ctx.fillStyle = metal(ctx, -232, -22, -172, 22, '#3a2a1c', '#7a5334', '#140c06');
  rr(ctx, -234, -26, 64, 52, 12);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.6)';
  ctx.lineWidth = 2;
  ctx.stroke();
  bevel(ctx, -234, -26, 64, 52, 12);
  // concentric speaker cone
  ctx.save();
  ctx.translate(-202, 0);
  const conePulse = 1 + Math.sin(s.t * 7) * 0.06 + chg * 0.1;
  ctx.scale(conePulse, conePulse);
  for (const [cr, col, lw] of [
    [22, '#1a120b', 7],
    [16, '#6b4a2a', 4],
    [11, '#2c1f14', 5],
    [6, '#8a6335', 3],
  ] as [number, string, number][]) {
    ctx.strokeStyle = col;
    ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.arc(0, 0, cr, 0, TAU);
    ctx.stroke();
  }
  ctx.fillStyle = hexA(ac2, 0.55 + 0.35 * Math.sin(s.t * 7));
  ctx.beginPath();
  ctx.arc(0, 0, 3.4, 0, TAU);
  ctx.fill();
  ctx.restore();
  glow(ctx, -202, 0, 30, ac2, 0.18 + 0.2 * chg);

  /* --- chassis --- */
  ctx.fillStyle = metal(ctx, -176, -20, -104, 20, '#39271a', '#7a5535', '#130c06');
  rr(ctx, -178, -22, 76, 44, 8);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.6)';
  ctx.lineWidth = 2;
  ctx.stroke();
  bevel(ctx, -178, -22, 76, 44, 8);
  // VU meter ladder
  for (let i = 0; i < 6; i++) {
    const on = clamp((0.35 + 0.3 * Math.sin(s.t * 8 - i * 0.7) + chg) * 6 - i, 0, 1);
    const col = i < 4 ? '#5cff6b' : i < 5 ? '#ffe600' : '#ff3b30';
    ctx.fillStyle = hexA(col, 0.12 + on * 0.85);
    rr(ctx, -172 + i * 10, -14, 6, 10, 1.5);
    ctx.fill();
    if (on > 0.3) glow(ctx, -169 + i * 10, -9, 9 * on, col, 0.3 * on);
  }
  // tuning dial
  ctx.fillStyle = '#1a120b';
  rr(ctx, -172, 0, 62, 14, 4);
  ctx.fill();
  ctx.strokeStyle = hexA(ac, 0.8);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-168, 7);
  ctx.lineTo(-168 + (56 * (0.5 + 0.45 * Math.sin(s.t * 1.4))), 7);
  ctx.stroke();
  ctx.fillStyle = hexA(ac2, 0.9);
  ctx.fillRect(-170 + 56 * (0.5 + 0.45 * Math.sin(s.t * 1.4)), 3, 2.6, 8);

  /* --- horn waveguide (expanding flare) --- */
  ctx.fillStyle = metal(ctx, -108, -18, -46, 18, '#33221a', '#6d4a2e', '#110a06');
  ctx.beginPath();
  ctx.moveTo(-110, -18);
  ctx.lineTo(-66, -30);
  ctx.lineTo(-56, -30);
  ctx.lineTo(-56, 30);
  ctx.lineTo(-66, 30);
  ctx.lineTo(-110, 18);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.6)';
  ctx.lineWidth = 2;
  ctx.stroke();
  // inner flare shading
  const fg = ctx.createLinearGradient(-110, 0, -56, 0);
  fg.addColorStop(0, 'rgba(255,224,138,.05)');
  fg.addColorStop(1, hexA(ac, 0.25 + 0.2 * Math.sin(s.t * 9)));
  ctx.fillStyle = fg;
  ctx.beginPath();
  ctx.moveTo(-108, -16);
  ctx.lineTo(-66, -27);
  ctx.lineTo(-66, 27);
  ctx.lineTo(-108, 16);
  ctx.closePath();
  ctx.fill();
  // rib rings along the horn
  for (let i = 0; i < 4; i++) {
    const t2 = i / 3;
    const x = -104 + t2 * 44;
    const h = 15 + t2 * 11;
    ctx.strokeStyle = 'rgba(0,0,0,.45)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, -h);
    ctx.lineTo(x, h);
    ctx.stroke();
  }

  /* --- emitter throat with standing waves --- */
  ctx.save();
  ctx.translate(-48, 0);
  ctx.fillStyle = '#1a120b';
  ctx.beginPath();
  ctx.arc(0, 0, 17, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = hexA(ac, 0.9);
  ctx.lineWidth = 2.4;
  ctx.stroke();
  // standing-wave lobes inside the throat
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let k = 0; k < 5; k++) {
    const amp = Math.abs(Math.sin(s.t * 10 - k * 0.8)) * (9 - k * 1.2) * (0.55 + chg * 0.6);
    ctx.fillStyle = hexA(k % 2 ? ac2 : ac, 0.55);
    ctx.beginPath();
    ctx.ellipse(-k * 3.2, 0, 2.4, amp, 0, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
  ctx.restore();
  glow(ctx, -40, 0, 26 + 34 * chg, ac2, 0.35 + 0.5 * chg);

  /* --- tuning fork prongs at the muzzle --- */
  ctx.fillStyle = '#8a6335';
  rr(ctx, -38, -25, 9, 50, 3);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.5)';
  ctx.lineWidth = 1.4;
  ctx.stroke();
  for (const d of [-1, 1]) {
    ctx.fillStyle = metal(ctx, -30, 0, 4, 4, '#8a6335', '#d0a45c', '#3a2712');
    rr(ctx, -32, d > 0 ? 3 : -22, 38, 19, 7);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.55)';
    ctx.lineWidth = 1.8;
    ctx.stroke();
    // vibration blur on the prongs
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let k = 1; k <= 3; k++) {
      ctx.strokeStyle = hexA(ac2, 0.16 / k);
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(-32 + k * 1.4, d > 0 ? 4 : -23);
      ctx.lineTo(6 + k * 1.4, d > 0 ? 4 : -23);
      ctx.stroke();
    }
    ctx.restore();
    // tip glow
    glow(ctx, 6, d > 0 ? 12 : -12, 13 + 8 * chg, ac2, 0.35 + 0.4 * chg);
  }

  /* --- grip --- */
  ctx.fillStyle = metal(ctx, -162, 22, -132, 62, '#33221a', '#6d4a2e', '#110a06');
  ctx.beginPath();
  ctx.moveTo(-160, 22);
  ctx.lineTo(-136, 22);
  ctx.lineTo(-142, 60);
  ctx.lineTo(-160, 56);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.5)';
  ctx.lineWidth = 1.6;
  ctx.stroke();
  ctx.strokeStyle = '#1a120b';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(-146, 34, 14, 0.1, Math.PI - 0.2);
  ctx.stroke();
  ctx.restore();
}

/* -------------------------------------------------- QUANTUM BIFURCATOR */
function quantumRifle(ctx: CanvasRenderingContext2D, s: ArtState) {
  const ac = '#8b7bff';
  const ac2 = '#4affd0';
  ctx.save();
  ctx.translate(0, s.recoil * 13);
  const chg = s.charge;

  /* --- probability-matrix stock (wireframe) --- */
  ctx.save();
  ctx.strokeStyle = hexA(ac, 0.5);
  ctx.lineWidth = 1.6;
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.moveTo(-236, -22 + i * 11);
    ctx.lineTo(-178, -18 + i * 9);
    ctx.stroke();
  }
  for (let i = 0; i < 4; i++) {
    const t2 = i / 3;
    ctx.beginPath();
    ctx.moveTo(-236 + t2 * 58, -22 + t2 * 2);
    ctx.lineTo(-236 + t2 * 58, 22 - t2 * 2);
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(30,24,52,.55)';
  ctx.beginPath();
  ctx.moveTo(-238, -24);
  ctx.lineTo(-178, -20);
  ctx.lineTo(-178, 20);
  ctx.lineTo(-206, 34);
  ctx.lineTo(-238, 24);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = hexA(ac, 0.7);
  ctx.lineWidth = 1.8;
  ctx.stroke();
  ctx.restore();

  /* --- receiver --- */
  ctx.fillStyle = metal(ctx, -182, -22, -106, 22, '#241f3a', '#4d4478', '#0a0812');
  rr(ctx, -184, -24, 80, 48, 8);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.6)';
  ctx.lineWidth = 2;
  ctx.stroke();
  bevel(ctx, -184, -24, 80, 48, 8);
  // probability lattice
  ctx.strokeStyle = hexA(ac2, 0.32);
  ctx.lineWidth = 1;
  for (let i = 0; i < 6; i++) {
    ctx.beginPath();
    ctx.moveTo(-178 + i * 12, -20);
    ctx.lineTo(-174 + i * 12, 20);
    ctx.stroke();
  }
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.moveTo(-178, -16 + i * 11);
    ctx.lineTo(-108, -16 + i * 11);
    ctx.stroke();
  }
  // collapsed-state readout
  for (let i = 0; i < 3; i++) {
    const on = chg > 0.02 ? (i === Math.floor(chg * 3) ? 1 : 0.15) : 0.2 + 0.15 * Math.sin(s.t * 3 + i);
    ctx.fillStyle = hexA(i === 1 ? ac2 : ac, 0.15 + on * 0.8);
    ctx.beginPath();
    ctx.arc(-172 + i * 9, 16, 3, 0, TAU);
    ctx.fill();
  }

  /* --- superposition chamber: three ghost barrels --- */
  ctx.save();
  ctx.translate(-118, 0);
  // the real barrel
  ctx.fillStyle = '#1a1528';
  rr(ctx, -14, -9, 26, 18, 5);
  ctx.fill();
  ctx.strokeStyle = hexA(ac, 0.8);
  ctx.lineWidth = 1.6;
  ctx.stroke();
  // two phase-shifted echoes orbiting it
  for (let k = 0; k < 2; k++) {
    const ph = s.t * (1.6 + k * 0.7) + (k / 2) * TAU;
    const oy = Math.sin(ph) * 13;
    const ox = Math.cos(ph) * 5;
    const alpha = 0.16 + 0.3 * (0.5 + 0.5 * Math.sin(ph * 2)) + chg * 0.3;
    ctx.save();
    ctx.translate(ox, oy);
    ctx.globalAlpha = clamp(alpha, 0, 0.75);
    ctx.strokeStyle = k ? ac2 : ac;
    ctx.lineWidth = 1.6;
    rr(ctx, -14, -9, 26, 18, 5);
    ctx.stroke();
    ctx.fillStyle = hexA(k ? ac2 : ac, 0.1);
    rr(ctx, -14, -9, 26, 18, 5);
    ctx.fill();
    ctx.restore();
  }
  ctx.globalAlpha = 1;
  ctx.restore();
  glow(ctx, -118, 0, 34, ac, 0.28 + 0.35 * chg);

  /* --- twin entangled rails --- */
  ctx.fillStyle = metal(ctx, -104, -14, -34, 14, '#201b33', '#453d6b', '#08060f');
  rr(ctx, -106, -17, 74, 34, 6);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.6)';
  ctx.lineWidth = 2;
  ctx.stroke();
  // two glowing channels that swap brightness (entanglement flicker)
  const flip = Math.sin(s.t * 4.2) > 0;
  for (let i = 0; i < 2; i++) {
    const y = i === 0 ? -9 : 9;
    const a = (i === 0 ? (flip ? 0.85 : 0.28) : flip ? 0.28 : 0.85) * (0.5 + chg * 0.5);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createLinearGradient(-100, 0, -36, 0);
    g.addColorStop(0, hexA(i === 0 ? ac : ac2, 0));
    g.addColorStop(1, hexA(i === 0 ? ac : ac2, a));
    ctx.fillStyle = g;
    rr(ctx, -100, y - 3, 64, 6, 3);
    ctx.fill();
    ctx.restore();
  }

  /* --- collapse aperture: three irises --- */
  ctx.save();
  ctx.translate(-26, 0);
  ctx.fillStyle = '#151027';
  ctx.beginPath();
  ctx.arc(0, 0, 18, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = hexA(ac, 0.9);
  ctx.lineWidth = 2.2;
  ctx.stroke();
  // tri-lobed iris blades
  ctx.save();
  ctx.rotate(s.t * 1.3);
  for (let k = 0; k < 3; k++) {
    ctx.save();
    ctx.rotate((k / 3) * TAU);
    ctx.fillStyle = hexA(k === 0 ? ac2 : ac, 0.75);
    ctx.beginPath();
    ctx.moveTo(3, -3);
    ctx.lineTo(16, -7);
    ctx.lineTo(16, 7);
    ctx.lineTo(3, 3);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
  // core: a probability cloud that tightens with charge
  const cr = 11 - chg * 5;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const cg = ctx.createRadialGradient(0, 0, 0, 0, 0, cr * 1.9);
  cg.addColorStop(0, `rgba(255,255,255,${0.85 + 0.15 * chg})`);
  cg.addColorStop(0.35, hexA(ac2, 0.7));
  cg.addColorStop(1, hexA(ac, 0));
  ctx.fillStyle = cg;
  ctx.beginPath();
  ctx.arc(0, 0, cr * 1.9, 0, TAU);
  ctx.fill();
  // probability shells
  ctx.strokeStyle = hexA('#ffffff', 0.5 + 0.4 * chg);
  ctx.lineWidth = 1.2;
  for (let k = 0; k < 3; k++) {
    const ph = s.t * 3 + (k / 3) * TAU;
    ctx.beginPath();
    ctx.ellipse(0, 0, cr * (0.35 + k * 0.25), cr * (0.9 - k * 0.16), ph, 0, TAU);
    ctx.stroke();
  }
  ctx.restore();
  ctx.restore();
  glow(ctx, -20, 0, 30 + 34 * chg, ac, 0.35 + 0.5 * chg);
  // twin drifting amplitude ghosts near the muzzle
  for (let k = 0; k < 2; k++) {
    const ph = s.t * 2.1 + k * Math.PI;
    glow(ctx, -16 + Math.cos(ph) * 26, Math.sin(ph) * 24, 13, k ? ac2 : ac, 0.22 + chg * 0.3);
  }

  /* --- grip --- */
  ctx.fillStyle = metal(ctx, -168, 22, -138, 62, '#241f3a', '#453d6b', '#08060f');
  ctx.beginPath();
  ctx.moveTo(-166, 22);
  ctx.lineTo(-142, 22);
  ctx.lineTo(-148, 60);
  ctx.lineTo(-166, 56);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.5)';
  ctx.lineWidth = 1.6;
  ctx.stroke();
  ctx.strokeStyle = '#151027';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(-152, 34, 14, 0.1, Math.PI - 0.2);
  ctx.stroke();
  ctx.restore();
}


/* ===================================================== LEGENDARY WAVE 4
   Xenomorph molecular acid · Mega Man charged buster */

const CHITIN_HI = '#3c424c';
const CHITIN_LO = '#05070a';

/** Giger-style ribbed biomech segment */
function bioRib(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  glowCol?: string,
  glowAmt = 0,
) {
  const g = ctx.createLinearGradient(x, y, x + w, y + h);
  g.addColorStop(0, CHITIN_HI);
  g.addColorStop(0.4, '#22262d');
  g.addColorStop(1, CHITIN_LO);
  ctx.fillStyle = g;
  rr(ctx, x, y, w, h, Math.min(h / 2, 8));
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.7)';
  ctx.lineWidth = 1.8;
  ctx.stroke();
  // specular sheen along the top
  ctx.fillStyle = 'rgba(255,255,255,.09)';
  rr(ctx, x + 2, y + 1.5, w - 4, h * 0.26, 3);
  ctx.fill();
  if (glowCol && glowAmt > 0.02) glow(ctx, x + w / 2, y + h / 2, Math.max(w, h) * 0.85, glowCol, glowAmt);
}

/* ------------------------------------------- XENOMORPH ACID SPRAYER */
function acidSprayer(ctx: CanvasRenderingContext2D, s: ArtState) {
  const acid = '#a3ff2f';
  const bile = '#5c9e12';
  const on = s.active ? 1 : 0.35 + 0.25 * Math.sin(s.t * 3);
  ctx.save();
  ctx.translate(0, s.recoil * 10);

  /* --- spine / tail anchor (vertebrae) --- */
  ctx.save();
  for (let i = 0; i < 6; i++) {
    const x = -286 + i * 17;
    const wob = Math.sin(s.t * 3 + i * 0.7) * 2.4;
    ctx.save();
    ctx.translate(x, -4 + wob);
    ctx.rotate(Math.sin(s.t * 2.2 + i) * 0.14);
    bioRib(ctx, -8, -11, 17, 22);
    // dorsal spike
    ctx.fillStyle = '#2a2f37';
    ctx.beginPath();
    ctx.moveTo(-2, -11);
    ctx.lineTo(2, -22 - (i % 2) * 5);
    ctx.lineTo(6, -11);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.6)';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();

  /* --- pressurised acid reservoir (translucent, bubbling) --- */
  ctx.save();
  ctx.translate(-196, 2);
  // tank shell
  const tg = ctx.createLinearGradient(-34, -30, 34, 30);
  tg.addColorStop(0, '#1c2026');
  tg.addColorStop(0.42, '#2b3138');
  tg.addColorStop(1, '#0a0d11');
  ctx.fillStyle = tg;
  ctx.beginPath();
  ctx.ellipse(0, 0, 36, 31, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.7)';
  ctx.lineWidth = 2.4;
  ctx.stroke();
  // bioluminescent acid inside, sloshing
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(0, 0, 30, 25, 0, 0, TAU);
  ctx.clip();
  const lvl = Math.sin(s.t * 1.8) * 3;
  const ag = ctx.createLinearGradient(0, -26 + lvl, 0, 26);
  ag.addColorStop(0, hexA('#e8ff9c', 0.95));
  ag.addColorStop(0.3, hexA(acid, 0.92));
  ag.addColorStop(0.7, hexA(bile, 0.95));
  ag.addColorStop(1, '#1e3a06');
  ctx.fillStyle = ag;
  ctx.beginPath();
  ctx.ellipse(0, lvl, 31, 26, 0, 0, TAU);
  ctx.fill();
  // rising fizz bubbles
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 8; i++) {
    const ph = (s.t * 0.5 + i / 8) % 1;
    const bx = Math.sin(i * 2.7) * 19;
    const by = 20 - ph * 40;
    ctx.fillStyle = hexA('#f4ffd0', 0.55 * (1 - ph));
    ctx.beginPath();
    ctx.arc(bx, by, 1.5 + (i % 3) * 1.3, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
  // clamp bands around the tank
  ctx.fillStyle = '#2a2f37';
  for (const bx of [-20, 4, 26]) {
    rr(ctx, bx, -30, 6, 60, 3);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.55)';
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }
  ctx.restore();
  glow(ctx, -196, 2, 48, acid, 0.28 + 0.3 * on);

  /* --- ribbed transfer hoses --- */
  ctx.lineCap = 'round';
  for (const [y0, y1, sag] of [
    [-22, -12, 26],
    [22, 14, 34],
  ] as number[][]) {
    ctx.beginPath();
    ctx.moveTo(-164, y0);
    ctx.quadraticCurveTo(-140, y0 + sag, -118, y1);
    ctx.strokeStyle = '#0b0e12';
    ctx.lineWidth = 13;
    ctx.stroke();
    ctx.strokeStyle = '#2c323a';
    ctx.lineWidth = 8;
    ctx.stroke();
    // ribs
    for (let k = 0; k < 9; k++) {
      const f = k / 8;
      const rx = -164 + (-164 + -118 + -164) * 0 + (-164 + (-118 - -164) * f);
      const ry = y0 + (y1 - y0) * f + Math.sin(f * Math.PI) * sag * 0.62;
      ctx.strokeStyle = 'rgba(0,0,0,.55)';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(rx - 4, ry - 5);
      ctx.lineTo(rx + 4, ry + 5);
      ctx.stroke();
    }
    // acid pulse travelling the hose
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const pf = (s.t * 1.5 + (sag > 30 ? 0.3 : 0)) % 1;
    const px2 = -164 + (-118 - -164) * pf;
    const py2 = y0 + (y1 - y0) * pf + Math.sin(pf * Math.PI) * sag * 0.62;
    glow(ctx, px2, py2, 11, acid, 0.6);
    ctx.restore();
  }

  /* --- receiver: chitin carapace --- */
  ctx.fillStyle = metal(ctx, -170, -24, -100, 24, '#1b1f25', '#434a55', '#070a0d');
  ctx.beginPath();
  ctx.moveTo(-172, -26);
  ctx.lineTo(-112, -22);
  ctx.lineTo(-100, -8);
  ctx.lineTo(-100, 10);
  ctx.lineTo(-112, 24);
  ctx.lineTo(-172, 28);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.7)';
  ctx.lineWidth = 2.2;
  ctx.stroke();
  // carapace plating lines
  ctx.strokeStyle = 'rgba(255,255,255,.07)';
  ctx.lineWidth = 1.2;
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.moveTo(-166 + i * 17, -24);
    ctx.quadraticCurveTo(-160 + i * 17, 0, -166 + i * 17, 26);
    ctx.stroke();
  }
  // acid vents glowing through the carapace
  for (let i = 0; i < 4; i++) {
    const p = 0.5 + 0.5 * Math.sin(s.t * 5 - i * 0.8);
    ctx.fillStyle = hexA(acid, 0.3 + p * 0.6);
    rr(ctx, -164 + i * 15, -6, 6, 12, 3);
    ctx.fill();
    if (p > 0.6) glow(ctx, -161 + i * 15, 0, 12 * p, acid, 0.3);
  }

  /* --- muzzle: inner-jaw maw with dripping fangs --- */
  ctx.save();
  ctx.translate(-96, 0);
  const gape = 0.3 + s.fire * 0.7 + Math.sin(s.t * 2.4) * 0.05;
  // outer labia (fleshy plates) opening
  for (const d of [-1, 1]) {
    ctx.save();
    ctx.translate(0, d * 6);
    ctx.rotate(d * gape * 0.34);
    const lg = ctx.createLinearGradient(0, 0, 0, d * 22);
    lg.addColorStop(0, '#3a4149');
    lg.addColorStop(0.5, '#1c2127');
    lg.addColorStop(1, '#080b0e');
    ctx.fillStyle = lg;
    ctx.beginPath();
    ctx.moveTo(-34, d * -8);
    ctx.quadraticCurveTo(6, d * -12, 30, d * -3);
    ctx.quadraticCurveTo(20, d * 12, -14, d * 11);
    ctx.quadraticCurveTo(-32, d * 8, -34, d * -8);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.7)';
    ctx.lineWidth = 1.8;
    ctx.stroke();
    // teeth along the plate
    ctx.fillStyle = '#d9d2be';
    for (let k = 0; k < 5; k++) {
      const tx = -26 + k * 12;
      const tl = 5 + (k % 2) * 3;
      ctx.beginPath();
      ctx.moveTo(tx, d * 8);
      ctx.lineTo(tx + 3, d * (8 + tl));
      ctx.lineTo(tx + 6, d * 7);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }
  // glowing throat
  const throat = ctx.createRadialGradient(6, 0, 0, 6, 0, 20 + 8 * s.fire);
  throat.addColorStop(0, `rgba(244,255,208,${0.85 + 0.15 * s.fire})`);
  throat.addColorStop(0.35, hexA(acid, 0.85));
  throat.addColorStop(0.75, hexA(bile, 0.4));
  throat.addColorStop(1, hexA(bile, 0));
  ctx.fillStyle = throat;
  ctx.beginPath();
  ctx.ellipse(8, 0, 20, 14, 0, 0, TAU);
  ctx.fill();
  // secondary inner jaw (the strike mouth)
  ctx.save();
  ctx.translate(4, 0);
  ctx.rotate(Math.sin(s.t * 6) * 0.05);
  ctx.fillStyle = '#22272d';
  ctx.beginPath();
  ctx.moveTo(-6, -7);
  ctx.lineTo(22, -4);
  ctx.lineTo(26, 0);
  ctx.lineTo(22, 4);
  ctx.lineTo(-6, 7);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.6)';
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.fillStyle = '#e8e2cf';
  for (let k = 0; k < 4; k++) {
    const tx = -2 + k * 7;
    ctx.beginPath();
    ctx.moveTo(tx, -4);
    ctx.lineTo(tx + 2.5, 0);
    ctx.lineTo(tx, 4);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
  // drip hanging from the lower lip
  const drip = ((s.t * 0.55) % 1);
  const dy = 14 + drip * 26;
  const dr = 2.6 * (1 - drip * 0.3);
  ctx.fillStyle = hexA('#d6ff7a', 0.95);
  ctx.beginPath();
  ctx.ellipse(2, dy, dr, dr * 1.5, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.7)';
  ctx.beginPath();
  ctx.arc(1.2, dy - dr * 0.4, dr * 0.4, 0, TAU);
  ctx.fill();
  ctx.restore();
  glow(ctx, -84, 0, 40 + 26 * s.fire, acid, 0.4 + 0.4 * on);

  /* --- grip: chitin claw --- */
  bioRib(ctx, -150, 24, 30, 38);
  ctx.strokeStyle = '#12161b';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(-136, 36, 14, 0.1, Math.PI - 0.2);
  ctx.stroke();
  // talon tip
  ctx.fillStyle = '#2a2f37';
  ctx.beginPath();
  ctx.moveTo(-146, 60);
  ctx.lineTo(-140, 76);
  ctx.lineTo(-134, 60);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.6)';
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.restore();
}

/* ----------------------------------------------------- MEGA BUSTER MK-X */
function megaBuster(ctx: CanvasRenderingContext2D, s: ArtState) {
  const chg = s.charge;
  const arm = '#eef2f7';
  const armSh = '#9aa5b3';
  const gem = '#2ec8ff';
  ctx.save();
  ctx.translate(0, s.recoil * 13);

  /* --- forearm armour (white with blue trims, X-series) --- */
  const fg = ctx.createLinearGradient(0, -34, 0, 34);
  fg.addColorStop(0, '#ffffff');
  fg.addColorStop(0.35, arm);
  fg.addColorStop(0.72, armSh);
  fg.addColorStop(1, '#5c6774');
  ctx.fillStyle = fg;
  ctx.beginPath();
  ctx.moveTo(-176, -30);
  ctx.quadraticCurveTo(-118, -36, -92, -22);
  ctx.lineTo(-92, 22);
  ctx.quadraticCurveTo(-118, 36, -176, 30);
  ctx.quadraticCurveTo(-190, 0, -176, -30);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(30,40,55,.6)';
  ctx.lineWidth = 2.4;
  ctx.stroke();
  // crimson shoulder block
  ctx.fillStyle = '#2f6fd0';
  ctx.beginPath();
  ctx.moveTo(-186, -26);
  ctx.lineTo(-158, -30);
  ctx.lineTo(-152, -12);
  ctx.lineTo(-158, 6);
  ctx.lineTo(-186, 10);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(20,30,45,.55)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.35)';
  ctx.beginPath();
  ctx.moveTo(-182, -22);
  ctx.lineTo(-162, -25);
  ctx.lineTo(-159, -14);
  ctx.lineTo(-182, -12);
  ctx.closePath();
  ctx.fill();
  // crystal gem on the forearm
  const gp = 0.6 + 0.4 * Math.sin(s.t * 5);
  ctx.fillStyle = hexA(gem, 0.9);
  ctx.beginPath();
  ctx.arc(-140, 12, 7, 0, TAU);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.85)';
  ctx.beginPath();
  ctx.arc(-142, 10, 3, 0, TAU);
  ctx.fill();
  glow(ctx, -140, 12, 16 * gp, gem, 0.4);
  // panel seams
  ctx.strokeStyle = 'rgba(90,105,120,.55)';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-166, -28);
  ctx.lineTo(-166, 28);
  ctx.moveTo(-120, -30);
  ctx.lineTo(-120, 30);
  ctx.stroke();

  /* --- buster barrel: 3-stage telescoping --- */
  const ext = chg * 6;
  for (let stage = 0; stage < 3; stage++) {
    const x0 = -96 + stage * (26 + ext * 0.4);
    const w0 = 30 - stage * 4;
    const g2 = ctx.createLinearGradient(0, -w0 / 2, 0, w0 / 2);
    g2.addColorStop(0, '#ffffff');
    g2.addColorStop(0.32, arm);
    g2.addColorStop(0.68, armSh);
    g2.addColorStop(1, '#4e5865');
    ctx.fillStyle = g2;
    rr(ctx, x0, -w0 / 2, 28 + stage * 2, w0, 8);
    ctx.fill();
    ctx.strokeStyle = 'rgba(30,40,55,.6)';
    ctx.lineWidth = 2;
    ctx.stroke();
    // blue trim ring per stage
    ctx.fillStyle = hexA(gem, 0.85);
    rr(ctx, x0 + 4, -w0 / 2 + 3, 5, w0 - 6, 2.5);
    ctx.fill();
  }

  /* --- muzzle ring + charging energy --- */
  const mx = -96 + 3 * (26 + ext * 0.4) + 22;
  ctx.save();
  ctx.translate(mx, 0);
  ctx.fillStyle = '#cfd7e1';
  ctx.beginPath();
  ctx.arc(0, 0, 15, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = 'rgba(30,40,55,.6)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#1a2330';
  ctx.beginPath();
  ctx.arc(0, 0, 10, 0, TAU);
  ctx.fill();

  if (chg > 0.02) {
    // 4 rotating charge rings, classic buster spin-up
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const tier = chg < 0.4 ? '#ffe08a' : chg < 0.75 ? '#ffb43a' : '#fff6d8';
    for (let k = 0; k < 4; k++) {
      const ph = s.t * (5 + chg * 9) + (k / 4) * TAU;
      const rr2 = 8 + (k % 2) * 5 + chg * 4;
      ctx.save();
      ctx.rotate(ph);
      ctx.scale(1, 0.42 + (k % 2) * 0.2);
      ctx.strokeStyle = hexA(tier, 0.35 + chg * 0.55);
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.arc(0, 0, rr2, 0, TAU);
      ctx.stroke();
      ctx.restore();
    }
    // converging energy motes
    for (let k = 0; k < 6; k++) {
      const ph = (s.t * 2.4 + k / 6) % 1;
      const a = (k / 6) * TAU + s.t * 3;
      const d = 34 * (1 - ph);
      glow(ctx, Math.cos(a) * d, Math.sin(a) * d, 6 + ph * 8, tier, 0.5 * ph);
    }
    // core glow
    const cg = ctx.createRadialGradient(0, 0, 0, 0, 0, 14 + chg * 12);
    cg.addColorStop(0, `rgba(255,255,255,${0.7 + 0.3 * chg})`);
    cg.addColorStop(0.4, hexA(tier, 0.85 * chg));
    cg.addColorStop(1, hexA(tier, 0));
    ctx.fillStyle = cg;
    ctx.beginPath();
    ctx.arc(0, 0, 14 + chg * 12, 0, TAU);
    ctx.fill();
    ctx.restore();
  } else {
    // idle dim core
    ctx.fillStyle = hexA('#ffb43a', 0.35 + 0.15 * Math.sin(s.t * 4));
    ctx.beginPath();
    ctx.arc(0, 0, 4.5, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
  if (chg > 0.02) glow(ctx, mx, 0, 26 + 34 * chg, chg < 0.5 ? '#ffe08a' : '#fff2c4', 0.3 + 0.55 * chg);

  /* --- charge tank on the wrist --- */
  ctx.fillStyle = '#dfe5ec';
  rr(ctx, -100, 18, 46, 15, 6);
  ctx.fill();
  ctx.strokeStyle = 'rgba(30,40,55,.55)';
  ctx.lineWidth = 1.8;
  ctx.stroke();
  for (let i = 0; i < 4; i++) {
    const lit = clamp(chg * 4 - i * 0.85, 0, 1);
    ctx.fillStyle = hexA(i < 2 ? '#5cff6b' : i < 3 ? '#ffe600' : '#ff3b30', 0.14 + lit * 0.85);
    rr(ctx, -94 + i * 10, 21, 6, 9, 2);
    ctx.fill();
  }
  ctx.restore();
}


export const ART: Record<string, Draw> = {
  bow: drawBow,
  ak: (c, s) => rifle(c, s, { len: 250, wood: true }),
  rifle: (c, s) => rifle(c, s, { len: 244, suppressor: true }),
  rifleElectro: (c, s) => rifle(c, s, { len: 240, coils: true, accent: '#38e8ff', glowCore: 1 }),
  mp5: (c, s) => smg(c, s),
  mp5Electro: (c, s) => smg(c, s, '#7cf6ff'),
  sniper: (c, s) => rifle(c, s, { len: 300, scope: true, suppressor: true, accent: '#a7f3ff', glowCore: 0.8 }),
  dragon: dragonBreath,
  beretta: beretta,
  phaser: phaser,
  sword: energySword,
  caster: plasmacaster,
  disc: identityDisc,
  proton: protonWand,
  tripod: tripodRay,
  repulsor: repulsorHand,
  singularity: singularityCannon,
  tesla: teslaCoil,
  railgun: railgun,
  prism: prismaticLance,
  nanite: naniteHive,
  chrono: chronoDisruptor,
  cryo: cryoLance,
  sonic: sonoclasm,
  quantum: quantumRifle,
  acid: acidSprayer,
  buster: megaBuster,
};

export const clamp01 = clamp;
