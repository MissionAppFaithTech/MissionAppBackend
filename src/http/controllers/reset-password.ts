import { InvalidJwtTokenError } from '@/use-cases/errors/invalid-jwt-token-error'
import { UserEmailNotFoundError } from '@/use-cases/errors/user-email-not-found-error'
import { makeResetPasswordUseCase } from '@/use-cases/factories/make-reset-password-use-case'
import type { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'

export async function resetPassword(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const resetPasswordBodySchema = z
    .object({
      password: z.string(),
    })
    .parse(request.body)

  const resetPasswordHeadersSchema = z
    .object({
      authorization: z.string(),
    })
    .parse(request.headers)

  const { password } = resetPasswordBodySchema
  const { authorization: bearerAuth } = resetPasswordHeadersSchema

  try {
    const resetPasswordUseCase = makeResetPasswordUseCase()

    const user = await resetPasswordUseCase.execute({ password, bearerAuth })

    return await reply.status(200).send({ user })
  } catch (err: unknown) {
    if (err instanceof UserEmailNotFoundError) {
      return await reply.status(404).send({ message: err.message })
    }

    if (err instanceof InvalidJwtTokenError) {
      return await reply.status(401).send({ message: err.message })
    }

    throw err
  }
}
