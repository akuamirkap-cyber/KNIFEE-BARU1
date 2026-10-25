import { drawWeaponMark } from "./marks";
import { drawPredatorShoulder } from "./signatureModels";
import { FIRE_SPECS } from "./fireMotion";
import { firePulse, signatureImpact } from "./signatureFx";
import type { Weapon } from "./types";

export const predatorShoulder: Weapon = {
  id: "predatorShoulder",
  name: "Predator Shoulder Caster",
  tag: "YAUTJA / TRI-LASER / CHARGED PLASMA",
  accent: "#8dd4ff",
  accent2: "#4e99ff",
  mode: "projectile",
  cooldown: 1.1,
  recoilAmt: 16,
  impactForce: FIRE_SPECS.predatorShoulder.force,
  len: 250,
  muzzle: [139, -47],
  iconScale: 0.5,
  markSize: 34,
  draw: drawPredatorShoulder,
  fire(api, x, y, angle) {
    firePulse(predatorShoulder, api, x, y, angle, "shoulder");
  },
  onImpact(api, x, y, angle) {
    signatureImpact(predatorShoulder, api, x, y, angle);
  },
  drawMark: drawWeaponMark,
};
