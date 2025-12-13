
import { Particle } from '../types';

export const renderParticles = (ctx: CanvasRenderingContext2D, particles: Particle[]) => {
    for (const p of particles) {
        const lifePct = p.life / p.maxLife;
        
        ctx.save();
        ctx.translate(p.x, p.y);
        
        if (p.subtype === 'DISINTEGRATE') {
            // ALIEN VAPORIZE: Pixelated shrinking squares rising up (Keep sharp/digital look)
            ctx.globalAlpha = lifePct;
            ctx.fillStyle = p.color || 'purple';
            
            // Shrink over time
            const currentSize = p.radius * 2 * lifePct;
            ctx.fillRect(-currentSize/2, -currentSize/2, currentSize, currentSize);
            
            // Energy Glow
            ctx.shadowColor = p.color || 'purple';
            ctx.shadowBlur = 5 * lifePct;
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 0.5;
            ctx.strokeRect(-currentSize/2, -currentSize/2, currentSize, currentSize);
            
        } else if (p.subtype === 'ELITE_ESSENCE') {
            // ELITE DEATH: Rising, glowing spiritual energy
            ctx.globalAlpha = lifePct;
            
            // Soft Glow effect
            ctx.shadowColor = p.color || 'gold';
            ctx.shadowBlur = 20 * lifePct;
            
            const sway = Math.sin((p.life / 10) + (p.x % 10)) * 5;
            ctx.translate(sway, 0);
            
            // Draw Diamond/Star shape representing essence
            ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            ctx.beginPath();
            ctx.moveTo(0, -p.radius * 2.5); // Top
            ctx.lineTo(p.radius, 0);        // Right
            ctx.lineTo(0, p.radius * 1.5);  // Bottom
            ctx.lineTo(-p.radius, 0);       // Left
            ctx.fill();

        } else if (p.subtype === 'SCRAP') {
            // ROBOT DEBRIS: Keep jagged/hard, but fade out
            ctx.globalAlpha = lifePct;
            ctx.fillStyle = p.color || 'gray';
            ctx.rotate(lifePct * 20 + (p.x % 5)); 
            
            const seed = p.id.charCodeAt(p.id.length-1) % 4;
            ctx.beginPath();
            if (seed === 0) ctx.rect(-p.radius, -p.radius, p.radius * 2, p.radius * 2);
            else if (seed === 1) { ctx.moveTo(0, -p.radius * 1.5); ctx.lineTo(p.radius, p.radius); ctx.lineTo(-p.radius, p.radius); }
            else if (seed === 2) ctx.rect(-p.radius/2, -p.radius * 1.5, p.radius, p.radius * 3);
            else { ctx.moveTo(-p.radius, -p.radius); ctx.lineTo(p.radius, 0); ctx.lineTo(-p.radius, p.radius); ctx.lineTo(0, -p.radius); }
            ctx.fill();

        } else if (p.subtype === 'GOO') {
            // ZOMBIE: Soft, fuzzy blob instead of hard oval
            ctx.globalAlpha = lifePct * 0.9;
            
            const speed = Math.sqrt(p.velocity.x**2 + p.velocity.y**2);
            const angle = Math.atan2(p.velocity.y, p.velocity.x);
            ctx.rotate(angle);
            const stretch = Math.max(1, speed);

            // Create fuzzy gradient
            const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, p.radius * stretch);
            grad.addColorStop(0, p.color || 'green');
            grad.addColorStop(1, 'rgba(0,0,0,0)'); // Fade to transparent

            ctx.fillStyle = grad;
            ctx.beginPath();
            // Scale y to flatten the gradient circle into an oval
            ctx.save();
            ctx.scale(1, 1/stretch); 
            ctx.arc(0, 0, p.radius * stretch, 0, Math.PI * 2);
            ctx.restore();
            ctx.fill();

        } else if (p.subtype === 'SMOKE' || p.type === 'SMOKE') {
            // SOFT SMOKE / DUST: Radial gradient for fuzziness
            const radius = p.radius * (1 + (1-lifePct)); // Expand as it dies
            
            const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
            // Inner color (opaque-ish)
            grad.addColorStop(0, p.color || 'gray');
            // Outer color (transparent) to create soft edge
            grad.addColorStop(1, 'rgba(0,0,0,0)');

            ctx.globalAlpha = lifePct * 0.7; // Lower base alpha for smoke
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(0, 0, radius, 0, Math.PI * 2);
            ctx.fill();

        } else if (p.subtype === 'FLASH' || p.type === 'FLASH') {
            // EXPLOSION FLASH: Bright center, soft edge
            const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, p.radius);
            grad.addColorStop(0, 'white');
            grad.addColorStop(0.4, p.color || 'white');
            grad.addColorStop(1, 'rgba(255, 255, 255, 0)');

            ctx.globalAlpha = lifePct;
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
            ctx.fill();

        } else {
            // DEFAULT: Soft round particle
            const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, p.radius);
            grad.addColorStop(0, p.color || 'white');
            grad.addColorStop(1, 'rgba(255, 255, 255, 0)');

            ctx.globalAlpha = lifePct;
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }
};
