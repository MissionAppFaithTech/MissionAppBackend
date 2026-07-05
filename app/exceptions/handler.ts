import app from '@adonisjs/core/services/app'
import { type HttpContext, ExceptionHandler } from '@adonisjs/core/http'

export default class HttpExceptionHandler extends ExceptionHandler {
  /**
   * Em modo debug, o exception handler exibe erros verbosos
   * com stack traces formatados.
   */
  protected debug = !app.inProduction

  /**
   * O método é usado para tratar erros e retornar
   * a resposta ao cliente
   */
  async handle(error: unknown, ctx: HttpContext) {
    return super.handle(error, ctx)
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
