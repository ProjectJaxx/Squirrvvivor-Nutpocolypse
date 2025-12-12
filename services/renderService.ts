
import { Player, Enemy, Projectile, Particle, Obstacle, ItemDrop } from '../types';

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
  
  // Base scale relative to a "standard" radius of 16px.
  // Giant (24px) will be 1.5x larger, Red (14px) will be ~0.9x.
  const sizeScale = player.radius / 16;
  
  // Flip horizontally if facing left
  const dir = player.facing === 'LEFT' ? -1 : 1;
  ctx.scale(dir * sizeScale, sizeScale);

  // Dynamic Tilt based on speed
  const speed = Math.sqrt(player.velocity.x**2 + player.velocity.y**2);
  const lean = Math.min(speed * 0.05, 0.4); // Cap tilt
  ctx.rotate(lean);

  // Running Bounce (Vertical Bobbing)
  const isRunning = player.animationState === 'RUN' || player.animationState === 'DASH';
  const bounce = isRunning ? Math.sin(time * 0.8) * 2 : Math.sin(time * 0.1) * 0.5;
  ctx.translate(0, -bounce);

  const primary = player.color;
  const secondary = player.secondaryColor || '#FFFFFF';
  const charId = player.characterId || 'GREY';

  // --- 2. RENDER PARTS (Back to Front) ---

  // A. TAIL
  drawTail(ctx, time, primary, secondary, charId, isRunning);

  // B. BACK LEG (Far side)
  drawLeg(ctx, -6, 10, time, 0, primary, isRunning);

  // C. BODY
  drawBody(ctx, primary, secondary, charId);

  // D. HEAD & EARS
  drawHead(ctx, primary, charId);

  // E. FRONT LEG & ARM (Near side)
  drawLeg(ctx, 6, 12, time, Math.PI, primary, isRunning);
  // Attack Animation Check
  if (player.currentAttackType === 'NUT_THROW' && player.attackAnimTimer && player.attackAnimTimer > 0) {
      drawThrowingArm(ctx, player.attackAnimTimer, primary);
  } else {
      drawArm(ctx, time, primary, isRunning);
      // F. ITEM (The Nut) - Only when idle/running, not throwing
      drawHeldNut(ctx, time, isRunning);
  }

  ctx.restore();
};

export const drawDrop = (ctx: CanvasRenderingContext2D, drop: ItemDrop, time: number) => {
    ctx.save();
    ctx.translate(drop.x, drop.y);

    // Floating animation (Bobbing)
    const bob = Math.sin(time * 0.1 + (drop.x % 10)) * 3;
    ctx.translate(0, bob);

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(0, 12 - bob, drop.radius * 0.8, drop.radius * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();

    if (drop.kind === 'XP') {
        // Magical Blue Crystal Acorn
        ctx.rotate(Math.sin(time * 0.05) * 0.2); // Gentle sway

        // Glow
        ctx.shadowColor = '#4299e1';
        ctx.shadowBlur = 10;

        // Nut Body (Crystal shape-ish)
        ctx.fillStyle = '#63B3ED'; // Light Blue
        ctx.beginPath();
        ctx.moveTo(0, drop.radius);
        // Bevelled acorn shape
        ctx.bezierCurveTo(drop.radius, drop.radius * 0.5, drop.radius, -drop.radius * 0.5, 0, -drop.radius * 0.8);
        ctx.bezierCurveTo(-drop.radius, -drop.radius * 0.5, -drop.radius, drop.radius * 0.5, 0, drop.radius);
        ctx.fill();

        // Internal crystal refraction lines
        ctx.strokeStyle = 'rgba(255,255,255,0.4)';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(0, drop.radius); ctx.lineTo(drop.radius*0.4, -drop.radius*0.2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, drop.radius); ctx.lineTo(-drop.radius*0.4, -drop.radius*0.2); ctx.stroke();

        // Cap
        ctx.fillStyle = '#2B6CB0'; // Dark Blue
        ctx.beginPath();
        ctx.arc(0, -drop.radius * 0.8, drop.radius * 0.9, Math.PI, 0);
        ctx.fill();
        
        // Cap Scale Texture
        ctx.strokeStyle = '#4299e1';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(0, -drop.radius * 0.8, drop.radius * 0.6, Math.PI, 0); ctx.stroke();

        // Highlight/Sparkle
        if (Math.random() > 0.95) {
             ctx.fillStyle = 'white';
             ctx.beginPath(); ctx.arc(-drop.radius*0.3, 0, 1.5, 0, Math.PI*2); ctx.fill();
        }

    } else if (drop.kind === 'GOLD') {
        // Golden Walnut
        // Rotate slowly to show off shine
        ctx.scale(Math.cos(time * 0.05), 1); 

        // Glow
        ctx.shadowColor = '#F6E05E';
        ctx.shadowBlur = 5;

        ctx.fillStyle = '#D69E2E'; // Gold Base
        ctx.beginPath();
        ctx.arc(0, 0, drop.radius, 0, Math.PI * 2);
        ctx.fill();

        // Wrinkles (Walnut texture)
        ctx.strokeStyle = '#975A16'; // Darker Gold/Brown
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(0, -drop.radius);
        ctx.bezierCurveTo(drop.radius * 0.5, -drop.radius * 0.5, -drop.radius * 0.5, drop.radius * 0.5, 0, drop.radius);
        ctx.stroke();
        
        // Shine
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.beginPath();
        ctx.arc(-drop.radius*0.4, -drop.radius*0.4, 2, 0, Math.PI*2);
        ctx.fill();

    } else if (drop.kind === 'HEALTH_PACK') {
        // Red Heart-Nut (Chestnut/Berry style)
        
        ctx.shadowColor = '#FC8181';
        ctx.shadowBlur = 8;

        ctx.fillStyle = '#E53E3E'; // Red
        ctx.beginPath();
        // Heart/Chestnut shape
        const r = drop.radius;
        ctx.moveTo(0, r); 
        ctx.bezierCurveTo(r * 1.3, 0, r * 1.3, -r, 0, -r * 0.5);
        ctx.bezierCurveTo(-r * 1.3, -r, -r * 1.3, 0, 0, r);
        ctx.fill();

        // White Cross
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
         
         // Draw Acorn Body
         ctx.fillStyle = '#D7CCC8'; // Light Brown
         ctx.beginPath();
         ctx.ellipse(0, 0, p.radius * 0.6, p.radius, 0, 0, Math.PI*2);
         ctx.fill();

         // Draw Acorn Cap
         ctx.fillStyle = '#5D4037'; // Dark Brown
         ctx.beginPath();
         ctx.arc(0, -p.radius*0.3, p.radius * 0.65, Math.PI, 0); 
         ctx.fill();
         
         // Cap stem
         ctx.beginPath();
         ctx.moveTo(0, -p.radius);
         ctx.lineTo(0, -p.radius - 4);
         ctx.strokeStyle = '#5D4037';
         ctx.lineWidth = 3;
         ctx.stroke();

         ctx.restore();
    } else if (p.type === 'EXPLODING_ACORN') {
         // Bigger, rounder, heavier nut
         ctx.save();
         ctx.translate(p.x, p.y);
         ctx.rotate(p.rotation);
         
         // Body
         ctx.fillStyle = '#3E2723'; // Very dark brown
         ctx.beginPath(); ctx.ellipse(0, 0, p.radius * 0.8, p.radius, 0, 0, Math.PI*2); ctx.fill();
         
         // Cap (Metallic?)
         ctx.fillStyle = '#718096'; // Metal Grey Cap
         ctx.beginPath(); ctx.arc(0, -p.radius*0.4, p.radius * 0.85, Math.PI, 0); ctx.fill();
         ctx.strokeStyle = '#2D3748'; ctx.lineWidth=2; ctx.stroke();
         
         // Fuse sparkle
         if (Math.random() > 0.5) {
             ctx.fillStyle = '#ECC94B';
             ctx.beginPath(); ctx.arc(0, -p.radius - 2, 2, 0, Math.PI*2); ctx.fill();
         }

         ctx.restore();
    } else if (p.type === 'SAP_BLOB') {
        ctx.save();
        ctx.translate(p.x, p.y);
        
        // Wobbling glob
        const wobble = Math.sin(time * 0.5) * 2;
        
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Highlight
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.beginPath();
        ctx.arc(-2 + wobble*0.5, -2 - wobble*0.5, p.radius*0.3, 0, Math.PI*2);
        ctx.fill();
        
        ctx.restore();
    } else if (p.type === 'SAP_PUDDLE') {
        ctx.save();
        ctx.translate(p.x, p.y);
        
        // Pulsing size slightly
        const pulse = 1 + Math.sin(time * 0.05) * 0.05;
        ctx.scale(pulse, pulse);
        
        ctx.globalAlpha = 0.6;
        ctx.fillStyle = p.color;
        
        // Draw Irregular Puddle shape
        ctx.beginPath();
        const r = p.radius;
        ctx.moveTo(r, 0);
        ctx.bezierCurveTo(r, r*0.5, r*0.5, r, 0, r);
        ctx.bezierCurveTo(-r*0.5, r, -r, r*0.5, -r, 0);
        ctx.bezierCurveTo(-r, -r*0.5, -r*0.5, -r, 0, -r);
        ctx.bezierCurveTo(r*0.5, -r, r, -r*0.5, r, 0);
        ctx.fill();
        
        // Bubbles in puddle
        if (time % 60 < 30) {
            ctx.fillStyle = 'rgba(255,255,255,0.3)';
            ctx.beginPath();
            ctx.arc(r*0.3, -r*0.2, r*0.1, 0, Math.PI*2);
            ctx.fill();
        }
        
        ctx.restore();
    } else if (p.type === 'CROW') {
        // Draw Vector Crow
        ctx.save();
        ctx.translate(p.x, p.y);
        // Pulse on hit
        if (p.hitAnimTimer && p.hitAnimTimer > 0) {
            const scale = 1 + (p.hitAnimTimer * 0.05);
            ctx.scale(scale, scale);
            ctx.filter = 'brightness(200%)';
        }
        
        if (p.facing === 'LEFT') ctx.scale(-1, 1);

        // Flapping
        const flap = Math.sin(time * 0.5) * 5;

        // Body
        ctx.fillStyle = '#1A202C';
        ctx.beginPath(); ctx.ellipse(0, 0, 6, 3, 0, 0, Math.PI*2); ctx.fill();
        
        // Wings
        ctx.fillStyle = '#2D3748';
        ctx.beginPath(); ctx.moveTo(-2, -2); ctx.lineTo(8, -8 + flap); ctx.lineTo(4, 0); ctx.fill();
        ctx.beginPath(); ctx.moveTo(-2, 2); ctx.lineTo(8, 8 - flap); ctx.lineTo(4, 0); ctx.fill();
        
        // Head
        ctx.beginPath(); ctx.arc(4, -2, 2.5, 0, Math.PI*2); ctx.fill();
        
        // Beak
        ctx.fillStyle = '#ECC94B';
        ctx.beginPath(); ctx.moveTo(6, -2); ctx.lineTo(9, -1); ctx.lineTo(6, 0); ctx.fill();

        ctx.restore();
    } else if (p.type === 'SHOCKWAVE') {
        ctx.save();
        ctx.translate(p.x, p.y);
        
        // Expanding ring based on duration inversely
        const alpha = Math.min(1, p.duration / 10); // Fade out
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
        
        // Rocket body
        ctx.fillStyle = '#F56565';
        ctx.beginPath();
        ctx.rect(-8, -3, 12, 6);
        ctx.fill();
        
        // Fins
        ctx.fillStyle = '#742A2A';
        ctx.beginPath(); ctx.moveTo(-8, -3); ctx.lineTo(-12, -6); ctx.lineTo(-4, -3); ctx.fill();
        ctx.beginPath(); ctx.moveTo(-8, 3); ctx.lineTo(-12, 6); ctx.lineTo(-4, 3); ctx.fill();
        
        // Nose
        ctx.fillStyle = '#FEB2B2';
        ctx.beginPath(); ctx.moveTo(4, -3); ctx.lineTo(8, 0); ctx.lineTo(4, 3); ctx.fill();
        
        // Flame
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
    
    // Life is usually 15 frames
    const maxLife = 15;
    const life = p.duration;
    const progress = 1 - (life / maxLife); // 0 to 1
    
    const radius = p.radius * progress;
    const alpha = 1 - progress;
    
    // Shockwave Ring
    ctx.strokeStyle = `rgba(255, 200, 100, ${alpha})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, p.radius * progress * 1.2, 0, Math.PI * 2);
    ctx.stroke();

    // Flash Core
    if (progress < 0.3) {
        ctx.fillStyle = 'white';
        ctx.beginPath(); ctx.arc(0,0, radius * 0.8, 0, Math.PI*2); ctx.fill();
    }
    
    // Fireball
    const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
    grad.addColorStop(0, `rgba(255, 255, 0, ${alpha})`);
    grad.addColorStop(0.5, `rgba(255, 100, 0, ${alpha})`);
    grad.addColorStop(1, `rgba(50, 50, 50, 0)`);
    
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(0, 0, radius, 0, Math.PI*2); ctx.fill();
    
    // Debris particles (simple lines flying out)
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
    
    if (p.type === 'SMOKE') {
        ctx.globalAlpha = lifePct * 0.6;
        ctx.fillStyle = p.color;
        ctx.beginPath(); 
        ctx.arc(0, 0, p.radius * (2 - lifePct), 0, Math.PI*2); // Expand
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
    }
    
    ctx.restore();
};

export const drawTree = (ctx: CanvasRenderingContext2D, obs: Obstacle) => {
    ctx.save();
    ctx.translate(obs.x, obs.y);
    
    // Generate a pseudo-random seed based on position to keep consistent drawing per frame
    const seed = Math.abs(Math.sin(obs.x * obs.y)); 
    
    // Shadow base
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.ellipse(5, 10, obs.radius * 0.8, obs.radius * 0.3, 0, 0, Math.PI*2);
    ctx.fill();

    // -- TRUNK --
    ctx.fillStyle = '#4A3728'; // Dark wood
    if (obs.subtype === 'PINE') {
        ctx.fillRect(-obs.radius * 0.2, -obs.radius * 0.5, obs.radius * 0.4, obs.radius);
    } else {
        // Oak trunk
        ctx.beginPath();
        ctx.moveTo(-obs.radius * 0.3, 0);
        ctx.lineTo(obs.radius * 0.3, 0);
        ctx.lineTo(obs.radius * 0.2, -obs.radius * 0.8);
        ctx.lineTo(-obs.radius * 0.2, -obs.radius * 0.8);
        ctx.fill();
    }

    // -- FOLIAGE --
    
    // Variation in green
    const colorVar = seed * 40 - 20; 
    
    if (obs.subtype === 'PINE') {
        // Pine: 3 stacked triangles
        const baseColor = `rgb(${30 + colorVar}, ${80 + colorVar}, ${40 + colorVar})`; // Dark Pine Green
        ctx.fillStyle = baseColor;
        
        for (let i = 0; i < 3; i++) {
            const size = obs.radius * (1.2 - i * 0.3);
            const yOff = -obs.radius * 0.5 - (i * obs.radius * 0.5);
            
            ctx.beginPath();
            ctx.moveTo(-size, yOff + size/2);
            ctx.lineTo(size, yOff + size/2);
            ctx.lineTo(0, yOff - size);
            ctx.fill();
            
            // Shadow under layers
            if (i < 2) {
                ctx.fillStyle = 'rgba(0,0,0,0.2)';
                ctx.beginPath(); ctx.moveTo(-size*0.8, yOff + size/2); ctx.lineTo(size*0.8, yOff + size/2); ctx.lineTo(0, yOff + size/2 - 5); ctx.fill();
                ctx.fillStyle = baseColor; // Reset
            }
        }
    } else {
        // Oak / Round Tree
        // Draw 3-4 circles clustered
        const r = obs.radius * 0.7;
        const g = 100 + colorVar;
        ctx.fillStyle = `rgb(${20}, ${g}, ${40})`; // Base Green
        
        // Bottom cluster
        ctx.beginPath(); ctx.arc(-r*0.6, -r*0.5, r, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(r*0.6, -r*0.5, r, 0, Math.PI*2); ctx.fill();
        
        // Top light
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
    
    // Adjusted Scaling: Divide by 12 instead of 14 to make them visually larger relative to hitbox
    const scale = enemy.radius / 12;
    
    // BOSS TELEGRAPHS (Draw under enemy)
    if (enemy.bossState === 'WARN') {
        ctx.save();
        const alpha = 0.3 + Math.sin(time * 0.5) * 0.2; // Pulsing
        
        if (enemy.type === 'BRUTE_ZOMBIE') {
            // Circle AOE warning
            ctx.fillStyle = `rgba(255, 0, 0, ${alpha})`;
            ctx.beginPath(); ctx.arc(0, 0, 60, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = 'rgba(255, 0, 0, 0.8)';
            ctx.lineWidth = 2;
            ctx.stroke();
        } else if (enemy.type === 'TANK_BOT') {
            // Targeting Reticle / Lines
            ctx.strokeStyle = `rgba(255, 0, 0, ${alpha})`;
            ctx.lineWidth = 1;
            ctx.setLineDash([5, 5]);
            // Draw 3 lines fanning out
            for(let i=-1; i<=1; i++) {
                ctx.beginPath();
                ctx.moveTo(0, 0);
                // Approximate target direction (just fan forward for visual or use real target logic if passed)
                // We'll just draw a generic "danger zone" around
                const angle = (enemy.facing === 'RIGHT' ? 0 : Math.PI) + (i * 0.3);
                ctx.lineTo(Math.cos(angle)*100, Math.sin(angle)*100);
                ctx.stroke();
            }
        } else if (enemy.type === 'BOSS_ALIEN') {
            // Summoning Glow
            ctx.fillStyle = `rgba(184, 50, 128, ${alpha})`;
            ctx.beginPath(); 
            // Hexagon shape
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

    // --- NEW ELITE AURA DRAWING ---
    if (enemy.isElite) {
        ctx.save();
        const pulse = 1 + Math.sin(time * 0.15) * 0.1; 
        const rotation = time * 0.03;
        
        let auraColor = '#ffffff';
        let secondaryColor = '#ffffff';
        let particleShape = 'CIRCLE';

        if (enemy.eliteType === 'SPEED') { 
            auraColor = '#3182CE'; // Blue
            secondaryColor = '#90CDF4'; 
            particleShape = 'ARROW';
        } else if (enemy.eliteType === 'REGEN') { 
            auraColor = '#2F855A'; // Green
            secondaryColor = '#9AE6B4'; 
            particleShape = 'CROSS';
        } else if (enemy.eliteType === 'DAMAGE') { 
            auraColor = '#C53030'; // Red
            secondaryColor = '#FEB2B2'; 
            particleShape = 'SPIKE';
        }
        
        // 1. Underlay Glow
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = auraColor;
        ctx.beginPath();
        ctx.arc(0, 0, 35 * pulse, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;

        // 2. Complex Rotating Rings
        ctx.strokeStyle = auraColor;
        ctx.lineWidth = 2;
        
        // Outer Ring (Clockwise)
        ctx.save();
        ctx.rotate(rotation);
        ctx.scale(pulse, pulse);
        ctx.setLineDash([10, 10]);
        ctx.beginPath(); ctx.arc(0, 0, 42, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
        
        // Inner Ring (Counter-Clockwise)
        ctx.save();
        ctx.rotate(-rotation * 1.5);
        ctx.scale(pulse * 0.8, pulse * 0.8);
        ctx.strokeStyle = secondaryColor;
        ctx.setLineDash([5, 5]);
        ctx.beginPath(); ctx.arc(0, 0, 32, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();

        // 3. Orbiting Particles/Icons
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
            } else { // CROSS
                ctx.rect(-2, -6, 4, 12); ctx.rect(-6, -2, 12, 4);
            }
            ctx.fill();
            ctx.restore();
        }
        
        ctx.restore();
    }

    // Flip if facing left
    const dir = enemy.facing === 'LEFT' ? -1 : 1;
    ctx.scale(dir * scale, scale);

    // Hit Flash Effect (Wobble + Brightness)
    if (enemy.hitFlashTimer && enemy.hitFlashTimer > 0) {
        ctx.filter = 'brightness(150%) sepia(30%)'; 
        // Recoil shake
        ctx.translate(Math.random() * 2 - 1, Math.random() * 2 - 1);
    }

    // Common Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.ellipse(0, 8, 10, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // --- NEW ELITE BODY GLOW ---
    if (enemy.isElite && (!enemy.hitFlashTimer || enemy.hitFlashTimer <= 0)) {
         let glowColor = '#ffffff';
         if (enemy.eliteType === 'SPEED') glowColor = '#63B3ED'; 
         else if (enemy.eliteType === 'REGEN') glowColor = '#68D391'; 
         else if (enemy.eliteType === 'DAMAGE') glowColor = '#FC8181';
         
         // Animated pulsing outline
         const glowIntensity = 10 + Math.sin(time * 0.2) * 5;
         ctx.shadowColor = glowColor;
         ctx.shadowBlur = glowIntensity; 
    }

    // -- PARK ENEMIES --
    if (enemy.type === 'ZOMBIE') {
        drawZombie(ctx, time, enemy);
    } else if (enemy.type === 'RUNNER_ZOMBIE') {
        drawConeheadZombie(ctx, time, enemy);
    } else if (enemy.type === 'BRUTE_ZOMBIE') {
        drawBruteZombie(ctx, time, enemy);
    
    // -- PARKING LOT ENEMIES --
    } else if (enemy.type === 'ROBOT') {
        drawRobot(ctx, time, enemy);
    } else if (enemy.type === 'CYBER_HOUND') {
        drawDrone(ctx, time, enemy); 
    } else if (enemy.type === 'TANK_BOT') {
        drawMech(ctx, time, enemy);

    // -- MARS ENEMIES --
    } else if (enemy.type === 'ALIEN') {
        drawAlien(ctx, time, enemy);
    } else if (enemy.type === 'MARTIAN_SPIDER') {
        drawGrayAlien(ctx, time, enemy);
    } else if (enemy.type === 'BOSS_ALIEN') {
        drawSaucer(ctx, time, enemy);
    } else {
        // Fallback
        drawZombie(ctx, time, enemy);
    }
    
    // Reset Filters
    ctx.filter = 'none';
    
    // Health Bar (Local to enemy transform, counter-scaled to stay consistent size/rotation)
    if (enemy.hp < enemy.maxHp) {
        ctx.save();
        ctx.scale(1/scale, 1/scale); // Undo enemy scale for crisp UI
        if (dir === -1) ctx.scale(-1, 1); // Undo flip text/bar direction
        
        const hpPct = Math.max(0, enemy.hp / enemy.maxHp);
        const barW = 28;
        const barH = 4;
        const barY = -35 * scale; 

        // Bar BG
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.beginPath();
        ctx.roundRect(-barW/2, barY, barW, barH, 2);
        ctx.fill();
        
        // Bar FG
        ctx.fillStyle = hpPct > 0.5 ? '#48bb78' : (hpPct > 0.25 ? '#ecc94b' : '#f56565');
        ctx.beginPath();
        ctx.roundRect(-barW/2, barY, barW * hpPct, barH, 2);
        ctx.fill();
        
        ctx.restore();
    }

    ctx.restore();
};


// --- SUB-COMPONENT RENDERERS ---

const drawTail = (
    ctx: CanvasRenderingContext2D, 
    time: number, 
    color: string, 
    highlight: string, 
    charId: string,
    isRunning: boolean
) => {
    ctx.save();
    
    // Tail Physics
    const swaySpeed = isRunning ? 0.8 : 0.2;
    const swayAmp = isRunning ? 5 : 2;
    const tipSway = Math.sin(time * swaySpeed) * swayAmp;

    ctx.beginPath();
    
    if (charId === 'RED') {
        // Red: High, bushy, flame-like tail
        ctx.moveTo(-10, 5);
        ctx.bezierCurveTo(-25, 0, -35 + tipSway, -30, -15 + (tipSway*0.5), -45);
        ctx.bezierCurveTo(-10 + tipSway, -30, -5, -10, -10, 5);
    } else if (charId === 'GIANT') {
        // Giant: Thick, heavy, low-slung tail
        ctx.moveTo(-12, 8);
        ctx.bezierCurveTo(-35, 15, -50, -5, -40 + tipSway, -25);
        ctx.bezierCurveTo(-30 + tipSway, -20, -15, 0, -12, 8);
    } else {
        // Grey: Classic S-Curve
        ctx.moveTo(-10, 5);
        ctx.bezierCurveTo(-30, 10, -45 + tipSway, -20, -10 + (tipSway*0.5), -35);
        ctx.bezierCurveTo(-25 + tipSway, -25, -20, 0, -10, 5);
    }
    
    // Fill with gradient for volume
    const grad = ctx.createLinearGradient(-30, 0, 0, 0);
    grad.addColorStop(0, highlight);
    grad.addColorStop(1, color);
    ctx.fillStyle = grad;
    ctx.fill();
    
    // Outline
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.stroke();

    // Fluff details (simple lines)
    ctx.strokeStyle = highlight;
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.moveTo(-20, -10); ctx.quadraticCurveTo(-25, -15, -18, -20);
    ctx.stroke();
    ctx.globalAlpha = 1.0;

    ctx.restore();
};

const drawBody = (ctx: CanvasRenderingContext2D, color: string, bellyColor: string, charId: string) => {
    ctx.beginPath();
    
    if (charId === 'GIANT') {
        // Bulkier, slightly hunched body
        ctx.ellipse(0, 6, 14, 15, Math.PI / 10, 0, Math.PI * 2);
    } else {
        // Athletic egg shape
        ctx.ellipse(0, 5, 11, 14, Math.PI / 8, 0, Math.PI * 2);
    }
    
    ctx.fillStyle = color;
    ctx.fill();
    
    // Belly patch
    ctx.beginPath();
    ctx.ellipse(3, 6, 6, 10, Math.PI / 8, 0, Math.PI * 2);
    ctx.fillStyle = bellyColor;
    ctx.fill();
};

const drawHead = (ctx: CanvasRenderingContext2D, color: string, charId: string) => {
    // Head Base
    ctx.beginPath();
    const headSize = charId === 'GIANT' ? 10 : 11;
    ctx.arc(6, -9, headSize, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();

    // Ears
    drawEars(ctx, color, charId);

    // Face Features
    // Eye
    ctx.beginPath();
    ctx.arc(9, -11, 3.5, 0, Math.PI * 2);
    ctx.fillStyle = 'black';
    ctx.fill();
    // Shine
    ctx.beginPath();
    ctx.arc(10, -12, 1.2, 0, Math.PI * 2);
    ctx.fillStyle = 'white';
    ctx.fill();

    // Nose
    ctx.beginPath();
    ctx.arc(16, -7, 1.5, 0, Math.PI * 2);
    ctx.fillStyle = 'black'; // Pink nose? '#FFC0CB'
    ctx.fill();

    // Whiskers (Subtle)
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(16, -6); ctx.lineTo(20, -4);
    ctx.moveTo(16, -5); ctx.lineTo(19, -2);
    ctx.stroke();
};

const drawEars = (ctx: CanvasRenderingContext2D, color: string, charId: string) => {
    ctx.fillStyle = color;
    
    if (charId === 'RED') {
        // Pointy with Tufts
        // Back Ear
        ctx.beginPath(); ctx.moveTo(2, -18); ctx.lineTo(-2, -32); ctx.lineTo(-6, -16); ctx.fill();
        // Front Ear
        ctx.beginPath(); ctx.moveTo(10, -18); ctx.lineTo(14, -32); ctx.lineTo(18, -16); ctx.fill();
    } else if (charId === 'GIANT') {
        // Small, Round Bear Ears
        // Back
        ctx.beginPath(); ctx.arc(0, -18, 4, 0, Math.PI*2); ctx.fill();
        // Front
        ctx.beginPath(); ctx.arc(12, -18, 4, 0, Math.PI*2); ctx.fill();
    } else {
        // Standard Squirrel Ears
        // Back
        ctx.beginPath(); ctx.moveTo(2, -18); ctx.lineTo(-2, -28); ctx.lineTo(-6, -16); ctx.fill();
        // Front
        ctx.beginPath(); ctx.moveTo(10, -18); ctx.lineTo(14, -28); ctx.lineTo(18, -16); ctx.fill();
    }
};

const drawLeg = (ctx: CanvasRenderingContext2D, x: number, y: number, time: number, phase: number, color: string, isRunning: boolean) => {
    // Only animate legs if running
    const legOffset = isRunning ? Math.sin(time * 0.8 + phase) * 6 : 0;
    
    ctx.beginPath();
    // Thigh
    ctx.ellipse(x + legOffset * 0.5, y, 6, 6, 0, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    
    // Foot
    ctx.beginPath();
    ctx.ellipse(x + legOffset, y + 5, 5, 2.5, 0, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
};

const drawArm = (ctx: CanvasRenderingContext2D, time: number, color: string, isRunning: boolean) => {
    const armSway = isRunning ? Math.sin(time * 0.8) * 3 : Math.sin(time * 0.1) * 1;
    
    ctx.beginPath();
    ctx.ellipse(10 + armSway, 4, 4, 2.5, Math.PI / 4, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
};

const drawThrowingArm = (ctx: CanvasRenderingContext2D, animTimer: number, color: string) => {
    // animTimer goes from 15 down to 0
    // 15-10: Wind up (Back)
    // 10-0: Throw (Forward whip)
    
    let angle = 0;
    let xOff = 0;
    
    if (animTimer > 10) {
        const t = (15 - animTimer) / 5; // 0 to 1
        angle = -Math.PI/2 * t; // Rotate back 90 deg
        xOff = -t * 5;
    } else {
        const t = (10 - animTimer) / 10; // 0 to 1
        angle = (-Math.PI/2) + (Math.PI * t); // From -90 to +90
        xOff = -5 + (t * 15);
    }

    ctx.save();
    ctx.translate(10, 4); // Shoulder pivot
    ctx.rotate(angle);
    
    ctx.beginPath();
    ctx.ellipse(xOff, 0, 6, 3, 0, 0, Math.PI * 2); // Stretched arm
    ctx.fillStyle = color;
    ctx.fill();
    
    ctx.restore();
};

const drawHeldNut = (ctx: CanvasRenderingContext2D, time: number, isRunning: boolean) => {
    const armSway = isRunning ? Math.sin(time * 0.8) * 3 : Math.sin(time * 0.1) * 1;
    
    // Nut position relative to hand
    const nx = 14 + armSway;
    const ny = 2;

    // Draw simple Acorn
    ctx.fillStyle = '#5D4037'; // Dark brown cap
    ctx.beginPath();
    ctx.arc(nx, ny - 1, 3, Math.PI, 0); // Cap top
    ctx.fill();
    
    ctx.fillStyle = '#D7CCC8'; // Light nut
    ctx.beginPath();
    ctx.ellipse(nx, ny + 1, 2.5, 3.5, 0, 0, Math.PI*2);
    ctx.fill();
};

export const drawDashEffect = (ctx: CanvasRenderingContext2D, player: Player) => {
    if (!player.isDashing) return;
    
    ctx.save();
    ctx.translate(player.x, player.y);
    if (player.facing === 'LEFT') ctx.scale(-1, 1);
    
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = '#FFFFFF';
    
    // Wind lines
    ctx.beginPath(); ctx.rect(-25, -10, 20, 2); ctx.fill();
    ctx.beginPath(); ctx.rect(-35, 0, 30, 2); ctx.fill();
    ctx.beginPath(); ctx.rect(-25, 10, 15, 2); ctx.fill();
    
    // Dust cloud
    ctx.fillStyle = '#A0AEC0';
    ctx.beginPath(); ctx.arc(-20, 15, 4, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(-30, 12, 6, 0, Math.PI*2); ctx.fill();

    ctx.restore();
};

// --- ENEMY RENDERERS (VARIANTS) ---

const drawZombie = (ctx: CanvasRenderingContext2D, time: number, enemy: Enemy) => {
    const idVal = parseInt(enemy.id.split('-').pop() || '0') * 100;
    const isAttacking = enemy.attackTimer && enemy.attackTimer > 0;
    const bob = Math.sin((time * 0.1) + idVal) * 2;
    
    // Attack Lunge Calculation (0 to 1 back to 0)
    const attackPhase = isAttacking ? Math.sin((enemy.attackTimer! / 30) * Math.PI) : 0;
    const attackOffset = attackPhase * 8; // Lunges forward 8px

    const armSway = isAttacking 
        ? 12 + attackPhase * 5 // Arms stiffen and reach further
        : Math.sin(time * 0.15 + idVal) * 5;

    ctx.save();
    
    // Unique Idle: Shambling Breath (Squash & Stretch)
    if (!isAttacking) {
        const breathSpeed = 0.05;
        const breathAmp = 0.03;
        const breath = Math.sin(time * breathSpeed + idVal) * breathAmp;
        // Scale Y slightly more than X for breathing
        ctx.scale(1.0 - breath * 0.5, 1.0 + breath);
        // Keep feet roughly planted
        ctx.translate(0, -breath * 10); 
    }

    ctx.translate(attackOffset, 0); // Apply lunge

    // Legs - tattered pants
    ctx.fillStyle = '#1A202C'; // Dark pants
    ctx.beginPath(); ctx.moveTo(-4, 8); ctx.lineTo(-4, 14); ctx.lineTo(-1, 14); ctx.lineTo(-1, 8); ctx.fill();
    ctx.beginPath(); ctx.moveTo(1, 8); ctx.lineTo(1, 14); ctx.lineTo(4, 14); ctx.lineTo(4, 8); ctx.fill();

    // Body - Tattered shirt
    const bodyY = -6 + bob;
    ctx.fillStyle = '#4A5568';
    ctx.beginPath(); 
    ctx.moveTo(-6, bodyY); 
    ctx.lineTo(6, bodyY); 
    ctx.lineTo(6, bodyY + 14);
    // Ragged bottom
    ctx.lineTo(3, bodyY + 12);
    ctx.lineTo(0, bodyY + 14);
    ctx.lineTo(-3, bodyY + 12);
    ctx.lineTo(-6, bodyY + 14);
    ctx.fill();

    // Head
    const headY = -10 + bob + (isAttacking ? 2 : 0); // Head dips down slightly
    const skinColor = '#68D391';
    ctx.fillStyle = skinColor;
    ctx.beginPath(); ctx.arc(0, headY, 7, 0, Math.PI * 2); ctx.fill();

    // Face
    // Eye socket
    ctx.fillStyle = '#1A202C';
    ctx.beginPath(); ctx.arc(3, headY - 1, 2, 0, Math.PI*2); ctx.fill();
    // Red pupil
    ctx.fillStyle = '#E53E3E';
    ctx.beginPath(); ctx.arc(3, headY - 1, 1, 0, Math.PI*2); ctx.fill();
    
    // Mouth (Changes on attack)
    if (isAttacking) {
        ctx.fillStyle = '#742A2A'; // Dark Red mouth interior
        ctx.beginPath(); ctx.arc(2, headY + 3, 2.5, 0, Math.PI * 2); ctx.fill();
    }

    // Arms - reaching out
    ctx.strokeStyle = skinColor; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, bodyY + 2); ctx.lineTo(12, bodyY + armSway); ctx.stroke();
    
    // Decay spots
    ctx.fillStyle = 'rgba(0,0,0,0.1)';
    ctx.beginPath(); ctx.arc(-2, headY - 3, 1.5, 0, Math.PI*2); ctx.fill();
    
    ctx.restore();
};

const drawConeheadZombie = (ctx: CanvasRenderingContext2D, time: number, enemy: Enemy) => {
    // Reuse zombie base, but overlay cone
    const idVal = parseInt(enemy.id.split('-').pop() || '0') * 100;
    const isAttacking = enemy.attackTimer && enemy.attackTimer > 0;
    const bob = Math.sin((time * 0.1) + idVal) * 2;
    const attackPhase = isAttacking ? Math.sin((enemy.attackTimer! / 30) * Math.PI) : 0;
    const attackOffset = attackPhase * 8;
    
    ctx.save();
    
    // Same breathing as zombie
    if (!isAttacking) {
        const breath = Math.sin(time * 0.05 + idVal) * 0.03;
        ctx.scale(1.0 - breath * 0.5, 1.0 + breath);
        ctx.translate(0, -breath * 10); 
    }

    ctx.translate(attackOffset, 0); // Sync lunge

    // Draw base zombie first (without duplicating the breathing logic inside, but drawZombie applies it too. 
    // To avoid double breathing, we manually draw logic here or reset scale. 
    // For simplicity, we'll just draw a simplified zombie here or assume `drawZombie` internal logic handles context save/restore cleanly.
    // Since `drawZombie` has `ctx.save()` at start, calling it here is safe, but it WILL apply breathing twice if we are not careful.
    // Actually, `drawZombie` applies breathing inside its own `save/restore`. 
    // So if we apply breathing here, we apply it to the CONE, and `drawZombie` applies it to the BODY.
    // Correct approach: Call `drawZombie` (it handles body breathing), then match that transform for the cone manually.
    
    // IMPORTANT: We want the cone to match the head. `drawZombie` calculates `headY` internally based on `bob`.
    // We need to replicate that calculation.
    
    // Call drawZombie logic (which includes breathing inside its save block)
    drawZombie(ctx, time, enemy);

    // Now we need to draw the cone. We need to MATCH the breathing transform IF we want it to look attached.
    // But `drawZombie` restores context. So we are back to base transform.
    // We need to re-apply breathing to the cone to match the head.
    if (!isAttacking) {
        const breath = Math.sin(time * 0.05 + idVal) * 0.03;
        ctx.scale(1.0 - breath * 0.5, 1.0 + breath);
        ctx.translate(0, -breath * 10); 
    }

    const headY = -10 + bob + (isAttacking ? 2 : 0);
    
    // Cone Animation: Tilt forward on attack
    const coneTilt = attackPhase * 0.5; // Radians

    ctx.translate(0, headY - 4);
    ctx.rotate(coneTilt);

    // Cone
    ctx.fillStyle = '#ED8936'; // Orange
    ctx.beginPath();
    ctx.moveTo(-7, 0);
    ctx.lineTo(7, 0);
    ctx.lineTo(0, -20);
    ctx.fill();
    
    // Stripes
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-3, -8); ctx.lineTo(3, -8);
    ctx.stroke();

    ctx.restore();
};

const drawBruteZombie = (ctx: CanvasRenderingContext2D, time: number, enemy: Enemy) => {
    const idVal = parseInt(enemy.id.split('-').pop() || '0') * 100;
    const isAttacking = enemy.attackTimer && enemy.attackTimer > 0;
    const bob = Math.sin((time * 0.05) + idVal) * 1.5; 
    
    const attackPhase = isAttacking ? Math.sin((enemy.attackTimer! / 30) * Math.PI) : 0;
    
    // Attack: Raise up then Slam down
    const slamY = attackPhase > 0.8 ? 5 : -attackPhase * 5; 

    ctx.save();
    
    // Unique Idle: Heavy Breathing (Deep & Slow)
    if (!isAttacking) {
        const breathSpeed = 0.03; // Slower
        const breathAmp = 0.05;   // More intense
        const breath = Math.sin(time * breathSpeed + idVal) * breathAmp;
        // Brute expands width more than height (heaving chest)
        ctx.scale(1.0 + breath, 1.0 + breath * 0.5);
        ctx.translate(0, -breath * 5);
    }

    ctx.translate(0, slamY);

    // Big Body
    ctx.fillStyle = '#2D3748'; // Dark clothes
    ctx.beginPath(); ctx.ellipse(0, 0 + bob, 14, 16, 0, 0, Math.PI*2); ctx.fill();

    // Small Head
    ctx.fillStyle = '#48BB78'; // Brighter Green
    ctx.beginPath(); ctx.arc(0, -16 + bob, 5, 0, Math.PI * 2); ctx.fill();

    // Angry Eyes
    ctx.fillStyle = '#E53E3E';
    ctx.beginPath(); ctx.arc(2, -16 + bob, 1.5, 0, Math.PI*2); ctx.fill();
    
    // Heavy Arms - Smash Animation
    ctx.strokeStyle = '#48BB78'; ctx.lineWidth = 6; ctx.lineCap = 'round';
    ctx.beginPath(); 
    ctx.moveTo(-6, 0 + bob); 
    
    if (isAttacking) {
        // Arms up then down
        const armY = attackPhase > 0.5 ? 10 : -15;
        const armX = 14;
        ctx.lineTo(armX, armY + bob);
    } else {
        ctx.lineTo(12, 5 + bob);
    }
    ctx.stroke();

    // Impact Dust (On slam)
    if (isAttacking && attackPhase > 0.8) {
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.beginPath(); ctx.arc(12, 12, 6, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(-4, 12, 4, 0, Math.PI*2); ctx.fill();
    }

    ctx.restore();
};

const drawRobot = (ctx: CanvasRenderingContext2D, time: number, enemy: Enemy) => {
    const idVal = parseInt(enemy.id.split('-').pop() || '0') * 100;
    const hover = Math.sin(time * 0.2 + idVal) * 2;
    const isAttacking = enemy.attackTimer && enemy.attackTimer > 0;

    ctx.save();

    // Unique Idle: Mechanical Jitter / Twitch
    if (!isAttacking) {
        // Occasional "glitch" offset
        const twitchCycle = Math.sin(time * 0.1 + idVal);
        if (twitchCycle > 0.95) {
             const jitterX = (Math.random() - 0.5) * 2;
             ctx.translate(jitterX, 0);
        }
        // Subtle servo rotation
        ctx.rotate(Math.sin(time * 0.05) * 0.05);
    }

    // Treads
    ctx.fillStyle = '#1A202C';
    ctx.beginPath(); ctx.roundRect(-8, 8 + hover, 16, 6, 2); ctx.fill();
    // Tread texture
    ctx.strokeStyle = '#4A5568'; ctx.lineWidth = 1;
    for(let i=0; i<4; i++) {
        ctx.beginPath(); ctx.moveTo(-6 + i*4, 8 + hover); ctx.lineTo(-6+i*4, 14+hover); ctx.stroke();
    }

    // Body with Metallic Gradient
    const grad = ctx.createLinearGradient(-6, -4 + hover, 6, 10 + hover);
    grad.addColorStop(0, '#A0AEC0');
    grad.addColorStop(1, '#718096');
    ctx.fillStyle = grad;
    
    ctx.beginPath(); ctx.rect(-6, -4 + hover, 12, 12); ctx.fill();
    ctx.strokeStyle = '#4A5568'; ctx.strokeRect(-6, -4 + hover, 12, 12);

    // Head/Visor
    ctx.fillStyle = '#E2E8F0'; ctx.beginPath(); ctx.rect(-5, -12 + hover, 10, 8); ctx.fill();
    
    // Eye Logic
    const scan = isAttacking ? 0 : Math.sin(time * 0.2) * 3;
    
    if (isAttacking) {
        // Attack: Flash Eye
        ctx.fillStyle = (Math.floor(time / 4) % 2 === 0) ? '#FFFF00' : '#F56565';
        ctx.shadowColor = '#F56565';
        ctx.shadowBlur = 10;
    } else {
        ctx.fillStyle = '#F56565'; 
        ctx.shadowBlur = 0;
    }
    
    ctx.beginPath(); ctx.rect(-2 + scan, -10 + hover, 4, 3); ctx.fill();
    ctx.shadowBlur = 0; // Reset
    
    // Sparks if attacking
    if (isAttacking && Math.random() > 0.5) {
        ctx.strokeStyle = '#FFFF00';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(4, -8 + hover); ctx.lineTo(8, -12 + hover);
        ctx.stroke();
    }
    
    // Antenna (Wags if idle)
    const antennaWag = !isAttacking ? Math.sin(time * 0.5) * 2 : 0;
    ctx.beginPath(); ctx.moveTo(0, -12+hover); ctx.lineTo(antennaWag, -16+hover); ctx.stroke();
    ctx.fillStyle = 'red'; ctx.beginPath(); ctx.arc(antennaWag, -17+hover, 1, 0, Math.PI*2); ctx.fill();

    ctx.restore();
};

const drawDrone = (ctx: CanvasRenderingContext2D, time: number, enemy: Enemy) => {
    const idVal = parseInt(enemy.id.split('-').pop() || '0') * 100;
    const isAttacking = enemy.attackTimer && enemy.attackTimer > 0;
    const hover = Math.sin(time * 0.3 + idVal) * 4;
    
    // Lunge movement
    const attackPhase = isAttacking ? Math.sin((enemy.attackTimer! / 30) * Math.PI) : 0;
    const lunge = attackPhase * 15;

    ctx.save();
    
    // Unique Idle: Figure-8 Drift
    if (!isAttacking) {
        const driftX = Math.cos(time * 0.05 + idVal) * 3;
        const driftY = Math.sin(time * 0.1 + idVal) * 1.5;
        ctx.translate(driftX, driftY);
    }

    ctx.translate(lunge, 0);

    // Center Core
    const grad = ctx.createRadialGradient(0, hover, 0, 0, hover, 6);
    grad.addColorStop(0, isAttacking ? '#E53E3E' : '#63B3ED'); // Turns red
    grad.addColorStop(1, '#2B6CB0');
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(0, hover, 6, 0, Math.PI*2); ctx.fill();
    
    // Lens
    ctx.fillStyle = '#1A202C';
    ctx.beginPath(); ctx.arc(0, hover, 3, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = isAttacking ? '#FFFF00' : '#F56565';
    ctx.beginPath(); ctx.arc(0, hover, 1.5, 0, Math.PI*2); ctx.fill();

    // Propellers (Spin faster on attack)
    ctx.fillStyle = 'rgba(203, 213, 224, 0.5)';
    // const spinSpeed = isAttacking ? 2.0 : 0.8;
    
    // Left Prop
    ctx.save();
    ctx.translate(-8, hover);
    ctx.scale(1, 0.2);
    ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI*2); ctx.fill();
    ctx.restore();
    
    // Right Prop
    ctx.save();
    ctx.translate(8, hover);
    ctx.scale(1, 0.2);
    ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI*2); ctx.fill();
    ctx.restore();

    ctx.restore();
};

const drawMech = (ctx: CanvasRenderingContext2D, time: number, enemy: Enemy) => {
    const idVal = parseInt(enemy.id.split('-').pop() || '0') * 100;
    const walk = Math.sin(time * 0.15 + idVal) * 4;
    const isAttacking = enemy.attackTimer && enemy.attackTimer > 0;
    const attackPhase = isAttacking ? Math.sin((enemy.attackTimer! / 30) * Math.PI) : 0;
    
    // Recoil
    const recoilX = -attackPhase * 4;

    ctx.save();
    
    // Unique Idle: Engine Vibration
    if (!isAttacking) {
        const vibrate = Math.sin(time * 50) * 0.5; // High frequency
        ctx.translate(vibrate, vibrate * 0.5);
    }

    ctx.translate(recoilX, 0);

    // Legs - Hydraulic
    ctx.strokeStyle = '#2D3748'; ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    // Back leg
    ctx.beginPath(); ctx.moveTo(-6, 0); ctx.lineTo(-10, 14 - walk); ctx.stroke();
    // Front leg
    ctx.beginPath(); ctx.moveTo(6, 0); ctx.lineTo(10, 14 + walk); ctx.stroke();

    // Bulky Body
    ctx.fillStyle = '#4A5568';
    ctx.beginPath(); ctx.roundRect(-10, -10, 20, 16, 3); ctx.fill();

    // Cannon Arm
    ctx.fillStyle = '#1A202C';
    ctx.beginPath(); ctx.rect(8, -2, 10, 6); ctx.fill();
    
    // Muzzle Flash
    if (isAttacking && attackPhase > 0.5) {
         ctx.fillStyle = '#F6E05E';
         ctx.beginPath();
         ctx.arc(20, 1, 6 + Math.random()*4, 0, Math.PI*2);
         ctx.fill();
    } else {
        // Cannon Hole
        ctx.fillStyle = '#F56565';
        ctx.beginPath(); ctx.ellipse(18, 1, 1, 2, 0, 0, Math.PI*2); ctx.fill();
    }

    // Cockpit Window
    ctx.fillStyle = '#F6AD55';
    ctx.beginPath(); ctx.roundRect(-5, -8, 8, 6, 1); ctx.fill();
    
    ctx.restore();
};

const drawAlien = (ctx: CanvasRenderingContext2D, time: number, enemy: Enemy) => {
    const idVal = parseInt(enemy.id.split('-').pop() || '0') * 100;
    const isAttacking = enemy.attackTimer && enemy.attackTimer > 0;
    const pulse = Math.sin(time * 0.15 + idVal) * 0.1;
    
    ctx.save();

    // Unique Idle: Biological Pulsation (Extra Squirm)
    if (!isAttacking) {
        // Skew/Warp
        const warp = Math.sin(time * 0.2 + idVal) * 0.1;
        ctx.transform(1, warp, 0, 1, 0, 0);
    }

    ctx.scale(1 + pulse, 1 - pulse);

    // Jelly Body - Translucent
    ctx.fillStyle = isAttacking ? 'rgba(213, 63, 140, 0.9)' : 'rgba(184, 50, 128, 0.8)';
    ctx.beginPath(); 
    // Slime shape
    ctx.moveTo(-10, 5);
    ctx.bezierCurveTo(-12, -10, 12, -10, 10, 5);
    ctx.bezierCurveTo(8, 8, -8, 8, -10, 5);
    ctx.fill();
    
    // Internal Organs / Nucleus
    ctx.fillStyle = 'rgba(255, 100, 200, 0.8)';
    ctx.beginPath(); ctx.arc(0, -2, 4, 0, Math.PI*2); ctx.fill();

    // Tentacles / Spikes
    ctx.strokeStyle = '#D53F8C'; ctx.lineWidth = 2; ctx.lineCap = 'round';
    
    if (isAttacking) {
        // Spikes protrude
        for(let i=0; i<3; i++) {
             const angle = (Math.PI/4) + i * (Math.PI/4); // Fan out
             const sx = Math.cos(angle) * 12;
             const sy = Math.sin(angle) * 12;
             ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(sx, -sy); ctx.stroke();
        }
    } else {
        const tentacleWiggle = Math.sin(time * 0.3 + idVal) * 3;
        for(let i=0; i<3; i++) {
            const tx = -6 + i*6;
            ctx.beginPath(); ctx.moveTo(tx, 5);
            ctx.quadraticCurveTo(tx + tentacleWiggle, 10, tx, 15); ctx.stroke();
        }
    }
    ctx.restore();
};

const drawGrayAlien = (ctx: CanvasRenderingContext2D, time: number, enemy: Enemy) => {
    const idVal = parseInt(enemy.id.split('-').pop() || '0') * 100;
    const bob = Math.sin(time * 0.1 + idVal) * 2;
    const isAttacking = enemy.attackTimer && enemy.attackTimer > 0;

    ctx.save();

    // Unique Idle: Psychic Sway
    if (!isAttacking) {
        const sway = Math.sin(time * 0.08 + idVal) * 0.1;
        ctx.rotate(sway);
    }

    // Skinny Body
    ctx.fillStyle = '#A0AEC0';
    ctx.beginPath(); ctx.roundRect(-3, -2 + bob, 6, 12, 2); ctx.fill();

    // Big Head (Inverted pear)
    ctx.fillStyle = '#CBD5E0';
    ctx.beginPath(); 
    ctx.moveTo(0, 4 + bob);
    ctx.bezierCurveTo(-12, -10 + bob, -10, -20 + bob, 0, -22 + bob);
    ctx.bezierCurveTo(10, -20 + bob, 12, -10 + bob, 0, 4 + bob);
    ctx.fill();

    // Psychic Waves (Rings)
    if (isAttacking) {
        ctx.strokeStyle = `rgba(159, 122, 234, ${Math.abs(Math.sin(time * 0.2))})`;
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(0, -10 + bob, 15, 0, Math.PI*2); ctx.stroke();
        ctx.beginPath(); ctx.arc(0, -10 + bob, 20, 0, Math.PI*2); ctx.stroke();
    }

    // Big Black Eyes with Reflection
    const eyeY = -10 + bob;
    ctx.fillStyle = isAttacking ? '#44337A' : 'black'; // Glow purple
    
    // Left
    ctx.save();
    ctx.translate(-4, eyeY); ctx.rotate(-0.3); 
    ctx.beginPath(); ctx.ellipse(0,0, 3.5, 5, 0, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle='white'; ctx.beginPath(); ctx.arc(1, -2, 1, 0, Math.PI*2); ctx.fill();
    ctx.restore();
    
    // Right
    ctx.fillStyle = isAttacking ? '#44337A' : 'black';
    ctx.save();
    ctx.translate(4, eyeY); ctx.rotate(0.3); 
    ctx.beginPath(); ctx.ellipse(0,0, 3.5, 5, 0, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle='white'; ctx.beginPath(); ctx.arc(-1, -2, 1, 0, Math.PI*2); ctx.fill();
    ctx.restore();
    
    ctx.restore();
};

const drawSaucer = (ctx: CanvasRenderingContext2D, time: number, enemy: Enemy) => {
    const idVal = parseInt(enemy.id.split('-').pop() || '0') * 100;
    const hover = Math.sin(time * 0.2 + idVal) * 5;
    const isAttacking = enemy.attackTimer && enemy.attackTimer > 0;
    
    ctx.save();

    // Unique Idle: Gyroscopic Wobble
    if (!isAttacking) {
        const wobble = Math.sin(time * 0.15 + idVal) * 0.15;
        ctx.rotate(wobble);
    }

    // Attack Beam
    if (isAttacking) {
        const grad = ctx.createLinearGradient(0, 0, 0, 30);
        grad.addColorStop(0, 'rgba(255, 255, 0, 0.6)');
        grad.addColorStop(1, 'rgba(255, 255, 0, 0)');
        ctx.fillStyle = grad;
        
        ctx.beginPath();
        ctx.moveTo(-5, 0 + hover);
        ctx.lineTo(5, 0 + hover);
        ctx.lineTo(12, 40 + hover);
        ctx.lineTo(-12, 40 + hover);
        ctx.fill();
    }

    // Dome
    ctx.fillStyle = 'rgba(99, 179, 237, 0.6)'; // Glass
    ctx.beginPath(); ctx.arc(0, -5 + hover, 8, Math.PI, 0); ctx.fill();
    // Pilot Outline
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.beginPath(); ctx.arc(0, -5+hover, 3, 0, Math.PI*2); ctx.fill();

    // Disc Metal
    const grad = ctx.createLinearGradient(-18, 0, 18, 0);
    grad.addColorStop(0, '#4A5568');
    grad.addColorStop(0.5, '#A0AEC0');
    grad.addColorStop(1, '#4A5568');
    ctx.fillStyle = grad;
    
    ctx.beginPath(); ctx.ellipse(0, 0 + hover, 18, 6, 0, 0, Math.PI*2); ctx.fill();
    
    // Spinning Lights
    const spinOffset = (time * (isAttacking ? 0.4 : 0.1)) % (Math.PI*2);
    for(let i=0; i<3; i++) {
        const angle = spinOffset + (i * (Math.PI*2)/3);
        const lx = Math.cos(angle) * 14;
        const ly = Math.sin(angle) * 4 + hover; // Flatten Y for perspective
        
        // Hide lights behind
        if (Math.sin(angle) < 0) continue;

        ctx.fillStyle = i === 0 ? '#F56565' : (i===1 ? '#48BB78' : '#ECC94B');
        ctx.beginPath(); 
        ctx.arc(lx, ly, 2, 0, Math.PI*2);
        ctx.fill();
    }
    
    ctx.restore();
};
