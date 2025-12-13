
import React, { useRef, useEffect, useCallback, useState } from 'react';
import { GameState, Player, Upgrade, SquirrelCharacter, StageDuration, Enemy, Entity, Projectile, Weapon, Drop, StatusEffect, CompanionType } from '../types';
import { INITIAL_GAME_STATE, INITIAL_PLAYER, COLORS, STAGE_CONFIGS, COMPANION_COLORS } from '../constants';
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
  
  // Touch Joystick State
  const touchRef = useRef<{ 
      active: boolean; 
      origin: {x: number, y: number} | null; 
      current: {x: number, y: number} | null;
      vector: {x: number, y: number};
  }>({
      active: false,
      origin: null,
      current: null,
      vector: {x: 0, y: 0}
  });

  // Track window dimensions & Pixel Ratio
  const [dimensions, setDimensions] = useState({ 
      width: typeof window !== 'undefined' ? window.innerWidth : 1280, 
      height: typeof window !== 'undefined' ? window.innerHeight : 720,
      dpr: typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1
  });

  // Pattern Caches
  const grassPatternRef = useRef<CanvasPattern | null>(null);
  const borderPatternRef = useRef<CanvasPattern | null>(null);

  // Constants
  const MAP_LIMIT = 1500;
  const BORDER_THICKNESS = 2000;
  const SUB_BOSS_INTERVAL = 1800; // 30 seconds
  const EXTRACTION_TIME_LIMIT = 45 * 60; // 45 seconds

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
          
          // --- DIRT PATCHES ---
          // Draw random organic patches of dirt before drawing grass blades
          for(let i=0; i<15; i++) {
              const cx = Math.random() * 512;
              const cy = Math.random() * 512;
              const patchSize = 50 + Math.random() * 80;
              
              // Dirt color (darker, browner green/brown)
              gCtx.fillStyle = 'rgba(62, 39, 35, 0.4)'; 
              
              // Draw blobby shape using overlapping circles
              for(let j=0; j<8; j++) {
                  const ox = (Math.random() - 0.5) * patchSize;
                  const oy = (Math.random() - 0.5) * patchSize;
                  const r = patchSize * (0.3 + Math.random() * 0.4);
                  gCtx.beginPath();
                  gCtx.arc(cx + ox, cy + oy, r, 0, Math.PI*2);
                  gCtx.fill();
              }
          }

          // --- GRASS BLADES ---
          for(let i=0; i<40; i++) {
              gCtx.fillStyle = 'rgba(40, 30, 20, 0.15)';
              gCtx.beginPath();
              gCtx.arc(Math.random() * 512, Math.random() * 512, 10 + Math.random() * 40, 0, Math.PI*2);
              gCtx.fill();
          }

          for(let i=0; i<15000; i++) {
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
            height: window.innerHeight,
            dpr: window.devicePixelRatio || 1
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
        let variant = 0;

        if (typeRoll < 0.6) {
            type = 'TREE';
            radius = 35 + Math.random() * 35;
            color = '#2F855A';
            // Variant Logic: (StripID * 100) + RandomSeed
            // StripID: 1-4, Seed: 0-99
            const stripId = 1 + Math.floor(Math.random() * 4);
            const seed = Math.floor(Math.random() * 100);
            variant = (stripId * 100) + seed;
        } else if (typeRoll < 0.9) {
            type = 'BUSH';
            radius = 20 + Math.random() * 20;
            color = '#48BB78';
            variant = Math.floor(Math.random() * 10);
        } else {
            type = 'ROCK';
            radius = 15 + Math.random() * 15;
            color = '#718096';
            variant = Math.floor(Math.random() * 10);
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
        
        // --- HANDLE ARMORY UNLOCKS ---
        
        // 1. Weapons
        if (character.startingWeapons && character.startingWeapons.length > 0) {
            character.startingWeapons.forEach(newWep => {
                const existing = player.weapons.find(w => w.type === newWep.type);
                if (!existing) {
                    player.weapons.push(JSON.parse(JSON.stringify(newWep)));
                }
            });
        }

        // 2. Companions
        if (character.startingCompanions && character.startingCompanions.length > 0) {
            // Increase cap to accommodate starters + standard gameplay progression
            player.maxCompanions = Math.max(player.maxCompanions, character.startingCompanions.length);
            
            character.startingCompanions.forEach((compType, idx) => {
                gameStateRef.current.companions.push({
                    id: `comp-starter-${Date.now()}-${idx}`,
                    x: player.x + (Math.random() - 0.5) * 60,
                    y: player.y + (Math.random() - 0.5) * 60,
                    radius: 12,
                    type: 'COMPANION',
                    color: '#FBD38D', 
                    secondaryColor: COMPANION_COLORS[compType],
                    facing: 'RIGHT',
                    velocity: { x: 0, y: 0 },
                    variant: 0,
                    subtype: compType,
                    abilityTimer: 0
                });
            });
        }
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

    // Touch Handlers
    const handleTouchStart = (e: TouchEvent) => {
        e.preventDefault(); // Prevent scrolling
        const touch = e.touches[0];
        if (touch) {
            touchRef.current.active = true;
            touchRef.current.origin = { x: touch.clientX, y: touch.clientY };
            touchRef.current.current = { x: touch.clientX, y: touch.clientY };
            touchRef.current.vector = { x: 0, y: 0 };
        }
    };

    const handleTouchMove = (e: TouchEvent) => {
        e.preventDefault();
        if (!touchRef.current.active || !touchRef.current.origin) return;
        
        const touch = e.touches[0];
        if (touch) {
            touchRef.current.current = { x: touch.clientX, y: touch.clientY };
            
            const dx = touch.clientX - touchRef.current.origin.x;
            const dy = touch.clientY - touchRef.current.origin.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const maxDist = 50; // Joystick radius
            
            // Normalize vector
            const cappedDist = Math.min(dist, maxDist);
            const normalizedDist = cappedDist / maxDist;
            
            if (dist > 0) {
                touchRef.current.vector = {
                    x: (dx / dist) * normalizedDist,
                    y: (dy / dist) * normalizedDist
                };
            }
        }
    };

    const handleTouchEnd = (e: TouchEvent) => {
        e.preventDefault();
        touchRef.current.active = false;
        touchRef.current.origin = null;
        touchRef.current.current = null;
        touchRef.current.vector = { x: 0, y: 0 };
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    // Add touch listeners to canvas specifically or window
    const canvas = canvasRef.current;
    if (canvas) {
        canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
        canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
        canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
    }

    if (musicEnabled) playMusic('PARK');

    return () => {
        window.removeEventListener('resize', handleResize);
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('keyup', handleKeyUp);
        
        if (canvas) {
            canvas.removeEventListener('touchstart', handleTouchStart);
            canvas.removeEventListener('touchmove', handleTouchMove);
            canvas.removeEventListener('touchend', handleTouchEnd);
        }

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

    // --- HIGH DPI SETUP ---
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const { dpr, width: logicalWidth, height: logicalHeight } = dimensions;
    ctx.scale(dpr, dpr);
    ctx.imageSmoothingEnabled = false;

    // --- UPDATE LOGIC ---

    // 0. Calculate Companion Buffs
    let activeSpeedBonus = 0;
    let activeDamageBonus = 0;
    let activeCooldownBonus = 0;
    
    // Process Companion Passives (Healing, Buffs)
    for (const comp of state.companions) {
        comp.abilityTimer++;

        if (comp.subtype === 'SCOUT') {
            activeSpeedBonus += 0.50; // +50% Speed per Scout
        } else if (comp.subtype === 'WARRIOR') {
            activeDamageBonus += 0.25; // +25% Damage per Warrior
        } else if (comp.subtype === 'SNIPER') {
            activeCooldownBonus += 0.35; // +35% Attack Speed (CDR)
        } else if (comp.subtype === 'HEALER') {
            // Heal every 5 seconds (300 frames)
            if (comp.abilityTimer >= 300) {
                const healAmount = state.player.maxHp * 0.02; // 2% Max HP
                if (state.player.hp < state.player.maxHp) {
                    state.player.hp = Math.min(state.player.maxHp, state.player.hp + healAmount);
                    state.texts.push({
                        id: `heal-${Date.now()}`,
                        x: state.player.x,
                        y: state.player.y - 20,
                        text: `+${Math.ceil(healAmount)}`,
                        life: 30,
                        velocity: { x: 0, y: -1 },
                        opacity: 1,
                        color: '#68D391', // Green text
                        type: 'TEXT',
                        radius: 0
                    });
                }
                comp.abilityTimer = 0;
            }
        } else if (comp.subtype === 'DESERT') {
            // Burn Aura every 5 seconds
            if (comp.abilityTimer >= 300) {
                // Find enemies in radius
                const range = 200;
                let hitCount = 0;
                for (const e of state.enemies) {
                    if (Math.hypot(e.x - comp.x, e.y - comp.y) < range) {
                        e.activeEffects.push({
                            type: 'BURN',
                            duration: 180, // 3s
                            power: 5 // 5 dmg per tick
                        });
                        hitCount++;
                    }
                }
                if (hitCount > 0) {
                    // Visual Effect
                    state.particles.push({
                        id: `nova-${Date.now()}`,
                        x: comp.x, y: comp.y,
                        radius: range,
                        color: 'rgba(221, 107, 32, 0.3)',
                        life: 20, maxLife: 20,
                        type: 'FLASH',
                        velocity: {x:0, y:0}, scale: 1
                    });
                }
                comp.abilityTimer = 0;
            }
        }
    }

    // 1. Player Movement (Keyboard + Touch)
    let dx = 0;
    let dy = 0;
    if (keysPressed.current['w'] || keysPressed.current['arrowup']) dy -= 1;
    if (keysPressed.current['s'] || keysPressed.current['arrowdown']) dy += 1;
    if (keysPressed.current['a'] || keysPressed.current['arrowleft']) dx -= 1;
    if (keysPressed.current['d'] || keysPressed.current['arrowright']) dx += 1;
    if (touchRef.current.active) {
        dx = touchRef.current.vector.x;
        dy = touchRef.current.vector.y;
    }

    if (dx !== 0 || dy !== 0) {
        const length = Math.sqrt(dx * dx + dy * dy);
        if (length > 1) {
            dx = dx / length;
            dy = dy / length;
        }
        
        // Apply Speed Modifiers
        const currentSpeed = state.player.speed * (1 + activeSpeedBonus);
        
        dx *= currentSpeed;
        dy *= currentSpeed;
        let nextX = state.player.x + dx;
        let nextY = state.player.y + dy;

        for (const obs of state.obstacles) {
            const dist = Math.hypot(nextX - obs.x, nextY - obs.y);
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

    // 1.5 Companions (Scurry) Logic
    if (state.companions.length < state.player.maxCompanions) {
        // Generic fill if no specific type assigned, but prioritize specific unlocks first.
        // Since we spawn unlocks at start, we only fill if unlocks < maxCompanions.
        // We can random fill or just leave empty slots for in-run upgrades.
        // For now, let's allow random fills if player bought generic capacity but not specific squirrels.
        // Cycle through types to ensure variety
        const companionTypes: CompanionType[] = ['HEALER', 'WARRIOR', 'SCOUT', 'SNIPER'];
        const typeIndex = state.companions.length % companionTypes.length;
        const newType = companionTypes[typeIndex];
        const secondary = COMPANION_COLORS[newType];

        state.companions.push({
            id: `comp-random-${Date.now()}-${state.companions.length}`,
            x: state.player.x + (Math.random() - 0.5) * 50,
            y: state.player.y + (Math.random() - 0.5) * 50,
            radius: 12,
            type: 'COMPANION',
            color: '#FBD38D', 
            secondaryColor: secondary,
            facing: 'RIGHT',
            velocity: { x: 0, y: 0 },
            variant: 0,
            subtype: newType,
            abilityTimer: 0
        });
    }
    
    // Companion Movement & Combat
    for (const comp of state.companions) {
        const dist = Math.hypot(state.player.x - comp.x, state.player.y - comp.y);
        if (dist > 60) {
            const angle = Math.atan2(state.player.y - comp.y, state.player.x - comp.x);
            // Companions also get speed bonus to keep up
            const compSpeed = state.player.speed * 0.9 * (1 + activeSpeedBonus);
            comp.x += Math.cos(angle) * compSpeed;
            comp.y += Math.sin(angle) * compSpeed;
            comp.facing = Math.cos(angle) > 0 ? 'RIGHT' : 'LEFT';
        }
        if (comp.variant !== undefined) comp.variant--;
        if ((comp.variant === undefined || comp.variant <= 0) && state.enemies.length > 0) {
            let nearest = null;
            let minDist = 400;
            for (const e of state.enemies) {
                const d = Math.hypot(e.x - comp.x, e.y - comp.y);
                if (d < minDist) {
                    minDist = d;
                    nearest = e;
                }
            }
            if (nearest) {
                const angle = Math.atan2(nearest.y - comp.y, nearest.x - comp.x);
                
                // Determine Companion Damage
                // Base damage = Player's primary weapon damage
                const primaryWeapon = state.player.weapons.find(w => w.type === 'NUT_THROW');
                const baseDmg = (primaryWeapon ? primaryWeapon.damage : 10) * 0.25;
                
                // Arctic Squirrel Effect
                const statusType = comp.subtype === 'ARCTIC' ? 'SLOW' : undefined;
                const statusChance = comp.subtype === 'ARCTIC' ? 1.0 : 0;
                const statusPower = comp.subtype === 'ARCTIC' ? 0.3 : 0; // 30% slow
                const statusDuration = comp.subtype === 'ARCTIC' ? 60 : 0;

                state.projectiles.push({
                    id: `cp-${Date.now()}-${Math.random()}`,
                    x: comp.x, y: comp.y,
                    velocity: { x: Math.cos(angle) * 6, y: Math.sin(angle) * 6 },
                    damage: baseDmg,
                    life: 60,
                    source: 'PLAYER',
                    weaponType: 'NUT_THROW',
                    radius: 4,
                    color: comp.secondaryColor || '#ECC94B',
                    type: 'PROJECTILE',
                    variant: 0,
                    damageType: comp.subtype === 'ARCTIC' ? 'COLD' : (comp.subtype === 'DESERT' ? 'FIRE' : 'PHYSICAL'),
                    statusType,
                    statusChance,
                    statusPower,
                    statusDuration
                });
                comp.variant = 90; // Fire rate
            }
        }
    }

    // 2. Enemy Spawning Logic
    const maxTime = STAGE_CONFIGS[stageDuration].waveDuration * 60;
    
    // Check for Boss Phase / Extraction
    if (state.time >= maxTime && state.phase === 'SURVIVAL') {
        state.phase = 'EXTRACTION';
        state.extractionTimer = EXTRACTION_TIME_LIMIT;
        
        // Spawn MAIN BOSS
        const angle = Math.random() * Math.PI * 2;
        const spawnDist = Math.max(logicalWidth, logicalHeight) / 2 + 150;
        state.enemies.push({
             id: `BOSS-${Date.now()}`,
             x: state.player.x + Math.cos(angle) * spawnDist,
             y: state.player.y + Math.sin(angle) * spawnDist,
             radius: 60, 
             color: '#E53E3E',
             type: 'GNOME', // Big Gnome
             isBoss: true,
             hp: 2000 + (state.wave * 300),
             maxHp: 2000 + (state.wave * 300),
             speed: 2.5,
             damage: 25,
             xpValue: 1000,
             velocity: { x: 0, y: 0 },
             facing: 'LEFT',
             animationFrame: 0,
             activeEffects: []
        });
        
        if (soundEnabled) playSound('WARNING');
        state.shake = { intensity: 10, duration: 60 };
    }

    // Normal & Sub-boss Spawning (Only during Survival)
    if (state.phase === 'SURVIVAL') {
        const spawnChance = 0.02 + (state.wave * 0.005);
        const maxEnemies = 40 + (state.wave * 10); // Increased density

        // Sub-boss Check (Every 30 seconds)
        if (state.time > 0 && state.time % SUB_BOSS_INTERVAL === 0) {
             const angle = Math.random() * Math.PI * 2;
             const spawnDist = Math.max(logicalWidth, logicalHeight) / 2 + 100;
             state.enemies.push({
                 id: `SUB-${Date.now()}`,
                 x: state.player.x + Math.cos(angle) * spawnDist,
                 y: state.player.y + Math.sin(angle) * spawnDist,
                 radius: 30, 
                 color: '#D69E2E',
                 type: 'GOBLIN', // Beefy Goblin
                 isElite: true,
                 hp: 500 + (state.wave * 50),
                 maxHp: 500 + (state.wave * 50),
                 speed: 3,
                 damage: 15,
                 xpValue: 200,
                 velocity: { x: 0, y: 0 },
                 facing: 'LEFT',
                 animationFrame: 0,
                 activeEffects: []
             });
             if (soundEnabled) playSound('WARNING');
        }

        if (Math.random() < spawnChance && state.enemies.length < maxEnemies) {
             const angle = Math.random() * Math.PI * 2;
             const spawnDist = Math.max(logicalWidth, logicalHeight) / 2 + 100;
             
             const enemyTypes = ['ZOMBIE', 'GOBLIN', 'GNOME'];
             const selectedType = enemyTypes[Math.floor(Math.random() * enemyTypes.length)];
             
             let color = '#68d391';
             let speed = 2 + (Math.random() * 0.5);
             let hp = 35 + (state.wave * 5); 

             if (selectedType === 'GOBLIN') {
                 color = '#a0aec0';
                 speed = 2.5;
                 hp = 30 + (state.wave * 4);
             } else if (selectedType === 'GNOME') {
                 color = '#b83280';
                 speed = 1.5;
                 hp = 80 + (state.wave * 12); // Tanky
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
                 animationFrame: 0,
                 activeEffects: []
             });
        }
    }

    // Extraction Timer Logic
    if (state.phase === 'EXTRACTION') {
        state.extractionTimer--;
        
        // Loss Condition: Time ran out
        if (state.extractionTimer <= 0) {
            onGameOver(state.score, state.time, state.kills, state.collectedNuts, false);
        }
        
        // Win Condition: All enemies dead (including boss)
        if (state.enemies.length === 0) {
            onStageComplete(state.player, state.score, state.kills, state.collectedNuts);
        }
    }

    // 3. Enemy Logic
    for (let i = state.enemies.length - 1; i >= 0; i--) {
        const e = state.enemies[i];
        
        // --- Status Effects Processing ---
        let speedModifier = 1.0;
        
        for (let k = e.activeEffects.length - 1; k >= 0; k--) {
            const eff = e.activeEffects[k];
            eff.duration--;
            
            if (eff.type === 'SLOW') {
                speedModifier *= (1 - eff.power);
            } else if (eff.type === 'FREEZE') {
                speedModifier = 0;
            } else if (eff.type === 'BURN') {
                if (eff.tickTimer === undefined) eff.tickTimer = 0;
                eff.tickTimer++;
                if (eff.tickTimer >= 30) { // Tick every 0.5s (30 frames)
                    e.hp -= eff.power;
                    eff.tickTimer = 0;
                    // Visual pop for dot?
                }
            }
            
            if (eff.duration <= 0) {
                e.activeEffects.splice(k, 1);
            }
        }
        
        // Movement
        const dx = state.player.x - e.x;
        const dy = state.player.y - e.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        
        const currentSpeed = e.speed * speedModifier;
        
        if (dist > 0 && currentSpeed > 0) {
            e.x += (dx/dist) * currentSpeed;
            e.y += (dy/dist) * currentSpeed;
        }
        
        if (Math.abs(dx) > 0.1) e.facing = dx > 0 ? 'RIGHT' : 'LEFT';
        if (state.time % 8 === 0) e.animationFrame = ((e.animationFrame || 0) + 1) % 100;
        
        // Collision with player
        const hitDist = e.radius + state.player.radius;
        if (dist < hitDist && state.player.invincibleTimer <= 0) {
            state.player.hp -= e.damage;
            state.player.invincibleTimer = 30;
            if(soundEnabled) playSound('HIT');
            
            // Screen shake on big hits
            if (e.isBoss || e.isElite) {
                state.shake = { intensity: 5, duration: 10 };
            }
        }
        
        // Death check (from DoTs etc)
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

             // Boss Explosion
             if (e.isBoss || e.isElite) {
                 particleCount = 30;
                 particleSpeedBase = 6;
                 particleSubtype = 'ELITE_ESSENCE';
                 state.shake = { intensity: 15, duration: 30 };
                 if(soundEnabled) playSound('EXPLOSION');
             }

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
             state.score += (e.isBoss ? 1000 : (e.isElite ? 200 : 10));
             state.drops.push({
                 id: `d-${Date.now()}`, x: e.x, y: e.y, radius: 8, type: 'DROP',
                 color: '#4299e1', kind: 'XP', value: e.xpValue
             });
        }
    }
    if (state.player.invincibleTimer > 0) state.player.invincibleTimer--;

    // 4. Weapons & Projectiles
    // --- SPECIAL: CROW AURA (Persistent) ---
    const crowWeapon = state.player.weapons.find(w => w.type === 'CROW_AURA');
    if (crowWeapon) {
        const existingCrows = state.projectiles.filter(p => p.weaponType === 'CROW_AURA');
        if (existingCrows.length < crowWeapon.amount) {
             for(let i=existingCrows.length; i<crowWeapon.amount; i++) {
                 state.projectiles.push({
                     id: `crow-${Date.now()}-${i}`,
                     x: state.player.x,
                     y: state.player.y,
                     velocity: { x: 0, y: 0 },
                     damage: crowWeapon.damage,
                     life: 999999, // Persistent
                     source: 'PLAYER',
                     weaponType: 'CROW_AURA',
                     radius: 12,
                     color: 'black',
                     type: 'PROJECTILE',
                     variant: i,
                     damageType: 'PHYSICAL',
                     statusChance: 0,
                     statusPower: 0,
                     statusDuration: 0
                 });
             }
        }
        const crows = state.projectiles.filter(p => p.weaponType === 'CROW_AURA');
        crows.forEach((p, index) => {
            const totalCrows = crows.length;
            const spacing = (Math.PI * 2) / totalCrows;
            const orbitSpeed = crowWeapon.speed || 0.05;
            const angle = (state.time * orbitSpeed) + (index * spacing);
            const orbitRadius = crowWeapon.area;
            
            p.x = state.player.x + Math.cos(angle) * orbitRadius;
            p.y = state.player.y + Math.sin(angle) * orbitRadius;
            p.rotation = angle + (Math.PI / 2); 
            p.damage = crowWeapon.damage * (1 + (state.player.damageBonus || 0) + activeDamageBonus);
        });
    }

    // --- Update Cooldowns & Fire Other Weapons ---
    for (const w of state.player.weapons) {
        if (w.type === 'CROW_AURA') continue; 
        if (w.cooldownTimer > 0) w.cooldownTimer--;
        
        if (w.cooldownTimer <= 0) {
            
            // --- NUT STORM: Random positions in view ---
            if (w.type === 'NUT_STORM') {
                for (let i = 0; i < w.amount; i++) {
                    const viewX = state.player.x - (logicalWidth / 2);
                    const viewY = state.player.y - (logicalHeight / 2);
                    // Random target within view
                    const tx = viewX + Math.random() * logicalWidth;
                    const ty = viewY + Math.random() * logicalHeight;
                    
                    // Start from high up
                    const startY = ty - 400; 
                    
                    state.projectiles.push({
                        id: `storm-${Date.now()}-${i}`,
                        x: tx, y: startY,
                        velocity: { x: 0, y: w.speed }, // Falling down
                        damage: w.damage * (1 + (state.player.damageBonus || 0) + activeDamageBonus),
                        life: 60,
                        source: 'PLAYER',
                        weaponType: w.type,
                        radius: w.area,
                        color: '#4A5568', // Darker storm nut
                        type: 'PROJECTILE',
                        damageType: 'PHYSICAL',
                        statusChance: 0, statusPower: 0, statusDuration: 0
                    });
                }
                const reduction = state.player.cooldownReduction || 0;
                w.cooldownTimer = w.cooldown * (1 - reduction - activeCooldownBonus);
            
            } else {
                // TARGETING WEAPONS
                let target: Enemy | null = null;
                let minDist = 600; 
                
                for(const e of state.enemies) {
                    const d = Math.hypot(e.x - state.player.x, e.y - state.player.y);
                    if (d < minDist) {
                        minDist = d;
                        target = e;
                    }
                }

                if (target) {
                     const angle = Math.atan2(target.y - state.player.y, target.x - state.player.x);
                     
                     for(let i=0; i<w.amount; i++) {
                         let spread = (i - (w.amount-1)/2) * 0.2; 
                         if (w.type === 'NUT_BARRAGE') spread *= 0.3; // Tighter spread
                         
                         const finalAngle = angle + spread;
                         
                         // Leaf Swarm Initial Velocity
                         let vx = Math.cos(finalAngle) * w.speed;
                         let vy = Math.sin(finalAngle) * w.speed;

                         state.projectiles.push({
                             id: `p-${Date.now()}-${i}`,
                             x: state.player.x, 
                             y: state.player.y,
                             velocity: { x: vx, y: vy },
                             // Apply Active Damage Bonus from Warrior Companions
                             damage: w.damage * (1 + (state.player.damageBonus || 0) + activeDamageBonus),
                             life: w.duration || 60,
                             source: 'PLAYER',
                             weaponType: w.type,
                             radius: w.area,
                             color: w.type === 'LEAF_SWARM' ? '#68D391' : '#D69E2E',
                             type: 'PROJECTILE',
                             variant: Math.floor(Math.random() * 10),
                             damageType: w.damageType,
                             statusType: w.statusType,
                             statusChance: w.statusChance,
                             statusPower: w.statusPower,
                             statusDuration: w.statusDuration,
                             // Leaf Swarm Special Props
                             oscillation: w.type === 'LEAF_SWARM' ? (Math.random() > 0.5 ? 1 : -1) : 0
                         });
                     }
                     
                     if (soundEnabled && w.type !== 'SAP_PUDDLE') playSound('NUT');
                     
                     // Apply Cooldown Reductions (Player + Companions)
                     const reduction = state.player.cooldownReduction || 0;
                     // Cap reduction at 75% to prevent infinite fire
                     const totalReduc = Math.min(0.75, reduction + activeCooldownBonus);
                     w.cooldownTimer = w.cooldown * (1 - totalReduc);
                }
            }
        }
    }

    // --- Update Projectiles & Collision ---
    for (let i = state.projectiles.length - 1; i >= 0; i--) {
        const p = state.projectiles[i];
        
        // Projectile Movement
        if (p.weaponType === 'LEAF_SWARM') {
            // Spiral / Wavy movement
            const speed = Math.sqrt(p.velocity.x**2 + p.velocity.y**2);
            const currentAngle = Math.atan2(p.velocity.y, p.velocity.x);
            // Oscillate angle
            const newAngle = currentAngle + (Math.sin(state.time * 0.2) * 0.1 * (p.oscillation || 1));
            
            p.velocity.x = Math.cos(newAngle) * speed;
            p.velocity.y = Math.sin(newAngle) * speed;
            
            p.x += p.velocity.x;
            p.y += p.velocity.y;
            p.rotation = (p.rotation || 0) + 0.2;
        } else if (p.weaponType !== 'CROW_AURA' && p.weaponType !== 'SAP_PUDDLE') {
            p.x += p.velocity.x;
            p.y += p.velocity.y;
            p.rotation = (p.rotation || 0) + 0.3;
        }
        
        p.life--;
        
        let didHit = false;
        
        // Check Collisions
        for (const e of state.enemies) {
            if (Math.hypot(e.x - p.x, e.y - p.y) < (e.radius + p.radius)) {
                let applyDamage = true;
                if (p.weaponType === 'CROW_AURA' || p.weaponType === 'SAP_PUDDLE') {
                    if ((state.time + (p.variant || 0) * 10) % 20 !== 0) applyDamage = false;
                }

                if (applyDamage) {
                    e.hp -= p.damage;
                    didHit = true;
                    
                    // Apply Status Effects
                    if (p.statusType && Math.random() < p.statusChance) {
                        e.activeEffects.push({
                            type: p.statusType,
                            duration: p.statusDuration,
                            power: p.statusPower
                        });
                    }

                    // Knockback
                    if (p.weaponType !== 'CROW_AURA' && p.weaponType !== 'SAP_PUDDLE' && !e.isBoss) {
                        // Leaf Swarm has high knockback
                        const kb = p.weaponType === 'LEAF_SWARM' ? 6 : 2;
                        const angle = Math.atan2(e.y - p.x, e.x - p.x);
                        e.x += Math.cos(angle) * kb;
                        e.y += Math.sin(angle) * kb;
                    }

                    // Hit Effect
                    if (p.weaponType !== 'SAP_PUDDLE') {
                        state.particles.push({
                            id: `hit-${Date.now()}-${Math.random()}`,
                            x: p.x, y: p.y, radius: 4, color: '#FFF',
                            life: 5, maxLife: 5, type: 'FLASH', velocity: {x:0, y:0}, scale:1
                        });
                    }
                    if(soundEnabled && p.weaponType !== 'SAP_PUDDLE') playSound('HIT');
                }
                
                // Penetration Logic
                if (p.weaponType !== 'CROW_AURA' && p.weaponType !== 'BOOMERANG' && p.weaponType !== 'SAP_PUDDLE' && p.weaponType !== 'NUT_STORM' && p.weaponType !== 'LEAF_SWARM') {
                    if (applyDamage) break; 
                }
            }
        }

        if ((didHit && !['CROW_AURA', 'BOOMERANG', 'SAP_PUDDLE', 'NUT_STORM', 'LEAF_SWARM'].includes(p.weaponType || '')) || (p.life <= 0 && p.weaponType !== 'CROW_AURA')) {
             state.projectiles.splice(i, 1);
        }
    }

    // 6. Update Particles
    renderParticles(ctx, state.particles);

    // 6.5 Floating Text
    for (const t of state.texts) {
        ctx.save();
        ctx.fillStyle = t.color || 'white';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(t.text, t.x, t.y);
        ctx.restore();
        
        t.life--;
        t.y += t.velocity.y;
        if (t.life <= 0) {
            state.texts = state.texts.filter(txt => txt.id !== t.id);
        }
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
        
        onLevelUp(choices, (u) => u.apply(state.player, state));
    }

    onStatsUpdate({
        score: state.score,
        kills: state.kills,
        nuts: state.collectedNuts,
        time: state.time,
        wave: state.wave,
        player: state.player,
        extractionTimer: state.phase === 'EXTRACTION' ? state.extractionTimer : undefined
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
        drawDrop(ctx, d, state.time);
    }

    // 4. Z-Sorted Entities (Player, Companions, Enemies, Obstacles, Puddles)
    
    // 4.5 Sap Puddles (Render before entities so they are "under")
    for (const p of state.projectiles) {
        if (p.weaponType === 'SAP_PUDDLE') {
            ctx.save();
            ctx.translate(p.x, p.y);
            drawSapPuddle(ctx, p.radius, state.time);
            ctx.restore();
        }
    }

    const renderList = [
        { type: 'PLAYER', y: state.player.y, data: state.player },
        ...state.companions.map(c => ({ type: 'COMPANION', y: c.y, data: c })),
        ...state.enemies.map(e => ({ type: 'ENEMY', y: e.y, data: e })),
        ...state.obstacles.map(o => ({ type: 'OBSTACLE', y: o.y, data: o }))
    ];
    
    // Sort by Y for depth
    renderList.sort((a, b) => a.y - b.y);

    for (const item of renderList) {
        if (item.type === 'PLAYER') {
            drawProceduralSquirrel(ctx, item.data as Player, state.time);
        } else if (item.type === 'COMPANION') {
            // Draw companion smaller
            ctx.save();
            ctx.scale(0.7, 0.7); // 70% size
            drawProceduralSquirrel(ctx, item.data as Player, state.time);
            ctx.restore();
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

    // 5. Projectiles (Flying)
    for (const p of state.projectiles) {
        if (p.weaponType === 'SAP_PUDDLE') continue; // Rendered below

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation || 0);
        
        if (p.weaponType === 'LEAF_SWARM') {
             // Leaf shape
             ctx.fillStyle = '#68D391';
             ctx.beginPath();
             ctx.ellipse(0, 0, p.radius, p.radius * 0.5, 0, 0, Math.PI * 2);
             ctx.fill();
             ctx.beginPath();
             ctx.moveTo(-p.radius, 0); ctx.lineTo(p.radius, 0);
             ctx.strokeStyle = '#2F855A'; ctx.lineWidth = 1; ctx.stroke();
        } else if (p.weaponType === 'NUT_THROW' || p.weaponType === 'NUT_BARRAGE' || p.weaponType === 'NUT_STORM' || !p.weaponType) {
             const v = p.variant || 0;
             if (v % 3 === 0) {
                 drawAcorn(ctx, p.radius);
             } else if (v % 3 === 1) {
                 drawWalnut(ctx, p.radius);
             } else {
                 drawPeanut(ctx, p.radius);
             }
        } else if (p.weaponType === 'CROW_AURA') {
             drawCrow(ctx, p, state.time);
        } else if (p.weaponType === 'ACORN_CANNON') {
             drawAcorn(ctx, p.radius * 0.7, true); // Bomb acorn, slightly smaller visuals to see field
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
    
    // --- UI OVERLAY RENDER (Joystick) ---
    if (touchRef.current.active && touchRef.current.origin && touchRef.current.current) {
        const { origin, current } = touchRef.current;
        const maxDist = 50;
        
        ctx.save();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.beginPath();
        ctx.arc(origin.x, origin.y, maxDist, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.beginPath();
        const dx = current.x - origin.x;
        const dy = current.y - origin.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        const clamp = Math.min(dist, maxDist);
        const ratio = dist > 0 ? clamp/dist : 0;
        ctx.arc(origin.x + dx * ratio, origin.y + dy * ratio, 20, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    requestRef.current = requestAnimationFrame(gameLoop);
  }, [paused, onGameOver, onLevelUp, onStatsUpdate, soundEnabled, dimensions]); 

  useEffect(() => {
    requestRef.current = requestAnimationFrame(gameLoop);
    return () => {
        if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [gameLoop]);

  return (
    <canvas 
        ref={canvasRef}
        width={dimensions.width * dimensions.dpr} 
        height={dimensions.height * dimensions.dpr} 
        className="block w-full h-full bg-gray-900 touch-none"
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

function drawCrow(ctx: CanvasRenderingContext2D, p: Projectile, time: number) {
    ctx.save();
    ctx.scale(1.5, 1.5); 
    const flap = Math.sin(time * 0.5) * 5;
    ctx.fillStyle = '#1a202c'; 
    ctx.beginPath(); ctx.ellipse(0, 0, 8, 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(5, -10 + flap, 12, -2 + flap/2); ctx.lineTo(5, 0); ctx.fill();
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(5, 10 - flap, 12, 2 - flap/2); ctx.lineTo(5, 0); ctx.fill();
    ctx.beginPath(); ctx.arc(6, 0, 3, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#ECC94B'; ctx.beginPath(); ctx.moveTo(8, -1); ctx.lineTo(12, 0); ctx.lineTo(8, 1); ctx.fill();
    ctx.fillStyle = 'red'; 
    ctx.beginPath(); ctx.arc(7, -1, 1, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(7, 1, 1, 0, Math.PI*2); ctx.fill();
    ctx.restore();
}

function drawDrop(ctx: CanvasRenderingContext2D, d: Drop, time: number) {
    ctx.save();
    ctx.translate(d.x, d.y);
    const bob = Math.sin(time * 0.1) * 3;
    ctx.translate(0, bob);
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(0, 10 - bob, 5, 2, 0, 0, Math.PI*2); ctx.fill();

    if (d.kind === 'XP') {
        ctx.fillStyle = '#4299e1';
        ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(6, 0); ctx.lineTo(0, 8); ctx.lineTo(-6, 0); ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(3, -2); ctx.lineTo(0, 0); ctx.lineTo(-3, -2); ctx.fill();
        if (Math.random() < 0.05) { ctx.fillStyle = 'white'; ctx.fillRect(Math.random()*10-5, Math.random()*10-5, 2, 2); }
    } else if (d.kind === 'GOLD') {
        drawPeanut(ctx, 8); 
    } else if (d.kind === 'HEALTH_PACK') {
        ctx.fillStyle = '#E53E3E'; ctx.fillRect(-6, -6, 12, 12);
        ctx.strokeStyle = '#742A2A'; ctx.strokeRect(-6, -6, 12, 12);
        ctx.fillStyle = 'white'; ctx.fillRect(-2, -4, 4, 8); ctx.fillRect(-4, -2, 8, 4);
    }
    ctx.restore();
}

function drawAcorn(ctx: CanvasRenderingContext2D, radius: number, isBomb = false) {
    const bodyColor = isBomb ? '#3E2723' : '#CD853F';
    const capColor = isBomb ? '#212121' : '#8B4513';
    ctx.fillStyle = bodyColor;
    ctx.beginPath(); ctx.moveTo(-radius*0.7, 0); ctx.bezierCurveTo(-radius*0.7, radius*1.5, radius*0.7, radius*1.5, radius*0.7, 0); ctx.fill();
    ctx.fillStyle = capColor;
    ctx.beginPath(); ctx.arc(0, 0, radius, Math.PI, 0); ctx.lineTo(-radius, 0); ctx.fill();
    ctx.beginPath(); ctx.moveTo(0, -radius); ctx.lineTo(0, -radius - 3); ctx.strokeStyle = '#5D4037'; ctx.lineWidth = 2; ctx.stroke();
    if (!isBomb) {
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        ctx.beginPath(); ctx.ellipse(-radius*0.3, radius*0.5, radius * 0.2, radius * 0.4, -0.2, 0, Math.PI * 2); ctx.fill();
    } else {
        ctx.fillStyle = 'orange'; ctx.beginPath(); ctx.arc(0, -radius - 3, 2, 0, Math.PI*2); ctx.fill();
    }
}

function drawWalnut(ctx: CanvasRenderingContext2D, radius: number) {
    ctx.fillStyle = '#C19A6B'; ctx.beginPath(); ctx.ellipse(0, 0, radius * 0.9, radius, 0, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = '#8D6E63'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(0, -radius); ctx.bezierCurveTo(radius*0.5, -radius*0.5, -radius*0.5, radius*0.5, 0, radius); ctx.stroke();
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(-radius*0.6, -radius*0.3); ctx.quadraticCurveTo(-radius*0.2, 0, -radius*0.6, radius*0.3); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(radius*0.6, -radius*0.3); ctx.quadraticCurveTo(radius*0.2, 0, radius*0.6, radius*0.3); ctx.stroke();
}

function drawPeanut(ctx: CanvasRenderingContext2D, radius: number) {
    ctx.fillStyle = '#E1C699'; 
    ctx.beginPath(); ctx.arc(0, -radius*0.5, radius*0.7, 0, Math.PI*2); ctx.arc(0, radius*0.5, radius*0.7, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = 'rgba(139, 69, 19, 0.3)';
    for(let i=0; i<4; i++) {
        const x = (Math.sin(i * 342) * 0.5) * radius;
        const y = (Math.cos(i * 123) * 0.8) * radius;
        ctx.beginPath(); ctx.arc(x, y, 1.5, 0, Math.PI*2); ctx.fill();
    }
}

function drawSapPuddle(ctx: CanvasRenderingContext2D, radius: number, time: number) {
    ctx.save();
    const wobble = Math.sin(time * 0.1) * 2;
    const r = radius + wobble;
    const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
    grad.addColorStop(0, 'rgba(236, 201, 75, 0.9)'); grad.addColorStop(0.7, 'rgba(214, 158, 46, 0.8)'); grad.addColorStop(1, 'rgba(180, 83, 9, 0.0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    const points = 8;
    for (let i = 0; i <= points; i++) {
        const angle = (i / points) * Math.PI * 2;
        const rad = r + Math.sin(i * 3 + time * 0.1) * (radius * 0.2);
        const x = Math.cos(angle) * rad; const y = Math.sin(angle) * rad;
        if (i===0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath(); ctx.lineJoin = 'round'; ctx.fill();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    for(let j=0; j<3; j++) {
        const t = (time * (0.05 + j*0.01) + j*100);
        const cycle = t % 10; 
        if (cycle < 8) { 
            const bubbleR = (cycle / 8) * (radius * 0.3); 
            const bx = Math.sin(t) * (radius * 0.4); const by = Math.cos(t * 0.7) * (radius * 0.4);
            ctx.beginPath(); ctx.arc(bx, by, bubbleR, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = 'white'; ctx.beginPath(); ctx.arc(bx - bubbleR*0.3, by - bubbleR*0.3, bubbleR*0.2, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        }
    }
    ctx.restore();
}

function drawProceduralObstacle(ctx: CanvasRenderingContext2D, obs: Entity) {
    ctx.save();
    ctx.translate(obs.x, obs.y);
    const variant = obs.variant || 0;
    
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.beginPath();
    ctx.ellipse(0, obs.radius * 0.5, obs.radius * 1.1, obs.radius * 0.4, 0, 0, Math.PI*2);
    ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.ellipse(0, obs.radius * 0.45, obs.radius * 0.8, obs.radius * 0.3, 0, 0, Math.PI*2);
    ctx.fill();

    if (obs.type === 'TREE') {
        const stripId = Math.floor(variant / 100);
        const seed = variant % 100;
        const treeSprite = assets[`TREE_${stripId}`];
        
        let drawn = false;
        
        // Attempt to draw sprite if loaded and valid
        if (treeSprite && treeSprite.complete && treeSprite.naturalWidth > 0) {
            // Assume frames in a horizontal strip
            const frameHeight = treeSprite.naturalHeight;
            const frameWidth = frameHeight; 
            const frameCount = Math.floor(treeSprite.naturalWidth / frameWidth);
            const frameIndex = seed % frameCount;
            
            const sx = frameIndex * frameWidth;
            const sy = 0;
            const drawWidth = obs.radius * 6;
            const drawHeight = drawWidth;
            
            ctx.drawImage(treeSprite, sx, sy, frameWidth, frameHeight, -drawWidth/2, -drawHeight + (obs.radius * 0.8), drawWidth, drawHeight);
            drawn = true;
        }
        
        // Fallback Procedural Tree if sprite failed
        if (!drawn) {
            // Use modulo to map potentially large variant numbers (100+) down to 0-9 range for fallback logic
            const fallbackVariant = variant % 10;
            const trunkColor = fallbackVariant < 5 ? '#5D4037' : '#3E2723';
            const leafColorBase = fallbackVariant < 5 ? '#2F855A' : '#276749';
            const leafColorLight = fallbackVariant < 5 ? '#48BB78' : '#2F855A';
            const leafColorDark = fallbackVariant < 5 ? '#1B4D3E' : '#143628';

            if (fallbackVariant < 5) {
                // OAK
                ctx.fillStyle = trunkColor;
                ctx.beginPath();
                ctx.moveTo(-obs.radius*0.25, -obs.radius*0.8);
                ctx.lineTo(-obs.radius*0.3, obs.radius * 0.4);
                ctx.quadraticCurveTo(-obs.radius*0.5, obs.radius*0.6, -obs.radius*0.6, obs.radius*0.7);
                ctx.lineTo(obs.radius*0.6, obs.radius*0.7);
                ctx.quadraticCurveTo(obs.radius*0.5, obs.radius*0.6, obs.radius*0.3, obs.radius * 0.4);
                ctx.lineTo(obs.radius*0.25, -obs.radius*0.8);
                ctx.fill();
                
                const clusters = [
                    {x: 0, y: -obs.radius * 1.5, r: obs.radius * 0.9},
                    {x: -obs.radius * 0.8, y: -obs.radius * 1.2, r: obs.radius * 0.75},
                    {x: obs.radius * 0.8, y: -obs.radius * 1.2, r: obs.radius * 0.75},
                    {x: -obs.radius * 0.4, y: -obs.radius * 0.8, r: obs.radius * 0.65},
                    {x: obs.radius * 0.4, y: -obs.radius * 0.8, r: obs.radius * 0.65},
                ];
                
                for (const c of clusters) {
                    ctx.fillStyle = leafColorDark;
                    ctx.beginPath(); ctx.arc(c.x, c.y + c.r*0.15, c.r, 0, Math.PI*2); ctx.fill();
                    ctx.fillStyle = leafColorBase;
                    ctx.beginPath(); ctx.arc(c.x, c.y, c.r, 0, Math.PI*2); ctx.fill();
                    ctx.fillStyle = leafColorLight;
                    ctx.beginPath();
                    ctx.ellipse(c.x + c.r*0.2, c.y - c.r*0.2, c.r*0.6, c.r*0.5, 0, 0, Math.PI*2);
                    ctx.fill();
                }
            } else {
                // PINE
                ctx.fillStyle = trunkColor;
                ctx.fillRect(-obs.radius*0.2, -obs.radius*0.5, obs.radius*0.4, obs.radius);
                
                const layers = 4;
                const layerHeight = obs.radius * 1.3;
                
                for(let i=0; i<layers; i++) {
                    const jitter = pseudoRandom(fallbackVariant + i) * 0.2;
                    const width = obs.radius * (1.1 - i*0.25 + jitter);
                    const yBase = -obs.radius*0.2 - (i * layerHeight * 0.5);
                    
                    ctx.fillStyle = 'rgba(0,0,0,0.3)';
                    ctx.beginPath();
                    ctx.moveTo(0, yBase - layerHeight + 5);
                    ctx.lineTo(width, yBase + 5);
                    ctx.lineTo(-width, yBase + 5);
                    ctx.fill();

                    ctx.fillStyle = leafColorBase;
                    ctx.beginPath();
                    ctx.moveTo(0, yBase - layerHeight);
                    ctx.lineTo(width, yBase);
                    ctx.lineTo(0, yBase + width*0.1);
                    ctx.lineTo(-width, yBase);
                    ctx.fill();
                    
                    ctx.fillStyle = 'rgba(0,0,0,0.1)';
                    ctx.beginPath();
                    ctx.moveTo(0, yBase - layerHeight);
                    ctx.lineTo(0, yBase + width*0.1);
                    ctx.lineTo(-width, yBase);
                    ctx.fill();
                }
            }
        }
    } else if (obs.type === 'BUSH') {
        const bushColor = obs.color || '#48BB78';
        const bushShadow = '#2F855A';
        
        const subClumps = 4 + (variant % 3);
        
        ctx.fillStyle = bushShadow;
        ctx.beginPath(); 
        ctx.arc(0, -5, obs.radius * 0.7, 0, Math.PI*2); 
        ctx.fill();

        for(let i=0; i<subClumps; i++) {
            const angle = (i / subClumps) * Math.PI * 2;
            const dist = obs.radius * 0.4;
            const cx = Math.cos(angle)*dist;
            const cy = Math.sin(angle)*dist - 5;
            const cr = obs.radius * 0.5;

            ctx.fillStyle = bushColor;
            ctx.beginPath();
            ctx.arc(cx, cy, cr, 0, Math.PI*2);
            ctx.fill();
            
            ctx.fillStyle = '#68D391';
            ctx.beginPath();
            ctx.arc(cx + cr*0.2, cy - cr*0.2, cr*0.5, 0, Math.PI*2);
            ctx.fill();
        }
        
        if (variant % 3 !== 0) { 
            ctx.fillStyle = variant % 2 === 0 ? '#E53E3E' : '#ECC94B'; 
            const berryCount = 4 + (variant % 4);
            for(let i=0; i<berryCount; i++) {
                const r = pseudoRandom(variant * 10 + i) * obs.radius * 0.7;
                const theta = pseudoRandom(variant * 20 + i) * Math.PI * 2;
                ctx.beginPath(); 
                ctx.arc(Math.cos(theta)*r, Math.sin(theta)*r - 5, 4, 0, Math.PI*2); 
                ctx.fill();
                ctx.fillStyle = 'rgba(255,255,255,0.4)';
                ctx.beginPath(); 
                ctx.arc(Math.cos(theta)*r - 1, Math.sin(theta)*r - 6, 1.5, 0, Math.PI*2); 
                ctx.fill();
                ctx.fillStyle = variant % 2 === 0 ? '#E53E3E' : '#ECC94B'; 
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
        ctx.lineWidth = 2;
        ctx.stroke();
        
        ctx.fillStyle = 'rgba(255,255,255,0.1)';
        ctx.fill();
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
    if (enemy.isBoss) ctx.scale(3, 3);
    else if (enemy.isElite) ctx.scale(1.5, 1.5);
    
    if (enemy.facing === 'LEFT') ctx.scale(-1, 1);
    
    // --- Status Effect Tinting (Procedural Fallback) ---
    const isFrozen = enemy.activeEffects.some(ef => ef.type === 'FREEZE');
    const isBurning = enemy.activeEffects.some(ef => ef.type === 'BURN');
    const isSlowed = enemy.activeEffects.some(ef => ef.type === 'SLOW');

    if (isFrozen) {
        ctx.fillStyle = 'rgba(135, 206, 250, 0.5)'; // Light Blue Overlay
        ctx.beginPath(); ctx.arc(0, -10, 20, 0, Math.PI * 2); ctx.fill();
    } else if (isBurning) {
        ctx.fillStyle = 'rgba(255, 69, 0, 0.3)'; // Orange/Red Overlay
        ctx.beginPath(); ctx.arc(0, -10, 20, 0, Math.PI * 2); ctx.fill();
    }

    const bounce = Math.abs(Math.sin(time * 0.2)) * 3;

    if (enemy.type === 'GOBLIN') {
        ctx.fillStyle = '#2F855A'; ctx.fillRect(-10, -20 - bounce, 20, 20);
        ctx.fillStyle = '#48BB78'; ctx.beginPath(); ctx.arc(0, -25 - bounce, 12, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.moveTo(-10, -25 - bounce); ctx.lineTo(-20, -30 - bounce); ctx.lineTo(-10, -20 - bounce); ctx.fill();
        ctx.fillStyle = 'yellow'; ctx.beginPath(); ctx.arc(4, -25 - bounce, 2, 0, Math.PI*2); ctx.fill();
    } else if (enemy.type === 'GNOME') {
        ctx.fillStyle = '#3182CE'; ctx.fillRect(-8, -18 - bounce, 16, 18);
        ctx.fillStyle = '#F6E05E'; ctx.beginPath(); ctx.arc(0, -24 - bounce, 10, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#E53E3E'; ctx.beginPath(); ctx.moveTo(-12, -28 - bounce); ctx.lineTo(12, -28 - bounce); ctx.lineTo(0, -45 - bounce); ctx.fill();
        ctx.fillStyle = 'white'; ctx.beginPath(); ctx.arc(0, -20 - bounce, 10, 0, Math.PI); ctx.fill();
    } else {
        ctx.fillStyle = '#48BB78'; ctx.beginPath(); ctx.arc(0, -10 - bounce, 11, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#2F855A'; ctx.fillRect(-8, 0 - bounce, 16, 12); ctx.fillStyle = '#48BB78'; ctx.fillRect(5, -5 - bounce, 12, 4);
    }
    ctx.restore();
}
