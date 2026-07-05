import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

/**
 * O middleware de silent auth pode ser usado como middleware global para
 * checar silenciosamente se o usuário está logado ou não.
 *
 * A requisição continua normalmente, mesmo quando o usuário não está logado.
 */
export default class SilentAuthMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    await ctx.auth.check()

    return next()
  }
}
