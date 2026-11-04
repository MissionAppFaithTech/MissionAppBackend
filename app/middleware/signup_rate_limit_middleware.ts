import cache from '#services/shared/cache/cache'
import { resolveClientIp } from '#utils/client_ip'
import { tooManyRequestsEnvelope } from '#utils/error_envelope'
import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

const SIGNUP_RATE_LIMIT_MAX_REQUESTS = 10
const SIGNUP_RATE_LIMIT_WINDOW_SECONDS = 60 * 60

/**
 * Limita por IP o cadastro público de missionário, que cria contas e também
 * itens de catálogo (agência e comunidade de fé) sem autenticação. O IP vem
 * de `resolveClientIp()`, como nos demais rate limits públicos.
 */
export default class SignupRateLimitMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const key = `rate_limit:missionary_signup:ip:${resolveClientIp(ctx.request)}`
    const attempts = await cache.incrWithInitialTtl(key, SIGNUP_RATE_LIMIT_WINDOW_SECONDS)

    if (attempts > SIGNUP_RATE_LIMIT_MAX_REQUESTS) {
      ctx.response.header('Retry-After', String(SIGNUP_RATE_LIMIT_WINDOW_SECONDS))
      return ctx.response.tooManyRequests(
        tooManyRequestsEnvelope(
          'Muitas tentativas de cadastro. Tente novamente mais tarde.',
          SIGNUP_RATE_LIMIT_WINDOW_SECONDS
        )
      )
    }

    return next()
  }
}
