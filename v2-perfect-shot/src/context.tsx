import { createContext, useContext } from 'react';
import type { Save } from './persist';
import { freshSave } from './persist';
import { LiteAudio } from './audio';
export const LiteActiveContext = createContext(true);
export const LiteSaveContext = createContext<Save>(freshSave());
export const useLiteActive = () => useContext(LiteActiveContext);
/** Adapter for the copied v1 map; its progress is v2's isolated one-level save. */
export function useGame() { const s = useContext(LiteSaveContext); return { stage: 1, stars: { 1: s.stars } as Record<number, number> }; }

export const LiteAudioContext = createContext(new LiteAudio());
export const useLiteAudio = () => useContext(LiteAudioContext);
