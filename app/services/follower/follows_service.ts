import { MissionaryStatus } from '#enums/missionary/missionary_status'
import { MembershipStatus } from '#enums/user/membership_status'
import { UserRole } from '#enums/user/user_role'
import FollowForbiddenException from '#exceptions/follower/follow_forbidden_exception'
import FollowSelfException from '#exceptions/follower/follow_self_exception'
import FollowedUserNotFoundException from '#exceptions/follower/followed_user_not_found_exception'
import Follower from '#models/follower'
import User from '#models/user'
import { paginateByCursor } from '#utils/cursor_pagination'
import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import type { ModelQueryBuilderContract } from '@adonisjs/lucid/types/model'
import type { RelationSubQueryBuilderContract } from '@adonisjs/lucid/types/relations'
import { v7 as uuidv7 } from 'uuid'

type ListFollowsFilters = {
  cursor?: string
  limit?: number
}

const CAN_FOLLOW = new Set<string>([UserRole.MISSIONARY, UserRole.SUPPORTER])

/**
 * Rede de conexões (RF 4.4.1, RF 5.2): apoiadores e missionários seguem
 * missionários; ninguém segue apoiadores nem a si mesmo. Seguir e deixar de
 * seguir são idempotentes e mantêm `users.followers_count`/`following_count`
 * na mesma transação.
 */
export class FollowsService {
  /**
   * @throws {FollowForbiddenException} Ator não é apoiador nem missionário.
   * @throws {FollowedUserNotFoundException} Username não é de um missionário visível.
   * @throws {FollowSelfException} Ator tentou seguir a si mesmo.
   */
  async follow(actor: User, username: string): Promise<User> {
    if (!CAN_FOLLOW.has(actor.role)) {
      throw new FollowForbiddenException('Somente apoiadores e missionários podem seguir perfis')
    }

    const target = await this.findFollowable(username)
    if (target.id === actor.id) {
      throw new FollowSelfException('Você não pode seguir a si mesmo')
    }

    await db.transaction(async (trx) => {
      const inserted = await trx.rawQuery(
        `INSERT INTO followers (id, follower_id, following_id, created_at)
         VALUES (?, ?, ?, now())
         ON CONFLICT (follower_id, following_id) DO NOTHING
         RETURNING id`,
        [uuidv7(), actor.id, target.id]
      )

      if (inserted.rows.length > 0) {
        await this.adjustCounters(actor.id, target.id, 1, trx)
      }
    })

    return target
  }

  /**
   * Deixa de seguir pelo username. Não exige que o perfil ainda esteja visível:
   * quem segue um missionário suspenso continua podendo desfazer o vínculo.
   */
  async unfollow(actor: User, username: string): Promise<void> {
    const target = await User.findBy('username', username)
    if (!target) {
      return
    }

    await db.transaction(async (trx) => {
      const deleted = await trx
        .from('followers')
        .where('follower_id', actor.id)
        .where('following_id', target.id)
        .delete()
        .returning('id')

      if (deleted.length > 0) {
        await this.adjustCounters(actor.id, target.id, -1, trx)
      }
    })
  }

  /** Se o ator segue o username (botão "Seguir"/"Seguindo" do perfil). */
  async isFollowing(actor: User, username: string): Promise<boolean> {
    const row = await Follower.query()
      .where('followerId', actor.id)
      .whereHas('following', (user) => user.where('username', username))
      .first()

    return row !== null
  }

  /** Quem o ator segue, mais recentes primeiro (RF 11.6). */
  async listFollowing(actor: User, filters: ListFollowsFilters = {}) {
    const query = Follower.query()
      .where('followerId', actor.id)
      .whereHas('following', (user) => this.visible(user))
      .preload('following', (user) => user.preload('profilePicture'))

    return this.paginate(query, filters)
  }

  /** Quem segue o ator, mais recentes primeiro (RF 10.6). */
  async listFollowers(actor: User, filters: ListFollowsFilters = {}) {
    const query = Follower.query()
      .where('followingId', actor.id)
      .whereHas('follower', (user) => this.visible(user))
      .preload('follower', (user) => user.preload('profilePicture'))

    return this.paginate(query, filters)
  }

  private async findFollowable(username: string): Promise<User> {
    const target = await User.query()
      .where('username', username)
      .where('role', UserRole.MISSIONARY)
      .where('membershipStatus', MembershipStatus.ACTIVE)
      .whereNull('deletedAt')
      .whereIn(
        'id',
        db.from('missionaries').select('user_id').where('status', MissionaryStatus.APPROVED)
      )
      .first()

    if (!target) {
      throw new FollowedUserNotFoundException('Perfil de missionário não encontrado')
    }

    return target
  }

  private visible(user: RelationSubQueryBuilderContract<typeof User>) {
    user.where('membershipStatus', MembershipStatus.ACTIVE).whereNull('deletedAt')
  }

  private paginate(query: ModelQueryBuilderContract<typeof Follower>, filters: ListFollowsFilters) {
    return paginateByCursor(query, {
      column: 'created_at',
      valueOf: (row) => row.createdAt.toISO()!,
      idOf: (row) => row.id,
      cursor: filters.cursor,
      limit: filters.limit,
    })
  }

  /**
   * Atualiza os dois contadores. As linhas são travadas sempre na mesma ordem
   * (por id) — A seguindo B enquanto B segue A, em paralelo, travariam em
   * ordem inversa e entrariam em deadlock.
   */
  private async adjustCounters(
    followerId: string,
    followingId: string,
    delta: 1 | -1,
    trx: TransactionClientContract
  ): Promise<void> {
    const updates = [
      { id: followerId, column: 'following_count' },
      { id: followingId, column: 'followers_count' },
    ].sort((a, b) => a.id.localeCompare(b.id))

    for (const { id, column } of updates) {
      await trx
        .from('users')
        .where('id', id)
        .update({ [column]: trx.raw('?? + ?', [column, delta]) })
    }
  }
}
