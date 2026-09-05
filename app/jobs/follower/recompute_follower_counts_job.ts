import type { UserFollowedPayload } from '#types/events/follower/user_followed'
import type { UserUnfollowedPayload } from '#types/events/follower/user_unfollowed'
import Follower from '#models/follower'
import User from '#models/user'
import db from '@adonisjs/lucid/services/db'

/**
 * Recalcula (não incrementa) os contadores em cache de seguidores/seguindo
 * do par (seguidor, seguido) a partir da tabela `followers` — chamado pelo
 * worker ao processar um job da fila, nunca diretamente do request HTTP.
 * Recalcular a partir da fonte de verdade, em vez de incrementar/decrementar,
 * torna o job seguro para reprocessar (retry do BullMQ) sem duplicar
 * contagem.
 *
 * @param payload Par (seguidor, seguido) afetado por um seguir/deixar de seguir.
 * @returns Nada — efeito colateral (atualização dos contadores no Postgres).
 * @example
 * await recomputeFollowerCounts(job.data)
 */
export async function recomputeFollowerCounts(
  payload: UserFollowedPayload | UserUnfollowedPayload
): Promise<void> {
  const [followingRow, followersRow] = await Promise.all([
    Follower.query().where('followerId', payload.followerId).count('* as total').first(),
    Follower.query().where('followingId', payload.followingId).count('* as total').first(),
  ])

  await db.transaction(async (trx) => {
    await User.query({ client: trx })
      .where('id', payload.followerId)
      .update({ followingCount: Number(followingRow?.$extras.total ?? 0) })

    await User.query({ client: trx })
      .where('id', payload.followingId)
      .update({ followersCount: Number(followersRow?.$extras.total ?? 0) })
  })
}
