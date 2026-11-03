import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';

/**
 * Modal permainan dirancang untuk bingkai potret 420×760. Saat MODE LANDSCAPE
 * aktif, bingkainya 760×420 — terlalu pendek untuk kartu yang sama.
 *
 * Alih-alih menulis ulang setiap modal, lapisan ini mengukurnya dan
 * mengecilkannya proporsional (`transform: scale`) secukupnya saja: desain,
 * teks, dan animasinya tetap sama, hanya ukurannya yang mengikuti tinggi yang
 * tersedia. Lapisannya sendiri diperbesar dulu sebesar 1/skala sehingga latar
 * gelap modal tetap menutupi seluruh bingkai.
 *
 * Di potret (atau saat `active` false) skalanya 1 dan tidak ada yang berubah.
 */
type Props = {
  children: ReactNode;
  /** Hanya aktif saat permainan sedang berjalan di bingkai landscape. */
  active: boolean;
  /** z-index lapisan (modal aslinya memakai z-40 / z-50). */
  z?: number;
  /** Sisa ruang aman di atas & bawah kartu, dalam px bingkai. */
  padding?: number;
};

export default function FitLandscape({ children, active, z = 50, padding = 10 }: Props) {
  const boxRef = useRef<HTMLDivElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const box = boxRef.current;
    const layer = layerRef.current;
    if (!box || !layer) return;
    if (!active) {
      setScale(1);
      return;
    }
    const measure = () => {
      const available = box.clientHeight - padding * 2;
      const root = layer.firstElementChild as HTMLElement | null;
      if (!root || available <= 0) return;
      // Hanya anak yang mengalir di kolomnya yang diukur; lapisan dekoratif
      // `absolute inset-0` (vignette, header) selalu setinggi bingkai dan akan
      // membuat pengukuran bohong.
      let top = Number.POSITIVE_INFINITY;
      let bottom = Number.NEGATIVE_INFINITY;
      for (const child of Array.from(root.children)) {
        const node = child as HTMLElement;
        if (typeof node.offsetTop !== 'number') continue;
        if (node.ownerDocument.defaultView?.getComputedStyle(node).position === 'absolute') continue;
        top = Math.min(top, node.offsetTop);
        bottom = Math.max(bottom, node.offsetTop + node.offsetHeight);
      }
      const natural = Number.isFinite(top) && Number.isFinite(bottom) ? bottom - top : 0;
      if (natural <= 0) return;
      const next = Math.max(0.5, Math.min(1, available / natural));
      setScale((current) => (Math.abs(current - next) < 0.005 ? current : next));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(box);
    observer.observe(layer);
    return () => observer.disconnect();
  }, [active, padding]);

  const size = 100 / scale;
  return (
    <div ref={boxRef} className="pointer-events-none absolute inset-0 overflow-hidden" style={{ zIndex: z }}>
      <div
        ref={layerRef}
        className="pointer-events-auto absolute left-1/2 top-1/2"
        style={{
          width: `${size}%`,
          height: `${size}%`,
          transform: `translate(-50%, -50%) scale(${scale})`,
          transformOrigin: 'center center',
        }}
      >
        {children}
      </div>
    </div>
  );
}
