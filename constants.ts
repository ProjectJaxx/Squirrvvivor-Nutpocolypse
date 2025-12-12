import { GameState, Player, Weapon, SquirrelCharacter, StageDuration, BaseUpgradeDef } from './types';

export const CANVAS_WIDTH = window.innerWidth;
export const CANVAS_HEIGHT = window.innerHeight;

// Game Logic Constants
export const GAME_WIN_TIME = 180 * 60; // 3 minutes in frames (180s * 60fps)

export const COLORS = {
  background: '#2d3748',
  player: '#ed8936', // Squirrel Orange (Default fallback)
  zombie: '#68d391', // Light Green
  robot: '#a0aec0', // Metal Grey
  alien: '#b83280', // Dark Pink
  gem: '#B7791F', // Nut Brown
  text: '#ffffff',
  parkBg: '#276749', // Deep Green
  parkingBg: '#2d3748', // Dark Asphalt
  marsBg: '#742a2a', // Deep Red
};

export const BIOME_CONFIG = {
    PARK: {
        bgColor: COLORS.parkBg,
        bounds: 1200,
        obstacleCount: 20
    },
    PARKING_LOT: {
        bgColor: COLORS.parkingBg,
        bounds: 1500,
        obstacleCount: 30
    },
    MARS: {
        bgColor: COLORS.marsBg,
        bounds: 2000,
        obstacleCount: 40
    }
};

export const SQUIRREL_CHARACTERS: SquirrelCharacter[] = [
  {
    id: 'GREY',
    name: 'Eastern Grey',
    description: 'Balanced stats. The classic bushy-tailed warrior.',
    hp: 100,
    speed: 5,
    color: '#A0AEC0', // Slate Grey Body
    secondaryColor: '#E2E8F0', // Light Grey Belly/Tail tip
    emoji: '🐿️',
    radius: 16,
    filter: 'grayscale(100%) brightness(1.1)', 
    activeAbility: {
      type: 'NUT_BARRAGE',
      name: 'Nut Barrage',
      cooldown: 900, 
      cooldownTimer: 0,
      duration: 180, 
      activeTimer: 0
    }
  },
  {
    id: 'RED',
    name: 'American Red',
    description: 'Fast and agile. High stamina regeneration.',
    hp: 70,
    speed: 6.5,
    color: '#C53030', // Red Body
    secondaryColor: '#FC8181', // Pinkish/Orange belly
    emoji: '🐿️',
    radius: 14,
    filter: 'hue-rotate(-30deg) saturate(150%)', 
    activeAbility: {
      type: 'NUT_BARRAGE',
      name: 'Nut Barrage',
      cooldown: 800,
      cooldownTimer: 0,
      duration: 180,
      activeTimer: 0
    }
  },
  {
    id: 'GIANT',
    name: 'Indian Giant',
    description: 'A massive tank. Slower, but knocks enemies back.',
    hp: 160,
    speed: 4,
    color: '#3E2723', // Dark Brown
    secondaryColor: '#5D4037', // Light Brown
    emoji: '🐿️',
    radius: 24,
    filter: 'sepia(0.5) brightness(0.7)', 
    activeAbility: {
      type: 'NUT_BARRAGE',
      name: 'Nut Barrage',
      cooldown: 1000,
      cooldownTimer: 0,
      duration: 240,
      activeTimer: 0
    }
  }
];

export const DEFAULT_WEAPONS: Weapon[] = [
  {
    type: 'NUT_THROW',
    level: 1,
    damage: 15,
    cooldown: 40, // Frames (60fps)
    cooldownTimer: 0,
    area: 5, // projectile radius
    speed: 8,
    amount: 1,
  },
];

export const INITIAL_PLAYER: Player = {
  id: 'player',
  x: 0,
  y: 0,
  radius: 16,
  type: 'PLAYER',
  color: COLORS.player,
  hp: 100,
  maxHp: 100,
  xp: 0,
  level: 1,
  nextLevelXp: 100,
  speed: 5,
  velocity: { x: 0, y: 0 },
  acceleration: 0.8,
  friction: 0.88,
  magnetRadius: 150,
  weapons: DEFAULT_WEAPONS,
  activeAbility: {
    type: 'NUT_BARRAGE',
    name: 'Nut Barrage',
    cooldown: 900,
    cooldownTimer: 0,
    duration: 180,
    activeTimer: 0
  },
  facing: 'RIGHT',
  rotation: 0,
  emoji: '🐿️',
  characterId: 'GREY',
  secondaryColor: '#E2E8F0',
  stamina: 100,
  maxStamina: 100,
  dashCooldown: 0,
  isDashing: false,
  dashVector: { x: 0, y: 0 },
  invincibleTimer: 0,
  animationState: 'IDLE',
  animationFrame: 0,
  frameTimer: 0,
  tailWagOffset: 0,
  maxCompanions: 0,
  revives: 0
};

export const INITIAL_GAME_STATE: GameState = {
  player: INITIAL_PLAYER,
  enemies: [],
  companions: [],
  projectiles: [],
  drops: [],
  particles: [],
  texts: [],
  obstacles: [],
  score: 0,
  kills: 0,
  collectedNuts: 0,
  time: 0,
  wave: 1,
  bossWarningTimer: 0,
  biome: 'PARK',
  mapBounds: { minX: -1200, maxX: 1200, minY: -1200, maxY: 1200 },
  shake: { intensity: 0, duration: 0 },
};

export const STAGE_CONFIGS: Record<StageDuration, { waveDuration: number }> = {
  STANDARD: {
    waveDuration: 50 // 50 Seconds per wave
  },
  LONG: {
    waveDuration: 65 // Slightly longer if user picks "Long"
  },
  EPIC: {
    waveDuration: 80
  }
};

export const BASE_UPGRADES_LIST: BaseUpgradeDef[] = [
    {
        id: 'BASE_HP',
        name: 'Thick Fur',
        description: 'Permanently increases max Health.',
        icon: '❤️',
        baseCost: 50,
        costMultiplier: 1.5,
        maxLevel: 10,
        statKey: 'hp',
        increment: 10
    },
    {
        id: 'BASE_SPEED',
        name: 'Quick Paws',
        description: 'Permanently increases Movement Speed.',
        icon: '👟',
        baseCost: 80,
        costMultiplier: 1.6,
        maxLevel: 5,
        statKey: 'speed',
        increment: 0.4
    },
    {
        id: 'BASE_MAGNET',
        name: 'Nut Magnet',
        description: 'Permanently increases Loot Pickup Radius.',
        icon: '🧲',
        baseCost: 60,
        costMultiplier: 1.4,
        maxLevel: 10,
        statKey: 'magnetRadius',
        increment: 25
    },
    {
        id: 'BASE_DMG',
        name: 'Sharp Teeth',
        description: 'Increases all damage by 10% per level.',
        icon: '🦷',
        baseCost: 100,
        costMultiplier: 1.8,
        maxLevel: 5,
        statKey: 'damage', 
        increment: 0.1 // 10%
    },
    {
        id: 'BASE_COOLDOWN',
        name: 'Hyper Metabolism',
        description: 'Reduces weapon cooldowns by 5% per level.',
        icon: '⚡',
        baseCost: 150,
        costMultiplier: 1.7,
        maxLevel: 5,
        statKey: 'cooldown',
        increment: 0.05
    },
    {
        id: 'BASE_ABILITY',
        name: 'Hidden Technique',
        description: 'Improves Special Attack (Spacebar). -10% Cooldown, +10% Duration.',
        icon: '✨',
        baseCost: 250,
        costMultiplier: 2.0,
        maxLevel: 5,
        statKey: 'ability',
        increment: 0.1 // 10% improvement
    },
    {
        id: 'BASE_SCURRY',
        name: 'Scurry',
        description: 'Calls a loyal squirrel companion to fight by your side.',
        icon: '🐿️',
        baseCost: 1000,
        costMultiplier: 2.5,
        maxLevel: 4,
        statKey: 'maxCompanions',
        increment: 1
    },
    {
        id: 'BASE_REVIVE',
        name: 'Nine Lives',
        description: 'Grants a revive on death (Max 3).',
        icon: '✝️',
        baseCost: 1000,
        costMultiplier: 2.5,
        maxLevel: 3,
        statKey: 'revive',
        increment: 1
    }
];
