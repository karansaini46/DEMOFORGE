import { exec } from 'child_process';
import fs from 'fs-extra';
import { promisify } from 'util';

import { AppError } from '../middleware/error.middleware';
import { logger } from '../utils/logger';

const execAsync = promisify(exec);

export async function generateVoiceover(
  text: string,
  outputPath: string,
  jobId: string,
): Promise<void> {
  logger.info(`[${jobId}] Generating TTS for text: "${text.substring(0, 30)}..."`);
  
  // Clean the text to avoid command injection or bad formatting
  const safeText = text.replace(/"/g, '\\"').replace(/\n/g, ' ');

  // Use the globally installed edge-tts. Voice: en-US-AriaNeural (popular female voice)
  const command = `edge-tts --voice en-US-AriaNeural --text "${safeText}" --write-media "${outputPath}"`;

  try {
    await execAsync(command);
    
    // Verify file exists and has size
    if (!fs.existsSync(outputPath)) {
      throw new Error('TTS file was not created');
    }
    
    const stat = await fs.stat(outputPath);
    if (stat.size === 0) {
      throw new Error('TTS file is empty');
    }
    
  } catch (error) {
    logger.error(`[${jobId}] TTS generation failed: ${error}`);
    throw new AppError('Failed to generate voiceover audio', 500);
  }
}
