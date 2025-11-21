
import { GoogleGenAI } from "@google/genai";

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.warn("API_KEY not found in environment");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

export const generateDeathMessage = async (score: number, killer: string): Promise<string> => {
  const ai = getClient();
  if (!ai) return "The squirrels will remember this...";

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Write a short, funny, sarcastic 1-sentence tombstone epitaph for a squirrel warrior who died to a ${killer} after scoring ${score} points in a zombie apocalypse.`,
    });
    return response.text || "Rest in Peanuts.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Rest in Peanuts.";
  }
};

export const generateLore = async (): Promise<string> => {
  const ai = getClient();
  if (!ai) return "The nuts are rebelling.";

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: "Generate a 2-sentence funny lore snippet about why squirrels are fighting robots and zombies.",
    });
    return response.text || "The Great Acorn Famine of 2045 changed everything.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "The Great Acorn Famine of 2045 changed everything.";
  }
};

export const generateCharacterSprite = async (prompt: string): Promise<string | null> => {
  const ai = getClient();
  if (!ai) return null;

  try {
    const fullPrompt = `
      A pixel art sprite sheet for a game character.
      Subject: ${prompt}.
      Style: 32-bit retro pixel art, vibrant colors, clean lines.
      Layout: A single horizontal strip with exactly 5 frames.
      Dimensions: 160x32 pixels total (5 frames of 32x32).
      Frame order:
      1. Idle/Resting
      2. Run Step 1
      3. Run Step 2
      4. Run Step 3
      5. Idle/Resting
      Background: Solid white or black (will be removed by game engine) or transparent.
      Ensure the character fits within a 32x32 pixel grid per frame.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: fullPrompt,
    });
    
    // Extract image from response
    for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
            return `data:image/png;base64,${part.inlineData.data}`;
        }
    }
    return null;
  } catch (error) {
    console.error("Gemini Image Gen Error:", error);
    return null;
  }
};
