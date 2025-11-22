
export const assets: { [key: string]: HTMLImageElement } = {};

// Helper to satisfy type signature if needed, though we don't load images anymore
const loadImage = (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = (e) => reject(e);
        img.src = src;
    });
};

export const loadAssets = async (): Promise<void> => {
  // No-op: Vector engine requires no external assets.
  // We resolve immediately to start the game.
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
