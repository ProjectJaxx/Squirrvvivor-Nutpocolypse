
export const assets: { [key: string]: HTMLImageElement } = {};

// We use Data URIs for the sprites so they work immediately without you needing to download external files.
// In a real project, these would be .png files in your public folder.

const SPRITES = {
    // Green Zombie with brain exposed (SVG Fallback)
    ZOMBIE_SVG: `data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8ZyB0cmFuc2Zvcm09InRyYW5zbGF0ZSgzMiwzMikiPgogICAgPCEtLSBCb2R5IC0tPgogICAgPHBhdGggZD0iTS0xNSAtMjAgQy0yNSAtMTAgLTI1IDEwIC0xNSAyMCBMIDE1IDIwIEMgMjUgMTAgMjUgLTEwIDE1IC0yMCBaIiBmaWxsPSIjNjhEMzkxIiBzdHJva2U9IiMyRjg1NUEiIHN0cm9rZS13aWR0aD0iMiIvPgogICAgPCEtLSBCcmFpbiAtLT4KICAgIDxwYXRoIGQ9Ik0tMTAgLTIwIEMtMTUgLTI4IDAgLTM1IDEwIC0yMiIgZmlsbD0iI0ZDODE4MSIgb3BhY2l0eT0iMC44Ii8+CiAgICA8IS0tIEV5ZXMgLS0+CiAgICA8Y2lyY2xlIGN4PSItNiIgY3k9Ii01IiByPSI1IiBmaWxsPSIjRkZGIi8+CiAgICA8Y2lyY2xlIGN4PSItNiIgY3k9Ii01IiByPSIyIiBmaWxsPSIjMDAwIi8+CiAgICA8Y2lyY2xlIGN4PSI4IiBjeT0iLTgiIHI9IjQiIGZpbGw9IiNGRkYiLz4KICAgIDxjaXJjbGUgY3g9IjgiIGN5PSItOCIgcj0iMSIgZmlsbD0iIzAwMCIvPgogICAgPCEtLSBNb3V0aCAtLT4KICAgIDxwYXRoIGQ9Ik0tOCAxMCBRLTAgMTggOCAxMCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMkU4NTFBIiBzdHJva2Utd2lkdGg9IjIiLz4KICAgIDxyZWN0IHg9Ii00IiB5PSIxMCIgd2lkdGg9IjMiIGhlaWdodD0iMyIgZmlsbD0iI0ZGRiIvPgogIDwvZz4KPC9zdmc+`,
    
    // Angled Robot with glowing eye
    ROBOT: `data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8ZyB0cmFuc2Zvcm09InRyYW5zbGF0ZSgzMiwzMikiPgogICAgPCEtLSBBbnRlbm5hIC0tPgogICAgPHBhdGggZD0iTTAgLTIwIEwgMCAtMzAiIHN0cm9rZT0iI0EwQUVDMCIgc3Ryb2tlLXdpZHRoPSIyIi8+CiAgICA8Y2lyY2xlIGN4PSIwIiBjeT0iLTMwIiByPSIyIiBmaWxsPSIjRTMzNDJGIi8+CiAgICA8IS0tIEhlYWQgLS0+CiAgICA8cmVjdCB4PSItMTUiIHk9Ii0yMCIgd2lkdGg9IjMwIiBoZWlnaHQ9IjI1IiByeD0iNCIgZmlsbD0iI0EwQUVDMCIgc3Ryb2tlPSIjNzE4MDk2IiBzdHJva2Utd2lkdGg9IjIiLz4KICAgIDwhLS0gRXllIC0tPgogICAgPHJlY3QgeD0iLTExIiB5PSItMTQiIHdpZHRoPSIyMiIgaGVpZ2h0PSI4IiByeD0iMiIgZmlsbD0iIzFBMjAyQyIvPgogICAgPGNpcmNsZSBjeD0iLTUiIGN5PSItMTAiIHI9IjIiIGZpbGw9IiNmMDAiIG9wYWNpdHk9IjAuOCIvPgogICAgPGNpcmNsZSBjeD0iNSIgY3k9Ii0xMCIgcj0iMiIgZmlsbD0iI2YwMCIgb3BhY2l0eT0iMC44Ii8+CiAgICA8IS0tIEphdyAtLT4KICAgIDxwYXRoIGQ9Ik0tOCAtMiBMOCAtMiBMNSA1IEwtNSA1IFoiIGZpbGw9IiM3MTgwOTYiLz4KICAgIDwhLS0gQm9keSAtLT4KICAgIDxwYXRoIGQ9Ik0tMTIgOCBMMTIgOCBMOCAyMCZMJTggMjAgWiIgZmlsbD0iIzcxODA5NiIvPgogIDwvZz4KPC9zdmc+`,
    
    // Purple Alien
    ALIEN: `data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8ZyB0cmFuc2Zvcm09InRyYW5zbGF0ZSgzMiwzMikiPgogICAgPCEtLSBIZWFkIC0tPgogICAgPHBhdGggZD0iTS0xMiAtMTUgQy0yMCAtNSAtMjAgNSAtMTAgMTUgTDAgMjAgTDEwIDE1IEMgMjAgNSAyMCAtNSAxMiAtMTUgUTAgLTI1IC0xMiAtMTUiIGZpbGw9IiM5RjdBRUEiIHN0cm9rZT0iIzU1M0M5QSIgc3Ryb2tlLXdpZHRoPSIyIi8+CiAgICA8IS0tIEV5ZXMgLS0+CiAgICA8ZWxsaXBzZSBjeD0iLTYiIGN5PSItNSIgcng9IjQiIHJ5PSI2IiBmaWxsPSIjMDAwIi8+CiAgICA8ZWxsaXBzZSBjeD0iNiIgY3k9Ii01IiByeD0iNCIgcnk9IjYiIGZpbGw9IiMwMDAiLz4KICAgIDxlbGxpcHNlIGN4PSIwIiBjeT0iLTgiIHJ4PSIyIiByeT0iMyIgZmlsbD0iIzAwMCIvPgogICAgPCEtLSBTcG90cyAtLT4KICAgIDxjaXJjbGUgY3g9IjgiIGN5PSI4IiByPSIxIiBmaWxsPSIjREREYiIG9wYWNpdHk9IjAuNSIvPgogICAgPGNpcmNsZSBjeD0iLTgiIGN5PSIxMCIgcj0iMS41IiBmaWxsPSIjREREYiIG9wYWNpdHk9IjAuNSIvPgogIDwvZz4KPC9zdmc+`,

    // LPC Sprite Sheets (Using raw.githubusercontent.com for direct image access)
    // Updated naming convention '1-1' for Stage 1 assets
    GOBLIN: `https://raw.githubusercontent.com/ProjectJaxx/Squirrvvivor-Nutpocolypse/main/public/assets/sprites/goblin1-1.png`,
    ZOMBIE: `https://raw.githubusercontent.com/ProjectJaxx/Squirrvvivor-Nutpocolypse/main/public/assets/sprites/zombie1-1.png`,
    GNOME: `https://raw.githubusercontent.com/ProjectJaxx/Squirrvvivor-Nutpocolypse/main/public/assets/sprites/gnome1-1.png`,
    
    // STAGE 1 VARIANTS (Placeholders)
    GOBLIN_SB: `https://raw.githubusercontent.com/ProjectJaxx/Squirrvvivor-Nutpocolypse/main/public/assets/sprites/goblinSB1-1.png`,
    GNOME_SB: `https://raw.githubusercontent.com/ProjectJaxx/Squirrvvivor-Nutpocolypse/main/public/assets/sprites/gnomeSB1-1.png`,
    GOBLIN_RANGED: `https://raw.githubusercontent.com/ProjectJaxx/Squirrvvivor-Nutpocolypse/main/public/assets/sprites/goblinR1-1.png`,
    GOBLIN_BOSS: `https://raw.githubusercontent.com/ProjectJaxx/Squirrvvivor-Nutpocolypse/main/public/assets/sprites/goblinB1-1.png`,
    GNOME_BOSS: `https://raw.githubusercontent.com/ProjectJaxx/Squirrvvivor-Nutpocolypse/main/public/assets/sprites/gnomeB1-1.png`
};

// Helper to satisfy type signature if needed
const loadImage = (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "Anonymous"; // Important for external assets
        img.onload = () => resolve(img);
        img.onerror = (e) => {
            console.warn("Failed to load image, using fallback", src);
            resolve(img); // Resolve anyway to prevent crash
        };
        // Add cache buster to ensure we get the latest file from GitHub
        // Use a simple timestamp if it's a http URL
        if (src.startsWith('http')) {
            img.src = `${src}?t=${Date.now()}`;
        } else {
            img.src = src;
        }
    });
};

export const loadAssets = async (): Promise<void> => {
  // Load all our defined sprites
  const promises = Object.entries(SPRITES).map(async ([key, src]) => {
      assets[key] = await loadImage(src);
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
