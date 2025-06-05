import type { Prisma, AuthenticationAudit } from '@prisma/client'
import type { AuthenticationAuditRepository } from '../authentication-audit-repository'

export class InMemoryAuthenticationAuditRepository
  implements AuthenticationAuditRepository
{
  public authenticationAudit: AuthenticationAudit[] = []

  async create(data: Prisma.AuthenticationAuditUncheckedCreateInput) {
    const auditAuthenticate = {
      id: this.authenticationAudit.length + 1,
      ip_address: data.ip_address ?? null,
      remote_port: data.remote_port ?? null,
      browser: data.browser ?? null,
      status: data.status,
      user_id: data.user_id ?? null,
      created_at: new Date(),
    }

    this.authenticationAudit.push(auditAuthenticate)

    return auditAuthenticate
  }

  async findAll() {
    return this.authenticationAudit
  }

  async getLast() {
    const length = this.authenticationAudit.length - 1

    const auditAuthenticate = this.authenticationAudit[length]

    return auditAuthenticate
  }
}
