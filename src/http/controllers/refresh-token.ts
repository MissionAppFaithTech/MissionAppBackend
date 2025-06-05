import type { FastifyRequest, FastifyReply } from 'fastify'

export async function refreshToken(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  await request.jwtVerify({ onlyCookie: true })

  const accessToken = await reply.jwtSign(
    {},
    {
      sign: {
        sub: (request.user as { sub: string }).sub,
      },
    },
  )

  const refreshToken = await reply.jwtSign(
    {},
    {
      sign: {
        sub: (request.user as { sub: string }).sub,
        expiresIn: '7d',
      },
    },
  )

  return await reply
    .setCookie('refreshToken', refreshToken, {
      path: '/',
      secure: true,
      sameSite: true,
      httpOnly: true,
    })
    .status(200)
    .send({ accessToken })
}
