import { makeForgotPasswordUseCase } from '@/use-cases/factories/make-forgot-password-use-case'
import { type FastifyReply, type FastifyRequest } from 'fastify'
import { z } from 'zod'

export async function forgotPassword(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { email } = z
    .object({
      email: z.string().email(),
    })
    .parse(request.body)

  const forgotPasswordUseCase = makeForgotPasswordUseCase()

  await forgotPasswordUseCase.execute({ email })
}
