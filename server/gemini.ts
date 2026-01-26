import * as fs from "fs";
import { GoogleGenAI, Modality } from "@google/genai";
import { LocalObjectStorageService } from "./services/local-object-storage";
import path from "path";

// This API key is from Gemini Developer API Key, not vertex AI API Key
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

/**
 * Generate image using Gemini and save to specified path
 * Used for generating platform assets
 */
export async function generateImage(
    prompt: string,
    imagePath: string,
): Promise<void> {
    try {
        // IMPORTANT: only this gemini model supports image generation
        const response = await ai.models.generateContent({
            model: "gemini-2.0-flash-exp-image-generation",
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            config: {
                responseModalities: [Modality.TEXT, Modality.IMAGE],
            },
        });

        const candidates = response.candidates;
        if (!candidates || candidates.length === 0) {
            throw new Error("No candidates returned from Gemini");
        }

        const content = candidates[0].content;
        if (!content || !content.parts) {
            throw new Error("No content parts in response");
        }

        for (const part of content.parts) {
            if (part.text) {
                console.log("Generated image description:", part.text);
            } else if (part.inlineData && part.inlineData.data) {
                const imageData = Buffer.from(part.inlineData.data, "base64");

                // Ensure directory exists
                const dir = path.dirname(imagePath);
                if (!fs.existsSync(dir)) {
                    fs.mkdirSync(dir, { recursive: true });
                }

                fs.writeFileSync(imagePath, imageData);
                console.log(`Image saved as ${imagePath}`);
                return;
            }
        }

        throw new Error("No image data found in response");
    } catch (error) {
        throw new Error(`Failed to generate image: ${error}`);
    }
}

/**
 * Generate image and save to local uploads storage
 * Returns the URL path to the saved image
 */
export async function generateImageToStorage(
    prompt: string,
    filename: string,
    category: "ai-generated" | "menu" | "restaurants" = "ai-generated"
): Promise<string> {
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.0-flash-exp-image-generation",
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            config: {
                responseModalities: [Modality.TEXT, Modality.IMAGE],
            },
        });

        const candidates = response.candidates;
        if (!candidates || candidates.length === 0) {
            throw new Error("No candidates returned from Gemini");
        }

        const content = candidates[0].content;
        if (!content || !content.parts) {
            throw new Error("No content parts in response");
        }

        for (const part of content.parts) {
            if (part.inlineData && part.inlineData.data) {
                const imageData = Buffer.from(part.inlineData.data, "base64");

                // Save to local storage
                const result = await LocalObjectStorageService.saveFile(
                    imageData,
                    filename,
                    category
                );

                if (result.success && result.url) {
                    console.log(`[Gemini] Image saved to storage: ${result.url}`);
                    return result.url;
                }

                throw new Error("Failed to save image to storage");
            }
        }

        throw new Error("No image data found in response");
    } catch (error) {
        console.error("[Gemini] Image generation error:", error);
        throw new Error(`Failed to generate image: ${error}`);
    }
}