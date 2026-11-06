export const SAVE_KEY = 'perfect-shot.v2.lite.save';
export interface Run { score: number; coins: number; won: boolean; at: number }
export interface Save {
  schema: 1; weapon: 'pistol'; stage: 1; coins: number; diamonds: number;
  best: number; clears: number; stars: number; sound: boolean; volume: number;
  rewardClaimed: boolean; runs: Run[];
}
export interface StorageLike { getItem(key: string): string | null; setItem(key: string, value: string): void }
const nat = (n: unknown, fallback = 0) => typeof n === 'number' && Number.isFinite(n) ? Math.min(999999999, Math.max(0, Math.floor(n))) : fallback;
export const freshSave = (): Save => ({ schema: 1, weapon: 'pistol', stage: 1, coins: 120, diamonds: 0, best: 0, clears: 0, stars: 0, sound: true, volume: 0.65, rewardClaimed: false, runs: [] });
/** Never read, migrate or reset v1's keys (or the rejected Full Arcade save). */
export function loadSave(store?: StorageLike): Save {
  const base = freshSave();
  try {
    const raw = store?.getItem(SAVE_KEY);
    if (!raw) return base;
    const d = JSON.parse(raw);
    if (!d || d.schema !== 1) return base;
    return {
      ...base,
      coins: nat(d.coins, 120), diamonds: nat(d.diamonds), best: nat(d.best), clears: nat(d.clears),
      stars: Math.min(3, nat(d.stars)), sound: typeof d.sound === 'boolean' ? d.sound : true,
      volume: typeof d.volume === 'number' && Number.isFinite(d.volume) ? Math.max(0, Math.min(1, d.volume)) : base.volume,
      rewardClaimed: d.rewardClaimed === true,
      runs: Array.isArray(d.runs) ? d.runs.slice(0, 20).filter((r: unknown): r is Run => !!r && typeof r === 'object' && typeof (r as Run).won === 'boolean').map((r: Run) => ({ score: nat(r.score), coins: nat(r.coins), won: r.won, at: natDate(r.at) })) : [],
      // stage/weapon are deliberately NOT restored from JSON. This package is always 1/PISTOL.
    };
  } catch { return base; }
}
const natDate = (n: unknown) => typeof n === 'number' && Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
export function storeSave(save: Save, store?: StorageLike): void {
  try { store?.setItem(SAVE_KEY, JSON.stringify({ ...save, schema: 1, stage: 1, weapon: 'pistol' })); } catch { /* Private/offline browsing must still work. */ }
}
export function bankRun(save: Save, run: Run): Save {
  return { ...save, stage: 1, weapon: 'pistol', coins: save.coins + run.coins, best: Math.max(save.best, run.score), clears: save.clears + Number(run.won), stars: run.won ? 3 : save.stars, runs: [run, ...save.runs].slice(0, 20) };
}
export function browserStorage(): StorageLike | undefined { try { return globalThis.localStorage; } catch { return undefined; } }
