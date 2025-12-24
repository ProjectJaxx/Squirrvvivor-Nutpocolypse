
import { Character, CompanionType, Upgrade, EntityType, PlayerState, Difficulty, ActiveAbilityConfig, AbilityId } from './types';

export const GITHUB_BASE_URL = 'https://raw.githubusercontent.com/ProjectJaxx/SquirvivorStable/main/spritesheets';
export const GITHUB_AUDIO_URL = 'https://raw.githubusercontent.com/ProjectJaxx/SquirvivorStable/main/audio';

export const WORLD_WIDTH = 4000;
export const WORLD_HEIGHT = 4000;

export const DIFFICULTY_SETTINGS = {
  [Difficulty.EASY]: { 
    label: 'Easy', 
    hpMult: 0.7, 
    dmgMult: 0.7, 
    spawnIntervalMult: 1.2, 
    duration: 180, // 3 minutes
    color: 'text-green-400',
    description: 'A walk in the park. 3 minute survival.'
  },
  [Difficulty.HARD]: { 
    label: 'Hard', 
    hpMult: 1.0, 
    dmgMult: 1.0, 
    spawnIntervalMult: 1.0, 
    duration: 300, // 5 minutes
    color: 'text-yellow-400',
    description: 'The standard challenge. 5 minute survival.'
  },
  [Difficulty.HARDEST]: { 
    label: 'Nutpocalypse', 
    hpMult: 1.5, 
    dmgMult: 1.5, 
    spawnIntervalMult: 0.7, 
    duration: 600, // 10 minutes
    color: 'text-red-600',
    description: 'Extreme danger. 10 minute survival.'
  },
  [Difficulty.INFINITE]: { 
    label: 'Infinite', 
    hpMult: 1.0, 
    dmgMult: 1.0, 
    spawnIntervalMult: 1.0, 
    duration: Infinity, 
    color: 'text-purple-500',
    description: 'Survive as long as you can. Difficulty scales forever.'
  }
};

export const TOTAL_STAGES = 55;

export const STAGE_SETS = [
  { range: [1, 10], name: "The Park", description: "Where it all began. Squirrel territory.", id: 'PARK' },
  { range: [11, 20], name: "Ruined City", description: "Concrete jungle filled with dangers.", id: 'CITY' },
  { range: [21, 30], name: "Tropical Island", description: "Sun, sand, and survival.", id: 'BEACH' },
  { range: [31, 40], name: "Planet Mars", description: "Red dust and alien rocks.", id: 'MARS' },
  { range: [41, 55], name: "Alien Mothership", description: "The final frontier. End the invasion.", id: 'SHIP' }
];

export const BIOME_CONFIG = {
  PARK: {
    bgColor: '#656b53',
    gridColor: 'rgba(0,0,0,0.1)',
    particleColor: '#a3e635',
    drawFunc: 'DRAW_GRASS'
  },
  CITY: {
    bgColor: '#374151',
    gridColor: '#4b5563',
    particleColor: '#9ca3af',
    drawFunc: 'DRAW_CITY'
  },
  BEACH: {
    bgColor: '#fcd34d',
    gridColor: '#fbbf24',
    particleColor: '#38bdf8',
    drawFunc: 'DRAW_SAND'
  },
  MARS: {
    bgColor: '#7f1d1d',
    gridColor: '#991b1b',
    particleColor: '#ef4444',
    drawFunc: 'DRAW_CRATERS'
  },
  SHIP: {
    bgColor: '#1e1b4b',
    gridColor: '#4f46e5',
    particleColor: '#00ff00',
    drawFunc: 'DRAW_TECH'
  }
};

export const getStageInfo = (stage: number) => {
  const set = STAGE_SETS.find(s => stage >= s.range[0] && stage <= s.range[1]);
  return set || STAGE_SETS[0];
};

export const ASSETS = {
  CHARACTERS: {
    RACER: `${GITHUB_BASE_URL}/racer.png`,
    HANGO: `${GITHUB_BASE_URL}/hango.png`,
    DIRT: `${GITHUB_BASE_URL}/dirt.png`,
    RACER_HEAD: `${GITHUB_BASE_URL}/racerhead.png`,
    HANGO_HEAD: `${GITHUB_BASE_URL}/hangohead.png`,
    DIRT_HEAD: `${GITHUB_BASE_URL}/dirthead.png`,
  },
  ENEMIES: {
    GOBLIN: `${GITHUB_BASE_URL}/goblin1-1.png`,
    GOBLIN_2: `${GITHUB_BASE_URL}/goblin1-2.png`,
    GOBLIN_3: `${GITHUB_BASE_URL}/goblin1-3.png`,
    GOBLIN_4: `${GITHUB_BASE_URL}/goblin1-4.png`,
    GOBLIN_5: `${GITHUB_BASE_URL}/goblin1-5.png`,
    GOBLIN_RANGED: `${GITHUB_BASE_URL}/goblinR1-1.png`,
    GOBLIN_RANGED_2: `${GITHUB_BASE_URL}/goblinR1-2.png`,
    GOBLIN_SUB_BOSS: `${GITHUB_BASE_URL}/goblinSB1-2.png`,
    GOBLIN_BOSS: `${GITHUB_BASE_URL}/goblinSB1-2.png`,
  },
  ENV: {
    TREES: `${GITHUB_BASE_URL}/TreesSpriteStrip1-2.png`,
    ROCK: `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAQAAAAAYLlVAAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAAAAmJLR0QA/4ePzL8AAAAJcEhZcwAACxMAAAsTAQCanBgAAAAHdElNRQfpAxwXKDYt45nOAAABm0lEQVRo3u2av0oDQRCHv931EAsbwdRWAkEsvIIPYGMlPoGItZ34Cj6ChWARK30CCxHsxCKYRCRgC7k/y2GSe7ncLne7m9v5C8Ewu/PbnZ3d/WOYw/S9rWq251o3tdK6tYw6p+1MY+8oG3XOfpS+1qBfOqK5hHDT30UDeYFz330Kfa2Afe8oG3XOcJgA985A1vecsb3vCGAwA+8JE3vOUtb3jDGw7gIw95yEMe8pCHfOQjH/nIQx7ykIc85CEf+chH/h8AfOQjH/nIQx7ykIc85CMf+chHPvKQhzzkIQ/5yEeuA3jDG97whre85S1vecMb3vCGt7zlLW95wxve8IY3XAbwlgO85QAHOMABDnCAAxzgAAc4wAEOcIADHOAABzjAAQ5wgAMc4AAHOMABDnCAAxzgAAc4wAEOcIADHOAABzjAAQ5wgAMc4AAHOMABDnCAAxz4t89sYhOzqGMe86hjHjWsoI466pjHLOqYxzw2/s0z2tGe9rSnPe1pT3va0572tKc97WlPe9rTnva0p30f+wM1s1e8+9w6jQAAACV0RVh0ZGF0ZTpjcmVhdGUAMjAyNS0wMy0yOFQyMzoyODo1NCswMDowMCeIuQkAAAAldEVYdGRhdGU6bW9kaWZ5ADIwMjUtMDMtMjhUMjM6Mjg6NTQrMDA6MDCTv3s0AAAAAElFTkSuQmCC`,
    GRASS: `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAIAAAAlC+aJAAAABGdBTUEAALGPC/xhBQAAAAlwSFlzAAALEwAACxMBAJqcGAAAAAd0SU1FB+kDHBgvL9t2r8IAAAAdaVRYdENvbW1lbnQAAAAAAENyZWF0ZWQgd2l0aCBHSU1QZC5lBwAAAFRJREFUaN7t0sENACAIBEHHfhshu5QCi/13Y+YS5xICAW9nZgAAwK699gAAALv22gMAAOzaaw8AALBrrz0AAMCuvfYAAAC79toDAADs2msPAACwa6897wAHd19yPpMAAAAASUVORK5CYII=`,
    GROUND_DECO: `${GITHUB_BASE_URL}/GroundAssets1.png`,
    GRASS_TILES: `${GITHUB_BASE_URL}/grasstiles.png`,
    GRASS_BACK: `${GITHUB_BASE_URL}/grassback.png`,
    CHEST: `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAHVSURBVHhe7ZrNigIxEMf9fB68ePAgePAgCg6C4MGD4EfwIHjw4EHw4sGD4Cg+w7/QUzKd7k560p3u+cEnM9N0+p+k02QyyWKxWCwWi8VisVgsFovF8n+S+Xxezufz/y232y3b7bY8n89yv9+l1WpJvV6Xw+Egp9NJWq2WzOdzKRaL8ng8yvV6lWazKT6dTkeOx6Mcj0dpNpvS6XTk8XiU+/0utVpNfJrNphwOBymXy9LpdGS1Wslms5F6vS4+lUol2e/3UiqVpNPpyHK5lM1mI41GQ3xqtZocDocS+06nI4vFQtbrtTQajRKfWq0mx+NRDofD/9h3Oh2Zz+eyXq+l0WiU+NRqNTkej3I8HuV4PEq73ZZOp1Ni3+12ZTablW6hXq9Lp9Mpi32325XJZFJiv9vtpNlslsW+2+3KZDSRZbJcLoc+1et1aTQasu92uzIZT2SZLJfLoU+1Wk0ajYbsu92uTMZjyWKx3W6HPlWr1dLtt9uV8Xgsi8VC1uv10KdarZbuv9vtymg0ksVioV6vhz5Vq9XS/XccR8bjscznc/V6PfSpWq2W7r/jODIcDmU+n6vX66FP1Wq1dP8dRxuO5Xw+q9froU/VarV0/x3HkcFgINPptMRisVgsFovFYrFYLBaLxeK/8wPq2XAx3+25YQAAAABJRU5ErkJggg==` 
  },
  PROJECTILES: {
    NUT: `${GITHUB_BASE_URL}/NutProjectileSpriteSheet1.png`,
    TWIG: 'https://cdn-icons-png.flaticon.com/512/2921/2921824.png',
    ROCK: 'https://cdn-icons-png.flaticon.com/512/2480/2480800.png',
    CROW: 'https://cdn-icons-png.flaticon.com/512/826/826963.png',
    BOOMERANG: 'https://cdn-icons-png.flaticon.com/512/2916/2916115.png',
    PISTACHIO: 'https://cdn-icons-png.flaticon.com/512/11520/11520630.png',
    FIRE: 'https://cdn-icons-png.flaticon.com/512/785/785116.png',
    ICE: 'https://cdn-icons-png.flaticon.com/512/2530/2530005.png',
    KINETIC: 'https://cdn-icons-png.flaticon.com/512/5551/5551383.png',
    RACCOON: 'https://cdn-icons-png.flaticon.com/512/2318/2318271.png',
  },
  UI: {
    LOGO: `${GITHUB_BASE_URL}/Squirrvivorlogo.png`, 
    LOADING_BG: `${GITHUB_BASE_URL}/squivivorbglogo.png`,
  },
  AUDIO: {
    GAMEPLAY: `${GITHUB_AUDIO_URL}/Gameplay.mp3`,
    GAMEPLAY_1: `${GITHUB_AUDIO_URL}/Gameplay1.mp3`,
    GAMEPLAY_2: `${GITHUB_AUDIO_URL}/Gameplay2.mp3`,
    GAMEPLAY_3: `${GITHUB_AUDIO_URL}/Gameplay3.mp3`,
    GAMEPLAY_4: `${GITHUB_AUDIO_URL}/Gameplay4.mp3`,
    GAMEPLAY_5: `${GITHUB_AUDIO_URL}/Gameplay5.mp3`,
    GAMEPLAY_6: `${GITHUB_AUDIO_URL}/Gameplay6.mp3`,
    GAMEPLAY_7: `${GITHUB_AUDIO_URL}/Gameplay7.mp3`,
  }
};

export const PROJECTILE_ROWS = {
  PEANUT: 0,
  PECAN: 1,
  PISTACHIO: 2,
  WALNUT: 3,
  HAZELNUT: 4,
  ACORN: 5,
  PINECONE: 6,
  ALMOND: 7
};

export const CHARACTERS: Character[] = [
  { id: 'racer', name: 'Racer', sprite: ASSETS.CHARACTERS.RACER, head: ASSETS.CHARACTERS.RACER_HEAD, baseStats: { speed: 3.5, hp: 80, damage: 10 } },
  { id: 'hango', name: 'Hango', sprite: ASSETS.CHARACTERS.HANGO, head: ASSETS.CHARACTERS.HANGO_HEAD, baseStats: { speed: 2.5, hp: 120, damage: 15 } },
  { id: 'dirt', name: 'Dirt', sprite: ASSETS.CHARACTERS.DIRT, head: ASSETS.CHARACTERS.DIRT_HEAD, baseStats: { speed: 3.0, hp: 100, damage: 12 } },
];

export const ARMORY_UPGRADES = [
  { id: 'thick_fur', name: 'Thick Fur', icon: '❤️', cost: 50, mult: 1.5, maxLevel: 10, desc: '+10 Max HP' },
  { id: 'quick_paws', name: 'Quick Paws', icon: '👟', cost: 80, mult: 1.6, maxLevel: 5, desc: '+0.4 Speed' },
  { id: 'nut_magnet', name: 'Nut Magnet', icon: '🧲', cost: 60, mult: 1.4, maxLevel: 10, desc: '+25 Pickup Range' },
  { id: 'sharp_teeth', name: 'Sharp Teeth', icon: '🦷', cost: 100, mult: 1.8, maxLevel: 5, desc: '+20% Damage' },
  { id: 'hyper_meta', name: 'Hyper Metabolism', icon: '⚡', cost: 150, mult: 1.7, maxLevel: 5, desc: '-5% Cooldowns' },
  { id: 'nine_lives', name: 'Nine Lives', icon: '✝️', cost: 1000, mult: 2.5, maxLevel: 3, desc: '+1 Revive' },
  { id: 'raccoon_squad', name: 'Racoon Squad', icon: '🦝', cost: 500, mult: 2.0, maxLevel: 4, desc: 'Summons CCW orbiting racoons that bleed enemies.' },
  { id: 'murder_of_crows', name: 'Murder of Crows', icon: '🐦‍⬛', cost: 600, mult: 2.2, maxLevel: 5, desc: 'CW orbiting crows with knockback and 5% DPS.' },
];

export const ACTIVE_ABILITIES: ActiveAbilityConfig[] = [
  { id: AbilityId.BARRAGE, name: "Nut Barrage", icon: "🥜", description: "Fires a rapid stream of piercing peanuts.", baseCost: 200, baseCooldown: 5, baseDamage: 15, color: "bg-orange-600" },
  { id: AbilityId.TORNADO, name: "Leaf Tornado", icon: "🍃", description: "Sweeps enemies away from you.", baseCost: 200, baseCooldown: 8, baseDuration: 3, color: "bg-green-600" },
  { id: AbilityId.SQUIRRLEY, name: "Squirrley", icon: "👻", description: "Phase through trees and gain 20% speed.", baseCost: 350, baseCooldown: 20, baseDuration: 6, color: "bg-gray-500" }
];

export const COMPANIONS = [
  { id: CompanionType.NURSE, name: 'Nurse Squirrel', icon: '🩺', cost: 1500, desc: 'Heals 2% HP every 5s' },
  { id: CompanionType.SOLDIER, name: 'Soldier Squirrel', icon: '⚔️', cost: 1500, desc: '+25% Damage' },
  { id: CompanionType.SCOUT, name: 'Scout Squirrel', icon: '🚩', cost: 1500, desc: '+50% Move Speed' },
];

export const IN_GAME_UPGRADES: Upgrade[] = [
  { id: 'bigger_nuts', name: 'Bigger Nuts', description: '+25% Damage', rarity: 'Common', icon: '🌰', apply: (p) => { p.stats.damageMult += 0.25; } },
  { id: 'faster_throw', name: 'Faster Throw', description: '-15% Cooldown', rarity: 'Common', icon: '⏩', apply: (p) => { p.stats.cooldownMult *= 0.85; } },
  { id: 'speed_boots', name: 'Speed Boots', description: '+20% Speed', rarity: 'Rare', icon: '👢', apply: (p) => { p.speed *= 1.2; } },
];

export const CANVAS_WIDTH = 540; 
export const CANVAS_HEIGHT = 960; 
export const TILE_SIZE = 64;
