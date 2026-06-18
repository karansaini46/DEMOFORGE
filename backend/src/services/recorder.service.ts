import fs from 'fs-extra';
import path from 'path';
import { chromium } from 'playwright';

import { env } from '../config/env';
import { AppError } from '../middleware/error.middleware';
import { GeneratedScript } from '../types';
import { logger } from '../utils/logger';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function record(
  url: string,
  script: GeneratedScript,
  jobId: string,
  tempDir: string,
): Promise<string> {
  logger.info(`[${jobId}] Starting browser recorder for URL: ${url}`);

  const browser = await chromium.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
    ],
  });

  try {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      recordVideo: { dir: tempDir, size: { width: 1280, height: 720 } },
    });

    const page = await context.newPage();
    page.setDefaultTimeout(env.PLAYWRIGHT_TIMEOUT_MS);

    logger.info(`[${jobId}] Navigating to initial URL`);
    await page.goto(url, { waitUntil: 'networkidle' }).catch((err) => {
      logger.warn(`[${jobId}] Initial navigation soft-failed: ${err.message}`);
    });

    await sleep(2000); // let page settle

    for (const [index, section] of script.sections.entries()) {
      logger.info(`[${jobId}] Executing section ${index}: ${section.action}`);

      try {
        if (section.action.startsWith('navigate:')) {
          const targetUrl = section.action.split('navigate:')[1].trim();
          await page.goto(targetUrl).catch((err) => {
            logger.warn(`[${jobId}] Navigation action soft-failed: ${err.message}`);
          });
        } else if (section.action.startsWith('click:')) {
          const selector = section.action.split('click:')[1].trim();
          await page.click(selector, { timeout: 3000 }).catch((err) => {
            logger.warn(`[${jobId}] Click action failed for selector ${selector}: ${err.message}`);
          });
        } else if (section.action === 'scroll:down') {
          await page.evaluate(() => window.scrollBy(0, 400));
        } else if (section.action.startsWith('wait:')) {
          const waitTime = parseInt(section.action.split('wait:')[1].trim(), 10);
          if (!isNaN(waitTime)) {
            await sleep(waitTime * 1000);
          }
        }
      } catch (err) {
        logger.error(`[${jobId}] Unexpected error executing action ${section.action}: ${err}`);
      }

      await sleep(section.durationSeconds * 1000);
    }

    logger.info(`[${jobId}] Closing context to flush video to disk`);
    await context.close(); // triggers video save

    const files = await fs.readdir(tempDir);
    const webmFile = files.find((f) => f.endsWith('.webm'));

    if (!webmFile) {
      throw new AppError('Recording failed: no .webm file generated', 500);
    }

    const absolutePath = path.join(tempDir, webmFile);
    logger.info(`[${jobId}] Recording saved at: ${absolutePath}`);
    return absolutePath;
  } finally {
    await browser.close();
  }
}
