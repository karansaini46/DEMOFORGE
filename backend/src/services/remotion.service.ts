import path from 'node:path';

import fs from 'fs-extra';
import { bundle } from '@remotion/bundler';
import { ensureBrowser, renderMedia, selectComposition } from '@remotion/renderer';

import { AppError } from '../middleware/error.middleware';
import { logger } from '../utils/logger';
import { GeneratedScript } from '../types/pipeline.types';

export interface RenderOverlayParams {
  jobId: string;
  templateId: string;
  script: GeneratedScript;
  /** Absolute paths to screenshot image files captured during scraping. */
  screenshots: string[];
  tempDir: string;
}

// Entry point of the Remotion project (kept as .ts; bundled by webpack at runtime).
const REMOTION_ENTRY = path.resolve(__dirname, '../../remotion/src/index.ts');

const MIME_BY_EXT: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
};

// The bundle is static across jobs, so build it once and reuse the location.
let bundlePromise: Promise<string> | null = null;

function getBundle(): Promise<string> {
  if (!bundlePromise) {
    bundlePromise = bundle({
      entryPoint: REMOTION_ENTRY,
      // Keep the default webpack config.
      webpackOverride: (config) => config,
    });
  }
  return bundlePromise;
}

/**
 * Reads each screenshot and returns it as a base64 data URI so the Remotion
 * browser can render it without filesystem access. Unreadable files are skipped.
 */
async function toDataUris(screenshots: string[]): Promise<string[]> {
  const uris: string[] = [];
  for (const file of screenshots) {
    try {
      const buf = await fs.readFile(file);
      const mime = MIME_BY_EXT[path.extname(file).toLowerCase()] ?? 'image/png';
      uris.push(`data:${mime};base64,${buf.toString('base64')}`);
    } catch (err) {
      logger.warn(
        `[remotion] skipping unreadable screenshot ${file}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }
  return uris;
}

/**
 * Renders the captions/callouts overlay video for a job using the Remotion
 * composition selected by templateId. Output is an h264 MP4 at 1280x720/30fps.
 *
 * @returns absolute path to the rendered overlay.mp4.
 */
export async function renderOverlay(
  params: RenderOverlayParams,
): Promise<string> {
  const { jobId, templateId, script, screenshots, tempDir } = params;
  const outputPath = path.resolve(tempDir, 'overlay.mp4');

  logger.info(
    `[remotion:${jobId}] rendering overlay (template=${templateId})`,
  );

  try {
    // Make sure the Chrome Headless Shell is present (no-op once downloaded).
    await ensureBrowser();
    const serveUrl = await getBundle();
    const inputProps = {
      script,
      screenshots: await toDataUris(screenshots),
    };

    const composition = await selectComposition({
      serveUrl,
      id: templateId,
      inputProps,
    });

    await renderMedia({
      composition,
      serveUrl,
      codec: 'h264',
      outputLocation: outputPath,
      inputProps,
      // Software rendering is the reliable choice on headless/GPU-less servers.
      chromiumOptions: { gl: 'swangle' },
    });

    logger.info(`[remotion:${jobId}] overlay rendered to ${outputPath}`);
    return outputPath;
  } catch (err) {
    logger.error(
      `[remotion:${jobId}] overlay render failed: ${
        err instanceof Error ? err.stack ?? err.message : String(err)
      }`,
    );
    throw new AppError('Overlay rendering failed', 500);
  }
}
