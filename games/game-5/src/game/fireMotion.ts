import { clamp } from "./core";

export const FIRE_SPECS = {
  plasmacaster: {
    release: 0.1,
    duration: 0.72,
    force: 64,
    label: "Hydraulic plasma",
  },
  identityDisc: {
    release: 0.12,
    duration: 0.66,
    force: 28,
    label: "Spin & ricochet",
  },
  protonPack: {
    release: 0.12,
    duration: 0.92,
    force: 40,
    label: "Cyclotron stream",
  },
  tripod: { release: 0.18, duration: 0.98, force: 86, label: "Heavy heat-ray" },
  repulsor: { release: 0.11, duration: 0.54, force: 76, label: "Palm impulse" },
  predatorShoulder: {
    release: 0.28,
    duration: 0.94,
    force: 102,
    label: "Servo plasma burst",
  },
} as const;

export type SignatureId = keyof typeof FIRE_SPECS;
export const isSignature = (id: string): id is SignatureId => id in FIRE_SPECS;

export function smooth(a: number, b: number, t: number) {
  const k = clamp((t - a) / Math.max(0.0001, b - a), 0, 1);
  return k * k * (3 - 2 * k);
}

function pulse(t: number, start: number, attack: number, recovery: number) {
  return (
    smooth(start, start + attack, t) *
    (1 - smooth(start + attack, start + attack + recovery, t))
  );
}

export interface FireMotion {
  x: number;
  y: number;
  rotation: number;
  charge: number;
  kick: number;
  active: number;
  follow: number;
  catch: number;
  vent: number;
}

export function fireMotion(id: string, age = 100, catchAge = 100): FireMotion {
  const neutral: FireMotion = {
    x: 0,
    y: 0,
    rotation: 0,
    charge: 0,
    kick: 0,
    active: 0,
    follow: 0,
    catch: 0,
    vent: 0,
  };
  if (!isSignature(id)) return neutral;
  const spec = FIRE_SPECS[id];
  const t = age - spec.release;
  const charge =
    age < spec.release
      ? smooth(0, spec.release, age)
      : Math.exp(-Math.max(0, t) * 26);
  // Continuous anticipation, fast impulse, then a damped recovery. No pose snaps at release.
  const wind =
    smooth(0, spec.release * 0.85, age) *
    (1 - smooth(spec.release * 0.8, spec.release + 0.085, age));
  const kick = t < 0 ? 0 : (1 - Math.exp(-t * 95)) * Math.exp(-t * 10) * 1.45;
  const active =
    smooth(spec.release, spec.release + 0.06, age) *
    (1 - smooth(spec.duration - 0.2, spec.duration, age));
  const follow = pulse(
    age,
    spec.release,
    0.075,
    id === "identityDisc" ? 0.34 : 0.22,
  );
  const caught = pulse(catchAge, 0, 0.035, 0.23);
  const vent = pulse(age, spec.release + 0.18, 0.07, 0.34);
  const result = {
    ...neutral,
    charge: clamp(charge, 0, 1),
    kick,
    active,
    follow,
    catch: caught,
    vent,
  };
  switch (id) {
    case "plasmacaster":
      return {
        ...result,
        x: -5 * wind - 18 * kick,
        y: 2 * kick,
        rotation: 0.025 * wind - 0.065 * kick,
      };
    case "identityDisc":
      return {
        ...result,
        x: -25 * wind + 17 * follow - 4 * caught,
        y: 5 * wind - 6 * follow,
        rotation: -0.38 * wind + 0.33 * follow - 0.065 * caught,
      };
    case "protonPack":
      return {
        ...result,
        x: -3 * wind - 5 * kick + Math.sin(age * 56) * active * 0.7,
        y: Math.sin(age * 43) * active * 0.7,
        rotation: Math.sin(age * 47) * active * 0.009,
      };
    case "tripod":
      return { ...result, x: -9 * kick, y: 0, rotation: -0.026 * kick };
    case "repulsor":
      return {
        ...result,
        x: -5 * wind - 20 * kick + 2 * follow,
        y: 2 * wind,
        rotation: -0.11 * wind + 0.105 * kick,
      };
    case "predatorShoulder":
      return {
        ...result,
        x: -3 * kick,
        y: 1.5 * kick,
        rotation: -0.018 * kick,
      };
  }
}

/** Internal sliding parts share the same offset as the simulated muzzle. */
export function firingMuzzleOffset(id: string, age = 100) {
  const motion = fireMotion(id, age);
  switch (id) {
    case "plasmacaster":
      return { x: 2 * motion.charge - 8 * motion.kick, y: 0 };
    case "protonPack":
      return {
        x: -4 * motion.kick + Math.sin(age * 48) * motion.active * 0.6,
        y: 0,
      };
    case "tripod":
      return {
        x: 8 * motion.charge - 7 * motion.kick,
        y: 5 * motion.charge + 1.5 * motion.active,
      };
    case "predatorShoulder":
      return { x: 2 * motion.charge - 16 * motion.kick, y: 0 };
    default:
      return { x: 0, y: 0 };
  }
}
