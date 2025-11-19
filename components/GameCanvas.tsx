
import React, { useEffect, useRef } from 'react';
import { GameState, Entity, Upgrade, SquirrelCharacter, StageDuration, Obstacle, Enemy } from '../types';
import { INITIAL_GAME_STATE, CANVAS_WIDTH, COLORS, BIOME_CONFIG } from '../constants';
import { playSound } from '../services/soundService';

interface GameCanvasProps {
  onGameOver: (score: number, time: number, kills: number) => void;
  onLevelUp: (upgrades: Upgrade[], onSelect: (u: Upgrade) => void) => void;
  paused: boolean;
  character: SquirrelCharacter;
  soundEnabled: boolean;
  stageDuration: StageDuration;
  onTogglePause: () => void;
}

const getDistance = (a: {x: number, y: number}, b: {x: number, y: number}) => {
    return Math.hypot(b.x - a.x, b.y - a.y);
};

const OBSTACLE_TEMPLATES = {
    TREE: { hp: 100, destructible: false, emoji: '🌳', radius: 30, material: 'WOOD' },
    ROCK: { hp: 200, destructible: false, emoji: '🪨', radius: 25, material: 'STONE' },
    BENCH: { hp: 50, destructible: true, emoji: '🪑', radius: 15, material: 'WOOD' },
    CAR: { hp: 150, destructible: true, emoji: '🚗', radius: 35, material: 'METAL' },
    HYDRANT: { hp: 80, destructible: true, emoji: '🧯', radius: 10, material: 'METAL' },
    CRYSTAL: { hp: 60, destructible: true, emoji: '💎', radius: 15, material: 'CRYSTAL' }
};

export const GameCanvas: React.FC<GameCanvasProps> = ({
  onGameOver,
  onLevelUp,
  paused,
  character,
  soundEnabled,
  stageDuration,
  onTogglePause
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const requestRef = useRef<number>();
    const stateRef = useRef<GameState>(JSON.parse(JSON.stringify(INITIAL_GAME_STATE)));
    const keysRef = useRef<{ [key: string]: boolean }>({});

    const generateObstacles = (biome: string, bounds: {minX: number, maxX: number, minY: number, maxY: number}) => {
        const obstacles: Obstacle[] = [];
        const config = BIOME_CONFIG[biome as keyof typeof BIOME_CONFIG] || BIOME_CONFIG.PARK;
        const count = config.obstacleCount;
        
        for(let i=0; i<count; i++) {
            const x = bounds.minX + Math.random() * (bounds.maxX - bounds.minX);
            const y = bounds.minY + Math.random() * (bounds.maxY - bounds.minY);
            
            // Skip spawn area
            if (Math.hypot(x, y) < 200) continue;

            let template = OBSTACLE_TEMPLATES.TREE;
            const roll = Math.random();
            
            if (biome === 'PARK') {
                if (roll > 0.7) template = OBSTACLE_TEMPLATES.BENCH;
                else if (roll > 0.9) template = OBSTACLE_TEMPLATES.ROCK;
            } else if (biome === 'PARKING_LOT') {
                template = OBSTACLE_TEMPLATES.CAR;
                if (roll > 0.8) template = OBSTACLE_TEMPLATES.HYDRANT;
            } else if (biome === 'MARS') {
                template = OBSTACLE_TEMPLATES.ROCK;
                if (roll > 0.8) template = OBSTACLE_TEMPLATES.CRYSTAL;
            }

            obstacles.push({
                id: `obs-${i}`,
                x, y,
                radius: template.radius,
                type: 'OBSTACLE',
                color: '#ffffff', // Unused largely due to emoji
                emoji: template.emoji,
                hp: template.hp,
                maxHp: template.hp,
                destructible: template.destructible,
                rotation: Math.random() * Math.PI * 2,
                material: template.material as any
            });
        }
        return obstacles;
    };

    // Initialize game state with character details
    useEffect(() => {
        const state = stateRef.current;
        state.player.characterId = character.id;
        state.player.hp = character.hp;
        state.player.maxHp = character.hp;
        state.player.speed = character.speed;
        state.player.color = character.color;
        state.player.emoji = character.emoji;
        state.player.filter = character.filter;
        state.player.weapons[0].cooldownTimer = 0; // Reset weapon cooldown
        
        // Reset run state
        state.time = 0;
        state.score = 0;
        state.kills = 0;
        state.wave = 1;
        state.enemies = [];
        state.projectiles = [];
        state.drops = [];
        state.particles = [];
        state.texts = [];
        state.bossWarningTimer = 0;
        state.player.x = 0;
        state.player.y = 0;
        state.obstacles = generateObstacles(state.biome, state.mapBounds);
    }, [character]);

    // Input handling
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            keysRef.current[e.key] = true;
            if (e.key === 'Escape') onTogglePause();
        };
        const handleKeyUp = (e: KeyboardEvent) => {
            keysRef.current[e.key] = false;
        };
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [onTogglePause]);

    const update = () => {
        if (paused) return;
        const state = stateRef.current;
        state.time++;

        // Boss Warning Logic (Every 90 seconds)
        const BOSS_WAVE_INTERVAL = 5400; // 90s at 60fps
        const WARNING_DURATION = 240; // 4s warning

        if (state.time > 60 && state.time % BOSS_WAVE_INTERVAL === (BOSS_WAVE_INTERVAL - WARNING_DURATION)) {
            state.bossWarningTimer = WARNING_DURATION;
            if (soundEnabled) playSound('WARNING');
        }

        if (state.bossWarningTimer > 0) {
            state.bossWarningTimer--;
        }

        // Spawn Boss
        if (state.time > 60 && state.time % BOSS_WAVE_INTERVAL === 0) {
             const angle = Math.random() * Math.PI * 2;
             const dist = 800;
             const spawnX = state.player.x + Math.cos(angle) * dist;
             const spawnY = state.player.y + Math.sin(angle) * dist;
             
             const bossHp = 1000 + (state.time / 60) * 50;
             
             state.enemies.push({
                 id: `boss-${state.time}`,
                 x: spawnX,
                 y: spawnY,
                 radius: 50,
                 type: 'BOSS_ZOMBIE',
                 color: '#805AD5',
                 emoji: '🧟‍♂️',
                 hp: bossHp,
                 maxHp: bossHp,
                 speed: 2,
                 damage: 30,
                 knockback: {x:0, y:0},
                 statusEffects: []
             });
        }

        // Player Movement
        let dx = 0;
        let dy = 0;
        if (keysRef.current['w'] || keysRef.current['ArrowUp']) dy -= 1;
        if (keysRef.current['s'] || keysRef.current['ArrowDown']) dy += 1;
        if (keysRef.current['a'] || keysRef.current['ArrowLeft']) dx -= 1;
        if (keysRef.current['d'] || keysRef.current['ArrowRight']) dx += 1;

        // Pre-calculate proposed new position
        let newX = state.player.x;
        let newY = state.player.y;

        if (dx !== 0 || dy !== 0) {
            const len = Math.sqrt(dx*dx + dy*dy);
            const moveSpeed = state.player.speed;
            newX += (dx / len) * moveSpeed;
            newY += (dy / len) * moveSpeed;
            
            if (dx < 0) state.player.facing = 'LEFT';
            if (dx > 0) state.player.facing = 'RIGHT';
        }

        // Obstacle Collision (Player)
        let collision = false;
        for (const obs of state.obstacles) {
            if (getDistance({x: newX, y: newY}, obs) < state.player.radius + obs.radius) {
                collision = true;
                break;
            }
        }

        if (!collision) {
            state.player.x = newX;
            state.player.y = newY;
        }

        // Bounds check
        const bounds = state.mapBounds;
        state.player.x = Math.max(bounds.minX, Math.min(bounds.maxX, state.player.x));
        state.player.y = Math.max(bounds.minY, Math.min(bounds.maxY, state.player.y));

        // --- WEAPON LOGIC ---
        state.player.weapons.forEach(w => {
            w.cooldownTimer--;
            if (w.cooldownTimer <= 0) {
                w.cooldownTimer = w.cooldown;
                if (w.type === 'NUT_THROW') {
                    if (soundEnabled) playSound('NUT');
                    let target = null;
                    let minDist = 500;
                    for(const e of state.enemies) {
                        const d = getDistance(state.player, e);
                        if (d < minDist) { minDist = d; target = e; }
                    }
                    
                    const angle = target 
                        ? Math.atan2(target.y - state.player.y, target.x - state.player.x)
                        : (state.player.facing === 'RIGHT' ? 0 : Math.PI);
                        
                    state.projectiles.push({
                        id: Math.random().toString(),
                        x: state.player.x, y: state.player.y,
                        radius: 5,
                        type: 'NUT_SHELL',
                        color: '#FFD700',
                        velocity: { x: Math.cos(angle) * w.speed, y: Math.sin(angle) * w.speed },
                        damage: w.damage,
                        duration: 60,
                        pierce: 1,
                        rotation: 0,
                        hostile: false
                    });
                } else if (w.type === 'ACORN_CANNON') {
                    if (soundEnabled) playSound('CANNON');

                    let target = null;
                    let minDist = 600;
                    for(const e of state.enemies) {
                        const d = getDistance(state.player, e);
                        if (d < minDist) { minDist = d; target = e; }
                    }
                    
                    const angle = target 
                        ? Math.atan2(target.y - state.player.y, target.x - state.player.x)
                        : (state.player.facing === 'RIGHT' ? 0 : Math.PI);

                    state.projectiles.push({
                        id: Math.random().toString(),
                        x: state.player.x, y: state.player.y,
                        radius: 10,
                        type: 'EXPLODING_ACORN',
                        color: '#3E2723',
                        velocity: { x: Math.cos(angle) * (w.speed * 0.8), y: Math.sin(angle) * (w.speed * 0.8) },
                        damage: w.damage,
                        duration: 80,
                        pierce: 1,
                        rotation: 0,
                        hostile: false,
                        explodeRadius: 80 + (w.area * 5)
                    });
                } else if (w.type === 'CROW_AURA') {
                    if (soundEnabled) playSound('AURA');
                    
                    const radius = 100 + (w.area * 10);
                    
                    // Spawn Crow Particles for visual feedback
                    for (let k = 0; k < 2; k++) {
                        const angle = Math.random() * Math.PI * 2;
                        const dist = radius * (0.8 + Math.random() * 0.2);
                        
                        state.particles.push({
                            id: Math.random().toString(),
                            x: state.player.x + Math.cos(angle) * dist,
                            y: state.player.y + Math.sin(angle) * dist,
                            radius: 8,
                            type: 'CROW', 
                            color: '#000',
                            emoji: '🐦‍⬛',
                            velocity: { 
                                x: -Math.sin(angle) * 5, 
                                y: Math.cos(angle) * 5 
                            },
                            life: 30,
                            maxLife: 30,
                            scale: 1
                        });
                    }

                    // Area Damage
                    for(const e of state.enemies) {
                        if (getDistance(state.player, e) < radius + e.radius) {
                            e.hp -= w.damage;
                            // Throttled damage text
                            if (state.time % 10 === 0) {
                                state.texts.push({
                                    id: Math.random().toString(),
                                    x: e.x, y: e.y - 20,
                                    text: Math.floor(w.damage).toString(),
                                    life: 15,
                                    color: '#718096',
                                    velocity: {x:0, y:-1}
                                });
                            }
                        }
                    }
                }
            }
        });

        // Enemy Spawning
        const maxEnemies = 20 + Math.floor(state.time / 600); // +1 per 10s
        if (state.time % 60 === 0 && state.enemies.length < maxEnemies) {
             const angle = Math.random() * Math.PI * 2;
             const dist = Math.max(window.innerWidth, window.innerHeight) / 1.5 + 100;
             const spawnX = state.player.x + Math.cos(angle) * dist;
             const spawnY = state.player.y + Math.sin(angle) * dist;
             const roll = Math.random();

             // Swarm Rats (20% chance after 30s)
             if (state.time > 1800 && roll < 0.2) {
                 for (let i=0; i < 5; i++) {
                     state.enemies.push({
                         id: Math.random().toString(),
                         x: spawnX + (Math.random() - 0.5) * 50,
                         y: spawnY + (Math.random() - 0.5) * 50,
                         radius: 8,
                         type: 'SWARM_ZOMBIE',
                         color: '#E53E3E',
                         emoji: '🐀',
                         hp: 10 + (state.time / 600) * 2,
                         maxHp: 10 + (state.time / 600) * 2,
                         speed: 2.5 + Math.random(),
                         damage: 5,
                         knockback: {x:0, y:0},
                         statusEffects: []
                     });
                 }
             } 
             // Shield Robots (15% chance after 60s)
             else if (state.time > 3600 && roll > 0.85) {
                 state.enemies.push({
                     id: Math.random().toString(),
                     x: spawnX,
                     y: spawnY,
                     radius: 16,
                     type: 'SHIELD_ZOMBIE', // Treated as Robot
                     color: '#2B6CB0',
                     emoji: '🤖',
                     hp: 40 + (state.time / 600) * 8,
                     maxHp: 40 + (state.time / 600) * 8,
                     shieldHp: 50 + (state.time / 600) * 5,
                     maxShieldHp: 50 + (state.time / 600) * 5,
                     speed: 1.2 + Math.random() * 0.3,
                     damage: 15,
                     knockback: {x:0, y:0},
                     statusEffects: []
                 });
             }
             // Standard Zombies
             else {
                 state.enemies.push({
                     id: Math.random().toString(),
                     x: spawnX,
                     y: spawnY,
                     radius: 12,
                     type: 'ZOMBIE',
                     color: COLORS.zombie,
                     emoji: '🧟',
                     hp: 20 + (state.time / 600) * 5, // scaling HP
                     maxHp: 20 + (state.time / 600) * 5,
                     speed: 1 + Math.random() * 0.5,
                     damage: 10,
                     knockback: {x:0, y:0},
                     statusEffects: []
                 });
             }
        }

        // Enemy Logic
        for (let i = state.enemies.length - 1; i >= 0; i--) {
            const e = state.enemies[i];
            // Move towards player
            const angle = Math.atan2(state.player.y - e.y, state.player.x - e.x);
            
            let moveX = Math.cos(angle) * e.speed;
            let moveY = Math.sin(angle) * e.speed;

            // Boids-like separation (prevent stacking)
            for (let j = 0; j < state.enemies.length; j++) {
                if (i === j) continue;
                const other = state.enemies[j];
                const d = getDistance(e, other);
                if (d < e.radius + other.radius) {
                    moveX += (e.x - other.x) * 0.05;
                    moveY += (e.y - other.y) * 0.05;
                }
            }

            e.x += moveX;
            e.y += moveY;
            
            // Simple collision with player
            if (getDistance(e, state.player) < e.radius + state.player.radius) {
                 state.player.hp -= 0.1; 
                 if (state.player.hp <= 0) {
                     onGameOver(state.score, state.time, state.kills);
                     return;
                 }
            }
        }

        // Projectile Logic
        for (let i = state.projectiles.length - 1; i >= 0; i--) {
            const p = state.projectiles[i];
            p.x += p.velocity.x;
            p.y += p.velocity.y;
            p.duration--;
            
            if (p.duration <= 0) {
                state.projectiles.splice(i, 1);
                continue;
            }

            // Explosion Logic check
            if (p.type === 'EXPLODING_ACORN' && p.duration < 5) {
                 // Explode at end of life
                 if (soundEnabled) playSound('EXPLOSION');
                 state.projectiles.push({
                     id: Math.random().toString(),
                     x: p.x, y: p.y,
                     radius: p.explodeRadius || 100,
                     type: 'EXPLOSION',
                     color: '#FF4500',
                     velocity: {x:0, y:0},
                     damage: p.damage * 1.5,
                     duration: 10,
                     pierce: 999,
                     rotation: 0,
                     hostile: false
                 });
                 // Remove acorn
                 state.projectiles.splice(i, 1);
                 continue;
            }

            // Hit Obstacles
            if (!p.hostile) {
                for(let j = state.obstacles.length - 1; j >= 0; j--) {
                    const obs = state.obstacles[j];
                    if (obs.destructible && getDistance(p, obs) < p.radius + obs.radius) {
                        obs.hp -= p.damage;
                        p.pierce--;
                        if (soundEnabled) playSound('HIT');
                        
                        // Debris
                        state.particles.push({
                            id: Math.random().toString(),
                            x: obs.x, y: obs.y,
                            radius: 2,
                            type: 'FRAGMENT',
                            color: obs.material === 'WOOD' ? '#8B4513' : '#718096',
                            velocity: {x: (Math.random()-0.5)*4, y: (Math.random()-0.5)*4},
                            life: 20,
                            maxLife: 20,
                            scale: 1
                        });

                        if (obs.hp <= 0) {
                            if (soundEnabled) playSound('EXPLOSION');
                            state.obstacles.splice(j, 1);
                        }

                        if (p.pierce <= 0) break;
                    }
                }
                if (p.pierce <= 0) {
                    state.projectiles.splice(i, 1);
                    continue;
                }
            }
            
            // Hit enemies
            if (!p.hostile) {
                for (const e of state.enemies) {
                    if (getDistance(p, e) < p.radius + e.radius) {
                        
                        let damage = p.damage;
                        let hitShield = false;

                        // Check Shield
                        if (e.type === 'SHIELD_ZOMBIE' && (e.shieldHp || 0) > 0) {
                            // Angle from Enemy to Projectile
                            const angleToProj = Math.atan2(p.y - e.y, p.x - e.x);
                            // Enemy facing (towards player)
                            const enemyFacing = Math.atan2(state.player.y - e.y, state.player.x - e.x);
                            
                            // Normalize difference
                            let diff = Math.abs(angleToProj - enemyFacing);
                            if (diff > Math.PI) diff = 2 * Math.PI - diff;

                            // If projectile is within ~90 deg cone of front
                            if (diff < Math.PI / 1.5) {
                                hitShield = true;
                            }
                        }

                        if (hitShield) {
                            e.shieldHp! -= damage;
                            if (soundEnabled) playSound('HIT');
                            state.texts.push({
                                id: Math.random().toString(),
                                x: e.x, y: e.y - 20,
                                text: "BLOCKED",
                                life: 20,
                                color: '#63B3ED',
                                velocity: {x:0, y:-1}
                            });
                            if (e.shieldHp! <= 0) {
                                if (soundEnabled) playSound('EXPLOSION');
                                // Shield break particles
                                for(let k=0; k<5; k++) {
                                    state.particles.push({
                                        id: Math.random().toString(),
                                        x: e.x, y: e.y,
                                        radius: 3,
                                        type: 'SPARK',
                                        color: '#63B3ED',
                                        velocity: {x:(Math.random()-0.5)*5, y:(Math.random()-0.5)*5},
                                        life: 20, maxLife: 20, scale: 1
                                    });
                                }
                            }
                            damage = 0; // Absorbed
                        } else {
                            e.hp -= damage;
                            if (soundEnabled) playSound('HIT');
                            state.texts.push({
                                id: Math.random().toString(),
                                x: e.x, y: e.y,
                                text: Math.floor(damage).toString(),
                                life: 30,
                                color: '#fff',
                                velocity: {x:0, y:-1}
                            });
                        }

                        // Collision side effects
                        if (damage > 0 || hitShield) {
                            p.pierce--;
                            if (p.pierce <= 0) {
                                state.projectiles.splice(i, 1);
                                break; 
                            }
                        }
                    }
                }
            }
        }

        // Dead Enemies Cleanup & Drops
        for (let i = state.enemies.length - 1; i >= 0; i--) {
            if (state.enemies[i].hp <= 0) {
                state.kills++;
                state.score += 10;
                
                // Boss kill reward
                if (state.enemies[i].type.startsWith('BOSS')) {
                    state.score += 500;
                    if (soundEnabled) playSound('LEVELUP');
                    // Big drop
                    for(let k=0;k<10;k++) {
                        state.drops.push({
                            id: Math.random().toString(),
                            x: state.enemies[i].x + (Math.random()-0.5)*40,
                            y: state.enemies[i].y + (Math.random()-0.5)*40,
                            radius: 6,
                            type: 'DROP',
                            kind: 'XP',
                            value: 50,
                            color: COLORS.gem
                        });
                    }
                } else {
                    if (soundEnabled) playSound('DEATH');
                    state.drops.push({
                        id: Math.random().toString(),
                        x: state.enemies[i].x,
                        y: state.enemies[i].y,
                        radius: 5,
                        type: 'DROP',
                        kind: 'XP',
                        value: 10,
                        color: COLORS.gem
                    });
                }
                
                state.enemies.splice(i, 1);
            }
        }

        // Drops Logic
        for (let i = state.drops.length - 1; i >= 0; i--) {
            const d = state.drops[i];
            const dist = getDistance(d, state.player);
            if (dist < 150) { // Magnet
                d.x += (state.player.x - d.x) * 0.1;
                d.y += (state.player.y - d.y) * 0.1;
            }
            if (dist < state.player.radius + d.radius) {
                if (soundEnabled) playSound('COLLECT');
                if (d.kind === 'XP') {
                    state.player.xp += d.value;
                    if (state.player.xp >= state.player.nextLevelXp) {
                        state.player.level++;
                        state.player.xp -= state.player.nextLevelXp;
                        state.player.nextLevelXp = Math.floor(state.player.nextLevelXp * 1.2);
                        if (soundEnabled) playSound('LEVELUP');
                        
                        // Mock Upgrades
                        const upgrades: Upgrade[] = [
                            {
                                id: 'dmg', name: 'Damage Boost', description: '+20% Damage', rarity: 'COMMON', icon: '⚔️',
                                apply: (p) => p.weapons.forEach(w => w.damage *= 1.2)
                            },
                            {
                                id: 'crow', name: 'Murder of Crows', description: 'Summon a defensive aura.', rarity: 'EPIC', icon: '🐦‍⬛',
                                apply: (p) => {
                                    if(!p.weapons.find(w => w.type === 'CROW_AURA')) {
                                        p.weapons.push({
                                            type: 'CROW_AURA', level: 1, cooldown: 30, cooldownTimer: 0,
                                            damage: 5, area: 5, speed: 0, amount: 1
                                        });
                                    } else {
                                        const w = p.weapons.find(w => w.type === 'CROW_AURA')!;
                                        w.level++; w.area += 2; w.damage += 2;
                                    }
                                }
                            },
                            {
                                id: 'cannon', name: 'Acorn Cannon', description: 'Explosive nuts!', rarity: 'LEGENDARY', icon: '💣',
                                apply: (p) => {
                                     if(!p.weapons.find(w => w.type === 'ACORN_CANNON')) {
                                        p.weapons.push({
                                            type: 'ACORN_CANNON', level: 1, cooldown: 120, cooldownTimer: 0,
                                            damage: 50, area: 5, speed: 10, amount: 1
                                        });
                                     } else {
                                        const w = p.weapons.find(w => w.type === 'ACORN_CANNON')!;
                                        w.level++; w.damage += 20; w.cooldown *= 0.9;
                                     }
                                }
                            }
                        ];
                        onLevelUp(upgrades, (u) => { u.apply(state.player); });
                    }
                }
                state.drops.splice(i, 1);
            }
        }

        // Particle Logic
        for (let i = state.particles.length - 1; i >= 0; i--) {
            const p = state.particles[i];
            p.life--;
            p.x += p.velocity.x;
            p.y += p.velocity.y;
            if (p.life <= 0) state.particles.splice(i, 1);
        }

        // Floating Texts
        for (let i = state.texts.length - 1; i >= 0; i--) {
             state.texts[i].life--;
             state.texts[i].x += state.texts[i].velocity.x;
             state.texts[i].y += state.texts[i].velocity.y;
             if (state.texts[i].life <= 0) state.texts.splice(i, 1);
        }
    };

    const draw = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        if (canvas.width !== window.innerWidth || canvas.height !== window.innerHeight) {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        }

        const state = stateRef.current;
        const camX = state.player.x - canvas.width / 2;
        const camY = state.player.y - canvas.height / 2;

        // BG
        ctx.fillStyle = BIOME_CONFIG[state.biome].bgColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Grid
        ctx.strokeStyle = 'rgba(0,0,0,0.1)';
        ctx.lineWidth = 2;
        const gridSize = 100;
        for (let x = Math.floor(camX / gridSize) * gridSize; x < camX + canvas.width; x += gridSize) {
             ctx.beginPath(); ctx.moveTo(x - camX, 0); ctx.lineTo(x - camX, canvas.height); ctx.stroke();
        }
        for (let y = Math.floor(camY / gridSize) * gridSize; y < camY + canvas.height; y += gridSize) {
             ctx.beginPath(); ctx.moveTo(0, y - camY); ctx.lineTo(canvas.width, y - camY); ctx.stroke();
        }

        // Draw Aura Range
        const auraWeapon = state.player.weapons.find(w => w.type === 'CROW_AURA');
        if (auraWeapon) {
            const radius = 100 + (auraWeapon.area * 10);
            ctx.beginPath();
            ctx.arc(state.player.x - camX, state.player.y - camY, radius, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
            ctx.fill();
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
            ctx.lineWidth = 1;
            ctx.stroke();
        }

        const drawEntity = (e: Entity) => {
             ctx.beginPath();
             ctx.arc(e.x - camX, e.y - camY, e.radius, 0, Math.PI * 2);
             ctx.fillStyle = e.color;
             ctx.fill();
             if (e.emoji) {
                 ctx.save();
                 if ((e as any).rotation) {
                    ctx.translate(e.x - camX, e.y - camY);
                    ctx.rotate((e as any).rotation);
                    ctx.translate(-(e.x - camX), -(e.y - camY));
                 }
                 // Apply filters if player
                 if (e.type === 'PLAYER' && (e as any).filter) {
                    ctx.filter = (e as any).filter;
                 }
                 ctx.font = `${e.radius * 1.4}px Arial`;
                 ctx.textAlign = 'center';
                 ctx.textBaseline = 'middle';
                 ctx.fillText(e.emoji, e.x - camX, e.y - camY);
                 ctx.restore();
             }
        };

        state.obstacles.forEach(o => {
            drawEntity(o);
            // HP Bar for destructibles if damaged
            if (o.destructible && o.hp < o.maxHp) {
                ctx.fillStyle = 'rgba(0,0,0,0.5)';
                ctx.fillRect(o.x - camX - 10, o.y - camY - o.radius - 5, 20, 3);
                ctx.fillStyle = '#ECC94B';
                ctx.fillRect(o.x - camX - 10, o.y - camY - o.radius - 5, 20 * (o.hp / o.maxHp), 3);
            }
        });

        state.drops.forEach(drawEntity);
        
        state.enemies.forEach(e => {
            drawEntity(e);
            
            // Draw Shield Arc if active
            if (e.type === 'SHIELD_ZOMBIE' && (e.shieldHp || 0) > 0) {
                const angle = Math.atan2(state.player.y - e.y, state.player.x - e.x);
                ctx.beginPath();
                // Draw a 120 degree arc in front
                ctx.arc(e.x - camX, e.y - camY, e.radius + 8, angle - Math.PI/3, angle + Math.PI/3);
                ctx.strokeStyle = '#63B3ED'; // Shield Blue
                ctx.lineWidth = 4;
                ctx.lineCap = 'round';
                ctx.stroke();
                
                // Shield HP Bar (Tiny, blue)
                ctx.fillStyle = '#63B3ED';
                ctx.fillRect(e.x - camX - 12, e.y - camY - e.radius - 12, 24 * ((e.shieldHp || 1) / (e.maxShieldHp || 1)), 3);
            }

            // HP Bar (Small per enemy)
            ctx.fillStyle = 'red';
            ctx.fillRect(e.x - camX - 12, e.y - camY - e.radius - 8, 24, 4);
            ctx.fillStyle = '#32CD32';
            ctx.fillRect(e.x - camX - 12, e.y - camY - e.radius - 8, 24 * (e.hp / e.maxHp), 4);
        });
        
        drawEntity(state.player);
        state.projectiles.forEach(p => {
            if (p.type === 'EXPLOSION') {
                ctx.globalAlpha = 0.6;
                ctx.fillStyle = '#FBD38D';
                ctx.beginPath();
                ctx.arc(p.x - camX, p.y - camY, p.radius, 0, Math.PI*2);
                ctx.fill();
                ctx.globalAlpha = 1.0;
            } else {
                drawEntity(p);
            }
        });
        
        state.particles.forEach(p => {
            if ((p as any).emoji) {
                ctx.font = `${p.radius * 2}px Arial`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.globalAlpha = p.life / p.maxLife;
                ctx.fillText((p as any).emoji, p.x - camX, p.y - camY);
                ctx.globalAlpha = 1.0;
            } else {
                ctx.beginPath();
                ctx.arc(p.x - camX, p.y - camY, p.radius * (p.life / p.maxLife), 0, Math.PI*2);
                ctx.fillStyle = p.color;
                ctx.fill();
            }
        });

        state.texts.forEach(t => {
            ctx.fillStyle = t.color;
            ctx.font = 'bold 16px Arial';
            ctx.fillText(t.text, t.x - camX, t.y - camY);
        });

        // HUD
        // Health
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(10, 10, 220, 80);
        
        ctx.fillStyle = 'white';
        ctx.font = '16px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(`HP: ${Math.ceil(state.player.hp)}/${state.player.maxHp}`, 20, 35);
        ctx.fillStyle = '#333';
        ctx.fillRect(20, 45, 200, 10);
        ctx.fillStyle = 'red';
        ctx.fillRect(20, 45, 200 * (state.player.hp / state.player.maxHp), 10);
        
        // Timer & Score
        ctx.fillStyle = 'white';
        ctx.font = '20px monospace';
        const mins = Math.floor(state.time / 60 / 60);
        const secs = Math.floor((state.time / 60) % 60);
        ctx.textAlign = 'center';
        ctx.fillText(`${mins.toString().padStart(2,'0')}:${secs.toString().padStart(2,'0')}`, canvas.width / 2, 40);
        
        ctx.textAlign = 'right';
        ctx.fillText(`Score: ${state.score}`, canvas.width - 20, 30);
        ctx.fillText(`Kills: ${state.kills}`, canvas.width - 20, 60);

        // BOSS HEALTH BAR (Global)
        const boss = state.enemies.find(e => e.type.startsWith('BOSS'));
        if (boss) {
            const barW = Math.min(600, canvas.width - 40);
            const barH = 24;
            const barX = (canvas.width - barW) / 2;
            const barY = 90;

            ctx.save();
            // Text
            ctx.fillStyle = '#E9D8FD';
            ctx.font = 'bold 16px "Russo One", sans-serif';
            ctx.textAlign = 'center';
            ctx.shadowColor = 'black';
            ctx.shadowBlur = 4;
            ctx.fillText('⚠️ BOSS DETECTED ⚠️', canvas.width / 2, barY - 10);

            // Bar Back
            ctx.fillStyle = 'rgba(0,0,0,0.8)';
            ctx.fillRect(barX, barY, barW, barH);
            ctx.strokeStyle = '#44337A';
            ctx.lineWidth = 2;
            ctx.strokeRect(barX, barY, barW, barH);

            // Bar Fill
            const pct = Math.max(0, boss.hp / boss.maxHp);
            ctx.fillStyle = '#9F7AEA'; // Purple
            ctx.fillRect(barX+2, barY+2, (barW-4)*pct, barH-4);
            
            ctx.restore();
        }

        // XP Bar
        ctx.fillStyle = '#222';
        ctx.fillRect(0, canvas.height - 16, canvas.width, 16);
        ctx.fillStyle = '#4FD1C5';
        ctx.fillRect(0, canvas.height - 16, canvas.width * (state.player.xp / state.player.nextLevelXp), 16);
        
        ctx.textAlign = 'center';
        ctx.font = '10px sans-serif';
        ctx.fillStyle = 'white';
        ctx.textBaseline = 'bottom';
        ctx.fillText(`LVL ${state.player.level}`, canvas.width / 2, canvas.height - 2);

        // Draw Boss Warning
        if (state.bossWarningTimer > 0) {
            const alpha = (state.time % 30) < 15 ? 0.8 : 0.2; // Blink
            
            ctx.save();
            // Red overlay strip
            ctx.fillStyle = `rgba(255, 0, 0, ${alpha * 0.3})`;
            ctx.fillRect(0, canvas.height / 2 - 60, canvas.width, 120);
            
            // Text
            ctx.font = 'bold 40px "Russo One", sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = `rgba(255, 50, 50, ${alpha})`;
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 4;
            ctx.strokeText('WARNING: BOSS APPROACHING', canvas.width / 2, canvas.height / 2);
            ctx.fillText('WARNING: BOSS APPROACHING', canvas.width / 2, canvas.height / 2);
            ctx.restore();
        }
    };

    const tick = () => {
        update();
        draw();
        requestRef.current = requestAnimationFrame(tick);
    };

    useEffect(() => {
        requestRef.current = requestAnimationFrame(tick);
        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, [paused, soundEnabled]);

    return <canvas ref={canvasRef} className="block bg-gray-900" />;
};
