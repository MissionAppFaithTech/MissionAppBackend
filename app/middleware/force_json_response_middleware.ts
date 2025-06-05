import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

/**
 * Sobrescreve silenciosamente o header `Accept` da request para
 * `application/json`, não importa o que o cliente tenha enviado.
 *
 * Esta API é consumida só por BFF (Next.js) e apps nativos, nunca
 * diretamente por um browser — não existe caso de uso legítimo para HTML
 * nas respostas. Sem isso, lógica de negociação de conteúdo do próprio
 * framework (ex: os renderers de `E_UNAUTHORIZED_ACCESS`, que fazem
 * `switch` em `ctx.request.accepts([...])`) poderia cair no branch HTML
 * em vez de JSON, dependendo do que o client mandar.
 *
 * Registrado em `server.use([...])` (`start/kernel.ts`), não em
 * `router.use([...])` — precisa rodar antes do roteamento decidir se a URL
 * casa com alguma rota, já que roda em toda request HTTP recebida, mesmo
 * sem rota correspondente (ex: 404).
 */
export default class ForceJsonResponseMiddleware {
  handle(ctx: HttpContext, next: NextFn) {
    ctx.request.request.headers.accept = 'application/json'
    return next()
  }
}
