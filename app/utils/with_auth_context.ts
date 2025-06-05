import type { UserRole } from '../enums/user/user_role.ts'

/**
 * Injeta a role do usuário autenticado no objeto de filtros, para uso por
 * filtros de query (ADR-0026) que precisam escopar resultados por role sem
 * expor esse critério como parâmetro de query público.
 *
 * @param filters Objeto de filtros original, recebido intacto e espalhado no retorno.
 * @param user Usuário autenticado — só a `role` é usada.
 * @returns `filters` com a chave `_role` adicionada, lida pelo filtro correspondente.
 * @example
 * withAuthContext({ status: 'active' }, { role: UserRole.ADMIN })
 * // { status: 'active', _role: 'ADMIN' }
 */
export function withAuthContext(
  filters: Record<string, unknown>,
  user: { role: UserRole }
): Record<string, unknown> {
  return { ...filters, _role: user.role }
}
