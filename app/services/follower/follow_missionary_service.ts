import AlreadyFollowingException from '#exceptions/follower/already_following_exception'
import FollowForbiddenException from '#exceptions/follower/follow_forbidden_exception'
import MissionaryNotFoundException from '#exceptions/follower/missionary_not_found_exception'
import { UserRole } from '#enums/user/user_role'
import UserFollowed from '#events/follower/user_followed'
import Follower from '#models/follower'
import User from '#models/user'
import db from '@adonisjs/lucid/services/db'

/**
 * Cria o relacionamento de seguimento apoiador → missionário (RF 5.2). A
 * rede de conexões desta plataforma é unidirecional nesse sentido: um
 * apoiador nunca pode seguir outro apoiador, restrição garantida aqui pela
 * checagem de papel de ambos os lados, não por uma constraint de banco.
 */
export class FollowMissionaryService {
  /**
   * @param actor Usuário autenticado que deseja seguir — deve ter `role`
   *              `SUPPORTER`; qualquer outro papel é rejeitado.
   * @param missionaryUserId `id` do usuário alvo — deve ter `role`
   *                          `MISSIONARY` e conta ativa (`deletedAt` nulo).
   * @returns O relacionamento de seguimento criado, com a relação
   *          `following` (e seu `profilePicture`) já pré-carregada.
   * @throws {FollowForbiddenException} Ator não é um apoiador.
   * @throws {MissionaryNotFoundException} Alvo inexistente ou não é missionário.
   * @throws {AlreadyFollowingException} Relacionamento já existe.
   * @example
   * const follower = await new FollowMissionaryService().execute(actor, missionaryUserId)
   */
  async execute(actor: User, missionaryUserId: string): Promise<Follower> {
    if (actor.role !== UserRole.SUPPORTER) {
      throw new FollowForbiddenException('Somente apoiadores podem seguir missionários')
    }

    const missionaryUser = await User.query()
      .where('id', missionaryUserId)
      .andWhere('role', UserRole.MISSIONARY)
      .whereNull('deletedAt')
      .first()

    if (!missionaryUser) {
      throw new MissionaryNotFoundException('Missionário não encontrado')
    }

    const alreadyFollowing = await Follower.query()
      .where('followerId', actor.id)
      .andWhere('followingId', missionaryUserId)
      .first()

    if (alreadyFollowing) {
      throw new AlreadyFollowingException('Você já segue este missionário')
    }

    const follower = await db.transaction(async (trx) => {
      return Follower.create(
        { followerId: actor.id, followingId: missionaryUserId },
        { client: trx }
      )
    })

    await follower.load('following', (query) => query.preload('profilePicture'))

    await UserFollowed.dispatch(actor.id, missionaryUserId)

    return follower
  }
}
