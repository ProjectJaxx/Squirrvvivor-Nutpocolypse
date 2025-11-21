
export const assets: { [key: string]: HTMLImageElement } = {};

const createPlaceholderSprite = (type: 'ZOMBIE' | 'ROBOT' | 'ALIEN', color: string): HTMLImageElement => {
    const canvas = document.createElement('canvas');
    canvas.width = 128; // 4 frames * 32px
    canvas.height = 32;
    const ctx = canvas.getContext('2d');

    if (ctx) {
        for (let i = 0; i < 4; i++) {
            const xOffset = i * 32;
            
            // Bobbing animation for walking frames (1 and 3)
            const bob = (i === 1 || i === 3) ? 2 : 0;
            
            ctx.save();
            ctx.translate(xOffset, 0);

            if (type === 'ZOMBIE') {
                ctx.fillStyle = color;
                // Head
                ctx.fillRect(10, 2 + bob, 12, 12);
                // Body
                ctx.fillRect(8, 14 + bob, 16, 10);
                // Arms (Outstretched)
                ctx.fillRect(2, 14 + bob, 6, 4);
                ctx.fillRect(24, 14 + bob, 6, 4);
                // Legs
                ctx.fillRect(10, 24 + bob, 4, 8);
                ctx.fillRect(18, 24 + bob, 4, 8);
                
                // Eyes
                ctx.fillStyle = '#333';
                ctx.fillRect(12, 6 + bob, 3, 3);
                ctx.fillRect(17, 6 + bob, 3, 3);
            } else if (type === 'ROBOT') {
                // Head (Square)
                ctx.fillStyle = '#A0AEC0';
                ctx.fillRect(8, 2 + bob, 16, 14);
                // Eye Visor
                ctx.fillStyle = '#F56565'; 
                ctx.fillRect(10, 6 + bob, 12, 3);
                // Body
                ctx.fillStyle = '#718096';
                ctx.fillRect(6, 16 + bob, 20, 10);
                // Legs
                ctx.fillStyle = '#4A5568';
                ctx.fillRect(8, 26 + bob, 6, 6);
                ctx.fillRect(18, 26 + bob, 6, 6);
                // Antenna
                ctx.fillStyle = '#CBD5E0';
                ctx.fillRect(15, 0 + bob, 2, 2);
            } else if (type === 'ALIEN') {
                // Head (Oval-ish)
                ctx.fillStyle = color;
                ctx.beginPath();
                ctx.ellipse(16, 10 + bob, 8, 10, 0, 0, Math.PI * 2);
                ctx.fill();
                // Eyes (Large black ovals)
                ctx.fillStyle = 'black';
                ctx.beginPath();
                ctx.ellipse(13, 8 + bob, 3, 5, -0.2, 0, Math.PI * 2);
                ctx.ellipse(19, 8 + bob, 3, 5, 0.2, 0, Math.PI * 2);
                ctx.fill();
                 // Body
                ctx.fillStyle = color;
                ctx.fillRect(12, 20 + bob, 8, 6);
                // Legs
                ctx.fillRect(12, 26 + bob, 2, 6);
                ctx.fillRect(18, 26 + bob, 2, 6);
            }

            ctx.restore();
        }
    }

    const img = new Image();
    img.src = canvas.toDataURL();
    return img;
};

export const loadAssets = (): Promise<void> => {
  // Generate placeholder assets so they are available if the renderer chooses to use them
  assets['ZOMBIE'] = createPlaceholderSprite('ZOMBIE', '#68d391');
  assets['ROBOT'] = createPlaceholderSprite('ROBOT', '#a0aec0');
  assets['ALIEN'] = createPlaceholderSprite('ALIEN', '#D53F8C');
  
  return Promise.resolve();
};

export const setPlayerSkin = (base64Data: string): Promise<boolean> => {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            assets['PLAYER_SKIN'] = img;
            resolve(true);
        };
        img.onerror = () => {
            console.error("Failed to load custom skin");
            resolve(false);
        };
        img.src = base64Data;
    });
};
