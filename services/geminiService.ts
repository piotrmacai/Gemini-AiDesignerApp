
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

    // 2. Construct Prompt with Aspect Ratio and Mandatory Style
    // Enforcing product editorial/fashion style as requested
    // We split logic: "Rearrange" makes sense for edits, but not necessarily for fresh generation
    let styleInstruction = " Style: product editorial photography, award winning style, for fashion and other products.";
    
    if (referenceImage) {
        styleInstruction += " Rearrange the product into a more editorial professional product photo.";
    } else {
        styleInstruction += " Composition: Professional editorial product layout.";
    }

    const aspectText = ` Aspect ratio: ${aspectRatio}.`;
    
    // Ensure we have a base prompt if the user didn't provide one
    const corePrompt = prompt 
        ? prompt 
        : (referenceImage ? "Generate a variation of this image." : "Generate an image of a high-end product.");
        
    const fullPrompt = `${corePrompt} ${styleInstruction} ${aspectText}`;
    
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

    // 3. Parse Response with robust error handling
    if (response.candidates && response.candidates.length > 0) {
      const content = response.candidates[0].content;
      if (content && content.parts) {
        let textOutput = "";

        for (const part of content.parts) {
          // Check for Image
          if (part.inlineData && part.inlineData.data) {
            return part.inlineData.data;
          }
          // Collect Text (often contains refusal reasons or descriptions)
          if (part.text) {
            textOutput += part.text;
          }
        }

        // If we loop through all parts and find no image, but found text:
        if (textOutput) {
            throw new Error(`Model response: "${textOutput.slice(0, 200)}${textOutput.length > 200 ? '...' : ''}"`);
        }
      }
    }

    // Check for safety finish reasons
    if (response.candidates && response.candidates[0] && response.candidates[0].finishReason) {
        const reason = response.candidates[0].finishReason;
        if (reason !== 'STOP') {
             throw new Error(`Generation stopped due to: ${reason}`);
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
