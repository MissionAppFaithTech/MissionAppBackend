import {
  COUNTER_FLUSH_BATCH_SIZE,
  COUNTER_SYNC_LOCK_KEY,
  COUNTER_SYNC_LOCK_TTL_SECONDS,
  COUNTER_TARGETS,
} from '#constants/counter'
import cache from '#services/shared/cache/cache'
import { CounterBufferService } from '#services/shared/counter/counter_buffer_service'
import type { CounterTargetName } from '#types/services/shared/counter_buffer'
import db from '@adonisjs/lucid/services/db'

/**
 * Aplica no PostgreSQL os deltas acumulados no Dragonfly (ADR-0033).
 *
 * Para cada contador: drena o hash pendente para o de processamento (atômico —
 * incrementos novos caem num hash novo), aplica tudo numa transação com
 * `UPDATE … FROM (VALUES …)` em lotes e só então apaga o processamento.
 *
 * Entrega "pelo menos uma vez": se o processo cair entre o commit e a limpeza,
 * o próximo flush reaplica aquele lote; a reconciliação diária corrige.
 *
 * @returns Quantidade de entidades atualizadas, ou 0 se outro flush/reconciliação segura o lock.
 * @example
 * const updated = await flushCounters()
 */
export async function flushCounters(): Promise<number> {
  const token = await cache.acquireLock(COUNTER_SYNC_LOCK_KEY, COUNTER_SYNC_LOCK_TTL_SECONDS)
  if (!token) {
    return 0
  }

  const buffer = new CounterBufferService()
  let updated = 0

  try {
    for (const target of Object.keys(COUNTER_TARGETS) as CounterTargetName[]) {
      updated += await flushTarget(buffer, target)
    }
  } finally {
    await cache.releaseLock(COUNTER_SYNC_LOCK_KEY, token)
  }

  return updated
}

async function flushTarget(buffer: CounterBufferService, target: CounterTargetName) {
  const entries = await buffer.drain(target)
  if (entries.length === 0) {
    await buffer.clearProcessing(target)
    return 0
  }

  // NOTE: ordem fixa de ids = ordem fixa de locks de linha, sem deadlock entre lotes
  entries.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))

  const { table, column } = COUNTER_TARGETS[target]
  let updated = 0

  await db.transaction(async (trx) => {
    for (let start = 0; start < entries.length; start += COUNTER_FLUSH_BATCH_SIZE) {
      const batch = entries.slice(start, start + COUNTER_FLUSH_BATCH_SIZE)
      const values = batch.map(() => '(?::uuid, ?::integer)').join(', ')

      const result = await trx.rawQuery(
        `UPDATE ?? AS t
         SET ?? = GREATEST(t.?? + v.delta, 0)
         FROM (VALUES ${values}) AS v(id, delta)
         WHERE t.id = v.id`,
        [table, column, column, ...batch.flat()]
      )

      updated += result.rowCount ?? 0
    }
  })

  await buffer.clearProcessing(target)

  return updated
}
