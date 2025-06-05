import type { RequestContext } from '#types/http/context'

/**
 * Replica o merge automático de `request.validateUsing()` e adiciona
 * `ipAddress` — não incluído por padrão. Passar o objeto explicitamente
 * substitui o merge automático por completo, então tudo precisa ser refeito
 * aqui manualmente.
 *
 * @param request Request atual, usada para ler body/params/headers/cookies/ip.
 * @returns Objeto com `body + params + headers + cookies + ipAddress`, pronto
 *          para passar como `{ data }` em `request.validateUsing()`.
 */
export function requestValidationData(request: RequestContext) {
  return {
    ...request.all(),
    params: request.params(),
    headers: request.headers(),
    cookies: request.cookiesList(),
    ipAddress: request.ip(),
  }
}
