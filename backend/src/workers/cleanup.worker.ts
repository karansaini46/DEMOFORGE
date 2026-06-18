import path from 'node:path';

import cron from 'node-cron';
import fs from 'fs-extra';

import { env } from '../config/env';
import { prisma } from '../config/prisma';
import { logger } from '../utils/logger';

// First day of each month at 00:00 — reset every user's monthly usage counter.
const MONTHLY_RESET_CRON = '0 0 1 * *';
// Every N minutes (N must be 1-59, enforced by the env schema).
const TEMP_CLEANUP_CRON = `*/${env.CLEANUP_INTERVAL_MINUTES} * * * *`;

/** Reset all users' monthly usage to 0 at the start of each calendar month. */
async function resetMonthlyUsage(): Promise<void> {
  try {
    const { count } = await prisma.user.updateMany({
      data: { monthlyUsage: 0, usageResetAt: new Date() },
    });
    logger.info(`[cleanup] reset monthly usage for ${count} users`);
  } catch (err) {
    logger.error(
      `[cleanup] monthly usage reset failed: ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
  }
}

/** Remove job temp directories older than TEMP_FILE_MAX_AGE_HOURS. */
async function cleanupTempDirs(): Promise<void> {
  const maxAgeMs = env.TEMP_FILE_MAX_AGE_HOURS * 60 * 60 * 1000;
  const cutoff = Date.now() - maxAgeMs;

  try {
    await fs.ensureDir(env.TEMP_DIR);
    const entries = await fs.readdir(env.TEMP_DIR);
    let removed = 0;

    for (const entry of entries) {
      const fullPath = path.join(env.TEMP_DIR, entry);
      try {
        const stat = await fs.stat(fullPath);
        if (stat.mtimeMs < cutoff) {
          await fs.remove(fullPath);
          removed += 1;
        }
      } catch {
        // Entry vanished (e.g. an active job cleaned it up) — ignore.
      }
    }

    if (removed > 0) {
      logger.info(`[cleanup] removed ${removed} stale temp entr(y/ies)`);
    }
  } catch (err) {
    logger.error(
      `[cleanup] temp dir cleanup failed: ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
  }
}

// Start both schedules at import time.
cron.schedule(MONTHLY_RESET_CRON, () => {
  void resetMonthlyUsage();
});

cron.schedule(TEMP_CLEANUP_CRON, () => {
  void cleanupTempDirs();
});

logger.info(
  `[cleanup] schedulers started (usage reset: "${MONTHLY_RESET_CRON}", ` +
    `temp cleanup: "${TEMP_CLEANUP_CRON}", max age: ${env.TEMP_FILE_MAX_AGE_HOURS}h)`,
);
