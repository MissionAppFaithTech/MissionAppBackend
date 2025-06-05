import type { Prisma } from '@prisma/client'
import type { AuthenticationAuditRepository } from '../authentication-audit-repository'
import { prisma } from '@/lib/prisma'

export class PrismaAuthenticationAuditRepository
  implements AuthenticationAuditRepository
{
  async create(data: Prisma.AuthenticationAuditUncheckedCreateInput) {
    const authenticationAudit = await prisma.authenticationAudit.create({
      data,
    })

    return authenticationAudit
  }

  async findAll() {
    const authenticationAuditList = await prisma.authenticationAudit.findMany()

    return authenticationAuditList
  }

  async getLast() {
    const authenticationAudit = await prisma.authenticationAudit.findMany({
      orderBy: {
        created_at: 'desc',
      },
      take: 1,
    })

    if (authenticationAudit.length === 0) return null

    return authenticationAudit[0]
  }
}
