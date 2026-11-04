import app from '@adonisjs/core/services/app'
import { ExceptionHandler } from '@adonisjs/core/http'
import type { HttpContext } from '@adonisjs/core/http'
import env from '#start/env'
import { exposesErrorDetails, normalizeError } from '#utils/error_envelope'

export default class HttpExceptionHandler extends ExceptionHandler {
  /**
   * Em modo debug, o exception handler exibe erros verbosos
   * com stack traces formatados.
   */
  protected debug = !app.inProduction

  /**
   * Toda resposta de erro sai no envelope único `{ message, code, errors?, meta? }`
   * (ADR-0034), em qualquer ambiente. Não delega ao `super.handle()` porque erros
   * do `@adonisjs/auth` e do VineJS se auto-renderizam em formatos próprios, e a
   * API só responde JSON (`ForceJsonResponseMiddleware`).
   */
  async handle(error: unknown, ctx: HttpContext) {
    const { status, envelope, retryAfterSeconds } = normalizeError(error, {
      debug: exposesErrorDetails({
        inProduction: app.inProduction,
        errorDebug: env.get('ERROR_DEBUG'),
      }),
    })

    if (retryAfterSeconds) {
      ctx.response.header('Retry-After', String(retryAfterSeconds))
    }

    return ctx.response.status(status).send(envelope)
  }

  /**
   * O método é usado para reportar o erro ao serviço de logging ou
   * a um serviço de monitoramento de erros de terceiros.
   *
   * @note Você não deve tentar enviar uma resposta a partir deste método.
   */
  async report(error: unknown, ctx: HttpContext) {
    return super.report(error, ctx)
  }
}
