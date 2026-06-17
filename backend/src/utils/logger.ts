import path from 'node:path';

import winston from 'winston';

import { env } from '../config/env';

const LOG_DIR = 'logs';
const ERROR_LOG_FILE = path.join(LOG_DIR, 'error.log');
const COMBINED_LOG_FILE = path.join(LOG_DIR, 'combined.log');

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp(),
  winston.format.printf(({ timestamp, level, message }) => {
    return `${timestamp} [${level}] ${message}`;
  }),
);

const fileFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json(),
);

export const logger = winston.createLogger({
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: fileFormat,
  transports: [
    new winston.transports.Console({ format: consoleFormat }),
    new winston.transports.File({ filename: ERROR_LOG_FILE, level: 'error' }),
    new winston.transports.File({ filename: COMBINED_LOG_FILE }),
  ],
});
