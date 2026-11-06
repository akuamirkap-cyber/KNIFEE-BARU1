/** Only the original PISTOL ammo sprite (projectiles.ts round, normal palette). */
export function drawPistolRound(c: CanvasRenderingContext2D, len = 38) {
  const lin = (stops: string[]) => { const g = c.createLinearGradient(-6, 0, 6, 0); stops.forEach((s, i) => g.addColorStop(i / (stops.length - 1), s)); return g; };
  c.save(); c.scale(0.78, 1);
  const head = Math.round(len * 0.38);
  c.beginPath(); c.moveTo(-5, head); c.lineTo(-5, 7); c.quadraticCurveTo(-4.5, 0, 0, -1); c.quadraticCurveTo(4.5, 0, 5, 7); c.lineTo(5, head); c.closePath();
  c.fillStyle = lin(['#7a3212', '#f6b07a', '#7a3212']); c.fill();
  c.fillStyle = lin(['#8c5e10', '#ffe695', '#8c5e10']); c.fillRect(-5.5, head, 11, len - head - 3.5);
  c.fillStyle = 'rgba(0,0,0,0.35)'; c.fillRect(-5.5, head, 11, 1.5); c.fillRect(-5.5, len - 5.5, 11, 1.5);
  c.fillStyle = '#c08a24'; c.fillRect(-6.5, len - 3.5, 13, 3.5); c.restore();
}
