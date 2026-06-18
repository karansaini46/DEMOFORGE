import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';

import { env } from '../config/env';
import { redis } from '../config/redis';

/** Build a RedisStore backed by the shared ioredis client. */
const createStore = (prefix: string) =>
  new RedisStore({
    prefix,
    sendCommand: (...args: string[]): Promise<any> =>
      redis.call(args[0], ...args.slice(1)) as Promise<any>,
  });

const commonOptions = {
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  standardHeaders: true,
  legacyHeaders: false,
};

/** Applied to every route. */
export const globalLimiter = rateLimit({
  ...commonOptions,
  max: env.RATE_LIMIT_MAX_GLOBAL,
  store: createStore('rl:global:'),
});

/** Applied to expensive generation endpoints. */
export const generateLimiter = rateLimit({
  ...commonOptions,
  max: env.RATE_LIMIT_MAX_GENERATE,
  store: createStore('rl:generate:'),
  message: { error: 'Too many generation requests. Try again in 15 minutes.' },
});

/** Applied to auth endpoints to slow brute-force attempts. */
export const authLimiter = rateLimit({
  ...commonOptions,
  max: 20,
  store: createStore('rl:auth:'),
});
