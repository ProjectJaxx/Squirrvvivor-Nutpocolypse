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