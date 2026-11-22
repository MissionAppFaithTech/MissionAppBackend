import { MissionaryStatus } from '#enums/missionary/missionary_status'
import { MembershipStatus } from '#enums/user/membership_status'
import { UserRole } from '#enums/user/user_role'
import CannotFollowSelfException from '#exceptions/user/cannot_follow_self_exception'
import UserNotFoundException from '#exceptions/user/user_not_found_exception'
import Follower from '#models/follower'
import User from '#models/user'
import {
  CounterBufferService,
  withPendingDelta,
} from '#services/shared/counter/counter_buffer_service'
import type { FollowSide, FollowState } from '#types/services/user/follow'
import { paginateByCursor } from '#utils/cursor_pagination'
import type { CursorPage } from '#utils/cursor_pagination'
import db from '@adonisjs/lucid/services/db'
import { v7 as uuidv7 } from 'uuid'

type ListFollowsFilters = { cursor?: string; limit?: number }

/**
 * Seguir e deixar de seguir perfis (RF 10.6, 11.6). Só missionários públicos
 * podem ser seguidos — o que já impede apoiador de seguir apoiador —, e
 * qualquer usuário autenticado pode seguir.
 *
 * A relação é gravada direto no PostgreSQL de forma idempotente; os contadores
 * `followers_count`/`following_count` recebem só um delta no Dragonfly,
 * aplicado depois pelo job de flush (ADR-0033).
 */
export class FollowsService {
  #counters = new CounterBufferService()

  /**
   * Segue um missionário. Repetir não tem efeito nem conta duas vezes.
   *
   * @param actor Usuário autenticado.
   * @param targetId Id do usuário a seguir.
   * @returns Estado do follow com o contador já incluindo o delta pendente.
   * @throws {CannotFollowSelfException} `targetId` é o próprio usuário.
   * @throws {UserNotFoundException} Alvo inexistente ou que não é missionário público.
   * @example
   * const state = await new FollowsService().follow(user, missionaryUserId)
   */
  async follow(actor: User, targetId: string): Promise<FollowState> {
    const target = await this.findFollowable(targetId)

    // NOTE: compara o id vindo do banco — o da URL pode vir em maiúsculas e
    // ainda assim apontar para o próprio usuário
    if (target.id === actor.id) {
      throw new CannotFollowSelfException()
    }

    await db.transaction(async (trx) => {
      const inserted = await trx
        .knexQuery()
        .table('followers')
        .insert({
          id: uuidv7(),
          follower_id: actor.id,
          following_id: target.id,
          created_at: new Date(),
        })
        .onConflict(['follower_id', 'following_id'])
        .ignore()
        .returning('id')

      if (inserted.length > 0) {
        // NOTE: delta gravado antes do commit — é o que deixa a reconciliação
        // livre de corrida (ADR-0033)
        await this.#counters.increment([
          { target: 'userFollowers', id: target.id, delta: 1 },
          { target: 'userFollowing', id: actor.id, delta: 1 },
        ])
      }
    })

    return { following: true, followersCount: await this.followersCountOf(target) }
  }

  /**
   * Deixa de seguir. Não exige que o alvo ainda seja público, para permitir
   * sair de um perfil desativado. Repetir não tem efeito.
   *
   * @param actor Usuário autenticado.
   * @param targetId Id do usuário seguido.
   * @returns Estado do follow (`following: false`).
   * @throws {UserNotFoundException} Usuário inexistente.
   * @example
   * await new FollowsService().unfollow(user, missionaryUserId)
   */
  async unfollow(actor: User, targetId: string): Promise<FollowState> {
    const target = await User.find(targetId)
    if (!target) {
      throw new UserNotFoundException()
    }

    await db.transaction(async (trx) => {
      const deleted = await trx
        .knexQuery()
        .from('followers')
        .where('follower_id', actor.id)
        .where('following_id', target.id)
        .delete()
        .returning('id')

      if (deleted.length > 0) {
        await this.#counters.increment([
          { target: 'userFollowers', id: target.id, delta: -1 },
          { target: 'userFollowing', id: actor.id, delta: -1 },
        ])
      }
    })

    return { following: false, followersCount: await this.followersCountOf(target) }
  }

  /**
   * Se quem está vendo segue o perfil — fica fora do perfil público, que é
   * cacheado e compartilhado entre visitantes (ADR-0036).
   *
   * @param viewer Usuário autenticado.
   * @param targetId Id do perfil.
   * @returns Estado do follow.
   * @throws {UserNotFoundException} Alvo inexistente ou que não é missionário público.
   * @example
   * const { following } = await new FollowsService().state(user, missionaryUserId)
   */
  async state(viewer: User, targetId: string): Promise<FollowState> {
    const target = await this.findFollowable(targetId)

    const row = await Follower.query()
      .where('followerId', viewer.id)
      .where('followingId', target.id)
      .select('id')
      .first()

    return { following: row !== null, followersCount: await this.followersCountOf(target) }
  }

  /**
   * Seguidores de um usuário, quem seguiu mais recentemente primeiro.
   *
   * @param userId Id do usuário.
   * @param filters Cursor e limite (ADR-0033).
   * @returns Página de relações com o seguidor carregado.
   * @throws {UserNotFoundException} Usuário inexistente, removido ou inativo.
   * @throws {InvalidCursorException} Cursor malformado.
   * @example
   * const page = await new FollowsService().listFollowers(userId, { limit: 20 })
   */
  async listFollowers(userId: string, filters: ListFollowsFilters): Promise<CursorPage<Follower>> {
    return this.list(userId, 'follower', filters)
  }

  /**
   * Quem um usuário segue, seguido mais recentemente primeiro.
   *
   * @param userId Id do usuário.
   * @param filters Cursor e limite (ADR-0033).
   * @returns Página de relações com o seguido carregado.
   * @throws {UserNotFoundException} Usuário inexistente, removido ou inativo.
   * @throws {InvalidCursorException} Cursor malformado.
   * @example
   * const page = await new FollowsService().listFollowing(userId, { limit: 20 })
   */
  async listFollowing(userId: string, filters: ListFollowsFilters): Promise<CursorPage<Follower>> {
    return this.list(userId, 'following', filters)
  }

  private async list(
    userId: string,
    side: FollowSide,
    filters: ListFollowsFilters
  ): Promise<CursorPage<Follower>> {
    const owner = await User.query()
      .where('id', userId)
      .where('membershipStatus', MembershipStatus.ACTIVE)
      .whereNull('deletedAt')
      .first()
    if (!owner) {
      throw new UserNotFoundException()
    }

    // NOTE: a lista mostra o "outro lado" — seguidores de X têm following_id = X
    const ownerColumn = side === 'follower' ? 'followingId' : 'followerId'

    const query = Follower.query()
      .where(ownerColumn, owner.id)
      .whereHas(side, (user) => {
        user.where('membershipStatus', MembershipStatus.ACTIVE).whereNull('deletedAt')
      })
      .preload(side, (user) => user.preload('profilePicture'))

    return paginateByCursor(query, {
      column: 'followers.created_at',
      idColumn: 'followers.id',
      valueOf: (row) => row.createdAt.toISO()!,
      idOf: (row) => row.id,
      cursor: filters.cursor,
      limit: filters.limit,
    })
  }

  /**
   * Mesmo critério do perfil público (ADR-0036): missionário aprovado, conta
   * ativa e não removida.
   */
  private async findFollowable(targetId: string): Promise<User> {
    const target = await User.query()
      .where('id', targetId)
      .where('role', UserRole.MISSIONARY)
      .where('membershipStatus', MembershipStatus.ACTIVE)
      .whereNull('deletedAt')
      .whereExists((missionary) => {
        missionary
          .from('missionaries')
          .whereColumn('missionaries.user_id', 'users.id')
          .where('missionaries.status', MissionaryStatus.APPROVED)
      })
      .first()

    if (!target) {
      throw new UserNotFoundException()
    }

    return target
  }

  private async followersCountOf(target: User): Promise<number> {
    const overlay = await this.#counters.pending('userFollowers', [target.id])
    return withPendingDelta(target.followersCount, overlay, target.id)
  }
}
