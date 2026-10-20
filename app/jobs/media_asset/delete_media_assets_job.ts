import { MediaProcessingService } from '#services/media_asset/media_processing_service'
import type { MediaAssetsDiscardedPayload } from '#types/events/media_asset/media_assets_discarded'

/**
 * Remove do banco e do storage arquivos que deixaram de ser referenciados —
 * chamado pelo worker ao processar um job da fila.
 *
 * @param payload Ids dos assets descartados na transação de origem.
 * @returns Nada — efeito colateral (objetos e registros removidos).
 * @example
 * await deleteMediaAssets(job.data)
 */
export async function deleteMediaAssets(payload: MediaAssetsDiscardedPayload): Promise<void> {
  await new MediaProcessingService().deleteMany(payload.mediaAssetIds)
}
