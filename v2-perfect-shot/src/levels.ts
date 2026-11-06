import type { FlatName } from './ui/FlatIcons';

/** A physical one-row table: there are no locked, hidden or unlockable later levels. */
export const LEVEL_1 = Object.freeze({
  n: 1 as const, name: 'ORANGE', mode: 'classic' as const,
  ammo: 5, base: 1.5 + 0.11, pattern: 'constant' as const,
  radius: Math.round(106 * 0.9), style: 'orange' as const,
  old: 0, spikes: 0,
});
export const LEVELS = Object.freeze([LEVEL_1]);
export type TargetKind = 'orange';
export function levelConfig(_n = 1) { return { target: 'orange' as const }; }
export function makeLevel1(random = Math.random) {
  return { ...LEVEL_1, dir: random() < 0.5 ? -1 : 1, coins: (random() < 0.65 ? 1 : 0) + (random() < 0.3 ? 1 : 0) };
}

// Original map layout types/timing. Only a NORMAL level-1 record is shipped.
export type StageType = 'normal' | 'special' | 'boss';
export type StageState = 'done' | 'current' | 'locked';
export type StageBase = { n: number; type: StageType; name: string; icon: FlatName };
export const TOTAL = 1;
export const STAGES: readonly StageBase[] = [{ n: 1, type: 'normal', name: 'Gentong', icon: 'target' }];
export const stageState = (_n: number, _cur: number): StageState => 'current';
export const worldX = (n: number) => 0.34 * Math.sin((n - 1) * 0.9);
export const pillarW = (_t: StageType) => 96;
export const pillarH = (_n: number, _t: StageType) => 170;

const k = 0.78;
const time = (d: number, dur: number, land?: number) => ({ d: Math.round(d * k), dur: Math.round(dur * k), ...(land === undefined ? {} : { land }) });
export const QUEST_IN = {
  water: time(0, 900), cam: time(0, 1500), header: time(150, 600),
  chip: (i: number) => time(380 + i * 80, 520),
  pillar: (i: number) => time(260 + i * 95, 680, 0.62),
  dot: (i: number) => time(400 + i * 95, 320),
  avatar: time(1000, 850, 0.5), bottom: time(1100, 620), ready: Math.round(1250 * k),
};
export const QUEST_OUT = {
  avatar: time(0, 420), pillar: (i: number) => time(40 + i * 32, 400),
  header: time(60, 380), bottom: time(0, 380), cam: time(120, 520), total: Math.round(560 * k),
};
