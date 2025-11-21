
import { GoogleGenAI } from "@google/genai";
import { ImageAttachment, AspectRatio } from "../types";

const API_KEY = process.env.API_KEY || '';

// Reverting to Gemini 2.5 Flash Image as requested (free tier compatible)
const MODEL_NAME = 'gemini-2.5-flash-image';

/**
 * Generates or edits an image based on a prompt and optional reference images.
 */
export const generateOrEditImage = async (
  prompt: string,
  aspectRatio: AspectRatio,
  numberOfImages: number,
  referenceImage?: ImageAttachment
): Promise<string[]> => {
  const ai = new GoogleGenAI({ apiKey: API_KEY });
  
  if (!API_KEY) {
    throw new Error("API Key not found. Please check your environment variables.");
  }

  // Helper function to generate a single image
  const generateSingleImage = async (): Promise<string> => {
    const parts: any[] = [];

    // 1. Add Reference Image if exists
    if (referenceImage) {
      parts.push({
        inlineData: {
          data: referenceImage.data,
          mimeType: referenceImage.mimeType,
        },
      });
    }

    // 2. Construct Prompt with Aspect Ratio Instruction
    // For Gemini 2.5 Flash Image, textual instruction for AR is often more robust
    const aspectText = ` Aspect ratio: ${aspectRatio}.`;
    const fullPrompt = (prompt || (referenceImage ? "Generate a variation of this image." : "Generate an image.")) + aspectText;
    
    parts.push({ text: fullPrompt });

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: {
        parts: parts,
      },
      // We try to pass config, but rely on prompt as primary driver for 2.5-flash-image
      config: {
        // imageConfig is sometimes supported, but we use it loosely here.
      },
    });

    // 3. Parse Response
    if (response.candidates && response.candidates.length > 0) {
      const content = response.candidates[0].content;
      if (content && content.parts) {
        for (const part of content.parts) {
          if (part.inlineData && part.inlineData.data) {
            return part.inlineData.data;
          }
        }
      }
    }
    throw new Error("No image data found in response.");
  };

  try {
    // Gemini 2.5 Flash Image typically generates 1 image per request.
    // To support 'numberOfImages' (1, 2, 3), we run requests in parallel.
    const promises = Array.from({ length: numberOfImages }).map(() => generateSingleImage());
    
    const results = await Promise.all(promises);
    return results;

  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};

/**
 * Helper to convert a File object to Base64
 */
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
        // Remove the Data-URL prefix (e.g. "data:image/png;base64,")
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        resolve(base64);
    };
    reader.onerror = (error) => reject(error);
  });
};
