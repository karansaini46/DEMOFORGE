import { PrismaClient } from '@prisma/client';
import { Job as BullJob, Worker } from 'bullmq';
import fs from 'fs-extra';
import path from 'path';

import { env } from '../config/env';
import { assembleAudio, normalizeRecording } from '../services/assembler.service';
import { generateScript } from '../services/generator.service';
import { record } from '../services/recorder.service';
import { renderReel, BrowserTemplate } from '../services/remotion.service';
import { scrape } from '../services/scraper.service';
import { uploadVideo } from '../services/storage.service';
import { generateVoiceover } from '../services/tts.service';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

export const jobWorker = new Worker(
  'demoforge-jobs',
  async (job: BullJob) => {
    const { jobId, url, templateId } = job.data;
    const tempDir = path.join(env.TEMP_DIR, jobId);

    try {
      await fs.ensureDir(tempDir);

      await prisma.job.update({
        where: { id: jobId },
        data: { status: 'PROCESSING', currentStep: 'Scraping website data...', stepProgress: 10 },
      });

      // 1. Scrape
      const scrapedData = await scrape(url, jobId, tempDir);

      await prisma.job.update({
        where: { id: jobId },
        data: { currentStep: 'Generating AI script...', stepProgress: 30 },
      });

      // 2. Generate Script
      const script = await generateScript(scrapedData, jobId);

      await prisma.job.update({
        where: { id: jobId },
        data: { currentStep: 'Recording browser interaction...', stepProgress: 50 },
      });

      // 3. Record + normalize for embedding
      const recordingPath = await record(url, script, jobId, tempDir);
      const normalizedRecording = await normalizeRecording(recordingPath, tempDir);

      await prisma.job.update({
        where: { id: jobId },
        data: { currentStep: 'Generating voiceovers...', stepProgress: 60 },
      });

      // 4. TTS
      const audioSegments: string[] = [];
      for (let i = 0; i < script.sections.length; i++) {
        const audioPath = path.join(tempDir, `audio_${i}.mp3`);
        await generateVoiceover(script.sections[i].narration, audioPath, jobId);
        audioSegments.push(audioPath);
      }

      await prisma.job.update({
        where: { id: jobId },
        data: { currentStep: 'Rendering reel...', stepProgress: 75 },
      });

      // 5. Remotion — render the full vertical reel (visual only)
      const brandName = script.brandName || scrapedData.brandName;
      const sectionDurations = script.sections.map((s) => s.durationSeconds || 4);
      const template = (['modern-saas', 'dark-dev', 'bold-startup'] as const).includes(
        templateId,
      )
        ? (templateId as BrowserTemplate)
        : 'modern-saas';
      const reelPath = await renderReel({
        jobId,
        script,
        recordingPath: normalizedRecording,
        logoPath: scrapedData.logoPath,
        brandName,
        hook: script.hook,
        tagline: script.tagline || `${brandName} explainer video.`,
        sectionDurations,
        url,
        template,
        tempDir,
      });

      await prisma.job.update({
        where: { id: jobId },
        data: { currentStep: 'Assembling final video...', stepProgress: 85 },
      });

      // 6. Assemble audio (voiceover + optional music) onto the reel
      const finalVideoPath = await assembleAudio(
        { jobId, videoPath: reelPath, audioSegments },
        tempDir,
      );

      await prisma.job.update({
        where: { id: jobId },
        data: { currentStep: 'Uploading video...', stepProgress: 95 },
      });

      // 7. Upload
      const { storagePath, publicUrl } = await uploadVideo(finalVideoPath, jobId);

      // Save Video to DB
      const dbJob = await prisma.job.findUnique({ where: { id: jobId } });
      if (!dbJob) throw new Error('Job not found in DB');

      await prisma.video.create({
        data: {
          jobId,
          userId: dbJob.userId,
          title: `Demo for ${url}`,
          url,
          storagePath,
          publicUrl,
          templateId,
          durationSec: script.sections.reduce((acc, s) => acc + s.durationSeconds, 0) + 5.5,
          fileSizeMb: (await fs.stat(finalVideoPath)).size / (1024 * 1024),
        },
      });

      await prisma.job.update({
        where: { id: jobId },
        data: { status: 'DONE', currentStep: 'Completed', stepProgress: 100 },
      });

      logger.info(`[${jobId}] Pipeline completed successfully!`);
    } catch (error) {
      logger.error(`[${jobId}] Pipeline failed: ${error}`);
      await prisma.job.update({
        where: { id: jobId },
        data: {
          status: 'FAILED',
          errorMessage: error instanceof Error ? error.message : String(error),
        },
      });
      throw error;
    } finally {
      // Clean up temp dir after job finishes (success or fail)
      await fs.remove(tempDir).catch((e) => logger.error(`[${jobId}] Failed to cleanup temp dir: ${e}`));
    }
  },
  {
    connection: {
      url: env.REDIS_URL,
    },
    concurrency: env.MAX_CONCURRENT_JOBS,
    autorun: false,
  },
);
