import type { Particle } from "./core";

export interface Bullet {
  id?: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  spin: number;
  age: number;
  life: number;
  size: number;
  dead: boolean;
  kind: string;
  weapon: Weapon;
  trail: { x: number; y: number }[];
  trailMax: number;
  data: Record<string, number>;
  returning?: number;
  hitCd?: number;
  discSpin?: number;
  wallBounces?: number;
  noStick?: boolean;
  update?: (b: Bullet, dt: number, api: GameAPI) => void;
  draw: (ctx: CanvasRenderingContext2D, b: Bullet, t: number) => void;
}

export interface Beam {
  weapon: Weapon;
  x: number;
  y: number;
  angle: number;
  age: number;
  duration: number;
  len: number;
  hitX: number;
  hitY: number;
  hit: boolean;
  windup?: number;
  pendingHit?: boolean;
  impactApplied?: boolean;
  impactAngle?: number;
  followMuzzle?: boolean;
  started?: boolean;
  tick?: (bm: Beam, dt: number, api: GameAPI) => void;
  draw: (ctx: CanvasRenderingContext2D, bm: Beam, t: number) => void;
}

export interface Mark {
  weapon: Weapon;
  sourceId?: number;
  a: number; // local angle on wheel
  r: number; // distance from wheel center
  size: number; // angular footprint in px along rim
  age: number;
  seed: number;
}

export interface GameAPI {
  cx: number;
  cy: number;
  wheelR: number;
  anchorX: number;
  anchorY: number;
  time: number;
  particles: Particle[];
  bullets: Bullet[];
  beams: Beam[];
  shake: (n: number) => void;
  flash: (color: string, a: number) => void;
  hitstop: (s: number) => void;
  hitscan: (
    x: number,
    y: number,
    angle: number,
  ) => { hit: boolean; x: number; y: number; dist: number };
  registerHit: (
    x: number,
    y: number,
    weapon: Weapon,
    sourceId?: number,
    record?: boolean,
  ) => boolean;
  muzzleFor: (
    weaponId: string,
  ) => { x: number; y: number; angle: number } | null;
  pushTarget: (x: number, y: number, force: number) => void;
}

export interface WeaponDrawState {
  t: number;
  recoil: number; // 0..1 decaying after shot
  charge: number; // 0..1 hold charge (bow)
  cycle?: number; // 0..1 reload / cooldown progress
  icon?: boolean;
  selected?: boolean;
  discInFlight?: boolean;
  shotAge?: number;
  catchAge?: number;
}

export interface Weapon {
  id: string;
  name: string;
  tag: string;
  accent: string;
  accent2: string;
  mode: "projectile" | "beam";
  cooldown: number;
  damage?: number;
  returnDamage?: number;
  charged?: boolean;
  recoilAmt: number;
  impactForce?: number;
  len: number;
  muzzle: [number, number];
  muzzleKick?: { x?: number; y?: number; rotation?: number };
  iconScale: number;
  markSize: number;
  draw: (ctx: CanvasRenderingContext2D, s: WeaponDrawState) => void;
  fire: (
    api: GameAPI,
    x: number,
    y: number,
    angle: number,
    charge: number,
  ) => void;
  onImpact?: (api: GameAPI, x: number, y: number, angle: number) => void;
  onReturn?: (api: GameAPI, x: number, y: number) => void;
  drawMark: (ctx: CanvasRenderingContext2D, m: Mark, t: number) => void;
}
