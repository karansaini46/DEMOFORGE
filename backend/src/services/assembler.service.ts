import path from 'node:path';

import fs from 'fs-extra';

import { ffmpeg } from '../config/ffmpeg';
import { AppError } from '../middleware/error.middleware';
import { logger } from '../utils/logger';
import { AudioSegment, GeneratedScript } from '../types/pipeline.types';

const MAX_OUTPUT_BYTES = 500 * 1024 * 1024; // 500 MB

export interface AssembleParams {
  recordingPath: string;
  audioSegments: AudioSegment[];
  overlayPath: string;
  script: GeneratedScript;
}

/** Runs a fluent-ffmpeg command to completion, resolving on 'end'. */
function runFfmpeg(command: ffmpeg.FfmpegCommand, output: string): Promise<void> {
  return new Promise((resolve, reject) => {
    command
      .on('end', () => resolve())
      .on('error', (err) => reject(err))
      .save(output);
  });
}

/**
 * Stitches the final demo video together:
 *   1. Normalize the browser recording to h264 1280x720 30fps.
 *   2. Concatenate the per-section narration audio into one track.
 *   3. Overlay the Remotion captions/callouts video on the recording.
 *   4. Mux in the merged audio.
 *   5. Guard against an oversized output.
 *
 * @returns absolute path to the final.mp4.
 */
export async function assemble(
  params: AssembleParams,
  tempDir: string,
): Promise<string> {
  const { recordingPath, audioSegments, overlayPath } = params;

  const normPath = path.resolve(tempDir, 'recording_norm.mp4');
  const mergedAudioPath = path.resolve(tempDir, 'merged_audio.mp3');
  const compositedPath = path.resolve(tempDir, 'composited.mp4');
  const concatListPath = path.resolve(tempDir, 'concat.txt');
  const finalPath = path.resolve(tempDir, 'final.mp4');

  try {
    // STEP 1 — normalize the recording to a known codec/size/fps.
    logger.info('[assemble] step 1: normalizing recording');
    await runFfmpeg(
      ffmpeg(recordingPath).outputOptions([
        '-vf',
        'scale=1280:720',
        '-r',
        '30',
        '-c:v',
        'libx264',
        '-preset',
        'fast',
        '-crf',
        '23',
      ]),
      normPath,
    );

    // STEP 2 — concat the narration segments via the concat demuxer.
    logger.info('[assemble] step 2: merging audio segments');
    if (audioSegments.length === 0) {
      throw new AppError('Assembly failed: no audio segments', 500);
    }
    const concatList = audioSegments
      .map((seg) => `file '${path.resolve(seg.path).replace(/'/g, "'\\''")}'`)
      .join('\n');
    await fs.writeFile(concatListPath, `${concatList}\n`, 'utf8');
    await runFfmpeg(
      ffmpeg(concatListPath)
        .inputOptions(['-f', 'concat', '-safe', '0'])
        .outputOptions(['-c:a', 'libmp3lame']),
      mergedAudioPath,
    );

    // STEP 3 — overlay the Remotion video on the normalized recording.
    logger.info('[assemble] step 3: overlaying Remotion video');
    await runFfmpeg(
      ffmpeg(normPath)
        .input(overlayPath)
        .complexFilter('[0:v][1:v]overlay=0:0[v]')
        .outputOptions(['-map', '[v]']),
      compositedPath,
    );

    // STEP 4 — mux in the merged audio (keep video as-is).
    logger.info('[assemble] step 4: adding audio');
    await runFfmpeg(
      ffmpeg(compositedPath)
        .input(mergedAudioPath)
        .outputOptions([
          '-map',
          '0:v:0',
          '-map',
          '1:a:0',
          '-c:v',
          'copy',
          '-c:a',
          'aac',
          '-shortest',
        ]),
      finalPath,
    );

    // STEP 5 — size guard.
    const { size } = await fs.stat(finalPath);
    if (size > MAX_OUTPUT_BYTES) {
      throw new AppError(
        `Assembly failed: output ${Math.round(size / 1024 / 1024)}MB exceeds 500MB limit`,
        500,
      );
    }

    logger.info(`[assemble] final video ready at ${finalPath}`);
    return finalPath;
  } catch (err) {
    if (err instanceof AppError) {
      throw err;
    }
    logger.error(
      `[assemble] assembly failed: ${
        err instanceof Error ? err.stack ?? err.message : String(err)
      }`,
    );
    throw new AppError('Video assembly failed', 500);
  }
}
