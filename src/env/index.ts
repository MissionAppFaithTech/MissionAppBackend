import 'dotenv/config'
import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['dev', 'production', 'test']).default('dev'),

  // App:
  APP_NAME: z.string().trim().nonempty().default('MissionAPP'),
  APP_PORT: z.coerce.number().default(3333),
  JWT_SECRET: z
    .string()
    .trim()
    .min(60, 'JWT secret must be at least 60 characters long'),
  HASH_SALT_ROUNDS: z.coerce.number().min(6).max(16).default(12),
  FRONTEND_URL: z.string().default('http://localhost:5173'),
})

const _env = envSchema.safeParse(process.env)

if (!_env.success) {
  console.error('🚨 Invalid environment variables:', _env.error.format())

  throw new Error('Invalid environment variables!')
}

export const env = _env.data
