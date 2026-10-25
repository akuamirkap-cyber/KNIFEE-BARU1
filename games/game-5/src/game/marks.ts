import { TAU, clamp, metal, roundRect, withAlpha } from './core';
import type { Mark } from './types';

type Ctx = CanvasRenderingContext2D;

function oval(ctx: Ctx, x: number, y: number, rx: number, ry: number, fill: string | CanvasGradient) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, TAU);
  ctx.fillStyle = fill;
  ctx.fill();
}

function line(ctx: Ctx, points: number[], color: string, width = 1) {
  ctx.beginPath();
  ctx.moveTo(points[0], points[1]);
  for (let i = 2; i < points.length; i += 2) ctx.lineTo(points[i], points[i + 1]);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke();
}

function softLight(ctx: Ctx, x: number, y: number, radius: number, color: string, alpha: number) {
  if (alpha < 0.008) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const glow = ctx.createRadialGradient(x, y, 0, x, y, radius);
  glow.addColorStop(0, withAlpha(color, alpha));
  glow.addColorStop(0.4, withAlpha(color, alpha * 0.35));
  glow.addColorStop(1, withAlpha(color, 0));
  oval(ctx, x, y, radius, radius, glow);
  ctx.restore();
}

// Local +X faces out of the wheel. Scars sit on the wood, not floating outside the rim.
function rimDent(ctx: Ctx, halfWidth: number, tint = '#a8a093') {
  ctx.beginPath();
  ctx.moveTo(1, -halfWidth);
  ctx.quadraticCurveTo(-5, -halfWidth * 0.65, -6, 0);
  ctx.quadraticCurveTo(-5, halfWidth * 0.65, 1, halfWidth);
  ctx.lineTo(2.2, halfWidth * 0.6);
  ctx.quadraticCurveTo(-1, 0, 2.2, -halfWidth * 0.6);
  ctx.closePath();
  ctx.fillStyle = '#20272b';
  ctx.fill();
  ctx.strokeStyle = withAlpha(tint, 0.62);
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.moveTo(1, -halfWidth);
  ctx.quadraticCurveTo(-4, -halfWidth * 0.5, -4.5, 0);
  ctx.stroke();
}

function bulletScar(ctx: Ctx, m: Mark) {
  const rifle = m.weapon.id === 'rifle';
  const smg = m.weapon.id === 'mp5';
  const scale = rifle ? 1.1 : smg ? 0.76 : m.weapon.id === 'beretta92' ? 0.83 : 0.94;
  const heat = Math.exp(-m.age * 3.2);
  rimDent(ctx, 4.6 * scale);
  ctx.save();
  ctx.translate(-12, 0);
  ctx.rotate(Math.sin(m.seed * 3.1) * 0.14);
  ctx.scale(scale, scale);
  // A directional, torn entry wound with a beveled wood lip and a copper slug.
  ctx.beginPath();
  ctx.moveTo(8, -2.6);
  ctx.bezierCurveTo(2, -6.4, -4.4, -6.2, -8, -3.2);
  ctx.lineTo(-11, -1.7);
  ctx.lineTo(-8.5, -0.6);
  ctx.bezierCurveTo(-9.5, 6.2, 2, 6, 7.6, 2.4);
  ctx.closePath();
  const bevel = ctx.createLinearGradient(0, -6, 0, 6);
  bevel.addColorStop(0, '#4c2c15');
  bevel.addColorStop(0.5, '#1c120d');
  bevel.addColorStop(1, '#dcab69');
  ctx.fillStyle = bevel;
  ctx.fill();
  oval(ctx, -0.5, -0.4, 6.3, 4.1, '#130f0d');
  line(ctx, [-8, -1, -12, -0.2, -15, -1], 'rgba(50,28,13,0.55)', 0.8);
  ctx.beginPath();
  ctx.ellipse(-0.7, -0.2, 4.6, 3.1, 0, Math.PI * 0.03, Math.PI * 0.86);
  ctx.strokeStyle = '#c39b61';
  ctx.lineWidth = 1;
  ctx.stroke();
  oval(ctx, 2.6, 0.4, rifle ? 2.2 : 1.5, 2.2, metal(ctx, -2, 3, '#ffdc9d', '#ac7336', '#53301c'));
  line(ctx, [2.6, -1, 3.4, 0.6], '#f6d5a0', 0.7);
  softLight(ctx, 0, 0, 11, '#ffaf59', heat * 0.4);
  ctx.restore();
}

function arrowScar(ctx: Ctx, m: Mark) {
  rimDent(ctx, 4.5);
  oval(ctx, -7, 0, 6, 3.8, '#332112');
  line(ctx, [-15, -0.8, -7, -1.5, -3, 0], '#7f542b', 1.1);
  ctx.save();
  ctx.rotate(Math.sin(m.age * 42) * Math.exp(-m.age * 6) * 0.065);
  ctx.fillStyle = 'rgba(12,9,7,0.25)';
  roundRect(ctx, -6, 2, 49, 2.6, 1);
  ctx.fill();
  roundRect(ctx, -7, -1.5, 55, 3, 1.4);
  ctx.fillStyle = metal(ctx, -1.5, 1.5, '#f4e3bb', '#b89556', '#68451f');
  ctx.fill();
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(31, side * 1);
    ctx.quadraticCurveTo(35, side * 8.5, 46, side * 6.2);
    ctx.lineTo(48, side * 1.1);
    ctx.closePath();
    ctx.fillStyle = side === -1 ? '#b8352c' : '#e9dfcb';
    ctx.fill();
    line(ctx, [34, side * 2, 43, side * 5], side === -1 ? '#ef9582' : '#fff5db', 0.65);
  }
  for (let i = 0; i < 3; i++) line(ctx, [29 + i * 2, -1.4, 29 + i * 2, 1.4], '#79653d', 0.65);
  line(ctx, [48, -1.5, 51, -1.5, 51, 1.5, 48, 1.5], '#d7d6c4', 1);
  ctx.restore();
}

function ionScar(ctx: Ctx, m: Mark) {
  const large = m.weapon.id === 'rifleElectro';
  const color = large ? '#6edbed' : '#c8a2ef';
  const hot = Math.exp(-m.age * 1.6);
  rimDent(ctx, large ? 8 : 6, color);
  ctx.save();
  ctx.translate(-13, 0);
  const h = large ? 12 : 8.6;
  ctx.beginPath();
  ctx.moveTo(1, -h);
  ctx.lineTo(7, -h * 0.43);
  ctx.lineTo(7, h * 0.43);
  ctx.lineTo(1, h);
  ctx.lineTo(-7, h * 0.54);
  ctx.lineTo(-8.5, -h * 0.35);
  ctx.closePath();
  ctx.fillStyle = '#152529';
  ctx.fill();
  ctx.strokeStyle = withAlpha(color, 0.64);
  ctx.lineWidth = 1.3;
  ctx.stroke();
  line(ctx, [-2, -h * 0.69, 1.2, -3, -3.5, 1, 1, h * 0.65], withAlpha(color, 0.72 + hot * 0.25), 1.6);
  line(ctx, [4.6, -3.2, 4.6, 3.2], large ? '#b9ebee' : '#ead6f8', 0.8);
  softLight(ctx, 0, 0, 14, color, hot * 0.32);
  ctx.restore();
}

function beamScar(ctx: Ctx, m: Mark) {
  const photon = m.weapon.id === 'sniperBeam';
  const color = photon ? '#b6e8fa' : '#f4b36b';
  const heat = Math.exp(-m.age * 1.1);
  rimDent(ctx, photon ? 6.5 : 5.5, color);
  ctx.save();
  ctx.translate(-13, 0);
  oval(ctx, -0.5, 0, photon ? 7.5 : 8.5, photon ? 12.5 : 9, '#392a22');
  oval(ctx, -1, 0, photon ? 5.5 : 6.5, photon ? 10.6 : 7, '#101b20');
  ctx.beginPath();
  ctx.ellipse(-1, 0, photon ? 5.6 : 6.6, photon ? 10.7 : 7.1, 0, -1.75, 1.7);
  ctx.strokeStyle = withAlpha(color, 0.65 + heat * 0.3);
  ctx.lineWidth = photon ? 1.7 : 1.4;
  ctx.stroke();
  if (photon) {
    line(ctx, [-2, -8.2, -2, 8.2], withAlpha('#e4faff', 0.35 + heat * 0.65), 1.4);
  } else {
    oval(ctx, -2, 0, 2.5, 4, withAlpha('#ffcf83', 0.25 + heat * 0.55));
  }
  softLight(ctx, -1, 0, 16, color, heat * 0.28);
  ctx.restore();
}

function burnedScar(ctx: Ctx, m: Mark, time: number) {
  const martian = m.weapon.id === 'tripod';
  const color = martian ? '#d2e890' : '#f5a054';
  const heat = Math.exp(-m.age * (martian ? 0.55 : 0.75));
  rimDent(ctx, martian ? 10 : 9, '#a58859');
  ctx.save();
  ctx.translate(-14, 0);
  ctx.beginPath();
  ctx.moveTo(8, -10);
  ctx.bezierCurveTo(-3, -16, -14, -9, -18, -1);
  ctx.quadraticCurveTo(-12, 9, -1, 14);
  ctx.quadraticCurveTo(10, 12, 9, 1);
  ctx.closePath();
  const char = ctx.createLinearGradient(-15, 0, 7, 0);
  char.addColorStop(0, '#59341e');
  char.addColorStop(0.32, '#302319');
  char.addColorStop(1, '#17191a');
  ctx.fillStyle = char;
  ctx.fill();
  ctx.strokeStyle = 'rgba(126,81,40,0.8)';
  ctx.lineWidth = 1.1;
  ctx.stroke();
  if (martian) {
    ctx.beginPath();
    ctx.ellipse(0, 0, 6.5, 12, 0, -1.85, 1.55);
    ctx.strokeStyle = withAlpha(color, 0.45 + heat * 0.5);
    ctx.lineWidth = 2.3;
    ctx.stroke();
    line(ctx, [-5, -5, 1, -2, 2, 7], withAlpha('#f2dd99', 0.3 + heat * 0.5), 1);
  } else {
    // The narrow glowing seams are charred wood grain, not radiating tendrils.
    for (let i = 0; i < 3; i++) {
      const y = -7 + i * 6;
      const flicker = 0.86 + 0.14 * Math.sin(time * 4 + m.seed + i);
      line(ctx, [-10 + i, y - 2, -4, y, 3, y + 1], withAlpha(color, (0.35 + heat * 0.55) * flicker), 1.25);
    }
  }
  softLight(ctx, -1, 0, 18, color, heat * 0.28);
  ctx.restore();
}

function slashScar(ctx: Ctx, m: Mark) {
  const disc = m.weapon.id === 'identityDisc';
  const color = disc ? '#66d7e5' : '#91e8ec';
  const heat = Math.exp(-m.age * 1.25);
  rimDent(ctx, disc ? 8 : 10, color);
  ctx.save();
  ctx.translate(-12, 0);
  ctx.rotate(disc ? 0.22 : -0.26);
  // A clean cutting groove stays dark and legible once the initial glow cools.
  ctx.beginPath();
  ctx.moveTo(0, -16);
  ctx.bezierCurveTo(-6, -6, -7, 8, 0, 16);
  ctx.bezierCurveTo(3, 4, 3, -8, 0, -16);
  ctx.closePath();
  ctx.fillStyle = '#112529';
  ctx.fill();
  ctx.strokeStyle = '#2a4140';
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-0.2, -14.4);
  ctx.bezierCurveTo(-4.5, -5, -5, 7, -0.2, 14.4);
  ctx.strokeStyle = withAlpha(color, 0.65 + heat * 0.35);
  ctx.lineWidth = 1.7;
  ctx.stroke();
  if (disc) {
    ctx.beginPath();
    ctx.ellipse(-1, 0, 7.5, 13, 0, -1.4, 1.3);
    ctx.strokeStyle = 'rgba(107,205,216,0.68)';
    ctx.lineWidth = 1.05;
    ctx.stroke();
    line(ctx, [4, -7, 6, -7, 6, -3], '#b6e5de', 1);
  } else {
    line(ctx, [-3, -9, -1, 0, -3, 8], withAlpha('#d8c4fa', 0.55 + heat * 0.4), 0.8);
  }
  softLight(ctx, -2, 0, 15, color, heat * 0.3);
  ctx.restore();
}

function plasmaScar(ctx: Ctx, m: Mark) {
  const predator = m.weapon.id === 'predatorShoulder';
  const repulsor = m.weapon.id === 'repulsor';
  const color = predator ? '#83d9ff' : repulsor ? '#b2e6ed' : '#8eb7ea';
  const heat = Math.exp(-m.age * 1.05);
  rimDent(ctx, predator ? 10 : 8.5, color);
  ctx.save();
  ctx.translate(predator ? -15 : -13, 0);
  const size = predator ? 12 : repulsor ? 10.5 : 10;
  oval(ctx, 0, 0, size, size * 1.15, '#4c392e');
  oval(ctx, -1, 0, size - 1.5, size * 1.15 - 1.5, '#19252c');
  ctx.beginPath();
  ctx.ellipse(-1, 0, size - 1.2, size * 1.15 - 1.2, 0, -2.9, 0.9);
  ctx.strokeStyle = withAlpha(color, 0.62 + heat * 0.3);
  ctx.lineWidth = 1.8;
  ctx.stroke();
  if (repulsor) {
    // Concentric pressure rings are cut into the surface, rather than floating bubbles.
    ctx.beginPath();
    ctx.ellipse(-1, 0, 5.5, 6.8, 0, 0, TAU);
    ctx.strokeStyle = withAlpha('#b8e2e4', 0.44 + heat * 0.35);
    ctx.lineWidth = 1;
    ctx.stroke();
    oval(ctx, -1, 0, 2.8, 3.2, withAlpha('#e0f4ed', 0.22 + heat * 0.52));
  } else if (predator) {
    for (let i = 0; i < 3; i++) {
      const a = i * TAU / 3;
      const x = -1 + Math.cos(a) * 4;
      const y = Math.sin(a) * 4;
      oval(ctx, x, y, 1.55, 1.65, withAlpha('#b5edff', 0.5 + heat * 0.45));
    }
    ctx.beginPath();
    ctx.moveTo(-6, -4);
    ctx.quadraticCurveTo(1, -8, 5, 1);
    ctx.strokeStyle = 'rgba(72,150,196,0.68)';
    ctx.lineWidth = 1.3;
    ctx.stroke();
  } else {
    line(ctx, [-4, -6, -1, -3, -2, 1, 3, 5], withAlpha('#92bae8', 0.4 + heat * 0.45), 1.8);
  }
  softLight(ctx, -1, 0, 19, color, heat * 0.3);
  ctx.restore();
}

function protonScar(ctx: Ctx, m: Mark) {
  rimDent(ctx, 8.5, '#e7b56b');
  ctx.save();
  ctx.translate(-13, 0);
  ctx.beginPath();
  ctx.moveTo(4, -12);
  ctx.bezierCurveTo(-8, -11, -10, -5, -6, 0);
  ctx.bezierCurveTo(-1, 5, -3, 12, 5, 13);
  ctx.quadraticCurveTo(10, 4, 5, -1);
  ctx.quadraticCurveTo(0, -5, 4, -12);
  ctx.closePath();
  ctx.fillStyle = '#332521';
  ctx.fill();
  const heat = Math.exp(-m.age * 1.15);
  ctx.beginPath();
  ctx.moveTo(0, -10);
  ctx.bezierCurveTo(-10, -3, 7, 1, 1, 11);
  ctx.strokeStyle = withAlpha('#eda65c', 0.65 + heat * 0.3);
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-3, -9);
  ctx.bezierCurveTo(3, -4, -6, 4, 4, 9);
  ctx.strokeStyle = withAlpha('#dba2ab', 0.5 + heat * 0.4);
  ctx.lineWidth = 1;
  ctx.stroke();
  softLight(ctx, -1, 0, 17, '#f7c170', heat * 0.28);
  ctx.restore();
}

export function drawWeaponMark(ctx: Ctx, mark: Mark, time: number) {
  ctx.save();
  const scale = clamp(mark.size / mark.weapon.markSize, 0.6, 1.3);
  ctx.scale(scale, scale);
  switch (mark.weapon.id) {
    case 'bow': arrowScar(ctx, mark); break;
    case 'ak47':
    case 'rifle':
    case 'mp5':
    case 'beretta92': bulletScar(ctx, mark); break;
    case 'rifleElectro':
    case 'mp5Electro': ionScar(ctx, mark); break;
    case 'sniperBeam':
    case 'phaser': beamScar(ctx, mark); break;
    case 'dragonBreath':
    case 'tripod': burnedScar(ctx, mark, time); break;
    case 'energySword':
    case 'identityDisc': slashScar(ctx, mark); break;
    case 'protonPack': protonScar(ctx, mark); break;
    default: plasmaScar(ctx, mark); break;
  }
  ctx.restore();
}

export const MARK_DESCRIPTIONS: Record<string, string> = {
  bow: 'Panah tertanam, bulu merah-putih',
  ak47: 'Sobekan kayu dan inti tembaga',
  rifle: 'Lubang penetrasi bertepi kuningan',
  beretta92: 'Takik 9mm dan serpihan tembaga',
  mp5: 'Lubang kecil dengan bibir kayu',
  rifleElectro: 'Fusi kayu biru dengan jejak ion',
  mp5Electro: 'Sayatan ion ungu yang mendingin',
  sniperBeam: 'Lubang presisi bertepi foton',
  dragonBreath: 'Arang tersapu dengan bara halus',
  phaser: 'Luka bakar nadion berwarna amber',
  energySword: 'Sayatan plasma tipis dua warna',
  plasmacaster: 'Kawah plasma berlapis biru',
  identityDisc: 'Goresan sabit neon permanen',
  protonPack: 'Guratan partikel oranye-merah',
  tripod: 'Kayu tervitrifikasi oleh heat-ray',
  repulsor: 'Cekungan tekanan bercincin halus',
  predatorShoulder: 'Kawah plasma dengan tiga titik inti',
};