import path from 'node:path';

import { chromium } from 'playwright';

import { env } from '../config/env';
import { AppError } from '../middleware/error.middleware';
import { logger } from '../utils/logger';

export interface ScrapedData {
  title: string;
  description: string;
  features: string[];
  navItems: { text: string; href: string }[];
  screenshots: string[];
  interactableElements: { label: string; selector: string; type: string }[];
}

// Resource types that add no value to a static scrape — blocked to speed up loads.
const BLOCKED_RESOURCE_TYPES = ['font', 'media', 'websocket'];

const MAX_NAV_VISITS = 2;

/**
 * Loads a (pre-validated) URL in a headless Chromium instance, extracts page
 * metadata/structure, and captures screenshots of the main page plus up to two
 * same-domain nav destinations. Returns structured data for downstream use.
 */
export async function scrape(
  validatedUrl: string,
  jobId: string,
  tempDir: string,
): Promise<ScrapedData> {
  logger.info(`[scrape:${jobId}] starting scrape of ${validatedUrl}`);

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
    });
    const page = await context.newPage();

    // Block heavy resource types before any navigation occurs.
    await page.route('**/*', (route) => {
      if (BLOCKED_RESOURCE_TYPES.includes(route.request().resourceType())) {
        void route.abort();
      } else {
        void route.continue();
      }
    });

    page.setDefaultTimeout(env.PLAYWRIGHT_TIMEOUT_MS);
    page.setDefaultNavigationTimeout(env.PLAYWRIGHT_NAVIGATION_TIMEOUT_MS);

    await page.goto(validatedUrl, { waitUntil: 'networkidle' });

    const extracted = await page.evaluate(() => {
      const text = (el: Element): string =>
        (el as HTMLElement).innerText?.trim() ?? '';

      const title = document.title;

      const metaDesc = document
        .querySelector('meta[name="description"]')
        ?.getAttribute('content');
      const ogDesc = document
        .querySelector('meta[property="og:description"]')
        ?.getAttribute('content');
      const description = (metaDesc || ogDesc || '').trim();

      const features = Array.from(document.querySelectorAll('h1,h2,h3'))
        .map(text)
        .filter((t) => t.length > 0)
        .slice(0, 8);

      const navItems = Array.from(document.querySelectorAll('nav a, header a'))
        .map((el) => ({
          text: text(el),
          href: (el as HTMLAnchorElement).href,
        }))
        .filter((item) => item.href.length > 0)
        .slice(0, 6);

      const buildSelector = (el: Element): string => {
        const tag = el.tagName.toLowerCase();
        const className =
          typeof el.className === 'string' ? el.className.trim() : '';
        if (!className) return tag;
        return tag + '.' + className.split(/\s+/).join('.');
      };

      const interactableElements = Array.from(
        document.querySelectorAll('button, a[href], input[type=submit]'),
      )
        .map((el) => {
          const label =
            text(el) ||
            (el as HTMLInputElement).placeholder ||
            (el as HTMLInputElement).value ||
            '';
          const type = el.getAttribute('type') || el.tagName.toLowerCase();
          return { label, selector: buildSelector(el), type };
        })
        .slice(0, 10);

      return { title, description, features, navItems, interactableElements };
    });

    // Main screenshot.
    const screenshots: string[] = [];
    const mainPath = path.resolve(tempDir, 'ss_main.png');
    await page.screenshot({ path: mainPath, fullPage: false, type: 'png' });
    screenshots.push(mainPath);

    // Visit up to MAX_NAV_VISITS same-domain nav links and screenshot each.
    const baseHostname = new URL(validatedUrl).hostname;
    const sameDomainLinks: string[] = [];
    for (const item of extracted.navItems) {
      if (sameDomainLinks.length >= MAX_NAV_VISITS) break;
      try {
        if (
          new URL(item.href).hostname === baseHostname &&
          !sameDomainLinks.includes(item.href) &&
          item.href !== validatedUrl
        ) {
          sameDomainLinks.push(item.href);
        }
      } catch {
        // Skip unparseable hrefs.
      }
    }

    for (let i = 0; i < sameDomainLinks.length; i++) {
      const href = sameDomainLinks[i];
      try {
        await page.goto(href, { waitUntil: 'networkidle' });
        const shotPath = path.resolve(tempDir, `ss_${i + 1}.png`);
        await page.screenshot({ path: shotPath, fullPage: false, type: 'png' });
        screenshots.push(shotPath);
      } catch (err) {
        logger.warn(
          `[scrape:${jobId}] failed to capture nav link ${href}: ${
            err instanceof Error ? err.message : 'unknown error'
          }`,
        );
      }
    }

    logger.info(
      `[scrape:${jobId}] completed with ${screenshots.length} screenshot(s)`,
    );

    return {
      title: extracted.title,
      description: extracted.description,
      features: extracted.features,
      navItems: extracted.navItems,
      screenshots,
      interactableElements: extracted.interactableElements,
    };
  } catch (err) {
    if (err instanceof AppError) throw err;
    logger.error(
      `[scrape:${jobId}] scrape failed: ${
        err instanceof Error ? err.stack ?? err.message : String(err)
      }`,
    );
    throw new AppError(
      `Failed to scrape page: ${
        err instanceof Error ? err.message : 'unknown error'
      }`,
      502,
    );
  } finally {
    await browser.close();
  }
}
