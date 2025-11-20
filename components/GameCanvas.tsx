
import React, { useEffect, useRef } from 'react';
import { GameState, Entity, Upgrade, SquirrelCharacter, StageDuration, Obstacle, Enemy, Projectile, Player } from '../types';
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

// Helper for segment vs circle collision (finding closest point on segment)
const getClosestPointOnSegment = (p: {x: number, y: number}, a: {x: number, y: number}, b: {x: number, y: number}) => {
    const pax = p.x - a.x;
    const pay = p.y - a.y;
    const bax = b.x - a.x;
    const bay = b.y - a.y;
    const lenSq = bax*bax + bay*bay;
    if (lenSq === 0) return { x: a.x, y: a.y, t: 0 };
    const t = Math.max(0, Math.min(1, (pax * bax + pay * bay) / lenSq));
    return {
        x: a.x + t * bax,
        y: a.y + t * bay,
        t // 0..1 factor along the segment
    };
};

// OBB Collision Helper: Ray vs AABB in local space
const getRayAABBIntersection = (start: {x:number, y:number}, delta: {x:number, y:number}, halfW: number, halfH: number, padding: number) => {
    const minX = -halfW - padding;
    const maxX = halfW + padding;
    const minY = -halfH - padding;
    const maxY = halfH + padding;

    // Check if start is already inside
    if (start.x >= minX && start.x <= maxX && start.y >= minY && start.y <= maxY) {
        return 0; 
    }

    // Slab method
    let tmin = -Infinity;
    let tmax = Infinity;

    // X slab
    if (delta.x !== 0) {
        const tx1 = (minX - start.x) / delta.x;
        const tx2 = (maxX - start.x) / delta.x;
        tmin = Math.max(tmin, Math.min(tx1, tx2));
        tmax = Math.min(tmax, Math.max(tx1, tx2));
    } else if (start.x < minX || start.x > maxX) {
        return null; // Parallel and outside
    }

    // Y slab
    if (delta.y !== 0) {
        const ty1 = (minY - start.y) / delta.y;
        const ty2 = (maxY - start.y) / delta.y;
        tmin = Math.max(tmin, Math.min(ty1, ty2));
        tmax = Math.min(tmax, Math.max(ty1, ty2));
    } else if (start.y < minY || start.y > maxY) {
        return null;
    }

    if (tmax < 0) return null; // Box is behind
    if (tmin > tmax) return null; // No intersection
    
    // We only care about intersections within segment 0..1
    if (tmin > 1) return null;

    return Math.max(0, tmin);
};

const OBSTACLE_TEMPLATES = {
    // PARK
    TREE: { hp: 200, destructible: false, emoji: '🌳', radius: 30, material: 'WOOD', isCover: false },
    PINE: { hp: 180, destructible: false, emoji: '🌲', radius: 28, material: 'WOOD', isCover: false },
    ROCK: { hp: 500, destructible: false, emoji: '🪨', radius: 25, material: 'STONE', isCover: true },
    BENCH: { hp: 60, destructible: true, emoji: '🪑', radius: 15, material: 'WOOD', isCover: false, width: 50, height: 20 },
    WOODEN_FENCE: { hp: 100, destructible: true, emoji: '🪵', radius: 25, material: 'WOOD', isCover: true, width: 120, height: 15 },
    FOUNTAIN: { hp: 800, destructible: false, emoji: '⛲', radius: 35, material: 'STONE', isCover: true, emitType: 'WATER' },
    STATUE: { hp: 400, destructible: true, emoji: '🗿', radius: 20, material: 'STONE', isCover: true },
    BUSH: { hp: 30, destructible: true, emoji: '🌿', radius: 18, material: 'WOOD', isCover: false },
    FLOWER_BED: { hp: 50, destructible: true, emoji: '🌻', radius: 25, material: 'WOOD', isCover: false, width: 60, height: 60 },
    LAMP_POST: { hp: 150, destructible: false, emoji: '💡', radius: 10, material: 'METAL', isCover: false },
    PICNIC_TABLE: { hp: 100, destructible: true, emoji: '🧺', radius: 25, material: 'WOOD', isCover: true, width: 50, height: 50 },

    // PARKING LOT
    CAR: { hp: 300, destructible: true, emoji: '🚗', radius: 35, material: 'METAL', isCover: true, width: 40, height: 80, explosive: true, explodeDamage: 40, explodeRadius: 80 },
    TRUCK: { hp: 900, destructible: true, emoji: '🚛', radius: 55, material: 'METAL', isCover: true, width: 60, height: 160, explosive: true, explodeDamage: 80, explodeRadius: 120 },
    BUS: { hp: 600, destructible: true, emoji: '🚌', radius: 50, material: 'METAL', isCover: true, width: 50, height: 140 },
    HYDRANT: { hp: 100, destructible: true, emoji: '🧯', radius: 10, material: 'METAL', isCover: false, emitType: 'WATER' },
    CONE: { hp: 20, destructible: true, emoji: '⚠️', radius: 10, material: 'WOOD', isCover: false }, 
    BARRIER: { hp: 250, destructible: true, emoji: '🚧', radius: 25, material: 'METAL', isCover: true, width: 100, height: 15 },
    TRASH: { hp: 80, destructible: true, emoji: '🗑️', radius: 15, material: 'METAL', isCover: false },
    OIL_DRUM: { hp: 60, destructible: true, emoji: '🛢️', radius: 18, material: 'METAL', isCover: true, explosive: true, explodeDamage: 100, explodeRadius: 150 },
    TIRE_STACK: { hp: 150, destructible: true, emoji: '⚫', radius: 20, material: 'WOOD', isCover: true }, 
    SHOPPING_CART: { hp: 40, destructible: true, emoji: '🛒', radius: 15, material: 'METAL', isCover: false },

    // MARS
    MARS_ROCK: { hp: 600, destructible: false, emoji: '🪨', radius: 30, material: 'STONE', isCover: true },
    CRYSTAL: { hp: 80, destructible: true, emoji: '💎', radius: 15, material: 'CRYSTAL', isCover: true, explosive: true, explodeDamage: 40, explodeRadius: 80, emitType: 'GLITTER' },
    CRYSTAL_SPIRE: { hp: 500, destructible: true, emoji: '🔮', radius: 30, material: 'CRYSTAL', isCover: true, emitType: 'GLITTER' },
    ALIEN_PLANT: { hp: 120, destructible: true, emoji: '🌵', radius: 20, material: 'FLESH', isCover: false },
    ROVER: { hp: 350, destructible: true, emoji: '🛰️', radius: 30, material: 'METAL', isCover: true, width: 50, height: 60, emitType: 'SMOKE' },
    CRASHED_PROBE: { hp: 250, destructible: true, emoji: '🛸', radius: 35, material: 'METAL', isCover: true, emitType: 'SMOKE' },
    MONOLITH: { hp: 9999, destructible: false, emoji: '⬛', radius: 25, material: 'STONE', isCover: true, width: 30, height: 80 },
    SOLAR_PANEL: { hp: 80, destructible: true, emoji: '⚡', radius: 25, material: 'METAL', isCover: true, width: 60, height: 30, explosive: true, explodeDamage: 60, explodeRadius: 90 },
    CRATER_RIM: { hp: 500, destructible: false, emoji: '🌋', radius: 30, material: 'STONE', isCover: true },
    
    // GENERIC
    DEBRIS: { hp: 150, destructible: true, emoji: '🏚️', radius: 25, material: 'STONE', isCover: true }
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
    
    // Joystick State
    const joystickRef = useRef<{
        active: boolean;
        origin: {x: number, y: number};
        current: {x: number, y: number};
        vector: {x: number, y: number};
        id: number | null;
    }>({ active: false, origin: {x:0, y:0}, current: {x:0, y:0}, vector: {x:0, y:0}, id: null });

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
                if (roll < 0.20) template = OBSTACLE_TEMPLATES.TREE;
                else if (roll < 0.30) template = OBSTACLE_TEMPLATES.PINE;
                else if (roll < 0.40) template = OBSTACLE_TEMPLATES.WOODEN_FENCE;
                else if (roll < 0.45) template = OBSTACLE_TEMPLATES.FLOWER_BED;
                else if (roll < 0.55) template = OBSTACLE_TEMPLATES.BENCH;
                else if (roll < 0.65) template = OBSTACLE_TEMPLATES.ROCK;
                else if (roll < 0.70) template = OBSTACLE_TEMPLATES.STATUE;
                else if (roll < 0.75) template = OBSTACLE_TEMPLATES.FOUNTAIN;
                else if (roll < 0.85) template = OBSTACLE_TEMPLATES.PICNIC_TABLE;
                else if (roll < 0.90) template = OBSTACLE_TEMPLATES.LAMP_POST;
                else template = OBSTACLE_TEMPLATES.BUSH;
            } else if (biome === 'PARKING_LOT') {
                if (roll < 0.20) template = OBSTACLE_TEMPLATES.CAR;
                else if (roll < 0.30) template = OBSTACLE_TEMPLATES.TRUCK;
                else if (roll < 0.35) template = OBSTACLE_TEMPLATES.BUS;
                else if (roll < 0.45) template = OBSTACLE_TEMPLATES.BARRIER;
                else if (roll < 0.55) template = OBSTACLE_TEMPLATES.OIL_DRUM;
                else if (roll < 0.60) template = OBSTACLE_TEMPLATES.CONE;
                else if (roll < 0.70) template = OBSTACLE_TEMPLATES.TIRE_STACK;
                else if (roll < 0.80) template = OBSTACLE_TEMPLATES.SHOPPING_CART;
                else if (roll < 0.90) template = OBSTACLE_TEMPLATES.TRASH;
                else template = OBSTACLE_TEMPLATES.HYDRANT;
            } else if (biome === 'MARS') {
                if (roll < 0.20) template = OBSTACLE_TEMPLATES.MARS_ROCK;
                else if (roll < 0.35) template = OBSTACLE_TEMPLATES.CRYSTAL;
                else if (roll < 0.45) template = OBSTACLE_TEMPLATES.CRYSTAL_SPIRE;
                else if (roll < 0.55) template = OBSTACLE_TEMPLATES.ALIEN_PLANT;
                else if (roll < 0.65) template = OBSTACLE_TEMPLATES.ROVER;
                else if (roll < 0.75) template = OBSTACLE_TEMPLATES.CRASHED_PROBE;
                else if (roll < 0.80) template = OBSTACLE_TEMPLATES.SOLAR_PANEL;
                else if (roll < 0.90) template = OBSTACLE_TEMPLATES.CRATER_RIM;
                else if (roll < 0.95) template = OBSTACLE_TEMPLATES.MONOLITH;
                else template = OBSTACLE_TEMPLATES.DEBRIS;
            }

            obstacles.push({
                id: `obs-${i}-${Math.random()}`,
                x, y,
                radius: template.radius,
                type: 'OBSTACLE',
                color: '#ffffff', 
                emoji: template.emoji,
                hp: template.hp,
                maxHp: template.hp,
                destructible: template.destructible,
                rotation: Math.random() * Math.PI * 2,
                material: template.material as any,
                isCover: template.isCover,
                width: (template as any).width,
                height: (template as any).height,
                explosive: (template as any).explosive,
                explodeDamage: (template as any).explodeDamage,
                explodeRadius: (template as any).explodeRadius,
                emitType: (template as any).emitType
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
        state.player.weapons[0].cooldownTimer = 0;
        state.player.weapons[0].level = 1; 
        
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
        state.player.xpFlashTimer = 0;
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

    // Touch Handling (Joystick)
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const handleTouchStart = (e: TouchEvent) => {
            e.preventDefault();
            const touch = e.changedTouches[0];
            // If joystick not active, start it
            if (!joystickRef.current.active) {
                joystickRef.current.active = true;
                joystickRef.current.id = touch.identifier;
                joystickRef.current.origin = { x: touch.clientX, y: touch.clientY };
                joystickRef.current.current = { x: touch.clientX, y: touch.clientY };
                joystickRef.current.vector = { x: 0, y: 0 };
            }
        };

        const handleTouchMove = (e: TouchEvent) => {
            e.preventDefault();
            if (!joystickRef.current.active) return;
            
            for (let i = 0; i < e.changedTouches.length; i++) {
                const touch = e.changedTouches[i];
                if (touch.identifier === joystickRef.current.id) {
                    const maxDist = 50;
                    const dx = touch.clientX - joystickRef.current.origin.x;
                    const dy = touch.clientY - joystickRef.current.origin.y;
                    const dist = Math.hypot(dx, dy);
                    
                    // Clamp visual position
                    const clampedDist = Math.min(dist, maxDist);
                    const angle = Math.atan2(dy, dx);
                    
                    joystickRef.current.current = {
                        x: joystickRef.current.origin.x + Math.cos(angle) * clampedDist,
                        y: joystickRef.current.origin.y + Math.sin(angle) * clampedDist
                    };

                    // Normalize vector
                    if (dist > 5) {
                        joystickRef.current.vector = {
                            x: Math.cos(angle),
                            y: Math.sin(angle)
                        };
                    } else {
                        joystickRef.current.vector = { x: 0, y: 0 };
                    }
                }
            }
        };

        const handleTouchEnd = (e: TouchEvent) => {
            e.preventDefault();
            for (let i = 0; i < e.changedTouches.length; i++) {
                if (e.changedTouches[i].identifier === joystickRef.current.id) {
                    joystickRef.current.active = false;
                    joystickRef.current.id = null;
                    joystickRef.current.vector = { x: 0, y: 0 };
                }
            }
        };

        canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
        canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
        canvas.addEventListener('touchend', handleTouchEnd, { passive: false });

        return () => {
            canvas.removeEventListener('touchstart', handleTouchStart);
            canvas.removeEventListener('touchmove', handleTouchMove);
            canvas.removeEventListener('touchend', handleTouchEnd);
        };
    }, []);

    const update = () => {
        if (paused) return;
        const state = stateRef.current;
        state.time++;

        // --- AMBIENT PARTICLES ---
        if (state.time % 10 === 0) {
             const camX = state.player.x - window.innerWidth / 2;
             const camY = state.player.y - window.innerHeight / 2;
             const spawnX = camX + Math.random() * window.innerWidth;
             const spawnY = camY + Math.random() * window.innerHeight;

             if (state.biome === 'PARK') {
                 // Leaves
                 if (Math.random() < 0.3) {
                     state.particles.push({
                        id: `amb-leaf-${Math.random()}`,
                        x: spawnX, y: spawnY,
                        radius: 6 + Math.random() * 2,
                        type: 'SMOKE', 
                        color: '#fff',
                        emoji: Math.random() > 0.5 ? '🍃' : '🍂',
                        velocity: { x: (Math.random()-0.5)*2, y: 1 + Math.random() },
                        life: 300, maxLife: 300, scale: 1
                     });
                 }
                 // Fireflies
                 if (Math.random() < 0.2) {
                     state.particles.push({
                        id: `amb-fly-${Math.random()}`,
                        x: spawnX, y: spawnY,
                        radius: 2,
                        type: 'SPARK',
                        color: '#FAF089',
                        velocity: { x: (Math.random()-0.5)*0.5, y: (Math.random()-0.5)*0.5 },
                        life: 120, maxLife: 120, scale: 1
                     });
                 }
             } else if (state.biome === 'PARKING_LOT') {
                 // Dust
                 if (Math.random() < 0.5) {
                     state.particles.push({
                        id: `amb-dust-${Math.random()}`,
                        x: spawnX, y: spawnY,
                        radius: Math.random() * 3 + 1,
                        type: 'SMOKE', 
                        color: 'rgba(200, 200, 200, 0.4)',
                        velocity: { x: 2 + Math.random(), y: (Math.random()-0.5)*0.2 },
                        life: 200, maxLife: 200, scale: 1
                     });
                 }
             } else if (state.biome === 'MARS') {
                 // Red Dust
                 if (Math.random() < 0.5) {
                     state.particles.push({
                        id: `amb-mdust-${Math.random()}`,
                        x: spawnX, y: spawnY,
                        radius: Math.random() * 3 + 1,
                        type: 'SMOKE',
                        color: 'rgba(252, 129, 129, 0.3)',
                        velocity: { x: -3 - Math.random(), y: (Math.random()-0.5)*0.5 },
                        life: 200, maxLife: 200, scale: 1
                     });
                 }
             }
        }

        // --- OBSTACLE EMITTERS ---
        if (state.time % 20 === 0) {
            state.obstacles.forEach(obs => {
                if (obs.emitType) {
                    const dist = getDistance(obs, state.player);
                    if (dist > 800) return; // Optimization

                    if (obs.emitType === 'SMOKE' && Math.random() < 0.3) {
                         state.particles.push({
                            id: `obs-smk-${Math.random()}`,
                            x: obs.x + (Math.random()-0.5) * obs.radius,
                            y: obs.y - obs.radius * 0.5,
                            radius: Math.random() * 4 + 2,
                            type: 'SMOKE',
                            color: 'rgba(100, 100, 100, 0.4)',
                            velocity: { x: (Math.random()-0.5), y: -1 - Math.random() },
                            life: 100, maxLife: 100, scale: 1
                         });
                    } else if (obs.emitType === 'WATER' && Math.random() < 0.5) {
                         state.particles.push({
                            id: `obs-wtr-${Math.random()}`,
                            x: obs.x, y: obs.y - 10,
                            radius: Math.random() * 2 + 1,
                            type: 'SPARK',
                            color: '#63B3ED',
                            velocity: { x: (Math.random()-0.5)*2, y: -3 - Math.random() },
                            life: 40, maxLife: 40, scale: 1
                         });
                    } else if (obs.emitType === 'GLITTER' && Math.random() < 0.2) {
                         state.particles.push({
                            id: `obs-gli-${Math.random()}`,
                            x: obs.x + (Math.random()-0.5) * obs.radius,
                            y: obs.y + (Math.random()-0.5) * obs.radius,
                            radius: Math.random() * 2 + 1,
                            type: 'SPARK',
                            color: '#F6E05E',
                            velocity: { x: 0, y: -0.5 },
                            life: 30, maxLife: 30, scale: 1
                         });
                    }
                }
            });
        }

        // Decrease XP Flash Timer
        if (state.player.xpFlashTimer && state.player.xpFlashTimer > 0) {
            state.player.xpFlashTimer--;
        }

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

        // Spawn Boss Logic
        if (state.time > 60 && state.time % BOSS_WAVE_INTERVAL === 0) {
             const angle = Math.random() * Math.PI * 2;
             const dist = 800;
             const spawnX = state.player.x + Math.cos(angle) * dist;
             const spawnY = state.player.y + Math.sin(angle) * dist;
             
             const bossCount = Math.round(state.time / BOSS_WAVE_INTERVAL);
             const scaling = state.time / 60;
             
             let bossType: any = 'BOSS_ZOMBIE';
             let bossEmoji = '🧟‍♂️';
             let bossHp = 1000 + scaling * 50;
             let bossColor = '#805AD5'; // Purple
             let bossSpeed = 2;
             
             const cycle = bossCount % 3;
             
             if (cycle === 0) {
                bossType = 'BOSS_ALIEN';
                bossEmoji = '👽';
                bossHp = 3000 + scaling * 80; 
                bossColor = '#D53F8C'; 
                bossSpeed = 1.5;
             } else if (cycle === 2) {
                bossType = 'BOSS_ROBOT';
                bossEmoji = '🤖';
                bossHp = 2000 + scaling * 60;
                bossColor = '#718096'; 
                bossSpeed = 1.8;
             }

             state.enemies.push({
                 id: `boss-${state.time}`,
                 x: spawnX,
                 y: spawnY,
                 radius: 50,
                 type: bossType,
                 color: bossColor,
                 emoji: bossEmoji,
                 hp: bossHp,
                 maxHp: bossHp,
                 speed: bossSpeed,
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

        if (joystickRef.current.active) {
            dx = joystickRef.current.vector.x;
            dy = joystickRef.current.vector.y;
        }

        let newX = state.player.x;
        let newY = state.player.y;

        if (dx !== 0 || dy !== 0) {
            const len = Math.sqrt(dx*dx + dy*dy);
            const moveSpeed = state.player.speed;
            
            if (len > 0) {
                if (joystickRef.current.active) {
                    newX += dx * moveSpeed;
                    newY += dy * moveSpeed;
                } else {
                    newX += (dx / len) * moveSpeed;
                    newY += (dy / len) * moveSpeed;
                }
            }
            
            if (dx < -0.1) state.player.facing = 'LEFT';
            if (dx > 0.1) state.player.facing = 'RIGHT';
        }

        // Player vs Obstacle Collision (Circle-Circle approximation for now suffices for player movement feel)
        let collision = false;
        for (const obs of state.obstacles) {
            // Simple radius check for player movement for smoothness
            const combinedRadius = (obs.width ? Math.max(obs.width, obs.height!) / 1.5 : obs.radius) + state.player.radius;
            if (getDistance({x: newX, y: newY}, obs) < combinedRadius) {
                collision = true;
                break;
            }
        }

        if (!collision) {
            state.player.x = newX;
            state.player.y = newY;
        }

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
                    
                    const nutSize = Math.min(15, 5 + (w.level * 1.5));

                    state.projectiles.push({
                        id: Math.random().toString(),
                        x: state.player.x, y: state.player.y,
                        radius: nutSize,
                        type: 'NUT_SHELL',
                        color: '#FFD700',
                        velocity: { x: Math.cos(angle) * w.speed, y: Math.sin(angle) * w.speed },
                        damage: w.damage,
                        duration: 60,
                        pierce: 1,
                        rotation: 0,
                        hostile: false,
                        hitIds: []
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
                        explodeRadius: 80 + (w.area * 5),
                        hitIds: []
                    });
                } else if (w.type === 'CROW_AURA') {
                    if (soundEnabled) playSound('AURA');
                    
                    const radius = 100 + (w.area * 10);
                    const crowCount = 2 + Math.floor(w.level / 2);
                    
                    for (let k = 0; k < crowCount; k++) {
                        const angle = Math.random() * Math.PI * 2;
                        const dist = radius * (0.8 + Math.random() * 0.2);
                        
                        state.particles.push({
                            id: Math.random().toString(),
                            x: state.player.x + Math.cos(angle) * dist,
                            y: state.player.y + Math.sin(angle) * dist,
                            radius: 8 + Math.random() * 4,
                            type: 'CROW', 
                            color: '#000',
                            emoji: '🐦‍⬛',
                            velocity: { 
                                x: -Math.sin(angle) * 5, 
                                y: Math.cos(angle) * 5 
                            },
                            life: 35, 
                            maxLife: 35,
                            scale: 1
                        });
                    }

                    for(const e of state.enemies) {
                        if (getDistance(state.player, e) < radius + e.radius) {
                            e.hp -= w.damage;
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
        const maxEnemies = 20 + Math.floor(state.time / 600);
        if (state.time % 60 === 0 && state.enemies.length < maxEnemies) {
             const angle = Math.random() * Math.PI * 2;
             const dist = Math.max(window.innerWidth, window.innerHeight) / 1.5 + 100;
             const spawnX = state.player.x + Math.cos(angle) * dist;
             const spawnY = state.player.y + Math.sin(angle) * dist;
             const roll = Math.random();

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
             } else if (state.time > 3600 && roll > 0.85) {
                 state.enemies.push({
                     id: Math.random().toString(),
                     x: spawnX,
                     y: spawnY,
                     radius: 16,
                     type: 'SHIELD_ZOMBIE',
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
             } else {
                 state.enemies.push({
                     id: Math.random().toString(),
                     x: spawnX,
                     y: spawnY,
                     radius: 12,
                     type: 'ZOMBIE',
                     color: COLORS.zombie,
                     emoji: '🧟',
                     hp: 20 + (state.time / 600) * 5,
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
            if (e.hitFlashTimer && e.hitFlashTimer > 0) e.hitFlashTimer--;
            
            const angleToPlayer = Math.atan2(state.player.y - e.y, state.player.x - e.x);
            let moveX = Math.cos(angleToPlayer) * e.speed;
            let moveY = Math.sin(angleToPlayer) * e.speed;

            let separationX = 0;
            let separationY = 0;
            
            let swarmCount = 0;
            let swarmCenterX = 0;
            let swarmCenterY = 0;
            const flockRadius = 150;
            
            for (let j = 0; j < state.enemies.length; j++) {
                if (i === j) continue;
                const other = state.enemies[j];
                const dist = getDistance(e, other);

                if (dist < e.radius + other.radius) {
                     separationX += (e.x - other.x);
                     separationY += (e.y - other.y);
                }
                
                if (e.type === 'SWARM_ZOMBIE' && other.type === 'SWARM_ZOMBIE' && dist < flockRadius) {
                    swarmCount++;
                    swarmCenterX += other.x;
                    swarmCenterY += other.y;
                }
            }
            
            const pushStrength = 0.05;
            moveX += separationX * pushStrength;
            moveY += separationY * pushStrength;

            if (e.type === 'SWARM_ZOMBIE' && swarmCount > 0) {
                swarmCenterX /= swarmCount;
                swarmCenterY /= swarmCount;
                const angleToCenter = Math.atan2(swarmCenterY - e.y, swarmCenterX - e.x);
                
                moveX += Math.cos(angleToCenter) * 0.4;
                moveY += Math.sin(angleToCenter) * 0.4;
                
                if (swarmCount >= 3) {
                     e.color = '#FC8181'; 
                     moveX *= 1.4; 
                     moveY *= 1.4;
                } else {
                    e.color = '#E53E3E';
                }
            } else if (e.type === 'SWARM_ZOMBIE') {
                e.color = '#E53E3E';
            }

            e.x += moveX;
            e.y += moveY;

            if (e.type === 'BOSS_ALIEN') {
                if (e.attackTimer === undefined) e.attackTimer = 0;
                e.attackTimer--;
                
                if (e.attackTimer <= 0) {
                    e.attackTimer = 90; 
                    if (soundEnabled) playSound('CANNON');
                    
                    const laserAngle = Math.atan2(state.player.y - e.y, state.player.x - e.x);
                    state.projectiles.push({
                        id: `laser-${Math.random()}`,
                        x: e.x, y: e.y,
                        radius: 6,
                        type: 'LASER',
                        color: '#00FF00', 
                        velocity: { 
                            x: Math.cos(laserAngle) * 10, 
                            y: Math.sin(laserAngle) * 10 
                        },
                        damage: 20,
                        duration: 120,
                        pierce: 1,
                        rotation: laserAngle,
                        hostile: true,
                        hitIds: []
                    });
                }
            }

            if (e.type.startsWith('BOSS')) {
                 if (Math.random() < 0.3) {
                     const angle = Math.random() * Math.PI * 2;
                     const r = e.radius * (1 + Math.random() * 0.5);
                     state.particles.push({
                        id: `bp-${Math.random()}`,
                        x: e.x + Math.cos(angle) * r,
                        y: e.y + Math.sin(angle) * r,
                        radius: Math.random() * 3 + 1,
                        type: 'SPARK',
                        color: e.color,
                        velocity: {
                            x: Math.cos(angle) * 0.5,
                            y: -1 - Math.random()
                        },
                        life: 40,
                        maxLife: 40,
                        scale: 1
                     });
                 }
            }
            
            if (getDistance(e, state.player) < e.radius + state.player.radius) {
                 state.player.hp -= 0.1; 
                 if (state.player.hp <= 0) {
                     onGameOver(state.score, state.time, state.kills);
                     return;
                 }
            }
        }

        // --- REFINED PROJECTILE LOGIC (CCD + OBB) ---
        for (let i = state.projectiles.length - 1; i >= 0; i--) {
            const p = state.projectiles[i];
            if (!p.hitIds) p.hitIds = [];
            
            const start = { x: p.x, y: p.y };
            const moveVec = (p.velocity.x === 0 && p.velocity.y === 0) ? {x:0.1, y:0.1} : p.velocity;
            const end = { x: start.x + moveVec.x, y: start.y + moveVec.y };
            const segmentLenSq = moveVec.x * moveVec.x + moveVec.y * moveVec.y;
            const segmentLen = Math.sqrt(segmentLenSq);
            
            if (p.type === 'EXPLODING_ACORN' && p.duration < 5) {
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
                     hostile: false,
                     hitIds: []
                 });
                 state.projectiles.splice(i, 1);
                 continue;
            }

            interface HitCandidate {
                type: 'OBSTACLE' | 'ENEMY' | 'PLAYER';
                obj: Entity | Player | Enemy | Obstacle;
                t: number; 
            }
            let hits: HitCandidate[] = [];

            // 1. CHECK OBSTACLES (Circle & Rectangle)
            state.obstacles.forEach(obs => {
                const isRect = obs.width && obs.height;
                const outerRadius = isRect ? Math.max(obs.width!, obs.height!) : obs.radius;
                const range = outerRadius + p.radius + segmentLen;
                
                if (getDistance(p, obs) > range) return; // Broad phase

                if (isRect) {
                    // Transform projectile segment to local space of the rotated rectangle
                    // Rectangle center is obs.x, obs.y
                    const dx = start.x - obs.x;
                    const dy = start.y - obs.y;
                    const cos = Math.cos(-obs.rotation);
                    const sin = Math.sin(-obs.rotation);
                    
                    const localStart = {
                        x: dx * cos - dy * sin,
                        y: dx * sin + dy * cos
                    };

                    // Rotate velocity vector too
                    const localDelta = {
                        x: moveVec.x * cos - moveVec.y * sin,
                        y: moveVec.x * sin + moveVec.y * cos
                    };

                    const t = getRayAABBIntersection(localStart, localDelta, obs.width!/2, obs.height!/2, p.radius);
                    
                    if (t !== null) {
                        hits.push({ type: 'OBSTACLE', obj: obs, t });
                    }
                } else {
                    // Circle Collision
                    const closest = getClosestPointOnSegment(obs, start, end);
                    const distSq = (closest.x - obs.x)**2 + (closest.y - obs.y)**2;
                    const hitRad = obs.radius + p.radius + (p.hostile && obs.isCover ? 20 : 0);
                    if (distSq < hitRad * hitRad) {
                        hits.push({ type: 'OBSTACLE', obj: obs, t: closest.t });
                    }
                }
            });

            // 2. CHECK ENEMIES (Circle)
            if (!p.hostile) {
                state.enemies.forEach(e => {
                    if (p.hitIds?.includes(e.id)) return; // Prevent multi-hit per frame/pierce

                    const range = e.radius + p.radius + segmentLen;
                    if (getDistance(p, e) > range) return;

                    const closest = getClosestPointOnSegment(e, start, end);
                    const distSq = (closest.x - e.x)**2 + (closest.y - e.y)**2;
                    if (distSq < (e.radius + p.radius)**2) {
                        hits.push({ type: 'ENEMY', obj: e, t: closest.t });
                    }
                });
            }

            // 3. CHECK PLAYER (Circle)
            if (p.hostile) {
                const pl = state.player;
                const closest = getClosestPointOnSegment(pl, start, end);
                const distSq = (closest.x - pl.x)**2 + (closest.y - pl.y)**2;
                if (distSq < (pl.radius + p.radius)**2) {
                    hits.push({ type: 'PLAYER', obj: pl, t: closest.t });
                }
            }

            hits.sort((a, b) => a.t - b.t);

            let stopped = false;

            for (const hit of hits) {
                if (stopped || p.pierce <= 0) break;

                // Move projectile to hit point for visual accuracy
                p.x = start.x + moveVec.x * hit.t;
                p.y = start.y + moveVec.y * hit.t;

                if (hit.type === 'OBSTACLE') {
                    const obs = hit.obj as Obstacle;
                    if (soundEnabled) playSound('HIT');
                    
                    // Visuals
                    state.particles.push({
                        id: Math.random().toString(),
                        x: p.x, y: p.y,
                        radius: 3,
                        type: 'FRAGMENT',
                        color: obs.material === 'WOOD' ? '#8B4513' : '#A0AEC0',
                        velocity: {x: (Math.random()-0.5)*4, y: (Math.random()-0.5)*4},
                        life: 20, maxLife: 20, scale: 1
                    });

                    if (obs.destructible) {
                         obs.hp -= p.damage;
                         state.texts.push({
                            id: Math.random().toString(),
                            x: p.x, y: p.y - 15,
                            text: "BLOCK",
                            life: 20,
                            color: '#CBD5E0',
                            velocity: {x:0, y:-1}
                         });

                         if (obs.hp <= 0) {
                             if (soundEnabled) playSound('EXPLOSION');
                             const idx = state.obstacles.findIndex(o => o.id === obs.id);
                             if (idx !== -1) {
                                 state.obstacles.splice(idx, 1);
                                 
                                 // --- EXPLODING OBSTACLE LOGIC ---
                                 if (obs.explosive) {
                                     state.projectiles.push({
                                         id: `exp-obs-${Math.random()}`,
                                         x: obs.x, y: obs.y,
                                         radius: obs.explodeRadius || 100,
                                         type: 'EXPLOSION',
                                         color: '#ED8936',
                                         velocity: {x:0, y:0},
                                         damage: obs.explodeDamage || 50,
                                         duration: 15,
                                         pierce: 999,
                                         rotation: 0,
                                         hostile: false,
                                         hitIds: []
                                     });
                                 }

                                 for(let k=0; k<5; k++) {
                                     state.particles.push({
                                         id: Math.random().toString(),
                                         x: obs.x, y: obs.y,
                                         radius: 4,
                                         type: 'FRAGMENT',
                                         color: '#718096',
                                         velocity: {x: (Math.random()-0.5)*6, y: (Math.random()-0.5)*6},
                                         life: 30, maxLife: 30, scale: 1
                                     });
                                 }
                             }
                         }
                         p.pierce--;
                    } else {
                         state.texts.push({
                            id: Math.random().toString(),
                            x: p.x, y: p.y - 15,
                            text: "BLOCKED",
                            life: 20,
                            color: '#718096',
                            velocity: {x:0, y:-1}
                        });
                        p.pierce = 0;
                    }
                    if (p.pierce <= 0) stopped = true;
                }
                
                else if (hit.type === 'PLAYER') {
                    const pl = hit.obj as Player;
                    if (soundEnabled) playSound('HIT');
                    pl.hp -= p.damage;
                    state.texts.push({
                        id: Math.random().toString(),
                        x: pl.x, y: pl.y - 20,
                        text: `-${p.damage}`,
                        life: 30,
                        color: '#FF0000',
                        velocity: {x:0, y:-1}
                    });
                    if (pl.hp <= 0) {
                        onGameOver(state.score, state.time, state.kills);
                        return;
                    }
                    p.pierce--;
                    if (p.pierce <= 0) stopped = true;
                }

                else if (hit.type === 'ENEMY') {
                    const e = hit.obj as Enemy;
                    
                    // Double check hit list to be safe due to loop quirks
                    if (p.hitIds?.includes(e.id)) continue;
                    p.hitIds?.push(e.id);

                    let damage = p.damage;
                    let blocked = false;
                    
                    e.hitFlashTimer = 5; 

                    if (e.type === 'SHIELD_ZOMBIE' && (e.shieldHp || 0) > 0) {
                        const angleToProj = Math.atan2(p.y - e.y, p.x - e.x);
                        const enemyFacing = Math.atan2(state.player.y - e.y, state.player.x - e.x);
                        let diff = Math.abs(angleToProj - enemyFacing);
                        if (diff > Math.PI) diff = 2 * Math.PI - diff;
                        if (diff < Math.PI / 1.5) blocked = true;
                    }

                    if (blocked) {
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
                             for(let k=0; k<5; k++) state.particles.push({ id: Math.random().toString(), x: e.x, y: e.y, radius:3, type:'SPARK', color:'#63B3ED', velocity:{x:(Math.random()-0.5)*5,y:(Math.random()-0.5)*5}, life:20, maxLife:20, scale:1 });
                        }
                    } else {
                        e.hp -= damage;
                        if (soundEnabled) playSound('HIT');
                        
                        const isRobot = e.type.includes('ROBOT') || e.type.includes('SHIELD');
                        const particleColor = isRobot ? '#FAF089' : '#E53E3E';
                        for(let k=0; k<3; k++) {
                             state.particles.push({
                                id: `hit-${Math.random()}`,
                                x: e.x, y: e.y,
                                radius: Math.random() * 2 + 1,
                                type: 'SPARK',
                                color: particleColor,
                                velocity: {x: (Math.random()-0.5)*5, y: (Math.random()-0.5)*5},
                                life: 15, maxLife: 15, scale: 1
                            });
                        }

                        state.texts.push({
                            id: Math.random().toString(),
                            x: e.x, y: e.y,
                            text: Math.floor(damage).toString(),
                            life: 30,
                            color: '#fff',
                            velocity: {x:0, y:-1}
                        });
                    }

                    p.pierce--;
                    if (p.pierce <= 0) stopped = true;
                }
            }

            if (stopped) {
                state.projectiles.splice(i, 1);
            } else {
                // Ensure projectile doesn't overshoot if no hit, but update position based on full velocity
                // If we processed hits, we already moved it to the hit point. 
                // But if multiple hits occurred, we moved it to the *last* hit point.
                // If we didn't stop, we must move it to the end of the frame segment.
                p.x = end.x;
                p.y = end.y;
                p.duration--;
                if (p.duration <= 0) {
                    state.projectiles.splice(i, 1);
                }
            }
        }

        // Dead Enemies Cleanup & Drops
        for (let i = state.enemies.length - 1; i >= 0; i--) {
            const enemy = state.enemies[i];
            if (enemy.hp <= 0) {
                state.kills++;
                state.score += 10;
                
                // --- HEALTH PACK DROP LOGIC ---
                let hpChance = 0.005; // 0.5% Base
                if (enemy.type === 'SWARM_ZOMBIE') hpChance = 0.001; // 0.1%
                if (enemy.type === 'SHIELD_ZOMBIE') hpChance = 0.05; // 5%
                if (enemy.type.startsWith('BOSS')) hpChance = 1.0; // 100%

                // Time scaling (Harder waves = more need for HP)
                if (state.time > 3600) hpChance *= 1.2; 
                if (state.time > 7200) hpChance *= 1.2; 
                
                // Low Health Bonus Chance
                if (state.player.hp < state.player.maxHp * 0.3) hpChance *= 2;

                if (Math.random() < hpChance) {
                    state.drops.push({
                        id: `hp-${Math.random()}`,
                        x: enemy.x,
                        y: enemy.y,
                        radius: 8,
                        type: 'DROP',
                        kind: 'HEALTH_PACK',
                        value: 25,
                        color: '#F56565',
                        emoji: '❤️'
                    });
                }
                // ------------------------------

                if (enemy.type.startsWith('BOSS')) {
                    state.score += 500;
                    if (soundEnabled) playSound('LEVELUP');
                    for(let k=0;k<10;k++) {
                        state.drops.push({
                            id: Math.random().toString(),
                            x: enemy.x + (Math.random()-0.5)*40,
                            y: enemy.y + (Math.random()-0.5)*40,
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
                        x: enemy.x,
                        y: enemy.y,
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
        const magnetRadius = 250;
        for (let i = state.drops.length - 1; i >= 0; i--) {
            const d = state.drops[i];
            const dist = getDistance(d, state.player);
            
            if (dist < magnetRadius) { // Magnet
                const angle = Math.atan2(state.player.y - d.y, state.player.x - d.x);
                const speed = 4 + (1 - dist / magnetRadius) * 12;
                d.x += Math.cos(angle) * speed;
                d.y += Math.sin(angle) * speed;
            }

            if (dist < state.player.radius + d.radius) {
                if (soundEnabled) playSound('COLLECT');
                
                if (d.kind === 'XP') {
                    state.player.xp += d.value;
                    state.player.xpFlashTimer = 10; 

                    // VISUAL FEEDBACK: XP Particles on Player
                    for(let k=0; k<3; k++) {
                        state.particles.push({
                            id: `xp-p-${Math.random()}`,
                            x: state.player.x, 
                            y: state.player.y,
                            radius: Math.random() * 3 + 1,
                            type: 'SPARK',
                            color: '#4FD1C5', 
                            velocity: { 
                                x: (Math.random() - 0.5) * 3, 
                                y: -Math.random() * 3 - 1 
                            },
                            life: 20,
                            maxLife: 20,
                            scale: 1
                        });
                    }
                    
                    state.texts.push({
                         id: `xp-t-${Math.random()}`,
                         x: state.player.x + (Math.random()-0.5)*20,
                         y: state.player.y - 20,
                         text: `+${d.value} XP`,
                         life: 20,
                         color: '#81E6D9',
                         velocity: {x:0, y:-1.5}
                    });

                    if (state.player.xp >= state.player.nextLevelXp) {
                        state.player.level++;
                        state.player.xp -= state.player.nextLevelXp;
                        state.player.nextLevelXp = Math.floor(state.player.nextLevelXp * 1.2);
                        if (soundEnabled) playSound('LEVELUP');
                        
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
                                id: 'big_nut', name: 'Mega Nut', description: 'Nuts get bigger and stronger.', rarity: 'RARE', icon: '🌰',
                                apply: (p) => {
                                     const w = p.weapons.find(w => w.type === 'NUT_THROW');
                                     if(w) { w.level++; w.damage += 10; w.area += 0.5; }
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
                } else if (d.kind === 'HEALTH_PACK') {
                    const heal = d.value;
                    const oldHp = state.player.hp;
                    state.player.hp = Math.min(state.player.maxHp, state.player.hp + heal);
                    const actualHeal = Math.floor(state.player.hp - oldHp);

                    if (actualHeal > 0) {
                         state.texts.push({
                             id: `heal-${Math.random()}`,
                             x: state.player.x,
                             y: state.player.y - 20,
                             text: `+${actualHeal} HP`,
                             life: 40,
                             color: '#48BB78',
                             velocity: {x:0, y:-1}
                         });
                         
                         // Heal Particles
                         for(let k=0; k<6; k++) {
                            state.particles.push({
                                id: `h-p-${Math.random()}`,
                                x: state.player.x, 
                                y: state.player.y,
                                radius: Math.random() * 3 + 2,
                                type: 'SPARK',
                                color: '#F56565', 
                                velocity: { x: (Math.random() - 0.5) * 3, y: -Math.random() * 3 - 1 },
                                life: 30, maxLife: 30, scale: 1
                            });
                        }
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

        // Draw Cover Indicators
        let closestCover: Obstacle | null = null;
        let minCoverDist = Infinity;

        state.obstacles.forEach(obs => {
            if (obs.isCover) {
                const d = getDistance(state.player, obs);
                const coverRange = obs.radius + state.player.radius + 40;
                
                if (d < coverRange) {
                    if (d < minCoverDist) {
                        minCoverDist = d;
                        closestCover = obs;
                    }
                }
            }
        });

        if (closestCover) {
            const obs = closestCover;
            
            // Connection Line
            ctx.beginPath();
            ctx.strokeStyle = '#63B3ED';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.moveTo(state.player.x - camX, state.player.y - camY);
            ctx.lineTo(obs.x - camX, obs.y - camY);
            ctx.stroke();
            ctx.setLineDash([]);

            // Shield Bubble
            ctx.beginPath();
            ctx.arc(state.player.x - camX, state.player.y - camY, state.player.radius + 8, 0, Math.PI * 2);
            ctx.strokeStyle = '#4299E1';
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.fillStyle = 'rgba(66, 153, 225, 0.2)';
            ctx.fill();

            // Status Badge
            ctx.save();
            ctx.translate(state.player.x - camX, state.player.y - camY - 45);
            
            // Badge Background
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.strokeStyle = '#63B3ED';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.roundRect(-35, -12, 70, 24, 12);
            ctx.fill();
            ctx.stroke();

            // Badge Text
            ctx.fillStyle = '#BEE3F8';
            ctx.font = 'bold 11px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('🛡️ COVER', 0, 1);
            
            ctx.restore();
        }

        const drawEntity = (e: Entity) => {
             const isBoss = e.type.startsWith('BOSS');
             let drawRadius = e.radius;

             if (isBoss) {
                 drawRadius *= (1 + Math.sin(state.time * 0.1) * 0.05);
                 ctx.shadowBlur = 15;
                 ctx.shadowColor = e.color;
             }

             // Player XP Pulse Effect
             if (e.type === 'PLAYER') {
                 const p = e as Player;
                 if (p.xpFlashTimer && p.xpFlashTimer > 0) {
                     const scale = 1 + (0.2 * (p.xpFlashTimer / 10));
                     drawRadius *= scale;
                     ctx.save();
                     ctx.beginPath();
                     const ringRadius = e.radius + (10 - p.xpFlashTimer) * 2;
                     ctx.arc(e.x - camX, e.y - camY, ringRadius, 0, Math.PI * 2);
                     ctx.strokeStyle = '#4FD1C5';
                     ctx.lineWidth = 2;
                     ctx.globalAlpha = p.xpFlashTimer / 10;
                     ctx.stroke();
                     ctx.restore();
                 }
             }

             const obs = e as Obstacle;
             const isRect = obs.type === 'OBSTACLE' && obs.width && obs.height;

             ctx.save();
             ctx.translate(e.x - camX, e.y - camY);
             
             // Rotation for both rects and circles (emoji rotation)
             if ((e as any).rotation) {
                 ctx.rotate((e as any).rotation);
             }

             if (isRect) {
                 const w = obs.width!;
                 const h = obs.height!;
                 ctx.beginPath();
                 // Draw Rounded Rect
                 ctx.roundRect(-w/2, -h/2, w, h, 4);
                 
                 if ((e as any).hitFlashTimer && (e as any).hitFlashTimer! > 0) ctx.fillStyle = '#FFFFFF';
                 else ctx.fillStyle = e.color === '#ffffff' ? '#4A5568' : e.color; // Fallback color for rects without explicit color
                 ctx.fill();
             } else {
                 ctx.beginPath();
                 ctx.arc(0, 0, drawRadius, 0, Math.PI * 2);
                 if ((e as any).hitFlashTimer && (e as any).hitFlashTimer! > 0) ctx.fillStyle = '#FFFFFF';
                 else ctx.fillStyle = e.color;
                 ctx.fill();
             }
             
             if (isBoss) ctx.shadowBlur = 0;

             if (e.emoji) {
                 // Un-rotate for emoji if we want them upright? 
                 // Actually, for cars (Rects), we want emoji to rotate with the car.
                 // For trees/rocks, random rotation is fine.
                 
                 if (e.type === 'PLAYER' && (e as any).filter) {
                    ctx.filter = (e as any).filter;
                 }
                 
                 const fontSize = isBoss ? drawRadius * 1.4 : (isRect ? Math.min(obs.width!, obs.height!) * 0.8 : e.radius * 1.4);
                 ctx.font = `${fontSize}px Arial`;
                 ctx.textAlign = 'center';
                 ctx.textBaseline = 'middle';
                 // For Rects, draw emoji in center
                 ctx.fillText(e.emoji, 0, 0);
             }
             ctx.restore();
        };

        state.obstacles.forEach(o => {
            drawEntity(o);
            // HP Bar for destructibles if damaged
            if (o.destructible && o.hp < o.maxHp) {
                const w = o.width || 20;
                const hOffset = o.height ? o.height / 2 : o.radius;
                ctx.fillStyle = 'rgba(0,0,0,0.5)';
                ctx.fillRect(o.x - camX - w/2, o.y - camY - hOffset - 10, w, 4);
                ctx.fillStyle = '#ECC94B';
                ctx.fillRect(o.x - camX - w/2, o.y - camY - hOffset - 10, w * (o.hp / o.maxHp), 4);
            }
        });

        state.drops.forEach(drawEntity);
        
        state.enemies.forEach(e => {
            if (e.type.startsWith('BOSS')) {
                ctx.save();
                ctx.translate(e.x - camX, e.y - camY);
                ctx.beginPath();
                ctx.rotate(state.time * 0.02);
                ctx.strokeStyle = e.color + '44'; 
                ctx.lineWidth = 4;
                ctx.setLineDash([15, 10]);
                ctx.arc(0, 0, e.radius * 1.5, 0, Math.PI * 2);
                ctx.stroke();
                
                ctx.beginPath();
                ctx.rotate(state.time * -0.05); 
                ctx.strokeStyle = e.color + '66';
                ctx.lineWidth = 2;
                ctx.setLineDash([5, 5]);
                ctx.arc(0, 0, e.radius * 1.2, 0, Math.PI * 2);
                ctx.stroke();
                ctx.restore();
            }

            drawEntity(e);
            
            if (e.type === 'SHIELD_ZOMBIE' && (e.shieldHp || 0) > 0) {
                const angle = Math.atan2(state.player.y - e.y, state.player.x - e.x);
                ctx.beginPath();
                ctx.arc(e.x - camX, e.y - camY, e.radius + 8, angle - Math.PI/3, angle + Math.PI/3);
                ctx.strokeStyle = '#63B3ED'; 
                ctx.lineWidth = 4;
                ctx.lineCap = 'round';
                ctx.stroke();
                
                ctx.fillStyle = '#63B3ED';
                ctx.fillRect(e.x - camX - 12, e.y - camY - e.radius - 12, 24 * ((e.shieldHp || 1) / (e.maxShieldHp || 1)), 3);
            }

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
            } else if (p.type === 'LASER') {
                ctx.save();
                ctx.translate(p.x - camX, p.y - camY);
                ctx.rotate(p.rotation);
                ctx.fillStyle = p.color;
                ctx.shadowColor = p.color;
                ctx.shadowBlur = 10;
                ctx.fillRect(-10, -2, 20, 4); 
                ctx.restore();
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
                if (p.type === 'SMOKE') {
                    ctx.arc(p.x - camX, p.y - camY, p.radius, 0, Math.PI*2);
                    ctx.globalAlpha = p.life / p.maxLife;
                    ctx.fillStyle = p.color;
                    ctx.fill();
                    ctx.globalAlpha = 1.0;
                } else {
                    ctx.arc(p.x - camX, p.y - camY, p.radius * (p.life / p.maxLife), 0, Math.PI*2);
                    ctx.fillStyle = p.color;
                    ctx.fill();
                }
            }
        });

        state.texts.forEach(t => {
            ctx.fillStyle = t.color;
            ctx.font = 'bold 16px Arial';
            ctx.fillText(t.text, t.x - camX, t.y - camY);
        });

        if (joystickRef.current.active) {
            const { origin, current } = joystickRef.current;
            ctx.beginPath();
            ctx.arc(origin.x, origin.y, 50, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.fill();
            ctx.lineWidth = 2;
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(current.x, current.y, 20, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
            ctx.fill();
        }

        const safeY = 40; 
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(10, safeY - 30, 220, 60);
        
        ctx.fillStyle = 'white';
        ctx.font = '16px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(`HP: ${Math.ceil(state.player.hp)}/${Math.ceil(state.player.maxHp)}`, 20, safeY - 10);
        ctx.fillStyle = '#333';
        ctx.fillRect(20, safeY, 200, 10);
        ctx.fillStyle = state.player.color || 'red'; // Updated to use character color
        ctx.fillRect(20, safeY, 200 * (state.player.hp / state.player.maxHp), 10);
        
        ctx.fillStyle = 'white';
        ctx.font = '20px monospace';
        const mins = Math.floor(state.time / 60 / 60);
        const secs = Math.floor((state.time / 60) % 60);
        ctx.textAlign = 'center';
        ctx.fillText(`${mins.toString().padStart(2,'0')}:${secs.toString().padStart(2,'0')}`, canvas.width / 2, safeY);
        
        ctx.textAlign = 'right';
        ctx.fillText(`Score: ${state.score}`, canvas.width - 20, safeY - 10);
        ctx.fillText(`Kills: ${state.kills}`, canvas.width - 20, safeY + 15);

        const boss = state.enemies.find(e => e.type.startsWith('BOSS'));
        if (boss) {
            const barW = Math.min(600, canvas.width - 40);
            const barH = 24;
            const barX = (canvas.width - barW) / 2;
            const barY = safeY + 40;

            ctx.save();
            ctx.fillStyle = '#E9D8FD';
            ctx.font = 'bold 16px "Russo One", sans-serif';
            ctx.textAlign = 'center';
            ctx.shadowColor = 'black';
            ctx.shadowBlur = 4;
            let bossTitle = '⚠️ BOSS DETECTED ⚠️';
            if (boss.type === 'BOSS_ALIEN') bossTitle = '👽 ALIEN INVADER DETECTED 👽';
            else if (boss.type === 'BOSS_ROBOT') bossTitle = '🤖 MECHA-ZOMBIE DETECTED 🤖';
            
            ctx.fillText(bossTitle, canvas.width / 2, barY - 10);

            ctx.fillStyle = 'rgba(0,0,0,0.8)';
            ctx.fillRect(barX, barY, barW, barH);
            ctx.strokeStyle = '#44337A';
            ctx.lineWidth = 2;
            ctx.strokeRect(barX, barY, barW, barH);

            const pct = Math.max(0, boss.hp / boss.maxHp);
            ctx.fillStyle = boss.type === 'BOSS_ALIEN' ? '#D53F8C' : '#9F7AEA'; 
            ctx.fillRect(barX+2, barY+2, (barW-4)*pct, barH-4);
            ctx.restore();
        }

        const xpBarHeight = 16;
        ctx.fillStyle = '#222';
        ctx.fillRect(0, canvas.height - xpBarHeight, canvas.width, xpBarHeight);
        ctx.fillStyle = '#4FD1C5';
        ctx.fillRect(0, canvas.height - xpBarHeight, canvas.width * (state.player.xp / state.player.nextLevelXp), xpBarHeight);
        
        ctx.textAlign = 'center';
        ctx.font = '10px sans-serif';
        ctx.fillStyle = 'white';
        ctx.textBaseline = 'bottom';
        ctx.fillText(`LVL ${state.player.level}`, canvas.width / 2, canvas.height - 2);

        if (state.bossWarningTimer > 0) {
            const alpha = (state.time % 30) < 15 ? 0.8 : 0.2; 
            
            ctx.save();
            ctx.fillStyle = `rgba(255, 0, 0, ${alpha * 0.3})`;
            ctx.fillRect(0, canvas.height / 2 - 60, canvas.width, 120);
            
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

    return <canvas ref={canvasRef} className="block bg-gray-900 w-full h-full touch-none select-none" />;
};
