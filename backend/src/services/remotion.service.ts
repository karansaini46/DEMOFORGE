import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import path from 'path';
import { chromium } from 'playwright';

import { GeneratedScript } from '../types';
import { logger } from '../utils/logger';

export async function renderOverlay(params: {
  jobId: string;
  templateId: string;
  script: GeneratedScript;
  screenshots?: string[];
  tempDir: string;
}): Promise<string> {
  const { jobId, templateId, script, tempDir } = params;

  logger.info(`[${jobId}] Starting Remotion overlay rendering for template: ${templateId}`);

  // Reuse Playwright's already-installed Chromium for Remotion rendering
  const browserExecutable = chromium.executablePath();
  logger.info(`[${jobId}] Using browser executable: ${browserExecutable}`);

  const bundleLocation = await bundle({
    entryPoint: path.resolve(__dirname, '../../remotion/src/index.ts'),
  });

  const inputProps = { script, jobId };

  const timeoutInMilliseconds = 120000;

  const composition = await selectComposition({
    serveUrl: bundleLocation,
    id: templateId,
    inputProps,
    timeoutInMilliseconds,
    browserExecutable,
  });

  const outputPath = path.join(tempDir, 'overlay.mp4');

  await renderMedia({
    composition,
    serveUrl: bundleLocation,
    codec: 'h264',
    outputLocation: outputPath,
    inputProps,
    timeoutInMilliseconds,
    browserExecutable,
  });

  logger.info(`[${jobId}] Remotion overlay rendered at: ${outputPath}`);

  return outputPath;
}
