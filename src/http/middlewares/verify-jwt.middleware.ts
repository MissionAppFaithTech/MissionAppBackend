import { logger } from '@lib/logger'
import { setUserId } from '@lib/logger/helpers/set-user-id'
import { UNAUTHORIZED } from '@messages/response'
import type { FastifyReply, FastifyRequest } from 'fastify'

export async function verifyJwt(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify()
    setUserId(request.user.sub)
  } catch (error) {
    logger.debug(UNAUTHORIZED.body)
    return await reply.status(UNAUTHORIZED.status).send(UNAUTHORIZED.body)
  }
}
