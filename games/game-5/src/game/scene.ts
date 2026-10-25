import { TAU, clamp, metal, roundRect, withAlpha } from "./core";

type Ctx = CanvasRenderingContext2D;

function ellipse(
  ctx: Ctx,
  x: number,
  y: number,
  rx: number,
  ry: number,
  fill: string | CanvasGradient,
) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, TAU);
  ctx.fill();
}

function screw(ctx: Ctx, x: number, y: number, r: number) {
  ellipse(ctx, x, y + 0.5, r + 0.8, r + 0.8, "#172025");
  ellipse(
    ctx,
    x,
    y,
    r,
    r,
    metal(ctx, y - r, y + r, "#c7cfc9", "#657477", "#263a40"),
  );
  ctx.strokeStyle = "#1b3036";
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(x - r * 0.44, y);
  ctx.lineTo(x + r * 0.44, y);
  ctx.stroke();
}

export class ArenaScene {
  private backdrop: HTMLCanvasElement | null = null;
  private backdropKey = "";
  private wheel: HTMLCanvasElement | null = null;
  private wheelKey = "";

  drawBackground(
    ctx: Ctx,
    w: number,
    h: number,
    cx: number,
    cy: number,
    radius: number,
    accent: string,
    time: number,
  ) {
    const key = `${w}|${h}|${cx}|${cy}|${radius}`;
    if (!this.backdrop || this.backdropKey !== key) {
      this.backdrop = document.createElement("canvas");
      this.backdrop.width = Math.ceil(w);
      this.backdrop.height = Math.ceil(h);
      this.backdropKey = key;
      this.paintBackground(
        this.backdrop.getContext("2d")!,
        w,
        h,
        cx,
        cy,
        radius,
      );
    }
    ctx.drawImage(this.backdrop, 0, 0, w, h);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const breathe = 0.85 + Math.sin(time * 0.5) * 0.15;
    const light = ctx.createRadialGradient(
      w / 2,
      h + 70,
      0,
      w / 2,
      h + 70,
      250,
    );
    light.addColorStop(0, withAlpha(accent, 0.08 * breathe));
    light.addColorStop(1, withAlpha(accent, 0));
    ctx.fillStyle = light;
    ctx.fillRect(0, h - 170, w, 170);
    ctx.restore();
  }

  private paintBackground(
    ctx: Ctx,
    w: number,
    h: number,
    cx: number,
    cy: number,
    r: number,
  ) {
    const background = ctx.createLinearGradient(0, 0, w * 0.25, h);
    background.addColorStop(0, "#111b21");
    background.addColorStop(0.42, "#1b292e");
    background.addColorStop(0.78, "#121d23");
    background.addColorStop(1, "#0b1219");
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, w, h);

    // Architectural light and panel seams give the range depth without a busy backdrop.
    for (const x of [w * 0.17, w * 0.83]) {
      const shade = ctx.createLinearGradient(x - 30, 0, x + 30, 0);
      shade.addColorStop(0, "rgba(2,7,11,0)");
      shade.addColorStop(0.49, "rgba(2,7,11,0.2)");
      shade.addColorStop(0.51, "rgba(152,181,178,0.07)");
      shade.addColorStop(1, "rgba(2,7,11,0)");
      ctx.fillStyle = shade;
      ctx.fillRect(x - 30, 0, 60, h);
    }
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const spot = ctx.createRadialGradient(
      cx - r * 0.28,
      cy - r * 0.42,
      r * 0.2,
      cx,
      cy,
      r * 3.35,
    );
    spot.addColorStop(0, "rgba(169,192,182,0.11)");
    spot.addColorStop(0.55, "rgba(89,124,129,0.05)");
    spot.addColorStop(1, "rgba(70,120,132,0)");
    ctx.fillStyle = spot;
    ctx.fillRect(0, 0, w, h);
    const cone = ctx.createLinearGradient(w * 0.27, 0, cx, cy + r);
    cone.addColorStop(0, "rgba(199,215,189,0.065)");
    cone.addColorStop(1, "rgba(151,188,177,0)");
    ctx.fillStyle = cone;
    ctx.beginPath();
    ctx.moveTo(w * 0.24, 0);
    ctx.lineTo(w * 0.3, 0);
    ctx.lineTo(cx + r * 1.6, cy + r * 1.45);
    ctx.lineTo(cx - r * 2.2, cy + r * 1.45);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // A physical mounting ring sits behind the wooden target.
    ellipse(ctx, cx + 9, cy + 15, r * 1.15, r * 1.15, "rgba(1,5,8,0.22)");
    ellipse(ctx, cx, cy, r * 1.14, r * 1.14, "#17252b");
    ctx.strokeStyle = "rgba(134,164,162,0.19)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 1.14, 0, TAU);
    ctx.stroke();
    ctx.strokeStyle = "#0d1b23";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 1.1, 0, TAU);
    ctx.stroke();
    for (let i = 0; i < 4; i++) {
      const a = (i * TAU) / 4 + Math.PI / 4;
      screw(
        ctx,
        cx + Math.cos(a) * r * 1.115,
        cy + Math.sin(a) * r * 1.115,
        1.6,
      );
    }

    const floor = h - (h < 360 ? 27 : 49);
    const floorShade = ctx.createLinearGradient(0, floor - 24, 0, h);
    floorShade.addColorStop(0, "rgba(8,17,23,0)");
    floorShade.addColorStop(0.45, "#0c171f");
    floorShade.addColorStop(1, "#080f17");
    ctx.fillStyle = floorShade;
    ctx.fillRect(0, floor - 24, w, h - floor + 24);
    ctx.strokeStyle = "rgba(140,167,169,0.09)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, floor);
    ctx.lineTo(w, floor);
    ctx.stroke();
    for (let i = -3; i <= 3; i++) {
      ctx.beginPath();
      ctx.moveTo(w / 2 + i * 100, floor);
      ctx.lineTo(w / 2 + i * 220, h);
      ctx.strokeStyle = "rgba(136,166,175,0.045)";
      ctx.stroke();
    }

    // Static film grain is baked once, never regenerated on animation frames.
    let seed = 9137;
    for (let i = 0; i < (w * h) / 130; i++) {
      seed = (seed * 16807) % 2147483647;
      const x = seed % Math.ceil(w);
      seed = (seed * 16807) % 2147483647;
      const y = seed % Math.ceil(h);
      ctx.fillStyle = i % 2 ? "rgba(222,230,212,0.034)" : "rgba(0,0,0,0.055)";
      ctx.fillRect(x, y, 1, 1);
    }
    const edge = ctx.createRadialGradient(
      w * 0.5,
      h * 0.4,
      Math.min(w, h) * 0.25,
      w * 0.5,
      h * 0.4,
      Math.max(w, h) * 0.7,
    );
    edge.addColorStop(0, "rgba(4,9,13,0)");
    edge.addColorStop(1, "rgba(4,9,13,0.65)");
    ctx.fillStyle = edge;
    ctx.fillRect(0, 0, w, h);
  }

  drawWheelFace(ctx: Ctx, r: number, dpr: number) {
    const quality = Math.min(dpr, 2);
    const key = `${r}|${quality}`;
    const side = r * 2 + 12;
    if (!this.wheel || this.wheelKey !== key) {
      this.wheel = document.createElement("canvas");
      this.wheel.width = Math.ceil(side * quality);
      this.wheel.height = Math.ceil(side * quality);
      const painter = this.wheel.getContext("2d")!;
      painter.scale(quality, quality);
      painter.translate(side / 2, side / 2);
      this.paintWheel(painter, r);
      this.wheelKey = key;
    }
    ctx.drawImage(this.wheel, -side / 2, -side / 2, side, side);
  }

  private paintWheel(ctx: Ctx, r: number) {
    const rim = ctx.createLinearGradient(-r * 0.75, -r, r * 0.7, r);
    rim.addColorStop(0, "#bbc3b8");
    rim.addColorStop(0.15, "#697f82");
    rim.addColorStop(0.45, "#354d57");
    rim.addColorStop(0.72, "#597078");
    rim.addColorStop(1, "#1d3642");
    ellipse(ctx, 0, 0, r, r, rim);
    ctx.strokeStyle = "#101e27";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ellipse(ctx, 0, 0, r * 0.936, r * 0.936, "#3f3024");
    const wood = ctx.createRadialGradient(
      -r * 0.34,
      -r * 0.42,
      1,
      r * 0.1,
      r * 0.12,
      r * 1.35,
    );
    wood.addColorStop(0, "#c39a67");
    wood.addColorStop(0.42, "#ab7d4c");
    wood.addColorStop(0.74, "#936539");
    wood.addColorStop(1, "#634225");
    ellipse(ctx, 0, 0, r * 0.923, r * 0.923, wood);

    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.92, 0, TAU);
    ctx.clip();
    for (let ring = 1; ring <= 26; ring++) {
      const base = r * (0.04 + ring * 0.035);
      ctx.beginPath();
      for (let i = 0; i <= 90; i++) {
        const a = (i / 90) * TAU;
        const irregular =
          Math.sin(a * 3 + ring * 0.14) * r * 0.018 +
          Math.sin(a * 7 + ring * 0.4) * r * 0.004;
        const x = -r * 0.08 + Math.cos(a) * (base + irregular);
        const y = r * 0.035 + Math.sin(a) * (base * 0.94 + irregular);
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.closePath();
      ctx.lineWidth = ring % 4 === 0 ? 1.1 : 0.55;
      ctx.strokeStyle =
        ring % 3 === 0 ? "rgba(236,196,132,0.23)" : "rgba(69,41,21,0.17)";
      ctx.stroke();
    }
    for (let i = 0; i < 38; i++) {
      const a = i * 2.399963;
      const rr = r * (0.24 + (i % 9) * 0.077);
      const x = Math.cos(a) * rr;
      const y = Math.sin(a) * rr;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(
        x + r * 0.05,
        y - r * 0.025,
        x + r * 0.12,
        y + r * 0.008,
      );
      ctx.lineWidth = 0.6;
      ctx.strokeStyle = "rgba(75,46,27,0.16)";
      ctx.stroke();
    }
    ctx.strokeStyle = "rgba(117,44,32,0.46)";
    ctx.lineWidth = r * 0.042;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.62, 0, TAU);
    ctx.stroke();
    ctx.strokeStyle = "rgba(225,202,153,0.33)";
    ctx.lineWidth = r * 0.018;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.8, 0, TAU);
    ctx.stroke();
    ctx.restore();
    ctx.strokeStyle = "rgba(224,233,214,0.42)";
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.983, 0, TAU);
    ctx.stroke();
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * TAU;
      screw(
        ctx,
        Math.cos(a) * r * 0.962,
        Math.sin(a) * r * 0.962,
        clamp(r * 0.019, 1.1, 2.9),
      );
    }
    const hub = ctx.createLinearGradient(0, -r * 0.18, 0, r * 0.18);
    hub.addColorStop(0, "#9caeaa");
    hub.addColorStop(0.3, "#607c80");
    hub.addColorStop(0.65, "#354e59");
    hub.addColorStop(1, "#213b47");
    ellipse(ctx, 0, 0, r * 0.18, r * 0.18, "#192e38");
    ellipse(ctx, -0.5, -0.5, r * 0.164, r * 0.164, hub);
    ellipse(ctx, 0, 0, r * 0.07, r * 0.07, "#304f5c");
    ellipse(ctx, -0.4, -0.7, r * 0.043, r * 0.043, "#9eb0a7");
    for (let i = 0; i < 6; i++) {
      const a = (i * TAU) / 6;
      screw(
        ctx,
        Math.cos(a) * r * 0.119,
        Math.sin(a) * r * 0.119,
        clamp(r * 0.012, 0.8, 1.7),
      );
    }
  }

  drawStand(ctx: Ctx, x: number, y: number, accent: string, fire: number) {
    ctx.save();
    const g = ctx.createRadialGradient(x, y + 35, 3, x, y + 35, 110);
    g.addColorStop(0, withAlpha(accent, 0.06 + fire * 0.09));
    g.addColorStop(1, withAlpha(accent, 0));
    ellipse(ctx, x, y + 35, 110, 26, g);
    roundRect(ctx, x - 56, y + 35, 112, 9, 4);
    ctx.fillStyle = metal(ctx, y + 35, y + 44, "#4a626b", "#263c47", "#122630");
    ctx.fill();
    roundRect(ctx, x - 44, y + 33, 88, 3, 1.5);
    ctx.fillStyle = "#587077";
    ctx.fill();
    ctx.fillStyle = withAlpha(accent, 0.6);
    roundRect(ctx, x - 11, y + 37, 22, 1.4, 0.7);
    ctx.fill();
    ctx.restore();
  }
}
