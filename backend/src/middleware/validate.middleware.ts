import { RequestHandler } from 'express';
import { ZodError, ZodSchema } from 'zod';

import { AppError } from './error.middleware';

/** Strip HTML tags from a string. */
const stripTags = (value: string): string => value.replace(/<[^>]*>/g, '');

/** Recursively trim and strip tags from every string in a value. */
const sanitize = (value: unknown): unknown => {
  if (typeof value === 'string') {
    return stripTags(value.trim());
  }
  if (Array.isArray(value)) {
    return value.map(sanitize);
  }
  if (value !== null && typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      result[key] = sanitize(val);
    }
    return result;
  }
  return value;
};

/**
 * Returns Express middleware that validates and sanitizes `req.body`
 * against the given Zod schema. Sanitization (trim + strip HTML tags)
 * runs before validation so the parsed/stored values are clean.
 * Throws AppError(message, 400) when validation fails.
 */
export const validate =
  (schema: ZodSchema): RequestHandler =>
  (req, _res, next) => {
    try {
      const sanitized = sanitize(req.body);
      req.body = schema.parse(sanitized);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const message = err.issues
          .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
          .join('; ');
        throw new AppError(message, 400);
      }
      throw err;
    }
  };
