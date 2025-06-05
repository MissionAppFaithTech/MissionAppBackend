import { InMemoryUsersRepository } from '@/repositories/in-memory/in-memory-users-repository'
import { beforeEach, describe, expect, it } from 'vitest'
import { ResetPasswordUseCase } from './reset-password'
import { sign } from 'jsonwebtoken'
import 'dotenv/config'
import { UserEmailNotFoundError } from './errors/user-email-not-found-error'
import { InvalidJwtTokenError } from './errors/invalid-jwt-token-error'

let inMemoryUsersRepository: InMemoryUsersRepository
let sut: ResetPasswordUseCase

describe('ResetPasswordUseCase', () => {
  beforeEach(() => {
    inMemoryUsersRepository = new InMemoryUsersRepository()

    sut = new ResetPasswordUseCase(inMemoryUsersRepository)
  })

  it('should be able to reset password', async () => {
    await inMemoryUsersRepository.create({
      name: 'John Doe',
      email: 'johndoe@example.com',
      password_digest: 'password',
    })

    const passwordToken = sign({}, process.env.JWT_SECRET, {
      subject: 'johndoe@example.com',
      expiresIn: '10m',
    })

    const { user } = await sut.execute({
      bearerAuth: 'Bearer ' + passwordToken,
      password: 'new-password',
    })

    expect(user.password_digest).not.toBe('password')
  })

  it('should not be able to reset password with invalid jwt token', async () => {
    await inMemoryUsersRepository.create({
      name: 'John Doe',
      email: 'johndoe@example.com',
      password_digest: 'password',
    })

    const invalidPasswordToken = 'ncvmadfhsjkhifds'

    expect(async () => {
      await sut.execute({
        bearerAuth: 'Bearer ' + invalidPasswordToken,
        password: 'new-password',
      })
    }).rejects.toBeInstanceOf(InvalidJwtTokenError)
  })

  it('should not be able to reset password with an invalid email', async () => {
    await inMemoryUsersRepository.create({
      name: 'John Doe',
      email: 'johndoe@example.com',
      password_digest: 'password',
    })

    const passwordToken = sign({}, process.env.JWT_SECRET, {
      subject: 'invalid-johndoe@example.com',
      expiresIn: '10m',
    })

    expect(async () => {
      await sut.execute({
        bearerAuth: 'Bearer ' + passwordToken,
        password: 'new-password',
      })
    }).rejects.toBeInstanceOf(UserEmailNotFoundError)
  })
})
