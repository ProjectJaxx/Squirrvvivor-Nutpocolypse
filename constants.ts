
import { GameState, Player, Weapon, SquirrelCharacter, StageDuration, BaseUpgradeDef } from './types';

export const CANVAS_WIDTH = window.innerWidth;
export const CANVAS_HEIGHT = window.innerHeight;

// Game Logic Constants
export const GAME_WIN_TIME = 180 * 60; // 3 minutes in frames (180s * 60fps)

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
    description: 'Balanced survivor. The classic choice.',
    hp: 100,
    speed: 4,
    color: '#A0AEC0', // Slate Grey
    emoji: '🐿️',
    radius: 16,
    filter: 'grayscale(100%) brightness(1.2) drop-shadow(0 0 2px rgba(255,255,255,0.3))',
    activeAbility: {
      type: 'NUT_BARRAGE',
      name: 'Nut Barrage',
      cooldown: 900, // 15 seconds
      cooldownTimer: 0,
      duration: 180, // 3 seconds
      activeTimer: 0
    }
  },
  {
    id: 'RED',
    name: 'American Red',
    description: 'Fast and agile, but fragile.',
    hp: 70,
    speed: 5.5,
    color: '#E53E3E', // Red-600
    emoji: '🐿️',
    radius: 14,
    filter: 'sepia(1) saturate(500%) hue-rotate(-40deg) brightness(1.1) contrast(1.1) drop-shadow(0 0 2px rgba(229,62,62,0.5))',
    activeAbility: {
      type: 'NUT_BARRAGE',
      name: 'Nut Barrage',
      cooldown: 800, // Slightly faster cooldown for Red
      cooldownTimer: 0,
      duration: 180,
      activeTimer: 0
    }
  },
  {
    id: 'GIANT',
    name: 'Indian Giant',
    description: 'A massive tank. High HP, slower movement.',
    hp: 160,
    speed: 3,
    color: '#3E2723', // Dark Brown/Black
    emoji: '🐿️',
    radius: 22,
    filter: 'grayscale(60%) brightness(0.6) sepia(40%) contrast(1.3) drop-shadow(0 0 3px rgba(0,0,0,0.5))',
    activeAbility: {
      type: 'NUT_BARRAGE',
      name: 'Nut Barrage',
      cooldown: 1000, // Slower cooldown
      cooldownTimer: 0,
      duration: 240, // Longer duration
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
  magnetRadius: 150,
  weapons: DEFAULT_WEAPONS,
  activeAbility: {
    type: 'NUT_BARRAGE',
    name: 'Nut Barrage',
    cooldown: 900, // 15 seconds
    cooldownTimer: 0,
    duration: 180, // 3 seconds
    activeTimer: 0
  },
  facing: 'RIGHT',
  rotation: 0,
  emoji: '🐿️',
  characterId: 'GREY',
  stamina: 100,
  maxStamina: 100,
  isSprinting: false,
  invincibleTimer: 0,
  animationState: 'IDLE',
  animationFrame: 0,
  frameTimer: 0,
  maxCompanions: 0,
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
        description: 'Permanently increases base Damage (not implemented fully in dmg calcs yet but conceptually here).',
        icon: '🦷',
        baseCost: 100,
        costMultiplier: 1.8,
        maxLevel: 5,
        statKey: 'damage', // Placeholder, damage logic is in weapons usually
        increment: 1 
    },
    {
        id: 'BASE_SCURRY',
        name: 'Scurry',
        description: 'Calls a loyal squirrel companion to fight by your side.',
        icon: '🐿️',
        baseCost: 500,
        costMultiplier: 2.0,
        maxLevel: 4,
        statKey: 'maxCompanions',
        increment: 1
    }
];

export interface SpriteSheetDefinition {
    columns: number;
    frameWidth: number;
    frameHeight: number;
    animations: {
        [key: string]: {
            frames: number[]; // Array of frame indices (0-based)
            speed: number; // frames per animation frame
        };
    };
}

// Assuming LPC style sheets (64x64 frames, 13 columns)
// Row 11 (index 143 start) is usually "Walk Right"
const LPC_COLS = 13;
const WALK_RIGHT_ROW_START = 11 * LPC_COLS; 

export const SPRITE_DEFS: { [key: string]: SpriteSheetDefinition } = {
    SQUIRREL: {
        columns: 5, // 5 frames in a horizontal strip (Standard Squirrel)
        frameWidth: 32,
        frameHeight: 32,
        animations: {
            IDLE: { frames: [0, 4], speed: 30 }, 
            WALKING: { frames: [1, 2, 3], speed: 6 },
        }
    },
    ZOMBIE: {
        columns: 13, // LPC Layout
        frameWidth: 64,
        frameHeight: 64,
        animations: {
            // Use frames 1-8 of the walking row (indices 144-151)
            WALKING: { frames: [144, 145, 146, 147, 148, 149, 150, 151], speed: 6 },
        }
    },
    SWARM_ZOMBIE: {
        columns: 13, // LPC Layout
        frameWidth: 64,
        frameHeight: 64,
        animations: {
            WALKING: { frames: [144, 145, 146, 147, 148, 149, 150, 151], speed: 6 },
        }
    },
    ROBOT: {
        columns: 13, // LPC Layout
        frameWidth: 64,
        frameHeight: 64,
        animations: {
            WALKING: { frames: [144, 145, 146, 147, 148, 149, 150, 151], speed: 6 },
        }
    },
    ALIEN: {
        columns: 13, // LPC Layout
        frameWidth: 64,
        frameHeight: 64,
        animations: {
            WALKING: { frames: [144, 145, 146, 147, 148, 149, 150, 151], speed: 6 },
        }
    }
};
