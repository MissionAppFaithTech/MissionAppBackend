import { errors } from '@vinejs/vine'

/**
 * Erro de validação de um campo verificado no service (regra de negócio, como
 * unicidade ou existência), no mesmo formato dos erros de esquema do VineJS.
 * O envelope (ADR-0034) responde 422 `E_VALIDATION_ERROR` com
 * `errors: [{ field, rule, message }]`, para o cliente marcar o campo certo.
 *
 * @param field Campo do corpo da requisição.
 * @param rule Regra violada (ex.: `database.unique`, `database.exists`).
 * @param message Texto em pt-BR para exibir ao usuário.
 */
export function fieldValidationError(field: string, rule: string, message: string) {
  return new errors.E_VALIDATION_ERROR([{ field, rule, message }])
}
