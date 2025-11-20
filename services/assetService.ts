
export const assets: { [key: string]: HTMLImageElement } = {};

// This object simulates a folder of available image assets.
// The asset manifest will request files, and we check if they exist here.
// 'zombie.png' is intentionally missing to demonstrate the emoji fallback system.
const availableAssets: { [path: string]: string } = {
  // 128x64px sprite sheet for squirrel (32x32 frames)
  // Row 0: Idle (4 frames), Row 1: Walking (4 frames)
  'squirrel.png': 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAIAAAABACAMAAAAuQVZOAAAAFVBMVEUAAACWbNCAgIBtbW1mZmZVVVWMYdKzAAAAA3RSTlMAgICAgICAtBMAAAAzSURBVHja7cEBDQAAAMKg9U/tDQ8HFAAAAAAAAAAAgH8GAAAAAAAAAACgZwEAAAAAAAAAAIC/BwAAAICfBAAAAAAZbgACtAABYLSd3QAAAABJRU5ErkJggg==',
};

// This object simulates the "text file" manifest listing all desired assets.
const assetManifest = {
  sprites: [
    { key: "SQUIRREL", path: "squirrel.png" },
    { key: "ZOMBIE", path: "zombie.png" }
  ]
};

export const loadAssets = (): Promise<void> => {
  const promises: Promise<void>[] = [];

  assetManifest.sprites.forEach(assetInfo => {
    const base64Data = availableAssets[assetInfo.path];
    if (base64Data) {
      // Asset "exists" in our available assets
      const promise = new Promise<void>((resolve) => {
        const img = new Image();
        img.src = base64Data;
        img.onload = () => {
          assets[assetInfo.key] = img;
          resolve();
        };
        img.onerror = (err) => {
          console.error(`Failed to load asset data for: ${assetInfo.key}`, err);
          resolve(); // Resolve anyway to not block the app
        };
      });
      promises.push(promise);
    } else {
      console.log(`Asset source not found for "${assetInfo.path}". Game will use emoji fallback for ${assetInfo.key}.`);
    }
  });

  return Promise.all(promises).then(() => {
    console.log("Asset loading process complete.");
  }).catch(err => {
    console.error("An unexpected error occurred during asset loading.", err);
    return Promise.reject(err);
  });
};
