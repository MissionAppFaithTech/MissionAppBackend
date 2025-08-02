import type { FastifyReply, FastifyRequest } from 'fastify'
import { verify } from 'jsonwebtoken'
import { env } from 'src/env'

interface IPayload {
  sub: string
}

export async function authenticationMiddleware(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const headerAuthorization = request.headers.authorization
    if (headerAuthorization === undefined) {
      throw new Error()
    }

    const [, token] = headerAuthorization.split(' ')

    const { sub: publicId } = verify(token, env.JWT_SECRET) as IPayload

    request.user.publicId = publicId
  } catch (error) {
    return await reply
      .status(401)
      .send({ message: 'Missing authorization token' })
  }
}
