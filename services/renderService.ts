
import { Particle } from '../types';

export const renderParticles = (ctx: CanvasRenderingContext2D, particles: Particle[]) => {
    for (const p of particles) {
        const lifePct = p.life / p.maxLife;
        
        ctx.save();
        ctx.translate(p.x, p.y);
        
        if (p.subtype === 'SCRAP') {
            // ROBOT EXPLOSION: Angular, spinning debris
            ctx.globalAlpha = lifePct;
            ctx.fillStyle = p.color || 'gray';
            // High rotation speed for metal flying
            ctx.rotate(lifePct * 20 + (p.x % 5)); 
            
            // Pseudo-random shape based on ID
            const seed = p.id.charCodeAt(p.id.length-1) % 4;
            
            ctx.beginPath();
            if (seed === 0) {
                // Square (Plate)
                ctx.rect(-p.radius, -p.radius, p.radius * 2, p.radius * 2);
            } else if (seed === 1) {
                // Triangle (Shard)
                ctx.moveTo(0, -p.radius * 1.5); 
                ctx.lineTo(p.radius, p.radius); 
                ctx.lineTo(-p.radius, p.radius);
            } else if (seed === 2) {
                // Bar (Wire/Bolt)
                ctx.rect(-p.radius/2, -p.radius * 1.5, p.radius, p.radius * 3);
            } else {
                // Jagged
                ctx.moveTo(-p.radius, -p.radius);
                ctx.lineTo(p.radius, 0);
                ctx.lineTo(-p.radius, p.radius);
                ctx.lineTo(0, -p.radius);
            }
            ctx.fill();
            
            // Outline for metal feel
            ctx.strokeStyle = 'rgba(0,0,0,0.3)';
            ctx.lineWidth = 1;
            ctx.stroke();
            
        } else if (p.subtype === 'GOO') {
            // ZOMBIE DISSOLVE: Wet, stretching blobs
            ctx.globalAlpha = lifePct * 0.9;
            ctx.fillStyle = p.color || 'green';
            
            // Stretch in direction of movement
            const speed = Math.sqrt(p.velocity.x**2 + p.velocity.y**2);
            const angle = Math.atan2(p.velocity.y, p.velocity.x);
            
            ctx.rotate(angle);
            // Stretch based on speed, flatten as it slows down
            const stretch = Math.max(1, speed);
            
            ctx.beginPath();
            ctx.ellipse(0, 0, p.radius * stretch, p.radius * (1/stretch), 0, 0, Math.PI*2);
            ctx.fill();
            
            // "Wet" highlight
            ctx.fillStyle = 'rgba(255,255,255,0.4)';
            ctx.beginPath(); 
            ctx.ellipse(-p.radius * 0.3 * stretch, -p.radius * 0.3 * (1/stretch), p.radius * 0.2, p.radius * 0.2, 0, 0, Math.PI*2); 
            ctx.fill();

        } else if (p.subtype === 'DISINTEGRATE') {
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

        } else if (p.subtype === 'FLASH' || p.type === 'FLASH') {
            ctx.globalAlpha = lifePct;
            ctx.fillStyle = p.color || 'white';
            ctx.beginPath();
            ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
            ctx.fill();
        } else if (p.subtype === 'SMOKE' || p.type === 'SMOKE') {
            ctx.globalAlpha = lifePct * 0.6;
            ctx.fillStyle = p.color || 'gray';
            ctx.beginPath();
            ctx.arc(0, 0, p.radius * lifePct * 2, 0, Math.PI * 2);
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
