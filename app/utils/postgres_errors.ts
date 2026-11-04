/**
 * Códigos de erro do PostgreSQL usados para traduzir violações de constraint em
 * erros de domínio (ADR-0034), em vez de deixá-las virar 500.
 */
const FOREIGN_KEY_VIOLATION = '23503'
// NOTE: FK com `ON DELETE RESTRICT` responde 23001 (restrict_violation), não 23503
const RESTRICT_VIOLATION = '23001'
const UNIQUE_VIOLATION = '23505'

type PostgresError = { code?: unknown; constraint?: unknown }

function asPostgresError(error: unknown): PostgresError {
  return typeof error === 'object' && error !== null ? (error as PostgresError) : {}
}

/**
 * Linha ainda referenciada por outra tabela: `23503` (FK `NO ACTION`) ou
 * `23001` (FK `ON DELETE RESTRICT`).
 */
export function isForeignKeyViolation(error: unknown): boolean {
  const { code } = asPostgresError(error)
  return code === FOREIGN_KEY_VIOLATION || code === RESTRICT_VIOLATION
}

/** Violação de unicidade; com `constraint`, só a dessa constraint. */
export function isUniqueViolation(error: unknown, constraint?: string): boolean {
  const { code, constraint: violated } = asPostgresError(error)
  return code === UNIQUE_VIOLATION && (constraint === undefined || violated === constraint)
}
