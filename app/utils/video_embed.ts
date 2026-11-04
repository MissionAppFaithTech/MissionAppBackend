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
/**
 * Vimeo: id numérico e, em vídeo não listado, o código de acesso (`h`), sem o
 * qual o embed não toca. Aceita link direto, de canal, de grupo, de showcase e
 * o próprio player.
 */
const VIMEO_PATTERNS = [
  /^https?:\/\/(?:www\.)?vimeo\.com\/(\d+)(?:\/([\da-f]+))?\/?(?:[?#].*)?$/i,
  /^https?:\/\/(?:www\.)?vimeo\.com\/channels\/[\w-]+\/(\d+)\/?(?:[?#].*)?$/i,
  /^https?:\/\/(?:www\.)?vimeo\.com\/groups\/[\w-]+\/videos\/(\d+)\/?(?:[?#].*)?$/i,
  /^https?:\/\/(?:www\.)?vimeo\.com\/showcase\/\d+\/video\/(\d+)\/?(?:[?#].*)?$/i,
  /^https?:\/\/player\.vimeo\.com\/video\/(\d+)\/?(?:[?#].*)?$/i,
]

/** Código de acesso de vídeo não listado: no caminho ou no parâmetro `h`. */
function vimeoHash(url: string, pathHash: string | undefined): string | undefined {
  const hash = pathHash ?? new URL(url).searchParams.get('h') ?? undefined
  return hash && /^[\da-f]+$/i.test(hash) ? hash.toLowerCase() : undefined
}

/**
 * Converte o link de um vídeo do YouTube ou do Vimeo no endereço de embed.
 *
 * @param url Link colado pelo missionário.
 * @returns URL de embed, ou `null` quando o link não é de um vídeo suportado.
 * @example
 * toVideoEmbedUrl('https://youtu.be/dQw4w9WgXcQ') // 'https://www.youtube.com/embed/dQw4w9WgXcQ'
 * toVideoEmbedUrl('https://vimeo.com/76979871') // 'https://player.vimeo.com/video/76979871'
 * toVideoEmbedUrl('https://vimeo.com/76979871/8272103f6e') // '…/video/76979871?h=8272103f6e'
 */
export function toVideoEmbedUrl(url: string): string | null {
  const value = url.trim()

  for (const pattern of YOUTUBE_PATTERNS) {
    const id = pattern.exec(value)?.[1]
    if (id) return `https://www.youtube.com/embed/${id}`
  }

  for (const pattern of VIMEO_PATTERNS) {
    const match = pattern.exec(value)
    if (match) {
      const hash = vimeoHash(value, match[2])
      return `https://player.vimeo.com/video/${match[1]}${hash ? `?h=${hash}` : ''}`
    }
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
