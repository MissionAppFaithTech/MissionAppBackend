import { type FastifyInstance } from 'fastify'
import { register } from './controllers/register'
import { authenticate } from './controllers/authenticate'
import { refreshToken } from './controllers/refresh-token'
import { forgotPassword } from './controllers/forgot-password'
import { resetPassword } from './controllers/reset-password'

export async function appRoutes(app: FastifyInstance) {
  app.post('/users', register)

  app.post('/users/forgot-password', forgotPassword)

  app.patch('/users/reset-password', resetPassword)

  app.post('/sessions', authenticate)

  app.post('/sessions/refresh-token', refreshToken)
}
