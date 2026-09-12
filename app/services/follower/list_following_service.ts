import Follower from '#models/follower'
import type { ModelPaginatorContract } from '@adonisjs/lucid/types/model'

/**
 * Lista paginada dos missionários seguidos por um apoiador (RF 11.6),
 * ordenada do seguimento mais recente para o mais antigo.
 */
export class ListFollowingService {
  /**
   * @param followerId `id` do apoiador autenticado (dono da lista).
   * @param page Página solicitada (1-indexed).
   * @param perPage Tamanho da página.
   * @returns Paginator de `Follower`, com a relação `following` (e seu
   *          `profilePicture`) já pré-carregada para cada item.
   * @example
   * const following = await new ListFollowingService().execute(actor.id, 1, 20)
   */
  async execute(
    followerId: string,
    page = 1,
    perPage = 20
  ): Promise<ModelPaginatorContract<Follower>> {
    return Follower.query()
      .where('followerId', followerId)
      .preload('following', (query) => query.preload('profilePicture'))
      .orderBy('createdAt', 'desc')
      .paginate(page, perPage)
  }
}
