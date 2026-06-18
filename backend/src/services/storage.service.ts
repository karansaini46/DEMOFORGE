import { createClient } from '@supabase/supabase-js';
import fs from 'fs-extra';

import { env } from '../config/env';
import { AppError } from '../middleware/error.middleware';
import { logger } from '../utils/logger';

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY);

export async function uploadVideo(
  filePath: string,
  jobId: string,
): Promise<{ storagePath: string; publicUrl: string }> {
  logger.info(`[${jobId}] Uploading final video to Supabase Storage...`);

  try {
    const fileBuffer = await fs.readFile(filePath);
    const fileName = `demo_${jobId}_${Date.now()}.mp4`;
    const storagePath = `videos/${fileName}`;

    const { data, error } = await supabase.storage
      .from(env.SUPABASE_BUCKET)
      .upload(storagePath, fileBuffer, {
        contentType: 'video/mp4',
        upsert: false,
      });

    if (error) {
      throw error;
    }

    const { data: urlData } = supabase.storage
      .from(env.SUPABASE_BUCKET)
      .getPublicUrl(data.path);

    logger.info(`[${jobId}] Video uploaded successfully. Public URL: ${urlData.publicUrl}`);

    return {
      storagePath: data.path,
      publicUrl: urlData.publicUrl,
    };
  } catch (error) {
    logger.error(`[${jobId}] Supabase upload failed: ${error}`);
    throw new AppError('Failed to upload video to cloud storage', 500);
  }
}
