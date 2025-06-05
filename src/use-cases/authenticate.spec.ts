import { InMemoryUsersRepository } from '@/repositories/in-memory/in-memory-users-repository'
import { expect, describe, it, beforeEach } from 'vitest'
import { AuthenticateUseCase } from './authenticate'
import { hash } from 'bcryptjs'
import { InvalidCredentialsError } from './errors/invalid-credentials-error'
import { InMemoryAuthenticationAuditRepository } from '@/repositories/in-memory/in-memory-authentication-audit-repository'

let inMemoryUsersRepository: InMemoryUsersRepository
let inMemoryAuthenticationAuditRepository: InMemoryAuthenticationAuditRepository
let sut: AuthenticateUseCase

describe('AuthenticateUseCase', () => {
  beforeEach(() => {
    inMemoryUsersRepository = new InMemoryUsersRepository()
    inMemoryAuthenticationAuditRepository =
      new InMemoryAuthenticationAuditRepository()

    sut = new AuthenticateUseCase(
      inMemoryUsersRepository,
      inMemoryAuthenticationAuditRepository,
    )
  })

  it('should be able to authenticate', async () => {
    await inMemoryUsersRepository.create({
      name: 'John Doe',
      email: 'johndoe@example.com',
      password_digest: await hash('password', 1),
    })

    const { user } = await sut.execute({
      email: 'johndoe@example.com',
      password: 'password',
    })

    expect(user.id).toEqual(expect.any(String))
    expect(user.last_login).toEqual(expect.any(Date))
  })

  it('should not be able to authenticate with an invalid email', async () => {
    expect(
      async () =>
        await sut.execute({
          email: 'johndoe@example.com',
          password: 'password',
        }),
    ).rejects.toBeInstanceOf(InvalidCredentialsError)
  })

  it('should create a record in audit authentication repository when email is invalid', async () => {
    await expect(
      sut.execute({
        email: 'invalid-johndoe@example.com',
        password: 'password',
      }),
    ).rejects.toBeInstanceOf(InvalidCredentialsError)

    const auditAuthentication =
      await inMemoryAuthenticationAuditRepository.getLast()

    expect(auditAuthentication.status).toEqual('USER_NOT_EXISTS')
  })

  it('should not be able to authenticate with an invalid password', async () => {
    await inMemoryUsersRepository.create({
      name: 'John Doe',
      email: 'johndoe@example.com',
      password_digest: await hash('password', 1),
    })

    expect(
      async () =>
        await sut.execute({
          email: 'johndoe@example.com',
          password: 'invalid-password',
        }),
    ).rejects.toBeInstanceOf(InvalidCredentialsError)
  })

  it('should create a record in audit authentication repository when password is invalid', async () => {
    await inMemoryUsersRepository.create({
      name: 'John Doe',
      email: 'johndoe@example.com',
      password_digest: await hash('password', 1),
    })

    await expect(
      sut.execute({
        email: 'johndoe@example.com',
        password: 'invalid-password',
      }),
    ).rejects.toBeInstanceOf(InvalidCredentialsError)

    const auditAuthentication =
      await inMemoryAuthenticationAuditRepository.getLast()

    expect(auditAuthentication.status).toEqual('INCORRECT_PASSWORD')
  })

  it('should create a record in audit authentication repository when authenticate successfully', async () => {
    await inMemoryUsersRepository.create({
      name: 'John Doe',
      email: 'johndoe@example.com',
      password_digest: await hash('password', 1),
    })

    await sut.execute({
      email: 'johndoe@example.com',
      password: 'password',
    })

    const auditAuthentication =
      await inMemoryAuthenticationAuditRepository.getLast()

    expect(auditAuthentication.status).toEqual('SUCCESS')
  })
})
