import type { Prisma, User } from '@prisma/client'
import type { IChangePassword, UsersRepository } from '../users-repository'

export class InMemoryUsersRepository implements UsersRepository {
  public users: User[] = []

  async findByEmail(email: string) {
    const user = this.users.find((user) => user.email === email)

    if (user == null) {
      return null
    }

    return user
  }

  async create(data: Prisma.UserCreateInput) {
    const user = {
      id: `user-${this.users.length + 1}`,
      name: data.name,
      email: data.email,
      password_digest: data.password_digest,
      login_attempts: 0,
      last_login: null,
      created_at: new Date(),
      updated_at: new Date(),
    }

    this.users.push(user)

    return user
  }

  async setLastLogin(id: string) {
    const user = this.users.find((user) => user.id === id)
    if (user != null) {
      user.last_login = new Date()
    }
  }

  async changePassword(data: IChangePassword) {
    const user = this.users.find((user) => data.email === user.email)
    if (user == null) {
      return null
    }

    user.password_digest = data.password_digest
    return user
  }
}
