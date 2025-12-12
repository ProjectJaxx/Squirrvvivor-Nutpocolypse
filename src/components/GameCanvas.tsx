
import React, { useRef, useEffect, useCallback } from 'react';
import { GameState, Player, Upgrade, SquirrelCharacter, StageDuration } from '../types';
import { INITIAL_GAME_STATE, INITIAL_PLAYER } from '../constants';
import { ALL_UPGRADES } from '../upgrades';
import { playSound, playMusic, stopMusic } from '../services/soundService';

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

  useEffect(() => {
    // Initialize Game State
    gameStateRef.current = JSON.parse(JSON.stringify(INITIAL_GAME_STATE));
    
    // Setup Player
    const player = gameStateRef.current.player;
    if (initialPlayer) {
        Object.assign(player, initialPlayer);
    } else {
        Object.assign(player, INITIAL_PLAYER);
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
    }

    // Input Listeners
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
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('keyup', handleKeyUp);
        stopMusic();
        if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, []);

  useEffect(() => {
    if (musicEnabled) playMusic('PARK'); // Should be dynamic based on biome
    else stopMusic();
  }, [musicEnabled]);

  const gameLoop = useCallback(() => {
    if (paused) return;

    const state = gameStateRef.current;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Player Movement
    let dx = 0;
    let dy = 0;
    if (keysPressed.current['w'] || keysPressed.current['arrowup']) dy -= 1;
    if (keysPressed.current['s'] || keysPressed.current['arrowdown']) dy += 1;
    if (keysPressed.current['a'] || keysPressed.current['arrowleft']) dx -= 1;
    if (keysPressed.current['d'] || keysPressed.current['arrowright']) dx += 1;
    
    // Normalize vector
    if (dx !== 0 || dy !== 0) {
        const length = Math.sqrt(dx * dx + dy * dy);
        dx = (dx / length) * state.player.speed;
        dy = (dy / length) * state.player.speed;
        state.player.x += dx;
        state.player.y += dy;
        state.player.facing = dx > 0 ? 'RIGHT' : (dx < 0 ? 'LEFT' : state.player.facing);
    }
    
    // Simple bounds (Example)
    state.player.x = Math.max(-1000, Math.min(1000, state.player.x));
    state.player.y = Math.max(-1000, Math.min(1000, state.player.y));

    // Spawn Enemies (Placeholder logic)
    if (Math.random() < 0.05 && state.enemies.length < 50) {
         const angle = Math.random() * Math.PI * 2;
         const dist = 500;
         state.enemies.push({
             id: `e-${Date.now()}-${Math.random()}`,
             x: state.player.x + Math.cos(angle) * dist,
             y: state.player.y + Math.sin(angle) * dist,
             radius: 12,
             color: '#68d391',
             type: 'ZOMBIE',
             hp: 20,
             maxHp: 20,
             speed: 2,
             damage: 5,
             xpValue: 10,
             velocity: { x: 0, y: 0 }
         });
    }

    // Enemy AI & Collision (Simplified)
    for (const e of state.enemies) {
        const dx = state.player.x - e.x;
        const dy = state.player.y - e.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist > 0) {
            e.x += (dx/dist) * e.speed;
            e.y += (dy/dist) * e.speed;
        }
        
        // Player Collision
        if (dist < e.radius + state.player.radius && state.player.invincibleTimer <= 0) {
            state.player.hp -= e.damage;
            state.player.invincibleTimer = 30; // 0.5s frames
            if (soundEnabled) playSound('HIT');
        }
    }
    if (state.player.invincibleTimer > 0) state.player.invincibleTimer--;

    // Update Death FX & Cleanup
    for (let i = state.enemies.length - 1; i >= 0; i--) {
        const e = state.enemies[i];
        if (e.hp <= 0) {
             // --- DEATH EFFECTS ---
             let particleSubtype = 'DEFAULT';
             let particleCount = 6;
             let particleSpeedBase = 2;
             
             // Color Palette generation based on enemy type
             const getColors = (): string[] => {
                 if (e.type.includes('ROBOT') || e.type.includes('TANK')) {
                     return ['#A0AEC0', '#718096', '#CBD5E0', '#F56565']; // Greys + Red spark
                 } else if (e.type.includes('ALIEN') || e.type.includes('SPIDER')) {
                     return ['#9F7AEA', '#B83280', '#D53F8C', '#E9D8FD']; // Purples/Pinks
                 } else {
                     // Zombies
                     return ['#48BB78', '#2F855A', '#9B2C2C', '#C53030']; // Greens + Blood Reds
                 }
             };

             const colors = getColors();

             if (e.type.includes('ROBOT') || e.type.includes('TANK')) {
                 particleSubtype = 'SCRAP';
                 particleCount = e.type.includes('TANK') ? 20 : 12;
                 particleSpeedBase = 5; // Explodes violently
                 if (soundEnabled) playSound('EXPLOSION');
             } else if (e.type.includes('ZOMBIE') || e.type.includes('BRUTE')) {
                 particleSubtype = 'GOO';
                 particleCount = e.type.includes('BRUTE') ? 15 : 8;
                 particleSpeedBase = 2.5; // Splashes
                 if (soundEnabled) playSound('HIT'); // Wet sound
             } else if (e.type.includes('ALIEN')) {
                 particleSubtype = 'DISINTEGRATE';
                 particleCount = 12;
                 particleSpeedBase = 1.5; // Drifts
                 if (soundEnabled) playSound('AURA');
             }

             // Spawn Particles (Generic Body Parts)
             for(let k=0; k<particleCount; k++) {
                 const angle = Math.random() * Math.PI * 2;
                 const speed = Math.random() * particleSpeedBase + (particleSpeedBase * 0.5);
                 const color = colors[Math.floor(Math.random() * colors.length)];
                 
                 state.particles.push({
                     id: `death-${Date.now()}-${i}-${k}`,
                     x: e.x + (Math.random() * 10 - 5), 
                     y: e.y + (Math.random() * 10 - 5),
                     radius: Math.random() * 3 + 2, 
                     type: 'SMOKE', 
                     subtype: particleSubtype as any, 
                     color: color,
                     velocity: { 
                         x: Math.cos(angle) * speed, 
                         y: Math.sin(angle) * speed 
                     },
                     life: 40 + Math.random() * 20, 
                     maxLife: 60, 
                     scale: 1,
                     drift: particleSubtype === 'DISINTEGRATE' ? {x: 0, y: -0.5} : {x: 0, y: 0}
                 });
             }

             // --- ELITE SPECIFIC DEATH FX ---
             if (e.isElite) {
                 state.shake = { intensity: 8, duration: 15 };
                 state.particles.push({
                     id: `elite-flash-${Date.now()}`,
                     x: e.x, y: e.y, radius: 50,
                     type: 'FLASH', color: 'white',
                     velocity: {x:0, y:0}, life: 8, maxLife: 8, scale: 1
                 });
                 const essenceColor = e.eliteType === 'DAMAGE' ? '#FC8181' : (e.eliteType === 'SPEED' ? '#63B3ED' : '#F6E05E');
                 for(let k=0; k<12; k++) {
                     state.particles.push({
                         id: `elite-soul-${Date.now()}-${k}`,
                         x: e.x, y: e.y,
                         radius: Math.random() * 3 + 3,
                         type: 'SMOKE',
                         subtype: 'ELITE_ESSENCE',
                         color: essenceColor,
                         velocity: { 
                             x: (Math.random() - 0.5) * 8, 
                             y: (Math.random() * -5) - 3 
                         },
                         life: 60 + Math.random() * 30,
                         maxLife: 90,
                         scale: 1,
                         drift: {x: 0, y: -0.2}
                     });
                 }
                 if (soundEnabled) playSound('LEVELUP'); 
             }

             state.enemies.splice(i, 1);
             state.kills++;
             state.score += e.isElite ? 100 : 10;
             
             // Drops
             state.drops.push({
                 id: `d-${Date.now()}`,
                 x: e.x, y: e.y,
                 radius: 8, 
                 type: 'DROP',
                 color: '#4299e1',
                 kind: 'XP',
                 value: e.isElite ? 250 : 25
             });
             if (Math.random() < (e.isElite ? 0.8 : 0.1)) {
                 state.drops.push({
                     id: `n-${Date.now()}`,
                     x: e.x + 5, y: e.y,
                     radius: 8, 
                     type: 'DROP',
                     color: '#d69e2e',
                     kind: 'GOLD',
                     value: e.isElite ? 10 : 1
                 });
             }
             if (Math.random() < 0.01) {
                 state.drops.push({
                     id: `hp-${Date.now()}-${Math.random()}`,
                     x: e.x + (Math.random() * 10 - 5),
                     y: e.y + (Math.random() * 10 - 5),
                     radius: 10, 
                     type: 'DROP',
                     color: '#e53e3e',
                     kind: 'HEALTH_PACK',
                     value: 20 
                 });
             }
        }
    }

    // Update Particles
    for (let i = state.particles.length - 1; i >= 0; i--) {
        const p = state.particles[i];
        p.life--;
        p.x += p.velocity.x;
        p.y += p.velocity.y;
        if (p.drift) {
            p.x += p.drift.x;
            p.y += p.drift.y;
        }
        if (p.life <= 0) state.particles.splice(i, 1);
    }

    // Check Game Over
    if (state.player.hp <= 0) {
        onGameOver(state.score, state.time, state.kills, state.collectedNuts, false);
        return;
    }

    // Check Level Up (Stub)
    if (state.player.xp >= state.player.nextLevelXp) {
        state.player.xp -= state.player.nextLevelXp;
        state.player.nextLevelXp *= 1.2;
        onLevelUp(ALL_UPGRADES.slice(0, 3), (u) => {
            u.apply(state.player);
        });
    }

    // Update Stats HUD
    onStatsUpdate({
        score: state.score,
        kills: state.kills,
        nuts: state.collectedNuts,
        time: state.time,
        wave: state.wave,
        player: state.player,
        boss: null
    });

    state.time++;

    // --- RENDER ---
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw background
    ctx.fillStyle = '#2d3748';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Camera transform
    ctx.save();
    ctx.translate(canvas.width / 2 - state.player.x, canvas.height / 2 - state.player.y);

    // Draw Player
    ctx.fillStyle = state.player.color || 'orange';
    ctx.beginPath();
    ctx.arc(state.player.x, state.player.y, state.player.radius, 0, Math.PI * 2);
    ctx.fill();

    // Draw Enemies
    for (const e of state.enemies) {
        ctx.fillStyle = e.color || 'green';
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // Draw Particles
    for (const p of state.particles) {
        ctx.fillStyle = p.color || 'white';
        ctx.globalAlpha = p.life / p.maxLife;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * (p.life/p.maxLife), 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    }

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
        width={window.innerWidth}
        height={window.innerHeight}
        className="block w-full h-full bg-gray-900"
    />
  );
};
