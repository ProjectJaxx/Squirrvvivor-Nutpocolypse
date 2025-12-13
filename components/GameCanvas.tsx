
import React, { useRef, useEffect, useCallback, useState } from 'react';
import { GameState, Player, Upgrade, SquirrelCharacter, StageDuration, Enemy, Entity } from '../types';
import { INITIAL_GAME_STATE, INITIAL_PLAYER, COLORS } from '../constants';
import { ALL_UPGRADES } from '../upgrades';
import { playSound, playMusic, stopMusic } from '../services/soundService';
import { renderParticles } from '../services/renderService';
import { assets } from '../services/assetService';

interface GameCanvasProps {
  onGameOver: (score: number, time: number, kills: number, nuts: number, won: boolean) => void;
  onStageComplete: (player: Player, score: number, kills: number, nuts: number) => void;
  onLevelUp: (upgrades: Upgrade[], callback: (u: Upgrade) => void) => void;
  paused: boolean;
  character: SquirrelCharacter;
  initialPlayer?: Player;
  stageNumber: number;
  soundEnabled: boolean;
  musicEnabled: boolean;
  stageDuration: StageDuration;
  onTogglePause: () => void;
  onStatsUpdate: (stats: any) => void;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({
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
  const gameStateRef = useRef<GameState>(JSON.parse(JSON.stringify(INITIAL_GAME_STATE)));
  const requestRef = useRef<number>(0);
  const keysPressed = useRef<{ [key: string]: boolean }>({});
  
  // Track window dimensions for resizing
  const [dimensions, setDimensions] = useState({ 
      width: typeof window !== 'undefined' ? window.innerWidth : 1280, 
      height: typeof window !== 'undefined' ? window.innerHeight : 720 
  });

  // Pattern Caches
  const grassPatternRef = useRef<CanvasPattern | null>(null);
  const borderPatternRef = useRef<CanvasPattern | null>(null);

  // Constants
  const MAP_LIMIT = 1500; // Playable radius (3000px wide arena)
  const BORDER_THICKNESS = 2000; // Visual thickness of border

  // 1. Initialize Patterns (Grass & Biome Border)
  useEffect(() => {
      const isWaterStage = stageNumber % 2 === 0; // Even stages are water
      
      // -- Grass Pattern --
      const gCan = document.createElement('canvas');
      gCan.width = 512;
      gCan.height = 512;
      const gCtx = gCan.getContext('2d');
      if (gCtx) {
          // Base Ground
          gCtx.fillStyle = '#276749'; 
          gCtx.fillRect(0, 0, 512, 512);
          
          // Dirt Patches for variety
          for(let i=0; i<30; i++) {
              gCtx.fillStyle = 'rgba(40, 30, 20, 0.15)';
              gCtx.beginPath();
              gCtx.arc(Math.random() * 512, Math.random() * 512, 10 + Math.random() * 40, 0, Math.PI*2);
              gCtx.fill();
          }

          // Detailed Grass Blades
          for(let i=0; i<12000; i++) {
              const x = Math.random() * 512;
              const y = Math.random() * 512;
              const len = 3 + Math.random() * 5;
              const angle = (Math.random() - 0.5) * 0.8 - (Math.PI / 2); // Mostly up

              const shade = Math.random();
              if (shade < 0.33) gCtx.strokeStyle = '#22543d'; // Dark
              else if (shade < 0.66) gCtx.strokeStyle = '#2f855a'; // Mid
              else gCtx.strokeStyle = '#48bb78'; // Light Highlight

              gCtx.lineWidth = 1.5;
              gCtx.lineCap = 'round';
              gCtx.beginPath();
              gCtx.moveTo(x, y);
              gCtx.lineTo(x + Math.cos(angle) * len, y + Math.sin(angle) * len);
              gCtx.stroke();
          }
      }

      // -- Border Pattern (Forest or Water) --
      const bCan = document.createElement('canvas');
      const bSize = 512; // Higher res pattern for borders
      bCan.width = bSize;
      bCan.height = bSize;
      const bCtx = bCan.getContext('2d');
      
      if (bCtx) {
          if (isWaterStage) {
              // WATER - Deep Ocean Detail
              const grad = bCtx.createLinearGradient(0,0,0,bSize);
              grad.addColorStop(0, '#2b6cb0');
              grad.addColorStop(1, '#2c5282');
              bCtx.fillStyle = grad;
              bCtx.fillRect(0, 0, bSize, bSize);
              
              // Waves - Multiple Layers
              for(let i=0; i<300; i++) {
                  const opacity = 0.1 + Math.random() * 0.2;
                  bCtx.strokeStyle = `rgba(190, 227, 248, ${opacity})`; // Light blue/white foam
                  bCtx.lineWidth = 1 + Math.random() * 2;
                  const x = Math.random() * bSize;
                  const y = Math.random() * bSize;
                  const len = 10 + Math.random() * 30;
                  
                  bCtx.beginPath();
                  bCtx.moveTo(x, y);
                  // Gentle curve
                  bCtx.bezierCurveTo(x + len/3, y - 3, x + 2*len/3, y + 3, x + len, y);
                  bCtx.stroke();
              }
              
              // Sparkles
              for(let i=0; i<50; i++) {
                  bCtx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.5})`;
                  const x = Math.random() * bSize;
                  const y = Math.random() * bSize;
                  bCtx.beginPath();
                  bCtx.arc(x, y, 1 + Math.random(), 0, Math.PI*2);
                  bCtx.fill();
              }

          } else {
              // THICK FOREST - Detailed Pine Trees
              bCtx.fillStyle = '#0d1f16'; // Very dark forest floor
              bCtx.fillRect(0, 0, bSize, bSize);
              
              // Undergrowth noise
              for(let i=0; i<1000; i++) {
                  bCtx.fillStyle = Math.random() > 0.5 ? '#12291d' : '#0a1610';
                  bCtx.fillRect(Math.random() * bSize, Math.random() * bSize, 2, 2);
              }

              const drawPine = (x: number, y: number, r: number) => {
                  // Drop Shadow
                  bCtx.fillStyle = 'rgba(0,0,0,0.7)';
                  bCtx.beginPath();
                  bCtx.arc(x + r*0.3, y + r*0.3, r, 0, Math.PI*2);
                  bCtx.fill();

                  // Tree Layers (Bottom to Top)
                  const layers = 3;
                  for (let l=0; l<layers; l++) {
                      const layerR = r * (1 - l*0.25);
                      // Gradient green colors
                      const g = 30 + (l * 20); 
                      bCtx.fillStyle = `rgb(10, ${g}, 25)`; 
                      
                      // Starburst / Spiky circle
                      bCtx.beginPath();
                      const spikes = 9;
                      for (let s=0; s<spikes*2; s++) {
                          const angle = (s * Math.PI) / spikes;
                          const radius = s % 2 === 0 ? layerR : layerR * 0.6;
                          bCtx.lineTo(x + Math.cos(angle) * radius, y + Math.sin(angle) * radius);
                      }
                      bCtx.closePath();
                      bCtx.fill();
                  }
                  
                  // Center Tip highlight
                  bCtx.fillStyle = 'rgba(72, 187, 120, 0.3)';
                  bCtx.beginPath();
                  bCtx.arc(x, y, r * 0.15, 0, Math.PI*2);
                  bCtx.fill();
              };

              // Dense population
              for(let i=0; i<250; i++) {
                  const x = Math.random() * bSize;
                  const y = Math.random() * bSize;
                  const r = 15 + Math.random() * 25; // Random sizes
                  drawPine(x, y, r);
              }
          }
      }

      // Create Patterns
      const mainCtx = canvasRef.current?.getContext('2d');
      if (mainCtx) {
          grassPatternRef.current = mainCtx.createPattern(gCan, 'repeat');
          borderPatternRef.current = mainCtx.createPattern(bCan, 'repeat');
      }

  }, [stageNumber]);

  useEffect(() => {
    // Handle Window Resize
    const handleResize = () => {
        setDimensions({
            width: window.innerWidth,
            height: window.innerHeight
        });
    };
    window.addEventListener('resize', handleResize);

    // 1. Initialize State Deep Copy
    gameStateRef.current = JSON.parse(JSON.stringify(INITIAL_GAME_STATE));
    
    // Generate Obstacles
    const newObstacles: Entity[] = [];
    // More dense in Park (odd stages), less in Water (even stages)
    const isWater = stageNumber % 2 === 0;
    const obsCount = isWater ? 15 : 60; // Slightly increased density
    
    for (let i = 0; i < obsCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        // Distribute uniformly in circle, keep center clear (radius 300)
        const dist = 300 + Math.random() * (MAP_LIMIT - 400); 
        const x = Math.cos(angle) * dist;
        const y = Math.sin(angle) * dist;

        const typeRoll = Math.random();
        let type = 'TREE';
        let radius = 30;
        let color = '#2F855A';
        const variant = Math.floor(Math.random() * 10);

        if (typeRoll < 0.5) {
            type = 'TREE';
            // Trees can be big (Oak) or tall/thin (Pine base)
            // Radius affects collision and base visual
            radius = 35 + Math.random() * 35; // 35 to 70
            if (variant < 5) color = '#2F855A'; // Oak Green
            else color = '#276749'; // Pine Dark Green
        } else if (typeRoll < 0.85) {
            type = 'BUSH';
            radius = 20 + Math.random() * 20; // 20 to 40
            color = '#48BB78';
        } else {
            type = 'ROCK';
            radius = 15 + Math.random() * 15; // 15 to 30
            color = '#718096';
        }

        newObstacles.push({
            id: `obs-${i}`,
            x, y, radius, type, color, variant
        });
    }
    gameStateRef.current.obstacles = newObstacles;

    // 2. Setup Player based on Selection
    const player = gameStateRef.current.player;
    if (initialPlayer) {
        Object.assign(player, JSON.parse(JSON.stringify(initialPlayer)));
    } else {
        Object.assign(player, JSON.parse(JSON.stringify(INITIAL_PLAYER)));
        player.maxHp = character.hp;
        player.hp = character.hp;
        player.speed = character.speed;
        player.color = character.color;
        player.secondaryColor = character.secondaryColor;
        player.characterId = character.id;
        player.activeAbility = character.activeAbility ? JSON.parse(JSON.stringify(character.activeAbility)) : undefined;
        player.emoji = character.emoji;
        player.magnetRadius = character.magnetRadius || 150;
        player.maxCompanions = character.maxCompanions || 0;
        player.revives = character.revives || 0;
        player.filter = character.filter;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
        keysPressed.current[e.key.toLowerCase()] = true;
        if (e.key === 'Escape' || e.key === 'p') {
            onTogglePause();
        }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
        keysPressed.current[e.key.toLowerCase()] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    if (musicEnabled) playMusic('PARK');

    return () => {
        window.removeEventListener('resize', handleResize);
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('keyup', handleKeyUp);
        stopMusic();
        if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, []);

  useEffect(() => {
    if (musicEnabled) playMusic('PARK'); 
    else stopMusic();
  }, [musicEnabled]);

  const gameLoop = useCallback(() => {
    if (paused) return;

    const state = gameStateRef.current;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // IMPORTANT: Disable smoothing for pixel art look
    ctx.imageSmoothingEnabled = false;

    // --- LOGIC UPDATE ---

    // 1. Player Movement
    let dx = 0;
    let dy = 0;
    if (keysPressed.current['w'] || keysPressed.current['arrowup']) dy -= 1;
    if (keysPressed.current['s'] || keysPressed.current['arrowdown']) dy += 1;
    if (keysPressed.current['a'] || keysPressed.current['arrowleft']) dx -= 1;
    if (keysPressed.current['d'] || keysPressed.current['arrowright']) dx += 1;
    
    if (dx !== 0 || dy !== 0) {
        const length = Math.sqrt(dx * dx + dy * dy);
        dx = (dx / length) * state.player.speed;
        dy = (dy / length) * state.player.speed;
        
        let nextX = state.player.x + dx;
        let nextY = state.player.y + dy;

        // Obstacle Collision (Simple circle push-out)
        for (const obs of state.obstacles) {
            const dist = Math.hypot(nextX - obs.x, nextY - obs.y);
            // Player Radius (16) + Obstacle Radius * 0.5 (Hitbox is smaller than visual)
            const minDist = state.player.radius + (obs.radius * 0.5); 
            
            if (dist < minDist) {
                // Collision detected: Push player out along the vector
                const angle = Math.atan2(nextY - obs.y, nextX - obs.x);
                const push = minDist - dist;
                nextX += Math.cos(angle) * push;
                nextY += Math.sin(angle) * push;
            }
        }

        state.player.x = nextX;
        state.player.y = nextY;
        state.player.facing = dx > 0 ? 'RIGHT' : (dx < 0 ? 'LEFT' : state.player.facing);
        // Animate legs/tail when moving
        if (state.time % 5 === 0) {
            state.player.animationFrame = (state.player.animationFrame + 1) % 4;
        }
        state.player.velocity = { x: dx, y: dy };
    } else {
        state.player.animationFrame = 0; // Idle
        state.player.velocity = { x: 0, y: 0 };
    }
    
    // Bounds Check (Stay within arena)
    state.player.x = Math.max(-MAP_LIMIT + 20, Math.min(MAP_LIMIT - 20, state.player.x));
    state.player.y = Math.max(-MAP_LIMIT + 20, Math.min(MAP_LIMIT - 20, state.player.y));

    // 2. Enemy Spawning
    const spawnRateBase = 0.015; 
    const waveFactor = state.wave * 0.003; 
    const spawnChance = spawnRateBase + waveFactor;
    const maxEnemies = 25 + (state.wave * 5); 

    if (Math.random() < spawnChance && state.enemies.length < maxEnemies) {
         const angle = Math.random() * Math.PI * 2;
         const spawnDist = Math.max(canvas.width, canvas.height) / 2 + 100;
         
         // Use Types that match our Assets
         const enemyTypes = ['ZOMBIE', 'GOBLIN', 'GNOME'];
         const selectedType = enemyTypes[Math.floor(Math.random() * enemyTypes.length)];
         
         let color = '#68d391'; // Zombie Green
         let speed = 1.5;
         let hp = 15;

         if (selectedType === 'GOBLIN') { // Replaces Robot
             color = '#a0aec0';
             speed = 1.0;
             hp = 30;
         } else if (selectedType === 'GNOME') { // Replaces Alien
             color = '#b83280';
             speed = 2.0;
             hp = 10;
         }

         state.enemies.push({
             id: `e-${Date.now()}-${Math.random()}`,
             x: state.player.x + Math.cos(angle) * spawnDist,
             y: state.player.y + Math.sin(angle) * spawnDist,
             radius: 16, // Hitbox size
             color: color,
             type: selectedType,
             hp: hp + (state.wave * 2),
             maxHp: hp + (state.wave * 2),
             speed: speed + (Math.random() * 0.2),
             damage: 5 + Math.floor(state.wave / 2),
             xpValue: 10,
             velocity: { x: 0, y: 0 },
             facing: 'LEFT',
             animationFrame: 0
         });
    }

    // 3. Weapons & Projectiles
    state.player.weapons.forEach(w => {
        if (w.cooldownTimer > 0) {
            w.cooldownTimer--;
        } else {
            // Find target
            let target = null;
            let minDst = 450;
            for (const e of state.enemies) {
                const dst = Math.hypot(e.x - state.player.x, e.y - state.player.y);
                if (dst < minDst) {
                    minDst = dst;
                    target = e;
                }
            }

            if (w.type === 'NUT_THROW') {
                const baseAngle = target 
                    ? Math.atan2(target.y - state.player.y, target.x - state.player.x)
                    : (state.player.facing === 'RIGHT' ? 0 : Math.PI);
                
                for(let i=0; i<w.amount; i++) {
                    const spread = (Math.random() - 0.5) * 0.25;
                    state.projectiles.push({
                        id: `p-${Date.now()}-${i}`,
                        x: state.player.x,
                        y: state.player.y,
                        velocity: {
                            x: Math.cos(baseAngle + spread) * w.speed,
                            y: Math.sin(baseAngle + spread) * w.speed
                        },
                        radius: w.area,
                        damage: w.damage,
                        life: 60,
                        source: 'PLAYER',
                        color: '#ECC94B',
                        pierce: 1,
                        type: 'PROJECTILE'
                    });
                }
                w.cooldownTimer = w.cooldown;
                if(soundEnabled) playSound('NUT');
            }
        }
    });

    // 4. Projectile Logic
    for (let i = state.projectiles.length - 1; i >= 0; i--) {
        const p = state.projectiles[i];
        p.x += p.velocity.x;
        p.y += p.velocity.y;
        p.life--;

        let hit = false;
        for (const e of state.enemies) {
            const dst = Math.hypot(p.x - e.x, p.y - e.y);
            if (dst < p.radius + e.radius) {
                e.hp -= p.damage;
                hit = true;
                if(soundEnabled) playSound('HIT');
                
                // Visual Hit Feedback
                for(let k=0; k<3; k++) {
                    state.particles.push({
                        id: `hit-${Date.now()}-${k}`,
                        x: e.x, y: e.y,
                        radius: Math.random() * 2,
                        type: 'SMOKE',
                        subtype: 'DEFAULT',
                        color: 'white',
                        velocity: { x: (Math.random()-0.5)*3, y: (Math.random()-0.5)*3 },
                        life: 10, maxLife: 10, scale: 1
                    });
                }
                break;
            }
        }
        if (p.life <= 0 || hit) state.projectiles.splice(i, 1);
    }

    // 5. Enemy Movement & Collision
    for (const e of state.enemies) {
        const distToPlayer = Math.hypot(state.player.x - e.x, state.player.y - e.y);
        if (distToPlayer > 0) {
            e.x += ((state.player.x - e.x) / distToPlayer) * e.speed;
            e.y += ((state.player.y - e.y) / distToPlayer) * e.speed;
        }
        e.facing = (state.player.x - e.x) > 0 ? 'RIGHT' : 'LEFT';
        
        // Walk Animation Frame
        if (state.time % 8 === 0) {
            e.animationFrame = ((e.animationFrame || 0) + 1) % 4; // Assuming 4 frames
        }

        if (distToPlayer < e.radius + state.player.radius && state.player.invincibleTimer <= 0) {
            state.player.hp -= e.damage;
            state.player.invincibleTimer = 30;
            if(soundEnabled) playSound('HIT');
        }
    }
    if (state.player.invincibleTimer > 0) state.player.invincibleTimer--;

    // 6. Drops & Magnet
    for (let i = state.drops.length - 1; i >= 0; i--) {
        const d = state.drops[i];
        const dist = Math.hypot(state.player.x - d.x, state.player.y - d.y);
        
        // Magnet Pull
        if (dist < state.player.magnetRadius) {
            d.x += ((state.player.x - d.x) / dist) * 6; // Fly to player
            d.y += ((state.player.y - d.y) / dist) * 6;
        }

        if (dist < state.player.radius + d.radius) {
            if (d.kind === 'XP') {
                state.player.xp += d.value;
                if(soundEnabled) playSound('COLLECT');
            } else if (d.kind === 'GOLD') {
                state.collectedNuts += d.value;
            }
            state.drops.splice(i, 1);
        }
    }

    // 7. Enemy Death
    for (let i = state.enemies.length - 1; i >= 0; i--) {
        if (state.enemies[i].hp <= 0) {
            const e = state.enemies[i];
            state.kills++;
            state.score += 10;
            
            // Death Particles
            for(let k=0; k<6; k++) {
                state.particles.push({
                    id: `d-${Date.now()}-${k}`,
                    x: e.x, y: e.y,
                    radius: Math.random()*3 + 2,
                    type: 'SMOKE',
                    subtype: e.type === 'GOBLIN' ? 'SCRAP' : (e.type === 'GNOME' ? 'DISINTEGRATE' : 'GOO'),
                    color: e.color,
                    velocity: { x: (Math.random()-0.5)*4, y: (Math.random()-0.5)*4 },
                    life: 25, maxLife: 25, scale: 1
                });
            }
            
            // Spawn XP Gem
            state.drops.push({
                id: `xp-${Date.now()}`,
                x: e.x, y: e.y,
                radius: 5,
                type: 'DROP',
                color: '#4299e1',
                kind: 'XP',
                value: 10
            });

            // Rare Nut Drop
            if (Math.random() < 0.1) {
                 state.drops.push({
                    id: `nut-${Date.now()}`,
                    x: e.x + 5, y: e.y,
                    radius: 5,
                    type: 'DROP',
                    color: '#D69E2E',
                    kind: 'GOLD',
                    value: 1
                });
            }

            state.enemies.splice(i, 1);
        }
    }

    // 8. Particle Updates
    for (let i = state.particles.length - 1; i >= 0; i--) {
        const p = state.particles[i];
        p.x += p.velocity.x;
        p.y += p.velocity.y;
        p.life--;
        if (p.life <= 0) state.particles.splice(i, 1);
    }

    // 9. Level Up Check
    if (state.player.hp <= 0) {
        onGameOver(state.score, state.time, state.kills, state.collectedNuts, false);
    }
    if (state.player.xp >= state.player.nextLevelXp) {
        state.player.xp -= state.player.nextLevelXp;
        state.player.nextLevelXp *= 1.2;
        onLevelUp(ALL_UPGRADES.slice(0, 3), (u) => u.apply(state.player));
    }

    onStatsUpdate({
        score: state.score,
        kills: state.kills,
        nuts: state.collectedNuts,
        time: state.time,
        wave: state.wave,
        player: state.player
    });
    state.time++;

    // --- RENDER SYSTEM ---
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 1. Draw Background (Grass Pattern - Infinite)
    ctx.fillStyle = COLORS.parkBg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Fill background with grass pattern relative to camera
    if (grassPatternRef.current) {
        ctx.save();
        const camX = canvas.width / 2 - state.player.x;
        const camY = canvas.height / 2 - state.player.y;
        ctx.translate(camX, camY);
        ctx.fillStyle = grassPatternRef.current;
        // Cover entire visible area plus a bit
        ctx.fillRect(state.player.x - canvas.width, state.player.y - canvas.height, canvas.width * 2, canvas.height * 2);
        ctx.restore();
    }

    // Camera Transform (Center on Player)
    ctx.save();
    ctx.translate(canvas.width / 2 - state.player.x, canvas.height / 2 - state.player.y);

    // 2. Draw Procedural Border (Forest or Water)
    if (borderPatternRef.current) {
        const isWater = stageNumber % 2 === 0;
        
        ctx.save();
        ctx.fillStyle = borderPatternRef.current;
        
        // Slight wave animation for water border
        if (isWater) {
            ctx.translate(Math.sin(state.time * 0.02) * 10, Math.cos(state.time * 0.02) * 10);
        }

        // Draw 4 Large Rectangles to form the border around the map
        // Top
        ctx.fillRect(-MAP_LIMIT - BORDER_THICKNESS, -MAP_LIMIT - BORDER_THICKNESS, (MAP_LIMIT * 2) + (BORDER_THICKNESS * 2), BORDER_THICKNESS);
        // Bottom
        ctx.fillRect(-MAP_LIMIT - BORDER_THICKNESS, MAP_LIMIT, (MAP_LIMIT * 2) + (BORDER_THICKNESS * 2), BORDER_THICKNESS);
        // Left
        ctx.fillRect(-MAP_LIMIT - BORDER_THICKNESS, -MAP_LIMIT, BORDER_THICKNESS, MAP_LIMIT * 2);
        // Right
        ctx.fillRect(MAP_LIMIT, -MAP_LIMIT, BORDER_THICKNESS, MAP_LIMIT * 2);
        
        ctx.restore();

        // Draw Border Line (Coastline or Treeline)
        ctx.strokeStyle = isWater ? '#4FD1C5' : 'rgba(0,0,0,0.6)';
        ctx.lineWidth = 12;
        ctx.strokeRect(-MAP_LIMIT, -MAP_LIMIT, MAP_LIMIT*2, MAP_LIMIT*2);
    } else {
        // Fallback
        ctx.strokeStyle = 'red';
        ctx.lineWidth = 5;
        ctx.strokeRect(-MAP_LIMIT, -MAP_LIMIT, MAP_LIMIT*2, MAP_LIMIT*2);
    }

    // 3. Draw Drops
    for (const d of state.drops) {
        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.ellipse(d.x, d.y + d.radius, d.radius, d.radius * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();

        // Item
        if (d.kind === 'GOLD') {
            // Nut shape
            ctx.fillStyle = '#D69E2E';
            ctx.beginPath();
            ctx.ellipse(d.x, d.y, d.radius, d.radius * 1.3, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#744210'; // Cap
            ctx.beginPath();
            ctx.arc(d.x, d.y - 2, d.radius, Math.PI, 0);
            ctx.fill();
        } else {
            // Gem shape (Diamond)
            ctx.fillStyle = '#4299e1';
            ctx.beginPath();
            ctx.moveTo(d.x, d.y - d.radius);
            ctx.lineTo(d.x + d.radius, d.y);
            ctx.lineTo(d.x, d.y + d.radius);
            ctx.lineTo(d.x - d.radius, d.y);
            ctx.fill();
            // Shine
            ctx.fillStyle = 'white';
            ctx.beginPath();
            ctx.arc(d.x - 1, d.y - 1, 1, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // 4. Draw Z-Sorted Entities (Player, Enemies, Obstacles)
    const renderList = [
        { type: 'PLAYER', y: state.player.y, data: state.player },
        ...state.enemies.map(e => ({ type: 'ENEMY', y: e.y, data: e })),
        ...state.obstacles.map(o => ({ type: 'OBSTACLE', y: o.y, data: o }))
    ];
    
    // Sort by Y
    renderList.sort((a, b) => a.y - b.y);

    for (const item of renderList) {
        if (item.type === 'PLAYER') {
            drawProceduralSquirrel(ctx, item.data as Player, state.time);
        } else if (item.type === 'ENEMY') {
            const enemy = item.data as Enemy;
            const sprite = assets[enemy.type];
            
            ctx.fillStyle = 'rgba(0,0,0,0.3)';
            ctx.beginPath();
            ctx.ellipse(enemy.x, enemy.y + enemy.radius, enemy.radius, enemy.radius * 0.4, 0, 0, Math.PI * 2);
            ctx.fill();

            if (sprite && sprite.complete && sprite.naturalWidth > 0) {
                // SPRITE RENDERING
                const frameSize = 64; 
                const frameIndex = enemy.animationFrame || 0;
                let srcX = 0;
                let srcY = 0;
                
                if (sprite.height > 200) {
                    srcY = 11 * frameSize; 
                    srcX = (frameIndex % 8) * frameSize; 
                } else {
                    srcX = (frameIndex % (sprite.width / frameSize)) * frameSize;
                }

                ctx.save();
                ctx.translate(enemy.x, enemy.y);
                if (enemy.facing === 'LEFT') ctx.scale(-1, 1);
                ctx.drawImage(sprite, srcX, srcY, frameSize, frameSize, -32, -48, 64, 64);
                ctx.restore();
            } else {
                drawProceduralEnemy(ctx, enemy, state.time);
            }
        } else if (item.type === 'OBSTACLE') {
            drawProceduralObstacle(ctx, item.data as Entity);
        }
    }

    // 5. Draw Projectiles
    for (const p of state.projectiles) {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(state.time * 0.5); // Spin
        
        // Nut projectile shape
        ctx.fillStyle = '#D69E2E';
        ctx.beginPath();
        ctx.ellipse(0, 0, p.radius, p.radius * 0.8, 0, 0, Math.PI*2);
        ctx.fill();
        
        ctx.restore();
    }

    // 6. Particles
    renderParticles(ctx, state.particles);

    ctx.restore();

    requestRef.current = requestAnimationFrame(gameLoop);
  }, [paused, onGameOver, onLevelUp, onStatsUpdate, soundEnabled]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(gameLoop);
    return () => {
        if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [gameLoop]);

  return (
    <canvas 
        ref={canvasRef}
        width={dimensions.width}
        height={dimensions.height}
        className="block w-full h-full bg-gray-900"
    />
  );
};

// --- PROCEDURAL DRAWING HELPERS ---

function shadeColor(color: string, percent: number) {
    if (!color || color.length < 7) return color;
    let f=parseInt(color.slice(1),16),t=percent<0?0:255,p=percent<0?percent*-1:percent,R=f>>16,G=f>>8&0x00FF,B=f&0x0000FF;
    return "#"+(0x1000000+(Math.round((t-R)*p)+R)*0x10000+(Math.round((t-G)*p)+G)*0x100+(Math.round((t-B)*p)+B)).toString(16).slice(1);
}

function pseudoRandom(seed: number) {
    let x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
}

function drawProceduralObstacle(ctx: CanvasRenderingContext2D, obs: Entity) {
    ctx.save();
    ctx.translate(obs.x, obs.y);

    const variant = obs.variant || 0;
    
    // Shadow (Base for all)
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.ellipse(0, obs.radius * 0.4, obs.radius, obs.radius * 0.3, 0, 0, Math.PI*2);
    ctx.fill();

    if (obs.type === 'TREE') {
        if (variant < 5) {
            // -- OAK TREE (Round Canopy) --
            // Trunk
            ctx.fillStyle = '#5D4037'; // Lighter brown
            ctx.fillRect(-obs.radius*0.25, -obs.radius*0.6, obs.radius*0.5, obs.radius);
            
            // Canopy Clusters
            const baseGreen = '#2F855A';
            const lightGreen = '#48BB78';
            
            // Draw multiple overlapping circles
            const clusters = [
                {x: 0, y: -obs.radius * 1.5, r: obs.radius * 0.8}, // Top
                {x: -obs.radius * 0.7, y: -obs.radius * 1.2, r: obs.radius * 0.7}, // Left
                {x: obs.radius * 0.7, y: -obs.radius * 1.2, r: obs.radius * 0.7}, // Right
                {x: -obs.radius * 0.4, y: -obs.radius * 0.8, r: obs.radius * 0.6}, // Bottom Left
                {x: obs.radius * 0.4, y: -obs.radius * 0.8, r: obs.radius * 0.6}, // Bottom Right
            ];

            for (const c of clusters) {
                // Main circle
                ctx.fillStyle = baseGreen;
                ctx.beginPath();
                ctx.arc(c.x, c.y, c.r, 0, Math.PI*2);
                ctx.fill();
                
                // Highlight puff
                ctx.fillStyle = lightGreen;
                ctx.beginPath();
                ctx.arc(c.x, c.y - c.r*0.2, c.r*0.6, 0, Math.PI*2);
                ctx.fill();
            }

        } else {
            // -- PINE TREE (Spiky Layers) --
            // Trunk
            ctx.fillStyle = '#3E2723'; // Dark brown
            ctx.fillRect(-obs.radius*0.2, -obs.radius*0.5, obs.radius*0.4, obs.radius);
            
            // Pine Canopy (Triangles stacked)
            ctx.fillStyle = obs.color || '#276749';
            const layers = 4;
            const layerHeight = obs.radius * 1.2;
            
            for(let i=0; i<layers; i++) {
                ctx.beginPath();
                // Random width variation based on seed/index
                const jitter = pseudoRandom(variant + i) * 0.2;
                const width = obs.radius * (1.1 - i*0.25 + jitter);
                const yBase = -obs.radius*0.2 - (i * layerHeight * 0.5);
                
                // Jagged edges
                ctx.moveTo(-width, yBase);
                ctx.lineTo(-width*0.5, yBase - layerHeight*0.5); // Mid jagged point left
                ctx.lineTo(0, yBase - layerHeight); // Tip
                ctx.lineTo(width*0.5, yBase - layerHeight*0.5); // Mid jagged point right
                ctx.lineTo(width, yBase);
                ctx.fill();
                
                // Shadow under layer
                ctx.fillStyle = 'rgba(0,0,0,0.15)';
                ctx.beginPath();
                ctx.moveTo(0, yBase - layerHeight);
                ctx.lineTo(width, yBase);
                ctx.lineTo(0, yBase);
                ctx.fill();
                ctx.fillStyle = obs.color || '#276749'; // Reset color
            }
        }
        
    } else if (obs.type === 'BUSH') {
        // Detailed Bush
        const bushColor = obs.color || '#48BB78';
        const shadowColor = shadeColor(bushColor, -0.2);
        
        // Base Clump
        ctx.fillStyle = bushColor;
        ctx.beginPath(); ctx.arc(0, -5, obs.radius * 0.7, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = shadowColor; // Depth
        ctx.beginPath(); ctx.arc(0, -2, obs.radius * 0.5, 0, Math.PI*2); ctx.fill();
        
        // Sub clumps
        const subClumps = 3 + (variant % 3);
        for(let i=0; i<subClumps; i++) {
            const angle = (i / subClumps) * Math.PI * 2;
            const dist = obs.radius * 0.5;
            ctx.fillStyle = bushColor;
            ctx.beginPath();
            ctx.arc(Math.cos(angle)*dist, Math.sin(angle)*dist - 5, obs.radius*0.5, 0, Math.PI*2);
            ctx.fill();
        }

        // Berries or Flowers
        if (variant % 3 !== 0) { // Some bushes have no berries
            ctx.fillStyle = variant % 2 === 0 ? '#E53E3E' : '#ECC94B'; // Red or Yellow berries
            const berryCount = 4 + (variant % 4);
            for(let i=0; i<berryCount; i++) {
                // Random position inside bush radius
                const r = pseudoRandom(variant * 10 + i) * obs.radius * 0.8;
                const theta = pseudoRandom(variant * 20 + i) * Math.PI * 2;
                ctx.beginPath(); 
                ctx.arc(Math.cos(theta)*r, Math.sin(theta)*r - 5, 3, 0, Math.PI*2); 
                ctx.fill();
            }
        }
        
    } else if (obs.type === 'ROCK') {
        // Detailed Rock: Irregular Polygon
        ctx.fillStyle = '#718096';
        ctx.beginPath();
        
        const vertices = 6 + (variant % 3);
        for(let i=0; i<vertices; i++) {
            const angle = (i / vertices) * Math.PI * 2;
            // Radius wobble
            const r = obs.radius * (0.8 + pseudoRandom(variant * 5 + i) * 0.4);
            if (i===0) ctx.moveTo(Math.cos(angle)*r, Math.sin(angle)*r - 5);
            else ctx.lineTo(Math.cos(angle)*r, Math.sin(angle)*r - 5);
        }
        ctx.closePath();
        ctx.fill();
        
        // Highlight/Cracks
        ctx.strokeStyle = '#4A5568';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-obs.radius*0.5, -5);
        ctx.lineTo(obs.radius*0.2, -obs.radius*0.3);
        ctx.stroke();

        // Moss Patch
        if (variant > 4) {
            ctx.fillStyle = 'rgba(72, 187, 120, 0.6)';
            ctx.beginPath();
            ctx.arc(-obs.radius*0.3, -5, obs.radius*0.3, 0, Math.PI*2);
            ctx.fill();
        }
    }

    ctx.restore();
}

function drawProceduralSquirrel(ctx: CanvasRenderingContext2D, player: Player, time: number) {
    ctx.save();
    ctx.translate(player.x, player.y);

    // Facing direction flip
    const scaleX = player.facing === 'LEFT' ? -1 : 1;
    ctx.scale(scaleX, 1);

    // Animation States
    const isMoving = Math.abs(player.velocity.x) > 0.1 || Math.abs(player.velocity.y) > 0.1;
    const runBob = isMoving ? Math.sin(time * 0.4) * 2 : 0;
    const tailWag = Math.sin(time * 0.1) * 0.2;
    const tailLag = isMoving ? (Math.sin(time * 0.4 + Math.PI) * 0.1) - 0.2 : 0; // Tail trails back when running

    // Colors
    const furColor = player.color;
    const bellyColor = player.secondaryColor;
    const earColor = shadeColor(furColor, -0.1);

    // --- SHADOW ---
    // Drawn first so it is under the bobbing body
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(0, 8, 12, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Apply Run Bob to body parts
    ctx.translate(0, runBob);

    // --- TAIL (Behind everything) ---
    // Drawn as a series of overlapping circles to look "fluffy" and distinct from head
    ctx.save();
    ctx.translate(-12, 0); // Start tail at back
    ctx.rotate(tailWag + tailLag - 0.5); // Default angled up/back
    ctx.fillStyle = furColor;
    
    // Base of tail
    ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI*2); ctx.fill();
    // Mid tail
    ctx.beginPath(); ctx.arc(-6, -6, 9, 0, Math.PI*2); ctx.fill();
    // Tip tail (bushy)
    ctx.beginPath(); ctx.arc(-10, -14, 11, 0, Math.PI*2); ctx.fill();
    // Detail on tail
    ctx.fillStyle = shadeColor(furColor, 0.1);
    ctx.beginPath(); ctx.arc(-10, -14, 6, 0, Math.PI*2); ctx.fill();
    ctx.restore();

    // --- BACK LEG (Far) ---
    ctx.fillStyle = shadeColor(furColor, -0.2);
    ctx.beginPath();
    ctx.ellipse(-6, 8, 4, 3, 0, 0, Math.PI*2);
    ctx.fill();

    // --- BODY ---
    ctx.fillStyle = furColor;
    ctx.beginPath();
    // Main body chunk
    ctx.ellipse(0, 4, 9, 8, 0, 0, Math.PI*2);
    ctx.fill();
    
    // Belly patch
    ctx.fillStyle = bellyColor;
    ctx.beginPath();
    ctx.ellipse(2, 4, 5, 6, 0, 0, Math.PI*2);
    ctx.fill();

    // --- HEAD ---
    ctx.save();
    ctx.translate(4, -6); // Head position relative to body
    
    // Ears (Behind Head)
    ctx.fillStyle = earColor;
    // Left Ear
    ctx.beginPath(); 
    ctx.moveTo(-2, -6); ctx.lineTo(-6, -16); ctx.lineTo(-8, -5); ctx.fill();
    // Right Ear
    ctx.beginPath(); 
    ctx.moveTo(2, -6); ctx.lineTo(6, -16); ctx.lineTo(8, -5); ctx.fill();

    // Head Base
    ctx.fillStyle = furColor;
    ctx.beginPath();
    ctx.arc(0, 0, 9, 0, Math.PI*2);
    ctx.fill();

    // Snout area (Lighter)
    ctx.fillStyle = bellyColor;
    ctx.beginPath();
    ctx.ellipse(4, 2, 5, 4, 0, 0, Math.PI*2);
    ctx.fill();

    // Nose (Black dot)
    ctx.fillStyle = '#1a202c';
    ctx.beginPath();
    ctx.arc(8, 1, 1.5, 0, Math.PI*2);
    ctx.fill();

    // Eye (Side view - usually just one visible or two close together)
    const blink = Math.sin(time * 0.05) > 0.98; // Blink occasionally
    if (!blink) {
        ctx.fillStyle = 'black';
        ctx.beginPath();
        ctx.arc(2, -2, 2, 0, Math.PI*2);
        ctx.fill();
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(3, -3, 0.8, 0, Math.PI*2); // Shine
        ctx.fill();
    } else {
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, -2); ctx.lineTo(4, -2); ctx.stroke();
    }

    ctx.restore();

    // --- FRONT PAW (Holding Item) ---
    ctx.fillStyle = furColor;
    ctx.beginPath();
    ctx.ellipse(6, 4, 3, 2, 0, 0, Math.PI*2);
    ctx.fill();

    // Weapon/Nut in hand
    ctx.fillStyle = '#D69E2E'; // Nut color
    ctx.beginPath();
    ctx.arc(8, 3, 3, 0, Math.PI*2);
    ctx.fill();

    // --- BACK LEG (Near) ---
    ctx.fillStyle = furColor;
    ctx.beginPath();
    // Cycle leg when running
    const legCycle = isMoving ? Math.sin(time * 0.4) * 4 : 0;
    ctx.ellipse(-4 + legCycle, 9, 5, 3, 0, 0, Math.PI*2);
    ctx.fill();

    ctx.restore();
}

function drawProceduralEnemy(ctx: CanvasRenderingContext2D, enemy: Enemy, time: number) {
    ctx.save();
    ctx.translate(enemy.x, enemy.y);
    if (enemy.facing === 'LEFT') ctx.scale(-1, 1);

    // Simple Walk animation
    const bounce = Math.abs(Math.sin(time * 0.2)) * 3;

    if (enemy.type === 'GOBLIN') {
        // Goblin: Green, pointy ears
        ctx.fillStyle = '#2F855A'; // Dark Green body
        ctx.fillRect(-10, -20 - bounce, 20, 20);
        ctx.fillStyle = '#48BB78'; // Lighter head
        ctx.beginPath();
        ctx.arc(0, -25 - bounce, 12, 0, Math.PI*2);
        ctx.fill();
        // Ears
        ctx.beginPath();
        ctx.moveTo(-10, -25 - bounce);
        ctx.lineTo(-20, -30 - bounce);
        ctx.lineTo(-10, -20 - bounce);
        ctx.fill();
        // Eyes
        ctx.fillStyle = 'yellow';
        ctx.beginPath();
        ctx.arc(4, -25 - bounce, 2, 0, Math.PI*2);
        ctx.fill();
        
    } else if (enemy.type === 'GNOME') {
        // Gnome: Blue shirt, Red hat
        ctx.fillStyle = '#3182CE'; // Blue body
        ctx.fillRect(-8, -18 - bounce, 16, 18);
        ctx.fillStyle = '#F6E05E'; // Face
        ctx.beginPath();
        ctx.arc(0, -24 - bounce, 10, 0, Math.PI*2);
        ctx.fill();
        // Hat
        ctx.fillStyle = '#E53E3E'; // Red Hat
        ctx.beginPath();
        ctx.moveTo(-12, -28 - bounce);
        ctx.lineTo(12, -28 - bounce);
        ctx.lineTo(0, -45 - bounce);
        ctx.fill();
        // Beard
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(0, -20 - bounce, 10, 0, Math.PI);
        ctx.fill();

    } else {
        // Zombie (Default)
        ctx.fillStyle = '#48BB78'; // Green
        ctx.beginPath();
        ctx.arc(0, -10 - bounce, 11, 0, Math.PI * 2); // Head
        ctx.fill();
        ctx.fillStyle = '#2F855A'; // Shirt
        ctx.fillRect(-8, 0 - bounce, 16, 12);
        // Arms
        ctx.fillStyle = '#48BB78';
        ctx.fillRect(5, -5 - bounce, 12, 4);
    }

    ctx.restore();
}
