/**
 * Links de vídeo aceitos em projetos de impacto (RF 9.2): YouTube (watch,
 * youtu.be, shorts, embed, live) e Vimeo. O vídeo nunca é enviado ao storage —
 * só o link, convertido para o formato de embed.
 */
const YOUTUBE_ID = '[\\w-]{11}'
const YOUTUBE_PATTERNS = [
  new RegExp(
    `^https?://(?:www\\.|m\\.)?youtube\\.com/watch\\?(?:.*&)?v=(${YOUTUBE_ID})(?:[&#].*)?$`,
    'i'
  ),
  new RegExp(
    `^https?://(?:www\\.|m\\.)?youtube\\.com/(?:shorts|embed|live)/(${YOUTUBE_ID})(?:[?#/].*)?$`,
    'i'
  ),
  new RegExp(`^https?://youtu\\.be/(${YOUTUBE_ID})(?:[?#].*)?$`, 'i'),
]
const VIMEO_PATTERNS = [
  /^https?:\/\/(?:www\.)?vimeo\.com\/(\d+)(?:[/?#].*)?$/i,
  /^https?:\/\/player\.vimeo\.com\/video\/(\d+)(?:[/?#].*)?$/i,
]

/**
 * Converte o link de um vídeo do YouTube ou do Vimeo no endereço de embed.
 *
 * @param url Link colado pelo missionário.
 * @returns URL de embed, ou `null` quando o link não é de um vídeo suportado.
 * @example
 * toVideoEmbedUrl('https://youtu.be/dQw4w9WgXcQ') // 'https://www.youtube.com/embed/dQw4w9WgXcQ'
 * toVideoEmbedUrl('https://vimeo.com/76979871') // 'https://player.vimeo.com/video/76979871'
 */
export function toVideoEmbedUrl(url: string): string | null {
  const value = url.trim()

  for (const pattern of YOUTUBE_PATTERNS) {
    const id = pattern.exec(value)?.[1]
    if (id) return `https://www.youtube.com/embed/${id}`
  }

  for (const pattern of VIMEO_PATTERNS) {
    const id = pattern.exec(value)?.[1]
    if (id) return `https://player.vimeo.com/video/${id}`
  }

  return null
}

/**
 * O link é de um vídeo suportado (YouTube ou Vimeo)?
 *
 * @param url Link a conferir.
 * @returns `true` quando {@link toVideoEmbedUrl} consegue convertê-lo.
 * @example
 * isSupportedVideoUrl('https://tiktok.com/@user/video/1') // false
 */
export function isSupportedVideoUrl(url: string): boolean {
  return toVideoEmbedUrl(url) !== null
}
