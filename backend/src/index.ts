import { app } from './app';
import { env } from './config/env';
import { logger } from './utils/logger';

const server = app.listen(env.PORT, () => {
  logger.info(`DemoForge backend listening on port ${env.PORT} (${env.NODE_ENV})`);
});

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
