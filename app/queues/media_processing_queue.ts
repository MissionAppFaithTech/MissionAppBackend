import { bullMQConnection } from '#config/redis'
import type {
  DELETE_MEDIA_ASSETS_JOB_NAME,
  PROCESS_MEDIA_ASSET_JOB_NAME,
} from '#constants/media_asset'
import { MEDIA_PROCESSING_QUEUE_NAME } from '#constants/media_asset'
import type { MediaAssetUploadedPayload } from '#types/events/media_asset/media_asset_uploaded'
import type { MediaAssetsDiscardedPayload } from '#types/events/media_asset/media_assets_discarded'
import { Queue } from 'bullmq'

/**
 * Fila de produção única do processamento de arquivos (compressão e
 * remoção no storage). Cada listener usa esta mesma instância, só variando o
 * `job.name` no `.add()`.
 *
 * NameType é explicitado pois o BullMQ v6 não reduz mais sozinho o tipo
 * default de `job.name` quando `DataTypeOrJob` é uma união.
 */
export const mediaProcessingQueue = new Queue<
  MediaAssetUploadedPayload | MediaAssetsDiscardedPayload,
  void,
  typeof PROCESS_MEDIA_ASSET_JOB_NAME | typeof DELETE_MEDIA_ASSETS_JOB_NAME
>(MEDIA_PROCESSING_QUEUE_NAME, {
  connection: bullMQConnection,
  // NOTE: falha transitória do storage não pode virar arquivo órfão ou asset
  // preso em PROCESSING — os dois jobs são idempotentes, então retentar é seguro
  defaultJobOptions: { attempts: 5, backoff: { type: 'exponential', delay: 5000 } },
})
