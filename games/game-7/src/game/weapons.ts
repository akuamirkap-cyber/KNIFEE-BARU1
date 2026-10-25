import { hexA, rand, randInt, TAU, Particles, mix, type Particle } from './core';
import { ART, type ArtState } from './art';

export type { ArtState };

export type ProjKind =
  | 'arrow'
  | 'bullet'
  | 'smg'
  | 'pistol'
  | 'plasma'
  | 'fire'
  | 'orb'
  | 'disc'
  | 'singularity'
  | 'sabot'
  | 'temporal'
  | 'canister'
  | 'icicle'
  | 'phonon'
  | 'qubit'
  | 'acidblob'
  | 'buster';
export type ImpactKind =
  | 'arrow'
  | 'metal'
  | 'plasma'
  | 'fire'
  | 'laser'
  | 'heavy'
  | 'slash'
  | 'proton'
  | 'ash'
  | 'void'
  | 'arc'
  | 'rail'
  | 'prism'
  | 'nano'
  | 'chrono'
  | 'freeze'
  | 'shatter'
  | 'collapse'
  | 'acid'
  | 'buster';

export interface WeaponDef {
  id: string;
  name: string;
  tag: string;
  from: string;
  art: keyof typeof ART;
  mode: 'auto' | 'semi' | 'beam' | 'melee' | 'throw';
  rpm: number;
  pellets: number;
  spread: number;
  speed: number;
  damage: number;
  shake: number;
  recoil: number;
  embed: number;
  proj: ProjKind;
  impact: ImpactKind;
  primary: string;
  secondary: string;
  desc: string;
  chargeTime?: number;
  /** keep firing normal shots while the charge builds (Mega Buster style) */
  dualShot?: boolean;
  beamLife?: number;
  beamWidth?: number;
  sweep?: number;
  sweepSpeed?: number;
  waves?: number;
  gravity?: number;
}

export const WEAPONS: WeaponDef[] = [
  {
    id: 'bow',
    name: 'Panah & Busur',
    tag: 'Classical',
    from: 'Archery',
    art: 'bow',
    mode: 'semi',
    rpm: 78,
    pellets: 1,
    spread: 0.012,
    speed: 1250,
    damage: 34,
    shake: 3,
    recoil: 0.35,
    embed: 30,
    proj: 'arrow',
    impact: 'arrow',
    primary: '#ffd9a0',
    secondary: '#7ee8ff',
    desc: 'Lemparan panah dari busur recurve. Trail tipis, bunyi "thunk" dalam saat menancap.',
    gravity: 260,
  },
  {
    id: 'ak',
    name: 'AK-47',
    tag: 'Rifle',
    from: 'Real world',
    art: 'ak',
    mode: 'auto',
    rpm: 600,
    pellets: 1,
    spread: 0.032,
    speed: 2600,
    damage: 7,
    shake: 6,
    recoil: 1,
    embed: 16,
    proj: 'bullet',
    impact: 'metal',
    primary: '#ffb648',
    secondary: '#ffd9a0',
    desc: '7.62x39 mm. Flash besar, selongsong terlempar, percikan api oranye khas kaliber besar.',
  },
  {
    id: 'rifle',
    name: 'Assault Rifle',
    tag: 'Rifle',
    from: 'Modern',
    art: 'rifle',
    mode: 'auto',
    rpm: 720,
    pellets: 1,
    spread: 0.02,
    speed: 2850,
    damage: 6,
    shake: 5,
    recoil: 0.85,
    embed: 15,
    proj: 'bullet',
    impact: 'metal',
    primary: '#ffc76b',
    secondary: '#fff0d0',
    desc: '5.56 mm + suppressor. Presisi tinggi, tracer cepat, percikan logam biru-putih.',
  },
  {
    id: 'rifleElectro',
    name: 'Rifle Electro',
    tag: 'Energy',
    from: 'Sci-fi',
    art: 'rifleElectro',
    mode: 'auto',
    rpm: 520,
    pellets: 1,
    spread: 0.024,
    speed: 2200,
    damage: 12,
    shake: 5,
    recoil: 0.7,
    embed: 12,
    proj: 'plasma',
    impact: 'plasma',
    primary: '#38e8ff',
    secondary: '#c8fbff',
    desc: 'Selongsong plasma berisi koil elektromagnetik. Semburan busur listrik biru saat kena.',
  },
  {
    id: 'mp5',
    name: 'MP5',
    tag: 'SMG',
    from: 'Real world',
    art: 'mp5',
    mode: 'auto',
    rpm: 800,
    pellets: 1,
    spread: 0.055,
    speed: 2000,
    damage: 4,
    shake: 4,
    recoil: 0.6,
    embed: 12,
    proj: 'smg',
    impact: 'metal',
    primary: '#ffd27a',
    secondary: '#fff2d8',
    desc: '9 mm parabellum. fire rate tinggi, flash kecil, hujan percikan halus.',
  },
  {
    id: 'mp5Electro',
    name: 'MP5 Electro',
    tag: 'Energy',
    from: 'Sci-fi',
    art: 'mp5Electro',
    mode: 'auto',
    rpm: 760,
    pellets: 1,
    spread: 0.05,
    speed: 2100,
    damage: 7,
    shake: 4,
    recoil: 0.55,
    embed: 10,
    proj: 'plasma',
    impact: 'plasma',
    primary: '#7cf6ff',
    secondary: '#eafeff',
    desc: 'MP5 dengan koil berenergi. Bolt kecil cyan, impact memercik arc listrik.',
  },
  {
    id: 'sniper',
    name: 'Sniper Beam',
    tag: 'Energy',
    from: 'Sci-fi',
    art: 'sniper',
    mode: 'beam',
    rpm: 42,
    pellets: 1,
    spread: 0,
    speed: 0,
    damage: 110,
    shake: 16,
    recoil: 1.6,
    embed: 0,
    proj: 'orb',
    impact: 'laser',
    primary: '#a7f3ff',
    secondary: '#ffffff',
    desc: 'Hitscan sinar masif. Charge 0.5s lalu Beam membelah layar + shockwave ganda.',
    chargeTime: 0.55,
    beamLife: 0.22,
    beamWidth: 20,
  },
  {
    id: 'dragon',
    name: 'Dragon Breath',
    tag: 'Exotic',
    from: 'Custom build',
    art: 'dragon',
    mode: 'semi',
    rpm: 95,
    pellets: 9,
    spread: 0.2,
    speed: 1250,
    damage: 7,
    shake: 12,
    recoil: 1.4,
    embed: 8,
    proj: 'fire',
    impact: 'fire',
    primary: '#ff7a18',
    secondary: '#ffd24a',
    desc: 'Shotgun berkepala naga. Napas api 9 peluru dengan bara, asap hitam & lidah api.',
  },
  {
    id: 'beretta',
    name: 'Beretta 92',
    tag: 'Pistol',
    from: 'Real world',
    art: 'beretta',
    mode: 'semi',
    rpm: 330,
    pellets: 1,
    spread: 0.03,
    speed: 1750,
    damage: 11,
    shake: 7,
    recoil: 1,
    embed: 14,
    proj: 'pistol',
    impact: 'metal',
    primary: '#ffcf7a',
    secondary: '#fff4de',
    desc: '9 mm, slide open-top. Kick pendek, flash kerucut rapi & selongsong melengkung.',
  },
  {
    id: 'phaser',
    name: 'Phaser',
    tag: 'Energy',
    from: 'Star Trek',
    art: 'phaser',
    mode: 'beam',
    rpm: 0,
    pellets: 1,
    spread: 0,
    speed: 0,
    damage: 52,
    shake: 3,
    recoil: 0.1,
    embed: 0,
    proj: 'orb',
    impact: 'laser',
    primary: '#ff5b3a',
    secondary: '#ffd7c4',
    desc: 'Sinar merah bergelombang khas TNG. Beam menyapu permukaan target & meninggalkan bekas bakar.',
    beamLife: 999,
    beamWidth: 11,
    sweep: 0.13,
    sweepSpeed: 2.1,
  },
  {
    id: 'sword',
    name: 'Energy Sword',
    tag: 'Melee',
    from: 'Halo',
    art: 'sword',
    mode: 'melee',
    rpm: 108,
    pellets: 1,
    spread: 0,
    speed: 0,
    damage: 48,
    shake: 10,
    recoil: 1,
    embed: 0,
    proj: 'orb',
    impact: 'slash',
    primary: '#38c6ff',
    secondary: '#d9faff',
    desc: 'Tebasan plasma ganda. Trail arc biru + percikan ion di titik potong.',
  },
  {
    id: 'caster',
    name: 'Predator Shoulder Caster',
    tag: 'Energy',
    from: 'Yautja Tech · Plasmacaster',
    art: 'caster',
    mode: 'beam',
    rpm: 42,
    pellets: 1,
    spread: 0,
    speed: 1900,
    damage: 155,
    shake: 20,
    recoil: 1.65,
    embed: 0,
    proj: 'orb',
    impact: 'heavy',
    primary: '#67e8f9',
    secondary: '#ffffff',
    desc: 'Armor bahu titanium, dudukan servo artikulasi, dan tiga laser merah pengunci target. Setelah inti kapasitor terisi, meriam melepaskan baut plasma biru-putih berenergi tinggi yang meledak dahsyat.',
    chargeTime: 0.68,
    beamLife: 0,
    beamWidth: 28,
  },
  {
    id: 'disc',
    name: 'Identity Disc',
    tag: 'Energy',
    from: 'Tron',
    art: 'disc',
    mode: 'throw',
    rpm: 66,
    pellets: 1,
    spread: 0,
    speed: 1500,
    damage: 26,
    shake: 6,
    recoil: 0.4,
    embed: 6,
    proj: 'disc',
    impact: 'plasma',
    primary: '#25d8ff',
    secondary: '#eafeff',
    desc: 'Cakram lempar yang berputar, menancap, lalu kembali ke tangan dengan trail cahaya.',
  },
  {
    id: 'proton',
    name: 'Proton Pack',
    tag: 'Energy',
    from: 'Ghostbusters',
    art: 'proton',
    mode: 'beam',
    rpm: 0,
    pellets: 1,
    spread: 0,
    speed: 0,
    damage: 34,
    shake: 4,
    recoil: 0.2,
    embed: 0,
    proj: 'orb',
    impact: 'proton',
    primary: '#ff8a1e',
    secondary: '#ffe6a8',
    desc: 'Aliran partikel oranye bergelombang dengan "node" energi menyala di ujungnya.',
    beamLife: 999,
    beamWidth: 18,
    sweep: 0.075,
    sweepSpeed: 3.4,
    waves: 7,
  },
  {
    id: 'tripod',
    name: 'Tripod Heat Ray',
    tag: 'Energy',
    from: 'War of the Worlds',
    art: 'tripod',
    mode: 'beam',
    rpm: 0,
    pellets: 1,
    spread: 0,
    speed: 0,
    damage: 46,
    shake: 6,
    recoil: 0.1,
    embed: 0,
    proj: 'orb',
    impact: 'ash',
    primary: '#dff3ff',
    secondary: '#ffffff',
    desc: 'Heat ray tripod: sinar putih panas yang membeku, menguapkan target jadi abu.',
    beamLife: 999,
    beamWidth: 24,
    sweep: 0.09,
    sweepSpeed: 1.25,
  },
  {
    id: 'repulsor',
    name: 'Iron Man Hand Laser',
    tag: 'Energy',
    from: 'Iron Man',
    art: 'repulsor',
    mode: 'beam',
    rpm: 34,
    pellets: 1,
    spread: 0,
    speed: 0,
    damage: 78,
    shake: 8,
    recoil: 0.6,
    embed: 0,
    proj: 'orb',
    impact: 'laser',
    primary: '#bfe9ff',
    secondary: '#ffd36a',
    desc: 'Repulsor di telapak tangan: charge 0.5 detik lalu laser putih-emas tipis membakar target.',
    chargeTime: 0.5,
    beamLife: 0.3,
    beamWidth: 8,
  },

  /* ---------------------------------------------------- LEGENDARY TIER */
  {
    id: 'singularity',
    name: 'Singularity Cannon',
    tag: 'Legendary',
    from: 'Void Tech · Legendary',
    art: 'singularity',
    mode: 'semi',
    rpm: 24,
    pellets: 1,
    spread: 0,
    speed: 620,
    damage: 190,
    shake: 24,
    recoil: 2.1,
    embed: 0,
    proj: 'singularity',
    impact: 'void',
    primary: '#a855f7',
    secondary: '#f472f0',
    desc: 'Menembakkan singularitas terkurung: bola hitam dengan cincin lensa gravitasi & piringan akresi. Saat kena — ruang implodi, semua tersedot ke dalam, lalu meledak sebagai shockwave violet.',
    chargeTime: 0.72,
    gravity: 0,
  },
  {
    id: 'tesla',
    name: 'Tesla Arc Projector',
    tag: 'Legendary',
    from: 'Arc Reactor · Prototype',
    art: 'tesla',
    mode: 'beam',
    rpm: 0,
    pellets: 1,
    spread: 0,
    speed: 0,
    damage: 88,
    shake: 5,
    recoil: 0.22,
    embed: 0,
    proj: 'orb',
    impact: 'arc',
    primary: '#5ee7ff',
    secondary: '#ffffff',
    desc: 'Proyektor busur Tesla: petir bercabang acak yang merambat, menempel & merayap di permukaan target. 5 koil tembaga mempercepat muatan, bank kapasitor menyala saat menahan picu.',
    beamLife: 999,
    beamWidth: 15,
    sweep: 0.055,
    sweepSpeed: 4.6,
    waves: 9,
  },
  {
    id: 'railgun',
    name: 'Railgun MK-VII',
    tag: 'Legendary',
    from: 'Gauss Works · Experimental',
    art: 'railgun',
    mode: 'semi',
    rpm: 36,
    pellets: 1,
    spread: 0.002,
    speed: 4300,
    damage: 175,
    shake: 22,
    recoil: 2.4,
    embed: 0,
    proj: 'sabot',
    impact: 'rail',
    primary: '#7dd3fc',
    secondary: '#ffd08a',
    desc: 'Senjata hipersonik murni: sabot tungsten dilepaskan dari dua rel elektromagnetik (petal terbuang saat keluar). Kecepatan 4.3 km/detik — Mach cone ganda, tembus satu pukulan.',
    chargeTime: 0.82,
    gravity: 0,
  },
  {
    id: 'prism',
    name: 'Prismatic Lance',
    tag: 'Legendary',
    from: 'Spectral Optics · Unique',
    art: 'prism',
    mode: 'beam',
    rpm: 30,
    pellets: 1,
    spread: 0,
    speed: 0,
    damage: 145,
    shake: 12,
    recoil: 0.9,
    embed: 0,
    proj: 'orb',
    impact: 'prism',
    primary: '#ffffff',
    secondary: '#7df9ff',
    desc: 'Lance cahaya putih dipaksa melewati tiga prisma kristal yang berputar — lalu PECAH menjadi tujuh berkas spektrum penuh yang saling menyilang. Impact memercikkan pecahan kromatik pelangi.',
    chargeTime: 0.7,
    beamLife: 0.42,
    beamWidth: 5,
    gravity: 0,
  },
  {
    id: 'nanite',
    name: 'Nanite Hive Launcher',
    tag: 'Legendary',
    from: 'Grey Goo · Forbidden',
    art: 'nanite',
    mode: 'semi',
    rpm: 34,
    pellets: 1,
    spread: 0.004,
    speed: 1150,
    damage: 90,
    shake: 9,
    recoil: 1.1,
    embed: 0,
    proj: 'canister',
    impact: 'nano',
    primary: '#7dff4a',
    secondary: '#c6ff8a',
    desc: 'Melontarkan kapsul sarang nanobot. Saat pecah, ratusan nanobot menetas dan MERAYAP sepanjang rim roda sambil menggerogoti permukaan — meninggalkan luka hex yang makin banyak.',
    gravity: 0,
  },
  {
    id: 'chrono',
    name: 'Chrono Disruptor',
    tag: 'Legendary',
    from: 'Temporal Dynamics · One-off',
    art: 'chrono',
    mode: 'beam',
    rpm: 34,
    pellets: 1,
    spread: 0,
    speed: 980,
    damage: 135,
    shake: 10,
    recoil: 0.7,
    embed: 0,
    proj: 'temporal',
    impact: 'chrono',
    primary: '#ffcc4d',
    secondary: '#5fe6d0',
    desc: 'Menembakkan serpihan waktu berkecepatan rendah dengan bayangan afterimage. Saat mengenai target, garis waktu RETAK — dunia tersentak melambat, kristal jam berhamburan, cincin detik mengembang.',
    chargeTime: 0.6,
    gravity: 0,
  },
  {
    id: 'cryo',
    name: 'Absolute-Zero Lance',
    tag: 'Legendary',
    from: 'Helios Cryogenics · Unique',
    art: 'cryo',
    mode: 'beam',
    rpm: 26,
    pellets: 1,
    spread: 0,
    speed: 0,
    damage: 118,
    shake: 8,
    recoil: 0.55,
    embed: 0,
    proj: 'icicle',
    impact: 'freeze',
    primary: '#9fe6ff',
    secondary: '#e8f8ff',
    desc: 'Sinar kriogenik helium-cair. Bukan membakar — MEMBEKUKAN. Dendrit es heksagonal menumbuhkan kristal di rim, uap sublimasi mengepul, dan roda MELAMBAT karena permukaannya membeku.',
    beamLife: 999,
    beamWidth: 13,
    sweep: 0.05,
    sweepSpeed: 2.6,
    gravity: 0,
  },
  {
    id: 'sonic',
    name: 'Sonoclasm MK-4',
    tag: 'Legendary',
    from: 'Acoustic Warfare · Prototype',
    art: 'sonic',
    mode: 'semi',
    rpm: 72,
    pellets: 3,
    spread: 0.16,
    speed: 1050,
    damage: 34,
    shake: 18,
    recoil: 1.5,
    embed: 0,
    proj: 'phonon',
    impact: 'shatter',
    primary: '#ff8a2a',
    secondary: '#ffe08a',
    desc: 'Kanon resonansi akustik: menembakkan paket gelombang tekanan yang MERINGKAT. Tiga wavefront konsentris merambat ke depan, lalu target hancur karena getaran — bukan karena panas.',
    gravity: 0,
  },
  {
    id: 'quantum',
    name: 'Quantum Bifurcator',
    tag: 'Legendary',
    from: 'Q-Dynamics · One-off',
    art: 'quantum',
    mode: 'semi',
    rpm: 46,
    pellets: 1,
    spread: 0,
    speed: 1500,
    damage: 165,
    shake: 14,
    recoil: 1.2,
    embed: 0,
    proj: 'qubit',
    impact: 'collapse',
    primary: '#8b7bff',
    secondary: '#4affd0',
    desc: 'Satu qubit dilepas dalam superposisi TIGA posisi sekaligus. Ketiga bayangan terbang bersamaan dengan fase berbeda — lalu fungsi gelombang COLLAPSE di impak, memilih satu kenyataan.',
    chargeTime: 0.55,
    gravity: 0,
  },
  {
    id: 'acid',
    name: 'Molecular Acid Spray',
    tag: 'Legendary',
    from: 'Xenomorph XX121 · Biological',
    art: 'acid',
    mode: 'beam',
    rpm: 0,
    pellets: 1,
    spread: 0,
    speed: 0,
    damage: 74,
    shake: 4,
    recoil: 0.2,
    embed: 0,
    proj: 'acidblob',
    impact: 'acid',
    primary: '#a3ff2f',
    secondary: '#d6ff7a',
    desc: 'Darah asam molekuler bertekanan tinggi dari kelenjar internal Xenomorph. Bukan panas — asam ini MELARUTKAN: menghisap roda, meninggalkan lubang korosi yang terus menggerogoti, dan mengepul gas beracun.',
    beamLife: 999,
    beamWidth: 12,
    sweep: 0.07,
    sweepSpeed: 3.2,
    gravity: 420,
  },
  {
    id: 'buster',
    name: 'Mega Buster MK-X',
    tag: 'Legendary',
    from: 'Maverick Hunter · Reploid',
    art: 'buster',
    mode: 'beam',
    rpm: 300,
    pellets: 1,
    spread: 0,
    speed: 1750,
    damage: 15,
    shake: 4,
    recoil: 0.4,
    embed: 0,
    proj: 'buster',
    impact: 'buster',
    primary: '#ffd24a',
    secondary: '#fff6d8',
    desc: 'Kanon lengan Reploid. Tap cepat = peluru "lemon" klasik. Tahan picu = 3 tahap barrel mengulur & energi berputar — lepaskan jadi CHARGED SHOT raksasa yang menembus roda.',
    chargeTime: 0.9,
    dualShot: true,
    gravity: 0,
  },
];

export const SPECTRUM = ['#ff2d55','#ff9500','#ffe600','#5cff6b','#2de1ff','#4a6bff','#b14aff'];

export const WEAPON_BY_ID = Object.fromEntries(WEAPONS.map((w) => [w.id, w])) as Record<string, WeaponDef>;

/* ------------------------------------------------------- PROJECTILE DRAW */
export function drawProjectile(
  ctx: CanvasRenderingContext2D,
  kind: ProjKind,
  x: number,
  y: number,
  ang: number,
  t: number,
  w: WeaponDef,
  tier = 0,
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  ctx.globalCompositeOperation = 'lighter';
  switch (kind) {
    case 'arrow': {
      // speed trail
      const tg = ctx.createLinearGradient(-150, 0, 0, 0);
      tg.addColorStop(0, hexA(w.secondary, 0));
      tg.addColorStop(1, hexA(w.secondary, 0.35));
      ctx.fillStyle = tg;
      ctx.beginPath();
      ctx.moveTo(-160, -1.6);
      ctx.lineTo(0, -0.6);
      ctx.lineTo(0, 0.6);
      ctx.lineTo(-160, 1.6);
      ctx.closePath();
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
      // shaft
      const sg = ctx.createLinearGradient(0, -3, 0, 3);
      sg.addColorStop(0, '#e8d3a8');
      sg.addColorStop(0.5, '#b98f4e');
      sg.addColorStop(1, '#6d5023');
      ctx.fillStyle = sg;
      ctx.fillRect(-52, -1.7, 62, 3.4);
      // head
      ctx.fillStyle = '#dfe6ee';
      ctx.beginPath();
      ctx.moveTo(10, 0);
      ctx.lineTo(-6, -5);
      ctx.lineTo(-2, 0);
      ctx.lineTo(-6, 5);
      ctx.closePath();
      ctx.fill();
      // fletching
      ctx.fillStyle = '#37d6ff';
      for (const d of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(-34, d * 1.6);
        ctx.lineTo(-52, d * 12);
        ctx.lineTo(-42, d * 2);
        ctx.closePath();
        ctx.fill();
      }
      ctx.fillStyle = 'rgba(255,255,255,.6)';
      ctx.fillRect(-54, -2.4, 6, 4.8);
      break;
    }
    case 'bullet':
    case 'smg':
    case 'pistol': {
      const long = kind === 'bullet';
      const L = long ? 27 : kind === 'smg' ? 19 : 17;
      // --- supersonic vapour cone ahead of the nose
      const cone = ctx.createLinearGradient(6, 0, 52, 0);
      cone.addColorStop(0, hexA(w.secondary, 0.35));
      cone.addColorStop(1, hexA(w.secondary, 0));
      ctx.fillStyle = cone;
      ctx.beginPath();
      ctx.moveTo(4, -3);
      ctx.lineTo(50, -9);
      ctx.lineTo(50, 9);
      ctx.lineTo(4, 3);
      ctx.closePath();
      ctx.fill();
      // --- tracer streak (motion blur)
      const tg = ctx.createLinearGradient(-210, 0, 0, 0);
      tg.addColorStop(0, hexA(w.primary, 0));
      tg.addColorStop(0.45, hexA(w.primary, 0.3));
      tg.addColorStop(0.85, hexA(w.primary, 0.7));
      tg.addColorStop(1, hexA(w.secondary, 1));
      ctx.fillStyle = tg;
      ctx.beginPath();
      ctx.moveTo(-215, -3.4);
      ctx.lineTo(0, -1.3);
      ctx.lineTo(0, 1.3);
      ctx.lineTo(-215, 3.4);
      ctx.closePath();
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
      // --- brass case (rear)
      const cg = ctx.createLinearGradient(0, -3.4, 0, 3.4);
      cg.addColorStop(0, '#fff4c8');
      cg.addColorStop(0.3, '#e0be62');
      cg.addColorStop(0.7, '#a87c25');
      cg.addColorStop(1, '#6b4a0b');
      ctx.fillStyle = cg;
      ctx.fillRect(-L, -3.2, L * 0.62, 6.4);
      ctx.fillStyle = 'rgba(255,255,255,.7)';
      ctx.fillRect(-L, -3.2, L * 0.6, 1);
      ctx.fillStyle = 'rgba(0,0,0,.45)';
      ctx.fillRect(-L, 1.6, L * 0.62, 1.4);
      // extractor groove
      ctx.fillStyle = 'rgba(0,0,0,.4)';
      ctx.fillRect(-L * 0.42, -3.2, 1.2, 6.4);
      // --- copper jacket bullet
      const bg = ctx.createLinearGradient(0, -3.6, 0, 3.6);
      bg.addColorStop(0, '#ffe1b0');
      bg.addColorStop(0.32, '#e8a55c');
      bg.addColorStop(0.68, '#c1741f');
      bg.addColorStop(1, '#7d420f');
      ctx.fillStyle = bg;
      ctx.beginPath();
      ctx.moveTo(-L * 0.38, -3.4);
      ctx.lineTo(1.5, -3.4);
      ctx.quadraticCurveTo(L * 0.78, -2.5, L, 0);
      ctx.quadraticCurveTo(L * 0.78, 2.5, 1.5, 3.4);
      ctx.lineTo(-L * 0.38, 3.4);
      ctx.closePath();
      ctx.fill();
      // jacket seam + specular
      ctx.strokeStyle = 'rgba(255,255,255,.35)';
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.moveTo(-L * 0.36, -2.6);
      ctx.quadraticCurveTo(L * 0.5, -2, L * 0.9, 0);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.6)';
      ctx.fillRect(-L * 0.32, -2.5, L * 0.55, 1.1);
      // --- glowing base from propellant (heated rear)
      const baseG = ctx.createLinearGradient(-L, 0, -L * 0.2, 0);
      baseG.addColorStop(0, hexA('#ff7a18', 0.9));
      baseG.addColorStop(1, hexA('#ff7a18', 0));
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = baseG;
      ctx.fillRect(-L - 2, -3, 8, 6);
      break;
    }
    case 'plasma': {
      const p = 0.72 + 0.28 * Math.sin(t * 44);
      // --- comet tail
      const tail = ctx.createLinearGradient(-90, 0, 4, 0);
      tail.addColorStop(0, hexA(w.primary, 0));
      tail.addColorStop(0.55, hexA(w.primary, 0.3));
      tail.addColorStop(1, hexA('#ffffff', 0.75));
      ctx.fillStyle = tail;
      ctx.beginPath();
      ctx.moveTo(-92, -1);
      ctx.lineTo(0, -5.5);
      ctx.lineTo(0, 5.5);
      ctx.lineTo(-92, 1);
      ctx.closePath();
      ctx.fill();
      // --- containment field halo
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 30);
      g.addColorStop(0, hexA('#ffffff', 0.95 * p));
      g.addColorStop(0.2, hexA(w.primary, 0.85 * p));
      g.addColorStop(0.55, hexA(w.primary, 0.28));
      g.addColorStop(1, hexA(w.primary, 0));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, 30, 0, TAU);
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
      // --- solid energy core (capsule)
      const cg = ctx.createLinearGradient(0, -5, 0, 5);
      cg.addColorStop(0, '#ffffff');
      cg.addColorStop(0.5, hexA(w.primary, 1));
      cg.addColorStop(1, hexA(mix(w.primary, '#003a4a', 0.5), 1));
      ctx.fillStyle = cg;
      ctx.beginPath();
      ctx.ellipse(2, 0, 12, 4.6, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.95)';
      ctx.beginPath();
      ctx.ellipse(5, -1, 6, 1.6, 0, 0, TAU);
      ctx.fill();
      // --- crackling arcs
      ctx.strokeStyle = hexA('#ffffff', 0.9);
      ctx.lineWidth = 1.6;
      for (let i = 0; i < 3; i++) {
        const a = t * 26 + i * 2.1;
        ctx.beginPath();
        ctx.moveTo(-8, Math.sin(a) * 3);
        ctx.lineTo(1 + rand(-4, 4), Math.sin(a + 1.6) * 11);
        ctx.lineTo(14, Math.sin(a + 3.2) * 2.5);
        ctx.stroke();
      }
      ctx.strokeStyle = hexA(w.primary, 0.8);
      ctx.lineWidth = 3.2;
      for (let i = 0; i < 3; i++) {
        const a = t * 26 + i * 2.1 + 0.4;
        ctx.beginPath();
        ctx.moveTo(-8, Math.sin(a) * 3);
        ctx.lineTo(1 + rand(-4, 4), Math.sin(a + 1.6) * 11);
        ctx.lineTo(14, Math.sin(a + 3.2) * 2.5);
        ctx.stroke();
      }
      break;
    }
    case 'fire': {
      const r = 20 + Math.sin(t * 30) * 4;
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 2.4);
      g.addColorStop(0, 'rgba(255,255,235,.95)');
      g.addColorStop(0.25, hexA('#ffd24a', 0.85));
      g.addColorStop(0.55, hexA(w.primary, 0.6));
      g.addColorStop(1, hexA('#b32b00', 0));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, r * 2.4, 0, TAU);
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
      for (let i = 0; i < 4; i++) {
        const a = t * 18 + i * 1.7;
        ctx.fillStyle = hexA('#ff9b2f', 0.7);
        ctx.beginPath();
        ctx.arc(-8 - i * 9, Math.sin(a) * (4 + i * 3), 7 - i, 0, TAU);
        ctx.fill();
      }
      break;
    }
    case 'temporal': {
      /* ---- low-velocity temporal shard with time afterimages ---- */
      // afterimage echoes lagging behind
      for (let e2 = 1; e2 <= 4; e2++) {
        const f = 1 - e2 * 0.2;
        const ex = -e2 * 34;
        ctx.save();
        ctx.translate(ex, 0);
        ctx.globalAlpha = f * 0.5;
        ctx.rotate(Math.sin(t * 4 + e2) * 0.16);
        const sc = 1 - e2 * 0.13;
        ctx.scale(sc, sc);
        const eg = ctx.createLinearGradient(0, -10, 0, 10);
        eg.addColorStop(0, hexA(w.secondary, 0.8));
        eg.addColorStop(0.5, hexA('#ffffff', 0.7));
        eg.addColorStop(1, hexA(w.primary, 0.8));
        ctx.fillStyle = eg;
        ctx.beginPath();
        ctx.moveTo(16, 0);
        ctx.lineTo(0, -9);
        ctx.lineTo(-14, 0);
        ctx.lineTo(0, 9);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
      ctx.globalAlpha = 1;
      // clock ripple around the shard
      ctx.strokeStyle = hexA(w.primary, 0.5);
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(0, 0, 22 + Math.sin(t * 9) * 3, 0, TAU);
      ctx.stroke();
      for (let k = 0; k < 12; k++) {
        const a = (k / 12) * TAU - t * 3;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * 18, Math.sin(a) * 18);
        ctx.lineTo(Math.cos(a) * 23, Math.sin(a) * 23);
        ctx.stroke();
      }
      // golden halo
      ctx.globalCompositeOperation = 'lighter';
      const halo = ctx.createRadialGradient(0, 0, 0, 0, 0, 34);
      halo.addColorStop(0, hexA(w.secondary, 0.55));
      halo.addColorStop(0.45, hexA(w.primary, 0.32));
      halo.addColorStop(1, hexA(w.primary, 0));
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(0, 0, 34, 0, TAU);
      ctx.fill();
      // sand trail
      const tg = ctx.createLinearGradient(-120, 0, 0, 0);
      tg.addColorStop(0, hexA(w.primary, 0));
      tg.addColorStop(0.6, hexA(w.primary, 0.3));
      tg.addColorStop(1, hexA('#ffffff', 0.7));
      ctx.fillStyle = tg;
      ctx.beginPath();
      ctx.moveTo(-125, -2.2);
      ctx.lineTo(0, -5);
      ctx.lineTo(0, 5);
      ctx.lineTo(-125, 2.2);
      ctx.closePath();
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
      // the crystal itself
      const cg = ctx.createLinearGradient(0, -10, 0, 10);
      cg.addColorStop(0, hexA(w.secondary, 1));
      cg.addColorStop(0.34, '#ffffff');
      cg.addColorStop(0.66, hexA(w.primary, 1));
      cg.addColorStop(1, hexA(mix(w.primary, '#8a5a00', 0.5), 1));
      ctx.fillStyle = cg;
      ctx.beginPath();
      ctx.moveTo(20, 0);
      ctx.lineTo(3, -10);
      ctx.lineTo(-16, 0);
      ctx.lineTo(3, 10);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.9)';
      ctx.lineWidth = 1.2;
      ctx.stroke();
      // internal facet
      ctx.strokeStyle = 'rgba(255,255,255,.55)';
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.moveTo(16, 0);
      ctx.lineTo(-12, 0);
      ctx.stroke();
      break;
    }
    case 'canister': {
      /* ---- sealed hive canister, already leaking nanites ---- */
      // containment halo
      ctx.globalCompositeOperation = 'lighter';
      const halo = ctx.createRadialGradient(0, 0, 0, 0, 0, 30);
      halo.addColorStop(0, hexA(w.secondary, 0.6));
      halo.addColorStop(0.4, hexA(w.primary, 0.34));
      halo.addColorStop(1, hexA(w.primary, 0));
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(0, 0, 30, 0, TAU);
      ctx.fill();
      // toxic trail
      const tg = ctx.createLinearGradient(-150, 0, 0, 0);
      tg.addColorStop(0, hexA(w.primary, 0));
      tg.addColorStop(0.5, hexA(w.primary, 0.22));
      tg.addColorStop(1, hexA(w.secondary, 0.6));
      ctx.fillStyle = tg;
      ctx.beginPath();
      ctx.moveTo(-155, -2.6);
      ctx.lineTo(0, -6);
      ctx.lineTo(0, 6);
      ctx.lineTo(-155, 2.6);
      ctx.closePath();
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
      // hex shell
      ctx.save();
      ctx.rotate(t * 9);
      const shell = ctx.createLinearGradient(-13, -13, 13, 13);
      shell.addColorStop(0, '#dfffc2');
      shell.addColorStop(0.35, hexA(w.primary, 1));
      shell.addColorStop(0.7, '#3f6b26');
      shell.addColorStop(1, '#14200c');
      ctx.fillStyle = shell;
      ctx.beginPath();
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * TAU;
        const rr2 = 12;
        if (k === 0) ctx.moveTo(Math.cos(a) * rr2, Math.sin(a) * rr2);
        else ctx.lineTo(Math.cos(a) * rr2, Math.sin(a) * rr2);
      }
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(230,255,200,.85)';
      ctx.lineWidth = 1.6;
      ctx.stroke();
      // glowing core showing through the seams
      ctx.globalCompositeOperation = 'lighter';
      const core = ctx.createRadialGradient(0, 0, 0, 0, 0, 9);
      core.addColorStop(0, hexA('#ffffff', 0.95));
      core.addColorStop(0.5, hexA(w.secondary, 0.8));
      core.addColorStop(1, hexA(w.primary, 0));
      ctx.fillStyle = core;
      ctx.beginPath();
      ctx.arc(0, 0, 9, 0, TAU);
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
      // seam lines
      ctx.strokeStyle = 'rgba(10,20,6,.55)';
      ctx.lineWidth = 1;
      for (let k = 0; k < 3; k++) {
        const a = (k / 3) * TAU;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(a) * 12, Math.sin(a) * 12);
        ctx.stroke();
      }
      ctx.restore();
      break;
    }

    case 'icicle': {
      /* ---- cryogenic beam packet: an ice lance with a frost wake ---- */
      // sublimation wake
      const wake = ctx.createLinearGradient(-140, 0, 0, 0);
      wake.addColorStop(0, hexA(w.primary, 0));
      wake.addColorStop(0.55, hexA(w.primary, 0.2));
      wake.addColorStop(1, hexA('#ffffff', 0.6));
      ctx.fillStyle = wake;
      ctx.beginPath();
      ctx.moveTo(-145, -4);
      ctx.lineTo(0, -6);
      ctx.lineTo(0, 6);
      ctx.lineTo(-145, 4);
      ctx.closePath();
      ctx.fill();
      // cold halo
      const halo = ctx.createRadialGradient(0, 0, 0, 0, 0, 32);
      halo.addColorStop(0, hexA('#ffffff', 0.85));
      halo.addColorStop(0.3, hexA(w.primary, 0.6));
      halo.addColorStop(1, hexA(w.primary, 0));
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(0, 0, 32, 0, TAU);
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
      // the icicle itself: tapered, faceted, translucent
      const ig = ctx.createLinearGradient(0, -7, 0, 7);
      ig.addColorStop(0, 'rgba(255,255,255,.95)');
      ig.addColorStop(0.35, hexA(w.primary, 0.9));
      ig.addColorStop(0.75, hexA('#3f7fd6', 0.8));
      ig.addColorStop(1, 'rgba(20,50,90,.7)');
      ctx.fillStyle = ig;
      ctx.beginPath();
      ctx.moveTo(26, 0);
      ctx.lineTo(6, -6.4);
      ctx.lineTo(-26, -4.6);
      ctx.lineTo(-26, 4.6);
      ctx.lineTo(6, 6.4);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.8)';
      ctx.lineWidth = 1;
      ctx.stroke();
      // internal facets
      ctx.strokeStyle = 'rgba(255,255,255,.45)';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(20, 0);
      ctx.lineTo(-22, 0);
      ctx.moveTo(12, -4);
      ctx.lineTo(-8, 4);
      ctx.stroke();
      // crystalline tip spike
      ctx.fillStyle = 'rgba(255,255,255,.95)';
      ctx.beginPath();
      ctx.moveTo(26, 0);
      ctx.lineTo(14, -2.2);
      ctx.lineTo(14, 2.2);
      ctx.closePath();
      ctx.fill();
      // orbiting micro-flakes
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 4; i++) {
        const a = t * 9 + (i / 4) * TAU;
        const d = 20 + Math.sin(t * 6 + i) * 6;
        const fx = Math.cos(a) * d;
        const fy = Math.sin(a) * d * 0.55;
        ctx.save();
        ctx.translate(fx, fy);
        ctx.rotate(t * 7 + i);
        ctx.strokeStyle = hexA('#ffffff', 0.8);
        ctx.lineWidth = 1;
        for (let k = 0; k < 3; k++) {
          ctx.save();
          ctx.rotate((k / 3) * Math.PI);
          ctx.beginPath();
          ctx.moveTo(-3.4, 0);
          ctx.lineTo(3.4, 0);
          ctx.stroke();
          ctx.restore();
        }
        ctx.restore();
      }
      break;
    }
    case 'phonon': {
      /* ---- acoustic pressure packet: nested wavefronts ---- */
      // trailing trough
      for (let k = 3; k >= 1; k--) {
        const rr2 = 10 + k * 15;
        const al = 0.3 / k;
        ctx.strokeStyle = hexA(w.primary, al * (0.5 + 0.5 * Math.sin(t * 22 - k)));
        ctx.lineWidth = 3.4 - k * 0.6;
        ctx.beginPath();
        ctx.arc(-k * 16, 0, rr2, -1.15, 1.15);
        ctx.stroke();
        ctx.strokeStyle = hexA('#ffffff', al * 0.7);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(-k * 16, 0, rr2, -1.15, 1.15);
        ctx.stroke();
      }
      // leading compression front — bright and hard
      const pulse = 0.7 + 0.3 * Math.sin(t * 26);
      for (const [rr2, wd, al] of [
        [30, 11, 0.22],
        [26, 6, 0.5],
        [22, 2.6, 0.95],
      ] as [number, number, number][]) {
        const g = ctx.createRadialGradient(0, 0, rr2 * 0.8, 0, 0, rr2 * 1.16);
        g.addColorStop(0, hexA(w.primary, 0));
        g.addColorStop(0.55, hexA(w.primary, al * pulse));
        g.addColorStop(0.85, `rgba(255,255,255,${al * pulse})`);
        g.addColorStop(1, hexA(w.secondary, 0));
        ctx.strokeStyle = g;
        ctx.lineWidth = wd;
        ctx.beginPath();
        ctx.arc(0, 0, rr2, -1.3, 1.3);
        ctx.stroke();
      }
      // hot core (the compressed air itself)
      const cg = ctx.createRadialGradient(2, 0, 0, 2, 0, 17);
      cg.addColorStop(0, `rgba(255,255,255,${0.95 * pulse})`);
      cg.addColorStop(0.4, hexA(w.secondary, 0.7 * pulse));
      cg.addColorStop(1, hexA(w.primary, 0));
      ctx.fillStyle = cg;
      ctx.beginPath();
      ctx.arc(2, 0, 17, 0, TAU);
      ctx.fill();
      // pressure ripples radiating outward
      ctx.strokeStyle = hexA(w.secondary, 0.4);
      ctx.lineWidth = 1;
      for (let k = 0; k < 4; k++) {
        const a = (k / 4) * TAU + t * 8;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * 8, Math.sin(a) * 8);
        ctx.lineTo(Math.cos(a) * 20, Math.sin(a) * 20);
        ctx.stroke();
      }
      break;
    }
    case 'qubit': {
      /* ---- a qubit in superposition: three ghosts sharing one path ---- */
      // entanglement thread connecting the echoes
      ctx.strokeStyle = hexA(w.primary, 0.3);
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 5]);
      ctx.beginPath();
      ctx.moveTo(-120, 0);
      ctx.lineTo(0, 0);
      ctx.stroke();
      ctx.setLineDash([]);
      // probability cloud
      const cloud = ctx.createRadialGradient(0, 0, 0, 0, 0, 44);
      cloud.addColorStop(0, hexA(w.secondary, 0.4));
      cloud.addColorStop(0.4, hexA(w.primary, 0.24));
      cloud.addColorStop(1, hexA(w.primary, 0));
      ctx.fillStyle = cloud;
      ctx.beginPath();
      ctx.arc(0, 0, 44, 0, TAU);
      ctx.fill();
      // three phase-shifted probability shells
      for (let k = 0; k < 3; k++) {
        const ph = t * 6 + (k / 3) * TAU;
        const rx = 12 + Math.cos(ph) * 7;
        const ry = 15 + Math.sin(ph) * 9;
        const ox = Math.cos(ph) * 12;
        const oy = Math.sin(ph) * 15;
        ctx.save();
        ctx.translate(ox, oy);
        ctx.globalAlpha = 0.32 + 0.28 * (0.5 + 0.5 * Math.sin(ph * 2));
        ctx.strokeStyle = hexA(k === 1 ? w.secondary : w.primary, 0.95);
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.ellipse(0, 0, rx, ry, 0, 0, TAU);
        ctx.stroke();
        ctx.fillStyle = hexA(k === 1 ? w.secondary : w.primary, 0.14);
        ctx.fill();
        ctx.restore();
      }
      ctx.globalAlpha = 1;
      // the "real" bit at the centre
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 20);
      g.addColorStop(0, 'rgba(255,255,255,.98)');
      g.addColorStop(0.3, hexA(w.secondary, 0.9));
      g.addColorStop(0.7, hexA(w.primary, 0.5));
      g.addColorStop(1, hexA(w.primary, 0));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, 20, 0, TAU);
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
      // spinning braided core
      ctx.save();
      ctx.rotate(t * 11);
      ctx.strokeStyle = 'rgba(255,255,255,.9)';
      ctx.lineWidth = 1.4;
      for (let k = 0; k < 2; k++) {
        ctx.beginPath();
        for (let i2 = 0; i2 <= 20; i2++) {
          const f = i2 / 20;
          const a = f * 4.2 + k * Math.PI;
          const rr2 = f * 9;
          const xx = Math.cos(a) * rr2;
          const yy = Math.sin(a) * rr2;
          if (i2 === 0) ctx.moveTo(xx, yy);
          else ctx.lineTo(xx, yy);
        }
        ctx.stroke();
      }
      ctx.restore();
      break;
    }

    case 'acidblob': {
      /* ---- a pressurised glob of molecular acid ---- */
      const wob = 1 + Math.sin(t * 24) * 0.14;
      // caustic halo
      const halo = ctx.createRadialGradient(0, 0, 0, 0, 0, 40);
      halo.addColorStop(0, hexA('#f4ffd0', 0.7));
      halo.addColorStop(0.28, hexA(w.primary, 0.5));
      halo.addColorStop(0.65, hexA(w.primary, 0.18));
      halo.addColorStop(1, hexA(w.primary, 0));
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(0, 0, 40, 0, TAU);
      ctx.fill();
      // stringy wake of flying corrosion
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 3; i++) {
        const a = t * 16 + i * 2.1;
        ctx.strokeStyle = hexA(w.primary, 0.4);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-8, Math.sin(a) * 4);
        ctx.quadraticCurveTo(-34, Math.sin(a + 1.2) * 12, -62, Math.sin(a + 2.4) * 5);
        ctx.stroke();
      }
      ctx.globalCompositeOperation = 'source-over';
      // droplet body with a wobbling surface
      const bg = ctx.createRadialGradient(-4, -5, 1, 0, 0, 18);
      bg.addColorStop(0, '#fbffe8');
      bg.addColorStop(0.28, w.secondary);
      bg.addColorStop(0.62, w.primary);
      bg.addColorStop(0.88, w.secondary);
      bg.addColorStop(1, '#2d5a08');
      ctx.fillStyle = bg;
      ctx.beginPath();
      ctx.ellipse(0, 0, 17 * wob, 14 / wob, 0, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = hexA('#eaffb0', 0.75);
      ctx.lineWidth = 1.4;
      ctx.stroke();
      // meniscus highlight
      ctx.fillStyle = 'rgba(255,255,255,.9)';
      ctx.beginPath();
      ctx.ellipse(-5.5, -4.5, 4.4, 2.8, -0.5, 0, TAU);
      ctx.fill();
      // darker denser core
      ctx.fillStyle = hexA('#3f7a0c', 0.55);
      ctx.beginPath();
      ctx.ellipse(4, 3, 6, 4.4, 0.3, 0, TAU);
      ctx.fill();
      // micro-droplets shearing off
      ctx.fillStyle = hexA(w.secondary, 0.9);
      for (let i = 0; i < 3; i++) {
        const a = t * 20 + i * 2.1;
        const d = 20 + Math.sin(t * 14 + i) * 5;
        ctx.beginPath();
        ctx.arc(Math.cos(a) * d, Math.sin(a) * d * 0.6, 1.7, 0, TAU);
        ctx.fill();
      }
      break;
    }
    case 'buster': {
      /* ---- Mega Man buster shot: the iconic capsule / charged orb ---- */
      const tier2 = tier;
      if (tier2 <= 0) {
        /* ---- tier 0: the classic "lemon" ---- */
        // soft warm glow
        const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 26);
        g.addColorStop(0, 'rgba(255,255,255,.95)');
        g.addColorStop(0.3, hexA(w.primary, 0.8));
        g.addColorStop(1, hexA(w.primary, 0));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(0, 0, 26, 0, TAU);
        ctx.fill();
        // tracer tail
        const tg = ctx.createLinearGradient(-90, 0, 0, 0);
        tg.addColorStop(0, hexA(w.primary, 0));
        tg.addColorStop(0.6, hexA(w.primary, 0.3));
        tg.addColorStop(1, hexA('#ffffff', 0.85));
        ctx.fillStyle = tg;
        ctx.beginPath();
        ctx.moveTo(-95, -2);
        ctx.lineTo(0, -5);
        ctx.lineTo(0, 5);
        ctx.lineTo(-95, 2);
        ctx.closePath();
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
        // the capsule body
        const bg = ctx.createLinearGradient(0, -6, 0, 6);
        bg.addColorStop(0, '#ffffff');
        bg.addColorStop(0.34, '#fff3b0');
        bg.addColorStop(0.66, w.primary);
        bg.addColorStop(1, '#c47a10');
        ctx.fillStyle = bg;
        ctx.beginPath();
        ctx.ellipse(0, 0, 13, 6, 0, 0, TAU);
        ctx.fill();
        // nose taper
        ctx.fillStyle = '#fffbe8';
        ctx.beginPath();
        ctx.moveTo(12, 0);
        ctx.quadraticCurveTo(16, -3, 19, 0);
        ctx.quadraticCurveTo(16, 3, 12, 0);
        ctx.closePath();
        ctx.fill();
        // specular band
        ctx.fillStyle = 'rgba(255,255,255,.95)';
        ctx.beginPath();
        ctx.ellipse(-2, -2, 7, 1.7, 0, 0, TAU);
        ctx.fill();
      } else {
        /* ---- tier 1-3: charged sphere with rotating shells ---- */
        const R = 16 + tier2 * 9;
        const pulse = 0.8 + 0.2 * Math.sin(t * 22);
        // outer aura
        const aura = ctx.createRadialGradient(0, 0, R * 0.3, 0, 0, R * 3);
        aura.addColorStop(0, `rgba(255,255,255,${0.5 * pulse})`);
        aura.addColorStop(0.22, hexA(w.primary, 0.42 * pulse));
        aura.addColorStop(0.55, hexA('#ff9b2f', 0.18));
        aura.addColorStop(1, hexA(w.primary, 0));
        ctx.fillStyle = aura;
        ctx.beginPath();
        ctx.arc(0, 0, R * 3, 0, TAU);
        ctx.fill();
        // rotating energy shells
        for (let k = 0; k < 3; k++) {
          const ph = t * (7 + k * 3) + (k / 3) * TAU;
          ctx.save();
          ctx.rotate(ph);
          ctx.scale(1, 0.36 + k * 0.16);
          ctx.strokeStyle = hexA(k === 2 ? '#ffffff' : w.primary, (0.7 - k * 0.16) * pulse);
          ctx.lineWidth = 3.4 - k * 0.7;
          ctx.beginPath();
          ctx.arc(0, 0, R * (1.15 + k * 0.22), 0, TAU);
          ctx.stroke();
          ctx.restore();
        }
        // trailing energy ribbons
        for (let k = 0; k < 4; k++) {
          const a = t * 12 + (k / 4) * TAU;
          ctx.strokeStyle = hexA(k % 2 ? '#ffffff' : w.primary, 0.45);
          ctx.lineWidth = 2.2;
          ctx.beginPath();
          for (let i = 0; i <= 8; i++) {
            const f = i / 8;
            const rr2 = R * (1 + f * 2.6);
            const aa = a + f * 1.5;
            const xx = -Math.cos(aa) * rr2;
            const yy = Math.sin(aa) * rr2 * 0.34;
            if (i === 0) ctx.moveTo(xx, yy);
            else ctx.lineTo(xx, yy);
          }
          ctx.stroke();
        }
        // the solid core
        ctx.globalCompositeOperation = 'source-over';
        const cg = ctx.createRadialGradient(-R * 0.25, -R * 0.3, R * 0.1, 0, 0, R);
        cg.addColorStop(0, '#ffffff');
        cg.addColorStop(0.34, '#fff6d0');
        cg.addColorStop(0.66, w.primary);
        cg.addColorStop(1, '#c46a08');
        ctx.fillStyle = cg;
        ctx.beginPath();
        ctx.arc(0, 0, R, 0, TAU);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,.85)';
        ctx.lineWidth = 1.6;
        ctx.stroke();
        // hot specular
        ctx.fillStyle = 'rgba(255,255,255,.9)';
        ctx.beginPath();
        ctx.ellipse(-R * 0.3, -R * 0.34, R * 0.3, R * 0.18, -0.5, 0, TAU);
        ctx.fill();
      }
      break;
    }

    case 'singularity': {
      /* ---- gravitational singularity round ---- */
      const p = 0.7 + 0.3 * Math.sin(t * 17);
      // warped-space wake behind it
      const wake = ctx.createRadialGradient(-40, 0, 0, -30, 0, 78);
      wake.addColorStop(0, hexA(w.primary, 0.4 * p));
      wake.addColorStop(0.5, hexA(w.secondary, 0.16 * p));
      wake.addColorStop(1, hexA(w.primary, 0));
      ctx.fillStyle = wake;
      ctx.beginPath();
      ctx.ellipse(-30, 0, 80, 42, 0, 0, TAU);
      ctx.fill();
      // outer lensing halo (distorted starlight)
      const halo = ctx.createRadialGradient(0, 0, 12, 0, 0, 60);
      halo.addColorStop(0, hexA(w.secondary, 0.55 * p));
      halo.addColorStop(0.42, hexA(w.primary, 0.32 * p));
      halo.addColorStop(1, hexA(w.primary, 0));
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(0, 0, 60, 0, TAU);
      ctx.fill();
      // accretion disk (tilted, rotating)
      ctx.save();
      ctx.rotate(0.34);
      ctx.scale(1, 0.36);
      ctx.rotate(t * 7);
      const dg = ctx.createRadialGradient(0, 0, 11, 0, 0, 40);
      dg.addColorStop(0, 'rgba(255,255,255,.95)');
      dg.addColorStop(0.3, hexA(w.secondary, 0.8));
      dg.addColorStop(0.7, hexA(w.primary, 0.45));
      dg.addColorStop(1, hexA(w.primary, 0));
      ctx.fillStyle = dg;
      ctx.beginPath();
      ctx.arc(0, 0, 40, 0, TAU);
      ctx.arc(0, 0, 11, 0, TAU, true);
      ctx.fill();
      ctx.restore();
      // matter streams spiralling in
      ctx.lineCap = 'round';
      for (let i = 0; i < 4; i++) {
        const ph = t * 5 + (i / 4) * TAU;
        const rad = 30 + (1 - ((t * 1.6 + i / 4) % 1)) * 34;
        const a0 = ph;
        ctx.strokeStyle = hexA(i % 2 ? '#ffffff' : w.secondary, 0.6);
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        for (let k = 0; k <= 8; k++) {
          const f = k / 8;
          const rr2 = rad * (1 - f * 0.75);
          const aa = a0 + f * 2.4;
          const xx = Math.cos(aa) * rr2;
          const yy = Math.sin(aa) * rr2 * 0.55;
          if (k === 0) ctx.moveTo(xx, yy);
          else ctx.lineTo(xx, yy);
        }
        ctx.stroke();
      }
      ctx.globalCompositeOperation = 'source-over';
      // event horizon — truly black
      const eg = ctx.createRadialGradient(0, 0, 2, 0, 0, 19);
      eg.addColorStop(0, '#000000');
      eg.addColorStop(0.88, '#02000a');
      eg.addColorStop(1, 'rgba(6,0,18,.25)');
      ctx.fillStyle = eg;
      ctx.beginPath();
      ctx.arc(0, 0, 19, 0, TAU);
      ctx.fill();
      // photon ring
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = 'rgba(255,255,255,.95)';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.arc(0, 0, 20, 0, TAU);
      ctx.stroke();
      ctx.strokeStyle = hexA(w.secondary, 0.7 * p);
      ctx.lineWidth = 5.5;
      ctx.beginPath();
      ctx.arc(0, 0, 21.5, 0, TAU);
      ctx.stroke();
      break;
    }
    case 'sabot': {
      /* ---- hypervelocity kinetic sabot round ---- */
      // double Mach cone
      for (const [cl, wl] of [
        [0.3, 58],
        [0.16, 96],
      ] as [number, number][]) {
        const cg = ctx.createLinearGradient(6, 0, wl, 0);
        cg.addColorStop(0, hexA(w.primary, cl * 2));
        cg.addColorStop(1, hexA(w.primary, 0));
        ctx.fillStyle = cg;
        ctx.beginPath();
        ctx.moveTo(4, -2.6);
        ctx.lineTo(wl, -wl * 0.16);
        ctx.lineTo(wl, wl * 0.16);
        ctx.lineTo(4, 2.6);
        ctx.closePath();
        ctx.fill();
      }
      // incandescent air-plasma sheath
      const sheath = ctx.createRadialGradient(6, 0, 0, 6, 0, 34);
      sheath.addColorStop(0, hexA('#ffffff', 0.9));
      sheath.addColorStop(0.28, hexA(w.secondary, 0.6));
      sheath.addColorStop(0.62, hexA(w.primary, 0.3));
      sheath.addColorStop(1, hexA(w.primary, 0));
      ctx.fillStyle = sheath;
      ctx.beginPath();
      ctx.arc(6, 0, 34, 0, TAU);
      ctx.fill();
      // long ionised tracer
      const tg = ctx.createLinearGradient(-260, 0, 0, 0);
      tg.addColorStop(0, hexA(w.primary, 0));
      tg.addColorStop(0.5, hexA(w.primary, 0.35));
      tg.addColorStop(0.88, hexA(w.secondary, 0.75));
      tg.addColorStop(1, hexA('#ffffff', 0.95));
      ctx.fillStyle = tg;
      ctx.beginPath();
      ctx.moveTo(-265, -3);
      ctx.lineTo(0, -1.6);
      ctx.lineTo(0, 1.6);
      ctx.lineTo(-265, 3);
      ctx.closePath();
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
      // tungsten long-rod penetrator
      const rod = ctx.createLinearGradient(0, -3, 0, 3);
      rod.addColorStop(0, '#ffffff');
      rod.addColorStop(0.28, '#cfd8e2');
      rod.addColorStop(0.62, '#8892a0');
      rod.addColorStop(1, '#3a424e');
      ctx.fillStyle = rod;
      ctx.beginPath();
      ctx.moveTo(-30, -2.6);
      ctx.lineTo(16, -2.2);
      ctx.quadraticCurveTo(30, -1.2, 34, 0);
      ctx.quadraticCurveTo(30, 1.2, 16, 2.2);
      ctx.lineTo(-30, 2.6);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.85)';
      ctx.fillRect(-28, -2, 40, 0.9);
      // heat bloom from friction (rear third glows)
      ctx.globalCompositeOperation = 'lighter';
      const hb = ctx.createLinearGradient(-32, 0, -6, 0);
      hb.addColorStop(0, hexA('#ff5a12', 0.85));
      hb.addColorStop(0.55, hexA('#ffa53a', 0.4));
      hb.addColorStop(1, hexA('#ffd08a', 0));
      ctx.fillStyle = hb;
      ctx.fillRect(-32, -2.8, 27, 5.6);
      // discarded sabot petals still flanking the rod
      for (const d of [-1, 1]) {
        const pg = ctx.createLinearGradient(0, 0, 0, d * 16);
        pg.addColorStop(0, hexA('#b9c4d0', 0.95));
        pg.addColorStop(1, hexA('#4a525e', 0.1));
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = pg;
        ctx.save();
        ctx.translate(-14, d * 5);
        ctx.rotate(d * 0.42);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(16, d * 2);
        ctx.lineTo(14, d * 9);
        ctx.lineTo(-4, d * 6);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
      break;
    }

    case 'orb': {
      /* ---- Yautja Blue-White Plasma Star-Bolt ---- */
      const pulse = 0.82 + 0.18 * Math.sin(t * 36);
      const r = 24;

      // 1. Long ionized blue-white plasma comet tail
      const tailG = ctx.createLinearGradient(-195, 0, 8, 0);
      tailG.addColorStop(0, hexA('#1d4ed8', 0));
      tailG.addColorStop(0.35, hexA('#2563eb', 0.35));
      tailG.addColorStop(0.7, hexA(w.primary, 0.78));
      tailG.addColorStop(1, hexA('#ffffff', 0.98));
      ctx.fillStyle = tailG;
      ctx.beginPath();
      ctx.moveTo(-195, -1.5);
      ctx.quadraticCurveTo(-70, -14 * pulse, 4, -8);
      ctx.lineTo(4, 8);
      ctx.quadraticCurveTo(-70, 14 * pulse, -195, 1.5);
      ctx.closePath();
      ctx.fill();

      // Swirling plasma wake filaments
      for (let i = 0; i < 3; i++) {
        const ph = t * 22 + i * 2.1;
        ctx.strokeStyle = hexA(i === 0 ? '#ffffff' : w.primary, 0.65);
        ctx.lineWidth = 2.2 - i * 0.4;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        for (let k = 1; k <= 6; k++) {
          const fx = -k * 24;
          const fy = Math.sin(ph - k * 0.9) * (3 + k * 1.8);
          ctx.lineTo(fx, fy);
        }
        ctx.stroke();
      }

      // 2. Deep cobalt-blue & electric-cyan outer magnetic corona
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 3.1);
      g.addColorStop(0, '#ffffff');
      g.addColorStop(0.18, hexA('#e0faff', 0.96));
      g.addColorStop(0.4, hexA(w.primary, 0.85 * pulse));
      g.addColorStop(0.7, hexA('#2563eb', 0.38));
      g.addColorStop(1, hexA('#1d4ed8', 0));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, r * 3.1, 0, TAU);
      ctx.fill();

      // 3. Iconic Predator 6-point Anamorphic Plasma Star-Flare
      const spikeL = 48 * pulse;
      ctx.fillStyle = hexA('#ffffff', 0.92);
      // Horizontal & vertical main spikes
      ctx.beginPath();
      ctx.ellipse(0, 0, spikeL * 1.35, 3.2, 0, 0, TAU);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(0, 0, 3.0, spikeL * 0.95, 0, 0, TAU);
      ctx.fill();
      // Diagonal X-spikes
      for (const angOff of [0.68, -0.68]) {
        ctx.save();
        ctx.rotate(angOff + Math.sin(t * 14) * 0.08);
        ctx.fillStyle = hexA(w.primary, 0.85);
        ctx.beginPath();
        ctx.ellipse(0, 0, spikeL * 0.82, 2.2, 0, 0, TAU);
        ctx.fill();
        ctx.restore();
      }

      // 4. Crackling blue-white plasma arcs dancing around the core
      for (let i = 0; i < 4; i++) {
        const a = t * 18 + (i * TAU) / 4;
        ctx.strokeStyle = i % 2 === 0 ? '#ffffff' : w.primary;
        ctx.lineWidth = i % 2 === 0 ? 1.8 : 2.8;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * 5, Math.sin(a) * 5);
        ctx.lineTo(
          Math.cos(a + 0.45) * 16 + rand(-3, 3),
          Math.sin(a + 0.45) * 16 + rand(-3, 3),
        );
        ctx.lineTo(Math.cos(a + 0.9) * 24, Math.sin(a + 0.9) * 24);
        ctx.stroke();
      }

      // 5. Blinding white-hot plasma core
      ctx.globalCompositeOperation = 'source-over';
      const coreG = ctx.createRadialGradient(-2, -2, 1, 0, 0, 13);
      coreG.addColorStop(0, '#ffffff');
      coreG.addColorStop(0.65, '#e0faff');
      coreG.addColorStop(1, hexA(w.primary, 0.9));
      ctx.fillStyle = coreG;
      ctx.beginPath();
      ctx.arc(0, 0, 12.5 * pulse, 0, TAU);
      ctx.fill();
      break;
    }
    case 'disc': {
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 54);
      g.addColorStop(0, hexA('#ffffff', 0.85));
      g.addColorStop(0.3, hexA(w.primary, 0.6));
      g.addColorStop(1, hexA(w.primary, 0));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, 54, 0, TAU);
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
      ctx.save();
      ctx.scale(0.42, 0.42);
      ctx.rotate(t * 26);
      const sg = ctx.createLinearGradient(-46, -46, 46, 46);
      sg.addColorStop(0, '#f2f6fa');
      sg.addColorStop(0.5, '#9aa4b0');
      sg.addColorStop(1, '#39404a');
      ctx.fillStyle = sg;
      ctx.beginPath();
      ctx.arc(0, 0, 46, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#08161f';
      ctx.beginPath();
      ctx.arc(0, 0, 30, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = w.primary;
      ctx.lineWidth = 4;
      ctx.shadowColor = w.primary;
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.arc(0, 0, 28, 0, TAU);
      ctx.stroke();
      ctx.strokeStyle = hexA('#eafeff', 0.9);
      ctx.lineWidth = 5;
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * TAU;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * 6, Math.sin(a) * 6);
        ctx.lineTo(Math.cos(a) * 24, Math.sin(a) * 24);
        ctx.stroke();
      }
      ctx.shadowBlur = 0;
      ctx.restore();
      break;
    }
  }
  ctx.restore();
}

/* ------------------------------------------------------------ MUZZLE FX */
/**
 * Cinematic multi-layer muzzle blast:
 *  1. white-hot plasma core      (flash particle)
 *  2. radial star spikes          (spike particles, gas escaping the crown)
 *  3. forward pressure cone       (fast tapered streaks)
 *  4. expanding vapour ring       (ring particle)
 *  5. burning powder + embers     (ember / flame)
 *  6. rolling gun-smoke           (lit volumetric smoke)
 *  7. ejected brass               (casing)
 */
export function muzzleFX(ps: Particles, w: WeaponDef, x: number, y: number, ang: number, power = 1) {
  const ca = Math.cos(ang);
  const sa = Math.sin(ang);
  const px = (d: number, o = 0) => x + ca * d - sa * o;
  const py = (d: number, o = 0) => y + sa * d + ca * o;

  /* ---- bow: no combustion, just string snap + air turbulence */
  if (w.id === 'bow') {
    ps.spawn({ kind: 'ring', x, y, size: 8, size2: 34, life: 0.3, max: 0.3, color: '#bfe9ff', data: 2.5 });
    for (let i = 0; i < 9; i++) {
      const a = rand(0, TAU);
      ps.spawn({
        kind: 'mote',
        x: x + Math.cos(a) * rand(4, 26),
        y: y + Math.sin(a) * rand(4, 26),
        vx: rand(-70, 70),
        vy: rand(-70, 70),
        size: rand(4, 10),
        life: rand(0.35, 0.7),
        max: 0.7,
        color: '#cfe6f5',
        add: false,
      });
    }
    for (let i = 0; i < 4; i++)
      ps.spawn({ kind: 'streak', x, y, rot: rand(0, TAU), size: rand(20, 46), size2: 1.6, life: 0.2, max: 0.2, color: '#dfefff' });
    return;
  }
  if (w.id === 'sword') return; // handled by the engine

  /* ---- railgun: discard the sabot petals + EM backblast ---- */
  if (w.id === 'railgun') {
    ps.spawn({ kind: 'flash', x: px(14), y: py(14), size: 96, life: 0.11, max: 0.11, color: w.primary });
    ps.spawn({ kind: 'flash', x: px(4), y: py(4), size: 58, life: 0.2, max: 0.2, color: w.secondary });
    // the three separating petals, thrown sideways and back
    for (const d of [-1, 0, 1]) {
      ps.spawn({
        kind: 'shard',
        x: px(30),
        y: py(d * 6),
        vx: -Math.cos(ang) * rand(120, 300) - sa * d * rand(420, 700),
        vy: Math.sin(ang) * rand(60, 160) + ca * d * rand(420, 700) - 40,
        rot: rand(0, TAU),
        vrot: rand(-26, 26),
        life: rand(0.7, 1.3),
        max: 1.3,
        size: rand(5, 9),
        size2: rand(3, 6),
        color: '#b9c4d0',
        grav: 900,
        add: false,
      });
    }
    // ionised rail wash
    for (let i = 0; i < 22; i++) {
      const a = ang + rand(-0.3, 0.3);
      const sp = rand(900, 2400);
      ps.spawn({
        kind: 'spark',
        x: px(8),
        y: py(8),
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life: rand(0.06, 0.16),
        max: 0.16,
        size: rand(20, 44),
        size2: rand(1.6, 3),
        color: i % 3 ? w.primary : '#ffffff',
        drag: 0.9,
      });
    }
    for (let i = 0; i < 6; i++)
      ps.spawn({
        kind: 'bolt',
        x: px(6),
        y: py(rand(-8, 8)),
        rot: ang + rand(-1.2, 1.2),
        size: rand(20, 48),
        size2: 2.4,
        life: 0.13,
        max: 0.13,
        color: w.primary,
      });
    ps.spawn({ kind: 'ring', x: px(20), y: py(20), size: 8, size2: 190, life: 0.4, max: 0.4, color: '#ffffff', data: 7 });
    for (let i = 0; i < 10; i++)
      ps.spawn({
        kind: 'smoke',
        x: px(rand(10, 70)),
        y: py(rand(10, 70), rand(-16, 16)),
        vx: Math.cos(ang) * rand(80, 340),
        vy: Math.sin(ang) * rand(60, 260) + rand(-40, -10),
        size: rand(16, 34),
        data: 2.6,
        life: rand(0.8, 1.8),
        max: 1.8,
        color: '#8e9aa6',
        color2: '#dfeeff',
        add: false,
        drag: 0.94,
      });
    return;
  }

  /* ---- singularity: the containment field snaps open ---- */
  if (w.id === 'singularity') {
    ps.spawn({ kind: 'voidhole', x: px(18), y: py(18), size: 34, life: 0.4, max: 0.4, color: w.primary, color2: w.secondary, rot: 0.3, add: true });
    ps.spawn({ kind: 'flash', x: px(10), y: py(10), size: 110, life: 0.12, max: 0.12, color: w.secondary });
    // inruling dust — space folding toward the muzzle
    for (let i = 0; i < 26; i++) {
      const a = rand(0, TAU);
      const d = rand(90, 260);
      ps.spawn({
        kind: 'streak',
        x: px(10) + Math.cos(a) * d,
        y: py(10) + Math.sin(a) * d,
        vx: -Math.cos(a) * rand(500, 1300),
        vy: -Math.sin(a) * rand(500, 1300),
        rot: a + Math.PI,
        size: rand(22, 56),
        size2: rand(1, 2.2),
        life: rand(0.14, 0.3),
        max: 0.3,
        color: i % 3 ? w.secondary : '#ffffff',
        drag: 0.99,
      });
    }
    ps.spawn({ kind: 'ring', x: px(14), y: py(14), size: 10, size2: 130, life: 0.45, max: 0.45, color: w.primary, data: 8 });
    ps.spawn({ kind: 'ring', x: px(14), y: py(14), size: 6, size2: 78, life: 0.3, max: 0.3, color: '#ffffff', data: 5 });
    for (let i = 0; i < 16; i++)
      ps.spawn({
        kind: 'glow',
        x: px(10) + rand(-40, 40),
        y: py(10) + rand(-40, 40),
        vx: rand(-320, 320),
        vy: rand(-320, 320),
        life: rand(0.2, 0.5),
        max: 0.5,
        size: rand(7, 17),
        color: i % 2 ? w.primary : w.secondary,
      });
    for (let i = 0; i < 7; i++)
      ps.spawn({
        kind: 'smoke',
        x: px(rand(8, 50)),
        y: py(rand(8, 50), rand(-16, 16)),
        vx: rand(-200, 200),
        vy: rand(-160, 200),
        size: rand(18, 38),
        data: 2.8,
        life: rand(0.9, 1.9),
        max: 1.9,
        color: '#5b3f8f',
        color2: '#e9d5ff',
        add: false,
        drag: 0.95,
      });
    return;
  }

  /* ---- tesla: prong arc flash, no combustion ---- */
  if (w.id === 'tesla') {
    ps.spawn({ kind: 'flash', x: px(16), y: py(16), size: 66, life: 0.1, max: 0.1, color: '#ffffff' });
    for (let i = 0; i < 4; i++)
      ps.spawn({
        kind: 'arcweb',
        x: px(20),
        y: py(20),
        rot: ang + rand(-0.6, 0.6),
        size: rand(40, 86),
        size2: rand(1.6, 2.6),
        data: randInt(3, 5),
        life: rand(0.12, 0.24),
        max: 0.24,
        color: i % 2 ? w.primary : '#ffffff',
      });
    for (let i = 0; i < 10; i++) {
      const a = ang + rand(-0.9, 0.9);
      ps.spawn({
        kind: 'spark',
        x: px(14),
        y: py(14),
        vx: Math.cos(a) * rand(400, 1200),
        vy: Math.sin(a) * rand(400, 1200),
        life: rand(0.08, 0.2),
        max: 0.2,
        size: rand(12, 26),
        size2: rand(1.4, 2.6),
        color: i % 2 ? w.primary : '#ffffff',
        drag: 0.9,
      });
    }
    for (let i = 0; i < 3; i++)
      ps.spawn({
        kind: 'smoke',
        x: px(rand(10, 40)),
        y: py(rand(10, 40), rand(-12, 12)),
        vx: Math.cos(ang) * rand(60, 200),
        vy: Math.sin(ang) * rand(50, 160) - 30,
        size: rand(12, 24),
        data: 2.2,
        life: rand(0.7, 1.4),
        max: 1.4,
        color: '#5d7a88',
        color2: '#d6f6ff',
        add: false,
        drag: 0.95,
      });
    return;
  }

  /* ---- prismatic lance: a white lance leaves the prism array ---- */
  if (w.id === 'prism') {
    ps.spawn({ kind: 'flash', x: px(18), y: py(18), size: 84, life: 0.11, max: 0.11, color: '#ffffff' });
    for (let k = 0; k < 7; k++) {
      const a = ang + (k - 3) * 0.16;
      ps.spawn({
        kind: 'streak',
        x: px(14),
        y: py(14),
        vx: Math.cos(a) * rand(700, 1500),
        vy: Math.sin(a) * rand(700, 1500),
        rot: a,
        size: rand(70, 170),
        size2: rand(2, 3.8),
        life: rand(0.2, 0.38),
        max: 0.38,
        color: SPECTRUM[k],
        drag: 0.975,
      });
    }
    for (let i = 0; i < 14; i++) {
      const a = rand(0, TAU);
      ps.spawn({
        kind: 'crystal',
        x: px(10),
        y: py(10),
        vx: Math.cos(a) * rand(200, 800),
        vy: Math.sin(a) * rand(200, 800),
        rot: a,
        vrot: rand(-16, 16),
        life: rand(0.24, 0.6),
        max: 0.6,
        size: rand(1.6, 3.6),
        color: SPECTRUM[i % 7],
        color2: '#ffffff',
        drag: 0.97,
      });
    }
    ps.spawn({ kind: 'ring', x: px(20), y: py(20), size: 8, size2: 140, life: 0.34, max: 0.34, color: '#ffffff', data: 6 });
    return;
  }

  /* ---- nanite hive: the canister launches in a cloud of spores ---- */
  if (w.id === 'nanite') {
    ps.spawn({ kind: 'flash', x: px(14), y: py(14), size: 70, life: 0.1, max: 0.1, color: w.secondary });
    for (let i = 0; i < 22; i++) {
      const a = ang + rand(-0.5, 0.5);
      ps.spawn({
        kind: 'nano',
        x: px(10),
        y: py(10),
        vx: Math.cos(a) * rand(300, 1100),
        vy: Math.sin(a) * rand(300, 1100),
        life: rand(0.2, 0.55),
        max: 0.55,
        size: rand(0.9, 2),
        color: i % 3 ? w.primary : '#eaffd6',
        drag: 0.94,
      });
    }
    for (let i = 0; i < 7; i++)
      ps.spawn({
        kind: 'smoke',
        x: px(rand(8, 46)),
        y: py(rand(8, 46), rand(-14, 14)),
        vx: Math.cos(ang) * rand(60, 260),
        vy: Math.sin(ang) * rand(50, 200) + rand(-40, -10),
        size: rand(14, 30),
        data: 2.5,
        life: rand(0.7, 1.6),
        max: 1.6,
        color: '#3f5c2c',
        color2: '#d6ffb0',
        add: false,
        drag: 0.94,
      });
    return;
  }

  /* ---- chrono disruptor: a bubble of dilated time escapes ---- */
  if (w.id === 'chrono') {
    ps.spawn({ kind: 'flash', x: px(20), y: py(20), size: 76, life: 0.12, max: 0.12, color: '#ffffff' });
    ps.spawn({ kind: 'tickring', x: px(20), y: py(20), size: 6, size2: 90, life: 0.45, max: 0.45, color: w.primary, color2: w.secondary, data: 14, rot: 0 });
    for (let i = 0; i < 16; i++) {
      const a = rand(0, TAU);
      ps.spawn({
        kind: 'crystal',
        x: px(12),
        y: py(12),
        vx: Math.cos(a) * rand(180, 760),
        vy: Math.sin(a) * rand(180, 760),
        rot: a,
        vrot: rand(-14, 14),
        life: rand(0.24, 0.6),
        max: 0.6,
        size: rand(1.6, 3.4),
        color: i % 2 ? w.primary : w.secondary,
        color2: '#ffffff',
        drag: 0.975,
      });
    }
    for (let i = 0; i < 12; i++) {
      const a = ang + rand(-0.7, 0.7);
      ps.spawn({
        kind: 'ember',
        x: px(14),
        y: py(14),
        vx: Math.cos(a) * rand(200, 800),
        vy: Math.sin(a) * rand(200, 800),
        life: rand(0.3, 0.8),
        max: 0.8,
        size: rand(1, 2.2),
        color: i % 2 ? w.primary : w.secondary,
        grav: 120,
        drag: 0.97,
      });
    }
    return;
  }

  /* ---- cryo: no explosion, just a bloom of freezing mist + flakes ---- */
  if (w.id === 'cryo') {
    ps.spawn({ kind: 'flash', x: px(16), y: py(16), size: 58, life: 0.1, max: 0.1, color: '#ffffff' });
    for (let i = 0; i < 8; i++) {
      ps.spawn({
        kind: 'snowflake',
        x: px(rand(10, 46), rand(-14, 14)),
        y: py(rand(10, 46), rand(-14, 14)),
        vx: Math.cos(ang) * rand(120, 480) + rand(-90, 90),
        vy: Math.sin(ang) * rand(120, 420) + rand(-70, 70),
        rot: rand(0, TAU),
        vrot: rand(-3, 3),
        size: rand(2.4, 5.6),
        color: i % 2 ? w.primary : '#ffffff',
        color2: '#3f7fd6',
        life: rand(0.3, 0.85),
        max: 0.85,
        add: true,
      });
    }
    for (let i = 0; i < 9; i++)
      ps.spawn({
        kind: 'frost',
        x: px(rand(6, 48), rand(-14, 14)),
        y: py(rand(6, 48), rand(-14, 14)),
        vx: Math.cos(ang) * rand(70, 300),
        vy: Math.sin(ang) * rand(60, 240) + rand(-50, -10),
        size: rand(14, 30),
        data: 2.6,
        life: rand(0.6, 1.4),
        max: 1.4,
        color: '#cbe9ff',
        drag: 0.95,
        add: false,
        rot: rand(0, TAU),
      });
    for (let i = 0; i < 6; i++) {
      const a = ang + rand(-0.4, 0.4);
      ps.spawn({
        kind: 'spark',
        x: px(10),
        y: py(10),
        vx: Math.cos(a) * rand(300, 900),
        vy: Math.sin(a) * rand(300, 800),
        life: rand(0.08, 0.2),
        max: 0.2,
        size: rand(10, 22),
        size2: rand(1.2, 2.4),
        color: i % 2 ? w.primary : '#ffffff',
        drag: 0.92,
      });
    }
    return;
  }

  /* ---- sonic: three stacked pressure fronts leave the horn ---- */
  if (w.id === 'sonic') {
    ps.spawn({ kind: 'flash', x: px(20), y: py(20), size: 78, life: 0.1, max: 0.1, color: '#ffffff' });
    for (let k = 0; k < 4; k++) {
      ps.spawn({
        kind: 'wavefront',
        x: px(14 + k * 12),
        y: py(14 + k * 12),
        rot: ang + rand(-0.24, 0.24),
        size: 6 + k * 4,
        size2: rand(70, 130),
        life: rand(0.28, 0.46),
        max: 0.46,
        color: k % 2 ? w.secondary : w.primary,
        color2: '#ffffff',
        data: rand(1.8, 2.6),
      });
    }
    // dust shaken off the muzzle
    for (let i = 0; i < 18; i++) {
      const a = ang + rand(-0.7, 0.7);
      ps.spawn({
        kind: 'ember',
        x: px(12),
        y: py(12),
        vx: Math.cos(a) * rand(200, 900),
        vy: Math.sin(a) * rand(200, 800),
        life: rand(0.16, 0.42),
        max: 0.42,
        size: rand(0.9, 2.2),
        color: i % 3 ? w.secondary : '#ffffff',
        grav: 320,
        drag: 0.95,
      });
    }
    // heat shimmer from the compression
    for (let i = 0; i < 4; i++)
      ps.spawn({
        kind: 'smoke',
        x: px(rand(10, 40)),
        y: py(rand(10, 40), rand(-16, 16)),
        vx: Math.cos(ang) * rand(70, 260),
        vy: Math.sin(ang) * rand(60, 200) - 20,
        size: rand(14, 28),
        data: 2.4,
        life: rand(0.6, 1.3),
        max: 1.3,
        color: '#7a5c3a',
        color2: '#ffe8bd',
        add: false,
        drag: 0.95,
      });
    return;
  }

  /* ---- quantum: the aperture vents three phase echoes ---- */
  if (w.id === 'quantum') {
    ps.spawn({ kind: 'flash', x: px(18), y: py(18), size: 72, life: 0.11, max: 0.11, color: '#ffffff' });
    for (let k = 0; k < 3; k++) {
      const a = ang + rand(-0.3, 0.3);
      ps.spawn({
        kind: 'ghost',
        x: px(20 + k * 8),
        y: py(20 + k * 8),
        vx: Math.cos(a) * rand(240, 620),
        vy: Math.sin(a) * rand(240, 560),
        rot: rand(0, TAU),
        size: rand(8, 17),
        color: k === 1 ? w.secondary : w.primary,
        data: 1,
        life: rand(0.22, 0.44),
        max: 0.44,
      });
    }
    for (let k = 0; k < 14; k++) {
      const a = rand(0, TAU);
      ps.spawn({
        kind: 'glow',
        x: px(12),
        y: py(12),
        vx: Math.cos(a) * rand(140, 620),
        vy: Math.sin(a) * rand(140, 560),
        life: rand(0.16, 0.4),
        max: 0.4,
        size: rand(5, 13),
        color: k % 3 === 0 ? w.secondary : k % 3 === 1 ? w.primary : '#ffffff',
      });
    }
    ps.spawn({ kind: 'wavefront', x: px(18), y: py(18), rot: ang, size: 8, size2: 110, life: 0.34, max: 0.34, color: w.primary, color2: w.secondary, data: 2.2 });
    return;
  }

  /* ---- xenomorph: pressurised acid jet with sputtering globs ---- */
  if (w.id === 'acid') {
    ps.spawn({ kind: 'flash', x: px(14), y: py(14), size: 46, life: 0.09, max: 0.09, color: '#f4ffd0' });
    for (let i = 0; i < 14; i++) {
      const a = ang + rand(-0.34, 0.34);
      const sp = rand(500, 1500);
      ps.spawn({
        kind: 'acid',
        x: px(14),
        y: py(14),
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp + rand(-60, 60),
        life: rand(0.18, 0.44),
        max: 0.44,
        size: rand(1.6, 4),
        color: i % 3 === 0 ? w.secondary : w.primary,
        color2: '#4a8a0a',
        grav: 700,
        drag: 0.97,
      });
    }
    for (let i = 0; i < 7; i++)
      ps.spawn({
        kind: 'bubble',
        x: px(rand(8, 44), rand(-12, 12)),
        y: py(rand(8, 44), rand(-12, 12)),
        vx: Math.cos(ang) * rand(60, 260),
        vy: Math.sin(ang) * rand(50, 200) + rand(-70, -20),
        life: rand(0.3, 0.8),
        max: 0.8,
        size: rand(2.4, 5.6),
        color: w.primary,
        color2: '#f0ffcd',
        drag: 0.95,
      });
    for (let i = 0; i < 3; i++)
      ps.spawn({
        kind: 'smoke',
        x: px(rand(10, 36)),
        y: py(rand(10, 36), rand(-12, 12)),
        vx: Math.cos(ang) * rand(50, 190),
        vy: Math.sin(ang) * rand(40, 150) - 40,
        size: rand(12, 26),
        data: 2.6,
        life: rand(0.7, 1.4),
        max: 1.4,
        color: '#3f5c14',
        color2: '#d9ff9e',
        add: false,
        drag: 0.95,
      });
    return;
  }

  /* ---- mega buster: a hard bright snap, no smoke ---- */
  if (w.id === 'buster') {
    const big = power > 1.3;
    ps.spawn({ kind: 'flash', x: px(12), y: py(12), size: big ? 96 : 46, life: big ? 0.12 : 0.08, max: big ? 0.12 : 0.08, color: '#ffffff' });
    const spikes = big ? 6 : 4;
    for (let i = 0; i < spikes; i++) {
      ps.spawn({
        kind: 'spike',
        x: px(8),
        y: py(8),
        rot: ang + rand(-0.5, 0.5),
        size: (big ? 70 : 34) * rand(0.75, 1.2),
        size2: big ? rand(4, 7) : rand(2.4, 4),
        life: rand(0.08, 0.16),
        max: 0.16,
        color: big && i % 2 ? '#ffffff' : w.primary,
      });
    }
    for (let i = 0; i < (big ? 18 : 8); i++) {
      const a = ang + rand(-0.4, 0.4);
      ps.spawn({
        kind: 'spark',
        x: px(10),
        y: py(10),
        vx: Math.cos(a) * rand(500, big ? 1500 : 1100),
        vy: Math.sin(a) * rand(400, big ? 1200 : 900),
        life: rand(0.08, 0.2),
        max: 0.2,
        size: rand(12, 28),
        size2: rand(1.6, 3),
        color: i % 3 ? w.primary : '#ffffff',
        drag: 0.9,
      });
    }
    ps.spawn({ kind: 'ring', x: px(14), y: py(14), size: 6, size2: big ? 130 : 62, life: 0.24, max: 0.24, color: '#ffffff', data: big ? 6 : 3.4 });
    return;
  }

  /* ---- Predator Shoulder Caster: high-energy blue-white plasma discharge ---- */
  if (w.id === 'caster') {
    ps.spawn({ kind: 'flash', x: px(14), y: py(14), size: 115, life: 0.14, max: 0.14, color: '#ffffff' });
    ps.spawn({ kind: 'flash', x: px(6), y: py(6), size: 78, life: 0.22, max: 0.22, color: w.primary });
    ps.spawn({ kind: 'glow', x: px(8), y: py(8), size: 62, life: 0.3, max: 0.3, color: '#38bdf8' });

    // 8-point blue-white plasma star flare at the barrel mouth
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU + rand(-0.08, 0.08);
      const major = i % 2 === 0;
      ps.spawn({
        kind: 'spike',
        x: px(10),
        y: py(10),
        rot: a,
        size: major ? rand(76, 128) : rand(42, 72),
        size2: major ? rand(5, 8) : rand(3, 5),
        life: rand(0.1, 0.2),
        max: 0.2,
        color: major ? '#ffffff' : w.primary,
      });
    }

    // Twin magnetic containment rings
    ps.spawn({ kind: 'ring', x: px(16), y: py(16), size: 8, size2: 148, life: 0.34, max: 0.34, color: '#ffffff', data: 6 });
    ps.spawn({ kind: 'ring', x: px(12), y: py(12), size: 6, size2: 96, life: 0.26, max: 0.26, color: w.primary, data: 4 });

    // Crackling plasma arcs around the barrel shroud
    for (let i = 0; i < 5; i++) {
      ps.spawn({
        kind: 'bolt',
        x: px(10),
        y: py(10),
        rot: ang + rand(-1.1, 1.1),
        size: rand(32, 68),
        size2: 2.8,
        life: 0.16,
        max: 0.16,
        color: i % 2 === 0 ? '#ffffff' : w.primary,
      });
    }

    // Forward jet of white-hot & cyan-blue plasma sparks
    for (let i = 0; i < 22; i++) {
      const a = ang + rand(-0.45, 0.45);
      const sp = rand(520, 1650);
      ps.spawn({
        kind: 'spark',
        x: px(12),
        y: py(12),
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life: rand(0.12, 0.26),
        max: 0.26,
        size: rand(18, 38),
        size2: rand(2, 3.6),
        color: i % 3 === 0 ? '#ffffff' : w.primary,
        drag: 0.88,
      });
    }

    // Ionized plasma vapour
    for (let i = 0; i < 7; i++) {
      ps.spawn({
        kind: 'smoke',
        x: px(rand(8, 48), rand(-14, 14)),
        y: py(rand(8, 48), rand(-14, 14)),
        vx: Math.cos(ang) * rand(70, 260),
        vy: Math.sin(ang) * rand(50, 200) - 35,
        size: rand(16, 32),
        data: 2.4,
        life: rand(0.7, 1.5),
        max: 1.5,
        color: '#476b87',
        color2: '#e0faff',
        add: false,
        drag: 0.94,
      });
    }
    return;
  }

  const energy = w.proj === 'plasma' || w.impact === 'laser' || w.impact === 'proton';
  const big = w.id === 'dragon' ? 2.5 : w.id === 'sniper' ? 2.3 : w.id === 'caster' ? 2.1 : power;
  const L = 1.15 * big;

  /* 1 — core */
  ps.spawn({ kind: 'flash', x: px(12 * L), y: py(12 * L), size: 52 * L, life: 0.1, max: 0.1, color: w.primary });
  ps.spawn({ kind: 'glow', x: px(4), y: py(4), size: 34 * L, life: 0.24, max: 0.24, color: w.primary });

  /* 2 — crown spikes (bright star) */
  const spikes = Math.round(5 + big * 3);
  for (let i = 0; i < spikes; i++) {
    const a = i % 2 === 0 ? ang + rand(-0.5, 0.5) : rand(0, TAU);
    const len = rand(34, 96) * (i % 2 === 0 ? big : big * 0.55);
    ps.spawn({
      kind: 'spike',
      x: px(6),
      y: py(6),
      rot: a,
      size: len,
      size2: rand(3.5, 7) * big,
      life: rand(0.07, 0.15),
      max: 0.15,
      color: i % 2 === 0 ? w.primary : w.secondary,
    });
  }

  /* 3 — forward pressure cone */
  const jets = Math.round(7 * big);
  for (let i = 0; i < jets; i++) {
    const a = ang + rand(-0.42, 0.42) * (w.pellets > 1 ? 2.2 : 1);
    const sp = rand(420, 1350) * big;
    ps.spawn({
      kind: 'spark',
      x: px(10),
      y: py(10),
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp,
      life: rand(0.08, 0.2),
      max: 0.2,
      size: rand(16, 34) * big,
      size2: rand(2, 3.6),
      color: energy ? w.secondary : w.primary,
      drag: 0.84,
    });
  }

  /* 4 — vapour ring / shock collar */
  ps.spawn({ kind: 'ring', x: px(16 * L), y: py(16 * L), size: 6, size2: 74 * L, life: 0.3, max: 0.3, color: w.secondary, data: 3.5 });

  /* 5 — burning powder */
  if (!energy) {
    const em = w.id === 'dragon' ? 34 : 12;
    for (let i = 0; i < em; i++) {
      const a = ang + rand(-0.5, 0.5) * (w.pellets > 1 ? 2.6 : 1);
      const sp = rand(300, 1500) * big * 0.8;
      ps.spawn({
        kind: 'ember',
        x: px(22),
        y: py(12),
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp + rand(-140, 140),
        life: rand(0.25, 0.95),
        max: 0.95,
        size: rand(1.4, 3.6),
        color: pick2(['#ffe9a0', '#ffb03a', '#ff7a18', '#ff4a10']),
        grav: 300,
        drag: 0.955,
      });
    }
  } else {
    for (let i = 0; i < 8; i++)
      ps.spawn({
        kind: 'bolt',
        x: px(12),
        y: py(12),
        rot: ang + rand(-0.8, 0.8),
        size: rand(24, 56),
        size2: 2.6,
        life: 0.15,
        max: 0.15,
        color: w.secondary,
      });
  }

  /* 6 — rolling smoke, lit by the flash */
  const smokeN = energy ? 5 : w.id === 'dragon' ? 16 : 8;
  const smokeCol = energy ? '#9fd8ef' : w.impact === 'fire' ? '#33281f' : '#8e9aa6';
  const smokeRim = energy ? '#e8fbff' : w.impact === 'fire' ? '#ff9b4a' : '#ffe1a8';
  for (let i = 0; i < smokeN; i++) {
    ps.spawn({
      kind: 'smoke',
      x: px(rand(6, 46 * big), rand(-14, 14)),
      y: py(rand(6, 46 * big), rand(-14, 14)),
      vx: Math.cos(ang) * rand(50, 300) * big * 0.7 - sa * rand(-30, 30),
      vy: Math.sin(ang) * rand(50, 260) * big * 0.7 + rand(-50, -12),
      size: rand(14, 30) * big,
      data: 2.4,
      life: rand(0.7, 1.7),
      max: 1.7,
      color: smokeCol,
      color2: smokeRim,
      add: false,
      drag: 0.93,
      rot: rand(0, TAU),
      vrot: rand(-1.2, 1.2),
    });
  }

  /* 7 — brass */
  if (w.proj === 'bullet' || w.proj === 'smg' || w.proj === 'pistol') {
    const n = w.id === 'ak' ? 1 : 1;
    for (let i = 0; i < n; i++)
      ps.spawn({
        kind: 'casing',
        x: px(-56, 8),
        y: py(-56, 8),
        vx: -Math.cos(ang) * rand(70, 170) - sa * 200,
        vy: Math.sin(ang) * rand(20, 60) - 300,
        rot: rand(0, TAU),
        vrot: rand(-22, 22),
        life: 3,
        max: 3,
        size: w.proj === 'bullet' ? 1.05 : 0.85,
        grav: 1000,
        drag: 0.996,
        add: false,
      });
  }
}

function pick2(c: string[]) {
  return c[Math.floor(Math.random() * c.length)];
}

/* ------------------------------------------------------------ IMPACT FX */
export function impactFX(
  ps: Particles,
  w: WeaponDef,
  x: number,
  y: number,
  ang: number,
  scale = 1,
) {
  const back = ang + Math.PI; // reflect direction
  const ca = Math.cos(back);
  const sa = Math.sin(back);
  const kind = w.impact;

  const sparks = (n: number, color: string, sp = 700, life = 0.4) => {
    for (let i = 0; i < n; i++) {
      const fwd = i % 3 === 0;
      const a = fwd ? ang + rand(-0.75, 0.75) : back + rand(-1.45, 1.45);
      const s = rand(sp * 0.35, sp) * (fwd ? 0.55 : 1);
      ps.spawn({
        kind: 'spark',
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life: rand(life * 0.4, life),
        max: life,
        size: rand(8, 22),
        size2: rand(1.6, 3.2),
        color,
        grav: 520,
        drag: 0.94,
      });
    }
  };
  const flash = (r: number, color: string, life = 0.12) =>
    ps.spawn({ kind: 'flash', x, y, size: r, life, max: life, color });
  const ring = (r: number, color: string, life = 0.35, lw = 4) =>
    ps.spawn({ kind: 'ring', x, y, size: r * 0.25, size2: r, life, max: life, color, data: lw });

  switch (kind) {
    case 'arrow': {
      flash(26, '#e7d3a8', 0.1);
      ring(34, '#f0e2c0', 0.26, 3);
      sparks(8, '#d8c49a', 380, 0.4);
      for (let i = 0; i < 8; i++) {
        ps.spawn({
          kind: 'debris',
          x,
          y,
          vx: ca * rand(60, 300) + rand(-90, 90),
          vy: sa * rand(60, 300) - rand(20, 160),
          rot: rand(0, TAU),
          vrot: rand(-14, 14),
          life: rand(0.5, 1.1),
          max: 1.1,
          size: rand(2, 4.5),
          color: '#c9a15c',
          grav: 800,
          add: false,
        });
      }
      for (let i = 0; i < 5; i++)
        ps.spawn({
          kind: 'smoke',
          x: x + rand(-8, 8),
          y: y + rand(-8, 8),
          vx: rand(-40, 40),
          vy: rand(-70, -20),
          size: rand(8, 16),
          life: 0.7,
          max: 0.7,
          color: '#d9cbb4',
          add: false,
        });
      break;
    }
    case 'metal': {
      flash(38 * scale, '#fff4d0', 0.1);
      ring(44 * scale, w.primary, 0.26, 3);
      sparks(Math.round(18 * scale), '#ffd27a', 950, 0.55);
      sparks(6, '#ffffff', 720, 0.3);
      // ricochet streaks flying off at grazing angles
      for (let i = 0; i < 3; i++) {
        const a = back + rand(-1.35, 1.35);
        const sp = rand(900, 1700);
        ps.spawn({
          kind: 'streak',
          x,
          y,
          vx: Math.cos(a) * sp,
          vy: Math.sin(a) * sp,
          rot: a,
          size: rand(26, 62),
          size2: rand(1.4, 2.6),
          life: rand(0.12, 0.26),
          max: 0.26,
          color: i === 0 ? '#ffffff' : '#ffd27a',
          grav: 500,
          drag: 0.985,
        });
      }
      // hot weld-glow that lingers on the plate
      ps.spawn({ kind: 'glow', x, y, size: 16 * scale, life: 0.5, max: 0.5, color: '#ff8a2a' });
      for (let i = 0; i < 4; i++)
        ps.spawn({
          kind: 'ember',
          x,
          y,
          vx: ca * rand(30, 200) + rand(-60, 60),
          vy: sa * rand(30, 200) - rand(10, 90),
          life: rand(0.5, 1.3),
          max: 1.3,
          size: rand(1, 2.4),
          color: '#ff9b2f',
          grav: 320,
          drag: 0.97,
        });
      for (let i = 0; i < 3; i++)
        ps.spawn({
          kind: 'smoke',
          x: x + rand(-6, 6),
          y: y + rand(-6, 6),
          vx: ca * rand(40, 120),
          vy: sa * rand(40, 120) - 40,
          size: rand(10, 20),
          life: 0.8,
          max: 0.8,
          color: '#7d8794',
          add: false,
        });
      break;
    }
    case 'plasma': {
      flash(50 * scale, w.primary, 0.14);
      ring(60 * scale, w.secondary, 0.32, 4);
      sparks(14, w.primary, 800, 0.45);
      for (let i = 0; i < 4; i++)
        ps.spawn({
          kind: 'bolt',
          x,
          y,
          rot: rand(0, TAU),
          size: rand(24, 54),
          size2: 3,
          life: 0.18,
          max: 0.18,
          color: w.secondary,
        });
      for (let i = 0; i < 4; i++)
        ps.spawn({
          kind: 'smoke',
          x: x + rand(-8, 8),
          y: y + rand(-8, 8),
          vx: rand(-60, 60),
          vy: rand(-90, -20),
          size: rand(10, 18),
          life: 0.7,
          max: 0.7,
          color: '#bfeaf5',
          add: false,
        });
      break;
    }
    case 'fire': {
      flash(60 * scale, '#ffb03a', 0.16);
      for (let i = 0; i < 16; i++) {
        const a = rand(0, TAU);
        const s = rand(60, 420);
        ps.spawn({
          kind: 'flame',
          x: x + rand(-6, 6),
          y: y + rand(-6, 6),
          vx: Math.cos(a) * s + ca * 120,
          vy: Math.sin(a) * s - 80,
          life: rand(0.25, 0.7),
          max: 0.7,
          size: rand(10, 26),
          color: pick2(['#ff7a18', '#ff3b12', '#ffd24a']),
          drag: 0.9,
          grav: -140,
        });
      }
      for (let i = 0; i < 18; i++) {
        const a = back + rand(-1.1, 1.1);
        const s = rand(200, 900);
        ps.spawn({
          kind: 'ember',
          x,
          y,
          vx: Math.cos(a) * s,
          vy: Math.sin(a) * s,
          life: rand(0.4, 1.2),
          max: 1.2,
          size: rand(1.6, 4),
          color: pick2(['#ffd24a', '#ff7a18', '#ff9b2f']),
          grav: 300,
          drag: 0.95,
        });
      }
      for (let i = 0; i < 6; i++)
        ps.spawn({
          kind: 'smoke',
          x: x + rand(-10, 10),
          y: y + rand(-10, 10),
          vx: rand(-50, 50),
          vy: rand(-120, -30),
          size: rand(16, 34),
          life: rand(0.9, 1.7),
          max: 1.7,
          color: '#26201d',
          add: false,
          drag: 0.97,
        });
      break;
    }
    case 'laser': {
      flash(84 * scale, '#ffffff', 0.14);
      flash(52 * scale, w.secondary, 0.26);
      ring(78 * scale, w.primary, 0.36, 5);
      ring(48 * scale, '#ffffff', 0.24, 3);
      // gold energy petals radiating (repulsor signature)
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * TAU + rand(-0.1, 0.1);
        ps.spawn({
          kind: 'spike',
          x,
          y,
          rot: a,
          size: rand(44, 92) * scale,
          size2: rand(3.4, 6.4),
          life: rand(0.12, 0.24),
          max: 0.24,
          color: k % 2 ? '#ffffff' : w.secondary,
        });
      }
      sparks(24, w.secondary, 1000, 0.5);
      sparks(9, '#ffffff', 760, 0.3);
      // lingering molten point where the beam drilled
      ps.spawn({ kind: 'glow', x, y, size: 20 * scale, life: 0.42, max: 0.42, color: '#ff9b2f' });
      for (let i = 0; i < 8; i++)
        ps.spawn({
          kind: 'glow',
          x: x + rand(-16, 16),
          y: y + rand(-16, 16),
          vx: rand(-190, 190),
          vy: rand(-190, 190),
          life: rand(0.2, 0.5),
          max: 0.5,
          size: rand(8, 18),
          color: i % 2 ? w.primary : '#ffffff',
        });
      // embers dripping from the cut
      for (let i = 0; i < 7; i++)
        ps.spawn({
          kind: 'ember',
          x,
          y,
          vx: rand(-140, 140),
          vy: rand(-120, 20),
          life: rand(0.5, 1.3),
          max: 1.3,
          size: rand(1, 2.4),
          color: '#ffb03a',
          grav: 460,
          drag: 0.98,
        });
      break;
    }
    case 'heavy': {
      /* ---- Predator Blue-White Plasma Detonation ---- */
      flash(148, '#ffffff', 0.18);
      flash(98, w.primary, 0.32);
      flash(64, '#2563eb', 0.45);

      // Triple expanding plasma shockwaves
      ring(115, '#ffffff', 0.42, 8);
      ring(195, w.primary, 0.65, 11);
      ring(285, '#3b82f6', 0.88, 5);

      // 8 radial blue-white plasma starburst spikes
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * TAU + rand(-0.08, 0.08);
        ps.spawn({
          kind: 'spike',
          x,
          y,
          rot: a,
          size: k % 2 === 0 ? rand(85, 145) : rand(48, 86),
          size2: rand(5, 9),
          life: rand(0.14, 0.28),
          max: 0.28,
          color: k % 2 === 0 ? '#ffffff' : w.primary,
        });
      }

      // Crawling blue-white plasma arc-webs & lightning bolts on the wheel
      for (let i = 0; i < 5; i++) {
        ps.spawn({
          kind: 'arcweb',
          x: x + rand(-14, 14),
          y: y + rand(-14, 14),
          rot: rand(0, TAU),
          size: rand(52, 108),
          size2: rand(1.6, 2.8),
          data: randInt(4, 6),
          life: rand(0.18, 0.36),
          max: 0.36,
          color: i % 2 === 0 ? '#ffffff' : w.primary,
        });
      }
      for (let i = 0; i < 6; i++) {
        ps.spawn({
          kind: 'bolt',
          x,
          y,
          rot: rand(0, TAU),
          size: rand(38, 84),
          size2: 3.2,
          life: 0.2,
          max: 0.2,
          color: '#e0faff',
        });
      }

      // High-velocity blue-white & cyan plasma spall
      sparks(42, w.primary, 1450, 0.72);
      sparks(22, '#ffffff', 1150, 0.52);

      // Glowing blue-white plasma embers
      for (let i = 0; i < 24; i++) {
        const a = rand(0, TAU);
        ps.spawn({
          kind: 'ember',
          x,
          y,
          vx: Math.cos(a) * rand(220, 980),
          vy: Math.sin(a) * rand(220, 980) - 80,
          life: rand(0.45, 1.3),
          max: 1.3,
          size: rand(1.6, 3.8),
          color: pick2(['#ffffff', '#e0faff', '#67e8f9', '#38bdf8']),
          grav: 360,
          drag: 0.96,
        });
      }

      // Sheared titanium & target armor shards
      for (let i = 0; i < 18; i++)
        ps.spawn({
          kind: 'shard',
          x,
          y,
          vx: rand(-580, 580),
          vy: rand(-620, -60),
          rot: rand(0, TAU),
          vrot: rand(-18, 18),
          life: rand(0.7, 1.5),
          max: 1.5,
          size: rand(4, 9),
          size2: rand(2.5, 6),
          color: i % 2 ? '#3b4452' : '#7c8796',
          grav: 900,
          add: false,
        });

      // Lingering white-hot plasma crater glow
      ps.spawn({ kind: 'glow', x, y, size: 46, life: 0.65, max: 0.65, color: w.primary });

      // Ionized blue-white plasma vapour clouds
      for (let i = 0; i < 12; i++)
        ps.spawn({
          kind: 'smoke',
          x: x + rand(-24, 24),
          y: y + rand(-24, 24),
          vx: rand(-180, 180),
          vy: rand(-200, -25),
          size: rand(22, 48),
          data: 2.6,
          life: rand(1.0, 2.1),
          max: 2.1,
          color: '#526f8a',
          color2: '#e0faff',
          add: false,
          drag: 0.95,
        });
      break;
    }
    case 'slash': {
      ps.spawn({ kind: 'slash', x, y, rot: back, size: 16, size2: 1.5, data: 74, life: 0.26, max: 0.26, color: w.primary });
      ps.spawn({ kind: 'slash', x, y, rot: back + 0.6, size: 10, size2: 1, data: 92, life: 0.34, max: 0.34, color: '#ffffff' });
      flash(56, w.primary, 0.14);
      sparks(20, '#9beaff', 950, 0.5);
      for (let i = 0; i < 5; i++)
        ps.spawn({
          kind: 'bolt',
          x,
          y,
          rot: rand(0, TAU),
          size: rand(26, 60),
          size2: 2.4,
          life: 0.16,
          max: 0.16,
          color: '#7de3ff',
        });
      break;
    }
    case 'proton': {
      flash(50, '#ffb03a', 0.14);
      ring(56, '#ff8a1e', 0.3, 4);
      sparks(16, '#ffd27a', 700, 0.55);
      for (let i = 0; i < 8; i++)
        ps.spawn({
          kind: 'glow',
          x: x + rand(-12, 12),
          y: y + rand(-12, 12),
          vx: rand(-220, 220),
          vy: rand(-220, 220),
          life: rand(0.2, 0.55),
          max: 0.55,
          size: rand(7, 16),
          color: pick2(['#ff8a1e', '#ffe6a8', '#ff3b12']),
        });
      for (let i = 0; i < 4; i++)
        ps.spawn({
          kind: 'smoke',
          x,
          y,
          vx: rand(-60, 60),
          vy: rand(-90, -20),
          size: rand(14, 26),
          life: 1,
          max: 1,
          color: '#5a5148',
          add: false,
        });
      break;
    }
    case 'prism': {
      /* ---- white light shatters into the full visible spectrum ---- */
      flash(110, '#ffffff', 0.14);
      flash(70, w.secondary, 0.28);
      ring(120, '#ffffff', 0.4, 7);
      ring(190, w.secondary, 0.6, 5);
      // each spectral component is ejected along its own angle
      for (let k = 0; k < 7; k++) {
        const a = back + (k - 3) * 0.3;
        const sp = rand(700, 1500);
        ps.spawn({
          kind: 'streak',
          x,
          y,
          vx: Math.cos(a) * sp,
          vy: Math.sin(a) * sp,
          rot: a,
          size: rand(60, 150),
          size2: rand(2.4, 4.4),
          life: rand(0.24, 0.44),
          max: 0.44,
          color: SPECTRUM[k],
          drag: 0.97,
        });
      }
      // chromatic crystal shards
      for (let i = 0; i < 22; i++) {
        const a = rand(0, TAU);
        const sp = rand(300, 1100);
        ps.spawn({
          kind: 'crystal',
          x,
          y,
          vx: Math.cos(a) * sp,
          vy: Math.sin(a) * sp,
          rot: a,
          vrot: rand(-14, 14),
          life: rand(0.4, 1),
          max: 1,
          size: rand(2, 5),
          color: SPECTRUM[i % 7],
          color2: '#ffffff',
          grav: 420,
          drag: 0.98,
        });
      }
      sparks(24, '#ffffff', 1200, 0.45);
      // prismatic smoke
      for (let i = 0; i < 9; i++)
        ps.spawn({
          kind: 'smoke',
          x: x + rand(-24, 24),
          y: y + rand(-24, 24),
          vx: rand(-200, 200),
          vy: rand(-200, 200),
          size: rand(20, 44),
          data: 2.7,
          life: rand(0.9, 1.9),
          max: 1.9,
          color: '#5d6a80',
          color2: '#e8f6ff',
          add: false,
          drag: 0.95,
        });
      break;
    }
    case 'nano': {
      /* ---- hive canister cracks open, the swarm gets out ---- */
      flash(74, '#ffffff', 0.1);
      flash(48, w.primary, 0.3);
      ring(70, w.primary, 0.32, 4);
      // hex shell fragments
      for (let i = 0; i < 10; i++) {
        const a = rand(0, TAU);
        ps.spawn({
          kind: 'shard',
          x,
          y,
          vx: Math.cos(a) * rand(200, 700),
          vy: Math.sin(a) * rand(200, 700) - 60,
          rot: rand(0, TAU),
          vrot: rand(-20, 20),
          life: rand(0.6, 1.3),
          max: 1.3,
          size: rand(3, 7),
          size2: rand(2.5, 5),
          color: i % 2 ? '#4a6b34' : '#a8d97f',
          grav: 880,
          add: false,
        });
      }
      // acid sparks
      sparks(26, w.primary, 950, 0.5);
      for (let i = 0; i < 16; i++) {
        const a = rand(0, TAU);
        ps.spawn({
          kind: 'nano',
          x,
          y,
          vx: Math.cos(a) * rand(120, 520),
          vy: Math.sin(a) * rand(120, 520),
          life: rand(0.5, 1.4),
          max: 1.4,
          size: rand(1, 2.2),
          color: i % 3 ? w.primary : '#eaffd6',
          drag: 0.95,
        });
      }
      // corrosive vapour
      for (let i = 0; i < 9; i++)
        ps.spawn({
          kind: 'smoke',
          x: x + rand(-18, 18),
          y: y + rand(-18, 18),
          vx: rand(-140, 140),
          vy: rand(-180, -30),
          size: rand(18, 40),
          data: 2.6,
          life: rand(1, 2),
          max: 2,
          color: '#3f5c2c',
          color2: '#d6ffb0',
          add: false,
          drag: 0.95,
        });
      break;
    }
    case 'chrono': {
      /* ---- the timeline cracks: everything stutters ---- */
      flash(96, '#ffffff', 0.16);
      flash(60, w.secondary, 0.34);
      // expanding second/minute rings
      ps.spawn({ kind: 'tickring', x, y, size: 14, size2: 130, life: 0.7, max: 0.7, color: w.primary, color2: '#ffffff', data: 12, rot: 0 });
      ps.spawn({ kind: 'tickring', x, y, size: 8, size2: 210, life: 0.95, max: 0.95, color: w.secondary, color2: w.primary, data: 20, rot: 0.4 });
      ps.spawn({ kind: 'tickring', x, y, size: 4, size2: 300, life: 1.2, max: 1.2, color: '#ffffff', color2: w.secondary, data: 30, rot: -0.6 });
      // golden + teal time crystals
      for (let i = 0; i < 26; i++) {
        const a = rand(0, TAU);
        const sp = rand(260, 1050);
        ps.spawn({
          kind: 'crystal',
          x,
          y,
          vx: Math.cos(a) * sp,
          vy: Math.sin(a) * sp,
          rot: a,
          vrot: rand(-12, 12),
          life: rand(0.5, 1.3),
          max: 1.3,
          size: rand(2, 6),
          color: i % 3 === 0 ? w.secondary : i % 3 === 1 ? w.primary : '#fff3c4',
          color2: '#ffffff',
          grav: 300,
          drag: 0.985,
        });
      }
      // chrono-sand
      for (let i = 0; i < 30; i++) {
        const a = rand(0, TAU);
        ps.spawn({
          kind: 'ember',
          x,
          y,
          vx: Math.cos(a) * rand(80, 620),
          vy: Math.sin(a) * rand(80, 620) - 40,
          life: rand(0.5, 1.5),
          max: 1.5,
          size: rand(1, 2.4),
          color: i % 2 ? w.primary : w.secondary,
          grav: 160,
          drag: 0.98,
        });
      }
      sparks(14, '#ffffff', 800, 0.4);
      // frozen dust hanging in warped time
      for (let i = 0; i < 12; i++)
        ps.spawn({
          kind: 'smoke',
          x: x + rand(-26, 26),
          y: y + rand(-26, 26),
          vx: rand(-90, 90),
          vy: rand(-90, 90),
          size: rand(20, 46),
          data: 2.4,
          life: rand(1.2, 2.4),
          max: 2.4,
          color: '#6a5a2e',
          color2: '#fff6d8',
          add: false,
          drag: 0.99,
        });
      break;
    }

    case 'freeze': {
      /* ---- crystallisation: the surface freezes instead of burning ---- */
      flash(74, '#ffffff', 0.12);
      flash(46, w.primary, 0.3);
      ring(66, w.secondary, 0.34, 4);
      // six-fold dendrites growing outward from the contact point
      for (let i = 0; i < 9; i++) {
        ps.spawn({
          kind: 'snowflake',
          x: x + rand(-16, 16),
          y: y + rand(-16, 16),
          rot: rand(0, TAU),
          size: rand(3.4, 8),
          color: w.primary,
          color2: '#3f7fd6',
          life: rand(0.5, 1.3),
          max: 1.3,
          add: true,
        });
      }
      // glittering shards ejected
      for (let i = 0; i < 24; i++) {
        const a = rand(0, TAU);
        const sp = rand(180, 900);
        ps.spawn({
          kind: 'crystal',
          x,
          y,
          vx: Math.cos(a) * sp,
          vy: Math.sin(a) * sp,
          rot: a,
          vrot: rand(-10, 10),
          life: rand(0.5, 1.2),
          max: 1.2,
          size: rand(1.6, 3.6),
          color: i % 3 ? w.primary : '#ffffff',
          color2: '#3f7fd6',
          grav: 460,
          drag: 0.975,
        });
      }
      sparks(12, '#ffffff', 700, 0.35);
      // dense sublimation fog
      for (let i = 0; i < 12; i++)
        ps.spawn({
          kind: 'frost',
          x: x + rand(-22, 22),
          y: y + rand(-22, 22),
          vx: rand(-130, 130),
          vy: rand(-150, -20),
          size: rand(18, 40),
          data: 2.6,
          life: rand(0.9, 2),
          max: 2,
          color: '#cbe9ff',
          drag: 0.96,
          add: false,
          rot: rand(0, TAU),
        });
      // falling ice dust
      for (let i = 0; i < 18; i++) {
        const a = rand(0, TAU);
        ps.spawn({
          kind: 'ember',
          x,
          y,
          vx: Math.cos(a) * rand(40, 380),
          vy: Math.sin(a) * rand(40, 380) - 30,
          life: rand(0.6, 1.6),
          max: 1.6,
          size: rand(0.8, 2),
          color: i % 2 ? '#e8f8ff' : '#9fe6ff',
          grav: 240,
          drag: 0.985,
        });
      }
      break;
    }
    case 'shatter': {
      /* ---- resonance: the material tears itself apart ---- */
      flash(96, '#ffffff', 0.14);
      flash(58, w.secondary, 0.28);
      // nested standing-wave shells
      ps.spawn({ kind: 'wavefront', x, y, rot: 0, size: 12, size2: 150, life: 0.5, max: 0.5, color: w.secondary, color2: w.primary, data: 2.6 });
      ps.spawn({ kind: 'wavefront', x, y, rot: 1.05, size: 8, size2: 220, life: 0.7, max: 0.7, color: w.primary, color2: w.secondary, data: 2.2 });
      ps.spawn({ kind: 'wavefront', x, y, rot: -1.05, size: 5, size2: 300, life: 0.9, max: 0.9, color: '#ffffff', color2: w.primary, data: 1.9 });
      // concentric ring shockwaves for the far field
      ring(140, w.secondary, 0.4, 6);
      ring(230, w.primary, 0.65, 10);
      // radial stress fractures
      for (let k = 0; k < 14; k++) {
        const a = (k / 14) * TAU + rand(-0.1, 0.1);
        const L = rand(50, 130);
        ps.spawn({
          kind: 'streak',
          x,
          y,
          rot: a,
          size: L,
          size2: rand(1.6, 3.2),
          life: rand(0.16, 0.34),
          max: 0.34,
          color: k % 2 ? w.secondary : '#ffffff',
        });
      }
      // plate fragments flung outward
      for (let i = 0; i < 22; i++) {
        const a = rand(0, TAU);
        ps.spawn({
          kind: 'shard',
          x,
          y,
          vx: Math.cos(a) * rand(320, 1050),
          vy: Math.sin(a) * rand(320, 1050) - 100,
          rot: rand(0, TAU),
          vrot: rand(-24, 24),
          life: rand(0.7, 1.6),
          max: 1.6,
          size: rand(3.5, 9),
          size2: rand(2.5, 5.5),
          color: i % 2 ? '#4a3520' : '#8a6335',
          grav: 920,
          add: false,
        });
      }
      // acoustic dust lifted off the surface
      for (let i = 0; i < 26; i++) {
        const a = rand(0, TAU);
        ps.spawn({
          kind: 'ember',
          x,
          y,
          vx: Math.cos(a) * rand(60, 520),
          vy: Math.sin(a) * rand(60, 520),
          life: rand(0.3, 0.9),
          max: 0.9,
          size: rand(0.9, 2.2),
          color: i % 3 ? w.secondary : '#ffffff',
          grav: 380,
          drag: 0.96,
        });
      }
      sparks(16, w.secondary, 900, 0.4);
      // residual pressure mist
      for (let i = 0; i < 7; i++)
        ps.spawn({
          kind: 'smoke',
          x: x + rand(-20, 20),
          y: y + rand(-20, 20),
          vx: rand(-170, 170),
          vy: rand(-140, 140),
          size: rand(18, 38),
          data: 2.5,
          life: rand(0.9, 1.9),
          max: 1.9,
          color: '#7a5c3a',
          color2: '#ffe8bd',
          add: false,
          drag: 0.95,
        });
      break;
    }
    case 'collapse': {
      /* ---- wavefunction collapse: probability resolves into reality ---- */
      flash(112, '#ffffff', 0.15);
      flash(72, w.secondary, 0.3);
      // interference rings collapsing inward then snapping
      ring(200, w.primary, 0.55, 8);
      ring(130, w.secondary, 0.4, 5);
      ring(70, '#ffffff', 0.28, 4);
      // the discarded realities flash and fade
      for (let k = 0; k < 5; k++) {
        const a = rand(0, TAU);
        const d = rand(26, 78);
        ps.spawn({
          kind: 'ghost',
          x: x + Math.cos(a) * d,
          y: y + Math.sin(a) * d,
          rot: rand(0, TAU),
          size: rand(9, 20),
          color: k % 2 ? w.primary : w.secondary,
          data: 1,
          life: rand(0.26, 0.5),
          max: 0.5,
        });
      }
      // superposition shells that wink out
      for (let k = 0; k < 8; k++) {
        const a = rand(0, TAU);
        ps.spawn({
          kind: 'wavefront',
          x,
          y,
          rot: a,
          size: rand(2, 8),
          size2: rand(70, 170),
          life: rand(0.2, 0.42),
          max: 0.42,
          color: k % 2 ? w.primary : w.secondary,
          color2: '#ffffff',
          data: rand(1.2, 2.2),
        });
      }
      // braid filaments snapping
      for (let k = 0; k < 18; k++) {
        const a = rand(0, TAU);
        const sp = rand(400, 1300);
        ps.spawn({
          kind: 'streak',
          x,
          y,
          vx: Math.cos(a) * sp,
          vy: Math.sin(a) * sp,
          rot: a,
          size: rand(40, 110),
          size2: rand(1.6, 3.4),
          life: rand(0.18, 0.4),
          max: 0.4,
          color: k % 2 ? w.secondary : '#ffffff',
          drag: 0.975,
        });
      }
      // quantum dust
      for (let i = 0; i < 26; i++) {
        const a = rand(0, TAU);
        ps.spawn({
          kind: 'glow',
          x,
          y,
          vx: Math.cos(a) * rand(120, 760),
          vy: Math.sin(a) * rand(120, 760),
          life: rand(0.2, 0.6),
          max: 0.6,
          size: rand(5, 14),
          color: i % 3 === 0 ? w.secondary : i % 3 === 1 ? w.primary : '#ffffff',
        });
      }
      sparks(18, '#ffffff', 1050, 0.4);
      // violet reality-mist
      for (let i = 0; i < 9; i++)
        ps.spawn({
          kind: 'smoke',
          x: x + rand(-24, 24),
          y: y + rand(-24, 24),
          vx: rand(-190, 190),
          vy: rand(-190, 190),
          size: rand(20, 42),
          data: 2.7,
          life: rand(0.9, 2),
          max: 2,
          color: '#4b3f80',
          color2: '#d8ccff',
          add: false,
          drag: 0.95,
        });
      break;
    }

    case 'acid': {
      /* ---- molecular acid: dissolves instead of burning ---- */
      flash(60, '#f4ffd0', 0.1);
      flash(38, w.primary, 0.26);
      ring(52, w.secondary, 0.3, 4);
      // acid splash — droplets that stick and keep eating
      for (let i = 0; i < 28; i++) {
        const a = rand(0, TAU);
        const sp = rand(120, 820);
        ps.spawn({
          kind: 'acid',
          x,
          y,
          vx: Math.cos(a) * sp,
          vy: Math.sin(a) * sp - 60,
          life: rand(0.5, 1.5),
          max: 1.5,
          size: rand(1.8, 4.4),
          color: i % 3 === 0 ? w.secondary : w.primary,
          color2: '#4a8a0a',
          grav: 620,
          drag: 0.965,
        });
      }
      // fine acidic mist
      for (let i = 0; i < 14; i++) {
        const a = rand(0, TAU);
        ps.spawn({
          kind: 'acid',
          x,
          y,
          vx: Math.cos(a) * rand(40, 340),
          vy: Math.sin(a) * rand(40, 340),
          life: rand(0.3, 0.8),
          max: 0.8,
          size: rand(0.9, 2),
          color: w.secondary,
          color2: '#6ba81a',
          grav: 300,
          drag: 0.96,
        });
      }
      // fizzing gas bubbles rising off the wound
      for (let i = 0; i < 16; i++) {
        ps.spawn({
          kind: 'bubble',
          x: x + rand(-18, 18),
          y: y + rand(-14, 14),
          vx: rand(-70, 70),
          vy: rand(-190, -50),
          life: rand(0.4, 1.1),
          max: 1.1,
          size: rand(2.4, 6),
          color: w.primary,
          color2: '#f0ffcd',
          drag: 0.97,
        });
      }
      // toxic vapour cloud
      for (let i = 0; i < 9; i++)
        ps.spawn({
          kind: 'smoke',
          x: x + rand(-18, 18),
          y: y + rand(-18, 18),
          vx: rand(-110, 110),
          vy: rand(-170, -40),
          size: rand(16, 36),
          data: 2.7,
          life: rand(1, 2.1),
          max: 2.1,
          color: '#3f5c14',
          color2: '#d9ff9e',
          add: false,
          drag: 0.95,
        });
      // corrosive streaks running down the surface
      for (let i = 0; i < 6; i++) {
        ps.spawn({
          kind: 'streak',
          x: x + rand(-10, 10),
          y,
          rot: Math.PI / 2 + rand(-0.4, 0.4),
          size: rand(24, 60),
          size2: rand(2, 3.6),
          life: rand(0.5, 1.1),
          max: 1.1,
          color: i % 2 ? w.primary : '#eaffb0',
          grav: 300,
          drag: 0.99,
        });
      }
      break;
    }
    case 'buster': {
      /* ---- clean plasma burst: hard-edged, no smoke ---- */
      const big = scale > 1.2;
      flash(80 * scale, '#ffffff', 0.13);
      flash(52 * scale, w.primary, 0.26);
      // crisp expanding ring
      ps.spawn({ kind: 'ring', x, y, size: 6, size2: 90 * scale, life: 0.3, max: 0.3, color: '#ffffff', data: 5 });
      ps.spawn({ kind: 'ring', x, y, size: 4, size2: 60 * scale, life: 0.22, max: 0.22, color: w.primary, data: 3.4 });
      if (big) {
        ps.spawn({ kind: 'ring', x, y, size: 10, size2: 200, life: 0.5, max: 0.5, color: w.secondary, data: 8 });
        // starburst petals on the charged impact
        for (let k = 0; k < 8; k++) {
          const a = (k / 8) * TAU + rand(-0.1, 0.1);
          ps.spawn({
            kind: 'spike',
            x,
            y,
            rot: a,
            size: rand(70, 130),
            size2: rand(5, 9),
            life: rand(0.14, 0.26),
            max: 0.26,
            color: k % 2 ? '#ffffff' : w.primary,
          });
        }
      }
      // bright plasma sparks
      sparks(big ? 30 : 16, '#fff6d8', big ? 1300 : 900, 0.45);
      sparks(8, '#ffffff', 800, 0.3);
      // warm embers
      for (let i = 0; i < (big ? 16 : 8); i++) {
        const a = rand(0, TAU);
        ps.spawn({
          kind: 'ember',
          x,
          y,
          vx: Math.cos(a) * rand(120, 700),
          vy: Math.sin(a) * rand(120, 700),
          life: rand(0.25, 0.7),
          max: 0.7,
          size: rand(1.2, 2.8),
          color: i % 2 ? w.primary : '#ffb43a',
          grav: 340,
          drag: 0.965,
        });
      }
      // only the faintest wisp — buster shots are clean
      for (let i = 0; i < (big ? 4 : 2); i++)
        ps.spawn({
          kind: 'smoke',
          x: x + rand(-10, 10),
          y: y + rand(-10, 10),
          vx: rand(-60, 60),
          vy: rand(-90, -20),
          size: rand(12, 24),
          data: 2.2,
          life: rand(0.6, 1.2),
          max: 1.2,
          color: '#9a8f78',
          color2: '#fff3c4',
          add: false,
          drag: 0.96,
        });
      break;
    }

    case 'void': {
      /* ---- gravitational collapse: sucked in, then blown out ---- */
      // matter being dragged INTO the point from far away
      for (let i = 0; i < 40; i++) {
        const a = rand(0, TAU);
        const d = rand(150, 460);
        ps.spawn({
          kind: 'streak',
          x: x + Math.cos(a) * d,
          y: y + Math.sin(a) * d,
          vx: -Math.cos(a) * rand(420, 1150),
          vy: -Math.sin(a) * rand(420, 1150),
          rot: a + Math.PI,
          size: rand(30, 80),
          size2: rand(1.2, 2.6),
          life: rand(0.22, 0.42),
          max: 0.42,
          color: i % 3 ? w.secondary : '#ffffff',
          drag: 0.995,
        });
      }
      // white-hot collapse
      flash(120, '#ffffff', 0.14);
      ps.spawn({ kind: 'voidhole', x, y, size: 46, life: 0.85, max: 0.85, color: w.primary, color2: w.secondary, rot: 0.4, add: true });
      ps.spawn({ kind: 'voidhole', x, y, size: 26, life: 1.15, max: 1.15, color: w.secondary, color2: w.primary, rot: -0.5, add: true });
      // expanding spacetime shockwaves
      ring(120, '#ffffff', 0.6, 8);
      ring(210, w.primary, 0.85, 12);
      ring(320, w.secondary, 1.1, 6);
      // hyper-velocity debris ejected
      sparks(34, w.secondary, 1500, 0.7);
      sparks(20, '#ffffff', 1100, 0.5);
      for (let i = 0; i < 16; i++) {
        const a = rand(0, TAU);
        ps.spawn({
          kind: 'shard',
          x,
          y,
          vx: Math.cos(a) * rand(300, 900),
          vy: Math.sin(a) * rand(300, 900),
          rot: rand(0, TAU),
          vrot: rand(-18, 18),
          life: rand(0.7, 1.6),
          max: 1.6,
          size: rand(4, 10),
          size2: rand(3, 7),
          color: i % 3 ? '#4a3570' : '#8b6fd6',
          grav: 620,
          add: false,
        });
      }
      // ionised vapour
      for (let i = 0; i < 12; i++)
        ps.spawn({
          kind: 'smoke',
          x: x + rand(-30, 30),
          y: y + rand(-30, 30),
          vx: rand(-260, 260),
          vy: rand(-260, 260),
          size: rand(24, 52),
          data: 2.8,
          life: rand(1, 2.1),
          max: 2.1,
          color: '#6b4fa8',
          color2: '#e9d5ff',
          add: false,
          drag: 0.95,
        });
      break;
    }
    case 'arc': {
      /* ---- high-amperage electrocution ---- */
      flash(72, '#ffffff', 0.12);
      flash(44, w.primary, 0.26);
      ring(64, w.primary, 0.3, 4);
      // crawling arc webs that radiate and fork
      for (let i = 0; i < 5; i++) {
        ps.spawn({
          kind: 'arcweb',
          x: x + rand(-14, 14),
          y: y + rand(-14, 14),
          rot: rand(0, TAU),
          size: rand(46, 92),
          size2: rand(1.4, 2.4),
          data: randInt(3, 6),
          life: rand(0.16, 0.34),
          max: 0.34,
          color: i % 2 ? w.primary : '#eafeff',
        });
      }
      ps.spawn({ kind: 'bolt', x, y, rot: rand(0, TAU), size: rand(40, 90), size2: 3.2, life: 0.16, max: 0.16, color: '#ffffff' });
      sparks(20, w.primary, 1050, 0.45);
      for (let i = 0; i < 9; i++)
        ps.spawn({
          kind: 'glow',
          x: x + rand(-18, 18),
          y: y + rand(-18, 18),
          vx: rand(-260, 260),
          vy: rand(-260, 260),
          life: rand(0.16, 0.42),
          max: 0.42,
          size: rand(6, 15),
          color: i % 3 ? w.primary : '#ffffff',
        });
      // ozone smoke
      for (let i = 0; i < 4; i++)
        ps.spawn({
          kind: 'smoke',
          x: x + rand(-10, 10),
          y: y + rand(-10, 10),
          vx: rand(-70, 70),
          vy: rand(-140, -40),
          size: rand(14, 26),
          data: 2.2,
          life: rand(0.8, 1.5),
          max: 1.5,
          color: '#5d7a88',
          color2: '#d6f6ff',
          add: false,
          drag: 0.96,
        });
      break;
    }
    case 'rail': {
      /* ---- hypervelocity kinetic penetration ---- */
      flash(150, '#ffffff', 0.16);
      flash(90, w.secondary, 0.3);
      // vertical shock pillar + horizontal disc
      ring(160, '#ffffff', 0.5, 9);
      ring(260, w.primary, 0.75, 14);
      ring(380, w.secondary, 1.05, 5);
      // molten metal spray (back-splash + forward spall)
      sparks(44, '#ffffff', 1700, 0.7);
      sparks(30, w.secondary, 1250, 0.85);
      for (let i = 0; i < 26; i++) {
        const a = back + rand(-0.7, 0.7);
        ps.spawn({
          kind: 'ember',
          x,
          y,
          vx: Math.cos(a) * rand(400, 1400),
          vy: Math.sin(a) * rand(400, 1400),
          life: rand(0.4, 1.3),
          max: 1.3,
          size: rand(1.4, 3.6),
          color: pick2(['#ffd08a', '#ff9b3a', '#ff5a12', '#ffffff']),
          grav: 420,
          drag: 0.96,
        });
      }
      // sheared plate fragments
      for (let i = 0; i < 18; i++) {
        const a = rand(0, TAU);
        ps.spawn({
          kind: 'shard',
          x,
          y,
          vx: Math.cos(a) * rand(400, 1100),
          vy: Math.sin(a) * rand(400, 1100) - 120,
          rot: rand(0, TAU),
          vrot: rand(-22, 22),
          life: rand(0.8, 1.8),
          max: 1.8,
          size: rand(4, 11),
          size2: rand(2.5, 6),
          color: i % 2 ? '#5a636e' : '#98a2ae',
          grav: 950,
          add: false,
        });
      }
      // lingering white-hot crater
      ps.spawn({ kind: 'glow', x, y, size: 40, life: 0.75, max: 0.75, color: '#ff8a2a' });
      // supersonic dust slab
      for (let i = 0; i < 10; i++)
        ps.spawn({
          kind: 'smoke',
          x: x + rand(-26, 26),
          y: y + rand(-26, 26),
          vx: rand(-320, 320),
          vy: rand(-320, 320),
          size: rand(24, 50),
          data: 2.6,
          life: rand(1, 2.1),
          max: 2.1,
          color: '#8e9aa6',
          color2: '#ffe7c2',
          add: false,
          drag: 0.95,
        });
      break;
    }

    case 'ash': {
      /* ---- tripod heat ray: matter is VAPORISED, not shattered ---- */
      flash(120, '#ffffff', 0.16);
      flash(76, '#dff3ff', 0.3);
      ring(96, '#ffffff', 0.38, 7);
      ring(160, '#bfe4ff', 0.6, 12);
      // incandescent outline flash where the metal glows before failing
      ps.spawn({ kind: 'glow', x, y, size: 46, life: 0.5, max: 0.5, color: '#ffd9a0' });
      // white-hot sparks thrown hard
      sparks(28, '#ffffff', 1200, 0.55);
      sparks(16, '#dff3ff', 900, 0.4);
      // fine ash: the target's own mass, now dust
      for (let i = 0; i < 34; i++) {
        const a = rand(0, TAU);
        ps.spawn({
          kind: 'ember',
          x,
          y,
          vx: Math.cos(a) * rand(50, 520),
          vy: Math.sin(a) * rand(50, 520) - 70,
          life: rand(0.7, 1.9),
          max: 1.9,
          size: rand(1, 2.8),
          color: pick2(['#ffffff', '#dfe8ef', '#aab4bd', '#7d8794']),
          grav: -36,
          drag: 0.975,
        });
      }
      // curling smoke plumes rising
      for (let i = 0; i < 12; i++)
        ps.spawn({
          kind: 'smoke',
          x: x + rand(-22, 22),
          y: y + rand(-22, 22),
          vx: rand(-90, 90),
          vy: rand(-200, -60),
          size: rand(22, 48),
          data: 2.9,
          life: rand(1.2, 2.4),
          max: 2.4,
          color: '#b9c4cd',
          color2: '#ffffff',
          add: false,
          drag: 0.96,
        });
      // molten slag beads left behind
      for (let i = 0; i < 10; i++) {
        const a = rand(0, TAU);
        ps.spawn({
          kind: 'ember',
          x,
          y,
          vx: Math.cos(a) * rand(80, 380),
          vy: Math.sin(a) * rand(80, 380) - 40,
          life: rand(0.9, 1.8),
          max: 1.8,
          size: rand(1.4, 3.2),
          color: '#ffb03a',
          grav: 420,
          drag: 0.98,
        });
      }
      break;
    }

  }
}

export function drawArt(ctx: CanvasRenderingContext2D, w: WeaponDef, s: ArtState) {
  ART[w.art](ctx, s);
}

export type { Particle };
