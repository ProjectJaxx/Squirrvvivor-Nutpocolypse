
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { 
  GameState, PlayerState, Enemy, Projectile, Drop, Particle, Obstacle, Chest,
  EntityType, Weapon, Character, SaveData, Difficulty, AbilityId, GameSettings, CompanionType, GameResults 
} from '../types.ts';
import { 
  WORLD_WIDTH, WORLD_HEIGHT, TILE_SIZE, 
  IN_GAME_UPGRADES, ASSETS, DIFFICULTY_SETTINGS, ACTIVE_ABILITIES, COMPANIONS, PROJECTILE_ROWS,
  getStageInfo, BIOME_CONFIG
} from '../constants.ts';
import Joystick from './Joystick.tsx';
import { sfx, SFX_TYPES } from '../utils/sfx.ts';

const PLAYER_ROW_MAP = [10, 9, 11, 8]; 
const PLAYER_ATTACK_ROW_MAP = [2, 1, 3, 0]; 
const GROUND_SOURCE_SIZE = 100;

const DECO_CONFIG = {
  strideX: 64,
  strideY: 64,
  offsetX: 0,
  offsetY: 0,
  sourceSize: 64
};

interface GameEngineProps {
  character: Character;
  saveData: SaveData;
  difficulty: Difficulty;
  stage: number;
  onGameOver: (results: GameResults, won: boolean) => void;
  onLevelUp: (currentLevel: number) => void;
  onLevelUpWithState?: (currentLevel: number, playerState: PlayerState) => void; 
  gameState: GameState;
  selectedUpgradeId?: string; 
  onResume: () => void; 
  onTogglePause: () => void;
  settings: GameSettings;
  onUpdateSettings: (newSettings: GameSettings) => void;
  isCheatMode?: boolean;
}

type RenderItem = { 
  type: 'PLAYER' | 'ENEMY' | 'OBSTACLE' | 'COMPANION' | 'DECORATION' | 'DROP' | 'CHEST' | 'EFFECT' | 'PASSIVE' | 'PARTICLE'; 
  y: number; 
  draw: (ctx: CanvasRenderingContext2D) => void;
};

type Decoration = { 
  id: string; 
  x: number; 
  y: number; 
  size: number; 
  frameX: number; 
  frameY: number; 
};

type CompanionEntity = { type: CompanionType; x: number; y: number; angle: number; orbitSpeed: number; orbitRadius: number; frameX: number; animTimer: number; icon: string; };
type DamageNumber = { id: string; x: number; y: number; value: number; life: number; maxLife: number; velocity: number; isCrit: boolean; text?: string; color?: string; };

const GameEngine: React.FC<GameEngineProps> = ({ 
  character, saveData, difficulty, stage, onGameOver, onLevelUp, onLevelUpWithState, gameState, selectedUpgradeId, onResume, onTogglePause,
  settings, onUpdateSettings, isCheatMode = false
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });

  const [bgConfig] = useState({
    strideX: 512, strideY: 512, offsetX: 0, offsetY: 0, renderSize: 512, sourceSize: 512
  });

  const gameEndedRef = useRef(false);
  const initialCooldowns: Record<string, number> = {};
  saveData.equippedAbilities.forEach(aid => { initialCooldowns[aid] = 0; });

  const playerRef = useRef<PlayerState>({
    x: WORLD_WIDTH / 2, 
    y: WORLD_HEIGHT / 2,
    hp: character.baseStats.hp,
    maxHp: character.baseStats.hp, 
    xp: 0,
    level: 1,
    nextLevelXp: 50,
    speed: character.baseStats.speed + 0.3,
    direction: 0, 
    frameX: 0,
    animTimer: 0,
    invulnerableTimer: 0,
    intangibleTimer: 0,
    isAttacking: false, 
    weapons: [{ 
      id: 'base_nut', name: 'Nut Throw', cooldown: 50, currentCooldown: 0, 
      damage: character.baseStats.damage, speed: 9, duration: 2.0, area: 1.0,
      projectileRow: PROJECTILE_ROWS.PEANUT
    }],
    stats: {
      pickupRange: 350, damageMult: 1, cooldownMult: 1, projectileCount: 1, luck: 1, lifeSteal: 0, knockback: 0, armor: character.baseStats.armor || 0, explodeChance: 0, critChance: 0
    },
    passives: { 
      raccoonSquad: (saveData.upgrades['raccoon_squad'] || 0) > 0 ? (saveData.upgrades['raccoon_squad'] + 2) : 0, 
      murderOfCrows: saveData.upgrades['murder_of_crows'] || 0,
      scurryAura: 0
    },
    activeCompanions: saveData.unlockedCompanions,
    abilityCooldowns: initialCooldowns,
    companionDamageMult: 1,
    madSquirrelTimer: 0
  });

  const enemiesRef = useRef<Enemy[]>([]);
  const projectilesRef = useRef<Projectile[]>([]);
  const dropsRef = useRef<Drop[]>([]);
  const chestsRef = useRef<Chest[]>([]);
  const obstaclesRef = useRef<Obstacle[]>([]);
  const decorationsRef = useRef<Decoration[]>([]);
  const damageNumbersRef = useRef<DamageNumber[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const companionsRef = useRef<CompanionEntity[]>([]);
  
  const enemiesKilledRef = useRef<number>(0);
  const bossesKilledRef = useRef<number>(0);
  const timeRef = useRef<number>(0); 
  const lastTimeRef = useRef<number>(0);
  const lastSecondRef = useRef<number>(0);
  const waveTimerRef = useRef<number>(0);
  
  const bossSpawnedRef = useRef<boolean>(false);
  const subBossSpawnedRef = useRef<boolean>(false);
  const subBoss2SpawnedRef = useRef<boolean>(false);

  const warningRef = useRef<string | null>(null);
  const shakeRef = useRef<{x: number, y: number, duration: number, intensity: number}>({ x: 0, y: 0, duration: 0, intensity: 0 });
  const arenaActiveRef = useRef<boolean>(false);
  const arenaRectRef = useRef<{x: number, y: number, width: number, height: number} | null>(null);
  const hudUpdateTimerRef = useRef<number>(0);
  
  const keysRef = useRef<Set<string>>(new Set());
  const joystickRef = useRef<{angle: number | null, force: number}>({ angle: null, force: 0 });
  const imagesRef = useRef<Record<string, HTMLImageElement>>({});

  const [hudState, setHudState] = useState({ 
    hp: character.baseStats.hp, maxHp: character.baseStats.hp, level: 1, xp: 0, nextLevelXp: 50, time: 0, peanuts: 0, 
    bossActive: false, warning: null as string | null,
    bossHp: 0, bossMaxHp: 1, objective: '', timeLeft: 0
  });
  const [abilityHud, setAbilityHud] = useState<Record<string, number>>({});
  const [sessionPeanuts, setSessionPeanuts] = useState(0);

  const stageInfo = getStageInfo(stage);
  const biome = (BIOME_CONFIG as any)[stageInfo.id] || BIOME_CONFIG.PARK;

  const godMode = isCheatMode;

  useEffect(() => {
    const handleResize = () => setDimensions({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    sfx.setVolume(settings.sfxVolume / 100);
  }, [settings.sfxVolume]);

  useEffect(() => {
    const p = playerRef.current;
    if (saveData.upgrades['thick_fur']) p.maxHp += (saveData.upgrades['thick_fur'] * 10);
    p.hp = p.maxHp;
    if (saveData.upgrades['quick_paws']) p.speed += (saveData.upgrades['quick_paws'] * 0.4);
    if (saveData.upgrades['nut_magnet']) p.stats.pickupRange += (saveData.upgrades['nut_magnet'] * 25);
    if (saveData.upgrades['sharp_teeth']) p.stats.damageMult += (saveData.upgrades['sharp_teeth'] * 0.2); 
    if (saveData.upgrades['hyper_meta']) p.stats.cooldownMult *= Math.pow(0.95, saveData.upgrades['hyper_meta']);

    const activeComps = saveData.equippedCompanions || [];
    const loadedCompanions: CompanionEntity[] = [];
    
    activeComps.forEach((compTypeStr, index) => {
        const compType = compTypeStr as CompanionType;
        const compData = COMPANIONS.find(c => c.id === compType);
        if (!compData) return;
        const compLevel = saveData.companionLevels[compType] || 1;
        const compMult = 1 + (compLevel - 1) * 0.15; 

        if (compType === CompanionType.RACER) { p.speed += 0.5 * compMult; p.stats.cooldownMult *= (1 - (0.05 * compMult)); }
        else if (compType === CompanionType.DIRT) { p.stats.armor += 5 * compMult; p.stats.knockback += 20 * compMult; }
        else if (compType === CompanionType.HANGO) { p.stats.damageMult += 0.2 * compMult; }
        else if (compType === CompanionType.MR_PEACHES) { p.stats.armor += 3 * compMult; }
        else if (compType === CompanionType.MAXINE) { p.stats.damageMult += 0.1 * compMult; if (compLevel >= 5) p.stats.projectileCount += 1; }

        loadedCompanions.push({
            type: compType, x: p.x, y: p.y,
            angle: (Math.PI * 2 / activeComps.length) * index,
            orbitRadius: 60 + (index * 15), 
            orbitSpeed: (0.5 + (Math.random() * 0.5)) * compMult,
            frameX: 0, animTimer: 0, icon: compData.icon
        });
    });
    
    companionsRef.current = loadedCompanions;
    setHudState(prev => ({ ...prev, hp: p.hp, maxHp: p.maxHp }));
  }, [saveData, character]);

  useEffect(() => {
    if (stageInfo.id === 'PARK' || stageInfo.id === 'FOREST') {
        const obs: Obstacle[] = [];
        let attempts = 0;
        while (obs.length < 150 && attempts < 10000) {
            attempts++;
            const x = Math.random() * WORLD_WIDTH;
            const y = Math.random() * WORLD_HEIGHT;
            if (Math.hypot(x - WORLD_WIDTH/2, y - WORLD_HEIGHT/2) < 500) continue;
            let tooClose = false;
            for (const other of obs) if (Math.hypot(x - other.x, y - other.y) < 200) { tooClose = true; break; }
            if (tooClose) continue;
            const scale = 2.5 + Math.random() * 1.2;
            const size = GROUND_SOURCE_SIZE * scale;
            let availableFrames = [2, 4, 6, 8, 9];
            obs.push({ 
                id: `tree-${obs.length}`, variant: 'TREE', x, y, width: size, height: size, 
                collisionRadius: 40 * (scale / 2.5), sprite: ASSETS.ENV.TREES, 
                frameX: availableFrames[Math.floor(Math.random() * availableFrames.length)], frameY: 0,
                hasCollision: true, hp: 1000, maxHp: 1000 
            });
        }
        obstaclesRef.current = obs;
        const decos: Decoration[] = [];
        for(let i=0; i<500; i++) decos.push({ id: `deco-${i}`, x: Math.random() * WORLD_WIDTH, y: Math.random() * WORLD_HEIGHT, size: DECO_CONFIG.sourceSize, frameX: Math.floor(Math.random() * 6), frameY: 0 });
        decorationsRef.current = decos;
    }
  }, [stageInfo]);

  useEffect(() => {
    const loadImg = (src: string) => {
      if (imagesRef.current[src]) return;
      const img = new Image(); img.src = src; imagesRef.current[src] = img;
    };
    Object.values(ASSETS.CHARACTERS).forEach(loadImg);
    Object.values(ASSETS.ENEMIES).forEach(loadImg);
    Object.values(ASSETS.ENV).forEach(loadImg);
    Object.values(ASSETS.PROJECTILES).forEach(loadImg);
  }, []);

  const spawnParticles = (x: number, y: number, color: string, count: number = 5) => {
    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 1 + Math.random() * 3;
        particlesRef.current.push({ id: Math.random().toString(), x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: 0.5 + Math.random() * 0.5, maxLife: 1.0, color, size: 2 + Math.random() * 4 });
    }
  };

  const spawnDamageNumber = (x: number, y: number, amount: number, isCrit: boolean = false, text?: string, color?: string) => {
      if (!settings.damageNumbers && !text) return;
      damageNumbersRef.current.push({ id: Math.random().toString(), x, y: y - 20, value: Math.floor(amount), life: 1.0, maxLife: 1.0, velocity: 40, isCrit, text, color });
  };

  const triggerShake = (intensity: number, duration: number) => {
      if (!settings.screenShake) return;
      shakeRef.current = { x: 0, y: 0, duration, intensity };
  };

  const triggerAbility = useCallback((abilityId: string) => {
    const p = playerRef.current;
    if ((p.abilityCooldowns[abilityId] || 0) > 0) return; 
    const config = ACTIVE_ABILITIES.find(a => a.id === abilityId);
    if (!config) return;
    const level = saveData.abilityLevels[abilityId] || 1;
    p.abilityCooldowns[abilityId] = config.baseCooldown * p.stats.cooldownMult;
    sfx.play(SFX_TYPES.SHOOT); 
    
    switch (abilityId) {
      case AbilityId.PEANUT_BRITTLE: {
          const duration = config.baseDuration! * 1000;
          const interval = setInterval(() => {
              for (let i = 0; i < 12; i++) {
                  const ang = (i / 12) * Math.PI * 2;
                  projectilesRef.current.push({
                      id: `pb-${Date.now()}-${i}`, x: p.x, y: p.y, vx: Math.cos(ang) * 6, vy: Math.sin(ang) * 6,
                      damage: config.baseDamage! * p.stats.damageMult, duration: 2, rotation: ang, owner: EntityType.PLAYER,
                      isRolling: true, sprite: ASSETS.PROJECTILES.NUT, frameY: PROJECTILE_ROWS.PEANUT, zoneRadius: 50, pierce: 999
                  });
              }
          }, 1000);
          setTimeout(() => clearInterval(interval), duration);
          break;
      }
      case AbilityId.DRAY_DAY: {
          const duration = config.baseDuration! * 1000;
          const interval = setInterval(() => {
              for (let i = 0; i < 5; i++) {
                  const tx = p.x + (Math.random() - 0.5) * 1000;
                  const ty = p.y + (Math.random() - 0.5) * 1000;
                  projectilesRef.current.push({
                      id: `dray-${Date.now()}-${i}`, x: tx, y: ty, vx: 0, vy: 0, damage: config.baseDamage! * p.stats.damageMult,
                      duration: 0.5, rotation: 0, owner: EntityType.PLAYER, isExplosive: true, explosionRadius: 2.0, sprite: ASSETS.PROJECTILES.TWIG
                  });
              }
          }, 500);
          setTimeout(() => clearInterval(interval), duration);
          break;
      }
      case AbilityId.VOLTDOM: {
          p.invulnerableTimer = config.baseDuration!;
          p.companionDamageMult = 4.0;
          setTimeout(() => { if (playerRef.current) playerRef.current.companionDamageMult = 1.0; }, config.baseDuration! * 1000);
          break;
      }
      case AbilityId.WALNUT_ROLLOUT: {
          for (let i = 0; i < 20; i++) {
              const ang = (i / 20) * Math.PI * 2;
              projectilesRef.current.push({
                  id: `wr-${Date.now()}-${i}`, x: p.x, y: p.y, vx: Math.cos(ang) * 8, vy: Math.sin(ang) * 8,
                  damage: config.baseDamage! * p.stats.damageMult, duration: 4, rotation: ang, owner: EntityType.PLAYER,
                  isRolling: true, sprite: ASSETS.PROJECTILES.WALNUT, zoneRadius: 80, pierce: 999
              });
          }
          break;
      }
      case AbilityId.TWIGNADO: {
          const duration = config.baseDuration! * 1000;
          for (let i = 0; i < 8; i++) {
              const ang = (i / 8) * Math.PI * 2;
              projectilesRef.current.push({
                  id: `twignado-${Date.now()}-${i}`, x: p.x, y: p.y, vx: Math.cos(ang) * 4, vy: Math.sin(ang) * 4,
                  damage: config.baseDamage! * p.stats.damageMult, duration: config.baseDuration!, rotation: ang, owner: EntityType.PLAYER,
                  sprite: ASSETS.PROJECTILES.TWIG, zoneRadius: 100, pierce: 999
              });
          }
          break;
      }
      case AbilityId.CUTENESS_OVERLOAD: {
          enemiesRef.current.forEach(e => { if (!e.isDead) e.status.confusedTimer = config.baseDuration!; });
          break;
      }
      case AbilityId.MAD_SQUIRREL: {
          p.madSquirrelTimer = config.baseDuration!;
          break;
      }
    }
  }, [saveData]);

  const spawnSubBoss = () => {
    warningRef.current = "⚠️ ELITE ENEMY APPROACHING ⚠️";
    setTimeout(() => { if (warningRef.current?.includes("ELITE")) warningRef.current = null; }, 4000);
    triggerShake(5, 0.5); 
    const player = playerRef.current;
    const angle = Math.random() * Math.PI * 2;
    const distance = 450;
    const x = Math.max(100, Math.min(WORLD_WIDTH - 100, player.x + Math.cos(angle) * distance));
    const y = Math.max(100, Math.min(WORLD_HEIGHT - 100, player.y + Math.sin(angle) * distance));
    const diff = DIFFICULTY_SETTINGS[difficulty];
    const hp = (2500 + stage * 500) * diff.hpMult; 
    const damage = (15 + stage * 1.5) * diff.dmgMult;
    enemiesRef.current.push({ id: `sub-boss-${Date.now()}`, x, y, type: EntityType.SUB_BOSS, sprite: ASSETS.ENEMIES.GOBLIN_SUB_BOSS, hp, maxHp: hp, damage, speed: 2.2, width: 120, height: 120, isBoss: false, frameX: 0, frameY: 10, animTimer: 0, isDead: false, deathTimer: 0, isRanged: false, attackTimer: 3, status: { frozenTimer: 0, burnTimer: 0, bleedTimer: 0, bleedDamage: 0, confusedTimer: 0 } });
  };

  const spawnBoss = () => {
    arenaActiveRef.current = true;
    warningRef.current = "⚠️ FINAL BOSS DETECTED ⚠️";
    triggerShake(8, 1.5); 
    const player = playerRef.current;
    const arenaSize = 1300;
    let arenaX = Math.max(0, Math.min(WORLD_WIDTH - arenaSize, player.x - arenaSize / 2));
    let arenaY = Math.max(0, Math.min(WORLD_HEIGHT - arenaSize, player.y - arenaSize / 2));
    arenaRectRef.current = { x: arenaX, y: arenaY, width: arenaSize, height: arenaSize };
    const diff = DIFFICULTY_SETTINGS[difficulty];
    const hp = (5000 + stage * 1500) * diff.hpMult; 
    const damage = (30 + stage * 3) * diff.dmgMult;
    enemiesRef.current.push({ id: `main-boss-${Date.now()}`, x: arenaX + arenaSize / 2, y: arenaY + arenaSize / 2, type: EntityType.BOSS, sprite: ASSETS.ENEMIES.GOBLIN_BOSS, hp, maxHp: hp, damage, speed: 1.8, width: 280, height: 280, isBoss: true, frameX: 0, frameY: 10, animTimer: 0, isDead: false, deathTimer: 0, isRanged: true, attackTimer: 2, status: { frozenTimer: 0, burnTimer: 0, bleedTimer: 0, bleedDamage: 0, confusedTimer: 0 }, projectileType: 'KINETIC' });
  };

  const spawnWave = () => {
    const player = playerRef.current;
    if (arenaActiveRef.current || enemiesRef.current.length > 400) return;
    const diff = DIFFICULTY_SETTINGS[difficulty];
    const waveCount = Math.min(60, 5 + Math.floor(stage * 0.8)); 
    const meleeSprites = [ ASSETS.ENEMIES.GOBLIN, ASSETS.ENEMIES.GOBLIN_2, ASSETS.ENEMIES.GOBLIN_3 ];
    for(let i=0; i<waveCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = 500 + Math.random() * 200; 
      const x = player.x + Math.cos(angle) * distance;
      const y = player.y + Math.sin(angle) * distance;
      if (x < 0 || x > WORLD_WIDTH || y < 0 || y > WORLD_HEIGHT) continue;
      const isRanged = Math.random() < 0.05; 
      let sprite = meleeSprites[Math.floor(Math.random() * meleeSprites.length)];
      let projectileType: 'FIRE' | 'ICE' | 'KINETIC' | undefined = undefined;
      if (isRanged) { sprite = ASSETS.ENEMIES.GOBLIN_RANGED; const roll = Math.random(); if (roll < 0.33) projectileType = 'FIRE'; else if (roll < 0.66) projectileType = 'ICE'; else projectileType = 'KINETIC'; }
      enemiesRef.current.push({ id: `enemy-${Math.random()}`, x, y, type: EntityType.ENEMY, sprite, hp: (15 + stage * 3) * diff.hpMult * (isRanged ? 0.7 : 1), maxHp: (15 + stage * 3) * diff.hpMult * (isRanged ? 0.7 : 1), damage: (5 + stage * 0.5) * diff.dmgMult, speed: 2.0 * (0.9 + Math.random() * 0.2) * (isRanged ? 0.8 : 1), width: 80, height: 80, isBoss: false, frameX: 0, frameY: 10, animTimer: 0, isDead: false, deathTimer: 0, isRanged, attackTimer: isRanged ? (2 + Math.random() * 2) : 0, status: { frozenTimer: 0, burnTimer: 0, bleedTimer: 0, bleedDamage: 0, confusedTimer: 0 }, projectileType });
    }
  };

  const fireWeapon = (weapon: Weapon, p: PlayerState) => {
    let target = null;
    let minDist = p.stats.pickupRange * 2; 
    for(const e of enemiesRef.current) {
        if (e.isDead) continue;
        const dist = Math.hypot(e.x - p.x, e.y - p.y);
        if (dist < minDist) { minDist = dist; target = e; }
    }
    if (!target && joystickRef.current.force === 0) return;
    if (!p.isAttacking) p.isAttacking = true; 
    let angle = target ? Math.atan2(target.y - p.y, target.x - p.x) : (joystickRef.current.angle || 0);
    sfx.play(SFX_TYPES.SHOOT);
    let count = p.stats.projectileCount + (weapon.bonusProjectiles || 0);
    const speedMult = p.madSquirrelTimer && p.madSquirrelTimer > 0 ? 3.0 : 1.0;
    const damageMult = p.madSquirrelTimer && p.madSquirrelTimer > 0 ? 2.0 : 1.0;
    for(let i=0; i<count; i++) {
        let fireAngle = angle;
        if (count > 1) { const spread = Math.min(Math.PI / 2, count * 0.1); fireAngle = (angle - spread / 2) + (i * (spread / (count - 1))); }
        const sizeVariance = 0.8 + Math.random() * 0.4;
        const actualSize = (weapon.isRolling ? 60 : 32) * weapon.area * sizeVariance;
        projectilesRef.current.push({ id: `proj-${Math.random()}`, x: p.x, y: p.y, vx: Math.cos(fireAngle) * weapon.speed * speedMult, vy: Math.sin(fireAngle) * weapon.speed * speedMult, damage: weapon.damage * p.stats.damageMult * damageMult, duration: weapon.duration, sprite: weapon.projectileSprite || ASSETS.PROJECTILES.NUT, rotation: fireAngle, owner: EntityType.PLAYER, frameX: 1, frameY: weapon.projectileRow !== undefined ? weapon.projectileRow : PROJECTILE_ROWS.PEANUT, animTimer: 0, trailColor: '#d6b88b', pierce: weapon.isRolling ? 999 : 0, isExplosive: weapon.isExplosive, explosionRadius: weapon.isExplosive ? weapon.area : 0, isRolling: weapon.isRolling, zoneRadius: actualSize });
    }
  };

  const update = useCallback((dt: number) => {
    const p = playerRef.current;
    const diffConf = DIFFICULTY_SETTINGS[difficulty];
    const isInfinite = difficulty === Difficulty.INFINITE;
    timeRef.current += dt;
    const currentSecond = Math.floor(timeRef.current);
    if (currentSecond !== lastSecondRef.current) {
        lastSecondRef.current = currentSecond;
        if (!isInfinite) {
            if (currentSecond === Math.floor(diffConf.duration * 0.25) && !subBossSpawnedRef.current) { subBossSpawnedRef.current = true; spawnSubBoss(); }
            if (currentSecond === Math.floor(diffConf.duration * 0.6) && !subBoss2SpawnedRef.current) { subBoss2SpawnedRef.current = true; spawnSubBoss(); }
            if (currentSecond === Math.floor(diffConf.duration - 60) && !bossSpawnedRef.current) { bossSpawnedRef.current = true; spawnBoss(); }
        } else {
            if (currentSecond > 0) { if (currentSecond % 180 === 0) spawnSubBoss(); if (currentSecond % 600 === 0) spawnBoss(); }
        }
    }
    if (!bossSpawnedRef.current || isInfinite) {
        waveTimerRef.current += dt;
        if (waveTimerRef.current > 3 * diffConf.spawnIntervalMult) { spawnWave(); waveTimerRef.current = 0; }
    }
    let moveX = 0, moveY = 0;
    if (joystickRef.current.force > 0 && joystickRef.current.angle !== null) { moveX = Math.cos(joystickRef.current.angle) * joystickRef.current.force; moveY = Math.sin(joystickRef.current.angle) * joystickRef.current.force; }
    const keys = keysRef.current;
    let kX = 0, kY = 0;
    if (keys.has('KeyW') || keys.has('ArrowUp') || keys.has('w')) kY -= 1;
    if (keys.has('KeyS') || keys.has('ArrowDown') || keys.has('s')) kY += 1;
    if (keys.has('KeyA') || keys.has('ArrowLeft') || keys.has('a')) kX -= 1;
    if (keys.has('KeyD') || keys.has('ArrowRight') || keys.has('d')) kX += 1;
    if (kX !== 0 || kY !== 0) { const mag = Math.sqrt(kX * kX + kY * kY); moveX = kX / mag; moveY = kY / mag; }
    const speedNormalizer = dt * 60;
    const dx = moveX * p.speed * speedNormalizer;
    const dy = moveY * p.speed * speedNormalizer;
    let nextX = p.x + dx, nextY = p.y + dy;
    if (p.intangibleTimer <= 0) {
        obstaclesRef.current.forEach(obs => {
            const dist = Math.hypot(nextX - obs.x, nextY - obs.y);
            const minDist = obs.collisionRadius + 15;
            if (dist < minDist) { const angle = Math.atan2(nextY - obs.y, nextX - obs.x); nextX += Math.cos(angle) * (minDist - dist); nextY += Math.sin(angle) * (minDist - dist); }
        });
    }
    if (arenaRectRef.current) { const ar = arenaRectRef.current; nextX = Math.max(ar.x + 20, Math.min(ar.x + ar.width - 20, nextX)); nextY = Math.max(ar.y + 20, Math.min(ar.y + ar.height - 20, nextY)); }
    p.x = Math.max(0, Math.min(WORLD_WIDTH, nextX));
    p.y = Math.max(0, Math.min(WORLD_HEIGHT, nextY));
    if (Math.abs(dx) > 0.01 || Math.abs(dy) > 0.01) { if (Math.abs(dx) > Math.abs(dy)) { p.direction = dx > 0 ? 2 : 1; } else { p.direction = dy > 0 ? 0 : 3; } p.animTimer += dt; if (p.animTimer > 0.08) { p.frameX = (p.frameX + 1) % 9; p.animTimer = 0; } p.isAttacking = false; } else { if (!p.isAttacking) p.frameX = 0; }
    p.weapons.forEach(w => { if (w.currentCooldown > 0) w.currentCooldown -= dt * 60; else { fireWeapon(w, p); w.currentCooldown = w.cooldown * p.stats.cooldownMult; } });
    for(const key in p.abilityCooldowns) { if(p.abilityCooldowns[key] > 0) p.abilityCooldowns[key] -= dt * 60; }
    if (p.intangibleTimer > 0) p.intangibleTimer -= dt;
    if (p.invulnerableTimer > 0) p.invulnerableTimer -= dt;
    if (p.madSquirrelTimer && p.madSquirrelTimer > 0) p.madSquirrelTimer -= dt;

    projectilesRef.current.forEach(proj => {
        proj.x += proj.vx * speedNormalizer; proj.y += proj.vy * speedNormalizer;
        proj.duration -= dt;
        if (proj.sprite === ASSETS.PROJECTILES.NUT) { proj.animTimer = (proj.animTimer || 0) + dt; if (proj.animTimer > 0.08) { proj.frameX = ((proj.frameX || 1) % 5) + 1; proj.animTimer = 0; } }
        if (proj.sprite === ASSETS.PROJECTILES.NUT || proj.isRolling) proj.rotation += 15 * dt; 
        if (proj.owner === EntityType.PLAYER) {
             enemiesRef.current.forEach(e => {
                 if (e.isDead) return;
                 const hitSize = proj.zoneRadius || 20;
                 if (Math.abs(e.x - proj.x) < (e.width/2 + hitSize/2) && Math.abs(e.y - proj.y) < (e.height/2 + hitSize/2)) {
                      e.hp -= proj.damage; spawnDamageNumber(e.x, e.y, proj.damage); spawnParticles(proj.x, proj.y, '#d6b88b', 3); sfx.play(SFX_TYPES.HIT_ENEMY);
                      if (!proj.pierce) proj.duration = 0;
                 }
             });
             obstaclesRef.current.forEach(obs => {
                if (obs.hp !== undefined) { const dist = Math.hypot(proj.x - obs.x, proj.y - obs.y); if (dist < obs.collisionRadius + 10) { obs.hp -= proj.damage; spawnDamageNumber(obs.x, obs.y - obs.height/2, proj.damage, false, undefined, '#78350f'); spawnParticles(proj.x, proj.y, '#3f6212', 4); if (!proj.pierce) proj.duration = 0; if (obs.hp <= 0) { spawnParticles(obs.x, obs.y, '#3f6212', 20); sfx.play(SFX_TYPES.EXPLOSION); } } }
             });
        } else if ((proj.owner === EntityType.ENEMY || proj.owner === EntityType.BOSS || proj.owner === EntityType.SUB_BOSS) && !godMode) {
             if (Math.abs(p.x - proj.x) < 25 && Math.abs(p.y - proj.y) < 25) { if (p.invulnerableTimer <= 0) { p.hp -= Math.max(1, proj.damage - p.stats.armor); p.invulnerableTimer = 0.5; triggerShake(3, 0.2); spawnDamageNumber(p.x, p.y, proj.damage, true, undefined, '#ff0000'); sfx.play(SFX_TYPES.HIT_PLAYER); } proj.duration = 0; }
        }
    });
    projectilesRef.current = projectilesRef.current.filter(p => p.duration > 0);
    obstaclesRef.current = obstaclesRef.current.filter(obs => obs.hp === undefined || obs.hp > 0);

    const raccoonLevel = p.passives.raccoonSquad;
    const crowLevel = p.passives.murderOfCrows;
    const orbitalTime = timeRef.current;
    const compDmgMult = p.companionDamageMult || 1.0;

    enemiesRef.current.forEach(e => {
        if (e.hp <= 0 && !e.isDead) {
            e.isDead = true; e.deathTimer = 0; spawnParticles(e.x, e.y, '#ffffff', 10); enemiesKilledRef.current++;
            if (e.isBoss) bossesKilledRef.current++;
            const xpValue = e.isBoss ? 1000 : (e.type === EntityType.SUB_BOSS ? 150 : 15);
            dropsRef.current.push({ id: Math.random().toString(), x: e.x, y: e.y, type: Math.random() < 0.1 ? EntityType.PEANUT : EntityType.XP_GEM, value: xpValue });
            if (e.isBoss || e.type === EntityType.SUB_BOSS) chestsRef.current.push({ id: `chest-${Date.now()}`, x: e.x, y: e.y, isOpened: false });
            if (e.isBoss && !isInfinite) { gameEndedRef.current = true; setTimeout(() => onGameOver({ peanuts: sessionPeanuts, enemiesKilled: enemiesKilledRef.current, bossesKilled: bossesKilledRef.current, duration: timeRef.current }, true), 1000); }
        }
        if (e.isDead) { e.deathTimer += dt; return; }
        if (e.status.confusedTimer > 0) e.status.confusedTimer -= dt;

        if (raccoonLevel > 0) {
            const racCount = Math.min(6, 2 + raccoonLevel); const racRadius = 70; const racSpeed = 2.5 * (compDmgMult > 1 ? 2 : 1);
            for (let i = 0; i < racCount; i++) {
                const angle = -orbitalTime * racSpeed + (i * Math.PI * 2 / racCount);
                const rx = p.x + Math.cos(angle) * racRadius; const ry = p.y + Math.sin(angle) * racRadius;
                if (Math.hypot(e.x - rx, e.y - ry) < 40 && e.status.bleedTimer <= 0) { e.status.bleedTimer = 3.0; e.status.bleedDamage = (p.weapons[0].damage * p.stats.damageMult) * 0.15 * compDmgMult; spawnDamageNumber(e.x, e.y, 0, false, "BLEED", "#e11d48"); }
            }
        }
        if (crowLevel > 0) {
            const crowCount = crowLevel; const crowRadius = 140; const crowSpeed = 2.0 * (compDmgMult > 1 ? 2 : 1);
            for (let i = 0; i < crowCount; i++) {
                const angle = orbitalTime * crowSpeed + (i * Math.PI * 2 / crowCount);
                const cx = p.x + Math.cos(angle) * crowRadius; const cy = p.y + Math.sin(angle) * crowRadius;
                if (Math.hypot(e.x - cx, e.y - cy) < 50) { const dmg = (p.weapons[0].damage * p.stats.damageMult) * 0.08 * compDmgMult; e.hp -= dmg; spawnDamageNumber(e.x, e.y, dmg, false, undefined, "#94a3b8"); const kAngle = Math.atan2(e.y - p.y, e.x - p.x); e.x += Math.cos(kAngle) * 40; e.y += Math.sin(kAngle) * 40; sfx.play(SFX_TYPES.HIT_ENEMY); }
            }
        }
        if (e.status.bleedTimer > 0) { e.status.bleedTimer -= dt; e.hp -= e.status.bleedDamage * dt * 2; }

        let targetX = p.x, targetY = p.y;
        if (e.status.confusedTimer > 0) {
            let closestOther = null, minDist = 2000;
            enemiesRef.current.forEach(other => { if (other !== e && !other.isDead) { const d = Math.hypot(other.x - e.x, other.y - e.y); if (d < minDist) { minDist = d; closestOther = other; } } });
            if (closestOther) { targetX = (closestOther as any).x; targetY = (closestOther as any).y; }
        }

        const angleToTarget = Math.atan2(targetY - e.y, targetX - e.x);
        const distToTarget = Math.hypot(targetX - e.x, targetY - e.y);

        if (e.attackTimer !== undefined) {
            const prevTimer = e.attackTimer; e.attackTimer -= dt;
            if (e.attackTimer <= 0) {
                if (distToTarget < 800) {
                    if (e.type === EntityType.BOSS) { e.attackTimer = 3.5; sfx.play(SFX_TYPES.EXPLOSION); } 
                    else if (e.isRanged) { projectilesRef.current.push({ id: `enemy-proj-${Math.random()}`, x: e.x, y: e.y, vx: Math.cos(angleToTarget) * 3.0, vy: Math.sin(angleToTarget) * 3.0, damage: e.damage, duration: 4, sprite: e.projectileType ? ASSETS.PROJECTILES[e.projectileType] : ASSETS.PROJECTILES.ROCK, rotation: angleToTarget, owner: EntityType.ENEMY }); sfx.play(SFX_TYPES.SHOOT); e.attackTimer = 3.0 + Math.random() * 2; }
                    else { e.attackTimer = distToTarget < 75 ? 2.0 : 0.1; }
                } else e.attackTimer = 0.5;
            }
            if (!e.isRanged && prevTimer > 1.5 && e.attackTimer <= 1.5 && distToTarget < 75) {
                if (e.status.confusedTimer > 0) {
                    enemiesRef.current.forEach(other => { if (other !== e && !other.isDead && Math.hypot(other.x - e.x, other.y - e.y) < 80) other.hp -= e.damage; });
                } else if (p.invulnerableTimer <= 0 && !godMode) { p.hp -= Math.max(1, e.damage - p.stats.armor); p.invulnerableTimer = 0.5; triggerShake(3, 0.2); spawnDamageNumber(p.x, p.y, e.damage, true); sfx.play(SFX_TYPES.HIT_PLAYER); }
            }
        }
        let moveSpeed = e.speed;
        if (e.isRanged && distToTarget < 250) moveSpeed = -e.speed * 0.5;
        else if (e.isRanged && distToTarget < 400) moveSpeed = 0;
        if (e.attackTimer !== undefined && e.attackTimer > 0) { if (!e.isRanged && e.attackTimer > 1.5) moveSpeed *= 0.1; else if (e.isRanged && e.attackTimer < 0.6) moveSpeed *= 0.1; }
        let nx = e.x + Math.cos(angleToTarget) * moveSpeed * speedNormalizer, ny = e.y + Math.sin(angleToTarget) * moveSpeed * speedNormalizer;
        obstaclesRef.current.forEach(obs => { const d = Math.hypot(nx - obs.x, ny - obs.y); const mD = obs.collisionRadius + 20; if (d < mD) { const pa = Math.atan2(ny - obs.y, nx - obs.x); nx += Math.cos(pa) * (mD - d); ny += Math.sin(pa) * (mD - d); } });
        e.x = Math.max(0, Math.min(WORLD_WIDTH, nx)); e.y = Math.max(0, Math.min(WORLD_HEIGHT, ny));
        const deg = angleToTarget * (180 / Math.PI);
        if ((!e.isRanged && e.attackTimer! > 1.0) || (e.isRanged && e.attackTimer! < 0.6)) { if (Math.abs(deg) < 45) e.frameY = 8; else if (Math.abs(deg) > 135) e.frameY = 7; else if (deg < -45) e.frameY = 9; else e.frameY = 6; } else { if (Math.abs(deg) < 45) e.frameY = 11; else if (Math.abs(deg) > 135) e.frameY = 9; else if (deg < -45) e.frameY = 8; else e.frameY = 10; }
        e.animTimer = (e.animTimer || 0) + dt; if (e.animTimer > 0.1) { e.frameX = (e.frameX + 1) % 9; e.animTimer = 0; }
    });

    enemiesRef.current = enemiesRef.current.filter(e => e.deathTimer < 1.0);
    dropsRef.current.forEach(d => {
        const dist = Math.hypot(p.x - d.x, p.y - d.y); const range = d.type === EntityType.XP_GEM ? p.stats.pickupRange * 0.4 : p.stats.pickupRange;
        if (dist < range) { const angle = Math.atan2(p.y - d.y, p.x - d.x); const pullSpeed = (20 + (range - dist) * 0.1) * speedNormalizer; d.x += Math.cos(angle) * pullSpeed; d.y += Math.sin(angle) * pullSpeed; }
        if (dist < 20) { if (d.type === EntityType.XP_GEM) { p.xp += (d.value * 1.25) * (1 + p.stats.luck * 0.2); if (p.xp >= p.nextLevelXp) { p.level++; p.xp -= p.nextLevelXp; p.nextLevelXp += 40 + (p.level * 15); sfx.play(SFX_TYPES.LEVEL_UP); onLevelUpWithState ? onLevelUpWithState(p.level, p) : onLevelUp(p.level); } } else { setSessionPeanuts(prev => prev + 1); } d.value = 0; }
    });
    dropsRef.current = dropsRef.current.filter(d => d.value > 0);
    damageNumbersRef.current.forEach(dn => { dn.life -= dt; dn.y -= dn.velocity * dt; });
    damageNumbersRef.current = damageNumbersRef.current.filter(d => d.life > 0);
    particlesRef.current.forEach(part => { part.x += part.vx * speedNormalizer; part.y += part.vy * speedNormalizer; part.life -= dt; });
    particlesRef.current = particlesRef.current.filter(p => p.life > 0);
    if (shakeRef.current.duration > 0) { shakeRef.current.duration -= dt; if (shakeRef.current.duration <= 0) shakeRef.current.intensity = 0; }
    hudUpdateTimerRef.current += dt;
    if (hudUpdateTimerRef.current > 0.1) {
        let bHp = 0, bMax = 1, isBossPresent = false; enemiesRef.current.forEach(e => { if (e.isBoss && !e.isDead) { bHp = e.hp; bMax = e.maxHp; isBossPresent = true; } });
        const newAbilityHud: Record<string, number> = {};
        for(const aid of saveData.equippedAbilities) { const config = ACTIVE_ABILITIES.find(a => a.id === aid); if(config) newAbilityHud[aid] = (p.abilityCooldowns[aid] || 0) / (config.baseCooldown * p.stats.cooldownMult); }
        setAbilityHud(newAbilityHud);
        setHudState({ hp: Math.ceil(p.hp), maxHp: Math.ceil(p.maxHp), level: p.level, xp: Math.floor(p.xp), nextLevelXp: Math.floor(p.nextLevelXp), time: Math.floor(timeRef.current), peanuts: sessionPeanuts, bossActive: isBossPresent, warning: warningRef.current, bossHp: bHp, bossMaxHp: bMax, objective: isBossPresent ? 'ELIMINATE THE ALPHA' : 'SURVIVE', timeLeft: Math.max(0, diffConf.duration - timeRef.current) });
        hudUpdateTimerRef.current = 0;
    }
    if (p.hp <= 0 && !gameEndedRef.current) { gameEndedRef.current = true; onGameOver({ peanuts: sessionPeanuts, enemiesKilled: enemiesKilledRef.current, bossesKilled: bossesKilledRef.current, duration: timeRef.current }, false); }
  }, [difficulty, stage, onGameOver, onLevelUp, saveData, onLevelUpWithState, sessionPeanuts, godMode, triggerAbility, spawnParticles, biome]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    const p = playerRef.current;
    if (canvas.width !== dimensions.width || canvas.height !== dimensions.height) { canvas.width = dimensions.width; canvas.height = dimensions.height; }
    let sX = 0, sY = 0; if (shakeRef.current.duration > 0) { sX = (Math.random() - 0.5) * shakeRef.current.intensity; sY = (Math.random() - 0.5) * shakeRef.current.intensity; }
    let tCX = Math.max(0, Math.min(p.x - dimensions.width / 2, WORLD_WIDTH - dimensions.width));
    let tCY = Math.max(0, Math.min(p.y - dimensions.height / 2, WORLD_HEIGHT - dimensions.height));
    ctx.fillStyle = biome.bgColor; ctx.fillRect(0, 0, dimensions.width, dimensions.height);
    ctx.save(); ctx.translate(-tCX + sX, -tCY + sY);
    ctx.strokeStyle = biome.gridColor; ctx.lineWidth = 1;
    for (let x = Math.floor(tCX / 200) * 200; x < tCX + dimensions.width + 200; x += 200) { ctx.beginPath(); ctx.moveTo(x, tCY); ctx.lineTo(x, tCY + dimensions.height); ctx.stroke(); }
    for (let y = Math.floor(tCY / 200) * 200; y < tCY + dimensions.height + 200; y += 200) { ctx.beginPath(); ctx.moveTo(tCX, y); ctx.lineTo(tCX + dimensions.width, y); ctx.stroke(); }
    const bgImg = imagesRef.current[ASSETS.ENV.GRASS_BACK];
    if (bgImg && bgImg.complete && (stageInfo.id === 'PARK' || stageInfo.id === 'FOREST')) { for (let c = Math.floor(tCX / bgConfig.renderSize); c < Math.floor((tCX + dimensions.width) / bgConfig.renderSize) + 1; c++) { for (let r = Math.floor(tCY / bgConfig.renderSize); r < Math.floor((tCY + dimensions.height) / bgConfig.renderSize) + 1; r++) { ctx.drawImage(bgImg, bgConfig.offsetX, bgConfig.offsetY, bgConfig.sourceSize, bgConfig.sourceSize, c * bgConfig.renderSize, r * bgConfig.renderSize, bgConfig.renderSize, bgConfig.renderSize); } } }
    const decoImg = imagesRef.current[ASSETS.ENV.GROUND_DECO];
    if (decoImg) decorationsRef.current.forEach(deco => { if (deco.x < tCX - 100 || deco.x > tCX + dimensions.width + 100 || deco.y < tCY - 100 || deco.y > tCY + dimensions.height + 100) return; ctx.drawImage(decoImg, (deco.frameX * DECO_CONFIG.strideX), (deco.frameY * DECO_CONFIG.strideY), DECO_CONFIG.sourceSize, DECO_CONFIG.sourceSize, Math.floor(deco.x - deco.size/2), Math.floor(deco.y - deco.size/2), deco.size, deco.size); });
    const renderList: RenderItem[] = [];
    particlesRef.current.forEach(part => { renderList.push({ type: 'PARTICLE', y: part.y, draw: (c) => { c.save(); c.globalAlpha = part.life / part.maxLife; c.fillStyle = part.color; c.fillRect(part.x - part.size/2, part.y - part.size/2, part.size, part.size); c.restore(); } }); });
    const orbitalTime = timeRef.current;
    if (p.passives.raccoonSquad > 0) {
        const count = Math.min(6, 2 + p.passives.raccoonSquad); const racImg = imagesRef.current[ASSETS.PROJECTILES.RACCOON];
        for (let i = 0; i < count; i++) {
            const ang = -orbitalTime * 2.5 + (i * Math.PI * 2 / count); const rx = p.x + Math.cos(ang) * 70; const ry = p.y + Math.sin(ang) * 70;
            renderList.push({ type: 'PASSIVE', y: ry, draw: (c) => { if (racImg) { const frameX = Math.floor(orbitalTime * 10) % 6; c.drawImage(racImg, frameX * 16, 3 * 16, 16, 16, rx - 6, ry - 6, 12, 12); } else { c.font = '16px Arial'; c.fillText('🦝', rx - 8, ry + 4); } } });
        }
    }
    if (p.passives.murderOfCrows > 0) {
        const count = p.passives.murderOfCrows; const crowImg = imagesRef.current[ASSETS.PROJECTILES.CROW];
        for (let i = 0; i < count; i++) {
            const ang = orbitalTime * 2.0 + (i * Math.PI * 2 / count); const cx = p.x + Math.cos(ang) * 140; const cy = p.y + Math.sin(ang) * 140;
            renderList.push({ type: 'PASSIVE', y: cy, draw: (c) => { if (crowImg) { const frameX = (Math.floor(orbitalTime * 12) % 7); c.drawImage(crowImg, frameX * 64, 1 * 64, 64, 64, cx - 36, cy - 36, 72, 72); } else { c.font = '24px Arial'; c.fillText('🐦‍⬛', cx - 12, cy + 8); } } });
        }
    }
    companionsRef.current.forEach(comp => { const ang = comp.angle + orbitalTime * comp.orbitSpeed; const cx = p.x + Math.cos(ang) * comp.orbitRadius; const cy = p.y + Math.sin(ang) * comp.orbitRadius; renderList.push({ type: 'COMPANION', y: cy, draw: (c) => { c.save(); c.font = '24px Arial'; c.shadowBlur = 10; c.shadowColor = 'cyan'; c.fillText(comp.icon, cx - 12, cy + 8); c.restore(); } }); });
    renderList.push({ type: 'PLAYER', y: p.y, draw: (c) => { c.fillStyle = 'rgba(0,0,0,0.4)'; c.beginPath(); c.ellipse(p.x, p.y + 20, 20, 10, 0, 0, Math.PI * 2); c.fill(); const img = imagesRef.current[character.sprite]; if (p.intangibleTimer > 0) c.globalAlpha = 0.5; if (img) { const row = p.isAttacking ? PLAYER_ATTACK_ROW_MAP[p.direction] : PLAYER_ROW_MAP[p.direction]; c.drawImage(img, p.frameX * TILE_SIZE, row * TILE_SIZE, TILE_SIZE, TILE_SIZE, Math.floor(p.x - 40), Math.floor(p.y - 60), 80, 80); } c.globalAlpha = 1.0; } });
    enemiesRef.current.forEach(e => {
        if (e.x < tCX - 300 || e.x > tCX + dimensions.width + 300 || e.y < tCY - 300 || e.y > tCY + dimensions.height + 300) return;
        renderList.push({ type: 'ENEMY', y: e.y, draw: (c) => { 
            c.save(); if (e.isDead) c.globalAlpha = Math.max(0, 1 - e.deathTimer); c.fillStyle = 'rgba(0,0,0,0.4)'; c.beginPath(); c.ellipse(e.x, e.y + e.height/3, e.width/3, e.height/8, 0, 0, Math.PI * 2); c.fill(); const img = imagesRef.current[e.sprite]; if (img) { const sinkY = e.isDead ? e.deathTimer * 40 : 0; c.drawImage(img, e.frameX * 64, e.frameY * 64, 64, 64, Math.floor(e.x - e.width/2), Math.floor(e.y - e.height/2 + sinkY), e.width, e.height); } 
            const dist = Math.hypot(p.x - e.x, p.y - e.y); const showHealth = !e.isDead && (e.hp < e.maxHp || dist < 180 || e.isBoss || e.type === EntityType.SUB_BOSS);
            if (showHealth) { const barW = e.isBoss ? 120 : (e.type === EntityType.SUB_BOSS ? 80 : 40); const barH = e.isBoss ? 8 : (e.type === EntityType.SUB_BOSS ? 6 : 4); const barY = e.y - e.height/2 - (e.isBoss ? 20 : 10); c.fillStyle = 'rgba(0,0,0,0.5)'; c.fillRect(Math.floor(e.x - barW/2), Math.floor(barY), barW, barH); const healthPerc = Math.max(0, e.hp / e.maxHp); c.fillStyle = healthPerc > 0.5 ? '#22c55e' : (healthPerc > 0.2 ? '#eab308' : '#ef4444'); c.fillRect(Math.floor(e.x - barW/2), Math.floor(barY), Math.floor(barW * healthPerc), barH); }
            if (e.status.confusedTimer > 0) { c.font = '20px Arial'; c.fillText('🌀', e.x - 10, e.y - e.height/2 - 20); }
            c.restore();
        } });
    });
    obstaclesRef.current.forEach(o => { if (o.x < tCX - 200 || o.x > tCX + dimensions.width + 200 || o.y < tCY - 200 || o.y > tCY + dimensions.height + 200) return; renderList.push({ type: 'OBSTACLE', y: o.y, draw: (c) => { const img = imagesRef.current[o.sprite]; if (img) c.drawImage(img, o.frameX * GROUND_SOURCE_SIZE, o.frameY * GROUND_SOURCE_SIZE, GROUND_SOURCE_SIZE, GROUND_SOURCE_SIZE, Math.floor(o.x - o.width/2), Math.floor(o.y - o.height * 0.8), o.width, o.height); if (o.hp !== undefined && o.maxHp !== undefined && o.hp < o.maxHp) { const barW = 60, barH = 5, barY = o.y - o.height * 0.8; c.fillStyle = 'rgba(0,0,0,0.5)'; c.fillRect(Math.floor(o.x - barW/2), Math.floor(barY), barW, barH); const healthPerc = Math.max(0, o.hp / o.maxHp); c.fillStyle = '#166534'; c.fillRect(Math.floor(o.x - barW/2), Math.floor(barY), Math.floor(barW * healthPerc), barH); } } }); });
    dropsRef.current.forEach(d => { renderList.push({ type: 'DROP', y: d.y, draw: (c) => { if (d.type === EntityType.XP_GEM) { const isLarge = d.value >= 150, isGiga = d.value >= 1000, gemY = d.y + Math.sin(Date.now() / 200) * 8; c.save(); c.shadowBlur = isGiga ? 25 : (isLarge ? 18 : 12); c.shadowColor = isGiga ? 'gold' : (isLarge ? '#ef4444' : 'cyan'); c.fillStyle = isGiga ? 'gold' : (isLarge ? '#ef4444' : 'cyan'); const size = isGiga ? 12 : (isLarge ? 9 : 7); c.beginPath(); c.moveTo(d.x, gemY - size); c.lineTo(d.x + size, gemY); c.lineTo(d.x, gemY + size); c.lineTo(d.x - size, gemY); c.closePath(); c.fill(); c.restore(); } else { c.font = '20px Arial'; c.fillText('🥜', d.x - 10, d.y + Math.sin(Date.now()/200)*5); } } }); });
    renderList.sort((a, b) => a.y - b.y); renderList.forEach(item => item.draw(ctx));
    projectilesRef.current.forEach(proj => { 
        const img = imagesRef.current[proj.sprite || ASSETS.PROJECTILES.NUT]; 
        if (img) { ctx.save(); ctx.translate(proj.x, proj.y); ctx.rotate(proj.rotation); if (proj.owner !== EntityType.PLAYER) { ctx.globalCompositeOperation = 'lighter'; ctx.shadowBlur = 25; if (proj.sprite === ASSETS.PROJECTILES.FIRE) ctx.shadowColor = '#ff4400'; else if (proj.sprite === ASSETS.PROJECTILES.ICE) ctx.shadowColor = '#00ffff'; else if (proj.sprite === ASSETS.PROJECTILES.KINETIC) ctx.shadowColor = '#ff00ff'; else ctx.shadowColor = '#ff0000'; ctx.beginPath(); ctx.arc(0, 0, 12, 0, Math.PI * 2); ctx.fillStyle = ctx.shadowColor; ctx.globalAlpha = 0.3; ctx.fill(); ctx.globalAlpha = 1.0; }
            const size = proj.zoneRadius || 32; if (proj.sprite === ASSETS.PROJECTILES.NUT) ctx.drawImage(img, (proj.frameX || 1) * 104, (proj.frameY || 0) * 70, 104, 70, -size/2, -size/2, size, size * (70/104)); else ctx.drawImage(img, -size/2, -size/2, size, size); ctx.restore(); 
        } 
    });
    damageNumbersRef.current.forEach(dn => { ctx.save(); ctx.globalAlpha = dn.life / dn.maxLife; ctx.fillStyle = dn.color || (dn.isCrit ? '#ef4444' : '#ffffff'); ctx.font = dn.isCrit ? 'bold 24px monospace' : '16px monospace'; ctx.strokeStyle = 'black'; ctx.lineWidth = 3; const txt = dn.text || Math.floor(dn.value).toString(); ctx.strokeText(txt, dn.x, dn.y); ctx.fillText(txt, dn.x, dn.y); ctx.restore(); });
    ctx.restore();
  }, [character, dimensions, bgConfig, biome, stageInfo]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.code, charKey = e.key?.toLowerCase(); keysRef.current.add(key); if (charKey) keysRef.current.add(charKey);
      if (gameState === GameState.PLAYING) {
        if ((key === 'KeyQ' || charKey === 'q') && saveData.equippedAbilities[0]) triggerAbility(saveData.equippedAbilities[0]);
        if ((key === 'KeyE' || charKey === 'e') && saveData.equippedAbilities[1]) triggerAbility(saveData.equippedAbilities[1]);
        if (key === 'Escape') onTogglePause();
      } else if (gameState === GameState.PAUSED && key === 'Escape') onTogglePause();
    };
    const handleKeyUp = (e: KeyboardEvent) => { keysRef.current.delete(e.code); if (e.key) keysRef.current.delete(e.key.toLowerCase()); };
    window.addEventListener('keydown', handleKeyDown); window.addEventListener('keyup', handleKeyUp); window.focus();
    return () => { window.removeEventListener('keydown', handleKeyDown); window.removeEventListener('keyup', handleKeyUp); };
  }, [gameState, saveData, onTogglePause, triggerAbility]);

  useEffect(() => {
    if (gameState !== GameState.PLAYING) return;
    let animationFrameId: number;
    const loop = (timestamp: number) => {
      const dt = Math.min((timestamp - lastTimeRef.current) / 1000, 0.1); lastTimeRef.current = timestamp; update(dt); draw();
      animationFrameId = requestAnimationFrame(loop);
    };
    lastTimeRef.current = performance.now(); animationFrameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [gameState, update, draw]);

  const tickerMsg = hudState.bossActive ? "THE ALPHA IS NEAR. ELIMINATE THE ALPHA." : "THE NUTPOCOLYPSE IS UPON US. SURVIVE AT ALL COSTS.";

  return (
    <div className="fixed inset-0 bg-black select-none overflow-hidden touch-none" style={{ touchAction: 'none' }}>
        <canvas ref={canvasRef} className="block w-full h-full object-cover" width={dimensions.width} height={dimensions.height} />
        <div className="absolute top-0 left-0 w-full h-8 bg-black/60 backdrop-blur-sm border-b border-orange-500/30 flex items-center px-4 overflow-hidden z-[70]">
          <div className="flex-shrink-0 text-[10px] font-black text-orange-400 mr-4 uppercase tracking-widest border-r border-orange-500/30 pr-4">STAGE {stage} - LVL {hudState.level}</div>
          <div className="flex-1 relative h-full overflow-hidden">
            <div className="absolute whitespace-nowrap animate-ticker text-[10px] font-bold text-white/80 h-full flex items-center">{tickerMsg} &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; {tickerMsg}</div>
          </div>
        </div>
        <div className="absolute top-8 left-0 w-full h-[calc(100%-2rem)] pointer-events-none flex flex-col justify-between">
            <div onClick={onTogglePause} className="w-full p-2 flex flex-col gap-1 pointer-events-auto cursor-pointer relative z-10">
                <div className="grid grid-cols-3 items-start">
                    <div className="flex items-start gap-2">
                        <div className="w-14 h-14 bg-gray-800 border-2 border-gray-600 rounded-lg overflow-hidden relative shadow-lg mt-2">
                            <img src={character.head} alt="Hero" className={`w-full h-full object-cover ${(character.id === 'peaches' || character.id === 'maxine') ? 'object-top' : ''}`} style={{ imageRendering: 'pixelated' }} />
                        </div>
                        <div className="flex flex-col gap-1 pt-2">
                            <div className="w-24 md:w-36 h-4 bg-gray-900 border border-gray-500 rounded relative overflow-hidden shadow-md">
                                <div className="h-full bg-gradient-to-r from-green-500 to-emerald-600 transition-all duration-300" style={{ width: `${(hudState.hp / hudState.maxHp) * 100}%` }} />
                                <div className="absolute inset-0 flex items-center justify-center text-[9px] font-black text-white z-10">{hudState.hp} / {hudState.maxHp}</div>
                            </div>
                            <div className="w-24 md:w-36 h-2 bg-gray-900 border border-gray-600 rounded relative overflow-hidden shadow-md">
                                <div className="h-full bg-orange-400 transition-all duration-300" style={{ width: `${(hudState.xp / hudState.nextLevelXp) * 100}%` }} />
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-col items-center mt-2">
                         <div className={`bg-black/50 backdrop-blur-md border rounded px-3 py-1 text-center min-w-[80px] ${hudState.bossActive ? 'border-red-500 animate-pulse' : 'border-gray-600'}`}>
                            <div className="text-xl font-mono font-black text-white leading-none tracking-widest">{Math.floor(hudState.time / 60)}:{(Math.floor(hudState.time) % 60).toString().padStart(2, '0')}</div>
                        </div>
                    </div>
                    <div className="flex justify-end pr-12 mt-2">
                         <div className="bg-black/50 backdrop-blur-md border border-gray-600 rounded px-2 py-1 flex items-center gap-1.5"><span className="text-sm font-bold text-yellow-400 font-mono">🥜 {hudState.peanuts}</span></div>
                    </div>
                </div>
            </div>
            {hudState.bossActive && (
                <div className="absolute top-24 left-1/2 -translate-x-1/2 w-full max-w-xl px-10 pointer-events-none">
                    <div className="flex justify-between items-end mb-1"><span className="text-red-500 font-black text-xs italic tracking-widest uppercase animate-pulse">ALPHA GOBLIN</span><span className="text-white font-mono text-[10px]">{Math.ceil(hudState.bossHp)} / {Math.ceil(hudState.bossMaxHp)}</span></div>
                    <div className="w-full h-3 bg-gray-900 border-2 border-red-900 rounded-sm overflow-hidden shadow-[0_0_15px_rgba(255,0,0,0.4)]">
                        <div className="h-full bg-gradient-to-r from-red-800 to-red-500 transition-all duration-300" style={{ width: `${(hudState.bossHp / hudState.bossMaxHp) * 100}%` }} />
                    </div>
                </div>
            )}
            {hudState.warning && (<div className="absolute top-1/4 left-0 w-full text-center pointer-events-none z-20"><h2 className="text-3xl md:text-5xl font-black text-red-500 animate-pulse tracking-tighter">{hudState.warning}</h2></div>)}
            <div className="w-full flex justify-between items-end pb-4 md:pb-8 px-2 md:px-8 pointer-events-auto">
                 <div className="w-32 h-32" /> 
                 <div className="flex gap-4">
                     {saveData.equippedAbilities.map((aid, idx) => {
                         const progress = abilityHud[aid] || 0; const ready = progress <= 0; const config = ACTIVE_ABILITIES.find(a => a.id === aid); if (!config) return null;
                         return (<button key={aid} className={`w-16 h-16 md:w-20 md:h-20 rounded-full border-4 relative overflow-hidden flex items-center justify-center shadow-xl ${ready ? 'border-white bg-gray-800' : 'border-gray-600 bg-gray-900 opacity-80'}`} onTouchStart={(e) => { e.preventDefault(); triggerAbility(aid); }} onMouseDown={(e) => { e.preventDefault(); triggerAbility(aid); }}><div className="text-3xl">{config.icon}</div>{!ready && (<div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white font-bold text-xs" style={{ height: `${progress * 100}%`, bottom: 0 }} />)}<div className="absolute -bottom-1 left-0 w-full text-[10px] text-center bg-black/80 font-bold text-gray-300">{idx === 0 ? 'Q' : 'E'}</div></button>)
                     })}
                 </div>
            </div>
        </div>
        <Joystick onMove={(a, f) => joystickRef.current = { angle: a, force: f }} />
    </div>
  );
};

export default GameEngine;
