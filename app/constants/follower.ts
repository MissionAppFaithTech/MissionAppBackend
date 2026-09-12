/**
 * Nome da fila BullMQ que recalcula os contadores em cache de
 * seguidores/seguindo (`users.followers_count`/`users.following_count`)
 * após um seguir/deixar de seguir.
 */
export const FOLLOWER_QUEUE_NAME = 'follower-counters'

/**
 * Nome do job que recalcula os contadores em cache do par
 * (seguidor, seguido) dentro da fila `FOLLOWER_QUEUE_NAME`.
 */
export const RECOMPUTE_FOLLOWER_COUNTS_JOB_NAME = 'recompute-follower-counts'
