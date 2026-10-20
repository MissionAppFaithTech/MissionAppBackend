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
import { escapeLike } from '#utils/escape_like'
import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import type { ModelQueryBuilderContract } from '@adonisjs/lucid/types/model'

type ListImpactProjectsFilters = {
  search?: string
  missionaryId?: string
  page?: number
  perPage?: number
}

type CreateImpactProjectPayload = {
  missionaryId?: string
  title: string
  description: string
  coverImageAssetId: string
  videoAssetId?: string
}

type UpdateImpactProjectPayload = {
  title?: string
  description?: string
  coverImageAssetId?: string
  videoAssetId?: string | null
}

/**
 * Centraliza o CRUD de projetos de impacto — um por missionário — com
 * controle de autorização por dono e administrador, e o ciclo de vida dos
 * arquivos de capa e vídeo vinculados.
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

    return query.orderBy('createdAt', 'desc').paginate(filters.page ?? 1, filters.perPage ?? 20)
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

      await this.assertMediaAttachable(actor, trx, {
        coverImageAssetId: payload.coverImageAssetId,
        videoAssetId: payload.videoAssetId,
      })

      return ImpactProject.create(
        {
          missionaryId: missionary.id,
          title: payload.title,
          description: payload.description,
          coverImageAssetId: payload.coverImageAssetId,
          videoAssetId: payload.videoAssetId ?? null,
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

      const { incoming, replaced } = this.diffMedia(project, payload)
      await this.assertMediaAttachable(actor, trx, incoming)

      project.merge({
        title: payload.title,
        description: payload.description,
        coverImageAssetId: payload.coverImageAssetId,
        videoAssetId: payload.videoAssetId,
      })
      await project.save()

      return replaced
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

      return [project.coverImageAssetId, project.videoAssetId].filter(
        (assetId): assetId is string => !!assetId
      )
    })

    await MediaAssetsDiscarded.dispatch(discarded)
  }

  /**
   * Separa, na atualização, os arquivos que passam a ser vinculados (a
   * validar) dos que deixam de ser (a descartar após o commit).
   */
  private diffMedia(project: ImpactProject, payload: UpdateImpactProjectPayload) {
    const coverChanged =
      payload.coverImageAssetId !== undefined &&
      payload.coverImageAssetId !== project.coverImageAssetId
    const videoChanged =
      payload.videoAssetId !== undefined && payload.videoAssetId !== project.videoAssetId

    return {
      incoming: {
        coverImageAssetId: coverChanged ? payload.coverImageAssetId : undefined,
        videoAssetId: videoChanged ? (payload.videoAssetId ?? undefined) : undefined,
      },
      replaced: [
        coverChanged ? project.coverImageAssetId : null,
        videoChanged ? project.videoAssetId : null,
      ].filter((assetId): assetId is string => !!assetId),
    }
  }

  private withMedia(query: ModelQueryBuilderContract<typeof ImpactProject>) {
    return query.preload('coverImage').preload('video')
  }

  private async assertMediaAttachable(
    actor: User,
    trx: TransactionClientContract,
    media: { coverImageAssetId?: string; videoAssetId?: string }
  ): Promise<void> {
    const attachment = new MediaAttachmentService()

    if (media.coverImageAssetId) {
      await attachment.assertAttachable(
        actor,
        [media.coverImageAssetId],
        MediaAssetPurpose.IMPACT_PROJECT_COVER,
        trx
      )
    }

    if (media.videoAssetId) {
      await attachment.assertAttachable(
        actor,
        [media.videoAssetId],
        MediaAssetPurpose.IMPACT_PROJECT_VIDEO,
        trx
      )
    }

    const assetIds = [media.coverImageAssetId, media.videoAssetId].filter(
      (assetId): assetId is string => !!assetId
    )

    if (assetIds.length === 0) {
      return
    }

    const alreadyAttached = await ImpactProject.query({ client: trx })
      .whereIn('coverImageAssetId', assetIds)
      .orWhereIn('videoAssetId', assetIds)
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
