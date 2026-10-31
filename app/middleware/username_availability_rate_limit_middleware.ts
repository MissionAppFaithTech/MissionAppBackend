import cache from '#services/shared/cache/cache'
import { resolveClientIp } from '#utils/client_ip'
import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

const USERNAME_AVAILABILITY_RATE_LIMIT_MAX_REQUESTS = 20
const USERNAME_AVAILABILITY_RATE_LIMIT_WINDOW_SECONDS = 60

export default class UsernameAvailabilityRateLimitMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const key = `rate_limit:username_availability:ip:${resolveClientIp(ctx.request)}`
    const attempts = await cache.incrWithInitialTtl(
      key,
      USERNAME_AVAILABILITY_RATE_LIMIT_WINDOW_SECONDS
    )

    if (attempts > USERNAME_AVAILABILITY_RATE_LIMIT_MAX_REQUESTS) {
      ctx.response.header('Retry-After', String(USERNAME_AVAILABILITY_RATE_LIMIT_WINDOW_SECONDS))
      return ctx.response.tooManyRequests({
        message:
          'Muitas tentativas para consultar disponibilidade de username. Tente novamente em instantes.',
      })
    }

    return next()
  }
}
