import type { AuthenticationAudit, Prisma } from '@prisma/client'

export interface AuthenticationAuditsRepository {
  create: (data: Prisma.AuthenticationAuditUncheckedCreateInput) => Promise<AuthenticationAudit>
  findAll: () => Promise<AuthenticationAudit[]>
  getLast: () => Promise<AuthenticationAudit | null>
}
