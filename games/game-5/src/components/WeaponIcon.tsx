import { useEffect, useRef } from "react";
import type { Weapon } from "../game/types";
import { measureWeapon } from "../game/measure";

interface Props {
  weapon: Weapon;
  width: number;
  height: number;
  animate?: boolean;
  shotAge?: number;
  catchAge?: number;
  discInFlight?: boolean;
  motionRate?: number;
}

export default function WeaponIcon({
  weapon,
  width,
  height,
  animate = true,
  shotAge = 100,
  catchAge = 100,
  discInFlight = false,
  motionRate = 1,
}: Props) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const signal = useRef({
    shotAge,
    catchAge,
    discInFlight,
    motionRate,
    sampledAt: performance.now(),
  });
  const renderFrame = useRef<((time: number) => void) | null>(null);

  useEffect(() => {
    signal.current = {
      shotAge,
      catchAge,
      discInFlight,
      motionRate,
      sampledAt: performance.now(),
    };
    if (!animate) renderFrame.current?.(performance.now());
  }, [shotAge, catchAge, discInFlight, motionRate, animate]);

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.floor(width * dpr);
    cv.height = Math.floor(height * dpr);
    const ctx = cv.getContext("2d")!;
    const box = measureWeapon(weapon);
    const s = Math.min(
      (width - 8) / Math.max(1, box.w),
      (height - 8) / Math.max(1, box.h),
    );
    const cxBox = box.x + box.w / 2;
    const cyBox = box.y + box.h / 2;

    let raf = 0;
    let last = 0;
    const drawFrame = (t: number) => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      ctx.save();
      ctx.translate(width / 2 - cxBox * s, height / 2 - cyBox * s);
      ctx.scale(s, s);
      const sample = signal.current;
      const elapsed = animate ? Math.max(0, t - sample.sampledAt) / 1000 : 0;
      weapon.draw(ctx, {
        t: animate ? t / 1000 : 0.4,
        recoil: 0,
        charge: 0.25,
        icon: true,
        selected: animate,
        shotAge: sample.shotAge + elapsed * sample.motionRate,
        catchAge: sample.catchAge + elapsed,
        discInFlight: sample.discInFlight,
      });
      ctx.restore();
    };
    renderFrame.current = drawFrame;
    const draw = (t: number) => {
      if (animate && t - last < 15.5) {
        raf = requestAnimationFrame(draw);
        return;
      }
      last = t;
      drawFrame(t);
      if (animate) raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      renderFrame.current = null;
    };
  }, [weapon, width, height, animate]);

  return (
    <canvas
      ref={ref}
      style={{ width, height }}
      className="block"
      aria-label={`Ilustrasi ${weapon.name}`}
      role="img"
      data-shot-age={shotAge.toFixed(3)}
      data-disc-in-flight={discInFlight}
    />
  );
}
