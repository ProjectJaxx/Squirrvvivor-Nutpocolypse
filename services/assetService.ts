
export const assets: { [key: string]: HTMLImageElement } = {};

const createPlaceholderSprite = (type: 'ZOMBIE' | 'ROBOT' | 'ALIEN', color: string): HTMLImageElement => {
    // LPC Style Sheet Dimensions
    // 13 Columns, 21 Rows. 64x64 tiles.
    const COLS = 13;
    const ROWS = 21;
    const TILE = 64;

    const canvas = document.createElement('canvas');
    canvas.width = COLS * TILE; 
    canvas.height = ROWS * TILE; 
    const ctx = canvas.getContext('2d');

    if (ctx) {
        // We need to populate Row 11 (Walk Right) for the game's configuration
        // Row 11 index = 11. Y = 11 * 64 = 704.
        // The game uses frames 144-151, which correspond to Row 11, Cols 1-8.
        const rowY = 11 * TILE;

        for (let col = 1; col <= 8; col++) {
            const x = col * TILE;
            const y = rowY;
            const centerX = x + 32;
            const centerY = y + 32;

            ctx.save();
            ctx.translate(centerX, centerY);
            
            // Bobbing animation based on column
            const bob = (col % 2 === 0) ? -2 : 2;
            ctx.translate(0, bob);

            if (type === 'ZOMBIE') {
                ctx.fillStyle = color;
                ctx.fillRect(-10, -20, 20, 20); // Head
                ctx.fillRect(-8, 0, 16, 16);   // Body
                // Arms
                ctx.fillRect(-14, 0, 6, 12);
                ctx.fillRect(8, 0, 6, 12);
                
                ctx.fillStyle = '#333';
                ctx.fillRect(-5, -15, 4, 4);   // Eye
                ctx.fillRect(3, -15, 4, 4);    // Eye
            } else if (type === 'ROBOT') {
                ctx.fillStyle = '#A0AEC0';
                ctx.fillRect(-12, -22, 24, 24); // Head
                ctx.fillStyle = '#F56565';
                ctx.fillRect(-10, -14, 20, 4); // Visor
                ctx.fillStyle = '#718096';
                ctx.fillRect(-10, 2, 20, 16); // Body
                // Antenna
                ctx.fillStyle = '#CBD5E0';
                ctx.fillRect(-2, -28, 4, 6);
            } else if (type === 'ALIEN') {
                ctx.fillStyle = color;
                ctx.beginPath();
                ctx.ellipse(0, -14, 12, 14, 0, 0, Math.PI * 2); // Head
                ctx.fill();
                ctx.fillStyle = 'black';
                ctx.beginPath();
                ctx.ellipse(-5, -14, 4, 6, -0.2, 0, Math.PI * 2); // Eyes
                ctx.ellipse(5, -14, 4, 6, 0.2, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = color;
                ctx.fillRect(-8, 0, 16, 14); // Body
            }
            ctx.restore();
        }
    }

    const img = new Image();
    img.src = canvas.toDataURL();
    return img;
};

const loadImage = (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = (e) => reject(e);
        img.src = src;
    });
};

export const loadAssets = async (): Promise<void> => {
  // 1. Generate default placeholders (fallback)
  // These now match the LPC grid layout so they will render correctly if external files fail
  assets['ZOMBIE'] = createPlaceholderSprite('ZOMBIE', '#68d391');
  assets['ROBOT'] = createPlaceholderSprite('ROBOT', '#a0aec0');
  assets['ALIEN'] = createPlaceholderSprite('ALIEN', '#D53F8C');
  
  // Map SWARM_ZOMBIE to basic zombie placeholder initially
  assets['SWARM_ZOMBIE'] = assets['ZOMBIE'];

  // 2. Attempt to load actual external sprites
  //    Assumes files are in public/assets/sprites/
  const spriteMappings = [
    { key: 'ZOMBIE', src: '/assets/sprites/zomb_1.png' },
    { key: 'ROBOT', src: '/assets/sprites/robot_1.png' },
    { key: 'ALIEN', src: '/assets/sprites/alien_1.png' }
  ];

  const promises = spriteMappings.map(async (map) => {
      try {
          const img = await loadImage(map.src);
          assets[map.key] = img;
          // Update derived assets if needed
          if (map.key === 'ZOMBIE') {
             assets['SWARM_ZOMBIE'] = img;
          }
          console.log(`Loaded sprite: ${map.src}`);
      } catch (e) {
          console.warn(`Could not load ${map.src}, using generated placeholder.`);
      }
  });

  // We await all promises so the game doesn't start until we've tried to load everything
  await Promise.all(promises);
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
