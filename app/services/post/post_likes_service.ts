import PostNotFoundException from '#exceptions/post/post_not_found_exception'
import Like from '#models/like'
import Post from '#models/post'
import type User from '#models/user'
import {
  CounterBufferService,
  withPendingDelta,
} from '#services/shared/counter/counter_buffer_service'
import type { PostEngagement } from '#types/services/post/post_engagement'
import db from '@adonisjs/lucid/services/db'
import { v7 as uuidv7 } from 'uuid'

/** Estado da curtida de um post para quem está vendo. */
type LikeState = { liked: boolean; likesCount: number }

/**
 * Curtir e descurtir posts. A curtida é gravada direto no PostgreSQL de forma
 * idempotente; `posts.likes_count` recebe só um delta no Dragonfly, aplicado
 * depois pelo job de flush (ADR-0033).
 */
export class PostLikesService {
  #counters = new CounterBufferService()

  /**
   * Curte um post. Repetir não tem efeito nem conta duas vezes.
   *
   * @param actor Usuário autenticado.
   * @param postId Id do post.
   * @returns Estado da curtida com o contador já incluindo o delta pendente.
   * @throws {PostNotFoundException} Post inexistente.
   * @example
   * const { likesCount } = await new PostLikesService().like(user, postId)
   */
  async like(actor: User, postId: string): Promise<LikeState> {
    const post = await this.findPost(postId)

    await db.transaction(async (trx) => {
      const inserted = await trx
        .knexQuery()
        .table('likes')
        .insert({ id: uuidv7(), user_id: actor.id, post_id: post.id, created_at: new Date() })
        .onConflict(['user_id', 'post_id'])
        .ignore()
        .returning('id')

      if (inserted.length > 0) {
        // NOTE: delta gravado antes do commit (ADR-0033)
        await this.#counters.increment([{ target: 'postLikes', id: post.id, delta: 1 }])
      }
    })

    return { liked: true, likesCount: await this.likesCountOf(post) }
  }

  /**
   * Descurte um post. Repetir não tem efeito.
   *
   * @param actor Usuário autenticado.
   * @param postId Id do post.
   * @returns Estado da curtida (`liked: false`).
   * @throws {PostNotFoundException} Post inexistente.
   * @example
   * await new PostLikesService().unlike(user, postId)
   */
  async unlike(actor: User, postId: string): Promise<LikeState> {
    const post = await this.findPost(postId)

    await db.transaction(async (trx) => {
      const deleted = await trx
        .knexQuery()
        .from('likes')
        .where('user_id', actor.id)
        .where('post_id', post.id)
        .delete()
        .returning('id')

      if (deleted.length > 0) {
        await this.#counters.increment([{ target: 'postLikes', id: post.id, delta: -1 }])
      }
    })

    return { liked: false, likesCount: await this.likesCountOf(post) }
  }

  /**
   * Engajamento de uma página de posts para quem está vendo, em uma consulta
   * só a `likes` (sem N+1) e uma leitura dos deltas pendentes.
   *
   * @param viewer Usuário autenticado.
   * @param posts Posts da página.
   * @returns Posts curtidos pelo usuário e deltas pendentes de curtidas.
   * @example
   * const engagement = await new PostLikesService().viewerState(user, page.items)
   */
  async viewerState(viewer: User, posts: Post[]): Promise<PostEngagement> {
    const ids = posts.map((post) => post.id)
    if (ids.length === 0) {
      return { likedPostIds: new Set(), likesOverlay: new Map() }
    }

    const [liked, likesOverlay] = await Promise.all([
      Like.query().where('userId', viewer.id).whereIn('postId', ids).select('postId'),
      this.#counters.pending('postLikes', ids),
    ])

    return { likedPostIds: new Set(liked.map((like) => like.postId)), likesOverlay }
  }

  private async findPost(postId: string): Promise<Post> {
    const post = await Post.find(postId)
    if (!post) {
      throw new PostNotFoundException('Postagem não encontrada')
    }

    return post
  }

  private async likesCountOf(post: Post): Promise<number> {
    const overlay = await this.#counters.pending('postLikes', [post.id])
    return withPendingDelta(post.likesCount, overlay, post.id)
  }
}
