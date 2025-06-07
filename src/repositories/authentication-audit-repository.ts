import type { AuthenticationAudit, Prisma } from '@prisma/client'

export interface AuthenticationAuditRepository {
  create: (
    data: Prisma.AuthenticationAuditUncheckedCreateInput
  ) => Promise<AuthenticationAudit>
  findAll: () => Promise<AuthenticationAudit[]>
  getLast: () => Promise<AuthenticationAudit | null>
}
