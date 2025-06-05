import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

/**
 * Loga metadado seguro de toda request HTTP — método, rota, status, duração,
 * IP e usuário autenticado (só o ID, nunca o objeto inteiro).
 *
 * Deliberadamente NUNCA loga: corpo do request (`request.body()`/`.all()` —
 * carrega senha em `/auth/login`, `/account/password`, `/auth/reset-password`),
 * o header `Authorization` (é a própria credencial de sessão — logar é
 * equivalente a vazar um token válido) ou a URL crua com query string (o
 * link de redefinição de senha carrega o token em `?token=...`). Usa
 * `route.pattern` em vez da URL — mesmo formato pra toda request daquela
 * rota, sem parâmetro/query embutido.
 *
 * Registrado em `server.use([...])` (`start/kernel.ts`) — roda em toda
 * request, mesmo sem rota casada (404), onde `ctx.route` fica `undefined` e
 * o fallback usa `request.url(false)` (path sem query string).
 */
export default class RequestLoggerMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const startedAt = process.hrtime.bigint()

    await next()

    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6

    ctx.logger.info({
      method: ctx.request.method(),
      route: ctx.route?.pattern ?? ctx.request.url(false),
      status: ctx.response.getStatus(),
      durationMs: Math.round(durationMs * 100) / 100,
      ip: ctx.request.ip(),
      userId: ctx.auth?.user?.id ?? null,
    })
  }
}
