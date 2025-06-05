import 'dotenv/config'
import type { UsersRepository } from '@/repositories/users-repository'
import { verify } from 'jsonwebtoken'
import { InvalidJwtTokenError } from './errors/invalid-jwt-token-error'
import { UserEmailNotFoundError } from './errors/user-email-not-found-error'
import { hash } from 'bcryptjs'

interface ResetPasswordUseCaseCaseRequest {
  bearerAuth: string
  password: string
}

interface IPayload {
  sub: string
  email: string
}

export class ResetPasswordUseCase {
  constructor(private readonly usersRepository: UsersRepository) {}

  async execute({ bearerAuth, password }: ResetPasswordUseCaseCaseRequest) {
    let userEmail: string
    try {
      const token = bearerAuth.split(' ')[1]

      const { sub } = verify(token, process.env.JWT_SECRET) as IPayload
      userEmail = sub
    } catch (error) {
      throw new InvalidJwtTokenError()
    }

    const passwordDigest = await hash(password, 10)

    const user = await this.usersRepository.changePassword({
      email: userEmail,
      password_digest: passwordDigest,
    })

    if (user === null) {
      throw new UserEmailNotFoundError()
    }

    return { user }
  }
}
