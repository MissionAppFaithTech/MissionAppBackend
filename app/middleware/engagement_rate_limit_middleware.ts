import cache from '#services/shared/cache/cache'
import { resolveClientIp } from '#utils/client_ip'
import { tooManyRequestsEnvelope } from '#utils/error_envelope'
import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

const ENGAGEMENT_RATE_LIMIT_PER_USER = 120
const ENGAGEMENT_RATE_LIMIT_WINDOW_SECONDS = 60

/**
 * Limita seguir/curtir por usuário (120/min): cliques normais nunca chegam
 * perto, mas um script alternando follow/unfollow não enche o banco de escritas.
 * Deve rodar depois de `auth`; sem usuário cai no IP.
 */
export default class EngagementRateLimitMiddleware {
  /**
   * @param ctx Contexto da requisição.
   * @param next Próximo middleware.
   * @returns 429 no envelope de erro (ADR-0034) ao exceder; senão segue.
   */
  async handle(ctx: HttpContext, next: NextFn) {
    const userId = ctx.auth.user?.id
    const key = userId
      ? `rate_limit:engagement:user:${userId}`
      : `rate_limit:engagement:ip:${resolveClientIp(ctx.request)}`

    const attempts = await cache.incrWithInitialTtl(key, ENGAGEMENT_RATE_LIMIT_WINDOW_SECONDS)
    if (attempts > ENGAGEMENT_RATE_LIMIT_PER_USER) {
      ctx.response.header('Retry-After', String(ENGAGEMENT_RATE_LIMIT_WINDOW_SECONDS))
      return ctx.response.tooManyRequests(
        tooManyRequestsEnvelope(
          'Muitas ações em sequência. Tente novamente em instantes.',
          ENGAGEMENT_RATE_LIMIT_WINDOW_SECONDS
        )
      )
    }

    return next()
  }
}
