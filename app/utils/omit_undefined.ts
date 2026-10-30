/**
 * Remove as chaves cujo valor é `undefined`, preservando `null`. Necessário em
 * atualizações parciais: `model.merge({ campo: undefined })` sobrescreve o
 * atributo em memória (o knex omite o campo no UPDATE, mas a resposta sai sem
 * ele), enquanto `null` precisa chegar ao banco para limpar a coluna.
 *
 * @param values Objeto com possíveis chaves `undefined`.
 * @returns Cópia rasa de `values` sem as chaves `undefined`.
 * @example
 * omitUndefined({ a: 1, b: undefined, c: null }) // { a: 1, c: null }
 */
export function omitUndefined<T extends Record<string, unknown>>(values: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(values).filter(([, value]) => value !== undefined)
  ) as Partial<T>
}
