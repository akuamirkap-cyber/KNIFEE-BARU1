const TAU = Math.PI * 2;
export function drawOrange(c: CanvasRenderingContext2D, R: number) {
 c.save(); c.beginPath(); c.arc(0, 0, R, 0, TAU); c.clip();

      const k = R / 100; // SVG unit -> canvas unit
      const u = (v: number) => v * k;
      // r=98 stroke #b45309 width 4 runs from 96 to 100, i.e. right to the rim.
      c.beginPath();
      c.arc(0, 0, R, 0, TAU);
      c.fillStyle = '#b45309';
      c.fill();
      // r=98 rind
      c.beginPath();
      c.arc(0, 0, u(98), 0, TAU);
      c.fillStyle = '#f59e0b';
      c.fill();
      c.lineWidth = u(4);
      c.strokeStyle = '#b45309';
      c.stroke();
      // r=90 pith
      c.beginPath();
      c.arc(0, 0, u(90), 0, TAU);
      c.fillStyle = '#fff4dc';
      c.fill();
      // r=83 flesh with the reference radial gradient (white 50% -> orange)
      const flesh = c.createRadialGradient(0, 0, 0, 0, 0, u(83));
      flesh.addColorStop(0, 'rgba(255,255,255,0.5)');
      flesh.addColorStop(0.25, '#fb923c');
      flesh.addColorStop(1, '#ea7a1c');
      c.beginPath();
      c.arc(0, 0, u(83), 0, TAU);
      c.fillStyle = flesh;
      c.fill();
      // 10 spokes from the centre out to r=84
      c.strokeStyle = '#fff4dc';
      c.lineWidth = u(4);
      c.lineCap = 'round';
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * TAU;
        c.beginPath();
        c.moveTo(0, 0);
        c.lineTo(Math.cos(a) * u(84), Math.sin(a) * u(84));
        c.stroke();
      }
      // 30 juice seeds (rx 7 / ry 2.2), rotated to their own angle
      c.fillStyle = 'rgba(255,255,255,0.45)';
      for (let i = 0; i < 30; i++) {
        const a = (i / 30) * TAU + 0.18;
        const r = u(34 + (i % 3) * 16);
        c.beginPath();
        c.ellipse(Math.cos(a) * r, Math.sin(a) * r, u(7), u(2.2), a, 0, TAU);
        c.fill();
      }
      // centre pith
      c.beginPath();
      c.arc(0, 0, u(9), 0, TAU);
      c.fillStyle = '#fff4dc';
      c.fill();
      // glossy streak: M-70 -50 A85 85 0 0 1 -20 -82, stroke #fff width 6, .55
      c.beginPath();
      c.arc(0, 0, u(85), Math.atan2(-50, -70), Math.atan2(-82, -20));
      c.strokeStyle = 'rgba(255,255,255,0.55)';
      c.lineWidth = u(6);
      c.lineCap = 'round';
      c.stroke();
      c.lineCap = 'butt';


 c.restore();
}
