

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
  'SWARM_ZOMBIE' | 'SHIELD_ZOMBIE' | 'GHOST' | 'TANK_BOT' | 'MARTIAN_SPIDER' |
  'CYBER_HOUND' | 'MECHA_BEETLE' |
  'BOSS_ZOMBIE' | 'BOSS_ROBOT' | 'BOSS_ALIEN' | 'BOSS_MISSILE' | 'LASER' | 'COMPANION' |
  'PINE_NEEDLE' | 'SAP_PUDDLE' | 'BOOMERANG' |
  'WATER_JET' | 'SPORE_CLOUD' | 'SHOCKWAVE' | 'SAP_BLOB';

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
  speed: number; // Base max speed
  color: string;
  secondaryColor: string; // Tail/Detail color
  emoji: string;
  radius: number;
  filter?: string;
  activeAbility: ActiveAbility;
  // Base stats that can be modified by permanent upgrades
  magnetRadius?: number;
  maxCompanions?: number;
  damageBonus?: number;
  cooldownReduction?: number;
  revives?: number;
}

export interface Companion extends Entity {
  offsetAngle: number;
  cooldown: number;
  cooldownTimer: number;
  targetId?: string;
}

export interface Player extends Entity {
  // Stats
  hp: number;
  maxHp: number;
  xp: number;
  level: number;
  nextLevelXp: number;
  speed: number;
  magnetRadius: number;
  
  // Physics / Control
  velocity: Vector;
  acceleration: number;
  friction: number;
  facing: 'LEFT' | 'RIGHT';
  rotation: number; // Visual tilt
  
  // Combat
  weapons: Weapon[];
  activeAbility: ActiveAbility;
  
  // State
  characterId?: string;
  secondaryColor?: string; // For rendering
  filter?: string;
  xpFlashTimer?: number;
  slowedTimer?: number;
  
  // Stamina / Dash System
  stamina: number;
  maxStamina: number;
  dashCooldown: number;
  isDashing: boolean;
  dashVector: Vector;

  invincibleTimer?: number;
  airborneTimer?: number; 
  attackAnimTimer?: number;
  currentAttackType?: 'NUT_THROW' | 'OTHER';
  
  // Animation
  animationState: 'IDLE' | 'RUN' | 'DASH';
  animationFrame: number;
  frameTimer: number;
  tailWagOffset: number; // For rendering the tail
  
  // Upgrades
  maxCompanions?: number;
  revives?: number;
  damageBonus?: number;
}

export interface StatusEffect {
  type: 'SLOW' | 'BURN';
  duration: number;
  magnitude: number;
}

export type EliteType = 'SPEED' | 'REGEN' | 'DAMAGE';

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
  
  // Elite Properties
  isElite?: boolean;
  eliteType?: EliteType;
  
  // Dynamic Buffs (reset every frame)
  speedMultiplier?: number;
  damageMultiplier?: number;

  // Boss specific properties
  bossPhase?: number; // 1 or 2
  bossState?: 'IDLE' | 'WARN' | 'ATTACK' | 'COOLDOWN';
  bossTimer?: number;
  attackType?: string;
  targetLocation?: Vector;
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
  // Specific weapon states
  returnState?: 'OUT' | 'RETURN';
  // Crow Aura props
  attachedTo?: string; // ID of player to orbit
  orbitAngle?: number;
  orbitRadius?: number;
  angularVelocity?: number;
  hitAnimTimer?: number;
  facing?: 'LEFT' | 'RIGHT';
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
  // Atmospheric props
  drift?: Vector;
  subtype?: 'SCRAP' | 'GOO' | 'DISINTEGRATE' | 'DEFAULT';
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
    material: 'WOOD' | 'STONE' | 'METAL' | 'CRYSTAL' | 'FLESH' | 'PLANT';
    isCover?: boolean;
    subtype?: 'TREE' | 'ROCK' | 'BENCH' | 'CAR' | 'CRYSTAL' | 'WALL' | 'GEYSER' | 'PUDDLE' | 'LOG' |
              'BERRY_BUSH' | 'STATUE' | 'FIRE_HYDRANT' | 'TRASH_CAN' | 'SPORE_POD' | 'SLIME_POOL' | 'PINE' | 'OAK';
    // Distinct properties
    explosive?: boolean;
    explodeDamage?: number;
    explodeRadius?: number;
    emitType?: 'SMOKE' | 'WATER' | 'GLITTER' | 'FIRE' | 'POISON';
}

export type WeaponType = 'NUT_THROW' | 'CROW_AURA' | 'ACORN_CANNON' | 'FEATHER_STORM' | 'PINE_NEEDLE' | 'SAP_PUDDLE' | 'BOOMERANG';

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
    statKey: 'hp' | 'speed' | 'magnetRadius' | 'damage' | 'maxCompanions' | 'cooldown' | 'revive' | 'ability'; // Which stat on character/player it affects
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