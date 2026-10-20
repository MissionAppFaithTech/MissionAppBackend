import { POST_IMAGES_PER_MISSIONARY_LIMIT, POST_SLUG_CONTENT_LENGTH } from '#constants/post'
import { MediaAssetPurpose } from '#enums/media_asset/media_asset_purpose'
import { UserRole } from '#enums/user/user_role'
import MediaAssetsDiscarded from '#events/media_asset/media_assets_discarded'
import MediaAssetNotAttachableException from '#exceptions/media_asset/media_asset_not_attachable_exception'
import PostForbiddenException from '#exceptions/post/post_forbidden_exception'
import PostNotFoundException from '#exceptions/post/post_not_found_exception'
import Missionary from '#models/missionary'
import Post from '#models/post'
import PostImage from '#models/post_image'
import type User from '#models/user'
import { MediaAttachmentService } from '#services/media_asset/media_attachment_service'
import { ResolveMissionaryService } from '#services/missionary/resolve_missionary_service'
import string from '@adonisjs/core/helpers/string'
import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import type { ModelQueryBuilderContract } from '@adonisjs/lucid/types/model'
import { DateTime } from 'luxon'
import { randomBytes } from 'node:crypto'

type ListPostsFilters = {
  missionaryId?: string
  page?: number
  perPage?: number
}

type CreatePostPayload = {
  missionaryId?: string
  content: string
  highlightLink?: string
  imageAssetIds?: string[]
}

type UpdatePostPayload = {
  content?: string
  highlightLink?: string | null
  imageAssetIds?: string[]
}

/**
 * Centraliza o CRUD de postagens de missionários e aplica o limite rotativo
 * de imagens por missionário: ao ultrapassar
 * `POST_IMAGES_PER_MISSIONARY_LIMIT`, as imagens vinculadas há mais tempo são
 * desvinculadas e seus arquivos descartados.
 */
export class PostsService {
  async list(filters: ListPostsFilters = {}) {
    const query = this.withImages(Post.query())

    if (filters.missionaryId) {
      query.where('missionaryId', filters.missionaryId)
    }

    return query.orderBy('createdAt', 'desc').paginate(filters.page ?? 1, filters.perPage ?? 20)
  }

  async show(id: string): Promise<Post> {
    const post = await this.withImages(Post.query()).where('id', id).first()
    if (!post) {
      throw new PostNotFoundException('Postagem não encontrada')
    }

    return post
  }

  async create(actor: User, payload: CreatePostPayload): Promise<Post> {
    const missionary = await new ResolveMissionaryService().execute(actor, payload.missionaryId)
    const imageAssetIds = payload.imageAssetIds ?? []

    const { post, discarded } = await db.transaction(async (trx) => {
      await this.lockMissionary(missionary.id, trx)
      await this.assertImagesAttachable(actor, imageAssetIds, trx)

      const created = await Post.create(
        {
          missionaryId: missionary.id,
          content: payload.content,
          highlightLink: payload.highlightLink ?? null,
          slug: this.slugFor(payload.content),
        },
        { client: trx }
      )

      await this.attachImages(created.id, imageAssetIds, trx)

      return { post: created, discarded: await this.enforceImageLimit(missionary.id, trx) }
    })

    await this.dispatchDiscarded(discarded)

    return this.show(post.id)
  }

  async update(actor: User, id: string, payload: UpdatePostPayload): Promise<Post> {
    const discarded = await db.transaction(async (trx) => {
      const post = await this.findForWrite(actor, id, trx)

      post.merge({ content: payload.content, highlightLink: payload.highlightLink })
      await post.save()

      if (!payload.imageAssetIds) {
        return []
      }

      const requested = payload.imageAssetIds
      const current = await PostImage.query({ client: trx }).where('postId', post.id)
      const currentAssetIds = new Set(current.map((image) => image.imageAssetId))

      const removed = current.filter((image) => !requested.includes(image.imageAssetId))
      const added = requested.filter((assetId) => !currentAssetIds.has(assetId))

      await this.assertImagesAttachable(actor, added, trx)

      if (removed.length > 0) {
        await PostImage.query({ client: trx })
          .whereIn(
            'id',
            removed.map((image) => image.id)
          )
          .delete()
      }

      // NOTE: imagens mantidas só têm a posição atualizada (preservam o
      // created_at), então editar um post não "rejuvenesce" imagens antigas
      // na fila de descarte do limite por missionário
      for (const image of current) {
        const order = requested.indexOf(image.imageAssetId)
        if (order >= 0 && order !== image.order) {
          image.order = order
          await image.save()
        }
      }

      await this.attachImages(
        post.id,
        added,
        trx,
        added.map((assetId) => requested.indexOf(assetId))
      )

      const evicted = await this.enforceImageLimit(post.missionaryId, trx)

      return [...removed.map((image) => image.imageAssetId), ...evicted]
    })

    await this.dispatchDiscarded(discarded)

    return this.show(id)
  }

  async destroy(actor: User, id: string): Promise<void> {
    const discarded = await db.transaction(async (trx) => {
      const post = await this.findForWrite(actor, id, trx)
      const images = await PostImage.query({ client: trx }).where('postId', post.id)

      // NOTE: post_images é removida em cascata pela FK; os arquivos não, por
      // isso os ids são coletados antes do delete
      await post.delete()

      return images.map((image) => image.imageAssetId)
    })

    await this.dispatchDiscarded(discarded)
  }

  private withImages(query: ModelQueryBuilderContract<typeof Post>) {
    return query.preload('images', (images) => images.orderBy('order', 'asc').preload('image'))
  }

  private async findForWrite(actor: User, id: string, trx: TransactionClientContract) {
    const post = await Post.query({ client: trx }).where('id', id).preload('missionary').first()
    if (!post) {
      throw new PostNotFoundException('Postagem não encontrada')
    }

    if (actor.role !== UserRole.ADMIN && post.missionary.userId !== actor.id) {
      throw new PostForbiddenException('Você não tem permissão para alterar esta postagem')
    }

    await this.lockMissionary(post.missionaryId, trx)

    return post
  }

  /**
   * Serializa as escritas de posts de um mesmo missionário — sem isso, dois
   * posts criados em paralelo contariam as imagens um do outro de forma
   * inconsistente e o limite poderia ser ultrapassado.
   */
  private async lockMissionary(missionaryId: string, trx: TransactionClientContract) {
    await Missionary.query({ client: trx }).where('id', missionaryId).forUpdate().firstOrFail()
  }

  private async assertImagesAttachable(
    actor: User,
    imageAssetIds: string[],
    trx: TransactionClientContract
  ): Promise<void> {
    if (imageAssetIds.length === 0) {
      return
    }

    await new MediaAttachmentService().assertAttachable(
      actor,
      imageAssetIds,
      MediaAssetPurpose.POST_IMAGE,
      trx
    )

    const alreadyAttached = await PostImage.query({ client: trx })
      .whereIn('imageAssetId', imageAssetIds)
      .first()

    if (alreadyAttached) {
      throw new MediaAssetNotAttachableException('Imagem já está vinculada a outra postagem')
    }
  }

  private async attachImages(
    postId: string,
    imageAssetIds: string[],
    trx: TransactionClientContract,
    orders: number[] = imageAssetIds.map((_, index) => index)
  ): Promise<void> {
    if (imageAssetIds.length === 0) {
      return
    }

    // NOTE: created_at único por lote — o desempate do descarte fica só pela
    // posição na galeria, sem depender do milissegundo em que cada linha foi gravada
    const createdAt = DateTime.now()

    await PostImage.createMany(
      imageAssetIds.map((imageAssetId, index) => ({
        postId,
        imageAssetId,
        order: orders[index],
        createdAt,
      })),
      { client: trx }
    )
  }

  /**
   * Desvincula as imagens excedentes do missionário (as vinculadas há mais
   * tempo) e devolve os ids dos assets para descarte após o commit.
   */
  private async enforceImageLimit(
    missionaryId: string,
    trx: TransactionClientContract
  ): Promise<string[]> {
    const excess = await PostImage.query({ client: trx })
      .select('post_images.id', 'post_images.image_asset_id')
      .join('posts', 'posts.id', 'post_images.post_id')
      .where('posts.missionary_id', missionaryId)
      .orderBy('post_images.created_at', 'desc')
      .orderBy('post_images.order', 'asc')
      .offset(POST_IMAGES_PER_MISSIONARY_LIMIT)

    if (excess.length === 0) {
      return []
    }

    await PostImage.query({ client: trx })
      .whereIn(
        'id',
        excess.map((image) => image.id)
      )
      .delete()

    return excess.map((image) => image.imageAssetId)
  }

  private async dispatchDiscarded(mediaAssetIds: string[]): Promise<void> {
    if (mediaAssetIds.length > 0) {
      await MediaAssetsDiscarded.dispatch(mediaAssetIds)
    }
  }

  private slugFor(content: string): string {
    const base =
      string.slug(content.slice(0, POST_SLUG_CONTENT_LENGTH), { lower: true, strict: true }) ||
      'post'

    // NOTE: sufixo aleatório garante unicidade sem consulta prévia ao banco
    return `${base}-${randomBytes(4).toString('hex')}`
  }
}
