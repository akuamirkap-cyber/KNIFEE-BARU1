import { knifeVariant, levelConfig, TARGETS, type TargetKind } from "../play/levels";
import { KNIFE_COUNT, KNIFE_INFO } from "../play/KnifeArt";
import { HEAD_INFO, HEAD_KINDS, type HeadKind } from "../play/HeadArt";
import { STAGES, TOTAL } from "../quest/data";

export type CodexEntry = {
  id: string;
  group: "wheel" | "boss" | "obstacle";
  knife?: number;
  kind: TargetKind;
  head?: HeadKind;
  name: string;
  tag: string;
  tagColor: string;
  desc: string;
  facts: string[];
  first: number; // first stage it appears in (0 = never)
};

type WheelKind = Exclude<TargetKind, "boss">;
const W: Record<WheelKind, { name: string; tag: "BUAH" | "BOLA" | "KAYU" | "GAME" | "PANTAI" | "ANGKASA" | "UNIK" | "KULINER"; desc: string; hit: string; burst: string }> = {
  orange: { name: "Jeruk", tag: "BUAH", desc: "Irisan jeruk segar dengan 10 juring. Roda pertama untuk pemanasan.", hit: "Crek basah", burst: "Cipratan jus oranye" },
  lime: { name: "Jeruk Nipis", tag: "BUAH", desc: "Irisan jeruk nipis yang asam. Kecil tapi licin!", hit: "Crek basah", burst: "Cipratan jus hijau" },
  lemon: { name: "Lemon", tag: "BUAH", desc: "Irisan lemon kuning cerah dengan serat berkilau.", hit: "Crek basah", burst: "Cipratan jus kuning" },
  watermelon: { name: "Semangka", tag: "BUAH", desc: "Semangka merah segar penuh biji hitam.", hit: "Crek basah", burst: "Cipratan merah" },
  wood: { name: "Kayu", tag: "KAYU", desc: "Potongan batang kayu dengan cincin tahun.", hit: "Tok kayu", burst: "Serpihan kayu" },
  durian: { name: "Durian Belah", tag: "BUAH", desc: "Raja buah dibelah dua: kulit berduri hijau, 5 ruang berisi daging durian kuning yang mulus.", hit: "Kulit retak + creck", burst: "Daging durian berhamburan" },
  kiwi: { name: "Kiwi", tag: "BUAH", desc: "Kiwi hijau berbulu dengan lingkaran biji hitam.", hit: "Crek basah", burst: "Cipratan hijau" },
  dragonfruit: { name: "Buah Naga", tag: "BUAH", desc: "Kulit magenta bersisik, daging putih dengan ratusan biji kecil.", hit: "Crek basah", burst: "Cipratan magenta" },
  pineapple: { name: "Nanas", tag: "BUAH", desc: "Irisan nanas berserat dengan kulit motif wajik.", hit: "Crek basah", burst: "Cipratan kuning" },
  apple: { name: "Apel", tag: "BUAH", desc: "Apel merah dibelah melintang — lihat bintang 5 bijinya!", hit: "Crek renyah", burst: "Cipratan krem" },
  soccer: { name: "Bola Sepak", tag: "BOLA", desc: "Bola sepak klasik segilima hitam-putih.", hit: "Bonk karet", burst: "Meletus + angin keluar" },
  basketball: { name: "Bola Basket", tag: "BOLA", desc: "Bola basket oranye bertekstur dengan garis hitam.", hit: "Bonk berat", burst: "Meletus + angin keluar" },
  tennis: { name: "Bola Tenis", tag: "BOLA", desc: "Bola tenis neon berbulu halus.", hit: "Pok ringan", burst: "Meletus + angin keluar" },
  baseball: { name: "Bola Bisbol", tag: "BOLA", desc: "Bola kulit dengan jahitan merah berbentuk V.", hit: "Pok kulit", burst: "Meletus + angin keluar" },
  bowling: { name: "Bola Bowling", tag: "BOLA", desc: "Bola resin ungu mengkilap dengan 3 lubang jari.", hit: "Tok berat", burst: "STRIKE! pin berjatuhan" },
  carrom: { name: "Cakram Mandala", tag: "GAME", desc: "Striker karambol gading berbingkai emas dengan mandala merah, hijau & emas berlapis-lapis.", hit: "Tak keras", burst: "Pecahan cakram berhamburan" },
  carrom2: { name: "Cakram Teratai", tag: "GAME", desc: "Striker karambol biru malam bermotif teratai merah muda yang mekar dari tengah.", hit: "Tak keras", burst: "Pecahan cakram berhamburan" },
  casino: { name: "Koin Casino", tag: "GAME", desc: "Chip poker merah-emas bernilai 100 dengan simbol sekop, hati, wajik & keriting.", hit: "Klik chip", burst: "Hujan chip & koin" },
  volleyball: { name: "Bola Voli", tag: "PANTAI", desc: "Bola voli pantai biru-kuning-putih dengan panel melengkung.", hit: "Bonk karet", burst: "Meletus + angin keluar" },
  umbrella: { name: "Payung Pantai", tag: "PANTAI", desc: "Payung pelangi dilihat dari atas — 8 kain warna-warni dengan tepi bergelombang.", hit: "Puk kain", burst: "Kain warna-warni berterbangan" },
  starfish: { name: "Bintang Laut", tag: "PANTAI", desc: "Bintang laut oranye berbintil di kolam air jernih penuh gelembung.", hit: "Crek lembek", burst: "Cipratan air laut" },
  coconut: { name: "Kelapa", tag: "PANTAI", desc: "Kelapa dibelah dua: sabut berserat, tempurung, daging putih & air kelapa.", hit: "Tok tempurung", burst: "Air kelapa muncrat" },
  eightball: { name: "Bola 8-Ball", tag: "BOLA", desc: "Bola biliar hitam nomor 8 yang mengkilap — bola penentu kemenangan.", hit: "Klak biliar", burst: "Pecahan bola berhamburan" },
  moon: { name: "Bulan", tag: "ANGKASA", desc: "Satelit abu-abu penuh kawah dan lautan gelap.", hit: "Duk batu", burst: "Bebatuan bulan berhamburan" },
  mars: { name: "Mars", tag: "ANGKASA", desc: "Planet merah berdebu dengan lembah raksasa dan tudung es di kutubnya.", hit: "Duk batu", burst: "Debu merah berhamburan" },
  jupiter: { name: "Jupiter", tag: "ANGKASA", desc: "Raksasa gas bergaris dengan Bintik Merah Besar — badai abadi.", hit: "Wuung gas", burst: "Awan gas berhamburan" },
  pluto: { name: "Pluto", tag: "ANGKASA", desc: "Planet kerdil es dengan dataran berbentuk hati yang terkenal.", hit: "Duk es", burst: "Kristal es berhamburan" },
  ufo: { name: "UFO", tag: "ANGKASA", desc: "Piring terbang logam dengan lampu warna-warni — ada alien hijau mengintip dari kubah kaca!", hit: "Dong logam", burst: "Lampu & logam berhamburan" },
  dartboard: { name: "Papan Dart", tag: "GAME", desc: "Papan dart lengkap: 20 segmen bernomor, cincin ganda & tripel, serta bullseye.", hit: "Thunk sisal", burst: "Serpihan papan" },
  disco: { name: "Bola Disko", tag: "UNIK", desc: "Bola cermin penuh ratusan kepingan berkilau. Pesta di setiap putaran!", hit: "Ting kaca", burst: "Hujan kepingan cermin" },
  icecream: { name: "Es Krim Stroberi", tag: "KULINER", desc: "Satu sendok besar es krim stroberi pink yang lembut dan bergelombang.", hit: "Plop lembut", burst: "Cipratan es krim" },
  spiral: { name: "Spiral Hipnotis", tag: "UNIK", desc: "Spiral hitam-putih yang bikin pusing saat berputar… fokus!", hit: "Wuung", burst: "Pusaran pecah" },
  ornament: { name: "Bola Natal", tag: "UNIK", desc: "Hiasan pohon Natal merah mengkilap dengan pita emas & kepingan salju.", hit: "Ting kaca", burst: "Pecahan kaca merah" },
  peppermint: { name: "Permen Peppermint", tag: "KULINER", desc: "Permen pusaran merah-putih dalam bungkus bening.", hit: "Krak permen", burst: "Serpihan permen" },
  friedegg: { name: "Telur Ceplok", tag: "KULINER", desc: "Telur mata sapi bulat sempurna dengan kuning telur oranye yang besar.", hit: "Plop lembut", burst: "Kuning telur muncrat" },
  pearl: { name: "Mutiara", tag: "UNIK", desc: "Mutiara putih berkilau pelangi — harta dari dasar laut.", hit: "Ting kaca", burst: "Kilau mutiara" },
  quailegg: { name: "Telur Puyuh", tag: "KULINER", desc: "Telur puyuh krem bertotol hitam dan abu-abu.", hit: "Krek cangkang", burst: "Cangkang pecah" },
  grapesoda: { name: "Tutup Grape Soda", tag: "KULINER", desc: "Tutup botol soda anggur ungu bergerigi dengan pita GRAPE — lencana petualang sejati!", hit: "Klink tutup", burst: "Tutup botol terpental" },
  cannon: { name: "Bom Meriam", tag: "UNIK", desc: "Bola meriam besi hitam bersumbu menyala dengan lambang tengkorak. Awas meledak!", hit: "Dong besi berat", burst: "KABOOM! ledakan besar" },
  eyeball: { name: "Bola Mata", tag: "UNIK", desc: "Bola mata raksasa berurat merah dengan iris hijau yang terus menatapmu…", hit: "Squish!", burst: "Cipratan kenyal" },
};
const TAG_COLOR = { BUAH: "#22c55e", BOLA: "#38bdf8", KAYU: "#d97706", GAME: "#f59e0b", PANTAI: "#06b6d4", ANGKASA: "#818cf8", UNIK: "#f472b6", KULINER: "#fb923c", BOS: "#ef4444", RINTANGAN: "#94a3b8" } as const;

function firstStages() {
  const wheel = new Map<string, number>();
  const boss = new Map<string, number>();
  for (let n = 1; n <= TOTAL; n++) {
    const L = levelConfig(n);
    if (L.boss && L.head) {
      if (!boss.has(L.head)) boss.set(L.head, n);
    } else if (!wheel.has(L.target)) wheel.set(L.target, n);
  }
  return { wheel, boss };
}

const FS = firstStages();
const wheelKinds = Array.from(new Set<WheelKind>([...(TARGETS as WheelKind[]), ...(Object.keys(W) as WheelKind[])]));

export const CODEX_WHEELS: CodexEntry[] = wheelKinds
  .map((k) => {
    const w = W[k];
    return {
      id: k,
      group: "wheel" as const,
      kind: k,
      name: w.name,
      tag: w.tag,
      tagColor: TAG_COLOR[w.tag],
      desc: w.desc,
      facts: [`Suara: ${w.hit}`, `Pecah: ${w.burst}`],
      first: FS.wheel.get(k) ?? 0,
    };
  })
  .sort((a, b) => (a.first || 999) - (b.first || 999));

export const CODEX_BOSSES: CodexEntry[] = HEAD_KINDS.map((h) => {
  const first = FS.boss.get(h) ?? 0;
  const L = first ? levelConfig(first) : null;
  const all = STAGES.filter((s) => s.head === h).map((s) => s.n);
  return {
    id: h,
    group: "boss" as const,
    kind: "boss" as TargetKind,
    head: h,
    name: HEAD_INFO[h].name,
    tag: "BOS",
    tagColor: TAG_COLOR.BOS,
    desc: HEAD_INFO[h].desc,
    facts: [L ? `Butuh ${L.ammo} peluru` : "—", `Stage ${all.join(" & ")}`],
    first,
  };
}).sort((a, b) => (a.first || 999) - (b.first || 999));

function firstKnife(v: number) {
  for (let n = 1; n <= TOTAL; n++) {
    const L = levelConfig(n);
    for (let i = 0; i < L.obstacles; i++) if (knifeVariant(n, i) === v) return n;
  }
  return 0;
}

export const CODEX_OBSTACLES: CodexEntry[] = Array.from({ length: KNIFE_COUNT }, (_, v) => ({
  id: `knife${v}`,
  group: "obstacle" as const,
  kind: "orange" as TargetKind,
  knife: v,
  name: KNIFE_INFO[v].name,
  tag: "RINTANGAN",
  tagColor: TAG_COLOR.RINTANGAN,
  desc: KNIFE_INFO[v].desc,
  facts: ["Menancap di roda", "Kena = MELESET"],
  first: firstKnife(v),
})).sort((a, b) => (a.first || 999) - (b.first || 999));
