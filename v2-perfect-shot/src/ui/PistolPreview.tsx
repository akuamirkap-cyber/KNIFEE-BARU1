import { useEffect, useRef } from 'react';
import { pistol } from '../art/pistol';
import { gunState } from '../art/kit';
import { commonGunPreviewState } from '../art/motion';
import { PISTOL_METRICS } from '../weapons';
import { useLiteActive } from '../context';

/** Original Arsenal 45° presentation, with its real fire/slide preview timing. */
export function PistolPreview({ width, height, thumb = false }: { width: number; height: number; thumb?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null), active = useLiteActive();
  useEffect(() => {
    const c = ref.current, ctx = c?.getContext('2d'); if (!c || !ctx) return;
    const dpr = Math.min(globalThis.devicePixelRatio || 1, 2);
    c.width = Math.round(width * dpr); c.height = Math.round(height * dpr);
    let raf = 0; const started = performance.now();
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    const paint = (now: number) => {
      const t = reduced?.matches ? 0 : (now - started) / 1000;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, width, height);
      ctx.save(); ctx.translate(width / 2, height / 2 - (thumb ? 0 : 4));
      ctx.rotate(Math.PI / 4 + Math.sin(t * (thumb ? 2.8 : 2.2)) * (thumb ? 0.045 : 0.05));
      const scale = height * (thumb ? 0.92 : 0.98) / PISTOL_METRICS.span;
      ctx.scale(scale, scale);
      const old = gunState.sinceShot;
      gunState.sinceShot = commonGunPreviewState(t).sinceShot;
      pistol(ctx, -PISTOL_METRICS.centerOffsetX, -PISTOL_METRICS.centerOffsetY, t);
      gunState.sinceShot = old; ctx.restore();
      if (active && !reduced?.matches) raf = requestAnimationFrame(paint);
    };
    paint(started); return () => cancelAnimationFrame(raf);
  }, [width, height, thumb, active]);
  return <canvas ref={ref} width={width} height={height} style={{ width, height }} className="pointer-events-none block max-w-full drop-shadow-[0_6px_6px_rgba(0,0,0,.52)]" aria-label="PISTOL" />;
}
