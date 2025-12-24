
import { Character, CompanionType, Upgrade, EntityType, PlayerState, Difficulty, ActiveAbilityConfig, AbilityId } from './types.ts';

export const GITHUB_BASE_URL = 'https://raw.githubusercontent.com/ProjectJaxx/SquirvivorStable/main/spritesheets';
export const GITHUB_TERRAIN_URL = 'https://raw.githubusercontent.com/ProjectJaxx/SquirvivorStable/main/terrain';
export const GITHUB_AUDIO_URL = 'https://raw.githubusercontent.com/ProjectJaxx/SquirvivorStable/main/audio';

export const WORLD_WIDTH = 4000;
export const WORLD_HEIGHT = 4000;

export const DIFFICULTY_SETTINGS = {
  [Difficulty.EASY]: { 
    label: 'Easy', 
    hpMult: 0.7, 
    dmgMult: 0.7, 
    spawnIntervalMult: 1.2, 
    duration: 180, 
    color: 'text-green-400',
    description: 'A walk in the park. 3 minute survival.'
  },
  [Difficulty.HARD]: { 
    label: 'Hard', 
    hpMult: 1.0, 
    dmgMult: 1.0, 
    spawnIntervalMult: 1.0, 
    duration: 300, 
    color: 'text-yellow-400',
    description: 'The standard challenge. 5 minute survival.'
  },
  [Difficulty.HARDEST]: { 
    label: 'Nutpocalypse', 
    hpMult: 1.5, 
    dmgMult: 1.5, 
    spawnIntervalMult: 0.7, 
    duration: 600, 
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
  { range: [1, 10], name: "The Forest", description: "Infinite woodland. Keep moving.", id: 'FOREST' },
  { range: [11, 20], name: "The Park", description: "Borders and boundaries. Cornered squirrels.", id: 'PARK' },
  { range: [21, 30], name: "Space Ship", description: "Infinite background with metal rooms.", id: 'SHIP' },
  { range: [31, 40], name: "Planet Mars", description: "Red dust and alien rocks.", id: 'MARS' },
  { range: [41, 55], name: "Alien Mothership", description: "The final maze. Find the consoles.", id: 'MOTHER' }
];

export const BIOME_CONFIG = {
  FOREST: { bgColor: '#2d4c1e', gridColor: 'rgba(255,255,255,0.02)', particleColor: '#4d7c0f', drawFunc: 'DRAW_FOREST' },
  PARK: { bgColor: '#656b53', gridColor: 'rgba(0,0,0,0.05)', particleColor: '#a3e635', drawFunc: 'DRAW_GRASS' },
  SHIP: { bgColor: '#1e293b', gridColor: '#334155', particleColor: '#0ea5e9', drawFunc: 'DRAW_SHIP' },
  MARS: { bgColor: '#7f1d1d', gridColor: '#991b1b', particleColor: '#ef4444', drawFunc: 'DRAW_CRATERS' },
  MOTHER: { bgColor: '#1e1b4b', gridColor: '#4f46e5', particleColor: '#00ff00', drawFunc: 'DRAW_MAZE' }
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
    PEACHES: `${GITHUB_BASE_URL}/mrpeachesspritesheet.png`,
    MAXINE: `${GITHUB_BASE_URL}/maxinespritesheet.png`,
    RACER_HEAD: `${GITHUB_BASE_URL}/racerhead.png`,
    HANGO_HEAD: `${GITHUB_BASE_URL}/hangohead.png`,
    DIRT_HEAD: `${GITHUB_BASE_URL}/dirthead.png`,
    PEACHES_HEAD: `${GITHUB_BASE_URL}/peachesfullT.png`,
    MAXINE_HEAD: `${GITHUB_BASE_URL}/maxinefullT.png `,
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
    GROUND_DECO: `${GITHUB_BASE_URL}/GroundAssets1.png`,
    GRASS_TILES: `${GITHUB_BASE_URL}/grasstiles.png`,
    GRASS_BACK: `${GITHUB_TERRAIN_URL}/ground_grass_gen_05.png`,
  },
  PROJECTILES: {
    NUT: `${GITHUB_BASE_URL}/NutProjectileSpriteSheet1.png`,
    TWIG: 'https://cdn-icons-png.flaticon.com/512/2921/2921824.png',
    ROCK: 'https://cdn-icons-png.flaticon.com/512/2480/2480800.png',
    CROW: `${GITHUB_BASE_URL}/MOCSpritesheet.png`,
    PISTACHIO: 'https://cdn-icons-png.flaticon.com/512/11520/11520630.png',
    WALNUT: 'https://cdn-icons-png.flaticon.com/512/2619/2619277.png',
    FIRE: 'https://cdn-icons-png.flaticon.com/512/785/785116.png',
    ICE: 'https://cdn-icons-png.flaticon.com/512/2530/2530005.png',
    KINETIC: 'https://cdn-icons-png.flaticon.com/512/5551/5551383.png',
    RACCOON: `${GITHUB_BASE_URL}/racoon1.png`,
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
  ACORN: 4,
  PINECONE: 5,
  ALMOND: 6
};

export const CHARACTERS: Character[] = [
  { id: 'racer', name: 'Racer', sprite: ASSETS.CHARACTERS.RACER, head: ASSETS.CHARACTERS.RACER_HEAD, baseStats: { speed: 3.5, hp: 80, damage: 10, armor: 2 } },
  { id: 'hango', name: 'Hango', sprite: ASSETS.CHARACTERS.HANGO, head: ASSETS.CHARACTERS.HANGO_HEAD, baseStats: { speed: 2.5, hp: 120, damage: 15, armor: 3 } },
  { id: 'dirt', name: 'Dirt', sprite: ASSETS.CHARACTERS.DIRT, head: ASSETS.CHARACTERS.DIRT_HEAD, baseStats: { speed: 3.0, hp: 100, damage: 12, armor: 5 } },
  { id: 'peaches', name: 'Mr Peaches', sprite: ASSETS.CHARACTERS.PEACHES, head: ASSETS.CHARACTERS.PEACHES_HEAD, baseStats: { speed: 3.0, hp: 100, damage: 14, armor: 4, slowChance: 0.25 } },
  { id: 'maxine', name: 'Maxine', sprite: ASSETS.CHARACTERS.MAXINE, head: ASSETS.CHARACTERS.MAXINE_HEAD, baseStats: { speed: 3.0, hp: 100, damage: 14, armor: 4, extraProjectiles: 1 } },
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

export const COMPANIONS = [
  { id: CompanionType.RACER, name: 'Companion Racer', icon: '👟', cost: 1500, maxLevel: 10, growthMult: 1.4, desc: 'Boosts player speed and attack frequency.' },
  { id: CompanionType.DIRT, name: 'Companion Dirt', icon: '🛡️', cost: 1500, maxLevel: 10, growthMult: 1.4, desc: 'Increases player armor and orbit knockback.' },
  { id: CompanionType.HANGO, name: 'Companion Hango', icon: '🩸', cost: 1500, maxLevel: 10, growthMult: 1.4, desc: 'Boosts player damage and bleed effectiveness.' },
  { id: CompanionType.MR_PEACHES, name: 'Companion Peaches', icon: '🍑', cost: 1500, maxLevel: 10, growthMult: 1.4, desc: 'Adds slowing effect to player projectiles.' },
  { id: CompanionType.MAXINE, name: 'Companion Maxine', icon: '🎯', cost: 1500, maxLevel: 10, growthMult: 1.4, desc: 'Adds extra projectiles to all attacks.' },
];

export const ACTIVE_ABILITIES: ActiveAbilityConfig[] = [
  { id: AbilityId.PEANUT_BRITTLE, name: "Peanut Brittle", icon: "💎", description: "Pulses spinning peanuts around you for 7s.", baseCost: 300, baseCooldown: 20, baseDuration: 7, baseDamage: 40, color: "bg-amber-600" },
  { id: AbilityId.DRAY_DAY, name: "Dray Day", icon: "🛖", description: "Randomly drops sticks all over for 7s.", baseCost: 350, baseCooldown: 20, baseDuration: 7, baseDamage: 60, color: "bg-orange-800" },
  { id: AbilityId.VOLTDOM, name: "Voltdom", icon: "⚡", description: "Invincibility + Super Companions for 10s.", baseCost: 500, baseCooldown: 20, baseDuration: 10, color: "bg-yellow-400" },
  { id: AbilityId.WALNUT_ROLLOUT, name: "Walnut Rollout", icon: "🚜", description: "360-degree burst of rolling walnuts.", baseCost: 400, baseCooldown: 20, baseDamage: 80, color: "bg-emerald-700" },
  { id: AbilityId.TWIGNADO, name: "Twignado", icon: "🌪️", description: "Chaotic tornadoes spin enemies for 5s.", baseCost: 400, baseCooldown: 20, baseDuration: 5, baseDamage: 15, color: "bg-slate-400" },
  { id: AbilityId.CUTENESS_OVERLOAD, name: "Cuteness Overload", icon: "🥺", description: "Enemies attack each other for 5s.", baseCost: 600, baseCooldown: 30, baseDuration: 5, color: "bg-pink-400" },
  { id: AbilityId.MAD_SQUIRREL, name: "Mad Squirrel", icon: "💢", description: "+200% Bullet Speed & DPS for 8s.", baseCost: 600, baseCooldown: 30, baseDuration: 8, color: "bg-red-600" }
];

export const IN_GAME_UPGRADES: Upgrade[] = [
  { id: 'murder_of_crows', name: 'Murder of Crows', description: 'Counter-clockwise aura. Low damage, high knockback.', rarity: 'Rare', icon: '🐦‍⬛', apply: (p) => { p.passives.murderOfCrows = Math.min(5, (p.passives.murderOfCrows || 0) + 1); } },
  { id: 'pack_of_raccs', name: 'Pack of Raccs', description: 'Clockwise aura below player. Causes bleed damage.', rarity: 'Rare', icon: '🦝', apply: (p) => { p.passives.raccoonSquad = Math.min(5, (p.passives.raccoonSquad || 0) + 1); } },
  { id: 'scurry', name: 'Scurry', description: 'Squirrel aura. Increases speed and deals 10% player dps.', rarity: 'Rare', icon: '🐿️', apply: (p) => { p.passives.scurryAura = Math.min(5, (p.passives.scurryAura || 0) + 1); p.speed *= 1.05; } },
  { id: 'stat_hp', name: 'Thick Fur', description: '+20% Max HP', rarity: 'Common', icon: '❤️', apply: (p) => { p.maxHp *= 1.2; p.hp *= 1.2; } },
  { id: 'stat_dmg', name: 'Sharp Teeth', description: '+20% Damage', rarity: 'Common', icon: '🦷', apply: (p) => { p.stats.damageMult += 0.2; } },
  { id: 'stat_speed', name: 'Quick Paws', description: '+15% Speed', rarity: 'Common', icon: '👟', apply: (p) => { p.speed *= 1.15; } },
  { id: 'stat_armor', name: 'Hard Shell', description: '+5 Armor', rarity: 'Common', icon: '🛡️', apply: (p) => { p.stats.armor += 5; } },
];

export const CANVAS_WIDTH = 540; 
export const CANVAS_HEIGHT = 960; 
export const TILE_SIZE = 64;
