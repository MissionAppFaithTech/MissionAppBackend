import env from '#start/env'
import type { RequestContext } from '#types/http/context'
import { createHash, timingSafeEqual } from 'node:crypto'
import { isIP } from 'node:net'

/** Header com o IP do usuário final, enviado pelo BFF (Next.js). */
export const CLIENT_IP_HEADER = 'x-missionapp-client-ip'
/** Header com o segredo compartilhado que autentica o BFF. */
export const BFF_SECRET_HEADER = 'x-missionapp-bff-secret'

function sameSecret(received: string, expected: string): boolean {
  // NOTE: compara digests de tamanho fixo — timingSafeEqual exige buffers do mesmo
  // tamanho e o tamanho do segredo não deve vazar pelo tempo de resposta.
  const a = createHash('sha256').update(received).digest()
  const b = createHash('sha256').update(expected).digest()
  return timingSafeEqual(a, b)
}

/**
 * Resolve o IP do usuário final para rate limits (ADR-0032). O frontend chama a
 * API a partir do servidor do BFF, então `request.ip()` seria o IP do BFF para
 * todos os usuários. Quando o BFF se autentica com `BFF_SHARED_SECRET`, o IP que
 * ele repassa em `x-missionapp-client-ip` é usado; caso contrário (segredo
 * ausente, divergente ou IP inválido), vale `request.ip()`.
 *
 * @param request Request atual.
 * @param sharedSecret Segredo esperado; padrão `BFF_SHARED_SECRET` (opcional).
 * @returns IP do usuário final, ou o IP da conexão quando o BFF não é confiável.
 * @example
 * const key = `rate_limit:username_availability:ip:${resolveClientIp(ctx.request)}`
 */
export function resolveClientIp(
  request: RequestContext,
  sharedSecret: string | undefined = env.get('BFF_SHARED_SECRET')
): string {
  const fallback = request.ip()
  if (!sharedSecret) return fallback

  const secret = request.header(BFF_SECRET_HEADER)
  const clientIp = request.header(CLIENT_IP_HEADER)?.trim()
  if (!secret || !clientIp || !sameSecret(secret, sharedSecret)) return fallback

  return isIP(clientIp) ? clientIp : fallback
}
