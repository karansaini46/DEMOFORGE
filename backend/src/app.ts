import cors from 'cors';
import express from 'express';
import helmet from 'helmet';

import { env } from './config/env';
import { errorMiddleware } from './middleware/error.middleware';
import { globalLimiter } from './middleware/ratelimit.middleware';
import { authRouter } from './routes/auth.routes';
import { healthRouter } from './routes/health.routes';
import { jobRouter } from './routes/job.routes';
import { videoRouter } from './routes/video.routes';
import { logger } from './utils/logger';

export const app = express();

// Trust the first proxy hop so client IPs / rate limiting work behind a proxy.
app.set('trust proxy', 1);

// --- Security headers ---
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
      },
    },
  }),
);

// --- CORS ---
app.use(
  cors({
    origin: env.FRONTEND_URL,
    credentials: true,
    methods: ['GET', 'POST', 'DELETE'],
  }),
);

// --- Body parsing (with strict size limits) ---
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: false, limit: '10kb' }));

// --- Global rate limiting ---
app.use(globalLimiter);

// --- Request logging ---
app.use((req, res, next) => {
  const start = process.hrtime.bigint();
  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
    logger.info(
      `${req.method} ${req.originalUrl} ${res.statusCode} ${durationMs.toFixed(
        1,
      )}ms ${req.ip}`,
    );
  });
  next();
});

// --- Routes ---
app.use('/api/health', healthRouter);
app.use('/api/auth', authRouter);
app.use('/api/jobs', jobRouter);
app.use('/api/videos', videoRouter);

// --- Error handler (must be last) ---
app.use(errorMiddleware);
