export const assets: { [key: string]: HTMLImageElement } = {};

// Helper to satisfy type signature if needed
const loadImage = (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = (e) => reject(e);
        img.src = src;
    });
};

export const loadAssets = async (): Promise<void> => {
  // This is intentionally a no-op.
  // The game uses a procedural vector rendering engine, so most visuals
  // are drawn programmatically on the canvas without needing to load
  // external sprite sheets. We resolve immediately to start the game.
  
  // Example of loading an asset if needed in the future:
  // assets['NUT_LOGO'] = await loadImage('./public/assets/graphics/logotrans.svg');
  
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
