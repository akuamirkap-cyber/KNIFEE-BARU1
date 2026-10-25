import { useEffect, useRef } from 'react';
import type { Weapon } from '../game/types';
import { measureWeapon } from '../game/measure';

interface Props {
  weapon: Weapon;
  width: number;
  height: number;
  animate?: boolean;
}

export default function WeaponIcon({ weapon, width, height, animate = true }: Props) {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.floor(width * dpr);
    cv.height = Math.floor(height * dpr);
    const ctx = cv.getContext('2d')!;
    const box = measureWeapon(weapon);
    const s = Math.min((width - 8) / Math.max(1, box.w), (height - 8) / Math.max(1, box.h));
    const cxBox = box.x + box.w / 2;
    const cyBox = box.y + box.h / 2;

    let raf = 0;
    let last = 0;
    const draw = (t: number) => {
      if (animate && t - last < 66) {
        raf = requestAnimationFrame(draw);
        return;
      }
      last = t;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      ctx.save();
      ctx.translate(width / 2 - cxBox * s, height / 2 - cyBox * s);
      ctx.scale(s, s);
      (weapon.drawIcon ?? weapon.draw)(ctx, {
        t: animate ? t / 1000 : 0.4,
        recoil: 0,
        charge: 0.25,
        cycle: 1,
        icon: true,
      });
      ctx.restore();
      if (animate) raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [weapon, width, height, animate]);

  return <canvas ref={ref} style={{ width, height }} className="block" />;
}
