/* Satu loop rAF bersama untuk semua canvas preview (hemat baterai). */
type Cb = (dt: number, t: number) => void;

const subs = new Set<Cb>();
let raf = 0;
let last = 0;
let t = 0;

function loop(ts: number) {
  const dt = Math.min(0.05, (ts - last) / 1000 || 0.016);
  last = ts;
  t += dt;
  subs.forEach((f) => {
    try {
      f(dt, t);
    } catch {
      /* noop */
    }
  });
  raf = subs.size ? requestAnimationFrame(loop) : 0;
}

export function subscribe(cb: Cb) {
  subs.add(cb);
  if (!raf) {
    last = performance.now();
    raf = requestAnimationFrame(loop);
  }
  return () => {
    subs.delete(cb);
    if (!subs.size && raf) {
      cancelAnimationFrame(raf);
      raf = 0;
    }
  };
}
