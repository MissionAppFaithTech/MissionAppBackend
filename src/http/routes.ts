import type { FastifyInstance } from 'fastify'
import { userRoutes } from './controllers/user/routes'

export async function appRoutes(app: FastifyInstance) {
  app.register(userRoutes, { prefix: '/users' })
}
