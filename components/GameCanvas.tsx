
import React, { useEffect, useRef } from 'react';
import { 
    GameCanvasProps, GameState, Entity, Player, Enemy, Projectile, 
    ItemDrop, Particle, FloatingText, Obstacle, Upgrade, Vector 
} from '../types';
import { 
    CANVAS_WIDTH, CANVAS_HEIGHT, COLORS, BIOME_CONFIG, 
    INITIAL_GAME_STATE, STAGE_CONFIGS, UPGRADE_POOL_IDS 
} from '../constants';
import { playSound, playMusic, stopMusic } from '../services/soundService';

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
  const inputRef = useRef({ up: false, down: false, left: false, right: false });
  
  // Joystick State
  const touchRef = useRef<{
    id: number | null;
    startX: number;
    startY: number;
    curX: number;
    curY: number;
  }>({ id: null, startX: 0, startY: 0, curX: 0, curY: 0 });

  const requestRef = useRef<number>();

  const randomRange = (min: number, max: number) => Math.random() * (max - min) + min;

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
            color: '#ffffff',
            emoji: biomeData.obstacleEmoji,
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
          if (isDown && k === 'escape') onTogglePause();
      };
      window.addEventListener('keydown', e => handleKey(e, true));
      window.addEventListener('keyup', e => handleKey(e, false));
      
      // Touch / Joystick Listeners
      const canvas = canvasRef.current;
      
      const handleTouchStart = (e: TouchEvent) => {
        e.preventDefault();
        if (touchRef.current.id === null) {
            for(let i=0; i<e.changedTouches.length; i++) {
                const t = e.changedTouches[i];
                // Start joystick
                touchRef.current = {
                    id: t.identifier,
                    startX: t.clientX,
                    startY: t.clientY,
                    curX: t.clientX,
                    curY: t.clientY
                };
                break; // Only one joystick
            }
        }
      };

      const handleTouchMove = (e: TouchEvent) => {
        e.preventDefault();
        if (touchRef.current.id !== null) {
            for(let i=0; i<e.changedTouches.length; i++) {
                const t = e.changedTouches[i];
                if (t.identifier === touchRef.current.id) {
                    touchRef.current.curX = t.clientX;
                    touchRef.current.curY = t.clientY;
                }
            }
        }
      };

      const handleTouchEnd = (e: TouchEvent) => {
        e.preventDefault();
        if (touchRef.current.id !== null) {
            for(let i=0; i<e.changedTouches.length; i++) {
                if (e.changedTouches[i].identifier === touchRef.current.id) {
                    touchRef.current.id = null;
                }
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
          // UPDATE PHASE
          if (!paused) {
              const state = stateRef.current;
              state.time++;

              // Player Movement
              const p = state.player;
              let dx = 0, dy = 0;
              
              // Keyboard Input
              if (inputRef.current.up) dy -= 1;
              if (inputRef.current.down) dy += 1;
              if (inputRef.current.left) dx -= 1;
              if (inputRef.current.right) dx += 1;

              // Joystick Input
              if (touchRef.current.id !== null) {
                  const maxDist = 50;
                  const jx = touchRef.current.curX - touchRef.current.startX;
                  const jy = touchRef.current.curY - touchRef.current.startY;
                  const dist = Math.hypot(jx, jy);
                  
                  if (dist > 10) { // Deadzone
                      const scale = Math.min(dist, maxDist) / maxDist;
                      dx = (jx / dist) * scale;
                      dy = (jy / dist) * scale;
                  }
              }
              
              // Normalize & Apply
              if (dx || dy) {
                  // Normalize if length > 1 to prevent super speed, 
                  // but keep analog precision if length < 1 (from joystick)
                  const len = Math.hypot(dx, dy);
                  if (len > 1) {
                      dx /= len;
                      dy /= len;
                  }
                  
                  // Basic Collision Check to prevent walking into obstacles
                  const nextX = p.x + dx * p.speed;
                  const nextY = p.y + dy * p.speed;
                  
                  // Bounds
                  const b = state.mapBounds;
                  let canMoveX = nextX >= b.minX && nextX <= b.maxX;
                  let canMoveY = nextY >= b.minY && nextY <= b.maxY;

                  // Obstacles
                  if (canMoveX || canMoveY) {
                      for (const obs of state.obstacles) {
                          const obsW = obs.width || obs.radius * 2;
                          const obsH = obs.height || obs.radius * 2;
                          const isRect = !!obs.width;
                          
                          // Simple Circle-Circle or Circle-Rect check would be better
                          // Approximate Rect check
                          if (isRect) {
                             // Just simplistic check for now
                             if (Math.abs(nextX - obs.x) < obsW/2 + p.radius && 
                                 Math.abs(p.y - obs.y) < obsH/2 + p.radius) canMoveX = false;
                             if (Math.abs(p.x - obs.x) < obsW/2 + p.radius && 
                                 Math.abs(nextY - obs.y) < obsH/2 + p.radius) canMoveY = false;
                          } else {
                              // Circle
                              if (Math.hypot(nextX - obs.x, p.y - obs.y) < p.radius + obs.radius) canMoveX = false;
                              if (Math.hypot(p.x - obs.x, nextY - obs.y) < p.radius + obs.radius) canMoveY = false;
                          }
                      }
                  }

                  if (canMoveX) p.x += dx * p.speed;
                  if (canMoveY) p.y += dy * p.speed;
                  
                  p.facing = dx < 0 ? 'LEFT' : dx > 0 ? 'RIGHT' : p.facing;
              }

              // ... (Existing Spawning, Enemy Logic, etc.) ...
              
              if (p.xpFlashTimer && p.xpFlashTimer > 0) p.xpFlashTimer--;

              // Spawning Logic
              const waveInfo = STAGE_CONFIGS[stageDuration];
              const currentWave = Math.floor(state.time / (waveInfo.waveDuration * 60)) + 1;
              state.wave = currentWave;
              
              if (state.time % 60 === 0 && state.enemies.length < 50 + (currentWave * 5)) {
                  const angle = Math.random() * Math.PI * 2;
                  const dist = CANVAS_WIDTH/2 + 100;
                  state.enemies.push({
                      id: `e-${state.time}-${Math.random()}`,
                      x: p.x + Math.cos(angle) * dist,
                      y: p.y + Math.sin(angle) * dist,
                      radius: 12,
                      type: 'ZOMBIE',
                      color: COLORS.zombie,
                      emoji: '🧟',
                      hp: 20 + (currentWave * 5),
                      maxHp: 20 + (currentWave * 5),
                      speed: 1 + (Math.random() * 1),
                      damage: 5,
                      knockback: {x:0, y:0},
                      statusEffects: []
                  });
              }

              // Enemy Logic
              state.enemies.forEach(e => {
                  const angle = Math.atan2(p.y - e.y, p.x - e.x);
                  e.x += Math.cos(angle) * e.speed;
                  e.y += Math.sin(angle) * e.speed;
                  
                  if (Math.hypot(p.x - e.x, p.y - e.y) < p.radius + e.radius) {
                     p.hp -= 0.1;
                     if (soundEnabled && Math.random() > 0.9) playSound('HIT');
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
                          id: `p-${state.time}-${Math.random()}`,
                          x: p.x, y: p.y,
                          radius: 5,
                          type: 'NUT_SHELL',
                          color: '#FBD38D',
                          velocity: { x: Math.cos(angle) * w.speed, y: Math.sin(angle) * w.speed },
                          damage: w.damage,
                          duration: 60,
                          pierce: 1,
                          rotation: 0,
                          hitIds: []
                      });
                      if (soundEnabled) playSound('NUT');
                  }
              });

              // Projectiles Update
              for (let i = state.projectiles.length - 1; i >= 0; i--) {
                  const proj = state.projectiles[i];
                  proj.x += proj.velocity.x;
                  proj.y += proj.velocity.y;
                  proj.duration--;
                  
                  // 1. Check Obstacle Collisions (Walls, Trees)
                  let hitObstacle = false;
                  for (const obs of state.obstacles) {
                      const isRect = !!obs.width;
                      if (isRect) {
                          const w = obs.width!;
                          const h = obs.height!;
                          const distX = Math.abs(proj.x - obs.x);
                          const distY = Math.abs(proj.y - obs.y);

                          if (distX > (w/2 + proj.radius)) continue;
                          if (distY > (h/2 + proj.radius)) continue;

                          if (distX <= (w/2) || distY <= (h/2)) {
                              hitObstacle = true;
                              break;
                          }

                          const dx = distX - w/2;
                          const dy = distY - h/2;
                          if (dx*dx + dy*dy <= (proj.radius*proj.radius)) {
                              hitObstacle = true;
                              break;
                          }
                      } else {
                          // Circle Collision
                          const dist = Math.hypot(proj.x - obs.x, proj.y - obs.y);
                          if (dist < proj.radius + obs.radius) {
                              hitObstacle = true;
                              break;
                          }
                      }
                  }

                  if (hitObstacle) {
                      state.particles.push({
                        id: `spark-${Math.random()}`,
                        x: proj.x, y: proj.y,
                        velocity: { x: (Math.random() - 0.5) * 2, y: (Math.random() - 0.5) * 2 },
                        life: 10, maxLife: 10, scale: 1, type: 'SPARK', color: '#FFF'
                      });
                      state.projectiles.splice(i, 1);
                      continue;
                  }

                  // 2. Check Enemy Collisions
                  let hit = false;
                  for (const e of state.enemies) {
                     // Avoid hitting same enemy twice if piercing
                     if (proj.hitIds && proj.hitIds.includes(e.id)) continue;

                     if (Math.hypot(e.x - proj.x, e.y - proj.y) < e.radius + proj.radius) {
                         e.hp -= proj.damage;
                         state.texts.push({
                             id: `txt-${Math.random()}`, x: e.x, y: e.y, text: `${Math.round(proj.damage)}`,
                             life: 30, color: '#fff', velocity: {x:0, y:-1}
                         });
                         
                         // Track hit
                         if (!proj.hitIds) proj.hitIds = [];
                         proj.hitIds.push(e.id);

                         proj.pierce--;
                         hit = true;
                         if (proj.pierce <= 0) break;
                     }
                  }
                  
                  if (proj.duration <= 0 || proj.pierce <= 0) {
                      state.projectiles.splice(i, 1);
                  }
              }

              // Death & Drops
              for (let i = state.enemies.length - 1; i >= 0; i--) {
                  if (state.enemies[i].hp <= 0) {
                      const e = state.enemies[i];
                      state.kills++;
                      state.drops.push({
                          id: `drop-${Math.random()}`,
                          x: e.x, y: e.y,
                          radius: 4,
                          type: 'DROP',
                          kind: 'XP',
                          value: 10,
                          color: '#4FD1C5'
                      });
                      state.enemies.splice(i, 1);
                      if (soundEnabled) playSound('DEATH');
                  }
              }

              // Pickup
              for (let i = state.drops.length - 1; i >= 0; i--) {
                  const d = state.drops[i];
                  const dist = Math.hypot(p.x - d.x, p.y - d.y);
                  if (dist < 100) {
                      d.x += (p.x - d.x) * 0.1;
                      d.y += (p.y - d.y) * 0.1;
                  }
                  if (dist < p.radius + d.radius) {
                      if (d.kind === 'XP') {
                          p.xp += d.value;
                          p.xpFlashTimer = 20;
                          if (p.xp >= p.nextLevelXp) {
                              p.level++;
                              p.xp -= p.nextLevelXp;
                              p.nextLevelXp = Math.floor(p.nextLevelXp * 1.5);
                              if (soundEnabled) playSound('LEVELUP');
                              
                              const upgrades: Upgrade[] = UPGRADE_POOL_IDS.slice(0, 3).map(id => ({
                                  id, name: id.replace('_', ' '), description: 'Upgrade!', rarity: 'COMMON', icon: '✨',
                                  apply: (pl: Player) => { pl.weapons[0].damage += 5; }
                              }));
                              onLevelUp(upgrades, (u) => u.apply(p));
                          }
                      }
                      if (soundEnabled) playSound('COLLECT');
                      state.drops.splice(i, 1);
                  }
              }

              // Floating Text cleanup
              for (let i = state.texts.length - 1; i >= 0; i--) {
                  state.texts[i].x += state.texts[i].velocity.x;
                  state.texts[i].y += state.texts[i].velocity.y;
                  state.texts[i].life--;
                  if (state.texts[i].life <= 0) state.texts.splice(i, 1);
              }

              if (p.hp <= 0) onGameOver(state.score, state.time, state.kills);
          }

          // DRAW PHASE
          const state = stateRef.current;
          const { width, height } = ctx.canvas;
          
          ctx.fillStyle = BIOME_CONFIG[state.biome].bgColor;
          ctx.fillRect(0, 0, width, height);

          const camX = state.player.x - width / 2;
          const camY = state.player.y - height / 2;

          // Grid
          ctx.strokeStyle = 'rgba(255,255,255,0.05)';
          ctx.lineWidth = 1;
          const gridSize = 100;
          const startX = Math.floor(camX / gridSize) * gridSize;
          const startY = Math.floor(camY / gridSize) * gridSize;
          for(let x = startX; x < camX + width; x += gridSize) {
              ctx.beginPath(); ctx.moveTo(x - camX, 0); ctx.lineTo(x - camX, height); ctx.stroke();
          }
          for(let y = startY; y < camY + height; y += gridSize) {
              ctx.beginPath(); ctx.moveTo(0, y - camY); ctx.lineTo(width, y - camY); ctx.stroke();
          }

          // --- Drawing Logic ---
          const drawEntity = (e: Entity) => {
             const isBoss = e.type.startsWith('BOSS');
             const isObstacle = e.type === 'OBSTACLE';
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
                     const scale = 1 + (0.1 * Math.sin(state.time * 0.5));
                     drawRadius *= scale;

                     ctx.save();
                     ctx.beginPath();
                     const ringProgress = 1 - (p.xpFlashTimer / 20);
                     const ringRadius = e.radius + ringProgress * 20;
                     
                     ctx.arc(e.x - camX, e.y - camY + (ringProgress * -10), ringRadius, 0, Math.PI * 2);
                     ctx.strokeStyle = `rgba(79, 209, 197, ${p.xpFlashTimer / 20})`;
                     ctx.lineWidth = 2;
                     ctx.stroke();
                     ctx.restore();
                 }
             }

             const obs = e as Obstacle;
             const isRect = obs.type === 'OBSTACLE' && obs.width && obs.height;

             ctx.save();
             ctx.translate(e.x - camX, e.y - camY);
             
             if ((e as any).rotation) {
                 ctx.rotate((e as any).rotation);
             }

             // Glow for Player
             if (e.type === 'PLAYER') {
                 const p = e as Player;
                 if (p.xpFlashTimer && p.xpFlashTimer > 0) {
                     ctx.shadowColor = '#4FD1C5';
                     ctx.shadowBlur = 25 * (p.xpFlashTimer / 20);
                 }
             }

             if (isRect) {
                 const w = obs.width!;
                 const h = obs.height!;
                 ctx.beginPath();
                 if (ctx.roundRect) ctx.roundRect(-w/2, -h/2, w, h, 4);
                 else ctx.rect(-w/2, -h/2, w, h);
                 
                 if ((e as any).hitFlashTimer && (e as any).hitFlashTimer! > 0) {
                    ctx.fillStyle = '#FFFFFF';
                    ctx.globalAlpha = 1.0;
                 } else {
                    ctx.fillStyle = e.color === '#ffffff' ? '#4A5568' : e.color;
                    if (isObstacle) ctx.globalAlpha = 0.5;
                 }
                 ctx.fill();
                 ctx.globalAlpha = 1.0;
             } else {
                 ctx.beginPath();
                 ctx.arc(0, 0, drawRadius, 0, Math.PI * 2);
                 if ((e as any).hitFlashTimer && (e as any).hitFlashTimer! > 0) {
                    ctx.fillStyle = '#FFFFFF';
                    ctx.globalAlpha = 1.0;
                 } else {
                    if (isObstacle && e.color === '#ffffff') {
                        ctx.fillStyle = '#000000';
                        ctx.globalAlpha = 0.2;
                    } else {
                        ctx.fillStyle = e.color;
                        if (isObstacle) ctx.globalAlpha = 0.5;
                    }
                 }
                 ctx.fill();
                 ctx.globalAlpha = 1.0;
             }
             
             if (isBoss) ctx.shadowBlur = 0;

             if (e.emoji) {
                 if (e.type === 'PLAYER' && (e as any).filter) {
                    ctx.filter = (e as any).filter;
                    if ((e as Player).slowedTimer && (e as Player).slowedTimer! > 0) {
                        ctx.filter += ' hue-rotate(250deg) saturate(1.5)';
                    }
                 }
                 
                 const fontSize = isBoss ? drawRadius * 1.4 : (isRect ? Math.min(obs.width!, obs.height!) * 0.8 : e.radius * 1.4);
                 ctx.font = `${fontSize}px Arial`;
                 ctx.textAlign = 'center';
                 ctx.textBaseline = 'middle';
                 ctx.fillText(e.emoji, 0, 0);
             }
             ctx.restore();
          };

          const entities = [
              ...state.obstacles,
              ...state.drops,
              ...state.enemies,
              state.player,
              ...state.projectiles,
              ...state.particles
          ].sort((a,b) => a.y - b.y);
          
          entities.forEach(e => drawEntity(e));
          
          state.texts.forEach(t => {
              ctx.font = 'bold 14px monospace';
              ctx.fillStyle = t.color;
              ctx.strokeStyle = 'black';
              ctx.lineWidth = 2;
              ctx.strokeText(t.text, t.x - camX, t.y - camY);
              ctx.fillText(t.text, t.x - camX, t.y - camY);
          });

          // Joystick Rendering
          if (touchRef.current.id !== null) {
              const { startX, startY, curX, curY } = touchRef.current;
              const maxDist = 50;
              let jx = curX - startX;
              let jy = curY - startY;
              const dist = Math.hypot(jx, jy);
              
              // Clamp Visual
              if (dist > maxDist) {
                  jx = (jx / dist) * maxDist;
                  jy = (jy / dist) * maxDist;
              }
              
              // Base
              ctx.beginPath();
              ctx.arc(startX, startY, maxDist, 0, Math.PI * 2);
              ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
              ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
              ctx.lineWidth = 2;
              ctx.fill();
              ctx.stroke();
              
              // Stick
              ctx.beginPath();
              ctx.arc(startX + jx, startY + jy, 25, 0, Math.PI * 2);
              ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
              ctx.shadowBlur = 10;
              ctx.shadowColor = 'white';
              ctx.fill();
              ctx.shadowBlur = 0;
          }

          // HUD
          ctx.fillStyle = 'white';
          ctx.font = 'bold 20px monospace';
          ctx.fillText(`SCORE: ${state.score}`, 20, 30);
          ctx.fillText(`HP: ${Math.ceil(Math.max(0, state.player.hp))}/${state.player.maxHp}`, 20, 60);
          ctx.fillText(`TIME: ${Math.floor(state.time / 60)}s`, 20, 90);
          
          // Simple Level Bar
          ctx.fillStyle = '#444';
          ctx.fillRect(20, 100, 200, 10);
          ctx.fillStyle = '#38B2AC';
          ctx.fillRect(20, 100, (state.player.xp / state.player.nextLevelXp) * 200, 10);

          requestRef.current = requestAnimationFrame(render);
      };

      requestRef.current = requestAnimationFrame(render);
      return () => cancelAnimationFrame(requestRef.current!);
  }, [paused, soundEnabled, stageDuration, onGameOver, onLevelUp]);

  return <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} className="block bg-gray-900 touch-none" />;
};
