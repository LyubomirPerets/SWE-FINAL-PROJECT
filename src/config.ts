import 'dotenv/config';
import { z } from 'zod';

// Empty values (e.g. `AWS_REGION=` in .env) count as unset.
const optionalString = z.preprocess((v) => (v === '' ? undefined : v), z.string().optional());

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1),
  TEST_DATABASE_URL: z.string().optional(),
  SESSION_SECRET: z.string().min(16, 'SESSION_SECRET must be at least 16 characters'),
  // S3 file storage. Optional: the app runs without them, and only S3 features need them.
  AWS_REGION: optionalString,
  S3_BUCKET: optionalString,
  AWS_ACCESS_KEY_ID: optionalString,
  AWS_SECRET_ACCESS_KEY: optionalString,
});

const parsed = envSchema.safeParse({
  ...process.env,
  SESSION_SECRET:
    process.env.SESSION_SECRET ??
    (process.env.NODE_ENV === 'test' ? 'test-secret-test-secret' : undefined),
  DATABASE_URL:
    process.env.NODE_ENV === 'test'
      ? (process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL)
      : process.env.DATABASE_URL,
});

if (!parsed.success) {
  console.error('Invalid environment configuration:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const config = parsed.data;
