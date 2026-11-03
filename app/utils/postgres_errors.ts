/**
 * Códigos de erro do PostgreSQL usados para traduzir violações de constraint em
 * erros de domínio (ADR-0034), em vez de deixá-las virar 500.
 */
const FOREIGN_KEY_VIOLATION = '23503'
const UNIQUE_VIOLATION = '23505'

type PostgresError = { code?: unknown; constraint?: unknown }

function asPostgresError(error: unknown): PostgresError {
  return typeof error === 'object' && error !== null ? (error as PostgresError) : {}
}

/** Linha ainda referenciada por outra tabela (`ON DELETE RESTRICT`). */
export function isForeignKeyViolation(error: unknown): boolean {
  return asPostgresError(error).code === FOREIGN_KEY_VIOLATION
}

/** Violação de unicidade; com `constraint`, só a dessa constraint. */
export function isUniqueViolation(error: unknown, constraint?: string): boolean {
  const { code, constraint: violated } = asPostgresError(error)
  return code === UNIQUE_VIOLATION && (constraint === undefined || violated === constraint)
}
