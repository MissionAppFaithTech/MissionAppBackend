import env from '#start/env'
import type { RedisOptions as BullMQRedisOptions } from 'bullmq'
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
 *
 * Tipado com o `RedisOptions` do próprio BullMQ (não o do ioredis) — a partir
 * do v6, `ConnectionOptions` espera esse formato para diferenciar opções cruas
 * de uma instância de client já conectada. Por isso os campos são repetidos
 * aqui em vez de espalhar `redisConnection`: os dois tipos `RedisOptions`
 * (ioredis x BullMQ) divergem em propriedades como `retryStrategy`.
 */
export const bullMQConnection: BullMQRedisOptions = {
  host: env.get('REDIS_HOST'),
  port: env.get('REDIS_PORT'),
  password: env.get('REDIS_PASSWORD') || undefined,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
}
