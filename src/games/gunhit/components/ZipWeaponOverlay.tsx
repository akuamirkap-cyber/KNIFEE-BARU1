import { useEffect, useRef } from 'react';
import ZipWeaponArt from './ZipWeaponArt';

/** Ink height of a zip weapon in play, before the rig's 1.12x pose. */
export const ZIP_GUN_INK_HEIGHT = 185;

type Frame = { x: number; y: number; rot: number; scale: number; hidden: boolean };

/**
 * The player's weapon during a run, for the five zip weapons.
 *
 * The engine reports where the gun stands (`getZipGunFrame`) and stops drawing
 * that weapon into its canvas; this layer puts the zip's own animated SVG on
 * that anchor. The transform is written straight to the DOM inside one rAF loop,
 * so the 60 fps pose never re-renders React.
 */
export default function ZipWeaponOverlay({ id, read }: { id: string; read: () => Frame | null }) {
  const poseRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let raf = 0;
    let shown = true;
    const tick = () => {
      const el = poseRef.current;
      const frame = read();
      if (el) {
        const visible = Boolean(frame && !frame.hidden);
        if (visible) {
          el.style.transform = `translate3d(${frame!.x}px, ${frame!.y}px, 0) rotate(${frame!.rot}rad) scale(${frame!.scale})`;
        }
        if (visible !== shown) {
          el.style.opacity = visible ? '1' : '0';
          shown = visible;
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [read]);

  return (
    <div
      ref={poseRef}
      data-zip-gun-overlay={id}
      className="pointer-events-none absolute left-0 top-0 z-[6]"
      style={{ transformOrigin: '0 0', willChange: 'transform', opacity: 0 }}
    >
      <ZipWeaponArt id={id} height={ZIP_GUN_INK_HEIGHT} anchor="muzzle" />
    </div>
  );
}
