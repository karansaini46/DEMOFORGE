import fs from 'fs-extra';

import { env } from '../config/env';
// The project's admin (service-role) Supabase client is exported as `supabaseService`.
import { supabaseService as supabaseAdmin } from '../config/supabase';
import { AppError } from '../middleware/error.middleware';
import { logger } from '../utils/logger';

const SIGNED_URL_TTL_SECONDS = 604800; // 7 days

export interface UploadResult {
  storageKey: string;
  publicUrl: string;
}

/**
 * Uploads a local video file to Supabase Storage under `${userId}/${jobId}/demo.mp4`
 * and returns a 7-day signed URL for playback.
 */
export async function upload(
  localPath: string,
  userId: string,
  jobId: string,
): Promise<UploadResult> {
  const key = `${userId}/${jobId}/demo.mp4`;
  const data = await fs.readFile(localPath);

  const { error: uploadError } = await supabaseAdmin.storage
    .from(env.SUPABASE_BUCKET)
    .upload(key, data, { contentType: 'video/mp4', upsert: false });

  if (uploadError) {
    logger.error(`[storage] upload failed for ${key}: ${uploadError.message}`);
    throw new AppError('Video upload failed', 500);
  }

  const { data: signed, error: signError } = await supabaseAdmin.storage
    .from(env.SUPABASE_BUCKET)
    .createSignedUrl(key, SIGNED_URL_TTL_SECONDS);

  if (signError || !signed?.signedUrl) {
    logger.error(
      `[storage] signed URL failed for ${key}: ${signError?.message ?? 'no url'}`,
    );
    throw new AppError('Video upload failed', 500);
  }

  return { storageKey: key, publicUrl: signed.signedUrl };
}

/**
 * Removes a previously uploaded object from Supabase Storage. Best-effort:
 * logs and throws an AppError on failure so callers can decide how to react.
 */
export async function deleteFile(storageKey: string): Promise<void> {
  const { error } = await supabaseAdmin.storage
    .from(env.SUPABASE_BUCKET)
    .remove([storageKey]);

  if (error) {
    logger.error(`[storage] delete failed for ${storageKey}: ${error.message}`);
    throw new AppError('Failed to delete stored video', 500);
  }
}
