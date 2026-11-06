import { useEffect, useRef, useState, type CSSProperties } from 'react';
import MenuStageBackdrop from './MenuStageBackdrop';
import { Dust, SparkleField, SunburstFX } from './Effects';
import CoinSprite from './CoinSprite';
import DiamondSprite from './DiamondSprite';
import { GameIcon, NavFrame, type IconName } from './GameIcons';
import { pistol } from '../art/pistol';
import { gunState } from '../art/kit';
import { PISTOL_METRICS } from '../weapons';
import { useLiteActive, useLiteAudio } from '../context';
import type { Save } from '../persist';

export type Destination = 'gun' | 'quest' | 'ready' | 'ranks' | 'settings' | 'play';
const SGA_MENU_NAV: { id: 'gun' | 'ranks' | 'ready' | 'setting'; label: string; icon: IconName; highlight?: boolean }[] = [
  { id: 'gun', label: 'GUN', icon: 'gun' }, { id: 'ranks', label: 'RANKS', icon: 'ranks' },
  { id: 'ready', label: 'READY!', icon: 'gift', highlight: true }, { id: 'setting', label: 'SETTING', icon: 'gear' },
];
const TL = {
  letter: (i: number) => ({ inD: 300 + i * 70, inDur: 750, outD: 40 + i * 30, outDur: 420 }),
  shot: (i: number) => ({ inD: [838, 943, 1052, 1157][i], inDur: 380, outD: 160 + i * 25, outDur: 460 }),
  buttons: (i: number) => ({ inD: 1350 + i * 80, inDur: 700, outD: 0, outDur: 480 }),
  nav: (i: number) => ({ inD: 1550 + i * 80, inDur: 650, outD: 20 + i * 45, outDur: 420 }),
};
const gunTiming = (_style: string) => ({ inD: 600, inDur: 3000, outD: 60, outDur: 600 });
const menuPlan = { title: Array<string>(11).fill('classic'), gun: 'combo', buttons: ['classic', 'classic'], nav: Array<string>(4).fill('classic'), k: 1 };
const theme = (): string => 'forest';

export function Menu({ save, leaving, onNavigate }: { save: Save; leaving: Destination | null; onNavigate(to: Destination): void }) {
  const active = useLiteActive(), audio = useLiteAudio();
  const [menuReady, setMenuReady] = useState(false);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null), weaponPivotRef = useRef<HTMLDivElement>(null);
  const gunAimRef = useRef<HTMLDivElement>(null), gunTiltRef = useRef<HTMLDivElement>(null);
  const menuLandscape = false, menuTheme = theme(), introReady = true, settingsOpen = false, playMenuExiting = false;
  const menuDeparture = leaving, menuPageTransition: { variant: string } | null = null, weaponFlight = false;
  const menuArea = (_name: string): CSSProperties => ({}), menuBodyStyle: CSSProperties = {};
  const perfectShotIconSet = 'flat';
  const gunBoxClass = 'h-[295px] w-[337px] max-w-full';
  const totalCoins = save.coins, diamonds = save.diamonds, bestLevel = 1, best = save.best;
  const readyQuestRewardCount = save.clears > 0 && !save.rewardClaimed ? 1 : 0;
  const startArsenalTransition = (_open: boolean) => onNavigate('gun');
  const openLevelMap = () => onNavigate('quest'), play = () => onNavigate('play');
  const openLeaderboardPage = () => onNavigate('ranks'), openQuestPage = () => onNavigate('ready'), openSettingsPage = () => onNavigate('settings');
  const planMotion = (animation: string, delay: number, duration: number, extra = '', sx?: number, exit = 'out-fade', exitD = 0, exitDur = 380) => ({
    className: `a ${leaving ? exit : animation} menu-motion ${extra}`,
    style: { '--d': `${leaving ? exitD * 0.78 : delay}ms`, '--dur': `${leaving ? exitDur * 0.78 : duration}ms`, ...(sx === undefined ? {} : { '--sx': sx }) } as CSSProperties,
  });
  const planStyleMotion = (style: string, t: { inD: number; inDur: number; outD: number; outDur: number }, classic: [string, string], extra = '', sx?: number) =>
    planMotion(style === 'combo' ? 'st-in-combo' : classic[0], t.inD, t.inDur, extra, sx, style === 'combo' ? 'st-out-combo' : classic[1], t.outD, t.outDur);

  useEffect(() => { const id = setTimeout(() => setMenuReady(true), 1700); return () => clearTimeout(id); }, []);
  useEffect(() => {
    const cv = previewCanvasRef.current, ctx = cv?.getContext('2d'); if (!cv || !ctx) return;
    const pw = 337, ph = 295, dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = pw * dpr; cv.height = ph * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, pw, ph);
    ctx.save(); ctx.translate(pw / 2, ph / 2);
    ctx.beginPath(); ctx.ellipse(0, 92, 59, 16, 0, 0, Math.PI * 2); ctx.fillStyle = 'rgba(0,0,0,0.44)'; ctx.fill();
    const sc = ph * 0.78 / PISTOL_METRICS.span; ctx.scale(sc, sc);
    const previous = gunState.sinceShot; gunState.sinceShot = 9;
    pistol(ctx, -PISTOL_METRICS.centerOffsetX, -PISTOL_METRICS.centerOffsetY, 0); gunState.sinceShot = previous; ctx.restore();
    // Same ink-centroid pivot as v1 so the sunburst centres on the visible pistol.
    try {
      const data = ctx.getImageData(0, 0, cv.width, cv.height).data; let weight = 0, px = 0, py = 0;
      for (let y = 0; y < cv.height; y += 2) for (let x = 0; x < cv.width; x += 2) { const a = data[(y * cv.width + x) * 4 + 3]; if (a < 160) continue; weight += a; px += (x + 0.5) * a; py += (y + 0.5) * a; }
      if (weight && weaponPivotRef.current) { weaponPivotRef.current.style.setProperty('--weapon-pivot-x', `${px / weight / dpr - pw / 2}px`); weaponPivotRef.current.style.setProperty('--weapon-pivot-y', `${py / weight / dpr - ph / 2}px`); }
    } catch { /* Canvas readback can be refused; the fallback is still centred. */ }
  }, []);

  return (
              <div data-page="menu" className={`gunhit-menu absolute inset-0 z-20 overflow-hidden text-white isolate ${active && introReady ? '' : 'slide-paused'} ${menuReady && introReady && !menuDeparture && !settingsOpen ? '' : 'pointer-events-none'} ${playMenuExiting && !menuDeparture ? 'sga-play-exit' : ''}`} data-menu-theme={menuTheme}>
            {/* Preserve the existing SGA menu world, stars, particles and theme lighting. */}
            <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
              {/* The menu world exits with the same zoom/blur dip as the reference
                  game, then re-enters when the menu is remounted after a page. */}
              <div
                {...(menuDeparture === 'play'
                  ? { className: 'absolute inset-0', style: {} as CSSProperties }
                  : planMotion('in-bg', 0, 1100, 'absolute inset-0', undefined, 'out-bg', 120, 700))}
              >
                <MenuStageBackdrop orientation="portrait" animated={active} />
              </div>
              {(menuTheme !== 'auto' && menuTheme !== 'forest') && (
                <div className={`absolute inset-0 ${menuLandscape ? 'bg-[radial-gradient(ellipse_at_50%_46%,rgba(125,211,252,.16),transparent_66%)]' : 'bg-[radial-gradient(ellipse_at_50%_46%,rgba(125,211,252,.08),transparent_68%)]'}`} />
              )}
              <div className={`absolute inset-0 ${menuLandscape ? 'opacity-95' : 'opacity-60'}`}>
                <Dust count={menuLandscape ? 20 : 14} />
                <SparkleField count={menuLandscape ? 16 : 10} spread={1.45} />
              </div>
              {/* Keep SGA's selectable world art, with a lighter top/bottom framing
                  in landscape so the sky keeps the vivid blue of the reference. */}
              <div
                className="pointer-events-none absolute inset-0"
                style={{
                  background: menuLandscape
                    ? 'linear-gradient(180deg, rgba(3,7,10,.16) 0%, rgba(3,7,10,.04) 13%, transparent 30%, transparent 80%, rgba(1,5,8,.30) 100%), radial-gradient(ellipse at 50% 46%, transparent 58%, rgba(0,0,0,.16) 100%)'
                    : 'linear-gradient(180deg, rgba(3,7,10,.42) 0%, rgba(3,7,10,.12) 13%, transparent 28%, transparent 76%, rgba(1,5,8,.54) 100%), radial-gradient(ellipse at 50% 46%, transparent 52%, rgba(0,0,0,.24) 100%)',
                }}
              />
            </div>

            <div {...planMotion('in-shake', 800 + 560 * 0.78, 380, 'absolute inset-0', undefined, '', 0, 0)}>
              <div className={`relative flex h-full ${menuLandscape ? '' : 'flex-col'}`} style={menuBodyStyle}>
              {/* SGA coin and diamond artwork stays intact, positioned like Perfect Shot's HUD. */}
              <div className={`relative z-10 flex shrink-0 items-center justify-end gap-3 ${menuLandscape ? 'px-4 pt-2' : 'px-5 pt-4'}`} style={menuArea('hud')}>
                <div {...planMotion('in-down', 150, 700, 'font-title flex items-center gap-1.5 text-xl text-amber-300 drop-shadow', undefined, 'out-up', 0, 480)}>
                  <span className="font-title tabular-nums font-black tracking-tight">{totalCoins}</span>
                  <CoinSprite size={25} className="drop-shadow-[0_0_5px_rgba(255,210,80,.7)]" />
                </div>
                <div {...planMotion('in-fade', 250, 700, 'h-8 w-px bg-white/20', undefined, 'out-fade', 0, 480)} />
                <div {...planMotion('in-down', 250, 700, 'font-title flex items-center gap-1 text-lg text-white drop-shadow', undefined, 'out-up', 60, 480)}>
                  <DiamondSprite size={24} fillRatio={0.92} />
                  {diamonds}
                </div>
              </div>

              {/* Perfect Shot's two-line title, type, bullet slash and staggered impact. */}
              <div className={`relative z-10 mt-1 flex shrink-0 flex-col items-center text-center ${menuLandscape ? 'justify-center' : ''}`} style={menuArea('title')}>
                <div className="relative flex flex-col items-center">
                  {!menuDeparture && <div className="mm-halo pointer-events-none absolute left-1/2 top-[46%] h-[180px] w-[360px] -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ animationDelay: `${2600 * menuPlan.k}ms` }} />}
                  <h1 className="font-title relative flex text-[min(15vw,72px)] leading-none tracking-wide text-[#3fdc72]" >
                    {!menuDeparture && <span aria-hidden className="mm-shine pointer-events-none absolute inset-0 z-10 flex" style={{ animationDelay: `${2800 * menuPlan.k}ms` }}>PERFECT</span>}
                    {'PERFECT'.split('').map((letter, i) => (
                      <span key={`${letter}-${i}`} className={planStyleMotion(menuPlan.title[i], TL.letter(i), ['in-letter', 'out-letter'], 'inline-block', i < 3 ? -1 : 1).className} style={{ ...planStyleMotion(menuPlan.title[i], TL.letter(i), ['in-letter', 'out-letter'], 'inline-block', i < 3 ? -1 : 1).style, textShadow: '0 2px 0 #23a34e, 0 4px 0 #1d8a42, 0 6px 0 #166f35, 0 8px 0 #0f5427, 0 14px 18px rgba(0,0,0,.55)' } as CSSProperties}>{letter}</span>
                    ))}
                  </h1>

                  <div className="relative mt-1 h-3 w-[68%]">
                    <div {...planMotion('in-slash', 800, 560, 'absolute inset-0', undefined, 'out-slash', 120, 380)} style={{ ...planMotion('in-slash', 800, 560, 'absolute inset-0', undefined, 'out-slash', 120, 380).style, filter: 'drop-shadow(0 0 5px rgba(255,255,255,.9)) drop-shadow(0 0 14px rgba(180,255,220,.6))' } as CSSProperties}>
                      <div className="absolute inset-y-[1px] left-0 right-0" style={{ clipPath: 'polygon(0 50%, 100% 0, 100% 100%)', background: 'linear-gradient(90deg,rgba(255,255,255,0),rgba(255,255,255,.18) 25%,rgba(255,255,255,.7) 68%,#fff 100%)' }} />
                      <div className="absolute left-[35%] right-0 top-1/2 h-[3px] -translate-y-1/2" style={{ clipPath: 'polygon(0 50%,100% 0,100% 100%)', background: 'linear-gradient(90deg,rgba(255,255,255,0),#fffbe6 80%)' }} />
                    </div>
                    <div {...planMotion('in-bullet', 800, 560, 'absolute top-1/2 z-10', undefined, 'out-bullet', 110, 460)} style={{ ...planMotion('in-bullet', 800, 560, 'absolute top-1/2 z-10', undefined, 'out-bullet', 110, 460).style, left: '92%' } as CSSProperties}>
                      <MenuBullet />
                    </div>
                  </div>

                  <h2 className="font-title relative -mt-1 flex text-[min(18vw,86px)] leading-none tracking-wider text-[#ffd23f]" >
                    {!menuDeparture && <span aria-hidden className="mm-shine pointer-events-none absolute inset-0 z-10 flex" style={{ animationDelay: `${3000 * menuPlan.k}ms` }}>SHOT</span>}
                    {'SHOT'.split('').map((letter, i) => (
                      <span key={`${letter}-${i}`} className={planStyleMotion(menuPlan.title[7 + i], TL.shot(i), ['in-slam', 'out-blast'], 'inline-block', i < 2 ? -1 : 1).className} style={{ ...planStyleMotion(menuPlan.title[7 + i], TL.shot(i), ['in-slam', 'out-blast'], 'inline-block', i < 2 ? -1 : 1).style, textShadow: '0 2px 0 #f0a81c, 0 4px 0 #e0901a, 0 6px 0 #c47414, 0 8px 0 #9c5a10, 0 14px 18px rgba(0,0,0,.55)' } as CSSProperties}>{letter}</span>
                    ))}
                  </h2>
                </div>

                <div {...planMotion('in-up', 1250, 600, 'relative z-10', undefined, 'out-fade', 80, 300)}>
                  <p className="font-title mt-2 flex items-center gap-3 text-base tracking-[0.12em] text-white drop-shadow-[0_2px_0_rgba(0,0,0,.5)]">
                    STAGE {bestLevel} <span className="inline-block h-2.5 w-2.5 rotate-45 bg-amber-400" /> SCORE {best}
                  </p>
                </div>
              </div>

              {/* Weapon showcase. The light behind the weapon is Gun Hit's own
                  sunburst (`SunburstFX`, the amber-ray burst this menu has
                  always used), never the reference menu's conic ray disc. */}
              <div data-menu-pistol-showcase aria-hidden="true" className={`pointer-events-none relative flex items-center justify-center ${menuLandscape ? '' : 'min-h-0 flex-1'}`} style={menuArea('gun')}>
                <div {...(menuDeparture === 'play'
                  ? {
                    // Only the captured flight frame replaces the menu weapon; without
                    // one (landscape, or a blocked capture) it stays on screen until
                    // the menu itself unmounts instead of blinking out early.
                    className: `relative z-10 ${gunBoxClass} ${weaponFlight ? 'opacity-0' : ''}`,
                    style: {} as CSSProperties,
                  }
                  : planStyleMotion(menuPlan.gun, gunTiming(menuPlan.gun), ['in-gun', 'out-spin'], `relative z-10 ${gunBoxClass}`, 1))}>
                  {/* No ring or shadow on the floor: the weapon stands on the
                      light of the sunburst alone. */}
                  {!menuDeparture && [18, 42, 64, 82].map((x, i) => <span key={x} className="mm-mote pointer-events-none absolute bottom-[14%] h-1.5 w-1.5 rounded-full bg-[#e0fbff]" style={{ left: `${x}%`, animationDelay: `${(3400 + i * 700) * menuPlan.k}ms` }} />)}
                  <div className="float relative h-full w-full" data-menu-gun>
                    <div ref={gunAimRef} className="relative h-full w-full" style={{ willChange: 'transform' }} data-menu-aim>
                    <div ref={weaponPivotRef} className="pointer-events-none absolute inset-0" aria-hidden="true">
                      <SunburstFX size={430} color="255,255,255" intensity={0.44} speed={32} core={false} stars={false} style={{ left: 'calc(50% + var(--weapon-pivot-x, 0px))', top: 'calc(50% + var(--weapon-pivot-y, 0px))' }} />
                      {!menuDeparture && menuPlan.gun === 'combo' && (
                        <div
                          aria-hidden="true"
                          className="menu-pop-burst -translate-x-1/2 -translate-y-1/2"
                          style={{
                            left: 'calc(50% + var(--weapon-pivot-x, 0px))',
                            top: 'calc(50% + var(--weapon-pivot-y, 0px))',
                            '--pop-delay': `${(gunTiming('combo').inD + gunTiming('combo').inDur * 0.48) * menuPlan.k}ms`,
                            '--pop-dur': `${gunTiming('combo').inDur * 0.26 * menuPlan.k}ms`,
                          } as CSSProperties}
                        >
                          {Array.from({ length: 12 }, (_, i) => (
                            <span key={i} className="menu-pop-ray" style={{ '--ray-angle': `${i * 30}deg` } as CSSProperties} />
                          ))}
                        </div>
                      )}
                    </div>
                    <div ref={gunTiltRef} className="relative" style={{ transformOrigin: '50% 78%', willChange: 'transform' }} data-menu-aim-tilt>
                    {/* The five zip weapons are live SVG: their glow, shimmer and
                        twinkle keep animating here instead of being baked. */}

                    <canvas ref={previewCanvasRef} style={{ width: '337px', height: '295px', maxWidth: '100%' }} className="block cursor-pointer drop-shadow-[0_10px_20px_rgba(0,0,0,.5)] transition-transform hover:scale-105" role="button" tabIndex={0} aria-label={'Buka koleksi senjata'} onClick={() => startArsenalTransition(true)} onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        audio.unlock();
                        startArsenalTransition(true);
                      }
                    }} />
                    </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Perfect Shot's glossy paired controls, wired to SGA actions. */}
              <div className={`relative z-10 flex shrink-0 justify-center gap-3 ${menuLandscape ? 'items-center px-4' : 'px-6'}`} style={menuArea('btns')}>
                <div {...planStyleMotion(menuPlan.buttons[0], TL.buttons(0), ['in-left', 'out-left'], 'w-[42%] max-w-[158px]', -1)}>
                  <button type="button" data-gloss="off" onClick={openLevelMap} className="press shine font-ui relative flex h-[54px] w-full items-center justify-center gap-1.5 rounded-2xl bg-gradient-to-b from-[#ff6a3d] to-[#e0331e] text-[20px] text-white shadow-[0_5px_0_#9c1f12,0_10px_18px_rgba(0,0,0,.4)]" style={{ '--shd': '2.4s' } as CSSProperties}>
                    <span className="absolute inset-x-3 top-1.5 h-5 rounded-xl bg-white/25" />
                    <GameIcon name="quest" set={perfectShotIconSet} mono={{ fill: '#fff', line: '#8f1d10' }} className="relative h-6 w-6" />
                    <span className="relative drop-shadow-[0_2px_0_rgba(0,0,0,.3)]">QUEST</span>
                  </button>
                </div>
                <div {...planStyleMotion(menuPlan.buttons[1], TL.buttons(1), ['in-right', 'out-right'], 'w-[42%] max-w-[158px]', 1)}>
                  <button type="button" data-gloss="off" onClick={play} className="press shine mm-breathe font-ui relative flex h-[54px] w-full items-center justify-center gap-1.5 rounded-2xl bg-gradient-to-b from-[#4cef6a] to-[#18b93a] text-[24px] text-white shadow-[0_5px_0_#0c7a22,0_10px_18px_rgba(0,0,0,.4)]">
                    <span className="absolute inset-x-3 top-1.5 h-5 rounded-xl bg-white/30" />
                    <span className="relative drop-shadow-[0_2px_0_rgba(0,0,0,.3)]">PLAY</span>
                    <GameIcon name="play" set={perfectShotIconSet} mono={{ fill: '#fff', line: '#0c6a22' }} className="relative h-7 w-7" />
                  </button>
                </div>
              </div>

              {(() => {
                const line = planMotion('in-line', 1500, 600, `relative z-10 mx-auto ${menuLandscape ? 'my-2' : 'my-4'} h-px w-[70%] bg-gradient-to-r from-transparent via-white/20 to-transparent`, undefined, 'out-line', 40, 380);
                return <div {...line} style={{ ...line.style, ...menuArea('line') }} />;
              })()}

              {/* Right game's four framed vector icons, retaining SGA menu destinations. */}
              <div className={`relative z-30 grid shrink-0 grid-cols-4 ${menuLandscape ? 'px-4 pb-2' : 'px-6 pb-5'} ${perfectShotIconSet === 'flat' ? 'gap-5' : 'gap-3'}`} style={menuArea('nav')}>
                {SGA_MENU_NAV.map((item, i) => (
                  <div key={item.id} {...planStyleMotion(menuPlan.nav[i], TL.nav(i), ['in-pop', 'out-down'], 'flex justify-center', i < 2 ? -1 : 1)}>
                    <button type="button" data-gloss="off" onClick={() => {
                      if (item.id === 'gun') startArsenalTransition(true);
                      else if (item.id === 'ranks') openLeaderboardPage();
                      else if (item.id === 'ready') openQuestPage();
                      else openSettingsPage();
                    }} className="press flex w-full flex-col items-center gap-1.5">
                      <span className={`relative w-full ${perfectShotIconSet === 'flat' ? 'max-w-[50px]' : 'max-w-[66px]'}`}>
                        <NavFrame set={perfectShotIconSet} name={item.icon} active={!!item.highlight}>
                          <span className={`block h-full w-full ${item.highlight ? 'bounce-soft' : ''}`}>
                            <GameIcon name={item.icon} set={perfectShotIconSet} className="h-full w-full drop-shadow-[0_3px_2px_rgba(0,0,0,.45)]" />
                          </span>
                        </NavFrame>
                        {item.id === 'ready' && readyQuestRewardCount > 0 && (
                          <span className="font-title absolute -right-1.5 -top-1 grid h-6 min-w-6 place-items-center rounded-full bg-[#ef4444] px-1 text-[12px] text-white shadow-[0_2px_0_#7f1d1d] ring-2 ring-white">
                            {readyQuestRewardCount}
                          </span>
                        )}
                      </span>
                      <span className={`font-title tracking-wide drop-shadow-[0_2px_0_rgba(0,0,0,.6)] ${perfectShotIconSet === 'flat' ? 'text-[10.5px]' : 'text-sm'} ${perfectShotIconSet === 'flat' ? 'text-[#8fd0f2]' : item.highlight ? 'text-yellow-300' : 'text-white'}`}>
                        {item.label}
                      </span>
                    </button>
                  </div>
                ))}
              </div>
              </div>
            </div>
          </div>
  );
}

function MenuBullet() {
  return <div className="relative h-[18px] w-[58px] drop-shadow-[0_0_8px_rgba(255,220,140,.75)]"><div className="b3d-case absolute left-[3px] top-0 h-full w-[58%] overflow-hidden rounded-l-[3px] shadow-[inset_0_0_0_1px_rgba(70,40,0,.55)]" /><div className="absolute -left-[1px] -top-[1px] h-[20px] w-[6px] rounded-[2px] bg-gradient-to-b from-[#fff2b0] via-[#d49a2a] to-[#5a3505] shadow-[inset_0_0_0_1px_rgba(60,30,0,.6)]" /><div className="b3d-band absolute left-1/2 top-0 h-full w-[7%]" /><div className="b3d-tip absolute left-[56%] top-[1px] h-[16px] w-[44%] overflow-hidden shadow-[inset_0_0_0_1px_rgba(70,25,5,.55)]" style={{ borderRadius: '0 75% 75% 0 / 0 50% 50% 0' }}><span className="b3d-glint absolute inset-x-0 h-[3px] bg-white/80 blur-[0.5px]" /></div><div className="pointer-events-none absolute left-[5%] right-[12%] top-[20%] h-[2px] rounded-full bg-white/85" /><div className="pointer-events-none absolute bottom-[12%] left-[5%] right-[16%] h-[2px] rounded-full bg-black/35" /></div>;
}
