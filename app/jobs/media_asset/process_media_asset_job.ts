import { MediaProcessingService } from '#services/media_asset/media_processing_service'
import type { MediaAssetUploadedPayload } from '#types/events/media_asset/media_asset_uploaded'

/**
 * Valida o arquivo enviado ao storage e, se for imagem, comprime — chamado
 * pelo worker ao processar um job da fila, nunca diretamente do request HTTP.
 *
 * @param payload Id do asset cujo upload foi confirmado pelo cliente.
 * @returns Nada — efeito colateral (objeto reescrito no storage e asset atualizado).
 * @example
 * await processMediaAsset(job.data)
 */
export async function processMediaAsset(payload: MediaAssetUploadedPayload): Promise<void> {
  await new MediaProcessingService().process(payload.mediaAssetId)
}
