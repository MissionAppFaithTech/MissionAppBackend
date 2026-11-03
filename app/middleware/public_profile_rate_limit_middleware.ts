import cache from '#services/shared/cache/cache'
import { isBffServerRequest, resolveClientIp } from '#utils/client_ip'
import { tooManyRequestsEnvelope } from '#utils/error_envelope'
import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

const PUBLIC_PROFILE_RATE_LIMIT_PER_IP = 60
const PUBLIC_PROFILE_RATE_LIMIT_BFF_SERVER = 600
const PUBLIC_PROFILE_RATE_LIMIT_WINDOW_SECONDS = 60

/**
 * Limita as consultas ao perfil público de missionário (ADR-0036).
 *
 * - Pedidos do servidor do BFF autenticado **sem** IP de usuário (renderização
 *   pública cacheada no Next, compartilhada entre visitantes) usam um orçamento
 *   próprio de 600/min, para não consumir o limite de um visitante qualquer.
 * - Os demais, inclusive os do BFF com IP repassado (ADR-0032), ficam em 60/min
 *   por IP do usuário final.
 */
export default class PublicProfileRateLimitMiddleware {
  /**
   * @param ctx Contexto da requisição.
   * @param next Próximo middleware.
   * @returns 429 no envelope de erro (ADR-0034) ao exceder; senão segue.
   */
  async handle(ctx: HttpContext, next: NextFn) {
    const fromBffServer = isBffServerRequest(ctx.request)
    const key = fromBffServer
      ? 'rate_limit:public_profile:bff_server'
      : `rate_limit:public_profile:ip:${resolveClientIp(ctx.request)}`
    const maxRequests = fromBffServer
      ? PUBLIC_PROFILE_RATE_LIMIT_BFF_SERVER
      : PUBLIC_PROFILE_RATE_LIMIT_PER_IP

    const attempts = await cache.incrWithInitialTtl(key, PUBLIC_PROFILE_RATE_LIMIT_WINDOW_SECONDS)
    if (attempts > maxRequests) {
      ctx.response.header('Retry-After', String(PUBLIC_PROFILE_RATE_LIMIT_WINDOW_SECONDS))
      return ctx.response.tooManyRequests(
        tooManyRequestsEnvelope(
          'Muitas consultas a perfis públicos. Tente novamente em instantes.',
          PUBLIC_PROFILE_RATE_LIMIT_WINDOW_SECONDS
        )
      )
    }

    return next()
  }
}
