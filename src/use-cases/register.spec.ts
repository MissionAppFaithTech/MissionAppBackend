import { InMemoryUsersRepository } from '@/repositories/in-memory/in-memory-users-repository'
import { expect, describe, it, beforeEach } from 'vitest'
import { RegisterUseCase } from './register'
import { compare } from 'bcryptjs'
import { UserAlreadyExistsError } from './errors/user-already-exists'

let inMemoryUsersRepository: InMemoryUsersRepository
let sut: RegisterUseCase

describe('RegisterUseCase', () => {
  beforeEach(() => {
    inMemoryUsersRepository = new InMemoryUsersRepository()
    sut = new RegisterUseCase(inMemoryUsersRepository)
  })

  it('should be able to register', async () => {
    const { user } = await sut.execute({
      name: 'John Doe',
      email: 'johndoe@example.com',
      password: 'password',
    })

    expect(user.id).toEqual(expect.any(String))
  })

  it('should hash user password upon registration', async () => {
    const { user } = await sut.execute({
      name: 'John Doe',
      email: 'johndoe@example.com',
      password: 'password',
    })

    const isPasswordCorrectHashed = await compare(
      'password',
      user.password_digest,
    )

    expect(isPasswordCorrectHashed).toBe(true)
  })

  it('should not be to register a user with an already used email', async () => {
    const email = 'johndoe@example.com'

    await sut.execute({
      name: 'John Doe',
      email,
      password: 'password',
    })

    expect(
      async () =>
        await sut.execute({
          name: 'John Doe',
          email,
          password: 'password',
        }),
    ).rejects.toBeInstanceOf(UserAlreadyExistsError)
  })
})
