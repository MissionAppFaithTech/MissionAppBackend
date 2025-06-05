import { InMemoryUsersRepository } from '@/repositories/in-memory/in-memory-users-repository'
import { expect, describe, it, beforeEach } from 'vitest'
import { hash } from 'bcryptjs'
import { ForgotPasswordUseCase } from './forgot-password'
import { UserEmailNotFoundError } from './errors/user-email-not-found-error'

let inMemoryUsersRepository: InMemoryUsersRepository
let sut: ForgotPasswordUseCase

describe('ForgotPasswordUseCase', () => {
  beforeEach(() => {
    inMemoryUsersRepository = new InMemoryUsersRepository()

    sut = new ForgotPasswordUseCase(inMemoryUsersRepository)
  })

  // TODO: how to assure that use case was successfully executed
  it('should be able to send reset password email', async () => {
    await inMemoryUsersRepository.create({
      name: 'John Doe',
      email: 'johndoe@example.com',
      password_digest: await hash('password', 1),
    })

    await sut.execute({
      email: 'johndoe@example.com',
    })

    expect(true).toBe(true)
  })

  it('should not be able to send reset email with invalid email', async () => {
    await inMemoryUsersRepository.create({
      name: 'John Doe',
      email: 'johndoe@example.com',
      password_digest: await hash('password', 1),
    })

    expect(async () => {
      await sut.execute({
        email: 'invalid-johndoe@example.com',
      })
    }).rejects.toBeInstanceOf(UserEmailNotFoundError)
  })
})
