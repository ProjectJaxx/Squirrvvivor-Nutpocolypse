

export type AppState = 'LOADING' | 'MENU' | 'GAME' | 'LEVEL_UP' | 'GAME_OVER' | 'SETTINGS' | 'SAVE_SELECT' | 'PAUSED' | 'BASE_UPGRADES' | 'STAGE_CLEAR';

export interface Vector {
  x: number;
  y: number;
}

export type DropKind = 'XP' | 'GOLD' | 'HEALTH_PACK';

export type EntityType = 
  'PLAYER' | 'ZOMBIE' | 'ROBOT' | 'ALIEN' | 
  'NUT_SHELL' | 'EXPLODING_ACORN' | 'CROW_FEATHER' | 'DROP' | 'CROW' | 
  'EXPLOSION' | 'SMOKE' | 'TRAIL' | 'OBSTACLE' | 'FRAGMENT' | 'SPARK' | 'FLASH' |
  'BRUTE_ZOMBIE' | 'RUNNER_ZOMBIE' | 'SPITTER_ZOMBIE' | 'VENOM_SPIT' |
  'SWARM_ZOMBIE' | 'SHIELD_ZOMBIE' |
  'BOSS_ZOMBIE' | 'BOSS_ROBOT' | 'BOSS_ALIEN' | 'BOSS_MISSILE' | 'LASER' | 'COMPANION';

export interface Entity {
  id: string;
  x: number;
  y: number;
  radius: number;
  type: EntityType;
  color: string;
  emoji?: string;
}

export interface ActiveAbility {
  type: 'NUT_BARRAGE';
  name: string;
  cooldown: number;      // Total cooldown in frames
  cooldownTimer: number; // Current cooldown remaining
  duration: number;      // How long the ability lasts (frames)
  activeTimer: number;   // Time remaining while active
}

export interface SquirrelCharacter {
  id:string;
  name: string;
  description: string;
  hp: number;
  speed: number;
  color: string;
  emoji: string;
  radius: number;
  filter?: string;
  activeAbility: ActiveAbility;
  // Base stats that can be modified by permanent upgrades
  magnetRadius?: number;
  maxCompanions?: number; // New stat for Scurry upgrade
  damageBonus?: number; // Percent (e.g. 0.1 for 10%)
  cooldownReduction?: number; // Percent (e.g. 0.1 for 10%)
  revives?: number; // Count
}

export interface Companion extends Entity {
  offsetAngle: number;
  cooldown: number;
  cooldownTimer: number;
  targetId?: string;
}

export interface Player extends Entity {
  hp: number;
  maxHp: number;
  xp: number;
  level: number;
  nextLevelXp: number;
  speed: number;
  magnetRadius: number; // Magnet pickup range
  weapons: Weapon[];
  activeAbility: ActiveAbility; // New active ability field
  facing: 'LEFT' | 'RIGHT' | 'UP' | 'DOWN';
  rotation: number;
  characterId?: string;
  filter?: string;
  xpFlashTimer?: number;
  slowedTimer?: number;
  stamina: number;
  maxStamina: number;
  isSprinting?: boolean;
  invincibleTimer?: number;
  airborneTimer?: number; // New: Tracks frames player is in the air (launched)
  animationState: 'IDLE' | 'WALKING';
  animationFrame: number;
  frameTimer: number;
  maxCompanions?: number; // How many companions allowed
  revives?: number; // Number of revives remaining
}

export interface StatusEffect {
  type: 'SLOW' | 'BURN';
  duration: number;
  magnitude: number;
}

export interface Enemy extends Entity {
  hp: number;
  maxHp: number;
  speed: number;
  damage: number;
  knockback: Vector;
  statusEffects: StatusEffect[];
  attackTimer?: number;
  shieldHp?: number;
  maxShieldHp?: number;
  hitFlashTimer?: number;
  facing: 'LEFT' | 'RIGHT' | 'UP' | 'DOWN';
  animationState: 'WALKING' | 'IDLE';
  animationFrame: number;
  frameTimer: number;
}

export interface Projectile extends Entity {
  velocity: Vector;
  damage: number;
  duration: number; // frames to live
  pierce: number;
  rotation: number;
  explodeRadius?: number;
  hostile?: boolean;
  hitIds?: string[]; // Track entities already hit to prevent multi-proc per frame/pierce
}

export interface ItemDrop extends Entity {
  kind: DropKind;
  value: number;
}

export interface Particle extends Entity {
  velocity: Vector;
  life: number;
  maxLife: number;
  scale: number;
  attachedTo?: string; // ID of entity to follow
}

export interface FloatingText {
  id: string;
  x: number;
  y: number;
  text: string;
  life: number;
  color: string;
  velocity: Vector;
}

export interface Obstacle extends Entity {
    width?: number;  // If present, treated as Rectangle
    height?: number; // If present, treated as Rectangle
    hp: number;
    maxHp: number;
    destructible: boolean;
    rotation: number;
    material: 'WOOD' | 'STONE' | 'METAL' | 'CRYSTAL' | 'FLESH';
    isCover?: boolean;
    subtype?: 'TREE' | 'ROCK' | 'BENCH' | 'CAR' | 'CRYSTAL' | 'WALL' | 'GEYSER' | 'PUDDLE' | 'LOG';
    // Distinct properties
    explosive?: boolean;
    explodeDamage?: number;
    explodeRadius?: number;
    emitType?: 'SMOKE' | 'WATER' | 'GLITTER' | 'FIRE';
}

export type WeaponType = 'NUT_THROW' | 'CROW_AURA' | 'ACORN_CANNON' | 'FEATHER_STORM';

export interface Weapon {
  type: WeaponType;
  level: number;
  cooldown: number;
  cooldownTimer: number;
  damage: number;
  area: number; // size or range
  speed: number; // projectiles speed
  amount: number; // projectiles per shot
  duration?: number;
}

export interface Upgrade {
  id: string;
  name: string;
  description: string;
  rarity: 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';
  icon: string;
  apply: (player: Player) => void;
}

export type StageDuration = 'STANDARD' | 'LONG' | 'EPIC';

export interface ScreenShake {
  intensity: number;
  duration: number;
}

export interface GameState {
  player: Player;
  enemies: Enemy[];
  companions: Companion[]; // New: Scurry squad
  projectiles: Projectile[];
  drops: ItemDrop[];
  particles: Particle[];
  texts: FloatingText[];
  obstacles: Obstacle[];
  score: number;
  kills: number; 
  collectedNuts: number; // Currency collected in run
  time: number; // frames
  wave: number;
  bossWarningTimer: number;
  mapBounds: { minX: number, maxX: number, minY: number, maxY: number };
  biome: 'PARK' | 'PARKING_LOT' | 'MARS';
  shake: ScreenShake;
}

export interface PlayerStats {
  totalKills: number;
  totalTimePlayed: number; // seconds
  totalGamesPlayed: number;
  maxWaveReached: number;
  highestScore: number;
  totalDeaths: number;
  totalNuts: number; // Currency
}

export interface SaveSlot {
  id: string;
  name: string;
  lastPlayed: number;
  created: number;
  stats: PlayerStats;
  permanentUpgrades: Record<string, number>; // upgradeId -> level
}

export interface BaseUpgradeDef {
    id: string;
    name: string;
    description: string;
    icon: string;
    baseCost: number;
    costMultiplier: number; // How much cost increases per level
    maxLevel: number;
    statKey: 'hp' | 'speed' | 'magnetRadius' | 'damage' | 'maxCompanions' | 'cooldown' | 'revive'; // Which stat on character/player it affects
    increment: number; // Amount per level
}

export interface SettingsMenuProps {
  soundEnabled: boolean;
  toggleSound: () => void;
  musicEnabled: boolean;
  toggleMusic: () => void;
  stageDuration: StageDuration;
  setStageDuration: (d: StageDuration) => void;
  onBack: () => void;
}

export interface GameCanvasProps {
  onGameOver: (score: number, time: number, kills: number, nuts: number, won: boolean) => void;
  onStageComplete: (player: Player, score: number, kills: number, nuts: number) => void;
  onLevelUp: (upgrades: Upgrade[], onSelect: (u: Upgrade) => void) => void;
  paused: boolean;
  character: SquirrelCharacter;
  initialPlayer?: Player; // If present, resume run with this state
  stageNumber: number;
  soundEnabled: boolean;
  musicEnabled: boolean;
  stageDuration: StageDuration;
  onTogglePause: () => void;
}
