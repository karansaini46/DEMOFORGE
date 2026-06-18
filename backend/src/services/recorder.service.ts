import path from 'node:path';

import fs from 'fs-extra';
import { chromium } from 'playwright';

import { env } from '../config/env';
import { AppError } from '../middleware/error.middleware';
import { logger } from '../utils/logger';
import { GeneratedScript } from '../types/pipeline.types';

const SETTLE_MS = 2000;
const CLICK_TIMEOUT_MS = 3000;
const SCROLL_PX = 400;

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Replays a generated script against the live page in a headless browser while
 * Playwright records the viewport to a .webm file. Each section's action is
 * "soft" — failures are swallowed so a bad selector never aborts the recording.
 *
 * @returns absolute path to the recorded .webm file.
 */
export async function record(
  url: string,
  script: GeneratedScript,
  jobId: string,
  tempDir: string,
): Promise<string> {
  logger.info(`[record:${jobId}] starting recording of ${url}`);

  const browser = await chromium.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--single-process',
    ],
  });

  try {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      recordVideo: { dir: tempDir, size: { width: 1280, height: 720 } },
    });

    const page = await context.newPage();
    page.setDefaultTimeout(env.PLAYWRIGHT_TIMEOUT_MS);

    await page.goto(url, { waitUntil: 'networkidle' });
    await sleep(SETTLE_MS); // let the page settle before the first beat

    for (const section of script.sections) {
      const action = section.action.trim();
      const value = action.slice(action.indexOf(':') + 1).trim();

      if (action.startsWith('navigate:')) {
        // Resolve relative targets against the current URL; soft-fail on error.
        const target = (() => {
          try {
            return new URL(value, url).toString();
          } catch {
            return value;
          }
        })();
        await page.goto(target, { waitUntil: 'networkidle' }).catch(() => {});
      } else if (action.startsWith('click:')) {
        await page.click(value, { timeout: CLICK_TIMEOUT_MS }).catch(() => {});
      } else if (action.startsWith('scroll:down')) {
        await page
          .evaluate((px) => window.scrollBy(0, px), SCROLL_PX)
          .catch(() => {});
      } else if (action.startsWith('wait:')) {
        const seconds = Number.parseFloat(value) || 0;
        await sleep(seconds * 1000);
      } else {
        logger.warn(`[record:${jobId}] unknown action skipped: ${action}`);
      }

      // Hold on the result for the section's planned duration.
      await sleep(section.durationSeconds * 1000);
    }

    // Closing the context flushes and finalizes the video file.
    await context.close();

    const files = await fs.readdir(tempDir);
    const webm = files.find((f) => f.endsWith('.webm'));
    if (!webm) {
      throw new AppError('Recording failed: no video file produced', 500);
    }

    const recordingPath = path.resolve(tempDir, webm);
    logger.info(`[record:${jobId}] recording saved to ${recordingPath}`);
    return recordingPath;
  } finally {
    // Always release the browser, even if recording threw.
    await browser.close().catch(() => {});
  }
}
