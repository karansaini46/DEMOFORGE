import { spawn } from 'node:child_process';
import path from 'node:path';

import fs from 'fs-extra';

import { ffmpeg } from '../config/ffmpeg';
import { AppError } from '../middleware/error.middleware';
import { logger } from '../utils/logger';
import { AudioSegment, GeneratedScript } from '../types/pipeline.types';

// edge-tts neural voices keyed by template. Falls back to the modern-saas voice.
const VOICE_MAP: Record<string, string> = {
  'modern-saas': 'en-US-GuyNeural',
  'dark-dev': 'en-GB-RyanNeural',
  'bold-startup': 'en-US-AriaNeural',
};
const DEFAULT_VOICE = 'en-US-GuyNeural';

const TTS_TIMEOUT_MS = 30_000;

function resolveVoice(templateId: string): string {
  return VOICE_MAP[templateId] ?? DEFAULT_VOICE;
}

/**
 * Synthesizes a single narration to an mp3 via the `edge-tts` CLI.
 * Rejects on non-zero exit, spawn error, or a 30s timeout (process is killed).
 */
function synthesize(
  voice: string,
  narration: string,
  outputPath: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn('edge-tts', [
      '--voice',
      voice,
      '--text',
      narration,
      '--write-media',
      outputPath,
    ]);

    let settled = false;
    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      fn();
    };

    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      finish(() =>
        reject(new Error(`edge-tts timed out after ${TTS_TIMEOUT_MS}ms`)),
      );
    }, TTS_TIMEOUT_MS);

    child.on('error', (err) =>
      finish(() =>
        reject(
          (err as NodeJS.ErrnoException).code === 'ENOENT'
            ? new Error(
                'edge-tts CLI not found on PATH — install it with `pipx install edge-tts`',
              )
            : err,
        ),
      ),
    );

    child.on('close', (code) => {
      if (code === 0) {
        finish(resolve);
      } else {
        finish(() => reject(new Error(`edge-tts exited with code ${code}`)));
      }
    });
  });
}

/**
 * Probes an audio file's duration via ffprobe and returns it in milliseconds.
 */
function probeAudioDuration(filePath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) {
        reject(err);
        return;
      }
      const seconds = metadata.format?.duration;
      if (typeof seconds !== 'number') {
        reject(new Error(`ffprobe returned no duration for ${filePath}`));
        return;
      }
      resolve(seconds * 1000);
    });
  });
}

/**
 * Generates one mp3 narration per script section plus the outro, returning an
 * ordered list of audio segments with measured durations. Throws AppError(500)
 * if synthesis or probing fails for any segment.
 */
export async function generateAudio(
  script: GeneratedScript,
  jobId: string,
  tempDir: string,
  templateId: string,
): Promise<AudioSegment[]> {
  const voice = resolveVoice(templateId);
  const narrations = [
    ...script.sections.map((section) => section.narration),
    script.outroText,
  ];

  logger.info(
    `[tts:${jobId}] generating ${narrations.length} audio segments (voice=${voice})`,
  );

  const segments: AudioSegment[] = [];

  try {
    for (let index = 0; index < narrations.length; index += 1) {
      const outputPath = path.join(tempDir, `audio_${index}.mp3`);

      await synthesize(voice, narrations[index], outputPath);

      if (!(await fs.pathExists(outputPath))) {
        throw new Error(`expected audio file was not created: ${outputPath}`);
      }

      const durationMs = await probeAudioDuration(outputPath);
      segments.push({ path: outputPath, durationMs });
    }
  } catch (err) {
    logger.error(
      `[tts:${jobId}] audio generation failed: ${
        err instanceof Error ? err.stack ?? err.message : String(err)
      }`,
    );
    throw new AppError('Audio generation failed', 500);
  }

  return segments;
}
