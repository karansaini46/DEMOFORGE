import { Router } from 'express';

import { prisma } from '../config/prisma';
import { redis } from '../config/redis';
import { asyncHandler } from '../utils/asyncHandler';

export const healthRouter = Router();

/**
 * GET /api/health
 * Liveness/readiness probe: pings Redis and runs a trivial DB query.
 */
healthRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    let redisOk = false;
    let dbOk = false;

    try {
      redisOk = (await redis.ping()) === 'PONG';
    } catch {
      redisOk = false;
    }

    try {
      await prisma.$queryRaw`SELECT 1`;
      dbOk = true;
    } catch {
      dbOk = false;
    }

    const healthy = redisOk && dbOk;

    res.status(healthy ? 200 : 503).json({
      status: healthy ? 'ok' : 'degraded',
      uptime: process.uptime(),
      redis: redisOk ? 'up' : 'down',
      db: dbOk ? 'up' : 'down',
    });
  }),
);
