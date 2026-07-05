import env from '#start/env'
import type { RedisOptions } from 'ioredis'

export const redisConnection: RedisOptions = {
  host: env.get('REDIS_HOST'),
  port: env.get('REDIS_PORT'),
  password: env.get('REDIS_PASSWORD') || undefined,
}

/**
 * BullMQ exige maxRetriesPerRequest: null nas conexões que usa internamente —
 * caso contrário comandos bloqueantes (ex: BRPOPLPUSH) falham após o limite
 * padrão de retries do ioredis.
 */
export const bullMQConnection: RedisOptions = {
  ...redisConnection,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
}
