import { useEffect, useRef, useState, type RefObject } from 'react';
import ZipWeaponArt from './ZipWeaponArt';
import { CX, GAMEPLAY_GUN_SCALE, GUN_Y } from '../game/layout';

/**
 * The cyan faceted round Diamond Gun holds on its muzzle (design #3): it leaves
 * with the shot and grows back, so the gun is never seen firing "empty".
 */
function MuzzleGem({ innerRef }: { innerRef: RefObject<HTMLDivElement | null> }) {
  return (
    <div
      ref={innerRef}
      aria-hidden="true"
      className="pointer-events-none absolute"
      style={{ left: -9, top: -7, width: 18, height: 18, transformOrigin: '50% 50%' }}
    >
      <svg viewBox="-10 -12 20 24" width="18" height="18" style={{ display: 'block', overflow: 'visible' }}>
        <defs>
          <linearGradient id="zip-gem-a" x1="-6" y1="-10" x2="6" y2="10" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#f2fdff" />
            <stop offset="0.45" stopColor="#9fe8ff" />
            <stop offset="1" stopColor="#2086e0" />
          </linearGradient>
          <linearGradient id="zip-gem-b" x1="-8" y1="0" x2="8" y2="0" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#5cc8f5" />
            <stop offset="0.5" stopColor="#d9f7ff" />
            <stop offset="1" stopColor="#2f9be6" />
          </linearGradient>
        </defs>
        <polygon points="0,-11 8,-2 0,11 -8,-2" fill="url(#zip-gem-a)" stroke="#bfefff" strokeWidth="0.8" />
        <polygon points="0,-11 0,11 -8,-2" fill="url(#zip-gem-b)" opacity="0.75" />
        <polygon points="0,-6 4,-1 0,5 -4,-1" fill="#ffffff" opacity="0.85" />
      </svg>
    </div>
  );
}

/** Ink height of a zip weapon in play, before the rig's 1.12x pose. */
export const ZIP_GUN_INK_HEIGHT = 250;

type Frame = { x: number; y: number; rot: number; scale: number; hidden: boolean };

/** Where the gun stands when the engine has not reported a pose yet. */
const STAND: Frame = { x: CX, y: GUN_Y, rot: 0, scale: GAMEPLAY_GUN_SCALE, hidden: false };

/**
 * The player's weapon during a run, for the five zip weapons.
 *
 * The engine reports where the gun stands (`getZipGunFrame`) and stops drawing
 * that weapon into its canvas; this layer puts the zip's own animated SVG on
 * that anchor. The transform is written straight to the DOM inside one rAF loop,
 * so the 60 fps pose never re-renders React.
 */
export default function ZipWeaponOverlay({
  id,
  read,
  readShotAt,
}: {
  id: string;
  read: () => Frame | null;
  /** `performance.now()` of the last shot: the muzzle round leaves on that beat. */
  readShotAt?: () => number;
}) {
  const poseRef = useRef<HTMLDivElement>(null);
  const gemRef = useRef<HTMLDivElement>(null);
  const [debug, setDebug] = useState('');

  useEffect(() => {
    let raf = 0;
    const showDebug = typeof location !== 'undefined' && /[?&]zipdebug=1/.test(location.search);
    let ticks = 0;
    const tick = () => {
      const el = poseRef.current;
      const frame = read();
      // A pose the engine has not reported yet is not a reason to hide the
      // weapon: it stands on the layout's own anchor until the engine speaks.
      const pose = frame ?? STAND;
      const visible = !pose.hidden;
      if (el) {
        el.style.transform = `translate3d(${pose.x}px, ${pose.y}px, 0) rotate(${pose.rot}rad) scale(${pose.scale})`;
        // Written every frame: the element ships hidden, so the very first frame
        // that finds the gun must switch it on (a "changed?" check once left the
        // weapon invisible for the whole run).
        el.style.opacity = visible ? '1' : '0';
        // Diamond Gun keeps its round on the muzzle: for a beat after the shot
        // the gem is gone (it is the round that just left) and then it grows back.
        if (gemRef.current) {
          const since = performance.now() - (readShotAt?.() ?? 0);
          const back = since < 90 ? 0 : since < 320 ? (since - 90) / 230 : 1;
          gemRef.current.style.opacity = String(back.toFixed(3));
          gemRef.current.style.transform = `scale(${(0.55 + 0.45 * back).toFixed(3)})`;
        }
        if (showDebug && ticks++ % 30 === 0) {
          const svg = el.querySelector('svg');
          const img = el.querySelector('img');
          setDebug(
            `frame=${frame ? 'ok' : 'null'} pose=${pose.x.toFixed(0)},${pose.y.toFixed(0)} ` +
            `op=${el.style.opacity} svg=${svg ? `${Math.round(svg.getBoundingClientRect().width)}w` : 'none'} ` +
            `img=${img && img.complete ? `${img.naturalWidth}w` : 'loading'}`,
          );
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [read]);

  return (
    <>
      <div
        ref={poseRef}
        data-zip-gun-overlay={id}
        className="pointer-events-none absolute left-0 top-0 z-[6]"
        style={{ transformOrigin: '0 0', willChange: 'transform', opacity: 0 }}
      >
        <ZipWeaponArt id={id} height={ZIP_GUN_INK_HEIGHT} anchor="muzzle" />
        {id === 'diamond' && <MuzzleGem innerRef={gemRef} />}
      </div>
      {debug && (
        <div className="pointer-events-none absolute bottom-1 left-1 z-[7] rounded bg-black/70 px-1.5 py-1 text-[10px] font-mono text-lime-300">
          {debug}
        </div>
      )}
    </>
  );
}
