import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import fs from 'fs-extra';
import path from 'path';
import { chromium } from 'playwright';

import { GeneratedScript } from '../types';
import { logger } from '../utils/logger';

const PUBLIC_DIR = path.resolve(__dirname, '../../remotion/public');

export type BrowserTemplate = 'modern-saas' | 'dark-dev' | 'bold-startup';

/** Derive a clean "domain/path" label for the BrowserFrame URL bar. */
function toUrlBarLabel(rawUrl?: string): string | undefined {
  if (!rawUrl) return undefined;
  try {
    const u = new URL(rawUrl);
    const host = u.hostname.replace(/^www\./, '');
    const path = u.pathname && u.pathname !== '/' ? u.pathname : '';
    return `${host}${path}`;
  } catch {
    return rawUrl.replace(/^https?:\/\//, '').replace(/^www\./, '');
  }
}

export async function renderReel(params: {
  jobId: string;
  script: GeneratedScript;
  recordingPath: string;
  logoPath?: string;
  brandName?: string;
  hook?: string;
  tagline?: string;
  sectionDurations?: number[];
  /** The demo's site URL — shown (as a domain) in the BrowserFrame URL bar. */
  url?: string;
  /** BrowserFrame chrome theme. */
  template?: BrowserTemplate;
  tempDir: string;
}): Promise<string> {
  const {
    jobId,
    script,
    recordingPath,
    logoPath,
    brandName,
    hook,
    tagline,
    sectionDurations,
    url,
    template,
    tempDir,
  } = params;

  logger.info(`[${jobId}] Starting Remotion reel render (explainer-reel)`);

  // Reuse Playwright's already-installed Chromium for Remotion rendering.
  const browserExecutable = chromium.executablePath();
  logger.info(`[${jobId}] Using browser executable: ${browserExecutable}`);

  // Remotion only loads assets via staticFile() (http/bundled), not file:// —
  // so stage the per-job recording/logo under the public dir before bundling.
  const jobAssetsDir = path.join(PUBLIC_DIR, 'jobs', jobId);
  await fs.ensureDir(jobAssetsDir);
  const recordingPublicRel = path.posix.join('jobs', jobId, 'recording.mp4');
  await fs.copy(recordingPath, path.join(jobAssetsDir, 'recording.mp4'));

  let logoPublicRel: string | undefined;
  if (logoPath && (await fs.pathExists(logoPath))) {
    const ext = path.extname(logoPath) || '.png';
    logoPublicRel = path.posix.join('jobs', jobId, `logo${ext}`);
    await fs.copy(logoPath, path.join(jobAssetsDir, `logo${ext}`));
  }

  try {
    const bundleLocation = await bundle({
      entryPoint: path.resolve(__dirname, '../../remotion/src/index.ts'),
      publicDir: PUBLIC_DIR,
    });

    const inputProps = {
      script,
      jobId,
      recordingSrc: recordingPublicRel,
      logoSrc: logoPublicRel,
      brandName,
      hook,
      tagline,
      sectionDurations,
      url: toUrlBarLabel(url),
      template: template ?? 'modern-saas',
    };

    const timeoutInMilliseconds = 120000;

    const composition = await selectComposition({
      serveUrl: bundleLocation,
      id: 'explainer-reel',
      inputProps,
      timeoutInMilliseconds,
      browserExecutable,
    });

    const outputPath = path.join(tempDir, 'reel.mp4');

    // Remotion renders the entire frame (background + glass card + embedded
    // recording + captions), so we output an opaque H.264 mp4 directly — no
    // alpha/overlay compositing needed.
    await renderMedia({
      composition,
      serveUrl: bundleLocation,
      codec: 'h264',
      imageFormat: 'jpeg',
      outputLocation: outputPath,
      inputProps,
      timeoutInMilliseconds,
      browserExecutable,
      // Conservative to avoid Chromium compositor crashes on constrained workers.
      concurrency: 2,
    });

    logger.info(`[${jobId}] Remotion reel rendered at: ${outputPath}`);

    return outputPath;
  } finally {
    // Remove the per-job staged assets from the shared public dir.
    await fs
      .remove(jobAssetsDir)
      .catch((e) => logger.warn(`[${jobId}] Failed to clean staged assets: ${e}`));
  }
}
