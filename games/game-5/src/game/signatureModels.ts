import { TAU, clamp, metal, roundRect, withAlpha } from "./core";
import type { WeaponDrawState } from "./types";
import { fireMotion, firingMuzzleOffset } from "./fireMotion";

type Ctx = CanvasRenderingContext2D;
type Point = [number, number];

function box(
  ctx: Ctx,
  x: number,
  y: number,
  w: number,
  h: number,
  fill: string | CanvasGradient,
  r = 2,
) {
  roundRect(ctx, x, y, w, h, r);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = "#080b10";
  ctx.lineWidth = 1.3;
  ctx.stroke();
}

function path(
  ctx: Ctx,
  points: Point[],
  fill: string | CanvasGradient,
  edge = "#090d12",
  width = 1.4,
) {
  ctx.beginPath();
  points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = edge;
  ctx.lineWidth = width;
  ctx.lineJoin = "round";
  ctx.stroke();
}

function stroke(ctx: Ctx, points: Point[], color: string, width = 1) {
  ctx.beginPath();
  points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.stroke();
}

function circle(
  ctx: Ctx,
  x: number,
  y: number,
  r: number,
  fill: string | CanvasGradient,
) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fillStyle = fill;
  ctx.fill();
}

function glow(
  ctx: Ctx,
  x: number,
  y: number,
  r: number,
  color: string,
  power = 0.5,
) {
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, withAlpha(color, power));
  g.addColorStop(0.35, withAlpha(color, power * 0.45));
  g.addColorStop(1, withAlpha(color, 0));
  circle(ctx, x, y, r, g);
  ctx.restore();
}

function screw(ctx: Ctx, x: number, y: number, r = 1.6) {
  circle(ctx, x, y, r + 0.5, "#11161d");
  circle(
    ctx,
    x,
    y,
    r,
    metal(ctx, y - r, y + r, "#c6cbd0", "#646d75", "#232a32"),
  );
  stroke(
    ctx,
    [
      [x - r * 0.5, y],
      [x + r * 0.5, y],
    ],
    "#20272e",
    0.7,
  );
}

function joint(ctx: Ctx, x: number, y: number, r: number, brass = false) {
  circle(ctx, x, y, r + 1, "#0a0e14");
  circle(
    ctx,
    x,
    y,
    r,
    metal(
      ctx,
      y - r,
      y + r,
      brass ? "#c8aa71" : "#c6cfd5",
      "#606971",
      "#1b232c",
    ),
  );
  circle(ctx, x, y, r * 0.62, "#25303a");
  screw(ctx, x, y, r * 0.25);
}

function cable(ctx: Ctx, points: Point[], color: string, w: number) {
  stroke(ctx, points, "#080d12", w + 3);
  stroke(ctx, points, color, w);
  stroke(
    ctx,
    points.map(([x, y]) => [x, y - 1] as Point),
    "rgba(210,220,231,0.24)",
    1,
  );
}

function lens(
  ctx: Ctx,
  x: number,
  y: number,
  r: number,
  color: string,
  energy: number,
) {
  circle(
    ctx,
    x,
    y,
    r + 4,
    metal(ctx, y - r - 4, y + r + 4, "#d0d9dc", "#67717a", "#17212b"),
  );
  circle(ctx, x, y, r + 1, "#090f18");
  const g = ctx.createRadialGradient(x - r * 0.23, y - r * 0.23, 0.5, x, y, r);
  g.addColorStop(0, "#f4ffff");
  g.addColorStop(0.23, "#d2f5ff");
  g.addColorStop(0.62, color);
  g.addColorStop(1, "#103542");
  circle(ctx, x, y, r, g);
  glow(ctx, x, y, r * (1.5 + energy * 0.7), color, 0.24 + energy * 0.28);
}

export function drawProtonPack(ctx: Ctx, s: WeaponDrawState) {
  const pulse = 0.5 + Math.sin(s.t * 4) * 0.5;
  const motion = fireMotion("protonPack", s.shotAge);
  const kick = motion.kick;
  const slide = firingMuzzleOffset("protonPack", s.shotAge);
  ctx.save();

  // The asymmetric pack silhouette and red cyclotron distinguish it from a rifle.
  ctx.save();
  ctx.translate(-105, 0);
  ctx.strokeStyle = "#151b21";
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(-29, -44);
  ctx.bezierCurveTo(-49, -31, -48, 38, -30, 42);
  ctx.moveTo(25, -43);
  ctx.bezierCurveTo(42, -32, 43, 31, 27, 44);
  ctx.stroke();
  path(
    ctx,
    [
      [-35, -49],
      [18, -54],
      [34, -39],
      [35, 47],
      [21, 56],
      [-33, 51],
      [-39, 31],
    ],
    metal(ctx, -54, 56, "#6c746e", "#323d39", "#101a1a"),
  );
  box(
    ctx,
    -30,
    -45,
    51,
    83,
    metal(ctx, -45, 38, "#47524d", "#202c2b", "#0d1518"),
    5,
  );
  box(
    ctx,
    -24,
    -58,
    43,
    14,
    metal(ctx, -58, -44, "#90978c", "#526057", "#25312e"),
    3,
  );
  for (let i = 0; i < 6; i++)
    stroke(
      ctx,
      [
        [-19 + i * 6, -55],
        [-19 + i * 6, -48],
      ],
      "#1e2b28",
      2,
    );

  // Brass power regulator, copper pipe, and blue battery ladder.
  box(
    ctx,
    5,
    -36,
    18,
    36,
    metal(ctx, -36, 0, "#b4a06a", "#776640", "#342f25"),
    3,
  );
  for (let i = 0; i < 7; i++)
    stroke(
      ctx,
      [
        [8, -31 + i * 4],
        [19, -31 + i * 4],
      ],
      "#363928",
      1.8,
    );
  box(ctx, -25, -39, 19, 46, "#101921", 2);
  for (let i = 0; i < 9; i++) {
    const lit =
      i <=
      Math.floor(
        s.t * 7 + motion.charge * 8 + motion.active * (s.shotAge ?? 0) * 22,
      ) %
        10;
    box(
      ctx,
      -22,
      -35 + i * 4.1,
      12,
      2.5,
      lit ? (motion.active ? "#c5eaff" : "#87cdf2") : "#243a47",
      0.7,
    );
  }
  cable(
    ctx,
    [
      [-31, -36],
      [-35, -26],
      [-35, -2],
      [-22, 10],
    ],
    "#b58b55",
    2.8,
  );
  cable(
    ctx,
    [
      [26, -26],
      [30, -20],
      [28, 8],
      [20, 16],
    ],
    "#b96f3a",
    3,
  );

  circle(ctx, -1, 29, 24, "#0b1116");
  circle(ctx, -1, 29, 21.4, metal(ctx, 7, 51, "#9da598", "#535f52", "#222c29"));
  circle(ctx, -1, 29, 17.5, "#10191d");
  for (let i = 0; i < 4; i++) {
    const a = (i * TAU) / 4 - Math.PI / 4;
    const active =
      Math.floor(
        s.t * 5 + motion.charge * 6 + motion.active * (s.shotAge ?? 0) * 23,
      ) %
        4 ===
      i;
    const x = -1 + Math.cos(a) * 11.5;
    const y = 29 + Math.sin(a) * 11.5;
    circle(ctx, x, y, 5, active ? "#f05b48" : "#6d2825");
    glow(
      ctx,
      x,
      y,
      9 + motion.charge * 4,
      "#f96b4a",
      active ? 0.5 + motion.active * 0.25 : 0.04 + motion.charge * 0.1,
    );
  }
  circle(ctx, -1, 29, 5, "#29332e");
  screw(ctx, -1, 29, 2.5);
  for (const p of [
    [-31, -42],
    [25, -36],
    [-29, 45],
    [26, 47],
  ] as Point[])
    screw(ctx, ...p);
  box(ctx, -12, -9, 11, 7, "#d1c5a2", 0.5);
  stroke(
    ctx,
    [
      [-10, -7],
      [-3, -4],
    ],
    "#ad4432",
    1.7,
  );
  ctx.restore();

  // A hanging hose connects the pack to the rear grip without crossing the controls.
  const hoseY =
    55 +
    Math.sin(s.t * 2.2) * 3 +
    kick * 7 +
    Math.sin((s.shotAge ?? 0) * 29) * motion.active * 5;
  ctx.beginPath();
  ctx.moveTo(-71, 22);
  ctx.bezierCurveTo(-54, hoseY, -29, hoseY + 4, -21, 23);
  ctx.strokeStyle = "#070d14";
  ctx.lineWidth = 10;
  ctx.lineCap = "round";
  ctx.stroke();
  ctx.strokeStyle = "#57605a";
  ctx.lineWidth = 6;
  ctx.stroke();
  ctx.strokeStyle = "#899184";
  ctx.lineWidth = 1.1;
  ctx.stroke();
  for (let i = 0; i < 10; i++) {
    const t = i / 9;
    const u = 1 - t;
    const x =
      u * u * u * -71 +
      3 * u * u * t * -54 +
      3 * u * t * t * -29 +
      t * t * t * -21;
    const y =
      u * u * u * 22 +
      3 * u * u * t * hoseY +
      3 * u * t * t * (hoseY + 4) +
      t * t * t * 23;
    stroke(
      ctx,
      [
        [x - 2, y - 3],
        [x + 2, y + 3],
      ],
      "#171f21",
      1.5,
    );
  }

  // Neutrona wand: two grips, boxy emitter, spring barrel and lever.
  ctx.save();
  ctx.translate(slide.x, 0);
  path(
    ctx,
    [
      [-38, -18],
      [57, -18],
      [74, -10],
      [73, 10],
      [-30, 13],
      [-40, 4],
    ],
    metal(ctx, -18, 13, "#9ba5a1", "#4b5754", "#19252a"),
  );
  box(ctx, -36, -14, 30, 16, "#39443e", 2);
  box(
    ctx,
    -32,
    5,
    15,
    29,
    metal(ctx, 5, 34, "#4c5552", "#252e2d", "#0d171b"),
    4,
  );
  box(
    ctx,
    43,
    8,
    15,
    31,
    metal(ctx, 8, 39, "#59635c", "#2b3734", "#101b1d"),
    4,
  );
  for (let i = 0; i < 4; i++)
    stroke(
      ctx,
      [
        [-30, 12 + i * 5],
        [-20, 12 + i * 5],
      ],
      "#899080",
      0.9,
    );
  // Safety-striped lower heat shield.
  box(ctx, 3, 4, 30, 7, "#c8b465", 1);
  for (let i = 0; i < 5; i++)
    stroke(
      ctx,
      [
        [5 + i * 6, 5],
        [9 + i * 6, 10],
      ],
      "#28302a",
      2.7,
    );
  box(ctx, 2, -28, 46, 12, "#293331", 3);
  box(ctx, 9, -25, 12, 5, "#ae4032", 1.4);
  box(ctx, 25, -25, 15, 5, "#bf9550", 1.4);
  stroke(
    ctx,
    [
      [-12, -19],
      [-6 + kick * 3, -31 - motion.charge * 4],
      [10 + kick * 5, -31 - motion.charge * 4],
    ],
    "#a5aba3",
    3.5,
  );
  circle(ctx, 10 + kick * 5, -31 - motion.charge * 4, 3.8, "#9e332b");
  circle(ctx, 57, -8, 3.3, "#151c1e");
  circle(ctx, 57, -8, 2.1, "#f5ce76");
  glow(ctx, 57, -8, 7, "#f6b75b", 0.18 + pulse * 0.26);
  box(
    ctx,
    68,
    -16,
    73,
    16,
    metal(ctx, -16, 0, "#b1b8b3", "#65736b", "#25373a"),
    4,
  );
  for (let i = 0; i < 11; i++) {
    stroke(
      ctx,
      [
        [73 + i * 6, -15],
        [75 + i * 6, -1],
      ],
      i % 2 ? "#ced2c1" : "#273935",
      1.6,
    );
  }
  path(
    ctx,
    [
      [138, -20],
      [161, -17],
      [170, -11],
      [170, -5],
      [160, 1],
      [138, 3],
    ],
    metal(ctx, -20, 3, "#c1c9bf", "#738078", "#253832"),
  );
  ctx.save();
  ctx.translate(167, -8);
  ctx.scale(0.4, 1);
  lens(
    ctx,
    0,
    0,
    7,
    "#f0bd74",
    0.3 + motion.charge * 0.5 + motion.active * 0.6,
  );
  ctx.restore();
  for (const p of [
    [-31, -12],
    [65, -11],
    [16, -13],
    [146, -15],
  ] as Point[])
    screw(ctx, ...p, 1.2);
  ctx.restore();
  ctx.restore();
}

function legSegment(
  ctx: Ctx,
  a: Point,
  b: Point,
  width: number,
  bronze: boolean,
) {
  const angle = Math.atan2(b[1] - a[1], b[0] - a[0]);
  const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
  ctx.save();
  ctx.translate(a[0], a[1]);
  ctx.rotate(angle);
  path(
    ctx,
    [
      [0, -width / 2],
      [length - 6, -width * 0.32],
      [length, 0],
      [length - 6, width * 0.32],
      [0, width / 2],
    ],
    metal(
      ctx,
      -width / 2,
      width / 2,
      bronze ? "#d3bd8c" : "#c4d2cc",
      "#637268",
      "#192824",
    ),
  );
  stroke(
    ctx,
    [
      [3, -width * 0.26],
      [length - 5, -width * 0.15],
    ],
    "rgba(234,241,207,0.55)",
    0.9,
  );
  ctx.restore();
}

export function drawMartianTripod(ctx: Ctx, s: WeaponDrawState) {
  const breathing = Math.sin(s.t * 1.6);
  const pulse = 0.5 + Math.sin(s.t * 3.2) * 0.5;
  const motion = fireMotion("tripod", s.shotAge);
  const slide = firingMuzzleOffset("tripod", s.shotAge);
  ctx.save();

  // Three long articulated legs support a manta-like hood, rather than a bent tube.
  const legs: [Point, Point, Point][] = [
    [
      [-45, -15],
      [-66 + breathing * 2, 36],
      [-97, 88],
    ],
    [
      [-17, -12],
      [8 - breathing * 3, 49],
      [-5, 104],
    ],
    [
      [21, -18],
      [54 + breathing * 2, 35],
      [88, 85],
    ],
  ];
  legs.forEach(([hip, knee, foot], i) => {
    hip = [hip[0], hip[1] + slide.y];
    knee = [knee[0] * (1 + motion.charge * 0.07), knee[1] + motion.charge * 3];
    foot = [
      foot[0] * (1 + motion.charge * 0.08 + motion.kick * 0.025),
      foot[1],
    ];
    legSegment(ctx, hip, knee, i === 1 ? 12 : 10, i !== 1);
    legSegment(ctx, knee, foot, i === 1 ? 7 : 6, i !== 1);
    stroke(
      ctx,
      [
        [hip[0] - 4, hip[1] + 5],
        [knee[0] - 5, knee[1] - 4],
      ],
      "#b69960",
      1.7,
    );
    joint(ctx, ...hip, 6, true);
    joint(ctx, ...knee, 4.8, true);
    path(
      ctx,
      [
        [foot[0] - 8, foot[1] - 3],
        [foot[0] + 5, foot[1] - 3],
        [foot[0] + 11, foot[1] + 2],
        [foot[0] - 11, foot[1] + 2],
      ],
      "#475c50",
    );
  });
  ctx.save();
  ctx.translate(0, slide.y);
  // Underbody tendrils are restrained mechanical cables, not the main silhouette.
  cable(
    ctx,
    [
      [-30, -12],
      [-39, 16],
      [-24, 36],
      [-23, 52],
    ],
    "#5b7561",
    2,
  );
  cable(
    ctx,
    [
      [2, -10],
      [16, 11],
      [10, 27],
    ],
    "#6c7e59",
    2,
  );
  box(
    ctx,
    -36,
    -37,
    54,
    28,
    metal(ctx, -37, -9, "#91a490", "#475e4d", "#182e26"),
    8,
  );
  for (let i = 0; i < 5; i++) box(ctx, -30 + i * 9, -23, 4, 12, "#23392f", 1);

  // Broad continuous canopy with a thin brass lip and recessed three-eye cluster.
  ctx.beginPath();
  ctx.moveTo(-95, -42);
  ctx.bezierCurveTo(-78, -74, -23, -83, 26, -64);
  ctx.bezierCurveTo(50, -56, 70, -43, 66, -33);
  ctx.bezierCurveTo(16, -10, -60, -15, -95, -35);
  ctx.closePath();
  const hood = ctx.createLinearGradient(0, -80, 0, -15);
  hood.addColorStop(0, "#c2c9aa");
  hood.addColorStop(0.16, "#859478");
  hood.addColorStop(0.43, "#445a4c");
  hood.addColorStop(0.75, "#293f36");
  hood.addColorStop(1, "#101e1b");
  ctx.fillStyle = hood;
  ctx.fill();
  ctx.strokeStyle = "#121d19";
  ctx.lineWidth = 1.8;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-91, -35);
  ctx.bezierCurveTo(-48, -12, 16, -14, 64, -34);
  ctx.strokeStyle = "#c7b078";
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-82, -48);
  ctx.bezierCurveTo(-60, -68, -18, -74, 20, -59);
  ctx.strokeStyle = "rgba(225,234,199,0.5)";
  ctx.lineWidth = 1.1;
  ctx.stroke();
  for (let i = 0; i < 3; i++) {
    const x = -24 + i * 18;
    const y = -37 - Math.abs(i - 1) * 3;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1, 0.55);
    circle(ctx, 0, 0, 7, "#0d211d");
    ctx.save();
    ctx.scale(1, 0.45 + 0.55 * Math.max(motion.charge, motion.active));
    circle(ctx, 0, 0, 4.2, i === 1 ? "#e2f5b8" : "#a6ce87");
    glow(
      ctx,
      0,
      0,
      10 + motion.charge * 5,
      "#d7f69b",
      0.18 + pulse * 0.2 + motion.charge * 0.5,
    );
    ctx.restore();
    ctx.restore();
  }
  for (const p of [
    [-78, -36],
    [-49, -27],
    [44, -32],
  ] as Point[])
    screw(ctx, ...p, 1.3);

  // A short gimballed heat-ray nozzle, mounted underneath the hood's right edge.
  ctx.save();
  ctx.translate(slide.x, 0);
  legSegment(ctx, [27, -27], [54, -38], 13, true);
  joint(ctx, 30, -27, 6, true);
  box(
    ctx,
    48,
    -51,
    52,
    24,
    metal(ctx, -51, -27, "#b8bb94", "#758369", "#273e30"),
    8,
  );
  box(
    ctx,
    92,
    -53,
    15,
    28,
    metal(ctx, -53, -25, "#d1cfa4", "#899176", "#34482f"),
    4,
  );
  for (let i = 0; i < 4; i++)
    stroke(
      ctx,
      [
        [55 + i * 9, -47],
        [55 + i * 9, -30],
      ],
      "#3d5440",
      1.9,
    );
  ctx.save();
  ctx.translate(108, -39);
  ctx.scale(0.55, 1);
  lens(
    ctx,
    0,
    0,
    8,
    "#cbe99e",
    0.35 + motion.charge * 0.55 + motion.active * 0.55,
  );
  ctx.restore();
  stroke(
    ctx,
    [
      [58, -52],
      [82, -54],
      [95, -50],
    ],
    "#c5cda1",
    1,
  );
  ctx.restore();
  ctx.restore();
  ctx.restore();
}

function finger(ctx: Ctx, points: Point[], width: number, index: number) {
  const reds = ["#c25348", "#96322c", "#6c1f20"];
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    const angle = Math.atan2(b[1] - a[1], b[0] - a[0]);
    const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
    ctx.save();
    ctx.translate(a[0], a[1]);
    ctx.rotate(angle);
    const w = width * (1 - i * 0.13);
    path(
      ctx,
      [
        [-1, -w * 0.5],
        [length - 4, -w * 0.47],
        [length + 1, 0],
        [length - 3, w * 0.48],
        [-1, w * 0.5],
      ],
      metal(ctx, -w / 2, w / 2, "#e5ce8c", "#bc8f3b", "#704721"),
    );
    path(
      ctx,
      [
        [0, -w * 0.48],
        [length - 5, -w * 0.45],
        [length - 2, -w * 0.15],
        [2, -w * 0.02],
      ],
      metal(
        ctx,
        -w / 2,
        1,
        "#e09474",
        reds[(index + i) % reds.length],
        "#702020",
      ),
      "#6b2d22",
      0.7,
    );
    stroke(
      ctx,
      [
        [3, w * 0.27],
        [length - 5, w * 0.27],
      ],
      "#f4dd9d",
      0.85,
    );
    if (i < points.length - 2) {
      circle(ctx, length, 0, w * 0.33, "#1b2228");
      screw(ctx, length, 0, w * 0.15);
    }
    ctx.restore();
  }
}

export function drawRepulsorHand(ctx: Ctx, s: WeaponDrawState) {
  const pulse = 0.5 + Math.sin(s.t * 4.2) * 0.5;
  const motion = fireMotion("repulsor", s.shotAge);
  const r = motion.kick;
  const charge = motion.charge;
  ctx.save();
  // Long, tapered forearm plates replace the old striped tube.
  path(
    ctx,
    [
      [-110, -24],
      [-73, -29],
      [-21, -23],
      [8, -18],
      [10, 22],
      [-24, 28],
      [-84, 30],
      [-110, 19],
    ],
    metal(ctx, -30, 30, "#eaa389", "#9f3330", "#501d21"),
  );
  path(
    ctx,
    [
      [-105, -21],
      [-69, -24],
      [-28, -19],
      [-36, -3],
      [-106, 3],
    ],
    metal(ctx, -26, 3, "#ce725c", "#9e342c", "#6c2524"),
    "#5a2522",
    1,
  );
  path(
    ctx,
    [
      [-106, 6],
      [-36, 1],
      [-17, 21],
      [-83, 26],
      [-108, 17],
    ],
    metal(ctx, 1, 27, "#a94636", "#7b2825", "#401820"),
    "#401b1c",
    1,
  );
  path(
    ctx,
    [
      [-92, -24],
      [-80, -26],
      [-68, 26],
      [-81, 27],
    ],
    metal(ctx, -26, 27, "#f7deb1", "#c69745", "#7a4926"),
    "#7c4b2d",
    1,
  );
  path(
    ctx,
    [
      [-28, -22],
      [-13, -20],
      [0, 18],
      [-16, 24],
      [-28, 10],
    ],
    metal(ctx, -23, 25, "#efd5a0", "#bc8c41", "#6d4026"),
    "#5d3727",
    1,
  );
  for (let i = 0; i < 3; i++) {
    box(ctx, -59 + i * 8, -17, 4, 11, "#291e20", 1.5);
    stroke(
      ctx,
      [
        [-58 + i * 8, -15],
        [-58 + i * 8, -8],
      ],
      "#ce8761",
      0.7,
    );
  }
  stroke(
    ctx,
    [
      [-105, -19],
      [-74, -24],
      [-37, -20],
    ],
    "#f5bf99",
    0.9,
  );
  box(
    ctx,
    -6,
    -18,
    18,
    40,
    metal(ctx, -18, 22, "#a4a59a", "#4c5051", "#171f25"),
    5,
  );
  for (let i = 0; i < 3; i++)
    stroke(
      ctx,
      [
        [-1 + i * 4, -14],
        [-1 + i * 4, 18],
      ],
      "#252d32",
      1,
    );

  // Four spread fingers plus a separate opposed thumb read as an actual open hand.
  const flex = r * 9 - charge * 12 + Math.sin(s.t * 1.8) * 0.8;
  const fingers: Point[][] = [
    [
      [49, -26],
      [80, -43 + charge * 5],
      [104 - charge * 9, -51 - flex],
      [122 - charge * 24 + r * 3, -54 - flex],
    ],
    [
      [61, -12],
      [99, -24 + charge * 4],
      [125 - charge * 8, -25],
      [145 - charge * 22 + r * 4, -23 - flex * 0.4],
    ],
    [
      [65, 5],
      [102, 8],
      [127 - charge * 8, 13],
      [143 - charge * 20, 20 + flex * 0.3],
    ],
    [
      [59, 22],
      [89, 36 - charge * 3],
      [108 - charge * 7, 47],
      [120 - charge * 22, 55 + flex],
    ],
  ];
  fingers.forEach((f, i) => finger(ctx, f, i === 3 ? 11 : 13, i));
  finger(
    ctx,
    [
      [18, 24],
      [29, 48],
      [50 - charge * 5, 62],
      [68 - charge * 12, 62 + flex * 0.5],
    ],
    16,
    4,
  );

  path(
    ctx,
    [
      [3, -19],
      [26, -35],
      [49, -34],
      [69, -21],
      [78, 5],
      [64, 28],
      [36, 36],
      [10, 24],
    ],
    metal(ctx, -35, 36, "#ebd29f", "#be9555", "#785036"),
  );
  path(
    ctx,
    [
      [6, -16],
      [28, -30],
      [50, -29],
      [65, -18],
      [65, -10],
      [28, -17],
      [10, -7],
    ],
    metal(ctx, -30, -7, "#dc9b7a", "#ab4233", "#672324"),
    "#71392b",
    1,
  );
  path(
    ctx,
    [
      [10, 9],
      [31, 20],
      [63, 18],
      [61, 27],
      [36, 33],
      [13, 23],
    ],
    metal(ctx, 9, 33, "#bd7256", "#92372d", "#4d2224"),
    "#5a2a22",
    1,
  );
  stroke(
    ctx,
    [
      [12, -1],
      [22, -4],
    ],
    "#755638",
    1,
  );
  stroke(
    ctx,
    [
      [64, -4],
      [72, 2],
      [65, 13],
    ],
    "#edcc85",
    1,
  );
  for (const p of [
    [22, -24],
    [60, -18],
    [22, 25],
    [60, 22],
  ] as Point[])
    screw(ctx, ...p, 1.3);

  // The repulsor sits inside the palm with six mechanical shutters and a crisp glass face.
  lens(ctx, 44, 0, 15.5, "#86d8f5", 0.2 + pulse * 0.1 + charge * 0.6 + r * 0.5);
  ctx.save();
  ctx.translate(44, 0);
  ctx.rotate(s.t * 0.25 + charge * 0.65 + r * 0.2);
  for (let i = 0; i < 6; i++) {
    const a = (i * TAU) / 6;
    ctx.save();
    ctx.rotate(a);
    const aperture = 11 - charge * 3 + r * 4;
    path(
      ctx,
      [
        [aperture, -3],
        [16.7, -3],
        [18.1, 0.4],
        [aperture + 1.5, 2],
      ],
      "#667f87",
      "#d7e8dc",
      0.55,
    );
    ctx.restore();
  }
  circle(ctx, 0, 0, 6 + charge * 2 + r, "#edffff");
  stroke(
    ctx,
    [
      [-4, -1],
      [0, 4],
      [4, -1],
      [-4, -1],
    ],
    "#86c7df",
    0.7,
  );
  ctx.restore();
  ctx.restore();
}

export function drawPredatorShoulder(ctx: Ctx, s: WeaponDrawState) {
  const age = s.shotAge ?? 100;
  const motion = fireMotion("predatorShoulder", age);
  const energy = clamp(motion.charge + motion.kick * 0.65, 0, 1);
  const kick = motion.kick;
  const slide = firingMuzzleOffset("predatorShoulder", age);
  const pulse = 0.5 + Math.sin(s.t * 2.7) * 0.5;
  ctx.save();

  // Layered pauldron, netted under-armor, and a real shoulder saddle beneath the gun.
  path(
    ctx,
    [
      [-112, 34],
      [-103, 5],
      [-82, -8],
      [-40, -5],
      [-19, 16],
      [-17, 49],
      [-68, 64],
      [-108, 53],
    ],
    metal(ctx, -8, 64, "#69706b", "#3c4949", "#182329"),
  );
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(-112, 34);
  ctx.lineTo(-103, 5);
  ctx.lineTo(-82, -8);
  ctx.lineTo(-40, -5);
  ctx.lineTo(-19, 16);
  ctx.lineTo(-17, 49);
  ctx.lineTo(-68, 64);
  ctx.lineTo(-108, 53);
  ctx.closePath();
  ctx.clip();
  for (let i = -4; i < 11; i++) {
    stroke(
      ctx,
      [
        [-128 + i * 15, -10],
        [-65 + i * 15, 68],
      ],
      "#16252a",
      2,
    );
    stroke(
      ctx,
      [
        [-100 + i * 15, -10],
        [-163 + i * 15, 68],
      ],
      "rgba(159,171,149,0.42)",
      1.1,
    );
  }
  ctx.restore();
  // Brushed titanium shoulder scales, with warm etched edges instead of a generic black base.
  for (let i = 0; i < 3; i++) {
    const x = -105 + i * 24;
    path(
      ctx,
      [
        [x, 1 - i * 4],
        [x + 17, -12 - i * 2],
        [x + 38, 4],
        [x + 31, 27],
        [x + 9, 33],
      ],
      metal(ctx, -16, 34, "#c0bba4", "#727f7b", "#354d50"),
    );
    stroke(
      ctx,
      [
        [x + 3, 1 - i * 4],
        [x + 17, -9 - i * 2],
        [x + 32, 4],
      ],
      "#d6d1b4",
      0.9,
    );
    screw(ctx, x + 15, 22, 1.6);
  }
  // Dual servo arms lift the cannon above the shoulder, with recoil-linked pistons.
  legSegment(ctx, [-58, 8], [-32 - kick * 3, -29 + kick * 3], 17, false);
  legSegment(
    ctx,
    [-32 - kick * 3, -29 + kick * 3],
    [12 + slide.x * 0.3, -37],
    14,
    false,
  );
  stroke(
    ctx,
    [
      [-65, 8],
      [-48 - kick * 5, -24 + kick * 4],
    ],
    "#a6b7b0",
    4,
  );
  stroke(
    ctx,
    [
      [-26 - kick * 3, -20],
      [11 + slide.x * 0.3, -29],
    ],
    "#b18b55",
    3,
  );
  joint(ctx, -58, 8, 8);
  joint(ctx, -32, -29, 7);
  joint(ctx, 12, -37, 6);
  cable(
    ctx,
    [
      [-94, -4],
      [-90, -36],
      [-69, -55],
      [-30, -58],
    ],
    "#7d8273",
    5,
  );
  for (let i = 0; i < 6; i++)
    stroke(
      ctx,
      [
        [-80 + i * 6, -47 - i],
        [-77 + i * 6, -39 - i],
      ],
      "#263c41",
      1.6,
    );

  ctx.save();
  ctx.translate(slide.x, 0);
  // Segmented cylindrical rear cap and angular, alien-etched receiver.
  box(
    ctx,
    -41,
    -76,
    24,
    48,
    metal(ctx, -76, -28, "#b1b5a9", "#6d7e79", "#223b43"),
    8,
  );
  for (let i = 0; i < 4; i++)
    stroke(
      ctx,
      [
        [-38 + i * 5, -72],
        [-38 + i * 5, -32],
      ],
      "#263d45",
      2.2,
    );
  path(
    ctx,
    [
      [-20, -77],
      [63, -79],
      [89, -65],
      [90, -33],
      [67, -19],
      [-19, -24],
      [-29, -38],
      [-28, -63],
    ],
    metal(ctx, -79, -19, "#d1d5c7", "#899891", "#344c54"),
  );
  path(
    ctx,
    [
      [-16, -70],
      [56, -72],
      [75, -62],
      [69, -52],
      [-12, -53],
    ],
    metal(ctx, -72, -52, "#9da89a", "#667a76", "#3e565d"),
    "#667b7b",
    0.8,
  );
  path(
    ctx,
    [
      [-17, -48],
      [64, -48],
      [82, -39],
      [62, -25],
      [-14, -29],
    ],
    metal(ctx, -48, -25, "#687e80", "#415e66", "#243f4b"),
    "#253f4c",
    0.9,
  );
  stroke(
    ctx,
    [
      [-18, -75],
      [59, -76],
      [83, -63],
    ],
    "#e1e2c9",
    1.1,
  );
  stroke(
    ctx,
    [
      [-16, -28],
      [63, -24],
      [83, -36],
    ],
    "#97b8b3",
    0.9,
  );
  // Engraved Yautja-style glyphs are cut into the casing, not floating decals.
  for (let i = 0; i < 5; i++) {
    const x = -9 + i * 13;
    stroke(
      ctx,
      [
        [x, -42],
        [x + 3, -46],
        [x + 7, -42],
        [x + 5, -38],
        [x + 8, -34],
      ],
      "rgba(222,192,127,0.78)",
      1.1,
    );
    stroke(
      ctx,
      [
        [x + 2, -37],
        [x + 3, -34],
      ],
      "#283d44",
      0.8,
    );
  }
  box(ctx, 4, -84, 42, 6, "#354e53", 1.5);
  for (let i = 0; i < 4; i++)
    box(
      ctx,
      9 + i * 10,
      -85 - energy * (4 + i),
      4,
      8 + energy * (4 + i),
      "#657e7a",
      1,
    );
  // Splayed heat vanes respond to the charging sequence.
  for (const side of [-1, 1]) {
    const y = -49 + side * (20 + energy * 9 + motion.vent * 3);
    path(
      ctx,
      [
        [70, y - 2],
        [111, y - 3],
        [115, y + 3],
        [76, y + 4],
      ],
      "#566e73",
      "#a9bcb3",
      0.8,
    );
  }
  box(
    ctx,
    80,
    -63,
    49,
    32,
    metal(ctx, -63, -31, "#bfccbd", "#6e8887", "#294955"),
    6,
  );
  for (let i = 0; i < 5; i++) {
    box(
      ctx,
      88 + i * 8,
      -67,
      4,
      39,
      metal(ctx, -67, -28, "#b5c9c1", "#6c8586", "#24424d"),
      1.8,
    );
    stroke(
      ctx,
      [
        [89 + i * 8, -61],
        [89 + i * 8, -34],
      ],
      withAlpha("#79b7c4", 0.3 + energy * 0.5),
      0.8,
    );
  }
  box(
    ctx,
    128,
    -65,
    15,
    36,
    metal(ctx, -65, -29, "#e1dfc8", "#819d99", "#3a5860"),
    4,
  );
  ctx.save();
  ctx.translate(139, -47);
  ctx.scale(0.56, 1);
  lens(ctx, 0, 0, 11, "#8bcff4", 0.2 + pulse * 0.06 + energy * 0.7);
  ctx.strokeStyle = "#b6dfdc";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(0, 0, 13.4, -2.3, 0.7);
  ctx.stroke();
  ctx.restore();
  glow(ctx, 139, -47, 13 + energy * 20, "#77cfff", energy * 0.4);
  if (motion.vent > 0.01) {
    ctx.strokeStyle = withAlpha("#a5c7db", motion.vent * 0.22);
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(-12 + i * 12, -80);
      ctx.bezierCurveTo(-21 + i * 12, -88, 1 + i * 12, -95, -12 + i * 12, -106);
      ctx.stroke();
    }
  }

  // Tri-laser pod mounted rigidly above the barrel.
  box(
    ctx,
    51,
    -91,
    24,
    13,
    metal(ctx, -91, -78, "#adb8a3", "#5f766e", "#203f45"),
    3,
  );
  for (const [dx, dy] of [
    [0, -3],
    [-3, 2],
    [3, 2],
  ] as Point[]) {
    circle(ctx, 71 + dx * 0.4, -84 + dy, 1.7, "#e9564b");
    glow(ctx, 71 + dx * 0.4, -84 + dy, 4, "#ff4e4c", 0.28 + energy * 0.25);
  }
  for (const p of [
    [-17, -65],
    [64, -65],
    [-16, -30],
    [68, -29],
    [133, -61],
  ] as Point[])
    screw(ctx, ...p, 1.6);
  ctx.restore();
  ctx.restore();
}
