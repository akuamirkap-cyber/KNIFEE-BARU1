// Original v1 PISTOL renderer, copied verbatim. No other weapon renderer is shipped.
import { gunState } from './kit';
import { TAU } from '../config';
import { shotPulse } from './motion';

export function pistol(c: CanvasRenderingContext2D, cx: number, y0: number, t: number) {
  const recoil = shotPulse(gunState.sinceShot, 0.25);
  const s = recoil * 14;

  const lin2 = (x0: number, y0p: number, x1: number, y1p: number, stops: [number, string][]) => {
    const g = c.createLinearGradient(x0, y0p, x1, y1p);
    for (const [o, col] of stops) g.addColorStop(o, col);
    return g;
  };
  const metalY = (ya: number, yb: number, hi: string, mid: string, _dark: string) =>
    lin2(0, ya, 0, yb, [
      [0, '#5a6b7c'],
      [0.16, '#f8fbff'],
      [0.38, hi],
      [0.68, '#b8c7d8'],
      [0.88, mid],
      [1, '#4a5866'],
    ]);
  const steelY = (ya: number, yb: number) =>
    lin2(0, ya, 0, yb, [
      [0, '#5c6d7e'],
      [0.16, '#ffffff'],
      [0.36, '#dce6f2'],
      [0.62, '#aebfd2'],
      [0.86, '#7d8fa1'],
      [1, '#4a5866'],
    ]);
  const woodX = (xa: number, xb: number) =>
    lin2(xa, 0, xb, 0, [
      [0, '#170d06'],
      [0.3, '#5b3a1e'],
      [0.6, '#43290f'],
      [1, '#120a04'],
    ]);
  const gold2 = (x0p: number, y0p: number, x1p: number, y1p: number) =>
    lin2(x0p, y0p, x1p, y1p, [
      [0, '#6b470c'],
      [0.35, '#fff1b8'],
      [0.55, '#f5c542'],
      [1, '#7a5310'],
    ]);
  const poly = (pts: number[]) => {
    c.beginPath();
    c.moveTo(pts[0], pts[1]);
    for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]);
    c.closePath();
  };
  const paint = (fill: string | CanvasGradient, stroke?: string, lw = 0.72) => {
    c.fillStyle = fill;
    c.fill();
    if (stroke) {
      c.strokeStyle = stroke;
      c.lineWidth = lw;
      c.stroke();
    }
  };
  const dotGlow = (x: number, y: number, r: number, color: string, alpha = 1) => {
    if (alpha <= 0.01) return;
    c.save();
    c.globalCompositeOperation = 'lighter';
    c.globalAlpha = Math.min(1, alpha);
    const g = c.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.3, color);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g;
    c.beginPath();
    c.arc(x, y, r, 0, TAU);
    c.fill();
    c.restore();
  };

  // Uniform scale (1.15x on both axes — zero aspect-ratio distortion!)
  // Local coordinates:
  //   x in [-50 .. +96] along barrel axis (146 units * 1.15 = 168px total length, matching Golden/Chrono Gun)
  //   y in [-19.5 .. +70] perpendicular to barrel (slide y=-15..5, frame y=5..15, grip y=14..65, mag pad y=65..70)
  // Muzzle bore center (96, -7.5) is placed at (cx, y0).
  const sc = 1.15;
  c.save();
  c.translate(cx + 7.5 * sc, y0 + 96 * sc);
  c.rotate(-Math.PI / 2);
  c.scale(sc, sc);

  // ══════════════════ 1. LARAS (BARREL, BUSHING & RECOIL PLUG) ══════════════════
  // The laras rides back WITH the slide. On a short-recoil pistol the barrel and
  // the slide travel rearward together for the first part of the cycle, so while
  // the slide above retracted the barrel used to stay nailed to the frame: the
  // muzzle hung out in front of a gap with the dust cover behind it, which read
  // as a detached muzzle. Same travel, same frame, no seam.
  c.save();
  c.translate(-s, 0);
  // Precision crowned .45 ACP barrel protruding cleanly from the front bushing
  c.beginPath();
  c.roundRect(78, -13.2, 18, 10.8, [0, 2.5, 2.5, 0]);
  paint(metalY(-13.2, -2.4, '#e2ecf5', '#7b8b9c', '#1e2630'), 'rgba(18,26,38,0.62)', 0.72);
  // Barrel crown bevel & dark rifled bore
  c.fillStyle = '#070a0e';
  c.beginPath();
  c.ellipse(95.4, -7.8, 1.3, 3.6, 0, 0, TAU);
  c.fill();
  c.strokeStyle = 'rgba(255,255,255,0.55)';
  c.lineWidth = 0.85;
  c.beginPath();
  c.moveTo(82, -11.2);
  c.lineTo(94, -11.2);
  c.stroke();

  // Checkered recoil spring plug beneath barrel
  c.beginPath();
  c.roundRect(78, -1.6, 12.5, 6.2, [0, 2, 2, 0]);
  paint(metalY(-1.6, 4.6, '#9fb0c2', '#3a444f', '#12161c'), 'rgba(18,26,38,0.62)', 0.68);
  c.strokeStyle = 'rgba(10,14,18,0.5)';
  c.lineWidth = 0.7;
  c.beginPath();
  c.moveTo(88.5, -1);
  c.lineTo(88.5, 4);
  c.stroke();

  c.restore();

  // ══════════════════ 2. BADAN BAWAH PISTOL (STEEL FRAME & DUST COVER) ══════════════════
  // Substantial forged-steel receiver & dust cover supporting the slide
  c.beginPath();
  c.moveTo(-38, 4.5);
  c.lineTo(66, 4.5);
  c.lineTo(66, 11.5);
  c.quadraticCurveTo(64, 15, 58, 15);
  c.lineTo(2, 15);
  c.lineTo(-38, 15);
  c.closePath();
  paint(metalY(4.5, 15, '#8b9aa9', '#3a444f', '#12161c'), 'rgba(18,26,38,0.65)', 0.75);

  // Frame rail highlight & dust-cover mill groove
  c.strokeStyle = 'rgba(220,235,250,0.34)';
  c.lineWidth = 0.85;
  c.beginPath();
  c.moveTo(-34, 6.2);
  c.lineTo(63, 6.2);
  c.stroke();

  // Recessed .45 LEGACY tritium status pips in the dust-cover groove
  c.fillStyle = '#090d12';
  c.beginPath();
  c.roundRect(35, 8.2, 25, 3.8, 1.5);
  c.fill();
  for (let i = 0; i < 5; i++) {
    const px = 37.2 + i * 4.6;
    c.fillStyle = '#7fb3ff';
    c.beginPath();
    c.roundRect(px, 9, 3.2, 2.2, 0.8);
    c.fill();
  }

  // Slide-stop lever & takedown pin on the frame
  c.beginPath();
  c.roundRect(-4, 7.2, 22, 4.2, 1.8);
  paint(metalY(7.2, 11.4, '#aebfd2', '#4a5866', '#161c23'), 'rgba(18,26,38,0.58)', 0.65);
  c.fillStyle = '#1b222a';
  c.beginPath();
  c.arc(15, 9.3, 2.3, 0, TAU);
  c.fill();
  c.strokeStyle = '#9fb0c2';
  c.lineWidth = 0.65;
  c.stroke();

  // Sculpted Beavertail Grip Safety & Spurred Combat Hammer
  c.beginPath();
  c.moveTo(-34, 4.5);
  c.quadraticCurveTo(-47, 4.5, -49, 9.5);
  c.quadraticCurveTo(-48, 13.5, -41, 14.5);
  c.lineTo(-32, 15);
  c.closePath();
  paint(metalY(4.5, 15, '#9fb0c2', '#3a444f', '#12161c'), 'rgba(18,26,38,0.62)', 0.72);

  // Spurred M1911 Hammer (pivots back with recoil)
  c.save();
  c.translate(-35, 1);
  c.rotate(-recoil * 0.45);
  c.beginPath();
  c.moveTo(0, -2);
  c.lineTo(-11, -10);
  c.lineTo(-13, -5.5);
  c.lineTo(-4, 2);
  c.closePath();
  paint(metalY(-10, 2, '#d0dce8', '#566575', '#161c23'), 'rgba(18,26,38,0.62)', 0.68);
  c.fillStyle = '#090d12';
  c.beginPath();
  c.arc(-6, -4.5, 1.4, 0, TAU);
  c.fill();
  c.restore();

  // ══════════════════ 3. PELINDUNG & PELATUK (TRIGGER GUARD & MATCH TRIGGER) ══════════════════
  // Precision M1911 trigger guard with front-strap undercut
  c.beginPath();
  c.moveTo(-1, 14.5);
  c.lineTo(4, 14.5);
  c.quadraticCurveTo(2, 28.5, 10, 29.5);
  c.lineTo(25, 29.5);
  c.quadraticCurveTo(31, 29.5, 31, 14.5);
  c.lineTo(35.5, 14.5);
  c.quadraticCurveTo(35.5, 33.5, 25.5, 33.5);
  c.lineTo(9.5, 33.5);
  c.quadraticCurveTo(-2.5, 33, -1, 14.5);
  c.closePath();
  paint(metalY(14.5, 33.5, '#9fb0c2', '#3a444f', '#10151b'), 'rgba(18,26,38,0.62)', 0.72);

  // Skeletonized M1911 match trigger (slides rearward on shot)
  c.save();
  c.translate(18 - recoil * 4.2, 15);
  c.beginPath();
  c.moveTo(-3.5, 0);
  c.lineTo(2.5, 0);
  c.quadraticCurveTo(5.5, 7, 2.5, 14.2);
  c.lineTo(-2.5, 14.2);
  c.quadraticCurveTo(0.2, 7, -3.5, 0);
  c.closePath();
  paint(metalY(0, 14.2, '#e2e8f0', '#64748b', '#1e293b'), 'rgba(18,26,38,0.6)', 0.65);
  // Trigger lightening holes
  c.fillStyle = '#0b0f14';
  for (const ty of [4.2, 7.5, 10.8]) {
    c.beginPath();
    c.arc(0.4, ty, 0.95, 0, TAU);
    c.fill();
  }
  c.restore();

  // ══════════════════ 4. GAGANG (STEEL GRIP FRAME, WALNUT PANEL & FLUSH BASEPAD) ══════════════════
  // Full-tang steel grip frame (front strap + arched mainspring housing)
  const gripFramePath = () => {
    c.beginPath();
    c.moveTo(-38, 14.5);
    c.lineTo(1, 14.5);
    c.quadraticCurveTo(-2, 38, -14, 64.5);
    c.lineTo(-47, 64.5);
    c.quadraticCurveTo(-48, 49, -43, 30);
    c.quadraticCurveTo(-40, 20, -38, 14.5);
    c.closePath();
  };
  gripFramePath();
  paint(metalY(14.5, 65, '#8b9aa9', '#3a444f', '#12161c'), 'rgba(18,26,38,0.65)', 0.78);

  // Front-strap checkering notches & mainspring ribs
  c.strokeStyle = 'rgba(15,22,32,0.58)';
  c.lineWidth = 0.78;
  for (let i = 0; i < 6; i++) {
    const fy = 22 + i * 6.5;
    const fx = -1 - i * 2.1;
    c.beginPath();
    c.moveTo(fx - 2.2, fy);
    c.lineTo(fx + 0.5, fy);
    c.stroke();
  }

  // Inset Checkered Walnut Grip Panel (framed cleanly inside the steel grip)
  const walnutPanelPath = () => {
    c.beginPath();
    c.moveTo(-33.5, 18.5);
    c.lineTo(-4.5, 18.5);
    c.quadraticCurveTo(-7.5, 38, -18.5, 60.5);
    c.lineTo(-42, 60.5);
    c.quadraticCurveTo(-42.5, 44, -37.5, 28);
    c.closePath();
  };
  walnutPanelPath();
  paint(woodX(-43, -4), 'rgba(34,15,6,0.65)', 0.72);

  c.save();
  walnutPanelPath();
  c.clip();
  // Preserve rearward grip rake reference while drawing diamond checkering
  c.save();
  c.rotate(-0.72);
  c.restore();
  c.strokeStyle = 'rgba(0,0,0,0.34)';
  c.lineWidth = 0.68;
  c.beginPath();
  for (let k = -8; k < 12; k++) {
    c.moveTo(-50 + k * 5.2, 17);
    c.lineTo(-22 + k * 5.2, 62);
    c.moveTo(-22 + k * 5.2, 17);
    c.lineTo(-50 + k * 5.2, 62);
  }
  c.stroke();
  // Warm wood-border bevel highlight
  c.strokeStyle = 'rgba(255,215,160,0.22)';
  c.lineWidth = 0.75;
  walnutPanelPath();
  c.stroke();
  c.restore();

  // Golden M1911 Legacy Medallion centered in the walnut grip panel
  c.beginPath();
  c.arc(-24.5, 39.5, 3.8, 0, TAU);
  paint(gold2(-28, 36, -21, 43), 'rgba(58,34,6,0.65)', 0.65);
  c.fillStyle = '#fff6cc';
  c.beginPath();
  c.arc(-24.5, 39.5, 1.3, 0, TAU);
  c.fill();

  // Two precision grip bushing screws (top & bottom)
  for (const [sx, sy] of [
    [-19, 24.5],
    [-30, 54.5],
  ] as const) {
    c.beginPath();
    c.arc(sx, sy, 2, 0, TAU);
    paint(metalY(sy - 2, sy + 2, '#e2e8f0', '#64748b', '#1e293b'), 'rgba(18,26,38,0.6)', 0.62);
    c.strokeStyle = '#0b0f14';
    c.lineWidth = 0.62;
    c.beginPath();
    c.moveTo(sx - 1.2, sy - 0.5);
    c.lineTo(sx + 1.2, sy + 0.5);
    c.stroke();
  }

  // Flush Magazine Base Pad (aligned strictly with the grip heel & toe — no overhang!)
  c.beginPath();
  c.moveTo(-48, 64.5);
  c.lineTo(-13, 64.5);
  c.quadraticCurveTo(-11.5, 67.5, -14, 69.8);
  c.lineTo(-46.5, 69.8);
  c.quadraticCurveTo(-49, 67.5, -48, 64.5);
  c.closePath();
  paint(metalY(64.5, 70, '#9fb0c2', '#3a444f', '#10151b'), 'rgba(18,26,38,0.62)', 0.72);
  dotGlow(-30.5, 67.2, 2.8, '#c9a24a', 0.85);

  // Thumb safety lever (mounted at frame/slide junction)
  c.beginPath();
  c.roundRect(-36, 3.2, 13, 4.2, 2);
  paint(metalY(3.2, 7.4, '#cbd5e1', '#4a5866', '#161c23'), 'rgba(18,26,38,0.6)', 0.65);

  // ══════════════════ 5. BADAN ATAS PISTOL (BLUED-STEEL SLIDE & BARREL BUSHING) ══════════════════
  c.save();
  c.translate(-s, 0);

  // Muscular M1911 slide body
  c.beginPath();
  c.moveTo(-36, -15);
  c.lineTo(74, -15);
  c.quadraticCurveTo(80, -15, 80, -9.5);
  c.lineTo(80, 5);
  c.lineTo(-33, 5);
  c.lineTo(-36, 1.5);
  c.closePath();
  paint(steelY(-15, 5), 'rgba(18,26,38,0.68)', 0.82);

  // Barrel bushing collar at the front of the slide
  c.beginPath();
  c.roundRect(76.5, -14.5, 4.8, 19.2, 1.4);
  paint(metalY(-14.5, 4.7, '#d0dce8', '#566575', '#161c23'), 'rgba(18,26,38,0.62)', 0.68);

  // Upper slide crown bevel & lower slide flat line
  c.strokeStyle = 'rgba(215,232,248,0.52)';
  c.lineWidth = 0.85;
  c.beginPath();
  c.moveTo(-32, -12.6);
  c.lineTo(74, -12.6);
  c.stroke();
  c.strokeStyle = 'rgba(15,22,32,0.5)';
  c.lineWidth = 0.72;
  c.beginPath();
  c.moveTo(-31, 2.2);
  c.lineTo(75, 2.2);
  c.stroke();

  // Moving metallic sheen along the slide
  const gleamX = -22 + ((t * 34) % 82);
  c.strokeStyle = `rgba(255,255,255,${0.28 + 0.14 * Math.sin(t * 2.8) ** 2})`;
  c.lineWidth = 1.4;
  c.beginPath();
  c.moveTo(gleamX, -12.2);
  c.lineTo(gleamX + 14, -12.2);
  c.stroke();

  // Ejection port + exposed brass .45 ACP barrel hood
  c.beginPath();
  c.roundRect(10, -13, 27, 10.5, 2.2);
  paint('#080b10', 'rgba(18,26,38,0.55)', 0.65);
  c.beginPath();
  c.roundRect(12, -11.8, 23, 8.2, 1.6);
  paint(gold2(12, -12, 12, -3.5), 'rgba(61,39,6,0.6)', 0.62);
  // Extractor claw & chamber line
  c.strokeStyle = 'rgba(61,39,6,0.55)';
  c.lineWidth = 0.7;
  c.beginPath();
  c.moveTo(15, -7.7);
  c.lineTo(32, -7.7);
  c.stroke();

  // Angled rear cocking serrations
  c.strokeStyle = 'rgba(15,22,32,0.68)';
  c.lineWidth = 1.05;
  c.beginPath();
  for (let x = -29; x <= -11; x += 3.6) {
    c.moveTo(x, -11);
    c.lineTo(x - 2, 1.2);
  }
  // Angled forward cocking serrations
  for (let x = 50; x <= 64.5; x += 3.6) {
    c.moveTo(x, -11);
    c.lineTo(x - 2, 1.2);
  }
  c.stroke();

  // Dovetail rear combat sight
  poly([-33, -15, -31, -19.5, -22, -19.5, -20.5, -15]);
  paint('#0c1117', 'rgba(18,26,38,0.6)', 0.65);
  c.fillStyle = '#e2e8f0';
  c.beginPath();
  c.arc(-26.5, -17.2, 1.1, 0, TAU);
  c.fill();

  // Ramped front sight with glowing amber dot
  poly([66, -15, 69, -19.5, 75.5, -19.5, 76.5, -15]);
  paint('#0c1117', 'rgba(18,26,38,0.6)', 0.65);
  dotGlow(72.5, -17.2, 2.8, '#fbbf24', 0.92);

  c.restore();
  c.restore();
}
