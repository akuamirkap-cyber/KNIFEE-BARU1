import { scaleTL } from "../anim/speed";
import type { FlatName } from "../ui/FlatIcons";
import type { Rarity } from "../shop/weapons";

export type AchTab = "DAILY" | "SKILL";
export type Ach = {
  id: string;
  tab: AchTab;
  title: string;
  desc: string;
  icon: FlatName;
  color: [string, string];
  goal: number;
  progress: number;
  coins: number;
  gems?: number;
};

const C = {
  red: ["#fda4af", "#e11d48"] as [string, string],
  purple: ["#d8b4fe", "#7e22ce"] as [string, string],
  gold: ["#fde68a", "#f59e0b"] as [string, string],
  green: ["#bbf7d0", "#16a34a"] as [string, string],
  blue: ["#bae6fd", "#0284c7"] as [string, string],
  orange: ["#fed7aa", "#ea580c"] as [string, string],
  pink: ["#fbcfe8", "#db2777"] as [string, string],
  slate: ["#e2e8f0", "#475569"] as [string, string],
};

export const ACHS: Ach[] = [
  // DAILY (11)
  { id: "d1", tab: "DAILY", title: "Stage Pertama", desc: "Menangkan 1 stage Gun Hit", icon: "target", color: C.red, goal: 1, progress: 1, coins: 100 },
  { id: "d2", tab: "DAILY", title: "Pemburu Boss", desc: "Kalahkan 1 boss", icon: "demon", color: C.purple, goal: 1, progress: 0, coins: 150 },
  { id: "d3", tab: "DAILY", title: "Buka Hadiah", desc: "Buka 1 kotak hadiah boss", icon: "gift", color: C.gold, goal: 1, progress: 1, coins: 150 },
  { id: "d4", tab: "DAILY", title: "Ganti Senjata", desc: "Pilih senjata yang berbeda", icon: "gun", color: C.green, goal: 1, progress: 1, coins: 80 },
  { id: "d5", tab: "DAILY", title: "Login Harian", desc: "Masuk ke game hari ini", icon: "calendar", color: C.blue, goal: 1, progress: 1, coins: 50, gems: 2 },
  { id: "d6", tab: "DAILY", title: "Tembakan Sempurna", desc: "Dapatkan 10 PERFECT", icon: "sparkle", color: C.gold, goal: 10, progress: 7, coins: 120 },
  { id: "d7", tab: "DAILY", title: "Tanpa Meleset", desc: "Selesaikan 5 stage tanpa miss", icon: "target", color: C.red, goal: 5, progress: 3, coins: 200 },
  { id: "d8", tab: "DAILY", title: "Kolektor Koin", desc: "Kumpulkan 500 koin", icon: "coinbag", color: C.orange, goal: 500, progress: 240, coins: 100 },
  { id: "d9", tab: "DAILY", title: "Main 5 Stage", desc: "Mainkan 5 stage apa saja", icon: "joystick", color: C.blue, goal: 5, progress: 3, coins: 90 },
  { id: "d10", tab: "DAILY", title: "Kombo x10", desc: "Capai kombo 10 beruntun", icon: "fire", color: C.orange, goal: 10, progress: 10, coins: 120 },
  { id: "d11", tab: "DAILY", title: "Penonton Setia", desc: "Tonton 1 video hadiah", icon: "clapper", color: C.pink, goal: 1, progress: 0, coins: 60, gems: 1 },
  // SKILL (12)
  { id: "s1", tab: "SKILL", title: "Sniper Jitu", desc: "Total 50 tembakan PERFECT", icon: "target", color: C.red, goal: 50, progress: 50, coins: 250 },
  { id: "s2", tab: "SKILL", title: "Kecepatan Kilat", desc: "Selesaikan stage < 10 detik", icon: "bolt", color: C.gold, goal: 20, progress: 12, coins: 200 },
  { id: "s3", tab: "SKILL", title: "Pemburu Naga", desc: "Kalahkan boss Kepala Naga", icon: "dragon", color: C.green, goal: 1, progress: 0, coins: 300, gems: 5 },
  { id: "s4", tab: "SKILL", title: "Kolektor Senjata", desc: "Miliki 10 senjata", icon: "gun", color: C.slate, goal: 10, progress: 10, coins: 200 },
  { id: "s5", tab: "SKILL", title: "Boss Slayer", desc: "Kalahkan 20 boss", icon: "skull", color: C.purple, goal: 20, progress: 3, coins: 400, gems: 10 },
  { id: "s6", tab: "SKILL", title: "Master Stage", desc: "Tamatkan 100 stage", icon: "trophy", color: C.gold, goal: 100, progress: 3, coins: 500, gems: 20 },
  { id: "s7", tab: "SKILL", title: "Kombo Gila", desc: "Capai kombo 50 beruntun", icon: "fire", color: C.orange, goal: 50, progress: 22, coins: 250 },
  { id: "s8", tab: "SKILL", title: "Tanpa Cela", desc: "3 bintang di 3 stage boss", icon: "star", color: C.gold, goal: 3, progress: 1, coins: 300 },
  { id: "s9", tab: "SKILL", title: "Hemat Peluru", desc: "Menang dengan sisa 5 peluru", icon: "dynamite", color: C.red, goal: 10, progress: 4, coins: 180 },
  { id: "s10", tab: "SKILL", title: "Penjelajah", desc: "Jelajahi 4 pulau di quest", icon: "map", color: C.blue, goal: 4, progress: 0, coins: 220 },
  { id: "s11", tab: "SKILL", title: "Legenda", desc: "Miliki 1 senjata LEGEND", icon: "crown", color: C.gold, goal: 1, progress: 0, coins: 500, gems: 15 },
  { id: "s12", tab: "SKILL", title: "Raja Diamond", desc: "Kumpulkan 100 diamond", icon: "gem", color: C.blue, goal: 100, progress: 10, coins: 300 },
];

export type Milestone = { at: number; rarity: Rarity; tone: "green" | "purple" | "gold"; label: string };
export const MILESTONES: Milestone[] = [
  { at: 5, rarity: "UMUM", tone: "green", label: "UMUM" },
  { at: 10, rarity: "EPIC", tone: "purple", label: "EPIC" },
  { at: 20, rarity: "LEGEND", tone: "gold", label: "LEGEND" },
];
export const MAX_MS = 20;
/** surprise gift boxes sitting on the track between the chests */
export const GIFT_STOPS = [3, 8, 14, 17];

/* ---------------- timeline (ms) shared by visuals + audio ---------------- */
export const ACH_IN = scaleTL({
  bg: { d: 0, dur: 800 },
  top: (i: number) => ({ d: 80 + i * 70, dur: 600 }),
  banner: { d: 220, dur: 700, land: 0.5 },
  trophy: { d: 520, dur: 650, land: 0.6 },
  timer: { d: 720, dur: 500 },
  panel: { d: 560, dur: 720, land: 0.55 },
  track: { d: 980, dur: 480 },
  chest: (i: number) => ({ d: 1080 + i * 140, dur: 700, land: 0.5 }),
  node: (i: number) => ({ d: 1040 + i * 120, dur: 450 }),
  fill: { d: 1650 },
  tabs: { d: 1150, dur: 600 },
  row: (i: number) => ({ d: 1300 + i * 75, dur: 620, land: 0.55 }),
  claimAll: { d: 1850, dur: 520 },
  day: (i: number) => ({ d: 1650 + i * 80, dur: 560 }),
  ready: 1300,
});

export const ACH_OUT = scaleTL({
  row: (i: number) => ({ d: i * 30, dur: 360 }),
  chest: (i: number) => ({ d: 60 + i * 40, dur: 420 }),
  panel: { d: 160, dur: 440 },
  banner: { d: 80, dur: 400 },
  top: (i: number) => ({ d: i * 30, dur: 360 }),
  bg: { d: 150, dur: 500 },
  total: 560,
});
