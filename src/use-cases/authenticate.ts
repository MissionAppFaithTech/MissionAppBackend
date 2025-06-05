import type { UsersRepository } from '@/repositories/users-repository'
import type { User } from '@prisma/client'
import { InvalidCredentialsError } from './errors/invalid-credentials-error'
import { compare } from 'bcryptjs'
import type { AuthenticationAuditRepository } from '@/repositories/authentication-audit-repository'

interface AuthenticateUseCaseRequest {
  email: string
  password: string
  ipAddress?: string
  remotePort?: string
  browser?: string
}

interface AuthenticateUseCaseResponse {
  user: User
}

export class AuthenticateUseCase {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly authenticationAuditRepository: AuthenticationAuditRepository,
  ) {}

  async execute({
    email,
    password,
    browser,
    ipAddress,
    remotePort,
  }: AuthenticateUseCaseRequest): Promise<AuthenticateUseCaseResponse> {
    const user = await this.usersRepository.findByEmail(email)

    const auditAuthenticateObject = {
      browser: browser ?? null,
      ip_address: ipAddress ?? null,
      remote_port: remotePort ?? null,
      user_id: user?.id ?? null,
    }

    if (user == null) {
      await this.authenticationAuditRepository.create({
        ...auditAuthenticateObject,
        status: 'USER_NOT_EXISTS',
      })

      throw new InvalidCredentialsError()
    }

    const doesPasswordMatch = await compare(password, user.password_digest)

    if (!doesPasswordMatch) {
      await this.authenticationAuditRepository.create({
        ...auditAuthenticateObject,
        status: 'INCORRECT_PASSWORD',
      })

      throw new InvalidCredentialsError()
    }

    await this.usersRepository.setLastLogin(user.id)

    await this.authenticationAuditRepository.create({
      ...auditAuthenticateObject,
      status: 'SUCCESS',
      user_id: user.id,
    })

    return {
      user,
    }
  }
}
