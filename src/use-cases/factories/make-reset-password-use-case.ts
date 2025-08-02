import { ResetPasswordUseCase } from '../reset-password'
import { PrismaUsersRepository } from '@/repositories/prisma/prisma-users-repository'

export function makeResetPasswordUseCase() {
  const usersRepository = new PrismaUsersRepository()
  const resetPasswordUseCase = new ResetPasswordUseCase(usersRepository)

  return resetPasswordUseCase
}
