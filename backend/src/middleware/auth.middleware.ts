import { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';

import { env } from '../config/env';
import { redis } from '../config/redis';
import { AppError } from './error.middleware';

interface JwtPayload {
  sub: string;
  email: string;
  plan: string;
  jti: string;
  exp?: number;
}

/**
 * Authenticates a request via a Bearer JWT.
 * - Extracts the token from the Authorization header
 * - Verifies the signature with env.JWT_SECRET
 * - Rejects tokens whose `jti` is blacklisted in Redis (key `jti:<jti>`)
 * - On success, populates req.user = { id, email, plan }
 * Throws AppError('Unauthorized', 401) on any failure.
 */
export const requireAuth: RequestHandler = async (req, _res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      throw new AppError('Unauthorized', 401);
    }

    const token = header.slice('Bearer '.length).trim();
    if (!token) {
      throw new AppError('Unauthorized', 401);
    }

    let payload: JwtPayload;
    try {
      payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    } catch {
      throw new AppError('Unauthorized', 401);
    }

    if (!payload.sub || !payload.email || !payload.jti) {
      throw new AppError('Unauthorized', 401);
    }

    const blacklisted = await redis.get(`jti:${payload.jti}`);
    if (blacklisted) {
      throw new AppError('Unauthorized', 401);
    }

    req.user = {
      id: payload.sub,
      email: payload.email,
      plan: payload.plan,
      jti: payload.jti,
      exp: payload.exp,
    };

    next();
  } catch (err) {
    next(err instanceof AppError ? err : new AppError('Unauthorized', 401));
  }
};
