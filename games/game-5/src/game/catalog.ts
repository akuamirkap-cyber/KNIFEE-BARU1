export type WeaponCategory = "ballistic" | "energy" | "signature";

export interface WeaponProfile {
  short: string;
  family: string;
  category: WeaponCategory;
  description: string;
  technique: string;
}

export const WEAPON_PROFILES: Record<string, WeaponProfile> = {
  bow: {
    short: "Recurve Bow",
    family: "PRECISION / RECURVE",
    category: "signature",
    description:
      "Kayu berlapis, tali tegang, satu anak panah. Presisi yang terasa di setiap tarikan.",
    technique:
      "Tahan untuk menarik busur. Lepas saat bidikan berada di bagian roda yang kosong.",
  },
  ak47: {
    short: "AK-47",
    family: "BALLISTIC / 7.62 MM",
    category: "ballistic",
    description:
      "Baja gelap dan kayu hangat. Kilatan moncong singkat, tracer tembaga, hentakan yang tegas.",
    technique:
      "Satu klik, satu peluru. Beri ruang di antara setiap lubang tembakan.",
  },
  rifle: {
    short: "Marksman Rifle",
    family: "BALLISTIC / .308",
    category: "ballistic",
    description:
      "Laras panjang, optik berlapis, dan satu tembakan presisi dengan penetrasi yang dalam.",
    technique:
      "Bidik celah baru. Peluru cepat, tetapi hentakannya lebih besar.",
  },
  rifleElectro: {
    short: "Tesla Rifle",
    family: "ELECTRO / ARC COIL",
    category: "energy",
    description:
      "Koil biru mengalirkan energi ke inti proyektil, meninggalkan guratan ion pada kayu.",
    technique:
      "Tunggu siklus koil selesai sebelum melepaskan tembakan berikutnya.",
  },
  mp5: {
    short: "MP5",
    family: "BALLISTIC / 9 MM",
    category: "ballistic",
    description:
      "Ringkas dan responsif. Mekanisme bolt, selongsong terlempar, dan bekas peluru yang rapat.",
    technique:
      "Klik berirama. Kecepatan tinggi tetap membutuhkan jarak antartembakan.",
  },
  mp5Electro: {
    short: "MP5 Electro",
    family: "ELECTRO / ION BURST",
    category: "energy",
    description:
      "Bodi kompak dengan inti ungu. Proyektil ion bergerak cepat di antara percikan halus.",
    technique:
      "Manfaatkan celah kecil tanpa menghantam guratan ion sebelumnya.",
  },
  sniperBeam: {
    short: "Photon Sniper",
    family: "PHOTON / HITSCAN",
    category: "energy",
    description:
      "Lance putih-biru menembus udara, diikuti spiral ionisasi yang menghilang perlahan.",
    technique:
      "Beam mengenai target seketika. Pilih titik dengan ruang yang cukup.",
  },
  dragonBreath: {
    short: "Dragon Breath",
    family: "MYTHIC / INFERNO",
    category: "signature",
    description:
      "Sisik merah, tanduk gading, dan bara di tenggorokan. Seekor naga yang benar-benar bernapas.",
    technique:
      "Luka bakar lebih lebar. Sisakan ruang ekstra sebelum menyemburkan api.",
  },
  beretta92: {
    short: "Beretta 92FS",
    family: "BALLISTIC / 9 MM",
    category: "ballistic",
    description:
      "Slide terbuka yang khas, baja berkilau halus, dan respons semi-otomatis yang bersih.",
    technique:
      "Tembakan tunggal untuk celah sempit. Baca arah putaran sebelum menembak.",
  },
  phaser: {
    short: "Phaser Type-II",
    family: "STAR TREK / NADION",
    category: "energy",
    description:
      "Bentuk ergonomis dan beam amber yang stabil, diakhiri pijar nadion pada permukaan roda.",
    technique:
      "Arahkan ke kayu yang belum terbakar; satu beam meninggalkan satu penanda.",
  },
  energySword: {
    short: "Energy Sword",
    family: "PLASMA / TWIN BLADE",
    category: "signature",
    description:
      "Dua bilah bercahaya, satu lengkung sabetan. Tepi cyan dan ungu tetap tajam saat bergerak.",
    technique:
      "Sabetan terbang meninggalkan luka panjang. Pilih ruang yang lebih lebar.",
  },
  plasmacaster: {
    short: "Plasmacaster",
    family: "PREDATOR / PLASMA",
    category: "energy",
    description:
      "Pelat pendingin membuka, kapasitor terisi, lalu laras menghentak mundur saat plasma biru melesat.",
    technique:
      "Bola plasma memiliki waktu tempuh. Antisipasi posisi bekas pada roda yang berputar.",
  },
  identityDisc: {
    short: "Identity Disc",
    family: "TRON / RETURNING DISC",
    category: "signature",
    description:
      "Tarikan pergelangan, ayunan lemparan, dan tangkapan bercahaya. Satu cakram mengikuti lintasan neon yang melengkung.",
    technique:
      "Maksimal empat hit baru per lemparan. Bekasnya tetap menghalangi lemparan berikutnya.",
  },
  protonPack: {
    short: "Proton Pack",
    family: "GHOSTBUSTERS / PARTICLE STREAM",
    category: "energy",
    description:
      "Cyclotron berputar makin cepat. Selang berdenyut dan wand bergetar saat aliran partikel berpilin dilepas.",
    technique:
      "Aliran partikel meninggalkan guratan lebar. Bidik permukaan yang masih bersih.",
  },
  tripod: {
    short: "Martian Heat-Ray",
    family: "WAR OF THE WORLDS / HEAT-RAY",
    category: "energy",
    description:
      "Tiga kaki merenggang, kubah merendah, dan optik membuka sebelum heat-ray berat menembus udara.",
    technique:
      "Heat-ray meninggalkan luka bakar besar. Tunggu celah terlebar pada roda.",
  },
  repulsor: {
    short: "Repulsor",
    family: "IRON MAN / PALM BLAST",
    category: "energy",
    description:
      "Jari menekuk saat iris telapak mengisi energi, lalu membuka tajam bersama impuls putih-biru dan recoil pergelangan.",
    technique:
      "Perhatikan waktu tempuh impuls dan cincin tekanan yang tertinggal.",
  },
  predatorShoulder: {
    short: "Shoulder Caster",
    family: "PREDATOR / YAUTJA TECH",
    category: "energy",
    description:
      "Servo menahan laras, sirip pendingin terbuka, dan tiga laser mengunci. Plasma berat diikuti recoil hidraulis dan uap panas.",
    technique:
      "Klik untuk mengunci sasaran. Setelah 0,28 detik, plasma menembak secara otomatis.",
  },
};

export const CATEGORIES = [
  { id: "all", label: "Semua" },
  { id: "ballistic", label: "Balistik" },
  { id: "energy", label: "Energi" },
  { id: "signature", label: "Ikonik" },
] as const;
