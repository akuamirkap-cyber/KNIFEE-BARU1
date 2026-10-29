import { useEffect, useRef, useState } from 'react';
import { Game } from './game/Game';
import { savedValues, storage } from './game/safeStorage';
import { setMasterVolume, setMuted, sfx } from './game/audio';
import type { BossType } from './game/bossRoster';
import { bossXpReward, getPlayerProgress } from './game/playerProgress';
import { sfx4 } from './game/sfx4';
import { sfx3 } from './game/sfx3';
import { getWeapon, isWeaponUnlocked, WEAPONS, type WeaponId } from './game/weapons';
import { useSlideActive } from '../shared/SlideActivity';
import { Burst, Dust, Flare, Shockwave, SparkleField, SunburstFX } from '../knife-hit/components/Effects';
import { gunSunburstColor } from './game/sunburstPalette';
import { drawGunCentered } from './game/art/drawCentered';
import { getGunMetrics } from './game/art/metrics';
import { juicyAudio } from '../../utils/juicyAudio';
import DiamondSprite from '../shared/DiamondSprite';
import CoinSprite from '../shared/CoinSprite';
import { MILESTONES, QUESTS, type Quest, type QuestState } from './game/quests';
import { GUN_HIT_MAP_MAX_LEVEL } from './game/stageMap';
import Arsenal from './components/Arsenal';
import QuestModal from './components/QuestModal';
import LeaderboardModal from './components/LeaderboardModal';
import { BossDefeatedModal } from './components/BossDefeatedModal';
import { BossGiftBoxModal } from './components/BossGiftBoxModal';
import StarBuffModal from './components/StarBuffModal';
import LevelMap from './components/LevelMap';
import MenuEnvironment, { type MenuEnvironmentTheme } from './components/MenuEnvironment';
import { SGA_SPEED_OPTIONS, formatSgaSpeed, getSavedSgaSpeed } from './game/gameSpeed';
import { useSgaGameSpeed } from './utils/useSgaGameSpeed';
import { SGA_BG_THEMES, getSavedSgaBgTheme } from './game/backgroundThemes';
import { useSgaBgTheme } from './utils/useSgaBgTheme';
import { getFast2DContext, getOptimalCanvasDpr } from './utils/mobilePerf';

type Screen = 'menu' | 'playing' | 'over';

const LS = {
  best: 'gunhit_best',
  bestLevel: 'gunhit_best_level',
  coins: 'gunhit_coins',
  diamonds: 'gunhit_diamonds',
  weapon: 'gunhit_weapon',
  owned: 'gunhit_owned_weapons',
  rareOwned: 'gunhit_rare_owned',
  quests: 'gunhit_quests_state',
  playerXp: 'gunhit_player_xp',
  playerLevel: 'gunhit_player_level',
  menuTheme: 'gunhit_menu_theme',
  volume: 'gunhit_volume',
};

const initialSoundVolume = (): number => {
  const saved = storage.getItem(LS.volume);
  if (saved === null) return 1;
  const parsed = Number(saved);
  return Number.isFinite(parsed) ? Math.max(0, Math.min(1, parsed)) : 1;
};

const num = (k: string) => Number(storage.getItem(k) || 0);
const coinsInBank = () => {
  const saved = storage.getItem(LS.coins);
  return saved === null ? 120 : Number(saved) || 0;
};
const diamondsInBank = () => Number(storage.getItem(LS.diamonds) || 0) || 0;
const ownedWeaponIds = (): string[] => {
  const normalOwned: string[] = [];
  try {
    const saved = JSON.parse(storage.getItem(LS.owned) || '[]');
    if (Array.isArray(saved)) normalOwned.push(...saved.filter((id): id is string => typeof id === 'string' && WEAPONS.some(w => w.id === id && w.rarity !== 'LANGKA')));
  } catch { /* collection save is optional */ }
  try {
    const boughtRare = JSON.parse(storage.getItem(LS.rareOwned) || '[]');
    if (Array.isArray(boughtRare)) normalOwned.push(...boughtRare.filter((id): id is string => typeof id === 'string' && WEAPONS.some(w => w.id === id && w.rarity === 'LANGKA')));
  } catch { /* collection save is optional */ }
  return [...new Set(normalOwned)];
};
const initialWeapon = (): WeaponId => {
  const saved = getWeapon(storage.getItem(LS.weapon) || 'pistol');
  return isWeaponUnlocked(saved, ownedWeaponIds()) ? saved.id : 'pistol';
};

const getInitialQuests = (): QuestState => {
  const defaults: QuestState = {
    claimed: [], milestonesClaimed: [], maxCombo: 0,
    totalCoinsCollected: num(LS.coins), highestScore: num(LS.best), highestLevel: num(LS.bestLevel) || 1,
    stagesWon: 0, bossesDefeated: 0, boxesOpened: 0, weaponEquips: 0, shotsFired: 0,
    highestPlayerLevel: Math.max(Number(storage.getItem(LS.playerLevel) || 1) || 1, getPlayerProgress(num(LS.playerXp)).level),
  };
  try {
    const saved = JSON.parse(storage.getItem(LS.quests) || 'null');
    if (saved && typeof saved === 'object') {
      const count = (value: unknown, fallback = 0) => {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : fallback;
      };
      const validQuestIds = new Set(QUESTS.map(q => q.id));
      return {
        ...defaults,
        claimed: Array.isArray(saved.claimed) ? saved.claimed.filter((id: unknown): id is string => typeof id === 'string' && validQuestIds.has(id)) : [],
        milestonesClaimed: Array.isArray(saved.milestonesClaimed) ? saved.milestonesClaimed.filter((value: unknown): value is number => [5, 10, 20].includes(Number(value))).map(Number) : [],
        maxCombo: count(saved.maxCombo),
        totalCoinsCollected: count(saved.totalCoinsCollected, defaults.totalCoinsCollected),
        highestScore: count(saved.highestScore, defaults.highestScore),
        highestLevel: Math.max(1, count(saved.highestLevel, defaults.highestLevel)),
        stagesWon: count(saved.stagesWon),
        bossesDefeated: count(saved.bossesDefeated),
        boxesOpened: count(saved.boxesOpened),
        weaponEquips: count(saved.weaponEquips),
        shotsFired: count(saved.shotsFired),
        highestPlayerLevel: Math.max(defaults.highestPlayerLevel, count(saved.highestPlayerLevel, defaults.highestPlayerLevel)),
      };
    }
  } catch { /* migrate older or malformed quest saves from defaults */ }
  return defaults;
};

/**
 * Slide 1 mounts only once its saved coins/weapon/collection can be read.
 *
 * In a frame that refuses storage the page shim restores them from IndexedDB or
 * `window.name`, which takes a tick; rendering early would freeze the defaults
 * into state and the restored values would never show up. When storage works
 * the tracker answers `true` immediately, so there is no waiting state at all.
 */
function useSavedValuesReady(): boolean {
  const [ready, setReady] = useState(() => savedValues.isReady());
  useEffect(() => {
    if (ready) return;
    const unsubscribe = savedValues.subscribe(() => setReady(true));
    // The restore can land between the render and this effect; without this
    // second look the slide would sit on the waiting shell for good.
    if (savedValues.isReady()) setReady(true);
    return unsubscribe;
  }, [ready]);
  return ready;
}

export default function App({ onExit }: { onExit?: () => void }) {
  const ready = useSavedValuesReady();
  // Same shell the game paints, so the wait never flashes white.
  if (!ready) return <div className="h-full w-full bg-[#0b1418]" aria-busy="true" />;
  return <GunHitGame onExit={onExit} />;
}

function GunHitGame({ onExit }: { onExit?: () => void }) {
  const active = useSlideActive();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<Game | null>(null);

  const [screen, setScreen] = useState<Screen>('menu');
  const screenRef = useRef<Screen>(screen);
  screenRef.current = screen;
  const [mapOpen, setMapOpen] = useState(false);
  const startingLevelRef = useRef(1);
  const [transitioning, setTransitioning] = useState(false);
  const [transText, setTransText] = useState('READY?');
  const [transitionStep, setTransitionStep] = useState<0 | 1 | 2>(0);

  const [result, setResult] = useState({ score: 0, level: 1, coins: 0, newBest: false });
  const [displayScore, setDisplayScore] = useState(0);

  const [best, setBest] = useState(() => num(LS.best));
  const [bestLevel, setBestLevel] = useState(() => Math.max(1, num(LS.bestLevel)));
  const [totalCoins, setTotalCoins] = useState(coinsInBank);
  const [diamonds, setDiamonds] = useState(diamondsInBank);
  const [diamondToast, setDiamondToast] = useState<{ amount: number; large: boolean; id: number } | null>(null);
  const [diamondFlight, setDiamondFlight] = useState<{ amount: number; x: number; y: number; id: number } | null>(null);
  const diamondFlightRef = useRef<HTMLDivElement>(null);
  const [diamondReveal, setDiamondReveal] = useState<{ id: number; amount: number } | null>(null);
  const [diamondHudMode, setDiamondHudMode] = useState(false);
  const [weaponCelebration, setWeaponCelebration] = useState<{ weaponId: WeaponId; id: number } | null>(null);

  const [questState, setQuestState] = useState<QuestState>(getInitialQuests);
  const questStateRef = useRef(questState);
  /**
   * Shots are accumulated purely in memory (`pendingShotsRef`) during active
   * shooting so firing NEVER triggers a React tree re-render or a synchronous
   * `JSON.stringify` / `storage.setItem` write mid-frame. Pending shots merge
   * and persist automatically at stage boundaries, when leaving gameplay, on
   * tab hide, or on unmount.
   */
  const pendingShotsRef = useRef(0);
  const questWriteTimerRef = useRef<number | undefined>(undefined);

  const [muted, setMutedState] = useState(false);
  const [soundVolume, setSoundVolumeState] = useState<number>(initialSoundVolume);
  const [gameSpeed, setGameSpeed] = useSgaGameSpeed();
  const [menuTheme, setMenuTheme] = useSgaBgTheme();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [inGameSettingsOpen, setInGameSettingsOpen] = useState(false);
  const [arsenalOpen, setArsenalOpen] = useState(false);
  const [questOpen, setQuestOpen] = useState(false);
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);

  // Boss Defeated celebration modal state (Screenshot 2)
  const [bossDefeatedData, setBossDefeatedData] = useState<{
    name: string;
    bossType: BossType;
    level: number;
    coins: number;
    playerLevel: number;
    xpBefore: number;
    xpProgress: number;
    xpGained: number;
    leveledUp: boolean;
  } | null>(null);
  const [bonusStageOpen, setBonusStageOpen] = useState(false);
  const [bonusAfterBoss, setBonusAfterBoss] = useState<{ stage: number; bossName: string }>({ stage: 5, bossName: 'BOSS' });
  const [starBuffOpen, setStarBuffOpen] = useState(false);
  const [starBuffTreasure, setStarBuffTreasure] = useState(false);

  const [weapon, setWeaponState] = useState<WeaponId>(initialWeapon);

  useEffect(() => {
    const progress = getPlayerProgress(num(LS.playerXp));
    storage.setItem(LS.playerXp, String(Math.max(0, num(LS.playerXp))));
    storage.setItem(LS.playerLevel, String(progress.level));
  }, []);

  // ---------- cheat key: C = semua gembok otomatis terbuka ----------
  const [cheatToast, setCheatToast] = useState<string | null>(null);
  const [cheatNonce, setCheatNonce] = useState(0);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key.toLowerCase() !== 'c') return;
      const normal = WEAPONS.filter((w) => w.rarity !== 'LANGKA').map((w) => w.id);
      const rare = WEAPONS.filter((w) => w.rarity === 'LANGKA').map((w) => w.id);
      storage.setItem(LS.owned, JSON.stringify(normal));
      storage.setItem(LS.rareOwned, JSON.stringify(rare));
      storage.setItem(LS.bestLevel, String(GUN_HIT_MAP_MAX_LEVEL));
      setBestLevel(GUN_HIT_MAP_MAX_LEVEL);
      saveQuests({
        ...questStateRef.current,
        claimed: QUESTS.map((q) => q.id),
        milestonesClaimed: MILESTONES.map((m) => m.count),
      });
      setCheatNonce((n) => n + 1);
      sfx.unlock();
      setCheatToast('🔓 SEMUA GEMBOK TERBUKA!');
      window.setTimeout(() => setCheatToast(null), 2400);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const mergePendingShots = (qs: QuestState): QuestState => {
    const pending = pendingShotsRef.current;
    if (pending <= 0) return qs;
    pendingShotsRef.current = 0;
    return { ...qs, shotsFired: qs.shotsFired + pending };
  };

  // Sync quests to LS without forcing mid-gameplay React re-renders
  const saveQuests = (qs: QuestState, syncReact = screenRef.current !== 'playing') => {
    const merged = mergePendingShots(qs);
    questStateRef.current = merged;
    if (syncReact) {
      if (questWriteTimerRef.current !== undefined) {
        window.clearTimeout(questWriteTimerRef.current);
        questWriteTimerRef.current = undefined;
      }
      setQuestState(merged);
      storage.setItem(LS.quests, JSON.stringify(merged));
      return;
    }
    if (questWriteTimerRef.current === undefined) {
      questWriteTimerRef.current = window.setTimeout(() => {
        questWriteTimerRef.current = undefined;
        storage.setItem(LS.quests, JSON.stringify(questStateRef.current));
      }, 120);
    }
  };

  const depositCoins = (amount: number, syncReact = screenRef.current !== 'playing') => {
    const total = coinsInBank() + amount;
    storage.setItem(LS.coins, String(total));
    if (syncReact) setTotalCoins(total);
    return total;
  };

  const chooseWeapon = (id: WeaponId) => {
    if (getWeapon(id).id !== id || !isWeaponUnlocked(getWeapon(id), ownedWeaponIds())) return;
    const changed = id !== weapon;
    setWeaponState(id);
    storage.setItem(LS.weapon, id);
    gameRef.current?.setWeapon(id);
    if (changed) {
      const current = questStateRef.current;
      saveQuests({ ...current, weaponEquips: current.weaponEquips + 1 });
      sfx.click();
    }
    sfx.unlock();
  };

  const celebrateNewWeapon = (weaponId: WeaponId) => {
    setWeaponCelebration({ weaponId, id: Date.now() + Math.random() });
  };

  const buyRareWeapon = (id: WeaponId) => {
    const item = getWeapon(id);
    if (item.rarity !== 'LANGKA') return false;
    const owned = ownedWeaponIds();
    if (owned.includes(id)) { chooseWeapon(id); return true; }
    const balance = diamondsInBank();
    if (balance < 500) return false;
    const next = balance - 500;
    storage.setItem(LS.diamonds, String(next));
    let bought: string[] = [];
    try {
      const stored = JSON.parse(storage.getItem(LS.rareOwned) || '[]');
      if (Array.isArray(stored)) bought = stored.filter((weaponId): weaponId is string => typeof weaponId === 'string');
    } catch { /* start a fresh bought-rare list */ }
    storage.setItem(LS.rareOwned, JSON.stringify([...new Set([...bought, id])]));
    setDiamonds(next);
    chooseWeapon(id);
    celebrateNewWeapon(id);
    sfx.unlock();
    return true;
  };

  // Space in the open Arsenal bulk-buys any LANGKA weapons the current balance can cover.
  // Every rare weapon still costs 500 diamonds; insufficient balance leaves the rest locked.
  const unlockAllAffordableWeapons = (): WeaponId[] => {
    const owned = ownedWeaponIds();
    const locked = WEAPONS.filter(w => w.rarity === 'LANGKA' && !owned.includes(w.id));
    const balance = diamondsInBank();
    const count = Math.min(locked.length, Math.floor(balance / 500));
    const purchases = locked.slice(0, count).map(w => w.id);
    if (!purchases.length) return [];

    const newBalance = balance - purchases.length * 500;
    const newOwned = [...new Set([...owned.filter(id => getWeapon(id).rarity === 'LANGKA'), ...purchases])];
    storage.setItem(LS.rareOwned, JSON.stringify(newOwned));
    storage.setItem(LS.diamonds, String(newBalance));
    setDiamonds(newBalance);
    sfx.unlock();
    return purchases;
  };

  const handleClaimQuest = (q: Quest) => {
    const current = questStateRef.current;
    if (!QUESTS.some(item => item.id === q.id) || current.claimed.includes(q.id)) return;
    if (Math.min(q.progress(current, ownedWeaponIds().length), q.target) < q.target) return;
    depositCoins(q.rewardCoins);
    if (q.rewardWeapon) {
      const rewardId = q.rewardWeapon as WeaponId;
      const rewardWeapon = getWeapon(rewardId);
      if (rewardWeapon.rarity !== 'LANGKA') {
        const owned = ownedWeaponIds();
        if (!owned.includes(rewardId)) {
          try {
            const stored: string[] = JSON.parse(storage.getItem(LS.owned) || '[]');
            storage.setItem(LS.owned, JSON.stringify([...new Set([...stored, rewardId])]));
          } catch { storage.setItem(LS.owned, JSON.stringify([rewardId])); }
          celebrateNewWeapon(rewardId);
        }
        chooseWeapon(rewardId);
      }
    }
    const latest = questStateRef.current;
    saveQuests({
      ...latest,
      claimed: [...latest.claimed, q.id],
      totalCoinsCollected: latest.totalCoinsCollected + q.rewardCoins,
    });
  };

  const handleClaimMilestone = (count: number) => {
    const current = questStateRef.current;
    const milestone = MILESTONES.find(item => item.count === count);
    const owned = ownedWeaponIds();
    const completed = QUESTS.filter(q => Math.min(q.progress(current, owned.length), q.target) >= q.target).length;
    if (!milestone || completed < count || current.milestonesClaimed.includes(count)) return;

    const nextState = { ...current, milestonesClaimed: [...current.milestonesClaimed, count] };
    const available = WEAPONS.filter(w => w.rarity === milestone.rarity && !owned.includes(w.id));
    const reward = available.length ? available[Math.floor(Math.random() * available.length)] : null;
    saveQuests(nextState);
    sfx4.match();
    if (reward) {
      try {
        const stored: string[] = JSON.parse(storage.getItem(LS.owned) || '[]');
        storage.setItem(LS.owned, JSON.stringify([...new Set([...stored, reward.id])]));
      } catch { storage.setItem(LS.owned, JSON.stringify([reward.id])); }
      celebrateNewWeapon(reward.id);
    } else {
      depositCoins(1000);
      saveQuests({ ...nextState, totalCoinsCollected: nextState.totalCoinsCollected + 1000 });
    }
  };

  // Create one engine per mounted slide. Quest/coin updates must not destroy a live run.
  useEffect(() => {
    const g = new Game(canvasRef.current!, {
      onGameOver: (score, level, coins, runCoins) => {
        const prevBest = num(LS.best);
        const newBest = score > prevBest;
        if (newBest) storage.setItem(LS.best, String(score));
        if (level > num(LS.bestLevel)) storage.setItem(LS.bestLevel, String(level));
        depositCoins(coins, true); // special-stage and boss rewards were banked already
        setBest(num(LS.best));
        setBestLevel(Math.max(1, num(LS.bestLevel)));
        const current = questStateRef.current;
        saveQuests({
          ...current,
          highestScore: Math.max(current.highestScore, score),
          highestLevel: Math.max(current.highestLevel, level),
          totalCoinsCollected: current.totalCoinsCollected + coins,
        }, true);
        setResult({ score, level, coins: runCoins, newBest });
        setDisplayScore(0);
        setScreen('over');
      },
      onStarHit: (treasure) => {
        setStarBuffTreasure(treasure);
        setStarBuffOpen(true);
      },
      onStageCleared: (level) => {
        const unlocked = Math.max(1, num(LS.bestLevel), level + 1);
        if (unlocked > num(LS.bestLevel)) {
          storage.setItem(LS.bestLevel, String(unlocked));
          setBestLevel(unlocked);
        }
        const current = questStateRef.current;
        saveQuests({
          ...current,
          stagesWon: current.stagesWon + 1,
          highestLevel: Math.max(current.highestLevel, level + 1),
        });
      },
      onShotFired: (count) => {
        pendingShotsRef.current += count;
      },
      onBossDefeated: (bossName, level, coinsEarned, bossType) => {
        const totalXpBefore = num(LS.playerXp);
        const previous = getPlayerProgress(totalXpBefore);
        const xpGained = bossXpReward(level);
        const totalXp = totalXpBefore + xpGained;
        const nextProgress = getPlayerProgress(totalXp);
        storage.setItem(LS.playerXp, String(totalXp));
        storage.setItem(LS.playerLevel, String(nextProgress.level));
        setBossDefeatedData({
          name: bossName, bossType, level, coins: coinsEarned,
          playerLevel: nextProgress.level,
          xpBefore: previous.level === nextProgress.level ? previous.xp : 0,
          xpProgress: nextProgress.xp,
          xpGained,
          leveledUp: nextProgress.level > previous.level,
        });
        depositCoins(coinsEarned);
        const current = questStateRef.current;
        saveQuests({
          ...current,
          highestLevel: Math.max(current.highestLevel, level),
          highestPlayerLevel: Math.max(current.highestPlayerLevel, nextProgress.level),
          bossesDefeated: current.bossesDefeated + 1,
          totalCoinsCollected: current.totalCoinsCollected + coinsEarned,
        });
      },
      onDiamondCollected: (amount, large, origin) => {
        const id = Date.now() + Math.random();
        if (large) {
          // The large gem is only credited after the boulder stage is cleared.
          setDiamondToast(null);
          setDiamondHudMode(true);
          setDiamondFlight({ amount, x: origin.x, y: origin.y, id });
        } else {
          const next = diamondsInBank() + amount;
          storage.setItem(LS.diamonds, String(next));
          setDiamonds(next);
          setDiamondToast({ amount, large: false, id });
        }
        sfx3.chime();
      },
      onStageChange: () => {
        setDiamondHudMode(false);
        setDiamondFlight(null);
        setDiamondReveal(null);
        setDiamondToast(null);
      },
      onTreasureCoin: (amount) => {
        depositCoins(amount); // Saved as each bouncing coin reaches the HUD.
        const current = questStateRef.current;
        saveQuests({ ...current, totalCoinsCollected: current.totalCoinsCollected + amount });
      },
      onStageReward: (_mode, level, unbankedCoins, diamondReward) => {
        if (diamondReward > 0) {
          const next = diamondsInBank() + diamondReward;
          storage.setItem(LS.diamonds, String(next));
          setDiamonds(next);
        }
        if (unbankedCoins) depositCoins(unbankedCoins);
        const unlocked = Math.max(1, num(LS.bestLevel), level + 1);
        if (unlocked > num(LS.bestLevel)) {
          storage.setItem(LS.bestLevel, String(unlocked));
          setBestLevel(unlocked);
        }
        const current = questStateRef.current;
        saveQuests({
          ...current,
          highestScore: Math.max(current.highestScore, g.score),
          highestLevel: Math.max(current.highestLevel, level),
          totalCoinsCollected: current.totalCoinsCollected + unbankedCoins,
        });
      },
    });
    const flushShotsToStorage = () => {
      if (questWriteTimerRef.current !== undefined) {
        window.clearTimeout(questWriteTimerRef.current);
        questWriteTimerRef.current = undefined;
      }
      const merged = mergePendingShots(questStateRef.current);
      questStateRef.current = merged;
      storage.setItem(LS.quests, JSON.stringify(merged));
    };
    const onVisChange = () => {
      if (document.hidden) flushShotsToStorage();
    };
    document.addEventListener('visibilitychange', onVisChange);
    window.addEventListener('pagehide', flushShotsToStorage);
    g.setWeapon(getWeapon(storage.getItem(LS.weapon) || 'pistol').id);
    g.setGameSpeed(getSavedSgaSpeed());
    g.setBackgroundTheme(getSavedSgaBgTheme());
    gameRef.current = g;
    return () => {
      document.removeEventListener('visibilitychange', onVisChange);
      window.removeEventListener('pagehide', flushShotsToStorage);
      g.destroy();
      gameRef.current = null;
      flushShotsToStorage();
    };
  }, []);

  useEffect(() => {
    if (screen !== 'playing' || questOpen) {
      if (questWriteTimerRef.current !== undefined) {
        window.clearTimeout(questWriteTimerRef.current);
        questWriteTimerRef.current = undefined;
      }
      const merged = mergePendingShots(questStateRef.current);
      questStateRef.current = merged;
      storage.setItem(LS.quests, JSON.stringify(merged));
      setQuestState(merged);
      setTotalCoins(coinsInBank());
    }
  }, [screen, questOpen]);

  useEffect(() => {
    gameRef.current?.setGameSpeed(gameSpeed);
  }, [gameSpeed]);

  useEffect(() => {
    gameRef.current?.setBackgroundTheme(menuTheme);
  }, [menuTheme]);

  useEffect(() => {
    if (!diamondToast) return;
    const timer = window.setTimeout(() => setDiamondToast(null), Math.round(1800 / gameSpeed));
    return () => window.clearTimeout(timer);
  }, [diamondToast?.id, gameSpeed]);

  useEffect(() => {
    if (!diamondFlight) return;
    const node = diamondFlightRef.current;
    if (!node) return;
    const startX = Math.max(28, Math.min(392, diamondFlight.x));
    const startY = Math.max(76, Math.min(690, diamondFlight.y));
    const flight = node.animate([
      { left: `${startX}px`, top: `${startY}px`, transform: 'translate(-50%, -50%) scale(1.25) rotate(0deg)', opacity: 1 },
      { left: '392px', top: '34px', transform: 'translate(-50%, -50%) scale(.18) rotate(540deg)', opacity: .25, offset: .82 },
      { left: '392px', top: '34px', transform: 'translate(-50%, -50%) scale(.12) rotate(720deg)', opacity: 0 },
    ], { duration: Math.round(900 / gameSpeed), easing: 'cubic-bezier(.2,.7,.18,1)', fill: 'forwards' });
    flight.onfinish = () => {
      setDiamondFlight((current) => current?.id === diamondFlight.id ? null : current);
      setDiamondReveal({ id: diamondFlight.id, amount: diamondFlight.amount });
    };
    return () => flight.cancel();
  }, [diamondFlight?.id, gameSpeed]);

  useEffect(() => {
    if (diamondReveal === null) return;
    const timer = window.setTimeout(() => setDiamondReveal(null), Math.round(2100 / gameSpeed));
    return () => window.clearTimeout(timer);
  }, [diamondReveal?.id, gameSpeed]);

  useEffect(() => {
    if (!weaponCelebration) return;
    const timer = window.setTimeout(() => setWeaponCelebration(null), Math.round(2200 / gameSpeed));
    return () => window.clearTimeout(timer);
  }, [weaponCelebration?.id, gameSpeed]);

  useEffect(() => {
    setMasterVolume(soundVolume);
    juicyAudio.volume = 0.7 * soundVolume;
  }, [soundVolume]);

  // Escape opens/closes in-game settings pause menu while playing.
  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (screenRef.current !== 'playing') return;
      if (starBuffOpen || bonusStageOpen || Boolean(bossDefeatedData)) return;
      e.preventDefault();
      setInGameSettingsOpen((open) => !open);
    };
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [starBuffOpen, bonusStageOpen, bossDefeatedData]);

  // The menu, results and modal screens use their own lightweight effects;
  // the heavy level canvas has nothing to simulate behind those overlays.
  const gameplayModalOpen = inGameSettingsOpen || arsenalOpen || questOpen || leaderboardOpen || starBuffOpen || bonusStageOpen || Boolean(bossDefeatedData);
  useEffect(() => {
    if (screen !== 'playing' && inGameSettingsOpen) setInGameSettingsOpen(false);
    if (screen === 'menu') gameRef.current?.toIdle();
    gameRef.current?.setActive(active && screen === 'playing' && !gameplayModalOpen);
  }, [active, screen, gameplayModalOpen, inGameSettingsOpen]);

  // Upright weapon preview on the main menu (-10% from 374x328 -> 337x295, native VSync FPS)
  useEffect(() => {
    if (screen !== 'menu' || arsenalOpen || questOpen || leaderboardOpen || mapOpen || settingsOpen) return;
    const cv = previewCanvasRef.current;
    if (!cv) return;
    const dpr = getOptimalCanvasDpr(2);
    const pw = 337;
    const ph = 295;
    cv.width = Math.round(pw * dpr);
    cv.height = Math.round(ph * dpr);
    const ctx = getFast2DContext(cv);
    if (!ctx) return;

    let raf = 0;
    const start = performance.now();
    const curW = getWeapon(weapon);
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)');

    const loop = (now: number) => {
      // Let the entrance finish before any optional weapon-fire demonstration.
      const t = reducedMotion?.matches ? 0 : Math.max(0, (now - start) / 1000 - 1) * getSavedSgaSpeed();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, pw, ph);

      // The entrance moves the canvas into place; keep its base centered and
      // still afterwards while the weapon's own light/preview details animate.
      ctx.save();
      ctx.translate(pw / 2, ph / 2);

      // Weapon shadow (scaled proportionally with the weapon)
      ctx.beginPath();
      ctx.ellipse(0, 92, 59, 16, 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0,0,0,0.44)';
      ctx.fill();

      // Scaled -10% from 374x328 while preserving true weapon proportions.
      const m = getGunMetrics(curW.id);
      const span = Math.max(m.span, 130);
      const sc = (ph * 0.78) / span;
      ctx.scale(sc, sc);

      // drawGunCentered puts the geometric mass center EXACTLY at (0, 0)!
      drawGunCentered(ctx, curW.id, t, 0, true, undefined, true);
      ctx.restore();

      if (active && !reducedMotion?.matches) raf = requestAnimationFrame(loop);
    };

    // Redraw once on a preference change, then resume frames only if needed.
    const onMotionChange = () => {
      cancelAnimationFrame(raf);
      loop(performance.now());
    };
    reducedMotion?.addEventListener?.('change', onMotionChange);
    loop(start); // a still preview even before this slide has focus
    return () => {
      cancelAnimationFrame(raf);
      reducedMotion?.removeEventListener?.('change', onMotionChange);
    };
  }, [screen, weapon, active, arsenalOpen, questOpen, leaderboardOpen, mapOpen, settingsOpen]);

  // Roll up score only while the slide is active; pause at the current number.
  useEffect(() => {
    if (screen !== 'over' || !active || displayScore >= result.score) return;
    const from = displayScore;
    const target = result.score;
    const start = performance.now();
    const timer = setInterval(() => {
      const p = Math.min(1, ((performance.now() - start) * getSavedSgaSpeed()) / 800);
      setDisplayScore(Math.round(from + (target - from) * Math.pow(p, 0.7)));
      if (p >= 1) clearInterval(timer);
    }, 25);
    return () => clearInterval(timer);
    // Restart this timer only when focus or a new result changes, not per tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, result.score, active]);

  // Pause the Ready / Go transition with the game, instead of starting a
  // level unseen if another slide was selected during its countdown.
  useEffect(() => {
    if (!active || transitionStep === 0) return;
    const timer = setTimeout(() => {
      if (transitionStep === 1) {
        setTransText('GO!! 🎯');
        sfx4.match();
        setTransitionStep(2);
      } else {
        setTransitioning(false);
        gameRef.current?.startAtLevel(startingLevelRef.current);
        setScreen('playing');
        setTransitionStep(0);
      }
    }, Math.round((transitionStep === 1 ? 380 : 320) / gameSpeed));
    return () => clearTimeout(timer);
  }, [transitionStep, active, gameSpeed]);

  const beginStage = (level: number) => {
    startingLevelRef.current = level;
    setMapOpen(false);
    setTransitioning(false);
    setTransitionStep(0);
    gameRef.current?.startAtLevel(level);
    setScreen('playing');
  };

  const play = () => beginStage(1);

  const handleContinueAfterBoss = () => {
    setBonusAfterBoss({ stage: bossDefeatedData?.level ?? 5, bossName: bossDefeatedData?.name ?? 'BOSS' });
    setBossDefeatedData(null);
    // Bonus stage: kotak hadiah ala Knife Boss 100 Lv (senjata baru + koin).
    setBonusStageOpen(true);
  };

  const handleGiftBoxClaim = (bonusCoins: number, weaponId: WeaponId, equip: boolean) => {
    depositCoins(bonusCoins);
    const current = questStateRef.current;
    saveQuests({
      ...current,
      boxesOpened: current.boxesOpened + 1,
      totalCoinsCollected: current.totalCoinsCollected + bonusCoins,
    });
    // Catat senjata hasil kotak hadiah ke koleksi dan selebrasi hanya saat benar-benar baru.
    let isNewWeapon = false;
    try {
      const owned: string[] = JSON.parse(storage.getItem(LS.owned) || '[]');
      if (getWeapon(weaponId).rarity !== 'LANGKA' && !owned.includes(weaponId)) {
        storage.setItem(LS.owned, JSON.stringify([...owned, weaponId]));
        isNewWeapon = true;
      }
    } catch { /* simpan koleksi bersifat opsional */ }
    if (isNewWeapon) celebrateNewWeapon(weaponId);
    if (equip) chooseWeapon(weaponId);
    setBonusStageOpen(false);
    gameRef.current?.continueAfterBoss();
  };

  const startSpecial = (stage: 'boulder' | 'bonus' | 'treasure') => {
    setSettingsOpen(false);
    setInGameSettingsOpen(false);
    gameRef.current?.startSpecialStage(stage);
    setScreen('playing');
  };

  const toggleMute = () => {
    const m = !muted;
    if (!m && soundVolume <= 0) {
      setSoundVolumeState(1);
      storage.setItem(LS.volume, '1');
      setMasterVolume(1);
      juicyAudio.volume = 0.7;
    }
    setMuted(m);
    setMutedState(m);
    juicyAudio.enabled = !m;
    if (!m) sfx.click();
  };

  const changeSoundVolume = (nextVol: number, playTick = false) => {
    const clamped = Math.max(0, Math.min(1, Math.round(nextVol * 100) / 100));
    setSoundVolumeState(clamped);
    storage.setItem(LS.volume, String(clamped));
    setMasterVolume(clamped);
    juicyAudio.volume = 0.7 * clamped;
    if (clamped <= 0) {
      if (!muted) {
        setMuted(true);
        setMutedState(true);
        juicyAudio.enabled = false;
      }
    } else {
      if (muted) {
        setMuted(false);
        setMutedState(false);
        juicyAudio.enabled = true;
      }
      if (playTick) sfx.click();
    }
  };

  const goToMainMenuFromPlay = () => {
    saveQuests(questStateRef.current, true);
    setInGameSettingsOpen(false);
    gameRef.current?.toIdle();
    setScreen('menu');
  };

  const chooseMenuTheme = (theme: MenuEnvironmentTheme) => {
    setMenuTheme(theme);
  };

  return (
    <div
      className="gunhit-sga font-game flex h-full w-full select-none items-center justify-center bg-[#071318] relative"
      onClickCapture={(e) => {
        if ((e.target as HTMLElement | null)?.closest('button, [role="button"]')) {
          sfx.click();
        }
      }}
    >
      {onExit && (
        <button
          onClick={onExit}
          className="fixed top-3 left-3 z-50 flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-neutral-900/90 hover:bg-neutral-800 text-white text-xs font-semibold backdrop-blur-md border border-white/20 shadow-xl cursor-pointer transition hover:scale-105 active:scale-95"
          title="Kembali ke Menu Game"
        >
          <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span>Pilih Game Lain</span>
        </button>
      )}
      <div className="relative overflow-hidden shadow-[0_0_80px_rgba(0,0,0,0.9)] w-[420px] h-[760px] flex-shrink-0">
        {/* Canvas Engine (zero permanent translucent DOM overlays during gameplay so desynchronized:true scans out directly) */}
        <canvas ref={canvasRef} className="block touch-none w-[420px] h-[760px]" />
        {diamondToast && (
          <div key={diamondToast.id} className="pointer-events-none absolute inset-x-0 top-[34%] z-40 flex flex-col items-center diamond-reward-pop" aria-live="polite">
            <div className="relative flex h-36 w-64 items-center justify-center">
              <SunburstFX size={280} color="255,255,255" intensity={1} speed={14} stars />
              <DiamondSprite size={96} className="relative z-10 drop-shadow-[0_0_22px_rgba(103,232,249,0.95)]" />
            </div>
            <div className="-mt-4 rounded-full border border-cyan-200/70 bg-slate-950/90 px-5 py-2 text-lg font-black text-cyan-100 shadow-[0_0_30px_rgba(34,211,238,0.75)]">
              BERLIAN +{diamondToast.amount}
            </div>
          </div>
        )}
        {cheatToast && (
          <div className="pointer-events-none absolute inset-x-0 top-[34%] z-40 flex flex-col items-center diamond-reward-pop" aria-live="polite">
            <div className="rounded-full border border-emerald-200/70 bg-slate-950/90 px-5 py-2 text-lg font-black text-emerald-100 shadow-[0_0_30px_rgba(52,211,153,0.75)]">
              {cheatToast}
            </div>
          </div>
        )}
        {/* Stage-clear & special-stage Sunburst renders inside Canvas2D strictly BEHIND the wheel/rock/chest (never in a front DOM layer) */}
        {weaponCelebration && (() => {
          const unlocked = getWeapon(weaponCelebration.weaponId);
          const color = gunSunburstColor(unlocked.rarity);
          const starCount = unlocked.rarity === 'LEGENDARIS' ? 3 : unlocked.rarity === 'EPIC' ? 3 : unlocked.rarity === 'LANGKA' ? 2 : 1;
          return (
            <div key={weaponCelebration.id} className="pointer-events-none absolute inset-0 z-[60] flex items-center justify-center overflow-hidden" aria-live="polite" aria-label={`Senjata baru ${unlocked.name}`}>
              <Dust count={22} />
              <SparkleField count={18} spread={1.55} delay={0.12} />
              <SunburstFX size={450} color={color} intensity={1.05} speed={12} stars />
              <div className="absolute left-1/2 top-1/2 h-0 w-0">
                <Shockwave size={410} color={`rgba(${color},.9)`} />
                <Shockwave size={300} color="rgba(255,255,255,.8)" delay={0.12} />
                <Flare width={480} color={color} />
                <Burst count={30} distance={250} size={14} colors={['#ffffff', '#fde68a', '#7dd3fc', '#f0abfc']} />
              </div>
              <div className="relative z-10 flex flex-col items-center rounded-2xl border border-white/60 bg-slate-950/80 px-7 py-4 text-center shadow-[0_0_40px_rgba(186,230,253,.55)] backdrop-blur-sm">
                <div className="mb-1 text-[11px] font-black tracking-[.32em] text-cyan-100">★ SENJATA BARU ★</div>
                <div className="text-5xl drop-shadow-[0_0_16px_rgba(255,255,255,.8)]">{unlocked.emoji}</div>
                <div className="mt-1 text-xl font-black text-white">{unlocked.name}</div>
                <div className="mt-1 text-xl leading-none text-yellow-300 drop-shadow-[0_0_8px_#fde047]">{'★'.repeat(starCount)}</div>
              </div>
            </div>
          );
        })()}
        {diamondFlight && (
          <div ref={diamondFlightRef} className="pointer-events-none absolute z-50 flex h-16 w-16 items-center justify-center drop-shadow-[0_0_20px_rgba(186,239,255,1)]" style={{ left: `${diamondFlight.x}px`, top: `${diamondFlight.y}px`, transform: 'translate(-50%, -50%)' }} aria-hidden="true">
            <DiamondSprite size={64} />
          </div>
        )}
        {diamondHudMode && screen === 'playing' && (
          <div className="pointer-events-none absolute right-1 top-[12px] z-40 flex h-[44px] min-w-[96px] items-center justify-end gap-1 rounded-full border border-cyan-100/80 bg-[#071827]/95 px-2 text-[19px] font-black text-cyan-100 shadow-[0_0_22px_rgba(125,211,252,0.85)]" aria-live="polite">
            <DiamondSprite size={28} className="-mr-1" /><span className="font-mono">{diamonds}</span>
          </div>
        )}
        {screen === 'playing' && !gameplayModalOpen && (
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              sfx.click();
              setInGameSettingsOpen(true);
            }}
            aria-label="Pengaturan permainan"
            title="Pengaturan (Menu, Suara & Kecepatan)"
            className="absolute right-2.5 top-[62px] z-30 flex h-10 w-10 items-center justify-center rounded-2xl border border-white/25 bg-[#0a1d28]/85 text-lg text-white shadow-[0_6px_18px_rgba(0,0,0,0.58)] backdrop-blur-sm transition hover:scale-105 hover:border-cyan-200/70 hover:bg-[#133244] active:scale-95"
          >
            ⚙️
          </button>
        )}
        {diamondReveal !== null && (
          <div
            key={diamondReveal.id}
            className="pointer-events-none absolute z-45"
            style={{ left: 210, top: 184, transform: 'translate(-50%, -50%)' }}
            aria-live="polite"
          >
            <div className="diamond-reveal">
              <div className="relative flex h-[420px] w-[420px] flex-col items-center justify-center">
                <SunburstFX size={510} color="255,255,255" intensity={1.15} speed={12} stars />
                <div className="relative z-10 flex h-44 w-44 items-center justify-center rounded-full border border-white/50 bg-gradient-to-br from-white/30 to-cyan-300/10 drop-shadow-[0_0_34px_rgba(205,241,255,1)]">
                  <DiamondSprite size={156} />
                </div>
                <div className="relative z-10 mt-4 rounded-2xl border-2 border-[#e0f4ff] bg-[#071827]/90 px-6 py-3 text-center shadow-[0_0_40px_rgba(186,230,253,0.9)]">
                  <div className="text-[11px] font-black tracking-[0.32em] text-cyan-100">BERLIAN BESAR DIDAPAT</div>
                  <div className="mt-1 text-3xl font-black text-white drop-shadow-[0_0_12px_#bae6fd]">+{diamondReveal.amount}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Transition Overlay (Hypercasual READY GO) */}
        {transitioning && (
          <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="pop-in flex flex-col items-center">
              <div className="text-6xl font-black italic tracking-wider text-yellow-300 drop-shadow-[0_6px_0_rgba(0,0,0,0.8)] font-game">
                {transText}
              </div>
            </div>
          </div>
        )}

        {/* -------------------------------------------------------------
            MAIN MENU: EXACT MATCHING SCREENSHOT 1 KNIFE HIT LAYOUT!
           ------------------------------------------------------------- */}
        {screen === 'menu' && !mapOpen && (
          <div className={`gunhit-menu ${active ? 'menu-ready' : 'slide-paused'} absolute inset-0 z-20 flex flex-col justify-between py-4 px-4 text-white isolate`} data-menu-theme={menuTheme}>
            <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
              <MenuEnvironment theme={menuTheme} />
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_46%,rgba(125,211,252,.08),transparent_68%)]" />
              <div className="absolute inset-0 opacity-60">
                <Dust count={14} />
                <SparkleField count={10} spread={1.45} />
              </div>
            </div>
            {/* Currency counters */}
            <div className="menu-currency-entrance flex items-center justify-end">
              <div className="flex items-center gap-1.5 text-lg font-bold font-game text-amber-300 drop-shadow">
                <span className="font-mono text-xl font-black tracking-tight">{totalCoins}</span>
                <CoinSprite size={25} className="drop-shadow-[0_0_5px_rgba(255,210,80,.7)]" />
                <span className="ml-2 flex items-center border-l border-white/20 pl-2 text-base font-black text-cyan-100"><DiamondSprite size={24} fillRatio={0.92} /> {diamonds}</span>
              </div>
            </div>

            {/* Title Section */}
            <div className="menu-title-entrance flex flex-col items-center text-center -mt-1">
              <div className="relative flex flex-col items-center">
                {/* PERFECT word */}
                <div className="text-5xl sm:text-7xl font-black tracking-[0.12em] text-[#4ade80] drop-shadow-[0_6px_0_#15803d] font-game transform -rotate-1 leading-none">
                  PERFECT
                </div>

                {/* Curved blade slice line with sword/gun */}
                <div className="relative -my-1.5 h-6 w-64 flex items-center justify-center">
                  <div className="h-2 w-full rounded-full bg-white shadow-[0_0_12px_#ffffff]" />
                  <span className="absolute right-2 text-xl transform rotate-12 drop-shadow">🗡️</span>
                </div>

                {/* SHOT word */}
                <div className="text-5xl sm:text-7xl font-black tracking-[0.12em] text-[#fde047] drop-shadow-[0_6px_0_#a16207] font-game transform rotate-1 leading-none">
                  SHOT
                </div>
              </div>

              {/* Subtitle: STAGE {bestLevel} ◆ SCORE {best} */}
              <div className="mt-2 flex items-center gap-2.5 text-xs sm:text-sm font-black tracking-[0.2em] text-white font-game drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                <span>STAGE {bestLevel}</span>
                <span className="text-amber-300 text-base">◆</span>
                <span>SCORE {best}</span>
              </div>
            </div>

            {/* Upright gun with a layered, rarity-aware Sunburst FX Lab halo (-10% size: 337x295). */}
            <div className="flex flex-col items-center justify-center my-auto">
              <div className="relative" style={{ width: 'min(337px, 90vw)', height: 'min(295px, 78vw)' }}>
                <div className="pointer-events-none absolute inset-0" aria-hidden="true">
                  <SunburstFX size={430} color={gunSunburstColor(getWeapon(weapon).rarity)} intensity={0.34} speed={32 / gameSpeed} core={false} stars={false} />
                </div>
                <div className="menu-weapon-entrance relative z-10 h-full w-full">
                  <canvas
                    ref={previewCanvasRef}
                    style={{ width: '100%', height: '100%' }}
                    className="relative z-10 block translate-x-[1%] cursor-pointer hover:scale-105 transition-transform"
                    role="button"
                    tabIndex={0}
                    aria-label="Buka koleksi senjata"
                    onClick={() => setArsenalOpen(true)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        sfx.click();
                        setArsenalOpen(true);
                      }
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Two Main Action Buttons */}
            <div className="menu-actions relative z-10 flex w-full items-center justify-center gap-3 mb-2">
              {/* CHALLENGES Button */}
              <div className="menu-action-entrance flex flex-1">
                <button
                  onClick={() => setMapOpen(true)}
                  data-gloss="off"
                  className="relative flex-1 flex items-center justify-center gap-2 overflow-hidden rounded-2xl border border-white/30 border-b-[6px] border-b-[#68121d] bg-gradient-to-b from-[#ff9a38] via-[#f04422] to-[#a91435] py-3 px-2 text-sm sm:text-base font-black font-game text-white drop-shadow-[0_2px_2px_rgba(40,0,0,.7)] shadow-[0_14px_32px_rgba(240,55,34,0.58)] transition active:translate-y-1 active:border-b-2 hover:brightness-110 hover:saturate-125"
                >
                  <span className="pointer-events-none absolute inset-x-3 top-1 h-[34%] rounded-xl bg-white/18" />
                  <span className="shine-sweep pointer-events-none absolute inset-y-0 left-0 w-1/4 bg-gradient-to-r from-transparent via-white/70 to-transparent" />
                  <span className="relative z-10 text-xl">🗺️</span>
                  <span className="relative z-10">QUEST</span>
                </button>
              </div>

              {/* PLAY Button */}
              <div className="menu-action-entrance flex flex-1">
                <button
                  onClick={play}
                  data-gloss="off"
                  className="pulse-btn relative flex-1 flex items-center justify-center gap-2 overflow-hidden rounded-2xl border border-white/35 border-b-[6px] border-b-[#064324] bg-gradient-to-b from-[#b7ff73] via-[#15cf62] to-[#006b39] py-3 px-2 text-xl font-black font-game text-white drop-shadow-[0_2px_2px_rgba(0,35,18,.75)] shadow-[0_14px_32px_rgba(0,215,95,.55)] transition active:translate-y-1 active:border-b-2 hover:brightness-110 hover:saturate-125"
                >
                  <span className="pointer-events-none absolute inset-x-3 top-1 h-[34%] rounded-xl bg-white/18" />
                  <span className="shine-sweep pointer-events-none absolute inset-y-0 left-0 w-1/4 bg-gradient-to-r from-transparent via-white/70 to-transparent" />
                  <span className="relative z-10">PLAY</span>
                  <span className="relative z-10 text-xl font-black">▶</span>
                </button>
              </div>
            </div>

            {/* Bottom Icon Bar */}
            <div className="menu-icon-bar relative z-10 flex items-center justify-around border-t-2 border-white/15 pt-2 pb-1 text-white/95">
              {/* GUN button */}
              <div className="menu-icon-entrance">
                <button
                  onClick={() => setArsenalOpen(true)}
                  className="flex flex-col items-center gap-1 rounded-2xl transition hover:-translate-y-1 hover:text-white active:scale-95"
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/20 bg-gradient-to-br from-white/20 to-white/[0.04] text-2xl shadow-xl transition-colors">
                    🔫
                  </div>
                  <span className="text-xs font-black tracking-widest font-game drop-shadow">GUN</span>
                </button>
              </div>

              {/* LEADERBOARD button */}
              <div className="menu-icon-entrance">
                <button
                  onClick={() => setLeaderboardOpen(true)}
                  className="flex flex-col items-center gap-1 rounded-2xl transition hover:-translate-y-1 hover:text-white active:scale-95"
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/20 bg-gradient-to-br from-white/20 to-white/[0.04] text-2xl shadow-xl transition-colors">
                    🏆
                  </div>
                  <span className="text-xs font-black tracking-widest font-game drop-shadow">RANKS</span>
                </button>
              </div>

              {/* REWARD / MISI button */}
              <div className="menu-icon-entrance">
                <button
                  onClick={() => setQuestOpen(true)}
                  className="flex flex-col items-center gap-1 rounded-2xl transition hover:-translate-y-1 hover:text-white active:scale-95"
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/20 bg-gradient-to-br from-white/20 to-white/[0.04] text-2xl shadow-xl transition-colors">
                    🎁
                  </div>
                  <span className="text-xs font-black tracking-widest font-game text-yellow-300 drop-shadow">READY!</span>
                </button>
              </div>

              {/* SETTINGS sits immediately to the right of READY! */}
              <div className="menu-icon-entrance">
                <button
                  onClick={() => setSettingsOpen(true)}
                  className="flex flex-col items-center gap-1 rounded-2xl transition hover:-translate-y-1 hover:text-white active:scale-95"
                  aria-label="Buka pengaturan"
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/20 bg-gradient-to-br from-white/20 to-white/[0.04] text-2xl shadow-xl transition-colors">
                    ⚙️
                  </div>
                  <span className="text-[10px] font-black tracking-widest font-game drop-shadow">SETTING</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {screen === 'menu' && settingsOpen && (
          <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
            <section role="dialog" aria-modal="true" aria-labelledby="gunhit-settings-title" className="w-full max-w-sm max-h-[720px] overflow-y-auto thin-scroll rounded-3xl border border-cyan-200/25 bg-gradient-to-b from-[#132c34] to-[#08151d] p-4 text-white shadow-[0_24px_70px_rgba(0,0,0,.7)]">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <h2 id="gunhit-settings-title" className="text-xl font-black tracking-widest text-cyan-100">PENGATURAN</h2>
                  <p className="mt-1 text-[10px] font-bold tracking-wider text-white/55">AUDIO, KECEPATAN & STAGE SPESIAL</p>
                </div>
                <button onClick={() => setSettingsOpen(false)} aria-label="Tutup pengaturan" className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-xl text-white/80 hover:bg-white/20">×</button>
              </div>

              <div className="mb-2.5 rounded-2xl border border-white/15 bg-white/[0.06] p-3">
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={toggleMute}
                    className="flex flex-1 items-center gap-3 text-left transition active:scale-[0.99]"
                  >
                    <span className="text-xl">{muted || soundVolume <= 0 ? '🔇' : '🔊'}</span>
                    <span>
                      <span className="block text-sm font-black">SUARA</span>
                      <span className="block text-[10px] text-white/55">Efek dan musik permainan</span>
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={toggleMute}
                    className={`rounded-full px-2.5 py-1 text-[10px] font-black ${muted || soundVolume <= 0 ? 'bg-white/10 text-white/65' : 'bg-emerald-400/20 text-emerald-200'}`}
                  >
                    {muted || soundVolume <= 0 ? 'MATI' : `${Math.round(soundVolume * 100)}%`}
                  </button>
                </div>
                <div className="mt-2.5 flex items-center gap-2">
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    aria-label="Volume suara"
                    value={muted ? 0 : Math.round(soundVolume * 100)}
                    onChange={(e) => changeSoundVolume(Number(e.target.value) / 100)}
                    onPointerUp={() => {
                      if (!muted && soundVolume > 0) sfx.click();
                    }}
                    className="h-2 flex-1 cursor-pointer accent-emerald-400"
                  />
                </div>
                <div className="mt-2 grid grid-cols-5 gap-1">
                  {[0, 0.25, 0.5, 0.75, 1].map((preset) => {
                    const activePreset = (muted ? 0 : Math.round(soundVolume * 100)) === Math.round(preset * 100);
                    return (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => changeSoundVolume(preset, preset > 0)}
                        className={`rounded-lg border py-1 text-[9.5px] font-black transition active:scale-95 ${
                          activePreset
                            ? 'border-emerald-300 bg-emerald-400/25 text-emerald-100'
                            : 'border-white/10 bg-white/[0.04] text-white/70 hover:bg-white/10'
                        }`}
                      >
                        {preset === 0 ? 'MATI' : `${Math.round(preset * 100)}%`}
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (!muted) {
                    juicyAudio.enabled = true;
                    if (juicyAudio.volume === 0) juicyAudio.volume = 0.7;
                    void juicyAudio.unlock();
                  }
                  setSettingsOpen(false);
                  window.dispatchEvent(new CustomEvent('sans-replay-intro'));
                }}
                className="mb-3 flex w-full items-center justify-between rounded-2xl border border-red-400/40 bg-[#F11E1E]/20 px-4 py-2.5 text-left transition hover:bg-[#F11E1E]/30 active:scale-[0.99]"
              >
                <span className="flex items-center gap-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#F11E1E] font-studio text-sm font-bold text-white shadow">
                    S
                  </span>
                  <span>
                    <span className="block text-sm font-black text-white">INTRO SANS STUDIO</span>
                    <span className="block text-[10px] text-red-100/75">Putar ulang animasi pembuka SGA</span>
                  </span>
                </span>
                <span className="rounded-full bg-[#F11E1E] px-2.5 py-1 text-[10px] font-black text-white shadow">
                  PUTAR
                </span>
              </button>

              <div className="mb-3.5">
                <div className="text-center text-[11px] font-black tracking-[0.18em] text-amber-200">⚡ KECEPATAN GAME (SGA)</div>
                <div className="mt-1.5 grid grid-cols-4 gap-1.5">
                  {SGA_SPEED_OPTIONS.map((spd) => (
                    <button
                      key={spd}
                      type="button"
                      aria-pressed={gameSpeed === spd}
                      onClick={() => setGameSpeed(spd)}
                      className={`rounded-xl border px-1 py-2 text-center transition active:scale-95 ${
                        gameSpeed === spd
                          ? 'border-amber-300/90 bg-amber-400/25 text-amber-200 shadow-[0_0_14px_rgba(251,191,36,.3)]'
                          : 'border-white/10 bg-white/[.04] text-white/80 hover:bg-white/10'
                      }`}
                    >
                      <span className="block text-xs font-black tracking-wide">{formatSgaSpeed(spd)}</span>
                      <span className="mt-0.5 block text-[8px] font-bold tracking-wider text-white/60">
                        {spd === 1 ? 'NORMAL' : 'TURBO'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-3.5">
                <div className="text-center text-[11px] font-black tracking-[0.18em] text-cyan-100">TEMA LATAR MENU & GAME</div>
                <p className="mt-0.5 text-center text-[9px] font-semibold text-white/55">
                  {SGA_BG_THEMES.find((t) => t.id === menuTheme)?.desc ?? 'Berlaku di menu utama & di dalam game SGA'}
                </p>
                <div className="mt-2 grid grid-cols-4 gap-1.5">
                  {SGA_BG_THEMES.map((theme) => (
                    <button
                      key={theme.id}
                      type="button"
                      aria-pressed={menuTheme === theme.id}
                      onClick={() => chooseMenuTheme(theme.id)}
                      className={`relative overflow-hidden rounded-xl border px-1 py-2 text-center transition active:scale-95 ${menuTheme === theme.id ? 'border-cyan-200/90 ring-1 ring-cyan-300/60 shadow-[0_0_16px_rgba(103,232,249,.35)]' : 'border-white/15 hover:border-white/35'}`}
                      style={{ background: theme.swatch }}
                    >
                      <span className="pointer-events-none absolute inset-0 bg-black/25" />
                      <span className="relative z-10 block text-base leading-none drop-shadow">{theme.icon}</span>
                      <span className="relative z-10 mt-1 block text-[8px] font-black tracking-wider text-white drop-shadow">{theme.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-2 text-center text-xs font-black tracking-[0.18em] text-amber-100">PILIH STAGE SPESIAL</div>
              <p className="mb-3 text-center text-[10px] leading-relaxed text-white/55">Pilih stage untuk langsung dimainkan.</p>
              <div className="grid grid-cols-3 gap-2">
                <button onClick={() => startSpecial('boulder')} className="rounded-2xl border border-cyan-300/40 bg-cyan-400/10 px-1.5 py-3 text-center transition hover:bg-cyan-400/25 active:scale-95">
                  <span className="flex justify-center"><DiamondSprite size={27} /></span>
                  <span className="mt-1 block text-[10px] font-black text-cyan-100">BATU</span>
                  <span className="block text-[9px] text-cyan-100/60">Level 3</span>
                </button>
                <button onClick={() => startSpecial('bonus')} className="rounded-2xl border border-amber-300/40 bg-amber-400/10 px-1.5 py-3 text-center transition hover:bg-amber-400/25 active:scale-95">
                  <span className="block text-xl leading-none">🪙</span>
                  <span className="mt-1 block text-[10px] font-black text-amber-100">BONUS</span>
                  <span className="block text-[9px] text-amber-100/60">Level 4</span>
                </button>
                <button onClick={() => startSpecial('treasure')} className="rounded-2xl border border-pink-300/40 bg-pink-400/10 px-1.5 py-3 text-center transition hover:bg-pink-400/25 active:scale-95">
                  <span className="block text-xl leading-none">🧰</span>
                  <span className="mt-1 block text-[9px] font-black leading-tight text-pink-100">HARTA KARUN</span>
                  <span className="block text-[9px] text-pink-100/60">Level 6</span>
                </button>
              </div>
            </section>
          </div>
        )}

        {screen === 'menu' && mapOpen && (
          <LevelMap
            bestLevel={bestLevel}
            onBack={() => setMapOpen(false)}
            onStart={beginStage}
          />
        )}

        {/* Modals */}
        {screen === 'playing' && inGameSettingsOpen && (
          <div
            onPointerDown={(e) => e.stopPropagation()}
            className="absolute inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          >
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="gunhit-ingame-settings-title"
              className="pop-in w-full max-w-sm rounded-3xl border border-cyan-200/30 bg-gradient-to-b from-[#132c34] to-[#08151d] p-4 text-white shadow-[0_24px_70px_rgba(0,0,0,.78)]"
            >
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <div className="text-[10px] font-black tracking-[0.22em] text-amber-300">⏸ PERMAINAN DIJEDA</div>
                  <h2 id="gunhit-ingame-settings-title" className="mt-0.5 text-xl font-black tracking-widest text-cyan-100">
                    PENGATURAN
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    sfx.click();
                    setInGameSettingsOpen(false);
                  }}
                  aria-label="Tutup pengaturan permainan"
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-xl text-white/85 hover:bg-white/20"
                >
                  ×
                </button>
              </div>

              {/* Sound & Volume Adjustment */}
              <div className="mb-3 rounded-2xl border border-white/15 bg-white/[0.06] p-3">
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={toggleMute}
                    className="flex flex-1 items-center gap-3 text-left transition active:scale-[0.99]"
                  >
                    <span className="text-xl">{muted || soundVolume <= 0 ? '🔇' : '🔊'}</span>
                    <span>
                      <span className="block text-sm font-black">SUARA GAME</span>
                      <span className="block text-[10px] text-white/55">Geser untuk atur volume efek</span>
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={toggleMute}
                    className={`rounded-full px-2.5 py-1 text-[10px] font-black ${
                      muted || soundVolume <= 0 ? 'bg-white/10 text-white/65' : 'bg-emerald-400/25 text-emerald-200'
                    }`}
                  >
                    {muted || soundVolume <= 0 ? 'MATI' : `${Math.round(soundVolume * 100)}%`}
                  </button>
                </div>

                <div className="mt-2.5 flex items-center gap-2">
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    aria-label="Volume suara saat bermain"
                    value={muted ? 0 : Math.round(soundVolume * 100)}
                    onChange={(e) => changeSoundVolume(Number(e.target.value) / 100)}
                    onPointerUp={() => {
                      if (!muted && soundVolume > 0) sfx.click();
                    }}
                    className="h-2 flex-1 cursor-pointer accent-emerald-400"
                  />
                </div>

                <div className="mt-2 grid grid-cols-5 gap-1">
                  {[0, 0.25, 0.5, 0.75, 1].map((preset) => {
                    const activePreset = (muted ? 0 : Math.round(soundVolume * 100)) === Math.round(preset * 100);
                    return (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => changeSoundVolume(preset, preset > 0)}
                        className={`rounded-lg border py-1 text-[9.5px] font-black transition active:scale-95 ${
                          activePreset
                            ? 'border-emerald-300 bg-emerald-400/25 text-emerald-100'
                            : 'border-white/10 bg-white/[0.04] text-white/70 hover:bg-white/10'
                        }`}
                      >
                        {preset === 0 ? 'MATI' : `${Math.round(preset * 100)}%`}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Game Speed Selector */}
              <div className="mb-4 rounded-2xl border border-white/15 bg-white/[0.04] p-3">
                <div className="text-center text-[11px] font-black tracking-[0.18em] text-amber-200">
                  ⚡ KECEPATAN GAME
                </div>
                <div className="mt-2 grid grid-cols-4 gap-1.5">
                  {SGA_SPEED_OPTIONS.map((spd) => (
                    <button
                      key={spd}
                      type="button"
                      aria-pressed={gameSpeed === spd}
                      onClick={() => {
                        setGameSpeed(spd);
                        sfx.click();
                      }}
                      className={`rounded-xl border px-1 py-2 text-center transition active:scale-95 ${
                        gameSpeed === spd
                          ? 'border-amber-300/90 bg-amber-400/25 text-amber-200 shadow-[0_0_14px_rgba(251,191,36,.3)]'
                          : 'border-white/10 bg-white/[.04] text-white/80 hover:bg-white/10'
                      }`}
                    >
                      <span className="block text-xs font-black tracking-wide">{formatSgaSpeed(spd)}</span>
                      <span className="mt-0.5 block text-[8px] font-bold tracking-wider text-white/60">
                        {spd === 1 ? 'NORMAL' : 'TURBO'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Resume & Back to Menu Actions */}
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => {
                    sfx.click();
                    setInGameSettingsOpen(false);
                  }}
                  className="w-full rounded-2xl border border-emerald-200/40 border-b-4 border-b-emerald-800 bg-gradient-to-b from-[#22c55e] via-[#16a34a] to-[#15803d] py-3 text-base font-black tracking-wider text-white shadow-[0_10px_24px_rgba(34,197,94,0.45)] transition hover:brightness-110 active:translate-y-0.5"
                >
                  ▶ LANJUTKAN MAIN
                </button>
                <button
                  type="button"
                  onClick={() => {
                    sfx.click();
                    goToMainMenuFromPlay();
                  }}
                  className="w-full rounded-2xl border border-white/20 bg-white/10 py-2.5 text-sm font-black tracking-wider text-white/95 transition hover:bg-white/20 active:scale-[0.98]"
                >
                  🏠 KE MENU UTAMA
                </button>
              </div>
            </section>
          </div>
        )}
        {screen === 'menu' && arsenalOpen && (
          <Arsenal
            current={weapon}
            highestLevel={bestLevel}
            totalCoins={totalCoins}
            diamonds={diamonds}
            refreshKey={cheatNonce}
            onBuyRare={buyRareWeapon}
            onUnlockAll={unlockAllAffordableWeapons}
            onPick={chooseWeapon}
            onClose={() => setArsenalOpen(false)}
          />
        )}

        {screen === 'menu' && questOpen && (
          <QuestModal
            state={questState}
            ownedCount={ownedWeaponIds().length}
            onClaim={handleClaimQuest}
            onClaimMilestone={handleClaimMilestone}
            onClose={() => setQuestOpen(false)}
          />
        )}

        {screen === 'menu' && leaderboardOpen && (
          <LeaderboardModal
            bestScore={best}
            bestLevel={bestLevel}
            totalCoins={totalCoins}
            onClose={() => setLeaderboardOpen(false)}
          />
        )}

        {/* BOSS DEFEATED Modal Celebration (Exact Screenshot 2!) */}
        {bossDefeatedData && (
          <BossDefeatedModal
            bossName={bossDefeatedData.name}
            bossType={bossDefeatedData.bossType}
            stage={bossDefeatedData.level}
            rewardCoins={bossDefeatedData.coins}
            playerLevel={bossDefeatedData.playerLevel}
            xpBefore={bossDefeatedData.xpBefore}
            xpProgress={bossDefeatedData.xpProgress}
            xpGained={bossDefeatedData.xpGained}
            leveledUp={bossDefeatedData.leveledUp}
            onContinue={handleContinueAfterBoss}
          />
        )}

        {/* PILIHAN POWER UP DARI BINTANG */}
        {starBuffOpen && (
          <StarBuffModal
            treasure={starBuffTreasure}
            onPick={(kind) => {
              gameRef.current?.applyBuff(kind);
              setStarBuffOpen(false);
            }}
          />
        )}

        {/* BONUS STAGE: KOTAK HADIAH ala Knife Boss 100 Lv — efek kotak + senjata baru Gun Hit */}
        {bonusStageOpen && (
          <BossGiftBoxModal
            bossName={bonusAfterBoss.bossName}
            stage={bonusAfterBoss.stage}
            currentWeaponId={weapon}
            onClaim={handleGiftBoxClaim}
          />
        )}

        {/* Game Over Screen (DIBESARKAN TEKSNYA 2X + ANIMASI MEWAH!) */}
        {screen === 'over' && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/80 px-6 text-white backdrop-blur-lg">
            <div className="pop-in flex w-full max-w-sm flex-col items-center">
              {/* Header 2X LEBIH BESAR */}
              <div className="text-6xl sm:text-7xl font-black italic tracking-wider text-red-500 drop-shadow-[0_6px_0_#991b1b] font-game leading-none">
                GAME OVER
              </div>
              <div className="mt-2 text-base sm:text-lg font-bold text-white/80 font-game">
                Bertahan hingga <span className="font-black text-amber-300">STAGE {result.level}</span>
              </div>

              {/* Glassmorphism Card DIBESARKAN & TEKS 2X */}
              <div className="mt-6 w-full rounded-3xl border-2 border-white/20 bg-white/10 p-6 text-center shadow-[0_20px_50px_rgba(0,0,0,0.8)] backdrop-blur-xl">
                <div className="text-sm font-black tracking-[0.25em] text-white/60 font-game">SKOR AKHIR</div>

                {/* Score Counter Roll-up (Besar & Bergetar) */}
                <div className="text-8xl sm:text-9xl font-black leading-none my-2 font-game text-white filter drop-shadow-[0_8px_16px_rgba(255,255,255,0.3)] animate-pulse">
                  {displayScore}
                </div>

                {result.newBest && (
                  <div className="float-y mx-auto mt-2 mb-1 inline-block rounded-full bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-300 px-5 py-1.5 text-sm font-black text-black shadow-[0_0_15px_#fde047] font-game">
                    ⭐ REKOR TERBARU! ⭐
                  </div>
                )}

                {/* Stat Grid (Teks Diperbesar 2x) */}
                <div className="mt-5 grid grid-cols-2 gap-3 border-t-2 border-white/15 pt-4">
                  <div className="rounded-2xl border-2 border-white/15 bg-black/60 px-3 py-3 shadow-inner">
                    <div className="text-xs font-black tracking-wider text-white/50 font-game">REKOR TERBAIK</div>
                    <div className="text-3xl font-black text-amber-300 font-mono mt-1 drop-shadow">{best}</div>
                  </div>
                  <div className="rounded-2xl border-2 border-white/15 bg-black/60 px-3 py-3 shadow-inner">
                    <div className="text-xs font-black tracking-wider text-white/50 font-game">DAPAT KOIN</div>
                    <div className="mt-1 flex items-center justify-center gap-1 text-3xl font-black text-amber-300 font-mono drop-shadow"><span>+{result.coins}</span><CoinSprite size={30} /></div>
                  </div>
                </div>
              </div>

              {/* Action Buttons: DIBESARKAN & TEBAL */}
              <button
                onClick={play}
                className="pulse-btn mt-6 w-full rounded-2xl border-b-4 border-emerald-800 bg-gradient-to-b from-[#22c55e] via-[#16a34a] to-[#15803d] py-4 text-3xl font-black text-white shadow-[0_12px_28px_rgba(34,197,94,0.5)] transition active:translate-y-1 active:border-b-0 font-game hover:brightness-110"
              >
                ↻ MAIN LAGI
              </button>

              <button
                onClick={() => {
                  gameRef.current?.toIdle();
                  setScreen('menu');
                }}
                className="mt-3 w-full rounded-2xl border-2 border-white/20 bg-white/15 py-3.5 text-base sm:text-lg font-black text-white transition hover:bg-white/25 active:scale-95 font-game shadow-lg"
              >
                🏠 MENU UTAMA
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
