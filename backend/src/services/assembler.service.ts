import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs-extra';
import path from 'path';

import { env } from '../config/env';
import { AppError } from '../middleware/error.middleware';
import { logger } from '../utils/logger';

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

// Must match INTRO_SECONDS in remotion/src/Root.tsx — the voiceover starts after
// the intro reveal, so it is delayed by this much.
const INTRO_DELAY_MS = 2500;

const run = (cmd: ffmpeg.FfmpegCommand, outPath: string): Promise<void> =>
  new Promise<void>((resolve, reject) => {
    cmd
      .save(outPath)
      .on('end', () => resolve())
      .on('error', (err: Error) => reject(err));
  });

/**
 * Normalizes the Playwright recording (variable-framerate webm) to a constant
 * 30fps H.264 mp4 so Remotion's OffthreadVideo embeds it reliably.
 */
export async function normalizeRecording(
  recordingPath: string,
  tempDir: string,
): Promise<string> {
  const outPath = path.join(path.resolve(tempDir), 'recording_norm.mp4');
  await run(
    ffmpeg(path.resolve(recordingPath)).outputOptions([
      '-vf scale=1280:720',
      '-r 30',
      '-c:v libx264',
      '-preset fast',
      '-crf 23',
      '-pix_fmt yuv420p',
      '-an',
    ]),
    outPath,
  );
  return outPath;
}

/**
 * Builds the final video by attaching audio to the already-composited Remotion
 * reel: concatenates per-section voiceover segments, optionally mixes a ducked
 * background-music bed, and muxes onto the video.
 */
export async function assembleAudio(
  params: {
    jobId: string;
    videoPath: string;
    audioSegments: string[];
  },
  tempDir: string,
): Promise<string> {
  const { jobId, videoPath, audioSegments } = params;
  logger.info(`[${jobId}] Starting audio assembly`);

  const absTempDir = path.resolve(tempDir);
  const voiceoverPath = path.join(absTempDir, 'voiceover.mp3');
  const finalPath = path.join(absTempDir, 'final.mp4');

  const musicPath =
    env.MUSIC_PATH && (await fs.pathExists(path.resolve(env.MUSIC_PATH)))
      ? path.resolve(env.MUSIC_PATH)
      : undefined;
  if (env.MUSIC_PATH && !musicPath) {
    logger.warn(`[${jobId}] MUSIC_PATH set but file not found — rendering voiceover only`);
  }

  // STEP 1: Concatenate voiceover segments (if any).
  let hasVoiceover = false;
  if (audioSegments.length > 0) {
    logger.info(`[${jobId}] STEP 1: Concatenating ${audioSegments.length} voiceover segment(s)...`);
    const concatListPath = path.join(absTempDir, 'concat.txt');
    const concatContent = audioSegments.map((a) => `file '${path.resolve(a)}'`).join('\n');
    await fs.writeFile(concatListPath, concatContent);

    await run(
      ffmpeg()
        .input(concatListPath)
        .inputOptions(['-f concat', '-safe 0'])
        .outputOptions(['-c copy']),
      voiceoverPath,
    );
    hasVoiceover = true;
  } else {
    logger.warn(`[${jobId}] No voiceover segments provided`);
  }

  // STEP 2: Mux audio onto the reel video.
  logger.info(`[${jobId}] STEP 2: Muxing audio (voiceover=${hasVoiceover}, music=${Boolean(musicPath)})...`);
  const cmd = ffmpeg().input(path.resolve(videoPath));

  if (hasVoiceover && musicPath) {
    cmd.input(voiceoverPath);
    cmd.input(musicPath).inputOptions(['-stream_loop', '-1']);
    // The bundled ffmpeg predates amix's `normalize` option, so amix halves each
    // input (1/inputs). Pre-amplify by 2x to land on the intended final levels:
    // voiceover ~1.0, music ~0.18.
    cmd
      .complexFilter([
        `[1:a]adelay=${INTRO_DELAY_MS}|${INTRO_DELAY_MS},volume=2.0[vo]`,
        `[2:a]volume=0.36[mu]`,
        `[vo][mu]amix=inputs=2:duration=longest[a]`,
      ])
      .outputOptions(['-map 0:v', '-map [a]', '-c:v copy', '-c:a aac', '-shortest']);
  } else if (hasVoiceover) {
    cmd.input(voiceoverPath);
    cmd
      .complexFilter([`[1:a]adelay=${INTRO_DELAY_MS}|${INTRO_DELAY_MS}[a]`])
      .outputOptions(['-map 0:v', '-map [a]', '-c:v copy', '-c:a aac', '-shortest']);
  } else if (musicPath) {
    cmd.input(musicPath).inputOptions(['-stream_loop', '-1']);
    cmd
      .complexFilter([`[1:a]volume=0.25[a]`])
      .outputOptions(['-map 0:v', '-map [a]', '-c:v copy', '-c:a aac', '-shortest']);
  } else {
    cmd.outputOptions(['-c:v copy']);
  }

  await run(cmd, finalPath);

  // STEP 3: Sanity-check final size.
  const stat = await fs.stat(finalPath);
  const sizeMB = stat.size / (1024 * 1024);
  if (sizeMB > 500) {
    throw new AppError(`Final video size exceeds 500MB limit (${sizeMB.toFixed(2)}MB)`, 400);
  }

  logger.info(`[${jobId}] Audio assembly complete! Final size: ${sizeMB.toFixed(2)}MB`);
  return finalPath;
}
