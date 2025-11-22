
export const assets: { [key: string]: HTMLImageElement } = {};

const createPlaceholderSprite = (type: 'ZOMBIE' | 'ROBOT' | 'ALIEN' | 'SQUIRREL', color: string): HTMLImageElement => {
    // LPC Style Sheet Dimensions
    // 13 Columns, 21 Rows. 64x64 tiles.
    const COLS = 13;
    const ROWS = 21;
    const TILE = 64;

    const canvas = document.createElement('canvas');
    canvas.width = COLS * TILE; 
    canvas.height = ROWS * TILE; 
    const ctx = canvas.getContext('2d');

    if (!ctx) return new Image();

    // Helper to draw a frame
    const drawFrame = (col: number, row: number, direction: 'UP' | 'LEFT' | 'DOWN' | 'RIGHT') => {
        const x = col * TILE;
        const y = row * TILE;
        const cx = x + 32;
        const cy = y + 32;

        ctx.save();
        ctx.translate(cx, cy);

        // Bounce/Wobble Animation
        let bob = (col % 2 === 0) ? -2 : 2;
        let legOffset = Math.sin(col * Math.PI / 2) * 4;
        
        // Idle frame (col 0) should be stable
        if (col === 0) {
            bob = 0;
            legOffset = 0;
        }
        
        ctx.translate(0, bob);

        if (type === 'ZOMBIE') {
            // --- ZOMBIE ---
            const skin = '#68d391';
            const clothes = '#3182CE';
            const blood = '#C53030';
            
            // Legs
            ctx.fillStyle = '#1A202C';
            ctx.fillRect(-6 - legOffset, 10, 5, 12);
            ctx.fillRect(2 + legOffset, 10, 5, 12);

            // Body
            ctx.fillStyle = clothes;
            ctx.fillRect(-10, -2, 20, 16);
            // Torn Clothes / Flesh
            ctx.fillStyle = skin;
            ctx.fillRect(-4, 2, 8, 4);

            // Head
            ctx.fillStyle = skin;
            ctx.fillRect(-12, -24, 24, 24);
            
            // Face
            ctx.fillStyle = '#222';
            if (direction === 'DOWN') {
                ctx.fillRect(-6, -16, 4, 4); ctx.fillRect(2, -16, 4, 4); // Eyes
                ctx.fillStyle = blood; ctx.fillRect(-4, -8, 8, 2); // Mouth
            } else if (direction === 'RIGHT') {
                ctx.fillRect(4, -16, 4, 4); // Right Eye
                ctx.fillStyle = blood; ctx.fillRect(4, -8, 6, 2); 
                // Arms outstretched
                ctx.fillStyle = skin; ctx.fillRect(0, -2, 16, 6);
            } else if (direction === 'LEFT') {
                ctx.fillRect(-8, -16, 4, 4); // Left Eye
                ctx.fillStyle = blood; ctx.fillRect(-10, -8, 6, 2);
                // Arms outstretched
                ctx.fillStyle = skin; ctx.fillRect(-16, -2, 16, 6);
            }
            // Brains/Hair
            ctx.fillStyle = '#2D3748';
            ctx.fillRect(-12, -26, 24, 6);

        } else if (type === 'ROBOT') {
            // --- ROBOT ---
            const metal = '#A0AEC0';
            const darkMetal = '#4A5568';
            const light = '#F56565';

            // Tracks/Legs
            ctx.fillStyle = darkMetal;
            ctx.fillRect(-10, 12, 20, 8);

            // Body
            ctx.fillStyle = metal;
            ctx.fillRect(-12, -4, 24, 18);
            // Panel
            ctx.fillStyle = '#ECC94B';
            ctx.fillRect(-4, 2, 8, 8);

            // Head
            ctx.fillStyle = metal;
            ctx.fillRect(-10, -26, 20, 20);
            
            // Visor
            ctx.fillStyle = light;
            if (direction === 'DOWN') ctx.fillRect(-8, -20, 16, 4);
            else if (direction === 'RIGHT') ctx.fillRect(0, -20, 10, 4);
            else if (direction === 'LEFT') ctx.fillRect(-10, -20, 10, 4);

            // Antenna
            ctx.fillStyle = darkMetal;
            ctx.fillRect(-2, -34, 4, 8);
            ctx.fillStyle = light;
            ctx.beginPath(); ctx.arc(0, -36, 3, 0, Math.PI*2); ctx.fill();

        } else if (type === 'ALIEN') {
            // --- ALIEN ---
            const skin = color; // Pinkish/Purple
            const eyeColor = 'black';

            // Legs (Thin)
            ctx.fillStyle = skin;
            ctx.fillRect(-6 - legOffset, 8, 3, 10);
            ctx.fillRect(3 + legOffset, 8, 3, 10);

            // Body (Small)
            ctx.fillRect(-8, -2, 16, 12);

            // Head (Bulbous)
            ctx.beginPath();
            ctx.ellipse(0, -16, 12, 14, 0, 0, Math.PI*2);
            ctx.fill();

            // Eyes (Huge)
            ctx.fillStyle = eyeColor;
            if (direction === 'DOWN') {
                ctx.beginPath();
                ctx.ellipse(-5, -16, 4, 7, -0.2, 0, Math.PI*2);
                ctx.ellipse(5, -16, 4, 7, 0.2, 0, Math.PI*2);
                ctx.fill();
            } else if (direction === 'RIGHT') {
                ctx.beginPath();
                ctx.ellipse(4, -16, 5, 7, 0, 0, Math.PI*2);
                ctx.fill();
            } else if (direction === 'LEFT') {
                ctx.beginPath();
                ctx.ellipse(-4, -16, 5, 7, 0, 0, Math.PI*2);
                ctx.fill();
            }
        } else if (type === 'SQUIRREL') {
            // --- SQUIRREL ---
            const fur = color; 
            const tailColor = color === '#A0AEC0' ? '#718096' : color; // Slightly darker/diff for grey

            // Tail (Big bushy thing)
            ctx.fillStyle = tailColor;
            ctx.beginPath();
            
            if (direction === 'UP') {
                 // Tail dominates back view
                 ctx.ellipse(0, -5, 12, 16, 0, 0, Math.PI*2);
            } else if (direction === 'DOWN') {
                 // Tail visible behind/side
                 ctx.ellipse(8, -8, 10, 14, 0.5, 0, Math.PI*2);
            } else if (direction === 'RIGHT') {
                // Tail trailing left
                ctx.ellipse(-14, -5, 12, 14, -0.3, 0, Math.PI*2);
            } else if (direction === 'LEFT') {
                // Tail trailing right
                ctx.ellipse(14, -5, 12, 14, 0.3, 0, Math.PI*2);
            }
            ctx.fill();

            // Legs
            ctx.fillStyle = fur;
            ctx.fillRect(-8 - legOffset, 10, 6, 8);
            ctx.fillRect(2 + legOffset, 10, 6, 8);

            // Body
            ctx.fillStyle = fur;
            ctx.fillRect(-10, 0, 20, 12);

            // Head
            ctx.fillStyle = fur;
            ctx.beginPath(); ctx.arc(0, -14, 11, 0, Math.PI*2); ctx.fill();

            // Ears
            ctx.fillStyle = fur;
            ctx.beginPath(); ctx.moveTo(-6, -20); ctx.lineTo(-10, -30); ctx.lineTo(-2, -24); ctx.fill();
            ctx.beginPath(); ctx.moveTo(6, -20); ctx.lineTo(10, -30); ctx.lineTo(2, -24); ctx.fill();

            // Eyes & Nose
            ctx.fillStyle = 'black';
            if (direction === 'DOWN') {
                ctx.fillRect(-5, -16, 3, 3); ctx.fillRect(2, -16, 3, 3);
                ctx.fillStyle = '#pink'; ctx.fillRect(-1, -10, 2, 2);
            } else if (direction === 'RIGHT') {
                ctx.fillRect(4, -16, 3, 3);
            } else if (direction === 'LEFT') {
                ctx.fillRect(-7, -16, 3, 3);
            }
        }
        ctx.restore();
    };

    // Generate rows for LPC standard
    // Row 8: Up, Row 9: Left, Row 10: Down, Row 11: Right
    // We fill columns 0-8 (indices). 0 is Idle, 1-8 are Walk Cycle.
    for (let i=0; i<=8; i++) {
        drawFrame(i, 8, 'UP');
        drawFrame(i, 9, 'LEFT');
        drawFrame(i, 10, 'DOWN');
        drawFrame(i, 11, 'RIGHT');
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

const tryLoadImage = async (filenames: string[]): Promise<HTMLImageElement | null> => {
    for (const filename of filenames) {
        try { return await loadImage(`/assets/sprites/${filename}`); } catch (e) {}
        try { return await loadImage(`/${filename}`); } catch (e) {}
        try { return await loadImage(`./${filename}`); } catch (e) {}
    }
    return null;
};

export const loadAssets = async (): Promise<void> => {
  // 1. Generate detailed placeholders first
  assets['ZOMBIE'] = createPlaceholderSprite('ZOMBIE', '#68d391');
  assets['ROBOT'] = createPlaceholderSprite('ROBOT', '#a0aec0');
  assets['ALIEN'] = createPlaceholderSprite('ALIEN', '#D53F8C');
  assets['SWARM_ZOMBIE'] = assets['ZOMBIE'];

  // Generate default placeholders for squirrels so they aren't emojis if loading fails
  assets['GREY'] = createPlaceholderSprite('SQUIRREL', '#A0AEC0');
  assets['RED'] = createPlaceholderSprite('SQUIRREL', '#E53E3E');
  assets['GIANT'] = createPlaceholderSprite('SQUIRREL', '#3E2723');

  // 2. Attempt to load external sprites (overwriting placeholders if successful)
  const spriteMappings = [
    { key: 'ZOMBIE', files: ['zomb_1.png', 'zombie.png'] },
    { key: 'ROBOT', files: ['robot_1.png', 'robot.png'] },
    { key: 'ALIEN', files: ['alien_1.png', 'alien.png'] },
    { key: 'GREY', files: ['greys_1.png', 'grey_squirrel.png', 'squirrel.png'] },
    { key: 'RED', files: ['red_1.png', 'red_squirrel.png'] },
    { key: 'GIANT', files: ['indian_1.png', 'giant_squirrel.png'] }
  ];

  const promises = spriteMappings.map(async (map) => {
      const img = await tryLoadImage(map.files);
      if (img) {
          assets[map.key] = img;
          if (map.key === 'ZOMBIE') assets['SWARM_ZOMBIE'] = img;
      }
  });

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
