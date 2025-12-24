
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
  OBSTACLE = 'OBSTACLE',
  DEFENSE_OBJECT = 'DEFENSE_OBJECT'
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
    armor: number;
    knockbackMult?: number;
    bleedChance?: number;
    slowChance?: number;
    extraProjectiles?: number;
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
  direction: number;
  frameX: number;
  animTimer: number;
  invulnerableTimer: number;
  intangibleTimer: number;
  isAttacking?: boolean;
  weapons: Weapon[];
  stats: {
    pickupRange: number;
    damageMult: number;
    cooldownMult: number;
    projectileCount: number;
    luck: number;
    lifeSteal: number;
    knockback: number;
    armor: number;
    explodeChance: number;
    critChance: number;
  };
  passives: {
    raccoonSquad: number;
    murderOfCrows: number;
    scurryAura: number;
  };
  activeCompanions: CompanionType[];
  abilityCooldowns: Record<string, number>;
  // Combat Buffs
  companionDamageMult?: number;
  madSquirrelTimer?: number;
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
  projectileRow?: number;
  slowFactor?: number;
  bonusProjectiles?: number;
  isRolling?: boolean;
  isExplosive?: boolean;
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
  frameX: number;
  frameY: number;
  animTimer: number;
  isDead: boolean;
  deathTimer: number;
  isRanged?: boolean;
  attackTimer?: number;
  projectileType?: 'ROCK' | 'FIRE' | 'ICE' | 'KINETIC' | 'NUT';
  status: {
    frozenTimer: number;
    burnTimer: number;
    burnDamage?: number;
    sapTimer?: number;
    sapSlow?: number;
    bleedTimer: number;
    bleedDamage: number;
    confusedTimer: number;
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
  pierce?: number;
  owner: EntityType.PLAYER | EntityType.ENEMY | EntityType.SCURRY_MINION | EntityType.BOSS | EntityType.SUB_BOSS;
  isOrbiting?: boolean;
  orbitRadius?: number;
  orbitAngle?: number;
  orbitSpeed?: number;
  isBoomerang?: boolean;
  returnState?: 'OUT' | 'RETURN';
  isExplosive?: boolean;
  explosionRadius?: number;
  isZone?: boolean;
  zoneRadius?: number;
  slowFactor?: number;
  isExploding?: boolean;
  frameX?: number;
  frameY?: number;
  maxFrames?: number;
  animTimer?: number;
  trailColor?: string;
  isRolling?: boolean;
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
  variant: 'TREE' | 'ROCK' | 'FENCE' | 'FLOWER' | 'PLANT' | 'CONSOLE';
  x: number;
  y: number;
  width: number;
  height: number;
  sprite: string;
  frameX: number;
  frameY: number;
  collisionRadius: number;
  rotation?: number;
  hasCollision: boolean;
  hp?: number;
  maxHp?: number;
}

export interface Upgrade {
  id: string;
  name: string;
  description: string;
  rarity: 'Common' | 'Rare' | 'Epic' | 'Legendary';
  icon: string;
  condition?: (player: PlayerState) => boolean;
  apply: (player: PlayerState) => void;
}

export enum CompanionType {
  RACER = 'RACER_COMP',
  DIRT = 'DIRT_COMP',
  HANGO = 'HANGO_COMP',
  MR_PEACHES = 'PEACHES_COMP',
  MAXINE = 'MAXINE_COMP'
}

export enum AbilityId {
  BARRAGE = 'barrage',
  TORNADO = 'tornado',
  SQUIRRLEY = 'squirrley',
  PEANUT_BRITTLE = 'peanut_brittle',
  DRAY_DAY = 'dray_day',
  VOLTDOM = 'voltdom',
  WALNUT_ROLLOUT = 'walnut_rollout',
  TWIGNADO = 'twignado',
  CUTENESS_OVERLOAD = 'cuteness_overload',
  MAD_SQUIRREL = 'mad_squirrel'
}

export interface ActiveAbilityConfig {
  id: AbilityId;
  name: string;
  icon: string;
  description: string;
  baseCost: number;
  baseCooldown: number;
  baseDuration?: number;
  baseDamage?: number;
  color: string;
}

export interface SaveData {
  playerName: string;
  peanuts: number;
  unlockedCharacters: string[];
  unlockedCompanions: CompanionType[];
  upgrades: Record<string, number>;
  abilityLevels: Record<string, number>;
  companionLevels: Record<string, number>; 
  equippedAbilities: string[];
  equippedCompanions: string[];
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
