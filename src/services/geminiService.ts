import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const extractionService = {
  async extractEvent(rawText: string) {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: `Extract event details from this text: "${rawText}". Return JSON only.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            category: { type: Type.STRING },
            startTime: { type: Type.STRING },
            endTime: { type: Type.STRING },
            venue: { type: Type.STRING },
            latitude: { type: Type.NUMBER },
            longitude: { type: Type.NUMBER },
            priceRange: { type: Type.STRING }
          },
          required: ["title", "venue", "startTime"]
        }
      }
    });
    return JSON.parse(response.text);
  }
};

export const itineraryService = {
  async buildItinerary(preferences: string[], city: string) {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: `Build a 3-hour itinerary in ${city} for someone interested in ${preferences.join(", ")}.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              time: { type: Type.STRING },
              activity: { type: Type.STRING },
              venue: { type: Type.STRING },
              vibe: { type: Type.STRING }
            }
          }
        }
      }
    });
    return JSON.parse(response.text);
  }
};
