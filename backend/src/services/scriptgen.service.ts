import { GoogleGenerativeAI } from '@google/generative-ai';
import { z } from 'zod';

import { env } from '../config/env';
import { AppError } from '../middleware/error.middleware';
import { logger } from '../utils/logger';
import { GeneratedScript } from '../types/pipeline.types';
import { ScrapedData } from './scraper.service';

const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);

// Zod mirror of the GeneratedScript interface — used to validate the model output.
const scriptSectionSchema = z.object({
  narration: z.string().min(1),
  action: z.string().min(1),
  highlightText: z.string().min(1),
  durationSeconds: z.number(),
});

const generatedScriptSchema = z.object({
  appTitle: z.string().min(1),
  tagline: z.string().min(1),
  sections: z.array(scriptSectionSchema).min(1).max(6),
  outroText: z.string().min(1),
  totalEstimatedSeconds: z.number(),
});

function buildPrompt(scraped: ScrapedData): string {
  return `You are an expert SaaS demo video scriptwriter. Generate a 60-90 second demo
script for this web app. Output ONLY valid JSON — no markdown, no code fences,
no explanation. Match this exact schema:
{appTitle,tagline,sections:[{narration,action,highlightText,durationSeconds}],
outroText,totalEstimatedSeconds}
Rules: max 6 sections. narration: 1-2 confident sentences, no filler words.
action must be one of: navigate: | click: | scroll:down | wait:.
Use selectors from interactableElements list provided.
highlightText: 3-6 words, punchy and specific. durationSeconds: 8-20 per section.
App: ${scraped.title}. Description: ${scraped.description}.
Features: ${scraped.features.join(', ')}. NavItems: ${scraped.navItems
    .map((n) => n.text)
    .join(', ')}.
Elements: ${JSON.stringify(scraped.interactableElements)}`;
}

/** Remove ```json / ``` fences the model may wrap the JSON in, despite instructions. */
function stripCodeFences(raw: string): string {
  return raw
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();
}

function parseAndValidate(raw: string): GeneratedScript {
  const cleaned = stripCodeFences(raw);
  const parsed = JSON.parse(cleaned) as unknown;
  return generatedScriptSchema.parse(parsed);
}

/**
 * Generates a structured demo-video script from scraped app data via Gemini.
 * Retries once on invalid JSON / schema mismatch, then throws AppError(500).
 */
export async function generate(
  scraped: ScrapedData,
  templateId: string,
): Promise<GeneratedScript> {
  const model = genAI.getGenerativeModel({
    model: env.GEMINI_MODEL,
    generationConfig: { temperature: 0.3 },
  });

  const prompt = buildPrompt(scraped);
  const maxAttempts = 2;
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      return parseAndValidate(text);
    } catch (err) {
      lastError = err;
      logger.warn(
        `[scriptgen:${templateId}] attempt ${attempt}/${maxAttempts} failed: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }

  logger.error(
    `[scriptgen:${templateId}] script generation failed after ${maxAttempts} attempts: ${
      lastError instanceof Error ? lastError.stack ?? lastError.message : String(lastError)
    }`,
  );
  throw new AppError('Script generation failed', 500);
}
