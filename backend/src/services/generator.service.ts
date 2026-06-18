import { GoogleGenerativeAI } from '@google/generative-ai';

import { env } from '../config/env';
import { GeneratedScript } from '../types';
import { logger } from '../utils/logger';
import { ScrapedData } from './scraper.service';

const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);

export async function generateScript(
  scrapedData: ScrapedData,
  jobId: string,
): Promise<GeneratedScript> {
  logger.info(`[${jobId}] Starting script generation using Gemini (${env.GEMINI_MODEL})`);

  const model = genAI.getGenerativeModel({ model: env.GEMINI_MODEL });

  const prompt = `
    You are an expert product marketing manager.
    Create a highly engaging product demo script based on the following website data:
    
    TITLE: ${scrapedData.title}
    DESCRIPTION: ${scrapedData.description}
    INTERACTABLE ELEMENTS: ${scrapedData.interactableElements.map((e) => `${e.label} (${e.type})`).join(', ')}

    You MUST return ONLY a raw JSON object (without any markdown formatting or code blocks) that perfectly matches this exact TypeScript interface:

    {
      "sections": [
        {
          "action": "wait:1",
          "durationSeconds": 5,
          "narration": "Welcome to the demo."
        }
      ]
    }

    The 'action' string MUST be one of:
    - "navigate: <url>"
    - "click: <css_selector>"
    - "scroll:down"
    - "wait: <seconds>"

    Keep the video under ${env.MAX_VIDEO_DURATION_SECONDS} seconds total. Use simple, punchy narration.
  `;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    
    // Extract the JSON object using regex to ignore any conversational text
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error(`Could not find JSON object in Gemini response: ${text.substring(0, 100)}...`);
    }
    const jsonString = jsonMatch[0];
    
    const parsed: GeneratedScript = JSON.parse(jsonString);
    
    if (!parsed.sections || !Array.isArray(parsed.sections)) {
      throw new Error('Invalid JSON structure returned by Gemini');
    }

    logger.info(`[${jobId}] Script generated successfully with ${parsed.sections.length} sections`);
    return parsed;
  } catch (error) {
    logger.error(`[${jobId}] Failed to generate script: ${error}`);
    const errorMsg = error instanceof Error ? error.message : String(error);
    throw new Error(`Gemini API Error: ${errorMsg}`);
  }
}
