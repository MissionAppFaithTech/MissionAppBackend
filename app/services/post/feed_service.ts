import { MissionaryStatus } from '#enums/missionary/missionary_status'
import { FeedScope } from '#enums/post/feed_scope'
import { MembershipStatus } from '#enums/user/membership_status'
import { UserRole } from '#enums/user/user_role'
import Missionary from '#models/missionary'
import Post from '#models/post'
import type User from '#models/user'
import { paginateByCursor } from '#utils/cursor_pagination'
import db from '@adonisjs/lucid/services/db'

type FeedFilters = {
  scope?: FeedScope
  cursor?: string
  limit?: number
}

/**
 * Feed cronológico (RF 4.4.2, RF 5.3): postagens de quem o usuário segue e,
 * para o missionário, as próprias. Mais recentes primeiro, por cursor (ADR-0033).
 */
export class FeedService {
  async list(actor: User, filters: FeedFilters = {}) {
    const scope = filters.scope ?? FeedScope.ALL
    const ownMissionaryId = scope !== FeedScope.FOLLOWING ? await this.ownMissionaryId(actor) : null
    const includeFollowing = scope !== FeedScope.OWN

    const query = Post.query()
      .preload('images', (images) => images.orderBy('order', 'asc').preload('image'))
      .preload('missionary', (missionary) =>
        missionary.preload('user', (user) => user.preload('profilePicture'))
      )

    if (!includeFollowing && !ownMissionaryId) {
      // NOTE: apoiador/admin pedindo as próprias postagens — não tem nenhuma
      query.whereRaw('false')
    } else {
      query.where((where) => {
        if (includeFollowing) {
          where.whereIn('missionaryId', this.followedMissionaryIds(actor.id))
        }
        if (ownMissionaryId) {
          where.orWhere('missionaryId', ownMissionaryId)
        }
      })
    }

    return paginateByCursor(query, {
      column: 'created_at',
      valueOf: (post) => post.createdAt.toISO()!,
      idOf: (post) => post.id,
      cursor: filters.cursor,
      limit: filters.limit,
    })
  }

  private async ownMissionaryId(actor: User): Promise<string | null> {
    if (actor.role !== UserRole.MISSIONARY) {
      return null
    }

    const missionary = await Missionary.findBy('userId', actor.id)
    return missionary?.id ?? null
  }

  /**
   * Missionários seguidos que continuam visíveis: um perfil suspenso, excluído
   * ou ainda não aprovado some do feed sem desfazer o vínculo.
   */
  private followedMissionaryIds(followerId: string) {
    return db
      .from('followers')
      .join('users', 'users.id', 'followers.following_id')
      .join('missionaries', 'missionaries.user_id', 'users.id')
      .where('followers.follower_id', followerId)
      .where('users.membership_status', MembershipStatus.ACTIVE)
      .whereNull('users.deleted_at')
      .where('missionaries.status', MissionaryStatus.APPROVED)
      .select('missionaries.id')
  }
}
