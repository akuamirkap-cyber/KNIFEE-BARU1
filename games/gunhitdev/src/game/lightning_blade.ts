/* =========================================================================
   PATH BUILDER FOR BOLD HALILINTAR BLADE (BILAH PETIR PUSAKA)
   Digambar sebagai bilah energi padat dengan lekuk zig-zag petir tajam,
   lengkap dengan facet 3D, inti plasma putih, dan sayap petir kencana.
   ========================================================================= */

import { sparkle, TAU } from "./weapons";

/**
 * Menggambar Bilah Petir Padat (Lightning Dagger / Zeus Thunderbolt Blade)
 * Origin (0,0):
 * - Hidung/ujung mata petir menunjuk ke -Y (atau tertancap ke -Y)
 * - Pangkal/ekor petir berada di +Y
 *
 * @param ctx Canvas context
 * @param len Panjang total bilah petir (misal 48 untuk stuck, 56 untuk bullet)
 * @param maxW Lebar maksimal bilah (misal 14px)
 * @param t Waktu animasi untuk denyut plasma
 */
export function drawHalilintarBlade(
  ctx: CanvasRenderingContext2D,
  tipY: number,
  tailY: number,
  maxW: number,
  t = 0,
  isStuck = false
) {
  ctx.save();

  // Hitung proporsi
  const hw = maxW * 0.5;
  const midY = (tipY + tailY) * 0.1;

  // 1. AURA BLOOM HALUS (Zero shadowBlur - pure additive multi-pass)
  ctx.save();
  ctx.globalCompositeOperation = "lighter";

  // Gradient aura luar
  const auraGrad = ctx.createLinearGradient(0, tipY - 8, 0, tailY + 8);
  auraGrad.addColorStop(0, "rgba(77, 238, 234, 0.45)");
  auraGrad.addColorStop(0.5, "rgba(255, 208, 86, 0.35)");
  auraGrad.addColorStop(1, "rgba(77, 238, 234, 0.2)");

  // Outline petir tebal sebagai bloom luar
  ctx.strokeStyle = auraGrad;
  ctx.lineWidth = maxW + 8;
  ctx.lineCap = "round";
  ctx.lineJoin = "miter";
  ctx.miterLimit = 3;
  buildLightningPolygon(ctx, tipY, tailY, hw + 1);
  ctx.stroke();

  // Bloom sekunder cyan terang
  ctx.strokeStyle = "rgba(77, 238, 234, 0.55)";
  ctx.lineWidth = maxW + 2;
  ctx.stroke();
  ctx.restore();

  // 2. BADAN BILAH PETIR PADAT (SOLID ENERGY BODY)
  // Sisi kiri (bayangan cyan-teal berbobot)
  ctx.save();
  buildLightningHalfPolygon(ctx, tipY, tailY, hw, -1);
  const leftGrad = ctx.createLinearGradient(-hw, tipY, 0, tailY);
  leftGrad.addColorStop(0, "#ffffff");
  leftGrad.addColorStop(0.25, "#30c7c3");
  leftGrad.addColorStop(0.65, "#d49e24");
  leftGrad.addColorStop(1, "#1b8a87");
  ctx.fillStyle = leftGrad;
  ctx.fill();

  // Sisi kanan (cahaya cyan-emas berkilau)
  buildLightningHalfPolygon(ctx, tipY, tailY, hw, 1);
  const rightGrad = ctx.createLinearGradient(0, tipY, hw, tailY);
  rightGrad.addColorStop(0, "#ffffff");
  rightGrad.addColorStop(0.25, "#aff8ff");
  rightGrad.addColorStop(0.6, "#ffe57e");
  rightGrad.addColorStop(1, "#4deeea");
  ctx.fillStyle = rightGrad;
  ctx.fill();
  ctx.restore();

  // 3. TULANG PUNGGUNG PUTIH PANAS (WHITE HOT SPINE)
  ctx.save();
  ctx.globalCompositeOperation = "lighter";

  // Tulang tengah zig-zag
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 2.4;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(0, tipY);
  ctx.lineTo(-hw * 0.2, tipY * 0.5);
  ctx.lineTo(hw * 0.25, midY);
  ctx.lineTo(-hw * 0.15, tailY * 0.6);
  ctx.lineTo(0, tailY - 4);
  ctx.stroke();

  // Inti neon tipis super terang
  ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
  ctx.lineWidth = 1.0;
  ctx.stroke();

  // Tepi luar bergaris emas tajam
  ctx.strokeStyle = "rgba(255, 245, 210, 0.95)";
  ctx.lineWidth = 1.1;
  ctx.lineJoin = "miter";
  ctx.miterLimit = 4;
  buildLightningPolygon(ctx, tipY, tailY, hw);
  ctx.stroke();
  ctx.restore();

  // 4. SAYAP / SIRIP PETIR DI PANGKAL BELAKANG (TAIL GUARD)
  ctx.save();
  ctx.translate(0, tailY);
  ctx.beginPath();
  ctx.moveTo(0, -6);
  ctx.lineTo(hw * 1.35, 4);
  ctx.lineTo(hw * 0.4, 3);
  ctx.lineTo(0, 7);
  ctx.lineTo(-hw * 0.4, 3);
  ctx.lineTo(-hw * 1.35, 4);
  ctx.closePath();

  const guardGrad = ctx.createLinearGradient(-hw, -6, hw, 7);
  guardGrad.addColorStop(0, "#ffe57e");
  guardGrad.addColorStop(0.5, "#ffffff");
  guardGrad.addColorStop(1, "#ffd056");
  ctx.fillStyle = guardGrad;
  ctx.fill();

  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 0.9;
  ctx.stroke();

  // Permata plasma di ujung pangkal
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(0, 4, 2.2, 0, TAU);
  ctx.fill();

  const pulse = Math.sin(t * 15) * 1.5;
  sparkle(ctx, 0, 4, 6 + pulse, 0.85, "#4deeea");
  ctx.restore();

  // 5. MATA PETIR DEPAN (SPARKLE DI PUCUK)
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  sparkle(ctx, 0, tipY, 8, 0.95, "#ffffff");
  sparkle(ctx, 0, tipY + 4, 5, 0.8, "#4deeea");
  ctx.restore();

  // 6. JIKA STUCK: TAMBAHKAN MEDAN SENGATAN LISTRIK DI SEKITAR BILAH
  if (isStuck) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const flicker = Math.sin(t * 22);

    // Busur kilat mikro menari di antara lekuk bilah
    if (flicker > 0) {
      ctx.strokeStyle = "rgba(77, 238, 234, 0.85)";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(-hw, midY);
      ctx.lineTo(-hw - 5, midY + 4);
      ctx.lineTo(-hw - 2, midY + 10);
      ctx.lineTo(-hw * 0.5, tailY * 0.5);
      ctx.stroke();
    } else {
      ctx.strokeStyle = "rgba(255, 208, 86, 0.85)";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(hw, tipY * 0.4);
      ctx.lineTo(hw + 6, tipY * 0.4 + 6);
      ctx.lineTo(hw + 2, tipY * 0.4 + 12);
      ctx.lineTo(hw * 0.5, midY);
      ctx.stroke();
    }
    ctx.restore();
  }

  ctx.restore();
}

/**
 * Path poligon penuh bilah petir zig-zag berkarakter
 */
function buildLightningPolygon(
  ctx: CanvasRenderingContext2D,
  tipY: number,
  tailY: number,
  hw: number
) {
  const span = tailY - tipY;
  ctx.beginPath();
  ctx.moveTo(0, tipY); // Ujung depan runcing

  // Sisi kanan (zig-zag bertingkat tajam)
  ctx.lineTo(hw * 0.75, tipY + span * 0.18);
  ctx.lineTo(hw * 0.35, tipY + span * 0.28);
  ctx.lineTo(hw * 1.0, tipY + span * 0.52); // Sayap petir tengah tajam
  ctx.lineTo(hw * 0.45, tipY + span * 0.65);
  ctx.lineTo(hw * 0.85, tipY + span * 0.85);
  ctx.lineTo(hw * 0.3, tailY);

  // Ekor belakang
  ctx.lineTo(-hw * 0.3, tailY);

  // Sisi kiri (zig-zag terbalik)
  ctx.lineTo(-hw * 0.85, tipY + span * 0.85);
  ctx.lineTo(-hw * 0.45, tipY + span * 0.65);
  ctx.lineTo(-hw * 1.0, tipY + span * 0.52);
  ctx.lineTo(-hw * 0.35, tipY + span * 0.28);
  ctx.lineTo(-hw * 0.75, tipY + span * 0.18);

  ctx.closePath();
}

/**
 * Path separuh kiri (-1) atau kanan (1) untuk pencahayaan 3D bilateral
 */
function buildLightningHalfPolygon(
  ctx: CanvasRenderingContext2D,
  tipY: number,
  tailY: number,
  hw: number,
  side: -1 | 1
) {
  const span = tailY - tipY;
  const s = side;
  ctx.beginPath();
  ctx.moveTo(0, tipY);

  // Tulang tengah
  ctx.lineTo(-hw * 0.2 * s, tipY + span * 0.3);
  ctx.lineTo(hw * 0.25 * s, tipY + span * 0.55);
  ctx.lineTo(-hw * 0.15 * s, tipY + span * 0.8);
  ctx.lineTo(0, tailY);

  // Tepi luar
  ctx.lineTo(hw * 0.3 * s, tailY);
  ctx.lineTo(hw * 0.85 * s, tipY + span * 0.85);
  ctx.lineTo(hw * 0.45 * s, tipY + span * 0.65);
  ctx.lineTo(hw * 1.0 * s, tipY + span * 0.52);
  ctx.lineTo(hw * 0.35 * s, tipY + span * 0.28);
  ctx.lineTo(hw * 0.75 * s, tipY + span * 0.18);

  ctx.closePath();
}
