import type { Prisma } from '@prisma/client'
import type { UserWithDetails } from 'src/@types/user-with-details'

export interface UsersRepository {
  findById: (id: number) => Promise<UserWithDetails | null>
  findByPublicId: (publicId: string) => Promise<UserWithDetails | null>
  findByEmail: (email: string) => Promise<UserWithDetails | null>
  findByEmailOrUsername: (
    emailOrUsername: string,
    usernameOrEmail?: string,
  ) => Promise<UserWithDetails | null>
  incrementLoginAttempts: (id: number) => Promise<void>
  create: (data: Prisma.UserCreateInput) => Promise<UserWithDetails>
  setLastLogin: (id: number) => Promise<void>
}
