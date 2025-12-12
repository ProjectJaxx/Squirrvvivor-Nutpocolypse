
import React, { useEffect, useRef, useState } from 'react';
import { 
    GameCanvasProps, 
    GameState, 
    Player, 
    Enemy, 
    Vector,
    Upgrade,
    EntityType,
    EliteType,
    Projectile,
    Companion
} from '../types';
import { 
    CANVAS_WIDTH, 
    CANVAS_HEIGHT, 
    COLORS, 
    BIOME_CONFIG, 
    GAME_WIN_TIME
} from '../constants';
import { ALL_UPGRADES } from '../upgrades';
import { playSound, playMusic, stopMusic } from '../services/soundService';
import { drawSquirrel, drawDashEffect, drawEnemy, drawProjectile, drawExplosion, drawParticle, drawTree } from '../services/renderService';
import { Zap, Wind } from 'lucide-react';

// Cleaner, subtle background pattern with grass blades/texture
const createGroundPattern = (biome: string, ctx: CanvasRenderingContext2D) => {
      if (!ctx) return null;
      try {
        const size = 256; 
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const tCtx = canvas.getContext('2d');
        if (!tCtx) return null;

        const config = BIOME_CONFIG[biome as keyof typeof BIOME_CONFIG] || BIOME_CONFIG.PARK;
        
        tCtx.fillStyle = config.bgColor || COLORS.parkBg;
        tCtx.fillRect(0, 0, size, size);

        // Simple Noise Texture
        for (let i = 0; i < 400; i++) {
            const x = Math.random() * size;
            const y = Math.random() * size;
            tCtx.fillStyle = `rgba(0,0,0, ${Math.random() * 0.05})`; 
            tCtx.fillRect(x, y, 2, 2);
            
            const x2 = Math.random() * size;
            const y2 = Math.random() * size;
            tCtx.fillStyle = `rgba(255,255,255, ${Math.random() * 0.03})`; 
            tCtx.fillRect(x2, y2, 1, 1);
        }

        // Draw Grass Blades / Tufts if PARK biome
        if (biome === 'PARK') {
            for (let i = 0; i < 60; i++) {
                const x = Math.random() * size;
                const y = Math.random() * size;
                const h = 3 + Math.random() * 3;
                
                tCtx.strokeStyle = 'rgba(0,0,0,0.1)';
                tCtx.lineWidth = 1;
                tCtx.beginPath();
                tCtx.moveTo(x, y);
                tCtx.lineTo(x - 2, y - h);
                tCtx.moveTo(x, y);
                tCtx.lineTo(x + 2, y - h);
                tCtx.stroke();
                
                // Lighter varied green tufts
                tCtx.strokeStyle = `rgba(100, 200, 100, ${0.05 + Math.random() * 0.05})`;
                tCtx.beginPath();
                tCtx.moveTo(x + 5, y + 5);
                tCtx.lineTo(x + 3, y + 5 - h);
                tCtx.stroke();
            }
        }
        
        return ctx.createPattern(canvas, 'repeat');
      } catch (e) {
          console.warn("Failed to create pattern", e);
          return null;
      }
};

interface ExtendedGameCanvasProps extends GameCanvasProps {
    onStatsUpdate?: (stats: { score: number, kills: number, nuts: number, time: number, player: Player }) => void;
}

export const GameCanvas: React.FC<ExtendedGameCanvasProps> = ({
  onGameOver,
  onStageComplete,
  onLevelUp,
  paused,
  character,
  initialPlayer,
  stageNumber,
  soundEnabled,
  musicEnabled,
  stageDuration,
  onTogglePause,
  onStatsUpdate
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const requestRef = useRef<number | null>(null);
    const stateRef = useRef<GameState | null>(null);
    const keysRef = useRef<Record<string, boolean>>({});
    const mouseRef = useRef<Vector>({ x: 0, y: 0 });
    const groundPatternRef = useRef<CanvasPattern | null>(null);
    
    // Joystick & Mobile Controls
    const joystickRef = useRef<{
        active: boolean;
        origin: Vector;
        current: Vector;
        vector: Vector; // Normalized output -1 to 1
        identifier: number | null;
    }>({ active: false, origin: {x:0, y:0}, current: {x:0, y:0}, vector: {x:0, y:0}, identifier: null });
    
    // Virtual Button State
    const [mobileActions, setMobileActions] = useState({ dash: false, ability: false });
    const actionsRef = useRef({ dash: false, ability: false }); // Ref for game loop to avoid stale state

    // Camera Rendering Refs
    const cameraRef = useRef<Vector>({ x: 0, y: 0 });

    // Initialize Game State
    useEffect(() => {
        // Safe check for biome
        const biome = stageNumber === 1 ? 'PARK' : (stageNumber === 2 ? 'PARKING_LOT' : 'MARS');
        const config = BIOME_CONFIG[biome as keyof typeof BIOME_CONFIG] || BIOME_CONFIG.PARK;
        
        if (musicEnabled) {
            try { playMusic(biome); } catch(e) { console.warn("Music play failed", e); }
        }

        let player: Player;
        if (initialPlayer) {
            player = { 
                ...initialPlayer, 
                x: 0, 
                y: 0, 
                hp: initialPlayer.hp < initialPlayer.maxHp ? initialPlayer.hp + 20 : initialPlayer.hp,
                velocity: { x: 0, y: 0 },
                isDashing: false,
                dashCooldown: 0
            };
        } else {
             player = {
                 id: 'player',
                 x: 0, y: 0,
                 radius: character?.radius || 16,
                 type: 'PLAYER',
                 color: character?.color || COLORS.player,
                 hp: character?.hp || 100,
                 maxHp: character?.hp || 100,
                 xp: 0,
                 level: 1,
                 nextLevelXp: 100,
                 speed: character?.speed || 5,
                 velocity: { x: 0, y: 0 },
                 acceleration: 0.8,
                 friction: 0.85,
                 magnetRadius: character?.magnetRadius || 150,
                 weapons: [],
                 activeAbility: character?.activeAbility || { type: 'NUT_BARRAGE', name: 'None', cooldown: 9999, cooldownTimer: 0, duration: 0, activeTimer: 0 },
                 facing: 'RIGHT',
                 rotation: 0,
                 emoji: character?.emoji || '🐿️',
                 characterId: character?.id || 'GREY',
                 secondaryColor: character?.secondaryColor || '#E2E8F0',
                 stamina: 100,
                 maxStamina: 100,
                 dashCooldown: 0,
                 isDashing: false,
                 dashVector: { x: 0, y: 0 },
                 invincibleTimer: 0,
                 animationState: 'IDLE',
                 animationFrame: 0,
                 frameTimer: 0,
                 tailWagOffset: Math.random() * 100,
                 maxCompanions: character?.maxCompanions || 0,
                 revives: character?.revives || 0,
                 damageBonus: character?.damageBonus || 0
             };
             // Give default weapon
             player.weapons.push({
                type: 'NUT_THROW',
                level: 1,
                damage: 15 * (1 + (character?.damageBonus || 0)),
                cooldown: 40 * (1 - (character?.cooldownReduction || 0)),
                cooldownTimer: 0,
                area: 5,
                speed: 8,
                amount: 1
             });
        }

        const newState: GameState = {
            player,
            enemies: [],
            companions: [],
            projectiles: [],
            drops: [],
            particles: [],
            texts: [],
            obstacles: [],
            score: initialPlayer ? initialPlayer.xp * 10 : 0, 
            kills: 0,
            collectedNuts: 0,
            time: 0,
            wave: 1,
            bossWarningTimer: 0,
            biome: biome as any,
            mapBounds: { minX: -config.bounds, maxX: config.bounds, minY: -config.bounds, maxY: config.bounds },
            shake: { intensity: 0, duration: 0 },
        };

        // Add Obstacles
        for (let i = 0; i < config.obstacleCount; i++) {
            newState.obstacles.push({
                id: `obs-${i}`,
                x: Math.random() * (config.bounds * 2) - config.bounds,
                y: Math.random() * (config.bounds * 2) - config.bounds,
                radius: Math.random() * 30 + 20,
                type: 'OBSTACLE',
                color: '#2d3748',
                hp: 100,
                maxHp: 100,
                destructible: false,
                rotation: Math.random() * Math.PI * 2,
                material: 'WOOD',
                subtype: Math.random() > 0.5 ? 'PINE' : 'OAK' // Randomize Tree type
            });
        }

        stateRef.current = newState;

        const handleKeyDown = (e: KeyboardEvent) => {
            keysRef.current[e.key] = true;
            if (e.key === 'Escape' && onTogglePause) onTogglePause();
            
            // Active Ability (E key)
            if ((e.key === 'e' || e.key === 'E') && stateRef.current && !paused) {
                const p = stateRef.current.player;
                if (p.activeAbility && p.activeAbility.cooldownTimer <= 0) {
                    p.activeAbility.activeTimer = p.activeAbility.duration;
                    p.activeAbility.cooldownTimer = p.activeAbility.cooldown;
                    if (soundEnabled) playSound('LEVELUP'); // Placeholder sound for activation
                }
            }

            // Spacebar Dash
            if (e.code === 'Space') {
                 triggerDash();
            }
        };
        const handleKeyUp = (e: KeyboardEvent) => keysRef.current[e.key] = false;
        const handleMouseMove = (e: MouseEvent) => {
            mouseRef.current = { x: e.clientX, y: e.clientY };
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        window.addEventListener('mousemove', handleMouseMove);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
            window.removeEventListener('mousemove', handleMouseMove);
            stopMusic();
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, [stageNumber, initialPlayer, character]);

    useEffect(() => {
        if (!canvasRef.current || !stateRef.current) return;
        const ctx = canvasRef.current.getContext('2d');
        if (!ctx) return;

        // Init Pattern
        if (!groundPatternRef.current && stateRef.current) {
            groundPatternRef.current = createGroundPattern(stateRef.current.biome, ctx);
        }

        const loop = () => {
            const currentState = stateRef.current;
            if (paused || !currentState) {
                requestRef.current = requestAnimationFrame(loop);
                return;
            }
            
            try {
                update(currentState);
                draw(ctx, currentState);

                // Sync Stats to HUD
                if (onStatsUpdate && currentState.time % 10 === 0) {
                    onStatsUpdate({
                        score: currentState.score,
                        kills: currentState.kills,
                        nuts: currentState.collectedNuts,
                        time: currentState.time,
                        player: currentState.player
                    });
                }
            } catch (e) {
                console.error("Game Loop Error", e);
            }

            requestRef.current = requestAnimationFrame(loop);
        };

        requestRef.current = requestAnimationFrame(loop);
        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, [paused]);

    const triggerDash = () => {
        const state = stateRef.current;
        if (!state || paused) return;
        const p = state.player;
        
        if (p.stamina >= 30 && p.dashCooldown <= 0) {
             p.isDashing = true;
             p.dashCooldown = 30;
             p.invincibleTimer = 15; // I-frames during dash
             p.stamina -= 30;
             
             // Dash direction (Keys or Joystick)
             let dx = 0, dy = 0;
             if (keysRef.current['w'] || keysRef.current['ArrowUp']) dy -= 1;
             if (keysRef.current['s'] || keysRef.current['ArrowDown']) dy += 1;
             if (keysRef.current['a'] || keysRef.current['ArrowLeft']) dx -= 1;
             if (keysRef.current['d'] || keysRef.current['ArrowRight']) dx += 1;
             
             if (joystickRef.current.active) {
                 dx = joystickRef.current.vector.x;
                 dy = joystickRef.current.vector.y;
             }

             // If no input, dash in facing direction
             if (dx === 0 && dy === 0) {
                 dx = p.facing === 'RIGHT' ? 1 : -1;
             }
             
             const mag = Math.sqrt(dx*dx + dy*dy);
             if (mag > 0) {
                p.velocity.x = (dx / mag) * 15; // Burst speed
                p.velocity.y = (dy / mag) * 15;
             }
             if (soundEnabled) playSound('AURA');
         }
    };

    const triggerAbility = () => {
        const state = stateRef.current;
        if (!state || paused) return;
        const p = state.player;
        if (p.activeAbility && p.activeAbility.cooldownTimer <= 0) {
            p.activeAbility.activeTimer = p.activeAbility.duration;
            p.activeAbility.cooldownTimer = p.activeAbility.cooldown;
            if (soundEnabled) playSound('LEVELUP');
        }
    };

    // --- NATIVE TOUCH HANDLERS (Robust Mobile Support) ---
    // We attach these directly to the DOM element to support non-passive listeners (e.preventDefault)
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const onTouchStart = (e: TouchEvent) => {
            // Prevent default to stop scrolling/zooming which kills game input on mobile
            e.preventDefault(); 
            for (let i = 0; i < e.changedTouches.length; i++) {
                const t = e.changedTouches[i];
                // Joystick Zone: Left 50% of screen
                if (t.clientX < window.innerWidth * 0.5) {
                    if (!joystickRef.current.active) {
                        joystickRef.current = {
                            active: true,
                            origin: { x: t.clientX, y: t.clientY },
                            current: { x: t.clientX, y: t.clientY },
                            vector: { x: 0, y: 0 },
                            identifier: t.identifier
                        };
                    }
                }
            }
        };

        const onTouchMove = (e: TouchEvent) => {
            e.preventDefault();
            if (!joystickRef.current.active) return;
            for (let i = 0; i < e.changedTouches.length; i++) {
                const t = e.changedTouches[i];
                if (t.identifier === joystickRef.current.identifier) {
                    const maxRadius = 60;
                    let dx = t.clientX - joystickRef.current.origin.x;
                    let dy = t.clientY - joystickRef.current.origin.y;
                    const dist = Math.sqrt(dx*dx + dy*dy);
                    
                    // Clamp visual
                    if (dist > maxRadius) {
                        const ratio = maxRadius / dist;
                        dx *= ratio;
                        dy *= ratio;
                    }
                    
                    joystickRef.current.current = {
                        x: joystickRef.current.origin.x + dx,
                        y: joystickRef.current.origin.y + dy
                    };
                    
                    // Normalize Vector
                    joystickRef.current.vector = {
                        x: dx / maxRadius,
                        y: dy / maxRadius
                    };
                }
            }
        };

        const onTouchEnd = (e: TouchEvent) => {
            e.preventDefault();
            for (let i = 0; i < e.changedTouches.length; i++) {
                const t = e.changedTouches[i];
                if (t.identifier === joystickRef.current.identifier) {
                    joystickRef.current.active = false;
                    joystickRef.current.vector = { x: 0, y: 0 };
                }
            }
        };

        // Attach with { passive: false } to allow preventing default behavior
        container.addEventListener('touchstart', onTouchStart, { passive: false });
        container.addEventListener('touchmove', onTouchMove, { passive: false });
        container.addEventListener('touchend', onTouchEnd, { passive: false });
        container.addEventListener('touchcancel', onTouchEnd, { passive: false });

        return () => {
            container.removeEventListener('touchstart', onTouchStart);
            container.removeEventListener('touchmove', onTouchMove);
            container.removeEventListener('touchend', onTouchEnd);
            container.removeEventListener('touchcancel', onTouchEnd);
        };
    }, []);

    const update = (state: GameState) => {
        const { player } = state;

        // Check Action Refs (Buttons)
        if (actionsRef.current.dash) {
            triggerDash();
            actionsRef.current.dash = false; // consume
        }
        if (actionsRef.current.ability) {
            triggerAbility();
            actionsRef.current.ability = false; // consume
        }

        // Screen Shake Decay
        if (state.shake.duration > 0) {
            state.shake.duration--;
            if (state.shake.duration <= 0) state.shake.intensity = 0;
        }

        if (player.attackAnimTimer && player.attackAnimTimer > 0) {
            player.attackAnimTimer--;
        }

        // 1. PHYSICS MOVEMENT
        let dx = 0;
        let dy = 0;
        
        // Keyboard Input
        if (keysRef.current['w'] || keysRef.current['ArrowUp']) dy -= 1;
        if (keysRef.current['s'] || keysRef.current['ArrowDown']) dy += 1;
        if (keysRef.current['a'] || keysRef.current['ArrowLeft']) dx -= 1;
        if (keysRef.current['d'] || keysRef.current['ArrowRight']) dx += 1;

        // Joystick Input
        if (joystickRef.current.active) {
            dx += joystickRef.current.vector.x;
            dy += joystickRef.current.vector.y;
        }

        // Normalize Input (Clamp magnitude to 1)
        const mag = Math.sqrt(dx*dx + dy*dy);
        if (mag > 1) {
            dx /= mag;
            dy /= mag;
        } else if (mag > 0 && mag < 0.1) {
            // Deadzone
            dx = 0; dy = 0;
        }

        if (dx !== 0 || dy !== 0) {
            // Apply Acceleration
            if (!player.isDashing) {
                player.velocity.x += dx * player.acceleration;
                player.velocity.y += dy * player.acceleration;
            }
            
            // Update Facing
            if (dx > 0) player.facing = 'RIGHT';
            if (dx < 0) player.facing = 'LEFT';
            
            player.animationState = 'RUN';
        } else {
            player.animationState = 'IDLE';
        }

        // Apply Friction
        player.velocity.x *= player.friction;
        player.velocity.y *= player.friction;

        // Cap Speed (Soft cap, Dash can exceed)
        const currentSpeed = Math.sqrt(player.velocity.x**2 + player.velocity.y**2);
        if (!player.isDashing && currentSpeed > player.speed) {
            const ratio = player.speed / currentSpeed;
            player.velocity.x *= ratio;
            player.velocity.y *= ratio;
        }

        // Move Player
        player.x += player.velocity.x;
        player.y += player.velocity.y;
        
        // Dash Logic
        if (player.dashCooldown > 0) player.dashCooldown--;
        if (player.isDashing && currentSpeed < player.speed * 1.5) {
            player.isDashing = false; // End dash when slowed down
        }
        
        // Stamina Regen
        if (player.stamina < player.maxStamina) player.stamina += 0.5;

        // Map Bounds
        player.x = Math.max(state.mapBounds.minX, Math.min(state.mapBounds.maxX, player.x));
        player.y = Math.max(state.mapBounds.minY, Math.min(state.mapBounds.maxY, player.y));

        state.time++;
        const spawnRate = Math.max(20, 100 - state.time / 600); 
        if (state.time % Math.floor(spawnRate) === 0 && state.enemies.length < 300) {
            const angle = Math.random() * Math.PI * 2;
            const dist = Math.random() * 400 + 400; 
            
            // --- ENEMY SPAWN LOGIC ---
            let enemyType: EntityType = 'ZOMBIE';
            let enemyRadius = 14;
            let enemySpeed = 1.5 + Math.random() * 0.5;
            let enemyHp = 20 + (state.time / 600) * 10;
            let isElite = false;
            let eliteType: EliteType | undefined = undefined;
            let enemyDamage = 5;

            // 5% Chance for Elite Spawn
            if (Math.random() < 0.05) {
                isElite = true;
                enemyHp *= 2.5; // Massive HP boost
                enemyDamage *= 1.5;
                enemyRadius *= 1.2; // Slightly larger
                
                const eliteRand = Math.random();
                if (eliteRand < 0.33) eliteType = 'SPEED';
                else if (eliteRand < 0.66) eliteType = 'REGEN';
                else eliteType = 'DAMAGE';
            }

            const rand = Math.random();

            if (state.biome === 'PARK') {
                if (rand < 0.7) {
                    enemyType = 'ZOMBIE';
                } else if (rand < 0.9) {
                    enemyType = 'RUNNER_ZOMBIE'; // Conehead
                    enemySpeed *= 1.4;
                    enemyHp *= 0.7;
                    enemyRadius = 13;
                } else {
                    enemyType = 'BRUTE_ZOMBIE'; // Fat Zombie
                    enemySpeed *= 0.7;
                    enemyHp *= 2.5;
                    enemyRadius = 22;
                }
            } else if (state.biome === 'PARKING_LOT') {
                if (rand < 0.7) {
                    enemyType = 'ROBOT';
                } else if (rand < 0.9) {
                    enemyType = 'CYBER_HOUND'; // Drone
                    enemySpeed *= 1.5;
                    enemyHp *= 0.6;
                    enemyRadius = 12;
                } else {
                    enemyType = 'TANK_BOT'; // Mech
                    enemySpeed *= 0.6;
                    enemyHp *= 3.0;
                    enemyRadius = 24;
                }
            } else if (state.biome === 'MARS') {
                if (rand < 0.7) {
                    enemyType = 'ALIEN';
                } else if (rand < 0.9) {
                    enemyType = 'MARTIAN_SPIDER'; // Gray
                    enemySpeed *= 1.2;
                    enemyHp *= 0.8;
                    enemyRadius = 13;
                } else {
                    enemyType = 'BOSS_ALIEN'; // Saucer
                    enemySpeed *= 0.8;
                    enemyHp *= 2.0;
                    enemyRadius = 20;
                }
            }

            state.enemies.push({
                id: `e-${Date.now()}-${Math.random()}`,
                x: player.x + Math.cos(angle) * dist,
                y: player.y + Math.sin(angle) * dist,
                radius: enemyRadius,
                type: enemyType, 
                color: COLORS.zombie, 
                hp: enemyHp,
                maxHp: enemyHp,
                speed: enemySpeed,
                damage: enemyDamage,
                knockback: {x: 0, y: 0},
                statusEffects: [],
                facing: 'LEFT',
                animationState: 'WALKING',
                animationFrame: 0,
                frameTimer: 0,
                isElite: isElite,
                eliteType: eliteType,
                speedMultiplier: 1,
                damageMultiplier: 1,
                // Init Boss Props
                bossState: 'IDLE',
                bossTimer: 0
            });
        }

        // Elite Aura Logic - Optimization: Filter elites first to reduce O(N^2) to O(E*N)
        const elites = state.enemies.filter(e => e.isElite);
        
        // Reset buffs first
        state.enemies.forEach(e => {
            e.speedMultiplier = 1;
            e.damageMultiplier = 1;
        });

        // Apply Elite Auras
        elites.forEach(elite => {
            state.enemies.forEach(target => {
                if (elite === target) return; // Don't buff self (or do? game design choice. Let's strictly buff allies)
                
                const dist = Math.hypot(elite.x - target.x, elite.y - target.y);
                if (dist < 150) { // Aura Range
                    if (elite.eliteType === 'SPEED') {
                        target.speedMultiplier = 1.5;
                    } else if (elite.eliteType === 'DAMAGE') {
                        target.damageMultiplier = 2.0;
                    } else if (elite.eliteType === 'REGEN') {
                        // Heal 0.1% of max HP per frame, roughly 6% per second
                        if (target.hp < target.maxHp) {
                            target.hp += target.maxHp * 0.001;
                        }
                    }
                }
            });
        });

        // Enemy Logic
        state.enemies.forEach(enemy => {
            // Boss AI Logic
            if (enemy.type === 'BRUTE_ZOMBIE' || enemy.type === 'TANK_BOT' || enemy.type === 'BOSS_ALIEN') {
                handleBossBehavior(enemy, player, state);
            }

            // Decrement Timers
            if (enemy.hitFlashTimer && enemy.hitFlashTimer > 0) enemy.hitFlashTimer--;
            if (enemy.attackTimer && enemy.attackTimer > 0) enemy.attackTimer--;

            if (Math.abs(enemy.knockback.x) > 0.1 || Math.abs(enemy.knockback.y) > 0.1) {
                enemy.x += enemy.knockback.x;
                enemy.y += enemy.knockback.y;
                enemy.knockback.x *= 0.8;
                enemy.knockback.y *= 0.8;
            } else {
                // Only move if IDLE or COOLDOWN (Bosses stop to WARN/ATTACK usually, or standard enemies always move)
                const isBossStopping = (enemy.type === 'BRUTE_ZOMBIE' || enemy.type === 'TANK_BOT' || enemy.type === 'BOSS_ALIEN') 
                                        && (enemy.bossState === 'WARN' || enemy.bossState === 'ATTACK');
                
                if (!isBossStopping) {
                    const angle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
                    // Apply Speed Multiplier from Elite buffs
                    const effectiveSpeed = enemy.speed * (enemy.speedMultiplier || 1);
                    enemy.x += Math.cos(angle) * effectiveSpeed;
                    enemy.y += Math.sin(angle) * effectiveSpeed;
                    enemy.facing = (player.x > enemy.x) ? 'RIGHT' : 'LEFT';
                }
            }
            
            const dist = Math.hypot(player.x - enemy.x, player.y - enemy.y);
            
            // Attack Animation Trigger - When very close, even if no damage
            if (dist < player.radius + enemy.radius + 5) {
                if (!enemy.attackTimer || enemy.attackTimer <= 0) {
                     enemy.attackTimer = 30; // Start attack cycle (approx 0.5s)
                }
            }

            if (dist < player.radius + enemy.radius) {
                if ((player.invincibleTimer || 0) <= 0) {
                    // Apply Damage Multiplier from Elite buffs
                    const effectiveDamage = enemy.damage * (enemy.damageMultiplier || 1);
                    player.hp -= effectiveDamage;
                    player.invincibleTimer = 30; 
                    if (soundEnabled) playSound('HIT');
                    if (player.hp <= 0) {
                         if (player.revives && player.revives > 0) {
                             player.revives--;
                             player.hp = player.maxHp;
                             player.invincibleTimer = 180;
                             state.enemies = state.enemies.filter(e => Math.hypot(e.x - player.x, e.y - player.y) > 300);
                             if (soundEnabled) playSound('LEVELUP'); 
                         } else {
                             onGameOver(state.score, state.time, state.kills, state.collectedNuts, false);
                         }
                    }
                }
            }
        });

        if (player.invincibleTimer && player.invincibleTimer > 0) player.invincibleTimer--;

        // --- COMPANION SPAWN & LOGIC ---
        if (player.maxCompanions && state.companions.length < player.maxCompanions) {
            // Spawn new companion
            const i = state.companions.length;
            state.companions.push({
                id: `comp-${Date.now()}-${i}`,
                x: player.x, y: player.y,
                radius: 12,
                type: 'COMPANION',
                color: '#BEE3F8', // Light Blue
                offsetAngle: (Math.PI * 2 / player.maxCompanions) * i,
                cooldown: 60,
                cooldownTimer: 0
            });
        }

        state.companions.forEach((comp, i) => {
            // 1. Orbit Player
            const orbitSpeed = 0.02;
            const orbitRadius = 60;
            comp.offsetAngle += orbitSpeed;
            
            const targetX = player.x + Math.cos(comp.offsetAngle + (i * (Math.PI * 2 / state.companions.length))) * orbitRadius;
            const targetY = player.y + Math.sin(comp.offsetAngle + (i * (Math.PI * 2 / state.companions.length))) * orbitRadius;
            
            // Smooth follow
            comp.x += (targetX - comp.x) * 0.1;
            comp.y += (targetY - comp.y) * 0.1;
            
            // 2. Combat Logic
            if (comp.cooldownTimer > 0) {
                comp.cooldownTimer--;
            } else {
                // Find target
                let target = state.enemies.reduce((closest, e) => {
                    const d = Math.hypot(e.x - comp.x, e.y - comp.y);
                    if (!closest || d < closest.dist) return { e, dist: d };
                    return closest;
                }, null as {e: Enemy, dist: number} | null);

                if (target && target.dist < 400) {
                    const angle = Math.atan2(target.e.y - comp.y, target.e.x - comp.x);
                    state.projectiles.push({
                        id: `cp-${Date.now()}-${Math.random()}`,
                        x: comp.x,
                        y: comp.y,
                        radius: 4,
                        type: 'NUT_SHELL',
                        color: '#90CDF4', // Blue Nut
                        velocity: { x: Math.cos(angle) * 8, y: Math.sin(angle) * 8 },
                        damage: 10 * (1 + (player.damageBonus || 0)),
                        duration: 60,
                        pierce: 1,
                        rotation: Math.random() * Math.PI * 2,
                        hostile: false,
                        hitIds: []
                    });
                    comp.cooldownTimer = comp.cooldown;
                }
            }
        });

        // Weapon Logic
        player.weapons.forEach(weapon => {
            if (weapon.type === 'CROW_AURA') {
                // Persistent weapon logic
                // Ensure projectiles exist
                const currentCrows = state.projectiles.filter(p => p.type === 'CROW' && p.attachedTo === player.id);
                if (currentCrows.length < weapon.amount) {
                    const missing = weapon.amount - currentCrows.length;
                    for(let i=0; i<missing; i++) {
                        state.projectiles.push({
                            id: `crow-${Date.now()}-${i}`,
                            x: player.x, y: player.y,
                            radius: 8,
                            type: 'CROW',
                            color: '#1a202c',
                            velocity: { x: 0, y: 0 },
                            damage: weapon.damage,
                            duration: 99999,
                            pierce: 999,
                            rotation: 0,
                            attachedTo: player.id,
                            orbitAngle: (Math.PI * 2 / weapon.amount) * i,
                            orbitRadius: weapon.area,
                            angularVelocity: weapon.speed,
                            hitAnimTimer: 0
                        });
                    }
                }
            }

            if (weapon.cooldownTimer > 0) {
                weapon.cooldownTimer--;
                return;
            }

            let target = state.enemies.reduce((closest, e) => {
                const d = Math.hypot(e.x - player.x, e.y - player.y);
                if (!closest || d < closest.dist) return { e, dist: d };
                return closest;
            }, null as {e: Enemy, dist: number} | null);

            if (target && target.dist < 600) {
                const angle = Math.atan2(target.e.y - player.y, target.e.x - player.x);
                
                if (weapon.type === 'NUT_THROW') {
                    state.projectiles.push({
                        id: `p-${Date.now()}`,
                        x: player.x,
                        y: player.y,
                        radius: weapon.area,
                        type: 'NUT_SHELL',
                        color: '#ecc94b',
                        velocity: { x: Math.cos(angle) * weapon.speed, y: Math.sin(angle) * weapon.speed },
                        damage: weapon.damage,
                        duration: 90,
                        pierce: weapon.level > 2 ? 2 : 1, 
                        rotation: Math.random() * Math.PI * 2,
                        hostile: false,
                        hitIds: []
                    });
                    player.currentAttackType = 'NUT_THROW';
                    player.attackAnimTimer = 15; 
                    weapon.cooldownTimer = weapon.cooldown;
                    if (soundEnabled) playSound('NUT');
                } else if (weapon.type === 'ACORN_CANNON') {
                    state.projectiles.push({
                        id: `cannon-${Date.now()}`,
                        x: player.x,
                        y: player.y,
                        radius: 8, 
                        type: 'EXPLODING_ACORN',
                        color: '#3E2723',
                        velocity: { x: Math.cos(angle) * weapon.speed, y: Math.sin(angle) * weapon.speed },
                        damage: weapon.damage,
                        duration: 120,
                        pierce: 1, 
                        rotation: Math.random() * Math.PI * 2,
                        explodeRadius: weapon.area, 
                        hostile: false,
                        hitIds: []
                    });
                    weapon.cooldownTimer = weapon.cooldown;
                    if (soundEnabled) playSound('CANNON');
                } else if (weapon.type === 'SAP_PUDDLE') {
                    // Multi-shot support for upgrades
                    for (let i = 0; i < weapon.amount; i++) {
                        // Add slight spread if multiple
                        const spread = weapon.amount > 1 ? (i - (weapon.amount - 1) / 2) * 0.2 : 0;
                        const finalAngle = angle + spread;
                        state.projectiles.push({
                            id: `sap-${Date.now()}-${i}`,
                            x: player.x,
                            y: player.y,
                            radius: 6,
                            type: 'SAP_BLOB',
                            color: '#D69E2E', // Amber
                            velocity: { x: Math.cos(finalAngle) * weapon.speed, y: Math.sin(finalAngle) * weapon.speed },
                            damage: weapon.damage, // Ticking damage stored here
                            duration: 60, // Travel time before splatting automatically
                            pierce: 1,
                            rotation: Math.random() * Math.PI * 2,
                            explodeRadius: weapon.area, // Puddle size
                            hostile: false,
                            hitIds: [] // used to track damage duration
                        });
                    }
                    weapon.cooldownTimer = weapon.cooldown;
                    if (soundEnabled) playSound('NUT'); // Squish sound later?
                }
            }
        });

        // ACTIVE ABILITY LOGIC
        if (player.activeAbility) {
            const ability = player.activeAbility;
            
            // Cooldown Management
            if (ability.cooldownTimer > 0) {
                ability.cooldownTimer--;
            }

            // Active Duration Management
            if (ability.activeTimer > 0) {
                ability.activeTimer--;
                
                if (ability.type === 'NUT_BARRAGE') {
                    // Rapid Fire Nuts (Machine Gun)
                    if (ability.activeTimer % 5 === 0) { // Fire every 5 frames
                        const baseAngle = player.facing === 'RIGHT' ? 0 : Math.PI;
                        // Spread: -30 to +30 degrees (approx PI/6 radians)
                        const spread = (Math.random() - 0.5) * (Math.PI / 3);
                        const finalAngle = baseAngle + spread;
                        
                        state.projectiles.push({
                            id: `barrage-${Date.now()}-${Math.random()}`,
                            x: player.x,
                            y: player.y,
                            radius: 6,
                            type: 'NUT_SHELL',
                            color: '#F6AD55', // Glowing Orange
                            velocity: { 
                                x: Math.cos(finalAngle) * 12, // Faster
                                y: Math.sin(finalAngle) * 12 
                            },
                            damage: 20 * (1 + (player.damageBonus || 0)),
                            duration: 60,
                            pierce: 2,
                            rotation: Math.random() * Math.PI * 2,
                            hostile: false,
                            hitIds: []
                        });
                        if (soundEnabled) playSound('NUT');
                    }
                }
            }
        }

        // Projectiles Logic
        for (let i = state.projectiles.length - 1; i >= 0; i--) {
            const p = state.projectiles[i];
            
            if (p.type === 'CROW') {
                // Update Orbit Position
                const host = state.player; // Currently only attached to player
                if (p.orbitAngle !== undefined && p.orbitRadius !== undefined && p.angularVelocity !== undefined) {
                    p.orbitAngle += p.angularVelocity;
                    p.x = host.x + Math.cos(p.orbitAngle) * p.orbitRadius;
                    p.y = host.y + Math.sin(p.orbitAngle) * p.orbitRadius;
                    
                    // Face travel direction
                    p.facing = Math.cos(p.orbitAngle + Math.PI/2) > 0 ? 'RIGHT' : 'LEFT'; 
                }
                if (p.hitAnimTimer && p.hitAnimTimer > 0) p.hitAnimTimer--;
            } else if (p.type === 'EXPLOSION') {
                p.duration--;
                if (p.duration <= 0) {
                    state.projectiles.splice(i, 1);
                    continue;
                }
                continue;
            } else if (p.type === 'SAP_PUDDLE') {
                // --- SAP PUDDLE LOGIC ---
                // Doesn't move. Checks collision with enemies to apply slow/damage.
                p.duration--;
                
                // Tick damage every 30 frames (0.5s)
                const shouldDamage = p.duration % 30 === 0;
                
                state.enemies.forEach(e => {
                    const dist = Math.hypot(p.x - e.x, p.y - e.y);
                    if (dist < p.radius + e.radius) {
                        // Apply Slow
                        e.statusEffects.push({
                            type: 'SLOW',
                            duration: 10, // Reapply constantly while standing in it
                            magnitude: 0.5
                        });
                        
                        // Apply Damage
                        if (shouldDamage) {
                            e.hp -= p.damage;
                            state.texts.push({
                                id: `dot-${Date.now()}-${Math.random()}`,
                                x: e.x, y: e.y - 10,
                                text: Math.round(p.damage).toString(),
                                life: 20,
                                color: '#D69E2E',
                                velocity: { x: 0, y: -0.5 }
                            });
                        }
                    }
                });

                if (p.duration <= 0) {
                    state.projectiles.splice(i, 1);
                }
                continue; // Skip movement logic
            } else {
                p.x += p.velocity.x;
                p.y += p.velocity.y;
                p.duration--;
            }
            
            // Rotation update
            p.rotation += 0.2;

            // ACORN CANNON TRAIL
            if (p.type === 'EXPLODING_ACORN') {
                // Spawn smoke trail periodically
                if (state.time % 4 === 0) {
                    state.particles.push({
                        id: `trail-${Date.now()}-${Math.random()}`,
                        x: p.x, y: p.y,
                        radius: Math.random() * 3 + 2,
                        type: 'SMOKE',
                        color: 'rgba(100, 100, 100, 0.5)',
                        velocity: { x: (Math.random() - 0.5) * 0.5, y: (Math.random() - 0.5) * 0.5 },
                        life: 20, maxLife: 20, scale: 1,
                        drift: { x: 0, y: -0.2 }
                    });
                }
            }
            
            // HOSTILE PROJECTILE HIT PLAYER LOGIC
            if (p.hostile) {
                if ((player.invincibleTimer || 0) <= 0) {
                    if (Math.hypot(p.x - player.x, p.y - player.y) < p.radius + player.radius) {
                        player.hp -= p.damage;
                        player.invincibleTimer = 30;
                        if (soundEnabled) playSound('HIT');
                        
                        // Knockback player
                        const angle = Math.atan2(player.y - p.y, player.x - p.x);
                        player.velocity.x += Math.cos(angle) * 10;
                        player.velocity.y += Math.sin(angle) * 10;

                        if (p.type !== 'SHOCKWAVE') {
                            // Destroy projectile unless it's a wave
                            state.projectiles.splice(i, 1);
                            continue; 
                        }
                        
                        if (player.hp <= 0) {
                             if (player.revives && player.revives > 0) {
                                 player.revives--;
                                 player.hp = player.maxHp;
                                 player.invincibleTimer = 180;
                                 // Clear nearby enemies
                                 state.enemies = state.enemies.filter(e => Math.hypot(e.x - player.x, e.y - player.y) > 300);
                                 if (soundEnabled) playSound('LEVELUP'); 
                             } else {
                                 onGameOver(state.score, state.time, state.kills, state.collectedNuts, false);
                             }
                        }
                    }
                }
            } else {
                // PLAYER PROJECTILE HIT ENEMY LOGIC
                for (let j = state.enemies.length - 1; j >= 0; j--) {
                    const e = state.enemies[j];
                    if (p.hitIds?.includes(e.id)) continue;

                    if (Math.hypot(p.x - e.x, p.y - e.y) < p.radius + e.radius) {
                        
                        if (p.type === 'EXPLODING_ACORN') {
                            // ... (Explosion Logic) ...
                            const boomRadius = p.explodeRadius || 60;
                            if (soundEnabled) playSound('EXPLOSION');
                            state.projectiles.push({
                                id: `boom-${Date.now()}`,
                                x: p.x, y: p.y,
                                radius: boomRadius,
                                type: 'EXPLOSION',
                                color: '#F6AD55',
                                velocity: {x:0, y:0},
                                damage: 0,
                                duration: 15, 
                                pierce: 0,
                                rotation: 0,
                                hostile: false
                            });
                            
                            // SCREEN SHAKE
                            state.shake = { intensity: 15, duration: 20 };

                            // VISUAL PARTICLES (Impact)
                            // Flash
                            state.particles.push({
                                id: `flash-${Date.now()}`,
                                x: p.x, y: p.y, radius: 40,
                                type: 'FLASH', color: 'white',
                                velocity: {x:0,y:0}, life: 5, maxLife: 5, scale: 1
                            });
                            // Sparks
                            for(let k=0; k<12; k++) {
                                const angle = Math.random() * Math.PI * 2;
                                const speed = Math.random() * 6 + 2;
                                state.particles.push({
                                    id: `spark-${Date.now()}-${k}`,
                                    x: p.x, y: p.y, radius: Math.random() * 3 + 2,
                                    type: 'SPARK', color: '#F6E05E',
                                    velocity: { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed },
                                    life: 25, maxLife: 25, scale: 1
                                });
                            }
                            // Smoke
                            for(let k=0; k<5; k++) {
                                const angle = Math.random() * Math.PI * 2;
                                const speed = Math.random() * 2;
                                state.particles.push({
                                    id: `smk-${Date.now()}-${k}`,
                                    x: p.x, y: p.y, radius: Math.random() * 8 + 5,
                                    type: 'SMOKE', color: 'rgba(80, 80, 80, 0.6)',
                                    velocity: { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed },
                                    life: 40, maxLife: 40, scale: 1
                                });
                            }

                            state.enemies.forEach(target => {
                                const dist = Math.hypot(target.x - p.x, target.y - p.y);
                                if (dist < boomRadius) {
                                    target.hp -= p.damage;
                                    target.hitFlashTimer = 10;
                                    const angle = Math.atan2(target.y - p.y, target.x - p.x);
                                    target.knockback = { x: Math.cos(angle) * 12, y: Math.sin(angle) * 12 };
                                }
                            });
                            state.projectiles.splice(i, 1);
                            break; 
                        } else if (p.type === 'SAP_BLOB') {
                            // --- SAP SPLAT LOGIC ---
                            const weapon = player.weapons.find(w => w.type === 'SAP_PUDDLE');
                            const puddleDur = weapon?.duration || 300; 
                            const puddleRad = weapon?.area || 50;

                            state.projectiles.push({
                                id: `puddle-${Date.now()}-${Math.random()}`,
                                x: p.x,
                                y: p.y,
                                radius: puddleRad,
                                type: 'SAP_PUDDLE',
                                color: '#D69E2E',
                                velocity: {x: 0, y: 0},
                                damage: p.damage,
                                duration: puddleDur,
                                pierce: 999,
                                rotation: 0,
                                hostile: false
                            });
                            
                            state.projectiles.splice(i, 1);
                            break;
                        }

                        // Normal Hit Logic
                        e.hp -= p.damage;
                        e.knockback = { 
                            x: (p.velocity.x || 0) * 0.5, 
                            y: (p.velocity.y || 0) * 0.5 
                        };
                        e.hitFlashTimer = 5; // Flash effect
                        if (!p.hitIds) p.hitIds = [];
                        
                        p.hitIds.push(e.id);
                        
                        if (p.type === 'CROW') {
                            p.hitAnimTimer = 10; // Visual flare
                            if (soundEnabled) playSound('FEATHER');
                            if (state.time % 20 === 0) p.hitIds = [];
                        } else {
                            p.pierce--;
                        }
                        
                        state.texts.push({
                            id: `txt-${Date.now()}-${Math.random()}`,
                            x: e.x, y: e.y - 20,
                            text: Math.round(p.damage).toString(),
                            life: 30,
                            color: '#fff',
                            velocity: { x: 0, y: -1 }
                        });

                        if (e.hp <= 0) {
                            state.enemies.splice(j, 1);
                            state.kills++;
                            state.score += e.isElite ? 100 : 10;
                            // Increased XP Drops: 25 for normal, 250 for elite
                            state.drops.push({
                                id: `d-${Date.now()}`,
                                x: e.x, y: e.y,
                                radius: 5,
                                type: 'DROP',
                                color: '#4299e1',
                                kind: 'XP',
                                value: e.isElite ? 250 : 25
                            });
                            if (Math.random() < (e.isElite ? 0.8 : 0.1)) {
                                state.drops.push({
                                    id: `n-${Date.now()}`,
                                    x: e.x + 5, y: e.y,
                                    radius: 6,
                                    type: 'DROP',
                                    color: '#d69e2e',
                                    kind: 'GOLD',
                                    value: e.isElite ? 10 : 1
                                });
                            }
                        }

                        if (p.pierce <= 0 && p.type !== 'CROW') {
                            state.projectiles.splice(i, 1);
                            break;
                        }
                    }
                }
            }
            
            // Cleanup expired projectiles (if not already removed)
            if (i < state.projectiles.length && state.projectiles[i] === p && p.duration <= 0) {
                // If SAP_BLOB expires in air, it also becomes a puddle
                if (p.type === 'SAP_BLOB') {
                     const weapon = player.weapons.find(w => w.type === 'SAP_PUDDLE');
                     const puddleDur = weapon?.duration || 300; 
                     const puddleRad = weapon?.area || 50;
                     state.projectiles.push({
                        id: `puddle-${Date.now()}-${Math.random()}`,
                        x: p.x, y: p.y,
                        radius: puddleRad,
                        type: 'SAP_PUDDLE',
                        color: '#D69E2E',
                        velocity: {x: 0, y: 0},
                        damage: p.damage,
                        duration: puddleDur,
                        pierce: 999,
                        rotation: 0,
                        hostile: false
                    });
                }
                // If Acorn Cannon expires without hitting, still explode
                if (p.type === 'EXPLODING_ACORN') {
                    // ... (Same explosion logic as hit) ...
                    const boomRadius = p.explodeRadius || 60;
                    if (soundEnabled) playSound('EXPLOSION');
                    state.projectiles.push({
                        id: `boom-${Date.now()}`,
                        x: p.x, y: p.y, radius: boomRadius, type: 'EXPLOSION', color: '#F6AD55',
                        velocity: {x:0, y:0}, damage: 0, duration: 15, pierce: 0, rotation: 0, hostile: false
                    });
                    
                    state.shake = { intensity: 15, duration: 20 };
                    
                    // Particles
                    state.particles.push({
                        id: `flash-${Date.now()}`, x: p.x, y: p.y, radius: 40, type: 'FLASH', color: 'white',
                        velocity: {x:0,y:0}, life: 5, maxLife: 5, scale: 1
                    });
                    for(let k=0; k<10; k++) {
                        const angle = Math.random() * Math.PI * 2;
                        const speed = Math.random() * 6 + 2;
                        state.particles.push({
                            id: `spark-${Date.now()}-${k}`, x: p.x, y: p.y, radius: Math.random() * 3 + 2, type: 'SPARK', color: '#F6E05E',
                            velocity: { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed }, life: 25, maxLife: 25, scale: 1
                        });
                    }
                    
                    // Damage nearby
                    state.enemies.forEach(target => {
                        const dist = Math.hypot(target.x - p.x, target.y - p.y);
                        if (dist < boomRadius) {
                            target.hp -= p.damage;
                            target.hitFlashTimer = 10;
                            const angle = Math.atan2(target.y - p.y, target.x - p.x);
                            target.knockback = { x: Math.cos(angle) * 12, y: Math.sin(angle) * 12 };
                        }
                    });
                }
                state.projectiles.splice(i, 1);
            }
        }
        
        // Enemy Death Cleanup
        for (let i = state.enemies.length - 1; i >= 0; i--) {
            const e = state.enemies[i];
            if (e.hp <= 0) {
                state.enemies.splice(i, 1);
                state.kills++;
                state.score += e.isElite ? 100 : 10;
                // Increased XP Drops: 25 for normal, 250 for elite
                state.drops.push({
                    id: `d-${Date.now()}`,
                    x: e.x, y: e.y,
                    radius: 5,
                    type: 'DROP',
                    color: '#4299e1',
                    kind: 'XP',
                    value: e.isElite ? 250 : 25
                });
                if (Math.random() < (e.isElite ? 0.8 : 0.1)) {
                    state.drops.push({
                        id: `n-${Date.now()}`,
                        x: e.x + 5, y: e.y,
                        radius: 6,
                        type: 'DROP',
                        color: '#d69e2e',
                        kind: 'GOLD',
                        value: e.isElite ? 10 : 1
                    });
                }
                // Rare Chance for Health Pack (1%)
                if (Math.random() < 0.01) {
                    state.drops.push({
                        id: `hp-${Date.now()}-${Math.random()}`,
                        x: e.x + (Math.random() * 10 - 5),
                        y: e.y + (Math.random() * 10 - 5),
                        radius: 7,
                        type: 'DROP',
                        color: '#e53e3e', // Red
                        kind: 'HEALTH_PACK',
                        value: 20 // Heal amount
                    });
                }
            }
        }

        // Update Particles
        for (let i = state.particles.length - 1; i >= 0; i--) {
            const p = state.particles[i];
            p.x += p.velocity.x;
            p.y += p.velocity.y;
            p.life--;
            
            // Friction/Drift
            p.velocity.x *= 0.9;
            p.velocity.y *= 0.9;
            if (p.drift) {
                p.x += p.drift.x;
                p.y += p.drift.y;
            }
            
            if (p.life <= 0) {
                state.particles.splice(i, 1);
            }
        }

        // Drops
        for (let i = state.drops.length - 1; i >= 0; i--) {
            const drop = state.drops[i];
            const d = Math.hypot(player.x - drop.x, player.y - drop.y);
            if (d < player.magnetRadius) {
                const angle = Math.atan2(player.y - drop.y, player.x - drop.x);
                drop.x += Math.cos(angle) * 8;
                drop.y += Math.sin(angle) * 8;
            }
            if (d < player.radius) {
                if (drop.kind === 'XP') {
                    player.xp += drop.value;
                    if (player.xp >= player.nextLevelXp) {
                        player.level++;
                        player.xp -= player.nextLevelXp;
                        player.nextLevelXp = Math.floor(player.nextLevelXp * 1.2);
                        if (soundEnabled) playSound('LEVELUP');
                        const randomUpgrades = ALL_UPGRADES.sort(() => 0.5 - Math.random()).slice(0, 3);
                        onLevelUp(randomUpgrades, (u) => {
                             const p = stateRef.current?.player;
                             if (!p) return;
                             u.apply(p);
                             p.hp = Math.min(p.maxHp, p.hp + 10);
                             if (stateRef.current) {
                                 stateRef.current.texts.push({
                                     id: `upg-${Date.now()}`, x: p.x, y: p.y - 30, text: `${u.name}!`, life: 60, color: '#F6E05E', velocity: { x: 0, y: -1 }
                                 });
                             }
                             if (soundEnabled) playSound('LEVELUP');
                        });
                    }
                } else if (drop.kind === 'GOLD') {
                    state.collectedNuts += drop.value;
                    if (soundEnabled) playSound('COLLECT');
                } else if (drop.kind === 'HEALTH_PACK') {
                    player.hp = Math.min(player.maxHp, player.hp + drop.value);
                    if (soundEnabled) playSound('COLLECT');
                    state.texts.push({
                        id: `heal-${Date.now()}`, x: player.x, y: player.y - 20, text: `+${drop.value} HP`, life: 40, color: '#48BB78', velocity: { x: 0, y: -1 }
                    });
                }
                state.drops.splice(i, 1);
            }
        }

        // Floating Text
        for (let i = state.texts.length - 1; i >= 0; i--) {
            state.texts[i].x += state.texts[i].velocity.x;
            state.texts[i].y += state.texts[i].velocity.y;
            state.texts[i].life--;
            if (state.texts[i].life <= 0) state.texts.splice(i, 1);
        }

        if (state.time >= GAME_WIN_TIME) {
            onStageComplete(player, state.score, state.kills, state.collectedNuts);
        }
    };

    const handleBossBehavior = (enemy: Enemy, player: Player, state: GameState) => {
        if (!enemy.bossState) enemy.bossState = 'IDLE';
        if (enemy.bossTimer === undefined) enemy.bossTimer = 0;

        enemy.bossTimer--;

        if (enemy.bossTimer <= 0) {
            // State Transition
            switch (enemy.bossState) {
                case 'IDLE':
                    // Move to WARN (Attack Prep)
                    enemy.bossState = 'WARN';
                    enemy.bossTimer = 60; // 1 second telegraph
                    // Only lock target location once at start of warn? Or track?
                    // Simple telegraph: Lock location now
                    //enemy.targetLocation = { x: player.x, y: player.y }; 
                    break;
                case 'WARN':
                    // Move to ATTACK
                    enemy.bossState = 'ATTACK';
                    enemy.bossTimer = 30; // Short attack execution window
                    executeBossAttack(enemy, player, state);
                    break;
                case 'ATTACK':
                    // Move to COOLDOWN
                    enemy.bossState = 'COOLDOWN';
                    enemy.bossTimer = 120; // 2 seconds cooldown
                    break;
                case 'COOLDOWN':
                    // Back to IDLE
                    enemy.bossState = 'IDLE';
                    enemy.bossTimer = 180; // 3 seconds chasing/idle
                    break;
            }
        }
    };

    const executeBossAttack = (enemy: Enemy, player: Player, state: GameState) => {
        if (soundEnabled) playSound('CANNON'); // Generic heavy sound

        if (enemy.type === 'BRUTE_ZOMBIE') {
            // GROUND SMASH: AOE Shockwave
            // Create expanding hitbox projectile
            state.projectiles.push({
                id: `boss-atk-${Date.now()}`,
                x: enemy.x,
                y: enemy.y,
                radius: 10, // Starts small
                type: 'SHOCKWAVE',
                color: '#ffffff',
                velocity: { x: 0, y: 0 }, // Stationary center
                damage: 30,
                duration: 30, // 0.5s expansion
                pierce: 999,
                rotation: 0,
                hostile: true,
                hitIds: []
            });
        } else if (enemy.type === 'TANK_BOT') {
            // MISSILE BARRAGE
            // Shoot 3 missiles
            for(let i=-1; i<=1; i++) {
                const angle = Math.atan2(player.y - enemy.y, player.x - enemy.x) + (i * 0.3);
                state.projectiles.push({
                    id: `boss-atk-${Date.now()}-${i}`,
                    x: enemy.x,
                    y: enemy.y,
                    radius: 8,
                    type: 'BOSS_MISSILE',
                    color: '#F56565',
                    velocity: { x: Math.cos(angle) * 6, y: Math.sin(angle) * 6 },
                    damage: 20,
                    duration: 120,
                    pierce: 1,
                    rotation: angle,
                    hostile: true,
                    hitIds: []
                });
            }
        } else if (enemy.type === 'BOSS_ALIEN') {
            // MINION SUMMON
            if (soundEnabled) playSound('AURA'); // Psychic warp sound
            for(let i=0; i<2; i++) {
                const angle = Math.random() * Math.PI * 2;
                const dist = 50;
                state.enemies.push({
                    id: `minion-${Date.now()}-${i}`,
                    x: enemy.x + Math.cos(angle) * dist,
                    y: enemy.y + Math.sin(angle) * dist,
                    radius: 12,
                    type: 'ALIEN', 
                    color: COLORS.alien, 
                    hp: 30,
                    maxHp: 30,
                    speed: 3,
                    damage: 5,
                    knockback: {x: 0, y: 0},
                    statusEffects: [],
                    facing: 'LEFT',
                    animationState: 'WALKING',
                    animationFrame: 0,
                    frameTimer: 0,
                    isElite: false
                });
            }
        }
    };

    const draw = (ctx: CanvasRenderingContext2D, state: GameState) => {
        const { player } = state;
        
        // 1. Camera Logic (Smooth "Leading" camera)
        // Target is player position + offset based on velocity to look ahead
        const targetCamX = player.x + player.velocity.x * 20;
        const targetCamY = player.y + player.velocity.y * 20;
        
        // Linear Interpolation for smoothness (0.1 factor)
        cameraRef.current.x += (targetCamX - cameraRef.current.x) * 0.1;
        cameraRef.current.y += (targetCamY - cameraRef.current.y) * 0.1;

        // Calculate Shake Offset
        let shakeX = 0;
        let shakeY = 0;
        if (state.shake.intensity > 0) {
            shakeX = (Math.random() - 0.5) * state.shake.intensity;
            shakeY = (Math.random() - 0.5) * state.shake.intensity;
        }

        ctx.fillStyle = '#1a202c';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        ctx.save();
        // Translate to Center Player/Camera with Shake
        // Shift rendering down by 15% of screen height so character appears lower
        const verticalOffset = CANVAS_HEIGHT * 0.15;
        ctx.translate(
            (CANVAS_WIDTH / 2 - cameraRef.current.x) + shakeX, 
            (CANVAS_HEIGHT / 2 - cameraRef.current.y) + shakeY + verticalOffset
        );

        // Draw Map Boundary / Ground
        if (groundPatternRef.current) {
            ctx.fillStyle = groundPatternRef.current;
            ctx.fillRect(state.mapBounds.minX - 500, state.mapBounds.minY - 500, (state.mapBounds.maxX - state.mapBounds.minX) + 1000, (state.mapBounds.maxY - state.mapBounds.minY) + 1000);
        }
        
        ctx.strokeStyle = '#f56565';
        ctx.lineWidth = 10;
        ctx.strokeRect(state.mapBounds.minX, state.mapBounds.minY, state.mapBounds.maxX - state.mapBounds.minX, state.mapBounds.maxY - state.mapBounds.minY);

        // Draw Obstacles (Trees)
        state.obstacles.forEach(obs => {
             drawTree(ctx, obs);
        });

        // Draw Drops
        state.drops.forEach(drop => {
             ctx.fillStyle = drop.color;
             ctx.beginPath();
             ctx.arc(drop.x, drop.y, drop.radius, 0, Math.PI * 2);
             ctx.fill();
             
             // Detail on drops
             if (drop.kind === 'HEALTH_PACK') {
                 // White cross
                 ctx.fillStyle = 'white';
                 ctx.fillRect(drop.x - 4, drop.y - 1.5, 8, 3);
                 ctx.fillRect(drop.x - 1.5, drop.y - 4, 3, 8);
             } else {
                 // Shine
                 ctx.fillStyle = 'rgba(255,255,255,0.6)';
                 ctx.beginPath();
                 ctx.arc(drop.x - 2, drop.y - 2, 2, 0, Math.PI * 2);
                 ctx.fill();
             }
        });

        // Draw Puddles (Under Enemies)
        state.projectiles.forEach(p => {
            if (p.type === 'SAP_PUDDLE') {
                drawProjectile(ctx, p, state.time);
            }
        });

        // Draw Enemies using procedural vector engine
        state.enemies.forEach(e => {
            drawEnemy(ctx, e, state.time);
        });

        // --- DRAW COMPANIONS ---
        state.companions.forEach(comp => {
            ctx.save();
            ctx.translate(comp.x, comp.y);
            
            // Mini shadow
            ctx.fillStyle = 'rgba(0,0,0,0.3)';
            ctx.beginPath(); ctx.ellipse(0, 6, 8, 3, 0, 0, Math.PI*2); ctx.fill();
            
            // Render Squirrel Body scaled down
            const compPlayerMock = {
                ...player,
                x: 0, y: 0,
                radius: comp.radius,
                color: comp.color,
                secondaryColor: '#FFFFFF',
                facing: (player.x > comp.x) ? 'RIGHT' : 'LEFT',
                animationState: 'RUN' // Always look active
            } as Player;
            
            drawSquirrel(ctx, compPlayerMock, state.time + (comp.id.length * 100));
            ctx.restore();
        });

        // --- DRAW PLAYER (NEW VECTOR SQUIRREL) ---
        
        // 1. Dash Trail / Effect
        drawDashEffect(ctx, player);

        // 2. Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.ellipse(player.x, player.y + (player.radius * 0.8), player.radius, player.radius * 0.4, 0, 0, Math.PI*2);
        ctx.fill();

        // 3. The Squirrel
        drawSquirrel(ctx, player, state.time);
        
        // 4. Stamina Bar (If rushing)
        if (player.stamina < player.maxStamina) {
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(player.x - 15, player.y + 25, 30, 4);
            ctx.fillStyle = '#63B3ED'; // Blue stamina
            ctx.fillRect(player.x - 15, player.y + 25, 30 * (player.stamina / player.maxStamina), 4);
        }

        // --- END PLAYER DRAW ---

        // Projectiles
        state.projectiles.forEach(p => {
             if (p.type === 'EXPLOSION') {
                 drawExplosion(ctx, p, state.time);
             } else if (p.type !== 'SAP_PUDDLE') {
                 drawProjectile(ctx, p, state.time);
             }
        });

        // Particles
        state.particles.forEach(p => {
            drawParticle(ctx, p);
        });

        // Floating Texts
        state.texts.forEach(t => {
            ctx.fillStyle = t.color;
            ctx.font = 'bold 16px sans-serif';
            ctx.fillText(t.text, t.x, t.y);
            ctx.lineWidth = 1;
            ctx.strokeStyle = 'black';
            ctx.strokeText(t.text, t.x, t.y);
        });

        ctx.restore();
        
        // --- DRAW JOYSTICK ---
        // We draw it on top of everything in screen space (not camera space)
        if (joystickRef.current.active) {
            ctx.save();
            const { origin, current } = joystickRef.current;
            
            // Base
            ctx.beginPath();
            ctx.arc(origin.x, origin.y, 50, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.fill();
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.lineWidth = 2;
            ctx.stroke();
            
            // Knob
            ctx.beginPath();
            ctx.arc(current.x, current.y, 25, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.fill();
            
            ctx.restore();
        }
    };

    return (
        <div 
            ref={containerRef}
            className="w-full h-full relative touch-none select-none"
        >
            <canvas 
                ref={canvasRef} 
                width={CANVAS_WIDTH} 
                height={CANVAS_HEIGHT}
                className="block w-full h-full"
            />
            
            {/* Mobile Action Buttons Overlay */}
            {/* Changed from bottom-8 right-8 to right-center */}
            <div className="absolute top-1/2 right-4 -translate-y-1/2 flex flex-col gap-6 pointer-events-auto z-40">
                <button 
                    className="w-12 h-12 rounded-full bg-blue-600/50 border-2 border-white/30 flex items-center justify-center text-white active:scale-95 transition-transform shadow-lg backdrop-blur-sm"
                    onTouchStart={(e) => { e.stopPropagation(); actionsRef.current.ability = true; setMobileActions(p => ({...p, ability: true})); }}
                    onTouchEnd={() => setMobileActions(p => ({...p, ability: false}))}
                    onMouseDown={(e) => { e.stopPropagation(); actionsRef.current.ability = true; setMobileActions(p => ({...p, ability: true})); }}
                    onMouseUp={() => setMobileActions(p => ({...p, ability: false}))}
                >
                    <Zap size={24} />
                </button>
                
                <button 
                    className="w-16 h-16 rounded-full bg-amber-600/50 border-2 border-white/30 flex items-center justify-center text-white active:scale-95 transition-transform shadow-lg backdrop-blur-sm"
                    onTouchStart={(e) => { e.stopPropagation(); actionsRef.current.dash = true; setMobileActions(p => ({...p, dash: true})); }}
                    onTouchEnd={() => setMobileActions(p => ({...p, dash: false}))}
                    onMouseDown={(e) => { e.stopPropagation(); actionsRef.current.dash = true; setMobileActions(p => ({...p, dash: true})); }}
                    onMouseUp={() => setMobileActions(p => ({...p, dash: false}))}
                >
                    <Wind size={32} />
                </button>
            </div>
        </div>
    );
};
