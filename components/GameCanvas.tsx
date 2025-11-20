
import React, { useEffect, useRef } from 'react';
import { 
    GameCanvasProps, GameState, Entity, Player, Enemy, Projectile, 
    ItemDrop, Particle, FloatingText, Obstacle, Upgrade, Vector 
} from '../types';
import { 
    CANVAS_WIDTH, CANVAS_HEIGHT, COLORS, BIOME_CONFIG, 
    INITIAL_GAME_STATE, STAGE_CONFIGS, UPGRADE_POOL_IDS, SPRITE_DEFS
} from '../constants';
import { playSound, playMusic, stopMusic } from '../services/soundService';
import { assets } from '../services/assetService';
import { Zap } from 'lucide-react';

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
  const inputRef = useRef({ up: false, down: false, left: false, right: false, sprint: false });
  
  // Input & Touch State
  const touchRef = useRef<{
    joyId: number | null;
    sprintId: number | null;
    joyStartX: number;
    joyStartY: number;
    joyCurX: number;
    joyCurY: number;
  }>({ joyId: null, sprintId: null, joyStartX: 0, joyStartY: 0, joyCurX: 0, joyCurY: 0 });

  const requestRef = useRef<number>(0);

  const randomRange = (min: number, max: number) => Math.random() * (max - min) + min;
  
  const triggerShake = (intensity: number, duration: number) => {
      const state = stateRef.current;
      // Allow new shake to override if it's stronger or the current one is almost over
      if (state.shake.intensity < intensity || state.shake.duration < 5) {
          state.shake.intensity = intensity;
          state.shake.duration = duration;
      }
  };

  // Initialize Game State
  useEffect(() => {
    const state = stateRef.current;
    // Reset state deeply
    Object.assign(state, JSON.parse(JSON.stringify(INITIAL_GAME_STATE)));
    
    // Apply character stats
    state.player.characterId = character.id;
    state.player.maxHp = character.hp;
    state.player.hp = character.hp;
    state.player.speed = character.speed;
    state.player.color = character.color;
    state.player.emoji = character.emoji;
    state.player.radius = character.radius;
    state.player.filter = character.filter;
    
    // Setup Biome (Default PARK for now, could be randomized)
    state.biome = 'PARK'; 
    const biomeData = BIOME_CONFIG[state.biome];
    state.mapBounds = { 
        minX: -biomeData.bounds, 
        maxX: biomeData.bounds, 
        minY: -biomeData.bounds, 
        maxY: biomeData.bounds 
    };
    
    // Generate Obstacles
    state.obstacles = [];
    for(let i=0; i<biomeData.obstacleCount; i++) {
        state.obstacles.push({
            id: `obs-${i}`,
            x: randomRange(state.mapBounds.minX, state.mapBounds.maxX),
            y: randomRange(state.mapBounds.minY, state.mapBounds.maxY),
            radius: 30,
            type: 'OBSTACLE',
            color: '#ffffff', // Not used for obstacles now
            hp: 100, maxHp: 100, destructible: false, rotation: Math.random() * 6.28,
            material: 'WOOD',
            width: Math.random() > 0.7 ? 60 : undefined, // Some rects
            height: Math.random() > 0.7 ? 40 : undefined
        });
    }

    if (musicEnabled) playMusic(state.biome);

    return () => stopMusic();
  }, [character, musicEnabled]);

  // Input Listeners
  useEffect(() => {
      const handleKey = (e: KeyboardEvent, isDown: boolean) => {
          const k = e.key.toLowerCase();
          if (k === 'w' || k === 'arrowup') inputRef.current.up = isDown;
          if (k === 's' || k === 'arrowdown') inputRef.current.down = isDown;
          if (k === 'a' || k === 'arrowleft') inputRef.current.left = isDown;
          if (k === 'd' || k === 'arrowright') inputRef.current.right = isDown;
          if (k === 'shift') inputRef.current.sprint = isDown;
          if (isDown && k === 'escape') onTogglePause();
      };
      window.addEventListener('keydown', e => handleKey(e, true));
      window.addEventListener('keyup', e => handleKey(e, false));
      
      // Touch / Joystick Listeners
      const canvas = canvasRef.current;
      
      const handleTouchStart = (e: TouchEvent) => {
        e.preventDefault();
        const currentCanvas = canvasRef.current;
        if (!currentCanvas) return;
        
        const padding = 20;
        const canvasWidth = currentCanvas.width; 
        const canvasHeight = currentCanvas.height;

        // 1. Pause Button Hit Check
        const pauseBtnSize = 40;
        const pauseBtnX = canvasWidth - padding - pauseBtnSize;
        const pauseBtnY = padding;

        // 2. Sprint Button Hit Check
        const sprintBtnRadius = 35;
        const sprintBtnX = canvasWidth - padding - sprintBtnRadius;
        const sprintBtnY = canvasHeight - padding - sprintBtnRadius - 20; // Moved up slightly to avoid edge

        for(let i=0; i<e.changedTouches.length; i++) {
            const t = e.changedTouches[i];
            
            // Check Pause
            if (t.clientX >= pauseBtnX - 10 && t.clientX <= pauseBtnX + pauseBtnSize + 10 &&
                t.clientY >= pauseBtnY - 10 && t.clientY <= pauseBtnY + pauseBtnSize + 10) {
                onTogglePause();
                continue;
            }

            // Check Sprint
            const distSprint = Math.hypot(t.clientX - sprintBtnX, t.clientY - sprintBtnY);
            if (distSprint < sprintBtnRadius + 15) {
                touchRef.current.sprintId = t.identifier;
                continue;
            }

            // Joystick (if not other buttons and joystick free)
            if (touchRef.current.joyId === null && t.clientX < canvasWidth / 2) {
                touchRef.current.joyId = t.identifier;
                touchRef.current.joyStartX = t.clientX;
                touchRef.current.joyStartY = t.clientY;
                touchRef.current.joyCurX = t.clientX;
                touchRef.current.joyCurY = t.clientY;
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

  // Main Game Loop
  useEffect(() => {
      const ctx = canvasRef.current?.getContext('2d');
      if (!ctx) return;

      const render = () => {
          const padding = 20; // Define padding for HUD

          // UPDATE PHASE
          if (!paused) {
              const state = stateRef.current;
              state.time++;

              // Player Update
              const p = state.player;
              if (p.invincibleTimer && p.invincibleTimer > 0) p.invincibleTimer--;
              if (p.xpFlashTimer && p.xpFlashTimer > 0) p.xpFlashTimer--;

              // Screen Shake Update
              if (state.shake.duration > 0) {
                  state.shake.duration--;
                  state.shake.intensity *= 0.95; // Decay
                  if (state.shake.duration <= 0) {
                      state.shake.intensity = 0;
                  }
              }

              // Player Movement
              let dx = 0, dy = 0;
              
              // Keyboard Input
              if (inputRef.current.up) dy -= 1;
              if (inputRef.current.down) dy += 1;
              if (inputRef.current.left) dx -= 1;
              if (inputRef.current.right) dx += 1;

              // Joystick Input
              if (touchRef.current.joyId !== null) {
                  const maxDist = 50;
                  const jx = touchRef.current.joyCurX - touchRef.current.joyStartX;
                  const jy = touchRef.current.joyCurY - touchRef.current.joyStartY;
                  const dist = Math.hypot(jx, jy);
                  
                  if (dist > 10) { // Deadzone
                      const scale = Math.min(dist, maxDist) / maxDist;
                      dx = (jx / dist) * scale;
                      dy = (jy / dist) * scale;
                  }
              }
              
              const isMoving = dx !== 0 || dy !== 0;

              // Player Animation Update
              p.animationState = isMoving ? 'WALKING' : 'IDLE';
              const animDef = SPRITE_DEFS.SQUIRREL.animations[p.animationState];
              p.frameTimer = (p.frameTimer + 1) % animDef.speed;
              if (p.frameTimer === 0) {
                  p.animationFrame = (p.animationFrame + 1) % animDef.frames;
              }

              // Sprint Logic
              let currentSpeed = p.speed;
              const wantsToSprint = inputRef.current.sprint || touchRef.current.sprintId !== null;
              
              if (p.stamina === undefined) p.stamina = 100;
              if (p.maxStamina === undefined) p.maxStamina = 100;

              if (wantsToSprint && p.stamina > 0 && isMoving) {
                  p.isSprinting = true;
                  currentSpeed *= 1.6; // 60% boost
                  p.stamina = Math.max(0, p.stamina - 1); // drain per frame
                  if (state.time % 5 === 0) {
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

              if (dx || dy) {
                  const len = Math.hypot(dx, dy);
                  if (len > 1) { dx /= len; dy /= len; }
                  
                  // p.rotation = Math.atan2(dy, dx); // No longer needed for sprite facing

                  const nextX = p.x + dx * currentSpeed;
                  const nextY = p.y + dy * currentSpeed;
                  
                  const b = state.mapBounds;
                  let canMoveX = nextX >= b.minX && nextX <= b.maxX;
                  let canMoveY = nextY >= b.minY && nextY <= b.maxY;

                  if (canMoveX || canMoveY) {
                      for (const obs of state.obstacles) {
                          const obsW = obs.width || obs.radius * 2;
                          const obsH = obs.height || obs.radius * 2;
                          const isRect = !!obs.width;
                          
                          if (isRect) {
                             if (Math.abs(nextX - obs.x) < obsW/2 + p.radius && Math.abs(p.y - obs.y) < obsH/2 + p.radius) canMoveX = false;
                             if (Math.abs(p.x - obs.x) < obsW/2 + p.radius && Math.abs(nextY - obs.y) < obsH/2 + p.radius) canMoveY = false;
                          } else {
                              if (Math.hypot(nextX - obs.x, p.y - obs.y) < p.radius + obs.radius) canMoveX = false;
                              if (Math.hypot(p.x - obs.x, nextY - obs.y) < p.radius + obs.radius) canMoveY = false;
                          }
                      }
                  }

                  if (canMoveX) p.x += dx * currentSpeed;
                  if (canMoveY) p.y += dy * currentSpeed;
                  
                  p.facing = dx < 0 ? 'LEFT' : dx > 0 ? 'RIGHT' : p.facing;
              }

              // Spawning Logic
              const waveInfo = STAGE_CONFIGS[stageDuration];
              const currentWave = Math.floor(state.time / (waveInfo.waveDuration * 60)) + 1;
              state.wave = currentWave;
              
              if (state.time % 60 === 0 && state.enemies.length < 50 + (currentWave * 5)) {
                  const angle = Math.random() * Math.PI * 2;
                  const dist = CANVAS_WIDTH/2 + 100;
                  state.enemies.push({
                      id: `e-${state.time}-${Math.random()}`, x: p.x + Math.cos(angle) * dist, y: p.y + Math.sin(angle) * dist,
                      radius: 12, type: 'ZOMBIE', color: COLORS.zombie, hp: 20 + (currentWave * 5), maxHp: 20 + (currentWave * 5),
                      speed: 1 + (Math.random() * 1), damage: 5, knockback: {x:0, y:0}, statusEffects: [],
                      animationState: 'WALKING', animationFrame: 0, frameTimer: 0
                  });
              }

              // Enemy Logic
              state.enemies.forEach(e => {
                  const angle = Math.atan2(p.y - e.y, p.x - e.x);
                  e.x += Math.cos(angle) * e.speed;
                  e.y += Math.sin(angle) * e.speed;
                  
                  // Animation Update
                  const animDef = SPRITE_DEFS.ZOMBIE.animations[e.animationState];
                  e.frameTimer = (e.frameTimer + 1) % animDef.speed;
                  if (e.frameTimer === 0) {
                      e.animationFrame = (e.animationFrame + 1) % animDef.frames;
                  }

                  if (!p.invincibleTimer || p.invincibleTimer <= 0) {
                      if (Math.hypot(p.x - e.x, p.y - e.y) < p.radius + e.radius) {
                         p.hp -= e.damage;
                         p.invincibleTimer = 30; // 0.5s of invincibility
                         if (soundEnabled) playSound('HIT');
                         
                         if (e.type.startsWith('BOSS')) {
                            triggerShake(5, 20);
                         } else {
                            triggerShake(1, 10);
                         }
                      }
                  }
              });

              // Weapon Logic
              p.weapons.forEach(w => {
                  if (w.cooldownTimer > 0) w.cooldownTimer--;
                  else {
                      w.cooldownTimer = w.cooldown;
                      const target = state.enemies.sort((a,b) => Math.hypot(a.x-p.x, a.y-p.y) - Math.hypot(b.x-p.x, b.y-p.y))[0];
                      const angle = target ? Math.atan2(target.y - p.y, target.x - p.x) : (p.facing === 'RIGHT' ? 0 : Math.PI);
                      
                      state.projectiles.push({
                          id: `p-${state.time}-${Math.random()}`, x: p.x, y: p.y, radius: 5, type: 'NUT_SHELL', color: '#FBD38D',
                          velocity: { x: Math.cos(angle) * w.speed, y: Math.sin(angle) * w.speed },
                          damage: w.damage, duration: 60, pierce: 1, rotation: 0, hitIds: [],
                          explodeRadius: Math.random() > 0.95 ? 50 : 0, // 5% chance to be an exploding acorn for testing
                      });
                      if (soundEnabled) playSound('NUT');
                  }
              });

              // Projectiles Update
              for (let i = state.projectiles.length - 1; i >= 0; i--) {
                  const proj = state.projectiles[i];
                  const speed = Math.hypot(proj.velocity.x, proj.velocity.y);
                  const steps = Math.max(1, Math.ceil(speed / 6)); 
                  const stepX = proj.velocity.x / steps;
                  const stepY = proj.velocity.y / steps;
                  
                  let destroyed = false;
                  proj.rotation += 0.2;

                  for (let s = 0; s < steps; s++) {
                      proj.x += stepX;
                      proj.y += stepY;

                      let hitObstacle = false;
                      for (const obs of state.obstacles) { /* ... obstacle collision ... */ }
                      if (hitObstacle) { /* ... handle obstacle hit ... */ }

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
                      if (destroyed) break;
                  }
                  
                  proj.duration--;
                  
                  if (destroyed || proj.duration <= 0) {
                      if (proj.explodeRadius && proj.explodeRadius > 0) {
                          state.particles.push({
                              id: `explosion-${Math.random()}`, x: proj.x, y: proj.y, radius: proj.explodeRadius, type: 'EXPLOSION',
                              color: 'rgba(255, 165, 0, 0.8)', life: 15, maxLife: 15, scale: 1, velocity: {x:0, y:0},
                          });
                          triggerShake(proj.explodeRadius / 4, 25);
                          if (soundEnabled) playSound('EXPLOSION');
                      }
                      state.projectiles.splice(i, 1);
                  }
              }

              // Death & Drops
              for (let i = state.enemies.length - 1; i >= 0; i--) {
                  if (state.enemies[i].hp <= 0) {
                      const e = state.enemies[i];
                      state.kills++;
                      state.drops.push({ id: `drop-${Math.random()}`, x: e.x, y: e.y, radius: 4, type: 'DROP', kind: 'XP', value: 10, color: '#4FD1C5'});
                      state.enemies.splice(i, 1);
                      if (soundEnabled) playSound('DEATH');
                  }
              }

              // Pickup
              for (let i = state.drops.length - 1; i >= 0; i--) {
                  const d = state.drops[i];
                  const dist = Math.hypot(p.x - d.x, p.y - d.y);
                  if (dist < 100) { d.x += (p.x - d.x) * 0.1; d.y += (p.y - d.y) * 0.1; }
                  if (dist < p.radius + d.radius) {
                      if (d.kind === 'XP') {
                          p.xp += d.value; p.xpFlashTimer = 20;
                          if (p.xp >= p.nextLevelXp) {
                              p.level++; p.xp -= p.nextLevelXp; p.nextLevelXp = Math.floor(p.nextLevelXp * 1.5);
                              if (soundEnabled) playSound('LEVELUP');
                              const upgrades: Upgrade[] = UPGRADE_POOL_IDS.slice(0, 3).map(id => ({ id, name: id.replace('_', ' '), description: 'Upgrade!', rarity: 'COMMON', icon: '✨', apply: (pl: Player) => { pl.weapons[0].damage += 5; } }));
                              onLevelUp(upgrades, (u) => u.apply(p));
                          }
                      }
                      if (soundEnabled) playSound('COLLECT');
                      state.drops.splice(i, 1);
                  }
              }

              // Particle & Text Cleanup
              for (let i = state.particles.length - 1; i >= 0; i--) {
                const pt = state.particles[i]; pt.x += pt.velocity.x; pt.y += pt.velocity.y; pt.life--;
                if (pt.life <= 0) state.particles.splice(i, 1);
              }
              for (let i = state.texts.length - 1; i >= 0; i--) {
                  state.texts[i].x += state.texts[i].velocity.x; state.texts[i].y += state.texts[i].velocity.y; state.texts[i].life--;
                  if (state.texts[i].life <= 0) state.texts.splice(i, 1);
              }

              if (p.hp <= 0) onGameOver(state.score, state.time, state.kills);
          }

          // DRAW PHASE
          const state = stateRef.current;
          const { width, height } = ctx.canvas;
          
          ctx.fillStyle = BIOME_CONFIG[state.biome].bgColor;
          ctx.fillRect(0, 0, width, height);
          ctx.imageSmoothingEnabled = false; // For pixel art

          let camX = state.player.x - width / 2;
          let camY = state.player.y - height / 2;

          // Apply Screen Shake
          if (state.shake.duration > 0 && state.shake.intensity > 0.1) {
              camX += (Math.random() - 0.5) * state.shake.intensity * 2;
              camY += (Math.random() - 0.5) * state.shake.intensity * 2;
          }

          // Grid
          ctx.strokeStyle = 'rgba(255,255,255,0.05)'; ctx.lineWidth = 1;
          const gridSize = 100;
          const startX = Math.floor(camX / gridSize) * gridSize;
          const startY = Math.floor(camY / gridSize) * gridSize;
          for(let x = startX; x < camX + width; x += gridSize) { ctx.beginPath(); ctx.moveTo(x - camX, 0); ctx.lineTo(x - camX, height); ctx.stroke(); }
          for(let y = startY; y < camY + height; y += gridSize) { ctx.beginPath(); ctx.moveTo(0, y - camY); ctx.lineTo(width, y - camY); ctx.stroke(); }

          // --- Drawing Logic ---
          const drawEntity = (e: Entity) => {
             if (e.type === 'EXPLOSION') {
                const explosion = e as Particle;
                const progress = (explosion.maxLife - explosion.life) / explosion.maxLife; // 0 to 1
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
             
             ctx.save();
             ctx.translate(e.x - camX, e.y - camY);
             
             // Player specific effects (invincibility flash, etc.)
             if (e.type === 'PLAYER') {
                 const p = e as Player;
                 if (p.invincibleTimer && p.invincibleTimer > 0 && state.time % 8 < 4) ctx.globalAlpha = 0.5;
                 if (p.xpFlashTimer && p.xpFlashTimer > 0) { ctx.shadowColor = '#4FD1C5'; ctx.shadowBlur = 25 * (p.xpFlashTimer / 20); }
             }
             
             ctx.fillStyle = e.color;
             ctx.strokeStyle = '#1a202c'; // Dark outline for definition
             ctx.lineWidth = 2.5;

             switch (e.type) {
                case 'PLAYER': {
                    const p = e as Player;
                    const sheet = assets.SQUIRREL;
                    const def = SPRITE_DEFS.SQUIRREL;

                    if (sheet) {
                      const anim = def.animations[p.animationState];
                      const frame = p.animationFrame % anim.frames;
                      ctx.save();
                      if (p.filter) ctx.filter = p.filter;
                      if (p.facing === 'LEFT') ctx.scale(-1, 1);
                      ctx.drawImage(
                          sheet,
                          frame * def.frameWidth, anim.row * def.frameHeight, def.frameWidth, def.frameHeight,
                          -def.frameWidth / 2, -def.frameHeight / 2, def.frameWidth, def.frameHeight
                      );
                      ctx.restore();
                    } else {
                        // Fallback to emoji
                        ctx.font = `${p.radius * 1.8}px sans-serif`;
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        if (p.filter) ctx.filter = p.filter;
                        ctx.fillText(p.emoji || '🐿️', 0, 0);
                        ctx.filter = 'none'; // Reset filter
                    }
                    break;
                }
                case 'ZOMBIE': {
                    const enemy = e as Enemy;
                    const sheet = assets.ZOMBIE;
                    const def = SPRITE_DEFS.ZOMBIE;

                    if (sheet) {
                        const anim = def.animations[enemy.animationState];
                        const frame = enemy.animationFrame % anim.frames;
                        ctx.drawImage(
                            sheet,
                            frame * def.frameWidth, anim.row * def.frameHeight, def.frameWidth, def.frameHeight,
                            -def.frameWidth / 2, -def.frameHeight / 2, def.frameWidth, def.frameHeight
                        );
                    } else {
                        // Fallback to emoji
                        ctx.font = `${enemy.radius * 2}px sans-serif`;
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.fillText('🧟', 0, 0);
                    }
                    break;
                }

                case 'NUT_SHELL':
                    ctx.rotate((e as Projectile).rotation);
                    ctx.beginPath();
                    ctx.arc(0, 0, e.radius, 0, Math.PI * 2);
                    ctx.fill();
                    break; 

                case 'OBSTACLE':
                    const obs = e as Obstacle;
                    ctx.rotate(obs.rotation);
                    ctx.lineWidth = 4;
                    if (obs.width && obs.height) {
                        ctx.fillStyle = '#4A5568';
                        ctx.beginPath();
                        ctx.rect(-obs.width / 2, -obs.height / 2, obs.width, obs.height);
                        ctx.fill();
                        ctx.stroke();
                    } else {
                        ctx.fillStyle = '#2F855A';
                        ctx.beginPath();
                        ctx.arc(0, 0, e.radius, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.stroke();
                    }
                    break;
                
                case 'DROP':
                    // Diamond shape (rotated square)
                    ctx.rotate(Math.PI / 4);
                    ctx.beginPath();
                    const dropSize = e.radius * 1.5;
                    ctx.rect(-dropSize / 2, -dropSize / 2, dropSize, dropSize);
                    ctx.fill();
                    break;
                
                default:
                    // Default to circle for particles, etc.
                    ctx.beginPath();
                    ctx.arc(0, 0, e.radius, 0, Math.PI * 2);
                    ctx.fill();
                    break;
             }

             ctx.restore();
          };
          
          const entities = [...state.obstacles, ...state.drops, ...state.enemies, state.player, ...state.projectiles, ...state.particles].sort((a,b) => a.y - b.y);
          entities.forEach(e => drawEntity(e));
          
          state.texts.forEach(t => {
              ctx.font = 'bold 14px monospace';
              ctx.fillStyle = t.color;
              ctx.strokeStyle = 'black';
              ctx.lineWidth = 2;
              ctx.strokeText(t.text, t.x - camX, t.y - camY);
              ctx.fillText(t.text, t.x - camX, t.y - camY);
          });


          // Joystick & Mobile Buttons
          if (touchRef.current.joyId !== null) { /* ... joystick draw ... */ }
          const sprintBtnRadius = 35; /* ... sprint button draw ... */

          // --- HUD ---
          const barWidth = 200;
          const barHeight = 16;
          ctx.fillStyle = 'white'; ctx.font = 'bold 20px monospace'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
          ctx.fillText(`SCORE: ${state.score}`, padding, padding);
          const hpY = padding + 30;
          ctx.fillStyle = '#333'; ctx.fillRect(padding, hpY, barWidth, barHeight); ctx.fillStyle = '#E53E3E';
          const hpRatio = Math.max(0, state.player.hp) / state.player.maxHp; ctx.fillRect(padding, hpY, barWidth * hpRatio, barHeight);
          ctx.fillStyle = 'white'; ctx.font = 'bold 10px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(`${Math.ceil(state.player.hp)}/${state.player.maxHp}`, padding + barWidth/2, hpY + barHeight/2);
          const xpY = hpY + barHeight + 8;
          ctx.fillStyle = '#333'; ctx.fillRect(padding, xpY, barWidth, 8); ctx.fillStyle = '#38B2AC';
          const xpRatio = state.player.xp / state.player.nextLevelXp; ctx.fillRect(padding, xpY, barWidth * xpRatio, 8);
          ctx.textAlign = 'left'; ctx.font = 'bold 12px monospace'; ctx.fillStyle = '#38B2AC';
          ctx.fillText(`LVL ${state.player.level}`, padding, xpY + 14);
          const stY = xpY + 20;
          ctx.fillStyle = '#333'; ctx.fillRect(padding, stY, barWidth * 0.7, 6); ctx.fillStyle = '#F6E05E';
          const stRatio = Math.max(0, state.player.stamina) / state.player.maxStamina; ctx.fillRect(padding, stY, (barWidth * 0.7) * stRatio, 6);
          ctx.fillStyle = '#F6E05E'; ctx.font = 'bold 10px monospace';
          ctx.fillText(`STM`, padding + (barWidth * 0.7) + 5, stY + 6);
          ctx.textAlign = 'center'; ctx.fillStyle = 'white'; ctx.font = 'bold 24px monospace';
          const mins = Math.floor(state.time / 3600); const secs = Math.floor((state.time % 3600) / 60);
          ctx.fillText(`${mins.toString().padStart(2,'0')}:${secs.toString().padStart(2,'0')}`, width / 2, padding);
          const pauseBtnSize = 40; /* ... pause button draw ... */

          requestRef.current = requestAnimationFrame(render);
      };

      requestRef.current = requestAnimationFrame(render);
      return () => cancelAnimationFrame(requestRef.current!);
  }, [paused, soundEnabled, stageDuration, onGameOver, onLevelUp]);

  return <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} className="block bg-gray-900 touch-none" />;
};
