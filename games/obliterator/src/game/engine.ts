import { soundEngine } from './sound';
import {
  VARIANT_CORES,
  computeTargetAngularVelocity,
  drawMine,
  drawShatterShard,
  drawTargetCore,
  getCoreThemeForStage,
  pickTargetVariant,
} from './targets';
import type { TargetVariant } from './targets';
import {
  ArgentCell,
  CoreTheme,
  EmbeddedSpike,
  FloatingText,
  FlyingBolt,
  GamePhase,
  HudSnapshot,
  Particle,
  ShatterShard,
  WeaponId,
  WeaponKind,
  WeaponTheme,
} from './types';
import {
  WEAPON_ORDER,
  WEAPON_THEMES,
  drawObliteratorGun,
  drawObliteratorSpike,
  drawVerticalLaserSight,
  pseudoRandom,
  strokeLightning,
} from './weapons';
import { SPECTRUM, drawSnowflake, drawTwinkle } from './specialWeapons';
import {
  drawElementalParticle,
  drawKindTrail,
  drawTargetKindFx,
  isElemental,
  isFirearm,
} from './trails';

const STORAGE_BEST_SCORE = 'obliterator_hit_best_score_v1';
const STORAGE_BEST_STAGE = 'obliterator_hit_best_stage_v1';
const STORAGE_GEMS = 'obliterator_hit_gems_v1';
const STORAGE_WEAPON = 'obliterator_hit_weapon_v1';

function normalizeAngle(rad: number): number {
  let a = rad % (Math.PI * 2);
  if (a <= -Math.PI) a += Math.PI * 2;
  if (a > Math.PI) a -= Math.PI * 2;
  return a;
}

function angularDistance(a: number, b: number): number {
  return Math.abs(normalizeAngle(a - b));
}

export class ObliteratorGameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private onHudChange: (hud: HudSnapshot) => void;

  private rafId: number = 0;
  private lastTimestamp: number = 0;
  private elapsedTime: number = 0;
  private hitstopTimer: number = 0;

  // Extra spectacle FX state
  private chargeGlow: number = 1;
  private screenFlash: number = 0;
  private screenFlashColor: string = '#4ade80';
  private intakeTimer: number = 0;
  private targetFx: number = 0;
  private targetFxKind: WeaponKind = 'obliterator';
  private dripTimer: number = 0;

  // Special wheel variants (Knife-Hit style challenge wheels)
  private targetVariant: TargetVariant = 'normal';
  private pulsePhase = 0;
  private driftPhase = 0;
  private orbitPhase = 0;
  private whirlTimer = 0;
  private whirlDir = 1;
  private whirlFlash = 0;
  private mines: { a: number; s: number; ph: number }[] = [];

  // Banana Gun peel / flesh cycle: closed → opening → hold (empty) → closing (refilling)
  private bananaPhase: 'closed' | 'opening' | 'hold' | 'closing' = 'closed';
  private bananaPhaseT: number = 0;
  private bananaOpen: number = 0;
  private bananaFill: number = 1;

  // Viewport logical CSS pixels
  private width: number = 800;
  private height: number = 600;
  private dpr: number = 1;

  // Game state
  private phase: GamePhase = 'title';
  private score: number = 0;
  private bestScore: number = 0;
  private stage: number = 1;
  private bestStage: number = 1;
  private argentGems: number = 0;

  private selectedWeapon: WeaponId = 'bfg';
  private inspectMode: boolean = false;
  private inspectBlend: number = 0; // 0 = arena view, 1 = zoomed weapon showcase

  // Stage & Target Core state
  private coreTheme: CoreTheme = getCoreThemeForStage(1);
  private targetRotation: number = 0;
  private waveTime: number = 0;
  private targetEntryDrop: number = 0; // 1.0 -> 0.0 slide down from top when spawning
  private targetKickY: number = 0; // Upward punch velocity/displacement when shot hits
  private targetScalePop: number = 1;
  private targetHitFlash: number = 0;

  private ammoTotal: number = 7;
  private ammoLeft: number = 7;
  private hitsLanded: number = 0;

  // Overdrive & Combo
  private combo: number = 0;
  private timeSinceLastHit: number = 99;
  private overdriveCharge: number = 0; // 0..100
  private overdrivePrimed: boolean = false;
  private activeBeamAlpha: number = 0;

  // Gun dynamic mechanics
  private gunRecoil: number = 0;
  private gunMuzzleFlash: number = 0;
  private gunHeat: number = 0;
  private fireCooldown: number = 0;

  // Screen FX
  private shakeIntensity: number = 0;
  private redFailFlash: number = 0;
  private shatterTransitionTimer: number = 0;

  // Entities
  private idCounter: number = 1;
  private embeddedSpikes: EmbeddedSpike[] = [];
  private argentCells: ArgentCell[] = [];
  private flyingBolts: FlyingBolt[] = [];
  private shatterShards: ShatterShard[] = [];
  private particles: Particle[] = [];
  private ambientEmbers: Particle[] = [];
  private floatingTexts: FloatingText[] = [];

  constructor(canvas: HTMLCanvasElement, onHudChange: (hud: HudSnapshot) => void) {
    this.canvas = canvas;
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Could not initialize 2D context');
    }
    this.ctx = context;
    this.onHudChange = onHudChange;

    this.loadPersistence();
    this.resize();
    this.seedAmbientEmbers();
    this.setupStage(1, true);
    this.emitHud();
  }

  private loadPersistence() {
    try {
      const s = Number(localStorage.getItem(STORAGE_BEST_SCORE) || '0');
      const st = Number(localStorage.getItem(STORAGE_BEST_STAGE) || '1');
      const g = Number(localStorage.getItem(STORAGE_GEMS) || '0');
      const w = localStorage.getItem(STORAGE_WEAPON) as WeaponId | null;
      if (!Number.isNaN(s)) this.bestScore = s;
      if (!Number.isNaN(st) && st >= 1) this.bestStage = st;
      if (!Number.isNaN(g)) this.argentGems = g;
      if (w && WEAPON_ORDER.includes(w)) {
        this.selectedWeapon = w;
      }
    } catch {
      // Ignore storage access restrictions
    }
  }

  private savePersistence() {
    try {
      localStorage.setItem(STORAGE_BEST_SCORE, String(this.bestScore));
      localStorage.setItem(STORAGE_BEST_STAGE, String(this.bestStage));
      localStorage.setItem(STORAGE_GEMS, String(this.argentGems));
      localStorage.setItem(STORAGE_WEAPON, this.selectedWeapon);
    } catch {
      // Ignore storage access restrictions
    }
  }

  public resize() {
    const rect = this.canvas.parentElement?.getBoundingClientRect();
    this.width = Math.max(320, rect ? rect.width : window.innerWidth);
    this.height = Math.max(480, rect ? rect.height : window.innerHeight);
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);

    this.canvas.width = Math.floor(this.width * this.dpr);
    this.canvas.height = Math.floor(this.height * this.dpr);
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;
  }

  private getArenaMetrics() {
    const centerX = this.width * 0.5;
    // Scale gracefully so both tall portrait phones and wide landscape monitors frame target + gun heroically
    const unitScale = Math.max(0.66, Math.min(1.12, this.height / 760));
    const targetRadius = Math.round(92 * unitScale);
    const targetBaseY = Math.max(targetRadius + 80, this.height * 0.265);
    const gunScale = unitScale * 1.32;
    const gunBaseY = this.height - 86 * gunScale;
    const gunMuzzleY = gunBaseY - 118 * gunScale;
    return {
      centerX,
      unitScale,
      targetRadius,
      targetBaseY,
      gunScale,
      gunBaseY,
      gunMuzzleY,
    };
  }

  private seedAmbientEmbers() {
    this.ambientEmbers = [];
    for (let i = 0; i < 36; i++) {
      this.ambientEmbers.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        vx: (Math.random() - 0.5) * 18,
        vy: -18 - Math.random() * 42,
        size: 1.2 + Math.random() * 2.5,
        color: Math.random() > 0.4 ? '#f97316' : '#4ade80',
        alpha: 0.2 + Math.random() * 0.55,
        life: 1,
        maxLife: 1,
        gravity: 0,
        drag: 1,
        type: 'ember',
      });
    }
  }

  /**
   * Initializes a stage (Wave 1, 2, ... Boss Wave 5, etc.)
   */
  private setupStage(stageNum: number, initialDemo = false) {
    this.stage = stageNum;
    this.targetVariant = pickTargetVariant(stageNum);
    const variantCore =
      this.targetVariant !== 'normal' && this.targetVariant !== 'boss'
        ? VARIANT_CORES[this.targetVariant as keyof typeof VARIANT_CORES]
        : undefined;
    this.coreTheme = variantCore ?? getCoreThemeForStage(stageNum);
    this.waveTime = 0;
    this.targetRotation = 0;
    this.targetEntryDrop = initialDemo ? 0 : 1;
    this.targetKickY = 0;
    this.targetScalePop = 1;
    this.targetHitFlash = 0;
    this.hitsLanded = 0;
    this.flyingBolts = [];
    this.pulsePhase = 0;
    this.driftPhase = 0;
    this.orbitPhase = 0;
    this.whirlTimer = 0;
    this.whirlDir = 1;
    this.whirlFlash = 0;
    this.mines =
      this.targetVariant === 'mines'
        ? [
            { a: 0.5, s: 1.5 + stageNum * 0.03, ph: 0 },
            { a: Math.PI + 0.6, s: -(1.15 + stageNum * 0.03), ph: 1 },
            ...(stageNum >= 15 ? [{ a: 2.4, s: 0.85 + stageNum * 0.02, ph: 2 }] : []),
          ]
        : [];

    const isBoss = this.coreTheme.isBoss;
    // Balanced Knife-Hit shot count per wave: brisk, tense, never tedious!
    // Hazard wheels get one extra bolt for fairness
    const hazardBonus =
      this.targetVariant === 'drift' ||
      this.targetVariant === 'mines' ||
      this.targetVariant === 'orbiter' ||
      this.targetVariant === 'whirl'
        ? 1
        : 0;
    this.ammoTotal = isBoss
      ? Math.min(14, 9 + Math.floor(stageNum / 5) * 2)
      : Math.min(13, 6 + Math.floor(stageNum * 0.55) + hazardBonus);
    this.ammoLeft = this.ammoTotal;

    // Pre-spawned spikes stuck around the wheel (0 on Stage 1 for clean intro, 1-4 on higher stages)
    this.embeddedSpikes = [];
    let preCount = 0;
    if (stageNum >= 2 && !isBoss) {
      preCount = Math.min(4, 1 + Math.floor((stageNum - 1) / 2));
    } else if (isBoss) {
      preCount = Math.min(4, 2 + Math.floor(stageNum / 10));
    }

    const usedAngles: number[] = [];
    for (let i = 0; i < preCount; i++) {
      // Spread evenly with slight organic jitter so gaps are always fair & solvable
      const baseAngle = normalizeAngle((i / preCount) * Math.PI * 2 + 0.55);
      usedAngles.push(baseAngle);
      this.embeddedSpikes.push({
        id: this.idCounter++,
        localAngle: baseAngle,
        weaponId: this.selectedWeapon,
        isPreSpawned: true,
        embedAnim: 0,
        flash: 0,
        age: 99,
      });
    }

    // Spawn 1-2 Collectible Crimson Argent Energy Crystals in open gaps around the wheel!
    this.argentCells = [];
    const cellCount = isBoss ? 2 : Math.random() < 0.72 ? 1 : 2;
    for (let c = 0; c < cellCount; c++) {
      for (let attempt = 0; attempt < 16; attempt++) {
        const candidate = normalizeAngle(Math.random() * Math.PI * 2);
        const safeFromSpikes = usedAngles.every((ua) => angularDistance(ua, candidate) > 0.42);
        const safeFromCells = this.argentCells.every(
          (cell) => angularDistance(cell.localAngle, candidate) > 0.65
        );
        if (safeFromSpikes && safeFromCells) {
          this.argentCells.push({
            id: this.idCounter++,
            localAngle: candidate,
            collected: false,
            pulseOffset: Math.random() * Math.PI * 2,
          });
          break;
        }
      }
    }

    if (stageNum > this.bestStage) {
      this.bestStage = stageNum;
      this.savePersistence();
    }
    this.emitHud();
  }

  public start() {
    this.lastTimestamp = performance.now();
    const loop = (now: number) => {
      const rawDt = (now - this.lastTimestamp) / 1000;
      this.lastTimestamp = now;
      const dt = Math.min(0.05, Math.max(0.0001, rawDt));

      this.update(dt);
      this.render();

      this.rafId = requestAnimationFrame(loop);
    };
    this.rafId = requestAnimationFrame(loop);
  }

  public destroy() {
    cancelAnimationFrame(this.rafId);
  }

  // ===========================================================================
  // PUBLIC PLAYER CONTROLS & UI ACTIONS
  // ===========================================================================

  public startGameAndFire() {
    if (this.inspectMode) {
      this.inspectMode = false;
    }
    if (this.phase === 'title') {
      this.phase = 'playing';
      this.score = 0;
      this.combo = 0;
      this.overdriveCharge = 35; // Nice head-start charge so players experience Overdrive soon!
      this.overdrivePrimed = false;
      this.setupStage(1, true);
      this.emitHud();
      this.fireShot();
      return;
    }
    if (this.phase === 'gameover') {
      this.restartGame();
      return;
    }
    this.fireShot();
  }

  public restartGame() {
    this.phase = 'playing';
    this.score = 0;
    this.combo = 0;
    this.overdriveCharge = 25;
    this.overdrivePrimed = false;
    this.redFailFlash = 0;
    this.shatterShards = [];
    this.floatingTexts = [];
    this.setupStage(1, false);
    this.emitHud();
  }

  public selectWeapon(weaponId: WeaponId) {
    if (this.selectedWeapon === weaponId) return;
    this.selectedWeapon = weaponId;
    soundEngine.playWeaponSwitch();
    // Kick subtle equip recoil & vent sparks so swapping feels tactile!
    this.gunRecoil = 0.55;
    this.gunMuzzleFlash = 0.45;
    const { centerX, gunMuzzleY } = this.getArenaMetrics();
    const theme = WEAPON_THEMES[weaponId];
    this.spawnBurst(centerX, gunMuzzleY, theme.plasmaMid, 12, 190);
    this.savePersistence();
    this.emitHud();
  }

  public toggleInspectMode() {
    this.inspectMode = !this.inspectMode;
    soundEngine.playWeaponSwitch();
    this.emitHud();
  }

  public toggleMute() {
    soundEngine.muted = !soundEngine.muted;
    this.emitHud();
  }

  public triggerOverdrive() {
    if (this.overdriveCharge < 100 || this.overdrivePrimed) return;
    this.overdrivePrimed = true;
    soundEngine.playWeaponSwitch();
    const { centerX, gunBaseY } = this.getArenaMetrics();
    const theme = WEAPON_THEMES[this.selectedWeapon];
    this.spawnFloatingText(centerX, gunBaseY - 125, 'BFG OVERDRIVE READY!', theme.plasmaMid, 1.2);
    this.emitHud();
  }

  /**
   * Fires an Obliterator Bolt strictly straight UPWARD (-Y) from the bottom-center weapon!
   */
  public fireShot() {
    // Allow free test-firing anytime when Inspecting Weapon!
    if (this.inspectMode) {
      if (this.fireCooldown > 0) return;
      this.fireCooldown = 0.11;
      this.gunRecoil = 1.0;
      this.gunMuzzleFlash = 1.0;
      this.gunHeat = Math.min(1, this.gunHeat + 0.28);
      this.shakeIntensity = Math.max(this.shakeIntensity, 4.5);
      soundEngine.playShoot(false, WEAPON_THEMES[this.selectedWeapon].kind);
      this.spawnGunRecoilVentFX();
      return;
    }

    if (this.phase !== 'playing') return;
    if (this.ammoLeft <= 0 || this.fireCooldown > 0 || this.targetEntryDrop > 0.35) return;

    const isOverdrive = this.overdrivePrimed;
    if (isOverdrive) {
      this.overdrivePrimed = false;
      this.overdriveCharge = 0;
      this.activeBeamAlpha = 1.0;
    }

    this.ammoLeft = Math.max(0, this.ammoLeft - 1);
    this.fireCooldown = 0.085; // Snappy arcade responsiveness!
    this.gunRecoil = 1.0;
    this.gunMuzzleFlash = 1.0;
    this.gunHeat = Math.min(1, this.gunHeat + 0.26);
    this.shakeIntensity = Math.max(this.shakeIntensity, isOverdrive ? 10 : 4);

    const { centerX, gunMuzzleY, unitScale } = this.getArenaMetrics();
    const fireKind: WeaponKind = WEAPON_THEMES[this.selectedWeapon].kind ?? 'obliterator';
    const speedByKind: Record<string, number> = {
      rifle: 2950,
      banana: 2050,
      beehive: 2350,
      bubble: 1850,
      confetti: 2700,
      crystal: 2150,
      shotgun: 1900,
      revolver: 2150,
      pistol: 2250,
    };
    const baseSpeed = speedByKind[fireKind] ?? 2250;
    const boltSpeed = (isOverdrive ? baseSpeed * 1.32 : baseSpeed) * unitScale;

    this.flyingBolts.push({
      id: this.idCounter++,
      x: centerX,
      y: gunMuzzleY + 12 + this.muzzleLift(fireKind) * unitScale,
      startY: gunMuzzleY + 12 + this.muzzleLift(fireKind) * unitScale,
      vy: -boltSpeed,
      weaponId: this.selectedWeapon,
      isOverdrive,
      ricocheted: false,
      vx: 0,
      rot: 0,
      vRot: 0,
      alpha: 1,
    });

    // Banana Gun: flesh shot out — peel pops open, then closes & refills
    if (fireKind === 'banana' && this.bananaPhase === 'closed') {
      this.bananaPhase = 'opening';
      this.bananaPhaseT = 0;
      this.bananaFill = 0;
    }

    soundEngine.playShoot(isOverdrive, WEAPON_THEMES[this.selectedWeapon].kind);
    this.spawnGunRecoilVentFX();
    this.emitHud();
  }

  private spawnGunRecoilVentFX() {
    const { centerX, gunBaseY, gunScale } = this.getArenaMetrics();
    const theme = WEAPON_THEMES[this.selectedWeapon];

    // Twin side hydraulic exhaust steam puffs venting left & right! (Obliterator only)
    for (const dir of (theme.kind ?? 'obliterator') === 'obliterator' ? [-1, 1] : []) {
      for (let i = 0; i < 5; i++) {
        this.particles.push({
          x: centerX + dir * 42 * gunScale,
          y: gunBaseY - (10 + Math.random() * 25) * gunScale,
          vx: dir * (85 + Math.random() * 135),
          vy: -15 + (Math.random() - 0.5) * 55,
          size: (5 + Math.random() * 8) * gunScale,
          color: this.gunHeat > 0.6 ? '#fb923c' : theme.plasmaMid,
          alpha: 0.42,
          life: 0.34,
          maxLife: 0.34,
          gravity: -35,
          drag: 0.91,
          type: 'smoke',
        });
      }
    }

    const isOD = this.activeBeamAlpha > 0.9;
    const mx = centerX;
    const my = gunBaseY - (118 - this.muzzleLift(theme.kind ?? 'obliterator')) * gunScale;
    this.chargeGlow = 0;
    this.screenFlash = Math.max(this.screenFlash, isOD ? 0.55 : 0.18);
    this.screenFlashColor = theme.kind === 'rainbow' ? this.kindColor(0) : theme.plasmaMid;
    const kind: WeaponKind = theme.kind ?? 'obliterator';
    if (isFirearm(kind)) {
      this.spawnFirearmMuzzleFX(kind, mx, my, isOD);
    } else if (kind !== 'obliterator') {
      this.spawnKindMuzzleFX(kind, mx, my, isOD);
    }
    this.spawnShockwaves(kind, mx, my, isOD);
    const elemental = isElemental(kind);

    if (!elemental) {
    // Upward muzzle sparks
    for (let s = 0; s < (isOD ? 22 : 12); s++) {
      this.particles.push({
        x: mx + (Math.random() - 0.5) * 16,
        y: my,
        vx: (Math.random() - 0.5) * 260,
        vy: -260 - Math.random() * 420,
        size: 1.6 + Math.random() * 2.4,
        color: Math.random() > 0.4 ? theme.muzzleFlashHex : '#ffffff',
        alpha: 1,
        life: 0.3,
        maxLife: 0.3,
        gravity: 520,
        drag: 0.94,
        type: 'spark',
      });
    }

    // Supersonic speed-line streaks shooting UP
    for (let s = 0; s < (isOD ? 18 : 10); s++) {
      this.particles.push({
        x: mx + (Math.random() - 0.5) * 30 * gunScale,
        y: my - Math.random() * 20,
        vx: (Math.random() - 0.5) * 60,
        vy: -1100 - Math.random() * 900,
        size: 1.2 + Math.random() * 1.8,
        color: Math.random() > 0.5 ? '#ffffff' : theme.plasmaMid,
        alpha: 0.95,
        life: 0.14 + Math.random() * 0.08,
        maxLife: 0.22,
        gravity: 0,
        drag: 0.97,
        type: 'streak',
      });
    }

    // Horizontal muzzle-brake jet streaks
    for (const dir of [-1, 1]) {
      for (let s = 0; s < 6; s++) {
        this.particles.push({
          x: mx + dir * 18 * gunScale,
          y: my + (4 + Math.random() * 10) * gunScale,
          vx: dir * (500 + Math.random() * 500),
          vy: -80 - Math.random() * 160,
          size: 1.4 + Math.random() * 1.6,
          color: theme.plasmaMid,
          alpha: 0.9,
          life: 0.16,
          maxLife: 0.16,
          gravity: 0,
          drag: 0.9,
          type: 'streak',
        });
      }
    }

    // Stacked elliptical shockwave rings racing upward off the muzzle (kept subtle)
    for (let k = 0; k < (isOD ? 3 : 2); k++) {
      this.particles.push({
        x: mx,
        y: my - k * 8,
        vx: 0,
        vy: -140 - k * 120,
        size: (12 + k * 8) * gunScale,
        grow: 220 + k * 60,
        color: k === 0 ? '#ffffff' : theme.plasmaMid,
        alpha: 0.9,
        life: 0.28 + k * 0.07,
        maxLife: 0.28 + k * 0.07,
        gravity: 0,
        drag: 0.96,
        type: 'ellipse',
      });
    }

    }

    // Core flash
    this.particles.push({
      x: mx,
      y: my - 10,
      vx: 0,
      vy: 0,
      size: (isOD ? 46 : 28) * gunScale,
      color: kind === 'rainbow' ? this.kindColor(2) : theme.plasmaMid,
      alpha: 1,
      life: 0.12,
      maxLife: 0.12,
      gravity: 0,
      drag: 1,
      type: 'glow',
    });

    // Lightning arcs crackling out of the muzzle (Obliterator family only)
    for (let k = 0; k < (kind === 'obliterator' ? (isOD ? 7 : 3) : 0); k++) {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.2;
      const len = (50 + Math.random() * 60) * gunScale * (isOD ? 1.6 : 1);
      this.particles.push({
        x: mx,
        y: my,
        x2: mx + Math.cos(a) * len,
        y2: my + Math.sin(a) * len,
        seed: Math.random() * 1000,
        vx: 0,
        vy: 0,
        size: 1.3,
        color: theme.plasmaMid,
        alpha: 1,
        life: 0.1,
        maxLife: 0.1,
        gravity: 0,
        drag: 1,
        type: 'lightning',
      });
    }

    // Spent glowing capacitor cell ejected from the receiver, tumbling
    for (let c = 0; c < (kind === 'obliterator' ? (isOD ? 2 : 1) : 0); c++) {
      const dir = c === 0 ? 1 : -1;
      this.particles.push({
        x: centerX + dir * 30 * gunScale,
        y: gunBaseY + 6 * gunScale,
        vx: dir * (200 + Math.random() * 140),
        vy: -320 - Math.random() * 160,
        size: 1.15 * gunScale,
        color: theme.plasmaMid,
        alpha: 1,
        life: 0.9,
        maxLife: 0.9,
        gravity: 1300,
        drag: 0.99,
        rot: Math.random() * Math.PI,
        vRot: dir * (14 + Math.random() * 10),
        type: 'shell',
      });
    }
  }

  private spawnImpactFX(
    impactX: number,
    impactY: number,
    targetCenterY: number,
    radius: number,
    color: string,
    big: boolean
  ) {
    // Lightning crawling along the wheel rim from the impact point
    const impactKind: WeaponKind = WEAPON_THEMES[this.selectedWeapon].kind ?? 'obliterator';
    if (impactKind !== 'obliterator') this.spawnKindImpactFX(impactKind, impactX, impactY, big);
    const elementalHit = isElemental(impactKind);
    if (elementalHit) {
      const prev = this.targetFxKind === impactKind ? this.targetFx : 0;
      this.targetFxKind = impactKind;
      this.targetFx = Math.min(1.4, prev + (big ? 1.4 : 0.85));
    }
    const arcCount = impactKind === 'obliterator' ? (big ? 10 : 5) : 0;
    for (let k = 0; k < arcCount; k++) {
      const off = (Math.random() > 0.5 ? 1 : -1) * (0.25 + Math.random() * (big ? 1.4 : 0.8));
      this.particles.push({
        x: impactX,
        y: impactY - 10,
        x2: impactX + Math.sin(off) * radius,
        y2: targetCenterY + Math.cos(off) * radius,
        seed: Math.random() * 1000,
        vx: 0,
        vy: 0,
        size: big ? 2 : 1.3,
        color,
        alpha: 1,
        life: 0.14 + Math.random() * 0.08,
        maxLife: 0.22,
        gravity: 0,
        drag: 1,
        type: 'lightning',
      });
    }
    // Downward spray streaks (not for elemental guns — they have their own)
    for (let s = 0; s < (elementalHit ? 0 : big ? 22 : 12); s++) {
      const a = Math.PI / 2 + (Math.random() - 0.5) * 2.6;
      const spd = 300 + Math.random() * 600;
      this.particles.push({
        x: impactX,
        y: impactY,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd,
        size: 1.4 + Math.random() * 1.8,
        color: Math.random() > 0.5 ? '#ffffff' : color,
        alpha: 1,
        life: 0.22,
        maxLife: 0.22,
        gravity: 600,
        drag: 0.92,
        type: 'streak',
      });
    }
    this.particles.push({
      x: impactX,
      y: impactY - 6,
      vx: 0,
      vy: 0,
      size: big ? 70 : 36,
      color,
      alpha: 1,
      life: 0.16,
      maxLife: 0.16,
      gravity: 0,
      drag: 1,
      type: 'glow',
    });
    this.particles.push({
      x: impactX,
      y: impactY,
      vx: 0,
      vy: 0,
      size: 8,
      grow: big ? 520 : 300,
      color: '#ffffff',
      alpha: elementalHit ? 0 : 0.9,
      life: 0.22,
      maxLife: 0.22,
      gravity: 0,
      drag: 1,
      type: 'ellipse',
    });
    this.screenFlash = Math.max(this.screenFlash, big ? 0.4 : 0.1);
  }

  // ===========================================================================
  // KIND-SPECIFIC SPECTACLE FX (Rainbow / Water / Snow)
  // ===========================================================================

  private kindColor(i = 0): string {
    const t = WEAPON_THEMES[this.selectedWeapon];
    if (t.kind === 'rainbow') return `hsl(${(this.elapsedTime * 220 + i * 51) % 360}, 100%, 64%)`;
    return Math.random() > 0.35 ? t.plasmaMid : '#ffffff';
  }

  private pushP(p: Partial<Particle> & { type: Particle['type'] }) {
    this.particles.push({
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      size: 3,
      color: '#ffffff',
      alpha: 1,
      life: 0.5,
      maxLife: p.life ?? 0.5,
      gravity: 0,
      drag: 0.95,
      ...p,
    });
  }

  /** Signature element bursts — each family uses entirely different shapes & motion */
  private spawnElementBurst(kind: WeaponKind, x: number, y: number, up: boolean, big: boolean) {
    const dir = up ? -1 : 1;
    const mult = big ? 2 : 1;
    if (kind === 'rainbow') {
      // Clean expanding rainbow arcs + a modest confetti sprinkle
      for (let k = 0; k < (big ? 2 : 1); k++) {
        this.pushP({
          type: 'rainbowArc',
          kind,
          x,
          y: y + dir * k * 5,
          vy: dir * (55 + k * 40),
          size: 18 + k * 7,
          grow: 110 + k * 30,
          rot: up ? 0 : Math.PI,
          alpha: 0.9,
          life: 0.5,
          drag: 0.95,
        });
      }
      for (let i = 0; i < 12 * mult; i++) {
        const a = (up ? -Math.PI / 2 : Math.PI / 2) + (Math.random() - 0.5) * 2.2;
        const spd = 130 + Math.random() * 280;
        this.pushP({
          type: 'confetti',
          kind,
          x,
          y,
          vx: Math.cos(a) * spd,
          vy: Math.sin(a) * spd,
          size: 2.2 + Math.random() * 1.8,
          color: SPECTRUM[i % 7],
          life: 0.9,
          gravity: 380,
          drag: 0.94,
          rot: Math.random() * 6,
          vRot: (Math.random() - 0.5) * 14,
        });
      }
    } else if (kind === 'water') {
      // Flat concentric ripples + heavy falling drips
      for (let k = 0; k < (big ? 2 : 1); k++) {
        this.pushP({
          type: 'ripple',
          kind,
          x,
          y: y + dir * k * 5,
          size: 6 + k * 6,
          grow: 170 + k * 40,
          alpha: 0.9,
          life: 0.5 + k * 0.08,
          drag: 1,
        });
      }
      for (let i = 0; i < 10 * mult; i++) {
        this.pushP({
          type: 'drop',
          kind,
          x: x + (Math.random() - 0.5) * 40,
          y,
          vx: (Math.random() - 0.5) * 120,
          vy: 60 + Math.random() * 160,
          size: 2.4 + Math.random() * 2.4,
          color: '#22d3ee',
          life: 1,
          gravity: 1300,
          drag: 0.99,
        });
      }
    } else if (kind === 'snow') {
      // Spinning ice shards + hexagonal frost rings
      for (let i = 0; i < 14 * mult; i++) {
        const a = (up ? -Math.PI / 2 : Math.PI / 2) + (Math.random() - 0.5) * 2.8;
        const spd = 220 + Math.random() * 420;
        this.pushP({
          type: 'shard',
          kind,
          x,
          y,
          vx: Math.cos(a) * spd,
          vy: Math.sin(a) * spd,
          size: 2.5 + Math.random() * 3.5,
          color: '#ffffff',
          life: 0.8,
          gravity: 700,
          drag: 0.95,
          rot: a + Math.PI / 2,
          vRot: (Math.random() - 0.5) * 14,
        });
      }
      for (let k = 0; k < (big ? 2 : 1); k++) {
        this.pushP({
          type: 'frostRing',
          kind,
          x,
          y: y + dir * k * 10,
          size: 10 + k * 10,
          grow: 150,
          rot: 0,
          vRot: 1.5,
          alpha: 1,
          life: 0.6,
          drag: 1,
        });
      }
    }
  }

  private muzzleLift(kind: WeaponKind): number {
    if (kind === 'banana') return -18;
    if (kind === 'bubble') return -4;
    if (kind === 'confetti') return 2;
    if (kind === 'crystal') return -4;
    if (kind === 'rifle') return 3;
    if (kind === 'pistol') return -6;
    return 0;
  }

  private isToy(kind?: WeaponKind): boolean {
    return kind === 'banana' || kind === 'beehive' || kind === 'bubble' || kind === 'confetti';
  }

  /** Live target geometry for the current variant (position + effective radius) */
  private targetGeometry() {
    const m = this.getArenaMetrics();
    const baseX = m.centerX;
    const baseY = m.targetBaseY - this.targetEntryDrop * 220 - this.targetKickY;
    let x = baseX;
    let y = baseY;
    let rs = 1;
    const v = this.targetVariant;
    if (v === 'pulse') rs = 1 + 0.2 * Math.sin(this.pulsePhase);
    if (v === 'drift') x = baseX + Math.sin(this.driftPhase) * Math.min(this.width * 0.14, 150 * m.unitScale);
    if (v === 'orbiter') {
      const R = Math.min(this.width * 0.15, 140 * m.unitScale);
      x = baseX + Math.cos(this.orbitPhase) * R;
      y = baseY + Math.sin(this.orbitPhase) * R * 0.3;
    }
    if (v === 'duo') rs *= 1.22;
    return { x, y, r: m.targetRadius * rs, baseX, baseY };
  }

  /** Mine collision → deflect & game over (same feel as spike clash) */
  private deflectBolt(bolt: FlyingBolt, x: number, y: number, why: string) {
    bolt.ricocheted = true;
    bolt.y = y + 8;
    bolt.vx = (Math.random() > 0.5 ? 1 : -1) * 300;
    bolt.vy = -260;
    bolt.vRot = bolt.vx > 0 ? 14 : -14;
    this.flyingBolts = [bolt];
    this.phase = 'gameover';
    this.hitstopTimer = 0.075;
    this.shakeIntensity = 18;
    this.redFailFlash = 0.85;
    soundEngine.playSpikeClash();
    this.spawnBurst(x, y, '#fbbf24', 28, 410);
    this.spawnFloatingText(x, y + 20, why, '#f87171', 1.35);
    if (this.score > this.bestScore) this.bestScore = this.score;
    this.savePersistence();
    this.emitHud();
  }

  /** Every weapon family fires its own signature shockwave line */
  private spawnShockwaves(kind: WeaponKind, mx: number, my: number, isOD: boolean) {
    if (kind === 'obliterator') return; // keeps its stacked plasma ellipses
    const count = isOD ? 2 : 1;
    for (let k = 0; k < count; k++) {
      this.pushP({
        type: 'shock',
        kind,
        x: mx,
        y: my - k * 5,
        size: 8 + k * 9,
        grow: 300 + k * 70,
        color: '#ffffff',
        alpha: 0.6,
        life: 0.18 + k * 0.04,
        drag: 1,
      });
    }
  }

  private trailLength(kind: WeaponKind, od: boolean): number {
    const s = this.getArenaMetrics().unitScale;
    const base =
      kind === 'rainbow' ? 280 : kind === 'water' ? 240 : kind === 'snow' ? 250 : kind === 'rifle' ? 260 : 190;
    return base * s * (od ? 1.4 : 1);
  }

  private spawnKindMuzzleFX(kind: WeaponKind, mx: number, my: number, isOD: boolean) {
    this.spawnElementBurst(kind, mx, my, true, isOD);
    const gs = this.getArenaMetrics().gunScale;
    const mult = isOD ? 2 : 1;
    if (kind === 'rainbow') {
      for (let i = 0; i < 18 * mult; i++) {
        const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.8;
        const spd = 150 + Math.random() * 450;
        this.pushP({
          type: 'star',
          x: mx,
          y: my,
          vx: Math.cos(a) * spd,
          vy: Math.sin(a) * spd,
          size: 5 + Math.random() * 7,
          color: this.kindColor(i),
          life: 0.55 + Math.random() * 0.3,
          gravity: 160,
          drag: 0.92,
          rot: Math.random() * 3,
          vRot: (Math.random() - 0.5) * 10,
        });
      }
      for (let i = 0; i < 7; i++) {
        this.pushP({
          type: 'ellipse',
          x: mx,
          y: my - i * 4,
          vy: -120 - i * 40,
          size: (10 + i * 4) * gs,
          grow: 230 + i * 20,
          color: SPECTRUM[i],
          alpha: 0.9,
          life: 0.42,
          drag: 0.96,
        });
      }
    } else if (kind === 'water') {
      for (let i = 0; i < 28 * mult; i++) {
        const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.4;
        const spd = 200 + Math.random() * 520;
        this.pushP({
          type: 'drop',
          x: mx + (Math.random() - 0.5) * 10,
          y: my,
          vx: Math.cos(a) * spd,
          vy: Math.sin(a) * spd,
          size: 1.8 + Math.random() * 2.6,
          color: Math.random() > 0.3 ? '#67e8f9' : '#e0f7ff',
          life: 0.8,
          gravity: 1150,
          drag: 0.985,
        });
      }
      for (let i = 0; i < 12; i++) {
        this.pushP({
          type: 'bubble',
          x: mx + (Math.random() - 0.5) * 50,
          y: my + Math.random() * 30,
          vx: (Math.random() - 0.5) * 70,
          vy: -50 - Math.random() * 130,
          size: 2 + Math.random() * 4,
          color: '#a5f3fc',
          life: 1.1,
          gravity: -40,
          drag: 0.97,
        });
      }
      for (let i = 0; i < 7; i++) {
        this.pushP({
          type: 'smoke',
          x: mx,
          y: my,
          vx: (Math.random() - 0.5) * 220,
          vy: -60 - Math.random() * 140,
          size: (8 + Math.random() * 10) * gs,
          color: '#cffafe',
          alpha: 0.35,
          life: 0.5,
          gravity: -20,
          drag: 0.92,
        });
      }
    } else if (kind === 'snow') {
      for (let i = 0; i < 10; i++) {
        this.pushP({
          type: 'smoke',
          x: mx,
          y: my,
          vx: (Math.random() - 0.5) * 280,
          vy: -90 - Math.random() * 220,
          size: (10 + Math.random() * 12) * gs,
          color: '#ffffff',
          alpha: 0.6,
          life: 0.65,
          gravity: -10,
          drag: 0.92,
        });
      }
      for (let i = 0; i < 24 * mult; i++) {
        const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.6;
        const spd = 120 + Math.random() * 420;
        this.pushP({
          type: 'flake',
          x: mx,
          y: my,
          vx: Math.cos(a) * spd,
          vy: Math.sin(a) * spd,
          size: 3 + Math.random() * 4.5,
          color: Math.random() > 0.4 ? '#ffffff' : '#bae6fd',
          life: 1.1,
          gravity: 150,
          drag: 0.95,
          rot: Math.random() * 3,
          vRot: (Math.random() - 0.5) * 6,
        });
      }
      for (let i = 0; i < 12; i++) {
        const a = -Math.PI / 2 + (Math.random() - 0.5) * 2;
        const spd = 500 + Math.random() * 500;
        this.pushP({
          type: 'streak',
          x: mx,
          y: my,
          vx: Math.cos(a) * spd,
          vy: Math.sin(a) * spd,
          size: 1.4 + Math.random() * 1.4,
          color: Math.random() > 0.5 ? '#ffffff' : '#bae6fd',
          life: 0.2,
          drag: 0.92,
        });
      }
    }
  }

  private spawnFirearmMuzzleFX(kind: WeaponKind, mx: number, my: number, isOD: boolean) {
    const m = this.getArenaMetrics();
    const gs = m.gunScale;
    const th = WEAPON_THEMES[this.selectedWeapon];
    const mult = isOD ? 2 : 1;
    // CRYSTAL GUN — luminous shard burst
    if (kind === 'crystal') {
      for (let i = 0; i < 14 * mult; i++) {
        const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.2;
        const spd = 120 + Math.random() * 330;
        this.pushP({
          type: 'star',
          x: mx,
          y: my,
          vx: Math.cos(a) * spd,
          vy: Math.sin(a) * spd,
          size: 4 + Math.random() * 4,
          color: i % 2 ? '#a5f3fc' : '#ffffff',
          life: 0.55,
          gravity: 260,
          drag: 0.95,
          rot: Math.random() * 3,
          vRot: 8,
        });
      }
      this.pushP({ type: 'glow', x: mx, y: my - 8, size: 42 * gs, color: '#67e8f9', alpha: 1, life: 0.16, drag: 1 });
      this.pushP({ type: 'ring', x: mx, y: my - 4, size: 10, color: '#a5f3fc', alpha: 0.85, life: 0.28, drag: 1 });
      return;
    }
    // TOY GUNS — playful non-powder effects
    if (this.isToy(kind)) {
      if (kind === 'banana') {
        for (let i = 0; i < 12 * mult; i++) {
          const a = -Math.PI / 2 + (Math.random() - 0.5) * 2;
          const spd = 140 + Math.random() * 300;
          this.pushP({
            type: 'confetti',
            x: mx,
            y: my,
            vx: Math.cos(a) * spd,
            vy: Math.sin(a) * spd,
            size: 2.6 + Math.random() * 2,
            color: ['#fde047', '#fef9c3', '#fbbf24'][i % 3],
            life: 1,
            gravity: 420,
            drag: 0.94,
            rot: Math.random() * 6,
            vRot: (Math.random() - 0.5) * 16,
          });
        }
        this.pushP({ type: 'glow', x: mx, y: my - 8, size: 40 * gs, color: th.plasmaMid, alpha: 1, life: 0.14, drag: 1 });
        for (let i = 0; i < 5; i++) {
          this.pushP({
            type: 'star',
            x: mx + (Math.random() - 0.5) * 40,
            y: my - Math.random() * 30,
            vx: (Math.random() - 0.5) * 120,
            vy: -80 - Math.random() * 120,
            size: 5 + Math.random() * 4,
            color: '#fde047',
            life: 0.5,
            gravity: 200,
            drag: 0.95,
            rot: Math.random() * 3,
            vRot: 6,
          });
        }
      } else if (kind === 'beehive') {
        for (let i = 0; i < 12 * mult; i++) {
          const a = Math.random() * Math.PI * 2;
          const spd = 120 + Math.random() * 260;
          this.pushP({
            type: 'spark',
            x: mx,
            y: my,
            vx: Math.cos(a) * spd,
            vy: Math.sin(a) * spd,
            size: 1.6 + Math.random() * 2,
            color: Math.random() > 0.4 ? '#fde68a' : '#ffffff',
            life: 0.4,
            gravity: 300,
            drag: 0.94,
          });
        }
        for (let i = 0; i < 3; i++) {
          this.pushP({
            type: 'ripple',
            x: mx,
            y: my,
            size: 8 + i * 6,
            grow: 220,
            alpha: 0.8,
            life: 0.35,
            drag: 1,
          });
        }
        this.pushP({ type: 'glow', x: mx, y: my - 6, size: 34 * gs, color: th.plasmaMid, alpha: 1, life: 0.14, drag: 1 });
      } else if (kind === 'bubble') {
        for (let i = 0; i < 9 * mult; i++) {
          this.pushP({
            type: 'bubble',
            x: mx + (Math.random() - 0.5) * 30,
            y: my + Math.random() * 10,
            vx: (Math.random() - 0.5) * 90,
            vy: -60 - Math.random() * 160,
            size: 2.5 + Math.random() * 4,
            color: '#f9a8d4',
            life: 1.2,
            gravity: -30,
            drag: 0.97,
          });
        }
        this.pushP({ type: 'glow', x: mx, y: my - 6, size: 36 * gs, color: th.plasmaMid, alpha: 1, life: 0.16, drag: 1 });
        this.pushP({ type: 'ripple', x: mx, y: my, size: 10, grow: 260, alpha: 0.8, life: 0.3, drag: 1 });
      } else if (kind === 'confetti') {
        for (let i = 0; i < 26 * mult; i++) {
          const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.4;
          const spd = 160 + Math.random() * 420;
          this.pushP({
            type: 'confetti',
            x: mx,
            y: my,
            vx: Math.cos(a) * spd,
            vy: Math.sin(a) * spd,
            size: 2.6 + Math.random() * 2.6,
            color: SPECTRUM[i % 7],
            life: 1.2,
            gravity: 380,
            drag: 0.93,
            rot: Math.random() * 6,
            vRot: (Math.random() - 0.5) * 18,
          });
        }
        this.pushP({ type: 'glow', x: mx, y: my - 8, size: 46 * gs, color: '#ffffff', alpha: 1, life: 0.14, drag: 1 });
      }
      return;
    }
    // Gunsmoke
    for (let i = 0; i < (kind === 'shotgun' ? 10 : 6) * mult; i++) {
      this.pushP({
        type: 'smoke',
        x: mx + (Math.random() - 0.5) * 10,
        y: my - Math.random() * 20,
        vx: (Math.random() - 0.5) * 130,
        vy: -60 - Math.random() * 140,
        size: (8 + Math.random() * 10) * gs,
        color: '#a8a29e',
        alpha: 0.32,
        life: 0.9,
        gravity: -40,
        drag: 0.94,
      });
    }
    // Hot sparks
    for (let i = 0; i < (kind === 'shotgun' ? 26 : 14) * mult; i++) {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * (kind === 'shotgun' ? 1.6 : 1.1);
      const spd = 400 + Math.random() * 700;
      this.pushP({
        type: 'streak',
        x: mx,
        y: my,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd,
        size: 1.4 + Math.random() * 1.6,
        color: Math.random() > 0.5 ? '#fde68a' : th.muzzleFlashHex,
        life: 0.22,
        drag: 0.92,
      });
    }
    if (kind === 'pistol' || kind === 'rifle') {
      // Brass casing flies out of the ejection port
      this.pushP({
        type: 'casing',
        x: m.centerX + 16 * gs,
        y: m.gunBaseY - 30 * gs,
        vx: 260 + Math.random() * 160,
        vy: -380 + Math.random() * 120,
        size: gs,
        color: '#d9a441',
        life: 1.3,
        gravity: 1400,
        drag: 0.99,
        rot: Math.random() * 3,
        vRot: 18 + Math.random() * 10,
      });
    } else if (kind === 'shotgun') {
      for (let k = 0; k < 2; k++) {
        this.pushP({
          type: 'casing',
          x: m.centerX + 12 * gs,
          y: m.gunBaseY + (2 + k * 8) * gs,
          vx: 200 + Math.random() * 160,
          vy: -320 + Math.random() * 120,
          size: gs * 1.2,
          color: '#dc2626',
          life: 1.3,
          gravity: 1400,
          drag: 0.99,
          rot: Math.random() * 3,
          vRot: 12 + Math.random() * 10,
        });
      }
    } else if (kind === 'revolver') {
      // Cylinder-gap hellfire jets
      const gy = m.gunBaseY - 35 * gs;
      for (let i = 0; i < 16; i++) {
        const dir = i % 2 === 0 ? -1 : 1;
        this.pushP({
          type: 'streak',
          x: m.centerX,
          y: gy,
          vx: dir * (300 + Math.random() * 400),
          vy: (Math.random() - 0.5) * 160,
          size: 1.6 + Math.random() * 1.6,
          color: Math.random() > 0.5 ? '#fb923c' : th.plasmaMid,
          life: 0.18,
          drag: 0.9,
        });
      }
    }
  }

  private spawnKindImpactFX(kind: WeaponKind, x: number, y: number, big: boolean) {
    const mult = big ? 2 : 1;
    if (isElemental(kind)) this.spawnElementBurst(kind, x, y, false, big);
    if (isFirearm(kind)) {
      const th = WEAPON_THEMES[this.selectedWeapon];
      // CRYSTAL GUN — crystalline chime burst
      if (kind === 'crystal') {
        this.pushP({ type: 'glow', x, y: y - 8, size: 48, color: '#67e8f9', alpha: 1, life: 0.2, drag: 1 });
        this.pushP({ type: 'ring', x, y: y - 8, size: 8, color: '#a5f3fc', alpha: 0.9, life: 0.3, drag: 1 });
        for (let i = 0; i < 16 * mult; i++) {
          const a = Math.PI / 2 + (Math.random() - 0.5) * 2.6;
          const spd = 130 + Math.random() * 300;
          this.pushP({
            type: 'star',
            x,
            y,
            vx: Math.cos(a) * spd,
            vy: Math.sin(a) * spd,
            size: 3.5 + Math.random() * 4,
            color: i % 2 ? '#a5f3fc' : '#ffffff',
            life: 0.6,
            gravity: 380,
            drag: 0.94,
            rot: Math.random() * 3,
            vRot: 9,
          });
        }
        return;
      }
      // TOY GUNS — playful impact bursts
      if (this.isToy(kind)) {
        if (kind === 'banana') {
          this.pushP({ type: 'glow', x, y: y - 8, size: 46, color: th.plasmaMid, alpha: 1, life: 0.2, drag: 1 });
          for (let i = 0; i < 14 * mult; i++) {
            const a = Math.PI / 2 + (Math.random() - 0.5) * 2.6;
            const spd = 140 + Math.random() * 320;
            this.pushP({
              type: 'confetti',
              x,
              y,
              vx: Math.cos(a) * spd,
              vy: Math.sin(a) * spd,
              size: 2.4 + Math.random() * 2.2,
              color: ['#fde047', '#fef9c3', '#fbbf24'][i % 3],
              life: 1,
              gravity: 420,
              drag: 0.94,
              rot: Math.random() * 6,
              vRot: (Math.random() - 0.5) * 16,
            });
          }
        } else if (kind === 'beehive') {
          this.pushP({ type: 'glow', x, y: y - 8, size: 42, color: th.plasmaMid, alpha: 1, life: 0.2, drag: 1 });
          for (let i = 0; i < 12 * mult; i++) {
            const a = Math.random() * Math.PI * 2;
            const spd = 120 + Math.random() * 280;
            this.pushP({
              type: 'star',
              x,
              y,
              vx: Math.cos(a) * spd,
              vy: Math.sin(a) * spd,
              size: 4 + Math.random() * 4,
              color: Math.random() > 0.3 ? '#fde68a' : '#ffffff',
              life: 0.55,
              gravity: 300,
              drag: 0.95,
              rot: Math.random() * 3,
              vRot: 8,
            });
          }
        } else if (kind === 'bubble') {
          this.pushP({ type: 'glow', x, y: y - 8, size: 40, color: th.plasmaMid, alpha: 1, life: 0.2, drag: 1 });
          for (let i = 0; i < 8 * mult; i++) {
            this.pushP({
              type: 'bubble',
              x: x + (Math.random() - 0.5) * 30,
              y,
              vx: (Math.random() - 0.5) * 80,
              vy: -40 - Math.random() * 120,
              size: 2.5 + Math.random() * 4,
              color: '#f9a8d4',
              life: 1.2,
              gravity: -30,
              drag: 0.97,
            });
          }
          for (let i = 0; i < 8; i++) {
            this.pushP({
              type: 'drop',
              x: x + (Math.random() - 0.5) * 20,
              y,
              vx: (Math.random() - 0.5) * 120,
              vy: 60 + Math.random() * 120,
              size: 1.6 + Math.random() * 1.6,
              color: '#7dd3fc',
              life: 0.7,
              gravity: 900,
              drag: 0.99,
            });
          }
        } else if (kind === 'confetti') {
          this.pushP({ type: 'glow', x, y: y - 8, size: 50, color: '#ffffff', alpha: 1, life: 0.2, drag: 1 });
          for (let i = 0; i < 30 * mult; i++) {
            const a = (i / 30 - 0.5) * Math.PI * 2;
            const spd = 150 + Math.random() * 420;
            this.pushP({
              type: 'confetti',
              x,
              y,
              vx: Math.cos(a) * spd,
              vy: Math.sin(a) * spd - 80,
              size: 2.6 + Math.random() * 2.6,
              color: SPECTRUM[i % 7],
              life: 1.3,
              gravity: 360,
              drag: 0.93,
              rot: Math.random() * 6,
              vRot: (Math.random() - 0.5) * 18,
            });
          }
        }
        return;
      }
      for (let i = 0; i < 20 * mult; i++) {
        const a = Math.PI / 2 + (Math.random() - 0.5) * 2.8;
        const spd = 200 + Math.random() * 520;
        this.pushP({
          type: 'spark',
          x,
          y,
          vx: Math.cos(a) * spd,
          vy: Math.sin(a) * spd,
          size: 1.4 + Math.random() * 2,
          color: Math.random() > 0.4 ? '#fde68a' : th.plasmaMid,
          life: 0.4,
          gravity: 800,
          drag: 0.93,
        });
      }
      for (let i = 0; i < 4; i++) {
        this.pushP({
          type: 'smoke',
          x,
          y,
          vx: (Math.random() - 0.5) * 140,
          vy: (Math.random() - 0.3) * 80,
          size: 8 + Math.random() * 8,
          color: '#a8a29e',
          alpha: 0.3,
          life: 0.6,
          drag: 0.92,
        });
      }
      return;
    }
    if (kind === 'rainbow') {
      for (let i = 0; i < 14 * mult; i++) {
        const a = Math.PI / 2 + (Math.random() - 0.5) * 3;
        const spd = 120 + Math.random() * 380;
        this.pushP({
          type: 'star',
          x,
          y,
          vx: Math.cos(a) * spd,
          vy: Math.sin(a) * spd,
          size: 4 + Math.random() * 6,
          color: this.kindColor(i * 3),
          life: 0.6,
          gravity: 300,
          drag: 0.93,
          rot: Math.random() * 3,
          vRot: (Math.random() - 0.5) * 12,
        });
      }
      for (let i = 0; i < 7; i++) {
        this.pushP({
          type: 'ring',
          x,
          y: y - 8,
          size: 6 + i * 3,
          color: SPECTRUM[i],
          alpha: 0.8,
          life: 0.3,
          drag: 1,
        });
      }
    } else if (kind === 'water') {
      for (let i = 0; i < 24 * mult; i++) {
        const a = Math.PI / 2 + (Math.random() - 0.5) * 2.9;
        const spd = 150 + Math.random() * 480;
        this.pushP({
          type: 'drop',
          x,
          y,
          vx: Math.cos(a) * spd,
          vy: Math.sin(a) * spd,
          size: 1.8 + Math.random() * 2.4,
          color: Math.random() > 0.3 ? '#67e8f9' : '#ffffff',
          life: 0.8,
          gravity: 1100,
          drag: 0.985,
        });
      }
      for (let i = 0; i < 8; i++) {
        this.pushP({
          type: 'bubble',
          x: x + (Math.random() - 0.5) * 40,
          y: y + Math.random() * 10,
          vx: (Math.random() - 0.5) * 60,
          vy: -30 - Math.random() * 80,
          size: 2 + Math.random() * 3.5,
          color: '#a5f3fc',
          life: 0.9,
          gravity: -30,
          drag: 0.97,
        });
      }
    } else if (kind === 'snow') {
      for (let i = 0; i < 16 * mult; i++) {
        const a = Math.PI / 2 + (Math.random() - 0.5) * 3;
        const spd = 100 + Math.random() * 360;
        this.pushP({
          type: 'flake',
          x,
          y,
          vx: Math.cos(a) * spd,
          vy: Math.sin(a) * spd,
          size: 3 + Math.random() * 4,
          color: '#ffffff',
          life: 1,
          gravity: 220,
          drag: 0.94,
          rot: Math.random() * 3,
          vRot: (Math.random() - 0.5) * 8,
        });
      }
      for (let i = 0; i < 6; i++) {
        this.pushP({
          type: 'smoke',
          x,
          y,
          vx: (Math.random() - 0.5) * 200,
          vy: (Math.random() - 0.2) * 120,
          size: 10 + Math.random() * 10,
          color: '#ffffff',
          alpha: 0.55,
          life: 0.55,
          drag: 0.92,
        });
      }
    }
  }

  private spawnKindTrail(theme: WeaponTheme, bolt: FlyingBolt) {
    const kind = theme.kind ?? 'obliterator';
    if (kind === 'rainbow' && Math.random() < 0.7) {
      this.pushP({
        type: 'star',
        x: bolt.x + (Math.random() - 0.5) * 24,
        y: bolt.y + 30 + Math.random() * 20,
        vx: (Math.random() - 0.5) * 50,
        vy: 30,
        size: 3 + Math.random() * 4,
        color: this.kindColor(Math.floor(Math.random() * 7)),
        life: 0.45,
        drag: 0.95,
        rot: Math.random() * 3,
        vRot: 6,
      });
    } else if (kind === 'water') {
      if (Math.random() < 0.8) {
        this.pushP({
          type: 'drop',
          x: bolt.x + (Math.random() - 0.5) * 10,
          y: bolt.y + 30,
          vx: (Math.random() - 0.5) * 140,
          vy: 40 + Math.random() * 60,
          size: 1.5 + Math.random() * 2,
          color: '#67e8f9',
          life: 0.5,
          gravity: 900,
          drag: 0.98,
        });
      }
      if (Math.random() < 0.35) {
        this.pushP({
          type: 'bubble',
          x: bolt.x + (Math.random() - 0.5) * 16,
          y: bolt.y + 40,
          vx: (Math.random() - 0.5) * 30,
          vy: -20,
          size: 1.5 + Math.random() * 2.5,
          color: '#a5f3fc',
          life: 0.6,
          drag: 0.97,
        });
      }
    } else if (kind === 'snow' && Math.random() < 0.7) {
      this.pushP({
        type: 'flake',
        x: bolt.x + (Math.random() - 0.5) * 20,
        y: bolt.y + 34 + Math.random() * 20,
        vx: (Math.random() - 0.5) * 60,
        vy: 30,
        size: 2.5 + Math.random() * 3,
        color: '#ffffff',
        life: 0.6,
        gravity: 60,
        drag: 0.95,
        rot: Math.random() * 3,
        vRot: 4,
      });
    }
  }

  private drawKindBeam(
    ctx: CanvasRenderingContext2D,
    theme: WeaponTheme,
    cx: number,
    topY: number,
    bottomY: number,
    beamW: number
  ) {
    const kind = theme.kind ?? 'obliterator';
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = this.activeBeamAlpha;
    const strands = kind === 'rainbow' ? 7 : 4;
    for (let k = 0; k < strands; k++) {
      ctx.strokeStyle = kind === 'rainbow' ? SPECTRUM[k] : k % 2 ? '#ffffff' : theme.plasmaMid;
      ctx.lineWidth = kind === 'rainbow' ? 3 : 2.4;
      ctx.beginPath();
      let first = true;
      for (let yy = bottomY; yy >= topY; yy -= 8) {
        const xx =
          cx +
          Math.sin(yy * 0.05 + this.elapsedTime * (kind === 'water' ? 18 : 10) + k * 0.9) *
            beamW *
            (kind === 'snow' ? 0.5 : 0.9);
        if (first) {
          ctx.moveTo(xx, yy);
          first = false;
        } else ctx.lineTo(xx, yy);
      }
      ctx.stroke();
    }
    ctx.restore();
    if (kind === 'snow') {
      for (let k = 0; k < 6; k++) {
        const yy = topY + ((this.elapsedTime * 400 + k * 90) % Math.max(1, bottomY - topY));
        drawSnowflake(ctx, cx + Math.sin(k * 2 + this.elapsedTime * 3) * beamW, yy, 8, this.elapsedTime * 3 + k, '#ffffff', this.activeBeamAlpha, 1.6);
      }
    } else if (kind === 'rainbow') {
      for (let k = 0; k < 6; k++) {
        const yy = topY + ((this.elapsedTime * 500 + k * 80) % Math.max(1, bottomY - topY));
        drawTwinkle(ctx, cx + Math.sin(k * 2 + this.elapsedTime * 4) * beamW, yy, 9, SPECTRUM[k], this.activeBeamAlpha);
      }
    }
  }

  // ===========================================================================
  // CORE SIMULATION STEP
  // ===========================================================================

  private update(dt: number) {
    this.elapsedTime += dt;

    // Smooth camera blend for Weapon Inspect Showcase
    const targetInspect = this.inspectMode ? 1 : 0;
    this.inspectBlend += (targetInspect - this.inspectBlend) * Math.min(1, dt * 8.5);

    // Hitstop freeze frame for heavy DOOM impact feel!
    if (this.hitstopTimer > 0) {
      this.hitstopTimer -= dt;
      this.shakeIntensity = Math.max(0, this.shakeIntensity - dt * 24);
      return;
    }

    // Banana Gun peel cycle: open fast → hold empty → close while flesh refills
    if (this.bananaPhase !== 'closed') {
      this.bananaPhaseT += dt;
      if (this.bananaPhase === 'opening') {
        const k = Math.min(1, this.bananaPhaseT / 0.24);
        this.bananaOpen = k * k * (3 - 2 * k);
        if (k >= 1) {
          this.bananaPhase = 'hold';
          this.bananaPhaseT = 0;
        }
      } else if (this.bananaPhase === 'hold') {
        this.bananaOpen = 1;
        if (this.bananaPhaseT > 0.32) {
          this.bananaPhase = 'closing';
          this.bananaPhaseT = 0;
        }
      } else if (this.bananaPhase === 'closing') {
        const k = Math.min(1, this.bananaPhaseT / 0.45);
        const e = k * k * (3 - 2 * k);
        this.bananaOpen = 1 - e;
        this.bananaFill = e;
        if (k >= 1) {
          this.bananaPhase = 'closed';
          this.bananaOpen = 0;
          this.bananaFill = 1;
        }
      }
    }

    // Gun mechanical spring recovery & heat dissipation
    this.fireCooldown = Math.max(0, this.fireCooldown - dt);
    this.gunRecoil = Math.max(0, this.gunRecoil - dt * 7.2);
    this.gunMuzzleFlash = Math.max(0, this.gunMuzzleFlash - dt * 13.5);
    this.gunHeat = Math.max(0, this.gunHeat - dt * 0.32);
    this.activeBeamAlpha = Math.max(0, this.activeBeamAlpha - dt * 3.4);

    // Screen FX decay
    this.shakeIntensity = Math.max(0, this.shakeIntensity - dt * 28);
    this.redFailFlash = Math.max(0, this.redFailFlash - dt * 2.4);
    this.screenFlash = Math.max(0, this.screenFlash - dt * 3.2);
    this.chargeGlow = Math.min(1, this.chargeGlow + dt * 2.4);

    // Elemental status on the wheel fades out (frost lingers longest)
    this.targetFx = Math.max(
      0,
      this.targetFx - dt * (this.targetFxKind === 'snow' ? 0.45 : this.targetFxKind === 'water' ? 0.7 : 0.9)
    );
    if (this.phase !== 'playing') this.targetFx = 0;
    // Wet wheel drips water from its underside
    if (this.targetFxKind === 'water' && this.targetFx > 0.05) {
      this.dripTimer -= dt;
      if (this.dripTimer <= 0) {
        this.dripTimer = 0.05;
        const tgD = this.targetGeometry();
        const a = Math.PI / 2 + (Math.random() - 0.5) * 2.2;
        this.pushP({
          type: 'drop',
          x: tgD.x + Math.cos(a) * tgD.r,
          y: tgD.y + Math.sin(a) * tgD.r,
          vx: (Math.random() - 0.5) * 20,
          vy: 20,
          size: 2 + Math.random() * 2,
          color: '#67e8f9',
          life: 1,
          gravity: 900,
          drag: 0.99,
        });
      }
    }
    // Frozen wheel sheds snow dust
    if (this.targetFxKind === 'snow' && this.targetFx > 0.1 && Math.random() < 0.5) {
      const tgS = this.targetGeometry();
      const a = Math.random() * Math.PI * 2;
      this.pushP({
        type: 'flake',
        x: tgS.x + Math.cos(a) * (tgS.r + 6),
        y: tgS.y + Math.sin(a) * (tgS.r + 6),
        vx: Math.cos(a) * 30,
        vy: 30 + Math.random() * 30,
        size: 2 + Math.random() * 2.5,
        color: '#ffffff',
        life: 1.2,
        gravity: 40,
        drag: 0.97,
        rot: Math.random() * 3,
        vRot: 2,
      });
    }

    // Energy particles being sucked INTO the muzzle as the reactor recharges
    this.intakeTimer -= dt;
    if (this.intakeTimer <= 0 && this.phase !== 'gameover') {
      this.intakeTimer = this.overdrivePrimed ? 0.01 : 0.03;
      const m = this.getArenaMetrics();
      const th = WEAPON_THEMES[this.selectedWeapon];
      const ang = Math.random() * Math.PI * 2;
      const dist = (55 + Math.random() * 55) * m.gunScale * (this.overdrivePrimed ? 1.4 : 1);
      const life = 0.4;
      const tx = m.centerX;
      const ty = m.gunMuzzleY + this.gunRecoil * 18 * m.gunScale;
      const sx = tx + Math.cos(ang) * dist;
      const sy = ty + Math.sin(ang) * dist * 0.55 - 10;
      this.particles.push({
        x: sx,
        y: sy,
        vx: (tx - sx) / life,
        vy: (ty - sy) / life,
        size: 1.2 + Math.random() * 1.6,
        color: th.kind === 'rainbow' ? this.kindColor(Math.floor(Math.random() * 7)) : Math.random() > 0.3 ? th.plasmaMid : '#ffffff',
        alpha: 0.9,
        life,
        maxLife: life,
        gravity: 0,
        drag: 1,
        type: 'streak',
      });
    }

    // Target spring recovery
    this.targetEntryDrop = Math.max(0, this.targetEntryDrop - dt * 4.8);
    this.targetKickY = Math.max(0, this.targetKickY - dt * 95);
    this.targetScalePop += (1 - this.targetScalePop) * Math.min(1, dt * 14);
    this.targetHitFlash = Math.max(0, this.targetHitFlash - dt * 6.5);

    this.timeSinceLastHit += dt;
    if (this.timeSinceLastHit > 1.35 && this.combo > 0) {
      this.combo = 0;
      this.emitHud();
    }

    // Rotate the circular target core (variant-specific motion included)
    if (this.phase === 'playing' || this.phase === 'title') {
      this.waveTime += dt;
      this.pulsePhase += dt * 2.3;
      this.driftPhase += dt * (1.35 + this.stage * 0.03);
      this.orbitPhase += dt * (1.6 + this.stage * 0.04);
      for (const mn of this.mines) mn.a += mn.s * dt;
      this.whirlFlash = Math.max(0, this.whirlFlash - dt * 2.2);

      let angVel: number;
      if (this.phase === 'title') {
        angVel = 1.15;
      } else if (this.targetVariant === 'whirl') {
        // WHIRLPOOL: sudden direction reversals with a white flash
        this.whirlTimer += dt;
        if (this.whirlTimer > 1.55) {
          this.whirlTimer = 0;
          this.whirlDir *= -1;
          this.whirlFlash = 1;
        }
        angVel = this.whirlDir * (2.1 + this.stage * 0.05);
      } else if (this.targetVariant === 'duo') {
        angVel = computeTargetAngularVelocity(this.stage, this.waveTime) * 1.2;
      } else if (this.targetVariant === 'pulse') {
        angVel = computeTargetAngularVelocity(this.stage, this.waveTime) * 0.9;
      } else {
        angVel = computeTargetAngularVelocity(this.stage, this.waveTime);
      }
      if (this.stage === 1) angVel = 1.65; // intro stays gentle
      this.targetRotation = normalizeAngle(this.targetRotation + angVel * dt);
    } else if (this.phase === 'gameover') {
      // Slow ominous drift after game over
      this.targetRotation = normalizeAngle(this.targetRotation + 0.22 * dt);
    }

    // Animate embedded spikes settle & flash; crystal shards keep GROWING
    for (const s of this.embeddedSpikes) {
      s.embedAnim = Math.max(0, s.embedAnim - dt * 8);
      s.flash = Math.max(0, s.flash - dt * 5);
      s.age = (s.age ?? 0) + dt;
    }

    // Shattering transition between cleared stage and next stage spawn
    if (this.phase === 'shattering') {
      this.shatterTransitionTimer -= dt;
      if (this.shatterTransitionTimer <= 0) {
        this.phase = 'playing';
        this.setupStage(this.stage + 1, false);
      }
    }

    // Update Flying Obliterator Bolts & Check Circular Target / Spike Collision!
    const tg = this.targetGeometry();
    const currentTargetY = tg.y;

    for (let i = this.flyingBolts.length - 1; i >= 0; i--) {
      const bolt = this.flyingBolts[i];

      if (bolt.ricocheted) {
        bolt.x += bolt.vx * dt;
        bolt.y += bolt.vy * dt;
        bolt.vy += 1550 * dt; // Gravity tumbling downward
        bolt.rot += bolt.vRot * dt;
        bolt.alpha = Math.max(0, bolt.alpha - dt * 1.4);
        if (bolt.alpha <= 0 || bolt.y > this.height + 120) {
          this.flyingBolts.splice(i, 1);
        }
        continue;
      }

      // Straight upward flight!
      const prevY = bolt.y;
      bolt.y += bolt.vy * dt;

      // Double-helix plasma trail spiralling around the bolt path
      const bTheme = WEAPON_THEMES[bolt.weaponId];
      const steps = (bTheme.kind ?? 'obliterator') === 'obliterator' ? 4 : 0;
      for (let s = 0; s < steps; s++) {
        const t = s / steps;
        const py = prevY + (bolt.y - prevY) * t + 26;
        const phase = py * 0.06 + this.elapsedTime * 10;
        for (const strand of [0, Math.PI]) {
          const amp = bolt.isOverdrive ? 18 : 10;
          this.particles.push({
            x: bolt.x + Math.sin(phase + strand) * amp,
            y: py,
            vx: Math.cos(phase + strand) * 40,
            vy: 40,
            size: bolt.isOverdrive ? 4 : 2.4,
            color:
              bTheme.kind === 'rainbow'
                ? `hsl(${(py * 1.5 + this.elapsedTime * 300 + strand * 57) % 360}, 100%, 62%)`
                : strand === 0
                  ? bTheme.plasmaMid
                  : '#ffffff',
            alpha: 0.85,
            life: bolt.isOverdrive ? 0.42 : 0.28,
            maxLife: bolt.isOverdrive ? 0.42 : 0.28,
            gravity: 0,
            drag: 0.9,
            type: 'glow',
          });
        }
      }

      this.spawnKindTrail(bTheme, bolt);

      // Fly out of the arena (missed a moving wheel)
      if (bolt.y < -140) {
        this.flyingBolts.splice(i, 1);
        continue;
      }

      // Did the bolt's piercing tip hit the bottom edge of the rotating circular core?
      const impactY = currentTargetY + tg.r + 14;
      if (bolt.y <= impactY && this.phase === 'playing') {
        const dx = bolt.x - tg.x;
        if (Math.abs(dx) <= tg.r * 0.94) {
          // Leave the signature trail lingering & fading after impact
          const tk = bTheme.kind ?? 'obliterator';
          if (tk !== 'obliterator') {
            const maxLen = this.trailLength(tk, bolt.isOverdrive);
            const len = Math.min(maxLen, (bolt.startY ?? this.height) - impactY);
            this.pushP({
              type: 'trail',
              kind: tk,
              x: bolt.x,
              y: impactY + 30,
              y2: impactY + 30 + len,
              color: tk === 'shotgun' ? '#fb923c' : bTheme.plasmaMid,
              alpha: 1,
              life: tk === 'snow' ? 0.55 : tk === 'water' ? 0.4 : 0.32,
              drag: 1,
            });
          }
          // MINE CHECK — a mine at the impact point deflects the bolt!
          let mineHit: { mx: number; my: number } | null = null;
          for (const mn of this.mines) {
            const mx = tg.x + Math.cos(mn.a) * tg.r * 1.24;
            const my = tg.y + Math.sin(mn.a) * tg.r * 1.24;
            if (Math.hypot(mx - bolt.x, my - impactY) < 19) {
              mineHit = { mx, my };
              break;
            }
          }
          if (mineHit) {
            this.deflectBolt(bolt, mineHit.mx, mineHit.my, 'MINE STRIKE!');
            this.flyingBolts.splice(i, 1);
            continue;
          }
          const offset = Math.asin(Math.max(-1, Math.min(1, dx / tg.r)));
          const hitLocalAngle = normalizeAngle(-this.targetRotation + offset);
          this.resolveBoltImpact(bolt, hitLocalAngle, bolt.x, impactY, tg.r);
          if (!bolt.ricocheted) {
            this.flyingBolts.splice(i, 1);
          }
        } else if (!bolt.missed) {
          // Whiffed past a moving wheel — wasted bolt!
          bolt.missed = true;
          this.spawnFloatingText(bolt.x, this.height * 0.2, 'MISS!', '#a1a1aa', 1.0);
        }
      }
    }

    // Update Shatter Shards
    for (let i = this.shatterShards.length - 1; i >= 0; i--) {
      const sh = this.shatterShards[i];
      sh.x += sh.vx * dt;
      sh.y += sh.vy * dt;
      sh.vy += 680 * dt;
      sh.rot += sh.vRot * dt;
      sh.life -= dt;
      if (sh.life <= 0) {
        this.shatterShards.splice(i, 1);
      }
    }

    // Update Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.vx *= Math.pow(p.drag, dt * 60);
      p.vy *= Math.pow(p.drag, dt * 60);
      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.type === 'ring') {
        p.size += 360 * dt;
      } else if (
        p.type === 'ellipse' ||
        p.type === 'ripple' ||
        p.type === 'frostRing' ||
        p.type === 'rainbowArc' ||
        p.type === 'shock'
      ) {
        p.size += (p.grow ?? 240) * dt;
        p.rot = (p.rot ?? 0) + (p.vRot ?? 0) * dt;
      } else if (
        p.type === 'shell' ||
        p.type === 'flake' ||
        p.type === 'star' ||
        p.type === 'casing' ||
        p.type === 'shard' ||
        p.type === 'confetti'
      ) {
        p.rot = (p.rot ?? 0) + (p.vRot ?? 0) * dt;
        // Bounce off the floor once
        if ((p.type === 'shell' || p.type === 'casing') && p.y > this.height - 10 && p.vy > 0) {
          p.vy *= -0.35;
          p.vx *= 0.6;
          p.y = this.height - 10;
        }
      }
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }

    // Update Rising Foundry Embers
    for (const e of this.ambientEmbers) {
      e.x += e.vx * dt + Math.sin(this.elapsedTime * 2 + e.y * 0.02) * 14 * dt;
      e.y += e.vy * dt;
      if (e.y < -12) {
        e.y = this.height + 12;
        e.x = Math.random() * this.width;
      }
    }

    // Update Floating Score Popups
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.y += ft.vy * dt;
      ft.vy *= 0.93;
      ft.life -= dt;
      if (ft.life <= 0) {
        this.floatingTexts.splice(i, 1);
      }
    }
  }

  /**
   * Resolves precision Knife-Hit collision at the bottom edge of the rotating target disc
   */
  private resolveBoltImpact(
    bolt: FlyingBolt,
    hitLocalAngle: number,
    impactX: number,
    impactY: number,
    targetRadius: number
  ) {
    const theme = WEAPON_THEMES[bolt.weaponId];

    // 1. Check Collectible Argent Energy Cells along perimeter first!
    for (const cell of this.argentCells) {
      if (!cell.collected && angularDistance(cell.localAngle, hitLocalAngle) < 0.25) {
        cell.collected = true;
        this.argentGems += 1;
        this.score += 5;
        if (!bolt.isOverdrive) {
          this.overdriveCharge = Math.min(100, this.overdriveCharge + 38);
          if (this.overdriveCharge >= 100) {
            this.overdrivePrimed = true;
          }
        }
        soundEngine.playArgentGem();
        this.spawnBurst(impactX, impactY + 8, '#f43f5e', 18, 320);
        this.spawnFloatingText(impactX + 38, impactY + 12, 'ARGENT +5', '#fda4af', 1.15);
      }
    }

    // 2. Check Collision against all existing Embedded Spikes on the rotating circle!
    // Forgiving & crisp collision threshold (~7.8 degrees)
    const CLASH_THRESHOLD = 0.136;
    let closestDiff = Infinity;
    const clashingSpikes: EmbeddedSpike[] = [];

    for (const existing of this.embeddedSpikes) {
      const diff = angularDistance(existing.localAngle, hitLocalAngle);
      if (diff < closestDiff) closestDiff = diff;
      if (diff < CLASH_THRESHOLD) {
        clashingSpikes.push(existing);
      }
    }

    // IF BFG OVERDRIVE SHOT: Vaporize clashing spikes right off the wheel instead of losing!
    if (clashingSpikes.length > 0 && bolt.isOverdrive) {
      for (const doomed of clashingSpikes) {
        const idx = this.embeddedSpikes.indexOf(doomed);
        if (idx !== -1) this.embeddedSpikes.splice(idx, 1);
      }
      this.score += clashingSpikes.length * 4;
      this.spawnBurst(impactX, impactY, '#ffffff', 26, 420);
      this.spawnFloatingText(impactX, impactY + 24, 'VAPORIZED! +4', '#86efac', 1.25);
    } else if (clashingSpikes.length > 0) {
      // === METALLIC CLASH! RICOCHET & GAME OVER! ===
      clashingSpikes[0].flash = 1.0;
      bolt.ricocheted = true;
      bolt.y = impactY + 8;
      bolt.vx = (Math.random() > 0.5 ? 1 : -1) * (240 + Math.random() * 180);
      bolt.vy = -260;
      bolt.vRot = bolt.vx > 0 ? 14 : -14;

      // Cancel any other in-flight bolts cleanly
      this.flyingBolts = [bolt];

      this.phase = 'gameover';
      this.hitstopTimer = 0.075;
      this.shakeIntensity = 18;
      this.redFailFlash = 0.85;

      soundEngine.playSpikeClash();
      this.spawnBurst(impactX, impactY + 6, '#fbbf24', 28, 410);
      this.spawnFloatingText(impactX, impactY + 20, 'DEFLECTED!', '#f87171', 1.35);

      if (this.score > this.bestScore) {
        this.bestScore = this.score;
      }
      this.savePersistence();
      this.emitHud();
      return;
    }

    // === CLEAN EMBED HIT INTO THE ROTATING CIRCLE! ===
    this.embeddedSpikes.push({
      id: bolt.id,
      localAngle: hitLocalAngle,
      weaponId: bolt.weaponId,
      isPreSpawned: false,
      embedAnim: 1.0,
      flash: 1.0,
      age: 0,
    });

    this.hitsLanded += 1;
    const isNearMiss = closestDiff < 0.245;
    if (this.timeSinceLastHit <= 0.65) {
      this.combo += 1;
    } else {
      this.combo = 1;
    }
    this.timeSinceLastHit = 0;

    let pointsEarned = 1 + (this.combo >= 3 ? 1 : 0) + (isNearMiss ? 2 : 0);
    if (bolt.isOverdrive) pointsEarned += 3;
    this.score += pointsEarned;

    if (this.score > this.bestScore) {
      this.bestScore = this.score;
    }

    // Charge BFG Overdrive on fast streaks & razor hits!
    if (!bolt.isOverdrive) {
      const gain = 10 + (isNearMiss ? 14 : 0) + Math.min(10, this.combo * 2);
      this.overdriveCharge = Math.min(100, this.overdriveCharge + gain);
      if (this.overdriveCharge >= 100 && !this.overdrivePrimed) {
        this.overdrivePrimed = true;
        this.spawnFloatingText(
          impactX,
          this.getArenaMetrics().gunBaseY - 128,
          'OVERDRIVE CHARGED!',
          theme.plasmaMid,
          1.15
        );
      }
    }

    // Tactile punch on the wheel!
    this.targetKickY = bolt.isOverdrive ? 20 : 11;
    this.targetScalePop = bolt.isOverdrive ? 1.12 : 1.055;
    this.targetHitFlash = 1.0;
    this.shakeIntensity = Math.max(this.shakeIntensity, bolt.isOverdrive ? 12 : 5.5);

    soundEngine.playEmbedHit(this.combo, isNearMiss, theme.kind);
    this.spawnImpactFX(
      impactX,
      impactY,
      impactY - 14 - targetRadius,
      targetRadius,
      theme.plasmaMid,
      bolt.isOverdrive
    );
    this.spawnBurst(impactX, impactY, theme.plasmaMid, bolt.isOverdrive ? 24 : 13, 280);

    // Expanding plasma impact ring
    this.particles.push({
      x: impactX,
      y: impactY,
      vx: 0,
      vy: 0,
      size: 12,
      color: theme.plasmaMid,
      alpha: 0.75,
      life: 0.22,
      maxLife: 0.22,
      gravity: 0,
      drag: 1,
      type: 'ring',
    });

    if (isNearMiss) {
      this.spawnFloatingText(impactX - 42, impactY + 18, `RAZOR! +${pointsEarned}`, '#fde047', 1.15);
    } else if (this.combo >= 3) {
      this.spawnFloatingText(
        impactX,
        impactY + 22,
        `COMBO x${this.combo}! +${pointsEarned}`,
        theme.plasmaMid,
        1.1
      );
    }

    // CHECK STAGE COMPLETION: Did the final bolt land cleanly?!
    if (this.hitsLanded >= this.ammoTotal) {
      const tgNow = this.targetGeometry();
      this.obliterateCurrentCore(tgNow.x, tgNow.y, tgNow.r);
    } else {
      this.emitHud();
    }
  }

  /**
   * Explodes the circular target into 14 blazing DOOM armor fragments & advances to next wave!
   */
  private obliterateCurrentCore(cx: number, cy: number, radius: number) {
    this.phase = 'shattering';
    this.shatterTransitionTimer = 0.88;
    this.hitstopTimer = 0.06; // Punchy freeze-frame right on obliteration!
    this.shakeIntensity = this.coreTheme.isBoss ? 24 : 16;

    const waveBonus = this.coreTheme.isBoss ? 15 : 5;
    this.score += waveBonus;
    if (this.coreTheme.isBoss) {
      this.argentGems += 3;
    }
    if (this.score > this.bestScore) {
      this.bestScore = this.score;
    }
    this.savePersistence();

    soundEngine.playCoreShatter(this.coreTheme.isBoss);

    // Slice circular disc into 14 radial pie shards blasting outward!
    const shardCount = 14;
    for (let s = 0; s < shardCount; s++) {
      const startA = (s / shardCount) * Math.PI * 2 + this.targetRotation;
      const sweep = (Math.PI * 2) / shardCount - 0.04;
      const midA = startA + sweep * 0.5;
      const speed = 260 + Math.random() * 380;

      this.shatterShards.push({
        x: cx + Math.cos(midA) * (radius * 0.28),
        y: cy + Math.sin(midA) * (radius * 0.28),
        vx: Math.cos(midA) * speed,
        vy: Math.sin(midA) * speed - 120,
        rot: 0,
        vRot: (Math.random() - 0.5) * 11,
        radius,
        startAngle: startA,
        sweepAngle: sweep,
        colorMain: this.coreTheme.baseColor,
        colorRim: this.coreTheme.rimColor,
        glowColor: this.coreTheme.glowHex,
        life: 0.95,
        maxLife: 0.95,
      });
    }

    // Blast all embedded spikes outward like shrapnel too!
    for (const sp of this.embeddedSpikes) {
      const worldAngle = sp.localAngle + this.targetRotation + Math.PI * 0.5;
      const sx = cx + Math.cos(worldAngle) * radius;
      const sy = cy + Math.sin(worldAngle) * radius;
      this.flyingBolts.push({
        id: this.idCounter++,
        x: sx,
        y: sy,
        vx: Math.cos(worldAngle) * (340 + Math.random() * 240),
        vy: Math.sin(worldAngle) * 320 - 180,
        weaponId: sp.weaponId,
        isOverdrive: false,
        ricocheted: true,
        rot: sp.localAngle + this.targetRotation,
        vRot: (Math.random() - 0.5) * 14,
        alpha: 1,
      });
    }
    this.embeddedSpikes = [];
    this.argentCells = [];

    // Shockwave rings + molten spark fountain
    this.spawnBurst(cx, cy, this.coreTheme.glowHex, 42, 540);
    // Radial lightning storm on obliteration
    for (let k = 0; k < 14; k++) {
      const a = (k / 14) * Math.PI * 2 + Math.random() * 0.3;
      const len = radius * (1.4 + Math.random() * 1.2);
      this.particles.push({
        x: cx,
        y: cy,
        x2: cx + Math.cos(a) * len,
        y2: cy + Math.sin(a) * len,
        seed: Math.random() * 1000,
        vx: 0,
        vy: 0,
        size: 2.2,
        color: this.coreTheme.glowHex,
        alpha: 1,
        life: 0.3,
        maxLife: 0.3,
        gravity: 0,
        drag: 1,
        type: 'lightning',
      });
    }
    this.particles.push({
      x: cx,
      y: cy,
      vx: 0,
      vy: 0,
      size: radius * 2.4,
      color: this.coreTheme.glowHex,
      alpha: 1,
      life: 0.3,
      maxLife: 0.3,
      gravity: 0,
      drag: 1,
      type: 'glow',
    });
    this.particles.push({
      x: cx,
      y: cy,
      vx: 0,
      vy: 0,
      size: radius,
      grow: 900,
      color: this.coreTheme.glowHex,
      alpha: 1,
      life: 0.45,
      maxLife: 0.45,
      gravity: 0,
      drag: 1,
      type: 'ellipse',
    });
    this.screenFlash = Math.max(this.screenFlash, 0.6);
    this.screenFlashColor = this.coreTheme.glowHex;
    this.particles.push({
      x: cx,
      y: cy,
      vx: 0,
      vy: 0,
      size: 24,
      color: '#ffffff',
      alpha: 0.95,
      life: 0.42,
      maxLife: 0.42,
      gravity: 0,
      drag: 1,
      type: 'ring',
    });

    this.spawnFloatingText(
      cx,
      cy,
      this.coreTheme.isBoss ? `BOSS OBLITERATED! +${waveBonus}` : `OBLITERATED! +${waveBonus}`,
      '#ffffff',
      1.35
    );

    this.emitHud();
  }

  private spawnBurst(x: number, y: number, color: string, count: number, maxSpeed: number) {
    for (let i = 0; i < count; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = 60 + Math.random() * maxSpeed;
      this.particles.push({
        x,
        y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        size: 2 + Math.random() * 3.8,
        color: i % 4 === 0 ? '#ffffff' : color,
        alpha: 1,
        life: 0.28 + Math.random() * 0.32,
        maxLife: 0.6,
        gravity: 420,
        drag: 0.93,
        type: 'spark',
      });
    }
  }

  private spawnFloatingText(
    x: number,
    y: number,
    text: string,
    color: string,
    scale = 1
  ) {
    this.floatingTexts.push({
      id: this.idCounter++,
      x,
      y,
      vy: -95,
      text,
      color,
      scale,
      life: 0.78,
      maxLife: 0.78,
    });
  }

  // ===========================================================================
  // FULL-VIEWPORT 2D RENDER PIPELINE
  // ===========================================================================

  private render() {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;
    const theme = WEAPON_THEMES[this.selectedWeapon];

    ctx.save();
    ctx.scale(this.dpr, this.dpr);

    // 1. DEEP VOLCANIC DOOM FOUNDRY BACKGROUND
    const bgGrad = ctx.createRadialGradient(w * 0.5, h * 0.42, 40, w * 0.5, h * 0.5, Math.max(w, h) * 0.85);
    bgGrad.addColorStop(0, '#161821');
    bgGrad.addColorStop(0.55, '#0c0d12');
    bgGrad.addColorStop(1, '#06070a');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Subtle UAC Industrial Perspective Grid & Vertical Firing Lane Guide
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.028)';
    ctx.lineWidth = 1;
    const gridStep = 56;
    for (let gx = (w * 0.5) % gridStep; gx < w; gx += gridStep) {
      ctx.beginPath();
      ctx.moveTo(gx, 0);
      ctx.lineTo(gx, h);
      ctx.stroke();
    }
    for (let gy = 0; gy < h; gy += gridStep) {
      ctx.beginPath();
      ctx.moveTo(0, gy);
      ctx.lineTo(w, gy);
      ctx.stroke();
    }

    // Subtle highlighted central vertical firing corridor strip
    const laneGrad = ctx.createLinearGradient(w * 0.5 - 54, 0, w * 0.5 + 54, 0);
    laneGrad.addColorStop(0, 'rgba(0,0,0,0)');
    laneGrad.addColorStop(0.5, `${theme.plasmaGlowRgba}0.045)`);
    laneGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = laneGrad;
    ctx.fillRect(w * 0.5 - 54, 0, 108, h);
    ctx.restore();

    // 2. RISING AMBIENT FOUNDRY EMBERS
    for (const e of this.ambientEmbers) {
      ctx.globalAlpha = e.alpha;
      ctx.fillStyle = e.color;
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // 3. CAMERA SHAKE + SMOOTH WEAPON INSPECT ZOOM TRANSFORM
    const shakeX = (Math.random() - 0.5) * this.shakeIntensity * 2;
    const shakeY = (Math.random() - 0.5) * this.shakeIntensity * 2;

    const { centerX, gunScale, gunBaseY, gunMuzzleY } = this.getArenaMetrics();

    // Interpolate camera smoothly toward the Obliterator Gun if Inspect Mode is active!
    const zoom = 1 + this.inspectBlend * 1.15; // 1.0x -> 2.15x closeup!
    const focusY = h * 0.5 + this.inspectBlend * (gunBaseY - 18 - h * 0.5);

    ctx.save();
    ctx.translate(w * 0.5 + shakeX, h * 0.5 + shakeY);
    ctx.scale(zoom, zoom);
    ctx.translate(-w * 0.5, -focusY);

    const tgBeam = this.targetGeometry();

    // 4. BFG OVERDRIVE MASSIVE PLASMA COLUMN BEAM (WHEN FIRED!)
    if (this.activeBeamAlpha > 0.01) {
      ctx.save();
      ctx.globalAlpha = this.activeBeamAlpha;
      const beamW = 46 * this.activeBeamAlpha;
      const beamGrad = ctx.createLinearGradient(centerX - beamW, 0, centerX + beamW, 0);
      beamGrad.addColorStop(0, 'rgba(0,0,0,0)');
      beamGrad.addColorStop(0.25, theme.plasmaMid);
      beamGrad.addColorStop(0.5, '#ffffff');
      beamGrad.addColorStop(0.75, theme.plasmaMid);
      beamGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = beamGrad;
      ctx.fillRect(centerX - beamW, tgBeam.y, beamW * 2, gunMuzzleY - tgBeam.y);
      // Outer haze
      const haze = ctx.createLinearGradient(centerX - beamW * 3, 0, centerX + beamW * 3, 0);
      haze.addColorStop(0, 'rgba(0,0,0,0)');
      haze.addColorStop(0.5, `${theme.plasmaGlowRgba}0.35)`);
      haze.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = haze;
      ctx.fillRect(centerX - beamW * 3, tgBeam.y, beamW * 6, gunMuzzleY - tgBeam.y);
      ctx.restore();
      // Lightning coiling around the beam
      const fl = Math.floor(this.elapsedTime * 30);
      const special = !!theme.kind && theme.kind !== 'obliterator';
      if (special) {
        this.drawKindBeam(ctx, theme, centerX, tgBeam.y + tgBeam.r, gunMuzzleY, beamW);
      }
      for (let k = 0; k < (special ? 0 : 4); k++) {
        const side = k % 2 === 0 ? -1 : 1;
        strokeLightning(
          ctx,
          centerX + side * beamW * 0.6,
          gunMuzzleY,
          centerX - side * beamW * 0.6,
          tgBeam.y + tgBeam.r,
          theme.plasmaMid,
          1.6,
          14,
          beamW * 1.2,
          fl * 5 + k * 31,
          this.activeBeamAlpha
        );
      }
    }

    // 5. VERTICAL LASER SIGHT FROM OBLITERATOR MUZZLE STRAIGHT UP TO ROTATING CIRCLE
    if (this.phase !== 'shattering') {
      const tgLaser = this.targetGeometry();
      drawVerticalLaserSight(
        ctx,
        centerX,
        gunMuzzleY + this.gunRecoil * 18 * gunScale,
        tgLaser.y + tgLaser.r,
        theme,
        this.elapsedTime,
        this.overdrivePrimed
      );
    }

    // 6. FLYING OBLITERATOR BOLTS
    for (const bolt of this.flyingBolts) {
      const boltTheme = WEAPON_THEMES[bolt.weaponId];
      const bKind: WeaponKind = boltTheme.kind ?? 'obliterator';
      if (!bolt.ricocheted && bKind !== 'obliterator') {
        // Signature trail per weapon family
        const len = Math.min(this.trailLength(bKind, bolt.isOverdrive), (bolt.startY ?? h) - bolt.y);
        drawKindTrail(
          ctx,
          bKind,
          bolt.x,
          bolt.y + 30,
          len,
          bolt.alpha,
          this.elapsedTime,
          bolt.isOverdrive,
          bKind === 'shotgun' ? '#fb923c' : boltTheme.plasmaMid
        );
      }
      if (!bolt.ricocheted) {
        // Motion-blur afterimages (Obliterator only)
        for (let g = bKind === 'obliterator' ? 4 : 0; g >= 1; g--) {
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = 0.22 * (1 - g / 5);
          ctx.translate(bolt.x, bolt.y + g * 26);
          drawObliteratorSpike(ctx, boltTheme, {
            scale: (bolt.isOverdrive ? 1.28 : 1.02) * (1 - g * 0.04),
            isOverdrive: bolt.isOverdrive,
            time: this.elapsedTime,
          });
          ctx.restore();
        }
        // BFG OVERDRIVE ORB with lightning tendrils
        if (bolt.isOverdrive) {
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          const orbR = 44 + Math.sin(this.elapsedTime * 40) * 5;
          const og = ctx.createRadialGradient(bolt.x, bolt.y - 10, 0, bolt.x, bolt.y - 10, orbR);
          og.addColorStop(0, '#ffffff');
          og.addColorStop(0.3, boltTheme.plasmaMid);
          og.addColorStop(1, `${boltTheme.plasmaGlowRgba}0)`);
          ctx.fillStyle = og;
          ctx.beginPath();
          ctx.arc(bolt.x, bolt.y - 10, orbR, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
          const fl = Math.floor(this.elapsedTime * 30);
          const orbSpecial = !!boltTheme.kind && boltTheme.kind !== 'obliterator';
          for (let k = 0; k < (orbSpecial ? 0 : 7); k++) {
            const a = pseudoRandom(fl * 3 + k) * Math.PI * 2;
            const len = 55 + pseudoRandom(fl + k * 7) * 45;
            strokeLightning(
              ctx,
              bolt.x,
              bolt.y - 10,
              bolt.x + Math.cos(a) * len,
              bolt.y - 10 + Math.sin(a) * len,
              boltTheme.plasmaMid,
              1.4,
              6,
              10,
              fl * 11 + k,
              0.9
            );
          }
        }
      }
      ctx.save();
      ctx.globalAlpha = bolt.alpha;
      ctx.translate(bolt.x, bolt.y);
      ctx.rotate(bolt.rot);
      drawObliteratorSpike(ctx, boltTheme, {
        scale: bolt.isOverdrive ? 1.28 : 1.02,
        isOverdrive: bolt.isOverdrive,
        inFlight: !bolt.ricocheted,
        time: this.elapsedTime,
      });
      ctx.restore();
    }

    // 7. ROTATING DOOM CIRCULAR TARGET CORE (AND ALL EMBEDDED SPIKES)
    if (this.phase !== 'shattering') {
      const damageRatio =
        this.ammoTotal > 0 ? Math.min(1, this.hitsLanded / this.ammoTotal) : 0;
      const tgNow = this.targetGeometry();

      drawTargetCore(ctx, {
        x: tgNow.x,
        y: tgNow.y,
        radius: tgNow.r,
        rotation: this.targetRotation,
        core: this.coreTheme,
        spikes: this.embeddedSpikes,
        cells: this.argentCells,
        damageRatio,
        hitFlash: this.targetHitFlash,
        scalePop: this.targetScalePop,
        time: this.elapsedTime,
        variant: this.targetVariant,
        duoSpin: this.targetVariant === 'duo' ? -this.targetRotation * 1.75 : undefined,
        whirlDir: this.whirlDir,
        whirlFlash: this.whirlFlash,
        driftDir: this.targetVariant === 'drift' ? Math.cos(this.driftPhase) : 0,
      });

      // ORBITING WARNING MINES (Minefield wheel)
      for (const mn of this.mines) {
        const mx = tgNow.x + Math.cos(mn.a) * tgNow.r * 1.24;
        const my = tgNow.y + Math.sin(mn.a) * tgNow.r * 1.24;
        drawMine(ctx, mx, my, 9 * Math.max(0.7, this.getArenaMetrics().unitScale), this.elapsedTime, mn.ph);
      }
    }

    // 7b. ELEMENTAL STATUS ON THE WHEEL (frozen / soaked / prismatic)
    if (this.phase !== 'shattering' && this.targetFx > 0.01) {
      const tgFx = this.targetGeometry();
      drawTargetKindFx(
        ctx,
        this.targetFxKind,
        tgFx.x,
        tgFx.y,
        tgFx.r * this.targetScalePop,
        Math.min(1, this.targetFx),
        this.elapsedTime,
        this.targetRotation
      );
    }

    // 8. SHATTERED ARMOR CORE FRAGMENTS
    for (const sh of this.shatterShards) {
      drawShatterShard(ctx, sh);
    }

    // 9a. Dynamic floor light + energy pedestal beneath the gun
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const floorR = 300 * gunScale;
    const fg = ctx.createRadialGradient(centerX, h, 10, centerX, h, floorR);
    fg.addColorStop(0, `${theme.plasmaGlowRgba}${0.28 + this.gunRecoil * 0.4 + (this.overdrivePrimed ? 0.2 : 0)})`);
    fg.addColorStop(0.5, `${theme.plasmaGlowRgba}0.06)`);
    fg.addColorStop(1, `${theme.plasmaGlowRgba}0)`);
    ctx.fillStyle = fg;
    ctx.fillRect(centerX - floorR, h - floorR, floorR * 2, floorR);
    // Rotating pedestal rune circle
    ctx.translate(centerX, gunBaseY + 70 * gunScale);
    ctx.scale(1, 0.28);
    ctx.rotate(this.elapsedTime * 0.8);
    ctx.strokeStyle = theme.plasmaMid;
    ctx.globalAlpha = 0.45 + this.gunRecoil * 0.4;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 120 * gunScale, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([10, 14]);
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 0, 100 * gunScale, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    for (let k = 0; k < 6; k++) {
      ctx.rotate(Math.PI / 3);
      ctx.beginPath();
      ctx.moveTo(0, -120 * gunScale);
      ctx.lineTo(18 * gunScale, -100 * gunScale);
      ctx.lineTo(-18 * gunScale, -100 * gunScale);
      ctx.closePath();
      ctx.stroke();
    }
    ctx.restore();

    // 9b. Ground shadow anchoring the massive cannon
    ctx.save();
    ctx.translate(centerX, gunBaseY + 88 * gunScale);
    ctx.scale(1, 0.2);
    const gsh = ctx.createRadialGradient(0, 0, 8, 0, 0, 250 * gunScale);
    gsh.addColorStop(0, 'rgba(0,0,0,0.5)');
    gsh.addColorStop(0.55, 'rgba(0,0,0,0.24)');
    gsh.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gsh;
    ctx.beginPath();
    ctx.arc(0, 0, 250 * gunScale, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 9. THE STAR OF THE SHOW: 2D DOOM OBLITERATOR GUN POINTING STRAIGHT UP!
    drawObliteratorGun(ctx, {
      charge: this.chargeGlow,
      peelOpen: this.bananaOpen,
      fleshFill: this.bananaFill,
      x: centerX,
      y: gunBaseY,
      scale: gunScale,
      time: this.elapsedTime,
      recoil: this.gunRecoil,
      muzzleFlash: this.gunMuzzleFlash,
      heat: this.gunHeat,
      ammoLeft: this.inspectMode ? this.ammoTotal : this.ammoLeft,
      ammoTotal: this.ammoTotal,
      overdrivePrimed: this.overdrivePrimed,
      theme,
    });

    // 10. EXPLOSIONS, STEAM VENTS & SHOCKWAVE RINGS
    for (const p of this.particles) {
      const lifeRatio = Math.max(0, p.life / p.maxLife);
      if (drawElementalParticle(ctx, p, lifeRatio, this.elapsedTime)) continue;
      ctx.save();
      ctx.globalAlpha = p.alpha * lifeRatio;
      if (p.type === 'ring') {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 3 * lifeRatio;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.stroke();
      } else if (p.type === 'smoke') {
        const sGrad = ctx.createRadialGradient(p.x, p.y, 1, p.x, p.y, p.size * (2 - lifeRatio));
        sGrad.addColorStop(0, p.color);
        sGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = sGrad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (2 - lifeRatio), 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'ellipse') {
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 1 + 4 * lifeRatio;
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, p.size, p.size * 0.28, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, p.size * 0.92, p.size * 0.25, 0, 0, Math.PI * 2);
        ctx.stroke();
      } else if (p.type === 'streak') {
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = p.color;
        ctx.lineCap = 'round';
        ctx.lineWidth = p.size;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - p.vx * 0.028, p.y - p.vy * 0.028);
        ctx.stroke();
      } else if (p.type === 'lightning') {
        ctx.restore();
        strokeLightning(
          ctx,
          p.x,
          p.y,
          p.x2 ?? p.x,
          p.y2 ?? p.y,
          p.color,
          p.size,
          8,
          14,
          (p.seed ?? 0) + Math.floor(this.elapsedTime * 40),
          p.alpha * Math.min(1, lifeRatio * 1.6)
        );
        continue;
      } else if (p.type === 'glow') {
        ctx.globalCompositeOperation = 'lighter';
        const gr = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 2);
        gr.addColorStop(0, '#ffffff');
        gr.addColorStop(0.3, p.color);
        gr.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = gr;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 2, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'star') {
        ctx.restore();
        drawTwinkle(ctx, p.x, p.y, p.size * (0.6 + 0.4 * lifeRatio), p.color, p.alpha * lifeRatio, p.rot ?? 0);
        continue;
      } else if (p.type === 'flake') {
        ctx.restore();
        drawSnowflake(ctx, p.x, p.y, p.size, p.rot ?? 0, p.color, p.alpha * Math.min(1, lifeRatio * 1.5), Math.max(0.8, p.size * 0.24));
        continue;
      } else if (p.type === 'drop') {
        const ang = Math.atan2(p.vy, p.vx);
        const stretch = Math.min(3, 1 + Math.hypot(p.vx, p.vy) / 380);
        ctx.translate(p.x, p.y);
        ctx.rotate(ang);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.ellipse(0, 0, p.size * stretch, p.size, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.beginPath();
        ctx.arc(p.size * 0.3 * stretch, -p.size * 0.35, p.size * 0.32, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'bubble') {
        const bx = p.x + Math.sin(p.life * 18) * 1.6;
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        ctx.arc(bx, p.y, p.size, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.beginPath();
        ctx.arc(bx - p.size * 0.35, p.y - p.size * 0.35, p.size * 0.25, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'casing') {
        // Spent brass casing / red shotgun shell
        ctx.globalAlpha = Math.min(1, lifeRatio * 2.5);
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot ?? 0);
        ctx.scale(p.size, p.size);
        if (p.color === '#dc2626') {
          ctx.fillStyle = '#dc2626';
          ctx.strokeStyle = '#3a0606';
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.roundRect(-4, -9, 8, 13, 1);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = '#e8b860';
          ctx.beginPath();
          ctx.roundRect(-4.3, 4, 8.6, 6, 1);
          ctx.fill();
          ctx.stroke();
        } else {
          const cg = ctx.createLinearGradient(-3, 0, 3, 0);
          cg.addColorStop(0, '#6b470c');
          cg.addColorStop(0.4, '#fff1b8');
          cg.addColorStop(1, '#7a5310');
          ctx.fillStyle = cg;
          ctx.strokeStyle = '#3d2706';
          ctx.lineWidth = 0.7;
          ctx.beginPath();
          ctx.roundRect(-3, -7, 6, 14, 1);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = '#d9a441';
          ctx.fillRect(-3.4, 6, 6.8, 2);
        }
      } else if (p.type === 'shell') {
        // Spent glowing capacitor cell
        ctx.globalAlpha = Math.min(1, lifeRatio * 2);
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot ?? 0);
        ctx.scale(p.size, p.size);
        ctx.fillStyle = '#2a2d33';
        ctx.strokeStyle = '#0a0b0d';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(-4, -8, 8, 16, 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#d4a24c';
        ctx.fillRect(-4, -8, 8, 3);
        ctx.fillRect(-4, 5, 8, 3);
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = p.color;
        ctx.fillRect(-2.5, -4, 5, 8);
        const sg = ctx.createRadialGradient(0, 0, 0, 0, 0, 14);
        sg.addColorStop(0, p.color);
        sg.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.globalAlpha = lifeRatio * 0.7;
        ctx.fillStyle = sg;
        ctx.beginPath();
        ctx.arc(0, 0, 14, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha *= 0.35;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 2.6, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // 11. JUICY FLOATING COMBAT POPUPS
    for (const ft of this.floatingTexts) {
      const alpha = Math.min(1, (ft.life / ft.maxLife) * 1.4);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = `800 ${Math.round(16 * ft.scale)}px 'Orbitron', sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillStyle = '#090a0d';
      ctx.fillText(ft.text, ft.x + 1.5, ft.y + 1.5);
      ctx.fillStyle = ft.color;
      ctx.shadowColor = ft.color;
      ctx.shadowBlur = 10;
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.restore();
    }

    ctx.restore(); // End world camera transform

    // 11b. ADDITIVE SCREEN FLASH (muzzle blasts & obliterations)
    if (this.screenFlash > 0.01) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const sf = ctx.createRadialGradient(w * 0.5, h * 0.62, 0, w * 0.5, h * 0.62, Math.max(w, h) * 0.8);
      sf.addColorStop(0, this.screenFlashColor);
      sf.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.globalAlpha = Math.min(0.6, this.screenFlash) * 0.55;
      ctx.fillStyle = sf;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    }

    // Cinematic vignette
    const vg = ctx.createRadialGradient(w * 0.5, h * 0.5, Math.min(w, h) * 0.35, w * 0.5, h * 0.5, Math.max(w, h) * 0.75);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, w, h);

    // 12. RED DAMAGE VIGNETTE FLASH ON SPIKE CLASH
    if (this.redFailFlash > 0.01) {
      const vig = ctx.createRadialGradient(w * 0.5, h * 0.5, h * 0.22, w * 0.5, h * 0.5, Math.max(w, h) * 0.75);
      vig.addColorStop(0, 'rgba(220, 38, 38, 0)');
      vig.addColorStop(1, `rgba(220, 38, 38, ${this.redFailFlash * 0.55})`);
      ctx.fillStyle = vig;
      ctx.fillRect(0, 0, w, h);
    }

    ctx.restore();
  }

  private emitHud() {
    this.onHudChange({
      phase: this.phase,
      score: this.score,
      bestScore: this.bestScore,
      stage: this.stage,
      bestStage: this.bestStage,
      ammoLeft: this.ammoLeft,
      ammoTotal: this.ammoTotal,
      argentGems: this.argentGems,
      overdriveCharge: this.overdriveCharge,
      overdrivePrimed: this.overdrivePrimed,
      combo: this.combo,
      selectedWeapon: this.selectedWeapon,
      inspectMode: this.inspectMode,
      muted: soundEngine.muted,
      coreName: this.coreTheme.name,
      isBoss: this.coreTheme.isBoss,
      isSpecial: this.targetVariant !== 'normal' && this.targetVariant !== 'boss',
    });
  }
}
