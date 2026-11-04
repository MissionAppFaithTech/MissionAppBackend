import { MediaAssetPurpose } from '#enums/media_asset/media_asset_purpose'
import { UserRole } from '#enums/user/user_role'
import MediaAssetsDiscarded from '#events/media_asset/media_assets_discarded'
import ImpactProjectAlreadyExistsException from '#exceptions/impact_project/impact_project_already_exists_exception'
import ImpactProjectForbiddenException from '#exceptions/impact_project/impact_project_forbidden_exception'
import ImpactProjectNotFoundException from '#exceptions/impact_project/impact_project_not_found_exception'
import MediaAssetNotAttachableException from '#exceptions/media_asset/media_asset_not_attachable_exception'
import ImpactProject from '#models/impact_project'
import type User from '#models/user'
import { MediaAttachmentService } from '#services/media_asset/media_attachment_service'
import { ResolveMissionaryService } from '#services/missionary/resolve_missionary_service'
import { paginateByCursor } from '#utils/cursor_pagination'
import { escapeLike } from '#utils/escape_like'
import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import type { ModelQueryBuilderContract } from '@adonisjs/lucid/types/model'

type ListImpactProjectsFilters = {
  search?: string
  missionaryId?: string
  cursor?: string
  limit?: number
}

type CreateImpactProjectPayload = {
  missionaryId?: string
  title: string
  description: string
  coverImageAssetId: string
  /** Link de embed (o validador já converte o link colado). */
  videoUrl?: string
}

type UpdateImpactProjectPayload = {
  title?: string
  description?: string
  coverImageAssetId?: string
  videoUrl?: string | null
}

/**
 * Centraliza o CRUD de projetos de impacto — um por missionário — com
 * controle de autorização por dono e administrador e o ciclo de vida da
 * imagem de capa. O vídeo é só um link externo (RF 9.2).
 */
export class ImpactProjectsService {
  async list(filters: ListImpactProjectsFilters = {}) {
    const query = this.withMedia(ImpactProject.query())

    if (filters.search) {
      query.whereILike('title', `%${escapeLike(filters.search)}%`)
    }

    if (filters.missionaryId) {
      query.where('missionaryId', filters.missionaryId)
    }

    return paginateByCursor(query, {
      column: 'created_at',
      valueOf: (project) => project.createdAt.toISO()!,
      idOf: (project) => project.id,
      cursor: filters.cursor,
      limit: filters.limit,
    })
  }

  async show(id: string): Promise<ImpactProject> {
    const project = await this.withMedia(ImpactProject.query()).where('id', id).first()
    if (!project) {
      throw new ImpactProjectNotFoundException('Projeto de impacto não encontrado')
    }

    return project
  }

  async create(actor: User, payload: CreateImpactProjectPayload): Promise<ImpactProject> {
    const missionary = await new ResolveMissionaryService().execute(actor, payload.missionaryId)

    const project = await db.transaction(async (trx) => {
      const existing = await ImpactProject.query({ client: trx })
        .where('missionaryId', missionary.id)
        .first()

      if (existing) {
        throw new ImpactProjectAlreadyExistsException(
          'Missionário já possui um projeto de impacto cadastrado'
        )
      }

      await this.assertCoverAttachable(actor, trx, payload.coverImageAssetId)

      return ImpactProject.create(
        {
          missionaryId: missionary.id,
          title: payload.title,
          description: payload.description,
          coverImageAssetId: payload.coverImageAssetId,
          videoUrl: payload.videoUrl ?? null,
        },
        { client: trx }
      )
    })

    return this.show(project.id)
  }

  async update(
    actor: User,
    id: string,
    payload: UpdateImpactProjectPayload
  ): Promise<ImpactProject> {
    const discarded = await db.transaction(async (trx) => {
      const project = await ImpactProject.query({ client: trx })
        .where('id', id)
        .preload('missionary')
        .forUpdate()
        .first()

      if (!project) {
        throw new ImpactProjectNotFoundException('Projeto de impacto não encontrado')
      }

      this.assertCanManage(actor, project.missionary.userId)

      const coverChanged =
        payload.coverImageAssetId !== undefined &&
        payload.coverImageAssetId !== project.coverImageAssetId
      const previousCover = project.coverImageAssetId

      if (coverChanged) {
        await this.assertCoverAttachable(actor, trx, payload.coverImageAssetId!)
      }

      project.merge({
        title: payload.title,
        description: payload.description,
        coverImageAssetId: payload.coverImageAssetId,
        videoUrl: payload.videoUrl,
      })
      await project.save()

      // NOTE: a capa trocada só é descartada depois do commit
      return coverChanged ? [previousCover] : []
    })

    if (discarded.length > 0) {
      await MediaAssetsDiscarded.dispatch(discarded)
    }

    return this.show(id)
  }

  async destroy(actor: User, id: string): Promise<void> {
    const discarded = await db.transaction(async (trx) => {
      const project = await ImpactProject.query({ client: trx })
        .where('id', id)
        .preload('missionary')
        .forUpdate()
        .first()

      if (!project) {
        throw new ImpactProjectNotFoundException('Projeto de impacto não encontrado')
      }

      this.assertCanManage(actor, project.missionary.userId)

      await project.delete()

      return [project.coverImageAssetId]
    })

    await MediaAssetsDiscarded.dispatch(discarded)
  }

  private withMedia(query: ModelQueryBuilderContract<typeof ImpactProject>) {
    return query.preload('coverImage')
  }

  /** A capa precisa ser imagem do próprio ator, com upload confirmado e livre. */
  private async assertCoverAttachable(
    actor: User,
    trx: TransactionClientContract,
    coverImageAssetId: string
  ): Promise<void> {
    await new MediaAttachmentService().assertAttachable(
      actor,
      [coverImageAssetId],
      MediaAssetPurpose.IMPACT_PROJECT_COVER,
      trx
    )

    const alreadyAttached = await ImpactProject.query({ client: trx })
      .where('coverImageAssetId', coverImageAssetId)
      .first()

    if (alreadyAttached) {
      throw new MediaAssetNotAttachableException('Arquivo já está vinculado a outro projeto')
    }
  }

  private assertCanManage(actor: User, ownerUserId: string): void {
    if (actor.role === UserRole.ADMIN) {
      return
    }

    if (ownerUserId !== actor.id) {
      throw new ImpactProjectForbiddenException(
        'Você não tem permissão para alterar este projeto de impacto'
      )
    }
  }
}
