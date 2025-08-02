import type { FastifyRequest, FastifyReply } from 'fastify'
import { env } from 'src/env'

export async function refreshToken(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    await request.jwtVerify({ onlyCookie: true })
  } catch (error) {
    return await reply.status(401).send({ message: 'Invalid Token' })
  }

  const accessToken = await reply.jwtSign(
    {},
    {
      sign: {
        sub: request.user.publicId,
      },
    },
  )

  const refreshToken = await reply.jwtSign(
    {},
    {
      sign: {
        sub: request.user.publicId,
        expiresIn: '7d',
      },
    },
  )

  return await reply
    .setCookie('refreshToken', refreshToken, {
      path: '/',
      secure: env.NODE_ENV === 'production',
      sameSite: env.NODE_ENV === 'production' ? 'strict' : 'lax',
      httpOnly: true,
    })
    .status(200)
    .send({ accessToken })
}
