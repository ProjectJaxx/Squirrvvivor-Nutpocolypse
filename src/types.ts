

export type Vector = { x: number; y: number };

export interface Entity {
  id: string;
  x: number;
  y: number;
  radius: number;
  color?: string;
  type: string;
  rotation?: number;
  opacity?: number;
  variant?: number; // Visual variation seed (0-9)
}

export type AppState = 'LOADING' | 'SAVE_SELECT' | 'MENU' | 'BASE_UPGRADES' | 'GAME' | 'PAUSED' | 'LEVEL_UP' | 'GAME_OVER' | 'STAGE_CLEAR' | 'SETTINGS';

export type StageDuration = 'STANDARD' | 'LONG' | 'EPIC';

export type DamageType = 'PHYSICAL' | 'COLD' | 'FIRE' | 'POISON' | 'WIND';
export type StatusEffectType = 'SLOW' | 'FREEZE' | 'BURN';

export interface StatusEffect {
  type: StatusEffectType;
  duration: number; // Frames
  power: number; // Slow: 0-1 percentage, Burn: damage per tick
  tickTimer?: number; // For DoTs
  sourceId?: string; // To prevent stacking from same source if needed
}

export interface Weapon {
  type: 'NUT_THROW' | 'CROW_AURA' | 'ACORN_CANNON' | 'FEATHER_STORM' | 'PINE_NEEDLE' | 'SAP_PUDDLE' | 'BOOMERANG' | 'NUT_STORM' | 'NUT_BARRAGE' | 'LEAF_SWARM';
  level: number;
  damage: number;
  cooldown: number;
  cooldownTimer: number;
  area: number;
  speed: number;
  amount: number;
  duration?: number;
  // Elemental Props
  damageType?: DamageType;
  statusType?: StatusEffectType;
  statusChance?: number; // 0-1
  statusPower?: number;
  statusDuration?: number;
  // Special movement
  oscillation?: number;
}

export interface ActiveAbility {
  type: string;
  name: string;
  cooldown: number;
  cooldownTimer: number;
  duration: number;
  activeTimer: number;
}

export interface Player extends Entity {
  maxHp: number;
  hp: number;
  xp: number;
  level: number;
  nextLevelXp: number;
  speed: number;
  velocity: Vector;
  acceleration: number;
  friction: number;
  magnetRadius: number;
  weapons: Weapon[];
  activeAbility?: ActiveAbility;
  facing: 'LEFT' | 'RIGHT';
  rotation: number;
  emoji: string;
  characterId: string;
  secondaryColor: string;
  stamina: number;
  maxStamina: number;
  dashCooldown: number;
  isDashing: boolean;
  dashVector: Vector;
  invincibleTimer: number;
  animationState: 'IDLE' | 'RUN';
  animationFrame: number;
  frameTimer: number;
  tailWagOffset: number;
  maxCompanions: number;
  revives: number;
  damageBonus?: number;
  cooldownReduction?: number;
  filter?: string;
  // Dynamic stats calculated per frame
  currentSpeedBonus?: number;
  currentDamageBonus?: number;
  currentCooldownBonus?: number;
}

export interface Enemy extends Entity {
  hp: number;
  maxHp: number;
  speed: number;
  damage: number;
  xpValue: number;
  isElite?: boolean;
  isBoss?: boolean;
  eliteType?: 'DAMAGE' | 'SPEED' | 'TANK';
  velocity: Vector;
  facing?: 'LEFT' | 'RIGHT';
  animationFrame?: number;
  activeEffects: StatusEffect[];
}

export interface Particle extends Entity {
  velocity: Vector;
  life: number;
  maxLife: number;
  scale: number;
  attachedTo?: string;
  drift?: Vector;
  subtype?: 'SCRAP' | 'GOO' | 'DISINTEGRATE' | 'DEFAULT' | 'ELITE_ESSENCE' | 'SMOKE' | 'FLASH';
}

export interface TextIndicator extends Entity {
  text: string;
  life: number;
  velocity: Vector;
  opacity: number;
}

export interface Drop extends Entity {
  kind: 'XP' | 'GOLD' | 'HEALTH_PACK';
  value: number;
}

export interface Projectile extends Entity {
  velocity: Vector;
  damage: number;
  life: number;
  source: 'PLAYER' | 'ENEMY';
  weaponType?: string;
  pierce?: number;
  rotation?: number;
  variant?: number;
  // Elemental Props
  damageType?: DamageType;
  statusType?: StatusEffectType;
  statusChance?: number;
  statusPower?: number;
  statusDuration?: number;
  // Special movement
  orbitAngle?: number;
  orbitRadius?: number;
  oscillation?: number; 
}

export type CompanionType = 'HEALER' | 'WARRIOR' | 'SCOUT' | 'SNIPER' | 'ARCTIC' | 'DESERT';

export interface Companion extends Entity {
  velocity: Vector;
  facing: 'LEFT' | 'RIGHT';
  secondaryColor?: string;
  subtype?: CompanionType;
  abilityTimer: number;
}

export type GamePhase = 'SURVIVAL' | 'EXTRACTION';

export interface GameState {
  player: Player;
  enemies: Enemy[];
  companions: Companion[];
  projectiles: Projectile[];
  drops: Drop[];
  particles: Particle[];
  texts: TextIndicator[];
  obstacles: Entity[];
  score: number;
  kills: number;
  collectedNuts: number;
  time: number;
  wave: number;
  bossWarningTimer: number;
  biome: string;
  mapBounds: { minX: number; maxX: number; minY: number; maxY: number };
  shake: { intensity: number; duration: number };
  phase: GamePhase;
  extractionTimer?: number;
}

export interface SquirrelCharacter {
  id: string;
  name: string;
  description: string;
  hp: number;
  speed: number;
  color: string;
  secondaryColor: string;
  emoji: string;
  radius: number;
  filter: string;
  activeAbility?: ActiveAbility;
  damageBonus?: number;
  cooldownReduction?: number;
  magnetRadius?: number;
  maxCompanions?: number;
  revives?: number;
  // Unlockable Starting Items
  startingCompanions?: CompanionType[];
  startingWeapons?: Weapon[];
}

export interface BaseUpgradeDef {
  id: string;
  name: string;
  description: string;
  icon: string;
  baseCost: number;
  costMultiplier: number;
  maxLevel: number;
  statKey: string;
  increment: number;
  // For specialized unlocks
  companionType?: CompanionType;
  weaponConfig?: Weapon;
}

export interface PlayerStats {
  totalKills: number;
  totalTimePlayed: number;
  totalGamesPlayed: number;
  maxWaveReached: number;
  highestScore: number;
  totalDeaths: number;
  totalNuts: number;
}

export interface SaveSlot {
  id: string;
  name: string;
  created: number;
  lastPlayed: number;
  stats: PlayerStats;
  permanentUpgrades: Record<string, number>;
}

export interface Upgrade {
  id: string;
  name: string;
  description: string;
  rarity: 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';
  icon: string;
  apply: (player: Player, state?: GameState) => void;
  companionType?: CompanionType;
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