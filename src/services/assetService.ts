
export const assets: { [key: string]: HTMLImageElement } = {};

const COMMIT_HASH = "4e85d0544806193c91737ea9875d4be02c5ecb28";
const TREE_COMMIT = "c30049b972dd96ed5cbf88e5c65665f732431109";
const BASE_URL = `https://raw.githubusercontent.com/ProjectJaxx/Squirrvvivor-Nutpocolypse/${COMMIT_HASH}/public/assets/sprites`;
const TREE_URL = `https://raw.githubusercontent.com/ProjectJaxx/Squirrvvivor-Nutpocolypse/${TREE_COMMIT}/public/assets/sprites`;

const SPRITES = {
    // Green Zombie (SVG Fallback)
    ZOMBIE_SVG: `data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8ZyB0cmFuc2Zvcm09InRyYW5zbGF0ZSgzMiwzMikiPgogICAgPHBhdGggZD0iTS0xNSAtMjAgQy0yNSAtMTAgLTI1IDEwIC0xNSAyMCBMIDE1IDIwIEMgMjUgMTAgMjUgLTEwIDE1IC0yMCBaIiBmaWxsPSIjNjhEMzkxIiBzdHJva2U9IiMyRjg1NUEiIHN0cm9rZS13aWR0aD0iMiIvPjwvZz48L3N2Zz4=`,
    
    // LPC Sprite Sheets
    GOBLIN: `${BASE_URL}/goblin1-1.png`,
    ZOMBIE: `${BASE_URL}/zombie1-1.png`,
    GNOME: `${BASE_URL}/gnome1-1.png`,

    // Tree Sprite Strips (Raw URLs)
    TREE_1: `${TREE_URL}/TreesSpriteStrip1.png`,
    TREE_2: `${TREE_URL}/TreesSpriteStrip2.png`,
    TREE_3: `${TREE_URL}/TreesSpriteStrip3.png`,
    TREE_4: `${TREE_URL}/TreesSpriteStrip4.png`
};

const loadImage = (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "Anonymous"; // Important for external assets
        img.onload = () => resolve(img);
        img.onerror = (e) => {
            console.warn("Failed to load image, using fallback", src);
            resolve(img); // Resolve anyway to prevent crash, draws procedural fallback
        };
        // Add cache buster only if not using specific commit hash to allow caching
        if (src.startsWith('http') && !src.includes(COMMIT_HASH) && !src.includes(TREE_COMMIT)) {
            img.src = `${src}?t=${Date.now()}`;
        } else {
            img.src = src;
        }
    });
};

export const loadAssets = async (): Promise<void> => {
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
