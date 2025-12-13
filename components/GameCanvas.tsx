
import React, { useRef, useEffect, useCallback, useState } from 'react';
import { GameState, Player, Upgrade, SquirrelCharacter, StageDuration, Enemy, Entity, Projectile, Weapon } from '../types';
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
  
  // Track window dimensions
  const [dimensions, setDimensions] = useState({ 
      width: typeof window !== 'undefined' ? window.innerWidth : 1280, 
      height: typeof window !== 'undefined' ? window.innerHeight : 720 
  });

  // Pattern Caches
  const grassPatternRef = useRef<CanvasPattern | null>(null);
  const borderPatternRef = useRef<CanvasPattern | null>(null);

  // Constants
  const MAP_LIMIT = 1500;
  const BORDER_THICKNESS = 2000;

  // 1. Initialize Patterns
  useEffect(() => {
      const isWaterStage = stageNumber % 2 === 0;
      
      // Grass Pattern
      const gCan = document.createElement('canvas');
      gCan.width = 512;
      gCan.height = 512;
      const gCtx = gCan.getContext('2d');
      if (gCtx) {
          gCtx.fillStyle = '#276749'; 
          gCtx.fillRect(0, 0, 512, 512);
          
          for(let i=0; i<30; i++) {
              gCtx.fillStyle = 'rgba(40, 30, 20, 0.15)';
              gCtx.beginPath();
              gCtx.arc(Math.random() * 512, Math.random() * 512, 10 + Math.random() * 40, 0, Math.PI*2);
              gCtx.fill();
          }

          for(let i=0; i<12000; i++) {
              const x = Math.random() * 512;
              const y = Math.random() * 512;
              const len = 3 + Math.random() * 5;
              const angle = (Math.random() - 0.5) * 0.8 - (Math.PI / 2);

              const shade = Math.random();
              if (shade < 0.33) gCtx.strokeStyle = '#22543d';
              else if (shade < 0.66) gCtx.strokeStyle = '#2f855a';
              else gCtx.strokeStyle = '#48bb78';

              gCtx.lineWidth = 1.5;
              gCtx.lineCap = 'round';
              gCtx.beginPath();
              gCtx.moveTo(x, y);
              gCtx.lineTo(x + Math.cos(angle) * len, y + Math.sin(angle) * len);
              gCtx.stroke();
          }
      }

      // Border Pattern
      const bCan = document.createElement('canvas');
      const bSize = 512;
      bCan.width = bSize;
      bCan.height = bSize;
      const bCtx = bCan.getContext('2d');
      
      if (bCtx) {
          if (isWaterStage) {
              const grad = bCtx.createLinearGradient(0,0,0,bSize);
              grad.addColorStop(0, '#2b6cb0');
              grad.addColorStop(1, '#2c5282');
              bCtx.fillStyle = grad;
              bCtx.fillRect(0, 0, bSize, bSize);
              
              for(let i=0; i<300; i++) {
                  const opacity = 0.1 + Math.random() * 0.2;
                  bCtx.strokeStyle = `rgba(190, 227, 248, ${opacity})`;
                  bCtx.lineWidth = 1 + Math.random() * 2;
                  const x = Math.random() * bSize;
                  const y = Math.random() * bSize;
                  const len = 10 + Math.random() * 30;
                  
                  bCtx.beginPath();
                  bCtx.moveTo(x, y);
                  bCtx.bezierCurveTo(x + len/3, y - 3, x + 2*len/3, y + 3, x + len, y);
                  bCtx.stroke();
              }
          } else {
              bCtx.fillStyle = '#0d1f16';
              bCtx.fillRect(0, 0, bSize, bSize);
              for(let i=0; i<250; i++) {
                  const x = Math.random() * bSize;
                  const y = Math.random() * bSize;
                  const r = 15 + Math.random() * 25;
                  
                  // Simple Pine for pattern
                  bCtx.fillStyle = 'rgba(0,0,0,0.5)';
                  bCtx.beginPath(); bCtx.arc(x+5, y+5, r, 0, Math.PI*2); bCtx.fill();
                  bCtx.fillStyle = '#102a1d';
                  bCtx.beginPath(); bCtx.arc(x, y, r, 0, Math.PI*2); bCtx.fill();
              }
          }
      }

      const mainCtx = canvasRef.current?.getContext('2d');
      if (mainCtx) {
          grassPatternRef.current = mainCtx.createPattern(gCan, 'repeat');
          borderPatternRef.current = mainCtx.createPattern(bCan, 'repeat');
      }

  }, [stageNumber]);

  // 2. Initialize Game Logic & Entities
  useEffect(() => {
    const handleResize = () => {
        setDimensions({
            width: window.innerWidth,
            height: window.innerHeight
        });
    };
    window.addEventListener('resize', handleResize);

    gameStateRef.current = JSON.parse(JSON.stringify(INITIAL_GAME_STATE));
    
    // Generate Obstacles
    const newObstacles: Entity[] = [];
    const isWater = stageNumber % 2 === 0;
    const obsCount = isWater ? 15 : 60;
    
    for (let i = 0; i < obsCount; i++) {
        const angle = Math.random() * Math.PI * 2;
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
            radius = 35 + Math.random() * 35;
            color = variant < 5 ? '#2F855A' : '#276749';
        } else if (typeRoll < 0.85) {
            type = 'BUSH';
            radius = 20 + Math.random() * 20;
            color = '#48BB78';
        } else {
            type = 'ROCK';
            radius = 15 + Math.random() * 15;
            color = '#718096';
        }

        newObstacles.push({
            id: `obs-${i}`,
            x, y, radius, type, color, variant
        });
    }
    gameStateRef.current.obstacles = newObstacles;

    // Setup Player
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

    ctx.imageSmoothingEnabled = false;

    // --- UPDATE LOGIC ---

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

        // Obstacle Collision
        for (const obs of state.obstacles) {
            const dist = Math.hypot(nextX - obs.x, nextY - obs.y);
            // Hitbox slightly smaller than visual radius
            const minDist = state.player.radius + (obs.radius * 0.5); 
            
            if (dist < minDist) {
                const angle = Math.atan2(nextY - obs.y, nextX - obs.x);
                const push = minDist - dist;
                nextX += Math.cos(angle) * push;
                nextY += Math.sin(angle) * push;
            }
        }

        state.player.x = nextX;
        state.player.y = nextY;
        state.player.facing = dx > 0 ? 'RIGHT' : (dx < 0 ? 'LEFT' : state.player.facing);
        if (state.time % 5 === 0) {
            state.player.animationFrame = (state.player.animationFrame + 1) % 4;
        }
        state.player.velocity = { x: dx, y: dy };
    } else {
        state.player.velocity = { x: 0, y: 0 };
    }
    
    state.player.x = Math.max(-MAP_LIMIT + 20, Math.min(MAP_LIMIT - 20, state.player.x));
    state.player.y = Math.max(-MAP_LIMIT + 20, Math.min(MAP_LIMIT - 20, state.player.y));

    // 2. Enemy Spawning
    const spawnChance = 0.015 + (state.wave * 0.003);
    const maxEnemies = 25 + (state.wave * 5); 

    if (Math.random() < spawnChance && state.enemies.length < maxEnemies) {
         const angle = Math.random() * Math.PI * 2;
         const spawnDist = Math.max(canvas.width, canvas.height) / 2 + 100;
         
         const enemyTypes = ['ZOMBIE', 'GOBLIN', 'GNOME'];
         const selectedType = enemyTypes[Math.floor(Math.random() * enemyTypes.length)];
         
         let color = '#68d391';
         let speed = 2 + (Math.random() * 0.5);
         let hp = 20 + (state.wave * 2);

         if (selectedType === 'GOBLIN') {
             color = '#a0aec0';
             speed = 2.5;
             hp = 15 + (state.wave * 1.5);
         } else if (selectedType === 'GNOME') {
             color = '#b83280';
             speed = 1.5;
             hp = 30 + (state.wave * 3);
         }

         state.enemies.push({
             id: `e-${Date.now()}-${Math.random()}`,
             x: state.player.x + Math.cos(angle) * spawnDist,
             y: state.player.y + Math.sin(angle) * spawnDist,
             radius: 12, 
             color: color,
             type: selectedType,
             hp: hp,
             maxHp: hp,
             speed: speed,
             damage: 5,
             xpValue: 10,
             velocity: { x: 0, y: 0 },
             facing: 'LEFT',
             animationFrame: 0
         });
    }

    // 3. Enemy Logic
    for (const e of state.enemies) {
        const dx = state.player.x - e.x;
        const dy = state.player.y - e.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist > 0) {
            e.x += (dx/dist) * e.speed;
            e.y += (dy/dist) * e.speed;
        }
        
        if (Math.abs(dx) > 0.1) e.facing = dx > 0 ? 'RIGHT' : 'LEFT';
        if (state.time % 8 === 0) e.animationFrame = ((e.animationFrame || 0) + 1) % 100;
        
        if (dist < e.radius + state.player.radius && state.player.invincibleTimer <= 0) {
            state.player.hp -= e.damage;
            state.player.invincibleTimer = 30;
            if(soundEnabled) playSound('HIT');
        }
    }
    if (state.player.invincibleTimer > 0) state.player.invincibleTimer--;

    // 4. Weapons & Projectiles
    // --- Update Cooldowns & Fire ---
    for (const w of state.player.weapons) {
        if (w.cooldownTimer > 0) w.cooldownTimer--;
        
        if (w.cooldownTimer <= 0) {
            // Target Nearest
            let target: Enemy | null = null;
            let minDist = 600; // Max Range
            
            for(const e of state.enemies) {
                const d = Math.hypot(e.x - state.player.x, e.y - state.player.y);
                if (d < minDist) {
                    minDist = d;
                    target = e;
                }
            }

            if (target) {
                 const angle = Math.atan2(target.y - state.player.y, target.x - state.player.x);
                 
                 // Fire projectiles based on amount
                 for(let i=0; i<w.amount; i++) {
                     const spread = (i - (w.amount-1)/2) * 0.2; // 0.2 rad spread
                     const finalAngle = angle + spread;
                     
                     state.projectiles.push({
                         id: `p-${Date.now()}-${i}`,
                         x: state.player.x,
                         y: state.player.y,
                         velocity: {
                             x: Math.cos(finalAngle) * w.speed,
                             y: Math.sin(finalAngle) * w.speed
                         },
                         damage: w.damage * (1 + (state.player.damageBonus || 0)),
                         life: 60, // 1 sec duration
                         source: 'PLAYER',
                         weaponType: w.type,
                         radius: w.area,
                         color: '#D69E2E',
                         type: 'PROJECTILE',
                         variant: Math.floor(Math.random() * 10) // Random variant seed for visual
                     });
                 }
                 
                 if (soundEnabled) playSound('NUT');
                 
                 // Reset cooldown
                 const reduction = state.player.cooldownReduction || 0;
                 w.cooldownTimer = w.cooldown * (1 - reduction);
            }
        }
    }

    // --- Update Projectiles ---
    for (let i = state.projectiles.length - 1; i >= 0; i--) {
        const p = state.projectiles[i];
        p.x += p.velocity.x;
        p.y += p.velocity.y;
        p.rotation = (p.rotation || 0) + 0.3;
        p.life--;
        
        let didHit = false;
        
        // Check Collisions
        for (const e of state.enemies) {
            // Simple circular collision
            if (Math.hypot(e.x - p.x, e.y - p.y) < (e.radius + p.radius)) {
                e.hp -= p.damage;
                didHit = true;
                
                // Knockback
                const kb = 2;
                const angle = Math.atan2(e.y - p.x, e.x - p.x);
                e.x += Math.cos(angle) * kb;
                e.y += Math.sin(angle) * kb;

                // Hit Effect
                state.particles.push({
                    id: `hit-${Date.now()}-${Math.random()}`,
                    x: p.x, y: p.y, radius: 4, color: '#FFF',
                    life: 5, maxLife: 5, type: 'FLASH', velocity: {x:0, y:0}, scale:1
                });
                
                if(soundEnabled) playSound('HIT');
                break; // Single target hit
            }
        }

        if (didHit || p.life <= 0) {
             state.projectiles.splice(i, 1);
        }
    }

    // 5. Cleanup Dead Enemies
    for (let i = state.enemies.length - 1; i >= 0; i--) {
        const e = state.enemies[i];
        if (e.hp <= 0) {
             let particleSubtype = 'DEFAULT';
             let particleCount = 6;
             let particleSpeedBase = 2;
             
             const getColors = (): string[] => {
                 if (e.type === 'GOBLIN') return ['#A0AEC0', '#718096', '#CBD5E0', '#F56565'];
                 else if (e.type === 'GNOME') return ['#9F7AEA', '#B83280', '#D53F8C', '#E9D8FD'];
                 else return ['#48BB78', '#2F855A', '#9B2C2C', '#C53030'];
             };
             const colors = getColors();

             if (e.type === 'GOBLIN') { particleSubtype = 'SCRAP'; particleCount = 8; particleSpeedBase = 4; if(soundEnabled) playSound('EXPLOSION'); }
             else if (e.type === 'ZOMBIE') { particleSubtype = 'GOO'; particleCount = 10; particleSpeedBase = 2.5; if(soundEnabled) playSound('HIT'); }
             else if (e.type === 'GNOME') { particleSubtype = 'DISINTEGRATE'; particleCount = 12; particleSpeedBase = 1.5; if(soundEnabled) playSound('AURA'); }

             for(let k=0; k<particleCount; k++) {
                 const angle = Math.random() * Math.PI * 2;
                 const speed = Math.random() * particleSpeedBase + (particleSpeedBase * 0.5);
                 state.particles.push({
                     id: `death-${Date.now()}-${i}-${k}`,
                     x: e.x + (Math.random() * 10 - 5), y: e.y + (Math.random() * 10 - 5),
                     radius: Math.random() * 3 + 2, 
                     type: 'SMOKE', subtype: particleSubtype as any, 
                     color: colors[Math.floor(Math.random() * colors.length)],
                     velocity: { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed },
                     life: 40 + Math.random() * 20, maxLife: 60, scale: 1,
                     drift: particleSubtype === 'DISINTEGRATE' ? {x: 0, y: -0.5} : {x: 0, y: 0}
                 });
             }

             state.enemies.splice(i, 1);
             state.kills++;
             state.score += 10;
             state.drops.push({
                 id: `d-${Date.now()}`, x: e.x, y: e.y, radius: 8, type: 'DROP',
                 color: '#4299e1', kind: 'XP', value: 25
             });
        }
    }

    // 5.5 Drops Pickup Logic
    for (let i = state.drops.length - 1; i >= 0; i--) {
        const d = state.drops[i];
        const dx = state.player.x - d.x;
        const dy = state.player.y - d.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        
        // Magnet
        if (dist < state.player.magnetRadius) {
            const pull = 5 + (500 / (dist + 10)); // Stronger closer
            d.x += (dx / dist) * pull;
            d.y += (dy / dist) * pull;
        }
        
        // Collection
        if (dist < state.player.radius + d.radius) {
            if (d.kind === 'XP') {
                state.player.xp += d.value;
            } else if (d.kind === 'GOLD') {
                state.collectedNuts += d.value;
            } else if (d.kind === 'HEALTH_PACK') {
                state.player.hp = Math.min(state.player.hp + d.value, state.player.maxHp);
            }
            
            if (soundEnabled) playSound('COLLECT');
            state.drops.splice(i, 1);
        }
    }

    // 6. Update Particles
    for (let i = state.particles.length - 1; i >= 0; i--) {
        const p = state.particles[i];
        p.life--;
        p.x += p.velocity.x;
        p.y += p.velocity.y;
        if (p.drift) { p.x += p.drift.x; p.y += p.drift.y; }
        if (p.life <= 0) state.particles.splice(i, 1);
    }

    // 7. Check Game State
    if (state.player.hp <= 0) {
        onGameOver(state.score, state.time, state.kills, state.collectedNuts, false);
    }
    if (state.player.xp >= state.player.nextLevelXp) {
        state.player.xp -= state.player.nextLevelXp;
        state.player.nextLevelXp *= 1.2;
        
        // Randomize upgrades (Pick 3 unique)
        const shuffled = [...ALL_UPGRADES].sort(() => 0.5 - Math.random());
        const choices = shuffled.slice(0, 3);
        
        onLevelUp(choices, (u) => u.apply(state.player));
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
    
    // 1. Background
    ctx.fillStyle = COLORS.parkBg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    if (grassPatternRef.current) {
        ctx.save();
        const camX = canvas.width / 2 - state.player.x;
        const camY = canvas.height / 2 - state.player.y;
        ctx.translate(camX, camY);
        ctx.fillStyle = grassPatternRef.current;
        ctx.fillRect(state.player.x - canvas.width, state.player.y - canvas.height, canvas.width * 2, canvas.height * 2);
        ctx.restore();
    }

    // Camera Transform
    ctx.save();
    ctx.translate(canvas.width / 2 - state.player.x, canvas.height / 2 - state.player.y);

    // 2. Borders
    if (borderPatternRef.current) {
        const isWater = stageNumber % 2 === 0;
        ctx.save();
        ctx.fillStyle = borderPatternRef.current;
        if (isWater) ctx.translate(Math.sin(state.time * 0.02) * 10, Math.cos(state.time * 0.02) * 10);
        
        ctx.fillRect(-MAP_LIMIT - BORDER_THICKNESS, -MAP_LIMIT - BORDER_THICKNESS, (MAP_LIMIT * 2) + (BORDER_THICKNESS * 2), BORDER_THICKNESS); // Top
        ctx.fillRect(-MAP_LIMIT - BORDER_THICKNESS, MAP_LIMIT, (MAP_LIMIT * 2) + (BORDER_THICKNESS * 2), BORDER_THICKNESS); // Bottom
        ctx.fillRect(-MAP_LIMIT - BORDER_THICKNESS, -MAP_LIMIT, BORDER_THICKNESS, MAP_LIMIT * 2); // Left
        ctx.fillRect(MAP_LIMIT, -MAP_LIMIT, BORDER_THICKNESS, MAP_LIMIT * 2); // Right
        ctx.restore();

        ctx.strokeStyle = isWater ? '#4FD1C5' : 'rgba(0,0,0,0.6)';
        ctx.lineWidth = 12;
        ctx.strokeRect(-MAP_LIMIT, -MAP_LIMIT, MAP_LIMIT*2, MAP_LIMIT*2);
    } else {
        ctx.strokeStyle = 'red';
        ctx.lineWidth = 5;
        ctx.strokeRect(-MAP_LIMIT, -MAP_LIMIT, MAP_LIMIT*2, MAP_LIMIT*2);
    }

    // 3. Drops
    for (const d of state.drops) {
        ctx.fillStyle = d.color || '#fff';
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.radius, 0, Math.PI * 2);
        ctx.fill();
    }

    // 4. Z-Sorted Entities (Player, Enemies, Obstacles)
    const renderList = [
        { type: 'PLAYER', y: state.player.y, data: state.player },
        ...state.enemies.map(e => ({ type: 'ENEMY', y: e.y, data: e })),
        ...state.obstacles.map(o => ({ type: 'OBSTACLE', y: o.y, data: o }))
    ];
    
    // Sort by Y for depth
    renderList.sort((a, b) => a.y - b.y);

    for (const item of renderList) {
        if (item.type === 'PLAYER') {
            drawProceduralSquirrel(ctx, item.data as Player, state.time);
        } else if (item.type === 'OBSTACLE') {
            drawProceduralObstacle(ctx, item.data as Entity);
        } else if (item.type === 'ENEMY') {
            const e = item.data as Enemy;
            const sprite = assets[e.type];
            
            // Shadow
            ctx.fillStyle = 'rgba(0,0,0,0.3)';
            ctx.beginPath();
            ctx.ellipse(e.x, e.y + 10, 10, 4, 0, 0, Math.PI * 2);
            ctx.fill();

            if (sprite && sprite.complete && sprite.naturalWidth > 0) {
                const frameSize = 64; 
                const frameIndex = e.animationFrame || 0;
                let srcX = 0;
                let srcY = 0;
                
                if (sprite.height > 200) {
                    srcY = 11 * frameSize; // Walk row
                    srcX = (frameIndex % 8) * frameSize; 
                } else {
                    srcX = (frameIndex % (sprite.width / frameSize)) * frameSize;
                }

                ctx.save();
                ctx.translate(e.x, e.y);
                if (e.facing === 'LEFT') ctx.scale(-1, 1);
                ctx.drawImage(sprite, srcX, srcY, frameSize, frameSize, -32, -48, 64, 64);
                ctx.restore();
            } else {
                drawProceduralEnemy(ctx, e, state.time);
            }
        }
    }

    // 5. Projectiles
    for (const p of state.projectiles) {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation || 0);
        
        if (p.weaponType === 'NUT_THROW' || !p.weaponType) {
             const v = p.variant || 0;
             if (v % 3 === 0) {
                 drawAcorn(ctx, p.radius);
             } else if (v % 3 === 1) {
                 drawWalnut(ctx, p.radius);
             } else {
                 drawPeanut(ctx, p.radius);
             }
        } else if (p.weaponType === 'ACORN_CANNON') {
             drawAcorn(ctx, p.radius, true); // Bomb acorn
        } else if (p.weaponType === 'PINE_NEEDLE') {
             ctx.fillStyle = '#2F855A';
             ctx.fillRect(-p.radius*2, -1, p.radius*4, 2);
        } else if (p.weaponType === 'BOOMERANG') {
             ctx.strokeStyle = '#5D4037';
             ctx.lineWidth = 3;
             ctx.beginPath();
             ctx.moveTo(-p.radius, -p.radius);
             ctx.lineTo(0, 0);
             ctx.lineTo(-p.radius, p.radius);
             ctx.stroke();
        } else {
            // Default Circle
            ctx.fillStyle = p.color || '#D69E2E';
            ctx.beginPath(); 
            ctx.arc(0, 0, p.radius, 0, Math.PI*2); 
            ctx.fill();
        }

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

// --- HELPERS ---

function shadeColor(color: string, percent: number) {
    if (!color || color.length < 7) return color;
    let f=parseInt(color.slice(1),16),t=percent<0?0:255,p=percent<0?percent*-1:percent,R=f>>16,G=f>>8&0x00FF,B=f&0x0000FF;
    return "#"+(0x1000000+(Math.round((t-R)*p)+R)*0x10000+(Math.round((t-G)*p)+G)*0x100+(Math.round((t-B)*p)+B)).toString(16).slice(1);
}

function pseudoRandom(seed: number) {
    let x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
}

function drawAcorn(ctx: CanvasRenderingContext2D, radius: number, isBomb = false) {
    const bodyColor = isBomb ? '#3E2723' : '#CD853F';
    const capColor = isBomb ? '#212121' : '#8B4513';
    
    // Body
    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.moveTo(-radius*0.7, 0);
    ctx.bezierCurveTo(-radius*0.7, radius*1.5, radius*0.7, radius*1.5, radius*0.7, 0); 
    ctx.fill();
    
    // Cap
    ctx.fillStyle = capColor;
    ctx.beginPath();
    ctx.arc(0, 0, radius, Math.PI, 0); 
    ctx.lineTo(-radius, 0);
    ctx.fill();
    
    // Stem
    ctx.beginPath();
    ctx.moveTo(0, -radius);
    ctx.lineTo(0, -radius - 3);
    ctx.strokeStyle = '#5D4037';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Shine/Highlight
    if (!isBomb) {
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        ctx.beginPath();
        ctx.ellipse(-radius*0.3, radius*0.5, radius * 0.2, radius * 0.4, -0.2, 0, Math.PI * 2);
        ctx.fill();
    } else {
        // Fuse spark for cannon
        ctx.fillStyle = 'orange';
        ctx.beginPath();
        ctx.arc(0, -radius - 3, 2, 0, Math.PI*2);
        ctx.fill();
    }
}

function drawWalnut(ctx: CanvasRenderingContext2D, radius: number) {
    ctx.fillStyle = '#C19A6B'; // Light brown
    ctx.beginPath();
    ctx.ellipse(0, 0, radius * 0.9, radius, 0, 0, Math.PI*2);
    ctx.fill();
    
    // Crinkles
    ctx.strokeStyle = '#8D6E63';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, -radius);
    ctx.bezierCurveTo(radius*0.5, -radius*0.5, -radius*0.5, radius*0.5, 0, radius);
    ctx.stroke();
    
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-radius*0.6, -radius*0.3);
    ctx.quadraticCurveTo(-radius*0.2, 0, -radius*0.6, radius*0.3);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(radius*0.6, -radius*0.3);
    ctx.quadraticCurveTo(radius*0.2, 0, radius*0.6, radius*0.3);
    ctx.stroke();
}

function drawPeanut(ctx: CanvasRenderingContext2D, radius: number) {
    ctx.fillStyle = '#E1C699'; // Tan
    
    // Figure 8 shape
    ctx.beginPath();
    ctx.arc(0, -radius*0.5, radius*0.7, 0, Math.PI*2);
    ctx.arc(0, radius*0.5, radius*0.7, 0, Math.PI*2);
    ctx.fill();
    
    // Texture dots
    ctx.fillStyle = 'rgba(139, 69, 19, 0.3)';
    for(let i=0; i<4; i++) {
        const x = (Math.sin(i * 342) * 0.5) * radius;
        const y = (Math.cos(i * 123) * 0.8) * radius;
        ctx.beginPath();
        ctx.arc(x, y, 1.5, 0, Math.PI*2);
        ctx.fill();
    }
}

function drawProceduralObstacle(ctx: CanvasRenderingContext2D, obs: Entity) {
    ctx.save();
    ctx.translate(obs.x, obs.y);
    const variant = obs.variant || 0;
    
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.ellipse(0, obs.radius * 0.4, obs.radius, obs.radius * 0.3, 0, 0, Math.PI*2);
    ctx.fill();

    if (obs.type === 'TREE') {
        if (variant < 5) {
            // OAK
            ctx.fillStyle = '#5D4037';
            ctx.fillRect(-obs.radius*0.25, -obs.radius*0.6, obs.radius*0.5, obs.radius);
            
            const clusters = [
                {x: 0, y: -obs.radius * 1.5, r: obs.radius * 0.8},
                {x: -obs.radius * 0.7, y: -obs.radius * 1.2, r: obs.radius * 0.7},
                {x: obs.radius * 0.7, y: -obs.radius * 1.2, r: obs.radius * 0.7},
                {x: -obs.radius * 0.4, y: -obs.radius * 0.8, r: obs.radius * 0.6},
                {x: obs.radius * 0.4, y: -obs.radius * 0.8, r: obs.radius * 0.6},
            ];
            for (const c of clusters) {
                ctx.fillStyle = '#2F855A';
                ctx.beginPath(); ctx.arc(c.x, c.y, c.r, 0, Math.PI*2); ctx.fill();
                ctx.fillStyle = '#48BB78';
                ctx.beginPath(); ctx.arc(c.x, c.y - c.r*0.2, c.r*0.6, 0, Math.PI*2); ctx.fill();
            }
        } else {
            // PINE
            ctx.fillStyle = '#3E2723';
            ctx.fillRect(-obs.radius*0.2, -obs.radius*0.5, obs.radius*0.4, obs.radius);
            ctx.fillStyle = obs.color || '#276749';
            const layers = 4;
            const layerHeight = obs.radius * 1.2;
            for(let i=0; i<layers; i++) {
                ctx.beginPath();
                const jitter = pseudoRandom(variant + i) * 0.2;
                const width = obs.radius * (1.1 - i*0.25 + jitter);
                const yBase = -obs.radius*0.2 - (i * layerHeight * 0.5);
                ctx.moveTo(-width, yBase);
                ctx.lineTo(-width*0.5, yBase - layerHeight*0.5); 
                ctx.lineTo(0, yBase - layerHeight); 
                ctx.lineTo(width*0.5, yBase - layerHeight*0.5); 
                ctx.lineTo(width, yBase);
                ctx.fill();
                
                ctx.fillStyle = 'rgba(0,0,0,0.15)';
                ctx.beginPath();
                ctx.moveTo(0, yBase - layerHeight);
                ctx.lineTo(width, yBase);
                ctx.lineTo(0, yBase);
                ctx.fill();
                ctx.fillStyle = obs.color || '#276749';
            }
        }
    } else if (obs.type === 'BUSH') {
        const bushColor = obs.color || '#48BB78';
        ctx.fillStyle = bushColor;
        ctx.beginPath(); ctx.arc(0, -5, obs.radius * 0.7, 0, Math.PI*2); ctx.fill();
        
        const subClumps = 3 + (variant % 3);
        for(let i=0; i<subClumps; i++) {
            const angle = (i / subClumps) * Math.PI * 2;
            const dist = obs.radius * 0.5;
            ctx.beginPath();
            ctx.arc(Math.cos(angle)*dist, Math.sin(angle)*dist - 5, obs.radius*0.5, 0, Math.PI*2);
            ctx.fill();
        }
        if (variant % 3 !== 0) { 
            ctx.fillStyle = variant % 2 === 0 ? '#E53E3E' : '#ECC94B'; 
            const berryCount = 4 + (variant % 4);
            for(let i=0; i<berryCount; i++) {
                const r = pseudoRandom(variant * 10 + i) * obs.radius * 0.8;
                const theta = pseudoRandom(variant * 20 + i) * Math.PI * 2;
                ctx.beginPath(); 
                ctx.arc(Math.cos(theta)*r, Math.sin(theta)*r - 5, 3, 0, Math.PI*2); 
                ctx.fill();
            }
        }
    } else if (obs.type === 'ROCK') {
        ctx.fillStyle = '#718096';
        ctx.beginPath();
        const vertices = 6 + (variant % 3);
        for(let i=0; i<vertices; i++) {
            const angle = (i / vertices) * Math.PI * 2;
            const r = obs.radius * (0.8 + pseudoRandom(variant * 5 + i) * 0.4);
            if (i===0) ctx.moveTo(Math.cos(angle)*r, Math.sin(angle)*r - 5);
            else ctx.lineTo(Math.cos(angle)*r, Math.sin(angle)*r - 5);
        }
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#4A5568';
        ctx.lineWidth = 1;
        ctx.stroke();
    }
    ctx.restore();
}

function drawProceduralSquirrel(ctx: CanvasRenderingContext2D, player: Player, time: number) {
    ctx.save();
    ctx.translate(player.x, player.y);
    const scaleX = player.facing === 'LEFT' ? -1 : 1;
    ctx.scale(scaleX, 1);

    const isMoving = Math.abs(player.velocity.x) > 0.1 || Math.abs(player.velocity.y) > 0.1;
    const runBob = isMoving ? Math.sin(time * 0.4) * 2 : 0;
    const tailWag = Math.sin(time * 0.1) * 0.2;
    const tailLag = isMoving ? (Math.sin(time * 0.4 + Math.PI) * 0.1) - 0.2 : 0;

    const furColor = player.color;
    const bellyColor = player.secondaryColor;
    const earColor = shadeColor(furColor, -0.1);

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath(); ctx.ellipse(0, 8, 12, 4, 0, 0, Math.PI * 2); ctx.fill();

    ctx.translate(0, runBob);

    // Tail
    ctx.save();
    ctx.translate(-12, 0); 
    ctx.rotate(tailWag + tailLag - 0.5); 
    ctx.fillStyle = furColor;
    ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(-6, -6, 9, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(-10, -14, 11, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = shadeColor(furColor, 0.1);
    ctx.beginPath(); ctx.arc(-10, -14, 6, 0, Math.PI*2); ctx.fill();
    ctx.restore();

    // Body
    ctx.fillStyle = shadeColor(furColor, -0.2);
    ctx.beginPath(); ctx.ellipse(-6, 8, 4, 3, 0, 0, Math.PI*2); ctx.fill(); // Back Leg Far
    
    ctx.fillStyle = furColor;
    ctx.beginPath(); ctx.ellipse(0, 4, 9, 8, 0, 0, Math.PI*2); ctx.fill(); // Torso
    ctx.fillStyle = bellyColor;
    ctx.beginPath(); ctx.ellipse(2, 4, 5, 6, 0, 0, Math.PI*2); ctx.fill(); // Belly

    // Head
    ctx.save();
    ctx.translate(4, -6); 
    ctx.fillStyle = earColor;
    ctx.beginPath(); ctx.moveTo(-2, -6); ctx.lineTo(-6, -16); ctx.lineTo(-8, -5); ctx.fill(); // L Ear
    ctx.beginPath(); ctx.moveTo(2, -6); ctx.lineTo(6, -16); ctx.lineTo(8, -5); ctx.fill(); // R Ear
    ctx.fillStyle = furColor;
    ctx.beginPath(); ctx.arc(0, 0, 9, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = bellyColor;
    ctx.beginPath(); ctx.ellipse(4, 2, 5, 4, 0, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#1a202c';
    ctx.beginPath(); ctx.arc(8, 1, 1.5, 0, Math.PI*2); ctx.fill(); // Nose
    
    const blink = Math.sin(time * 0.05) > 0.98;
    if (!blink) {
        ctx.fillStyle = 'black';
        ctx.beginPath(); ctx.arc(2, -2, 2, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = 'white';
        ctx.beginPath(); ctx.arc(3, -3, 0.8, 0, Math.PI*2); ctx.fill();
    } else {
        ctx.strokeStyle = 'black'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(0, -2); ctx.lineTo(4, -2); ctx.stroke();
    }
    ctx.restore();

    // Front Paw
    ctx.fillStyle = furColor;
    ctx.beginPath(); ctx.ellipse(6, 4, 3, 2, 0, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#D69E2E'; 
    ctx.beginPath(); ctx.arc(8, 3, 3, 0, Math.PI*2); ctx.fill();

    // Back Leg Near
    ctx.fillStyle = furColor;
    ctx.beginPath();
    const legCycle = isMoving ? Math.sin(time * 0.4) * 4 : 0;
    ctx.ellipse(-4 + legCycle, 9, 5, 3, 0, 0, Math.PI*2);
    ctx.fill();

    ctx.restore();
}

function drawProceduralEnemy(ctx: CanvasRenderingContext2D, enemy: Enemy, time: number) {
    ctx.save();
    ctx.translate(enemy.x, enemy.y);
    if (enemy.facing === 'LEFT') ctx.scale(-1, 1);
    const bounce = Math.abs(Math.sin(time * 0.2)) * 3;

    if (enemy.type === 'GOBLIN') {
        ctx.fillStyle = '#2F855A'; 
        ctx.fillRect(-10, -20 - bounce, 20, 20);
        ctx.fillStyle = '#48BB78';
        ctx.beginPath(); ctx.arc(0, -25 - bounce, 12, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.moveTo(-10, -25 - bounce); ctx.lineTo(-20, -30 - bounce); ctx.lineTo(-10, -20 - bounce); ctx.fill();
        ctx.fillStyle = 'yellow';
        ctx.beginPath(); ctx.arc(4, -25 - bounce, 2, 0, Math.PI*2); ctx.fill();
    } else if (enemy.type === 'GNOME') {
        ctx.fillStyle = '#3182CE'; 
        ctx.fillRect(-8, -18 - bounce, 16, 18);
        ctx.fillStyle = '#F6E05E'; 
        ctx.beginPath(); ctx.arc(0, -24 - bounce, 10, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#E53E3E'; 
        ctx.beginPath(); ctx.moveTo(-12, -28 - bounce); ctx.lineTo(12, -28 - bounce); ctx.lineTo(0, -45 - bounce); ctx.fill();
        ctx.fillStyle = 'white';
        ctx.beginPath(); ctx.arc(0, -20 - bounce, 10, 0, Math.PI); ctx.fill();
    } else {
        ctx.fillStyle = '#48BB78'; 
        ctx.beginPath(); ctx.arc(0, -10 - bounce, 11, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#2F855A'; 
        ctx.fillRect(-8, 0 - bounce, 16, 12);
        ctx.fillStyle = '#48BB78'; ctx.fillRect(5, -5 - bounce, 12, 4);
    }
    ctx.restore();
}
