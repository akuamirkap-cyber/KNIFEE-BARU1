import type { ProjKind } from '../weapons';
import { TAU, lin, radial, star } from './kit';

type C = CanvasRenderingContext2D;

function glowE(c: C, y: number, rx: number, ry: number, rgb: string, a: number) {
  c.save();
  c.globalCompositeOperation = 'lighter';
  const g = c.createRadialGradient(0, y, 1, 0, y, Math.max(rx, ry));
  g.addColorStop(0, `rgba(${rgb},${a})`);
  g.addColorStop(1, `rgba(${rgb},0)`);
  c.fillStyle = g;
  c.beginPath();
  c.ellipse(0, y, rx, ry, 0, 0, TAU);
  c.fill();
  c.restore();
}

export function drawProjectileExtra4(c: C, kind: ProjKind, len: number, t: number, embedded = false) {
  switch (kind) {
    // ---------------------------------------------------------- PHOTON SABER
    case 'photon_saber': {
      const pulse = 0.8 + 0.2 * Math.sin(t * 14);
      glowE(c, len / 2, 10, len * 0.6, '34,211,238', 0.6 * pulse);
      c.save();
      c.shadowColor = '#22d3ee';
      c.shadowBlur = 16 * pulse;
      c.beginPath();
      c.roundRect(-3.5, -1, 7, len, 3.5);
      c.fillStyle = lin(c, 0, 0, ['#ffffff', '#a5f3fc', '#22d3ee']);
      c.fill();
      c.restore();
      c.fillStyle = `rgba(255,255,255,${0.9 * pulse})`;
      c.beginPath();
      c.roundRect(-1.2, 1, 2.4, len - 2, 1.2);
      c.fill();
      break;
    }
    // ---------------------------------------------------------- GAUNTLET CANNON
    case 'gauntlet_cannon': {
      const pulse = 0.8 + 0.2 * Math.sin(t * 10);
      c.save();
      // Stuck Gauntlet is 20% larger ("yg nancep tu adl gauntlet jg dan lebihbesar 20 persen yg nancepnya")
      if (embedded) {
        c.scale(1.2, 1.2);
      }

      // Roaring rocket thruster flame & supersonic Mach shock-rings while flying
      if (!embedded) {
        glowE(c, 26, 20, 38, '249,115,22', 0.62 * pulse);
        // Outer crimson-orange thruster jet plume
        const jetLen = 24 + 7 * Math.sin(t * 36);
        const jetG = c.createLinearGradient(0, 50, 0, 52 + jetLen);
        jetG.addColorStop(0, 'rgba(255,255,255,0.95)');
        jetG.addColorStop(0.25, 'rgba(254,240,138,0.92)');
        jetG.addColorStop(0.6, 'rgba(249,115,22,0.78)');
        jetG.addColorStop(1, 'rgba(220,38,38,0)');
        c.fillStyle = jetG;
        c.beginPath();
        c.moveTo(-6.5, 51);
        c.quadraticCurveTo(-8.5, 51 + jetLen * 0.45, 0, 52 + jetLen);
        c.quadraticCurveTo(8.5, 51 + jetLen * 0.45, 6.5, 51);
        c.closePath();
        c.fill();

        // Inner white-hot thruster core
        c.fillStyle = '#ffffff';
        c.beginPath();
        c.moveTo(-3.2, 51);
        c.lineTo(0, 51 + jetLen * 0.52);
        c.lineTo(3.2, 51);
        c.closePath();
        c.fill();
      } else {
        // Warm pulsing aura around the embedded Gauntlet on the target rim
        glowE(c, 18, 18, 26, '249,115,22', 0.48 * pulse);
      }

      // ── 1. PEGANGAN / DARK GUNMETAL GRIP SLEEVE (width 18.4px: -9.2 .. +9.2) ──
      // Beveled bottom cap & glowing golden power port (y = 48 .. 53)
      c.beginPath();
      c.moveTo(-9.2, 48);
      c.lineTo(9.2, 48);
      c.lineTo(6.4, 52.5);
      c.quadraticCurveTo(0, 54.2, -6.4, 52.5);
      c.closePath();
      c.fillStyle = lin(c, -9.2, 9.2, ['#090d16', '#1e293b', '#475569', '#1e293b', '#090d16']);
      c.fill();
      c.strokeStyle = 'rgba(9,13,22,0.68)';
      c.lineWidth = 0.72;
      c.stroke();

      // Glowing golden bottom exhaust port
      c.beginPath();
      c.ellipse(0, 52.3, 4.6, 1.7, 0, 0, TAU);
      c.fillStyle = radial(c, 0, 52.3, 5, ['#ffffff', '#fef08a', '#facc15', '#d97706']);
      c.fill();

      // Cylindrical dark-slate / gunmetal grip body (y = 35 .. 49, width 18.4px)
      c.beginPath();
      c.roundRect(-9.2, 35, 18.4, 14, [2, 2, 3.5, 3.5]);
      c.fillStyle = lin(c, -9.2, 9.2, ['#0b101b', '#283548', '#64748b', '#475569', '#1e293b', '#090d16']);
      c.fill();
      c.strokeStyle = 'rgba(9,13,22,0.68)';
      c.lineWidth = 0.75;
      c.stroke();

      // Vertical glossy specular highlight on left of grip sleeve
      c.fillStyle = 'rgba(226,232,240,0.38)';
      c.fillRect(-6.8, 36.5, 2.5, 11.5);

      // Segmented metallic Gold Collar Ring around upper grip (y = 37 .. 42, width 19.6px)
      c.beginPath();
      c.roundRect(-9.8, 37, 19.6, 5, 1.4);
      c.fillStyle = lin(c, -9.8, 9.8, ['#78350f', '#d97706', '#fde047', '#fef9c3', '#f59e0b', '#92400e']);
      c.fill();
      c.strokeStyle = 'rgba(69,26,3,0.68)';
      c.lineWidth = 0.7;
      c.stroke();
      for (const nx of [-5.8, -1.9, 1.9, 5.8]) {
        c.fillStyle = 'rgba(120,53,15,0.7)';
        c.fillRect(nx - 0.9, 38, 1.8, 3);
      }

      // ── 2. DUAL SEGMENTED CRIMSON WRIST RINGS (+20% WIDER THAN GRIP!) ──
      const redGrad = (x0: number, x1: number) =>
        lin(c, x0, x1, ['#3b0707', '#991b1b', '#ef4444', '#fca5a5', '#dc2626', '#991b1b', '#2a0404']);

      // Lower crimson beveled wrist ring (y = 30.5 .. 35.5, width 22px)
      c.beginPath();
      c.roundRect(-11, 30.5, 22, 5, 2.2);
      c.fillStyle = redGrad(-11, 11);
      c.fill();
      c.strokeStyle = 'rgba(42,4,4,0.68)';
      c.lineWidth = 0.72;
      c.stroke();

      // Upper thick ribbed crimson cuff (y = 23.5 .. 30, width 23.6px)
      c.beginPath();
      c.roundRect(-11.8, 23.5, 23.6, 6.5, 2.6);
      c.fillStyle = redGrad(-11.8, 11.8);
      c.fill();
      c.strokeStyle = 'rgba(42,4,4,0.68)';
      c.lineWidth = 0.75;
      c.stroke();
      for (const sx of [-7.2, -2.4, 2.4, 7.2]) {
        c.fillStyle = 'rgba(69,10,10,0.8)';
        c.fillRect(sx - 1, 24.7, 2, 4.1);
      }

      // ── 3. MAIN FACETED CRIMSON GAUNTLET HEAD (y = 0 .. 23, width 23.2px — 26% wider than 18.4px grip!) ──
      const gw = 11.6;
      c.beginPath();
      c.moveTo(-8, 0);
      c.lineTo(8, 0);
      c.lineTo(gw, 4.5);
      c.lineTo(gw, 18.5);
      c.lineTo(9.4, 23);
      c.lineTo(-9.4, 23);
      c.lineTo(-gw, 18.5);
      c.lineTo(-gw, 4.5);
      c.closePath();
      c.fillStyle = redGrad(-gw, gw);
      c.fill();
      c.strokeStyle = 'rgba(42,4,4,0.68)';
      c.lineWidth = 0.8;
      c.stroke();

      // Sculpted top knuckle plates at the leading punch edge
      for (const kx of [-5.4, -1.8, 1.8, 5.4]) {
        c.fillStyle = '#7f1d1d';
        c.fillRect(kx - 1.4, 0.7, 2.8, 1.8);
      }

      // Left glossy highlight on crimson gauntlet head
      c.fillStyle = 'rgba(255,228,230,0.42)';
      c.beginPath();
      c.roundRect(-9.6, 4, 3.2, 16, 1.4);
      c.fill();

      // Two recessed lower cheek vents on left & right of gauntlet head
      for (const dir of [-1, 1] as const) {
        c.fillStyle = '#5c0f0f';
        c.strokeStyle = 'rgba(254,202,202,0.5)';
        c.lineWidth = 0.65;
        c.beginPath();
        c.roundRect(dir * 7.2 - 1.5, 16.2, 3, 4.6, 0.6);
        c.fill();
        c.stroke();
      }

      // ── 4. GOLD-RIMMED SOLAR REPULSOR CORE IN GAUNTLET PALM (y = 10.5, r = 6.8) ──
      const coreY = 10.5;
      // Outer metallic Gold Bezel Ring
      c.beginPath();
      c.arc(0, coreY, 6.8, 0, TAU);
      c.fillStyle = lin(c, -6.8, 6.8, ['#78350f', '#f59e0b', '#fef08a', '#facc15', '#d97706', '#78350f']);
      c.fill();
      c.strokeStyle = 'rgba(69,26,3,0.72)';
      c.lineWidth = 0.75;
      c.stroke();

      // Recessed crimson-orange inner ring
      c.beginPath();
      c.arc(0, coreY, 5.2, 0, TAU);
      c.fillStyle = radial(c, 0, coreY, 5.2, ['#fb923c', '#ea580c', '#991b1b']);
      c.fill();

      // Blazing white-hot to solar-gold repulsor core
      c.beginPath();
      c.arc(0, coreY, 3.9, 0, TAU);
      c.fillStyle = radial(c, -0.6, coreY - 0.6, 4.2, ['#ffffff', '#fef08a', '#facc15', '#f97316', '#dc2626']);
      c.shadowColor = '#facc15';
      c.shadowBlur = 12 * pulse;
      c.fill();
      c.shadowBlur = 0;

      // 4-point starburst gleam on upper-right of gold bezel
      star(c, 4.2, coreY - 4.6, 2.8 + pulse * 0.6, '#ffffff', 4);

      if (!embedded) {
        // Leading supersonic knuckle shock-arc & Mach ring during flight
        c.strokeStyle = `rgba(254,240,138,${0.82 * pulse})`;
        c.lineWidth = 1.6;
        c.beginPath();
        c.arc(0, 4, 13.5, Math.PI * 1.15, Math.PI * 1.85);
        c.stroke();

        c.strokeStyle = `rgba(251,146,60,${0.65 * pulse})`;
        c.lineWidth = 1.3;
        c.beginPath();
        c.ellipse(0, 28, 15.5, 4.2, 0, 0, TAU);
        c.stroke();
      } else {
        // Embedded impact shock-ring & crackling golden-red energy arcs at the target rim (y = 5.5)
        c.strokeStyle = `rgba(254,240,138,${0.85 * pulse})`;
        c.lineWidth = 1.8;
        c.beginPath();
        c.ellipse(0, 5.5, 14.5, 3.4, 0, 0, TAU);
        c.stroke();

        c.strokeStyle = `rgba(239,68,68,${0.75 * pulse})`;
        c.lineWidth = 1.2;
        c.beginPath();
        c.moveTo(-11, 5.5);
        c.lineTo(-16, 3.2);
        c.moveTo(11, 5.5);
        c.lineTo(16, 3.2);
        c.stroke();
      }

      c.restore();
      break;
    }
    // ---------------------------------------------------------- PULSE RIFLE
    case 'pulse_rifle': {
      const pulse = 0.8 + 0.2 * Math.sin(t * 16);
      glowE(c, len / 2, 8, len * 0.55, '56,189,248', 0.55 * pulse);
      // Peluru listrik dart
      c.beginPath();
      c.moveTo(0, -3);
      c.lineTo(4, 8);
      c.lineTo(2, len - 4);
      c.lineTo(-2, len - 4);
      c.lineTo(-4, 8);
      c.closePath();
      c.fillStyle = lin(c, -4, 4, ['#0c4a6e', '#bae6fd', '#38bdf8', '#0c4a6e']);
      c.fill();
      // Kilatan listrik
      c.strokeStyle = `rgba(255,255,255,${0.85 * pulse})`;
      c.lineWidth = 1.2;
      c.beginPath();
      c.moveTo(-3, 4); c.lineTo(3, 10);
      c.moveTo(3, 12); c.lineTo(-3, 18);
      c.stroke();
      break;
    }
    // ---------------------------------------------------------- CRYO BLASTER
    case 'cryo_blaster': {
      const pulse = 0.8 + 0.2 * Math.sin(t * 9);
      glowE(c, len / 2, 10, len * 0.6, '103,232,249', 0.55 * pulse);
      // Kristal es tajam
      c.beginPath();
      c.moveTo(0, -4);
      c.lineTo(6, 8);
      c.lineTo(3, len - 3);
      c.lineTo(-3, len - 3);
      c.lineTo(-6, 8);
      c.closePath();
      c.fillStyle = lin(c, -6, 6, ['#ffffff', '#cffafe', '#22d3ee', '#0e7490']);
      c.fill();
      c.strokeStyle = `rgba(255,255,255,${0.9 * pulse})`;
      c.lineWidth = 1;
      c.beginPath();
      c.moveTo(0, -4); c.lineTo(0, len - 4);
      c.moveTo(-6, 8); c.lineTo(6, 8);
      c.stroke();
      break;
    }
    // ---------------------------------------------------------- HYPERDRIVE
    case 'hyperdrive': {
      const pulse = 0.8 + 0.2 * Math.sin(t * 11);
      glowE(c, len / 2, 11, len * 0.6, '96,165,250', 0.6 * pulse);
      // Peluru berlubang (torus)
      c.beginPath();
      c.arc(0, len / 2, Math.min(8, len * 0.4), 0, TAU);
      c.fillStyle = radial(c, 0, len / 2, Math.min(8, len * 0.4), ['#ffffff', '#bfdbfe', '#3b82f6', '#1e3a8a']);
      c.shadowColor = '#60a5fa';
      c.shadowBlur = 14;
      c.fill();
      c.shadowBlur = 0;
      c.fillStyle = 'rgba(30,58,138,0.9)';
      c.beginPath();
      c.arc(0, len / 2, Math.min(3.5, len * 0.18), 0, TAU);
      c.fill();
      break;
    }
    // ---------------------------------------------------------- QUANTUM DESTABILIZER
    case 'quantum_destabilizer': {
      const pulse = 0.75 + 0.25 * Math.sin(t * 12);
      glowE(c, len / 2, 10, len * 0.6, '168,85,247', 0.6 * pulse);
      // Bola portal ungu dengan cincin
      c.beginPath();
      c.arc(0, len / 2, Math.min(8, len * 0.42), 0, TAU);
      c.fillStyle = radial(c, 0, len / 2, Math.min(8, len * 0.42), ['#ffffff', '#e9d5ff', '#a855f7', '#4c1d95']);
      c.shadowColor = '#a855f7';
      c.shadowBlur = 14;
      c.fill();
      c.shadowBlur = 0;
      // Cincin berputar
      c.save();
      c.translate(0, len / 2);
      c.rotate(t * 4);
      c.strokeStyle = `rgba(233,213,255,${0.9 * pulse})`;
      c.lineWidth = 1.4;
      c.beginPath();
      c.ellipse(0, 0, 11, 4, 0, 0, TAU);
      c.stroke();
      c.restore();
      // Pusat hitam
      c.fillStyle = '#000';
      c.beginPath();
      c.arc(0, len / 2, 3, 0, TAU);
      c.fill();
      break;
    }
    default:
      star(c, 0, len / 2, 6, '#fff');
  }
}
