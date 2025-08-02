import { ForgotPasswordUseCase } from '../forgot-password'
import { PrismaUsersRepository } from '@/repositories/prisma/prisma-users-repository'

export function makeForgotPasswordUseCase() {
  const usersRepository = new PrismaUsersRepository()
  const forgotPasswordUseCase = new ForgotPasswordUseCase(usersRepository)

  return forgotPasswordUseCase
}
