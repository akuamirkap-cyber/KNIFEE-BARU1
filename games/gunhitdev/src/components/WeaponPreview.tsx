import { useEffect, useRef } from "react";
import { subscribe } from "../game/ticker";
import { boltPath, rgba, sparkle, strokeBolt, TAU, type Emit, type ParticleInit, type Weapon } from "../game/weapons";
import { createCrispBolt, renderCrispBolt } from "../game/lightning";

interface PP {
  kind: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  color: string;
  rot: number;
  vr: number;
  grav: number;
  drag: number;
  glow: number;
  tx: number;
  ty: number;
  grow: number;
  thick: number;
}

interface Bullet {
  y: number;
  vy: number;
  phase: "up" | "back";
  p: number;
  born: number;
}

interface Props {
  weapon: Weapon;
  demo?: boolean;
  maxScale?: number;
  className?: string;
  glowPad?: number;
}

export default function WeaponPreview({ weapon, demo = true, maxScale = 0.62, className }: Props) {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;

    let W = 100;
    let H = 100;
    let dpr = Math.min(2, window.devicePixelRatio || 1);
    const parts: PP[] = [];
    const bullets: Bullet[] = [];
    const marks: { x: number; y: number; t: number }[] = [];
    const st = { t: 0, next: 0.7 };

    const fit = () => {
      const host = cv.parentElement;
      W = Math.max(60, host ? host.clientWidth : 200);
      H = Math.max(60, host ? host.clientHeight : 200);
      dpr = Math.min(2, window.devicePixelRatio || 1);
      cv.width = Math.floor(W * dpr);
      cv.height = Math.floor(H * dpr);
      cv.style.width = W + "px";
      cv.style.height = H + "px";
    };
    fit();
    const ro = new ResizeObserver(fit);
    if (cv.parentElement) ro.observe(cv.parentElement);

    const emit: Emit = (p: ParticleInit) => {
      if (parts.length > 260) parts.splice(0, 30);
      const life = p.life ?? 0.5;
      parts.push({
        kind: p.kind ?? "spark",
        x: p.x,
        y: p.y,
        vx: p.vx ?? 0,
        vy: p.vy ?? 0,
        life,
        max: life,
        size: p.size ?? 2,
        color: p.color ?? "#fff",
        rot: p.rot ?? 0,
        vr: p.vr ?? 0,
        grav: p.grav ?? 0,
        drag: p.drag ?? 0,
        glow: p.glow ?? 0,
        tx: p.tx ?? 0,
        ty: p.ty ?? 0,
        grow: p.grow ?? 0,
        thick: p.thick ?? 2,
      });
    };

    const unsub = subscribe((dt) => {
      st.t += dt;
      const baseX = W / 2;
      const baseY = H * 0.9;
      const gs = Math.max(0.16, Math.min(maxScale, (H * 0.74) / weapon.muzzle, (W * 0.62) / 90));
      const muzzleY = baseY - weapon.muzzle * gs;
      const hitY = H * 0.2;

      if (demo) {
        st.next -= dt;
        if (st.next <= 0 && bullets.length === 0) {
          st.next = 1.5 + Math.random() * 1.1;
          bullets.push({ y: muzzleY, vy: -H * 1.5 * (weapon.speedMul ?? 1), phase: "up", p: 0, born: st.t });
          weapon.onFire(emit, baseX, muzzleY, gs);
        }
      }

      // peluru
      for (let i = bullets.length - 1; i >= 0; i--) {
        const b = bullets[i];
        if (b.phase === "up") {
          b.y += b.vy * dt;
          if (b.y <= hitY) {
            b.y = hitY;
            weapon.onImpact(emit, baseX, hitY, gs * 0.8, {
              nx: 0,
              ny: 1,
              power: 0.85,
              last: false,
              mx: baseX,
              my: muzzleY,
            });
            marks.push({ x: baseX, y: hitY, t: 0 });
            if (weapon.id === "yoyo") {
              b.phase = "back";
              b.p = 0;
            } else bullets.splice(i, 1);
          }
        } else {
          b.p = Math.min(1, b.p + dt / 0.42);
          b.y = hitY + (muzzleY - hitY) * (1 - Math.pow(1 - b.p, 3));
          if (b.p >= 1) bullets.splice(i, 1);
        }
      }

      for (let i = marks.length - 1; i >= 0; i--) {
        marks[i].t += dt;
        if (marks[i].t > 1.1) marks.splice(i, 1);
      }

      // partikel
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        p.life -= dt;
        if (p.life <= 0) {
          parts.splice(i, 1);
          continue;
        }
        if (p.kind === "suck") {
          const dx = p.tx - p.x;
          const dy = p.ty - p.y;
          const d = Math.hypot(dx, dy) || 1;
          p.vx += (dx / d) * 900 * dt;
          p.vy += (dy / d) * 900 * dt;
          p.vx *= 0.93;
          p.vy *= 0.93;
        } else if (p.kind === "ring") {
          p.size += p.grow * dt;
        } else if (
          p.kind !== "star" &&
          p.kind !== "flash" &&
          p.kind !== "hole" &&
          p.kind !== "crystal" &&
          p.kind !== "arc"
        ) {
          p.vy += p.grav * dt;
          if (p.drag) {
            const k = Math.exp(-p.drag * dt);
            p.vx *= k;
            p.vy *= k;
          }
          p.x += p.vx * dt;
          p.y += p.vy * dt;
        }
        p.rot += p.vr * dt;
      }

      if (demo && Math.random() < dt * 5) weapon.ambient(emit, baseX, baseY, gs, st.t, dt);

      /* ---------- gambar ---------- */
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);

      // sorot latar
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      const g = ctx.createRadialGradient(baseX, baseY - H * 0.34, 2, baseX, baseY - H * 0.34, H * 0.62);
      g.addColorStop(0, rgba(weapon.hue, 0.16));
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();

      // garis bidik
      if (demo) {
        ctx.save();
        ctx.strokeStyle = rgba(weapon.hue, 0.14);
        ctx.setLineDash([3, 8]);
        ctx.lineDashOffset = -st.t * 30;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(baseX, muzzleY);
        ctx.lineTo(baseX, hitY + 8);
        ctx.stroke();
        ctx.restore();
      }

      drawParts(ctx, parts, false, st.t);

      // bekas tumbukan
      for (const m of marks) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, 1 - m.t / 1.1);
        ctx.translate(m.x, m.y);
        ctx.scale(gs * 1.2, gs * 1.2);
        weapon.drawMini(ctx, { t: st.t });
        ctx.restore();
      }

      for (const b of bullets) {
        ctx.save();
        ctx.translate(baseX, b.y);
        ctx.scale(gs * 1.25, gs * 1.25);
        weapon.drawBullet(ctx, { t: st.t, rot: b.phase === "back" ? st.t * 30 : (st.t - b.born) * 5, speed: b.vy });
        ctx.restore();
      }

      ctx.save();
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.beginPath();
      ctx.ellipse(baseX, baseY + 4, 30 * gs + 8, 6 * gs + 2, 0, 0, TAU);
      ctx.fill();
      ctx.translate(baseX, baseY);
      ctx.scale(gs, gs);
      weapon.drawGun(ctx, { t: st.t, recoil: 0, flash: 0, s: gs });
      ctx.restore();

      drawParts(ctx, parts, true, st.t);
    });

    return () => {
      unsub();
      ro.disconnect();
    };
  }, [weapon, demo, maxScale]);

  return <canvas ref={ref} className={className} />;
}

function drawParts(ctx: CanvasRenderingContext2D, parts: PP[], top: boolean, tNow = 0) {
  ctx.save();
  for (const p of parts) {
    const k = Math.max(0, p.life / p.max);
    const isTop = ["ring", "flash", "star", "hole", "crystal", "arc"].includes(p.kind);
    if (isTop !== top) continue;
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
    switch (p.kind) {
      case "spark":
      case "streak":
      case "suck": {
        ctx.globalCompositeOperation = "lighter";
        ctx.strokeStyle = rgba(p.color, Math.min(1, k * 1.3));
        ctx.lineWidth = p.size * (0.4 + k * 0.6);
        ctx.lineCap = "round";
        if (p.glow) {
          ctx.shadowColor = p.color;
          ctx.shadowBlur = p.glow;
        }
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - p.vx * 0.02, p.y - p.vy * 0.02);
        ctx.stroke();
        ctx.shadowBlur = 0;
        break;
      }
      case "mote": {
        ctx.globalCompositeOperation = "lighter";
        ctx.fillStyle = rgba(p.color, Math.sin(k * Math.PI) * 0.8);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, TAU);
        ctx.fill();
        break;
      }
      case "confetti": {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = rgba(p.color, Math.min(1, k * 1.4));
        ctx.fillRect(-p.size / 2, -p.size * 0.3, p.size, p.size * 0.6);
        ctx.restore();
        break;
      }
      case "shard": {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.globalCompositeOperation = "lighter";
        ctx.fillStyle = rgba(p.color, Math.min(1, k * 1.2));
        ctx.beginPath();
        ctx.moveTo(0, -p.size);
        ctx.lineTo(p.size * 0.6, p.size * 0.5);
        ctx.lineTo(-p.size * 0.6, p.size * 0.5);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
        break;
      }
      case "smoke": {
        ctx.fillStyle = rgba(p.color, k * 0.14);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, TAU);
        ctx.fill();
        break;
      }
      case "ring": {
        ctx.globalCompositeOperation = "lighter";
        ctx.strokeStyle = rgba(p.color, k * 0.8);
        ctx.lineWidth = Math.max(0.4, p.thick * k);
        if (p.glow) {
          ctx.shadowColor = p.color;
          ctx.shadowBlur = p.glow * k;
        }
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(0.5, p.size), 0, TAU);
        ctx.stroke();
        ctx.shadowBlur = 0;
        break;
      }
      case "flash": {
        ctx.globalCompositeOperation = "lighter";
        ctx.fillStyle = rgba(p.color, k * 0.6);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (1.2 - k * 0.4), 0, TAU);
        ctx.fill();
        break;
      }
      case "star": {
        const a = Math.sin(k * Math.PI);
        sparkle(ctx, p.x, p.y, p.size * (0.4 + a * 0.8), a, p.color);
        break;
      }
      case "arc": {
        const alen = Math.hypot(p.vx, p.vy);
        if (alen > 35) {
          const bolt = createCrispBolt(p.x, p.y, p.x + p.vx, p.y + p.vy, {
            sway: 8,
            steps: 5,
            branchChance: 0.25,
          });
          renderCrispBolt(ctx, bolt, p.color, 8);
        } else {
          boltPath(
            ctx,
            p.x,
            p.y,
            p.x + p.vx,
            p.y + p.vy,
            Math.min(20, Math.max(p.size * 1.5, alen * 0.04)),
            Math.floor(tNow * 30) + p.rot * 7,
            Math.round(Math.min(14, Math.max(4, alen / 24)))
          );
          strokeBolt(ctx, p.color, p.size * 0.85, Math.min(1, k * 1.25), 8);
        }
        break;
      }
      case "hole": {
        ctx.globalCompositeOperation = "lighter";
        ctx.fillStyle = rgba(p.color, k * 0.45);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 1.8, 0, TAU);
        ctx.fill();
        ctx.globalCompositeOperation = "source-over";
        ctx.fillStyle = "#000";
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 0.8, 0, TAU);
        ctx.fill();
        break;
      }
      case "crystal": {
        const prog = 1 - k;
        const h = p.grow * Math.min(1, prog / 0.6);
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.globalCompositeOperation = "lighter";
        ctx.fillStyle = rgba(p.color, 0.75 * (prog > 0.66 ? 1 - (prog - 0.66) / 0.34 : 1));
        ctx.beginPath();
        ctx.moveTo(0, -h);
        ctx.lineTo(p.size * 0.6, -h * 0.35);
        ctx.lineTo(-p.size * 0.6, -h * 0.35);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
        break;
      }
      default:
        break;
    }
  }
  ctx.restore();
}
