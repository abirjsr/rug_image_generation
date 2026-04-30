import { GoogleGenAI } from "@google/genai";
import { ImageConfig } from "../types";

// Always use process.env.GEMINI_API_KEY for the Gemini API.
const key = process.env.GEMINI_API_KEY as string;
const ai = new GoogleGenAI({ apiKey: key });

export const geminiService = {
  generateResponse: async (prompt: string, history: { role: string; parts: { text: string }[] }[]) => {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          ...history,
          { role: "user", parts: [{ text: prompt }] }
        ],
      });
      return response.text;
    } catch (err) {
      console.error("Gemini Response Error:", err);
      throw err;
    }
  },

  generateImage: async (prompt: string, config: ImageConfig, inputImageBase64?: string) => {
    try {
      const model = 'gemini-3.1-flash-image-preview';
      
      // Construct rich prompt with config
      const richPrompt = `${prompt}. Style: ${config.style || 'unspecified'}. Texture: ${config.texture || 'unspecified'}. Color palette: ${config.color || 'unspecified'}.`;
      
      const parts: any[] = [{ text: richPrompt }];
      
      if (inputImageBase64) {
        parts.unshift({
          inlineData: {
            data: inputImageBase64,
            mimeType: "image/jpeg"
          }
        });
      }

      console.log("Generating image with prompt:", richPrompt);

      const response = await ai.models.generateContent({
        model: model,
        contents: [{ parts }],
        config: {
          imageConfig: {
            aspectRatio: config.aspectRatio,
            imageSize: config.size
          }
        }
      });

      if (response.candidates?.[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData) {
            return `data:image/png;base64,${part.inlineData.data}`;
          }
          if (part.text) {
            console.log("Model returned text instead of image:", part.text);
          }
        }
      }
      
      console.warn("No image found in response parts");
      return null;
    } catch (err) {
      console.error("Gemini Image Generation Error:", err);
      throw err;
    }
  }
};
