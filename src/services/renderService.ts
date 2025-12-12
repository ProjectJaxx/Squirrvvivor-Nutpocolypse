
import { Particle } from '../types';

export const renderParticles = (ctx: CanvasRenderingContext2D, particles: Particle[]) => {
    for (const p of particles) {
        const lifePct = p.life / p.maxLife;
        
        ctx.save();
        ctx.translate(p.x, p.y);
        
        if (p.subtype === 'DISINTEGRATE') {
            // ALIEN VAPORIZE: Pixelated shrinking squares rising up
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
            ctx.fillStyle = p.color || 'gold';
            ctx.shadowColor = p.color || 'gold';
            ctx.shadowBlur = 15 * lifePct;
            
            // Swirling motion effect
            const sway = Math.sin((p.life / 10) + (p.x % 10)) * 5;
            ctx.translate(sway, 0);
            
            // Draw Diamond/Star shape representing essence
            ctx.beginPath();
            ctx.moveTo(0, -p.radius * 2.5); // Top
            ctx.lineTo(p.radius, 0);        // Right
            ctx.lineTo(0, p.radius * 1.5);  // Bottom
            ctx.lineTo(-p.radius, 0);       // Left
            ctx.fill();
            
            // Bright Core
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.beginPath();
            ctx.arc(0, -p.radius * 0.5, p.radius * 0.4, 0, Math.PI * 2);
            ctx.fill();

        } else if (p.subtype === 'SMOKE' || p.type === 'SMOKE') {
            ctx.globalAlpha = lifePct;
            ctx.fillStyle = p.color || 'gray';
            ctx.beginPath();
            ctx.arc(0, 0, p.radius * lifePct, 0, Math.PI * 2);
            ctx.fill();
        } else {
            // Default particle
             ctx.globalAlpha = lifePct;
            ctx.fillStyle = p.color || 'white';
            ctx.beginPath();
            ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }
};
