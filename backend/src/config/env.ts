import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const NODE_ENVS = ['development', 'test', 'production'] as const;

const envSchema = z.object({
  NODE_ENV: z.enum(NODE_ENVS).default('development'),
  PORT: z.coerce.number().int().positive(),
  FRONTEND_URL: z.string().url(),

  DATABASE_URL: z.string().min(1),
  DIRECT_URL: z.string().min(1),

  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_KEY: z.string().min(1),
  SUPABASE_BUCKET: z.string().min(1),

  REDIS_URL: z.string().min(1),

  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().min(1),
  BCRYPT_ROUNDS: z.coerce.number().int().min(4).max(31),

  GEMINI_API_KEY: z.string().min(1),
  GEMINI_MODEL: z.string().min(1),

  TEMP_DIR: z.string().min(1),
  MAX_CONCURRENT_JOBS: z.coerce.number().int().positive(),
  JOB_TIMEOUT_MS: z.coerce.number().int().positive(),
  MAX_VIDEO_DURATION_SECONDS: z.coerce.number().int().positive(),
  // Temp-dir cleanup cadence (must be 1-59 for the */N cron expression) and
  // the age past which a job temp dir is considered stale and removed.
  CLEANUP_INTERVAL_MINUTES: z.coerce.number().int().min(1).max(59).default(30),
  TEMP_FILE_MAX_AGE_HOURS: z.coerce.number().int().positive().default(24),
  PLAYWRIGHT_TIMEOUT_MS: z.coerce.number().int().positive(),
  PLAYWRIGHT_NAVIGATION_TIMEOUT_MS: z.coerce
    .number()
    .int()
    .positive()
    .default(45000),

  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive(),
  RATE_LIMIT_MAX_GLOBAL: z.coerce.number().int().positive(),
  RATE_LIMIT_MAX_GENERATE: z.coerce.number().int().positive(),
});

export type Env = z.infer<typeof envSchema>;

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
    .join('\n');
  throw new Error(`Invalid environment configuration:\n${issues}`);
}

export const env: Env = parsed.data;
