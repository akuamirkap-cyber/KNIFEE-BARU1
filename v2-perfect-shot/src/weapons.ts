/** The actual v1 Pistol, not the full catalog with its other entries hidden. */
export const PISTOL = Object.freeze({
  id: 'pistol', name: 'PISTOL', rarity: 'UMUM', perk: 'SEIMBANG',
  desc: 'Pistol klasik, seimbang di semua hal.',
  speed: 2700, cooldown: 0.12, shake: 2.5, stick: 17, half: 4.75,
  points: 1, recoil: 1, coinRadius: 15, coinValue: 1, auto: false,
  color: '#ff3030', trail: '255,230,150', casing: '#e0ad40', ejectY: 48,
  stats: { rate: 3, speed: 3, power: 3 },
});
export const WEAPONS = Object.freeze([PISTOL]);
/** V1 defaults Pistol's effect to its 9mm preset. Only that bullet's constants are copied. */
export const PISTOL_EFFECT = Object.freeze({ speed: 1800, cooldown: 0.24, bulletLen: 7, bulletR: 3, tracer: '#ffd9a0', markRadius: 4.7 });
export const PISTOL_METRICS = Object.freeze({ totalLen: 172, centerOffsetY: 84, centerOffsetX: 22, span: 185 });
export type WeaponId = 'pistol';
