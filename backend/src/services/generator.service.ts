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

  const model = genAI.getGenerativeModel({
    model: env.GEMINI_MODEL,
    generationConfig: {
      responseMimeType: 'application/json',
    },
  });

  const prompt = `
    You are an expert short-form video scriptwriter creating a vertical (9:16)
    "SaaS explainer reel" — the kind of punchy, energetic product video posted on
    TikTok / Instagram Reels. The real product's screen recording plays inside a
    floating glass card while short kinetic captions and a voiceover sell it.

    Base the script on this scraped website data:

    BRAND: ${scrapedData.brandName}
    TITLE: ${scrapedData.title}
    DESCRIPTION: ${scrapedData.description}
    KEY HEADINGS: ${scrapedData.features.join(' | ')}
    INTERACTABLE ELEMENTS: ${scrapedData.interactableElements.map((e) => `${e.label} (${e.type})`).join(', ')}

    You MUST return ONLY a raw JSON object (no markdown, no code fences) matching
    this exact TypeScript interface:

    {
      "brandName": "string — the product's short brand name",
      "hook": "string — a punchy first caption line, e.g. 'POV: You just found your new'",
      "tagline": "string — a short 2-4 word second line, e.g. 'favorite SaaS tool.'",
      "sections": [
        {
          "action": "wait:1",
          "durationSeconds": 4,
          "narration": "Full sentence spoken by the voiceover for this beat.",
          "onScreenText": "<= 6 word kinetic caption"
        }
      ]
    }

    Rules:
    - The 'action' string MUST be one of:
      - "navigate: <url>"
      - "click: <css_selector>"
      - "scroll:down"
      - "wait: <seconds>"
    - 4 to 6 sections. Each 'durationSeconds' between 3 and 6.
    - 'narration': one natural spoken sentence (this becomes the voiceover).
    - 'onScreenText': a SHORT punchy phrase (<= 6 words), NOT the same as the narration.
    - Keep the spoken video under ${env.MAX_VIDEO_DURATION_SECONDS} seconds total.
    - Tone: confident, modern, benefit-driven.
  `;

  try {
    const result = await model.generateContent(prompt);
    const rawText = result.response.text().trim();
    
    logger.debug(`[${jobId}] Raw Gemini response (first 500 chars): ${rawText.substring(0, 500)}`);
    
    // Strip markdown code fences (```json ... ``` or ``` ... ```)
    let text = rawText.replace(/```(?:json)?\s*/gi, '').replace(/```/g, '').trim();
    
    // Extract the JSON object using regex to ignore any conversational text
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error(`Could not find JSON object in Gemini response: ${rawText.substring(0, 200)}...`);
    }
    let jsonString = jsonMatch[0];
    
    // Remove trailing commas before } or ] (common LLM issue)
    jsonString = jsonString.replace(/,\s*([\]}])/g, '$1');
    
    logger.debug(`[${jobId}] Cleaned JSON (first 300 chars): ${jsonString.substring(0, 300)}`);
    
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
