/**
 * Contadores desnormalizados com deltas acumulados no Dragonfly e aplicados
 * em lote no PostgreSQL (ADR-0033). Cada alvo liga uma coluna de contador à
 * relação que ela conta, usada pela reconciliação.
 *
 * WARNING: `table`, `column`, `relation` e `relationColumn` entram em SQL como
 * identificadores — só valores fixos deste arquivo, nunca input do usuário.
 */
export const COUNTER_TARGETS = {
  userFollowers: {
    table: 'users',
    column: 'followers_count',
    relation: 'followers',
    relationColumn: 'following_id',
    key: 'user_followers',
  },
  userFollowing: {
    table: 'users',
    column: 'following_count',
    relation: 'followers',
    relationColumn: 'follower_id',
    key: 'user_following',
  },
  postLikes: {
    table: 'posts',
    column: 'likes_count',
    relation: 'likes',
    relationColumn: 'post_id',
    key: 'post_likes',
  },
} as const

/** Prefixo do hash que recebe os incrementos em tempo real. */
export const COUNTER_PENDING_KEY_PREFIX = 'counter:pending:'

/** Prefixo do hash que um flush em andamento está aplicando. */
export const COUNTER_PROCESSING_KEY_PREFIX = 'counter:processing:'

/** Lock que serializa flush e reconciliação entre processos/réplicas. */
export const COUNTER_SYNC_LOCK_KEY = 'counter:sync:lock'

/** Validade do lock — folga ampla sobre um flush ou bloco de reconciliação. */
export const COUNTER_SYNC_LOCK_TTL_SECONDS = 300

/** Fila BullMQ dos jobs agendados de contadores. */
export const COUNTER_SYNC_QUEUE_NAME = 'counters-sync'

/** Job que aplica os deltas acumulados no PostgreSQL. */
export const FLUSH_COUNTERS_JOB_NAME = 'flush-counters'

/** Job que recalcula os contadores a partir das relações e corrige desvios. */
export const RECONCILE_COUNTERS_JOB_NAME = 'reconcile-counters'

/** Intervalo entre flushes — também é o atraso máximo do valor gravado no banco. */
export const COUNTER_FLUSH_INTERVAL_MS = 10_000

/** Diariamente às 4h30 — fora das limpezas de refresh tokens (3h) e mídia (4h). */
export const COUNTER_RECONCILE_CRON_SCHEDULE = '30 4 * * *'

/** Linhas por `UPDATE … FROM (VALUES …)` no flush. */
export const COUNTER_FLUSH_BATCH_SIZE = 500

/** Linhas por bloco de keyset na reconciliação. */
export const COUNTER_RECONCILE_BATCH_SIZE = 1_000
