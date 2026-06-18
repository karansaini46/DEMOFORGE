import { Queue } from 'bullmq';

import { redis } from '../config/redis';

export const PIPELINE_QUEUE_NAME = 'pipeline';

export interface PipelineJobData {
  jobId: string;
  url: string;
  templateId: string;
  userId: string;
}

export const pipelineQueue = new Queue<PipelineJobData>(PIPELINE_QUEUE_NAME, {
  connection: redis,
});

/**
 * Enqueues a generation job. Note: BullMQ v5 removed the per-job `timeout`
 * option, so the JOB_TIMEOUT_MS budget is enforced inside the worker instead.
 */
export async function addJob(data: PipelineJobData): Promise<void> {
  await pipelineQueue.add('run', data, {
    attempts: 1,
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 50 },
  });
}
