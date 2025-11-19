
import { GameState, Player, Weapon, SquirrelCharacter, StageDuration } from './types';

export const CANVAS_WIDTH = window.innerWidth;
export const CANVAS_HEIGHT = window.innerHeight;

export const COLORS = {
  background: '#2d3748',
  player: '#ed8936', // Squirrel Orange (Default fallback)
  zombie: '#68d391',
  robot: '#a0aec0',
  alien: '#D53F8C', // Pinkish purple
  gem: '#B7791F', // Nut Brown
  text: '#ffffff',
  parkBg: '#2F855A', // Dark Green
  parkingBg: '#4A5568', // Asphalt Grey
  marsBg: '#742A2A', // Mars Red
};

export const BIOME_CONFIG = {
    PARK: {
        bgColor: COLORS.parkBg,
        obstacleEmoji: '🌳',
        bounds: 1200,
        obstacleCount: 20
    },
    PARKING_LOT: {
        bgColor: COLORS.parkingBg,
        obstacleEmoji: '🚗',
        bounds: 1500,
        obstacleCount: 30
    },
    MARS: {
        bgColor: COLORS.marsBg,
        obstacleEmoji: '🪨',
        bounds: 2000,
        obstacleCount: 40
    }
};

export const SQUIRREL_CHARACTERS: SquirrelCharacter[] = [
  {
    id: 'GREY',
    name: 'Eastern Grey',
    description: 'Balanced survivor. The classic choice.',
    hp: 100,
    speed: 4,
    color: '#718096', // Slate Grey
    emoji: '🐿️',
    radius: 16,
    filter: 'grayscale(100%) contrast(1.1)'
  },
  {
    id: 'RED',
    name: 'American Red',
    description: 'Fast and agile, but fragile.',
    hp: 70,
    speed: 5.5,
    color: '#F56565', // Red-400
    emoji: '🐿️',
    radius: 14,
    filter: 'sepia(1) saturate(4) hue-rotate(-45deg) contrast(1.2)'
  },
  {
    id: 'GIANT',
    name: 'Indian Giant',
    description: 'A massive tank. High HP, slower movement.',
    hp: 160,
    speed: 3,
    color: '#2D3748', // Dark Blue/Black
    emoji: '🐿️',
    radius: 22,
    filter: 'brightness(0.5) sepia(0.2) drop-shadow(0 0 2px black)'
  }
];

export const DEFAULT_WEAPONS: Weapon[] = [
  {
    type: 'NUT_THROW',
    level: 1,
    damage: 15,
    cooldown: 40, // Frames (60fps)
    cooldownTimer: 0,
    area: 8, // size
    speed: 8,
    amount: 1,
  },
];

export const INITIAL_PLAYER: Player = {
  id: 'player',
  x: 0, // Centered relative to camera usually, but here world coords
  y: 0,
  radius: 16,
  type: 'PLAYER',
  color: COLORS.player,
  hp: 100,
  maxHp: 100,
  xp: 0,
  level: 1,
  nextLevelXp: 100,
  speed: 4,
  weapons: DEFAULT_WEAPONS,
  facing: 'RIGHT',
  emoji: '🐿️',
  characterId: 'GREY',
};

export const INITIAL_GAME_STATE: GameState = {
  player: INITIAL_PLAYER,
  enemies: [],
  projectiles: [],
  drops: [],
  particles: [],
  texts: [],
  obstacles: [],
  score: 0,
  kills: 0,
  time: 0,
  wave: 1,
  bossWarningTimer: 0,
  biome: 'PARK',
  mapBounds: { minX: -1200, maxX: 1200, minY: -1200, maxY: 1200 }
};

// Upgrades
export const UPGRADE_POOL_IDS = [
  'BIGGER_NUTS',
  'FASTER_THROW',
  'MULTINUT',
  'CROW_AURA',
  'SPEED_BOOTS',
  'GARLIC_BREAD', // Healing
];

export const STAGE_CONFIGS: Record<StageDuration, { waveDuration: number }> = {
  STANDARD: {
    waveDuration: 45 // Seconds per wave
  },
  LONG: {
    waveDuration: 60
  },
  EPIC: {
    waveDuration: 90
  }
};
