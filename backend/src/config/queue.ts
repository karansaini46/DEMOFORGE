import { Queue } from 'bullmq';
import { env } from './env';

export const jobQueue = new Queue('demoforge-jobs', {
  connection: {
    url: env.REDIS_URL,
  },
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: true,
    removeOnFail: false,
  },
});
