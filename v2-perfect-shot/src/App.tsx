import { forwardRef, useCallback, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState } from 'react';
import { W, H } from './config';
import { PistolGame, type GameEvent } from './game';
import { LiteAudio } from './audio';
import { LiteActiveContext, LiteAudioContext, LiteSaveContext } from './context';
import { bankRun, browserStorage, loadSave, storeSave, type Save } from './persist';
import { Menu, type Destination } from './ui/Menu';
import { GunPage } from './ui/GunPage';
import { QuestMap } from './ui/QuestMap';
import { GameBoard } from './ui/GameBoard';
import { RankPage, ReadyPage, ResultPage, SettingsPage } from './ui/Pages';
import css from './lite.css?raw';

export interface LiteHandle { back(): boolean }
type View = 'menu' | 'gun' | 'quest' | 'ranks' | 'ready' | 'settings' | 'play';
/** One implementation for the embedded V2 and the portable ZIP. V1 is never imported. */
const PerfectShotLite = forwardRef<LiteHandle, { active?: boolean }>(function PerfectShotLite({ active = true }, handle) {
  const shellRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [save, setSave] = useState(() => loadSave(browserStorage()));
  const [view, setView] = useState<View>('menu');
  const [leaving, setLeaving] = useState<Destination | null>(null);
  const [paused, setPaused] = useState(false);
  const [visible, setVisible] = useState(() => typeof document === 'undefined' || !document.hidden);
  const [game, setGame] = useState<PistolGame | null>(null);
  const [result, setResult] = useState<{ won: boolean; score: number; coins: number } | null>(null);
  const [audio] = useState(() => new LiteAudio());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resultTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const live = active && visible;

  useLayoutEffect(() => {
    const element = shellRef.current; if (!element) return;
    const fit = () => { const r = element.getBoundingClientRect(); if (r.width > 0 && r.height > 0) setScale(Math.min(r.width / W, r.height / H)); };
    fit(); const resize = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(fit); resize?.observe(element);
    window.addEventListener('resize', fit); return () => { resize?.disconnect(); window.removeEventListener('resize', fit); };
  }, []);
  useEffect(() => { storeSave(save, browserStorage()); audio.configure(save.sound, save.volume); }, [save, audio]);
  useEffect(() => { audio.setActive(live); }, [live, audio]);
  useEffect(() => {
    const visibility = () => { setVisible(!document.hidden); if (document.hidden && view === 'play' && !result) setPaused(true); };
    document.addEventListener('visibilitychange', visibility);
    return () => document.removeEventListener('visibilitychange', visibility);
  }, [view, result]);
  useEffect(() => () => { audio.destroy(); if (timer.current) clearTimeout(timer.current); if (resultTimer.current) clearTimeout(resultTimer.current); }, [audio]);

  const start = useCallback(() => {
    if (timer.current) clearTimeout(timer.current); if (resultTimer.current) clearTimeout(resultTimer.current);
    audio.unlock(); setGame(new PistolGame()); setResult(null); setPaused(false); setLeaving(null); setView('play');
  }, [audio]);
  const go = useCallback((to: View) => {
    if (timer.current) clearTimeout(timer.current); if (resultTimer.current) clearTimeout(resultTimer.current);
    setLeaving(null); setPaused(false); setResult(null); setGame(null); setView(to);
  }, []);
  const navigate = (to: Destination) => {
    if (!live || leaving) return; audio.unlock(); audio.tap(); setLeaving(to);
    timer.current = setTimeout(() => { if (to === 'play') start(); else go(to); }, to === 'play' ? 180 : 380);
  };
  const back = useCallback((): boolean => {
    if (!live) return false;
    if (leaving) { if (timer.current) clearTimeout(timer.current); setLeaving(null); return true; }
    if (paused) { setPaused(false); return true; }
    if (view === 'play') { if (result || game?.phase === 'clear' || game?.phase === 'over') go('menu'); else setPaused(true); return true; }
    if (view !== 'menu') { go('menu'); return true; }
    return false;
  }, [live, leaving, paused, view, result, game, go]);
  useImperativeHandle(handle, () => ({ back }), [back]);
  const fire = () => { if (live && !paused && !result && !document.hidden) { audio.unlock(); game?.fire(); } };
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (!live || e.repeat || e.altKey || e.ctrlKey || e.metaKey) return;
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); back(); return; }
      const target = e.target as HTMLElement | null;
      if (target && /^(INPUT|SELECT|TEXTAREA|BUTTON|A)$/.test(target.tagName)) return;
      if ((e.code === 'Space' || e.key === ' ') && view === 'play' && !paused && !result && !document.hidden) { e.preventDefault(); e.stopPropagation(); audio.unlock(); game?.fire(); }
    };
    window.addEventListener('keydown', key); return () => window.removeEventListener('keydown', key);
  }, [live, view, paused, result, game, back, audio]);
  const onEvent = (e: GameEvent) => {
    if (e === 'shot') audio.shot(); else if (e === 'hit') audio.hit(); else if (e === 'coin') audio.coin();
    else if (game && (e === 'clear' || e === 'fail')) {
      if (e === 'clear') audio.clear(); else audio.fail();
      const run = { won: e === 'clear', score: game.score, coins: game.coins, at: Date.now() };
      setSave(previous => bankRun(previous, run));
      resultTimer.current = setTimeout(() => { setPaused(false); setResult(run); }, e === 'clear' ? 850 : 600);
    }
  };
  const update = (patch: Partial<Save>) => setSave(s => ({ ...s, ...patch, stage: 1, weapon: 'pistol' }));

  return (
    <div ref={shellRef} data-perfect-shot-lite className="ps-lite-shell" style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', background: '#05080c' }}>
      <style>{css}</style>
      <LiteAudioContext.Provider value={audio}><LiteSaveContext.Provider value={save}><LiteActiveContext.Provider value={live && !paused}>
        <div className="ps-lite" data-view={paused ? 'pause' : result ? 'result' : view} data-active={live ? 'true' : 'false'} style={{ position: 'absolute', width: W, height: H, left: '50%', top: '50%', marginLeft: -W / 2, marginTop: -H / 2, transform: `scale(${scale})`, transformOrigin: 'center', overflow: 'hidden' }}>
          {(view === 'menu' || view === 'settings') && <Menu save={save} leaving={leaving} onNavigate={navigate} />}
          {view === 'gun' && <GunPage save={save} onBack={() => go('menu')} />}
          {view === 'quest' && <QuestMap leaving={false} progress={{ stage: 1, stars: { 1: save.stars } }} onBack={() => go('menu')} onPlay={(_e, n) => { if (n === 1) start(); }} />}
          {view === 'ranks' && <RankPage save={save} onBack={() => go('menu')} />}
          {view === 'ready' && <ReadyPage save={save} onBack={() => go('menu')} onClaim={() => { if (save.clears > 0 && !save.rewardClaimed) { audio.coin(); update({ coins: save.coins + 20, rewardClaimed: true }); } }} />}
          {view === 'settings' && <SettingsPage save={save} paused={false} onBack={() => go('menu')} onMenu={() => go('menu')} onChange={update} />}
          {view === 'play' && game && <>
            <GameBoard game={game} active={live && !paused && !result} onEvent={onEvent} onFire={fire} />
            {!result && !paused && game.phase !== 'clear' && game.phase !== 'over' && <button type="button" data-action="pause" onClick={() => setPaused(true)} aria-label="Pause" title="Pengaturan permainan / Pause" className="absolute right-2.5 top-[62px] z-30 flex h-10 w-10 items-center justify-center rounded-2xl border border-white/25 bg-[#0a1d28]/85 text-lg text-white shadow-[0_6px_18px_rgba(0,0,0,0.58)] backdrop-blur-sm transition hover:scale-105 hover:border-cyan-200/70 hover:bg-[#133244] active:scale-95">⚙️</button>}
            {paused && <SettingsPage save={save} paused onBack={() => setPaused(false)} onMenu={() => go('menu')} onChange={update} />}
            {result && <ResultPage {...result} onReplay={start} onMenu={() => go('menu')} onQuest={() => go('quest')} />}
          </>}
        </div>
      </LiteActiveContext.Provider></LiteSaveContext.Provider></LiteAudioContext.Provider>
    </div>
  );
});
export default PerfectShotLite;
