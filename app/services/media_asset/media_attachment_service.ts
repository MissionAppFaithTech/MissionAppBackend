import type { MediaAssetPurpose } from '#enums/media_asset/media_asset_purpose'
import { MediaAssetStatus } from '#enums/media_asset/media_asset_status'
import MediaAssetNotAttachableException from '#exceptions/media_asset/media_asset_not_attachable_exception'
import MediaAsset from '#models/media_asset'
import type User from '#models/user'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

const ATTACHABLE_STATUSES = [MediaAssetStatus.PROCESSING, MediaAssetStatus.READY]

/**
 * Garante que arquivos informados pelo cliente possam ser vinculados a um
 * recurso: existem, foram enviados pelo próprio ator, têm a finalidade
 * esperada e tiveram o upload confirmado.
 */
export class MediaAttachmentService {
  async assertAttachable(
    actor: User,
    mediaAssetIds: string[],
    purpose: MediaAssetPurpose,
    trx: TransactionClientContract
  ): Promise<void> {
    if (mediaAssetIds.length === 0) {
      return
    }

    // NOTE: lock impede que o job de descarte apague um asset que está sendo
    // vinculado nesta mesma transação
    const assets = await MediaAsset.query({ client: trx })
      .whereIn('id', mediaAssetIds)
      .where('uploadedByUserId', actor.id)
      .where('purpose', purpose)
      .whereIn('status', ATTACHABLE_STATUSES)
      .forUpdate()

    const found = new Set(assets.map((asset) => asset.id))
    const invalid = mediaAssetIds.filter((id) => !found.has(id))

    if (invalid.length > 0) {
      throw new MediaAssetNotAttachableException(
        `Arquivos inválidos para ${purpose}: ${invalid.join(', ')} — verifique se o upload foi confirmado e se o arquivo pertence a você`
      )
    }
  }
}
