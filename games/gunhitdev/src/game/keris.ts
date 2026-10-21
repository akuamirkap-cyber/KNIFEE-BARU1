import {
  Weapon,
  rgba,
  TAU,
  sparkle,
} from "./weapons";
import { drawHalilintarBlade } from "./lightning_blade";

/* -------------------------------------------------------------------------
   Bilah Keris Luk 7 GAGAH, TEBAL, & BERBOBOT (Pusaka Sakti Nusantara)
   Lebar pangkal 24px, lekukan luk 7 mantap berbobot.
   Mulai dari y = -28 (atas ganja) sampai y = -158 (pucuk bilah tajam).
   ------------------------------------------------------------------------- */
export function buildKerisWilahPath(
  ctx: CanvasRenderingContext2D,
  len = 130,
  baseW = 24,
  midW = 16,
  tipW = 5.5,
  luk = 7
) {
  const steps = 48;
  const left: [number, number][] = [];
  const right: [number, number][] = [];

  for (let i = 0; i <= steps; i++) {
    const u = i / steps; // 0 = pangkal ganja, 1 = pucuk
    const y = -u * len;
    // Lekukan Luk empu Jawa berwibawa: ombak gagah, tirus anggun ke pucuk
    const amp = Math.sin(u * Math.PI) * 7.0 * (1 - u * 0.28);
    const wave = Math.sin(u * Math.PI * luk) * amp;

    // Lebar bilah tebal dan proporsional (tirus bertahap)
    let w: number;
    if (u < 0.5) {
      const f = u / 0.5;
      w = baseW * (1 - f) + midW * f;
    } else {
      const f = (u - 0.5) / 0.5;
      w = midW * (1 - f) + tipW * f;
    }
    const hw = w * 0.5;

    left.push([wave - hw, y]);
    right.push([wave + hw, y]);
  }

  ctx.beginPath();
  ctx.moveTo(left[0][0], left[0][1]);
  for (let i = 1; i < left.length; i++) ctx.lineTo(left[i][0], left[i][1]);
  // Pucuk tajam runcing
  ctx.lineTo(0, -len - 5);
  for (let i = right.length - 1; i >= 0; i--) ctx.lineTo(right[i][0], right[i][1]);
  ctx.closePath();
}

/**
 * Garis tulang punggung bilah (Ada-ada) 3D yang tebal dan memantulkan cahaya
 */
export function buildKerisSpinePath(
  ctx: CanvasRenderingContext2D,
  len = 130,
  luk = 7
) {
  const steps = 40;
  ctx.beginPath();
  for (let i = 0; i <= steps; i++) {
    const u = i / steps;
    const y = -u * len;
    const amp = Math.sin(u * Math.PI) * 7.0 * (1 - u * 0.28);
    const wave = Math.sin(u * Math.PI * luk) * amp;
    if (i === 0) ctx.moveTo(wave, y);
    else ctx.lineTo(wave, y);
  }
}

/* -------------------------------------------------------------------------
   HULU (Gagang Pegangan Deder Ksatria Jawa Klasik)
   Bentuk melengkung ergonomis, pas di genggaman tangan
   Terletak di bagian bawah: y = 2 hingga y = 46
   ------------------------------------------------------------------------- */
export function drawKerisHulu(ctx: CanvasRenderingContext2D, t: number) {
  ctx.save();

  // Bayangan halus di bawah gagang
  ctx.fillStyle = "rgba(0,0,0,0.38)";
  ctx.beginPath();
  ctx.ellipse(0, 48, 14, 4.5, 0, 0, TAU);
  ctx.fill();

  // Siluet hulu keris Jawa gagah (Deder Tunggak Semi Surakarta)
  // Lebar ~18-20px proporsional dan mantap digenggam
  ctx.beginPath();
  ctx.moveTo(-7.5, 2); // Leher atas pas di bawah mendak
  ctx.bezierCurveTo(-10, 10, -11.5, 20, -10.5, 28);
  ctx.bezierCurveTo(-10, 36, -12.5, 42, -8.5, 45.5);
  ctx.bezierCurveTo(-4, 47.5, 4, 47.5, 8.5, 45.5); // Bonggol bawah melengkung
  ctx.bezierCurveTo(12, 42, 10.5, 34, 10, 26);
  ctx.bezierCurveTo(9.5, 18, 9, 10, 7.5, 2);
  ctx.closePath();

  // Warna kayu pusaka Tayuman tua dengan serat tembaga emas
  const woodGrad = ctx.createLinearGradient(-10, 2, 10, 46);
  woodGrad.addColorStop(0, "#2c1706");
  woodGrad.addColorStop(0.25, "#4e2b0d");
  woodGrad.addColorStop(0.5, "#7a4616");
  woodGrad.addColorStop(0.75, "#422409");
  woodGrad.addColorStop(1, "#1a0d03");
  ctx.fillStyle = woodGrad;
  ctx.fill();

  ctx.strokeStyle = "#120802";
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // Ukiran serat kayu dan sabuk kawat emas (Cecek Werut)
  ctx.save();
  ctx.clip();

  // Garis serat kayu halus
  ctx.strokeStyle = "rgba(255, 217, 121, 0.18)";
  ctx.lineWidth = 0.85;
  for (let k = 0; k < 6; k++) {
    const yOff = 8 + k * 6.5;
    ctx.beginPath();
    ctx.moveTo(-11, yOff);
    ctx.quadraticCurveTo(0, yOff + 3, 11, yOff - 1);
    ctx.stroke();
  }

  // 3 Cincin kawat emas hulu (Cecek Werut)
  const rings = [13, 23, 33];
  for (const ry of rings) {
    ctx.fillStyle = "rgba(255, 215, 100, 0.82)";
    ctx.beginPath();
    ctx.ellipse(0, ry, 8.4, 2.4, -0.05, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = "#381f03";
    ctx.lineWidth = 0.7;
    ctx.stroke();
  }

  // Kilau specular lembut saat idle
  const sweep = ((t * 0.32) % 2.2) - 0.5;
  if (sweep >= 0 && sweep <= 1) {
    const sy = 2 + sweep * 44;
    ctx.globalCompositeOperation = "lighter";
    const sweepG = ctx.createLinearGradient(0, sy - 8, 0, sy + 8);
    sweepG.addColorStop(0, "rgba(255,255,255,0)");
    sweepG.addColorStop(0.5, "rgba(255, 230, 160, 0.35)");
    sweepG.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = sweepG;
    ctx.fillRect(-12, sy - 8, 24, 16);
  }

  ctx.restore();

  // Kuntum emas di bonggol bawah
  ctx.fillStyle = "#ffc247";
  ctx.beginPath();
  ctx.arc(0, 44.5, 2.2, 0, TAU);
  ctx.fill();

  ctx.restore();
}

/* -------------------------------------------------------------------------
   MENDAK (Cincin Emas Penghubung Hulu dan Warangka)
   Terletak dari y = -4 hingga y = 2
   ------------------------------------------------------------------------- */
export function drawKerisMendak(ctx: CanvasRenderingContext2D, t: number) {
  ctx.save();

  ctx.beginPath();
  ctx.ellipse(0, -1, 10.5, 3.5, 0, 0, TAU);
  const mendakGrad = ctx.createLinearGradient(-10, -4, 10, 2);
  mendakGrad.addColorStop(0, "#7a4e12");
  mendakGrad.addColorStop(0.3, "#ffd979");
  mendakGrad.addColorStop(0.5, "#fffdf5");
  mendakGrad.addColorStop(0.7, "#d99b2b");
  mendakGrad.addColorStop(1, "#543309");
  ctx.fillStyle = mendakGrad;
  ctx.fill();
  ctx.strokeStyle = "#2d1602";
  ctx.lineWidth = 0.9;
  ctx.stroke();

  // Permata intan kecil bertahtakan cahaya biru halus
  const pulse = 0.5 + 0.5 * Math.sin(t * 3);
  ctx.fillStyle = `rgba(255, 255, 255, ${0.8 + pulse * 0.2})`;
  ctx.beginPath();
  ctx.arc(0, -1, 1.4 + pulse * 0.3, 0, TAU);
  ctx.fill();

  ctx.restore();
}

/* -------------------------------------------------------------------------
   WARANGKA EMAS PROPORSIONAL (Perahu Kencana yang Elegan)
   Lebar 46px serasi dengan bilah 24px dan hulu 18px
   Terletak dari y = -20 hingga y = -4
   ------------------------------------------------------------------------- */
export function drawKerisWarangka(ctx: CanvasRenderingContext2D, t: number) {
  ctx.save();

  // Siluet Perahu Emas Proporsional (Gayaman Kencana)
  ctx.beginPath();
  ctx.moveTo(-23, -6);
  ctx.bezierCurveTo(-28, -16, -16, -23, -6, -19);
  ctx.lineTo(6, -19);
  ctx.bezierCurveTo(16, -23, 28, -16, 23, -6);
  ctx.bezierCurveTo(19, 3, -19, 3, -23, -6);
  ctx.closePath();

  // Gradien Emas Kencana Pusaka Megah
  const goldGrad = ctx.createLinearGradient(-23, -20, 23, 3);
  goldGrad.addColorStop(0, "#7a4f13");
  goldGrad.addColorStop(0.2, "#ffd979");
  goldGrad.addColorStop(0.45, "#fff4cd");
  goldGrad.addColorStop(0.7, "#d99b2b");
  goldGrad.addColorStop(1, "#63400f");
  ctx.fillStyle = goldGrad;
  ctx.fill();

  ctx.strokeStyle = "#4d2f07";
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // Ukiran Relief Sulur Kencana
  ctx.save();
  ctx.clip();

  ctx.strokeStyle = "rgba(110, 68, 12, 0.45)";
  ctx.lineWidth = 0.95;
  for (const i of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(i * 7, -9);
    ctx.bezierCurveTo(i * 15, -14, i * 21, -9, i * 18, -3);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(i * 15, -11, 1.8, 0, TAU);
    ctx.stroke();
  }

  // Kilatan garis specular halus di bibir atas perahu
  ctx.globalCompositeOperation = "lighter";
  const rimGrad = ctx.createLinearGradient(0, -22, 0, -14);
  rimGrad.addColorStop(0, "rgba(255,255,255,0)");
  rimGrad.addColorStop(0.6, "rgba(255,252,235,0.4)");
  rimGrad.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = rimGrad;
  ctx.fillRect(-26, -22, 52, 12);

  ctx.restore(); // restore clip

  // Medali Permata Ruby Berpendar di Tengah Warangka
  ctx.save();
  ctx.translate(0, -8);

  // Bingkai emas medali
  ctx.beginPath();
  ctx.arc(0, 0, 4.8, 0, TAU);
  const medGrad = ctx.createLinearGradient(-4, -4, 4, 4);
  medGrad.addColorStop(0, "#fff2c4");
  medGrad.addColorStop(0.5, "#e0a52c");
  medGrad.addColorStop(1, "#7c4d10");
  ctx.fillStyle = medGrad;
  ctx.fill();
  ctx.strokeStyle = "#4d2f07";
  ctx.lineWidth = 0.8;
  ctx.stroke();

  // Permata Ruby Merah Delima
  const pulse = 0.5 + 0.5 * Math.sin(t * 2.2);
  const rubyGrad = ctx.createRadialGradient(-0.8, -1, 0, 0, 0, 2.8);
  rubyGrad.addColorStop(0, "#ffaab8");
  rubyGrad.addColorStop(0.4, "#e01f3f");
  rubyGrad.addColorStop(1, "#6d0618");
  ctx.fillStyle = rubyGrad;
  ctx.beginPath();
  ctx.arc(0, 0, 2.3 + pulse * 0.35, 0, TAU);
  ctx.fill();

  // Titik pantul cahaya pada ruby
  ctx.fillStyle = "rgba(255, 230, 235, 0.9)";
  ctx.beginPath();
  ctx.arc(-0.8, -0.8, 0.6, 0, TAU);
  ctx.fill();

  ctx.restore();

  ctx.restore();
}

/* -------------------------------------------------------------------------
   GANJA & GANDIK (Penopang Bilah Kokoh yang Menyatu Sempurna dengan Bilah 24px)
   Terletak dari y = -28 hingga y = -18
   ------------------------------------------------------------------------- */
export function drawKerisGanja(ctx: CanvasRenderingContext2D) {
  ctx.save();

  // Bilah ganja asimetris kokoh (lebar 32px, pas menopang bilah 24px)
  ctx.beginPath();
  ctx.moveTo(-16, -24);
  ctx.quadraticCurveTo(-13, -29, -5, -29);
  ctx.lineTo(5, -29);
  ctx.quadraticCurveTo(14, -29, 17, -25);
  ctx.lineTo(15, -20);
  ctx.quadraticCurveTo(0, -19, -13, -20);
  ctx.closePath();

  const ganjaGrad = ctx.createLinearGradient(-16, -29, 17, -20);
  ganjaGrad.addColorStop(0, "#523716");
  ganjaGrad.addColorStop(0.3, "#f4d68a");
  ganjaGrad.addColorStop(0.5, "#fffbee");
  ganjaGrad.addColorStop(0.7, "#d29731");
  ganjaGrad.addColorStop(1, "#3c240b");
  ctx.fillStyle = ganjaGrad;
  ctx.fill();

  ctx.strokeStyle = "#2c1704";
  ctx.lineWidth = 0.95;
  ctx.stroke();

  // Kembang kacang melengkung anggun di Gandik (sisi depan)
  ctx.beginPath();
  ctx.moveTo(-14, -25);
  ctx.bezierCurveTo(-18, -27, -18, -32, -15, -33);
  ctx.bezierCurveTo(-13, -33.5, -12, -31.5, -14, -29.5);
  ctx.strokeStyle = "#ffd979";
  ctx.lineWidth = 1.4;
  ctx.stroke();

  // Greneng halus di ekor (sisi belakang)
  ctx.strokeStyle = "#ffd979";
  ctx.lineWidth = 0.9;
  for (let g = 0; g < 3; g++) {
    const gx = 10.5 + g * 1.8;
    ctx.beginPath();
    ctx.moveTo(gx, -21);
    ctx.lineTo(gx + 0.8, -24);
    ctx.stroke();
  }

  ctx.restore();
}

/* =========================================================================
   DEFINISI LENGKAP KERIS GUN
   ========================================================================= */
export const kerisGun: Weapon = {
  id: "keris",
  name: "KERIS GUN",
  origin: "Nusantara • Halilintar Purba",
  tagline: "Bilah Luk Tujuh Gagah, Kilatan Petir Ramping.",
  desc:
    "Keris pusaka agung berbilah Luk 7 tebal berpamor meteorit emas, berpenopang ganja kembang kacang kencana, berwarangka perahu emas dengan medali ruby merah delima, dan hulu deder kayu tayuman yang kokoh. Pelurunya adalah tombak halilintar ramping dan tajam yang melesat secepat petir dan menancap menembus lingkaran target.",
  price: 0,
  hue: "#ffd056",
  hue2: "#4deeea",
  speedMul: 1.85, // Melesat sangat cepat dan tajam
  muzzle: 160, // Moncong di pucuk bilah y = -160
  embed: 10, // Titik tembus lingkaran target pas di batas kayu
  halfW: 8,
  bulletLen: 54,
  shake: 6,
  pull: 0,

  drawGun(ctx, { t, recoil, flash }) {
    const kick = recoil * 7;
    const pulse = 0.5 + 0.5 * Math.sin(t * 2.5);

    ctx.save();
    ctx.translate(0, kick);

    /* ---------------- 1. AURA PUSAKA EMAS & CYAN (Soft Additive) ---------------- */
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const aura = ctx.createRadialGradient(0, -80, 6, 0, -80, 95);
    aura.addColorStop(0, rgba("#ffd056", 0.12 + pulse * 0.06));
    aura.addColorStop(0.48, rgba("#4deeea", 0.03));
    aura.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = aura;
    ctx.beginPath();
    ctx.ellipse(0, -80, 64, 98, 0, 0, TAU);
    ctx.fill();
    ctx.restore();

    /* ---------------- 2. HULU (Gagang Pegangan Pas di Tangan) ---------------- */
    drawKerisHulu(ctx, t);

    /* ---------------- 3. MENDAK (Cincin Leher Emas) ---------------- */
    drawKerisMendak(ctx, t);

    /* ---------------- 4. WARANGKA (Sarung Emas Perahu Proporsional) ---------------- */
    drawKerisWarangka(ctx, t);

    /* ---------------- 5. GANJA & GANDIK (Pangkal Bilah) ---------------- */
    drawKerisGanja(ctx);

    /* ---------------- 6. WILAH / BILAH LUK 7 GAGAH & BERBOBOT (24px) ---------------- */
    const bladeLen = 130;
    ctx.save();
    ctx.translate(0, -28); // Mulai dari atas ganja

    // a. Badan Bilah Logam Pusaka (Tebal 24px, berbobot!)
    buildKerisWilahPath(ctx, bladeLen, 24, 16, 5.5, 7);
    const bladeGrad = ctx.createLinearGradient(-12, 0, 12, -bladeLen);
    bladeGrad.addColorStop(0, "#4a3518");
    bladeGrad.addColorStop(0.2, "#cfad65");
    bladeGrad.addColorStop(0.48, "#fffbee");
    bladeGrad.addColorStop(0.72, "#d9aa42");
    bladeGrad.addColorStop(0.9, "#8a5f1e");
    bladeGrad.addColorStop(1, "#fffdf5");
    ctx.fillStyle = bladeGrad;
    ctx.fill();

    // b. Pamor Meteorit Khas Keris
    ctx.save();
    ctx.clip();

    ctx.strokeStyle = "rgba(74, 46, 12, 0.38)";
    ctx.lineWidth = 0.9;
    for (let k = 0; k < 12; k++) {
      ctx.beginPath();
      for (let i = 0; i <= 36; i++) {
        const u = i / 36;
        const y = -u * bladeLen;
        const amp = Math.sin(u * Math.PI) * 7.0 * (1 - u * 0.28);
        const wave = Math.sin(u * Math.PI * 7) * amp;
        const off = (k - 5.5) * 2.2 * (1 - u * 0.65);
        if (i === 0) ctx.moveTo(wave + off, y);
        else ctx.lineTo(wave + off, y);
      }
      ctx.stroke();
    }

    // Kilauan garis sapu specular saat idle
    const sweep = ((t * 0.38) % 2.0) - 0.4;
    if (sweep >= 0 && sweep <= 1) {
      const sy = -sweep * bladeLen;
      ctx.globalCompositeOperation = "lighter";
      const sweepG = ctx.createLinearGradient(0, sy - 20, 0, sy + 20);
      sweepG.addColorStop(0, "rgba(255,255,255,0)");
      sweepG.addColorStop(0.5, "rgba(255, 248, 220, 0.45)");
      sweepG.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = sweepG;
      ctx.fillRect(-22, sy - 20, 44, 40);
      ctx.globalCompositeOperation = "source-over";
    }
    ctx.restore();

    // c. Tepi Bilah Tajam Berkilau
    buildKerisWilahPath(ctx, bladeLen, 24, 16, 5.5, 7);
    ctx.strokeStyle = "rgba(255, 246, 216, 0.9)";
    ctx.lineWidth = 1.0;
    ctx.stroke();

    // d. Tulang Punggung Bilah (Ada-ada) 3D Kuat
    buildKerisSpinePath(ctx, bladeLen, 7);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.75)";
    ctx.lineWidth = 1.3;
    ctx.stroke();

    // e. Kilatan petir mikro ramping halus sesekali menjalar di bilah (Zero Lag)
    const tick = Math.floor(t * 16);
    if (tick % 6 === 0) {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.strokeStyle = "rgba(77, 238, 234, 0.8)";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(0, -bladeLen * 0.25);
      ctx.lineTo(2, -bladeLen * 0.35);
      ctx.lineTo(-2, -bladeLen * 0.45);
      ctx.lineTo(1, -bladeLen * 0.55);
      ctx.lineTo(0, -bladeLen * 0.65);
      ctx.stroke();

      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 0.6;
      ctx.stroke();
      ctx.restore();
    }

    ctx.restore(); // restore translate bilah

    /* ---------------- 7. PUCUK BILAH (Moncong Laras Tajam) ---------------- */
    const my = -160;
    ctx.save();
    ctx.translate(0, my);

    // Titik energi di pucuk
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = "rgba(77, 238, 234, 0.85)";
    ctx.beginPath();
    ctx.arc(0, 0, 3.5 + flash * 3, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(0, 0, 1.8 + flash * 2, 0, TAU);
    ctx.fill();
    ctx.restore();

    // Pucuk tajam bilah emas
    ctx.fillStyle = "#fff8e0";
    ctx.beginPath();
    ctx.moveTo(-2.2, 3.5);
    ctx.lineTo(0, -4.5);
    ctx.lineTo(2.2, 3.5);
    ctx.closePath();
    ctx.fill();

    // Kilat tembakan tajam ramping
    if (flash > 0.01) {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      sparkle(ctx, 0, 0, 16 * flash, flash * 0.85, "#ffffff");
      sparkle(ctx, 0, 0, 10 * flash, flash * 0.75, "#4deeea");
      ctx.restore();
    }

    ctx.restore();

    ctx.restore(); // restore recoil
  },

  /* -------------------------------------------------------------------------
     PELURU: BILAH HALILINTAR PETIR PUSAKA (LIGHTNING THUNDER DAGGER)
     Bilah energi padat berbentuk lekukan petir Luk berwibawa:
     Badan petir padat 14px dengan facet 3D, inti putih panas, dan ekor plasma.
     ------------------------------------------------------------------------- */
  drawBullet(ctx, { t }) {
    ctx.save();

    // 1. Ekor plasma ionik di belakang
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const trailGrad = ctx.createLinearGradient(0, 10, 0, 48);
    trailGrad.addColorStop(0, "rgba(255, 255, 255, 0.85)");
    trailGrad.addColorStop(0.3, "rgba(77, 238, 234, 0.65)");
    trailGrad.addColorStop(0.75, "rgba(255, 208, 86, 0.25)");
    trailGrad.addColorStop(1, "rgba(77, 238, 234, 0)");
    ctx.fillStyle = trailGrad;
    ctx.beginPath();
    ctx.moveTo(-4, 10);
    ctx.lineTo(4, 10);
    ctx.lineTo(1.0, 48);
    ctx.lineTo(-1.0, 48);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // 2. Bilah petir padat berbentuk dagger (panjang dari -26 hingga +22, lebar 14px)
    drawHalilintarBlade(ctx, -26, 22, 14, t, false);

    ctx.restore();
  },

  /* -------------------------------------------------------------------------
     MENANCAP PADA TARGET: BILAH HALILINTAR MENANCAP KOKOH & INDAH!
     - Ujung tajam menembus masuk ke dalam kayu lingkaran (-y: -16px hingga -10px)
     - Cincin kawah sengatan petir tepat di batas rim lingkaran (y = -10px)
     - Badan bilah petir padat menonjol kokoh dan gagah keluar (+y: -10px hingga +26px)
       dengan lekuk zig-zag luk 14px, facet 3D cyan-gold, dan tulang putih panas!
     ------------------------------------------------------------------------- */
  drawStuck(ctx, { t }) {
    ctx.save();

    // 1. Kawah sengatan listrik tepat di batas bibir lingkaran (y = -10)
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const rimY = -10;

    // Cincin tumbukan kencana & cyan
    ctx.strokeStyle = "rgba(77, 238, 234, 0.85)";
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.ellipse(0, rimY, 7.5, 3.0, 0, 0, TAU);
    ctx.stroke();

    ctx.fillStyle = "rgba(255, 208, 86, 0.9)";
    ctx.beginPath();
    ctx.arc(0, rimY, 3.2, 0, TAU);
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(0, rimY, 1.8, 0, TAU);
    ctx.fill();
    ctx.restore();

    // 2. BILAH PETIR PADAT MENANCAP (dari -16px di dalam hingga +26px menonjol keluar)
    drawHalilintarBlade(ctx, -16, 26, 14, t, true);

    ctx.restore();
  },

  /* -------------------------------------------------------------------------
     IKON AMUNISI MINI
     ------------------------------------------------------------------------- */
  drawMini(ctx, { t }) {
    const pulse = 0.5 + 0.5 * Math.sin(t * 6);
    ctx.save();
    ctx.globalAlpha = 0.85 + pulse * 0.15;
    ctx.translate(0, 1);

    // Bentuk Petir Tajam Proporsional
    ctx.beginPath();
    ctx.moveTo(2.4, -12);
    ctx.lineTo(-4.6, -1.0);
    ctx.lineTo(-1.0, -1.0);
    ctx.lineTo(-2.8, 11);
    ctx.lineTo(4.6, -2.0);
    ctx.lineTo(1.0, -2.0);
    ctx.closePath();

    const boltGrad = ctx.createLinearGradient(-3, -12, 3, 11);
    boltGrad.addColorStop(0, "#ffffff");
    boltGrad.addColorStop(0.4, "#a5f5ff");
    boltGrad.addColorStop(0.7, "#ffd056");
    boltGrad.addColorStop(1, "#f39c12");
    ctx.fillStyle = boltGrad;
    ctx.fill();

    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 0.8;
    ctx.stroke();

    ctx.restore();
  },

  /* -------------------------------------------------------------------------
     ON FIRE (SAAT TEMBAK): PERCIKAN TAJAM & RINGAN
     ------------------------------------------------------------------------- */
  onFire(emit, x, y) {
    for (let i = 0; i < 3; i++) {
      const a = -Math.PI / 2 + (i - 1) * 0.32 + (Math.random() - 0.5) * 0.15;
      const len = 32 + Math.random() * 28;
      emit({
        x,
        y,
        vx: Math.cos(a) * len,
        vy: Math.sin(a) * len,
        life: 0.15 + Math.random() * 0.1,
        size: 1.1,
        color: i % 2 === 0 ? "#4deeea" : "#ffd056",
        kind: "arc",
        rot: Math.random() * 10,
      });
    }

    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * 1.5;
      const sp = 150 + Math.random() * 260;
      emit({
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life: 0.18 + Math.random() * 0.2,
        size: 1.0 + Math.random() * 1.4,
        color: ["#ffffff", "#4deeea", "#ffd056"][i % 3],
        kind: "spark",
        drag: 2.5,
        grav: 70,
        glow: 8,
      });
    }

    emit({ x, y, kind: "flash", life: 0.12, size: 24, color: "#ffffff", glow: 12 });
    emit({ x, y, kind: "ring", life: 0.25, size: 6, grow: 160, color: "#4deeea", thick: 2.0, glow: 12 });
  },

  /* -------------------------------------------------------------------------
     ON IMPACT (TUMBUKAN): SAMBARAN HALUS & MENANCAP ELEGAN
     ------------------------------------------------------------------------- */
  onImpact(emit, x, y, s, info) {
    const baseAngle = Math.atan2(info.ny, info.nx);

    // Sambaran balik tipis bersih
    if (info.mx !== undefined && info.my !== undefined) {
      emit({
        x,
        y,
        vx: info.mx - x,
        vy: info.my - y,
        life: 0.16,
        size: 1.6,
        color: "#ffffff",
        kind: "arc",
        rot: 1.5,
      });
    }

    // Busur listrik merayap di target
    for (let i = 0; i < 4; i++) {
      const a = baseAngle + (Math.random() - 0.5) * 2.6;
      const len = (30 + Math.random() * 40) * s * info.power;
      emit({
        x,
        y,
        vx: Math.cos(a) * len,
        vy: Math.sin(a) * len,
        life: 0.16 + Math.random() * 0.14,
        size: 1.2,
        color: i % 2 === 0 ? "#4deeea" : "#ffd056",
        kind: "arc",
        rot: Math.random() * 10,
      });
    }

    // Percikan plasma ion ringan
    for (let i = 0; i < 14; i++) {
      const a = baseAngle + (Math.random() - 0.5) * 2.6;
      const sp = (90 + Math.random() * 280) * info.power;
      emit({
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life: 0.25 + Math.random() * 0.3,
        size: 1.1 + Math.random() * 1.8,
        color: ["#ffffff", "#4deeea", "#ffd056"][i % 3],
        kind: "spark",
        grav: 150,
        drag: 1.8,
        glow: 10,
      });
    }

    emit({ x, y, kind: "flash", life: 0.12, size: 36 * s, color: "#ffffff", glow: 16 });
    emit({ x, y, kind: "ring", life: 0.3, size: 7, grow: 180 * s, color: "#4deeea", thick: 2.0, glow: 14 });
  },

  /* -------------------------------------------------------------------------
     AMBIENT (SAAT IDLE): DESIS LISTRIK HALUS
     ------------------------------------------------------------------------- */
  ambient(emit, x, y, s, _t, dt) {
    if (Math.random() < dt * 4) {
      emit({
        x: x + (Math.random() - 0.5) * 28 * s,
        y: y - Math.random() * 110 * s,
        vx: (Math.random() - 0.5) * 5,
        vy: -10 - Math.random() * 16,
        life: 0.9 + Math.random(),
        size: 0.9 + Math.random() * 1.0,
        color: Math.random() < 0.6 ? "#ffd056" : "#4deeea",
        kind: "mote",
        glow: 6,
      });
    }
  },
};
