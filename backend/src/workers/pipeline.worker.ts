import path from 'node:path';

import { Worker, Job } from 'bullmq';
import fs from 'fs-extra';

import { ffmpeg } from '../config/ffmpeg';
import { env } from '../config/env';
import { prisma } from '../config/prisma';
import { redis } from '../config/redis';
import { logger } from '../utils/logger';
import {
  PIPELINE_QUEUE_NAME,
  PipelineJobData,
} from '../queues/pipeline.queue';

import * as scraper from '../services/scraper.service';
import * as scriptgen from '../services/scriptgen.service';
import * as tts from '../services/tts.service';
import * as recorder from '../services/recorder.service';
import * as remotionSvc from '../services/remotion.service';
import * as assembler from '../services/assembler.service';
import * as storage from '../services/storage.service';
import { validateUrl } from '../services/url.service';

/** Update a job's live progress; also flips it into PROCESSING. */
function updateJob(
  jobId: string,
  currentStep: string,
  stepProgress: number,
): Promise<unknown> {
  return prisma.job.update({
    where: { id: jobId },
    data: { currentStep, stepProgress, status: 'PROCESSING' },
  });
}

/** Probe a media file's duration in seconds (0 if it can't be read). */
function probeDurationSec(filePath: string): Promise<number> {
  return new Promise((resolve) => {
    ffmpeg.ffprobe(filePath, (err, meta) => {
      if (err || typeof meta.format?.duration !== 'number') {
        resolve(0);
        return;
      }
      resolve(meta.format.duration);
    });
  });
}

/** Reject if `promise` doesn't settle within `ms`. */
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: NodeJS.Timeout;
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(
      () => reject(new Error(`${label} timed out after ${ms}ms`)),
      ms,
    );
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer)) as Promise<T>;
}

/**
 * Runs the full generation pipeline for one job. All success-path DB writes
 * happen here so they're covered by the worker's timeout budget.
 */
async function runPipeline(data: PipelineJobData, tempDir: string): Promise<void> {
  const { jobId, url, templateId, userId } = data;

  // Defense-in-depth: re-check the URL at execution time (TOCTOU/SSRF).
  const validatedUrl = await validateUrl(url);

  await updateJob(jobId, 'scraping', 0);
  const scraped = await scraper.scrape(validatedUrl, jobId, tempDir);

  await updateJob(jobId, 'scripting', 20);
  const script = await scriptgen.generate(scraped, templateId);

  await updateJob(jobId, 'recording', 35);
  const recordingPath = await recorder.record(
    validatedUrl,
    script,
    jobId,
    tempDir,
  );

  await updateJob(jobId, 'tts', 50);
  const audioSegments = await tts.generateAudio(
    script,
    jobId,
    tempDir,
    templateId,
  );

  await updateJob(jobId, 'rendering', 65);
  const overlayPath = await remotionSvc.renderOverlay({
    jobId,
    templateId,
    script,
    screenshots: scraped.screenshots,
    tempDir,
  });

  await updateJob(jobId, 'assembling', 80);
  const finalPath = await assembler.assemble(
    { recordingPath, audioSegments, overlayPath, script },
    tempDir,
  );

  const { storageKey, publicUrl } = await storage.upload(
    finalPath,
    userId,
    jobId,
  );

  const durationSec = await probeDurationSec(finalPath);
  const { size } = await fs.stat(finalPath);
  const fileSizeMb = size / (1024 * 1024);

  // Persist the video, mark the job done, and bump usage atomically.
  await prisma.$transaction([
    prisma.video.create({
      data: {
        userId,
        jobId,
        title: script.appTitle,
        url: publicUrl,
        storagePath: storageKey,
        publicUrl,
        templateId,
        durationSec,
        fileSizeMb,
      },
    }),
    prisma.job.update({
      where: { id: jobId },
      data: { status: 'DONE', currentStep: 'done', stepProgress: 100 },
    }),
    prisma.user.update({
      where: { id: userId },
      data: { monthlyUsage: { increment: 1 } },
    }),
  ]);

  logger.info(`[pipeline:${jobId}] completed → ${publicUrl}`);
}

async function processJob(job: Job<PipelineJobData>): Promise<void> {
  const { jobId } = job.data;
  const tempDir = path.join(env.TEMP_DIR, jobId);

  try {
    await fs.ensureDir(tempDir);
    await withTimeout(
      runPipeline(job.data, tempDir),
      env.JOB_TIMEOUT_MS,
      `job ${jobId}`,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error(`[pipeline:${jobId}] failed: ${message}`);
    await prisma.job
      .update({
        where: { id: jobId },
        data: { status: 'FAILED', errorMessage: message },
      })
      .catch((dbErr) =>
        logger.error(
          `[pipeline:${jobId}] could not mark FAILED: ${
            dbErr instanceof Error ? dbErr.message : String(dbErr)
          }`,
        ),
      );
    throw err;
  } finally {
    await fs.remove(tempDir).catch(() => {});
  }
}

export const pipelineWorker = new Worker<PipelineJobData>(
  PIPELINE_QUEUE_NAME,
  processJob,
  { connection: redis, concurrency: env.MAX_CONCURRENT_JOBS },
);

pipelineWorker.on('completed', (job) => {
  logger.info(`[pipeline] job ${job.id} completed`);
});

pipelineWorker.on('failed', (job, err) => {
  logger.error(`[pipeline] job ${job?.id} failed: ${err.message}`);
});

logger.info(
  `[pipeline] worker started (concurrency=${env.MAX_CONCURRENT_JOBS})`,
);
