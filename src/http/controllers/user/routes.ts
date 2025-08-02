import type { FastifyInstance } from 'fastify'
import { authenticate } from './authenticate'
import { forgotPassword } from './forgot-password'
import { refreshToken } from './refresh-token'
import { register } from './register'
import { resetPassword } from './reset-password'

export async function userRoutes(app: FastifyInstance) {
  app.post('/users', register)

  app.post('/users/forgot-password', forgotPassword)

  app.patch('/users/reset-password', resetPassword)

  app.post('/sessions', authenticate)

  app.post('/sessions/refresh-token', refreshToken)
}
