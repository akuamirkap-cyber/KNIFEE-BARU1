import { P, TAU, audio, emissionCount, lerp, rnd, withAlpha } from "./core";
import { FIRE_SPECS, isSignature, smooth } from "./fireMotion";
import type { Beam, Bullet, GameAPI, Weapon } from "./types";

type Ctx = CanvasRenderingContext2D;
type PulseKind = "caster" | "repulsor" | "shoulder";

function glow(
  ctx: Ctx,
  x: number,
  y: number,
  radius: number,
  color: string,
  alpha = 0.8,
) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, Math.max(1, radius));
  g.addColorStop(0, withAlpha("#f5ffff", alpha));
  g.addColorStop(0.2, withAlpha(color, alpha * 0.9));
  g.addColorStop(0.55, withAlpha(color, alpha * 0.28));
  g.addColorStop(1, withAlpha(color, 0));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, Math.max(1, radius), 0, TAU);
  ctx.fill();
}

function trail(ctx: Ctx, b: Bullet, color: string, width: number) {
  ctx.lineCap = "round";
  for (let i = 1; i < b.trail.length; i++) {
    const from = b.trail[i - 1],
      to = b.trail[i];
    const k = i / (b.trail.length - 1);
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.strokeStyle = withAlpha(color, k * 0.17);
    ctx.lineWidth = Math.max(0.4, k * width * 2.4);
    ctx.stroke();
    ctx.strokeStyle = withAlpha("#c9efff", k * 0.45);
    ctx.lineWidth = Math.max(0.3, k * width * 0.42);
    ctx.stroke();
  }
}

export function discharge(
  api: GameAPI,
  x: number,
  y: number,
  angle: number,
  color: string,
  strength: number,
) {
  api.particles.push(
    P({
      type: "flash",
      x,
      y,
      size: strength,
      color,
      color2: "#367ce2",
      life: 0.1,
    }),
  );
  for (let i = 0; i < 2; i++) {
    api.particles.push(
      P({
        type: "shock",
        x: x + Math.cos(angle) * i * 9,
        y: y + Math.sin(angle) * i * 9,
        rot: angle + Math.PI / 2,
        size: strength * (0.6 + i * 0.3),
        size2: 3,
        color,
        width: 2.5 - i * 0.6,
        life: 0.17 + i * 0.07,
      }),
    );
  }
  for (let i = 0; i < 13; i++) {
    const a = angle + rnd(-0.36, 0.36),
      speed = rnd(180, 640);
    api.particles.push(
      P({
        type: "spark",
        x,
        y,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed,
        color: i % 3 ? color : "#eeffff",
        life: rnd(0.09, 0.24),
        drag: 0.93,
        width: 1.5,
      }),
    );
  }
}

function syncOrigin(api: GameAPI, weapon: Weapon, b: Bullet) {
  const muzzle = api.muzzleFor(weapon.id);
  if (!muzzle) return;
  b.x = muzzle.x;
  b.y = muzzle.y;
  b.data.launchAngle = muzzle.angle;
}

export function firePulse(
  weapon: Weapon,
  api: GameAPI,
  x: number,
  y: number,
  angle: number,
  kind: PulseKind,
) {
  const release = isSignature(weapon.id) ? FIRE_SPECS[weapon.id].release : 0;
  const color =
    kind === "repulsor"
      ? "#b6edff"
      : kind === "shoulder"
        ? "#8bd9ff"
        : "#80aaff";
  audio.play(
    kind === "shoulder"
      ? "predator-charge"
      : kind === "repulsor"
        ? "repulsor-charge"
        : "caster-charge",
  );
  const b: Bullet = {
    x,
    y,
    vx: 0,
    vy: 0,
    angle,
    spin: 0,
    age: 0,
    life: 3.4,
    kind:
      kind === "shoulder"
        ? "predatorPlasma"
        : kind === "repulsor"
          ? "repulsor"
          : "plasmaBall",
    size: kind === "repulsor" ? 15 : 13,
    dead: false,
    weapon,
    trail: [],
    trailMax: kind === "shoulder" ? 20 : 15,
    data: { launched: 0, launchAngle: angle, release, ventClock: 0 },
    update(bullet, dt, g) {
      if (!bullet.data.launched) {
        syncOrigin(g, weapon, bullet);
        bullet.trail.length = 0;
        if (bullet.age < release) return;
        bullet.data.launched = 1;
        bullet.data.launchedAt = bullet.age;
        const a = bullet.data.launchAngle;
        const speed =
          kind === "repulsor" ? 1660 : kind === "shoulder" ? 1370 : 1150;
        bullet.vx = Math.cos(a) * speed;
        bullet.vy = Math.sin(a) * speed;
        audio.play(
          kind === "shoulder"
            ? "predator-shot"
            : kind === "repulsor"
              ? "repulsor"
              : "caster-shot",
        );
        discharge(
          g,
          bullet.x,
          bullet.y,
          a,
          color,
          kind === "shoulder" ? 64 : 51,
        );
        g.shake(kind === "shoulder" ? 16 : 11);
        g.flash(color, 0.17);
      }
      const flight = bullet.age - bullet.data.launchedAt;
      if (kind === "caster") {
        const speed = lerp(1150, 1450, 1 - Math.exp(-flight * 8));
        bullet.vx = Math.cos(bullet.data.launchAngle) * speed;
        bullet.vy = Math.sin(bullet.data.launchAngle) * speed;
      }
      for (let i = 0, n = emissionCount(dt, 42); i < n; i++) {
        g.particles.push(
          P({
            type: "glow",
            x: bullet.x - Math.cos(bullet.angle) * 8,
            y: bullet.y - Math.sin(bullet.angle) * 8,
            size: kind === "repulsor" ? 19 : 16,
            size2: 2,
            color,
            color2: "#15488c",
            life: 0.18,
          }),
        );
      }
      if (kind === "repulsor") {
        for (let i = 0, n = emissionCount(dt, 22); i < n; i++) {
          g.particles.push(
            P({
              type: "shock",
              x: bullet.x,
              y: bullet.y,
              rot: bullet.angle + Math.PI / 2,
              size: 28,
              size2: 8,
              color: "#b9eaff",
              width: 1.5,
              life: 0.17,
            }),
          );
        }
      }
    },
    draw(ctx, bullet, time) {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      if (!bullet.data.launched) {
        const k = smooth(0, release, bullet.age);
        const r = 5 + k * (kind === "shoulder" ? 21 : 16);
        glow(ctx, bullet.x, bullet.y, r * 1.45, color, 0.45 + k * 0.4);
        for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          ctx.ellipse(
            bullet.x,
            bullet.y,
            r + (1 - k) * 18,
            r * 0.6 + (1 - k) * 14,
            time * 7 + (i * TAU) / 3,
            -0.52,
            0.52,
          );
          ctx.strokeStyle = withAlpha(color, 0.35 + k * 0.4);
          ctx.lineWidth = 1.25;
          ctx.stroke();
        }
        ctx.restore();
        return;
      }
      trail(ctx, bullet, color, kind === "repulsor" ? 9 : 8);
      ctx.translate(bullet.x, bullet.y);
      ctx.rotate(Math.atan2(bullet.vy, bullet.vx));
      const phase = time * 20;
      glow(ctx, 0, 0, kind === "repulsor" ? 32 : 34, color, 0.86);
      ctx.fillStyle = "#edfdff";
      ctx.beginPath();
      ctx.ellipse(
        3,
        0,
        kind === "repulsor" ? 13 : 19,
        kind === "repulsor" ? 15 : 8.5,
        0,
        0,
        TAU,
      );
      ctx.fill();
      if (kind === "repulsor") {
        for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          ctx.ellipse(-11 - i * 10, 0, 4 + i, 17 + i * 3, 0, 0, TAU);
          ctx.strokeStyle = withAlpha(
            i ? "#73c8fb" : "#f6ffff",
            0.55 - i * 0.12,
          );
          ctx.lineWidth = i ? 1.3 : 2.1;
          ctx.stroke();
        }
      } else {
        const strands = kind === "shoulder" ? 3 : 2;
        for (let i = 0; i < strands; i++) {
          ctx.beginPath();
          for (let j = 0; j <= 22; j++) {
            const k = j / 22;
            const x = lerp(-54, 9, k);
            const y =
              Math.sin(k * 8 + phase + (i * TAU) / strands) * (5 + k * 8);
            j ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
          }
          ctx.strokeStyle = i
            ? kind === "caster"
              ? "#c9b4ff"
              : "#7ab9ff"
            : "#d5f6ff";
          ctx.lineWidth = i ? 1.2 : 1.8;
          ctx.stroke();
        }
        ctx.beginPath();
        ctx.ellipse(-14, 0, 5, 17, 0, -1.8, 1.8);
        ctx.strokeStyle = withAlpha(color, 0.8);
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      ctx.restore();
    },
  };
  api.bullets.push(b);
}

export function fireStream(
  weapon: Weapon,
  api: GameAPI,
  x: number,
  y: number,
  angle: number,
  kind: "proton" | "martian",
) {
  const spec = FIRE_SPECS[kind === "proton" ? "protonPack" : "tripod"];
  audio.play(kind === "proton" ? "proton-start" : "martian-charge");
  const hit = api.hitscan(x, y, angle);
  const beam: Beam = {
    weapon,
    x,
    y,
    angle,
    age: 0,
    duration: spec.duration,
    windup: spec.release,
    pendingHit: true,
    followMuzzle: true,
    len: hit.dist,
    hitX: hit.x,
    hitY: hit.y,
    hit: hit.hit,
    tick(bm, dt, g) {
      const t = bm.age - spec.release;
      if (t < 0) return;
      if (!bm.started) {
        bm.started = true;
        audio.play(kind === "proton" ? "proton" : "martian");
        discharge(
          g,
          bm.x,
          bm.y,
          bm.angle,
          weapon.accent,
          kind === "proton" ? 43 : 60,
        );
        g.shake(kind === "proton" ? 7 : 18);
      }
      const k = 1 - smooth(spec.duration - 0.16, spec.duration, bm.age);
      for (
        let i = 0, n = emissionCount(dt, kind === "proton" ? 60 * k : 26 * k);
        i < n;
        i++
      ) {
        const distance = rnd(0, bm.len);
        const a = bm.angle + rnd(-0.6, 0.6);
        const speed = rnd(40, 180);
        g.particles.push(
          P({
            type: "spark",
            x: bm.x + Math.cos(bm.angle) * distance + rnd(-5, 5),
            y: bm.y + Math.sin(bm.angle) * distance + rnd(-5, 5),
            vx: Math.cos(a) * speed,
            vy: Math.sin(a) * speed - 30,
            color:
              kind === "proton" ? (i % 2 ? "#ffbd63" : "#a9d4ff") : "#edf5c8",
            life: rnd(0.1, 0.26),
            width: 1.2,
            drag: 0.94,
          }),
        );
      }
      if (bm.hit)
        for (let i = 0, n = emissionCount(dt, 32 * k); i < n; i++) {
          const a = bm.angle + Math.PI + rnd(-1.3, 1.3),
            speed = rnd(70, 300);
          g.particles.push(
            P({
              type: "ember",
              x: bm.hitX,
              y: bm.hitY,
              vx: Math.cos(a) * speed,
              vy: Math.sin(a) * speed,
              size: 1.5,
              color: kind === "proton" ? "#ffd78c" : "#e3f0ad",
              color2: kind === "proton" ? "#db583c" : "#9dba5c",
              life: rnd(0.2, 0.5),
              drag: 0.94,
            }),
          );
        }
    },
    draw(ctx, bm, time) {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      if (bm.age < spec.release) {
        glow(
          ctx,
          bm.x,
          bm.y,
          8 + smooth(0, spec.release, bm.age) * 23,
          weapon.accent,
          0.75,
        );
        ctx.restore();
        return;
      }
      const k =
        smooth(spec.release, spec.release + 0.035, bm.age) *
        (1 - smooth(spec.duration - 0.18, spec.duration, bm.age));
      const ex = bm.hit ? bm.hitX : bm.x + Math.cos(bm.angle) * bm.len;
      const ey = bm.hit ? bm.hitY : bm.y + Math.sin(bm.angle) * bm.len;
      const length = Math.hypot(ex - bm.x, ey - bm.y);
      const a = Math.atan2(ey - bm.y, ex - bm.x);
      ctx.translate(bm.x, bm.y);
      ctx.rotate(a);
      ctx.lineCap = "round";
      if (kind === "proton") {
        const wave = (
          width: number,
          color: string,
          opacity: number,
          amplitude: number,
          phase: number,
        ) => {
          ctx.beginPath();
          for (let j = 0; j <= 58; j++) {
            const t = j / 58;
            const y =
              Math.sin(t * 23 - time * 29 + phase) *
              Math.sin(t * Math.PI) *
              amplitude *
              k;
            j ? ctx.lineTo(t * length, y) : ctx.moveTo(0, 0);
          }
          ctx.lineWidth = width * k;
          ctx.strokeStyle = withAlpha(color, opacity * k);
          ctx.stroke();
        };
        wave(19, "#f09b43", 0.14, 15, 0);
        wave(7.6, "#ffba5b", 0.72, 15, 0);
        wave(2.6, "#fffae1", 0.95, 15, 0);
        wave(2, "#b9d9ff", 0.66, 12, 2.8);
        wave(1.6, "#fa746b", 0.7, 20, 1.9);
      } else {
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(length, 0);
        for (const [width, color, opacity] of [
          [34, "#afce78", 0.17],
          [17, "#d9edac", 0.55],
          [7.5, "#f5fbdc", 0.9],
          [2.4, "#ffffff", 0.98],
        ] as [number, string, number][]) {
          ctx.lineWidth = width * k;
          ctx.strokeStyle = withAlpha(color, opacity * k);
          ctx.stroke();
        }
        for (let i = 0; i < 4; i++) {
          const t = ((bm.age - spec.release) * 2.2 + i / 4) % 1;
          ctx.beginPath();
          ctx.ellipse(t * length, 0, 3.5, (12 + t * 10) * k, 0, 0, TAU);
          ctx.strokeStyle = withAlpha("#f0f8c4", k * (1 - t) * 0.5);
          ctx.lineWidth = 1.2;
          ctx.stroke();
        }
      }
      glow(ctx, 0, 0, 32, weapon.accent, k * 0.8);
      if (bm.hit)
        glow(
          ctx,
          length,
          0,
          kind === "proton" ? 29 : 36,
          kind === "proton" ? "#ffdc91" : "#eaf7be",
          k * 0.75,
        );
      ctx.restore();
    },
  };
  api.beams.push(beam);
}

export function signatureImpact(
  weapon: Weapon,
  api: GameAPI,
  x: number,
  y: number,
  angle: number,
) {
  const id = weapon.id;
  const disc = id === "identityDisc";
  const proton = id === "protonPack";
  const martian = id === "tripod";
  const shoulder = id === "predatorShoulder";
  const color = disc
    ? "#7be7f1"
    : proton
      ? "#ffc177"
      : martian
        ? "#e2f3b3"
        : shoulder
          ? "#a2deff"
          : weapon.accent;
  const force = isSignature(id) ? FIRE_SPECS[id].force : 40;
  api.pushTarget(x, y, force);
  api.shake(disc ? 4 : proton ? 9 : shoulder ? 21 : martian ? 20 : 16);
  api.flash(color, disc ? 0.07 : 0.2);
  api.hitstop(
    disc ? 0.018 : proton ? 0.026 : shoulder || martian ? 0.06 : 0.045,
  );
  audio.play(
    disc
      ? "disc-bounce"
      : proton
        ? "proton-hit"
        : martian
          ? "martian-hit"
          : shoulder
            ? "predator-impact"
            : id === "repulsor"
              ? "repulsor-hit"
              : "caster-hit",
  );
  api.particles.push(
    P({
      type: "flash",
      x,
      y,
      size: disc ? 43 : shoulder ? 88 : 71,
      color,
      color2: proton ? "#d84c37" : martian ? "#8caa57" : "#306bbf",
      life: disc ? 0.085 : 0.13,
    }),
  );
  for (let i = 0; i < (disc ? 1 : 2); i++)
    api.particles.push(
      P({
        type: "shock",
        x,
        y,
        rot: angle + Math.PI / 2 + (i ? 0.22 : 0),
        size: (disc ? 45 : 68) + i * 34,
        size2: 4,
        color,
        width: 2.4 - i * 0.6,
        life: 0.23 + i * 0.13,
      }),
    );
  const sparks = disc ? 22 : proton ? 28 : shoulder ? 44 : 36;
  for (let i = 0; i < sparks; i++) {
    const a = angle + Math.PI + rnd(-1.4, 1.4),
      speed = rnd(100, disc ? 460 : 760);
    api.particles.push(
      P({
        type: "spark",
        x,
        y,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed,
        color: i % 3 ? color : "#f3ffff",
        width: i % 4 ? 1.35 : 2.1,
        life: rnd(0.12, 0.4),
        grav: 200,
        drag: 0.94,
      }),
    );
  }
  for (let i = 0; i < (disc ? 6 : shoulder ? 16 : 11); i++) {
    const a = angle + Math.PI + rnd(-1, 1),
      speed = rnd(80, shoulder ? 340 : 230);
    api.particles.push(
      P({
        type: "shard",
        x,
        y,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed - 35,
        size: rnd(1.8, 4.5),
        color: i % 2 ? "#8c613b" : "#bc925a",
        color2: "#e9bf87",
        rot: rnd(TAU),
        spin: rnd(-14, 14),
        grav: 720,
        drag: 0.98,
        life: rnd(0.45, 0.85),
      }),
    );
  }
  if (!disc)
    for (let i = 0; i < 4; i++)
      api.particles.push(
        P({
          type: "smoke",
          x: x + rnd(-6, 6),
          y: y + rnd(-6, 6),
          vx: rnd(-40, 40),
          vy: rnd(-100, -25),
          size: rnd(22, 37),
          size2: 6,
          color: proton || martian ? "#80735b" : "#5f778b",
          life: rnd(0.45, 0.8),
          drag: 0.96,
        }),
      );
}

export function catchDisc(api: GameAPI, x: number, y: number) {
  audio.play("disc-catch");
  api.particles.push(
    P({
      type: "flash",
      x,
      y,
      size: 28,
      color: "#b1faff",
      color2: "#17a3b5",
      life: 0.075,
    }),
  );
  api.particles.push(
    P({
      type: "ring",
      x,
      y,
      size: 34,
      size2: 4,
      color: "#6ce4ef",
      width: 1.6,
      life: 0.22,
    }),
  );
  for (let i = 0; i < 7; i++) {
    const a = (i * TAU) / 7,
      speed = rnd(45, 120);
    api.particles.push(
      P({
        type: "spark",
        x,
        y,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed,
        color: "#c2faff",
        life: rnd(0.1, 0.2),
        width: 1.3,
      }),
    );
  }
}
