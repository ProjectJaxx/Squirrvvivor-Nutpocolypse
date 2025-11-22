
import React, { useEffect, useRef } from 'react';
import { 
    GameCanvasProps, GameState, Entity, Player, Enemy, Projectile, 
    ItemDrop, Particle, FloatingText, Obstacle, Vector, Companion 
} from '../types';
import { 
    COLORS, BIOME_CONFIG, 
    INITIAL_GAME_STATE, STAGE_CONFIGS, GAME_WIN_TIME
} from '../constants';
import { ALL_UPGRADES } from '../upgrades';
import { playSound, playMusic, stopMusic } from '../services/soundService';
import { Zap } from 'lucide-react';

const shuffle = <T,>(array: T[]): T[] => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
};

const getUILayout = (width: number, height: number) => {
    const isMobile = width < 768;
    const uiScale = isMobile ? 1.4 : 1.0; 
    
    const safeMarginX = 20;
    const safeMarginY = 20; 

    const pauseSize = 40 * uiScale;
    
    // Sprint Button (Main Action - Bottom Right)
    const sprintRadius = isMobile ? 60 : 40;
    const sprintX = width - safeMarginX - sprintRadius;
    const sprintY = height - safeMarginY - sprintRadius - (isMobile ? 20 : 0);

    // Ability Button (Secondary Action - To the left of Sprint in an arc)
    const abilityRadius = isMobile ? 50 : 32;
    const abilityX = sprintX - (isMobile ? 110 : 90);
    const abilityY = sprintY + (isMobile ? 20 : 10); 

    return {
        isMobile,
        uiScale,
        pause: { x: width - safeMarginX - pauseSize, y: safeMarginY, w: pauseSize, h: pauseSize },
        sprint: { x: sprintX, y: sprintY, r: sprintRadius, hitR: sprintRadius * 1.3 },
        ability: { x: abilityX, y: abilityY, r: abilityRadius, hitR: abilityRadius * 1.3 }
    };
};

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
  onTogglePause
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<GameState>(JSON.parse(JSON.stringify(INITIAL_GAME_STATE)));
  const inputRef = useRef({ up: false, down: false, left: false, right: false, sprint: false, ability: false });
  const bgPatternRef = useRef<CanvasPattern | null>(null);
  
  // Prevent multiple triggers
  const isLevelingUpRef = useRef(false);

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
      const size = 512;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const tCtx = canvas.getContext('2d');
      if (!tCtx) return null;

      const random = (min: number, max: number) => Math.random() * (max - min) + min;

      const color = BIOME_CONFIG[biome]?.bgColor || COLORS.parkBg;
      tCtx.fillStyle = color;
      tCtx.fillRect(0, 0, size, size);

      if (biome === 'PARK') {
          // Grass Noise
          for (let i = 0; i < 5000; i++) {
              tCtx.fillStyle = Math.random() > 0.5 ? '#276749' : '#38A169'; 
              tCtx.fillRect(random(0, size), random(0, size), 2, 2);
          }
          // Grass Blades
          tCtx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
          tCtx.lineWidth = 1;
          for (let i = 0; i < 400; i++) {
               const x = random(0, size);
               const y = random(0, size);
               tCtx.beginPath();
               tCtx.moveTo(x, y);
               tCtx.lineTo(x + random(-2, 2), y - random(4, 8));
               tCtx.stroke();
          }
          // Dirt Patches
          for (let i = 0; i < 4; i++) {
               const x = random(0, size);
               const y = random(0, size);
               const r = random(20, 60);
               tCtx.fillStyle = 'rgba(80, 60, 40, 0.15)';
               tCtx.beginPath();
               tCtx.ellipse(x, y, r, r * 0.7, random(0, Math.PI), 0, Math.PI * 2);
               tCtx.fill();
          }
          // Flowers
          const flowerColors = ['#FAF089', '#F687B3', '#63B3ED', '#FFFFFF'];
          for (let i = 0; i < 40; i++) {
               tCtx.fillStyle = flowerColors[Math.floor(Math.random()*flowerColors.length)];
               const x = random(0, size);
               const y = random(0, size);
               tCtx.beginPath();
               tCtx.arc(x, y, random(1, 3), 0, Math.PI*2);
               tCtx.fill();
               if (Math.random() > 0.5) {
                   tCtx.beginPath(); tCtx.arc(x + 4, y + 2, 1.5, 0, Math.PI * 2); tCtx.fill();
               }
          }
      } else if (biome === 'PARKING_LOT') {
          // Asphalt Base
          tCtx.fillStyle = '#4A5568';
          tCtx.fillRect(0, 0, size, size);
          
          // Noise
          for (let i = 0; i < 6000; i++) {
              tCtx.fillStyle = Math.random() > 0.5 ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.05)';
              tCtx.fillRect(random(0, size), random(0, size), 2, 2);
          }

          // Cracks
          tCtx.strokeStyle = '#1A202C';
          tCtx.lineWidth = 2;
          for(let i=0; i<10; i++) {
               let cx = random(0, size);
               let cy = random(0, size);
               tCtx.beginPath();
               tCtx.moveTo(cx, cy);
               for(let j=0; j<5; j++) {
                   cx += random(-15, 15);
                   cy += random(-15, 15);
                   tCtx.lineTo(cx, cy);
               }
               tCtx.stroke();
          }
          
          // Tire Marks
          tCtx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
          tCtx.lineWidth = 15;
          const curveStart = random(0, size);
          tCtx.beginPath();
          tCtx.arc(curveStart, size/2, size, 0, Math.PI * 0.2);
          tCtx.stroke();

          // Parking Lines
          tCtx.fillStyle = 'rgba(255, 255, 255, 0.15)';
          tCtx.fillRect(100, 0, 12, size);
          tCtx.fillRect(350, 0, 12, size);

          // Oil Stains
          for (let i = 0; i < 5; i++) {
               const x = random(0, size);
               const y = random(0, size);
               const r = random(10, 30);
               tCtx.fillStyle = 'rgba(0,0,0,0.25)';
               tCtx.beginPath();
               tCtx.ellipse(x, y, r, r * 0.8, random(0, Math.PI), 0, Math.PI*2);
               tCtx.fill();
          }

      } else if (biome === 'MARS') {
          // Red dust base
          tCtx.fillStyle = '#742A2A';
          tCtx.fillRect(0, 0, size, size);
          
          // Noise
          for (let i = 0; i < 4000; i++) {
              tCtx.fillStyle = Math.random() > 0.5 ? '#9B2C2C' : '#501010';
              tCtx.fillRect(random(0, size), random(0, size), 2, 2);
          }
          
          // Craters
          for(let i=0; i<10; i++) {
              const x = random(0, size);
              const y = random(0, size);
              const r = random(15, 45);
              tCtx.fillStyle = 'rgba(0,0,0,0.3)'; // Shadow
              tCtx.beginPath(); tCtx.arc(x, y, r, 0, Math.PI*2); tCtx.fill();
              tCtx.fillStyle = 'rgba(255,255,255,0.05)'; // Rim light
              tCtx.beginPath(); tCtx.arc(x - r*0.2, y - r*0.2, r*0.8, 0, Math.PI*2); tCtx.fill();
          }

          // Rocks
          tCtx.fillStyle = '#4A1515';
          for(let i=0; i<60; i++) {
              tCtx.fillRect(random(0, size), random(0, size), random(3, 8), random(3, 6));
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

          const halfW = (obs.width / 2) + padding;
          const halfH = (obs.height / 2) + padding;

          const closestX = Math.max(-halfW, Math.min(localX, halfW));
          const closestY = Math.max(-halfH, Math.min(localY, halfH));

          const distLocalX = localX - closestX;
          const distLocalY = localY - closestY;
          
          return (distLocalX * distLocalX + distLocalY * distLocalY) < (entityRadius * entityRadius);
      } else {
          const dist = Math.hypot(entityX - obs.x, entityY - obs.y);
          return dist < entityRadius + obs.radius + padding;
      }
  };

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
    // Reset State for new run/stage, but carefully preserve player if needed
    const freshState = JSON.parse(JSON.stringify(INITIAL_GAME_STATE));
    Object.assign(state, freshState);
    
    // Determine Biome based on Stage
    const biomes = ['PARK', 'PARKING_LOT', 'MARS'];
    state.biome = biomes[(stageNumber - 1) % biomes.length] as any;

    // Initialize Player
    if (initialPlayer) {
        // Carrying over stats/weapons
        state.player = { 
            ...JSON.parse(JSON.stringify(initialPlayer)),
            x: 0, 
            y: 0,
            // Ensure these are reset for gameplay feel
            airborneTimer: 0,
            invincibleTimer: 0,
            statusEffects: [],
            animationState: 'IDLE'
        };
    } else {
        // Fresh character
        state.player.characterId = character.id;
        state.player.maxHp = character.hp;
        state.player.hp = character.hp;
        state.player.speed = character.speed;
        state.player.color = character.color;
        state.player.emoji = character.emoji;
        state.player.radius = character.radius;
        state.player.filter = character.filter;
        state.player.revives = character.revives || 0;

        if (character.magnetRadius) state.player.magnetRadius = character.magnetRadius;
        if (character.maxCompanions) state.player.maxCompanions = character.maxCompanions;

        if (character.damageBonus) {
            state.player.weapons.forEach(w => {
                w.damage = w.damage * (1 + (character.damageBonus || 0));
            });
        }
        if (character.cooldownReduction) {
            state.player.weapons.forEach(w => {
                w.cooldown = w.cooldown * (1 - (character.cooldownReduction || 0));
            });
        }
        
        state.player.activeAbility = character.activeAbility 
        ? JSON.parse(JSON.stringify(character.activeAbility)) 
        : { ...INITIAL_GAME_STATE.player.activeAbility };
    }
    
    if (state.player.maxCompanions && state.player.maxCompanions > 0) {
        for (let i = 0; i < state.player.maxCompanions; i++) {
            state.companions.push({
                id: `comp-${i}`,
                x: state.player.x,
                y: state.player.y,
                radius: 10,
                type: 'COMPANION',
                color: '#F6E05E',
                offsetAngle: (Math.PI * 2 / state.player.maxCompanions) * i,
                cooldown: 60,
                cooldownTimer: Math.random() * 60
            });
        }
    }
    
    const biomeData = BIOME_CONFIG[state.biome];
    state.mapBounds = { 
        minX: -biomeData.bounds, 
        maxX: biomeData.bounds, 
        minY: -biomeData.bounds, 
        maxY: biomeData.bounds 
    };
    
    state.obstacles = [];
    const { minX, maxX, minY, maxY } = state.mapBounds;
    
    if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
            bgPatternRef.current = createGroundPattern(state.biome, ctx);
        }
    }

    for(let i=0; i<biomeData.obstacleCount; i++) {
        const x = randomRange(minX + 50, maxX - 50); 
        const y = randomRange(minY + 50, maxY - 50);
        const id = `obs-${i}`;
        let obs: Obstacle = {
             id, x, y, radius: 30, type: 'OBSTACLE', color: '#fff', hp: 100, maxHp: 100, 
             destructible: false, rotation: Math.random() * 0.2 - 0.1, material: 'WOOD',
             isCover: false, width: undefined, height: undefined
        };

        if (state.biome === 'PARK') {
            const rng = Math.random();
            if (rng > 0.8) {
                obs = { ...obs, 
                    subtype: 'BENCH', material: 'WOOD', destructible: true, 
                    width: 60, height: 25, color: '#8D6E63', hp: 50, maxHp: 50,
                    isCover: false
                };
            } else if (rng > 0.6) {
                 obs = { ...obs,
                     subtype: 'LOG', material: 'WOOD', destructible: true,
                     width: 70, height: 20, color: '#5D4037', hp: 60, maxHp: 60,
                     isCover: true
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
  }, [character, musicEnabled, stageNumber, initialPlayer]);

  // Reset LevelUp ref when unpaused
  useEffect(() => {
      if (!paused) {
          isLevelingUpRef.current = false;
      }
  }, [paused]);

  // ... (Existing Key Event Listeners remain same) ...
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
            
            if (tx >= layout.pause.x && tx <= layout.pause.x + layout.pause.w &&
                ty >= layout.pause.y && ty <= layout.pause.y + layout.pause.h) {
                onTogglePause();
                continue;
            }

            const distAbility = Math.hypot(tx - layout.ability.x, ty - layout.ability.y);
            if (distAbility < layout.ability.hitR) {
                touchRef.current.abilityId = t.identifier;
                inputRef.current.ability = true; 
                continue;
            }

            const distSprint = Math.hypot(tx - layout.sprint.x, ty - layout.sprint.y);
            if (distSprint < layout.sprint.hitR) {
                touchRef.current.sprintId = t.identifier;
                continue;
            }

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
                inputRef.current.ability = false; 
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

              if (state.time >= GAME_WIN_TIME) {
                  onStageComplete(state.player, state.score, state.kills, state.collectedNuts);
                  return;
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
                  const maxDist = 75; 
                  const deadZone = 10; 
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

              // Update Animation State
              if (isMoving) {
                  p.animationState = 'WALKING';
              } else {
                  p.animationState = 'IDLE';
              }
              p.frameTimer++;

              // Update Facing Direction (4-way)
              if (isMoving) {
                  if (Math.abs(dx) > Math.abs(dy)) {
                      p.facing = dx > 0 ? 'RIGHT' : 'LEFT';
                  } else {
                      p.facing = dy > 0 ? 'DOWN' : 'UP';
                  }
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
              }

              // ... (Companion, Ability, Obs checks, Cover logic remain same) ...
              // --- COMPANION LOGIC ---
              state.companions.forEach((comp, index) => {
                   const angleOffset = (state.time * 0.01) + comp.offsetAngle; 
                   const formationRadius = 45; 
                   const targetX = p.x + Math.cos(angleOffset) * formationRadius;
                   const targetY = p.y + Math.sin(angleOffset) * formationRadius;
                   comp.x += (targetX - comp.x) * 0.1;
                   comp.y += (targetY - comp.y) * 0.1;

                   if (comp.cooldownTimer > 0) comp.cooldownTimer--;
                   else {
                        if (state.enemies.length > 0) {
                            const target = state.enemies[Math.floor(Math.random() * state.enemies.length)];
                            const dist = Math.hypot(target.x - comp.x, target.y - comp.y);
                            if (dist < 350) {
                                comp.cooldownTimer = comp.cooldown;
                                const angle = Math.atan2(target.y - comp.y, target.x - comp.x);
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
                              const baseAngle = p.facing === 'RIGHT' ? 0 : p.facing === 'LEFT' ? Math.PI : p.facing === 'UP' ? -Math.PI/2 : Math.PI/2;
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
              
              // SCALING FACTORS BASED ON STAGE
              const stageHpMult = 1 + (stageNumber - 1) * 0.5; 
              const stageDmgMult = 1 + (stageNumber - 1) * 0.2;
              const stageSpeedMult = 1 + (stageNumber - 1) * 0.1;

              if (state.time % 60 === 0 && state.enemies.length < 50 + (currentWave * 5)) {
                  const viewW = ctx.canvas.width;
                  const viewH = ctx.canvas.height;
                  const diagonal = Math.hypot(viewW, viewH);
                  const spawnRadius = (diagonal / 2) + 100; 

                  for(let attempt=0; attempt<10; attempt++) {
                      const angle = Math.random() * Math.PI * 2;
                      const spawnX = p.x + Math.cos(angle) * spawnRadius;
                      const spawnY = p.y + Math.sin(angle) * spawnRadius;

                      const b = state.mapBounds;
                      if (spawnX >= b.minX + 20 && spawnX <= b.maxX - 20 &&
                          spawnY >= b.minY + 20 && spawnY <= b.maxY - 20) {
                          
                          let enemyType = 'ZOMBIE';
                          let enemyHp = (20 + (currentWave * 5)) * stageHpMult;
                          let enemySpeed = (1 + (Math.random() * 1)) * stageSpeedMult;
                          let enemyDmg = 5 * stageDmgMult;
                          let enemyRadius = 16; 
                          let enemyColor = COLORS.zombie;
                          let shieldHp = 0;

                          // --- ENEMY VARIATION LOGIC ---
                          if (state.biome === 'PARK') {
                              if (currentWave >= 2 && Math.random() > 0.8) {
                                  enemyType = 'RUNNER_ZOMBIE';
                                  enemySpeed *= 1.5;
                                  enemyHp *= 0.6;
                                  enemyColor = '#F6AD55'; // Sickly Orange/Yellow
                                  enemyRadius = 14;
                              } else if (currentWave >= 4 && Math.random() > 0.9) {
                                  enemyType = 'BRUTE_ZOMBIE';
                                  enemySpeed *= 0.6;
                                  enemyHp *= 3;
                                  enemyColor = '#276749'; // Darker Green
                                  enemyRadius = 24;
                                  enemyDmg *= 1.5;
                              }
                          } else if (state.biome === 'PARKING_LOT') {
                              if (Math.random() > 0.6) enemyType = 'ROBOT';

                              if (enemyType === 'ROBOT') {
                                  enemyHp = (40 + (currentWave * 8)) * stageHpMult;
                                  enemySpeed = (0.8 + (Math.random() * 0.4)) * stageSpeedMult;
                                  enemyColor = COLORS.robot;
                                  enemyRadius = 18;

                                  if (currentWave >= 3 && Math.random() > 0.85) {
                                      enemyType = 'BOSS_ROBOT'; // Elite/Boss variant
                                      enemyHp *= 2;
                                      enemyRadius = 25;
                                      enemyColor = '#2D3748';
                                  }
                              } else {
                                  if (currentWave >= 3 && Math.random() > 0.85) {
                                      enemyType = 'SHIELD_ZOMBIE';
                                      shieldHp = enemyHp * 1.5; // Strong shield
                                      enemySpeed *= 0.8;
                                      enemyColor = '#4A5568'; // Riot gear color
                                  }
                              }
                          } else if (state.biome === 'MARS') {
                              if (Math.random() > 0.5) enemyType = 'ALIEN';
                              
                              if (enemyType === 'ALIEN') {
                                  enemyHp = (30 + (currentWave * 6)) * stageHpMult;
                                  enemySpeed = (2.0 + (Math.random() * 0.5)) * stageSpeedMult;
                                  enemyColor = COLORS.alien;
                                  enemyRadius = 14; 
                              }
                          }
                          
                          // Universal Swarm (Rare)
                          if (enemyType === 'ZOMBIE' && currentWave >= 2 && Math.random() > 0.9) {
                              enemyType = 'SWARM_ZOMBIE';
                              enemyHp = (15 + (currentWave * 2)) * stageHpMult; 
                              enemySpeed = (2.5 + (Math.random() * 0.5)) * stageSpeedMult; 
                              enemyRadius = 12; 
                              enemyColor = '#9AE6B4'; 
                          }

                          state.enemies.push({
                              id: `e-${state.time}-${Math.random()}`, x: spawnX, y: spawnY,
                              radius: enemyRadius, type: enemyType as any, color: enemyColor, 
                              hp: enemyHp, maxHp: enemyHp,
                              speed: enemySpeed, damage: enemyDmg, knockback: {x:0, y:0}, statusEffects: [],
                              animationState: 'WALKING', animationFrame: 0, frameTimer: 0,
                              facing: 'DOWN',
                              shieldHp: shieldHp, maxShieldHp: shieldHp
                          });
                          break; 
                      }
                  }
              }

              // ... (Enemy logic remains same) ...
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
                      
                      // Update facing
                      if (Math.abs(finalDx) > Math.abs(finalDy)) e.facing = finalDx > 0 ? 'RIGHT' : 'LEFT';
                      else e.facing = finalDy > 0 ? 'DOWN' : 'UP';

                  } else {
                      const distToPlayer = Math.hypot(dx, dy);
                      let moveX = dx / distToPlayer;
                      let moveY = dy / distToPlayer;
                      
                      const finalDx = moveX + sepX;
                      const finalDy = moveY + sepY;
                      
                      const angle = Math.atan2(finalDy, finalDx);
                      e.x += Math.cos(angle) * e.speed * speedMod;
                      e.y += Math.sin(angle) * e.speed * speedMod;

                      // Update facing
                      if (Math.abs(Math.cos(angle)) > Math.abs(Math.sin(angle))) e.facing = Math.cos(angle) > 0 ? 'RIGHT' : 'LEFT';
                      else e.facing = Math.sin(angle) > 0 ? 'DOWN' : 'UP';
                  }
                  
                  e.frameTimer++;

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
                         
                         if (e.type.startsWith('BOSS') || e.type === 'BRUTE_ZOMBIE') {
                            triggerShake(5, 20);
                         } else {
                            triggerShake(1, 10);
                         }
                      }
                  }
              }

              // ... (Projectiles, Drops, Particles, Text, Death logic remain same) ...
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
                      let baseAngle = p.facing === 'RIGHT' ? 0 : p.facing === 'LEFT' ? Math.PI : p.facing === 'UP' ? -Math.PI/2 : Math.PI/2;
                      if (target) baseAngle = Math.atan2(target.y - p.y, target.x - p.x);
                      
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
                                 // DAMAGE LOGIC WITH SHIELDS
                                 let damageDealt = proj.damage;
                                 if (e.shieldHp && e.shieldHp > 0) {
                                     e.shieldHp -= damageDealt;
                                     if (e.shieldHp < 0) {
                                         damageDealt = -e.shieldHp;
                                         e.shieldHp = 0;
                                     } else {
                                         damageDealt = 0;
                                         state.texts.push({ id: `shield-${Math.random()}`, x: e.x, y: e.y - 15, text: "SHIELD", life: 20, color: '#63B3ED', velocity: {x:0, y:-1}});
                                     }
                                 }
                                 
                                 if (damageDealt > 0) {
                                    e.hp -= damageDealt;
                                    state.texts.push({ id: `txt-${Math.random()}`, x: e.x, y: e.y, text: `${Math.round(damageDealt)}`, life: 30, color: '#fff', velocity: {x:0, y:-1}});
                                 }

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
                      state.drops.push({ id: `drop-${Math.random()}`, x: e.x, y: e.y, radius: 12, type: 'DROP', kind: 'XP', value: xpValue, color: '#F6E05E'});
                      state.enemies.splice(i, 1);
                      if (soundEnabled) playSound('DEATH');
                  }
              }

              // ... (Rest of cleanup/update loops for drops, particles, texts, death handling) ...
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
                                  color: '#F6E05E' 
                              });
                          }

                          if (p.xp >= p.nextLevelXp && !isLevelingUpRef.current) {
                              isLevelingUpRef.current = true; // Lock
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

              if (p.hp <= 0) {
                  if (p.revives && p.revives > 0) {
                      p.revives--;
                      p.hp = p.maxHp * 0.5;
                      p.invincibleTimer = 180; // 3s invuln
                      
                      state.enemies.forEach(e => {
                          const ang = Math.atan2(e.y - p.y, e.x - p.x);
                          e.x += Math.cos(ang) * 200;
                          e.y += Math.sin(ang) * 200;
                      });
                      
                      state.particles.push({
                          id: `revive-${Math.random()}`, x: p.x, y: p.y, radius: 100, type: 'EXPLOSION',
                          color: 'rgba(255, 215, 0, 0.5)', life: 30, maxLife: 30, scale: 1, velocity: {x:0, y:0},
                      });
                      
                      state.texts.push({
                          id: `revive-txt-${Math.random()}`, x: p.x, y: p.y - 50,
                          text: "REVIVED!", life: 60, color: '#F6E05E', velocity: {x:0, y:-1}
                      });

                      if (soundEnabled) playSound('LEVELUP');
                      triggerShake(10, 30);
                  } else {
                      onGameOver(state.score, state.time, state.kills, state.collectedNuts, false);
                  }
              }
          }

          // DRAWING
          
          const state = stateRef.current;
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
              ctx.fillStyle = BIOME_CONFIG[state.biome]?.bgColor || '#000';
              ctx.fillRect(0, 0, width, height);
          }

          // ... Grid and Fences ...
          ctx.strokeStyle = 'rgba(255,255,255,0.03)'; ctx.lineWidth = 1;
          const gridSize = 100;
          const startX = Math.floor(camX / gridSize) * gridSize;
          const startY = Math.floor(camY / gridSize) * gridSize;
          for(let x = startX; x < camX + width; x += gridSize) { ctx.beginPath(); ctx.moveTo(x - camX, 0); ctx.lineTo(x - camX, height); ctx.stroke(); }
          for(let y = startY; y < camY + height; y += gridSize) { ctx.beginPath(); ctx.moveTo(0, y - camY); ctx.lineTo(width, y - camY); ctx.stroke(); }

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

           const drawEmoji = (emoji: string, radius: number, sizeMultiplier = 2, rotate = 0, bounce = 0) => {
            ctx.font = `${radius * sizeMultiplier}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.save();
            ctx.rotate(rotate);
            ctx.translate(0, -bounce);
            ctx.fillText(emoji, 0, 0);
            ctx.restore();
          };

          // --- FULL RENDERING CODE ---
          const drawVectorSquirrel = (r: number, color: string, facing: string, animState: string, timer: number, isCompanion = false) => {
                const isWalking = animState === 'WALKING';
                const breatheRate = 0.05;
                const walkRate = 0.3; 
                const breathe = isWalking ? 0 : Math.sin(timer * breatheRate) * 1;
                const walkCycle = Math.sin(timer * walkRate);
                const hop = isWalking ? Math.abs(Math.sin(timer * walkRate)) * -4 : 0;
                const totalY = breathe + hop;
                const tilt = isWalking ? (facing === 'RIGHT' ? 0.2 : -0.2) : 0;
                ctx.save();
                if (facing === 'LEFT') ctx.scale(-1, 1);
                ctx.translate(0, totalY);
                ctx.rotate(tilt);
                // Tail
                const tailSway = Math.sin(timer * (isWalking ? 0.3 : 0.1)) * (isWalking ? 0.6 : 0.2);
                ctx.save(); ctx.translate(-r * 0.6, r * 0.2); ctx.rotate(tailSway + (isWalking ? 0.5 : 0)); 
                const tailGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, r*2); tailGrad.addColorStop(0, color); tailGrad.addColorStop(1, '#2D3748'); ctx.fillStyle = tailGrad;
                for(let i=0; i<4; i++) { ctx.beginPath(); ctx.ellipse(-i*r*0.2, -i*r*0.25, r*0.7 - i*r*0.05, r*0.8 - i*r*0.05, -0.2 + i*0.1, 0, Math.PI*2); ctx.fill(); }
                ctx.restore();
                // Rear Leg
                const rearLegAngle = isWalking ? Math.sin(timer * walkRate + Math.PI) * 0.8 : 0;
                const rearLegLift = isWalking ? Math.max(0, Math.sin(timer * walkRate + Math.PI)) * -3 : 0;
                ctx.save(); ctx.translate(r*0.1, r*0.7 + rearLegLift); ctx.rotate(rearLegAngle); ctx.fillStyle = color; 
                ctx.beginPath(); ctx.ellipse(0, 0, r*0.22, r*0.35, 0.4, 0, Math.PI*2); ctx.fill();
                ctx.beginPath(); ctx.ellipse(r*0.1, r*0.3, r*0.22, r*0.1, 0, 0, Math.PI*2); ctx.fill();
                ctx.restore();
                // Body
                const stretch = isWalking ? 1 + Math.abs(Math.cos(timer*walkRate))*0.05 : 1;
                const squash = isWalking ? 1 - Math.abs(Math.cos(timer*walkRate))*0.05 : 1;
                const bodyGrad = ctx.createLinearGradient(0, -r*0.8, 0, r*0.8); bodyGrad.addColorStop(0, color); bodyGrad.addColorStop(1, '#1A202C'); ctx.fillStyle = bodyGrad;
                ctx.beginPath(); ctx.ellipse(0, 0, r*0.7 * stretch, r*0.85 * squash, 0, 0, Math.PI*2); ctx.fill();
                ctx.fillStyle = '#FFF8E1'; ctx.beginPath(); ctx.ellipse(r*0.15, r*0.1, r*0.35 * stretch, r*0.5 * squash, 0, 0, Math.PI*2); ctx.fill();
                // Head
                const headBob = Math.sin(timer * (isWalking ? walkRate * 2 : breatheRate)) * 2;
                ctx.save(); ctx.translate(r*0.15, -r*0.85 + headBob); ctx.rotate(isWalking ? 0.1 : 0);
                ctx.fillStyle = color; ctx.beginPath(); ctx.arc(0, 0, r*0.6, 0, Math.PI*2); ctx.fill();
                ctx.fillStyle = '#FFF8E1'; ctx.beginPath(); ctx.ellipse(r*0.25, r*0.25, r*0.32, r*0.28, 0, 0, Math.PI*2); ctx.fill();
                const drawEar = (x:number, rot:number) => { ctx.save(); ctx.translate(x, -r*0.5); ctx.rotate(rot); ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(-r*0.2, 0); ctx.quadraticCurveTo(0, -r*0.8, r*0.2, 0); ctx.fill(); ctx.fillStyle = 'rgba(0,0,0,0.1)'; ctx.beginPath(); ctx.moveTo(-r*0.1, 0); ctx.quadraticCurveTo(0, -r*0.6, r*0.1, 0); ctx.fill(); ctx.restore(); }
                const twitch = (!isWalking && Math.random() > 0.98) ? 0.3 : 0; drawEar(-r*0.25, -0.4 + twitch); drawEar(r*0.25, 0.4 - twitch);
                const blink = (!isWalking && Math.floor(timer/150)%3===0 && timer%30<5);
                if (blink) { ctx.beginPath(); ctx.moveTo(r*0.1, -r*0.1); ctx.lineTo(r*0.3, -r*0.1); ctx.strokeStyle='#111'; ctx.lineWidth=2; ctx.stroke(); } 
                else { ctx.fillStyle = 'white'; ctx.beginPath(); ctx.arc(r*0.2, -r*0.1, r*0.18, 0, Math.PI*2); ctx.fill(); ctx.fillStyle = 'black'; ctx.beginPath(); ctx.arc(r*0.25, -r*0.1, r*0.08, 0, Math.PI*2); ctx.fill(); }
                ctx.fillStyle = '#F56565'; ctx.beginPath(); ctx.arc(r*0.45, -r*0.05, r*0.07, 0, Math.PI*2); ctx.fill();
                ctx.beginPath(); ctx.moveTo(r*0.5, 0); ctx.lineTo(r*0.8, -r*0.1); ctx.moveTo(r*0.5, 0.1); ctx.lineTo(r*0.8, 0.2); ctx.strokeStyle='rgba(255,255,255,0.5)'; ctx.lineWidth=1; ctx.stroke();
                ctx.restore(); 
                // Front Leg
                const frontLegAngle = isWalking ? Math.sin(timer * walkRate) * 0.8 : 0;
                const frontLegLift = isWalking ? Math.max(0, Math.sin(timer * walkRate)) * -3 : 0;
                ctx.save(); ctx.translate(r*0.2, r*0.75 + frontLegLift); ctx.rotate(frontLegAngle); ctx.fillStyle = color; ctx.beginPath(); ctx.ellipse(0, 0, r*0.22, r*0.35, 0.2, 0, Math.PI*2); ctx.fill();
                ctx.beginPath(); ctx.ellipse(r*0.1, r*0.3, r*0.22, r*0.1, 0, 0, Math.PI*2); ctx.fill(); ctx.restore();
                // Arm
                const armAngle = isWalking ? Math.sin(timer * walkRate + Math.PI/2) * 0.6 : Math.sin(timer*breatheRate)*0.1;
                ctx.save(); ctx.translate(r*0.3, r*0.15); ctx.rotate(armAngle); ctx.fillStyle = color; ctx.beginPath(); ctx.ellipse(0, r*0.15, r*0.12, r*0.25, 0, 0, Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(0, r*0.4, r*0.1, 0, Math.PI*2); ctx.fill(); ctx.restore();
                ctx.restore();
          };

          const drawVectorEnemy = (enemy: Enemy, timer: number) => {
                const { type, radius: r, color, facing, shieldHp } = enemy;
                const bounce = Math.abs(Math.sin(timer * 0.2)) * 3;
                const wobble = Math.sin(timer * 0.15) * 0.1;
                
                ctx.save(); 
                ctx.translate(0, -bounce); 
                ctx.rotate(wobble); 
                if (facing === 'LEFT') ctx.scale(-1, 1);

                if (type.includes('ZOMBIE') || type === 'SWARM_ZOMBIE') {
                    let skinColor = color;
                    let shirtColor = '#2F855A';
                    let scaleX = 1, scaleY = 1;
                    let rot = 0;

                    if (type === 'RUNNER_ZOMBIE') {
                        scaleX = 0.85; scaleY = 1.1;
                        rot = 0.3; 
                    } else if (type === 'BRUTE_ZOMBIE') {
                        scaleX = 1.4; scaleY = 1.2;
                        shirtColor = '#744210'; 
                    } else if (type === 'SHIELD_ZOMBIE') {
                        shirtColor = '#4A5568'; 
                    }

                    ctx.rotate(rot);
                    ctx.scale(scaleX, scaleY);

                    // Torso
                    const bodyGrad = ctx.createLinearGradient(0, -r, 0, r); 
                    bodyGrad.addColorStop(0, skinColor); 
                    bodyGrad.addColorStop(1, shirtColor); 
                    ctx.fillStyle = bodyGrad;
                    
                    ctx.beginPath(); 
                    ctx.moveTo(-r*0.7, -r*0.8); ctx.lineTo(r*0.7, -r*0.8); 
                    ctx.lineTo(r*0.5, r); ctx.lineTo(-r*0.5, r); 
                    ctx.closePath(); ctx.fill();

                    // Head
                    ctx.fillStyle = skinColor;
                    ctx.beginPath(); ctx.arc(0, -r, r*0.65, 0, Math.PI*2); ctx.fill();
                    
                    // Eyes
                    ctx.fillStyle = '#FEB2B2'; 
                    ctx.beginPath(); ctx.arc(r*0.25, -r*1.1, r*0.2, 0, Math.PI*2); ctx.fill();
                    ctx.beginPath(); ctx.arc(r*0.6, -r*1.05, r*0.15, 0, Math.PI*2); ctx.fill();
                    ctx.fillStyle = 'red'; 
                    ctx.beginPath(); ctx.arc(r*0.25, -r*1.1, r*0.08, 0, Math.PI*2); ctx.fill();
                    
                    // Mouth/Jaw
                    ctx.fillStyle = '#333';
                    ctx.beginPath(); ctx.ellipse(r*0.3, -r*0.75, r*0.2, r*0.1, 0.2, 0, Math.PI*2); ctx.fill();
                    
                    // Arm (Reaching)
                    const armWobble = Math.sin(timer * 0.2) * 5;
                    ctx.strokeStyle = skinColor; ctx.lineWidth = r * 0.3; ctx.lineCap = 'round';
                    ctx.beginPath(); ctx.moveTo(0, -r*0.4); ctx.lineTo(r*1.2, -r*0.6 + armWobble); ctx.stroke();

                    // Shield Logic
                    if (type === 'SHIELD_ZOMBIE' && shieldHp && shieldHp > 0) {
                         ctx.save();
                         ctx.translate(r * 0.6, -r * 0.5);
                         ctx.rotate(-0.1);
                         
                         // Shield Front
                         ctx.fillStyle = 'rgba(160, 174, 192, 0.9)';
                         ctx.strokeStyle = '#2D3748';
                         ctx.lineWidth = 2;
                         
                         const shieldH = r * 2.5;
                         const shieldW = r * 0.8;
                         
                         ctx.beginPath();
                         ctx.rect(-shieldW/2, -shieldH/2, shieldW, shieldH);
                         ctx.fill(); ctx.stroke();
                         
                         // Riot Window
                         ctx.fillStyle = '#63B3ED';
                         ctx.fillRect(-shieldW/2 + 2, -shieldH/2 + 5, shieldW - 4, r * 0.5);
                         
                         // Damage Cracks
                         if (shieldHp < enemy.maxShieldHp! * 0.5) {
                             ctx.strokeStyle = 'black'; ctx.lineWidth = 1;
                             ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(5,5); ctx.stroke();
                         }
                         ctx.restore();
                    }

                } else if (type.includes('ROBOT')) {
                    const isBoss = type === 'BOSS_ROBOT';
                    // Base Body
                    const metalGrad = ctx.createLinearGradient(-r, -r, r, r); 
                    metalGrad.addColorStop(0, '#E2E8F0'); metalGrad.addColorStop(0.5, color); metalGrad.addColorStop(1, '#1A202C'); 
                    ctx.fillStyle = metalGrad;
                    
                    // Tracks or Wheels
                    ctx.fillStyle = '#171923';
                    if (Math.floor(timer/10)%2===0) {
                        ctx.fillRect(-r*0.8, r*0.5, r*1.6, r*0.4); // Tread 1
                    } else {
                        ctx.fillRect(-r*0.9, r*0.5, r*1.8, r*0.4); // Tread 2
                    }
                    
                    // Chassis
                    ctx.fillStyle = metalGrad;
                    ctx.beginPath(); ctx.roundRect(-r*0.7, -r*1.2, r*1.4, r*1.8, 5); ctx.fill();
                    
                    // Head/Sensor
                    ctx.fillStyle = '#2D3748';
                    ctx.fillRect(-r*0.5, -r*1.5, r, r*0.6);
                    
                    // Eye (Scanner)
                    const scanX = Math.sin(timer * 0.15) * (r*0.3);
                    ctx.shadowColor = '#F56565'; ctx.shadowBlur = 10; 
                    ctx.fillStyle = '#F56565'; 
                    ctx.beginPath(); ctx.arc(scanX, -r*1.2, r*(isBoss ? 0.2 : 0.15), 0, Math.PI*2); ctx.fill(); 
                    ctx.shadowBlur = 0;
                    
                    // Antenna
                    ctx.strokeStyle = '#A0AEC0'; ctx.lineWidth = 2; 
                    ctx.beginPath(); ctx.moveTo(0, -r*1.5); ctx.lineTo(0, -r*2.2); ctx.stroke(); 
                    ctx.fillStyle = timer % 20 < 10 ? 'red' : '#4A5568'; 
                    ctx.beginPath(); ctx.arc(0, -r*2.2, 3, 0, Math.PI*2); ctx.fill();

                    if (isBoss) {
                        // Shoulder pads
                        ctx.fillStyle = '#4A5568';
                        ctx.fillRect(-r*1.1, -r*1.0, r*0.4, r*0.8);
                        ctx.fillRect(r*0.7, -r*1.0, r*0.4, r*0.8);
                    }

                } else if (type.includes('ALIEN')) {
                    // Floating bob
                    const floatY = Math.sin(timer * 0.1) * 5;
                    ctx.translate(0, floatY);

                    // Head/Body unified (Squid-like)
                    const skinGrad = ctx.createRadialGradient(0, -r*0.5, r*0.2, 0, 0, r*1.5); 
                    skinGrad.addColorStop(0, '#F687B3'); skinGrad.addColorStop(1, color); 
                    ctx.fillStyle = skinGrad;
                    
                    ctx.beginPath();
                    ctx.moveTo(-r*0.5, r*0.5);
                    // Head bulb
                    ctx.bezierCurveTo(-r*1.2, -r*0.5, -r*0.5, -r*2, 0, -r*2);
                    ctx.bezierCurveTo(r*0.5, -r*2, r*1.2, -r*0.5, r*0.5, r*0.5);
                    ctx.fill();

                    // Tentacles
                    ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.lineCap = 'round';
                    for(let i=0; i<3; i++) {
                        ctx.beginPath();
                        ctx.moveTo((i-1)*r*0.4, r*0.4);
                        const tentacleWiggle = Math.sin(timer*0.2 + i) * 5;
                        ctx.quadraticCurveTo((i-1)*r*0.5 + tentacleWiggle, r*1.2, (i-1)*r*0.2, r*1.5);
                        ctx.stroke();
                    }

                    // Eyes (Black almond)
                    ctx.fillStyle = 'black'; 
                    ctx.save(); ctx.rotate(-0.2); ctx.beginPath(); ctx.ellipse(-r*0.35, -r*0.8, r*0.2, r*0.3, 0, 0, Math.PI*2); ctx.fill(); ctx.restore();
                    ctx.save(); ctx.rotate(0.2); ctx.beginPath(); ctx.ellipse(r*0.35, -r*0.8, r*0.2, r*0.3, 0, 0, Math.PI*2); ctx.fill(); ctx.restore();
                    
                    // Glow
                    if (timer % 30 < 15) {
                         ctx.shadowColor = color; ctx.shadowBlur = 15;
                         ctx.strokeStyle = 'white'; ctx.lineWidth = 1;
                         ctx.beginPath(); ctx.arc(0, -r, r*0.8, 0, Math.PI*2); ctx.stroke();
                         ctx.shadowBlur = 0;
                    }
                }

                ctx.restore();
          };

          const drawVectorObstacle = (obs: Obstacle) => {
              ctx.save(); if (obs.width && obs.height) { ctx.rotate(obs.rotation); }
              if (obs.subtype === 'BENCH') {
                  const w = obs.width!; const h = obs.height!; ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.fillRect(-w/2 + 4, -h/2 + 4, w, h);
                  ctx.fillStyle = '#8D6E63'; ctx.fillRect(-w/2, -h/2, w, h);
                  ctx.fillStyle = '#5D4037'; for(let i=1; i<4; i++) { ctx.fillRect(-w/2, -h/2 + (i * h/4), w, 2); }
                  ctx.fillStyle = '#2D3748'; ctx.fillRect(-w/2 - 2, -h/2 - 2, 6, h + 4); ctx.fillRect(w/2 - 4, -h/2 - 2, 6, h + 4);
              } else if (obs.subtype === 'LOG') {
                  const w = obs.width!; const h = obs.height!; const barkGrad = ctx.createLinearGradient(0, -h/2, 0, h/2); barkGrad.addColorStop(0, '#4E342E'); barkGrad.addColorStop(0.5, '#795548'); barkGrad.addColorStop(1, '#3E2723'); ctx.fillStyle = barkGrad;
                  ctx.beginPath(); ctx.roundRect(-w/2, -h/2, w, h, 5); ctx.fill();
                  ctx.fillStyle = '#3E2723'; ctx.beginPath(); ctx.ellipse(-w * 0.2, 0, 4, 2, 0, 0, Math.PI*2); ctx.fill();
                  ctx.fillStyle = '#68D391'; ctx.beginPath(); ctx.ellipse(w * 0.2, -h*0.3, 8, 4, 0, 0, Math.PI*2); ctx.fill();
              } else if (obs.subtype === 'CRYSTAL') {
                   const time = state.time; const pulse = Math.sin(time * 0.05) * 0.2 + 1; ctx.shadowColor = obs.color; ctx.shadowBlur = 20 * pulse;
                   const grad = ctx.createLinearGradient(-obs.radius, -obs.radius, obs.radius, obs.radius); grad.addColorStop(0, 'white'); grad.addColorStop(0.4, obs.color); grad.addColorStop(1, '#4A148C'); ctx.fillStyle = grad;
                   ctx.beginPath(); const spikes = 6; for(let i=0; i<spikes*2; i++) { const r = (i%2===0) ? obs.radius : obs.radius * 0.6; const a = (Math.PI * i) / spikes + obs.rotation; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); } ctx.closePath(); ctx.fill();
                   ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1; ctx.stroke(); ctx.shadowBlur = 0;
              } else {
                  if (obs.subtype === 'CAR') drawEmoji('🚗', obs.radius, 2.5);
                  else if (obs.subtype === 'TREE') drawEmoji('🌲', obs.radius, 3);
                  else if (obs.subtype === 'PUDDLE') drawEmoji('💧', obs.radius, 2);
                  else if (obs.subtype === 'GEYSER') drawEmoji('🌋', obs.radius, 2);
                  else if (obs.subtype === 'WALL') drawEmoji('🧱', obs.radius, 1.5);
                  else drawEmoji('🪨', obs.radius, 2);
              }
              if (obs.destructible && obs.hp < obs.maxHp) { const w = 40; const h = 4; const hpPct = obs.hp / obs.maxHp; ctx.translate(0, -obs.radius - 15); ctx.fillStyle = '#333'; ctx.fillRect(-w/2, 0, w, h); ctx.fillStyle = hpPct > 0.5 ? '#48BB78' : '#F56565'; ctx.fillRect(-w/2, 0, w * hpPct, h); }
              ctx.restore();
          }

          const drawEntity = (e: Entity) => {
             if (e.type === 'EXPLOSION') {
                const explosion = e as Particle; const progress = (explosion.maxLife - explosion.life) / explosion.maxLife; ctx.save(); ctx.globalAlpha = 1 - progress;
                ctx.beginPath(); ctx.arc(e.x - camX, e.y - camY, e.radius * progress, 0, Math.PI * 2);
                const gradient = ctx.createRadialGradient(e.x - camX, e.y - camY, 0, e.x - camX, e.y - camY, e.radius * progress);
                gradient.addColorStop(0, 'white'); gradient.addColorStop(0.5, 'yellow'); gradient.addColorStop(1, 'rgba(255, 100, 0, 0)'); ctx.fillStyle = gradient; ctx.fill(); ctx.restore(); return;
             }
             if (e.x + e.radius < camX || e.x - e.radius > camX + width || e.y + e.radius < camY || e.y - e.radius > camY + height) return;
             let visualY = e.y; let shadowScale = 1.0;
             if (e.type === 'PLAYER') { const p = e as Player; if (p.airborneTimer && p.airborneTimer > 0) { const progress = p.airborneTimer / 60; const jumpHeight = Math.sin(progress * Math.PI) * 60; visualY -= jumpHeight; shadowScale = 0.5 + (0.5 * (1 - Math.sin(progress * Math.PI))); } }
             ctx.save(); ctx.translate(e.x - camX, visualY - camY);
             ctx.save(); ctx.translate(0, e.y - visualY); ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(0, e.radius * 0.8, e.radius * shadowScale, e.radius * 0.3 * shadowScale, 0, 0, Math.PI*2); ctx.fill(); ctx.restore();
             if (e.type === 'PLAYER') {
                 const p = e as Player; if (p.invincibleTimer && p.invincibleTimer > 0 && state.time % 8 < 4) ctx.globalAlpha = 0.5;
                 if (p.xpFlashTimer && p.xpFlashTimer > 0) { ctx.shadowColor = '#4FD1C5'; ctx.shadowBlur = 30 * (p.xpFlashTimer / 20); }
                 if (p.activeAbility && p.activeAbility.activeTimer > 0) { ctx.beginPath(); ctx.arc(0, 0, p.radius + 12, 0, Math.PI * 2); ctx.fillStyle = 'rgba(246, 224, 94, 0.3)'; ctx.fill(); ctx.strokeStyle = '#F6E05E'; ctx.lineWidth = 2; ctx.stroke(); }
                 const isInCover = !p.airborneTimer && state.obstacles.some(obs => obs.isCover && checkObstacleCollision(p.x, p.y, p.radius, obs, 15));
                 if (isInCover) { ctx.beginPath(); ctx.arc(0, 0, p.radius + 8, 0, Math.PI * 2); ctx.strokeStyle = 'rgba(66, 153, 225, 0.6)'; ctx.lineWidth = 3; ctx.stroke(); ctx.fillStyle = '#4299E1'; ctx.font = '16px monospace'; ctx.fillText('🛡️', -10, -30); }
             }
             ctx.fillStyle = e.color;
             switch (e.type) {
                case 'PLAYER': { const p = e as Player; drawVectorSquirrel(p.radius, p.color, p.facing, p.animationState, p.frameTimer); break; }
                case 'COMPANION': { const c = e as Companion; const facing = state.player.x < c.x ? 'LEFT' : 'RIGHT'; drawVectorSquirrel(c.radius, c.color, facing, 'WALKING', state.time + parseInt(c.id.split('-')[1])*100, true); break; }
                case 'SWARM_ZOMBIE': case 'ZOMBIE': case 'ROBOT': case 'ALIEN': case 'BRUTE_ZOMBIE': case 'RUNNER_ZOMBIE': case 'SHIELD_ZOMBIE': case 'BOSS_ROBOT': { 
                    drawVectorEnemy(e as Enemy, state.time + parseFloat(e.id.split('-')[2] || '0')*10); break; 
                }
                case 'OBSTACLE': drawVectorObstacle(e as Obstacle); break;
                case 'NUT_SHELL': drawEmoji('🌰', e.radius, 2, (e as Projectile).rotation); break; 
                case 'EXPLODING_ACORN': drawEmoji('🥥', e.radius, 2, (e as Projectile).rotation); break;
                case 'DROP': ctx.shadowColor = '#ECC94B'; ctx.shadowBlur = 15; drawEmoji('🥜', e.radius, 2.5, 0, Math.sin(state.time * 0.1) * 0.2); ctx.shadowBlur = 0; break;
                default: ctx.beginPath(); ctx.arc(0, 0, e.radius, 0, Math.PI * 2); ctx.fill(); break;
             }
             ctx.restore();
          };
          
          const entities = [...state.obstacles, ...state.drops, ...state.enemies, state.player, ...state.companions, ...state.projectiles, ...state.particles].sort((a,b) => a.y - b.y);
          entities.forEach(e => drawEntity(e));
          
          // Weapon visuals (Crows)
          state.player.weapons.forEach(w => {
            if (w.type === 'CROW_AURA') {
                for (let i = 0; i < w.amount; i++) {
                    const angle = (state.time * w.speed) + (i * (Math.PI * 2 / w.amount));
                    const cx = state.player.x + Math.cos(angle) * w.area;
                    const cy = state.player.y + Math.sin(angle) * w.area;
                    const drawX = cx - camX; const drawY = cy - camY;
                    if (drawX < -50 || drawX > width + 50 || drawY < -50 || drawY > height + 50) continue;
                    ctx.save(); ctx.translate(drawX, drawY); ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(0, 10, 10, 5, 0, 0, Math.PI*2); ctx.fill();
                    ctx.font = '28px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                    if (cx < state.player.x) ctx.scale(-1, 1); 
                    const wiggle = Math.sin(state.time * 0.3 + i) * 0.2; ctx.rotate(wiggle);
                    if (w.damage > 15) { ctx.filter = 'hue-rotate(260deg) saturate(200%) brightness(0.7)'; ctx.shadowColor = '#6B46C1'; ctx.shadowBlur = 10; }
                    ctx.fillText('🐦‍⬛', 0, 0);
                    if (!paused && state.time % 4 === 0) { state.particles.push({ id: `crow-trail-${i}-${state.time}`, x: cx, y: cy, radius: 2, velocity: {x:0, y:0}, life: 10, maxLife: 10, scale: 0.8, type: 'SMOKE', color: w.damage > 15 ? 'rgba(107, 70, 193, 0.4)' : 'rgba(0,0,0,0.2)' }); }
                    ctx.restore();
                }
            }
          });

          // Text
          state.texts.forEach(t => { ctx.font = 'bold 14px monospace'; ctx.fillStyle = t.color; ctx.strokeStyle = 'black'; ctx.lineWidth = 2; ctx.strokeText(t.text, t.x - camX, t.y - camY); ctx.fillText(t.text, t.x - camX, t.y - camY); });

          // Controls
          if (touchRef.current.joyId !== null) {
              const { joyStartX, joyStartY, joyCurX, joyCurY } = touchRef.current;
              ctx.save(); ctx.globalAlpha = 0.6;
              ctx.beginPath(); ctx.arc(joyStartX, joyStartY, 60 * layout.uiScale, 0, Math.PI * 2);
              const grad = ctx.createRadialGradient(joyStartX, joyStartY, 10, joyStartX, joyStartY, 60 * layout.uiScale); grad.addColorStop(0, 'rgba(255, 255, 255, 0.1)'); grad.addColorStop(1, 'rgba(255, 255, 255, 0.3)'); ctx.fillStyle = grad; ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 2; ctx.stroke();
              ctx.beginPath(); ctx.arc(joyCurX, joyCurY, 30 * layout.uiScale, 0, Math.PI * 2); ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'; ctx.fill(); ctx.shadowColor = 'rgba(0,0,0,0.3)'; ctx.shadowBlur = 5; ctx.restore();
          }
          
          // Buttons
          const drawButton = (btn: {x: number, y: number, r: number}, label: string, icon: string, pressed: boolean, color: string, subText?: string) => {
               ctx.save(); ctx.translate(btn.x, btn.y); 
               if (pressed) ctx.scale(0.9, 0.9);
               ctx.beginPath(); ctx.arc(0, 0, btn.r, 0, Math.PI * 2); 
               ctx.fillStyle = pressed ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'; 
               ctx.fill(); 
               ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.stroke();
               
               ctx.fillStyle = 'white'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
               ctx.font = `${btn.r * 0.5}px sans-serif`; ctx.fillText(icon, 0, -btn.r * 0.1);
               if (label) { ctx.font = `bold ${12 * layout.uiScale}px sans-serif`; ctx.fillText(label, 0, btn.r * 0.4); }
               if (subText) { ctx.font = `10px sans-serif`; ctx.fillStyle = '#ccc'; ctx.fillText(subText, 0, btn.r + 15); }
               ctx.restore();
          }

          const isSprinting = touchRef.current.sprintId !== null || inputRef.current.sprint;
          drawButton(layout.sprint, 'RUN', '👟', isSprinting, 'rgba(255,255,255,0.5)');

          const abil = state.player.activeAbility;
          if (abil) {
              const cooldownPct = abil.cooldownTimer / abil.cooldown; 
              const isPressed = touchRef.current.abilityId !== null || inputRef.current.ability;
              
              ctx.save(); ctx.translate(layout.ability.x, layout.ability.y); 
              if (isPressed) ctx.scale(0.9, 0.9);
              
              // Cooldown Arc
              ctx.beginPath(); ctx.arc(0, 0, layout.ability.r, 0, Math.PI * 2);
              ctx.fillStyle = cooldownPct > 0 ? 'rgba(0,0,0,0.6)' : 'rgba(246, 224, 94, 0.4)';
              ctx.fill();
              ctx.strokeStyle = cooldownPct > 0 ? '#555' : '#F6E05E'; ctx.lineWidth = 3; ctx.stroke();
              
              if (cooldownPct > 0) {
                   ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.beginPath(); ctx.moveTo(0,0); 
                   ctx.arc(0, 0, layout.ability.r, -Math.PI/2, -Math.PI/2 + (Math.PI * 2 * cooldownPct)); 
                   ctx.lineTo(0,0); ctx.fill();
              } else if (abil.activeTimer > 0) {
                   ctx.strokeStyle = '#FFF'; ctx.lineWidth = 3; ctx.setLineDash([5, 5]); 
                   ctx.beginPath(); ctx.arc(0, 0, layout.ability.r + 4, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
              }

              ctx.fillStyle = 'white'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
              ctx.font = `${layout.ability.r * 0.6}px sans-serif`; ctx.fillText('🌰', 0, 0);
              if (!layout.isMobile) { ctx.font = 'bold 10px sans-serif'; ctx.fillStyle = '#ccc'; ctx.fillText('SPACE', 0, layout.ability.r + 15); }
              ctx.restore();
          }
          
          // Pause
          const pb = layout.pause;
          ctx.save(); ctx.translate(pb.x, pb.y);
          ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.beginPath(); ctx.roundRect(0, 0, pb.w, pb.h, 8); ctx.fill();
          ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 1; ctx.stroke();
          ctx.fillStyle = 'white'; 
          const barW = 4 * layout.uiScale; const barH = 14 * layout.uiScale;
          ctx.fillRect((pb.w/2) - barW - 2, (pb.h-barH)/2, barW, barH);
          ctx.fillRect((pb.w/2) + 2, (pb.h-barH)/2, barW, barH);
          ctx.restore();

          // Stats UI
          const padding = 20;
          const barWidth = layout.isMobile ? width * 0.3 : 200;
          const barHeight = 14 * layout.uiScale;
          
          ctx.shadowColor = 'black'; ctx.shadowBlur = 2; ctx.fillStyle = 'white'; 
          ctx.font = `bold ${20 * layout.uiScale}px monospace`; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
          ctx.fillText(`${state.score}`, padding, padding);
          ctx.font = `bold ${12 * layout.uiScale}px monospace`; ctx.fillStyle = '#AAA';
          ctx.fillText(`SCORE`, padding, padding + (22 * layout.uiScale));
          
          // Timer Centered
          ctx.textAlign = 'center'; ctx.fillStyle = 'white'; ctx.font = `bold ${24 * layout.uiScale}px monospace`;
          const remainingFrames = Math.max(0, GAME_WIN_TIME - state.time);
          const mins = Math.floor(remainingFrames / 3600); const secs = Math.floor((remainingFrames % 3600) / 60);
          ctx.fillText(`${mins.toString().padStart(2,'0')}:${secs.toString().padStart(2,'0')}`, width/2, padding);

          // Stage Right
          ctx.textAlign = 'right'; ctx.fillStyle = 'white'; ctx.font = `bold ${20 * layout.uiScale}px monospace`;
          ctx.fillText(`STAGE ${stageNumber}`, width - padding, padding);
          
          // Nuts below Stage
          ctx.fillStyle = '#F6E05E'; ctx.font = `bold ${16 * layout.uiScale}px monospace`;
          ctx.fillText(`🥜 ${state.collectedNuts}`, width - padding, padding + (25 * layout.uiScale));

          // BOSS HEALTH BAR
          const activeBoss = state.enemies.find(e => e.type === 'BOSS_ZOMBIE' || e.type === 'BOSS_ROBOT' || e.type === 'BOSS_ALIEN');
          if (activeBoss) {
              const bossBarWidth = Math.min(width * 0.6, 600);
              const bossBarHeight = 20 * layout.uiScale;
              const barX = (width - bossBarWidth) / 2;
              const barY = 80 * layout.uiScale; // Positioned below timer

              ctx.save();
              ctx.shadowColor = 'black'; ctx.shadowBlur = 4;
              
              // Boss Name
              ctx.fillStyle = '#FC8181'; 
              ctx.font = `bold ${16 * layout.uiScale}px 'Russo One', sans-serif`; 
              ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
              
              let name = 'BOSS';
              if (activeBoss.type === 'BOSS_ROBOT') name = 'MECHA-PRIME';
              if (activeBoss.type === 'BOSS_ZOMBIE') name = 'ABOMINATION';
              if (activeBoss.type === 'BOSS_ALIEN') name = 'HIVE MIND';
              
              ctx.fillText(name, width / 2, barY - 6);
              
              // Bar Background
              ctx.fillStyle = 'rgba(0,0,0,0.8)';
              ctx.strokeStyle = '#4A5568'; ctx.lineWidth = 3;
              ctx.beginPath(); 
              if (ctx.roundRect) ctx.roundRect(barX, barY, bossBarWidth, bossBarHeight, 6);
              else ctx.rect(barX, barY, bossBarWidth, bossBarHeight);
              ctx.fill(); ctx.stroke();
              
              // Bar Fill
              const hpPct = Math.max(0, activeBoss.hp) / activeBoss.maxHp;
              ctx.fillStyle = '#E53E3E'; // Red 600
              ctx.beginPath(); 
              if (ctx.roundRect) ctx.roundRect(barX + 3, barY + 3, Math.max(0, (bossBarWidth - 6) * hpPct), bossBarHeight - 6, 4);
              else ctx.fillRect(barX + 3, barY + 3, Math.max(0, (bossBarWidth - 6) * hpPct), bossBarHeight - 6);
              ctx.fill();
              
              // Text overlay (HP)
              ctx.fillStyle = 'white'; ctx.font = `bold ${10 * layout.uiScale}px monospace`; ctx.textBaseline = 'middle';
              ctx.fillText(`${Math.ceil(activeBoss.hp)} / ${Math.ceil(activeBoss.maxHp)}`, width/2, barY + bossBarHeight/2);

              ctx.restore();
          }

          // HP Bar (Left, below Score)
          const hpY = padding + (45 * layout.uiScale);
          ctx.fillStyle = '#333'; ctx.fillRect(padding, hpY, barWidth, barHeight);
          ctx.fillStyle = '#E53E3E'; const hpRatio = Math.max(0, state.player.hp) / state.player.maxHp;
          ctx.fillRect(padding, hpY, barWidth * hpRatio, barHeight);
          // Text overlay
          ctx.textAlign = 'center'; ctx.fillStyle = 'white'; ctx.font = `bold ${10 * layout.uiScale}px monospace`; ctx.textBaseline = 'middle';
          ctx.fillText(`${Math.ceil(state.player.hp)}`, padding + barWidth/2, hpY + barHeight/2);
          
          // Revives
          if (state.player.revives && state.player.revives > 0) {
               ctx.textAlign = 'left'; ctx.font = `${16 * layout.uiScale}px sans-serif`; 
               ctx.fillText(`✝️${state.player.revives}`, padding + barWidth + 5, hpY + barHeight/2);
          }

          // XP Bar
          const xpY = hpY + barHeight + 5;
          ctx.fillStyle = '#333'; ctx.fillRect(padding, xpY, barWidth, 6 * layout.uiScale);
          ctx.fillStyle = '#38B2AC'; const xpRatio = state.player.xp / state.player.nextLevelXp;
          ctx.fillRect(padding, xpY, barWidth * xpRatio, 6 * layout.uiScale);
          ctx.textAlign = 'right'; ctx.fillStyle = '#38B2AC'; ctx.font = `bold ${10 * layout.uiScale}px monospace`; 
          ctx.fillText(`LVL ${state.player.level}`, padding + barWidth, xpY + 14 * layout.uiScale);

          // Stamina Bar
          const stY = xpY + 20 * layout.uiScale;
          ctx.fillStyle = '#333'; ctx.fillRect(padding, stY, barWidth * 0.6, 4 * layout.uiScale);
          ctx.fillStyle = '#F6E05E'; const stRatio = Math.max(0, state.player.stamina) / state.player.maxStamina;
          ctx.fillRect(padding, stY, (barWidth * 0.6) * stRatio, 4 * layout.uiScale);
          ctx.shadowBlur = 0;
          
          requestRef.current = requestAnimationFrame(render);
      };

      requestRef.current = requestAnimationFrame(render);
      return () => cancelAnimationFrame(requestRef.current!);
  }, [paused, soundEnabled, stageDuration, onGameOver, onStageComplete, onLevelUp, musicEnabled, onTogglePause, stageNumber, initialPlayer]);

  return <canvas ref={canvasRef} className="block bg-gray-900 touch-none w-full h-full" />;
};
