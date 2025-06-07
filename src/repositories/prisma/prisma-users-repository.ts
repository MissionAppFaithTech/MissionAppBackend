import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'
import type { IChangePassword, UsersRepository } from '../users-repository'

export class PrismaUsersRepository implements UsersRepository {
  async findByEmail(email: string) {
    const user = await prisma.user.findUnique({
      where: {
        email,
      },
    })

    return user
  }

  async create(data: Prisma.UserCreateInput) {
    const user = await prisma.user.create({
      data,
    })

    return user
  }

  async setLastLogin(id: string) {
    await prisma.user.update({
      where: {
        id,
      },
      data: {
        last_login: new Date(),
      },
    })
  }

  async changePassword({ email, password_digest }: IChangePassword) {
    const user = await prisma.user.update({
      where: { email },
      data: {
        password_digest,
      },
    })

    return user
  }
}
