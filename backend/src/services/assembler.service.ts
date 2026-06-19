import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs-extra';
import path from 'path';

import { AppError } from '../middleware/error.middleware';
import { GeneratedScript } from '../types';
import { logger } from '../utils/logger';

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

export async function assemble(
  params: {
    jobId: string;
    recordingPath: string;
    audioSegments: string[];
    overlayPath: string;
    script: GeneratedScript;
  },
  tempDir: string,
): Promise<string> {
  const { jobId, recordingPath, audioSegments, overlayPath } = params;
  logger.info(`[${jobId}] Starting video assembler`);

  // Resolve all paths to absolute — ffmpeg subprocess needs absolute paths
  const absTempDir = path.resolve(tempDir);
  const normPath = path.join(absTempDir, 'recording_norm.mp4');
  const mergedAudioPath = path.join(absTempDir, 'merged_audio.mp3');
  const compositedPath = path.join(absTempDir, 'composited.mp4');
  const finalPath = path.join(absTempDir, 'final.mp4');

  // STEP 1: Normalize recording
  logger.info(`[${jobId}] STEP 1: Normalizing recording to h264 720p 30fps...`);
  await new Promise<void>((resolve, reject) => {
    ffmpeg(path.resolve(recordingPath))
      .outputOptions([
        '-vf scale=1280:720',
        '-r 30',
        '-c:v libx264',
        '-preset fast',
        '-crf 23',
      ])
      .save(normPath)
      .on('end', () => resolve())
      .on('error', (err: Error) => reject(err));
  });

  // STEP 2: Concat audio segments
  logger.info(`[${jobId}] STEP 2: Concatenating audio segments...`);
  if (audioSegments.length > 0) {
    const concatListPath = path.join(absTempDir, 'concat.txt');
    const concatContent = audioSegments.map((a) => `file '${path.resolve(a)}'`).join('\n');
    await fs.writeFile(concatListPath, concatContent);

    await new Promise<void>((resolve, reject) => {
      ffmpeg()
        .input(concatListPath)
        .inputOptions(['-f concat', '-safe 0'])
        .outputOptions(['-c copy'])
        .save(mergedAudioPath)
        .on('end', () => resolve())
        .on('error', (err: Error) => reject(err));
    });
  } else {
    logger.warn(`[${jobId}] No audio segments provided!`);
  }

  // STEP 3: Overlay Remotion video on browser recording
  logger.info(`[${jobId}] STEP 3: Compositing overlay onto recording...`);
  await new Promise<void>((resolve, reject) => {
    ffmpeg()
      .input(normPath)
      .input(path.resolve(overlayPath))
      .complexFilter(['[0:v][1:v]overlay=0:0[v]'])
      .outputOptions(['-map [v]', '-c:v libx264', '-preset fast', '-crf 23'])
      .save(compositedPath)
      .on('end', () => resolve())
      .on('error', (err: Error) => reject(err));
  });

  // STEP 4: Add audio
  logger.info(`[${jobId}] STEP 4: Adding final audio track...`);
  await new Promise<void>((resolve, reject) => {
    const cmd = ffmpeg().input(compositedPath);
    if (audioSegments.length > 0) {
      cmd.input(mergedAudioPath);
      cmd.outputOptions(['-c:v copy', '-c:a aac', '-shortest']);
    } else {
      cmd.outputOptions(['-c:v copy']);
    }
    cmd
      .save(finalPath)
      .on('end', () => resolve())
      .on('error', (err: Error) => reject(err));
  });

  // STEP 5: Check file size
  logger.info(`[${jobId}] STEP 5: Checking final file size...`);
  const stat = await fs.stat(finalPath);
  const sizeMB = stat.size / (1024 * 1024);
  if (sizeMB > 500) {
    throw new AppError(`Final video size exceeds 500MB limit (${sizeMB.toFixed(2)}MB)`, 400);
  }

  logger.info(`[${jobId}] Assembly complete! Final size: ${sizeMB.toFixed(2)}MB`);
  return finalPath;
}
