import { MediaAssetPurpose } from '#enums/media_asset/media_asset_purpose'

/**
 * Nome da fila BullMQ que concentra o processamento pesado de arquivos
 * (compressão de imagens e remoção de objetos no storage) — fila separada da
 * de indexação/email para que a carga de CPU do `sharp` escale de forma
 * independente (ADR-0012).
 */
export const MEDIA_PROCESSING_QUEUE_NAME = 'media-processing'

/** Nome do job que valida e comprime um arquivo recém-enviado ao storage. */
export const PROCESS_MEDIA_ASSET_JOB_NAME = 'process-media-asset'

/** Nome do job que remove do storage e do banco arquivos que deixaram de ser referenciados. */
export const DELETE_MEDIA_ASSETS_JOB_NAME = 'delete-media-assets'

/**
 * Idade (em horas) a partir da qual um asset em `PENDING_UPLOAD` (upload
 * nunca confirmado) ou `FAILED` é considerado abandonado e removido pela
 * limpeza periódica — folga ampla sobre a validade da URL de upload.
 */
export const ABANDONED_MEDIA_ASSET_TTL_HOURS = 24

/** Diariamente às 4h — fora da janela da limpeza de refresh tokens (3h). */
export const MEDIA_ASSETS_CLEANUP_CRON_SCHEDULE = '0 4 * * *'

/** Validade da URL pré-assinada de upload direto ao storage. */
export const MEDIA_UPLOAD_URL_TTL_SECONDS = 15 * 60

/** Formato de saída das imagens comprimidas pelo worker. */
export const COMPRESSED_IMAGE_FORMAT = { extension: 'webp', mimeType: 'image/webp' } as const

/** Qualidade (0–100) aplicada na compressão das imagens. */
export const COMPRESSED_IMAGE_QUALITY = 80

/**
 * Regras de upload por finalidade do arquivo. `maxDimensionPx` presente
 * indica que o arquivo é uma imagem a ser redimensionada e comprimida pelo
 * worker; ausente, o arquivo é apenas validado (ex: vídeo).
 */
export const MEDIA_ASSET_RULES: Record<
  MediaAssetPurpose,
  {
    mimeTypes: readonly string[]
    maxSizeBytes: number
    storagePrefix: string
    maxDimensionPx?: number
  }
> = {
  [MediaAssetPurpose.IMPACT_PROJECT_COVER]: {
    mimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    maxSizeBytes: 10 * 1024 * 1024,
    storagePrefix: 'impact-projects/covers',
    maxDimensionPx: 1920,
  },
  [MediaAssetPurpose.IMPACT_PROJECT_VIDEO]: {
    mimeTypes: ['video/mp4', 'video/quicktime', 'video/webm'],
    maxSizeBytes: 200 * 1024 * 1024,
    storagePrefix: 'impact-projects/videos',
  },
  [MediaAssetPurpose.POST_IMAGE]: {
    mimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    maxSizeBytes: 10 * 1024 * 1024,
    storagePrefix: 'posts/images',
    maxDimensionPx: 1600,
  },
}

/** Extensão de arquivo usada na chave do storage para cada mime type aceito. */
export const MIME_TYPE_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'video/mp4': 'mp4',
  'video/quicktime': 'mov',
  'video/webm': 'webm',
}
