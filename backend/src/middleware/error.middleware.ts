import { ErrorRequestHandler } from 'express';

import { env } from '../config/env';
import { logger } from '../utils/logger';

/**
 * Operational error with an associated HTTP status code.
 * Errors with statusCode < 500 are considered safe to surface to the client.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode = 500) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Global error handler. Must be registered LAST, after all routes.
 * - AppError with statusCode < 500: return statusCode + message (safe to expose)
 * - Anything else: log the full error, return a generic 500
 * Stack traces are never leaked to the client in production.
 */
export const errorMiddleware: ErrorRequestHandler = (err, req, res, _next) => {
  const isAppError = err instanceof AppError;

  if (isAppError && err.statusCode < 500) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }

  // Unexpected / server-side error: log everything for diagnosis.
  logger.error(
    `Unhandled error on ${req.method} ${req.originalUrl}: ${
      err instanceof Error ? err.stack ?? err.message : String(err)
    }`,
  );

  const body: { error: string; stack?: string } = {
    error: 'Internal server error',
  };

  if (env.NODE_ENV !== 'production' && err instanceof Error) {
    body.stack = err.stack;
  }

  res.status(isAppError ? err.statusCode : 500).json(body);
};
