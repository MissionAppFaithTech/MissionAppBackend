import { Logger } from '@adonisjs/core/logger'
import { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

/**
 * O middleware de container bindings vincula classes ao seu valor
 * específico da requisição usando o container resolver.
 *
 * - Vinculamos a classe "HttpContext" ao objeto "ctx"
 * - E vinculamos a classe "Logger" ao objeto "ctx.logger"
 */
export default class ContainerBindingsMiddleware {
  handle(ctx: HttpContext, next: NextFn) {
    ctx.containerResolver.bindValue(HttpContext, ctx)
    ctx.containerResolver.bindValue(Logger, ctx.logger)

    return next()
  }
}
