import { ABANDONED_MEDIA_ASSET_TTL_HOURS } from '#constants/media_asset'
import { MediaAssetStatus } from '#enums/media_asset/media_asset_status'
import MediaAsset from '#models/media_asset'
import { MediaProcessingService } from '#services/media_asset/media_processing_service'
import { DateTime } from 'luxon'

/**
 * Remove assets com upload nunca confirmado (`PENDING_UPLOAD`) ou rejeitados
 * (`FAILED`) há mais de `ABANDONED_MEDIA_ASSET_TTL_HOURS` — sem isso, cada
 * pedido de upload abandonado deixaria um registro e, possivelmente, um
 * objeto órfão no bucket.
 *
 * @returns Quantidade de assets selecionados para remoção.
 * @example
 * const purged = await purgeAbandonedMediaAssets()
 */
export async function purgeAbandonedMediaAssets(): Promise<number> {
  const cutoff = DateTime.now().minus({ hours: ABANDONED_MEDIA_ASSET_TTL_HOURS })

  const abandoned = await MediaAsset.query()
    .whereIn('status', [MediaAssetStatus.PENDING_UPLOAD, MediaAssetStatus.FAILED])
    .where('createdAt', '<', cutoff.toSQL()!)
    .select('id')

  if (abandoned.length === 0) {
    return 0
  }

  await new MediaProcessingService().deleteMany(abandoned.map((asset) => asset.id))

  return abandoned.length
}
