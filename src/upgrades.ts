
import { Player, Upgrade, Weapon, GameState, Companion, CompanionType } from './types';
import { COMPANION_COLORS } from './constants';

const findWeapon = (player: Player, type: string) => {
    return player.weapons.find(w => w.type === type);
};

// Helper to spawn a companion
const spawnCompanion = (player: Player, state: GameState | undefined, type: CompanionType) => {
    if (!state) return;
    const secondary = COMPANION_COLORS[type];
    
    // We increase max companions if current capacity is full so the player gets their upgrade immediately
    if (state.companions.length >= player.maxCompanions) {
        player.maxCompanions += 1;
    }

    state.companions.push({
        id: `comp-${Date.now()}-${state.companions.length}`,
        x: player.x + (Math.random() - 0.5) * 50,
        y: player.y + (Math.random() - 0.5) * 50,
        radius: 12,
        type: 'COMPANION',
        color: '#FBD38D', 
        secondaryColor: secondary,
        facing: 'RIGHT',
        velocity: { x: 0, y: 0 },
        variant: 0,
        subtype: type,
        abilityTimer: 0
    });
};

export const ALL_UPGRADES: Upgrade[] = [
    // --- NUT THROW UPGRADES ---
    {
        id: 'BIGGER_NUTS',
        name: 'Bigger Nuts',
        description: 'Increases nut damage by 5 and projectile size by 20%.',
        rarity: 'COMMON',
        icon: '🌰',
        apply: (player: Player) => {
            const nutThrow = findWeapon(player, 'NUT_THROW');
            if (nutThrow) {
                nutThrow.damage += 5;
                nutThrow.area *= 1.2;
            }
        },
    },
    {
        id: 'FASTER_THROW',
        name: 'Faster Throw',
        description: 'Reduces nut throw cooldown by 15% (attacks faster).',
        rarity: 'COMMON',
        icon: '💨',
        apply: (player: Player) => {
            const nutThrow = findWeapon(player, 'NUT_THROW');
            if (nutThrow) {
                nutThrow.cooldown = Math.max(5, nutThrow.cooldown * 0.85);
            }
        },
    },
    {
        id: 'MULTINUT',
        name: 'Multi-Nut',
        description: 'Fires an additional nut projectile.',
        rarity: 'RARE',
        icon: '🥜',
        apply: (player: Player) => {
            const nutThrow = findWeapon(player, 'NUT_THROW');
            if (nutThrow) {
                nutThrow.amount += 1;
            }
        },
    },
    // --- PLAYER STAT UPGRADES ---
    {
        id: 'SPEED_BOOTS',
        name: 'Speed Boots',
        description: 'Increases movement speed by 10%.',
        rarity: 'COMMON',
        icon: '👟',
        apply: (player: Player) => {
            player.speed *= 1.10;
        },
    },
    {
        id: 'WALNUTS',
        name: 'Crunchy Walnuts',
        description: 'Increases max health by 20 and heals for the same amount.',
        rarity: 'COMMON',
        icon: '🥔',
        apply: (player: Player) => {
            player.maxHp += 20;
            player.hp += 20;
        },
    },
    {
        id: 'NUT_MAGNET',
        name: 'Nut Magnet',
        description: 'Increases item pickup range by 50%.',
        rarity: 'COMMON',
        icon: '🧲',
        apply: (player: Player) => {
            player.magnetRadius = (player.magnetRadius || 150) * 1.5;
        },
    },
    
    // --- COMPANIONS (SCURRY) ---
    {
        id: 'COMPANION_HEALER',
        name: 'Nurse Squirrel',
        description: 'Recruit a Healer. Restores 2% Max HP every 5 seconds.',
        rarity: 'EPIC',
        icon: '🩺',
        apply: (player: Player, state?: GameState) => spawnCompanion(player, state, 'HEALER'),
        companionType: 'HEALER'
    },
    {
        id: 'COMPANION_WARRIOR',
        name: 'Soldier Squirrel',
        description: 'Recruit a Warrior. Grants +25% Damage to YOU while active.',
        rarity: 'EPIC',
        icon: '⚔️',
        apply: (player: Player, state?: GameState) => spawnCompanion(player, state, 'WARRIOR'),
        companionType: 'WARRIOR'
    },
    {
        id: 'COMPANION_SCOUT',
        name: 'Scout Squirrel',
        description: 'Recruit a Scout. Grants +50% Movement Speed to YOU while active.',
        rarity: 'EPIC',
        icon: '🚩',
        apply: (player: Player, state?: GameState) => spawnCompanion(player, state, 'SCOUT'),
        companionType: 'SCOUT'
    },
    {
        id: 'COMPANION_SNIPER',
        name: 'Sniper Squirrel',
        description: 'Recruit a Sniper. Grants +35% Attack Speed (Cooldown Reduction).',
        rarity: 'EPIC',
        icon: '🎯',
        apply: (player: Player, state?: GameState) => spawnCompanion(player, state, 'SNIPER'),
        companionType: 'SNIPER'
    },
    {
        id: 'COMPANION_ARCTIC',
        name: 'Arctic Squirrel',
        description: 'Recruit an Arctic Squirrel. Its shots slow enemies.',
        rarity: 'LEGENDARY',
        icon: '❄️',
        apply: (player: Player, state?: GameState) => spawnCompanion(player, state, 'ARCTIC'),
        companionType: 'ARCTIC'
    },
    {
        id: 'COMPANION_DESERT',
        name: 'Desert Squirrel',
        description: 'Recruit a Desert Squirrel. Burns nearby enemies every 5 seconds.',
        rarity: 'LEGENDARY',
        icon: '🔥',
        apply: (player: Player, state?: GameState) => spawnCompanion(player, state, 'DESERT'),
        companionType: 'DESERT'
    },

    // --- NEW WEAPONS ---
    {
        id: 'NUT_STORM',
        name: 'Nut Storm',
        description: 'Rains nuts from the sky, damaging random enemies on screen.',
        rarity: 'RARE',
        icon: '⛈️',
        apply: (player: Player) => {
            if (!findWeapon(player, 'NUT_STORM')) {
                player.weapons.push({
                    type: 'NUT_STORM',
                    level: 1,
                    damage: 20,
                    cooldown: 60, // 1 sec
                    cooldownTimer: 0,
                    area: 10,
                    speed: 12,
                    amount: 3,
                    damageType: 'PHYSICAL',
                    statusChance: 0,
                    statusPower: 0,
                    statusDuration: 0
                });
            } else {
                const w = findWeapon(player, 'NUT_STORM')!;
                w.amount += 2;
                w.damage += 5;
            }
        }
    },
    {
        id: 'NUT_BARRAGE',
        name: 'Nut Barrage',
        description: 'Rapid-fire stream of nuts. High DPS, low cooldown.',
        rarity: 'RARE',
        icon: '🔫',
        apply: (player: Player) => {
            if (!findWeapon(player, 'NUT_BARRAGE')) {
                player.weapons.push({
                    type: 'NUT_BARRAGE',
                    level: 1,
                    damage: 8,
                    cooldown: 8, // Very fast
                    cooldownTimer: 0,
                    area: 3,
                    speed: 15,
                    amount: 1,
                    damageType: 'PHYSICAL',
                    statusChance: 0,
                    statusPower: 0,
                    statusDuration: 0
                });
            } else {
                const w = findWeapon(player, 'NUT_BARRAGE')!;
                w.damage += 3;
                w.amount += 1; // More bullets per volley
            }
        }
    },
    {
        id: 'LEAF_SWARM',
        name: 'Leaf Swarm',
        description: 'Releases swirling leaves that push enemies away.',
        rarity: 'EPIC',
        icon: '🍃',
        apply: (player: Player) => {
            if (!findWeapon(player, 'LEAF_SWARM')) {
                player.weapons.push({
                    type: 'LEAF_SWARM',
                    level: 1,
                    damage: 12,
                    cooldown: 120, 
                    cooldownTimer: 0,
                    area: 12,
                    speed: 6,
                    amount: 3,
                    duration: 180, // 3 seconds
                    damageType: 'WIND',
                    statusType: 'SLOW',
                    statusChance: 1.0,
                    statusPower: 0.2,
                    statusDuration: 30
                });
            } else {
                const w = findWeapon(player, 'LEAF_SWARM')!;
                w.amount += 2;
                w.damage += 5;
            }
        }
    },

    // --- EXISTING WEAPONS ---
    {
        id: 'CROW_AURA',
        name: 'Murder of Crows',
        description: 'Summons a flock of crows that orbit you and damage enemies.',
        rarity: 'EPIC',
        icon: '🐦‍⬛',
        apply: (player: Player) => {
            if (!findWeapon(player, 'CROW_AURA')) {
                const newWeapon: Weapon = {
                    type: 'CROW_AURA',
                    level: 1,
                    damage: 8, 
                    cooldown: 15, // Damage tick rate (every 0.25s)
                    cooldownTimer: 0,
                    area: 100, // Orbit Radius (Base)
                    speed: 0.04, // Rotation Speed
                    amount: 2, // Number of Crows
                    duration: 0, // Persistent
                    damageType: 'PHYSICAL',
                    statusChance: 0,
                    statusPower: 0,
                    statusDuration: 0
                };
                player.weapons.push(newWeapon);
            } else {
                // Upgrade existing: More crows, bigger radius, more damage
                const crowAura = findWeapon(player, 'CROW_AURA')!;
                crowAura.level++;
                crowAura.amount += 1;
                crowAura.area += 20;
                crowAura.damage += 4;
            }
        },
    },
    {
        id: 'ACORN_CANNON',
        name: 'Acorn Cannon',
        description: 'Unlocks a heavy cannon that fires explosive acorns. Causes Burn.',
        rarity: 'EPIC',
        icon: '💣',
        apply: (player: Player) => {
             if (!findWeapon(player, 'ACORN_CANNON')) {
                const newWeapon: Weapon = {
                    type: 'ACORN_CANNON',
                    level: 1,
                    damage: 30,
                    cooldown: 120, // 2 seconds
                    cooldownTimer: 0,
                    area: 60, // Explosion radius
                    speed: 7,
                    amount: 1,
                    damageType: 'FIRE',
                    statusType: 'BURN',
                    statusChance: 1.0,
                    statusPower: 5, // Burn damage per tick
                    statusDuration: 180 // 3 seconds
                };
                player.weapons.push(newWeapon);
            } else {
                const cannon = findWeapon(player, 'ACORN_CANNON')!;
                cannon.damage += 10;
                cannon.area *= 1.1;
                cannon.statusPower += 2;
            }
        }
    },
    {
        id: 'PINE_NEEDLE',
        name: 'Pine Needle Gatling',
        description: 'Rapidly fires sharp pine needles. Low damage, but very high fire rate.',
        rarity: 'RARE',
        icon: '🌲',
        apply: (player: Player) => {
            if (!findWeapon(player, 'PINE_NEEDLE')) {
                player.weapons.push({
                    type: 'PINE_NEEDLE',
                    level: 1,
                    damage: 6,
                    cooldown: 8,
                    cooldownTimer: 0,
                    area: 2, // Width of needle
                    speed: 12,
                    amount: 1,
                    damageType: 'PHYSICAL',
                    statusChance: 0,
                    statusPower: 0,
                    statusDuration: 0
                });
            } else {
                const w = findWeapon(player, 'PINE_NEEDLE')!;
                w.damage += 2;
                w.cooldown = Math.max(4, w.cooldown - 1);
            }
        }
    },
    {
        id: 'SAP_PUDDLE',
        name: 'Sap Puddle',
        description: 'Drops sticky sap that slows and damages enemies over time.',
        rarity: 'RARE',
        icon: '🍯',
        apply: (player: Player) => {
            if (!findWeapon(player, 'SAP_PUDDLE')) {
                player.weapons.push({
                    type: 'SAP_PUDDLE',
                    level: 1,
                    damage: 2, // Per tick
                    cooldown: 180, // 3 seconds
                    cooldownTimer: 0,
                    area: 60, // Radius
                    speed: 0, // Stationary
                    amount: 1,
                    duration: 300, // 5 seconds
                    damageType: 'COLD',
                    statusType: 'SLOW',
                    statusChance: 1.0,
                    statusPower: 0.5, // 50% slow
                    statusDuration: 60 // 1 second lingering slow
                });
            } else {
                const w = findWeapon(player, 'SAP_PUDDLE')!;
                w.area += 15;
                w.duration += 60;
                w.damage += 1;
            }
        }
    },
    {
        id: 'BOOMERANG',
        name: 'Boomerang Twig',
        description: 'Throws a branch that returns to you, piercing all enemies in its path.',
        rarity: 'EPIC',
        icon: '🪃',
        apply: (player: Player) => {
            if (!findWeapon(player, 'BOOMERANG')) {
                player.weapons.push({
                    type: 'BOOMERANG',
                    level: 1,
                    damage: 20,
                    cooldown: 90,
                    cooldownTimer: 0,
                    area: 15, // Size
                    speed: 10,
                    amount: 1,
                    duration: 100, // Max flight time if it doesn't return
                    damageType: 'PHYSICAL',
                    statusChance: 0,
                    statusPower: 0,
                    statusDuration: 0
                });
            } else {
                const w = findWeapon(player, 'BOOMERANG')!;
                w.damage += 10;
                w.amount += 1;
            }
        }
    }
];
