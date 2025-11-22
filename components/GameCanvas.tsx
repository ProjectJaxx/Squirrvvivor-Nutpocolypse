
import React, { useEffect, useRef } from 'react';
import { 
    GameCanvasProps, GameState, Entity, Player, Enemy, Projectile, 
    ItemDrop, Particle, FloatingText, Obstacle, Upgrade, Vector, Companion 
} from '../types';
import { 
    COLORS, BIOME_CONFIG, 
    INITIAL_GAME_STATE, STAGE_CONFIGS, SPRITE_DEFS, GAME_WIN_TIME
} from '../constants';
import { ALL_UPGRADES } from '../upgrades';
import { playSound, playMusic, stopMusic } from '../services/soundService';
import { assets } from '../services/assetService';
import { Zap, Shield, Crosshair } from 'lucide-react';

const shuffle = <T,>(array: T[]): T[] => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
};

// Improved UI Layout for Mobile Ergonomics
const getUILayout = (width: number, height: number) => {
    const isMobile = width < 768;
    const uiScale = isMobile ? 1.2 : 1.0; 
    
    const safeMarginX = isMobile ? 30 : 20;
    const safeMarginY = isMobile ? 40 : 20; 

    const pauseSize = 40 * uiScale;
    
    // Sprint (Bottom Right - Primary Thumb Action)
    const sprintRadius = isMobile ? 50 : 40;
    const sprintX = width - safeMarginX - sprintRadius;
    const sprintY = height - safeMarginY - sprintRadius;

    // Ability (Left of Sprint - Secondary Action)
    // Offset specifically to follow natural thumb arc
    const abilityRadius = isMobile ? 40 : 32;
    const abilityX = sprintX - (isMobile ? 120 : 100);
    const abilityY = sprintY + (isMobile ? 15 : 0); 

    return {
        isMobile,
        uiScale,
        pause: { x: width - safeMarginX - pauseSize, y: 20 + (isMobile ? 10 : 0), w: pauseSize, h: pauseSize },
        // hitR is larger than visual r to make buttons easier to tap blindly
        sprint: { x: sprintX, y: sprintY, r: sprintRadius, hitR: sprintRadius * 1.6 },
        ability: { x: abilityX, y: abilityY, r: abilityRadius, hitR: abilityRadius * 1.6 }
    };
};

export const GameCanvas: React.FC<GameCanvasProps> = ({
  onGameOver,
  onLevelUp,
  paused,
  character,
  soundEnabled,
  musicEnabled,
  stageDuration,
  onTogglePause
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<GameState>(JSON.parse(JSON.stringify(INITIAL_GAME_STATE)));
  const inputRef = useRef({ up: false, down: false, left: false, right: false, sprint: false, ability: false });
  const bgPatternRef = useRef<CanvasPattern | null>(null);

  // Input & Touch State
  const touchRef = useRef<{
    joyId: number | null;
    sprintId: number | null;
    abilityId: number | null;
    joyStartX: number;
    joyStartY: number;
    joyCurX: number;
    joyCurY: number;
  }>({ joyId: null, sprintId: null, abilityId: null, joyStartX: 0, joyStartY: 0, joyCurX: 0, joyCurY: 0 });

  const requestRef = useRef<number>(0);

  const randomRange = (min: number, max: number) => Math.random() * (max - min) + min;
  
  const triggerShake = (intensity: number, duration: number) => {
      const state = stateRef.current;
      if (state.shake.intensity < intensity || state.shake.duration < 5) {
          state.shake.intensity = intensity;
          state.shake.duration = duration;
      }
  };

  const createGroundPattern = (biome: string, ctx: CanvasRenderingContext2D) => {
      const size = 256;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const tCtx = canvas.getContext('2d');
      if (!tCtx) return null;

      // Base color
      const color = BIOME_CONFIG[biome].bgColor;
      tCtx.fillStyle = color;
      tCtx.fillRect(0, 0, size, size);

      // Add texture
      if (biome === 'PARK') {
          // Grass Blades
          for (let i = 0; i < 600; i++) {
              tCtx.fillStyle = Math.random() > 0.5 ? '#276749' : '#38A169'; // Darker/Lighter green
              const x = Math.random() * size;
              const y = Math.random() * size;
              const w = 2 + Math.random() * 3;
              const h = 3 + Math.random() * 8;
              tCtx.fillRect(x, y, w, h);
          }
          // Flowers
          for (let i = 0; i < 15; i++) {
               tCtx.fillStyle = ['#FAF089', '#F687B3', '#63B3ED', '#FFFFFF'][Math.floor(Math.random()*4)];
               tCtx.beginPath();
               tCtx.arc(Math.random() * size, Math.random() * size, 2 + Math.random() * 2, 0, Math.PI*2);
               tCtx.fill();
          }
      } else if (biome === 'PARKING_LOT') {
          // Asphalt Noise
          for (let i = 0; i < 1000; i++) {
              tCtx.fillStyle = Math.random() > 0.5 ? '#2D3748' : '#718096';
              tCtx.fillRect(Math.random() * size, Math.random() * size, 2, 2);
          }
          // Parking lines snippet
          tCtx.fillStyle = 'rgba(255, 255, 255, 0.1)';
          tCtx.fillRect(0, 100, size, 10);
      } else if (biome === 'MARS') {
          // Craters/Rocks
          for (let i = 0; i < 300; i++) {
              tCtx.fillStyle = Math.random() > 0.5 ? '#9B2C2C' : '#822727';
              const r = Math.random() * 4;
              tCtx.beginPath();
              tCtx.arc(Math.random() * size, Math.random() * size, r, 0, Math.PI*2);
              tCtx.fill();
          }
      }

      return ctx.createPattern(canvas, 'repeat');
  };

  const checkObstacleCollision = (entityX: number, entityY: number, entityRadius: number, obs: Obstacle, padding: number = 0): boolean => {
      if (obs.width && obs.height) {
          const cos = Math.cos(-obs.rotation);
          const sin = Math.sin(-obs.rotation);
          const dx = entityX - obs.x;
          const dy = entityY - obs.y;
          const localX = dx * cos - dy * sin;
          const localY = dx * sin + dy * cos;

          // Expand rectangle by padding
          const halfW = (obs.width / 2) + padding;
          const halfH = (obs.height / 2) + padding;

          const closestX = Math.max(-halfW, Math.min(localX, halfW));
          const closestY = Math.max(-halfH, Math.min(localY, halfH));

          const distLocalX = localX - closestX;
          const distLocalY = localY - closestY;
          
          // Strict check: is the distance from the (possibly expanded) rectangle < entityRadius?
          return (distLocalX * distLocalX + distLocalY * distLocalY) < (entityRadius * entityRadius);
      } else {
          const dist = Math.hypot(entityX - obs.x, entityY - obs.y);
          return dist < entityRadius + obs.radius + padding;
      }
  };

  // Handle Resize and Init
  useEffect(() => {
    const updateSize = () => {
        if (canvasRef.current) {
            canvasRef.current.width = window.innerWidth;
            canvasRef.current.height = window.innerHeight;
        }
    };
    window.addEventListener('resize', updateSize);
    updateSize();

    const state = stateRef.current;
    Object.assign(state, JSON.parse(JSON.stringify(INITIAL_GAME_STATE)));
    
    state.player.characterId = character.id;
    state.player.maxHp = character.hp;
    state.player.hp = character.hp;
    state.player.speed = character.speed;
    state.player.color = character.color;
    state.player.emoji = character.emoji;
    state.player.radius = character.radius;
    state.player.filter = character.filter;
    // Initialize upgraded stats if provided by character prop (from App.tsx calculation)
    if (character.magnetRadius) state.player.magnetRadius = character.magnetRadius;
    if (character.maxCompanions) state.player.maxCompanions = character.maxCompanions;
    
    state.player.airborneTimer = 0;
    
    // Load Active Ability from Character definition
    state.player.activeAbility = character.activeAbility 
      ? JSON.parse(JSON.stringify(character.activeAbility)) 
      : { ...INITIAL_GAME_STATE.player.activeAbility };
    
    // Initialize Companions (Scurry Upgrade)
    if (state.player.maxCompanions && state.player.maxCompanions > 0) {
        for (let i = 0; i < state.player.maxCompanions; i++) {
            state.companions.push({
                id: `comp-${i}`,
                x: state.player.x,
                y: state.player.y,
                radius: 10,
                type: 'COMPANION',
                color: '#F6E05E', // Yellowish
                offsetAngle: (Math.PI * 2 / state.player.maxCompanions) * i,
                cooldown: 60, // Shoot every 1s
                cooldownTimer: Math.random() * 60
            });
        }
    }
    
    state.biome = 'PARK'; 
    const biomeData = BIOME_CONFIG[state.biome];
    state.mapBounds = { 
        minX: -biomeData.bounds, 
        maxX: biomeData.bounds, 
        minY: -biomeData.bounds, 
        maxY: biomeData.bounds 
    };
    
    state.obstacles = [];
    const { minX, maxX, minY, maxY } = state.mapBounds;
    
    // Initialize Background Pattern
    if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
            bgPatternRef.current = createGroundPattern(state.biome, ctx);
        }
    }

    for(let i=0; i<biomeData.obstacleCount; i++) {
        const x = randomRange(minX + 50, maxX - 50); // Keep obstacles away from fence slightly
        const y = randomRange(minY + 50, maxY - 50);
        const id = `obs-${i}`;
        let obs: Obstacle = {
             id, x, y, radius: 30, type: 'OBSTACLE', color: '#fff', hp: 100, maxHp: 100, 
             destructible: false, rotation: Math.random() * 0.2 - 0.1, material: 'WOOD',
             isCover: false, width: undefined, height: undefined
        };

        if (state.biome === 'PARK') {
            if (Math.random() > 0.7) {
                obs = { ...obs, 
                    subtype: 'BENCH', material: 'WOOD', destructible: true, 
                    width: 60, height: 25, color: '#8D6E63', hp: 50, maxHp: 50,
                    isCover: false
                };
            } else {
                obs = { ...obs, 
                    subtype: 'TREE', material: 'WOOD', destructible: false,
                    radius: randomRange(30, 50), color: '#2F855A',
                    isCover: true
                };
            }
        } else if (state.biome === 'PARKING_LOT') {
             const rnd = Math.random();
             if (rnd > 0.7) {
                 const carColors = ['#E53E3E', '#3182CE', '#D69E2E', '#718096', '#A0AEC0'];
                 obs = { ...obs,
                     subtype: 'CAR', material: 'METAL', destructible: false,
                     width: 90, height: 45, color: carColors[Math.floor(Math.random()*carColors.length)],
                     isCover: true, hp: 500, maxHp: 500
                 };
             } else if (rnd > 0.4) {
                 obs = { ...obs,
                     subtype: 'WALL', material: 'STONE', destructible: false,
                     width: 40, height: 40, color: '#A0AEC0', isCover: true
                 };
             } else {
                 obs = { ...obs,
                     subtype: 'PUDDLE', material: 'STONE', destructible: false,
                     radius: randomRange(40, 60), color: '#1A202C', 
                     width: undefined, height: undefined 
                 };
             }
        } else if (state.biome === 'MARS') {
             const rnd = Math.random();
             if (rnd > 0.7) {
                 const isExplosive = Math.random() > 0.8;
                 obs = { ...obs,
                     subtype: 'CRYSTAL', material: 'CRYSTAL', destructible: true,
                     radius: randomRange(20, 40), color: '#D53F8C',
                     hp: 80, maxHp: 80, isCover: true,
                     explosive: isExplosive, explodeRadius: 100, explodeDamage: 50
                 };
             } else {
                 obs = { ...obs,
                     subtype: 'GEYSER', material: 'STONE', destructible: false,
                     radius: 25, color: '#E53E3E',
                     emitType: 'SMOKE'
                 };
             }
        }
        state.obstacles.push(obs);
    }

    if (musicEnabled) playMusic(state.biome);

    return () => {
        window.removeEventListener('resize', updateSize);
        stopMusic();
    }
  }, [character, musicEnabled]);

  useEffect(() => {
      const handleKey = (e: KeyboardEvent, isDown: boolean) => {
          const k = e.key.toLowerCase();
          if (k === 'w' || k === 'arrowup') inputRef.current.up = isDown;
          if (k === 's' || k === 'arrowdown') inputRef.current.down = isDown;
          if (k === 'a' || k === 'arrowleft') inputRef.current.left = isDown;
          if (k === 'd' || k === 'arrowright') inputRef.current.right = isDown;
          if (k === 'shift') inputRef.current.sprint = isDown;
          if (k === ' ') inputRef.current.ability = isDown; 
          if (isDown && k === 'escape') onTogglePause();
      };
      window.addEventListener('keydown', e => handleKey(e, true));
      window.addEventListener('keyup', e => handleKey(e, false));
      
      const canvas = canvasRef.current;
      
      const handleTouchStart = (e: TouchEvent) => {
        e.preventDefault();
        const currentCanvas = canvasRef.current;
        if (!currentCanvas) return;
        
        const { width, height } = currentCanvas;
        const layout = getUILayout(width, height);

        for(let i=0; i<e.changedTouches.length; i++) {
            const t = e.changedTouches[i];
            const tx = t.clientX;
            const ty = t.clientY;
            
            // Priority 1: Pause (Top Right)
            if (tx >= layout.pause.x && tx <= layout.pause.x + layout.pause.w &&
                ty >= layout.pause.y && ty <= layout.pause.y + layout.pause.h) {
                onTogglePause();
                continue;
            }

            // Priority 2: Action Buttons (Sprint & Ability)
            
            // Check Ability First (Secondary action, usually harder to hit)
            const distAbility = Math.hypot(tx - layout.ability.x, ty - layout.ability.y);
            if (distAbility < layout.ability.hitR) {
                touchRef.current.abilityId = t.identifier;
                inputRef.current.ability = true; // Hold to activate
                continue;
            }

            // Check Sprint
            const distSprint = Math.hypot(tx - layout.sprint.x, ty - layout.sprint.y);
            if (distSprint < layout.sprint.hitR) {
                touchRef.current.sprintId = t.identifier;
                continue;
            }

            // Priority 3: Joystick (Left Half of Screen)
            // Only if no other buttons were touched
            if (touchRef.current.joyId === null && tx < width * 0.6) {
                touchRef.current.joyId = t.identifier;
                touchRef.current.joyStartX = tx;
                touchRef.current.joyStartY = ty;
                touchRef.current.joyCurX = tx;
                touchRef.current.joyCurY = ty;
            }
        }
      };

      const handleTouchMove = (e: TouchEvent) => {
        e.preventDefault();
        for(let i=0; i<e.changedTouches.length; i++) {
            const t = e.changedTouches[i];
            if (t.identifier === touchRef.current.joyId) {
                touchRef.current.joyCurX = t.clientX;
                touchRef.current.joyCurY = t.clientY;
            }
        }
      };

      const handleTouchEnd = (e: TouchEvent) => {
        e.preventDefault();
        for(let i=0; i<e.changedTouches.length; i++) {
            const t = e.changedTouches[i];
            if (t.identifier === touchRef.current.joyId) {
                touchRef.current.joyId = null;
            }
            if (t.identifier === touchRef.current.sprintId) {
                touchRef.current.sprintId = null;
            }
            if (t.identifier === touchRef.current.abilityId) {
                touchRef.current.abilityId = null;
                inputRef.current.ability = false; // Release ability
            }
        }
      };

      if (canvas) {
          canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
          canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
          canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
          canvas.addEventListener('touchcancel', handleTouchEnd, { passive: false });
      }

      return () => {
          window.removeEventListener('keydown', e => handleKey(e, true));
          window.removeEventListener('keyup', e => handleKey(e, false));
          if (canvas) {
             canvas.removeEventListener('touchstart', handleTouchStart);
             canvas.removeEventListener('touchmove', handleTouchMove);
             canvas.removeEventListener('touchend', handleTouchEnd);
             canvas.removeEventListener('touchcancel', handleTouchEnd);
          }
      };
  }, [onTogglePause]);

  useEffect(() => {
      const ctx = canvasRef.current?.getContext('2d');
      if (!ctx) return;

      const render = () => {
          const { width, height } = ctx.canvas;
          const layout = getUILayout(width, height);

          if (!paused) {
              const state = stateRef.current;
              state.time++;

              // Check Win Condition
              if (state.time >= GAME_WIN_TIME) {
                  onGameOver(state.score, state.time, state.kills, state.collectedNuts, true);
                  return; // Stop frame
              }

              const p = state.player;
              if (p.invincibleTimer && p.invincibleTimer > 0) p.invincibleTimer--;
              if (p.xpFlashTimer && p.xpFlashTimer > 0) p.xpFlashTimer--;
              if (p.airborneTimer && p.airborneTimer > 0) {
                  p.airborneTimer--;
              } else {
                  p.airborneTimer = 0;
              }

              if (state.shake.duration > 0) {
                  state.shake.duration--;
                  state.shake.intensity *= 0.95; 
                  if (state.shake.duration <= 0) {
                      state.shake.intensity = 0;
                  }
              }

              let dx = 0, dy = 0;
              
              if (inputRef.current.up) dy -= 1;
              if (inputRef.current.down) dy += 1;
              if (inputRef.current.left) dx -= 1;
              if (inputRef.current.right) dx += 1;

              if (touchRef.current.joyId !== null) {
                  const maxDist = 75; // Increased sensitivity range for better analog feel
                  const deadZone = 10; // Prevent drift
                  const jx = touchRef.current.joyCurX - touchRef.current.joyStartX;
                  const jy = touchRef.current.joyCurY - touchRef.current.joyStartY;
                  const dist = Math.hypot(jx, jy);
                  
                  if (dist > deadZone) { 
                      const scale = Math.min(dist, maxDist) / maxDist;
                      dx = (jx / dist) * scale;
                      dy = (jy / dist) * scale;
                  }
              }
              
              const isMoving = dx !== 0 || dy !== 0;

              p.animationState = isMoving ? 'WALKING' : 'IDLE';
              const animDef = SPRITE_DEFS.SQUIRREL.animations[p.animationState];
              p.frameTimer = (p.frameTimer + 1) % animDef.speed;
              if (p.frameTimer === 0) {
                  p.animationFrame = (p.animationFrame + 1) % animDef.frames.length;
              }

              let currentSpeed = p.speed;
              const wantsToSprint = inputRef.current.sprint || touchRef.current.sprintId !== null;
              
              if (p.stamina === undefined) p.stamina = 100;
              if (p.maxStamina === undefined) p.maxStamina = 100;

              if (wantsToSprint && p.stamina > 0 && isMoving) {
                  p.isSprinting = true;
                  currentSpeed *= 1.6; 
                  p.stamina = Math.max(0, p.stamina - 1); 
                  if (state.time % 5 === 0 && !p.airborneTimer) {
                      state.particles.push({
                          id: `dust-${Math.random()}`, x: p.x + (Math.random()-0.5)*10, y: p.y + p.radius, radius: 2,
                          velocity: {x: -dx*2, y: -dy*2}, life: 15, maxLife: 15, scale: randomRange(0.5, 1.5),
                          type: 'SMOKE', color: 'rgba(255,255,255,0.3)'
                      });
                  }
              } else {
                  p.isSprinting = false;
                  if (p.stamina < p.maxStamina) {
                      const regenRate = isMoving ? 0.2 : 0.5;
                      p.stamina = Math.min(p.maxStamina, p.stamina + regenRate);
                  }
              }
              
              if (p.airborneTimer > 0) {
                  currentSpeed *= 1.5;
              }

              if (dx || dy) {
                  const len = Math.hypot(dx, dy);
                  if (len > 1) { dx /= len; dy /= len; }

                  const nextX = p.x + dx * currentSpeed;
                  const nextY = p.y + dy * currentSpeed;
                  
                  const b = state.mapBounds;
                  let canMoveX = nextX >= b.minX + p.radius && nextX <= b.maxX - p.radius;
                  let canMoveY = nextY >= b.minY + p.radius && nextY <= b.maxY - p.radius;

                  if ((canMoveX || canMoveY) && !p.airborneTimer) {
                      for (const obs of state.obstacles) {
                          if (obs.subtype === 'PUDDLE') continue; 
                          if (obs.subtype === 'GEYSER') continue; 

                          if (checkObstacleCollision(nextX, p.y, p.radius, obs)) canMoveX = false;
                          if (checkObstacleCollision(p.x, nextY, p.radius, obs)) canMoveY = false;
                      }
                  }

                  if (canMoveX) p.x += dx * currentSpeed;
                  if (canMoveY) p.y += dy * currentSpeed;
                  
                  p.facing = dx < 0 ? 'LEFT' : dx > 0 ? 'RIGHT' : p.facing;
              }

              // --- COMPANION LOGIC (Scurry Upgrade) ---
              state.companions.forEach((comp, index) => {
                   const angleOffset = (state.time * 0.01) + comp.offsetAngle; 
                   const formationRadius = 45; 
                   const targetX = p.x + Math.cos(angleOffset) * formationRadius;
                   const targetY = p.y + Math.sin(angleOffset) * formationRadius;
                   
                   // Smooth follow
                   comp.x += (targetX - comp.x) * 0.1;
                   comp.y += (targetY - comp.y) * 0.1;

                   // Shooting Logic
                   if (comp.cooldownTimer > 0) comp.cooldownTimer--;
                   else {
                        if (state.enemies.length > 0) {
                            // Find random enemy or closest? Random for chaos
                            const target = state.enemies[Math.floor(Math.random() * state.enemies.length)];
                            const dist = Math.hypot(target.x - comp.x, target.y - comp.y);
                            if (dist < 350) {
                                comp.cooldownTimer = comp.cooldown;
                                const angle = Math.atan2(target.y - comp.y, target.x - comp.x);
                                
                                // "Various sized nutlets"
                                const nutSize = randomRange(2, 6);
                                const dmgMult = nutSize / 3;
                                
                                state.projectiles.push({
                                    id: `c-nut-${state.time}-${Math.random()}`, x: comp.x, y: comp.y, 
                                    radius: nutSize, type: 'NUT_SHELL', color: '#FAF089',
                                    velocity: { x: Math.cos(angle) * 10, y: Math.sin(angle) * 10 },
                                    damage: 8 * dmgMult, duration: 40, pierce: 1, rotation: 0, hitIds: []
                                });
                            }
                        }
                   }
              });

              const ability = p.activeAbility;
              if (ability) {
                  if (ability.activeTimer > 0) {
                      ability.activeTimer--;
                      if (state.time % 5 === 0) {
                          state.particles.push({
                              id: `aura-${Math.random()}`, x: p.x + randomRange(-10, 10), y: p.y + randomRange(-10, 10),
                              radius: randomRange(2, 4), velocity: {x:0, y:-1}, life: 10, maxLife: 10,
                              scale: 1, type: 'SPARK', color: '#F6E05E'
                          });
                      }
                      if (ability.type === 'NUT_BARRAGE') {
                          if (state.time % 3 === 0) { 
                              const baseAngle = p.facing === 'RIGHT' ? 0 : Math.PI;
                              const spread = randomRange(-0.4, 0.4);
                              const angle = baseAngle + spread;
                              state.projectiles.push({
                                  id: `barrage-${state.time}-${Math.random()}`, x: p.x, y: p.y, 
                                  radius: 4, type: 'NUT_SHELL', color: '#F6E05E',
                                  velocity: { x: Math.cos(angle) * 14, y: Math.sin(angle) * 14 }, 
                                  damage: 12, duration: 40, pierce: 2, rotation: 0, hitIds: []
                              });
                              if (soundEnabled && state.time % 6 === 0) playSound('NUT');
                              triggerShake(1.5, 4); 
                          }
                      }
                  } else if (ability.cooldownTimer > 0) {
                      ability.cooldownTimer--;
                  } else if (inputRef.current.ability) {
                      // Auto-activate when held if off cooldown
                      ability.activeTimer = ability.duration;
                      ability.cooldownTimer = ability.cooldown;
                      if (soundEnabled) playSound('LEVELUP'); 
                      state.texts.push({
                          id: `txt-${Math.random()}`, x: p.x, y: p.y - 40, 
                          text: ability.name.toUpperCase() + "!", life: 40, color: '#F6E05E', velocity: {x:0, y:-1}
                      });
                  }
              }

              state.obstacles.forEach(obs => {
                  if (obs.subtype === 'GEYSER' && p.airborneTimer === 0) {
                      if (checkObstacleCollision(p.x, p.y, p.radius, obs)) {
                          p.airborneTimer = 60; 
                          state.particles.push({
                              id: `launch-${Math.random()}`, x: p.x, y: p.y, radius: 20, 
                              velocity: {x:0, y:0}, life: 30, maxLife: 30, scale: 1.5, 
                              type: 'SMOKE', color: 'rgba(255,255,255,0.5)'
                          });
                          playSound('EXPLOSION'); 
                      }
                  }
                  if (obs.subtype === 'GEYSER' && state.time % 10 === 0) {
                      state.particles.push({
                          id: `steam-${Math.random()}`, x: obs.x + (Math.random()-0.5)*10, y: obs.y, 
                          radius: randomRange(2,5), velocity: {x: (Math.random()-0.5), y: -2}, 
                          life: 40, maxLife: 40, scale: 1.2, type: 'SMOKE', color: 'rgba(255,255,255,0.3)'
                      });
                  }
              });

              let isInCover = false;
              if (!p.airborneTimer) {
                  for (const obs of state.obstacles) {
                      if (obs.isCover && checkObstacleCollision(p.x, p.y, p.radius, obs, 15)) {
                          isInCover = true;
                          break;
                      }
                  }
              }

              const waveInfo = STAGE_CONFIGS[stageDuration];
              const currentWave = Math.floor(state.time / (waveInfo.waveDuration * 60)) + 1;
              state.wave = currentWave;
              
              if (state.time % 60 === 0 && state.enemies.length < 50 + (currentWave * 5)) {
                  // New Stealth Spawn Logic
                  const viewW = ctx.canvas.width;
                  const viewH = ctx.canvas.height;
                  const diagonal = Math.hypot(viewW, viewH);
                  const spawnRadius = (diagonal / 2) + 100; // Just outside corners

                  for(let attempt=0; attempt<10; attempt++) {
                      const angle = Math.random() * Math.PI * 2;
                      const spawnX = p.x + Math.cos(angle) * spawnRadius;
                      const spawnY = p.y + Math.sin(angle) * spawnRadius;

                      // Check if inside Map Bounds (Fence)
                      const b = state.mapBounds;
                      if (spawnX >= b.minX + 20 && spawnX <= b.maxX - 20 &&
                          spawnY >= b.minY + 20 && spawnY <= b.maxY - 20) {
                          
                          // Valid Spawn
                          let enemyType = 'ZOMBIE';
                          let enemyHp = 20 + (currentWave * 5);
                          let enemySpeed = 1 + (Math.random() * 1);
                          let enemyRadius = 12;
                          let enemyColor = COLORS.zombie;

                          // Spawn logic based on biome and wave
                          if (state.biome === 'PARKING_LOT' && currentWave >= 3) {
                              if (Math.random() > 0.8) enemyType = 'ROBOT';
                          } else if (state.biome === 'MARS' && currentWave >= 2) {
                              if (Math.random() > 0.7) enemyType = 'ALIEN';
                          }

                          if (enemyType === 'ROBOT') {
                              enemyHp = 40 + (currentWave * 8);
                              enemySpeed = 0.8 + (Math.random() * 0.4);
                              enemyColor = COLORS.robot;
                              enemyRadius = 14;
                          } else if (enemyType === 'ALIEN') {
                              enemyHp = 30 + (currentWave * 6);
                              enemySpeed = 2.0 + (Math.random() * 0.5);
                              enemyColor = COLORS.alien;
                              enemyRadius = 10;
                          } else if (currentWave >= 2 && Math.random() > 0.7) {
                              enemyType = 'SWARM_ZOMBIE';
                              enemyHp = 15 + (currentWave * 2); 
                              enemySpeed = 2.5 + (Math.random() * 0.5); 
                              enemyRadius = 10; 
                              enemyColor = '#9AE6B4'; 
                          }

                          state.enemies.push({
                              id: `e-${state.time}-${Math.random()}`, x: spawnX, y: spawnY,
                              radius: enemyRadius, type: enemyType as any, color: enemyColor, 
                              hp: enemyHp, maxHp: enemyHp,
                              speed: enemySpeed, damage: 5, knockback: {x:0, y:0}, statusEffects: [],
                              animationState: 'WALKING', animationFrame: 0, frameTimer: 0
                          });
                          break; 
                      }
                  }
              }

              // --- ENEMY LOGIC ---
              const enemyCount = state.enemies.length;
              for (let i=0; i<enemyCount; i++) {
                  const e = state.enemies[i];
                  let speedMod = 1;
                  
                  e.statusEffects = e.statusEffects.filter(ef => ef.duration > 0);
                  e.statusEffects.forEach(ef => {
                      ef.duration--;
                      if (ef.type === 'SLOW') speedMod *= (1 - ef.magnitude);
                  });

                  if (state.biome === 'PARKING_LOT') {
                      for(const obs of state.obstacles) {
                          if (obs.subtype === 'PUDDLE' && checkObstacleCollision(e.x, e.y, e.radius, obs)) {
                              if (!e.statusEffects.some(ef => ef.type === 'SLOW')) {
                                  e.statusEffects.push({ type: 'SLOW', duration: 10, magnitude: 0.5 });
                              }
                          }
                      }
                  }

                  let dx = p.x - e.x;
                  let dy = p.y - e.y;
                  
                  let sepX = 0;
                  let sepY = 0;
                  
                  for (let j=0; j<enemyCount; j++) {
                      if (i === j) continue;
                      const other = state.enemies[j];
                      const distSq = (e.x - other.x)**2 + (e.y - other.y)**2;
                      const minDist = e.radius + other.radius;
                      
                      if (distSq < minDist * minDist && distSq > 0) {
                          const dist = Math.sqrt(distSq);
                          const push = (minDist - dist) / minDist; 
                          const pushStr = 0.5; 
                          sepX -= ((other.x - e.x) / dist) * push * pushStr;
                          sepY -= ((other.y - e.y) / dist) * push * pushStr;
                      }
                  }

                  if (e.type === 'SWARM_ZOMBIE') {
                      const distToPlayer = Math.hypot(dx, dy);
                      let moveX = dx / distToPlayer;
                      let moveY = dy / distToPlayer;
                      
                      let cohX = 0, cohY = 0; 
                      let neighborCount = 0;

                      state.enemies.forEach(other => {
                          if (e.id === other.id) return;
                          if (other.type !== 'SWARM_ZOMBIE') return;
                          const dist = Math.hypot(e.x - other.x, e.y - other.y);
                          if (dist < 150) { 
                              cohX += other.x; cohY += other.y; neighborCount++;
                          }
                      });

                      if (neighborCount > 0) {
                          cohX = (cohX / neighborCount) - e.x;
                          cohY = (cohY / neighborCount) - e.y;
                          const cohLen = Math.hypot(cohX, cohY) || 1;
                          cohX /= cohLen; cohY /= cohLen;

                          if (neighborCount > 2) {
                              speedMod *= 1.3; 
                              if (state.time % 20 === 0) {
                                  state.particles.push({
                                      id: `frenzy-${e.id}-${state.time}`, x: e.x, y: e.y - e.radius, radius: 2,
                                      velocity: {x:0, y:-1}, life: 10, maxLife: 10, scale: 1,
                                      type: 'SPARK', color: '#F687B3'
                                  });
                              }
                          }
                      }

                      const finalDx = (moveX * 1.0) + (sepX * 2.0) + (cohX * 0.5);
                      const finalDy = (moveY * 1.0) + (sepY * 2.0) + (cohY * 0.5);
                      const finalLen = Math.hypot(finalDx, finalDy) || 1;
                      e.x += (finalDx / finalLen) * e.speed * speedMod;
                      e.y += (finalDy / finalLen) * e.speed * speedMod;

                  } else {
                      const distToPlayer = Math.hypot(dx, dy);
                      let moveX = dx / distToPlayer;
                      let moveY = dy / distToPlayer;
                      
                      const finalDx = moveX + sepX;
                      const finalDy = moveY + sepY;
                      
                      const angle = Math.atan2(finalDy, finalDx);
                      e.x += Math.cos(angle) * e.speed * speedMod;
                      e.y += Math.sin(angle) * e.speed * speedMod;
                  }
                  
                  const animDef = SPRITE_DEFS[e.type] || SPRITE_DEFS.ZOMBIE;
                  // Fallback to walking animation if current state missing
                  const anim = animDef.animations[e.animationState] || animDef.animations['WALKING'];
                  
                  e.frameTimer = (e.frameTimer + 1) % anim.speed;
                  if (e.frameTimer === 0) {
                      e.animationFrame = (e.animationFrame + 1) % anim.frames.length;
                  }

                  if ((!p.invincibleTimer || p.invincibleTimer <= 0) && !p.airborneTimer) {
                      const hitDist = p.radius + e.radius - 4; 
                      if (Math.hypot(p.x - e.x, p.y - e.y) < hitDist) {
                         let dmg = e.damage;
                         if (isInCover) {
                             dmg = Math.ceil(dmg * 0.5); 
                             state.texts.push({
                                id: `cover-${Math.random()}`, x: p.x, y: p.y - 30, 
                                text: "COVER!", life: 20, color: '#63B3ED', velocity: {x:0, y:-1}
                             });
                         }

                         p.hp -= dmg;
                         p.invincibleTimer = 30; 
                         if (soundEnabled) playSound('HIT');
                         
                         if (e.type.startsWith('BOSS')) {
                            triggerShake(5, 20);
                         } else {
                            triggerShake(1, 10);
                         }
                      }
                  }
              }

              p.weapons.forEach(w => {
                  if (w.cooldownTimer > 0) w.cooldownTimer--;
                  
                  if (w.type === 'NUT_THROW' && w.cooldownTimer <= 0) {
                      const target = state.enemies.length > 0 
                          ? state.enemies.reduce((closest, curr) => {
                              const dist = Math.hypot(curr.x - p.x, curr.y - p.y);
                              return dist < closest.dist ? { enemy: curr, dist } : closest;
                          }, { enemy: state.enemies[0], dist: Infinity }).enemy
                          : null;
                      
                      w.cooldownTimer = w.cooldown;
                      const baseAngle = target ? Math.atan2(target.y - p.y, target.x - p.x) : (p.facing === 'RIGHT' ? 0 : Math.PI);
                      
                      const spread = 0.2; 
                      const totalSpread = spread * (w.amount - 1);
                      const startAngle = baseAngle - totalSpread / 2;

                      for (let i = 0; i < w.amount; i++) {
                          const angle = startAngle + (w.amount > 1 ? i * spread : 0);
                          state.projectiles.push({
                              id: `p-${state.time}-${Math.random()}`, x: p.x, y: p.y, radius: w.area, type: 'NUT_SHELL', color: '#FBD38D',
                              velocity: { x: Math.cos(angle) * w.speed, y: Math.sin(angle) * w.speed },
                              damage: w.damage, duration: 60, pierce: 1, rotation: 0, hitIds: [],
                              explodeRadius: Math.random() > 0.95 ? 50 : 0,
                          });
                      }
                      if (soundEnabled) playSound('NUT');
                  } 
                  else if (w.type === 'CROW_AURA') {
                      if (w.cooldownTimer <= 0) {
                           w.cooldownTimer = w.cooldown;
                           
                           let hit = false;
                           for (let i = 0; i < w.amount; i++) {
                                const angle = (state.time * w.speed) + (i * (Math.PI * 2 / w.amount));
                                const cx = p.x + Math.cos(angle) * w.area;
                                const cy = p.y + Math.sin(angle) * w.area;
                                const crowRadius = 25; 

                                for (const e of state.enemies) {
                                    if (Math.hypot(e.x - cx, e.y - cy) < e.radius + crowRadius) {
                                        e.hp -= w.damage;
                                        state.texts.push({
                                            id: `crow-${Math.random()}`, x: e.x, y: e.y, text: `${Math.round(w.damage)}`,
                                            life: 15, color: '#D53F8C', velocity: {x:0, y:-1}
                                        });
                                        
                                        state.particles.push({
                                            id: `hit-${Math.random()}`, x: cx, y: cy, radius: 2,
                                            velocity: {x:0, y:0}, life: 10, maxLife: 10, scale: 1, type: 'SPARK', 
                                            color: w.damage > 15 ? '#6B46C1' : '#D53F8C' 
                                        });
                                        
                                        const kAngle = Math.atan2(e.y - p.y, e.x - p.x);
                                        e.x += Math.cos(kAngle) * 3;
                                        e.y += Math.sin(kAngle) * 3;

                                        hit = true;
                                    }
                                }
                           }
                           if (soundEnabled && hit) playSound('AURA');
                      }
                  } 
                  else if (w.type === 'ACORN_CANNON' && w.cooldownTimer <= 0) {
                      const target = state.enemies.length > 0 
                          ? state.enemies.reduce((closest, curr) => {
                              const dist = Math.hypot(curr.x - p.x, curr.y - p.y);
                              return dist < closest.dist ? { enemy: curr, dist } : closest;
                          }, { enemy: state.enemies[0], dist: Infinity }).enemy
                          : null;

                       if (target) {
                            w.cooldownTimer = w.cooldown;
                            const angle = Math.atan2(target.y - p.y, target.x - p.x);
                            for (let i = 0; i < w.amount; i++) {
                                const fireAngle = angle + (i - w.amount/2) * 0.1; 
                                state.projectiles.push({
                                    id: `cannon-${state.time}-${Math.random()}`, x: p.x, y: p.y, 
                                    radius: Math.min(20, Math.max(8, w.area / 5)), 
                                    type: 'EXPLODING_ACORN', 
                                    color: '#3E2723',
                                    velocity: { x: Math.cos(fireAngle) * w.speed, y: Math.sin(fireAngle) * w.speed },
                                    damage: w.damage, 
                                    duration: 120, 
                                    pierce: 0, 
                                    rotation: 0, 
                                    explodeRadius: w.area, 
                                    hitIds: []
                                });
                            }
                            if (soundEnabled) playSound('CANNON');
                       }
                  }
              });

              for (let i = state.projectiles.length - 1; i >= 0; i--) {
                  const proj = state.projectiles[i];
                  const speed = Math.hypot(proj.velocity.x, proj.velocity.y);
                  const steps = Math.max(1, Math.ceil(speed / 6)); 
                  const stepX = proj.velocity.x / steps;
                  const stepY = proj.velocity.y / steps;
                  
                  if (proj.type === 'EXPLODING_ACORN' && state.time % 3 === 0) {
                      state.particles.push({
                          id: `trail-${Math.random()}`, x: proj.x, y: proj.y, radius: randomRange(2,4),
                          velocity: {x: randomRange(-0.5,0.5), y: randomRange(-0.5,0.5)},
                          life: 15, maxLife: 15, scale: 0.9, type: 'SMOKE', color: 'rgba(100,100,100,0.5)'
                      });
                  }

                  if (proj.id.startsWith('barrage-') && state.time % 2 === 0) {
                      state.particles.push({
                          id: `trail-${Math.random()}`, x: proj.x, y: proj.y, radius: randomRange(1, 3),
                          velocity: {x: randomRange(-0.5,0.5), y: randomRange(-0.5,0.5)},
                          life: 8, maxLife: 8, scale: 1, type: 'SPARK', color: '#FFFF00'
                      });
                  }

                  let destroyed = false;
                  proj.rotation += 0.2;

                  for (let s = 0; s < steps; s++) {
                      proj.x += stepX;
                      proj.y += stepY;

                      let hitObstacle = false;
                      for (const obs of state.obstacles) {
                          if (obs.subtype === 'PUDDLE' || obs.subtype === 'GEYSER') continue; 
                          if (checkObstacleCollision(proj.x, proj.y, proj.radius, obs)) {
                              hitObstacle = true;
                              
                              state.particles.push({
                                  id: `spark-${Math.random()}`, x: proj.x, y: proj.y, radius: 2,
                                  velocity: {x: -proj.velocity.x * 0.5 + (Math.random()-0.5), y: -proj.velocity.y * 0.5 + (Math.random()-0.5)},
                                  life: 10, maxLife: 10, scale: 1, type: 'SPARK', color: '#FFF'
                              });

                              if (obs.destructible) {
                                  obs.hp -= proj.damage;
                                  state.texts.push({
                                      id: `dmg-${Math.random()}`, x: obs.x, y: obs.y - 20, 
                                      text: `${Math.round(proj.damage)}`, life: 20, color: '#ddd', velocity: {x:0, y:-1}
                                  });
                              }
                              break; 
                          }
                      }

                      if (hitObstacle) {
                          destroyed = true;
                          break; 
                      }
                      
                      if (proj.hostile) {
                         if (!p.airborneTimer && Math.hypot(p.x - proj.x, p.y - proj.y) < p.radius + proj.radius) {
                             if (isInCover && Math.random() > 0.2) {
                                 state.texts.push({
                                    id: `block-${Math.random()}`, x: p.x, y: p.y - 40, 
                                    text: "BLOCKED", life: 20, color: '#63B3ED', velocity: {x:0, y:-1}
                                 });
                                 destroyed = true;
                                 break;
                             } else {
                                 p.hp -= proj.damage;
                                 destroyed = true;
                                 state.texts.push({id: `dmg-${Math.random()}`, x: p.x, y: p.y, text: `-${proj.damage}`, life: 30, color: 'red', velocity: {x:0, y:-1}});
                                 break;
                             }
                         }
                      } else {
                          for (const e of state.enemies) {
                             if (proj.hitIds && proj.hitIds.includes(e.id)) continue;
                             if (Math.hypot(e.x - proj.x, e.y - proj.y) < e.radius + proj.radius) {
                                 e.hp -= proj.damage;
                                 state.texts.push({ id: `txt-${Math.random()}`, x: e.x, y: e.y, text: `${Math.round(proj.damage)}`, life: 30, color: '#fff', velocity: {x:0, y:-1}});
                                 if (!proj.hitIds) proj.hitIds = [];
                                 proj.hitIds.push(e.id);
                                 proj.pierce--;
                                 if (proj.pierce <= 0) { destroyed = true; break; }
                             }
                          }
                      }
                      if (destroyed) break;
                  }
                  
                  proj.duration--;
                  
                  if (destroyed || proj.duration <= 0) {
                      if (proj.explodeRadius && proj.explodeRadius > 0) {
                          state.particles.push({
                              id: `explosion-${Math.random()}`, x: proj.x, y: proj.y, radius: proj.explodeRadius, type: 'EXPLOSION',
                              color: 'rgba(255, 165, 0, 0.8)', life: 15, maxLife: 15, scale: 1, velocity: {x:0, y:0},
                          });
                          
                          for (const e of state.enemies) {
                              if (Math.hypot(e.x - proj.x, e.y - proj.y) < proj.explodeRadius) {
                                  e.hp -= proj.damage; 
                                  const ang = Math.atan2(e.y - proj.y, e.x - proj.x);
                                  e.x += Math.cos(ang) * 10;
                                  e.y += Math.sin(ang) * 10;
                              }
                          }

                          triggerShake(proj.explodeRadius / 4, 25);
                          if (soundEnabled) playSound('EXPLOSION');
                      }
                      state.projectiles.splice(i, 1);
                  }
              }

              for (let i = state.enemies.length - 1; i >= 0; i--) {
                  if (state.enemies[i].hp <= 0) {
                      const e = state.enemies[i];
                      state.kills++;
                      state.score += 10;
                      const xpValue = 15 + (state.wave - 1) * 2;
                      state.drops.push({ id: `drop-${Math.random()}`, x: e.x, y: e.y, radius: 4, type: 'DROP', kind: 'XP', value: xpValue, color: '#4FD1C5'});
                      state.enemies.splice(i, 1);
                      if (soundEnabled) playSound('DEATH');
                  }
              }

              for (let i = state.obstacles.length - 1; i >= 0; i--) {
                  const obs = state.obstacles[i];
                  if (obs.destructible && obs.hp <= 0) {
                       for(let k=0; k<6; k++) {
                          state.particles.push({
                              id: `debris-${Math.random()}`, x: obs.x, y: obs.y, radius: randomRange(2,5),
                              velocity: {x: randomRange(-3,3), y: randomRange(-3,3)},
                              life: 30, maxLife: 30, scale: 1, type: 'SMOKE', color: '#718096'
                          });
                      }
                      state.obstacles.splice(i, 1);
                  }
              }

              for (let i = state.drops.length - 1; i >= 0; i--) {
                  const d = state.drops[i];
                  const dist = Math.hypot(p.x - d.x, p.y - d.y);
                  const pickupRange = p.magnetRadius || 150;

                  if (dist < pickupRange) { 
                      d.x += (p.x - d.x) * 0.15; 
                      d.y += (p.y - d.y) * 0.15; 
                  }

                  if (dist < p.radius + d.radius + (p.airborneTimer ? 20 : 0)) {
                      if (d.kind === 'XP') {
                          state.collectedNuts += Math.ceil(d.value / 10); 
                          p.xp += d.value; 
                          p.xpFlashTimer = 20; 

                          for(let k=0; k<3; k++) {
                              state.particles.push({
                                  id: `xp-pop-${Math.random()}`, 
                                  x: p.x + randomRange(-10, 10), 
                                  y: p.y + randomRange(-10, 10), 
                                  radius: randomRange(2, 3), 
                                  velocity: {
                                      x: 0, 
                                      y: -randomRange(1, 3) 
                                  }, 
                                  life: 30, 
                                  maxLife: 30, 
                                  scale: 1, 
                                  type: 'SPARK', 
                                  color: '#68D391' 
                              });
                          }

                          for(let k=0; k<3; k++) {
                              const angle = Math.random() * Math.PI * 2;
                              const dist = 40;
                              state.particles.push({
                                  id: `xp-in-${Math.random()}`, 
                                  x: p.x + Math.cos(angle) * dist, 
                                  y: p.y + Math.sin(angle) * dist, 
                                  radius: Math.random() * 2 + 1, 
                                  velocity: {
                                      x: -Math.cos(angle) * 3, 
                                      y: -Math.sin(angle) * 3
                                  }, 
                                  life: 15, 
                                  maxLife: 15, 
                                  scale: 1, 
                                  type: 'SPARK', 
                                  color: '#4FD1C5'
                              });
                          }

                          if (p.xp >= p.nextLevelXp) {
                              p.level++; p.xp -= p.nextLevelXp; p.nextLevelXp = Math.floor(p.nextLevelXp * 1.5);
                              if (soundEnabled) playSound('LEVELUP');
                              
                              const shuffled = shuffle(ALL_UPGRADES);
                              const offeredUpgrades = shuffled.slice(0, 3);
                              
                              onLevelUp(offeredUpgrades, (u) => u.apply(p));
                          }
                      }
                      if (soundEnabled) playSound('COLLECT');
                      state.drops.splice(i, 1);
                  }
              }

              for (let i = state.particles.length - 1; i >= 0; i--) {
                const pt = state.particles[i]; pt.x += pt.velocity.x; pt.y += pt.velocity.y; pt.life--;
                if (pt.life <= 0) state.particles.splice(i, 1);
              }
              for (let i = state.texts.length - 1; i >= 0; i--) {
                  state.texts[i].x += state.texts[i].velocity.x; state.texts[i].y += state.texts[i].velocity.y; state.texts[i].life--;
                  if (state.texts[i].life <= 0) state.texts.splice(i, 1);
              }

              if (p.hp <= 0) onGameOver(state.score, state.time, state.kills, state.collectedNuts, false);
          }

          const state = stateRef.current;
          
          // DRAW BACKGROUND PATTERN
          let camX = state.player.x - width / 2;
          let camY = state.player.y - height / 2;

          if (state.shake.duration > 0 && state.shake.intensity > 0.1) {
              camX += (Math.random() - 0.5) * state.shake.intensity * 2;
              camY += (Math.random() - 0.5) * state.shake.intensity * 2;
          }

          if (bgPatternRef.current) {
              ctx.save();
              const matrix = new DOMMatrix();
              matrix.translateSelf(-camX, -camY);
              bgPatternRef.current.setTransform(matrix);
              
              ctx.fillStyle = bgPatternRef.current;
              ctx.fillRect(0, 0, width, height);
              ctx.restore();
          } else {
              ctx.fillStyle = BIOME_CONFIG[state.biome].bgColor;
              ctx.fillRect(0, 0, width, height);
          }

          ctx.imageSmoothingEnabled = false; 

          // DRAW GRID
          ctx.strokeStyle = 'rgba(255,255,255,0.03)'; ctx.lineWidth = 1;
          const gridSize = 100;
          const startX = Math.floor(camX / gridSize) * gridSize;
          const startY = Math.floor(camY / gridSize) * gridSize;
          for(let x = startX; x < camX + width; x += gridSize) { ctx.beginPath(); ctx.moveTo(x - camX, 0); ctx.lineTo(x - camX, height); ctx.stroke(); }
          for(let y = startY; y < camY + height; y += gridSize) { ctx.beginPath(); ctx.moveTo(0, y - camY); ctx.lineTo(width, y - camY); ctx.stroke(); }

          // DRAW FENCE
          const bounds = state.mapBounds;
          const fenceSize = 40;
          ctx.font = `${fenceSize}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';

          const drawFenceLine = (x1: number, y1: number, x2: number, y2: number) => {
              const dist = Math.hypot(x2 - x1, y2 - y1);
              const count = Math.ceil(dist / fenceSize);
              for(let i=0; i<=count; i++) {
                  const fx = x1 + (x2 - x1) * (i/count);
                  const fy = y1 + (y2 - y1) * (i/count);
                  if (fx < camX - fenceSize || fx > camX + width + fenceSize || fy < camY - fenceSize || fy > camY + height + fenceSize) continue;
                  ctx.fillText('🧱', fx - camX, fy - camY);
              }
          };

          drawFenceLine(bounds.minX, bounds.minY, bounds.maxX, bounds.minY); 
          drawFenceLine(bounds.minX, bounds.maxY, bounds.maxX, bounds.maxY); 
          drawFenceLine(bounds.minX, bounds.minY, bounds.minX, bounds.maxY); 
          drawFenceLine(bounds.maxX, bounds.minY, bounds.maxX, bounds.maxY); 

          const drawEntity = (e: Entity) => {
             if (e.type === 'EXPLOSION') {
                const explosion = e as Particle;
                const progress = (explosion.maxLife - explosion.life) / explosion.maxLife; 
                ctx.save();
                ctx.globalAlpha = 1 - progress;
                ctx.beginPath();
                ctx.arc(e.x - camX, e.y - camY, e.radius * progress, 0, Math.PI * 2);
                const gradient = ctx.createRadialGradient(e.x - camX, e.y - camY, 0, e.x - camX, e.y - camY, e.radius * progress);
                gradient.addColorStop(0, 'white'); gradient.addColorStop(0.5, 'yellow'); gradient.addColorStop(1, 'rgba(255, 100, 0, 0)');
                ctx.fillStyle = gradient;
                ctx.fill();
                ctx.restore();
                return;
             }
             
             if (e.x + e.radius < camX || e.x - e.radius > camX + width || e.y + e.radius < camY || e.y - e.radius > camY + height) return;

             let visualY = e.y;
             let shadowScale = 1.0;
             if (e.type === 'PLAYER') {
                 const p = e as Player;
                 if (p.airborneTimer && p.airborneTimer > 0) {
                     const progress = p.airborneTimer / 60; 
                     const jumpHeight = Math.sin(progress * Math.PI) * 60; 
                     visualY -= jumpHeight;
                     shadowScale = 0.5 + (0.5 * (1 - Math.sin(progress * Math.PI)));
                 }
             }

             ctx.save();
             ctx.translate(e.x - camX, visualY - camY);
             
             ctx.save();
             ctx.translate(0, e.y - visualY); 
             ctx.fillStyle = 'rgba(0,0,0,0.3)';
             ctx.beginPath();
             ctx.ellipse(0, e.radius * 0.8, e.radius * shadowScale, e.radius * 0.3 * shadowScale, 0, 0, Math.PI*2);
             ctx.fill();
             ctx.restore();

             if (e.type === 'PLAYER') {
                 const p = e as Player;
                 if (p.invincibleTimer && p.invincibleTimer > 0 && state.time % 8 < 4) ctx.globalAlpha = 0.5;
                 
                 if (p.xpFlashTimer && p.xpFlashTimer > 0) { 
                    ctx.shadowColor = '#4FD1C5'; 
                    ctx.shadowBlur = 30 * (p.xpFlashTimer / 20); 
                    const pulse = 1 + (p.xpFlashTimer / 20) * 0.2;
                    ctx.scale(pulse, pulse);
                    ctx.filter = `brightness(${1 + (p.xpFlashTimer/20)}) sepia(${p.xpFlashTimer/40})`;
                 }
                 
                 if (p.activeAbility && p.activeAbility.activeTimer > 0) {
                    ctx.beginPath();
                    ctx.arc(0, 0, p.radius + 12, 0, Math.PI * 2);
                    ctx.fillStyle = 'rgba(246, 224, 94, 0.3)';
                    ctx.fill();
                    ctx.strokeStyle = '#F6E05E';
                    ctx.lineWidth = 2;
                    ctx.stroke();
                 }

                 const isInCover = !p.airborneTimer && state.obstacles.some(obs => obs.isCover && checkObstacleCollision(p.x, p.y, p.radius, obs, 15));
                 if (isInCover) {
                     ctx.beginPath();
                     ctx.arc(0, 0, p.radius + 8, 0, Math.PI * 2);
                     ctx.strokeStyle = 'rgba(66, 153, 225, 0.6)'; 
                     ctx.lineWidth = 3;
                     ctx.stroke();
                     ctx.fillStyle = '#4299E1';
                     ctx.font = '16px monospace';
                     ctx.fillText('🛡️', -10, -30);
                 }
             }
             
             ctx.fillStyle = e.color;
             ctx.strokeStyle = '#1a202c'; 
             ctx.lineWidth = 2.5;

             const drawEmoji = (emoji: string, sizeMultiplier = 2, rotate = 0, bounce = 0) => {
                ctx.font = `${e.radius * sizeMultiplier}px sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.rotate(rotate);
                ctx.translate(0, -bounce);
                ctx.fillText(emoji, 0, 0);
             };

             switch (e.type) {
                case 'PLAYER': {
                    const p = e as Player;
                    const sheet = assets.PLAYER_SKIN;
                    const def = SPRITE_DEFS.SQUIRREL;
                    const scaleFactor = (p.radius * 2.4) / def.frameWidth; 

                    if (sheet) {
                      const anim = def.animations[p.animationState];
                      const safeFrameIndex = p.animationFrame % anim.frames.length;
                      const actualFrameIndex = anim.frames[safeFrameIndex];
                      
                      const col = actualFrameIndex % def.columns;
                      const row = Math.floor(actualFrameIndex / def.columns);
                      const sx = col * def.frameWidth;
                      const sy = row * def.frameHeight;

                      ctx.save();
                      if (p.facing === 'LEFT') ctx.scale(-1, 1);
                      if (p.airborneTimer && p.airborneTimer > 0) ctx.scale(1.2, 1.2);
                      const drawW = def.frameWidth * scaleFactor;
                      const drawH = def.frameHeight * scaleFactor;
                      ctx.drawImage(sheet, sx, sy, def.frameWidth, def.frameHeight, -drawW / 2, -drawH / 2, drawW, drawH);
                      ctx.restore();
                    } else {
                        const bounce = p.animationState === 'WALKING' ? Math.abs(Math.sin(state.time * 0.3)) * 4 : 0;
                        ctx.save();
                        if (p.facing === 'LEFT') ctx.scale(-1, 1);
                        if (p.filter && p.xpFlashTimer === 0) ctx.filter = p.filter; 
                        drawEmoji(p.emoji || '🐿️', 2.2, 0, bounce);
                        ctx.restore();
                    }
                    break;
                }
                case 'COMPANION': {
                    const sheet = assets.PLAYER_SKIN;
                    const def = SPRITE_DEFS.SQUIRREL;
                    if (sheet) {
                         const frameIndex = Math.floor(state.time / 5) % 2 + 1; 
                         const col = frameIndex % def.columns;
                         const row = Math.floor(frameIndex / def.columns);
                         const sx = col * def.frameWidth;
                         const sy = row * def.frameHeight;
                         const scaleFactor = (e.radius * 2.4) / def.frameWidth;
                         const drawW = def.frameWidth * scaleFactor;
                         const drawH = def.frameHeight * scaleFactor;
                         ctx.save();
                         if (state.player.x < e.x) ctx.scale(-1, 1);
                         ctx.drawImage(sheet, sx, sy, def.frameWidth, def.frameHeight, -drawW / 2, -drawH / 2, drawW, drawH);
                         ctx.restore();
                    } else {
                        const bounce = Math.abs(Math.sin(state.time * 0.3 + parseFloat(e.id.split('-')[1]))) * 3;
                        ctx.save();
                        if (state.player.x < e.x) ctx.scale(-1, 1);
                        drawEmoji('🐿️', 2.0, 0, bounce);
                        ctx.restore();
                    }
                    break;
                }
                case 'SWARM_ZOMBIE': 
                case 'ZOMBIE': 
                case 'ROBOT':
                case 'ALIEN': {
                    const enemy = e as Enemy;
                    const def = SPRITE_DEFS[enemy.type] || SPRITE_DEFS['ZOMBIE'];
                    // Fallback to Zombie asset if specific type is missing to prevent invisible enemies
                    const sheet = assets[enemy.type] || assets['ZOMBIE'];
                    
                    if (sheet && SPRITE_DEFS[enemy.type]) {
                        const anim = def.animations[enemy.animationState] || def.animations['WALKING'];
                        const safeFrameIndex = enemy.animationFrame % anim.frames.length;
                        const actualFrameIndex = anim.frames[safeFrameIndex];
                        
                        const col = actualFrameIndex % def.columns;
                        const row = Math.floor(actualFrameIndex / def.columns);
                        const sx = col * def.frameWidth;
                        const sy = row * def.frameHeight;

                        ctx.save();
                        if (enemy.x < state.player.x) ctx.scale(-1, 1);
                        
                        // Calculate draw size to match hit radius, but allow for some sprite overflow
                        const drawSize = enemy.radius * 2.8; 
                        const offset = drawSize / 2;
                        
                        ctx.drawImage(sheet, sx, sy, def.frameWidth, def.frameHeight, -offset, -offset, drawSize, drawSize);
                        ctx.restore();
                    } else {
                        const bounce = enemy.animationState === 'WALKING' ? Math.abs(Math.sin(state.time * 0.2 + parseFloat(enemy.id.split('-')[2] || '0'))) * 3 : 0;
                        const wiggle = Math.sin(state.time * 0.1 + parseFloat(enemy.id.split('-')[2] || '0')) * 0.1;
                        let emoji = '🧟';
                        if (enemy.type === 'SWARM_ZOMBIE') emoji = '🐀';
                        if (enemy.type === 'ROBOT') emoji = '🤖';
                        if (enemy.type === 'ALIEN') emoji = '👽';
                        ctx.save();
                        if (enemy.x < state.player.x) ctx.scale(-1, 1); 
                        drawEmoji(emoji, 2.2, wiggle, bounce);
                        ctx.restore();
                    }
                    break;
                }
                case 'NUT_SHELL': drawEmoji('🌰', 2, (e as Projectile).rotation); break; 
                case 'EXPLODING_ACORN': drawEmoji('🥥', 2, (e as Projectile).rotation); break;
                case 'OBSTACLE':
                    const obs = e as Obstacle;
                    if (obs.subtype === 'BENCH') drawEmoji('🪑', 1.5);
                    else if (obs.subtype === 'CAR') drawEmoji('🚗', 2.5);
                    else if (obs.subtype === 'CRYSTAL') drawEmoji('💎', 1.8);
                    else if (obs.subtype === 'TREE') drawEmoji('🌲', 3);
                    else if (obs.subtype === 'PUDDLE') drawEmoji('💧', 2);
                    else if (obs.subtype === 'GEYSER') drawEmoji('🌋', 2);
                    else if (obs.subtype === 'WALL') drawEmoji('🧱', 1.5);
                    else drawEmoji('🪨', 2);
                    
                    if (obs.destructible && obs.hp < obs.maxHp) {
                        const w = 40; const h = 4; const hpPct = obs.hp / obs.maxHp;
                        ctx.fillStyle = '#333'; ctx.fillRect(-w/2, -obs.radius - 10, w, h);
                        ctx.fillStyle = hpPct > 0.5 ? '#48BB78' : '#F56565'; ctx.fillRect(-w/2, -obs.radius - 10, w * hpPct, h);
                    }
                    break;
                case 'DROP': drawEmoji('💎', 1.5, Math.sin(state.time * 0.1) * 0.2); break;
                default: ctx.beginPath(); ctx.arc(0, 0, e.radius, 0, Math.PI * 2); ctx.fill(); break;
             }
             ctx.restore();
          };
          
          const entities = [...state.obstacles, ...state.drops, ...state.enemies, state.player, ...state.companions, ...state.projectiles, ...state.particles].sort((a,b) => a.y - b.y);
          entities.forEach(e => drawEntity(e));

          state.player.weapons.forEach(w => {
            if (w.type === 'CROW_AURA') {
                for (let i = 0; i < w.amount; i++) {
                    const angle = (state.time * w.speed) + (i * (Math.PI * 2 / w.amount));
                    const cx = state.player.x + Math.cos(angle) * w.area;
                    const cy = state.player.y + Math.sin(angle) * w.area;
                    const drawX = cx - camX; const drawY = cy - camY;
                    if (drawX < -50 || drawX > width + 50 || drawY < -50 || drawY > height + 50) continue;
                    ctx.save();
                    ctx.translate(drawX, drawY);
                    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(0, 10, 10, 5, 0, 0, Math.PI*2); ctx.fill();
                    ctx.font = '28px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                    if (cx < state.player.x) ctx.scale(-1, 1); 
                    const wiggle = Math.sin(state.time * 0.3 + i) * 0.2;
                    ctx.rotate(wiggle);
                    if (w.damage > 15) {
                        ctx.filter = 'hue-rotate(260deg) saturate(200%) brightness(0.7)';
                        ctx.shadowColor = '#6B46C1'; ctx.shadowBlur = 10;
                    }
                    ctx.fillText('🐦‍⬛', 0, 0);
                    if (!paused && state.time % 4 === 0) {
                        state.particles.push({
                            id: `crow-trail-${i}-${state.time}`, x: cx, y: cy, radius: 2, velocity: {x:0, y:0},
                            life: 10, maxLife: 10, scale: 0.8, type: 'SMOKE', 
                            color: w.damage > 15 ? 'rgba(107, 70, 193, 0.4)' : 'rgba(0,0,0,0.2)'
                        });
                    }
                    ctx.restore();
                }
            }
          });

          state.texts.forEach(t => {
              ctx.font = 'bold 14px monospace'; ctx.fillStyle = t.color; ctx.strokeStyle = 'black'; ctx.lineWidth = 2;
              ctx.strokeText(t.text, t.x - camX, t.y - camY); ctx.fillText(t.text, t.x - camX, t.y - camY);
          });


          // --- UI LAYER ---
          // Use centralized layout for rendering
          
          // Draw Joystick
          if (touchRef.current.joyId !== null) {
              const { joyStartX, joyStartY, joyCurX, joyCurY } = touchRef.current;
              ctx.save();
              ctx.globalAlpha = 0.6;
              
              // Joystick Base
              ctx.beginPath(); ctx.arc(joyStartX, joyStartY, 60 * layout.uiScale, 0, Math.PI * 2);
              const grad = ctx.createRadialGradient(joyStartX, joyStartY, 10, joyStartX, joyStartY, 60 * layout.uiScale);
              grad.addColorStop(0, 'rgba(255, 255, 255, 0.1)');
              grad.addColorStop(1, 'rgba(255, 255, 255, 0.3)');
              ctx.fillStyle = grad; ctx.fill();
              ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 2; ctx.stroke();
              
              // Joystick Knob
              ctx.beginPath(); ctx.arc(joyCurX, joyCurY, 30 * layout.uiScale, 0, Math.PI * 2);
              ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'; ctx.fill();
              ctx.shadowColor = 'rgba(0,0,0,0.3)'; ctx.shadowBlur = 5;
              ctx.restore();
          }

          // Draw Sprint Button
          const sprintBtn = layout.sprint;
          const isSprinting = touchRef.current.sprintId !== null;
          ctx.save();
          ctx.translate(sprintBtn.x, sprintBtn.y);
          if (isSprinting) ctx.scale(0.95, 0.95);
          
          ctx.beginPath(); ctx.arc(0, 0, sprintBtn.r, 0, Math.PI * 2);
          ctx.fillStyle = isSprinting ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.2)'; ctx.fill();
          ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 3; ctx.stroke();
          
          ctx.fillStyle = 'white'; ctx.font = `bold ${14 * layout.uiScale}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText('RUN', 0, 0);
          ctx.restore();

          // Draw Ability Button
          const abilityBtn = layout.ability;
          const ability = state.player.activeAbility;
          if (ability) {
              const cooldownPct = ability.cooldownTimer / ability.cooldown;
              const isPressed = touchRef.current.abilityId !== null || inputRef.current.ability;
              
              ctx.save();
              ctx.translate(abilityBtn.x, abilityBtn.y);
              // Press effect: Shrink slightly
              if (isPressed) ctx.scale(0.9, 0.9);
              
              ctx.beginPath(); ctx.arc(0, 0, abilityBtn.r, 0, Math.PI * 2);
              ctx.fillStyle = cooldownPct > 0 ? 'rgba(0,0,0,0.5)' : 'rgba(246, 224, 94, 0.4)'; 
              if (isPressed && cooldownPct <= 0) ctx.fillStyle = 'rgba(255,255,255,0.6)'; 
              ctx.fill();
              ctx.strokeStyle = cooldownPct > 0 ? '#555' : '#F6E05E'; ctx.lineWidth = 3; ctx.stroke();

              ctx.fillStyle = 'white'; ctx.font = `${20 * layout.uiScale}px sans-serif`;
              ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
              ctx.fillText('🌰', 0, 0);

              if (cooldownPct > 0) {
                ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
                ctx.beginPath(); ctx.moveTo(0, 0);
                ctx.arc(0, 0, abilityBtn.r, -Math.PI/2, -Math.PI/2 + (Math.PI * 2 * cooldownPct));
                ctx.lineTo(0, 0); ctx.fill();
              } else if (ability.activeTimer > 0) {
                const activePct = ability.activeTimer / ability.duration;
                ctx.beginPath();
                ctx.arc(0, 0, abilityBtn.r + 4, -Math.PI/2, -Math.PI/2 + (Math.PI * 2 * activePct));
                ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 3; ctx.stroke();
                
                if (state.time % 10 < 5) {
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)'; ctx.fill();
                }
              }
              
              if (!layout.isMobile) {
                  ctx.font = 'bold 10px sans-serif';
                  ctx.fillStyle = '#ccc';
                  ctx.fillText('SPACE', 0, abilityBtn.r + 15);
              }
              ctx.restore();
          }

          // Draw Pause Button
          const pauseBtn = layout.pause;
          ctx.fillStyle = 'rgba(255,255,255,0.2)';
          ctx.beginPath();
          ctx.roundRect(pauseBtn.x, pauseBtn.y, pauseBtn.w, pauseBtn.h, 8);
          ctx.fill();
          ctx.fillStyle = 'white';
          const barW = 5 * layout.uiScale;
          const barH = 18 * layout.uiScale;
          // Center bars in button
          const barOffsetX = (pauseBtn.w - (barW * 2 + 6)) / 2;
          const barOffsetY = (pauseBtn.h - barH) / 2;
          
          ctx.fillRect(pauseBtn.x + barOffsetX, pauseBtn.y + barOffsetY, barW, barH);
          ctx.fillRect(pauseBtn.x + barOffsetX + barW + 6, pauseBtn.y + barOffsetY, barW, barH);


          // HUD
          const padding = 20;
          const barWidth = layout.isMobile ? 140 : 200;
          const barHeight = layout.isMobile ? 12 : 16;
          
          ctx.fillStyle = 'white'; ctx.font = `bold ${20 * layout.uiScale}px monospace`; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
          ctx.fillText(`SCORE: ${state.score}`, padding, padding);
          
          const hpY = padding + (30 * layout.uiScale);
          ctx.fillStyle = '#333'; ctx.fillRect(padding, hpY, barWidth, barHeight); ctx.fillStyle = '#E53E3E';
          const hpRatio = Math.max(0, state.player.hp) / state.player.maxHp; ctx.fillRect(padding, hpY, barWidth * hpRatio, barHeight);
          ctx.fillStyle = 'white'; ctx.font = `bold ${10 * layout.uiScale}px monospace`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(`${Math.ceil(state.player.hp)}/${state.player.maxHp}`, padding + barWidth/2, hpY + barHeight/2);
          
          const xpY = hpY + barHeight + 8;
          ctx.fillStyle = '#333'; ctx.fillRect(padding, xpY, barWidth, 8 * layout.uiScale); ctx.fillStyle = '#38B2AC';
          const xpRatio = state.player.xp / state.player.nextLevelXp; ctx.fillRect(padding, xpY, barWidth * xpRatio, 8 * layout.uiScale);
          ctx.textAlign = 'left'; ctx.font = `bold ${12 * layout.uiScale}px monospace`; ctx.fillStyle = '#38B2AC';
          ctx.fillText(`LVL ${state.player.level}`, padding, xpY + (14 * layout.uiScale));
          
          const stY = xpY + (20 * layout.uiScale);
          ctx.fillStyle = '#333'; ctx.fillRect(padding, stY, barWidth * 0.7, 6 * layout.uiScale); ctx.fillStyle = '#F6E05E';
          const stRatio = Math.max(0, state.player.stamina) / state.player.maxStamina; ctx.fillRect(padding, stY, (barWidth * 0.7) * stRatio, 6 * layout.uiScale);
          ctx.fillStyle = '#F6E05E'; ctx.font = `bold ${10 * layout.uiScale}px monospace`;
          ctx.fillText(`STM`, padding + (barWidth * 0.7) + 5, stY + (6 * layout.uiScale));
          
          // Time & Nuts
          ctx.textAlign = 'center'; ctx.fillStyle = 'white'; ctx.font = `bold ${24 * layout.uiScale}px monospace`;
          const remainingFrames = Math.max(0, GAME_WIN_TIME - state.time);
          const mins = Math.floor(remainingFrames / 3600); const secs = Math.floor((remainingFrames % 3600) / 60);
          ctx.fillText(`${mins.toString().padStart(2,'0')}:${secs.toString().padStart(2,'0')}`, width / 2, padding);

          ctx.font = `bold ${16 * layout.uiScale}px monospace`; ctx.fillStyle = '#F6E05E';
          ctx.fillText(`🥜 ${state.collectedNuts}`, width / 2, padding + (30 * layout.uiScale));

          requestRef.current = requestAnimationFrame(render);
      };

      requestRef.current = requestAnimationFrame(render);
      return () => cancelAnimationFrame(requestRef.current!);
  }, [paused, soundEnabled, stageDuration, onGameOver, onLevelUp, musicEnabled, onTogglePause]);

  return <canvas ref={canvasRef} className="block bg-gray-900 touch-none w-full h-full" />;
};
