import { app } from './app';
import { env } from './config/env';
import { logger } from './utils/logger';
import { jobWorker } from './workers/job.worker';

const server = app.listen(env.PORT, () => {
  logger.info(`DemoForge backend listening on port ${env.PORT} (${env.NODE_ENV})`);
  
  // Start the BullMQ worker
  jobWorker.run().catch((err) => {
    logger.error(`Worker failed to run: ${err}`);
  });
  logger.info('Background job worker started');
});

// Graceful shutdown
async function gracefulShutdown() {
  logger.info('Shutting down gracefully...');
  await jobWorker.close();
  server.close(() => process.exit(0));
}

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

process.on('unhandledRejection', (reason) => {
  logger.error(
    `Unhandled promise rejection: ${
      reason instanceof Error ? reason.stack ?? reason.message : String(reason)
    }`,
  );
  server.close(() => process.exit(1));
});

process.on('uncaughtException', (err) => {
  logger.error(`Uncaught exception: ${err.stack ?? err.message}`);
  server.close(() => process.exit(1));
});
