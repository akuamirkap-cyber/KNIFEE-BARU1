import { TAU } from '../config';

export const FONT = '"Arial", "DejaVu Sans", sans-serif';
export function circle(c: CanvasRenderingContext2D, x: number, y: number, r: number, fill?: string | CanvasGradient): void {
  c.beginPath(); c.arc(x, y, Math.max(0, r), 0, TAU);
  if (fill) { c.fillStyle = fill; c.fill(); }
}
export function ring(c: CanvasRenderingContext2D, r: number, color: string, width = 1, start = 0, end = TAU): void {
  c.beginPath(); c.arc(0, 0, r, start, end); c.strokeStyle = color; c.lineWidth = width; c.stroke();
}
export function rounded(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  c.beginPath(); c.moveTo(x + rr, y); c.arcTo(x + w, y, x + w, y + h, rr);
  c.arcTo(x + w, y + h, x, y + h, rr); c.arcTo(x, y + h, x, y, rr);
  c.arcTo(x, y, x + w, y, rr); c.closePath();
}
export function box(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, fill: string | CanvasGradient, stroke?: string): void {
  rounded(c, x, y, w, h, r); c.fillStyle = fill; c.fill();
  if (stroke) { c.strokeStyle = stroke; c.lineWidth = 1; c.stroke(); }
}
export function poly(c: CanvasRenderingContext2D, pts: readonly (readonly [number, number])[], fill: string | CanvasGradient, stroke?: string, width = 1): void {
  c.beginPath(); pts.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.closePath();
  c.fillStyle = fill; c.fill(); if (stroke) { c.strokeStyle = stroke; c.lineWidth = width; c.stroke(); }
}
export function radial(c: CanvasRenderingContext2D, x: number, y: number, radius: number, stops: [number, string][]): CanvasGradient {
  const g = c.createRadialGradient(x, y, 0, 0, 0, radius);
  for (const [at, color] of stops) g.addColorStop(at, color);
  return g;
}
export function label(c: CanvasRenderingContext2D, value: string, x: number, y: number, size: number, color: string, weight = 700, align: CanvasTextAlign = 'center'): void {
  c.font = `${weight} ${size}px ${FONT}`; c.textAlign = align; c.textBaseline = 'middle';
  c.fillStyle = color; c.fillText(value, x, y);
}
export function line(c: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, color: string, width = 1): void {
  c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.strokeStyle = color; c.lineWidth = width; c.stroke();
}
export function star(c: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, points = 5, inner = 0.46): void {
  c.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const a = -Math.PI / 2 + i * Math.PI / points, rr = i % 2 ? r * inner : r;
    const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr;
    if (!i) c.moveTo(px, py); else c.lineTo(px, py);
  }
  c.closePath(); c.fillStyle = color; c.fill();
}
/** Stable pseudo-random decoration. It never changes the gameplay RNG. */
export const noise = (seed: number): number => { const n = Math.sin(seed * 127.1 + 311.7) * 43758.5453; return n - Math.floor(n); };
