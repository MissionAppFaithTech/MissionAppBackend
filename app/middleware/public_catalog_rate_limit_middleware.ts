import cache from '#services/shared/cache/cache'
import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

const PUBLIC_CATALOG_RATE_LIMIT_MAX_REQUESTS = 20
const PUBLIC_CATALOG_RATE_LIMIT_WINDOW_SECONDS = 60

/**
 * Limita por IP as consultas públicas (sem auth) aos catálogos usados no
 * cadastro. `catalog` separa o orçamento de cada catálogo, para que a busca
 * em um não esgote o outro na mesma tela. O IP vem de `request.ip()`, que só
 * confia em `X-Forwarded-For` quando a conexão parte de um proxy confiável
 * (`trustProxy` em `config/app.ts`).
 */
export default class PublicCatalogRateLimitMiddleware {
  async handle(ctx: HttpContext, next: NextFn, options: { catalog: string }) {
    const key = `rate_limit:public_catalog:${options.catalog}:ip:${ctx.request.ip()}`
    const attempts = await cache.incr(key)

    if (attempts === 1) {
      await cache.expire(key, PUBLIC_CATALOG_RATE_LIMIT_WINDOW_SECONDS)
    }

    if (attempts > PUBLIC_CATALOG_RATE_LIMIT_MAX_REQUESTS) {
      ctx.response.header('Retry-After', String(PUBLIC_CATALOG_RATE_LIMIT_WINDOW_SECONDS))
      return ctx.response.tooManyRequests({
        message: 'Muitas consultas ao catálogo. Tente novamente em instantes.',
      })
    }

    return next()
  }
}
