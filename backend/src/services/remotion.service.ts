import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import path from 'path';

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

  const bundleLocation = await bundle({
    entryPoint: path.resolve(__dirname, '../../remotion/src/index.ts'),
  });

  const inputProps = { script, jobId };

  const timeoutInMilliseconds = 120000;
  const chromiumOptions = {
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  };

  const composition = await selectComposition({
    serveUrl: bundleLocation,
    id: templateId,
    inputProps,
    timeoutInMilliseconds,
    chromiumOptions,
  });

  const outputPath = path.join(tempDir, 'overlay.mp4');

  await renderMedia({
    composition,
    serveUrl: bundleLocation,
    codec: 'h264',
    outputLocation: outputPath,
    inputProps,
    timeoutInMilliseconds,
    chromiumOptions,
  });

  logger.info(`[${jobId}] Remotion overlay rendered at: ${outputPath}`);

  return outputPath;
}
