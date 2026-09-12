import FollowForbiddenException from '#exceptions/follower/follow_forbidden_exception'
import NotFollowingException from '#exceptions/follower/not_following_exception'
import { UserRole } from '#enums/user/user_role'
import UserUnfollowed from '#events/follower/user_unfollowed'
import Follower from '#models/follower'
import type User from '#models/user'
import db from '@adonisjs/lucid/services/db'

/**
 * Remove o relacionamento de seguimento apoiador → missionário criado por
 * `FollowMissionaryService`.
 */
export class UnfollowMissionaryService {
  /**
   * @param actor Usuário autenticado que deseja deixar de seguir.
   * @param missionaryUserId `id` do usuário atualmente seguido.
   * @returns Nada — efeito colateral (remove a linha de `followers`).
   * @throws {FollowForbiddenException} Ator não é um apoiador.
   * @throws {NotFollowingException} Não existe relacionamento a remover.
   * @example
   * await new UnfollowMissionaryService().execute(actor, missionaryUserId)
   */
  async execute(actor: User, missionaryUserId: string): Promise<void> {
    if (actor.role !== UserRole.SUPPORTER) {
      throw new FollowForbiddenException('Somente apoiadores podem deixar de seguir missionários')
    }

    const follower = await Follower.query()
      .where('followerId', actor.id)
      .andWhere('followingId', missionaryUserId)
      .first()

    if (!follower) {
      throw new NotFollowingException('Você não segue este missionário')
    }

    await db.transaction(async (trx) => {
      follower.useTransaction(trx)
      await follower.delete()
    })

    await UserUnfollowed.dispatch(actor.id, missionaryUserId)
  }
}
