/** Versioned, isolated save. Nothing here reads or writes any v1 storage key. */
import { FREE_WEAPONS, WEAPONS } from './weapons';

export interface SaveData {
  v: 1;
  coins: number;
  best: number;
  bestLevel: number;
  owned: string[];
  gun: string;
  muted: boolean;
  cleared: number;
  hits: number;
  perfects: number;
  maxCombo: number;
  /** Best rating for a campaign stage; laps share the same 30-stage map. */
  stars: Record<string, number>;
}

export const SAVE_KEY = 'perfect-shot.v2.save';

export function defaultSave(): SaveData {
  return {
    v: 1, coins: 0, best: 0, bestLevel: 1, owned: [...FREE_WEAPONS], gun: 'knife',
    muted: false, cleared: 0, hits: 0, perfects: 0, maxCombo: 0, stars: {},
  };
}

function natural(v: unknown, fallback = 0): number {
  return typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.min(999_999_999, Math.floor(v))) : fallback;
}

/** Validate even well-formed JSON: negative coins and unknown guns aren't saves. */
export function normaliseSave(value: unknown): SaveData {
  const base = defaultSave();
  if (!value || typeof value !== 'object') return base;
  const p = value as Partial<SaveData>;
  if (p.v !== 1) return base;
  const known = new Set(WEAPONS.map((w) => w.id));
  const owned = [...new Set([
    ...FREE_WEAPONS,
    ...(Array.isArray(p.owned) ? p.owned.filter((id): id is string => typeof id === 'string' && known.has(id)) : []),
  ])];
  const stars: Record<string, number> = {};
  if (p.stars && typeof p.stars === 'object') {
    for (const [key, value] of Object.entries(p.stars)) {
      if (/^([1-9]|[12][0-9]|30)$/.test(key) && natural(value) >= 1) stars[key] = Math.min(3, natural(value));
    }
  }
  return {
    v: 1, coins: natural(p.coins), best: natural(p.best), bestLevel: Math.max(1, natural(p.bestLevel, 1)),
    owned, gun: typeof p.gun === 'string' && owned.includes(p.gun) ? p.gun : 'knife',
    muted: typeof p.muted === 'boolean' ? p.muted : false,
    cleared: natural(p.cleared), hits: natural(p.hits), perfects: natural(p.perfects),
    maxCombo: natural(p.maxCombo), stars,
  };
}

/** The property itself can throw in a blocked third-party frame. */
export function loadSave(): SaveData {
  try {
    const raw = globalThis.localStorage?.getItem(SAVE_KEY);
    return raw ? normaliseSave(JSON.parse(raw)) : defaultSave();
  } catch { return defaultSave(); }
}

export function saveSave(data: SaveData): void {
  try { globalThis.localStorage?.setItem(SAVE_KEY, JSON.stringify(data)); }
  catch { /* Private mode or no storage: the in-memory game still works. */ }
}

export function clearSave(): void {
  try { globalThis.localStorage?.removeItem(SAVE_KEY); } catch { /* unavailable */ }
}

export type PurchaseResult = 'bought' | 'equipped' | 'insufficient' | 'unknown';

/** Pure wallet transaction; the caller chooses when to persist and play a cue. */
export function purchase(data: SaveData, id: string): PurchaseResult {
  const weapon = WEAPONS.find((w) => w.id === id);
  if (!weapon) return 'unknown';
  if (data.owned.includes(id)) { data.gun = id; return 'equipped'; }
  if (data.coins < weapon.price) return 'insufficient';
  data.coins -= weapon.price;
  data.owned.push(id);
  data.gun = id;
  return 'bought';
}
