
export enum GameState {
  MENU = 'MENU',
  PLAYING = 'PLAYING',
  PAUSED = 'PAUSED',
  LEVEL_UP = 'LEVEL_UP',
  GAME_OVER = 'GAME_OVER',
  VICTORY = 'VICTORY',
  ARMORY = 'ARMORY',
  CHAR_SELECT = 'CHAR_SELECT',
  SETTINGS = 'SETTINGS'
}

export enum Difficulty {
  EASY = 'EASY',
  HARD = 'HARD',
  HARDEST = 'HARDEST',
  INFINITE = 'INFINITE'
}

export enum EntityType {
  PLAYER = 'PLAYER',
  ENEMY = 'ENEMY',
  PROJECTILE = 'PROJECTILE',
  XP_GEM = 'XP_GEM',
  PEANUT = 'PEANUT',
  CHEST = 'CHEST',
  SUB_BOSS = 'SUB_BOSS',
  BOSS = 'BOSS',
  SCURRY_MINION = 'SCURRY_MINION',
  OBSTACLE = 'OBSTACLE'
}

export interface Character {
  id: string;
  name: string;
  sprite: string;
  head: string;
  baseStats: {
    speed: number;
    hp: number;
    damage: number;
  };
}

export interface PlayerState {
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  xp: number;
  level: number;
  nextLevelXp: number;
  speed: number;
  direction: number; // 0: Down, 1: Left, 2: Right, 3: Up
  frameX: number; // Current animation frame (column)
  animTimer: number; // Timer for animation
  invulnerableTimer: number;
  intangibleTimer: number; // New: Time remaining for intangibility (Squirrley)
  isAttacking?: boolean; // New: Tracks if shooting animation is playing
  weapons: Weapon[];
  stats: {
    pickupRange: number;
    damageMult: number;
    cooldownMult: number;
    projectileCount: number;
    luck: number;
    lifeSteal: number; // 0-1 chance to heal on kill
    knockback: number; // pixels to push enemies
    armor: number; // Flat damage reduction
    explodeChance: number; // 0-1 chance enemy explodes on death
  };
  passives: {
    raccoonSquad: number;
    murderOfCrows: number;
  };
  activeCompanions: CompanionType[];
  abilityCooldowns: Record<string, number>; // AbilityID -> Current Cooldown
}

export interface Weapon {
  id: string;
  name: string;
  cooldown: number;
  currentCooldown: number;
  damage: number;
  speed: number;
  duration: number;
  area: number;
  projectileSprite?: string;
  projectileRow?: number; // New: Which row of the spritesheet to use
  slowFactor?: number; // New for Sap Puddle
  bonusProjectiles?: number; // New for weapon specific multishot
}

export interface Enemy {
  id: string;
  x: number;
  y: number;
  type: EntityType;
  sprite: string;
  hp: number;
  maxHp: number;
  damage: number;
  speed: number;
  width: number;
  height: number;
  isBoss: boolean;
  frameX: number; // For animation
  frameY: number; // Row
  animTimer: number; // New: For animation timing
  isDead: boolean; // Tracking death state
  deathTimer: number; // Tracking death animation time
  isRanged?: boolean;
  attackTimer?: number; // Cooldown for attacks
  projectileType?: 'ROCK' | 'FIRE' | 'ICE' | 'KINETIC'; // New: Determines projectile visual
  // Status Effects
  status: {
    frozenTimer: number; // If > 0, enemy is slowed
    burnTimer: number; // If > 0, enemy takes DoT
    burnDamage?: number; // Scalable burn damage per second
    sapTimer?: number; // New: If > 0, enemy is slowed by Sap
    sapSlow?: number; // New: % slow amount
    bleedTimer: number;
    bleedDamage: number;
  };
}

export interface Projectile {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  duration: number;
  sprite?: string;
  rotation: number;
  pierce?: number; // How many enemies it can hit
  owner: EntityType.PLAYER | EntityType.ENEMY | EntityType.SCURRY_MINION | EntityType.BOSS | EntityType.SUB_BOSS;
  
  // New Mechanics
  isOrbiting?: boolean;
  orbitRadius?: number;
  orbitAngle?: number;
  orbitSpeed?: number;
  
  isBoomerang?: boolean;
  returnState?: 'OUT' | 'RETURN';
  
  isExplosive?: boolean;
  explosionRadius?: number;

  isZone?: boolean; // New for puddles
  zoneRadius?: number; // New
  slowFactor?: number; // New

  // Animation
  isExploding?: boolean; // New: Tracks if in explosion state
  frameX?: number;
  frameY?: number; // Added to support multi-row sheets
  maxFrames?: number;
  animTimer?: number;
  
  trailColor?: string; // New: Color for particle trail
}

export interface Drop {
  id: string;
  x: number;
  y: number;
  type: EntityType.XP_GEM | EntityType.PEANUT;
  value: number;
  sprite?: string;
}

export interface Chest {
  id: string;
  x: number;
  y: number;
  isOpened: boolean;
}

export interface Particle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export interface Obstacle {
  id: string;
  variant: 'TREE' | 'ROCK';
  x: number;
  y: number;
  width: number;
  height: number;
  sprite: string;
  frameX: number; // For variations in strip
  frameY: number; // Row in strip
  collisionRadius: number;
  rotation?: number; // Added for rocks
}

export interface Upgrade {
  id: string;
  name: string;
  description: string;
  rarity: 'Common' | 'Rare' | 'Epic' | 'Legendary';
  icon: string;
  condition?: (player: PlayerState) => boolean; // New: Logic to determine if upgrade appears
  apply: (player: PlayerState) => void;
}

export enum CompanionType {
  SCURRY_GRUNT = 'SCURRY_GRUNT',
  NURSE = 'NURSE',
  SOLDIER = 'SOLDIER',
  SCOUT = 'SCOUT',
  SNIPER = 'SNIPER',
  ARCTIC = 'ARCTIC',
  DESERT = 'DESERT'
}

export enum AbilityId {
  BARRAGE = 'barrage',
  TORNADO = 'tornado',
  RANDOM_SHOWER = 'random_shower',
  SCURRY_ULTIMATE = 'scurry_ultimate',
  ICE_SHOWER = 'ice_shower',
  BURNING_STORM = 'burning_storm',
  
  // New
  MURDER_OF_CROWS = 'murder_of_crows',
  TWIGARANG = 'twigarang',
  PISTACHIO_BOOM = 'pistachio_boom',
  
  // Latest
  SQUIRRLEY = 'squirrley'
}

export interface ActiveAbilityConfig {
  id: AbilityId;
  name: string;
  icon: string;
  description: string;
  baseCost: number;
  baseCooldown: number;
  baseDuration?: number; // For tornado, storms
  baseDamage?: number;
  color: string;
}

export interface SaveData {
  playerName: string;
  peanuts: number;
  unlockedCharacters: string[];
  unlockedCompanions: CompanionType[];
  upgrades: Record<string, number>; // UpgradeID -> Level
  abilityLevels: Record<string, number>; // AbilityID -> Level
  equippedAbilities: string[]; // List of AbilityIDs (Max 2)
  maxStageReached: number;
}

export interface GameSettings {
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
  damageNumbers: boolean;
  screenShake: boolean;
  showTooltips: boolean;
}

export interface GameResults {
  peanuts: number;
  enemiesKilled: number;
  bossesKilled: number;
  duration: number;
}
