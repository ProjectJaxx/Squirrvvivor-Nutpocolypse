
import { Player, Enemy, Projectile, Particle, Obstacle, ItemDrop } from '../types';
import { assets } from './assetService';

export const drawDashEffect = (ctx: CanvasRenderingContext2D, player: Player) => {
    if (player.isDashing) {
        ctx.save();
        ctx.translate(player.x, player.y);
        ctx.globalAlpha = 0.4;
        ctx.fillStyle = player.color;
        // Simple motion blur lines
        ctx.beginPath();
        const len = 20;
        const width = 10;
        // Direction opposite to velocity
        const angle = Math.atan2(player.velocity.y, player.velocity.x) + Math.PI;
        ctx.rotate(angle);
        ctx.rect(0, -width/2, len, width);
        ctx.fill();
        ctx.restore();
    }
};

const drawTail = (ctx: CanvasRenderingContext2D, time: number, primary: string, secondary: string, charId: string, isRunning: boolean) => {
    ctx.save();
    // Bushy tail logic
    ctx.translate(-10, -5);
    const wag = Math.sin(time * (isRunning ? 0.3 : 0.1)) * 0.2;
    ctx.rotate(wag);
    
    // Gradient or secondary color for tail
    ctx.fillStyle = secondary;
    ctx.beginPath();
    ctx.ellipse(-5, -5, 12, 8, Math.PI / 4, 0, Math.PI * 2);
    ctx.fill();
    
    // Fluff
    ctx.fillStyle = primary;
    ctx.beginPath();
    ctx.ellipse(-8, -8, 10, 6, Math.PI / 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
};

const drawLeg = (ctx: CanvasRenderingContext2D, x: number, y: number, time: number, phase: number, color: string, isRunning: boolean) => {
    ctx.save();
    ctx.translate(x, y);
    if (isRunning) {
        const cycle = Math.sin(time * 0.4 + phase) * 0.5;
        ctx.rotate(cycle);
    }
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(0, 0, 4, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
};

const drawBody = (ctx: CanvasRenderingContext2D, primary: string, secondary: string, charId: string) => {
    ctx.save();
    ctx.fillStyle = primary;
    // Oval body
    ctx.beginPath();
    ctx.ellipse(0, 0, 10, 14, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Belly patch
    ctx.fillStyle = secondary;
    ctx.beginPath();
    ctx.ellipse(2, 0, 6, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
};

const drawHead = (ctx: CanvasRenderingContext2D, color: string, charId: string) => {
    ctx.save();
    ctx.translate(2, -12);
    
    // Head shape
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(0, 0, 9, 0, Math.PI * 2);
    ctx.fill();
    
    // Ears
    ctx.beginPath();
    ctx.moveTo(-4, -6);
    ctx.lineTo(-6, -14);
    ctx.lineTo(-1, -8);
    ctx.fill();
    
    ctx.beginPath();
    ctx.moveTo(4, -6);
    ctx.lineTo(6, -14);
    ctx.lineTo(1, -8);
    ctx.fill();
    
    // Eyes
    ctx.fillStyle = 'black';
    ctx.beginPath(); ctx.arc(4, -2, 1.5, 0, Math.PI*2); ctx.fill();
    // Nose
    ctx.fillStyle = 'pink';
    ctx.beginPath(); ctx.arc(6, 1, 1, 0, Math.PI*2); ctx.fill();
    
    ctx.restore();
};

const drawArm = (ctx: CanvasRenderingContext2D, time: number, color: string, isRunning: boolean) => {
    ctx.save();
    ctx.translate(5, -2);
    if (isRunning) {
        ctx.rotate(Math.sin(time * 0.4) * 0.5);
    }
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(0, 0, 3, 5, -Math.PI/4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
};

const drawThrowingArm = (ctx: CanvasRenderingContext2D, timer: number, color: string) => {
    ctx.save();
    ctx.translate(5, -4);
    // Throwing motion
    const angle = (15 - timer) * 0.2; 
    ctx.rotate(angle);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(0, 0, 3, 6, -Math.PI/3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
};

const drawHeldNut = (ctx: CanvasRenderingContext2D, time: number, isRunning: boolean) => {
    ctx.save();
    ctx.translate(8, -2);
    if (isRunning) {
        ctx.translate(0, Math.sin(time * 0.4) * 2);
    }
    ctx.fillStyle = '#D69E2E';
    ctx.beginPath();
    ctx.arc(0, 0, 3, 0, Math.PI*2);
    ctx.fill();
    ctx.restore();
};

// Fallback procedural drawings if sprites fail to load
const drawZombie = (ctx: CanvasRenderingContext2D, time: number, enemy: Enemy) => {
    ctx.fillStyle = '#68D391'; 
    ctx.beginPath(); ctx.arc(0, -5, 8, 0, Math.PI*2); ctx.fill(); 
    ctx.fillStyle = '#2F855A'; 
    ctx.beginPath(); ctx.rect(-5, 0, 10, 12); ctx.fill();
    ctx.strokeStyle = '#68D391'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-3, 2); ctx.lineTo(8, 0); ctx.stroke();
    ctx.fillStyle = 'red'; ctx.beginPath(); ctx.arc(3, -6, 1.5, 0, Math.PI*2); ctx.fill();
};

const drawRobot = (ctx: CanvasRenderingContext2D, time: number, enemy: Enemy) => {
    ctx.fillStyle = '#A0AEC0'; ctx.fillRect(-6, -12, 12, 12); 
    ctx.fillStyle = '#718096'; ctx.fillRect(-8, 0, 16, 14); 
    ctx.fillStyle = '#63B3ED'; ctx.fillRect(0, -8, 4, 4); ctx.fillRect(-4, -8, 2, 4);
    ctx.strokeStyle = '#CBD5E0'; ctx.beginPath(); ctx.moveTo(0, -12); ctx.lineTo(0, -16); ctx.stroke();
};

const drawAlien = (ctx: CanvasRenderingContext2D, time: number, enemy: Enemy) => {
    ctx.fillStyle = '#9F7AEA'; ctx.beginPath(); ctx.ellipse(0, -10, 6, 8, 0, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.rect(-4, -2, 8, 10); ctx.fill();
    ctx.fillStyle = 'black'; ctx.save(); ctx.translate(3, -10); ctx.rotate(-0.2);
    ctx.beginPath(); ctx.ellipse(0, 0, 2.5, 4, 0, 0, Math.PI*2); ctx.fill(); ctx.restore();
};

const drawLPCSprite = (ctx: CanvasRenderingContext2D, enemy: Enemy, sprite: HTMLImageElement) => {
    // If sprite is small (icon/placeholder), draw it full
    if (sprite.naturalWidth < 64 || sprite.naturalHeight < 64) {
        const size = 48;
        ctx.drawImage(sprite, -size/2, -size/2 - 10, size, size);
        return;
    }

    // LPC Sprite Sheet standard
    // Frames are 64x64
    const frameW = 64;
    const frameH = 64;
    
    // Check if it is actually a sprite sheet (width must be multiple of 64 and > 64)
    const isSheet = sprite.naturalWidth >= 64 * 3;

    if (isSheet) {
        // Animation Rows (Standard LPC)
        // Row 8: Walk Up
        // Row 9: Walk Left
        // Row 10: Walk Down
        // Row 11: Walk Right
        // NOTE: Row indices depend on the sheet. Standard LPC full sheet:
        // 0: Spellcast Up, 1: Left, 2: Down, 3: Right
        // 4: Thrust Up...
        // 8: Walk Up, 9: Left, 10: Down, 11: Right
        let row = 10; // Default Down
        
        if (enemy.facing === 'LEFT') row = 9;
        else if (enemy.facing === 'RIGHT') row = 11;
        else if (enemy.facing === 'UP') row = 8;
        else if (enemy.facing === 'DOWN') row = 10;
        
        // Frame cycle 0-8 (9 frames usually for walk)
        const frame = enemy.animationFrame % 9;
        
        const sx = frame * frameW;
        const sy = row * frameH;
        
        const drawSize = 56;
        
        // Clamp source Y if sheet is smaller than expected (some sheets are just walk cycles)
        const safeSy = Math.min(sy, sprite.naturalHeight - frameH);
        
        ctx.drawImage(
            sprite,
            sx, safeSy, frameW, frameH,
            -drawSize/2, -drawSize/2 - 10, 
            drawSize, drawSize
        );
    } else {
        // Fallback for single large images (Placeholders)
        const size = 56;
        ctx.drawImage(sprite, -size/2, -size/2 - 10, size, size);
    }
};

/**
 * Procedurally draws a vector squirrel based on its current state and character type.
 * Includes dynamic scaling, specific traits (ear tufts, bulk), and smooth animations.
 */
export const drawSquirrel = (
  ctx: CanvasRenderingContext2D,
  player: Player,
  time: number
) => {
  ctx.save();
  ctx.translate(player.x, player.y);

  // --- 1. SETUP & SCALING ---
  const sizeScale = player.radius / 16;
  const dir = player.facing === 'LEFT' ? -1 : 1;
  ctx.scale(dir * sizeScale, sizeScale);

  const speed = Math.sqrt(player.velocity.x**2 + player.velocity.y**2);
  const lean = Math.min(speed * 0.05, 0.4); 
  ctx.rotate(lean);

  const isRunning = player.animationState === 'RUN' || player.animationState === 'DASH';
  const bounce = isRunning ? Math.sin(time * 0.8) * 2 : Math.sin(time * 0.1) * 0.5;
  ctx.translate(0, -bounce);

  const primary = player.color;
  const secondary = player.secondaryColor || '#FFFFFF';
  const charId = player.characterId || 'GREY';

  // --- 2. RENDER PARTS (Back to Front) ---
  drawTail(ctx, time, primary, secondary, charId, isRunning);
  drawLeg(ctx, -6, 10, time, 0, primary, isRunning);
  drawBody(ctx, primary, secondary, charId);
  drawHead(ctx, primary, charId);
  drawLeg(ctx, 6, 12, time, Math.PI, primary, isRunning);
  
  if (player.currentAttackType === 'NUT_THROW' && player.attackAnimTimer && player.attackAnimTimer > 0) {
      drawThrowingArm(ctx, player.attackAnimTimer, primary);
  } else {
      drawArm(ctx, time, primary, isRunning);
      drawHeldNut(ctx, time, isRunning);
  }

  ctx.restore();
};

export const drawDrop = (ctx: CanvasRenderingContext2D, drop: ItemDrop, time: number) => {
    ctx.save();
    ctx.translate(drop.x, drop.y);

    const bob = Math.sin(time * 0.1 + (drop.x % 10)) * 3;
    ctx.translate(0, bob);

    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(0, 12 - bob, drop.radius * 0.8, drop.radius * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();

    if (drop.kind === 'XP') {
        ctx.rotate(Math.sin(time * 0.05) * 0.2); 
        ctx.shadowColor = '#4299e1';
        ctx.shadowBlur = 10;
        ctx.fillStyle = '#63B3ED'; 
        ctx.beginPath();
        ctx.moveTo(0, drop.radius);
        ctx.bezierCurveTo(drop.radius, drop.radius * 0.5, drop.radius, -drop.radius * 0.5, 0, -drop.radius * 0.8);
        ctx.bezierCurveTo(-drop.radius, -drop.radius * 0.5, -drop.radius, drop.radius * 0.5, 0, drop.radius);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.4)';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(0, drop.radius); ctx.lineTo(drop.radius*0.4, -drop.radius*0.2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, drop.radius); ctx.lineTo(-drop.radius*0.4, -drop.radius*0.2); ctx.stroke();
        ctx.fillStyle = '#2B6CB0'; 
        ctx.beginPath();
        ctx.arc(0, -drop.radius * 0.8, drop.radius * 0.9, Math.PI, 0);
        ctx.fill();
        ctx.strokeStyle = '#4299e1';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(0, -drop.radius * 0.8, drop.radius * 0.6, Math.PI, 0); ctx.stroke();
        if (Math.random() > 0.95) {
             ctx.fillStyle = 'white';
             ctx.beginPath(); ctx.arc(-drop.radius*0.3, 0, 1.5, 0, Math.PI*2); ctx.fill();
        }

    } else if (drop.kind === 'GOLD') {
        ctx.scale(Math.cos(time * 0.05), 1); 
        ctx.shadowColor = '#F6E05E';
        ctx.shadowBlur = 5;
        ctx.fillStyle = '#D69E2E'; 
        ctx.beginPath();
        ctx.arc(0, 0, drop.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#975A16'; 
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(0, -drop.radius);
        ctx.bezierCurveTo(drop.radius * 0.5, -drop.radius * 0.5, -drop.radius * 0.5, drop.radius * 0.5, 0, drop.radius);
        ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.beginPath();
        ctx.arc(-drop.radius*0.4, -drop.radius*0.4, 2, 0, Math.PI*2);
        ctx.fill();

    } else if (drop.kind === 'HEALTH_PACK') {
        ctx.shadowColor = '#FC8181';
        ctx.shadowBlur = 8;
        ctx.fillStyle = '#E53E3E'; 
        ctx.beginPath();
        const r = drop.radius;
        ctx.moveTo(0, r); 
        ctx.bezierCurveTo(r * 1.3, 0, r * 1.3, -r, 0, -r * 0.5);
        ctx.bezierCurveTo(-r * 1.3, -r, -r * 1.3, 0, 0, r);
        ctx.fill();
        ctx.fillStyle = 'white';
        const w = r * 0.8;
        const thick = w * 0.3;
        ctx.fillRect(-w/2, -thick/2 - 2, w, thick);
        ctx.fillRect(-thick/2, -w/2 - 2, thick, w);
    }

    ctx.restore();
};

export const drawProjectile = (ctx: CanvasRenderingContext2D, p: Projectile, time: number) => {
    if (p.type === 'NUT_SHELL') {
         ctx.fillStyle = p.color;
         ctx.save();
         ctx.translate(p.x, p.y);
         ctx.rotate(p.rotation);
         ctx.fillStyle = '#D7CCC8'; 
         ctx.beginPath();
         ctx.ellipse(0, 0, p.radius * 0.6, p.radius, 0, 0, Math.PI*2);
         ctx.fill();
         ctx.fillStyle = '#5D4037'; 
         ctx.beginPath();
         ctx.arc(0, -p.radius*0.3, p.radius * 0.65, Math.PI, 0); 
         ctx.fill();
         ctx.beginPath();
         ctx.moveTo(0, -p.radius);
         ctx.lineTo(0, -p.radius - 4);
         ctx.strokeStyle = '#5D4037';
         ctx.lineWidth = 3;
         ctx.stroke();
         ctx.restore();
    } else if (p.type === 'EXPLODING_ACORN') {
         ctx.save();
         ctx.translate(p.x, p.y);
         ctx.rotate(p.rotation);
         ctx.fillStyle = '#3E2723'; 
         ctx.beginPath(); ctx.ellipse(0, 0, p.radius * 0.8, p.radius, 0, 0, Math.PI*2); ctx.fill();
         ctx.fillStyle = '#718096'; 
         ctx.beginPath(); ctx.arc(0, -p.radius*0.4, p.radius * 0.85, Math.PI, 0); ctx.fill();
         ctx.strokeStyle = '#2D3748'; ctx.lineWidth=2; ctx.stroke();
         if (Math.random() > 0.5) {
             ctx.fillStyle = '#ECC94B';
             ctx.beginPath(); ctx.arc(0, -p.radius - 2, 2, 0, Math.PI*2); ctx.fill();
         }
         ctx.restore();
    } else if (p.type === 'SAP_BLOB') {
        ctx.save();
        ctx.translate(p.x, p.y);
        const wobble = Math.sin(time * 0.5) * 2;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.beginPath();
        ctx.arc(-2 + wobble*0.5, -2 - wobble*0.5, p.radius*0.3, 0, Math.PI*2);
        ctx.fill();
        ctx.restore();
    } else if (p.type === 'SAP_PUDDLE') {
        ctx.save();
        ctx.translate(p.x, p.y);
        const pulse = 1 + Math.sin(time * 0.05) * 0.05;
        ctx.scale(pulse, pulse);
        ctx.globalAlpha = 0.6;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        const r = p.radius;
        ctx.moveTo(r, 0);
        ctx.bezierCurveTo(r, r*0.5, r*0.5, r, 0, r);
        ctx.bezierCurveTo(-r*0.5, r, -r, r*0.5, -r, 0);
        ctx.bezierCurveTo(-r, -r*0.5, -r*0.5, -r, 0, -r);
        ctx.bezierCurveTo(r*0.5, -r, r, -r*0.5, r, 0);
        ctx.fill();
        if (time % 60 < 30) {
            ctx.fillStyle = 'rgba(255,255,255,0.3)';
            ctx.beginPath();
            ctx.arc(r*0.3, -r*0.2, r*0.1, 0, Math.PI*2);
            ctx.fill();
        }
        ctx.restore();
    } else if (p.type === 'CROW') {
        ctx.save();
        ctx.translate(p.x, p.y);
        if (p.hitAnimTimer && p.hitAnimTimer > 0) {
            const scale = 1 + (p.hitAnimTimer * 0.05);
            ctx.scale(scale, scale);
            ctx.filter = 'brightness(200%)';
        }
        if (p.facing === 'LEFT') ctx.scale(-1, 1);
        const flap = Math.sin(time * 0.5) * 5;
        ctx.fillStyle = '#1A202C';
        ctx.beginPath(); ctx.ellipse(0, 0, 6, 3, 0, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#2D3748';
        ctx.beginPath(); ctx.moveTo(-2, -2); ctx.lineTo(8, -8 + flap); ctx.lineTo(4, 0); ctx.fill();
        ctx.beginPath(); ctx.moveTo(-2, 2); ctx.lineTo(8, 8 - flap); ctx.lineTo(4, 0); ctx.fill();
        ctx.beginPath(); ctx.arc(4, -2, 2.5, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#ECC94B';
        ctx.beginPath(); ctx.moveTo(6, -2); ctx.lineTo(9, -1); ctx.lineTo(6, 0); ctx.fill();
        ctx.restore();
    } else if (p.type === 'SHOCKWAVE') {
        ctx.save();
        ctx.translate(p.x, p.y);
        const alpha = Math.min(1, p.duration / 10); 
        ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.lineWidth = 4;
        ctx.beginPath();
        const visualRadius = p.radius + (30 - p.duration) * 2; 
        ctx.arc(0, 0, visualRadius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.2})`;
        ctx.fill();
        ctx.restore();
    } else if (p.type === 'BOSS_MISSILE') {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillStyle = '#F56565';
        ctx.beginPath();
        ctx.rect(-8, -3, 12, 6);
        ctx.fill();
        ctx.fillStyle = '#742A2A';
        ctx.beginPath(); ctx.moveTo(-8, -3); ctx.lineTo(-12, -6); ctx.lineTo(-4, -3); ctx.fill();
        ctx.beginPath(); ctx.moveTo(-8, 3); ctx.lineTo(-12, 6); ctx.lineTo(-4, 3); ctx.fill();
        ctx.fillStyle = '#FEB2B2';
        ctx.beginPath(); ctx.moveTo(4, -3); ctx.lineTo(8, 0); ctx.lineTo(4, 3); ctx.fill();
        ctx.fillStyle = '#ECC94B';
        const flicker = Math.random() * 4;
        ctx.beginPath(); ctx.moveTo(-8, -2); ctx.lineTo(-14 - flicker, 0); ctx.lineTo(-8, 2); ctx.fill();
        ctx.restore();
    } else {
         ctx.fillStyle = p.color;
         ctx.beginPath();
         ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
         ctx.fill();
    }
};

export const drawExplosion = (ctx: CanvasRenderingContext2D, p: Projectile, time: number) => {
    ctx.save();
    ctx.translate(p.x, p.y);
    
    const maxLife = 15;
    const life = p.duration;
    const progress = 1 - (life / maxLife); 
    const radius = p.radius * progress;
    const alpha = 1 - progress;
    
    ctx.strokeStyle = `rgba(255, 200, 100, ${alpha})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, p.radius * progress * 1.2, 0, Math.PI * 2);
    ctx.stroke();

    if (progress < 0.3) {
        ctx.fillStyle = 'white';
        ctx.beginPath(); ctx.arc(0,0, radius * 0.8, 0, Math.PI*2); ctx.fill();
    }
    
    const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
    grad.addColorStop(0, `rgba(255, 255, 0, ${alpha})`);
    grad.addColorStop(0.5, `rgba(255, 100, 0, ${alpha})`);
    grad.addColorStop(1, `rgba(50, 50, 50, 0)`);
    
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(0, 0, radius, 0, Math.PI*2); ctx.fill();
    
    ctx.strokeStyle = `rgba(100, 100, 100, ${alpha})`;
    ctx.lineWidth = 2;
    for(let i=0; i<8; i++) {
        const ang = (i * Math.PI/4);
        const dist = radius * 1.2;
        ctx.beginPath();
        ctx.moveTo(Math.cos(ang)*dist*0.5, Math.sin(ang)*dist*0.5);
        ctx.lineTo(Math.cos(ang)*dist, Math.sin(ang)*dist);
        ctx.stroke();
    }

    ctx.restore();
};

export const drawParticle = (ctx: CanvasRenderingContext2D, p: Particle) => {
    ctx.save();
    ctx.translate(p.x, p.y);
    
    const lifePct = p.life / p.maxLife;
    
    if (p.subtype === 'SCRAP') {
        ctx.globalAlpha = lifePct;
        ctx.fillStyle = p.color;
        ctx.rotate(lifePct * 10); 
        const seed = p.id.charCodeAt(p.id.length-1) % 3;
        ctx.beginPath();
        if (seed === 0) ctx.rect(-p.radius/2, -p.radius/2, p.radius, p.radius);
        else if (seed === 1) {
            ctx.moveTo(0, -p.radius); ctx.lineTo(p.radius, p.radius); ctx.lineTo(-p.radius, p.radius);
        } else ctx.arc(0,0, p.radius*0.6, 0, Math.PI*2);
        ctx.fill();
        
    } else if (p.subtype === 'GOO') {
        ctx.globalAlpha = lifePct * 0.8;
        ctx.fillStyle = p.color;
        const wobble = Math.sin(lifePct * 10) * 0.5;
        ctx.beginPath();
        ctx.arc(0, 0, p.radius * (0.5 + lifePct * 0.5) + wobble, 0, Math.PI*2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.beginPath(); ctx.arc(-p.radius*0.3, -p.radius*0.3, p.radius*0.2, 0, Math.PI*2); ctx.fill();

    } else if (p.subtype === 'DISINTEGRATE') {
        ctx.globalAlpha = lifePct;
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.radius/2, -p.radius/2, p.radius, p.radius);
        
    } else if (p.type === 'SMOKE') {
        ctx.globalAlpha = lifePct * 0.6;
        ctx.fillStyle = p.color;
        ctx.beginPath(); 
        ctx.arc(0, 0, p.radius * (2 - lifePct), 0, Math.PI*2); 
        ctx.fill();
    } else if (p.type === 'SPARK') {
        ctx.globalAlpha = lifePct;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.rect(-p.radius/2, -p.radius/2, p.radius, p.radius);
        ctx.fill();
    } else if (p.type === 'FLASH') {
        ctx.globalAlpha = lifePct;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(0, 0, p.radius, 0, Math.PI*2);
        ctx.fill();
    } else {
        ctx.globalAlpha = lifePct;
        ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.arc(0,0, p.radius, 0, Math.PI*2); ctx.fill();
    }
    
    ctx.restore();
};

export const drawTree = (ctx: CanvasRenderingContext2D, obs: Obstacle) => {
    ctx.save();
    ctx.translate(obs.x, obs.y);
    const seed = Math.abs(Math.sin(obs.x * obs.y)); 
    
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.ellipse(5, 10, obs.radius * 0.8, obs.radius * 0.3, 0, 0, Math.PI*2);
    ctx.fill();

    ctx.fillStyle = '#4A3728'; 
    if (obs.subtype === 'PINE') {
        ctx.fillRect(-obs.radius * 0.2, -obs.radius * 0.5, obs.radius * 0.4, obs.radius);
    } else {
        ctx.beginPath();
        ctx.moveTo(-obs.radius * 0.3, 0);
        ctx.lineTo(obs.radius * 0.3, 0);
        ctx.lineTo(obs.radius * 0.2, -obs.radius * 0.8);
        ctx.lineTo(-obs.radius * 0.2, -obs.radius * 0.8);
        ctx.fill();
    }

    const colorVar = seed * 40 - 20; 
    
    if (obs.subtype === 'PINE') {
        const baseColor = `rgb(${30 + colorVar}, ${80 + colorVar}, ${40 + colorVar})`; 
        ctx.fillStyle = baseColor;
        
        for (let i = 0; i < 3; i++) {
            const size = obs.radius * (1.2 - i * 0.3);
            const yOff = -obs.radius * 0.5 - (i * obs.radius * 0.5);
            ctx.beginPath();
            ctx.moveTo(-size, yOff + size/2);
            ctx.lineTo(size, yOff + size/2);
            ctx.lineTo(0, yOff - size);
            ctx.fill();
            if (i < 2) {
                ctx.fillStyle = 'rgba(0,0,0,0.2)';
                ctx.beginPath(); ctx.moveTo(-size*0.8, yOff + size/2); ctx.lineTo(size*0.8, yOff + size/2); ctx.lineTo(0, yOff + size/2 - 5); ctx.fill();
                ctx.fillStyle = baseColor; 
            }
        }
    } else {
        const r = obs.radius * 0.7;
        const g = 100 + colorVar;
        ctx.fillStyle = `rgb(${20}, ${g}, ${40})`; 
        ctx.beginPath(); ctx.arc(-r*0.6, -r*0.5, r, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(r*0.6, -r*0.5, r, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = `rgb(${30}, ${g + 20}, ${50})`; 
        ctx.beginPath(); ctx.arc(0, -r*1.2, r * 0.9, 0, Math.PI*2); ctx.fill();
    }

    ctx.restore();
};

/**
 * Procedurally draws enemies based on type and biome style.
 */
export const drawEnemy = (
    ctx: CanvasRenderingContext2D,
    enemy: Enemy,
    time: number
) => {
    ctx.save();
    ctx.translate(enemy.x, enemy.y);
    
    // Adjusted Scaling: Divide by 16 as standard base size for sprites
    const scale = enemy.radius / 16;
    
    // BOSS TELEGRAPHS (Draw under enemy)
    if (enemy.bossState === 'WARN') {
        ctx.save();
        const alpha = 0.3 + Math.sin(time * 0.5) * 0.2; 
        
        if (enemy.type === 'BRUTE_ZOMBIE') {
            ctx.fillStyle = `rgba(255, 0, 0, ${alpha})`;
            ctx.beginPath(); ctx.arc(0, 0, 60, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = 'rgba(255, 0, 0, 0.8)';
            ctx.lineWidth = 2;
            ctx.stroke();
        } else if (enemy.type === 'TANK_BOT') {
            ctx.strokeStyle = `rgba(255, 0, 0, ${alpha})`;
            ctx.lineWidth = 1;
            ctx.setLineDash([5, 5]);
            for(let i=-1; i<=1; i++) {
                ctx.beginPath();
                ctx.moveTo(0, 0);
                const angle = (enemy.facing === 'RIGHT' ? 0 : Math.PI) + (i * 0.3);
                ctx.lineTo(Math.cos(angle)*100, Math.sin(angle)*100);
                ctx.stroke();
            }
        } else if (enemy.type === 'BOSS_ALIEN') {
            ctx.fillStyle = `rgba(184, 50, 128, ${alpha})`;
            ctx.beginPath(); 
            for(let i=0; i<6; i++) {
                const ang = i * Math.PI / 3;
                const r = 40;
                ctx.lineTo(Math.cos(ang)*r, Math.sin(ang)*r);
            }
            ctx.closePath();
            ctx.fill();
        }
        ctx.restore();
    }

    // ELITE AURA
    if (enemy.isElite) {
        ctx.save();
        const pulse = 1 + Math.sin(time * 0.15) * 0.1; 
        const rotation = time * 0.03;
        
        let auraColor = '#ffffff';
        let secondaryColor = '#ffffff';
        let particleShape = 'CIRCLE';

        if (enemy.eliteType === 'SPEED') { 
            auraColor = '#3182CE'; 
            secondaryColor = '#90CDF4'; 
            particleShape = 'ARROW';
        } else if (enemy.eliteType === 'REGEN') { 
            auraColor = '#2F855A'; 
            secondaryColor = '#9AE6B4'; 
            particleShape = 'CROSS';
        } else if (enemy.eliteType === 'DAMAGE') { 
            auraColor = '#C53030'; 
            secondaryColor = '#FEB2B2'; 
            particleShape = 'SPIKE';
        }
        
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = auraColor;
        ctx.beginPath();
        ctx.arc(0, 0, 35 * pulse, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;

        ctx.strokeStyle = auraColor;
        ctx.lineWidth = 2;
        
        ctx.save();
        ctx.rotate(rotation);
        ctx.scale(pulse, pulse);
        ctx.setLineDash([10, 10]);
        ctx.beginPath(); ctx.arc(0, 0, 42, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
        
        ctx.save();
        ctx.rotate(-rotation * 1.5);
        ctx.scale(pulse * 0.8, pulse * 0.8);
        ctx.strokeStyle = secondaryColor;
        ctx.setLineDash([5, 5]);
        ctx.beginPath(); ctx.arc(0, 0, 32, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();

        const particleCount = 3;
        for(let i=0; i<particleCount; i++) {
            ctx.save();
            const pAngle = (time * 0.05) + (i * (Math.PI * 2 / particleCount));
            const dist = 42 * pulse;
            ctx.translate(Math.cos(pAngle) * dist, Math.sin(pAngle) * dist);
            
            ctx.fillStyle = secondaryColor;
            ctx.shadowColor = auraColor;
            ctx.shadowBlur = 5;
            
            ctx.beginPath();
            if (particleShape === 'ARROW') {
                ctx.rotate(pAngle + Math.PI/2);
                ctx.moveTo(0, -6); ctx.lineTo(4, 4); ctx.lineTo(-4, 4); 
            } else if (particleShape === 'SPIKE') {
                ctx.moveTo(0, -6); ctx.lineTo(2, -2); ctx.lineTo(6, 0); ctx.lineTo(2, 2);
                ctx.lineTo(0, 6); ctx.lineTo(-2, 2); ctx.lineTo(-6, 0); ctx.lineTo(-2, -2);
            } else { 
                ctx.rect(-2, -6, 4, 12); ctx.rect(-6, -2, 12, 4);
            }
            ctx.fill();
            ctx.restore();
        }
        ctx.restore();
    }

    // Facing Flip
    // Only flip if not using a sprite sheet or if sprite sheet requires it
    // The Goblin/Zombie/Gnome sprite sheets have separate rows for Left/Right, so we don't need context scaling flip for it.
    const sprite = getEnemySprite(enemy);
    const isUsingSpriteSheet = sprite && sprite.complete && sprite.naturalWidth > 0;
    
    if (!isUsingSpriteSheet) {
        const dir = enemy.facing === 'LEFT' ? -1 : 1;
        ctx.scale(dir * scale, scale);
    } else {
        // Just apply uniform scale for size, no flipping
        ctx.scale(scale, scale);
    }

    // Hit Flash
    if (enemy.hitFlashTimer && enemy.hitFlashTimer > 0) {
        ctx.filter = 'brightness(150%) sepia(30%)'; 
        ctx.translate(Math.random() * 2 - 1, Math.random() * 2 - 1);
    }

    // Common Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.ellipse(0, 8, 10, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Elite Glow
    if (enemy.isElite && (!enemy.hitFlashTimer || enemy.hitFlashTimer <= 0)) {
         let glowColor = '#ffffff';
         if (enemy.eliteType === 'SPEED') glowColor = '#63B3ED'; 
         else if (enemy.eliteType === 'REGEN') glowColor = '#68D391'; 
         else if (enemy.eliteType === 'DAMAGE') glowColor = '#FC8181';
         
         const glowIntensity = 10 + Math.sin(time * 0.2) * 5;
         ctx.shadowColor = glowColor;
         ctx.shadowBlur = glowIntensity; 
    }

    // DRAW ENEMY SPRITE OR FALLBACK
    if (isUsingSpriteSheet) {
        drawLPCSprite(ctx, enemy, sprite);
    } else {
        // Fallback to procedural drawings if assets missing
        const fallbackSprite = getEnemyFallbackSprite(enemy.type);
        if (fallbackSprite && fallbackSprite.complete && fallbackSprite.naturalWidth > 0) {
             ctx.drawImage(fallbackSprite, -32, -32, 64, 64);
        } else {
            // Procedural as last resort
            if (enemy.type.includes('ZOMBIE')) {
                drawZombie(ctx, time, enemy);
            } else if (enemy.type.includes('ROBOT') || enemy.type.includes('BOT') || enemy.type.includes('HOUND')) {
                drawRobot(ctx, time, enemy);
            } else if (enemy.type.includes('ALIEN') || enemy.type.includes('SPIDER')) {
                drawAlien(ctx, time, enemy);
            } else {
                drawZombie(ctx, time, enemy);
            }
        }
    }
    
    // Reset Filters
    ctx.filter = 'none';
    
    // Health Bar
    if (enemy.hp < enemy.maxHp) {
        ctx.save();
        // Undo scaling for UI
        if (!isUsingSpriteSheet) {
             const dir = enemy.facing === 'LEFT' ? -1 : 1;
             ctx.scale(dir * (1/scale), 1/scale);
        } else {
             ctx.scale(1/scale, 1/scale);
        }
        
        const hpPct = Math.max(0, enemy.hp / enemy.maxHp);
        const barW = 28;
        const barH = 4;
        const barY = -40 * scale; 

        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.beginPath();
        ctx.roundRect(-barW/2, barY, barW, barH, 2);
        ctx.fill();
        
        ctx.fillStyle = hpPct > 0.5 ? '#48bb78' : (hpPct > 0.25 ? '#ecc94b' : '#f56565');
        ctx.beginPath();
        ctx.roundRect(-barW/2, barY, barW * hpPct, barH, 2);
        ctx.fill();
        
        ctx.restore();
    }

    ctx.restore();
};

// Helper to get loaded asset based on type and rank
const getEnemySprite = (enemy: Enemy): HTMLImageElement | null => {
    // Stage 1 Mappings
    if (enemy.type === 'ZOMBIE') {
        if (enemy.isElite) return assets['ZOMBIE_BOSS'] || assets['ZOMBIE']; // Rare case
        return assets['ZOMBIE'];
    }
    
    // Runner -> Goblin Ranged (placeholder) or Standard Goblin
    if (enemy.type === 'RUNNER_ZOMBIE') {
        return assets['GOBLIN_RANGED'] || assets['GOBLIN'];
    }
    
    // Brute -> Gnome Sub-Boss (placeholder) or Standard Gnome
    if (enemy.type === 'BRUTE_ZOMBIE') {
        // "Brute" is our Sub-Boss archetype here
        return assets['GNOME_SB'] || assets['GNOME'];
    }
    
    // Boss Mappings
    if (enemy.type === 'BOSS_ZOMBIE') {
        return assets['ZOMBIE_BOSS'] || assets['ZOMBIE'];
    }
    
    // Fallbacks
    return null;
};

// Fallback to the SVG blobs if no sprite sheet found
const getEnemyFallbackSprite = (type: string): HTMLImageElement | null => {
    if (type.includes('ZOMBIE')) return assets['ZOMBIE_SVG'];
    if (type.includes('ROBOT') || type.includes('BOT') || type.includes('HOUND')) return assets['ROBOT'];
    if (type.includes('ALIEN') || type.includes('SPIDER')) return assets['ALIEN'];
    return null;
}
