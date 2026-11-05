import { IdentityType } from '#enums/missionary/identity_type'
import { fieldValidationError } from '#utils/field_validation_error'
import { IDENTITY_DOCUMENT_TAKEN } from '#utils/identity_document'
import { isUniqueViolation } from '#utils/postgres_errors'

type FieldTarget = { field: string; message: string }

/** Constraints únicas que viram erro de um campo do formulário (422). */
const UNIQUE_CONSTRAINT_FIELDS: Record<string, (identityType: IdentityType) => FieldTarget> = {
  // NOTE: índice único do documento do missionário (tipo + documento normalizado)
  uq_missionaries_identity: (identityType) => ({
    field: 'identityDocument',
    message: IDENTITY_DOCUMENT_TAKEN[identityType],
  }),
  uq_users_email: () => ({ field: 'email', message: 'Este e-mail já está em uso.' }),
  uq_users_username: () => ({ field: 'username', message: 'Nome de usuário já está em uso' }),
}

function violatedConstraint(error: unknown): string | undefined {
  const constraint = (error as { constraint?: unknown } | null)?.constraint
  return typeof constraint === 'string' ? constraint : undefined
}

/**
 * Traduz a violação de uma constraint única conhecida no erro do campo
 * correspondente. A pré-checagem do validator/service cobre o caso comum; isto
 * cobre a corrida entre duas requisições simultâneas, que de outro modo
 * responderia 500.
 *
 * @param error Erro lançado pela query ou pela transação.
 * @param identityType Tipo do documento enviado, para a mensagem certa.
 * @returns O erro de validação do campo, ou `null` se não for uma das constraints mapeadas.
 * @example
 * catch (error) { throw uniqueViolationFieldError(error, payload.identityType) ?? error }
 */
export function uniqueViolationFieldError(error: unknown, identityType?: IdentityType | null) {
  const target = isUniqueViolation(error)
    ? UNIQUE_CONSTRAINT_FIELDS[violatedConstraint(error) ?? '']?.(identityType ?? IdentityType.CPF)
    : undefined
  return target ? fieldValidationError(target.field, 'database.unique', target.message) : null
}
