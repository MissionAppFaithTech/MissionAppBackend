import { type UserRole } from '../enums/user/user_role.ts'

export function withAuthContext(
  filters: Record<string, unknown>,
  user: { role: UserRole }
): Record<string, unknown> {
  return { ...filters, _role: user.role }
}
