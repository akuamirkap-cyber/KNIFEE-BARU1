export interface SaveData {
  coins: number;
  best: number;
  unlocked: string[];
  selected: string;
  muted: boolean;
  runs: number;
}

const KEY = "gunhit.save.v3";

/** Semua senjata terbuka sejak awal — tidak ada yang digembok. */
export const ALL_WEAPONS = ["keris", "yoyo", "diamond", "blackhole", "crystal"];

const DEFAULT: SaveData = {
  coins: 0,
  best: 1,
  unlocked: [...ALL_WEAPONS],
  selected: "keris",
  muted: false,
  runs: 0,
};

export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT };
    const p = JSON.parse(raw) as Partial<SaveData>;
    return {
      ...DEFAULT,
      ...p,
      unlocked: [...ALL_WEAPONS],
      selected: ALL_WEAPONS.includes(p.selected ?? "") ? (p.selected as string) : "keris",
    };
  } catch {
    return { ...DEFAULT };
  }
}

export function writeSave(d: SaveData) {
  try {
    localStorage.setItem(KEY, JSON.stringify(d));
  } catch {
    /* ignore */
  }
}
