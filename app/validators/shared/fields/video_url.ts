import { IMPACT_PROJECT_VIDEO_URL_MAX_LENGTH } from '#constants/impact_project'
import { isSupportedVideoUrl, toVideoEmbedUrl } from '#utils/video_embed'
import vine from '@vinejs/vine'

/**
 * Link de vídeo do YouTube ou do Vimeo (RF 9.2), já convertido para embed.
 * Outros endereços respondem 422 na regra `videoUrl`.
 */
const videoUrlRule = vine.createRule((value, _options, field) => {
  if (typeof value !== 'string' || !isSupportedVideoUrl(value)) {
    field.report('Use um link de vídeo do YouTube ou do Vimeo', 'videoUrl', field)
  }
})

export const videoUrl = () =>
  vine
    .string()
    .trim()
    .maxLength(IMPACT_PROJECT_VIDEO_URL_MAX_LENGTH)
    .use(videoUrlRule())
    // NOTE: em campo anulável o VineJS também chama o transform com null
    .transform((value) => (typeof value === 'string' ? (toVideoEmbedUrl(value) ?? value) : value))
