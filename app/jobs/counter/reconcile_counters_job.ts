import {
  COUNTER_RECONCILE_BATCH_SIZE,
  COUNTER_SYNC_LOCK_KEY,
  COUNTER_SYNC_LOCK_TTL_SECONDS,
  COUNTER_TARGETS,
} from '#constants/counter'
import cache from '#services/shared/cache/cache'
import { CounterBufferService } from '#services/shared/counter/counter_buffer_service'
import type { CounterTargetName } from '#types/services/shared/counter_buffer'
import db from '@adonisjs/lucid/services/db'
import { setTimeout as sleep } from 'node:timers/promises'

/** Tentativas de pegar o lock por bloco antes de desistir da execução. */
const LOCK_ATTEMPTS = 30
const LOCK_RETRY_DELAY_MS = 1_000

type ReconcileRow = { id: string; stored: number; actual: number }

/**
 * Recalcula os contadores desnormalizados a partir das relações e corrige os
 * que divergem (ADR-0033): cobre a reaplicação rara do flush, o `GREATEST`
 * que trava em 0 e as remoções em cascata, que não geram delta.
 *
 * Percorre cada tabela por keyset em blocos, segurando o lock do flush em
 * cada bloco. Ids com delta ainda não aplicado são pulados: o delta é gravado
 * antes do commit da relação, então se o id não está sujo quando o bloco o lê,
 * o `COUNT(*)` já reflete tudo o que o banco tem dele.
 *
 * @returns Quantidade de contadores corrigidos.
 * @throws {Error} Lock indisponível por tempo demais (o próximo agendamento tenta de novo).
 * @example
 * const fixed = await reconcileCounters()
 */
export async function reconcileCounters(): Promise<number> {
  const buffer = new CounterBufferService()
  let fixed = 0

  for (const target of Object.keys(COUNTER_TARGETS) as CounterTargetName[]) {
    let lastId: string | null = null

    do {
      const token = await acquireLockWithRetry()
      try {
        const chunk = await reconcileChunk(buffer, target, lastId)
        fixed += chunk.fixed
        lastId = chunk.lastId
      } finally {
        await cache.releaseLock(COUNTER_SYNC_LOCK_KEY, token)
      }
    } while (lastId)
  }

  return fixed
}

async function reconcileChunk(
  buffer: CounterBufferService,
  target: CounterTargetName,
  afterId: string | null
): Promise<{ fixed: number; lastId: string | null }> {
  const { table, column, relation, relationColumn } = COUNTER_TARGETS[target]

  const result = await db.rawQuery<{ rows: ReconcileRow[] }>(
    `SELECT t.id, t.?? AS stored,
            (SELECT COUNT(*) FROM ?? r WHERE r.?? = t.id)::integer AS actual
     FROM ?? t
     ${afterId ? 'WHERE t.id > ?' : ''}
     ORDER BY t.id
     LIMIT ?`,
    [
      column,
      relation,
      relationColumn,
      table,
      ...(afterId ? [afterId] : []),
      COUNTER_RECONCILE_BATCH_SIZE,
    ]
  )

  const rows = result.rows
  const lastId = rows.length === COUNTER_RECONCILE_BATCH_SIZE ? rows.at(-1)!.id : null

  const drifted = rows.filter((row) => row.stored !== row.actual)
  if (drifted.length === 0) {
    return { fixed: 0, lastId }
  }

  const dirty = await buffer.dirtyIds(
    target,
    drifted.map((row) => row.id)
  )
  const fixes = drifted.filter((row) => !dirty.has(row.id))
  if (fixes.length === 0) {
    return { fixed: 0, lastId }
  }

  const values = fixes.map(() => '(?::uuid, ?::integer)').join(', ')
  await db.rawQuery(
    `UPDATE ?? AS t SET ?? = v.actual
     FROM (VALUES ${values}) AS v(id, actual)
     WHERE t.id = v.id`,
    [table, column, ...fixes.flatMap((row) => [row.id, row.actual])]
  )

  return { fixed: fixes.length, lastId }
}

async function acquireLockWithRetry(): Promise<string> {
  for (let attempt = 0; attempt < LOCK_ATTEMPTS; attempt++) {
    const token = await cache.acquireLock(COUNTER_SYNC_LOCK_KEY, COUNTER_SYNC_LOCK_TTL_SECONDS)
    if (token) {
      return token
    }

    await sleep(LOCK_RETRY_DELAY_MS)
  }

  throw new Error('counter sync lock unavailable; reconciliation aborted')
}
