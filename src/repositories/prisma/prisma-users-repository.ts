import type { Prisma } from '@prisma/client'
import { userWithDetails } from 'src/@types/user-with-details'
import type { UsersRepository } from '../users-repository'
import { prisma } from '@/lib/prisma'

export class PrismaUsersRepository implements UsersRepository {
  async findById(id: number) {
    const user = await prisma.user.findUnique({
      where: { id },
      include: userWithDetails.include,
    })

    return user
  }

  async findByPublicId(publicId: string) {
    const user = await prisma.user.findUnique({
      where: { publicId },
      include: userWithDetails.include,
    })

    return user
  }

  async findByEmailOrUsername(
    emailOrUsername: string,
    usernameOrEmail?: string,
  ) {
    const orConditions: Array<{ email?: string; username?: string }> = [
      { email: emailOrUsername },
      { username: emailOrUsername },
    ]

    if (usernameOrEmail !== undefined && usernameOrEmail !== emailOrUsername) {
      orConditions.push({ email: usernameOrEmail })
      orConditions.push({ username: usernameOrEmail })
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: orConditions,
      },
      include: userWithDetails.include,
    })

    return user
  }

  async findByEmail(email: string) {
    const user = await prisma.user.findUnique({
      where: { email },
      include: userWithDetails.include,
    })

    return user
  }

  async incrementLoginAttempts(id: number) {
    await prisma.user.update({
      where: { id },
      data: {
        loginAttempts: {
          increment: 1,
        },
      },
    })
  }

  async create(data: Prisma.UserCreateInput) {
    const user = await prisma.user.create({
      data,
      include: userWithDetails.include,
    })

    return user
  }

  async setLastLogin(id: number) {
    await prisma.user.update({
      where: { id },
      data: { lastLogin: new Date() },
    })
  }
}
