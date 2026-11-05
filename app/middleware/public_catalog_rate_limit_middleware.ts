import cache from '#services/shared/cache/cache'
import { isBffServerRequest, resolveClientIp } from '#utils/client_ip'
import { tooManyRequestsEnvelope } from '#utils/error_envelope'
import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

const PUBLIC_CATALOG_RATE_LIMIT_MAX_REQUESTS = 20
const PUBLIC_CATALOG_RATE_LIMIT_BFF_SERVER = 600
const PUBLIC_CATALOG_RATE_LIMIT_WINDOW_SECONDS = 60

/**
 * Limita as consultas públicas (sem auth) aos catálogos usados no cadastro.
 * `catalog` separa o orçamento de cada catálogo, para que a busca em um não
 * esgote o outro na mesma tela.
 *
 * - Pedidos do servidor do BFF autenticado **sem** IP de usuário (busca
 *   cacheada no Next com `use cache`, compartilhada entre visitantes, ADR-0041)
 *   usam um orçamento próprio de 600/min por catálogo; o BFF limita cada IP antes.
 * - Os demais ficam em 20/min por IP, que vem de `resolveClientIp()`: o IP do
 *   usuário repassado pelo BFF autenticado (ADR-0032) ou, sem ele,
 *   `request.ip()`, que só confia em `X-Forwarded-For` vindo de proxy confiável
 *   (`trustProxy` em `config/app.ts`).
 */
export default class PublicCatalogRateLimitMiddleware {
  async handle(ctx: HttpContext, next: NextFn, options: { catalog: string }) {
    const fromBffServer = isBffServerRequest(ctx.request)
    const key = fromBffServer
      ? `rate_limit:public_catalog:${options.catalog}:bff_server`
      : `rate_limit:public_catalog:${options.catalog}:ip:${resolveClientIp(ctx.request)}`
    const limit = fromBffServer
      ? PUBLIC_CATALOG_RATE_LIMIT_BFF_SERVER
      : PUBLIC_CATALOG_RATE_LIMIT_MAX_REQUESTS
    const attempts = await cache.incrWithInitialTtl(key, PUBLIC_CATALOG_RATE_LIMIT_WINDOW_SECONDS)

    if (attempts > limit) {
      ctx.response.header('Retry-After', String(PUBLIC_CATALOG_RATE_LIMIT_WINDOW_SECONDS))
      return ctx.response.tooManyRequests(
        tooManyRequestsEnvelope(
          'Muitas consultas ao catálogo. Tente novamente em instantes.',
          PUBLIC_CATALOG_RATE_LIMIT_WINDOW_SECONDS
        )
      )
    }

    return next()
  }
}
