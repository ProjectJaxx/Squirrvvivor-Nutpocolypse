
import { Player, Upgrade, Weapon } from './types';

const findWeapon = (player: Player, type: 'NUT_THROW' | 'CROW_AURA' | 'ACORN_CANNON' | 'FEATHER_STORM') => {
    return player.weapons.find(w => w.type === type);
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
        id: 'STAMINA_DRINK',
        name: 'Stamina Drink',
        description: 'Increases max stamina by 25 for more sprinting.',
        rarity: 'COMMON',
        icon: '🥤',
        apply: (player: Player) => {
            player.maxStamina = (player.maxStamina || 100) + 25;
            player.stamina = (player.stamina || 100) + 25;
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
    // --- CROW AURA ---
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
    // --- ACORN CANNON ---
    {
        id: 'ACORN_CANNON',
        name: 'Acorn Cannon',
        description: 'Unlocks a heavy cannon that fires explosive acorns.',
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
                };
                player.weapons.push(newWeapon);
            } else {
                const cannon = findWeapon(player, 'ACORN_CANNON')!;
                cannon.damage += 10;
                cannon.area *= 1.1;
            }
        }
    },
    {
        id: 'BIGGER_EXPLOSIONS',
        name: 'Bigger Explosions',
        description: 'Increases Acorn Cannon explosion radius by 30% and damage by 20.',
        rarity: 'RARE',
        icon: '💥',
        apply: (player: Player) => {
            const cannon = findWeapon(player, 'ACORN_CANNON');
            if (cannon) {
                cannon.area *= 1.3; // +30% radius
                cannon.damage += 20;
            }
        }
    },
    {
        id: 'FASTER_FIRING',
        name: 'Rapid Cannon',
        description: 'Reduces Acorn Cannon cooldown by 25%.',
        rarity: 'RARE',
        icon: '⌛',
        apply: (player: Player) => {
            const cannon = findWeapon(player, 'ACORN_CANNON');
            if (cannon) {
                cannon.cooldown = Math.max(20, cannon.cooldown * 0.75);
            }
        }
    }
];
