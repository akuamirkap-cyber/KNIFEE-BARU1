import type { Particle, WeaponKind } from './types';
import { SPECTRUM, drawSnowflake, drawTwinkle } from './specialWeapons';

type C2D = CanvasRenderingContext2D;

function pr(n: number): number {
  const s = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
  return s - Math.floor(s);
}

export const isElemental = (k?: WeaponKind) => k === 'rainbow' || k === 'water' || k === 'snow';
export const isFirearm = (k?: WeaponKind) => !!k && k !== 'obliterator' && !isElemental(k);

// ============================================================================
// BULLET TRAILS — one completely different style per weapon family
// headY = where the trail starts (just behind the projectile), extends DOWN by len
// ============================================================================
export function drawKindTrail(
  ctx: C2D,
  kind: WeaponKind,
  x: number,
  headY: number,
  len: number,
  alpha: number,
  time: number,
  od: boolean,
  color: string
) {
  if (len < 4 || alpha <= 0.01) return;
  ctx.save();
  if (kind === 'rainbow') drawRainbowRibbon(ctx, x, headY, len, alpha, time, od);
  else if (kind === 'water') drawWaterStream(ctx, x, headY, len, alpha, time, od);
  else if (kind === 'snow') drawFrostContrail(ctx, x, headY, len, alpha, time, od);
  else if (kind === 'banana') drawBananaTrail(ctx, x, headY, len, alpha, time);
  else if (kind === 'beehive') drawBeeTrail(ctx, x, headY, len, alpha, time);
  else if (kind === 'bubble') drawBubbleTrail(ctx, x, headY, len, alpha, time);
  else if (kind === 'confetti') drawConfettiTrail(ctx, x, headY, len, alpha, time);
  else if (isFirearm(kind)) drawTracer(ctx, kind, x, headY, len, alpha, time, od, color);
  ctx.restore();
}

// 🌈 A real 7-band rainbow ribbon — perfectly upright, gently fanning, softly shimmering
function drawRainbowRibbon(ctx: C2D, x: number, y0: number, len: number, a: number, time: number, od: boolean) {
  const N = 20;
  const bw = od ? 4 : 3.1;
  // Straight vertical bands — only a tiny high-frequency shimmer (no S-waves!)
  const path = (i: number) => {
    ctx.beginPath();
    for (let s = 0; s <= N; s++) {
      const t = s / N;
      const yy = y0 + t * len;
      const spread = 1 + t * 1.15;
      const shimmer = Math.sin(yy * 0.25 - time * 16) * 0.8;
      const xx = x + (i - 3) * bw * spread + shimmer;
      if (s === 0) ctx.moveTo(xx, yy);
      else ctx.lineTo(xx, yy);
    }
  };
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 7; i++) {
    const g = ctx.createLinearGradient(0, y0, 0, y0 + len);
    g.addColorStop(0, SPECTRUM[i]);
    g.addColorStop(0.72, `${SPECTRUM[i]}66`);
    g.addColorStop(1, `${SPECTRUM[i]}00`);
    ctx.strokeStyle = g;
    ctx.globalAlpha = a * 0.3;
    ctx.lineWidth = bw * 2.4;
    path(i);
    ctx.stroke();
    ctx.globalAlpha = a;
    ctx.lineWidth = bw + 0.4;
    path(i);
    ctx.stroke();
  }
  // Crisp white silk core line, perfectly straight down the middle
  const sg = ctx.createLinearGradient(0, y0, 0, y0 + len * 0.65);
  sg.addColorStop(0, 'rgba(255,255,255,0.85)');
  sg.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.strokeStyle = sg;
  ctx.globalAlpha = a * 0.8;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(x, y0);
  ctx.lineTo(x, y0 + len * 0.65);
  ctx.stroke();
  ctx.globalAlpha = 1;
  // Sparkle stars shed symmetrically, hugging the straight ribbon
  const count = od ? 8 : 5;
  for (let k = 0; k < count; k++) {
    const t = (time * 1.3 + k / count) % 1;
    const yy = y0 + t * len;
    const side = k % 2 === 0 ? 1 : -1;
    const xx = x + side * (9 + t * 14);
    drawTwinkle(ctx, xx, yy, 5.5 * (1 - t) + 1.5, SPECTRUM[k % 7], a * (1 - t), time * 3 + k);
  }
}

// 🌊 A pressurised twisting water jet with bead droplets and foam
function drawWaterStream(ctx: C2D, x: number, y0: number, len: number, a: number, time: number, od: boolean) {
  const N = 20;
  const W = od ? 13 : 9;
  const cx = (t: number, yy: number) => x + Math.sin(yy * 0.06 - time * 22) * 3.5 * t;
  // Body
  ctx.beginPath();
  for (let s = 0; s <= N; s++) {
    const t = s / N;
    const yy = y0 + t * len;
    const w = W * (1 - t * 0.7) + Math.sin(yy * 0.2 + time * 30) * 1.2;
    if (s === 0) ctx.moveTo(cx(t, yy) - w, yy);
    else ctx.lineTo(cx(t, yy) - w, yy);
  }
  for (let s = N; s >= 0; s--) {
    const t = s / N;
    const yy = y0 + t * len;
    const w = W * (1 - t * 0.7) + Math.sin(yy * 0.2 + time * 30 + 1.3) * 1.2;
    ctx.lineTo(cx(t, yy) + w, yy);
  }
  ctx.closePath();
  const g = ctx.createLinearGradient(0, y0, 0, y0 + len);
  g.addColorStop(0, 'rgba(224,247,255,0.95)');
  g.addColorStop(0.25, 'rgba(34,211,238,0.8)');
  g.addColorStop(0.7, 'rgba(14,116,144,0.35)');
  g.addColorStop(1, 'rgba(14,116,144,0)');
  ctx.globalAlpha = a;
  ctx.fillStyle = g;
  ctx.fill();
  // Twisting inner strands (looks like a spinning jet)
  ctx.globalCompositeOperation = 'lighter';
  for (const ph of [0, Math.PI]) {
    ctx.beginPath();
    for (let s = 0; s <= N; s++) {
      const t = s / N;
      const yy = y0 + t * len;
      const w = W * (1 - t * 0.7) * 0.7;
      const xx = cx(t, yy) + Math.sin(yy * 0.12 - time * 26 + ph) * w;
      if (s === 0) ctx.moveTo(xx, yy);
      else ctx.lineTo(xx, yy);
    }
    const sg = ctx.createLinearGradient(0, y0, 0, y0 + len * 0.8);
    sg.addColorStop(0, 'rgba(255,255,255,0.95)');
    sg.addColorStop(1, 'rgba(165,243,252,0)');
    ctx.strokeStyle = sg;
    ctx.lineWidth = 1.4;
    ctx.stroke();
  }
  ctx.globalCompositeOperation = 'source-over';
  // Bead droplets peeling off
  for (let k = 0; k < (od ? 12 : 8); k++) {
    const t = (time * 2.6 + k / (od ? 12 : 8)) % 1;
    const yy = y0 + t * len;
    const xx = cx(t, yy) + (pr(k * 3.3) - 0.5) * W * 2.4 * (0.3 + t);
    const r = 2.6 * (1 - t) + 0.8;
    ctx.globalAlpha = a * (1 - t * 0.6);
    ctx.fillStyle = '#67e8f9';
    ctx.beginPath();
    ctx.ellipse(xx, yy, r, r * 1.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(xx - r * 0.3, yy - r * 0.4, r * 0.35, 0, Math.PI * 2);
    ctx.fill();
  }
  // Foam rings
  for (let k = 0; k < 3; k++) {
    const t = (time * 4 + k / 3) % 1;
    const yy = y0 + t * len * 0.75;
    ctx.globalAlpha = a * (1 - t) * 0.8;
    ctx.strokeStyle = '#e0f7ff';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.ellipse(cx(t, yy), yy, W * (1 - t * 0.5) + 3, 2.4, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
}

// ❄️ A frosty contrail: billowing snow mist, crystalline zigzag and tumbling flakes
function drawFrostContrail(ctx: C2D, x: number, y0: number, len: number, a: number, time: number, od: boolean) {
  const m = od ? 1.4 : 1;
  // Billowing mist puffs (grow wider down the trail, like a jet contrail)
  for (let k = 0; k < 11; k++) {
    const t = k / 10;
    const yy = y0 + t * len;
    const r = (5 + t * 17) * m;
    const xx = x + Math.sin(k * 1.7 + time * 2) * 3 * t;
    const g = ctx.createRadialGradient(xx, yy, 0, xx, yy, r);
    g.addColorStop(0, `rgba(255,255,255,${0.55 * a * (1 - t * 0.8)})`);
    g.addColorStop(0.6, `rgba(224,242,254,${0.3 * a * (1 - t)})`);
    g.addColorStop(1, 'rgba(224,242,254,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(xx, yy, r, 0, Math.PI * 2);
    ctx.fill();
  }
  // Crystalline ice zigzag (sharp, angular — the opposite of water's smooth curves)
  ctx.globalCompositeOperation = 'lighter';
  for (const side of [-1, 1]) {
    ctx.beginPath();
    const steps = 12;
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const yy = y0 + t * len * 0.85;
      const xx = x + side * (s % 2 === 0 ? 2 : 6 + t * 8) * m;
      if (s === 0) ctx.moveTo(xx, yy);
      else ctx.lineTo(xx, yy);
    }
    const g = ctx.createLinearGradient(0, y0, 0, y0 + len * 0.85);
    g.addColorStop(0, 'rgba(255,255,255,0.95)');
    g.addColorStop(0.5, 'rgba(125,211,252,0.6)');
    g.addColorStop(1, 'rgba(125,211,252,0)');
    ctx.globalAlpha = a;
    ctx.strokeStyle = g;
    ctx.lineWidth = 1.3;
    ctx.stroke();
  }
  ctx.globalCompositeOperation = 'source-over';
  // Tumbling snowflakes
  for (let k = 0; k < (od ? 9 : 6); k++) {
    const t = (time * 1.3 + k / (od ? 9 : 6)) % 1;
    const yy = y0 + t * len;
    const xx = x + Math.sin(k * 2.1 + time * 3) * (5 + t * 16) * m;
    drawSnowflake(ctx, xx, yy, 3.5 + t * 3.5, time * 4 + k, '#ffffff', a * (1 - t), 1.1);
  }
  // Diamond-dust glints
  for (let k = 0; k < 6; k++) {
    const t = (time * 2.2 + k / 6 + pr(k)) % 1;
    drawTwinkle(ctx, x + (pr(k * 9) - 0.5) * 34 * t, y0 + t * len, 3 * (1 - t) + 1, '#bae6fd', a * (1 - t), 0);
  }
}

// 🍌 Banana peel wisps + yellow sparkle
function drawBananaTrail(ctx: C2D, x: number, y0: number, len: number, a: number, time: number) {
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = 'rgba(253,224,71,0.6)';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  for (let s = 0; s <= 14; s++) {
    const t = s / 14;
    const yy = y0 + t * len;
    const xx = x + Math.sin(yy * 0.05 - time * 8) * 5 * t;
    if (s === 0) ctx.moveTo(xx, yy);
    else ctx.lineTo(xx, yy);
  }
  ctx.globalAlpha = a * 0.7;
  ctx.stroke();
  for (let k = 0; k < 4; k++) {
    const t = (time * 2.2 + k / 4) % 1;
    const yy = y0 + t * len;
    const xx = x + (pr(k * 3) - 0.5) * 24 * t;
    drawTwinkle(ctx, xx, yy, 5 * (1 - t) + 1.5, '#fde047', a * (1 - t), time * 3 + k);
  }
  ctx.globalCompositeOperation = 'source-over';
  // Little tumbling peel bits
  for (let k = 0; k < 3; k++) {
    const t = (time * 1.6 + k / 3 + pr(k * 9)) % 1;
    const yy = y0 + t * len * 0.8;
    const xx = x + (pr(k * 7) - 0.5) * 20 * t;
    ctx.globalAlpha = a * (1 - t);
    ctx.save();
    ctx.translate(xx, yy);
    ctx.rotate(time * 6 + k);
    ctx.fillStyle = k % 2 ? '#fde047' : '#fef9c3';
    ctx.fillRect(-4, -1.6, 8, 3.2);
    ctx.restore();
  }
}

// 🐝 Honey pollen shimmer with hex glints
function drawBeeTrail(ctx: C2D, x: number, y0: number, len: number, a: number, time: number) {
  ctx.globalCompositeOperation = 'lighter';
  for (let k = 0; k < 7; k++) {
    const t = (time * 2.4 + k / 7) % 1;
    const yy = y0 + t * len;
    const xx = x + (pr(k * 5) - 0.5) * 26 * t;
    const g = ctx.createRadialGradient(xx, yy, 0, xx, yy, 6 * (1 - t) + 2);
    g.addColorStop(0, 'rgba(255,251,235,0.9)');
    g.addColorStop(0.4, 'rgba(251,191,36,0.6)');
    g.addColorStop(1, 'rgba(180,83,9,0)');
    ctx.globalAlpha = a * (1 - t);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(xx, yy, 6 * (1 - t) + 2, 0, Math.PI * 2);
    ctx.fill();
  }
  // Hex glints
  for (let k = 0; k < 3; k++) {
    const t = (time * 1.8 + k / 3 + pr(k * 3)) % 1;
    const yy = y0 + t * len * 0.8;
    const xx = x + (pr(k * 11) - 0.5) * 18 * t;
    ctx.globalAlpha = a * (1 - t) * 0.9;
    ctx.strokeStyle = '#fde68a';
    ctx.lineWidth = 1;
    ctx.save();
    ctx.translate(xx, yy);
    ctx.rotate(time * 2 + k);
    ctx.beginPath();
    for (let h = 0; h <= 6; h++) {
      const hh = (h / 6) * Math.PI * 2;
      if (h === 0) ctx.moveTo(Math.cos(hh) * 3.4, Math.sin(hh) * 3.4);
      else ctx.lineTo(Math.cos(hh) * 3.4, Math.sin(hh) * 3.4);
    }
    ctx.stroke();
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}

// 🫧 Chain of floating soap bubbles
function drawBubbleTrail(ctx: C2D, x: number, y0: number, len: number, a: number, time: number) {
  ctx.globalCompositeOperation = 'lighter';
  for (let k = 0; k < 5; k++) {
    const t = k / 4;
    const yy = y0 + t * len * 0.9;
    const xx = x + Math.sin(yy * 0.04 + time * 3) * 8 * t;
    const r = 4 + t * 7 + Math.sin(time * 4 + k) * 1;
    ctx.globalAlpha = a * (1 - t * 0.5);
    ctx.strokeStyle = 'rgba(249,168,212,0.9)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(xx, yy, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(125,211,252,0.7)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(xx, yy, r - 1.4, 1.2, 2.4);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.beginPath();
    ctx.arc(xx - r * 0.35, yy - r * 0.35, r * 0.22, 0, Math.PI * 2);
    ctx.fill();
  }
}

// 🎉 Scattered confetti bits along the flight path
function drawConfettiTrail(ctx: C2D, x: number, y0: number, len: number, a: number, time: number) {
  ctx.globalCompositeOperation = 'source-over';
  for (let k = 0; k < 7; k++) {
    const t = (time * 2.6 + k / 7) % 1;
    const yy = y0 + t * len;
    const xx = x + (pr(k * 3.3) - 0.5) * 40 * t;
    ctx.globalAlpha = a * (1 - t);
    ctx.save();
    ctx.translate(xx, yy);
    ctx.rotate(time * 8 + k * 1.4);
    ctx.fillStyle = SPECTRUM[k % 7];
    ctx.fillRect(-3.4, -1.6, 6.8, 3.2);
    ctx.restore();
  }
}

// 🔫 Classic hot tracer for real firearms
function drawTracer(
  ctx: C2D,
  kind: WeaponKind,
  x: number,
  y0: number,
  len: number,
  a: number,
  time: number,
  od: boolean,
  color: string
) {
  ctx.globalCompositeOperation = 'lighter';
  const w = kind === 'rifle' ? 2.6 : kind === 'shotgun' ? 4.5 : 3.2;
  const g = ctx.createLinearGradient(0, y0, 0, y0 + len);
  g.addColorStop(0, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.lineCap = 'round';
  ctx.globalAlpha = a * 0.35;
  ctx.strokeStyle = g;
  ctx.lineWidth = w * (od ? 5 : 3.5);
  ctx.beginPath();
  ctx.moveTo(x, y0);
  ctx.lineTo(x, y0 + len);
  ctx.stroke();
  ctx.globalAlpha = a;
  ctx.lineWidth = w;
  ctx.stroke();
  const wg = ctx.createLinearGradient(0, y0, 0, y0 + len * 0.5);
  wg.addColorStop(0, '#ffffff');
  wg.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.strokeStyle = wg;
  ctx.lineWidth = w * 0.4;
  ctx.stroke();
  // Spiral rifling / heat rings
  const rings = kind === 'rifle' ? 6 : 3;
  for (let k = 0; k < rings; k++) {
    const t = (time * 6 + k / rings) % 1;
    ctx.globalAlpha = a * (1 - t) * 0.8;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(x, y0 + t * len * 0.8, 3 + t * (kind === 'rifle' ? 7 : 11), 1.4 + t * 1.6, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  if (kind === 'shotgun') {
    // Pellet spread
    for (let k = 0; k < 8; k++) {
      const t = 0.15 + pr(k) * 0.5;
      ctx.globalAlpha = a * (1 - t);
      ctx.fillStyle = '#fde68a';
      ctx.beginPath();
      ctx.arc(x + (pr(k * 5) - 0.5) * 30 * t, y0 + t * len * 0.5, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

// ============================================================================
// UNIQUE SHOCKWAVE LINES — every weapon family has its own signature ring
// ============================================================================
export function drawShock(
  ctx: C2D,
  kind: WeaponKind,
  x: number,
  y: number,
  r: number,
  alpha: number,
  time: number
) {
  if (r < 2 || alpha <= 0.01) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.translate(x, y);
  ctx.lineCap = 'round';
  switch (kind) {
    case 'revolver': {
      // Rotating gold hexagon with glowing vertices
      ctx.rotate(time * 3);
      ctx.strokeStyle = '#f5c542';
      ctx.globalAlpha = alpha;
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (let k = 0; k <= 6; k++) {
        const a = (k / 6) * Math.PI * 2;
        if (k === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
        else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      ctx.stroke();
      ctx.strokeStyle = '#ffffff';
      ctx.globalAlpha = alpha * 0.7;
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      for (let k = 0; k <= 6; k++) {
        const a = (k / 6) * Math.PI * 2;
        if (k === 0) ctx.moveTo(Math.cos(a) * r * 0.78, Math.sin(a) * r * 0.78);
        else ctx.lineTo(Math.cos(a) * r * 0.78, Math.sin(a) * r * 0.78);
      }
      ctx.stroke();
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2;
        glow(ctx, Math.cos(a) * r, Math.sin(a) * r, 5, '#f5c542', alpha);
      }
      break;
    }
    case 'pistol': {
      // Clean, elegant double circle with a center dot — precise pistol pop
      ctx.strokeStyle = '#9fb2c4';
      ctx.globalAlpha = alpha;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = alpha * 0.55;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.78, 0, Math.PI * 2);
      ctx.stroke();
      glow(ctx, 0, 0, 5, '#ffffff', alpha * 0.8);
      break;
    }
    case 'shotgun': {
      // Jagged 12-point starburst ring + radial blast ticks
      ctx.strokeStyle = '#fb923c';
      ctx.globalAlpha = alpha;
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (let k = 0; k <= 24; k++) {
        const a = (k / 24) * Math.PI * 2;
        const rr = k % 2 === 0 ? r * 1.18 : r * 0.86;
        if (k === 0) ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
        else ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
      }
      ctx.stroke();
      ctx.strokeStyle = '#fde68a';
      ctx.globalAlpha = alpha * 0.8;
      ctx.lineWidth = 1.4;
      for (let k = 0; k < 12; k++) {
        const a = (k / 12) * Math.PI * 2 + 0.26;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * (r * 1.25), Math.sin(a) * (r * 1.25));
        ctx.lineTo(Math.cos(a) * (r * 1.5), Math.sin(a) * (r * 1.5));
        ctx.stroke();
      }
      break;
    }
    case 'rifle': {
      // Fast thin scope ring + 4 crosshair ticks (sniper precision)
      ctx.strokeStyle = '#93c5fd';
      ctx.globalAlpha = alpha;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = '#ffffff';
      ctx.globalAlpha = alpha * 0.9;
      ctx.lineWidth = 1.4;
      for (let k = 0; k < 4; k++) {
        const a = (k / 4) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * (r - 5), Math.sin(a) * (r - 5));
        ctx.lineTo(Math.cos(a) * (r + 9), Math.sin(a) * (r + 9));
        ctx.stroke();
      }
      ctx.globalAlpha = alpha * 0.4;
      ctx.strokeStyle = '#93c5fd';
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.5, 0, Math.PI * 2);
      ctx.stroke();
      break;
    }
    case 'banana': {
      // Wobbly double banana-yellow rings (splatty squash)
      for (const [rr, col, w] of [
        [r, 'rgba(253,224,71,0.9)', 3.4],
        [r * 0.7, 'rgba(254,249,195,0.8)', 1.6],
      ] as [number, string, number][]) {
        ctx.strokeStyle = col;
        ctx.globalAlpha = alpha;
        ctx.lineWidth = w;
        ctx.beginPath();
        for (let s = 0; s <= 40; s++) {
          const a = (s / 40) * Math.PI * 2;
          const rr2 = rr * (1 + 0.08 * Math.sin(a * 5 + time * 6));
          const px = Math.cos(a) * rr2;
          const py = Math.sin(a) * rr2 * 0.9;
          if (s === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.stroke();
      }
      break;
    }
    case 'beehive': {
      // Honeycomb: expanding hex ring of small hexagons
      ctx.strokeStyle = '#fde68a';
      ctx.globalAlpha = alpha;
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2 + time * 0.8;
        const hx = Math.cos(a) * r * 0.8;
        const hy = Math.sin(a) * r * 0.8;
        const hs = r * 0.22;
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let h = 0; h <= 6; h++) {
          const hh = (h / 6) * Math.PI * 2;
          const px = hx + Math.cos(hh) * hs;
          const py = hy + Math.sin(hh) * hs;
          if (h === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(251,191,36,0.7)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.stroke();
      break;
    }
    case 'bubble': {
      // Thin iridescent wobble ring + satellite bubbles
      for (const [rr, col, w] of [
        [r, 'rgba(249,168,212,0.85)', 1.8],
        [r * 0.82, 'rgba(125,211,252,0.7)', 1.2],
      ] as [number, string, number][]) {
        ctx.strokeStyle = col;
        ctx.globalAlpha = alpha;
        ctx.lineWidth = w;
        ctx.beginPath();
        for (let s = 0; s <= 40; s++) {
          const a = (s / 40) * Math.PI * 2;
          const rr2 = rr * (1 + 0.05 * Math.sin(a * 3 - time * 5));
          const px = Math.cos(a) * rr2;
          const py = Math.sin(a) * rr2;
          if (s === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.stroke();
      }
      for (let k = 0; k < 4; k++) {
        const a = (k / 4) * Math.PI * 2 + 0.6;
        ctx.strokeStyle = 'rgba(255,255,255,0.8)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(Math.cos(a) * r * 1.15, Math.sin(a) * r * 1.15, 3, 0, Math.PI * 2);
        ctx.stroke();
      }
      break;
    }
    case 'confetti': {
      // 8 colorful party ticks + white ring
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2 + time * 1.2;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(Math.cos(a) * r, Math.sin(a) * r);
        ctx.rotate(a + Math.PI / 2);
        ctx.fillStyle = SPECTRUM[k % 7];
        ctx.fillRect(-3, -3, 6, 7);
        ctx.restore();
      }
      ctx.strokeStyle = 'rgba(255,255,255,0.75)';
      ctx.globalAlpha = alpha;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.78, 0, Math.PI * 2);
      ctx.stroke();
      break;
    }
    case 'rainbow': {
      // 7 neat concentric colored rings (thin, even spacing)
      for (let i = 0; i < 7; i++) {
        ctx.strokeStyle = SPECTRUM[i];
        ctx.globalAlpha = alpha * 0.95;
        ctx.lineWidth = 2.3;
        ctx.beginPath();
        ctx.arc(0, 0, Math.max(2, r - i * 4), 0, Math.PI * 2);
        ctx.stroke();
      }
      break;
    }
    case 'water': {
      // Flat concentric water ripples
      ctx.strokeStyle = '#22d3ee';
      ctx.globalAlpha = alpha;
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.ellipse(0, 0, r, r * 0.34, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = '#e0f7ff';
      ctx.globalAlpha = alpha * 0.7;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 0.68, r * 0.22, 0, 0, Math.PI * 2);
      ctx.stroke();
      break;
    }
    case 'snow': {
      // Hexagonal frost ring with crystals (reuses frostRing look)
      ctx.strokeStyle = '#bae6fd';
      ctx.globalAlpha = alpha;
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      for (let k = 0; k <= 6; k++) {
        const a = (k / 6) * Math.PI * 2;
        if (k === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r * 0.62);
        else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r * 0.62);
      }
      ctx.stroke();
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2;
        drawSnowflake(ctx, Math.cos(a) * r, Math.sin(a) * r * 0.62, 5, time * 3, '#ffffff', alpha, 1.2);
      }
      break;
    }
    default:
      break;
  }
  ctx.restore();
}

function glow(ctx: C2D, x: number, y: number, r: number, color: string, alpha: number) {
  ctx.globalAlpha = Math.min(1, alpha);
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.35, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

// ============================================================================
// ELEMENTAL STATUS ON THE TARGET WHEEL (after a hit)
// ============================================================================
export function drawTargetKindFx(
  ctx: C2D,
  kind: WeaponKind,
  cx: number,
  cy: number,
  r: number,
  t: number,
  time: number,
  rotation: number
) {
  if (t <= 0.01) return;
  ctx.save();
  if (kind === 'rainbow') {
    // Rotating prismatic halo + orbiting stars
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 7; i++) {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(time * (i % 2 ? -0.8 : 0.8) + i);
      ctx.strokeStyle = SPECTRUM[i];
      ctx.globalAlpha = t * 0.75;
      ctx.lineWidth = 2.6;
      ctx.setLineDash([22, 10]);
      ctx.beginPath();
      ctx.arc(0, 0, r + 12 + i * 3.4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    for (let k = 0; k < 8; k++) {
      const a = time * 1.4 + (k / 8) * Math.PI * 2;
      drawTwinkle(ctx, cx + Math.cos(a) * (r + 40), cy + Math.sin(a) * (r + 40), 5 + Math.sin(time * 6 + k) * 2, SPECTRUM[k % 7], t, a);
    }
  } else if (kind === 'water') {
    // Shimmering water film + wobbling liquid rim
    const fg = ctx.createRadialGradient(cx, cy, r * 0.2, cx, cy, r + 4);
    fg.addColorStop(0, 'rgba(34,211,238,0)');
    fg.addColorStop(1, `rgba(34,211,238,${0.32 * t})`);
    ctx.fillStyle = fg;
    ctx.beginPath();
    ctx.arc(cx, cy, r + 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'lighter';
    for (const [off, col, w] of [
      [6, '#22d3ee', 4],
      [6, '#e0f7ff', 1.4],
    ] as [number, string, number][]) {
      ctx.beginPath();
      for (let s = 0; s <= 72; s++) {
        const a = (s / 72) * Math.PI * 2;
        const rr = r + off + Math.sin(a * 9 + time * 7) * 2.6 + Math.sin(a * 4 - time * 4) * 1.6;
        const px = cx + Math.cos(a) * rr;
        const py = cy + Math.sin(a) * rr;
        if (s === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.strokeStyle = col;
      ctx.globalAlpha = t * 0.85;
      ctx.lineWidth = w;
      ctx.stroke();
    }
    // Caustic highlights sliding over the wheel
    for (let k = 0; k < 4; k++) {
      const a = time * 0.9 + k * 1.6;
      ctx.globalAlpha = t * 0.35;
      ctx.strokeStyle = '#a5f3fc';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, r * (0.45 + k * 0.13), a, a + 0.7);
      ctx.stroke();
    }
  } else if (kind === 'snow') {
    // Frozen over: icy glaze, rim ice spikes and a giant frost sigil
    const fg = ctx.createRadialGradient(cx, cy, r * 0.1, cx, cy, r + 2);
    fg.addColorStop(0, `rgba(224,242,254,${0.08 * t})`);
    fg.addColorStop(0.7, `rgba(186,230,253,${0.2 * t})`);
    fg.addColorStop(1, `rgba(255,255,255,${0.45 * t})`);
    ctx.fillStyle = fg;
    ctx.beginPath();
    ctx.arc(cx, cy, r + 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rotation);
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * Math.PI * 2;
      const L = (8 + pr(k) * 10) * t;
      ctx.save();
      ctx.rotate(a);
      const ig = ctx.createLinearGradient(0, r, 0, r + L);
      ig.addColorStop(0, 'rgba(240,249,255,0.95)');
      ig.addColorStop(1, 'rgba(125,211,252,0.5)');
      ctx.fillStyle = ig;
      ctx.globalAlpha = t;
      ctx.beginPath();
      ctx.moveTo(-3, r);
      ctx.lineTo(0, r + L);
      ctx.lineTo(3, r);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    drawSnowflake(ctx, 0, 0, r * 0.82, 0, '#38bdf8', t * 0.7, 3);
    drawSnowflake(ctx, 0, 0, r * 0.82, 0, '#ffffff', t * 0.8, 1.1);
    ctx.restore();
    ctx.strokeStyle = `rgba(255,255,255,${0.8 * t})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, r + 1, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

// ============================================================================
// ELEMENTAL PARTICLE RENDERERS
// ============================================================================
export function drawElementalParticle(ctx: C2D, p: Particle, lifeRatio: number, time: number): boolean {
  const a = p.alpha * lifeRatio;
  switch (p.type) {
    case 'trail':
      drawKindTrail(ctx, p.kind ?? 'obliterator', p.x, p.y, (p.y2 ?? p.y) - p.y, a, time, false, p.color);
      return true;
    case 'ripple': {
      ctx.save();
      ctx.globalAlpha = a;
      ctx.strokeStyle = '#67e8f9';
      ctx.lineWidth = 3 * lifeRatio + 0.6;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, p.size, p.size * 0.32, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = '#e0f7ff';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, p.size * 0.7, p.size * 0.22, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      return true;
    }
    case 'shard': {
      ctx.save();
      ctx.globalAlpha = Math.min(1, a * 1.3);
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot ?? 0);
      const s = p.size;
      const g = ctx.createLinearGradient(-s, 0, s, 0);
      g.addColorStop(0, 'rgba(96,165,250,0.95)');
      g.addColorStop(0.5, '#ffffff');
      g.addColorStop(1, 'rgba(186,230,253,0.95)');
      ctx.fillStyle = g;
      ctx.strokeStyle = '#f0f9ff';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(0, -s * 1.8);
      ctx.lineTo(s * 0.7, 0);
      ctx.lineTo(0, s * 0.9);
      ctx.lineTo(-s * 0.7, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
      return true;
    }
    case 'rainbowArc': {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot ?? 0);
      for (let i = 0; i < 7; i++) {
        ctx.strokeStyle = SPECTRUM[i];
        ctx.globalAlpha = a;
        ctx.lineWidth = 3.4;
        ctx.beginPath();
        ctx.arc(0, 0, Math.max(1, p.size - i * 3.6), Math.PI, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
      return true;
    }
    case 'confetti': {
      ctx.save();
      ctx.globalAlpha = Math.min(1, a * 1.4);
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot ?? 0);
      ctx.scale(1, Math.cos((p.rot ?? 0) * 2.3));
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size, -p.size * 0.45, p.size * 2, p.size * 0.9);
      ctx.restore();
      return true;
    }
    case 'shock':
      drawShock(ctx, p.kind ?? 'pistol', p.x, p.y, p.size, a, time);
      return true;
    case 'frostRing': {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = a;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot ?? 0);
      ctx.strokeStyle = '#bae6fd';
      ctx.lineWidth = 2.4 * lifeRatio + 0.6;
      ctx.beginPath();
      for (let k = 0; k <= 6; k++) {
        const ang = (k / 6) * Math.PI * 2;
        const px = Math.cos(ang) * p.size;
        const py = Math.sin(ang) * p.size * 0.5;
        if (k === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
      for (let k = 0; k < 6; k++) {
        const ang = (k / 6) * Math.PI * 2;
        const px = Math.cos(ang) * p.size;
        const py = Math.sin(ang) * p.size * 0.5;
        drawSnowflake(ctx, px, py, 4, time * 3, '#ffffff', a, 1);
      }
      ctx.restore();
      return true;
    }
    default:
      return false;
  }
}
