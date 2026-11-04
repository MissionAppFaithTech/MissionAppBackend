/**
 * Escapa os curingas do `LIKE`/`ILIKE` do PostgreSQL (`%`, `_` e a própria
 * barra de escape) para que o termo digitado pelo usuário seja comparado
 * literalmente, e não como padrão.
 *
 * @param value Termo de busca cru vindo do cliente.
 * @returns O termo com `\`, `%` e `_` precedidos de `\`.
 * @example
 * escapeLike('50%_off') // '50\\%\\_off'
 */
export function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, '\\$&')
}
